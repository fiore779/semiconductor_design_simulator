# Apple A シリーズのダイ写真(ユーザー提供、2026-11-02)

ユーザーが `C:\LocalAI\画像` に 2026-11-02 に追加した A シリーズの画像の確認結果。M シリーズは `apple-images.md`(このファイルとは別。編集していない)。区分はすべて **[二次]**(第三者の注釈画像・ダイ写真の転載)。
- 「目測」= このプロジェクトで画像のピクセルから読んだ値(枠の読み取りで ±5〜10% 程度の誤差を見込む。面積比は 5% 刻み程度の粗さ)。
- 「推定」= ファイル名・透かし・投稿 ID からの推定で、**出典は確定していない**。
- 画像内に面積(mm²)や寸法・スケールバーの注記がある場合は、それを転記して目測より優先する。
- ページ本文は取得していない(画像そのものだけが根拠)。
- 大きい画像(A16〜A20 Pro の 6 枚)は scratchpad に縮小コピー(高さ 1600 px)と一部の切り出しを作って見た。元ファイルは変更していない。

## (a) 画像ごとの表

寸法は実ファイルの画素数。`A17-Pro-die-shot_3.jpg`・`HighYield-A18-Pro.jpg`・`左がA16 …_1736x1307.jpg` は拡張子と違い **中身は WebP**(先頭バイト `RIFF….WEBP`。System.Drawing では開けず、WPF の WIC で PNG に変換して確認)。`左がA16 …` はファイル名の「1736x1307」と実寸 1456×1096 が違う(Substack の配信サイズ指定と推定)。

