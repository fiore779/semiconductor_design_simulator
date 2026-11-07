'use strict';
// NVIDIA GB10(DGX Spark。2026-11-03 追加)のプリセットと S-die のダイ写真に倣った配置(floorplan.js の arm-soc)のテスト。
// 配置・大きさは写真(GB102in1.jpg。Kurnal の注釈)の目測で、実チップのフロアプランではない。G-die は frame gb10-gpu(下の G-die のテスト)(従来の 1 ブロックの GPU)。docs/research/nvidia-gb10.md・user-images.md 参照。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');

const p = D.presets.find((x) => x.id === 'nv-gb10');
const mk = () => design.fromPreset(p);
const cores = (die) => die.blocks.filter((b) => b.kind === 'core');

test('GB10: プリセットの値(面積・構成・電力・GB7 なし・区分)', () => {
  assert.ok(p);
  assert.strictEqual(p.kind, 'pc'); assert.strictEqual(p.isa, 'arm'); assert.strictEqual(p.year, 2025); assert.strictEqual(p.gb7, 'GB10: GB10(DGX Spark, 3.9GHz, 20c)'); // 2026-11-06 に採用(追加時の 2026-11-03 は null)
  assert.strictEqual(p.addedIn, 'M5b'); assert.strictEqual(p.calib, false);
  assert.strictEqual(p.dies.length, 2);
  assert.deepStrictEqual([p.dies[0].mm2, p.dies[0].s, p.dies[0].nodeId], [207.9, 'meas', 'tsmc-n3e']);
  assert.deepStrictEqual([p.dies[1].mm2, p.dies[1].s], [173.6, 'meas']);
  assert.ok(p.dies[1].note.includes('推定'));
  assert.ok(Math.abs(12.91 * 16.10 - 207.9) < 0.05 && Math.abs(12.91 * 13.45 - 173.6) < 0.05);
  assert.deepStrictEqual(p.cfg.cores.map((g) => [g.type, g.uarch, g.count, g.maxGHz]), [['P', 'Cortex-X925', 10, 4.0], ['E', 'Cortex-A725', 10, 2.8]]);
  assert.strictEqual(p.cfg.l3MB, 24); assert.strictEqual(p.cfg.memory, 'LPDDR5X-8533, 256bit, 273GB/s');
  assert.strictEqual(p.power.base.w, 140); assert.strictEqual(p.power.base.s, 'pub'); assert.strictEqual(p.power.peak, null);
  // GB6 の個別 3 件は notes に参考として(判定には使わない)
  ['3123', '19708', '3237', '19794', '2983', '18183', '1 件'].forEach((s) => assert.ok(p.notes.includes(s), s));
  assert.ok(p.notes.includes('GB7 は 2026-11-06 にユーザー提供の検索結果') && p.notes.includes('GB7 未取得')); // 旧記録(2026-11-03 時点は未取得)も残す
});

test('GB10: ST/MT は計算できる(fallback ではない)。公開値は 2026-11-06 採用の 6 件の中央値 2624 / 20595 で、誤差は ST 約 -18.5%・MT 約 -13.1%(両方 ng・原因未特定。2026-11-07 に 9400 の P を公式 3.62 にして X925 の u が動き、旧 -18.73% / -13.28%)', () => {
  const r = E.evaluate(mk(), E.makeContext());
  assert.strictEqual(r.st.ok, true); assert.strictEqual(r.st.fallback, false); assert.strictEqual(r.st.published, 2624); assert.ok(Math.abs(r.st.errPct - -18.54) < 0.01);
  assert.strictEqual(r.mt.ok, true); assert.strictEqual(r.mt.fallback, false); assert.strictEqual(r.mt.published, 20595); assert.ok(Math.abs(r.mt.errPct - -13.13) < 0.01);
  const rows = require('../js/ui/reproduce.js').reproductionRows(r);
  assert.deepStrictEqual([rows[0].verdict, rows[1].verdict], ['ng', 'ng']); // 許容 ±10% を超える。n=6 でも gray にはならない(gray は「個別投稿」だけ)
  assert.strictEqual(r.st.corrSource, 'uarch'); // X925 は Dimensity 9400 の代表の u
  assert.deepStrictEqual(r.mt.corrSources, ['uarch', 'isa']); // A725 は専用の u がなく命令セット平均
  assert.strictEqual(r.mt.threads, 20);
});

