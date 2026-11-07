'use strict';
// M3b-1: 混合(モード C)のモデル層。blocklib / compat / design(fromScratch ほか)/ evaluate(mix)。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'blocklib.js'));
const design = require('../js/model/design.js');
const BL = require('../js/model/blocklib.js');
const C = require('../js/model/compat.js');
const E = require('../js/model/evaluate.js');

const areas = D.blocklibAreas;
const parts = BL.build(D.presets, areas, D.nodes);
const ctx = E.makeContext();
const P = (id) => BL.get(parts, id);
const mk = (nodeId, w, h) => design.fromScratch({ name: 't', widthMm: w || 40, heightMm: h || 40, nodeId: nodeId || 'tsmc-n4' });
const add = (d, id, o) => { const r = design.addPart(d, P(id), o); assert.ok(r.ok, r.reason); return r.design; };
// 読み込んだ設計に混在がある状態を作る実験用(allowIsaMix。UI には出さない)
const addMixed = (d, id, o) => add(d, id, Object.assign({ allowIsaMix: true }, o));

// ---- blocklib ----
test('blocklibAreas: 収録 8 件、Firestorm などは入れていない', () => {
  assert.strictEqual(areas.length, 8);
  assert.ok(!areas.some((a) => /Firestorm|Avalanche|Everest|Carmel/.test(a.uarch)));
  const z1 = areas.find((a) => a.uarch === 'Zen 1');
  assert.deepStrictEqual([z1.noL2Mm2, z1.withL2Mm2, z1.s], [5.5, 7, 'pub']);
  assert.strictEqual(areas.find((a) => a.uarch === 'Zen 4').noL2Mm2, null);
});

test('blocklib.build: 収録チップは table、無いものは estimated(式と仮の比率が note)', () => {
  const x925 = P('core:mt-9400:P');
  assert.strictEqual(x925.area.origin, 'table'); assert.strictEqual(x925.area.withL2Mm2, 3.335); assert.strictEqual(x925.area.mm2, 2.784);
  const zen5 = P('core:amd-zen5-9700x:P');
  assert.strictEqual(zen5.area.origin, 'estimated');
  assert.ok(Math.abs(zen5.area.mm2 - Math.round(70.2 * 0.4 / 8 * 1000) / 1000) < 1e-9);
  assert.ok(zen5.area.note.includes('0.4') && zen5.area.note.includes('仮'));
  assert.strictEqual(zen5.nodeId, 'tsmc-n4'); assert.strictEqual(zen5.isa, 'x86'); assert.strictEqual(zen5.defaultClockGHz, 5.5); assert.strictEqual(zen5.smt, 2);
  // X4 は 8 Gen 3(N4)では表(N3E の 9400 の値)に一致しないので推定
  assert.strictEqual(P('core:qc-8gen3:P').area.origin, 'estimated');
  assert.strictEqual(P('core:intel-adl-12900k:P').area.origin, 'table');
});

test('blocklib.build: 面積不明は unknown で 0 にならない / ブロック部品', () => {
  const noDie = BL.build([{ id: 'x', name: 'X', vendor: 'V', isa: 'arm', kind: 'pc', dies: [], cfg: { cores: [{ type: 'P', uarch: 'Cortex-X4', count: 2, smt: 1, boostGHz: 3 }], l3MB: 8 } }], [], D.nodes);
  const c = noDie.find((p) => p.kind === 'core'); const l3 = noDie.find((p) => p.kind === 'l3');
  assert.strictEqual(c.area.origin, 'unknown'); assert.strictEqual(c.area.mm2, null);
  assert.strictEqual(l3.area.origin, 'unknown'); assert.strictEqual(l3.area.mm2, null);
  const l3p = P('l3:amd-zen5-9700x');
  assert.strictEqual(l3p.capacityMB, 32); assert.strictEqual(l3p.area.origin, 'estimated');
  assert.ok(Math.abs(l3p.area.mm2 - 70.2 * 0.15) < 0.01);
  // 2026-11-05: Ryzen の IOD(9700X など)は面積 117.8mm² を取得したので table。面積不明の例は Core 5 320 の uncore に替えた
  const iod = parts.find((p) => p.id === 'uncore:amd-zen5-9700x:1');
  assert.ok(iod); assert.strictEqual(iod.area.origin, 'table'); assert.strictEqual(iod.area.mm2, 117.8);
  const unk = parts.find((p) => p.id === 'uncore:intel-wcl-c5-320:1');
  assert.ok(unk); assert.strictEqual(unk.area.origin, 'unknown'); assert.strictEqual(unk.area.mm2, null);
});

test('blocklib.search / get', () => {
  assert.strictEqual(P('nothing'), null);
  assert.ok(BL.search(parts, { isa: 'arm' }).every((p) => p.isa === 'arm'));
  assert.ok(BL.search(parts, { vendor: 'AMD', text: 'zen 5' }).length > 0);
  assert.strictEqual(BL.search(parts, { text: 'zzzz' }).length, 0);
});

// ---- compat ----
const codes = (d, nodeId) => C.check(d, parts, D.nodes);
test('compat.portArea: 密度比 / null なら換算しない / Intel の定義差を note', () => {
  const r = C.portArea(10, 'tsmc-n5', 'tsmc-n3e', D.nodes);
  assert.ok(r.ok);
  // 密度に幅があるときは面積が大きくなる側(元は上限 171.3、先は下限 180)を保守的な値にする。幅は mm2Range
  assert.ok(Math.abs(r.mm2 - 10 * 171.3 / 180) < 1e-9); assert.ok(Math.abs(r.ratio - 171.3 / 180) < 1e-12);
  assert.ok(Math.abs(r.mm2Range[0] - 10 * 138.2 / 220) < 1e-9 && Math.abs(r.mm2Range[1] - r.mm2) < 1e-12);
  assert.ok(r.note.includes('SRAM') && r.note.includes('面積が大きくなる側'));
  // 幅の無いノード同士は従来の密度比(幅 0)
  const flat = C.portArea(10, 'tsmc-n7', 'tsmc-n6', D.nodes); assert.ok(Math.abs(flat.mm2 - 10 * 93.85 / 114.2) < 1e-9); assert.deepStrictEqual(flat.mm2Range, [flat.mm2, flat.mm2]);
  const n = C.portArea(10, 'tsmc-n5', 'intel-18a', D.nodes);
  assert.strictEqual(n.ok, false); assert.strictEqual(n.mm2, null); assert.ok(n.reason);
  const i = C.portArea(10, 'intel-7', 'tsmc-n5', D.nodes);
  assert.ok(i.ok && i.note && i.note.includes('Intel'));
  assert.strictEqual(C.portArea(10, 'tsmc-n5', 'tsmc-n5', D.nodes).mm2, 10);
  assert.strictEqual(C.portArea(null, 'tsmc-n5', 'tsmc-n3e', D.nodes).ok, false);
});

test('compat: x86 + Arm の混在は error', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P'); d = addMixed(d, 'core:mt-9300:P');
  const e = C.check(d, parts, D.nodes).find((x) => x.code === 'isa-mix');
  assert.ok(e && e.level === 'error' && e.blockId);
});

test('compat: プロセス違いは warn(移植)、同じ N4 は出ない', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P'); // N4 → 移植なし
  assert.ok(!C.check(d, parts, D.nodes).some((x) => x.code === 'ported'));
  d = add(d, 'core:intel-adl-12900k:P'); // x86。Intel 7 → N4
  const w = C.check(d, parts, D.nodes).find((x) => x.code === 'ported');
  assert.ok(w && w.level === 'warn' && w.text.includes('Intel'));
  const blk = d.dies[0].blocks.find((b) => b.sourcePresetId === 'intel-adl-12900k');
  assert.ok(blk.ported); assert.ok(blk.portConverted);
  assert.ok(Math.abs(blk.areaMm2 - 7.43 * 100 / 143.7) < 1e-9); // 保守的(元の密度は上限 100)
  assert.strictEqual(blk.areaFromMm2, 7.43); assert.ok(Math.abs(blk.areaRangeMm2[0] - 7.43 * 80 / 143.7) < 1e-9 && Math.abs(blk.areaRangeMm2[1] - blk.areaMm2) < 1e-12);
  assert.ok(Math.abs(blk.portRatio - 100 / 143.7) < 1e-12);
});

