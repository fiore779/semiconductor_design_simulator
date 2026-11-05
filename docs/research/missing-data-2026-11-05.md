# 取得できていなかったデータの追加取得と、入れなかった値の記録(2026-11-05)

ユーザー指示(2026-11-05)「ほかの取得できていないデータがあるチップもできるだけ集めてください」。調査担当 3 名の結果のうち、根拠のあるものだけを `data/presets/chips-pc.js`・`chips-soc.js` に入れた。推測・計算値・出典不明の値・食い違いが解けていない値は入れていない(**例外: M1 のメモリ帯域 68.25GB/s のみ、Apple 非公表で 4266MT/s × 128bit からの計算値。notes に計算値と明記**)。設計書は §2.7.7(この調査の要約と評価への影響)。

区分: ARK・メーカー公式 = pub(公表)、TechPowerUp・Wikipedia・Notebookcheck・Linux DTS 等 = sec(二次)、Eclectic Light の powermetrics 周波数 CSV・sysctl・Notebookcheck の測定 = meas(実測)。各値の出典 URL・区分・原ページ確認の有無は、プリセットの notes に書いた(JS 文字列中の `'` は `\'`)。

## 1. 入れた値

### 1.1 Intel(pub。Intel ARK の原ページを Chrome で確認)
URL は https://www.intel.com/content/www/us/en/products/sku/ に続く番号(13900K = 230496、268V = 240958、258V = 240957、256V = 240954、275HX = 242293、388H = 245526。388H と 7 系以外の製品名部分の slug は notes に書いたものだけ。388H の slug は未記録)。

| 製品 | 項目 | 旧 → 新 | 備考 |
|---|---|---|---|
| Core i9-13900K | E 最大ターボ | 未取得 → 4.3GHz | |
| 同上 | E ベース | 2.0 → **2.2GHz** | **既存値と食い違い**。ARK が公表する値なので ARK を採用し、旧値 2.0 は notes に残した(旧値は出典を確認していなかった) |
| Core Ultra 7 268V・258V・256V | P ベース | 未取得 → 2.2GHz | |
| 同上 | LP-E ベース / 最大ターボ | 未取得 → 2.2 / 3.7GHz | |
| Core Ultra 9 275HX | E ベース / 最大ターボ | 未取得 → 2.1 / 4.6GHz | |
| Core Ultra X9 388H | P ベース | 未取得 → 2.1GHz | P の最大ターボ 5.1 は既存と一致 |
| 同上 | E ベース / 最大ターボ | 未取得 → 1.6 / 3.8GHz | |
| 同上 | LP-E ベース / 最大ターボ | 未取得 → 1.6 / 3.7GHz | |

386H・378H・358H・12700K などのクロックは ARK と一致済みで変更なし。

メモリ(ARK、pub): 文字列は「…(Intel ARK [公表]。2 チャネル)」の書式(14900K・285K の既存書式に合わせた)。電力モデルの `memChannels()` は `(\d+)\s*ch` を読むため、**「2ch」と書くと電力・温度が変わる**ので、全角日本語の「N チャネル」とした。

| 製品 | memory |
|---|---|
| 12700K・12600K・12100 | DDR5-4800 / DDR4-3200, 最大 128GB |
| 13700K・13600K・14700K・14600K・14700HX(ARK ID 235997) | DDR5-5600 / DDR4-3200, 最大 192GB |
| 275HX | DDR5-6400, 最大 256GB |
| 258V | LPDDR5X-8533, 最大 32GB(「オンパッケージ」は ARK の記述ではないので書かない) |
| 256V | LPDDR5X-8533, 最大 16GB |
| 386H | LPDDR5X-9600 / DDR5-7200, 最大 128GB |
| 378H・358H | LPDDR5X-9600, 最大 96GB |

268V の memory('オンパッケージ LPDDR5X-8533, 2ch')は既存のまま変更していない。

### 1.2 AMD(sec。TechPowerUp の原ページを Chrome で確認。https://www.techpowerup.com/cpu-specs/<slug>)
| 製品 | 項目 | 旧 → 新 | slug |
|---|---|---|---|
| Ryzen 7 5800X | P ベース | 未取得 → 3.8GHz | ryzen-7-5800x.c2362 |
| Ryzen AI 7 350 | Zen 5c ベース | 未取得 → 2.0GHz | ryzen-ai-7-350.c4004 |

