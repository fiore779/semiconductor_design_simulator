// iGPU のデータ(設計書の対象拡張。2026-11-20 ユーザー決定「iGPU も性能評価に入れる」)。AMD Radeon 600M〜800M 系 9 SKU + Intel Arc 140V = 10 SKU。
// 仕様: CU 数・最大 GPU クロックは Wikipedia の List of AMD Ryzen processors(2026-11-25 取得。[二次]。**クロックは SKU ごとに違う**ので、同じ iGPU を載せた SKU の最大値)。
//   Arc 140V は Wikipedia の Lunar Lake(Xe2-LPG 8 コア・LPDDR5X-8533。[二次])。シェーダー数は AMD が SP(2 発行は数えない)、Intel が Xe コア × 128。Arc 140V のクロック 1950MHz は主流 SKU の値([推定]。未確認)。
// メモリ帯域(bwGBs)は **CPU とのチップ共有メモリ**。標本の機器は不明なので、**典型構成**の理論値を [推定] で置いた(DDR5-5600 デュアル = 89.6、LPDDR5X-7500 128bit = 120、
//   Strix Halo の LPDDR5X-8000 256bit = 256、Arc 140V の LPDDR5X-8533 128bit = 136.5)。**実機の構成で ±50% 変わりうる**(UI で編集できる)。
// openclScore: Geekbench 7 の OpenCL チャート(2026-11-25 取得。RTX 4060 = 100,000 基準。[公表])。Linux 系の行(radeonsi・Mesa)は除外、同名の行は平均。
//   **同名の iGPU でも標本の間で最大 2 倍近く開く**(メモリ構成・電力設定の違い。780M は 17,509〜25,197、890M は 16,509 と 31,127)。note に件数と幅を書く。
// 除外(未確認で推測しない): Apple M 系・Adreno(シェーダー数・クロックが非公開)、Arc Graphics(Meteor Lake / Arrow Lake H の行が混在)、Arc 140T(行が 41,707 と 18,615 で割れる)、Xe3(Panther Lake。同世代の dGPU がない)。
(function (root) {
  'use strict';
  const g = (id, name, uarch, shaders, boostMHz, bwGBs, memNote, openclScore, note) => Object.assign({ id, name, kind: 'igpu', uarch, shaders, boostMHz, bwGBs, memNote, openclScore, s: 'sec', bwS: 'est' }, note ? { note } : {});
  const igpus = [
    g('amd-680m', 'Radeon 680M(Rembrandt)', 'RDNA 2', 768, 2400, 76.8, 'DDR5-4800 128bit', 17654, 'チャートの 2 行(18,167 / 17,140)の平均。12 CU'),
    g('amd-740m', 'Radeon 740M(Phoenix)', 'RDNA 3', 256, 2800, 89.6, 'DDR5-5600 128bit', 12552, '標本 1 行。4 CU'),
    g('amd-760m', 'Radeon 760M(Phoenix)', 'RDNA 3', 512, 2800, 89.6, 'DDR5-5600 128bit', 19589, 'チャートの 3 行(20,072 / 19,852 / 18,842)の平均。8 CU'),
    g('amd-780m', 'Radeon 780M(Phoenix・Hawk Point)', 'RDNA 3', 768, 2900, 89.6, 'DDR5-5600 128bit', 22090, 'チャートの 4 行(25,197 / 24,334 / 21,320 / 17,509)の平均。**標本間で 1.4 倍の幅**。12 CU'),
    g('amd-860m', 'Radeon 860M(Kraken Point)', 'RDNA 3', 512, 3100, 89.6, 'DDR5-5600 128bit', 19610, 'チャートの 3 行(20,334 / 19,008 / 17,488)の平均。8 CU。RDNA 3.5 を RDNA 3 として扱う'),
    g('amd-880m', 'Radeon 880M(Strix Point)', 'RDNA 3', 768, 2900, 120, 'LPDDR5X-7500 128bit', 26853, '標本 1 行。12 CU。RDNA 3.5 を RDNA 3 として扱う'),
    g('amd-890m', 'Radeon 890M(Strix Point)', 'RDNA 3', 1024, 3100, 120, 'LPDDR5X-7500 128bit', 23818, 'チャートの 2 行(31,127 / 16,509)の平均。**標本間で 1.9 倍の幅**(外れ値の疑い)。16 CU。RDNA 3.5 を RDNA 3 として扱う'),
    g('amd-8050s', 'Radeon 8050S(Strix Halo)', 'RDNA 3', 2048, 2800, 256, 'LPDDR5X-8000 256bit', 69352, 'チャートの 2 行(71,754 / 66,950)の平均。32 CU'),
    g('amd-8060s', 'Radeon 8060S(Strix Halo)', 'RDNA 3', 2560, 2900, 256, 'LPDDR5X-8000 256bit', 86817, 'チャートの 4 行(91,472 / 86,109 / 86,061 / 83,625)の平均。40 CU'),
    g('intel-arc140v', 'Arc 140V(Lunar Lake)', 'Battlemage', 1024, 1950, 136.5, 'LPDDR5X-8533 128bit(オンパッケージ)', 27220, '標本 1 行(16GB 表記)。8 Xe2 コア'),
  ];
  const data = { igpus };
  if (typeof window !== 'undefined') { window.SDS_DATA = window.SDS_DATA || {}; window.SDS_DATA.igpus = igpus; }
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
