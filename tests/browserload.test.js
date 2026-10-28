'use strict';
// ブラウザと同じ条件(require も module も無い)で、index.html の <script> を書かれた順に読み込み、
// 読み込み時に失敗しないこと・各モジュールが登録されること・全プリセットで画面の描画が例外にならないことを確かめる。
// Node の require で依存が解決されてしまうテストでは見つからない「読み込み順の誤り」を検出するため。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);

// 最小の DOM スタブ(dom.js の h() が使う範囲)
class FakeNode {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._t = ''; this.className = ''; this.style = {}; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { this.children.splice(this.children.indexOf(c), 1); }
  get firstChild() { return this.children[0] || null; }
  addEventListener() {}
  querySelector() { return null; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  set textContent(v) { this.children = []; this._t = String(v); }
  get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); }
}
class FakeText extends FakeNode { constructor(s) { super('#text'); this._t = s; } }

// main.js(DOM に強く依存)を除いて、ブラウザと同じ条件で順に読み込む
function loadAll(extra) {
  const ctx = vm.createContext(Object.assign({}, extra || {}));
  ctx.window = ctx; // ブラウザの window(globalThis と同一)
  for (const s of srcs) {
    if (s === 'js/main.js') continue;
    const code = fs.readFileSync(path.join(root, s), 'utf8');
    try { vm.runInContext(code, ctx, { filename: s }); } catch (e) { assert.fail(`${s} の読み込みで失敗: ${e.message}(これより前に読み込まれていない依存がある)`); }
  }
  return ctx;
}

test('index.html の script は、ブラウザと同じ条件で順に読み込める', () => {
  assert.ok(srcs.length > 20, 'script が少なすぎる');
  const ctx = loadAll();
  const ui = ctx.SDS && ctx.SDS.ui;
  ['reproduce', 'results', 'paramform', 'packageform', 'packagepanel', 'heatdata', 'presetlist', 'diffpanel', 'mixform', 'library', 'mixpanel'].forEach((m) => assert.ok(ui && ui[m], `SDS.ui.${m} が登録されていない`));
  ['perf', 'power', 'thermal', 'area', 'heatmap'].forEach((m) => assert.ok(ctx.SDS.sim[m], `SDS.sim.${m} が登録されていない`));
  ['design', 'evaluate', 'diff', 'blocklib', 'compat'].forEach((m) => assert.ok(ctx.SDS.model[m], `SDS.model.${m} が登録されていない`));
  assert.ok(ctx.SDS.render && ctx.SDS.render.createDieView, 'SDS.render.createDieView が登録されていない');
});

test('main.js が使う SDS のモジュール(ui / sim / model / render / history)は、すべて読み込み後に登録されている', () => {
  const ctx = loadAll();
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  // 正規表現のバックスラッシュが抜けると 0 件になり、何も検査しなくなるので、件数も確かめる
  const uses = [...main.matchAll(/\bS\.(ui|sim|model|render|history)\.(\w+)/g)].map((m) => [m[1], m[2]]);
  assert.ok(uses.length > 15, `main.js の参照を拾えていない(${uses.length} 件)`);
  uses.forEach(([ns, name]) => assert.ok(ctx.SDS[ns] && ctx.SDS[ns][name], `main.js が使う SDS.${ns}.${name} が登録されていない`));
  assert.ok(typeof ctx.SDS.history.createHistory === 'function', 'SDS.history.createHistory が登録されていない');
});

