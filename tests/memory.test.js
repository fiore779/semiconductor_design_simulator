// メモリ構成の選択(設計書 §5.2.4)。基準構成での完全一致・係数の向きと大きさ・検証・保存往復・履歴・UI の純ロジック。
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { D } = require('./helpers');
const M = require('../js/sim/memory.js');
const DS = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const DF = require('../js/model/diff.js');
const PF = require('../js/ui/paramform.js');
const CF = require('../js/ui/compareform.js');
const EX = require('../js/ui/exporter.js');
const { createHistory } = require('../js/history/history.js');
const ctx = E.makeContext();
const preset = (id) => D.presets.find((p) => p.id === id);
const impr = (id) => DS.fromPreset(preset(id), { mode: 'improve' });
const ev = (d) => E.evaluate(d, ctx);
const withMem = (id, type, mts) => { const r = DS.setMemory(impr(id), type, mts); assert.ok(r.ok, r.reason); return r.design; };
const pc = (a, b) => (a / b - 1) * 100;

// 変更前(メモリ機能の追加前)に取った全プリセットの評価値。ST/MT/電力/温度/持続クロックが 1 ビットも変わらないこと
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'memory-baseline.json'), 'utf8'));
const snap = (r) => ({
  st: r.st.ok ? r.st.score : null, mt: r.mt.ok ? r.mt.score : null, stErr: r.st.errPct, mtErr: r.mt.errPct,
  estW: r.powerModel && r.powerModel.ok ? r.powerModel.estW : null, tjC: r.thermal && r.thermal.ok ? r.thermal.tjC : null,
  sus: r.thermal && r.thermal.ok ? r.thermal.sustainedGHz : null, powerW: r.thermal && r.thermal.ok ? r.thermal.powerW : null,
});

test('既定の選択(基準構成)では、全プリセットの ST/MT/電力/温度が変更前と完全一致(再現・改良の両方)', () => {
  assert.strictEqual(Object.keys(baseline).length, D.presets.length);
  D.presets.forEach((p) => {
    ['reproduce', 'improve'].forEach((mode) => {
      const r = ev(DS.fromPreset(p, { mode }));
      assert.deepStrictEqual(JSON.parse(JSON.stringify(snap(r))), baseline[p.id], `${p.id} (${mode})`);
    });
  });
});

test('基準構成を明示的に選んでも(cfg.mem = ref)完全一致し、編集済みにならない', () => {
  let n = 0;
  D.presets.forEach((p) => {
    const o = M.optionsOf(p.id);
    if (!o) return;
    n++;
    const d = DS.fromPreset(p, { mode: 'improve' });
    const r = DS.setMemory(d, o.ref.type, o.ref.mts);
    assert.ok(r.ok, p.id);
    assert.strictEqual(E.isEdited(r.design), false, p.id);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(snap(ev(r.design)))), baseline[p.id], p.id);
  });
  assert.ok(n >= 35, `選択肢のあるプリセット ${n} 件`);
});

test('メモリ固定・混合・D はメモリ係数 1 で、選択肢が出ない', () => {
  ['intel-lnl-268v', 'amd-strixhalo-395', 'apple-m4', 'qc-8elite', 'mt-9400', 'nv-thor'].forEach((id) => {
    assert.strictEqual(M.optionsOf(id), null, id);
    const d = impr(id);
    assert.strictEqual(d.cfg.mem, undefined, id);
    assert.deepStrictEqual(PF.memoryView(d), { kind: 'fixed', text: 'メモリは SoC に固定(選択不可)' });
    assert.strictEqual(ev(d).memory, null);
    assert.ok(!DS.setMemory(d, 'DDR5', 5600).ok);
  });
  const mix = DS.fromScratch({ entry: 'new' });
  assert.strictEqual(PF.memoryView(mix), null);
  assert.ok(!DS.setMemory(mix, 'DDR5', 5600).ok);
});

