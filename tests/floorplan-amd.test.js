'use strict';
// AMD のモノリシック・APU のダイ写真(Zeppelin・Raven Ridge・Cezanne・Rembrandt-R・Phoenix 1)と Strix Halo の SoC ダイ・CCD の写真の枠(2026-11-03)のテスト。
// 配置は写真の目測で、実チップのフロアプランではない。画像は C:\LocalAI\画像。docs/research/user-images.md 参照。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const blocksOf = (die, kind) => die.blocks.filter((b) => b.kind === kind);
const area = (bs) => bs.reduce((s, b) => s + b.w * b.h, 0);

test('Zeppelin(1800X・1500X・1200 は photo、2700X・2600X は reuse): 縦横比 2.275、2 CCX に L3 を等分、コアは 2 CCX に交互', () => {
  const d = mk('amd-zen1-1800x').dies[0];
  assert.strictEqual(d.layout.scaleBasis, 'photo'); assert.strictEqual(d.layout.frame, 'zeppelin'); assert.strictEqual(d.layout.template, 'x86-mono');
  assert.ok(Math.abs(d.widthMm / d.heightMm - 2000 / 879) < 0.01);
  assert.strictEqual(d.areaMm2, 213);
  const l3 = blocksOf(d, 'l3'); assert.deepStrictEqual(l3.map((b) => b.label), ['L3 8MB', 'L3 8MB']);
  // CCX 1 つ(4 コア + L3 8MB)の面積 ≈ AMD の CCX 44 mm²(写真の比から。±10%)
  const left = d.blocks.filter((b) => b.kind === 'core' && b.x < d.widthMm / 2);
  assert.strictEqual(left.length, 4);
  const ccx = area(left) + area(l3.filter((b) => b.x < d.widthMm / 2));
  assert.ok(Math.abs(ccx / 44 - 1) < 0.1, `CCX ${ccx}`);
  // 6 コア(2600X)は 3+3、4 コア(1500X・1200)は 2+2
  const split = (id) => { const x = mk(id).dies[0]; const cs = x.blocks.filter((b) => b.kind === 'core'); return [cs.filter((b) => b.x < x.widthMm / 2).length, cs.filter((b) => b.x >= x.widthMm / 2).length]; };
  assert.deepStrictEqual(split('amd-zenplus-2600x'), [3, 3]); assert.deepStrictEqual(split('amd-zen1-1500x'), [2, 2]); assert.deepStrictEqual(split('amd-zen1-1200'), [2, 2]);
  assert.strictEqual(mk('amd-zen1-1500x').dies[0].layout.scaleBasis, 'photo'); assert.strictEqual(mk('amd-zen1-1200').dies[0].blocks.filter((b) => b.kind === 'l3')[0].label, 'L3 4MB');
  ['amd-zenplus-2700x', 'amd-zenplus-2600x'].forEach((id) => { const x = mk(id).dies[0]; assert.strictEqual(x.layout.scaleBasis, 'reuse'); assert.ok(x.layout.scaleNote.includes('流用')); });
  // 実寸の注記がないので縦横比は写真のまま(213 mm² の積)
  assert.ok(Math.abs(d.widthMm * d.heightMm - 213) < 1e-6);
  // EPYC 7401(Zeppelin 4 個)はダイごとのコア配分が未対応なので従来の配置のまま(layout なし)
  assert.ok(!mk('amd-epyc-7401').dies.some((x) => x.layout));
});

