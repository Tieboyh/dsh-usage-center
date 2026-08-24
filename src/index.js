import { estimate } from './pricing.js';
import { foldToday, localDay, mergeRoutes } from './usage.js';
import { deepSeekAccount, zaiAccount } from './accounts.js';

export const name = 'usage-center';
export const inject = ['webServer', 'credentials', 'sessions', 'sessionPersistence'];

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

export async function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/api/usage-center/overview',
    handler: async (req, res) => {
      if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method-not-allowed' });
      if (!loopback(req)) return json(res, 403, { ok: false, error: 'forbidden' });
      try { json(res, 200, await collectToday(ctx)); }
      catch (error) { ctx.logger.warn(`usage-center: overview failed: ${String(error)}`); json(res, 500, { ok: false, error: 'internal' }); }
    },
  }), 'usage-center: overview route');
}
