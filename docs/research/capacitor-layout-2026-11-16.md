# チップコンデンサ(SMD)の配置を実物に合わせる調査と設計案(2026-11-16)

- 依頼: ユーザー「コンデンサの位置が適当状態なので直してください」→ 決定「パッケージ種類ごとに実物の写真から」→ 追加「ない奴はなくしていいです」(実物の上面に無いパッケージは 0 個にしてよい。『模式のまま出す』より『実物に無ければ出さない』を優先)。
- 今回は**調査と設計案だけ**。コード・データ・設計書は変えていない。実装は別担当。
- 区分: **[実測]** 実物の写真を自分で見た観察 / **[公表]** メーカーの資料・メーカー配布の画像 / **[二次]** 記事・他者のイラスト / **[推定]** 私の推測 / **未確認** 写真を見つけられなかった、または写真から判断できなかった。
- 画像は保存・転載していない。ブラウザ(Chrome)で表示して見ただけで、下には URL と、見えたものの文章だけを書く。取得日はすべて 2026-11-16。
- 個数は写真を目で数えた**概数**。向き(長辺が縁に平行か垂直か)は斜めの写真が多く、確かでないものは「不確か」と書く。

## 0. 現状(js/render/pkggeom.js)

- `capacitorLayout(sub, ihs)`: 全チップ共通。蓋(IHS)と基板の縁のあいだの帯の 4 辺に、1.6 mm 間隔・1 辺最大 20 個・角は空けて並べる。大きさは CAP_LEN 1.0 × CAP_WID 0.5 × CAP_H 0.45 mm(模式)。帯が 1.4 mm 未満なら 0 個。
- 基板(`substrateSize`)は「全ダイ(飾りのダイを含む)の外接矩形 + 余白(基板種別の既定 4〜6 mm と、外接矩形の長辺の 12% の大きいほう)」。**実物のパッケージ寸法ではない**(例: 13900K は 31.3 × 18.8 mm で、実物の LGA1700 は 37.5 × 45 mm。285K は 4 タイルを横一列に並べるので 54.1 × 18.3 mm)。
- 蓋(`ihsRect`)は「全ダイの外接矩形 + 0.45 × 余白」。全チップに蓋を描く(モバイル BGA のように実物に蓋が無いものも描く)。
- コンデンサの数・位置は、評価(ST/MT・電力・温度・面積)には使われない。`caps` を参照しているのは pkggeom.js(`buildScene`)と tests/pkggeom.test.js だけ(grep で確認)。熱・面積の計算(js/sim/thermal.js・area.js)が使うのは基板の**データ**(data/substrates.js の物性値)で、pkggeom の基板寸法は使わない。

## 1. プリセット 111 件のパッケージ分類

| # | パッケージ種類(提案 ID) | 件数 | 代表 SKU(全件は §1.1) |
|---|---|---|---|
| 1 | AMD AM4(PGA、ハンダ付けの蓋)`am4` | 11 | 5800X・5800X3D・5600X・5950X・1800X・2700X・2400G |
| 2 | AMD AM5(LGA1718、切り欠きのある蓋)`am5` | 8 | 7700・7800X3D・7950X・7950X3D・9700X・9800X3D・9950X・9950X3D |
| 3 | Intel LGA1700 `lga1700` | 10 | 12900K・12700K・12600K・12100・13900K・13700K・13600K・14900K・14700K・14600K |
| 4 | Intel LGA1851 `lga1851` | 2 | 285K・265K |
| 5 | Intel モバイル BGA(H・U・V。蓋なし。Foveros 等)`intel-mobile-bga` | 11 | 185H(MTL)・285H(ARL-H)・268V/258V/256V(LNL)・388H/386H/378H/358H/325(PTL)・320(WCL) |
| 6 | Intel HX(BGA。RPL-HX・ARL-HX)`intel-hx-bga` | 4 | 13980HX・14900HX・14700HX・275HX |
| 7 | AMD モバイル単一ダイ BGA(FP6・FP7・FP8)`amd-fp-mono` | 5 | 5800U(FP6)・7735HS(FP7)・7840HS(FP7/FP8)・HX 370・350 |
| 8 | AMD FL1(Dragon Range。デスクトップと同じ CCD + IOD を BGA に)`amd-fl1` | 1 | 7945HX |
| 9 | AMD Strix Halo(FP11)`amd-fp11` | 1 | Ryzen AI Max+ 395 |
| 10 | AMD SP3(EPYC)`amd-sp3` | 1 | EPYC 7401 |
| 11 | Apple M 系(SoC + パッケージ内 DRAM、金属の蓋)`apple-m` | 15 | M1〜M5 Max |
| 12 | スマホ SoC(PoP: SoC の上に DRAM パッケージを重ねる)`phone-pop` | 37 | Apple A12〜A20 Pro(10)・Snapdragon(20)・Dimensity(7) |
| 13 | Snapdragon 8cx Gen 3(ノート PC 向け BGA)`qc-pc-bga` | 1 | 8cx Gen 3 |
| 14 | NVIDIA Jetson / Tegra(組み込み BGA)`nv-tegra` | 3 | Orin(Jetson AGX Orin)・Thor・T239 |
| 15 | NVIDIA GB10(FCBGA 31 × 50 mm)`nv-gb10` | 1 | GB10(DGX Spark) |
| | 合計 | **111** | |