test('Raven Ridge(2400G・2200G): 1 CCX(コア 4 + L3 4MB)と Vega の GPU・IO の写真の枠。縦横比 1.759', () => {
  ['amd-raven-2400g', 'amd-raven-2200g'].forEach((id) => {
    const d = mk(id).dies[0];
    assert.strictEqual(d.layout.scaleBasis, 'photo'); assert.strictEqual(d.layout.template, 'amd-apu'); assert.strictEqual(d.layout.frame, 'raven-ridge');
    assert.ok(Math.abs(d.widthMm / d.heightMm - 2000 / 1137) < 0.01);
    assert.strictEqual(blocksOf(d, 'core').length, 4); assert.deepStrictEqual(blocksOf(d, 'l3').map((b) => b.label), ['L3 4MB']);
    const gpu = blocksOf(d, 'gpu'); assert.strictEqual(gpu.length, 7); assert.ok(gpu.every((b) => b.decorative));
    // CCX(コア + L3)≈ 写真では 18.9% ≈ 39.7 mm²
    const ccx = area(blocksOf(d, 'core')) + area(blocksOf(d, 'l3'));
    assert.ok(Math.abs(ccx / d.areaMm2 / 0.189 - 1) < 0.1, `CCX ${ccx}`);
    assert.ok(Math.max.apply(null, gpu.map((b) => b.x + b.w)) > d.widthMm * 0.95); // GPU は右端まで
  });
});

test('Cezanne(5800U): 上下 4+4 のコアと中央 L3 の写真の枠、GPU は右', () => {
  const d = mk('amd-zen3-5800u').dies[0];
  assert.strictEqual(d.layout.scaleBasis, 'photo'); assert.strictEqual(d.layout.frame, 'cezanne');
  const cs = blocksOf(d, 'core'); assert.strictEqual(cs.length, 8);
  const l3 = blocksOf(d, 'l3')[0];
  assert.strictEqual(cs.filter((b) => b.y + b.h <= l3.y + 1e-6).length, 4); assert.strictEqual(cs.filter((b) => b.y >= l3.y + l3.h - 1e-6).length, 4);
  assert.strictEqual(blocksOf(d, 'gpu').length, 4); assert.ok(blocksOf(d, 'gpu').every((b) => b.x >= cs[3].x + cs[3].w - 1e-6)); // GPU はコア列の右
  assert.ok(d.blocks.some((b) => b.label === '下辺(注釈なし。内訳は未判別)')); // 注釈のない下辺は「未判別」の表記
  assert.ok(Math.abs(d.widthMm / d.heightMm - 994 / 918) < 0.01);
});

test('Rembrandt-R(7735HS)・Phoenix 1(7840HS): 注釈なしの写真。コア 8 + L3 だけ置き、残りは 1 種類の未判別の飾り。縦横比はファイル名の寸法と一致', () => {
  [['amd-zen3p-7735hs', 'rembrandt-r', 12.84 / 16.25], ['amd-zen4-7840hs', 'phoenix1', 11.11 / 15.91]].forEach(([id, frame, asp]) => {
    const d = mk(id).dies[0];
    assert.strictEqual(d.layout.scaleBasis, 'photo'); assert.strictEqual(d.layout.frame, frame);
    assert.ok(Math.abs(d.widthMm / d.heightMm / asp - 1) < 0.005, id);
    assert.strictEqual(blocksOf(d, 'core').length, 8); assert.deepStrictEqual(blocksOf(d, 'l3').map((b) => b.label), ['L3 16MB']);
    assert.ok(!d.blocks.some((b) => b.kind === 'gpu' || b.kind === 'npu'), 'GPU・NPU は推測で置かない');
    const rest = d.blocks.filter((b) => b.decorative); assert.strictEqual(rest.length, 4); assert.ok(rest.every((b) => b.label.includes('未判別')));
    assert.ok(d.layout.scaleNote.includes('注釈なし'));
    // 左右 4 コアずつ
    assert.strictEqual(blocksOf(d, 'core').filter((b) => b.x < d.widthMm / 2).length, 4);
    // ダイ全体がブロックで埋まる(未判別の飾り + コア + L3 でダイ面積のほぼ全部。内側の余白は inset のぶん)
    const total = area(d.blocks); assert.ok(total / (d.widthMm * d.heightMm) > 0.97 && total / (d.widthMm * d.heightMm) <= 1, `${id} ${total}`);
  });
});

