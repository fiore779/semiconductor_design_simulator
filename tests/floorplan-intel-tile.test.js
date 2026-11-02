'use strict';
// Intel タイル型(x86-tile)の Compute タイルを注釈つきダイ写真の目測に倣って配置するテスト。配置・大きさは目測で、実チップのフロアプランではない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const comp = (id) => mk(id).dies.find((x) => x.layout);

const PHOTO = { 'intel-mtl-185h': 'mtl-compute', 'intel-arl-285k': 'arl-compute', 'intel-lnl-268v': 'lnl-compute', 'intel-ptl-x9-388h': 'ptl-compute' };
const REUSE = { 'intel-ptl-x9-386h': 'ptl-compute', 'intel-ptl-x9-378h': 'ptl-compute', 'intel-ptl-x7-358h': 'ptl-compute', 'intel-arl-265k': 'arl-compute', 'intel-arl-275hx': 'arl-compute', 'intel-lnl-258v': 'lnl-compute', 'intel-lnl-256v': 'lnl-compute' };

test('Intel タイル: photo 4 件・reuse 7 件は x86-tile + 枠、scaleNote は 600 字以内で「目測」「推定」を含む', () => {
  Object.keys(PHOTO).forEach((id) => { const l = comp(id).layout; assert.strictEqual(l.template, 'x86-tile', id); assert.strictEqual(l.scaleBasis, 'photo', id); assert.strictEqual(l.frame, PHOTO[id], id); });
  Object.keys(REUSE).forEach((id) => { const l = comp(id).layout; assert.strictEqual(l.template, 'x86-tile', id); assert.strictEqual(l.scaleBasis, 'reuse', id); assert.strictEqual(l.frame, REUSE[id], id); });
  Object.keys(PHOTO).concat(Object.keys(REUSE)).forEach((id) => {
    const l = comp(id).layout; assert.ok(l.scaleNote.length <= 600, `${id} ${l.scaleNote.length}`);
    assert.ok(l.scaleNote.includes('目測') && l.scaleNote.includes('推定'), id);
    assert.strictEqual(FP.checkLayout(l), null, id);
  });
});

test('Intel タイル: ダイ面積は公表値のまま・縦横比は写真の枠・コア数が一致・ブロックはダイ内で重ならない', () => {
  Object.keys(PHOTO).concat(Object.keys(REUSE)).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = comp(id);
    assert.strictEqual(d.dies.length, p.dies.length, id);
    const src = p.dies.find((x) => typeof x.mm2 === 'number' && /Compute/.test(x.name));
    assert.strictEqual(die.areaMm2, src.mm2, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - src.mm2) < 1e-6, id);
    const fr = FP.TILE_FRAMES[die.layout.frame];
    assert.ok(Math.abs(die.widthMm / die.heightMm / fr.aspect - 1) < 1e-6, id);
    const want = p.cfg.cores.reduce((s, g) => s + g.count, 0);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'core').length, want, id);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'l3').length, 1, id);
    assert.deepStrictEqual(design.validate(d), [], id);
    die.blocks.forEach((b) => { if (b.decorative) assert.ok(['uncore', 'gpu', 'npu'].includes(b.kind), id); else assert.ok(['core', 'l3'].includes(b.kind), id); });
  });
});

test('Intel タイル: ダイの縦横比(285K 1.92、268V 1.90、388H 1.77、185H 1.10)とタイルごとのコア数の枠', () => {
  const r = (id) => { const x = comp(id); return x.widthMm / x.heightMm; };
  assert.ok(Math.abs(r('intel-arl-285k') - 1.925) < 0.01);
  assert.ok(Math.abs(r('intel-lnl-268v') - 1.899) < 0.01);
  const pn = comp('intel-ptl-x9-388h').layout.scaleNote; assert.ok(pn.includes('縮尺の注記はなく') && pn.includes('独立した検証なし') && !pn.includes('Xe3 4 コア版'));
  assert.ok(Math.abs(r('intel-ptl-x9-388h') - 1.771) < 0.01);
  assert.ok(Math.abs(r('intel-mtl-185h') - 1.097) < 0.01);
  Object.keys(FP.TILE_FRAMES).forEach((k) => { const t = FP.TILE_FRAMES[k]; assert.strictEqual(t.big.length, t.nom.p, k); assert.strictEqual(t.small.length, t.nom.e, k); assert.strictEqual(t.lp.length, t.nom.lp, k); });
});

test('Intel タイル: 265K は 285K より E 枠が 4 つ空く(コアの大きさは同じ)・写真の外のコア数に増やすと schematic に落ちる', () => {
  const a = comp('intel-arl-285k'); const b = comp('intel-arl-265k');
  assert.strictEqual(a.blocks.filter((x) => x.coreType === 'E').length, 16);
  assert.strictEqual(b.blocks.filter((x) => x.coreType === 'E').length, 12);
  assert.strictEqual(a.blocks.find((x) => x.coreType === 'P').w, b.blocks.find((x) => x.coreType === 'P').w);
  const d = mk('intel-arl-285k'); const r = design.unlock(d);
  const e = design.setCoreCount(r, 'P', 10);
  assert.ok(e.ok);
  const l = e.design.dies.find((x) => x.layout).layout;
  assert.strictEqual(l.scaleBasis, 'schematic');
  const e2 = design.setCoreCount(r, 'E', 12);
  assert.strictEqual(e2.design.dies.find((x) => x.layout).layout.scaleBasis, 'photo');
});

