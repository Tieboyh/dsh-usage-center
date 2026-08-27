import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { en, interpolate, zh } from './locales.js';

const h = React.createElement;
const STYLE_ID = 'dsh-usage-center/style';
const MARKER = 'data-dsh-usage-center-nav';
export const inject = ['slots', 'locale'];
const LOCALE_NS = 'usage-center';

const CSS = `
.duc-root{color:var(--dsw-alias-label-primary,#171717);max-width:100%;padding:2px 0 32px}
.duc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:30px}
.duc-title{font-size:27px;line-height:38px;font-weight:600;margin:0 0 4px}.duc-desc{color:var(--dsw-alias-label-secondary,#7b7f89);font-size:15px;line-height:24px;margin:0}
.duc-status{color:var(--dsw-alias-label-tertiary,#999da5);font-size:12px;line-height:20px;margin:5px 0 0}.duc-status[data-refreshing=true]{color:var(--dsw-alias-button-primary-fill,#1668dc)}
.duc-refresh{appearance:none;border:1px solid var(--dsw-alias-border-l1,#dedfe2);border-radius:999px;background:var(--dsw-alias-fill-l1,#fff);color:inherit;padding:9px 17px;font:14px/20px inherit;cursor:pointer}.duc-refresh:hover{background:var(--dsw-alias-fill-l2,#f4f5f6)}.duc-refresh:disabled{opacity:.55;cursor:wait}
.duc-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--dsw-alias-border-l1,#e4e5e7);border-block:1px solid var(--dsw-alias-border-l1,#e4e5e7);margin-bottom:28px}
.duc-summary>div{background:var(--dsw-alias-bg-base,#fff);padding:18px 18px 18px 0}.duc-summary>div+div{padding-left:22px}.duc-k{color:var(--dsw-alias-label-secondary,#777b84);font-size:13px;line-height:20px}.duc-v{font-size:24px;line-height:34px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px}
.duc-activity{padding:0 0 28px;margin:0 0 28px;border-bottom:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-activity-title{font-size:18px;line-height:28px;font-weight:600;margin:0 0 16px}.duc-activity-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--dsw-alias-border-l1,#e4e5e7);border-radius:16px;margin-bottom:24px;overflow:hidden}.duc-activity-metric{padding:15px 14px;text-align:center}.duc-activity-metric+.duc-activity-metric{border-left:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-activity-metric b{display:block;font-size:19px;line-height:28px;font-weight:600;font-variant-numeric:tabular-nums}.duc-activity-metric span{display:block;color:var(--dsw-alias-label-secondary,#777b84);font-size:11px;line-height:17px}.duc-heatmap-scroll{overflow-x:auto;padding:0 0 5px}.duc-months{position:relative;height:20px;color:var(--dsw-alias-label-tertiary,#999da5);font-size:10px;line-height:16px}.duc-month{position:absolute;top:0;white-space:nowrap}.duc-heatmap{display:grid;grid-template-rows:repeat(7,8px);grid-auto-flow:column;grid-auto-columns:8px;gap:2px;width:max-content}.duc-day{width:8px;height:8px;border-radius:2px;background:var(--dsw-alias-fill-l2,#eceef1)}.duc-day[data-level="1"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#246bfd) 22%,transparent)}.duc-day[data-level="2"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#246bfd) 42%,transparent)}.duc-day[data-level="3"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#246bfd) 68%,transparent)}.duc-day[data-level="4"]{background:var(--dsw-alias-brand-primary,#246bfd)}.duc-day[data-blank=true]{visibility:hidden}
.duc-provider{border-bottom:1px solid var(--dsw-alias-border-l1,#e4e5e7);padding:0 0 26px;margin-bottom:26px}.duc-provider-head,.duc-model-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.duc-provider-head{margin-bottom:20px}.duc-provider-name{font-size:18px;line-height:28px;font-weight:600}.duc-provider-model{color:var(--dsw-alias-label-secondary,#777b84);font:12px/20px ui-monospace,SFMono-Regular,monospace}.duc-cost{text-align:right}.duc-cost strong{display:block;font-size:22px;line-height:30px;font-variant-numeric:tabular-nums}.duc-cost span{color:var(--dsw-alias-label-secondary,#777b84);font-size:12px}.duc-model{padding-top:18px}.duc-model+.duc-model{border-top:1px solid var(--dsw-alias-border-l1,#e4e5e7);margin-top:18px}.duc-model-head{margin-bottom:12px}.duc-model-cost{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums}
.duc-tokens{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.duc-token{font-size:13px;color:var(--dsw-alias-label-secondary,#777b84)}.duc-token b{display:block;color:var(--dsw-alias-label-primary,#171717);font-size:16px;line-height:24px;font-weight:500;font-variant-numeric:tabular-nums}
.duc-balances{display:flex;flex-direction:column;margin:-5px 0 21px;border-block:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-balance{display:grid;grid-template-columns:minmax(150px,1.2fr) repeat(2,minmax(110px,1fr));gap:18px;padding:14px 0;align-items:end}.duc-balance+.duc-balance{border-top:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-balance-main span,.duc-balance-part span{display:block;color:var(--dsw-alias-label-secondary,#777b84);font-size:12px;line-height:18px}.duc-balance-main b{font-size:22px;line-height:30px;font-weight:600;font-variant-numeric:tabular-nums}.duc-balance-part b{font-size:15px;line-height:24px;font-weight:500;font-variant-numeric:tabular-nums}.duc-balance-state{color:var(--dsw-alias-state-error-primary,#c33);font-size:12px;margin-left:8px}
.duc-plan{color:var(--dsw-alias-label-secondary,#777b84);font-size:13px;margin:-12px 0 18px}.duc-quota{margin-top:13px}.duc-quota-meta{display:flex;align-items:baseline;gap:12px;font-size:13px;margin-bottom:7px}.duc-quota-meta b{margin-left:auto;font-size:14px;font-variant-numeric:tabular-nums}.duc-reset{color:var(--dsw-alias-label-tertiary,#999da5);font-size:11px}.duc-track{height:7px;border-radius:99px;background:var(--dsw-alias-fill-l2,#eceef1);overflow:hidden}.duc-fill{height:100%;border-radius:inherit;background:var(--dsw-alias-button-primary-fill,#1668dc)}
.duc-note{color:var(--dsw-alias-label-secondary,#777b84);font-size:12px;line-height:20px;margin:18px 0 0}.duc-note a{color:inherit;text-decoration:underline;text-underline-offset:2px}.duc-empty,.duc-error{padding:28px 0;color:var(--dsw-alias-label-secondary,#777b84)}.duc-error{color:var(--dsw-alias-state-error-primary,#c33)}
.duc-inline-error{color:var(--dsw-alias-state-warning-primary,#a56800);font-size:12px;line-height:20px;margin:-16px 0 18px}.duc-skeleton{animation:duc-pulse 1.4s ease-in-out infinite;background:var(--dsw-alias-fill-l2,#eceef1);border-radius:6px}.duc-skeleton-summary{height:98px;margin-bottom:28px}.duc-skeleton-line{height:18px;margin:14px 0}.duc-skeleton-line:nth-child(2){width:72%}.duc-skeleton-line:nth-child(3){width:48%}@keyframes duc-pulse{50%{opacity:.48}}
[${MARKER}] svg{display:none}[${MARKER}]::before{content:'';width:24px;height:24px;flex:0 0 24px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8'%3E%3Cpath d='M4 19V9m6 10V5m6 14v-7m4 7H2'/%3E%3C/svg%3E") center/contain no-repeat}
@media(max-width:760px){.duc-summary,.duc-tokens,.duc-balance{grid-template-columns:1fr}.duc-summary{gap:0}.duc-summary>div,.duc-summary>div+div{padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-activity-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.duc-activity-metric:nth-child(3){border-left:0;border-top:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-activity-metric:nth-child(4){border-top:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-provider-head{flex-direction:column}.duc-cost{text-align:left}}
`;

