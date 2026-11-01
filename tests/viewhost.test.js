'use strict';
// 3D 表示 / 2D 編集の切替(js/render/viewhost.js)のテスト。DOM とビューはスタブ(Node のみ)。
const test = require('node:test');
const assert = require('node:assert');
const { createViewHost } = require('../js/render/viewhost.js');

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.style = {}; this.className = ''; this.listeners = {}; this.parentNode = null; this._t = ''; this.value = ''; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, f) { this.listeners[t] = f; }
  set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; this._t = String(v); }
  get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); }
}
const findAll = (n, pred, out) => { out = out || []; if (pred(n)) out.push(n); n.children.forEach((c) => findAll(c, pred, out)); return out; };

function setup(opt) {
  const o = opt || {};
  const log = { made: [], destroyed: [] };
  const doc = { createElement: (t) => new El(t) };
  const win = { getComputedStyle: () => ({ position: 'relative' }), localStorage: o.storage };
  doc.defaultView = win;
  const container = new El('div'); container.ownerDocument = doc;
  const mkView = (kind) => (stage, handlers) => {
    if (o['fail' + kind]) { stage.textContent = 'WebGL が使えません。(スタブ)'; return { available: false, destroy() {} }; }
    const v = { kind, stage, handlers, calls: [], available: true };
    const rec = (n) => (...a) => { v.calls.push([n, ...a]); };
    ['setDesign', 'setSelection', 'setViewMode', 'setColorMode', 'setHeatmap', 'fit', 'setCameraPreset', 'setIhsMode', 'setLabels'].forEach((n) => { v[n] = rec(n); });
    v.captureCanvas = (w) => ({ kind, w });
    v.destroy = () => { log.destroyed.push(v); };
    log.made.push(v);
    return v;
  };
  const picked = []; const changed = [];
  const host = createViewHost(container, { onSelect: (ids) => picked.push(ids), onChange: (d, info) => changed.push([d, info]) },
    { factories: { createDieView: mkView('2d'), createPackageView3D: mkView('3d') }, storage: o.storage });
  const btn = (dim) => findAll(container, (n) => n.attrs && n.attrs['data-dim'] === dim)[0];
  return { host, log, container, picked, changed, btn };
}
const memStore = (init) => { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };
const D1 = { dies: [{ id: 'd', x: 0, y: 0, widthMm: 5, heightMm: 5, blocks: [{ id: 'b1' }] }] };

test('既定は 3D 表示。3D ビューだけが作られ、切替ボタンの aria-pressed とカメラ操作が出る', () => {
  const { host, log, btn, container } = setup({ storage: memStore() });
  assert.strictEqual(host.available, true);
  assert.strictEqual(host.getDimension(), '3d');
  assert.deepStrictEqual(log.made.map((v) => v.kind), ['3d']);
  assert.strictEqual(btn('3d').attrs['aria-pressed'], 'true'); assert.strictEqual(btn('2d').attrs['aria-pressed'], 'false');
  const cams = findAll(container, (n) => n.attrs && n.attrs['data-cam']);
  assert.deepStrictEqual(cams.map((n) => n.textContent), ['上から', '斜め', '横から', 'リセット']);
  cams[0].listeners.click(); cams[3].listeners.click();
  assert.deepStrictEqual(log.made[0].calls.filter((c) => c[0] === 'setCameraPreset').map((c) => c[1]), ['top', 'reset']);
});

