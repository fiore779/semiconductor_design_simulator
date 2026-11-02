'use strict';
// フロアプランの縮尺(写真の目測・面積調査)と IOD の iGPU のテスト。配置は模式図で、実チップのフロアプランではない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const presets = D.presets;
const byId = (id) => presets.find((p) => p.id === id);
const mk = (p) => design.fromPreset(typeof p === 'string' ? byId(p) : p);
const layoutDie = (d) => d.dies.find((x) => x.layout);

test('Raptor Lake 8P+16E(13900K): arch2.jpg の写真の目測(photo)。縦横比 ≈ 2.15、E クラスタ 2 列。12700K は同じダイで空き枠を残す', () => {
  const die = mk('intel-rpl-13900k').dies[0];
  assert.strictEqual(die.layout.scaleBasis, 'photo');
  assert.ok(Math.abs(die.widthMm / die.heightMm - 2.146) < 0.02);
  const dieA = die.widthMm * die.heightMm; const P = die.blocks.filter((b) => b.coreType === 'P'); const Ec = die.blocks.filter((b) => b.coreType === 'E');
  assert.strictEqual(Ec.length, 16);
  // 写真の値(P ≈ 2.9%、E クラスタ ≈ 3.6%)。調査値(P 3.14%・E クラスタ 約 4%。block-areas.md)との差は 25% 以内
  assert.ok(Math.abs(P[0].w * P[0].h / dieA / 0.0314 - 1) < 0.25);
  assert.ok(Math.abs(Ec.slice(0, 4).reduce((s, b) => s + b.w * b.h, 0) / dieA / 0.04 - 1) < 0.25);
  const w = mk('intel-adl-12900k').dies[0]; const ed = mk('intel-adl-12700k').dies[0];
  assert.strictEqual(ed.widthMm, w.widthMm); assert.strictEqual(ed.heightMm, w.heightMm);
  assert.strictEqual(ed.blocks.filter((b) => b.coreType === 'E').length, 4);
  const p0 = (x) => x.blocks.find((b) => b.coreType === 'P');
  assert.strictEqual(p0(ed).w, p0(w).w); // コアの大きさは 12900K と同じ(空き枠があるので縮尺が変わらない)
});

test('縮尺の根拠(scaleBasis)と画面の注記', () => {
  const basis = (id) => { const x = layoutDie(mk(id)); return x ? x.layout.scaleBasis : null; };
  assert.strictEqual(basis('intel-adl-12900k'), 'photo'); assert.strictEqual(basis('intel-adl-12600k'), 'photo');
  assert.strictEqual(basis('amd-zen3-5950x'), 'photo'); assert.strictEqual(basis('amd-zen3-5600x'), 'photo');
  assert.strictEqual(basis('amd-zen5-9950x'), 'survey'); assert.strictEqual(basis('intel-rpl-14900k'), 'photo');
  assert.strictEqual(basis('amd-zen4-7950x'), 'reuse'); assert.strictEqual(basis('amd-strix-hx370'), 'photo');
  ['amd-raven-2400g', 'amd-zen3-5800u', 'amd-zen3p-7735hs', 'amd-zen4-7840hs'].forEach((id) => assert.strictEqual(basis(id), 'schematic', id));
  assert.strictEqual(basis('amd-kraken-350'), 'reuse');
  assert.strictEqual(basis('intel-adl-12100'), 'schematic'); assert.strictEqual(basis('intel-arl-285k'), 'photo');
  assert.strictEqual(basis('apple-m1'), 'photo'); assert.strictEqual(basis('apple-m1ultra'), 'reuse'); assert.strictEqual(basis('apple-m4pro'), null); assert.strictEqual(basis('qc-8elite'), null);
  assert.ok(FP.scaleText({ scaleBasis: 'reuse' }).includes('写真・測定なし')); assert.ok(FP.scaleText({ scaleBasis: 'reuse' }).includes('流用'));
  assert.ok(FP.scaleText({ scaleBasis: 'photo' }).includes('目測'));
  assert.ok(FP.scaleText({ scaleBasis: 'survey' }).includes('面積調査'));
  assert.ok(FP.scaleText(null).includes('模式図'));
  const n = {};
  presets.forEach((p) => { const x = layoutDie(mk(p)); const k = x ? x.layout.scaleBasis : 'none'; n[k] = (n[k] || 0) + 1; });
  assert.strictEqual(Object.values(n).reduce((a, c) => a + c, 0), presets.length);
  ['photo', 'survey', 'reuse', 'schematic', 'none'].forEach((k) => assert.ok(n[k] > 0, k));
  // 保存データの検証
  const bad = (f) => { const d = JSON.parse(JSON.stringify(mk('intel-adl-12900k'))); f(d); return design.parse(JSON.stringify(d)); };
  assert.strictEqual(bad(() => {}).ok, true);
  assert.strictEqual(bad((d) => { d.dies[0].layout.scaleBasis = 'x'; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.scaleNote = 5; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.slots = { p: 'a', e: 1 }; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.recipe = 'Zen 9'; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.scaleNote = { toString: 1 }; }).ok, false);
});

