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

const PHOTO = { 'intel-mtl-185h': 'mtl-compute', 'intel-arl-285k': 'arl-compute', 'intel-lnl-268v': 'lnl-compute' };
const REUSE = { 'intel-ptl-x9-388h': 'ptl-compute', 'intel-arl-265k': 'arl-compute', 'intel-arl-275hx': 'arl-compute', 'intel-lnl-258v': 'lnl-compute', 'intel-lnl-256v': 'lnl-compute', 'intel-ptl-x9-386h': 'ptl-compute', 'intel-ptl-x9-378h': 'ptl-compute', 'intel-ptl-x7-358h': 'ptl-compute' };

test('Intel タイル: photo 3 件・reuse 8 件は x86-tile + 枠、scaleNote は 600 字以内で「目測」「推定」を含む', () => {
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

test('Intel タイル: ダイの縦横比(285K 1.92、268V 1.90、388H 0.56(reuse)、185H 1.10)とタイルごとのコア数の枠', () => {
  const r = (id) => { const x = comp(id); return x.widthMm / x.heightMm; };
  assert.ok(Math.abs(r('intel-arl-285k') - 1.925) < 0.01);
  assert.ok(Math.abs(r('intel-lnl-268v') - 1.899) < 0.01);
  assert.ok(comp('intel-ptl-x9-388h').layout.scaleNote.includes('Xe3 4 コア版') && comp('intel-ptl-x9-388h').layout.scaleNote.includes('GPU タイルも無い'));
  assert.ok(Math.abs(r('intel-ptl-x9-388h') - 0.564) < 0.01);
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
