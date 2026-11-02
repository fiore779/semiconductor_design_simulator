'use strict';
// Apple シリコンのダイ写真に倣った配置(floorplan.js の apple-soc)のテスト。配置・大きさは写真の目測で、実チップのフロアプランではない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const lay = (id) => mk(id).dies[0].layout || null;
const cores = (d) => d.dies[0].blocks.filter((b) => b.kind === 'core');

const PHOTO = ['apple-m1', 'apple-m1pro', 'apple-m1max', 'apple-m2', 'apple-m2pro', 'apple-m3', 'apple-m3pro', 'apple-m3max', 'apple-m4', 'apple-m5', 'apple-a12', 'apple-a13', 'apple-a14', 'apple-a15', 'apple-a16', 'apple-a17pro', 'apple-a18', 'apple-a18pro', 'apple-a19pro', 'apple-a20pro'];
const REUSE = ['apple-m1ultra', 'apple-m2max', 'apple-m2ultra'];
const SCHEM = ['apple-m4pro', 'apple-m5max'];

test('Apple: photo 20 件・reuse 3 件はテンプレート apple-soc、残り(M4 Pro・M5 Max。画像なし)は従来の配置のまま', () => {
  PHOTO.forEach((id) => { const l = lay(id); assert.ok(l && l.template === 'apple-soc' && l.scaleBasis === 'photo', id); assert.ok(l.scaleNote.includes('目測') && l.scaleNote.includes('実チップのフロアプランではない'), id); });
  REUSE.forEach((id) => { const l = lay(id); assert.ok(l && l.template === 'apple-soc' && l.scaleBasis === 'reuse', id); });
  SCHEM.forEach((id) => assert.strictEqual(lay(id), null, id));
  const all = D.presets.filter((p) => /^apple-/.test(p.id)).map((p) => p.id);
  assert.strictEqual(all.length, PHOTO.length + REUSE.length + SCHEM.length);
  assert.ok(lay('apple-m5').scaleNote.includes('出典は'), '出典が推定であること');
  assert.ok(lay('apple-m2max').scaleNote.includes('Apple 公表') && lay('apple-m2max').scaleNote.includes('M2 Max 自身のダイ写真なし'));
});

test('Apple: ダイ面積は公表値のまま・ダイ数は不変・縦横比は写真(M1 Max は寸法注記 0.86)・ダイ内に収まり重ならない・コア数が一致', () => {
    // 寸法注記のあるもの(M1 Pro 18.9×12.9、M1 Max 19.3×22.4、Ultra 19.3×44.8)だけ注記の比。ほかは写真の枠の比(幅/高さ)
  const asp = { 'apple-m1': 1.005, 'apple-m1pro': 1.465, 'apple-m1max': 0.86, 'apple-m2': 1.107, 'apple-m2pro': 1.506, 'apple-m3': 1.2, 'apple-m3pro': 0.826, 'apple-m3max': 0.954, 'apple-m4': 0.968, 'apple-m5': 1.055, 'apple-a14': 0.821, 'apple-a15': 0.683, 'apple-a12': 1.183, 'apple-a13': 1.174, 'apple-a16': 0.619, 'apple-a17pro': 0.6485, 'apple-a18': 0.664, 'apple-a18pro': 0.649, 'apple-a19pro': 0.6534, 'apple-a20pro': 0.6478, 'apple-m1ultra': 0.43 };
  PHOTO.concat(REUSE).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = d.dies[0];
    assert.strictEqual(d.dies.length, p.dies.length, id); assert.strictEqual(die.areaMm2, p.dies[0].mm2, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - p.dies[0].mm2) < 1e-6, id);
    if (asp[id]) assert.ok(Math.abs(die.widthMm / die.heightMm / asp[id] - 1) < 0.01, `${id} ${die.widthMm / die.heightMm}`);
    assert.deepStrictEqual(design.validate(d), [], id);
    assert.strictEqual(cores(d).length, (p.cfg.cores || []).reduce((s, g) => s + g.count, 0), id);
    (p.cfg.cores || []).forEach((g) => assert.strictEqual(cores(d).filter((b) => b.coreType === g.type).length, g.count, `${id} ${g.type}`));
    assert.ok(!die.blocks.some((b) => b.kind === 'l3'), 'SLC は L3 ではなく飾り(cfg に L3 なし)');
    die.blocks.filter((b) => b.kind !== 'core').forEach((b) => assert.strictEqual(b.decorative, true, `${id} ${b.label}`));
  });
  // M2 Max の縦横比は M2 Pro の枠の GPU 側を 2 倍にして 0.91(面積比 485.6/294.7 から出した 0.92 と一致)
  const m2m = mk('apple-m2max').dies[0]; assert.ok(lay('apple-m2max'));
  assert.ok(Math.abs(m2m.widthMm / m2m.heightMm - 0.914) < 0.01);
});