test('Strix Halo: SoC ダイに写真の枠(縦横比 19.2×16.02、WGP ×20 などの GPU、NPU、MALL)、CCD は photo の比。面積・ダイ数は変わらない', () => {
  const p = byId('amd-strixhalo-395'); const dsg = design.fromPreset(p);
  assert.strictEqual(dsg.dies.length, 2);
  const ccd = dsg.dies[0]; const soc = dsg.dies[1];
  assert.strictEqual(ccd.layout.scaleBasis, 'photo'); assert.strictEqual(ccd.layout.recipe, 'Zen 5 (Strix Halo)');
  assert.strictEqual(blocksOf(ccd, 'core').length, 16); assert.strictEqual(ccd.areaMm2, 134.2);
  assert.strictEqual(soc.layout.scaleBasis, 'photo'); assert.strictEqual(soc.layout.frame, 'strix-halo-soc'); assert.strictEqual(soc.areaMm2, 307.6);
  assert.ok(Math.abs(soc.widthMm / soc.heightMm - 19.2 / 16.02) < 0.01); assert.ok(Math.abs(soc.widthMm * soc.heightMm - 307.6) < 1e-6);
  assert.ok(soc.blocks.some((b) => b.kind === 'npu')); assert.ok(soc.blocks.some((b) => b.kind === 'gpu' && /WGP/.test(b.label)));
  assert.strictEqual(blocksOf(soc, 'core').length, 0);
  // 従来の「GPU」1 ブロックと同じく電力按分に参加(機能のないダミー領域だけ飾り)
  assert.deepStrictEqual(soc.blocks.filter((b) => b.decorative).map((b) => b.label), ['Big Dummy Area(ダミー領域)']);
  // CCD 1 つ ≈ 67.1 mm²(写真の 767×625 px / SoC ダイ 1625×1360 px 換算 66.9 mm²)の縦横比 1.227
  assert.ok(Math.abs(FP.CCD_RECIPES['Zen 5 (Strix Halo)'].aspect - 1.227) < 1e-9);
  assert.strictEqual(FP.CCD_RECIPES['Zen 5'].basis, 'survey'); // 9950X・9700X は従来のまま
  assert.strictEqual(mk('amd-zen5-9950x').dies[0].layout.scaleBasis, 'survey');
  assert.deepStrictEqual(design.validate(dsg), []);
  assert.strictEqual(design.parse(design.serialize(dsg)).ok, true);
});

test('編集: 枠を超えるコア数は schematic に落ちる(Zeppelin 8 枠・Raven 4 枠)。枠内の編集は photo のまま。checkLayout の frame とテンプレートの対応', () => {
  const u = design.unlock(mk('amd-zen1-1200')); // 4 コア・Zeppelin 枠は 8
  const ok = design.setCoreCount(u, 'P', 8); assert.ok(ok.ok); assert.strictEqual(ok.design.dies[0].layout.scaleBasis, 'photo'); assert.deepStrictEqual(design.validate(ok.design), []);
  const over = design.setCoreCount(u, 'P', 9); assert.ok(over.ok); assert.strictEqual(over.design.dies[0].layout.scaleBasis, 'schematic'); assert.deepStrictEqual(design.validate(over.design), []);
  const r = design.setCoreCount(design.unlock(mk('amd-raven-2400g')), 'P', 5); assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'schematic'); assert.deepStrictEqual(design.validate(r.design), []);
  assert.strictEqual(FP.checkLayout({ template: 'x86-mono', frame: 'zeppelin' }), null);
  assert.strictEqual(FP.checkLayout({ template: 'amd-apu', frame: 'cezanne' }), null);
  assert.strictEqual(FP.checkLayout({ template: 'amd-apu', frame: 'strix-point' }), null);
  assert.ok(FP.checkLayout({ template: 'x86-mono', frame: 'strix-point' }));
  assert.ok(FP.checkLayout({ template: 'amd-chiplet', frame: 'zeppelin' }));
  assert.ok(FP.checkLayout({ template: 'amd-apu', frame: 'nothing' }));
});