test('compat: 面積未取得の警告 / メモリ食い違い / 性能低下なしの info / 使用率', () => {
  let d = mk('tsmc-n6'); d = add(d, 'uncore:intel-wcl-c5-320:1'); // 面積不明の例(2026-11-05: Ryzen の IOD は 117.8mm² を取得したため Core 5 320 の uncore に替えた)
  let r = C.check(d, parts, D.nodes);
  assert.ok(r.some((x) => x.code === 'area-unknown' && x.level === 'warn'));
  assert.ok(r.some((x) => x.code === 'no-mix-penalty' && x.level === 'info' && x.text.includes('混合による性能低下は反映していません')));
  d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P'); d = add(d, 'core:intel-adl-12900k:P');
  r = C.check(d, parts, D.nodes); // DDR5 と DDR4/DDR5 は共通 DDR5 あり → 出ない
  assert.ok(!r.some((x) => x.code === 'memory-mismatch'));
  d = add(d, 'core:amd-zen1-1800x:P'); // DDR4 のみ。DDR5 のみの Zen5 と共通なし
  r = C.check(d, parts, D.nodes);
  assert.ok(r.some((x) => x.code === 'memory-mismatch'));
  const u = r.find((x) => x.code === 'utilization');
  assert.ok(u && u.value > 0 && u.value < 1);
  assert.deepStrictEqual([...C.memoryTypes('LPDDR5X-9600 / DDR5-7200, 2ch')].sort(), ['DDR5', 'LPDDR5X']);
  assert.strictEqual(C.memoryTypes('未取得').size, 0);
});

test('compat: ダイ超過は error(面積が合わない設計)', () => {
  let d = mk('tsmc-n4', 10, 10); d = add(d, 'core:amd-zen5-9700x:P');
  const bad = design.clone(d); bad.dies[0].blocks[0].areaMm2 = 500;
  assert.ok(C.check(bad, parts, D.nodes).some((x) => x.code === 'die-overflow' && x.level === 'error'));
});

// ---- design ----
test('fromScratch: 空のダイ・origin・package・寸法の範囲', () => {
  const d = mk('tsmc-n4', 20, 15);
  assert.strictEqual(d.presetId, null); assert.strictEqual(d.baseCfg, null);
  assert.deepStrictEqual(d.origin, { mode: 'mix', base: null, parts: [] });
  assert.deepStrictEqual(d.cfg, { cores: [], l3MB: 0 }); assert.deepStrictEqual(d.locks, { params: false });
  assert.strictEqual(d.package.coolingId, 'air-tower'); assert.strictEqual(d.package.powerLimitW, null);
  assert.deepStrictEqual(d.mix, { nodeId: 'tsmc-n4' });
  assert.strictEqual(d.dies.length, 1); assert.strictEqual(d.dies[0].areaMm2, 300);
  assert.throws(() => design.fromScratch({ widthMm: 0.5, heightMm: 10, nodeId: 'x' }), RangeError);
  assert.throws(() => design.fromScratch({ widthMm: 10, heightMm: 101, nodeId: 'x' }), RangeError);
});

test('addPart: コア 8 個 + L3、cfg 再計算、重ならない、元を壊さない', () => {
  const d0 = mk('tsmc-n4');
  const snap = JSON.stringify(d0);
  let d = add(d0, 'core:amd-zen5-9700x:P', { count: 8 });
  assert.strictEqual(JSON.stringify(d0), snap);
  d = add(d, 'l3:amd-zen5-9700x');
  assert.deepStrictEqual(d.cfg.cores.map((g) => [g.type, g.uarch, g.count, g.smt, g.boostGHz]), [['P', 'Zen 5', 8, 2, 5.5]]);
  assert.strictEqual(d.cfg.l3MB, 32);
  assert.strictEqual(d.origin.parts.length, 9);
  assert.deepStrictEqual(d.origin.parts[0], { blockId: d.dies[0].blocks[0].id, partId: 'core:amd-zen5-9700x:P', from: 'amd-zen5-9700x', ported: false });
  assert.deepStrictEqual(design.validate(d), []); // はみ出し・重なりなし
  assert.ok(d.dies[0].blocks.every((b) => b.schematic));
  const ids = d.dies[0].blocks.map((b) => b.id); assert.strictEqual(new Set(ids).size, ids.length);
  assert.deepStrictEqual(design.deriveCfg(d), d.cfg);
});

test('addPart: 異なるチップの同じ種別名は type を分ける / 異常系', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P', { count: 2 }); d = addMixed(d, 'core:mt-9300:P');
  const types = d.cfg.cores.map((g) => g.type); assert.strictEqual(new Set(types).size, 2);
  assert.ok(types.every((t) => t.startsWith('P@')));
  const tiny = mk('tsmc-n4', 3, 3);
  assert.strictEqual(design.addPart(tiny, P('core:amd-zen5-9700x:P'), { count: 2 }).ok, false); // 入らない
  assert.strictEqual(design.addPart(d, P('core:amd-zen5-9700x:P'), { count: 0 }).ok, false);
  assert.strictEqual(design.addPart(d, P('core:amd-zen5-9700x:P'), { dieId: 'nope' }).ok, false);
  const b0 = d.dies[0].blocks[0];
  const r = design.addPart(d, P('core:amd-zen5-9700x:P'), { x: b0.x, y: b0.y, allowIsaMix: true });
  assert.strictEqual(r.ok, false); assert.ok(r.reason.includes('重なり'));
  assert.strictEqual(design.addPart(d, P('core:amd-zen5-9700x:P'), { x: 1000, y: 0, allowIsaMix: true }).ok, false);
  assert.strictEqual(design.addPart(design.fromPreset(D.presets[0]), P('core:amd-zen5-9700x:P')).ok, false);
});

test('addPart: 面積不明の部品は areaMm2:null で置ける', () => {
  let d = mk('tsmc-n6'); d = add(d, 'uncore:intel-wcl-c5-320:1'); // 2026-11-05: 面積不明の例を Ryzen の IOD(117.8mm² を取得)から Core 5 320 の uncore に替えた
  assert.strictEqual(d.dies[0].blocks[0].areaMm2, null); assert.strictEqual(d.dies[0].blocks[0].areaOrigin, 'unknown');
});

test('removeBlock / setBlockClock / setDieSize', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P', { count: 3 });
  const id = d.dies[0].blocks[0].id;
  const r = design.removeBlock(d, id);
  assert.ok(r.ok); assert.strictEqual(r.design.cfg.cores[0].count, 2); assert.strictEqual(r.design.origin.parts.length, 2);
  assert.strictEqual(d.cfg.cores[0].count, 3);
  assert.strictEqual(design.removeBlock(d, 'zzz').ok, false);
  const gid = d.cfg.cores[0].id;
  const c = design.setBlockClock(d, gid, 4.2);
  assert.ok(c.ok); assert.strictEqual(c.design.cfg.cores[0].boostGHz, 4.2);
  assert.strictEqual(design.setBlockClock(d, gid, 0.4).ok, false); assert.strictEqual(design.setBlockClock(d, gid, 8.1).ok, false);
  assert.strictEqual(design.setBlockClock(d, 'nope', 4).ok, false);
  assert.strictEqual(design.setDieSize(d, 'die0', 0.5, 10).ok, false);
  assert.strictEqual(design.setDieSize(d, 'die0', 20, 101).ok, false);
  assert.strictEqual(design.setDieSize(d, 'die0', 2, 2).ok, false); // はみ出す
  const s = design.setDieSize(d, 'die0', 50, 50);
  assert.ok(s.ok); assert.strictEqual(s.design.dies[0].areaMm2, 2500); assert.strictEqual(d.dies[0].widthMm, 40);
});

test('parse: 混合設計の往復 / 不正な origin.parts', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:amd-zen5-9700x:P', { count: 2 }); d = add(d, 'l3:amd-zen5-9700x');
  const r = design.parse(design.serialize(d));
  assert.ok(r.ok, r.reason); assert.deepStrictEqual(r.design, d);
  const bad = design.clone(d); bad.origin.parts[0].ported = 'yes';
  assert.strictEqual(design.parse(JSON.stringify(bad)).ok, false);
  const bad2 = design.clone(d); bad2.mix.nodeId = 5;
  assert.strictEqual(design.parse(JSON.stringify(bad2)).ok, false);
  const bad3 = design.clone(d); delete bad3.mix;
  assert.strictEqual(design.parse(JSON.stringify(bad3)).ok, false);
  // 従来の設計は従来どおり
  const p = design.fromPreset(D.presets[0]);
  assert.ok(design.parse(design.serialize(p)).ok);
});