test('Intel タイル: frame の検査(未知の frame・他テンプレートの frame は不可)', () => {
  const ok = (l) => FP.checkLayout(l) === null;
  assert.ok(ok({ template: 'x86-tile', frame: 'arl-compute' }));
  assert.ok(!ok({ template: 'x86-tile', frame: 'nope' }));
  assert.ok(!ok({ template: 'intel-hybrid', frame: 'arl-compute' }));
  assert.ok(!ok({ template: 'apple-soc', frame: 'arl-compute' }));
  // Wildcat Lake などプリセットの無いチップは追加していない
  assert.ok(!D.presets.some((p) => /wcl|wildcat/i.test(p.id)));
});

test('Panther Lake: GPU・Platform タイルは飾りのダイ(decorDies)。寸法は二次資料の Kurnal 値で、評価・ダイ数・面積合計に入らない', () => {
  const E = require('../js/model/evaluate.js'); const ctx = E.makeContext();
  // 388H・378H・358H は 12Xe(Arc B390。設計書の Wikipedia 表)で GPU+Platform、386H は 4Xe で Platform のみ
  const x386 = mk('intel-ptl-x9-386h');
  assert.deepStrictEqual(x386.decorDies.map((x) => x.kind), ['platform-tile']);
  assert.ok(x386.dies[0].layout.scaleNote.includes('4Xe'));
  assert.deepStrictEqual(design.validate(x386), []);
  ['intel-ptl-x9-388h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h'].forEach((id) => {
    const d = mk(id); const c = d.dies[0];
    assert.strictEqual(d.dies.length, byId(id).dies.length, id);
    assert.strictEqual(d.decorDies.length, 2, id);
    const [g, pl] = d.decorDies;
    assert.strictEqual(g.kind, 'gpu-tile'); assert.strictEqual(pl.kind, 'platform-tile');
    assert.ok(g.label.includes('飾り') && g.label.includes('推定') && pl.label.includes('推定'));
    assert.strictEqual(g.sizeBasis.s, 'sec'); assert.ok(g.sizeBasis.source.includes('[推定]') && g.sizeBasis.source.includes('8.14'));
    assert.ok(Math.abs(g.widthMm - 6.78) < 1e-3 && Math.abs(g.heightMm - 8.14) < 1e-3 && Math.abs(pl.widthMm - 12.44) < 1e-3 && Math.abs(pl.heightMm - 4) < 1e-3); // 設計書の調査表の Kurnal 寸法
    // 面積比は Kurnal 全体図の目測: GPU 約 0.48、Platform 約 0.43(Compute 基準)
    assert.ok(Math.abs(g.areaMm2 / c.areaMm2 - 0.484) < 0.01, String(g.areaMm2 / c.areaMm2));
    assert.ok(Math.abs(pl.areaMm2 / c.areaMm2 - 0.431) < 0.01);
    assert.ok(Math.abs(g.widthMm * g.heightMm - g.areaMm2) < 1e-3);
    // 配置: GPU は Compute の右、Platform は Compute の下。重ならない
    assert.ok(g.x >= c.x + c.widthMm); assert.ok(pl.y >= c.y + c.heightMm - 1e-6);
    assert.ok(!(pl.x < g.x + g.widthMm && g.x < pl.x + pl.widthMm && pl.y < g.y + g.heightMm && g.y < pl.y + pl.heightMm));
    assert.deepStrictEqual(design.validate(d), [], id);
    assert.deepStrictEqual(design.parse(design.serialize(d)).ok, true, id);
    const bare = JSON.parse(JSON.stringify(d)); delete bare.decorDies;
    assert.deepStrictEqual(E.evaluate(d, ctx), E.evaluate(bare, ctx), id);
  });
  assert.ok(FP.decorNote(mk('intel-ptl-x9-388h').decorDies).includes('評価・面積合計には含まない'));
  // 386H の評価も decorDies の有無で同じ
  const b386 = JSON.parse(JSON.stringify(x386)); delete b386.decorDies; assert.deepStrictEqual(E.evaluate(x386, ctx), E.evaluate(b386, ctx));
  // ほかの Intel タイル(枠に tiles が無い)・AMD 以外には付かない
  assert.ok(!mk('intel-arl-285k').decorDies); assert.ok(!mk('intel-lnl-268v').decorDies);
});

test('decorDies の検査: kind とテンプレートの対応(iod は amd-chiplet、gpu-tile / platform-tile は x86-tile)', () => {
  const mkd = (kind) => [{ id: 'dx', kind, label: 'x', x: 0, y: 0, widthMm: 2, heightMm: 2, areaMm2: 4 }];
  assert.strictEqual(FP.checkDecorDies(mkd('iod'), new Set(), ['amd-chiplet']), null);
  assert.ok(FP.checkDecorDies(mkd('iod'), new Set(), ['x86-tile']));
  assert.strictEqual(FP.checkDecorDies(mkd('gpu-tile'), new Set(), ['x86-tile']), null);
  assert.ok(FP.checkDecorDies(mkd('platform-tile'), new Set(), ['amd-chiplet']));
  assert.ok(FP.checkDecorDies(mkd('gpu-tile'), new Set(), [undefined, null]));
  assert.ok(FP.checkDecorDies(mkd('bad'), new Set(), ['x86-tile']));
  // 設計(parse)でも拒否: 5950X に gpu-tile、388H に iod
  const a = JSON.parse(JSON.stringify(mk('amd-zen3-5950x'))); a.decorDies[0].kind = 'gpu-tile';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const p = JSON.parse(JSON.stringify(mk('intel-ptl-x9-388h'))); p.decorDies[0].kind = 'iod';
  assert.strictEqual(design.parse(JSON.stringify(p)).ok, false);
});
