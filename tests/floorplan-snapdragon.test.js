'use strict';
// Snapdragon のダイ写真に倣った配置(floorplan.js の arm-soc。2026-11-03)のテスト。配置・大きさは写真の目測で、実チップのフロアプランではない。
// 画像は C:\LocalAI\画像(Kurnal 等の注釈つき)。docs/research/user-images.md 参照。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const lay = (id) => mk(id).dies[0].layout || null;
const cores = (die) => die.blocks.filter((b) => b.kind === 'core');

const FRAME_OF = {
  'qc-855': 'sd-855', 'qc-865': 'sd-865', 'qc-888': 'sd-888', 'qc-8gen1': 'sd-8gen1', 'qc-8gen2': 'sd-8gen2', 'qc-8gen3': 'sd-8gen3', 'qc-8elite': 'sd-8elite', 'qc-8elite-gen5': 'sd-8elite-gen5',
  'qc-7plus-gen3': 'sd-7p3-8s3', 'qc-8s-gen3': 'sd-7p3-8s3', 'qc-8s-gen4': 'sd-8s-gen4', 'qc-8elite-x-gen6': 'sd-8elite-x-gen6', 'qc-7gen1': 'sd-7gen1', 'qc-8cx-gen3': 'sd-8cx-gen3',
};
// 注釈なしの写真(720G・780G・8+ Gen 1)と画像なし(7 Gen 4)は、コアの位置が読めず従来の配置のまま(6 Gen 1・4 Gen 2・7 Gen 3 は縦横比だけ採った)
// 2026-11-04: 6 Gen 1・4 Gen 2・7 Gen 3 はファイル名の寸法があるので、縦横比だけ写真に合わせる(ASPECT_ONLY。frame なしの arm-soc・schematic。ブロックの配置は従来どおり)
const NONE = ['qc-720g', 'qc-780g', 'qc-8plus-gen1', 'qc-7gen4'];
const ASPECT_ONLY = { 'qc-6gen1': 1.2114, 'qc-4gen2': 1.0095, 'qc-7gen3': 0.7494 };

