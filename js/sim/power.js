// 電力モデル(設計書 §6.1)。UI に依存しない純関数。
// P = Σ(動的 α·C·V²·f + リーク) + アンコア。チップ全体の係数 powerK は calibratePower がプリセットの公表電力から決める。
// 以下の既定値はすべて**校正前の仮の既定値(根拠なし)**。校正結果(powerK)とは分けて持つ。
(function (root) {
  'use strict';

  // 校正前の仮の既定値(根拠なし)。V = vmin + kv·max(0, f−fknee)^pv を vmax でクランプ。
  const DEFAULT_VF = { vmin: 0.65, kv: 0.1, fknee: 2.0, pv: 1.5, vmax: 1.4 };
  // 校正前の仮の既定値(根拠なし)。リーク: kLeak[W/コア, V=V0・Tj=T0 のとき]·V·exp((V−V0)/Vs)·2^((Tj−T0)/Tdbl)。
  const DEFAULT_LEAK = { kLeak: 0.3, V0: 1.0, Vs: 0.15, T0: 70, Tdbl: 30 };
  // 校正前の仮の既定値(根拠なし)。コア種別ごとの実効容量 C_eff [nF](α=1 のとき。nF×GHz×V² = W)。
  const DEFAULT_CEFF = { P: 1.0, super: 1.0, performance: 0.8, M: 0.8, M2: 0.8, C: 0.4, E: 0.35, 'LP-E': 0.1 };
  const DEFAULT_CEFF_OTHER = 0.5; // 上の表にない種別
  // 校正前の仮の既定値(根拠なし)。アンコア(L3 は MB あたり、メモリチャネルあたり)と、負荷ごとの稼働率。
  const DEFAULT_UNCORE = { wPerL3MB: 0.1, wPerMemCh: 2.0, idleFactor: 0.2, singleFactor: 0.6 };
  // 校正前の仮の既定値(根拠なし)。アイドル時のクロックと活動率。
  const DEFAULT_LOAD = { idleGHz: 0.8, idleAlpha: 0.02 };
  const DEFAULT_TJ_C = 70; // tjC 省略時の接合部温度(校正前の仮の既定値、根拠なし)
  const CAL_TJ_C = 70; // 校正時の接合部温度(全コア負荷・baseGHz・Tj=70℃)

  // 電圧 [V]。params は DEFAULT_VF と同じ形。
  function vfCurve(params, fGHz) {
    const p = Object.assign({}, DEFAULT_VF, params || {});
    const v = p.vmin + p.kv * Math.pow(Math.max(0, fGHz - p.fknee), p.pv);
    return Math.min(v, p.vmax);
  }

  // コア 1 個の電力。vf: V-f パラメータ、leak: リーク係数(どちらも省略時は仮の既定値)。
  // fGHz が有限数でなければ NaN を作らず { ok:false, reason } を返す。tjC 省略時は DEFAULT_TJ_C。
  function corePower(o) {
    if (typeof o.fGHz !== 'number' || !isFinite(o.fGHz)) return { ok: false, reason: 'クロック(fGHz)が未取得' };
    const tjC = o.tjC != null ? o.tjC : DEFAULT_TJ_C;
    const lk = Object.assign({}, DEFAULT_LEAK, o.leak || {});
    const v = vfCurve(o.vf, o.fGHz);
    const dynW = o.alpha * o.cEff * v * v * o.fGHz;
    const leakW = lk.kLeak * v * Math.exp((v - lk.V0) / lk.Vs) * Math.pow(2, (tjC - lk.T0) / lk.Tdbl);
    return { ok: true, w: dynW + leakW, dynW, leakW, v };
  }

  function memChannels(preset) {
    const m = /(\d+)\s*ch/i.exec((preset.cfg && preset.cfg.memory) || '');
    return m ? parseInt(m[1], 10) : null;
  }

  // チップ全体の電力。cal: { powerK, vf, leak, cEff, uncore }(省略分は仮の既定値、powerK は 1)。
  // fByType: { 種別 → GHz }。loadScenario: 'idle' | 'single' | 'all'。tjC 省略時は DEFAULT_TJ_C。
  // idle 以外でクロックが未取得のコアがあれば { ok:false, reason }(idle はクロック不要)。
  function chipPower(preset, cal, fByType, loadScenario, tjC) {
    const c = cal || {};
    const tj = tjC != null ? tjC : DEFAULT_TJ_C;
    const K = c.powerK != null ? c.powerK : 1;
    const ceffTbl = Object.assign({}, DEFAULT_CEFF, c.cEff || {});
    const un = Object.assign({}, DEFAULT_UNCORE, c.uncore || {});
    const cores = (preset.cfg && preset.cfg.cores) || [];
    const notes = [];
    const clk = (g) => (fByType && fByType[g.type]) || g.baseGHz || g.boostGHz || g.maxGHz || null;
    // single: 最大クロックの種別の 1 コアだけ動かす
    let single = null;
    if (loadScenario !== 'idle') {
      const bad = cores.find((g) => !clk(g));
      if (bad) return { ok: false, reason: `${bad.type} コアのクロック未取得` };
    }
    if (loadScenario === 'single') {
      cores.forEach((g) => { const f = clk(g); if (!single || f > clk(single)) single = g; });
    }
    let coreW = 0; let dynW = 0; let leakW = 0; const byType = {};
    for (const g of cores) {
      const f = clk(g); // idle では null のことがある(使わない)
      const ceff = ceffTbl[g.type] != null ? ceffTbl[g.type] : DEFAULT_CEFF_OTHER;
      const leak = Object.assign({}, DEFAULT_LEAK, c.leak || {});
      leak.kLeak = leak.kLeak * (ceff / DEFAULT_CEFF.P); // リークはコアの大きさに比例と仮定
      let nActive; let nIdle;
      if (loadScenario === 'all') { nActive = g.count; nIdle = 0; }
      else if (loadScenario === 'single') { nActive = g === single ? 1 : 0; nIdle = g.count - nActive; }
      else { nActive = 0; nIdle = g.count; }
      let w = 0;
      if (nActive) {
        const r = corePower({ cEff: ceff, vf: c.vf, fGHz: f, alpha: 1, tjC: tj, leak });
        if (!r.ok) return { ok: false, reason: `${g.type} コア: ${r.reason}` };
        w += nActive * r.w; dynW += nActive * r.dynW; leakW += nActive * r.leakW;
      }
      if (nIdle) {
        // idle クロックはそのコアの最大クロックを超えない(最大が不明なら既定値)
        const fMax = g.maxGHz || g.boostGHz || g.baseGHz || f;
        const idleF = fMax ? Math.min(DEFAULT_LOAD.idleGHz, fMax) : DEFAULT_LOAD.idleGHz;
        const r = corePower({ cEff: ceff, vf: c.vf, fGHz: idleF, alpha: DEFAULT_LOAD.idleAlpha, tjC: tj, leak });
        if (!r.ok) return { ok: false, reason: `${g.type} コア: ${r.reason}` };
        w += nIdle * r.w; dynW += nIdle * r.dynW; leakW += nIdle * r.leakW;
      }
      byType[g.type] = (byType[g.type] || 0) + K * w; coreW += w;
    }
    const ch = memChannels(preset);
    if (ch == null) notes.push('メモリチャネル数が未取得のため、メモリ分のアンコアは含めていない');
    if (!preset.cfg || preset.cfg.l3MB == null) notes.push('L3 容量が未取得のため、L3 分のアンコアは含めていない');
    const actF = loadScenario === 'all' ? 1 : loadScenario === 'single' ? un.singleFactor : un.idleFactor;
    const uncoreW = ((preset.cfg && preset.cfg.l3MB) || 0) * un.wPerL3MB * actF + (ch || 0) * un.wPerMemCh * actF;
    return { ok: true, w: K * (coreW + uncoreW), coreW: K * coreW, uncoreW: K * uncoreW, dynW: K * dynW, leakW: K * leakW, byType, notes };
  }

  // 校正: 全コア負荷・baseGHz・Tj=70℃ でモデル電力が power.base.w に一致する powerK を求める。
  // cal: { vf, leak, cEff, uncore }(省略分は仮の既定値)。chipPower と同じ cal で計算するので、cal を変えても powerK が合う。powerK は無視する。
  function calibratePower(preset, cal) {
    const base = preset.power && preset.power.base;
    if (!base || base.w == null) return { ok: false, reason: 'power.base(PBP/TDP)が未取得' };
    const cores = (preset.cfg && preset.cfg.cores) || [];
    if (!cores.length) return { ok: false, reason: 'コア構成なし' };
    const f = {};
    for (const g of cores) {
      if (!g.baseGHz) return { ok: false, reason: `${g.type} コアの baseGHz が未取得` };
      f[g.type] = g.baseGHz;
    }
    const m = chipPower(preset, Object.assign({}, cal || {}, { powerK: 1 }), f, 'all', CAL_TJ_C);
    if (!m.ok) return { ok: false, reason: m.reason };
    if (!(m.w > 0)) return { ok: false, reason: 'モデル電力が 0 以下' };
    return { ok: true, powerK: base.w / m.w, baseW: base.w, rawModelW: m.w, baseSource: base.s };
  }

  const api = { DEFAULT_VF, DEFAULT_LEAK, DEFAULT_CEFF, DEFAULT_UNCORE, DEFAULT_LOAD, DEFAULT_TJ_C, CAL_TJ_C, vfCurve, corePower, chipPower, calibratePower };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.power = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
