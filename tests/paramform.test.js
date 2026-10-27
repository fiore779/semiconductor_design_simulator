'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const diff = require('../js/model/diff.js');
const PF = require('../js/ui/paramform.js');
const ctx = E.makeContext();
const P = (id) => D.presets.find((p) => p.id === id);
const improve = (id) => design.fromPreset(P(id || 'amd-zen5-9950x'), { mode: 'improve' });

test('parseCount: 整数のみ・1〜64・全角可・日本語の理由', () => {
  assert.deepStrictEqual(PF.parseCount(' 12 '), { ok: true, value: 12 });
  assert.deepStrictEqual(PF.parseCount('１２'), { ok: true, value: 12 });
  assert.strictEqual(PF.parseCount('').ok, false);
  assert.match(PF.parseCount('abc').reason, /数字/);
  assert.match(PF.parseCount('3.5').reason, /整数/);
  assert.strictEqual(PF.parseCount('3.0').ok, true);
  assert.match(PF.parseCount('0').reason, /1〜64/);
  assert.match(PF.parseCount('65').reason, /1〜64/);
  assert.strictEqual(PF.parseCount('-2').ok, false);
  assert.strictEqual(PF.parseCount('1e2').ok, false);
});

test('parseClock: 0.5〜8.0・GHz 付き可', () => {
  assert.deepStrictEqual(PF.parseClock('5.7'), { ok: true, value: 5.7 });
  assert.deepStrictEqual(PF.parseClock('6 GHz'), { ok: true, value: 6 });
  assert.deepStrictEqual(PF.parseClock('.9'), { ok: true, value: 0.9 });
  assert.match(PF.parseClock('0.4').reason, /0\.5〜8\.0/);
  assert.match(PF.parseClock('8.1').reason, /0\.5〜8\.0/);
  assert.match(PF.parseClock('x').reason, /数字/);
  assert.strictEqual(PF.parseClock('').ok, false);
});

test('parseL3: 0〜512・MB 付き可', () => {
  assert.deepStrictEqual(PF.parseL3('96'), { ok: true, value: 96 });
  assert.deepStrictEqual(PF.parseL3('0'), { ok: true, value: 0 });
  assert.deepStrictEqual(PF.parseL3('32.5MB'), { ok: true, value: 32.5 });
  assert.match(PF.parseL3('513').reason, /0〜512/);
  assert.strictEqual(PF.parseL3('-1').ok, false);
  assert.strictEqual(PF.parseL3('').ok, false);
});

test('入力の検証はモデル側(design.js)の範囲と一致する', () => {
  const d = improve();
  [['1', 1], ['64', 64], ['0', 0], ['65', 65]].forEach(([s, n]) => assert.strictEqual(PF.parseCount(s).ok, design.setCoreCount(d, 'P', n).ok));
  [['0.5', 0.5], ['8', 8], ['0.4', 0.4], ['8.1', 8.1]].forEach(([s, n]) => assert.strictEqual(PF.parseClock(s).ok, design.setClock(d, 'P', n).ok));
  [['0', 0], ['512', 512], ['513', 513]].forEach(([s, n]) => assert.strictEqual(PF.parseL3(s).ok, design.setL3(d, n).ok));
});

test('modeInfo / showDiff / showRepro', () => {
  assert.strictEqual(PF.modeInfo(null), null);
  const a = design.fromPreset(P('amd-zen5-9950x'));
  const ma = PF.modeInfo(a);
  assert.strictEqual(ma.code, 'A'); assert.ok(ma.locked); assert.ok(!ma.editable); assert.ok(ma.symbol && ma.text.includes('再現'));
  assert.ok(!PF.showDiff(a)); assert.ok(PF.showRepro(a));
  const b = improve();
  const mb = PF.modeInfo(b);
  assert.strictEqual(mb.code, 'B'); assert.ok(mb.editable); assert.ok(mb.text.includes('改良'));
  assert.ok(PF.showDiff(b)); assert.ok(!PF.showRepro(b));
  // A でも編集済み(外部要因でずれた)なら差分ビュー、再現度は出さない
  const a2 = design.clone(a); a2.cfg.cores[0].count = 20;
  assert.ok(PF.showDiff(a2)); assert.ok(!PF.showRepro(a2));
  // ロック解除 → B
  const u = design.unlock(a);
  assert.strictEqual(PF.modeInfo(u).code, 'B'); assert.ok(PF.modeInfo(u).editable);
  // cfg なし(古い設計でプリセットなし): 編集不可、差分なし
  const old = design.clone(a); delete old.cfg; delete old.baseCfg;
  assert.ok(!PF.modeInfo(old).editable); assert.ok(!PF.showDiff(old)); assert.strictEqual(PF.paramRows(old), null);
  // ensureCfg で補える
  assert.ok(PF.paramRows(design.ensureCfg(old, P('amd-zen5-9950x'))));
});