// ---- evaluate ----
test('evaluate(mix): Zen 5 コア 8 個 + L3 で ST/MT が出る。低確度・公表値なし・電力熱は ok:false', () => {
  let d = mk('tsmc-n4', 30, 30); d = add(d, 'core:amd-zen5-9700x:P', { count: 8 }); d = add(d, 'l3:amd-zen5-9700x');
  const r = E.evaluate(d, ctx);
  assert.ok(r.isMix); assert.strictEqual(r.published, null); assert.strictEqual(r.errPct, null);
  assert.ok(r.st.ok && r.st.score > 0); assert.ok(r.mt.ok && r.mt.score > r.st.score);
  assert.strictEqual(r.st.confidence, 'low'); assert.strictEqual(r.mt.confidence, 'low');
  assert.strictEqual(r.st.published, null); assert.strictEqual(r.st.errPct, null);
  assert.strictEqual(r.powerModel.ok, false); assert.ok(r.powerModel.reason.includes('電力モデルを校正できません'));
  assert.strictEqual(r.thermal.ok, false); assert.ok(r.thermal.reason);
  assert.ok(r.warnings.some((w) => w.text.includes('混合による性能低下は反映していません')));
  const a = r.area.mix;
  assert.ok(a.utilization > 0 && a.utilization < 1); assert.strictEqual(a.blocks.length, 9);
  assert.ok(a.blocks.every((b) => ['table', 'estimated', 'unknown', 'ported'].includes(b.class)));
  // 9700x 単体の ST に近い(同じコア・同じクロック。補正は同じ)
  const solo = E.evaluate(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen5-9700x')), ctx);
  assert.ok(Math.abs(r.st.score / solo.st.score - 1) < 0.02);
});

test('evaluate(mix): 補正のない uarch は ISA 平均(low)、x86+Arm の混在は error が warnings に', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:intel-adl-12900k:E');
  const r = E.evaluate(d, ctx);
  assert.ok(r.st.ok); assert.strictEqual(r.st.confidence, 'low');
  assert.strictEqual(ctx.cal.u['Gracemont'], undefined);
  assert.strictEqual(r.st.corrSource, 'isa');
  d = addMixed(d, 'core:mt-9300:P');
  const m = E.evaluate(d, ctx);
  assert.ok(m.warnings.some((w) => w.level === 'error' && w.code === 'isa-mix'));
  // isa-mix の error がある間は ST/MT の数値を出さない
  assert.strictEqual(m.st.ok, false); assert.strictEqual(m.mt.ok, false); assert.strictEqual(m.st.score, null); assert.strictEqual(m.mt.score, null);
  assert.strictEqual(m.st.reason, 'x86 と Arm の混在は配置不可のため性能を出しません');
  // 空の設計は理由つきで ok:false
  const e = E.evaluate(mk('tsmc-n4'), ctx);
  assert.strictEqual(e.st.ok, false); assert.ok(e.st.reason); assert.strictEqual(e.mt.ok, false);
});

test('evaluate(mix): 面積の区分は出所 × 移植の 2 軸(表のまま移植 / 推定のまま移植)', () => {
  let d = mk('tsmc-n4'); d = add(d, 'core:intel-adl-12900k:P'); // 表(Intel 7 → N4 に移植)
  d = add(d, 'core:intel-adl-12900k:E'); // 推定(同じ Intel 7 → N4 に移植)
  d = add(d, 'core:amd-zen5-9700x:P'); // 推定(N4 のまま。移植なし)
  const r = E.evaluate(d, ctx);
  const b = r.area.mix.blocks;
  assert.deepStrictEqual(b.map((x) => [x.class, x.portConverted]), [['table', true], ['estimated', true], ['estimated', false]]);
  assert.strictEqual(r.area.mix.portedCount, 2);
  assert.strictEqual(b[0].areaFromMm2, 7.43); assert.ok(b[0].areaRangeMm2[0] < b[0].mm2);
});

