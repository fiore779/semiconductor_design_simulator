// CPU + GPU の総合スコア(設計書 2026-11-26)。UI に依存しない純関数。
// 総合 = 1000 × CPU 指数^w × GPU 指数^(1−w)(重みつき幾何平均。w は CPU の重み、既定 0.5)。
//   CPU 指数 = √( ST/ST_REF × MT/MT_REF )(ST と MT の幾何平均)。GPU 指数 = OpenCL スコア / GPU_REF。
//   基準 = Core i9-13980HX(Geekbench 7 の ST 2501・MT 18287。[実測]。プリセットの値)+ GeForce RTX 4060(OpenCL 100,000 = Geekbench 7 GPU の基準)で 1000 点。
//   **この基準と重みは本ツールの取り決め**(Geekbench 公式の総合点ではない)。幾何平均なので、どちらかが 2 倍になると総合は √2 倍(w = 0.5)。片方が 0 以下・未取得なら出さない(null)。
// 共有キャッシュ: CPU と GPU が同じキャッシュを共有するときは、容量を半分ずつ(ユーザー指示 2026-11-26)。
(function (root) {
  'use strict';
  const REF = { st: 2501, mt: 18287, gpu: 100000, score: 1000 };
  const pos = (v) => typeof v === 'number' && isFinite(v) && v > 0;
  const cpuIndex = (st, mt) => (pos(st) && pos(mt) ? Math.sqrt((st / REF.st) * (mt / REF.mt)) : null);
  const gpuIndex = (gpu) => (pos(gpu) ? gpu / REF.gpu : null);
  // w: CPU の重み(0〜1)。範囲外・数でないときは 0.5
  const clampW = (w) => (typeof w === 'number' && isFinite(w) && w >= 0 && w <= 1 ? w : 0.5);
  function combined(st, mt, gpu, w) {
    const c = cpuIndex(st, mt); const g = gpuIndex(gpu);
    if (c == null || g == null) return null;
    const ww = clampW(w);
    return REF.score * Math.pow(c, ww) * Math.pow(g, 1 - ww);
  }
  // 共有キャッシュ容量(MB)を CPU と GPU で半分ずつ。shared でなければ CPU は全量(GPU 側は自前のキャッシュで、ここでは扱わない = null)
  function sharedSplit(totalMB, shared) {
    if (!(typeof totalMB === 'number' && isFinite(totalMB) && totalMB >= 0)) return null;
    return shared ? { cpuMB: totalMB / 2, gpuMB: totalMB / 2 } : { cpuMB: totalMB, gpuMB: null };
  }
  const api = { REF, cpuIndex, gpuIndex, combined, sharedSplit, clampW };
  if (typeof window !== 'undefined') { window.SDS = window.SDS || {}; window.SDS.combo = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
