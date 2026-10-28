'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const power = require('../js/sim/power.js');
const hm = require('../js/sim/heatmap.js');
const preset = (id) => D.presets.find((p) => p.id === id);
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const gridW = (g) => { let s = 0; for (const r of g.rho) s += r * g.cellW * g.cellH; return s; };
const zen = () => design.fromPreset(preset('amd-zen5-9950x'));
const arl = () => design.fromPreset(preset('intel-arl-285k'));

test('既定の重みは power.js の DEFAULT_CEFF と一致し、仮と明記', () => {
  assert.deepStrictEqual(hm.DEFAULT_WEIGHTS.core, power.DEFAULT_CEFF);
  const r = hm.blockPowers(zen(), 100);
  assert.strictEqual(r.tentative, true);
  assert.ok(r.notes.some((n) => n.includes('模式図')));
  assert.ok(r.notes.some((n) => n.includes('クロック')));
});

test('blockPowers: 合計が totalW に一致', () => {
  [zen(), arl()].forEach((d) => {
    const r = hm.blockPowers(d, 123.4);
    assert.ok(r.ok);
    near(Object.values(r.byBlock).reduce((a, b) => a + b, 0), 123.4);
  });
});

test('blockPowers: コアの重み順・重みの上書き・面積 0 は 0W', () => {
  const d = { dies: [{ id: 'a', widthMm: 10, heightMm: 10, blocks: [
    { id: 'p', kind: 'core', coreType: 'P', x: 0, y: 0, w: 2, h: 2 },
    { id: 'e', kind: 'core', coreType: 'E', x: 2, y: 0, w: 2, h: 2 },
    { id: 'l', kind: 'core', coreType: 'LP-E', x: 4, y: 0, w: 2, h: 2 },
    { id: 'z', kind: 'l3', x: 6, y: 0, w: 0, h: 2 },
  ] }] };
  const r = hm.blockPowers(d, 10);
  assert.ok(r.byBlock.p > r.byBlock.e && r.byBlock.e > r.byBlock.l);
  assert.strictEqual(r.byBlock.z, 0);
  const r2 = hm.blockPowers(d, 10, { core: { 'LP-E': 5 } });
  assert.ok(r2.byBlock.l > r2.byBlock.p);
  near(r2.byBlock.p + r2.byBlock.e + r2.byBlock.l, 10);
});

test('blockPowers: totalW が不正なら ok:false', () => {
  [null, NaN, Infinity, undefined, -1].forEach((v) => {
    const r = hm.blockPowers(zen(), v);
    assert.strictEqual(r.ok, false); assert.ok(r.reason);
  });
});

test('powerDensityGrid: 電力合計が totalW に一致(leakFrac 込み・なし)', () => {
  const d = zen(); const bp = hm.blockPowers(d, 150).byBlock;
  [undefined, 0, 0.3].forEach((lf) => {
    const r = hm.powerDensityGrid(d, bp, lf === undefined ? {} : { leakFrac: lf });
    near(r.grids.reduce((s, g) => s + gridW(g), 0), 150, 1e-4);
  });
});

test('powerDensityGrid: 重なりは二重計上せず先のブロックを優先、notes に出す', () => {
  const d = { dies: [{ id: 'a', widthMm: 4, heightMm: 4, blocks: [
    { id: 'a1', kind: 'core', coreType: 'P', x: 0, y: 0, w: 3, h: 4 },
    { id: 'a2', kind: 'core', coreType: 'P', x: 1, y: 0, w: 3, h: 4 },
  ] }] };
  const r = hm.powerDensityGrid(d, { a1: 6, a2: 4 }, { leakFrac: 0, cellMm: 0.5 });
  near(gridW(r.grids[0]), 10, 1e-4);
  const g = r.grids[0];
  near(g.rho[0] * g.cellW * g.cellH * (6 * 8), 6, 1e-4); // a1 は 6x8 セル
  assert.ok(r.notes.some((n) => n.includes('重なって')));
});

test('powerDensityGrid: セル数は 200×200 以内、小さいブロックも電力を失わない', () => {
  const d = { dies: [{ id: 'a', widthMm: 100, heightMm: 60, blocks: [{ id: 'b', kind: 'core', x: 50, y: 30, w: 0.01, h: 0.01 }] }] };
  const r = hm.powerDensityGrid(d, { b: 5 }, { cellMm: 0.1, leakFrac: 0 });
  const g = r.grids[0];
  assert.ok(g.nx <= 200 && g.ny <= 200);
  near(gridW(g), 5, 1e-4);
});

