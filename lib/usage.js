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

function routeTotals(days, day) {
  if (!days.has(day)) days.set(day, new Map());
  return days.get(day);
}

export function foldDaily(events) {
  const days = new Map();
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
    if (previous) add(routeTotals(days, previous.day).get(previous.route), previous.tokens, -1);
    const eventDay = localDay(event.time);
    const totals = routeTotals(days, eventDay);
    if (!totals.has(route)) totals.set(route, emptyTokens());
    add(totals.get(route), tokens);
    samples.set(key, { day: eventDay, route, tokens });
  }
  return days;
}

export function foldToday(events, day = localDay()) {
  return foldDaily(events).get(day) ?? new Map();
}

export function mergeRoutes(target, source) {
  for (const [route, tokens] of source) {
    if (!target.has(route)) target.set(route, emptyTokens());
    add(target.get(route), tokens);
  }
  return target;
}

export function mergeDaily(target, source) {
  for (const [day, routes] of source) mergeRoutes(routeTotals(target, day), routes);
  return target;
}

export function tokenTotal(tokens) {
  return tokens.inputTokens + tokens.outputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens;
}

function dayAtOffset(now, offset) {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return localDay(date.getTime());
}

export function activityFromDaily(daily, now = Date.now(), windowDays = 365) {
  const days = [];
  for (let offset = 1 - windowDays; offset <= 0; offset += 1) {
    const date = dayAtOffset(now, offset);
    let tokens = 0;
    for (const value of daily.get(date)?.values() ?? []) tokens += tokenTotal(value);
    days.push({ date, tokens });
  }
  let totalTokens = 0;
  let peakTokens = 0;
  let longestStreak = 0;
  let running = 0;
  for (const day of days) {
    totalTokens += day.tokens;
    peakTokens = Math.max(peakTokens, day.tokens);
    running = day.tokens > 0 ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }
  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0 && days[index].tokens > 0; index -= 1) currentStreak += 1;
  return { windowDays, days, totalTokens, peakTokens, currentStreak, longestStreak };
}
