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
  ['reproduce', 'results', 'paramform', 'packageform', 'packagepanel', 'heatdata', 'presetlist', 'diffpanel', 'mixform', 'library', 'mixpanel', 'coreform', 'coreeditor'].forEach((m) => assert.ok(ui && ui[m], `SDS.ui.${m} が登録されていない`));
  ['perf', 'power', 'thermal', 'area', 'heatmap'].forEach((m) => assert.ok(ctx.SDS.sim[m], `SDS.sim.${m} が登録されていない`));
  ['design', 'evaluate', 'diff', 'blocklib', 'compat', 'coredef'].forEach((m) => assert.ok(ctx.SDS.model[m], `SDS.model.${m} が登録されていない`));
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

// ---- プリセット一覧(グループ化) ----
test('プリセット一覧: 95 行・27 見出し・初期は全て閉じる・見出しで開閉してフォーカスを保つ・行の文字に n=null 等が出ない・dblclick で全件が重複なく渡る(DOM スタブ)', () => {
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
    assert.strictEqual(c.presets.length, 95);
    assert.strictEqual(rows().length, 95);
    assert.strictEqual(heads().length, 27);
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
    assert.strictEqual(got.length, 95);
    assert.strictEqual(new Set(got).size, 95);
    assert.strictEqual([...got].sort().join(','), Array.from(c.presets, (p) => p.id).sort().join(','));
  } finally { delete FakeNode.prototype.focus; ui.dialogs.close(); }
});
