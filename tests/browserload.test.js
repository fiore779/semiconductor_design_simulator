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
  addEventListener(t, fn) { (this.listeners = this.listeners || {})[t] = fn; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
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
  ['reproduce', 'results', 'paramform', 'packageform', 'packagepanel', 'heatdata', 'presetlist', 'diffpanel', 'mixform', 'library', 'mixpanel', 'coreform', 'coreeditor', 'layout'].forEach((m) => assert.ok(ui && ui[m], `SDS.ui.${m} が登録されていない`));
  ['perf', 'power', 'thermal', 'area', 'heatmap'].forEach((m) => assert.ok(ctx.SDS.sim[m], `SDS.sim.${m} が登録されていない`));
  ['floorplan', 'design', 'evaluate', 'diff', 'blocklib', 'compat', 'coredef', 'usercores'].forEach((m) => assert.ok(ctx.SDS.model[m], `SDS.model.${m} が登録されていない`));
  assert.ok(ctx.SDS.render && ctx.SDS.render.createDieView, 'SDS.render.createDieView が登録されていない');
  // 3D パッケージビュー(依存順: mat4 → pkggeom → pkgview3d → viewhost。pkgview3d は dieview の後)
  ['mat4', 'pkggeom', 'pkgview3d'].forEach((m) => assert.ok(ctx.SDS.render[m], `SDS.render.${m} が登録されていない`));
  assert.ok(typeof ctx.SDS.render.createPackageView3D === 'function' && typeof ctx.SDS.render.createViewHost === 'function');
  const order = (f) => srcs.indexOf(f);
  const R = (n) => order(`js/render/${n}.js`);
  assert.ok(R('mat4') >= 0 && R('mat4') < R('pkggeom') && R('pkggeom') < R('pkgview3d') && R('dieview') < R('pkgview3d') && R('colormap') < R('pkgview3d') && R('pkgview3d') < R('viewhost'));
  assert.ok(R('viewhost') < order('js/main.js'));
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

// ---- モード D(自作コア)の画面 ----
const findAll = (n, pred, out) => { out = out || []; if (pred(n)) out.push(n); (n.children || []).forEach((c) => findAll(c, pred, out)); return out; };
const stubDoc = () => ({ Node: FakeNode, document: { createElement: (t) => new FakeNode(t), createTextNode: (s) => new FakeText(s) } });

test('D 新規: 自作コアを置いた設計で、結果の注意帯・ライブラリの複製ボタン・混合パネル・プロパティ・検証・入口ダイアログの描画が例外にならない(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const BL = ctx.SDS.model.blocklib; const CD = ctx.SDS.model.coredef; const ui = ctx.SDS.ui;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  const ci = ui.coreform.cloneInfo(BL.get(parts, 'core:amd-zen1-1800x:P'), c.uarch, ctx.SDS_DATA.blocklibAreas);
  assert.ok(ci.cloneable && ci.derivable);
  const def = ui.coreform.assignId(ui.coreform.applyField(ui.coreform.applyField(ci.def, 'rob', '240').def, 'width', '7').def, []);
  let d = DS.fromScratch({ name: '新規テスト', widthMm: 40, heightMm: 40, nodeId: 'tsmc-n4', entry: 'new' }); // 基準 GF 14 → N4 の移植も通す
  const r = DS.addPart(d, Object.assign({}, CD.toPart(def), { sourceChip: ui.coreform.customChip(def) }), { count: 3, nodes: c.nodes });
  assert.ok(r.ok, r.reason); d = r.design;
  const ev = evaluate(d, c);
  const out = new FakeNode('div');
  ui.results.renderResults(out, ev, d);
  const t = out.textContent;
  assert.ok(t.includes('自作コアの性能は基準コア(Zen 1)の補正を借りた推定です') && t.includes('自作コアの面積は範囲です') && t.includes('電力・温度・最大クロックは出していません'));
  assert.ok(t.includes('混合設計の性能は確度:低です') && t.includes('上振れ側の予測') && t.includes('校正した範囲の外'));
  assert.ok(t.includes('導出(範囲)') && t.includes('自作コア『') && t.includes('基準のマイクロアーキ(Zen 1)の値を借りています'));
  ui.mixpanel.renderMix(new FakeNode('div'), d, ev, { onDieSize() {}, onClock() {}, onFitDie() {} }, {}, c.nodes);
  const lib = new FakeNode('div');
  ui.library.renderLibrary(lib, d, parts, { onAdd() {}, onClone() {}, onEditDef() {} }, '', c.nodes, { uarch: c.uarch, areas: ctx.SDS_DATA.blocklibAreas });
  assert.ok(lib.textContent.includes('複製して編集') && lib.textContent.includes('自作コア(1 件)') && lib.textContent.includes('この定義を元に編集') && lib.textContent.includes('面積の導出'));
  ui.panels.renderProps(new FakeNode('div'), d, [d.dies[0].blocks[0].id], () => {}, '', { origin: () => 'x', onRemove() {} });
  ui.panels.renderValidation(new FakeNode('div'), ev.warnings, () => {});
  assert.strictEqual(ui.paramform.modeInfo(d).code, 'D');
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  ui.dialogs.openNew({ onPickMode() {} });
  assert.ok(body.textContent.includes('D 新規') && !body.textContent.includes('未実装(今回は選べません)'));
  ui.dialogs.close();
  ui.dialogs.openMix(c, { onCreate() { return { ok: true }; } }, { entry: 'new' });
  assert.ok(body.textContent.includes('D 新規') && body.textContent.includes('プロセス') && body.textContent.includes('ダイ寸法'));
  ui.dialogs.close();
});

