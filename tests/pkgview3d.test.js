'use strict';
// 3D パッケージビュー(js/render/pkgview3d.js)のテスト。WebGL / 2D は呼び出しを記録するスタブ(Node のみ)。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const { createPackageView3D } = require('../js/render/pkgview3d.js');

function setup(opt) {
  const o = opt || {};
  const st = { raf: [], draws: [], uploads: [], lost: false, outs: [], capturing: false, selected: [], changed: 0, texts: [], lose: 0, deletedProg: 0 };
  const gl = new Proxy({}, { get(t, k) {
    if (k === 'isContextLost') return () => st.lost;
    if (k === 'getExtension') return () => (o.failLink ? { loseContext() { st.lose++; } } : null);
    if (k === 'getProgramParameter' && o.failLink) return () => 0;
    if (k === 'deleteProgram') return () => { st.deletedProg++; };
    if (k === 'bufferData') return (a, data) => { if (data && data.length) st.uploads.push(data.length); };
    if (k === 'drawArrays') return (m, f, n) => { st.draws.push(n); };
    if (k === 'getParameter') return () => 4096;
    if (/^[A-Z_0-9]+$/.test(String(k))) return 1;
    return () => 1;
  } });
  const ctx2d = new Proxy({}, { get(t, k) {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'fillText' || k === 'strokeText') return (s) => { st.texts.push(String(s)); };
    return () => {};
  }, set() { return true; } });
  const mkCanvas = () => {
    const c = { width: 0, height: 0, style: {}, attrs: {}, listeners: {}, parentNode: null };
    c.getContext = (t) => (t === '2d' ? ctx2d : (o.noGL ? null : gl));
    c.addEventListener = (n, f) => { c.listeners[n] = f; };
    c.removeEventListener = (n) => { delete c.listeners[n]; };
    c.setAttribute = (k, v) => { c.attrs[k] = v; };
    c.focus = () => {}; c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
    c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
    return c;
  };
  const doc = { createElement: () => { const c = mkCanvas(); if (st.capturing) st.outs.push(c); return c; } };
  const win = { devicePixelRatio: o.dpr || 1, getComputedStyle: () => ({ position: 'relative' }), requestAnimationFrame: (f) => { st.raf.push(f); return st.raf.length; }, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {} };
  doc.defaultView = win;
  const container = { ownerDocument: doc, style: {}, children: [], getBoundingClientRect: () => ({ width: 800, height: 600 }), appendChild(c) { this.children.push(c); c.parentNode = this; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; }, set textContent(v) { this.children = []; this._t = v; }, get textContent() { return this._t || ''; } };
  const view = createPackageView3D(container, { onSelect: (ids) => st.selected.push(ids), onChange: () => { st.changed++; } });
  const runRaf = () => { const q = st.raf.splice(0); st.draws = []; q.forEach((f) => f()); return st.draws.reduce((a, b) => a + b, 0); };
  const canvas = () => container.children[0];
  const ev = (x, y, extra) => Object.assign({ button: 0, clientX: x, clientY: y, pointerId: 1, shiftKey: false, preventDefault() {} }, extra || {});
  return { st, view, runRaf, container, canvas, ev, doc };
}
const preset = () => design.fromPreset(D.presets[0], { mode: 'reproduce' });
const full = { dies: [{ id: 'd', name: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 0, y: 0, w: 10, h: 10, kind: 'core', coreType: 'P', label: 'コア' }] }] };

test('3D ビュー: 作成すると role=img と aria-label が付き、設計を渡すと描画される。ダイ無しは何も描かない', () => {
  const { view, runRaf, canvas, st } = setup();
  assert.ok(view.available);
  assert.strictEqual(canvas().attrs.role, 'img'); assert.ok(canvas().attrs['aria-label'].includes('3D 表示(模式図)'));
  assert.strictEqual(runRaf(), 0, 'ダイ無し');
  view.setDesign(preset());
  assert.ok(runRaf() > 0);
  assert.ok(canvas().attrs['aria-label'].includes('編集は 2D 表示で'));
  assert.ok(st.texts.some((t) => t.includes('3D は模式図。形状・厚みは実物と異なります')), '模式図の注記');
  assert.ok(st.texts.some((t) => t.includes('編集は 2D 表示で')), '編集案内');
});

