# オンパッケージメモリの SKU 調査(2026-11-13)

調査のみ(コード・データは変更していない)。対象は `data/presets/*.js` の全 106 件(chips-pc.js 49 件、chips-soc.js 57 件)。取得日はすべて 2026-11-13。

- 「オンパッケージ」= メモリ DRAM が SoC と同じパッケージに載っているもの(Lunar Lake 型)。基板上のはんだ付け LPDDR、DDR5 スロット、SoM(モジュール)上のメモリは対象外とした。
- 区分: [公表] = ベンダー公式。[二次] = Wikipedia・報道など。未取得 = 公式で確認できなかったもの。推測では埋めていない。
- 読み方: WebFetch(要約モデル経由)で読んだ。引用は短い範囲のものだけ。

## 1. 結論

| 区分 | SKU |
|---|---|
| オンパッケージを公式で確認 | Apple M1、M3、M3 Pro、M3 Max(Apple Newsroom の「custom package」の記述) |
| オンパッケージは [二次] のみ(Apple 公式の文言は未取得) | Apple M1 Pro、M1 Max、M1 Ultra、M2、M2 Pro、M2 Max、M2 Ultra、M4、M4 Pro、M5、M5 Max |
| 固定済みのため除外 | Intel Lunar Lake(268V・258V・256V) |
| 対象外(基板上・SoM・スロット) | Intel・AMD のその他すべて、Snapdragon 8cx Gen 3、Jetson AGX Orin・Thor(SoM)、T239(Switch 2) |
| オンパッケージか未取得 | NVIDIA GB10 |
| PoP(スマホ SoC)だが容量は端末メーカーが選ぶ・公式記載なし | Apple A12〜A20 Pro、Snapdragon(スマホ)、Dimensity |

注意: Apple はメモリの種類(LPDDR)と速度(MT/s)を公式には出していない。Support の技術仕様と Newsroom で確認できたのは容量と帯域(GB/s)だけ。種類と速度は [二次](Wikipedia)のまま。

## 2. Apple M シリーズ(15 件)

容量は Apple Support の技術仕様ページ(搭載機種)にある構成の一覧。どの SKU も容量は 1 つに決まらず、複数の構成から選ぶ形になっている。

