// プリセット(古い Core i シリーズ。第2〜10世代のデスクトップ・ノート): 2026-11-17 追加(ユーザー指示「古いチップも追加。現在情報がある Core i シリーズだけ」)。
// 値は設計書 §2.8(参考データ。調査 2026-10-26〜27)と §2.4(GB7 のチャート値)から転記。未取得は null のまま(推測で埋めない)。
// 対象は、コア設計の幅・ROB が分かる世代(Sandy Bridge・Haswell・Skylake と、同じコア設計の Kaby Lake・Coffee Lake・Comet Lake)で、
// ダイ面積・構成(Intel ARK)・GB7 の行がそろう 18 SKU(i5-8400 は 2026-11-17 のユーザー判断で外した。MT が公開値より +18.2% 高く、原因が特定できなかったため)。見送り: Ivy Bridge・Broadwell(ROB 未取得)、Rocket Lake・Tiger Lake・Ice Lake(幅・ROB 未取得)、
// i3 系・U 系(ダイ面積が未取得)、第8〜10世代のモバイル(H 系のダイが未確認)、i5-10600K(ARK の構成が未取得)。
// 区分: 面積 dies[].s は 'meas'/'pub'/'sec'、電力 power.* は 'pub'/'sec'。GB7 は [チャート](Geekbench 7 のプロセッサチャートの SKU 平均。Windows のみの中央値ではない)。
// ここでは校正の代表(calib)にしない。ST 補正 u は uarch.js の uCal(各 uarch のデスクトップ SKU の SKU 別 u の中央値。チャート値に合わせた学習内の値で、検証ではない)。
// モバイル 4 件は別の uarch 名(「… (モバイル)」)で、デスクトップの u に 1 SKU から合わせた比を掛ける(これも学習内)。確度は低い。
// 2026-11-17 の再現度: 18 件が ST・MT とも ±10% 以内(i7-9700K は 2026-11-18 に公開値を Windows のみの中央値(n=200)に差し替え、MT +9.2% で範囲内。ハイパースレッディングなしの過大は残る。i5-8400 は +18.2% だったため外した)。原因は 1 つには特定できていない(調査 2026-11-17: docs/research/old-intel-mt-ng-2026-11-17.md。スレッド数に対する伸び方 σ・γ が古い Intel に合っていないことが主因とみられ、全コアクロック・L3・メモリ速度は原因ではない。同じくハイパースレッディングなしの 2500K・4690K・6600K・7600K も +6〜8% と高め)。公開値に合わせた調整はしていない。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.presets = window.SDS_DATA.presets || [];
(function () {
  const P = window.SDS_DATA.presets;
  const ARK = 'Intel ARK([公表]。設計書 §2.8.2。調査 2026-10-26)';
  const base = (w, s, extra) => ({ w, s, note: (s === 'pub' ? 'プロセッサー・ベース・パワー(TDP)。' + ARK : 'Wikipedia・検索の要約([二次]。設計書 §2.8.2。ARK を取得できなかった)') + (extra || '') });
  // ダイ: 4C+GT2 などの面積(設計書 §2.8.1・§2.8.4)
  const SB4 = { name: 'Sandy Bridge 4C+GT2', mm2: 216, s: 'sec', nodeId: 'intel-32', note: '3DCenter の値([二次]。設計書 §2.8.1)。Sandy Bridge-E の 283.2mm² は別のダイ(Kurnal の実測)で 4C+GT2 ではない' };
  const HSW4 = { name: 'Haswell 4C+GT2', mm2: 177, s: 'sec', nodeId: 'intel-22', note: 'AnandTech の検索抜粋([二次]。設計書 §2.8.1・§2.8.4 の Haswell 4C GT2。公表値として Intel の ISSCC 資料にも 177mm² の記述があるが、原ページは未確認)' };
  const SKL4 = { name: 'Skylake 4C+GT2', mm2: 122.4, s: 'sec', nodeId: 'intel-14', note: 'AnandTech の 9.05×13.52mm([二次]。設計書 §2.8.4)' };
  const KBL4 = { name: 'Kaby Lake 4C+GT2', mm2: 126, s: 'sec', nodeId: 'intel-14', note: '検索の要約([二次]。設計書 §2.8.4。Kurnal の実測 159.1mm² は 2C GT3e の別のダイ)' };
  const CFL6 = { name: 'Coffee Lake 6C+GT2', mm2: 149.6, s: 'sec', nodeId: 'intel-14', note: 'AnandTech の推定(約 149.6mm²。[二次]。設計書 §2.8.1。WikiChip は 149、殻割りの実測は約 151、TechPowerUp DB は 154 で食い違い)' };
  const CFL8 = { name: 'Coffee Lake Refresh 8C+GT2', mm2: 176.3, s: 'meas', nodeId: 'intel-14', note: 'Kurnal の測定([実測]。設計書 §2.8.1)' };
  const CML10 = { name: 'Comet Lake 10C+GT2', mm2: 206.1, s: 'sec', nodeId: 'intel-14', note: 'der8auer の計測のフォーラム転載(206.1mm²。[二次]。AnandTech の推定は約 198.4mm²。設計書 §2.8.1)' };
  const reuse = (d, why) => Object.assign({}, d, { note: d.note + '。' + why });

  // [id, 名前, family, kind, 年, GB7 行, ダイ, TDP(W), TDP 区分, uarch, コア数, スレッド(smt), base GHz, boost GHz, L3 MB, メモリ, 備考]
  const rows = [
    ['intel-snb-2600k', 'Core i7-2600K', 'Sandy Bridge', 'pc', 2011, 'i7-2600K(4c)', SB4, 95, 'pub', 'Sandy Bridge', 4, 2, 3.4, 3.8, 8, 'DDR3-1333', '第2世代(32nm)。4C+GT2(HD Graphics 3000)ダイ。'],
    ['intel-snb-2500k', 'Core i5-2500K', 'Sandy Bridge', 'pc', 2011, 'i5-2500K(4c)', reuse(SB4, '2600K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 95, 'pub', 'Sandy Bridge', 4, 1, 3.3, 3.7, 6, 'DDR3-1333', '第2世代(32nm)。ハイパースレッディングなし。'],
    ['intel-snb-2720qm', 'Core i7-2720QM', 'Sandy Bridge', 'mobile-pc', 2011, 'i7-2720QM(4c、モバイル)', reuse(SB4, 'モバイル(QM)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 45, 'pub', 'Sandy Bridge (モバイル)', 4, 2, 2.2, 3.3, 6, 'DDR3-1600', '第2世代モバイル(32nm)。'],
    ['intel-hsw-4770k', 'Core i7-4770K', 'Haswell', 'pc', 2013, 'i7-4770K(4c)', HSW4, 84, 'pub', 'Haswell', 4, 2, 3.5, 3.9, 8, 'DDR3-1600', '第4世代(22nm)。'],
    ['intel-hsw-4790k', 'Core i7-4790K', 'Haswell', 'pc', 2014, 'i7-4790K(4c)', reuse(HSW4, 'Haswell Refresh(Devil\'s Canyon)も同じ 4C+GT2 ダイとして流用([推定]。個別の確認は未取得)'), 88, 'pub', 'Haswell', 4, 2, 4.0, 4.4, 8, 'DDR3-1600', '第4世代 Refresh(22nm)。'],
    ['intel-hsw-4690k', 'Core i5-4690K', 'Haswell', 'pc', 2014, 'i5-4690K(4c)', reuse(HSW4, '4790K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 88, 'pub', 'Haswell', 4, 1, 3.5, 3.9, 6, 'DDR3-1600', '第4世代 Refresh(22nm)。ハイパースレッディングなし。'],
    ['intel-hsw-4700hq', 'Core i7-4700HQ', 'Haswell', 'mobile-pc', 2013, 'i7-4700HQ(4c、モバイル)', reuse(HSW4, 'モバイル(HQ)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 47, 'sec', 'Haswell (モバイル)', 4, 2, 2.4, 3.4, 6, 'DDR3L-1600', '第4世代モバイル(22nm)。TDP 47W は ARK を取得できず [二次]。'],
    ['intel-skl-6700k', 'Core i7-6700K', 'Skylake', 'pc', 2015, 'i7-6700K(4c)', SKL4, 91, 'pub', 'Skylake', 4, 2, 4.0, 4.2, 8, 'DDR4-2133', '第6世代(14nm)。'],
    ['intel-skl-6600k', 'Core i5-6600K', 'Skylake', 'pc', 2015, 'i5-6600K(4c)', reuse(SKL4, '6700K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 91, 'pub', 'Skylake', 4, 1, 3.5, 3.9, 6, 'DDR4-2133', '第6世代(14nm)。ハイパースレッディングなし。'],
    ['intel-skl-6700hq', 'Core i7-6700HQ', 'Skylake', 'mobile-pc', 2015, 'i7-6700HQ(4c、モバイル)', reuse(SKL4, 'モバイル(HQ)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 45, 'pub', 'Skylake (モバイル)', 4, 2, 2.6, 3.5, 6, 'DDR4-2133', '第6世代モバイル(14nm)。'],
    ['intel-kbl-7700k', 'Core i7-7700K', 'Kaby Lake', 'pc', 2017, 'i7-7700K(4c)', KBL4, 91, 'pub', 'Kaby Lake', 4, 2, 4.2, 4.5, 8, 'DDR4-2400', '第7世代(14nm+)。'],
    ['intel-kbl-7600k', 'Core i5-7600K', 'Kaby Lake', 'pc', 2017, 'i5-7600K(4c)', reuse(KBL4, '7700K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 91, 'pub', 'Kaby Lake', 4, 1, 3.8, 4.2, 6, 'DDR4-2400', '第7世代(14nm+)。ハイパースレッディングなし。'],
    ['intel-kbl-7700hq', 'Core i7-7700HQ', 'Kaby Lake', 'mobile-pc', 2017, 'i7-7700HQ(4c、モバイル)', reuse(KBL4, 'モバイル(HQ)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 45, 'pub', 'Kaby Lake (モバイル)', 4, 2, 2.8, 3.8, 6, 'DDR4-2400', '第7世代モバイル(14nm+)。'],
    ['intel-cfl-8700k', 'Core i7-8700K', 'Coffee Lake', 'pc', 2017, 'i7-8700K(6c)', CFL6, 95, 'pub', 'Coffee Lake', 6, 2, 3.7, 4.7, 12, 'DDR4-2666', '第8世代(14nm++)。'],
    ['intel-cfr-9900k', 'Core i9-9900K', 'Coffee Lake Refresh', 'pc', 2018, 'i9-9900K(8c)', CFL8, 95, 'pub', 'Coffee Lake', 8, 2, 3.6, 5.0, 16, 'DDR4-2666', '第9世代(14nm++)。'],
    ['intel-cfr-9700k', 'Core i7-9700K', 'Coffee Lake Refresh', 'pc', 2018, 'i7-9700K(8c)', reuse(CFL8, '9900K と同じ 8C ダイからハイパースレッディングと L3 4MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 95, 'pub', 'Coffee Lake', 8, 1, 3.6, 4.9, 12, 'DDR4-2666', '第9世代(14nm++)。ハイパースレッディングなし。公開値は Windows のみの中央値(n=200。[実測])。MT は +9.2% 高く出る(±10% 内だが過大の傾向は残る。原因は docs/research/old-intel-mt-ng-2026-11-17.md。HT の効果を約 8% 低く見積もっているため。σ・γ を γ 0.40・σ 0.05 にすると +0.6%)。'],
    ['intel-cml-10900k', 'Core i9-10900K', 'Comet Lake', 'pc', 2020, 'i9-10900K(10c)', CML10, 125, 'pub', 'Comet Lake', 10, 2, 3.7, 5.3, 20, 'DDR4-2933', '第10世代(14nm++)。'],
    ['intel-cml-10700k', 'Core i7-10700K', 'Comet Lake', 'pc', 2020, 'i7-10700K(8c)', reuse(CML10, '10900K と同じ 10C ダイからコア 2 基と L3 4MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 125, 'pub', 'Comet Lake', 8, 2, 3.8, 5.1, 16, 'DDR4-2933', '第10世代(14nm++)。'],
  ];
  // 全コア負荷時のクロック(allCoreGHz。2026-11-17。MT の予測に使う。区分 [二次]。取得日 2026-11-17。Intel ARK には載っていない)。出典を確認できた SKU だけ(確認できない SKU は未取得のまま)
  const WC = 'WikiChip'; const CM = 'CPU-Monkey'; const TH = "Tom's Hardware";
  const ALLCORE = {
    'intel-skl-6700hq': [3.1, WC + ' の 4 コア時ターボ 3.1GHz(https://en.wikichip.org/wiki/i7-6700hq)'],
    'intel-kbl-7700hq': [3.4, 'ultrabookreview の「Max Quad Core Turbo 3.4GHz」(https://ultrabookreview.com/14101-intel-core-i7-7700hq-benchmarks)'],
    'intel-hsw-4700hq': [3.0, 'CPU-Monkey・CPU-Compare の 4 コア時ターボ 3.00GHz(https://www.cpu-monkey.com/en/cpu-intel_core_i7_4700hq)。Notebookcheck(オランダ語版)は 4 コア 3.2GHz と書き食い違う。どちらを採っても MT の誤差は ±3% 以内(感度 3.0→-2.6%・3.2→+2.6%)なので、低い方を採った'],
    'intel-hsw-4690k': [3.7, CM + ' の 4 コア時ターボ(https://www.cpu-monkey.com/en/cpu-intel_core_i5_4690k)'],
    'intel-skl-6600k': [3.6, CM + ' の 4 コア時ターボ(https://www.cpu-monkey.com/en/cpu-intel_core_i5_6600k)'],
    'intel-skl-6700k': [4.0, WC + ' の 2〜4 コア時ターボ 4,000MHz(https://en.wikichip.org/wiki/intel/core i7/i7-6700k)。CPU-Monkey も 4 コア 4.0GHz'],
    'intel-kbl-7600k': [4.0, WC + ' の 4 コア時ターボ(https://en.wikichip.org/wiki/intel/core i5/i5-7600k)'],
    'intel-kbl-7700k': [4.4, 'IgorsLab の表(2〜4 コア 4.4GHz。https://www.igorslab.de/en/intel-kaby-lake-i7-7700k-i7-7700-i5-7600k-i5-7600-2/)。CPU-Monkey も同じ'],
    'intel-cfr-9900k': [4.7, TH + ' の全コアブースト(https://www.tomshardware.com/reviews/intel-core-i9-10900k-cpu-review の比較表)'],
    'intel-cfr-9700k': [4.6, WC + ' の 5〜8 コア時ターボ(https://en.wikichip.org/wiki/9700k)。Hexus・TechPowerUp も 4.6GHz'],
    'intel-cml-10900k': [4.8, TH + ' の全コアブースト 4.8GHz(TVB の 4.9GHz は使わない。https://www.tomshardware.com/reviews/intel-core-i9-10900k-cpu-review)'],
    'intel-cml-10700k': [4.7, 'Hexus・wccftech の全コアターボ 4.7GHz(https://wccftech.com/review/intel-core-i9-10900k-core-i7-10700k-core-i5-10600k-cpu-review-ft-z490-motherboards/2/)'],
  };
  rows.forEach((r) => {
    const [id, name, family, kind, year, gb7, die, tdp, tdpS, uarch, count, smt, baseGHz, boostGHz, l3MB, memory, note] = r;
    P.push({
      id, name, vendor: 'Intel', family, isa: 'x86', kind, year, addedIn: 'old-intel',
      gb7,
      dies: [Object.assign({}, die)],
      // 最大ターボ・パワー(PL2)は ARK に載っていない(設計書 §2.8.2)ので peak は未取得。公表の基本電力だけ
      power: { base: base(tdp, tdpS), peak: null, range: null },
      cfg: { cores: [Object.assign({ type: 'P', uarch, count, smt, baseGHz, boostGHz }, ALLCORE[id] ? { allCoreGHz: ALLCORE[id][0] } : {})], l3MB, memory: memory + '(Intel ARK [公表]。設計書 §2.8.2。チャネル数は未取得)' },
      calib: false,
      notes: note + ' 古い世代のため、構成・クロック・L3・メモリ・TDP は Intel ARK(設計書 §2.8.2。調査 2026-10-26)、ダイ面積は設計書 §2.8.1・§2.8.4([二次]が中心)、GB7 は Geekbench 7 のプロセッサチャートの平均(§2.4。Windows のみの中央値ではない)。1 コアの面積・ブロックの大きさは未取得(ブロックの配置は模式図)。ST 補正 u はデスクトップ SKU の中央値(uCal)かそこに比を掛けた値で、チャート値に合わせた学習内の値のため、ST の一致は検証にならない(確度:低)。' + (ALLCORE[id] ? '全コア負荷時のクロック allCoreGHz ' + ALLCORE[id][0] + 'GHz [二次](取得 2026-11-17): ' + ALLCORE[id][1] + '。' : '全コア負荷時のクロック(allCoreGHz)は出典を確認できず未取得(MT は boost × 係数で計算)。') + '最大ターボ電力(PL2)は未取得。メモリ容量の選択肢・メモリ OC は未対応(DDR3 は選択肢の表にない)。',
    });
  });
})();