test('3D ビュー: 蓋の表示モードで描くものが変わる(非表示 < 半透明)。setViewMode / setColorMode / setHeatmap は例外にならない', () => {
  const { view, runRaf } = setup();
  view.setDesign(preset()); runRaf();
  assert.strictEqual(view.getIhsMode(), 'glass');
  const glass = runRaf.call(null) || 0; // 変化なし(次の描画は要求されない)
  view.setIhsMode('glass'); const g = runRaf();
  view.setIhsMode('off'); const off = runRaf();
  assert.ok(g > off, `半透明 ${g} > 非表示 ${off}`);
  view.setIhsMode('bogus'); assert.strictEqual(view.getIhsMode(), 'glass');
  view.setColorMode('origin'); runRaf(); view.setColorMode('kind'); runRaf();
  view.setViewMode('power'); assert.ok(runRaf() > 0); // データ無しのヒートマップ(グレーアウト)
  const d = preset().dies[0];
  view.setHeatmap({ kind: 'power', dies: [{ dieId: d.id, nx: 2, ny: 2, values: [0, 0.3, 0.6, 1], cellMm: 1 }], legend: { min: 0, max: 1, unit: 'W/mm²', label: 'x' }, note: '注' });
  assert.ok(runRaf() > 0);
  view.setHeatmap(null); view.setViewMode('place'); runRaf();
  void glass;
});

test('3D ビュー: クリックでブロックを選択(onSelect)、空クリックで解除、ドラッグ(回転)では選択せず、onChange は呼ばれない', () => {
  const { view, runRaf, canvas, st, ev } = setup();
  view.setDesign(full); runRaf();
  const L = canvas().listeners;
  L.pointerdown(ev(400, 300)); L.pointerup(ev(400, 300));
  assert.deepStrictEqual(st.selected, [['b1']]);
  L.pointerdown(ev(400, 300)); L.pointermove(ev(460, 340)); L.pointerup(ev(460, 340));
  assert.deepStrictEqual(st.selected, [['b1']], '回転ドラッグは選択を変えない');
  L.pointerdown(ev(2, 2)); L.pointerup(ev(2, 2));
  assert.deepStrictEqual(st.selected, [['b1'], []], '空クリックで解除');
  L.pointerdown(ev(400, 300, { shiftKey: true })); L.pointerup(ev(400, 300, { shiftKey: true }));
  assert.deepStrictEqual(st.selected[2], ['b1']);
  L.keydown({ key: 'Escape', preventDefault() {} });
  assert.deepStrictEqual(st.selected[3], []);
  assert.strictEqual(st.changed, 0, '3D では編集しない');
  // 不透明の蓋の下は選べない
  view.setIhsMode('solid');
  L.pointerdown(ev(400, 300)); L.pointerup(ev(400, 300));
  assert.strictEqual(st.selected.length, 4);
});

test('3D ビュー: 外部からの選択・消えたブロックの選択除去、キーボード・ホイール・右ドラッグで再描画を要求する', () => {
  const { view, runRaf, canvas, st, ev } = setup();
  view.setDesign(full); view.setSelection(['b1']); runRaf();
  const L = canvas().listeners; const n0 = st.selected.length;
  ['ArrowLeft', 'ArrowUp', '+', '-', '0'].forEach((key) => { L.keydown({ key, preventDefault() {} }); assert.ok(runRaf() > 0, key); });
  L.wheel({ deltaY: 100, deltaMode: 0, preventDefault() {} }); assert.ok(runRaf() > 0);
  L.pointerdown(ev(300, 300, { button: 2 })); L.pointermove(ev(340, 330, { button: 2 })); L.pointerup(ev(340, 330, { button: 2 }));
  assert.ok(runRaf() > 0);
  view.setDesign({ dies: [{ id: 'd', name: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [] }] });
  assert.ok(canvas().attrs['aria-label'].includes('選択中のブロックはありません'));
  assert.strictEqual(st.selected.length, n0, 'setSelection / setDesign では onSelect を呼ばない');
  ['top', 'oblique', 'side', 'reset'].forEach((p) => { view.setCameraPreset(p); assert.ok(runRaf() > 0, p); });
  view.fit(); assert.ok(runRaf() > 0);
});

