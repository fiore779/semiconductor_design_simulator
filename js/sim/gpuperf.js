// dGPU の性能モデル(Geekbench 7 の GPU スコア = OpenCL)。UI に依存しない純関数。設計書(2026-11-25 の項)・docs/research/gpu-eval-design-2026-11-25.md。
// モデル: スコア = u(世代)× TFLOPS^A × 帯域^C。 TFLOPS = シェーダー数 × 2 × ブーストクロック(MHz)/ 10^6、帯域 = メモリ帯域(GB/s)。
// A = 0.38・C = 0.46: 52 SKU(RTX 30/40/50・RX 6000/7000/9000・Arc)の対数最小二乗(世代ごとの切片つき。TFLOPS だけの A = 0.80 より残差が小さい)を丸めた値。**学習内の値**(指数は全 SKU で当てた)。
// 演算量だけでなく**メモリ帯域が効く**(C = 0.46)。帯域の「上限」ではなく連続的な弾性として入れた(CPU の帯域キャップとは別方式)。クロックを変えると TFLOPS が変わるが、帯域を固定すると効きが弱い(A が小さい)点が限界。
// u(世代)は世代内の SKU の u = スコア / (TFLOPS^A × 帯域^C) の中央値(CPU の uCal と同じ方式)。SKU ごとの特別な係数は入れない。
(function (root) {
  'use strict';
  const A = 0.38; const C = 0.46;
  const tflops = (g) => g.shaders * 2 * g.boostMHz / 1e6;
  const base = (g) => Math.pow(tflops(g), A) * Math.pow(g.bwGBs, C);
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  // 世代ごとの u。openclScore のある SKU の中央値(exclude で 1 件を除ける = 1 件抜き検証用)。1 つもない世代は null(予測できない)
  function uOf(gpus, uarch, exclude) { return median(gpus.filter((g) => g.uarch === uarch && g.openclScore > 0 && g.id !== exclude).map((g) => g.openclScore / base(g))); }
  function predict(g, u) { return u == null ? null : u * base(g); }
  const api = { A, C, tflops, uOf, predict };
  if (typeof window !== 'undefined') { window.SDS = window.SDS || {}; window.SDS.gpuperf = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
