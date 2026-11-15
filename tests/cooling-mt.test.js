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
const CLASSES = [['laptop-thin-light', 28], ['laptop-standard', 46.5], ['laptop-workstation', 66], ['laptop-thin-dgpu', 65], ['laptop-gaming', 125], ['laptop-gaming-large', 145]];
const OLD = ['passive-phone', 'thin-laptop', 'small-fan', 'air-tower', 'aio-360'];

test('冷却データ: ノート PC の 6 クラスは sustainedW([実測]・幅・件数・取得日・出典つき)を持ち、既存の仮置き 5 件は持たない', () => {
  const by = Object.fromEntries(D.cooling.map((c) => [c.id, c]));
  assert.strictEqual(D.cooling.length, 11);
  OLD.forEach((id) => { assert.ok(by[id], id); assert.strictEqual(by[id].sustainedW, undefined, id); assert.strictEqual(by[id].s, 'tmp'); });
  const want = { 'laptop-thin-light': [28, [15, 35], 9], 'laptop-standard': [46.5, [35, 60], 6], 'laptop-thin-dgpu': [65, [50, 90], 9], 'laptop-gaming': [125, [95, 160], 7], 'laptop-gaming-large': [145, [130, 175], 6], 'laptop-workstation': [66, [60, 90], 3] };
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
  // 2026-11-15: 14700HX は power.typicalW 69W を持つ(典型電力。range.maxW より優先)。この旧来の規則(既定は range.maxW)の確認は typicalW を外した複製で行い、typicalW ありは下の別ブロックで確認する
  assert.strictEqual(F.mtPublishedW(q).w, 69); assert.strictEqual(F.mtPublishedW(q).source, 'typical');
  delete q.power.typicalW;
  assert.strictEqual(F.mtPublishedW(q).w, 157); // 既定は range.maxW
  q.power.coolingW = 125; q.power.coolingId = 'laptop-gaming';
  const r = F.mtPublishedW(q); assert.deepStrictEqual([r.w, r.source, r.fromW, r.fromSource], [125, 'cooling', 157, 'range.maxW']);
// 2026-11-13: PC 系 CPU の GB7 を Windows のみの中央値に差し替えたため、連続式の c を 0.443 → 0.411 に再校正した(標本 11 件の k_i ÷ W_i^0.15 の中央値 0.4115。p=0.15 は LOO 最小のまま)
  assert.ok(Math.abs(F.mtClockInfo(q).factor - 0.405 * Math.pow(125, 0.15)) < 1e-12); // 2026-11-13(Windows のみ化 第 2 回): c 0.411 → 0.406(Cougar Cove の uCal 追加後の再校正。標本 11 件の中央値 0.4063) // 2026-11-14: c 0.406 → 0.411(Redwood Cove の uCal 99.5 を追加したあとの再校正。標本 11 件の中央値 0.4114)
  q.power.coolingW = 200; assert.strictEqual(F.mtPublishedW(q).source, 'range.maxW'); // 冷却の方が大きければ従来どおり
  q.power.coolingW = 125; q.power.tdpW = 100; const s = F.mtPublishedW(q);
  assert.strictEqual(s.w, 100); assert.strictEqual(s.source, 'selected'); // 選んだ TDP 100W < 冷却 125W なら TDP のまま
  q.power.tdpW = 150; const u = F.mtPublishedW(q); assert.deepStrictEqual([u.w, u.source, u.fromW, u.fromSource], [125, 'cooling', 150, 'selected']);
  // coolingW が無い(従来の呼び出し)は不変(typicalW を持たない SKU は range.maxW。14700HX は典型電力)
  assert.strictEqual(F.mtPublishedW(P('intel-rpl-14900hx')).source, 'range.maxW'); assert.strictEqual(F.mtPublishedW(P('intel-rpl-14700hx')).source, 'typical');
  { // typicalW あり(14700HX): 選んだ TDP が無ければ typicalW(69W)。冷却は min(typicalW, coolingW)。選んだ TDP は typicalW より優先
    const t = JSON.parse(JSON.stringify(p)); assert.deepStrictEqual([F.mtPublishedW(t).w, F.mtPublishedW(t).source], [69, 'typical']);
    t.power.coolingW = 46.5; t.power.coolingId = 'laptop-standard'; const a = F.mtPublishedW(t); assert.deepStrictEqual([a.w, a.source, a.fromW, a.fromSource], [46.5, 'cooling', 69, 'typical']);
    t.power.coolingW = 125; assert.deepStrictEqual([F.mtPublishedW(t).w, F.mtPublishedW(t).source], [69, 'typical']); // 冷却の方が大きければ typicalW のまま
    t.power.tdpW = 100; assert.deepStrictEqual([F.mtPublishedW(t).w, F.mtPublishedW(t).source], [100, 'selected']);
    assert.ok(Math.abs(F.mtClockInfo(P('intel-rpl-14700hx')).factor - 0.405 * Math.pow(69, 0.15)) < 1e-12); assert.strictEqual(F.mtClockInfo(P('intel-rpl-14700hx')).powerW, 69);
  }
});

