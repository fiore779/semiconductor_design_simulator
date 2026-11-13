# 面積が不明なタイルの出典調査(2026-11-13)

調査のみ(コード・プリセット・git は触っていない)。`die-areas-missing-2026-11-11.md`(追加調査を含む)で調べ済みの範囲は繰り返さず、そこで見ていない出典と、日付が進んで更新されうるページの再確認だけを行った。推測・補間はしていない。

- 区分: [公表] = Intel・AMD の公式資料 / [実測] = ダイ写真・実物の計測(測った人と方法が分かる) / [二次] = 報道・Wikipedia・DB の転記 / [推定] = 目測・見積もり・根拠を示さない値
- 取得日はすべて 2026-11-13。
- 使った手段: WebSearch(standard / extended)と WebFetch。Chrome は使っていない(前回 Chrome で開いたページを繰り返す必要がなく、新しい候補ページは WebFetch で読めた)。

## 0. 結論

**今回、新しく取得できた面積は 1 つもない。** 対象のタイルはすべて「未取得」のまま。

| 対象 | 面積 mm² | プロセス | 区分 | 結論 |
|---|---|---|---|---|
| 285H Compute タイル(6P+8E) | 未取得 | TSMC N3B([公表] Intel データシート) | — | 公式・ダイ写真の計測のどちらにも値がない |
| 285H SoC タイル | 未取得 | TSMC N6([二次] Notebookcheck) | — | 「Meteor Lake から引き継ぎ」という記述はあるが、面積を書いた出典はない |
| 285H GPU タイル(Xe 8 基) | 未取得 | TSMC N5P([二次] Notebookcheck) | — | 値なし |
| 285H IO(IOE)タイル | 未取得 | TSMC N6([二次] Notebookcheck) | — | 値なし |
| 285H Base タイル | 178(ユーザー提示) | Intel 22nm 系([二次] Notebookcheck) | 出典未確認のまま | 178 mm² を書いた出典は見つからなかった。区分は格上げできない |
| 185H Base タイル | 未取得 | Intel 16 / 22FFL([二次]) | — | 計測値なし。265.65 は発売前の見積もり([推定])のまま |
| Kraken(Krackan)Point | 未取得 | TSMC N4P([二次]) | — | ダイ写真・公式値なし。195 は出典不明の DB 値のまま |

## 1. Core Ultra 9 285H(Arrow Lake-H)

| タイル | 面積 mm² | プロセス | 出典 URL | 取得日 | 区分 |
|---|---|---|---|---|---|
| Compute(6P+8E) | **未取得** | TSMC N3B | プロセス: https://cdrdv2-public.intel.com/842704/842704-002.pdf (「built on N3B process technology」) | 2026-11-13 | プロセスのみ [公表] |
| SoC | **未取得** | TSMC N6 | プロセス: https://www.notebookcheck.net/Intel-Core-Ultra-9-285H-Processor-Benchmarks-and-Specs.944114.0.html (11-11 確認済み) | — | プロセスのみ [二次] |
| GPU(Xe 8 基) | **未取得** | TSMC N5P | 同上 | — | プロセスのみ [二次] |
| IO(IOE) | **未取得** | TSMC N6 | 同上 | — | プロセスのみ [二次] |
| Base | 178(ユーザー提示) | Intel 22nm 系 | **出典なし** | — | 出典未確認(区分を付けられない) |

今回新しく確認したこと:

- **Intel 公式データシート(新規)**: 「Intel Core Ultra 200H and 200U Series Processors Datasheet, Volume 1 of 2」(Doc. No. 842704、Rev. 002、2025 年 5 月) https://cdrdv2-public.intel.com/842704/842704-002.pdf 。PDF の本文を全文検索した。[公表]
  - 載っているもの: パッケージ BGA2049、25 × 50 mm、Tile Configuration「Foveros」、基板 Z = 0.644 ± 0.095 mm、BGA 底面からタイル上面まで 1.245 ± 0.109 mm、最小ボールピッチ 0.65 mm。「H-Processor Line … includes the Compute, SOC, GT, and IOE tiles on the same package」。Compute は P コア最大 6・E コア 8、SoC タイルの E コア 2。
  - **載っていないもの: タイル・ダイの寸法や面積**(§3.1 Package Mechanical Attributes、§3.2 Package Loading and Tile Pressure Specifications のどちらにもない。圧力の基準は「2 mm × 2 mm の領域あたり」で、タイルの寸法ではない)。SoC・GT・IOE・Base のプロセスも書いていない。
- **Chips and Cheese「Intel's CES 2025 Keynote」を原ページで確認**(前回は検索要約のみだった) https://chipsandcheese.com/p/intels-ces-2025-keynote 。[二次]
  - 原文: 「With 6 Lion Cove cores and 8 Skymont cores, it uses the same cores as the desktop Arrow Lake on the CPU tile」「the SOC tile being carried over from Meteor Lake」「the LP E-Cores are the same Crestmont cores as from the prior generation」。
  - **前回の要約の訂正**: 前回は「desktop Arrow Lake の CPU タイルを組み合わせる」と記録したが、原文は「同じ**コア**を使う」であり、同じタイルとは言っていない。PC Watch の「コンピュートタイルは別ダイ」と食い違わない。
  - 面積・寸法の記載はない。