test('GB10: S-die は arm-soc の photo(frame gb10)。ダイ面積・縦横比は写真のまま。G-die は別ダイで frame gb10-gpu(下のテスト)', () => {
  const d = mk(); const s = d.dies[0]; const g = d.dies[1];
  assert.strictEqual(d.dies.length, 2);
  assert.strictEqual(s.layout.template, 'arm-soc'); assert.strictEqual(s.layout.frame, 'gb10'); assert.strictEqual(s.layout.scaleBasis, 'photo');
  const n = s.layout.scaleNote; assert.ok(n.includes('目測') && n.includes('実チップのフロアプランではない') && n.includes('URL 候補') && n.includes('推定') && n.length <= 600);
  assert.ok(n.includes('G-die は別ダイ(frame gb10-gpu)'));
  assert.strictEqual(s.areaMm2, 207.9); assert.ok(Math.abs(s.widthMm * s.heightMm - 207.9) < 1e-6);
  // 写真の縦横比 1085/875 = 1.24 は Kurnal の寸法 16.10/12.91 = 1.247 と 1% 以内で一致
  assert.ok(Math.abs(FP.TILE_FRAMES.gb10.aspect / (16.10 / 12.91) - 1) < 0.01);
  assert.strictEqual(g.layout.frame, 'gb10-gpu'); assert.strictEqual(g.areaMm2, 173.6);
  assert.deepStrictEqual(design.validate(d), []);
});

test('GB10: コアは X925 ×10 / A725 ×10。L3 は 16MB と 8MB の 2 枠(重み 2:1)。コアは上下 2 クラスタに 5+5 ずつ', () => {
  const s = mk().dies[0]; const cs = cores(s);
  assert.strictEqual(cs.length, 20);
  assert.strictEqual(cs.filter((b) => b.coreType === 'P').length, 10); assert.strictEqual(cs.filter((b) => b.coreType === 'E').length, 10);
  const l3 = s.blocks.filter((b) => b.kind === 'l3'); assert.deepStrictEqual(l3.map((b) => b.label), ['L3 16MB', 'L3 8MB']);
  const k = 1085 / s.widthMm; const top = (b) => (b.y + b.h / 2) * k < 437; // 画像の高さ 875 の半分より上
  assert.strictEqual(cs.filter((b) => b.coreType === 'P' && top(b)).length, 5); assert.strictEqual(cs.filter((b) => b.coreType === 'P' && !top(b)).length, 5);
  // 上の X925 #1〜#5 は左上の 3 つ + 左の縦 2 つ(x ≤ 510)
  cs.filter((b) => b.coreType === 'P' && top(b)).forEach((b) => assert.ok(b.x * k < 400 || b.y * k < 160));
  // L3 16MB は上(コア #1〜#5 側)、8MB は下
  assert.ok(l3[0].y < l3[1].y);
  // コア以外はすべて飾りで、L3 は飾りでない
  s.blocks.filter((b) => b.kind !== 'core' && b.kind !== 'l3').forEach((b) => assert.strictEqual(b.decorative, true, b.label));
  assert.ok(s.blocks.some((b) => b.kind === 'npu') && s.blocks.some((b) => b.kind === 'uncore'));
  assert.strictEqual(s.blocks.filter((b) => /Memory Cache/.test(b.label)).length, 8); // 注釈の Memory Cache 2MiB ×8
  assert.strictEqual(s.blocks.filter((b) => /LPDDR5 メモリ PHY/.test(b.label)).length, 2); // #1〜#4 と #5〜#8 の 2 枠
});

test('GB10: ブロックはダイ内に収まり重ならない(枠の全ブロック)。L3 の重み付けは既存の等分枠(Zeppelin)を変えない', () => {
  const tf = FP.TILE_FRAMES.gb10; const die = { id: 'd', widthMm: 16.1, heightMm: 16.1 / tf.aspect };
  const bs = FP.layoutDie(die, p.cfg.cores, 24, { template: 'arm-soc', frame: 'gb10', scaleBasis: 'photo' });
  bs.forEach((b) => { assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= die.widthMm + 1e-9 && b.y + b.h <= die.heightMm + 1e-9 && b.w > 0 && b.h > 0, b.label); });
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i]; const c = bs[j];
    assert.ok(!(a.x < c.x + c.w - 1e-9 && c.x < a.x + a.w - 1e-9 && a.y < c.y + c.h - 1e-9 && c.y < a.y + a.h - 1e-9), a.label + ' と ' + c.label);
  }
  const z = D.presets.find((x) => x.id === 'amd-zen1-1800x'); const zd = design.fromPreset(z);
  const zl = zd.dies[0].blocks.filter((b) => b.kind === 'l3'); assert.strictEqual(zl.length, 2);
  assert.strictEqual(zl[0].label, zl[1].label);
});