function tr(t, key, vars) { return interpolate(t(key), vars); }
function fmtNumber(value, locale) { return new Intl.NumberFormat(locale).format(value ?? 0); }
function fmtUsd(value) { return `$${Number(value ?? 0).toFixed(value < .1 ? 4 : 3)}`; }
function fmtCompact(value, locale) { return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value ?? 0); }
function fmtMoney(value, currency, locale) { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value); }
function fmtReset(value, locale, t) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.toLocaleDateString(locale,{month:'numeric',day:'numeric'})} ${date.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} ${t('resets')}`;
}
function fmtUpdated(value, t) {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 10) return t('justUpdated');
  if (seconds < 60) return tr(t, 'secondsAgo', { n: seconds });
  return tr(t, 'minutesAgo', { n: Math.floor(seconds / 60) });
}
const quotaKeys = { session: 'quotaSession', fiveHour: 'quotaFiveHour', weekly: 'quotaWeekly', billing: 'quotaBilling' };

export function groupProviders(providers) {
  const groups = new Map();
  for (const item of providers) {
    if (!groups.has(item.providerId)) groups.set(item.providerId, { providerId: item.providerId, mode: item.mode, items: [] });
    groups.get(item.providerId).items.push(item);
  }
  return [...groups.values()];
}

function Heatmap({ activity, locale, t }) {
  if (!activity?.days?.length) return null;
  const first = new Date(`${activity.days[0].date}T12:00:00`);
  const leading = first.getDay();
  const cells = [...Array.from({ length: leading }, () => null), ...activity.days];
  const columns = Math.ceil(cells.length / 7);
  const width = columns * 8 + Math.max(0, columns - 1) * 2;
  const activeValues = activity.days.map(day => day.tokens).filter(Boolean).sort((a, b) => a - b);
  const months = [];
  let previousMonth = '';
  activity.days.forEach((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const month = `${date.getFullYear()}-${date.getMonth()}`;
    if (month === previousMonth) return;
    previousMonth = month;
    months.push({ column: Math.floor((leading + index) / 7) + 1, label: date.toLocaleDateString(locale, { month: 'short' }) });
  });
  const visibleMonths = months.length > 1 && months[1].column - months[0].column < 3 ? months.slice(1) : months;
  const metrics = [
    [fmtCompact(activity.totalTokens, locale), t('activityTotal')],
    [fmtCompact(activity.peakTokens, locale), t('activityPeak')],
    [tr(t, 'daysUnit', { n: activity.currentStreak }), t('currentStreak')],
    [tr(t, 'daysUnit', { n: activity.longestStreak }), t('longestStreak')],
  ];
  return h('section', { className: 'duc-activity' },
    h('h3', { className: 'duc-activity-title' }, t('activityTitle')),
    h('div', { className: 'duc-activity-metrics' }, ...metrics.map(([value, label]) => h('div', { className: 'duc-activity-metric', key: label }, h('b', null, value), h('span', null, label)))),
    h('div', { className: 'duc-heatmap-scroll' },
      h('div', { className: 'duc-months', style: { width: `${width}px` } }, ...visibleMonths.map(month => h('span', { className: 'duc-month', key: `${month.column}-${month.label}`, style: { left: `${(month.column - 1) * 10}px` } }, month.label))),
      h('div', { className: 'duc-heatmap', role: 'grid', 'aria-label': t('activityTitle') }, ...cells.map((day, index) => {
        if (!day) return h('span', { className: 'duc-day', 'data-blank': true, key: `blank-${index}` });
        const rank = day.tokens === 0 ? -1 : activeValues.findIndex(value => value >= day.tokens);
        const level = rank < 0 ? 0 : Math.min(4, Math.floor(rank / Math.max(1, activeValues.length) * 4) + 1);
        const title = tr(t, 'activityTooltip', { date: new Date(`${day.date}T12:00:00`).toLocaleDateString(locale), tokens: fmtNumber(day.tokens, locale) });
        return h('span', { className: 'duc-day', 'data-level': level, key: day.date, role: 'gridcell', title, 'aria-label': title });
      })),
    ),
  );
}

function Quotas({ account, missingKey, locale, t }) {
  if (!account || account.status !== 'ok') return h('p', { className: 'duc-plan' }, account?.status === 'not-configured' ? t(missingKey) : t('quotaUnavailable'));
  return h(React.Fragment, null,
    h('p', { className: 'duc-plan' }, account.plan),
    ...account.windows.map(row => h('div', { className: 'duc-quota', key: row.kind },
      h('div', { className: 'duc-quota-meta' },
        h('span', null, t(quotaKeys[row.kind] ?? row.kind)),
        h('span', { className: 'duc-reset' }, fmtReset(row.resetsAt, locale, t)),
        h('b', null, tr(t, 'usedPercent', { n: row.usedPercent }))),
      h('div', { className: 'duc-track' }, h('div', { className: 'duc-fill', style: { width: `${row.usedPercent}%` } })),
    )),
  );
}

function Balances({ account, locale, t }) {
  if (!account || account.status !== 'ok') return h('p', { className: 'duc-plan' }, account?.status === 'not-configured' ? t('deepseekMissingKey') : t('balanceUnavailable'));
  if (account.balances.length === 0) return h('p', { className: 'duc-plan' }, t('balanceEmpty'));
  return h('div', { className: 'duc-balances' }, ...account.balances.map(row => h('div', { className: 'duc-balance', key: row.currency },
    h('div', { className: 'duc-balance-main' }, h('span', null, t('accountTotal')), h('b', null, fmtMoney(row.total, row.currency, locale)), !account.available ? h('span', { className: 'duc-balance-state' }, t('accountUnavailable')) : null),
    h('div', { className: 'duc-balance-part' }, h('span', null, t('toppedUpBalance')), h('b', null, fmtMoney(row.toppedUp, row.currency, locale))),
    h('div', { className: 'duc-balance-part' }, h('span', null, t('grantedBalance')), h('b', null, fmtMoney(row.granted, row.currency, locale))),
  )));
}

function ModelUsage({ item, locale, t }) {
  const tokens = item.tokens;
  return h('div', { className: 'duc-model' },
    h('div', { className: 'duc-model-head' }, h('div', { className: 'duc-provider-model' }, item.model), h('div', { className: 'duc-model-cost' }, item.estimate ? fmtUsd(item.estimate.usd) : '—')),
    h('div', { className: 'duc-tokens' },
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(tokens.inputTokens + tokens.cacheWriteTokens, locale)), t('inputTokens')),
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(tokens.cacheReadTokens, locale)), t('cacheReadTokens')),
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(tokens.outputTokens, locale)), t('outputTokens'))),
    item.estimate ? h('p', { className: 'duc-note' }, tr(t, 'estimatePrefix', { date: item.estimate.price.effective }), h('a', { href: item.estimate.price.source, target: '_blank', rel: 'noreferrer' }, t('priceSource'))) : h('p', { className: 'duc-note' }, t('priceMissing')),
  );
}

function Provider({ group, account, locale, t }) {
  const providerName = group.providerId === 'deepseek-official' ? 'DeepSeek' : group.providerId === 'zai-coding-cn' ? 'Z.ai' : group.providerId === 'kimi-coding' ? 'Kimi Code' : group.providerId;
  const cost = group.items.reduce((sum, item) => sum + (item.estimate?.usd ?? 0), 0);
  return h('section', { className: 'duc-provider' },
    h('div', { className: 'duc-provider-head' },
      h('div', { className: 'duc-provider-name' }, providerName),
      h('div', { className: 'duc-cost' }, h('strong', null, group.items.some(item => item.estimate) ? fmtUsd(cost) : '—'), h('span', null, t('todayEstimate'))),
    ),
    group.mode === 'subscription' ? h(Quotas, { account, missingKey: group.providerId === 'kimi-coding' ? 'kimiMissingKey' : 'zaiMissingKey', locale, t }) : h(Balances, { account, locale, t }),
    ...group.items.map(item => h(ModelUsage, { key: item.route, item, locale, t })),
  );
}

function UsageCenter({ locale: localeService, t }) {
  const localeRevision = useSyncExternalStore(
    useMemo(() => callback => localeService.subscribe(callback), [localeService]),
    useCallback(() => localeService.getSnapshot().active, [localeService]),
  );
  const intlLocale = String(localeRevision).toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
  const [state, setState] = useState({ loading: true, refreshing: false, data: null, error: '' });
  const load = useCallback(async (force = false) => {
    setState(s => ({ ...s, loading: s.data === null, refreshing: s.data !== null, error: '' }));
    try {
      const response = await fetch(`/api/usage-center/overview${force ? '?refresh=1' : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setState({ loading: false, refreshing: data.cache?.refreshing === true, data, error: data.cache?.refreshError ?? '' });
    } catch (error) { setState(s => ({ ...s, loading: false, refreshing: false, error: error instanceof Error ? error.message : String(error) })); }
  }, []);
  useEffect(() => { void load(false); }, [load]);
  useEffect(() => {
    if (!state.data?.cache?.refreshing) return undefined;
    const timer = setInterval(() => { void load(false); }, 1500);
    return () => clearInterval(timer);
  }, [state.data?.cache?.refreshing, load]);
  const providers = state.data?.providers ?? [];
  const providerGroups = groupProviders(providers);
  const total = providers.reduce((sum, p) => sum + (p.tokens.inputTokens + p.tokens.cacheWriteTokens + p.tokens.cacheReadTokens + p.tokens.outputTokens), 0);
  const cost = providers.reduce((sum, p) => sum + (p.estimate?.usd ?? 0), 0);
  return h('main', { className: 'duc-root' },
    h('header', { className: 'duc-head' }, h('div', null,
      h('h2', { className: 'duc-title' }, t('title')),
      h('p', { className: 'duc-desc' }, t('description')),
      state.data ? h('p', { className: 'duc-status', 'data-refreshing': state.refreshing }, state.refreshing ? t('updatingStatus') : fmtUpdated(state.data.updatedAt, t)) : null),
    h('button', { className: 'duc-refresh', type: 'button', disabled: state.loading || state.refreshing, onClick: () => load(true) }, state.loading ? t('loading') : state.refreshing ? t('updating') : t('refresh'))),
    state.loading && !state.data ? h('div', null, h('div', { className: 'duc-skeleton duc-skeleton-summary' }), h('div', { className: 'duc-skeleton duc-skeleton-line' }), h('div', { className: 'duc-skeleton duc-skeleton-line' }), h('div', { className: 'duc-skeleton duc-skeleton-line' })) : null,
    state.data ? h('div', { className: 'duc-summary' }, h('div', null, h('div', { className: 'duc-k' }, t('statDate')), h('div', { className: 'duc-v' }, state.data.day)), h('div', null, h('div', { className: 'duc-k' }, t('todayTokens')), h('div', { className: 'duc-v' }, fmtNumber(total, intlLocale))), h('div', null, h('div', { className: 'duc-k' }, t('totalEstimate')), h('div', { className: 'duc-v' }, fmtUsd(cost)))) : null,
    state.error ? h('p', { className: state.data ? 'duc-inline-error' : 'duc-error', role: 'alert' }, state.data ? tr(t, 'updateFailedCached', { error: state.error }) : tr(t, 'loadFailed', { error: state.error })) : null,
    state.data?.activity ? h(Heatmap, { activity: state.data.activity, locale: intlLocale, t }) : null,
    !state.loading && !state.error && providers.length === 0 ? h('p', { className: 'duc-empty' }, t('emptyToday')) : null,
    ...providerGroups.map(group => h(Provider, { key: group.providerId, group, locale: intlLocale, t, account: group.providerId === 'kimi-coding' ? state.data?.accounts?.kimi : group.mode === 'subscription' ? state.data?.accounts?.zai : state.data?.accounts?.deepseek })),
  );
}

function markNav(label) {
  const sync = () => document.querySelectorAll('[role="dialog"] nav button').forEach(button => {
    if (button.textContent?.trim() === label()) button.setAttribute(MARKER, ''); else button.removeAttribute(MARKER);
  });
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => { observer.disconnect(); document.querySelectorAll(`[${MARKER}]`).forEach(x => x.removeAttribute(MARKER)); };
}

export function apply(ctx) {
  const style = document.createElement('style');
  style.id = STYLE_ID; style.textContent = CSS; document.head.appendChild(style);
  ctx.effect(() => () => style.remove(), 'usage-center: styles');
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'usage-center: dictionaries');
  const t = ctx.locale.bind(LOCALE_NS);
  ctx.effect(() => markNav(() => t('settingsNav')), 'usage-center: settings icon');
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'usage-center', order: 110, label: () => t('settingsNav'),
    inject: () => ({ locale: ctx.locale, t }),
  }, UsageCenter));
}