test('DDR5-5600 → LPDDR5X-8000: MT は約 +7.4%(+5〜+9%)、ST は ±2% 以内', () => {
  ['amd-strix-hx370', 'amd-kraken-350'].forEach((id) => {
    const b = ev(impr(id)); const a = ev(withMem(id, 'LPDDR5X', 8000));
    const mt = pc(a.mt.score, b.mt.score); const st = pc(a.st.score, b.st.score);
    assert.ok(mt >= 5 && mt <= 9, `${id} MT ${mt}`);
    assert.ok(Math.abs(mt - 7.39) < 0.1, `${id} MT ${mt}`); // (128/89.6)^0.20
    assert.ok(Math.abs(st) <= 2, `${id} ST ${st}`);
    assert.strictEqual(a.edited, true);
    assert.strictEqual(a.mt.published, null);
  });
});

test('DDR4-3200 → DDR5-4800(Alder Lake): MT は上がり(帯域 +50%)、ST の変化は 3% 以内', () => {
  const b = ev(impr('intel-adl-12900k')); const a = ev(withMem('intel-adl-12900k', 'DDR5', 4800));
  const mt = pc(a.mt.score, b.mt.score); const st = pc(a.st.score, b.st.score);
  assert.ok(mt > 7 && mt < 11, `MT ${mt}`);
  assert.ok(Math.abs(st) < 3, `ST ${st}`);
});

test('DDR5 → DDR4(Raptor Lake): MT は下がる。遅延が小さい DDR4 で ST は帯域低下ぶんだけ下がる', () => {
  const b = ev(impr('intel-rpl-13900k')); const a = ev(withMem('intel-rpl-13900k', 'DDR4', 3200));
  assert.ok(a.mt.score < b.mt.score * 0.92);
  assert.ok(a.st.score < b.st.score && a.st.score > b.st.score * 0.95);
});

test('係数の単調性: 同じ種別で速度を上げると MT 係数と ST 帯域項は単調に増え、MT は減らない', () => {
  let checked = 0;
  D.presets.forEach((p) => {
    const o = M.optionsOf(p.id);
    if (!o) return;
    o.options.forEach((x) => {
      let prev = null;
      x.speeds.forEach((s) => {
        const m = M.evaluate({ id: p.id, cfg: { mem: { type: x.type, mts: s } } });
        assert.ok(m.active && !m.invalid);
        if (prev) { assert.ok(m.mtFactor > prev.mtFactor, `${p.id} ${x.type}-${s}`); assert.ok(m.stBwFactor > prev.stBwFactor); assert.strictEqual(m.dramScale, prev.dramScale); checked++; }
        prev = m;
      });
    });
    // 実スコアでも MT は速度に対して非減少
    const x = o.options[0]; let last = -Infinity;
    x.speeds.forEach((s) => { const d = DS.setMemory(impr(p.id), x.type, s).design; const mt = ev(d).mt.score; assert.ok(mt >= last - 1e-9, p.id); last = mt; });
  });
  assert.ok(checked > 20);
});

test('選択肢: 対応最大を超える速度は出さず、基準は必ず選択肢に含まれる。表の整合', () => {
  const ids = Object.keys(D.memory);
  assert.ok(ids.length >= 35);
  ids.forEach((id) => {
    assert.ok(preset(id), `表の id ${id} がプリセットに無い`);
    const o = M.optionsOf(id);
    assert.strictEqual(M.check(id, o.ref), null, id);
    o.options.forEach((x) => {
      assert.ok(['pub', 'sec'].includes(x.s) && x.src, `${id} 区分/出典`);
      assert.ok(x.speeds.length >= 1 && Math.max.apply(null, x.speeds) === x.max, id);
      assert.ok(x.speeds.every((v) => v <= x.max));
    });
  });
  // 具体例(ARK / Wikipedia どおり)
  assert.deepStrictEqual(M.optionsOf('intel-ptl-x9-388h').options.map((x) => x.type), ['LPDDR5X']); // 388H は LPDDR5X のみ(DDR5-7200 は誤り)
  assert.deepStrictEqual(M.optionsOf('intel-ptl-x9-386h').options.map((x) => x.type), ['LPDDR5X', 'DDR5']);
  assert.strictEqual(M.check('intel-ptl-x9-388h', { type: 'DDR5', mts: 7200 }) !== null, true);
  assert.strictEqual(M.check('intel-rpl-14900k', { type: 'DDR5', mts: 5600 }), null);
  assert.notStrictEqual(M.check('intel-rpl-14900k', { type: 'DDR5', mts: 6000 }), null); // 対応最大 5600 を超える
  assert.notStrictEqual(M.check('amd-zen5-9950x', { type: 'DDR4', mts: 3200 }), null); // DDR4 非対応
  assert.deepStrictEqual(M.optionsOf('amd-zen5-9950x').options.length, 1); // DDR5 のみ(速度だけ)
  assert.strictEqual(M.optionsOf('amd-epyc-7401').bits, 512);
  assert.ok(M.optionsOf('amd-strix-hx370').options.find((x) => x.type === 'LPDDR5X').speeds.includes(8000));
  assert.ok(!M.optionsOf('amd-strix-hx370').options.find((x) => x.type === 'DDR5').speeds.includes(6000));
});