test('2D へ切り替えると設計・選択・表示モード・色分け・ヒートマップを引き継ぎ、3D は破棄される。戻すと 2D 側の編集結果も引き継ぐ', () => {
  const st = memStore();
  const { host, log, btn, picked, changed } = setup({ storage: st });
  const heat = { kind: 'power', dies: [] };
  host.setDesign(D1); host.setColorMode('origin'); host.setSelection(['b1']); host.setViewMode('power'); host.setHeatmap(heat);
  btn('2d').listeners.click();
  assert.strictEqual(host.getDimension(), '2d');
  assert.deepStrictEqual(log.made.map((v) => v.kind), ['3d', '2d']);
  assert.strictEqual(log.destroyed.length, 1); assert.strictEqual(log.destroyed[0].kind, '3d');
  const v2 = log.made[1];
  const got = (n) => v2.calls.filter((c) => c[0] === n).pop();
  assert.strictEqual(got('setDesign')[1], D1); assert.deepStrictEqual(got('setSelection')[1], ['b1']);
  assert.strictEqual(got('setViewMode')[1], 'power'); assert.strictEqual(got('setColorMode')[1], 'origin'); assert.strictEqual(got('setHeatmap')[1], heat);
  assert.strictEqual(st.m['sds.view.dimension'], '2d'); // 表示設定は保存(履歴・自動保存とは無関係)
  // 2D での選択・編集がホストの状態と呼び出し元に伝わる
  const D2 = { dies: [{ id: 'd', x: 0, y: 0, widthMm: 5, heightMm: 5, blocks: [{ id: 'b1', x: 1 }, { id: 'b2' }] }] };
  v2.handlers.onSelect(['b2']); v2.handlers.onChange(D2, { coalesce: true });
  assert.deepStrictEqual(picked, [['b2']]); assert.strictEqual(changed.length, 1); assert.strictEqual(changed[0][0], D2);
  btn('3d').listeners.click();
  const v3 = log.made[2];
  assert.strictEqual(v3.kind, '3d');
  assert.strictEqual(v3.calls.filter((c) => c[0] === 'setDesign').pop()[1], D2);
  assert.deepStrictEqual(v3.calls.filter((c) => c[0] === 'setSelection').pop()[1], ['b2']);
});

test('同じ方式のボタンを押しても作り直さない。不正な指定は無視', () => {
  const { host, log, btn } = setup({ storage: memStore() });
  btn('3d').listeners.click();
  assert.strictEqual(log.made.length, 1);
  assert.strictEqual(host.setDimension('4d'), false);
  assert.strictEqual(host.getDimension(), '3d');
});

test('保存された表示設定(2D)から始まる。localStorage が例外を投げても既定(3D)で動く', () => {
  const a = setup({ storage: memStore({ 'sds.view.dimension': '2d' }) });
  assert.strictEqual(a.host.getDimension(), '2d'); assert.deepStrictEqual(a.log.made.map((v) => v.kind), ['2d']);
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const b = setup({ storage: bad });
  assert.strictEqual(b.host.getDimension(), '3d');
  b.btn('2d').listeners.click(); // 保存に失敗しても切替は成功
  assert.strictEqual(b.host.getDimension(), '2d');
  const c = setup({ storage: memStore({ 'sds.view.dimension': 'junk' }) });
  assert.strictEqual(c.host.getDimension(), '3d');
});

test('蓋の表示切替は 3D ビューに伝わり、保存され、3D を作り直したときも復元される', () => {
  const st = memStore();
  const { host, log, container, btn } = setup({ storage: st });
  assert.strictEqual(log.made[0].calls.filter((c) => c[0] === 'setIhsMode').pop()[1], 'glass'); // 既定は半透明
  const sel = findAll(container, (n) => n.tag === 'select')[0];
  assert.deepStrictEqual(sel.children.map((o) => o.textContent), ['表示', '半透明', '非表示']);
  sel.value = 'off'; sel.listeners.change({ target: sel });
  assert.strictEqual(log.made[0].calls.filter((c) => c[0] === 'setIhsMode').pop()[1], 'off');
  assert.strictEqual(st.m['sds.view.ihs'], 'off');
  btn('2d').listeners.click(); btn('3d').listeners.click();
  assert.strictEqual(log.made[2].calls.filter((c) => c[0] === 'setIhsMode').pop()[1], 'off');
  assert.ok(host.getDimension() === '3d');
});

