'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sim, D, gb7ByName } = require('./helpers');
const F = sim.perf;
const rep = D.presets.filter((p) => p.calib);
const cal = () => F.calibrate(D.presets, gb7ByName, D.uarch, 'rep', null);
const preset = (id) => D.presets.find((p) => p.id === id);
const clone = (o) => JSON.parse(JSON.stringify(o));

test('stScore: クロック↑で ST↑', () => {
  const p = rep[0]; const c = cal();
  const lo = F.stScore(p, c, D.uarch, { fGHz: 3 });
  const hi = F.stScore(p, c, D.uarch, { fGHz: 5 });
  assert.ok(lo.ok && hi.ok);
  assert.ok(hi.score > lo.score);
});

test('stScore: L2/L3 容量↑で ST は下がらない', () => {
  const p = preset('intel-rpl-13900k'); const c = cal();
  const base = F.stScore(p, c, D.uarch).score;
  const bigL3 = clone(p); bigL3.cfg.l3MB *= 2;
  assert.ok(F.stScore(bigL3, c, D.uarch).score >= base);
  const db = clone(D.uarch); db['Raptor Cove'].l2KB *= 2;
  assert.ok(F.stScore(p, c, db).score >= base);
});

// 代表 SKU は補正係数を決めた SKU 自身なので、誤差がほぼ 0 になるのは当然(検証にならない)。
// ここは「補正係数がスコアに正しく掛かる(u = gb7 / raw)」ことだけを確かめる。
test('calibrate rep: 代表 SKU は補正の元データなので一致する(検証ではない)', () => {
  const c = cal();
  assert.ok(rep.length > 0);
  assert.strictEqual(c.isValidation, true);
  rep.forEach((p) => {
    const r = F.stScore(p, c, D.uarch);
    if (!r.ok) return;
    assert.ok(Math.abs(r.score / gb7ByName[p.gb7].single - 1) < 0.005, p.id);
  });
});

// 検証: 代表で決めた補正係数で、同じコアを使う別 SKU を予測して ±10% を見る(設計書 §5.3.1 / §11)。
const VALIDATION_PAIRS = [
  ['intel-arl-285k', 'Lion Cove(代表 265K)'], ['amd-zen5-9950x', 'Zen 5(代表 9700X)'], ['amd-zen4-7950x', 'Zen 4(代表 7700)'],
  ['apple-m1pro', 'Firestorm(代表 M1)'], ['apple-m1max', 'Firestorm(代表 M1)'], ['apple-a15', 'Avalanche(代表 M2)'],
  ['qc-8elite-gen5', 'Oryon(代表 8 Elite)'], ['qc-8plus-gen1', 'Cortex-X2(代表 8 Gen 1)'], ['mt-9200', 'Cortex-X3(代表 8 Gen 2)'],
];
VALIDATION_PAIRS.forEach(([id, why]) => {
  test(`検証 ST(±10%): ${id} — ${why}`, () => {
    const p = preset(id); const r = F.stScore(p, cal(), D.uarch);
    assert.ok(r.ok, r.reason);
    const err = r.score / gb7ByName[p.gb7].single - 1;
    assert.ok(Math.abs(err) <= 0.10, `${id}: ${(err * 100).toFixed(1)}%`);
  });
});

// 既知の外れ値(電力制限・機種差・仮の補正などで予測が外れる)。直ったら通常の検証に移す。
// 外れることを記録しておき、モデルが「全部合う」と誤解されないようにする。
const KNOWN_MISSES = ['amd-strix-hx370', 'intel-lnl-268v', 'amd-strixhalo-395', 'qc-7plus-gen3', 'mt-9300'];
test('既知の外れ値は ±10% を超える(記録。直ったらリストから外す)', () => {
  const c = cal();
  KNOWN_MISSES.forEach((id) => assert.ok(F.stScore(preset(id), c, D.uarch).ok, `${id} が計算不能(外れ値ではなく対象外)`));
  const outside = KNOWN_MISSES.filter((id) => { const p = preset(id); const r = F.stScore(p, c, D.uarch); return r.ok && Math.abs(r.score / gb7ByName[p.gb7].single - 1) > 0.10; });
  assert.strictEqual(outside.length, KNOWN_MISSES.length, `外れなくなった SKU がある: ${KNOWN_MISSES.filter((id) => !outside.includes(id)).join(',')}。リストから外して検証ペアへ移すこと`);
});

