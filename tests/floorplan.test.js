'use strict';
// 実物風フロアプラン(js/model/floorplan.js + design.fromPreset)のテスト。全プリセットで、ダイ内に収まる・重ならない・個数が一致する・
// 飾りブロックが計算に影響しないことを確かめる。配置は模式図で、実チップのフロアプランではない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const HM = require('../js/sim/heatmap.js');

const presets = D.presets;
const byId = (id) => presets.find((p) => p.id === id);
const mk = (p) => design.fromPreset(typeof p === 'string' ? byId(p) : p);
const total = (p) => ((p.cfg && p.cfg.cores) || []).reduce((s, g) => s + g.count, 0);
const tplOf = (p) => { const d = mk(p); const die = d.dies.find((x) => x.layout); return die ? die.layout.template : 'other'; };
const coreBlocks = (d) => d.dies.reduce((a, die) => a.concat(die.blocks.filter((b) => b.kind === 'core')), []);

test('テンプレート判定: 代表的なプリセットが想定どおりのテンプレートになる', () => {
  const want = {
    'intel-adl-12900k': 'intel-hybrid', 'intel-rpl-14900k': 'intel-hybrid', 'intel-rpl-14700hx': 'intel-hybrid',
    'intel-adl-12100': 'x86-mono', 'amd-zen1-1800x': 'x86-mono', 'amd-zen1-1200': 'x86-mono',
    'amd-zen5-9950x': 'amd-chiplet', 'amd-zen3-5600x': 'amd-chiplet', 'amd-zen4-7700': 'amd-chiplet', 'amd-strixhalo-395': 'amd-chiplet',
    'amd-strix-hx370': 'amd-apu', 'amd-kraken-350': 'amd-apu', 'amd-zen4-7840hs': 'amd-apu', 'amd-raven-2400g': 'amd-apu',
    'intel-arl-285k': 'x86-tile', 'intel-lnl-268v': 'x86-tile', 'intel-ptl-x9-388h': 'x86-tile',
    'apple-m1': 'apple-soc', 'apple-m1ultra': 'apple-soc', 'apple-m3pro': 'apple-soc', 'apple-a15': 'apple-soc', 'apple-m4pro': 'other', 'apple-a12': 'apple-soc', 'apple-a20pro': 'apple-soc', 'apple-m5max': 'other', 'qc-8elite': 'arm-soc', 'mt-9400': 'arm-soc', 'mt-9600pro': 'arm-soc', 'nv-t239': 'arm-soc', 'mt-8200': 'other', 'nv-thor': 'other', 'qc-7gen4': 'other', 'qc-720g': 'other', 'amd-epyc-7401': 'other', 'nv-orin-agx': 'other', 'amd-zen3-5800x': 'other',
  };
  Object.keys(want).forEach((id) => assert.strictEqual(tplOf(id), want[id], id));
  // 判定できない(ダイ情報なし・x86 以外)ものは従来の配置(layout なし)
  assert.strictEqual(FP.classify({ id: 'x', isa: 'arm', dies: [{ name: 'A', mm2: 10 }], cfg: { cores: [{ type: 'P', count: 2 }] } }), null);
  assert.strictEqual(FP.classify({ id: 'x', isa: 'x86', dies: [], cfg: { cores: [{ type: 'P', count: 2 }] } }), null);
  assert.strictEqual(FP.classify(null), null);
});

test('全プリセット: テンプレートごとの件数(Kraken Point などの追加時は更新する)', () => {
  const n = {};
  presets.forEach((p) => { const t = tplOf(p); n[t] = (n[t] || 0) + 1; });
  const sum = Object.keys(n).reduce((s, k) => s + n[k], 0);
  assert.strictEqual(sum, presets.length);
  FP.TEMPLATE_IDS.forEach((t) => assert.ok(n[t] > 0, `${t} に当たるプリセットが無い`));
  assert.ok(n.other > 0);
  assert.strictEqual(n['amd-apu'], 7, 'amd-apu: Kraken Point 追加後の件数');
});

