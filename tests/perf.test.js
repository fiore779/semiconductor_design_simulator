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

// MT の検証(σ を AMD の代表 3 件で合わせた状態で、代表以外を ±10% で予測できるか)。通るのは一部だけ(設計書 §5.3.0)。
// (amd-strix-hx370 は TDP 帯別の係数 0.65 の導入で -8.8% → -24.4% に悪化したため、この一覧から外した。設計書 §5.3.3 G の1)
['intel-adl-12900k', 'intel-rpl-14900k', 'amd-zenplus-2700x', 'amd-zen4-7950x', 'nv-orin-agx'].forEach((id) => {
  test(`検証 MT(±10%): ${id}`, () => {
    const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
    const p = preset(id); const r = F.mtScore(p, c, D.uarch, null);
    assert.ok(r.ok && !r.fallback, id);
    const err = r.score / gb7ByName[p.gb7].multi - 1;
    assert.ok(Math.abs(err) <= 0.10, `${id}: ${(err * 100).toFixed(1)}%`);
  });
});

test('MT の既知の外れ値(Oryon の E コアは ISA 平均補正で過大、13900K は予測が外れる。185H は TDP 帯別の係数で +14.2% → +8.2% に入った)', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  ['qc-8elite-gen5', 'intel-rpl-13900k'].forEach((id) => {
    const p = preset(id); const r = F.mtScore(p, c, D.uarch, null);
    assert.ok(r.ok, id);
    assert.ok(Math.abs(r.score / gb7ByName[p.gb7].multi - 1) > 0.10, `${id} は外れなくなった。リストを更新すること`);
  });
});

test('mtScore: fByType 省略時は最大クロック(boost)を使う', () => {
  const c = cal(); const p = preset('amd-zen5-9700x');
  const a = F.mtScore(p, c, D.uarch, null);
  const b = F.mtScore(p, c, D.uarch, { P: p.cfg.cores[0].boostGHz });
  assert.strictEqual(a.score, b.score);
});

test('mtScore: boost が無い E コアは base に落ち、mixedClock で知らせる(13900K の E は boost 未取得)', () => {
  const r = F.mtScore(preset('intel-rpl-13900k'), cal(), D.uarch, null);
  assert.ok(r.ok);
  assert.strictEqual(r.mixedClock, true);
  assert.deepStrictEqual(r.detail.map((d) => d.clockSource), ['boost', 'base']);
  assert.strictEqual(F.mtScore(preset('amd-zen5-9700x'), cal(), D.uarch, null).mixedClock, false);
});

test('mtScore: maxGHz だけのコア(Arm)は max を使い、fByType の部分指定は指定した種別だけ上書き', () => {
  const c = cal();
  const orin = F.mtScore(preset('nv-orin-agx'), c, D.uarch, null);
  assert.ok(orin.ok);
  assert.strictEqual(orin.detail[0].clockSource, 'max');
  const p = preset('intel-arl-285k');
  const part = F.mtScore(p, c, D.uarch, { P: 3.0 });
  assert.deepStrictEqual(part.detail.map((d) => d.clockSource), ['given', 'boost']);
  assert.ok(part.score < F.mtScore(p, c, D.uarch, null).score);
});

