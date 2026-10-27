// 設計の評価(結果パネル用)。UI に依存しない純関数。Node でテストする。
// 方針: 取れない値は null と理由で返す(推測で埋めない)。電力モデルは根拠のない仮の既定値で校正が弱い
// (設計書 §5.3.0)ので、**モデル電力は出さず**プリセットの公表値だけを返す。
// M2 の注意: 編集は配置のみなので、ブロックを動かしても ST/MT/面積/電力は変わらない(再計算しても同じ値)。
(function (root) {
  'use strict';

  const TOLERANCE = 0.10; // 性能の許容誤差 ±10%(設計書 §5.3)

  function sims() { return (root.SDS && root.SDS.sim) || {}; }

  // 起動時に一度だけ作る校正。mode 'rep'(代表 SKU で合わせ、他は検証)。
  function makeContext() {
    const D = root.SDS_DATA || {};
    const S = sims();
    const gb7ByName = {};
    (D.gb7Scores || []).forEach((r) => { gb7ByName[r.name] = r; });
    const presets = D.presets || [];
    const uarch = D.uarch || {};
    const cal0 = S.perf.calibrate(presets, gb7ByName, uarch, 'rep', null);
    const cal = S.perf.calibrateMt(presets, gb7ByName, uarch, cal0);
    return { presets, gb7ByName, uarch, nodes: D.nodes || [], cal };
  }

  const pct = (sim, pub) => (typeof pub === 'number' && pub > 0 && typeof sim === 'number' ? (sim / pub - 1) * 100 : null);

  function evalPerf(kind, preset, ctx, gb7) {
    const S = sims();
    const base = { ok: false, score: null, confidence: null, corrSource: null, fallback: false, reason: null, published: null, publishedKind: null, errPct: null, isCalibSample: false };
    // ST は calib フラグ。MT は σ の合わせに実際に使った SKU だけ(calib:true でも MT で使っていない代表 SKU は検証側)
    base.isCalibSample = kind === 'st' ? !!preset.calib : !!(ctx.cal && ctx.cal.mt && (ctx.cal.mt.usedPresets || []).includes(preset.id));
    // 代表 SKU だが MT の σ の合わせには使っていない
    base.calibNotUsedForMt = kind === 'mt' && !!preset.calib && !base.isCalibSample;
    const pubVal = gb7 ? (kind === 'st' ? gb7.single : gb7.multi) : null;
    if (typeof pubVal === 'number') { base.published = pubVal; base.publishedKind = gb7.kind || null; }
    const r = kind === 'st' ? S.perf.stScore(preset, ctx.cal, ctx.uarch) : S.perf.mtScore(preset, ctx.cal, ctx.uarch, null);
    if (kind === 'mt') Object.assign(base, { mixedClock: false, uncalibrated: [], threads: null });
    if (!r.ok) { base.reason = r.reason || '計算できません'; return base; }
    Object.assign(base, {
      ok: true, score: r.score, confidence: r.confidence, fallback: !!r.fallback,
      corrSource: kind === 'st' ? r.corrSource : null,
      errPct: pct(r.score, pubVal),
    });
    if (kind === 'st') { base.fGHz = r.fGHz; base.parts = r.parts; } else {
      base.mixedClock = !!r.mixedClock; base.uncalibrated = r.uncalibrated || []; base.threads = r.threads; base.detail = r.detail;
      base.corrSources = r.detail.map((d) => d.corrSource);
    }
    if (pubVal == null) base.reason = '公開値が未取得のため比較できません';
    return base;
  }

  function evalArea(design, ctx) {
    const S = sims();
    const dies = design.dies.map((d) => {
      const known = typeof d.areaMm2 === 'number' && isFinite(d.areaMm2);
      let yieldInfo = { value: null, reason: null };
      if (!known) yieldInfo.reason = '面積が未取得';
      else {
        const node = d.nodeId ? ctx.nodes.find((n) => n.id === d.nodeId) : null;
        const d0 = node && node.d0 && typeof node.d0.v === 'number' ? node.d0 : null;
        if (!node) yieldInfo.reason = 'プロセスノードが未取得';
        else if (!d0) yieldInfo.reason = `${node.name}: 欠陥密度 D0 が未取得`;
        else yieldInfo = { value: S.area.yield(d.areaMm2, d0.v), reason: null, d0: d0.v, d0Source: d0.s, nodeName: node.name };
      }
      return { id: d.id, name: d.name, mm2: known ? d.areaMm2 : null, source: known ? (d.areaSource || null) : null, known, note: d.areaNote || null, yield: yieldInfo };
    });
    const sum = S.area.dieAreaMm2(dies.map((d) => ({ mm2: d.mm2 })));
    let yieldTotal = null; let yieldReason = null;
    const bad = dies.find((d) => d.yield.value == null);
    if (!dies.length) yieldReason = 'ダイがありません';
    else if (bad) yieldReason = `${bad.name}: ${bad.yield.reason}`;
    else yieldTotal = dies.reduce((p, d) => p * d.yield.value, 1);
    return {
      dies, totalMm2: sum.knownCount ? sum.mm2 : null, knownCount: sum.knownCount, unknownCount: sum.unknownCount,
      totalIsPartial: sum.unknownCount > 0 && sum.knownCount > 0,
      reason: sum.knownCount ? (sum.unknownCount ? `${sum.unknownCount} 個のダイは面積が未取得(合計に含まない)` : null) : '面積が未取得',
      yield: yieldTotal, yieldReason,
    };
  }

  function evalPower(preset) {
    const p = preset.power || {};
    const pub = { base: p.base || null, peak: p.peak || null, range: p.range || null };
    const any = pub.base || pub.peak || pub.range;
    return {
      published: pub, reason: any ? null : '消費電力の公表値が未取得',
      model: null, modelReason: '電力モデルは未校正(C_eff・リーク・冷却の既定値に根拠がない)のため、モデル電力は表示しない',
    };
  }

  // 校正の注意を日本語の文にする
  function calibrationWarnings(st, mt) {
    const w = [];
    if (st.ok && st.corrSource === 'isa') w.push({ level: 'warn', text: 'ST: このマイクロアーキに専用の補正がなく、同じ命令セットの平均で代用しています(確度は低)' });
    if (st.ok && st.fallback) w.push({ level: 'warn', text: 'ST: in-order コアの IPC は根拠のない仮の値です' });
    if (!st.ok) w.push({ level: 'info', text: `ST を計算できません: ${st.reason}` });
    if (mt.ok) {
      w.push({ level: 'warn', text: 'MT: 確度は低です(並列効率 σ は AMD の代表 3 件だけで合わせ、SMT の効果 γ は未校正、メモリ帯域の頭打ちは未実装)' });
      if (mt.fallback) w.push({ level: 'warn', text: 'MT: in-order コアの仮の IPC を含むため信頼できません' });
      if (mt.mixedClock) w.push({ level: 'warn', text: 'MT: 一部のコアのブーストクロックが未取得で基本クロックを使っており、コア種別間でクロックの出所が混在しています(数値が歪みます)' });
      if (mt.corrSources && mt.corrSources.includes('isa')) w.push({ level: 'warn', text: 'MT: 一部のコアは専用の補正がなく、命令セット平均で代用しています' });
    } else w.push({ level: 'info', text: `MT を計算できません: ${mt.reason}` });
    return w;
  }

  function evaluate(design, ctx) {
    const preset = ctx.presets.find((p) => p.id === design.presetId) || null;
    const V = (root.SDS && root.SDS.model && root.SDS.model.design) || null;
    const area = evalArea(design, ctx);
    const warnings = V ? V.validate(design).map((w) => Object.assign({}, w)) : [];
    if (!preset) {
      const none = (r) => ({ ok: false, score: null, confidence: null, corrSource: null, fallback: false, reason: r, published: null, publishedKind: null, errPct: null });
      const reason = '元のプリセットが見つかりません(性能・電力は評価しません)';
      warnings.push({ level: 'info', text: reason });
      return { st: none(reason), mt: Object.assign(none(reason), { mixedClock: false, uncalibrated: [] }), area, power: { published: { base: null, peak: null, range: null }, reason, model: null, modelReason: '電力モデルは未校正' }, warnings, preset: null, tolerance: TOLERANCE };
    }
    const gb7 = preset.gb7 ? ctx.gb7ByName[preset.gb7] || null : null;
    const st = evalPerf('st', preset, ctx, gb7);
    const mt = evalPerf('mt', preset, ctx, gb7);
    return { st, mt, area, power: evalPower(preset), warnings: warnings.concat(calibrationWarnings(st, mt)), preset, tolerance: TOLERANCE };
  }

  const api = { TOLERANCE, makeContext, evaluate };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.evaluate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
