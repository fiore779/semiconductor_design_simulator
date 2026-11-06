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
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.0, boostGHz: 5.4 }, { type: 'E', uarch: 'Gracemont', count: 16, smt: 1, baseGHz: 2.2, boostGHz: 4.3 }], l3MB: 36, memory: 'DDR5-5600, 2ch (DDR4-3200 も可)' },
    notes: 'E コアのクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): Efficient-core ベース 2.2GHz・最大ターボ 4.3GHz。ベースは旧値 2.0GHz から 2.2GHz に変更(ARK が公表する値を採用。旧 2.0GHz は出典を確認していなかった)、最大ターボ 4.3GHz は旧: 未取得。P コアのベース 3.0GHz は既存のまま。P の boost は 2026-11-06 に 5.8 → 5.4GHz に変更(ユーザー指示「P ブーストを ARK の P コア最大ターボに揃える」)。Chrome で Intel ARK の原ページを確認(2026-11-06)、[公表]: Performance-core Max Turbo 5.4GHz・Performance-core Base 3.0GHz・Turbo Boost Max 3.0 5.7GHz・Max Turbo(Thermal Velocity Boost)5.8GHz。旧値 5.8GHz は ARK の Max Turbo(Thermal Velocity Boost)の値(旧記述「Max Turbo か Turbo Boost Max 3.0 かは未確認」はこれで確定)。URL: https://www.intel.com/content/www/us/en/products/sku/230496/intel-core-i913900k-processor-36m-cache-up-to-5-80-ghz/specifications.html',
    calib: false,
  });
  P.push({
    id: 'intel-rpl-14900k', name: 'Core i9-14900K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023,
    gb7: 'Raptor Lake Refresh: Core i9-14900K(3.2GHz, 24c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイとして流用(14900K 個別の実測は未取得)')],
    power: { base: pw(125, 'pub', 'プロセッサー・ベース・パワー(PBP)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html。以前は区分 sec だったが、ARK で同じ値を確認したため pub に更新'), peak: pw(253, 'pub', '最大ターボ・パワー(Maximum Turbo Power)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html'), range: null },
    // memory の「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャネル数を読むため、2ch と書くと電力・温度が変わる。メモリ選択機能の追加では電力を変えない方針(設計書 §5.2.4)。電力の注記「メモリチャネル数が未取得」は追加前から出ており、そのまま
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.2, boostGHz: 5.6 }, { type: 'E', uarch: 'Gracemont', count: 16, smt: 1, baseGHz: 2.4, boostGHz: 4.4 }], l3MB: 36, memory: 'DDR5-5600 / DDR4-3200(Intel ARK [公表]。2 チャネル)' },
    notes: 'コアクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): P コア ベース 3.2GHz・最大ターボ 5.6GHz、E コア ベース 2.4GHz・最大ターボ 4.4GHz(Performance-core / Efficient-core の Base・Max Turbo)。URL: https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html 。P・E のベースを 2026-11-05 に追加(旧: 未取得)。Turbo Boost Max 3.0 の 5.8GHz と Thermal Velocity Boost の 6.0GHz は cfg に入れない',
    calib: false,
  });
  P.push({
    id: 'intel-arl-285k', name: 'Core Ultra 9 285K', vendor: 'Intel', family: 'Arrow Lake-S', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Arrow Lake-S: Core Ultra 9 285K(3.7GHz, 24c)',
    dies: [die('Compute タイル', 117.4, 'meas', 'tsmc-n3b'), die('GPU タイル', 23.1, 'meas', 'tsmc-n5'), die('SoC タイル', 86.6, 'meas', 'tsmc-n6'), die('IO タイル', 24.7, 'meas', 'tsmc-n6')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(250, 'sec', 'MTP'), range: null },
    // memory の「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャネル数を読むため、2ch と書くと電力・温度が変わる。メモリ選択機能の追加では電力を変えない方針(設計書 §5.2.4)。電力の注記「メモリチャネル数が未取得」は追加前から出ており、そのまま
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 3.7, boostGHz: 5.5 }, { type: 'E', uarch: 'Skymont', count: 16, smt: 1, baseGHz: 3.2, boostGHz: 4.6 }], l3MB: 36, l2MBPerP: 3, memory: 'DDR5-6400(Intel ARK [公表]。2 チャネル)' },
    notes: 'P コアの boost は 2026-11-05 に 5.7 → 5.5GHz に変更(ユーザー指示「ブーストを反映したものを使う」)。Chrome で Intel ARK の原ページを確認、[公表]: Performance-core Max Turbo 5.5GHz・Performance-core Base 3.7GHz・Efficient-core Max Turbo 4.6GHz・Efficient-core Base 3.2GHz(いずれも既存と一致。E 側は変更なし)。旧値 5.7GHz は ARK の Max Turbo / Thermal Velocity Boost の値(Turbo Boost Max 3.0 は 5.6GHz)。P boost は ARK の Performance-core Max Turbo を使う規則(2026-11-06 時点で、ARK と照合した全 Intel SKU(24 件)に適用済み。2026-11-05 は 265K・285K のみで、13900K・13700K は 2026-11-06 に 5.8→5.4・5.4→5.3 に変更)。URL: https://www.intel.com/content/www/us/en/products/sku/241060/intel-core-ultra-9-processor-285k-36m-cache-up-to-5-70-ghz/specifications.html',
    calib: false,
  });
  P.push({
    id: 'intel-arl-265k', name: 'Core Ultra 7 265K', vendor: 'Intel', family: 'Arrow Lake-S', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Arrow Lake-S: Core Ultra 7 265K(3.9GHz, 20c)',
    dies: [die('Compute タイル', 117.4, 'sec', 'tsmc-n3b', '285K と同じ Compute タイルを流用(E コア4個無効の SKU)'), die('GPU タイル', 23.1, 'sec', 'tsmc-n5'), die('SoC タイル', 86.6, 'sec', 'tsmc-n6'), die('IO タイル', 24.7, 'sec', 'tsmc-n6')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(250, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 3.9, boostGHz: 5.4 }, { type: 'E', uarch: 'Skymont', count: 12, smt: 1, baseGHz: 3.3, boostGHz: 4.6 }], l3MB: 30, l2MB: 36, memory: 'DDR5-6400, 2ch' },
    notes: 'E コアの最大ターボ 4.6GHz を 2026-11-05 に追加(旧: 未取得)。Chrome で Intel ARK の原ページを確認、[公表]: Efficient-core Max Turbo 4.6GHz・Efficient-core Base 3.3GHz(既存と一致)・Performance-core Base 3.9GHz(既存と一致)。URL: https://www.intel.com/content/www/us/en/products/sku/241063/intel-core-ultra-7-processor-265k-30m-cache-up-to-5-50-ghz/specifications.html 。P コアの boost は 2026-11-05 に 5.5 → 5.4GHz に変更(ユーザー指示「ブーストを反映したものを使う」)。Chrome で ARK 原ページを確認、[公表]: Performance-core Max Turbo 5.4GHz(旧値 5.5GHz は ARK の Max Turbo / Turbo Boost Max 3.0 の値)。P boost は ARK の Performance-core Max Turbo を使う規則(2026-11-06 時点で、ARK と照合した全 Intel SKU(24 件)に適用済み。2026-11-05 は 265K・285K のみで、13900K・13700K は 2026-11-06 に 5.8→5.4・5.4→5.3 に変更)。Lion Cove の u はこの SKU で再校正',
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
    power: { base: pw(17, 'pub', 'プロセッサー・ベース・パワー。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240958/intel-core-ultra-7-processor-268v-12m-cache-up-to-5-00-ghz/specifications.html。以前は区分 sec だったが、ARK で同じ値を確認したため pub に更新'), peak: pw(37, 'pub', '最大ターボ・パワー(Maximum Turbo Power)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240958/intel-core-ultra-7-processor-268v-12m-cache-up-to-5-00-ghz/specifications.html。範囲 8〜37W の下限 8W は ARK の最小保証パワー(Minimum Assured Power)で、cTDP(構成可能な TDP)ではない。上限 37W は最大ターボ・パワー'), range: { minW: 8, maxW: 37 } },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 5.0 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 3.7 }], l3MB: 12, memorySideCacheMB: 8, memory: 'オンパッケージ LPDDR5X-8533, 2ch' },
    notes: 'コアクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): Performance-core ベース 2.2GHz・Low Power Efficient-core ベース 2.2GHz・最大ターボ 3.7GHz(旧: すべて未取得)。P の最大ターボ 5.0GHz は既存と一致。URL: https://www.intel.com/content/www/us/en/products/sku/240958/intel-core-ultra-7-processor-268v-12m-cache-up-to-5-00-ghz/specifications.html',
    calib: false,
  });
  P.push({
    id: 'intel-ptl-x9-388h', name: 'Core Ultra X9 388H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026,
    gb7: 'Panther Lake: Core Ultra X9 388H(2.1GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'meas', 'intel-18a', 'GPU・Platform タイルは Kurnal 全体図の寸法(二次)を飾りのダイにだけ使用(評価・面積合計に含まない)。ほかのタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.1, boostGHz: 5.1 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.6, boostGHz: 3.8 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.7 }], l3MB: 18, memory: 'LPDDR5X-9600, 2ch' },
    notes: 'コアクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): P ベース 2.1GHz、E ベース 1.6GHz・最大ターボ 3.8GHz、LP-E ベース 1.6GHz・最大ターボ 3.7GHz(旧: すべて未取得)。P の最大ターボ 5.1GHz は既存と一致。URL: https://www.intel.com/content/www/us/en/products/sku/245526/(製品名の部分は未記録)',
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
    calib: false, notes: 'ブースト 4.3GHz は AMD 公式の仕様一覧(https://www.amd.com/en/products/specifications/processors.html 、Chrome の通常閲覧、2026-11-06、[公表])で確認済み(TechPowerUp の 4.35 は採らない)。値は変更なし',
  });
  P.push({
    id: 'amd-zen3-5800x', name: 'Ryzen 7 5800X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020,
    gb7: 'Zen 3: Ryzen 7 5800X(3.8GHz, 8c)',
    dies: [],
    power: { base: pw(105, 'sec', 'TDP 105W。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-5800x.c2362 。65W ではなく 105W'), peak: pw(142, 'sec', 'PPT 142W(TDP 105W の PPT)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-5800x.c2362 。PPT は公表されたソケットの電力上限で、実測ではない'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 4.7 }], l3MB: 32, memory: 'DDR4-3200, 2ch' },
    calib: false, notes: 'P コアのベース 3.8GHz は 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。旧: 未取得): https://www.techpowerup.com/cpu-specs/ryzen-7-5800x.c2362 。面積は設計書で未取得。TDP 105W・PPT 142W は 2026-11-05 に TechPowerUp(二次)で取得',
  });
  // ---- M6 第5段(2026-10-31): Zen 3 デスクトップ 2 件(C5 の上限 2 件。mobile 補正と分離する標本用。addedIn:'M5b'、calib は false) ----
  P.push({
    id: 'amd-zen3-5600x', name: 'Ryzen 5 5600X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020, addedIn: 'M5b',
    gb7: 'Zen 3: Ryzen 5 5600X(3.7GHz, 6c)',
    dies: [die('Zen 3 CCD', 80.7, 'sec', 'tsmc-n7', '[二次] SemiAccurate「A long look at AMD の Zen 3 core and chips」(2020-11-07、直接取得 2026-10-31)「Each CCD is 80.7mm^2」。8 コア CCD の 2 コアを無効化した 6 コア品(Wikipedia「Zen 3」の 5600X 分解写真は CCD 1 個)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: pw(88, 'sec', 'PPT 88W(TDP 65W の PPT)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-5-5600x.c2365 。PPT は公表されたソケットの電力上限で、実測ではない'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 6, smt: 2, baseGHz: 3.7, boostGHz: 4.6 }], l3MB: 32, memory: 'DDR4-3200, 2ch' },
    calib: false, notes: '6C/12T・3.7/4.6GHz・L3 32MB・TDP 65W・CCD 1 個は [二次] Wikipedia「List of AMD Ryzen processors」(テンプレート Template:AMD Ryzen 5000 Series を原ページ直接取得、2026-10-31)。CCD 面積 80.7mm² は [二次] SemiAccurate(直接)。IOD(12nm、約 125mm²=205.7−80.7 の差し引き)は dies に入れず(Zen 4/5 のデスクトップと同じ扱い)。GB7 は検索の直近 25 件の中央値(チャート不可=Cloudflare。設計書 §2.4 の M6 第5段)。mobile(5800U)と分離して Zen 3 の ST 補正を見るための標本',
  });
  P.push({
    id: 'amd-zen3-5950x', name: 'Ryzen 9 5950X', vendor: 'AMD', family: 'Zen 3 (Vermeer)', isa: 'x86', kind: 'pc', year: 2020, addedIn: 'M5b',
    gb7: 'Zen 3: Ryzen 9 5950X(3.4GHz, 16c)',
    dies: [die('Zen 3 CCD ×2', 161.4, 'sec', 'tsmc-n7', '80.7 mm² × 2。[二次] SemiAccurate(直接取得 2026-10-31)「Each CCD is 80.7mm^2 ... 286.4mm^2 for the 2 CCD SKUs」')],
    power: { base: pw(105, 'sec', 'TDP'), peak: pw(142, 'sec', 'PPT 142W(TDP 105W の PPT)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-9-5950x.c2364 。PPT は公表されたソケットの電力上限で、実測ではない'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 16, smt: 2, baseGHz: 3.4, boostGHz: 4.9 }], l3MB: 64, l3Ccds: 2, l3Note: '総容量=32MB × 2 CCD。[二次] Wikipedia「List of AMD Ryzen processors」の L3 cache (total) 列(テンプレート直接取得、2026-10-31)', memory: 'DDR4-3200, 2ch' },
    calib: false, notes: '16C/32T・3.4/4.9GHz・L3 64MB・TDP 105W・CCD 2 個(2×8)は [二次] Wikipedia(テンプレート直接取得、2026-10-31)。CCD 面積は SemiAccurate(二次)。IOD は dies に入れず。GB7 は検索の直近 25 件の中央値(設計書 §2.4 の M6 第5段)。2 CCD 構成の標本(5800X・5600X は 1 CCD)',
  });
  P.push({
    id: 'amd-zen4-7700', name: 'Ryzen 7 7700', vendor: 'AMD', family: 'Zen 4 (Raphael)', isa: 'x86', kind: 'pc', year: 2023,
    gb7: 'Zen 4: Ryzen 7 7700(3.8GHz, 8c)',
    dies: [die('Zen 4 CCD', 69.5, 'meas', 'tsmc-n5'), die('IOD', 117.8, 'sec', 'tsmc-n6', 'AMD ISSCC 2023 の発表を Tom\'s Hardware が表にした値 117.8mm²(2026-11-05 に原ページを確認、[二次]): https://www.tomshardware.com/news/amd-shares-new-second-gen-3d-v-cache-chiplet-details-up-to-25-tbs 。TechPowerUp は 122mm²(CPU データベースの I/O Die Size と 2024-07 のニュース https://www.techpowerup.com/324562/amd-granite-ridge-and-strix-point-zen-5-die-sizes-and-transistor-counts-confirmed )、124.7mm²(2022-08 のニュース https://www.techpowerup.com/298338/ )と食い違い、未解決(この値は Tom\'s Hardware の表に従った)。Granite Ridge の IOD は Raphael の 6nm cIOD の流用(TechPowerUp 324562 に明記)。IOD の縦横比 1.30 は floorplan.js の IOD_PLACE のまま(面積だけ入れた)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: pw(88, 'sec', 'PPT 88W(TDP 65W の PPT)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-7700.c2960 。PPT は公表されたソケットの電力上限で、実測ではない'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.3 }], l3MB: 32, memory: 'DDR5-5200, 2ch' },
    calib: true, calibNote: 'Geekbench 7 の基準機(2500 = Ryzen 7 7700)。8コア 1 CCD で単純',
  });
  P.push({
    id: 'amd-zen4-7950x', name: 'Ryzen 9 7950X', vendor: 'AMD', family: 'Zen 4 (Raphael)', isa: 'x86', kind: 'pc', year: 2022,
    gb7: 'Zen 4: Ryzen 9 7950X(4.5GHz, 16c)',
    dies: [die('Zen 4 CCD ×2', 139.0, 'meas', 'tsmc-n5', '69.5 mm² × 2'), die('IOD', 117.8, 'sec', 'tsmc-n6', 'AMD ISSCC 2023 の発表を Tom\'s Hardware が表にした値 117.8mm²(2026-11-05 に原ページを確認、[二次]): https://www.tomshardware.com/news/amd-shares-new-second-gen-3d-v-cache-chiplet-details-up-to-25-tbs 。TechPowerUp は 122mm²(CPU データベースの I/O Die Size と 2024-07 のニュース https://www.techpowerup.com/324562/amd-granite-ridge-and-strix-point-zen-5-die-sizes-and-transistor-counts-confirmed )、124.7mm²(2022-08 のニュース https://www.techpowerup.com/298338/ )と食い違い、未解決(この値は Tom\'s Hardware の表に従った)。Granite Ridge の IOD は Raphael の 6nm cIOD の流用(TechPowerUp 324562 に明記)。IOD の縦横比 1.30 は floorplan.js の IOD_PLACE のまま(面積だけ入れた)')],
    power: { base: pw(170, 'sec', 'TDP'), peak: pw(260, 'meas', 'TweakTown'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 16, smt: 2, baseGHz: 4.5, boostGHz: 5.7 }], l3MB: 64, l3Ccds: 2, memory: 'DDR5-5200, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-zen5-9700x', name: 'Ryzen 7 9700X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 7 9700X(3.8GHz, 8c)',
    dies: [die('Zen 5 CCD', 70.2, 'meas', 'tsmc-n4'), die('IOD', 117.8, 'sec', 'tsmc-n6', 'AMD ISSCC 2023 の発表を Tom\'s Hardware が表にした値 117.8mm²(2026-11-05 に原ページを確認、[二次]): https://www.tomshardware.com/news/amd-shares-new-second-gen-3d-v-cache-chiplet-details-up-to-25-tbs 。TechPowerUp は 122mm²(CPU データベースの I/O Die Size と 2024-07 のニュース https://www.techpowerup.com/324562/amd-granite-ridge-and-strix-point-zen-5-die-sizes-and-transistor-counts-confirmed )、124.7mm²(2022-08 のニュース https://www.techpowerup.com/298338/ )と食い違い、未解決(この値は Tom\'s Hardware の表に従った)。Granite Ridge の IOD は Raphael の 6nm cIOD の流用(TechPowerUp 324562 に明記)。IOD の縦横比 1.30 は floorplan.js の IOD_PLACE のまま(面積だけ入れた)')],
    power: { base: pw(65, 'sec', 'TDP。105W まで設定可、PPT 88W'), peak: pw(88, 'sec', 'PPT 88W(TDP 65W の PPT)。拡張 cTDP 105W にすると PPT は 142W。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-9700x.c3651 。PPT は公表されたソケットの電力上限で、実測ではない'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.5 }], l3MB: 32, l2MBPerCore: 1, memory: 'DDR5-5600, 2ch' },
    calib: true, calibNote: 'Zen 5 の代表(8コア 1 CCD、§5.3.1 の例)',
  });
  P.push({
    id: 'amd-zen5-9950x', name: 'Ryzen 9 9950X', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', isa: 'x86', kind: 'pc', year: 2024,
    gb7: 'Zen 5: Ryzen 9 9950X(4.3GHz, 16c)',
    dies: [die('Zen 5 CCD ×2', 140.4, 'meas', 'tsmc-n4', '70.2 mm² × 2'), die('IOD', 117.8, 'sec', 'tsmc-n6', 'AMD ISSCC 2023 の発表を Tom\'s Hardware が表にした値 117.8mm²(2026-11-05 に原ページを確認、[二次]): https://www.tomshardware.com/news/amd-shares-new-second-gen-3d-v-cache-chiplet-details-up-to-25-tbs 。TechPowerUp は 122mm²(CPU データベースの I/O Die Size と 2024-07 のニュース https://www.techpowerup.com/324562/amd-granite-ridge-and-strix-point-zen-5-die-sizes-and-transistor-counts-confirmed )、124.7mm²(2022-08 のニュース https://www.techpowerup.com/298338/ )と食い違い、未解決(この値は Tom\'s Hardware の表に従った)。Granite Ridge の IOD は Raphael の 6nm cIOD の流用(TechPowerUp 324562 に明記)。IOD の縦横比 1.30 は floorplan.js の IOD_PLACE のまま(面積だけ入れた)')],
    power: { base: pw(170, 'sec', 'TDP。PPT 230W'), peak: pw(286, 'meas', 'HWBusters(Blender)。他レビューは 260W/220W で幅あり'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 4.3, boostGHz: 5.7 }], l3MB: 64, l3Ccds: 2, memory: 'DDR5-5600, 2ch' },
    calib: false,
  });
  P.push({
    id: 'amd-strix-hx370', name: 'Ryzen AI 9 HX 370', vendor: 'AMD', family: 'Strix Point', isa: 'x86', kind: 'mobile-pc', year: 2024,
    gb7: 'Strix Point: Ryzen AI 9 HX 370(2.0GHz, 12c)',
    errCause: { st: 'モデルの ST がチャートより高い主因は、モバイルのチャート平均が最良条件より低いこと(Notebookcheck の GB6 ラボ値からの推定 2567(チャート 2350 の 1.093 倍))で、誤差の約半分を説明する。残りは +8.3% で原因未特定。DRAM 遅延はモデルでは一定 85ns(メモリ種別は未使用)だが、実測は Chips and Cheese で HX 370 約 128ns([二次])で、これを入れても ST は約 -2.8% で足りない。残りの候補はクロックが max boost に届かない分(実効クロック 92% で説明できる)で、実クロックは未取得(Geekbench Browser は 403)。設計書 §5.3.3 J', mt: 'Zen 5c(8 個)の ST 補正を Zen 5 の u に揃えて -24.4% → -21.9%(2026-11-02)、帯 0 の再校正(0.65 → 0.69、2026-11-05)で -21.9% → -17.7%(改善)。ユーザー申告(2026-11-05)で Zen 5c のブーストを 3.3 → 3.4GHz に更新して -17.7% → -16.5% にしたが、AMD 公式(2026-11-06)が 3.3GHz だったため公式優先で 3.4 → 3.3GHz に戻し、-16.5% → -17.7%。残りは、54W 級の帯係数 0.69 に対し公開値と一致する係数が 0.869(申告の 3.4GHz のときは 0.854)で、標本 11 件の中で最も高い側であること(5800U 0.498・7735HS 0.639・14700HX 0.654)。原因は未特定(Zen 5 + Zen 5c の持続クロック、チャートの偏り、並列スケールの切り分けはできていない)。設計書 §5.3.3 K' },
    dies: [die('Strix Point (モノリシック)', 225.6, 'meas', 'tsmc-n4')],
    power: { base: pw(28, 'sec', 'cTDP 15〜54W'), peak: null, range: { minW: 15, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 5.1 }, { type: 'C', uarch: 'Zen 5c', count: 8, smt: 2, baseGHz: 2.0, boostGHz: 3.3 }], l3MB: 24, memory: 'DDR5-5600 / LPDDR5X-8000' },
    notes: 'クロック等は AMD 公式ページ(amd.com。Chrome の通常閲覧で原ページを確認、2026-11-06、[公表])を正とする: Zen 5 ベース 2.0GHz・最大 5.1GHz、Zen 5c ベース 2.0GHz・最大 3.3GHz、L2 12MB、L3 24MB、既定 TDP 28W、cTDP 15〜54W、TSMC 4nm。URL: https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-9-hx-370.html 。Zen 5c の boost はユーザー申告(2026-11-05)が 3.4GHz だったが、公式は 3.3GHz で食い違うため、公式優先で 3.4 → 3.3GHz に訂正した(2026-11-06。ベース 2.0GHz は公式と一致で変更なし)。旧記述「ユーザー申告を優先」は公式優先に改めた。TechPowerUp の Zen 5c「ベース 1.4GHz / 最大 3.3GHz」のうちベース 1.4GHz は公式(2.0GHz)と合わず誤りと考えられる',
    calib: false,
  });
  P.push({
    id: 'amd-kraken-350', name: 'Ryzen AI 7 350', vendor: 'AMD', family: 'Kraken Point', isa: 'x86', kind: 'mobile-pc', year: 2025, addedIn: 'M5b',
    gb7: 'Kraken Point: Ryzen AI 7 350(2.0GHz, 8c)',
    dies: [die('Kraken Point (モノリシック)', null, null, 'tsmc-n4', '面積は未取得(195 mm² は出典不明の DB サイトのみのため採用しない)。プロセスは TSMC N4P([二次] Wikipedia)だが nodes.js には N4 のみのため N4 で代用')],
    power: { base: pw(28, 'sec', 'cTDP 15〜54W'), peak: null, range: { minW: 15, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 5.0 }, { type: 'C', uarch: 'Zen 5c', count: 4, smt: 2, baseGHz: 2.0, boostGHz: 3.5 }], l3MB: 16, l3Note: '合計 16MB は AMD 公式ページで確認(2026-11-06、[公表]。https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-7-350.html )。TechPowerUp の 8MB は誤り。Zen 5 側 / Zen 5c 側の内訳は未取得', memory: 'DDR5-5600 / LPDDR5X-8000' },
    calib: false,
    errCause: {
      st: '公開値(2116)は Geekbench チャートの検索要約で原ページ未確認。HX 370 比で公開値 0.90(2116/2350)・Notebookcheck 掲載の Geekbench Browser 転載 0.92(2567 は Framework 13、2784 は HX 370 のミニ PC。各 1 件で [二次])と相対値は近いが、モデルは 0.97(クロック差 0.98 と L3 差 0.99 だけ)。残りの約 5〜7% は原因未特定(チャート標本の偏りか、モデル未対応の要因か切り分けられていない)。モバイルのチャートは HX 370・Strix Halo でも +16〜18% 高く出ており、その偏りを除いても約 +9% が残る。設計書 §5.3.3 I',
      mt: '公開値(11354)は検索要約で原ページ未確認。Zen 5c の ST 補正を Zen 5 の u に揃えて -16.3% → -14.2%(2026-11-02)、帯 0 の再校正(0.65 → 0.69、2026-11-05)で -9.8%(判定 ng → ok)。残りは帯係数 0.69 に対し公開値と一致する係数 0.780。HX 370(0.869、-17.7%)と同じ向きで、原因は未特定。設計書 §5.3.3 K',
    },
    notes: 'Zen 5 ×4 + Zen 5c ×4(16 スレッド)・Zen 5 最大 5.0GHz / Zen 5c 最大 3.5GHz・ベース 2.0GHz・L2 1MB/コア・iGPU Radeon 860M 8CU 3.0GHz・NPU XDNA 2 50 TOPS・TDP 28W(cTDP 15〜54W)・FP8・2025 年は [二次] Wikipedia「Template:AMD Ryzen AI Mobile 300 series」(原ページ直接取得、2026-10-31)。Zen 5c のベースクロック 2.0GHz は 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。旧: 未取得): https://www.techpowerup.com/cpu-specs/ryzen-ai-7-350.c4004 。ダイ面積・トランジスタ数・L3 内訳・ピーク電力は未取得。GB7 は Geekbench チャート値(ST 2116 / MT 11354)だが検索要約のみで原ページ未確認(403)。Notebookcheck の 2567 / 14103 は 1 件のみでチャートより約 2 割高く出る傾向があるため使わない。docs/research/kraken-point.md 参照',
  });
  P.push({
    id: 'amd-strixhalo-395', name: 'Ryzen AI Max+ 395', vendor: 'AMD', family: 'Strix Halo', isa: 'x86', kind: 'mobile-pc', year: 2025,
    gb7: 'Strix Halo: Ryzen AI Max+ 395(3.0GHz, 16c)',
    errCause: { st: 'モデルの ST がチャートより高い主因は、モバイルのチャート平均が最良条件より低いこと(Notebookcheck の GB6 ラボ値からの推定 2616(チャート 2423 の 1.079 倍))で、誤差の約半分を説明する。残りは +7.1% で原因未特定。DRAM 遅延はモデルでは一定 85ns(メモリ種別は未使用)だが、実測は Chips and Cheese で Strix Halo 約 140ns〔GPU 負荷なしの基準〕([二次])で、これを入れても ST は約 -3.2% で足りない。残りの候補はクロックが max boost に届かない分(実効クロック 93% で説明できる)で、実クロックは未取得(Geekbench Browser は 403)。設計書 §5.3.3 J' },
    dies: [die('Zen 5 CCD ×2', 134.2, 'meas', 'tsmc-n4', '67.1 mm² × 2'), die('SoC/iGPU ダイ', 307.6, 'meas', 'tsmc-n4')],
    power: { base: pw(55, 'sec', 'TDP 55W(設定範囲 45〜120W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-ai-max-395.c3994 。2026-11-05 時点は amd.com を使わない方針のため TechPowerUp を根拠とした(amd.com 由来の検索要約も 55W)。その後 amd.com は Chrome の通常閲覧なら取得できると分かり(2026-11-06)、公式ページで照合した(docs/research/amd-official-audit-2026-11-06.md)'), peak: null, range: { minW: 45, maxW: 120 } }, // 設定範囲 45〜120W は従来の二次。基本電力 55W は 2026-11-05 に TechPowerUp で取得
    cfg: { cores: [{ type: 'P', uarch: 'Zen 5', count: 16, smt: 2, baseGHz: 3.0, boostGHz: 5.1 }], l3MB: 64, l3Ccds: 2, memory: 'LPDDR5X-8000, 256bit' },
    calib: false,
    notes: 'メモリ LPDDR5X-8000・256bit(最大 128GB)は AMD 公式ページ(2026-11-06、Chrome の通常閲覧、[公表])。URL: https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html 。旧: 速度が抜けた \'LPDDR5X, 256bit\'(2026-11-06 に追加)。「ch」表記は入れない: 電力モデルが「数字+ch」の表記でチャネル数を読むため',
  });

  // ---- M5b 波1 追加分(addedIn:'M5b'。calib は false。未取得は null のまま。設計書 §13) ----
  // Intel(同じダイの別 SKU は s:'sec' + note で流用を明記)
  P.push({
    id: 'intel-adl-12700k', name: 'Core i7-12700K', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2021, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i7-12700K(3.6GHz, 12c)',
    dies: [die('Alder Lake-S 8P+8E', 208.0, 'sec', 'intel-7', '12900K と同じダイを流用(E コア4個無効)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(190, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 8, smt: 2, baseGHz: 3.6, boostGHz: 4.9 }, { type: 'E', uarch: 'Gracemont', count: 4, smt: 1, baseGHz: 2.7, boostGHz: 3.8 }], l3MB: 25, memory: 'DDR5-4800 / DDR4-3200, 最大 128GB(Intel ARK [公表]。2 チャネル)' },
    notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-4800 / DDR4-3200、最大 128GB、2 チャネル。「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる',
    calib: false,
  });
  P.push({
    id: 'intel-rpl-13700k', name: 'Core i7-13700K', vendor: 'Intel', family: 'Raptor Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Raptor Lake: Core i7-13700K(3.4GHz, 16c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイを流用(E コア8個無効)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(253, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.4, boostGHz: 5.3 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.5, boostGHz: 4.2 }], l3MB: 30, memory: 'DDR5-5600 / DDR4-3200, 最大 192GB(Intel ARK [公表]。2 チャネル)' },
    notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-5600 / DDR4-3200、最大 192GB、2 チャネル。「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。P boost は 2026-11-06 に 5.4→5.3(ユーザー指示)。ARK 原ページ確認 [公表](Chrome、2026-11-06): Performance-core Max Turbo 5.3・Performance-core Base 3.4・Max Turbo(=Turbo Boost Max 3.0)5.4。旧値 5.4 は Max Turbo の値。URL https://www.intel.com/content/www/us/en/products/sku/230500/intel-core-i713700k-processor-30m-cache-up-to-5-40-ghz/specifications.html',
    calib: false,
  });
  P.push({
    id: 'intel-rpl-14700k', name: 'Core i7-14700K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023, addedIn: 'M5b',
    gb7: 'Raptor Lake Refresh: Core i7-14700K(3.4GHz, 20c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じダイを流用(E コア4個無効)。14700K 個別の実測は未取得')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(253, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 3.4, boostGHz: 5.5 }, { type: 'E', uarch: 'Gracemont', count: 12, smt: 1, baseGHz: 2.5, boostGHz: 4.3 }], l3MB: 33, memory: 'DDR5-5600 / DDR4-3200, 最大 192GB(Intel ARK [公表]。2 チャネル)' },
    notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-5600 / DDR4-3200、最大 192GB、2 チャネル。「2 チャネル」は意図的: 電力モデル(js/sim/power.js の memChannels)が「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる',
    calib: false,
  });
  P.push({
    id: 'intel-lnl-258v', name: 'Core Ultra 7 258V', vendor: 'Intel', family: 'Lunar Lake', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Lunar Lake: Core Ultra 7 258V(2.2GHz, 8c)',
    dies: [die('Compute タイル', 139.6, 'sec', 'tsmc-n3b', '268V と同じ3タイルを流用'), die('Platform Controller タイル', 45.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用'), die('Base タイル', 219.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用')],
    power: { base: pw(17, 'pub', 'プロセッサー・ベース・パワー。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html'), peak: pw(37, 'pub', '最大ターボ・パワー(Maximum Turbo Power)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html。範囲 8〜37W の下限 8W は ARK の最小保証パワー(Minimum Assured Power)で、cTDP(構成可能な TDP)ではない。上限 37W は最大ターボ・パワー'), range: { minW: 8, maxW: 37 } },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 4.8 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 3.7 }], l3MB: 12, l3Note: '[二次] Wikipedia「Lunar Lake」(原ページ直接取得、2026-10-30)の Smart cache 12MB(P コアのみアクセス。288V〜256V の結合セル)', memory: 'LPDDR5X-8533, 最大 32GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'コアクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): P ベース 2.2GHz・LP-E ベース 2.2GHz・最大ターボ 3.7GHz(旧: 未取得)。P の最大ターボ 4.8GHz は既存と一致。URL: https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html 。メモリ(同 ARK): LPDDR5X-8533、最大 32GB、2 チャネル(「オンパッケージ」は ARK の記述ではないので書かない。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。電力は 2026-11-05 に Intel ARK の原ページで取得し、power に入れた。L3 12MB は Wikipedia「Lunar Lake」の Smart cache 列(288V〜256V の結合セル、脚注「Only the P-cores can access this L3 cache」。直接取得、2026-10-30)。メモリサイドキャッシュ 8MB は 258V については未確認のため入れない(268V は設計書 §2.7.2 で memorySideCacheMB:8)',
  });

  // AMD
  P.push({
    id: 'amd-zenplus-2600x', name: 'Ryzen 5 2600X', vendor: 'AMD', family: 'Zen+ (Pinnacle Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Zen+: Ryzen 5 2600X(3.6GHz, 6c)',
    dies: [die('Pinnacle Ridge', 211.7, 'meas', 'gf-12', 'R5 2600 の写真計測(2700X と同じダイ)')],
    power: { base: pw(95, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen+', count: 6, smt: 2, baseGHz: 3.6, boostGHz: 4.2 }], l3MB: 16, l3Note: '総容量(2 CCX × 8MB)。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: 'DDR4-2933(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2933・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。URL の slug は記録が無く未記録)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。L3 16MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2700X〜2600X の結合セル=16 MB、CCX 構成 2×3)。2026-10-30 に追加(それまで null=参照値 l3Ref で計算)。ブースト 4.2GHz は AMD 公式の仕様一覧(https://www.amd.com/en/products/specifications/processors.html 、Chrome の通常閲覧、2026-11-06、[公表])で確認済み(TechPowerUp の 4.25 は採らない)。値は変更なし',
  });
  P.push({
    id: 'amd-zen1-1500x', name: 'Ryzen 5 1500X', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017, addedIn: 'M5b',
    gb7: 'Zen 1: Ryzen 5 1500X(3.5GHz, 4c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)')],
    power: { base: pw(65, 'sec', 'TDP'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 2, baseGHz: 3.5, boostGHz: 3.7 }], l3MB: 16, l3Note: '総容量(2 CCX × 8MB)。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: 'DDR4-2666(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2666・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。URL の slug は記録が無く未記録)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。L3 16MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(1800X〜1500X の結合セル=16 MB、CCX 構成 2×2)。2026-10-30 に追加(それまで null)',
  });
  P.push({
    id: 'amd-zen4-7840hs', name: 'Ryzen 7 7840HS', vendor: 'AMD', family: 'Zen 4 (Phoenix)', isa: 'x86', kind: 'mobile-pc', year: 2023, addedIn: 'M5b',
    gb7: 'Zen 4 モバイル(Phoenix): Ryzen 7 7840HS(3.8GHz, 8c)',
    dies: [die('Phoenix 1', 176.8, 'meas', 'tsmc-n4')],
    power: { base: pw(35, 'sec', 'TDP 35W(cTDP 35〜54W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-7840hs.c3033'), peak: null, range: { minW: 35, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 4', count: 8, smt: 2, baseGHz: 3.8, boostGHz: 5.1 }], l3MB: 16, memory: 'DDR5-5600 / LPDDR5X-7500(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR5-5600 / LPDDR5X-7500・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-7-7840hs.c3033)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。電力(TDP 35W・cTDP 35〜54W)は 2026-11-05 に TechPowerUp(二次)の原ページで取得。ピーク電力は未取得。AMD 公式(2026-11-06、[公表]。https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7840hs.html )は Default TDP を範囲「35〜54W」と表記し、単一の既定値を決めていない。power.base の 35W は範囲の下端を採用(公表の範囲の下端。値は変更なし)',
  });
  P.push({
    id: 'amd-zen3-5800u', name: 'Ryzen 7 5800U', vendor: 'AMD', family: 'Zen 3 (Cezanne)', isa: 'x86', kind: 'mobile-pc', year: 2021, addedIn: 'M5b',
    gb7: 'Cezanne: Ryzen 7 5800U(1.9GHz, 8c)',
    errCause: { st: 'モバイルのチャート平均が最良条件より低い偏りは推定 1.123 倍だが、その根拠の GB6 は Geekbench Browser の転載 1 件(HP ProBook 455 G8)だけで弱い。残り +16.6% は原因未特定で、15W 級(cTDP 10〜25W)の ST が max boost 4.4GHz に届かない可能性が候補だが(未検証)、実クロックは未取得。NBC に GB7 の行がない。DRAM 遅延の差を入れても ST は約 -3%。設計書 §5.3.3 J', mt: '公開値と一致する係数は 0.498 で帯係数 0.69(2026-11-05 に 0.65 から再校正。MT 誤差は +24.1% → +30.1% に悪化)より低いが、15W 級の標本はこの 1 件だけで、電力と係数の関係は単調ではない(28〜54W 級は 0.639〜0.869)ため帯は増やしていない。MT の +30.1%(再校正後。2026-11-02 時点は帯 0.65 で +24.1%)は ST の過大 +31.0% が主因:MT÷ST の比は 0.993(帯 0 の他の標本は HX370 0.695・Kraken 0.709・7735HS 0.873・14700HX 0.889)で、ST の過大を除いた係数は 0.652 と、2026-11-02 時点の帯係数 0.65 には一致していたが、再校正後の 0.69 とは一致しない(ST の過大でほぼ全量説明できる)。チャートの MT(6368)は最良条件の推定(8880、[推定]・GB6 が転載 1 件で弱い)より 3 割低く、推定に対しモデルは -6.7%(8285/8880。2026-11-02 時点は -11%)。NBC に GB7 の行なし。設計書 §5.3.3 L' },
    dies: [die('Cezanne', 179.6, 'meas', 'tsmc-n7')],
    power: { base: pw(15, 'sec', 'TDP 15W(cTDP 10〜25W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-5800u.c2746'), peak: null, range: { minW: 10, maxW: 25 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 1.9, boostGHz: 4.4 }], l3MB: 16, memory: 'DDR4-3200 / LPDDR4-4266(AMD 公式 [公表]。2 チャネル)' },
    calib: false, notes: 'メモリは AMD 公式(amd.com の仕様一覧 https://www.amd.com/en/products/specifications/processors.html 、Chrome の通常閲覧、2026-11-06、[公表]。5800U の製品ページは 404)で DDR4 は最大 3200・LPDDR4 は最大 4266。旧表記 LPDDR4X-4267(TechPowerUp)から公式の LPDDR4-4266 に変更(2026-11-06)。cTDP は公式も 15W 既定・10〜25W で、下限 10W は公式でも 10W(TechPowerUp は「25W」だけだったが、公式で 10〜25W を確認、[公表])。以下は 2026-11-05 時点の記録: メモリ DDR4-3200 / LPDDR4X-4267・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-7-5800u.c2746)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。電力 10〜25W は [二次]、TDP 15W は 2026-11-05 に TechPowerUp(二次)の原ページで確認。最大ブースト 4.4GHz は [公表](出典: AMD Ryzen 7 5800U 製品仕様。ユーザーがページで確認、取得日 2026-10-29。単コア最大値で全コア値ではない)。MT は全コアに最大ブースト 4.4GHz を使うため過大(全コア実クロックは電力制限で大幅に低い)。L3 16MB [二次](設計書 §2.7.3、Notebookcheck、取得日 2026-10-29)。nodeId tsmc-n7 の根拠: TSMC 7nm FinFET [二次](Notebookcheck の仕様表、取得日 2026-10-29)。設計書 §2.2・§2.7.3 に記載',
  });

  // ---- M5b 波2 追加分 9 件(addedIn:'M5b'。calib は false。設計書 §13 M5b-8 で「直接」確認できた値だけを入れ、検索要約のみの値は null) ----
  // Intel
  P.push({
    id: 'intel-adl-12600k', name: 'Core i5-12600K', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2021, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i5-12600K(3.7GHz, 10c)',
    dies: [die('Alder Lake-S 8P+8E', 208.0, 'sec', 'intel-7', '12900K と同じ 8P+8E ダイ(C0)を流用(2P+4E 無効)。流用の根拠は TechPowerUp の引用(検索要約。原ページで未確認)。Kurnal の実測 208.0mm²(Wikipedia は 215.25mm²)')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(150, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 6, smt: 2, baseGHz: 3.7, boostGHz: 4.9 }, { type: 'E', uarch: 'Gracemont', count: 4, smt: 1, baseGHz: 2.8, boostGHz: 3.6 }], l3MB: 20, memory: 'DDR5-4800 / DDR4-3200, 最大 128GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-4800 / DDR4-3200、最大 128GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。6P+4E は Wikipedia と Notebookcheck(10 コア 16 スレッド)',
  });
  P.push({
    id: 'intel-rpl-13600k', name: 'Core i5-13600K', vendor: 'Intel', family: 'Raptor Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Raptor Lake: Core i5-13600K(3.5GHz, 14c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13900K と同じ 8P+16E ダイを流用(2P+8E 無効)。13700K・14700K に合わせた 252.3mm²。Notebookcheck と PC Games Hardware は 257mm²(23.8×10.8mm)で 4.7mm² 違う')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(181, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 6, smt: 2, baseGHz: 3.5, boostGHz: 5.1 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.6, boostGHz: 3.9 }], l3MB: 24, memory: 'DDR5-5600 / DDR4-3200, 最大 192GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-5600 / DDR4-3200、最大 192GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。6P+8E(14 コア 20 スレッド)は Notebookcheck で直接確認。ダイ流用は hwcooling(検索要約)',
  });
  P.push({
    id: 'intel-ptl-x9-386h', name: 'Core Ultra 9 386H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra 9 386H(2.1GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。GPU・Platform タイルは Kurnal 全体図の寸法(二次)を飾りのダイにだけ使用(評価・面積合計に含まない)。ほかのタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.1, boostGHz: 4.9 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.6, boostGHz: 3.7 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.5 }], l3MB: 18, memory: 'LPDDR5X-9600 / DDR5-7200, 最大 128GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): LPDDR5X-9600 / DDR5-7200、最大 128GB、2 チャネル。「2 チャネル」は意図的(電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)。GPU は 4 Xe(388H は 12 Xe の Arc B390)',
  });
  P.push({
    id: 'intel-arl-275hx', name: 'Core Ultra 9 275HX', vendor: 'Intel', family: 'Arrow Lake-HX', isa: 'x86', kind: 'mobile-pc', year: 2025, addedIn: 'M5b',
    gb7: 'Arrow Lake-HX: Core Ultra 9 275HX(2.7GHz, 24c)',
    dies: [die('Compute タイル', 117.4, 'sec', 'tsmc-n3b', '285K と同じ 8P+16E のコンピュートタイルを流用(デスクトップと同じチップレットは TechPowerUp・Notebookcheck の検索要約。原ページで未確認)。他のタイルは HX 用の寸法が未取得')],
    power: { base: pw(55, 'pub', 'プロセッサー・ベース・パワー。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/242293/intel-core-ultra-9-processor-275hx-36m-cache-up-to-5-40-ghz/specifications.html'), peak: pw(160, 'pub', '最大ターボ・パワー(Maximum Turbo Power)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/242293/intel-core-ultra-9-processor-275hx-36m-cache-up-to-5-40-ghz/specifications.html。範囲 45〜160W の下限 45W は ARK の最小保証パワー(Minimum Assured Power)で、cTDP(構成可能な TDP)ではない。上限 160W は最大ターボ・パワー。OEM 機の実際の設定(Legion Pro 7i は PL2 201W / PL1 156W など)は Intel の値ではない'), range: { minW: 45, maxW: 160 } },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 8, smt: 1, baseGHz: 2.7, boostGHz: 5.4 }, { type: 'E', uarch: 'Skymont', count: 16, smt: 1, baseGHz: 2.1, boostGHz: 4.6 }], l3MB: 36, l3Note: '[二次] Wikipedia「Arrow Lake」(原ページ直接取得、2026-10-30)の 285HX/275HX の結合セル(L3 36MB)', memory: 'DDR5-6400, 最大 256GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'E コアのクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): Efficient-core ベース 2.1GHz・最大ターボ 4.6GHz(旧: 未取得。Wikipedia の行の 3 つ目の値 1.9 は未ラベルで不明のままだったが、ARK の値を採用)。URL: https://www.intel.com/content/www/us/en/products/sku/242293/intel-core-ultra-9-processor-275hx-36m-cache-up-to-5-40-ghz/specifications.html 。メモリ(同 ARK): DDR5-6400、最大 256GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。L3 36MB は Wikipedia「Arrow Lake」の表で 285HX と 275HX が結合セルを共有(直接取得、2026-10-30)。P の 2.7/5.4GHz は Wikipedia「Arrow Lake」。電力(base 55W・peak 160W・範囲 45〜160W)は 2026-11-05 に Intel ARK の原ページで取得',
  });

  // AMD
  P.push({
    id: 'amd-zen1-1200', name: 'Ryzen 3 1200', vendor: 'AMD', family: 'Zen 1 (Summit Ridge)', isa: 'x86', kind: 'pc', year: 2017, addedIn: 'M5b',
    gb7: 'Zen 1: Ryzen 3 1200(3.1GHz, 4c)',
    dies: [die('Zeppelin', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)。1500X と同じダイ')],
    power: { base: pw(65, 'sec', 'TDP 65W。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-3-1200.c1899'), peak: null, range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 1, baseGHz: 3.1, boostGHz: 3.4 }], l3MB: 8, l3Note: '総容量。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列', memory: 'DDR4-2666(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2666・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-3-1200.c1899)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。4 コア(GB7 の行名 4c)・クロック 3.1/3.4GHz は Wikipedia(直接。3.4 は Wikipedia の表の値)。SMT なし(smt:1)・L3 8MB・TDP 65W は AMD サポートページの検索要約のみだったが、2026-11-05 に TechPowerUp(二次)の原ページで 65W を確認して power.base に入れた(SMT なしは Notebookcheck も記載するが、要原ページ確認)、L3 8MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(1400〜1200 の結合セル=8 MB。検索要約の 8MB とも一致)。2026-10-30 に追加。電力は 2026-11-05 に base 65W を追加(ピークは未取得)',
  });
  P.push({
    id: 'amd-raven-2400g', name: 'Ryzen 5 2400G', vendor: 'AMD', family: 'Zen 1 (Raven Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Raven Ridge: Ryzen 5 2400G(3.6GHz, 4c)',
    dies: [die('Raven Ridge', 209.78, 'pub', 'gf-14', 'WikiChip、Tom\'s Hardware ほか(設計書 §2.2)')],
    power: { base: pw(65, 'sec', 'TDP 65W(cTDP 46〜65W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-5-2400g.c1976'), peak: null, range: { minW: 46, maxW: 65 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 2, baseGHz: 3.6, boostGHz: 3.9 }], l3MB: 4, memory: 'DDR4-2933(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2933・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-5-2400g.c1976)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。4C/8T・3.6/3.9GHz・L3 4MB は Wikipedia(直接)、cTDP 46〜65W も Wikipedia(range のみ。区分 sec)。65W は AMD ページの検索要約のみだったが、2026-11-05 に TechPowerUp(二次)の原ページで確認して power.base に入れた。コアは Zen 1(Raven Ridge は Zen 1 コア)',
  });
  P.push({
    id: 'amd-raven-2200g', name: 'Ryzen 3 2200G', vendor: 'AMD', family: 'Zen 1 (Raven Ridge)', isa: 'x86', kind: 'pc', year: 2018, addedIn: 'M5b',
    gb7: 'Raven Ridge: Ryzen 3 2200G(3.5GHz, 4c)',
    dies: [die('Raven Ridge', 209.78, 'pub', 'gf-14', '2400G と同じダイ。WikiChip、Tom\'s Hardware ほか(設計書 §2.2)')],
    power: { base: pw(65, 'sec', 'TDP 65W(cTDP 46〜65W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-3-2200g.c1978'), peak: null, range: { minW: 46, maxW: 65 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 4, smt: 1, baseGHz: 3.5, boostGHz: 3.7 }], l3MB: 4, l3Note: '総容量。[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2400G〜2200GE の結合セル)', memory: 'DDR4-2933(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2933・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-3-2200g.c1978)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。4C/4T・3.5/3.7GHz は Wikipedia(直接)、cTDP 46〜65W も Wikipedia(range のみ。区分 sec)。65W は検索要約のみで未確認だったが、2026-11-05 に TechPowerUp(二次)の原ページで確認して power.base に入れた。L3 4MB は[二次] Wikipedia「List of AMD Ryzen processors」(原ページ直接取得、2026-10-30)の L3 cache (total) 列(2400G の 4 MB が 2400GE・2200G・2200GE に及ぶ結合セル)。2026-10-30 に追加',
  });
  // ---- M5b 波2 の条件待ち 2 件(2026-10-30。addedIn:'M5b'。calib は false) ----
  P.push({
    id: 'amd-epyc-7401', name: 'EPYC 7401', vendor: 'AMD', family: 'Zen 1 (Naples)', isa: 'x86', kind: 'server', year: 2017, addedIn: 'M5b',
    gb7: 'EPYC 7401(Zen 1 サーバー、24c)',
    dies: [die('Zeppelin 1', 213, 'pub', 'gf-14', '212.97。AMD 由来(PC Games Hardware)。EPYC 7001 は Zeppelin 4 個すべてが CPU を含む(1 ダイ 6 コア有効)'), die('Zeppelin 2', 213, 'pub', 'gf-14'), die('Zeppelin 3', 213, 'pub', 'gf-14'), die('Zeppelin 4', 213, 'pub', 'gf-14')],
    power: { base: pw(170, 'sec', 'TDP 170W(範囲 155〜170W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/epyc-7401.c1924 。155W との 2 値があり、違いの理由は不明(AMD 公式の仕様一覧にも 2 値が並ぶ。notes 参照)'), peak: null, range: { minW: 155, maxW: 170 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 1', count: 24, smt: 2, baseGHz: 2.0, boostGHz: 3.0 }], l3MB: 64, l3Note: '総容量=8MB/CCX × 8 CCX(24 コア=8 CCX×3)。Wikipedia「Epyc」(原ページ直接取得、2026-10-30)の表の L3 per CCX=8MB と CCX 数 8(8×3)から算出。同表の Total 76MB は L2(24×512KB=12MB)込み', memory: 'DDR4-2666(TechPowerUp [二次]。8 チャネル)' },
    calib: false, notes: 'メモリ DDR4-2666・8 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/epyc-7401.c1924)。「8 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、8ch と書くと電力・温度が変わる。24C/48T・2.0/3.0GHz は設計書 §2.7。電力: Default TDP は AMD 公式(サーバー仕様一覧 https://www.amd.com/en/products/specifications/server-processor.html 、2026-11-06、[公表])で 155W / 170W の 2 値が並ぶ(メモリ 2400 / 2666 MT/s と同じ並びで、2 つの動作設定と読めるが、どちらがどの設定かは公式に記載なし=未取得)。電力は 155W と 170W の 2 値があり違いは不明(range に両方を残し、base は 2026-11-05 に TechPowerUp〔二次〕の原ページで確認した 170W)。GB7 は投稿 1 件のみ(区分は直近 25 件の中央値だが実質 n=1)、参考扱い。L3 64MB は [二次] Wikipedia「Epyc」の L3 per CCX 8MB × 8 CCX(表に 64MB の記載は無く算出値。Total 76MB−L2 12MB とも一致)。2026-10-30 に追加。MT は全コアに boost 3.0GHz を使うため、サーバーの実際の全コアクロック(これより低い)に対して過大になる可能性がある。kind:server の MT クロック係数は 1.0',
  });
  P.push({
    id: 'amd-zen3p-7735hs', name: 'Ryzen 7 7735HS', vendor: 'AMD', family: 'Zen 3+ (Rembrandt-R)', isa: 'x86', kind: 'mobile-pc', year: 2023, addedIn: 'M5b',
    gb7: 'Zen 4 モバイル(Rembrandt-R): Ryzen 7 7735HS(3.2GHz, 8c)',
    errCause: { st: 'モバイルのチャート平均が最良条件より低い偏り(GB6 ラボ値からの推定で 1.089 倍)で誤差の 4 割強を説明する。残り +11.6% は原因未特定。L3 16MB は入力済み(Cezanne/Rembrandt は 8 コア 1 クラスタ)。DRAM 遅延は一定 85ns で、LPDDR/DDR5 の差を仮に +25ns としても ST は約 -3%(Zen 3 系は L3 が小さくメモリ項が大きいので感度は高いが、足りない)。推定の基準は 5800X の GB6 比(DDR4 のデスクトップ)で、GB6 は Geekbench Browser の転載を含む。設計書 §5.3.3 J' },
    dies: [die('Rembrandt-R', 208.7, 'meas', 'tsmc-n6', 'Kurnal の実測 12.84×16.25mm')],
    power: { base: pw(35, 'sec', 'TDP 35W(cTDP 35〜54W)。TechPowerUp CPU データベースの原ページを確認済み(2026-11-05): https://www.techpowerup.com/cpu-specs/ryzen-7-7735hs.c3041'), peak: null, range: { minW: 35, maxW: 54 } },
    cfg: { cores: [{ type: 'P', uarch: 'Zen 3', count: 8, smt: 2, baseGHz: 3.2, boostGHz: 4.75 }], l3MB: 16, memory: 'DDR5-4800 / LPDDR5-6400(TechPowerUp [二次]。2 チャネル)' },
    calib: false, notes: 'メモリ DDR5-4800 / LPDDR5-6400・2 チャネルは 2026-11-05 に TechPowerUp CPU データベースの原ページを Chrome で確認([二次]。https://www.techpowerup.com/cpu-specs/ryzen-7-7735hs.c3041)。「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる。uarch は Zen 3 を流用(uarch.js に Zen 3+ は作らない)。根拠: Zen 3+ は Zen 3 と IPC が同一。TechSpot(Tim Schiesser、2022-02-17、直接取得)「AMD told us there are no fundamental IPC improvements with Zen 3+ compared to Zen 3 ... micro-op queues, branch predictors, execution engine, ALUs and so on, are all unchanged」[二次、AMD 回答の引用]。Wikipedia「Zen 3」の Zen 3+ 節(直接取得)も「IPC is identical to that of Zen 3」。AnandTech の記事は取得時にボット確認の画面になり本文を読めなかった(未確認)。8C/16T・3.2/4.75GHz・L3 16MB・35〜54W は Notebookcheck の検索要約(原ページ未確認)だったが、2026-11-05 に TechPowerUp(二次)の原ページで TDP 35W・cTDP 35〜54W を確認し、power.base に 35W を入れた。GB7 の行名は「Zen 4 モバイル」だが実体は Rembrandt-R(Zen 3+)。MT は全コアに最大 4.75GHz を使うため mobile-pc 係数 0.81 を掛けても過大の可能性。AMD 公式(2026-11-06、[公表]。https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7735hs.html )は Default TDP を範囲「35〜54W」と表記し、単一の既定値を決めていない。power.base の 35W は範囲の下端を採用(公表の範囲の下端。値は変更なし)',
  });
  // ---- Intel 第12世代以降の残り(addedIn:'M5b'。ユーザー決定 2026-10-29: 第12世代以降の Intel は C5 を適用しない。設計書 §13 M5b-4・M5b-11) ----
  // calib は false。未取得は null のまま。同じダイの別 SKU は s:'sec' + note で流用を明記(T4)。
  P.push({
    id: 'intel-rpl-14600k', name: 'Core i5-14600K', vendor: 'Intel', family: 'Raptor Lake Refresh', isa: 'x86', kind: 'pc', year: 2023, addedIn: 'M5b',
    gb7: 'Raptor Lake Refresh: Core i5-14600K(3.5GHz, 14c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '13600K と同じ 8P+16E ダイの流用(2P+8E 無効)。13900K に合わせた 252.3mm²。Notebookcheck と PC Games Hardware は 13600K を 257mm² と記載。14600K 個別の実測は未取得')],
    power: { base: pw(125, 'sec', 'PBP'), peak: pw(181, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 6, smt: 2, baseGHz: 3.5, boostGHz: 5.3 }, { type: 'E', uarch: 'Gracemont', count: 8, smt: 1, baseGHz: 2.6, boostGHz: 4.0 }], l3MB: 24, memory: 'DDR5-5600 / DDR4-3200, 最大 192GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-5600 / DDR4-3200、最大 192GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。6P+8E・クロック・L3 24MB・125/181W は Wikipedia「Raptor Lake」の表(取得日 2026-10-29)',
  });
  P.push({
    id: 'intel-rpl-14700hx', name: 'Core i7-14700HX', vendor: 'Intel', family: 'Raptor Lake-HX Refresh', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Raptor Lake(モバイル): Core i7-14700HX(2.1GHz, 20c)',
    dies: [die('Raptor Lake-S 8P+16E', 252.3, 'sec', 'intel-7', '14700K と同じ 8P+16E ダイの流用(E コア4個無効)。Wikipedia「Raptor Lake」の『HX はデスクトップ向けプロセッサのモバイル転用』という記述に基づく([二次・直接]。ダイ写真での照合は未了。推論(未検証): 8P+12E を持てる Raptor Lake のダイは 8P+16E ダイのみ)。14700HX 個別の実測は未取得')],
    power: { base: pw(55, 'sec', 'Wikipedia の HX 行(cTDP 45W)'), peak: pw(157, 'sec', 'MTP'), range: { minW: 45, maxW: 55 } },
    cfg: { cores: [{ type: 'P', uarch: 'Raptor Cove', count: 8, smt: 2, baseGHz: 2.1, boostGHz: 5.5 }, { type: 'E', uarch: 'Gracemont', count: 12, smt: 1, baseGHz: 1.5, boostGHz: 3.9 }], l3MB: 33, memory: 'DDR5-5600 / DDR4-3200, 最大 192GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]。ARK の ID は 235997): DDR5-5600 / DDR4-3200、最大 192GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。8P+12E・クロック・電力は Wikipedia「Raptor Lake」の表(取得日 2026-10-29)。L3 は Wikipedia と ARK の URL が 33MB、Notebookcheck は 30MB で食い違い(設計書 §2.7.4)。33MB を採用',
  });
  P.push({
    id: 'intel-adl-12100', name: 'Core i3-12100', vendor: 'Intel', family: 'Alder Lake', isa: 'x86', kind: 'pc', year: 2022, addedIn: 'M5b',
    gb7: 'Alder Lake: Core i3-12100(3.3GHz, 4c)',
    dies: [die('Alder Lake-S 6P', 163, 'sec', 'intel-7', '6P の H0 ダイ(2P 無効)。H0 の根拠: hwcooling.net「12100F・12400(F) は H0=6P だけの小さいダイ」(2023-02)、VideoCardz(発売前に 12400 の C0 と H0 を確認)。面積 163mm² は TechPowerUp CPU Database の 12100 のページ(12900K は 215mm²)と The Overclock Page の記事(H0=163、C0=215)。Wikipedia は同じダイを 157.74mm²(10.19×15.47mm。Fritzchens Fritz の 12400F の写真)としており 3% 差。12100(UHD 730 つき)個体のステッピングを直接確認した一次資料は無い。hwcooling・VideoCardz・The Overclock Page は検索の抜粋で、原ページ未確認。TechPowerUp CPU Database も集約サイトの [二次]')],
    power: { base: pw(60, 'sec', 'PBP'), peak: pw(89, 'sec', 'MTP'), range: null },
    cfg: { cores: [{ type: 'P', uarch: 'Golden Cove', count: 4, smt: 2, baseGHz: 3.3, boostGHz: 4.3 }], l3MB: 12, memory: 'DDR5-4800 / DDR4-3200, 最大 128GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): DDR5-4800 / DDR4-3200、最大 128GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。4P(8 スレッド)・クロック・L3 12MB・60/89W は Wikipedia「Alder Lake」(設計書 §2.7)。使用ダイは [二次] で確証が弱い(上の die の note)',
  });
  P.push({
    id: 'intel-lnl-256v', name: 'Core Ultra 7 256V', vendor: 'Intel', family: 'Lunar Lake', isa: 'x86', kind: 'mobile-pc', year: 2024, addedIn: 'M5b',
    gb7: 'Lunar Lake: Core Ultra 7 256V(2.2GHz, 8c)',
    dies: [die('Compute タイル', 139.6, 'sec', 'tsmc-n3b', '268V と同じ3タイルを流用'), die('Platform Controller タイル', 45.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用'), die('Base タイル', 219.7, 'sec', 'tsmc-n6', '268V と同じタイルを流用')],
    power: { base: pw(17, 'pub', 'プロセッサー・ベース・パワー。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240954/intel-core-ultra-7-processor-256v-12m-cache-up-to-4-80-ghz/specifications.html'), peak: pw(37, 'pub', '最大ターボ・パワー(Maximum Turbo Power)。Intel ARK の原ページを確認済み(2026-11-05): https://www.intel.com/content/www/us/en/products/sku/240954/intel-core-ultra-7-processor-256v-12m-cache-up-to-4-80-ghz/specifications.html。範囲 8〜37W の下限 8W は ARK の最小保証パワー(Minimum Assured Power)で、cTDP(構成可能な TDP)ではない。上限 37W は最大ターボ・パワー'), range: { minW: 8, maxW: 37 } },
    cfg: { cores: [{ type: 'P', uarch: 'Lion Cove', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 4.8 }, { type: 'LP-E', uarch: 'Skymont', count: 4, smt: 1, baseGHz: 2.2, boostGHz: 3.7 }], l3MB: 12, l3Note: '258V と同じ(Wikipedia「Lunar Lake」の結合セル、[二次])', memory: 'LPDDR5X-8533, 最大 16GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: '258V と同じ構成・最大 4.8GHz(設計書 §2.7.2)。コアクロック(2026-11-05 に Chrome で Intel ARK の原ページを確認、[公表]): P ベース 2.2GHz・LP-E ベース 2.2GHz・最大ターボ 3.7GHz(旧: 未取得)。URL: https://www.intel.com/content/www/us/en/products/sku/240954/intel-core-ultra-7-processor-256v-12m-cache-up-to-4-80-ghz/specifications.html 。メモリ(同 ARK): LPDDR5X-8533、最大 16GB、2 チャネル(「2 チャネル」は意図的: 電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。電力は 2026-11-05 に Intel ARK の原ページで取得し、power に入れた。L3 12MB は 258V と同じ(Wikipedia「Lunar Lake」の結合セル、2026-10-30)。メモリサイドキャッシュは未確認のため入れない',
  });
  P.push({
    id: 'intel-ptl-x9-378h', name: 'Core Ultra X9 378H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra X9 378H(2.0GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。GPU・Platform タイルは Kurnal 全体図の寸法(二次)を飾りのダイにだけ使用(評価・面積合計に含まない)。ほかのタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.0, boostGHz: 5.0 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.6, boostGHz: 3.8 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.6 }], l3MB: 18, memory: 'LPDDR5X-9600, 最大 96GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): LPDDR5X-9600、最大 96GB、2 チャネル。「2 チャネル」は意図的(電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)。GB7 の行は外れ値あり(設計書 §2.4)',
  });
  P.push({
    id: 'intel-ptl-x7-358h', name: 'Core Ultra X7 358H', vendor: 'Intel', family: 'Panther Lake-H', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra X7 358H(1.9GHz, 16c)',
    errCause: { st: 'チャートが「直近25件の中央値」で、母集団の偏りがほぼ無い(推定 ÷ チャート 0.995〜1.067)ため、残り +5.5〜+7.6% が原因未特定。Panther Lake の k は Lion Cove(265K)の代用で根拠が弱い。DRAM(LPDDR5X-9600)の遅延は未取得。設計書 §5.3.3 J' },
    dies: [die('Compute タイル', 115.1, 'sec', 'intel-18a', '388H と同じ 4P+8E+4LP-E のコンピュートタイルを流用。GPU・Platform タイルは Kurnal 全体図の寸法(二次)を飾りのダイにだけ使用(評価・面積合計に含まない)。ほかのタイルの寸法は未取得')],
    power: { base: pw(25, 'sec'), peak: pw(80, 'sec', 'MTP は65W または80W(SKU ごとの割当は不明)'), range: { minW: 15, maxW: 80 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 1.9, boostGHz: 4.8 }, { type: 'E', uarch: 'Darkmont', count: 8, smt: 1, baseGHz: 1.5, boostGHz: 3.5 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.5, boostGHz: 3.3 }], l3MB: 18, memory: 'LPDDR5X-9600, 最大 96GB(Intel ARK [公表]。2 チャネル)' },
    calib: false, notes: 'メモリ(2026-11-05 に Intel ARK の原ページで確認、[公表]): LPDDR5X-9600、最大 96GB、2 チャネル。「2 チャネル」は意図的(電力モデルが「数字+ch」の表記でチャンネル数を読むため、2ch と書くと電力・温度が変わる)。クロック・L3・電力は Wikipedia「Panther Lake (microprocessor)」の表(取得日 2026-10-29)',
  });
  // ---- 2026-11-04 追加 2 件(ユーザーの指示は 325 と 320 の追加。例外の登録は実装上の判断。調査: docs/research/intel-ptl-325-wcl-320.md)。addedIn:'M5b'(calib は false)。ダイ面積はどちらも未取得(null)。Core Ultra 5 325 は 4P+4LPE の小型 Compute タイルの代表(332・322 は 2P+4LPE+2Xe で別構成のため追加しない)。320 の GB7 は 2026-11-04 にユーザー提供の検索結果(n=8)で採用し、C1_EXCEPTIONS から外した ----
  P.push({
    id: 'intel-ptl-u5-325', name: 'Core Ultra 5 325', vendor: 'Intel', family: 'Panther Lake', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Panther Lake: Core Ultra 5 325(2.1GHz, 8c)',
    dies: [die('Compute タイル', null, null, 'intel-18a', '面積は未取得(null)。4P+4LP-E+4Xe の小型 Compute タイル。nodeId は Panther Lake の Compute タイルが Intel 18A であること(386H などと同じ扱い)に合わせた')],
    power: { base: pw(25, 'pub', 'ARK のプロセッサー・ベース・パワー'), peak: pw(55, 'pub', 'ARK の最大ターボ・パワー'), range: { minW: 12, maxW: 55 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 4, smt: 1, baseGHz: 2.1, boostGHz: 4.5 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.6, boostGHz: 3.4 }], l3MB: 12, memory: 'LPDDR5X-7467 / DDR5-6400, 最大 128GB, 2ch' },
    calib: false, notes: 'Intel ARK([公表]。https://www.intel.com/content/www/us/en/products/sku/245720/intel-core-ultra-5-processor-325-12m-cache-up-to-4-50-ghz/specifications.html): P(Cougar Cove)4 コア 2.1〜4.5GHz、LP-E(Darkmont)4 コア 1.6〜3.4GHz、E コアなし、8 スレッド(SMT なし)、L3 12MB、ベース 25W・最大ターボ 55W・最小保証 12W、メモリ LPDDR5X-7467 / DDR5-6400・最大 128GB・2ch。GPU は Intel Graphics(Xe3 4 コア・最大 2.5GHz。評価には使わない)、NPU は 47 TOPS(ARK の値。記事では差がある)。GB7 の行は直近25件の中央値(ST 2337 / MT 11018、n=25。設計書 §5.3.2 C の 2026-10-31 の取り直し値)。ダイ面積は未取得。Geekbench 6 の二次値(参考・判定外): GB6.7 シングル 2622・マルチ 11088(Dell XPS 16、Notebookcheck 2026-03-21)。判定には使わない。未取得項目の追加調査(2026-11-04。docs/research/intel-ptl-325-wcl-320.md §6): 上の ARK の値は、2026-11-05 に ARK の原ページを Chrome で直接開いて確認済み(§7。当初は要約ツール経由の値で、自動取得は 403/404)。ARK で新たに分かった値([公表]): GPU Peak TOPS(Int8)40・GPU 最大動的周波数 2.45GHz・Ray Tracing あり、NPU 47 TOPS(一致)、最大動作温度 100°C、パッケージ 50mm × 25mm、リソグラフィは CPU = Intel 18A・GPU = Intel 3(ARK の Lithography 2 項目。GPU が Intel 3 であることは [二次] から [公表] になった)、発売 2026 年 Q1。ARK に最大メモリ帯域の項目はない。4P+4LPE Compute タイル・4Xe GPU タイル・小型版 Platform タイルの面積は未取得(null のまま)。ノードは [二次] で Compute タイルは両版とも Intel 18A、4Xe の GPU タイルは Intel 3、I/O タイルは TSMC N6(SemiAnalysis。I/O タイルは 2 種類)。バス幅 128-bit([二次])から算出した帯域(公表値ではない)は LPDDR5X-7467 で 119.5 GB/s、DDR5-6400 で 102.4 GB/s。最大容量は ARK 128GB に対し Notebookcheck は 96GB(LPDDR5X)/ 128GB(DDR5)で食い違い(ARK の原ページ確認により ARK の 128GB を採用)。L2 は Notebookcheck で 16MB([二次])、P コアの L2 は資料で割れて未確定。トランジスタ数は未取得。PL1/PL2 を Intel が SKU 別に公表しているのは ARK のベース電力・最大ターボ電力のみで、325 実機の PL 測定値は見つからず',
  });
  P.push({
    id: 'intel-wcl-c5-320', name: 'Core 5 320', vendor: 'Intel', family: 'Wildcat Lake', isa: 'x86', kind: 'mobile-pc', year: 2026, addedIn: 'M5b',
    gb7: 'Wildcat Lake: Core 5 320(1.5GHz, 6c)',
    dies: [die('Compute タイル', null, null, 'intel-18a', '面積は未取得(null)。Notebookcheck の 77mm² は出典・対象のダイが不明のため採用しない。プロセスは Intel 18A'), die('I/O タイル(IO die)', null, null, 'tsmc-n6', '面積は未取得(null)。プロセスは TSMC N6 [二次](Chips and Cheese・heise など。原ページは実装担当は未確認)')],
    power: { base: pw(15, 'pub', 'ARK のプロセッサー・ベース・パワー'), peak: pw(35, 'pub', 'ARK の最大ターボ・パワー'), range: { minW: 10, maxW: 35 } },
    cfg: { cores: [{ type: 'P', uarch: 'Cougar Cove', count: 2, smt: 1, baseGHz: 1.5, boostGHz: 4.6 }, { type: 'LP-E', uarch: 'Darkmont', count: 4, smt: 1, baseGHz: 1.4, boostGHz: 3.4 }], l3MB: 6, memory: 'LPDDR5X-7467 / DDR5-6400, 最大 64GB, 1ch' },
    calib: false, notes: 'Intel ARK([公表]。https://www.intel.com/content/www/us/en/products/sku/246018/intel-core-5-processor-320-6m-cache-up-to-4-60-ghz/specifications.html): P(Cougar Cove)2 コア 1.5〜4.6GHz、LP-E(Darkmont)4 コア 1.4〜3.4GHz、6 スレッド(SMT なし)、L3 6MB、ベース 15W・最大ターボ 35W・最小保証 10W、メモリ LPDDR5X-7467 / DDR5-6400・最大 64GB・1ch。GPU は Xe3 2 コア・最大 2.5GHz(評価には使わない)、NPU は 16 TOPS(ARK の値。記事では 17)。メモリサイドキャッシュの容量は二次ソースで 4MB と 2MB に割れており未確定。Compute タイル(Intel 18A)と I/O タイル(TSMC N6)の 2 ダイ構成・UCIe 接続・有機パッケージ(Foveros ではない)は [二次](Chips and Cheese の Hot Chips 2026 記事・Tom\'s Hardware・heise など。原ページは実装担当は未確認)。ダイ面積はどちらも未取得。GB7 は、ユーザーが提供した Geekbench 7 検索結果(CPU「Intel Core 5 320」、全 431 件中の直近 25 件のスクリーンショット 3 枚、2026-11-04)の中央値を採用(ST 2242 / MT 7212、n=25。Linux 5 件と ST 1358・1684 など低い投稿を含むが、既存規則どおり除外せず中央値で頑健化。外れ値 7 件を除いた感度は ST 2277 / MT 7301。設計書 §2.4)。以前の範囲 ST 2220〜2225 / MT 7223〜7359 は単一値が決まらず採らなかった。Notebookcheck の GB7 個別投稿 1 件(Dell XPS 13 DX13260: シングル 2551・マルチ 7890)は集計値ではないので参考として記すだけで判定には使わない。Geekbench 6.7.1 の二次値(参考・判定外): シングル中央値 2575・マルチ中央値 7913(n=4、Notebookcheck)。判定には使わない。未取得項目の追加調査(2026-11-04。docs/research/intel-ptl-325-wcl-320.md §6): 上の ARK の値は、2026-11-05 に ARK の原ページを Chrome で直接開いて確認済み(§7。当初は要約ツール経由の値で、自動取得は 403/404)。ARK で新たに分かった値([公表]): GPU「Intel Graphics」Xe コア 2・最大動的周波数 2.5GHz・GPU Peak TOPS(Int8)20、NPU 16 TOPS(一致)、最大動作温度 100°C、パッケージ FCBGA1516・35mm × 25mm、リソグラフィは CPU も GPU も Intel 18A(ARK の Lithography 2 項目とも。heise・CNX Software の「CPU・GPU・NPU を載せた compute die は Intel 18A」という記述と一致を確認、2026-11-05。TSMC N3E は Panther Lake の 12Xe の GPU タイルで、Wildcat Lake の GPU ではない)、発売 2026 年 Q2、ARK のコードネームは「旧ワイルドキャットレイク製品」。ARK に最大メモリ帯域の項目はない。compute die・I/O die の mm² は未取得(null のまま)。記事は相対値のみで「compute tile は Panther Lake 比 38% 減、I/O は 15% 減」(Wccftech・TechBang・ServeTheHome。比較基準の SKU は明記なし)。メモリサイドキャッシュは 2MB 説(Wccftech が Hot Chips のスライドを書き起こし)と 4MB 説(TechBang)で未確定、決め手は Hot Chips 2026 スライド原本。バス幅は 64-bit([二次]。記事によりチャネル幅の数え方が違う)で、算出した帯域(公表値ではない)は LPDDR5X-7467 で 59.7 GB/s、DDR5-6400 で 51.2 GB/s。320 の L2(LPE 共有 4MB)は検索要約のみで未確認。トランジスタ数は未取得。OEM 設定の例として Dell XPS 13 は 37W PL2 / 18W PL1(Notebookcheck。Intel の値ではない)',
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
