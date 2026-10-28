// 電力密度・温度の 2D マップ(計算のみ)。ブロックは模式図で、電力の按分は根拠のない仮の重み。
// 分布の形だけを担い、総電力・平均温度は呼び出し側の熱計算(solveThrottle)に従う。
(function (root) {
  'use strict';

  const NOTE_TENTATIVE = 'ブロックの大きさ・配置は模式図で、ブロックへの電力の按分は根拠のない仮の重み。分布の形は目安であり、実チップの温度分布ではない';

  // 根拠のない仮の既定値。コアは 1 個あたりの相対重み(power.js の DEFAULT_CEFF と同じ値)、他は面積 mm² あたり。
  const DEFAULT_WEIGHTS = {
    core: { P: 1.0, super: 1.0, performance: 0.8, M: 0.8, M2: 0.8, C: 0.4, E: 0.35, 'LP-E': 0.1 },
    coreOther: 0.5,
    l3PerMm2: 0.02,
    gpuPerMm2: 0.05,
    uncorePerMm2: 0.05,
  };
  const MAX_CELLS_SIDE = 200;
  const DEFAULT_CELL_MM = 0.25;

  const finite = (x) => typeof x === 'number' && Number.isFinite(x);
  const tent = (o) => Object.assign(o, { tentative: true, tentativeNote: NOTE_TENTATIVE });

  function mergeWeights(w) {
    const o = w || {};
    return {
      core: Object.assign({}, DEFAULT_WEIGHTS.core, o.core || {}),
      coreOther: finite(o.coreOther) ? o.coreOther : DEFAULT_WEIGHTS.coreOther,
      l3PerMm2: finite(o.l3PerMm2) ? o.l3PerMm2 : DEFAULT_WEIGHTS.l3PerMm2,
      gpuPerMm2: finite(o.gpuPerMm2) ? o.gpuPerMm2 : DEFAULT_WEIGHTS.gpuPerMm2,
      uncorePerMm2: finite(o.uncorePerMm2) ? o.uncorePerMm2 : DEFAULT_WEIGHTS.uncorePerMm2,
    };
  }

  function blockPowers(design, totalW, weights) {
    if (!finite(totalW) || totalW < 0) return tent({ ok: false, reason: '全体の電力が不正です(有限の 0 以上の数値が必要)', notes: [NOTE_TENTATIVE] });
    const w = mergeWeights(weights);
    const items = [];
    ((design && design.dies) || []).forEach((die) => (die.blocks || []).forEach((b) => {
      const area = Math.max(0, (b.w || 0) * (b.h || 0));
      let wt;
      if (area <= 0) wt = 0;
      else if (b.kind === 'core') wt = w.core[b.coreType] != null ? w.core[b.coreType] : w.coreOther;
      else if (b.kind === 'l3') wt = w.l3PerMm2 * area;
      else if (b.kind === 'gpu') wt = w.gpuPerMm2 * area;
      else wt = w.uncorePerMm2 * area;
      items.push({ id: b.id, wt });
    }));
    const sum = items.reduce((s, i) => s + i.wt, 0);
    const notes = [NOTE_TENTATIVE, 'コアのクロック差(ダイ・種別ごとの動作周波数の違い)は無視している(ブロックにクロックの情報が無いため)'];
    const byBlock = {};
    if (!(sum > 0)) {
      if (totalW > 0) return tent({ ok: false, reason: '按分できるブロックがありません(重みの合計が 0)', notes });
      items.forEach((i) => { byBlock[i.id] = 0; });
      return tent({ ok: true, byBlock, notes });
    }
    items.forEach((i) => { byBlock[i.id] = totalW * i.wt / sum; });
    return tent({ ok: true, byBlock, notes });
  }

  function powerDensityGrid(design, byBlock, opts) {
    const o = opts || {};
    const leakFrac = finite(o.leakFrac) ? Math.min(1, Math.max(0, o.leakFrac)) : 0.1;
    let cell = finite(o.cellMm) && o.cellMm > 0 ? o.cellMm : DEFAULT_CELL_MM;
    const dies = (design && design.dies) || [];
    // 1 ダイのセル数の上限 200×200 になるよう、必要なら粗くする
    dies.forEach((d) => { cell = Math.max(cell, d.widthMm / MAX_CELLS_SIDE, d.heightMm / MAX_CELLS_SIDE); });
    const notes = [NOTE_TENTATIVE];
    const bp = byBlock || {};
    let blockSum = 0;
    dies.forEach((d) => (d.blocks || []).forEach((b) => { blockSum += bp[b.id] || 0; }));
    const leakW = blockSum * leakFrac;
    const scale = 1 - leakFrac;
    const totalArea = dies.reduce((s, d) => s + d.widthMm * d.heightMm, 0);
    const grids = [];
    const overlapped = [];
    dies.forEach((die) => {
      const nx = Math.max(1, Math.round(die.widthMm / cell));
      const ny = Math.max(1, Math.round(die.heightMm / cell));
      const cw = die.widthMm / nx; const ch = die.heightMm / ny; const area = cw * ch;
      const owner = new Int32Array(nx * ny).fill(-1);
      const blocks = die.blocks || [];
      const cnt = new Array(blocks.length).fill(0);
      blocks.forEach((b, bi) => {
        let n = 0;
        for (let j = 0; j < ny; j++) {
          const cy = (j + 0.5) * ch;
          if (cy < b.y || cy >= b.y + b.h) continue;
          for (let i = 0; i < nx; i++) {
            const cx = (i + 0.5) * cw;
            if (cx < b.x || cx >= b.x + b.w) continue;
            const k = j * nx + i;
            if (owner[k] >= 0) { if (overlapped.indexOf(b.id) < 0) overlapped.push(b.id); continue; }
            owner[k] = bi; n++;
          }
        }
        if (n === 0 && (b.w || 0) > 0 && (b.h || 0) > 0) {
          // セルより小さいブロック: 中心に最も近い(空いていれば)セルを 1 つ割り当てる
          const i = Math.min(nx - 1, Math.max(0, Math.floor((b.x + b.w / 2) / cw)));
          const j = Math.min(ny - 1, Math.max(0, Math.floor((b.y + b.h / 2) / ch)));
          const k = j * nx + i;
          if (owner[k] < 0) { owner[k] = bi; n = 1; }
        }
        cnt[bi] = n;
      });
      const rho = new Float32Array(nx * ny);
      const leakRho = totalArea > 0 ? leakW / totalArea : 0;
      for (let k = 0; k < rho.length; k++) {
        const bi = owner[k];
        let r = leakRho;
        if (bi >= 0 && cnt[bi] > 0) r += scale * (bp[blocks[bi].id] || 0) / (cnt[bi] * area);
        rho[k] = r;
      }
      const lost = blocks.filter((b, bi) => cnt[bi] === 0 && (bp[b.id] || 0) > 0).map((b) => b.id);
      if (lost.length) notes.push(`セルに割り当てられず電力が反映されないブロックがある(ダイ外・大きさ 0 など): ${lost.join(', ')}`);
      grids.push({ dieId: die.id, nx, ny, cellMm: cell, cellW: cw, cellH: ch, rho, mask: new Uint8Array(nx * ny).fill(1), owner });
    });
    if (overlapped.length) notes.push(`重なっているブロックは先に定義されたものを優先し、電力は二重計上していない: ${overlapped.join(', ')}`);
    return tent({ grids, leakW, notes });
  }

  const gridPower = (g) => { let s = 0; const a = g.cellW * g.cellH; for (let k = 0; k < g.rho.length; k++) s += g.rho[k] * a; return s; };

  // シリコンの定数(js/sim/thermal.js の DEFAULT_THERMAL と同じ値。読み込めれば SDS.sim.thermal / require を優先)
  const SI_FALLBACK = { kSi: 150, tDieMm: 0.3 };
  function siParams() {
    let t = null;
    try {
      if (root.SDS && root.SDS.sim && root.SDS.sim.thermal) t = root.SDS.sim.thermal;
      else if (typeof require === 'function') t = require('./thermal.js');
    } catch (e) { t = null; }
    const d = t && t.DEFAULT_THERMAL;
    return { kSi: d && finite(d.kSi) ? d.kSi : SI_FALLBACK.kSi, tDieMm: d && finite(d.tDieMm) ? d.tDieMm : SI_FALLBACK.tDieMm };
  }

  // 単一のダイのグリッド、またはその配列を受け取る。配列のときは dies を持つ結果を返す。
  // モデル: 局所の上昇 θ はシリコンの厚み方向(tDie/kSi)と面内(kSi×tDie)の伝導だけで解き、
  // 全ダイ共通の蓋温度 T_lid を足す。T_lid は全体の面積加重平均が tMeanTargetC になるよう決める。
  function solveTemperature(gridIn, opts) {
    const o = opts || {};
    const list = Array.isArray(gridIn) ? gridIn : [gridIn];
    const target = o.tMeanTargetC;
    if (!finite(target)) return tent({ ok: false, reason: 'tMeanTargetC が不正です' });
    const tAmb = finite(o.tAmbientC) ? o.tAmbientC : 25;
    const maxIter = finite(o.maxIter) ? o.maxIter : 5000;
    const tol = finite(o.tol) ? o.tol : 1e-4;
    const si = siParams();
    const rSi = si.tDieMm / (si.kSi * 1e-3); // K·mm²/W(kSi は W/(m·K) → W/(mm·K) に換算)
    const gLat = si.kSi * 1e-3 * si.tDieMm; // 隣接セル間の伝導 W/K(正方形セルでは辺の長さに依らない)
    let P = 0; let A = 0; let N = 0;
    list.forEach((g) => { P += gridPower(g); A += g.cellW * g.cellH * g.rho.length; N += g.rho.length; });
    const notes = [NOTE_TENTATIVE, '§6.2 の k_hot(仮の経験式)は使わず、2D 熱拡散の結果の ΔT をそのまま使う',
      '横方向の広がりはシリコンの熱伝導(kSi×tDie)、縦方向の分は呼び出し側の平均温度から逆算、全ダイは共通の蓋温度を共有。TIM・蓋・冷却器の分は仮置き'];
    if (o.spreadMm !== undefined || o.kLat !== undefined) notes.push('spreadMm / kLat は廃止(後方互換のため受けるが無視)');
    const rise = target - tAmb;
    const uniform = !(P > 0) || !(rise > 0);
    if (P > 0 && !(rise > 0)) notes.push('tMeanTargetC が周囲温度以下のため、一様な温度で返した');
    // 平均の面積あたり熱抵抗から、シリコン厚み方向の分を引いた残りが TIM・蓋・冷却器の分
    let rSink = 0; let rSinkGiven = false;
    if (!uniform) {
      if (finite(o.rSinkAreaKmm2W) && o.rSinkAreaKmm2W >= 0) { rSink = o.rSinkAreaKmm2W; rSinkGiven = true; }
      else {
        rSink = rise * A / P - rSi;
        if (rSink < 0) { notes.push('平均温度の目標が低くシリコンの厚み方向の抵抗だけで超えるため、TIM・蓋・冷却器の分を 0 とした'); rSink = 0; }
      }
    }
    let iterations = 0; let converged = true;
    let sum = 0; let tMax = -Infinity; let tMin = Infinity;
    const results = list.map((g) => {
      const n = g.rho.length; const T = new Float32Array(n);
      if (uniform) T.fill(target);
      else {
        const area = g.cellW * g.cellH; const gs = area / rSi;
        const gx = gLat * g.cellH / g.cellW; const gy = gLat * g.cellW / g.cellH; // 正方形セルなら両方 gLat
        const th = new Float64Array(n);
        for (let k = 0; k < n; k++) th[k] = g.rho[k] * area / gs;
        const { nx, ny } = g; let it = 0; let ok = false;
        for (; it < maxIter; it++) {
          let maxD = 0;
          for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
              const k = j * nx + i; let nb = 0; let sw = 0;
              if (i > 0) { nb += gx * th[k - 1]; sw += gx; }
              if (i < nx - 1) { nb += gx * th[k + 1]; sw += gx; }
              if (j > 0) { nb += gy * th[k - nx]; sw += gy; }
              if (j < ny - 1) { nb += gy * th[k + nx]; sw += gy; }
              const nv = (g.rho[k] * area + nb) / (gs + sw);
              const d = Math.abs(nv - th[k]); if (d > maxD) maxD = d;
              th[k] = nv;
            }
          }
          if (maxD < tol) { ok = true; it++; break; }
        }
        iterations = Math.max(iterations, it); if (!ok) converged = false;
        for (let k = 0; k < n; k++) T[k] = th[k]; // 局所の上昇(蓋温度は後で足す)
      }
      return { dieId: g.dieId, T };
    });
    if (!uniform) {
      // 全ダイ共通の蓋温度。渡された rSink があれば tAmb + rSink×(P/A) を使い、なければ全体の面積加重平均が目標になるよう決める
      let s = 0; results.forEach((r, ri) => { const a = list[ri].cellW * list[ri].cellH; for (let k = 0; k < r.T.length; k++) s += r.T[k] * a; });
      const tLid = rSinkGiven ? tAmb + rSink * P / A : target - s / A;
      results.forEach((r) => { for (let k = 0; k < r.T.length; k++) r.T[k] += tLid; });
    }
    results.forEach((r) => {
      let s = 0; let mx = -Infinity; let mn = Infinity;
      for (let k = 0; k < r.T.length; k++) { const v = r.T[k]; s += v; if (v > mx) mx = v; if (v < mn) mn = v; }
      r.tMaxC = mx; r.tMinC = mn; r.tMeanC = s / r.T.length;
      sum += r.tMeanC * list[results.indexOf(r)].cellW * list[results.indexOf(r)].cellH * r.T.length; if (mx > tMax) tMax = mx; if (mn < tMin) tMin = mn;
      r.iterations = iterations; r.converged = converged; tent(r);
    });
    const out = { tMaxC: tMax, tMeanC: sum / A, tMinC: tMin, iterations, converged, notes, rSinkAreaKmm2W: rSink };
    if (!Array.isArray(gridIn)) { out.T = results[0].T; out.dieId = results[0].dieId; } else out.dies = results;
    return tent(out);
  }

  // T は温度マップ(Float32Array)。ΔT = tMax − tMean(そのダイの平均)。
  function hotspot(grid, T) {
    let mx = -Infinity; let mi = 0; let s = 0;
    for (let k = 0; k < T.length; k++) { s += T[k]; if (T[k] > mx) { mx = T[k]; mi = k; } }
    const mean = s / T.length;
    const i = mi % grid.nx; const j = Math.floor(mi / grid.nx);
    return tent({
      dieId: grid.dieId, xMm: (i + 0.5) * grid.cellW, yMm: (j + 0.5) * grid.cellH, ix: i, iy: j,
      tMaxC: mx, tMeanC: mean, deltaC: mx - mean,
      notes: [NOTE_TENTATIVE, '§6.2 の k_hot(仮の経験式)の代わりに、2D 熱拡散の結果の ΔT をそのまま使う'],
    });
  }

  function toColors(field, kind) {
    const unit = kind === 'temp' ? '°C' : 'W/mm²';
    let mn = Infinity; let mx = -Infinity;
    for (let k = 0; k < field.length; k++) { const v = field[k]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const values = new Float32Array(field.length);
    const uniform = field.length === 0 || mx - mn <= 1e-12 * Math.max(1, Math.abs(mx));
    if (uniform) values.fill(0.5);
    else for (let k = 0; k < field.length; k++) values[k] = (field[k] - mn) / (mx - mn);
    return tent({ values, legend: { min: uniform && field.length === 0 ? 0 : mn, max: uniform && field.length === 0 ? 0 : mx, unit, uniform, label: uniform ? '一様' : null } });
  }

  const api = { NOTE_TENTATIVE, DEFAULT_WEIGHTS, blockPowers, powerDensityGrid, solveTemperature, hotspot, toColors };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.heatmap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
