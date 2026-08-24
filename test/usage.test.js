import test from 'node:test';
import assert from 'node:assert/strict';
import { foldToday } from '../src/usage.js';
import { estimate } from '../src/pricing.js';
import { parseDeepSeekBalance, parseZaiQuota } from '../src/accounts.js';
import { isSnapshotForDay, SNAPSHOT_VERSION, snapshotWire } from '../src/snapshot.js';

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

test('normalizes Z.ai quota percentages', () => {
  const value = parseZaiQuota({ data:{ limits:[
    {type:'TOKENS_LIMIT',unit:5,number:300,usage:100,remaining:99,currentValue:1},
    {type:'TOKENS_LIMIT',unit:6,number:1,usage:100,remaining:62,currentValue:38},
    {type:'TIME_LIMIT',percentage:4.5,remaining:3821},
  ]}}, {data:[{product_name:'GLM Coding Max'}]});
  assert.equal(value.plan, 'GLM Coding Max');
  assert.deepEqual(value.windows.map(x => x.usedPercent), [1,38,4.5]);
});

test('normalizes DeepSeek account balance', () => {
  const value = parseDeepSeekBalance({ is_available:true, balance_infos:[{ currency:'CNY', total_balance:'110.00', granted_balance:'10.00', topped_up_balance:'100.00' }] });
  assert.deepEqual(value, { available:true, balances:[{ currency:'CNY', total:110, granted:10, toppedUp:100 }] });
});

test('accepts only a current-day persisted snapshot', () => {
  const snapshot = { ok:true, day:'2026-08-24', updatedAt:100, providers:[] };
  assert.equal(isSnapshotForDay({ version:SNAPSHOT_VERSION, snapshot }, '2026-08-24'), true);
  assert.equal(isSnapshotForDay({ version:SNAPSHOT_VERSION, snapshot }, '2026-08-25'), false);
});

test('decorates cached data without mutating the snapshot', () => {
  const snapshot = { ok:true, day:'2026-08-24', updatedAt:100, providers:[] };
  const wire = snapshotWire(snapshot, 350, true);
  assert.deepEqual(wire.cache, { ageMs:250, refreshing:true });
  assert.equal('cache' in snapshot, false);
});