| # | ファイル | 寸法 (px) | チップ(根拠) | 注釈 | ダイ全体 | 読み取れるブロック | 使えるか |
|---|---|---|---|---|---|---|---|
| A1 | `A12_575px.jpg` | 678×571 | **A12**(画像内にチップ名なし。ファイル名と、"Big Cores" 2 + "Small Cores" 4・GPU 4 の構成から) | あり(白枠+ラベル。"Floor Plan By AnandTech"、TechInsights のロゴ) | 全体(四隅まで写る) | NPU(左下)、Big Cores・CPU Complex L2 4x Banks(下中央)、System Cache 4x Slices(中央)、GPU・GPU Core(右。4 コア分の区画)、Small L2 x2 Banks・Small Cores(下中央右)、DDR Logic ×4(四隅) | **使える**(低解像度で、コア 1 個ずつの枠は無い) |
| A2 | `A13_die.jpg` | 678×585 | **A13**(画像内にチップ名なし。ファイル名と "Lightning CPUs" / "Thunder CPUs" の表記から) | あり(白枠+ラベル。"Floorplan by Andrei"、TechInsights のロゴ) | 全体 | NPU(左上)、Lightning CPUs・Big L2(上中央)、System Cache(中央)、GPU Core・GPU(右上〜右中)、Thunder CPUs・Small L2(中央左)。メモリ PHY・ISP の注釈なし | **使える**(低解像度。コア 1 個ずつの枠は無い) |
| A3 | `左がA16 02820a31-…_1736x1307.jpg`(中身 WebP) | 1456×1096(左右 2 枚の合成) | **左 = A16**(画像内に "Apple A16 / Photo: TechanaLye / Edit/Marking: Angstronomics")、**右 = A15**(ユーザー申告 2026-11-02。画像内にチップ名なし。TechInsights のロゴ) | 左右ともあり | 左: 全体と見られる(四隅に LPDDR5)。右: 左端・上端は写るが、**右端・下端が画像の端で切れている可能性**(右端の DDR ラベルが端に接する) | **左(A16)**: GPU ×5・GPU SL、12MB SLC ×2・Ctrl ×2、Sawtooth(E)×4・4MB L2・L2 Ctrl、8MB L2 ×2・L2 Ctrl、Everest(P)×2、16-Core NPU、16b LPDDR5 ×4(四隅)。**右(A15)**: GPU ×5・GPU SL、L3 cache ×2(=SLC)、CPU 1(P)×2・CPU 1 cache ×2・CPU 1 SL、CPU 2(E)×4・CPU 2 cache・CPU 2 SL、NPU ×16・NPU cache・NPU SL、DDR ×4(左右端)。**スケールバー "2.0 mm"**(右下) | **左: 使える**(ただし写真がぼやけていて境界は粗い。ラベルは全部読める)。**右: 使える**(鮮明。スケールバーあり → (b) の A15) |
| A4 | `a16-hd.jpg` | 6649×10746 | **A16**(画像内にチップ名なし。ファイル名と、配置が A3 左の A16 と一致することから) | **なし**(透かし「万扯淡」のみ) | 全体(四辺のパッド列まで写る) | 注釈なし。A3 左と重ねて読むと: 上部の青枠 = GPU、その下の橙の SRAM ×2 = SLC、左中の SRAM = 4MB L2(E)、中段の SRAM ×2 = 8MB L2(P)、その下の暗部 = Everest ×2、左下の緑の区画 = NPU(目測の対応づけ) | **使える(高解像度の下地)**。ブロック名は A3 左から移す |
| A5 | `A17-Pro-die-shot_3.jpg`(中身 WebP) | 1200×1823 | **A17 Pro**(画像内にチップ名なし。**ファイル名のみ**。GPU 6・P 2・E 4 は A17 Pro と矛盾しない) | あり(白枠+ラベル。作者表記なし) | 全体(四辺が写る) | GPU ×6(上 3+3)、12 M SLC ×2、8M L2$ ×2(P)、P Core ×2(下中央)、E Core ×4・4M L2$(中央)、3M L2$(左)と、その上下の**ラベルなしの小枠 4+4**(NPU の可能性があるが注記なし)。メモリ PHY・ISP の注釈なし | **使える**(ぼやけた拡大画像。NPU は特定できない) |
| A6 | `a17pro.jpg` | 6759×10460 | **A17 Pro**(画像内にチップ名なし。ファイル名と、配置が A5 と一致することから) | **なし**(透かし「万扯淡」) | 全体 | 注釈なし。A5 と重ねると: 上 = GPU 6、その下の SRAM ×2 = SLC、左中の淡紫の区画 = A5 の「3M L2$」と小枠群、中段の SRAM ×2 = 8M L2$、その下 = P コア(目測の対応づけ) | **使える(高解像度の下地)**。ブロック名は A5 から移す |
| A7 | `A18.jpg` | 5333×8031 | **A18**(画像内にチップ名なし。ファイル名と、**GPU コアの模様を数えて 5 個**(A8 は 6 個)、縦横比 0.664 が A9 の A18 の枠 0.667 と一致することから) | **なし**(透かし「万扯淡」) | 全体 | 注釈なし。上 = GPU 5(左列 2・右上 2・右下 1)、その下の SRAM ×2 = SLC、中段の橙 = P コア 2 と左右の SRAM(P L2)、下端の PHY 列(4 個程度)。A9 の A18 と 90° 回転で対応(目測) | **使える(高解像度の下地)**。ブロック名は A9 から移す |
| A8 | `A18P.jpg` | 5246×8086 | **A18 Pro**(画像内にチップ名なし。ファイル名と、**GPU コア 6 個**、縦横比 0.649 が A9 の A18 Pro の枠 0.648 と一致することから) | **なし**(透かし「万扯淡」) | 全体 | 注釈なし。A7 とほぼ同じ並びで GPU が 6(右下も 2)。下端の PHY 列が A7 より多い(左 8 程度+右 2) | **使える(高解像度の下地)**。ブロック名は A9 から移す |
| A9 | `HighYield-A18-Pro.jpg`(中身 WebP) | 1200×675 | **A18 Pro(左)と A18(右)**(画像内の表記。"Analysis by HighYield"、"Image by ChipWise: https://chipwise.tech/our-portfolio/apple-a18-a18-pro-die-shot/") | あり(色分けの枠+ラベル) | 両方全体 | **画像内の面積: A18 Pro 105mm² @ TSMC N3E、A18 90mm² @ TSMC N3E**。A18 Pro: GPU core 0〜5、SLC cache ×2、NPU core 0〜7(8 個の表記。下の文字も "8 NPU-cores")、E-core 0〜3・E-core cache、P-core 0・1・P-core cache ×2。A18: GPU core 0〜4、SLC ×2、NPU core 0〜7、E-core 0〜3・cache、P-core 0・1・cache ×2 | **使える**(両チップの配置。メモリ PHY・ISP の注釈は無い) |
| A10 | `A19 Pro8.03x12.29x0.23mmdieshot.jpg` | 8032×12265 | **A19 Pro**(画像内にチップ名なし。ファイル名と、P Core @4.26Ghz・E Core @2.6Ghz がプリセットのクロック 4.26 / 2.6 と一致) | あり(白枠+ラベル。透かし "@Kurnal") | 全体(四辺のパッド列まで写る) | GPU Core #2〜#6 @1.62Ghz と左上のコア(ALU Cluster ×2・Scheduler?・RTU?・TMU? の内部注釈。#1 と見られる)→ 計 6、GPU L2 Cache 512KiByte、SLC #1〜#4(8MiByte ×4)・SLC Controller、E Core #1〜#4 @2.6Ghz・E Cluster L2 Cache 6MiByte・E-AMX、P Core#1・#2 @4.26Ghz・P Cluster L2 Cache(8MiByte)#1・#2(中央 "P Cluster L2 Cache 16MiB")・P-AMX #1〜#8、ANE #1〜#16・ANE Cache 2112KiB、LPE Core #1・#2・Share L2 512KiB、Video Engine?、Media Engine?、ISP?、SE?、Display?・Display PHY、LPDDR5x 16bit ×4(左 2・右 2)、TBT/USB4 PHY・Controller、USB 2.0 ×2、3line PCIE WIFI/Modem、ASDCI 6line / 7line、MCU #1〜#4 | **使える**(最も詳細。"?" つきのブロックは作者も未確定) |
| A11 | `A20Pro-8.00x12.35x0.67.jpg` | 6366×9846 | **A20 Pro**(画像内にチップ名なし。**ファイル名のみ**) | あり(白枠+ラベル。透かし "@Kurnal") | 全体 | GPU Core #1〜#7、GPU L2 1MiB(256KiB ×4)、SLC#1〜#3(12MiB ×3)・SLC Controller、E Core #1〜#4・E-Core L2 Cache 8MiB・E-AMX、P Core#1・#2・P-Core L2 Cache #1・#2(8MiB ×2、"P-Core L2 Cache 16MiB")・P-AMX #1〜#8、ANE #1 / ANE #2(ANE #1&2 〜 #31&32 の表記)・ANE Cache#1・#2(2MiB ×2)、LPE-Core・L2 Cache 512KiB、ISP?、Secure Enclave(7.5MiB Cache)、Video Engine?、Media Engine?、Display?、USB Controller・USB phy、3line PCIE、6line / 7line ASDCI、LPDDR5X PHY(32bit)×3(右端)、eFlash | **使える**(詳細) |

