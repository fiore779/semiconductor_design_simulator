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

test('5800X: powerModel は出る(2026-11-05 に P の base 3.8GHz を TechPowerUp で取得)が、面積が未取得のため thermal は ok:false。base 電力未取得は Snapdragon 865 で確認', () => {
  // 経緯: 校正できない(power.base 未取得)→ 2026-11-05 に base 105W を入れて理由が baseGHz 未取得に変わり → 同日 P の base 3.8GHz を入れて powerModel.ok:true
  const r = ev(mk('amd-zen3-5800x'));
  assert.strictEqual(r.powerModel.ok, true);
  assert.ok(r.powerModel.estW > 0); assert.strictEqual(r.powerModel.calibratedToW, 105);
  assert.ok(/power\.base/.test(ev(mk('qc-865')).powerModel.reason));
  assert.strictEqual(r.powerModel.confidence, 'low');
  assert.strictEqual(r.thermal.ok, false);
  assert.ok(/面積/.test(r.thermal.reason));
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

test('L4: 熱暴走(9700X + passive-phone)は throttled:false。「下がる見込み」でなく熱暴走の警告を出す', () => {
  const r = ev(design.setCooling(mk('amd-zen5-9700x'), 'passive-phone').design);
  assert.strictEqual(r.thermal.limitedBy, 'runaway');
  assert.strictEqual(r.thermal.throttled, false); assert.strictEqual(r.throttled, false);
  assert.ok(!r.warnings.some((w) => /持続クロックが下がる/.test(w.text)));
  assert.ok(r.warnings.some((w) => /熱暴走の恐れ\(温度が収束しません\)。持続クロックは推定できません/.test(w.text)));
});

test('再現度パネルの電力行: A で電力制限を変えても変わらない。B(未編集)でも行は同じ判定(UI は B で再現度パネルを出さない)', () => {
  const R = require('../js/ui/reproduce.js');
  const last = (d) => { const x = R.reproductionRows(ev(d)); return x[x.length - 1]; };
  const a = mk('intel-adl-12900k', 'reproduce');
  const row0 = last(a);
  assert.deepStrictEqual(last(design.setPowerLimit(a, 100).design), row0);
  assert.deepStrictEqual(last(design.setPowerLimit(a, null).design), row0);
  assert.strictEqual(row0.verdict, 'ng');
  const rowB = last(mk('intel-adl-12900k', 'improve'));
  assert.strictEqual(rowB.verdict, row0.verdict); assert.strictEqual(rowB.diffPct, row0.diffPct);
});
