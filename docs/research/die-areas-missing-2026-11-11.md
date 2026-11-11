# 未取得・未確定のダイ面積の調査(2026-11-11)

調査のみ(コード・プリセットは変更していない)。推測・補間はしない。原ページで数値を確認できたものだけを採用候補にし、検索の要約にしか出ない値は「未確認(参考)」として分ける。

- 書式: 項目 / 面積 / 区分 / 出典 URL / 取得日 / 原ページ確認
- 区分: [公表] = Intel・AMD の公式資料。[二次] = 第三者がダイ写真や実物を測った値(測った人と方法が分かるもの)。[推定] = 第三者の目測・見積もり(ウェハ写真やリーク画像から、または根拠を示さない値)。
- 項目 4(Raptor Lake-HX 252.3 mm² の裏取り)は、コーディネーター経由のユーザー指示で中止した(HX は Raptor Lake-S と同じダイで、S の面積は取得済み)。

## 0. 結論(要約)

| 対象 | 結論 |
|---|---|
| Arrow Lake-H(285H)の各タイル | **全部未取得**。公式・ダイ写真の計測・注釈のどれにも H 用の数値がない。分かったのは製造プロセス(CPU N3B、GPU N5P、SoC・IO N6、ベース Intel 22nm)だけ |
| Arrow Lake-HX(275HX) | **285K(Arrow Lake-S)と同じダイ(ユーザー確認 2026-11-11)**。補強: PC Watch 2024-10-11 が「S と HX は実質同じダイ構成」と記述、ARK の 275HX パッケージ 37.5×30.2mm。Notebookcheck の原ページは「デスクトップの Arrow Lake-S をもとにしたチップ」と書くだけで同じダイとは明言していない(弱い根拠)。HX 自体を測った値はない(面積 117.4mm² は 285K の実測値の流用) |
| Arrow Lake-S(285K) | 既存の値(HighYield 117.241 / 23 / 86.648 / 24.475 / 302.944)を確認。Kurnal Insights の実測値(117.4 / 23.1 / 86.6 / 24.7)ともおおむね合う |
| Meteor Lake の Base タイル | **計測値はない**。265.65 mm²(23.1 × 11.5 mm)は、発売前にウェハ写真から出した見積もり([推定])。Kurnal Insights は Base タイルの写真を載せているが寸法は書いていない |
| Meteor Lake の他のタイル | プリセットの値(Kurnal Insights: 68.1 / 41.9 / 96.8 / 24.7)を原ページで確認。別の 2 組の計測値(OneRaichu と Andreas Schilling)は ±3〜11% の幅に収まる |
| Kraken Point | **未取得のまま**。195 mm² は DB サイト 2 つ(cpu-wiki、Technical City)の原ページで確認したが、どちらも出典が書かれていない。ダイ写真・公式値・Chips and Cheese・TechPowerUp の値は見つからない。なお、現行プリセット `amd-kraken-350` の mm2 はすでに null(195 は不採用)になっている |

## 1. Arrow Lake-H(Core Ultra 9 285H、6P+8E+2LP-E)

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| Compute タイル(TSMC N3B、6P+8E) | **未取得** | — | 該当なし | 2026-11-11 | — |
| SoC タイル(N6) | **未取得** | — | 該当なし | 2026-11-11 | — |
| GPU タイル(N5P、Xe 8 コア) | **未取得** | — | 該当なし | 2026-11-11 | — |
| I/O タイル(N6) | **未取得** | — | 該当なし | 2026-11-11 | — |
| Base タイル(Intel 22nm) | **未取得** | — | 該当なし | 2026-11-11 | — |
| パッケージ全体 | **未取得** | — | 該当なし | 2026-11-11 | — |