test('Apple: 飾りの種類(GPU・NPU・SLC・メディア・PHY・I/O)と、写真で読める配置(M5・M1 Max・M4)', () => {
  const kinds = (id) => new Set(mk(id).dies[0].blocks.filter((b) => b.decorative).map((b) => b.kind));
  PHOTO.forEach((id) => { const k = kinds(id); assert.ok(k.has('gpu') && k.has('uncore') && (k.has('npu') || id === 'apple-a17pro'), id); }); // A17 Pro は NPU の注記が写真に無い
  const m5 = mk('apple-m5').dies[0]; const lab = (l) => m5.blocks.filter((b) => b.label === l);
  assert.strictEqual(m5.blocks.filter((b) => b.coreType === 'super').length, 4); assert.strictEqual(m5.blocks.filter((b) => b.coreType === 'E').length, 6);
  assert.ok(lab('SLC').length === 3 && lab('Display Engine').length === 1);
  // M5: GPU は上 2 段(コアより上)、S コアは左 2 つずつ(上下)
  const sy = Math.min.apply(null, m5.blocks.filter((b) => b.coreType === 'super').map((b) => b.y));
  assert.ok(m5.blocks.filter((b) => b.kind === 'gpu').every((b) => b.y + b.h <= sy + 1e-6));
  // M1 Max: P コア 8(上段 4・下段 4)の下に GPU、GPU の左右に SLC ×2 ずつ
  const mx = mk('apple-m1max').dies[0]; const gpu = mx.blocks.find((b) => b.kind === 'gpu');
  assert.ok(mx.blocks.filter((b) => b.coreType === 'P').every((b) => b.y + b.h <= gpu.y + 1e-6));
  assert.strictEqual(mx.blocks.filter((b) => b.label === 'SLC').length, 4);
  assert.ok(mx.blocks.filter((b) => b.label === 'SLC').every((b) => b.x + b.w <= gpu.x + 1e-6 || b.x >= gpu.x + gpu.w - 1e-6));
  // コア 1 個の面積比: M5 の S コア(private L2 込み)≈ ダイの 2.3%(apple-images.md の目測 4 個で約 9%)、M4 の P コア ≈ 1.9%(4 個で約 7.5%)。許容 ±25%
  const frac = (die, sel) => { const b = die.blocks.find(sel); return b.w * b.h / (die.widthMm * die.heightMm); };
  assert.ok(Math.abs(frac(m5, (b) => b.coreType === 'super') / 0.0225 - 1) < 0.25);
  assert.ok(Math.abs(frac(mk('apple-m4').dies[0], (b) => b.coreType === 'P') / 0.0188 - 1) < 0.25);
});

test('Apple: M3 Pro(P6・E6)・M3 Max(P12・E4)はプリセットのコア構成(2026-11-01 追記)どおり、枠に実コアのブロックが入る(「構成未取得」の飾りは出ない)', () => {
  [['apple-m3pro', 6, 6], ['apple-m3max', 12, 4]].forEach(([id, nP, nE]) => {
    const d = mk(id); const cs = cores(d);
    assert.strictEqual(cs.length, nP + nE, id);
    assert.strictEqual(cs.filter((b) => b.coreType === 'P').length, nP, id);
    assert.strictEqual(cs.filter((b) => b.coreType === 'E').length, nE, id);
    assert.strictEqual(d.dies[0].blocks.filter((b) => /構成未取得/.test(b.label)).length, 0, id);
    assert.deepStrictEqual(design.validate(d), [], id); // ダイ内に収まり重ならない
    assert.strictEqual(d.dies[0].layout.scaleBasis, 'photo', id);
  });
});

