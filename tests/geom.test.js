'use strict';
const test = require('node:test');
const assert = require('node:assert');
const g = require('../js/render/geom.js');

const near = (a, b, e) => assert.ok(Math.abs(a - b) < (e || 1e-6), `${a} != ${b}`);
const die = (id, x, y, w, h, blocks) => ({ id, x, y, widthMm: w, heightMm: h, blocks: blocks || [] });
const blk = (id, x, y, w, h) => ({ id, x, y, w, h });

test('変換の往復一致', () => {
  const v = { x: 37, y: -12, zoom: 13.5 };
  const s = g.worldToScreen(v, 4.2, 7.7);
  const w = g.screenToWorld(v, s.x, s.y);
  near(w.x, 4.2); near(w.y, 7.7);
});

test('ズームでカーソル位置のワールド点が不動', () => {
  const v = { x: 10, y: 20, zoom: 8 };
  const before = g.screenToWorld(v, 300, 200);
  const v2 = g.zoomAt(v, 300, 200, 1.7);
  const after = g.screenToWorld(v2, 300, 200);
  near(after.x, before.x); near(after.y, before.y);
  near(v2.zoom, 8 * 1.7);
  assert.ok(g.zoomAt(v, 0, 0, 1e9).zoom <= g.MAX_ZOOM);
});

test('ヒットテスト: 重なりは最前面、ハンドル優先、ダイ', () => {
  const d = die('d', 0, 0, 20, 20, [blk('a', 2, 2, 8, 8), blk('b', 6, 6, 8, 8)]);
  const design = { dies: [d] };
  const v = { x: 0, y: 0, zoom: 10 };
  assert.deepStrictEqual(g.hitTest(design, v, 80, 80), { type: 'block', dieId: 'd', blockId: 'b' });
  assert.strictEqual(g.hitTest(design, v, 30, 30).blockId, 'a');
  assert.deepStrictEqual(g.hitTest(design, v, 190, 10), { type: 'die', dieId: 'd' });
  assert.strictEqual(g.hitTest(design, v, 400, 400), null);
  // a を選択: a の右下ハンドル(100,100)は b の内側だがハンドルが優先
  const h = g.hitTest(design, v, 100, 100, { selectedIds: ['a'] });
  assert.deepStrictEqual(h, { type: 'handle', dieId: 'd', blockId: 'a', handle: 'se' });
  // 選択していなければブロック
  assert.strictEqual(g.hitTest(design, v, 100, 100).type, 'block');
  // ハンドルは画面 px 一定: ズームを変えても 3px 以内で当たる
  const v2 = { x: 0, y: 0, zoom: 100 };
  assert.strictEqual(g.hitTest(design, v2, 1003, 600, { selectedIds: ['a'] }).handle, 'e');
});

test('ダイが複数: 後ろのダイが前面', () => {
  const design = { dies: [die('d0', 0, 0, 10, 10), die('d1', 5, 0, 10, 10)] };
  assert.strictEqual(g.hitTest(design, { x: 0, y: 0, zoom: 10 }, 70, 50).dieId, 'd1');
});

test('スナップ: 既定 0.1mm、Shift 相当で無効', () => {
  near(g.snap(1.234), 1.2);
  near(g.snap(1.26), 1.3);
  assert.strictEqual(g.snap(1.234, 0.1, true), 1.234);
  const d = die('d', 0, 0, 20, 20);
  const b = blk('a', 1, 1, 4, 4);
  const m = g.moveBlock(d, b, 0.234, 0.0);
  near(m.x, 1.2);
  const m2 = g.moveBlock(d, b, 0.234, 0, { noSnap: true });
  near(m2.x, 1.234);
});

test('移動はダイ外に出ない', () => {
  const d = die('d', 5, 5, 20, 10);
  const b = blk('a', 1, 1, 4, 4);
  const m = g.moveBlock(d, b, 100, 100);
  near(m.x, 16); near(m.y, 6);
  const m2 = g.moveBlock(d, b, -100, -100);
  near(m2.x, 0); near(m2.y, 0);
  near(m.w, 4);
});

test('リサイズ: 最小サイズ・ダイ内', () => {
  const d = die('d', 0, 0, 20, 10);
  const b = blk('a', 5, 2, 4, 4);
  let r = g.resizeBlock(d, b, 'e', -100, 0);
  near(r.w, g.MIN_SIZE_MM); near(r.x, 5);
  r = g.resizeBlock(d, b, 'w', 100, 0);
  near(r.w, g.MIN_SIZE_MM); near(r.x + r.w, 9);
  r = g.resizeBlock(d, b, 'se', 100, 100);
  near(r.x + r.w, 20); near(r.y + r.h, 10);
  r = g.resizeBlock(d, b, 'nw', -100, -100);
  near(r.x, 0); near(r.y, 0); near(r.x + r.w, 9); near(r.y + r.h, 6);
  r = g.resizeBlock(d, b, 's', 0, 1.234, { noSnap: true });
  near(r.h, 5.234); near(r.w, 4);
  r = g.resizeBlock(d, b, 'n', 0, 0.55);
  near(r.y, 2.5);
});

test('fit: 全ダイが画面に収まる', () => {
  const dies = [die('a', 0, 0, 10, 14), die('b', 12, 3, 30, 8)];
  const W = 800; const H = 500;
  const v = g.fit(dies, W, H, 40);
  dies.forEach((d) => {
    const p0 = g.worldToScreen(v, d.x, d.y);
    const p1 = g.worldToScreen(v, d.x + d.widthMm, d.y + d.heightMm);
    assert.ok(p0.x >= 40 - 1e-6 && p0.y >= 40 - 1e-6 && p1.x <= W - 40 + 1e-6 && p1.y <= H - 40 + 1e-6);
  });
  assert.ok(g.fit([], W, H).zoom > 0);
});

test('niceLength: 1,2,5 系列', () => {
  assert.strictEqual(g.niceLength(10, 100), 10);
  assert.strictEqual(g.niceLength(10, 30), 2);
  assert.strictEqual(g.niceLength(10, 60), 5);
});

test('dieview: WebGL 不可でも例外を投げず、空の API を返し日本語エラーを出す', () => {
  const mk = () => {
    const kids = [];
    const el = { style: {}, children: kids, setAttribute() {}, appendChild(c) { kids.push(c); }, getContext() { return null; } };
    return el;
  };
  const doc = { createElement: () => mk() };
  const container = {
    ownerDocument: doc, style: {}, textContent: '', children: [],
    appendChild(c) { this.children.push(c); },
  };
  container.ownerDocument.defaultView = { getComputedStyle: () => ({ position: 'relative' }) };
  const { createDieView } = require('../js/render/dieview.js');
  const api = createDieView(container, {});
  ['setDesign', 'setSelection', 'setViewMode', 'fit', 'destroy'].forEach((k) => assert.strictEqual(typeof api[k], 'function'));
  assert.strictEqual(api.available, false);
  api.setDesign({ dies: [] }); api.destroy();
  assert.ok(container.children.some((c) => /WebGL が使えません/.test(c.textContent)));
});
