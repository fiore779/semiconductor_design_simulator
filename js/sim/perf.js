// 性能モデル(設計書 §5)。UI に依存しない純関数。
// CPI を「基本 + 分岐 + メモリ」で積み上げ、クロックを掛けて Geekbench 7 の ST スコアにする(§5.2.1)。
// 絶対値の合わせ込みは uarch ごとの補正 u(§5.3)に集約する。以下の参照値(mpki など)は
// **Geekbench 7 の実際の負荷特性ではなく、校正前の仮の既定値**(DEFAULT_PARAMS)。u がその差を吸収する。
(function (root) {
  'use strict';

  // 校正前の仮の既定値。値の根拠はなく、モデルの形を決めるためのもの(設計書 §5.2.1 に明記)。
  const DEFAULT_PARAMS = {
    aIlp: 0.55, bIlp: 0.5,      // ILP 窓: 並列度 = aIlp × ROB^bIlp
    mpkiBr: 4,                  // 1000 命令あたり分岐ミス
    brOverlap: 0.3,             // 分岐ミスの一部は隠れる
    brPenaltyDefault: 15,       // brPenalty が未取得のコアに使う
    mpkiL1: 14, l1Ref: 32,      // L1 ミス/kI(参照容量 KB)
    mpkiL2: 3.5, l2Ref: 512,    // L2 ミス/kI(参照容量 KB)
    mpkiL3: 0.9, l3Ref: 2048,   // L3 ミス/kI(スレッドあたりの L3 容量 KB の参照)
    capExp: -0.5,               // √2 則: ミス率 ∝ 容量^-0.5
    dramNs: 85,                 // DRAM 遅延(時間固定。サイクル数はクロックに比例)
    l2LatDefault: 13, l3LatDefault: 40, mshrDefault: 10, kMlp: 48,
    inOrderIpc: 0.8,            // in-order コア(A55 系)の仮の IPC(根拠なし。fallback:true を結果に付ける)
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // コア 1 個の CPI 内訳。u: マイクロアーキ記録(data/uarch.js)。
  // opts: { fGHz, l3KBPerThread, noL3, params }。noL3=true は「L3 なし」(L2 ミスがそのまま DRAM へ行く。L3 の遅延の項も使わない)。
  // l3KBPerThread が未指定(null)で noL3 でもないときは、従来どおり参照値(l3Ref)で計算する(L3 容量が未取得のプリセット用)。
  function coreCpi(u, opts) {
    const p = Object.assign({}, DEFAULT_PARAMS, opts.params || {});
    const f = opts.fGHz;
    if (!u) return { ok: false, reason: 'uarch 未指定', ipc: null };
    if (!(f > 0)) return { ok: false, reason: 'クロック未取得', ipc: null };
    if (u.inOrder) {
      return { ok: true, fallback: true, confidence: 'low', cpi: 1 / p.inOrderIpc, ipc: p.inOrderIpc, parts: { base: 1 / p.inOrderIpc, br: 0, mem: 0 }, note: 'in-order コアは仮の IPC(根拠なし)' };
    }
    const ilp = u.rob ? p.aIlp * Math.pow(u.rob, p.bIlp) : null;
    // 発行幅 W が未取得なら decodeWidth を上限に使う(ROB 由来の並列度だけだと幅が過大になる。§5.2.1)。両方無ければ ROB だけ。
    const w = u.width || u.decodeWidth || null;
    let ceil;
    if (w && ilp) ceil = Math.min(w, ilp);
    else if (w) ceil = w;
    else if (ilp) ceil = ilp;
    else return { ok: false, reason: '幅・ROB が未取得のため計算できない' };
    const base = 1 / ceil;
    const br = (p.mpkiBr / 1000) * (u.brPenalty != null ? u.brPenalty : p.brPenaltyDefault) * (1 - p.brOverlap);
    const l1KB = u.l1dKB || p.l1Ref;
    const l2KB = u.l2KB || p.l2Ref;
    const l3KB = opts.l3KBPerThread || p.l3Ref;
    const m1 = p.mpkiL1 * Math.pow(l1KB / p.l1Ref, p.capExp);   // L1 ミス → L2 へ
    const m2 = p.mpkiL2 * Math.pow(l2KB / p.l2Ref, p.capExp);   // L2 ミス → L3 へ
    const m3 = opts.noL3 ? m2 : Math.min(m2, p.mpkiL3 * Math.pow(l3KB / p.l3Ref, p.capExp));   // L3 ミス → DRAM へ(L3 なしなら L2 ミスがそのまま DRAM へ。L3 のミスが L2 のミスを超えることはない)
    const mlp = clamp(Math.min(u.mshr || p.mshrDefault, u.rob ? u.rob / p.kMlp : 99), 1, 16);
    const withoutL3 = (m1 * (u.l2Lat != null ? u.l2Lat : p.l2LatDefault) + m2 * p.dramNs * f) / 1000; // L3 なし: L2 ミスがそのまま DRAM へ
    let memCycles = withoutL3; let l3Floor = false;
    if (!opts.noL3) {
      memCycles = (m1 * (u.l2Lat != null ? u.l2Lat : p.l2LatDefault) + m2 * (u.l3Lat != null ? u.l3Lat : p.l3LatDefault) + m3 * p.dramNs * f) / 1000;
      // 容量が明示された L3 は「L3 なしより悪くならない」とする(スレッドあたりの容量が極端に小さいと、L3 の遅延の分だけ L3 なしより遅く出るのを防ぐ。L3 の容量に対して単調になる)
      if (opts.l3KBPerThread && memCycles > withoutL3) { memCycles = withoutL3; l3Floor = true; }
    }
    const mem = memCycles / mlp;
    const cpi = base + br + mem;
    const missing = ['width', 'rob', 'brPenalty', 'l2Lat', 'l3Lat', 'mshr'].filter((k) => u[k] == null);
    return {
      ok: true, confidence: missing.length >= 4 ? 'low' : missing.length >= 2 ? 'medium' : 'high',
      cpi, ipc: 1 / cpi, parts: { base, br, mem }, missing, l3Floor,
    };
  }

  // プリセット/設計の「最速コア」: 種別 P(または super / プライム)で最大クロックのコア。
  function topCore(cores) {
    const clk = (c) => c.boostGHz || c.maxGHz || c.baseGHz || 0;
    const rank = (c) => ({ P: 3, super: 3, performance: 2, M: 2, M2: 2, C: 1, E: 1, 'LP-E': 0 }[c.type] ?? 1);
    return cores.slice().sort((a, b) => rank(b) - rank(a) || clk(b) - clk(a))[0] || null;
  }

  // シングルコア性能。cal: { u: {uarch→補正}, uIsa: {isa→既定補正} }
  function stScore(preset, cal, uarchDb, opts) {
    const core = (opts && opts.core) || topCore(preset.cfg.cores || []);
    if (!core) return { ok: false, reason: 'コアなし' };
    const f = (opts && opts.fGHz) || core.boostGHz || core.maxGHz || core.baseGHz;
    if (!f) return { ok: false, reason: 'クロック未取得' };
    const u = uarchDb[core.uarch];
    // ST は 1 スレッドが L3 を使う想定(全量)。MT のときだけ呼び出し側が threads=総スレッド数を渡して C_L3/N にする(§5.2.2)
    const threads = (opts && opts.threads) || 1;
    // l3MB が明示的に 0 なら「L3 なし」。null/undefined(未取得)は従来どおり参照値で計算する
    const noL3 = preset.cfg.l3MB === 0;
    const l3KB = preset.cfg.l3MB ? (preset.cfg.l3MB * 1024) / threads : null;
    const r = coreCpi(u, { fGHz: f, l3KBPerThread: l3KB, noL3, params: cal && cal.params });
    if (!r.ok) return { ok: false, reason: r.reason };
    let corr = cal && cal.u && cal.u[core.uarch];
    let corrSource = 'uarch';
    if (corr == null) { corr = cal && cal.uIsa && cal.uIsa[core.isa || preset.isa]; /* 混合設計ではコアごとの isa(core.isa)を優先。通常のプリセットのコアには isa が無い */ corrSource = 'isa'; }
    if (corr == null) return { ok: false, reason: '補正係数なし(校正データ不足)' };
    return {
      ok: true, score: corr * r.ipc * f, ipc: r.ipc, fGHz: f, corr, corrSource, core, noL3, l3Floor: !!r.l3Floor,
      confidence: corrSource === 'isa' ? 'low' : r.confidence, parts: r.parts, missing: r.missing,
      ...(r.fallback ? { fallback: true, note: r.note } : {}),
    };
  }

  // 校正。mode 'rep': calib:true のプリセットだけで u を決め、他は検証に使う(§5.3.1)。
  //        mode 'all': GB7 のある全プリセットの中央値で u を決める(再現モード用。検証にならない)。
  function calibrate(presets, gb7ByName, uarchDb, mode, params) {
    if (mode !== 'rep' && mode !== 'all') throw new Error(`calibrate: mode は 'rep' か 'all'(受け取った値: ${mode})`);
    const samples = {}; // uarch → [u 値]
    const isaSamples = {};
    const usedPresets = {}; // uarch → [preset id]
    presets.forEach((p) => {
      if (!p.gb7 || !gb7ByName[p.gb7]) return;
      if (mode === 'rep' && !p.calib) return;
      const core = topCore(p.cfg.cores || []);
      if (!core || !core.uarch) return;
      const raw = stScore(p, { u: { [core.uarch]: 1 }, params }, uarchDb);
      if (!raw.ok || raw.fallback) return; // 仮の IPC のコアは補正係数の元データにしない
      const u = gb7ByName[p.gb7].single / raw.score;
      (usedPresets[core.uarch] = usedPresets[core.uarch] || []).push(p.id);
      (samples[core.uarch] = samples[core.uarch] || []).push(u);
      (isaSamples[p.isa] = isaSamples[p.isa] || []).push(u);
    });
    const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
    const geo = (a) => Math.exp(a.reduce((s, x) => s + Math.log(x), 0) / a.length);
    const u = {}; Object.keys(samples).forEach((k) => { u[k] = median(samples[k]); });
    const uIsa = {}; Object.keys(isaSamples).forEach((k) => { uIsa[k] = geo(isaSamples[k]); });
    // isValidation: 'rep' は代表で合わせて別 SKU で検証できる。'all' は全 SKU に合わせるので、その誤差は検証にならない(再現モード用)
    const n = {}; Object.keys(samples).forEach((k) => { n[k] = samples[k].length; });
    return { u, uIsa, params, mode, isValidation: mode === 'rep', n, usedPresets };
  }

  // 校正前の仮の既定値(根拠なし)。mtScore の結果に uncalibrated として出す。メモリ帯域の頭打ち(§5.2.2 の BW_mem/B_score)は未実装。
  const MT_DEFAULTS = { sigma: 0.004, gammaSmt: 0.25 };

  // MT スコア(§5.2.2)。fByType: { 種別 → 全コア負荷時の持続クロック GHz }(電力モデルが決める)。
  function mtScore(preset, cal, uarchDb, fByType, mtParams) {
    // 優先順位: 引数 mtParams > 校正結果 cal.mt > 仮の既定値
    const mp = Object.assign({}, MT_DEFAULTS, (cal && cal.mt) || {}, mtParams || {});
    const cores = preset.cfg.cores || [];
    const totalThreads = cores.reduce((t, c) => t + c.count * (c.smt || 1), 0);
    if (!(totalThreads > 0)) return { ok: false, reason: 'コアなし' };
    let sum = 0; let threads = 0; const detail = [];
    const order = { high: 3, medium: 2, low: 1 }; let worst = 'high'; let anyFallback = false; let anyFloor = false;
    for (const c of cores) {
      // 既定は最大クロック(boost)。電力制限モデルで決めた持続クロック(fByType)を渡せるが、現状の仮の電力モデルでは精度が下がる(設計書 §5.3.0)
      const given = fByType && fByType[c.type];
      const f = given || c.boostGHz || c.maxGHz || c.baseGHz;
      const clockSource = given ? 'given' : c.boostGHz ? 'boost' : c.maxGHz ? 'max' : 'base';
      if (!f) return { ok: false, reason: `${c.type} コアのクロック未取得` };
      const st = stScore(preset, cal, uarchDb, { core: c, fGHz: f, threads: totalThreads });
      if (!st.ok) return { ok: false, reason: `${c.type} コア: ${st.reason}` };
      if (order[st.confidence] < order[worst]) worst = st.confidence;
      if (st.fallback) anyFallback = true;
      if (st.l3Floor) anyFloor = true;
      const smtGain = (c.smt || 1) === 2 ? 1 + mp.gammaSmt : 1;
      sum += st.score * c.count * smtGain; threads += c.count * (c.smt || 1);
      detail.push({ type: c.type, count: c.count, perCore: st.score, fGHz: f, clockSource, corrSource: st.corrSource, confidence: st.confidence });
    }
    const eta = 1 / (1 + mp.sigma * (threads - 1));
    // sigma・gammaSmt は未校正(既定値のまま)なので、呼び出し側が確度を過大評価しないよう明示する
    // 種別によってクロックの出所が違う(例: P は boost、E は boost 未取得で base)と、種別間の比が歪む。呼び出し側に知らせる
    const sources = new Set(detail.map((d) => d.clockSource));
    const mixedClock = sources.has('base') && sources.size > 1;
    const uncalibrated = Object.keys(MT_DEFAULTS).filter((k) => !(cal && cal.mt && cal.mt.fitted && cal.mt.fitted.includes(k)) && !(mtParams && k in mtParams));
    return { ok: true, score: sum * eta, eta, threads, detail, uncalibrated, confidence: uncalibrated.length || mixedClock ? 'low' : worst, fallback: anyFallback, mixedClock, noL3: preset.cfg.l3MB === 0, l3Floor: anyFloor };
  }

  // MT の並列効率 σ を、校正代表 SKU(calib:true)の GB7 マルチ値に合わせる(§5.3)。γ_smt は固定(1 つの σ だけでは SMT と並列効率を分離できないため)。
  // 全コア負荷時のクロックは、既定では最大クロック(boost。なければ maxGHz、それもなければ baseGHz)。電力モデルは未接続(設計書 §5.3.0)。fByTypeOf(preset) で差し替え可能。
  // 対数誤差の二乗和を最小化する σ を、区間 [0, 0.2] の黄金分割探索で求める。
  function calibrateMt(presets, gb7ByName, uarchDb, cal, fByTypeOf) {
    // 代表のうち、全コアが uarch 専用の補正を持ち、仮の IPC を含まないものだけを使う(ISA 平均の代用は σ を歪める)
    const gamma = cal && cal.mt && cal.mt.gammaSmt != null ? cal.mt.gammaSmt : MT_DEFAULTS.gammaSmt;
    const reps = presets.filter((p) => {
      if (!(p.calib && p.gb7 && gb7ByName[p.gb7] && gb7ByName[p.gb7].multi)) return false;
      const r = mtScore(p, cal, uarchDb, fByTypeOf ? fByTypeOf(p) : null, { sigma: 0, gammaSmt: gamma });
      return r.ok && !r.fallback && r.detail.every((d) => d.corrSource === 'uarch');
    });
    if (!reps.length) return Object.assign({}, cal, { mt: { sigma: MT_DEFAULTS.sigma, gammaSmt: gamma, fitted: [], usedPresets: [], rmsLogError: null, note: '使える代表 SKU がないため σ は既定値のまま' } });
    const cost = (sigma) => {
      let e = 0; let n = 0;
      for (const p of reps) {
        const r = mtScore(p, cal, uarchDb, fByTypeOf ? fByTypeOf(p) : null, { sigma, gammaSmt: gamma });
        if (!r.ok) continue;
        e += Math.pow(Math.log(r.score / gb7ByName[p.gb7].multi), 2); n++;
      }
      return n ? e / n : Infinity;
    };
    let lo = 0; let hi = 0.2; const g = (Math.sqrt(5) - 1) / 2;
    let a = hi - g * (hi - lo); let b = lo + g * (hi - lo);
    for (let i = 0; i < 60; i++) { if (cost(a) < cost(b)) hi = b; else lo = a; a = hi - g * (hi - lo); b = lo + g * (hi - lo); }
    const sigma = (lo + hi) / 2;
    const used = reps.map((p) => p.id);
    return Object.assign({}, cal, { mt: { sigma, gammaSmt: gamma, fitted: ['sigma'], usedPresets: used, rmsLogError: Math.sqrt(cost(sigma)) } });
  }

  const api = { DEFAULT_PARAMS, MT_DEFAULTS, coreCpi, topCore, stScore, calibrate, calibrateMt, mtScore };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.perf = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
