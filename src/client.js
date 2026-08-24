import React, { useCallback, useEffect, useState } from 'react';

const h = React.createElement;
const STYLE_ID = 'dsh-usage-center/style';
const MARKER = 'data-dsh-usage-center-nav';
export const inject = ['slots'];

const CSS = `
.duc-root{color:var(--dsw-alias-label-primary,#171717);max-width:100%;padding:2px 0 32px}
.duc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:30px}
.duc-title{font-size:27px;line-height:38px;font-weight:600;margin:0 0 4px}.duc-desc{color:var(--dsw-alias-label-secondary,#7b7f89);font-size:15px;line-height:24px;margin:0}
.duc-refresh{appearance:none;border:1px solid var(--dsw-alias-border-l1,#dedfe2);border-radius:999px;background:var(--dsw-alias-fill-l1,#fff);color:inherit;padding:9px 17px;font:14px/20px inherit;cursor:pointer}.duc-refresh:hover{background:var(--dsw-alias-fill-l2,#f4f5f6)}.duc-refresh:disabled{opacity:.55;cursor:wait}
.duc-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--dsw-alias-border-l1,#e4e5e7);border-block:1px solid var(--dsw-alias-border-l1,#e4e5e7);margin-bottom:28px}
.duc-summary>div{background:var(--dsw-alias-bg-base,#fff);padding:18px 18px 18px 0}.duc-summary>div+div{padding-left:22px}.duc-k{color:var(--dsw-alias-label-secondary,#777b84);font-size:13px;line-height:20px}.duc-v{font-size:24px;line-height:34px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:2px}
.duc-provider{border-bottom:1px solid var(--dsw-alias-border-l1,#e4e5e7);padding:0 0 26px;margin-bottom:26px}.duc-provider-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}.duc-provider-name{font-size:18px;line-height:28px;font-weight:600}.duc-provider-model{color:var(--dsw-alias-label-secondary,#777b84);font:12px/20px ui-monospace,SFMono-Regular,monospace}.duc-cost{text-align:right}.duc-cost strong{display:block;font-size:22px;line-height:30px;font-variant-numeric:tabular-nums}.duc-cost span{color:var(--dsw-alias-label-secondary,#777b84);font-size:12px}
.duc-tokens{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.duc-token{font-size:13px;color:var(--dsw-alias-label-secondary,#777b84)}.duc-token b{display:block;color:var(--dsw-alias-label-primary,#171717);font-size:16px;line-height:24px;font-weight:500;font-variant-numeric:tabular-nums}
.duc-balances{display:flex;flex-direction:column;margin:-5px 0 21px;border-block:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-balance{display:grid;grid-template-columns:minmax(150px,1.2fr) repeat(2,minmax(110px,1fr));gap:18px;padding:14px 0;align-items:end}.duc-balance+.duc-balance{border-top:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-balance-main span,.duc-balance-part span{display:block;color:var(--dsw-alias-label-secondary,#777b84);font-size:12px;line-height:18px}.duc-balance-main b{font-size:22px;line-height:30px;font-weight:600;font-variant-numeric:tabular-nums}.duc-balance-part b{font-size:15px;line-height:24px;font-weight:500;font-variant-numeric:tabular-nums}.duc-balance-state{color:var(--dsw-alias-state-error-primary,#c33);font-size:12px;margin-left:8px}
.duc-plan{color:var(--dsw-alias-label-secondary,#777b84);font-size:13px;margin:-12px 0 18px}.duc-quota{margin-top:13px}.duc-quota-meta{display:flex;align-items:baseline;gap:12px;font-size:13px;margin-bottom:7px}.duc-quota-meta b{margin-left:auto;font-size:14px;font-variant-numeric:tabular-nums}.duc-reset{color:var(--dsw-alias-label-tertiary,#999da5);font-size:11px}.duc-track{height:7px;border-radius:99px;background:var(--dsw-alias-fill-l2,#eceef1);overflow:hidden}.duc-fill{height:100%;border-radius:inherit;background:var(--dsw-alias-button-primary-fill,#1668dc)}
.duc-note{color:var(--dsw-alias-label-secondary,#777b84);font-size:12px;line-height:20px;margin:18px 0 0}.duc-note a{color:inherit;text-decoration:underline;text-underline-offset:2px}.duc-empty,.duc-error{padding:28px 0;color:var(--dsw-alias-label-secondary,#777b84)}.duc-error{color:var(--dsw-alias-state-error-primary,#c33)}
[${MARKER}] svg{display:none}[${MARKER}]::before{content:'';width:24px;height:24px;flex:0 0 24px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8'%3E%3Cpath d='M4 19V9m6 10V5m6 14v-7m4 7H2'/%3E%3C/svg%3E") center/contain no-repeat}
@media(max-width:760px){.duc-summary,.duc-tokens,.duc-balance{grid-template-columns:1fr}.duc-summary{gap:0}.duc-summary>div,.duc-summary>div+div{padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l1,#e4e5e7)}.duc-provider-head{flex-direction:column}.duc-cost{text-align:left}}
`;