// 9700X 12 コア相当(1 ダイ 10×7=70mm²、コア 12 個+L3+uncore)
const zen12 = () => {
  const blocks = [];
  for (let i = 0; i < 12; i++) blocks.push({ id: 'c' + i, kind: 'core', coreType: 'P', x: 0.5 + (i % 6) * 1.5, y: 0.5 + Math.floor(i / 6) * 1.5, w: 1.4, h: 1.4 });
  blocks.push({ id: 'l3', kind: 'l3', x: 0.5, y: 3.6, w: 9, h: 1.8 });
  blocks.push({ id: 'io', kind: 'uncore', x: 0.5, y: 5.6, w: 9, h: 1.0 });
  return { dies: [{ id: 'd', widthMm: 10, heightMm: 7, blocks }] };
};
// IOD 相当の電力の小さいダイを持つ 2 ダイ構成
const twoDie = () => ({ dies: [
  { id: 'ccd', widthMm: 8, heightMm: 8, blocks: [{ id: 'c0', kind: 'core', coreType: 'P', x: 1, y: 1, w: 3, h: 3 }, { id: 'c1', kind: 'core', coreType: 'P', x: 4.5, y: 1, w: 3, h: 3 }] },
  { id: 'iod', widthMm: 10, heightMm: 10, blocks: [{ id: 'u', kind: 'uncore', x: 0, y: 0, w: 10, h: 10 }] },
] });

test('solveTemperature: 平均が目標に一致・最大電力密度が最高温・収束', () => {
  const d = zen(); const bp = hm.blockPowers(d, 150).byBlock;
  const grids = hm.powerDensityGrid(d, bp).grids;
  const g = grids[0];
  const r = hm.solveTemperature(g, { tMeanTargetC: 80 });
  near(r.tMeanC, 80, 1e-5);
  assert.ok(r.converged && r.iterations <= 5000);
  let kr = 0; let kt = 0;
  for (let k = 0; k < g.rho.length; k++) { if (g.rho[k] > g.rho[kr]) kr = k; if (r.T[k] > r.T[kt]) kt = k; }
  assert.ok(g.rho[kt] >= 0.99 * g.rho[kr]); // 最も熱いセルは最大電力密度(同値のセルが複数ありうる)
  assert.ok(r.tMaxC > r.tMeanC && r.tMinC < r.tMeanC);
  assert.ok(r.tentative);
  assert.ok(r.notes.some((n) => n.includes('kSi×tDie') && n.includes('仮置き')));
});

test('solveTemperature: 横方向の定数はシリコンの値(thermal.js と一致)、spreadMm / kLat は無視', () => {
  const th = require('../js/sim/thermal.js');
  assert.strictEqual(th.DEFAULT_THERMAL.kSi, 150); assert.strictEqual(th.DEFAULT_THERMAL.tDieMm, 0.3);
  const g = hm.powerDensityGrid(zen12(), hm.blockPowers(zen12(), 100).byBlock).grids[0];
  const a = hm.solveTemperature(g, { tMeanTargetC: 90 });
  const b = hm.solveTemperature(g, { tMeanTargetC: 90, spreadMm: 5, kLat: 99 });
  assert.deepStrictEqual(Array.from(a.T), Array.from(b.T));
  assert.ok(b.notes.some((n) => n.includes('廃止')));
});

test('solveTemperature: 9700X 12 コア相当(199W・平均 100℃)で tMax−tMean が 50K 未満', () => {
  const d = zen12(); const g = hm.powerDensityGrid(d, hm.blockPowers(d, 199).byBlock).grids[0];
  const r = hm.solveTemperature(g, { tMeanTargetC: 100, tAmbientC: 25 });
  near(r.tMeanC, 100, 1e-5);
  const dt = r.tMaxC - r.tMeanC;
  // 局所の ΔT は (面積あたり電力の差)×(シリコン厚み方向 2 K·mm²/W+横方向の広がり)。実測で約 10K 台。
  // 従来の恣意的な広がり(spreadMm=1)では 146K だった。実チップのホットスポットは数十 K までなので、余裕を見て 50K 未満を上限とする。
  assert.ok(dt > 0 && dt < 50, 'dT=' + dt);
  assert.ok(r.tMinC > 25 + 0.5 * 75);
});