test('冷却を変えても ST は不変・pc は不変の上で、冷却の影響は設計書の想定どおり緩やか(指数 0.15)', () => {
  // 2026-11-15: 14700HX は typicalW 69W を持つので、同じ 157W の 14900HX で確認する。14900HX: 公表電力 157W → ゲーミング標準 125W → 標準 46.5W。MT の比は係数の比(0.443·W^0.15)とほぼ一致する(性能は周波数にほぼ比例だが完全な比例ではないので ±1%)
  const base = E.evaluate(design.fromPreset(P('intel-rpl-14900hx'), { mode: 'reproduce' }), ctx).mt.score;
  const g = evalC('intel-rpl-14900hx', 'laptop-gaming').mt.score; const s = evalC('intel-rpl-14900hx', 'laptop-standard').mt.score;
  assert.ok(Math.abs(g / base - Math.pow(125 / 157, 0.15)) < 0.01, String(g / base));
    // 係数は厳密に 0.443·W^0.15(W = 46.5)。MT の比は係数の比に近いが、L3・メモリ項があるので比そのものは検証せず、係数で見る
  assert.strictEqual(evalC('intel-rpl-14900hx', 'laptop-standard').mt.clockFactor, 0.405 * Math.pow(46.5, 0.15)); // 2026-11-13(Windows のみ化 第 2 回): c 0.411 → 0.406 // 2026-11-14: c 0.406 → 0.411(Redwood Cove の uCal 99.5 を追加したあとの再校正。標本 11 件の中央値 0.4114)
  assert.strictEqual(evalC('intel-rpl-14900hx', 'laptop-gaming').mt.clockFactor, 0.405 * Math.pow(125, 0.15)); // 2026-11-14: c 0.406 → 0.411(Redwood Cove の uCal 99.5 を追加したあとの再校正。標本 11 件の中央値 0.4114)
  assert.ok(s / base > 0.8, '46.5W にしても MT は 2 割も下がらない(実機の機体差〔GB6 で最大÷最小 1.2〜1.3〕より小さい。設計書 §5.3.0 に明記)');
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

test('evaluate: 選んだ TDP と冷却の組み合わせで edited・errPct が決まる(TDP 既定+制限なしは編集済みでない)', () => {
  const id = 'intel-arl-275hx'; /* 2026-11-15: 14700HX は typicalW 69W を持ち既定の W が range.maxW ではないので、range.maxW が既定の 275HX で確認する(typicalW ありの扱いは下の別テスト) */ const rg = P(id).power.range;
  const base = design.fromPreset(P(id), { mode: 'reproduce' });
  const e0 = E.evaluate(base, ctx); assert.strictEqual(e0.edited, false); assert.notStrictEqual(e0.mt.errPct, null);
  const tdp = (d, w) => { const r = design.setTdp(d, w, rg); assert.ok(r.ok, r.reason); return r.design; };
  // TDP を既定(範囲の上限)のまま選び、冷却の制限なし(既存の仮置き冷却): 編集済みでない
  assert.strictEqual(E.evaluate(tdp(base, rg.maxW), ctx).edited, false);
  // 選んだ TDP 150W、冷却 125W: 冷却で制限(制限前の出所は選んだ TDP)。編集済みで公開値との比較なし
  const a = E.evaluate(design.setCooling(tdp(base, 150), 'laptop-gaming').design, ctx);
  assert.strictEqual(a.edited, true); assert.strictEqual(a.mt.errPct, null);
  assert.deepStrictEqual([a.mt.clockInfo.source, a.mt.clockInfo.coolingLimit.fromSource, a.mt.clockInfo.coolingLimit.fromW, a.mt.clockInfo.powerW], ['cooling', 'selected', 150, 125]);
  // 選んだ TDP 100W、冷却 125W: 制限は TDP のまま(冷却は効かない)。TDP が既定でないので編集済み
  const b = E.evaluate(design.setCooling(tdp(base, 100), 'laptop-gaming').design, ctx);
  assert.strictEqual(b.edited, true); assert.strictEqual(b.mt.errPct, null); assert.strictEqual(b.mt.clockInfo.source, 'selected'); assert.strictEqual(b.mt.clockInfo.powerW, 100);
  // 設定(cfg)を持たない設計では、冷却の制限を入れず errPct も出さない
  const noCfg = JSON.parse(JSON.stringify(withCooling(id, 'laptop-standard'))); delete noCfg.cfg;
  const n = E.evaluate(noCfg, ctx); assert.ok(!(n.mt && n.mt.clockInfo && n.mt.clockInfo.source === 'cooling'));
});

// 2026-11-15: 典型電力 typicalW(14700HX。power.typicalW 69W [推定・校正値])。MT のクロックを決める W だけに使う。冷却の制限・選んだ TDP は従来どおり効く。冷却・温度・電力・ST は公表電力基準のまま。他の SKU の判定は不変
test('typicalW: 14700HX の MT は 69W で計算され(+12.8% → +1.8%)、選んだ TDP・冷却は従来どおり効き、typicalW と同じ TDP は既定のまま', () => {
  const id = 'intel-rpl-14700hx'; const p = P(id); const rg = p.power.range;
  assert.strictEqual(p.power.typicalW, 69); assert.ok(typeof p.power.typicalNote === 'string' && /68.9W/.test(p.power.typicalNote) && /0.818/.test(p.power.typicalNote) && /推定・校正値/.test(p.power.typicalNote));
  const base = E.evaluate(design.fromPreset(p, { mode: 'reproduce' }), ctx);
  assert.strictEqual(base.edited, false); assert.ok(Math.abs(base.mt.errPct - 1.80) < 0.05, String(base.mt.errPct));
  assert.strictEqual(base.mt.clockInfo.source, 'typical'); assert.strictEqual(base.mt.clockInfo.powerW, 69); assert.strictEqual(base.mt.clockFactor, 0.405 * Math.pow(69, 0.15));
  assert.deepStrictEqual(base.mt.detail.map((d) => [d.type, +d.fGHz.toFixed(2)]), [['P', 4.20], ['E', 2.98]]);
  // typicalW を外すと従来の range.maxW(157W)で +12.8%
  const q = JSON.parse(JSON.stringify(p)); delete q.power.typicalW;
  const r157 = F.mtScore(q, E.makeContext().cal, D.uarch, null); assert.ok(r157.ok);
  assert.ok(Math.abs(r157.score / base.mt.score - 17369.902 / 15672.313) < 1e-3);
  // 冷却 46.5W は typicalW より低いので制限が掛かる(制限前の出所は typical)。125W は typicalW より高いので効かない(編集済みでもない)
  const c1 = evalC(id, 'laptop-standard'); assert.deepStrictEqual([c1.mt.clockInfo.source, c1.mt.clockInfo.coolingLimit.fromSource, c1.mt.clockInfo.coolingLimit.fromW, c1.mt.clockInfo.powerW], ['cooling', 'typical', 69, 46.5]); assert.strictEqual(c1.edited, true);
  const c2 = evalC(id, 'laptop-gaming'); assert.strictEqual(c2.edited, false); assert.strictEqual(c2.mt.score, base.mt.score);
  // TDP: typicalW(69W)と同じなら既定のまま(編集済みでない)。範囲の上限 157W を選ぶと既定ではなく(編集済み・公開値の比較なし)、W=157 で計算される
  const tdp = (w) => { const r = design.setTdp(design.fromPreset(p, { mode: 'reproduce' }), w, rg); assert.ok(r.ok, r.reason); return E.evaluate(r.design, ctx); };
  assert.strictEqual(tdp(69).edited, false); assert.strictEqual(tdp(69).mt.score, base.mt.score);
  const t157 = tdp(157); assert.strictEqual(t157.edited, true); assert.strictEqual(t157.mt.errPct, null); assert.strictEqual(t157.mt.clockInfo.source, 'selected'); assert.ok(Math.abs(t157.mt.score - 17369.902) < 0.01, String(t157.mt.score));
  // ST は typicalW の影響を受けない(typicalW を外した複製でも同じ。電力・温度・面積は評価がプリセットの power.typicalW を読まない〔106 件の評価の前後比較で ST・電力・温度・面積の不一致 0 を確認〕)
  assert.strictEqual(F.stScore(p, E.makeContext().cal, D.uarch).score, F.stScore(q, E.makeContext().cal, D.uarch).score);
  // typicalW を持つ SKU は 14700HX だけ(他の SKU の MT の W は従来どおり)
  assert.deepStrictEqual(D.presets.filter((x) => x.power && x.power.typicalW !== undefined).map((x) => x.id), ['intel-rpl-14700hx']);
  // UI の注記文(結果パネル): 典型電力を使っていることが出る
  const res = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'ui', 'results.js'), 'utf8'); assert.ok(/典型電力 typicalW/.test(res) && /公表電力ではありません/.test(res));
});
