'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const PK = require('../js/ui/packageform.js');
const HD = require('../js/ui/heatdata.js');
const P = (id) => D.presets.find((p) => p.id === id);
const ctx = E.makeContext();
const mk = (id) => design.fromPreset(P(id));
const sumOf = (r) => r.data.dies.reduce((s, d) => s + d.values.reduce((a, v) => a + v, 0), 0);

test('電力制限の解釈: 空欄=制限なし、範囲、全角、W 付き、不正', () => {
  assert.deepStrictEqual(PK.parsePowerLimit(''), { ok: true, value: null });
  assert.deepStrictEqual(PK.parsePowerLimit('  '), { ok: true, value: null });
  assert.strictEqual(PK.parsePowerLimit('65').value, 65);
  assert.strictEqual(PK.parsePowerLimit('１２５ W').value, 125);
  assert.strictEqual(PK.parsePowerLimit('1').value, 1);
  assert.strictEqual(PK.parsePowerLimit('1000').value, 1000);
  ['0', '0.5', '1001', 'abc', '-5', '1e3'].forEach((s) => {
    const r = PK.parsePowerLimit(s); assert.strictEqual(r.ok, false, s); assert.ok(/電力制限/.test(r.reason));
  });
});

test('制限理由の日本語化', () => {
  assert.deepStrictEqual(['none', 'power', 'thermal', 'cooling', 'runaway'].map(PK.limitedByText), ['制限なし', '電力制限', '温度制限', '冷却不足', '熱暴走の恐れ']);
  assert.strictEqual(PK.limitedByText('zzz'), '不明');
});

test('仮値バッジ: tmp=仮値、null/値なし=未取得', () => {
  const subs = Object.fromEntries(D.substrates.map((s) => [s.id, s]));
  assert.strictEqual(PK.sourceBadge(subs['organic-bridge'].conductivityWmK).text, '仮値');
  assert.strictEqual(PK.sourceBadge(subs.organic.conductivityWmK).text, '二次');
  assert.strictEqual(PK.sourceBadge(subs['si-interposer'].maxPackageMm2).text, '公表');
  assert.strictEqual(PK.sourceBadge(null).text, '未取得');
  const rows = PK.substrateRows(subs.fanout);
  assert.strictEqual(rows.find((r) => r.label === '熱伝導率').text, '未取得');
  assert.strictEqual(rows.find((r) => r.label === 'コスト係数').badge.text, '仮値');
  assert.strictEqual(PK.substrateRows(subs.glass).find((r) => r.label === '最大パッケージ').badge.text, '未取得');
});

test('履歴ラベルと冷却の選択肢', () => {
  assert.strictEqual(PK.packageLabel('cooling', D.cooling, 'air-tower', 'passive-phone'), '冷却: 空冷タワー→パッシブ(スマホ相当)');
  assert.strictEqual(PK.powerLimitLabel(null, 65), '電力制限: 制限なし→65 W');
  assert.ok(/仮置き/.test(PK.coolingOptionText(D.cooling[0])));
});

test('Tj 表示の状態: 非収束は数値を出さず最後の反復値は参考', () => {
  assert.strictEqual(PK.tjView({ ok: true, tjC: 80, tjLastC: 80 }).state, 'ok');
  const r = PK.tjView({ ok: true, tjC: null, tjLastC: 312.5 });
  assert.strictEqual(r.state, 'runaway'); assert.strictEqual(r.lastC, 312.5); assert.ok(!('tjC' in r));
  assert.strictEqual(PK.tjView({ ok: false, reason: 'x' }).state, 'na');
});

test('持続クロックの比', () => {
  const rows = PK.sustainedRows({ ok: true, sustainedGHz: { P: 4, E: 3 } }, [{ type: 'P', boostGHz: 5 }, { type: 'E', baseGHz: 3 }]);
  assert.strictEqual(rows[0].ratioPct, 80); assert.strictEqual(rows[1].ratioPct, 100);
  assert.deepStrictEqual(PK.sustainedRows({ ok: false }, []), []);
});

test('buildHeatmap(power/temp): 値は 0〜1、電力の合計は estW を保つ(漏れ電力込み)', () => {
  const d = mk('intel-rpl-13900k'); const ev = E.evaluate(d, ctx);
  assert.ok(ev.powerModel.ok && ev.thermal.ok && ev.thermal.tjC != null);
  ['power', 'temp'].forEach((kind) => {
    const r = HD.buildHeatmap(d, ev, kind, ctx);
    assert.ok(r.ok, r.reason);
    assert.strictEqual(r.data.kind, kind);
    assert.strictEqual(r.data.dies.length, d.dies.length);
    r.data.dies.forEach((x) => {
      assert.strictEqual(x.values.length, x.nx * x.ny);
      assert.ok(x.cellMm > 0);
      for (const v of x.values) assert.ok(v >= 0 && v <= 1);
    });
    assert.ok(/推定\(確度:低\)/.test(r.data.note) && /模式図/.test(r.data.note));
  });
  // 電力: 凡例の max は W/mm²。合計電力 = Σ rho×面積 は heatmap 側のテストで担保済みなので、ここでは凡例を確認
  const rp = HD.buildHeatmap(d, ev, 'power', ctx);
  assert.strictEqual(rp.data.legend.unit, 'W/mm²'); assert.ok(rp.data.legend.max > rp.data.legend.min);
  const rt = HD.buildHeatmap(d, ev, 'temp', ctx);
  assert.strictEqual(rt.data.legend.unit, '°C');
  const amb = D.cooling.find((c) => c.id === ev.thermal.coolingId).tAmbC;
  assert.ok(rt.data.legend.min >= amb - 1e-6 && rt.data.legend.max >= ev.thermal.tjC - 1e-6);
});

