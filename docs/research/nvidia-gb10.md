# NVIDIA GB10(DGX Spark)プリセット追加のための調査

- 調査日: 2026-11-03。コードは変更していない(この文書だけ新規作成)。
- 目的: `data/presets/chips-soc.js` の NVIDIA 節(nv-orin-agx / nv-thor / nv-t239)と同じ形式で GB10 を追加できるよう、値と出典・区分をそろえる。
- 区分の付け方は設計書 §2.2 と同じ。**[実測]** = ダイ写真の計測(Kurnal)や実機の読み出し(lscpu・dmidecode・測定記事)/ **[公表]** = NVIDIA の公式資料 / **[二次]** = 報道・解説記事 / **[推定]** = 私の計算・推測 / **未取得** = 見つからなかった。推測で埋めた値は無い。
- Geekbench Browser(browser.geekbench.com)は開いていない(403 のため。回避もしていない)。Geekbench の値はすべて二次資料に載った数字。amd.com は開いていない。

## 1. 既存プリセットの形式(確認結果)

`chips-soc.js` の NVIDIA 節は `add({...})` で直接書く形。

```
add({
  id, name, vendor: 'NVIDIA', family, isa: 'arm', kind: 'embedded', year,
  gb7: <設計書 §2.4 の行名 または null>,
  dies: [die(name, mm2, s, nodeId, note)],          // s は 'meas' | 'pub' | 'sec'
  power: { base: pw(w, s, note) | null, peak: ..., range: { minW, maxW } | null, ... },
  cfg: { cores: [c(type, uarch, count, maxGHz)], l3MB, memory: '文字列' },
});
```

- チップレットは `dies` に複数の `die()` を並べる(例: Strix Halo の `die('Zen 5 CCD ×2', ...)` と `die('SoC/iGPU ダイ', ...)`)。
- GPU・SLC・トランジスタ数の専用キーは無い(Apple A の `cfg.l2` 以外はキャッシュも `l3MB` だけ)。それ以外は `notes` に書く。
- `data/uarch.js` には `Cortex-X925` と `Cortex-A725` が既に登録されている(新しい uarch は不要)。`data/nodes.js` には `tsmc-n3e` がある。
- GB7 は `gb7` が設計書 §2.4 の表の行名を指す。参考値(判定外)は `chips-pc.js` の `GB7_REF`(`kind: '転載' | '推定'`)。
- 設計書の既存の記載: §2.2 は「GB10 写真は収録されているが寸法の記載なし=未取得」、§2.4 は「GB10(DGX Spark、0 件)」、§2.5 は「SoC TDP 140W、システムピーク 240W [公表]」、§2.7.5a は「X925 ×10 + A725 ×10、256bit LPDDR5X 273GB/s、X925 約3.9〜4.0GHz、A725 2.8GHz、L2 2MB / 512KB、L3 8MB+16MB」。`tools/gb7-skipped.txt` に GB10 の行は無い。
- **§2.2 の「寸法の記載なし」は古い**。Kurnal の個別ページ(2026-03-02 付)には寸法がある(§3)。

