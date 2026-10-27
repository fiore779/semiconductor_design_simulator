'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const diff = require('../js/model/diff.js');
const ctx = E.makeContext();
const base = () => design.fromPreset(D.presets.find((p) => p.id === 'amd-zen5-9950x'), { mode: 'improve' });
const edit = () => {
  let d = design.setCoreCount(base(), 'P', 24).design;
  d = design.setClock(d, 'P', 6.0).design;
  return design.setL3(d, 96).design;
};

test('paramDiff: 変更のあるものだけ', () => {
  assert.deepStrictEqual(diff.paramDiff(base()), []);
  const p = diff.paramDiff(edit());
  assert.deepStrictEqual(p.map((x) => x.id), ['core:P:count', 'core:P:clock', 'l3']);
  assert.deepStrictEqual(p[0], { id: 'core:P:count', label: 'P コア数', before: 16, after: 24, unit: '個' });
  assert.strictEqual(p[1].before, 5.7); assert.strictEqual(p[1].after, 6); assert.strictEqual(p[2].unit, 'MB');
  assert.deepStrictEqual(diff.paramDiff(design.setClock(base(), 'P', 5.0).design).map((x) => x.id), ['core:P:clock']);
});

test('revertParam: その項目だけ戻る。元を壊さない。ロック中でも戻せる', () => {
  const d = edit(); const s = JSON.stringify(d);
  const r = diff.revertParam(d, 'core:P:count').design;
  assert.strictEqual(JSON.stringify(d), s);
  assert.deepStrictEqual(diff.paramDiff(r).map((x) => x.id), ['core:P:clock', 'l3']);
  assert.strictEqual(r.dies.flatMap((x) => x.blocks).filter((b) => b.kind === 'core').length, 16);
  assert.deepStrictEqual(diff.paramDiff(diff.revertParam(d, 'core:P:clock').design).map((x) => x.id), ['core:P:count', 'l3']);
  assert.deepStrictEqual(diff.paramDiff(diff.revertParam(d, 'l3').design).map((x) => x.id), ['core:P:count', 'core:P:clock']);
  const locked = design.fromPreset(D.presets.find((p) => p.id === 'amd-zen5-9950x'));
  locked.cfg.cores[0].count = 20; // ロック中でも(外部要因でずれていても)戻せる
  assert.deepStrictEqual(diff.paramDiff(diff.revertParam(locked, 'core:P:count').design), []);
});

test('revertAll: 全部戻り、validate が空', () => {
  const r = diff.revertAll(edit()).design;
  assert.deepStrictEqual(r.cfg, r.baseCfg); assert.deepStrictEqual(diff.paramDiff(r), []);
  assert.deepStrictEqual(design.validate(r), []);
});

test('resultDiff / summary: 符号と要約', () => {
  const d = edit();
  const eb = diff.baseEvaluation(d, ctx); const en = E.evaluate(d, ctx);
  assert.strictEqual(eb.st.edited, false);
  const rd = diff.resultDiff(eb, en);
  assert.strictEqual(rd.st.better, 'up'); assert.ok(rd.st.deltaPct > 0);
  assert.strictEqual(rd.mt.better, 'up'); assert.ok(rd.mt.deltaPct > 0);
  assert.ok(Math.abs(rd.st.deltaPct - (rd.st.after / rd.st.before - 1) * 100) < 1e-9);
  const s = diff.summary(rd);
  assert.strictEqual(s.verdict, 'up'); assert.ok(s.text.includes('上がる'));
  // クロックを下げる → ST は下がる
  const dd = design.setClock(base(), 'P', 5.0).design;
  const rd2 = diff.resultDiff(diff.baseEvaluation(dd, ctx), E.evaluate(dd, ctx));
  assert.strictEqual(rd2.st.better, 'down'); assert.ok(rd2.st.deltaPct < 0); assert.strictEqual(diff.summary(rd2).verdict, 'down');
  // 変更なし
  const rd3 = diff.resultDiff(eb, E.evaluate(base(), ctx));
  assert.strictEqual(rd3.st.better, 'same'); assert.strictEqual(diff.summary(rd3).verdict, 'same');
});

test('resultDiff: 確度の低さと校正範囲外が要約に出る', () => {
  const d = design.setCoreCount(base(), 'P', 40).design;
  const rd = diff.resultDiff(diff.baseEvaluation(d, ctx), E.evaluate(d, ctx));
  assert.strictEqual(rd.lowConfidence, true); assert.ok(rd.outOfCalibration.length > 0);
  const s = diff.summary(rd);
  assert.strictEqual(s.lowConfidence, true); assert.ok(s.text.includes('確度は低い')); assert.ok(s.text.includes('校正した範囲の外'));
});

