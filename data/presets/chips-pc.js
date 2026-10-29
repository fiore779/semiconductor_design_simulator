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
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: null, boostGHz: 5.6 }, { type: 'E', uarch: 'Gracemont', count: 16, smt: 1, baseGHz: null, boostGHz: 4.4 }], l3MB: 36, memory: '未取得' },
    calib: false,
  });
  P.push({
    id: 'intel-arl-285k', name: 'Core Ultra 9 285K', vendor: 'Intel', family: 'Arrow Lake-S', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Arrow Lake-S: Core Ultra 9 285K(3.7GHz, 24c)',
    dies: [die('Compute タイル', 117.4, 'meas', 'tsmc-n3b'), die('GPU タイル', 23.1, 'meas', 'tsmc-n5'), die('SoC タイル', 86.6, 'meas', 'tsmc-n6'), die('IO タイル', 24.7, 'meas', 'tsmc-n6')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(250, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 3.7, boostGHz: 5.7 }, { type: 'E', uarch: 'Skymont', count: 16, smt: 1, baseGHz: 3.2, boostGHz: 4.6 }], l3MB: 36, l2MBPerP: 3, memory: '未取得' },
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
    dies: [die('Compute タイル', 115.1, 'meas', 'intel-18a', '他のタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 5.1 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: null, boostGHz: null }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: 18, memory: 'LPDDR5X-9600 / DDR5-7200, 2ch' },
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
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 16, smt: 2, baseGHz: 4.5, boostGHz: 5.7 }], l3MB: 64, memory: 'DDR5-5200, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-zen5-9700x', name: 'Ryzen 7 9700X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 7 9700X(3.8GHz, 8c)',
    dies: [die('Zen 5 CCD', 70.2, 'meas', 'tsmc-n4'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(65, 'sec', 'TDP。105W まで設定可、PPT 88W'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.5 }], l3MB: 32, l2MBPerCore: 1, memory: 'DDR5, 2ch' },
    calib: true, calibNote: 'Zen 5 の代表(8コア 1 CCD、§5.3.1 の例)',
  });
  P.push({
    id: 'amd-zen5-9950x', name: 'Ryzen 9 9950X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 9 9950X(4.3GHz, 16c)',
    dies: [die('Zen 5 CCD ×2', 140.4, 'meas', 'tsmc-n4', '70.2 mm² × 2'), die('IOD', null, null, 'tsmc-n6', '面積は未取得')],
    power: { base: pw(170, 'sec', 'TDP。PPT 230W'), peak: pw(286, 'meas', 'HWBusters(Blender)。他レビューは 260W/220W で幅あり'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 4.3, boostGHz: 5.7 }], l3MB: 64, memory: 'DDR5, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-strix-hx370', name: 'Ryzen AI 9 HX 370', vendor: 'AMD', family: 'Strix Point', isa: 'x86', kind: 'mobile-pc', year: 2024,
    gb7: 'Strix Point: Ryzen AI 9 HX 370(2.0GHz, 12c)',
    dies: [die('Strix Point (モノリシック)', 225.6, 'meas', 'tsmc-n4')],
    power: { base: pw(28, 'sec', 'cTDP 15〜54W'), peak: null, range: { minW: 15, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 5.1 }, { type: 'C', uarch: 'Zen 5c', count: 8, smt: 2, baseGHz: null, boostGHz: 3.3 }], l3MB: 24, memory: 'DDR5-5600 / LPDDR5X-8000' },
    calib: false,
  });
  P.push({
    id: 'amd-strixhalo-395', name: 'Ryzen AI Max+ 395', vendor: 'AMD', family: 'Strix Halo', isa: 'x86', kind: 'mobile-pc', year: 2025,
    gb7: 'Strix Halo: Ryzen AI Max+ 395(3.0GHz, 16c)',
    dies: [die('Zen 5 CCD ×2', 134.2, 'meas', 'tsmc-n4', '67.1 mm² × 2'), die('SoC/iGPU ダイ', 307.6, 'meas', 'tsmc-n4')],
    power: { base: null, peak: null, range: { minW: 45, maxW: 120 } }, // 設定範囲のみ公表(二次)。基本電力は未取得
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 3.0, boostGHz: 5.1 }], l3MB: 64, memory: 'LPDDR5X, 256bit' },
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
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: null, boostGHz: 4.8 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: null, boostGHz: null }], l3MB: null, memory: null },
    calib: false, notes: '電力・base クロック・LP-E のクロックは未取得。L3 は値を入れていない: 設計書 §2.7.2 にはメモリサイドキャッシュ 8MB の記載があり(12MB は要確認)、268V は l3MB:12 + memorySideCacheMB:8 としているが、258V は L3 とメモリサイドの区別が確定できないため null のまま',
  });

  // AMD
  P.push({
    id: 'amd-zenplus-2600x', name: 'Ryzen 5 2600X', vendor: 'AMD', family: 'Zen+ (Pinnacle Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Zen+: Ryzen 5 2600X(3.6GHz, 6c)',
    dies: [die('Pinnacle Ridge', 211.7, 'meas', 'gf-12', 'R5 2600 の写真計測(2700X と同じダイ)')],
    power: { base: pw(95, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen+', count: 6, smt: 2, baseGHz: 3.6, boostGHz: 4.2 }], l3MB: null, memory: null },
    calib: false, notes: 'L3 容量は §2.7.3 に 2700X のみのため未取得(null)',
  });
  P.push({
    id: 'amd-zen1-1500x', name: 'Ryzen 5 1500X', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017, addedIn: 'M5b',
    gb7: 'Zen 1: Ryzen 5 1500X(3.5GHz, 4c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 2, baseGHz: 3.5, boostGHz: 3.7 }], l3MB: null, memory: null },
    calib: false, notes: 'L3 は 8MB/CCX だが CCX 数が未取得のため null',
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
    dies: [die('Cezanne', 179.6, 'meas', 'tsmc-n7')],
    power: { base: null, peak: null, range: { minW: 10, maxW: 25 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 1.9, boostGHz: 4.4 }], l3MB: 16, memory: null },
    calib: false, notes: '電力 10〜25W は [二次]。最大ブースト 4.4GHz は [公表](出典: AMD Ryzen 7 5800U 製品仕様。ユーザーがページで確認、取得日 2026-10-29。単コア最大値で全コア値ではない)。MT は全コアに最大ブースト 4.4GHz を使うため過大(全コア実クロックは電力制限で大幅に低い)。L3 16MB [二次](設計書 §2.7.3、Notebookcheck、取得日 2026-10-29)。nodeId tsmc-n7 の根拠: TSMC 7nm FinFET [二次](Notebookcheck の仕様表、取得日 2026-10-29)。設計書 §2.2・§2.7.3 に記載',
  });
})();
