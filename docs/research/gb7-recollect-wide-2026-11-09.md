# Geekbench 7 公開値の取り直し(取得範囲を広げる。Ryzen AI Max+ 395・Core Ultra 7 258V。2026-11-09)

収集のみ。リポジトリのコード・プリセット・`data/benchmarks/gb7-scores.js`・既存 docs は変更していない。

## 0. 目的と方法

- 背景: 2026-11-07 の取り直し(`gb7-recollect-2026-11-07.md`。直近 25 件=検索結果 1 ページ目の全体中央値)で、395 と 258V は 1 ページ目の偏りが大きかった。395 は MT の Linux 15 件がすべて ROG Flow Z13(約 30,000)、258V は Linux の同一機種(Lenovo 21U2S05200)7 件が MT 約 2000。
- ユーザー指示: 「395 と 258V は取得範囲を広げて取り直す。中央値は全体(OS で絞らない)」。
- 取得: Chrome(Claude in Chrome)で新しいタブを開き、`https://browser.geekbench.com/v7/cpu/search?q=<名前>` を表示。同じタブ内から `&page=1`〜`&page=8` を同じ URL で取得し(ページ間 1.5 秒)、DOM の行(機種名・プロセッサ名・コア数・OS・ST・MT・結果 ID)を抜き出して集計した。**8 ページ(200 件)まで全部取れた**。ボット確認は出なかった。結果 ID は 200 件とも重複なし(取得中のページずれなし)。取得 2026-11-09。
- 除外規則(設計書 §2.4・11-07 の文書と同じ): (a) コア数が SKU と一致しない投稿、(b) 仮想環境の投稿、(c) 検索の部分一致で混ざった別 SKU 名(PRO 版など)。**ST が極端に低いだけの投稿は除外しない**。
- 中央値: n が奇数なら中央の値、偶数なら中央 2 値の平均を四捨五入。範囲は「検索結果の先頭から何件まで」(25 / 50 / 100 / 200 件)で、除外後の件数が n。
- 採用値の決め方(指示どおり): **全体の中央値**を、n≥100 となる範囲で決める(取れなければ最大範囲)。
- 注意: 11-07 以降の新しい投稿が先頭に入ったため、今回の「先頭 25 件」は 11-07 の 1 ページ目と同じではない(395 は新着 11 件、258V は新着 14 件。11-07 の 1 ページ目は 395 で今回の #12〜#36、258V で #15〜#39 にあたる)。
- 機種名は Geekbench の表示(システム名)。同一機種の集計では型番の表記ゆれ(例: 「ASUS ROG Flow Z13 GZ302EAC」と「ASUSTeK … ROG Flow Z13 GZ302EA_GZ302EA」)をまとめた。

## 1. Ryzen AI Max+ 395(Strix Halo、16c)

- 検索語: `Ryzen AI Max+ 395`(検索結果 1,279 件)。現在の公開値: ST 2764 / MT 29916(11-07 の直近 25 件の中央値。その前はチャート 2423 / 20787)。

### 1.1 範囲ごとの中央値の推移

| 範囲(先頭から) | 除外 | n | 全体 ST | 全体 MT | Windows(n / ST / MT) | Linux(n / ST / MT) | ST の範囲 | MT の範囲 |
|---|---|---|---|---|---|---|---|---|
| 25 件 | 別 SKU 1 | 24 | 2764 | 30024 | 6 / 2660 / 22046 | 18 / 2792 / 30504 | 2034〜2834 | 19617〜31069 |
| 50 件 | 別 SKU 1、コア数 2 | 47 | 2737 | 27527 | 19 / 2651 / 23135 | 28 / 2801 / 30273 | 2034〜2834 | 19617〜31069 |
| 100 件 | 別 SKU 11、コア数 3 | 86 | 2652 | 23474 | 45 / 2626 / 21778 | 41 / 2790 / 29938 | 1206〜2872 | 5915〜31069 |
| **200 件** | 別 SKU 26、コア数 3 | **171** | **2650** | **23661** | 101 / 2628 / 22076 | 70 / 2747 / 27936 | 941〜2893 | 5915〜31069 |

- 100 件の範囲では n=86(<100)。**n≥100 になるのは 200 件の範囲**(n=171)。

### 1.2 除外の内訳(200 件中 29 件)

- 別 SKU 26 件: プロセッサ名が「AMD Ryzen AI Max+ **PRO** 395」。HP ZBook Ultra G1a 14 が 25 件、HP Z2 Mini G1a が 1 件(#24, 59〜63, 84, 86〜89, 101, 113, 116, 144, 145, 156, 163, 166〜168, 170, 176, 177, 181, 199)。
- コア数 3 件: 「Microsoft Corporation Virtual Machine」、8 コア表示、Linux(#45, 47, 69)。仮想環境でもある。
- 注: HP ZBook Ultra G1a でもプロセッサ名が「AMD Ryzen AI Max+ 395」(PRO なし)の 5 件(#151〜153, 155, 157)は、名前が一致するので採用した。

### 1.3 機種の偏り(採用分)

| 範囲 | 最多機種(件数 / n、割合) | 2 位以下 |
|---|---|---|
| 25 件 | ROG Flow Z13 GZ302: 18 / 24(75%) | Default string 3 |
| 50 件 | ROG Flow Z13 GZ302: 29 / 47(62%) | AMD RAH-00 4、Default string 3、Six United AX 3、GEEKOM A9 Mega 3 |
| 100 件 | ROG Flow Z13 GZ302: 41 / 86(48%) | Micro Computer (HK) MS-S1 9、Bosgame BeyondMax 7、AMD RAH-00 6、Default string 5 |
| 200 件 | ROG Flow Z13 GZ302: 82 / 171(48%) | Micro Computer (HK) MS-S1 14、GMKtec EVO-X2 12、Bosgame BeyondMax 12、ASUS ProArt PX13 11 |

参考(採用値ではない。200 件の範囲):
- ROG Flow Z13 のみ n=82 → 2666 / 24742(Windows 43 件 → 2646 / 23335、Linux 39 件 → 2790 / 29958)。Z13 は OS で MT が大きく分かれる。
- ROG Flow Z13 を除く n=89 → 2642 / 22412(Windows 58 件 → 2621 / 21789、Linux 31 件 → 2741 / 27292)。
- 100 件の範囲: Z13 のみ n=41 → 2785 / 29938、Z13 を除く n=45 → 2633 / 21909。
- Linux はミニ PC(GMKtec EVO-X2/X3、Bosgame、Framework Desktop など)でも MT 27,000〜30,000 と高く、Windows より MT が高い傾向は Z13 だけのものではない。

### 1.4 判定と推奨

- 推移: ST 2764(25)→ 2737(50)→ 2652(100)→ 2650(200)。MT 30024 → 27527 → 23474 → 23661。
  - 25 件と 200 件の差: ST −4.1%、MT −21.2%(25 件は Linux の Z13 連続投稿に引っ張られていた)。
  - 100 件と 200 件の差: ST −0.1%、MT +0.8%。**100 件以降は安定**。
- **推奨: 200 件の範囲の全体中央値 ST 2650 / MT 23661(n=171)を採用**。100 件(2652 / 23474)とほぼ同じで、範囲の取り方への感度は小さい。
- 注意: 200 件でも ROG Flow Z13 が 48% を占める(Z13 の MT は Windows 約 23,000 / Linux 約 30,000 の二峰)。Z13 を除いても 2642 / 22412 で、全体中央値との差は ST −0.3% / MT −5.3% にとどまる。ST 1000〜1400 の低い投稿(MS-S1 の Windows 7 件、ProArt PX13 の Linux 3 件、Z13 など)は規則どおり残した。

## 2. Core Ultra 7 258V(Lunar Lake、8c)

- 検索語: `Core Ultra 7 258V`(検索結果は 11-07 時点で 1,144 件。今回の総数は記録していない)。現在の公開値: ST 1957 / MT 9807(11-07 の直近 25 件の中央値。その前はチャート 2096 / 9227)。
- 200 件すべてプロセッサ名「Intel Core Ultra 7 258V」・8 コア。仮想環境の機種名なし。

### 2.1 範囲ごとの中央値の推移

| 範囲(先頭から) | 除外 | n | 全体 ST | 全体 MT | Windows(n / ST / MT) | Linux(n / ST / MT) | ST の範囲 | MT の範囲 |
|---|---|---|---|---|---|---|---|---|
| 25 件 | なし | 25 | 2357 | 10471 | 16 / 2300 / 10407 | 9 / 2503 / 10865 | 1052〜2669 | 3186〜12343 |
| 50 件 | なし | 50 | 2203 | 10204 | 33 / 2262 / 10343 | 17 / 1957 / 3663 | 1052〜2669 | 1590〜12343 |
| **100 件** | なし | **100** | **2226** | **10125** | 70 / 2161 / 10094 | 30 / 2435 / 10561 | 965〜2669 | 1590〜12343 |
| **200 件** | なし | **200** | **2268** | **10109** | 130 / 2256 / 9941 | 70 / 2364 / 10646 | 932〜2669 | 1590〜12343 |

### 2.2 機種の偏り

| 範囲 | 最多機種(件数 / n、割合) | 2 位以下 |
|---|---|---|
| 25 件 | ASUS Zenbook S 14 UX5406: 6 / 25(24%) | MSI Claw 4、ASUS Vivobook S 14 S5406 3、Lenovo 21U2S05200 2 |
| 50 件 | Lenovo 21U2S05200: 9 / 50(18%) | HP OmniBook Ultra Flip 14 7、Zenbook S 14 6、MSI Claw 4 |
| 100 件 | HP OmniBook Ultra Flip 14: 16 / 100(16%) | Zenbook S 14 12、Lenovo 21U2S05200 10、HP OmniBook X Flip 16 7、Lenovo 83HM 5 |
| 200 件 | ASUS Zenbook S 14 UX5406: 45 / 200(22.5%) | HP OmniBook Ultra Flip 14 21、HP OmniBook X Flip 16 16、Lenovo 21U2S05200 10、MSI Claw 8 |

参考(採用値ではない):
- Lenovo 21U2S05200 は 200 件中 10 件(5%)で、すべて先頭 54 件内にある(Linux 9 件は MT 1590〜3663、Windows 1 件〔#54〕は MT 10083)。この機種を除くと 100 件 n=90 → 2269 / 10318、200 件 n=190 → 2286 / 10206。
- Zenbook S 14 のみ n=45 → 2272 / 10087、除くと n=155 → 2262 / 10113(最多機種の影響は小さい)。
- 50 件で Linux 中央値が 1957 / 3663 に落ちるのは 21U2S05200 の連続投稿のため。範囲を広げると Linux は 2364 / 10646 で Windows より高い。

### 2.3 判定と推奨

- 推移: ST 2357(25)→ 2203(50)→ 2226(100)→ 2268(200)。MT 10471 → 10204 → 10125 → 10109。
  - 25 件と 200 件の差: ST −3.8%、MT −3.5%(今回の先頭 25 件は新着で 21U2S05200 が 2 件しか入らず、11-07 の 1 ページ目〔ST 1957〕より高い)。
  - 100 件と 200 件の差: ST +1.9%、MT −0.2%。**100 件以降は安定**(ST は ±2% 程度、MT はほぼ不変)。
- **推奨: 200 件の範囲の全体中央値 ST 2268 / MT 10109(n=200)を採用**。n≥100 を満たす最小範囲の 100 件(2226 / 10125)を採っても差は ST −1.9% / MT +0.2%。大きい n を優先して 200 件を推す。
- 異常な 21U2S05200 の影響は 200 件では 5% に薄まり、除いた場合との差は ST −0.8% / MT −1.0%。ST 1000 前後の低い投稿(Acer Aspire A14-53M 5 件、NEC、Lenovo 21NS008VPG ほか)は規則どおり残した。

## 3. 新旧一覧

| SKU | 現在の公開値 ST / MT(11-07、直近 25 件) | 新 ST / MT(200 件の範囲の全体中央値) | n | ST の差 | MT の差 | 参考: 旧チャート値との差 | 安定性 |
|---|---|---|---|---|---|---|---|
| Ryzen AI Max+ 395 | 2764 / 29916 | **2650 / 23661** | 171 | −4.1% | **−20.9%** | 2423 / 20787 → ST +9.4% / MT +13.8% | 100→200 件で ST −0.1% / MT +0.8%(安定) |
| Core Ultra 7 258V | 1957 / 9807 | **2268 / 10109** | 200 | **+15.9%** | +3.1% | 2096 / 9227 → ST +8.2% / MT +9.6% | 100→200 件で ST +1.9% / MT −0.2%(安定) |

- 差 = 新 ÷ 現在の公開値 − 1。値は 2026-11-09 時点の検索結果の先頭 200 件のもので、投稿が増えると変わる。
- 反映(設計書 §2.4 の GB7 表・`gb7-scores.js` の再生成)はしていない。採用するかは判断待ち。

## 4. 生データ(先頭 200 件、2026-11-09 取得)

OS: W = Windows、L = Linux。機種名は一部短縮(「ASUSTeK COMPUTER INC.」「HP HP」などを省略)。除外欄が空なら採用。

### 4.1 Ryzen AI Max+ 395(全件 16 コア表示。除外欄に記載したものを除く)

| # | 機種 | OS | ST | MT | 除外 |
|---|---|---|---|---|---|
| 1 | Default string | L | 2719 | 27444 | |
| 2 | Default string | L | 2737 | 27087 | |
| 3 | GMKtec NucBox_EVO-X2 | W | 2577 | 20957 | |
| 4 | ASUS ROG Flow Z13 GZ302EAC | W | 2669 | 23335 | |
| 5 | ASUS ROG Flow Z13 GZ302EAC | L | 2834 | 31069 | |
| 6 | ASUS ROG Flow Z13 GZ302EAC | L | 2832 | 30927 | |
| 7 | GMKtec EVO-X3 | L | 2332 | 24662 | |
| 8 | ROG Flow Z13 GZ302EA | L | 2828 | 30299 | |
| 9 | ROG Flow Z13 GZ302EA | L | 2797 | 30281 | |
| 10 | ROG Flow Z13 GZ302EA | L | 2806 | 30365 | |
| 11 | ROG Flow Z13 GZ302EA | L | 2743 | 29767 | |
| 12 | Default string | W | 2651 | 20919 | |
| 13 | ROG Flow Z13 GZ302EA | W | 2486 | 19617 | |
| 14 | ASUS ROG Flow Z13 GZ302EAC | L | 2665 | 22156 | |
| 15 | ASUS ROG Flow Z13 GZ302EAC | L | 2785 | 30768 | |
| 16 | ASUS ROG Flow Z13 GZ302EAC | L | 2804 | 30687 | |
| 17 | ASUS ROG Flow Z13 GZ302EAC | L | 2791 | 30841 | |
| 18 | ASUS ROG Flow Z13 GZ302EAC | L | 2793 | 30642 | |
| 19 | ASUS ROG Flow Z13 GZ302EAC | L | 2804 | 30885 | |
| 20 | ASUS ROG Flow Z13 GZ302EAC | L | 2790 | 30908 | |
| 21 | ASUS ROG Flow Z13 GZ302EAC | L | 2034 | 25051 | |
| 22 | ASUS ROG Flow Z13 GZ302EAC | L | 2808 | 30712 | |
| 23 | ROG Flow Z13 GZ302EA | W | 2725 | 23291 | |
| 24 | HP ZBook Ultra G1a 14 | W | 2649 | 21988 | 別 SKU(PRO 395) |
| 25 | SU AXB35-03 | W | 2674 | 23135 | |
| 26 | ROG Flow Z13 GZ302EA | L | 2812 | 30209 | |
| 27 | Six United AX | W | 2683 | 22543 | |
| 28 | Six United AX | W | 2594 | 21909 | |
| 29 | Six United AX | W | 2614 | 23248 | |
| 30 | ROG Flow Z13 GZ302EA | L | 2817 | 30204 | |
| 31 | ROG Flow Z13 GZ302EA | L | 2822 | 29893 | |
| 32 | ROG Flow Z13 GZ302EA | L | 2819 | 30155 | |
| 33 | ROG Flow Z13 GZ302EA | W | 2742 | 27156 | |
| 34 | SU AXB35-03 | W | 2692 | 21487 | |
| 35 | ROG Flow Z13 GZ302EA | L | 2817 | 29938 | |
| 36 | ROG Flow Z13 GZ302EA | L | 2515 | 30603 | |
| 37 | ROG Flow Z13 GZ302EA | L | 2795 | 30087 | |
| 38 | ROG Flow Z13 GZ302EA | L | 2815 | 30265 | |
| 39 | AMD RAH-00 | W | 2690 | 26530 | |
| 40 | ROG Flow Z13 GZ302EA | L | 2816 | 30369 | |
| 41 | AMD RAH-00 | W | 2653 | 25194 | |
| 42 | AMD RAH-00 | W | 2611 | 26486 | |
| 43 | ROG Flow Z13 GZ302EA | L | 2790 | 29958 | |
| 44 | GEEKOM A9 Mega | W | 2646 | 21800 | |
| 45 | Microsoft Virtual Machine | L | 1499 | 14570 | コア数(8)・仮想環境 |
| 46 | GEEKOM A9 Mega | W | 2626 | 22412 | |
| 47 | Microsoft Virtual Machine | L | 1498 | 14831 | コア数(8)・仮想環境 |
| 48 | GEEKOM A9 Mega | W | 2642 | 22406 | |
| 49 | Micro Computer (HK) MS-S1 | W | 2437 | 25019 | |
| 50 | AMD RAH-00 | W | 2674 | 27527 | |
| 51 | AMD RAH-00 | W | 2545 | 27271 | |
| 52 | AMD RAH-00 | L | 2747 | 24613 | |
| 53 | BOSGAME BeyondMax | W | 2497 | 20091 | |
| 54 | Default string | L | 2872 | 28759 | |
| 55 | ASUS ProArt PX13 HN7306EAC | W | 2672 | 20609 | |
| 56 | ROG Flow Z13 GZ302EA | W | 2631 | 20761 | |
| 57 | Acemagic M1A Pro Plus | W | 2697 | 22333 | |
| 58 | Bosgame BeyondMax | W | 2648 | 21137 | |
| 59 | HP ZBook Ultra G1a 14 | W | 1594 | 17232 | 別 SKU(PRO 395) |
| 60 | HP ZBook Ultra G1a 14 | W | 1580 | 16833 | 別 SKU(PRO 395) |
| 61 | HP ZBook Ultra G1a 14 | W | 2627 | 22283 | 別 SKU(PRO 395) |
| 62 | HP ZBook Ultra G1a 14 | W | 2634 | 22259 | 別 SKU(PRO 395) |
| 63 | HP ZBook Ultra G1a 14 | W | 1550 | 17282 | 別 SKU(PRO 395) |
| 64 | Micro Computer (HK) MS-S1 | W | 2650 | 23901 | |
| 65 | ROG Flow Z13 GZ302EA | W | 2502 | 20752 | |
| 66 | TianBei NEX S | W | 2619 | 24372 | |
| 67 | TianBei NEX S | W | 2580 | 24198 | |
| 68 | BOSGAME BeyondMax | W | 2682 | 21689 | |
| 69 | Microsoft Virtual Machine | L | 1531 | 14645 | コア数(8)・仮想環境 |
| 70 | GMKtec EVO-X2 | W | 2662 | 21616 | |
| 71 | GMKtec EVO-X2 | W | 2546 | 19760 | |
| 72 | ROG Flow Z13 GZ302EA | L | 2420 | 26405 | |
| 73 | ROG Flow Z13 GZ302EA | L | 1595 | 9525 | |
| 74 | ROG Flow Z13 GZ302EA | L | 1637 | 8721 | |
| 75 | ROG Flow Z13 GZ302EA | L | 2130 | 6045 | |
| 76 | ROG Flow Z13 GZ302EA | L | 2173 | 5943 | |
| 77 | ROG Flow Z13 GZ302EA | L | 2133 | 6061 | |
| 78 | ROG Flow Z13 GZ302EA | L | 2143 | 5915 | |
| 79 | ROG Flow Z13 GZ302EA | L | 2139 | 6058 | |
| 80 | ROG Flow Z13 GZ302EA | L | 2274 | 6927 | |
| 81 | ASUS ProArt PX13 HN7306EA | W | 2639 | 20743 | |
| 82 | ROG Flow Z13 GZ302EA | L | 2683 | 25812 | |
| 83 | Default string | W | 2600 | 20776 | |
| 84 | HP ZBook Ultra G1a 14 | W | 2583 | 22250 | 別 SKU(PRO 395) |
| 85 | GMKtec NucBox_EVO-X2 | L | 2751 | 27292 | |
| 86 | HP ZBook Ultra G1a 14 | W | 2593 | 21893 | 別 SKU(PRO 395) |
| 87 | HP ZBook Ultra G1a 14 | W | 2577 | 21424 | 別 SKU(PRO 395) |
| 88 | HP ZBook Ultra G1a 14 | W | 2491 | 21469 | 別 SKU(PRO 395) |
| 89 | HP ZBook Ultra G1a 14 | W | 2039 | 16250 | 別 SKU(PRO 395) |
| 90 | Micro Computer (HK) MS-S1 | W | 2497 | 23613 | |
| 91 | Micro Computer (HK) MS-S1 | W | 1347 | 15602 | |
| 92 | Micro Computer (HK) MS-S1 | W | 1413 | 14694 | |
| 93 | Micro Computer (HK) MS-S1 | W | 1369 | 14687 | |
| 94 | Micro Computer (HK) MS-S1 | W | 1206 | 12751 | |
| 95 | BOSGAME BeyondMax | W | 2610 | 20869 | |
| 96 | BOSGAME BeyondMax | W | 2592 | 20753 | |
| 97 | Micro Computer (HK) MS-S1 | W | 1334 | 13966 | |
| 98 | BOSGAME BeyondMax | W | 2633 | 21820 | |
| 99 | BOSGAME BeyondMax | W | 2670 | 21778 | |
| 100 | Micro Computer (HK) MS-S1 | W | 1322 | 13251 | |
| 101 | HP ZBook Ultra G1a 14 | W | 1530 | 16486 | 別 SKU(PRO 395) |
| 102 | ASUS ProArt PX13 HN7306EA | L | 993 | 17060 | |
| 103 | ASUS ProArt PX13 HN7306EA | L | 1080 | 19515 | |
| 104 | ASUS ProArt PX13 HN7306EA | L | 941 | 15578 | |
| 105 | ROG Flow Z13 GZ302EA | W | 2636 | 19920 | |
| 106 | ASUS ProArt PX13 HN7306EA | L | 2759 | 25773 | |
| 107 | ROG Flow Z13 GZ302EA | W | 1881 | 17653 | |
| 108 | ROG Flow Z13 GZ302EA | W | 1910 | 17976 | |
| 109 | ROG Flow Z13 GZ302EA | W | 1903 | 18207 | |
| 110 | SU AXB35-03 | W | 2635 | 21192 | |
| 111 | SU AXB35-03 | W | 2610 | 22457 | |
| 112 | Win Element H1 | W | 2622 | 21746 | |
| 113 | HP ZBook Ultra G1a 14 | W | 1599 | 17164 | 別 SKU(PRO 395) |
| 114 | GMKtec NucBox_EVO-X2 | W | 2492 | 19342 | |
| 115 | Micro Computer (HK) MS-S1 | L | 2718 | 27251 | |
| 116 | HP ZBook Ultra G1a 14 | W | 1827 | 12102 | 別 SKU(PRO 395) |
| 117 | Micro Computer (HK) MS-S1 | W | 1238 | 14462 | |
| 118 | ASUS ProArt PX13 HN7306EA | L | 2581 | 18510 | |
| 119 | ASUS ProArt PX13 HN7306EA | L | 2635 | 21875 | |
| 120 | GMKtec NucBox_EVO-X2 | L | 2597 | 25450 | |
| 121 | ROG Flow Z13 GZ302EA | L | 2893 | 28920 | |
| 122 | ROG Flow Z13 GZ302EA | L | 1747 | 21438 | |
| 123 | Micro Computer (HK) MS-S1 | W | 1375 | 14034 | |
| 124 | ROG Flow Z13 GZ302EA | W | 2642 | 22552 | |
| 125 | Framework Desktop | L | 2804 | 28166 | |
| 126 | ROG Flow Z13 GZ302EA | W | 2666 | 24735 | |
| 127 | ROG Flow Z13 GZ302EA | W | 2565 | 24748 | |
| 128 | ROG Flow Z13 GZ302EA | W | 2516 | 24550 | |
| 129 | ROG Flow Z13 GZ302EA | W | 2685 | 25897 | |
| 130 | ROG Flow Z13 GZ302EA | W | 2694 | 25941 | |
| 131 | AZW GTR Pro | W | 2561 | 21173 | |
| 132 | Standard SH01 | W | 2396 | 20298 | |
| 133 | ROG Flow Z13 GZ302EA | W | 2720 | 26884 | |
| 134 | ROG Flow Z13 GZ302EA | W | 2646 | 24278 | |
| 135 | ROG Flow Z13 GZ302EA | W | 2721 | 27260 | |
| 136 | ROG Flow Z13 GZ302EA | W | 2720 | 26737 | |
| 137 | ROG Flow Z13 GZ302EA | W | 2717 | 26742 | |
| 138 | ROG Flow Z13 GZ302EA | W | 2713 | 26395 | |
| 139 | ROG Flow Z13 GZ302EA | W | 2708 | 26269 | |
| 140 | ROG Flow Z13 GZ302EA | W | 2658 | 25241 | |
| 141 | ROG Flow Z13 GZ302EA | W | 2589 | 23894 | |
| 142 | Micro Computer (HK) MS-S1 | W | 2619 | 23661 | |
| 143 | ROG Flow Z13 GZ302EA | W | 2700 | 25902 | |
| 144 | HP ZBook Ultra G1a 14 | W | 1415 | 17054 | 別 SKU(PRO 395) |
| 145 | HP ZBook Ultra G1a 14 | W | 1402 | 16773 | 別 SKU(PRO 395) |
| 146 | GMKtec EVO-X2 | W | 2679 | 26589 | |
| 147 | ROG Flow Z13 GZ302EA | W | 1306 | 13790 | |
| 148 | ROG Flow Z13 GZ302EA | W | 1262 | 13753 | |
| 149 | AZW GTR Pro | L | 2741 | 27458 | |
| 150 | ROG Flow Z13 GZ302EA | W | 1810 | 13473 | |
| 151 | HP ZBook Ultra G1a 14 | W | 2251 | 22166 | (名前は 395。採用) |
| 152 | HP ZBook Ultra G1a 14 | W | 2628 | 21708 | (名前は 395。採用) |
| 153 | HP ZBook Ultra G1a 14 | W | 2629 | 21918 | (名前は 395。採用) |
| 154 | ROG Flow Z13 GZ302EA | W | 2061 | 15697 | |
| 155 | HP ZBook Ultra G1a 14 | W | 2682 | 22633 | (名前は 395。採用) |
| 156 | HP ZBook Ultra G1a 14 | W | 2643 | 21208 | 別 SKU(PRO 395) |
| 157 | HP ZBook Ultra G1a 14 | W | 2663 | 22123 | (名前は 395。採用) |
| 158 | ROG Flow Z13 GZ302EA | W | 2132 | 14931 | |
| 159 | ROG Flow Z13 GZ302EA | W | 2026 | 19467 | |
| 160 | ASUS ProArt PX13 HN7306EAC | W | 2650 | 21827 | |
| 161 | BOSGAME BeyondMax | L | 2825 | 27906 | |
| 162 | BOSGAME BeyondMax | L | 2829 | 28579 | |
| 163 | HP ZBook Ultra G1a 14 | W | 2202 | 20175 | 別 SKU(PRO 395) |
| 164 | BOSGAME BeyondMax | L | 2826 | 28242 | |
| 165 | BOSGAME BeyondMax | L | 2810 | 27854 | |
| 166 | HP ZBook Ultra G1a 14 | W | 2536 | 22006 | 別 SKU(PRO 395) |
| 167 | HP ZBook Ultra G1a 14 | W | 1639 | 16121 | 別 SKU(PRO 395) |
| 168 | HP ZBook Ultra G1a 14 | W | 2647 | 18675 | 別 SKU(PRO 395) |
| 169 | GMKtec NucBox_EVO-X2 | L | 2733 | 26044 | |
| 170 | HP ZBook Ultra G1a 14 | W | 2565 | 21455 | 別 SKU(PRO 395) |
| 171 | Bosgame BeyondMax | L | 2811 | 28723 | |
| 172 | ROG Flow Z13 GZ302EA | W | 1984 | 7534 | |
| 173 | Micro Computer (HK) MS-S1 | L | 2846 | 30643 | |
| 174 | ASUS ProArt PX13 HN7306EA | W | 2426 | 22344 | |
| 175 | AMD RAH-00 | W | 2624 | 21196 | |
| 176 | HP ZBook Ultra G1a 14 | L | 2659 | 23996 | 別 SKU(PRO 395) |
| 177 | HP ZBook Ultra G1a 14 | L | 2551 | 22844 | 別 SKU(PRO 395) |
| 178 | ROG Flow Z13 GZ302EA | W | 2726 | 26114 | |
| 179 | ROG Flow Z13 GZ302EA | L | 1748 | 21560 | |
| 180 | ROG Flow Z13 GZ302EA | L | 2539 | 22629 | |
| 181 | HP Z2 Mini G1a | L | 2818 | 29235 | 別 SKU(PRO 395) |
| 182 | ROG Flow Z13 GZ302EA | W | 2691 | 23142 | |
| 183 | GMKtec EVO-X3 | L | 2793 | 29596 | |
| 184 | Nimo Direct N161L | L | 2726 | 28541 | |
| 185 | Nimo Direct N161L | L | 2742 | 28211 | |
| 186 | ROG Flow Z13 GZ302EA | W | 2657 | 23912 | |
| 187 | ROG Flow Z13 GZ302EA | W | 2660 | 24375 | |
| 188 | ROG Flow Z13 GZ302EA | W | 2703 | 25719 | |
| 189 | ROG Flow Z13 GZ302EA | W | 2648 | 24183 | |
| 190 | ROG Flow Z13 GZ302EA | W | 2679 | 23214 | |
| 191 | ASUS ProArt PX13 HN7306EA | W | 2681 | 24515 | |
| 192 | GMKtec EVO-X2 | L | 2705 | 27966 | |
| 193 | ROG Flow Z13 GZ302EA | W | 2572 | 22076 | |
| 194 | GMKtec EVO-X2 | L | 2747 | 27286 | |
| 195 | GMKtec EVO-X2 | L | 2684 | 27148 | |
| 196 | GMKtec EVO-X2 | L | 2693 | 26952 | |
| 197 | Framework Desktop | L | 2877 | 30589 | |
| 198 | ROG Flow Z13 GZ302EA | W | 2043 | 19443 | |
| 199 | HP ZBook Ultra G1a 14 | L | 2830 | 25190 | 別 SKU(PRO 395) |
| 200 | ROG Flow Z13 GZ302EA | W | 1980 | 21280 | |

### 4.2 Core Ultra 7 258V(全件 8 コア・名前一致。除外なし)

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | Lenovo 83CX | L | 2669 | 12343 |
| 2 | Lenovo 83JX | W | 2547 | 11529 |
| 3 | Lenovo 21NTS3SC00 | W | 1371 | 7249 |
| 4 | HP EliteBook X G1i 14 | W | 1925 | 10198 |
| 5 | ASUS Vivobook S 14 S5406SA | L | 2418 | 10209 |
| 6 | Samsung 960XHA | W | 2373 | 10712 |
| 7 | MSI Claw | W | 1052 | 4267 |
| 8 | HP OmniBook X Flip 16-as0xxx | L | 2506 | 11397 |
| 9 | ASUS Vivobook S 14 S5406SA | L | 2503 | 10865 |
| 10 | ASUS Vivobook S 14 S5406SA | L | 1556 | 7044 |
| 11 | Lenovo 83LC | W | 2453 | 11276 |
| 12 | Lenovo 21QG0045US | L | 2629 | 11797 |
| 13 | HP EliteBook 8 G1i 14 | W | 1783 | 9952 |
| 14 | Lenovo 83HM | L | 2575 | 11658 |
| 15 | ASUS Zenbook S 14 UX5406SA | W | 2431 | 11363 |
| 16 | MSI Claw | W | 2453 | 11261 |
| 17 | MSI Claw | W | 2357 | 11324 |
| 18 | ASUS Zenbook S 14 UX5406SA | W | 2272 | 10471 |
| 19 | ASUS Zenbook S 14 UX5406SA | W | 1691 | 10343 |
| 20 | ASUS Zenbook S 14 UX5406SA | W | 1275 | 7406 |
| 21 | Lenovo 21U2S05200 | L | 1550 | 3186 |
| 22 | Lenovo 21U2S05200 | L | 1532 | 3663 |
| 23 | ASUS Zenbook S 14 UX5406SA | W | 2327 | 10932 |
| 24 | MSI Claw | W | 2463 | 9807 |
| 25 | ASUS Zenbook S 14 UX5406SA | W | 2267 | 10034 |
| 26 | HP OmniBook Ultra Flip 14-fh0x | W | 1998 | 9252 |
| 27 | HP OmniBook Ultra Flip 14-fh0x | W | 1422 | 4983 |
| 28 | HP OmniBook Ultra Flip 14-fh0x | W | 1813 | 9809 |
| 29 | HP OmniBook Ultra Flip 14-fh0x | W | 2422 | 11197 |
| 30 | HP OmniBook Ultra Flip 14-fh0x | W | 1384 | 4888 |
| 31 | HP OmniBook Ultra Flip 14-fh0x | W | 2473 | 11252 |
| 32 | HP EliteBook Ultra G1i 14 | W | 1218 | 5197 |
| 33 | HP OmniBook 7 17-dc0xxx | W | 2175 | 10846 |
| 34 | Acer Aspire A14-53M | W | 2501 | 11178 |
| 35 | Lenovo 21U2S05200 | L | 1197 | 2408 |
| 36 | Lenovo 21U2S05200 | L | 1294 | 2299 |
| 37 | Lenovo 21U2S05200 | L | 1570 | 2231 |
| 38 | Lenovo 21U2S05200 | L | 1797 | 1590 |
| 39 | Lenovo 21U2S05200 | L | 1957 | 2039 |
| 40 | Lenovo 21U2S05200 | L | 1946 | 2117 |
| 41 | Lenovo 21U2S05200 | L | 2231 | 1966 |
| 42 | Lenovo 83MC | W | 1768 | 3134 |
| 43 | ASUS Zenbook S 16 UX5606SA | W | 2269 | 10105 |
| 44 | Lenovo 83LC | W | 2390 | 11101 |
| 45 | Lenovo 83MC | W | 1487 | 10812 |
| 46 | HP EliteBook X G1i 14 | W | 2499 | 10302 |
| 47 | HP OmniBook Ultra Flip 14-fh0x | W | 1870 | 9828 |
| 48 | HP OmniBook X Flip 16-as0xxx | L | 2231 | 10901 |
| 49 | HP OmniBook X Flip 16-as0xxx | W | 2262 | 11263 |
| 50 | HP OmniBook X Flip 14-fm0xxx | W | 2085 | 10814 |
| 51 | Lenovo 21Q60029US | L | 2451 | 10386 |
| 52 | Lenovo 83HM | W | 2482 | 11477 |
| 53 | Dell XPS 13 9350 | W | 2050 | 9865 |
| 54 | Lenovo 21U2S05200 | W | 1816 | 10083 |
| 55 | Lenovo 21U3000BLM | W | 2385 | 10408 |
| 56 | Acer Aspire A14-52M | W | 2438 | 11312 |
| 57 | Dell XPS 13 9350 | W | 2002 | 10136 |
| 58 | Dell XPS 13 9350 | W | 1926 | 9704 |
| 59 | Dell XPS 13 9350 | W | 2146 | 8381 |
| 60 | Dell XPS 13 9350 | W | 2375 | 9929 |
| 61 | HP OmniBook X Flip 14-fm0xxx | W | 2459 | 10838 |
| 62 | HP OmniBook X Flip 14-fm0xxx | W | 2041 | 10862 |
| 63 | HP OmniBook X Flip 14-fm0xxx | W | 2268 | 10876 |
| 64 | ASUS Zenbook S 14 UX5406SA | W | 2220 | 8995 |
| 65 | ASUS ExpertBook P5405CSA | W | 1571 | 5751 |
| 66 | ASUS Vivobook 16 Flip TP3607SA | W | 2221 | 9124 |
| 67 | Samsung 960QHA | W | 2399 | 10749 |
| 68 | ASUS Zenbook S 14 UX5406SA | W | 2397 | 9675 |
| 69 | ASUS ExpertBook P5405CSA | W | 2335 | 8842 |
| 70 | HP OmniBook Ultra Flip 14-fh0x | L | 2581 | 11064 |
| 71 | HP OmniBook Ultra Flip 14-fh0x | L | 2571 | 11042 |
| 72 | HP OmniBook Ultra Flip 14-fh0x | L | 2553 | 10736 |
| 73 | HP OmniBook Ultra Flip 14-fh0x | L | 2549 | 10852 |
| 74 | HP OmniBook Ultra Flip 14-fh0x | L | 1589 | 8073 |
| 75 | HP OmniBook Ultra Flip 14-fh0x | L | 1590 | 7745 |
| 76 | HP OmniBook Ultra Flip 14-fh0x | L | 2548 | 10992 |
| 77 | HP OmniBook Ultra Flip 14-fh0x | L | 2556 | 10879 |
| 78 | HP OmniBook Ultra Flip 14-fh0x | L | 1598 | 8134 |
| 79 | Lenovo 83HM | L | 2591 | 11920 |
| 80 | HP OmniBook X Flip 16-as0xxx | L | 2467 | 11229 |
| 81 | Lenovo 83HM | L | 2593 | 11707 |
| 82 | HP OmniBook X Flip 16-as0xxx | W | 2369 | 11101 |
| 83 | HP OmniBook X Flip 16-as0xxx | W | 2365 | 10621 |
| 84 | HP OmniBook X Flip 16-as0xxx | W | 2402 | 11124 |
| 85 | Lenovo 21U2002NUS | W | 1595 | 8898 |
| 86 | Lenovo 83HM yoga slim | W | 2369 | 10333 |
| 87 | Lenovo 83HM | W | 2353 | 10286 |
| 88 | ASUS Zenbook S 14 UX5406SA | W | 2066 | 8806 |
| 89 | ASUS Zenbook S 14 UX5406SA | W | 1915 | 8843 |
| 90 | ASUS Zenbook S 14 UX5406SA | W | 1906 | 8705 |
| 91 | ASUS Zenbook S 14 UX5406SA | W | 2034 | 8999 |
| 92 | Acer Aspire A14-53M | W | 987 | 7226 |
| 93 | Acer Aspire A14-53M | W | 977 | 7171 |
| 94 | Acer Aspire A14-53M | W | 1034 | 3876 |
| 95 | Lenovo 21NS004UMZ | W | 1243 | 8873 |
| 96 | Lenovo 21NS008VPG | W | 965 | 4319 |
| 97 | Lenovo 21NU007NMX | W | 1463 | 7124 |
| 98 | Lenovo 21NU007NMX | W | 1417 | 7036 |
| 99 | Samsung 940XHA | W | 1865 | 10113 |
| 100 | Samsung 960XHA | W | 2352 | 10669 |
| 101 | Samsung 960XHA | W | 2487 | 11518 |
| 102 | Dell 16 Plus 2-in-1 DB06250 | W | 2284 | 7502 |
| 103 | HP OmniBook X Flip 14-fm0xxx | W | 2433 | 10758 |
| 104 | ASUS Zenbook S 14 UX5406SA | W | 2321 | 10143 |
| 105 | ASUS Zenbook S 14 UX5406SA | W | 2350 | 9954 |
| 106 | HP OmniBook X Flip 16-as0xxx | L | 2372 | 4933 |
| 107 | HP OmniBook X Flip 16-as0xxx | L | 2150 | 5254 |
| 108 | ASUS Zenbook S 14 UX5406SA | L | 1840 | 4921 |
| 109 | ASUS Zenbook S 14 UX5406SA | L | 2260 | 6111 |
| 110 | ASUS Zenbook S 14 UX5406SA | L | 2511 | 8155 |
| 111 | HP EliteBook 8 G1i 14 | W | 2277 | 9622 |
| 112 | MSI Claw | W | 2351 | 5177 |
| 113 | MSI Claw | W | 2112 | 3975 |
| 114 | Lenovo 21QA0085PB | W | 2130 | 8669 |
| 115 | Lenovo 21QA0085PB | W | 2046 | 8057 |
| 116 | HP OmniBook Ultra Flip 14-fh0x | W | 1620 | 6659 |
| 117 | MSI Claw | W | 2288 | 9115 |
| 118 | ASUS Zenbook S 14 UX5406SA | L | 2399 | 10656 |
| 119 | ASUS Zenbook S 14 UX5406SA | L | 2356 | 10636 |
| 120 | ASUS Zenbook S 14 UX5406SA | W | 1003 | 2425 |
| 121 | ASUS Zenbook S 14 UX5406SA | L | 2358 | 10597 |
| 122 | ASUS Zenbook S 14 UX5406SA | L | 2079 | 10588 |
| 123 | ASUS Zenbook S 14 UX5406SA | L | 1812 | 10816 |
| 124 | ASUS Zenbook S 14 UX5406SA | L | 1784 | 10865 |
| 125 | ASUS Zenbook S 14 UX5406SA | L | 2439 | 10805 |
| 126 | ASUS Zenbook S 14 UX5406SA | L | 2370 | 10797 |
| 127 | ASUS Zenbook S 14 UX5406SA | L | 2414 | 10662 |
| 128 | ASUS Zenbook S 14 UX5406SA | W | 1606 | 7501 |
| 129 | ASUS Zenbook S 14 UX5406SA | W | 2045 | 8689 |
| 130 | HP OmniBook Ultra Flip 14-fh0x | W | 1879 | 7673 |
| 131 | HP OmniBook Ultra Flip 14-fh0x | W | 1949 | 8066 |
| 132 | HP OmniBook Ultra Flip 14-fh0x | W | 1690 | 4178 |
| 133 | HP EliteBook 8 G1i 14 | W | 2486 | 10757 |
| 134 | Lenovo 83LC | W | 2379 | 10529 |
| 135 | Samsung 960XHA | W | 2305 | 10316 |
| 136 | ASUS Zenbook S 14 UX5406SA | L | 2418 | 10782 |
| 137 | Acer Aspire A14-53M | W | 1002 | 7158 |
| 138 | ASUS Zenbook S 14 UX5406SA | L | 2409 | 10742 |
| 139 | ASUS Zenbook S 14 UX5406SA | L | 2444 | 10853 |
| 140 | ASUS Zenbook S 14 UX5406SA | L | 2438 | 10772 |
| 141 | ASUS Zenbook S 14 UX5406SA | L | 2431 | 6918 |
| 142 | ASUS Zenbook S 14 UX5406SA | L | 2393 | 10814 |
| 143 | ASUS Zenbook S 14 UX5406SA | L | 2103 | 10087 |
| 144 | ASUS Zenbook S 14 UX5406SA | L | 2337 | 10539 |
| 145 | Acer Aspire A14-53M | W | 1029 | 6967 |
| 146 | ASUS Zenbook S 14 UX5406SA | L | 2088 | 9697 |
| 147 | ASUS Zenbook S 14 UX5406SA | L | 2116 | 9916 |
| 148 | ASUS Zenbook S 14 UX5406SA | L | 2172 | 10030 |
| 149 | ASUS Zenbook S 14 UX5406SA | W | 2343 | 7755 |
| 150 | MSI Prestige | W | 2499 | 11469 |
| 151 | ASUS Zenbook S 14 UX5406SA | W | 2425 | 9819 |
| 152 | MSI Prestige | W | 2507 | 11531 |
| 153 | ASUS Zenbook S 14 UX5406SA | L | 2467 | 10880 |
| 154 | HP OmniBook X Flip 16-as0xxx | L | 1800 | 11014 |
| 155 | ASUS ExpertBook P5405CSA | W | 2394 | 7765 |
| 156 | HP OmniBook 7 17-dc0xxx | W | 2407 | 10841 |
| 157 | HP OmniBook Ultra Flip 14-fh0x | W | 2129 | 9257 |
| 158 | Lenovo 83JX | W | 2489 | 11450 |
| 159 | Lenovo 83JX | W | 2489 | 9965 |
| 160 | Lenovo 83JX | W | 2478 | 11079 |
| 161 | Lenovo 21NTS4EE00 | W | 2405 | 10439 |
| 162 | Lenovo 83JX | W | 2460 | 11318 |
| 163 | HP EliteBook X G1i 14 | W | 2348 | 10247 |
| 164 | Samsung 960QHA | W | 1911 | 8257 |
| 165 | Samsung 960QHA | W | 1866 | 8574 |
| 166 | Acer Aspire A14-52MT | W | 2423 | 11353 |
| 167 | Samsung 940XHA | W | 2436 | 10706 |
| 168 | Samsung 940XHA | W | 2434 | 10015 |
| 169 | Samsung 940XHA | W | 2406 | 8762 |
| 170 | Lenovo 21QHS37S01 | W | 2411 | 6826 |
| 171 | Acer Swift SFG16-74 | W | 2462 | 11234 |
| 172 | Acer Swift SFG16-74 | W | 2466 | 10854 |
| 173 | Acer Aspire AL14-56P | W | 2077 | 10203 |
| 174 | Acer Aspire AL14-56P | W | 2065 | 9325 |
| 175 | Lenovo 21U2000LGR | W | 2389 | 10469 |
| 176 | HP OmniBook 7 17-dc0xxx | W | 2354 | 10637 |
| 177 | HP OmniBook X Flip 16-as0xxx | W | 1790 | 7207 |
| 178 | Lenovo 21U200ABPB | W | 1693 | 9975 |
| 179 | NEC PC-S1375LAS-KH | W | 2259 | 9834 |
| 180 | NEC PC-S1375LAS-KH | W | 2253 | 10242 |
| 181 | Lenovo 21NS006QCD | L | 2655 | 12076 |
| 182 | NEC PC-S1375LAS-KH | W | 932 | 4416 |
| 183 | Lenovo 83JX | L | 2389 | 7247 |
| 184 | Lenovo 83JX | L | 2419 | 7366 |
| 185 | Lenovo 21NS0166US | L | 2567 | 11640 |
| 186 | Lenovo 21NS0166US | L | 2574 | 10258 |
| 187 | HP OmniBook X Flip 16-as0xxx | L | 2395 | 11544 |
| 188 | HP OmniBook X Flip 16-as0xxx | L | 1759 | 11316 |
| 189 | MSI Claw | W | 1681 | 6958 |
| 190 | Lenovo 21Q6005JCD | W | 1705 | 7085 |
| 191 | Lenovo 21Q6005JCD | W | 2011 | 7030 |
| 192 | Lenovo 21Q6005JCD | W | 2036 | 7073 |
| 193 | Lenovo 21Q6005JCD | W | 1979 | 6814 |
| 194 | ASUS Zenbook S 14 UX5406SA | L | 1526 | 6090 |
| 195 | Lenovo 21NS0166US | L | 2230 | 10370 |
| 196 | Lenovo 21NS0166US | L | 2248 | 9312 |
| 197 | ASUS Zenbook S 14 UX5406SA | W | 2160 | 10441 |
| 198 | HP OmniBook X Flip 16-as0xxx | L | 1658 | 10868 |
| 199 | HP OmniBook X Flip 16-as0xxx | L | 1656 | 11001 |
| 200 | HP OmniBook X Flip 16-as0xxx | L | 1945 | 11052 |