// MT の持続クロック係数(設計書 §5.3.0・§5.3.3 G の1。[推定・校正値]。mobile は 0.81、mobile-pc は TDP 帯別(電力未取得は 0.81)、それ以外は 1.0)
test('MT 持続クロック係数: mobile は boost × 0.81 を使い、desktop(pc)と kind なしは 1.0 で不変', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  assert.deepStrictEqual(F.MT_CLOCK_FACTOR, { pc: 1.0, mobile: 0.81, 'mobile-pc': 0.81 });
  // mobile: fByType に boost×0.81 を明示した値と一致(係数は fByType の明示指定には掛からない)
  const m = preset('qc-8gen2'); assert.strictEqual(m.kind, 'mobile');
  const a = F.mtScore(m, c, D.uarch, null);
  const explicit = {}; m.cfg.cores.forEach((g) => { explicit[g.type] = (g.boostGHz || g.maxGHz || g.baseGHz) * 0.81; });
  const b = F.mtScore(m, c, D.uarch, explicit);
  assert.ok(a.ok && b.ok); assert.strictEqual(a.clockFactor, 0.81); assert.ok(b.detail.every((d) => d.clockFactor === 1)); assert.strictEqual(b.clockFactor, 1);
  // base にフォールバックしたコアには係数を掛けない(トップレベルは実際に掛けた係数)
  const nb = JSON.parse(JSON.stringify(m)); nb.cfg.cores.forEach((g) => { g.baseGHz = g.maxGHz; delete g.boostGHz; delete g.maxGHz; });
  const rb = F.mtScore(nb, c, D.uarch, null);
  assert.ok(rb.ok && rb.detail.every((d) => d.clockSource === 'base' && d.clockFactor === 1)); assert.strictEqual(rb.clockFactor, 1);
  assert.ok(Math.abs(a.score / b.score - 1) < 1e-12);
  assert.ok(a.detail.every((d) => d.clockFactor === 0.81));
  // mobile-pc は電力が未取得なら 0.81(7840HS)、取得済みなら帯の係数(HX370: cTDP 上限 54W → 0.65)、pc は 1.0
  assert.strictEqual(F.mtScore(preset('amd-zen4-7840hs'), c, D.uarch, null).clockFactor, 0.81);
  assert.strictEqual(F.mtScore(preset('amd-strix-hx370'), c, D.uarch, null).clockFactor, 0.65);
  const pc = preset('amd-zen5-9700x'); assert.strictEqual(pc.kind, 'pc');
  const r1 = F.mtScore(pc, c, D.uarch, null); const r2 = F.mtScore(Object.assign({}, pc, { kind: undefined }), c, D.uarch, null);
  assert.strictEqual(r1.clockFactor, 1); assert.strictEqual(r2.clockFactor, 1); assert.strictEqual(r1.score, r2.score);
  // 係数が効くと mobile の MT は下がる(kind を外した同じ構成より低い)
  assert.ok(a.score < F.mtScore(Object.assign({}, m, { kind: undefined }), c, D.uarch, null).score);
  // embedded・server は 1.0
  assert.strictEqual(F.mtClockFactor({ kind: 'embedded' }), 1); assert.strictEqual(F.mtClockFactor({ kind: 'server' }), 1); assert.strictEqual(F.mtClockFactor(null), 1);
});

// ---- M6 第 4 段: Golden Cove / Raptor Cove の校正済み定数 uCal(設計書 §5.3.0) ----
test('uCal: Golden/Raptor 11 件の SKU 別 u の中央値から再計算した値と一致する(丸め 0.05 以内)・n=11', () => {
  const ids = [];
  const us = [];
  D.presets.forEach((p) => {
    const c = F.topCore(p.cfg.cores || []);
    if (!c || !/^(Golden|Raptor) Cove$/.test(c.uarch) || !p.gb7 || !gb7ByName[p.gb7]) return;
    const r = F.stScore(p, { u: { [c.uarch]: 1 } }, D.uarch);
    ids.push(p.id); us.push(gb7ByName[p.gb7].single / r.score);
  });
  const s = us.slice().sort((a, b) => a - b); const n = s.length;
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  assert.strictEqual(n, 11, ids.join(',') + ' — GB7 付き Golden/Raptor プリセットの追加や GB7 更新でも落ちる。その場合は uCal の u・n・date・basis を見直し、設計書 §5.3.0 の学習内・LOO の表を作り直す');
  ['Golden Cove', 'Raptor Cove'].forEach((k) => {
    assert.strictEqual(D.uarch[k].uCal.n, 11);
    assert.ok(Math.abs(D.uarch[k].uCal.u - median) < 0.05, `${k}: ${D.uarch[k].uCal.u} vs ${median}。uCal の u・n・date・basis を見直し、設計書 §5.3.0 の表を作り直す`);
    assert.ok(D.uarch[k].uCal.date && D.uarch[k].uCal.basis);
  });
});

