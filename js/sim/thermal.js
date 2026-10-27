// 熱モデルとスロットリング(設計書 §6.2)。UI に依存しない純関数。
// Tj = T_周囲 + P·R_total。R_total は上面経路(ダイ + 冷却)と基板経路の並列。
// power.js / area.js は先に読み込まれていること(ブラウザは root.SDS.sim から、Node は require で取る)。
(function (root) {
  'use strict';
  const sim = (root.SDS && root.SDS.sim) || {};
  const hasReq = typeof require !== 'undefined' && typeof module !== 'undefined';
  const power = sim.power || (hasReq ? require('./power.js') : null);
  const area = sim.area || (hasReq ? require('./area.js') : null);
  // 読み込み順の間違いに気づけるよう、依存が無ければ明示的に失敗させる
  if (!power) throw new Error('power.js を先に読み込んでください');
  if (!area) throw new Error('area.js を先に読み込んでください');

  // 校正前の仮の既定値(根拠なし)。t_ダイ・k_Si・基板厚・基板下の熱抵抗。
  const DEFAULT_THERMAL = { tDieMm: 0.3, kSi: 150, tSubMm: 1.0, rUnderSubKW: 20 };
  const MAX_ITER = 20; const TOL_K = 0.1; const RUNAWAY_TJ_C = 400; // 400℃超かつ変化量が増え続けるなら発散とみなす(400℃超でも収束していれば発散ではない)

  // 合成熱抵抗 [K/W]。基板の熱伝導率が未取得なら ok:false(他の基板の値で代用しない)。
  function rTotal(o) {
    const D = root.SDS_DATA || {};
    const t = Object.assign({}, DEFAULT_THERMAL, o.params || {});
    const cool = (D.cooling || []).find((c) => c.id === o.coolingId);
    if (!cool) return { ok: false, reason: `冷却 ${o.coolingId} が不明` };
    const sub = (D.substrates || []).find((b) => b.id === o.substrateId);
    if (!sub) return { ok: false, reason: `基板 ${o.substrateId} が不明` };
    if (!sub.conductivityWmK || sub.conductivityWmK.v == null) return { ok: false, reason: `${sub.name}: 熱伝導率が未取得` };
    if (!(o.dieAreaMm2 > 0)) return { ok: false, reason: 'ダイ面積が未取得または 0' };
    const aM2 = o.dieAreaMm2 * 1e-6;
    const rDie = (t.tDieMm * 1e-3) / (t.kSi * aM2);
    const rTop = rDie + cool.rK_W;
    const rSub = (t.tSubMm * 1e-3) / (sub.conductivityWmK.v * aM2) + t.rUnderSubKW;
    return {
      ok: true, r: 1 / (1 / rTop + 1 / rSub), rTop, rSub, rDie, tAmbC: cool.tAmbC, tjMaxC: cool.tjMaxC,
      tentative: sub.conductivityWmK.s === 'tmp' || cool.s === 'tmp',
    };
  }

  // 固定点反復で Tj を求める(リーク-温度の相互作用)。最大 20 回、|ΔTj|<0.1K で停止。
  // 収束したときだけ tjC に値を入れる。発散・非収束(熱暴走)は converged:false で tjC:null、最後の反復値は tjLastC。
  function solveTj(preset, cal, fByType, loadScenario, r, tAmbC) {
    let tj = tAmbC; let p = null; let prevDelta = Infinity;
    for (let i = 1; i <= MAX_ITER; i++) {
      p = power.chipPower(preset, cal, fByType, loadScenario, tj);
      if (!p.ok) return { ok: false, reason: p.reason };
      const next = tAmbC + p.w * r;
      const delta = Math.abs(next - tj);
      if (!isFinite(next) || (next > RUNAWAY_TJ_C && delta > prevDelta)) return { ok: true, converged: false, tjC: null, tjLastC: next, powerW: p.w, iter: i };
      if (delta < TOL_K) return { ok: true, converged: true, tjC: next, tjLastC: next, powerW: p.w, iter: i };
      prevDelta = delta; tj = next;
    }
    return { ok: true, converged: false, tjC: null, tjLastC: tj, powerW: p.w, iter: MAX_ITER };
  }

  // 全コアのクロックを共通倍率 s∈[fMinRatio,1] で下げ、P ≤ PL かつ Tj ≤ tjMax を満たす最大の s を二分探索で求める。
  // o: { preset, cal, coolingId, substrateId, powerLimitW(省略=制限なし), fMinRatio(既定 0.3),
  //      fTargetByType(省略=boost→base の順), loadScenario(既定 'all') }
  function solveThrottle(o) {
    const preset = o.preset; const cores = (preset.cfg && preset.cfg.cores) || [];
    const dies = area.dieAreaMm2(preset.dies);
    if (!(dies.knownCount > 0)) return { ok: false, reason: 'ダイ面積が全て未取得' };
    const rt = rTotal({ coolingId: o.coolingId, substrateId: o.substrateId, dieAreaMm2: dies.mm2 });
    if (!rt.ok) return { ok: false, reason: rt.reason };
    const pl = o.powerLimitW != null ? o.powerLimitW : Infinity;
    const fMin = o.fMinRatio != null ? o.fMinRatio : 0.3;
    const load = o.loadScenario || 'all';
    const target = {};
    for (const g of cores) {
      const f = (o.fTargetByType && o.fTargetByType[g.type]) || g.boostGHz || g.maxGHz || g.baseGHz;
      if (!f) return { ok: false, reason: `${g.type} コアのクロック未取得` };
      target[g.type] = f;
    }
    const at = (s) => {
      const fBy = {}; Object.keys(target).forEach((k) => { fBy[k] = target[k] * s; });
      const r = solveTj(preset, o.cal, fBy, load, rt.r, rt.tAmbC);
      if (!r.ok) return r;
      const okPower = r.powerW <= pl; const okThermal = r.converged && r.tjC <= rt.tjMaxC; // 非収束(熱暴走)は不可
      return Object.assign(r, { fBy, okPower, okThermal, feasible: okPower && okThermal });
    };
    const out = (s, r, limitedBy) => {
      const notes = [];
      if (dies.unknownCount) notes.push(`面積が未取得のダイが ${dies.unknownCount} 個あり、熱抵抗は取得済みのダイの合計で計算`);
      if (!r.converged) notes.push('熱暴走の恐れ(Tj が反復で収束しない)');
      else if (limitedBy === 'cooling') notes.push(`冷却不足(クロックを下限まで下げても Tj ${r.tjC.toFixed(0)}℃ が上限 ${rt.tjMaxC}℃ を超える)`);
      else if (!r.feasible && !r.okPower) notes.push('電力制限を満たせない(クロックを下限まで下げても超える)');
      return { ok: true, s, fByType: r.fBy, powerW: r.powerW, tjC: r.tjC, tjLastC: r.tjLastC, limitedBy, converged: r.converged, feasible: r.feasible, rTotal: rt.r, notes };
    };
    const top = at(1);
    if (!top.ok) return top;
    if (top.feasible) return out(1, top, 'none');
    const why = (r) => (!r.okPower ? 'power' : 'thermal');
    const low = at(fMin);
    if (!low.feasible) { // 下限でも収まらない(feasible:false)。熱暴走(非収束)と冷却不足(収束しているが Tj 超過)を分ける
      return out(fMin, low, !low.converged ? 'runaway' : !low.okPower ? 'power' : 'cooling');
    }
    let lo = fMin; let hi = 1; let best = low; let hiR = top;
    for (let i = 0; i < 50 && hi - lo > 1e-5; i++) {
      const mid = (lo + hi) / 2; const r = at(mid);
      if (r.feasible) { lo = mid; best = r; } else { hi = mid; hiR = r; }
    }
    return out(lo, best, why(hiR));
  }

  const api = { DEFAULT_THERMAL, rTotal, solveThrottle };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.thermal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