test('コアエディタ: 入力エラーを項目ごとに出す・編集で結果が変わる・無効欄に理由・追加は個数を検証して onAdd を呼ぶ(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  const { makeContext } = ctx.SDS.model.evaluate; const BL = ctx.SDS.model.blocklib; const ui = ctx.SDS.ui;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  const infoOf = (p) => ui.coreform.cloneInfo(p, c.uarch, ctx.SDS_DATA.blocklibAreas);
  const open = (def) => {
    const added = [];
    ui.coreeditor.openCoreEditor({ def, nodes: c.nodes, toNodeId: 'gf-14', evalCtx: { cal: c.cal, uarch: c.uarch, presets: c.presets, nodes: c.nodes } }, { onAdd(dd, n) { added.push([dd, n]); return { ok: true }; } });
    return added;
  };
  const byId = (id) => findAll(body, (n) => n.attrs && n.attrs.id === id)[0];
  const btn = (label) => findAll(body, (n) => n.tag === 'button' && n.textContent === label)[0];
  const added = open(infoOf(BL.get(parts, 'core:amd-zen1-1800x:P')).def);
  const t0 = body.textContent;
  assert.ok(t0.includes('確度 ▼ 低') && t0.includes('基準 192') && t0.includes('継承') && t0.includes('1 コアの消費電力') && t0.includes('未実装'));
  assert.ok(!t0.includes('導出(範囲)'));   // 未編集は表の区分のまま
  // 範囲外の入力: エラーを出し、計算には反映しない
  const rob = byId('ce-rob');
  rob.value = '5'; rob.listeners.input({ target: rob });
  assert.ok(body.textContent.includes('32〜1024') && body.textContent.includes('入力値は計算に反映していません'));
  assert.strictEqual(rob.attrs['aria-invalid'], 'true');
  btn('ダイに追加').listeners.click();
  assert.strictEqual(added.length, 0);
  assert.ok(body.textContent.includes('入力にエラーがあります'));
  // 正しい入力: エラーが消え、基準比と校正範囲外・上振れが出る
  rob.value = '400'; rob.listeners.input({ target: rob });
  assert.ok(!body.textContent.includes('入力値は計算に反映していません'));
  assert.ok(body.textContent.includes('導出(範囲)') && body.textContent.includes('仮定') && body.textContent.includes('データから導けない'));
  assert.ok(body.textContent.includes('×2.08') && body.textContent.includes('校正範囲外') && body.textContent.includes('上振れ側'));
  // 個数の検証
  const cnt = byId('ce-count');
  cnt.value = '65'; btn('ダイに追加').listeners.click();
  assert.strictEqual(added.length, 0); assert.ok(body.textContent.includes('1〜64'));
  cnt.value = '4'; btn('ダイに追加').listeners.click();
  assert.strictEqual(added.length, 1); assert.strictEqual(added[0][1], 4); assert.strictEqual(added[0][0].params.rob, 400);
  // 基準に戻す
  btn('基準に戻す').listeners.click();
  assert.strictEqual(rob.value, '192');
  ui.dialogs.close();
  // 面積を導けない基準では、幅・ROB・L2 の欄のうち編集不可のものが無効で、理由が出る
  const nd = parts.filter((p) => p.kind === 'core').map(infoOf).find((i) => i.cloneable && !i.derivable);
  assert.ok(nd);
  body.children = [];
  open(nd.def);
  assert.ok(body.textContent.includes('編集できません') && body.textContent.includes('面積を導けません'));
  assert.ok(byId('ce-l2KB').disabled === true);
  ui.dialogs.close();
});