test('uCal: rep 校正で Golden/Raptor に u が入り、calib・n・usedPresets・uIsa には影響しない', () => {
  const c = cal();
  assert.strictEqual(c.u['Golden Cove'], 112.3); assert.strictEqual(c.u['Raptor Cove'], 112.3);
  assert.deepStrictEqual(Object.keys(c.uFixed).sort(), ['Golden Cove', 'Raptor Cove']);
  assert.strictEqual(c.n['Golden Cove'], undefined); assert.strictEqual(c.usedPresets['Golden Cove'], undefined);
  assert.ok(Math.abs(c.uIsa.x86 - 107.36091595190973) < 1e-9); // ISA 平均は代表だけで決まるので不変
  assert.ok(!D.presets.some((p) => p.calib && /^(Golden|Raptor) Cove$/.test((F.topCore(p.cfg.cores) || {}).uarch)));
  const r = F.stScore(preset('intel-adl-12900k'), c, D.uarch);
  assert.strictEqual(r.corrSource, 'uarch'); assert.strictEqual(r.corr, 112.3);
});

test('uCal: 代表の u がある uarch には定数より代表を優先する', () => {
  const db = clone(D.uarch); db['Zen 1'].uCal = { u: 1, n: 1, date: 'x', basis: 'x' };
  const c = F.calibrate(D.presets, gb7ByName, db, 'rep', null);
  assert.ok(c.u['Zen 1'] > 50); assert.strictEqual(c.uFixed['Zen 1'], undefined);
});

// ---- TDP 帯別の MT 持続クロック係数(設計書 §5.3.3 G の1。[推定・校正値]。熱モデルではない) ----
test('mtClockInfo: 帯の境界(60W 以下 / 超)・電力の取り方・フォールバック・kind 別', () => {
  const mk = (kind, power) => ({ kind, power });
  const rng = (maxW) => ({ base: null, peak: null, range: { minW: 10, maxW } });
  assert.deepStrictEqual(F.MT_CLOCK_BANDS.map((b) => [b.maxW, b.factor]), [[60, 0.65], [Infinity, 0.76]]);
  // 境界: 60W ちょうどは 60W 以下の帯、60.1W は 60W 超の帯
  assert.strictEqual(F.mtClockInfo(mk('mobile-pc', rng(60))).factor, 0.65);
  assert.strictEqual(F.mtClockInfo(mk('mobile-pc', rng(60.1))).factor, 0.76);
  assert.strictEqual(F.mtClockInfo(mk('mobile-pc', rng(15))).band, '60W 以下');
  assert.strictEqual(F.mtClockInfo(mk('mobile-pc', rng(120))).band, '60W 超');
  // 電力の取り方: range.maxW が優先、なければ base.w。peak(短時間ピーク)だけでは帯を決めない
  const both = { base: { w: 25, s: 'sec' }, peak: { w: 80, s: 'sec' }, range: { minW: 15, maxW: 80 } };
  assert.deepStrictEqual(F.mtPublishedW(mk('mobile-pc', both)), { w: 80, source: 'range.maxW' });
  assert.deepStrictEqual(F.mtPublishedW(mk('mobile-pc', { base: { w: 25, s: 'sec' }, peak: null, range: null })), { w: 25, source: 'base' });
  assert.strictEqual(F.mtPublishedW(mk('mobile-pc', { base: null, peak: { w: 157, s: 'sec' }, range: null })), null);
  // フォールバック: 電力未取得の mobile-pc は 0.81 で、fallback:true
  const fb = F.mtClockInfo(mk('mobile-pc', { base: null, peak: null, range: null }));
  assert.deepStrictEqual([fb.factor, fb.band, fb.fallback], [0.81, null, true]);
  assert.strictEqual(F.mtClockInfo({ kind: 'mobile-pc' }).factor, 0.81);
  // mobile(スマホ SoC)は電力があっても一律 0.81、pc・その他は 1.0
  const ph = F.mtClockInfo(mk('mobile', both)); assert.deepStrictEqual([ph.factor, ph.band, ph.fallback], [0.81, null, false]);
  ['pc', 'server', 'embedded', undefined].forEach((k) => assert.strictEqual(F.mtClockInfo(mk(k, both)).factor, 1));
  assert.strictEqual(F.mtClockInfo(null).factor, 1);
  // 実データ: 5800U(10〜25W)→0.65、HX370(54W)→0.65、PTL(80W)→0.76、7840HS(未取得)→0.81・fallback
  assert.strictEqual(F.mtClockInfo(preset('amd-zen3-5800u')).factor, 0.65);
  assert.strictEqual(F.mtClockInfo(preset('intel-ptl-x9-386h')).factor, 0.76);
  assert.strictEqual(F.mtClockInfo(preset('amd-zen4-7840hs')).fallback, true);
});