### ファイル名の寸法と画像・プリセットの整合

| 画像 | ファイル名の寸法 | 積 | プリセット面積 | 画像の縦横比(画素) | 画像内の根拠 |
|---|---|---|---|---|---|
| A10 A19 Pro | 8.03 × 12.29 mm(× 0.23) | **98.69 mm²** | 98.7 mm² → **一致** | 8032/12265 = 0.6549(ファイル名の比 0.6534 と 0.2% 差)。画素数が 1 px ≒ 1 µm に揃っている | **画像内に寸法の注記なし**(四隅を原寸で確認)。0.23 は厚さ(mm)の可能性があるが不明 |
| A11 A20 Pro | 8.00 × 12.35 mm(× 0.67) | **98.80 mm²** | 98.8 mm² → **一致** | 6366/9846 = 0.6466(ファイル名の比 0.6478 と 0.2% 差) | **画像内に寸法の注記なし**。0.67 の意味は不明(厚さなら A19 Pro の 0.23 と大きく違う) |

プリセットの面積はファイル名の寸法の積と小数 1 桁まで一致するので、**プリセット側がこのファイル名(または同じ出典)から取られた可能性**がある(独立した裏付けにはならない点に注意)。

### 出典の推定(すべて「推定・要ユーザー確認」。確定ではない)

