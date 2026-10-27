'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const design = require('../js/model/design.js');
const ctx = E.makeContext();
const ev = (id) => E.evaluate(design.fromPreset(D.presets.find((p) => p.id === id)), ctx);

// 代表 SKU は校正に使った SKU 自身なので、公開値と一致するのは当然(検証ではない)。
test('代表 SKU(9700X): ST は公開値と 0.5% 以内(検証ではない)', () => {
  const r = ev('amd-zen5-9700x');
  assert.ok(r.st.ok); assert.ok(r.st.isCalibSample);
  assert.ok(Math.abs(r.st.errPct) < 0.5, String(r.st.errPct));
});

test('検証用 SKU(9950X): errPct が出る(代表ではない)', () => {
  const r = ev('amd-zen5-9950x');
  assert.ok(r.st.ok); assert.strictEqual(r.st.isCalibSample, false);
  assert.strictEqual(typeof r.st.errPct, 'number');
  assert.strictEqual(typeof r.st.published, 'number');
  assert.ok(r.st.publishedKind);
});

test('Meteor Lake: 未取得のダイを含んでも面積は null にならず、未取得を数える', () => {
  const r = ev('intel-mtl-185h');
  assert.ok(r.area.totalMm2 > 0);
  assert.ok(r.area.unknownCount >= 1);
  assert.strictEqual(r.area.totalIsPartial, true);
  assert.ok(r.area.reason.includes('未取得'));
  const unk = r.area.dies.find((d) => !d.known);
  assert.strictEqual(unk.mm2, null); assert.strictEqual(unk.source, null);
  assert.strictEqual(unk.yield.value, null); assert.ok(unk.yield.reason);
  assert.strictEqual(r.area.yield, null); assert.ok(r.area.yieldReason);
});

test('MT の確度は low(σ・γ が未校正)。公開値との差も出す', () => {
  ['amd-zen5-9700x', 'amd-zen5-9950x'].forEach((id) => {
    const r = ev(id);
    assert.ok(r.mt.ok);
    assert.strictEqual(r.mt.confidence, 'low');
    assert.ok(r.mt.uncalibrated.includes('gammaSmt'));
    assert.strictEqual(typeof r.mt.errPct, 'number');
    assert.ok(r.warnings.some((w) => w.text.startsWith('MT: 確度は低')));
  });
});

test('電力: モデル値は出さず公表値だけ', () => {
  const r = ev('intel-rpl-13900k');
  assert.strictEqual(r.power.model, null);
  assert.ok(r.power.modelReason.includes('未校正'));
  assert.strictEqual(r.power.published.peak.w, 253);
  assert.strictEqual(r.power.reason, null);
});

test('未取得のプリセット(5800X): 面積・電力は null と理由', () => {
  const r = ev('amd-zen3-5800x');
  assert.strictEqual(r.area.totalMm2, null); assert.ok(r.area.reason);
  assert.strictEqual(r.area.yield, null);
  assert.deepStrictEqual(r.power.published, { base: null, peak: null, range: null });
  assert.ok(r.power.reason.includes('未取得'));
});

test('ブロックを動かしても数値は変わらない(M2)', () => {
  const d = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen5-9700x'));
  const a = E.evaluate(d, ctx);
  const d2 = design.clone(d); d2.dies[0].blocks[0].x += 0.3;
  const b = E.evaluate(d2, ctx);
  assert.strictEqual(a.st.score, b.st.score); assert.strictEqual(a.mt.score, b.mt.score);
  assert.strictEqual(a.area.totalMm2, b.area.totalMm2);
});

test('検証の警告が warnings に入る / プリセット不明でも落ちない', () => {
  const d = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen5-9700x'));
  d.dies[0].blocks[0].x = -5;
  assert.ok(E.evaluate(d, ctx).warnings.some((w) => w.level === 'error' && w.blockId === d.dies[0].blocks[0].id));
  d.presetId = 'nope';
  const r = E.evaluate(d, ctx);
  assert.strictEqual(r.st.ok, false); assert.strictEqual(r.st.score, null); assert.ok(r.st.reason);
});

test('serialize → parse → evaluate の往復で結果が同じ', () => {
  ['amd-zen5-9950x', 'intel-mtl-185h', 'apple-m1'].forEach((id) => {
    const d = design.fromPreset(D.presets.find((p) => p.id === id));
    const r = design.parse(design.serialize(d));
    assert.ok(r.ok, id);
    assert.deepStrictEqual(E.evaluate(r.design, ctx), E.evaluate(d, ctx), id);
  });
});

test('MT の isCalibSample は σ の合わせに使った SKU だけ。calib:true でも使っていなければ calibNotUsedForMt', () => {
  const used = ctx.cal.mt.usedPresets;
  assert.ok(used.length > 0);
  used.forEach((id) => { const r = ev(id); assert.strictEqual(r.mt.isCalibSample, true, id); assert.strictEqual(r.mt.calibNotUsedForMt, false); });
  const notUsed = D.presets.filter((p) => p.calib && !used.includes(p.id));
  assert.ok(notUsed.length > 0);
  notUsed.forEach((p) => { const r = ev(p.id); assert.strictEqual(r.mt.isCalibSample, false, p.id); assert.strictEqual(r.mt.calibNotUsedForMt, true, p.id); assert.strictEqual(r.st.isCalibSample, true, p.id); });
});
