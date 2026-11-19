// プリセット(AMD の Ryzen より前。2026-11-19 追加。ユーザー指示「AMD の ryzen 以前のものもプリセットを作ってください。FX だったりアスロンだったりです」)
// 世代ごとに 1 つ(同じダイの別 SKU は FX-6300 だけ): K7(Thunderbird・Barton)・K8(Venice・Brisbane)・K10(Agena・Deneb・Thuban・Propus)・Bulldozer(Zambezi)・Piledriver(Vishera 2 件・Trinity)・Bobcat(Zacate)= 13 SKU。
// 値は docs/research/amd-pre-ryzen-2026-11-19.md に出典つきでまとめた。構成・クロック・TDP は Wikipedia の AMD 各プロセッサ一覧([二次]。AMD の ARK 相当のページは古い SKU で取得できない)、
// ダイ面積は AnandTech・Tom's Hardware・HotHardware・Wikipedia・TechPowerUp([二次])。Geekbench 7 は設計書 §2.4 の「AMD 旧世代」の行(Geekbench Browser v7 検索の中央値。標本が少ない行は件数を明記)。
// K7・K8 は 32bit 命令だけの SKU か標本が少なく、Geekbench 7 の公開値なし(gb7: null)。校正の代表にはしない(calib: false)。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.presets = window.SDS_DATA.presets || [];
(function () {
  const P = window.SDS_DATA.presets;
  const WP = 'Wikipedia の AMD の各プロセッサ一覧(取得 2026-11-19。[二次])';
  const base = (w, extra) => ({ w, s: 'sec', note: 'TDP(最大熱設計電力)。' + WP + (extra || '') });
  const die = (name, mm2, nodeId, note) => ({ name, mm2, s: 'sec', nodeId, note });
  const THB = die('Thunderbird', 120, 'amd-180', 'AnandTech の Athlon の記事「Thunderbird は 120mm²」と Tom\'s Hardware の履歴の表(3700 万トランジスタ・120mm²。[二次])。L2 256KB を同じダイに載せる(Tom\'s Hardware の別の表は 117mm²)');
  const BRT = die('Barton', 101, 'amd-130', 'Tom\'s Hardware の履歴の表(Barton 5430 万トランジスタ・101mm²。[二次])。Barton の発売時の記事は「115mm²」と書いており食い違う');
  const VNC = die('Venice', 84, 'amd-90', 'HotHardware の Venice の記事(Newcastle 144mm²・Winchester と Venice は 84mm²。[二次])。AMD 自身も 90nm のデスクトップ向け Athlon 64 は 84mm² と説明。TechPowerUp の DB は 83mm²');
  const BRS = die('Brisbane 2C', 118, 'amd-65', 'Wikipedia の Athlon 64 X2 のページ(L2 512KB ×2 の 65nm 品は 118mm²・2.21 億トランジスタ。同ページの別の表は 126mm²。[二次])');
  const AGN = die('Agena 4C', 285, 'amd-65', 'Tom\'s Hardware の履歴の表(Agena 285mm²。[二次]。標準の Phenom X4)');
  const DNB = die('Deneb 4C', 258, 'amd-45', 'Wikipedia の Phenom II のページ(Deneb 258mm²。[二次])。Tom\'s Hardware の表は 243mm² で食い違う');
  const THU = die('Thuban 6C', 346, 'amd-45', 'Wikipedia の Phenom II のページ(Thuban 346mm²。[二次])');
  const PRP = die('Propus 4C', 169, 'amd-45', 'TechPowerUp の CPU DB・sysrqmts の Athlon II X4 640(3 億トランジスタ・169mm²。[二次])。L3 のない Deneb 系(L2 512KB ×4)');
  const ZMB = die('Zambezi 8C(4 モジュール)', 315, 'gf-32', 'AnandTech の Vishera の記事の比較表(Vishera・Zambezi とも 315mm²・約 12 億トランジスタ。[二次])。PC Watch のスライドも約 315mm²、Tom\'s Hardware は 316mm²、Wikipedia の FX 一覧は 319mm² で食い違う。1 モジュール(2 コアと L2 2MB)は 30.9mm²(Wikipedia の Bulldozer のページ)');
  const VSH = die('Vishera 8C(4 モジュール)', 315, 'gf-32', 'AnandTech の Vishera の記事・TechPowerUp の CPU DB・AMD の説明(SemiAccurate 経由)の 315mm²・約 12 億トランジスタ。[二次]。Zambezi と同じ面積');
  const TRN = die('Trinity APU', 246, 'gf-32', 'AnandTech の Trinity の比較表・TechPowerUp の CPU DB・Wikipedia(246mm²・13.03 億トランジスタ。[二次])。2 モジュール(4 コア)と GPU(6 CU)。L3 はなく L2(2 モジュール × 2MB)が最後のキャッシュ');
  const ZCT = die('Zacate APU', 75, 'tsmc-40', 'PC Watch のスライド(Ontario/Zacate の 2 コア Bobcat + GPU は 75mm²。[二次])');
  const reuse = (d, why) => Object.assign({}, d, { note: d.note + '。' + why });

  // [id, 名前, family, kind, 年, GB7 行, ダイ, TDP(W), TDP 備考, uarch, コア数, base GHz, boost GHz, 全コア GHz|null, L3 MB, L2 表示, メモリ, 蓋なし, 備考]
  const rows = [
    ['amd-k7-athlon-1400', 'Athlon 1400', 'K7 (Thunderbird)', 'pc', 2001, null, THB, 72, '(Wikipedia の Athlon の一覧の 1400B の行の 72W。1400C の行には TDP の記載がなく、同じダイ・同じクロックの 1400B の値を使う)', 'Thunderbird', 1, 1.4, 1.4, null, 0, '合計 256KB(オンダイ・フルスピード)',
      'FSB 266MT/s(メモリはチップセット側。メモリ容量・種別の選択肢は未対応)', true,
      'Athlon(K7。180nm、Thunderbird。2001 年)。1.4GHz・FSB 133MHz(266MT/s)・L2 256KB(オンダイ)・Socket A・3DNow!・MMX(SSE はまだない)。ダイがむき出しのカートリッジなし Socket A のパッケージ。32bit のみで Geekbench の公開値はない。'],
    ['amd-k7-xp-3200', 'Athlon XP 3200+', 'K7 (Barton)', 'pc', 2003, null, BRT, 76.8, '(Wikipedia の Athlon XP 一覧の 76.8W。TechPowerUp は 77W。典型値は 60.4W という記事もある)', 'Barton', 1, 2.2, 2.2, null, 0, '合計 512KB(オンダイ)',
      'FSB 400MT/s(メモリはチップセット側。メモリ容量・種別の選択肢は未対応)', true,
      'Athlon XP(K7 の最終世代。130nm、Barton。2003-05 発売)。2.2GHz(11×200MHz)・FSB 200MHz(400MT/s)・L2 512KB・Socket A・SSE 対応。ダイがむき出しの有機パッケージ。32bit のみで Geekbench の公開値はない。'],
    ['amd-k8-venice-3200', 'Athlon 64 3200+', 'K8 (Venice)', 'pc', 2005, null, VNC, 67, '(Wikipedia の Athlon 64 一覧の Venice の 2.0GHz・Socket 939 の行)', 'K8', 1, 2.0, 2.0, null, 0, '合計 512KB',
      'DDR(Socket 939。デュアルチャネル。速度は未取得。メモリコントローラは CPU に内蔵した最初の x86 世代。メモリ容量・種別の選択肢は未対応)', false,
      'Athlon 64(K8。90nm、Venice。2005-04 発売)。1 コア・2.0GHz・L2 512KB・Socket 939・64bit 対応。Geekbench 7 の Windows の標本は 2 件(3200+ が 1 件、3500+ が 1 件)で、動作クロックがオーバークロックの値(2.6GHz 前後)のため採用しない。同じ「3200+」でも Clawhammer・Newcastle・Winchester・Venice など複数の別のダイがあり、投稿の名前から Venice に絞れない。'],
    ['amd-k8-brisbane-5000', 'Athlon 64 X2 5000+', 'K8 (Brisbane)', 'pc', 2006, null, BRS, 65, '(Wikipedia の Athlon 64 X2 一覧の Brisbane 5000+(G1)の行)', 'K8', 2, 2.6, 2.6, null, 0, '合計 1MB(512KB ×2。コアごと)',
      'DDR2(Socket AM2。速度は未取得。メモリコントローラは CPU に内蔵。メモリ容量・種別の選択肢は未対応)', false,
      'Athlon 64 X2(K8 のデュアルコア。65nm、Brisbane。2006-12 発売)。2 コア・2.6GHz・L2 512KB ×2(コアごと)・Socket AM2・TDP 65W。Geekbench 7 の Windows の標本は 2 件で、どちらも 3.3GHz 以上のオーバークロックのため採用しない。Windsor・Toledo・Manchester(同じ 5000+ や 5200+ の別のダイ)と名前で区別できない。'],
    ['amd-k10-agena-9950', 'Phenom X4 9950 BE', 'K10 (Agena)', 'pc', 2008, 'Phenom X4 9950(4c)', AGN, 125, '(Wikipedia の Phenom 一覧の 9950 BE の行)', 'K10', 4, 2.6, 2.6, null, 2, '合計 2MB(512KB ×4。コアごと)',
      'DDR2-1066(PC2-8500。Wikipedia の Phenom 一覧。Socket AM2+)', false,
      'Phenom X4(K10。65nm、Agena。2008 年)。4 コアが 1 つのダイ(ネイティブ 4 コア)・2.6GHz・L2 512KB ×4・共有 L3 2MB・HyperTransport 2.0GHz・Socket AM2+。ターボなし。'],
    ['amd-k10-deneb-955', 'Phenom II X4 955 BE', 'K10 (Deneb)', 'pc', 2009, 'Phenom II X4 955(4c)', DNB, 125, '(Wikipedia の Phenom II 一覧の 955 BE の行)', 'K10', 4, 3.2, 3.2, null, 6, '合計 2MB(512KB ×4。コアごと)',
      'DDR3-1333(PC3-10600。Socket AM3。DDR2-1066 も使える。Wikipedia の Phenom II 一覧)', false,
      'Phenom II X4(K10 の 45nm 版、Deneb。2009-04-23 発売)。4 コア・3.2GHz・L2 512KB ×4・共有 L3 6MB・Socket AM3・ターボなし。'],
    ['amd-k10-thuban-1090t', 'Phenom II X6 1090T BE', 'K10 (Thuban)', 'pc', 2010, 'Phenom II X6 1090T(6c)', THU, 125, '(Wikipedia の Phenom II 一覧の 1090T BE の行)', 'K10', 6, 3.2, 3.6, null, 6, '合計 3MB(512KB ×6。コアごと)',
      'DDR3-1333(PC3-10600。Socket AM3。DDR2-1066 も使える。Wikipedia の Phenom II 一覧)', false,
      'Phenom II X6(K10 の 6 コア版、Thuban。2010-04-27 発売)。6 コア・3.2GHz(Turbo CORE で最大 3.6GHz)・L2 512KB ×6・共有 L3 6MB・Socket AM3。Geekbench 7 の Windows の標本は 3 件(3.2GHz 前後)。'],
    ['amd-k10-propus-x4-640', 'Athlon II X4 640', 'K10 (Propus)', 'pc', 2010, null, PRP, 95, '(Wikipedia の Athlon II 一覧の 640(Propus)の行)', 'K10', 4, 3.0, 3.0, null, 0, '合計 2MB(512KB ×4。コアごと)',
      'DDR3-1333(PC3-10600。Socket AM3。DDR2-1066 も使える。Wikipedia の Athlon II 一覧)', false,
      'Athlon II X4(K10 から L3 を省いたコスト重視版、Propus。2010-05-11 発売)。4 コア・3.0GHz・L2 512KB ×4・**L3 なし**(L2 が最後のキャッシュ)・Socket AM3。Geekbench 7 の標本は 3 件(OS の表示なし。Linux とみられる)あるが、ST が L3 つき・高クロックの Phenom II X4 955 を上回り不自然なので採用しない(gb7: null)。'],
    ['amd-bd-fx8150', 'FX-8150', 'Bulldozer (Zambezi)', 'pc', 2011, 'FX-8150(8c)', ZMB, 125, '(Wikipedia の FX 一覧の FX-8150 の行)', 'Bulldozer', 8, 3.6, 4.2, 3.9, 8, '合計 8MB(2MB ×4 モジュール。各モジュールの 2 コアで共有)',
      'DDR3-1866(最大。Socket AM3+。Wikipedia の FX 一覧)', false,
      'FX(Bulldozer。32nm SOI、Zambezi。2011-10-12 発売)。4 モジュール = 8 つの整数コア(各モジュールで先読み・命令デコード・浮動小数点・L2 2MB を 2 つの整数コアが共有)・3.6GHz(全コア負荷 3.9GHz・半分の負荷で 4.2GHz)・L3 8MB・Socket AM3+。**このシミュレーターは整数コア 1 つを 1 コアと数える**ので、共有部分(デコード・浮動小数点・L2)を表せず MT が公開値より +20% 前後高く出る(1 モジュールを 1 コア 2 スレッドと数えると逆に約 −19% 低く出て、どちらも合わない)。標本は少ない(近い動作クロックで 2 件。Windows は 1 件)。'],
    ['amd-pd-fx8350', 'FX-8350', 'Piledriver (Vishera)', 'pc', 2012, 'FX-8350(8c)', VSH, 125, '(Wikipedia の FX 一覧の FX-8350 の行)', 'Piledriver', 8, 4.0, 4.2, 4.1, 8, '合計 8MB(2MB ×4 モジュール。各モジュールの 2 コアで共有)',
      'DDR3-1866(最大。Socket AM3+。Wikipedia の FX 一覧)', false,
      'FX(Piledriver。32nm SOI、Vishera。2012-10-23 発売)。4 モジュール = 8 つの整数コア・4.0GHz(全コア負荷 4.1GHz・半分の負荷で 4.2GHz)・L3 8MB・Socket AM3+。Bulldozer の改良版(L2 の遅延が短い)。Geekbench 7 の標本が多い(近い動作クロックの Windows が 32 件)。'],
    ['amd-pd-fx6300', 'FX-6300', 'Piledriver (Vishera)', 'pc', 2012, 'FX-6300(6c)', reuse(VSH, 'FX-8350 と同じ 8 コアのダイからモジュール 1 つを無効にした SKU として面積を流用([推定]。個別の確認は未取得)'), 95, '(Wikipedia の FX 一覧の FX-6300 の行)', 'Piledriver', 6, 3.5, 4.1, 3.8, 8, '合計 6MB(2MB ×3 モジュール。各モジュールの 2 コアで共有)',
      'DDR3-1866(最大。Socket AM3+。Wikipedia の FX 一覧)', false,
      'FX(Piledriver、Vishera。2012-10-23 発売)の 6 コア版。3 モジュール = 6 つの整数コア・3.5GHz(全コア負荷 3.8GHz・半分の負荷で 4.1GHz)・L3 8MB・Socket AM3+。Geekbench 7 の標本が多い(近い動作クロックの Windows が 23 件)。'],
    ['amd-pd-a10-5800k', 'A10-5800K', 'Piledriver (Trinity)', 'pc', 2012, 'A10-5800K(4c)', TRN, 100, '(Wikipedia の AMD APU 一覧の A10-5800K の行)', 'Piledriver', 4, 3.8, 4.2, null, 0, '合計 4MB(2MB ×2 モジュール。各モジュールの 2 コアで共有)',
      'DDR3-1866(最大。Socket FM2。Wikipedia の AMD APU 一覧)', false,
      'A10(APU。Piledriver、Trinity。32nm SOI。2012-10)。2 モジュール = 4 つの整数コア・3.8GHz(ターボ 4.2GHz)・L2 2MB ×2・**L3 なし**・内蔵 GPU(Radeon HD 7660D。6 CU)・Socket FM2。Geekbench 7 の標本は 3 件(Windows。3.8GHz)。'],
    ['amd-bobcat-e350', 'E-350', 'Bobcat (Zacate)', 'mobile-pc', 2011, null, ZCT, 18, '(AnandTech の Brazos の記事の E-350 の行。18W)', 'Bobcat', 2, 1.6, 1.6, null, 0, '合計 1MB(512KB ×2。コアごと)',
      'DDR3-1066(単一チャネル。AMD が Brazos で公式に対応する最大。Guru3D・sysrqmts。メモリ容量・種別の選択肢は未対応)', true,
      'E-350(Brazos プラットフォームの APU。Bobcat、Zacate。TSMC 40nm。2011-01)。2 コア・1.6GHz・L2 512KB ×2(コアごと)・L3 なし・内蔵 GPU(Radeon HD 6310)・TDP 18W。命令の同時実行が 2 命令/クロックの小型のコア(Agner Fog)。Geekbench 7 の標本は 3 件あるが、マルチコアの値(93)がシングルコアの値(126)より低く、信頼できないので採用しない。'],
  ];
  rows.forEach((r) => {
    const [id, name, family, kind, year, gb7, dieRec, tdp, tdpNote, uarch, count, baseGHz, boostGHz, allCore, l3MB, l2, memory, noLid, note] = r;
    P.push({
      id, name, vendor: 'AMD', family, isa: 'x86', kind, year, addedIn: 'old-amd',
      // ヒートスプレッダ(蓋)なし: ダイがむき出しの K7(Socket A)と、BGA パッケージの Bobcat(2026-11-19)
      ...(noLid ? { noLid: true } : {}),
      gb7,
      dies: [Object.assign({}, dieRec)],
      power: { base: base(tdp, tdpNote), peak: null, range: null },
      cfg: { cores: [Object.assign({ type: 'P', uarch, count, smt: 1, baseGHz, boostGHz }, allCore ? { allCoreGHz: allCore } : {})], l3MB, l2, memory },
      calib: false,
      notes: note + ' 古い世代のため、構成・クロック・L3・メモリ・TDP は Wikipedia の AMD の各プロセッサ一覧、ダイ面積は AnandTech・Tom\'s Hardware・HotHardware・Wikipedia・TechPowerUp([二次])。GB7 は設計書 §2.4 の「AMD 旧世代」の行の区分のとおり([実測]=Geekbench Browser v7 検索の中央値。近い動作クロックだけに絞った)。詳細は docs/research/amd-pre-ryzen-2026-11-19.md。',
    });
  });
})();