test('Snapdragon: 写真のある 14 件は arm-soc の photo、縦横比だけ写真に合わせた 3 件は schematic、読めない・画像なしの 4 件は従来の配置(layout なし)。Snapdragon は全部で 21 件', () => {
  Object.keys(FRAME_OF).forEach((id) => {
    const l = lay(id); assert.ok(l, id);
    assert.strictEqual(l.template, 'arm-soc', id); assert.strictEqual(l.frame, FRAME_OF[id], id); assert.strictEqual(l.scaleBasis, 'photo', id);
    assert.ok(l.scaleNote.includes('目測') && l.scaleNote.includes('実チップのフロアプランではない') && l.scaleNote.includes('URL 候補'), id);
  });
  NONE.forEach((id) => assert.strictEqual(lay(id), null, id));
  assert.strictEqual(D.presets.filter((p) => p.vendor === 'Qualcomm').length, Object.keys(FRAME_OF).length + Object.keys(ASPECT_ONLY).length + NONE.length);
  // 縦横比だけ採った 3 件: frame なしの arm-soc・schematic。面積(mm²)はプリセットのまま、幅/高さは指定の比、ブロックは従来の配置(模式)。
  // 比はファイル名の寸法(幅/高さ)で、画像の実ピクセル比と 1% 以内で一致(8702×7198 = 1.2089、6896×6827 = 1.0101、6941×9251 = 0.7503)
  const PX = { 'qc-6gen1': 8702 / 7198, 'qc-4gen2': 6896 / 6827, 'qc-7gen3': 6941 / 9251 };
  Object.keys(ASPECT_ONLY).forEach((id) => {
    const l = lay(id); const die = mk(id).dies[0]; const p = byId(id);
    assert.strictEqual(l.template, 'arm-soc', id); assert.strictEqual(l.scaleBasis, 'schematic', id); assert.strictEqual(l.frame, undefined, id); assert.strictEqual(l.aspect, ASPECT_ONLY[id], id);
    assert.ok(l.scaleNote.includes('縦横比のみ') && l.scaleNote.includes('出典 URL 未確認') && l.scaleNote.includes('模式で根拠なし') && l.scaleNote.length <= 600, id);
    assert.ok(Math.abs(die.widthMm / die.heightMm - ASPECT_ONLY[id]) < 1e-9, id);
    assert.ok(Math.abs(ASPECT_ONLY[id] / PX[id] - 1) < 0.01, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - p.dies[0].mm2) < 1e-6, id); assert.strictEqual(die.areaMm2, p.dies[0].mm2, id);
    // ブロックは従来の配置(layoutCompute)と同じ: 同じ寸法のダイで layout なしにしたものと一致
    const legacy = JSON.parse(JSON.stringify(mk(id))); delete legacy.dies[0].layout; legacy.dies[0].blocks = design.relayoutCompute(legacy).dies[0].blocks;
    assert.deepStrictEqual(die.blocks, legacy.dies[0].blocks, id);
    // checkLayout・保存データの検証・編集後の再配置が通る
    assert.strictEqual(FP.checkLayout(l), null, id);
    assert.strictEqual(design.parse(JSON.stringify(mk(id))).ok, true, id);
    assert.deepStrictEqual(FP.afterEdit(l, p.cfg.cores, 0), l, id);
    const r = design.setCoreCount(design.unlock(mk(id)), p.cfg.cores[0].type, p.cfg.cores[0].count + 1); assert.ok(r.ok, id); // 再現モードはロックされるので unlock してから
    assert.strictEqual(r.design.dies[0].layout.aspect, ASPECT_ONLY[id], id); assert.ok(Math.abs(r.design.dies[0].widthMm / r.design.dies[0].heightMm - ASPECT_ONLY[id]) < 1e-9, id);
  });
  // aspect は frame なしの arm-soc・schematic だけに使える
  const base = { template: 'arm-soc', scaleBasis: 'schematic', aspect: 1.2 };
  assert.strictEqual(FP.checkLayout(base), null);
  [Object.assign({}, base, { scaleBasis: 'photo' }), Object.assign({}, base, { aspect: 'x' }), Object.assign({}, base, { aspect: 0 }), Object.assign({}, base, { aspect: 5 }), Object.assign({}, base, { frame: 'sd-855' }), Object.assign({}, base, { template: 'x86-mono' }), { template: 'arm-soc', scaleBasis: 'schematic' }]
    .forEach((l, i) => assert.ok(FP.checkLayout(l), 'NG ' + i));
  // 7+ Gen 3 と 8s Gen 3 は同じダイ(Kurnal の 1 枚)。同じ枠・同じ photo で、注記にその根拠がある
  assert.strictEqual(lay('qc-7plus-gen3').frame, lay('qc-8s-gen3').frame);
  assert.ok(lay('qc-8s-gen3').scaleNote.includes('SM7675 / SM8635') && lay('qc-8s-gen3').scaleNote.includes('このダイ自身の写真'));
  assert.deepStrictEqual(mk('qc-7plus-gen3').dies[0].blocks.map((b) => b.label), mk('qc-8s-gen3').dies[0].blocks.map((b) => b.label));
});

test('Snapdragon: ダイ面積・ダイ数はプリセットのまま、縦横比は写真の枠、コア数と種類ごとの数が一致、ダイ内に収まり重ならない', () => {
  Object.keys(FRAME_OF).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = d.dies[0]; const tf = FP.TILE_FRAMES[FRAME_OF[id]];
    assert.strictEqual(d.dies.length, p.dies.length, id); assert.strictEqual(die.areaMm2, p.dies[0].mm2, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - p.dies[0].mm2) < 1e-6, id);
    assert.ok(Math.abs(die.widthMm / die.heightMm / tf.aspect - 1) < 1e-6, id);
    assert.deepStrictEqual(design.validate(d), [], id);
    assert.strictEqual(cores(die).length, p.cfg.cores.reduce((s, g) => s + g.count, 0), id);
    p.cfg.cores.forEach((g) => assert.strictEqual(cores(die).filter((b) => b.coreType === g.type).length, g.count, `${id} ${g.type}`));
    // cfg に L3 が無いので L3 のブロックは無い(写真の L3 は飾り)。コア以外はすべて飾りで、評価に影響しない
    assert.ok(!die.blocks.some((b) => b.kind === 'l3'), id);
    die.blocks.filter((b) => b.kind !== 'core').forEach((b) => assert.strictEqual(b.decorative, true, `${id} ${b.label}`));
    assert.ok(die.blocks.some((b) => b.kind === 'gpu') && die.blocks.some((b) => b.kind === 'npu') && die.blocks.some((b) => b.kind === 'uncore'), id);
    assert.strictEqual(die.layout.uncore, false); assert.strictEqual(die.layout.igpu, false);
  });
  assert.ok(!FP.SCALE_TEXT.photo.includes('注釈つき'));
});