test('Zen CCD: 上部の帯(飾り)+ 左コア列 | L3 | 右コア列。Zen 3 は写真の比率、Zen 5 は測定値の比率', () => {
  const chk = (id, aspect, coreFrac, l3Frac, units) => {
    const die = layoutDie(mk(id));
    assert.strictEqual(die.layout.units, units);
    const ccdW = die.widthMm / (units + (units - 1) * 0.03); const ccdA = ccdW * die.heightMm;
    assert.ok(Math.abs(ccdW / die.heightMm / aspect - 1) < 0.02, `${id} 縦横比`);
    const cores = die.blocks.filter((b) => b.kind === 'core'); const l3 = die.blocks.filter((b) => b.kind === 'l3');
    assert.ok(Math.abs(cores[0].w * cores[0].h / ccdA / coreFrac - 1) < 0.2, `${id} コア+L2: ${cores[0].w * cores[0].h / ccdA}`);
    assert.ok(Math.abs(l3[0].w * l3[0].h / ccdA / l3Frac - 1) < 0.25, `${id} L3: ${l3[0].w * l3[0].h / ccdA}`);
    const bands = die.blocks.filter((b) => b.kind === 'uncore'); assert.strictEqual(bands.length, 3 * units);
    assert.ok(bands.every((b) => b.decorative && b.y + b.h <= Math.min.apply(null, cores.map((c) => c.y)) + 1e-6));
    ['Debug / テスト用', 'Infinity Fabric', 'SMU'].forEach((nm) => assert.ok(bands.some((b) => b.label === nm), nm));
  };
  chk('amd-zen3-5600x', 1.516, 0.05, 0.43, 1);
  chk('amd-zen3-5950x', 1.516, 0.05, 0.43, 2);
  chk('amd-zen5-9950x', 1.188, 0.071, 0.233, 2);
  // 6 コアの CCD(5600X)でも、コアの大きさは 8 コアの CCD と同じ(空き枠を残す)
  const six = layoutDie(mk('amd-zen3-5600x')).blocks.filter((b) => b.kind === 'core');
  const eight = layoutDie(mk('amd-zen3-5950x')).blocks.filter((b) => b.kind === 'core');
  assert.strictEqual(six.length, 6);
  assert.ok(Math.abs(six[0].h / layoutDie(mk('amd-zen3-5600x')).heightMm - eight[0].h / layoutDie(mk('amd-zen3-5950x')).heightMm) < 0.01); // ダイの高さに対する比が同じ
});