test('3D captureCanvas: 縮小サイズのオフスクリーン・選択と編集案内を外して描き、戻すと復元。凡例を含む', () => {
  const { st, view, runRaf } = setup({ dpr: 4 }); // 3200x2400
  view.setDesign(preset()); runRaf();
  const bid = preset().dies[0].blocks[0].id; view.setSelection([bid]); const withSel = runRaf();
  st.capturing = true; st.texts = [];
  const cap = view.captureCanvas(2400);
  st.capturing = false;
  assert.ok(cap && cap.canvas);
  assert.strictEqual(cap.canvas.width, 2400); assert.strictEqual(cap.canvas.height, 1800);
  assert.ok(st.outs.every((c) => c.width <= 2400));
  assert.strictEqual(cap.mode, 'place'); assert.ok(!cap.noData);
  assert.ok(cap.legend.length > 0 && cap.legend.every((l) => l.text && /^#/.test(l.color)));
  assert.ok(st.texts.some((t) => t.includes('3D は模式図')), '注記は画像に入る');
  assert.ok(!st.texts.some((t) => t.includes('編集は 2D 表示で行います')), '編集案内は画像に入れない');
  assert.strictEqual(runRaf(), withSel, '選択が復元される');
  view.setViewMode('temp');
  const nd = view.captureCanvas();
  assert.ok(nd && nd.mode === 'temp' && nd.noData === true && nd.legend.length === 0);
});

test('3D captureCanvas: コンテキスト喪失・ダイ 0 個・合成中の例外は null。復元後は再び使える', () => {
  const a = setup();
  assert.strictEqual(a.view.captureCanvas(), null, 'ダイ 0 個');
  a.view.setDesign(preset()); a.runRaf();
  assert.ok(a.view.captureCanvas());
  a.st.lost = true; assert.strictEqual(a.view.captureCanvas(), null); a.st.lost = false;
  a.canvas().listeners.webglcontextlost({ preventDefault() {} });
  assert.strictEqual(a.view.captureCanvas(), null, 'webglcontextlost 後');
  assert.strictEqual(a.runRaf(), 0, '喪失中は描かない');
  a.canvas().listeners.webglcontextrestored();
  assert.ok(a.runRaf() > 0 && a.view.captureCanvas());
  const b = setup();
  b.view.setDesign(preset()); b.runRaf();
  b.doc.createElement = () => ({ width: 0, height: 0, getContext: () => ({ drawImage() { throw new Error('boom'); } }) });
  assert.strictEqual(b.view.captureCanvas(), null);
});

test('3D ビュー: WebGL が作れないと available:false で現行と同じ文言。destroy でリスナーと canvas を片付ける', () => {
  const e = setup({ noGL: true });
  assert.strictEqual(e.view.available, false); assert.strictEqual(e.view.captureCanvas(), null);
  assert.ok(e.container.children[0].textContent.includes('WebGL が使えません。ブラウザの設定(ハードウェアアクセラレーション)を確認するか、別のブラウザでお試しください。ダイビューは表示できません。'));
  e.view.setDesign(preset()); e.view.setIhsMode('off'); assert.strictEqual(e.view.getIhsMode(), 'glass'); e.view.destroy();
  const a = setup();
  const cv = a.canvas(); a.view.setDesign(preset()); a.runRaf();
  a.view.destroy(); a.view.destroy();
  assert.strictEqual(a.container.children.length, 0); assert.strictEqual(Object.keys(cv.listeners).length, 0);
  assert.strictEqual(a.view.captureCanvas(), null);
  a.view.setDesign(preset()); assert.strictEqual(a.runRaf(), 0, '破棄後は描かない');
});

test('3D ビュー: シェーダのリンクに失敗したら、プログラムを消して loseContext してからエラーを出し、available:false', () => {
  const e = setup({ failLink: true });
  assert.strictEqual(e.view.available, false);
  assert.ok(e.st.lose >= 1, 'WEBGL_lose_context');
  assert.ok(e.st.deletedProg >= 1, 'prog を削除');
  assert.ok(e.container.children[0].textContent.includes('WebGL が使えません'));
  assert.strictEqual(e.container.children.length, 1, 'canvas は外れている');
});

test('3D ビュー: Shift+クリックで追加/解除、Shift+ドラッグ(パン)では選択が変わらない、蓋「表示」では選べない。ヒートマップ中は蓋「表示」でも選べる', () => {
  const { view, runRaf, canvas, st, ev } = setup();
  const two = { dies: [{ id: 'd', name: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 0, y: 0, w: 10, h: 10, kind: 'core', label: 'a' }] }] };
  view.setDesign(two); runRaf();
  const L = canvas().listeners; const sh = { shiftKey: true };
  L.pointerdown(ev(400, 300, sh)); L.pointerup(ev(400, 300, sh));
  assert.deepStrictEqual(st.selected, [['b1']]);
  L.pointerdown(ev(400, 300, sh)); L.pointerup(ev(400, 300, sh));
  assert.deepStrictEqual(st.selected, [['b1'], []], 'Shift+クリックで解除');
  view.setSelection(['b1']); const n = st.selected.length; const c0 = view.getCamera();
  L.pointerdown(ev(400, 300, sh)); L.pointermove(ev(450, 340, sh)); L.pointerup(ev(450, 340, sh));
  assert.strictEqual(st.selected.length, n, 'Shift+ドラッグは選択を変えない');
  const c1 = view.getCamera();
  assert.ok(c1.yaw === c0.yaw && c1.pitch === c0.pitch && c1.target.some((v, i) => v !== c0.target[i]), 'パン(向きは同じ・注視点が動く)');
  view.setSelection([]); view.setIhsMode('solid');
  L.pointerdown(ev(400, 300)); L.pointerup(ev(400, 300));
  assert.strictEqual(st.selected.length, n, '蓋「表示」では選べない');
  view.setViewMode('power');
  view.setHeatmap({ kind: 'power', dies: [{ dieId: 'd', nx: 2, ny: 2, values: [0, 0.3, 0.6, 1], cellMm: 1 }], legend: { min: 0, max: 1, unit: 'W', label: 'x' } });
  runRaf();
  L.pointerdown(ev(400, 300)); L.pointerup(ev(400, 300));
  assert.strictEqual(st.selected.length, n + 1, 'ヒートマップ中は半透明扱いで選べる');
  assert.strictEqual(view.getIhsMode(), 'solid', '利用者の設定は変えない');
});

