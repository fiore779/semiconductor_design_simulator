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

test('未取得のプリセット: 面積は 5800X、電力は Snapdragon 865 で null と理由(5800X は 2026-11-05 に TDP 105W・PPT 142W を入れた)', () => {
  const r = ev('amd-zen3-5800x');
  assert.strictEqual(r.area.totalMm2, null); assert.ok(r.area.reason);
  assert.strictEqual(r.area.yield, null);
  assert.deepStrictEqual([r.power.published.base.w, r.power.published.peak.w, r.power.published.range], [105, 142, null]);
  assert.strictEqual(r.power.reason, null);
  const n = ev('qc-865');
  assert.deepStrictEqual(n.power.published, { base: null, peak: null, range: null });
  assert.ok(n.power.reason.includes('未取得'));
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
  const r = E.evaluate(design.setClock(d0, 'P', 5.9).design, ctx); // 5.7 → 5.9(+3.5%)。2026-11-06: x86 の最大クロックが 13900K の 5.8 から 5.7 に下がり、1.05 倍の上限が 6.09 → 5.985 GHz になったため、6.0 から 5.9 に変更
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
  // +24.6% でも x86 の収録最大クロック 5.7 GHz の 1.05 倍(=5.985)を超えるので、最大クロック側で範囲外
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
  // 2026-11-07: M1 は SLC 8MB を L3 相当として cfg.l3MB に入れた(GPU 未実装のため)。元が L3 なし(未取得)の例は M4 Pro(SLC 未取得で l3MB が無い)
  const m1 = impD('apple-m4pro'); // 元は L3 なし
  assert.deepStrictEqual(oocOf(design.setL3(m1, 0).design), []);
  assert.deepStrictEqual(fields(design.setL3(m1, 8).design), ['l3']);
  assert.deepStrictEqual(oocOf(design.setL3(impD('apple-m1'), 8).design), []); // 元の SLC 相当 8MB のまま
});

test('校正範囲: 収録チップの最大クロックの 1.05 倍を超えるクロックは範囲外', () => {
  const d0 = impD(T); // 2026-11-11: 14900HX の P boost 5.8 を収録して、x86 の最大は 5.7 から 5.8 GHz に戻った → 6.09 まで(旧 5.7 GHz → 5.985 まで)。以前の記録: x86 の最大は 5.7 GHz → 5.985 まで(2026-11-06: 13900K の P boost 5.8 → 5.4 で、最大は 5.8 から 5.7 に下がった。旧: 6.09 まで、6.0・6.09・6.2 で確認)
  assert.deepStrictEqual(oocOf(design.setClock(d0, 'P', 5.9).design), []);
  assert.deepStrictEqual(oocOf(design.setClock(d0, 'P', 6.09).design), []); // 上限ちょうど(範囲内)
  assert.deepStrictEqual(oocOf(design.setClock(d0, 'P', 6.091).design).map((o) => o.field), ['core:P:clock']); // わずかに超えると範囲外
  const r = E.evaluate(design.setClock(d0, 'P', 6.1).design, ctx);
  assert.deepStrictEqual(r.outOfCalibration.map((o) => o.field), ['core:P:clock']);
  assert.ok(r.outOfCalibration[0].reason.includes('収録しているチップの最大クロック(5.8 GHz)を超えています'));
  assert.strictEqual(r.st.confidence, 'low');
  assert.strictEqual(E.maxClockOf(ctx.presets, 'x86'), 5.8); assert.strictEqual(E.maxClockOf(ctx.presets, 'none'), null);
});

