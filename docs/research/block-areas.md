# ダイ内ブロック面積の調査(フロアプラン縮尺用)

調査日: 2026-10-31。目的: 3D/2D フロアプランのブロック縮尺を現実に近づけるため、ダイ内ブロックの面積・面積比を集める。

## 区分と表記のルール

- 区分は [実測] > [公表] > [二次] > [推定] / 未取得。
  - [実測]: このプロジェクトで自分で測った値。今回は該当なし。
  - [公表]: メーカーの発表資料の値(ISSCC / Hot Chips のスライド、メーカーが SlideShare に上げた資料など)。
  - [二次]: 第三者の値(Locuza、Fritzchens Fritz、Wikipedia、報道記事など)。
  - [推定]: 上の値からこの文書で計算した値(差し引き・合算・比率)。式を書く。
- 「検索要約(原ページ未確認)」: Web 検索の要約にしか出てこず、原ページで確認していない値。
- 「取得不可」: 403 などで取得できなかったページ。回避はしていない。
- amd.com は取得していない(2026-11-06 更新: amd.com は Chrome の通常閲覧なら取得できる)。AMD の資料は AMD 自身の SlideShare アカウントにあるもののみ使った。
- 「ダイに占める %」は、その表の「ダイ全体」の行で割った値で、[推定](この文書での計算)。
- 注釈画像から自分で目測した値はない(画像は開いていない)。ユーザーの目測値は「ユーザー目測」と明記する。

### 主な出典(略号)

| 略号 | URL | 状態 |
|---|---|---|
| LZ-ADL | https://locuza.substack.com/p/die-walkthrough-alder-lake-sp-and | 取得済み(Locuza の Alder Lake-S/P と Zen 3 のダイ解説) |
| LZ-RPL | https://locuza.substack.com/p/info-snack-alder-lake-m-raptor-lake | 取得済み(Raptor Lake-S の寸法と配置の想像図) |
| TPU-12900K | https://www.techpowerup.com/review/intel-core-i9-12900k-alder-lake-12th-gen/2.html | **取得不可(403)**。ユーザー提示の 12900K 注釈画像の出典 |
| WCCF-RPL | https://wccftech.com/intel-raptor-lake-core-i9-13900k-gets-high-res-beautiful-cpu-die-shot/amp/ | 取得済み(Fritzchens Fritz の測定値を転載) |
| AMD-Z3 | https://www.slideshare.net/slideshow/zen-3-amd-2nd-generation-7nm-x8664-microprocessor-core/251610640 | 取得済み(AMD の Zen 3 発表資料) |
| AMD-Z2 | https://www.slideshare.net/AMD/zen-2-the-amd-7nm-energyefficient-highperformance-x8664-microprocessor-core | 取得済み(AMD の ISSCC 2020 Zen 2 資料) |
| AT-Z2 | https://dalebulizo.pages.dev/amd-zen-2-microarchitecture-analysis-ryzen-3000-and-epyc-rome | 取得済み(AnandTech の Zen 2 解説記事の転載。元記事は at-web1.www.anandtech.com/show/14525/.../5) |
| MYNAVI-ZEN | https://news.mynavi.jp/article/20170302-ryzen/2 | 取得済み(ISSCC 2017 の Zen 解説) |
| SA-Z4C | https://newsletter.semianalysis.com/p/zen-4c-amds-response-to-hyperscale | 取得済み(ISSCC の Zen 4 / Zen 4c の数値) |
| FF-Z5 | https://commons.wikimedia.org/wiki/File:AMD@4nmCCD(6nmIOD)@Zen5@Granite_Ridge@Ryzen_5_9600X@100-000001405_BY_2429SUY_9AEQ579S40073_DSCx14_CCD_poly@5xExt.jpg | 取得済み(Fritzchens Fritz の Ryzen 5 9600X CCD 写真。説明欄に測定値あり) |
| SA-MTL | https://newsletter.semianalysis.com/p/meteor-lake-die-shot-and-architecture | 取得済み |
| WCCF-PTL | https://wccftech.com/intel-panther-lake-compute-tile-die-shot-18a-next-gen-cougar-cove-p-darkmont-e-cores/ | 取得済み(Game.Keeps.Loading の測定を転載) |
| PH-PTL | https://pausehardware.com/intel-panther-lake-h-die-annote/ | 取得済み |
| WP-ARL | https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor) | 取得済み |
| WP-LNL | https://en.wikipedia.org/wiki/Lunar_Lake | 取得済み |
| PCGH-STX | https://www.pcgameshardware.de/CPU-CPU-154106/News/AMD-Strix-Point-Die-Shot-Ryzen-AI-300-veroeffentlicht-beschriftet-1452626/ | 取得済み |
| WCCF-X | https://wccftech.com/snapdragon-x-elite-die-shot-compared-with-apple-m4 | 取得済み(MyDrivers の記事を転載。画像は Chipwise) |