## 2. 名称・発売

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| 正式名称 | NVIDIA GB10 Grace Blackwell Superchip(ホワイトペーパーの表題は「NVIDIA GB10 Superchip」) | [公表] | [NVIDIA GB10 Superchip White Paper WP-12718-001_v02(2026-04-02)](https://www.nvidia.com/content/dam/en-zz/Solutions/dgx-spark/nvidia-gb10-superchip-whitepaper.pdf) |
| 共同設計 | NVIDIA と MediaTek。S-die(CPU・メモリ・I/O)を MediaTek、G-die(GPU)を NVIDIA | [公表] | 同ホワイトペーパー「Two Tiles」、Figure 3「Component Ownership Map」 |
| 搭載製品 | DGX Spark。OEM 版(Dell Pro Max with GB10、ASUS Ascent GX10、Lenovo ThinkStation PGX、HP ZGX Nano など) | [公表]/[二次] | [NVIDIA DGX Spark 製品ページ](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| 発売 | 2025 年(DGX Spark の出荷開始 2025-10-15) | [公表] | NVIDIA 製品ページの動画「NVIDIA DGX Spark Has Arrived」(2025-10-15) |
| 派生 | PC 向け N1X(商品名 RTX Spark)は GB10 と同じチップと Jensen Huang が確認したと報道。ノート PC では 80W 前後で動作 | [二次] | [PC Gamer](https://www.pcgamer.com/hardware/processors/nvidia-ceo-jensen-huang-confirms-the-upcoming-n1-apu-thats-heading-for-the-pc-is-indeed-the-same-as-the-gb10-superchip-in-the-dgx-spark-ai-box)(本文は取得できず見出しのみ) |

## 3. ダイ構成・面積・プロセス

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| 構成 | 2 タイル(S-die = CPU、G-die = GPU)を 2.5D パッケージで接続。NVIDIA Chip-to-Chip(C2C)、Arm AMBA CHI-G のコヒーレンシ | [公表] | ホワイトペーパー p.3 |
| プロセス(両ダイ) | TSMC 3nm | [公表] | ホワイトペーパー p.3 |
| S-die のプロセス詳細 | TSMC N3E。ダイの刻印「MEDIATEK 28AUG2024 AHJ11488B」 | [二次] | [TechInsights(CPU の floorplan 解析の紹介ページ)](https://techinsights.com/blog/technical-report-nvidia-gb10-superchip-cpu-dgx-spark-floorplan-analysis) |
| G-die のプロセス詳細 | 3nm 以上は未取得(TechInsights の刻印は「T254G-A01」との検索要約あり。本文未確認) | 未取得 | — |
| **S-die(CPU)の寸法** | **12.91 × 16.10 mm = 207.9 mm²** | **[実測]** | [Kurnal Insights「NVIDIA GB10」](https://kurnal-insights.com/en/dieshot/nvidia-gb10/)(2026-03-02。表記「SoC: 12.91mm x 16.10mm」) |
| **G-die(GPU)の寸法** | **12.91 × 13.45 mm = 173.6 mm²** | **[実測]** | 同上(表記「GPU:12.91mm x 13.45mm」) |
| 2 ダイの合計 | 12.91 × 29.55 mm = 381.5 mm²(Kurnal の「Total」。2 ダイを横に並べた外形。16.10 + 13.45 = 29.55 で一致) | [実測] | 同上 |
| (参考)他の面積の記載 | Notebookcheck の N1X の仕様ページは「382 mm²、トランジスタ 700 億、TSMC N2」。382 は上の合計と一致するが、N2 は NVIDIA の 3nm・TechInsights の N3E と食い違うため、この表のトランジスタ数・プロセスは採らない | [二次](低信頼) | [Notebookcheck: RTX Spark N1X 20-Core](https://www.notebookcheck.net/Nvidia-RTX-Spark-N1X-20-Core-Processor-Benchmarks-and-Specs.1426963.0.html) |
| パッケージ | FCBGA、2,970 ピン、31 × 50 mm | [公表] | ホワイトペーパー Table 1 |
| C2C の帯域 | 「同等の PCIe リンクの約 5 倍」(ホワイトペーパー)。600 GB/s(合計)という報道あり | [公表](倍率のみ)/[二次](600GB/s) | ホワイトペーパー p.2、[Wccftech](https://wccftech.com/nvidia-gb10-superchip-soc-3nm-20-arm-v9-2-cpu-cores-nvfp4-blackwell-gpu-lpddr5x-9400-memory-140w-tdp/) |
| トランジスタ数 | 公式値は未取得(Notebookcheck の 700 億は上記のとおり採らない) | 未取得 | — |

- Kurnal の寸法の向きは画像と整合する(§7)。設計書 §2.2 の採用ルール(①実物ダイ写真の計測を最優先)により、面積は [実測] として扱える。

## 4. CPU

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| コア構成 | Cortex-X925 ×10(p-core)+ Cortex-A725 ×10(e-core)、計 20 | [公表] | ホワイトペーパー Table 3、NVIDIA 製品ページ |
| クラスタ | 2 クラスタ × 10 コア。各クラスタに X925 ×5 + A725 ×5 | [二次](+ 写真で確認) | [Chips and Cheese: Cortex A725 ft. Dell Pro Max with GB10](https://chipsandcheese.com/p/arms-cortex-a725-ft-dells-pro-max)(2026-01-27)。ダイ写真でも上下 2 クラスタに X925 5 個・A725 5 個ずつ |
| X925 最大クロック | 4 GHz | [公表] | ホワイトペーパー Table 3「p-core maximum clock 4 GHz」 |
| 同上(読み出し) | 4004 MHz(lscpu の CPU max MHz)。BIOS 名「GB10 Spark CPU @ 3.9GHz」、SPEC の Nominal 3900 | [実測] | [SPEC CPU2026 結果 cpu2026-20260210-00020(DGX Spark、Arm が提出、2026-02)](https://spec.cs.miami.edu/cpu2026/results/res2026q2/cpu2026-20260210-00020.html) |
| 同上(クラスタ差) | 一方のクラスタは最大 3.9 GHz、もう一方は 4.0 GHz | [二次] | [Chips and Cheese: Inside Nvidia GB10's Memory Subsystem](https://chipsandcheese.com/p/inside-nvidia-gb10s-memory-subsystem)(2025-12-31) |
| A725 最大クロック | 2.8 GHz | [公表] | ホワイトペーパー Table 3 |
| 同上(読み出し) | 2860 MHz(lscpu) | [実測] | SPEC 結果(同上) |
| ダイ写真の注釈 | X925 #1〜#10 すべて「@3.9Ghz」、A725 #1〜#10 すべて「@2.8Ghz」 | [二次](Kurnal の注釈) | §7 の画像 |
| ISA | Armv9.2、SVE/SVE2 あり | [公表] | ホワイトペーパー Table 3 |

## 5. キャッシュ・メモリ

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| L1 | 64KB I + 64KB D / コア(両コア) | [公表] | ホワイトペーパー Table 3、SPEC 結果 |
| L2 | X925 2MB / コア、A725 512KB / コア(lscpu の L2 合計 25MiB = 10×2 + 10×0.5 と一致) | [実測]/[二次] | SPEC 結果、Chips and Cheese。※ホワイトペーパー Table 3 は「2 MiB per cluster」「512 KiB per cluster」と書くが、lscpu の合計と合わないため誤記とみる |
| L3 | 合計 24MiB(2 インスタンス)。一方のクラスタ 16MiB、もう一方 8MiB | [実測](合計)/[公表](内訳) | SPEC 結果(lscpu「L3: 24 MiB (2 instances)」)、ホワイトペーパー Table 3 |
| L3 のクラスタ番号 | **出典で食い違う**: ホワイトペーパーは Cluster 0 = 16MiB / Cluster 1 = 8MiB、SPEC 結果と Chips and Cheese は Cluster 0 = 8MB / Cluster 1 = 16MB。容量の組(16 + 8)は一致 | — | 同上 |
| L3(報道の誤り) | Wccftech は「16MB × 2 = 32MB」と書くが、公式・lscpu・写真と食い違うため採らない | [二次](不採用) | Wccftech(§3 と同じ URL) |
| SLC | 16MB(CPU から見て L4 相当)。遅延 約 42ns(X925)/ 約 47ns(A725) | [二次] | Wccftech(Hot Chips 2025 の資料の報道)、Chips and Cheese |
| メモリ | LPDDR5X、256bit、8,533 MT/s、273 GB/s、64GB(OEM のみ)/ 128GB | [公表] | ホワイトペーパー Table 1、NVIDIA 製品ページ |
| メモリ(上限) | コントローラは最大 9,400 MT/s(301 GB/s)対応。製品は 8,533(dmidecode も 8533) | [二次]/[実測] | Hot Chips の報道(ServeTheHome、Wccftech)、Chips and Cheese |
| DRAM 遅延 | 113 ns(Chips and Cheese)。約 92 ns(64MiB、hugepage なし)/ 約 86 ns(hugepage あり)(Geerling の tinymembench) | [実測](各記事の測定) | Chips and Cheese、[geerlingguy/sbc-reviews #92](https://github.com/geerlingguy/sbc-reviews/issues/92) |

## 6. 電力・GPU

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| SoC 電力 | 140 W(「SoC only, typical. Can vary depending on application」) | [公表] | ホワイトペーパー Table 1、NVIDIA 製品ページ(GB10 TDP 140 W) |
| システム電源 | 240 W(DGX Spark の電源アダプタ) | [公表] | NVIDIA 製品ページ |
| 壁コンセントの実測(Dell Pro Max with GB10) | アイドル 31.5W、GB6 マルチ 114.8W、stress-ng 127.1W、HPL 155W | [実測](システム全体の壁際。設計書の方針により CPU ピークには使わない) | geerlingguy/sbc-reviews #92 |
| N1X(ノート PC)の電力 | 45〜95W 設定、ノートは 80W 前後(参考。DGX Spark とは別の電力設定) | [二次] | Notebookcheck の N1X 仕様ページ |
| GPU アーキテクチャ | Blackwell(sm_121 との報告は開発者フォーラムの記述で未確認) | [公表] | ホワイトペーパー Table 4 |
| SM / CUDA コア | 48 SM、6,144 CUDA コア(128 / SM) | [公表] | ホワイトペーパー Table 4 |
| GPC / TPC | 4 GPC。RT コア 48(TPC あたり 2)から TPC 24。ダイ写真の注釈も GPC#1〜#4・TPC#1〜#24 | [公表](GPC)/[推定](TPC 24 は RT コア数からの計算と写真の一致) | ホワイトペーパー Table 4、§7 の画像 |
| Tensor / RT コア | Tensor 48(第 5 世代)、RT 48(第 4 世代) | [公表] | ホワイトペーパー Table 4 |
| GPU ブーストクロック | 2.4 GHz | [公表] | ホワイトペーパー Table 4 |
| GPU L2 | 24 MiB(写真の注釈も 1.5MiB ×8 + 12MiB = 24MiB) | [公表] | ホワイトペーパー Table 4、§7 の画像 |
| 演算性能 | 1 PFLOP NVFP4(スパース)。FP32 31 TFLOPS(Hot Chips の報道) | [公表]/[二次] | ホワイトペーパー Table 2、ServeTheHome |
| I/O | PCIe Gen5 12 レーン + Gen4 4 レーン(ConnectX-7 へ x8)、USB 3.2 ×4 | [公表] | ホワイトペーパー p.5〜6 |

## 7. ユーザーの画像 `C:\LocalAI\画像\GB102in1.jpg`

- 大きさ: 9034 × 3951 px(横長)。**1 枚に 2 つのダイ**(左 = S-die〔CPU〕、右 = G-die〔GPU〕)が横に並ぶ。ファイル名は Kurnal の個別ページの主画像「/uploads/Nvidia/nvidia-gb10/GB102in1.jpg」と一致し、出典は **https://kurnal-insights.com/en/dieshot/nvidia-gb10/** と対応づけられる(ファイル名の一致による。画像内に URL の記載は無い)。
- 透かし: `@Kurnal`(全面に斜めに多数)。他の文字の透かしは無い。
- 寸法の記載: 画像内には無い。Kurnal のページの寸法(合計 12.91 × 29.55 mm、S-die 16.10 mm 幅、G-die 13.45 mm 幅)は画像と整合する: 縦横比 3951 / 9034 = 0.437 = 12.91 / 29.55、左右の境目は表示 2000 px 中 約 1088 px(0.544)で 16.10 / 29.55 = 0.545。px/mm は横 305.7・縦 306.0 でそろう。
- **左のダイ(S-die、注釈つき)**: ARM X925 #1〜#10(各「@3.9Ghz」。上のクラスタに #1〜#5、下に #6〜#10)、Cortex A725 #1〜#10(各「@2.8Ghz」。上下に 5 個ずつ)、「L3 Cache 16MiB」(4MiB ×4。上のクラスタ)、「L3 Cache 8MiB」(4MiB ×2。下のクラスタ)、「SLC 16MiB」(1MiB SLC の小区画の集まり)、「Memory Cache 2MiB」×8(SLC の周りに散在。SLC と別枠の表記で、両者の関係は写真からは不明)、「32Bit LPDDR5#1〜#8 Memory PHY」(上下 4 個ずつ = 256bit)、Coherence Hub、Nvidia NPU 4 Core(2MiB Cache・256KiB Cache の表記あり)、ISP+Audio DSP、Nvidia Display Engine、17x Flash、Die to Die Channel、NV-Link、USB4.0 ×4、PCIE5.0 X4 ×3、PCIE4.0 X4、USB3.0 ×2、USB2.0 ×3、MIPI DSI ×3。
- **右のダイ(G-die、注釈つき)**: GPC#1〜#4、TPC#1〜#24(GPC あたり 6)、SM#1〜#4 の例示(TPC#1・#2 の中。「2x 5MSP」らしい小さな注記は判読困難)、Raster Engine/3D FF ×4、GPU L2 Cache 24MiB(1.5MiB GPU L2 ×8 + 12MiB GPU L2)、NV-Link、Die to Die Channel、NVDEC / NVENC。
- 注意: Kurnal の個別ページには別の注釈画像(gb10socshuiying.jpg、GB10GPU.jpg)もあるが、取得していない。

## 8. Geekbench

### 8.1 Geekbench 7(GB10 = DGX Spark / OEM 機)
- **【2026-11-06 更新】採用: ST 2624 / MT 20595(6 件の中央値)**。ユーザーが Geekbench 7 の検索結果(CPU「NVIDIA GB10」)のスクリーンショットを提供。先頭 8 件のうち、仮想マシン 2 件(マイクロソフト仮想マシン。10 コア表示)を既存規則(コア数が SKU と不一致・仮想環境)で除外し、残り 6 件 〔NVIDIA_DGX_Spark ×2(Windows)、XFUSION FusionXpark ×1・Dell Pro Max ×3(Linux)〕の中央値。ST 2416〜2637、MT 13639〜23929(ばらつきが大きい。Windows と Linux、電力モードなどの差が疑われるが原因は未確認)。直近 25 件ではない。設計書 §2.4 に行を追加(`gb7` = 'GB10: GB10(DGX Spark, 3.9GHz, 20c)')。
- **旧記録(2026-11-03)**: 未取得。DGX Spark・Dell Pro Max with GB10・ASUS Ascent GX10 の GB7 値は、二次資料・検索のどちらでも見つからなかった(設計書 §2.4 の「GB10 0 件」と同じ状態)。この下の §9 以降の「gb7: null」「未取得」も、その時点の記録。

### 8.2 Geekbench 7(参考: 同じチップとされる N1X / RTX Spark。Windows ノート、電力設定が違うため GB10 の値としては使えない)
| 機種・構成 | シングル | マルチ | 件数・種別 | 区分 | 出典 |
|---|---|---|---|---|---|
| Microsoft Surface Laptop Ultra 2026(64GB) | 2722 | 23553 | 1 件(Notebookcheck のレビュー機の値) | [二次](NBC の測定の転載) | [Notebookcheck N1X 仕様ページ](https://www.notebookcheck.net/Nvidia-RTX-Spark-N1X-20-Core-Processor-Benchmarks-and-Specs.1426963.0.html) |
| 20 コア(10+10)、4.00GHz、Windows 11 Pro、64GB | 2570 | 23126 | 個別投稿 1 件(リーク。後に削除) | [二次] | [Notebookcheck(2026-08-07)](https://www.notebookcheck.net/Nvidia-RTX-Spark-s-18-core-config-surfaces-on-Geekbench.1362992.0.html) |
| 18 コア(10+8)、3.90GHz、Windows 11 Enterprise | 2541 | 21776 | 個別投稿 1 件(同上) | [二次] | 同上 |

### 8.3 Geekbench 6(GB10)
| 機種 | シングル | マルチ | 件数・種別 | 区分 | 出典 |
|---|---|---|---|---|---|
| Dell Pro Max with GB10(Ubuntu 24.04、GB 6.5.0 Preview) | 3123 | 19708 | 個別投稿 1 件(Jeff Geerling の測定) | [二次](投稿の転載) | [geerlingguy/sbc-reviews #92](https://github.com/geerlingguy/sbc-reviews/issues/92) |
| 第三者の投稿(9 月。機種は同 issue に記載なし) | 3237 | 19794 | 個別投稿 1 件 | [二次] | 同上(Geerling が併記) |
| DGX Spark(個人の常用機) | 2983 | 18183 | 個別投稿 1 件 | [二次] | [daniel.lawrence.lu「DGX Spark as a daily driver」(2026-07-15)](https://daniel.lawrence.lu/blog/2026-07-15-dgx-spark-as-daily-driver/) |
| (参考)N1X:ASUS ProArt P16 / Surface Laptop Ultra(GB 6.7.1) | 3092 / 3096 | 20296 / 20031 | 各 1 件(NBC のレビュー機) | [二次] | Notebookcheck N1X 仕様ページ |

- 中央値ではなく、すべて個別投稿。DGX Spark の 3 件の範囲は ST 2983〜3237、MT 18183〜19794。
- 検索エンジンの要約には Geekbench Browser の投稿(MT 14110・13953・17400 など、L3 8MB / 16MB で分かれた表示)も出たが、Geekbench Browser を開いていないため採らない。
- (参考)Geekbench 5: DGX Spark 2271 / 13726(Debian 12)の検索要約あり。出典は Geekbench Browser のため採らない。

## 9. プリセットに入れられる値 / 未取得の値

| 項目 | 値 | 区分 | 入れる / 入れない |
|---|---|---|---|
| 名前・年 | GB10(DGX Spark)、2025 | [公表] | 入れる |
| S-die 面積 | 207.9 mm²(12.91 × 16.10) | [実測] | 入れる |
| G-die 面積 | 173.6 mm²(12.91 × 13.45) | [実測] | 入れる |
| S-die プロセス | TSMC N3E | [二次](TechInsights) | 入れる(nodeId 'tsmc-n3e') |
| G-die プロセス | TSMC 3nm(N3 系の細分は未取得) | [公表] | 入れる場合は note に「3nm のみ公表」。nodeId は 'tsmc-n3e' を当てると [推定] |
| X925 | 10 コア、最大 4.0 GHz(lscpu 4.004。一方のクラスタは 3.9) | [公表]/[実測] | 入れる |
| A725 | 10 コア、最大 2.8 GHz(lscpu 2.86) | [公表]/[実測] | 入れる |
| L2 | X925 2MB/コア、A725 512KB/コア | [実測]/[二次] | uarch.js と一致(X925 l2KB 2048)。notes に |
| L3 | 24MB(16 + 8 の非対称 2 クラスタ) | [実測]/[公表] | 入れる(l3MB: 24) |
| SLC | 16MB | [二次] | notes のみ(専用キー無し) |
| メモリ | LPDDR5X-8533、256bit、273GB/s | [公表] | 入れる |
| 電力 | SoC 140W(typical)、電源 240W | [公表] | 入れる(base) |
| GPU | Blackwell 48 SM / 6,144 CUDA / 2.4GHz / L2 24MiB / 4 GPC | [公表] | notes のみ |
| GB7(GB10) | — | 未取得 | gb7: null |
| GB7(N1X、参考) | 2722 / 23553 ほか | [二次] | GB7_REF に「参考・別製品」として載せるかはユーザー判断 |
| GB6 | 3123 / 19708 ほか(個別投稿 3 件) | [二次] | プリセットには GB6 のキーが無い。記録のみ |
| トランジスタ数 | — | 未取得 | 入れない |
| G-die の刻印・TechInsights の面積 | — | 未取得(有料) | 入れない |
| ピーク電力(CPU 単体) | — | 未取得(壁際の値のみ) | 入れない |

## 10. 既存の形式に当てはめた案(値の一覧。コードではない)

- id: `nv-gb10`
- name: `GB10(DGX Spark)`
- vendor: `NVIDIA` / family: `DGX`(または `Grace Blackwell`。ユーザー判断)/ isa: `arm`
- kind: `pc`(デスクトップの小型機。Orin・Thor の `embedded` とは用途が違う。N1X のノートを意識するなら `mobile-pc`)
- year: `2025`
- gb7: `null`(GB10 の GB7 は未取得)
- dies:
  1. name `S-die(CPU・メモリ・I/O、MediaTek)`、mm2 `207.9`、s `meas`、nodeId `tsmc-n3e`、note「Kurnal 12.91×16.10mm。プロセス N3E は TechInsights(二次)」
  2. name `G-die(Blackwell GPU)`、mm2 `173.6`、s `meas`、nodeId `tsmc-n3e`(※ NVIDIA は「3nm」のみ公表。N3E は [推定])、note「Kurnal 12.91×13.45mm」
- power: base `pw(140, 'pub', 'SoC のみ・typical(ホワイトペーパー Table 1)。DGX Spark の電源 240W')`、peak `null`、range `null`
- cfg.cores:
  - `c('P', 'Cortex-X925', 10, 4.0)`(公表 4GHz。lscpu 4004MHz。一方のクラスタは 3.9GHz)
  - `c('E', 'Cortex-A725', 10, 2.8)`(公表 2.8GHz。lscpu 2860MHz)
- cfg.l3MB: `24`(16MB と 8MB の 2 クラスタ。クラスタ番号は出典で食い違う)
- cfg.memory: `'LPDDR5X-8533, 256bit, 273GB/s'`
- notes(案): 「CPU と GPU の 2 ダイを 2.5D パッケージと NVIDIA C2C で接続(MediaTek 共同設計)。L2 X925 2MB / A725 512KB(コア当たり)、SLC 16MB([二次])。GPU は Blackwell 48 SM・6,144 CUDA・2.4GHz・L2 24MiB([公表])。GB7 は未取得。GB6 は個別投稿で ST 2983〜3237 / MT 18183〜19794([二次] 3 件)。PC 向け N1X は同じチップと報道」
- フロアプラン: ダイ写真(GB102in1.jpg、注釈つき・寸法あり)。S-die は 2026-11-03 に反映済み(`TILE_FRAMES.gb10`)。**G-die は 2026-11-05 に反映**(`TILE_FRAMES['gb10-gpu']`。表示 2000×875 の座標)。**G-die の構造の読み取り結果(画像を開いて確認)**: ダイの外形は x 1095〜1988・y 6〜873(縦横比 1.03)。左上に GPU L2 の 1.5MiB ×8(2 列×4 行。x 1188〜1360・y 10〜327)、その右に縦の Raster Engine/3D FF の帯(x 1362〜1430)、GPC#1(最上段 y 10〜225)の右に GPC#2(y 228〜440)・GPC#3(y 442〜655)・GPC#4(y 659〜872)が 4 段に積まれ、各 GPC は注釈で TPC 2 つずつの 3 区画(GPC#1: TPC#1〜#4 と右端の拡大注記〔「TPC#2・TPC#1・SM#1〜#4」。TPC#5・#6 とみなした。未確認〕、GPC#2: #7〜#12、GPC#3: #13〜#18、GPC#4: #19〜#24)。各 GPC の左に Raster Engine/3D FF の帯(計 4 本)。左端に NV-Link(x 1100〜1144)と Die to Die Channel(x 1146〜1173)の縦帯(y 228〜558)、その下に NVDEC・NVENC(x 1100〜1193・y 582〜870)、GPU L2 12MiB(x 1197〜1360・y 555〜870)。注記「GPU L2 Cache 24MiB」は L2 の 2 つの塊(1.5MiB ×8 = 12MiB、12MiB)の間(x 1175〜1385・y 331〜551)に書かれ、その領域の中身は判別できないので『未判別』の飾りにした。座標の誤差は目測で ±5〜10%。ダイ左上の細い帯(x 1100〜1186・y 10〜225)と GPC の右端の細い縦帯(x 1955〜1985)は配置していない。電力按分(総電力 140 W を仮定): S-die 92.80 → 92.20 W、G-die 47.20 → 47.80 W。

## 11. この調査の限界

- TechInsights の本文(面積・刻印・コスト)は有料で未確認。
- Hot Chips 2025 の発表資料 PDF は画像主体で文字を抽出できず、報道経由([二次])の値を使った。
- L3 のクラスタ番号(どちらが 16MB か)は出典で逆。シミュレーターは合計 24MB しか使わないため影響は小さい。
- X925 の最大クロックは 3.9 / 4.0 GHz でクラスタ差がある(Chips and Cheese)。プリセットは 1 つの値しか持てないため 4.0 を案とした。