test('全プリセット: ブロックはダイ内に収まり、重ならず、検証の警告が無い', () => {
  presets.forEach((p) => {
    const d = mk(p);
    assert.deepStrictEqual(design.validate(d), [], p.id);
    assert.deepStrictEqual(design.parse(design.serialize(d)).ok, true, p.id);
  });
});

test('全プリセット: コア数・L3 の個数と容量が元のプリセットと一致し、ダイの面積は公表値のまま', () => {
  presets.forEach((p) => {
    const d = mk(p);
    assert.strictEqual(coreBlocks(d).length, total(p), `${p.id}: コア数`);
    const l3 = d.dies.reduce((a, die) => a.concat(die.blocks.filter((b) => b.kind === 'l3')), []);
    const lay = (d.dies.find((x) => x.layout) || {}).layout;
    const want = p.cfg.l3MB ? (tplOf(p) === 'amd-chiplet' ? lay.units : (lay && (lay.frame === 'strix-point' || lay.frame === 'zeppelin' || lay.frame === 'gb10') ? 2 : 1)) : 0;
    assert.strictEqual(l3.length, want, `${p.id}: L3 ブロック数`);
    const srcDies = p.dies && p.dies.length ? p.dies : [{ mm2: null }];
    assert.strictEqual(d.dies.length, srcDies.length, `${p.id}: ダイ数`);
    d.dies.forEach((die, i) => {
      const s = srcDies[i];
      if (typeof s.mm2 === 'number') {
        assert.strictEqual(die.areaMm2, s.mm2, `${p.id}: 面積は公表値のまま`);
        assert.ok(Math.abs(die.widthMm * die.heightMm - s.mm2) < 1e-6, `${p.id}: 幅×高さ=面積`);
      }
    });
    // コア種別ごとの個数
    p.cfg.cores.forEach((g) => assert.strictEqual(coreBlocks(d).filter((b) => b.coreType === g.type).length, g.count, `${p.id} ${g.type}`));
  });
});

test('飾りブロック: Uncore・iGPU・NPU だけが decorative で、コアと L3 は決して飾りにならない', () => {
  let nDeco = 0;
  presets.forEach((p) => {
    mk(p).dies.forEach((die) => die.blocks.forEach((b) => {
      if (b.decorative) { nDeco++; assert.ok(['uncore', 'gpu', 'npu'].includes(b.kind), `${p.id}: ${b.kind}`); assert.strictEqual(b.decorative, true); }
      if (b.kind === 'core' || b.kind === 'l3') assert.ok(!b.decorative);
    }));
  });
  assert.ok(nDeco > 0);
  // iGPU・NPU の有無は DECOR_FACTS にある SKU だけ。F 付きや不明な SKU には足さない
  const kinds = (id) => mk(id).dies.reduce((a, die) => a.concat(die.blocks.filter((b) => b.decorative).map((b) => b.kind)), []).sort();
  assert.deepStrictEqual(kinds('intel-adl-12900k'), ['gpu', 'uncore', 'uncore']); // iGPU・Uncore・Platform I/O
  assert.deepStrictEqual(kinds('amd-strix-hx370'), ['gpu', 'gpu', 'npu'].concat(Array(6).fill('uncore'))); // 写真に合わせた GPU(2 ブロック)・NPU・PHY など
  assert.deepStrictEqual(kinds('amd-kraken-350'), ['gpu', 'gpu', 'npu'].concat(Array(6).fill('uncore'))); // Strix の配置の流用
  assert.deepStrictEqual(kinds('amd-zen1-1800x'), Array(23).fill('uncore')); // Zeppelin の写真の枠(IFOP・DDR PHY・UMC・IO Root など。2026-11-03)
  assert.deepStrictEqual(kinds('amd-zen1-1200'), Array(23).fill('uncore'));
  assert.deepStrictEqual(kinds('amd-zen5-9950x'), ['gpu'].concat(Array(6).fill('uncore'))); // CCD 2 個の上部の帯(各 3)+ IOD の iGPU
});

