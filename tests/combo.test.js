'use strict';
// CPU + GPU 総合スコア(js/sim/combo.js・js/ui/combopanel.js の buildCombo)と、共有キャッシュ(L3 を半分で再評価)
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'gpus.js'));
require(path.join(__dirname, '..', 'data', 'igpus.js'));
const C = require('../js/sim/combo.js');
const E = require('../js/model/evaluate.js');
const design = require('../js/model/design.js');
globalThis.SDS = globalThis.SDS || {}; globalThis.SDS.combo = C; globalThis.SDS.ui = globalThis.SDS.ui || {};
require('../js/ui/combopanel.js');
const CP = globalThis.SDS.ui.combopanel;

test('総合スコア: 基準(13980HX + RTX 4060)で 1000。幾何平均で、GPU が 2 倍なら w=0.5 で √2 倍', () => {
  assert.strictEqual(Math.round(C.combined(2501, 18287, 100000, 0.5)), 1000);
  assert.ok(Math.abs(C.combined(2501, 18287, 200000, 0.5) / 1000 - Math.SQRT2) < 1e-9);
  // w = 1 は CPU だけ、w = 0 は GPU だけ
  assert.ok(Math.abs(C.combined(2501 * 2, 18287 * 2, 100000 * 3, 1) - 2000) < 1e-9);
  assert.ok(Math.abs(C.combined(2501 * 2, 18287 * 2, 100000 * 3, 0) - 3000) < 1e-9);
  // 単調: どれを上げても総合は上がる
  const b = C.combined(3000, 20000, 90000, 0.5);
  assert.ok(C.combined(3100, 20000, 90000, 0.5) > b && C.combined(3000, 21000, 90000, 0.5) > b && C.combined(3000, 20000, 95000, 0.5) > b);
});

test('総合スコア: 欠けた値・0 以下・範囲外の重みは扱いを間違えない(null / 0.5)', () => {
  assert.strictEqual(C.combined(null, 18287, 100000, 0.5), null);
  assert.strictEqual(C.combined(2501, 18287, 0, 0.5), null);
  assert.strictEqual(C.combined(2501, 18287, undefined, 0.5), null);
  assert.strictEqual(C.combined(2501, -1, 100000, 0.5), null);
  assert.strictEqual(C.clampW(2), 0.5); assert.strictEqual(C.clampW(NaN), 0.5); assert.strictEqual(C.clampW(0), 0); assert.strictEqual(C.clampW(1), 1);
});

test('共有キャッシュ: 半分ずつ。共有でなければ CPU は全量・GPU は扱わない', () => {
  assert.deepStrictEqual(C.sharedSplit(32, true), { cpuMB: 16, gpuMB: 16 });
  assert.deepStrictEqual(C.sharedSplit(32, false), { cpuMB: 32, gpuMB: null });
  assert.strictEqual(C.sharedSplit(-1, true), null); assert.strictEqual(C.sharedSplit(null, true), null);
});

test('共有キャッシュ: L3 を半分にして再評価すると、CPU の MT は下がり(上がらず)、ST・MT とも計算できる(9700X)', () => {
  const ctx = E.makeContext();
  const p = D.presets.find((x) => x.id === 'amd-zen5-9700x');
  const d = design.fromPreset(p);
  const full = E.evaluate(d, ctx);
  const d2 = JSON.parse(JSON.stringify(d)); d2.cfg.l3MB = d.cfg.l3MB / 2;
  const half = E.evaluate(d2, ctx);
  assert.ok(full.st.ok && full.mt.ok && half.st.ok && half.mt.ok);
  assert.ok(half.st.score <= full.st.score + 1e-9 && half.mt.score <= full.mt.score + 1e-9, `${full.st.score}→${half.st.score} / ${full.mt.score}→${half.mt.score}`);
  assert.ok(half.mt.score < full.mt.score, 'L3 を半分にすると MT が下がる');
});

test('buildCombo: CPU 未選択・GPU 未選択の理由を返し、そろえば総合と公開値ベースの差を返す。共有時は共有側の CPU を使う', () => {
  const cpu = { ok: true, st: 3000, mt: 20000, stPub: 3100, mtPub: 21000 };
  const gpu = { pred: 100000, pub: 98000, kind: 'igpu' };
  assert.ok(CP.buildCombo({ cpu: { ok: false, reason: 'x' }, gpu, w: 0.5 }).reason === 'x');
  assert.ok(/GPU を選んで/.test(CP.buildCombo({ cpu, gpu: null, w: 0.5 }).reason));
  const r = CP.buildCombo({ cpu, gpu, w: 0.5, shared: false, sharedMB: 32 });
  assert.ok(r.est > 0 && r.pub > 0 && Math.abs(r.diffPct - (r.est / r.pub - 1) * 100) < 1e-9);
  const sh = CP.buildCombo({ cpu, cpuShared: { ok: true, st: 2900, mt: 18000 }, gpu, w: 0.5, shared: true, sharedMB: 32 });
  assert.deepStrictEqual(sh.split, { cpuMB: 16, gpuMB: 16 });
  assert.ok(sh.est < r.est, '共有で CPU が下がれば総合も下がる');
  assert.strictEqual(sh.pub, r.pub, '公開値ベースは共有の影響を受けない');
  // 公開値がそろわないとき
  assert.strictEqual(CP.buildCombo({ cpu: { ok: true, st: 3000, mt: 20000, stPub: null, mtPub: null }, gpu, w: 0.5 }).diffPct, null);
});

test('iGPU / dGPU: 共有キャッシュは iGPU のときだけ効く。dGPU なら共有を選んでも CPU は共有なしの値。slot が付く', () => {
  const cpu = { ok: true, st: 3000, mt: 20000, stPub: 3100, mtPub: 21000 };
  const sharedCpu = { ok: true, st: 2900, mt: 18000 };
  const i = CP.buildCombo({ cpu, cpuShared: sharedCpu, gpu: { pred: 100000, pub: 98000, kind: 'igpu' }, w: 0.5, shared: true, sharedMB: 32 });
  const d = CP.buildCombo({ cpu, cpuShared: sharedCpu, gpu: { pred: 100000, pub: 98000, kind: 'dgpu' }, w: 0.5, shared: true, sharedMB: 32 });
  assert.strictEqual(i.slot, 'igpu'); assert.strictEqual(d.slot, 'dgpu');
  assert.strictEqual(i.shared, true); assert.strictEqual(d.shared, false); assert.strictEqual(d.split, null);
  assert.ok(d.est > i.est, 'dGPU は共有の減点がない');
  assert.strictEqual(d.cpuUsed, cpu);
});