原ページで確認できた定性的な情報(面積ではない):
- Notebookcheck「Intel Core Ultra 9 285H」 https://www.notebookcheck.net/Intel-Core-Ultra-9-285H-Processor-Benchmarks-and-Specs.944114.0.html (2026-11-11、原ページ確認済み): "the Arrow Lake-H chips are based on individual chiplets that are placed on a 22nm base tile from Intel"、"The CPU part comes from TSMC using the modern N3B (3nm) process."、GPU は N5P、"SoC and I/O Tile are also from TSMC but in the older N6 process." Die Size の欄はない。
- Notebookcheck「Intel Arrow Lake-H CPU analysis」(2025-02-12) https://www.notebookcheck.net/Intel-Arrow-Lake-H-CPU-analysis-Core-Ultra-200H-makes-Lunar-Lake-almost-redundant.959328.0.html (2026-11-11、原ページ確認済み): CPU N3B / GPU N5 / SoC・I/O N6。面積は "improved packaging has allowed for a chip size reduction of up to 33%" とだけ書く(何と比べた何のサイズかは書いていない。面積の代わりには使えない)。
- Wikipedia「Arrow Lake (microprocessor)」 raw(2026-11-11、原ページ確認済み): "Mobile variants of Arrow Lake reuse Meteor Lake's SoC tile that includes two Crestmont low-power E-cores"(出典の ref なし)。同じ記事が「Arrow Lake reuses the same SoC tile design from Meteor Lake」とも書く一方、表の SoC タイル 86.648 mm²(デスクトップ)は Meteor Lake の SoC タイル(96.8〜100.15 mm²)と合わない。**H の SoC タイルが Meteor Lake-H と同じかは、出典つきで確認できない**。
- 未確認(参考・検索要約のみ): Tom's Hardware は「LP-E が Crestmont なら Meteor Lake-H の SoC タイルを流用している可能性が高い」と書いた(推測の形)。TechPowerUp のレビューは「Arrow Lake-HX は S と同じ Graphics タイル、Arrow Lake-H は Xe 8 コアのもっと大きい Graphics タイル」と書く(TechPowerUp は 403 で原ページ未確認)。HotHardware のレビューは「SoC と IOE は Meteor Lake からほぼ引き継ぎ、Compute タイルを更新、Graphics タイルを少し変更」と書く(403 で原ページ未確認)。

調べたが数値がなかったもの: Kurnal Insights のダイ写真ギャラリー(Arrow Lake は S だけ)、Wikipedia(S の表だけ)、3DNews(S だけ)、AnandTech フォーラム、TweakTown の Arrow Lake-H パッケージ写真の記事(403)、TechPowerUp(403)、HotHardware(403)、HardwareLUXX(検索で該当記事なし)。

### 1-1. Arrow Lake-HX(275HX、8P+16E)

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| Compute タイル | HX を測った値は**未取得** | — | — | 2026-11-11 | — |
| S と同じシリコンか | 「based on the desktop Arrow Lake-S chips」(同じダイだとは明言していない。**2026-11-11 にユーザーが「285K と同じダイ」と確認**) | [二次] | https://www.notebookcheck.net/Intel-Core-Ultra-9-275HX-Processor-Benchmarks-and-Specs.943094.0.html | 2026-11-11 | 確認済み |

同じページは「The base tile is manufactured by Intel in the 22nm process」と書く。Die Size の欄はない。プリセット `intel-arl-275hx` は 285K の Compute タイル 117.4 mm² を区分 sec で流用している。今回の確認で、根拠の強さは「based on」までだった。

### 1-2. Arrow Lake-S(285K)の値の確認

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| Compute タイル(N3B、8P+16E) | 117.241 mm² | [二次](HighYield の注釈) | https://en.wikipedia.org/w/index.php?title=Arrow_Lake_(microprocessor)&action=raw (ref: HighYield「Arrow Lake: Intel's 1st Tile-based Desktop CPU」 https://www.youtube.com/watch?v=wusyYscQi0o 、2025-05-03) | 2026-11-11 | Wikipedia の wikitext を確認。動画は未確認 |
| 同上 | 117.4 mm²(7.82 × 15.01 mm) | [二次](Kurnal Insights のダイ写真計測) | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み |
| GPU タイル(N5P) | 23 mm² / 23.1 mm²(2.28 × 10.15 mm) | [二次] | 同上(Wikipedia ← HighYield / Kurnal) | 2026-11-11 | 確認済み |
| SoC タイル(N6) | 86.648 mm² / 86.6 mm²(7.98 × 10.85 mm) | [二次] | 同上 | 2026-11-11 | 確認済み |
| I/O タイル(N6) | 24.475 mm² / 24.7 mm²(2.73 × 9.04 mm) | [二次] | 同上 | 2026-11-11 | 確認済み |
| Base タイル(Intel 16 / 22FFL) | 302.944 mm² | [二次](HighYield) | Wikipedia ← HighYield(上記) | 2026-11-11 | Wikipedia で確認。動画は未確認。Kurnal はパッケージ全体の写真のみで寸法なし |
| Compute・I/O・SoC タイル(同じ値) | 117.241 / 24.475 / 86.648 mm² | [二次](Andreas Schilling〔HardwareLUXX〕の X への投稿を引用) | https://3dnews.ru/1122346/opublikovani-detalnie-izobrageniya-kagdogo-kristalla-protsessorov-intel-arrow-lakes/print (2025-05-05) | 2026-11-11 | 確認済み |

