'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sim, D } = require('./helpers');
const T = sim.thermal; const P = sim.power;
const adl = () => D.presets.find((p) => p.id === 'intel-adl-12900k');
const calOf = (p) => ({ powerK: P.calibratePower(p).powerK });
const sub = (id) => D.substrates.find((s) => s.id === id);

test('rTotal: 基板の熱伝導率を下げても熱抵抗は下がらない(温度は下がらない)', () => {
  const base = T.rTotal({ coolingId: 'air-tower', substrateId: 'organic', dieAreaMm2: 200 });
  assert.ok(base.ok);
  const s = sub('organic'); const orig = s.conductivityWmK;
  try {
    s.conductivityWmK = { v: orig.v / 10, s: 'tmp', note: 'test' };
    const low = T.rTotal({ coolingId: 'air-tower', substrateId: 'organic', dieAreaMm2: 200 });
    assert.ok(low.r >= base.r);
  } finally { s.conductivityWmK = orig; }
});

test('rTotal: 冷却を弱めると R 増、熱伝導率が null なら ok:false', () => {
  const strong = T.rTotal({ coolingId: 'aio-360', substrateId: 'organic', dieAreaMm2: 200 });
  const weak = T.rTotal({ coolingId: 'thin-laptop', substrateId: 'organic', dieAreaMm2: 200 });
  assert.ok(weak.r > strong.r);
  const s = sub('organic'); const orig = s.conductivityWmK;
  try {
    s.conductivityWmK = null;
    assert.strictEqual(T.rTotal({ coolingId: 'air-tower', substrateId: 'organic', dieAreaMm2: 200 }).ok, false);
  } finally { s.conductivityWmK = orig; }
});

test('solveThrottle: 制限内に収まり、冷却を弱めると s は大きくならない', () => {
  const p = adl(); const cal = calOf(p);
  const run = (cooling, pl) => T.solveThrottle({ preset: p, cal, coolingId: cooling, substrateId: 'organic', powerLimitW: pl });
  const r = run('air-tower', 150);
  assert.ok(r.ok && r.feasible && r.converged);
  assert.ok(r.powerW <= 150 + 1e-9 && r.tjC <= 100 + 1e-9);
  assert.ok(r.s < 1);
  assert.strictEqual(r.limitedBy, 'power');
  const weak = run('thin-laptop', 1e9);
  assert.ok(weak.s <= run('aio-360', 1e9).s);
  // tjC は非収束のとき null(JS では null <= 100 が true になるので、数値であることを先に確認する)
  assert.ok(!weak.feasible || (weak.tjC !== null && weak.tjC <= 100 + 1e-9), '収まると言うなら Tj は上限以下');
});

test('solveThrottle: s=1 で収まるなら limitedBy:none', () => {
  const p = adl();
  const r = T.solveThrottle({ preset: p, cal: calOf(p), coolingId: 'aio-360', substrateId: 'organic', powerLimitW: 1e9, fTargetByType: { P: 3, E: 2 } });
  assert.ok(r.ok);
  assert.strictEqual(r.s, 1);
  assert.strictEqual(r.limitedBy, 'none');
});

test('solveThrottle: 熱で制限される場合は thermal', () => {
  const p = adl();
  const r = T.solveThrottle({ preset: p, cal: calOf(p), coolingId: 'small-fan', substrateId: 'organic', powerLimitW: 1e9, fMinRatio: 0.05 });
  assert.ok(r.ok && r.feasible);
  assert.strictEqual(r.limitedBy, 'thermal');
  assert.ok(r.tjC <= 100 + 1e-9);
});

test('solveThrottle: Tj が発散(非収束)なら converged:false・feasible:false で止まり、tjC は null・最後の値は tjLastC', () => {
  const p = adl();
  const r = T.solveThrottle({ preset: p, cal: calOf(p), coolingId: 'air-tower', substrateId: 'organic', powerLimitW: 1e9, fMinRatio: 0.9 });
  assert.ok(r.ok);
  assert.strictEqual(r.converged, false);
  assert.strictEqual(r.feasible, false);
  assert.strictEqual(r.limitedBy, 'runaway');
  assert.strictEqual(r.tjC, null);
  assert.ok(r.tjLastC > 400);
  assert.ok(r.notes.some((m) => m.includes('熱暴走')));
});

test('solveThrottle: 冷却不足(収束しているが Tj 超過)は feasible:false・limitedBy:cooling で、熱暴走とは言わない', () => {
  const p = adl();
  const r = T.solveThrottle({ preset: p, cal: calOf(p), coolingId: 'thin-laptop', substrateId: 'organic', powerLimitW: 1e9 });
  assert.ok(r.ok);
  assert.strictEqual(r.converged, true);
  assert.strictEqual(r.feasible, false);
  assert.strictEqual(r.limitedBy, 'cooling');
  assert.ok(r.tjC > 100);
  assert.ok(r.notes.some((m) => m.includes('冷却不足')));
  assert.ok(!r.notes.some((m) => m.includes('熱暴走')));
});

test('solveThrottle: 基板の熱伝導率が null なら ok:false', () => {
  const p = adl(); const s = sub('organic'); const orig = s.conductivityWmK;
  try {
    s.conductivityWmK = null;
    const r = T.solveThrottle({ preset: p, cal: calOf(p), coolingId: 'air-tower', substrateId: 'organic' });
    assert.strictEqual(r.ok, false);
    assert.ok(r.reason.includes('熱伝導率'));
  } finally { s.conductivityWmK = orig; }
});