test('熱マップの電力按分: Strix Halo の CCD / SoC は 60.4 / 39.6%(従来の SoC 1 ブロックでは 57.3 / 42.7%。写真の枠のブロック面積で按分するため変わる)', () => {
  const HM = require('../js/sim/heatmap.js');
  const d = mk('amd-strixhalo-395'); const r = HM.blockPowers(d, 100);
  const sh = d.dies.map((die) => die.blocks.reduce((s, b) => s + (r.byBlock[b.id] || 0), 0));
  assert.ok(Math.abs(sh[0] - 60.37) < 0.05 && Math.abs(sh[1] - 39.63) < 0.05, JSON.stringify(sh));
  assert.ok(Math.abs(sh[0] + sh[1] - 100) < 1e-9);
});

test('checkLayout: 枠ごとに使えるテンプレートがある(Intel の枠は x86-tile だけ、AMD の単体ダイの枠は amd-apu / x86-mono、strix-halo-soc は amd-apu だけ)', () => {
  const ok = (t, f) => assert.strictEqual(FP.checkLayout({ template: t, frame: f }), null, t + '+' + f);
  const ng = (t, f) => assert.ok(FP.checkLayout({ template: t, frame: f }), t + '+' + f);
  ['zeppelin', 'raven-ridge', 'cezanne', 'rembrandt-r', 'phoenix1'].forEach((f) => { ok('amd-apu', f); ok('x86-mono', f); ng('x86-tile', f); ng('amd-chiplet', f); });
  ok('amd-apu', 'strix-halo-soc'); ng('x86-mono', 'strix-halo-soc'); ng('x86-tile', 'strix-halo-soc');
  ['mtl-compute', 'arl-compute', 'lnl-compute', 'ptl-compute'].forEach((f) => { ok('x86-tile', f); ng('amd-apu', f); ng('x86-mono', f); });
  ng('apple-soc', 'zeppelin'); ng('x86-tile', 'strix-point'); ng('x86-mono', 'strix-point'); ok('amd-apu', 'strix-point');
  // design.parse も拒否する
  const d = JSON.parse(JSON.stringify(mk('amd-zen1-1800x'))); d.dies[0].layout.template = 'x86-tile';
  assert.strictEqual(design.parse(JSON.stringify(d)).ok, false);
  const e = JSON.parse(JSON.stringify(mk('intel-arl-285k'))); e.dies[0].layout.template = 'amd-apu';
  assert.strictEqual(design.parse(JSON.stringify(e)).ok, false);
});

test('新しい AMD の枠: 全部のブロックがダイ内に収まり、重ならない(空き枠・コア数が枠一杯でも)。SCALE_TEXT.photo は「注釈つき」と言わない', () => {
  const frames = ['zeppelin', 'raven-ridge', 'cezanne', 'rembrandt-r', 'phoenix1', 'strix-halo-soc'];
  frames.forEach((f) => {
    const tf = FP.TILE_FRAMES[f]; assert.ok(tf, f);
    const die = { id: 'd', widthMm: 20, heightMm: 20 / tf.aspect };
    const cores = tf.big.length ? [{ type: 'P', uarch: 'Zen', count: tf.big.length }] : [];
    const bs = FP.layoutDie(die, cores, tf.l3 ? 16 : 0, { template: f === 'strix-halo-soc' ? 'amd-apu' : 'x86-mono', frame: f, scaleBasis: 'photo' });
    assert.strictEqual(bs.filter((b) => b.kind === 'core').length, tf.big.length, f);
    bs.forEach((b) => { assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= die.widthMm + 1e-9 && b.y + b.h <= die.heightMm + 1e-9, f + ' ' + b.label); assert.ok(b.w > 0 && b.h > 0, f + ' ' + b.label); });
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]; const c = bs[j];
      assert.ok(!(a.x < c.x + c.w - 1e-9 && c.x < a.x + a.w - 1e-9 && a.y < c.y + c.h - 1e-9 && c.y < a.y + a.h - 1e-9), f + ': ' + a.label + ' と ' + c.label + ' が重なる');
    }
  });
  assert.ok(!FP.SCALE_TEXT.photo.includes('注釈つき')); assert.ok(FP.SCALE_TEXT.photo.includes('目測'));
});