test('全プリセットで、結果パネル・再現度パネル・パッケージ設定の描画が例外にならない(DOM スタブ)', () => {
  const ctx = loadAll({ Node: FakeNode, document: { createElement: (t) => new FakeNode(t), createTextNode: (s) => new FakeText(s) } });
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design;
  const c = makeContext();
  const errs = [];
  for (const p of c.presets) {
    for (const mode of ['reproduce', 'improve']) {
      try {
        const d = DS.fromPreset(p, { mode });
        const ev = evaluate(d, c);
        ctx.SDS.ui.results.renderResults(new FakeNode('div'), ev, d);
        ctx.SDS.ui.results.renderRepro(new FakeNode('div'), ev);
        ctx.SDS.ui.packagepanel.renderPackage(new FakeNode('div'), d, {}, {}, (p.power && p.power.peak) || null);
      } catch (e) { errs.push(`${p.id}(${mode}): ${e.message}`); }
    }
  }
  assert.deepStrictEqual(errs, []);
});

test('混合設計(Zen 5 コア 8 個 + L3)でも、結果・混合パネル・部品ライブラリ・プロパティ・検証の描画が例外にならない(DOM スタブ)', () => {
  const ctx = loadAll({ Node: FakeNode, document: { createElement: (t) => new FakeNode(t), createTextNode: (s) => new FakeText(s) } });
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const BL = ctx.SDS.model.blocklib;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  let d = DS.fromScratch({ name: '混合テスト', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4' });
  let r = DS.addPart(d, BL.get(parts, 'core:amd-zen5-9700x:P'), { count: 8 }); assert.ok(r.ok, r.reason); d = r.design;
  r = DS.addPart(d, BL.get(parts, 'l3:amd-zen5-9700x'), {}); assert.ok(r.ok, r.reason); d = r.design;
  r = DS.addPart(d, BL.get(parts, 'core:intel-adl-12900k:P'), {}); assert.ok(r.ok, r.reason); d = r.design; // Intel 7 → N4 の移植(換算の表示を通す)
  // x86 と Arm の混在(error が出る状態)でも描ける
  const mixed = DS.addPart(d, BL.get(parts, 'core:mt-9400:P'), { count: 1, allowIsaMix: true }); assert.ok(mixed.ok, mixed.reason);
  const ui = ctx.SDS.ui;
  for (const dd of [d, mixed.design, DS.fromScratch({ widthMm: 12, heightMm: 12 })]) {
    const ev = evaluate(dd, c);
    assert.strictEqual(ev.isMix, true);
    const out = new FakeNode('div');
    ui.results.renderResults(out, ev, dd);
    assert.ok(out.textContent.includes('混合設計(予測)'));
    assert.ok(out.textContent.includes('混合による性能低下は反映していません') && out.textContent.includes('混合設計は校正した範囲の外です'));
    if (dd === d) assert.ok(out.textContent.includes('元 7.43 mm²') && out.textContent.includes('全コアが最大クロックで動く前提') && out.textContent.includes('最速として選んだコア') && out.textContent.includes('うち移植 1 個は換算値'));
    assert.ok(!out.textContent.includes('再現度(公開値との比較)') && !out.textContent.includes('公開値(参考)'));
    ui.mixpanel.renderMix(new FakeNode('div'), dd, ev, { onDieSize() {}, onClock() {} }, { die: 'x', 'clock:amd-zen5-9700x:P': 'y' }, c.nodes);
    ui.library.renderLibrary(new FakeNode('div'), dd, parts, { onAdd() {} }, '理由', c.nodes);
    ui.panels.renderProps(new FakeNode('div'), dd, dd.dies[0].blocks.length ? [dd.dies[0].blocks[0].id] : [], () => {}, '', { origin: () => 'x', onRemove() {} });
    ui.panels.renderValidation(new FakeNode('div'), ev.warnings, () => {});
    ui.packagepanel.renderPackage(new FakeNode('div'), dd, {}, {}, null);
  }
  assert.strictEqual(ui.paramform.modeInfo(d).code, 'C');
  assert.strictEqual(ui.paramform.showRepro(d), false);
  assert.strictEqual(ui.paramform.showDiff(d), false);
  // 新規ダイアログ(C のカードが有効)と混合設計の設定ダイアログが描ける
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  ui.dialogs.openNew({ onPickMode() {} });
  ui.dialogs.openMix(c, { onCreate() { return { ok: true }; } });
});