test('mtScore: 帯の係数は mtScore の結果(clockFactor・clockInfo)に出る。編集後の cfg でも元の公表電力で決まる(power は preset から引き継ぐ)', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  const p = preset('amd-zen3-5800u');
  const r = F.mtScore(p, c, D.uarch, null);
  assert.strictEqual(r.clockFactor, 0.65); assert.strictEqual(r.clockInfo.powerW, 25); assert.strictEqual(r.clockInfo.source, 'range.maxW');
  // コア数を変えた設計(power は元のまま)でも同じ係数
  const q = clone(p); q.cfg.cores[0].count = 6;
  assert.strictEqual(F.mtScore(q, c, D.uarch, null).clockFactor, 0.65);
  // 混合設計(kind 'pc')は 1.0
  assert.strictEqual(F.mtScore(Object.assign({}, p, { kind: 'pc' }), c, D.uarch, null).clockFactor, 1);
});

// 帯の係数を、データから再現できるか(中央値)と leave-one-out(LOO)。標本 = MT を計算でき、GB7 マルチと公表電力がある mobile-pc(9 件)
test('TDP 帯別係数: 帯内の「予測がチャート値と一致する係数」の中央値(小数 2 桁)が MT_CLOCK_BANDS と一致し、LOO の誤差が一律 0.81 より小さい', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const r2 = (x) => Math.round(x * 100) / 100;
  const mtAt = (p, k) => { const fb = {}; p.cfg.cores.forEach((x) => { fb[x.type] = (x.boostGHz || x.maxGHz || x.baseGHz) * k; }); return F.mtScore(p, c, D.uarch, fb).score; };
  const S = [];
  D.presets.forEach((p) => {
    const g = gb7ByName[p.gb7]; const w = F.mtPublishedW(p);
    if (p.kind !== 'mobile-pc' || !g || !g.multi || !w || !F.mtScore(p, c, D.uarch, null).ok) return;
    let lo = 0.2; let hi = 1.5; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (mtAt(p, m) < g.multi) lo = m; else hi = m; }
    S.push({ p, pub: g.multi, k: (lo + hi) / 2, band: F.MT_CLOCK_BANDS.findIndex((b) => w.w <= b.maxW) });
  });
  assert.strictEqual(S.length, 9);
  F.MT_CLOCK_BANDS.forEach((b, i) => {
    const ks = S.filter((s) => s.band === i).map((s) => s.k);
    assert.ok(ks.length >= 4, '帯 ' + i + ' の標本数');
    assert.strictEqual(r2(med(ks)), b.factor, '帯 ' + i);
  });
  // LOO: 自分を除いて中央値を取り直し(帯が空になれば 0.81)、自分を予測する
  const mae = (a) => a.reduce((x, y) => x + Math.abs(y), 0) / a.length;
  const loo = S.map((s) => {
    const o = S.filter((x) => x !== s && x.band === s.band);
    const k = o.length ? r2(med(o.map((x) => x.k))) : 0.81;
    return { e: mtAt(s.p, k) / s.pub - 1, e81: mtAt(s.p, 0.81) / s.pub - 1 };
  });
  assert.ok(mae(loo.map((l) => l.e)) < 0.09, 'LOO MAE ' + mae(loo.map((l) => l.e)));
  assert.ok(mae(loo.map((l) => l.e81)) > 0.13);
  assert.ok(mae(loo.map((l) => l.e)) < mae(loo.map((l) => l.e81)));
  assert.strictEqual(loo.filter((l) => Math.abs(l.e) > 0.10).length, 2);
});

test('TDP 帯別係数: σ の校正(代表 3 件)は不変(代表は pc で係数 1.0)', () => {
  const c = F.calibrateMt(D.presets, gb7ByName, D.uarch, cal());
  assert.ok(Math.abs(c.mt.sigma - 0.02737344460936582) < 1e-12);
  assert.deepStrictEqual(c.mt.usedPresets, ['amd-zen1-1800x', 'amd-zen4-7700', 'amd-zen5-9700x']);
});