test('GB10: 枠の tpl は arm-soc だけ。ほかのテンプレートでは使えない(否定側)。parse も拒否', () => {
  assert.deepStrictEqual(FP.TILE_FRAMES.gb10.tpl, ['arm-soc']);
  const ok = (t) => assert.strictEqual(FP.checkLayout({ template: t, frame: 'gb10' }), null, t);
  const ng = (t) => assert.ok(FP.checkLayout({ template: t, frame: 'gb10' }), t);
  ok('arm-soc'); ng('x86-tile'); ng('x86-mono'); ng('amd-apu'); ng('apple-soc'); ng('amd-chiplet');
  const a = JSON.parse(JSON.stringify(mk())); a.dies[0].layout.template = 'x86-tile';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const b = JSON.parse(JSON.stringify(mk())); assert.strictEqual(design.parse(JSON.stringify(b)).ok, true);
});

test('GB10: 評価結果は配置に依存しない(ブロックを全部取り除いても同じ)。コアを枠の数を超えて増やすと schematic に落ちる', () => {
  const ctx = E.makeContext();
  const a = mk(); const b = JSON.parse(JSON.stringify(a)); b.dies.forEach((x) => { x.blocks = []; });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(E.evaluate(a, ctx))), JSON.parse(JSON.stringify(E.evaluate(b, ctx))));
  const u = design.unlock(mk()); const r = design.setCoreCount(u, 'P', 11); assert.ok(r.ok);
  assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'schematic');
  const r2 = design.setCoreCount(design.unlock(mk()), 'P', 8); assert.strictEqual(r2.design.dies[0].layout.scaleBasis, 'photo');
  assert.deepStrictEqual(design.validate(r2.design), []);
});

test('GB10: L3 を変えても photo のまま(frame に l3 枠がある)。ラベルは重み 2:1 で更新、位置は同じ。0 にすると L3 ブロックが無くなるだけ', () => {
  const t0 = mk(); const r = design.setL3(design.unlock(t0), 12); assert.ok(r.ok);
  const d1 = r.design.dies[0]; assert.strictEqual(d1.layout.scaleBasis, 'photo');
  const l30 = t0.dies[0].blocks.filter((b) => b.kind === 'l3'); const l31 = d1.blocks.filter((b) => b.kind === 'l3');
  assert.deepStrictEqual(l31.map((b) => b.label), ['L3 8MB', 'L3 4MB']);
  assert.deepStrictEqual(l31.map((b) => [b.x, b.y, b.w, b.h]), l30.map((b) => [b.x, b.y, b.w, b.h]));
  assert.deepStrictEqual(design.validate(r.design), []);
  const r0 = design.setL3(design.unlock(t0), 0); assert.ok(r0.ok);
  assert.strictEqual(r0.design.dies[0].layout.scaleBasis, 'photo'); assert.strictEqual(r0.design.dies[0].blocks.filter((b) => b.kind === 'l3').length, 0);
});

// ---- G-die(2026-11-05。GB102in1.jpg の右半分。frame gb10-gpu。SOC_DIE / socLayout) ----
const H = require('../js/sim/heatmap.js');
const gdie = (d) => d.dies[1];
const rectsOverlap = (a, c) => a.x < c.x + c.w - 1e-9 && c.x < a.x + a.w - 1e-9 && a.y < c.y + c.h - 1e-9 && c.y < a.y + a.h - 1e-9;