// ---- 比較・書き出し ----
test('比較・書き出し: script が登録され、比較ダイアログ(3 種の比較先)と書き出しダイアログの描画が例外にならない(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  ['compareform', 'exporter', 'comparepanel', 'exportpanel'].forEach((m) => assert.ok(ctx.SDS.ui[m], `SDS.ui.${m} が登録されていない`));
  const order = (f) => srcs.indexOf(f);
  assert.ok(order('js/ui/compareform.js') < order('js/ui/comparepanel.js') && order('js/ui/presetdialog.js') < order('js/ui/comparepanel.js') && order('js/ui/exporter.js') < order('js/ui/exportpanel.js'));
  const { evaluate, makeContext } = ctx.SDS.model.evaluate; const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  const cur = DS.setClock(DS.fromPreset(c.presets[0], { mode: 'improve' }), c.presets[0].cfg.cores[0].type, c.presets[0].cfg.cores[0].boostGHz * 1.1);
  assert.ok(cur.ok, cur.reason);
  const d = cur.design; const ev = evaluate(d, c);
  ui.comparepanel.openCompare({ design: d, ev, presets: c.presets, baseline: DS.fromPreset(c.presets[0]), evaluate: (x) => evaluate(x, c) });
  const t = body.textContent;
  assert.ok(t.includes('設計の比較') && t.includes('元のプリセット') && t.includes('差(現在 − 比較先)') && t.includes('編集後') && t.includes('[予測]'));
  assert.ok(!t.includes('undefined') && !t.includes('NaN'));
  assert.ok(t.includes('比較先A') && t.includes('比較先B') && t.includes('(なし'), '比較先の枠が 2 つある');
  assert.ok(!t.includes('比較先B(差は'), '既定は 1 対 1(比較先 B は「なし」)');
  // 3 列: 比較先 B に「履歴の最初の状態」を選ぶ(別の設計)と、列が 3 つになる。同じ指定を選ぶと重複の注意が出て列は増えない
  const findId = (n, id) => (n.attrs && n.attrs.id === id ? n : (n.children || []).reduce((f, c) => f || findId(c, id), null));
  ctx.SDS.ui.dialogs.close(); body.children = [];
  ui.comparepanel.openCompare({ design: d, ev, presets: c.presets, baseline: DS.fromPreset(c.presets[1]), evaluate: (x) => evaluate(x, c) });
  const src2 = findId(body, 'cmp-src2'); assert.ok(src2 && src2.listeners && src2.listeners.change, '比較先 B の選択がある');
  src2.listeners.change({ target: { value: 'history' } });
  const t3 = body.textContent;
  assert.ok(t3.includes('比較先A(差は 現在 − 比較先A)') && t3.includes('比較先B(差は 現在 − 比較先B)') && t3.includes('比較先どうしの差は出しません'));
  assert.ok(!t3.includes('undefined') && !t3.includes('NaN'));
  src2.listeners.change({ target: { value: 'origin' } });
  const t4 = body.textContent;
  assert.ok(t4.includes('重複して並べません') && !t4.includes('比較先B(差は'));
  src2.listeners.change({ target: { value: 'none' } });
  assert.ok(!body.textContent.includes('重複して並べません') && body.textContent.includes('差(現在 − 比較先)'));
  // 混合設計: 元のプリセットは選べない(選択肢は無効)。履歴の最初の状態が既定になり、電力・温度は「—(理由)」
  ctx.SDS.ui.dialogs.close(); body.children = [];
  const mix = DS.fromScratch({ name: '混合', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  ui.comparepanel.openCompare({ design: mix, ev: evaluate(mix, c), presets: c.presets, baseline: mix, evaluate: (x) => evaluate(x, c) });
  assert.ok(body.textContent.includes('選べません') && body.textContent.includes('—(') && !body.textContent.includes('NaN'));
  ctx.SDS.ui.dialogs.close(); body.children = [];
  // 書き出しダイアログ
  ui.exportpanel.openExport({ design: d, ev, notify() {} });
  const bt = body.textContent;
  assert.ok(bt.includes('設計を JSON で保存') && bt.includes('結果を CSV で保存') && bt.includes('要約テキストをコピー') && bt.includes('通信はしません'));
  ctx.SDS.ui.dialogs.close();
});

test('ダイアログ: isOpen が開閉に追従し、書き出しはボタンを押した時点の最新の設計を書き出す(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  const { evaluate, makeContext } = ctx.SDS.model.evaluate; const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const body = new FakeNode('body');
  const blobs = [];
  ctx.Blob = class { constructor(parts) { blobs.push(parts.join('')); } };
  ctx.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  ctx.setTimeout = () => 0;
  ctx.document.createElement = (t) => { const n = new FakeNode(t); n.click = () => {}; return n; };
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  const d1 = DS.fromPreset(c.presets[0], { mode: 'reproduce' }); const d2 = DS.fromPreset(c.presets[1], { mode: 'reproduce' });
  let now = { design: d1, ev: evaluate(d1, c) };
  assert.strictEqual(ui.dialogs.isOpen(), false);
  ui.exportpanel.openExport({ design: d1, ev: now.ev, notify() {}, getCurrent: () => now });
  assert.strictEqual(ui.dialogs.isOpen(), true);
  now = { design: d2, ev: evaluate(d2, c) }; // ダイアログを開いたまま設計が変わった
  findAll(body, (n) => n.tag === 'button' && n.textContent === '設計を JSON で保存')[0].listeners.click();
  assert.strictEqual(blobs.length, 1);
  assert.strictEqual(JSON.parse(blobs[0]).name, d2.name);
  findAll(body, (n) => n.tag === 'button' && n.textContent === '結果を CSV で保存')[0].listeners.click();
  assert.ok(blobs[1].includes(d2.name));
  ui.dialogs.close();
  assert.strictEqual(ui.dialogs.isOpen(), false);
});

