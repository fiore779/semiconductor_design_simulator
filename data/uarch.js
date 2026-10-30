// マイクロアーキテクチャ(設計書 §2.7.1・§2.7.5b・§2.7.5c・§2.8.3 を転記。2026-10-27)。
// 値は数値または null(未取得)。推測で埋めない。他のコアの値を準用したものは必ず note に明記する。
// s はレコード全体の主な出典: 'sec'=解説・Wikipedia 等。メーカー資料(Arm SOG など)で確認できた項目は note に書く(レコード単位では pub にしない)。
//   width      = rename/allocate(dispatch)幅。シミュレーターの「発行幅 W」に使う(§5.2.1)。decode は decodeWidth。
//   rob        = リオーダー窓(エントリ)。資料により定義が違うものは note に書く。
//   l2KB       = L2 容量を**コアあたり**に直した値。クラスタ共有の L2(Apple・Oryon・Skymont など)は、共有コア数で割った値(note に書く)。
//   brPenalty  = 分岐ミスペナルティ(サイクル。µop キャッシュ命中時)。
//   l1dKB / l1dLat / l2KB / l2Lat / l3Lat = L1D 容量・遅延、L2 容量(コアあたり)・遅延、L3 遅延。
//   mshr       = 同時ミス処理数(fill buffer / ミスキュー)。
//   uCal       = 校正済みの ST 補正 u(定数)。{ u, n, date, basis }。代表(calib:true)1 件ではなく、複数 SKU の中央値で決めた値(設計書 §5.3.0 M6 第 4 段)。
//                calib フラグ(校正の代表)とは別で、代表の u がある uarch はそちらを優先。GB7 付き Golden/Raptor プリセットの追加や GB7 更新でも tests/perf.test.js の再計算テストが落ちる。その場合は uCal の u・n・date・basis を見直し、設計書 §5.3.0 の学習内・LOO の表を作り直す。
//   smt        = 1 or 2。vecBits = ベクトル幅(bit)。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.uarch = (function () {
  const u = (o) => Object.assign({
    decodeWidth: null, width: null, rob: null, brPenalty: null, l1dKB: null, l1dLat: null, l2KB: null, l2Lat: null,
    l3Lat: null, mshr: null, smt: 1, vecBits: null, inOrder: false, uCal: null, s: 'sec', note: '',
  }, o);
  return {
    // ---- AMD ----
    'Zen 1': u({ decodeWidth: 4, width: 6, rob: 192, brPenalty: 19, l1dKB: 32, l1dLat: 4, l2KB: 512, l2Lat: 17, l3Lat: 40, smt: 2, vecBits: 128, note: 'AVX2 は128bit×2サイクル。ROB は WikiChip の検索要約(Zen 1 そのものかは未確認)' }),
    'Zen+': u({ decodeWidth: 4, width: 6, rob: 192, note: 'width・ROB・分岐ミスは Zen 1 の値を準用(WikiChip は Zen+ のパイプラインを Zen と同一と記載)', brPenalty: 19, l1dKB: 32, l1dLat: 4, l2KB: 512, l2Lat: 12, l3Lat: 35, smt: 2, vecBits: 128 }),
    'Zen 3': u({ rob: 256, l2KB: 512, l2Lat: 12, l3Lat: 46, smt: 2, vecBits: 256, note: '整数発行10/clk。MSHR: L2→L3 最大64、L3→DRAM 最大192' }),
    'Zen 4': u({ decodeWidth: 4, width: 6, rob: 320, l2KB: 1024, l2Lat: 14, smt: 2, vecBits: 512, note: 'AVX-512 は256bit×2で実行。op cache から最大9 macro-op/clk' }),
    'Zen 5': u({ decodeWidth: 8, width: 8, rob: 448, l1dKB: 48, l1dLat: 4, l2KB: 1024, l2Lat: 14, l3Lat: 46, smt: 2, vecBits: 512, note: 'モバイルは256bit。L3 遅延は Strix Point 実測(モバイル品)' }),
    'Zen 5c': u({ decodeWidth: 8, width: 8, rob: 448, l1dKB: 48, l1dLat: 4, l2KB: 1024, l2Lat: 14, smt: 2, vecBits: 256, note: 'Zen 5 と同アーキテクチャ。差はクロックと L3 容量。ROB 等は Zen 5 に準じるが Zen 5c 個別は未取得' }),
    // ---- Intel ----
    'Golden Cove': u({ uCal: { u: 112.3, n: 11, date: '2026-10-30', basis: 'Golden Cove 4 件+Raptor Cove 7 件(14700HX 含む)の SKU 別 u〔GB7 ST ÷ 補正前の予測〕の中央値 112.30(14700HX を除くと 112.74)。u は SKU 別に 95.7〜116.4。両 uarch の個別中央値は 111.7 と 112.3 でほぼ同じため統合' }, width: 6, decodeWidth: 6, rob: 512, l2KB: 1280, smt: 2, vecBits: 256, note: 'AVX-512 は公式非対応' }),
    'Raptor Cove': u({ uCal: { u: 112.3, n: 11, date: '2026-10-30', basis: 'Golden Cove 4 件+Raptor Cove 7 件(14700HX 含む)の SKU 別 u〔GB7 ST ÷ 補正前の予測〕の中央値 112.30(14700HX を除くと 112.74)。u は SKU 別に 95.7〜116.4。両 uarch の個別中央値は 111.7 と 112.3 でほぼ同じため統合' }, width: 6, decodeWidth: 6, rob: 512, l2KB: 2048, smt: 2, vecBits: 256, note: 'Golden Cove の値を準用(Chips and Cheese は差を L2 容量と L2 遅延 +1 サイクルとだけ記載。幅・ROB の差の記載はない)' }),
    'Gracemont': u({ decodeWidth: 6, rob: 256, l1dLat: 3, l2KB: 512, l2Lat: 17, vecBits: 128, note: 'デコード6(3×2クラスタ)。rename 幅は未取得なので上限は decodeWidth を使う。L2 は 2MB/4コア共有 → コアあたり 512KB に換算' }),
    'Crestmont': u({ decodeWidth: 6, rob: 256, l1dLat: 3, l2Lat: 20, vecBits: 128, note: 'rename 幅は未取得(設計書 §2.7.1 は 6-wide と記載。デコード幅として扱い、上限は decodeWidth)。L2 容量は未取得' }),
    'Redwood Cove': u({ decodeWidth: 6, l2KB: 2048, l2Lat: 16, smt: 2, vecBits: 256, note: 'rename 幅は未取得(デコード6のみ)' }),
    'Lion Cove': u({ width: 8, decodeWidth: 8, rob: 576, l1dKB: 192, l1dLat: 9, l2KB: 3072, l2Lat: 17, l3Lat: 75, mshr: 80, smt: 1, vecBits: 256, note: 'L0D 48KB は4サイクル、L1.5 192KB は9サイクル。L3 遅延は Arrow Lake の約75(代表 265K に合わせた値。Lunar Lake は約51)。L2 ミスキュー80' }),
    'Skymont': u({ width: 8, decodeWidth: 9, rob: 416, l1dLat: 4, l2KB: 1024, l2Lat: 19, vecBits: 128, note: 'L2 は 4MB/4コアクラスタ共有 → コアあたり 1024KB に換算。op cache なし' }),
    'Cougar Cove': u({ width: 8, decodeWidth: 8, l1dKB: 192, l2KB: 3072, note: 'ROB・遅延は未取得(Lion Cove から据え置きとの説明)。L2 は 3MB(wccftech)/2.5MB(Wikipedia)で食い違い' }),
    'Darkmont': u({ decodeWidth: 9, rob: 416, l2KB: 1024, vecBits: 128, note: 'L2 は 4MB/クラスタ共有 → コアあたり 1024KB に換算(クラスタのコア数は4と仮定)' }),
    'Sandy Bridge': u({ width: 4, decodeWidth: 4, rob: 168, brPenalty: 14, l1dKB: 32, l1dLat: 4, l2KB: 256, l2Lat: 12, l3Lat: 28, mshr: 10, smt: 2, vecBits: 256 }),
    'Haswell': u({ width: 4, decodeWidth: 4, rob: 192, brPenalty: 15, l1dKB: 32, l1dLat: 4, l2KB: 256, l2Lat: 12, l3Lat: 36, smt: 2, vecBits: 256 }),
    'Skylake': u({ width: 4, decodeWidth: 4, rob: 224, brPenalty: 16.5, l1dKB: 32, l1dLat: 4, l2KB: 256, l2Lat: 12, l3Lat: 42, smt: 2, vecBits: 256 }),
    // ---- Apple ----
    'Firestorm': u({ width: 8, decodeWidth: 8, rob: 330, brPenalty: 13, l1dKB: 128, l1dLat: 3, l2KB: 3072, l2Lat: 18, vecBits: 128, note: 'ROB はリタイアキュー約330エントリ(1エントリ最大7µop)。AnandTech 由来の630という値もあるが裏付け弱い。L2 は12MB/4コアクラスタ' }),
    'Icestorm': u({ vecBits: 128, note: 'L1I 128KB / L1D 64KB / L2 4MB/4コア。幅・ROB は未取得' }),
    'Avalanche': u({ rob: 274, l2KB: 4096, vecBits: 128, note: 'ROB は jia.je の値(Firestorm より小さいとの分析)。要確認。L2 は M2 の 16MB/4コアクラスタを換算(A15 は 12MB/2P で 6144KB と値が違う。プリセット間で l2KB を使い分けていない)' }),
    'Everest': u({ decodeWidth: 9, rob: 321, vecBits: 128, note: 'Geekerwan のフォーラム経由の値。出典は A17 の解析で、Everest の世代対応(A16 か A17 か)は資料間で食い違う' }),
    'Vortex': u({ note: '数値は未取得(A12 の P コア)' }),
    'Tempest': u({ note: '数値は未取得(A12 の E コア)' }),
    'Lightning': u({ note: '数値は未取得(A13 の P コア)' }),
    'Thunder': u({ note: '数値は未取得(A13 の E コア)' }),
    'Blizzard': u({ note: '数値は未取得(A15/M2 の E コア)' }),
    'Sawtooth': u({ note: '数値は未取得(A16 の E コア)' }),
    // ---- Arm ----
    'Cortex-A55': u({ decodeWidth: 2, inOrder: true, l1dLat: 2, l2Lat: 9 }),
    'Cortex-A76': u({ decodeWidth: 4, width: 4, rob: 128, l1dLat: 4, l2Lat: 9, vecBits: 128 }),
    'Cortex-A77': u({ decodeWidth: 4, width: 6, rob: 160, vecBits: 128 }),
    'Cortex-A78': u({ decodeWidth: 4, width: 6, rob: 160, l1dLat: 4, l2Lat: 9, vecBits: 128, note: 'width は Arm SOG(6 MOP/12 µOP)' }),
    'Cortex-A78C': u({ decodeWidth: 4, width: 6, rob: 160, l1dLat: 4, l2Lat: 9, vecBits: 128, note: 'A78 に準じる(A78C 個別の数値は未取得)' }),
    'Cortex-A78AE': u({ decodeWidth: 4, width: 6, rob: 160, l1dLat: 4, l2Lat: 9, vecBits: 128, note: 'A78 に準じる(個別の数値は未取得)' }),
    'Cortex-X1': u({ decodeWidth: 5, width: 8, rob: 224, vecBits: 128 }),
    'Cortex-X2': u({ decodeWidth: 5, width: 8, rob: 288, l1dLat: 4, l2Lat: 11, vecBits: 128, note: 'width は Arm SOG(8 MOP/16 µOP)で確認。L2 ミスキューは72〜96(構成可変)で単一の MSHR 値ではないため mshr は未設定' }),
    'Cortex-A710': u({ decodeWidth: 4, width: 5, l1dLat: 4, l2Lat: 13.5, vecBits: 128, note: 'width は Arm SOG(5 MOP/10 µOP)' }),
    'Cortex-A715': u({ decodeWidth: 5, width: 5, brPenalty: 12, l2Lat: 10, vecBits: 128, }),
    'Cortex-A715/A710': u({ decodeWidth: 5, width: 5, brPenalty: 12, l2Lat: 10, vecBits: 128, note: '8 Gen 2 のミドルコア混在表記。A715 の値を採用' }),
    'Cortex-A720': u({ brPenalty: 11, l2Lat: 9, vecBits: 128 }),
    'Cortex-A725': u({ decodeWidth: 5, width: 5, rob: 224, l1dKB: 64, l1dLat: 4, l2Lat: 9, vecBits: 128 }),
    'Cortex-A510': u({ inOrder: true, vecBits: 128 }),
    'Cortex-A520': u({ inOrder: true, vecBits: 128 }),
    'Cortex-X3': u({ decodeWidth: 6, width: 8, rob: 320, brPenalty: 9, vecBits: 128 }),
    'Cortex-X4': u({ decodeWidth: 10, width: 10, rob: 384, brPenalty: 10, vecBits: 128 }),
    'Cortex-X925': u({ decodeWidth: 10, width: 10, rob: 525, l1dKB: 64, l1dLat: 4, l2KB: 2048, l2Lat: 12, vecBits: 128, note: 'width は Arm SOG(10 MOP/20 µOP)。ROB は実用値約525(Chips and Cheese)。WikiChip/jia.je は768' }),
    'C1-Ultra': u({ note: 'Arm 新世代(旧 X930 相当)。窓約2000・L1D 128KB・L2 最大3MB は報道ベースで未確定', vecBits: 128 }),
    'C1-Premium': u({ note: '数値は未取得', vecBits: 128 }),
    'C1-Pro': u({ note: '数値は未取得', vecBits: 128 }),
    'C2-Ultra': u({ note: '数値は未取得', vecBits: 128 }),
    'C2-Pro': u({ note: '数値は未取得', vecBits: 128 }),
    'Oryon Prime': u({ decodeWidth: 8, width: 8, rob: 680, brPenalty: 13, l1dKB: 96, l2KB: 3072, l2Lat: 18, vecBits: 128, note: 'Oryon(Phoenix, X Elite)の値。8 Elite 系 Gen2/Gen3 は非公開のため Phoenix に準じる仮置き(信頼度低)。L2 は 12MB/4コアクラスタ共有 → コアあたり 3072KB に換算。L2 遅延は 17〜20 の代表値' }),
    'Oryon Performance': u({ decodeWidth: 8, width: 8, rob: 680, brPenalty: 13, l1dKB: 96, l2KB: 2048, l2Lat: 18, vecBits: 128, note: 'Oryon Prime と同じ値を仮置き(信頼度低)。ただし l2KB は 2026-10-31 に 3072→2048(Performance 6 コアで 12MB 共有÷6。8 Elite は Notebookcheck・Android Authority・Wikipedia・m1k.tech の 4 サイト、第 3 世代 X2 Elite とも一致。設計書 §5.3.2 E5)。幅 8・ROB 680 は第 2 世代で未確認のまま(第 3 世代 Performance は 4-wide の測定あり)なので変えていない' }),
    'Neoverse V2': u({ decodeWidth: 6, width: 8, rob: 320, vecBits: 128 }),
    'Neoverse V3AE': u({ vecBits: 128, note: '数値は未取得' }),
  };
})();
