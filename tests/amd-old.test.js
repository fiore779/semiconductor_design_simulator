'use strict';
// AMD の Ryzen より前のプリセット 13 件(2026-11-19 追加。data/presets/chips-old-amd.js。docs/research/amd-pre-ryzen-2026-11-19.md)
const test = require('node:test');
const assert = require('node:assert');
const { D, gb7ByName } = require('./helpers.js');

const olds = D.presets.filter((p) => p.addedIn === 'old-amd');

test('AMD 旧世代: 13 件・id 重複なし・世代ごとに別の family(FX-8350 と FX-6300 は同じ family)', () => {
  assert.strictEqual(olds.length, 13);
  assert.strictEqual(new Set(olds.map((p) => p.id)).size, 13);
  const fams = olds.map((p) => p.family);
  assert.strictEqual(new Set(fams).size, 12);
  assert.strictEqual(olds.filter((p) => p.family === 'Piledriver (Vishera)').length, 2);
  olds.forEach((p) => { assert.strictEqual(p.vendor, 'AMD'); assert.strictEqual(p.isa, 'x86'); assert.strictEqual(p.calib, false); assert.ok(p.year >= 2001 && p.year <= 2012); });
});

test('AMD 旧世代: 蓋なし(ダイがむき出しの K7 と BGA の Bobcat)だけ noLid。L3 のない SKU は l3MB が 0', () => {
  assert.deepStrictEqual(olds.filter((p) => p.noLid).map((p) => p.id).sort(), ['amd-bobcat-e350', 'amd-k7-athlon-1400', 'amd-k7-xp-3200']);
  ['amd-k7-athlon-1400', 'amd-k7-xp-3200', 'amd-k8-venice-3200', 'amd-k8-brisbane-5000', 'amd-k10-propus-x4-640', 'amd-pd-a10-5800k', 'amd-bobcat-e350'].forEach((id) => assert.strictEqual(olds.find((p) => p.id === id).cfg.l3MB, 0, id));
  assert.strictEqual(olds.find((p) => p.id === 'amd-k10-deneb-955').cfg.l3MB, 6);
  assert.strictEqual(olds.find((p) => p.id === 'amd-pd-fx8350').cfg.l3MB, 8);
});

test('AMD 旧世代: GB7 の行は 設計書 §2.4 の値([実測])と一致し、標本の少ない行・信頼できない行は採らない(gb7: null)', () => {
  const want = { 'amd-pd-fx8350': [577, 2617], 'amd-pd-fx6300': [549, 1848], 'amd-pd-a10-5800k': [517, 1359], 'amd-bd-fx8150': [596, 2574], 'amd-k10-thuban-1090t': [438, 1665], 'amd-k10-deneb-955': [396, 1172], 'amd-k10-agena-9950': [318, 955] };
  Object.entries(want).forEach(([id, [s, m]]) => {
    const g = gb7ByName[olds.find((p) => p.id === id).gb7]; assert.ok(g, id); assert.strictEqual(g.single, s, id); assert.strictEqual(g.multi, m, id); assert.strictEqual(g.kind, '実測', id); assert.ok(g.n >= 2, id);
  });
  // K7・K8(32bit のみ、または標本がオーバークロック品)・Propus(ST が不自然)・E-350(MT がシングルより低い)は公開値なし
  ['amd-k7-athlon-1400', 'amd-k7-xp-3200', 'amd-k8-venice-3200', 'amd-k8-brisbane-5000', 'amd-k10-propus-x4-640', 'amd-bobcat-e350'].forEach((id) => assert.strictEqual(olds.find((p) => p.id === id).gb7, null, id));
});

test('AMD 旧世代: 補正 u は K10・Bulldozer・Piledriver だけ(標本の SKU 数 3・1・3)。ST は標本の SKU でほぼ一致し(学習内)、Bulldozer 系の MT は高めに出る(再現度の限界を明記)', () => {
  const U = D.uarch;
  assert.deepStrictEqual(['K10', 'Bulldozer', 'Piledriver'].map((k) => [U[k].uCal.u, U[k].uCal.n]), [[79.3, 3], [85.6, 1], [81.8, 3]]);
  ['Thunderbird', 'Barton', 'K8', 'Bobcat'].forEach((k) => assert.strictEqual(U[k].uCal, null, k));
  assert.ok(/MT が \+18〜30% 高く出る/.test(U.Bulldozer.note));
  const design = require('../js/model/design.js'); const E = require('../js/model/evaluate.js'); const ctx = E.makeContext();
  ['amd-k10-deneb-955', 'amd-k10-thuban-1090t', 'amd-bd-fx8150', 'amd-pd-fx8350'].forEach((id) => {
    const p = olds.find((x) => x.id === id); const r = E.evaluate(design.fromPreset(p, { mode: 'reproduce' }), ctx); const g = gb7ByName[p.gb7];
    assert.ok(Math.abs(r.st.score / g.single - 1) < 0.02, id + ' の ST');
  });
});

test('AMD 旧世代: 構成の整合(コア数 × クロック。FX は整数コア 8・6・4 個。全コアクロックは Wikipedia の全コア負荷値)', () => {
  const c = (id) => olds.find((p) => p.id === id).cfg.cores[0];
  assert.deepStrictEqual([c('amd-bd-fx8150').count, c('amd-pd-fx8350').count, c('amd-pd-fx6300').count, c('amd-pd-a10-5800k').count], [8, 8, 6, 4]);
  assert.deepStrictEqual([c('amd-bd-fx8150').allCoreGHz, c('amd-pd-fx8350').allCoreGHz, c('amd-pd-fx6300').allCoreGHz], [3.9, 4.1, 3.8]);
  assert.strictEqual(c('amd-k10-thuban-1090t').boostGHz, 3.6);
  olds.forEach((p) => { const g = p.cfg.cores[0]; assert.ok(g.baseGHz > 0 && g.boostGHz >= g.baseGHz && D.uarch[g.uarch], p.id); assert.ok(p.dies[0].mm2 > 50 && D.nodes.some((n) => n.id === p.dies[0].nodeId), p.id); });
});