// ---- PNG 書き出し(canvas は記録するスタブ) ----
function pngStub(ctx, opt) {
  const o = opt || {}; const log = { texts: [], draws: [], outs: [], blobs: [], clicks: 0, revoked: [] };
  ctx.Blob = class { constructor(parts, op) { this.parts = parts; this.type = op && op.type; log.blobs.push(this); } };
  ctx.URL = { createObjectURL: () => 'blob:png', revokeObjectURL: (u) => log.revoked.push(u) };
  ctx.setTimeout = (fn) => { fn(); return 0; };
  ctx.document.createElement = (t) => {
    const n = new FakeNode(t);
    if (t === 'a') n.click = () => { log.clicks++; };
    if (t === 'canvas') {
      n.width = 0; n.height = 0; log.outs.push(n);
      n.getContext = () => (o.no2d ? null : { measureText: (s) => ({ width: String(s).length * 8 }), fillText: (s) => log.texts.push(s), fillRect() {}, strokeRect() {}, drawImage: (...a) => log.draws.push(a) });
      if (!o.noToBlob) n.toBlob = (cb, type) => { n.blobType = type; cb(o.nullBlob ? null : new ctx.Blob(['png'], { type })); };
    }
    return n;
  };
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  return { log, body };
}
const flush = () => new Promise((r) => setImmediate(r));

test('PNG 書き出し: ダイ図+凡例+主要値+概算の注記を描いて toBlob(image/png) し、既存の download で保存(DOM スタブ)', async () => {
  const ctx = loadAll(stubDoc());
  const { evaluate, makeContext } = ctx.SDS.model.evaluate; const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const { log, body } = pngStub(ctx);
  const d = DS.fromPreset(c.presets[0], { mode: 'reproduce' }); const ev = evaluate(d, c);
  const src = new FakeNode('canvas'); src.width = 7000; src.height = 3000; // 巨大な元画像(高 DPR を想定)
  ui.exportpanel.openExport({ design: d, ev, notify() {}, captureDie: () => ({ canvas: src, mode: 'place', legend: [{ text: 'P/高性能コア', color: '#2f5fb3' }, { text: 'L3 キャッシュ', color: '#d9962b' }] }) });
  const btn = findAll(body, (n) => n.tag === 'button' && n.textContent === 'PNG(ダイ図)で保存')[0];
  assert.ok(btn, 'PNG ボタンがある');
  btn.listeners.click();
  await flush();
  const out = log.outs[0];
  assert.ok(out.width <= 2400 && out.width >= 900, `幅 ${out.width}`);
  assert.strictEqual(out.blobType, 'image/png');
  assert.ok(log.draws.some((a) => a[0] === src), '元のダイ図を drawImage する');
  const txt = log.texts.join('\n');
  assert.ok(txt.includes(d.name) && txt.includes('ST:') && txt.includes('MT:') && txt.includes('ダイ面積') && txt.includes('電力(推定)') && txt.includes('温度'));
  assert.ok(txt.includes('P/高性能コア') && txt.includes('L3 キャッシュ'), '凡例');
  assert.ok(txt.includes('性能・面積は概算。電力・温度は推定(確度:低)。ブロック配置は模式図。'), '注記が画像内にある');
  assert.strictEqual(log.clicks, 1);
  assert.ok(log.revoked.includes('blob:png'), 'objectURL を revoke');
  assert.ok(body.textContent.includes('PNG で保存しました') && body.textContent.includes('.diagram.png'));
  ui.dialogs.close();
});

