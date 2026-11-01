# モバイルの Geekbench 7 公開値の偏り — Notebookcheck での検証

調査日: 2026-11-01。目的は次の仮説を確かめること。モバイル(kind が mobile-pc の x86 / Windows-on-ARM)のプリセットでは、モデルの GB7 ST が `data/benchmarks/gb7-scores.js` の公開値(チャート)より 11〜31% 高い。その原因は、**チャートの母集団(省電力設定・バッテリー駆動・低 TDP の機体)が最良条件の実測より低く、モデルが最良条件に近いから**ではないか。

プリセットとコードは編集していない。

## 0. データのルール・出典・取得方法

- 区分は **[実測] > [公表] > [二次] > [推定] / 未取得**。
- **NBC CPU ページ**: Notebookcheck の「<SKU> Processor - Benchmarks and Specs」ページ。2026-11-01 に curl で HTML を直接取得し(全ページ HTTP 200)、各ベンチ欄に隠れている明細表(Model / CPU / GPU / RAM / Value)を機械的に抜き出した。URL は §6 にまとめた。
- NBC の GB7 欄の行は、出典が 2 種類ある。区分を分けて扱う。
  - **(L) NBC ラボ測定**: 機種名が「〜 via <貸出元> 7.0.0 Pro」の形で、notebookcheck.net のレビューにリンクし、CPU 欄に電力設定(PL2 / PL1 の W)が書かれている行。**[実測]**(NBC による測定)。ただし、レビュー本文の中では GB7 の値を確認できなかった(本文のグラフは GB6.7 まで)。値は CPU ページの DB の記載から取った。
  - **(G) Geekbench Browser の転載**: browser.geekbench.com/v7/cpu/<ID> にリンクする行(機種名は Geekbench のシステム名)。NBC が Geekbench Browser から選んで載せた 1 件の投稿。**[二次]**。リンク先は 403 のため開いていない。電力設定と日付はわからない(**取得不可**)。
- **背景にあった「NBC 実測」は NBC の測定ではなかった**:
  - HX 370 の 2784 は (G)。機体は **Meigao F8BAC というミニ PC**(ノート PC ではない)。
  - Kraken 350 の 2567 / 14103 も (G)。機体は Framework Laptop 13。
- NBC は GB7 の行がほぼ 1〜2 件しかない。その代わり **GB6 欄(見出しは「Geekbench 6.7.1」。行には 6.2.1〜6.7.1 が混在)には NBC ラボの行が多い**(HX 370 は 25 件、Lunar 258V は 23 件など)。そこで §3 では GB6 のラボ値を使った間接的な検証も行った。
- モデル値: `tests/evaluate.test.js` と同じ呼び方(`E.evaluate(design.fromPreset(p), E.makeContext())`。校正は既定の mode 'rep' = 再現モード)。
- 取得不可: Geekbench Browser(403。使っていない)、NBC の比較ページ(`Core-Ultra-9-285K-vs-Ryzen-9-9950X_...247596.0.html` は HTTP 403)、Core Ultra 9 285K の NBC CPU ページ(CPU ページの URL がレビューに飛ぶ。レビューに GB7 欄は無い)。amd.com は取得していない。

## 1. 対象プリセット(kind = mobile-pc。Apple 以外)

| プリセット id | SKU | uarch(P コア) | チャート ST / MT | チャートの区分(n) |
|---|---|---|---|---|
| amd-zen3-5800u | Ryzen 7 5800U | Zen 3 | 1505 / 6368 | チャート(n 記載なし) |
| amd-zen3p-7735hs | Ryzen 7 7735HS | Zen 3+ | 1737 / 8279 | チャート |
| amd-zen4-7840hs | Ryzen 7 7840HS | Zen 4 | 2037 / 11886 | チャート |
| amd-strix-hx370 | Ryzen AI 9 HX 370 | Zen 5 | 2350 / 15014 | チャート |
| amd-kraken-350 | Ryzen AI 7 350 | Zen 5 | 2116 / 11354 | チャート(検索要約・原ページ未確認) |
| amd-strixhalo-395 | Ryzen AI Max+ 395 | Zen 5 | 2423 / 20787 | チャート |
| intel-mtl-185h | Core Ultra 9 185H | Redwood Cove | 1850 / 11557 | チャート |
| intel-rpl-14700hx | Core i7-14700HX | Raptor Cove | 2156 / 14420 | チャート |
| intel-lnl-256v / 258V / 268V | Core Ultra 7 256V / 258V / 268V | Lion Cove | 2017 / 8971、2096 / 9227、2134 / 9389 | チャート |
| intel-arl-275hx | Core Ultra 9 275HX | Lion Cove | 2425 / 20507 | チャート |
| intel-ptl-x7-358h / x9-378h / 9-386h / x9-388h | Panther Lake | Cougar Cove | 2520 / 16120、2600 / 17300、2560 / 17540、2515 / 15820 | **直近25件の中央値**(n 記載なし) |
| qc-8cx-gen3 | Snapdragon 8cx Gen 3 | Cortex-X1 | 1315 / 6722 | 直近25件の中央値(n=17) |

