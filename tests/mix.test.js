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
  const iod = parts.find((p) => p.id === 'uncore:amd-zen5-9700x:1');
  assert.ok(iod); assert.strictEqual(iod.area.origin, 'unknown'); assert.strictEqual(iod.area.mm2, null);
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
  let d = mk('tsmc-n6'); d = add(d, 'uncore:amd-zen5-9700x:1');
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
  let d = mk('tsmc-n6'); d = add(d, 'uncore:amd-zen5-9700x:1');
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
// 2026-10-31: ST の L3 を 1 CCD 分にしたため 7950X・9950X・395(BASE)と 5950X(BASE_M5B)の ST を更新(旧値 2728.973 / 3165.364 / 2844.253 / 2289.758。MT は不変。設計書 §5.3.3 G の3)
// 2026-10-30(M6 第 4 段): Golden/Raptor Cove の専用 u 導入で 12900K・13900K・14900K の ST/MT を更新(旧値は設計書 §5.3.0 の M6 第 4 段)。他は不変
const BASE = {"intel-adl-12900k":[2338.415,18240.502],"intel-rpl-13900k":[2675.373,17915.34],"intel-rpl-14900k":[2586.937,22974.907],"intel-arl-285k":[2843.719,30838.606],"intel-arl-265k":[2737,23909.21],"intel-mtl-185h":[2196.054,12507.188],"intel-lnl-268v":[2438.178,null],"intel-ptl-x9-388h":[2834.786,null],"amd-zen1-1800x":[1126,6449.595],"amd-zenplus-2700x":[1435.632,8005.837],"amd-zen3-5800x":[2154.757,12562.96],"amd-zen4-7700":[2503,15164.404],"amd-zen4-7950x":[2680.434,24530.897],"amd-zen5-9700x":[3010,18350.075],"amd-zen5-9950x":[3113.309,28827.567],"amd-strix-hx370":[2780.417,11732.546],"amd-strixhalo-395":[2802.154,20887.487],"apple-a12":[null,null],"apple-a13":[null,null],"apple-a14":[2053.875,null],"apple-a15":[2050.705,null],"apple-a16":[2352,null],"apple-a17pro":[null,null],"apple-a18":[null,null],"apple-a18pro":[null,null],"apple-a19pro":[null,null],"apple-a20pro":[null,null],"apple-m1":[2169,null],"apple-m1pro":[2184.935,null],"apple-m1max":[2184.935,null],"apple-m1ultra":[null,null],"apple-m2":[2366,null],"apple-m2pro":[null,null],"apple-m2max":[null,null],"apple-m2ultra":[null,null],"apple-m3":[null,null],"apple-m3pro":[null,null],"apple-m3max":[null,null],"apple-m4":[null,null],"apple-m4pro":[null,null],"apple-m5":[null,null],"apple-m5max":[null,null],"qc-855":[678.057,2163.486],"qc-865":[866.18,2643.422],"qc-888":[1135.605,2911.35],"qc-8gen1":[1069,3173.94],"qc-8plus-gen1":[1128.944,3453.119],"qc-8gen2":[1426,4451.083],"qc-8gen3":[1364,null],"qc-8elite":[1866,10554.884],"qc-8elite-gen5":[1970.9,10906.818],"qc-8s-gen3":[1258.063,null],"qc-8s-gen4":[1332.54,null],"qc-7plus-gen3":[1185.707,null],"qc-780g":[789.293,2559.297],"mt-9000":[1084.098,3445.753],"mt-9200":[1372.797,3754.246],"mt-9300":[1346.556,null],"mt-9400":[1741,null],"mt-9500":[null,null],"mt-9600pro":[null,null],"mt-8200":[973.959,3187.363],"nv-orin-agx":[733.317,6763.312],"nv-thor":[null,null],"nv-t239":[405.727,2461.591]};
test('指摘1: 既存の全プリセットの ST/MT は変更前と一致する(L3 未取得 null は従来の扱いのまま)', () => {
  Object.keys(BASE).forEach((id) => {
    const r = E.evaluate(design.fromPreset(D.presets.find((p) => p.id === id)), ctx);
    const got = [r.st.ok ? +r.st.score.toFixed(3) : null, r.mt.ok ? +r.mt.score.toFixed(3) : null];
    assert.deepStrictEqual(got, BASE[id], id);
  });
  // 追加(M5b)で件数が増えても、BASE の 65 件がすべて存在して値が一致していること
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
const BASE_M5B = {"intel-adl-12700k":[2241.89,15911.376],"intel-rpl-13700k":[2488.745,19274.98],"intel-rpl-14700k":[2538.03,21198.112],"intel-lnl-258v":[2346.851,null],"amd-zenplus-2600x":[1405.2,6649.851],"amd-zen1-1500x":[1047.775,3874.26],"amd-zen4-7840hs":[2360.25,11589.846],"amd-zen3-5800u":[1971.261,7905.687],"qc-7gen3":[1054.755,3169.268],"qc-7gen4":[null,null],"qc-7gen1":[924.637,2956.526],"qc-720g":[567.715,1457.096],"qc-8elite-x-gen6":[2108.635,11837.519],"intel-adl-12600k":[2230.558,13548.133],"intel-rpl-13600k":[2344.762,16241.612],"intel-ptl-x9-386h":[2730.829,16763.524],"intel-arl-275hx":[2700.37,null],"amd-zen1-1200":[942.019,3183.718],"amd-raven-2400g":[1021.01,3392.886],"amd-raven-2200g":[975.84,3171.638],"qc-6gen1":[733.317,2494.332],"qc-4gen2":[733.317,1744.831],"intel-rpl-14600k":[2432.331,16688.298],"intel-rpl-14700hx":[2538.03,14341.28],"intel-adl-12100":[1945.05,7429.236],"intel-lnl-256v":[2346.851,null],"intel-ptl-x9-378h":[2782.876,17120.624],"intel-ptl-x7-358h":[2678.643,16129.293],"amd-epyc-7401":[888.492,9834.905],"amd-zen3p-7735hs":[2112.419,8393.862],"amd-zen3-5600x":[2112.146,10372.049],"amd-zen3-5950x":[2239.59,19789.438],"qc-8cx-gen3":[1188.55,5554.659],"amd-kraken-350":[2694.581,9736.787]};
test('M5b 波1・波2: 追加分の ST/MT が固定値と一致し、追加分はすべて addedIn:M5b・calib:false', () => {
  const added = D.presets.filter((p) => p.addedIn === 'M5b');
  assert.deepStrictEqual(added.map((p) => p.id).sort(), Object.keys(BASE_M5B).sort());
  added.forEach((p) => {
    assert.strictEqual(p.calib, false, p.id);
    const r = E.evaluate(design.fromPreset(p), ctx);
    const got = [r.st.ok ? +r.st.score.toFixed(3) : null, r.mt.ok ? +r.mt.score.toFixed(3) : null];
    assert.deepStrictEqual(got, BASE_M5B[p.id], p.id);
  });
});

// 2026-10-31: Kraken Point(Ryzen AI 7 350。addedIn:'M5b'。C2 の例外)。初回値 ST 2694.581 / MT 9508.475(公表 GB7 2116 / 11354 との差は ST +27.3% / MT -16.3%。補正で合わせない)。
// GB7 は検索要約(原ページ未確認)。ダイ面積は未取得、Zen 5c の baseGHz が未取得のため電力モデルは校正できない(公表値の範囲のみ)
test('Kraken Point: ST/MT が固定値で出て、公表値との差が出る。面積は未取得のまま歩留まりも未取得、電力は推定できない', () => {
  const p = D.presets.find((x) => x.id === 'amd-kraken-350');
  assert.strictEqual(p.addedIn, 'M5b'); assert.strictEqual(p.calib, false);
  const d = design.fromPreset(p);
  assert.strictEqual(d.dies[0].areaKnown, false);
  const r = E.evaluate(d, ctx);
  assert.deepStrictEqual([+r.st.score.toFixed(3), +r.mt.score.toFixed(3)], [2694.581, 9736.787]);
  assert.deepStrictEqual([r.st.published, r.mt.published], [2116, 11354]);
  assert.ok(/原ページ未確認/.test(r.st.publishedKind));
  assert.ok(Math.abs(r.st.errPct - 27.34) < 0.01 && Math.abs(r.mt.errPct + 14.24) < 0.01); // MT は 2026-11-02 に -16.25 → -14.24(Zen 5c が Zen 5 の u を借りる。§5.3.3 K)
  assert.strictEqual(r.area.totalMm2, null); assert.strictEqual(r.area.yield, null);
  assert.strictEqual(r.power.published.base.w, 28); assert.deepStrictEqual(r.power.published.range, { minW: 15, maxW: 54 });
  assert.strictEqual(r.powerModel.ok, false);
  // 再現度パネル: 公開値が検索要約(原ページ未確認)なら注記が付き、判定(✗)は変わらない
  const rows = require('../js/ui/reproduce.js').reproductionRows(r);
  const st = rows.find((x) => /シングル/.test(x.label)); const mt = rows.find((x) => /マルチ/.test(x.label));
  [st, mt].forEach((x) => { assert.strictEqual(x.verdict, 'ng'); assert.ok(x.note.includes('公開値は検索要約(原ページ未確認)'), x.note); });
});

test('M5b 波1: 追加分を足しても校正(σ・γ・uarch ごとの u・uIsa)は既存 65 件だけの場合と完全に一致する', () => {
  const S = require('../js/sim/perf.js');
  const only = D.presets.filter((p) => !p.addedIn);
  assert.strictEqual(only.length, 65);
  const cal0 = S.calibrate(only, ctx.gb7ByName, ctx.uarch, 'rep', null);
  const cal = S.calibrateMt(only, ctx.gb7ByName, ctx.uarch, cal0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.cal)), JSON.parse(JSON.stringify(cal)));
});

