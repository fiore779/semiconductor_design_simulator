# Geekbench 7 公開値の取り直し(モバイル x86。直近 25 件の中央値。2026-11-07)

収集のみ。リポジトリのコード・プリセット・`data/benchmarks/gb7-scores.js` は変更していない。

## 0. 目的と方法

- 背景: モバイル x86 の ST 予測が公開値より +13〜32% 高い。公開値の多くが Geekbench のプロセッサチャート(全投稿の平均)で、省電力設定の投稿に引き下げられている疑い。
- ユーザー決定: **全体の中央値を取る**(OS で絞らない)。設計書 §2.4「追加取得分」と同じ **[直近25件の中央値]** 方式。
- 取得: Chrome(Claude in Chrome)で `https://browser.geekbench.com/v7/cpu/search?q=<チップ名>` の 1 ページ目(最新 25 件)を読んだ。同じタブ内で同じ URL を取得し、DOM の行(機種名・プロセッサ名・OS・ST・MT)を抜き出して集計した。ボット確認は出なかった。取得 2026-11-07。
- 除外規則(設計書 §2.4 と同じ): (a) コア数が SKU と一致しない投稿、(b) 仮想環境の投稿。加えて (c) 検索の部分一致で混ざった**別の SKU 名**(PRO 版・H 版など)を除いた。ST が極端に低い投稿など(省電力設定と思われるもの)は**除外しない**(既存規則どおり。中央値で頑健化)。
- 中央値: n が奇数なら中央の値、偶数なら中央 2 値の平均を四捨五入。
- 「差」は 現在の公開値(gb7-scores.js)に対する新しい中央値の比(新 ÷ 旧 − 1)。
- Windows のみ / Linux のみの中央値は参考(採用値ではない)。

## 1. Ryzen AI 9 HX 370(Strix Point、12c)