test('設定の検証: 対応外の選択・不正な形式・再現モード(ロック)は拒否される', () => {
  const d = impr('amd-strix-hx370');
  assert.ok(!DS.setMemory(d, 'DDR4', 3200).ok);
  assert.ok(!DS.setMemory(d, 'DDR5', 6000).ok);
  assert.ok(!DS.setMemory(d, 'LPDDR5X', 9600).ok);
  assert.ok(!DS.setMemory(d, 'DDR5', '5600').ok);
  assert.ok(!DS.setMemory(d, '__proto__', 5600).ok);
  assert.ok(!DS.setMemory(d, 'DDR5', NaN).ok);
  const locked = DS.fromPreset(preset('amd-strix-hx370'), { mode: 'reproduce' });
  const r = DS.setMemory(locked, 'LPDDR5X', 8000);
  assert.ok(!r.ok); assert.ok(/ロック/.test(r.reason));
  // 元の設計は壊れない
  assert.deepStrictEqual(d.cfg.mem, { type: 'DDR5', mts: 5600 });
});

test('保存往復: serialize → parse で選択が残り、評価も同じ。悪意ある JSON は拒否される', () => {
  const d = withMem('amd-strix-hx370', 'LPDDR5X', 8000);
  const p = DS.parse(DS.serialize(d));
  assert.ok(p.ok, p.reason);
  assert.deepStrictEqual(p.design.cfg.mem, { type: 'LPDDR5X', mts: 8000 });
  assert.strictEqual(ev(p.design).mt.score, ev(d).mt.score);
  const bad = (f) => { const x = JSON.parse(DS.serialize(d)); f(x); return DS.parse(JSON.stringify(x)); };
  assert.ok(!bad((x) => { x.cfg.mem = { type: 'DDR5', mts: 9999 }; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = { type: 'DDR4', mts: 3200 }; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = { type: 'DDR5', mts: '5600' }; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = { type: 'DDR5', mts: 5600, extra: 1 }; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = null; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = [1, 2]; }).ok);
  assert.ok(!bad((x) => { x.baseCfg.mem = { type: 'LPDDR5X', mts: 12000 }; }).ok);
  assert.ok(!bad((x) => { x.presetId = 'apple-m4'; }).ok); // メモリ固定のチップに選択は付けられない
  assert.ok(!bad((x) => { x.presetId = null; x.origin = { mode: 'mix', parts: [] }; x.mix = { nodeId: null }; }).ok);
  assert.ok(!bad((x) => { x.cfg.mem = JSON.parse('{"__proto__":{"type":"DDR5"},"type":"DDR5","mts":5600}'); }).ok);
  // mem が無い古い設計はそのまま読める(基準構成として評価)
  const old = JSON.parse(DS.serialize(impr('amd-strix-hx370'))); delete old.cfg.mem; delete old.baseCfg.mem;
  const po = DS.parse(JSON.stringify(old)); assert.ok(po.ok, po.reason);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(snap(ev(po.design)))), baseline['amd-strix-hx370']);
  // mem の無い古い設計でも、選択して基準に戻せば未編集に戻る
  const s1 = DS.setMemory(po.design, 'LPDDR5X', 8000); assert.ok(s1.ok); assert.strictEqual(E.isEdited(s1.design), true);
  const s2 = DS.setMemory(s1.design, 'DDR5', 5600); assert.ok(s2.ok); assert.strictEqual(E.isEdited(s2.design), false);
});

