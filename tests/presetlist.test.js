'use strict';
// プリセット一覧の並び(世代順)と、世代の歴史(data/history.js)。2026-11-18
const test = require('node:test');
const assert = require('node:assert');

test('一覧の初期の並び: Intel・AMD は世代順(新しい世代が上)。Meteor Lake は Raptor Lake Refresh の上、Raptor Lake-HX Refresh は Meteor Lake の上(2026-11-18)', () => {
  const { D } = require('./helpers.js');
  const PL = require('../js/ui/presetlist.js');
  const g = PL.groupByFamily(D.presets);
  const names = (v) => g.filter((x) => x.vendor === v).map((x) => x.family);
  const intel = names('Intel');
  const before = (a, b) => assert.ok(intel.indexOf(a) < intel.indexOf(b), `${a} は ${b} より上`);
  before('Raptor Lake-HX Refresh', 'Meteor Lake'); before('Meteor Lake', 'Raptor Lake Refresh'); before('Raptor Lake Refresh', 'Raptor Lake-HX'); before('Raptor Lake-HX', 'Raptor Lake');
  before('Lunar Lake', 'Raptor Lake-HX Refresh'); before('Arrow Lake-S', 'Lunar Lake'); before('Nehalem', 'Wolfdale'); before('Wolfdale', 'Yorkfield'); before('Yorkfield', 'Kentsfield');
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