- 検索語: `Ryzen AI 9 HX 370`(検索結果 1,617 件)。25 件すべて「AMD Ryzen AI 9 HX 370」・12 コア。
- 現在の公開値: 2350 / 15014([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | ASUS ROG Zephyrus G14 GA403WR | Windows | 2646 | 17352 |
| 2 | ASUS ROG Zephyrus G14 GA403WW | Windows | 2624 | 16590 |
| 3 | ASUS TUF Gaming A16 FA608WV | Windows | 2772 | 17176 |
| 4 | TOPC TS-12C | Windows | 2614 | 16891 |
| 5 | TOPC TS-12C | Windows | 2627 | 16749 |
| 6 | Thirdwave DL9R-IG-C4A | Windows | 2543 | 15498 |
| 7 | Thirdwave DL9R-IG-C4A | Windows | 1713 | 13696 |
| 8 | Thirdwave DL9R-IG-C4A | Windows | 2179 | 15292 |
| 9 | Thirdwave DL9R-IG-C4A | Windows | 2136 | 14682 |
| 10 | ASUS Vivobook S 16 M5606WA | Windows | 2496 | 14713 |
| 11 | GPD G1628-04 | Linux | 2547 | 13702 |
| 12 | ASUS ROG Zephyrus G14 GA403WR | Windows | 2641 | 16790 |
| 13 | Notebook V5xxKNx | Windows | 2678 | 16582 |
| 14 | GPD G1622-01 | Windows | 2591 | 14652 |
| 15 | GPD G1622-01 | Windows | 1081 | 9736 |
| 16 | GPD G1622-01 | Windows | 1758 | 14697 |
| 17 | ASUS TUF Gaming A14 FA401WV | Windows | 2565 | 16926 |
| 18 | ASUS Vivobook S 15 M5506WA | Windows | 1849 | 14155 |
| 19 | ASUS Vivobook S 15 M5506WA | Windows | 1844 | 14063 |
| 20 | ASUS ProArt P16 H7606WP | Windows | 2605 | 17164 |
| 21 | ASUS ProArt P16 H7606WP | Windows | 2637 | 17176 |
| 22 | GPD G1628-04 | Linux | 2610 | 9074 |
| 23 | GPD G1628-04 | Linux | 2694 | 14275 |
| 24 | GPD G1628-04 | Linux | 2332 | 14231 |
| 25 | GPD G1628-04 | Linux | 1837 | 13853 |

- 除外: なし。**n = 25**。仮想環境の表示なし。
- **全体の中央値: ST 2565 / MT 14713**(範囲 ST 1081〜2772 / MT 9074〜17352)
- 参考: Windows のみ n=20 → 2578 / 16040、Linux のみ n=5(すべて GPD G1628-04)→ 2547 / 13853
- 公開値との差: ST **+9.1%** / MT −2.0%

## 2. Ryzen AI 7 350(Kraken Point、8c)

- 検索語: `Ryzen AI 7 350`(1,426 件)
- 現在の公開値: 2116 / 11354([チャート(検索要約・原ページ未確認)])

| # | 機種 | OS | ST | MT | 除外 |
|---|---|---|---|---|---|
| 1 | Acer Aspire A14-61M | Linux | 2724 | 14902 | |
| 2 | Acer Aspire A14-61M | Linux | 2713 | 14246 | |
| 3 | Acer Nitro ANV16-61 | Windows | 901 | 8392 | |
| 4 | Acer Nitro ANV16-61 | Windows | 1022 | 7318 | |
| 5 | Acer Nitro ANV16-61 | Windows | 977 | 6864 | |
| 6 | Acer Nitro ANV16-61 | Windows | 993 | 7170 | |
| 7 | Acer Nitro ANV16-61 | Windows | 1016 | 7405 | |
| 8 | Acer Swift SFX14-61G | Linux | 2649 | 13670 | |
| 9 | Lenovo 83JL | Linux | 2637 | 13420 | |
| 10 | GIGABYTE AERO X16 1VH | Windows | 1109 | 8362 | |
| 11 | ASUS Zenbook S 1x | Windows | 2571 | 12453 | |
| 12 | GIGABYTE AERO X16 1VH | Linux | 2666 | 14003 | |
| 13 | GIGABYTE AERO X16 1VH | Windows | 2590 | 14760 | |
| 14 | Lenovo 83NJ | Linux | 2710 | 14120 | |
| 15 | Lenovo 83NJ | Linux | 2586 | 13501 | |
| 16 | Lenovo 83JN | Windows | 2628 | 14377 | |
| 17 | Lenovo 83JN | Windows | 2624 | 14420 | |
| 18 | HP OmniBook 5 16-ag1xxx | Windows | 2487 | 10144 | |
| 19 | SAPPHIRE EDGE | Linux | 2514 | 10582 | |
| 20 | Lenovo 21TH | Windows | 2543 | 14436 | 別 SKU(Ryzen AI 7 **H** 350) |
| 21 | GIGABYTE AERO X16 1VH | Windows | 2603 | 14424 | |
| 22 | Lenovo 21QJCTO1WW | Linux | 2620 | 14651 | 別 SKU(Ryzen AI 7 **PRO** 350) |
| 23 | Lenovo 83F1 | Windows | 2563 | 14349 | |
| 24 | Lenovo 83HX | Windows | 2595 | 14153 | |
| 25 | Lenovo 83HY | Linux | 2614 | 13215 | |

- 全件 8 コア。除外 2 件(別 SKU 名)。**n = 23**。
- **全体の中央値: ST 2590 / MT 13501**(範囲 ST 901〜2724 / MT 6864〜14902)
- 参考: Windows のみ n=14 → 2525 / 11299、Linux のみ n=9 → 2649 / 13670
- 公開値との差: ST **+22.4%** / MT **+18.9%**
- 注: Acer Nitro ANV16-61 の 5 件(ST 約 1000)は極端に低い(省電力設定と思われる)が既存規則で除外していない。

## 3. Ryzen AI Max+ 395(Strix Halo、16c)

- 検索語: `Ryzen AI Max+ 395`(1,268 件)
- 現在の公開値: 2423 / 20787([チャート])

| # | 機種 | OS | ST | MT | 除外 |
|---|---|---|---|---|---|
| 1 | Default string | Windows | 2651 | 20919 | |
| 2 | ASUS ROG Flow Z13 GZ302 | Windows | 2486 | 19617 | |
| 3 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2665 | 22156 | |
| 4 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2785 | 30768 | |
| 5 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2804 | 30687 | |
| 6 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2791 | 30841 | |
| 7 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2793 | 30642 | |
| 8 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2804 | 30885 | |
| 9 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2790 | 30908 | |
| 10 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2034 | 25051 | |
| 11 | ASUS ROG Flow Z13 GZ302EAC | Linux | 2808 | 30712 | |
| 12 | ASUS ROG Flow Z13 GZ302 | Windows | 2725 | 23291 | |
| 13 | HP ZBook Ultra G1a 14 | Windows | 2649 | 21988 | 別 SKU(Ryzen AI Max+ **PRO** 395) |
| 14 | SU AXB35-03 | Windows | 2674 | 23135 | |
| 15 | ASUS ROG Flow Z13 GZ302 | Linux | 2812 | 30209 | |
| 16 | Six United Intelligent Tech. | Windows | 2683 | 22543 | |
| 17 | Six United Intelligent Tech. | Windows | 2594 | 21909 | |
| 18 | Six United Intelligent Tech. | Windows | 2614 | 23248 | |
| 19 | ASUS ROG Flow Z13 GZ302 | Linux | 2817 | 30204 | |
| 20 | ASUS ROG Flow Z13 GZ302 | Linux | 2822 | 29893 | |
| 21 | ASUS ROG Flow Z13 GZ302 | Linux | 2819 | 30155 | |
| 22 | ASUS ROG Flow Z13 GZ302 | Windows | 2742 | 27156 | |
| 23 | SU AXB35-03 | Windows | 2692 | 21487 | |
| 24 | ASUS ROG Flow Z13 GZ302 | Linux | 2817 | 29938 | |
| 25 | ASUS ROG Flow Z13 GZ302 | Linux | 2515 | 30603 | |

- 全件 16 コア。除外 1 件(別 SKU 名)。**n = 24**。
- **全体の中央値: ST 2764 / MT 29916**(範囲 ST 2034〜2822 / MT 19617〜30908)
- 参考: Windows のみ n=9 → 2674 / 22543、Linux のみ n=15 → 2804 / 30603
- 公開値との差: ST **+14.1%** / MT **+43.9%**
- **注(偏りが大きい)**: Linux の 15 件はすべて ROG Flow Z13(GZ302)で、MT 約 30,000 の同一環境と思われる連続投稿が多い。MT の全体中央値はこの 1 機種に引っ張られている。Windows のみ(22543)との差が大きく、MT の採用には要注意。

## 4. Ryzen 7 7840HS(Phoenix、8c)

- 検索語: `Ryzen 7 7840HS`(925 件)。25 件すべて「Ryzen 7 7840HS」・8 コア。
- 現在の公開値: 2037 / 11886([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | Micro Computer (HK) Tech | Windows | 1736 | 11381 |
| 2 | HP Victus Gaming Laptop | Windows | 2210 | 12142 |
| 3 | Acer Nitro AN16-41 | Windows | 2323 | 14305 |
| 4 | Acer Nitro AN16-41 | Windows | 2330 | 14465 |
| 5 | Acer Nitro AN16-41 | Windows | 2312 | 14604 |
| 6 | HP Victus Gaming Laptop | Windows | 2391 | 14288 |
| 7 | HP OMEN Gaming Laptop 16 | Windows | 2015 | 12335 |
| 8 | HP OMEN Gaming Laptop 16 | Windows | 2003 | 12140 |
| 9 | HP Victus Gaming Laptop | Windows | 2179 | 12088 |
| 10 | HP Victus Gaming Laptop | Windows | 2330 | 12619 |
| 11 | HP Victus Gaming Laptop | Windows | 1964 | 11473 |
| 12 | Lenovo 82XT | Windows | 2105 | 11057 |
| 13 | HP Victus Gaming Laptop | Windows | 1963 | 10732 |
| 14 | HP OMEN Gaming Laptop 16 | Windows | 2240 | 12766 |
| 15 | HP OMEN Gaming Laptop 16 | Windows | 1665 | 12629 |
| 16 | HP OMEN Gaming Laptop 16 | Windows | 2025 | 12121 |
| 17 | HP OMEN Gaming Laptop 16 | Windows | 1973 | 12843 |
| 18 | HP OMEN Gaming Laptop 16 | Windows | 1980 | 12404 |
| 19 | Lenovo 82Y9 | Windows | 2071 | 11237 |
| 20 | Lenovo 82Y9 | Windows | 1952 | 11174 |
| 21 | Framework Laptop 16 | Linux | 2384 | 14355 |
| 22 | Lenovo INVALID | Linux | 2158 | 9073 |
| 23 | HP OMEN Gaming Laptop 16 | Windows | 1695 | 10901 |
| 24 | HP Victus Gaming Laptop | Windows | 1218 | 7906 |
| 25 | HP ZBook Power 15.6 G10 | Windows | 2071 | 12597 |

- 除外: なし。**n = 25**。
- **全体の中央値: ST 2071 / MT 12142**(範囲 ST 1218〜2391 / MT 7906〜14604)
- 参考: Windows のみ n=23 → 2025 / 12142、Linux のみ n=2 → 2271 / 11714
- 公開値との差: ST +1.7% / MT +2.2%(チャートとほぼ同じ)

## 5. Ryzen 7 5800U(Cezanne、8c)

- 検索語: `Ryzen 7 5800U`(113 件)
- 現在の公開値: 1505 / 6368([チャート])

| # | 機種 | OS | コア | ST | MT | 除外 |
|---|---|---|---|---|---|---|
| 1 | Google zork | Android | 16 | 1612 | 7399 | コア数不一致(16。Chromebook の Android 環境) |
| 2 | Acer Swift SFX14-41G | Windows | 8 | 1705 | 7990 | |
| 3 | Google zork | Android | 16 | 1578 | 7263 | コア数不一致 |
| 4 | Google zork | Android | 16 | 1584 | 7419 | コア数不一致 |
| 5 | Google zork | Android | 16 | 1591 | 6719 | コア数不一致 |
| 6 | Star Labs StarBook | Linux | 8 | 1953 | 8571 | |
| 7 | Google zork | Android | 16 | 1570 | 6859 | コア数不一致 |
| 8 | SHENZHEN YOUDISI E-COMMERCE | Windows | 8 | 1513 | 7848 | |
| 9 | Acer Swift SFX14-41G | Linux | 8 | 1843 | 9607 | |
| 10 | HC Technology HCAR5000-M | Windows | 8 | 1620 | 7310 | |
| 11 | ASUS ZenBook UX325SA | Windows | 8 | 1743 | 7195 | |
| 12 | HP Pavilion Aero 13-be0 | Windows | 8 | 1699 | 6131 | |
| 13 | HP EliteBook 845 G8 | Windows | 8 | 1692 | 6961 | |
| 14 | ASUS ZenBook UX325SA | Windows | 8 | 1726 | 6046 | |
| 15 | Default string | Windows | 8 | 1864 | 8346 | |
| 16 | Lenovo 82L7 | Windows | 8 | 1823 | 8316 | |
| 17 | Lenovo 82L7 | Windows | 8 | 1848 | 8046 | |
| 18 | Lenovo 20YA | Windows | 8 | 1322 | 4913 | |
| 19 | HP ProBook x360 435 G8 | Windows | 8 | 1191 | 6468 | |
| 20 | HP ProBook x360 435 G8 | Windows | 8 | 1192 | 6876 | |
| 21 | HP ProBook x360 435 G8 | Windows | 8 | 1196 | 6965 | |
| 22 | HP ProBook x360 435 G8 | Windows | 8 | 1189 | 6897 | |
| 23 | HP ProBook x360 435 G8 | Windows | 8 | 1262 | 6922 | |
| 24 | HP ProBook x360 435 G8 | Windows | 8 | 1704 | 6231 | |
| 25 | HP ProBook x360 435 G8 | Windows | 8 | 1703 | 6224 | |

- 除外 5 件(コア数 16 表示)。**n = 20**(25 に満たない)。
- **全体の中央値: ST 1701 / MT 6963**(範囲 ST 1189〜1953 / MT 4913〜9607)
- 参考: Windows のみ n=18 → 1696 / 6942、Linux のみ n=2 → 1898 / 9089
- 公開値との差: ST **+13.0%** / MT +9.3%
- 注: 検索結果の総数が 113 件と少ない。HP ProBook x360 435 G8 が 7 件(うち 5 件は ST 約 1190)。

## 6. Ryzen 7 7735HS(Rembrandt-R、8c)

- 検索語: `Ryzen 7 7735HS`(1,356 件)。25 件すべて「Ryzen 7 7735HS」・8 コア・Windows。
- 現在の公開値: 1737 / 8279([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | Lenovo 83J3 | Windows | 1857 | 7723 |
| 2 | Acer Nitro ANV15-41 | Windows | 1833 | 10330 |
| 3 | Acer Nitro ANV15-41 | Windows | 1960 | 10735 |
| 4 | AZW SER | Windows | 1916 | 9583 |
| 5 | Shenzhen DOKE electronic | Windows | 1993 | 10336 |
| 6 | Lenovo 83K6 | Windows | 1867 | 8923 |
| 7 | Lenovo 83K6 | Windows | 1024 | 5056 |
| 8 | Lenovo 83S0 | Windows | 1857 | 8266 |
| 9 | Shenzhen DOKE electronic | Windows | 1980 | 10328 |
| 10 | Shenzhen DOKE electronic | Windows | 1990 | 10338 |
| 11 | Shenzhen DOKE electronic | Windows | 1993 | 10285 |
| 12 | Acer Nitro ANV15-41 | Windows | 1801 | 10013 |
| 13 | Acer Nitro ANV15-41 | Windows | 1800 | 9852 |
| 14 | Lenovo 83S0 | Windows | 1569 | 6104 |
| 15 | Shenzhen DOKE electronic | Windows | 1983 | 10336 |
| 16 | Shenzhen DOKE electronic | Windows | 1981 | 10323 |
| 17 | Shenzhen DOKE electronic | Windows | 1980 | 10331 |
| 18 | Shenzhen DOKE electronic | Windows | 1980 | 10175 |
| 19 | Shenzhen DOKE electronic | Windows | 1982 | 10298 |
| 20 | Shenzhen DOKE electronic | Windows | 1969 | 10344 |
| 21 | Shenzhen DOKE electronic | Windows | 1985 | 10393 |
| 22 | Lenovo 83S0 | Windows | 971 | 5982 |
| 23 | Lenovo 83S0 | Windows | 1789 | 8188 |
| 24 | Lenovo 83S0 | Windows | 983 | 3991 |
| 25 | Lenovo 83S0 | Windows | 885 | 5728 |

- 除外: なし。**n = 25**。
- **全体の中央値: ST 1916 / MT 10175**(範囲 ST 885〜1993 / MT 3991〜10735)
- 参考: Windows のみ = 全体と同じ。Linux 0 件。
- 公開値との差: ST **+10.3%** / MT **+22.9%**
- **注(偏り)**: Shenzhen DOKE(ミニ PC と思われる)の連続投稿が 11 件(ST 約 1980 / MT 約 10300)で、中央値をほぼ決めている。

## 7. Core Ultra 9 185H(Meteor Lake、16c。プリセット intel-mtl-185h)

- プリセット intel-mtl-185h の GB7 名は「Meteor Lake: Core Ultra 9 185H(2.3GHz, 16c)」(Core Ultra **9** 185H)。
- 検索語: `Core Ultra 9 185H`(719 件)
- 現在の公開値: 1850 / 11557([チャート])

| # | 機種 | OS | コア | ST | MT | 除外 |
|---|---|---|---|---|---|---|
| 1 | VZMORE iX9 Max | Windows | 16 | 2239 | 15087 | |
| 2 | VZMORE iX9 Max | Windows | 16 | 2235 | 15004 | |
| 3 | VZMORE iX9 Max | Windows | 16 | 2252 | 15086 | |
| 4 | MacBookPro16,1 | macOS | 22 | 1446 | 11762 | コア数不一致 |
| 5 | MacBookPro16,1 | macOS | 22 | 1547 | 11576 | コア数不一致 |
| 6 | MacBookPro16,1 | macOS | 22 | 1486 | 11707 | コア数不一致 |
| 7 | MacBookPro16,1 | macOS | 6 | 1663 | 8853 | コア数不一致 |
| 8 | Lenovo 21LE | Windows | 6 | 1973 | 9077 | コア数不一致 |
| 9 | MacBookPro16,1 | macOS | 6 | 1428 | 6059 | コア数不一致 |
| 10 | MacBookPro16,1 | macOS | 8 | 1316 | 6480 | コア数不一致 |
| 11 | MacBookPro16,1 | macOS | 16 | 1104 | 9417 | (採用。下の注) |
| 12 | MacBookPro16,1 | macOS | 16 | 1085 | 8752 | (採用。下の注) |
| 13 | AZW GTi14 | Windows | 16 | 2176 | 13579 | |
| 14 | Dell Precision 5490 | Windows | 16 | 1505 | 11546 | |
| 15 | Lenovo 21SK | Windows | 16 | 2207 | 9901 | |
| 16 | Lenovo 21SK | Windows | 16 | 1644 | 5380 | |
| 17 | ASUS ROG Zephyrus G16 GU605 | Linux | 16 | 2441 | 16621 | |
| 18 | ASUS ROG Zephyrus G16 GU605 | Linux | 8 | 2370 | 12560 | コア数不一致 |
| 19 | Lenovo 21LE | Windows | 16 | 2258 | 15458 | |
| 20 | Lenovo 21KU0000CD | Windows | 16 | 2161 | 13883 | |
| 21 | Lenovo 21KU0000CD | Windows | 16 | 2172 | 14359 | |
| 22 | MacBookPro16,1 | macOS | 22 | 1183 | 10949 | コア数不一致 |
| 23 | MacBookPro16,1 | macOS | 22 | 1092 | 9611 | コア数不一致 |
| 24 | MacBookPro16,1 | macOS | 22 | 1175 | 9937 | コア数不一致 |
| 25 | ASUS Zenbook Duo UX840 | Linux | 16 | 805 | 1748 | |

- 除外 11 件(コア数不一致)。**n = 14**(25 に満たない)。
- **全体の中央値: ST 2174 / MT 13731**(範囲 ST 805〜2441 / MT 1748〜16621)
- 参考: Windows のみ n=10 → 2192 / 14121、Linux のみ n=2 → 1623 / 9185(2441 と 805 の 2 件)
- 公開値との差: ST **+17.5%** / MT **+18.8%**
- **注**: 「MacBookPro16,1」(2019 年の Intel Mac の機種名)で 185H を名乗る macOS 投稿が 11 件あり、実機の Mac ではない(Hackintosh か仮想環境と思われる。仮想環境の表示は無い)。既存規則ではコア数 16 の 2 件(#11・#12)は除外対象にならないため採用した。**感度(参考)**: この 2 件も除くと n=12 で 2192 / 14121(ST +18.5% / MT +22.2%)。#25(ST 805 / MT 1748)は極端に低いが除外していない。

### 7b. 参考: Core Ultra 7 155H(16c。プリセットなし、gb7-scores.js に行なし)

- 検索語: `Core Ultra 7 155H`(1,217 件)。現在の公開値: なし。

| # | 機種 | OS | コア | ST | MT | 除外 |
|---|---|---|---|---|---|---|
| 1 | Dell XPS 14 9440 | Windows | 16 | 1705 | 10982 | |
| 2 | Dell XPS 14 9440 | Windows | 16 | 1760 | 10244 | |
| 3 | HP Elite x360 1040 G11 | Windows | 16 | 1655 | 10611 | |
| 4 | Lenovo 21G2002DUS | Windows | 16 | 2080 | 13339 | |
| 5 | Samsung | Windows | 16 | 1947 | 12225 | |
| 6 | Acer Predator PHN14-51 | Windows | 16 | 2114 | 13464 | |
| 7 | Lenovo 21MA001KAD | Windows | 16 | 2180 | 11132 | |
| 8 | ASUS Vivobook S 15 S55xx | Windows | 16 | 1900 | 13629 | |
| 9 | MSI Prestige 13 AI Evo | Windows | 16 | 753 | 2776 | |
| 10 | ASUS Zenbook 14 UX3405 | Windows | 16 | 1985 | 12159 | |
| 11 | Google rex | Android | 22 | 1813 | 9001 | コア数不一致 |
| 12 | Lenovo 21MS | Windows | 16 | 2156 | 12245 | |
| 13 | ASUS Vivobook S 15 S55xx | Windows | 16 | 1639 | 5551 | |
| 14 | Lenovo 83E2 | Windows | 16 | 1838 | 14043 | |
| 15 | Lenovo 21LE | Windows | 16 | 2030 | 13860 | |
| 16 | HP Spectre x360 2-in-1 | Windows | 16 | 2006 | 10968 | |
| 17 | LG 17Z90S-G.AD79D | Windows | 16 | 1984 | 11490 | |
| 18 | Lenovo 83D8 | Windows | 16 | 2089 | 11879 | |
| 19 | Lenovo 83D8 | Windows | 16 | 2007 | 12195 | |
| 20 | Lenovo 83D8 | Windows | 16 | 2141 | 13142 | |
| 21 | Lenovo 21KCCTO1WW | Windows | 16 | 1978 | 11491 | |
| 22 | ECS LIVA UP52ML | Windows | 16 | 1194 | 8351 | |
| 23 | HP Laptop 14-gr1xxx | Linux | 16 | 2224 | 8877 | |
| 24 | Lenovo 83CV | Windows | 16 | 951 | 8782 | |
| 25 | Lenovo 83CV | Windows | 16 | 939 | 8602 | |

- 除外 1 件(コア数 22)。**n = 24**。
- **全体の中央値: ST 1981 / MT 11491**(範囲 ST 753〜2224 / MT 2776〜14043)
- 参考: Windows のみ n=23 → 1978 / 11491、Linux のみ n=1 → 2224 / 8877

## 8. Core Ultra 7 268V(Lunar Lake、8c)

- 検索語: `Core Ultra 7 268V`(241 件)。25 件すべて「Core Ultra 7 268V」・8 コア。
- 現在の公開値: 2134 / 9389([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | Dell Pro 16 Plus PB1 | Windows | 2221 | 9419 |
| 2 | Dell Pro 14 Premium | Windows | 2410 | 10450 |
| 3 | Lenovo 21QB000JBR | Windows | 2492 | 10957 |
| 4 | Dell Pro 16 Plus PB1 | Windows | 2213 | 9851 |
| 5 | Lenovo 21NT000HBR | Windows | 2354 | 8520 |
| 6 | Dell Pro 14 Premium | Windows | 2070 | 10128 |
| 7 | Microsoft Surface | Windows | 1633 | 8967 |
| 8 | Microsoft Surface | Windows | 1298 | 9939 |
| 9 | Dell Pro 14 Premium | Windows | 2528 | 11076 |
| 10 | Dell Pro 14 Premium | Windows | 2427 | 11124 |
| 11 | Dell Pro 14 Premium | Windows | 2454 | 8596 |
| 12 | Lenovo 21QHS1D01D | Windows | 1314 | 9246 |
| 13 | Microsoft Surface | Windows | 2438 | 11284 |
| 14 | Microsoft Surface | Windows | 2474 | 11234 |
| 15 | Microsoft Surface | Windows | 2494 | 11013 |
| 16 | Dell Pro 14 Plus PB1 | Windows | 2590 | 11343 |
| 17 | Dell Pro 14 Premium | Linux | 862 | 4816 |
| 18 | Lenovo 21Q6002BUS | Windows | 2506 | 10231 |
| 19 | Dell Pro 16 Plus PB1 | Windows | 2051 | 9518 |
| 20 | Dell Pro 16 Plus PB1 | Windows | 2064 | 9701 |
| 21 | Lenovo 21QB000JBR | Windows | 2369 | 10211 |
| 22 | Lenovo 21QB000JBR | Windows | 2360 | 10155 |
| 23 | Dell Pro 14 Plus PB1 | Windows | 2353 | 10338 |
| 24 | Lenovo ThinkPad X1 Carbon | Linux | 2003 | 4489 |
| 25 | N/A | Linux | 2482 | 8084 |

- 除外: なし。**n = 25**。
- **全体の中央値: ST 2360 / MT 10128**(範囲 ST 862〜2590 / MT 4489〜11343)
- 参考: Windows のみ n=22 → 2365 / 10183、Linux のみ n=3 → 2003 / 4816
- 公開値との差: ST **+10.6%** / MT +7.9%

## 9. Core Ultra 7 258V(Lunar Lake、8c)

- 検索語: `Core Ultra 7 258V`(1,144 件)。25 件すべて「Core Ultra 7 258V」・8 コア。
- 現在の公開値: 2096 / 9227([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | ASUS Zenbook S 14 UX5406 | Windows | 2431 | 11363 |
| 2 | MSI Claw 8 AI+ A2VM | Windows | 2453 | 11261 |
| 3 | MSI Claw 8 AI+ A2VM | Windows | 2357 | 11324 |
| 4 | ASUS Zenbook S 14 UX5406 | Windows | 2272 | 10471 |
| 5 | ASUS Zenbook S 14 UX5406 | Windows | 1691 | 10343 |
| 6 | ASUS Zenbook S 14 UX5406 | Windows | 1275 | 7406 |
| 7 | Lenovo 21U2S05200 | Linux | 1550 | 3186 |
| 8 | Lenovo 21U2S05200 | Linux | 1532 | 3663 |
| 9 | ASUS Zenbook S 14 UX5406 | Windows | 2327 | 10932 |
| 10 | MSI Claw 8 AI+ A2VM | Windows | 2463 | 9807 |
| 11 | ASUS Zenbook S 14 UX5406 | Windows | 2267 | 10034 |
| 12 | HP OmniBook Ultra Flip | Windows | 1998 | 9252 |
| 13 | HP OmniBook Ultra Flip | Windows | 1422 | 4983 |
| 14 | HP OmniBook Ultra Flip | Windows | 1813 | 9809 |
| 15 | HP OmniBook Ultra Flip | Windows | 2422 | 11197 |
| 16 | HP OmniBook Ultra Flip | Windows | 1384 | 4888 |
| 17 | HP OmniBook Ultra Flip | Windows | 2473 | 11252 |
| 18 | HP EliteBook Ultra G1i 14 | Windows | 1218 | 5197 |
| 19 | HP OmniBook 7 17-dc0xxx | Windows | 2175 | 10846 |
| 20 | Acer Aspire A14-53M | Windows | 2501 | 11178 |
| 21 | Lenovo 21U2S05200 | Linux | 1197 | 2408 |
| 22 | Lenovo 21U2S05200 | Linux | 1294 | 2299 |
| 23 | Lenovo 21U2S05200 | Linux | 1570 | 2231 |
| 24 | Lenovo 21U2S05200 | Linux | 1797 | 1590 |
| 25 | Lenovo 21U2S05200 | Linux | 1957 | 2039 |

- 除外: なし。**n = 25**。
- **全体の中央値: ST 1957 / MT 9807**(範囲 ST 1197〜2501 / MT 1590〜11363)
- 参考: Windows のみ n=18 → 2270 / 10407、Linux のみ n=7 → 1550 / 2299
- 公開値との差: ST **−6.6%** / MT +6.3%
- **注(外れ値が極端)**: Linux の 7 件はすべて同じ機種 Lenovo 21U2S05200 で、MT 1590〜3663 と異常に低い(1 人の連続投稿と思われる。原因は未確認)。この 7 件で全体の中央値が下がり、ST がチャートより低くなった。他の SKU と同じ規則で採ったが、**この SKU の全体中央値は信頼度が低い**。

## 10. Core Ultra 7 256V(Lunar Lake、8c)

- 検索語: `Core Ultra 7 256V`(429 件)。25 件すべて「Core Ultra 7 256V」・8 コア。
- 現在の公開値: 2017 / 8971([チャート])

| # | 機種 | OS | ST | MT |
|---|---|---|---|---|
| 1 | ASUS Vivobook S 14 S54xx | Windows | 2239 | 10272 |
| 2 | HP OmniBook X Flip 16 | Windows | 1482 | 8149 |
| 3 | HP OmniBook X Flip 16 | Windows | 2467 | 10671 |
| 4 | HP OmniBook X Flip 16 | Windows | 2268 | 9071 |
| 5 | Lenovo 83MC | Windows | 2389 | 10897 |
| 6 | HP OmniBook 7 17-dc0xxx | Windows | 1219 | 7228 |
| 7 | Lenovo 83JX | Windows | 2423 | 9770 |
| 8 | Lenovo 83JX | Windows | 2150 | 9688 |
| 9 | ASUS Vivobook 14 Flip | Windows | 2291 | 9526 |
| 10 | LattePanda Mu Ultra | Windows | 2269 | 9351 |
| 11 | LattePanda Mu Ultra | Windows | 2145 | 9096 |
| 12 | LattePanda Mu Ultra | Windows | 2246 | 9384 |
| 13 | Lenovo 22AYCTO1WW | Windows | 1386 | 5300 |
| 14 | Lenovo F0JW005KRU | Windows | 2163 | 8867 |
| 15 | LattePanda Mu Ultra | Windows | 2259 | 10177 |
| 16 | Lenovo 83JQ | Windows | 1129 | 3589 |
| 17 | ASUS Vivobook S 14 S54xx | Windows | 2463 | 11080 |
| 18 | Lenovo 83CX | Windows | 1533 | 7465 |
| 19 | Lenovo 83CX | Windows | 1521 | 7994 |
| 20 | Lenovo 83CX | Windows | 838 | 945 |
| 21 | ASUS Vivobook S 14 S54xx | Linux | 2566 | 11563 |
| 22 | Lenovo 83JQ | Windows | 2337 | 10623 |
| 23 | Lenovo 83CX | Windows | 2456 | 1903 |
| 24 | Samsung | Windows | 2410 | 10231 |
| 25 | Samsung | Windows | 2439 | 10096 |

- 除外: なし。**n = 25**。
- **全体の中央値: ST 2259 / MT 9384**(範囲 ST 838〜2566 / MT 945〜11563)
- 参考: Windows のみ n=24 → 2253 / 9368、Linux のみ n=1 → 2566 / 11563
- 公開値との差: ST **+12.0%** / MT +4.6%
- 注: #20(838 / 945)・#23(MT 1903)は極端に低いが除外していない。

## 11. Core Ultra X9 388H(Panther Lake-H、16c)

- 指示の「Core Ultra 9 388H」は、プリセット intel-ptl-x9-388h の GB7 名「Panther Lake: Core Ultra **X9** 388H(2.1GHz, 16c)」に合わせて `Core Ultra X9 388H` で検索(235 件)。25 件すべて「Core Ultra X9 388H」・16 コア。
- 現在の公開値: 2515 / 15820([直近25件の中央値]。2026-10-25 に約 17 件から概算。チャートではない)

| # | 機種 | OS | ST | MT | 除外 |
|---|---|---|---|---|---|
| 1 | Lenovo 21XJ003BUS | Windows | 2620 | 17290 | |
| 2 | Lenovo 21XJCTO1WW | Windows | 2663 | 18786 | |
| 3 | Lenovo 83SK | Windows | 2741 | 19970 | |
| 4 | Lenovo 83SK | Windows | 2734 | 19880 | |
| 5 | Lenovo 83SK | Windows | 2734 | 19910 | |
| 6 | MSI Prestige 16 AI+ C3M | Windows | 2186 | 16808 | |
| 7 | MSI Prestige 16 AI+ C3M | Windows | 1258 | 9970 | |
| 8 | Lenovo 83SK | Windows | 2675 | 19389 | |
| 9 | ASUS ExpertBook B9406CAA | Windows | 2576 | 18310 | |
| 10 | ASUS ExpertBook B9406CAA | Windows | 2613 | 18188 | |
| 11 | Lenovo 21XE0010GE | Windows | 2670 | 17915 | |
| 12 | Lenovo 83QK | Windows | 924 | 5668 | |
| 13 | Lenovo 83SK | Windows | 2672 | 19325 | |
| 14 | Lenovo 83SK | Windows | 2443 | 19248 | |
| 15 | Lenovo 83SK | Windows | 2653 | 16591 | |
| 16 | HP OmniBook Ultra 14t-k | Windows | 2733 | 16818 | |
| 17 | Dell Pro Precision 5 | Windows | 2714 | 18675 | |
| 18 | Dell Pro Precision 5 | Windows | 2715 | 18625 | |
| 19 | Dell Pro Precision 5 | Windows | 2721 | 18740 | |
| 20 | Dell Pro Precision 5 | Windows | 2684 | 18522 | |
| 21 | HP OmniBook Ultra 14-kd | Windows | 2735 | 17003 | |
| 22 | HP OmniBook Ultra 14-kd | Windows | 2330 | 14062 | |
| 23 | Oracle Corp, Inc | Linux | 2539 | 16871 | 仮想環境の疑い(機種名が Oracle。VirtualBox と思われる) |
| 24 | HP OmniBook Ultra 14t-k | Windows | 2515 | 12175 | |
| 25 | HP OmniBook Ultra 14t-k | Windows | 2308 | 12655 | |

- 除外 1 件(仮想環境の疑い)。**n = 24**。
- **全体の中央値: ST 2667 / MT 18249**(範囲 ST 924〜2741 / MT 5668〜19970)
- 参考: Windows のみ = 全体と同じ(n=24)。Linux は除外した 1 件のみ。#23 を残した場合は n=25 で 2663 / 18188。
- 公開値との差: ST +6.0% / MT **+15.4%**

## 12. Core Ultra 9 275HX(Arrow Lake-HX、24c)

- 検索語: `Core Ultra 9 275HX`(2,340 件)
- 現在の公開値: 2425 / 20507([チャート])

| # | 機種 | OS | コア | ST | MT | 除外 |
|---|---|---|---|---|---|---|
| 1 | Razer Blade 18 RZ09-0529 | Windows | 24 | 2655 | 21832 | |
| 2 | Acer Predator PHN16S-71 | Windows | 24 | 2731 | 23067 | |
| 3 | Lenovo 83N2 | Windows | 24 | 2604 | 21255 | |
| 4 | ASUS ROG Strix G18 G815LP | Windows | 24 | 2585 | 22864 | |
| 5 | MSI Crosshair 16 HX AI | Windows | 24 | 2671 | 21707 | |
| 6 | MSI Crosshair 16 HX AI | Windows | 24 | 2113 | 14367 | |
| 7 | MSI Crosshair 16 HX AI | Windows | 24 | 2152 | 15251 | |
| 8 | Acer Predator PHN16S-71 | Windows | 24 | 2813 | 24029 | |
| 9 | Acer Predator PH16-73 | Windows | 24 | 2572 | 23345 | |
| 10 | Acer Predator PHN16S-71 | Windows | 24 | 2715 | 11603 | |
| 11 | Acer Predator PHN16S-71 | Windows | 24 | 2714 | 11825 | |
| 12 | ASUS ROG Strix SCAR 16 G635 | Windows | 24 | 2532 | 11896 | |
| 13 | Lenovo 83NX | Windows | 24 | 2063 | 20911 | |
| 14 | ASUS ROG Strix G16 G615LR | Windows | 24 | 2761 | 23531 | |
| 15 | MacPro7,1 | macOS | 8 | 2300 | 15951 | コア数不一致(Mac Pro の機種名。実機ではない) |
| 16 | Lenovo 83F5 | Windows | 24 | 2682 | 24844 | |
| 17 | MSI Vector 16 HX AI A2X | Windows | 24 | 2763 | 20324 | |
| 18 | MSI Vector 16 HX AI A2X | Windows | 24 | 2729 | 20295 | |
| 19 | Acer Predator PHN16S-71 | Windows | 24 | 2360 | 18807 | |
| 20 | ASUS ROG Strix G16 G615LR | Windows | 24 | 2756 | 23344 | |
| 21 | Lenovo 83LU | Windows | 24 | 2482 | 21037 | |
| 22 | Lenovo 83LU | Windows | 24 | 1661 | 18244 | |
| 23 | ASUS ROG Strix SCAR 18 G835 | Windows | 24 | 2655 | 22984 | |
| 24 | ASUS ROG Strix SCAR 18 G835 | Windows | 24 | 2671 | 17745 | |
| 25 | Acer Predator PHN16S-71 | Windows | 24 | 2365 | 16956 | |

- 除外 1 件(コア数 8)。**n = 24**。
- **全体の中央値: ST 2655 / MT 20974**(範囲 ST 1661〜2813 / MT 11603〜24844)
- 参考: Windows のみ = 全体と同じ。Linux 0 件。
- 公開値との差: ST +9.5% / MT +2.3%

## 13. Core i7-14700HX(Raptor Lake-HX Refresh、20c)

- 検索語: `Core i7-14700HX`(403 件)
- 現在の公開値: 2156 / 14420([チャート])

| # | 機種 | OS | コア | ST | MT | 除外 |
|---|---|---|---|---|---|---|
| 1 | MacPro7,1 | macOS | 28 | 1594 | 12156 | コア数不一致 |
| 2 | MacPro7,1 | macOS | 8 | 1736 | 11550 | コア数不一致 |
| 3 | ERYING | Windows | 20 | 1877 | 9180 | |
| 4 | ERYING | Windows | 20 | 1261 | 8901 | |
| 5 | Lenovo 83FD | Windows | 20 | 1177 | 12898 | |
| 6 | ERYING | Windows | 20 | 2075 | 13579 | |
| 7 | MacPro7,1 | macOS | 8 | 1766 | 12330 | コア数不一致 |
| 8 | MacPro7,1 | macOS | 8 | 1734 | 12672 | コア数不一致 |
| 9 | Acer Predator PHN16-72 | Windows | 20 | 2214 | 15160 | |
| 10 | Acer Predator PHN16-72 | Windows | 20 | 2398 | 13957 | |
| 11 | MacPro7,1 | macOS | 8 | 1834 | 13229 | コア数不一致 |
| 12 | ASUS ROG Strix G16 G615JM | Windows | 20 | 1521 | 12033 | |
| 13 | Lenovo 83JE | Windows | 20 | 2518 | 16715 | |
| 14 | MacPro7,1 | macOS | 8 | 1765 | 12698 | コア数不一致 |
| 15 | TULPAR T6 V3.6 | Windows | 20 | 2594 | 18286 | |
| 16 | HP Victus Gaming Laptop | Windows | 20 | 2140 | 8599 | |
| 17 | HP Victus Gaming Laptop | Windows | 20 | 1916 | 8543 | |
| 18 | HP Victus Gaming Laptop | Windows | 20 | 1332 | 3602 | |
| 19 | Lenovo 21FA0051US | Linux | 20 | 2457 | 16824 | |
| 20 | Lenovo 21FA0051US | Linux | 20 | 2480 | 16851 | |
| 21 | MacBookPro16,2 | macOS | 8 | 981 | 9830 | コア数不一致 |
| 22 | Lenovo 83DV | Windows | 20 | 1201 | 11996 | |
| 23 | Lenovo 83FD | Windows | 20 | 2299 | 14635 | |
| 24 | Lenovo 83FD | Windows | 20 | 2313 | 14938 | |
| 25 | Lenovo 83LY | Windows | 20 | 2572 | 16082 | |

- 除外 7 件(コア数不一致。すべて Mac の機種名の macOS 投稿=実機ではない)。**n = 18**(25 に満たない)。
- **全体の中央値: ST 2177 / MT 13768**(範囲 ST 1177〜2594 / MT 3602〜18286)
- 参考: Windows のみ n=16 → 2108 / 13239、Linux のみ n=2 → 2469 / 16838
- 公開値との差: ST +1.0% / MT −4.5%
- 注: ERYING(モバイル CPU を載せたデスクトップ用マザーボードと思われる)3 件を含む。ST 1177〜1332 の低い投稿が 4 件ある(除外していない)。

## 14. 新旧一覧(全体の中央値。直近 25 件、2026-11-07)

| SKU(GB7 名) | 旧 ST | 旧 MT | 旧の区分 | 新 ST | 新 MT | n | ST の差 | MT の差 | 注 |
|---|---|---|---|---|---|---|---|---|---|
| Ryzen AI 9 HX 370 | 2350 | 15014 | チャート | 2565 | 14713 | 25 | +9.1% | −2.0% | |
| Ryzen AI 7 350 | 2116 | 11354 | チャート(原ページ未確認) | 2590 | 13501 | 23 | +22.4% | +18.9% | ST 約 1000 の 1 機種 5 件を含む |
| Ryzen AI Max+ 395 | 2423 | 20787 | チャート | 2764 | 29916 | 24 | +14.1% | +43.9% | MT は Linux の ROG Flow Z13 1 機種 15 件に偏る(Windows のみは 22543) |
| Ryzen 7 7840HS | 2037 | 11886 | チャート | 2071 | 12142 | 25 | +1.7% | +2.2% | |
| Ryzen 7 5800U | 1505 | 6368 | チャート | 1701 | 6963 | 20 | +13.0% | +9.3% | n<25(Android 16 コア表示 5 件を除外)。総数 113 件 |
| Ryzen 7 7735HS | 1737 | 8279 | チャート | 1916 | 10175 | 25 | +10.3% | +22.9% | 1 機種(DOKE)11 件に偏る |
| Core Ultra 9 185H | 1850 | 11557 | チャート | 2174 | 13731 | 14 | +17.5% | +18.8% | n<25。偽 Mac 機種名の投稿が多い。それを全部除くと 2192 / 14121 |
| (参考)Core Ultra 7 155H | — | — | — | 1981 | 11491 | 24 | — | — | プリセット・gb7-scores.js に行なし |
| Core Ultra 7 268V | 2134 | 9389 | チャート | 2360 | 10128 | 25 | +10.6% | +7.9% | |
| Core Ultra 7 258V | 2096 | 9227 | チャート | 1957 | 9807 | 25 | −6.6% | +6.3% | **信頼度低**: Linux の 1 機種 7 件が MT 約 2000 と異常。Windows のみは 2270 / 10407 |
| Core Ultra 7 256V | 2017 | 8971 | チャート | 2259 | 9384 | 25 | +12.0% | +4.6% | |
| Core Ultra X9 388H | 2515 | 15820 | 直近約17件の概算 | 2667 | 18249 | 24 | +6.0% | +15.4% | 仮想環境の疑い 1 件を除外 |
| Core Ultra 9 275HX | 2425 | 20507 | チャート | 2655 | 20974 | 24 | +9.5% | +2.3% | |
| Core i7-14700HX | 2156 | 14420 | チャート | 2177 | 13768 | 18 | +1.0% | −4.5% | n<25(偽 Mac 機種名 7 件を除外) |

- 未取得の SKU: なし(対象はすべて取得できた)。
- 値は 2026-11-07 時点の検索結果 1 ページ目のもので、投稿が増えると変わる。
- この文書の §1〜§14 は収集だけだった。**採用(反映)は下の §15**(ユーザー指示「全体の中央値を取得してください」)。

## 15. 採用と影響(実装担当の追記。2026-11-07)

§14 の 13 SKU の全体中央値を公開値として採用した。155H は参考のみで追加していない。

- 設計書 §2.4 の GB7 表の該当 13 行を新値に更新(区分「直近25件の中央値」、備考に「全体。2026-11-07 取得」と n、旧値〔チャート〕)。
- `data/benchmarks/gb7-scores.js` は `node tools/extract-gb7.js` で再生成(手編集・sed なし)。他の 158 行は不変であることを、HEAD との行単位の比較で確認した(変わったのは 13 行の single / multi / kind / n だけ)。
- モデルの予測(ST / MT)は不変。公開値・誤差・判定が変わる。

### 誤差と判定の前後(±10%。差 = 予測 / 公開値 − 1)

| SKU | 区分 | 公開値 旧→新 | 予測 | 誤差 旧→新 | 判定 旧→新 |
|---|---|---|---|---|---|
| intel-mtl-185h | ST | 1850→2174 | 2185.0 | +18.1%→+0.5% | **ng→ok** |
| intel-mtl-185h | MT | 11557→13731 | 12198.8 | +5.6%→-11.2% | **ok→ng** |
| intel-lnl-268v | ST | 2134→2360 | 2481.5 | +16.3%→+5.1% | **ng→ok** |
| intel-lnl-268v | MT | 9389→10128 | 9102.0 | -3.1%→-10.1% | **ok→ng** |
| intel-ptl-x9-388h | ST | 2515→2667 | 2820.5 | +12.1%→+5.8% | **ng→ok** |
| intel-ptl-x9-388h | MT | 15820→18249 | 16938.5 | +7.1%→-7.2% | ok→ok |
| amd-strix-hx370 | ST | 2350→2565 | 2780.4 | +18.3%→+8.4% | **ng→ok** |
| amd-strix-hx370 | MT | 15014→14713 | 12095.1 | -19.4%→-17.8% | ng→ng |
| amd-kraken-350 | ST | 2116→2590 | 2694.6 | +27.3%→+4.0% | **ng→ok** |
| amd-kraken-350 | MT | 11354→13501 | 10084.0 | -11.2%→-25.3% | ng→ng |
| amd-strixhalo-395 | ST | 2423→2764 | 2802.2 | +15.6%→+1.4% | **ng→ok** |
| amd-strixhalo-395 | MT | 20787→29916 | 20372.5 | -2.0%→-31.9% | **ok→ng** |
| intel-lnl-258v | ST | 2096→1957 | 2388.5 | +14.0%→+22.0% | ng→ng |
| intel-lnl-258v | MT | 9227→9807 | 8921.5 | -3.3%→-9.0% | ok→ok |
| amd-zen4-7840hs | ST | 2037→2071 | 2360.3 | +15.9%→+14.0% | ng→ng |
| amd-zen4-7840hs | MT | 11886→12142 | 10028.4 | -15.6%→-17.4% | ng→ng |
| amd-zen3-5800u | ST | 1505→1701 | 1878.2 | +24.8%→+10.4% | ng→ng |
| amd-zen3-5800u | MT | 6368→6963 | 7769.0 | +22.0%→+11.6% | ng→ng |
| intel-arl-275hx | ST | 2425→2655 | 2748.0 | +13.3%→+3.5% | **ng→ok** |
| intel-arl-275hx | MT | 20507→20974 | 23197.6 | +13.1%→+10.6% | ng→ng |
| amd-zen3p-7735hs | ST | 1737→1916 | 2012.7 | +15.9%→+5.0% | **ng→ok** |
| amd-zen3p-7735hs | MT | 8279→10175 | 8242.2 | -0.4%→-19.0% | **ok→ng** |
| intel-rpl-14700hx | ST | 2156→2177 | 2569.6 | +19.2%→+18.0% | ng→ng |
| intel-rpl-14700hx | MT | 14420→13768 | 16099.8 | +11.6%→+16.9% | ng→ng |
| intel-lnl-256v | ST | 2017→2259 | 2388.5 | +18.4%→+5.7% | **ng→ok** |
| intel-lnl-256v | MT | 8971→9384 | 8921.5 | -0.6%→-4.9% | ok→ok |

- ±10% 外の件数(ST・MT の延べ): **37 → 32**。
- ng→ok: 9 件(185H ST、268V ST、388H ST、HX 370 ST、Kraken ST、395 ST、275HX ST、7735HS ST、256V ST)。
- **新たに ng になった SKU(ok→ng): 185H MT(-11.2%)、268V MT(-10.1%)、395 MT(-31.9%)、7735HS MT(-19.0%)の 4 件。** MT の公開値が大きく上がったのに予測が追いつかない。
- ST が ng のまま: 258V(+22.0%。公開値が下がった)、7840HS(+14.0%)、5800U(+10.4%)、14700HX(+18.0%)。
- 偏りの注意(認識したうえでの採用。Windows のみに切り替えるかは判断待ち。設計書 §13.4・各プリセットの errCause に記載): 258V は Linux の同一機種 7 件が MT 約 2000 と異常で全体中央値を下げている(Windows のみなら 2270 / 10407)。395 の MT は Linux 15 件がすべて ROG Flow Z13(約 30,000)で 1 機種に偏る(Windows のみなら 22543)。7735HS は Shenzhen DOKE の 11 件が中央値を決める。185H・14700HX は macOS を名乗る偽装投稿が多く n が小さい(14 / 18)。

### モバイル PC の MT 帯係数の逆算(係数は変更しない)

標本 id の除外ルールは据え置き(11 件)で、帯ごとの「予測 = 公開値となる係数」の中央値を再計算した。

| 帯 | n | 中央値(旧→新) | 丸め | 係数 | 差(新) |
|---|---|---|---|---|---|
| 帯 0(60W 以下) | 5 | 0.7323 → **0.8398** | 0.84 | 0.69 | +0.1498 |
| 帯 1(60W 超) | 6 | 0.7783 → **0.8058** | 0.81 | 0.76 | +0.0458 |

- 係数 0.69 / 0.76 は変えていない(再校正は判断待ち。§13.4 に更新後の中央値を追記)。
- LOO MAE(帯別)は 0.0986 → **0.1288**、一律 0.81 は 0.0993 → 0.1063。帯別が一律 0.81 より**悪くなった**(以前は帯別が良かった)。`tests/perf.test.js` の帯テストは新しい既知の値に固定し直し(閾値を緩めていない。< 0.115 の主張が成り立たなくなった事実を固定)。

### 検証ペアの移動

HX 370・268V・395 の ST が ±10% に入ったため、`tests/perf.test.js` の既知の外れ値(KNOWN_MISSES)から検証ペアへ移した。
