'use strict';
// 英語表示の辞書(js/i18n)。Node でも読み込め、全文一致・${n} の型・断片置換が働くことを確かめる。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function load() {
  const ctx = vm.createContext({}); ctx.window = ctx;
  ['i18n', 'en-shell', 'en-ui1', 'en-ui2', 'en-ui3', 'en-render', 'en-model', 'en-floorplan', 'en-gpu'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n', f + '.js'), 'utf8'), ctx, { filename: f }));
  return ctx.I18N;
}

test('既定は日本語で、t() は何も変えない', () => {
  const I = load();
  assert.strictEqual(I.getLang(), 'ja');
  assert.strictEqual(I.t('比較'), '比較');
});
test('tr(): 全文一致・${n} の型・断片置換', () => {
  const I = load();
  assert.strictEqual(I.tr('比較'), 'Compare');
  assert.strictEqual(I.tr('  比較 '), '  Compare ');
  assert.strictEqual(I.tr('設計: 比較'), 'Design: Compare'); // ${1} の中も訳す
  assert.strictEqual(I.tr('「Ryzen 7 9800X3D」を再現モードで読み込みました。'), 'Loaded "Ryzen 7 9800X3D" in Reproduce mode.');
  assert.strictEqual(I.tr('Zen 5 コア'), 'Zen 5 cores'); // 型 ${1} コア
  assert.strictEqual(I.tr('English only'), 'English only');
});
test('辞書: V-Cache ダイは「ベースダイ」と書かない', () => {
  const I = load();
  assert.strictEqual(I.tr('V-Cache ダイ(CCD の下)'), 'V-Cache die (under the CCD)');
  const src = fs.readFileSync(path.join(root, 'js/model/floorplan.js'), 'utf8');
  assert.ok(!/label: 'ベースダイ/.test(src));
});
test('辞書の ${n} は日本語側と英語側で同じ番号の組', () => {
  const src = ['en-shell', 'en-ui1', 'en-ui2', 'en-ui3', 'en-render', 'en-model', 'en-floorplan', 'en-gpu'].map((f) => fs.readFileSync(path.join(root, 'js/i18n', f + '.js'), 'utf8')).join('\n');
  const I = load(); void I;
  const ctx = vm.createContext({}); ctx.window = ctx; const seen = {};
  ctx.I18N = { add: (o) => Object.assign(seen, o) };
  ['en-shell', 'en-ui1', 'en-ui2', 'en-ui3', 'en-render', 'en-model', 'en-floorplan', 'en-gpu'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n', f + '.js'), 'utf8'), ctx));
  const bad = Object.keys(seen).filter((ja) => { const a = new Set((ja.match(/\$\{\d+\}/g) || [])); const b = (seen[ja].match(/\$\{\d+\}/g) || []); return b.some((x) => !a.has(x)); });
  assert.deepStrictEqual(bad, []);
  assert.ok(src.length > 1000);
});