メモリ(sec): 2600X = DDR4-2933、1500X・Ryzen 3 1200 = DDR4-2666、2400G・2200G = DDR4-2933、7840HS = DDR5-5600 / LPDDR5X-7500、5800U = DDR4-3200 / LPDDR4X-4267、7735HS = DDR5-4800 / LPDDR5-6400、EPYC 7401 = DDR4-2666(8 チャネル)。いずれも「(TechPowerUp [二次]。N チャネル)」の書式。2600X と 1500X の slug は記録が無く未記録(ほかは既存の電力調査と同じ slug)。

IOD 面積(sec): Ryzen 7 7700・Ryzen 9 7950X・Ryzen 7 9700X・Ryzen 9 9950X の IOD(dies の 'IOD')に **117.8mm²**、区分 sec、プロセス tsmc-n6。AMD ISSCC 2023 の発表を Tom's Hardware が表にした値(https://www.tomshardware.com/news/amd-shares-new-second-gen-3d-v-cache-chiplet-details-up-to-25-tbs 、原ページ確認済み)。**TechPowerUp は 122mm²(CPU データベースの I/O Die Size と 2024-07 のニュース https://www.techpowerup.com/324562/amd-granite-ridge-and-strix-point-zen-5-die-sizes-and-transistor-counts-confirmed )、124.7mm²(2022-08 のニュース https://www.techpowerup.com/298338/ )と食い違い、未解決**。Granite Ridge の IOD は Raphael の 6nm cIOD の流用(TechPowerUp 324562 に明記)。floorplan の IOD は縦横比 1.30(`IOD_PLACE`)のまま面積だけ変わる(仮寸法 11.40×8.77mm = 100mm² → 12.37×9.52mm = 117.8mm²)。

### 1.3 Apple(クロックは meas、l2 は sec / meas、メモリは pub + sec)
クロック: Eclectic Light の powermetrics 周波数 CSV(mxfrequencies2.zip)。https://eclecticlight.co/2026/04/13/cpu-core-frequencies-updated-for-all-current-apple-silicon-macs/ 、原ページ確認済み。Linux DTS でも一致。

| チップ | 項目 | 旧 → 新 |
|---|---|---|
| M1 | E 最大 | 未取得 → 2.064GHz |
| M1 Ultra | P / E 最大 | 未取得 → 3.228 / 2.064GHz(M1 Max と同じ周波数段) |
| M2 Pro | P / E 最大 | 未取得 → 3.504 / 2.424GHz |
| M2 Max | E 最大 | 未取得 → 2.424GHz |
| M2 Ultra | P / E 最大 | 未取得 → 3.696 / 2.424GHz(M2 Max と同じ) |
| M5 | super 最大 | 未確定(null) → 4.608GHz(M5 無印。Wikipedia は機種により 4.4〜4.46 の版もある旨を note) |

`cfg.l2`(A シリーズと同じ書式の文字列。**評価・floorplan で使われないこと**を確認した: js/ と tools/ に `cfg.l2` の参照は無い): M1 'P 12MB / E 4MB'、M1 Pro・M1 Max 'P 24MB(12MB×2)/ E 4MB'、M1 Ultra 'P 48MB / E 8MB'、M2 'P 16MB / E 4MB'、M2 Pro・M2 Max 'P 32MB(16MB×2)/ E 4MB'、M2 Ultra 'P 64MB / E 8MB'、M3 'P 16MB / E 4MB'、M3 Pro 'P 16MB / E 4MB'(既存 notes と同値。Linux DTS t6030 でも一致。当初は足さなかったが、M3 Max の notes にも L2 があり揃わないため同日追加)、M3 Max 'P 32MB(16MB×2)/ E 4MB'、M4 'P 16MB / E 4MB'、M4 Pro 'P 32MB(16MB×2)/ E 4MB'、M5 'S 16MB / E 6MB'、M5 Max 'S 16MB / P 16MB(8MB×2)'。M 系 15 件すべてに入った。DTS は sec、sysctl は meas(URL は調査担当が記録せず未記録)。