test('IOD: Zen 4 以降の IOD には内蔵 GPU の飾りブロックが付き、Zen 3 の 5600X・5950X(IOD なし)には付かない。面積・ダイ数は変わらない', () => {
  ['amd-zen4-7700', 'amd-zen4-7950x', 'amd-zen5-9700x', 'amd-zen5-9950x'].forEach((id) => {
    const d = mk(id); const p = byId(id);
    assert.strictEqual(d.dies.length, p.dies.length, id);
    const iod = d.dies.find((x) => /IOD/.test(x.name));
    const g = iod.blocks.filter((b) => b.kind === 'gpu');
    assert.strictEqual(g.length, 1, id); assert.strictEqual(g[0].decorative, true); assert.strictEqual(g[0].label, 'iGPU');
    assert.ok(!iod.blocks.find((b) => b.kind === 'uncore').decorative, 'SoC / I/O は従来どおり飾りではない');
    assert.strictEqual(iod.areaKnown, false); // 面積未取得は仮寸法のまま
    assert.deepStrictEqual(design.validate(d), [], id);
  });
  ['amd-zen3-5600x', 'amd-zen3-5950x'].forEach((id) => assert.ok(!mk(id).dies.some((x) => x.blocks.some((b) => b.kind === 'gpu')), id));
  const sh = mk('amd-strixhalo-395').dies.find((x) => !x.layout);
  assert.ok(sh.blocks.every((b) => !b.decorative));
});

test('Strix Point: 写真の目測(photo)。縦横比 ≈ 1.55、左に Zen 5 ×4 + L3 16MB、Zen 5c ×4+4 + L3 8MB、中央にメモリコントローラ、GPU(大)、右上 NPU、飾りは uncore / gpu / npu', () => {
  const d = mk('amd-strix-hx370'); const die = d.dies[0];
  assert.strictEqual(die.layout.scaleBasis, 'photo'); assert.strictEqual(die.areaMm2, 225.6);
  assert.ok(Math.abs(die.widthMm / die.heightMm - 1858 / 1200) < 0.01);
  const z5 = die.blocks.filter((b) => b.coreType === 'P'); const z5c = die.blocks.filter((b) => b.coreType === 'C');
  assert.strictEqual(z5.length, 4); assert.strictEqual(z5c.length, 8);
  const l3 = die.blocks.filter((b) => b.kind === 'l3'); assert.deepStrictEqual(l3.map((b) => b.label).sort(), ['L3 16MB', 'L3 8MB']);
  // 左列: Zen 5 → L3 16MB → Zen 5c(上段 4)→ L3 8MB → Zen 5c(下段 4)の順に縦に並ぶ
  const l16 = l3.find((b) => b.label === 'L3 16MB'); const l8 = l3.find((b) => b.label === 'L3 8MB');
  const ys = (a) => a.map((b) => b.y);
  assert.ok(Math.max.apply(null, z5.map((b) => b.y + b.h)) <= l16.y + 1e-6);
  const upper = z5c.filter((b) => b.y + b.h <= l8.y + 1e-6); const lower = z5c.filter((b) => b.y >= l8.y + l8.h - 1e-6);
  assert.strictEqual(upper.length, 4); assert.strictEqual(lower.length, 4); assert.ok(Math.min.apply(null, ys(upper)) >= l16.y + l16.h - 1e-6);
  // 右側は飾り: NPU は右上、GPU は大きく、メモリコントローラは Zen 5 クラスタの右
  const npu = die.blocks.find((b) => b.kind === 'npu'); const gpu = die.blocks.find((b) => b.label === 'GPU'); const mc = die.blocks.find((b) => b.label === 'メモリコントローラ');
  assert.ok(npu.decorative && gpu.decorative && mc.decorative);
  assert.ok(npu.x > die.widthMm * 0.65 && npu.y < die.heightMm * 0.3);
  assert.ok(gpu.w * gpu.h > npu.w * npu.h * 2);
  assert.ok(mc.x >= Math.max.apply(null, z5.map((b) => b.x + b.w)) - 1e-6);
  // 縮尺: Zen 5 のコア+L2 ≈ 1.8%(調査値 4.15mm² / 225.6)に対して ±10%
  assert.ok(Math.abs(z5[0].w * z5[0].h / (die.widthMm * die.heightMm) / 0.0184 - 1) < 0.1);
  assert.deepStrictEqual(design.validate(d), []);
});