test('Apple: M2 Max は M2 Pro の配置が土台(CPU 側は同じ・GPU の領域が 2 倍)、Ultra は Max の配置を上下に 2 つ(ダイは 1 つのまま)', () => {
  const pro = mk('apple-m2pro').dies[0]; const mxd = mk('apple-m2max').dies[0];
  // 同じ縮尺(px あたりの mm)ならコアの大きさは同じ: M2 Pro の幅 884px = 21.11mm、M2 Max も同じ幅の枠
  const k = (die) => die.widthMm / 884; // mm / 枠の px
  const c0 = (die) => die.blocks.find((b) => b.coreType === 'P');
  assert.ok(Math.abs(c0(pro).w / k(pro) - c0(mxd).w / k(mxd)) < 3); // 同じ大きさ(余白の丸めの差のみ)
  const g = (die) => die.blocks.find((b) => b.kind === 'gpu');
  assert.ok(Math.abs((g(mxd).h / k(mxd)) / (g(pro).h / k(pro)) - 2) < 0.05, 'GPU の高さが 2 倍');
  assert.strictEqual(mxd.blocks.filter((b) => b.coreType === 'P').length, 8); assert.strictEqual(mxd.blocks.filter((b) => b.coreType === 'E').length, 4);
  // Ultra: ダイは 1 つ(面積・歩留まり不変)、Max の配置が上下に 2 つ(コアは 8P+4E ずつ)
  [['apple-m1ultra', 16, 4], ['apple-m2ultra', 16, 8]].forEach(([id, nP, nE]) => {
    const d = mk(id); const die = d.dies[0];
    assert.strictEqual(d.dies.length, 1);
    assert.strictEqual(die.blocks.filter((b) => b.coreType === 'P').length, nP); assert.strictEqual(die.blocks.filter((b) => b.coreType === 'E').length, nE);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'gpu').length, 2, id);
    const gs = die.blocks.filter((b) => b.kind === 'gpu').sort((a, b) => a.y - b.y);
    assert.ok(gs[0].y + gs[0].h <= die.heightMm / 2 + 1e-6 && gs[1].y >= die.heightMm / 2 - 1e-6, `${id}: 上下に 1 つずつ`);
    assert.deepStrictEqual(design.validate(d), [], id);
  });
  assert.ok(Math.abs(mk('apple-m1ultra').dies[0].widthMm / mk('apple-m1ultra').dies[0].heightMm - 0.43) < 0.01);
});

test('Apple: 編集でコア数が写真の枠を超えたら schematic に落ちる。枠内なら photo のまま(空き枠を残す)', () => {
  const ed = (id, type, n) => { const u = design.unlock(mk(id)); const r = design.setCoreCount(u, type, n); assert.ok(r.ok); assert.deepStrictEqual(design.validate(r.design), [], `${id} ${n}`); return r.design.dies[0]; };
  assert.strictEqual(ed('apple-m1', 'P', 2).layout.scaleBasis, 'photo');
  assert.strictEqual(ed('apple-m1', 'P', 6).layout.scaleBasis, 'schematic');
  assert.strictEqual(ed('apple-m1ultra', 'P', 16).layout.scaleBasis, 'reuse');
  assert.strictEqual(ed('apple-m1ultra', 'P', 20).layout.scaleBasis, 'schematic');
  assert.strictEqual(ed('apple-m5', 'E', 6).layout.scaleBasis, 'photo');
  assert.strictEqual(ed('apple-m5', 'E', 9).layout.scaleBasis, 'schematic');
});

test('Apple: 保存データの検証(frame の値・units)と保存の往復', () => {
  const base = mk('apple-m1pro');
  const bad = (f) => { const d = JSON.parse(JSON.stringify(base)); f(d); return design.parse(JSON.stringify(d)); };
  assert.strictEqual(bad(() => {}).ok, true);
  assert.strictEqual(bad((d) => { d.dies[0].layout.frame = 'apple-m99'; }).ok, false);
  assert.strictEqual(bad((d) => { d.dies[0].layout.units = 9; }).ok, false);
  assert.strictEqual(design.parse(design.serialize(mk('apple-m5'))).ok, true);
  assert.ok(FP.TEMPLATE_IDS.includes('apple-soc') && Object.keys(FP.APPLE_FRAMES).length === 21);
});

