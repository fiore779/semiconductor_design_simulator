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
  // 2026-11-03: AMD のモノリシック・APU のダイ写真(Zeppelin・Raven Ridge・Cezanne・Rembrandt-R・Phoenix 1)で、schematic は 0 件になった
  ['amd-raven-2400g', 'amd-raven-2200g', 'amd-zen3-5800u', 'amd-zen3p-7735hs', 'amd-zen4-7840hs', 'amd-zen1-1800x', 'amd-zen1-1500x', 'amd-zen1-1200'].forEach((id) => assert.strictEqual(basis(id), 'photo', id));
  ['amd-zenplus-2700x', 'amd-zenplus-2600x'].forEach((id) => assert.strictEqual(basis(id), 'reuse', id));
  assert.strictEqual(basis('amd-strixhalo-395'), 'photo'); assert.strictEqual(basis('amd-epyc-7401'), null);
  assert.strictEqual(basis('amd-kraken-350'), 'reuse');
  assert.strictEqual(basis('intel-adl-12100'), 'schematic'); assert.strictEqual(basis('intel-arl-285k'), 'photo');
  assert.strictEqual(basis('apple-m1'), 'photo'); assert.strictEqual(basis('apple-m1ultra'), 'reuse'); assert.strictEqual(basis('apple-m4pro'), null); assert.strictEqual(basis('qc-8elite'), 'photo'); assert.strictEqual(basis('qc-7gen4'), null); assert.strictEqual(basis('mt-9400'), 'photo'); assert.strictEqual(basis('mt-8200'), 'schematic'); assert.strictEqual(basis('qc-6gen1'), 'schematic'); /* 2026-11-04: 縦横比だけ写真に合わせた 4 件(6 Gen 1・4 Gen 2・7 Gen 3・Dimensity 8200)は schematic */ assert.strictEqual(basis('nv-t239'), 'photo'); assert.strictEqual(basis('nv-orin-agx'), null); // 2026-11-03: Snapdragon は写真のある 14 件が photo(qc-8elite は旧 null)。画像なし・注釈なしで判別できない 7 件は従来の配置(null)
  assert.ok(FP.scaleText({ scaleBasis: 'reuse' }).includes('写真・測定なし')); assert.ok(FP.scaleText({ scaleBasis: 'reuse' }).includes('流用'));
  assert.ok(FP.scaleText({ scaleBasis: 'photo' }).includes('目測'));
  assert.ok(FP.scaleText({ scaleBasis: 'survey' }).includes('面積調査'));
  assert.ok(FP.scaleText(null).includes('模式図'));
  // 2026-11-04: 縦横比だけ採った 4 件(layout.aspect を持つ schematic)は専用の注記。2D(dieview)も 3D(pkgview3d)も scaleText(die.layout) を使う。ほかの schematic(12100 など)・従来の配置は不変
  const ASPECT4 = ['qc-6gen1', 'qc-4gen2', 'qc-7gen3', 'mt-8200'];
  ASPECT4.forEach((id) => { const t = FP.scaleText(layoutDie(mk(id)).layout); assert.ok(t.includes('縦横比だけ写真(ファイル名の寸法)に合わせた') && t.includes('模式で根拠なし') && !t.includes('配置も実チップのものではありません'), id); });
  assert.strictEqual(FP.scaleText(layoutDie(mk('intel-adl-12100')).layout), FP.SCALE_TEXT.schematic);
  assert.strictEqual(FP.scaleText({ scaleBasis: 'schematic' }), FP.SCALE_TEXT.schematic);
  presets.filter((p) => !ASPECT4.includes(p.id)).forEach((p) => { const x = layoutDie(mk(p)); if (x) assert.strictEqual(FP.scaleText(x.layout), FP.SCALE_TEXT[x.layout.scaleBasis], p.id); });
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
    assert.strictEqual(iod.areaKnown, true); assert.strictEqual(iod.areaMm2, 117.8); // 2026-11-05: IOD 面積 117.8mm² を取得(旧: 未取得で仮寸法)。縦横比は IOD_PLACE のまま
    assert.deepStrictEqual(design.validate(d), [], id);
  });
  ['amd-zen3-5600x', 'amd-zen3-5950x'].forEach((id) => assert.ok(!mk(id).dies.some((x) => x.blocks.some((b) => b.kind === 'gpu')), id));
  // Strix Halo の SoC ダイ(2026-11-03 から写真の枠。従来の「GPU」1 ブロックと同じく飾りではなく、電力按分に参加する)
  const sh = mk('amd-strixhalo-395').dies.find((x) => /SoC/.test(x.name));
  assert.deepStrictEqual(sh.blocks.filter((b) => b.decorative).map((b) => b.label), ['Big Dummy Area(ダミー領域)']); // 機能のないダミー領域だけ飾り
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

