'use strict';
// UI 整理(docs/design/ui-cleanup.md §8.2): more()・結果パネルの折りたたみ・検証パネル・履歴パネル(DOM スタブ)。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);

class FakeNode {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._t = ''; this.className = ''; this.style = {}; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { this.children.splice(this.children.indexOf(c), 1); }
  get firstChild() { return this.children[0] || null; }
  addEventListener(t, fn) { (this.listeners = this.listeners || {})[t] = fn; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  querySelector() { return null; }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  set textContent(v) { this.children = []; this._t = String(v); }
  get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); }
}
class FakeText extends FakeNode { constructor(s) { super('#text'); this._t = s; } }

function load() {
  const ctx = vm.createContext({ Node: FakeNode, document: { createElement: (t) => new FakeNode(t), createTextNode: (s) => new FakeText(s) } });
  ctx.window = ctx;
  for (const s of srcs) {
    if (s === 'js/main.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), ctx, { filename: s });
  }
  return ctx;
}
const flat = (n, out) => { out = out || []; out.push(n); (n.children || []).forEach((c) => flat(c, out)); return out; };
const hasClass = (n, c) => typeof n.className === 'string' && n.className.split(' ').includes(c);
const inside = (n, pred) => { for (let p = n.parentNode; p; p = p.parentNode) if (pred(p)) return true; return false; };
const text = (n) => n.textContent;
const count = (s, sub) => s.split(sub).length - 1;

test('R2 more(): summary を持つ details。key つきは再描画をまたいで開閉を保つ。空なら null', () => {
  const { h, more, moreReset } = load().SDS.ui.dom;
  moreReset();
  const d = more('補足', { key: 'k1' }, h('p', { text: '本文' }));
  assert.strictEqual(d.tag, 'details'); assert.ok(hasClass(d, 'more'));
  assert.strictEqual(d.children[0].tag, 'summary'); assert.strictEqual(d.children[0].textContent, '補足');
  assert.ok(!('open' in d.attrs));
  d.listeners.toggle({ target: { open: true } });                       // 開いた
  assert.ok('open' in more('補足', { key: 'k1' }, h('p', { text: '本文' })).attrs);
  d.listeners.toggle({ target: { open: false } });                      // 閉じた
  assert.ok(!('open' in more('補足', { key: 'k1' }, h('p', { text: '本文' })).attrs));
  d.listeners.toggle({ target: { open: true } });
  moreReset();
  assert.ok(!('open' in more('補足', { key: 'k1' }, h('p', { text: '本文' })).attrs));
  assert.ok('open' in more('x', { open: true }, 'a').attrs);             // key なしは open の指定だけ
  assert.ok(hasClass(more('x', { cls: 'extra' }, 'a'), 'extra'));
  assert.strictEqual(more('空', { key: 'k2' }, null, [null, false, '']), null);
});

function mixSetup(withCustom) {
  const ctx = load();
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const BL = ctx.SDS.model.blocklib; const ui = ctx.SDS.ui;
  const c = makeContext();
  const parts = BL.build(c.presets, ctx.SDS_DATA.blocklibAreas, c.nodes);
  let d = DS.fromScratch({ name: 'c', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4' });
  let r = DS.addPart(d, BL.get(parts, 'core:amd-zen5-9700x:P'), { count: 8, nodes: c.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  r = DS.addPart(d, BL.get(parts, 'l3:amd-zen5-9700x'), { nodes: c.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  r = DS.addPart(d, BL.get(parts, 'core:intel-adl-12900k:P'), { nodes: c.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  if (withCustom) {
    const ci = ui.coreform.cloneInfo(BL.get(parts, 'core:amd-zen1-1800x:P'), c.uarch, ctx.SDS_DATA.blocklibAreas);
    const def = ui.coreform.assignId(ui.coreform.applyField(ci.def, 'rob', '240').def, []);
    r = DS.addPart(d, Object.assign({}, ctx.SDS.model.coredef.toPart(def), { sourceChip: ui.coreform.customChip(def) }), { count: 2, nodes: c.nodes });
    assert.ok(r.ok, r.reason); d = r.design;
  }
  return { ctx, ui, ev: evaluate(d, c), d };
}

test('R9 結果パネル(C): 注意は alertbox 1 つ。赤帯は MT の 1 文だけ。前提・補足は details(件数が一致)', () => {
  const { ui, ev, d } = mixSetup(false);
  const out = new FakeNode('div'); ui.results.renderResults(out, ev, d);
  const all = flat(out);
  const boxes = all.filter((n) => hasClass(n, 'alertbox'));
  assert.strictEqual(boxes.length, 1);
  assert.ok(text(boxes[0]).includes('混合による性能低下は反映していません') && text(boxes[0]).includes('混合設計は校正した範囲の外です'));
  assert.ok(!inside(boxes[0], (p) => p.tag === 'details'));
  assert.ok(ev.mt.ok);
  const banners = all.filter((n) => hasClass(n, 'low-banner'));
  assert.strictEqual(banners.length, 1);
  assert.ok(text(banners[0]).includes('マルチ性能の確度は「低」です'));
  const folds = all.filter((n) => n.tag === 'details' && text(n.children[0]).includes('前提と注意'));
  assert.ok(folds.length >= 2);
  for (const f of folds) {
    const n = Number(/\((\d+) 件\)/.exec(text(f.children[0]))[1]);
    assert.strictEqual(f.children.length - 1, n);
  }
  assert.ok(text(out).includes('全コアが最大クロックで動く前提'));
  assert.strictEqual(count(text(out), 'ブロックの大きさと配置は模式図です'), 1);
});

test('R9 結果パネル(C・自作コアあり): 注意帯 1〜5 も alertbox の中(details の外)', () => {
  const { ui, ev, d } = mixSetup(true);
  const out = new FakeNode('div'); ui.results.renderResults(out, ev, d);
  const boxes = flat(out).filter((n) => hasClass(n, 'alertbox'));
  assert.strictEqual(boxes.length, 1);
  const t = text(boxes[0]);
  ['自作コアの性能は基準コア', '自作コアの面積は範囲です', '電力・温度・最大クロックは出していません', '混合設計の性能は確度:低です', '校正した範囲の外'].forEach((s) => assert.ok(t.includes(s), s));
  assert.ok(!inside(boxes[0], (p) => p.tag === 'details'));
});

test('R3・R9 B の編集後: 重複した「編集後の数値は予測で…」は出ない。NOT_RECOMPUTED は details の外', () => {
  const ctx = load();
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const preset = c.presets.find((p) => p.id === 'amd-zen5-9700x');
  let d = DS.fromPreset(preset, { mode: 'improve' });
  const g = ui.paramform.paramRows(d).cores[0];
  const res = DS.setCoreCount(d, g.type, g.count + 2); assert.ok(res.ok, res.reason); d = res.design;
  const ev = evaluate(d, c);
  assert.ok(ev.edited);
  const r1 = new FakeNode('div'); ui.results.renderResults(r1, ev, d);
  const r2 = new FakeNode('div'); ui.diffpanel.renderDiff(r2, d, c, ev, { onRevert() {}, onRevertAll() {} });
  const dup = '編集後の数値は予測で、公開値ではありません。公開値との差は出しません。';
  assert.strictEqual(count(text(r1) + text(r2), dup), 0);
  assert.ok(text(r1).includes('予測(編集後)'));
  const nr = flat(r2).find((n) => n.tag === 'p' && text(n).includes(ui.paramform.NOT_RECOMPUTED));
  assert.ok(nr && !inside(nr, (p) => p.tag === 'details'));
  assert.ok(flat(r2).some((n) => n.tag === 'details' && text(n.children[0]).includes('注意と前提')));
  assert.ok(text(r2).includes('元のチップの公開値(参考)'));
});

test('偏りの向きの警告は折りたたみの外(常時表示)。折りたたみの件数表示とも矛盾しない (reviewer 指摘)', () => {
  const ctx = load();
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const DS = ctx.SDS.model.design; const ui = ctx.SDS.ui;
  const c = makeContext();
  const outsideFold = (out, s) => {
    const hits = flat(out).filter((n) => (n.tag === 'p' || (n.tag === 'div' && hasClass(n, 'low-banner'))) && text(n).includes(s));
    assert.ok(hits.length >= 1, s);
    assert.ok(hits.every((n) => !inside(n, (p) => p.tag === 'details')), `${s} が details の中にある`);
  };
  const checkCounts = (out) => flat(out).filter((n) => n.tag === 'details' && /(前提と注意|注意と前提)\(\d+ 件\)/.test(text(n.children[0]))).forEach((f) => {
    assert.strictEqual(f.children.length - 1, Number(/\((\d+) 件\)/.exec(text(f.children[0]))[1]));
  });
  // C 混合: MT の IPC・クロックの警告
  const m = mixSetup(false);
  const ev1 = JSON.parse(JSON.stringify(m.ev)); ev1.mt.fallback = true; ev1.mt.mixedClock = true;
  const o1 = new FakeNode('div'); ui.results.renderResults(o1, ev1, m.d);
  outsideFold(o1, 'in-order コアの仮の IPC を含むため信頼できません'); outsideFold(o1, '数値が歪んでいます'); checkCounts(o1);
  // A: 校正に使った代表 SKU
  const dA = DS.fromPreset(c.presets.find((p) => p.id === 'amd-zen5-9700x'), { mode: 'reproduce' });
  const evA = evaluate(dA, c);
  assert.ok(evA.st.isCalibSample);
  const oA = new FakeNode('div'); ui.results.renderResults(oA, evA, dA);
  outsideFold(oA, '校正に使った代表 SKU です'); checkCounts(oA);
  // B: 楽観側の警告(電力制限)
  let dB = DS.fromPreset(c.presets.find((p) => p.id === 'amd-zen5-9700x'), { mode: 'improve' });
  const g = ui.paramform.paramRows(dB).cores[0];
  const rr = DS.setCoreCount(dB, g.type, g.count + 4); assert.ok(rr.ok, rr.reason); dB = rr.design;
  const evB = JSON.parse(JSON.stringify(evaluate(dB, c))); evB.optimistic = true;
  const oB = new FakeNode('div'); ui.results.renderResults(oB, evB, dB);
  outsideFold(oB, ui.paramform.OPTIMISTIC_NOTE); checkCounts(oB);
  const oD = new FakeNode('div'); ui.diffpanel.renderDiff(oD, dB, c, evaluate(dB, c), { onRevert() {}, onRevertAll() {} });
  const DF = ctx.SDS.model.diff;
  if (DF.resultDiff(DF.baseEvaluation(dB, c), evaluate(dB, c)).optimistic) outsideFold(oD, ui.paramform.OPTIMISTIC_NOTE);
  checkCounts(oD);
});

test('R10 検証パネル: info は details の中、error・warn は外。0 件は「問題は見つかりませんでした。」。onPick が呼べる', () => {
  const ui = load().SDS.ui;
  const only = new FakeNode('div');
  ui.panels.renderValidation(only, [{ level: 'info', text: 'a' }, { level: 'info', text: 'b' }, { level: 'info', text: 'c' }], () => {});
  const fold = flat(only).filter((n) => n.tag === 'details');
  assert.strictEqual(fold.length, 1);
  assert.strictEqual(flat(fold[0]).filter((n) => n.tag === 'li').length, 3);
  assert.strictEqual(flat(only).filter((n) => n.tag === 'li' && !inside(n, (p) => p.tag === 'details')).length, 0);
  assert.ok(text(only).includes('✗ 0 / ⚠ 0 / ⓘ 3'));

  const picked = [];
  const mixed = new FakeNode('div');
  ui.panels.renderValidation(mixed, [{ level: 'error', text: 'e', blockId: 'b1' }, { level: 'warn', text: 'w' }, { level: 'info', text: 'i' }], (id) => picked.push(id));
  const outside = flat(mixed).filter((n) => n.tag === 'li' && !inside(n, (p) => p.tag === 'details'));
  assert.deepStrictEqual(outside.map((n) => n.className), ['w-error', 'w-warn']);
  assert.strictEqual(flat(mixed).filter((n) => n.tag === 'li' && inside(n, (p) => p.tag === 'details')).length, 1);
  assert.ok(text(mixed).includes('✗ 1 / ⚠ 1 / ⓘ 1'));
  flat(mixed).find((n) => n.tag === 'button').listeners.click();
  assert.deepStrictEqual(picked, ['b1']);

  const none = new FakeNode('div'); ui.panels.renderValidation(none, [], () => {});
  assert.ok(text(none).includes('問題は見つかりませんでした。') && !flat(none).some((n) => n.tag === 'details'));
});

test('R10 履歴パネル: 元に戻す/やり直すのボタンは無く、履歴の項目から onJump できる', () => {
  const ui = load().SDS.ui;
  const jumps = [];
  const hist = { canUndo: () => true, canRedo: () => true, list: () => [{ index: 0, label: '初期', current: false }, { index: 1, label: '編集', current: true }] };
  const el = new FakeNode('div');
  ui.panels.renderHistory(el, hist, (i) => jumps.push(i), () => {}, () => {});
  assert.ok(!text(el).includes('元に戻す') && !text(el).includes('やり直す'));
  const items = flat(el).filter((n) => n.tag === 'button' && hasClass(n, 'hist-item'));
  assert.strictEqual(items.length, 2);
  items[0].listeners.click();
  assert.deepStrictEqual(jumps, [0]);
});

test('R13 評価不変: 描画関数を呼んでも evaluate の結果は変わらない', () => {
  const { ctx, ui, ev, d } = mixSetup(true);
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const c = makeContext();
  const before = JSON.stringify(ev);
  ui.results.renderResults(new FakeNode('div'), ev, d);
  ui.panels.renderValidation(new FakeNode('div'), ev.warnings, () => {});
  ui.mixpanel.renderMix(new FakeNode('div'), d, ev, { onDieSize() {}, onClock() {} }, {}, c.nodes);
  assert.strictEqual(JSON.stringify(ev), before);
  assert.strictEqual(JSON.stringify(evaluate(d, c)), before);
});