- HX・HS の別: AMD の HS(7840HS・7735HS)は BGA(FP7/FP8)。Intel の HX(13980HX 等)も BGA(LGA ではない)。AMD の 7945HX は FL1(BGA)[二次・一般的な知識。SKU ごとのソケット名は今回は再確認していない]。
- AM4 の 5800X はプリセットに dies が 0 件(3D は仮の 20 × 20 mm で描かれる)。
- スマホ SoC を PoP とした根拠: Snapdragon 8 Gen 2 の断面(Yole SystemPlus、§2.12)で DRAM と SoC の積層が見える [二次]。ほかの SKU は SKU ごとには未確認で、「フラッグシップ・ミドルのスマホ SoC は PoP」という一般論 [推定]。

### 1.1 全件の内訳(プリセット ID)

- am4(11): amd-zen1-1800x, amd-zen1-1500x, amd-zen1-1200, amd-zenplus-2700x, amd-zenplus-2600x, amd-raven-2400g, amd-raven-2200g, amd-zen3-5800x, amd-zen3-5800x3d, amd-zen3-5600x, amd-zen3-5950x
- am5(8): amd-zen4-7700, amd-zen4-7800x3d, amd-zen4-7950x, amd-zen4-7950x3d, amd-zen5-9700x, amd-zen5-9800x3d, amd-zen5-9950x, amd-zen5-9950x3d
- lga1700(10): intel-adl-12900k, intel-adl-12700k, intel-adl-12600k, intel-adl-12100, intel-rpl-13900k, intel-rpl-13700k, intel-rpl-13600k, intel-rpl-14900k, intel-rpl-14700k, intel-rpl-14600k
- lga1851(2): intel-arl-285k, intel-arl-265k
- intel-mobile-bga(11): intel-mtl-185h, intel-arl-285h, intel-lnl-268v, intel-lnl-258v, intel-lnl-256v, intel-ptl-x9-388h, intel-ptl-x9-386h, intel-ptl-x9-378h, intel-ptl-x7-358h, intel-ptl-u5-325, intel-wcl-c5-320
- intel-hx-bga(4): intel-rpl-13980hx, intel-rpl-14900hx, intel-rpl-14700hx, intel-arl-275hx
- amd-fp-mono(5): amd-zen3-5800u, amd-zen3p-7735hs, amd-zen4-7840hs, amd-strix-hx370, amd-kraken-350
- amd-fl1(1): amd-zen4-7945hx / amd-fp11(1): amd-strixhalo-395 / amd-sp3(1): amd-epyc-7401
- apple-m(15): apple-m1, m1pro, m1max, m1ultra, m2, m2pro, m2max, m2ultra, m3, m3pro, m3max, m4, m4pro, m5, m5max
- phone-pop(37): apple-a12〜a20pro(10)、qc-855, 865, 888, 8gen1, 8plus-gen1, 8gen2, 8gen3, 8elite, 8elite-gen5, 8s-gen3, 8s-gen4, 7plus-gen3, 780g, 7gen3, 7gen4, 7gen1, 720g, 8elite-x-gen6, 6gen1, 4gen2(20)、mt-9000, 9200, 9300, 9400, 9500, 9600pro, 8200(7)
- qc-pc-bga(1): qc-8cx-gen3 / nv-tegra(3): nv-orin-agx, nv-thor, nv-t239 / nv-gb10(1): nv-gb10

## 2. パッケージ種類ごとの観察(上面 = 3D ビューで見える側。裏面は別に書く)

向きの約束: 写真は「蓋の刻印が読める向き(Intel・AMD とも、ピン 1 の三角印が左下に来る向き)」で上下左右を書く。Intel LGA は縦長(長辺が上下方向)。

### 2.1 AM5(Ryzen 7000 / 9000。X3D を含む)— **上面に有り。配置規則を作れる**

- [実測] Ryzen 5 9600X の蓋を外した基板(Fritzchens Fritz、CC0): https://commons.wikimedia.org/wiki/File:AMD@4nmCCD(6nmIOD)@Zen5@Granite_Ridge@Ryzen_5_9600X@100-000001405_BY_2429SUY_9AEQ579S40073_DSC01876.jpg (同 DSC01875 も同じ配置)
  - コンデンサは 8 か所の塊。蓋の足(接着剤の跡 8 か所: 4 隅と各辺の中ほど)の**あいだ**にあり、ダイの周りを一周する輪の形。
  - 左辺: 上寄りの横長の帯(2 行 × 約 8 個)→ そこから下へ伸びる縦の背骨(3〜4 列 × 約 10 行、千鳥)→ 下寄りの塊(約 3 行 × 6 個)。合わせて約 50〜60 個。右辺は左右対称に近い。
  - 上辺: 中央より左と右に 1 塊ずつ(2 行 × 6〜8 個)。下辺: 同様に 2 塊(2 行 × 約 6 個)。
  - 基板の縁からの距離: 縁から基板幅の約 10〜20%(縁にぴったりではなく、蓋の内側寄り)。
  - 個数は全体で約 150〜200 個 [推定。目視の概数]。
  - 1 個の大きさ: 基板 40 mm に対し 1 個は約 0.6〜1 mm に見える [推定。写真の比からの目測]。向きは「横(左右方向)に長い」ように見えるが、斜めの写真で不確か。
  - 塊の端に空きパッド(部品の載っていない金色のパッドの格子)がある。部品ではないので描かない。
- [実測] 蓋付きの上面(AM5 の 10 SKU が並ぶ写真。7500F〜7950X3D): https://commons.wikimedia.org/wiki/File:AMD_Ryzen_7000-Serie_-_Der_ultimative_CPU_und_Mainboard_Vergleich_(Memory_PC)_05.png
  - 蓋の切り欠きは左右に 2 つずつ・上下に 2 つずつ。切り欠きの中にコンデンサの格子が見える。**1 CCD・2 CCD・X3D で見た目の配置は同じ**(同じ基板レイアウト)[実測。解像度は低い]。
- 裏面(ランド側): 未確認(今回見ていない)。