// 2026-11-05: M1 の E コアの最大クロック 2.064GHz を取得したため、クロック未取得のコアを持つ実プリセットは無くなった。E のクロックを外した M1 の複製から作った設計で確かめる(baseCfg も未取得)
const m1NoEClock = () => { const p = JSON.parse(JSON.stringify(D.presets.find((x) => x.id === 'apple-m1'))); delete p.cfg.cores.find((c) => c.type === 'E').maxGHz; return design.fromPreset(p, { mode: 'improve' }); };
test('校正範囲: 元のクロックが未取得のコアにクロックを入れると範囲外(根拠がない)', () => {
  const m1 = m1NoEClock();
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
  assert.strictEqual(E.evaluate(design.setClock(m1NoEClock(), 'E', 2.0).design, ctx).optimistic, true); // 未取得→入力は上げた扱い(2026-11-05: 実プリセットに未取得のクロックが無くなったため E を外した M1 の複製で確認)
});

test('楽観: ST の確度が落ちるのはクロックを上げたときだけ。コア数だけなら MT のみ', () => {
  const d0 = impD(T); const base = E.evaluate(d0, ctx);
  assert.notStrictEqual(base.st.confidence, 'low');
  const clk = E.evaluate(design.setClock(d0, 'P', 5.9).design, ctx); // 2026-11-06: 6.0 → 5.9(x86 の最大クロックが 5.7 に下がり、6.0 は範囲外になるため)
  assert.deepStrictEqual(clk.outOfCalibration, []); assert.strictEqual(clk.st.confidence, 'low'); assert.strictEqual(clk.mt.confidence, 'low');
  const cnt = E.evaluate(design.setCoreCount(d0, 'P', 20).design, ctx);
  assert.strictEqual(cnt.st.confidence, base.st.confidence); assert.strictEqual(cnt.mt.confidence, 'low');
  const down = E.evaluate(design.setClock(d0, 'P', 5.0).design, ctx);
  assert.strictEqual(down.st.confidence, base.st.confidence);
  assert.strictEqual(E.OPTIMISTIC_NOTE, require('../js/ui/paramform.js').OPTIMISTIC_NOTE);
});

test('モード B 12900K: L3 0/1/4/30MB の ST/MT を固定(0 は noL3、小さい L3 は下限)', () => {
  // 2026-10-30(M6 第 4 段): Golden Cove の専用 u(112.3)導入で更新(2026-11-01: 14700HX を標本から外して u=112.7、値を更新)。旧値 0:[1696.09,14773.73] 1:[1882.25,14773.73] 4:[2079.46,14773.73] 30:[2227.63,17654.36]
  // 2026-11-05: 265K の P boost 5.5→5.4 の再校正で x86 平均 u が動き、E コア(Gracemont)の MT が変わった(ST は不変)。旧 MT 0/1/4:15291.32 30:18240.5
  // 2026-11-06: 13900K・13700K の P boost を ARK の P コア最大ターボに揃え、Golden/Raptor の uCal が 112.7→114.1 に動いた。旧 0:[1780.43,15310.46] 1:[1975.86,15310.46] 4:[2182.87,15310.46] 30:[2338.42,18266.22]
  // 2026-11-07: Zen 3 の代表を加えて σ が 0.02737→0.02888 に動き、E コア(Gracemont)の MT が変わった(ST は不変)。旧 MT 0/1/4:15446.18 30:18419.92
  // 2026-11-10: γ(SMT の効果)0.25 → 0.30 で σ が 0.0289 → 0.0327 に動き MT が変わった(ST は不変)。旧 MT 0/1/4:15084.05 30:17981.96
  // 2026-11-13: PC 系 CPU の GB7 を Windows のみの中央値(実測)に差し替え(ユーザー決定)。uCal 114.1→116.5・σ 0.03270→0.03306 で ST/MT が動いた。旧 0:[1802.55,14738.81] 1:[2000.40,14738.81] 4:[2209.99,14738.81] 30:[2367.46,17545.83]
  // 2026-11-13(Windows のみ化 第 2 回): 1800X の MT 公開値 6671 → 7203 で σ 0.03306 → 0.03183、x86 ISA 平均 u 109.18 → 109.77(E コア Gracemont が使う)で MT が動いた(ST は不変)。旧 MT 0/1/4:14982.52 30:17836.62
  // 2026-11-15(265K の P の boost を 5.5GHz に。Lion Cove の u 102.13 → 100.36、x86 ISA 平均 u 109.77 → 109.39、c 0.411 → 0.412): MT 0/1/4:15249.61 → 15234.94、30:18158.09 → 18138.36(ST は不変)
  // 2026-11-15(プラットフォームの DRAM 遅延 dramLat を ST に入れた。u・uCal・σ が動き、c 0.405): ST 0/1/4/30:1840.47/2042.48/2256.48/2417.26 → 1897.96/2082.08/2279.55/2425.60(12900K の遅延 76.1ns)、MT 15234.94 → 15286.22、18138.36 → 18199.27
  const exp = { 0: [1897.96, 15286.22], 1: [2082.08, 15286.22], 4: [2279.55, 15286.22], 30: [2425.60, 18199.27] };
  const rs = {};
  [0, 1, 4, 30].forEach((mb) => {
    const r = E.evaluate(design.setL3(impD('intel-adl-12900k'), mb).design, ctx); rs[mb] = r;
    assert.ok(Math.abs(r.st.score - exp[mb][0]) < 0.01, `ST ${mb}: ${r.st.score}`);
    assert.ok(Math.abs(r.mt.score - exp[mb][1]) < 0.01, `MT ${mb}: ${r.mt.score}`);
  });
  assert.strictEqual(rs[0].st.noL3, true); assert.strictEqual(rs[0].mt.noL3, true);
  assert.strictEqual(rs[1].mt.l3Floor, true); assert.strictEqual(rs[4].mt.l3Floor, true); assert.strictEqual(rs[30].mt.l3Floor, false);
  assert.strictEqual(rs[30].mt.noL3, false);
});