test('solveTemperature: 2 ダイで共通の蓋温度。電力の小さいダイも周囲温度ではなく蓋温度に近い', () => {
  const d = twoDie(); const bp = { c0: 90, c1: 90, u: 20 };
  const grids = hm.powerDensityGrid(d, bp, { leakFrac: 0 }).grids;
  const r = hm.solveTemperature(grids, { tMeanTargetC: 90, tAmbientC: 25 });
  near(r.tMeanC, 90, 1e-5);
  const iod = r.dies.find((x) => x.dieId === 'iod');
  assert.ok(iod.tMinC >= 25 + (90 - 25) * 0.5, 'iod min=' + iod.tMinC);
  assert.ok(r.dies.find((x) => x.dieId === 'ccd').tMaxC > iod.tMaxC);
});

test('solveTemperature: 解像度を変えても平均がほぼ同じ・最大温度も近い', () => {
  const d = zen12(); const bp = hm.blockPowers(d, 150).byBlock;
  const rs = [0.5, 0.25, 0.125].map((c) => hm.solveTemperature(hm.powerDensityGrid(d, bp, { cellMm: c }).grids[0], { tMeanTargetC: 80 }));
  rs.forEach((r) => { near(r.tMeanC, 80, 1e-5); assert.ok(r.converged); });
  assert.ok(Math.abs(rs[0].tMaxC - rs[2].tMaxC) < 0.2 * (rs[2].tMaxC - 80) + 1);
});

test('solveTemperature: 電力 0 で一様', () => {
  const d = zen();
  const g = hm.powerDensityGrid(d, {}, { leakFrac: 0 }).grids[0];
  const r = hm.solveTemperature(g, { tMeanTargetC: 60 });
  assert.strictEqual(r.tMaxC, 60); assert.strictEqual(r.tMinC, 60);
});

test('solveTemperature: tMeanTargetC が不正なら ok:false', () => {
  const g = hm.powerDensityGrid(zen(), hm.blockPowers(zen(), 10).byBlock).grids[0];
  assert.strictEqual(hm.solveTemperature(g, {}).ok, false);
});

test('hotspot: 最も熱いセルの位置と ΔT', () => {
  const g = { dieId: 'x', nx: 4, ny: 2, cellW: 0.5, cellH: 0.25 };
  const T = new Float32Array([1, 1, 1, 1, 1, 1, 5, 1]);
  const h = hm.hotspot(g, T);
  assert.strictEqual(h.ix, 2); assert.strictEqual(h.iy, 1);
  near(h.xMm, 1.25); near(h.yMm, 0.375);
  near(h.deltaC, 5 - 12 / 8);
  assert.ok(h.tentative);
});

test('toColors: 0〜1 の範囲と凡例、一様は 0.5', () => {
  const c = hm.toColors(new Float32Array([2, 4, 6]), 'temp');
  assert.deepStrictEqual(Array.from(c.values), [0, 0.5, 1]);
  assert.strictEqual(c.legend.min, 2); assert.strictEqual(c.legend.max, 6);
  assert.strictEqual(c.legend.unit, '°C'); assert.strictEqual(c.legend.uniform, false);
  const u = hm.toColors(new Float32Array([3, 3]), 'power');
  assert.deepStrictEqual(Array.from(u.values), [0.5, 0.5]);
  assert.strictEqual(u.legend.label, '一様'); assert.strictEqual(u.legend.unit, 'W/mm²');
});

test('複数ダイ(Arrow Lake): 各ダイが計算でき、全体平均が目標に一致', () => {
  const d = arl(); const bp = hm.blockPowers(d, 200).byBlock;
  const gr = hm.powerDensityGrid(d, bp);
  assert.strictEqual(gr.grids.length, 4);
  near(gr.grids.reduce((s, g) => s + gridW(g), 0), 200, 1e-4);
  const r = hm.solveTemperature(gr.grids, { tMeanTargetC: 75 });
  assert.strictEqual(r.dies.length, 4);
  near(r.tMeanC, 75, 1e-5);
  r.dies.forEach((x) => assert.ok(Number.isFinite(x.tMaxC)));
  const hs = hm.hotspot(gr.grids[0], r.dies[0].T);
  assert.ok(hs.deltaC >= 0);
});