注: Kurnal Insights の Arrow Lake-S の I/O タイルの寸法(2.73 × 9.04 mm、24.7 mm²)は、同じサイトの Meteor Lake の I/O タイルと完全に同じ数字。Wikipedia の「Meteor Lake の I/O 拡張タイルを流用」という記述とは矛盾しないが、どちらかを書き写した可能性もあり、独立した 2 回の計測とは言えない。

## 2. Meteor Lake(Core Ultra 9 185H、6P+8E+2LP-E)

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| **Base タイル(Foveros、Intel 16 / 22FFL)** | **計測値は未取得** | — | Kurnal Insights は「Meteor Lake Base Tile (22nm SOI)」の写真を載せているが寸法なし https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(寸法なしを確認) |
| Base タイル(参考) | 265.65 mm²(23.1 × 11.5 mm) | [推定](発売前に ASCII がウェハの接写から見積もった値。記事は "estimated"。265.65 は Wikipedia が寸法を掛けた値で、記事は面積を書いていない) | https://wccftech.com/intel-could-dish-out-an-estimated-365000-next-gen-meteor-lake-cpu-tiles-per-month/ (2023-08-28)。転記: Wikipedia「Meteor Lake」 | 2026-11-11 | 確認済み。採用は不可(推定値) |
| Compute タイル(Intel 4、6P+8E) | 68.1 mm²(7.93 × 8.59 mm) | [二次](Kurnal Insights のダイ写真計測) | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(プリセットと一致) |
| 同上(別の計測 #1) | 69.67 mm²(8.72 × 7.99 mm) | [二次](OneRaichu / Andreas Schilling の写真計測。どちらがどの値かは書かれていない) | https://wccftech.com/intel-core-ultra-meteor-lake-cpu-die-shots-closer-look-at-various-cpu-gpu-io-chiplets/ (2023-12-21) | 2026-11-11 | 確認済み |
| 同上(別の計測 #2) | 66.48 mm²(8.48 × 7.84 mm) | [二次](Andreas Schilling。"rough estimates"、Meteor Lake-H の写真から) | 同上、および AnandTech フォーラム mikk の投稿(2023-12-16) https://forums.anandtech.com/threads/intel-meteor-arrow-lunar-panther-lakes-wcl-discussion-threads.2606448/post-41124595 | 2026-11-11 | 確認済み |
| GPU タイル(TSMC N5) | 41.9 mm²(4.2 × 9.97 mm) | [二次](Kurnal) | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(プリセットと一致) |
| 同上(別の計測) | 44.25 mm²(10.22 × 4.33)/ 44.45 mm²(10.16 × 4.08) | [二次] | wccftech 2023-12-21(上記) | 2026-11-11 | 確認済み |
| SoC タイル(TSMC N6) | 96.8 mm²(9.07 × 10.67 mm) | [二次](Kurnal) | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(プリセットと一致) |
| 同上(別の計測) | 100.15 mm²(10.85 × 9.23)/ 96.77 mm²(10.8 × 8.96) | [二次] | wccftech 2023-12-21(上記) | 2026-11-11 | 確認済み |
| IOE タイル(TSMC N6) | 24.7 mm²(2.73 × 9.04 mm) | [二次](Kurnal) | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(プリセットと一致) |
| 同上(別の計測) | 27.42 mm²(9.20 × 2.98)/ 27.94 mm²(2.96 × 9.44) | [二次] | wccftech 2023-12-21(上記) | 2026-11-11 | 確認済み |
| パッケージ全体 | **未取得** | — | Kurnal は「Full Package」の写真のみで寸法なし | 2026-11-11 | 確認済み |

注意点:
- wccftech(2023-12-21)の本文は、写真の SKU を「2+8+2」と書く。ところが計測した Compute タイル 69.67 mm² は 6P+8E 版の大きさ(Kurnal の 6P+8E 68.1 mm² とほぼ同じ)で、2+8 版の約 40 mm²(SemiAnalysis)とは合わない。記事の SKU の記述が誤っている可能性があるが、確認できない。
- Wikipedia の Meteor Lake の表(Compute 69.67、GPU 44.25、SoC 100.15、IOE 27.42、Base 265.65)は、wccftech の計測 #1 と、ASCII のウェハからの見積もりを混ぜている。表の中で Compute 以外の行には ref がない。本文の「CPU タイル 8.9 × 8.3 mm = 73.87 mm²」も ASCII の見積もり(wccftech 2023-08-28 の記事は 73.9 mm²、"estimation not final")。
- 同じ Intel 4 の 6P+8E の Compute タイルについて、計測値は 66.48〜69.67 mm²(幅 ±2.4%)。GPU 41.9〜44.45(±3%)、SoC 96.77〜100.15(±1.7%)、IOE 24.7〜27.94(±6%)。Kurnal の値はどれも幅の下限にある。

### 2-1. 既存調査との矛盾

| 既存の値 | 既存の出典 | 今回の値 | コメント |
|---|---|---|---|
| block-areas.md §1-5: Compute 約 40、SoC 約 94.9、IO 10、GPU 約 23、「何のダイか不明」約 174 | SemiAnalysis(Dylan Patel・Locuza、2022-05-26) | 6P+8E: Compute 68.1、SoC 96.8、IO 24.7、GPU 41.9 | SemiAnalysis は発売前(2022)の 2+8 版の写真で、製品版とは構成が違う。原ページで再確認したところ、約 174 mm² はどのダイかを書いておらず、Base タイルの面積とも書いていない(Base タイルは「Intel 7 の Foveros 向け派生の能動インターポーザと思われる」とだけ)。**IO 10 mm² と GPU 23 mm² は製品版の計測(24.7〜27.9 と 41.9〜44.5)と大きく違う**ので、185H には使えない |
| core-areas-2026-11-09.md: 「compute 68.1」 | (Kurnal) | 68.1 | 一致 |
| プリセット intel-mtl-185h の Base タイル null | — | null のまま | 計測値がないので変えない。265.65 は [推定] |

Base タイルのプロセスにも食い違いがある: Wikipedia・Tom's Hardware・Club386 は Intel 16(22FFL)、Kurnal は「22nm SOI」、SemiAnalysis(2022)は「Intel 7 の派生と思われる」。

## 3. AMD Kraken Point(Krackan Point。Ryzen AI 7 350 / AI 5 340)

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| ダイ面積(公式) | **未取得** | — | AMD の製品ページ(350)は取得がタイムアウト。既存調査(2026-11-06)でも公式ページに面積なし | 2026-11-11 | — |
| ダイ面積(ダイ写真の計測・注釈) | **未取得** | — | Kurnal Insights のギャラリーに Krackan なし(Strix Point 225.6、Strix Halo はあり)。Chips and Cheese・TechPowerUp・Fritzchens Fritz・HighYield の記事は見つからない | 2026-11-11 | Kurnal は確認済み |
| 195 mm² | 195 mm² | **出典不明の DB 値**([推定]にも入れない) | cpu-wiki https://cpu-wiki.pages.dev/cpu/ryzen-ai-7-350 (既存調査で確認済み)/ Technical City https://technical.city/en/cpu/Ryzen-AI-7-PRO-350 | 2026-11-11 | Technical City は確認済み。「Die size 195 mm2」、出典の記載なし、トランジスタ数なし |
| 約 190 mm² | ~190 mm² | 未確認(参考)。根拠なしの見積もり | AnandTech フォーラム Joe NYC(2025-11-01)「There is no official number. The estimate is ~190mm2」 https://forums.anandtech.com/threads/zen-5-speculation-epyc-turin-and-strix-point-granite-ridge-ryzen-9000.2607350/post-41529398 | 2026-11-11 | 確認済み(誰の見積もりかは書かれていない) |
| 178 mm² | — | Kraken の値ではない | 同じスレッドの Vikv1918(2025-11-01)は「Phoenix・Hawk Point・Ryzen 200 は全部同じ 178mm2 のダイ」と書き、その上で「Krackan のダイ面積はどこにもなく、ダイ写真や解析もまだ無いようだ」と書く。Notebookcheck の比較ページの 178 mm² は 403 で確認できない | 2026-11-11 | フォーラムは確認済み |
| Notebookcheck の仕様表 | 面積の欄なし | — | https://www.notebookcheck.net/AMD-Ryzen-AI-7-350-Processor-Benchmarks-and-Specs.949825.0.html | 2026-11-11 | 確認済み(「Manufacturing Technology 4 nm」のみ) |
| Wikipedia「Zen 5」 | Krackan の面積なし(Strix Point 232.5、CCD 70.6 のみ) | — | https://en.wikipedia.org/w/index.php?title=Zen_5&action=raw | 2026-11-11 | 確認済み |

- 未確認(参考・検索要約のみ): 「Strix Halo と Krackan の仕様書が出たとき、AMD は仕様書からダイ面積をすべて消した」というフォーラムの発言。上の投稿のページでは見つからなかった。
- 結論: **195 mm² の根拠は確認できなかった**。既存の kraken-point.md の結論(未取得、195 は不採用)と同じ。現行プリセット `amd-kraken-350` は mm2 が null(注記「195 mm² は出典不明の DB サイトのみのため採用しない」)。依頼文の「現在プリセットは 195mm²」はファイルの現状と違う。

## 4. Raptor Lake-HX(参考)

ユーザー指示で中止した(HX は Raptor Lake-S と同じダイで、面積は取得済み)。

## 5. 取得できなかったページ

- TechPowerUp(336412 の Arrow Lake 注釈記事、245K レビュー): 403
- HotHardware の Arrow Lake-H レビュー: 403
- TweakTown の Arrow Lake-H パッケージ写真の記事: 403
- Notebookcheck の比較ページ(350 vs 7840U): 403
- AMD 公式(350)の製品ページ: WebFetch がタイムアウト
- TechInsights「Core Ultra 7 155H Digital Floorplan Analysis」 https://techinsights.com/ja/node/56504 : 概要ページに面積なし(本文は有料)
- Tom's Hardware の Arrow Lake ダイ写真記事: 本文を取得できず

## 追加調査

前回 403 などで読めなかったサイトを、Chrome(claude-in-chrome)で通常の閲覧として開いて確認した。WebSearch の extended モードも使った。TechPowerUp は、ページ内のスクリプトから fetch するとボット確認(スライダー)が出たので、その方法はやめた。ボット確認は突破していない。通常のページ遷移では表示できた。推測・補間はしていない。取得日はすべて 2026-11-11。

### 結論(追加分)

| 対象 | 結論 |
|---|---|
| Arrow Lake-H の各タイル | **やはり未取得**。分かったのは公式のパッケージ寸法 **50 mm × 25 mm**(285H・265H、Intel ARK)だけ。PC Watch は「H のコンピュートタイルとグラフィックスタイルは S と別のダイ」と書くが、面積はない |
| Arrow Lake-HX | 公式のパッケージ寸法は **37.5 mm × 30.2 mm**(275HX)。PC Watch は「Arrow Lake-S と Arrow Lake-HX は事実上同じダイ構成」と書く(発売前の記事。2026-11-11 にユーザーが「275HX と 285K は同じダイ」と確認)。TechPowerUp の DB は 285HX と 285K に同じ値(243 mm²、178 億トランジスタ)を載せているが、出典がなく、タイル面積の合計とも合わない |
| Meteor Lake の Base タイル | **計測値は未取得のまま**。新たに見つかったのは 182.3 mm²(16.8 × 10.85 mm)。ただしこれは 2022 年 1 月の試作版 Type4 パッケージ(MTL-M、2+8 構成)の写真からフォーラム利用者が測った値で、185H のものではない。Hot Chips 34 の Intel 資料にも Base タイルの寸法はない |
| Kraken(Krackan)Point | **未取得のまま**。195 mm² は TechPowerUp の CPU DB(Ryzen AI 5 340)と GPU DB(「AMD Krackan Point」)にも載っていた。ただし出典はなく、トランジスタ数も載っていない。出典不明の DB 値なので採用しない。**Ryzen AI 5 330 は別のダイ(Krackan Point 2、もっと小さい)** で、面積はどこにも載っていない |

### A. Arrow Lake-H / HX

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| 285H パッケージ寸法 | 50 mm × 25 mm(= 1250 mm²。ダイ面積ではない) | [公表] | https://www.intel.com/content/www/us/en/products/sku/241747/intel-core-ultra-9-processor-285h-24m-cache-up-to-5-40-ghz/specifications.html | 2026-11-11 | 確認済み(「Package Size 50 mm x 25 mm」、FCBGA2049) |
| 265H パッケージ寸法 | 50 mm × 25 mm | [公表] | https://www.intel.com/content/www/us/en/products/sku/241750/intel-core-ultra-7-processor-265h-24m-cache-up-to-5-30-ghz/specifications.html | 2026-11-11 | 確認済み |
| 275HX パッケージ寸法 | 37.5 mm × 30.2 mm | [公表] | https://www.intel.com/content/www/us/en/products/sku/242293/intel-core-ultra-9-processor-275hx-36m-cache-up-to-5-40-ghz/specifications.html | 2026-11-11 | 確認済み(FCBGA2114) |
| H の Compute / GPU / SoC / IO / Base タイル | **未取得** | — | 該当なし | 2026-11-11 | — |
| 285H の Die Size(TechPowerUp CPU DB) | 欄なし | — | https://www.techpowerup.com/cpu-specs/core-ultra-9-285h.c4264 | 2026-11-11 | 確認済み。プロセスだけ載っている(3 nm、SoC・IO タイル N6、グラフィックスタイル N5)。ダイサイズとトランジスタ数の欄はない |
| 285HX の Die Size(TechPowerUp CPU DB) | 243 mm²、178 億トランジスタ | 出典不明の DB 値(採用しない) | https://www.techpowerup.com/cpu-specs/core-ultra-9-285hx.c4022 | 2026-11-11 | 確認済み |
| 285K の Die Size(同上、比較用) | 243 mm²、178 億トランジスタ(285HX と同じ値) | 出典不明の DB 値 | https://www.techpowerup.com/cpu-specs/core-ultra-9-285k.c3773 | 2026-11-11 | 確認済み。243 は計測されたタイルの合計(117.2 + 23 + 86.6 + 24.5 ≒ 251)とも、Base タイル(302.9)とも合わない。何の面積かは不明 |

原ページで確認できた定性的な情報(面積ではない):
- PC Watch 笠原一輝「CPUコアの進化で、性能と電力効率が大きく改善されたArrow Lakeの詳細」(2024-10-11) https://pc.watch.impress.co.jp/docs/column/ubiq/1630437.html (確認済み): 「Arrow Lake-SとArrow Lake-HXは事実上同じダイ構成になる」。また「Arrow Lake-HはSOCタイルとIOタイルに関してはMeteor Lake、Arrow Lake-Sと同じだが、コンピュートタイルとグラフィックスタイルに関しては異なるダイになっている」。SoC と IO については「おそらく」付き。H と HX の発売前の記事。
- PC Watch 特集「複雑怪奇なCore Ultraシリーズを理解する」(2025-02-12) https://pc.watch.impress.co.jp/docs/topic/feature/1661638.html (確認済み): 200H は「Pコアが6基、Eコアが8基となるタイル」と「Meteor Lakeでも使われていたSOCタイルとIOタイル」を「ベースタイルになるP1227の上に」積む、と書く。「Core Ultra 200S/HX/H/Uは、SOCタイルとIOタイルは基本的にMeteor Lakeと共通」とも書く。
  - **矛盾に注意**: 「SoC タイルは Meteor Lake と共通」と言いながら、計測値は Arrow Lake-S の SoC 86.6〜86.65 mm² と Meteor Lake の SoC 96.8〜100.15 mm² で、約 10% 違う(前回の §1・§2)。どちらが正しいかは確かめられない。だから **H の SoC タイルに Meteor Lake の値を当てはめる根拠にはならない**。
- Chips and Cheese「Intel's CES 2025 Keynote」(検索要約のみ・未確認(参考)): 「Arrow Lake H は desktop Arrow Lake の CPU タイルに Meteor Lake 時代の SoC タイルを組み合わせる」という趣旨。PC Watch の「コンピュートタイルは別ダイ」と食い違う。原ページは開いていない。
- HardwareLUXX の 285H レビュー(Andreas Schilling、2025-02-10) https://www.hardwareluxx.de/index.php/artikel/hardware/prozessoren/65475-arrow-lake-h-intel-core-ultra-9-285h-im-test.html : 要約ツールで読んだ範囲では mm² の記載なし(タイルの同一性の記述は、要約が混乱していたので採用しない)。
- HotHardware の Arrow Lake-H レビュー(Chrome で表示) https://hothardware.com/reviews/intel-arrow-lake-h-laptop-platform-review?page=1 : 面積やタイル寸法の記載なし。
- Fritzchens Fritz(Flickr、user 130561288@N04)で「Arrow Lake」を検索すると 6 枚出てくるが、すべて Arrow Lake-S(8P+16E)。H や HX の写真はない(2026-11-11 確認)。
- Kurnal Insights のギャラリー(2026-11-11 に再確認): Arrow Lake は S だけ。前回から変わっていない。

### B. Meteor Lake(185H)の Base タイル

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| 185H の Base タイル | **計測値は未取得** | — | — | 2026-11-11 | — |
| Kurnal Insights「Meteor Lake Base Tile (22nm SOI)」 | 「ダイサイズなし」と表示 | — | https://kurnal-insights.com/en/dieshot/ | 2026-11-11 | 確認済み(カードに「ダイサイズなし」とある) |
| 試作版 MTL-M(Type4 パッケージ)の Base タイル(参考) | 182.3 mm²(16.8 × 10.85 mm) | [推定](フォーラム利用者 repoman27 が、CNET が載せた試作パッケージの写真から自分で測った値。2+8 構成の試作品で、185H(6+8)とは別物) | https://forums.anandtech.com/threads/intel-current-and-future-lakes-rapids-thread.2509080/post-40670891 (2022-01-07) | 2026-11-11 | 確認済み。同じ投稿にパッケージ 23 × 19 mm、CPU タイル 37.9、SoC 94.5、GPU 23.6 mm² がある。別の利用者(dullard)はパッケージを 23.3 × 20.7 mm と測り、Locuza の 23 × 20 mm とも違うと書いている。**185H には使えない** |
| 185H パッケージ寸法 | 50 mm × 25 mm | [公表] | https://www.intel.com/content/www/us/en/products/sku/236849/intel-core-ultra-9-processor-185h-24m-cache-up-to-5-10-ghz/specifications.html | 2026-11-11 | 確認済み(FCBGA2049。285H と同じ寸法) |
| Hot Chips 34 の Intel 資料(Wilfred Gomes、Meteor Lake / Arrow Lake) | Base タイルの寸法なし(バンプピッチ 36 µm などだけ) | — | https://www.hc34.hotchips.org/assets/program/conference/day2/Mobile%20and%20Edge/Meteor_Lake_Hotchips%20_%20Wilfred%20_%20final_submit%20(1).pdf | 2026-11-11 | 確認済み(PDF をダウンロードして本文を全文検索した) |

- Kurnal の X 投稿「Intel Meteor Lake CPU Size」(2024-09-07) https://x.com/Kurnalsalts/status/1832124179166171485 : 載っているのはコア単体の面積(Redwood Cove 5.05、Crestmont 1.007、SoC 内の LP-E 1.415 mm²)だけ。Base タイルの値はない。
- Fritzchens Fritz の Flickr で「Meteor Lake」を検索した結果は 0 件。
- IEEE・ISSCC・VLSI の Meteor Lake の論文で Base タイルの面積を書いたものは、検索で見つからなかった。

### C. AMD Kraken(Krackan)Point

| 項目 | 面積 | 区分 | 出典 URL | 取得日 | 原ページ確認 |
|---|---|---|---|---|---|
| Ryzen AI 5 340 の Die Size(TechPowerUp CPU DB) | 195 mm² | 出典不明の DB 値(採用しない) | https://www.techpowerup.com/cpu-specs/ryzen-ai-5-340.c4005 | 2026-11-11 | 確認済み(「ダイサイズ 195 mm²」、TSMC 4 nm、FP8。トランジスタ数の欄なし) |
| TechPowerUp GPU DB「AMD Krackan Point」 | 195 mm² | 出典不明の DB 値 | https://www.techpowerup.com/gpu-specs/amd-krackan-point.g1092 | 2026-11-11 | 確認済み(本文に「ダイサイズは195mm²」。トランジスタ数なし、出典なし) |
| Ryzen AI 5 330 の Die Size(TechPowerUp CPU DB) | 欄なし | — | https://www.techpowerup.com/cpu-specs/ryzen-ai-5-330.c4225 | 2026-11-11 | 確認済み |
| Ryzen AI 5 330 のダイ | 別のダイ「Krackan Point 2」(面積は**未取得**) | [二次] | TechPowerUp「AMD Ryzen AI 5 330 "Krackan Point 2" Silicon Has 1P+3C Cores」(2025-07-17) https://www.techpowerup.com/339018/amd-ryzen-ai-5-330-krackan-point-2-silicon-has-1p-3c-cores | 2026-11-11 | 確認済み(「based on a physically smaller monolithic chip dubbed "Krackan Point 2."」、N4P) |
| nanoreview「Radeon 860M」 | 233 mm²、340 億トランジスタ | 出典不明の DB 値(採用しない) | https://nanoreview.net/en/gpu/radeon-860m | 2026-11-11 | 確認済み。値が Strix Point(232.5 mm²)とほぼ同じなので、Strix Point の値を間違えて載せた可能性がある(確認はできない) |
| topcpu.net「Ryzen AI 7 Pro 360」 | 137 mm² | 未確認(参考・検索要約のみ) | https://www.topcpu.net/en/cpu-c/amd-ryzen-ai-7-pro-360-vs-amd-ryzen-5-pro-7545u | 2026-11-11 | 開いていない。DB サイトの間で値がばらばら(137 / 195 / 233)なことを示す例として記録した |

- Tom's Hardware「Here's all the silicon AMD launched at CES 2025」(2025-01-07) https://www.tomshardware.com/pc-components/cpus/heres-all-the-sexy-silicon-amd-launched-at-ces-2025-strix-halo-krackan-point-ryzen-9000x3d-fire-range-and-hawk-point-refresh-pose-for-family-photo (Chrome で確認済み): AMD が配ったパッケージ写真について「based on visual cues, the wider chip is likely Krackan」とだけ書く。面積の記載はない。
- heise / c't「Krackan Point 2」(2025-07-03) https://www.heise.de/en/news/Krackan-Point-2-AMD-is-apparently-planning-another-Die-for-Ryzen-AI-300-10472797.html (確認済み): Krackan Point は「4 基の Zen 5 と 4 基の Zen 5c、8 CU」。面積の記載はない。
- AnandTech フォーラム(Zen 5 スレッド、2025-01-02、gdansk): 「It's bigger than Phoenix」(要約ツール経由の引用。数値なし)。前回記録した「Phoenix と Hawk Point は同じ 178 mm² のダイ。Krackan のダイ面積はどこにもない」(2025-11-01)という発言と合わせても、Krackan の数値の根拠にはならない。
- Fritzchens Fritz の Flickr で「Krackan」を検索した結果は 0 件。「Ryzen AI」で出てくるのは Renoir の動画 1 件だけ。Kurnal Insights のギャラリーにも Krackan はない(Strix Point と Strix Halo だけ)。
- Strix Point(232.5 mm²)と比べた面積の比を書いた資料は見つからなかった。

### 追加調査で読めなかった・使わなかったもの

- TechPowerUp の CPU DB を、ページ内スクリプトの fetch で読もうとした: ボット確認(スライダー)が出た。突破はせず、通常のページ遷移に切り替えた
- X(Twitter)の個別投稿: ログインしないと返信の一部しか表示されない
- Wayback Machine(archive.org)と Google キャッシュ: Chrome で原ページを直接開けたので、使わなかった
