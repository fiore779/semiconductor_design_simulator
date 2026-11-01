'use strict';
// dieview.captureCanvas(PNG 書き出し用)のテスト。WebGL / 2D は呼び出しを記録するスタブ(Node のみ)。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const dieview = require('../js/render/dieview.js');
const { createDieView } = dieview;

function setup(opt) {
  const o = opt || {};
  const st = { texts: [], lens: [], raf: [], handlers: {}, lost: false, outs: [], throwDraw: false };
  const gl = new Proxy({}, { get(t, k) {
    if (k === 'isContextLost') return () => st.lost;
    if (k === 'getExtension') return () => null;
    if (k === 'bufferData') return (a, data) => { if (data && data.length) st.lens.push(data.length); };
    if (k === 'getParameter') return () => 4096;
    if (/^[A-Z_0-9]+$/.test(String(k))) return 1;
    return () => 1;
  } });
  const ctx2d = new Proxy({}, { get(t, k) {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'fillText') return (s) => { st.texts.push(String(s)); };
    if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set() { return true; } });
  const mkCanvas = () => {
    const c = { width: 0, height: 0, style: {}, attrs: {}, listeners: {}, parentNode: null };
    c.getContext = (t) => {
      if (t === '2d') { if (c.isOut && st.throwDraw) return new Proxy({}, { get: (x, k) => (k === 'drawImage' ? () => { throw new Error('boom'); } : () => {}) }); return ctx2d; }
      return gl;
    };
    c.addEventListener = (n, f) => { c.listeners[n] = f; if (n.startsWith('webgl')) st.handlers[n] = f; };
    c.removeEventListener = () => {};
    c.setAttribute = (k, v) => { c.attrs[k] = v; };
    c.focus = () => {};
    return c;
  };
  const doc = { createElement: () => { const c = mkCanvas(); if (st.capturing) { c.isOut = true; st.outs.push(c); } return c; } };
  const win = { devicePixelRatio: o.dpr || 1, getComputedStyle: () => ({ position: 'relative' }), requestAnimationFrame: (f) => { st.raf.push(f); return st.raf.length; }, cancelAnimationFrame() {}, addEventListener() {} };
  doc.defaultView = win;
  const container = { ownerDocument: doc, style: {}, children: [], getBoundingClientRect: () => ({ width: o.w || 800, height: o.h || 600 }), appendChild(c) { this.children.push(c); c.parentNode = this; }, removeChild() {}, set textContent(v) { this.children = []; }, get textContent() { return ''; } };
  const view = createDieView(container, {});
  const runRaf = () => { const q = st.raf.splice(0); st.lens = []; q.forEach((f) => f()); return st.lens.reduce((a, b) => a + b, 0); };
  return { st, view, runRaf, doc };
}
const preset = () => design.fromPreset(D.presets[0], { mode: 'reproduce' });