test('履歴・差分・元に戻す: メモリの変更は 1 手で、元に戻す/やり直す/項目ごとに戻せる', () => {
  const d0 = impr('amd-strix-hx370');
  const d1 = withMem('amd-strix-hx370', 'LPDDR5X', 8000);
  const h = createHistory({});
  h.push(d0, d1, PF.editLabel('memory', null, 'DDR5-5600', 'LPDDR5X-8000'), { coalesce: false });
  assert.ok(/メモリ DDR5-5600→LPDDR5X-8000/.test(JSON.stringify(h.list())));
  const u = h.undo(); assert.deepStrictEqual(u.cfg.mem, { type: 'DDR5', mts: 5600 });
  const r = h.redo(); assert.deepStrictEqual(r.cfg.mem, { type: 'LPDDR5X', mts: 8000 });
  assert.strictEqual(PF.editLabel('memory', null, 'DDR5-5600', 'LPDDR5X-8000'), 'メモリ DDR5-5600→LPDDR5X-8000');
  const items = DF.paramDiff(d1);
  assert.deepStrictEqual(items, [{ id: 'memory', label: 'メモリ構成', before: 'DDR5-5600', after: 'LPDDR5X-8000', unit: '' }]);
  assert.deepStrictEqual(PF.paramDiffRows(items), [{ id: 'memory', label: 'メモリ構成', before: 'DDR5-5600', after: 'LPDDR5X-8000' }]);
  assert.deepStrictEqual(DF.paramDiff(d0), []);
  const rv = DF.revertParam(d1, 'memory'); assert.deepStrictEqual(rv.design.cfg, d1.baseCfg);
  assert.strictEqual(E.isEdited(rv.design), false);
  assert.deepStrictEqual(DF.revertAll(d1).design.cfg, d1.baseCfg);
  const rd = DF.resultDiff(DF.baseEvaluation(d1, ctx), ev(d1));
  assert.ok(rd.mt.deltaPct > 7 && rd.mt.deltaPct < 8);
  assert.strictEqual(PF.showDiff(d1), true);
});