test('Snapdragon: 写真で読める配置(プライムの位置・コア数)', () => {
  const T = (id, type) => cores(mk(id).dies[0]).filter((b) => b.coreType === type);
  // 855: プライム(A76 2.84GHz)は上段の右端(中間コア 3 つの右)
  const p855 = T('qc-855', 'P')[0]; assert.ok(T('qc-855', 'M').every((b) => b.x + b.w <= p855.x + 1e-6));
  // 8 Elite Gen 5: Oryon L の 2 つは L2 の上と下に 1 つずつ。E(M コア)6 つは M クラスタ L2 の左右に 3 つずつ
  const g5 = mk('qc-8elite-gen5').dies[0]; const ls = T('qc-8elite-gen5', 'P').sort((a, b) => a.y - b.y);
  const l2 = g5.blocks.find((b) => b.label.startsWith('L クラスタ L2'));
  assert.ok(ls[0].y + ls[0].h <= l2.y + l2.h && ls[1].y >= l2.y + l2.h - 1e-6);
  const es = T('qc-8elite-gen5', 'E'); const ml2 = g5.blocks.find((b) => b.label.startsWith('M クラスタ L2'));
  assert.strictEqual(es.filter((b) => b.x + b.w <= ml2.x + 1e-6).length, 3); assert.strictEqual(es.filter((b) => b.x >= ml2.x + ml2.w - 1e-6).length, 3);
  // 8 Elite Extreme Gen 6: Oryon-L ×2・Oryon-M ×6。8cx Gen 3: X1 ×4 + A78 ×4 で小コアの枠は無い
  assert.strictEqual(T('qc-8elite-x-gen6', 'P').length, 2); assert.strictEqual(T('qc-8elite-x-gen6', 'E').length, 6);
  assert.strictEqual(FP.TILE_FRAMES['sd-8cx-gen3'].small.length, 0); assert.strictEqual(T('qc-8cx-gen3', 'M').length, 4);
  // 8 Gen 3 は A720 の中間コア 5 つ(M 3 + M2 2)が P(X4)のあとの枠に入る
  assert.strictEqual(FP.TILE_FRAMES['sd-8gen3'].big.length, 6); assert.strictEqual(T('qc-8gen3', 'M2').length, 2);
  // 8s Gen 4: A720 の「小コア」扱い(E 2。写真の 2.02GHz)は上段左の 2 枠
  const s4 = T('qc-8s-gen4', 'E'); assert.strictEqual(s4.length, 2); assert.ok(s4.every((b) => b.y < 60));
});

test('Snapdragon: 枠ごとに使えるテンプレート(checkLayout の tpl)。arm-soc の枠は arm-soc だけ、ほかのテンプレートの枠は arm-soc で使えない', () => {
  const ok = (t, f) => assert.strictEqual(FP.checkLayout({ template: t, frame: f }), null, t + '+' + f);
  const ng = (t, f) => assert.ok(FP.checkLayout({ template: t, frame: f }), t + '+' + f);
  Object.keys(FP.TILE_FRAMES).filter((k) => /^sd-/.test(k)).forEach((f) => {
    assert.deepStrictEqual(FP.TILE_FRAMES[f].tpl, ['arm-soc'], f);
    ok('arm-soc', f); ng('x86-tile', f); ng('x86-mono', f); ng('amd-apu', f); ng('apple-soc', f); ng('amd-chiplet', f);
  });
  ['mtl-compute', 'zeppelin', 'cezanne', 'strix-halo-soc', 'ptl-compute'].forEach((f) => ng('arm-soc', f));
  ng('arm-soc', 'apple-m1'); ng('arm-soc', 'strix-point'); ng('arm-soc', 'no-such-frame');
  assert.ok(FP.checkLayout({ template: 'arm-soc' }).includes('frame')); // frame なしは不可
  assert.strictEqual(Object.keys(FP.TILE_FRAMES).filter((k) => /^sd-/.test(k)).length, 13); // 14 プリセット(7+ Gen 3 と 8s Gen 3 が 1 枠を共有)
  // design.parse も拒否する(arm-soc の枠を x86-tile にした・Intel の枠を arm-soc にした)
  const a = JSON.parse(JSON.stringify(mk('qc-8elite'))); a.dies[0].layout.template = 'x86-tile';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const b = JSON.parse(JSON.stringify(mk('intel-arl-285k'))); b.dies[0].layout.template = 'arm-soc';
  assert.strictEqual(design.parse(JSON.stringify(b)).ok, false);
  const c = JSON.parse(JSON.stringify(mk('qc-8elite'))); assert.strictEqual(design.parse(JSON.stringify(c)).ok, true);
  assert.ok(FP.TEMPLATE_IDS.includes('arm-soc'));
});

