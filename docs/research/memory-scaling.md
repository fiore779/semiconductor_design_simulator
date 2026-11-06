# メモリ構成・メモリ速度と Geekbench スコアの関係(調査メモ)

- 調査日: 2026-11-01
- 目的: 「メモリ種別(DDR4/DDR5、DDR5/LPDDR5X など)とメモリ速度を選べるようにし、GB7 の ST/MT に反映する」機能の設計材料。プリセット・コードは編集していない。
- 区分: **[実測] > [公表] > [二次] > [推定] / 未取得**。第三者レビューが自分で測った値は [実測](nbc-gb7-mobile.md と同じ扱い)。検索結果の要約だけで原ページを開けていないものは「検索要約(原ページ未確認)」。403 などで開けなかったページは回避せず「取得不可」。
- グラフが画像だけのページは、画像ファイルを直接取得して数値を読んだ(画像のラベルに書かれた数値をそのまま転記。目盛りからの読み取りはしていない)。
- Geekbench Browser(403)と amd.com は使っていない(2026-11-06 更新: amd.com は Chrome の通常閲覧なら取得できる)。

---

## 1. 実測データ(同一 CPU でメモリだけ変えた比較)

### 1-A. 表(差は「速い構成 ÷ 遅い構成 − 1」)

| # | CPU | GB 版 | 比較(遅い → 速い構成) | ST | MT | 帯域・遅延(同記事の AIDA64) | 出典 | 区分 |
|---|---|---|---|---|---|---|---|---|
| 1 | Ryzen 9 9950X(MSI X870E ACE MAX) | **GB7** | DDR5-4800 CL40 → DDR5-6000 CL28(EXPO) | 未測定(記事に ST なし) | 24082 → 25582(**+6.2%**) | Read 60751 → 76860 MB/s(+26.5%)、遅延 91.4 → 77.3 ns(-15.4%) | The FPS Review「G.SKILL Trident Z5 Neo RGB DDR5 8000MT/s EXPO … on AMD Ryzen」p.3(合成ベンチ)https://www.thefpsreview.com/2026/08/06/g-skill-trident-z5-neo-rgb-ddr5-8000mt-s-expo-memory-review-is-ddr5-8000-worth-it-on-amd-ryzen/3/ 。グラフ画像 geekbench7_gskill8000.webp・aida64_read_gskill8000.webp・aida64_latency_gskill8000.webp。CPU は p.2(テスト環境) | [実測] |
| 2 | 同上 | **GB7** | DDR5-6000 CL28 → DDR5-8000 CL38(EXPO。UCLK が 1:2 で 2000MHz に下がる) | 未測定 | 25582 → 26654(**+4.2%**) | Read 76860 → 84396(+9.8%)、遅延 77.3 → 73.6 ns(-4.8%) | 同上 | [実測] |
| 3 | 同上 | **GB7** | DDR5-4800 CL40 → DDR5-8000 CL38 | 未測定 | 24082 → 26654(**+10.7%**) | Read +38.9%、遅延 -19.5% | 同上 | [実測] |
| 4 | 同上 | **GB7** | DDR5-8000 → 8200(OC) | 未測定 | 26654 → 26592(-0.2%) | Read 86264(+2.2%)、遅延 75.5 ns(+2.6%) | 同上 | [実測] |
| 5 | Ryzen 9 9950X(PBO 有効、X670E AORUS Master) | 記載なし(2024-12 の記事で GB7 公開前。スコア水準から GB6 と思われる=[推定]) | DDR5-6000(XPG Lancer 2×16GB)→ DDR5-8000(XPG Lancer 2×24GB) | 3038 → 3140(**+3.4%**) | 19789 → 21458(**+8.4%**) | 未取得(p.5 は未取得)。タイミングは本文に記載なし | Hardware Busters「DDR5 6000 vs 8000 MHz RAM – AMD Ryzen 9 9950X」p.4 https://hwbusters.com/cpu/ddr5-6000-vs-8000-mhz-ram-amd-ryzen-9-9950x/4/ (グラフ画像 Synthetic_Benchmarks_GeekBench_Single-1.png / Multi-1.png)、環境は p.3 | [実測](GB 版は [推定]) |
| 6 | Core Ultra 9 285K(Intel Default、Z890 Taichi) | 同上 | 基準(グラフのラベルは「285K」のみ。p.3 で同機に 6000 と 8000 の 2 キットを列挙 → 基準は 6000 と思われる=[推定])→ DDR5-8000 | 3298 → 3371(**+2.2%**) | 21953 → 23825(**+8.5%**) | 未取得 | 同上 | [実測](基準構成は [推定]) |
| 7 | Core i5-12600K(Z690) | **GB5** | DDR4-3600 CL16-18-18-38 2T(Gear Auto)→ DDR5-5200 CL40-40-40-79 2T(Gear 2) | 1892 → 1865(**-1.4%**) | 11690 → 12789(**+9.4%**) | Read 56707 → 76702 MB/s(+35.3%)、遅延 76.1 → 82.1 ns(+7.9%) | The FPS Review「Intel Core i5-12600K Alder Lake DDR4 vs DDR5 Performance」p.4(GB5 画像 geekbench_singlecore-1 / multicore-1)https://www.thefpsreview.com/2021/12/13/intel-core-i5-12600k-alder-lake-ddr4-vs-ddr5-performance/4 、設定 p.3、AIDA64 p.6 | [実測] |
| 8 | Ryzen AI 9 HX 370(**別機種**: Acemagic F3A=DDR5-5600 SO-DIMM、Beelink SER9=LPDDR5X) | **GB6** | DDR5-5600 SO-DIMM → LPDDR5X | 2934 → 2889(**-1.5%**。DDR5 が速い) | 12844 → 14912(**+16.1%**) | 未取得 | ServeTheHome「Acemagic F3A an AMD Ryzen AI 9 HX 370 Mini PC…」p.3 https://servethehome.com/acemagic-f3a-an-amd-ryzen-ai-9-hx-370-mini-pc-with-up-to-128gb-of-ram/3 (画像 Acemagic-F3A-Geekbench-6-Performance) | [実測](機種差の交絡あり。下記) |
| 9 | 同上 | **GB5** | 同上 | 2082 → 2081(0.0%) | 13681 → 14659(**+7.1%**) | 未取得 | 同上(画像 Acemagic-F3A-Geekbench-5-Performance) | [実測](同上) |
| 10 | 同上(Beelink SER9 単体、54W) | **GB6** | LPDDR5X-7500(出荷時)→ LPDDR5X-8000(OC) | 2888 → 2897(+0.3%) | 15210 → 15233(+0.2%) | 未取得 | Wccftech「Beelink SER9 … Mini PC Review」https://wccftech.com/review/beelink-ser9-amd-ryzen-ai-9-hx-370-mini-pc-review-fastest-igpu-on-the-market/amp/ | [実測](OC 時のタイミング未記載) |
| 11 | 不明(記事に CPU の記載なし) | **GB6** | DDR5-4800(Sabrent)→ DDR5-6000(XPG Lancer)→ DDR5-6200(Patriot Viper Venom) | 2941 → 2976 → 3065(+1.2%、+3.0%) | 18342 → 19911 → 20716(+8.6%、+4.0%) | 未取得 | ReHWolution「Geekbench 6 – Patriot Viper Venom DDR5-6200 32 GB」(2024-04-10)https://www.rehwolution.it/?p=116762 | [実測](CPU・タイミング不明のため参考扱い) |
| 12 | Core i7-13700K | GB5 | DDR4(速度不明)→ DDR5(速度不明) | DDR5 が約 -1% | 16542 → 19811(+19.8%) | — | Tom's Hardware / TechPowerUp のニュース(Geekbench Browser に出たリークの紹介)。TechPowerUp は 403 で**取得不可**、Tom's は本文が取れず。**検索要約(原ページ未確認)** | [二次](検索要約) |
| 13 | Core i5-13600K | GB5 | DDR4 → DDR5(速度不明) | — | 14425 → 16054(+11.3%) | — | tuttotech.net(検索要約のみ) | **検索要約(原ページ未確認)** |

