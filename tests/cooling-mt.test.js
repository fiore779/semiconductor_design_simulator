'use strict';
// 冷却のプリセット(ノート PC の 6 クラス)でマルチ性能が変わる(2026-11-12。ユーザー指示)。
// 方針: mobile-pc の連続式だけ MT 用の W = min(公表電力から決めた W, 選んだ冷却の sustainedW)。ST・pc・mobile は変えない。
// 既定(冷却の制限なし=sustainedW を持たない既存の仮置き冷却)では全プリセットの結果が従来と一致する。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const F = require('../js/sim/perf.js');
const ctx = E.makeContext();
const P = (id) => D.presets.find((p) => p.id === id);
const withCooling = (id, c) => { const r = design.setCooling(design.fromPreset(P(id), { mode: 'reproduce' }), c); assert.ok(r.ok, r.reason); return r.design; };
const evalC = (id, c) => E.evaluate(withCooling(id, c), ctx);
const CLASSES = [['laptop-thin-light', 28], ['laptop-standard', 45], ['laptop-workstation', 66], ['laptop-thin-dgpu', 65], ['laptop-gaming', 125], ['laptop-gaming-large', 145]];
const OLD = ['passive-phone', 'thin-laptop', 'small-fan', 'air-tower', 'aio-360'];

test('冷却データ: ノート PC の 6 クラスは sustainedW([実測]・幅・件数・取得日・出典つき)を持ち、既存の仮置き 5 件は持たない', () => {
  const by = Object.fromEntries(D.cooling.map((c) => [c.id, c]));
  assert.strictEqual(D.cooling.length, 11);
  OLD.forEach((id) => { assert.ok(by[id], id); assert.strictEqual(by[id].sustainedW, undefined, id); assert.strictEqual(by[id].s, 'tmp'); });
  const want = { 'laptop-thin-light': [28, [15, 35], 9], 'laptop-standard': [45, [35, 60], 6], 'laptop-thin-dgpu': [65, [50, 90], 9], 'laptop-gaming': [125, [95, 160], 7], 'laptop-gaming-large': [145, [130, 175], 6], 'laptop-workstation': [66, [60, 90], 3] };
  Object.keys(want).forEach((id) => {
    const c = by[id]; assert.ok(c, id);
    assert.strictEqual(c.sustainedW, want[id][0], id); assert.deepStrictEqual(c.sustainedRangeW, want[id][1], id); assert.strictEqual(c.sustainedN, want[id][2], id);
    assert.strictEqual(c.sustainedS, 'meas'); assert.strictEqual(c.sustainedDate, '2026-11-12'); assert.ok(/cooling-class-power-2026-11-12/.test(c.sustainedSrc));
    assert.strictEqual(c.s, 'tmp', id + ': 熱抵抗は仮置きのまま'); assert.ok(c.rK_W > 0);
  });
});

test('既定(制限なし): 既存の冷却のどれを選んでも、全プリセットの ST・MT は変わらず、編集済みにならない(回帰ゼロ)', () => {
  D.presets.forEach((p) => {
    const base = E.evaluate(design.fromPreset(p, { mode: 'reproduce' }), ctx);
    OLD.forEach((c) => {
      const ev = E.evaluate(withCooling(p.id, c), ctx);
      assert.strictEqual(ev.st.score, base.st.score, p.id + '/' + c); assert.strictEqual(ev.mt.score, base.mt.score, p.id + '/' + c);
      assert.strictEqual(ev.edited, false, p.id + '/' + c); assert.strictEqual(ev.mt.errPct, base.mt.errPct, p.id + '/' + c);
    });
  });
});

