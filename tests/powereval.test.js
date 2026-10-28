'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const ctx = E.makeContext();
const pre = (id) => D.presets.find((p) => p.id === id);
const mk = (id, mode) => design.fromPreset(pre(id), { mode });
const ev = (d) => E.evaluate(d, ctx);

test('base 未取得(5800X): powerModel.ok:false、thermal も ok:false', () => {
  const r = ev(mk('amd-zen3-5800x'));
  assert.strictEqual(r.powerModel.ok, false);
  assert.ok(r.powerModel.reason);
  assert.strictEqual(r.powerModel.confidence, 'low');
  assert.strictEqual(r.thermal.ok, false);
  assert.strictEqual(r.thermal.tentative, true);
});

test('校正できる(9700X): estW が出て確度 low、A のままでも出る', () => {
  const r = ev(mk('amd-zen5-9700x', 'reproduce'));
  assert.ok(r.powerModel.ok); assert.ok(r.powerModel.estW > 0);
  assert.strictEqual(r.powerModel.confidence, 'low');
  assert.ok(r.powerModel.notes.length);
  assert.ok(r.thermal.ok); assert.strictEqual(r.thermal.tentative, true);
  assert.ok(r.thermal.notes.some((n) => /仮置き/.test(n)));
  assert.ok(r.warnings.some((w) => /確度:低/.test(w.text)));
  assert.strictEqual(r.powerModel.deltaPct, undefined);
});

test('12900K: 公表ピークとの差 errPct が出る', () => {
  const r = ev(mk('intel-adl-12900k'));
  const v = r.powerModel.vsPublishedPeak;
  assert.ok(v && v.publishedW > 0 && typeof v.errPct === 'number');
  assert.strictEqual('ok' in v, false);
});

test('編集(クロック↑): baseEstW と deltaPct>0', () => {
  const d = mk('amd-zen5-9700x', 'improve');
  const g = d.cfg.cores[0];
  const r = ev(design.setClock(d, g.type, (g.boostGHz || g.maxGHz) * 1.1).design);
  assert.ok(r.powerModel.deltaPct > 0);
  assert.ok(r.powerModel.baseEstW > 0);
});

test('冷却を弱めると Tj が上がる(または limitedBy が変わる)', () => {
  const d = mk('amd-zen5-9700x');
  const a = ev(d).thermal;
  const b = ev(design.setCooling(d, 'passive-phone').design).thermal;
  assert.ok(a.ok && b.ok);
  assert.ok(b.rTotal > a.rTotal);
  assert.ok(b.limitedBy !== a.limitedBy || (b.tjC != null && a.tjC != null && b.tjC > a.tjC) || b.throttled);
});

test('持続クロックが下がるとき throttled と警告', () => {
  const r = ev(design.setPowerLimit(mk('amd-zen5-9700x'), 20).design);
  assert.strictEqual(r.throttled, true);
  assert.ok(r.warnings.some((w) => /持続クロックが下がる/.test(w.text)));
  assert.strictEqual(r.thermal.limitedBy, 'power');
});

test('編集後は公表ピークとの差を出さない(vsPublishedPeak:null と理由)。未編集では出る', () => {
  const d = mk('intel-adl-12900k', 'improve');
  assert.ok(ev(d).powerModel.vsPublishedPeak);
  const g = d.cfg.cores[0];
  const r = ev(design.setClock(d, g.type, (g.boostGHz || g.maxGHz) * 1.05).design);
  assert.strictEqual(r.edited, true);
  assert.strictEqual(r.powerModel.vsPublishedPeak, null);
  assert.strictEqual(r.powerModel.vsPublishedPeakReason, '編集後のため公表値とは比べない');
  assert.ok(typeof r.powerModel.deltaPct === 'number'); // 元の構成に対する相対変化は残る
});

test('熱暴走(9700X + パッシブ冷却): limitedBy runaway、tjC null。UI の判定は持続値を出さない', () => {
  const PK = require('../js/ui/packageform.js');
  const th = ev(design.setCooling(mk('amd-zen5-9700x'), 'passive-phone').design).thermal;
  assert.strictEqual(th.limitedBy, 'runaway'); assert.strictEqual(th.tjC, null); assert.ok(th.tjLastC > 1000);
  assert.strictEqual(PK.isRunaway(th), true);
  assert.ok(/持続値はありません/.test(PK.RUNAWAY_TEXT));
  assert.strictEqual(PK.isRunaway(ev(mk('amd-zen5-9700x')).thermal), false);
  assert.strictEqual(PK.isRunaway({ ok: false }), false);
});

test('制限を満たせない(13900K + 小型ファン): feasible:false と notes。notes は仮置き注意を除いて一覧にする', () => {
  const PK = require('../js/ui/packageform.js');
  const th = ev(design.setCooling(mk('intel-rpl-13900k'), 'small-fan').design).thermal;
  assert.strictEqual(th.feasible, false); assert.strictEqual(th.limitedBy, 'cooling');
  const notes = PK.thermalNotes(th);
  assert.ok(notes.some((n) => /冷却不足/.test(n)));
  assert.ok(!notes.some((n) => /^冷却の熱抵抗は根拠のない仮置き$/.test(n)));
  assert.ok(/最小クロックでも超過/.test(PK.INFEASIBLE_TEXT));
  assert.ok(/ダイ平均/.test(PK.TJ_NOTE) && /TIM/.test(PK.TJ_NOTE));
});