test('buildHeatmap: 合計電力が保たれる(heatmap の按分と同じ estW)', () => {
  const HM = require('../js/sim/heatmap.js');
  const d = mk('intel-rpl-13900k'); const ev = E.evaluate(d, ctx);
  const bp = HM.blockPowers(d, ev.powerModel.estW);
  const tot = Object.values(bp.byBlock).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(tot - ev.powerModel.estW) < 1e-6);
  const pg = HM.powerDensityGrid(d, bp.byBlock);
  let w = 0; pg.grids.forEach((g) => { for (let k = 0; k < g.rho.length; k++) w += g.rho[k] * g.cellW * g.cellH; });
  assert.ok(Math.abs(w - ev.powerModel.estW) / ev.powerModel.estW < 1e-3);
});

test('buildHeatmap: 電力モデル不可は ok:false と理由(数値を出さない)', () => {
  const d = mk('amd-zen3-5800x'); const ev = E.evaluate(d, ctx);
  if (ev.powerModel.ok) return; // このプリセットが校正可能なら別の不可ケースを下で作る
  const r = HD.buildHeatmap(d, ev, 'power', ctx);
  assert.strictEqual(r.ok, false); assert.ok(r.reason.length > 0); assert.ok(!('data' in r));
});

test('buildHeatmap: 疑似的な不可・非収束・不正入力', () => {
  const d = mk('intel-rpl-13900k'); const ev = E.evaluate(d, ctx);
  const bad = Object.assign({}, ev, { powerModel: { ok: false, reason: '基本電力または基本クロックが未取得' } });
  ['power', 'temp'].forEach((k) => {
    const r = HD.buildHeatmap(d, bad, k, ctx);
    assert.strictEqual(r.ok, false); assert.ok(/基本電力/.test(r.reason));
  });
  const run = Object.assign({}, ev, { thermal: Object.assign({}, ev.thermal, { tjC: null, tjLastC: 400 }) });
  const rt = HD.buildHeatmap(d, run, 'temp', ctx);
  assert.strictEqual(rt.ok, false); assert.ok(/熱暴走/.test(rt.reason));
  assert.strictEqual(HD.buildHeatmap(d, run, 'power', ctx).ok, true); // 電力密度は温度に依存しない
  assert.strictEqual(HD.buildHeatmap(d, ev, 'place', ctx).ok, false);
  assert.strictEqual(HD.buildHeatmap(null, ev, 'power', ctx).ok, false);
});

test('パッケージ: A 再現(ロック中)でも冷却を変えられ、評価に反映される', () => {
  const d = mk('intel-rpl-13900k');
  assert.strictEqual(d.locks.params, true);
  const r = design.setCooling(d, 'passive-phone');
  assert.ok(r.ok);
  const e1 = E.evaluate(d, ctx); const e2 = E.evaluate(r.design, ctx);
  assert.ok(e2.thermal.rTotal > e1.thermal.rTotal);
  assert.strictEqual(design.setCooling(d, 'nope').ok, false);
  assert.strictEqual(design.setPowerLimit(d, 0).ok, false);
});

test('電力制限の出所の表示', () => {
  assert.strictEqual(PK.powerLimitSourceText({ powerLimitW: 258.6, powerLimitSource: 'peak' }), '初期値: 公表のピーク電力から(258.6 W)');
  assert.strictEqual(PK.powerLimitSourceText({ powerLimitW: 65, powerLimitSource: 'base' }), '初期値: 公表の基本電力から(65 W)');
  assert.strictEqual(PK.powerLimitSourceText({ powerLimitW: 100, powerLimitSource: 'user' }), '');
  assert.strictEqual(PK.powerLimitSourceText({ powerLimitW: null, powerLimitSource: null }), '');
});

test('buildHeatmap: 凡例の最小・最大・表示範囲・最高のダイ名をテキストでも示し、平均/局所の注記を入れる', () => {
  const d = mk('intel-rpl-13900k'); const ev = E.evaluate(d, ctx);
  const t = HD.buildHeatmap(d, ev, 'temp', ctx);
  assert.ok(/最小 [\d.]+ 〜 最大 [\d.]+ °C/.test(t.legendText) && /表示範囲 [\d.]+ K/.test(t.legendText) && /最高はダイ/.test(t.legendText));
  assert.ok(/ダイ平均/.test(t.longNote) && /TIM/.test(t.longNote));
  const p = HD.buildHeatmap(d, ev, 'power', ctx);
  assert.ok(/W\/mm²/.test(p.legendText) && !/TIM/.test(p.longNote));
});