test('ノート PC 以外(pc・mobile)は、冷却のクラスを選んでも ST・MT・編集済みが変わらない', () => {
  ['intel-adl-12900k', 'amd-zen4-7950x', 'qc-8gen2', 'mt-9000'].forEach((id) => {
    const base = E.evaluate(design.fromPreset(P(id), { mode: 'reproduce' }), ctx);
    CLASSES.forEach(([c]) => { const ev = evalC(id, c); assert.strictEqual(ev.mt.score, base.mt.score, id + '/' + c); assert.strictEqual(ev.st.score, base.st.score); assert.strictEqual(ev.edited, false, id + '/' + c); });
  });
  // 公表電力がなくフォールバック(0.81)の mobile-pc(Apple)も不変
  const a = P('apple-m3'); assert.strictEqual(a.kind, 'mobile-pc');
  const base = E.evaluate(design.fromPreset(a, { mode: 'reproduce' }), ctx);
  CLASSES.forEach(([c]) => { const ev = evalC('apple-m3', c); assert.strictEqual(ev.mt.score, base.mt.score, c); assert.strictEqual(ev.edited, false, c); });
});

test('冷却を持続電力の小さい順に替えると MT は単調に下がる(上がらない)。ST は不変。制限が掛かると編集済みで公開値との比較なし', () => {
  ['intel-rpl-14700hx', 'intel-arl-275hx', 'intel-mtl-185h', 'amd-zen4-7945hx', 'intel-arl-285h', 'amd-strixhalo-395'].forEach((id) => {
    const base = E.evaluate(design.fromPreset(P(id), { mode: 'reproduce' }), ctx);
    const sorted = CLASSES.slice().sort((a, b) => a[1] - b[1]);
    let prev = -Infinity;
    sorted.forEach(([c, w]) => {
      const ev = evalC(id, c);
      assert.ok(ev.mt.ok, id); assert.strictEqual(ev.st.score, base.st.score, id + '/' + c + ' ST は不変');
      assert.ok(ev.mt.score >= prev - 1e-9, `${id}/${c}: ${ev.mt.score} < ${prev}`); prev = ev.mt.score;
      assert.ok(ev.mt.score <= base.mt.score + 1e-9, id + '/' + c + ': 冷却で MT は上がらない');
      const W0 = F.mtPublishedW(P(id)).w; const limited = w < W0;
      assert.strictEqual(ev.edited, limited, `${id}/${c}: 制限が掛かるときだけ編集済み`);
      if (limited) { assert.strictEqual(ev.mt.errPct, null); assert.strictEqual(ev.mt.published, null); assert.strictEqual(ev.mt.clockInfo.source, 'cooling'); assert.strictEqual(ev.mt.clockInfo.powerW, w); assert.strictEqual(ev.mt.clockInfo.coolingLimit.fromW, W0); assert.strictEqual(ev.mt.clockInfo.coolingLimit.coolingId, c); assert.ok(ev.warnings.some((x) => /マルチ性能は冷却/.test(x.text) && x.text.includes(`${w} W`))); }
      else { assert.strictEqual(ev.mt.score, base.mt.score, id + '/' + c + ': 制限なしなら不変'); assert.strictEqual(ev.mt.errPct, base.mt.errPct); }
    });
  });
});

test('MT の W: min(公表電力から決めた W, 冷却の持続電力)。選んだ TDP がある場合はその値と比べる。係数は従来の連続式のまま', () => {
  const p = P('intel-rpl-14700hx');
  const q = JSON.parse(JSON.stringify(p));
  assert.strictEqual(F.mtPublishedW(q).w, 157); // 既定は range.maxW
  q.power.coolingW = 125; q.power.coolingId = 'laptop-gaming';
  const r = F.mtPublishedW(q); assert.deepStrictEqual([r.w, r.source, r.fromW, r.fromSource], [125, 'cooling', 157, 'range.maxW']);
  assert.ok(Math.abs(F.mtClockInfo(q).factor - 0.443 * Math.pow(125, 0.15)) < 1e-12);
  q.power.coolingW = 200; assert.strictEqual(F.mtPublishedW(q).source, 'range.maxW'); // 冷却の方が大きければ従来どおり
  q.power.coolingW = 125; q.power.tdpW = 100; const s = F.mtPublishedW(q);
  assert.strictEqual(s.w, 100); assert.strictEqual(s.source, 'selected'); // 選んだ TDP 100W < 冷却 125W なら TDP のまま
  q.power.tdpW = 150; const u = F.mtPublishedW(q); assert.deepStrictEqual([u.w, u.source, u.fromW, u.fromSource], [125, 'cooling', 150, 'selected']);
  // coolingW が無い(従来の呼び出し)は不変
  assert.strictEqual(F.mtPublishedW(P('intel-rpl-14700hx')).source, 'range.maxW');
});