test('3D が作れなければ 2D に切り替えて案内を出す。両方作れなければ現行と同じエラー文で available:false', () => {
  const a = setup({ storage: memStore(), fail3d: true });
  assert.strictEqual(a.host.available, true); assert.strictEqual(a.host.getDimension(), '2d');
  assert.ok(a.container.textContent.includes('3D 表示を開始できなかったため 2D 表示です'));
  const b = setup({ storage: memStore(), fail3d: true, fail2d: true });
  assert.strictEqual(b.host.available, false);
  assert.ok(b.container.textContent.includes('WebGL が使えません'));
  assert.strictEqual(b.host.captureCanvas(), null);
  b.host.setDesign(D1); b.host.fit(); b.host.destroy(); // 例外にならない
});

test('2D への切替に失敗したら元の 3D に戻して案内を出す', () => {
  const o = { storage: memStore() };
  let n2 = 0;
  const log = { made: [] };
  const doc = { createElement: (t) => new El(t) }; doc.defaultView = { getComputedStyle: () => ({ position: 'relative' }) };
  const container = new El('div'); container.ownerDocument = doc;
  const mk = (kind) => (stage) => {
    if (kind === '2d') { n2++; stage.textContent = 'x'; return { available: false, destroy() {} }; }
    const v = { kind, available: true, setDesign() {}, setSelection() {}, setViewMode() {}, setColorMode() {}, setHeatmap() {}, setIhsMode() {}, fit() {}, destroy() { v.dead = true; } };
    log.made.push(v); return v;
  };
  const host = createViewHost(container, {}, { factories: { createDieView: mk('2d'), createPackageView3D: mk('3d') }, storage: o.storage });
  assert.strictEqual(host.setDimension('2d'), false);
  assert.strictEqual(host.getDimension(), '3d'); assert.strictEqual(n2, 1);
  assert.strictEqual(log.made.length, 2); assert.ok(log.made[0].dead && !log.made[1].dead);
  assert.ok(container.textContent.includes('2D 表示に切り替えられませんでした'));
});

test('captureCanvas は現在のビューに委譲する(3D のときも 2D のときも)。destroy で DOM とビューを片付ける', () => {
  const { host, container, btn, log } = setup({ storage: memStore() });
  assert.deepStrictEqual(host.captureCanvas(2400), { kind: '3d', w: 2400 });
  btn('2d').listeners.click();
  assert.deepStrictEqual(host.captureCanvas(1000), { kind: '2d', w: 1000 });
  host.destroy();
  assert.strictEqual(container.children.length, 0);
  assert.ok(log.destroyed.some((v) => v.kind === '2d'));
  assert.strictEqual(host.captureCanvas(), null);
});

test('ラベルの表示切替(既定は表示): 3D ビューに伝わり、保存され、3D を作り直したときも復元される。壊れた保存値は既定に戻る', () => {
  const st = memStore();
  const { host, log, container, btn } = setup({ storage: st });
  assert.strictEqual(log.made[0].calls.filter((c) => c[0] === 'setLabels').pop()[1], true);
  const chk = findAll(container, (n) => n.attrs && n.attrs.id === 'vh-labels')[0];
  assert.strictEqual(chk.checked, true);
  chk.checked = false; chk.listeners.change({ target: chk });
  assert.strictEqual(log.made[0].calls.filter((c) => c[0] === 'setLabels').pop()[1], false);
  assert.strictEqual(st.m['sds.view.labels'], '0'); assert.strictEqual(host.getLabels(), false);
  btn('2d').listeners.click(); btn('3d').listeners.click();
  assert.strictEqual(log.made[2].calls.filter((c) => c[0] === 'setLabels').pop()[1], false);
  // 保存済みの値から始まる / 壊れた値は既定(表示)
  const b = setup({ storage: memStore({ 'sds.view.labels': '0' }) });
  assert.strictEqual(b.host.getLabels(), false);
  const c = setup({ storage: memStore({ 'sds.view.labels': 'zzz' }) });
  assert.strictEqual(c.host.getLabels(), true);
  // storage が例外を投げても動く
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const e = setup({ storage: bad });
  assert.strictEqual(e.host.getLabels(), true);
  e.host.setLabels(false); assert.strictEqual(e.host.getLabels(), false);
});