`必要な画像リスト.md` の優先 1 の Apple の行の URL との対応。

| URL(ユーザー記載) | 対応すると推定する画像 | 根拠 |
|---|---|---|
| https://kurnal-insights.com/en/dieshot/?m=Apple | A10 A19 Pro・A11 A20 Pro(と、A4・A6・A7・A8 の可能性) | A10・A11 の透かし "@Kurnal"。A4・A6・A7・A8 は透かし「万扯淡」で、A10 の縮小画像にも薄い漢字の透かしが見えるが、同じ作者かは確かめていない |
| https://www.iphoneincanada.ca/2018/10/05/a12-bionic-review/ | A1 `A12_575px.jpg` | 内容が A12。ただし画像内の表記は AnandTech / TechInsights で、iphoneincanada は転載と推定 |
| https://gadgets-news.ru/apple-a13-bionic/ | A2 `A13_die.jpg` | 内容が A13。画像内の表記は AnandTech("Floorplan by Andrei")/ TechInsights で、転載と推定 |
| https://www.angstronomics.com/p/apple-a16-die-analysis | A3 `左がA16 …jpg` | Substack の画像名形式(UUID_幅x高さ)、画像内 "Edit/Marking: Angstronomics" |
| https://x.com/highyieldYT/status/2107010017668862105 | A9 `HighYield-A18-Pro.jpg` の**可能性は低い** | 投稿 ID からの日付は **2026-10-05**。A9 は ChipWise の A18 / A18 Pro(2024 年)の解析で、時期が合わない。A19 Pro / A20 Pro 関連の投稿の可能性(未確認) |
| https://iphone-mania.jp/news-554645/ | A5 `A17-Pro-die-shot_3.jpg`? | ファイル名が WordPress 形式(`-die-shot_3`)であることのみ。根拠は弱い |
| https://iphone-mania.jp/iphone16-588600/ | A9 の転載? | URL が iPhone 16(A18 / A18 Pro)であることのみ。根拠は弱い |
| (一覧に無い) | A9 の元画像 | 画像内に ChipWise の URL(https://chipwise.tech/our-portfolio/apple-a18-a18-pro-die-shot/)が書かれている |

### 目測: 縦横比と主要ブロック(ダイに対する面積 %)

縦横比 = 幅 / 高さ(画像の向きのまま)。面積 % は各ブロックの外接枠をダイの枠に対して読んだ値(目測)。合計は 100% にならない。

| チップ(画像) | 縦横比 | 並び(目測) | 面積比(目測) |
|---|---|---|---|
| A12(A1) | 1.175(枠 658×560 px) | 上端の左右に DDR Logic、右: GPU(4 コア)、中央: System Cache、下中央: Big Cores と CPU L2、その右に Small L2・Small Cores、左下: NPU、下端の左右に DDR Logic | GPU 約 20%、NPU 約 8%、Big Cores 約 5%・L2 約 4%、SLC 約 7%、Small Cores+L2 約 5% |
| A13(A2) | 1.16(枠 667×575 px) | 上: NPU(左)、Lightning CPUs と Big L2(中央左)、System Cache(中央)、GPU(右)。中段左: Thunder CPUs と Small L2。下半分は注釈なし | GPU 約 18%、SLC 約 9%、Lightning 約 5%・Big L2 約 4%、Thunder+Small L2 約 4%、NPU 約 5% |
| A15(A3 右) | 0.684(枠 719×1052 px。右端・下端は切れている可能性)。**スケールバー 2.0 mm = 165 px → 約 8.7 × 12.75 mm(約 111 mm²)以上** | 上: GPU 5(2+2+1)と GPU SL、その下に L3 cache(SLC)×2。中: CPU 2(E)×4・cache、CPU 1 cache ×2・CPU 1 SL、その下に CPU 1(P)×2。左下: NPU 16(8+8)・NPU cache・SL。左右端に DDR | GPU 約 20%、SLC 約 15%、P コア 約 6%+P cache 約 6%、E コア+cache 約 3%、NPU 約 6% |
| A16(A3 左。A4 で配置を確認) | 左の注釈画像は 0.671、**A4 の高解像度は 0.619**(→ (c)) | 上: GPU 5 と GPU SL。その下: 12MB SLC ×2・Ctrl。左中: Sawtooth 4・4MB L2。中段: 8MB L2 ×2 と L2 Ctrl。その下: Everest 2。左下: 16-Core NPU。四隅に 16b LPDDR5 | GPU 約 18%、SLC 約 11%、P コア 約 6%、P L2 約 5%、E コア+L2 約 4%、NPU 約 5%(左の注釈画像から。ぼやけているので粗い) |
| A17 Pro(A5。A6 で確認) | 0.651(A5 の枠 1138×1747)。A6 は 0.646 | 上: GPU 6(3+3)。その下: 12M SLC ×2。左中: 小枠 4+4 と 3M L2$。中央: E Core 4・4M L2$(右)。中段: 8M L2$ ×2。下中央: P Core 2。下 1/4 は注釈なし | GPU 約 14%(枠のみ。GPU 区画全体で 約 17%)、SLC 約 7%、P コア 約 4%、P L2 約 4%、E コア+L2 約 3.5% |
| A18 Pro(A9 左。A8 で確認) | 横長 1.54 → 縦向きで 0.648(A8 は 0.649) | 左: GPU 6(2 列 × 3 段)。その右: SLC ×2(上下)。上中央: NPU 8。中央: E-core 4・cache。右: P-core cache ×2(上下)と P-core 2 | GPU 約 20%、SLC 約 5.5%、NPU 約 3.5%、P コア 約 5.5%+P cache 約 5.5%、E コア+cache 約 4% |
| A18(A9 右。A7 で確認) | 横長 1.50 → 縦向きで 0.667(A7 は 0.664) | A18 Pro と同じ並びで GPU 5(左列は core 4 が 1 個だけ) | GPU 約 17%、SLC 約 3.5%、NPU 約 5%、P コア 約 8%+P cache 約 5%、E コア+cache 約 5% |
| A19 Pro(A10) | 0.655(ファイル名の寸法 8.03×12.29 と一致) | 上 2 段: GPU 6 と GPU L2(右上に TBT/USB4)。その下: SLC 8MiB ×4(左 2・右 2)と SLC Controller、右に Video Engine?。中段左: ANE 16・ANE Cache、中央: P-AMX、E Core 4・E-AMX・E L2 6MiB。その下: P L2 8MiB ×2(中央に P Cluster L2)。下中央: P Core 2、左: Media Engine?、右: ISP?・LPE Core 2・SE?。下端: Display?、PCIE、ASDCI。左右端に LPDDR5x 16bit ×2 ずつ | GPU 約 23%、SLC 約 8%、P コア 約 6%、P L2 約 5.5%、E コア+L2+AMX 約 7%、ANE+cache 約 4% |
| A20 Pro(A11) | 0.647(ファイル名の寸法 8.00×12.35 と一致) | 上: GPU 4(#1〜#4)、2 段目: GPU 5・GPU L2・GPU 6、3 段目左: GPU 7。中央: SLC#1(左)、SLC#2・#3(右)。左中: E Core 4・E L2 8MiB・E-AMX。中段: P-AMX、P L2 8MiB ×2 と中央の P L2。その下: P Core 2、右に ISP?・LPE-Core・Secure Enclave。左下: ANE #1・#2(縦に長い帯)・ANE Cache ×2。下: Video Engine?・Media Engine?・USB・PCIE・ASDCI。右端に LPDDR5X PHY 32bit ×3 | GPU 約 24%、SLC 約 8.5%、P コア 約 5%、P L2 約 5.5%、E コア+L2+AMX 約 8%、ANE+cache 約 10% |

## (b) プリセットとの突き合わせ表

プリセットは `data/presets/chips-soc.js`。A シリーズは全件 `cfg.cores` が **P 2 + E 4**(関数 `a()` の固定値)。GPU・NPU のコア数はプリセットに無い。「縦横比の整合」= プリセットの面積(変えない)に画像の縦横比を当てたときの寸法。

| id | 名前 | ダイ面積(プリセット) | 使える画像 | 縦横比と整合 | コア構成(画像 / プリセット) | 解像度 | 提案 |
|---|---|---|---|---|---|---|---|
| apple-a12 | A12 | 85.2 mm² | **直接**: A1 | 1.175 → 10.01 × 8.52 mm | Big 2 + Small 4 / P2+E4 → **一致**(画像はコア 1 個ずつの枠なし) | 粗い(678 px) | **photo**(大まかな配置) |
| apple-a13 | A13 | 101.1 mm² | **直接**: A2 | 1.16 → 10.83 × 9.34 mm | Lightning / Thunder の個数は画像に書かれていない(枠のみ) / P2+E4 → 矛盾はしない | 粗い(678 px) | **photo**(大まかな配置) |
| apple-a14 | A14 | 89.8 mm² | 既存 `CfQArDx7…png`(apple-images.md #3)のみ。**新しい画像なし** | 既存どおり | — | 粗い | **既存の photo のまま**(置き換え候補なし) |
| apple-a15 | A15 | 110.1 mm² | **直接**: A3 右(TechInsights、ユーザー申告で A15)。既存は `69502024…jpg`(#4) | 0.684 → 8.68 × 12.69 mm。**スケールバーからの実測 約 8.7 × 12.75 mm 以上(約 111 mm²)と整合**(既存 #4 の注記は 107.68 mm²) | CPU 1(P)×2・CPU 2(E)×4 / P2+E4 → **一致**。GPU 5・NPU 16 | 中(ダイ部分 約 720×1050 px。鮮明) | **置き換え候補(推奨)**: A3 右は既存 #4(A15 部分は幅 約 200 px 程度で細かい字が判読困難)より解像度が高く、ブロックが細かく分かれ(CPU cache / SL、NPU 16 個、DDR 4 か所)、スケールバーもある。注意: 右端・下端が切れている可能性があり、縦横比は ±数 % の誤差を見込む |
| apple-a16 | A16 | 115.4 mm² | **直接**: A3 左(注釈)+ A4(高解像度・注釈なし) | A4 の 0.619 → 8.45 × 13.66 mm。A3 左の 0.671 なら 8.80 × 13.11 mm(どちらを採るかは (c)) | Everest 2 + Sawtooth 4 / P2+E4 → **一致** | A3 左はぼやけている(約 735×1096 px で境界が不鮮明)。ラベルは全部読める。A4 は高解像度 | **photo**(ブロック名・位置は A3 左、輪郭の確認は A4)。**A16 の根拠としては足りる**が、境界は ±10% 程度の粗さ |
| apple-a17pro | A17 Pro | 114.0 mm² | **直接**: A5(注釈)+ A6(高解像度) | 0.646 → 8.58 × 13.29 mm(A5 の 0.651 とも整合) | P Core 2 + E Core 4 / P2+E4 → **一致**。GPU 6 | A5 は拡大でぼやけ、A6 は高解像度 | **photo**(NPU の位置は注記が無く要確認 → (c)) |
| apple-a18 | A18 | 92.4 mm² | **直接**: A9 右(注釈)+ A7(高解像度) | 0.664 → 7.83 × 11.80 mm。A9 の注記 90 mm²(プリセットより 2.6% 小) | P-core 2 + E-core 4 / P2+E4 → **一致**。GPU 5・NPU 8 | A9 は中(1 チップ 約 555×370 px)、A7 は高解像度 | **photo** |
| apple-a18pro | A18 Pro | 109.7 mm² | **直接**: A9 左(注釈)+ A8(高解像度) | 0.649 → 8.44 × 13.00 mm。A9 の注記 105 mm²(プリセットより 4.3% 小) | P-core 2 + E-core 4 / P2+E4 → **一致**。GPU 6・NPU 8 | A9 は中(約 617×400 px)、A8 は高解像度 | **photo** |
| apple-a19pro | A19 Pro | 98.7 mm² | **直接**: A10 | ファイル名 8.03 × 12.29 mm(積 98.69)= プリセットと一致、画像の比とも 0.2% 差 | P Core 2 + E Core 4 / P2+E4 → **一致**。ただし画像には **LPE Core 2** が別にある(プリセットに無い)。GPU 6・ANE 16 | 高解像度・詳細 | **photo** |
| apple-a20pro | A20 Pro | 98.8 mm² | **直接**: A11 | ファイル名 8.00 × 12.35 mm(積 98.80)= プリセットと一致、画像の比とも 0.2% 差 | P Core 2 + E Core 4 / P2+E4 → **一致**。画像には **LPE-Core** が別にある。GPU 7、ANE は 2 群("#1&2 〜 #31&32" の表記)。E L2 8MiB はプリセットの 'P 16MB / E 8MB' と一致 | 高解像度・詳細 | **photo**(チップ名はファイル名のみ → (c)) |

### まとめ
- 新たに photo にできる: A12・A13・A16・A17 Pro・A18・A18 Pro・A19 Pro・A20 Pro の **8 件**。既存の A14・A15 と合わせて **A シリーズ 10 件すべてに直接の画像がある**(世代違いの流用は不要)。
- 置き換え候補: **A15 は A3 右(TechInsights、スケールバーつき)が既存 #4 より良い**。A14 は新しい画像なし。
- 解像度が粗い: A12・A13(678 px)、A16 の注釈(A3 左)、A17 Pro の注釈(A5)。A16・A17 Pro・A18・A18 Pro は注釈なしの高解像度写真(A4・A6・A7・A8)で輪郭を補える。

## (c) 食い違い・要確認

1. **`左がA16 …jpg` の右側のチップ**: 画像内にチップ名は無い。ユーザー申告で **A15**(2026-11-02)。内容(GPU 5・SLC 2 区画=A15 の 32MB と矛盾しない・P 2+E 4・NPU 16・P の cache 2 区画)は A15 と矛盾しない。A16 と配置がほぼ同じなので、画像だけでは A15 と A16 を見分けにくい。このファイルの調査中、当初はこちらも A16 の別版(TechInsights)と見ていた。
2. **A16 の縦横比**: A3 左(Angstronomics の注釈)は 0.671、A4(高解像度)は 0.619 で 8% ずれる。A3 左は合成画像の半分で、切り抜きや縦横の伸縮がされている可能性がある。A4 は四辺のパッド列まで写っており、比は A4 の方が信頼できると見るが、未確定。
3. **A17 Pro(A5)の NPU**: 注記が無い。左の「3M L2$」の上下の小枠 4+4(計 8)が NPU の可能性があるが、ラベルは無く推測で埋めない。A5 は作者表記も無く、チップ名の根拠はファイル名のみ。
4. **A19 Pro の GPU コア #1**: 左上のコアは "#1" の表記が無く、内部(ALU Cluster・Scheduler?・RTU?・TMU?)の注釈になっている。#2〜#6 と合わせて 6 と読んだ。
5. **A20 Pro のチップ名はファイル名のみ**。GPU 7・SLC 36MiB(12×3)・ANE 2 群は公表値と照合していない。ファイル名の「× 0.67」(A19 Pro は「× 0.23」)の意味は不明。
6. **"?" つきのブロック**(A10・A11 の Video Engine?・Media Engine?・ISP?・SE?・Display?)は注釈者自身が未確定。そのまま「?」つきで扱う。
7. **面積の差**(プリセットは変えない): A18 Pro はプリセット 109.7 に対し A9 の注記 105(−4.3%)、A18 は 92.4 に対し 90(−2.6%)。A15 はスケールバーから 約 111 以上(既存 #4 の注記 107.68、プリセット 110.1)。
8. **A19 Pro・A20 Pro はプリセット面積とファイル名の寸法の積が完全に一致**するので、プリセットの面積が同じ出典から来ている可能性があり、独立した検証にはならない。
9. **A7・A8 の取り違えの確認**: 画像内にチップ名が無いので、GPU コアの模様(A7 = 5、A8 = 6)と縦横比で A18 / A18 Pro と判断した(ファイル名とも一致)。
10. **コアの呼び名の違い**: A19 Pro・A20 Pro の画像には P・E のほかに **LPE コア**(低電力コア)がある。プリセットは P2+E4 で LPE を持たない。
11. **highyieldYT/status/2107010017668862105 は A9(A18 / A18 Pro)と時期が合わない**(投稿日 2026-10-05 と推定)。A9 の元は画像内に書かれた ChipWise のページ。
12. **出典は全件が推定**(上の「出典の推定」)。A1・A2 は AnandTech / TechInsights の画像の転載と推定。「万扯淡」の透かしと Kurnal の関係は未確認。
13. 拡張子と中身の違い: A3・A5・A9 は WebP(拡張子 jpg)。A3 のファイル名の「1736x1307」は実寸(1456×1096)と違う。

14. **実装(2026-11-02)**: A12・A13・A16・A17 Pro・A18・A18 Pro・A19 Pro・A20 Pro を photo にし、A15 を A3 右(TechInsights)に置き換えた(`floorplan.js` の `APPLE_FRAMES`)。A16 の縦横比は a16-hd の 0.619、A18 / A18 Pro は A7 / A8 の 0.664 / 0.649、A19 Pro・A20 Pro はファイル名の寸法の比。A19 Pro・A20 Pro の LPE コアは飾り。**要確認として残る**: 出典 URL の確定、A17 Pro・A20 Pro のチップ名(ファイル名のみ)、A15(右端・下端の切れ)、A12・A13・A17 Pro のコア 1 個ずつの枠(画像に無い区画の分割は推定)、「?」つきブロック。

## (d) 足りない画像

| チップ | 状態 |
|---|---|
| A14 | 新しい画像なし。既存 #4(Tom's Hardware、750 px・枠とラベルのみ)は粗い。高解像度の注釈写真があれば精度が上がる |
| A12・A13 | 注釈あり・全体だが 678 px と低解像度。高解像度の写真があれば良い |
| A16・A17 Pro | 注釈画像がぼやけている(A3 左・A5)。鮮明な注釈画像、または A17 Pro の NPU の位置が分かる注釈 |
| メモリ PHY・ISP | A12〜A18 Pro の注釈には ISP・メディアなどの注記がほぼ無い(A19 Pro・A20 Pro のみ「?」つきである) |
| 出典 | 全画像の出典 URL の確定(どの URL がどの画像か)。特に A5 と、A4・A6・A7・A8(透かし「万扯淡」)の出典 |
