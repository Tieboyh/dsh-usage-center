import { estimate } from './pricing.js';
import { foldToday, localDay, mergeRoutes } from './usage.js';
import { deepSeekAccount, zaiAccount } from './accounts.js';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { isSnapshotForDay, SNAPSHOT_VERSION, snapshotWire } from './snapshot.js';

export const name = 'usage-center';
export const inject = ['webServer', 'credentials', 'sessions', 'sessionPersistence'];

const FRESH_MS = 60_000;
const BACKGROUND_MS = 5 * 60_000;
let snapshot = null;
let snapshotLoaded = false;
let loadPromise = null;
let refreshPromise = null;
let refreshError = null;

function snapshotPath() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  return join(home, 'storages', 'usage-center-snapshot.json');
}

async function loadSnapshot() {
  if (snapshotLoaded) return snapshot;
  loadPromise ??= (async () => {
    try {
      const value = JSON.parse(await readFile(snapshotPath(), 'utf8'));
      if (isSnapshotForDay(value, localDay())) snapshot = value.snapshot;
    } catch { /* first run or invalid cache */ }
    snapshotLoaded = true;
    return snapshot;
  })();
  return loadPromise;
}

async function saveSnapshot(ctx, value) {
  try {
    const path = snapshotPath();
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.tmp`;
    await writeFile(temp, JSON.stringify({ version: SNAPSHOT_VERSION, snapshot: value }), { encoding: 'utf8', mode: 0o600 });
    await rename(temp, path);
  } catch (error) {
    ctx.logger.warn(`usage-center: saving snapshot failed: ${String(error)}`);
  }
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

function loopback(req) {
  const value = String(req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '');
  return value === '::1' || value.startsWith('127.');
}

function providerView(route, tokens) {
  const [providerId, ...modelParts] = route.split('/');
  const model = modelParts.join('/');
  const subscription = providerId === 'zai-coding-cn' || providerId === 'zai';
  return {
    providerId, model, route, mode: subscription ? 'subscription' : 'metered', tokens,
    estimate: estimate(route, tokens),
  };
}

export async function collectToday(ctx, now = Date.now()) {
  const day = localDay(now);
  const routes = new Map();
  const liveIds = new Set();
  const sessions = ctx.get('sessions');
  for (const session of sessions?.list?.() ?? []) {
    liveIds.add(session.id);
    mergeRoutes(routes, foldToday(session.events ?? [], day));
  }
  const persistence = ctx.get('sessionPersistence');
  if (persistence) {
    const metas = await persistence.list();
    for (const meta of metas) {
      if (liveIds.has(meta.id)) continue;
      try {
        const { events } = await persistence.readFrom(meta.id, 0);
        mergeRoutes(routes, foldToday(events, day));
      } catch (error) { ctx.logger.warn(`usage-center: skipped session ${meta.id}: ${String(error)}`); }
    }
  }
  const providers = [...routes.entries()].map(([route, tokens]) => providerView(route, tokens)).filter(x => Object.values(x.tokens).some(Boolean));
  const credentials = ctx.get('credentials');
  const [deepseek, zai] = await Promise.all([
    providers.some(x => x.providerId === 'deepseek-official') ? deepSeekAccount(credentials) : null,
    providers.some(x => x.mode === 'subscription') ? zaiAccount(credentials) : null,
  ]);
  return { ok: true, day, updatedAt: Date.now(), providers, accounts: { deepseek, zai } };
}

export function refreshSnapshot(ctx) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = collectToday(ctx).then(async value => {
    snapshot = value;
    snapshotLoaded = true;
    refreshError = null;
    await saveSnapshot(ctx, value);
    return value;
  }).catch(error => {
    refreshError = error instanceof Error ? error.message : String(error);
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function overview(ctx, force = false, now = Date.now()) {
  await loadSnapshot();
  if (snapshot?.day !== localDay(now)) snapshot = null;
  if (force || snapshot === null) return snapshotWire(await refreshSnapshot(ctx), Date.now());
  const stale = now - snapshot.updatedAt >= FRESH_MS;
  if (stale && refreshPromise === null) void refreshSnapshot(ctx).catch(error => ctx.logger.warn(`usage-center: background refresh failed: ${String(error)}`));
  return snapshotWire(snapshot, now, refreshPromise !== null, refreshError);
}

export async function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/api/usage-center/overview',
    handler: async (req, res) => {
      if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method-not-allowed' });
      if (!loopback(req)) return json(res, 403, { ok: false, error: 'forbidden' });
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        json(res, 200, await overview(ctx, url.searchParams.get('refresh') === '1'));
      }
      catch (error) { ctx.logger.warn(`usage-center: overview failed: ${String(error)}`); json(res, 500, { ok: false, error: 'internal' }); }
    },
  }), 'usage-center: overview route');
  void loadSnapshot().then(value => {
    if (value === null || Date.now() - value.updatedAt >= FRESH_MS) return refreshSnapshot(ctx);
  }).catch(error => ctx.logger.warn(`usage-center: startup refresh failed: ${String(error)}`));
  ctx.effect(() => {
    const timer = setInterval(() => { void refreshSnapshot(ctx).catch(error => ctx.logger.warn(`usage-center: scheduled refresh failed: ${String(error)}`)); }, BACKGROUND_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  }, 'usage-center: background refresh');
}