test('飾りブロックは評価に影響しない: ブロックを全部取り除いても評価結果は完全に同じ', () => {
  const ctx = E.makeContext();
  presets.forEach((p) => {
    const d = mk(p);
    const bare = JSON.parse(JSON.stringify(d)); bare.dies.forEach((die) => { die.blocks = []; delete die.layout; });
    assert.deepStrictEqual(E.evaluate(d, ctx), E.evaluate(bare, ctx), p.id);
    // 飾りだけ取り除いても同じ
    const noDeco = JSON.parse(JSON.stringify(d)); noDeco.dies.forEach((die) => { die.blocks = die.blocks.filter((b) => !b.decorative); });
    assert.deepStrictEqual(E.evaluate(d, ctx), E.evaluate(noDeco, ctx), p.id);
  });
});

test('ヒートマップ: 飾りブロックの電力はゼロで、総電力はコア・L3 などだけで按分される', () => {
  ['intel-adl-12900k', 'amd-strix-hx370'].forEach((id) => {
    const d = mk(id);
    const r = HM.blockPowers(d, 100);
    assert.ok(r.ok);
    let deco = 0; let sum = 0;
    d.dies.forEach((die) => die.blocks.forEach((b) => { sum += r.byBlock[b.id]; if (b.decorative) deco += r.byBlock[b.id]; }));
    assert.strictEqual(deco, 0);
    assert.ok(Math.abs(sum - 100) < 1e-9);
  });
});

test('12900K: 横長(約 2:1)。P コア 4 個×2 段、中央に横長の L3 帯、P の右に E クラスタ上下、右端に縦長 iGPU、左に Uncore と Platform I/O。縮尺は調査値どおり', () => {
  const die = mk('intel-adl-12900k').dies[0];
  assert.strictEqual(die.layout.scaleBasis, 'photo');
  assert.ok(Math.abs(die.widthMm / die.heightMm - 1682 / 846) < 0.03, '縦横比 約 2:1'); assert.strictEqual(die.areaMm2, 208);
  const l3 = die.blocks.find((b) => b.kind === 'l3'); const gpu = die.blocks.find((b) => b.kind === 'gpu');
  const unc = die.blocks.find((b) => b.label === 'Uncore'); const io = die.blocks.find((b) => b.label === 'Platform I/O');
  const P = die.blocks.filter((b) => b.coreType === 'P'); const Ec = die.blocks.filter((b) => b.coreType === 'E');
  assert.strictEqual(P.length, 8); assert.strictEqual(Ec.length, 8);
  assert.strictEqual(P.filter((b) => b.y + b.h <= l3.y + 1e-6).length, 4); assert.strictEqual(P.filter((b) => b.y >= l3.y + l3.h - 1e-6).length, 4);
  assert.ok(l3.w > l3.h * 3, 'L3 は横長');
  const pRight = Math.max.apply(null, P.map((b) => b.x + b.w));
  assert.ok(Ec.every((b) => b.x >= pRight - 1e-6));
  assert.strictEqual(Ec.filter((b) => b.y + b.h <= l3.y + 1e-6).length, 4); assert.strictEqual(Ec.filter((b) => b.y >= l3.y + l3.h - 1e-6).length, 4);
  assert.ok(gpu.x >= Math.max.apply(null, Ec.map((b) => b.x + b.w)) - 1e-6); assert.ok(gpu.h > gpu.w * 2, 'iGPU は縦長');
  assert.ok(unc.x + unc.w <= Math.min.apply(null, P.map((b) => b.x)) + 1e-6); assert.ok(io.x + io.w <= unc.x + 1e-6);
  // 縮尺: P コア ≈ 3.57%(Locuza の 7.43 / 208.08)、E クラスタ ≈ 4.16%、iGPU ≈ 16.1%(許容 ±20%)
  const dieA = die.widthMm * die.heightMm; const near = (v, t) => Math.abs(v / t - 1) < 0.2;
  assert.ok(near(P[0].w * P[0].h / dieA, 0.0357));
  assert.ok(near(Ec.slice(0, 4).reduce((s, b) => s + b.w * b.h, 0) / dieA, 0.0416));
  assert.ok(near(gpu.w * gpu.h / dieA, 0.161));
});