取得不可だったページ: techpowerup.com の記事はすべて 403(298338 Zen 4 ダイ、305485 Zen 4 IOD、12900K レビュー)。guru3d.com の Arrow Lake 記事も 403。en.wikichip.org と fuse.wikichip.org は接続拒否。hothardware の Zen 4 IOD 記事は 522。tomshardware.com の 3 記事(13900K ダイ、Arrow Lake ダイ、5600G ダイ)は本文が取れなかった。

---

## 1. Intel

### 1-1. Alder Lake-S 8P+8E(Core i9-12900K、C0 ダイ)

ダイの寸法: 20.4 × 10.2 mm = 208.08 mm² [二次・LZ-RPL。記事では「208.8 mm²」と書かれているが、掛け算すると 208.08 mm²]。別の値として 20.5 × 10.5 mm = 215.25 mm² [二次・WikiChip / TechPowerUp。検索要約(原ページ未確認)]。下の表は 208.08 mm² で割っている。

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| ダイ全体 | 1 | 208.08 | 208.08 | 100 | [二次] LZ-RPL |
| P コア(Golden Cove)+ L2 1.25MB + 電源ゲート帯 | 8 | 約 7.43 | 59.4 | 3.57 / 個、28.6 / 計 | [二次] LZ-ADL |
| P コア(電源ゲートなし、L2 込み) | — | 約 7.02 | — | 3.37 | [二次] LZ-ADL |
| P コア本体(L2 なし) | — | 約 5.37 | — | 2.58 | [二次] LZ-ADL(訂正後の値) |
| P コアの L2(1.25MB) | — | 約 1.65(1.646) | — | 0.79 | [二次] LZ-ADL |
| E コア(Gracemont)4 個クラスタ(共有 L2 2MB 込み) | 2 | 約 8.66 | 17.3 | 4.16 / 個、8.3 / 計 | [二次] LZ-ADL |
| E コア 1 個(L2 なし) | 8 | 1.6〜1.7 | — | 約 0.8 | [二次] LZ-ADL(測り方で変わる) |
| P コア 8 個 + L3 の複合体 | 1 | 約 84 | 84 | 40.4 | [二次] LZ-ADL |
| L3 + リングバス(P コア 8 個分) | 8 スライス | 約 3.07 | 約 24.6 | 11.8 | [推定] 84 − 59.4。3MB スライスとすると約 1.0 mm²/MB |
| iGPU(UHD 770、32EU)| 1 | 33.5 | 33.5 | 16.1 | [二次] LZ-ADL |
| PCIe 5.0 ブロック | 1 | 2.4 | 2.4 | 1.15 | [二次] LZ-ADL |
| PCIe 4.0 ブロック | 1 | 1.7 | 1.7 | 0.82 | [二次] LZ-ADL |
| 残り(システムエージェント、メモリコントローラと PHY、ディスプレイ、DMI、GNA、E コア側の L3 など) | — | — | 約 73.3 | 35.2 | [推定] 208.08 − 84 − 17.3 − 33.5 |
| (参考)Zen 3 と比べた記事内の「Alder Lake 側の構成」 | — | 90.08 | — | — | [二次] LZ-ADL。何を含むか不明なので採用しない |