- **Wikipedia「Arrow Lake (microprocessor)」を再確認**: 表は S の値(117.241 / 23 / 86.648 / 24.475 / 302.944)だけで、11-11 から変わっていない。H 用の行はない。
- **Kurnal Insights のギャラリーを再確認** https://kurnal-insights.com/en/dieshot/ : Arrow Lake は S の 5 件だけ。H はない(11-11 から変化なし)。
- **178 mm²(Base)の出典探し**: 「Arrow Lake-H base tile 178」で extended 検索したが、この値を書いたページは出てこなかった。なお 178 mm² は AMD Phoenix / Hawk Point のダイ面積としてよく引かれる値と同じ数字で、取り違えの可能性は否定できない(確認はできない)。
- ユーザー提示の他の値(Compute 約 65〜75、SoC 約 95、GPU 約 40〜45、IO 約 10〜24.5)を裏づける出典も見つからなかった。**値としては採用しない**(前回と同じ扱い)。

新しく調べたが数値がなかったもの: TechInsights(Arrow Lake-H / 255H / 285H の解析の公開ページは検索で見つからない)、ASCII(大原雄介氏のロードマップ連載。H のダイサイズ推定は検索で出ない)、AnandTech フォーラム(H のタイルを測った投稿は検索で出ない)、中国語圏(「285H 开盖 面积」。該当なし)、MLID のリーク写真の報道(TweakTown。タイルの配置だけで寸法なし。検索要約のみ・原ページ未確認)。

## 2. Core Ultra 9 185H(Meteor Lake)の Base タイル

| タイル | 面積 mm² | プロセス | 出典 URL | 取得日 | 区分 |
|---|---|---|---|---|---|
| Base(Foveros) | **未取得**(計測値なし) | Intel 16 / 22FFL(Wikipedia)。Kurnal は「22nm SOI」と表記 | — | 2026-11-13 | — |
| Base(参考) | 265.65(23.1 × 11.5 mm) | 同上 | https://wccftech.com/intel-could-dish-out-an-estimated-365000-next-gen-meteor-lake-cpu-tiles-per-month/ (Wikipedia「Meteor Lake」が転記) | 2026-11-13(Wikipedia を再確認) | [推定](発売前のウェハ写真からの見積もり。Wikipedia 本文も「is estimated to be」と書く)。採用不可 |

- Wikipedia「Meteor Lake」を再確認: 表・本文とも 11-11 から変わっていない(Base 265.65 の出典は wccftech 2023-08-28 の見積もり記事のまま)。
- Kurnal Insights「Intel Meteor Lake Base Tile (22nm SOI)」は今も寸法なし。
- Meteor Lake のデータシート(Doc. No. 792044)は取得がタイムアウトで読めなかった。同じ書式の 200H 版(§1)にタイル寸法がないので、載っている見込みは低いが、**未確認**。
- SemiAnalysis・HighYield・ISSCC / VLSI で Base タイルの面積を書いたものは、今回の検索でも出てこなかった。

## 3. AMD Kraken(Krackan)Point

| ダイ | 面積 mm² | プロセス | 出典 URL | 取得日 | 区分 |
|---|---|---|---|---|---|
| Krackan Point(350 / 340) | **未取得** | TSMC N4P | — | 2026-11-13 | — |
| 同(参考) | 195 | — | TechPowerUp DB・Technical City・cpu-wiki(11-11 確認済み) | — | 出典不明の DB 値。採用しない |
| 同(参考) | 約 190 / 約 198 | — | AnandTech フォーラムの見積もり(11-11 確認済み / 検索要約) | — | [推定] にも満たない |
| Krackan Point 2(330) | **未取得** | TSMC N4P | — | 2026-11-13 | — |

- Wikipedia「Zen 5」を再確認: ダイ面積は Zen 5 CCD 70.6 と Strix Point 232.5 だけ。Krackan の値はない(11-11 から変化なし)。
- Kurnal Insights のギャラリーに Krackan・Gorgon はまだない(Strix Point 225.6、Strix Halo だけ)。
- TechInsights の Krackan 解析、Gorgon Point(Ryzen AI 400)のダイ写真・面積、日本語記事での推定値は、検索で見つからなかった。
- AMD ISSCC 2025 など学会資料で Krackan の面積を書いたものは、検索で出てこなかった(個別の論文本文は開いていない)。

## 4. プリセットへの扱い

- **新しくプリセットに入れてよい値: なし。**
- 現状維持でよいもの(前回までに確認済み): 185H の Compute 68.1 / GPU 41.9 / SoC 96.8 / IOE 24.7(Kurnal の計測)、285K の各タイル(HighYield / Kurnal)。
- 285H の Base 178 mm² は、出典が見つからないので「ユーザー提示・出典未確認」の注記のまま。区分の格上げはできない。
- 未取得のまま: 285H の Compute / SoC / GPU / IO、185H の Base、Krackan Point、Krackan Point 2。

## 5. 読めなかったページ

- https://edc.intel.com/…/core-ultra-200h-and-200u-series-processors-datasheet-volume-1-of-2/package-mechanical-attributes/ : タイムアウト(同じ内容を PDF 版 842704-002 で確認した)
- https://www.mouser.com/datasheet/2/612/Intel_792044_004-3453146.pdf (Meteor Lake データシート): タイムアウト
- HighYield の動画本体(YouTube): 開いていない