test('PNG 書き出し: ダイ図なし・2D 不可・toBlob なし/null・高すぎる画像は ok:false の理由を画面に出し、他の書き出しは使える(DOM スタブ)', async () => {
  const ctx = loadAll(stubDoc());
  const { evaluate, makeContext } = ctx.SDS.model.evaluate; const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const d = DS.fromPreset(c.presets[0], { mode: 'reproduce' }); const ev = evaluate(d, c);
  const okSrc = () => { const s = new FakeNode('canvas'); s.width = 1000; s.height = 500; return { canvas: s, mode: 'place', legend: [] }; };
  const tall = () => { const s = new FakeNode('canvas'); s.width = 1000; s.height = 90000; return { canvas: s, mode: 'place', legend: [] }; };
  const cases = [
    [{}, () => null, 'ダイ図を取得できません'],
    [{ no2d: true }, okSrc, '2D canvas'],
    [{ noToBlob: true }, okSrc, 'toBlob'],
    [{ nullBlob: true }, okSrc, '変換に失敗'],
    [{}, tall, '大きすぎ'],
  ];
  for (const [opt, cap, want] of cases) {
    const { log, body } = pngStub(ctx, opt);
    ui.exportpanel.openExport({ design: d, ev, notify() {}, captureDie: cap });
    findAll(body, (n) => n.tag === 'button' && n.textContent === 'PNG(ダイ図)で保存')[0].listeners.click();
    await flush();
    const msg = findAll(body, (n) => n.attrs && n.attrs.role === 'status')[0];
    assert.ok(msg.textContent.includes('✗ PNG を書き出せませんでした') && msg.textContent.includes(want), `${want}: ${msg.textContent}`);
    assert.strictEqual(log.clicks, 0, 'ダウンロードしない');
    // 他の書き出しは使えるまま
    findAll(body, (n) => n.tag === 'button' && n.textContent === '結果を CSV で保存')[0].listeners.click();
    assert.strictEqual(log.clicks, 1);
    ui.dialogs.close();
  }
  // captureDie が無い(ダイビュー不可)場合も同様
  const { body } = pngStub(ctx);
  ui.exportpanel.openExport({ design: d, ev, notify() {} });
  findAll(body, (n) => n.tag === 'button' && n.textContent === 'PNG(ダイ図)で保存')[0].listeners.click();
  await flush();
  assert.ok(body.textContent.includes('ダイ図を取得できません'));
  ui.dialogs.close();
});

// ---- プリセット一覧(グループ化) ----
test('プリセット一覧: 102 行・31 見出し・初期は全て閉じる・見出しで開閉してフォーカスを保つ・行の文字に n=null 等が出ない・dblclick で全件が重複なく渡る(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  const ui = ctx.SDS.ui; const c = ctx.SDS.model.evaluate.makeContext();
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  let focused = null;
  FakeNode.prototype.focus = function () { focused = this; };
  const got = [];
  try {
    ui.dialogs.openPresets(c, { onReproduce(p) { got.push(p.id); }, onImprove() {} });
    const rows = () => findAll(body, (n) => n.tag === 'button' && n.attrs.role === 'option');
    const heads = () => findAll(body, (n) => n.tag === 'button' && n.className === 'group-head');
    assert.strictEqual(c.presets.length, 102);
    assert.strictEqual(rows().length, 102);
    assert.strictEqual(heads().length, 31);
    assert.ok(heads().every((n) => n.attrs['aria-expanded'] === 'false'));
    const key = heads()[0].dataset.key;
    heads()[0].listeners.click();
    assert.strictEqual(heads()[0].attrs['aria-expanded'], 'true');
    assert.ok(heads().slice(1).every((n) => n.attrs['aria-expanded'] === 'false'));
    assert.ok(focused && focused.dataset.key === key, '作り直した後も同じ見出しにフォーカスが戻る');
    rows().forEach((r) => { const t = r.textContent; assert.ok(!/n=null|undefined|NaN/.test(t), t); });
    // 行クリック後は選んだ行にフォーカス
    const r1 = rows()[3]; const id = r1.dataset.id;
    r1.listeners.click();
    assert.ok(focused && focused.dataset.id === id);
    rows().forEach((r) => r.listeners.dblclick());
    assert.strictEqual(got.length, 102);
    assert.strictEqual(new Set(got).size, 102);
    assert.strictEqual([...got].sort().join(','), Array.from(c.presets, (p) => p.id).sort().join(','));
  } finally { delete FakeNode.prototype.focus; ui.dialogs.close(); }
});

