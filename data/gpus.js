// dGPU のデータ(設計書の対象拡張。2026-11-20 ユーザー決定。docs/research/gpu-eval-design-2026-11-20.md・gpu-eval-design-2026-11-25.md)。**デスクトップ向け 52 SKU**: NVIDIA RTX 30 / 40 / 50、AMD RX 6000 / 7000 / 9000、Intel Arc Alchemist / Battlemage。
// 仕様(シェーダー数・ブーストクロック・メモリ帯域・バス幅・TGP)は Wikipedia の各シリーズのページ(2026-11-25 取得。[二次])。**各社の公式仕様ページとの照合は未了**。AMD のシェーダー数は SP(RDNA 3 の 2 発行は数えない)、Intel は Xe コア × 128(B570 は 144 ベクトルエンジン × 16)。
// openclScore: Geekbench 7 の OpenCL チャート(browser.geekbench.com/opencl-benchmarks。2026-11-20 取得。RTX 4060 = 100,000 基準。Primate Labs の集計平均 = [公表])。同名の行が 2 つある SKU は平均(note に書く)。
// 除外: OEM・中国向け・ノート向け・ワークステーション・Linux 系の行(Mesa・ROCm の 'Compute Engine'・NVK)。
(function (root) {
  'use strict';
  const g = (id, name, uarch, shaders, boostMHz, bwGBs, busBits, tgpW, openclScore, note) => Object.assign({ id, name, uarch, shaders, boostMHz, bwGBs, busBits, tgpW, openclScore, s: 'sec' }, note ? { note } : {});
  const gpus = [
    g('nv-rtx3050', 'GeForce RTX 3050 (8GB)', 'Ampere', 2560, 1777, 224, 128, 130, 53623),
    g('nv-rtx3060', 'GeForce RTX 3060 (12GB)', 'Ampere', 3584, 1777, 360, 192, 170, 80123),
    g('nv-rtx3060ti', 'GeForce RTX 3060 Ti', 'Ampere', 4864, 1665, 448, 256, 200, 107758.5, 'チャートの 2 行(110,966 / 104,551)の平均'),
    g('nv-rtx3070', 'GeForce RTX 3070', 'Ampere', 5888, 1725, 448, 256, 220, 116010),
    g('nv-rtx3070ti', 'GeForce RTX 3070 Ti', 'Ampere', 6144, 1770, 608, 256, 290, 127248),
    g('nv-rtx3080', 'GeForce RTX 3080 (10GB)', 'Ampere', 8704, 1710, 760, 320, 320, 162934, 'チャートの 2 行(167,014 / 158,854)の平均'),
    g('nv-rtx3080ti', 'GeForce RTX 3080 Ti', 'Ampere', 10240, 1665, 912, 384, 350, 181725),
    g('nv-rtx3090', 'GeForce RTX 3090', 'Ampere', 10496, 1695, 936, 384, 350, 184600.5, 'チャートの 2 行(191,142 / 178,059)の平均'),
    g('nv-rtx3090ti', 'GeForce RTX 3090 Ti', 'Ampere', 10752, 1860, 1008, 384, 450, 186491),
    g('nv-rtx4060', 'GeForce RTX 4060', 'Ada', 3072, 2460, 272, 128, 115, 97118),
    g('nv-rtx4060ti', 'GeForce RTX 4060 Ti', 'Ada', 4352, 2540, 288, 128, 160, 115465),
    g('nv-rtx4070', 'GeForce RTX 4070', 'Ada', 5888, 2475, 504, 192, 200, 160692),
    g('nv-rtx4070s', 'GeForce RTX 4070 SUPER', 'Ada', 7168, 2475, 504, 192, 220, 183957, '帯域 504 GB/s は 4070 と同じ 192bit・21Gbps からの読み取り'),
    g('nv-rtx4070ti', 'GeForce RTX 4070 Ti', 'Ada', 7680, 2610, 504, 192, 285, 188106, '帯域 504 GB/s は 4070 と同じ 192bit・21Gbps からの読み取り'),
    g('nv-rtx4070tis', 'GeForce RTX 4070 Ti SUPER', 'Ada', 8448, 2610, 672, 256, 285, 210530),
    g('nv-rtx4080', 'GeForce RTX 4080', 'Ada', 9728, 2505, 716.8, 256, 320, 231772),
    g('nv-rtx4080s', 'GeForce RTX 4080 SUPER', 'Ada', 10240, 2550, 736, 256, 320, 229113),
    g('nv-rtx4090', 'GeForce RTX 4090', 'Ada', 16384, 2520, 1008, 384, 450, 295199),
    g('nv-rtx5050', 'GeForce RTX 5050', 'Blackwell', 2560, 2570, 320, 128, 130, 93610),
    g('nv-rtx5060', 'GeForce RTX 5060', 'Blackwell', 3840, 2500, 448, 128, 145, 121232),
    g('nv-rtx5060ti', 'GeForce RTX 5060 Ti', 'Blackwell', 4608, 2570, 448, 128, 180, 136120, '8GB と 16GB が同じ仕様。チャートの行がどちらかは不明'),
    g('nv-rtx5070', 'GeForce RTX 5070', 'Blackwell', 6144, 2510, 672, 192, 250, 187092),
    g('nv-rtx5070ti', 'GeForce RTX 5070 Ti', 'Blackwell', 8960, 2450, 896, 256, 300, 239771),
    g('nv-rtx5080', 'GeForce RTX 5080', 'Blackwell', 10752, 2620, 960, 256, 360, 265647),
    g('nv-rtx5090', 'GeForce RTX 5090', 'Blackwell', 21760, 2410, 1792, 512, 575, 374554),
    g('amd-rx6500xt', 'Radeon RX 6500 XT', 'RDNA 2', 1024, 2815, 144, 64, 107, 45519),
    g('amd-rx6600', 'Radeon RX 6600', 'RDNA 2', 1792, 2491, 224, 128, 132, 72503),
    g('amd-rx6600xt', 'Radeon RX 6600 XT', 'RDNA 2', 2048, 2589, 256, 128, 160, 80440),
    g('amd-rx6650xt', 'Radeon RX 6650 XT', 'RDNA 2', 2048, 2635, 280, 128, 180, 89158),
    g('amd-rx6700xt', 'Radeon RX 6700 XT', 'RDNA 2', 2560, 2581, 384, 192, 230, 109923),
    g('amd-rx6750xt', 'Radeon RX 6750 XT', 'RDNA 2', 2560, 2600, 432, 192, 250, 118677),
    g('amd-rx6800', 'Radeon RX 6800', 'RDNA 2', 3840, 2105, 512, 256, 250, 144620),
    g('amd-rx6800xt', 'Radeon RX 6800 XT', 'RDNA 2', 4608, 2250, 512, 256, 300, 163136, 'チャートの 2 行(167,405 / 158,867)の平均'),
    g('amd-rx6900xt', 'Radeon RX 6900 XT', 'RDNA 2', 5120, 2250, 512, 256, 300, 179932),
    g('amd-rx6950xt', 'Radeon RX 6950 XT', 'RDNA 2', 5120, 2310, 576, 256, 335, 195878),
    g('amd-rx7600', 'Radeon RX 7600', 'RDNA 3', 2048, 2655, 288, 128, 165, 86894),
    g('amd-rx7600xt', 'Radeon RX 7600 XT', 'RDNA 3', 2048, 2755, 288, 128, 190, 87602),
    g('amd-rx7700xt', 'Radeon RX 7700 XT', 'RDNA 3', 3456, 2544, 432, 192, 245, 141433),
    g('amd-rx7800xt', 'Radeon RX 7800 XT', 'RDNA 3', 3840, 2430, 624, 256, 263, 158304.5, 'チャートの 2 行(160,950 / 155,659)の平均'),
    g('amd-rx7900gre', 'Radeon RX 7900 GRE', 'RDNA 3', 5120, 2245, 576, 256, 260, 183063),
    g('amd-rx7900xt', 'Radeon RX 7900 XT', 'RDNA 3', 5376, 2400, 800, 320, 315, 186222, 'チャートの 2 行(188,298 / 184,146)の平均'),
    g('amd-rx7900xtx', 'Radeon RX 7900 XTX', 'RDNA 3', 6144, 2500, 960, 384, 355, 215111),
    g('amd-rx9060', 'Radeon RX 9060', 'RDNA 4', 1792, 2990, 288, 128, 132, 74765),
    g('amd-rx9060xt', 'Radeon RX 9060 XT', 'RDNA 4', 2048, 3130, 320, 128, 150, 88322, '8GB 150W / 16GB 160W。チャートの行の容量は不明'),
    g('amd-rx9070gre', 'Radeon RX 9070 GRE', 'RDNA 4', 3072, 2790, 432, 192, 220, 116419),
    g('amd-rx9070', 'Radeon RX 9070', 'RDNA 4', 3584, 2520, 640, 256, 220, 137112),
    g('amd-rx9070xt', 'Radeon RX 9070 XT', 'RDNA 4', 4096, 2970, 640, 256, 304, 168710),
    g('intel-arc-a580', 'Intel Arc A580', 'Alchemist', 3072, 1700, 512, 256, 175, 85235),
    g('intel-arc-a750', 'Intel Arc A750', 'Alchemist', 3584, 2400, 512, 256, 225, 98837),
    g('intel-arc-a770', 'Intel Arc A770', 'Alchemist', 4096, 2400, 560, 256, 225, 109349, '16GB(17.5Gbps)の帯域。8GB 版は 512 GB/s。チャートの行の容量は不明'),
    g('intel-arc-b570', 'Intel Arc B570', 'Battlemage', 2304, 2500, 380, 160, 150, 93580),
    g('intel-arc-b580', 'Intel Arc B580', 'Battlemage', 2560, 2670, 456, 192, 190, 103708, 'チャートに「Intel(R) Arc(TM)」表記(Windows。103,708)と「Intel Arc」表記(84,895)の 2 行。Windows 表記を採った'),
  ];
  const data = { gpus };
  if (typeof window !== 'undefined') { window.SDS_DATA = window.SDS_DATA || {}; window.SDS_DATA.gpus = gpus; }
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
