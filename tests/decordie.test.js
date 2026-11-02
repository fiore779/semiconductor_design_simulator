'use strict';
// 飾りの IO ダイ(design.decorDies)のテスト。IOD のデータが無い Zen 3 の CCD 単独のプリセット(5600X・5950X)に、見た目だけの IO ダイを出す。
// dies には入れないので、ダイ数・面積・歩留まり・電力・熱・ヒートマップの按分には影響しない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const FP = require('../js/model/floorplan.js');
const geom = require('../js/render/geom.js');
const G = require('../js/render/pkggeom.js');
const HM = require('../js/sim/heatmap.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const IDS = ['amd-zen3-5600x', 'amd-zen3-5950x'];

test('飾りのダイが付くのは、IOD のデータが無い Zen 3 の CCD 単独(5600X・5950X。IOD)と Panther Lake(GPU・Platform タイル)だけ。ほかには付かない', () => {
  const have = D.presets.filter((p) => mk(p.id).decorDies).map((p) => p.id).sort();
  const PTL = ['intel-ptl-x9-388h', 'intel-ptl-x9-386h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h']; // Intel Panther Lake の GPU・Platform タイル(飾り)
  assert.deepStrictEqual(have, IDS.concat(PTL).sort());
  assert.ok(!mk('amd-zen4-7700').decorDies); assert.ok(!mk('amd-zen5-9950x').decorDies); assert.ok(!mk('intel-adl-12900k').decorDies);
  const d = mk('amd-zen3-5950x'); const x = d.decorDies[0];
  assert.strictEqual(d.dies.length, byId('amd-zen3-5950x').dies.length); // ダイ数は変わらない
  assert.strictEqual(x.kind, 'iod'); assert.strictEqual(x.areaMm2, 125); assert.ok(Math.abs(x.widthMm * x.heightMm - 125) < 1e-9);
  assert.ok(Math.abs(x.widthMm / x.heightMm - 1.4) < 1e-9);
  assert.strictEqual(x.sizeBasis.s, 'pub'); assert.ok(x.sizeBasis.source.includes('125 mm²'));
  assert.ok(x.label.includes('飾り') && x.label.includes('参考'));
  // CCD の下側中央
  const ccd = d.dies[0];
  assert.ok(x.y >= ccd.y + ccd.heightMm); assert.ok(Math.abs((x.x + x.widthMm / 2) - (ccd.x + ccd.widthMm / 2)) < 1e-6);
  assert.ok(x.x >= -1e-9 && ccd.x >= -1e-9);
  assert.deepStrictEqual(design.validate(d), []);
  // 5600X(CCD 1 つ)も同様
  assert.strictEqual(mk('amd-zen3-5600x').decorDies.length, 1);
});

test('評価は decorDies の有無で完全に同じ(全プリセット)。ヒートマップの電力按分にも入らない', () => {
  const ctx = E.makeContext();
  D.presets.forEach((p) => {
    const d = mk(p.id); const bare = JSON.parse(JSON.stringify(d)); delete bare.decorDies;
    assert.deepStrictEqual(E.evaluate(d, ctx), E.evaluate(bare, ctx), p.id);
  });
  const d = mk('amd-zen3-5950x');
  const r = HM.blockPowers(d, 100);
  assert.deepStrictEqual(Object.keys(r.byBlock).sort(), d.dies.reduce((a, die) => a.concat(die.blocks.map((b) => b.id)), []).sort());
  const g = HM.powerDensityGrid(d, r.byBlock);
  assert.strictEqual(g.grids.length, d.dies.length);
});

test('保存と読込: 往復で保存され、複製・ロック解除・コア数の編集でも残る。古い設計(欄なし)はそのまま読める', () => {
  const d = mk('amd-zen3-5950x');
  const r = design.parse(design.serialize(d)); assert.ok(r.ok);
  assert.deepStrictEqual(r.design.decorDies, d.decorDies);
  assert.deepStrictEqual(design.clone(d).decorDies, d.decorDies);
  const u = design.unlock(d); assert.deepStrictEqual(u.decorDies, d.decorDies);
  const e = design.setCoreCount(u, u.cfg.cores[0].type, 8); assert.ok(e.ok); assert.deepStrictEqual(e.design.decorDies, d.decorDies);
  const old = JSON.parse(JSON.stringify(d)); delete old.decorDies;
  assert.ok(design.parse(JSON.stringify(old)).ok);
});

test('検証: 型・個数・数値範囲・id の重複・混合設計への混入・悪意のある JSON を拒否し、例外にならない', () => {
  const base = mk('amd-zen3-5950x');
  const bad = (f) => { const d = JSON.parse(JSON.stringify(base)); f(d); let r; assert.doesNotThrow(() => { r = design.parse(JSON.stringify(d)); }); return r; };
  assert.strictEqual(bad(() => {}).ok, true);
  assert.strictEqual(bad((d) => { d.decorDies = 'x'; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies = {}; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies = Array(5).fill(0).map((_, i) => Object.assign({}, d.decorDies, { id: 'q' + i })); }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies = [null]; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].kind = 'die'; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].id = d.dies[0].id; }).ok, false); // ダイの id と重複
  assert.strictEqual(bad((d) => { d.decorDies[0].id = d.dies[0].blocks[0].id; }).ok, false); // ブロックの id と重複
  assert.strictEqual(bad((d) => { d.decorDies[0].label = { toString: 1 }; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].label = 'x'.repeat(81); }).ok, false);
  ['x', 'y', 'widthMm', 'heightMm', 'areaMm2'].forEach((k) => assert.strictEqual(bad((d) => { d.decorDies[0][k] = 'a'; }).ok, false, k));
  assert.strictEqual(bad((d) => { d.decorDies[0].widthMm = 0; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].widthMm = 1e6; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].x = 1e9; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].areaMm2 = -1; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].areaMm2 = null; }).ok, true);
  assert.strictEqual(bad((d) => { d.decorDies[0].areaMm2 = 20000; }).ok, false); // 上限 10000 以下
  assert.strictEqual(bad((d) => { d.decorDies[0].areaMm2 = 120; }).ok, false); // 幅×高さと 1% 以上ずれる
  assert.strictEqual(bad((d) => { d.decorDies[0].areaMm2 = 125.5; }).ok, true); // 1% 以内
  assert.strictEqual(bad((d) => { d.dies.forEach((x) => { delete x.layout; }); }).ok, false); // AMD チップレット以外の設計には付けられない
  assert.strictEqual(bad((d) => { d.decorDies[0].sizeBasis = 5; }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].sizeBasis.source = 'x'.repeat(301); }).ok, false);
  assert.strictEqual(bad((d) => { d.decorDies[0].sizeBasis.note = { toString: 1 }; }).ok, false);
  // 混合設計・D モードには入れられない
  const mix = design.fromScratch({ name: 'm' }); mix.decorDies = JSON.parse(JSON.stringify(base.decorDies));
  assert.strictEqual(design.parse(JSON.stringify(mix)).ok, false);
  // __proto__ を含む JSON でも、受け入れた設計のプロトタイプは汚染されない
  const evil = JSON.stringify(base).replace('"kind":"iod"', '"kind":"iod","__proto__":{"polluted":1}');
  design.parse(evil); assert.strictEqual({}.polluted, undefined);
});