SLC(**notes に記録のみ**。別キー `slcMB` は足さない。SLC は別階層で perf・power の L3 計算の対象外、設計書 §5.3.0「L3 容量の取得と反映」の方針): M1 8MB、M1 Pro 24、M1 Max 48、M1 Ultra 96、M2 8、M2 Pro 24、M2 Max 48、M2 Ultra 96、M3 8、M3 Pro 12(既存)、M3 Max 48(既存)、M4 8、M5 8、M5 Max 48。Wikipedia 等の [二次]・多くは出典なし。M4 Pro と A17 Pro の SLC は未取得。

メモリ(帯域は Apple Support [公表]、種類・速度・バス幅は Wikipedia [二次]。**「ch」表記なし**): M1 'LPDDR4X-4266, 128bit, 68.25GB/s'(帯域は Apple 非公表で 4266 × 128bit からの計算値と note)、M1 Pro 'LPDDR5-6400, 256bit, 200GB/s'、M1 Max '…512bit, 400GB/s'、M1 Ultra '…1024bit, 800GB/s'、M2 '…128bit, 100GB/s'、M2 Pro '…256bit, 200GB/s'、M2 Max '…512bit, 400GB/s'、M2 Ultra '…1024bit, 800GB/s'、M3 '…128bit, 100GB/s'、M3 Pro '…192bit, 150GB/s'、M3 Max '…512bit, 400GB/s'(プリセットは 16 コア = 12P+4E で 40 コア GPU 版。14 コア版は 384bit・300GB/s と note)、M4 'LPDDR5X-7500, 128bit, 120GB/s'、M4 Pro 'LPDDR5X-8533, 256bit, 273GB/s'、M5 'LPDDR5X-9600, 128bit, 153GB/s'、M5 Max 'LPDDR5X-9600(GPU 40 コア版: 512bit・614GB/s / GPU 32 コア版: 384bit・460GB/s)'(**プリセットは GPU 構成を持たず dies も空で、どちらの版か決められないため両方を書いた**)。Apple Support の URL は notes に書いた(support.apple.com/en-us/<番号>)。A 系のメモリは入れない。

### 1.4 MediaTek(pub。MediaTek 公式ページの原ページを確認)
**l3MB には入れず notes に L3 / SLC を記録**(設計書の方針)。Dimensity 9000 L3 8MB・SLC 6MB、9200 L3 8MB・SLC 6MB(**sec、Notebookcheck。公式に記載なし**)、9300 は公式が L3 + SLC の合計 18MB(内訳 L3 8MB・SLC 10MB は Notebookcheck がプレスリリースを引用したもの)、9400 L3 12MB・SLC 10MB、9500 L3 16MB・SLC 10MB、9600 Pro L3 16MB・SLC 10MB、8200 L3 4MB。

