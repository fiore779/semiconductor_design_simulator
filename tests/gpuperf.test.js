'use strict';
// dGPU の性能モデル(52 SKU。学習内の当てはめと、u の 1 件抜き検証)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
global.window = globalThis;
require(path.join(__dirname, '..', 'data', 'gpus.js'));
const G = require('../js/sim/gpuperf.js');
const gpus = globalThis.SDS_DATA.gpus;

test('GPU データ: 52 SKU・id 重複なし・8 世代・仕様は正の値・出典区分 sec', () => {
  assert.strictEqual(gpus.length, 52);
  assert.strictEqual(new Set(gpus.map((g) => g.id)).size, 52);
  assert.deepStrictEqual([...new Set(gpus.map((g) => g.uarch))].sort(), ['Ada', 'Alchemist', 'Ampere', 'Battlemage', 'Blackwell', 'RDNA 2', 'RDNA 3', 'RDNA 4']);
  gpus.forEach((g) => { assert.ok(g.shaders > 0 && g.boostMHz > 1500 && g.bwGBs > 0 && g.busBits > 0 && g.tgpW > 0 && g.openclScore > 0 && g.s === 'sec', g.id); });
  // 帯域 = バス幅 / 8 × データレート。4060 は 128bit × 17 Gbps、4090 は 384bit × 21 Gbps、5090 は 512bit × 28 Gbps
  const bw = (id) => gpus.find((g) => g.id === id).bwGBs;
  assert.ok(Math.abs(bw('nv-rtx4060') - 128 / 8 * 17) < 0.5 && Math.abs(bw('nv-rtx4090') - 384 / 8 * 21) < 0.5 && Math.abs(bw('nv-rtx5090') - 512 / 8 * 28) < 0.5);
});

test('GPU モデル: TFLOPS = シェーダー × 2 × クロック。世代データがなければ予測しない', () => {
  const g = gpus.find((x) => x.id === 'nv-rtx4090');
  assert.ok(Math.abs(G.tflops(g) - 82.575) < 0.01);
  assert.strictEqual(G.uOf(gpus, 'RDNA 5'), null);
  assert.strictEqual(G.predict(g, null), null);
  // 帯域を下げるとスコアが下がり、演算量を上げるとスコアが上がる(単調)
  const u = G.uOf(gpus, 'Ada');
  assert.ok(G.predict(Object.assign({}, g, { bwGBs: 504 }), u) < G.predict(g, u));
  assert.ok(G.predict(Object.assign({}, g, { shaders: 20000 }), u) > G.predict(g, u));
});

test('GPU モデル: 学習内で 52 SKU の 95% 以上が ±10% 以内(最大 15% 未満)。u の 1 件抜きでも同程度(係数は全 SKU で当てた値)', () => {
  const stat = (excl) => {
    const e = gpus.map((g) => { const u = G.uOf(gpus, g.uarch, excl ? g.id : undefined); return G.predict(g, u) / g.openclScore - 1; });
    return { within: e.filter((x) => Math.abs(x) <= 0.10).length / e.length, max: Math.max(...e.map(Math.abs)) };
  };
  const a = stat(false); const b = stat(true);
  assert.ok(a.within >= 0.95 && a.max < 0.15, `学習内 ${(a.within * 100).toFixed(0)}% max ${(a.max * 100).toFixed(0)}%`);
  assert.ok(b.within >= 0.95 && b.max < 0.15, `1 件抜き ${(b.within * 100).toFixed(0)}% max ${(b.max * 100).toFixed(0)}%`);
});

// ---- iGPU(data/igpus.js)と GPU 評価ダイアログの純関数 ----
require(path.join(__dirname, '..', 'data', 'igpus.js'));
const igpus = globalThis.SDS_DATA.igpus;
globalThis.SDS = globalThis.SDS || {}; globalThis.SDS.gpuperf = G;
const P = (() => { global.window = globalThis; const m = {}; const src = require('fs').readFileSync(path.join(__dirname, '..', 'js', 'ui', 'gpupanel.js'), 'utf8'); new Function('window', src.replace(/root\.SDS\.ui\.gpupanel = /, 'window.__gp = ')).call(null, Object.assign(globalThis, { SDS: Object.assign(globalThis.SDS, { ui: {} }) })); return globalThis.__gp; })();

test('iGPU データ: 10 SKU・id 重複なし・kind igpu・メモリ帯域は [推定]・公開値あり', () => {
  assert.strictEqual(igpus.length, 15);
  assert.strictEqual(new Set(igpus.map((g) => g.id)).size, 15);
  igpus.forEach((g) => assert.ok(g.kind === 'igpu' && g.bwS === 'est' && g.shaders > 0 && g.boostMHz > 0 && g.bwGBs > 0 && g.openclScore > 0 && g.s === 'sec' && g.memNote, g.id));
  assert.ok(!gpus.some((g) => g.kind), 'dGPU の行に kind は付けない');
});

test('iGPU モデル: iGPU の u は同じ世代の dGPU より低い(電力・共有メモリ)。dGPU と iGPU は別の区分', () => {
  const ud = G.uOf(gpus, 'RDNA 3'); const ui = G.uOf(igpus, 'RDNA 3', undefined, 'igpu');
  assert.ok(ui < ud && ui / ud > 0.7 && ui / ud < 0.95, `${ui} / ${ud}`);
  assert.strictEqual(G.uOf(igpus, 'RDNA 3'), null, 'iGPU の行だけを渡して dGPU の u は出ない');
  assert.strictEqual(G.uOf(igpus, 'Ada', undefined, 'igpu'), null);
});

test('GPU 評価の一覧: 67 行・dGPU は 95% 以上が ±10%・iGPU は 1 件世代を校正のみと表示・差は予測 / 公開値 − 1', () => {
  const rows = P.buildRows(gpus, igpus);
  assert.strictEqual(rows.length, 67);
  const d = rows.filter((r) => r.cls === 'dgpu'); assert.ok(d.filter((r) => r.ok).length / d.length >= 0.95);
  const i = rows.filter((r) => r.cls === 'igpu');
  assert.ok(i.find((r) => r.id === 'amd-680m').selfOnly && !i.find((r) => r.id === 'intel-arc140v').selfOnly, '140V は 3 行あるので校正のみではない');
  assert.ok(!i.find((r) => r.id === 'amd-680m').ok, '校正のみの行は ok にしない');
  const r = rows.find((x) => x.id === 'nv-rtx4090'); assert.ok(Math.abs(r.err - (r.predicted / r.published - 1)) < 1e-12);
  // 外れ値は隠さない(890M は再集計後も +28%。LPDDR5X 機と DDR5 機で帯域が違う影響とみられる)
  assert.ok(Math.abs(i.find((x) => x.id === 'amd-890m').err) > 0.2);
});

test('GPU 評価の計算機: 仕様を上書きすると推定が変わる(帯域・シェーダーで単調)・存在しない id は null', () => {
  const all = gpus.concat(igpus);
  const e0 = P.estimate(all, 'amd-780m'); const e1 = P.estimate(all, 'amd-780m', { bwGBs: 120 }); const e2 = P.estimate(all, 'amd-780m', { shaders: 1024 });
  assert.ok(e1.predicted > e0.predicted && e2.predicted > e0.predicted);
  assert.strictEqual(P.estimate(all, 'nope'), null);
});
