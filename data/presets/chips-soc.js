// プリセット(Apple / Snapdragon / Dimensity / NVIDIA の SoC): 面積(§2.2)・電力(§2.5)・構成(§2.7)・GB7(§2.4)。
// 形式は chips-pc.js と同じ。スマホ SoC はメーカーがTDPを公表しないため power.base は null が多い。
// 電力の実測は「Geekbench 6 マルチ時の SoC 電力」など条件がまちまち(power.*.note に条件を書く)。報道の引用経由の値は s:'sec'。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.presets = window.SDS_DATA.presets || [];
(function () {
  const die = (name, mm2, s, nodeId, note) => ({ name, mm2, s, nodeId: nodeId || null, ...(note ? { note } : {}) });
  const pw = (w, s, note) => ({ w, s, ...(note ? { note } : {}) });
  const noPower = { base: null, peak: null, range: null };
  const P = window.SDS_DATA.presets;
  const add = (o) => P.push(Object.assign({ calib: false, power: noPower }, o));

  // ---- Apple A シリーズ(2P + 4E) ----
  const a = (id, name, year, gb7, mm2, nodeId, pClk, eClk, l2, extra) => add(Object.assign({
    id, name, vendor: 'Apple', family: 'A シリーズ', isa: 'arm', kind: 'mobile', year, gb7,
    dies: [die(name, mm2, 'meas', nodeId)],
    cfg: { cores: [{ type: 'P', count: 2, maxGHz: pClk }, { type: 'E', count: 4, maxGHz: eClk }], l2: l2 || null, memory: null },
  }, extra || {}));
  a('apple-a12', 'A12', 2018, 'A12', 85.2, 'tsmc-n7', 2.49, 1.59, 'P 8MB / E 2MB', { power: { base: null, peak: pw(3.64, 'meas', 'SPECint2006 平均(AnandTech 引用)'), range: null } });
  a('apple-a13', 'A13', 2019, 'A13', 101.1, 'tsmc-n7', 2.66, 1.72, 'P 8MB / E 4MB');
  a('apple-a14', 'A14', 2020, 'A14', 89.8, 'tsmc-n5', 3.0, 1.82, null);
  a('apple-a15', 'A15', 2021, 'A15', 110.1, 'tsmc-n5', 2.93, 2.02, 'P 12MB / E 4MB');
  a('apple-a16', 'A16', 2022, 'A16', 115.4, 'tsmc-n4', 3.46, null, 'P 16MB / E 4MB');
  a('apple-a17pro', 'A17 Pro', 2023, 'A17 Pro', 114.0, 'tsmc-n3b', 3.78, 2.11, null, { power: { base: null, peak: pw(14, 'sec', 'CPU ベンチ時(Geekerwan 経由のフォーラム要約)'), range: null } });
  a('apple-a18', 'A18', 2024, 'A18', 92.4, 'tsmc-n3e', 4.05, 2.42, 'P 8MB / E 4MB');
  a('apple-a18pro', 'A18 Pro', 2024, 'A18 Pro', 109.7, 'tsmc-n3e', null, null, 'P 16MB / E 4MB', { power: { base: null, peak: null, range: null, gaming: pw(4.9, 'sec', 'ゲーム時 4.5〜5.3W') } });
  a('apple-a19pro', 'A19 Pro', 2025, 'A19 Pro', 98.7, 'tsmc-n3p', 4.26, 2.6, 'P 16MB / E 6MB', { power: { base: null, peak: pw(13, 'sec', '短時間ピーク。GB6 マルチ約12.1W'), range: null } });
  a('apple-a20pro', 'A20 Pro', 2026, 'A20 Pro', 98.8, 'tsmc-n2', 4.93, 2.64, 'P 16MB / E 8MB(Wikipedia)', { notes: 'クロック 4.93GHz は Geekbench のリーク値' });

  // ---- Apple M シリーズ ----
  const m = (id, name, year, gb7, dies, cores, extra) => add(Object.assign({
    id, name, vendor: 'Apple', family: 'M シリーズ', isa: 'arm', kind: 'mobile-pc', year, gb7, dies, cfg: { cores, memory: null },
  }, extra || {}));
  m('apple-m1', 'M1', 2020, 'M1', [die('M1', 123.0, 'meas', 'tsmc-n5')],
    [{ type: 'P', uarch: 'Firestorm', count: 4, maxGHz: 3.2 }, { type: 'E', uarch: 'Icestorm', count: 4 }]);
  m('apple-m1pro', 'M1 Pro', 2021, 'M1 Pro', [die('M1 Pro', 253.2, 'meas', 'tsmc-n5')],
    [{ type: 'P', uarch: 'Firestorm', count: 8, maxGHz: 3.228 }, { type: 'E', uarch: 'Icestorm', count: 2, maxGHz: 2.064 }],
    { power: { base: null, peak: pw(21.5, 'meas', 'CPU のみ最大。パッケージ最大 約46W(CPU+GPU)'), range: null } });
  m('apple-m1max', 'M1 Max', 2021, 'M1 Max', [die('M1 Max', 432, 'sec', 'tsmc-n5', '390〜432 の幅(MacPerformanceGuide)')],
    [{ type: 'P', uarch: 'Firestorm', count: 8, maxGHz: 3.228 }, { type: 'E', uarch: 'Icestorm', count: 2, maxGHz: 2.064 }],
    { power: { base: null, peak: pw(29, 'meas', 'CPU のみ最大。パッケージ最大 約86W。シングル時 CPU 約4〜5W'), range: null } });
  m('apple-m1ultra', 'M1 Ultra', 2022, 'M1 Ultra', [die('M1 Max ×2 (UltraFusion)', 864, 'sec', 'tsmc-n5', 'M1 Max の推定値 ×2')],
    [{ type: 'P', uarch: 'Firestorm', count: 16 }, { type: 'E', uarch: 'Icestorm', count: 4 }]);
  m('apple-m2', 'M2', 2022, 'M2', [die('M2', 153.2, 'meas', 'tsmc-n5')],
    [{ type: 'P', count: 4, maxGHz: 3.49 }, { type: 'E', count: 4, maxGHz: 2.42 }],
    { power: { base: null, peak: pw(20, 'meas', 'CPU 負荷時 約20W(Notebookcheck)'), range: null } });
  m('apple-m2pro', 'M2 Pro', 2023, 'M2 Pro', [die('M2 Pro', 294.7, 'meas', 'tsmc-n5')], [{ type: 'P', count: 8 }, { type: 'E', count: 4 }]);
  m('apple-m2max', 'M2 Max', 2023, 'M2 Max', [die('M2 Max', 485.6, 'sec', 'tsmc-n5', 'NamuWiki のみ')],
    [{ type: 'P', count: 8, maxGHz: 3.7 }, { type: 'E', count: 4 }],
    { power: { base: null, peak: pw(36, 'meas', 'CPU のみ最大(powermetrics)。CPU+GPU のチップ約89W'), range: null } });
  m('apple-m2ultra', 'M2 Ultra', 2023, 'M2 Ultra', [die('M2 Max ×2', 971.2, 'sec', 'tsmc-n5', '推定 ×2')], [{ type: 'P', count: 16 }, { type: 'E', count: 8 }]);
  m('apple-m3', 'M3', 2023, 'M3', [die('M3', 152.5, 'meas', 'tsmc-n3b')],
    [{ type: 'P', count: 4, maxGHz: 4.05 }, { type: 'E', count: 4, maxGHz: 2.75 }],
    { power: { base: null, peak: null, range: null, single: pw(5.5, 'meas', 'シングル時 CPU(powermetrics。チップ特定が曖昧)') } });
  m('apple-m3pro', 'M3 Pro', 2023, 'M3 Pro', [die('M3 Pro', 219.2, 'meas', 'tsmc-n3b')], [],
    { power: { base: null, peak: pw(25, 'meas', 'マルチ時 CPU 約24〜27W'), range: null } });
  m('apple-m3max', 'M3 Max', 2023, 'M3 Max', [die('M3 Max', 477.1, 'sec', 'tsmc-n3b', 'NamuWiki のみ')], [],
    { power: { base: null, peak: pw(56, 'meas', 'CPU マルチ最大。チップ全体約78W'), range: null } });
  m('apple-m4', 'M4', 2024, 'M4', [die('M4', 169.4, 'meas', 'tsmc-n3e')],
    [{ type: 'P', count: 4, maxGHz: 4.4 }, { type: 'E', count: 6, maxGHz: 2.85 }]);
  m('apple-m4pro', 'M4 Pro', 2024, 'M4 Pro', [die('M4 Pro', 325, 'sec', 'tsmc-n3e', '約320〜330(TechInsights が解析済みだが面積は未確認)')],
    [{ type: 'P', count: 10, maxGHz: 4.5 }, { type: 'E', count: 4 }],
    { power: { base: null, peak: pw(46, 'meas', 'マルチ最大(その後約40W)。シングル時 約6〜6.5W'), range: null } });
  m('apple-m5', 'M5', 2025, 'M5', [die('M5', 157.5, 'sec', 'tsmc-n3p', 'NamuWiki のみ')], [{ type: 'super', count: 4 }, { type: 'E', count: 6 }]);
  m('apple-m5max', 'M5 Max', 2026, 'M5 Max', [], [{ type: 'super', count: 6 }, { type: 'performance', count: 12 }],
    { power: { base: null, peak: null, range: null }, notes: '電力: 14インチは CPU 50W を維持できず、CPU+GPU のストレスで 96W(1〜2秒)→46W→42W([実測] Notebookcheck)。単一のピーク値としては採用しない' });

  // ---- Qualcomm Snapdragon(コア: プライム+中間+小) ----
  const q = (id, name, year, gb7, mm2, nodeId, cores, extra) => add(Object.assign({
    id, name: 'Snapdragon ' + name, vendor: 'Qualcomm', family: 'Snapdragon', isa: 'arm', kind: 'mobile', year, gb7,
    dies: mm2 ? [die('Snapdragon ' + name, mm2, 'meas', nodeId)] : [], cfg: { cores, memory: null },
  }, extra || {}));
  const c = (type, uarch, count, ghz) => ({ type, uarch, count, maxGHz: ghz });
  q('qc-855', '855', 2018, '855', 76.5, 'tsmc-n7', [c('P', 'Cortex-A76', 1, 2.84), c('M', 'Cortex-A76', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)],
    { power: { base: pw(5, 'sec', 'Notebookcheck の推定(Qualcomm 未公表)'), peak: null, range: null } });
  q('qc-865', '865', 2019, '865', 86.9, 'tsmc-n7', [c('P', 'Cortex-A77', 1, 2.84), c('M', 'Cortex-A77', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)]);
  q('qc-888', '888', 2020, '888', 112.2, 'samsung-5', [c('P', 'Cortex-X1', 1, 2.84), c('M', 'Cortex-A78', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)],
    { power: { base: pw(5, 'sec', 'Notebookcheck の推定'), peak: pw(8.9, 'sec', 'Geekerwan 実測ピーク(報道の引用)'), range: null } });
  q('qc-8gen1', '8 Gen 1', 2021, '8 Gen 1', 128.3, 'samsung-4', [c('P', 'Cortex-X2', 1, 3.0), c('M', 'Cortex-A710', 3, 2.5), c('E', 'Cortex-A510', 4, 1.8)],
    { power: { base: null, peak: pw(11.1, 'sec', '全コアピーク(Geekerwan の引用)。シングル 4.2W'), range: null } });
  q('qc-8plus-gen1', '8+ Gen 1', 2022, '8+ Gen 1', 102.8, 'tsmc-n4', [c('P', 'Cortex-X2', 1, 3.2), c('M', 'Cortex-A710', 3, 2.75), c('E', 'Cortex-A510', 4, 2.0)]);
  q('qc-8gen2', '8 Gen 2', 2022, '8 Gen 2', 120.9, 'tsmc-n4', [c('P', 'Cortex-X3', 1, 3.19), c('M', 'Cortex-A715/A710', 4, 2.8), c('E', 'Cortex-A510', 3, 2.0)],
    { power: { base: null, peak: null, range: null, bigCore: pw(4.9, 'sec', 'ビッグコア単体ピーク(SPECint)') } });
  q('qc-8gen3', '8 Gen 3', 2023, '8 Gen 3', 137.3, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.3), c('M', 'Cortex-A720', 3, 3.15), c('M2', 'Cortex-A720', 2, 2.96), c('E', 'Cortex-A520', 2, 2.27)],
    { power: { base: null, peak: null, range: null, bigCore: pw(6.27, 'sec', 'ビッグコア単体ピーク(SPECint)') } });
  q('qc-8elite', '8 Elite', 2024, '8 Elite', 124.1, 'tsmc-n3e', [c('P', 'Oryon Prime', 2, 4.32), c('E', 'Oryon Performance', 6, 3.53)],
    { power: { base: null, peak: pw(16.5, 'sec', 'GB6 マルチ(Geekerwan の引用)。後続記事は約17W'), range: null, single: pw(6.9, 'sec', 'シングル(Notebookcheck が導出)') } });
  q('qc-8elite-gen5', '8 Elite Gen 5', 2025, '8 Elite Gen 5', 126.2, 'tsmc-n3p', [c('P', 'Oryon Prime', 2, 4.61), c('E', 'Oryon Performance', 6, 3.63)],
    { power: { base: null, peak: pw(19.5, 'sec', 'GB6 マルチ 12,546 点時(評価機の値)'), range: null } });
  q('qc-8s-gen3', '8s Gen 3', 2024, '8s Gen 3', 89.5, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.0), c('M', 'Cortex-A720', 4, 2.8), c('E', 'Cortex-A520', 3, 2.0)]);
  q('qc-8s-gen4', '8s Gen 4', 2025, '8s Gen 4', 105.6, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.21), c('M', 'Cortex-A720', 3, 3.0), c('M2', 'Cortex-A720', 2, 2.8), c('E', 'Cortex-A720', 2, 2.02)]);
  q('qc-7plus-gen3', '7+ Gen 3', 2024, '7+ Gen 3', 89.5, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 2.8), c('M', 'Cortex-A720', 4, 2.6), c('E', 'Cortex-A520', 3, 1.9)]);
  q('qc-780g', '780G', 2021, '780G', 81.2, 'samsung-5', [c('P', 'Cortex-A78', 1, 2.4), c('M', 'Cortex-A78', 3, 2.2), c('E', 'Cortex-A55', 4, 1.9)],
    { power: { base: pw(5, 'sec', 'Notebookcheck の推定'), peak: null, range: null } });

  // ---- MediaTek Dimensity ----
  const d = (id, name, year, gb7, mm2, nodeId, cores, extra) => add(Object.assign({
    id, name: 'Dimensity ' + name, vendor: 'MediaTek', family: 'Dimensity', isa: 'arm', kind: 'mobile', year, gb7,
    dies: mm2 ? [die('Dimensity ' + name, mm2, 'meas', nodeId)] : [], cfg: { cores, memory: null },
  }, extra || {}));
  d('mt-9000', '9000', 2021, '9000', 112.8, 'tsmc-n4', [c('P', 'Cortex-X2', 1, 3.05), c('M', 'Cortex-A710', 3, 2.85), c('E', 'Cortex-A510', 4, 1.8)],
    { power: { base: null, peak: pw(9.8, 'sec', '全コアピーク(エンジニアリングサンプル。報道の引用)。シングル 3.5W'), range: null } });
  d('mt-9200', '9200', 2022, '9200', 123.2, 'tsmc-n4', [c('P', 'Cortex-X3', 1, 3.05), c('M', 'Cortex-A715', 3, 2.85), c('E', 'Cortex-A510', 4, 1.8)],
    { power: { base: null, peak: pw(14, 'sec', 'GSMArena コメント欄の引用。信頼度低'), range: null } });
  d('mt-9300', '9300', 2023, '9300', 140.4, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.25), c('M', 'Cortex-X4', 3, 2.85), c('E', 'Cortex-A720', 4, 2.0)]);
  d('mt-9400', '9400', 2024, '9400', 126.3, 'tsmc-n3e', [c('P', 'Cortex-X925', 1, 3.63), c('M', 'Cortex-X4', 3, 3.3), c('E', 'Cortex-A720', 4, 2.4)],
    { power: { base: null, peak: pw(18, 'sec', 'GB6 マルチ 18W 超(Geekerwan の引用)。プライムコア 7.1W(SPECint)'), range: null } });
  d('mt-9500', '9500', 2025, 'Dimensity 9500(MT6993)', 140.6, 'tsmc-n3p', [c('P', 'C1-Ultra', 1, 4.21), c('M', 'C1-Premium', 3, 3.5), c('E', 'C1-Pro', 4, 2.7)],
    { power: { base: null, peak: pw(18, 'sec', 'GB6 マルチ(GSMArena/Wccftech 経由)'), range: null }, notes: 'GB7 の値は Samsung のタブレット投稿が多く低すぎる疑い(要再確認)' });
  d('mt-9600pro', '9600 Pro', 2026, 'Dimensity 9600 Pro(MT6995)', 134.0, 'tsmc-n2', [c('P', 'C2-Ultra', 2, 4.55), c('M', 'C2-Pro', 3, 4.35), c('E', 'C2-Pro', 3, 3.1)]);
  d('mt-8200', '8200', 2022, 'Dimensity 8200(MT6896)', 84.9, 'tsmc-n4', [c('P', 'Cortex-A78', 1, 3.1), c('M', 'Cortex-A78', 3, 3.0), c('E', 'Cortex-A55', 4, 2.0)]);

  // ---- NVIDIA ----
  add({
    id: 'nv-orin-agx', name: 'Orin (Jetson AGX Orin)', vendor: 'NVIDIA', family: 'Jetson', isa: 'arm', kind: 'embedded', year: 2022,
    gb7: 'Orin(AGX Orin、12コア)',
    dies: [die('Orin', 447.8, 'meas', 'samsung-8')],
    power: { base: null, peak: null, range: { minW: 15, maxW: 60 }, modes: pw(null, 'pub', '15W / 30W(既定) / 50W / MAXN(64GB 版)') },
    cfg: { cores: [c('P', 'Cortex-A78AE', 12, 2.2)], l3MB: null, memory: 'LPDDR5, 256bit, 204.8GB/s' },
  });
  add({
    id: 'nv-thor', name: 'Thor (Jetson AGX Thor)', vendor: 'NVIDIA', family: 'Jetson', isa: 'arm', kind: 'embedded', year: 2025,
    gb7: 'Thor(Jetson AGX Thor、14コア)',
    dies: [die('Thor', 402.2, 'meas', 'tsmc-n4')],
    power: { base: null, peak: null, range: { minW: 40, maxW: 130 } },
    cfg: { cores: [c('P', 'Neoverse V3AE', 14, 2.6)], l3MB: 16, memory: 'LPDDR5X, 256bit, 273GB/s' },
  });
  add({
    id: 'nv-t239', name: 'Switch 2 の T239', vendor: 'NVIDIA', family: 'Tegra', isa: 'arm', kind: 'embedded', year: 2025,
    gb7: null,
    dies: [die('T239', 207, 'meas', 'samsung-8', 'ダイ写真計測(Tom\'s Hardware)')],
    power: { base: pw(19, 'pub', 'TV モードのゲーム時(本体)。ホーム画面 8W'), peak: null, range: null },
    cfg: { cores: [c('P', 'Cortex-A78C', 8, 1.1)], l3MB: 4, memory: 'LPDDR5X, 128bit' },
  });
})();