test('評価結果: メモリ構成と係数が出て、基準と違うときは推定(確度:低)の警告が出る', () => {
  const b = ev(impr('amd-strix-hx370'));
  assert.ok(b.memory.active && b.memory.isRef);
  assert.ok(!b.warnings.some((w) => /メモリ構成による係数/.test(w.text)));
  const a = ev(withMem('amd-strix-hx370', 'LPDDR5X', 8000));
  assert.strictEqual(a.memory.label, 'LPDDR5X-8000');
  assert.strictEqual(a.mt.memory.label, 'LPDDR5X-8000');
  assert.strictEqual(a.mt.clockInfo.memory.refLabel, 'DDR5-5600');
  assert.ok(a.memory.mtFactor > 1.073 && a.memory.mtFactor < 1.075);
  assert.ok(a.warnings.some((w) => w.level === 'warn' && /メモリ構成による係数は推定\(確度:低/.test(w.text)));
  assert.strictEqual(a.st.confidence, 'low');
  assert.ok(a.st.memory && a.st.memory.dramScale > 1); // 遅延 90 → 120 ns
});

test('UI の純ロジック: 再現は表示のみ、改良は select、単一種別は速度のみ、種別変更時の速度', () => {
  const rep = PF.memoryView(DS.fromPreset(preset('amd-strix-hx370'), { mode: 'reproduce' }));
  assert.strictEqual(rep.kind, 'select'); assert.strictEqual(rep.selectable, false); assert.strictEqual(rep.locked, true); assert.strictEqual(rep.label, 'DDR5-5600');
  const imp = PF.memoryView(impr('amd-strix-hx370'));
  assert.strictEqual(imp.selectable, true); assert.strictEqual(imp.single, false);
  assert.deepStrictEqual(imp.types.map((t) => t.type), ['DDR5', 'LPDDR5X']);
  assert.deepStrictEqual(imp.speeds, [4800, 5200, 5600]);
  const one = PF.memoryView(impr('amd-zen5-9950x'));
  assert.strictEqual(one.single, true); assert.deepStrictEqual(one.speeds, [4800, 5200, 5600]);
  const o = M.optionsOf('amd-strix-hx370');
  assert.strictEqual(PF.pickSpeed(o, 'LPDDR5X'), 8000); // 基準と別の種別は対応最大
  assert.strictEqual(PF.pickSpeed(o, 'DDR5'), 5600); // 基準の種別は基準の速度
  assert.strictEqual(PF.pickSpeed(o, 'DDR4'), null);
  // 選択後の速度の表示
  const sel = PF.memoryView(withMem('amd-strix-hx370', 'LPDDR5X', 8000));
  assert.strictEqual(sel.isRef, false); assert.strictEqual(sel.label, 'LPDDR5X-8000'); assert.ok(sel.mtPct > 7 && sel.mtPct < 8);
  // どのプリセットでも select の候補は表と一致
  Object.keys(D.memory).forEach((id) => { const v = PF.memoryView(impr(id)); assert.deepStrictEqual(v.types.map((t) => t.type), D.memory[id].options.map((x) => x.type)); });
});

test('比較・書き出し: メモリ構成の違いが分かる', () => {
  const da = withMem('amd-strix-hx370', 'LPDDR5X', 8000); const db = impr('amd-strix-hx370');
  const a = { design: da, ev: ev(da) }; const b = { design: db, ev: ev(db), sourceKey: 'origin' };
  const notes = CF.compareNotesMulti(a, [b]);
  assert.ok(notes.some((t) => /メモリ構成が違います/.test(t) && /LPDDR5X-8000/.test(t) && /DDR5-5600/.test(t)));
  const rows = CF.compareMulti(a, [b]);
  assert.ok(rows.find((r) => r.key === 'mt').a.sub.some((t) => /メモリ構成 LPDDR5X-8000/.test(t)));
  assert.ok(!CF.compareNotesMulti(b, [b]).some((t) => /メモリ構成が違います/.test(t)));
  const csv = EX.resultRows(da, a.ev);
  const row = csv.find((r) => r.item === 'メモリ構成'); assert.strictEqual(row.value, 'LPDDR5X-8000'); assert.ok(/基準 DDR5-5600/.test(row.note));
  assert.ok(EX.pngInfo(da, a.ev, {}).values.some((v) => /メモリ: LPDDR5X-8000/.test(v.text)));
  assert.ok(JSON.parse(EX.toJson(da)).cfg.mem.mts === 8000);
  // 固定メモリのチップにはメモリ行が出ない
  const dm = impr('apple-m4');
  assert.ok(!EX.resultRows(dm, ev(dm)).some((r) => r.item === 'メモリ構成'));
});

test('定数と式: B_MT=0.20, B_ST=0.05, 帯域比のべき乗、遅延は種別の表', () => {
  assert.strictEqual(M.B_MT, 0.2); assert.strictEqual(M.B_ST, 0.05);
  const m = M.evaluate({ id: 'amd-strix-hx370', cfg: { mem: { type: 'LPDDR5X', mts: 8000 } } });
  assert.ok(Math.abs(m.bwGBs - 128) < 1e-9 && Math.abs(m.refBwGBs - 89.6) < 1e-9);
  assert.ok(Math.abs(m.mtFactor - Math.pow(128 / 89.6, 0.2)) < 1e-12);
  assert.ok(Math.abs(m.stBwFactor - Math.pow(128 / 89.6, 0.05)) < 1e-12);
  assert.ok(Math.abs(m.dramScale - 120 / 90) < 1e-12);
  assert.ok(m.mtRange[0] < m.mtFactor && m.mtFactor < m.mtRange[1]);
  // LPDDR4X は遅延の実測がないので帯域項のみ(遅延比 1)
  const l = M.evaluate({ id: 'amd-zen3-5800u', cfg: { mem: { type: 'LPDDR4X', mts: 4266 } } });
  assert.strictEqual(l.dramScale, 1); assert.strictEqual(l.latKnown, false);
  // 不正な選択は基準構成として扱う(係数 1)
  const inv = M.evaluate({ id: 'amd-strix-hx370', cfg: { mem: { type: 'DDR4', mts: 3200 } } });
  assert.strictEqual(inv.isRef, true); assert.strictEqual(inv.mtFactor, 1); assert.strictEqual(inv.invalid, true);
});

// ---- 2026-11-02: 指数の再フィット(GB7 の実測だけ)・メモリ OC・レビュー指摘の修正 ----

test('bMT の根拠: GB7 実測 3 点(9950X)への単一指数の最小二乗は 0.196 → 0.20。残差は ±2 ポイント以内', () => {
  const pts = [[4800, 6000, 6.2], [6000, 8000, 4.2], [4800, 8000, 10.7]];
  let sxy = 0; let sxx = 0;
  pts.forEach(([a, b, p]) => { const x = Math.log(b / a); sxy += x * Math.log(1 + p / 100); sxx += x * x; });
  assert.ok(Math.abs(sxy / sxx - 0.196) < 0.001);
  assert.strictEqual(M.B_MT, 0.2);
  pts.forEach(([a, b, p]) => { const pred = (Math.pow(b / a, M.B_MT) - 1) * 100; assert.ok(Math.abs(pred - p) < 2, `${a}→${b}: ${pred} 対 ${p}`); });
  assert.deepStrictEqual(M.B_MT_RANGE, [0.14, 0.27]); // 区間ごとの指数(6000→8000 と 4800→6000)
  assert.strictEqual(M.B_ST, 0.05);
});

test('レビュー 1: baseCfg.mem が基準でない設計を読み込んでも、再現モードの公開値との差は補正後の値にならない', () => {
  const rep = JSON.parse(DS.serialize(DS.fromPreset(preset('amd-strix-hx370'), { mode: 'reproduce' })));
  rep.cfg.mem = { type: 'LPDDR5X', mts: 8000 }; rep.baseCfg.mem = { type: 'LPDDR5X', mts: 8000 };
  const p = DS.parse(JSON.stringify(rep));
  assert.ok(p.ok, p.reason);
  assert.deepStrictEqual(p.design.baseCfg.mem, { type: 'DDR5', mts: 5600 }); // 基準に直る
  const r = ev(p.design);
  assert.strictEqual(r.edited, true); assert.strictEqual(r.mt.errPct, null); assert.strictEqual(r.mt.published, null);
  // parse を通らない(cfg と baseCfg が同じ非基準)設計でも evaluate が編集済み扱いにする
  const raw = JSON.parse(JSON.stringify(p.design)); raw.baseCfg.mem = { type: 'LPDDR5X', mts: 8000 };
  const r2 = ev(raw); assert.strictEqual(r2.edited, true); assert.strictEqual(r2.mt.errPct, null);
  // baseCfg.mem のキーの順序が違っても基準(type, mts の順)に直る
  const q = JSON.parse(JSON.stringify(rep)); q.baseCfg.mem = { mts: 5600, type: 'DDR5' };
  assert.deepStrictEqual(Object.keys(DS.parse(JSON.stringify(q)).design.baseCfg.mem), ['type', 'mts']);
});

test('レビュー 2: baseCfg.mem が無く cfg.mem が基準以外でも差分と元に戻すが働く', () => {
  const d = JSON.parse(JSON.stringify(withMem('amd-strix-hx370', 'LPDDR5X', 8000))); delete d.baseCfg.mem;
  assert.deepStrictEqual(DF.paramDiff(d).map((x) => [x.id, x.before, x.after]), [['memory', 'DDR5-5600', 'LPDDR5X-8000']]);
  assert.deepStrictEqual(DF.revertParam(d, 'memory').design.cfg.mem, { type: 'DDR5', mts: 5600 });
});

test('レビュー 7: 「メモリ構成が違います」は、どちらかが基準以外のときだけ', () => {
  const a = impr('amd-strix-hx370'); const b = impr('amd-strix-hx370');
  const A = { design: a, ev: ev(a) }; const B = { design: b, ev: ev(b), sourceKey: 'origin' };
  assert.ok(!CF.compareNotesMulti(A, [B]).some((t) => /メモリ構成が違います/.test(t)));
  // 基準どうしでも別のプリセット(Raptor Lake と Zen 5)なら構成は違うが、両方基準なので出さない
  const c = impr('amd-zen5-9950x'); const C = { design: c, ev: ev(c), sourceKey: 'preset' };
  assert.ok(!CF.compareNotesMulti(A, [C]).some((t) => /メモリ構成が違います/.test(t)));
  const o = withMem('amd-strix-hx370', 'LPDDR5X', 8000);
  assert.ok(CF.compareNotesMulti({ design: o, ev: ev(o) }, [C]).some((t) => /メモリ構成が違います/.test(t)));
});

test('メモリ OC: DDR4 / DDR5 だけ、対応最大を超える離散値。LPDDR・メモリ固定は不可', () => {
  const o = M.optionsOf('intel-rpl-14900k');
  assert.deepStrictEqual(o.options.find((x) => x.type === 'DDR5').ocSpeeds, [6000, 6400, 6800, 7200, 7600, 8000]);
  assert.deepStrictEqual(o.options.find((x) => x.type === 'DDR4').ocSpeeds, [3600, 4000]);
  assert.deepStrictEqual(M.optionsOf('intel-arl-285k').options[0].ocSpeeds, [6800, 7200, 7600, 8000]); // 対応最大 6400 を超えるものだけ
  assert.deepStrictEqual(M.optionsOf('intel-ptl-x9-386h').options.find((x) => x.type === 'DDR5').ocSpeeds, [7600, 8000]);
  assert.deepStrictEqual(M.optionsOf('intel-ptl-x9-386h').options.find((x) => x.type === 'LPDDR5X').ocSpeeds, []);
  assert.deepStrictEqual(M.optionsOf('intel-ptl-x9-388h').options[0].ocSpeeds, []);
  assert.deepStrictEqual(M.optionsOf('amd-zen3-5800u').options.find((x) => x.type === 'LPDDR4X').ocSpeeds, []);
  // 選択: oc 印が要る。印の無い選択肢外・LPDDR の OC 印・OC の通常速度・oc:false は拒否
  const d = impr('amd-zen5-9950x');
  assert.ok(!DS.setMemory(d, 'DDR5', 8000).ok);
  assert.ok(!DS.setMemory(d, 'DDR5', 5600, true).ok); // 通常の速度に OC 印は付けられない
  assert.ok(DS.setMemory(d, 'DDR5', 8000, true).ok);
  assert.ok(!DS.setMemory(impr('amd-strix-hx370'), 'LPDDR5X', 9000, true).ok);
  assert.ok(!DS.setMemory(impr('amd-strix-hx370'), 'LPDDR5X', 8000, true).ok);
  assert.ok(!DS.setMemory(impr('apple-m4'), 'DDR5', 8000, true).ok);
  assert.ok(!DS.setMemory(DS.fromPreset(preset('amd-zen5-9950x'), { mode: 'reproduce' }), 'DDR5', 8000, true).ok); // ロック中
  assert.notStrictEqual(M.check('amd-zen5-9950x', { type: 'DDR5', mts: 8000, oc: false }), null);
  assert.notStrictEqual(M.check('amd-zen5-9950x', { type: 'DDR4', mts: 3600, oc: true }), null); // 9950X は DDR4 非対応
});

test('メモリ OC の評価: 9950X の DDR5-5600→8000 は GB7 実測の範囲。係数・警告・外挿の印・保存往復', () => {
  const b = ev(impr('amd-zen5-9950x'));
  const d = DS.setMemory(impr('amd-zen5-9950x'), 'DDR5', 8000, true).design;
  assert.deepStrictEqual(d.cfg.mem, { type: 'DDR5', mts: 8000, oc: true });
  const a = ev(d);
  assert.strictEqual(a.memory.label, 'DDR5-8000 OC'); assert.strictEqual(a.memory.oc, true); assert.strictEqual(a.memory.extrapolated, false);
  assert.ok(Math.abs(pc(a.mt.score, b.mt.score) - (Math.pow(8000 / 5600, 0.2) - 1) * 100) < 1e-6);
  assert.ok(a.warnings.some((w) => /OC は安定動作を保証しません/.test(w.text)));
  assert.ok(!a.warnings.some((w) => /外挿/.test(w.text)));
  assert.strictEqual(a.edited, true);
  const p = DS.parse(DS.serialize(d)); assert.ok(p.ok, p.reason);
  assert.strictEqual(ev(p.design).mt.score, a.mt.score);
  // DDR4 の OC は GB7 実測なし = 外挿
  const x = ev(DS.setMemory(impr('intel-adl-12900k'), 'DDR4', 3600, true).design);
  assert.strictEqual(x.memory.extrapolated, true);
  assert.ok(x.warnings.some((w) => /外挿/.test(w.text)));
  assert.strictEqual(x.st.confidence, 'low');
  // OC の parse: 印なしの選択肢外・LPDDR の OC 印・oc:false は拒否
  const s = JSON.parse(DS.serialize(d));
  const bad = (f) => { const y = JSON.parse(JSON.stringify(s)); f(y); return DS.parse(JSON.stringify(y)); };
  assert.ok(!bad((y) => { delete y.cfg.mem.oc; }).ok);
  assert.ok(!bad((y) => { y.cfg.mem.oc = false; }).ok);
  assert.ok(!bad((y) => { y.cfg.mem = { type: 'LPDDR5X', mts: 8000, oc: true }; }).ok);
  assert.ok(!bad((y) => { y.cfg.mem.mts = 9000; }).ok);
  assert.ok(!bad((y) => { y.presetId = 'apple-m4'; }).ok);
  // 差分・書き出し・比較・元に戻す
  assert.deepStrictEqual(DF.paramDiff(d).map((i) => [i.before, i.after]), [['DDR5-5600', 'DDR5-8000 OC']]);
  const row = EX.resultRows(d, a).find((r) => r.item === 'メモリ構成'); assert.ok(/メモリ OC/.test(row.note) && row.value === 'DDR5-8000 OC');
  assert.ok(EX.pngInfo(d, a, {}).values.some((v) => /DDR5-8000 OC/.test(v.text)));
  assert.ok(CF.compareNotesMulti({ design: d, ev: a }, [{ design: impr('amd-zen5-9950x'), ev: b, sourceKey: 'origin' }]).some((t) => /メモリ構成が違います/.test(t)));
  assert.strictEqual(E.isEdited(DF.revertParam(d, 'memory').design), false);
});

test('メモリ OC の UI ロジック(params.js の select / トグルの出し分け)', () => {
  const v0 = PF.memoryView(impr('intel-rpl-14900k'), false);
  assert.strictEqual(v0.ocAvailable, true); assert.strictEqual(v0.ocOn, false); assert.deepStrictEqual(v0.ocSpeeds, []); // 既定はオフ: OC の速度は出さない
  assert.deepStrictEqual(v0.speeds, [4800, 5200, 5600]);
  const v1 = PF.memoryView(impr('intel-rpl-14900k'), true);
  assert.deepStrictEqual(v1.ocSpeeds, [6000, 6400, 6800, 7200, 7600, 8000]); assert.deepStrictEqual(v1.speeds, [4800, 5200, 5600]);
  // OC を選択済みなら、トグルがオフでも表示上オン
  const sel = PF.memoryView(DS.setMemory(impr('intel-rpl-14900k'), 'DDR5', 7200, true).design, false);
  assert.strictEqual(sel.ocOn, true); assert.strictEqual(sel.oc, true); assert.strictEqual(sel.label, 'DDR5-7200 OC'); assert.strictEqual(sel.extrapolated, false);
  // LPDDR だけのチップ・LPDDR を選んでいる間はトグルを出さない / OC の速度を足さない
  assert.strictEqual(PF.memoryView(impr('intel-ptl-x9-388h'), true).ocAvailable, false);
  assert.deepStrictEqual(PF.memoryView(impr('intel-ptl-x9-388h'), true).ocSpeeds, []);
  assert.deepStrictEqual(PF.memoryView(impr('amd-strix-hx370'), true).ocSpeeds, [6000, 6400, 6800, 7200, 7600, 8000]); // 基準の DDR5(対応最大 5600)
  assert.deepStrictEqual(PF.memoryView(withMem('amd-strix-hx370', 'LPDDR5X', 8000), true).ocSpeeds, []);
  // 再現モードは select を出さない(selectable:false)
  assert.strictEqual(PF.memoryView(DS.fromPreset(preset('intel-rpl-14900k'), { mode: 'reproduce' }), true).selectable, false);
});