function fmtNumber(value) { return new Intl.NumberFormat('zh-CN').format(value ?? 0); }
function fmtUsd(value) { return `$${Number(value ?? 0).toFixed(value < .1 ? 4 : 3)}`; }
function fmtMoney(value, currency) { return new Intl.NumberFormat('zh-CN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value); }
function fmtReset(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})} ${date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 重置`;
}
const quotaNames = { session: '当前会话周期', weekly: '每周额度', billing: '账期额度' };

function Quotas({ account }) {
  if (!account || account.status !== 'ok') return h('p', { className: 'duc-plan' }, account?.status === 'not-configured' ? '未配置 ZAI_API_KEY，暂时无法读取订阅额度。' : '订阅额度暂时不可用。');
  return h(React.Fragment, null,
    h('p', { className: 'duc-plan' }, account.plan),
    ...account.windows.map(row => h('div', { className: 'duc-quota', key: row.kind },
      h('div', { className: 'duc-quota-meta' },
        h('span', null, quotaNames[row.kind] ?? row.kind),
        h('span', { className: 'duc-reset' }, fmtReset(row.resetsAt)),
        h('b', null, `已用 ${row.usedPercent}%`)),
      h('div', { className: 'duc-track' }, h('div', { className: 'duc-fill', style: { width: `${row.usedPercent}%` } })),
    )),
  );
}

function Balances({ account }) {
  if (!account || account.status !== 'ok') return h('p', { className: 'duc-plan' }, account?.status === 'not-configured' ? '未配置 DEEPSEEK_API_KEY，暂时无法读取账户余额。' : '账户余额暂时不可用。');
  if (account.balances.length === 0) return h('p', { className: 'duc-plan' }, '账户未返回可展示的余额。');
  return h('div', { className: 'duc-balances' }, ...account.balances.map(row => h('div', { className: 'duc-balance', key: row.currency },
    h('div', { className: 'duc-balance-main' }, h('span', null, '账户可用总额'), h('b', null, fmtMoney(row.total, row.currency)), !account.available ? h('span', { className: 'duc-balance-state' }, '当前不可调用') : null),
    h('div', { className: 'duc-balance-part' }, h('span', null, '充值余额'), h('b', null, fmtMoney(row.toppedUp, row.currency))),
    h('div', { className: 'duc-balance-part' }, h('span', null, '赠送余额'), h('b', null, fmtMoney(row.granted, row.currency))),
  )));
}

function Provider({ item, account }) {
  const t = item.tokens;
  return h('section', { className: 'duc-provider' },
    h('div', { className: 'duc-provider-head' },
      h('div', null, h('div', { className: 'duc-provider-name' }, item.providerId === 'deepseek-official' ? 'DeepSeek' : item.providerId === 'zai-coding-cn' ? 'Z.ai' : item.providerId), h('div', { className: 'duc-provider-model' }, item.model)),
      h('div', { className: 'duc-cost' }, h('strong', null, item.estimate ? fmtUsd(item.estimate.usd) : '—'), h('span', null, '今日 API 估价')),
    ),
    item.mode === 'subscription' ? h(Quotas, { account }) : h(Balances, { account }),
    h('div', { className: 'duc-tokens' },
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(t.inputTokens + t.cacheWriteTokens)), '输入 Token'),
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(t.cacheReadTokens)), '缓存读取 Token'),
      h('div', { className: 'duc-token' }, h('b', null, fmtNumber(t.outputTokens)), '输出 Token')),
    item.estimate ? h('p', { className: 'duc-note' }, 'API 估价按公开单价计算，仅用于衡量等量 API 调用成本，不是实际账单。单价生效日 ', item.estimate.price.effective, ' · ', h('a', { href: item.estimate.price.source, target: '_blank', rel: 'noreferrer' }, '查看价格来源')) : h('p', { className: 'duc-note' }, '当前模型尚未配置公开 API 单价，暂不估价。'),
  );
}

function UsageCenter() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const response = await fetch('/api/usage-center/overview', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setState({ loading: false, data, error: '' });
    } catch (error) { setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : String(error) })); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const providers = state.data?.providers ?? [];
  const total = providers.reduce((sum, p) => sum + (p.tokens.inputTokens + p.tokens.cacheWriteTokens + p.tokens.cacheReadTokens + p.tokens.outputTokens), 0);
  const cost = providers.reduce((sum, p) => sum + (p.estimate?.usd ?? 0), 0);
  return h('main', { className: 'duc-root' },
    h('header', { className: 'duc-head' }, h('div', null, h('h2', { className: 'duc-title' }, '用量与费用'), h('p', { className: 'duc-desc' }, '查看今日各 Provider 的 Token、订阅额度和 API 估价。')), h('button', { className: 'duc-refresh', type: 'button', disabled: state.loading, onClick: load }, state.loading ? '刷新中…' : '刷新')),
    state.data ? h('div', { className: 'duc-summary' }, h('div', null, h('div', { className: 'duc-k' }, '统计日期'), h('div', { className: 'duc-v' }, state.data.day)), h('div', null, h('div', { className: 'duc-k' }, '今日 Token'), h('div', { className: 'duc-v' }, fmtNumber(total))), h('div', null, h('div', { className: 'duc-k' }, '合计 API 估价'), h('div', { className: 'duc-v' }, fmtUsd(cost)))) : null,
    state.error ? h('p', { className: 'duc-error', role: 'alert' }, `加载失败：${state.error}`) : null,
    !state.loading && !state.error && providers.length === 0 ? h('p', { className: 'duc-empty' }, '今天还没有可统计的模型调用。') : null,
    ...providers.map(item => h(Provider, { key: item.route, item, account: item.mode === 'subscription' ? state.data?.accounts?.zai : state.data?.accounts?.deepseek })),
  );
}

function markNav(label) {
  const sync = () => document.querySelectorAll('[role="dialog"] nav button').forEach(button => {
    if (button.textContent?.trim() === label) button.setAttribute(MARKER, ''); else button.removeAttribute(MARKER);
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
  ctx.effect(() => markNav('用量与费用'), 'usage-center: settings icon');
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'usage-center', order: 110, label: () => '用量与费用' }, UsageCenter));
}