test('Zen 5 の 2CCD: CCD ごとに「コア列 | L3 | コア列」で 8 コア、L3 は 2 つ(半分ずつの容量)。ダイは 1 つのまま', () => {
  const d = mk('amd-zen5-9950x');
  assert.strictEqual(d.dies.length, 2);
  const ccd = d.dies.find((x) => x.layout);
  assert.strictEqual(ccd.layout.units, 2);
  const l3 = ccd.blocks.filter((b) => b.kind === 'l3');
  assert.strictEqual(l3.length, 2); assert.ok(l3.every((b) => b.label === 'L3 32MB'));
  l3.sort((a, b) => a.x - b.x);
  const cores = ccd.blocks.filter((b) => b.kind === 'core');
  const half = (lo, hi) => cores.filter((b) => b.x >= lo - 1e-6 && b.x + b.w <= hi + 1e-6).length;
  assert.strictEqual(half(0, l3[0].x + l3[0].w) + half(l3[0].x + l3[0].w, ccd.widthMm), 16);
  assert.strictEqual(cores.filter((b) => b.x + b.w <= l3[0].x + 1e-6).length, 4); // 1 つ目の CCD の左列
  // IOD は CCD の下側中央(別ダイ)
  const iod = d.dies.find((x) => !x.layout);
  assert.ok(iod.y >= ccd.y + ccd.heightMm);
  assert.ok(Math.abs((iod.x + iod.widthMm / 2) - (ccd.x + ccd.widthMm / 2)) < 1e-6);
});

test('コア数の編集(再配置)でも、同じテンプレートで作り直され、個数が合い、検証の警告が無い', () => {
  ['intel-adl-12900k', 'amd-zen5-9950x', 'amd-strix-hx370', 'intel-lnl-268v', 'intel-adl-12100'].forEach((id) => {
    const u = design.unlock(mk(id));
    const g = u.cfg.cores[0];
    [1, 3, 5, 17].forEach((n) => {
      const r = design.setCoreCount(u, g.type, n);
      assert.ok(r.ok, `${id} ${n}`);
      const cnt = coreBlocks(r.design).filter((b) => b.coreType === g.type).length;
      assert.strictEqual(cnt, n, `${id} ${n}`);
      assert.deepStrictEqual(design.validate(r.design), [], `${id} ${n}`);
      assert.ok(r.design.dies.some((x) => x.layout), id);
    });
    const r0 = design.setL3(u, 0); assert.ok(r0.ok);
    assert.ok(!r0.design.dies.some((x) => x.blocks.some((b) => b.kind === 'l3')));
    assert.deepStrictEqual(design.validate(r0.design), []);
    const r1 = design.setL3(r0.design, 16); assert.ok(r1.ok);
    assert.ok(r1.design.dies.some((x) => x.blocks.some((b) => b.kind === 'l3')));
  });
});

test('コアが 0 個・L3 なしなど境界でも壊れない(飾りだけ、または空)', () => {
  const die = { id: 'd', widthMm: 10, heightMm: 12 };
  const lay = { template: 'intel-hybrid', uncore: true, igpu: true, npu: false, units: 1 };
  const b0 = FP.layoutDie(die, [], 0, lay);
  assert.deepStrictEqual(b0.map((b) => b.kind).sort(), ['gpu', 'uncore', 'uncore']);
  const b1 = FP.layoutDie(die, [{ type: 'P', count: 1 }], 0, lay);
  assert.strictEqual(b1.filter((b) => b.kind === 'core').length, 1);
  const b2 = FP.layoutDie(die, [{ type: 'E', count: 3 }], 4, lay);
  assert.strictEqual(b2.filter((b) => b.kind === 'core').length, 3);
  [b0, b1, b2].forEach((bs) => bs.forEach((b) => { assert.ok(b.w > 0 && b.h > 0 && b.x >= 0 && b.y >= 0 && b.x + b.w <= 10 + 1e-9 && b.y + b.h <= 12 + 1e-9); }));
});