**ユーザー目測との照合**(注釈画像の出典: TPU-12900K。区分 [二次]、画像はユーザーが添付したもの。ページ本文は取得不可(403)):
- P コア 1 個 ≈ 7.5 mm²(ダイの約 3.6%)→ Locuza の 7.43 mm²(コア + L2 + 電源ゲート帯、3.57%)とほぼ一致。**裏付けあり**。
- E コア 4 個クラスタ ≈ ダイ幅の約 15% × 高さの約 33% → 0.15 × 20.4 × 0.33 × 10.2 ≈ 10.3 mm²(4.95%)。Locuza の 8.66 mm²(4.16%)より約 19% 大きい。目測の枠に、クラスタの横の L3 スライスやリングの一部が入っている可能性がある [推定]。
- インテル公式のブロック面積: 未取得。インテルは「E コア 4 個で P コア 1 個とほぼ同じ面積」と言っている(Architecture Day 2021。Tom's Hardware 経由の検索要約(原ページ未確認))。Locuza の値(8.66 対 7.43)は、クラスタのほうが 1 割強大きい。

**配置**(LZ-ADL の説明とユーザー提示の注釈画像):
- 左端: ディスプレイのポート(左上)とディスプレイ制御、PCIe 4.0(上)・PCIe 5.0(下)・DMI 4.0 の I/O 列。
- その右: PCIe / DMI の制御、GNA 3.0、システムエージェント。その下にメモリコントローラ、最下段にメモリ PHY。
- 中央: P コアが上下 2 段 × 4 個。間に横長の L3 / リングバス帯。各コアの L2 はコアの下側にある(上段のコアと下段のコアで向きが逆になる)。
- P コアの右: E コアのクラスタが上下に 1 個ずつ。
- 右端: 縦長の iGPU。

### 1-2. Raptor Lake-S 8P+16E(Core i9-13900K、B0 ダイ)

ダイの寸法: 23.8 × 10.8 mm = 257.04 mm²(Expreview が殻割りした i9-13900 の実物を測った値)[二次・LZ-RPL。TechPowerUp の同じ値は検索要約]。別の値として 252.65 mm²(Fritzchens Fritz)[二次・WCCF-RPL。記事本文では 252 mm²]。下の表は 257.04 mm² で割っている。

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| ダイ全体 | 1 | 257.04 | 257.04 | 100 | [二次] LZ-RPL |
| P コア(Raptor Cove)「新しい L2 なし」 | — | 7.429 | — | 2.89 | [二次] WCCF-RPL(Fritzchens Fritz)。何を含むかがあいまい(下の「食い違い」を参照) |
| P コア + L2 2MB | 8 | 8.080 | 64.6 | 3.14 / 個、25.1 / 計 | [二次] WCCF-RPL |
| P コア + L2 + L3 の取り分(リング込み) | 8 | 10.068 | 80.5 | 3.92 / 個、31.3 / 計 | [二次] WCCF-RPL |
| L3 スライス(3MB)+ リングストップ | 8 | 約 1.99 | 約 15.9 | 6.2 / 計 | [推定] 10.068 − 8.080。約 0.66 mm²/MB |
| E コア(Gracemont)1 個(L2 なし) | 16 | 1.588 | — | 0.62 | [二次] WCCF-RPL |
| E コア 1 個(クラスタ L2 4MB の 1/4 込み) | 16 | 2.570 | — | 1.0 | [二次] WCCF-RPL |
| E コア 4 個クラスタ(L2 込み) | 4 | 約 10.3 | 約 41.1 | 4.0 / 個、16.0 / 計 | [推定] 2.570 × 4 |
| iGPU(UHD 770、32EU) | 1 | 未取得 | — | — | Alder Lake-S と同じ GPU なら 33.5 mm²(13.0%)[推定] |
| Uncore / メモリ / IO | — | 未取得 | — | — | — |

**配置**: Alder Lake-S の配置を右に伸ばした形。P コア 8 個(4 個 × 上下 2 段)の間に L3。E コアのクラスタは 4 個で、各クラスタの L2 は外側、L3 は中央側にある [二次・WCCF-RPL]。Locuza は事前の想像図で「Alder Lake-S に E コアクラスタ 2 個と L2 の分の高さを足したもの」と説明している [二次・LZ-RPL。想像図]。

### 1-3. Raptor Lake の 6P+8E ダイ

- デスクトップの 6P+8E 品(13600K / 13400 など)は、Alder Lake の C0 ダイ(8P+8E の一部を無効化)か、Raptor Lake の B0 ダイ(8P+16E の一部を無効化)を使う。専用の 6P+8E ダイがあるという出典は**未取得**。
- 6P+8E の実ダイとしては Alder Lake-P(モバイル)がある。面積は 217.18 mm²(WikiChip。検索要約(原ページ未確認))。
  - Thunderbolt 4: 約 10.23 mm²(約 4.7%)[二次・LZ-ADL]
  - 配置: 左上に Thunderbolt 4 のポート 4 個、右上にパッケージ内の PCH との接続。左の上〜中段にディスプレイエンジン(第 13 版)、左の中段に PCIe(4.0 x4 が 2 個、5.0 x8 が 1 個)、その下に IPU、最下段にメモリ PHY。右側に GPU(96EU)。P コア 6 個と E コアクラスタ 2 個 [二次・LZ-ADL]。
  - コアと GPU の面積: 未取得(Alder Lake-S と同じコアなら、P コアは 7.43 mm²、クラスタは 8.66 mm² [推定])。

### 1-4. Alder Lake-S 6P+0E(H0 ダイ、12100 / 12400 系)

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| ダイ全体(10.5 × 15.5 mm) | 1 | 162.75 | 162.75 | 100 | [二次] TechPowerUp。検索要約(原ページ未確認) |
| P コア + L2(C0 ダイと同じと仮定) | 6 | 7.43 | 44.6 | 27.4 | [推定] LZ-ADL の値を流用 |
| iGPU(C0 ダイと同じと仮定) | 1 | 33.5 | 33.5 | 20.6 | [推定] |
| E コア | 0 | — | — | — | H0 ダイには E コアのクラスタがない(検索要約) |

配置: C0 ダイから E コアのクラスタ列と P コア 2 個分を除いた形と思われる [推定]。注釈図は未取得。なお、寸法が C0 ダイの 10.5 mm 系(WikiChip 系)に合わせてあるので、Locuza の 10.2 mm 系とは比べられない。

### 1-5. Meteor Lake(コンピュートタイル)

| ブロック | 1 個の面積 mm² | 区分・出典 |
|---|---|---|
| コンピュートタイル(2P+8E 版、記事の説明より) | 約 40 | [二次] SA-MTL |
| SoC タイル | 約 94.9 | [二次] SA-MTL |
| IO タイル | 10 | [二次] SA-MTL |
| GPU タイル | 約 23 | [二次] SA-MTL |
| 何のダイか記事に書かれていない値 | 約 174 | [二次] SA-MTL |
| Redwood Cove の P コア(私的キャッシュ込み) | 5.33 | [二次] WCCF-PTL の比較表(Game.Keeps.Loading) |
| Crestmont の E コア 1 個 | 1.04 | [二次] WCCF-PTL |
| Crestmont の 4 個クラスタ | 5.90 | [二次] WCCF-PTL |
| 面積比: Golden Cove と比べて P コア −25.2%、E コアクラスタ −29% | — | [二次] SA-MTL |

配置: コンピュートタイルでは P コア、E コアクラスタ、L3 がリングでつながる。それ以上の配置: 未取得。

### 1-6. Arrow Lake-S(Core Ultra 200S)

| タイル | 面積 mm² | 区分・出典 |
|---|---|---|
| コンピュート(TSMC N3B) | 117.241 | [二次] WP-ARL |
| GPU(N5P) | 23 | [二次] WP-ARL |
| SoC(N6) | 86.648 | [二次] WP-ARL |
| IO 拡張(N6) | 24.475 | [二次] WP-ARL |
| ベース(Intel 16 / 22FFL 系) | 302.944 | [二次] WP-ARL |
| Lion Cove / Skymont のコア面積 | 未取得 | Arrow Lake での測定値なし(参考値として Lunar Lake の値を使う) |

配置: P コア 8 個のうち 4 個が両端、4 個が中央。その間に Skymont のクラスタ 4 個 [二次。TechPowerUp(HighYield の注釈)と 3DNews、検索要約(原ページ未確認)]。

### 1-7. Lunar Lake

| ブロック | 面積 mm² | 区分・出典 |
|---|---|---|
| コンピュートタイル(N3B) | 140(または 8.58 × 16.27 = 139.6) | [二次] WP-LNL。寸法は reddit(Kurnal の注釈図)、検索要約(原ページ未確認) |
| プラットフォームコントローラタイル(N6) | 46 | [二次] WP-LNL |
| Lion Cove(L2 込み) | 4.45 / 4.53 | [二次] WCCF-PTL の比較表 / reddit、検索要約(原ページ未確認) |
| Lion Cove(L2 なし?) | 約 3.05 | AnandTech フォーラム、検索要約(原ページ未確認)。[推定]にも満たない |
| Skymont 1 個 | 1.09(L2 込みなら 1.73、L2 なしなら約 1.05) | [二次] WCCF-PTL / reddit・AT フォーラム、検索要約(原ページ未確認) |
| Skymont の 4 個クラスタ | 6.79 | [二次] WCCF-PTL |
| iGPU(Xe2) + ディスプレイ + メディア | コンピュートタイルの約 1/3 | 検索要約(原ページ未確認) |
| NPU | 未取得(中央の大きな部分という記述のみ) | 検索要約(原ページ未確認) |

### 1-8. Panther Lake-H

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | タイルに占める % | 区分・出典 |
|---|---|---|---|---|---|
| コンピュートタイル(Intel 18A、14.32 × 8.04 mm) | 1 | 115 | 115 | 100 | [二次] PH-PTL |
| GPU タイル(N3E、12 Xe、8.14 × 6.78 mm) | 1 | 55.18 | — | — | [二次] PH-PTL |
| IO / プラットフォームコントローラタイル(N6、12.44 × 4 mm) | 1 | 49.76 | — | — | [二次] PH-PTL |
| Cougar Cove の P コア(私的キャッシュ込み) | 6 | 約 4.49 | 約 26.9 | 23.4 | [二次] WCCF-PTL(暫定値)。合計と % は [推定] |
| Darkmont の E コア 1 個 | — | 約 0.95 | — | — | [二次] WCCF-PTL の表(本文の箇条書きの値と食い違う) |
| Darkmont の 4 個クラスタ | 2 | 約 6.47 | 約 12.9 | 11.3 | [二次] WCCF-PTL。合計と % は [推定] |
| L3 18MB、LP E コア 4 個、NPU 5、メモリ側キャッシュ 8MB | — | 未取得 | — | — | PH-PTL は構成のみ |

注意: WCCF-PTL の写真は「P コア 2 個 + E コアクラスタ 3 個」の構成で、PH-PTL の 6P+8E+4LPE とは別の構成。上の表は、別の出典の値を組み合わせた [推定] である。

---

## 2. AMD

### 2-1. Zen 1 Zeppelin(Summit Ridge)/ Zen+ Pinnacle Ridge

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| ダイ全体 | 1 | 213 | 213 | 100 | [二次] AT-Z2(Zen+ の Zeppelin を 213 mm² としている)。複数の検索要約でも同じ値。MYNAVI-ZEN の事前の見積もりは約 206 [推定] |
| CCX(コア 4 個 + L3 8MB) | 2 | 44 | 88 | 20.7 / 個、41.3 / 計 | [公表] AMD-Z2(「Area/CCX 44 mm²(14nm)」)。MYNAVI-ZEN も「4 コア + L3 で 44 mm²」 |
| コア + L2 512KB | 8 | 約 7 | 約 56 | 3.3 / 個 | ISSCC 2017 の論文要旨。検索要約(原ページ未確認) |
| L3 8MB(1 CCX 分) | 2 | 約 16 | 約 32 | 7.5 / 個 | [推定] 44 − 7 × 4 = 16(約 2 mm²/MB)。AT-Z2 の「コア 44 + L3 16」とは数え方が違う(下の「食い違い」を参照) |
| IO / Infinity Fabric / メモリ / PCIe など | — | — | 約 125 | 約 59 | [推定] 213 − 88 |

Pinnacle Ridge(Zen+、12nm)も同じ 213 mm² のダイ(配置は同じ)[二次・AT-Z2]。配置: CCX 2 個を中央に置き、周りを DDR4 PHY、PCIe / xGMI の SerDes が囲む。配置の詳細は未取得。

### 2-2. Zen 2 CCD(Matisse / Rome)

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| CCD | 1 | 74 | 74 | 100 | [二次] AT-Z2。WikiChip の値も同じ(検索要約) |
| CCX(コア 4 個 + L3 16MB) | 2 | 31.3 | 62.6 | 42.3 / 個、84.6 / 計 | [公表] AMD-Z2 |
| コア | 8 | 2.83 | — | 3.8 | WikiChip、検索要約(原ページ未確認)。L2 込みかどうかは不明 |
| L3 16MB | 2 | 未取得 | — | — | AT-Z2 は「CCX の 50% 近くかもしれない」と推測しているだけ |
| cIOD(12nm、Zen 3 と同じもの) | 1 | 125 | — | — | [公表] AMD-Z3 |
| sIOD(サーバー用) | 1 | 416 | — | — | [公表] AMD-Z3 |

### 2-3. Zen 3 CCD(Vermeer)と 12nm IOD

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| CCD | 1 | 81 | 81 | 100 | [公表] AMD-Z3。ほかに 80.7(ユーザー)、83.736(検索要約) |
| CCX(コア 8 個 + L3 32MB) | 1 | 68 | 68 | 84.0 | [公表] AMD-Z3 |
| コア(電源バンク込み、L2 なし) | 8 | 3.24 | — | 4.0 | [二次] LZ-ADL |
| コア(電源バンクなし) | — | 3.09 | — | 3.8 | [二次] LZ-ADL |
| L2 512KB | 8 | 0.70〜0.81 | — | 約 0.9〜1.0 | [二次] LZ-ADL(記事内で 0.81 / 0.77 / 0.704 の 3 つの値) |
| コア + L2 | 8 | 約 4.05 | 約 32.4 | 5.0 / 個、40 / 計 | [推定] 3.24 + 0.81(ユーザーの 4.04 とほぼ一致) |
| L3 32MB + リング | 1 | 約 35.6 | 約 35.6 | 44 | [推定] 68 − 32.4(約 1.1 mm²/MB) |
| CCX の外(IFOP、SMU、TSV 帯など) | — | — | 約 13 | 16 | [推定] 81 − 68 |
| (参考)TSV 帯を除いた CCD | — | 64.78 | — | — | [二次] LZ-ADL。何を除いたかはあいまい |
| cIOD(GF 12nm) | 1 | 125 | — | — | [公表] AMD-Z3 |
| Cezanne(モノリシック APU) | 1 | 180 | — | — | [公表] AMD-Z3 |

配置(Zen 3 CCD): 中央の縦の L3 帯の両側に、コアが 4 個ずつ縦に並ぶ(コア 8 個が L3 を共有)。コアの左右に電源バンクがある [二次・LZ-ADL]。全体の配置図は未取得。Cezanne のブロック面積: 未取得(Locuza の注釈図はあるが、取れなかった)。

### 2-4. Zen 4 CCD と 6nm IOD

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| CCD(シールリングとスクライブ線を除く設計面積) | 1 | 66.3 | 66.3 | 100 | [公表] ISSCC 2023(SA-Z4C 経由) |
| CCX(コア 8 個 + L3 32MB) | 1 | 55 | 55 | 83 | ISSCC 2023 の論文要旨(aminer)。検索要約(原ページ未確認) |
| コア + L2 1MB | 8 | 約 3.84 | 約 30.7 | 5.8 / 個 | フォーラムの見積もり。検索要約(原ページ未確認)[推定以下] |
| コア(L2 なし) | 8 | 約 2.73 | — | 4.1 | 検索要約(原ページ未確認) |
| L3 32MB | 1 | 約 24.3 | — | 37 | [推定] 55 − 30.7(約 0.76 mm²/MB)。上のコア面積の信頼度が低いので、この値も低い |
| Zen 4c CCD | 1 | 72.7 | — | — | [公表] ISSCC 2024(SA-Z4C 経由)。論文要旨では 73 |
| Zen 4c のコア + L2 | — | Zen 4 より 35.4% 小さい | — | — | [公表] ISSCC 2024(SA-Z4C 経由) |
| cIOD(N6) | 1 | 124.7 | — | — | 検索要約(原ページ未確認。Guru3D / TechPowerUp(取得不可))。ユーザーの値は約 122 |
| IOD 内の GPU(RDNA2、WGP 1 個)+ ビデオ | — | IOD の 1/3 以上 | — | — | 検索要約(原ページ未確認。HotHardware、522) |

### 2-5. Zen 5 CCD(Granite Ridge)

Fritzchens Fritz が撮った Ryzen 5 9600X の CCD 写真の説明欄にある測定値 [二次・FF-Z5]。

| ブロック | 個数 | 1 個の面積 mm² | 合計 mm² | ダイに占める % | 区分・出典 |
|---|---|---|---|---|---|
| CCD(スクライブ線込み、9.037 × 7.743 mm) | 1 | 69.973 | — | — | [二次] FF-Z5 |
| CCD(スクライブ線なし、8.937 × 7.524 mm) | 1 | 67.242 | 67.242 | 100 | [二次] FF-Z5 |
| CCD(シールリングなし、8.890 × 7.476 mm) | 1 | 66.462 | — | — | [二次] FF-Z5 |
| コア(L2 なし、2.396 × 1.554 mm) | 8 | 3.723 | 29.8 | 5.5 / 個 | [二次] FF-Z5 |
| コア + L2 1MB(3.071 × 1.554 mm) | 8 | 4.772 | 38.2 | 7.1 / 個、56.8 / 計 | [二次] FF-Z5 |
| L2 1MB | 8 | 約 1.05 | — | 1.6 | [推定] 4.772 − 3.723 |
| コア + L2 + L3 の取り分(4.399 × 1.554 mm) | 8 | 6.836 | 54.7 | 10.2 / 個、81.3 / 計 | [二次] FF-Z5 |
| L3 32MB(中央の帯、2.524 × 6.216 mm) | 1 | 15.689 | 15.689 | 23.3 | [二次] FF-Z5(約 0.49 mm²/MB) |
| L3 以外の周辺(IFOP、SMU、テスト回路など) | — | — | 約 12.5 | 約 19 | [推定] 67.242 − 54.7 |
| よく引かれる CCD の面積 | — | 70.6 | — | — | 検索要約(原ページ未確認。補強材込みの値とする説あり) |

配置: 中央に縦長の L3 帯(幅 2.524 mm、高さ 6.216 mm)があり、その左右にコアが 4 個ずつ縦に並ぶ。各コアの L2 は L3 側にある(コア幅 3.071 = コア本体 2.396 + L2 0.675)[推定。寸法から]。IOD(Zen 4 と同じ N6 の cIOD)は 2-4 を参照。

### 2-6. モバイル APU

| ダイ | ダイ面積 mm² | ブロック面積 | 区分・出典 |
|---|---|---|---|
| Raven Ridge | 未取得(よく言われる 210 mm² は出典を確認できず) | 未取得。Vega が約半分という記述あり(chimolog、検索要約) | — |
| Renoir | 156 | 未取得 | 検索要約(原ページ未確認) |
| Cezanne | 180 | 未取得 | [公表] AMD-Z3 |
| Rembrandt | 未取得(ユーザーの値は 208) | 未取得 | — |
| Phoenix | 178 | 未取得 | 検索要約(原ページ未確認) |
| Phoenix 2 | 137 | 配置: 左側の中央に L3、その下に Zen 4 が 2 個、Zen 4c が 4 個、右に GPU | 検索要約(原ページ未確認。Tom's Hardware) |
| Strix Point(HX 370) | 12.06 × 18.71 mm ≈ 225.6(「226 弱」)/ 232.5 | Zen 5 は約 4.15(L2 込み)、Zen 5c は約 3.09(reddit のコメント。検索要約)。Zen 5c は Zen 5 より約 25% 小さい(TechPowerUp、検索要約)。CPU と GPU はほぼ同じ面積、NPU はそれより小さい。外部インターフェースと電源管理が大きく、未割り当ての部分が 20〜25%(フォーラムのコメント) | [二次] PCGH-STX / 232.5 は TechPowerUp(取得不可)、検索要約 |
| Strix Halo IOD | 19.18 × 16.02 mm = 307.26(307.58 とする出典もあり) | 大半が GPU(40 CU)。GPU の面積は未取得 | 検索要約(原ページ未確認) |
| Strix Halo CCD | 66.345 / 67.07 / 70.6 | Zen 5 CCD と同じ | 検索要約(原ページ未確認) |
| Kraken(Krackan)Point | 未取得 | 未取得 | 既存の調査 docs/research/kraken-point.md と同じ結論 |

Strix Point の配置: Zen 5 が 4 個と L3 16MB の CCX、Zen 5c が 8 個と L3 8MB の CCX、WGP 8 個の GPU、NPU [二次・PCGH-STX。注釈は X ユーザーの @GPUsAreMagic による推定で、AMD の確認はない]。

---

## 3. Arm SoC(優先度低)

| ダイ | ブロック | 面積 mm² | 区分・出典 |
|---|---|---|---|
| Apple M1 | ダイ全体 | 119 | WikiChip、検索要約(原ページ未確認) |
| Apple M1 | Firestorm 1 個 / P クラスタ(L2 込み) | 2.25 / 15.42 | 検索要約(原ページ未確認。転載サイトの値で信頼度は低い) |
| Apple M1 | Icestorm 1 個 | 0.6 | 同上 |
| Apple M1 | GPU コア 1 個 | 2.48 | 同上 |
| Apple M1 | SLC | 未取得 | — |
| Apple M2 / M3 | すべて | 未取得 | — |
| Apple M4 | ダイ全体 | 165.9 | [二次] WCCF-X |
| Apple M4 | P コア | 3.00(1 個か 4 個の合計かが記事からは不明) | [二次] WCCF-X |
| Snapdragon X Elite | ダイ全体(N4P) | 169.6 | [二次] WCCF-X |
| Snapdragon X Elite | CPU クラスタ 3 個(各 4 コア + L2 12MB) | 48.2(1 クラスタ 16.1) | [二次] WCCF-X / 検索要約 |
| Snapdragon X Elite | Oryon コア 1 個 | 2.55 | 検索要約(原ページ未確認) |
| Snapdragon X Elite | GPU(Adreno X1) | 24.3 | [二次] WCCF-X |
| Snapdragon X Elite | SLC 6MB | 5.09 | 検索要約(原ページ未確認) |
| Snapdragon X Elite | NPU | 未取得 | — |

---

## (a) 実装に使えるブロック面積比の一覧

信頼度: 高 = [公表] か、出典の直接の測定値。中 = [二次] の測定値を組み合わせたもの。低 = 検索要約か仮定を含む。

| ダイ | ブロック | ダイに占める比 | 信頼度 | 根拠 |
|---|---|---|---|---|
| Alder Lake-S 8+8(208 mm²) | P コア + L2(1 個) | 3.6% | 中〜高 | Locuza の 7.43 mm²。ユーザー目測と一致 |
| 同上 | P コア 8 個 + L3 / リング | 40.4% | 中 | Locuza の 84 mm² |
| 同上 | E コア 4 個クラスタ(1 個) | 4.2% | 中 | Locuza の 8.66 mm²。ユーザー目測は 4.95% |
| 同上 | iGPU | 16.1% | 中 | Locuza の 33.5 mm² |
| 同上 | 残り(Uncore / IO / メモリ / ディスプレイ) | 約 35% | 低 | 差し引き |
| Raptor Lake-S 8+16(257 mm²) | P コア + L2(1 個)/ L3 の取り分込み | 3.1% / 3.9% | 中 | Fritzchens Fritz |
| 同上 | E コア 4 個クラスタ(1 個) | 4.0% | 中 | 2.570 × 4 |
| 同上 | iGPU | 約 13% | 低 | Alder Lake の値を流用 |
| Zen 1 Zeppelin(213 mm²) | CCX(1 個) | 20.7% | 高 | AMD の 44 mm² |
| 同上 | コア + L2(1 個) | 3.3% | 低〜中 | ISSCC の 7 mm²(検索要約) |
| Zen 2 CCD(74 mm²) | CCX(1 個) | 42.3% | 高 | AMD の 31.3 mm² |
| Zen 3 CCD(81 mm²) | CCX | 84% | 高 | AMD の 68 / 81 |
| 同上 | コア + L2(1 個) | 5.0% | 中 | Locuza の合算 |
| 同上 | L3 32MB | 約 44% | 中 | 差し引き |
| Zen 4 CCD(66.3 mm²) | CCX | 83% | 中 | 55 mm²(検索要約)/ 66.3 mm²(公表) |
| 同上 | コア + L2(1 個) | 約 5.8% | 低 | フォーラムの値 |
| Zen 5 CCD(67.2 mm²) | コア + L2(1 個) | 7.1% | 高 | Fritzchens Fritz の寸法 |
| 同上 | L3 32MB | 23.3% | 高 | 同上 |
| 同上 | コア + L2 + L3 の取り分(8 個合計) | 81.3% | 高 | 同上 |
| Lunar Lake コンピュートタイル(140 mm²) | Lion Cove + L2(1 個) | 3.2% | 中 | 4.45 mm² |
| 同上 | Skymont 4 個クラスタ | 4.9% | 中 | 6.79 mm² |
| 同上 | GPU + ディスプレイ + メディア | 約 33% | 低 | 検索要約 |
| Panther Lake-H コンピュートタイル(115 mm²) | Cougar Cove(1 個)/ Darkmont クラスタ(1 個) | 3.9% / 5.6% | 中〜低 | 別構成の写真の値 |
| Snapdragon X Elite(169.6 mm²) | CPU クラスタ(1 個)/ GPU | 9.5% / 14.3% | 中〜低 | MyDrivers |

実装上の目安 [推定]: Intel のデスクトップダイでは P コア 1 個が約 3.5%、E コアクラスタ 1 個が約 4%、32EU の iGPU が約 13〜16%、左端の IO + Uncore が約 1/3。AMD の CCD はコア + L2 の合計が 40〜57%、L3 が 23〜44%(世代が新しいほど L3 の比率が下がる)、周辺が 13〜19%。

## (b) 食い違い

1. **Alder Lake-S のダイ面積**: 20.4 × 10.2 = 208.08 mm²(Locuza。記事の表記は 208.8)と、20.5 × 10.5 = 215.25 mm²(WikiChip / TechPowerUp、検索要約)。約 3.4% の差。
2. **Raptor Lake-S のダイ面積**: 257.04 mm²(Expreview の実物測定、Locuza)と 252.65 mm²(Fritzchens Fritz)。
3. **Raptor Cove の「7.429 mm²(新しい L2 なし)」**: 8.080 との差は 0.65 mm² しかなく、Alder Lake の L2 1.25MB の 1.65 mm²(Locuza)と合わない。「1.25MB の L2 を残した構成」など別の意味の可能性がある。L3 の取り分も、Raptor Lake は 1.99 mm² / 3MB、Alder Lake の差し引きは約 3.07 mm²(リングと電源帯込み)で、数え方が違う。
4. **E コアクラスタ**: ユーザー目測(約 10.3 mm²)と Locuza(8.66 mm²)。インテルの「4 個で P コア 1 個と同じ面積」とも 1 割ほど合わない。
5. **Zen 1 の 44 mm²**: AMD の資料と MYNAVI-ZEN は「コア 4 個 + L3 で 44 mm²」。AnandTech(転載)は「CCX 約 60 mm² = コア 44 + L3 16」。7 × 4 + 16 = 44 になるので、AMD の数え方(44 mm² に L3 を含む)と整合する。AnandTech の書き方は読み違いの可能性がある。
6. **Zen 3 CCD**: 81(AMD)、80.7(ユーザー)、83.736(検索要約)。Zen 3 の L2 も Locuza の記事内で 0.81 / 0.77 / 0.704 の 3 つの値がある。
7. **Zen 4 CCD**: 66.3(ISSCC の設計面積)、70 / 71 / 72(TechPowerUp、Wikipedia、フォーラム)。測り方(スクライブ線やシールリングを含むか)の違いと思われる。Zen 4 の IOD は 124.7(検索要約)と 122(ユーザー)。
8. **Zen 5 CCD**: 66.46 / 67.24 / 69.97(Fritzchens Fritz、境界の取り方の違い)と 70.6(よく引かれる値)。
9. **Strix Point**: 225.6(12.06 × 18.71)と 232.5(TechPowerUp)。
10. **Lion Cove**: 4.45 / 4.53(L2 込み)と 3.05(L2 なしと思われる)。Skymont は 1.09 / 1.73 / 1.05。
11. **Darkmont**: WCCF-PTL の本文(E コア 1.09、クラスタ 0.95)と比較表(E コア 0.95、クラスタ 6.47)。表の値を採った。
12. **Phoenix**: 178 mm² と、Phoenix の寸法とされる 9.06 × 15.01 mm(約 136 mm²。Phoenix 2 の値と思われる)。
13. **Snapdragon X Elite**: キャッシュ 54MB で約 15 mm²(Fudzilla)と、クラスタ 16.1 mm² × 3 は整合しにくい。WCCF-X は「8P+4E」と書いているが、X Elite の Oryon 12 コアはすべて同じコア(記事の誤りの可能性)。

## (c) 未取得の一覧

- インテル公式のブロック面積(Alder Lake / Raptor Lake のコア、L3、iGPU、Uncore)。
- Alder Lake-S の L3 の正味の面積、メモリコントローラと PHY、ディスプレイ、システムエージェントの個別の面積。
- Raptor Lake-S の iGPU と Uncore。専用の 6P+8E デスクトップダイがあるかどうか。
- Alder Lake H0(6P)の注釈図とブロック面積(上の表は流用した [推定])。Alder Lake-P のコアと GPU の面積。
- Meteor Lake 6P+8E 版のコンピュートタイルの面積と NPU。Arrow Lake のコア・クラスタ・L3 の面積。Lunar Lake の NPU と L3。Panther Lake の L3、NPU、LP E コア。
- Zen 1 / Zen+ の配置図、IO 部分の内訳。Zen 2 のコア + L2 と L3 の正確な面積。
- Zen 4 のコア + L2 と L3 の正確な面積(ISSCC 2023 の論文の値)。Zen 3 と Zen 4 の IOD の内訳(GPU、メモリ PHY、PCIe)。
- Raven Ridge、Rembrandt、Kraken Point のダイ面積とブロック面積。Cezanne、Phoenix、Strix Point、Strix Halo のブロック面積(GPU、NPU、L3、メモリ)。
- Apple M1 の SLC、M2 / M3 のすべて、M4 のブロック内訳。Snapdragon X Elite の NPU。
- Hot Chips 2023 の Zen 4 / EPYC の PDF は取得できたが、テキストを抽出できなかった(PDF ライブラリなし)。保存先: C:\Users\kazut\.claude\projects\C--LocalAI\2b29d328-e730-4ba9-bee8-aa44168650d2\tool-results\webfetch-1793447920581-gf78vy.pdf