test('Snapdragon: 全枠で、コアが枠一杯でもブロックはダイ内に収まり重ならない', () => {
  Object.keys(FP.TILE_FRAMES).filter((k) => /^sd-/.test(k)).forEach((f) => {
    const tf = FP.TILE_FRAMES[f]; const die = { id: 'd', widthMm: 12, heightMm: 12 / tf.aspect };
    const cs = [{ type: 'P', uarch: 'x', count: tf.big.length }].concat(tf.small.length ? [{ type: 'E', uarch: 'y', count: tf.small.length }] : []);
    const bs = FP.layoutDie(die, cs, 0, { template: 'arm-soc', frame: f, scaleBasis: 'photo' });
    assert.strictEqual(bs.filter((b) => b.kind === 'core').length, tf.big.length + tf.small.length, f);
    bs.forEach((b) => { assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= die.widthMm + 1e-9 && b.y + b.h <= die.heightMm + 1e-9 && b.w > 0 && b.h > 0, f + ' ' + b.label); });
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]; const c = bs[j];
      assert.ok(!(a.x < c.x + c.w - 1e-9 && c.x < a.x + a.w - 1e-9 && a.y < c.y + c.h - 1e-9 && c.y < a.y + a.h - 1e-9), f + ': ' + a.label + ' と ' + c.label);
    }
  });
});

test('Snapdragon: 編集で枠を超えたら schematic の従来配置に落ちる。L3 を足しても落ちる(枠に L3 が無い)。枠内なら photo のまま', () => {
  const ed = (id, type, n) => { const u = design.unlock(mk(id)); const r = design.setCoreCount(u, type, n); assert.ok(r.ok, id); assert.deepStrictEqual(design.validate(r.design), [], `${id} ${type} ${n}`); return r.design.dies[0]; };
  assert.strictEqual(ed('qc-8elite', 'E', 4).layout.scaleBasis, 'photo'); assert.strictEqual(ed('qc-8elite', 'E', 6).layout.scaleBasis, 'photo');
  const over = ed('qc-8elite', 'E', 7); assert.strictEqual(over.layout.scaleBasis, 'schematic'); assert.strictEqual(cores(over).length, 9);
  assert.ok(!over.blocks.some((b) => b.decorative), '根拠なしに落ちたら従来の配置(飾りなし)');
  assert.strictEqual(ed('qc-8elite', 'P', 3).layout.scaleBasis, 'schematic');
  // 空き枠: プライムを減らしても photo
  assert.strictEqual(ed('qc-8elite', 'P', 1).layout.scaleBasis, 'photo');
  const u = design.unlock(mk('qc-888')); const r = design.setL3(u, 8); assert.ok(r.ok);
  const die = r.design.dies[0]; assert.strictEqual(die.layout.scaleBasis, 'schematic'); assert.strictEqual(die.blocks.filter((b) => b.kind === 'l3').length, 1);
  assert.deepStrictEqual(design.validate(r.design), []);
  assert.ok(die.layout.scaleNote.includes('L3'));
});

test('Snapdragon: 評価結果は配置に依存しない(ブロックを全部取り除いても同じ)', () => {
  const E = require('../js/model/evaluate.js'); const ctx = E.makeContext();
  Object.keys(FRAME_OF).forEach((id) => {
    const a = mk(id); const b = JSON.parse(JSON.stringify(a)); b.dies.forEach((x) => { x.blocks = []; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(E.evaluate(a, ctx))), JSON.parse(JSON.stringify(E.evaluate(b, ctx))), id);
  });
});