test('保存データの検証: decorative は真偽値のみ・コアと L3 には付けられない・layout は既知のテンプレートのみ', () => {
  const base = mk('intel-adl-12900k');
  const bad = (f) => { const d = JSON.parse(JSON.stringify(base)); f(d); return design.parse(JSON.stringify(d)); };
  assert.strictEqual(bad(() => {}).ok, true);
  assert.strictEqual(bad((d) => { d.dies[0].blocks.find((b) => b.kind === 'uncore').decorative = 'yes'; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].blocks.find((b) => b.kind === 'core').decorative = true; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.template = 'nope'; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.units = 99; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout = 5; }).ok, false);
  // 古い設計(layout も decorative も無い)はそのまま読める
  assert.strictEqual(bad((d) => { d.dies.forEach((x) => { delete x.layout; x.blocks.forEach((b) => { delete b.decorative; }); }); }).ok, true);
});

test('保存データの検証(追加): layout の型違いで例外にならず、decorative は uncore / gpu / npu だけ・混合設計では不可', () => {
  const base = mk('intel-adl-12900k');
  const parse = (f) => { const d = JSON.parse(JSON.stringify(base)); f(d); return design.parse(JSON.stringify(d)); };
  // toString を持つオブジェクトや数値などの型違いでも例外ではなく ok:false
  [{ toString: 1 }, 5, null, ['intel-hybrid']].forEach((t) => {
    let r; assert.doesNotThrow(() => { r = parse((d) => { d.dies[0].layout.template = t; }); });
    assert.strictEqual(r.ok, false);
  });
  assert.ok(parse((d) => { d.dies[0].layout.template = { toString: 1 }; }).reason.includes('文字列'));
  ['uncore', 'igpu', 'npu'].forEach((k) => assert.strictEqual(parse((d) => { d.dies[0].layout[k] = { toString: 1 }; }).ok, false));
  assert.strictEqual(parse((d) => { d.dies[0].layout.units = { toString: 1 }; }).ok, false);
  // decorative: kind が uncore / gpu / npu 以外(core・l3・kind なし・その他)は拒否
  const first = (d, k) => d.dies[0].blocks.find((b) => b.kind === k);
  assert.strictEqual(parse((d) => { first(d, 'gpu').decorative = true; }).ok, true);
  assert.strictEqual(parse((d) => { first(d, 'l3').decorative = true; }).ok, false);
  assert.strictEqual(parse((d) => { first(d, 'core').decorative = true; }).ok, false);
  assert.strictEqual(parse((d) => { delete first(d, 'uncore').kind; first(d, 'gpu').kind = undefined; d.dies[0].blocks.forEach((b) => { if (!b.kind) b.decorative = true; }); }).ok, false);
  assert.strictEqual(parse((d) => { first(d, 'uncore').kind = 'other'; first(d, 'gpu').decorative = true; first(d, 'gpu').kind = 'other'; }).ok, false);
  // 混合設計(origin.mode === 'mix')のブロックには付けられない
  const mix = design.fromScratch({ name: 'm' });
  mix.dies[0].blocks.push({ id: 'x1', kind: 'uncore', label: 'U', x: 0, y: 0, w: 1, h: 1, decorative: true });
  assert.strictEqual(design.parse(JSON.stringify(mix)).ok, false);
  delete mix.dies[0].blocks[0].decorative;
  assert.strictEqual(design.parse(JSON.stringify(mix)).ok, true);
});