// ---- M3b 修正(reviewer 指摘) ----
// 指摘1: L3 なしの扱い。変更前の全プリセットの ST/MT(fromPreset → evaluate)を固定して、既存の結果が変わらないことを確かめる
// 2026-11-07(MediaTek の公式照合): Dimensity 9400 の P(X925)を公式 3.62 に(旧 3.63)。9400 は Arm の校正の代表のため Cortex-X925 の u 90.4787→90.6919、uIsa.arm 113.7276→113.7611 が動き、X925 を使う GB10 の ST/MT と、ISA 平均 u を使う ARM 全般(Snapdragon・Dimensity・Orin・T239 など 23 件)の ST/MT が最大約 0.2%(GB10 の ST +0.24%)動いた(BASE は 8s Gen 4 を含め 15 件・BASE_M5B 8 件の値を更新。判定の反転なし)。以下は Qualcomm の段階の記録:
// 2026-11-07(Qualcomm の公式照合):クロックを公式値に訂正。8 Elite Gen 5 の E 3.63→3.62(MT 10960.481→10940.369、ST 不変)、8s Gen 4 の P 3.21→3.2(ST 1332.54→1329.027)、4 Gen 2 の P 2.2→2.3・E 1.95→2.0(BASE_M5B 側: ST 738.15→766.512、MT 1756.331→1815.768)。8 Gen 3 の E 2.27→2.3・7 Gen 4 の E 1.84→1.8 は ST/MT が出ない(null)ため不変。校正は不変
// 2026-10-31: ST の L3 を 1 CCD 分にしたため 7950X・9950X・395(BASE)と 5950X(BASE_M5B)の ST を更新(旧値 2728.973 / 3165.364 / 2844.253 / 2289.758。MT は不変。設計書 §5.3.3 G の3)
// 2026-10-30(M6 第 4 段): Golden/Raptor Cove の専用 u 導入で 12900K・13900K・14900K の ST/MT を更新(旧値は設計書 §5.3.0 の M6 第 4 段)。他は不変
// 2026-11-05: 265K の P boost 5.5→5.4・285K の P boost 5.7→5.5(ARK の Performance-core Max Turbo)で Lion Cove の u を再校正(96.084→97.780、x86 平均 107.361→107.832)。285K・268V・388H の ST と、x86 平均 u を使う全プリセットの ST/MT(Zen 3 など)・E コアの MT を更新。旧値は設計書 §5.3.0 の 2026-11-05 の節
// 2026-11-05(未取得データの追加): 13900K の MT 17940.976 → 23160.329(E の boost 4.3GHz を ARK で取得)、268V の MT null → 9337.213(P/LP-E の base と LP-E の boost を ARK で取得)、388H の MT null → 17373.303(P/E/LP-E のクロックを ARK で取得)、M1 Ultra の ST null → 2184.935(P の最大クロック 3.228GHz を Eclectic Light の実測で取得)、Orin の ST 738.15 → 787.743 / MT 6807.888 → 5925.276(L3 6MB を公表値で取得)。ほかは不変
// 2026-11-07(SLC 全体を L3 相当に): ユーザー指示「現在は GPU の機能は未実装なので、SLC 全体を使えるようにしてください」。Apple 23・Snapdragon 10・Dimensity 6 の計 39 件の SoC に cfg.l3MB を入れた(L3 + SLC の合計。設計書 §5.3.0)。l3MB 未定義だと l3Ref=2048KB がスレッド数で割られず MT が楽観側だったのが解消し、MT が下がる(Snapdragon・Dimensity は約 -8〜-15%)。
//   Arm の校正の代表のうち l3MB を入れたもの(M1・M2・A16・8 Gen 1・8 Gen 2・8 Elite・9400。8 Gen 3 は L3 12MB のみで SLC 未取得のため l3MB は未定義のまま)で、Arm の u が動いた(Everest 172.55→150.13、Firestorm 151.59→139.52、Avalanche 162.14→146.29、X2 90.60→83.06、X3 105.10→95.41、X4 82.59 は不変、Oryon Prime 92.74→85.61、X925 90.69→81.39、uIsa.arm 113.761→104.271)。x86・MT 帯係数 0.69/0.76 は不変。
//   【基準の混在】l3MB が未定義の Arm SoC(8 Gen 3 とその u を使う SKU ほか)は L3 を参照値 2MB で計算するのに、ISA 平均 u・借用 u は L3 を持つ代表で下がった値を使う組合せになる(mt-9300 の ST が ok になったのも、代表 8 Gen 3 は参照値 2MB・9300 は 18MB という混在による見かけの改善)。
//   このため l3MB を入れていない Arm SoC(780G・7 Gen 1/3・720G・6 Gen 1・4 Gen 2・Orin・T239・GB10 ほか)の ST/MT も ISA 平均 u / 代表の u の変化で動く。BASE 24 件・BASE_M5B 8 件を更新。詳細は docs/research/slc-as-l3-2026-11-07.md
// 2026-11-07(続き。ユーザー指示「GB10 の測定だけ低すぎるのでそれだけ修正したら確定。8 Gen 3 の L3 キャッシュも入れて」): ① 8 Gen 3 に l3MB 12(L3 のみ。SLC は未取得で含まない)を入れた → X4 の u が 82.587→74.868、8s Gen 3/4・7+ Gen 3 の ST が約 -9〜-11%、mt-9300 の ST は 1502.756→1362.312(-0.9%→-10.2%、ng)。
//   ② GB10 を Cortex-X925 の 2 件目の校正代表にした(calib:true)→ X925 の u は 9400 と GB10 の中央値 95.707(旧 81.389)。mt-9400 の ST は代表だった 0% が 1741→2047.284(+17.6%、ng)、GB10 は ST 1941.047→2282.523(-13.0%、ng のまま)・MT 16884.352→18823.998(-8.6%、ok に)。uIsa.arm 104.271→103.758。
//   このほか Arm SoC 全般の ST/MT が約 -0.5% 動いた(X4・ISA 平均 u の変化)。BASE 22 件・BASE_M5B 6 件を更新。詳細は docs/research/slc-as-l3-2026-11-07.md
// 2026-11-07(ユーザー指示「NG になっているものも修正して」): スマホ SoC(kind:'mobile')の MT 持続クロック係数 MT_CLOCK_FACTOR.mobile を 0.81 → 0.92 に再校正(18 件の逆算係数の中央値 0.925。mobile-pc の 0.81 と帯係数 0.69/0.76 は不変)。
//   Snapdragon・Dimensity の MT(BASE 12 件・BASE_M5B 6 件)が約 +13.6%(0.92/0.81)上がった。ST・x86・Apple・NVIDIA は不変。詳細は docs/research/mobile-mt-factor-2026-11-07.md
const BASE = {"intel-adl-12900k":[2367.464,17981.956],"intel-rpl-13900k":[2529.274,21968.688],"intel-rpl-14900k":[2619.073,22495.169],"intel-arl-285k":[2796.684,29397.799],"intel-arl-265k":[2737,26603.339],"intel-mtl-185h":[2184.953,12198.755],"intel-lnl-268v":[2481.499,9101.958],"intel-ptl-x9-388h":[2820.456,16938.518],"amd-zen1-1800x":[1126,6347.842],"amd-zenplus-2700x":[1285.157,7053.64],"amd-zen3-5800x":[2053,11780.837],"amd-zen4-7700":[2503,14925.16],"amd-zen4-7950x":[2680.434,23926.07],"amd-zen5-9700x":[3010,18060.572],"amd-zen5-9950x":[3113.309,28116.803],"amd-strix-hx370":[2780.417,12095.092],"amd-strixhalo-395":[2802.154,20372.491],"apple-a12":[null,null],"apple-a13":[null,null],"apple-a14":[2094.503,null],"apple-a15":[2119.646,null],"apple-a16":[2352,null],"apple-a17pro":[2457.786,null],"apple-a18":[null,null],"apple-a18pro":[null,null],"apple-a19pro":[null,null],"apple-a20pro":[null,null],"apple-m1":[2169,null],"apple-m1pro":[2269.966,null],"apple-m1max":[2305.252,null],"apple-m1ultra":[2330.872,null],"apple-m2":[2366,null],"apple-m2pro":[null,null],"apple-m2max":[null,null],"apple-m2ultra":[null,null],"apple-m3":[2884.112,null],"apple-m3pro":[2943.461,null],"apple-m3max":[3084.681,null],"apple-m4":[null,null],"apple-m4pro":[null,null],"apple-m5":[null,null],"apple-m5max":[null,null],"qc-855":[836,2419.723],"qc-865":[1008,2859.291],"qc-888":[1049,2922.733],"qc-8gen1":[1069,3224.812],"qc-8plus-gen1":[1134.715,3503.155],"qc-8gen2":[1426,4535.419],"qc-8gen3":[1364,null],"qc-8elite":[1866,8807.328],"qc-8elite-gen5":[1980.181,9072.147],"qc-8s-gen3":[1140.487,null],"qc-8s-gen4":[1204.819,null],"qc-7plus-gen3":[1074.893,null],"qc-780g":[820.151,2873.713],"mt-9000":[1098.16,3546.149],"mt-9200":[1374.465,3847.326],"mt-9300":[1362.312,null],"mt-9400":[2047.284,null],"mt-9500":[null,null],"mt-9600pro":[null,null],"mt-8200":[1012.036,3573.525],"nv-orin-agx":[752.863,5815.887],"nv-thor":[null,null],"nv-t239":[382.243,2298.756]};
test('指摘1: 既存の全プリセットの ST/MT は変更前と一致する(L3 未取得 null は従来の扱いのまま)', () => {
  Object.keys(BASE).forEach((id) => {
    const r = E.evaluate(design.fromPreset(D.presets.find((p) => p.id === id)), ctx);
    const got = [r.st.ok ? +r.st.score.toFixed(3) : null, r.mt.ok ? +r.mt.score.toFixed(3) : null];
    assert.deepStrictEqual(got, BASE[id], id);
  });
  // addedIn なしの元の 65 件(BASE)の値が変わらないこと。追加分(addedIn:'M5b'。件数が増えても)は BASE_M5B 側で固定する
  assert.strictEqual(Object.keys(BASE).length, 65);
  Object.keys(BASE).forEach((id) => assert.ok(D.presets.some((p) => p.id === id), 'BASE の ' + id + ' が無い'));
  assert.ok(D.presets.filter((p) => !p.addedIn).length === 65 && D.presets.every((p) => !!BASE[p.id] || p.addedIn === 'M5b'));
});

