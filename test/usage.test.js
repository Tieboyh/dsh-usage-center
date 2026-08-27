import test from 'node:test';
import assert from 'node:assert/strict';
import { activityFromDaily, foldDaily, foldToday, mergeDaily } from '../src/usage.js';
import { estimate } from '../src/pricing.js';
import { parseDeepSeekBalance, parseKimiQuota, parseZaiQuota } from '../src/accounts.js';
import { isSnapshotForDay, SNAPSHOT_VERSION, snapshotWire } from '../src/snapshot.js';
import { en, interpolate, zh } from '../src/locales.js';

test('replaces cumulative usage samples for the same turn and step', () => {
  const day = '2026-08-24';
  const events = [
    { type:'request/header', time:new Date(`${day}T01:00:00`).getTime(), data:{header:{config:{provider:'deepseek-official',model:'deepseek-v4-pro'}}}},
    { type:'assistant/chunk', time:new Date(`${day}T01:00:01`).getTime(), data:{turn:1,step:1,chunk:{type:'usage',usage:{inputTokens:10,outputTokens:2}}}},
    { type:'assistant/message', time:new Date(`${day}T01:00:02`).getTime(), data:{turn:1,step:1,usage:{inputTokens:10,outputTokens:5},message:{source:{provider:'deepseek-official',model:'deepseek-v4-pro'}}}},
  ];
  assert.deepEqual(foldToday(events, day).get('deepseek-official/deepseek-v4-pro'), { inputTokens:10, outputTokens:5, cacheReadTokens:0, cacheWriteTokens:0 });
});

test('calculates estimates from distinct cache and output rates', () => {
  const value = estimate('zai-coding-cn/glm-5.3', { inputTokens:88_406, cacheReadTokens:236_480, cacheWriteTokens:0, outputTokens:10_452 });
  assert.equal(Number(value.usd.toFixed(6)), 0.231242);
});

test('prices DeepSeek vision-exp at the public V4 Flash rate', () => {
  const tokens = { inputTokens: 2_000, cacheReadTokens: 3_000, cacheWriteTokens: 0, outputTokens: 1_000 };
  assert.deepEqual(
    estimate('deepseek-official/deepseek-v4-flash-vision-exp', tokens),
    estimate('deepseek-official/deepseek-v4-flash', tokens),
  );
});

test('calculates a Kimi K3 API-equivalent estimate', () => {
  const value = estimate('kimi-coding/k3', { inputTokens: 2_000, cacheReadTokens: 3_000, cacheWriteTokens: 0, outputTokens: 1_000 });
  assert.equal(Number(value.usd.toFixed(6)), 0.0219);
});

test('normalizes Z.ai quota percentages', () => {
  const value = parseZaiQuota({ data:{ limits:[
    {type:'TOKENS_LIMIT',unit:5,number:300,usage:100,remaining:99,currentValue:1},
    {type:'TOKENS_LIMIT',unit:6,number:1,usage:100,remaining:62,currentValue:38},
    {type:'TIME_LIMIT',percentage:4.5,remaining:3821},
  ]}}, {data:[{product_name:'GLM Coding Max'}]});
  assert.equal(value.plan, 'GLM Coding Max');
  assert.deepEqual(value.windows.map(x => x.usedPercent), [1,38,4.5]);
});

test('normalizes Kimi Code weekly and rolling 5-hour quotas', () => {
  const value = parseKimiQuota({
    usage: { used: '38', limit: '100', resetTime: '2026-08-30T06:24:55Z' },
    limits: [{
      window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' },
      detail: { limit: '100', resetTime: '2026-08-24T10:24:55Z' },
    }],
  }, { user_level_name: 'Allegretto' });
  assert.equal(value.plan, 'Allegretto');
  assert.deepEqual(value.windows.map(x => [x.kind, x.usedPercent]), [['fiveHour', 0], ['weekly', 38]]);
});

test('normalizes DeepSeek account balance', () => {
  const value = parseDeepSeekBalance({ is_available:true, balance_infos:[{ currency:'CNY', total_balance:'110.00', granted_balance:'10.00', topped_up_balance:'100.00' }] });
  assert.deepEqual(value, { available:true, balances:[{ currency:'CNY', total:110, granted:10, toppedUp:100 }] });
});

test('accepts only a current-day persisted snapshot', () => {
  const snapshot = { ok:true, day:'2026-08-24', updatedAt:100, providers:[], activity:{ days:[] } };
  assert.equal(isSnapshotForDay({ version:SNAPSHOT_VERSION, snapshot }, '2026-08-24'), true);
  assert.equal(isSnapshotForDay({ version:SNAPSHOT_VERSION, snapshot }, '2026-08-25'), false);
});

test('decorates cached data without mutating the snapshot', () => {
  const snapshot = { ok:true, day:'2026-08-24', updatedAt:100, providers:[] };
  const wire = snapshotWire(snapshot, 350, true);
  assert.deepEqual(wire.cache, { ageMs:250, refreshing:true });
  assert.equal('cache' in snapshot, false);
});

test('builds a 365-day activity series and streak metrics', () => {
  const daily = new Map();
  const events = [
    ['2026-08-20', 1, 10],
    ['2026-08-22', 2, 20],
    ['2026-08-23', 3, 30],
    ['2026-08-24', 4, 40],
  ].map(([day, turn, inputTokens]) => ({ type:'assistant/message', time:new Date(`${day}T12:00:00`).getTime(), data:{turn,step:1,usage:{inputTokens},message:{source:{provider:'deepseek-official',model:'deepseek-v4-pro'}}} }));
  mergeDaily(daily, foldDaily(events));
  const activity = activityFromDaily(daily, new Date('2026-08-24T12:00:00').getTime(), 5);
  assert.deepEqual(activity.days.map(day => day.tokens), [10,0,20,30,40]);
  assert.deepEqual({ total:activity.totalTokens, peak:activity.peakTokens, current:activity.currentStreak, longest:activity.longestStreak }, { total:100, peak:40, current:3, longest:3 });
});

test('keeps Chinese and English dictionaries in sync', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  assert.equal(en.settingsNav, 'Usage & Cost');
  assert.equal(zh.settingsNav, '用量与费用');
});

test('interpolates localized values', () => {
  assert.equal(interpolate(en.usedPercent, { n: 38 }), '38% used');
  assert.equal(interpolate(zh.updateFailedCached, { error: 'timeout' }), '更新失败，正在显示上次数据：timeout');
});