| プリセット | オンパッケージ(根拠) | 種別・速度 | 帯域 [公表] | 容量の構成 [公表] | 出典 |
|---|---|---|---|---|---|
| apple-m1 | [公表]: Newsroom「unified memory architecture ... into a single pool ... within a custom package」 | LPDDR4X-4266 [二次] | (Support に記載なし) | 8GB / 16GB | Newsroom https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/ 、Support https://support.apple.com/en-us/111883 (MacBook Air M1) |
| apple-m1pro | [二次]: Wikipedia「Apple M1」の SiP(memory on package)の記述。M1 Pro/Max の Newsroom に package の語なし | LPDDR5-6400 [二次] | 200GB/s | 16GB / 32GB | Newsroom https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/ 、Support https://support.apple.com/en-us/111902 ・ https://support.apple.com/en-us/111901 |
| apple-m1max | [二次](同上) | LPDDR5-6400 [二次] | 400GB/s | 32GB / 64GB | Support https://support.apple.com/en-us/111901 ・ https://support.apple.com/en-us/111900 |
| apple-m1ultra | [二次](同上。Newsroom の「packaging architecture」は 2 ダイの接続の話で、メモリの話ではない) | LPDDR5 [二次](Wikipedia は Max の 2 倍とだけ書く。速度 6400 はプリセット既存の記録) | 800GB/s | 64GB / 128GB | Newsroom https://www.apple.com/newsroom/2022/03/apple-unveils-m1-ultra-the-worlds-most-powerful-chip-for-a-personal-computer/ 、Support https://support.apple.com/en-us/111900 |
| apple-m2 | [二次]: Wikipedia「Apple M2」の「SoC and RAM chips are mounted together in a system-in-a-package design」。Newsroom に package の語なし | LPDDR5-6400 [二次] | 100GB/s | 8GB / 16GB / 24GB | Newsroom https://www.apple.com/newsroom/2022/06/apple-unveils-m2-with-breakthrough-performance-and-capabilities/ 、Support https://support.apple.com/en-us/111867 ・ https://support.apple.com/en-us/111837 |
| apple-m2pro | [二次](同上) | LPDDR5-6400 [二次] | 200GB/s | 16GB / 32GB | Support https://support.apple.com/en-us/111340 ・ https://support.apple.com/en-us/111837 |
| apple-m2max | [二次](同上) | LPDDR5-6400 [二次] | 400GB/s | 32GB / 64GB / 96GB(96GB は GPU 38 コア版のみ) | Support https://support.apple.com/en-us/111340 ・ https://support.apple.com/en-us/111835 |
| apple-m2ultra | [二次](同上) | LPDDR5-6400 [二次] | 800GB/s | 64GB / 128GB / 192GB | Newsroom https://www.apple.com/newsroom/2023/06/apple-introduces-m2-ultra/ 、Support https://support.apple.com/en-us/111835 |
| apple-m3 | [公表]: Newsroom「Each chip in the M3 family features a unified memory architecture」「a single pool of memory within a custom package」 | LPDDR5-6400 [二次] | 100GB/s | 8GB / 16GB / 24GB | Newsroom https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/ 、Support https://support.apple.com/en-us/117735 |
| apple-m3pro | [公表](同上) | LPDDR5-6400 [二次] | 150GB/s | 18GB / 36GB | Support https://support.apple.com/en-us/117736 ・ https://support.apple.com/en-us/117737 |
| apple-m3max | [公表](同上) | LPDDR5-6400 [二次] | 400GB/s(16 コア CPU 版)/ 300GB/s(14 コア CPU 版) | 16 コア CPU 版(プリセットの 12P+4E): 48GB / 64GB / 128GB。14 コア CPU 版: 36GB / 96GB | Support https://support.apple.com/en-us/117736 ・ https://support.apple.com/en-us/117737 |
| apple-m4 | [二次]: Wikipedia「Apple M4」の「packaged with LPDDR5X unified memory」(on-package の明記ではない)。Newsroom に package の語なし | LPDDR5X-7500 [二次] | 120GB/s | 16GB / 24GB / 32GB | Newsroom https://www.apple.com/newsroom/2024/05/apple-introduces-m4-chip/ ・ https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/ 、Support https://support.apple.com/en-us/121552 ・ https://support.apple.com/en-us/121555 |
| apple-m4pro | [二次](同上) | LPDDR5X-8533 [二次] | 273GB/s | 24GB / 48GB / 64GB(Mac mini) | Support https://support.apple.com/en-us/121555 ・ https://support.apple.com/en-us/121553 |
| apple-m5 | [二次]: Wikipedia「Apple M5」の「unified memory in a single package」。Newsroom に package の語なし | LPDDR5X-9600 [二次] | 153GB/s | 16GB / 24GB / 32GB | Newsroom https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/ 、Support https://support.apple.com/en-us/125405 |
| apple-m5max | [二次](同上。Newsroom の「advanced packaging」は 2 ダイの接続の話) | LPDDR5X-9600 [二次] | 614GB/s(GPU 40 コア版)/ 460GB/s(GPU 32 コア版) | GPU 40 コア版: 48GB / 64GB / 128GB。GPU 32 コア版: 36GB | Newsroom https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ 、Support https://support.apple.com/en-us/126318 |

[二次] の出典: https://en.wikipedia.org/wiki/Apple_M1 、https://en.wikipedia.org/wiki/Apple_M2 、https://en.wikipedia.org/wiki/Apple_M4 、https://en.wikipedia.org/wiki/Apple_M5 、https://en.wikipedia.org/wiki/Apple_silicon(表の種別・速度)。

補足:
- Support ページの容量は、その機種の標準構成と「Configurable to」(注文時に選ぶ構成)を合わせたもの。機種によって一覧が少し違うことがある(例: M4 Pro は MacBook Pro のページでは M4 Max との組み合わせで書かれるため、Mac mini のページで 24 / 48 / 64GB とした)。
- M3 Max・M5 Max は CPU か GPU のコア数で容量の一覧も帯域も変わる。プリセットの cfg.memory は M5 Max だけ 2 版を併記している。
- Apple の Support ページ・Newsroom のどれにも「LPDDR」の語はない(今回読んだページの範囲で)。

## 3. Intel(Lunar Lake は除外)

