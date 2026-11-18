'use strict';
// 古い Intel Core i(2026-11-17 追加の 19 プリセット)のダイ写真の枠。docs/research/old-intel-dieshots-2026-11-17.md
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers.js');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const olds = D.presets.filter((p) => p.addedIn === 'old-intel');
const FRAMES = ['snb-4c', 'hsw-4c', 'skl-4c', 'kbl-4c', 'cfl-6c', 'cfl-8c', 'cml-10c', 'nhm-lyn-4c', 'wsm-6c', 'ivb-4c', 'bdw-4c', 'wlf-2c', 'yfd-4c'];
const mk = (p) => design.fromPreset(p, { mode: 'reproduce' });

test('古い Intel の枠: 13 枠で、コア枠の数・縦横比・テンプレートが決めたとおり', () => {
  const want = { 'snb-4c': [4, 4465 / 2160], 'hsw-4c': [4, 5863 / 2160], 'skl-4c': [4, 3158 / 2160], 'kbl-4c': [4, 3254 / 2160], 'cfl-6c': [6, 3213 / 1758], 'cfl-8c': [8, 1935 / 906], 'cml-10c': [10, 4880 / 2040], 'nhm-lyn-4c': [4, 2196 / 1351], 'wsm-6c': [6, 3226 / 1724], 'ivb-4c': [4, 800 / 336], 'bdw-4c': [4, 1097 / 976], 'wlf-2c': [2, 570 / 812], 'yfd-4c': [4, 4322 / 3083] };
  FRAMES.forEach((k) => {
    const t = FP.TILE_FRAMES[k];
    assert.ok(t, k);
    assert.strictEqual(t.big.length, want[k][0], `${k}: コア枠の数`);
    assert.deepStrictEqual(t.tpl, ['x86-mono'], `${k}: テンプレート`);
    assert.ok(Math.abs(t.aspect / want[k][1] - 1) < 0.01, `${k}: 縦横比は写真の自然な縦横比(誤差 1% 以内) ${t.aspect.toFixed(3)} / ${want[k][1].toFixed(3)}`);
    if (k === 'wlf-2c' || k === 'yfd-4c') assert.strictEqual(t.l3, null, `${k}: Core 2 は L3 なし(共有 L2 は飾り)`); else assert.ok(Array.isArray(t.l3[0]) && t.l3.length >= 2, `${k}: L3 は帯ごとの枠`);
  });
});

test('古い Intel の 26 プリセット: 全部が photo の枠を持ち、コア数・L3 の合計が元のまま、ブロックはダイの内側で重ならない', () => {
  assert.strictEqual(olds.length, 26); // 8400 を外した(2026-11-17)。第1・3・5世代 5 件を追加、Core 2 世代 3 件を追加(2026-11-18)
  olds.forEach((p) => {
    const d = mk(p); const die = d.dies[0]; const l = die.layout;
    assert.ok(l && FRAMES.includes(l.frame), `${p.id}: frame`);
    assert.strictEqual(l.template, 'x86-mono');
    assert.strictEqual(l.scaleBasis, 'photo');
    assert.ok(l.scaleNote.length <= 600 && /happytrees\.org/.test(l.scaleNote), `${p.id}: scaleNote(600 文字以内・出典あり) ${l.scaleNote.length}`);
    assert.strictEqual(FP.checkLayout(l), null, `${p.id}: checkLayout`);
    const bl = die.blocks;
    assert.strictEqual(bl.filter((b) => b.kind === 'core').length, p.cfg.cores.reduce((t, c) => t + c.count, 0), `${p.id}: コア数`);
    const l3 = bl.filter((b) => b.kind === 'l3');
    assert.ok(Math.abs(l3.reduce((t, b) => t + parseFloat(/L3 ([\d.]+)MB/.exec(b.label)[1]), 0) - p.cfg.l3MB) < 0.05, `${p.id}: L3 の合計`);
    assert.ok(Math.abs(die.widthMm * die.heightMm - die.areaMm2) < 1e-6, `${p.id}: 面積はそのまま`);
    bl.forEach((b) => assert.ok(b.x >= -1e-6 && b.y >= -1e-6 && b.x + b.w <= die.widthMm + 1e-6 && b.y + b.h <= die.heightMm + 1e-6, `${p.id}: ${b.id} がダイの外`));
    for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) {
      const a = bl[i]; const b = bl[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(!(ox > 0.02 && oy > 0.02), `${p.id}: ${a.id} と ${b.id} が重なる`);
    }
  });
});

test('古い Intel の枠: コアを 1 つ増やす編集で枠を超えると schematic に落ちる(10700K は 8 → 10 まで photo のまま)', () => {
  const p = olds.find((x) => x.id === 'intel-cml-10700k');
  const lay = mk(p).dies[0].layout;
  const c10 = [{ type: 'P', uarch: 'Comet Lake', count: 10 }]; const c11 = [{ type: 'P', uarch: 'Comet Lake', count: 11 }];
  assert.strictEqual(FP.afterEdit(lay, c10, 20, 16).scaleBasis, 'photo');
  assert.strictEqual(FP.afterEdit(lay, c11, 20, 16).scaleBasis, 'schematic');
});