test('Raphael・Granite Ridge の IOD(Zen 4/5 共通): 縦横比 1.30(GNR_Package_Annotated.jpg の目測)、CCD との隙間は CCD 高さの 0.48 倍、CCD 1 つは IOD が CCD の右寄り(delidded.jpg の向き。実写は 180° 回転)、2 つは中央。面積は 2026-11-05 から 117.8mm²', () => {
  const P = FP.IOD_PLACE; assert.strictEqual(P.aspect, 1.30);
  ['amd-zen4-7700', 'amd-zen4-7950x', 'amd-zen5-9700x', 'amd-zen5-9950x'].forEach((id) => {
    const d = mk(id); const ccd = d.dies.find((x) => x.layout); const iod = d.dies.find((x) => /IOD/.test(x.name));
    assert.ok(Math.abs(iod.widthMm / iod.heightMm - 1.30) < 1e-6, id);
    assert.strictEqual(iod.areaKnown, true, id); assert.strictEqual(iod.areaMm2, 117.8, id); // 2026-11-05: 面積 117.8mm² を取得(旧: 未取得)。縦横比 1.30 は面積に依らない
    assert.ok(Math.abs(iod.widthMm * iod.heightMm - 117.8) < 0.01, id);
    assert.ok(Math.abs(iod.y - (ccd.y + ccd.heightMm) - ccd.heightMm * 0.48) < 1e-6, `${id} 隙間`);
    const dx = (iod.x + iod.widthMm / 2) - (ccd.x + ccd.widthMm / 2);
    const expect = ccd.layout.units === 1 ? 0.37 * iod.widthMm : 0;
    assert.ok(Math.abs(dx - expect) < 1e-6, `${id} 水平位置 ${dx}`);
    assert.ok(Math.min.apply(null, d.dies.map((x) => x.x)) === 0, id);
  });
  assert.ok(/IOD は Zen 4\/5 共通/.test(FP.CCD_RECIPES['Zen 4'].note) && FP.CCD_RECIPES['Zen 4'].note.length <= 600 && /delidded\.jpg/.test(FP.CCD_RECIPES['Zen 4'].note));
  assert.strictEqual(FP.CCD_RECIPES['Zen 4'].basis, 'reuse');
  assert.strictEqual(FP.CCD_RECIPES['Zen 5'].aspect, 1.188); // Zen 5 の CCD recipe は変えない
});

test('IOD の位置合わせの対象外: Zen 3(5600X・5950X)と Strix Halo の配置は従来どおり(隙間 max(4, 高さ×0.45)・中央揃い)', () => {
  const d = mk('amd-zen3-5950x'); assert.strictEqual(d.dies.length, 1);
  const sh = mk('amd-strixhalo-395'); const c = sh.dies.find((x) => x.layout); const s = sh.dies.find((x) => /SoC/.test(x.name));
  assert.ok(Math.abs(s.y - (c.heightMm + Math.max(4, c.heightMm * 0.45))) < 1e-6);
  assert.ok(Math.abs((s.x + s.widthMm / 2) - (c.x + c.widthMm / 2)) < 1e-6);
  const ids = D.presets.filter((p) => { const f = FP.classify(p, design.dieRole); return f && f.iodPlace; }).map((p) => p.id);
  assert.deepStrictEqual(ids, ['amd-zen4-7700', 'amd-zen4-7950x', 'amd-zen5-9700x', 'amd-zen5-9950x']);
});