test('M5b 波1: 部品ライブラリの既存 177 件は追加前と同じ(追加分の部品が増えるだけ。173 件は M3 Pro・M3 Max のコア追記 +4 件の前、2026-11-01)', () => {
  const before = BL.build(D.presets.filter((p) => !p.addedIn), areas, D.nodes);
  assert.strictEqual(before.length, 177);
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
  const exp = {0: [1780.43, 7470.68], 1: [1975.86, 7470.68], 4: [2182.87, 7686.76], 30: [2338.42, 9127.95]};
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
  assert.ok(/原因\(調査済み\).*0\.780/.test(k[1].note), k[1].note);
  assert.ok(!/未調査/.test(k[0].note + k[1].note));
  // 2026-11-01: モバイルの各 SKU(HX 370・395・5800U・7735HS・Panther Lake)にも errCause(設計書 §5.3.3 J)
  const h = rows('amd-strix-hx370');
  assert.ok(/原因\(調査済み\).*§5\.3\.3 J/.test(h[0].note), h[0].note);
  const z = rows('amd-zen4-7840hs'); // errCause なしで ST が許容外のものは従来の文のまま
  assert.ok(/原因: モデルの限界か入力データ不足\(未調査\)/.test(z[0].note), z[0].note);
  assert.strictEqual(+E.evaluate(design.fromPreset(D.presets.find((x) => x.id === 'amd-kraken-350')), ctx).st.score.toFixed(3), 2694.581);
});

// 2026-11-01: M3 Pro・M3 Max にコア数とクロックだけを追記(uarch なし)。ST/MT は計算不能のまま、理由が「コアなし」→「uarch 未指定」に変わる。他の全プリセットは不変(BASE で確認済み)
test('M3 Pro・M3 Max: コア数とクロックがあり、ST/MT は uarch 未指定で計算できないまま', () => {
  [['apple-m3pro', 6, 6], ['apple-m3max', 12, 4]].forEach(([id, nP, nE]) => {
    const p = D.presets.find((x) => x.id === id);
    assert.deepStrictEqual(p.cfg.cores.map((c) => [c.type, c.count, c.maxGHz, c.uarch]), [['P', nP, 4.05, undefined], ['E', nE, 2.75, undefined]], id);
    const r = E.evaluate(design.fromPreset(p), ctx);
    assert.strictEqual(r.st.ok, false, id); assert.strictEqual(r.st.reason, 'uarch 未指定', id);
    assert.strictEqual(r.mt.ok, false, id); assert.strictEqual(r.mt.reason, 'P コア: uarch 未指定', id);
  });
});
