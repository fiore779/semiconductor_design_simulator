'use strict';
// プリセット一覧の並び(世代順)と、世代の歴史(data/history.js)。2026-11-18
const test = require('node:test');
const assert = require('node:assert');

test('一覧の初期の並び: Intel・AMD は世代順(新しい世代が上)。Meteor Lake は Raptor Lake-HX Refresh の上、Raptor Lake-HX Refresh は Raptor Lake Refresh の上(2026-11-19 に HX Refresh を Meteor Lake の下へ直した)', () => {
  const { D } = require('./helpers.js');
  const PL = require('../js/ui/presetlist.js');
  const g = PL.groupByFamily(D.presets);
  const names = (v) => g.filter((x) => x.vendor === v).map((x) => x.family);
  const intel = names('Intel');
  const before = (a, b) => assert.ok(intel.indexOf(a) < intel.indexOf(b), `${a} は ${b} より上`);
  before('Meteor Lake', 'Raptor Lake-HX Refresh'); before('Raptor Lake-HX Refresh', 'Raptor Lake Refresh'); before('Raptor Lake Refresh', 'Raptor Lake-HX'); before('Raptor Lake-HX', 'Raptor Lake');
  before('Lunar Lake', 'Meteor Lake'); before('Arrow Lake-S', 'Lunar Lake'); before('Nehalem', 'Wolfdale'); before('Wolfdale', 'Yorkfield'); before('Yorkfield', 'Kentsfield');
  assert.strictEqual(intel[intel.length - 1], 'Katmai'); assert.strictEqual(intel[0], 'Wildcat Lake');
  const amd = names('AMD'); assert.strictEqual(amd[amd.length - 1], 'Zen 1 (Summit Ridge)'); assert.ok(amd.indexOf('Zen 4 (Raphael)') > amd.indexOf('Zen 3+ (Rembrandt-R)'), 'Raphael(2022-09)は Rembrandt-R(2023)の下');
});

test('世代の歴史: Intel・AMD のすべての family に概説と出典があり、順序表にもある。historyOf は無い family で null(2026-11-18)', () => {
  const { D } = require('./helpers.js');
  const PL = require('../js/ui/presetlist.js');
  const H = D.history; assert.ok(H && H.overall.length >= 10 && H.sources);
  const ord = new Set([].concat(...Object.values(H.order)));
  D.presets.filter((p) => p.vendor === 'Intel' || p.vendor === 'AMD').forEach((p) => {
    const h = PL.historyOf(p.vendor, p.family);
    assert.ok(h && h.text.length > 10 && h.source.includes('[二次]'), `${p.vendor}/${p.family}: 歴史と出典`);
    assert.ok(ord.has(p.family), `${p.family}: 世代順の表`);
  });
  assert.strictEqual(PL.historyOf('Intel', '存在しない世代'), null);
  H.overall.forEach((e) => assert.ok(Number.isInteger(e.year) && H.sources[e.src] && e.text.length > 5));
  for (let i = 1; i < H.overall.length; i++) assert.ok(H.overall[i].year >= H.overall[i - 1].year, '年表は年の順');
});

test('ツールバー: 「歴史」ボタンがあり、言語ボタン(m-lang)は無い(切り替えは設定ダイアログの set-lang。2026-11-18)', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(/<button[^>]*id="m-history"[^>]*>歴史<\/button>/.test(html));
  assert.ok(!/id="m-lang"/.test(html));
  const dlg = require('fs').readFileSync(require('path').join(__dirname, '..', 'js/ui/presetdialog.js'), 'utf8');
  assert.ok(/id: 'set-lang'/.test(dlg) && /openHistory/.test(dlg));
  assert.ok(/\$\('m-history'\)/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'js/main.js'), 'utf8')));
});

test('歴史の教材: 全 family に「学べること」、時代区分に属し、キーワードは用語集にある。課題に出すチップ名と数値はデータと一致する(2026-11-18)', () => {
  const { D, gb7ByName } = require('./helpers.js');
  const PL = require('../js/ui/presetlist.js');
  const E = D.historyEdu; assert.ok(E && E.intro.paras.length >= 2 && E.eras.length >= 4 && E.glossary.length >= 10 && E.exercises.length >= 5);
  const terms = new Set(E.glossary.map((g) => g[0]));
  const inEra = new Set([].concat(...E.eras.map((e) => e.families)));
  E.eras.forEach((e) => e.kw.forEach((k) => assert.ok(terms.has(k), `時代区分 ${e.id} のキーワード ${k}`)));
  E.exercises.forEach((x) => x.kw.forEach((k) => assert.ok(terms.has(k), `課題 ${x.title} のキーワード ${k}`)));
  D.presets.filter((p) => p.vendor === 'Intel' || p.vendor === 'AMD').forEach((p) => {
    const h = PL.historyOf(p.vendor, p.family);
    assert.ok(h.learn && h.learn.length > 10 && h.kw.length >= 1, `${p.family}: 学べること`);
    h.kw.forEach((k) => assert.ok(terms.has(k), `${p.family} のキーワード ${k}`));
    assert.ok(inEra.has(p.family), `${p.family}: 時代区分に属す`);
  });
  const byName = (n) => D.presets.find((p) => p.name === n);
  ['Pentium 4 531', 'Core 2 Duo E8400', 'Core i5-3570K', 'Core i7-3770K', 'Ryzen 9 9950X', 'Pentium 4 631', 'Pentium III 1000', 'Pentium M 755', 'Pentium 4 3.0C', 'Core 2 Quad Q9550'].forEach((n) => assert.ok(byName(n), `課題のチップ ${n}`));
  const gb = (n) => gb7ByName[byName(n).gb7];
  assert.strictEqual(gb('Core 2 Duo E8400').single, 444); assert.strictEqual(gb('Pentium 4 531').single, 207);
  assert.strictEqual(gb('Core i5-3570K').multi, 2431); assert.strictEqual(gb('Core i7-3770K').multi, 3036);
  assert.strictEqual(gb('Core 2 Quad Q9550').single, 425); assert.strictEqual(gb('Core 2 Quad Q9550').multi, 1255);
  assert.ok(Math.abs(1255 / 425 - 2.9) < 0.06);
  const d = (n) => byName(n).dies.reduce((t, x) => t + x.mm2, 0); assert.strictEqual(d('Pentium 4 531'), 112); assert.strictEqual(d('Pentium 4 631'), 81);
  assert.strictEqual(byName('Pentium 4 531').cfg.l3MB, 0);
});