// 2026-10-29: mobile / mobile-pc の MT は持続クロック係数 0.81(設計書 §5.3.0)で更新(24 件。ST と pc の MT は不変)
// M5b 波1(13 件)+波2(9 件)の追加分の ST/MT を固定(追加時の初回値。公開値との差は設計書 §5.3.0 に記録)。null は計算不能
// 5800U は 2026-10-29 に最大ブースト 4.4GHz(公表。AMD 製品仕様)を入れたため、初回値 [834.035, 5912.618](boost 未取得でベース 1.9GHz 計算)から更新。さらに L3 16MB([二次]。設計書 §2.7.3、Notebookcheck)を入れて [1684.475, 11941.535](boost 4.4GHz・L3 未取得)から更新
// 2026-10-30: L3 容量を入れた 8 件(258V・256V・2600X・1500X・275HX・1200・2200G・EPYC 7401。Wikipedia 直接取得)の ST/MT を更新。GB7 との差は設計書 §5.3.0、旧値は f117357 の BASE_M5B
// 2026-10-30(M6 第 4 段): 12700K・13700K・14700K・12600K・13600K・14600K・14700HX・12100 の ST/MT を更新
// 2026-10-31(M6 第 5 段): Zen 3 デスクトップ 2 件(5600X・5950X)を追加(初回値。GB7 との差は設計書 §5.3.0)
// 2026-10-31(M6 第 5 段 E5): Snapdragon 8cx Gen 3(qc-8cx-gen3)を追加(初回値 [1188.55, 5554.659]。GB7 1315/6722 との差は ST -9.6% / MT -17.4%。設計書 §5.3.0)。Oryon Performance の l2KB を 3072→2048 に修正(8 Elite 系 3 件の MT のみ下がる。qc-8elite 10605.004→10554.884、qc-8elite-gen5 10958.045→10906.818、qc-8elite-x-gen6 11892.725→11837.519。ST・校正は不変。設計書 §5.3.0)
// 2026-11-05: Lion Cove の u 再校正(265K/285K の P boost 変更)で、Lion Cove 系(258V・256V・275HX・386H・378H・358H・325・320)の ST と、x86 平均 u を使うものの ST/MT(この表では計 20 件)を更新(詳細は上の BASE の注記と設計書 §5.3.0)
// 2026-11-06(全体を公式データに): 14700HX の range を ARK の定義 {45,157} に変え、MT の TDP 帯が 0(60W 以下、係数 0.69)→ 1(60W 超、0.76)に移ったため、14700HX の MT を 15235.23 → 16538.428 に更新(ST は不変。MT 誤差 +5.65% → +14.69%、判定 ok → ng)。ほかは不変
// 2026-11-05(未取得データの追加): 258V・256V の MT null → 9146.23、275HX の MT null → 24318.524(ARK で LP-E / E のクロックを取得して MT を計算できるようになった)。ほかは不変
const BASE_M5B = {"intel-ptl-u5-325":[2475.195,9297.615],"intel-wcl-c5-320":[2451.149,6859.425],"nv-gb10":[2282.523,18619.945],"intel-adl-12700k":[2269.74,15758.28],"intel-rpl-13700k":[2475,18804.876],"intel-rpl-14700k":[2569.559,20819.497],"intel-lnl-258v":[2388.515,8921.529],"amd-zenplus-2600x":[1257.914,5877.938],"amd-zen1-1500x":[1047.775,3840.254],"amd-zen4-7840hs":[2360.25,10028.358],"amd-zen3-5800u":[1878.169,7768.988],"qc-7gen3":[993.705,3305.681],"qc-7gen4":[null,null],"qc-7gen1":[871.118,3085.397],"qc-720g":[655.664,1701.839],"qc-8elite-x-gen6":[2131.746,9801.754],"intel-adl-12600k":[2258.267,13445.364],"intel-rpl-13600k":[2373.89,16031.818],"intel-ptl-x9-386h":[2717.024,16415.645],"intel-arl-275hx":[2747.971,23197.606],"amd-zen1-1200":[942.019,3170.469],"amd-raven-2400g":[1021.01,3363.105],"amd-raven-2200g":[975.84,3158.439],"qc-6gen1":[761.985,2802.649],"qc-4gen2":[791.264,1988.344],"intel-rpl-14600k":[2462.546,16473.512],"intel-rpl-14700hx":[2569.559,16099.758],"intel-adl-12100":[1969.212,7455.504],"intel-lnl-256v":[2388.515,8921.529],"intel-ptl-x9-378h":[2768.808,16765.335],"intel-ptl-x7-358h":[2665.102,15794.576],"amd-epyc-7401":[888.492,9539.328],"amd-zen3p-7735hs":[2012.661,8242.207],"amd-zen3-5600x":[2012.401,9757.876],"amd-zen3-5950x":[2133.827,18390.01],"qc-8cx-gen3":[1135.508,5055.704],"amd-kraken-350":[2694.581,10084.043]}; // 2026-11-05: MT の帯 0 係数 0.65 → 0.69 の再校正で、hx370(BASE)・325・320・5800u・14700hx・7735hs・kraken の MT を更新(旧値 11732.546 / 8945.613 / 6596.74 / 7905.687 / 14341.28 / 8393.862 / 9736.787)。ST は不変 // 2026-11-05(電力データ取得): 7840HS に range 35〜54W を入れたため MT の帯が 0.81(電力未取得のフォールバック)→ 0.69(帯 0)に変わり、MT 11589.846 → 10189.108(GB7 との差 -2.5% → -14.3%)。ST は不変。帯の係数は再校正していない
test('M5b 波1・波2: 追加分の ST/MT が固定値と一致し、追加分はすべて addedIn:M5b・calib:false', () => {
  const added = D.presets.filter((p) => p.addedIn === 'M5b');
  assert.deepStrictEqual(added.map((p) => p.id).sort(), Object.keys(BASE_M5B).sort());
  added.forEach((p) => {
    assert.strictEqual(p.calib, p.id === 'nv-gb10', p.id); // 2026-11-07: GB10 だけ意図して校正代表(calib:true。X925 の 2 件目)
    const r = E.evaluate(design.fromPreset(p), ctx);
    const got = [r.st.ok ? +r.st.score.toFixed(3) : null, r.mt.ok ? +r.mt.score.toFixed(3) : null];
    assert.deepStrictEqual(got, BASE_M5B[p.id], p.id);
  });
});

// 2026-10-31: Kraken Point(Ryzen AI 7 350。addedIn:'M5b'。C2 の例外)。初回値 ST 2694.581 / MT 9508.475(公表 GB7 2116 / 11354 との差は ST +27.3% / MT -16.3%。補正で合わせない)。
// GB7 は検索要約(原ページ未確認)。ダイ面積は未取得(Zen 5c の baseGHz は 2026-11-05 に取得済みで、電力モデルは校正できる)
test('Kraken Point: ST/MT が固定値で出て、公表値との差が出る。面積は未取得のまま歩留まりも未取得、電力は仮モデルで推定できる(2026-11-05 から)', () => {
  const p = D.presets.find((x) => x.id === 'amd-kraken-350');
  assert.strictEqual(p.addedIn, 'M5b'); assert.strictEqual(p.calib, false);
  const d = design.fromPreset(p);
  assert.strictEqual(d.dies[0].areaKnown, false);
  const r = E.evaluate(d, ctx);
  assert.deepStrictEqual([+r.st.score.toFixed(3), +r.mt.score.toFixed(3)], [2694.581, 10084.043]); // MT は 2026-11-05 の帯 0 再校正(0.65 → 0.69)で 9736.787 → 10245.686。2026-11-07: Zen 3 の代表(σ 0.0274→0.0289)で 10084.043
  assert.deepStrictEqual([r.st.published, r.mt.published], [2116, 11354]);
  assert.ok(/原ページ未確認/.test(r.st.publishedKind));
  assert.ok(Math.abs(r.st.errPct - 27.34) < 0.01 && Math.abs(r.mt.errPct + 11.19) < 0.01); /* 2026-11-07: Zen 3 の代表(σ の増加)で MT -9.76 → -11.19(ok → ng に反転) */ // MT は 2026-11-02 に -16.25 → -14.24(Zen 5c が Zen 5 の u を借りる。§5.3.3 K)、2026-11-05 に帯 0 再校正(0.65 → 0.69)で -9.76(判定は ng → ok)
  assert.strictEqual(r.area.totalMm2, null); assert.strictEqual(r.area.yield, null);
  assert.strictEqual(r.power.published.base.w, 28); assert.deepStrictEqual(r.power.published.range, { minW: 15, maxW: 54 });
  // 2026-11-05: Zen 5c の base 2.0GHz を TechPowerUp で取得したため、電力モデルは校正できる(旧: baseGHz 未取得で ok:false)。estW 162W は base 28W に合わせた仮モデルの全コア boost 推定で、公表ピークは未取得のため差は出ない
  assert.strictEqual(r.powerModel.ok, true); assert.strictEqual(r.powerModel.calibratedToW, 28); assert.strictEqual(r.powerModel.vsPublishedPeak, undefined);
  // 再現度パネル: 公開値が検索要約(原ページ未確認)なら注記が付き、判定(✗)は変わらない
  const rows = require('../js/ui/reproduce.js').reproductionRows(r);
  const st = rows.find((x) => /シングル/.test(x.label)); const mt = rows.find((x) => /マルチ/.test(x.label));
  // 2026-11-05: 帯 0 の再校正で MT は -9.76% となり許容内(ok)に反転(ST は ng のまま)。注記は判定によらず付く
  assert.strictEqual(st.verdict, 'ng'); assert.strictEqual(mt.verdict, 'ng'); // 2026-11-07: Zen 3 の代表で MT -11.19% となり ng に戻った
  [st, mt].forEach((x) => { assert.ok(x.note.includes('公開値は検索要約(原ページ未確認)'), x.note); });
});

test('M5b 波1: 追加分を足しても校正(σ・γ・uarch ごとの u・uIsa)は addedIn なしの元の 65 件だけの場合と完全に一致する', () => {
  const S = require('../js/sim/perf.js');
  // 2026-11-07: nv-gb10(addedIn:M5b)だけは意図して校正代表(calib:true)にしたので標本に含める(65 + 1 = 66 件)。ほかの M5b 追加分は校正に影響しない
  const only = D.presets.filter((p) => !p.addedIn || p.id === 'nv-gb10');
  assert.strictEqual(only.length, 66);
  const cal0 = S.calibrate(only, ctx.gb7ByName, ctx.uarch, 'rep', null);
  const cal = S.calibrateMt(only, ctx.gb7ByName, ctx.uarch, cal0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.cal)), JSON.parse(JSON.stringify(cal)));
});

