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
  const aCores = { 'apple-a12': ['Vortex', 'Tempest'], 'apple-a13': ['Lightning', 'Thunder'], 'apple-a14': ['Firestorm', 'Icestorm'], 'apple-a15': ['Avalanche', 'Blizzard'], 'apple-a16': ['Everest', 'Sawtooth'], 'apple-a17pro': ['Everest 2nd gen', undefined] };
  const a = (id, name, year, gb7, mm2, nodeId, pClk, eClk, l2, extra) => add(Object.assign({
    id, name, vendor: 'Apple', family: 'A シリーズ', isa: 'arm', kind: 'mobile', year, gb7,
    dies: [die(name, mm2, 'meas', nodeId)],
    cfg: { cores: [{ type: 'P', uarch: (aCores[id] || [])[0], count: 2, maxGHz: pClk }, { type: 'E', uarch: (aCores[id] || [])[1], count: 4, maxGHz: eClk }], l2: l2 || null, memory: null },
  }, extra || {}));
  a('apple-a12', 'A12', 2018, 'A12', 85.2, 'tsmc-n7', 2.49, 1.59, 'P 8MB / E 2MB', { power: { base: null, peak: pw(3.64, 'meas', 'SPECint2006 平均(AnandTech 引用)'), range: null } });
  a('apple-a13', 'A13', 2019, 'A13', 101.1, 'tsmc-n7', 2.66, 1.72, 'P 8MB / E 4MB');
  a('apple-a14', 'A14', 2020, 'A14', 89.8, 'tsmc-n5', 3.0, 1.82, null);
  a('apple-a15', 'A15', 2021, 'A15', 110.1, 'tsmc-n5', 2.93, 2.02, 'P 12MB / E 4MB');
  a('apple-a16', 'A16', 2022, 'A16', 115.4, 'tsmc-n4', 3.46, null, 'P 16MB / E 4MB');
  a('apple-a17pro', 'A17 Pro', 2023, 'A17 Pro', 114.0, 'tsmc-n3b', 3.78, 2.11, null, { power: { base: null, peak: pw(14, 'sec', 'CPU ベンチ時(Geekerwan 経由のフォーラム要約)'), range: null },
    errCause: { st: '公開値 2527 は機種中央値(n=3)。Notebookcheck の個別値(2 件平均)は 2688 で、これを公開値にすると差は +5.1%(中央値より 6.4% 高い)。P コアは Everest 2nd gen(9 幅・ROB 321。Geekerwan・jia.je の図〔二次〕)で、ST 補正 u は A16 の Everest(8 幅・ROB 274)から借用している(9 幅用の代表は無い)。基本 CPI が幅で決まり、幅 8→9 で ST が約 +12% 動くが、実機の A16→A17 Pro の IPC の伸びは数%(Apple の主張は P コア +10%、クロック込み)で、モデルの形による過大とみられる(調査メモの試算 +11.8%)。E コアが未登録のため MT は計算できない。設計書 §5.3.3 O' } });
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
    [{ type: 'P', uarch: 'Avalanche', count: 4, maxGHz: 3.49 }, { type: 'E', uarch: 'Blizzard', count: 4, maxGHz: 2.42 }],
    { power: { base: null, peak: pw(20, 'meas', 'CPU 負荷時 約20W(Notebookcheck)'), range: null } });
  m('apple-m2pro', 'M2 Pro', 2023, 'M2 Pro', [die('M2 Pro', 294.7, 'meas', 'tsmc-n5')], [{ type: 'P', count: 8 }, { type: 'E', count: 4 }]);
  m('apple-m2max', 'M2 Max', 2023, 'M2 Max', [die('M2 Max', 485.6, 'sec', 'tsmc-n5', 'NamuWiki のみ')],
    [{ type: 'P', count: 8, maxGHz: 3.7 }, { type: 'E', count: 4 }],
    { power: { base: null, peak: pw(36, 'meas', 'CPU のみ最大(powermetrics)。CPU+GPU のチップ約89W'), range: null } });
  m('apple-m2ultra', 'M2 Ultra', 2023, 'M2 Ultra', [die('M2 Max ×2', 971.2, 'sec', 'tsmc-n5', '推定 ×2')], [{ type: 'P', count: 16 }, { type: 'E', count: 8 }]);
  m('apple-m3', 'M3', 2023, 'M3', [die('M3', 152.5, 'meas', 'tsmc-n3b')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 4, maxGHz: 4.05 }, { type: 'E', count: 4, maxGHz: 2.75 }],
    { power: { base: null, peak: null, range: null, single: pw(5.5, 'meas', 'シングル時 CPU(powermetrics。チップ特定が曖昧)') },
      errCause: { st: 'P コアは Everest 2nd gen(9 幅・ROB 321。Geekerwan・jia.je の図〔二次〕)で、ST 補正 u は A16 の Everest(8 幅・ROB 274)から借用している(9 幅用の代表は無い)。基本 CPI が幅で決まり、幅 8→9 で ST が約 +12% 動くが、実機の A16→A17 Pro の IPC の伸びは数%(Apple の主張は P コア +10%、クロック込み)で、モデルの形による過大とみられる(調査メモの試算 +11.8%)。M3 の P が A17 Pro と同じコアという根拠は Geekerwan の図〔二次〕。設計書 §5.3.3 O' } });
  // M3 Pro・M3 Max(2026-11-01 にコア数とクロックを追記。docs/research/m3-pro-max.md)。uarch は M3 無印と同じく書かない(M3 系 P/E コアの幅・ROB・遅延が未取得で、A16 の Everest/Sawtooth を借りる根拠が無いため)。ST/MT は「uarch 未指定」で計算不能のまま
  m('apple-m3pro', 'M3 Pro', 2023, 'M3 Pro', [die('M3 Pro', 219.2, 'meas', 'tsmc-n3b')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 6, maxGHz: 4.05 }, { type: 'E', count: 6, maxGHz: 2.75 }],
    { power: { base: null, peak: pw(25, 'meas', 'マルチ時 CPU 約24〜27W'), range: null },
      notes: '12 コア版(6P+6E)。11 コア版(5P+6E)もあり、12 コア版とした判断は [推定](GB7 の注記「12c」・フロアプランの枠 P6/E6・電力 27W の注記から)。コア数は [公表](Apple support.apple.com/117736、Newsroom)、最大クロック 4.05 / 2.75GHz は [二次](Wikipedia「Apple silicon」・Notebookcheck。Apple は非公表)。GPU 18 コア(11 コア版は 14)・メモリ帯域 150GB/s・トランジスタ 370 億は [公表]。L2 は P 16MB(6 コア共有)/ E 4MB、SLC 12MB(Wikipedia・Notebookcheck。LowEndMac は P 32MB・SLC 24MB で食い違うが、出典が Wikipedia で読み違えとみられるため採らない)。uarch(幅・ROB・遅延)は未取得のため書かない。docs/research/m3-pro-max.md 参照' });
  m('apple-m3max', 'M3 Max', 2023, 'M3 Max', [die('M3 Max', 477.1, 'sec', 'tsmc-n3b', 'NamuWiki のみ。2 つ目の出典は未取得(検索要約では 477 が多数だが 503・600〜700 mm² の記述もあり、原典は未確認)')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 12, maxGHz: 4.05 }, { type: 'E', count: 4, maxGHz: 2.75 }],
    { power: { base: null, peak: pw(56, 'meas', 'CPU マルチ最大。チップ全体約78W'), range: null },
      notes: '16 コア版(12P+4E)。14 コア版(10P+4E)もあり、16 コア版とした判断は [推定](GB7 の注記「16c」・フロアプランの枠 P12/E4・電力 56W が 16 コア版の値から)。コア数は [公表](Apple support.apple.com/117736、Newsroom)、最大クロック 4.05 / 2.75GHz は [二次](Wikipedia・Notebookcheck。Apple は非公表)。GPU 40 コア(14 コア版は 30)・メモリ帯域 400GB/s(14 コア版は 300)・トランジスタ 920 億は [公表]。L2 は P 32MB(16MB × 2 クラスタは [推定])/ E 4MB、SLC 48MB([二次] Wikipedia。LowEndMac の出典も Wikipedia で独立した出典ではない)。ダイ面積 477.1mm² は NamuWiki のみで 2 つ目の出典が無い。uarch は未取得のため書かない。docs/research/m3-pro-max.md 参照' });
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

  // ---- M5b 波1 追加分(addedIn:'M5b'。calib は false。電力・キャッシュは未取得のまま null。メモリは任意項目で null のまま(§2.7.4 に 7 Gen 1・7 Gen 4 のメモリ LPDDR5/5X・32bit の記載はあるが未転記)。設計書 §13) ----
  const m5b = (note) => ({ addedIn: 'M5b', ...(note ? { notes: note } : {}) });
  q('qc-7gen3', '7 Gen 3', 2023, 'Snapdragon 7 Gen 3(SM7550)', 55.2, 'tsmc-n4', [c('P', 'Cortex-A715', 1, 2.63), c('M', 'Cortex-A715', 3, 2.4), c('E', 'Cortex-A510', 4, 1.8)], m5b('プロセスは §2.7.4 が N4P、§2.2 が 4nm のため tsmc-n4 に対応づけ'));
  q('qc-7gen4', '7 Gen 4', 2025, 'Snapdragon 7 Gen 4(SM7750)', 70.3, 'tsmc-n4', [c('P', 'Cortex-A720', 1, 2.8), c('M', 'Cortex-A720', 4, 2.4), c('E', 'Cortex-A520', 3, 1.84)], m5b('nodeId は §2.2 の TSMC 4nm(§2.7.4 はプロセス未取得)から tsmc-n4 に対応づけた'));
  q('qc-7gen1', '7 Gen 1', 2022, 'Snapdragon 7 Gen 1(SM7450)', 77.8, 'samsung-4', [c('P', 'Cortex-A710', 1, 2.4), c('M', 'Cortex-A710', 3, 2.36), c('E', 'Cortex-A510', 4, 1.8)], m5b('プロセスは Samsung 4nm(§2.7.4 は 4LPX)'));
  q('qc-720g', '720G', 2020, 'Snapdragon 720G(SM7125)', 55.5, 'samsung-8', [c('P', 'Cortex-A76', 2, 2.3), c('E', 'Cortex-A55', 6, 1.8)], m5b('プロセスは Samsung 8nm(§2.7.4 は 8LPP)'));
  q('qc-8elite-x-gen6', '8 Elite Extreme Gen 6', 2026, 'Snapdragon 8 Elite Extreme Gen 6(SM8975、モバイル)', 133.2, 'tsmc-n2', [c('P', 'Oryon Prime', 2, 5.0), c('E', 'Oryon Performance', 6, 4.0)], m5b('クロック(最大 5.0 / 4.0GHz)とプロセスは報道(二次)。ダイ面積 133.2 は N2P の実測。nodeId は N2P 専用の記録が無いため tsmc-n2。キャッシュ容量は未確定'));

  // ---- M5b 波2 追加分(Qualcomm 2 件。nodeId は Samsung 4LPX の記録が無いため 4LPE の samsung-4 で代用。設計書 §13 M5b-8 R1) ----
  q('qc-6gen1', '6 Gen 1', 2022, 'Snapdragon 6 Gen 1(SM6450)', 53.9, 'samsung-4', [c('P', 'Cortex-A78', 4, 2.2), c('E', 'Cortex-A55', 4, 1.8)], m5b('プロセスは Samsung 4nm(4LPX。Wikipedia の SoC 一覧)。4LPX を 4LPE の記録 samsung-4 で代用(旧記載の 8nm は誤り)。クロックは Wikipedia 値。発売年は設計書 §2.7.4 の 2022(2023 とする根拠は未取得)'));
  q('qc-4gen2', '4 Gen 2', 2023, 'Snapdragon 4 Gen 2(SM4450)', 40.3, 'samsung-4', [c('P', 'Cortex-A78', 2, 2.2), c('E', 'Cortex-A55', 6, 1.95)], m5b('プロセスは Samsung 4nm(4LPX。Wikipedia の SoC 一覧)。4LPX を 4LPE の記録 samsung-4 で代用。クロックは Wikipedia の 2.2/1.95GHz。Qualcomm 製品概要 Rev C は 2.3/2.0GHz(検索要約。2.4GHz 版もある)で食い違う。GB7 の行(SM4450)の実機クロックは未確認'));

  // ---- M6 第 5 段 E5 追加分(Windows ノート向け。ユーザー承認 2026-10-31。設計書 §5.3.2 E5) ----
  q('qc-8cx-gen3', '8cx Gen 3', 2021, 'Snapdragon 8cx Gen 3(SC8280XP、Windows ノート)', null, null, [c('P', 'Cortex-X1', 4, 3.0), c('M', 'Cortex-A78', 4, 2.4)],
    { kind: 'mobile-pc', dies: [die('Snapdragon 8cx Gen 3', 171.17, 'meas', 'samsung-5', 'Kurnal Insights の計測値 1 サイトのみ(12.35×13.86mm。SA8295P と同一ダイとして掲載)。他に独立した出典なし。設計書 §2.x の既存方針〔Kurnal の計測=meas〕に従い区分は meas')],
      ...m5b('面積は Kurnal Insights 1 サイトのみ(区分は既存方針どおり meas)。構成・クロック・プロセス(Samsung 5LPE)は Wikipedia と Notebookcheck の 2 サイトで一致。GB7 は機種が混在する 17 件の中央値。L3 は資料間で食い違う(Notebookcheck 8MB / Wikipedia 4MB+SLC 3MB)ため未設定') });

  // 校正の代表 SKU(§5.3.1)。同じ P コアを使う他のチップは検証用(代表の補正係数で予測して誤差を見る)。
  // 条件: GB7 が機種中央値で n が比較的多い([中央値])、コア構成が単純、電力モードの影響が小さい。
  const reps = {
    'apple-m1': 'Firestorm の代表(M1。A14・M1 Pro/Max が検証用)。機種中央値 n=6',
    'apple-m2': 'Avalanche の代表(M2。A15 が検証用)。機種中央値 n=4',
    'apple-a16': 'Everest の代表(A16)。機種中央値 n=4',
    'qc-8gen1': 'Cortex-X2 の代表(8 Gen 1。8+ Gen 1・Dimensity 9000 が検証用)。機種中央値 n=7',
    'qc-8gen2': 'Cortex-X3 の代表(8 Gen 2。Dimensity 9200 が検証用)。機種中央値 n=21',
    'qc-8gen3': 'Cortex-X4 の代表(8 Gen 3。8s Gen 3・7+ Gen 3・Dimensity 9300 が検証用)。機種中央値 n=13',
    'qc-8elite': 'Oryon(8 Elite)の代表。8 Elite Gen 5 が検証用。機種中央値 n=17',
    'mt-9400': 'Cortex-X925 の代表(Dimensity 9400)。機種中央値 n=4',
  };
  P.forEach((p) => { if (reps[p.id]) { p.calib = true; p.calibNote = reps[p.id]; } });
})();
