'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sim, D } = require('./helpers');
const A = sim.area;

test('dieAreaMm2: 合計と未取得の数え上げ', () => {
  const r = A.dieAreaMm2([{ mm2: 100 }, { mm2: 50.5 }, { mm2: null }, {}]);
  assert.strictEqual(r.mm2, 150.5);
  assert.strictEqual(r.knownCount, 2);
  assert.strictEqual(r.unknownCount, 2);
});

test('yield: 面積が増えると下がり、D0=0 で 1', () => {
  assert.strictEqual(A.yield(100, 0), 1);
  assert.ok(Math.abs(A.yield(100, 0.1) - Math.exp(-0.1)) < 1e-12);
  assert.ok(A.yield(200, 0.1) < A.yield(100, 0.1));
});

test('diesPerWafer: 面積が増えると減る', () => {
  let prev = Infinity;
  [50, 100, 200, 400, 800].forEach((a) => { const n = A.diesPerWafer(a); assert.ok(n < prev); prev = n; });
  assert.strictEqual(A.diesPerWafer(100), 640); // π·150²/100 − π·300/√200 = 706.9 − 66.6
});

test('costIndex: 取得済みなら合計、面積が増えるとコスト増', () => {
  const small = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'], substrateId: 'organic' });
  const big = A.costIndex({ areas: [200], nodeIds: ['tsmc-n5'], substrateId: 'organic' });
  assert.ok(small.ok);
  assert.ok(big.total > small.total);
  assert.ok(small.total > 1); // 基板 1 + ダイ分
});

test('costIndex: 未取得は推測せず null と理由を返す', () => {
  const noPrice = A.costIndex({ areas: [100], nodeIds: ['intel-7'], substrateId: 'organic' });
  assert.strictEqual(noPrice.total, null);
  assert.strictEqual(noPrice.ok, false);
  assert.ok(noPrice.reasons.some((m) => m.includes('ウェハ価格')));
  const noD0 = A.costIndex({ areas: [100], nodeIds: ['tsmc-n4'], substrateId: 'organic' });
  assert.strictEqual(noD0.total, null);
  assert.ok(noD0.reasons.some((m) => m.includes('D0')));
  const noArea = A.costIndex({ areas: [null], nodeIds: ['tsmc-n5'] });
  assert.strictEqual(noArea.total, null);
});

test('costIndex: 基板未指定なら total は null で、理由に基板コストを含まない旨(partialTotal はダイ分のみ)', () => {
  const r = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'] });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.total, null);
  assert.ok(r.partialTotal > 0);
  assert.ok(r.reasons.some((m) => m.includes('基板未指定')));
});

test('costIndex: 基板の costRel が null なら total は null と理由', () => {
  const s = D.substrates.find((b) => b.id === 'organic'); const orig = s.costRel;
  try {
    s.costRel = null;
    const r = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'], substrateId: 'organic' });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.total, null);
    assert.ok(r.reasons.some((m) => m.includes('相対コスト')));
  } finally { s.costRel = orig; }
});

test('costIndex: waferMm がダイ数に効く(小さいウェハほどコスト増)', () => {
  const w300 = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'], substrateId: 'organic', waferMm: 300 });
  const w200 = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'], substrateId: 'organic', waferMm: 200 });
  const dflt = A.costIndex({ areas: [100], nodeIds: ['tsmc-n5'], substrateId: 'organic' });
  assert.strictEqual(w300.total, dflt.total);
  assert.ok(w200.dieCosts[0] > w300.dieCosts[0]);
});
