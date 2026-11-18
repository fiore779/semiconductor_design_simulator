// プリセット(古い Core i シリーズ。第2〜10世代のデスクトップ・ノート。2026-11-18 に第1・第3・第5世代の 5 SKU を追加 = 23 SKU。同日 Core 2 世代(E8400・Q9550・Q9650)を追加 = 26 SKU。詳細は docs/research/old-intel-gen135-2026-11-18.md・docs/research/core2-2026-11-18.md。Core 2 は MT が公開値より +16〜24% 高く許容を超える): 2026-11-17 追加(ユーザー指示「古いチップも追加。現在情報がある Core i シリーズだけ」)。
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
  // 2026-11-18 追加(第1・第3・第5世代。ユーザー指示「5、3、1世代の core i が追加されていないので追加してください」)
  const LYN4 = { name: 'Lynnfield 4C', mm2: 296, s: 'sec', nodeId: 'intel-45', note: 'WikiChip: Nehalem・ComputerBase の 296mm²([二次]。設計書 §2.1)。PCIe・DMI を内蔵し、GPU はない' };
  const GFT6 = { name: 'Gulftown 6C', mm2: 239, s: 'sec', nodeId: 'intel-32', note: 'Wikipedia の Core i7 一覧の 239mm²([二次]。設計書 §2.1。Westmere-EP の 248mm² は同じ 6 コアのダイとみられるが食い違い)。GPU はない' };
  const IVB4 = { name: 'Ivy Bridge 4C+GT2', mm2: 160, s: 'sec', nodeId: 'intel-22', note: '設計書 §2.8.1 の 160mm²(Wikipedia。3DCenter と表記が食い違う。[二次]。区分は設計書では [公表] だが原ページは未確認)' };
  const BDW4 = { name: 'Broadwell-H 4C+GT3e', mm2: 182, s: 'sec', nodeId: 'intel-14', note: 'TechPowerUp の CPU DB の 182mm²([二次]。HMC-Tech の比較表も同じ値)。128MB の eDRAM は別の 22nm ダイ(77mm²。HW-Museum。[二次])で、この面積に含めない' };
  // 2026-11-18 追加(Core 2 世代。ユーザー指示「core2も追加してください」。docs/research/core2-2026-11-18.md)
  const WLF2 = { name: 'Wolfdale 2C', mm2: 107, s: 'pub', nodeId: 'intel-45', note: 'Intel の 2007-03-28 の Penryn 資料(https://www.intel.com/pressroom/archive/releases/2007/20070328fact.htm。「デュアルコアの Penryn は 107mm²」。[公表])。Wikipedia の Core 2 一覧(Wolfdale 107mm²)も同じ。L3 はなく、2 コアで共有する L2 6MB を持つ。GPU・メモリコントローラはない(チップセット側)' };
  const YFD4 = { name: 'Yorkfield 4C(Wolfdale ×2。MCM)', mm2: 214, s: 'sec', nodeId: 'intel-45', note: '107mm² のダイ(Intel の 2007 年の資料。[公表])を 2 つ同じパッケージに載せた構成(Wikipedia の Core 2 一覧「2 × 107 mm²」。Tom\'s Hardware・HotHardware は 214mm² と記載。[二次])。2 つのダイは FSB 経由でつながり、L2 は各ダイの 6MB(合計 12MB)。ダイが 2 つの構成だが、モデルでは面積 214mm² の 1 つのダイとして扱う(Zen の「CCD ×2」と同じ書き方)' };
  const reuse = (d, why) => Object.assign({}, d, { note: d.note + '。' + why });

  // [id, 名前, family, kind, 年, GB7 行, ダイ, TDP(W), TDP 区分, uarch, コア数, スレッド(smt), base GHz, boost GHz, L3 MB, メモリ, 備考]
  const rows = [
    ['intel-nhm-860', 'Core i7-860', 'Nehalem', 'pc', 2009, 'i7-860(4c)', LYN4, 95, 'sec', 'Nehalem', 4, 2, 2.8, 3.46, 8, 'DDR3-1333', '第1世代(45nm、Lynnfield)。Intel ARK のページが取得できず、構成・クロック・TDP は Wikipedia と検索の要約([二次])。メモリは 2 チャネル(Wikipedia)。'],
    ['intel-wsm-980x', 'Core i7-980X', 'Westmere', 'pc', 2010, 'i7-980X(6c、参考: Westmere)', GFT6, 130, 'sec', 'Nehalem', 6, 2, 3.33, 3.6, 12, 'DDR3-1066', '第1世代(32nm、Gulftown)。6 コア。Intel ARK のページが取得できず、構成・クロックは Wikipedia、TDP 130W は Intel の製品概要(検索の要約。[二次])。メモリは 3 チャネル(Intel の製品概要・Wikipedia)。'],
    ['intel-wlf-e8400', 'Core 2 Duo E8400', 'Wolfdale', 'pc', 2008, 'E8400(2c)', WLF2, 65, 'sec', 'Penryn', 2, 1, 3.0, 3.0, 0, '', 'Core 2 世代(45nm、Wolfdale。2008-01 発売)。2 コア・ハイパースレッディングなし・ターボなし(クロックは 3.0GHz 固定)・L2 6MB 共有・L3 なし・FSB 1333MT/s・LGA775。構成・クロック・TDP 65W は Intel ARK の記載(検索で得た要約。ページ本体は取得できず [二次]。Intel の Quick Reference Guide の 2008 年版も 3GHz・45nm・6MB・1333MT/s で一致)。Geekbench 7 の Windows の標本のうち 3 件はオーバークロックで、中央値は定格に近い。'],
    ['intel-yfd-q9550', 'Core 2 Quad Q9550', 'Yorkfield', 'pc', 2008, 'Q9550(4c)', YFD4, 95, 'sec', 'Penryn', 4, 1, 2.83, 2.83, 0, '', 'Core 2 世代(45nm、Yorkfield。2008-03 発売)。4 コア(2 コアのダイ 2 つの MCM)・ハイパースレッディングなし・ターボなし・L2 は 6MB ×2(各ダイの 2 コアで共有。合計 12MB)・L3 なし・FSB 1333MT/s・LGA775。構成・クロック・TDP 95W は Wikipedia の Core 2 一覧と検索の要約([二次]。Intel ARK のページは取得できず)。Geekbench 7 の Windows の標本 14 件のうち 5 件はオーバークロック(定格だけの中央値は 416 / 1171)。'],
    ['intel-yfd-q9650', 'Core 2 Quad Q9650', 'Yorkfield', 'pc', 2008, 'Q9650(4c)', reuse(YFD4, 'Q9550 と同じ Yorkfield(E0 ステッピング)として面積を流用([推定]。個別の確認は未取得)'), 95, 'sec', 'Penryn', 4, 1, 3.0, 3.0, 0, '', 'Core 2 世代(45nm、Yorkfield。2008-08 発売)。Q9550 と同じ構成でクロックだけ 3.0GHz。構成・クロック・TDP 95W は Wikipedia の Core 2 一覧と検索の要約([二次]。Intel ARK のページは取得できず)。Geekbench 7 の Windows の標本 13 件のうち 4 件はオーバークロック(定格だけの中央値は 449 / 1321)。'],
    ['intel-snb-2600k', 'Core i7-2600K', 'Sandy Bridge', 'pc', 2011, 'i7-2600K(4c)', SB4, 95, 'pub', 'Sandy Bridge', 4, 2, 3.4, 3.8, 8, 'DDR3-1333', '第2世代(32nm)。4C+GT2(HD Graphics 3000)ダイ。'],
    ['intel-snb-2500k', 'Core i5-2500K', 'Sandy Bridge', 'pc', 2011, 'i5-2500K(4c)', reuse(SB4, '2600K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 95, 'pub', 'Sandy Bridge', 4, 1, 3.3, 3.7, 6, 'DDR3-1333', '第2世代(32nm)。ハイパースレッディングなし。'],
    ['intel-snb-2720qm', 'Core i7-2720QM', 'Sandy Bridge', 'mobile-pc', 2011, 'i7-2720QM(4c、モバイル)', reuse(SB4, 'モバイル(QM)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 45, 'pub', 'Sandy Bridge (モバイル)', 4, 2, 2.2, 3.3, 6, 'DDR3-1600', '第2世代モバイル(32nm)。'],
    ['intel-ivb-3770k', 'Core i7-3770K', 'Ivy Bridge', 'pc', 2012, 'i7-3770K(4c)', IVB4, 77, 'pub', 'Ivy Bridge', 4, 2, 3.5, 3.9, 8, 'DDR3-1600', '第3世代(22nm)。4C+GT2(HD Graphics 4000)ダイ。構成・クロック・TDP は Intel ARK(2026-11-18 取得)。'],
    ['intel-ivb-3570k', 'Core i5-3570K', 'Ivy Bridge', 'pc', 2012, 'i5-3570K(4c)', reuse(IVB4, '3770K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 77, 'pub', 'Ivy Bridge', 4, 1, 3.4, 3.8, 6, 'DDR3-1600', '第3世代(22nm)。ハイパースレッディングなし。構成・クロック・TDP は Intel ARK(2026-11-18 取得)。'],
    ['intel-hsw-4770k', 'Core i7-4770K', 'Haswell', 'pc', 2013, 'i7-4770K(4c)', HSW4, 84, 'pub', 'Haswell', 4, 2, 3.5, 3.9, 8, 'DDR3-1600', '第4世代(22nm)。'],
    ['intel-hsw-4790k', 'Core i7-4790K', 'Haswell', 'pc', 2014, 'i7-4790K(4c)', reuse(HSW4, 'Haswell Refresh(Devil\'s Canyon)も同じ 4C+GT2 ダイとして流用([推定]。個別の確認は未取得)'), 88, 'pub', 'Haswell', 4, 2, 4.0, 4.4, 8, 'DDR3-1600', '第4世代 Refresh(22nm)。'],
    ['intel-hsw-4690k', 'Core i5-4690K', 'Haswell', 'pc', 2014, 'i5-4690K(4c)', reuse(HSW4, '4790K と同じ 4C ダイからハイパースレッディングと L3 2MB を無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 88, 'pub', 'Haswell', 4, 1, 3.5, 3.9, 6, 'DDR3-1600', '第4世代 Refresh(22nm)。ハイパースレッディングなし。'],
    ['intel-hsw-4700hq', 'Core i7-4700HQ', 'Haswell', 'mobile-pc', 2013, 'i7-4700HQ(4c、モバイル)', reuse(HSW4, 'モバイル(HQ)も 4C+GT2 のダイと考えられる([推定]。個別の確認は未取得)'), 47, 'sec', 'Haswell (モバイル)', 4, 2, 2.4, 3.4, 6, 'DDR3L-1600', '第4世代モバイル(22nm)。TDP 47W は ARK を取得できず [二次]。'],
    ['intel-bdw-5775c', 'Core i7-5775C', 'Broadwell', 'pc', 2015, 'i7-5775C(4c)', BDW4, 65, 'pub', 'Broadwell', 4, 2, 3.3, 3.7, 6, 'DDR3L-1600', '第5世代(14nm、Broadwell-H)。デスクトップ向けの Broadwell はこの SKU(と i5-5675C)だけ。128MB の eDRAM(L4)と Iris Pro 6200(GT3e)を持つが、モデルは L4 を扱わない。GB7 は標本が少ない(Windows 7 件)。構成・クロック・TDP は Intel ARK(2026-11-18 取得)。'],
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
    'intel-nhm-860': [2.93, "AnandTech の i7-860 のターボ表(全 4 コア 2.93GHz。基本 2.8GHz の 1 ビン上。https://at-web1.www.anandtech.com/show/2832/5 の検索抜粋)"],
    'intel-ivb-3770k': [3.7, WC + ' の 4 コア時ターボ 3,700MHz(https://en.wikichip.org/wiki/intel/core i7/i7-3770k の検索抜粋)'],
    'intel-bdw-5775c': [3.6, WC + ' の 4 コア時ターボ 3,600MHz(https://en.wikichip.org/wiki/intel/core i7/i7-5775c の検索抜粋)'],
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
  // Core 2 世代: L3 がなく(l3MB 0)、L2 が最終段のキャッシュ。メモリコントローラはチップセット側(FSB 1333MT/s)
  const CORE2 = {
    'intel-wlf-e8400': { l2: '合計 6MB(2 コアで共有)', memory: 'FSB 1333MT/s(メモリはチップセット側。DDR2・DDR3 の板がある。メモリ容量・種別の選択肢は未対応)' },
    'intel-yfd-q9550': { l2: '合計 12MB(6MB ×2。各ダイの 2 コアで共有)', memory: 'FSB 1333MT/s(メモリはチップセット側。DDR2・DDR3 の板がある。メモリ容量・種別の選択肢は未対応)' },
    'intel-yfd-q9650': { l2: '合計 12MB(6MB ×2。各ダイの 2 コアで共有)', memory: 'FSB 1333MT/s(メモリはチップセット側。DDR2・DDR3 の板がある。メモリ容量・種別の選択肢は未対応)' },
  };
  rows.forEach((r) => {
    const [id, name, family, kind, year, gb7, die, tdp, tdpS, uarch, count, smt, baseGHz, boostGHz, l3MB, memory, note] = r;
    P.push({
      id, name, vendor: 'Intel', family, isa: 'x86', kind, year, addedIn: 'old-intel',
      gb7,
      dies: [Object.assign({}, die)],
      // 最大ターボ・パワー(PL2)は ARK に載っていない(設計書 §2.8.2)ので peak は未取得。公表の基本電力だけ
      power: { base: base(tdp, tdpS), peak: null, range: null },
      cfg: { cores: [Object.assign({ type: 'P', uarch, count, smt, baseGHz, boostGHz }, ALLCORE[id] ? { allCoreGHz: ALLCORE[id][0] } : {})], l3MB, ...(CORE2[id] ? { l2: CORE2[id].l2, memory: CORE2[id].memory } : { memory: memory + '(Intel ARK [公表]。設計書 §2.8.2。チャネル数は未取得)' }) },
      calib: false,
      notes: note + ' 古い世代のため、構成・クロック・L3・メモリ・TDP は Intel ARK(設計書 §2.8.2。調査 2026-10-26)、ダイ面積は設計書 §2.8.1・§2.8.4([二次]が中心)、GB7 は設計書 §2.4 の行の区分のとおり([チャート]=Geekbench 7 のプロセッサチャートの平均、[実測]=Geekbench Browser の Windows 投稿のみの中央値)。1 コアの面積・ブロックの大きさは未取得(ブロックの配置は模式図)。ST 補正 u はデスクトップ SKU の中央値(uCal)かそこに比を掛けた値で、チャート値に合わせた学習内の値のため、ST の一致は検証にならない(確度:低)。' + (ALLCORE[id] ? '全コア負荷時のクロック allCoreGHz ' + ALLCORE[id][0] + 'GHz [二次](取得 2026-11-17): ' + ALLCORE[id][1] + '。' : '全コア負荷時のクロック(allCoreGHz)は出典を確認できず未取得(MT は boost × 係数で計算)。') + '最大ターボ電力(PL2)は未取得。メモリ容量の選択肢・メモリ OC は未対応(DDR3 は選択肢の表にない)。',
    });
  });
})();
