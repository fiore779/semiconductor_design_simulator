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

// ---- M3a: 編集後の再計算 ----
const impD = (id) => design.fromPreset(D.presets.find((p) => p.id === id), { mode: 'improve' });
const T = 'amd-zen5-9950x';

test('編集: 未編集の設計は従来どおり(edited:false、公開値との差が出る)', () => {
  const r = E.evaluate(impD(T), ctx);
  assert.strictEqual(r.st.edited, false); assert.strictEqual(r.edited, false);
  assert.strictEqual(typeof r.st.errPct, 'number'); assert.deepStrictEqual(r.outOfCalibration, []);
  assert.strictEqual(r.area.recomputed, false);
});

test('編集: cfg 無しの古い設計は従来どおり評価できる', () => {
  const d = impD(T); delete d.cfg; delete d.baseCfg;
  const r = E.evaluate(d, ctx); const r0 = ev(T);
  assert.strictEqual(r.st.score, r0.st.score); assert.strictEqual(r.mt.score, r0.mt.score);
  assert.strictEqual(r.st.edited, undefined); assert.strictEqual(r.edited, false);
});

test('編集: クロック↑で ST↑(範囲内でも上げたので楽観側=ST は low)。errPct は null、basePublished が残る', () => {
  const d0 = impD(T); const base = E.evaluate(d0, ctx);
  const r = E.evaluate(design.setClock(d0, 'P', 6.0).design, ctx); // 5.7 → 6.0(+5%)
  assert.ok(r.st.score > base.st.score);
  assert.strictEqual(r.st.edited, true); assert.strictEqual(r.mt.edited, true);
  assert.strictEqual(r.st.errPct, null); assert.strictEqual(r.st.published, null);
  assert.strictEqual(r.st.basePublished, base.st.published); assert.ok(r.st.basePublished > 0);
  assert.strictEqual(r.mt.basePublished, base.mt.published);
  assert.strictEqual(r.st.confidence, 'low'); assert.strictEqual(r.optimistic, true); // 電力・温度の制限を見ていない
  assert.deepStrictEqual(r.outOfCalibration, []);
  assert.ok(r.warnings.some((w) => w.text === '編集後の数値は予測です。公開値ではありません'));
  assert.strictEqual(r.area.recomputed, false); assert.strictEqual(r.area.recomputedReason, 'コア別面積は未取得のため編集では再計算しない');
  assert.strictEqual(r.area.totalMm2, base.area.totalMm2);
  assert.deepStrictEqual(r.power.published, base.power.published);
});

test('編集: コア数↑で MT↑。2 倍超は校正範囲外で確度 low', () => {
  const d0 = impD(T); const base = E.evaluate(d0, ctx);
  const r = E.evaluate(design.setCoreCount(d0, 'P', 24).design, ctx); // 16 → 24(1.5 倍。範囲内)
  assert.ok(r.mt.score > base.mt.score); assert.deepStrictEqual(r.outOfCalibration, []);
  const r2 = E.evaluate(design.setCoreCount(d0, 'P', 40).design, ctx); // 2.5 倍
  assert.ok(r2.mt.score > r.mt.score);
  assert.strictEqual(r2.outOfCalibration[0].field, 'core:P:count'); assert.strictEqual(r2.mt.confidence, 'low'); assert.strictEqual(r2.st.confidence, 'low');
  assert.ok(r2.warnings.some((w) => w.text.includes('校正した範囲の外')));
});

test('編集: 校正範囲外の判定(クロック ±25%、コア数 半分未満)', () => {
  const d0 = impD(T);
  const hi = E.evaluate(design.setClock(d0, 'P', 7.2).design, ctx); // +26%
  assert.strictEqual(hi.outOfCalibration[0].field, 'core:P:clock'); assert.strictEqual(hi.st.confidence, 'low');
  // +24.6% でも x86 の収録最大クロック(5.8 GHz)の 1.05 倍を超えるので、最大クロック側で範囲外
  assert.ok(E.evaluate(design.setClock(d0, 'P', 7.1).design, ctx).outOfCalibration[0].reason.includes('最大クロック'));
  const lo = E.evaluate(design.setClock(d0, 'P', 4.2).design, ctx); // -26%
  assert.strictEqual(lo.outOfCalibration.length, 1); assert.ok(lo.outOfCalibration[0].reason.includes('校正した範囲の外'));
  assert.strictEqual(E.evaluate(design.setCoreCount(d0, 'P', 7).design, ctx).outOfCalibration[0].field, 'core:P:count');
  assert.deepStrictEqual(E.evaluate(design.setCoreCount(d0, 'P', 8).design, ctx).outOfCalibration, []);
});

// ---- M3a レビュー対応: 校正範囲・楽観側 ----
const oocOf = (d) => E.evaluate(d, ctx).outOfCalibration;
const fields = (d) => oocOf(d).map((o) => o.field);
const withCfg = (d, f) => { const c = design.clone(d); f(c.cfg, c.baseCfg); return c; };