test('編集でコア数が元のダイの枠を超えたら、根拠を schematic に落とす(超えなければ維持)', () => {
  const ed = (id, type, n) => { const u = design.unlock(mk(id)); const r = design.setCoreCount(u, type, n); assert.ok(r.ok); assert.deepStrictEqual(design.validate(r.design), [], `${id} ${n}`); return layoutDie(r.design); };
  assert.strictEqual(ed('intel-adl-12900k', 'P', 6).layout.scaleBasis, 'photo'); // 枠内(空き枠が増える)
  const over = ed('intel-adl-12900k', 'P', 10); assert.strictEqual(over.layout.scaleBasis, 'schematic'); assert.ok(over.layout.scaleNote.includes('編集'));
  assert.strictEqual(ed('amd-strix-hx370', 'P', 2).layout.scaleBasis, 'photo');
  const sx = ed('amd-strix-hx370', 'P', 6); assert.strictEqual(sx.layout.scaleBasis, 'schematic'); assert.strictEqual(sx.blocks.filter((b) => b.kind === 'core').length, 14);
  assert.strictEqual(ed('amd-zen5-9950x', 'P', 16).layout.scaleBasis, 'survey');
  assert.strictEqual(ed('amd-zen5-9950x', 'P', 20).layout.scaleBasis, 'schematic');
  assert.ok(FP.fits(null, []) && FP.afterEdit(null, []) === null);
});

test('Kraken Point: Strix Point の写真の配置の流用(reuse)。Zen 5 ×4・Zen 5c ×4 の 1 段ずつ、L3 は 1 ブロック(内訳未取得)、GPU は Strix の半分の面積、NPU は同じ。ダイ面積は未取得のまま', () => {
  const d = mk('amd-kraken-350'); const die = d.dies[0]; const s = mk('amd-strix-hx370').dies[0];
  assert.strictEqual(die.layout.scaleBasis, 'reuse'); assert.ok(die.layout.scaleNote.includes('このチップの写真・実測ではない')); assert.ok(die.layout.scaleNote.includes('根拠にしておらず'));
  assert.strictEqual(die.areaMm2, null); assert.strictEqual(die.areaKnown, false); // 仮寸法のまま(面積は未取得)
  assert.ok(Math.abs(die.widthMm / die.heightMm - 1858 / 905) < 0.01);
  assert.strictEqual(die.blocks.filter((b) => b.coreType === 'P').length, 4); assert.strictEqual(die.blocks.filter((b) => b.coreType === 'C').length, 4);
  const l3 = die.blocks.filter((b) => b.kind === 'l3'); assert.strictEqual(l3.length, 1); assert.strictEqual(l3[0].label, 'L3 16MB');
  const frac = (x, dd, sel) => dd.blocks.filter(sel).reduce((a, b) => a + b.w * b.h, 0) / (dd.widthMm * dd.heightMm);
  const isGpu = (b) => b.kind === 'gpu';
  // GPU の面積(frame に対する比 × frame の大きさ)は Strix の半分(8CU / 16CU)
  const gk = frac(null, die, isGpu) * 1858 * 905; const gs = frac(null, s, isGpu) * 1858 * 1200;
  assert.ok(Math.abs(gk / gs - 0.5) < 0.05, String(gk / gs));
  const npuk = die.blocks.find((b) => b.kind === 'npu'); const npus = s.blocks.find((b) => b.kind === 'npu');
  assert.ok(Math.abs((npuk.w * npuk.h * 1858 * 905 / (die.widthMm * die.heightMm)) / (npus.w * npus.h * 1858 * 1200 / (s.widthMm * s.heightMm)) - 1) < 0.01);
  assert.deepStrictEqual(design.validate(d), []);
  // 編集で枠を超える(Zen 5c 5 個)と schematic に落ちる
  const u = design.unlock(d); const r = design.setCoreCount(u, 'C', 6); assert.ok(r.ok);
  assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'schematic'); assert.deepStrictEqual(design.validate(r.design), []);
});
