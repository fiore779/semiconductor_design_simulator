'use strict';
// 左欄の幅の純関数(js/ui/layout.js)。docs/design/ui-cleanup.md §4.6。
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/ui/layout.js');

test('clampPartsWidth: 下限・上限・ウィンドウ幅の 40%・数でない入力・丸め', () => {
  assert.strictEqual(L.clampPartsWidth(100, 1920), 220);
  assert.strictEqual(L.clampPartsWidth(9999, 1920), 480);
  assert.strictEqual(L.clampPartsWidth(400, 1000), 400);
  assert.strictEqual(L.clampPartsWidth(450, 1000), 400); // 1000 * 0.4
  assert.strictEqual(L.clampPartsWidth(300), 300);
  for (const bad of [NaN, '300', undefined, null, Infinity]) assert.strictEqual(L.clampPartsWidth(bad, 1920), L.PARTS_DEFAULT);
  assert.strictEqual(L.clampPartsWidth(300.6, 1920), 301);
  assert.strictEqual(L.clampPartsWidth(300, 'x'), 300);
});

test('parseStoredWidth: 220〜480 の 3 桁の数字だけ', () => {
  assert.strictEqual(L.parseStoredWidth('300'), 300);
  assert.strictEqual(L.parseStoredWidth('220'), 220);
  assert.strictEqual(L.parseStoredWidth('480'), 480);
  for (const bad of ['219', '481', 'abc', '', null, undefined, '3000', ' 300', 300]) assert.strictEqual(L.parseStoredWidth(bad), null, String(bad));
});

test('stepWidth: 矢印 ±16(Shift で ±48)・Home は既定・上下限で止まる・他のキーは変えない', () => {
  assert.strictEqual(L.stepWidth(300, 'ArrowRight', false, 1920), 316);
  assert.strictEqual(L.stepWidth(300, 'ArrowRight', true, 1920), 348);
  assert.strictEqual(L.stepWidth(300, 'ArrowLeft', false, 1920), 284);
  assert.strictEqual(L.stepWidth(300, 'ArrowLeft', true, 1920), 252);
  assert.strictEqual(L.stepWidth(400, 'Home', false, 1920), 300);
  assert.strictEqual(L.stepWidth(475, 'ArrowRight', true, 1920), 480);
  assert.strictEqual(L.stepWidth(225, 'ArrowLeft', true, 1920), 220);
  assert.strictEqual(L.stepWidth(300, 'a', false, 1920), 300);
  assert.strictEqual(L.stepWidth(390, 'ArrowRight', true, 1000), 400);
});