test('resultDiff: どちらかが ok:false なら delta は null と理由', () => {
  const ok = { ok: true, score: 100, confidence: 'mid' };
  const ng = { ok: false, score: null, reason: '計算できません(テスト)' };
  const rd = diff.resultDiff({ st: ok, mt: ng }, { st: { ok: true, score: 110, confidence: 'mid' }, mt: ok });
  assert.ok(Math.abs(rd.st.deltaPct - 10) < 1e-9);
  assert.strictEqual(rd.mt.deltaPct, null); assert.strictEqual(rd.mt.better, null); assert.ok(rd.mt.reason.includes('テスト'));
  const s = diff.summary(rd); assert.strictEqual(s.verdict, 'up'); assert.ok(s.text.includes('MT は比べられません'));
  const rd2 = diff.resultDiff({ st: ng, mt: ng }, { st: ng, mt: ng });
  assert.strictEqual(diff.summary(rd2).verdict, 'unknown');
});

// ---- 再配置(クロックだけの差なら位置を保つ) ----
const moved = (d) => { const c = design.clone(d); c.dies[0].blocks[0].x += 0.123; return c; };
test('revertAll: クロックだけの差なら手で動かした位置を保つ(relaid:false)', () => {
  const d = moved(design.setClock(base(), 'P', 6.0).design);
  const r = diff.revertAll(d);
  assert.strictEqual(r.relaid, false); assert.deepStrictEqual(r.design.dies, d.dies); assert.deepStrictEqual(r.design.cfg, r.design.baseCfg);
});

test('revertAll: コア数や L3 も違えば再配置する(relaid:true、位置は模式図に戻る)', () => {
  const orig = base();
  const d = moved(design.setCoreCount(design.setClock(base(), 'P', 6.0).design, 'P', 24).design);
  const r = diff.revertAll(d);
  assert.strictEqual(r.relaid, true); assert.deepStrictEqual(r.design.cfg, r.design.baseCfg);
  assert.deepStrictEqual(r.design.dies[0].blocks, orig.dies[0].blocks);
  const r3 = diff.revertAll(design.setL3(base(), 96).design); assert.strictEqual(r3.relaid, true);
  assert.strictEqual(diff.revertAll(base()).relaid, false);
});

test('revertParam: relaid はコア数・L3 を戻したときだけ true', () => {
  const d = edit();
  assert.strictEqual(diff.revertParam(d, 'core:P:count').relaid, true);
  assert.strictEqual(diff.revertParam(d, 'l3').relaid, true);
  assert.strictEqual(diff.revertParam(d, 'core:P:clock').relaid, false);
});

test('summary: ST か MT の片方だけ比べられるときは見出し・文を限定する', () => {
  const ok = { ok: true, score: 100, confidence: 'mid' };
  const ng = { ok: false, score: null, reason: 'x' };
  const rd = diff.resultDiff({ st: ok, mt: ng }, { st: { ok: true, score: 110, confidence: 'mid' }, mt: ng });
  const s = diff.summary(rd);
  assert.strictEqual(s.scope, 'st'); assert.ok(s.text.startsWith('ST は +10.0% で上がる')); assert.ok(s.text.includes('MT は比べられません'));
  const PF = require('../js/ui/paramform.js');
  const hl = PF.verdictHeadline(s.verdict, s.scope);
  assert.ok(hl.line.includes('ST は上がる見込み(MT は比べられません')); assert.ok(!hl.line.includes('性能が'));
  const rd2 = diff.resultDiff({ st: ng, mt: ok }, { st: ng, mt: { ok: true, score: 90, confidence: 'low' } });
  assert.strictEqual(diff.summary(rd2).scope, 'mt');
  assert.ok(PF.verdictHeadline('down', 'mt').line.includes('MT は下がる見込み(ST は比べられません'));
  assert.ok(PF.verdictHeadline('up', 'both').line.includes('性能が上がる'));
});

test('resultDiff: lowConfidence は ST の確度だけで決まる(MT は常に低いので含めない)', () => {
  const rd = diff.resultDiff(diff.baseEvaluation(base(), ctx), E.evaluate(base(), ctx));
  assert.strictEqual(rd.mt.confidence, 'low'); assert.strictEqual(rd.lowConfidence, false); assert.strictEqual(rd.optimistic, false);
  const d = design.setClock(base(), 'P', 6.0).design; // 上げた(範囲内)
  const r2 = diff.resultDiff(diff.baseEvaluation(d, ctx), E.evaluate(d, ctx));
  assert.strictEqual(r2.optimistic, true); assert.ok(r2.optimisticReasons.length > 0);
});