test('inUCalSet: Golden/Raptor 10 件の ST だけ true(代表ではない学習内)。標本から除外した 14700HX・ISA 代用・代表・MT は false', () => {
  const ids = D.presets.filter((p) => ev(p.id).st.inUCalSet).map((p) => p.id).sort();
  // 2026-11-07: Cortex-A78 の uCal(780G・6 Gen 1・4 Gen 2・Dimensity 8200 の 4 件)が加わって 10 → 14 件(Golden/Raptor 10 件 + A78 4 件)
  // 2026-11-13(Windows のみ化 第 2 回): Cougar Cove の uCal 98.3(388H・386H・378H・358H・325・320 の 6 件)が加わって 14 → 20 件
  // 2026-11-14: Redwood Cove の uCal 99.5(標本はプリセットの 185H と、プリセットにしていない参考データ 10 件)が加わって 20 → 21 件(プリセットで増えるのは 185H の 1 件だけ)
  assert.strictEqual(ids.length, 21); assert.ok(ids.includes('intel-mtl-185h'));
  assert.ok(['intel-ptl-x9-388h', 'intel-ptl-x9-386h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h', 'intel-ptl-u5-325', 'intel-wcl-c5-320'].every((id) => ids.includes(id)));
  assert.ok(['qc-780g', 'qc-6gen1', 'qc-4gen2', 'mt-8200'].every((id) => ids.includes(id)));
  assert.ok(!ids.includes('intel-rpl-14700hx') && ids.includes('intel-adl-12100'));
  assert.strictEqual(ev('intel-rpl-14700hx').st.inUCalSet, false); // 学習に使っていない(検証に使える)
  assert.strictEqual(ev('intel-arl-265k').st.inUCalSet, false);
  assert.strictEqual(ev('intel-adl-12900k').mt.inUCalSet, false);
  assert.strictEqual(ev('intel-adl-12900k').st.isCalibSample, false);
});