チャートの区分は、gb7-scores.js の注記による。「チャート」= Geekbench 公式チャートの SKU 平均。「直近25件の中央値」= 検索結果の中央値。スマートフォンの mobile は今回は対象外(NBC はスマホの GB7 がほぼ無い)。

## 2. (a) SKU × NBC の値

### 2.1 GB7(全行。日付: (G) は取得不可。(L) は掲載レビューの公開日で、GB7 を測った日ではない可能性がある)

| SKU | 機体 | 電力設定(PL2/PL1) | ST | MT | 出典 | 区分 | 日付 |
|---|---|---|---|---|---|---|---|
| 5800U | — | — | **GB7 なし** | — | NBC CPU ページ | 未取得 | — |
| 7735HS | MSI Bravo 15 C7VE | 不明 | 1897 | 9377 | browser.geekbench.com/v7/cpu/728639 | [二次](G) | 不明 |
| 7840HS | Lenovo 82XT | 不明 | 2304 | 13204 | …/v7/cpu/729819 | [二次](G) | 不明 |
| 7840HS | Lenovo 82Y9 | 不明 | 2409 | 14749 | …/v7/cpu/656877 | [二次](G) | 不明 |
| HX 370 | Meigao F8BAC(**ミニ PC**) | 不明 | 2784 | 17515 | …/v7/cpu/694162 | [二次](G) | 不明 |
| AI 7 350 | Framework Laptop 13 | 不明 | 2567 | 14103 | …/v7/cpu/682130 | [二次](G) | 不明 |
| Max+ 395 | Asus ROG Flow Z13 GZ302EA | 不明 | 2698 | 23028 | …/v7/cpu/621559 | [二次](G) | 不明 |
| 185H | Geekom IT13 Max(**ミニ PC**) | 70 W / 40 W | 2222 | 14628 | [レビュー](https://www.notebookcheck.net/Geekom-IT13-Max-mini-PC-review-Affordable-and-fast-but-with-a-catch.1364007.0.html) | [実測](L) | 2026-08-10 |
| 14700HX | Lenovo 83JE | 不明 | 2579 | 19414 | …/v7/cpu/300855 | [二次](G) | 不明 |
| 256V | Acer Revo Box RB102-LNL(**ミニ PC**) | 37 W / 30 W | 2504 | 11349 | [レビュー](https://www.notebookcheck.net/Acer-mini-PC-review-Surprisingly-powerful-until-you-look-at-the-SSD.1391302.0.html) | [実測](L) | 2026-09-08 |
| 258V | Lenovo ThinkPad X9-15 Aura | 37 W / 25 W | 2433 | 10821 | [レビュー](https://www.notebookcheck.net/Lenovo-ThinkPad-X9-15-Aura-Edition-Laptop-Review-The-MacBook-Air-rival-is-very-good-even-without-a-TrackPoint.967369.0.html) | [実測](L) | 2025-02-25(GB7 の公開前なので、後から測り直したと思われる) |
| 268V | Dell Pro 14 Premium PA14250 | 不明 | 2586 | 11552 | …/v7/cpu/642325 | [二次](G) | 不明 |
| 275HX | Lenovo Legion Pro 7i 16 Gen 10 | 201 W / 156 W | 2810 | 24763 | リンク先は lenovo.com の製品ページ(測定元不明) | [二次] | 不明 |
| 358H | Minisforum M2 Pro(**ミニ PC**) | 65 W / 45 W | 2576 | 17804 | [レビュー](https://www.notebookcheck.net/Minisforum-M2-Pro-mini-PC-review-Plenty-of-performance-a-fair-price-and-a-well-rounded-package.1398885.0.html) | [実測](L) | 2026-09-16 |
| 358H | MSI Prestige 14 AI+ D3MG | 不明 | 2578 | 17483 | リンクなし(「7.0.0 Pro」表記) | [実測]?(出典リンクなし) | 不明 |
| 378H | HP OmniBook Ultra 14-kd0xxx | 不明 | 2457 | 15980 | …/v7/cpu/253653 | [二次](G) | 不明 |
| 386H | Asus ROG Zephyrus G16 GU606AW | 70 W / 70 W | 2657 | 18852 | [レビュー](https://www.notebookcheck.net/One-of-the-best-slim-gaming-laptops-gets-even-better-Asus-ROG-Zephyrus-G16-2026-Review.1384320.0.html) | [実測](L) | 2026-09-07 |
| 388H | Asus Zenbook Duo UX8407AA | 不明 | 2598 | 17491 | …/v7/cpu/114744 | [二次](G) | 不明 |
| 388H | Asus Zenbook Duo UX8407AA | 不明 | 2668 | 18114 | …/v7/cpu/260699 | [二次](G) | 不明 |
| 8cx Gen 3 | Huawei GK-W7X | 不明 | 1442 | 6912 | …/v7/cpu/149414 | [二次](G) | 不明 |

GB7 の件数は全 SKU で 1〜2 件しかない。最大・中央値・最小は次のとおり(件数 1 なら 3 つとも同じ値): 7840HS ST 2409 / 2357 / 2304、MT 14749 / 13977 / 13204(n=2)。358H ST 2578 / 2577 / 2576、MT 17804 / 17644 / 17483(n=2)。388H ST 2668 / 2633 / 2598、MT 18114 / 17803 / 17491(n=2)。それ以外は **n=1**。

### 2.2 GB6(参考。NBC ラボ (L) の行だけで集計。各行は NBC レビューへのリンク付きの [実測])

| SKU | n(ラボ) | ST 中央値 | ST 最大(機体・電力) | ST 最小(機体・電力) | MT 中央値 | MT 最大(機体・電力) | MT 最小(機体・電力) |
|---|---|---|---|---|---|---|---|
| 5800U | 0 (G が 1 件: HP ProBook 455 G8、[二次] v6/cpu/13568378) | (1865) | — | — | (7934) | — | — |
| 7735HS | 8 | 2088 | 2153 Minisforum HX77G 54/35 W | 1949 GMK NucBox K16 50/50 W | 9741 | 11035 HX77G | 7046 NucBox K16 |
| 7840HS | 15 | 2640 | 2706 XMG Apex 17 65/54 W | 2591 Peladn HA-4 45/45 W | 13020 | 13473 UM780 XTX 65/54 W | 11804 Peladn HA-4 |
| HX 370 | 25 | 2877 | 2965 Acemagic F3A 70/65 W | 2780 Minisforum AI370 54/45 W | 15043 | 16311 XMG Core 16 M25 95/70 W | 11973 OneXplayer X1 Pro 30 W |
| AI 7 350 | 15 | 2854 | 2942 XMG Core 15 M25 105/70 W | 1982 HP Omen 17z 65/65 W | 13083 | 14194 XMG Core 15 M25 | 10774 Vivobook 16 M1606K 50/40 W |
| Max+ 395 | 7 | 2931 | 2978 ROG Flow Z13 86/70 W | 2791 Bosgame M5 140/120 W | 17599 | 22157 Minisforum MS-S1 Max | 16510 GMK EVO-X2 140/120 W |
| 185H | 19 | 2490 | 2570 Yoga Pro 9 16IMH9 115/80 W | 2199 Alienware x16 R2 151/105 W | 13848 | 14540 Zephyrus G16 GU605MY | 12151 GeekBook X14 Pro 45/35 W |
| 14700HX | 7 | 2884 | 2975 Predator Helios Neo 16 157/95 W | 2378 HP Victus 16 130/130 W | 15765 | 17562 Legion Pro 5 16IRX9 190/130 W | 14163 LOQ 17IRX10 162/90 W |
| 256V | 10 | 2757 | 2784 Schenker ES | 2680 Yoga Slim 7 15 39/30 W | 10962 | 11106 Acer Revo Box 37/30 W | 9852 Schenker ES |
| 258V | 23 | 2754 | 2795 Medion SPRCHRGD 14 S2 37/30 W | 2593 EliteBook X Flip G1i | 10968 | 11334 EliteBook Ultra G1i 37/18 W | 8964 MSI Cubi NUC AI+ 2MG 40/38 W |
| 268V | 5 | 2844 | 2871 Surface Laptop 7 15 37/30 W | 2809 Dell Pro 13 Premium | 11181 | 11388 Surface Pro OLED 37/30 W | 10589 Dell Pro 13 Premium |
| 275HX | 30 | 3060 | 3158 ROG Strix Scar 18 175/150 W | 2843 Aorus AI Box 120/90 W | 19382 | 21668 Strix Scar 18 | 16832 Schenker Key 18 Pro 145/130 W |
| 358H | 10 | 2862 | 2927 Dell XPS 14 69/30 W | 2778 Framework 13 Pro 58/31 W | 16697 | 17121 XPS 14 | 14309 Framework 13 Pro |
| 378H | 0 (G が 1 件、[二次]) | (2915) | — | — | (16494) | — | — |
| 386H | 10 | 2891 | 2947 Zephyrus G16 GU606AW 70/70 W | 2778 MSI Cubi NUC AI+ 3MG 61/30 W | 16893 | 17405 Zephyrus Duo GX651 70/70 W | 13776 Prestige 13 AI+ 34/24 W |
| 388H | 2 | 3024 | 3027 HP OmniBook Ultra 14 43/26 W | 3020 Zenbook Duo UX8407 64/46 W | 17131 | 17694 Zenbook Duo | 16568 OmniBook Ultra 14 |
| 8cx Gen 3 | 0 (G が 1 件、[二次]) | (1592) | — | — | (6248) | — | — |

NBC ラボの GB6 は、主にプラグ接続・高性能プロファイルでの測定と考えられる(NBC の測定方針の確認は**未取得**)。ST のばらつき(ラボ内の最大 ÷ 最小)は、1 つの外れ値を除けば 2〜8% と狭い。外れ値は Kraken 350 の HP Omen 17z(1982)。

### 2.3 デスクトップ対照(NBC CPU ページ。GB7 はすべて (G) の n=1、[二次])

| SKU | チャート ST / MT | NBC GB7 ST / MT(機体、出典) | NBC÷チャート ST / MT | GB6 ST / MT(区分) | チャート GB7 ÷ GB6 ST (= k) |
|---|---|---|---|---|---|
| 9700X | 3010 / 17703 | 3216 / 20383(ROG STRIX B850-A、v7/cpu/679324) | 1.068 / 1.151 | 3373 / 16817([実測] NBC レビュー) | 0.892 |
| 9950X | 3068 / 26161 | 3269 / 29134(ROG STRIX B850-F、v7/cpu/655862) | 1.066 / 1.114 | 3408 / 21383(出典リンクなし) | 0.900 |
| 7700 | 2503 / 15197 | 2636 / 16435(TUF B850-PLUS、v7/cpu/714392) | 1.053 / 1.081 | 2830 / 15300([実測]) | 0.884 |
| 7950X | 2598 / 22461 | 2744 / 25143(CROSSHAIR X670E HERO、v7/cpu/655665) | 1.056 / 1.119 | 2981 中央値 n=10 / 19772([実測]) | 0.872 |
| 5800X | 2053 / 11232 | 2158 / 12035(ROG STRIX B550-F、v7/cpu/744014) | 1.051 / 1.071 | 2265 / 10035([二次] v6/cpu/13799715) | 0.906 |
| 5950X | 2040 / 14956(直近25件の中央値 n=23) | 2192 / 16256(X570 AORUS XTREME、v7/cpu/743551) | 1.075 / 1.087 | 2256 / 13355([実測]) | 0.904 |
| 12600K | 2240 / 12759 | 2279 / 12833(MacPro7,1 Hackintosh、v7/cpu/708908) | 1.017 / 1.006 | 2629([二次]) | 0.852 |
| 12700K | 2288 / 15455 | 2385 / 16879(Z690 UD DDR4、v7/cpu/724694) | 1.042 / 1.092 | 2580(リンクなし) | 0.887 |
| 12900K | 2270 / 16820 | 2454 / 19296(PRIME Z790-P、v7/cpu/730190) | 1.081 / 1.147 | 2715([実測]) | 0.836 |
| 13600K | 2316 / 15576 | 2540 / 19219(STRIX Z790-H、v7/cpu/678301) | 1.097 / 1.234 | 2750([実測]) | 0.842 |
| 13700K | 2480 / 19163 | 2605 / 23052(STRIX Z790-H、v7/cpu/549962) | 1.050 / 1.203 | 2962(リンクなし) | 0.837 |
| 13900K | 2615 / 22826 | 2683 / 23319(STRIX Z790-A、v7/cpu/648737) | 1.026 / 1.022 | 3070([実測]) | 0.852 |
| 14600K | 2513 / 17172 | 2628 / 19479(Z790 Riptide、v7/cpu/562746) | 1.046 / 1.134 | 2879([実測]) | 0.873 |
| 14700K | 2566 / 20857 | 2635 / 22642(MacPro7,1、v7/cpu/633127) | 1.027 / 1.086 | 2922 中央値 n=2 / 19147([実測]) | 0.878 |
| 14900K | 2649 / 21921 | 2909 / 22851(PRIME Z690-P D4、v7/cpu/662919) | 1.098 / 1.042 | 3243 中央値 n=7([実測]) | 0.817 |
| 265K | 2737 / 23523 | 2859 / 24153(TUF Z890-PLUS、v7/cpu/630097) | 1.045 / 1.027 | 3085 / 20581([二次] v6/cpu/14315006) | 0.887 |
| 285K | 2804 / 25589 | **取得不可**(CPU ページなし、比較ページは 403) | — | — | — |

**デスクトップの NBC GB7 ÷ チャート**は、ST が中央値 **1.052**(範囲 1.017〜1.098、16 SKU)、MT が中央値 **1.090**(1.006〜1.234)。どちらも 1 よりやや大きい。NBC が選んで載せる 1 件の投稿は、チャートの平均より 5% ほど高い傾向がある(選び方の偏り)。モバイルの比較は、この +5% を差し引いて読む必要がある。

## 3. (b) チャート比・モデル比

推定の方法は 2 つ。
- **方法 A(NBC GB7 を直接使う)**: NBC GB7 の最大 ÷ チャート。ただしほぼ n=1 の (G) で、デスクトップでも +5% ある。
- **方法 B(GB6 のラボ値を使う間接推定)**: 「最良条件に相当する GB7」を、同じ uarch のデスクトップの k(= チャート GB7 ÷ NBC GB6)× モバイルの NBC GB6 ラボ中央値 で出す [推定]。デスクトップではチャートが母集団の偏りを持たないと仮定し、GB7 ÷ GB6 の比はモバイルでもデスクトップと同じと仮定している。
  - k の参照先: Zen 5 → 9700X(0.892)。Zen 4 → 7700(0.884)。Zen 3 / 3+ → 5800X(0.906)。Raptor Cove → 14700K(0.878)。Lion Cove → 265K(0.887)。
  - 代用(同じ uarch のデスクトップが無いもの): Redwood Cove(185H)は 14700K で代用。Cougar Cove(Panther)は 265K で代用。どちらも [推定]。

### 3.1 ST

| SKU | チャート | モデル | NBC GB7 最大 | NBC7÷チャート | モデル÷NBC7 | 推定(方法 B) | 推定÷チャート(母集団の偏り) | モデル÷チャート | モデル÷推定(説明できない残り) | 偏りで説明できる割合※ |
|---|---|---|---|---|---|---|---|---|---|---|
| HX 370 | 2350 | 2780 | 2784 (G, ミニ PC) | 1.185 | 0.999 | 2567 | 1.093 | 1.183 | **1.083** | 53% |
| AI 7 350 | 2116 | 2695 | 2567 (G) | 1.213 | 1.050 | 2547 | 1.204 | 1.274 | **1.058** | 77% |
| Max+ 395 | 2423 | 2802 | 2698 (G) | 1.113 | 1.039 | 2616 | 1.079 | 1.156 | **1.071** | 53% |
| 7840HS | 2037 | 2360 | 2409 (G) | 1.183 | 0.980 | 2335 | 1.146 | 1.159 | 1.011 | 93% |
| 7735HS | 1737 | 2112 | 1897 (G) | 1.092 | 1.113 | 1892 | 1.089 | 1.216 | **1.116** | 44% |
| 5800U | 1505 | 1971 | GB7 なし | — | — | 1690(GB6 は (G) n=1 で弱い) | 1.123 | 1.310 | **1.166** | 43% |
| 185H | 1850 | 2196 | 2222 (L, ミニ PC) | 1.201 | 0.988 | 2187(k は代用) | 1.182 | 1.187 | 1.004 | 98% |
| 14700HX | 2156 | 2538 | 2579 (G) | 1.196 | 0.984 | 2533 | 1.175 | 1.177 | 1.002 | 99% |
| 256V | 2017 | 2347 | 2504 (L, ミニ PC) | 1.241 | 0.937 | 2446 | 1.212 | 1.164 | 0.960 | 127%(説明しすぎ) |
| 258V | 2096 | 2347 | 2433 (L) | 1.161 | 0.965 | 2443 | 1.166 | 1.120 | 0.961 | 136%(説明しすぎ) |
| 268V | 2134 | 2438 | 2586 (G) | 1.212 | 0.943 | 2523 | 1.182 | 1.142 | 0.966 | 126%(説明しすぎ) |
| 275HX | 2425 | 2700 | 2810 ([二次]) | 1.159 | 0.961 | 2715 | 1.120 | 1.113 | 0.995 | 105% |
| 358H ※2 | 2520 | 2679 | 2578 | 1.023 | 1.039 | 2539(k は代用) | 1.008 | 1.063 | **1.055** | 12% |
| 378H ※2 | 2600 | 2783 | 2457 (G) | 0.945 | 1.133 | 2586(GB6 は (G) n=1) | 0.995 | 1.070 | **1.076** | ≈0% |
| 386H ※2 | 2560 | 2731 | 2657 (L) | 1.038 | 1.028 | 2564 | 1.002 | 1.067 | **1.065** | ≈3% |
| 388H ※2 | 2515 | 2835 | 2668 (G) | 1.061 | 1.063 | 2682(GB6 ラボ n=2) | 1.067 | 1.127 | **1.057** | 54% |
| 8cx Gen 3 ※2 | 1315 | 1189 | 1442 (G) | 1.097 | 0.825 | 対になるデスクトップなし | — | 0.904 | — | 対象外(モデルの方が低い) |

※ 割合 = ln(推定÷チャート) ÷ ln(モデル÷チャート)。モデルの超過分(対数)のうち、母集団の偏りで説明できる分。
※2 チャートの区分が「直近25件の中央値」の SKU。

集計(チャート区分が「チャート」の 12 SKU、5800U を含む):
- 推定÷チャート: 中央値 **1.156**(1.079〜1.212)。
- NBC7÷チャート(11 SKU): 中央値 **1.185**(1.092〜1.241)。デスクトップの選び方の偏り 1.052 を差し引くと **約 1.13**。
- モデル÷チャート: 中央値 1.171。
- 全体では、モデルの超過分の **約 9 割**(ln1.156 ÷ ln1.171)が母集団の偏りで説明できる。

「直近25件の中央値」の Panther Lake 4 SKU は、推定÷チャートが 0.995〜1.067 で、偏りがほぼ無い。

### 3.2 MT(参考)

| SKU | チャート | モデル | NBC GB7 最大 | NBC7÷チャート | モデル÷NBC7 | 推定(方法 B。同じコア数のデスクトップで k を取れたものだけ) | 推定÷チャート | モデル÷推定 |
|---|---|---|---|---|---|---|---|---|
| HX 370 | 15014 | 11357 | 17515 | 1.167 | **0.648** | 12 コアの対が無い | — | — |
| AI 7 350 | 11354 | 9508 | 14103 | 1.242 | 0.674 | 13772(k = 9700X) | 1.213 | **0.690** |
| Max+ 395 | 20787 | 20887 | 23028 | 1.108 | 0.907 | 21531(k = 9950X。GB6 の出典リンクなし) | 1.036 | 0.970 |
| 7840HS | 11886 | 11590 | 14749 | 1.241 | 0.786 | 12932(k = 7700) | 1.088 | 0.896 |
| 7735HS | 8279 | 8394 | 9377 | 1.133 | 0.895 | 10903(k = 5800X。GB6 は (G)) | 1.317 | 0.770 |
| 5800U | 6368 | 7906 | — | — | — | 8880(GB6 は (G) n=1) | 1.395 | 0.890 |
| 185H | 11557 | 12507 | 14628 | 1.266 | 0.855 | — | — | — |
| 14700HX | 14420 | 14341 | 19414 | 1.346 | 0.739 | 17173(k = 14700K) | 1.191 | 0.835 |
| 256V / 258V / 268V | 8971 / 9227 / 9389 | (モデル MT は NA) | 11349 / 10821 / 11552 | 1.265 / 1.173 / 1.230 | — | — | — | — |
| 275HX | 20507 | NA | 24763 | 1.208 | — | — | — | — |
| 358H / 378H / 386H | 16120 / 17300 / 17540 | 16129 / 17121 / 16764 | 17804 / 15980 / 18852 | 1.104 / 0.924 / 1.075 | 0.906 / 1.071 / 0.889 | — | — | — |
| 8cx Gen 3 | 6722 | 5555 | 6912 | 1.028 | 0.804 | — | — | — |

モバイルの MT の NBC7÷チャートは、中央値 **1.23**(「チャート」区分の 11 SKU)。デスクトップは 1.09。MT のチャート値も、最良条件より低い。

### 3.3 デスクトップのモデル値(対照)

モデル ÷ NBC GB7 の ST は 0.889〜1.022(中央値 約 0.95)。モデル ÷ チャートの ST は −3%〜+3% の SKU が大半(例外は Zen+ と 5950X)。デスクトップのモデルはチャートに合っており、NBC が選んだ投稿より約 5% 低い。

## 4. (c) 結論と根拠の強さ

**仮説はおおむね支持される(根拠の強さ: 中)。**

1. **モバイルのチャート値は、最良条件の実測より低い。デスクトップでは、この偏りは小さい。**
   - 2 つの独立に近い方法で、同じ向き・同じ大きさの結果が出た。
     - 方法 A: NBC GB7 ÷ チャートが、モバイル 1.185 に対してデスクトップ 1.052。差はモバイル特有の約 +13%。
     - 方法 B: GB6 のラボ値(n=5〜30 の [実測])から出した推定 ÷ チャートが、中央値 1.156。
   - **偏りは、公式チャート(全投稿の平均)の区分に限って現れる。**「直近25件の中央値」の Panther Lake には偏りがほぼ無い(1.00〜1.07)。
   - NBC ラボの ST はラボ内の差が小さい(2〜8%)。チャートとの差は、機体の個体差より、測定条件と母集団の違いによると考えられる。
2. **モデルの ST 誤差のうち説明できる分**(uarch ごと):
   - Intel の Redwood Cove(185H)、Raptor Cove(14700HX)、Lion Cove(275HX): ほぼ 100% 説明できる。残りは ±0.5%。
   - Lunar Lake(256V / 258V / 268V): 説明しすぎになる。モデルは最良条件より 3〜4% **低い**。
   - Zen 4(7840HS): 93% 説明できる(残り +1%)。
   - **Zen 5 モバイル(HX 370 / 350 / 395): 半分〜3/4 だけ説明できる。残りは +5.8〜+8.3%。**
   - **Zen 3 / Zen 3+(5800U / 7735HS): 4 割強だけ説明できる。残りは +11.6〜+16.6%。** 5800U は GB6 が (G) の n=1 なので弱い。
   - **Panther Lake: チャートに偏りが無いので、ほとんど説明できない。残りは +5.5〜+7.6%。** k が Lion Cove からの代用なので弱い。
   - 8cx Gen 3: 誤差の向きが逆(モデルが −10%)。仮説とは無関係。
3. 背景にあった「NBC 実測 ≈ モデル」という一致は、そのまま根拠にはならない。
   - HX 370 の NBC 2784 は Geekbench Browser の転載で、機体は高 TDP のミニ PC。デスクトップと同じ選び方の偏り(+5%)も入っている。
   - GB6 のラボ中央値から推定した最良条件は 2567 で、モデル(2780)はこれより 8% 高い。
   - Zen 5 モバイルについては、「モデルが最良条件に近い」は半分しか正しくない。
4. **MT への含意(副次的な発見)**: チャートの MT も、最良条件より 10〜30% 低い。モバイルの MT が、モデルとチャートでほぼ一致している SKU がある(7840HS、7735HS、14700HX、395)。これは、モデルが最良条件より低い誤差と、チャートの母集団の偏りが打ち消し合っている可能性がある。モデル÷NBC7 は 0.65〜0.91、モデル÷推定は 0.69〜0.97。HX 370 と 350 の MT は、チャートに対してもさらに大きく下回っている。

根拠が弱い点:
- (i) NBC GB7 は 1 SKU につき 1〜2 件しかない。多くは (G) で、電力設定と日付がわからない。
- (ii) 方法 B は、GB7 ÷ GB6 の比がモバイルとデスクトップで同じと仮定している。LPDDR5X と DDR5 の違いや、GB7 で新しくなったワークロードのメモリ感度の違いは検証していない。
- (iii) NBC の GB6 欄の行には 6.2.1〜6.7.1 が混在している。デスクトップの参照値は主に 6.2.1。
- (iv) デスクトップの GB6 参照値は、多くが n=1。
- (v) NBC の GB7 ラボ機には、ミニ PC(185H、256V、358H)が多い。
- (vi) Kraken 350 のチャート値は「検索要約(原ページ未確認)」。

## 5. (d) 未取得

- GB7 が NBC に無い SKU: 5800U(GB6 は Geekbench Browser 転載の 1 件だけ)、5600X(デスクトップ対照)。
- Core Ultra 9 285K: NBC CPU ページが無く(レビューに飛ぶ)、比較ページは 403。
- (G) の行の電力設定・日付・電源の状態: リンク先が Geekbench Browser のため取得不可。
- NBC ラボの GB7 値: レビュー本文では確認できなかった(本文のグラフは GB6.7 まで)。CPU ページの DB の記載だけ。
- 275HX の GB7 行の測定元: リンク先が lenovo.com で、測定元が不明。
- GB7 の Geekbench 公式チャートの標本数 n: gb7-scores.js に記載が無い(「チャート」区分は全 SKU で n=null)。
- NBC の測定方針(電源・プロファイル)の原文: 未確認。
- スマートフォン SoC(kind = mobile): 対象外(後回し)。

## 6. 取得した NBC CPU ページ(2026-11-01、curl、HTTP 200)

モバイル:
- [5800U](https://www.notebookcheck.net/AMD-Ryzen-7-5800U-Processor-Benchmarks-and-Specs.510374.0.html)
- [7735HS](https://www.notebookcheck.net/AMD-Ryzen-7-7735HS-Processor-Benchmarks-and-Specs.681410.0.html)
- [7840HS](https://www.notebookcheck.net/AMD-Ryzen-7-7840HS-Processor-Benchmarks-and-Specs.680876.0.html)
- [HX 370](https://www.notebookcheck.net/AMD-Ryzen-AI-9-HX-370-Processor-Benchmarks-and-Specs.836729.0.html)
- [AI 7 350](https://www.notebookcheck.net/AMD-Ryzen-AI-7-350-Processor-Benchmarks-and-Specs.949825.0.html)
- [Max+ 395](https://www.notebookcheck.net/AMD-Ryzen-AI-Max-395-Processor-Benchmarks-and-Specs.942323.0.html)
- [185H](https://www.notebookcheck.net/Intel-Core-Ultra-9-185H-Processor-Benchmarks-and-Specs.783353.0.html)
- [14700HX](https://www.notebookcheck.net/Intel-Core-i7-14700HX-Processor-Benchmarks-and-Specs.790522.0.html)
- [256V](https://www.notebookcheck.net/Intel-Core-Ultra-7-256V-Processor-Benchmarks-and-Specs.892554.0.html)
- [258V](https://www.notebookcheck.net/Intel-Core-Ultra-7-258V-Processor-Benchmarks-and-Specs.892883.0.html)
- [268V](https://www.notebookcheck.net/Intel-Core-Ultra-7-268V-Processor-Benchmarks-and-Specs.883668.0.html)
- [275HX](https://www.notebookcheck.net/Intel-Core-Ultra-9-275HX-Processor-Benchmarks-and-Specs.943094.0.html)
- [358H](https://www.notebookcheck.net/Intel-Core-Ultra-X7-358H-Processor-Benchmarks-and-Specs.1196614.0.html)
- [378H](https://www.notebookcheck.net/Intel-Core-Ultra-X9-378H-Processor-Benchmarks-and-Specs.1273309.0.html)
- [386H](https://www.notebookcheck.net/Intel-Core-Ultra-9-386H-Processor-Benchmarks-and-Specs.1196560.0.html)
- [388H](https://www.notebookcheck.net/Intel-Core-Ultra-X9-388H-Processor-Benchmarks-and-Specs.1148259.0.html)
- [8cx Gen 3](https://www.notebookcheck.net/Qualcomm-Snapdragon-8cx-Gen-3-Processor-Benchmarks-and-Specs.652916.0.html)

デスクトップ:
- [9700X](https://www.notebookcheck.net/AMD-Ryzen-7-9700X-Processor-Benchmarks-and-Specs.862076.0.html)
- [9950X](https://www.notebookcheck.net/AMD-Ryzen-9-9950X-Processor-Benchmarks-and-Specs.846059.0.html)
- [7700](https://www.notebookcheck.net/AMD-Ryzen-7-7700-Processor-Benchmarks-and-Specs.680211.0.html)
- [7950X](https://www.notebookcheck.net/AMD-Ryzen-9-7950X-Processor-Benchmarks-and-Specs.666269.0.html)
- [5800X](https://www.notebookcheck.net/AMD-Ryzen-7-5800X-Processor-Benchmarks-and-Specs.508450.0.html)
- [5600X](https://www.notebookcheck.net/AMD-Ryzen-5-5600X-Processor-Benchmarks-and-Specs.508454.0.html)
- [5950X](https://www.notebookcheck.net/AMD-Ryzen-9-5950X-Processor-Benchmarks-and-Specs.508463.0.html)
- [12600K](https://www.notebookcheck.net/Intel-Core-i5-12600K-Processor-Benchmarks-and-Specs.589007.0.html)
- [12700K](https://www.notebookcheck.net/Intel-Core-i7-12700K-Processor-Benchmarks-and-Specs.589006.0.html)
- [12900K](https://www.notebookcheck.net/Intel-Core-i9-12900K-Processor-Benchmarks-and-Specs.589001.0.html)
- [13600K](https://www.notebookcheck.net/Intel-Core-i5-13600K-Processor-Benchmarks-and-Specs.666493.0.html)
- [13700K](https://www.notebookcheck.net/Intel-Core-i7-13700K-Processor-Benchmarks-and-Specs.768845.0.html)
- [13900K](https://www.notebookcheck.net/Intel-Core-i9-13900K-Processor-Benchmarks-and-Specs.666495.0.html)
- [14600K](https://www.notebookcheck.net/Intel-Core-i5-14600K-Processor-Benchmarks-and-Specs.790507.0.html)
- [14700K](https://www.notebookcheck.net/Intel-Core-i7-14700K-Processor-Benchmarks-and-Specs.790506.0.html)
- [14900K](https://www.notebookcheck.net/Intel-Core-i9-14900K-Processor-Benchmarks-and-Specs.790504.0.html)
- [265K](https://www.notebookcheck.net/Intel-Core-Ultra-7-265K-Processor-Benchmarks-and-Specs.1134077.0.html)

GB6 ラボ行の個々の機体レビュー URL は、上の CPU ページの明細表から辿れる。§2.2 の最大・最小の機体は、各 CPU ページの GB6 明細にある NBC レビューへのリンクで確認した。