test('評価(ST/MT/面積/電力など)は IOD の位置合わせの前後で全プリセット不変(固定のハッシュ。変更前の JSON ダンプの sha256)', () => {
  const E = require('../js/model/evaluate.js'); const ctx = E.makeContext(); const out = {};
  // 2026-11-04: Core Ultra 5 325・Core 5 320 は、この固定ハッシュの後に追加したプリセットなので対象外(既存 100 件のハッシュは追加の前後で一致を確認。追加分の評価は mix.test.js の BASE_M5B で固定)
  // 2026-11-06: nv-gb10 も対象外にした(GB7 の採用で公開値・誤差・notes が変わるため。全 102 件のダンプ比較で nv-gb10 以外は不変を確認。ハッシュは 99 件ぶんに更新、旧 b022617f…)
  D.presets.filter((p) => !['intel-ptl-u5-325', 'intel-wcl-c5-320', 'nv-gb10'].includes(p.id)).forEach((p) => { out[p.id] = E.evaluate(design.fromPreset(p), ctx); });
  assert.strictEqual(require('crypto').createHash('sha256').update(JSON.stringify(out)).digest('hex'), '2b03ec5dd1ede797986de0b520982f2d9fa61ea497cee0b744e38990ff5238e5'); /* 2026-11-07(ユーザー指示「全体の中央値を取得してください」): モバイル x86 13 SKU の Geekbench 7 公開値を直近 25 件の全体中央値に取り直した(data/benchmarks/gb7-scores.js を tools/extract-gb7.js で再生成。区分「直近25件の中央値」・n)。予測の ST/MT は不変で、公開値・誤差・判定・errCause(偏りの注意)が変わった。直前のハッシュ 4634987e…)(以下は前の記録) 2026-11-07(レビュー対応: 出典 URL・代表の注記〔機種中央値 n〕・errCause〔Kraken の一致係数 0.795 など〕・k の文面を直しただけで、評価の数値は不変。直前のハッシュ 832b81ac…)(以下は前の記録) 2026-11-07(ユーザー指示「NG の原因をできれば特定して直して」): ① Zen+ に uFrom: Zen 1、② Zen 3 の校正代表に 5800X(σ 0.0274→0.0289、x86 平均 u 107.8→106.8)、③ Oryon Performance の uFrom と σ の代表からスマホ SoC を除外、Cortex-A76/A77/X1 の代表(855・865・888)と Cortex-A78 の uCal 117.4、④ Arrow Lake の L3 遅延(Lion Cove 75→84・Skymont 69)、⑤ mobile の MT 係数 0.92→0.91。全 SKU の ST/MT が動く(x86 も)。errCause(原因の説明)も追加。mobile-pc の 0.81 と帯係数 0.69/0.76 は不変。直前のハッシュ 2571e442…)(以下は前の記録) 2026-11-07(スマホ SoC の MT 持続クロック係数 MT_CLOCK_FACTOR.mobile を 0.81 → 0.92 に再校正。ユーザー指示「NG になっているものも修正して」。kind:mobile の MT が約 +13.6% 動く〔Snapdragon・Dimensity 18 件〕。ST・x86・Apple・NVIDIA の数値と mobile-pc の係数は不変。直前のハッシュ d5abf650…)(以下は前の記録) 2026-11-07(続き。ユーザー指示「GB10 の測定だけ低すぎるのでそれだけ修正したら確定。8 Gen 3 の L3 キャッシュも入れて」): 8 Gen 3 に l3MB 12 を入れ、GB10 を Cortex-X925 の 2 件目の校正代表にした。X925 の u が 81.389→95.707、X4 の u が 82.587→74.868、uIsa.arm 104.271→103.758 に動き、Arm SoC の評価の数値が動いた(x86・MT 帯係数は不変)。mt-9400 の ST は代表の 0% から +17.6% に。GB10 自身はこのハッシュの対象外。8 Gen 3 の notes も変わった。直前のハッシュ fbe81cd1…)(以下は前の記録) 2026-11-07(レビュー対応: Orin の l3MB を 6→10〔L3 6 + System Cache 4〕に、l3Note の文面〔「の合計」の付け方・9200/9300〕を直した。GB10 は対象外のハッシュだが 40MB に。直前のハッシュ 2af91863…)(以下は前の記録) 2026-11-07(SLC 全体を L3 相当に。ユーザー指示「現在は GPU の機能は未実装なので、SLC 全体を使えるようにしてください」): Apple 23・Snapdragon 10・Dimensity 6 の計 39 件の SoC に cfg.l3MB を入れ(L3 + SLC の合計)、MT の l3Ref 計算が効くようになった。Arm の校正の代表(M1・M2・A16・8 Gen 1/2/3 は 8 Gen 3 を除く・8 Elite・9400)も動いて Arm の u と uIsa.arm(113.761→104.271)が変わり、l3MB を入れていない Arm SoC も含めて評価の数値が動く(x86・MT 帯係数 0.69/0.76 は不変。判定の反転は docs/research/slc-as-l3-2026-11-07.md)。notes・l3Note の文面と A17 Pro の errCause も変わった。直前のハッシュ a62bbcba…(以下は前の記録) 2026-11-07(TDP 選択: T239 に power.range 8〜19W と notes の【可変 TDP】を追加しただけで、評価の数値は不変。直前のハッシュ 39666f8a…)(以下は前の記録) 2026-11-07(レビュー対応: Apple のトランジスタ数の記載範囲と 780G のメモリ両論併記を notes に追記しただけで、評価の数値は不変。直前のハッシュ 237ebcc6…)(以下は前の記録) 2026-11-07(SoC 公式照合の最終: Qualcomm・MediaTek・Apple・NVIDIA の notes/memory/note の文面と、クロック 7 件〔Qualcomm 6 + 9400 の P 3.63→3.62〕。9400 は Arm の校正の代表のため Cortex-X925 の u 90.4787→90.6919、uIsa.arm 113.7276→113.7611 が動き、全 102 件のダンプ比較で数値が変わるのは 24 件〔校正の変更ぶんは最大約 0.2%(GB10 の ST +0.24%)、判定の反転なし〕。MT 帯係数 0.69/0.76 は不変。Apple の変更は notes のみ、NVIDIA は notes と power/area の note 文面のみで数値は不変。直前のハッシュ 428691c5…、その前 87e43b2e…)(以下は Qualcomm の段階の記録) 2026-11-07(Qualcomm の公式照合。ユーザー指示「全体のデータを公式のデータにしてください」): Qualcomm 21 件の notes/memory を公式の文面に、クロック 6 件を公式値に訂正。評価の数値が変わるのは 8 Elite Gen 5〔E 3.63→3.62、MT 10960.5→10940.4〕・8s Gen 4〔P 3.21→3.2、ST 1332.5→1329.0〕・4 Gen 2〔P 2.2→2.3・E 1.95→2.0、ST 738.1→766.5、MT 1756.3→1815.8〕の 3 件のみ(ST/MT の判定は不変。校正は不変)。旧 e574488c…)(以下は 4 回目の記録) 2026-11-07(4 回目。レビュー対応で notes/URL/l3Note の文面だけ変更〔ARK の仮スラッグ除去、AMD の l3Note を公式に、12900K の note など〕。数値の評価は直前と同一。直前のハッシュ 3b7d0628…)(3 回目の本文)2026-11-06(3 回目。全体を公式データに: power の区分を sec→pub に上げたのは Intel 16 SKU〔AMD は TDP の 21 SKU〕。notes・note・l2・memory・l3Note の文面が変わったプリセットは Intel 22 件・AMD 21 件〔評価に notes と power.published が含まれる〕、14700HX の range を ARK の定義 {45,157} に変えたため 14700HX の MT 帯が 0→1 になり MT 15235.2→16538.4、185H は range.maxW の表示だけ 65→115。全 102 件のダンプ比較で数値が変わるのは 14700HX の MT 系のみ〔ST・電力・温度・持続クロック・警告は不変〕。校正は不変。旧 2b7d58bd…)(AMD 公式照合。HX 370 の Zen 5c boost 3.4→3.3 で HX 370 の評価が変わり〔MT 12543.3→12352.4〕、395・5800U の memory 表記と HX 370・350・395・7840HS・7735HS・5800U・EPYC 7401・2700X・2600X の notes/l3Note が変わった。全 102 件のダンプ比較で数値が変わるのは HX 370 のみ。旧 f637334b…) 2026-11-06(2 回目。レビュー対応で 13700K の notes に P boost 変更の出典を追記したため再更新。数値の評価は不変、変わるのは notes の文面だけ。直前のハッシュ b5ff4e6b…)(2 回目の本文): 13900K・13700K の P boost を ARK の P コア最大ターボに揃え(5.8→5.4・5.4→5.3)、Golden/Raptor の uCal を 112.7→114.1 に再計算したため更新(旧 8fb63a19…)。評価が変わるのは 13900K・13700K と、uCal を使う Golden/Raptor 9 件(12900K・12700K・12600K・12100・13600K・14600K・14700K・14900K・14700HX)の 11 件。ほかは 285K・265K の notes の文面だけ */ // 2026-11-06: 上の理由で 99 件ぶんに更新(変更前の HEAD でも同じ 99 件で同じハッシュを確認)(旧 b022617f…)// 2026-11-05(2 回目: レビュー対応で M3 Pro に cfg.l2 と notes の文面を追加しただけで、評価の数値は不変。旧 fddc1f9e…)(未取得データの追加。ユーザー指示「ほかの取得できていないデータがあるチップもできるだけ集めてください」): 評価が変わるのは 14 件(13900K・268V・258V・256V・388H・275HX・5800X・Kraken Point・7700・7950X・9700X・9950X・M1 Ultra・Orin)、ほかに notes・memory・l2 の文面が変わるプリセットが多数(ハッシュは evaluate の結果全体で preset の notes を含む)。校正(u・σ・γ)と MT 帯係数 0.69/0.76 は不変。旧 3ff6dcc8…)(3 回目: レビュー対応で 265K・285K の notes に適用範囲の注記を追記しただけで、評価の数値は不変。旧 706f95bf…)(2 回目: 265K の P boost 5.5→5.4・285K の P boost 5.7→5.5 〔ARK の Performance-core Max Turbo〕 で Lion Cove の u を再校正。100 件のうち変わったのは 28 件〔325・320 は対象外〕。ST/MT のほか 265K・285K は電力モデル・温度も変わる。旧 8250e7cb…)(14900K の P・E ベース 3.2/2.4GHz と 265K の E ブースト 4.6GHz を ARK 原ページで追加。14900K は電力モデル・温度・持続クロックが出て、265K は MT が 23909 → 27617 に変わったため。他の 100 件は不変。旧 3f4f49dd…)(3 回目〔最終〕: Dimensity 9600 Pro の peak 22.7W を power から外して notes に移し、M5 Max の note を追記したため。評価の数値は不変。旧 399a9bbc…)(2 回目: Apple の peak の note に原ページ確認状況を反映しただけで、評価の数値は不変。旧 c98373a2…)(電力データの取得。ユーザー指示「TDP が取れていないものをできるだけ取得」): 37 件のプリセットの電力の公表値・注記が変わり、うち 12 件は電力モデル・温度・持続クロックが出る〔8 件〕/変わる〔4 件〕、7840HS は MT の帯が 0.81 → 0.69 に変わった(ST は 102 件すべて不変)ためハッシュを更新(旧 60e001b5…)。以下は旧ハッシュ時点の記録: // 2026-11-05(ユーザー申告で HX370 の Zen 5c を base 2.0 / boost 3.4GHz に更新): 変わったのは HX370 の評価だけ(MT・電力モデル・温度が出るように。errCause.mt と notes の文面を含む)のためハッシュを更新(旧 100c5b20…)。以下は旧ハッシュ時点の記録: 同日の 2 回目の更新: 評価値は不変のまま、レビュー対応で HX370・5800U の errCause.mt の文面だけを直したため(ハッシュは evaluate の結果全体で errCause 文面を含む) // 2026-11-05: MT の帯 0 係数を 0.65 → 0.69 に再校正したため MT の評価値が変わった(帯 0 の mobile-pc 5 件〔325・320 は対象外〕: 5800U・7735HS・HX370・14700HX・Kraken Point)。ST・面積・電力・温度は不変。あわせて 3 件(HX370・Kraken・5800U)の errCause.mt の文面も更新
});