test('GB10 G-die: layout は arm-soc の photo(frame gb10-gpu)。面積 173.6 は不変、縦横比は写真の目測 1.03。注記は 600 文字以内で、目測・N3E 推定・URL 要確認を書く', () => {
  const d = mk(); const g = gdie(d);
  assert.deepStrictEqual([g.layout.template, g.layout.frame, g.layout.scaleBasis], ['arm-soc', 'gb10-gpu', 'photo']);
  const n = g.layout.scaleNote; assert.ok(n.length <= 600);
  ['GB102in1.jpg', '目測', 'N3E は推定', 'ファイル名一致による対応づけ', '画像内に URL の記載なし', '実チップのフロアプランではない'].forEach((s) => assert.ok(n.includes(s), s));
  assert.strictEqual(g.areaMm2, 173.6); assert.ok(Math.abs(g.widthMm * g.heightMm - 173.6) < 1e-6);
  assert.ok(Math.abs(g.widthMm / g.heightMm - 1.03) < 0.005);
  assert.ok(Math.abs(FP.TILE_FRAMES['gb10-gpu'].aspect / (13.45 / 12.91) - 1) < 0.02); // Kurnal の寸法 1.042 と 2% 以内
  assert.strictEqual(g.layout.units, 1); assert.deepStrictEqual(FP.TILE_FRAMES['gb10-gpu'].tpl, ['arm-soc']);
  assert.deepStrictEqual(design.validate(d), []);
});

test('GB10 G-die: ブロックは GPC#1〜#4 の TPC 区画 12 個・Raster Engine ×4・GPU L2 ×2・NV-Link・Die to Die・NVDEC・未判別 1。コア・L3 なし。ダイ内に収まり重ならない', () => {
  const g = gdie(mk()); const bs = g.blocks;
  assert.strictEqual(bs.length, 22);
  assert.strictEqual(bs.filter((b) => /^GPC#[1-4] TPC/.test(b.label)).length, 12);
  [1, 2, 3, 4].forEach((n) => assert.strictEqual(bs.filter((b) => b.label.startsWith(`GPC#${n} `)).length, 3));
  assert.strictEqual(bs.filter((b) => b.label === 'Raster Engine/3D FF').length, 4);
  assert.strictEqual(bs.filter((b) => /^GPU L2 Cache/.test(b.label)).length, 2);
  ['NV-Link', 'Die to Die Channel', 'NVDEC・NVENC'].forEach((s) => assert.strictEqual(bs.filter((b) => b.label === s).length, 1, s));
  assert.strictEqual(bs.filter((b) => /^未判別/.test(b.label)).length, 1);
  assert.ok(!bs.some((b) => b.kind === 'core' || b.kind === 'l3' || b.kind === 'npu'));
  // TPC は 6 個ずつ(各 3 区画 × 2)で合計 24。GPC#1 は最上段、#4 は最下段
  const y = (n) => bs.find((b) => b.label.startsWith(`GPC#${n} `)).y; assert.ok(y(1) < y(2) && y(2) < y(3) && y(3) < y(4));
  bs.forEach((b) => assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= g.widthMm + 1e-9 && b.y + b.h <= g.heightMm + 1e-9 && b.w > 0 && b.h > 0, b.label));
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) assert.ok(!rectsOverlap(bs[i], bs[j]), bs[i].label + ' と ' + bs[j].label);
  assert.strictEqual(new Set(bs.map((b) => b.id)).size, bs.length);
});

test("GB10 G-die: GPU 演算(GPC・Raster・L2)と I/F は 'live'(飾りでない)、未判別だけ decorative。電力按分に参加する", () => {
  const d = mk(); const bs = gdie(d).blocks;
  bs.forEach((b) => { if (/^未判別/.test(b.label)) assert.strictEqual(b.decorative, true); else assert.strictEqual(b.decorative, undefined, b.label); });
  assert.ok(bs.filter((b) => b.kind === 'gpu').every((b) => /^(GPC|Raster|GPU L2)/.test(b.label)));
  const r = H.blockPowers(d, 140); assert.ok(r.ok);
  const sum = (die) => die.blocks.reduce((s, b) => s + (r.byBlock[b.id] || 0), 0);
  assert.ok(Math.abs(sum(d.dies[0]) + sum(d.dies[1]) - 140) < 1e-9);
  // 前後の記録(従来の「GPU」1 ブロック: S-die 92.80 W / G-die 47.20 W。今回: 92.20 / 47.80 W)
  assert.ok(Math.abs(sum(d.dies[0]) - 92.20) < 0.01 && Math.abs(sum(d.dies[1]) - 47.80) < 0.01);
  bs.filter((b) => /^未判別/.test(b.label)).forEach((b) => assert.strictEqual(r.byBlock[b.id], 0));
  bs.filter((b) => b.kind === 'gpu').forEach((b) => assert.ok(r.byBlock[b.id] > 0));
});