test('M5b 波1: 部品ライブラリの既存 178 件は追加前と同じ(追加分の部品が増えるだけ。173 件は M3 Pro・M3 Max のコア追記 +4 件の前、2026-11-01。177 → 178 は 2026-11-05 に Orin の L3 6MB を取得して L3 の部品が +1)', () => {
  const before = BL.build(D.presets.filter((p) => !p.addedIn), areas, D.nodes);
  assert.strictEqual(before.length, 216); /* 2026-11-07(続き): 215 → 216(8 Gen 3 に l3MB 12 を入れたので L3 の部品が +1) */ // 2026-11-07: 178 → 215(SLC 全体を L3 相当として cfg.l3MB に入れた SoC 37 件〔Apple 23・Snapdragon 8・Dimensity 6〕の L3 の部品が +37。ユーザー指示「GPU 未実装なので SLC 全体を使えるように」)
  const byId = new Map(parts.map((p) => [p.id, p]));
  before.forEach((p) => assert.deepStrictEqual(byId.get(p.id), p, p.id));
  assert.ok(parts.length > 173);
});

test('指摘1: 混合設計で L3 を 0 → 1 → 4 → 30 MB と増やすと ST/MT は単調に増える(L3 なしは L3 の遅延を使わず DRAM へ)', () => {
  const base = add(mk('intel-7'), 'core:intel-adl-12900k:P', { count: 4 }); // Golden Cove ×4(ネイティブの Intel 7)
  const rs = [0, 1, 4, 30].map((mb) => E.evaluate(mb ? add(base, 'l3:intel-adl-12900k', { capacityMB: mb }) : base, ctx));
  assert.strictEqual(base.cfg.l3MB, 0);
  for (let i = 1; i < rs.length; i++) {
    assert.ok(rs[i].st.score >= rs[i - 1].st.score - 1e-9, 'ST ' + i);
    assert.ok(rs[i].mt.score >= rs[i - 1].mt.score - 1e-9, 'MT ' + i);
  }
  assert.ok(rs[3].st.score > rs[0].st.score * 1.1 && rs[3].mt.score > rs[0].mt.score * 1.1);
  assert.ok(rs[2].st.score > rs[1].st.score && rs[3].mt.score > rs[2].mt.score);
});

// 指摘2: 保存して開けなくなる設計を作らせない
test('指摘2: addPart はコアのグループ数 16 超・L3 合計 512 MB 超を断る。上限ちょうどは往復できる', () => {
  const ids = parts.filter((p) => p.kind === 'core' && p.isa === 'x86').map((p) => p.id);
  assert.ok(ids.length >= 16);
  let d = mk('tsmc-n4', 100, 100);
  for (let i = 0; i < 16; i++) d = add(d, ids[i]);
  assert.strictEqual(d.cfg.cores.length, 16);
  const over = design.addPart(d, P(ids[16] || ids[0]), {});
  if (ids[16]) { assert.strictEqual(over.ok, false); assert.ok(over.reason.includes('多すぎ')); }
  let r = design.parse(design.serialize(d)); assert.ok(r.ok, r.reason);
  // L3: 512 MB ちょうどまで置ける。1 MB 足すと断る
  let e = mk('tsmc-n4', 100, 100);
  e = add(e, 'l3:amd-zen5-9700x', { capacityMB: 256 }); e = add(e, 'l3:intel-adl-12900k', { capacityMB: 256 });
  assert.strictEqual(e.cfg.l3MB, 512);
  const o2 = design.addPart(e, P('l3:amd-zen5-9700x'), { capacityMB: 1 });
  assert.strictEqual(o2.ok, false); assert.ok(o2.reason.includes('512'));
  r = design.parse(design.serialize(e)); assert.ok(r.ok, r.reason);
});

// 指摘8: x86 + Arm の追加は既定で断る
test('指摘8: addPart は x86 と Arm のコアの混在を既定で断る(allowIsaMix:true のときだけ許す)', () => {
  const d = add(mk('tsmc-n4'), 'core:amd-zen5-9700x:P');
  const r = design.addPart(d, P('core:mt-9300:P'), {});
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'x86 と Arm のコアは同じ設計に混在できません(既定)');
  assert.ok(design.addPart(d, P('core:mt-9300:P'), { allowIsaMix: true }).ok);
  assert.ok(design.addPart(d, P('l3:amd-zen5-9700x'), {}).ok); // コア以外は対象外
});

// 指摘7: ISA 混在
test('指摘7: ST は置いた順で値が変わらない / MT はグループごとの isa で補正を引く / 混在中は数値を出さない', () => {
  // 補正の無い uarch(Gracemont = x86 の ISA 平均)と、Arm 側の補正の無い uarch を、順を変えて置く。混在 error では数値を出さない
  const a = addMixed(add(mk('tsmc-n4'), 'core:intel-adl-12900k:E'), 'core:mt-9300:P');
  const b = addMixed(add(mk('tsmc-n4'), 'core:mt-9300:P'), 'core:intel-adl-12900k:E');
  [a, b].forEach((x) => { const r = E.evaluate(x, ctx); assert.strictEqual(r.st.ok, false); assert.strictEqual(r.mt.ok, false); });
  // 混在を除けば: x86 のコア (E) と P を置く順を変えても ST/MT は同じ
  const x1 = add(add(mk('tsmc-n4'), 'core:intel-adl-12900k:E'), 'core:intel-adl-12900k:P');
  const x2 = add(add(mk('tsmc-n4'), 'core:intel-adl-12900k:P'), 'core:intel-adl-12900k:E');
  const r1 = E.evaluate(x1, ctx); const r2 = E.evaluate(x2, ctx);
  assert.ok(Math.abs(r1.st.score - r2.st.score) < 1e-9); assert.ok(Math.abs(r1.mt.score - r2.mt.score) < 1e-9);
  assert.ok(r1.st.chosen && r1.st.chosen.label && r1.st.chosen.fGHz > 0);
  // MT は ISA 平均の代用を使ったグループに corrSource:'isa' が付き、ラベルが入る
  assert.ok(r1.mt.detail.some((d) => d.corrSource === 'isa' && d.label));
});
test('指摘7: perf.stScore は core.isa を優先して ISA 平均の補正を引く', () => {
  const perf = require('../js/sim/perf.js');
  const core = { type: 'X', uarch: 'Gracemont', count: 1, boostGHz: 4, isa: 'arm' };
  const cal = { u: {}, uIsa: { x86: 1000, arm: 2000 } };
  const preset = { isa: 'x86', cfg: { cores: [core], l3MB: 0 } };
  const r = perf.stScore(preset, cal, D.uarch, { core, fGHz: 4 });
  assert.strictEqual(r.corr, 2000); assert.strictEqual(r.corrSource, 'isa');
});

// 指摘9: parse の混合ブロック検証
test('指摘9: parse は混合ブロックの不正な値を理由つきで拒否する', () => {
  let d = add(mk('tsmc-n4'), 'core:amd-zen5-9700x:P', { count: 2 }); d = add(d, 'l3:amd-zen5-9700x');
  const bad = (f) => { const x = design.clone(d); f(x); return design.parse(JSON.stringify(x)); };
  const cases = [
    ['1e6 GHz', (x) => { x.dies[0].blocks[0].clockGHz = 1e6; }],
    ['クロック 0.1', (x) => { x.dies[0].blocks[0].clockGHz = 0.1; }],
    ['-50 mm²', (x) => { x.dies[0].blocks[0].areaMm2 = -50; }],
    ['面積 1e5', (x) => { x.dies[0].blocks[0].areaMm2 = 1e5; }],
    ['-5 MB', (x) => { x.dies[0].blocks[2].capacityMB = -5; }],
    ['1000 MB', (x) => { x.dies[0].blocks[2].capacityMB = 1000; }],
    ['smt 3', (x) => { x.dies[0].blocks[0].smt = 3; }],
    ['isa 数値', (x) => { x.dies[0].blocks[0].isa = 5; }],
    ['sourcePresetId 数値', (x) => { x.dies[0].blocks[0].sourcePresetId = 5; }],
    ['ported 文字列', (x) => { x.dies[0].blocks[0].ported = 'yes'; }],
    ['portConverted 数値', (x) => { x.dies[0].blocks[0].portConverted = 1; }],
    ['重複 blockId', (x) => { x.origin.parts[1].blockId = x.origin.parts[0].blockId; }],
    ['存在しない blockId', (x) => { x.origin.parts[0].blockId = 'nope'; }],
  ];
  cases.forEach(([name, f]) => { const r = bad(f); assert.strictEqual(r.ok, false, name); assert.ok(r.reason && /[ぁ-ん]/.test(r.reason), name); });
  assert.ok(bad(() => {}).ok);
  // 種類ごとの個数: 同じ部品の L3 を 65 個
  const many = design.clone(d); const b2 = many.dies[0].blocks[2];
  for (let i = 0; i < 64; i++) { const c = design.clone(b2); c.id = 'x' + i; many.dies[0].blocks.push(c); many.origin.parts.push({ blockId: c.id, partId: c.partId, from: null, ported: false }); }
  assert.strictEqual(design.parse(JSON.stringify(many)).ok, false);
  // 非混合の設計は従来どおり
  assert.ok(design.parse(design.serialize(design.fromPreset(D.presets[0]))).ok);
});

