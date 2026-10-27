// プロセスノード(設計書 §2.6 を転記。2026-10-27)。
// 各数値は { v: 値, s: 区分 } で持つ。区分: 'pub'=公表(メーカー・学会) / 'sec'=二次(Wikipedia・報道・推定) / null=未取得。
// 未取得は null のまま入れる(推測で埋めない)。校正に使えるのは 'pub' のみ(§5.3)。
// 密度の定義は会社ごとに違う(Intel は NAND2+scan FF の自社式)ため、直接の比較には使わない。実効密度は実チップの面積から逆算する(§4)。
window.SDS_DATA = window.SDS_DATA || {};
(function () {
  const pub = (v) => ({ v, s: 'pub' });
  const sec = (v) => ({ v, s: 'sec' });
  const nodes = [
    // id, 名前, 製造元, 密度 MTr/mm², SRAM µm², CPP nm, Mx nm, 量産開始
    { id: 'intel-14', name: 'Intel 14nm', vendor: 'Intel', density: pub(37.5), sram: pub(0.0588), cpp: pub(70), mx: pub(52), start: 2014 },
    { id: 'intel-7', name: 'Intel 7 (10nm ESF)', vendor: 'Intel', density: sec(80), densityNote: '約80(HP)〜約100(13900K 逆算)', sram: sec(0.0312), cpp: sec(54), mx: sec(36), start: 2019 },
    { id: 'intel-4', name: 'Intel 4', vendor: 'Intel', density: sec(160), sram: pub(0.0240), cpp: sec(50), mx: sec(30), start: 2023 },
    { id: 'intel-3', name: 'Intel 3', vendor: 'Intel', density: sec(143.37), sram: sec(0.024), cpp: sec(50), mx: sec(30), start: 2024 },
    { id: 'intel-18a', name: 'Intel 18A', vendor: 'Intel', density: null, densityNote: 'Intel 3 比で平均約30%増', sram: pub(0.021), cpp: pub(50), mx: pub(32), start: null },
    { id: 'tsmc-16', name: 'TSMC 16nm (16FF)', vendor: 'TSMC', density: sec(33.8), densityNote: '候補値 28.88/33.8/37.5 (派生不明)', sram: null, cpp: null, mx: null, start: 2014 },
    { id: 'tsmc-12', name: 'TSMC 12nm', vendor: 'TSMC', density: null, sram: null, cpp: null, mx: null, start: 2017 },
    { id: 'tsmc-n7', name: 'TSMC N7', vendor: 'TSMC', density: sec(93.85), densityNote: '91.2〜96.5', sram: sec(0.027), cpp: sec(57), mx: sec(40), start: 2018 },
    { id: 'tsmc-n6', name: 'TSMC N6', vendor: 'TSMC', density: sec(114.2), sram: sec(0.0315), sramNote: '列ずれの疑い', cpp: null, mx: sec(40), start: 2020 },
    { id: 'tsmc-n5', name: 'TSMC N5', vendor: 'TSMC', density: sec(138.2), densityNote: 'Wikipedia 138.2 / WikiChip 推定 171.3 で食い違い', sram: pub(0.021), cpp: sec(51), mx: sec(28), start: 2020 },
    { id: 'tsmc-n4', name: 'TSMC N4', vendor: 'TSMC', density: sec(143.7), sram: null, cpp: sec(51), mx: sec(28), start: 2022 },
    { id: 'tsmc-n3b', name: 'TSMC N3B', vendor: 'TSMC', density: sec(197), sram: sec(0.0199), cpp: sec(45), mx: null, start: 2022 },
    { id: 'tsmc-n3e', name: 'TSMC N3E', vendor: 'TSMC', density: sec(216), densityNote: '推定幅 180〜220', sram: pub(0.021), cpp: sec(48), mx: sec(23), start: 2023 },
    { id: 'tsmc-n3p', name: 'TSMC N3P', vendor: 'TSMC', density: sec(224), sram: null, cpp: sec(47), mx: null, start: 2024 },
    { id: 'tsmc-n2', name: 'TSMC N2', vendor: 'TSMC', density: null, densityNote: 'N3E 比で約1.15倍(チップ密度, 公表)。絶対値は未取得', sram: pub(0.0175), cpp: null, mx: null, start: null },
    { id: 'samsung-8', name: 'Samsung 8nm (8LPP)', vendor: 'Samsung', density: sec(61.2), sram: null, cpp: sec(64), mx: sec(44), start: 2018 },
    { id: 'samsung-5', name: 'Samsung 5nm (5LPE)', vendor: 'Samsung', density: sec(126.9), sram: sec(0.0262), cpp: sec(57), mx: sec(36), start: 2020 },
    { id: 'samsung-4', name: 'Samsung 4nm (4LPE)', vendor: 'Samsung', density: sec(137), sram: sec(0.0262), cpp: sec(57), mx: sec(32), start: 2021 },
    { id: 'gf-14', name: 'GlobalFoundries 14nm (14LPP)', vendor: 'GlobalFoundries', density: sec(32.94), densityNote: '割当不確か', sram: null, cpp: sec(78), mx: null, start: 2016 },
    { id: 'gf-12', name: 'GlobalFoundries 12nm (12LP)', vendor: 'GlobalFoundries', density: sec(36.71), sram: null, cpp: null, mx: null, start: 2018 },
  ];

  // 動作電圧(公表値があるものだけ。V-f 曲線はプリセットの実クロック・電圧から逆算して作る §6.1)
  const vmin = {
    'intel-4': { note: 'Vmin(90パーセンタイル) HD 0.6V / HP 0.55V。Intel 7 比で等電力時に性能 +20% 超', s: 'pub' },
    'intel-18a': { note: '同一電圧 1.1V で Intel 3 比 周波数 +25%、同クロックで電力 -36%', s: 'pub' },
    'tsmc-n2': { note: 'SRAM Vmin は N3 比で約 -20〜35mV。N3 比で同電力なら速度 +15% / 同速度なら電力 -30%', s: 'pub' },
  };
  // 欠陥密度 D0 (defects/cm²)。ほぼ推定のみ。
  const d0 = {
    'tsmc-n5': { v: 0.075, s: 'sec', note: 'TechInsights 2023 の推定とされる。量産時約0.1、開発同時期約0.33' },
    'tsmc-n7': { v: 0.33, s: 'sec', note: '開発同時期' },
    'intel-18a': { v: 0.4, s: 'sec', note: '0.4 未満(CEO 発言 2024)。後の推定は 0.1〜0.2' },
  };
  // ウェハ価格 (USD)。報道・アナリスト推定。TSMC は非公表で、大口は 15〜30% 割引といわれる。
  const wafer = {
    'tsmc-n7': { v: 9750, s: 'sec', note: '9,500〜10,000' },
    'tsmc-n5': { v: 16250, s: 'sec', note: '16,000〜16,500(別集計 17,500〜18,500)' },
    'tsmc-n4': { v: 19000, s: 'sec' },
    'tsmc-n3b': { v: 19000, s: 'sec', note: 'N3 全体で 18,000〜20,000' },
    'tsmc-n2': { v: 29000, s: 'sec', note: '28,000〜30,000(予想)' },
  };

  nodes.forEach((n) => {
    n.vmin = vmin[n.id] || null;
    n.d0 = d0[n.id] || null;
    n.waferUsd = wafer[n.id] || null;
  });
  window.SDS_DATA.nodes = nodes;
})();