test('2D: ヒットテストは飾りのダイを対象にしない(選択・ハンドル・ダイのどれにもならない)。表示範囲には含める', () => {
  const d = mk('amd-zen3-5950x'); const x = d.decorDies[0];
  const view = { x: 0, y: 0, zoom: 10 };
  const cx = (x.x + x.widthMm / 2) * view.zoom; const cy = (x.y + x.heightMm / 2) * view.zoom;
  assert.strictEqual(geom.hitTest(d, view, cx, cy, { selectedIds: [] }), null);
  assert.strictEqual(geom.hitTest(d, view, cx, cy, { selectedIds: [d.dies[0].blocks[0].id] }), null);
  const f = geom.fit(d.dies.concat(d.decorDies), 800, 600, 40); const f0 = geom.fit(d.dies, 800, 600, 40);
  assert.ok(f.zoom < f0.zoom, '飾りのダイを含めると表示範囲が広がる');
});

test('3D: 基板・蓋・外接に飾りのダイが含まれ、頂点が増える。選択・光線交差の対象外', () => {
  const d = mk('amd-zen3-5950x'); const bare = JSON.parse(JSON.stringify(d)); delete bare.decorDies;
  const s = G.buildScene(d, {}); const s0 = G.buildScene(bare, {});
  assert.strictEqual(s.counts.decor, 1); assert.strictEqual(s0.counts.decor, 0); assert.strictEqual(s.counts.dies, s0.counts.dies);
  assert.ok(s.opaque.length > s0.opaque.length); assert.ok(s.shadow.length > s0.shadow.length);
  const x = d.decorDies[0];
  assert.ok(s.sub.z1 > x.y + x.heightMm); assert.ok(s.sub.z1 > s0.sub.z1, '基板が飾りのダイぶん広がる');
  assert.ok(s.ihs.z1 >= x.y + x.heightMm && s.ihs.x0 <= x.x);
  const b = G.designBounds(d); assert.ok(b.box.z1 > G.designBounds(bare).box.z1);
  // 真上からの光線は飾りのダイの上では何にも当たらない(ダイ・ブロックではない)
  const ray = { o: [x.x + x.widthMm / 2, 50, x.y + x.heightMm / 2], d: [0, -1, 0] };
  assert.strictEqual(G.pickTop(ray, d.dies, { decor: d.decorDies }), null);
  // 飾りのダイは通常のダイより低い
  assert.ok(G.DECOR_H < 1);
});

test('注記: 飾りの IO ダイの大きさは AMD 公表値 125mm²(参考。評価には含まない)', () => {
  const d = mk('amd-zen3-5950x');
  const t = FP.decorNote(d.decorDies); assert.ok(t.includes('AMD 公表値 125mm²') && t.includes('参考') && t.includes('評価には含まない') && t.includes('縦横比は写真の目測'));
  assert.strictEqual(FP.decorNote(undefined), null);
  // 「AMD 公表値」は区分が pub のときだけ。面積が null でも「飾り・評価には含まない」は出す
  const x = JSON.parse(JSON.stringify(d.decorDies)); x[0].sizeBasis.s = 'sec';
  assert.ok(!FP.decorNote(x).includes('AMD 公表値') && FP.decorNote(x).includes('参考値 125mm²'));
  x[0].areaMm2 = null; const n2 = FP.decorNote(x); assert.ok(n2.includes('飾り') && n2.includes('評価には含まない') && !n2.includes('AMD'));
});
