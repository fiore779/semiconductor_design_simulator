// プリセット(PC・サーバー向け): 面積(§2.2)・電力(§2.5)・構成(§2.7)・GB7(§2.4)をチップ ID でひも付けたもの。
// 設計書の値を転記。未取得は null / 空配列のまま(推測で埋めない)。
//
// 区分:
//   面積 dies[].s : 'meas'=実測 / 'pub'=公表 / 'sec'=二次・推定(校正には meas と pub のみ使う §5.3)
//   電力 power.*  : { w, s } s: 'pub'=メーカー公表 / 'sec'=二次(Wikipedia 等) / 'meas'=レビュー実測
//   gb7           : data/benchmarks/gb7-scores.js の name と完全一致する文字列(validate-data.js で照合)
//   calib         : 校正の代表 SKU(§5.3.1) true のもの。理由は calibNote
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.presets = window.SDS_DATA.presets || [];
(function () {
  const die = (name, mm2, s, nodeId, note) => ({ name, mm2, s, nodeId: nodeId || null, ...(note ? { note } : {}) });
  const pw = (w, s, note) => ({ w, s, ...(note ? { note } : {}) });
  const P = window.SDS_DATA.presets;

  // ---- Intel ----
  P.push({
    id: 'intel-adl-12900k', name: 'Core i9-12900K', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2021,
    gb7: 'Alder Lake: Core i9-12900K(3.2GHz, 16c)',
    dies: [die('Alder Lake-S 8P+8E', 208.0, 'meas', 'intel-7')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(258.6, 'meas', 'Phoronix の全テスト中の CPU ピーク'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 8, smt: 2, baseGHz: 3.2, boostGHz: 5.1 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.4, boostGHz: 3.9 }], l3MB: 30, memory: 'DDR4-3200 / DDR5-4800, 2ch' },
    calib: false,
  });
  P.push({
    id: 'intel-rpl-13900k', name: 'Core i9-13900K', vendor: 'Intel', family: 'Raptor Lake', isa: 'x86', kind: 'pc', year: 2022,
    gb7: 'Raptor Lake: Core i9-13900K(3.0GHz, 24c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'meas', 'intel-7')],
    power: { base: pw(125, 'pub', 'PBP(ARK)'), peak: pw(253, 'pub', 'MTP(ARK)'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.0, boostGHz: 5.8 }, { type: 'E', uarch: 'Gracemont', count: 16, smt: 1, baseGHz: 2.0, boostGHz: null }], l3MB: 36, memory: 'DDR5-5600, 2ch (DDR4-3200 も可)' },
    calib: false,
  });
  P.push({
    id: 'intel-rpl-14900k', name: 'Core i9-14900K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023,
    gb7: 'Raptor Lake Refresh: Core i9-14900K(3.2GHz, 24c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイとして流用(14900K 個別の実測は未取得)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: null, range: null },
    // memory の「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャネル数を読むため、2ch と書くと電力・温度が変わる。メモリ選択機能の追加では電力を変えない方針(設計書 §5.2.4)。電力の注記「メモリチャネル数が未取得」は追加前から出ており、そのまま
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: null, boostGHz: 5.6 }, { type: 'E', uarch: 'Gracemont', count: 16, smt: 1, baseGHz: null, boostGHz: 4.4 }], l3MB: 36, memory: 'DDR5-5600 / DDR4-3200(Intel ARK [公表]。2 チャネル)' },
    calib: false,
  });
  P.push({
    id: 'intel-arl-285k', name: 'Core Ultra 9 285K', vendor: 'Intel', family: 'Arrow Lake-S', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Arrow Lake-S: Core Ultra 9 285K(3.7GHz, 24c)',
    dies: [die('Compute タイル', 117.4, 'meas', 'tsmc-n3b'), die('GPU タイル', 23.1, 'meas', 'tsmc-n5'), die('SoC タイル', 86.6, 'meas', 'tsmc-n6'), die('IO タイル', 24.7, 'meas', 'tsmc-n6')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(250, 'sec', 'MTP'), range: null },
    // memory の「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャネル数を読むため、2ch と書くと電力・温度が変わる。メモリ選択機能の追加では電力を変えない方針(設計書 §5.2.4)。電力の注記「メモリチャネル数が未取得」は追加前から出ており、そのまま
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 3.7, boostGHz: 5.7 }, { type: 'E', uarch: 'Skymont', count: 16, smt: 1, baseGHz: 3.2, boostGHz: 4.6 }], l3MB: 36, l2MBPerP: 3, memory: 'DDR5-6400(Intel ARK [公表]。2 チャネル)' },
    calib: false,
  });
  P.push({
    id: 'intel-arl-265k', name: 'Core Ultra 7 265K', vendor: 'Intel', family: 'Arrow Lake-S', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Arrow Lake-S: Core Ultra 7 265K(3.9GHz, 20c)',
    dies: [die('Compute タイル', 117.4, 'sec', 'tsmc-n3b', '285K と同じ Compute タイルを流用(E コア4個無効の SKU)'), die('GPU タイル', 23.1, 'sec', 'tsmc-n5'), die('SoC タイル', 86.6, 'sec', 'tsmc-n6'), die('IO タイル', 24.7, 'sec', 'tsmc-n6')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(250, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 3.9, boostGHz: 5.5 }, { type: 'E', uarch: 'Skymont', count: 12, smt: 1, baseGHz: 3.3, boostGHz: null }], l3MB: 30, l2MB: 36, memory: 'DDR5-6400, 2ch' },
    calib: true, calibNote: '全コア同種の P/E 構成で単純。TDP・クロック公表。GB7 チャート値あり(§5.3.1 の例)',
  });
  P.push({
    id: 'intel-mtl-185h', name: 'Core Ultra 9 185H', vendor: 'Intel', family: 'Meteor Lake', isa: 'x86', kind: 'mobile-pc', year: 2023,
    gb7: 'Meteor Lake: Core Ultra 9 185H(2.3GHz, 16c)',
    dies: [die('Compute タイル 6P+8E', 68.1, 'meas', 'intel-4'), die('GPU タイル', 41.9, 'meas', 'tsmc-n5'), die('SoC タイル', 96.8, 'meas', 'tsmc-n6'), die('IO タイル', 24.7, 'meas', 'tsmc-n6'), die('Base タイル(22nm)', null, null, null, '寸法の記載なし')],
    power: { base: pw(45, 'sec'), peak: pw(115, 'sec', 'MTP'), range: { minW: 35, maxW: 65 } },
    cfg: { cores: [{ type: 'P', uarch: 'Redwood Cove', count: 6, smt: 2, baseGHz: 2.3, boostGHz: 5.1 }, { type: 'E', uarch: 'Crestmont', count: 8, smt: 1, baseGHz: 1.8, boostGHz: 3.8 }, { type: 'LP-E', uarch: 'Crestmont', count: 2, smt: 1, baseGHz: 1.0, boostGHz: 2.5 }], l3MB: 24, memory: 'LPDDR5X-7467 / DDR5-5600' },
    calib: false,
  });
  P.push({
    id: 'intel-lnl-268v', name: 'Core Ultra 7 268V', vendor: 'Intel', family: 'Lunar Lake', isa: 'x86', kind: 'mobile-pc', year: 2024,
    gb7: 'Lunar Lake: Core Ultra 7 268V(2.2GHz, 8c)',
    dies: [die('Compute タイル', 139.6, 'meas', 'tsmc-n3b'), die('Platform Controller タイル', 45.7, 'meas', 'tsmc-n6'), die('Base タイル', 219.7, 'meas', 'tsmc-n6')],
    power: { base: pw(17, 'sec'), peak: null, range: { minW: 8, maxW: 37 } },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 5.0 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 12, memorySideCacheMB: 8, memory: 'オンパッケージ LPDDR5X-8533, 2ch' },
    calib: false,
  });
  P.push({
    id: 'intel-ptl-x9-388h', name: 'Core Ultra X9 388H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026,
    gb7: 'Panther Lake: Core Ultra X9 388H(2.1GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'meas', 'intel-18a', '他のタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 5.1 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: null, boostGHz: null }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 18, memory: 'LPDDR5X-9600, 2ch' },
    calib: false,
  });

  // ---- AMD ----
  P.push({
    id: 'amd-zen1-1800x', name: 'Ryzen 7 1800X', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017,
    gb7: 'Zen 1: Ryzen 7 1800X(3.6GHz, 8c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)')],
    power: { base: pw(95, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 8, smt: 2, baseGHz: 3.6, boostGHz: 4.0 }], l3MB: 16, l3Note: '8MB/CCX × 2', memory: 'DDR4-2666, 2ch' },
    calib: true, calibNote: 'Zen 1 の代表(8コア、2 CCX、全コア同種)',
  });
  P.push({
    id: 'amd-zenplus-2700x', name: 'Ryzen 7 2700X', vendor: 'AMD', family: 'Zen+ (Pinnacle Ridge)', isa: 'x86', kind: 'pc', year: 2018,
    gb7: 'Zen+: Ryzen 7 2700X(3.7GHz, 8c)',
    dies: [die('Pinnacle Ridge', 211.7, 'meas', 'gf-12')],
    power: { base: pw(105, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen+', count: 8, smt: 2, baseGHz: 3.7, boostGHz: 4.3 }], l3MB: 16, memory: 'DDR4-2933, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-zen3-5800x', name: 'Ryzen 7 5800X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020,
    gb7: 'Zen 3: Ryzen 7 5800X(3.8GHz, 8c)',
    dies: [],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: null, boostGHz: 4.7 }], l3MB: 32, memory: 'DDR4-3200, 2ch' },
    calib: false, notes: '面積・TDP は設計書で未取得',
  });
  // ---- M6 第5段(2026-10-31): Zen 3 デスクトップ 2 件(C5 の上限 2 件。mobile 補正と分離する標本用。addedIn:'M5b'、calib は false) ----
  P.push({
    id: 'amd-zen3-5600x', name: 'Ryzen 5 5600X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020, addedIn: 'M5b',
    gb7: 'Zen 3: Ryzen 5 5600X(3.7GHz, 6c)',
    dies: [die('Zen 3 CCD', 80.7, 'sec', 'tsmc-n7', '[二次] SemiAccurate「A long look at AMD の Zen 3 core and chips」(2020-11-07、直接取得 2026-10-31)「Each CCD is 80.7mm^2」。8 コア CCD の 2 コアを無効化した 6 コア品(Wikipedia「Zen 3」の 5600X 分解写真は CCD 1 個)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 6, smt: 2, baseGHz: 3.7, boostGHz: 4.6 }], l3MB: 32, memory: 'DDR4-3200, 2ch' },
    calib: false, notes: '6C/12T・3.7/4.6GHz・L3 32MB・TDP 65W・CCD 1 個は [二次] Wikipedia「List of AMD Ryzen processors」(テンプレート Template:AMD Ryzen 5000 Series を原ページ直接取得、2026-10-31)。CCD 面積 80.7mm² は [二次] SemiAccurate(直接)。IOD(12nm、約 125mm²=205.7−80.7 の差し引き)は dies に入れず(Zen 4/5 のデスクトップと同じ扱い)。GB7 は検索の直近 25 件の中央値(チャート不可=Cloudflare。設計書 §2.4 の M6 第5段)。mobile(5800U)と分離して Zen 3 の ST 補正を見るための標本',
  });
  P.push({
    id: 'amd-zen3-5950x', name: 'Ryzen 9 5950X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020, addedIn: 'M5b',
    gb7: 'Zen 3: Ryzen 9 5950X(3.4GHz, 16c)',
    dies: [die('Zen 3 CCD ×2', 161.4, 'sec', 'tsmc-n7', '80.7 mm² × 2。[二次] SemiAccurate(直接取得 2026-10-31)「Each CCD is 80.7mm^2 ... 286.4mm^2 for the 2 CCD SKUs」')],
    power: { base: pw(105, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 16, smt: 2, baseGHz: 3.4, boostGHz: 4.9 }], l3MB: 64, l3Ccds: 2, l3Note: '総容量=32MB × 2 CCD。[二次] Wikipedia「List of AMD Ryzen processors」の L3 cache (total) 列(テンプレート直接取得、2026-10-31)', memory: 'DDR4-3200, 2ch' },
    calib: false, notes: '16C/32T・3.4/4.9GHz・L3 64MB・TDP 105W・CCD 2 個(2×8)は [二次] Wikipedia(テンプレート直接取得、2026-10-31)。CCD 面積は SemiAccurate(二次)。IOD は dies に入れず。GB7 は検索の直近 25 件の中央値(設計書 §2.4 の M6 第5段)。2 CCD 構成の標本(5800X・5600X は 1 CCD)',
  });
  P.push({
    id: 'amd-zen4-7700', name: 'Ryzen 7 7700', vendor: 'AMD', family: 'Zen 4 (Raphael)', isa: 'x86', kind: 'pc', year: 2023,
    gb7: 'Zen 4: Ryzen 7 7700(3.8GHz, 8c)',
    dies: [die('Zen 4 CCD', 69.5, 'meas', 'tsmc-n5'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(65, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.3 }], l3MB: 32, memory: 'DDR5-5200, 2ch' },
    calib: true, calibNote: 'Geekbench 7 の基準機(2500 = Ryzen 7 7700)。8コア 1 CCD で単純',
  });
  P.push({
    id: 'amd-zen4-7950x', name: 'Ryzen 9 7950X', vendor: 'AMD', family: 'Zen 4 (Raphael)', isa: 'x86', kind: 'pc', year: 2022,
    gb7: 'Zen 4: Ryzen 9 7950X(4.5GHz, 16c)',
    dies: [die('Zen 4 CCD ×2', 139.0, 'meas', 'tsmc-n5', '69.5 mm² × 2'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(170, 'sec', 'TDP'), peak: pw(260, 'meas', 'TweakTown'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 16, smt: 2, baseGHz: 4.5, boostGHz: 5.7 }], l3MB: 64, l3Ccds: 2, memory: 'DDR5-5200, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-zen5-9700x', name: 'Ryzen 7 9700X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 7 9700X(3.8GHz, 8c)',
    dies: [die('Zen 5 CCD', 70.2, 'meas', 'tsmc-n4'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(65, 'sec', 'TDP。105W まで設定可、PPT 88W'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.5 }], l3MB: 32, l2MBPerCore: 1, memory: 'DDR5-5600, 2ch' },
    calib: true, calibNote: 'Zen 5 の代表(8コア 1 CCD、§5.3.1 の例)',
  });
  P.push({
    id: 'amd-zen5-9950x', name: 'Ryzen 9 9950X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 9 9950X(4.3GHz, 16c)',
    dies: [die('Zen 5 CCD ×2', 140.4, 'meas', 'tsmc-n4', '70.2 mm² × 2'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(170, 'sec', 'TDP。PPT 230W'), peak: pw(286, 'meas', 'HWBusters(Blender)。他レビューは 260W/220W で幅あり'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 4.3, boostGHz: 5.7 }], l3MB: 64, l3Ccds: 2, memory: 'DDR5-5600, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-strix-hx370', name: 'Ryzen AI 9 HX 370', vendor: 'AMD', family: 'Strix Point', isa: 'x86', kind: 'mobile-pc', year: 2024,
    gb7: 'Strix Point: Ryzen AI 9 HX 370(2.0GHz, 12c)',
    errCause: { st: 'モデルの ST がチャートより高い主因は、モバイルのチャート平均が最良条件より低いこと(Notebookcheck の GB6 ラボ値からの推定 2567(チャート 2350 の 1.093 倍))で、誤差の約半分を説明する。残りは +8.3% で原因未特定。DRAM 遅延はモデルでは一定 85ns(メモリ種別は未使用)だが、実測は Chips and Cheese で HX 370 約 128ns([二次])で、これを入れても ST は約 -2.8% で足りない。残りの候補はクロックが max boost に届かない分(実効クロック 92% で説明できる)で、実クロックは未取得(Geekbench Browser は 403)。設計書 §5.3.3 J', mt: 'Zen 5c(8 個)の ST 補正を Zen 5 の u に揃えて -24.4% → -21.9%(2026-11-02)。残りは、54W 級の帯係数 0.65 に対し公開値と一致する係数が 0.869 で、標本 11 件の中で最も高い側であること(5800U 0.498・7735HS 0.639・14700HX 0.656)。原因は未特定(Zen 5 + Zen 5c の持続クロック、チャートの偏り、並列スケールの切り分けはできていない)。設計書 §5.3.3 K' },
    dies: [die('Strix Point (モノリシック)', 225.6, 'meas', 'tsmc-n4')],
    power: { base: pw(28, 'sec', 'cTDP 15〜54W'), peak: null, range: { minW: 15, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 5.1 }, { type: 'C', uarch: 'Zen 5c', count: 8, smt: 2, baseGHz: null, boostGHz: 3.3 }], l3MB: 24, memory: 'DDR5-5600 / LPDDR5X-8000' },
    calib: false,
  });
  P.push({
    id: 'amd-kraken-350', name: 'Ryzen AI 7 350', vendor: 'AMD', family: 'Kraken Point', isa: 'x86', kind: 'mobile-pc', year: 2025, addedIn: 'M5b',
    gb7: 'Kraken Point: Ryzen AI 7 350(2.0GHz, 8c)',
    dies: [die('Kraken Point (モノリシック)', null, null, 'tsmc-n4', '面積は未取得(195 mm² は出典不明の DB サイトのみのため採用しない)。プロセスは TSMC N4P([二次] Wikipedia)だが nodes.js には N4 のみのため N4 で代用')],
    power: { base: pw(28, 'sec', 'cTDP 15〜54W'), peak: null, range: { minW: 15, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 5.0 }, { type: 'C', uarch: 'Zen 5c', count: 4, smt: 2, baseGHz: null, boostGHz: 3.5 }], l3MB: 16, l3Note: '合計 16MB は [二次] Wikipedia・Notebookcheck。TechPowerUp 等は 8MB(検索要約・原ページ未確認)とし食い違う。Zen 5 側 / Zen 5c 側の内訳は未取得', memory: 'DDR5-5600 / LPDDR5X-8000' },
    calib: false,
    errCause: {
      st: '公開値(2116)は Geekbench チャートの検索要約で原ページ未確認。HX 370 比で公開値 0.90(2116/2350)・Notebookcheck 掲載の Geekbench Browser 転載 0.92(2567 は Framework 13、2784 は HX 370 のミニ PC。各 1 件で [二次])と相対値は近いが、モデルは 0.97(クロック差 0.98 と L3 差 0.99 だけ)。残りの約 5〜7% は原因未特定(チャート標本の偏りか、モデル未対応の要因か切り分けられていない)。モバイルのチャートは HX 370・Strix Halo でも +16〜18% 高く出ており、その偏りを除いても約 +9% が残る。設計書 §5.3.3 I',
      mt: '公開値(11354)は検索要約で原ページ未確認。Zen 5c の ST 補正を Zen 5 の u に揃えて -16.3% → -14.2%(2026-11-02)。残りは帯係数 0.65 に対し公開値と一致する係数 0.780。HX 370(0.869、-21.9%)と同じ向きで、原因は未特定。設計書 §5.3.3 K',
    },
    notes: 'Zen 5 ×4 + Zen 5c ×4(16 スレッド)・Zen 5 最大 5.0GHz / Zen 5c 最大 3.5GHz・ベース 2.0GHz・L2 1MB/コア・iGPU Radeon 860M 8CU 3.0GHz・NPU XDNA 2 50 TOPS・TDP 28W(cTDP 15〜54W)・FP8・2025 年は [二次] Wikipedia「Template:AMD Ryzen AI Mobile 300 series」(原ページ直接取得、2026-10-31)。Zen 5c のベースクロック・ダイ面積・トランジスタ数・L3 内訳・ピーク電力は未取得。GB7 は Geekbench チャート値(ST 2116 / MT 11354)だが検索要約のみで原ページ未確認(403)。Notebookcheck の 2567 / 14103 は 1 件のみでチャートより約 2 割高く出る傾向があるため使わない。docs/research/kraken-point.md 参照',
  });
  P.push({
    id: 'amd-strixhalo-395', name: 'Ryzen AI Max+ 395', vendor: 'AMD', family: 'Strix Halo', isa: 'x86', kind: 'mobile-pc', year: 2025,
    gb7: 'Strix Halo: Ryzen AI Max+ 395(3.0GHz, 16c)',
    errCause: { st: 'モデルの ST がチャートより高い主因は、モバイルのチャート平均が最良条件より低いこと(Notebookcheck の GB6 ラボ値からの推定 2616(チャート 2423 の 1.079 倍))で、誤差の約半分を説明する。残りは +7.1% で原因未特定。DRAM 遅延はモデルでは一定 85ns(メモリ種別は未使用)だが、実測は Chips and Cheese で Strix Halo 約 140ns〔GPU 負荷なしの基準〕([二次])で、これを入れても ST は約 -3.2% で足りない。残りの候補はクロックが max boost に届かない分(実効クロック 93% で説明できる)で、実クロックは未取得(Geekbench Browser は 403)。設計書 §5.3.3 J' },
    dies: [die('Zen 5 CCD ×2', 134.2, 'meas', 'tsmc-n4', '67.1 mm² × 2'), die('SoC/iGPU ダイ', 307.6, 'meas', 'tsmc-n4')],
    power: { base: null, peak: null, range: { minW: 45, maxW: 120 } }, // 設定範囲のみ公表(二次)。基本電力は未取得
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 3.0, boostGHz: 5.1 }], l3MB: 64, l3Ccds: 2, memory: 'LPDDR5X, 256bit' },
    calib: false,
  });

  // ---- M5b 波1 追加分(addedIn:'M5b'。calib は false。未取得は null のまま。設計書 §13) ----
  // Intel(同じダイの別 SKU は s:'sec' + note で流用を明記)
  P.push({
    id: 'intel-adl-12700k', name: 'Core i7-12700K', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2021, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i7-12700K(3.6GHz, 12c)',
    dies: [die('Alder Lake-S 8P+8E', 208.0, 'sec', 'intel-7', '12900K と同じダイを流用(E コア4個無効)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(190, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 8, smt: 2, baseGHz: 3.6, boostGHz: 4.9 }, { type: 'E', uarch: 'Gracemont', count: 4, smt: 1, baseGHz: 2.7, boostGHz: 3.8 }], l3MB: 25, memory: null },
    calib: false,
  });
  P.push({
    id: 'intel-rpl-13700k', name: 'Core i7-13700K', vendor: 'Intel', family: 'Raptor Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Raptor Lake: Core i7-13700K(3.4GHz, 16c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイを流用(E コア8個無効)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(253, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.4, boostGHz: 5.4 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.5, boostGHz: 4.2 }], l3MB: 30, memory: null },
    calib: false,
  });
  P.push({
    id: 'intel-rpl-14700k', name: 'Core i7-14700K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023, addedIn: 'M5b',
    gb7: 'Raptor Lake Refresh: Core i7-14700K(3.4GHz, 20c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイを流用(E コア4個無効)。14700K 個別の実測は未取得')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(253, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.4, boostGHz: 5.5 }, { type: 'E', uarch: 'Gracemont', count: 12, smt: 1, baseGHz: 2.5, boostGHz: 4.3 }], l3MB: 33, memory: null },
    calib: false,
  });
  P.push({
    id: 'intel-lnl-258v', name: 'Core Ultra 7 258V', vendor: 'Intel', family: 'Lunar Lake', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Lunar Lake: Core Ultra 7 258V(2.2GHz, 8c)',
    dies: [die('Compute タイル', 139.6, 'sec', 'tsmc-n3b', '268V と同じ3タイルを流用'), die('Platform Controller タイル', 45.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用'), die('Base タイル', 219.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用')],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 4.8 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 12, l3Note: '[二次] Wikipedia「Lunar Lake」(原ページ直接取得、2026-10-30)の Smart cache 12MB(P コアのみアクセス。288V〜256V の結合セル)', memory: null },
    calib: false, notes: '電力・base クロック・LP-E のクロックは未取得。L3 12MB は Wikipedia「Lunar Lake」の Smart cache 列(288V〜256V の結合セル、脚注「Only the P-cores can access this L3 cache」。直接取得、2026-10-30)。メモリサイドキャッシュ 8MB は 258V については未確認のため入れない(268V は設計書 §2.7.2 で memorySideCacheMB:8)',
  });

  // AMD
  P.push({
    id: 'amd-zenplus-2600x', name: 'Ryzen 5 2600X', vendor: 'AMD', family: 'Zen+ (Pinnacle Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Zen+: Ryzen 5 2600X(3.6GHz, 6c)',
    dies: [die('Pinnacle Ridge', 211.7, 'meas', 'gf-12', 'R5 2600 の写真計測(2700X と同じダイ)')],
    power: { base: pw(95, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen+', count: 6, smt: 2, baseGHz: 3.6, boostGHz: 4.2 }], l3MB: 16, l3Note: '総容量(2 CCX × 8MB)。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: null },
    calib: false, notes: 'L3 16MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2700X〜2600X の結合セル=16 MB、CCX 構成 2×3)。2026-10-30 に追加(それまで null=参照値 l3Ref で計算)',
  });
  P.push({
    id: 'amd-zen1-1500x', name: 'Ryzen 5 1500X', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017, addedIn: 'M5b',
    gb7: 'Zen 1: Ryzen 5 1500X(3.5GHz, 4c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 2, baseGHz: 3.5, boostGHz: 3.7 }], l3MB: 16, l3Note: '総容量(2 CCX × 8MB)。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: null },
    calib: false, notes: 'L3 16MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(1800X〜1500X の結合セル=16 MB、CCX 構成 2×2)。2026-10-30 に追加(それまで null)',
  });
  P.push({
    id: 'amd-zen4-7840hs', name: 'Ryzen 7 7840HS', vendor: 'AMD', family: 'Zen 4 (Phoenix)', isa: 'x86', kind: 'mobile-pc', year: 2023, addedIn: 'M5b',
    gb7: 'Zen 4 モバイル(Phoenix): Ryzen 7 7840HS(3.8GHz, 8c)',
    dies: [die('Phoenix 1', 176.8, 'meas', 'tsmc-n4')],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.1 }], l3MB: 16, memory: null },
    calib: false, notes: '電力は未取得',
  });
  P.push({
    id: 'amd-zen3-5800u', name: 'Ryzen 7 5800U', vendor: 'AMD', family: 'Zen 3 (Cezanne)', isa: 'x86', kind: 'mobile-pc', year: 2021, addedIn: 'M5b',
    gb7: 'Cezanne: Ryzen 7 5800U(1.9GHz, 8c)',
    errCause: { st: 'モバイルのチャート平均が最良条件より低い偏りは推定 1.123 倍だが、その根拠の GB6 は Geekbench Browser の転載 1 件(HP ProBook 455 G8)だけで弱い。残り +16.6% は原因未特定で、15W 級(cTDP 10〜25W)の ST が max boost 4.4GHz に届かない可能性が候補だが(未検証)、実クロックは未取得。NBC に GB7 の行がない。DRAM 遅延の差を入れても ST は約 -3%。設計書 §5.3.3 J', mt: '公開値と一致する係数は 0.498 で帯係数 0.65 より低いが、15W 級の標本はこの 1 件だけで、電力と係数の関係は単調ではない(28〜54W 級は 0.639〜0.869)ため帯は増やしていない。MT の +24.1% は ST の過大 +31.0% が主因:MT÷ST の比は 0.947(他の標本は 0.66〜0.94)で、ST の過大を除いた係数は 0.652 と帯係数 0.65 に一致する。チャートの MT(6368)は最良条件の推定(8880、[推定]・GB6 が転載 1 件で弱い)より 3 割低く、推定に対しモデルは -11%。NBC に GB7 の行なし。設計書 §5.3.3 L' },
    dies: [die('Cezanne', 179.6, 'meas', 'tsmc-n7')],
    power: { base: null, peak: null, range: { minW: 10, maxW: 25 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 1.9, boostGHz: 4.4 }], l3MB: 16, memory: null },
    calib: false, notes: '電力 10〜25W は [二次]。最大ブースト 4.4GHz は [公表](出典: AMD Ryzen 7 5800U 製品仕様。ユーザーがページで確認、取得日 2026-10-29。単コア最大値で全コア値ではない)。MT は全コアに最大ブースト 4.4GHz を使うため過大(全コア実クロックは電力制限で大幅に低い)。L3 16MB [二次](設計書 §2.7.3、Notebookcheck、取得日 2026-10-29)。nodeId tsmc-n7 の根拠: TSMC 7nm FinFET [二次](Notebookcheck の仕様表、取得日 2026-10-29)。設計書 §2.2・§2.7.3 に記載',
  });

  // ---- M5b 波2 追加分 9 件(addedIn:'M5b'。calib は false。設計書 §13 M5b-8 で「直接」確認できた値だけを入れ、検索要約のみの値は null) ----
  // Intel
  P.push({
    id: 'intel-adl-12600k', name: 'Core i5-12600K', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2021, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i5-12600K(3.7GHz, 10c)',
    dies: [die('Alder Lake-S 8P+8E', 208.0, 'sec', 'intel-7', '12900K と同じ 8P+8E ダイ(C0)を流用(2P+4E 無効)。流用の根拠は TechPowerUp の引用(検索要約。原ページで未確認)。Kurnal の実測 208.0mm²(Wikipedia は 215.25mm²)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(150, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 6, smt: 2, baseGHz: 3.7, boostGHz: 4.9 }, { type: 'E', uarch: 'Gracemont', count: 4, smt: 1, baseGHz: 2.8, boostGHz: 3.6 }], l3MB: 20, memory: null },
    calib: false, notes: '6P+4E は Wikipedia と Notebookcheck(10 コア 16 スレッド)',
  });
  P.push({
    id: 'intel-rpl-13600k', name: 'Core i5-13600K', vendor: 'Intel', family: 'Raptor Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Raptor Lake: Core i5-13600K(3.5GHz, 14c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じ 8P+16E ダイを流用(2P+8E 無効)。13700K・14700K に合わせた 252.3mm²。Notebookcheck と PC Games Hardware は 257mm²(23.8×10.8mm)で 4.7mm² 違う')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(181, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 6, smt: 2, baseGHz: 3.5, boostGHz: 5.1 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.6, boostGHz: 3.9 }], l3MB: 24, memory: null },
    calib: false, notes: '6P+8E(14 コア 20 スレッド)は Notebookcheck で直接確認。ダイ流用は hwcooling(検索要約)',
  });
  P.push({
    id: 'intel-ptl-x9-386h', name: 'Core Ultra 9 386H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra 9 386H(2.1GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。他のタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.1, boostGHz: 4.9 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.6, boostGHz: 3.7 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.5 }], l3MB: 18, memory: null },
    calib: false, notes: 'クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)。GPU は 4 Xe(388H は 12 Xe の Arc B390)',
  });
  P.push({
    id: 'intel-arl-275hx', name: 'Core Ultra 9 275HX', vendor: 'Intel', family: 'Arrow Lake-HX', isa: 'x86', kind: 'mobile-pc', year: 2025, addedIn: 'M5b',
    gb7: 'Arrow Lake-HX: Core Ultra 9 275HX(2.7GHz, 24c)',
    dies: [die('Compute タイル', 117.4, 'sec', 'tsmc-n3b', '285K と同じ 8P+16E のコンピュートタイルを流用(デスクトップと同じチップレットは TechPowerUp・Notebookcheck の検索要約。原ページで未確認)。他のタイルは HX 用の寸法が未取得')],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 2.7, boostGHz: 5.4 }, { type: 'E', uarch: 'Skymont', count: 16, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 36, l3Note: '[二次] Wikipedia「Arrow Lake」(原ページ直接取得、2026-10-30)の 285HX/275HX の結合セル(L3 36MB)', memory: null },
    calib: false, notes: 'E コアのクロックは未取得(Wikipedia の行の 3 つ目の値 1.9 が未ラベルで不明)。L3 36MB は Wikipedia「Arrow Lake」の表で 285HX と 275HX が結合セルを共有(直接取得、2026-10-30)。電力は未取得。P の 2.7/5.4GHz は Wikipedia「Arrow Lake」',
  });

  // AMD
  P.push({
    id: 'amd-zen1-1200', name: 'Ryzen 3 1200', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017, addedIn: 'M5b',
    gb7: 'Zen 1: Ryzen 3 1200(3.1GHz, 4c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)。1500X と同じダイ')],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 1, baseGHz: 3.1, boostGHz: 3.4 }], l3MB: 8, l3Note: '総容量。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: null },
    calib: false, notes: '4 コア(GB7 の行名 4c)・クロック 3.1/3.4GHz は Wikipedia(直接。3.4 は Wikipedia の表の値)。SMT なし(smt:1)・L3 8MB・TDP 65W は AMD サポートページの検索要約のみ(原ページで未確認。Notebookcheck も SMT なしと記載)なので、SMT なしは要原ページ確認、L3 8MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(1400〜1200 の結合セル=8 MB。検索要約の 8MB とも一致)。2026-10-30 に追加。電力は null のまま',
  });
  P.push({
    id: 'amd-raven-2400g', name: 'Ryzen 5 2400G', vendor: 'AMD', family: 'Zen 1 (Raven Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Raven Ridge: Ryzen 5 2400G(3.6GHz, 4c)',
    dies: [die('Raven Ridge', 209.78, 'pub', 'gf-14', 'WikiChip、Tom\'s Hardware ほか(設計書 §2.2)')],
    power: { base: null, peak: null, range: { minW: 46, maxW: 65 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 2, baseGHz: 3.6, boostGHz: 3.9 }], l3MB: 4, memory: null },
    calib: false, notes: '4C/8T・3.6/3.9GHz・L3 4MB は Wikipedia(直接)、cTDP 46〜65W も Wikipedia(range のみ。区分 sec)。65W は AMD ページの検索要約(原ページで未確認)のため base には入れていない。コアは Zen 1(Raven Ridge は Zen 1 コア)',
  });
  P.push({
    id: 'amd-raven-2200g', name: 'Ryzen 3 2200G', vendor: 'AMD', family: 'Zen 1 (Raven Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Raven Ridge: Ryzen 3 2200G(3.5GHz, 4c)',
    dies: [die('Raven Ridge', 209.78, 'pub', 'gf-14', '2400G と同じダイ。WikiChip、Tom\'s Hardware ほか(設計書 §2.2)')],
    power: { base: null, peak: null, range: { minW: 46, maxW: 65 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 1, baseGHz: 3.5, boostGHz: 3.7 }], l3MB: 4, l3Note: '総容量。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2400G〜2200GE の結合セル)', memory: null },
    calib: false, notes: '4C/4T・3.5/3.7GHz は Wikipedia(直接)、cTDP 46〜65W も Wikipedia(range のみ。区分 sec)。65W は検索要約(2200G は未確認)のため base には入れていない。L3 4MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2400G の 4 MB が 2400GE・2200G・2200GE に及ぶ結合セル)。2026-10-30 に追加',
  });
  // ---- M5b 波2 の条件待ち 2 件(2026-10-30。addedIn:'M5b'。calib は false) ----
  P.push({
    id: 'amd-epyc-7401', name: 'EPYC 7401', vendor: 'AMD', family: 'Zen 1 (Naples)', isa: 'x86', kind: 'server', year: 2017, addedIn: 'M5b',
    gb7: 'EPYC 7401(Zen 1 サーバー、24c)',
    dies: [die('Zeppelin 1', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)。EPYC 7001 は Zeppelin 4 個すべてが CPU を含む(1 ダイ 6 コア有効)'), die('Zeppelin 2', 213, 'pub', 'gf-14'), die('Zeppelin 3', 213, 'pub', 'gf-14'), die('Zeppelin 4', 213, 'pub', 'gf-14')],
    power: { base: null, peak: null, range: { minW: 155, maxW: 170 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 24, smt: 2, baseGHz: 2.0, boostGHz: 3.0 }], l3MB: 64, l3Note: '総容量=8MB/CCX × 8 CCX(24 コア=8 CCX×3)。Wikipedia「Epyc」(原ページ直接取得、2026-10-30)の表の L3 per CCX=8MB と CCX 数 8(8×3)から算出。同表の Total 76MB は L2(24×512KB=12MB)込み', memory: null },
    calib: false, notes: '24C/48T・2.0/3.0GHz は設計書 §2.7。電力は 155W と 170W の 2 値があり違いは不明なため range のみ(base には入れない)。GB7 は投稿 1 件のみ(区分は直近 25 件の中央値だが実質 n=1)、参考扱い。L3 64MB は [二次] Wikipedia「Epyc」の L3 per CCX 8MB × 8 CCX(表に 64MB の記載は無く算出値。Total 76MB−L2 12MB とも一致)。2026-10-30 に追加。MT は全コアに boost 3.0GHz を使うため、サーバーの実際の全コアクロック(これより低い)に対して過大になる可能性がある。kind:server の MT クロック係数は 1.0',
  });
  P.push({
    id: 'amd-zen3p-7735hs', name: 'Ryzen 7 7735HS', vendor: 'AMD', family: 'Zen 3+ (Rembrandt-R)', isa: 'x86', kind: 'mobile-pc', year: 2023, addedIn: 'M5b',
    gb7: 'Zen 4 モバイル(Rembrandt-R): Ryzen 7 7735HS(3.2GHz, 8c)',
    errCause: { st: 'モバイルのチャート平均が最良条件より低い偏り(GB6 ラボ値からの推定で 1.089 倍)で誤差の 4 割強を説明する。残り +11.6% は原因未特定。L3 16MB は入力済み(Cezanne/Rembrandt は 8 コア 1 クラスタ)。DRAM 遅延は一定 85ns で、LPDDR/DDR5 の差を仮に +25ns としても ST は約 -3%(Zen 3 系は L3 が小さくメモリ項が大きいので感度は高いが、足りない)。推定の基準は 5800X の GB6 比(DDR4 のデスクトップ)で、GB6 は Geekbench Browser の転載を含む。設計書 §5.3.3 J' },
    dies: [die('Rembrandt-R', 208.7, 'meas', 'tsmc-n6', 'Kurnal の実測 12.84×16.25mm')],
    power: { base: null, peak: null, range: { minW: 35, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 3.2, boostGHz: 4.75 }], l3MB: 16, memory: null },
    calib: false, notes: 'uarch は Zen 3 を流用(uarch.js に Zen 3+ は作らない)。根拠: Zen 3+ は Zen 3 と IPC が同一。TechSpot(Tim Schiesser、2022-02-17、直接取得)「AMD told us there are no fundamental IPC improvements with Zen 3+ compared to Zen 3 ... micro-op queues, branch predictors, execution engine, ALUs and so on, are all unchanged」[二次、AMD 回答の引用]。Wikipedia「Zen 3」の Zen 3+ 節(直接取得)も「IPC is identical to that of Zen 3」。AnandTech の記事は取得時にボット確認の画面になり本文を読めなかった(未確認)。8C/16T・3.2/4.75GHz・L3 16MB・35〜54W は Notebookcheck の検索要約(原ページ未確認)なので電力は range のみ。GB7 の行名は「Zen 4 モバイル」だが実体は Rembrandt-R(Zen 3+)。MT は全コアに最大 4.75GHz を使うため mobile-pc 係数 0.81 を掛けても過大の可能性',
  });
  // ---- Intel 第12世代以降の残り(addedIn:'M5b'。ユーザー決定 2026-10-29: 第12世代以降の Intel は C5 を適用しない。設計書 §13 M5b-4・M5b-11) ----
  // calib は false。未取得は null のまま。同じダイの別 SKU は s:'sec' + note で流用を明記(T4)。
  P.push({
    id: 'intel-rpl-14600k', name: 'Core i5-14600K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023, addedIn: 'M5b',
    gb7: 'Raptor Lake Refresh: Core i5-14600K(3.5GHz, 14c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13600K と同じ 8P+16E ダイの流用(2P+8E 無効)。13900K に合わせた 252.3mm²。Notebookcheck と PC Games Hardware は 13600K を 257mm² と記載。14600K 個別の実測は未取得')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(181, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 6, smt: 2, baseGHz: 3.5, boostGHz: 5.3 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.6, boostGHz: 4.0 }], l3MB: 24, memory: null },
    calib: false, notes: '6P+8E・クロック・L3 24MB・125/181W は Wikipedia「Raptor Lake」の表(取得日 2026-10-29)',
  });
  P.push({
    id: 'intel-rpl-14700hx', name: 'Core i7-14700HX', vendor: 'Intel', family: 'Raptor Lake-HX Refresh', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Raptor Lake(モバイル): Core i7-14700HX(2.1GHz, 20c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '14700K と同じ 8P+16E ダイの流用(E コア4個無効)。Wikipedia「Raptor Lake」の『HX はデスクトップ向けプロセッサのモバイル転用』という記述に基づく([二次・直接]。ダイ写真での照合は未了。推論(未検証): 8P+12E を持てる Raptor Lake のダイは 8P+16E ダイのみ)。14700HX 個別の実測は未取得')],
    power: { base: pw(55, 'sec', 'Wikipedia の HX 行(cTDP 45W)'), peak: pw(157, 'sec', 'MTP'), range: { minW: 45, maxW: 55 } },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 2.1, boostGHz: 5.5 }, { type: 'E', uarch: 'Gracemont', count: 12, smt: 1, baseGHz: 1.5, boostGHz: 3.9 }], l3MB: 33, memory: null },
    calib: false, notes: '8P+12E・クロック・電力は Wikipedia「Raptor Lake」の表(取得日 2026-10-29)。L3 は Wikipedia と ARK の URL が 33MB、Notebookcheck は 30MB で食い違い(設計書 §2.7.4)。33MB を採用',
  });
  P.push({
    id: 'intel-adl-12100', name: 'Core i3-12100', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i3-12100(3.3GHz, 4c)',
    dies: [die('Alder Lake-S 6P', 163, 'sec', 'intel-7', '6P の H0 ダイ(2P 無効)。H0 の根拠: hwcooling.net「12100F・12400(F) は H0=6P だけの小さいダイ」(2023-02)、VideoCardz(発売前に 12400 の C0 と H0 を確認)。面積 163mm² は TechPowerUp CPU Database の 12100 のページ(12900K は 215mm²)と The Overclock Page の記事(H0=163、C0=215)。Wikipedia は同じダイを 157.74mm²(10.19×15.47mm。Fritzchens Fritz の 12400F の写真)としており 3% 差。12100(UHD 730 つき)個体のステッピングを直接確認した一次資料は無い。hwcooling・VideoCardz・The Overclock Page は検索の抜粋で、原ページ未確認。TechPowerUp CPU Database も集約サイトの [二次]')],
    power: { base: pw(60, 'sec', 'PBP'), peak: pw(89, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 4, smt: 2, baseGHz: 3.3, boostGHz: 4.3 }], l3MB: 12, memory: null },
    calib: false, notes: '4P(8 スレッド)・クロック・L3 12MB・60/89W は Wikipedia「Alder Lake」(設計書 §2.7)。使用ダイは [二次] で確証が弱い(上の die の note)',
  });
  P.push({
    id: 'intel-lnl-256v', name: 'Core Ultra 7 256V', vendor: 'Intel', family: 'Lunar Lake', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Lunar Lake: Core Ultra 7 256V(2.2GHz, 8c)',
    dies: [die('Compute タイル', 139.6, 'sec', 'tsmc-n3b', '268V と同じ3タイルを流用'), die('Platform Controller タイル', 45.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用'), die('Base タイル', 219.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用')],
    power: { base: null, peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 4.8 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 12, l3Note: '258V と同じ(Wikipedia「Lunar Lake」の結合セル、[二次])', memory: null },
    calib: false, notes: '258V と同じ構成・最大 4.8GHz(設計書 §2.7.2)。電力・base クロック・LP-E のクロックは未取得。L3 12MB は 258V と同じ(Wikipedia「Lunar Lake」の結合セル、2026-10-30)。メモリサイドキャッシュは未確認のため入れない。メモリは 16GB(オンパッケージ LPDDR5X-8533)',
  });
  P.push({
    id: 'intel-ptl-x9-378h', name: 'Core Ultra X9 378H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra X9 378H(2.0GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。他のタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.0, boostGHz: 5.0 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.6, boostGHz: 3.8 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.6 }], l3MB: 18, memory: null },
    calib: false, notes: 'クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)。GB7 の行は外れ値あり(設計書 §2.4)',
  });
  P.push({
    id: 'intel-ptl-x7-358h', name: 'Core Ultra X7 358H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra X7 358H(1.9GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。他のタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 1.9, boostGHz: 4.8 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.5, boostGHz: 3.5 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.5, boostGHz: 3.3 }], l3MB: 18, memory: null },
    calib: false, notes: 'クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)',
  });
  // 参考値(判定外)。再現度パネルに公開値と並べて出す。値は docs/research/nbc-gb7-mobile.md・kraken-point.md のものだけ(新たな取得・推測なし)。評価・判定には使わない(設計書 §5.3.3 J-7)
  const GB7_REF = {
    'amd-strix-hx370': [
      { st: 2784, mt: 17515, device: 'Meigao F8BAC(ミニ PC。ノート PC ではない)', kind: '転載', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-9-HX-370-Processor-Benchmarks-and-Specs.836729.0.html', note: 'Notebookcheck が載せる Geekbench Browser の投稿 v7/cpu/694162 の転載(1 件)。電力設定・日付は取得不可。デスクトップでも NBC 転載はチャートより約 5% 高い選び方の偏りがある' },
      { st: 2567, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-9-HX-370-Processor-Benchmarks-and-Specs.836729.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。MT は同じコア数のデスクトップの対が無く推定なし' },
    ],
    'amd-kraken-350': [
      { st: 2567, mt: 14103, device: 'Framework Laptop 13', kind: '転載', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-7-350-Processor-Benchmarks-and-Specs.949825.0.html', note: 'Notebookcheck が載せる Geekbench Browser の投稿 v7/cpu/682130 の転載(1 件)。電力設定・日付は取得不可' },
      { st: 2547, mt: 13772, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-7-350-Processor-Benchmarks-and-Specs.949825.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。GB6 ラボ n=15' },
    ],
    'amd-strixhalo-395': [
      { st: 2698, mt: 23028, device: 'Asus ROG Flow Z13 GZ302EA', kind: '転載', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-Max-395-Processor-Benchmarks-and-Specs.942323.0.html', note: 'Geekbench Browser の投稿 v7/cpu/621559 の転載(1 件)' },
      { st: 2616, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-AI-Max-395-Processor-Benchmarks-and-Specs.942323.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。MT の推定は GB6 の出典リンクなしのため載せない' },
    ],
    'amd-zen4-7840hs': [
      { st: 2409, mt: 14749, device: 'Lenovo 82Y9', kind: '転載', source: 'https://www.notebookcheck.net/AMD-Ryzen-7-7840HS-Processor-Benchmarks-and-Specs.680876.0.html', note: 'Geekbench Browser の投稿 v7/cpu/656877 の転載(2 件のうち高い方。もう 1 件は Lenovo 82XT 2304 / 13204)' },
      { st: 2335, mt: 12932, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-7-7840HS-Processor-Benchmarks-and-Specs.680876.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。GB6 ラボ n=15' },
    ],
    'amd-zen3p-7735hs': [
      { st: 1897, mt: 9377, device: 'MSI Bravo 15 C7VE', kind: '転載', source: 'https://www.notebookcheck.net/AMD-Ryzen-7-7735HS-Processor-Benchmarks-and-Specs.681410.0.html', note: 'Geekbench Browser の投稿 v7/cpu/728639 の転載(1 件)' },
      { st: 1892, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-7-7735HS-Processor-Benchmarks-and-Specs.681410.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は 5800X の値。MT の推定は GB6 が転載のため載せない' },
    ],
    'amd-zen3-5800u': [
      { st: 1690, mt: 8880, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/AMD-Ryzen-7-5800U-Processor-Benchmarks-and-Specs.510374.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。**根拠が弱い**: 5800U の GB6 は Geekbench Browser の転載 1 件(HP ProBook 455 G8)だけ。NBC に GB7 の行は無い' },
    ],
    'intel-mtl-185h': [
      { st: 2222, mt: 14628, device: 'Geekom IT13 Max(ミニ PC。PL2 70W / PL1 40W)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-185H-Processor-Benchmarks-and-Specs.783353.0.html', note: 'Notebookcheck のレビュー(2026-08-10)の測定 [実測]。ミニ PC で、ノート PC の電力設定とは違う' },
      { st: 2187, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-185H-Processor-Benchmarks-and-Specs.783353.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は Raptor Cove(14700K)の代用で弱い' },
    ],
    'intel-rpl-14700hx': [
      { st: 2579, mt: 19414, device: 'Lenovo 83JE', kind: '転載', source: 'https://www.notebookcheck.net/Intel-Core-i7-14700HX-Processor-Benchmarks-and-Specs.790522.0.html', note: 'Geekbench Browser の投稿 v7/cpu/300855 の転載(1 件)' },
      { st: 2533, mt: 17173, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-i7-14700HX-Processor-Benchmarks-and-Specs.790522.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。GB6 ラボ n=7' },
    ],
    'intel-lnl-256v': [
      { st: 2504, mt: 11349, device: 'Acer Revo Box RB102-LNL(ミニ PC。PL2 37W / PL1 30W)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-256V-Processor-Benchmarks-and-Specs.892554.0.html', note: 'Notebookcheck のレビュー(2026-09-08)の測定 [実測]' },
      { st: 2446, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-256V-Processor-Benchmarks-and-Specs.892554.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は Arrow Lake 265K の値' },
    ],
    'intel-lnl-258v': [
      { st: 2433, mt: 10821, device: 'Lenovo ThinkPad X9-15 Aura(PL2 37W / PL1 25W)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-258V-Processor-Benchmarks-and-Specs.892883.0.html', note: 'Notebookcheck のレビュー(2025-02-25 公開。GB7 公開前のため後から測り直したとみられる)の測定 [実測]' },
      { st: 2443, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-258V-Processor-Benchmarks-and-Specs.892883.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は Arrow Lake 265K の値' },
    ],
    'intel-lnl-268v': [
      { st: 2586, mt: 11552, device: 'Dell Pro 14 Premium PA14250', kind: '転載', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-268V-Processor-Benchmarks-and-Specs.883668.0.html', note: 'Geekbench Browser の投稿 v7/cpu/642325 の転載(1 件)' },
      { st: 2523, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-7-268V-Processor-Benchmarks-and-Specs.883668.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は Arrow Lake 265K の値' },
    ],
    'intel-arl-275hx': [
      { st: 2810, mt: 24763, device: 'Lenovo Legion Pro 7i 16 Gen 10(PL2 201W / PL1 156W)', kind: '転載', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-275HX-Processor-Benchmarks-and-Specs.943094.0.html', note: '測定元が不明(リンク先は lenovo.com の製品ページ)' },
      { st: 2715, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-275HX-Processor-Benchmarks-and-Specs.943094.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。k は 265K の値' },
    ],
    'intel-ptl-x7-358h': [
      { st: 2576, mt: 17804, device: 'Minisforum M2 Pro(ミニ PC。PL2 65W / PL1 45W)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X7-358H-Processor-Benchmarks-and-Specs.1196614.0.html', note: 'Notebookcheck のレビュー(2026-09-16)の測定 [実測]' },
      { st: 2539, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X7-358H-Processor-Benchmarks-and-Specs.1196614.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。**弱い**: k は 265K の代用。チャートが直近25件の中央値で偏りがほぼ無い' },
    ],
    'intel-ptl-x9-378h': [
      { st: 2457, mt: 15980, device: 'HP OmniBook Ultra 14-kd0xxx', kind: '転載', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X9-378H-Processor-Benchmarks-and-Specs.1273309.0.html', note: 'Geekbench Browser の投稿 v7/cpu/253653 の転載(1 件)' },
      { st: 2586, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X9-378H-Processor-Benchmarks-and-Specs.1273309.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。**弱い**: k は 265K の代用、GB6 は転載 1 件' },
    ],
    'intel-ptl-x9-386h': [
      { st: 2657, mt: 18852, device: 'Asus ROG Zephyrus G16 GU606AW(PL2 70W / PL1 70W)', kind: '個別投稿', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-386H-Processor-Benchmarks-and-Specs.1196560.0.html', note: 'Notebookcheck のレビュー(2026-09-07)の測定 [実測]' },
      { st: 2564, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-9-386H-Processor-Benchmarks-and-Specs.1196560.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。**弱い**: k は 265K の代用' },
    ],
    'intel-ptl-x9-388h': [
      { st: 2668, mt: 18114, device: 'Asus Zenbook Duo UX8407AA', kind: '転載', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X9-388H-Processor-Benchmarks-and-Specs.1148259.0.html', note: 'Geekbench Browser の投稿 v7/cpu/260699 の転載(2 件のうち高い方。もう 1 件は 2598 / 17491)' },
      { st: 2682, mt: null, device: '(機種ではなく推定)', kind: '推定', source: 'https://www.notebookcheck.net/Intel-Core-Ultra-X9-388H-Processor-Benchmarks-and-Specs.1148259.0.html', note: '方法 B の推定(Notebookcheck の GB6 ラボ値 × 同じ uarch のデスクトップの GB7÷GB6 比。docs/research/nbc-gb7-mobile.md §3)。**弱い**: k は 265K の代用、GB6 ラボ n=2' },
    ],
  };
  P.forEach((p) => { if (GB7_REF[p.id]) p.gb7Ref = GB7_REF[p.id]; });
})();