// ---- M3b 再レビュー対応 ----
test('parse: 組み直した cfg の上限(L3 合計 512MB・グループ数 16)を超える混合設計は拒否', () => {
  let d = add(mk('tsmc-n4'), 'core:amd-zen5-9700x:P', { count: 2 });
  d = add(d, 'l3:amd-zen5-9700x');
  assert.ok(design.parse(design.serialize(d)).ok);
  const big = JSON.parse(JSON.stringify(d));
  const l3 = big.dies[0].blocks.find((b) => b.kind === 'l3'); l3.capacityMB = 300;
  const l3b = JSON.parse(JSON.stringify(l3)); l3b.id = 'l3extra'; big.dies[0].blocks.push(l3b);
  big.origin.parts.push({ blockId: 'l3extra', partId: l3b.partId, from: null, ported: false });
  const r = design.parse(JSON.stringify(big));
  assert.strictEqual(r.ok, false); assert.ok(/L3 の合計/.test(r.reason || JSON.stringify(r)), JSON.stringify(r));
  const many = JSON.parse(JSON.stringify(d));
  const c0 = many.dies[0].blocks.find((b) => b.kind === 'core');
  for (let i = 0; i < 17; i++) { const c = JSON.parse(JSON.stringify(c0)); c.id = 'g' + i; c.coreType = 'T' + i; c.partId = 'p' + i; many.dies[0].blocks.push(c); many.origin.parts.push({ blockId: c.id, partId: c.partId, from: null, ported: false }); }
  const r2 = design.parse(JSON.stringify(many));
  assert.strictEqual(r2.ok, false); assert.ok(/グループ/.test(r2.reason || JSON.stringify(r2)), JSON.stringify(r2));
});

test('design.js のソースに NUL 文字が残っていない', () => {
  const buf = require('fs').readFileSync(path.join(__dirname, '..', 'js', 'model', 'design.js'));
  assert.strictEqual(buf.indexOf(0), -1);
});

test('混合 Golden Cove×4: L3 0/1/4/30MB の ST/MT を固定(0 は noL3、1MB の MT は下限)', () => {
  const run = (mb) => {
    let d = add(mk('tsmc-n4'), 'core:intel-adl-12900k:P', { count: 4 });
    if (mb > 0) { d = add(d, 'l3:intel-adl-12900k'); d.dies[0].blocks.forEach((b) => { if (b.kind === 'l3') b.capacityMB = mb; }); d.cfg = design.deriveCfg(d); }
    return E.evaluate(d, ctx);
  };
  // 2026-10-30(M6 第 4 段): Golden Cove の専用 u(112.3)導入で更新(2026-11-01: 14700HX を標本から外して u=112.7、値を更新)。旧値 0:[1696.09,7116.76] 1:[1882.25,7116.76] 4:[2079.46,7322.60] 30:[2227.63,8695.52]
  // 2026-11-06: uCal 112.7→114.1(13900K・13700K の P boost を ARK の P コア最大ターボに揃えた再計算)で更新。旧 0:[1780.43,7470.68] 1:[1975.86,7470.68] 4:[2182.87,7686.76] 30:[2338.42,9127.95]
  // 2026-11-07: Zen 3 の代表を加えて x86 の ISA 平均 u(E コア Gracemont が使う)が 107.832→106.818 に動き、MT が変わった(ST は不変)。旧 MT 0/1:7563.48 4:7782.25 30:9241.34
  const exp = {0: [1802.55, 7497.09], 1: [2000.40, 7497.09], 4: [2209.99, 7713.94], 30: [2367.46, 9160.23]};
  const out = {};
  [0, 1, 4, 30].forEach((mb) => {
    const r = run(mb); out[mb] = r;
    assert.ok(Math.abs(r.st.score - exp[mb][0]) < 0.01, `ST ${mb}: ${r.st.score}`);
    assert.ok(Math.abs(r.mt.score - exp[mb][1]) < 0.01, `MT ${mb}: ${r.mt.score}`);
  });
  assert.strictEqual(out[0].st.noL3, true); assert.strictEqual(out[0].mt.noL3, true);
  assert.strictEqual(out[1].mt.l3Floor, true); assert.strictEqual(out[1].st.l3Floor, false);
  assert.strictEqual(out[30].mt.l3Floor, false); assert.strictEqual(out[4].mt.noL3, false);
  assert.ok(out[0].mt.score <= out[1].mt.score && out[1].mt.score <= out[4].mt.score && out[4].mt.score <= out[30].mt.score);
});

// 2026-11-01: Kraken Point の ST/MT 誤差の原因説明(errCause。設計書 §5.3.3 I)。再現度パネルの原因欄が未調査の定型文の代わりに調査結果を出す。他のプリセットは従来の文
test('errCause: Kraken Point だけ調査済みの原因説明が再現度パネルに出る。数値は変えない', () => {
  const RP = require('../js/ui/reproduce.js');
  const rows = (id) => RP.reproductionRows(E.evaluate(design.fromPreset(D.presets.find((x) => x.id === id), { mode: 'reproduce' }), ctx));
  const k = rows('amd-kraken-350');
  assert.ok(/原因\(調査済み\).*0\.90.*0\.92.*§5\.3\.3 I/.test(k[0].note), k[0].note);
  // 2026-11-05: 帯 0 の再校正(0.65 → 0.69)で Kraken Point の MT は許容内(ok、-9.76%)になり、原因欄は出なくなった(データ側の errCause.mt は残す)
  // 2026-11-07: Zen 3 の代表(σ の増加)で MT が -11.19% となり ng に戻り、原因欄(errCause.mt)が再び出る
  assert.strictEqual(k[1].verdict, 'ng');
  assert.ok(/原因\(調査済み\)/.test(k[1].note), k[1].note);
  const km = D.presets.find((x) => x.id === 'amd-kraken-350').errCause.mt;
  assert.ok(/0\.795/.test(km) && /0\.892/.test(km) && /-11\.2%/.test(km) && /ok → ng に戻った/.test(km)); // 2026-11-07: 一致係数 0.780 → 0.795(HX 370 は 0.869 → 0.892)
  assert.ok(!/未調査/.test(k[0].note + k[1].note));
  // 2026-11-01: モバイルの各 SKU(HX 370・395・5800U・7735HS・Panther Lake)にも errCause(設計書 §5.3.3 J)
  const h = rows('amd-strix-hx370');
  assert.ok(/原因\(調査済み\).*§5\.3\.3 J/.test(h[0].note), h[0].note);
  const z = rows('amd-zen4-7840hs'); // errCause なしで ST が許容外のものは従来の文のまま
  assert.ok(/原因: モデルの限界か入力データ不足\(未調査\)/.test(z[0].note), z[0].note);
  assert.strictEqual(+E.evaluate(design.fromPreset(D.presets.find((x) => x.id === 'amd-kraken-350')), ctx).st.score.toFixed(3), 2694.581);
});