test('Apple: 改良モードで L3 を足す(setL3 0 → 4MB)と根拠なし(schematic)の従来配置に落ち、L3 ブロックが 1 つ出る。0 に戻して枠内に戻る編集はしない', () => {
  ['apple-m1', 'apple-m1ultra', 'apple-m5', 'apple-m3pro'].forEach((id) => {
    const u = design.unlock(mk(id));
    const r = design.setL3(u, 4); assert.ok(r.ok, id);
    const die = r.design.dies[0];
    assert.strictEqual(r.design.cfg.l3MB, 4, id);
    assert.strictEqual(die.layout.scaleBasis, 'schematic', id); assert.ok(die.layout.scaleNote.includes('L3 を追加'), id);
    const l3 = die.blocks.filter((b) => b.kind === 'l3'); assert.strictEqual(l3.length, 1, id); assert.strictEqual(l3[0].label, 'L3 4MB', id);
    assert.ok(!die.blocks.some((b) => b.decorative), `${id}: 従来配置には飾りが無い`);
    assert.deepStrictEqual(design.validate(r.design), [], id);
    // さらに L3 の容量を変えても label が更新され、コア数の編集も壊れない
    const r2 = design.setL3(r.design, 8); assert.ok(r2.ok); assert.strictEqual(r2.design.dies[0].blocks.find((b) => b.kind === 'l3').label, 'L3 8MB', id);
    assert.deepStrictEqual(design.validate(r2.design), [], id);
    if (r2.design.cfg.cores.length) { const t = r2.design.cfg.cores[0].type; const r3 = design.setCoreCount(r2.design, t, 2); assert.ok(r3.ok); assert.deepStrictEqual(design.validate(r3.design), [], id); }
    // 評価はブロックを見ないので、L3 の設計値(cfg)の評価だけが変わる(ダイ面積は不変)
    assert.strictEqual(die.areaMm2, byId(id).dies[0].mm2);
  });
  // L3 を足さない編集(クロック・L3 0 のまま)は photo のまま
  const u = design.unlock(mk('apple-m1')); const r = design.setL3(u, 0); assert.ok(r.ok); assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'photo');
});

test('checkLayout: template と frame の対応(apple-soc は APPLE_FRAMES、amd-apu は FRAMES、ほかは frame なし)。型違い・__proto__ でも例外にならない(fuzz)', () => {
  const ok = (l) => FP.checkLayout(l) === null;
  const apple = { template: 'apple-soc', units: 1, frame: 'apple-m1' };
  assert.ok(ok(apple));
  assert.ok(ok({ template: 'amd-apu', frame: 'strix-point', units: 1 })); assert.ok(ok({ template: 'amd-apu', frame: 'kraken-point' }));
  assert.ok(!ok({ template: 'apple-soc', frame: 'strix-point' })); // Apple に AMD の枠
  assert.ok(!ok({ template: 'amd-apu', frame: 'apple-m1' })); // AMD に Apple の枠
  assert.ok(!ok({ template: 'apple-soc' })); // frame 必須
  ['intel-hybrid', 'x86-mono', 'amd-chiplet', 'x86-tile'].forEach((t) => { assert.ok(!ok({ template: t, frame: 'strix-point' }), t); assert.ok(!ok({ template: t, frame: 'apple-m1' }), t); assert.ok(ok({ template: t }), t); });
  const weird = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '', 'APPLE-M1', ' apple-m1', 0, 1.5, true, [], {}, { toString: 1 }, ['apple-m1']];
  FP.TEMPLATE_IDS.forEach((t) => weird.forEach((f) => {
    let r; assert.doesNotThrow(() => { r = FP.checkLayout({ template: t, frame: f }); });
    assert.notStrictEqual(r, null, `${t} / ${JSON.stringify(f)}`);
  }));
  // JSON 経由(parse)でも同じ
  const d = mk('apple-m1'); d.dies[0].layout.frame = 'strix-point';
  assert.strictEqual(design.parse(JSON.stringify(d)).ok, false);
  const e = mk('apple-m1'); delete e.dies[0].layout.frame; assert.strictEqual(design.parse(JSON.stringify(e)).ok, false);
});

