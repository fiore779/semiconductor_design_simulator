'use strict';
// dGPU の性能モデル(第 1 段階: RTX 40 の 9 SKU。学習内の当てはめであって検証ではない)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
global.window = globalThis;
require(path.join(__dirname, '..', 'data', 'gpus.js'));
const G = require('../js/sim/gpuperf.js');
const gpus = globalThis.SDS_DATA.gpus;

test('GPU データ: RTX 40 の 9 SKU・id 重複なし・仕様は正の値', () => {
  assert.strictEqual(gpus.length, 9);
  assert.strictEqual(new Set(gpus.map((g) => g.id)).size, 9);
  gpus.forEach((g) => { assert.ok(g.shaders > 0 && g.boostMHz > 1500 && g.bwGBs > 0 && g.busBits > 0 && g.tgpW > 0 && g.openclScore > 0 && g.s === 'sec' && g.uarch === 'Ada', g.id); });
  // 帯域 = バス幅 / 8 × データレート: 4060 は 128bit × 17 Gbps、4090 は 384bit × 21 Gbps
  assert.ok(Math.abs(gpus.find((g) => g.id === 'nv-rtx4060').bwGBs - 128 / 8 * 17) < 0.5);
  assert.ok(Math.abs(gpus.find((g) => g.id === 'nv-rtx4090').bwGBs - 384 / 8 * 21) < 0.5);
});

test('GPU モデル: TFLOPS = シェーダー × 2 × クロック。u は中央値。9 SKU はすべて ±10% 以内(学習内)', () => {
  const g4090 = gpus.find((g) => g.id === 'nv-rtx4090');
  assert.ok(Math.abs(G.tflops(g4090) - 82.575) < 0.01);
  const u = G.uOf(gpus, 'Ada'); assert.ok(u > 0);
  gpus.forEach((g) => { const e = G.predict(g, u) / g.openclScore - 1; assert.ok(Math.abs(e) <= 0.10, `${g.id}: ${(e * 100).toFixed(1)}%`); });
  assert.strictEqual(G.uOf(gpus, 'RDNA 3'), null); // 世代のデータがなければ予測しない
  assert.strictEqual(G.predict(g4090, null), null);
});