test('captureCanvas: 選択枠を外して描き、戻すと選択が復元される。縮小サイズのオフスクリーンを返し凡例を含む', () => {
  const { st, view, runRaf } = setup({ w: 1000, h: 500, dpr: 4 }); // 元は 4000x2000
  assert.ok(view.available);
  const d = preset(); view.setDesign(d);
  runRaf();
  const bid = d.dies[0].blocks[0].id;
  view.setSelection([bid]);
  const withSel = runRaf();
  st.capturing = true;
  const cap = view.captureCanvas(2400);
  st.capturing = false;
  assert.ok(cap && cap.canvas);
  assert.strictEqual(cap.canvas.width, 2400); assert.strictEqual(cap.canvas.height, 1200); // 縮小済み(巨大 canvas を作らない)
  assert.ok(st.outs.every((c) => c.width <= 2400));
  assert.strictEqual(cap.mode, 'place'); assert.ok(!cap.noData);
  assert.ok(cap.legend.length > 0 && cap.legend.every((l) => l.text && /^#/.test(l.color)));
  const after = runRaf();
  assert.strictEqual(after, withSel, '選択が復元され、次の描画で選択枠が戻る');
  assert.ok(withSel > 0);
});

test('captureCanvas: 合成中の例外では null を返し、選択を復元する', () => {
  const { st, view, runRaf } = setup();
  const d = preset(); view.setDesign(d); runRaf();
  view.setSelection([d.dies[0].blocks[0].id]);
  const withSel = runRaf();
  st.capturing = true; st.throwDraw = true;
  assert.strictEqual(view.captureCanvas(), null);
  st.capturing = false; st.throwDraw = false;
  assert.strictEqual(runRaf(), withSel);
});

test('captureCanvas: コンテキスト喪失・ダイ 0 個では null。データ無しのヒートマップは noData で凡例なし。emptyApi は null', () => {
  const a = setup();
  assert.strictEqual(a.view.captureCanvas(), null, 'ダイ 0 個');
  a.view.setDesign(preset()); a.runRaf();
  a.view.setViewMode('power');
  const c = a.view.captureCanvas();
  assert.ok(c && c.mode === 'power' && c.noData === true && c.legend.length === 0);
  a.view.setViewMode('place');
  assert.ok(a.view.captureCanvas());
  a.st.lost = true;
  assert.strictEqual(a.view.captureCanvas(), null, 'gl.isContextLost()');
  a.st.lost = false;
  a.st.handlers.webglcontextlost({ preventDefault() {} });
  assert.strictEqual(a.view.captureCanvas(), null, 'webglcontextlost 後');
  // WebGL が作れない → emptyApi
  const doc = { createElement: () => ({ style: {}, setAttribute() {}, getContext: () => null }) };
  doc.defaultView = {};
  const box = { ownerDocument: doc, appendChild() {}, set textContent(v) {} };
  const e = createDieView(box, {});
  assert.strictEqual(e.available, false);
  assert.strictEqual(e.captureCanvas(), null);
});

test('2D: 注記は getNotes で返して canvas には描かない。PNG(captureCanvas)のときだけ画像に描く。ヒートマップ中はヒートマップの注意と飾りの IOD の注記も出る', () => {
  const { st, view, runRaf } = setup();
  const d12 = design.fromPreset(D.presets.find((p) => p.id === 'intel-adl-12900k'));
  view.setDesign(d12); runRaf();
  assert.ok(view.getNotes().some((t) => t.includes('目測')), '縮尺の根拠');
  assert.ok(!st.texts.some((t) => t.includes('目測')), '画面の canvas には描かない');
  st.texts = []; st.capturing = true;
  assert.ok(view.captureCanvas(800)); st.capturing = false;
  assert.ok(st.texts.some((t) => t.includes('目測')), 'PNG には描く');
  // 飾りの IOD のある設計 + ヒートマップ
  const d = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen3-5950x'));
  view.setDesign(d); view.setViewMode('power');
  view.setHeatmap({ kind: 'power', dies: d.dies.map((x) => ({ dieId: x.id, nx: 2, ny: 2, values: [1, 2, 3, 4], cellMm: 1 })), legend: { min: 0, max: 1, unit: 'W/mm²', uniform: false, label: '' }, note: 'ヒートマップの注意X' });
  runRaf();
  const n = view.getNotes();
  assert.ok(n.includes('ヒートマップの注意X')); assert.ok(n.some((t) => t.includes('飾りの IOD') && t.includes('125mm²')));
  assert.ok(!st.texts.some((t) => t.includes('ヒートマップの注意X')), '画面には描かない');
  st.texts = []; st.capturing = true;
  assert.ok(view.captureCanvas(800)); st.capturing = false;
  assert.ok(st.texts.some((t) => t.includes('ヒートマップの注意X')) && st.texts.some((t) => t.includes('飾りの IOD')), 'PNG には両方描く');
  // ダイ無しは注記なし
  view.setDesign({ dies: [] }); assert.deepStrictEqual(view.getNotes(), []);
});