test('GB10 G-die: 評価は配置に依存しない。S-die のコア・L3 編集は G-die の layout・ブロックに効かない(G-die はコアを持たない)', () => {
  const ctx = E.makeContext(); const a = mk(); const b = JSON.parse(JSON.stringify(a)); b.dies[1].blocks = []; delete b.dies[1].layout;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(E.evaluate(a, ctx))), JSON.parse(JSON.stringify(E.evaluate(b, ctx))));
  const g0 = JSON.stringify(gdie(a));
  const r = design.setCoreCount(design.unlock(mk()), 'P', 11); assert.ok(r.ok);
  assert.strictEqual(r.design.dies[0].layout.scaleBasis, 'schematic'); assert.strictEqual(JSON.stringify(gdie(r.design)), g0);
  const r2 = design.setCoreCount(design.unlock(mk()), 'E', 4); assert.ok(r2.ok);
  assert.strictEqual(JSON.stringify(gdie(r2.design)), g0);
  const r3 = design.setL3(design.unlock(mk()), 0); assert.ok(r3.ok); assert.strictEqual(JSON.stringify(gdie(r3.design)), g0);
  const r4 = design.setL3(design.unlock(mk()), 48); assert.ok(r4.ok); assert.strictEqual(JSON.stringify(gdie(r4.design)), g0);
  assert.strictEqual(gdie(r4.design).layout.scaleBasis, 'photo');
});

test('GB10 G-die: 負テスト。G-die の frame は arm-soc 以外(amd-apu など)に付けられない。コア・L3 のあるダイにも付けられない。parse も拒否', () => {
  const ng = (t) => assert.ok(FP.checkLayout({ template: t, frame: 'gb10-gpu' }), t);
  assert.strictEqual(FP.checkLayout({ template: 'arm-soc', frame: 'gb10-gpu' }), null);
  ['amd-apu', 'x86-tile', 'x86-mono', 'apple-soc', 'amd-chiplet', 'intel-hybrid'].forEach(ng);
  // 逆: AMD の Strix Halo SoC の枠は arm-soc に付けられない。S-die の frame(gb10)も amd-apu に付けられない
  assert.ok(FP.checkLayout({ template: 'arm-soc', frame: 'strix-halo-soc' })); assert.ok(FP.checkLayout({ template: 'amd-apu', frame: 'gb10' }));
  const a = JSON.parse(JSON.stringify(mk())); a.dies[1].layout.template = 'amd-apu';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const b = JSON.parse(JSON.stringify(mk())); b.dies[0].layout.frame = 'gb10-gpu'; // S-die(コア・L3 あり)に G-die の枠
  assert.strictEqual(design.parse(JSON.stringify(b)).ok, false);
  const c = JSON.parse(JSON.stringify(mk())); assert.strictEqual(design.parse(JSON.stringify(c)).ok, true);
});

test('GB10 G-die: Strix Halo の SoC ダイは変わらない(amd-apu・strix-halo-soc・live)。ほかの arm-soc に socDie は付かない', () => {
  const s = D.presets.find((x) => x.id === 'amd-strixhalo-395'); const d = design.fromPreset(s);
  const soc = d.dies.find((x) => /SoC/i.test(x.name));
  assert.deepStrictEqual([soc.layout.template, soc.layout.frame, soc.layout.scaleBasis], ['amd-apu', 'strix-halo-soc', 'photo']);
  assert.strictEqual(FP.TILE_FRAMES['strix-halo-soc'].live, true);
  D.presets.filter((x) => x.isa === 'arm' && x.id !== 'nv-gb10').forEach((x) => { const c = FP.classify(x, () => 'compute'); if (c) assert.strictEqual(c.socDie, undefined, x.id); });
  assert.strictEqual(FP.classify(p, () => 'compute').socDie.frame, 'gb10-gpu'); assert.strictEqual(FP.classify(p, () => 'compute').socDie.dieIndex, 1);
});