test('ユーザーライブラリ: コアエディタの[ライブラリに登録][JSON 書き出し]は入力エラー時に拒否し、部品ライブラリの自作コア節が描画・操作できる(DOM スタブ)', () => {
  const ctx = loadAll(stubDoc());
  const { makeContext } = ctx.SDS.model.evaluate; const BL = ctx.SDS.model.blocklib; const ui = ctx.SDS.ui; const UC = ctx.SDS.model.usercores;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  const def = ui.coreform.cloneInfo(BL.get(parts, 'core:amd-zen1-1800x:P'), c.uarch, ctx.SDS_DATA.blocklibAreas).def;
  const calls = [];
  ui.coreeditor.openCoreEditor({ def, nodes: c.nodes, toNodeId: 'gf-14', evalCtx: { cal: c.cal, uarch: c.uarch, presets: c.presets, nodes: c.nodes } },
    { onAdd() { return { ok: true }; }, onRegister(d) { calls.push(['reg', d]); return { ok: true, message: '登録しました' }; }, onExport(d) { calls.push(['exp', d]); return { ok: false, reason: '書き出し失敗' }; } });
  const byId = (id) => findAll(body, (n) => n.attrs && n.attrs.id === id)[0];
  const btn = (label) => findAll(body, (n) => n.tag === 'button' && n.textContent === label)[0];
  const rob = byId('ce-rob');
  rob.value = '5'; rob.listeners.input({ target: rob });
  btn('ライブラリに登録').listeners.click(); btn('JSON 書き出し').listeners.click();
  assert.strictEqual(calls.length, 0); assert.ok(body.textContent.includes('入力にエラーがあります'));   // 入力エラー時は拒否
  rob.value = '300'; rob.listeners.input({ target: rob });
  btn('ライブラリに登録').listeners.click();
  assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0][1].params.rob, 300); assert.ok(body.textContent.includes('登録しました'));
  btn('JSON 書き出し').listeners.click();
  assert.strictEqual(calls.length, 2); assert.ok(body.textContent.includes('書き出し失敗'));
  ui.dialogs.close();
  // 部品ライブラリの自作コア節
  const st = { m: {}, getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = v; } };
  assert.ok(UC.add(st, def).ok);
  const used = []; const dels = []; const imps = [];
  const d0 = ctx.SDS.model.design.fromScratch({ name: 't', widthMm: 40, heightMm: 40, nodeId: 'gf-14', entry: 'new' });
  const lib = new FakeNode('div');
  const cb = () => ({ onAdd() {}, onUseUser(e, n) { used.push([e, n]); }, onDeleteUser(e) { dels.push(e); }, onExportUser() {}, onImportUser(t) { imps.push(t); }, userCores: UC.list(st) });
  ui.library.renderLibrary(lib, d0, parts, cb(), '', c.nodes, { uarch: c.uarch, areas: ctx.SDS_DATA.blocklibAreas });
  assert.ok(lib.textContent.includes('ユーザーライブラリの自作コア(1 件)') && lib.textContent.includes('設計に追加') && lib.textContent.includes('JSON 取り込み'));
  findAll(lib, (n) => n.tag === 'button' && n.textContent === '設計に追加')[0].listeners.click();
  assert.strictEqual(used.length, 1); assert.strictEqual(used[0][1], 1);
  findAll(lib, (n) => n.tag === 'button' && n.textContent === '削除')[0].listeners.click();   // 確認ダイアログ(dialogs)。window.confirm は使わない
  assert.strictEqual(dels.length, 0); assert.ok(body.textContent.includes('削除します'));
  findAll(body, (n) => n.tag === 'button' && n.textContent === 'やめる')[0].listeners.click();
  assert.strictEqual(dels.length, 0);
  findAll(lib, (n) => n.tag === 'button' && n.textContent === '削除')[0].listeners.click();
  findAll(body, (n) => n.tag === 'button' && n.textContent === '削除する')[0].listeners.click();
  assert.strictEqual(dels.length, 1);
  // localStorage が使えないとき: 理由と「JSON 書き出しのみ可」を出し、取り込みは無効
  const lib2 = new FakeNode('div');
  ui.library.renderLibrary(lib2, d0, parts, Object.assign(cb(), { userCores: UC.list(null) }), '', c.nodes, { uarch: c.uarch, areas: ctx.SDS_DATA.blocklibAreas });
  assert.ok(lib2.textContent.includes('JSON 書き出しのみ可'));
  assert.strictEqual(findAll(lib2, (n) => n.attrs && n.attrs.id === 'lib-user-file')[0].disabled, true);
});

test('設定ダイアログ: ボタンが有効で、undo/redo が既存関数を呼び、disabled が履歴に追従し、プリセット導線が呼ばれる(DOM スタブ)', () => {
  assert.ok(/<button[^>]*id="m-settings"(?![^>]*disabled)[^>]*>設定<\/button>/.test(html), '設定ボタンが有効でない');
  assert.ok(!html.includes('設定(未実装)'));
  const ctx = loadAll(stubDoc());
  const ui = ctx.SDS.ui;
  const body = new FakeNode('body');
  ctx.document.body = body; ctx.document.addEventListener = () => {}; ctx.document.removeEventListener = () => {}; ctx.document.activeElement = null;
  FakeNode.prototype.focus = function () { this.focused = true; };
  try {
    const st = { pos: 1, total: 2 }; const calls = [];
    ui.dialogs.openSettings({
      getState: () => ({ canUndo: st.pos > 0, canRedo: st.pos < st.total, pos: st.pos, total: st.total }),
      onUndo() { calls.push('undo'); st.pos--; }, onRedo() { calls.push('redo'); st.pos++; },
      onOpenPresets() { calls.push('presets'); },
    });
    const byId = (id) => findAll(body, (n) => n.attrs && n.attrs.id === id)[0];
    assert.ok(ui.dialogs.isOpen());
    assert.strictEqual(byId('set-undo').disabled, false); assert.strictEqual(byId('set-redo').disabled, false);
    assert.ok(body.textContent.includes('履歴の位置: 1 / 2'));
    byId('set-undo').listeners.click();   // 連続で押せる
    assert.deepStrictEqual(calls, ['undo']);
    assert.strictEqual(byId('set-undo').disabled, true); assert.strictEqual(byId('set-redo').disabled, false);
    assert.ok(body.textContent.includes('履歴の位置: 0 / 2'));
    assert.strictEqual(byId('set-redo').focused, true);   // 無効になったらフォーカスを残りへ
    byId('set-redo').listeners.click(); byId('set-redo').listeners.click();
    assert.deepStrictEqual(calls, ['undo', 'redo', 'redo']);
    assert.strictEqual(byId('set-redo').disabled, true); assert.strictEqual(byId('set-undo').disabled, false);
    byId('set-preset').listeners.click();
    assert.deepStrictEqual(calls, ['undo', 'redo', 'redo', 'presets']);
  } finally { delete FakeNode.prototype.focus; ctx.SDS.ui.dialogs.close(); }
});

