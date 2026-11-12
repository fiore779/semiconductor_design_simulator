// Base タイル(Foveros の土台。発熱しない)は熱の面積・電力密度から除く。面積の合計表示・ST/MT は変えない。
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const T = require('../js/sim/thermal.js');
const ctx = E.makeContext();
const pre = (id) => D.presets.find((p) => p.id === id);
const ev = (id) => E.evaluate(design.fromPreset(pre(id)), ctx);

test('isPassiveDie / heatDies: 名前が Base で始まるダイだけが対象', () => {
  assert.strictEqual(T.isPassiveDie({ name: 'Base タイル' }), true);
  assert.strictEqual(T.isPassiveDie({ name: 'Base タイル(22nm)' }), true);
  assert.strictEqual(T.isPassiveDie({ name: 'Compute タイル' }), false);
  assert.strictEqual(T.isPassiveDie({ name: 'Database' }), false);
  assert.strictEqual(T.isPassiveDie(null), false);
  assert.deepStrictEqual(T.heatDies([{ name: 'Base タイル' }, { name: 'SoC タイル' }]).map((d) => d.name), ['SoC タイル']);
});

test('285H: 発熱するタイルの面積が未取得なので電力・温度は出ない(Base 178mm² だけでは推定しない)。面積の合計は Base を含む従来どおり', () => {
  const r = ev('intel-arl-285h');
  assert.strictEqual(r.thermal.ok, false);
  assert.ok(/面積/.test(r.thermal.reason) && /Base/.test(r.thermal.reason));
  assert.strictEqual(r.area.totalMm2, 178);
  assert.ok(r.st.ok && r.mt.ok);
});

test('Base を含む設計の発熱面積は Base を除いた値(Lunar Lake 268V: 2 タイルだけ)', () => {
  const p = pre('intel-lnl-268v');
  const base = p.dies.find((d) => /^Base/.test(d.name));
  assert.ok(base && base.mm2 > 0);
  const heat = T.heatDies(p.dies).reduce((s, d) => s + d.mm2, 0);
  assert.ok(Math.abs(heat - (139.6 + 45.7)) < 1e-9);
  const cal = { powerK: ev('intel-lnl-268v').powerModel.powerK };
  const o = { cal, coolingId: 'thin-laptop', substrateId: 'organic', powerLimitW: 37 };
  const a = T.solveThrottle(Object.assign({ preset: p }, o));
  const withoutBase = T.solveThrottle(Object.assign({ preset: Object.assign({}, p, { dies: T.heatDies(p.dies) }) }, o));
  assert.strictEqual(a.rTotal, withoutBase.rTotal);
  assert.strictEqual(a.tjC, withoutBase.tjC);
  const all = T.rTotal({ coolingId: 'thin-laptop', substrateId: 'organic', dieAreaMm2: 139.6 + 45.7 + base.mm2 });
  assert.ok(a.rTotal > all.r); // Base を含めた面積で出した値より熱抵抗が大きい
  assert.strictEqual(ev('intel-lnl-268v').area.totalMm2, 139.6 + 45.7 + base.mm2); // 面積の合計表示は Base を含む
});

test('Base の nodeId(285H は intel-14 の仮指定)は電力・熱の計算に使われない: 変えても温度・電力は同じ', () => {
  const p = pre('intel-lnl-268v');
  const alt = Object.assign({}, p, { dies: p.dies.map((d) => (/^Base/.test(d.name) ? Object.assign({}, d, { nodeId: 'intel-14' }) : d)) });
  const a = E.evaluate(design.fromPreset(p), ctx); const b = E.evaluate(design.fromPreset(alt), ctx);
  assert.deepStrictEqual(a.thermal, b.thermal);
  assert.deepStrictEqual(a.powerModel, b.powerModel);
  assert.strictEqual(a.st.score, b.st.score); assert.strictEqual(a.mt.score, b.mt.score);
});

test('Base を持たない SKU(9700X・14900K)の温度は従来どおり(Base 除外で変わらない)', () => {
  ['amd-zen5-9700x', 'intel-rpl-14900k'].forEach((id) => {
    const p = pre(id); if (!p) return;
    assert.strictEqual(T.heatDies(p.dies).length, p.dies.length, id);
  });
});