| プリセット | オンパッケージ | 種別・速度 | 容量 | 出典・区分 |
|---|---|---|---|---|
| intel-lnl-268v / 258V / 256V | 固定済みのため除外。参考: ARK の項目は「Max Memory Size 32 GB(256V は 16 GB)」「Up to LPDDR5X 8533 MT/s」「2 channels」で、オンパッケージの項目はない | LPDDR5X-8533 [公表] | 型番で 1 つ(258V・268V は 32GB、256V は 16GB は ARK の最大値 [公表]) | ARK https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html |
| intel-ptl-x9-388h / x9-378h / x7-358h | 対象外: ARK にオンパッケージの記述なし(項目は最大 96GB・LPDDR5X-9600・2ch だけ)。Panther Lake にオンパッケージメモリがあるという公式の記述は見つからなかった | LPDDR5X-9600 [公表] | 最大 96GB(容量は PC メーカーが選ぶ) | ARK https://www.intel.com/content/www/us/en/products/sku/245526/intel-core-ultra-x9-processor-388h-18m-cache-up-to-5-10-ghz/specifications.html |
| intel-ptl-x9-386h、u5-325、wcl-c5-320、mtl-185h | 対象外: DDR5 も対応(基板上またはスロット) | ARK の記録のまま | — | プリセット notes の ARK |
| デスクトップ・HX・Arrow Lake H 等 | 対象外(DDR4/DDR5 スロット) | — | — | — |

## 4. AMD・Qualcomm(PC)

| プリセット | 判定 |
|---|---|
| amd-strixhalo-395(LPDDR5X-8000・256bit・最大 128GB) | 対象外: AMD 公式にオンパッケージの記述は見つけられなかった。メモリは基板上にはんだ付け(PC メーカーが選ぶ)とした。今回、AMD の原ページは読んでいない |
| amd-strix-hx370、kraken-350、7840HS、7735HS、5800U ほか | 対象外(DDR5 / LPDDR5X を基板またはスロット) |
| qc-8cx-gen3(Windows ノート) | 対象外: 公式にオンパッケージの記述はなく、メモリは基板上とした |

Snapdragon X 系(X Elite など)のプリセットはない。

## 5. NVIDIA

| プリセット | オンパッケージ | 種別・速度 | 容量 | 出典・区分 |
|---|---|---|---|---|
| nv-orin-agx | 対象外: メモリは Jetson モジュール(SoM)の基板上 | LPDDR5・256bit [公表] | モジュールの型番で決まる(32GB / 64GB) | https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ |
| nv-thor | 対象外: SoM 上 | LPDDR5X・256bit [公表] | モジュールで決まる | https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/ |
| nv-t239 | 対象外: Switch 2 本体の基板上とした。Nintendo 公式にメモリの記載はない(未取得) | LPDDR5X は [二次] | 未取得 | https://www.nintendo.com/jp/hardware/switch2/specs/index.html |
| nv-gb10 | 未取得: ホワイトペーパーではパッケージは FCBGA・31×50mm、S-die と G-die の 2 ダイを 2.5D で接続(docs/research/nvidia-gb10.md の記録、[公表])。DRAM がパッケージ内か基板上かを公式で確認できなかった(今回 PDF の本文は抽出できなかった。検索結果では「soldered」とだけ書かれ、どちらとも読める) | LPDDR5X-8533・256bit・273GB/s [公表](既存の記録) | 128GB(DGX Spark)/ 64GB(OEM・64GB 版)の 2 構成 [公表](既存の記録) | https://www.nvidia.com/content/dam/en-zz/Solutions/dgx-spark/nvidia-gb10-superchip-whitepaper.pdf 、https://docs.nvidia.com/dgx/dgx-spark/hardware.html |

## 6. スマホ SoC(Apple A、Snapdragon、Dimensity)

- 一般にメモリは PoP(SoC パッケージの上に DRAM パッケージを重ねる)だが、どのベンダーの公式ページにも PoP の記載はなかった(Qualcomm・MediaTek の製品ページは種別・速度・最大容量だけ。プリセット notes の 2026-11-07 公式照合の記録)。
- 容量は端末メーカーが選ぶ。Qualcomm・MediaTek が出しているのは最大容量(例: 8 Elite は最大 24GB)だけ。
- Apple A シリーズは iPhone の RAM 容量自体を公式に出していない(cfg.memory も null)。
- 以上から、固定の対象にはしない(オンパッケージは未取得、容量は複数で公式の一覧もない)。

## 7. 要約

- 固定してよい(オンパッケージを公式で確認済み): Apple M1、M3、M3 Pro、M3 Max。ただし容量はどれも複数の構成がある。
- 容量が複数のもの: Apple M シリーズ 15 件すべて(§2 の表)、GB10(64 / 128GB)。容量が型番で 1 つに決まるのは Lunar Lake だけ(除外済み)。
- 未確認のもの:
  - Apple M1 Pro・M1 Max・M1 Ultra・M2 系 4 件・M4・M4 Pro・M5・M5 Max。オンパッケージの根拠は [二次] だけで、Apple 公式の文言は見つからなかった。
  - Apple の全 M 系の種別(LPDDR)・速度(MT/s)。Apple は非公表で [二次]。
  - GB10 がオンパッケージかどうか。
  - スマホ SoC の PoP。
