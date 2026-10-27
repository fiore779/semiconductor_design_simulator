'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sim, D } = require('./helpers');
const P = sim.power;
const preset = (id) => D.presets.find((p) => p.id === id);
const adl = () => JSON.parse(JSON.stringify(preset('intel-adl-12900k')));

test('vfCurve: クロックが上がると電圧は下がらず、vmax で頭打ち', () => {
  let prev = 0;
  [0.5, 1, 2, 3, 4, 5, 6, 8].forEach((f) => { const v = P.vfCurve(null, f); assert.ok(v >= prev); prev = v; });
  assert.strictEqual(P.vfCurve(null, 100), P.DEFAULT_VF.vmax);
  assert.strictEqual(P.vfCurve(null, 0.5), P.DEFAULT_VF.vmin);
});

test('corePower: クロック↑で電圧↑・電力↑、温度↑でリーク↑', () => {
  const a = P.corePower({ cEff: 1, fGHz: 3, alpha: 1, tjC: 70 });
  const b = P.corePower({ cEff: 1, fGHz: 4, alpha: 1, tjC: 70 });
  assert.ok(b.v > a.v);
  assert.ok(b.w > a.w);
  const hot = P.corePower({ cEff: 1, fGHz: 3, alpha: 1, tjC: 100 });
  assert.ok(hot.leakW > a.leakW);
});

test('chipPower: コア数↑で電力↑、負荷 idle<single<all', () => {
  const p = adl(); const f = { P: 4, E: 3 };
  const w1 = P.chipPower(p, null, f, 'all', 70).w;
  p.cfg.cores[0].count += 4;
  assert.ok(P.chipPower(p, null, f, 'all', 70).w > w1);
  const q = adl();
  const idle = P.chipPower(q, null, f, 'idle', 70).w;
  const single = P.chipPower(q, null, f, 'single', 70).w;
  const all = P.chipPower(q, null, f, 'all', 70).w;
  assert.ok(idle < single && single < all);
});

test('calibratePower: 全コア baseGHz・Tj=70 でモデル電力が power.base と一致', () => {
  const p = preset('intel-adl-12900k');
  const cal = P.calibratePower(p);
  assert.ok(cal.ok);
  const f = {}; p.cfg.cores.forEach((g) => { f[g.type] = g.baseGHz; });
  const w = P.chipPower(p, { powerK: cal.powerK }, f, 'all', 70).w;
  assert.ok(Math.abs(w - p.power.base.w) < 1e-9);
});

test('calibratePower: base や baseGHz が無ければ ok:false と理由', () => {
  const p = adl(); p.power.base = null;
  const r1 = P.calibratePower(p);
  assert.strictEqual(r1.ok, false);
  assert.ok(r1.reason);
  const q = adl(); q.cfg.cores[0].baseGHz = null;
  const r2 = P.calibratePower(q);
  assert.strictEqual(r2.ok, false);
  assert.ok(r2.reason.includes('baseGHz'));
});

test('chipPower: クロックを上げると電力は単調に増える(全コア・単一コア)', () => {
  const p = adl();
  ['all', 'single'].forEach((load) => {
    let prev = 0;
    [0.5, 1, 2, 3, 4, 5, 6].forEach((f) => {
      const w = P.chipPower(p, null, { P: f, E: f }, load, 70).w;
      assert.ok(w > prev, `${load} f=${f}`); prev = w;
    });
  });
});

test('corePower / chipPower: tjC 省略でも NaN にならず既定 Tj を使う', () => {
  const a = P.corePower({ cEff: 1, fGHz: 3, alpha: 1 });
  assert.ok(Number.isFinite(a.w));
  assert.strictEqual(a.w, P.corePower({ cEff: 1, fGHz: 3, alpha: 1, tjC: P.DEFAULT_TJ_C }).w);
  const p = adl();
  const w = P.chipPower(p, null, { P: 4, E: 3 }, 'all').w;
  assert.strictEqual(w, P.chipPower(p, null, { P: 4, E: 3 }, 'all', P.DEFAULT_TJ_C).w);
});

test('corePower / chipPower: クロック未取得は NaN でなく ok:false(idle はクロック不要)', () => {
  assert.strictEqual(P.corePower({ cEff: 1, fGHz: undefined, alpha: 1, tjC: 70 }).ok, false);
  const p = adl(); p.cfg.cores.forEach((g) => { g.baseGHz = null; g.boostGHz = null; g.maxGHz = null; });
  const r = P.chipPower(p, null, {}, 'all', 70);
  assert.strictEqual(r.ok, false);
  assert.ok(r.reason);
  assert.strictEqual(P.chipPower(p, null, {}, 'single', 70).ok, false);
  const idle = P.chipPower(p, null, {}, 'idle', 70);
  assert.ok(idle.ok && Number.isFinite(idle.w));
});

test('chipPower: idle のクロックはそのコアの最大クロックを超えない', () => {
  const p = adl(); p.cfg.cores.forEach((g) => { g.baseGHz = 0.3; g.boostGHz = 0.4; g.maxGHz = 0.4; });
  const slow = P.chipPower(p, null, {}, 'idle', 70).w;
  const q = adl();
  assert.ok(slow < P.chipPower(q, null, {}, 'idle', 70).w);
});

test('calibratePower: cal(vf・leak・cEff・uncore)を変えても同じ cal で powerK が合う', () => {
  const p = preset('intel-adl-12900k');
  const cal = { vf: { vmin: 0.8, kv: 0.2 }, leak: { kLeak: 0.6 }, cEff: { P: 1.5 }, uncore: { wPerL3MB: 0.3 } };
  const k = P.calibratePower(p, cal);
  assert.ok(k.ok);
  assert.notStrictEqual(k.powerK, P.calibratePower(p).powerK);
  const f = {}; p.cfg.cores.forEach((g) => { f[g.type] = g.baseGHz; });
  const w = P.chipPower(p, Object.assign({}, cal, { powerK: k.powerK }), f, 'all', 70).w;
  assert.ok(Math.abs(w - p.power.base.w) < 1e-9);
});