test('校正範囲: 境界(ちょうど ±25% / 2 倍 / 半分)は範囲内、わずかに超えると範囲外', () => {
  const d0 = impD(T);
  const clk = (b, n) => withCfg(d0, (c, bc) => { bc.cores[0].boostGHz = b; c.cores[0].boostGHz = n; });
  assert.deepStrictEqual(oocOf(clk(4.4, 5.5)), []);   // ちょうど 1.25 倍
  assert.deepStrictEqual(oocOf(clk(4.4, 3.3)), []);   // ちょうど 0.75 倍
  assert.deepStrictEqual(fields(clk(4.4, 5.51)), ['core:P:clock']);
  assert.deepStrictEqual(fields(clk(4.4, 3.29)), ['core:P:clock']);
  assert.deepStrictEqual(oocOf(design.setCoreCount(d0, 'P', 32).design), []); // 2 倍(16→32)
  assert.deepStrictEqual(oocOf(design.setCoreCount(d0, 'P', 8).design), []);  // 半分
  assert.deepStrictEqual(fields(design.setCoreCount(d0, 'P', 33).design), ['core:P:count']);
  assert.deepStrictEqual(fields(design.setCoreCount(d0, 'P', 7).design), ['core:P:count']);
});

test('校正範囲: L3(元 64 MB)は 0.5〜2 倍が範囲内。0 や、元が 0 からの増加は範囲外', () => {
  const d0 = impD(T);
  [32, 128, 64, 100].forEach((mb) => assert.deepStrictEqual(oocOf(design.setL3(d0, mb).design), [], String(mb)));
  [31, 129, 0].forEach((mb) => {
    const r = E.evaluate(design.setL3(d0, mb).design, ctx);
    assert.deepStrictEqual(r.outOfCalibration.map((o) => o.field), ['l3'], String(mb));
    assert.ok(/[぀-ヿ]/.test(r.outOfCalibration[0].reason)); assert.strictEqual(r.mt.confidence, 'low'); assert.strictEqual(r.st.confidence, 'low');
  });
  const m1 = impD('apple-m1'); // 元は L3 なし
  assert.deepStrictEqual(oocOf(design.setL3(m1, 0).design), []);
  assert.deepStrictEqual(fields(design.setL3(m1, 8).design), ['l3']);
});

test('校正範囲: 収録チップの最大クロックの 1.05 倍を超えるクロックは範囲外', () => {
  const d0 = impD(T); // x86 の最大は 5.8 GHz → 6.09 まで
  assert.deepStrictEqual(oocOf(design.setClock(d0, 'P', 6.0).design), []);
  assert.deepStrictEqual(oocOf(design.setClock(d0, 'P', 6.09).design), []);
  const r = E.evaluate(design.setClock(d0, 'P', 6.2).design, ctx);
  assert.deepStrictEqual(r.outOfCalibration.map((o) => o.field), ['core:P:clock']);
  assert.ok(r.outOfCalibration[0].reason.includes('収録しているチップの最大クロック(5.8 GHz)を超えています'));
  assert.strictEqual(r.st.confidence, 'low');
  assert.strictEqual(E.maxClockOf(ctx.presets, 'x86'), 5.8); assert.strictEqual(E.maxClockOf(ctx.presets, 'none'), null);
});

test('校正範囲: 元のクロックが未取得のコアにクロックを入れると範囲外(根拠がない)', () => {
  const m1 = impD('apple-m1');
  const r = E.evaluate(design.setClock(m1, 'E', 2.0).design, ctx);
  assert.deepStrictEqual(r.outOfCalibration.map((o) => o.field), ['core:E:clock']);
  assert.ok(r.outOfCalibration[0].reason.includes('未取得'));
});

test('楽観: クロック・コア数・L3 を上げた編集は optimistic。下げた編集・未編集は false', () => {
  const d0 = impD(T);
  const base = E.evaluate(d0, ctx);
  assert.strictEqual(base.optimistic, false); assert.deepStrictEqual(base.optimisticReasons, []);
  [design.setClock(d0, 'P', 6.0), design.setCoreCount(d0, 'P', 20), design.setL3(d0, 96)].forEach((r) => {
    const e = E.evaluate(r.design, ctx);
    assert.strictEqual(e.optimistic, true); assert.ok(e.optimisticReasons.length >= 1);
    assert.ok(e.warnings.some((w) => w.text.includes('楽観側の予測')));
  });
  [design.setClock(d0, 'P', 5.0), design.setCoreCount(d0, 'P', 12), design.setL3(d0, 48)].forEach((r) => {
    const e = E.evaluate(r.design, ctx);
    assert.strictEqual(e.optimistic, false); assert.deepStrictEqual(e.optimisticReasons, []);
  });
  assert.strictEqual(E.evaluate(design.setClock(impD('apple-m1'), 'E', 2.0).design, ctx).optimistic, true); // 未取得→入力は上げた扱い
});

test('楽観: ST の確度が落ちるのはクロックを上げたときだけ。コア数だけなら MT のみ', () => {
  const d0 = impD(T); const base = E.evaluate(d0, ctx);
  assert.notStrictEqual(base.st.confidence, 'low');
  const clk = E.evaluate(design.setClock(d0, 'P', 6.0).design, ctx);
  assert.deepStrictEqual(clk.outOfCalibration, []); assert.strictEqual(clk.st.confidence, 'low'); assert.strictEqual(clk.mt.confidence, 'low');
  const cnt = E.evaluate(design.setCoreCount(d0, 'P', 20).design, ctx);
  assert.strictEqual(cnt.st.confidence, base.st.confidence); assert.strictEqual(cnt.mt.confidence, 'low');
  const down = E.evaluate(design.setClock(d0, 'P', 5.0).design, ctx);
  assert.strictEqual(down.st.confidence, base.st.confidence);
  assert.strictEqual(E.OPTIMISTIC_NOTE, require('../js/ui/paramform.js').OPTIMISTIC_NOTE);
});