### 2.2 AM4(Ryzen 1000〜5000。PGA)— **上面に有るが、すべて蓋の下**

- [実測] Ryzen 5 5600X の蓋を外した基板(近赤外の写真、Fritzchens Fritz、CC BY 2.0): https://commons.wikimedia.org/wiki/File:AMD@7nm(12nmIOD)@Zen3@Vermeer@Ryzen_5_5600X@100-000000064_BG_2042SUS_9JF6228V00014_DSCx2.jpg
  - 蓋を接着していた枠(封止材の輪)が基板の縁近くを一周し、**コンデンサはすべてその輪の内側**(= 蓋の下)。
  - 右辺: 縦 2 列 × 約 11 行(約 22 個)。各個の長辺は横(縁に垂直)。
  - 左辺: 縦 1〜2 列(約 14 個。中ほどに抜けがある)。
  - 上辺: 中央より左に 2 行 × 4 個、右に 2 行 × 4 個(約 16 個)。長辺は横(縁に平行)。
  - 下辺: 上辺と同様(約 16 個)。
  - 合計 約 65〜70 個 [推定。目視]。1 個は約 1.6 × 0.9 mm に見える(AM4 の基板 40 mm を写真の幅で割った目測。0603 相当)[推定]。
  - ほかに、左上などに極小の 2 個 1 組の点(ごく小さい部品か空きパッドか判別できない)。描かない案。
