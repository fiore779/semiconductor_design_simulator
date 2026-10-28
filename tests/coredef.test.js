'use strict';
// M5 モード D のモデル層(設計書 §3.7。RD2〜RD10, RD12)。coredef / perf(uRecord) / design(coreDefs) / evaluate / compat。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D, sim } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'blocklib.js'));
const design = require('../js/model/design.js');
const BL = require('../js/model/blocklib.js');
const C = require('../js/model/compat.js');
const E = require('../js/model/evaluate.js');
const CD = require('../js/model/coredef.js');

const parts = BL.build(D.presets, D.blocklibAreas, D.nodes);
const ctx = E.makeContext();
const P = (id) => BL.get(parts, id);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m || ''} ${a} != ${b}`);
const cl = (id, o) => { const r = CD.clone(P(id), D.uarch, D.blocklibAreas, o); assert.ok(r.ok, r.reason); return r.def; };
const ap = (def, patch) => { const r = CD.applyParams(def, patch); assert.ok(r.ok, r.reason); return r.def; };
const mk = (nodeId, w, h) => design.fromScratch({ name: 't', widthMm: w || 40, heightMm: h || 40, nodeId: nodeId || 'gf-14' });
const ZEN1 = 'core:amd-zen1-1800x:P';
const X4 = 'core:mt-9400:M';   // Cortex-X4 相当の行(uarch.js の l2KB が null)

// ---- RD8: 未編集の複製は基準コアと完全に同じ結果 ----
test('RD8: 全コア部品で、未編集の複製の ST・MT・面積が基準コアと完全一致(確度は low)', () => {
  let n = 0; let skipped = 0;
  parts.filter((p) => p.kind === 'core').forEach((p) => {
    const r = CD.clone(p, D.uarch, D.blocklibAreas);
    if (!r.ok) { skipped++; return; } // uarch 未取得のコアは複製できない(補正の借り先がない)
    n++;
    ['gf-14', 'tsmc-n4', p.nodeId].forEach((node) => {
      if (!node) return;
      const base = design.addPart(mk(node), p);
      const cust = design.addCoreDef(mk(node), r.def);
      assert.ok(base.ok && cust.ok, `${p.id} ${node}: ${base.reason || cust.reason}`);
      const eb = E.evaluate(base.design, ctx); const ec = E.evaluate(cust.design, ctx);
      assert.strictEqual(ec.st.ok, eb.st.ok, p.id);
      assert.strictEqual(ec.st.score, eb.st.score, `${p.id} ST`);
      assert.strictEqual(ec.mt.ok, eb.mt.ok, p.id);
      assert.strictEqual(ec.mt.score, eb.mt.score, `${p.id} MT`);
      if (ec.st.ok) assert.strictEqual(ec.st.confidence, 'low');
      if (ec.mt.ok) assert.strictEqual(ec.mt.confidence, 'low');
      assert.strictEqual(cust.design.dies[0].blocks[0].areaMm2, base.design.dies[0].blocks[0].areaMm2, `${p.id} ${node} 面積`);
    });
    // 単独評価も同じ(基準比 0%)
    const ev = CD.evaluate(r.def, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes });
    if (ev.st.ok) { assert.strictEqual(ev.st.score, ev.st.baseScore); assert.strictEqual(ev.st.deltaPct, 0); assert.strictEqual(ev.edited, false); }
  });
  assert.ok(n > 100 && skipped > 0, `n=${n} skipped=${skipped}`);
});

test('RD8: 面積が表の基準は placeAreaMm2 と同じ値の幅 0 の範囲', () => {
  ['core:intel-adl-12900k:P', ZEN1, 'core:qc-8elite:P', 'core:qc-8elite:E', 'core:mt-9400:P', X4].forEach((id) => {
    const a = CD.deriveArea(cl(id), { toNodeId: P(id).nodeId, nodes: D.nodes });
    assert.strictEqual(a.derived, false, id); assert.strictEqual(a.origin, 'table');   // 未編集は表の区分のまま・導出ではない
    assert.ok(!a.notes.includes(CD.NOTE_ASSUMPTION));
    assert.strictEqual(a.placeMm2, BL.placeAreaMm2(P(id)), id);
    assert.deepStrictEqual(a.rangeMm2, [a.placeMm2, a.placeMm2]);
  });
});

// ---- RD2・RD3: 作成と編集の制約 ----
test('RD2: 基準なし・コア以外・uarch 未取得は作れない', () => {
  assert.strictEqual(CD.clone(null, D.uarch, []).ok, false);
  assert.strictEqual(CD.clone({ kind: 'l3', id: 'l3:x' }, D.uarch, []).ok, false);
  assert.strictEqual(CD.clone(P('core:apple-m4:P'), D.uarch, []).ok, false);
  assert.strictEqual(CD.clone(Object.assign({}, P(ZEN1), { uarch: 'なし' }), D.uarch, []).ok, false);
  assert.strictEqual(CD.clone(Object.assign({}, P(ZEN1), { isa: null }), D.uarch, []).ok, false);
});

test('RD3: ISA・継承項目は変えられない / 範囲 / 整数 / 基準が null の項目は拒否', () => {
  const d = cl(ZEN1);
  assert.deepStrictEqual(d.params, { width: 6, rob: 192, l2KB: 512, clockGHz: 4, smt: 2 });
  assert.strictEqual(d.base.isa, 'x86');
  const bad = (p) => CD.applyParams(d, p);
  assert.strictEqual(bad({ isa: 'arm' }).ok, false);
  assert.ok(bad({ isa: 'arm' }).reason.includes('命令セット'));
  ['l1dKB', 'l2Lat', 'brPenalty', 'mshr', 'vecBits', 'base', 'name'].forEach((k) => assert.strictEqual(bad({ [k]: 1 }).ok, false, k));
  [{ width: 1 }, { width: 17 }, { width: 6.5 }, { width: NaN }, { rob: 31 }, { rob: 1025 }, { l2KB: 63 }, { l2KB: 16385 }, { clockGHz: 0.4 }, { clockGHz: 8.1 }, { clockGHz: '3' }, { smt: 3 }, { smt: 0 }, { width: null }].forEach((p) => assert.strictEqual(bad(p).ok, false, JSON.stringify(p)));
  [{ width: 2 }, { width: 16 }, { rob: 32 }, { rob: 1024 }, { l2KB: 64 }, { l2KB: 16384 }, { clockGHz: 0.5 }, { clockGHz: 8 }, { smt: 1 }].forEach((p) => assert.strictEqual(bad(p).ok, true, JSON.stringify(p)));
  // 元は壊さない
  assert.strictEqual(d.params.width, 6);
  // 基準が null の項目(Gracemont 相当: 幅未取得)は入力不可
  const g = { id: 'core:x', kind: 'core', uarch: 'Gracemont', isa: 'x86', coreType: 'E', defaultClockGHz: 3.7, smt: 1, area: { origin: 'table', mm2: 1, withL2Mm2: 2, l2KB: 512, s: 'sec' } };
  const gd = CD.clone(g, D.uarch, []).def;
  assert.strictEqual(gd.params.width, null);
  const w = CD.applyParams(gd, { width: 4 }); assert.strictEqual(w.ok, false); assert.ok(w.reason.includes('未取得'));
  assert.strictEqual(CD.applyParams(gd, { rob: 300 }).ok, true);
  // 名前変更
  assert.strictEqual(CD.rename(d, '').ok, false); assert.strictEqual(CD.rename(d, 'abc').def.name, 'abc');
  assert.strictEqual(CD.nextId([{ id: 'cd1' }, { id: 'cd7' }]), 'cd8');
});

test('RD5: 基準の面積が推定・未取得・L2 込みのみなら導出せず、幅・ROB・L2 の編集を拒否(クロック・SMT は可)', () => {
  const zen4 = cl('core:amd-zen4-7700:P');      // L2 込みのみ
  const est = cl('core:amd-zen5-9700x:P');       // estimated
  const unk = CD.clone(Object.assign({}, P(ZEN1), { area: { origin: 'unknown', mm2: null, withL2Mm2: null, l2KB: null, s: null } }), D.uarch, []).def;
  [zen4, est, unk].forEach((d) => {
    assert.strictEqual(CD.areaDerivable(d).ok, false);
    ['width', 'rob', 'l2KB'].forEach((k) => assert.strictEqual(CD.applyParams(d, { [k]: 8 }).ok, false, `${d.base.uarch} ${k}`));
    assert.strictEqual(CD.applyParams(d, { clockGHz: 4 }).ok, true); assert.strictEqual(CD.applyParams(d, { smt: 1 }).ok, true);
    const a = CD.deriveArea(d, {});
    assert.strictEqual(a.derived, false); assert.notStrictEqual(a.origin, 'derived');
  });
  const za = CD.deriveArea(zen4, {}); assert.strictEqual(za.placeMm2, 3.84); assert.strictEqual(za.origin, 'table');
  assert.strictEqual(CD.deriveArea(est, {}).origin, 'estimated');
  assert.strictEqual(CD.deriveArea(unk, {}).placeMm2, null);
});

// ---- RD5: 面積の式 ----
test('RD5: 面積の範囲(Zen 1: L0=5.5, L2=1.5)', () => {
  const d = cl(ZEN1); const ar = (x) => CD.deriveArea(x, { toNodeId: 'gf-14', nodes: D.nodes });
  // L2 を 2 倍
  let a = ar(ap(d, { l2KB: 1024 }));
  near(a.l2Mm2[1], 3); near(a.l2Mm2[0], 3 * 0.88); near(a.logicMm2[0], 5.5); near(a.logicMm2[1], 5.5);
  near(a.rangeMm2[0], 5.5 + 3 * 0.88); near(a.placeMm2, 8.5);
  // L2 を 0.5 倍
  a = ar(ap(d, { l2KB: 256 }));
  near(a.l2Mm2[0], 0.75); near(a.l2Mm2[1], 0.75 / 0.88); near(a.placeMm2, 5.5 + 0.75 / 0.88);
  // L2 を 4 倍(s=2)
  a = ar(ap(d, { l2KB: 2048 })); near(a.l2Mm2[0], 6 * 0.88 * 0.88); near(a.l2Mm2[1], 6);
  // ROB ×1.2(= 230.4 → 整数 230)・幅 +1 は別々に
  a = ar(ap(d, { rob: 230 })); const rr = 230 / 192;
  near(a.logicMm2[0], 5.5); near(a.logicMm2[1], 5.5 * rr); near(a.placeMm2, 5.5 * rr + 1.5);
  a = ar(ap(d, { width: 7 })); near(a.logicMm2[1], 5.5 * (7 / 6) * (7 / 6)); near(a.logicMm2[0], 5.5);
  // 縮小: 下限が縮み、上限は据え置き
  a = ar(ap(d, { width: 5, rob: 160 }));
  near(a.logicMm2[0], 5.5 * (5 / 6) * (5 / 6) * (160 / 192)); near(a.logicMm2[1], 5.5);
  // 常に 0 < 下限 ≤ 上限
  [{ width: 2, rob: 32, l2KB: 64 }, { width: 16, rob: 1024, l2KB: 16384 }, { width: 8 }].forEach((p) => {
    const x = ar(ap(d, p)); assert.ok(x.rangeMm2[0] > 0 && x.rangeMm2[0] <= x.rangeMm2[1], JSON.stringify(p));
  });
  // 注記: 仮定である旨
  assert.ok(a.notes.some((t) => t.includes('仮定') && t.includes('導けない')));
  assert.ok(a.notes.some((t) => t.includes('SMT')));
  // クロック・SMT で面積は変わらない
  near(ar(ap(d, { clockGHz: 4, smt: 1 })).placeMm2, 7);
});

test('RD5: ノード違いは ratioRange を掛ける(移植)', () => {
  const d = ap(cl(ZEN1), { l2KB: 1024 });
  const a0 = CD.deriveArea(d, { toNodeId: 'gf-14', nodes: D.nodes }); const a = CD.deriveArea(d, { toNodeId: 'tsmc-n4', nodes: D.nodes });
  const pr = C.portArea(1, 'gf-14', 'tsmc-n4', D.nodes);
  assert.strictEqual(a.ported, true); assert.strictEqual(a.portConverted, true);
  near(a.placeMm2, a0.placeMm2 * pr.ratio); near(a.rangeMm2[0], a0.rangeMm2[0] * pr.ratioRange[0]); near(a.rangeMm2[1], a.placeMm2);
  assert.ok(a.portNote.includes('L2'));
  // 設計に置くと、ブロックに範囲と区分 derived が入る
  const r = design.addCoreDef(mk('tsmc-n4'), d); assert.ok(r.ok, r.reason);
  const b = r.design.dies[0].blocks[0];
  assert.strictEqual(b.areaOrigin, 'derived'); near(b.areaMm2, a.placeMm2); near(b.areaRangeMm2[0], a.rangeMm2[0]); near(b.areaRangeMm2[1], a.rangeMm2[1]);
  assert.strictEqual(b.ported, true); assert.strictEqual(b.portConverted, true);
});

// ---- RD4 / T2: 性能 ----
test('RD4: IPC は coreCpi の手計算と一致 / ILP 上限域では幅を上げても IPC が変わらない / L2 でメモリ項は単調減少', () => {
  const d = cl(ZEN1); const e = (x) => CD.evaluate(x, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes });
  const hand = (over) => sim.perf.coreCpi(Object.assign({}, D.uarch['Zen 1'], over), { fGHz: 4, l3KBPerThread: null, noL3: false, params: ctx.cal.params });
  near(e(d).st.ipc, hand({}).ipc);
  near(e(ap(d, { width: 7 })).st.ipc, hand({ width: 7 }).ipc);
  near(e(ap(d, { rob: 240 })).st.ipc, hand({ rob: 240 }).ipc);
  near(e(ap(d, { l2KB: 1024 })).st.ipc, hand({ l2KB: 1024 }).ipc);
  near(e(ap(d, { rob: 240 })).st.score, e(ap(d, { rob: 240 })).st.corr * hand({ rob: 240 }).ipc * 4);
  // 補正 u は基準 uarch のもの / 確度 low / corrSource clone
  const r = e(ap(d, { rob: 240 })).st;
  assert.strictEqual(r.corr, ctx.cal.u['Zen 1']); assert.strictEqual(r.corrSource, 'clone'); assert.strictEqual(r.corrFrom, 'uarch'); assert.strictEqual(r.confidence, 'low');
  // ILP 上限 < 幅: ROB=32 → ilp=0.55*sqrt(32)=3.1 < 幅。幅 6 → 8 でも IPC は同じ
  const small = ap(d, { rob: 32 });
  assert.strictEqual(e(ap(small, { width: 8 })).st.ipc, e(small).st.ipc);
  assert.ok(e(small).warnings.some((w) => w.code === 'ilp-limit' && w.level === 'warn'));
  // L2 を増やすとメモリ項が単調に減る
  const mem = (kb) => e(ap(d, { l2KB: kb })).st.parts.mem;
  assert.ok(mem(256) > mem(512) && mem(512) > mem(1024) && mem(1024) > mem(2048));
  assert.ok(e(ap(d, { l2KB: 1024 })).warnings.some((w) => w.code === 'l2-latency' && w.level === 'info'));
});

test('T2: perf.stScore/mtScore は uRecord なしなら従来の経路(corrSource uarch、uRecord ありは clone・low)', () => {
  const p = D.presets.find((x) => x.id === 'amd-zen1-1800x');
  const a = sim.perf.stScore(p, ctx.cal, D.uarch, undefined);
  assert.strictEqual(a.corrSource, 'uarch'); assert.strictEqual(a.clone, undefined);
  const core = Object.assign({}, p.cfg.cores[0], { uRecord: D.uarch['Zen 1'] });
  const b = sim.perf.stScore(p, ctx.cal, D.uarch, { core });
  assert.strictEqual(b.score, a.score); assert.strictEqual(b.corrSource, 'clone'); assert.strictEqual(b.confidence, 'low');
  const m = sim.perf.mtScore(Object.assign({}, p, { cfg: Object.assign({}, p.cfg, { cores: [core] }) }), ctx.cal, D.uarch, null);
  assert.strictEqual(m.detail[0].corrSource, 'clone'); assert.strictEqual(m.confidence, 'low');
});

test('RD4: uarch.js の l2KB が null の基準は未編集のあいだ null のまま(参照値で計算)、入力すると値が入る', () => {
  const d = cl(X4);
  assert.strictEqual(D.uarch[d.base.uarch].l2KB, null);
  assert.strictEqual(d.params.l2KB, null); assert.strictEqual(CD.uRecordOf(d).l2KB, null);
  assert.strictEqual(CD.l2Display(d).value, 1024); assert.strictEqual(CD.l2Display(d).usingReference, true);
  assert.ok(CD.l2Display(d).note.includes('512'));
  const e = ap(d, { l2KB: 1024 });
  assert.strictEqual(CD.uRecordOf(e).l2KB, 1024); assert.strictEqual(CD.isEdited(e), true); assert.strictEqual(CD.isEdited(d), false);
  // 面積の基準は表の l2KB(1024): 同じ値なら比 1
  near(CD.areaRatios(e).l2, 1);
  // 性能が実際に使う基準は参照値 512KB(uRecord.l2KB が null): 比は 2、警告が出る
  near(CD.ratios(e).l2, 2);
  const w = CD.evaluate(e, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes }).warnings;
  assert.ok(w.some((x) => x.code === 'l2-ref-base' && x.level === 'info' && x.text.includes('参照値 512KB') && x.text.includes('512→1024')));
  assert.ok(!CD.evaluate(d, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes }).warnings.some((x) => x.code === 'l2-ref-base'));
  // 校正範囲(0.5〜2 倍)は 512 基準: 1024 は 2 倍ちょうどで範囲内、1025 は外、256 は 0.5 倍で範囲内
  const f = (x) => CD.outOfCalibration(x, { presets: ctx.presets }).map((o) => o.field);
  assert.deepStrictEqual(f(e), []); assert.deepStrictEqual(f(ap(d, { l2KB: 1025 })), ['coredef:cd1:l2KB']); assert.deepStrictEqual(f(ap(d, { l2KB: 256 })), []);
  assert.strictEqual(CD.optimisticInfo(e).optimistic, true);
});

// ---- RD6: 校正範囲外 ----
test('RD6: 境界(0.67・1.5・0.5・2・±25%・最大クロック)と組み合わせ、上振れ側', () => {
  const d = cl(ZEN1); const f = (x) => CD.outOfCalibration(x, { presets: ctx.presets }).map((o) => o.field);
  assert.deepStrictEqual(f(d), []);
  assert.deepStrictEqual(f(ap(d, { width: 9 })), []);                 // 1.5 倍ちょうど
  assert.deepStrictEqual(f(ap(d, { width: 10 })), ['coredef:cd1:width']);
  const gc = ap(cl('core:intel-adl-12900k:P'), { rob: 344 });           // 512 * 0.67 = 343.04 なので 344 は範囲内
  assert.deepStrictEqual(f(gc), []);
  assert.deepStrictEqual(f(ap(cl('core:intel-adl-12900k:P'), { rob: 343 })), ['coredef:cd1:rob']);
  assert.deepStrictEqual(f(ap(cl('core:intel-adl-12900k:P'), { rob: 768 })), []);     // 1.5 倍ちょうど
  assert.deepStrictEqual(f(ap(cl('core:intel-adl-12900k:P'), { rob: 769 })), ['coredef:cd1:rob']);
  assert.deepStrictEqual(f(ap(d, { l2KB: 1024 })), []);               // 2 倍ちょうど
  assert.deepStrictEqual(f(ap(d, { l2KB: 256 })), []);                // 0.5 倍ちょうど
  assert.deepStrictEqual(f(ap(d, { l2KB: 1025 })), ['coredef:cd1:l2KB']);
  assert.deepStrictEqual(f(ap(d, { l2KB: 255 })), ['coredef:cd1:l2KB']);
  // クロック ±25%(基準 4.0): 3.0 / 5.0 が境界。最大クロックの 1.05 倍は別に
  assert.deepStrictEqual(f(ap(d, { clockGHz: 3.0 })), []);
  assert.deepStrictEqual(f(ap(d, { clockGHz: 2.99 })), ['coredef:cd1:clock']);
  const maxC = { maxClockGHz: 4.0 };
  assert.deepStrictEqual(CD.outOfCalibration(ap(d, { clockGHz: 4.2 }), maxC), []);                       // 4.0*1.05 = 4.2 ちょうど
  assert.deepStrictEqual(CD.outOfCalibration(ap(d, { clockGHz: 4.21 }), maxC).map((o) => o.field), ['coredef:cd1:clock']);
  // 2 項目以上は範囲外(個別は範囲内でも)
  assert.deepStrictEqual(f(ap(d, { width: 7, rob: 200 })), ['coredef:cd1:combo']);
  assert.deepStrictEqual(f(ap(d, { width: 7, rob: 200, l2KB: 600 })), ['coredef:cd1:combo']);
  assert.deepStrictEqual(f(ap(d, { width: 7, clockGHz: 4 })), []);   // クロックは組み合わせに数えない
  // 基準クロック未取得に入力すると範囲外
  const nc = CD.clone(Object.assign({}, P(ZEN1), { defaultClockGHz: null }), D.uarch, []).def;
  assert.deepStrictEqual(f(nc), []); assert.deepStrictEqual(f(ap(nc, { clockGHz: 3 })), ['coredef:cd1:clock']);
  // 上振れ側: 増やしたときだけ
  assert.strictEqual(CD.optimisticInfo(d).optimistic, false);
  assert.strictEqual(CD.optimisticInfo(ap(d, { width: 5 })).optimistic, false);
  assert.strictEqual(CD.optimisticInfo(ap(d, { clockGHz: 3.5, l2KB: 256, rob: 160, smt: 1 })).optimistic, false);
  ['width', 'rob', 'l2KB', 'clockGHz'].forEach((k) => { const v = { width: 7, rob: 200, l2KB: 600, clockGHz: 4.1 }[k]; const o = CD.optimisticInfo(ap(d, { [k]: v })); assert.ok(o.optimistic && o.reasons[0].includes('遅延悪化・電力・熱の制限を計算していない'), k); });
});

test('RD6: Zen 1 の ROB 129(0.672 倍)は範囲内、128(0.667 倍)は範囲外 / 幅 5 は範囲内、4 は範囲外', () => {
  const d = cl(ZEN1); const f = (x) => CD.outOfCalibration(x, { presets: ctx.presets }).map((o) => o.field);
  assert.deepStrictEqual(f(ap(d, { rob: 129 })), []);
  assert.deepStrictEqual(f(ap(d, { rob: 128 })), ['coredef:cd1:rob']);
  assert.deepStrictEqual(f(ap(d, { width: 4 })), ['coredef:cd1:width']);   // 4/6 = 0.6667 < 0.67
  assert.deepStrictEqual(f(ap(d, { width: 5 })), []);
});

// ---- RD9: 評価 ----
test('RD9: 単独評価は電力・温度・最大クロックを出さず、確度は low', () => {
  const ev = CD.evaluate(ap(cl(ZEN1), { rob: 240, clockGHz: 4 }), { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes });
  assert.strictEqual(ev.confidence, 'low'); assert.strictEqual(ev.st.confidence, 'low');
  assert.strictEqual(ev.power, null); assert.strictEqual(ev.thermal, null); assert.strictEqual(ev.maxClockGHz, null);
  assert.ok(ev.notes.some((t) => t.includes('電力・温度・最大クロックは出していません')));
  assert.ok(ev.st.deltaPct > 0);
  assert.strictEqual(ev.edited, true);
});

test('RD9: 混合評価の注意帯 1〜5・chosen.custom・区分 derived・範囲外の警告', () => {
  let d = mk('gf-14');
  d = design.addCoreDef(d, ap(cl(ZEN1), { rob: 240, width: 7 }), { count: 2 }).design;
  const ev = E.evaluate(d, ctx);
  const t = ev.warnings.map((w) => w.text);
  assert.ok(t.some((x) => x.includes('混合設計の性能は確度:低です')));
  assert.ok(t.some((x) => x.includes('自作コアの性能は基準コア(Zen 1)の補正を借りた推定です') && x.includes('効果は検証できていません')));
  assert.ok(t.some((x) => x.includes('自作コアの面積は範囲です') && x.includes('導けません')));
  assert.ok(t.some((x) => x.includes('校正した範囲の外') && x.includes('2 項目以上')));
  assert.ok(t.some((x) => x.includes('上振れ側')));
  assert.ok(t.some((x) => x === '電力・温度・最大クロックは出していません'));
  assert.ok(ev.outOfCalibration.some((o) => o.field === 'coredef:cd1:combo')); assert.strictEqual(ev.optimistic, true);
  assert.strictEqual(ev.st.chosen.custom, true); assert.strictEqual(ev.st.chosen.coreDefName, 'Zen 1 改'); assert.strictEqual(ev.st.chosen.baseUarch, 'Zen 1');
  assert.strictEqual(ev.st.confidence, 'low'); assert.strictEqual(ev.mt.confidence, 'low');
  const blk = ev.area.mix.blocks[0]; assert.strictEqual(blk.class, 'derived'); assert.ok(Array.isArray(blk.areaRangeMm2));
  assert.ok(ev.area.mix.usedMinMm2 < ev.area.mix.usedMm2);
  assert.ok(ev.powerModel.ok === false && ev.thermal.ok === false);
  // 使用率: 大きい側と小さい側を併記
  const u = ev.compat.find((c) => c.code === 'utilization');
  assert.ok(u.valueMin < u.value && u.text.includes('小さい側'));
  // 自作コアなしの混合は注意帯を足さない(従来どおり)
  const plain = E.evaluate(design.addPart(mk('gf-14'), P(ZEN1)).design, ctx);
  assert.ok(!plain.warnings.some((w) => w.text.includes('自作コア') || w.text.includes('最大クロックは出していません')));
});

test('T3: 基準の既存コアと自作コアは別グループ(coreDefId がキー)。グループに uRecord が載る', () => {
  let d = design.addPart(mk('gf-14'), P(ZEN1)).design;
  d = design.addCoreDef(d, cl(ZEN1)).design;
  assert.strictEqual(d.dies[0].blocks.length, 2);
  const e = design.addCoreDef(design.addCoreDef(mk('gf-14'), cl(ZEN1)).design, ap(cl(ZEN1, { id: 'cd2' }), { rob: 200 }));
  assert.ok(e.ok);
  const g = e.design.cfg.cores; assert.strictEqual(g.length, 2);
  assert.deepStrictEqual(g.map((x) => x.coreDefId), ['cd1', 'cd2']);
  assert.strictEqual(g[1].uRecord.rob, 200); assert.strictEqual(g[1].type, 'custom:cd2'); assert.strictEqual(g[1].sourcePresetId, undefined);
  assert.strictEqual(design.addCoreDef(design.addCoreDef(mk('gf-14'), cl(ZEN1)).design, ap(cl(ZEN1), { rob: 200 })).ok, false);
  // 同じ定義・同じ id は個数がまとまる
  const same = design.addCoreDef(design.addCoreDef(mk('gf-14'), cl(ZEN1)).design, cl(ZEN1));
  assert.ok(same.ok); assert.strictEqual(same.design.cfg.cores.length, 1); assert.strictEqual(same.design.cfg.cores[0].count, 2); assert.strictEqual(same.design.coreDefs.length, 1);
  // ISA 混在は既存規則で拒否
  assert.strictEqual(design.addCoreDef(design.addPart(mk('gf-14'), P('core:mt-9400:P')).design, cl(ZEN1)).ok, false);
  // クロックはブロックの clockGHz
  const c4 = design.addCoreDef(mk('gf-14'), ap(cl(ZEN1), { clockGHz: 4.0, smt: 1 })).design.dies[0].blocks[0];
  assert.strictEqual(c4.clockGHz, 4.0); assert.strictEqual(c4.smt, 1); assert.strictEqual(c4.coreType, 'custom:cd1'); assert.strictEqual(c4.uarch, 'Zen 1'); assert.strictEqual(c4.sourcePresetId, null);
  const bc = design.setBlockClock(design.addCoreDef(mk('gf-14'), cl(ZEN1)).design, 'x:custom:cd1', 3.9); assert.ok(bc.ok, bc.reason);
});

// ---- RD7・RD12: 保存・読み込み ----
test('RD7: 保存→読込の往復で coreDefs・ブロックが一致 / 古い設計(coreDefs なし)も開ける', () => {
  let d = design.fromScratch({ name: 'D', widthMm: 30, heightMm: 30, nodeId: 'tsmc-n4', entry: 'new' });
  assert.strictEqual(d.origin.entry, 'new');
  d = design.addCoreDef(d, ap(cl(ZEN1), { l2KB: 1024, clockGHz: 4 }), { count: 3 }).design;
  d = design.addCoreDef(d, cl('core:intel-adl-12900k:P', { id: 'cd2', name: 'GC 複製' })).design;
  const r = design.parse(design.serialize(d));
  assert.ok(r.ok, r.reason); assert.deepStrictEqual(r.design, JSON.parse(JSON.stringify(d)));
  assert.strictEqual(r.design.origin.entry, 'new');
  assert.strictEqual(E.evaluate(r.design, ctx).st.score, E.evaluate(d, ctx).st.score);
  const old = design.addPart(mk('gf-14'), P(ZEN1)).design; assert.strictEqual(old.coreDefs, undefined);
  assert.ok(design.parse(design.serialize(old)).ok);
  assert.strictEqual(design.fromScratch({ nodeId: 'gf-14' }).origin.entry, undefined);
});

test('RD12: 壊れた coreDefs / coreDefId / entry を parse が拒否', () => {
  const good = design.addCoreDef(mk('gf-14'), ap(cl(ZEN1), { rob: 230 })).design;
  const bad = (f, msg) => { const x = JSON.parse(JSON.stringify(good)); f(x); const r = design.parse(JSON.stringify(x)); assert.strictEqual(r.ok, false, msg); return r.reason; };
  assert.ok(design.parse(JSON.stringify(good)).ok);
  bad((x) => { x.coreDefs[0].params.rob = 1e9; }, '巨大な ROB');
  bad((x) => { x.coreDefs[0].params.rob = 1025; }, 'ROB 範囲外');
  bad((x) => { x.coreDefs[0].params.width = 6.5; }, '幅が小数');
  bad((x) => { x.coreDefs[0].params.l2KB = NaN; x.coreDefs[0].params.clockGHz = 'a'; }, '型');
  bad((x) => { x.coreDefs[0].params.clockGHz = 9; }, 'クロック');
  bad((x) => { x.coreDefs[0].params.smt = 3; }, 'SMT');
  bad((x) => { x.coreDefs[0].params.isa = 'arm'; }, '継承項目を params に');
  bad((x) => { x.coreDefs.push(JSON.parse(JSON.stringify(x.coreDefs[0]))); }, 'id 重複');
  bad((x) => { x.coreDefs[0].id = '../x'; }, 'id 形式');
  bad((x) => { x.coreDefs[0].base.uRecord.rob = -1; }, 'uRecord 負');
  bad((x) => { x.coreDefs[0].base.uRecord.rob = 'a'; }, 'uRecord 型');
  bad((x) => { delete x.coreDefs[0].base; }, 'base なし');
  bad((x) => { x.coreDefs[0].base.area.withL2Mm2 = 1e9; }, '面積');
  bad((x) => { x.coreDefs[0].base.area.origin = 'derived'; }, '基準の区分');
  bad((x) => { x.coreDefs = 'x'; }, '配列でない');
  bad((x) => { x.coreDefs = []; }, '存在しない coreDefId');
  bad((x) => { x.dies[0].blocks[0].coreDefId = 'zz'; }, '不明な coreDefId');
  bad((x) => { x.dies[0].blocks[0].isa = 'arm'; }, 'ISA 不一致');
  bad((x) => { x.dies[0].blocks[0].areaRangeMm2 = [0, 1]; }, '範囲');
  bad((x) => { x.origin.entry = 'old'; }, 'entry');
  bad((x) => { x.dies[0].blocks[0].areaOrigin = 'derived'; delete x.dies[0].blocks[0].coreDefId; }, 'derived なのに定義なし');
  // 編集できない基準(推定面積)で幅を変えた params
  const est = design.addCoreDef(mk('tsmc-n4'), cl('core:amd-zen5-9700x:P')).design;
  const x = JSON.parse(JSON.stringify(est)); x.coreDefs[0].params.width = 7;
  assert.strictEqual(design.parse(JSON.stringify(x)).ok, false);
  const many = JSON.parse(JSON.stringify(good)); for (let i = 0; i < 20; i++) { const c = JSON.parse(JSON.stringify(good.coreDefs[0])); c.id = `z${i}`; many.coreDefs.push(c); }
  assert.strictEqual(design.parse(JSON.stringify(many)).ok, false);
  assert.strictEqual(design.schema, undefined); assert.strictEqual(design.SCHEMA, 1);
});

// ---- RD10 ----
test('RD10: 露光上限 858 mm² の警告(ちょうどは出ない)・エラーにしない', () => {
  const at = (w, h) => { const d = design.fromScratch({ widthMm: w, heightMm: h, nodeId: 'gf-14' }); return C.check(d, parts, D.nodes).filter((c) => c.code === 'reticle'); };
  assert.strictEqual(at(26, 33).length, 0);                    // 858 ちょうど
  const w = at(26, 33.1); assert.strictEqual(w.length, 1); assert.strictEqual(w[0].level, 'warn'); assert.ok(w[0].text.includes('858') && w[0].text.includes('チップレット分割は未対応'));
  assert.strictEqual(at(10, 10).length, 0);
  const ev = E.evaluate(design.fromScratch({ widthMm: 40, heightMm: 40, nodeId: 'gf-14' }), ctx);
  assert.ok(ev.warnings.some((x) => x.code === 'reticle')); assert.ok(!ev.warnings.some((x) => x.code === 'reticle' && x.level === 'error'));
  assert.strictEqual(C.RETICLE_MM2, 858);
});

test('RD10: 最小ダイ(外接矩形を 0.1 mm 切り上げ、下限 1 mm、0 個は変化なし、はみ出さない)', () => {
  const d0 = mk('gf-14', 20, 20);
  const e = design.fitDieToBlocks(d0); assert.ok(e.ok); assert.strictEqual(e.changed, false); assert.strictEqual(e.design.dies[0].widthMm, 20);
  let d = d0;
  d = design.addCoreDef(d, cl(ZEN1), { count: 3 }).design;
  d = design.addPart(d, P('core:intel-adl-12900k:P')).design;
  const r = design.fitDieToBlocks(d); assert.ok(r.ok, r.reason);
  const bl = d.dies[0].blocks;
  const mw = Math.max(...bl.map((b) => b.x + b.w)); const mh = Math.max(...bl.map((b) => b.y + b.h));
  const die = r.design.dies[0];
  assert.strictEqual(die.widthMm, Math.round(Math.ceil(mw * 10 - 1e-6)) / 10); assert.strictEqual(die.heightMm, Math.round(Math.ceil(mh * 10 - 1e-6)) / 10);
  assert.ok(die.widthMm >= mw - 1e-9 && die.widthMm - mw < 0.1 + 1e-9 && die.heightMm >= mh - 1e-9 && die.heightMm - mh < 0.1 + 1e-9);
  near(die.areaMm2, die.widthMm * die.heightMm); assert.deepStrictEqual(design.validate(r.design).filter((x) => x.level === 'error'), []);
  // 小さい部品 1 個: 下限 1 mm
  const tiny = JSON.parse(JSON.stringify(d0)); tiny.dies[0].blocks.push({ id: 't', label: 't', kind: 'core', x: 0, y: 0, w: 0.2, h: 0.3 });
  const t = design.fitDieToBlocks(tiny); assert.strictEqual(t.design.dies[0].widthMm, 1); assert.strictEqual(t.design.dies[0].heightMm, 1);
  // 3.3 のようにちょうどの値は切り上げない
  const exact = JSON.parse(JSON.stringify(d0)); exact.dies[0].blocks.push({ id: 't', label: 't', kind: 'core', x: 1.1, y: 0, w: 2.2, h: 3 });
  const x = design.fitDieToBlocks(exact); assert.strictEqual(x.design.dies[0].widthMm, 3.3); assert.strictEqual(x.design.dies[0].heightMm, 3);
  assert.strictEqual(design.fitDieToBlocks(design.fromPreset(D.presets[0])).ok, false);
});

test('RD10: 歩留まりは指定ダイ面積で一つに決まる(コア定義が範囲でも)', () => {
  const a = design.addCoreDef(mk('tsmc-n5', 20, 20), ap(cl(ZEN1), { l2KB: 1024 })).design;
  const b = design.addCoreDef(mk('tsmc-n5', 20, 20), cl(ZEN1)).design;
  const ya = E.evaluate(a, ctx).area.yield; const yb = E.evaluate(b, ctx).area.yield;
  assert.ok(typeof ya === 'number' && ya === yb);
});

// ---- M5 レビュー対応 ----
test('面積の L2 比の分母は表の l2KB(Oryon Performance: 表 2048 / uarch.js 3072)', () => {
  const id = 'core:qc-8elite:E'; const d = cl(id);
  assert.strictEqual(CD.areaL2KB(d), 2048); assert.strictEqual(CD.perfL2KB(d), 3072);
  const ar = (x) => CD.deriveArea(x, { toNodeId: P(id).nodeId, nodes: D.nodes });
  const a0 = ar(d); near(a0.placeMm2, 1.9); assert.deepStrictEqual(a0.rangeMm2, [1.9, 1.9]);
  const a = ar(ap(d, { l2KB: 2048 }));
  assert.ok(a.rangeMm2[0] >= 1.9 - 1e-9 && a.rangeMm2[1] >= 1.9 - 1e-9, JSON.stringify(a.rangeMm2));
  // 性能は uarch.js(3072)基準: 2048 は 0.667 倍
  near(CD.ratios(ap(d, { l2KB: 2048 })).l2, 2048 / 3072);
  // 面積は表(2048)基準: 4096 で 2 倍
  near(ar(ap(d, { l2KB: 4096 })).l2Mm2[1], (1.9 - 0.91) * 2);
  const ev = CD.evaluate(d, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes });
  assert.ok(ev.warnings.some((x) => x.code === 'l2-mismatch' && x.text.includes('表 2048 KB / uarch.js 3072 KB') && x.text.includes('§3.7.11')));
});

test('SMT なし基準で SMT 2 は上振れ側(理由つき)', () => {
  const id = parts.filter((p) => p.kind === 'core' && p.smt === 1 && CD.clone(p, D.uarch, []).ok)[0].id;
  const d = cl(id); assert.strictEqual(d.base.smt, 1);
  assert.strictEqual(CD.optimisticInfo(d).optimistic, false);
  const o = CD.optimisticInfo(ap(d, { smt: 2 })); assert.ok(o.optimistic && o.reasons.includes('SMT を増やした(γ 未校正)'));
  assert.strictEqual(CD.optimisticInfo(ap(cl(ZEN1), { smt: 1 })).optimistic, false);
});

test('未編集の複製は面積が表の区分・範囲 0・注意帯 3 なし。編集すると導出に切り替わる', () => {
  let d = design.addCoreDef(mk('gf-14'), cl(ZEN1)).design;
  const b = d.dies[0].blocks[0]; assert.strictEqual(b.areaOrigin, 'table');
  assert.ok(!E.evaluate(d, ctx).warnings.some((w) => w.text.includes('自作コアの面積は範囲です')));
  d = design.addCoreDef(mk('gf-14'), ap(cl(ZEN1), { rob: 230 })).design;
  assert.strictEqual(d.dies[0].blocks[0].areaOrigin, 'derived');
});

test('removeBlock: 参照されなくなった coreDefs を削除(元の設計は壊さない・他のブロックが使う定義は残す)', () => {
  let d = design.addCoreDef(mk('gf-14'), cl(ZEN1)).design;
  d = design.addCoreDef(d, cl(ZEN1)).design;   // 同じ定義(id cd1)を 2 ブロック目として
  assert.strictEqual(d.coreDefs.length, 1);
  const ids = d.dies[0].blocks.map((x) => x.id);
  const orig = JSON.parse(JSON.stringify(d));
  const r1 = design.removeBlock(d, ids[0]); assert.ok(r1.ok); assert.strictEqual(r1.design.coreDefs.length, 1);
  const r2 = design.removeBlock(r1.design, ids[1]); assert.ok(r2.ok); assert.deepStrictEqual(r2.design.coreDefs, []);
  assert.deepStrictEqual(d, orig);   // 元(undo 先)は無傷
  assert.ok(design.parse(design.serialize(r2.design)).ok);
  // 戻して置き直せる
  const back = design.addCoreDef(r2.design, cl(ZEN1)); assert.ok(back.ok); assert.strictEqual(back.design.coreDefs.length, 1);
});