test('ST: コア(E コア)を増やしても ST は下がらない(L3 はスレッド数 1 で見る)', () => {
  const p = clone(preset('intel-rpl-13900k')); const c = cal();
  const a = F.stScore(p, c, D.uarch).score;
  p.cfg.cores[1].count = 32;
  assert.strictEqual(F.stScore(p, c, D.uarch).score, a);
});

test('calibrate: mode は rep か all のみ(打ち間違いは例外)', () => {
  assert.throws(() => F.calibrate(D.presets, gb7ByName, D.uarch, 'reps'), /mode/);
  assert.strictEqual(F.calibrate(D.presets, gb7ByName, D.uarch, 'all').isValidation, false);
});

test('calibrate: 仮の IPC のコア(幅・ROB 未取得)は補正係数の元データにしない', () => {
  const c = F.calibrate(D.presets, gb7ByName, D.uarch, 'all');
  ['Vortex', 'Lightning', 'Neoverse V3AE', 'C2-Ultra'].forEach((k) => assert.strictEqual(c.u[k], undefined, k));
  assert.ok(c.n['Zen 5'] >= 1 && c.usedPresets['Zen 5'].length === c.n['Zen 5']);
});

test('幅も ROB も未取得のコアは ok:false(仮の IPC を入れない)', () => {
  const r = F.stScore(preset('apple-a12'), F.calibrate(D.presets, gb7ByName, D.uarch, 'all'), D.uarch);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /未取得|補正/);
});

test('coreCpi: クロック未取得は ok:false(NaN を返さない)', () => {
  const r = F.coreCpi(D.uarch['Zen 5'], { fGHz: undefined });
  assert.strictEqual(r.ok, false);
});

test('mtScore: コアなしは ok:false、未校正の σ・γ と信頼度を結果に出す', () => {
  const c = cal();
  assert.strictEqual(F.mtScore({ cfg: { cores: [] } }, c, D.uarch, {}).ok, false);
  const r = F.mtScore(preset('amd-zen5-9950x'), c, D.uarch, null);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.uncalibrated.sort(), ['gammaSmt', 'sigma']);
  assert.strictEqual(r.confidence, 'low');
});

test('calibrateMt: σ を代表 SKU の MT に合わせ、使った preset を返す(γ は固定)', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  assert.ok(c.mt.sigma > 0 && c.mt.sigma < 0.2);
  assert.deepStrictEqual(c.mt.fitted, ['sigma']);
  assert.ok(c.mt.usedPresets.length >= 3);
  const r = F.mtScore(preset('amd-zen5-9950x'), c, D.uarch, null);
  assert.deepStrictEqual(r.uncalibrated, ['gammaSmt']);
});

test('mtScore: スレッドが増えると η は下がる(並列効率)', () => {
  const c = cal(); const p = clone(preset('amd-zen4-7950x'));
  const a = F.mtScore(p, c, D.uarch, null); p.cfg.cores[0].count = 32;
  const b = F.mtScore(p, c, D.uarch, null);
  assert.ok(b.eta < a.eta);
});

test('未校正 uarch は ok:false', () => {
  const r = F.stScore(clone(preset('intel-adl-12900k')), { u: {}, uIsa: {} }, D.uarch);
  assert.strictEqual(r.ok, false);
  assert.ok(r.reason);
});

test('calibrateMt: 使える代表が 0 件なら σ は既定値のまま(合わせたことにしない)', () => {
  const c = F.calibrateMt([], gb7ByName, D.uarch, cal());
  assert.deepStrictEqual(c.mt.fitted, []);
  assert.strictEqual(c.mt.sigma, F.MT_DEFAULTS.sigma);
  assert.strictEqual(c.mt.rmsLogError, null);
});

test('calibrateMt: 合わせるときと返すときで同じ γ を使う', () => {
  const base = Object.assign({}, cal(), { mt: { gammaSmt: 0.5 } });
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, base);
  assert.strictEqual(c.mt.gammaSmt, 0.5);
});

test('calibrateMt: ISA 平均で代用するコアを含む代表は σ の合わせに使わない', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  assert.ok(!c.mt.usedPresets.includes('qc-8elite'), 'Oryon Performance は uarch 補正がなく ISA 平均になる');
});

test('幅が未取得のコアは decodeWidth を IPC の上限に使う(ROB 由来の上限だけにしない)', () => {
  const g = F.coreCpi(D.uarch['Gracemont'], { fGHz: 3.9 });
  assert.ok(g.ok);
  assert.strictEqual(g.parts.base, 1 / D.uarch['Gracemont'].decodeWidth); // 修正前は ROB 由来の上限(約 1/8.8)になっていた
});
