// iGPU のデータ(設計書の対象拡張。2026-11-20 ユーザー決定「iGPU も性能評価に入れる」)。AMD Radeon 600M〜800M 系 9 SKU + Intel Arc 140V = 10 SKU。
// 仕様: CU 数・最大 GPU クロックは Wikipedia の List of AMD Ryzen processors(2026-11-25 取得。[二次]。**クロックは SKU ごとに違う**ので、同じ iGPU を載せた SKU の最大値)。
//   Arc 140V は Wikipedia の Lunar Lake(Xe2-LPG 8 コア・LPDDR5X-8533。[二次])。シェーダー数は AMD が SP(2 発行は数えない)、Intel が Xe コア × 128。Arc 140V のクロック 1950MHz は主流 SKU の値([推定]。未確認)。
// メモリ帯域(bwGBs)は **CPU とのチップ共有メモリ**。標本の機器は不明なので、**典型構成**の理論値を [推定] で置いた(DDR5-5600 デュアル = 89.6、LPDDR5X-7500 128bit = 120、
//   Strix Halo の LPDDR5X-8000 256bit = 256、Arc 140V の LPDDR5X-8533 128bit = 136.5)。**実機の構成で ±50% 変わりうる**(UI で編集できる)。
// openclScore: Geekbench 7 の OpenCL チャート(2026-11-25 取得。RTX 4060 = 100,000 基準。[公表])。Linux 系の行(radeonsi・Mesa)は除外、同名の行は平均。
//   **同名の iGPU でも標本の間で最大 2 倍近く開く**(メモリ構成・電力設定の違い。780M は 17,509〜25,197、890M は 16,509 と 31,127)。note に件数と幅を書く。
// 【2026-11-26 更新】多くの行を**機種別ページの再集計**(CPU 名で検索した GPU 結果の各ページから OpenCL デバイス名・OS・スコアを集め、Windows のみ・iGPU のデバイスだけの中央値)に置き換えた。
//   チャートの行は標本が 1〜4 件で幅が大きい(890M は 1.9 倍)のに対し、再集計は n=28〜220。SKU ごとのクロック・CPU のメモリ構成に合わせた行にした(780M は 7840HS と 8700G、140V は 268V/258V/256V の別行)。
//   Arc 140T(285H)・Arc Graphics(185H)を追加(Xe-LPG は Alchemist 扱い)。
// 除外(未確認で推測しない): Apple M 系・Adreno(シェーダー数・クロックが非公開)、Arc Graphics(Meteor Lake / Arrow Lake H の行が混在)、Arc 140T(行が 41,707 と 18,615 で割れる)、Xe3(Panther Lake。同世代の dGPU がない)。
(function (root) {
  'use strict';
  const N = '機種別ページの再集計(2026-11-26。search の GPU 結果を CPU 名で集め、各結果ページの OpenCL デバイス名と OS で絞った。Windows のみ。Primate Labs の公式集計ではなく本ツールの再集計の中央値)';
  const g = (id, name, uarch, shaders, boostMHz, bwGBs, memNote, openclScore, note) => Object.assign({ id, name, kind: 'igpu', uarch, shaders, boostMHz, bwGBs, memNote, openclScore, s: 'sec', bwS: 'est' }, note ? { note } : {});
  const igpus = [
    g('amd-680m', 'Radeon 680M(Rembrandt。Ryzen 7 7735HS)', 'RDNA 2', 768, 2200, 76.8, 'DDR5-4800 128bit', 17615, '7735HS の結果 n=81 の中央値(四分位 12,231〜22,214)。'+N+'。12 CU。チャートの行は 17,654'),
    g('amd-740m', 'Radeon 740M(Phoenix。Ryzen 5 8500G)', 'RDNA 3', 256, 2800, 83.2, 'DDR5-5200 128bit', 12011, '8500G の結果 n=28 の中央値(四分位 10,282〜13,943)。'+N+'。4 CU。チャートの行は 12,552(標本 1 行)'),
    g('amd-760m', 'Radeon 760M(Phoenix)', 'RDNA 3', 512, 2800, 89.6, 'DDR5-5600 128bit', 19589, 'チャートの 3 行(20,072 / 19,852 / 18,842)の平均。8 CU'),
    g('amd-780m', 'Radeon 780M(Phoenix。Ryzen 7 7840HS)', 'RDNA 3', 768, 2700, 89.6, 'DDR5-5600 128bit', 25686, '7840HS の結果 n=50 の中央値(四分位 20,641〜27,865)。'+N+'。12 CU。チャートの 4 行の平均は 22,090(1.4 倍の幅)'),
    g('amd-780m-8700g', 'Radeon 780M(Phoenix。Ryzen 7 8700G)', 'RDNA 3', 768, 2900, 83.2, 'DDR5-5200 128bit', 27752, '8700G の結果 n=60 の中央値(四分位 22,013〜30,321)。'+N+'。12 CU'),
    g('amd-860m', 'Radeon 860M(Kraken Point。Ryzen AI 7 350)', 'RDNA 3', 512, 3000, 89.6, 'DDR5-5600 128bit', 20149, 'AI 7 350 の結果 n=136 の中央値(四分位 17,097〜22,439)。'+N+'。8 CU。RDNA 3.5 を RDNA 3 として扱う。チャートの 3 行の平均は 19,610'),
    g('amd-880m', 'Radeon 880M(Strix Point)', 'RDNA 3', 768, 2900, 120, 'LPDDR5X-7500 128bit', 26853, '標本 1 行。12 CU。RDNA 3.5 を RDNA 3 として扱う'),
    g('amd-890m', 'Radeon 890M(Strix Point。Ryzen AI 9 HX 370)', 'RDNA 3', 1024, 2900, 120, 'LPDDR5X-7500 128bit', 29883, 'HX 370 の結果 n=81 の中央値(四分位 26,019〜32,892)。'+N+'。16 CU。RDNA 3.5 を RDNA 3 として扱う。チャートの 2 行の平均は 23,818(31,127 / 16,509 の 1.9 倍の幅は標本の少なさ。再集計で 890M は 1.25 倍に収まる)'),
    g('amd-8050s', 'Radeon 8050S(Strix Halo)', 'RDNA 3', 2048, 2800, 256, 'LPDDR5X-8000 256bit', 69352, 'チャートの 2 行(71,754 / 66,950)の平均。32 CU'),
    g('amd-8060s', 'Radeon 8060S(Strix Halo。Ryzen AI Max+ 395)', 'RDNA 3', 2560, 2900, 256, 'LPDDR5X-8000 256bit', 92795, 'AI Max+ 395 の結果 n=158 の中央値(四分位 85,856〜96,428)。'+N+'。40 CU。チャートの 4 行の平均は 86,817'),
    g('intel-arc140v', 'Arc 140V(Lunar Lake。Core Ultra 7 258V)', 'Battlemage', 1024, 1950, 136.5, 'LPDDR5X-8533 128bit(オンパッケージ)', 28552, '258V の結果 n=205 の中央値(四分位 20,927〜30,120)。'+N+'。8 Xe2 コア(GB7 の Compute Units 64)。チャートの行は 27,220'),
    g('intel-arc140v-268v', 'Arc 140V(Lunar Lake。Core Ultra 7 268V)', 'Battlemage', 1024, 2000, 136.5, 'LPDDR5X-8533 128bit(オンパッケージ)', 29987, '268V の結果 n=89 の中央値(四分位 28,707〜30,750)。'+N),
    g('intel-arc140v-256v', 'Arc 140V(Lunar Lake。Core Ultra 5 256V)', 'Battlemage', 1024, 1950, 136.5, 'LPDDR5X-8533 128bit(オンパッケージ)', 25573, '256V の結果 n=196 の中央値(四分位 20,533〜28,963)。'+N+'。同じ 140V・同クロックなのに 258V より約 10% 低い(メモリ構成などの差とみられる。8GB 表記の機種が多い)'),
    g('intel-arc140t', 'Arc 140T(Arrow Lake H。Core Ultra 9 285H)', 'Alchemist', 1024, 2350, 134.4, 'LPDDR5X-8400 128bit(典型。[推定])', 33498, '285H の結果 n=220 の中央値(四分位は集計時に未保存)。'+N+'。Xe-LPG 8 コア(GB7 の Compute Units 128)。世代は Xe-LPG を Alchemist(同じ Xe-HPG 系)として扱う。**チャートの Arc 140T の行は 18,615〜42,921 に割れていた**'),
    g('intel-arc185h', 'Arc Graphics(Meteor Lake。Core Ultra 9 185H)', 'Alchemist', 1024, 2350, 119.5, 'LPDDR5X-7467 128bit(典型。[推定])', 27568, '185H の結果 n=97 の中央値(四分位 23,721〜29,974)。'+N+'。Xe-LPG 8 コア(Compute Units 128)'),
  ];
  // CPU プリセット → 内蔵 iGPU(2026-11-26)。boostMHz はその SKU のクロック(Wikipedia の List of AMD Ryzen processors・Lunar Lake の各 SKU の行。2026-11-26 取得。[二次])。
  // iGPU の行(上)のクロックは同じ iGPU を載せた SKU の最大値なので、SKU のクロックが低いときはこちらで上書きする。**載っていないプリセットは未対応**(7945HX は Wikipedia の表に iGPU の記載がなく、Radeon 610M はこのデータにない)。
  const presetIgpu = {
    'amd-zen3p-7735hs': { igpuId: 'amd-680m', boostMHz: 2200 }, 'intel-arl-285h': { igpuId: 'intel-arc140t', boostMHz: 2350 }, 'intel-mtl-185h': { igpuId: 'intel-arc185h', boostMHz: 2350 },
    'amd-zen4-7840hs': { igpuId: 'amd-780m', boostMHz: 2700 },
    'amd-zen4-8700g': { igpuId: 'amd-780m-8700g', boostMHz: 2900 },
    'amd-zen4-8500g': { igpuId: 'amd-740m', boostMHz: 2800 },
    'amd-strix-hx370': { igpuId: 'amd-890m', boostMHz: 2900 },
    'amd-kraken-350': { igpuId: 'amd-860m', boostMHz: 3000 },
    'amd-strixhalo-395': { igpuId: 'amd-8060s', boostMHz: 2900 },
    'intel-lnl-268v': { igpuId: 'intel-arc140v-268v', boostMHz: 2000 },
    'intel-lnl-258v': { igpuId: 'intel-arc140v', boostMHz: 1950 },
    'intel-lnl-256v': { igpuId: 'intel-arc140v-256v', boostMHz: 1950 },
  };
  const data = { igpus, presetIgpu };
  if (typeof window !== 'undefined') { window.SDS_DATA = window.SDS_DATA || {}; window.SDS_DATA.igpus = igpus; window.SDS_DATA.presetIgpu = presetIgpu; }
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
