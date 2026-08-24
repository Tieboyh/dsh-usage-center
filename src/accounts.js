const HOSTS = { global: 'https://api.z.ai', cn: 'https://open.bigmodel.cn' };

function percent(limit) {
  const total = Number(limit?.usage);
  const remaining = Number(limit?.remaining);
  const current = Number(limit?.currentValue ?? limit?.current_value);
  if (Number.isFinite(total) && total > 0) {
    const used = Number.isFinite(current) ? Math.max(current, total - (Number.isFinite(remaining) ? remaining : total)) : total - remaining;
    return Math.max(0, Math.min(100, used / total * 100));
  }
  const value = Number(limit?.percentage ?? limit?.usedPercent ?? limit?.used_percent);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

function minutes(limit) {
  const unit = Number(limit?.unit), amount = Number(limit?.number);
  return unit === 5 ? amount : unit === 3 ? amount * 60 : unit === 1 ? amount * 1440 : unit === 6 ? amount * 10080 : Infinity;
}

export function parseZaiQuota(quota, subscription) {
  const limits = Array.isArray(quota?.data?.limits) ? quota.data.limits : [];
  const tokens = limits.filter(x => ['TOKENS_LIMIT', 'CREDIT_LIMIT'].includes(String(x?.type ?? x?.limit_type).toUpperCase()) && percent(x) !== null).sort((a, b) => minutes(a) - minutes(b));
  const billing = limits.find(x => String(x?.type ?? x?.limit_type).toUpperCase() === 'TIME_LIMIT' && percent(x) !== null);
  const rows = [];
  if (tokens[0]) rows.push(['session', tokens[0]]);
  if (tokens.length > 1) rows.push(['weekly', tokens[tokens.length - 1]]);
  if (billing) rows.push(['billing', billing]);
  const subscriptionRow = Array.isArray(subscription?.data) ? subscription.data[0] : null;
  const plan = subscriptionRow?.product_name ?? subscriptionRow?.productName ?? quota?.data?.product_name ?? 'GLM Coding Plan';
  return {
    plan,
    windows: rows.map(([kind, value]) => ({
      kind,
      usedPercent: Math.round(percent(value) * 10) / 10,
      remainingPercent: Math.round((100 - percent(value)) * 10) / 10,
      resetsAt: value.nextResetTime ?? value.next_reset_time ?? (kind === 'billing' ? subscriptionRow?.next_renew_time : null),
      ...(Number.isFinite(Number(value.remaining)) ? { remaining: Number(value.remaining) } : {}),
    })),
  };
}

async function credential(credentials, name) {
  try {
    const hit = await credentials?.resolve?.(name);
    return String(hit?.value ?? '').trim();
  } catch { return ''; }
}

async function getJson(url, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: { authorization: apiKey, accept: 'application/json' }, signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export function parseDeepSeekBalance(payload) {
  const rows = Array.isArray(payload?.balance_infos) ? payload.balance_infos : [];
  return {
    available: payload?.is_available === true,
    balances: rows.map(row => ({
      currency: String(row?.currency ?? '').toUpperCase(),
      total: Number(row?.total_balance),
      granted: Number(row?.granted_balance),
      toppedUp: Number(row?.topped_up_balance),
    })).filter(row => row.currency && [row.total, row.granted, row.toppedUp].every(Number.isFinite)),
  };
}

export async function deepSeekAccount(credentials) {
  const apiKey = await credential(credentials, 'DEEPSEEK_API_KEY');
  if (!apiKey) return { status: 'not-configured', available: false, balances: [] };
  try {
    const payload = await getJson('https://api.deepseek.com/user/balance', `Bearer ${apiKey}`);
    return { status: 'ok', ...parseDeepSeekBalance(payload) };
  } catch (error) {
    return { status: 'unavailable', available: false, balances: [], message: error instanceof Error ? error.message : String(error) };
  }
}

export async function zaiAccount(credentials) {
  const apiKey = await credential(credentials, 'ZAI_CODING_CN_API_KEY') || await credential(credentials, 'ZAI_API_KEY');
  if (!apiKey) return { status: 'not-configured', plan: 'GLM Coding Plan', windows: [] };
  const configuredRegion = (await credential(credentials, 'ZAI_API_REGION')).toLowerCase();
  const region = configuredRegion ? (configuredRegion.includes('cn') ? 'cn' : 'global') : 'cn';
  try {
    const host = HOSTS[region];
    const quota = await getJson(`${host}/api/monitor/usage/quota/limit`, apiKey);
    let subscription = null;
    try { subscription = await getJson(`${host}/api/biz/subscription/list`, apiKey); } catch {}
    return { status: 'ok', ...parseZaiQuota(quota, subscription) };
  } catch (error) {
    return { status: 'unavailable', plan: 'GLM Coding Plan', windows: [], message: error instanceof Error ? error.message : String(error) };
  }
}
