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

// ---- パネルの表示切替(ui-cleanup.md §10)----
const W = require('../js/ui/warnings.js');

test('パネル表示状態: 既定は 結果=隠す・下段=隠す・配置=表示。保存値が無い/壊れているときも既定', () => {
  assert.deepStrictEqual(L.defaultPanels(), { right: false, bottom: false, place: true });
  assert.deepStrictEqual(L.parsePanels(null), L.PANEL_DEFAULTS);
  for (const bad of ['', 'x', '[]', 'null', '123', '{', '{"right":"yes"}']) assert.deepStrictEqual(L.parsePanels(bad), L.PANEL_DEFAULTS, bad);
  L.defaultPanels().right = true; // コピーを返す(定数は変わらない)
  assert.strictEqual(L.PANEL_DEFAULTS.right, false);
});

test('パネル表示状態: 保存→復元の往復、不正なキー・値は無視', () => {
  const s = { right: true, bottom: false, place: false };
  assert.deepStrictEqual(L.parsePanels(L.serializePanels(s)), s);
  assert.deepStrictEqual(L.parsePanels('{"right":true,"bottom":1,"place":null,"zzz":true}'), { right: true, bottom: false, place: true });
  assert.deepStrictEqual(L.parsePanels(L.serializePanels({ right: 'x' })), L.PANEL_DEFAULTS);
});

test('パネル表示状態: togglePanel は 1 つだけ反転。未知のキーは不変。クラス名は隠したものだけ', () => {
  const s = L.defaultPanels();
  assert.deepStrictEqual(L.togglePanel(s, 'right'), { right: true, bottom: false, place: true });
  assert.deepStrictEqual(s, L.PANEL_DEFAULTS); // 元は変えない
  assert.deepStrictEqual(L.togglePanel(s, 'nope'), s);
  assert.deepStrictEqual(L.panelClasses(s), ['hide-right', 'hide-bottom']);
  assert.deepStrictEqual(L.panelClasses({ right: true, bottom: true, place: false }), ['hide-place']);
});

test('バッジの件数: エラー・警告だけ数え(info は数えない)、エラーがあれば level=error', () => {
  const w = (level) => ({ level, text: 't' });
  assert.deepStrictEqual(W.badgeInfo([]), { error: 0, warn: 0, text: '', level: 'none' });
  assert.deepStrictEqual(W.badgeInfo([w('info'), w('info')]), { error: 0, warn: 0, text: '', level: 'none' });
  assert.deepStrictEqual(W.badgeInfo([w('warn'), w('warn')]), { error: 0, warn: 2, text: '⚠ 2', level: 'warn' });
  assert.deepStrictEqual(W.badgeInfo([w('error'), w('warn'), w('warn'), w('info')]), { error: 1, warn: 2, text: '✗ 1 ⚠ 2', level: 'error' });
  assert.strictEqual(W.badgeInfo(null).level, 'none');
});

test('結果の ◆: 常に見せる警告(仮の IPC・クロックの歪み・楽観的)があるときだけ', () => {
  assert.strictEqual(W.resultsFlag(null), false);
  assert.strictEqual(W.resultsFlag({ st: { ok: true }, mt: { ok: true } }), false);
  assert.strictEqual(W.resultsFlag({ st: { ok: false, fallback: true }, mt: { ok: false } }), false);
  assert.strictEqual(W.resultsFlag({ st: { ok: true, fallback: true }, mt: { ok: true } }), true);
  assert.strictEqual(W.resultsFlag({ st: { ok: true }, mt: { ok: true, mixedClock: true } }), true);
  assert.strictEqual(W.resultsFlag({ st: { ok: true }, mt: { ok: true }, optimistic: true }), true);
});

test('エラー通知: 下段を隠している間、エラー件数が増えたときだけ出す(同数の再描画では出さない)', () => {
  assert.strictEqual(W.errorNotice(0, 3, true), 'エラーが 3 件あります。「下段」で表示できます');
  assert.strictEqual(W.errorNotice(3, 3, true), null);
  assert.strictEqual(W.errorNotice(3, 2, true), null);
  assert.strictEqual(W.errorNotice(0, 0, true), null);
  assert.strictEqual(W.errorNotice(0, 3, false), null);
  assert.strictEqual(W.errorNotice(undefined, 1, true), 'エラーが 1 件あります。「下段」で表示できます');
});
