// dGPU のデータ(設計書 §1 の対象拡張。2026-11-20 ユーザー決定。docs/research/gpu-eval-design-2026-11-20.md)。**第 1 段階: NVIDIA GeForce RTX 40 シリーズ(デスクトップ)9 SKU**。
// 仕様: シェーダー数・ブーストクロック・メモリ帯域・バス幅・TGP は Wikipedia「GeForce RTX 40 series」(2026-11-25 取得。[二次])。公式(NVIDIA)の仕様ページとの照合は未了。
// openclScore: Geekbench 7 の OpenCL チャート(browser.geekbench.com/opencl-benchmarks。2026-11-20 取得。RTX 4060 = 100,000 基準。Primate Labs の集計平均 = [公表])。
// 帯域: 4070 SUPER・4070 Ti は Wikipedia の表で行が 4070 と結合されており、192bit・21Gbps の 504 GB/s は 4070 の値からの読み取り(要照合)。
(function (root) {
  'use strict';
  const g = (id, name, uarch, shaders, boostMHz, bwGBs, busBits, tgpW, openclScore) => ({ id, name, uarch, shaders, boostMHz, bwGBs, busBits, tgpW, openclScore, s: 'sec' });
  const gpus = [
    g('nv-rtx4060', 'GeForce RTX 4060', 'Ada', 3072, 2460, 272, 128, 115, 97118),
    g('nv-rtx4060ti', 'GeForce RTX 4060 Ti', 'Ada', 4352, 2540, 288, 128, 160, 115465),
    g('nv-rtx4070', 'GeForce RTX 4070', 'Ada', 5888, 2475, 504, 192, 200, 160692),
    g('nv-rtx4070s', 'GeForce RTX 4070 SUPER', 'Ada', 7168, 2475, 504, 192, 220, 183957),
    g('nv-rtx4070ti', 'GeForce RTX 4070 Ti', 'Ada', 7680, 2610, 504, 192, 285, 188106),
    g('nv-rtx4070tis', 'GeForce RTX 4070 Ti SUPER', 'Ada', 8448, 2610, 672, 256, 285, 210530),
    g('nv-rtx4080', 'GeForce RTX 4080', 'Ada', 9728, 2505, 716.8, 256, 320, 231772),
    g('nv-rtx4080s', 'GeForce RTX 4080 SUPER', 'Ada', 10240, 2550, 736, 256, 320, 229113),
    g('nv-rtx4090', 'GeForce RTX 4090', 'Ada', 16384, 2520, 1008, 384, 450, 295199),
  ];
  const data = { gpus };
  if (typeof window !== 'undefined') { window.SDS_DATA = window.SDS_DATA || {}; window.SDS_DATA.gpus = gpus; }
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