// 2026-11-01: M3 Pro・M3 Max にコア数とクロックだけを追記(uarch なし)。ST/MT は計算不能のまま、理由が「コアなし」→「uarch 未指定」に変わる。他の全プリセットは不変(BASE で確認済み)
test('M3 系・A17 Pro: P コアは Everest 2nd gen(Everest から u を借りる)で ST が計算でき、E コアが未登録のため MT は計算できないまま(2026-11-02)', () => {
  // 2026-11-07: SLC 全体を L3 相当として cfg.l3MB に入れた(GPU 未実装のため)ので、A16 Everest の校正(u 172.55→150.13)が動き、誤差を更新(M3 Pro 5.9→4.4、M3 Max 5.6→9.1、M3 8.6→4.9、A17 Pro +11.8→-2.7)
  [['apple-m3pro', 6, 6, 4.4], ['apple-m3max', 12, 4, 9.1], ['apple-m3', 4, 4, 4.9], ['apple-a17pro', 2, 4, -2.7]].forEach(([id, nP, nE, err]) => {
    const p = D.presets.find((x) => x.id === id);
    const P = p.cfg.cores.find((c) => c.type === 'P'); const Ec = p.cfg.cores.find((c) => c.type === 'E');
    assert.deepStrictEqual([P.count, P.uarch, Ec.count, Ec.uarch], [nP, 'Everest 2nd gen', nE, undefined], id);
    const r = E.evaluate(design.fromPreset(p), ctx);
    assert.strictEqual(r.st.ok, true, id); assert.ok(Math.abs(r.st.errPct - err) < 0.06, id + ' ' + r.st.errPct);
    assert.strictEqual(r.st.corrSource, 'uarch', id);
    assert.strictEqual(r.mt.ok, false, id); assert.strictEqual(r.mt.reason, 'E コア: uarch 未指定', id);
  });
  assert.deepStrictEqual([D.uarch['Everest'].width, D.uarch['Everest'].rob, D.uarch['Everest 2nd gen'].width, D.uarch['Everest 2nd gen'].rob, D.uarch['Everest 2nd gen'].uFrom], [8, 274, 9, 321, 'Everest']);
});

// 2026-11-02: 再現度パネルの参考値(gb7Ref。判定外)。設計書 §5.3.3 J-7
test('参考値: HX 370・Kraken・A17 Pro の行に強い区分の順で最大 2 件。判定と差は公開値のままで、参考値には判定を付けない', () => {
  const RP = require('../js/ui/reproduce.js');
  const ev = (id) => E.evaluate(design.fromPreset(D.presets.find((x) => x.id === id), { mode: 'reproduce' }), ctx);
  const rows = (id) => RP.reproductionRows(ev(id));
  const hx = rows('amd-strix-hx370');
  assert.strictEqual(hx[0].refs.length, 2); assert.strictEqual(hx[1].refs.length, 1); // MT の推定は無い
  assert.ok(/^参考\(判定外\): 2,784\(Meigao F8BAC.*・転載\)$/.test(hx[0].refs[0].text), hx[0].refs[0].text);
  assert.ok(/2,567.*推定/.test(hx[0].refs[1].text));
  assert.strictEqual(hx[0].refs[1].text, '参考(判定外): 2,567(推定)', '機種ではなく推定のときは「推定」を重ねて書かない');
  assert.ok(Math.abs(hx[0].refs[0].diffPct - (2780.417 / 2784 - 1) * 100) < 0.01);
  assert.strictEqual(hx[0].verdict, 'ng'); assert.ok(Math.abs(hx[0].diffPct - 18.32) < 0.01); // 公開値 2350 に対する従来の判定と差
  assert.ok(hx[0].refs.every((x) => !('verdict' in x)));
  const kr = rows('amd-kraken-350');
  assert.ok(/Framework Laptop 13.*転載/.test(kr[0].refs[0].text) && /2,567/.test(kr[0].refs[0].text));
  const a17 = rows('apple-a17pro');
  assert.strictEqual(a17[0].refs.length, 1); assert.ok(/2,688.*個別投稿/.test(a17[0].refs[0].text));
  // 2026-11-07: SLC 24MB 全体を A16 の L3 相当に入れて Everest の u が動き、A17 Pro の ST は 2824.8 → 2457.8。参考との差は 2457.786/2688-1 = -8.6%(旧 +5.1%)、公開値 2527 との差は -2.7%(旧 +11.8%、ng→ok)
  assert.ok(Math.abs(a17[0].refs[0].diffPct - (2457.786 / 2688 - 1) * 100) < 0.1); // 参考との差(判定ではない)。公開値との差 -2.7% は別に残る
  assert.ok(Math.abs(a17[0].diffPct - -2.7) < 0.1);
  assert.deepStrictEqual(rows('amd-zen5-9700x')[0].refs, []); // 参考値なし
});

test('参考値: 3 件以上あっても最大 2 件(個別投稿 → 転載 → 推定の順)。編集後の設計には出ない。評価値は参考値の有無で変わらない', () => {
  const p = D.presets.find((x) => x.id === 'amd-strix-hx370'); const keep = p.gb7Ref;
  const before = E.evaluate(design.fromPreset(p), ctx);
  p.gb7Ref = [{ st: 1, mt: 1, device: 'a', kind: '推定', source: '', note: '' }, { st: 2, mt: 2, device: 'b', kind: '転載', source: '', note: '' }, { st: 3, mt: 3, device: 'c', kind: '個別投稿', source: '', note: '' }, { st: 'x', device: 'd', kind: '転載' }];
  try {
    const r = E.evaluate(design.fromPreset(p), ctx);
    assert.deepStrictEqual(r.st.refs.map((x) => x.kind), ['個別投稿', '転載']);
    assert.deepStrictEqual([r.st.score, r.mt.score, r.st.errPct, r.mt.errPct], [before.st.score, before.mt.score, before.st.errPct, before.mt.errPct]);
    p.gb7Ref = undefined; const r0 = E.evaluate(design.fromPreset(p), ctx); assert.deepStrictEqual(r0.st.refs, []);
    assert.deepStrictEqual([r0.st.score, r0.mt.score, r0.st.errPct], [before.st.score, before.mt.score, before.st.errPct]);
  } finally { p.gb7Ref = keep; }
  const u = design.unlock(design.fromPreset(p)); const e = design.setCoreCount(u, 'P', 2); assert.ok(e.ok);
  const re = E.evaluate(e.design, ctx); assert.strictEqual(re.edited, true); assert.deepStrictEqual(re.st.refs, []);
  // gb7Ref の値は区分・件数ごとに型を固定: 数値でないものは出ない
  D.presets.filter((x) => x.gb7Ref).forEach((x) => x.gb7Ref.forEach((g) => { assert.ok(['個別投稿', '転載', '推定'].includes(g.kind), x.id); assert.ok(typeof g.device === 'string' && g.device && typeof g.source === 'string' && g.source, x.id); assert.ok(typeof g.st === 'number' || typeof g.mt === 'number', x.id); }));
});

// 2026-11-07: GB10 は意図して Cortex-X925 の 2 件目の校正代表にした(ユーザー選択「X925 の校正に GB10 も加える」。calib:true)。旧テスト「GB10(GB7 なし)は校正に影響しない」は前提が変わったので置き換えた:
// GB10 を除くと X925 の u は Dimensity 9400 だけの値 81.389 に戻り、含めると 9400 と GB10 の 2 件の中央値 95.707(n=2)になる。X925 以外の u(Firestorm など)は GB10 の有無で変わらない
test('GB10(addedIn:M5b・calib:true)は Cortex-X925 の 2 件目の代表: 含めると X925 の u が 81.389 → 95.707(n=2)になり、ほかの u は変わらない', () => {
  const S = require('../js/sim/perf.js');
  const without = D.presets.filter((p) => p.id !== 'nv-gb10');
  assert.strictEqual(without.length, D.presets.length - 1);
  const cal0 = S.calibrate(without, ctx.gb7ByName, ctx.uarch, 'rep', null);
  assert.ok(Math.abs(cal0.u['Cortex-X925'] - 81.389) < 0.001); assert.deepStrictEqual(cal0.usedPresets['Cortex-X925'], ['mt-9400']);
  assert.ok(Math.abs(ctx.cal.u['Cortex-X925'] - 95.707) < 0.001); assert.deepStrictEqual(ctx.cal.usedPresets['Cortex-X925'], ['mt-9400', 'nv-gb10']); assert.strictEqual(ctx.cal.n['Cortex-X925'], 2);
  Object.keys(cal0.u).filter((k) => k !== 'Cortex-X925').forEach((k) => assert.strictEqual(ctx.cal.u[k], cal0.u[k], k));
});

test('Core Ultra 5 325・Core 5 320(addedIn:M5b・calib:false)は校正に影響しない: 2 件を除いた標本の校正結果が ctx.cal と一致する', () => {
  const S = require('../js/sim/perf.js');
  const ids = ['intel-ptl-u5-325', 'intel-wcl-c5-320'];
  const without = D.presets.filter((p) => !ids.includes(p.id));
  assert.strictEqual(without.length, D.presets.length - 2);
  const cal0 = S.calibrate(without, ctx.gb7ByName, ctx.uarch, 'rep', null);
  const cal = S.calibrateMt(without, ctx.gb7ByName, ctx.uarch, cal0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.cal)), JSON.parse(JSON.stringify(cal)));
});