test('3D ビュー: 蓋「表示」ではブロック名を描かない(半透明では描く)', () => {
  const { view, runRaf, st } = setup();
  const d = { dies: [{ id: 'd', name: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 0, y: 0, w: 10, h: 10, kind: 'core', label: 'ブロック名X' }] }] };
  view.setDesign(d); runRaf();
  assert.ok(st.texts.includes('ブロック名X'));
  st.texts = []; view.setIhsMode('solid'); runRaf();
  assert.ok(!st.texts.includes('ブロック名X'));
});

test('3D ビュー: 基板種別やダイ寸法が変わっても向きは保ち、距離と注視点だけ合わせ直す', () => {
  const { view, runRaf, canvas } = setup();
  const mk = (w, sub) => ({ package: { substrateId: sub }, dies: [{ id: 'd', name: 'd', x: 0, y: 0, widthMm: w, heightMm: w, blocks: [] }] });
  view.setDesign(mk(10, 'organic')); runRaf();
  canvas().listeners.keydown({ key: 'ArrowLeft', preventDefault() {} }); canvas().listeners.keydown({ key: 'ArrowUp', preventDefault() {} });
  const a = view.getCamera();
  view.setDesign(mk(30, 'si-interposer'));
  const b = view.getCamera();
  assert.ok(b.yaw === a.yaw && b.pitch === a.pitch);
  assert.ok(b.dist > a.dist && b.target[0] > a.target[0]);
});

test('3D ビュー: setLabels(false) でブロック名・ダイ名・寸法を描かず、true に戻すと描く。注記は残る', () => {
  const { view, runRaf, st } = setup();
  const d = { dies: [{ id: 'd', name: 'ダイ名Y', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 0, y: 0, w: 10, h: 10, kind: 'core', label: 'ブロック名X' }] }] };
  view.setDesign(d); runRaf();
  assert.strictEqual(view.getLabels(), true);
  assert.ok(st.texts.includes('ブロック名X')); assert.ok(st.texts.includes('ダイ名Y')); assert.ok(st.texts.some((t) => t.includes('10.00 × 10.00 mm')));
  st.texts = []; view.setLabels(false); runRaf();
  assert.strictEqual(view.getLabels(), false);
  assert.ok(!st.texts.includes('ブロック名X')); assert.ok(!st.texts.includes('ダイ名Y')); assert.ok(!st.texts.some((t) => t.includes('mm')));
  assert.ok(st.texts.some((t) => t.includes('3D は模式図')), '注記は残る');
  st.texts = []; view.setLabels(true); runRaf();
  assert.ok(st.texts.includes('ブロック名X') && st.texts.includes('ダイ名Y'));
});

test('3D ビュー: 実物風フロアプランのダイがあれば、縮尺の根拠の注記を出す(流用は「写真・測定なし」)。無ければ出さない', () => {
  const a = setup();
  a.view.setDesign(design.fromPreset(D.presets.find((p) => p.id === 'intel-adl-12900k'))); a.runRaf();
  assert.ok(a.st.texts.some((t) => t.includes('ダイ写真の目測')));
  const b = setup();
  b.view.setDesign(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen4-7950x'))); b.runRaf();
  assert.ok(b.st.texts.some((t) => t.includes('写真・測定なし')));
  const c = setup();
  c.view.setDesign(full); c.runRaf();
  assert.ok(!c.st.texts.some((t) => t.includes('目測') || t.includes('写真・測定なし')));
});

test('3D ビュー: 縮尺の注記は幅が狭いと折り返され、行ごとに描かれる', () => {
  const a = setup();
  a.view.setDesign(design.fromPreset(D.presets.find((p) => p.id === 'amd-zen4-7950x'))); a.runRaf();
  const wide = a.st.texts.filter((t) => t.includes('写真・測定なし') || t.includes('流用')).length;
  assert.ok(wide >= 1);
  // measureText を幅 10px/字とするスタブなので、800px の画面では 1 行 56 字程度で折り返される。結合すると元の文になる
  const joined = a.st.texts.join('');
  assert.ok(joined.includes('このチップの写真・測定なし'));
});