test('paramRows: 未取得クロックは null', () => {
  const rows = PF.paramRows(improve());
  assert.strictEqual(rows.cores[0].type, 'P'); assert.strictEqual(rows.cores[0].count, 16); assert.strictEqual(rows.cores[0].clock, 5.7);
  const d = improve(); delete d.cfg.cores[0].boostGHz; delete d.cfg.cores[0].maxGHz; delete d.cfg.cores[0].baseGHz;
  assert.strictEqual(PF.paramRows(d).cores[0].clock, null);
});

test('未取得クロックへの入力: setClock が boostGHz を新設し、ラベルは「未取得→」', () => {
  const d = improve(); const g = d.cfg.cores[0];
  delete g.boostGHz; delete g.maxGHz; delete g.baseGHz;
  d.baseCfg = design.clone(d.cfg);
  const r = design.setClock(d, 'P', PF.parseClock('4.5').value);
  assert.ok(r.ok); assert.strictEqual(r.design.cfg.cores[0].boostGHz, 4.5);
  assert.strictEqual(PF.editLabel('clock', 'P', null, 4.5), 'P クロック 未取得→4.5 GHz');
});

test('editLabel', () => {
  assert.strictEqual(PF.editLabel('count', 'P', 8, 12), 'P コア数 8→12');
  assert.strictEqual(PF.editLabel('clock', 'P', 5.7, 6), 'P クロック 5.7→6 GHz');
  assert.strictEqual(PF.editLabel('l3', null, 64, 96), 'L3 64→96 MB');
});

test('deltaView: ▲▼＝・符号・桁・文字', () => {
  assert.deepStrictEqual(PF.deltaView(12.345), { arrow: '▲', word: '上がる', text: '▲ +12.3% 上がる', cls: 'd-up', better: 'up' });
  assert.strictEqual(PF.deltaView(-3.04).text, '▼ -3.0% 下がる');
  assert.strictEqual(PF.deltaView(-3.04).cls, 'd-down');
  assert.strictEqual(PF.deltaView(0.01).text, '＝ +0.0% ほぼ変わらない');
  assert.strictEqual(PF.deltaView(0).arrow, '＝');
  assert.strictEqual(PF.deltaView(null).text, '—');
  assert.strictEqual(PF.deltaView(NaN).cls, 'd-none');
});

test('paramDiffRows / resultRows: 実データの編集', () => {
  let d = design.setCoreCount(improve(), 'P', 24).design;
  d = design.setClock(d, 'P', 6.0).design;
  const rows = PF.paramDiffRows(diff.paramDiff(d));
  assert.deepStrictEqual(rows[0], { id: 'core:P:count', label: 'P コア数', before: '16 個', after: '24 個' });
  assert.strictEqual(rows[1].before, '5.7 GHz'); assert.strictEqual(rows[1].after, '6 GHz');
  const rd = diff.resultDiff(diff.baseEvaluation(d, ctx), E.evaluate(d, ctx));
  const rr = PF.resultRows(rd);
  assert.deepStrictEqual(rr.map((r) => r.name), ['シングル性能 (ST)', 'マルチ性能 (MT)']);
  assert.strictEqual(rr[0].delta.better, 'up'); assert.ok(/▲/.test(rr[0].delta.text) && /上がる/.test(rr[0].delta.text));
  assert.ok(/^[\d,]+$/.test(rr[0].before) && /^[\d,]+$/.test(rr[1].after));
  assert.strictEqual(rr[0].reason, null);
  assert.strictEqual(PF.verdictHeadline(diff.summary(rd).verdict).symbol, '▲');
});

test('resultRows: 計算できない項目は理由を出す', () => {
  const rd = { st: { ok: false, before: null, after: null, deltaPct: null, reason: 'ST の差を計算できません(元: 理由)' }, mt: { ok: true, before: 100, after: 90, deltaPct: -10, better: 'down' } };
  const rr = PF.resultRows(rd);
  assert.strictEqual(rr[0].delta.text, '—'); assert.match(rr[0].reason, /計算できません/); assert.strictEqual(rr[0].before, '—');
  assert.strictEqual(rr[1].delta.text, '▼ -10.0% 下がる');
});

test('verdictHeadline: 全種類が記号+文字', () => {
  ['up', 'down', 'mixed', 'same', 'unknown', 'zzz'].forEach((v) => { const h = PF.verdictHeadline(v); assert.ok(h.symbol && h.text && h.line.startsWith(h.symbol)); });
});

test('文言: 再計算しないものを明記', () => {
  assert.match(PF.NOT_RECOMPUTED, /面積/); assert.match(PF.NOT_RECOMPUTED, /公表電力/); assert.match(PF.NOT_RECOMPUTED, /歩留まり/); assert.match(PF.NOT_RECOMPUTED, /コア別面積が未取得/);
});
