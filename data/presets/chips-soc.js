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
  a('apple-a16', 'A16', 2022, 'A16', 115.4, 'tsmc-n4', 3.46, 2.02, 'P 16MB / E 4MB', { notes: 'E コアの最大クロック 2.02GHz は [二次](Wikipedia・Notebookcheck の 2 系統で一致。Apple は非公表)。docs/research/apple-pe-cores.md §3.2' });
  a('apple-a17pro', 'A17 Pro', 2023, 'A17 Pro', 114.0, 'tsmc-n3b', 3.78, 2.11, null, { power: { base: null, peak: pw(14, 'sec', 'CPU ベンチ時(Geekerwan 経由のフォーラム要約)'), range: null },
    errCause: { st: '公開値 2527 は機種中央値(n=3)。Notebookcheck の個別値(2 件平均)は 2688 で、これを公開値にすると差は +5.1%(中央値より 6.4% 高い)。P コアは Everest 2nd gen(9 幅・ROB 321。Geekerwan・jia.je の図〔二次〕)で、ST 補正 u は A16 の Everest(8 幅・ROB 274)から借用している(9 幅用の代表は無い)。基本 CPI が幅で決まり、幅 8→9 で ST が約 +12% 動くが、実機の A16→A17 Pro の IPC の伸びは数%(Apple の主張は P コア +10%、クロック込み)で、モデルの形による過大とみられる(調査メモの試算 +11.8%)。E コアが未登録のため MT は計算できない。設計書 §5.3.3 O' } });
  a('apple-a18', 'A18', 2024, 'A18', 92.4, 'tsmc-n3e', 4.05, 2.42, 'P 8MB / E 4MB');
  a('apple-a18pro', 'A18 Pro', 2024, 'A18 Pro', 109.7, 'tsmc-n3e', 4.05, 2.42, 'P 16MB / E 4MB', { notes: '最大クロック P 4.05 / E 2.42GHz は [二次](Wikipedia・Wccftech・GAZLOG。Apple は非公表)。P は資料で 4.02〜4.05 に揺れる(Geekerwan 経由は 4.02)。A18 と同じ値とする資料による。docs/research/apple-pe-cores.md §3.2', power: { base: null, peak: null, range: null, gaming: pw(4.9, 'sec', 'ゲーム時 4.5〜5.3W') } });
  a('apple-a19pro', 'A19 Pro', 2025, 'A19 Pro', 98.7, 'tsmc-n3p', 4.26, 2.6, 'P 16MB / E 6MB', { power: { base: null, peak: pw(13, 'sec', '短時間ピーク。GB6 マルチ約12.1W'), range: null } });
  a('apple-a20pro', 'A20 Pro', 2026, 'A20 Pro', 98.8, 'tsmc-n2', 4.93, 2.64, 'P 16MB / E 8MB(Wikipedia)', { notes: 'クロック 4.93GHz は Geekbench のリーク値' });

  // ---- Apple M シリーズ ----
  // extra.l2(L2 の文字列。A シリーズと同じ書式)・extra.memory(メモリの文字列)は cfg に入れる。それ以外の extra はプリセット直下
  const m = (id, name, year, gb7, dies, cores, extra) => { const { l2, memory, ...rest } = extra || {}; return add(Object.assign({
    id, name, vendor: 'Apple', family: 'M シリーズ', isa: 'arm', kind: 'mobile-pc', year, gb7, dies, cfg: { cores, ...(l2 ? { l2 } : {}), memory: memory || null },
  }, rest)); };
  m('apple-m1', 'M1', 2020, 'M1', [die('M1', 123.0, 'meas', 'tsmc-n5')],
    [{ type: 'P', uarch: 'Firestorm', count: 4, maxGHz: 3.2 }, { type: 'E', uarch: 'Icestorm', count: 4, maxGHz: 2.064 }],
    { l2: 'P 12MB / E 4MB', memory: 'LPDDR4X-4266, 128bit, 68.25GB/s',
      notes: 'E コアの最大クロック 2.064GHz は [実測](Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み、2026-11-05。Linux DTS でも一致。P 3.2GHz は既存のまま)。L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 8MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 種類・速度・バス幅は [二次](Wikipedia)、帯域 68.25GB/s は Apple 非公表で 4266MT/s × 128bit からの計算値。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(15, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): Cinebench R23 マルチ(CPU 全コア負荷)の平均パッケージ電力、MacBook Pro 13。MacBook Air は 13.2W。https://www.notebookcheck.net/Apple-M2-SoC-Analysis-Worse-CPU-efficiency-compared-to-the-M1.637834.0.html'), range: null } });
  m('apple-m1pro', 'M1 Pro', 2021, 'M1 Pro', [die('M1 Pro', 253.2, 'meas', 'tsmc-n5')],
    [{ type: 'P', uarch: 'Firestorm', count: 8, maxGHz: 3.228 }, { type: 'E', uarch: 'Icestorm', count: 2, maxGHz: 2.064 }],
    { l2: 'P 24MB(12MB×2)/ E 4MB', memory: 'LPDDR5-6400, 256bit, 200GB/s',
      notes: 'L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 24MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 200GB/s は Apple Support [公表](https://support.apple.com/en-us/111902 、https://support.apple.com/en-us/111901)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(27, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の M1 Pro / Max 分析の「8 コア版 21W・10 コア版 27W」。原ページ確認済みは本文の値のみ〔要約モデル経由〕。URL は調査担当が記録せず未記録): CPU 全コア負荷。10 コア版(8P+2E。このプリセットの構成)は 27W、8 コア版は 21W。以前の値 21.5W は出典を確認できなかった(8 コア版の値に近い)ため置き換えた。パッケージ最大 約46W(CPU+GPU)は従来の記録'), range: null } });
  m('apple-m1max', 'M1 Max', 2021, 'M1 Max', [die('M1 Max', 432, 'sec', 'tsmc-n5', '390〜432 の幅(MacPerformanceGuide)')],
    [{ type: 'P', uarch: 'Firestorm', count: 8, maxGHz: 3.228 }, { type: 'E', uarch: 'Icestorm', count: 2, maxGHz: 2.064 }],
    { l2: 'P 24MB(12MB×2)/ E 4MB', memory: 'LPDDR5-6400, 512bit, 400GB/s',
      notes: 'L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 48MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 400GB/s は Apple Support [公表](https://support.apple.com/en-us/111901 、https://support.apple.com/en-us/111900)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(29, 'meas', 'CPU のみ最大。パッケージ最大 約86W。シングル時 CPU 約4〜5W'), range: null } });
  m('apple-m1ultra', 'M1 Ultra', 2022, 'M1 Ultra', [die('M1 Max ×2 (UltraFusion)', 864, 'sec', 'tsmc-n5', 'M1 Max の推定値 ×2')],
    [{ type: 'P', uarch: 'Firestorm', count: 16, maxGHz: 3.228 }, { type: 'E', uarch: 'Icestorm', count: 4, maxGHz: 2.064 }],
    { l2: 'P 48MB / E 8MB', memory: 'LPDDR5-6400, 1024bit, 800GB/s',
      notes: 'クロック(2026-11-05 追加): P 3.228GHz・E 2.064GHz は [実測](Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み。M1 Max と同じ周波数段。Linux DTS でも一致)。L2 は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。SLC 96MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 800GB/s は Apple Support [公表](https://support.apple.com/en-us/111900)、種類・速度・バス幅は [二次](Wikipedia)。電力: チップ単体の電力は未取得(Max の 2 倍は推定になるため入れない)。参考: Mac Studio(M1 Ultra)の最大消費電力 215W は Apple の公表値だが、壁際・システム全体の値でチップの電力ではない([公表]。https://support.apple.com/en-us/102027)。power には入れない' });
  m('apple-m2', 'M2', 2022, 'M2', [die('M2', 153.2, 'meas', 'tsmc-n5')],
    [{ type: 'P', uarch: 'Avalanche', count: 4, maxGHz: 3.49 }, { type: 'E', uarch: 'Blizzard', count: 4, maxGHz: 2.42 }],
    { l2: 'P 16MB / E 4MB', memory: 'LPDDR5-6400, 128bit, 100GB/s',
      notes: 'L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 8MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 100GB/s は Apple Support [公表](https://support.apple.com/en-us/111867 、https://support.apple.com/en-us/111869)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(20, 'meas', 'CPU 負荷時 約20W(Notebookcheck)'), range: null } });
  m('apple-m2pro', 'M2 Pro', 2023, 'M2 Pro', [die('M2 Pro', 294.7, 'meas', 'tsmc-n5')], [{ type: 'P', count: 8, maxGHz: 3.504 }, { type: 'E', count: 4, maxGHz: 2.424 }],
    { l2: 'P 32MB(16MB×2)/ E 4MB', memory: 'LPDDR5-6400, 256bit, 200GB/s',
      notes: 'クロック(2026-11-05 追加): P 3.504GHz・E 2.424GHz は [実測](Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み。Linux DTS でも一致)。L2 は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。SLC 24MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 200GB/s は Apple Support [公表](https://support.apple.com/en-us/111340 、https://support.apple.com/en-us/111837)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(34, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): マルチ負荷での最大 CPU 電力、12 コア版(8P+4E。このプリセットの構成)。別記事では約 36W、10 コア版は 27〜28W。https://www.notebookcheck.net/Apple-M2-Pro-and-M2-Max-analysis-GPU-is-more-efficient-the-CPU-not-always.699140.0.html'), range: null } });
  m('apple-m2max', 'M2 Max', 2023, 'M2 Max', [die('M2 Max', 485.6, 'sec', 'tsmc-n5', 'NamuWiki のみ')],
    [{ type: 'P', count: 8, maxGHz: 3.7 }, { type: 'E', count: 4, maxGHz: 2.424 }],
    { l2: 'P 32MB(16MB×2)/ E 4MB', memory: 'LPDDR5-6400, 512bit, 400GB/s',
      notes: 'E コアの最大クロック 2.424GHz は [実測](Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み、2026-11-05 追加。Linux DTS でも一致)。L2 は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。SLC 48MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 400GB/s は Apple Support [公表](https://support.apple.com/en-us/111340 、https://support.apple.com/en-us/111835)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(36, 'meas', 'CPU のみ最大(powermetrics)。CPU+GPU のチップ約89W'), range: null } });
  m('apple-m2ultra', 'M2 Ultra', 2023, 'M2 Ultra', [die('M2 Max ×2', 971.2, 'sec', 'tsmc-n5', '推定 ×2')], [{ type: 'P', count: 16, maxGHz: 3.696 }, { type: 'E', count: 8, maxGHz: 2.424 }],
    { l2: 'P 64MB / E 8MB', memory: 'LPDDR5-6400, 1024bit, 800GB/s',
      notes: 'クロック(2026-11-05 追加): P 3.696GHz・E 2.424GHz は [実測](Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み。M2 Max と同じ周波数段。Linux DTS でも一致)。L2 は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。SLC 96MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 800GB/s は Apple Support [公表](https://support.apple.com/en-us/111835)、種類・速度・バス幅は [二次](Wikipedia)。電力: チップ単体の電力は未取得(Max の 2 倍は推定になるため入れない)。参考: Mac Studio(M2 Ultra)の最大消費電力 295W は Apple の公表値だが、壁際・システム全体の値でチップの電力ではない([公表]。https://support.apple.com/en-us/102027)。power には入れない' });
  m('apple-m3', 'M3', 2023, 'M3', [die('M3', 152.5, 'meas', 'tsmc-n3b')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 4, maxGHz: 4.05 }, { type: 'E', count: 4, maxGHz: 2.75 }],
    { l2: 'P 16MB / E 4MB', memory: 'LPDDR5-6400, 128bit, 100GB/s',
      notes: 'L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 8MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 100GB/s は Apple Support [公表](https://support.apple.com/en-us/117735)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(21, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): 全コア負荷の CPU 20〜21W。https://www.notebookcheck.com/Apple-M3-SoC-in-der-Analyse-Hoehere-Leistung-und-verbesserte-Effizienz.766392.0.html'), range: null, single: pw(5.5, 'meas', 'シングル時 CPU(powermetrics。チップ特定が曖昧)') },
      errCause: { st: 'P コアは Everest 2nd gen(9 幅・ROB 321。Geekerwan・jia.je の図〔二次〕)で、ST 補正 u は A16 の Everest(8 幅・ROB 274)から借用している(9 幅用の代表は無い)。基本 CPI が幅で決まり、幅 8→9 で ST が約 +12% 動くが、実機の A16→A17 Pro の IPC の伸びは数%(Apple の主張は P コア +10%、クロック込み)で、モデルの形による過大とみられる(調査メモの試算 +11.8%)。M3 の P が A17 Pro と同じコアという根拠は Geekerwan の図〔二次〕。設計書 §5.3.3 O' } });
  // M3 Pro・M3 Max(2026-11-01 にコア数とクロックを追記。docs/research/m3-pro-max.md)。uarch は M3 無印と同じく書かない(M3 系 P/E コアの幅・ROB・遅延が未取得で、A16 の Everest/Sawtooth を借りる根拠が無いため)。ST/MT は「uarch 未指定」で計算不能のまま
  m('apple-m3pro', 'M3 Pro', 2023, 'M3 Pro', [die('M3 Pro', 219.2, 'meas', 'tsmc-n3b')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 6, maxGHz: 4.05 }, { type: 'E', count: 6, maxGHz: 2.75 }],
    { l2: 'P 16MB / E 4MB', memory: 'LPDDR5-6400, 192bit, 150GB/s', power: { base: null, peak: pw(25, 'meas', 'マルチ時 CPU 約24〜27W'), range: null },
      notes: 'メモリ文字列(2026-11-05 追加): 種類・速度・バス幅は [二次](Wikipedia)、帯域 150GB/s は Apple Support [公表](https://support.apple.com/en-us/117736)。cfg.l2(P 16MB / E 4MB)も同日追加(下の記述と同値。Linux DTS t6030 でも一致〔[二次]〕)。12 コア版(6P+6E)。11 コア版(5P+6E)もあり、12 コア版とした判断は [推定](GB7 の注記「12c」・フロアプランの枠 P6/E6・電力 27W の注記から)。コア数は [公表](Apple support.apple.com/117736、Newsroom)、最大クロック 4.05 / 2.75GHz は [二次](Wikipedia「Apple silicon」・Notebookcheck。Apple は非公表)。GPU 18 コア(11 コア版は 14)・メモリ帯域 150GB/s・トランジスタ 370 億は [公表]。L2 は P 16MB(6 コア共有)/ E 4MB、SLC 12MB(Wikipedia・Notebookcheck。LowEndMac は P 32MB・SLC 24MB で食い違うが、出典が Wikipedia で読み違えとみられるため採らない)。uarch(幅・ROB・遅延)は未取得のため書かない。docs/research/m3-pro-max.md 参照' });
  m('apple-m3max', 'M3 Max', 2023, 'M3 Max', [die('M3 Max', 477.1, 'sec', 'tsmc-n3b', 'NamuWiki のみ。2 つ目の出典は未取得(検索要約では 477 が多数だが 503・600〜700 mm² の記述もあり、原典は未確認)')],
    [{ type: 'P', uarch: 'Everest 2nd gen', count: 12, maxGHz: 4.05 }, { type: 'E', count: 4, maxGHz: 2.75 }],
    { l2: 'P 32MB(16MB×2)/ E 4MB', memory: 'LPDDR5-6400, 512bit, 400GB/s', power: { base: null, peak: pw(56, 'meas', 'CPU マルチ最大。なお「約78W」は Notebookcheck の Cinebench マルチ時・外部モニター接続の「システム全体」の値で、チップの値ではない(2026-11-05 に訂正。以前はチップ全体と書いていた)'), range: null },
      notes: 'cfg.l2(2026-11-05 追加)は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。メモリ文字列(同日追加)は 16 コア版(40 コア GPU)の 512bit・400GB/s(Apple Support [公表] https://support.apple.com/en-us/117736 )、種類・速度・バス幅は [二次](Wikipedia)。14 コア版(30 コア GPU)は 384bit・300GB/s。16 コア版(12P+4E)。14 コア版(10P+4E)もあり、16 コア版とした判断は [推定](GB7 の注記「16c」・フロアプランの枠 P12/E4・電力 56W が 16 コア版の値から)。コア数は [公表](Apple support.apple.com/117736、Newsroom)、最大クロック 4.05 / 2.75GHz は [二次](Wikipedia・Notebookcheck。Apple は非公表)。GPU 40 コア(14 コア版は 30)・メモリ帯域 400GB/s(14 コア版は 300)・トランジスタ 920 億は [公表]。L2 は P 32MB(16MB × 2 クラスタは [推定])/ E 4MB、SLC 48MB([二次] Wikipedia。LowEndMac の出典も Wikipedia で独立した出典ではない)。ダイ面積 477.1mm² は NamuWiki のみで 2 つ目の出典が無い。uarch は未取得のため書かない。docs/research/m3-pro-max.md 参照' });
  m('apple-m4', 'M4', 2024, 'M4', [die('M4', 169.4, 'meas', 'tsmc-n3e')],
    [{ type: 'P', count: 4, maxGHz: 4.4 }, { type: 'E', count: 6, maxGHz: 2.85 }],
    { l2: 'P 16MB / E 4MB', memory: 'LPDDR5X-7500, 128bit, 120GB/s',
      notes: 'L2 は Linux の DTS([二次])と sysctl([実測])による(2026-11-05 追加。URL は調査担当が記録せず未記録)。SLC 8MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。メモリ: 帯域 120GB/s は Apple Support [公表](https://support.apple.com/en-us/121552 、https://support.apple.com/en-us/121555)、種類・速度・バス幅は [二次](Wikipedia)。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(24, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): MacBook Pro 14 のマルチ負荷での最大 CPU 電力。Mac mini は 21.5W。https://www.notebookcheck.net/Apple-MacBook-Pro-14-M4-review-The-M4-base-model-with-important-improvements.923443.0.html'), range: null } });
  m('apple-m4pro', 'M4 Pro', 2024, 'M4 Pro', [die('M4 Pro', 325, 'sec', 'tsmc-n3e', '約320〜330(TechInsights が解析済みだが面積は未確認)')],
    [{ type: 'P', count: 10, maxGHz: 4.51 }, { type: 'E', count: 4, maxGHz: 2.59 }],
    { l2: 'P 32MB(16MB×2)/ E 4MB', memory: 'LPDDR5X-8533, 256bit, 273GB/s', power: { base: null, peak: pw(46, 'meas', 'マルチ最大(その後約40W)。シングル時 約6〜6.5W'), range: null },
      notes: 'cfg.l2(2026-11-05 追加)は Linux の DTS([二次])と sysctl([実測])による(URL は調査担当が記録せず未記録)。メモリ文字列(同日追加): 帯域 273GB/s は Apple Support [公表](https://support.apple.com/en-us/121553 、https://support.apple.com/en-us/121555)、種類・速度・バス幅は [二次](Wikipedia)。SLC は未取得(別階層のため l3MB には入れない)。最大クロック P 4.51 / E 2.59GHz は [実測](Eclectic Light の powermetrics。P 4511MHz を観測、E の周波数段上限 2592MHz)で、Wikipedia・Notebookcheck([二次]、4512 / 2592MHz)と一致。docs/research/apple-pe-cores.md §3.2' });
  m('apple-m5', 'M5', 2025, 'M5', [die('M5', 157.5, 'sec', 'tsmc-n3p', 'NamuWiki のみ')], [{ type: 'super', count: 4, maxGHz: 4.608 }, { type: 'E', count: 6, maxGHz: 3.0 }],
    { l2: 'S 16MB / E 6MB', memory: 'LPDDR5X-9600, 128bit, 153GB/s', power: { base: null, peak: pw(30.5, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): CPU だけの負荷での短時間の値。持続は 27.5W。https://www.notebookcheck.net/Analysis-of-the-Apple-M5-SoC-Apple-silicon-extends-its-lead-over-AMD-Intel-and-Qualcomm.1144213.0.html'), range: null },
      notes: 'E コア 3.0GHz は [二次](Wikipedia 3.0 / Notebookcheck 3048MHz)。super コアの最大クロック 4.608GHz は 2026-11-05 に追加([実測] Eclectic Light の powermetrics 周波数 CSV〔mxfrequencies2.zip〕https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み。M5 無印の値。Linux DTS でも一致)。旧: 未確定のため null(Wikipedia は機種により 4.4(3S 版)/ 4.46(4S 版)の版もあり、Notebookcheck の仕様表は 4608MHz〔本文は up to 4.4GHz〕と資料が食い違っていた)。docs/research/apple-pe-cores.md §3.2・§5-2。cfg.l2(S 16MB / E 6MB。Linux DTS の [二次] と sysctl の [実測]。URL は未記録)とメモリ文字列(帯域 153GB/s は Apple Support [公表] https://support.apple.com/en-us/125405 、種類・速度・バス幅は [二次] Wikipedia)を同日追加。SLC 8MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)' });
  m('apple-m5max', 'M5 Max', 2026, 'M5 Max', [], [{ type: 'super', count: 6, maxGHz: 4.6 }, { type: 'performance', count: 12, maxGHz: 4.4 }],
    { l2: 'S 16MB / P 16MB(8MB×2)', memory: 'LPDDR5X-9600(GPU 40 コア版: 512bit・614GB/s / GPU 32 コア版: 384bit・460GB/s)', power: { base: null, peak: pw(75, 'meas', 'Notebookcheck の測定(調査担当の報告 2026-11-05。Notebookcheck の原ページ確認済み。WebFetch で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認): 16 インチ MacBook Pro の CPU だけの負荷での最大。High Power と Auto のどちらでも最大は 75W で、持続は High Power モードで 70W、Auto モードで 54W に低下。peak の意味は CPU の最大・短時間値(M1 の 15W は Cinebench R23 の平均パッケージ電力で意味が違う)。14 インチは 50W を維持できない。https://www.notebookcheck.net/Apple-s-fastest-laptop-starts-to-show-its-age-Apple-MacBook-Pro-16-2026-M5-Max-Review.1250821.0.html'), range: null }, notes: 'cfg.l2(S 16MB / P 16MB〔8MB×2〕。Linux DTS の [二次] と sysctl の [実測]。URL は未記録。2026-11-05 追加)。メモリ文字列(同日追加): このプリセットは GPU 構成を持たず(dies も空)どちらの版か決められないため、両方を書いた(40 コア GPU 版は 512bit・614GB/s、32 コア GPU 版は 384bit・460GB/s。Apple Support [公表] https://support.apple.com/en-us/126318 、種類・速度は [二次] Wikipedia)。SLC 48MB は [二次](Wikipedia 等。多くは出典なし)で、SLC は別階層のため l3MB には入れない(設計書 §5.3.0「L3 容量の取得と反映」)。最大クロック super 4.6 / performance 4.4GHz は [二次](Notebookcheck の仕様ページ。Wikipedia 本文は S 約 4.61。Apple は非公表)。docs/research/apple-pe-cores.md §3.2。電力: peak 75W は 16 インチの CPU だけの負荷の最大値(2026-11-05 に追加)。14インチは CPU 50W を維持できず、CPU+GPU のストレスで 96W(1〜2秒)→46W→42W([実測] Notebookcheck)で、この値は peak に使っていない' });

  // ---- Qualcomm Snapdragon(コア: プライム+中間+小) ----
  // extra.memory(メモリの文字列)は cfg に入れる。それ以外の extra はプリセット直下。l3MB は設計書の方針(§5.3.0「L3 容量の取得と反映」)でスマホ SoC には入れない(L3/SLC の容量は notes に記録)
  const q = (id, name, year, gb7, mm2, nodeId, cores, extra) => { const { memory, ...rest } = extra || {}; return add(Object.assign({
    id, name: 'Snapdragon ' + name, vendor: 'Qualcomm', family: 'Snapdragon', isa: 'arm', kind: 'mobile', year, gb7,
    dies: mm2 ? [die('Snapdragon ' + name, mm2, 'meas', nodeId)] : [], cfg: { cores, memory: memory || null },
  }, rest)); };
  const c = (type, uarch, count, ghz) => ({ type, uarch, count, maxGHz: ghz });
  q('qc-855', '855', 2018, '855', 76.5, 'tsmc-n7', [c('P', 'Cortex-A76', 1, 2.84), c('M', 'Cortex-A76', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)],
    { memory: 'LPDDR4X-4266, 64bit, 34.1GB/s',
      notes: 'メモリ LPDDR4X-4266・64bit・34.1GB/s は [二次](Wikipedia の raw で確認、2026-11-05。Wikipedia のみだが Notebookcheck と整合)。キャッシュ(同日追加、[二次]): L3 2MB・SLC 3MB(Notebookcheck は L3 5MB で、合計と整合)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: pw(5, 'sec', 'Notebookcheck の推定(Qualcomm 未公表)'), peak: null, range: null } });
  q('qc-865', '865', 2019, '865', 86.9, 'tsmc-n7', [c('P', 'Cortex-A77', 1, 2.84), c('M', 'Cortex-A77', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)],
    { memory: 'LPDDR5-5500 / LPDDR4X-4266, 64bit, 44GB/s',
      notes: 'メモリ LPDDR5-5500 / LPDDR4X-4266・64bit・44GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 4MB・SLC 3MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md' });
  q('qc-888', '888', 2020, '888', 112.2, 'samsung-5', [c('P', 'Cortex-X1', 1, 2.84), c('M', 'Cortex-A78', 3, 2.42), c('E', 'Cortex-A55', 4, 1.8)],
    { memory: 'LPDDR5-6400 / LPDDR4X-4266, 64bit, 51.2GB/s',
      notes: 'メモリ LPDDR5-6400 / LPDDR4X-4266・64bit・51.2GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 4MB・SLC 3MB(Notebookcheck は 3MB とし食い違う。ここでは 4MB と両論を記録)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: pw(5, 'sec', 'Notebookcheck の推定'), peak: pw(8.9, 'sec', 'Geekerwan 実測ピーク(報道の引用)'), range: null } });
  q('qc-8gen1', '8 Gen 1', 2021, '8 Gen 1', 128.3, 'samsung-4', [c('P', 'Cortex-X2', 1, 3.0), c('M', 'Cortex-A710', 3, 2.5), c('E', 'Cortex-A510', 4, 1.8)],
    { memory: 'LPDDR5-6400, 64bit, 51.2GB/s',
      notes: 'メモリ LPDDR5-6400・64bit・51.2GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 6MB・SLC 4MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(11.1, 'sec', '全コアピーク(Geekerwan の引用)。シングル 4.2W。Geekbench 5 時代(2021 年)の値で、報道では 11.2W とも伝えられ食い違う'), range: null } });
  q('qc-8plus-gen1', '8+ Gen 1', 2022, '8+ Gen 1', 102.8, 'tsmc-n4', [c('P', 'Cortex-X2', 1, 3.2), c('M', 'Cortex-A710', 3, 2.75), c('E', 'Cortex-A510', 4, 2.0)],
    { memory: 'LPDDR5-6400, 64bit',
      notes: 'メモリ LPDDR5-6400・64bit は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 6MB・SLC 4MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md' });
  q('qc-8gen2', '8 Gen 2', 2022, '8 Gen 2', 120.9, 'tsmc-n4', [c('P', 'Cortex-X3', 1, 3.19), c('M', 'Cortex-A715/A710', 4, 2.8), c('E', 'Cortex-A510', 3, 2.0)],
    { memory: 'LPDDR5X-8400, 64bit, 67.2GB/s',
      notes: 'メモリ LPDDR5X-8400・64bit・67.2GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 8MB・SLC 4MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: null, range: null, bigCore: pw(4.9, 'sec', 'ビッグコア単体ピーク(SPECint)。「8 Gen 2 for Galaxy」(オーバークロック版)のピークの値で、無印の 8 Gen 2 の値ではない(Wccftech、Golden Reviewer、SPECint06 Big Core。2026-11-05 に訂正)') } });
  q('qc-8gen3', '8 Gen 3', 2023, '8 Gen 3', 137.3, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.3), c('M', 'Cortex-A720', 3, 3.15), c('M2', 'Cortex-A720', 2, 2.96), c('E', 'Cortex-A520', 2, 2.27)],
    { memory: 'LPDDR5X-9600, 64bit, 76.8GB/s',
      notes: 'メモリ LPDDR5X-9600・64bit・76.8GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。キャッシュ(同日追加、[二次]): L3 12MB(Android Authority・ComputerBase。Notebookcheck は 8MB とし食い違う)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: null, range: null, bigCore: pw(6.27, 'sec', 'ビッグコア単体ピーク(SPECint)') } });
  q('qc-8elite', '8 Elite', 2024, '8 Elite', 124.1, 'tsmc-n3e', [c('P', 'Oryon Prime', 2, 4.32), c('E', 'Oryon Performance', 6, 3.53)],
    { notes: 'キャッシュ(2026-11-05 追加、[二次] Notebookcheck 等): L3 なし。L2 は 12MB × 2 クラスタ、SLC 8MB。メモリは Wikipedia と Notebookcheck で食い違うため入れない(未取得のまま)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(16.5, 'sec', 'GB6 マルチ(Geekerwan の引用)。後続記事は約17W'), range: null, single: pw(6.9, 'sec', 'シングル(Notebookcheck が導出)') } });
  q('qc-8elite-gen5', '8 Elite Gen 5', 2025, '8 Elite Gen 5', 126.2, 'tsmc-n3p', [c('P', 'Oryon Prime', 2, 4.61), c('E', 'Oryon Performance', 6, 3.63)],
    { notes: 'キャッシュ(2026-11-05 追加、[二次] Notebookcheck): L3 なし。L2 は 24MB、SLC 8MB。メモリは Wikipedia と Notebookcheck で食い違うため入れない(未取得のまま)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(19.5, 'sec', 'GB6 マルチ 12,546 点時(評価機の値)。エンジニアリングサンプル(ES)のボード電力で、市販機の SoC 単体の値ではない(2026-11-05 に明記)'), range: null } });
  q('qc-8s-gen3', '8s Gen 3', 2024, '8s Gen 3', 89.5, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.0), c('M', 'Cortex-A720', 4, 2.8), c('E', 'Cortex-A520', 3, 2.0)],
    { notes: '2026-11-05 の調査で、L3 は資料が 8MB と 12MB で割れて確定できず(未取得のまま)、メモリも Wikipedia と Notebookcheck で食い違うため入れない。docs/research/missing-data-2026-11-05.md' });
  q('qc-8s-gen4', '8s Gen 4', 2025, '8s Gen 4', 105.6, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.21), c('M', 'Cortex-A720', 3, 3.0), c('M2', 'Cortex-A720', 2, 2.8), c('E', 'Cortex-A720', 2, 2.02)]);
  q('qc-7plus-gen3', '7+ Gen 3', 2024, '7+ Gen 3', 89.5, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 2.8), c('M', 'Cortex-A720', 4, 2.6), c('E', 'Cortex-A520', 3, 1.9)]);
  q('qc-780g', '780G', 2021, '780G', 81.2, 'samsung-5', [c('P', 'Cortex-A78', 1, 2.4), c('M', 'Cortex-A78', 3, 2.2), c('E', 'Cortex-A55', 4, 1.9)],
    { power: { base: pw(5, 'sec', 'Notebookcheck の推定'), peak: null, range: null } });

  // ---- MediaTek Dimensity ----
  // extra.memory(メモリの文字列)は cfg に入れる。l3MB は設計書の方針(§5.3.0「L3 容量の取得と反映」)でスマホ SoC には入れない(L3/SLC の容量は notes に記録)
  const d = (id, name, year, gb7, mm2, nodeId, cores, extra) => { const { memory, ...rest } = extra || {}; return add(Object.assign({
    id, name: 'Dimensity ' + name, vendor: 'MediaTek', family: 'Dimensity', isa: 'arm', kind: 'mobile', year, gb7,
    dies: mm2 ? [die('Dimensity ' + name, mm2, 'meas', nodeId)] : [], cfg: { cores, memory: memory || null },
  }, rest)); };
  d('mt-9000', '9000', 2021, '9000', 112.8, 'tsmc-n4', [c('P', 'Cortex-X2', 1, 3.05), c('M', 'Cortex-A710', 3, 2.85), c('E', 'Cortex-A510', 4, 1.8)],
    { memory: 'LPDDR5X-7500, 64bit', notes: 'メモリ LPDDR5X-7500・64bit は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]): https://www.mediatek.com/products/smartphones-2/mediatek-dimensity-9000 。キャッシュ(2026-11-05 追加): L3 8MB・SLC 6MB(同じ公式ページ、[公表])。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(9.8, 'sec', '全コアピーク(エンジニアリングサンプル。報道の引用)。シングル 3.5W。Geekbench 5 時代(2021 年)の値'), range: null } });
  d('mt-9200', '9200', 2022, '9200', 123.2, 'tsmc-n4', [c('P', 'Cortex-X3', 1, 3.05), c('M', 'Cortex-A715', 3, 2.85), c('E', 'Cortex-A510', 4, 1.8)],
    { memory: 'LPDDR5X-8533, 64bit', notes: 'メモリ LPDDR5X-8533・64bit は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録。9000 のページは https://www.mediatek.com/products/smartphones-2/mediatek-dimensity-9000 )。キャッシュ(2026-11-05 追加): L3 8MB・SLC 6MB は [二次](Notebookcheck。MediaTek 公式ページには記載なし)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(14, 'sec', 'GSMArena コメント欄の引用。信頼度低'), range: null } });
  d('mt-9300', '9300', 2023, '9300', 140.4, 'tsmc-n4', [c('P', 'Cortex-X4', 1, 3.25), c('M', 'Cortex-X4', 3, 2.85), c('E', 'Cortex-A720', 4, 2.0)],
    { memory: 'LPDDR5T-9600, 64bit, 76.8GB/s', notes: 'メモリ LPDDR5T-9600・64bit・76.8GB/s は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録)。キャッシュ(2026-11-05 追加): 公式は L3 と SLC の合計 18MB([公表])。内訳 L3 8MB・SLC 10MB は Notebookcheck がプレスリリースを引用したもの([二次])。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md' });
  d('mt-9400', '9400', 2024, '9400', 126.3, 'tsmc-n3e', [c('P', 'Cortex-X925', 1, 3.63), c('M', 'Cortex-X4', 3, 3.3), c('E', 'Cortex-A720', 4, 2.4)],
    { memory: 'LPDDR5X-10667, 64bit, 85.3GB/s', notes: 'メモリ LPDDR5X-10667・64bit・85.3GB/s は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録)。キャッシュ(2026-11-05 追加、同公式ページ、[公表]): L3 12MB・SLC 10MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md',
      power: { base: null, peak: pw(18, 'sec', 'GB6 マルチ 18W 超(Geekerwan の引用)。プライムコア 7.1W(SPECint)'), range: null } });
  d('mt-9500', '9500', 2025, 'Dimensity 9500(MT6993)', 140.6, 'tsmc-n3p', [c('P', 'C1-Ultra', 1, 4.21), c('M', 'C1-Premium', 3, 3.5), c('E', 'C1-Pro', 4, 2.7)],
    { memory: 'LPDDR5X-10667, 64bit, 85.3GB/s', power: { base: null, peak: pw(18, 'sec', 'GB6 マルチ(GSMArena/Wccftech 経由)。エンジニアリングサンプル(ES)で GB6 マルチ 10,716 点のときの値(2026-11-05 に明記)'), range: null }, notes: 'GB7 の値は Samsung のタブレット投稿が多く低すぎる疑い(要再確認)。メモリ LPDDR5X-10667・64bit・85.3GB/s は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録)。キャッシュ(同日追加、同公式ページ、[公表]): L3 16MB・SLC 10MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md' });
  d('mt-9600pro', '9600 Pro', 2026, 'Dimensity 9600 Pro(MT6995)', 134.0, 'tsmc-n2', [c('P', 'C2-Ultra', 2, 4.55), c('M', 'C2-Pro', 3, 4.35), c('E', 'C2-Pro', 3, 3.1)],
    { memory: 'LPDDR6-10667 / LPDDR5X-10667', notes: 'メモリ LPDDR6-10667 / LPDDR5X-10667(バス幅・帯域は未取得)は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録)。キャッシュ(同日追加、同公式ページ、[公表]): L3 16MB・SLC 10MB。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義(SLC は別階層で性能・電力の L3 計算の対象外)のため、容量は notes にだけ記録する。電力は未取得(値としては入れない)。参考値として記録のみ(不採用): IT之家(原ページ確認済み 2026-11-05。https://www.ithome.com/1/014/806.htm)に Geekbench 6 マルチ 12,765 点のとき 22.7W(Geekbench 7 マルチでは約 23.5W)とあるが、エンジニアリングサンプル(ES)の工程機で、端末全体か SoC かは不明、測定者も不明、MediaTek の「マルチのピーク電力 61% 減」の主張とも整合しない。8 Gen 2 や A16 / A18 Pro を不採用にした基準と揃えて power には入れない。docs/research/power-data-2026-11-05.md §3' });
  d('mt-8200', '8200', 2022, 'Dimensity 8200(MT6896)', 84.9, 'tsmc-n4', [c('P', 'Cortex-A78', 1, 3.1), c('M', 'Cortex-A78', 3, 3.0), c('E', 'Cortex-A55', 4, 2.0)],
    { memory: 'LPDDR5-6400, 64bit, 51.2GB/s', notes: 'メモリ LPDDR5-6400・64bit・51.2GB/s は 2026-11-05 に MediaTek 公式ページの原ページで確認([公表]。個別 URL は調査担当が記録せず未記録)。キャッシュ(同日追加、同公式ページ、[公表]): L3 4MB(SLC は未取得)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md' });

  // ---- NVIDIA ----
  add({
    id: 'nv-orin-agx', name: 'Orin (Jetson AGX Orin)', vendor: 'NVIDIA', family: 'Jetson', isa: 'arm', kind: 'embedded', year: 2022,
    gb7: 'Orin(AGX Orin、12コア)',
    dies: [die('Orin', 447.8, 'meas', 'samsung-8')],
    power: { base: null, peak: null, range: { minW: 15, maxW: 60 }, modes: pw(null, 'pub', '15W / 30W(既定) / 50W / MAXN(64GB 版)。既定が 30W(mode ID 2)であることは NVIDIA の公式ドキュメントで裏付け済み(2026-11-05)') },
    cfg: { cores: [c('P', 'Cortex-A78AE', 12, 2.2)], l3MB: 6, memory: 'LPDDR5, 256bit, 204.8GB/s' },
    notes: 'L3 6MB(2MB × 3 クラスタ)は 2026-11-05 に追加([公表] NVIDIA 製品ページ https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ と Hot Chips 34 のスライド)。旧: null。System Cache 4MB は L4 扱いで l3MB には入れない。L3 を入れたことで ST は -6.6% → -0.3%、MT は -1.1% → -13.9%(許容 ±10% の外)に変わった(前後の評価は docs/research/missing-data-2026-11-05.md)。docs/research/missing-data-2026-11-05.md',
  });
  add({
    id: 'nv-thor', name: 'Thor (Jetson AGX Thor)', vendor: 'NVIDIA', family: 'Jetson', isa: 'arm', kind: 'embedded', year: 2025,
    gb7: 'Thor(Jetson AGX Thor、14コア)',
    dies: [die('Thor', 402.2, 'meas', 'tsmc-n4')],
    power: { base: null, peak: null, range: { minW: 40, maxW: 130 }, modes: pw(null, 'pub', 'モード: MAXN / 120W(既定。T5000)/ 90W / 70W。モジュールの TDP 予算は 130W。40W は製品ページに書かれた下限。原ページ確認済み(2026-11-05): https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/ 、https://docs.nvidia.com/jetson/archives/r38.4/DeveloperGuide/SD/PlatformPowerAndPerformance/JetsonThor.html') },
    cfg: { cores: [c('P', 'Neoverse V3AE', 14, 2.6)], l3MB: 16, memory: 'LPDDR5X, 256bit, 273GB/s' },
  });
  add({
    id: 'nv-t239', name: 'Switch 2 の T239', vendor: 'NVIDIA', family: 'Tegra', isa: 'arm', kind: 'embedded', year: 2025,
    gb7: null,
    dies: [die('T239', 207, 'meas', 'samsung-8', 'ダイ写真計測(Tom\'s Hardware)')],
    power: { base: pw(19, 'pub', 'Nintendo 公式の Switch 2 本体全体・TV モード・マリオカート ワールドでの平均消費電力(Full HD / 4K の平均)。SoC 単体の値ではない(2026-11-05 に訂正)。ホーム画面 8W。Tom\'s Hardware のワットメーター実測(ドック時 18〜19W)とも一致(検索要約のみ)'), peak: null, range: null },
    cfg: { cores: [c('P', 'Cortex-A78C', 8, 1.1)], l3MB: 4, memory: 'LPDDR5X, 128bit' },
  });
  // GB10(DGX Spark)。2026-11-03 追加。調査: docs/research/nvidia-gb10.md。addedIn:'M5b'(calib は false)。GB7 は未取得(gb7: null)のため、validate-data.js の C1_EXCEPTIONS(id 指定。C1 だけを外し、C2〜C5 は検査する)に載せている(設計書 §13 M5b-4)
  add({
    id: 'nv-gb10', name: 'GB10(DGX Spark)', vendor: 'NVIDIA', family: 'DGX', isa: 'arm', kind: 'pc', year: 2025, addedIn: 'M5b',
    gb7: null,
    dies: [
      die('S-die(CPU・メモリ・I/O、MediaTek)', 207.9, 'meas', 'tsmc-n3e', 'Kurnal 12.91×16.10mm。プロセス N3E は TechInsights(二次)'),
      die('G-die(Blackwell GPU)', 173.6, 'meas', 'tsmc-n3e', 'Kurnal 12.91×13.45mm。NVIDIA は「3nm」のみ公表で、N3E は推定(nodeId は N3E を当てただけ)'),
    ],
    power: { base: pw(140, 'pub', 'SoC のみ・typical(ホワイトペーパー Table 1)。DGX Spark の電源アダプタは 240W'), peak: null, range: null },
    cfg: { cores: [c('P', 'Cortex-X925', 10, 4.0), c('E', 'Cortex-A725', 10, 2.8)], l3MB: 24, memory: 'LPDDR5X-8533, 256bit, 273GB/s' },
    notes: 'CPU(S-die。MediaTek と共同設計)と GPU(G-die)の 2 ダイを 2.5D パッケージと NVIDIA C2C で接続([公表])。クロックは X925 最大 4GHz・A725 最大 2.8GHz([公表]。lscpu 4004 / 2860MHz〔[実測]〕。一方の X925 クラスタは 3.9GHz〔[二次]〕)。L2 は X925 2MB・A725 512KB(コア当たり)、L3 は 16MB と 8MB の 2 クラスタ(合計 24MB)、SLC 16MB([二次])。GPU は Blackwell 48 SM・6,144 CUDA・2.4GHz・L2 24MiB([公表])。ダイ面積は Kurnal の計測([実測])。G-die のプロセスは 3nm のみ公表で N3E は推定。GB7 は未取得(PC 向け N1X の値は別製品なので入れない)。Geekbench 6 は参考の個別投稿 3 件(判定には使わない。[二次]): Dell Pro Max with GB10 ST 3123 / MT 19708(1 件。Jeff Geerling の測定、geerlingguy/sbc-reviews #92)、第三者の投稿 ST 3237 / MT 19794(1 件。同 issue に併記)、DGX Spark ST 2983 / MT 18183(1 件。daniel.lawrence.lu のブログ 2026-07-15)。件数はすべて 1 件で中央値ではない',
  });

  // ---- M5b 波1 追加分(addedIn:'M5b'。calib は false。電力・キャッシュは未取得のまま null。メモリは任意項目で null のまま(§2.7.4 に 7 Gen 1・7 Gen 4 のメモリ LPDDR5/5X・32bit の記載はあるが未転記)。設計書 §13) ----
  const m5b = (note) => ({ addedIn: 'M5b', ...(note ? { notes: note } : {}) });
  q('qc-7gen3', '7 Gen 3', 2023, 'Snapdragon 7 Gen 3(SM7550)', 55.2, 'tsmc-n4', [c('P', 'Cortex-A715', 1, 2.63), c('M', 'Cortex-A715', 3, 2.4), c('E', 'Cortex-A510', 4, 1.8)], m5b('プロセスは §2.7.4 が N4P、§2.2 が 4nm のため tsmc-n4 に対応づけ'));
  q('qc-7gen4', '7 Gen 4', 2025, 'Snapdragon 7 Gen 4(SM7750)', 70.3, 'tsmc-n4', [c('P', 'Cortex-A720', 1, 2.8), c('M', 'Cortex-A720', 4, 2.4), c('E', 'Cortex-A520', 3, 1.84)], m5b('nodeId は §2.2 の TSMC 4nm(§2.7.4 はプロセス未取得)から tsmc-n4 に対応づけた'));
  q('qc-7gen1', '7 Gen 1', 2022, 'Snapdragon 7 Gen 1(SM7450)', 77.8, 'samsung-4', [c('P', 'Cortex-A710', 1, 2.4), c('M', 'Cortex-A710', 3, 2.36), c('E', 'Cortex-A510', 4, 1.8)], { memory: 'LPDDR5-6400, 32bit, 25.6GB/s', ...m5b('プロセスは Samsung 4nm(§2.7.4 は 4LPX)。メモリ LPDDR5-6400・32bit・25.6GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。L3 は未取得のまま') });
  q('qc-720g', '720G', 2020, 'Snapdragon 720G(SM7125)', 55.5, 'samsung-8', [c('P', 'Cortex-A76', 2, 2.3), c('E', 'Cortex-A55', 6, 1.8)], { memory: 'LPDDR4X-3733, 32bit, 14.9GB/s', ...m5b('プロセスは Samsung 8nm(§2.7.4 は 8LPP)。メモリ LPDDR4X-3733・32bit・14.9GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。SLC 1MB は [二次](Wikipedia のみ)で、SLC は別階層のため l3MB には入れない。L3 は未取得のまま') });
  q('qc-8elite-x-gen6', '8 Elite Extreme Gen 6', 2026, 'Snapdragon 8 Elite Extreme Gen 6(SM8975、モバイル)', 133.2, 'tsmc-n2', [c('P', 'Oryon Prime', 2, 5.0), c('E', 'Oryon Performance', 6, 4.0)], m5b('クロック(最大 5.0 / 4.0GHz)とプロセスは報道(二次)。ダイ面積 133.2 は N2P の実測。nodeId は N2P 専用の記録が無いため tsmc-n2。キャッシュ(2026-11-05 追加、[二次] Beebom): L3 なし。L2 16MB(全コア共有)、SLC 8MB(無印の Gen 6 は 6MB)。設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録する。docs/research/missing-data-2026-11-05.md'));

  // ---- M5b 波2 追加分(Qualcomm 2 件。nodeId は Samsung 4LPX の記録が無いため 4LPE の samsung-4 で代用。設計書 §13 M5b-8 R1) ----
  q('qc-6gen1', '6 Gen 1', 2022, 'Snapdragon 6 Gen 1(SM6450)', 53.9, 'samsung-4', [c('P', 'Cortex-A78', 4, 2.2), c('E', 'Cortex-A55', 4, 1.8)], { memory: 'LPDDR5-5500, 32bit, 22GB/s', ...m5b('メモリ LPDDR5-5500・32bit・22GB/s は [二次](Wikipedia の raw で確認、2026-11-05)。L3 は未取得のまま。プロセスは Samsung 4nm(4LPX。Wikipedia の SoC 一覧)。4LPX を 4LPE の記録 samsung-4 で代用(旧記載の 8nm は誤り)。クロックは Wikipedia 値。発売年は設計書 §2.7.4 の 2022(2023 とする根拠は未取得)') });
  q('qc-4gen2', '4 Gen 2', 2023, 'Snapdragon 4 Gen 2(SM4450)', 40.3, 'samsung-4', [c('P', 'Cortex-A78', 2, 2.2), c('E', 'Cortex-A55', 6, 1.95)], m5b('プロセスは Samsung 4nm(4LPX。Wikipedia の SoC 一覧)。4LPX を 4LPE の記録 samsung-4 で代用。クロックは Wikipedia の 2.2/1.95GHz。Qualcomm 製品概要 Rev C は 2.3/2.0GHz(検索要約。2.4GHz 版もある)で食い違う。GB7 の行(SM4450)の実機クロックは未確認'));

  // ---- M6 第 5 段 E5 追加分(Windows ノート向け。ユーザー承認 2026-10-31。設計書 §5.3.2 E5) ----
  q('qc-8cx-gen3', '8cx Gen 3', 2021, 'Snapdragon 8cx Gen 3(SC8280XP、Windows ノート)', null, null, [c('P', 'Cortex-X1', 4, 3.0), c('M', 'Cortex-A78', 4, 2.4)],
    { memory: 'LPDDR4X-4266, 128bit, 68.3GB/s', kind: 'mobile-pc', dies: [die('Snapdragon 8cx Gen 3', 171.17, 'meas', 'samsung-5', 'Kurnal Insights の計測値 1 サイトのみ(12.35×13.86mm。SA8295P と同一ダイとして掲載)。他に独立した出典なし。設計書 §2.x の既存方針〔Kurnal の計測=meas〕に従い区分は meas')],
      ...m5b('面積は Kurnal Insights 1 サイトのみ(区分は既存方針どおり meas)。構成・クロック・プロセス(Samsung 5LPE)は Wikipedia と Notebookcheck の 2 サイトで一致。GB7 は機種が混在する 17 件の中央値。L3 は当初資料間で食い違う(Notebookcheck 8MB / Wikipedia 4MB+SLC 3MB)として未設定。2026-11-05 の再調査で L3 8MB・SLC 6MB に Wikipedia・Notebookcheck・Chips and Cheese・IT之家の 4 サイトが一致([二次])したが、設計書の方針(§5.3.0「L3 容量の取得と反映」)で SoC の l3MB は未定義のため、容量は notes にだけ記録し l3MB は未設定のまま。メモリ LPDDR4X-4266・128bit・68.3GB/s は [二次](Wikipedia の raw で確認、2026-11-05)') });

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
  // 参考値(判定外)。再現度パネルに公開値と並べて出す。値は docs/research/apple-uarch.md・nbc-gb7-mobile.md のものだけ(設計書 §2.4 の Notebookcheck 併記と同じ)。評価・判定には使わない(設計書 §5.3.3 J-7)
  const GB7_REF = {
    'apple-a16': [{ st: 2394, mt: 6643, device: 'iPhone 14 Pro Max D74AP(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A16-Bionic-Processor-Benchmarks-and-Specs.652742.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。中央値 2352 / 6373(機種 n=4)との差 +1.8% / +4.2%' }],
    'apple-a17pro': [{ st: 2688, mt: 7209, device: 'iPad mini 7 J410AP と iPhone 15 Pro Max D84AP(2 件の平均)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A17-Pro-Processor-Benchmarks-and-Specs.756287.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。2683 / 7184 と 2692 / 7233 の平均' }],
    'apple-a18': [{ st: 2804, mt: 7602, device: 'iPhone 16e V59AP(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A18-Processor-Benchmarks-and-Specs.891555.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。' }],
    'apple-a18pro': [{ st: 3005, mt: 7947, device: 'iPhone 16 Pro(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A18-Pro-Processor-Benchmarks-and-Specs.891556.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。公開値の中央値は n=2 で弱い' }],
    'apple-a19pro': [{ st: 3211, mt: 9003, device: 'iPhone 17 Pro・Air・17 Pro Max(3 機種の中央値)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A19-Pro-Processor-Benchmarks-and-Specs.1126974.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。ST は iPhone Air、MT は iPhone 17 Pro の値' }],
    'apple-a20pro': [{ st: 4055, mt: 11622, device: 'iPhone 18 Pro(1 件。notebooksbilliger.de 経由)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-A20-Pro-Processor-Benchmarks-and-Specs.1396010.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。' }],
    'apple-m3': [{ st: 2902, mt: 11879, device: 'MacBook Pro 14 Nov 2023 Mac15,3(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-M3-Processor-Benchmarks-and-Specs.764609.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。' }],
    'apple-m3pro': [{ st: 2925, mt: 17582, device: 'MacBook Pro 14 Nov 2023(12 コア版、1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-M3-Pro-12-Core-Processor-Benchmarks-and-Specs.781711.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。' }],
    'apple-m3max': [{ st: 2831, mt: 25533, device: 'MacBook Pro 16 Nov 2023 Mac15,9(16 コア版、1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-M3-Max-16-Core-Processor-Benchmarks-and-Specs.781712.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。' }],
    'apple-m4': [{ st: 3416, mt: 16111, device: 'Mac mini 2024 Mac16,10(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-M4-10-cores-Processor-Benchmarks-and-Specs.835975.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。プリセットの公開値のマルチ 13472 は iPad Pro の値(冷却が違う)。この参考値は Mac mini' }],
    'apple-m5': [{ st: 3525, mt: 15676, device: 'MacBook Air 13 2026 Mac17,3(1 件)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Apple-M5-10-Cores-Processor-Benchmarks-and-Specs.1139129.0.html', note: 'Notebookcheck の仕様ページの GB7(Geekbench Browser の投稿の個別結果、2026-11-02 取得)。プリセットの公開値のマルチ 15273 は iPad Pro の値' }],
    'qc-8cx-gen3': [{ st: 1442, mt: 6912, device: 'Huawei GK-W7X', kind: '転載', source: 'https://www.notebookcheck.net/Qualcomm-Snapdragon-8cx-Gen-3-Processor-Benchmarks-and-Specs.652916.0.html', note: 'Geekbench Browser の投稿 v7/cpu/149414 の転載(1 件)' }],
  };
  P.forEach((p) => { if (GB7_REF[p.id]) p.gb7Ref = GB7_REF[p.id]; });
})();