**#8〜#9 の交絡**: 2 台は別機種。F3A は全負荷で約 90〜95W(STH p.4 https://servethehome.com/acemagic-f3a-an-amd-ryzen-ai-9-hx-370-mini-pc-with-up-to-128gb-of-ram/4 、[実測])、SER9 は出荷時 54W プロファイル(Wccftech、[実測])。SER9 の LPDDR5X の速度は STH の記事に記載がなく、Wccftech の「7500MT/s out of the box」を採った(同型機の別レビュー)。**電力は DDR5 機のほうが高いのに MT は LPDDR5X 機が上**なので、メモリの効果を過小に見ている可能性はあるが、BIOS 設定・冷却・個体差は分離できない。STH 本文は「5-13%」「5-10% more performance from LPDDR5X」と書く(GB 以外も含む。p.3 の総合グラフは 7zip・GROMACS・MariaDB 等で DDR5 機が 0.89〜0.99)。

**#10 の注意**: 7500 → 8000(+6.7%)でほぼ差なし。OC 時のタイミングが緩んだ・実際に 8000 で動いていない等の可能性を記事は検証していない。「LPDDR5X の 7500 と 8000 の差は小さい」の根拠にはなるが、確度は低い。

### 1-B. 見つからなかった・取得できなかったもの