test('冷却を変えても ST は不変・pc は不変の上で、冷却の影響は設計書の想定どおり緩やか(指数 0.15)', () => {
  // 14700HX: 公表電力 157W → ゲーミング標準 125W → 標準 45W。MT の比は係数の比(0.443·W^0.15)とほぼ一致する(性能は周波数にほぼ比例だが完全な比例ではないので ±1%)
  const base = E.evaluate(design.fromPreset(P('intel-rpl-14700hx'), { mode: 'reproduce' }), ctx).mt.score;
  const g = evalC('intel-rpl-14700hx', 'laptop-gaming').mt.score; const s = evalC('intel-rpl-14700hx', 'laptop-standard').mt.score;
  assert.ok(Math.abs(g / base - Math.pow(125 / 157, 0.15)) < 0.01, String(g / base));
  assert.ok(Math.abs(s / base - Math.pow(45 / 157, 0.15)) < 0.04, String(s / base)); // 45W は式から外れるほど離れるので許容を広げた(性能は周波数に完全には比例しない: L3・メモリ項)
  assert.ok(s / base > 0.8, '45W にしても MT は 2 割も下がらない(実機の機体差〔GB6 で最大÷最小 1.2〜1.3〕より小さい。設計書 §5.3.0 に明記)');
});

test('保存互換: 冷却 ID の保存・読み込みで新クラスが残り、評価も同じ。旧データ(thin-laptop)は従来どおり。未知の ID は MT を制限しない', () => {
  const d = withCooling('intel-arl-275hx', 'laptop-standard');
  const back = design.parse(design.serialize(d)); assert.ok(back.ok, back.reason);
  assert.strictEqual(back.design.package.coolingId, 'laptop-standard');
  const a = E.evaluate(d, ctx); const b = E.evaluate(back.design, ctx);
  assert.strictEqual(b.mt.score, a.mt.score); assert.strictEqual(b.edited, true);
  // 旧データ: 既定の冷却(thin-laptop)のまま保存したもの
  const old = design.fromPreset(P('intel-arl-275hx'), { mode: 'reproduce' }); assert.strictEqual(old.package.coolingId, 'thin-laptop');
  const oldBack = design.parse(design.serialize(old)); assert.ok(oldBack.ok);
  const o = E.evaluate(oldBack.design, ctx); assert.strictEqual(o.edited, false); assert.strictEqual(o.mt.errPct, E.evaluate(old, ctx).mt.errPct);
  // 一覧にない冷却 ID(将来の版で消えた等): 評価は MT を制限せず従来どおり
  const odd = JSON.parse(design.serialize(old)); odd.package.coolingId = 'no-such-cooling';
  const p2 = design.parse(JSON.stringify(odd)); assert.ok(p2.ok, p2.reason);
  assert.strictEqual(E.evaluate(p2.design, ctx).mt.score, E.evaluate(old, ctx).mt.score);
});

test('熱モデルは新クラスでも動く(熱抵抗は仮置き)。持続電力の大きいクラスほど持続クロックが高い', () => {
  const id = 'intel-rpl-14700hx';
  const s = (c) => { const th = evalC(id, c).thermal; assert.ok(th.ok, c + ': ' + th.reason); return Object.values(th.sustainedGHz)[0]; };
  assert.ok(s('laptop-thin-light') <= s('laptop-standard') + 1e-9 && s('laptop-standard') <= s('laptop-gaming') + 1e-9 && s('laptop-gaming') <= s('laptop-gaming-large') + 1e-9);
});
