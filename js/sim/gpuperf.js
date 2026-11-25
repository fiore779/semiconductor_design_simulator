// dGPU の性能モデル(Geekbench 7 の GPU スコア = OpenCL)。UI に依存しない純関数。設計書(2026-11-25 の項)・docs/research/gpu-eval-design-2026-11-25.md。
// モデル: スコア = u(世代)× exp(A·ln T + D·(ln T)²)× 帯域^C。 T = TFLOPS = シェーダー数 × 2 × ブーストクロック(MHz)/ 10^6、帯域 = メモリ帯域(GB/s)。
// A = 1.15・D = -0.11・C = 0.37: 52 SKU(RTX 30/40/50・RX 6000/7000/9000・Arc)の対数最小二乗(世代ごとの切片つき)を丸めた値。**学習内の値**(係数は全 SKU で当てた)。
// 演算量だけでなく**メモリ帯域が効く**(C)。さらに D < 0 は**上位ほど演算量が効きにくくなる飽和**(大型 GPU は並列効率・電力・メモリ律速で伸びが鈍る)。
// 帯域は「上限」ではなく連続的な弾性として入れた(CPU の帯域キャップとは別方式)。二次項は ln T = A/(-2D) で頂点になるので、それ以上は頭打ち(単調性を保つ)。
(function (root) {
  'use strict';
  const A = 1.15; const D = -0.11; const C = 0.37;
  const LNMAX = A / (-2 * D); // 頂点(TFLOPS ≈ 186)。これ以上は頭打ち
  const tflops = (g) => g.shaders * 2 * g.boostMHz / 1e6;
  const base = (g) => { const l = Math.min(Math.log(tflops(g)), LNMAX); return Math.exp(A * l + D * l * l) * Math.pow(g.bwGBs, C); };
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  // 世代ごとの u。openclScore のある SKU の中央値(exclude で 1 件を除ける = 1 件抜き検証用)。1 つもない世代は null(予測できない)
  // class: 'igpu' なら iGPU の行だけ、省略なら dGPU(kind のない行)だけ。iGPU は電力・共有メモリの制約で同じ世代の dGPU より低い(dGPU の u で予測すると 15〜40% 高く出る。設計書 2026-11-25)
  const isI = (g) => g.kind === 'igpu';
  function uOf(gpus, uarch, exclude, cls) { return median(gpus.filter((g) => g.uarch === uarch && g.openclScore > 0 && g.id !== exclude && (cls === 'igpu') === isI(g)).map((g) => g.openclScore / base(g))); }
  function predict(g, u) { return u == null ? null : u * base(g); }
  const api = { A, D, C, tflops, uOf, predict };
  if (typeof window !== 'undefined') { window.SDS = window.SDS || {}; window.SDS.gpuperf = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