| 対象 | 状況 |
|---|---|
| TechPowerUp「DDR5 Memory Performance Scaling with AMD Zen 5」、同「i9-12900K DDR4 vs DDR5」、同 Raptor Lake DDR4/DDR5 ニュース | **取得不可**(403)。Geekbench を含むかも未確認 |
| Guru3D「Ryzen 7 7700 DDR5 memory scaling」 | **取得不可**(403) |
| エルミタージュ秋葉原(gdm.or.jp)の DDR5-4800/6000/8000 比較 | **取得不可**(403) |
| AnandTech の 12900K DDR4/DDR5 比較(SPEC) | **取得不可**(接続拒否) |
| Zen 3(5800X/5950X)の DDR4-3200/3600/3800 での Geekbench | 未取得(見つからず。Tom's Hardware の Ryzen 5000 RAM ガイドは 5900X で DDR4-3600 が 3200 比 +1.3%(Geekbench 以外の総合)と検索要約に出たのみ) |
| Hawk Point / Meteor Lake の同一 SKU の LPDDR5X 対 DDR5 の Geekbench | 未取得 |
| **GB7 の ST** のメモリ依存 | 未取得(#1〜#4 は MT のみ) |
| Hardware Unboxed(動画)、Chips and Cheese、Phoronix の Geekbench | 見つからず(Phoronix の 9850X3D DDR5-4800/6000 は Geekbench 以外。幾何平均で約 +1%、検索要約) |

---

## 2. 帯域と遅延

### 2-A. 理論帯域(計算値。DDR4/DDR5 の「2ch」= 合計 128 bit、LPDDR5/5X の「2ch」(Intel ARK の表記)= 合計 128 bit として)

理論帯域 [GB/s] = MT/s × 合計バス幅 [bit] ÷ 8 ÷ 1000。128 bit なら MT/s × 0.016。

| 構成 | 理論帯域 | 構成 | 理論帯域 |
|---|---|---|---|
| DDR4-2666(2ch) | 42.7 | LPDDR4X-4266(128bit) | 68.3 |
| DDR4-2933 | 46.9 | LPDDR5-6400 | 102.4 |
| DDR4-3200 | 51.2 | LPDDR5X-7467 / 7500 | 119.5 / 120.0 |
| DDR4-3600 | 57.6 | LPDDR5X-8000 | 128.0 |
| DDR5-4800 | 76.8 | LPDDR5X-8533 | 136.5 |
| DDR5-5200 | 83.2 | LPDDR5X-9600 | 153.6 |
| DDR5-5600 | 89.6 | LPDDR5X-8000、256bit(Strix Halo) | 256.0 |
| DDR5-6000 | 96.0 | DDR4-2666、8ch(EPYC 7001) | 170.6 |
| DDR5-6400 | 102.4 | DDR5-7200 | 115.2 |

- **DDR5-5600(2ch)対 LPDDR5X-8000(128bit)**: 89.6 対 128.0 GB/s、**+42.9%**。LPDDR5X-7500 なら +33.9%。
- 実効帯域(AIDA64 Read ÷ 理論): 9950X で DDR5-4800 79%、6000 80%、8000 66%(UCLK 1:2 で頭打ち)。12600K で DDR4-3600 98%、DDR5-5200 92%(#1〜#3、#7 の値から計算)。**DDR5-8000 以上は理論帯域ほど伸びない**(AMD の UCLK 1:2)。

### 2-B. DRAM 遅延(実測)

| 構成 | 遅延 | 出典 | 区分 |
|---|---|---|---|
| 9950X、DDR5-4800 CL40 / 6000 CL28 / 8000 CL38 | 91.4 / 77.3 / 73.6 ns(AIDA64) | The FPS Review(#1 と同じ) | [実測] |
| 12600K、DDR4-3600 CL16 / DDR5-5200 CL40 Gear2 | 76.1 / 82.1 ns(AIDA64) | The FPS Review p.6 https://www.thefpsreview.com/2021/12/13/intel-core-i5-12600k-alder-lake-ddr4-vs-ddr5-performance/6 | [実測] |
| 9950X(DDR5-6000) | 70 ns 強 | Chips and Cheese(設計書 §5.3.3 J-3 に既出) | [二次] |
| HX 370(LPDDR5X) | 約 128 ns | Chips and Cheese(同上)。同記事「7950X3D〔DDR5-5600〕は 100 ns 未満」 | [二次] |
| Strix Halo(LPDDR5X-8000) | 約 140 ns | Chips and Cheese(同上) | [二次] |
| Phoenix 系ノート、DDR5-5600 SO-DIMM(Framework 13・Razer Blade 14・Framework 16・LOQ・EliteBook 845 G10) | 89.9〜92.6 ns | Framework コミュニティ投稿(NBC レビューの値の転記)https://community.frame.work/t/introducing-the-new-framework-laptop-13-with-intel-core-ultra-series-1-processors/51758/94 | [二次](測定ツール記載なし。元の NBC レビューは未確認) |
| 同、LPDDR5X-7467 / 7500(Zenbook 14 OLED / Legion Go) | 114.5 / 119.5 ns | 同上 | [二次] |
| 同、LPDDR5X-6400(Z16 Gen 2 / EM780 / P16s Gen 2) | 121.3 / 130.1 / 133.4 ns | 同上 | [二次] |

- **同じ AMD モバイル(Phoenix 系)のメモリコントローラで、DDR5-5600 ≈ 90 ns、LPDDR5X-7500 ≈ 115〜120 ns(+25〜30%)**。LPDDR5X-8000 の値は未取得(Strix Point の 128 ns は SO-DIMM 対照がないので差は出せない)。
- 帯域は LPDDR5X が上、遅延は DDR5 が上。#8 の HX 370 で ST が DDR5 機 +1.5%、MT が LPDDR5X 機 +16% という向きはこれと整合する。

---

## 3. ユーザー申告「DDR5-5600 対 LPDDR5X-8000 で MT 8〜15% 差」の裏付け

- **直接の裏付け(GB7・同一 CPU・8000)は未確認**。ユーザーの数値の出典は見つからなかった。
- **近い実測**: HX 370 の DDR5-5600 SO-DIMM 機 対 LPDDR5X(7500)機で **GB6 MT +16.1%、GB5 MT +7.1%**(#8・#9。別機種・電力差あり)。STH 本文の「5-13%」「5-10%」。これらは申告の 8〜15% と**範囲としては重なる**(GB6 は少し上、GB5 は少し下)。
- **帯域からの換算(§4 の感度を当てはめた [推定])**: 理論帯域 +42.9% に MT の帯域弾性 0.2〜0.45 を掛けると MT +7.4〜+17.4%(中央 0.3 で +11.3%)。申告と矛盾しない。
- ST については申告がないが、実測(#8・#9)では **LPDDR5X のほうが 0〜1.5% 低い**(遅延が大きいため)。
- **結論**: 「部分的に裏付けあり(GB5/GB6、LPDDR5X-7500、別機種比較 1 組)。GB7 での同条件の比較は未確認」。

---

## 4. 感度(ST/MT 別)

弾性 e を「ln(スコア比) ÷ ln(帯域比)」で定義(帯域 +10% のとき スコア +約 e×10%)。帯域は AIDA64 Read の実測があればそれ、なければ理論帯域。

### 4-A. MT の帯域弾性

| # | 条件 | 帯域比 | MT 比 | e(実測帯域) | e(理論帯域) |
|---|---|---|---|---|---|
| 1 | 9950X GB7 4800→6000 | 1.265(実測) / 1.25(理論) | 1.062 | **0.26** | 0.27 |
| 2 | 9950X GB7 6000→8000 | 1.098 / 1.333 | 1.042 | **0.44** | 0.14 |
| 3 | 9950X GB7 4800→8000 | 1.389 / 1.667 | 1.107 | **0.31** | 0.20 |
| 5 | 9950X GB6? 6000→8000 | — / 1.333 | 1.084 | — | **0.28** |
| 6 | 285K GB6? 6000?→8000 | — / 1.333 | 1.085 | — | **0.28** |
| 7 | 12600K GB5 DDR4-3600→DDR5-5200 | 1.353 / 1.444 | 1.094 | **0.30** | 0.24 |
| 8 | HX 370 GB6 DDR5-5600→LPDDR5X-7500(別機種) | — / 1.339 | 1.161 | — | **0.51** |
| 9 | 同 GB5 | — / 1.339 | 1.072 | — | **0.24** |
| 10 | SER9 GB6 7500→8000 | — / 1.067 | 1.0015 | — | 0.02 |
| 11 | CPU 不明 GB6 4800→6000 | — / 1.25 | 1.086 | — | 0.37 |

- **MT の帯域弾性の範囲: 0.2〜0.45(代表 0.3)**。#8 の 0.51 は機種差込みの上限、#10 の 0.02 は確度の低い下限。帯域 +10% で MT +2〜+4.5%(代表 +3%)。
- 遅延も同時に変わる(#1 は帯域 +27% と遅延 -15% が同時)ので、**帯域と遅延の寄与は分離できていない**。弾性は「その構成変化の総合効果」として読む。
- **コア数依存**: 9950X(16C/32T)と 285K(24C/24T)で 6000→8000 がどちらも +8.4〜8.5%(#5・#6)。12C の HX 370(2ch)で 0.24〜0.51、10C の 12600K で 0.24〜0.30。**コア数(またはコアあたり帯域)との関係は、この標本では見えない**。8 コア以下の同条件比較は未取得。
- **GB の版**: 9950X の 6000→8000 は GB7 で +4.2%(#2)、GB6(と思われる)で +8.4%(#5)。ただしタイミング(GB7 は 6000 CL28 という強い基準、#5 はタイミング不明)とキット容量(16GB×2 対 24GB×2)も違うため、版の差とは断定できない。**GB7 は GB6 より帯域感度が低い可能性があるが未確認**。

### 4-B. ST

| # | 条件 | ST 比 | 遅延比 | 読み |
|---|---|---|---|---|
| 5 | 9950X GB6? 6000→8000 | 1.034 | 未取得 | 帯域 +33%(理論)で +3.4%(帯域弾性 0.12) |
| 6 | 285K GB6? 6000?→8000 | 1.022 | 未取得 | 帯域弾性 0.08 |
| 7 | 12600K GB5 DDR4-3600→DDR5-5200 | 0.986 | 1.079 | 帯域 +35% でも遅延 +8% で -1.4%(遅延弾性 -0.19。ただし帯域増の正の寄与と相殺した残り) |
| 8 | HX 370 GB6 DDR5-5600→LPDDR5X | 0.985 | (Phoenix 系の値で約 1.25〜1.3。[推定]) | 遅延弾性に直すと約 -0.06(仮定の遅延比を使った [推定]) |
| 9 | 同 GB5 | 1.000 | 同上 | 0 |
| 10 | SER9 7500→8000 | 1.003 | 未取得 | ほぼ 0 |
| 11 | CPU 不明 GB6 4800→6000 | 1.012 | 未取得 | 帯域弾性 0.05 |

- **ST の変化幅: -1.5%〜+3.4%**。同じ種別内で速度を上げる(帯域↑・遅延↓が同時)と ST +1〜3%。種別を変えて遅延が悪化する(DDR4→DDR5 初期、DDR5→LPDDR5X)と、帯域が増えても ST は 0〜-1.5%。
- 遅延弾性(d ln ST / d ln 遅延)は **-0.05〜-0.2**。設計書 §5.3.3 J-3 のモデル試算(Zen 5 -0.06〜-0.07、Intel -0.05〜-0.07、Zen 3 モバイル -0.10)は範囲の下側。実測 #7 の -0.19 は帯域増の正の寄与を引く前の値なので、純粋な遅延弾性はもっと大きい(絶対値)可能性がある(分離できない)。
- **GB7 の ST の実測は 0 件**。

### 4-C. 不確かさのまとめ

- 標本は実質 4 系統(9950X GB7、9950X/285K GB6?、12600K GB5、HX 370 GB5/6)。GB7 は 1 系統・MT のみ。
- タイミング・UCLK 比・キット容量・電力設定・機種が比較ごとに違い、帯域と遅延を分離できない。
- 1 回測定か複数回の中央値かの記載はどの記事にもない(ばらつき不明)。GB の MT は通常 ±1〜2% 程度揺れるので、+2% 以下の差(#4・#10)は誤差と区別できない。

---

## 5. プリセットごとの対応メモリ

### 5-A. 対応メモリ表(選択式の対象)

公式仕様は Intel ARK([公表])、AMD は Wikipedia([二次])。「現行 cfg.memory」はプリセット(`data/presets/chips-pc.js`)の文字列。**既定(基準構成)案**は、現行 cfg.memory に書かれた先頭の構成、無ければ公式の最大速度の主種別とした([推定]。§6 (e) の注意を参照)。

| プリセット id | 現行 cfg.memory | 公式の対応(種別・最大速度・ch) | 出典 | 選択候補 | 既定案 |
|---|---|---|---|---|---|
| intel-adl-12900k | DDR4-3200 / DDR5-4800, 2ch | DDR5-4800 / DDR4-3200、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/134599/intel-core-i912900k-processor-30m-cache-up-to-5-20-ghz/specifications.html [公表] | DDR4 / DDR5 | DDR5-4800(要決定) |
| intel-adl-12700k / 12600k / 12100 | null | 全 Alder Lake-S: DDR4-3200 または DDR5-4800、2ch | Wikipedia「Alder Lake」[二次] | DDR4 / DDR5 | DDR5-4800(要決定) |
| intel-rpl-13900k | DDR5-5600, 2ch (DDR4-3200 も可) | 全モデル DDR4-3200 / DDR5-4800、i5-13600 以上は DDR5-5600(1DPC)、2ch | Wikipedia「Raptor Lake」[二次] | DDR4 / DDR5 | DDR5-5600 |
| intel-rpl-13700k / 13600k | null | 同上(DDR5-5600 / DDR4-3200) | 同上 | DDR4 / DDR5 | DDR5-5600 |
| intel-rpl-14900k | **未取得** | DDR5-5600 / DDR4-3200、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html [公表] | DDR4 / DDR5 | DDR5-5600 |
| intel-rpl-14700k / 14600k | null | 同上(Raptor Lake の記述) | Wikipedia「Raptor Lake」[二次] | DDR4 / DDR5 | DDR5-5600 |
| intel-rpl-14700hx | null | DDR5-5600 / DDR4-3200、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/235997/intel-core-i7-processor-14700hx-33m-cache-up-to-5-50-ghz/specifications.html [公表] | DDR4 / DDR5(SO-DIMM) | DDR5-5600 |
| intel-arl-285k | **未取得** | DDR5-6400、2ch(DDR4 非対応) | ARK https://www.intel.com/content/www/us/en/products/sku/241060/intel-core-ultra-9-processor-285k-36m-cache-up-to-5-70-ghz/specifications.html [公表]。Wikipedia「Arrow Lake」は UDIMM 5600 / CUDIMM 6400(1DPC)と内訳 [二次] | DDR5 のみ(速度のみ選択) | DDR5-6400(要決定。UDIMM なら 5600) |
| intel-arl-265k | DDR5-6400, 2ch | 同上 | 同上 | DDR5 のみ | DDR5-6400 |
| intel-arl-275hx | null | DDR5-6400、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/242293/intel-core-ultra-9-processor-275hx-36m-cache-up-to-5-40-ghz/specifications.html [公表] | DDR5 のみ | DDR5-6400 |
| intel-mtl-185h | LPDDR5X-7467 / DDR5-5600 | LPDDR5/X-7467 / DDR5-5600、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/236849/intel-core-ultra-9-processor-185h-24m-cache-up-to-5-10-ghz/specifications.html [公表] | LPDDR5X / DDR5 | LPDDR5X-7467(要決定) |
| intel-ptl-x9-386h | null | LPDDR5X-9600 / DDR5-7200、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/245529/intel-core-ultra-9-processor-386h-18m-cache-up-to-4-90-ghz/specifications.html [公表] | LPDDR5X / DDR5 | LPDDR5X-9600(要決定) |
| intel-ptl-x9-388h | **LPDDR5X-9600 / DDR5-7200, 2ch** | **LPDDR5X-9600 のみ**、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/245526/intel-core-ultra-x9-processor-388h-18m-cache-up-to-5-10-ghz/specifications.html [公表] | LPDDR5X のみ(速度のみ) | LPDDR5X-9600 |
| intel-ptl-x9-378h | null | LPDDR5X-9600 のみ、2ch | ARK https://www.intel.com/content/www/us/en/products/sku/246128/intel-core-ultra-x9-processor-378h-18m-cache-up-to-5-00-ghz/specifications.html [公表] | LPDDR5X のみ | LPDDR5X-9600 |
| intel-ptl-x7-358h | null | LPDDR5X-9600 のみ、2ch | ARK 比較ページ https://www.intel.com/content/www/us/en/products/compare.html?productIds=245523%2C245526%2C245527%2C245529%2C245530%2C245531%2C245532%2C245533%2C245713%2C245720%2C245722%2C245727 [公表] | LPDDR5X のみ | LPDDR5X-9600 |
| amd-zen1-1800x / 1500x / 1200 | DDR4-2666, 2ch(1800X)/ null | DDR4-2666、2ch | Wikipedia「List of AMD Ryzen processors」(Summit Ridge)[二次] | DDR4 のみ(速度のみ) | DDR4-2666 |
| amd-zenplus-2700x / 2600x | DDR4-2933, 2ch(2700X)/ null | DDR4-2933、2ch | 同上(Pinnacle Ridge) | DDR4 のみ | DDR4-2933 |
| amd-raven-2400g / 2200g | null | DDR4-2933、2ch | 同上(Raven Ridge) | DDR4 のみ | DDR4-2933 |
| amd-zen3-5800x / 5600x / 5950x | DDR4-3200, 2ch | DDR4-3200(2×1R / 2×2R)、2ch | 同上(Vermeer) | DDR4 のみ | DDR4-3200 |
| amd-zen3-5800u | null | DDR4-3200 または LPDDR4(X)-4266、2ch(Wikipedia の表記は「LPDDR4-4266」) | 同上(Cezanne の節) | DDR4 / LPDDR4X | 要決定 |
| amd-zen3p-7735hs | null | DDR5-4800 または LPDDR5-6400、2ch | 同上(Rembrandt-R) | DDR5 / LPDDR5 | 要決定 |
| amd-zen4-7700 / 7950x | DDR5-5200, 2ch | DDR5-5200(2×1R / 2×2R)、2ch | 同上(Raphael) | DDR5 のみ | DDR5-5200 |
| amd-zen4-7840hs | null | DDR5-5600 または LPDDR5X-7500、2ch | 同上(Phoenix) | DDR5 / LPDDR5X | 要決定 |
| amd-zen5-9700x / 9950x | DDR5, 2ch | DDR5-5600(2×1R / 2×2R)、2ch | 同上(Granite Ridge) | DDR5 のみ | DDR5-5600 |
| amd-strix-hx370 | DDR5-5600 / LPDDR5X-8000 | DDR5-5600 または LPDDR5X-8000、2ch(発売時は LPDDR5X-7500。8000 への引き上げは TechPowerUp ニュース=403 で取得不可、検索要約) | 同上(Strix Point) | DDR5 / LPDDR5X | 要決定 |
| amd-kraken-350 | DDR5-5600 / LPDDR5X-8000 | Wikipedia では Strix Point と同じ節(DDR5-5600 / LPDDR5X-8000)。Krackan 個別の記載は無い | 同上 | DDR5 / LPDDR5X | 要決定 |
| amd-epyc-7401 | null | DDR4-2666、**8ch** | Wikipedia「Epyc」[二次] | DDR4 のみ | DDR4-2666 8ch |

### 5-B. 選択対象外(メモリ固定)の候補

| プリセット | 理由 | 出典 |
|---|---|---|
| intel-lnl-268v / 258v / 256v | オンパッケージ LPDDR5X-8533 固定(ARK は LPDDR5X-8533、2ch、最大 32GB / 32GB / 16GB) | ARK 268V / 258V / 256V(本文 §5-A と同形式の URL、sku 240958 / 240957 / 240954)[公表] |
| amd-strixhalo-395 | はんだ付け LPDDR5X のみ、256bit(最大 8000) | Wikipedia「List of AMD Ryzen processors」[二次] |
| Apple A / M 全プリセット | SoC 固定(LPDDR、パッケージ上) | (プリセットは memory: null) |
| Qualcomm / MediaTek 全プリセット(8cx Gen 3 含む) | SoC 固定(スマホ・PC とも LPDDR 直付け) | 同上 |
| nv-orin-agx / nv-thor / nv-t239 | モジュール・SoC 固定(cfg.memory に LPDDR5 256bit 等が既に入っている) | プリセット |

### 5-C. 食い違い

- **intel-ptl-x9-388h**: 現行 cfg.memory「LPDDR5X-9600 / DDR5-7200」だが、ARK は LPDDR5X-9600 のみ。DDR5-7200 は 386H(と 366H・356H・336H)だけ。**プリセットの記載誤りの可能性**。
- **intel-arl-285k / 14900k**: 現行は「未取得」だが ARK で取れた(DDR5-6400 / DDR5-5600・DDR4-3200)。
- **amd-zen5-9700x / 9950x**: 現行「DDR5, 2ch」(速度なし)。Wikipedia は DDR5-5600。
- **amd-strix-hx370**: 発売時の仕様は LPDDR5X-7500、後に 8000(検索要約)。実機の多くは 7500(#10 の SER9 も 7500)。
- **amd-zen3-5800u**: Wikipedia の文言は「LPDDR4-4266」(LPDDR4X と書いていない)。
- **Arrow Lake-S**: ARK は DDR5-6400 の 1 値、Wikipedia は UDIMM 5600 / CUDIMM 6400 と分ける。

---

## 6. 報告のまとめ

### (a) 実測データ表
§1-A の表。GB7 は 9950X の MT だけ(4800→6000 +6.2%、6000→8000 +4.2%、4800→8000 +10.7%)。GB6(と思われる)は 9950X / 285K で 6000→8000 が ST +2.2〜3.4%、MT +8.4〜8.5%。GB5 は 12600K の DDR4-3600→DDR5-5200 で ST -1.4%、MT +9.4%。HX 370 の DDR5-5600 SO-DIMM 対 LPDDR5X-7500(別機種)で GB6 ST -1.5% / MT +16.1%、GB5 ST 0% / MT +7.1%。

### (b) 感度の範囲と不確かさ
- **MT**: 帯域弾性 0.2〜0.45(代表 0.3)。帯域 +10% → MT +2〜4.5%。コア数依存は標本からは見えない(未取得)。
- **ST**: 同種別で速度を上げると +1〜3%(帯域弾性 0.05〜0.12)。遅延が悪化する種別変更(DDR4→DDR5 初期、DDR5→LPDDR5X)では 0〜-1.5%。遅延弾性 -0.05〜-0.2。GB7 の ST は実測 0 件。
- 不確かさ: §4-C。GB7 の標本は 1 系統だけ。帯域と遅延は分離できていない。

### (c) 対応メモリ表
§5-A(選択式)、§5-B(固定・対象外)。

### (d) 未取得・食い違い
- 未取得: GB7 の ST のメモリ依存、GB7 の LPDDR5X 対 DDR5 同一 SKU 比較、Zen 3 DDR4 速度別の Geekbench、Meteor Lake / Hawk Point の同一 SKU 比較、LPDDR5X-8000(AMD)と DDR5-5600 の同一機構での遅延、コア数の違う SKU で同条件のメモリ比較。
- 取得不可: TechPowerUp・Guru3D・gdm.or.jp(403)、AnandTech(接続拒否)。
- 食い違い: §5-C(388H の DDR5 表記など)。ユーザー申告の出典は見つからず、「部分的に裏付け(GB5/GB6、7500、別機種 1 組)」。

### (e) モデル化の推奨

1. **式の形(比で掛ける)**
   ```
   ST = ST_model(既存) × (L_ref / L)^a_ST × (B / B_ref)^b_ST
   MT = MT_model(既存) × (B / B_ref)^b_MT
   ```
   - B: 理論帯域 = MT/s × 合計バス幅 / 8(§2-A)。DDR5-8000 以上の AMD は UCLK 1:2 で実効帯域が伸びない(#2 は理論 +33% に対し実測 +10%)ので、**理論帯域を使うなら係数を小さめ(0.2)**、実効帯域の表を持つなら 0.3。
   - L: 種別ごとの DRAM 遅延の表(例: デスクトップ DDR4 ≈ 76 ns、DDR5-4800 JEDEC ≈ 91 ns、DDR5-6000 EXPO ≈ 77 ns、モバイル DDR5-5600 SO-DIMM ≈ 90 ns、LPDDR5X ≈ 115〜140 ns。§2-B の値。速度とタイミングで変わるので、表は「種別 × 速度」で持つか、種別だけで持って速度は帯域項に任せる)。
   - 推奨値(範囲): b_MT = 0.3(0.2〜0.45)、b_ST = 0.08(0.05〜0.12)、a_ST = 0.1(0.05〜0.2)。
   - **既存の `dramNs: 85`(perf.js の ST の CPI 積み上げ)と遅延項の二重計上に注意**。遅延は既存の CPI モデル(dramNs を構成ごとに差し替える)で入れ、比の式は帯域項だけにする方が筋がよい。設計書 §5.3.3 J-3 の試算(dramNs 85→128 ns で ST -2.8% 等)は実測 #8 の -1.5% より大きめ。
   - **MT の min(…, BW/B_score) 型の頭打ち(設計書 §5.2.2)は、この標本では支持されない**: 実測は「頭打ち」ではなく、どの構成でも緩やかに効く(べき乗型)。コア数依存は未取得なので、当面はコア数に依らない b_MT 1 つにし、「コア数依存は未校正」と表示するのが妥当。
   - 測定値が少ないため、結果に「メモリ補正: ±(範囲から計算した幅)、根拠 n=4 系統、GB7 は MT 1 系統」と範囲で出すことを推奨。

2. **基準の取り方**
   - 基準構成 = **そのプリセットの公開 GB7 値(校正に使った値)が測られた構成**であるべき。チャート中央値は利用者の構成が混ざる(デスクトップ AMD は EXPO 6000 が多いと思われるが**未確認**。モバイルは機種ごとに DDR5 / LPDDR5X が混在)。公開値の構成は Geekbench Browser が 403 のため**取得不可**。
   - 現実的には「公式の最大速度(JEDEC)の主種別」(§5-A の既定案)を基準とし、注記で「公開値の構成とは一致しない可能性がある」と書く。デスクトップ AMD の公開値が EXPO 6000 中心なら、基準を 5200/5600 にすると選択肢 6000 で二重に上がる(+2〜3%)点に注意。
   - モバイルで DDR5 / LPDDR5X 両対応のプリセット(185H・386H・HX 370・Kraken・7840HS・7735HS・5800U)は既定を**要決定**。nbc-gb7-mobile.md の標本機の構成(機種ごとに分かる)を見て決めるのがよい。

3. **校正への影響**
   - 補正は比 f(構成)/f(基準) なので、**既定 = 基準構成のとき係数は 1 になり、全プリセットの ST/MT と u・σ の校正値は不変**にできる。校正(`calibrateMt`・u の導出)は補正前の値で行い、補正はその後に掛ける。
   - 選択肢を変えたときだけ値が動く。動く幅は本調査の範囲で、DDR5-5600→LPDDR5X-8000 で MT +7〜17%、ST -1.5〜+1%。DDR4-3200→DDR5-5600(Raptor Lake)で MT +12〜28%(帯域 +75%、b 0.2〜0.45 の [推定])。
   - 混合設計・独自設計(memory: null)は補正なし(係数 1)とし、メモリ選択を出さない。固定メモリのプリセット(§5-B)も選択を出さない。

---

## 出典一覧

- The FPS Review、G.SKILL Trident Z5 Neo RGB DDR5-8000(9950X、GB7): https://www.thefpsreview.com/2026/08/06/g-skill-trident-z5-neo-rgb-ddr5-8000mt-s-expo-memory-review-is-ddr5-8000-worth-it-on-amd-ryzen/3/ (p.2 環境、p.7 結論)
- Hardware Busters、DDR5 6000 vs 8000(9950X / 285K): https://hwbusters.com/cpu/ddr5-6000-vs-8000-mhz-ram-amd-ryzen-9-9950x/4/ 、/3/
- The FPS Review、i5-12600K DDR4 vs DDR5(GB5): https://www.thefpsreview.com/2021/12/13/intel-core-i5-12600k-alder-lake-ddr4-vs-ddr5-performance/4 、/3、/6
- ServeTheHome、Acemagic F3A(HX 370 DDR5-5600 対 SER9 LPDDR5X): https://servethehome.com/acemagic-f3a-an-amd-ryzen-ai-9-hx-370-mini-pc-with-up-to-128gb-of-ram/3 、/4
- Wccftech、Beelink SER9: https://wccftech.com/review/beelink-ser9-amd-ryzen-ai-9-hx-370-mini-pc-review-fastest-igpu-on-the-market/amp/
- ReHWolution、Geekbench 6 – Patriot Viper Venom DDR5-6200: https://www.rehwolution.it/?p=116762
- Framework コミュニティ(NBC 遅延値の転記): https://community.frame.work/t/introducing-the-new-framework-laptop-13-with-intel-core-ultra-series-1-processors/51758/94
- Chips and Cheese(設計書 §5.3.3 J-3 に既出): https://chipsandcheese.com/p/amds-strix-point-zen-5-hits-mobile 、https://chipsandcheese.com/p/amds-ryzen-9950x-zen-5-on-desktop 、https://chipsandcheese.com/p/strix-halos-memory-subsystem-tackling
- Intel ARK: §5-A の各 URL、Lunar Lake 268V https://www.intel.com/content/www/us/en/products/sku/240958/intel-core-ultra-7-processor-268v-12m-cache-up-to-5-00-ghz/specifications.html 、258V https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html 、256V https://www.intel.com/content/www/us/en/products/sku/240954/intel-core-ultra-7-processor-256v-12m-cache-up-to-4-80-ghz/specifications.html
- Wikipedia: https://en.wikipedia.org/wiki/Alder_Lake 、https://en.wikipedia.org/wiki/Raptor_Lake 、https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor) 、https://en.wikipedia.org/wiki/List_of_AMD_Ryzen_processors 、https://en.wikipedia.org/wiki/Epyc
