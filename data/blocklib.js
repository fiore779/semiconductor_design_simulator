// 部品ライブラリ用: 1コア単位の面積(設計書 §2.3 を転記)。uarch × プロセス単位の表(2026-11-09 に整理。調査: docs/research/core-areas-2026-11-09.md)。
// キー = { uarch, nodeId(そのコアが載るダイのプロセス), chip または chips(その SKU 固有の値のときだけ。null/なし なら同じ uarch・同じプロセスの全プリセット), coreTypes(あれば、そのコア種別だけ) }。
// 値  = { noL2Mm2, withL2Mm2, l2KB, s, basis, note, src }。未取得は null。
//   s    : 区分。'pub'=公表(メーカー資料) / 'sec'=二次(第三者の測定・ダイ写真の注釈・掲示板。**二次の測定値を割り算・足し算しただけの行もここ**: クラスタ÷4、L2 を足した値など。basis は 'estimate') /
//          'est'=推定・流用(二次の測定値そのものが無い SKU・コア種別に、別の値を根拠つきで当てた行。basis は 'estimate' か 'reuse')。実測(このプロジェクトで測った値)は無い。
//   variant: 同じ uarch・同じプロセスでダイの種類が違う行の区別(Zen 5 の CCD と Strix Point のモノリシックなど)。同じ uarch・プロセス・variant・L2 なら SKU が違っても同じ面積(tests/mix.test.js)
//   basis: 'measured'=出典の測定値・公表値そのもの(s は pub か sec) / 'reuse'=流用(同じ uarch・同じプロセスの別 SKU の値。s='est') / 'estimate'=推定(比や差分から計算。式を note に書く。s='est')。
//          移植(プロセス違いの換算)は表ではなく js/model/blocklib.js の build が compat.portArea で行い、区分『移植』として note に書く。
// 設計書に無い値・出典が無い値は作らない(推測で埋めない)。Arm(Cortex-X1〜A78 系、Neoverse、C1/C2)・Apple の大半は未取得で、部品は「不明」になる。
// 注意: Real World Tech の値は投稿者自身が「ざっくり」と断っており、L2 の按分の仕方が不明なので L2 込みの値は参考扱い。
// 注意: 値は「L2 込み(私有 L2 はそのまま、共有 L2 のクラスタはクラスタ面積÷コア数)」を withL2Mm2 に入れる。部品をダイに置くときはこの値を使う(js/model/blocklib.js placeAreaMm2)。
// 出典 URL は docs/research/core-areas-2026-11-09.md の 5 章(Game.Keeps.Loading の測定を報じた Wccftech、AnandTech フォーラム、r/hardware〔検索要約のみ〕、Locuza、Fritzchens Fritz など)。
window.SDS_DATA = window.SDS_DATA || {};
(function () {
const LNL = ['intel-lnl-268v', 'intel-lnl-258v', 'intel-lnl-256v'];
const ARL = ['intel-arl-285k', 'intel-arl-265k', 'intel-arl-275hx'];
const ADL_E = ['intel-adl-12900k', 'intel-adl-12700k', 'intel-adl-12600k'];
const RPL_E = ['intel-rpl-13900k', 'intel-rpl-14900k', 'intel-rpl-13700k', 'intel-rpl-14700k', 'intel-rpl-13600k', 'intel-rpl-14600k', 'intel-rpl-14700hx', 'intel-rpl-13980hx', 'intel-rpl-14900hx'];
window.SDS_DATA.blocklibAreas = [
  // ---- AMD ----
  { uarch: 'Zen 1', chip: null, nodeId: 'gf-14', noL2Mm2: 5.5, withL2Mm2: 7, l2KB: 512, s: 'pub', basis: 'measured', note: 'Zeppelin(14nm)。AMD の ISSCC 資料(4コアのブロックで 44 mm²、L3 16 mm² 込み)。L2 なしは 7 − 1.5(L2 512KB)の計算値' },
  { uarch: 'Zen+', chip: null, nodeId: 'gf-12', noL2Mm2: 5.5, withL2Mm2: 7, l2KB: 512, s: 'est', basis: 'reuse', note: '流用(根拠: Pinnacle Ridge は Zeppelin と同じ配置・同じダイ面積 213 mm²〔二次: AT-Z2〕。Zen 1 の値をそのまま使う。個別の測定は未取得)' },
  { uarch: 'Zen 3', chip: null, nodeId: 'tsmc-n7', noL2Mm2: 3.24, withL2Mm2: 4.05, l2KB: 512, s: 'sec', basis: 'estimate', note: 'Vermeer CCD(N7)。Locuza(LZ-ADL)の 3.24(電源バンク込み。3.09 の説もある)に L2 0.81 mm²(記事内で 0.70〜0.81 の幅)を足した推定。Cezanne(5800U。同じ N7)にも同じ値を当てる(流用)' },
  { uarch: 'Zen 3 (Cezanne)', chip: null, nodeId: 'tsmc-n7', noL2Mm2: 3.24, withL2Mm2: 4.05, l2KB: 512, s: 'est', basis: 'reuse', note: '流用(根拠: uarch 記録を「Zen 3」から Cezanne 専用に分けた〔2026-11-14。ST 補正 u だけが違う〕ので、「Zen 3」の行〔Vermeer CCD。Locuza の 3.24 に L2 0.81 mm² を足した推定〕と同じ値を当てる。同じ N7。Cezanne 自体の個別の測定は未取得)' },
  { uarch: 'Zen 3 (Cezanne U)', chip: null, nodeId: 'tsmc-n7', noL2Mm2: 3.24, withL2Mm2: 4.05, l2KB: 512, s: 'est', basis: 'reuse', note: '流用(根拠: 5800U は uarch 記録を「Zen 3 (Cezanne)」から更に「Zen 3 (Cezanne U)」に分けた〔2026-11-15。ST 補正 u だけが違う〕ので、「Zen 3」の行〔Vermeer CCD。Locuza の 3.24 に L2 0.81 mm² を足した推定〕と同じ値を当てる。同じ N7。Cezanne 自体の個別の測定は未取得)' },
  { uarch: 'Zen 3+ (Rembrandt-R)', chip: null, nodeId: 'tsmc-n6', noL2Mm2: 3.24, withL2Mm2: 4.05, l2KB: 512, s: 'est', basis: 'reuse', note: '流用(根拠: uarch 記録を「Zen 3」から Zen 3+ 専用に分けた〔2026-11-15。ST 補正 u だけが違う〕ので、「Zen 3」の行〔Vermeer CCD。Locuza の 3.24 に L2 0.81 mm² を足した推定〕と同じ値を当てる。Rembrandt-R は N6 だが、N7 からの寸法換算はしていない〔Zen 3 の値をそのまま使う。個別の測定は未取得〕)' },
  { uarch: 'Zen 4', chip: null, nodeId: 'tsmc-n5', noL2Mm2: null, withL2Mm2: 3.84, l2KB: 1024, s: 'sec', basis: 'measured', note: '5nm(L2 1MB 込み)。報道・フォーラムの見積もり(検索要約。docs/research/block-areas.md で [二次] 扱い。旧: pub としていたのを 2026-11-09 に sec に直した)。L2 なしの値は未取得。Phoenix(N4)は移植換算' },
  { uarch: 'Zen 4', chip: 'amd-zen4-7840hs', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 3.84, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Phoenix の N4 は N5 の派生で、Zen 4 の値 3.84 をそのまま使う。Phoenix での測定は未取得。3.84 自体の確度が低い〔[二次]・検索要約〕)' },
  // Phoenix 2(Ryzen 5 7545U。Zen 4 ×2 + Zen 4c ×4)。コアの測定は未取得なので、Zen 4 は Phoenix 1 と同じ値、Zen 4c は AMD の公表値(Bergamo、TSMC N5)を流用する
  { uarch: 'Zen 4', chip: 'amd-zen4-7545u', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 3.84, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Phoenix 2 の Zen 4 は Phoenix 1 と同じコア設計で、7840HS の値 3.84 をそのまま使う。Phoenix 2 での測定は未取得。3.84 自体の確度が低い〔[二次]・検索要約〕)' },
  { uarch: 'Zen 4c', chip: 'amd-zen4-7545u', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 2.48, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: AMD が Bergamo(TSMC N5)で公表した Zen 4c のコア面積 2.48 mm² は Zen 4 の 3.84 mm² より約 35% 小さい〔[二次] TechPowerUp「AMD Zen 4c: Not an E-core, 35% smaller than Zen 4 but with identical IPC」、wccftech の記事。2026-11-16 に検索結果で確認、原ページの本文は未取得〕。出典により L2 込みかの記述が異なる。Phoenix 2(N4)での測定は未取得で、N5 の値をそのまま使う)' },
  { uarch: 'Zen 5', variant: 'CCD', chip: null, chips: ['amd-zen5-9700x', 'amd-zen5-9800x3d', 'amd-zen5-9950x3d', 'amd-zen5-9950x', 'amd-strixhalo-395'], nodeId: 'tsmc-n4', noL2Mm2: 3.723, withL2Mm2: 4.772, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Granite Ridge CCD(N4P)。Fritzchens Fritz(9600X の CCD 写真の説明欄の寸法。FF-Z5)。Strix Halo の CCD も同じ Zen 5 CCD' },
  { uarch: 'Zen 5', variant: 'Strix Point(モノリシック)', chip: 'amd-strix-hx370', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 4.15, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Strix Point(N4P)。r/hardware の表(「私有キャッシュ込み」)・AnandTech フォーラム(検索要約。原ページ未確認)。確度は低〜中。CCD の Zen 5(4.772)より小さい(モバイル版は FPU が狭いとされる)' },
  { uarch: 'Zen 5c', variant: 'Strix Point(モノリシック)', chip: 'amd-strix-hx370', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 3.09, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Strix Point(N4P)。同上。TechPowerUp の「Zen 5c は Zen 5 より約 25% 小さい」と整合(3.09/4.15 = -26%)' },
  // Kraken Point(Ryzen AI 7 350)は Strix Point の小型版で、コアは同じ Zen 5 + Zen 5c(docs/research/kraken-point.md の 4 章「Strix Point との差」。[二次] Wikipedia・WikiChip「Strix Point と Krackan Point」)。ダイの測定は未取得なので Strix Point の値を流用する
  { uarch: 'Zen 5', variant: 'Strix Point(モノリシック)', chip: 'amd-kraken-350', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 4.15, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Kraken Point は Strix Point の小型版で、コアは同じ Zen 5〔docs/research/kraken-point.md の 4 章。[二次]〕。Strix Point の値 4.15 をそのまま使う。Kraken Point 自体の測定は未取得)' },
  { uarch: 'Zen 5c', variant: 'Strix Point(モノリシック)', chip: 'amd-kraken-350', nodeId: 'tsmc-n4', noL2Mm2: null, withL2Mm2: 3.09, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Kraken Point は Strix Point の小型版で、コアは同じ Zen 5c〔docs/research/kraken-point.md の 4 章。[二次]〕。Strix Point の値 3.09 をそのまま使う。Kraken Point 自体の測定は未取得)' },
  // ---- Intel ----
  { uarch: 'Golden Cove', chip: null, nodeId: 'intel-7', noL2Mm2: 5.37, withL2Mm2: 7.43, l2KB: 1280, s: 'sec', basis: 'measured', note: 'Alder Lake(Intel 7)。出典 Locuza(ダイ写真の注釈)。設計書 §2.8.4(Locuza の推定値)' },
  { uarch: 'Raptor Cove', chip: null, nodeId: 'intel-7', noL2Mm2: null, withL2Mm2: 8.08, l2KB: 2048, s: 'sec', basis: 'measured', note: 'Raptor Lake-S(Intel 7、L2 2MB)。Fritzchens Fritz(WCCF-RPL)。L2 なしの 7.429 は「新しい L2 なし」の意味があいまいで採らない(block-areas.md の食い違い 3)' },
  { uarch: 'Raptor Cove (HX)', chip: null, nodeId: 'intel-7', noL2Mm2: null, withL2Mm2: 8.08, l2KB: 2048, s: 'est', basis: 'reuse', note: '流用(根拠: uarch 記録を「Raptor Cove」から HX 専用に分けた〔2026-11-15。ST 補正 u だけが違う〕ので、「Raptor Cove」の行〔Raptor Lake-S。Fritzchens Fritz の 8.08 mm²〕と同じ値を当てる。HX はデスクトップと同じ 8P+16E ダイ(Intel 7)の転用で、同じプロセス。HX 個別の測定は未取得)' },
  { uarch: 'Gracemont', chip: null, chips: ADL_E, nodeId: 'intel-7', noL2Mm2: null, withL2Mm2: 2.17, l2KB: 512, s: 'sec', basis: 'estimate', note: 'Alder Lake-S(Intel 7、クラスタ L2 2MB)。Locuza のクラスタ 8.66 mm² ÷ 4 = 2.17(推定: 1 個はクラスタ÷4)。L2 なしは 1.6〜1.7(Locuza)' },
  { uarch: 'Gracemont', chip: null, chips: RPL_E, nodeId: 'intel-7', noL2Mm2: 1.588, withL2Mm2: 2.57, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Raptor Lake-S(Intel 7、クラスタ L2 4MB の 1/4 込み)。Fritzchens Fritz(WCCF-RPL)' },
  { uarch: 'Redwood Cove', chip: null, nodeId: 'intel-4', noL2Mm2: null, withL2Mm2: 5.33, l2KB: 2048, s: 'sec', basis: 'measured', note: 'Meteor Lake(Intel 4、L2 2MB)。Game.Keeps.Loading の測定(WCCF-PTL の比較表。AnandTech フォーラムでは「ダイ写真の注釈で 5.33」)。5.05 の値(reddit。出典なし)もある' },
  { uarch: 'Crestmont', chip: null, nodeId: 'intel-4', coreTypes: ['E'], noL2Mm2: 1.04, withL2Mm2: 1.48, l2KB: 512, s: 'sec', basis: 'estimate', note: 'Meteor Lake の E(Intel 4、クラスタ L2 2MB)。Game.Keeps.Loading のクラスタ 5.90 mm² ÷ 4 = 1.48(推定: 1 個はクラスタ÷4)。L2 なしは 1.04' },
  { uarch: 'Crestmont', chip: 'intel-mtl-185h', nodeId: 'intel-4', coreTypes: ['LP-E'], noL2Mm2: null, withL2Mm2: 1.48, l2KB: 512, s: 'est', basis: 'estimate', note: '推定(根拠: Crestmont の E の値 1.48 を当てた。LP-E は実際は SoC タイル〔TSMC N6〕上の 2 コアで L2 構成も違うため、Intel 4 → N6 の移植換算は未適用。確度は低い。LP-E の測定値は未取得)' },
  { uarch: 'Lion Cove', chip: null, chips: LNL, nodeId: 'tsmc-n3b', noL2Mm2: 3.43, withL2Mm2: 4.53, l2KB: 2560, s: 'sec', basis: 'measured', note: 'Lunar Lake(N3B、L2 2.5MB)。r/hardware の表(Kurnal のダイ写真から。「私有キャッシュはコア面積に含め、共有キャッシュは含めない」。検索要約・原ページ未確認)。Game.Keeps.Loading は 4.45、AnandTech フォーラムは 4.67。L2 なしは 3.43(AnandTech フォーラム DavidC1)' },
  { uarch: 'Lion Cove', chip: null, chips: ARL, nodeId: 'tsmc-n3b', noL2Mm2: 3.43, withL2Mm2: 4.75, l2KB: 3072, s: 'est', basis: 'estimate', note: '推定(根拠: Lunar Lake の 4.53 + L2 の増分 0.5MB × 0.44 mm²/MB。コアの論理部分は同じで L2 だけ 2.5→3MB と仮定。Arrow Lake での Lion Cove の測定は未取得)' },
  { uarch: 'Skymont', chip: null, chips: LNL, nodeId: 'tsmc-n3b', noL2Mm2: 1.09, withL2Mm2: 1.73, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Lunar Lake の LP-E(N3B、クラスタ L2 4MB の 1/4 込み)。r/hardware の表 1.73(検索要約)/ AnandTech フォーラム 1.75。クラスタ 6.79(Game.Keeps.Loading)÷ 4 = 1.70。L2 なしは 1.09' },
  { uarch: 'Skymont (Arrow Lake リング E)', chip: null, chips: ARL, nodeId: 'tsmc-n3b', noL2Mm2: null, withL2Mm2: 1.73, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Lunar Lake の Skymont と同じ N3B・クラスタ L2 も同じ 4MB。Arrow Lake ではリング接続などクラスタ周りが違うので ±10% の誤差を見込む。Arrow Lake での測定は未取得)' },
  { uarch: 'Cougar Cove', chip: null, nodeId: 'intel-18a', noL2Mm2: null, withL2Mm2: 4.49, l2KB: 3072, s: 'sec', basis: 'measured', note: 'Panther Lake-H(Intel 18A、L2 3MB)。Game.Keeps.Loading の測定(WCCF-PTL)。**暫定値**(写真は 2P+E クラスタ 3 個の別構成。L2 を含むかは記事に書かれていない)。出典 1 つ' },
  { uarch: 'Darkmont', chip: null, coreTypes: ['E'], nodeId: 'intel-18a', noL2Mm2: 0.95, withL2Mm2: 1.62, l2KB: 1024, s: 'sec', basis: 'estimate', note: 'Panther Lake-H の E(Intel 18A、クラスタ L2 4MB)。Game.Keeps.Loading のクラスタ 6.47 mm² ÷ 4 = 1.62(二次の測定値を割り算した推定)。L2 なし 0.95(WCCF-PTL の表。本文の箇条書きとは食い違う)' },
  { uarch: 'Darkmont', chip: null, coreTypes: ['LP-E'], nodeId: 'intel-18a', noL2Mm2: 0.95, withL2Mm2: 1.62, l2KB: 1024, s: 'est', basis: 'reuse', note: '流用(根拠: Panther Lake の LP-E は E と同じ Darkmont で、同じ 18A のタイル上。E の値 1.62〔クラスタ 6.47 ÷ 4〕をそのまま使う。LP-E クラスタの L2 容量は未確認なので確度は低い)' },
  // ---- Arm・Qualcomm・NVIDIA ----
  { uarch: 'Oryon Prime', chip: 'qc-8elite', nodeId: 'tsmc-n3e', noL2Mm2: 2.14, withL2Mm2: 5.22, l2KB: 6144, s: 'sec', basis: 'measured', note: 'Snapdragon 8 Elite の Oryon L(性能)。ダイ写真の注釈(Real World Tech 掲示板)。L2 込みは 6MB L2 の按分' },
  { uarch: 'Oryon Performance', chip: 'qc-8elite', nodeId: 'tsmc-n3e', noL2Mm2: 0.91, withL2Mm2: 1.9, l2KB: 2048, s: 'sec', basis: 'measured', note: 'Snapdragon 8 Elite の Oryon M(効率)。ダイ写真の注釈(Real World Tech 掲示板)。L2 2MB' },
  { uarch: 'Cortex-X925', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 2.784, withL2Mm2: 3.335, l2KB: 2048, s: 'sec', basis: 'measured', note: 'Dimensity 9400(3nm)。ダイ写真の注釈(Baidu Tieba、Real World Tech 掲示板経由)。L2 2MB' },
  { uarch: 'Cortex-X925', chip: 'nv-gb10', nodeId: 'tsmc-n3e', noL2Mm2: 2.784, withL2Mm2: 3.335, l2KB: 2048, s: 'est', basis: 'reuse', note: '流用(根拠: Dimensity 9400 の X925 と同じ N3E・L2 2MB。GB10 の S-die での測定は未取得)' },
  { uarch: 'Cortex-X4', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 1.405, withL2Mm2: 1.687, l2KB: 1024, s: 'sec', basis: 'measured', note: 'Dimensity 9400(3nm)。同上。L2 1MB' },
  { uarch: 'Cortex-A720', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 0.816, withL2Mm2: 0.976, l2KB: 512, s: 'sec', basis: 'measured', note: 'Dimensity 9400(3nm)。同上。L2 0.5MB' },
];
})();