test('A シリーズ(photo 化 8 件 + A15 の置き換え): 2P+4E のコア、GPU 数、NPU・SLC、LPE の飾り、画像の寸法注記の扱い', () => {
  const A = ['apple-a12', 'apple-a13', 'apple-a14', 'apple-a15', 'apple-a16', 'apple-a17pro', 'apple-a18', 'apple-a18pro', 'apple-a19pro', 'apple-a20pro'];
  A.forEach((id) => {
    const d = mk(id); const die = d.dies[0]; const l = die.layout;
    assert.strictEqual(l.scaleBasis, 'photo', id); assert.ok(l.scaleNote.includes('出典') && l.scaleNote.includes('推定'), id);
    assert.strictEqual(die.blocks.filter((b) => b.coreType === 'P').length, 2, id); assert.strictEqual(die.blocks.filter((b) => b.coreType === 'E').length, 4, id);
    assert.ok(die.blocks.filter((b) => b.kind === 'gpu').length >= 1 && die.blocks.every((b) => b.kind === 'core' || b.decorative), id);
    assert.strictEqual(die.areaMm2, byId(id).dies[0].mm2, id); // プリセットの面積は変えない
    assert.ok(die.heightMm > die.widthMm || id === 'apple-a12' || id === 'apple-a13', `${id}: A12・A13 以外は縦長`);
  });
  const gpus = (id) => mk(id).dies[0].blocks.filter((b) => b.kind === 'gpu' && !/SL/.test(b.label)).length;
  assert.strictEqual(gpus('apple-a15'), 5); assert.strictEqual(gpus('apple-a16'), 5); assert.strictEqual(gpus('apple-a17pro'), 6); assert.strictEqual(gpus('apple-a18'), 5); assert.strictEqual(gpus('apple-a18pro'), 6);
  assert.strictEqual(gpus('apple-a19pro'), 6); assert.strictEqual(gpus('apple-a20pro'), 7);
  const slc = (id) => mk(id).dies[0].blocks.filter((b) => /^SLC|L3 cache/.test(b.label) && !/Ctrl|Controller/.test(b.label)).length;
  assert.deepStrictEqual([slc('apple-a15'), slc('apple-a16'), slc('apple-a17pro'), slc('apple-a18'), slc('apple-a19pro'), slc('apple-a20pro')], [2, 2, 2, 2, 4, 3]);
  // A19 Pro・A20 Pro の LPE コアはプリセットに無いので飾り(コア数に数えない)。寸法 8.03×12.29 / 8.00×12.35 mm はファイル名だけで、画像内に注記なし
  ['apple-a19pro', 'apple-a20pro'].forEach((id) => {
    const die = mk(id).dies[0]; const lpe = die.blocks.filter((b) => /LPE/.test(b.label));
    assert.strictEqual(lpe.length, 1, id); assert.ok(lpe[0].decorative && lpe[0].kind === 'uncore', id);
    assert.ok(die.layout.scaleNote.includes('ファイル名のみ') && die.layout.scaleNote.includes('画像内に注記なし'), id);
    assert.ok(die.blocks.filter((b) => b.kind === 'core').length === 6, id);
  });
  assert.ok(mk('apple-a20pro').dies[0].layout.scaleNote.includes('チップ名は画像内に無く'));
  // A15: TechInsights の写真(左がA16 …jpg の右半分)。縦横比 718/1051 = 0.683(プリセット 110.1 mm² → 8.67×12.70 mm)
  const a15 = mk('apple-a15').dies[0]; assert.ok(a15.layout.scaleNote.includes('TechInsights') && a15.layout.scaleNote.includes('ユーザー申告で A15'));
  assert.ok(Math.abs(a15.widthMm - 8.67) < 0.05 && Math.abs(a15.heightMm - 12.7) < 0.1);
  // A16: ダイ縁まで写る a16-hd.jpg の比 0.619 を、注釈つき左半分の 0.671 より優先(理由を note に)
  const a16 = mk('apple-a16').dies[0]; assert.ok(Math.abs(a16.widthMm / a16.heightMm - 0.619) < 0.005); assert.ok(a16.layout.scaleNote.includes('0.619') && a16.layout.scaleNote.includes('ダイ縁'));
  // A18 / A18 Pro: 横向きの写真を 90° 回して縦にする。画像内の面積(90 / 105 mm²)との差は記録のみ
  ['apple-a18', 'apple-a18pro'].forEach((id) => { const n = mk(id).dies[0].layout.scaleNote; assert.ok(n.includes('90° 回転') && n.includes('記録のみ'), id); });
  // 写真の GPU の上下関係: A18 Pro は回転後に GPU が上側(回転前は左端)、P コアが下側
  const a18p = mk('apple-a18pro').dies[0]; const gy = Math.max.apply(null, a18p.blocks.filter((b) => b.kind === 'gpu').map((b) => b.y + b.h)); const py = Math.min.apply(null, a18p.blocks.filter((b) => b.coreType === 'P').map((b) => b.y));
  assert.ok(gy <= py + 1e-6, 'GPU は P コアより上');
  // 評価はブロックを見ない・編集で枠を超えたら schematic
  const u = design.unlock(mk('apple-a16')); const r = design.setCoreCount(u, 'P', 3); assert.ok(r.ok); assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'schematic'); assert.deepStrictEqual(design.validate(r.design), []);
});