test('Snapdragon: 8 Gen 2 の A510 は注釈どおり「2 コアクラスタ」を 2 等分した 2 枠 + 右隣の「1 コア」の 1 枠。8s Gen 4 の M(3.01GHz)・M2(2.8GHz)・E(2.02GHz)が対応する枠に入る', () => {
  const T = (id, type) => cores(mk(id).dies[0]).filter((b) => b.coreType === type).sort((a, b) => a.x - b.x);
  const e = T('qc-8gen2', 'E'); assert.strictEqual(e.length, 3);
  const cl = FP.TILE_FRAMES['sd-8gen2'].small; assert.strictEqual(cl.length, 3);
  const die = mk('qc-8gen2').dies[0];
  assert.ok(e[1].x + e[1].w <= e[2].x + 1e-6, '3 つ目は 2 コアクラスタの右');
  assert.ok(Math.abs(e[0].w - e[1].w) < 1e-6 && Math.abs(e[0].x + e[0].w - e[1].x) < die.widthMm * 0.01, '2 コアクラスタの 2 等分(同じ幅で隣り合う)');
  assert.ok(e[2].h > e[0].h, '1 コアの枠は縦に長い(注釈の A510 1core)');
  assert.ok(!die.blocks.some((b) => /未判別/.test(b.label)), '未判別の飾りは無い');
  // 8s Gen 4: M(3.01GHz ×3)は左列(x < 220)、M2(2.8GHz ×2)は上段の 2 枠、E(2.02GHz ×2)は左上の 2 枠
  const k = (die2) => die2.widthMm / 1600; const d4 = mk('qc-8s-gen4').dies[0];
  const m = T('qc-8s-gen4', 'M'); const m2 = T('qc-8s-gen4', 'M2'); const e4 = T('qc-8s-gen4', 'E');
  assert.strictEqual(m.length, 3); assert.strictEqual(m2.length, 2); assert.strictEqual(e4.length, 2);
  assert.ok(m.every((b) => b.x + b.w <= 225 * k(d4) + 1e-6), 'M は左列(x < 220)');
  assert.ok(m2.every((b) => b.x >= 270 * k(d4) - 1e-6), 'M2 は X4 の周りの 2 枠(x ≥ 275)');
  assert.ok(e4.every((b) => b.y + b.h <= 140 * k(d4) + 1e-6 && b.x + b.w <= 275 * k(d4) + 1e-6), 'E は左上の 2 枠');
  assert.strictEqual(T('qc-8s-gen4', 'P').length, 1);
});

test('Snapdragon・Dimensity 9000〜9600 Pro・T239・Raphael/Granite Ridge と、縦横比だけ採った 4 件以外の 70 件(Snapdragon の未反映 4 件を含む)の layout・寸法・ブロック・飾りダイは、今回の追加で変わらない(固定のハッシュ。2026-11-03 の MediaTek・T239 追加の前後で一致を確認)', () => {
  const MAPPED = Object.keys(FRAME_OF).concat(['mt-9000', 'mt-9200', 'mt-9300', 'mt-9400', 'mt-9500', 'mt-9600pro', 'nv-t239', 'nv-gb10', 'intel-ptl-u5-325', 'intel-wcl-c5-320']);
  // 2026-11-04: 6 Gen 1・4 Gen 2・7 Gen 3・Dimensity 8200 は縦横比だけ写真に合わせた(幅・高さと layout が変わる。ブロックは従来の配置。縦横比は上のテストと floorplan-mediatek で検証)ので除く。除く前の 74 件のハッシュは a0fc1692…(それ以前と同じ)
  const ASPECT_4 = ['qc-6gen1', 'qc-4gen2', 'qc-7gen3', 'mt-8200'];
  // 2026-11-04: Raphael・Granite Ridge(7700・7950X・9700X・9950X)は IOD の縦横比・位置を写真に合わせて変えたので除く(その変更は floorplan-scale.test.js で検証。評価は不変)
  const IOD_MOVED = ['amd-zen4-7700', 'amd-zen4-7950x', 'amd-zen5-9700x', 'amd-zen5-9950x'];
  const rest = D.presets.filter((p) => !MAPPED.includes(p.id) && !IOD_MOVED.includes(p.id) && !ASPECT_4.includes(p.id));
  assert.strictEqual(rest.length, 70);
  const h = require('crypto').createHash('sha256');
  rest.forEach((p) => { const d = mk(p.id); h.update(JSON.stringify({ id: p.id, dies: d.dies.map((x) => ({ layout: x.layout || null, w: x.widthMm, h: x.heightMm, blocks: x.blocks })), decor: d.decorDies || null })); });
  // 2026-11-04: 386H(intel-ptl-x9-386h)だけ、4Xe の GPU タイルの飾りと scaleNote を足したのでハッシュを更新(Panther Lake_dies.jpg)。388H・378H・358H・Platform タイルは一致を確認済み
  assert.strictEqual(h.digest('hex'), '2a9232c909d49e286a7a9ab75cb2e832f3d8ff79b1a4c2ce443aae0a76b33e2c'); // 70 件の layout・寸法・ブロック・飾りダイは変更前(HEAD)のコードと一致を確認して更新(4 件を除いただけ)
});
