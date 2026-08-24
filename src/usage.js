export function localDay(time = Date.now()) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyTokens() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

function add(target, source, sign = 1) {
  for (const key of Object.keys(target)) target[key] += sign * (Number(source[key]) || 0);
}

function tokensOf(value = {}) {
  return {
    inputTokens: Number(value.inputTokens) || 0,
    outputTokens: Number(value.outputTokens) || 0,
    cacheReadTokens: Number(value.cacheReadTokens) || 0,
    cacheWriteTokens: Number(value.cacheWriteTokens) || 0,
  };
}

function routeOf(event, fallback) {
  const source = event.data?.message?.source ?? event.data?.header?.config;
  if (typeof source?.model !== 'string') return fallback;
  return `${typeof source.provider === 'string' ? source.provider : 'unknown'}/${source.model}`;
}

function sampleOf(event) {
  if (event.type === 'assistant/chunk' && event.data?.chunk?.type === 'usage') return event.data.chunk.usage;
  if (event.type === 'assistant/message' && event.data?.usage) return event.data.usage;
  return null;
}

export function foldToday(events, day = localDay()) {
  const totals = new Map();
  const samples = new Map();
  let currentRoute = 'unknown/unknown';
  for (const event of events) {
    if (event.type === 'request/header' || event.type === 'assistant/message') currentRoute = routeOf(event, currentRoute);
    const usage = sampleOf(event);
    if (!usage) continue;
    const key = `${event.data?.turn ?? ''}:${event.data?.step ?? ''}`;
    const route = routeOf(event, currentRoute);
    const tokens = tokensOf(usage);
    const previous = samples.get(key);
    if (previous?.day === day) add(totals.get(previous.route), previous.tokens, -1);
    const eventDay = localDay(event.time);
    if (eventDay === day) {
      if (!totals.has(route)) totals.set(route, emptyTokens());
      add(totals.get(route), tokens);
    }
    samples.set(key, { day: eventDay, route, tokens });
  }
  return totals;
}

export function mergeRoutes(target, source) {
  for (const [route, tokens] of source) {
    if (!target.has(route)) target.set(route, emptyTokens());
    add(target.get(route), tokens);
  }
  return target;
}
