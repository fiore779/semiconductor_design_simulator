// dGPU の性能モデル(Geekbench 7 の GPU スコア = OpenCL)。UI に依存しない純関数。設計書 §1(2026-11-20 追加)・docs/research/gpu-eval-design-2026-11-25.md。
// モデル: 理論 FP32 TFLOPS = シェーダー数 × 2 × ブーストクロック(GHz)/ 1000。 スコア = u(世代)× TFLOPS^B。
// B = 0.69: RTX 40 の 9 SKU(OpenCL チャート)の対数最小二乗(TFLOPS が 5.5 倍で スコアが約 3 倍 = 演算量に対して飽和する)。**学習内の値**で、検証ではない(第 1 段階は世代が Ada の 1 つだけ)。
// u(世代)は世代内の SKU の u = スコア / TFLOPS^B の中央値(CPU の uCal と同じ方式)。SKU ごとの特別な係数は入れない。**メモリ帯域の上限は未実装**(残差の説明は研究ノート)。
(function (root) {
  'use strict';
  const B = 0.69;
  const tflops = (g) => g.shaders * 2 * g.boostMHz / 1e6;
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  // 世代ごとの u。openclScore のある SKU の中央値。1 つもない世代は null(予測できない)
  function uOf(gpus, uarch) { return median(gpus.filter((g) => g.uarch === uarch && g.openclScore > 0).map((g) => g.openclScore / Math.pow(tflops(g), B))); }
  function predict(g, u) { return u == null ? null : u * Math.pow(tflops(g), B); }
  const api = { B, tflops, uOf, predict };
  if (typeof window !== 'undefined') { window.SDS = window.SDS || {}; window.SDS.gpuperf = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
