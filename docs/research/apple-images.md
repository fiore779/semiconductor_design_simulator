# Apple シリコンのダイ写真(ユーザー提供、2026-11-01)

ユーザーが `C:\LocalAI\画像` に追加した画像の確認結果。区分はすべて **[二次]**(第三者の注釈画像・Apple の公式画像の転載)。
- 「目測」= このプロジェクトで画像のピクセルから読んだ値(枠の読み取りで ±5〜10% 程度の誤差を見込む。面積比は 5% 刻み程度の粗さ)。
- 「推定」= ファイル名・投稿 ID・透かしからの推定で、**出典は確定していない**。
- 画像内に面積(mm²)や寸法の注記がある場合は、それを転記して目測より優先する。
- ページ本文は取得していない(画像そのものだけが根拠)。

## (a) 画像ごとの表

寸法は実ファイルの画素数。`A3QSjPxt4…jpg`・`CfQArDx7…png`・`image-1793455459066.jpg` は拡張子と違い **中身は WebP**(読み込み時に注意)。

| # | ファイル | 寸法 (px) | チップ(画像内の表記) | 注釈 | ダイ全体 | 読み取れるブロック | 使えるか |
|---|---|---|---|---|---|---|---|
| 1 | `FCBl1gcWEAUOdRw.jpg` | 4096×2458 | **M1 / M1 Pro / M1 Max**(+ PS5 の諸元表) | あり(色分け+ラベル。"Compiled and annotated by Locuza, October 2021"、"chip images from Apple via Anandtech") | 3 チップとも切れずに写る | P コア(PERF CPU Core)、E コア(EFF CPU)、L2(12MB×2 / M1 は 12MB)、GPU コア(128 EUs)・GPU MISC、SLC(M1 8MB、Pro/Max は "16MB(?)" ×2/×4)、16 Core Neural Engine(Max は 2 か所)、Media Engine(Max は 2 か所)、LPDDR4X/LPDDR5 Memory PHY | **使える**(M1・M1 Pro・M1 Max の配置) |
| 2 | `Figure3_M1_family_chip_photo_comparison_20220516-1-1024x592.png` | 1024×592 | **M1 / M1 Pro / M1 Max / M1 Ultra** | なし(ブロック名なし。表に面積・寸法・トランジスタ数) | 4 チップとも全体 | ブロックは読めない。表: M1 118 mm²(10.9×10.9)、M1 Pro 245 mm²(18.9×12.9)、M1 Max 432 mm²(19.3×22.4)、M1 Ultra 864 mm²(19.3×44.8)。"drawn at almost the same scale" | **使える(縦横比・相対寸法のみ)**。配置は #1 を使う |
| 3 | `CfQArDx7gRsAo3U5xpXsTC-750-80.png`(中身 WebP) | 750×392 | **A14 / M1** | あり(黄色の枠とラベル、色分けなし) | 両方全体 | A14: GPU(上)、System cache、CPU 1(P)×2・L2 cache CPU1、CPU 2(E)×4・L2 cache CPU 2、NPU(下)、DDR。M1: CPU 1(P)×4・CPU 2(E)×4・L2、NPU、System cache、GPU(下)、DDR | **使える(A14)**。M1 は #1 の方が詳しい。解像度が低い |
| 4 | `69502024-a55e-4ceb-bbd4-0cf1193153d8_1024x421.jpg` | 1024×421 | **M1 / M2 / A15** | あり(色分け+ラベル。Locuza と SemiAnalysis の透かし) | 3 チップとも全体 | GPU Core 128 FP32・GPU MISC、P-CPU(Firestorm / Avalanche)・P-AMX・L2$、E-CPU(Icestorm / Blizzard)・E-AMX・4MB L2$、SLC(M1/M2 8MB、A15 32MB=16MB×2)、16 Core Neural Engine、LPDDR PHY、I/O PHY。**画像内の面積: M1 = 118.91 mm²、M2 = 155.25 mm²(Apple presented scaling ~141.70 mm²)、A15 = 107.68 mm²** | **使える(M2・A15)**。低解像度で細かいラベルは判読困難 |
| 5 | `FmsTp7NWIAAfVjB.jpg` | 900×794 | **M2 Pro** | あり(色分け+ラベル。High Yield) | 全体と見られる(上端がダイ端に接しており、上端のわずかな欠けは否定できない) | CPU big-cores 8(core 0〜7)と共有 L2($)、CPU LITTLE-cores 4・E-AMX、GPU 19 コア(core 0〜18)・GPU MISC、SLC ×2(GPU の左右)、16-core NPU、Media Engine ×2、LPDDR5 ×2(左右端) | **使える** |
| 6 | `A3QSjPxt4oYcYuy8i6kRtX-1200-80.jpg`(中身 WebP) | 1200×712 | **M3 / M3 Pro / M3 Max**(TSMC N3B。25bn / 37bn / 92bn transistors) | あり(色分け+ラベル。High Yield) | 3 チップとも全体 | P-core 4/6/12・P-core cache、E-core 4/6/4・AMX・$、GPU 10/18/40・GPU MISC、SLC、NPU、Display Engine、Thunderbolt、LPDDR5(128/192/512-bit) | **使える**。3 枚が同じ縮尺かは不明(相対の大きさには使わない) |
| 7 | `GQmKpHhWwAAMHfw.jpg` | 1862×1141 | **M4**(28 billion transistors、N3E) | あり(枠+ラベル。Frederic_Orange) | 全体(右下・下端まで写る) | GPU1〜10・GPU MISC、CPU Perf1〜4(2 個ずつ 2 か所)・Perf CPU cache・AMX、CPU Eff eco1〜6・Eco CPU cache・AMX、SLC cache、Neural Engine、Media Engines、Display Engine、Thunderbolt ×4、I/O、LPDDR5X 1〜8(128 bit) | **使える**。ただし画像内の "Die zise: 1.28mm x1,21mm" は単位が明らかに誤り(→ (c)) |
| 8 | `HS9wa9vbgAAb2Mm.jpg` | 4054×4096 | **M5**("Apple Silicon M5 \| TSMC N3P") | あり(白枠+ラベル。作者名の表記なし) | 全体 | GPU core ×10("with ANE Accelerator")・Apple G17G Graphics 1620MHz・512KiB L2 ×4、Hidra S-core ×4(4.6GHz)・1MiB Private L2C ×4・8MiB Shared L2 ×2・L2 Tags/Control・S-core AMX、Hidra E-core ×6(3.04GHz)・6MiB L2・E-core AMX、16MiB SLC(4MiB×4)、ANE ×8・2MiB ANE Cache・Apple Neural Engine(H17)、ProRes RAW Codec、Media Engine、Decode/Encode Engine、Apple ISP、DSP、Display Engine、Secure Enclave、Thunderbolt 4 Controller/PHY ×4、PCIe Gen4x3、USB3、CSI、16bit LPDDR5X-9600 PHY ×8 | **使える**(最も詳細) |
| 9 | `m6 HT9pyHnWYAAM3HY.jpg` | 3116×2952 | **チップ名の表記なし**。ファイル名は "m6" だが、**配置は #8(M5)とブロック単位で一致**(→ (c)) | あり(色分け+ラベル。semianalysis の透かし) | 全体(画像の枠 ≒ ダイの枠) | GPU Core 1〜10・GPU Shared Logic、S-Core 1〜4・1MB L2$・8MB shared L2 ×2・S-Core AMX、E-Core 1〜6・6MB shared L2・E-Core AMX、4MB SLC ×4・Tags・SLC Ctrl、ANE Core 1〜8・ANE Cache・ANE Ctrl、Display Engine ×2、TB4 PHY ×4、Display PHY、PCIe HS-PHY、Camera PHY、16-bit LPDDR5X MEM PHY ×8 | **使えるが条件つき**: M5 として使う(M6 とはしない)。チップの特定はユーザー確認が必要 |
| 10 | `HJ2AUyOakAAixSS.jpg` | 1196×618 | **M5 Pro の CPU タイル**(手書き "M5 Pro CPU Tile A0A0") | あり(手書きの白枠+ラベル。透かし「@高通吧」) | 全体と見られる(下端に "SoIC-MH" の帯=接合部) | P-Core(Sotra-P 4.61GHz)×6・PLLC Block 8MB ×2・PLLC SL・P-AMX/SME、M-Core(Sotra-M 4.38GHz)×12・MLLC Block 4MB ×2・MLLC SL・MLLC 8MB・E-AMX/SME ×2、ANE Core(左下。個数は判読しきれない)・ANE Cache 2MB・ANE Front-End、ISP、Display Engine、DSP、Video Engine ×4、Security Enclave 6MB、Thunderbolt 5/USB4 ×4、PCIe 5.0×8・PCIe Controller | **使えるが条件つき**(手書き注釈で信頼度は低め。M5 Pro のプリセットは無い。CPU 構成は M5 Max プリセットと一致 → (b)) |
| 11 | `HJ2AUyNaIAEinLl.jpg` | 1192×504 | **M5 Pro の GPU タイル**(手書き "GPU Tile M5 Pro A0A0") | あり(手書き。透かし「@高通吧」) | 全体と見られる(上端に "SoIC-MH" の帯) | GPU Core 1〜20、GPU L2 Cache 4MB("Apple 10 GPU SL 1.62GHz")、memory Cache 12MB ×2、LPDDR5X-9600 PHY(左 128bit、右 96bit+32bit)、Video Engine、ProRes ×2 | **使えるが条件つき**(#10 と同じ理由。M5 Max の GPU タイルではない) |
| 12 | `0_xSrDbHu5rDBXfqDp.jpg` | 1400×788 | "new M5 Max" ×2 → "next M5 Ultra"(Frederic_Orange、"The next Apple Silicon chip") | ブロック名なし("Fusion Architecture – Cu-Cu bonding"、"Ultra Fusion – LSI" の帯のみ) | 図としては全体 | 読めない。図柄は Apple の M1 Max/Ultra の公式画像に似ており(目視の印象)、**実ダイ写真ではなく想像図** | **使えない**(配置の根拠にしない。M5 Max を 2 層に分ける構成の参考図としてのみ) |
| 13 | `l_tm1989_m1pro_max_05.jpg` | 950×534 | **M1 PRO**(Apple 発表資料の模式図) | Neural Engine・Memory Cache・Secure Enclave・Thunderbolt I/O・Display Engine のラベル | 図としては全体 | 上記 5 ブロックのみ。CPU・GPU は線画のみ | **使えない**(Apple の様式化した模式図で、#1 のダイ写真と配置が一致しない) |
| 14 | `tm1989_m1pro_max_13.jpg` | 590×332 | **M1 PRO**(同上。CPU 部分を強調) | "8 high-performance cores / 2 high-efficiency cores" とキャッシュ容量の文字 | 図としては全体 | CPU ブロック(左上)の位置のみ | **使えない**(同上。キャッシュ容量の文字は諸元として参考) |
| 15 | `image-1793455459066.jpg`(2026-10-31、中身 WebP) | **1682×846** | **Apple ではない。Intel の 8P+8E ダイ(Alder Lake-S、12900K 系と推定)** | あり(色分け: Platform I/O・Uncore・P Cores 4×2 段・L3 Cache & Ringbus・E Cores 上下・iGPU) | 全体 | 左記のとおり | 用途: **user-images.md にある「会話に貼られた 12900K の注釈写真」(枠 1682×846 px、`HY_ADL`)と寸法が完全一致**。そのファイルである可能性が高い(推定・要ユーザー確認)。ファイル名の数字はミリ秒の時刻で 2026-10-31 23:04(JST)= ファイルの更新時刻と一致 |

### 出典の推定(すべて「推定・要ユーザー確認」。確定ではない)

必要な画像リスト.md の Apple の行の URL(10 件)との対応。根拠はファイル名・透かし・X(Twitter)の投稿 ID から計算した投稿日・画像の作者表記。

| URL(ユーザー記載) | 投稿 ID からの日付 | 対応すると推定する画像 | 根拠 |
|---|---|---|---|
| https://www.tomshardware.com/news/apple-m1-vs-apple-m14-floorplans | — | #3 `CfQArDx7…png` | Tom's Hardware の画像 CDN 形式(`-750-80`)、内容が A14 と M1 の比較 |
| https://x.com/Locuza_/status/1450271726827413508 | 2021-10-19 | #1 `FCBl1gcWEAUOdRw.jpg` | X の画像 ID 形式、"annotated by Locuza, October 2021" と日付が一致 |
| https://hacarus.com/ai-lab/05202022-m1-ultra/ | — | #2 `Figure3_…20220516…png` | ファイル名の日付 20220516 と M1 Ultra を含む比較表 |
| https://x.com/highyieldYT/status/1615407009334960129 | 2023-01-17 | #5 `FmsTp7NWIAAfVjB.jpg`(M2 Pro) | High Yield の作者表記、M2 Pro の発表時期(2023-01)と一致 |
| https://newsletter.semianalysis.com/p/apple-m2-die-shot-and-architecture | — | #4 `69502024-…_1024x421.jpg` | Substack の画像名形式(UUID_幅x高さ)、SemiAnalysis の透かし、M2 を含む |
| https://www.tomshardware.com/news/annotated-apple-m3-processor-die-shots-bring-chip-designs-to-life | — | #6 `A3QSjPxt4…-1200-80.jpg` | Tom's Hardware の CDN 形式(`-1200-80`)、M3 ファミリーの注釈画像 |
| https://x.com/Frederic_Orange/status/1804125571670036831 | 2024-06-21 | #7 `GQmKpHhWwAAMHfw.jpg`(M4) | Frederic_Orange の作者表記、M4(2024-05 発表)の時期 |
| https://x.com/ExoticSpice101/status/2061945306812711226 | 2026-06-02 | #8・#9・#10・#11 のどれか(特定できない) | X の画像 ID 形式であることのみ |
| https://x.com/HiEq_2005/status/2103023340747460943 | 2026-09-24 | 同上 | 同上 |
| https://x.com/handleym99/status/2107559061499916462 | 2026-10-06 | 同上 | 同上 |
| (一覧に無い) | — | #12 `0_xSrDbHu5rDBXfqDp.jpg` | Medium 形式のファイル名、Frederic_Orange の表記。URL は未記載 |
| (一覧に無い) | — | #13・#14 `tm1989_…jpg` | ITmedia の画像名形式(`l_tm1989_…`)と推定。URL は未記載 |
| (一覧に無い) | — | #15 `image-1793455459066.jpg` | user-images.md の 12900K の行の TechPowerUp の URL の可能性(未確認) |

- #10・#11 は透かし「@高通吧」(百度贴吧の Qualcomm 板)で、X の投稿は転載の可能性がある。#8 は作者表記なし、#9 は semianalysis の透かしだが SemiAnalysis の URL は M2 の記事しか記載されていない。
- X の画像 ID の英字部分(HJ2… < HS9… < HT9…)は投稿順の目安になりうるが、ID の対応は確かめていない。

### 目測: 縦横比と主要ブロック(ダイに対する面積 %)

縦横比 = 幅 / 高さ(画像の向きのまま)。面積 % は各ブロックの外接枠をダイの枠に対して読んだ値(目測)。合計は 100% にならない(残りは配線・その他の IP・未注釈部分)。

| チップ(画像) | 縦横比 | 並び(目測) | 面積比(目測) |
|---|---|---|---|
| M1(#1) | 1.00(#2 の注記 10.9×10.9 と一致) | 上: GPU(左〜中)と Media Engine(右上)。中左: P コア 4(上 2・下 2)と L2、中央: SLC 8MB と NPU、E コア 4 は NPU の右。上端と右端に Memory PHY | GPU 約 25%、P コア+L2 約 13%、E コア+L2 約 2%、NPU 約 5%、SLC 約 5%、Media 約 9%、Memory PHY 約 9% |
| M1 Pro(#1) | 1.47(#2 の注記 18.9×12.9 = 1.47 と一致) | 上中央: P コア 8(上 4・下 4)と L2、その左上に E コア 2+4MB L2。右: Media Engine、NPU。下中央: GPU 16 とその左右に SLC、左右端に LPDDR5 PHY | GPU 約 22%、SLC 約 10%、P コア+L2 約 14%、E コア 約 1%、NPU 約 3%、Media 約 5%、Memory PHY 約 10% |
| M1 Max(#1) | 0.92(#2 の注記 19.3×22.4 = 0.86 とずれる → (c)) | 上部は M1 Pro と同じ並び(P 8・E 2・Media・NPU)。下に GPU 32(16×2 段)と左右の SLC ×4、最下段に 2 つ目の NPU・Media Engine。左右端に LPDDR5 PHY | GPU 約 27%、SLC 約 12%、P コア+L2 約 8%、NPU ×2 約 3%、Media ×2 約 5%、Memory PHY 約 12% |
| M1 Ultra(#2) | 0.43(注記 19.3×44.8 = 0.43。画像も 0.43) | M1 Max の上下 2 つ(中央に接合部) | 注釈なし(M1 Max ×2) |
| M2(#4) | 1.09 | 上: GPU 10 と GPU MISC。中: P コア 4 と L2(左)、SLC 8MB(中央)、E コア・P-AMX・E-AMX。下中央: NPU、下端に I/O PHY | GPU 約 25%、P コア+L2 約 11%、SLC 約 4%、NPU 約 5%、E コア 約 2% |
| A15(#4) | 0.68 | 上: GPU、その下に 32MB SLC(16MB×2)、中: P-CPU 2・6MB L2 ×2、E-CPU 4・4MB L2、下: NPU 16 Core、下端に I/O PHY | GPU 約 20%、SLC 約 6%(低解像度のため粗い) |
| A14(#3) | 0.85 | 上: GPU、中: System cache、CPU 1(P)2 と L2、CPU 2(E)4 と L2、下: NPU | ラベルのみで枠が粗く、面積比は読まない |
| M2 Pro(#5) | 1.51 | 上中央: P コア 8(4×2)と中央の共有 L2、左上: E コア 4、右: Media Engine ×2・NPU。下: GPU 19(中央)とその左右に SLC、左右端に LPDDR5 | GPU 約 22%、SLC 約 8%、P コア+L2 約 13%、E コア 約 2%、NPU 約 3%、Media 約 5%、LPDDR5 約 11% |
| M3(#6) | 1.18 | 上: GPU 10・GPU MISC(上端に LPDDR5)。中: P コア(上 2・下 2)と P-core cache、SLC、E コア 4・AMX。左下: NPU、右: Display Engine、下: Thunderbolt | GPU 約 27%、P コア+cache 約 16%、SLC 約 4%、E コア 約 5%、NPU 約 2%、LPDDR5 約 7% |
| M3 Pro(#6) | 0.89 | 上: GPU 18・GPU MISC と SLC。中右: P コア 6(上 2・下 4)と P-core cache、E コア 6・AMX、NPU。左: Display Engine ×2。左右端に LPDDR5 | GPU 約 34%、SLC 約 3%、P コア+cache 約 13%、E コア 約 3%、NPU 約 1%、LPDDR5 約 8% |
| M3 Max(#6) | 0.96 | 上: P コア 12(上 8・下 4)と P-core cache、左上に NPU・E コア 4、右上に Display Engine、上端に I/O・Thunderbolt。下: GPU 40・GPU MISC と左右の SLC、左右端に LPDDR5 | GPU 約 35%、SLC 約 9%、P コア+cache 約 10%、E コア 約 1.5%、NPU 約 1.5%、LPDDR5 約 12% |
| M4(#7) | 0.97 | 上: GPU 10・GPU MISC(上端・左右に LPDDR5X)。中左: CPU Perf 1・2、Perf CPU cache、Perf 3・4(左端に Neural Engine)。中央: SLC、E コア 6・Eco CPU cache。右: Media Engines、Display Engine。下: Thunderbolt ×4・I/O | GPU 約 21%、P コア 約 7.5%+Perf cache 約 4%、E コア+cache 約 4%、SLC 約 4.5%、NPU 約 3.5%、Media 約 2%、Display 約 3%、Thunderbolt 約 6% |
| M5(#8。#9 も同じ配置) | 1.055(#9 も 1.056) | 上 2 段: GPU 10(6+4)と中央の G17G・L2(上端・右に LPDDR5X PHY)。中左: S-core 2(上)・8MiB L2 ×2・S-core 2(下)、S-core AMX。中央: 16MiB SLC(4 枚)、E-core 6・6MiB L2・E-core AMX。左下: ANE 8・ANE cache。右: ProRes RAW・Media・Decode/Encode Engine・ISP。下: DSP・Display Engine・Secure Enclave、下端に TB4 ×4・PCIe・USB3・CSI | GPU 約 25%、S コア(4、private L2 込み)約 9%、8MiB L2 ×2 約 4%、E コア+L2+AMX 約 5%、SLC 約 5%、ANE 約 4%、メディア/ISP/コーデック群 約 20%、Memory PHY 約 6%、下端の TB4・I/O 約 10% |
| M5 Pro CPU タイル(#10) | 1.94 | 左: Display Engine・ISP・ANE。中左: P コア 6(上 3+1 の詳細・下 2)と PLLC 8MB ×2。中央: M コア 6・MLLC 4MB ×2。右: M コア 6・MLLC 8MB、DSP、Video Engine ×4、Security Enclave。上端: PCIe 5.0×8・Thunderbolt 5 ×4。下端: SoIC-MH | P コア+PLLC 約 21%、M コア+MLLC 約 18% |
| M5 Pro GPU タイル(#11) | 2.37 | 中央: GPU 20(左右 10 ずつ)と中央下の GPU L2 4MB。左右: memory Cache 12MB、さらに外側に LPDDR5X PHY。上: Video Engine・ProRes ×2(上端に SoIC-MH) | GPU 約 45%、memory cache 約 10%、LPDDR5X PHY 約 12%、Video/ProRes 約 7% |

## (b) プリセット別の対応表

プリセットは `data/presets/chips-soc.js`(M シリーズ 15 件、A シリーズ 10 件)。「縦横比の整合」= プリセットの面積(変えない)に画像の縦横比を当てたときの寸法。

### M シリーズ(15 件)

| id | 名前 | ダイ面積(プリセット) | コア構成(プリセット) | 使える画像 | 縦横比と整合 | 提案 |
|---|---|---|---|---|---|---|
| apple-m1 | M1 | 123.0 mm²(meas) | P4(Firestorm)+E4 | **直接**: #1(配置)、#2(寸法)、#3・#4(補助) | 1.00 → 11.09×11.09 mm。#2 の 118 mm²・#4 の 118.91 mm² とは面積が 4% ほど違うが比は整合 | **photo** |
| apple-m1pro | M1 Pro | 253.2 mm²(meas) | P8+E2 | **直接**: #1、#2 | 1.465 → 19.26×13.15 mm。#2 は 245 mm²(18.9×12.9) | **photo** |
| apple-m1max | M1 Max | 432 mm²(sec) | P8+E2 | **直接**: #1、#2 | #2 の 19.3×22.4(0.86)をそのまま使える(432 mm² で一致)。#1 の画像の比は 0.92 | **photo**(比は #2 の注記を優先) |
| apple-m1ultra | M1 Ultra | 864 mm²(sec。M1 Max ×2) | P16+E4 | **同じダイの流用**: #1 の M1 Max ×2。外形は #2 | 0.43 → 19.3×44.8 mm(#2 と一致) | **reuse**(M1 Max の配置を上下に 2 つ。接合部の帯は #2 で確認できる) |
| apple-m2 | M2 | 153.2 mm²(meas) | P4(Avalanche)+E4 | **直接**: #4 | 1.09 → 12.95×11.83 mm。#4 の注記は 155.25 mm²(Apple の縮尺換算 ~141.70) | **photo**(低解像度のため大まかな配置) |
| apple-m2pro | M2 Pro | 294.7 mm²(meas) | P8+E4 | **直接**: #5 | 1.51 → 21.11×13.96 mm | **photo** |
| apple-m2max | M2 Max | 485.6 mm²(sec。NamuWiki のみ) | P8+E4 | **なし**。ユーザー申告「M2 Pro を縦に 2 倍」→ #5 の拡大 | 幅を M2 Pro と同じ 21.11 mm とすると高さ 23.0 mm(縦横比 0.92、M2 Pro の 1.65 倍の高さ) | **reuse**(#5 の上部=CPU・NPU・Media をそのまま、下部=GPU・SLC・LPDDR を 2 段に。M1 Pro→M1 Max の関係(#1)を手本に) |
| apple-m2ultra | M2 Ultra | 971.2 mm²(sec。推定 ×2) | P16+E8 | **なし**。M2 Max ×2(ユーザー申告) | M2 Max の外形 ×2(縦に 2 つ) | **reuse**(M2 Max の reuse をさらに流用。根拠は二重の流用で弱い) |
| apple-m3 | M3 | 152.5 mm²(meas) | P4+E4 | **直接**: #6 | 1.18 → 13.42×11.37 mm | **photo** |
| apple-m3pro | M3 Pro | 219.2 mm²(meas) | (空) | **直接**: #6 | 0.885 → 13.93×15.74 mm | **photo**(コア構成はプリセットが空。画像は P6+E6・GPU 18) |
| apple-m3max | M3 Max | 477.1 mm²(sec。NamuWiki のみ) | (空) | **直接**: #6 | 0.96 → 21.39×22.31 mm | **photo**(画像は P12+E4・GPU 40) |
| apple-m4 | M4 | 169.4 mm²(meas) | P4+E6 | **直接**: #7 | 0.97 → 12.82×13.21 mm。画像内の "1.28mm x1,21mm" とは合わない(→ (c)) | **photo** |
| apple-m4pro | M4 Pro | 325 mm²(sec) | P10+E4 | **なし**(ユーザー申告: 画像なし) | — | **schematic のまま**(M3 Pro・M2 Pro の配置の流用は世代も構成も違うので勧めない) |
| apple-m5 | M5 | 157.5 mm²(sec。NamuWiki のみ) | super4+E6 | **直接**: #8(と #9。同じダイと判断した場合) | 1.055 → 12.89×12.22 mm | **photo**(#8 と #9 の 2 枚で配置を相互確認できる) |
| apple-m5max | M5 Max | **dies が空**(面積なし) | super6+performance12 | **下位ダイの一部の流用**: CPU タイル #10(P6+M12 で構成が一致)。GPU タイルは #11(M5 Pro、GPU 20)しかなく、Max の GPU タイルは無い | 面積が無いので確認できない(面積は変えない方針どおり、追加もしない) | **schematic のまま**を推奨。#10 を reuse する場合も GPU 側は根拠なし。ユーザー申告「M5 Max の具体的な画像はない」とも整合 |

### A シリーズ(10 件)

| id | 名前 | ダイ面積(プリセット) | 使える画像 | 縦横比と整合 | 提案 |
|---|---|---|---|---|---|
| apple-a12 | A12 | 85.2 mm² | なし | — | schematic のまま |
| apple-a13 | A13 | 101.1 mm² | なし | — | schematic のまま |
| apple-a14 | A14 | 89.8 mm² | **直接**: #3 | 0.85 → 8.73×10.29 mm | **photo**(注釈は枠とラベルのみ、低解像度。大まかな配置) |
| apple-a15 | A15 | 110.1 mm² | **直接**: #4 | 0.68 → 8.67×12.70 mm。#4 の注記は 107.68 mm² | **photo**(低解像度) |
| apple-a16 | A16 | 115.4 mm² | なし | — | schematic のまま |
| apple-a17pro | A17 Pro | 114.0 mm² | なし | — | schematic のまま |
| apple-a18 | A18 | 92.4 mm² | なし | — | schematic のまま |
| apple-a18pro | A18 Pro | 109.7 mm² | なし | — | schematic のまま |
| apple-a19pro | A19 Pro | 98.7 mm² | なし | — | schematic のまま |
| apple-a20pro | A20 Pro | 98.8 mm² | なし | — | schematic のまま |

### まとめ
- photo にできる: M1・M1 Pro・M1 Max・M2・M2 Pro・M3・M3 Pro・M3 Max・M4・M5・A14・A15 の **12 件**。
- reuse: M1 Ultra(同じダイ ×2)・M2 Max(M2 Pro の拡大、ユーザー申告)・M2 Ultra(M2 Max ×2)の **3 件**。M5 Max は CPU タイルだけなら reuse 可能だが、GPU 側の根拠が無いので schematic を推奨。
- schematic のまま: M4 Pro・M5 Max と A12・A13・A16・A17 Pro・A18・A18 Pro・A19 Pro・A20 Pro の **10 件**。

## (c) 食い違い・要確認

1. **`m6 HT9pyHnWYAAM3HY.jpg`(#9)は M6 ではなく M5 の可能性が高い**。画像にチップ名は無く、GPU 10(6+4)・S-Core 4・E-Core 6・4MB SLC ×4・ANE 8・TB4 ×4・LPDDR5X PHY 8 の並びと縦横比(1.056)が #8 "Apple Silicon M5"(1.055)とブロック単位で一致する。"S-Core" の呼び名も M5 の #8 と同じ。ファイル名の "m6" の意図をユーザーに確認したい。プリセットに M6 は無い。
2. **M4 の画像内の寸法 "Die zise: 1.28mm x1,21mm"(#7)** は単位が誤り(1.5 mm² になる)。12.8×12.1 mm の意味だとしても 154.9 mm² でプリセットの 169.4 mm² と合わず、縦横比 1.06 も画像の 0.97(縦長)と合わない(向きを入れ替えても 0.95)。転記しない。
3. **M1 Max の縦横比**: #2 の注記 19.3×22.4(0.86)と #1 の画像の比 0.92 が 7% ずれる。#2 の注記を優先(面積 432 mm² とも一致)。
4. **面積の差**(プリセットは変えない): M1 はプリセット 123.0 に対し画像の注記 118 / 118.91。M1 Pro は 253.2 に対し 245。M2 は 153.2 に対し 155.25(Apple の縮尺換算では ~141.70)。A15 は 110.1 に対し 107.68。
5. **ユーザー申告「M2 Max = M2 Pro を縦に 2 倍」の裏付け**: 画像での裏付けは無い。M1 世代では #1・#2 で、M1 Max は M1 Pro の上部(CPU・NPU・Media)を残して GPU・SLC・メモリ部分を下に足した構成と確認でき、高さは 12.9→22.4 mm(1.74 倍で、2 倍ではない)。M2 もプリセット面積の比は 485.6 / 294.7 = 1.65 で、**文字どおり「縦 2 倍」ではなく「GPU 側を 2 段に」の意味と読むのが妥当**(要ユーザー確認)。M2/M3 Ultra = Max ×2 は M1 Ultra(#2)と同じ構成で整合する。
6. **M5 Max の構成**: プリセットのコア構成(super 6 + performance 12)は #10 の M5 Pro CPU タイル(P-Core 6 + M-Core 12)と数が一致するが、呼び名が違う(プリセット super / performance、画像 P / M)。#12 の想像図は M5 Max を接合した 2 層で描くが、実ダイ写真ではない。
7. **#10・#11 は手書き注釈**(透かし「@高通吧」)。クロック(4.61 / 4.38GHz)・コア名(Sotra-P / Sotra-M)などは公表値と照合していない。ANE のコア数は判読しきれない。
8. **出典は全件が推定**(上の「出典の推定」)。特に 2026 年の X の 3 件(ExoticSpice101 / HiEq_2005 / handleym99)と #8〜#11 の対応は決められない。#12・#13・#14 は一覧に URL が無い。
9. **`image-1793455459066.jpg`(#15)は Apple ではなく Intel の 8P+8E**。寸法 1682×846 が `HY_ADL` の基準枠と一致するので、user-images.md で「ファイルは残っていない」とした 12900K の注釈写真である可能性が高い(要ユーザー確認。確認できれば user-images.md の記述を「ファイルあり」に直せる)。
10. 拡張子と中身の違い: #3・#6・#15 は WebP(拡張子は jpg / png)。

## (d) 足りない画像

| チップ | 状態 |
|---|---|
| M2 Max | 画像なし(ユーザー申告)。M2 Pro の拡大で reuse |
| M2 Ultra・M3 Ultra | 画像なし(Max ×2、ユーザー申告)。M3 Ultra はプリセットにも無い |
| M4 Pro・M4 Max | 画像なし(ユーザー申告)。M4 Max はプリセットに無い |
| M5 Max | 実ダイ写真なし(ユーザー申告)。特に GPU タイル(Max 用)。CPU タイルは M5 Pro の #10 で代用可能 |
| M5 Pro | 画像(#10・#11)はあるがプリセットが無い |
| A12・A13・A16・A17 Pro・A18・A18 Pro・A19 Pro・A20 Pro | 画像なし(8 件) |
| A14・A15・M2 | 画像はあるが低解像度。高解像度の注釈写真があれば精度が上がる |
| 出典 | 全画像の出典 URL の確定(どの URL がどの画像か) |