test('注記は canvas の外(ビュー下の DOM)に出る。ビューの getNotes を反映し、設計・表示モード・ヒートマップの変更と 2D/3D 切替で更新され、空なら隠れる。破棄で片付く', () => {
  const st = memStore();
  const notesByKind = { '3d': ['3D は模式図', '編集は 2D'], '2d': ['模式図(2D)'] };
  let calls = 0;
  const { host, container, btn, log } = setup({ storage: st });
  const noteEl = () => findAll(container, (n) => n.attrs && n.attrs.class && n.attrs.class.includes('vh-notes'))[0] || findAll(container, (n) => n.className && n.className.includes('vh-notes'))[0];
  // スタブのビューに getNotes を生やす(作り直しのたびに最新の内容を返す)
  log.made.forEach((v) => { v.getNotes = () => { calls++; return notesByKind[v.kind]; }; });
  host.setDesign(D1);
  const el = noteEl();
  assert.ok(el, '注記の要素がある');
  assert.deepStrictEqual(el.children.map((c) => c.textContent), ['3D は模式図', '編集は 2D']);
  assert.notStrictEqual(el.style.display, 'none');
  // 注記は stage(canvas の親)の外にある
  const stage = findAll(container, (n) => n.className === 'vh-stage')[0];
  assert.ok(stage && !findAll(stage, (n) => n === el).length);
  // 内容が空になると隠れる
  notesByKind['3d'] = []; host.setViewMode('power');
  assert.strictEqual(el.style.display, 'none'); assert.strictEqual(el.children.length, 0);
  notesByKind['3d'] = ['x']; host.setHeatmap({ kind: 'power', dies: [] });
  assert.deepStrictEqual(el.children.map((c) => c.textContent), ['x']);
  assert.ok(calls > 0);
  host.destroy();
  assert.ok(!findAll(container, (n) => n === el).length, '破棄で片付く');
});

test('2D/3D の切替(setDimension)で注記が更新され、ビューの下端(stage.style.bottom)が注記の高さに合う。空なら 0', () => {
  const { host, container, btn, log } = setup({ storage: memStore() });
  const notes = { '3d': ['3D の注記'], '2d': [] };
  const patch = () => log.made.forEach((v) => { if (!v.getNotes) v.getNotes = () => notes[v.kind]; });
  patch(); host.setDesign(D1);
  const el = findAll(container, (n) => n.className && n.className.includes('vh-notes'))[0];
  const stage = findAll(container, (n) => n.className === 'vh-stage')[0];
  el.offsetHeight = 44; host.setDesign(D1); notes['3d'] = ['3D の注記', '2 行目']; host.setViewMode('temp');
  assert.deepStrictEqual(el.children.map((c) => c.textContent), ['3D の注記', '2 行目']);
  assert.strictEqual(stage.style.bottom, '44px');
  // 2D へ: 注記なし → 隠れて下端 0
  btn('2d').listeners.click(); patch(); host.setViewMode('place');
  assert.strictEqual(el.style.display, 'none'); assert.strictEqual(stage.style.bottom, '0px');
  // 2D に注記が出れば、そのぶん下端が上がる
  notes['2d'] = ['2D の注記']; el.offsetHeight = 30; host.setViewMode('power');
  assert.deepStrictEqual(el.children.map((c) => c.textContent), ['2D の注記']); assert.strictEqual(stage.style.bottom, '30px');
  // 3D へ戻すと 3D の注記に更新される
  btn('3d').listeners.click(); patch(); host.setViewMode('place');
  assert.deepStrictEqual(el.children.map((c) => c.textContent), ['3D の注記', '2 行目']);
});