test('l3Ccds: design.setL3 → evaluate の経路。編集した合計が 1 CCD 分に効き、注記用の l3Ccds は ST に出る(MT には出ない)。L3 0 では null', () => {
  const base = E.evaluate(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5950x')), ctx);
  assert.strictEqual(base.st.l3Ccds, 2); assert.strictEqual(base.mt.l3Ccds, null);
  const big = E.evaluate(design.setL3(impD('amd-zen3-5950x'), 128).design, ctx);
  assert.strictEqual(big.st.l3Ccds, 2); assert.ok(big.st.score >= base.st.score);
  const zero = E.evaluate(design.setL3(impD('amd-zen3-5950x'), 0).design, ctx);
  assert.strictEqual(zero.st.noL3, true); assert.strictEqual(zero.st.l3Ccds, null);
});

// ---- MT 持続クロック係数(mtClockInfo)の注記(2026-11-01) ----
test('clockInfo.applied: 係数をすべてのコアに掛けたか(all / partial / none)。clockInfo.factor は帯の係数で、掛けなかったコア(boost 未取得で base)がある場合は partial', () => {
  const perfM = require('../js/sim/perf.js');
  assert.strictEqual(ev('amd-zen3-5800u').mt.clockInfo.applied, 'all');
  assert.strictEqual(ev('intel-adl-12900k').mt.clockInfo.applied, 'none'); // pc は係数 1.0
  const p = JSON.parse(JSON.stringify(D.presets.find((x) => x.id === 'intel-mtl-185h')));
  const e = p.cfg.cores.find((g) => g.type === 'E'); delete e.boostGHz; delete e.maxGHz; e.baseGHz = e.baseGHz || 1.5;
  const r = perfM.mtScore(p, ctx.cal, ctx.uarch, null);
  assert.ok(r.ok); assert.strictEqual(r.clockInfo.applied, 'partial');
  // 2026-11-09: 185H(115W)の係数は連続式 min(1, 0.429·115^0.15) ≈ 0.875(旧: 帯 1 の 0.81 → 指数 1/3 の連続式 0.928)
  // 2026-11-10: γ=0.30 に合わせて c=0.443(185H で ≈ 0.903)
  // 2026-11-13: PC 系 CPU の GB7 を Windows のみの中央値に差し替えたため、連続式の c を 0.443 → 0.411 に再校正した(標本 11 件の k_i ÷ W_i^0.15 の中央値 0.4115。p=0.15 は LOO 最小のまま)
  // 2026-11-13(Windows のみ化 第 2 回): c 0.411 → 0.406(Cougar Cove の uCal 追加後の再校正)
  // 2026-11-14: c 0.406 → 0.411(Redwood Cove の uCal 99.5 を追加したあとの再校正。標本 11 件の中央値 0.4114)
  const f185 = Math.min(1, 0.405 * Math.pow(115, 0.15));
  assert.ok(Math.abs(r.clockInfo.factor - f185) < 1e-12); // 電力に応じた係数(掛けなかったコアがあっても factor は式のまま)
  assert.ok(Math.abs(r.clockFactor - f185) < 1e-12 && r.detail.some((d) => d.clockFactor === 1 && d.clockSource === 'base'));
});

test('改良 B(編集後): MT の係数は元のチップの公表電力で決まり、コア数・クロックを編集しても帯は変わらない(clockInfo の band・powerW・factor が元と同じ)', () => {
  ['amd-zen3-5800u', 'intel-mtl-185h', 'amd-kraken-350'].forEach((id) => {
    const base = ev(id).mt.clockInfo;
    const u = design.unlock(design.fromPreset(D.presets.find((p) => p.id === id)));
    const t = u.cfg.cores[0].type;
    let d = design.setCoreCount(u, t, Math.max(1, u.cfg.cores[0].count - 1)).design;
    d = design.setClock(d, t, 4.0).design;
    const r = E.evaluate(d, ctx);
    assert.ok(r.edited && r.mt.ok, id);
    const c = r.mt.clockInfo;
    assert.strictEqual(c.band, base.band, id); assert.strictEqual(c.powerW, base.powerW, id);
    assert.strictEqual(c.factor, base.factor, id); assert.strictEqual(c.source, base.source, id);
    assert.strictEqual(c.fallback, false);
  });
});

// ---- 2026-11-13(レビュー対応): Arrow Lake のリング接続 E(uarch 記録「Skymont (Arrow Lake リング E)」。u = Lion Cove の u × 0.90)----
const ARL_RING_IDS = ['intel-arl-285k', 'intel-arl-265k', 'intel-arl-275hx', 'intel-arl-285h'];
const ARL_RING_E = 'Skymont (Arrow Lake リング E)';
test('旧保存データの移行: 旧名「Skymont」で保存した Arrow Lake 4 件のリング接続 E は、parse で cfg・baseCfg・blocks の 3 か所とも新名になり、評価は新規作成と同じ値。LP-E とほかのチップの Skymont は変えない', () => {
  ARL_RING_IDS.forEach((id) => {
    const fresh = design.fromPreset(D.presets.find((p) => p.id === id), { mode: 'improve' });
    const old = JSON.parse(design.serialize(fresh)); let n = 0;
    const back = (c) => { if (c.uarch === ARL_RING_E) { c.uarch = 'Skymont'; n++; } };
    old.cfg.cores.forEach(back); old.baseCfg.cores.forEach(back); old.dies.forEach((die) => die.blocks.forEach(back));
    assert.ok(n >= 3, id); assert.ok(!JSON.stringify(old).includes(ARL_RING_E), id);
    const r = design.parse(JSON.stringify(old)); assert.ok(r.ok, r.reason);
    assert.deepStrictEqual(r.design, JSON.parse(design.serialize(fresh)), id); // 3 か所とも新名に戻る(LP-E は Skymont のまま)
    const a = E.evaluate(r.design, ctx); const b = E.evaluate(fresh, ctx);
    assert.strictEqual(a.st.score, b.st.score, id); assert.strictEqual(a.mt.score, b.mt.score, id); assert.strictEqual(a.mt.errPct, b.mt.errPct, id);
    assert.deepStrictEqual(a.mt.corrSources, b.mt.corrSources, id); assert.ok(a.mt.corrSources.includes('ratio'), id);
    assert.strictEqual(a.edited, false, id); // 名前の移行は「編集」にならない
  });
  // 285H の LP-E(リングの外)は Skymont のまま
  const h = design.parse(design.serialize(design.fromPreset(D.presets.find((p) => p.id === 'intel-arl-285h')))).design;
  assert.strictEqual(h.cfg.cores.find((c) => c.type === 'LP-E').uarch, 'Skymont');
  assert.ok(h.dies.some((die) => die.blocks.some((b) => b.coreType === 'LP-E' && b.uarch === 'Skymont')));
  // 対象外のチップ(Lunar Lake の Skymont)は置き換えない
  const l = design.parse(design.serialize(design.fromPreset(D.presets.find((p) => p.id === 'intel-lnl-258v')))).design;
  assert.ok(l.cfg.cores.some((c) => c.uarch === 'Skymont')); assert.ok(!JSON.stringify(l).includes(ARL_RING_E));
});

test('MT の表示: corrSource ratio があるとき info「E の u は Lion Cove の u × 0.90 [推定・校正値]」が出る(Arrow Lake 4 件だけ)。inRatioSet は 285K・265K の MT だけ true(比を決めた SKU。275HX・285H は検証側)', () => {
  assert.ok(E.RATIO_INFO.startsWith('E の u は Lion Cove の u × 0.90 [推定・校正値](285K・265K の MT に合わせた値'));
  const withInfo = D.presets.filter((p) => ev(p.id).warnings.some((w) => w.level === 'info' && w.text === 'MT: ' + E.RATIO_INFO)).map((p) => p.id).sort();
  assert.deepStrictEqual(withInfo, ARL_RING_IDS.slice().sort());
  const inSet = D.presets.filter((p) => ev(p.id).mt.inRatioSet).map((p) => p.id).sort();
  assert.deepStrictEqual(inSet, ['intel-arl-265k', 'intel-arl-285k']);
  D.presets.forEach((p) => assert.strictEqual(ev(p.id).st.inRatioSet, false, p.id)); // ST には付けない
  // レビュー対応の時点(b2a8a08 の値)は 285K +0.14%・265K -4.15%・275HX +4.77%・285H +8.46%。2026-11-13(Windows のみ化 第 2 回): σ 0.03306 → 0.03183・x86 ISA 平均 u・c 0.411 → 0.406 の再校正で動いた(比 0.90 は不変。4 件とも ok のまま)
  const want = { 'intel-arl-285k': 1.21, 'intel-arl-265k': -3.34, 'intel-arl-275hx': 4.58, 'intel-arl-285h': 7.82 }; /* 2026-11-15(プラットフォームの DRAM 遅延 dramLat を ST に入れた。u・uCal・σ が動き、c 0.405): 285K 0.00 → +1.21、265K -4.44 → -3.34、275HX +4.84 → +4.58、285H +8.29 → +7.82(4 件とも ok のまま) */ /* 2026-11-15(265K の P の boost を 5.5GHz に。Lion Cove の u 102.13 → 100.36、x86 ISA 平均 u 109.77 → 109.39、c 0.411 → 0.412): 285K +1.77 → 0.00、265K -2.76 → -4.44、275HX +6.47 → +4.84、285H +9.86 → +8.29(4 件とも ok のまま) */ // 2026-11-14(Redwood Cove の uCal 99.5 を追加、c 0.406 → 0.411 に再校正): mobile-pc の 275HX +5.38 → +6.47、285H +8.72 → +9.86(ok のまま。285H は許容の縁)。pc の 285K・265K は不変
  ARL_RING_IDS.forEach((id) => assert.strictEqual(Math.round(ev(id).mt.errPct * 100) / 100, want[id], id));
  // 編集後は公開値が無いので印を外す
  const p = D.presets.find((x) => x.id === 'intel-arl-285k'); const u = design.fromPreset(p, { mode: 'improve' });
  const r = design.setCoreCount(u, 'E', 8); assert.ok(r.ok, r.reason);
  const e2 = E.evaluate(r.design, ctx); assert.strictEqual(e2.edited, true); assert.strictEqual(e2.mt.inRatioSet, false);
  // 再現の表・比較の表にも出る。265K は「σ の合わせには使っていない」と併記(どちらも真)
  const RP = require('../js/ui/reproduce.js'); const CF = require('../js/ui/compareform.js');
  const mtRow = (id) => RP.reproductionRows(ev(id)).find((x) => /マルチ性能/.test(x.label));
  assert.match(mtRow('intel-arl-285k').note, /学習内の誤差\(検証ではない\)/);
  assert.match(mtRow('intel-arl-265k').note, /学習内の誤差\(検証ではない\)/); assert.match(mtRow('intel-arl-265k').note, /σ の合わせには使っていない/);
  assert.doesNotMatch(mtRow('intel-arl-275hx').note, /学習内/);
  const cell = (id) => { const pp = D.presets.find((x) => x.id === id); return CF.cellOf('mt', design.fromPreset(pp), ev(id)); };
  assert.ok(cell('intel-arl-285k').sub.includes(E.RATIO_INFO)); assert.ok(cell('intel-arl-285k').sub.some((t) => /学習内の誤差\(検証ではない\)/.test(t)));
  assert.ok(cell('intel-arl-275hx').sub.includes(E.RATIO_INFO)); assert.ok(!cell('intel-arl-275hx').sub.some((t) => /学習内/.test(t)));
  assert.ok(!cell('intel-adl-12900k').sub.includes(E.RATIO_INFO));
});
// 2026-11-14(5800U の ST 修正 案 A): Cezanne(5800U)の uarch 名を「Zen 3」→「Zen 3 (Cezanne)」に分けた。旧保存データの移行と、ratio の注記(ST・MT とも info)
test('旧保存データの移行: 旧名「Zen 3」で保存した 5800U は、parse で cfg・baseCfg・blocks の 3 か所とも「Zen 3 (Cezanne)」になり、評価は新規作成と同じ値。Vermeer(5800X)の Zen 3 は変えない', () => {
  const CZ = 'Zen 3 (Cezanne)';
  const fresh = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5800u'), { mode: 'improve' });
  const old = JSON.parse(design.serialize(fresh)); let n = 0;
  const back = (c) => { if (c.uarch === CZ) { c.uarch = 'Zen 3'; n++; } };
  old.cfg.cores.forEach(back); old.baseCfg.cores.forEach(back); old.dies.forEach((die) => die.blocks.forEach(back));
  assert.ok(n >= 3); assert.ok(!JSON.stringify(old).includes(CZ));
  const r = design.parse(JSON.stringify(old)); assert.ok(r.ok, r.reason);
  assert.deepStrictEqual(r.design, JSON.parse(design.serialize(fresh)));
  const a = E.evaluate(r.design, ctx); const b = E.evaluate(fresh, ctx);
  assert.strictEqual(a.st.score, b.st.score); assert.strictEqual(a.mt.score, b.mt.score); assert.strictEqual(a.st.corrSource, 'ratio'); assert.strictEqual(a.edited, false);
  const v = design.parse(design.serialize(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5800x')))).design;
  assert.ok(v.cfg.cores.every((c) => c.uarch === 'Zen 3')); assert.ok(!JSON.stringify(v).includes(CZ));
});

test('ratio の注記: 5800U は ST・MT とも info「Cezanne の u は Zen 3 の u × 0.95 [推定・校正値]」(Arrow Lake の注記とは別)。Vermeer・7735HS には出ない。inRatioSet は 5800U では false(比は別 SKU の参考データで決めた)', () => {
  assert.ok(E.RATIO_INFO_CEZANNE.startsWith('Cezanne の u は Zen 3 の u × 0.95 [推定・校正値]'));
  assert.strictEqual(E.ratioInfo('Zen 3'), E.RATIO_INFO_CEZANNE); assert.strictEqual(E.ratioInfo('Lion Cove'), E.RATIO_INFO);
  const w = ev('amd-zen3-5800u').warnings;
  assert.ok(w.some((x) => x.level === 'info' && x.text === 'MT: ' + E.RATIO_INFO_CEZANNE)); assert.ok(w.some((x) => x.level === 'info' && x.text === 'ST: ' + E.RATIO_INFO_CEZANNE));
  assert.ok(!w.some((x) => x.text === 'MT: ' + E.RATIO_INFO));
  ['amd-zen3-5800x', 'amd-zen3-5600x', 'amd-zen3-5950x', 'amd-zen3p-7735hs'].forEach((id) => assert.ok(!ev(id).warnings.some((x) => x.text.includes(E.RATIO_INFO_CEZANNE)), id));
  const r = ev('amd-zen3-5800u'); assert.strictEqual(r.mt.inRatioSet, false); assert.strictEqual(r.st.inRatioSet, false); assert.strictEqual(r.st.corrUFrom, 'Zen 3');
  assert.deepStrictEqual(E.ratioFroms(r.mt), ['Zen 3']);
  assert.ok(Math.abs(r.st.errPct - 14.44) < 0.05 && Math.abs(r.mt.errPct - 14.12) < 0.05) /* 2026-11-15(プラットフォームの DRAM 遅延 dramLat を ST に入れた。u・uCal・σ が動き、c 0.405): 5800U の ST +14.26 → +14.44%、MT +15.90 → +14.12% */ /* 2026-11-15: MT +15.68 → +15.90(c 0.411 → 0.412) */; // ng のまま(母集団の差。設計書 §5.3.0【2026-11-14 Cezanne】)
});

// 2026-11-15(ユーザー指示「スコアと動作クロックから IPC を取得して直して」): Zen 3+(7735HS)の uarch 名を「Zen 3」→「Zen 3+ (Rembrandt-R)」に分けた。旧保存データの移行(Cezanne と同じ方式)と ratio の注記
test('旧保存データの移行: 旧名「Zen 3」で保存した 7735HS は、parse で cfg・baseCfg・blocks の 3 か所とも「Zen 3+ (Rembrandt-R)」になり、評価は新規作成と同じ値。Vermeer(5800X)・5800U は変えない', () => {
  const ZP = 'Zen 3+ (Rembrandt-R)';
  const fresh = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3p-7735hs'), { mode: 'improve' });
  const old = JSON.parse(design.serialize(fresh)); let n = 0;
  const back = (c) => { if (c.uarch === ZP) { c.uarch = 'Zen 3'; n++; } };
  old.cfg.cores.forEach(back); old.baseCfg.cores.forEach(back); old.dies.forEach((die) => die.blocks.forEach(back));
  assert.ok(n >= 3); assert.ok(!JSON.stringify(old).includes(ZP));
  const r = design.parse(JSON.stringify(old)); assert.ok(r.ok, r.reason);
  assert.deepStrictEqual(r.design, JSON.parse(design.serialize(fresh)));
  const a = E.evaluate(r.design, ctx); const b = E.evaluate(fresh, ctx);
  assert.strictEqual(a.st.score, b.st.score); assert.strictEqual(a.mt.score, b.mt.score); assert.strictEqual(a.st.corrSource, 'ratio'); assert.strictEqual(a.edited, false);
  const v = design.parse(design.serialize(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5800x')))).design;
  assert.ok(v.cfg.cores.every((c) => c.uarch === 'Zen 3')); assert.ok(!JSON.stringify(v).includes(ZP));
  const u = design.parse(design.serialize(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5800u')))).design;
  assert.ok(u.cfg.cores.every((c) => c.uarch === 'Zen 3 (Cezanne)')); assert.ok(!JSON.stringify(u).includes(ZP));
});

test('ratio の注記: 7735HS は ST・MT とも info「Zen 3+ の u は Zen 3 の u × 0.95 [推定・校正値]」(Cezanne の注記とは別。借り先は同じ Zen 3 でも corrUarch で分ける)。5800U・Vermeer には出ない', () => {
  assert.ok(E.RATIO_INFO_ZEN3P.startsWith('Zen 3+ の u は Zen 3 の u × 0.95 [推定・校正値]'));
  assert.strictEqual(E.ratioInfo('Zen 3', 'Zen 3+ (Rembrandt-R)'), E.RATIO_INFO_ZEN3P); assert.strictEqual(E.ratioInfo('Zen 3', 'Zen 3 (Cezanne)'), E.RATIO_INFO_CEZANNE);
  const w = ev('amd-zen3p-7735hs').warnings;
  assert.ok(w.some((x) => x.level === 'info' && x.text === 'MT: ' + E.RATIO_INFO_ZEN3P)); assert.ok(w.some((x) => x.level === 'info' && x.text === 'ST: ' + E.RATIO_INFO_ZEN3P));
  assert.ok(!w.some((x) => x.text.includes(E.RATIO_INFO_CEZANNE)));
  ['amd-zen3-5800u', 'amd-zen3-5800x', 'amd-zen3-5600x', 'amd-zen3-5950x'].forEach((id) => assert.ok(!ev(id).warnings.some((x) => x.text.includes(E.RATIO_INFO_ZEN3P)), id));
  const r = ev('amd-zen3p-7735hs'); assert.strictEqual(r.mt.inRatioSet, false); assert.strictEqual(r.st.inRatioSet, false); assert.strictEqual(r.st.corrUFrom, 'Zen 3'); assert.strictEqual(r.st.corrUarch, 'Zen 3+ (Rembrandt-R)');
  assert.deepStrictEqual(E.ratioFroms(r.mt), ['Zen 3']); assert.deepStrictEqual(E.ratioInfosOf(r.mt), [E.RATIO_INFO_ZEN3P]);
  // ST +5.05%・MT +2.68%(旧 +10.58%・+8.08%。ng → ok)。公開値は 7735HS の Windows のみ n=200 の中央値(ST 1832 / MT 8341)
  assert.ok(Math.abs(r.st.errPct - 5.05) < 0.05 && Math.abs(r.mt.errPct - 2.68) < 0.05); assert.ok(Math.abs(r.st.errPct) <= 10 && Math.abs(r.mt.errPct) <= 10);
});