memory(pub): 9000 'LPDDR5X-7500, 64bit'、9200 'LPDDR5X-8533, 64bit'、9300 'LPDDR5T-9600, 64bit, 76.8GB/s'、9400 'LPDDR5X-10667, 64bit, 85.3GB/s'、9500 'LPDDR5X-10667, 64bit, 85.3GB/s'、9600 Pro 'LPDDR6-10667 / LPDDR5X-10667'、8200 'LPDDR5-6400, 64bit, 51.2GB/s'。公式ページの個別 URL は 9000 のもの(https://www.mediatek.com/products/smartphones-2/mediatek-dimensity-9000)以外は調査担当が記録せず未記録。

### 1.5 Qualcomm(sec。**l3MB には入れず notes に記録**)
- L3(SLC): 855 L3 2MB(SLC 3MB。Notebookcheck は L3 5MB で合計と整合)、865 L3 4MB(SLC 3MB)、888 L3 4MB(SLC 3MB。Notebookcheck は 3MB と食い違い)、8 Gen 1 L3 6MB(SLC 4MB)、8+ Gen 1 L3 6MB(SLC 4MB)、8 Gen 2 L3 8MB(SLC 4MB)、8 Gen 3 L3 12MB(Android Authority・ComputerBase。Notebookcheck は 8MB と食い違い)、8cx Gen 3 L3 8MB・SLC 6MB(Wikipedia・Notebookcheck・Chips and Cheese・IT之家)、8 Elite は L3 なし・L2 12MB × 2 クラスタ・SLC 8MB、8 Elite Gen 5 は L3 なし・L2 24MB(Notebookcheck)・SLC 8MB、8 Elite Extreme Gen 6 は L3 なし・L2 16MB 全コア共有・SLC 8MB(Beebom。無印 Gen 6 は 6MB)。720G の SLC 1MB は Wikipedia のみ。
- memory(sec。Wikipedia の raw で確認): 855 'LPDDR4X-4266, 64bit, 34.1GB/s'(Wikipedia のみだが Notebookcheck と整合)、865 'LPDDR5-5500 / LPDDR4X-4266, 64bit, 44GB/s'、888 'LPDDR5-6400 / LPDDR4X-4266, 64bit, 51.2GB/s'、8 Gen 1 'LPDDR5-6400, 64bit, 51.2GB/s'、8+ Gen 1 'LPDDR5-6400, 64bit'、8 Gen 2 'LPDDR5X-8400, 64bit, 67.2GB/s'、8 Gen 3 'LPDDR5X-9600, 64bit, 76.8GB/s'、7 Gen 1 'LPDDR5-6400, 32bit, 25.6GB/s'、720G 'LPDDR4X-3733, 32bit, 14.9GB/s'、6 Gen 1 'LPDDR5-5500, 32bit, 22GB/s'、8cx Gen 3 'LPDDR4X-4266, 128bit, 68.3GB/s'。

### 1.6 NVIDIA
Orin(nv-orin-agx)の **l3MB null → 6**(2MB × 3 クラスタ。pub。NVIDIA 製品ページ https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ と Hot Chips 34 のスライド)。System Cache 4MB は L4 扱いで notes。**評価が変わる**(§3)。

## 2. 入れなかった値と理由
- **Kraken Point の面積 195mm²**(TechPowerUp DB、根拠記載なし)、**Core Ultra 9 185H の Base タイル面積**: 未取得のまま。
- **Snapdragon の L3 で食い違いが解けないもの**: 8s Gen 3(8MB と 12MB で割れる。食い違いだけ notes)、8s Gen 4、7+ Gen 3、7 Gen 3、7 Gen 4、7 Gen 1、780G、720G(SLC 1MB は Wikipedia。L3 は未取得)、6 Gen 1、4 Gen 2。
- **Snapdragon のメモリで Wikipedia と Notebookcheck が食い違うもの**: 8 Elite・8 Elite Gen 5・8s Gen 3(入れず、食い違いがあることだけ notes。具体的な両論の値は調査担当の報告に無く、本記録では書けない)。Wikipedia のみ・結合セルのもの(855 を除く 8s Gen 4・7+ Gen 3・7 Gen 3・7 Gen 4・780G・4 Gen 2 など)は入れない。
- **Apple**: A 系のメモリ、A14 の l2、A17 Pro の l2 / SLC、M4 Pro の SLC は未取得のまま。Apple の SLC は別キーを作らず notes のみ。
- **NVIDIA**: T239・GB10 の GB7 は未取得のまま。
- **Intel**: 268V の memory は既存のまま。13900K の P 5.8GHz が ARK の Max Turbo か Turbo Boost Max 3.0 かは未確認(既存の記録どおり)。
- **スマホ SoC の l3MB**: Apple・Qualcomm・MediaTek には**入れていない**(8cx Gen 3 を含む)。

## 3. 評価の前後差(全 102 件の `fromPreset` + `evaluate` を前後でダンプして比較)
変わったのは 18 件。ST の判定(ok = |誤差| ≤ 10%、ng = それ以外、— = 計算不能または公開値なし)と MT を示す。**判定が ok ↔ ng に反転したのは 2 件**。

| プリセット | 変わった項目 | 前 → 後 | 判定 |
|---|---|---|---|
| **Core i9-13900K** | MT | 17941 → 23160(誤差 -21.4% → **+1.5%**) | **ng → ok(反転)** |
| 同上 | 電力推定 | 700.9W → 781.5W(公表ピーク 253W に対し +177.0% → +208.9%) | ✗ → ✗ |
| 同上 | 持続クロック | P 4.10 → 3.92GHz、E 1.42 → 2.90GHz(Tj 100.0℃、電力 211.8W は不変) | — |
| **Nvidia Orin** | MT | 6808 → 5925(誤差 -1.1% → **-13.9%**。以前の ok は L3 未取得時の参照値がスレッド数で割られないことによる見かけ。§6) | **ok → ng(反転)** |
| 同上 | ST | 738.2 → 787.7(-6.6% → -0.3%) | ok → ok |
| Core Ultra 7 268V | MT(新規) | 計算不能 → 9337(-0.6%) | — → ok |
| 同上 | 電力・温度(新規) | なし → 推定 68.2W(ピーク 37W に +84.3%)、Tj 94.3℃、持続 P 3.97 / LP-E 2.94GHz、電力 37.0W | ✗(新規) |
| Core Ultra 7 258V | MT(新規) | 計算不能 → 9146(-0.9%) | — → ok |
| 同上 | 電力・温度(新規) | なし → 推定 90.8W(+145.5%)、Tj 94.3℃、持続 P 3.49 / LP-E 2.69GHz、電力 37.0W | ✗(新規) |
| Core Ultra 7 256V | MT(新規) | 計算不能 → 9146(+2.0%) | — → ok |
| 同上 | 電力・温度(新規) | 258V と同じ | ✗(新規) |
| Core Ultra X9 388H | MT(新規) | 計算不能 → 17373(**+9.8%**。許容 10% の縁) | — → ok |
| 同上 | 電力・温度(新規) | なし → 推定 107.5W(ピーク 80W に +34.4%)、Tj 100.0℃、持続 P 3.25 / E 2.42 / LP-E 2.36GHz、電力 38.7W | ✗(新規) |
| Core Ultra 9 275HX | MT(新規) | 計算不能 → 24319(**+18.6%**) | — → ng |
| 同上 | 電力・温度(新規) | なし → 推定 349.1W(ピーク 160W に +118.2%)、Tj 100.0℃、持続 P 1.82 / E 1.55GHz、電力 38.7W | ✗(新規) |
| Ryzen 7 5800X | 電力(新規) | なし → 推定 185.0W(PPT 142W に +30.3%)。thermal は面積未取得のため ok:false のまま | ✗(新規) |
| Ryzen AI 7 350 | 電力(新規) | なし → 推定 162.4W(base 28W で校正。ピーク未取得のため差なし)。thermal は ok:false のまま | — |
| Apple M1 Ultra | ST(新規) | 計算不能 → 2184.9(公開値 2220〔中央値〕に -1.6%) | — → ok |
| Ryzen 7 7700 | 面積 / 温度 | 69.5mm²(一部未取得)→ 187.3mm²(全ダイ取得)/ Tj 58.1 → 56.4℃、持続 P 4.3199 → 4.3226GHz | — |
| Ryzen 9 7950X | 面積 / 温度 | 139.0 → 256.8mm² / 電力 207.5 → 211.9W、持続 P 4.669 → 4.695GHz | — |
| Ryzen 7 9700X | 面積 / 温度 | 70.2 → 188.0mm² / Tj 58.1 → 56.4℃、持続 P 4.3199 → 4.3226GHz | — |
| Ryzen 9 9950X | 面積 / 温度 | 140.4 → 258.2mm² / 電力 207.6 → 211.9W、持続 P 4.496 → 4.523GHz | — |
| Apple M1・M2 Pro・M2 Ultra・M5 | 理由文だけ | 「クロック未取得」→「uarch 未指定」/「E コア: 幅・ROB が未取得」(値は不変) | — |

- **新たに MT が出る 5 件(268V・258V・256V・388H・275HX)は TDP 帯別係数(0.69 / 0.76)の標本 11 件の外**。帯の係数の参考として、5 件を含めた 16 件の中央値は帯 0 が 0.6943、帯 1 が 0.7556(丸めると 0.69 / 0.76 のまま不変)。これらの MT 誤差は、帯係数を当て込まずに出た標本外の値(-0.6、-0.9、+2.0、+9.8、+18.6%)。
- **ST が新たに出るのは M1 Ultra だけ**。M1 Ultra は校正の代表でも標本でもない(Firestorm の代表は M1。`calib:true` ではなく、`inUCalSet:false`)。M2 Pro・M2 Max・M2 Ultra・M5 は uarch(P コア)が未指定のため、クロックを入れても ST は計算不能のまま(「クロック未取得」→「uarch 未指定」)。
- **面積・充実度が変わるのは Raphael / Granite Ridge の 4 件のみ**(IOD を入れて「面積一部未取得」が解消し、プリセット一覧の充実度が ◐ → ●。全体の ● は 63 → 67 件)。IOD の電力按分(`heatmap.blockPowers`。全体 100W を割った場合): 7700 は IOD 24.5W → 27.6W(CCD 75.5W → 72.4W)、9950X は IOD 14.2W → 16.3W(CCD 85.8W → 83.7W)。floorplan は IOD の寸法(仮 11.40×8.77mm → 12.37×9.52mm)とブロックだけが変わり、CCD の配置・寸法は不変。
- Orin は L3 のブロックが増えるため floorplan が変わる(`design.layoutCompute` の schematic)。ほかの 69 件の layout・寸法・ブロック・飾りダイは不変(変更前のデータで同じハッシュ値を確認)。
- 持続クロックの警告「電力・温度の制限で持続クロックが下がる見込み」が新たに出るのは 268V・258V・256V・388H・275HX の 5 件。電力推定の値は電力モデルの限界(仮の既定値。base で校正し、推定は最大クロック・電力制限なしの全コア値)であって、値の取り違えではない(設計書 §2.5.1 と同じ)。

### 校正・帯係数が変わらないことの確認
- 校正結果(`ctx.cal`: Lion Cove・Zen 1/4/5・Firestorm・Avalanche・Everest・Cortex-X2/X3/X4/X925・Oryon Prime・Golden/Raptor Cove の u、uIsa、σ、γ、usedPresets)を前後でダンプして**完全に一致**(`JSON.stringify` が同一)。
- MT 帯係数 0.69 / 0.76 は定数のまま不変。`tests/perf.test.js` の帯の標本は 11 件のまま(新たに MT が出る 5 件を除外)。

## 4. 見直し候補(今回は変更せず、notes にも書いていない。ユーザー判断)
既存値と今回の調査値が食い違うもの。
| チップ | 既存 | 調査値 | 出典 |
|---|---|---|---|
| M3 Max の E 最大 | 2.75GHz | 2.568GHz | Eclectic Light の CSV |
| M4 の P / E 最大 | 4.4 / 2.85GHz | 4.464 / 2.892GHz | 同上 |
| M2 の P 最大 | 3.49GHz | 3.504GHz | 同上 |
| M2 Max の P 最大 | 3.7GHz | 3.696GHz | 同上 |
| Ryzen 5 2600X の turbo | 4.2GHz | 4.25GHz | TechPowerUp |

そのほか、M2 Pro・M2 Max・M2 Ultra・M5 は uarch(P コア)が未指定のため ST・MT は計算不能のまま(uarch の登録は今回の範囲外)。

## 5. 固定値の更新
- `tests/fixtures/memory-baseline.json`: 14 件(13900K・268V・258V・256V・388H・275HX・5800X・Kraken Point・7700・7950X・9700X・9950X・M1 Ultra・Orin)。一時スクリプトで再生成(書式 = `JSON.stringify(o, null, 1)` の CRLF、末尾改行なし。前回の書式と同じ)。値が変わったのは上の 14 件だけだが、**nv-gb10・325・320 の 3 項目はキー順がプリセット順に移った**(`JSON.parse` で読むため影響なし)。reproduce と improve の両モードが同一であることも確認。
- `tests/mix.test.js`: BASE(13900K・268V・388H・M1 Ultra・Orin)、BASE_M5B(258V・256V・275HX)の ST/MT。IOD を「面積不明の部品」の例にしていたテスト 3 件は Core 5 320 の uncore に替え、IOD は table 117.8mm² を確認。部品ライブラリの既存件数 177 → 178(Orin の L3)。Kraken Point の電力モデルは ok:true に。
- `tests/perf.test.js`: MT の外れ値の一覧から 13900K を外し(+1.5% に入った)、検証 MT(±10%)の一覧から Orin を外し(-13.9%)、既知の外れ値(qc-8elite-gen5 の隣)に Orin を加えて |誤差| > 10% を固定した(理由: 以前の ok は L3 未取得時のフォールバックによる見かけ。§6)。閾値は動かしていない。mixedClock のテストは 13900K の E の boost を外した合成プリセットで確認。TDP 帯別係数の標本から新たに MT が出る 5 件を除外。
- `tests/evaluate.test.js`: 「クロック未取得のコア」の例を M1 から E のクロックを外した複製に替えた。
- `tests/floorplan-scale.test.js`: IOD のテスト(面積 117.8mm²)と評価ハッシュ(3ff6dcc8… → fddc1f9e… → b022617f…(M3 Pro の l2・notes 追加のみ。評価の数値は不変)。評価の数値の変化 + notes の文面変更を含む)。
- `tests/floorplan-snapdragon.test.js`: 70 件の layout ハッシュから Orin を除いた 69 件に(新ハッシュは変更前のデータでも同じ値)。
- `tests/powereval.test.js`・`tests/ui-logic.test.js`: 5800X は電力モデルが出る、7700 の充実度は ●。
- テスト数: 565 → 564(Orin を検証 MT の一覧から外したため)。

## 6. 不確かな点
- ARK の 388H の slug、2600X・1500X の TechPowerUp slug、MediaTek 公式ページの個別 URL(9000 以外)、DTS / sysctl の URL は、調査担当の報告に無く未記録(notes にその旨を書いた)。
- 8cx Gen 3 の L3: 当初の記録(Notebookcheck 8MB / Wikipedia 4MB + SLC 3MB)と、今回の再調査(Wikipedia・Notebookcheck・Chips and Cheese・IT之家が 8MB・SLC 6MB で一致)の間に不整合がある。notes には両方を書いた。
- 8 Elite・8 Elite Gen 5・8s Gen 3 のメモリの食い違いの具体値、Snapdragon のその他の食い違いの原ページは、本記録では確認できない。
- 388H の MT +9.8% は許容 10% の縁。Orin の MT は L3 を入れて -13.9% に悪化した(ST は改善)。**原因(仕組み)**: `js/sim/perf.js` L99 は `l3KB = l3MB*1024/ccds/threads`(スレッドあたり)。l3MB が null のとき `coreCpi`(L48)は参照値 l3Ref = 2048KB を使い、**この参照値はスレッド数で割られない**。HEAD の Orin は MT で「スレッドあたり 2MB(12 スレッド合計 24MB 相当)」で計算されていた。実データ 6MB ではスレッドあたり 512KB。reviewer の再現: l3MB=2 → ST 738.1(-6.6%、HEAD の ST と一致)、l3MB=6 → ST 787.7・MT 5925.3(-13.9%)、l3MB=24 → MT 6807.9(-1.1%、HEAD の MT と一致)。つまり**以前の -1.1%(ok)は未取得時のフォールバックによる見かけ**で、L3 6MB の追加自体は正しくそのまま採用した。同じ仕組みは l3MB を持たない Qualcomm・MediaTek・Apple の SoC で MT が出ている全機種に効いている(スレッドあたり 2MB 扱い = MT が甘い)。判断待ちとして設計書 §13.4 に記録(実装はしない)。
- 電力モデルの推定値(Kraken 162W、275HX 349W など)は仮の既定値によるもので、公表値との大きな差は値の取り違えではない。

## 7. 取得できなかったページ・項目
- Apple: A 系のメモリ、A14 の l2、A17 Pro の l2 / SLC、M4 Pro の SLC。
- NVIDIA: T239・GB10 の GB7。
- Kraken Point の面積(根拠記載なし)、185H の Base タイル面積。
- Snapdragon: L3 の食い違いが解けなかった 10 件(§2)、メモリの食い違いが解けなかった 3 件。
