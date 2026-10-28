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
  ['reproduce', 'results', 'paramform', 'packageform', 'packagepanel', 'heatdata', 'presetlist', 'diffpanel'].forEach((m) => assert.ok(ui && ui[m], `SDS.ui.${m} が登録されていない`));
  ['perf', 'power', 'thermal', 'area', 'heatmap'].forEach((m) => assert.ok(ctx.SDS.sim[m], `SDS.sim.${m} が登録されていない`));
  ['design', 'evaluate', 'diff'].forEach((m) => assert.ok(ctx.SDS.model[m], `SDS.model.${m} が登録されていない`));
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
