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

test('CPU 内蔵の iGPU: 対応表の id が実在し、クロックは SKU の値で上書きされる。選択の優先は dGPU > iGPU 手動 > 内蔵(自動)', () => {
  const map = globalThis.SDS_DATA.presetIgpu; const igpus = globalThis.SDS_DATA.igpus.concat(globalThis.SDS_DATA.socgpus || []);
  Object.keys(map).forEach((pid) => { assert.ok(D.presets.some((p) => p.id === pid), pid); assert.ok(igpus.some((g) => g.id === map[pid].igpuId), pid); });
  assert.strictEqual(map['intel-lnl-268v'].boostMHz, 2000); assert.strictEqual(map['intel-lnl-258v'].boostMHz, 1950);
  assert.ok(['amd-zen3p-7735hs', 'amd-zen4-7840hs', 'amd-zen4-8700g', 'amd-zen4-8500g', 'amd-strix-hx370', 'amd-kraken-350', 'amd-strixhalo-395', 'intel-lnl-268v', 'intel-lnl-258v', 'intel-lnl-256v'].every((k) => map[k]));
  const GP = (() => { globalThis.window = globalThis; require('../js/sim/gpuperf.js'); require('../js/ui/gpupanel.js'); return globalThis.SDS.ui.gpupanel; })();
  assert.strictEqual(GP.activeSelection('intel-rpl-14700hx'), null, '対応のない CPU は自動では入らない');
  const a = GP.activeSelection('amd-zen4-7840hs'); assert.strictEqual(a.slot, 'igpu'); assert.strictEqual(a.id, 'amd-780m'); assert.ok(a.auto);
  const i1 = GP.selectionInfo(a);
  // 同じ 780M でも 8700G(2900MHz)のほうが 7840HS(2700MHz)より高い(クロックの差)
  const i2 = GP.selectionInfo(GP.activeSelection('amd-zen4-8700g')); assert.ok(i2.pred > i1.pred);
  assert.ok(/内蔵/.test(i1.name));
});

test('内蔵 iGPU のメモリ帯域: CPU のメモリ構成から渡すと帯域が上書きされ、低いほど推定も下がる。渡さなければ iGPU 行の値', () => {
  require('../js/sim/memory.js');
  const GP = globalThis.SDS.ui.gpupanel; const M = globalThis.SDS.sim && globalThis.SDS.sim.memory || require('../js/sim/memory.js');
  // 8700G の既定のメモリ(DDR5-5200・128bit)= 83.2 GB/s
  const m = M.evaluate({ id: 'amd-zen4-8700g', cfg: {} }); assert.ok(m.active && Math.abs(m.bwGBs - 83.2) < 1e-6, String(m.bwGBs));
  const a0 = GP.activeSelection('amd-zen4-8700g'); const a1 = GP.activeSelection('amd-zen4-8700g', m.bwGBs);
  assert.strictEqual(a0.over.bwGBs, undefined); assert.ok(Math.abs(a1.over.bwGBs - 83.2) < 1e-6);
  assert.ok(GP.selectionInfo(a1).pred < GP.selectionInfo(a0).pred, '帯域 89.6 → 83.2 で下がる');
  assert.ok(/83\.2 GB\/s/.test(GP.selectionInfo(a1).name));
  // 無効な帯域(null・0・負)は渡さなかったのと同じ
  assert.strictEqual(GP.activeSelection('amd-zen4-8700g', 0).over.bwGBs, undefined);
  // メモリ固定の CPU(Lunar Lake)は評価が inactive = 帯域なし
  assert.strictEqual(M.evaluate({ id: 'intel-lnl-268v', cfg: {} }).active, false);
});

// ---- SoC 内蔵 GPU(data/socgpus.js)とブランド別表示 ----
globalThis.window = globalThis; require('../data/socgpus.js');
test('SoC 内蔵 GPU: 対応表の id が実在し、モデルのない行(Apple・Adreno・Mali)は公開値を使う。GB10 は仕様がそろう', () => {
  const SD = globalThis.SDS_DATA; const GPm = globalThis.SDS.gpuperf; const GP = globalThis.SDS.ui.gpupanel;
  const ids = new Set(SD.socgpus.map((g) => g.id)); assert.strictEqual(ids.size, SD.socgpus.length);
  Object.keys(SD.presetIgpu).forEach((pid) => { assert.ok(D.presets.some((p) => p.id === pid), pid); assert.ok(SD.igpus.concat(SD.socgpus).some((g) => g.id === SD.presetIgpu[pid].igpuId), pid); });
  ['nv-gb10', 'nv-thor', 'apple-m4', 'qc-8elite', 'mt-9400', 'intel-ptl-x9-388h'].forEach((pid) => assert.ok(SD.presetIgpu[pid], pid));
  assert.ok(GPm.hasSpec(SD.socgpus.find((g) => g.id === 'nv-gb10-gpu'))); assert.ok(!GPm.hasSpec(SD.socgpus.find((g) => g.id === 'apple-m4-gpu')));
  // Apple: 推定なし → 公開値を使う(総合は公開値で出る)
  const a = GP.selectionInfo(GP.activeSelection('apple-m4')); assert.ok(a.usePub); assert.strictEqual(a.pred, 32145);
  // GB10: モデルの推定(自分の校正なので公開値と一致)。Thor は GB10 の校正から推定(公開値なし)
  const g = GP.selectionInfo(GP.activeSelection('nv-gb10')); assert.ok(!g.usePub && Math.abs(g.pred / 115190 - 1) < 1e-9);
  const t = GP.selectionInfo(GP.activeSelection('nv-thor')); assert.ok(t.pred > 0 && t.pred < g.pred && t.pub == null);
  // dGPU の u は SoC 行に影響されない(SoC 行は igpu 区分)
  assert.strictEqual(GPm.uOf(SD.gpus.concat(SD.igpus, SD.socgpus), 'Blackwell', undefined, 'dgpu'), GPm.uOf(SD.gpus, 'Blackwell', undefined, 'dgpu'));
});
test('ブランド別: 全 GPU が既知のブランドに入る', () => {
  const SD = globalThis.SDS_DATA; const GP = globalThis.SDS.ui.gpupanel;
  const rows = GP.buildRows(SD.gpus, SD.igpus.concat(SD.socgpus));
  assert.strictEqual(rows.length, 52 + 10 + SD.socgpus.length);
  rows.forEach((r) => assert.ok(GP.BRANDS.includes(r.brand), r.id + ' ' + r.brand));
  assert.strictEqual(rows.find((r) => r.id === 'amd-780m').brand, 'AMD'); assert.strictEqual(rows.find((r) => r.id === 'intel-arc140v').brand, 'Intel'); assert.strictEqual(rows.find((r) => r.id === 'apple-m1-gpu').brand, 'Apple');
  assert.ok(rows.find((r) => r.id === 'apple-m1-gpu').noSpec);
});