// ---- UI 整理: 部品ライブラリの検索・並び・折りたたみ(docs/design/ui-cleanup.md §4.2, §8.2) ----
// 平らにたどる(先に現れる順)
const flat = (n, out) => { out = out || []; out.push(n); (n.children || []).forEach((c) => flat(c, out)); return out; };
const idOf = (n) => (n.attrs && n.attrs.id) || null;
const byIdIn = (root, id) => flat(root).find((n) => idOf(n) === id);
const isMark = (n) => n.tag === 'mark';

function libSetup(withCustom) {
  const ctx = loadAll(stubDoc());
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const BL = ctx.SDS.model.blocklib; const ui = ctx.SDS.ui;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  let d = DS.fromScratch({ name: '検索テスト', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4', entry: 'new' });
  if (withCustom) {
    const ci = ui.coreform.cloneInfo(BL.get(parts, 'core:amd-zen1-1800x:P'), c.uarch, ctx.SDS_DATA.blocklibAreas);
    const def = ui.coreform.assignId(ci.def, []);
    const r = DS.addPart(d, Object.assign({}, ctx.SDS.model.coredef.toPart(def), { sourceChip: ui.coreform.customChip(def) }), { count: 1, nodes: c.nodes });
    assert.ok(r.ok, r.reason); d = r.design;
  }
  const env = { uarch: c.uarch, areas: ctx.SDS_DATA.blocklibAreas };
  const render = (el, msg, design) => ui.library.renderLibrary(el, design || d, parts, { onAdd() {}, onClone() {}, onEditDef() {}, onUseUser() {}, onImportUser() {}, userCores: { ok: true, cores: [] } }, msg || '', c.nodes, env);
  return { ctx, ui, c, parts, d, render, evaluate, DS, BL };
}
const typeText = (lib, v) => { byIdIn(lib, 'lib-search').listeners.input({ target: { value: v } }); };
const listItems = (lib) => byIdIn(lib, 'lib-list').children;

test('部品ライブラリの並び: 検索欄・件数・メッセージが一覧より前、ユーザーライブラリの見出しより検索欄が前(R5)', () => {
  const { render, ctx } = libSetup(true);
  const lib = new FakeNode('div');
  render(lib, '理由テスト');
  const all = flat(lib);
  const pos = (pred) => all.findIndex(pred);
  const iSearch = pos((n) => idOf(n) === 'lib-search'); const iList = pos((n) => idOf(n) === 'lib-list');
  const iCount = pos((n) => idOf(n) === 'lib-count'); const iMsg = pos((n) => idOf(n) === 'lib-msg');
  const iUser = pos((n) => n.tag === 'summary' && n.textContent.includes('ユーザーライブラリの自作コア'));
  assert.ok(iSearch >= 0 && iList >= 0 && iSearch < iList && iCount > iSearch && iCount < iList && iMsg > iCount && iMsg < iList);
  assert.ok(iUser > iSearch && iUser < iList);
  assert.ok(byIdIn(lib, 'lib-msg').textContent.includes('理由テスト'));
  // 折りたたみ: 自作コア・ユーザーライブラリの 2 つ(使い方を除く)は既定で閉じている
  const boxes = all.filter((n) => n.tag === 'details' && n.className.includes('lib-custom'));
  assert.strictEqual(boxes.length, 2);
  assert.ok(boxes.every((b) => !('open' in b.attrs)));
  assert.ok(ctx.SDS.ui.dom.more);
});

test('部品ライブラリの a11y 属性(R14)', () => {
  const { render } = libSetup(false);
  const lib = new FakeNode('div'); render(lib);
  const s = byIdIn(lib, 'lib-search');
  assert.strictEqual(s.attrs.type, 'search'); assert.strictEqual(s.attrs['aria-controls'], 'lib-list');
  assert.strictEqual(byIdIn(lib, 'lib-count').attrs.role, 'status');
  assert.ok(byIdIn(lib, 'lib-clear').attrs['aria-label']);
  assert.ok(flat(lib).some((n) => n.attrs && n.attrs.role === 'search'));
});

test('部品ライブラリの検索: 絞り込み・ハイライト・件数・クリア・Esc・0 件・さらに表示・状態保持(R7)', () => {
  const { render, parts, ui } = libSetup(false);
  const MF = ui.mixform;
  let lib = new FakeNode('div'); render(lib);
  // 全件: 先頭 60 件、「さらに表示」で 120
  assert.strictEqual(listItems(lib).length, 60);
  assert.ok(byIdIn(lib, 'lib-count').textContent.includes(`全 ${parts.length} 件`));
  assert.ok(byIdIn(lib, 'lib-clear').hidden);
  assert.ok(byIdIn(lib, 'lib-more-btn').listeners.click);
  byIdIn(lib, 'lib-more-btn').listeners.click();
  assert.strictEqual(listItems(lib).length, 120);
  // 絞り込み
  typeText(lib, 'zen 5');
  const want = MF.filterParts(parts, { text: 'zen 5' }).length;
  assert.strictEqual(listItems(lib).length, Math.min(60, want));
  const marks = flat(byIdIn(lib, 'lib-list')).filter(isMark);
  assert.ok(marks.length >= 1 && marks.some((m) => m.textContent.toLowerCase().includes('zen')));
  assert.ok(byIdIn(lib, 'lib-count').textContent.includes('件が該当'));
  assert.ok(!byIdIn(lib, 'lib-clear').hidden);
  // 再描画しても検索語と絞り込みが残る
  const lib2 = new FakeNode('div'); render(lib2);
  assert.strictEqual(byIdIn(lib2, 'lib-search').value, 'zen 5');
  assert.strictEqual(listItems(lib2).length, Math.min(60, want));
  // Esc で消去
  let prevented = false;
  byIdIn(lib2, 'lib-search').listeners.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.ok(prevented && byIdIn(lib2, 'lib-search').value === '' && byIdIn(lib2, 'lib-clear').hidden);
  assert.strictEqual(listItems(lib2).length, 60);
  // 0 件
  typeText(lib2, 'zzzzqqqq');
  assert.strictEqual(listItems(lib2).length, 0);
  assert.ok(byIdIn(lib2, 'lib-empty').textContent.includes('一致する部品はありません'));
  assert.ok(byIdIn(lib2, 'lib-count').textContent.includes('0 件が該当'));
  const clr = flat(byIdIn(lib2, 'lib-empty')).find((n) => n.tag === 'button' && n.textContent === '条件をすべてクリア');
  assert.ok(clr); clr.listeners.click();
  assert.strictEqual(listItems(lib2).length, 60);
  assert.strictEqual(byIdIn(lib2, 'lib-search').value, '');
  lib = null;
});

test('部品ライブラリ: 追加できない部品は 1 行の短文、「追加できるものだけ」で隠し件数を出す(R6)', () => {
  const { render, ctx, ui, c, parts, BL, DS } = libSetup(false);
  let d = DS.fromScratch({ name: 'x86', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4' });
  const r = DS.addPart(d, BL.get(parts, 'core:amd-zen5-9700x:P'), { count: 1, nodes: c.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  const lib = new FakeNode('div'); render(lib, '', d);
  // Arm のコアに絞る → 全行が追加不可
  byIdIn(lib, 'lib-search').listeners.input({ target: { value: 'arm コア' } });
  const items = listItems(lib).filter((li) => li.className.includes('lib-item'));
  const blocked = items.filter((li) => li.className.includes('blocked'));
  assert.ok(blocked.length > 0);
  assert.ok(blocked[0].textContent.includes('命令セットが違うため追加不可'));
  assert.ok(!lib.textContent.includes('x86 と Arm のコアは同じ設計に混在できません'));
  byIdIn(lib, 'lib-addable').listeners.change({ target: { checked: true } });
  assert.ok(listItems(lib).every((li) => !li.className.includes('blocked')));
  assert.ok(byIdIn(lib, 'lib-count').textContent.includes('追加できない'));
  assert.ok(ctx && ui);
});

test('index.html: 左欄タブ・仕切り・layout.js の読み込み順・a11y 属性(R4, R5, R14)', () => {
  assert.ok(html.includes('role="tablist"') && (html.match(/role="tab"/g) || []).length === 2 && html.includes('aria-controls="library"') && html.includes('aria-controls="mixpanel"'));
  assert.ok(/id="parts-resizer"[^>]*role="separator"/.test(html) && html.includes('aria-valuemin="220"') && html.includes('aria-valuemax="480"') && /id="parts-resizer"[^>]*tabindex="0"/.test(html));
  const order = (f) => srcs.indexOf(f);
  assert.ok(order('js/ui/layout.js') > order('js/ui/panels.js') && order('js/ui/layout.js') < order('js/main.js'));
  assert.ok(!html.includes('partslist') && !html.includes('M2 では部品の追加はできません'));
});