- [実測・低解像度] 蓋付きの AM4 の上面(Athlon 3000G、Commons の検索の縮小画像。カテゴリ: https://commons.wikimedia.org/wiki/Category:AMD_Athlon_3000G ): 蓋が基板のほぼ全面を覆い、上面にコンデンサは見えない。
- 蓋の下の配置は 5600X(Vermeer)で確認。Zen 1・Zen+・Raven Ridge(1800X・2700X・2400G 等)の蓋の下は**未確認**。
- 裏面: 未確認(ピンの無い中央部に部品が集まる、という一般の知識はあるが、今回は写真で確認していない)。

### 2.3 Intel LGA1700(第 12〜14 世代デスクトップ)— **上面に少し有り。蓋の下は無し**

- [実測] Core i9-12900K の上面(Geekerwan の動画の静止画、Commons): https://commons.wikimedia.org/wiki/File:A-00.07.00.443.png
  - 左の長辺の**下寄り**に 4 個が縦 1 列(各個の長辺は横 = 縁に垂直)。
  - 下の短辺の**中央より右**に 3〜4 個が横 1 列 + 右下の角寄りに 1 個。
  - 上辺・右辺・左辺の上寄りに、細かい点の格子(3〜6 か所)。形からテストパッド(試験用の接点)と推定し、コンデンサとしては数えない [推定]。
- [実測] Core i9-13900K(ES)の蓋を外した基板(Fritzchens Fritz、Commons): https://commons.wikimedia.org/wiki/File:Intel@intel7(10nmESF)@RaptorLake@RPL(8P%2B16E)@i9-13900K@ES_DSC05587-DSC05587.jpg
  - **蓋の下(ダイの周り)にコンデンサは無い**。蓋の外は 12900K と同じ: 長辺の下寄りに 4 個、短辺の右寄りに 3〜4 個 + 1 個。
  - ダイの長辺は、パッケージの長辺(45 mm 方向)と平行。
- [二次] 同じ 13900K の写真(Wccftech。向きが 90° 回っている): https://cdn.wccftech.com/wp-content/uploads/2022/10/Intel-13th-Gen-Raptor-Lake-Core-i9-13900K-CPU-Die-Shots-_2.jpg — 同じ配置。
- 合計 上面 約 8〜9 個。12100(H0 ダイ)の配置は未確認(基板が同じか不明)[推定: 同じソケットなので近い]。
- 裏面: 未確認。

### 2.4 Intel LGA1851(Core Ultra 200S)— **上面に少し有り(左右の長辺のみ)**

- [実測] Core Ultra 9 285K と 7 265K の上面(動画の静止画、Commons): https://commons.wikimedia.org/wiki/File:INTEL_CORE_ULTRA_7_265K_-_DOVRESTI_COMPRARLO%C2%BF_%F0%9F%91%80_(1920p_25fps_VP9_LQ-128kbit_AAC)-00.01.50.800.png
  - 左の長辺: 上寄り(上端から約 20%)に 2 個、中ほどより下(約 65%)に 2 個、下寄り(75〜90%)に約 6 個の縦 1 列。
  - 右の長辺: 下の角寄りに 2 個。
  - 上下の短辺: コンデンサは見えない(蓋が縁近くまで来ている)。
  - 各個の長辺は横(縁に垂直)。合計 約 12 個。285K・265K で同じ。
- 蓋の下・裏面: 未確認。

### 2.5 Intel モバイル BGA(Meteor Lake・Arrow Lake-H・Lunar Lake・Panther Lake・Wildcat Lake)— **上面に無い(確認できた 2 種)**

- [二次] Meteor Lake(Core Ultra 9。185H と推定)のパッケージ上面の写真(エルテック「Chiplet:Intel Core Ultra 9 Meteor Lake パッケージ平面解析レポート」の画像): https://www.ltec-biz.com/wp-content/uploads/2024/09/Img20240903105328-1024x578.jpg
  - 基板の外周に金属の補強枠(スティフナ)、中央にタイルの積層。**基板の上面にコンデンサは見えない**(配線の模様だけ)。蓋は無い。
- [二次] Meteor Lake のパッケージ写真(Tom's Hardware「Meteor Lake die shots show off inner workings…」の画像。Bing 画像検索から表示): 同じく補強枠とダイだけ。下辺の近くに極小の点の列(テストパッドと推定)。
- [二次] Lunar Lake を基板に載せた写真(Indian Express): https://indianexpress.com/wp-content/uploads/2024/06/intel-lunar-lake.jpg と、手に持った写真(guru3d「Intel: Lunar Lake photographed with Memory on Package」)
  - 補強枠、ダイ、DRAM パッケージ 2 個。**パッケージの上面にコンデンサは無い**(周りのマザーボード上には大量にある)。
- Arrow Lake-H(285H): Meteor Lake と同じ系統のパッケージ [推定]。写真は未確認。
- Panther Lake(388H 等)・Wildcat Lake(320): **未確認**。
- 裏面(ボール側): 未確認。

### 2.6 Intel HX(BGA。13980HX・14900HX・14700HX・275HX)— **未確認**

- 13980HX で検索して出た写真は、実際には 13900K(LGA1700)の蓋を外したもの(上の Wccftech の画像)で、HX の BGA ではなかった。HX の BGA パッケージの上面の写真は見つけられなかった。

### 2.7 AMD モバイル単一ダイ(FP7/FP8)— **上面に有り(ダイを囲む)**

- [二次] AMD が CES 2025 で配った実物(Tom's Hardware の写真)「Here's all the silicon AMD launched at CES 2025…」: https://www.tomshardware.com/pc-components/cpus/heres-all-the-sexy-silicon-amd-launched-at-ces-2025-strix-halo-krackan-point-ryzen-9000x3d-fire-range-and-hawk-point-refresh-pose-for-family-photo
  - Krackan Point(Ryzen AI 300。プリセットの 350 と同じダイ)/ Hawk Point Refresh(Phoenix の再版。7840HS と同じダイ [二次])の写真: 補強枠の内側、**ダイのすぐ外側を囲むように**小さなコンデンサが並ぶ。左右の辺は縦の列(小さな塊が数個ずつ)、上下の辺は横の列。蓋は無い。
  - 個数は写真が小さく数えられない(1 辺あたり 10〜20 個程度に見える)[推定]。向きは不確か。
- Strix Point(HX 370)・Rembrandt-R(7735HS、FP7)・Cezanne(5800U、FP6): **未確認**。
- 裏面: 未確認。

### 2.8 AMD FL1(Dragon Range 7945HX)— **上面に多数(Fire Range の写真から)**

- [二次] 同じ Tom's Hardware の記事の Fire Range(Ryzen 9 9955HX 等)の写真。Fire Range は Dragon Range と同じ FL1 パッケージ [二次。一般的な報道。今回は再確認していない]。
  - 補強枠の内側に、ダイ(上に IOD 1 個、下に CCD 2 個が横並び)を囲む**密な格子**。左右の辺が厚い(3〜4 列)、上辺は 2 行、下辺(CCD の下)は薄い。デスクトップの AM5 と違い、蓋が無いのでそのまま見える。
  - 個数は約 100 個以上 [推定]。
- 注意: シミュレーターの 7945HX は「CCD が上・IOD が下」に並ぶが、写真では「IOD が上・CCD が下」。基板に対するコンデンサの位置は、ダイの並びに合わせるより基板の辺に対して決めるほうが安全。

### 2.9 AMD Strix Halo(FP11。Ryzen AI Max+ 395)— **上面に有り(低解像度)**

- [二次] 同じ Tom's Hardware の記事の Strix Halo の写真(手に持った斜めの写真): 補強枠の内側、大きなダイ領域の**左右に小さな塊の縦の列**、下辺に 1 列。解像度が低く、個数・向きは判断できない。

### 2.10 AMD SP3(EPYC 7401)— **未確認**

### 2.11 Apple M 系 — **M1 は蓋の下に有り(ダイの上下)。ほかは未確認**

- [公表・二次] Apple の M1 の説明用写真(蓋の中を見せた図。Hacarus の記事が「Inside the package Explanatory "photo"」として引用): https://hacarus.com/wp-content/uploads/2021/01/M1-Packege_and_M1_photo_by_Apple_EN_W1920-1024x605.png
  - 蓋付き: 金属の蓋(SoC を覆う)と、その右に DRAM パッケージ 2 個。**上面に見えるコンデンサは無い**。
  - 蓋の中: SoC ダイの**上側**に約 2 行(左寄りに 5〜6 個、右寄りに 3 個。約 9 個)、**下側**に約 3 行 × 5〜6 個(約 15 個)。ダイの左右には無い(右は DRAM)。
- [二次] Commons のイラスト(上の写真と EE Times Asia の分解記事をもとに描いたもの、CC0): https://commons.wikimedia.org/wiki/File:Apple_M1_no_heatsink.png — 同じ配置。
- [二次] EE Times Asia「Apple Mini M1 SoC Teardown」: https://www.eetasia.com/apple-mini-m1-soc-teardown/ (蓋付きの写真。DRAM 2 個がプロセッサの横に並ぶ)
- M1 Pro・Max・Ultra・M2〜M5: **未確認**。
- シミュレーターの M 系は SoC のダイしか描かない(パッケージ内の DRAM は描かない)。

### 2.12 スマホ SoC(PoP)— **端末内で見える上面は DRAM パッケージ。コンデンサは見えない**

- [二次] Snapdragon 8 Gen 2 のパッケージ断面(Yole SystemPlus 2023): https://medias.yolegroup.com/uploads/2023/04/qualcomm-snapdragon-8-gen-2-soc_package-cross-section-optical-view.jpg — DRAM と SoC の積層(PoP)の断面。
- 実機で上から見えるのは DRAM パッケージの樹脂の上面で、コンデンサは無い [推定。一般的な PoP の構造から]。
- SoC 基板のダイの周り(DRAM の下)や基板の裏のコンデンサ: **未確認**。
- Apple A 系・Dimensity も同じ扱い [推定。SKU ごとには未確認]。

### 2.13 Snapdragon 8cx Gen 3 — **未確認**

- 参考: 同じ Qualcomm の PC 向け Snapdragon X Elite をマザーボードに載せた写真(Bing 画像検索の結果)では、裸のダイの周りの基板上面にコンデンサは見えなかった [二次・低解像度]。8cx Gen 3 そのものは未確認。

### 2.14 NVIDIA Orin(Jetson AGX Orin)— **上面に有り(ダイを囲む輪)**

- [公表?] NVIDIA の Orin パッケージの画像(JetsonHacks「NVIDIA Jetson AGX Orin Developer Kit」2022-04 の記事に掲載。写真か CG かは未確認): https://jetsonhacks.com/ (同記事の画像。Bing 画像検索から表示)
  - 補強枠の内側、ダイの外側に輪の形: 上辺・下辺に小さな塊が 5〜6 個ずつ並ぶ(各 2〜4 個)、左右の辺は縦の列(左 約 8 個・右 約 12 個)。合計 約 50 個 [推定]。
- Thor・T239: **未確認**。

### 2.15 NVIDIA GB10 — **上面に有り(NVIDIA の画像。CG の可能性)**

- [公表?] NVIDIA の GB10 の画像(The Register の記事に掲載): https://regmedia.co.uk/2025/08/27/gb10_nvidia_superchip.jpg
  - 縦長の基板(公表 31 × 50 mm。docs/research/nvidia-gb10.md)、補強枠。ダイ領域の上と下にそれぞれ 2 行 × 約 8 個(中央寄り)、左右の長辺に沿って 1〜2 列の縦の列(途中で数か所切れる)。
  - 画像はダイ写真を重ねた宣伝用で、2 ダイ(S-die・G-die)が 1 つの縦長のダイに見える。**実物写真ではない可能性が高い**ので、配置の確度は低い。

## 3. 配置規則の案(上面 = 3D ビューで見える側のみ)

### 3.1 方針(ユーザー指示の反映)

各パッケージ種類を次の 3 つに分ける。

- **①実物の上面に有り・規則あり** → 写真から作った規則で描く。
- **②実物の上面に無い** → 描かない(0 個)。
- **③写真が取れず不明** → 既定は**描かない**(理由: 「推測で配置を断定しない」と「無いものは無くしてよい」に沿う。位置を推測して描くと、実物に無い部品を描くことになる)。UI に「コンデンサ: 実物を確認できていないため表示していません」と出す。
- プリセットに由来しない設計(新規・混合設計)は実物が無いので、従来の模式配置(4 辺に等間隔)のままにし、「コンデンサの位置は模式(根拠なし)」と注記する案。

### 3.2 種類ごとの結論と規則

座標の約束: 基板の矩形を u(左 0 → 右 1)・v(上 0 → 下 1)で表す。「縁からの深さ d」は基板の短辺に対する割合。「長辺が縁に垂直」= コンデンサの長い方向が、その辺に垂直。

| 種類 | 結論 | 規則の案(上面) | 根拠 |
|---|---|---|---|
| am5 | ① | ダイを囲む 8 塊。左辺: v 0.15〜0.85 に 3〜4 列の格子(深さ d 0.10〜0.22)。右辺: 左右対称。上辺: u 0.20〜0.45 と 0.55〜0.80 に 2 行(d 0.10〜0.16)。下辺: 上辺と同じ。1 塊あたり 12〜30 個、合計 約 150。向きは長辺が横(不確か)。**蓋の切り欠きから見える**ので、蓋の外側の帯に置く | §2.1 [実測] |
| am4 | ①(蓋の下) | 蓋の下の輪(d 0.12〜0.20): 右辺 2 列 × 11、左辺 1〜2 列 × 約 7、上辺・下辺は中央の左右に 2 行 × 4 を 2 塊ずつ。合計 約 66。**蓋「表示」では見えない**(半透明・非表示のときだけ見える)。蓋は実物どおり基板のほぼ全面(縁から約 1 mm)を覆う大きさにする | §2.2 [実測] 5600X。Zen 1・Zen+・Raven の蓋の下は未確認(同じ規則を流用するかは要判断。流用するなら [推定] と注記) |
| lga1700 | ① | 長辺の一方の下寄り(長辺方向 0.70〜0.90)に 4 個の 1 列(長辺が縁に垂直)、短辺の一方の中央より右(0.55〜0.75)に 3〜4 個の 1 列 + 角寄り(0.85)に 1 個。ほかは無し。蓋の下は無し | §2.3 [実測] 12900K・13900K |
| lga1851 | ① | 長辺の一方: 0.20 に 2 個、0.65 に 2 個、0.75〜0.90 に 6 個の 1 列。もう一方の長辺: 0.90 に 2 個。短辺は無し。長辺が縁に垂直 | §2.4 [実測] 285K・265K |
| intel-mobile-bga | ②(MTL・LNL)/③(PTL・WCL・ARL-H) | 描かない | §2.5。ARL-H は MTL と同系 [推定] なので ② と同じ扱いでよい。PTL・WCL は ③(既定どおり描かない) |
| intel-hx-bga | ③ | 描かない(未確認と注記) | §2.6 |
| amd-fp-mono | ①(350・7840HS)/③(HX 370・7735HS・5800U) | ① はダイの縁から少し外(ダイと補強枠のあいだ)を囲む 1〜2 列の輪。4 辺とも、小さな塊(2〜4 個)を間隔をあけて並べる。1 辺 10〜20 個 | §2.7 [二次]。7840HS は Hawk Point と同じダイ・パッケージ [二次] として ① に入れる案 |
| amd-fl1 | ①(低〜中確度) | ダイを囲む密な格子。左右の辺 3〜4 列、上辺 2 行、下辺 1 行。合計 約 100 | §2.8 [二次] Fire Range の写真。同じ FL1 の扱いは [二次] |
| amd-fp11 | ③寄り | 写真が低解像度。既定は描かない。描くなら「左右に縦の列、下辺に 1 列」[二次・低解像度] | §2.9 |
| amd-sp3 | ③ | 描かない | §2.10 |
| apple-m | ①(M1。蓋の下)/③(ほか 14 件) | M1: ダイの上側 2 行(約 9 個、左寄り)、下側 3 行(約 15 個)。左右は無し。蓋の下なので蓋「表示」では見えない | §2.11 [公表・二次] |
| phone-pop | ② | 描かない(端末内で見える上面は DRAM パッケージ) | §2.12 [二次・推定] |
| qc-pc-bga | ③ | 描かない | §2.13 |
| nv-tegra | ①(Orin)/③(Thor・T239) | Orin: ダイと補強枠のあいだの輪。上下は小さな塊を 5〜6 個ずつ、左右は縦の列(左 約 8・右 約 12) | §2.14 [公表?。CG の可能性] |
| nv-gb10 | ①(低確度) | ダイ領域の上下に 2 行 × 約 8(中央寄り)、左右の長辺に沿って 1〜2 列の縦の列 | §2.15 [公表?。宣伝用の画像] |

### 3.3 大きさ(サイズ)

- 写真からの目測では、AM4 の蓋の下の部品が約 1.6 × 0.9 mm(0603 = メートル法 1608 相当)、AM5・LGA の部品が約 0.6〜1 mm [推定]。メーカーの公表値(何サイズのコンデンサか)は見つけていない。
- 案: 大きさは**模式のまま**(1.0 × 0.5 × 0.45 mm = メートル法 1005 / インチ 0402 相当)にし、AM4 だけ 1.6 × 0.8 mm にする案も可(根拠は目測 [推定])。どちらにするかは要判断。出典の無い数値を「実寸」と書かない。

### 3.4 規則を基板に当てはめるときの注意(重要)

1. **シミュレーターの基板は実物の寸法でも縦横比でもない**(§0)。規則は基板の矩形に対する割合(u, v, d)で書き、拡大縮小して当てはめる。実物のパッケージ寸法(AM4・AM5 40 × 40、LGA1700・1851 37.5 × 45、GB10 31 × 50 mm 等)に基板を合わせるのは別の変更(§4.4)。
2. **向き**: 実物の LGA1700 はダイの長辺がパッケージの長辺と平行で、パッケージは縦長。シミュレーターの Raptor Lake のダイは横長(23.3 × 10.8 mm)なので基板も横長。規則は「パッケージの長辺 = 基板の長辺」として 90° 回して当てはめる。回す向き(時計回りか反時計回りか)と、ピン 1 の位置はシミュレーターに無い情報なので決められない → どちらかに固定し、[推定] と注記する。
3. **ダイとの重なり**: 割合で置くと、ダイが基板の大部分を占める設計(例: 13900K は基板が 31 × 19 mm でダイが 23 × 11 mm)ではダイに重なることがある。重なる個体は置かない(既存テストの「ダイと重ならない」を守る)。
4. **蓋との関係**: シミュレーターの蓋は「ダイ + 余白」の矩形で、実物の蓋(AM4 は基板のほぼ全面、AM5 は切り欠き付き)と違う。
   - AM5: 実物は切り欠きから見えるので、シミュレーターの蓋の外側の帯に置けば「見える」状態になり実物に近い。
   - AM4・Apple M1: 実物は蓋の下。蓋をその種類だけ大きく(基板の縁から約 1 mm)して、その下に置く案。
   - 蓋の無い実物(Intel・AMD のモバイル BGA、Orin、GB10)に蓋を描いている点は別の問題(§6)。

## 4. 実装案

### 4.1 パッケージ種類をどこで決めるか

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| A | プリセット(data/presets/*.js)に `package: { capLayout: 'am5' }` を足す | 明示的。validate-data で全件を検査できる | 111 件の編集。プリセットの差分が大きい |
| B | pkggeom.js の中で family・kind・vendor から推定する | プリセットを触らない | 規則が暗黙。例外(7840HS と HX 370 の扱いの違い等)を書きにくい |
| **C(推奨)** | 新しいデータ `data/caplayouts.js` に「種類ごとの規則(出典・区分・状態 ①②③)」と「プリセット ID → 種類」の対応表を置く。design には足さない(`design.presetId` から引く) | 出典と規則が 1 か所。保存データの形が変わらない。プリセットを触らない | 新しいプリセットを足すとき対応表への追加が必要(validate-data で「対応表に無いプリセット」を警告にする) |

- 保存データ: 案 C なら design の形は変わらない(`presetId` は既にある)。案 A でも design.package には入れない(design.package は冷却・基板・電力制限の「環境」で、validate の対象が増えるため)。
- 混合設計(origin.mode === 'mix')・プリセットに由来しない設計: 種類なし → 従来の模式配置 + 注記。

### 4.2 pkggeom.js の変更点

- `capacitorLayout(sub, ihs, spec)`: `spec` が無い(undefined)ときは今の模式配置(後方互換。既存テストはそのまま通る)。`spec.state` が 'none'(②)・'unknown'(③)なら `[]`。'rules'(①)なら群(group)ごとに置く。
  - group の形の案: `{ edge: 'left'|'right'|'top'|'bottom', from, to(辺に沿った割合 0〜1), depth: [d0, d1](縁からの深さの割合), rows, perRow, axis: 'perp'|'para', underLid: true|false }`
  - 置いた結果がダイ・飾りのダイに重なるものは捨てる。基板の外に出ないこと。
  - 長辺 = 長辺の対応(§3.4 の 2)は spec 側に「パッケージ枠の長辺は縦」と書き、基板が横長なら回す。
- `buildScene(design, opts)`: `opts.capSpec`(呼び出し側が data/caplayouts.js から引いて渡す)を `capacitorLayout` に渡す。pkggeom.js は今と同じく DOM・データに依存しない純ロジックのまま。
- 蓋の下に置く種類(AM4・M1)は、`ihsRect` を種類ごとに大きくする(`spec.lidInsetMm` のような値。根拠: §2.2 の写真で蓋は基板のほぼ全面)。この変更は `designBounds`(カメラの外接)には影響しない(基板の大きさは変えない)。
- pkgview3d.js: `rebuildScene` で presetId から spec を引いて渡す。注記(667 行の `n` の配列)に「コンデンサ: 実物の写真に基づく配置(AM5。出典は調査メモ)」「実物の上面に無いため表示しません」「実物を確認できていないため表示しません」「位置は模式(根拠なし)」のどれかを足す。PNG 書き出しにも入る(既存の注記と同じ経路)。

### 4.3 テストへの影響(tests/pkggeom.test.js ほか)

- 44 行の `capacitorLayout` のテスト: spec なしの呼び出しなので、案のとおり後方互換にすれば変更不要。
- 83 行 `s.counts.caps === s.caps.length`: そのまま通る。
- `buildScene` の頂点数・三角形の向き・範囲のテスト(65〜112 行): spec を渡さなければ従来どおり。
- tests/decordie.test.js 108〜110 行(飾りのダイ付きの方が頂点が多い): 飾りのダイの箱が増えるので、コンデンサの数が変わっても成り立つ見込み。ただし spec を渡す形にしたら確認が要る。
- 追加するテストの案: 種類ごとに ①は 1 個以上で基板の内側・ダイと重ならない・決定的、②③は 0 個、蓋の下の種類は全個体が蓋の矩形の内側、対応表が 111 件すべてを覆う(validate-data でも可)。

### 4.4 しない(別の判断が要る)もの

- 基板を実物のパッケージ寸法にする(AM4・AM5 40 × 40 mm 等): `substrateSize` を変えると、カメラの外接・既存テスト(基板の余白・ダイの 12%)・飾りのダイの配置に広く効く。今回の目的(コンデンサの位置)には必須ではない。
- 裏面(ボール・ランド側)のコンデンサ: 3D ビューは真下からも見られる(PRESETS.bottom)が、裏面は今は何も描いていない。今回は上面だけ。

### 4.5 評価への影響

- 無し。コンデンサ・蓋・基板の寸法は描画だけで使われる(§0 の grep)。蓋の大きさを種類ごとに変える案も描画だけ。ST/MT・電力・温度・面積は変わらない。

## 5. 未確認の一覧

- Intel: Panther Lake・Wildcat Lake・Arrow Lake-H の上面(MTL と同系と推定)、HX の BGA(RPL-HX・ARL-HX)、LGA1851 の蓋の下、LGA1700 の 12100(H0)の上面、すべての Intel の裏面。
- AMD: Zen 1・Zen+・Raven Ridge(AM4)の蓋の下、Strix Point(HX 370)・Rembrandt-R(7735HS)・Cezanne(5800U)、Strix Halo の詳細、EPYC 7401(SP3)、Dragon Range そのもの(Fire Range で代用)、すべての裏面。
- Apple: M1 以外の M 系、A 系の SoC 基板(DRAM の下)。
- Qualcomm・MediaTek: SoC 基板(DRAM の下)の配置、8cx Gen 3。
- NVIDIA: Thor・T239、Orin と GB10 の画像が実物写真か CG か。
- コンデンサの公表サイズ(0402・0201 等)はどの種類も見つけていない(大きさは目測のみ)。
- 各塊の正確な個数・向き(写真が斜め・低解像度のものが多い)。

## 6. 限界と、関連して見つけたこと

- 観察は Commons・記事の写真を画面で見た目視で、個数・位置の割合は概数。同じ種類でも SKU・世代で配置が違う可能性がある(例: AM4 は 5600X だけ、LGA1700 は 12900K・13900K だけで確認)。
- Orin・GB10・Apple M1 の中身の画像はメーカーの説明用画像で、CG や合成の可能性がある。
- 初めの想定「モバイル BGA は上面にほぼ無い」は、**Intel では当たり、AMD では外れ**(AMD の FP8・FL1 は蓋の無い基板の上面にダイを囲んで多数ある)。
- **蓋の扱い**: シミュレーターは全チップに蓋(IHS)を描くが、実物で蓋が無いもの(Intel・AMD のモバイル BGA、Orin、GB10)が多い。逆に実物には補強枠(スティフナ。基板の外周の金属の枠)がある。コンデンサとは別の問題だが、「実物に合わせる」なら同じパッケージ種類の表で蓋の有無・補強枠も持てる(要判断)。
- Apple M 系・Lunar Lake はパッケージ内に DRAM があるが、シミュレーターは描かない(別の問題)。

## 7. 実装結果(2026-11-16。実装担当)

調査メモ §4.1 の案 C(推奨)どおりに実装した。`data/caplayouts.js`(種類ごとの規則と、プリセット id → 種類の対応表)、`js/render/pkggeom.js`(`capacitorLayout(sub, ihs, spec, dies)`・`capSpecOf`・`capacitorNote`)、`js/render/pkgview3d.js`(種類を引いて渡す・注記 1 行)。評価には影響しない(全 111 プリセット × 再現・改良の 2 モードの評価 JSON の SHA-256 が、変更前後で完全に一致)。蓋(IHS)の大きさ・形状は変えていない。サイズは模式の 1.0 × 0.5 mm のまま(AM4 も変えない)。

### 7.1 種類ごとの状態と個数(シミュレーターの画面での個数。プリセット 111 件、種類 21)

| 状態 | 種類 id | 件 | 個数 | 備考 |
|---|---|---|---|---|
| ① | am5 | 8 | 96〜104 | 左右 2 塊ずつ・上下 2 塊ずつの 8 塊。実物の約 150 個に対し、シミュレーターの帯が狭いので減る |
| ① | am4-zen3(蓋の下) | 4 | 43〜51 | 5600X の写真。5800X・5800X3D・5950X は同じ基板と [推定]。縁に垂直な列は帯が狭く 1 列に減る |
| ① | lga1700 | 10 | 8 | 12900K・13900K の写真。基板が横長なので時計回りに 90° 回す(向きは [推定] で固定)。12100 は [推定] |
| ① | lga1851 | 2 | 12 | 同上(回転は [推定]) |
| ① | amd-fp-ring | 2 | 48〜54 | 350(Krackan Point)・7840HS(Hawk Point)。向きは不確か |
| ① | amd-fl1 | 1 | 168 | Fire Range の写真から(確度は低〜中)。向きは不確か |
| ① | apple-m1(蓋の下) | 1 | 23 | 蓋「半透明」「非表示」で見える。不透明の蓋では見えない |
| ① | nv-orin | 1 | 50 | 画像が CG の可能性(確度低) |
| ① | nv-gb10 | 1 | 112 | 宣伝用の画像で確度低。調査メモの記述どおり ① にした。回転は [推定] |
| ② | intel-mobile-bga | 4 | 0 | Meteor Lake・Lunar Lake(185H・268V・258V・256V) |
| ② | intel-arl-h | 1 | 0 | 285H。Meteor Lake と同系 [推定] なので ② と同じ扱い(別の種類にして [推定] を根拠に明記) |
| ② | phone-pop | 37 | 0 | Apple A 系・Snapdragon・Dimensity。端末内で見える上面は DRAM パッケージ [推定] |
| ③ | am4-unconfirmed | 7 | 0 | Zen 1・Zen+・Raven Ridge(蓋の下は 5600X でしか確認していないので流用しない) |
| ③ | intel-mobile-unconfirmed | 6 | 0 | Panther Lake 5・Wildcat Lake 1 |
| ③ | intel-hx-bga | 4 | 0 | RPL-HX 3・ARL-HX 1 |
| ③ | amd-fp-unconfirmed | 3 | 0 | HX 370・7735HS・5800U |
| ③ | amd-fp11 | 1 | 0 | Strix Halo(低解像度。調査メモは「③寄り」) |
| ③ | amd-sp3 | 1 | 0 | EPYC 7401 |
| ③ | apple-m-unconfirmed | 14 | 0 | M1 以外の M 系 |
| ③ | qc-pc-bga | 1 | 0 | 8cx Gen 3 |
| ③ | nv-tegra-unconfirmed | 2 | 0 | Thor・T239 |

合計: ① 30 件 / ② 42 件 / ③ 39 件(= 111)。以前は全 111 件に模式配置のコンデンサが出ていたが、今は 81 件で 0 個。

### 7.2 未確認一覧(③。「実物の配置は未確認のため描いていません」と画面に出る)

AM4 の Zen 1・Zen+・Raven Ridge 7 件(amd-zen1-1800x・amd-zen1-1500x・amd-zen1-1200・amd-zenplus-2700x・amd-zenplus-2600x・amd-raven-2400g・amd-raven-2200g)/ Panther Lake・Wildcat Lake 6 件 / Intel HX 4 件 / amd-strix-hx370・amd-zen3p-7735hs・amd-zen3-5800u / amd-strixhalo-395 / amd-epyc-7401 / apple-m1pro・m1max・m1ultra・m2〜m5 系の 14 件 / qc-8cx-gen3 / nv-thor・nv-t239。

### 7.3 実装の判断(調査メモからの具体化)

- 規則の座標: 辺ごとの群を、外側の矩形 O と内側の矩形 I のあいだの帯に置く(outside は O = 基板・I = 蓋、underLid は O = 蓋・I = 全ダイの外接矩形)。辺に沿った範囲は O の辺の長さに対する割合、深さは帯の厚さに対する割合(外側の縁 = 0)。調査メモ §3.2 の「縁からの深さは基板の短辺に対する割合」は、シミュレーターの帯(基板の縁と蓋のあいだは余白の 55% = 約 2.2 mm)に収まらないので、帯の厚さに対する割合に変えた。
- 帯の厚さ・辺の長さに収まらない個数は減らす(コンデンサどうしが重ならない)。このため個数は「目安」で、基板の大きさで変わる。
- 向き(長辺が縁に垂直 / 平行)は、確かな種類(AM5 の左右・AM4 の左右・LGA の左辺)だけ写真どおり。不確かなものは縁に平行(帯に収まりやすい)。
- AM4 は蓋の外径を変えない指示のため、蓋の下の帯(約 1.8 mm)にだけ置く。蓋の壁(厚さ 0.8 mm)と少し重なる。
- 追加した項目: `capacitorLayout` の第 4 引数 `dies`(ダイ・飾りのダイとの重なり、蓋の下の帯の決定に必要)。

### 7.4 画面の確認

headless Chrome で単一 HTML(`tools/build-single.js`)を開いて確認した(AM5・LGA1700・LGA1851・Meteor Lake・Apple M1)。スクリーンショットは作業用フォルダで、コミットには含めない。
