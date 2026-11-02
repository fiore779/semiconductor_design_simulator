# Apple の CPU コアの uarch の調査(A12〜A20 Pro、M3 / M3 Pro / M3 Max ほか。2026-11-02)

対象: `data/uarch.js` に Apple の uarch を足して、A シリーズ(A12〜A20 Pro)と M3 系の ST/MT を計算できるようにするための資料集め。**この文書は調査の記録だけです。`data/uarch.js`・プリセット・`gb7-scores.js` は変更していません。**

区分: [実測] > [公表] > [二次] > [推定] / 未取得。「検索要約」は検索結果の要約だけで、原ページを確認していないものです。「取得不可」はボット対策・403・接続拒否・ログイン必須で読めなかったページで、回避していません。

試算スクリプト: `C:\Users\kazut\AppData\Local\Temp\claude\C--LocalAI\2b29d328-e730-4ba9-bee8-aa44168650d2\scratchpad\apple\trial.js`(データは編集せず、メモリ上で uarch とコアを差し替えて `makeContext`→`evaluate` を実行)。

---

## 0. 現状の確認(リポジトリ内)

### 0.1 `data/uarch.js` の Apple のレコード(41〜51 行。そのまま写し)

```js
'Firestorm': u({ width: 8, decodeWidth: 8, rob: 330, brPenalty: 13, l1dKB: 128, l1dLat: 3, l2KB: 3072, l2Lat: 18, vecBits: 128, note: 'ROB はリタイアキュー約330エントリ(1エントリ最大7µop)。AnandTech 由来の630という値もあるが裏付け弱い。L2 は12MB/4コアクラスタ' }),
'Icestorm': u({ vecBits: 128, note: 'L1I 128KB / L1D 64KB / L2 4MB/4コア。幅・ROB は未取得' }),
'Avalanche': u({ rob: 274, l2KB: 4096, vecBits: 128, note: 'ROB は jia.je の値(Firestorm より小さいとの分析)。要確認。L2 は M2 の 16MB/4コアクラスタを換算(A15 は 12MB/2P で 6144KB と値が違う。プリセット間で l2KB を使い分けていない)' }),
'Everest': u({ decodeWidth: 9, rob: 321, vecBits: 128, note: 'Geekerwan のフォーラム経由の値。出典は A17 の解析で、Everest の世代対応(A16 か A17 か)は資料間で食い違う' }),
'Vortex': u({ note: '数値は未取得(A12 の P コア)' }),
'Tempest': u({ note: '数値は未取得(A12 の E コア)' }),
'Lightning': u({ note: '数値は未取得(A13 の P コア)' }),
'Thunder': u({ note: '数値は未取得(A13 の E コア)' }),
'Blizzard': u({ note: '数値は未取得(A15/M2 の E コア)' }),
'Sawtooth': u({ note: '数値は未取得(A16 の E コア)' }),
```

- 書式: `u({...})` は既定値(全て null、`smt:1`、`s:'sec'`、`uFrom:null`)に上書き。`l2KB` は**コアあたり**(クラスタ共有の L2 は共有コア数で割り、note に書く)。`brPenalty`・`l2Lat`・`l3Lat` はサイクル。出典は note に書き、レコード単位の `s` は `'sec'`。
- `js/sim/perf.js` の ST が使う値: 幅(`width`、無ければ `decodeWidth`)と ROB(IPC の天井 = min(幅, 0.55×√ROB))、`brPenalty`(無ければ 15)、`l1dKB`・`l2KB`(容量のミス率)、`l2Lat`(無ければ 13)、`l3Lat`(無ければ 40)、`mshr`(無ければ 10)。**Apple のプリセットは `l3MB` が無いので、L3(SLC)は参照値 2MB・遅延 40 で計算されます**(SLC 容量・遅延は今のモデルでは使われない)。
- **重要な観察**: Apple の P コアは ROB が 270〜360 なので 0.55×√ROB = 9.0〜10.4 になり、**IPC の天井はほぼ幅(8・9・10)で決まります**。幅を 8→9 にすると基本 CPI が 12.5% 下がり、ST が約 +12% 動きます(§3)。

### 0.2 プリセット(`data/presets/chips-soc.js`)と現状の評価(実行して確認)

A シリーズは全て P 2 + E 4。`aCores` で uarch が付くのは A12〜A16 だけ。

| プリセット | P(uarch / 数 / maxGHz) | E(uarch / 数 / maxGHz) | GB7 ST / MT(区分・n) | 今の ST | 今の MT |
|---|---|---|---|---|---|
| apple-a12 | Vortex / 2 / 2.49 | Tempest / 4 / 1.59 | 1207 / 2705(中央値 n=6) | 幅・ROB 未取得 | 同左 |
| apple-a13 | Lightning / 2 / 2.66 | Thunder / 4 / 1.72 | 1486 / 3306(n=5) | 幅・ROB 未取得 | 同左 |
| apple-a14 | Firestorm / 2 / 3.0 | Icestorm / 4 / 1.82 | 1894 / 4501(n=6) | 2054(+8.4%) | E: 幅・ROB 未取得 |
| apple-a15 | Avalanche / 2 / **2.93** | Blizzard / 4 / 2.02 | 2078 / 5366(n=8) | 2051(−1.3%) | E: 幅・ROB 未取得 |
| apple-a16(代表) | Everest / 2 / 3.46 | Sawtooth / 4 / **null** | 2352 / 6373(n=null) | 2352(0.0%。u=163.7) | E のクロック未取得 |
| apple-a17pro | なし / 2 / 3.78 | なし / 4 / 2.11 | 2527 / 6863(n=3) | uarch 未指定 | 同左 |
| apple-a18 | なし / 2 / 4.05 | なし / 4 / 2.42 | 2798 / 7582(n=3) | uarch 未指定 | 同左 |
| apple-a18pro | なし / 2 / **null** | なし / 4 / **null** | 2897 / 7802(**n=2**) | クロック未取得 | 同左 |
| apple-a19pro | なし / 2 / 4.26 | なし / 4 / 2.6 | 3160 / 8778(n=3) | uarch 未指定 | 同左 |
| apple-a20pro | なし / 2 / 4.93 | なし / 4 / 2.64 | 3986 / 11206(n=3) | uarch 未指定 | 同左 |
| apple-m3 | なし / 4 / 4.05 | なし / 4 / 2.75 | 2749 / 11685(n=3) | uarch 未指定 | 同左 |
| apple-m3pro | なし / 6 / 4.05 | なし / 6 / 2.75 | 2819 / 16728(n=3) | uarch 未指定 | 同左 |
| apple-m3max | なし / 12 / 4.05 | なし / 4 / 2.75 | 2828 / 24512(n=4) | uarch 未指定 | 同左 |
| apple-m4 | なし / 4 / 4.4 | なし / 6 / 2.85 | 3242 / 13472(n=null) | uarch 未指定 | 同左 |

- 校正: Everest の u = 163.7(A16 が代表)、Firestorm 151.6(M1)、Avalanche 162.1(M2)、arm の ISA 平均 113.0。MT の σ=0.0274 は AMD 3 件(1800X・7700・9700X)だけで合わせていて、Apple の代表は MT の σ に使われていません(E コアが計算できないため)。
- 設計書の「Apple の uarch 未登録 15 件」は、上の uarch なしの A17 Pro〜A20 Pro(5)、M2 Pro/Max/Ultra、M3/Pro/Max、M4/Pro、M5/Max の P/E コアを指します(m3pro・m3max は 2026-11-01 にコアが入り「コアなし」→「uarch 未指定」)。

---

## 1. 主な資料と取得の状態

| 資料 | 状態 | 内容 |
|---|---|---|
| **Geekerwan(极客湾)の構成図**(Bilibili BV1gm4y157No = A17 Pro の評価、BV1NJ4m1w7zk = M4 の評価)。jiegec/cpu リポジトリに保存されたスクリーンショット `data/geekerwan/a14_a16…png`・`a16_a17…png`・`a17…png`・`a17_ecore…png`・`m2_m3…png`(https://github.com/jiegec/cpu/tree/master/data/geekerwan) | **画像を直接取得して読んだ**。Bilibili の動画本体は未確認 | A16・A17 Pro の P、A17 Pro の E、M2・M3 の P の幅・ROB・スケジューラ・実行ポート・LDQ/STQ・物理レジスタ。A14/A15/A16 の比較数値 |
| **jia.je(Jiajie Chen)の構成図** https://jia.je/cpu/m3_pcore.html ・ m4_pcore.html ・ avalanche.html ・ firestorm.html(SVG を直接取得してテキストを抽出) | 直接 | M3 P・M4 P・「Avalanche」・Firestorm の図。M3/M4/Avalanche は「Based on data from Geekerwan」と明記。Firestorm は Chips and Cheese・Dougall・AnandTech などから |
| jia.je の比較表 https://jia.je/cpu/comparison.html | 直接 | Firestorm・Avalanche・Icestorm の ROB・L1I・実行ユニット数 |
| **Dougall Johnson** https://dougallj.github.io/applecpu/firestorm.html ・ icestorm.html | 直接 | Firestorm・Icestorm の幅・リタイアキュー・実行ユニット・レイテンシ |
| Dougall の A17 Pro の第一印象(A15 ~293・A16 ~270・A17 ~320、デコード 8→9) | **検索要約**(MacRumors フォーラムの引用。原ページ未確認。forums.macrumors.com は以前の調査で 403) | — |
| Wikipedia「Apple silicon」「Apple A12〜A20 Pro」「Apple M3/M4/M5」(wikitext を直接取得) | 直接 | コア名、クロック、L1・L2・SLC |
| Notebookcheck の各 SoC の仕様ページ(§4 に URL) | 直接 | クロック範囲、GB7・GB6 の値 |
| Apple Silicon CPU Optimization Guide https://developer.apple.com/documentation/apple-silicon/cpu-optimization-guide | **取得不可**(本体は開発者アカウントのログインと追加の同意が必要。概要ページのみ直接取得) | 構造サイズ・レイテンシの表があると概要に記載 |
| AnandTech(anandtech.com/show/…) | **取得不可**(forums.anandtech.com へ 301。at-web1.www.anandtech.com は接続拒否。web.archive.org はツールが取得不可) | A12・A13 の値は検索要約のみ |
| Chips and Cheese | Apple の CPU コアの記事は検索で見つからず(M2 Pro の iGPU 記事のみ)。**未取得** | — |
| Maynard Handley "Apple M1 Overview" | 今回は未確認(時間の都合)。**未取得** | — |
| WikiChip | 今回は未アクセス。**未取得** | — |

**Geekerwan と Dougall は別系統の測定**です。設計書の「Avalanche・Everest の ROB は出典が実質 1 系統(Dougall → Handley)」という判断に対し、A16・A17 Pro の ROB は Geekerwan の図という 2 系統目が見つかりました(ただし Dougall 側は検索要約のみ)。

---

## 2. (a) 世代ごとの値と区分

凡例: 「G」= Geekerwan の測定図(スクリーンショット。区分は **[二次]**。中身は Geekerwan の実測だが、動画本体と測定条件は未確認のため [実測] とはしない)。「W」= Wikipedia(wikitext 直接)[二次]。「N」= Notebookcheck の仕様ページ(直接)[二次]。

### 2.1 A12(Vortex / Tempest)・A13(Lightning / Thunder)

| 項目 | Vortex(A12 P) | Tempest(A12 E) | Lightning(A13 P) | Thunder(A13 E) |
|---|---|---|---|---|
| デコード幅 | 7 — 検索要約(AnandTech の A13 記事の転載ページ「Lightning は 7-wide のデコードを維持」から逆算) | 未取得 | 7 — 検索要約(同上) | 未取得 |
| rename/リタイア幅 | 未取得 | 未取得 | 未取得 | 未取得 |
| ROB | 未取得 | 未取得 | 未取得 | 未取得 |
| 整数 ALU / FP | 6 ALU(フラグを立てる ALU 2)— 検索要約 | 未取得 | 6 ALU(フラグを立てる ALU 3)・FP/ベクトル 3 — 検索要約 | 未取得 |
| L1I / L1D | 128 / 128 KB — W | 32 / 32 KB — W | 128 / 128 KB — W | 96 / 48 KB — W |
| L2 | 8 MB(P 2 コア共有 → 4096 KB/コア)— W | 2 MB — W | 8 MB — W | 4 MB — W |
| L2 遅延 | 16 サイクル — 検索要約(koc.com.tw・36kr の AnandTech 転載) | 未取得 | 14 サイクル — 検索要約(同上) | 未取得 |
| SLC | 8 MB — W | — | 16 MB — W | — |
| DRAM 遅延 | 未取得 | — | 約 104 ns — 検索要約(AnandTech A13) | — |
| 分岐ミスペナルティ | 未取得 | 未取得 | 未取得 | 未取得 |
| 最大クロック | 2.49 GHz — W(出典は Geekbench Browser の iPhone XS ページ) | 1.59 GHz — W | 2.66 GHz — W(表)/ 2.65 — W(A13 記事) | 1.72 GHz — W |

→ **A12・A13 は幅・ROB が [二次] の原ページで確認できず、登録できる値が揃いません。**

### 2.2 A14(Firestorm / Icestorm)・A15(Avalanche / Blizzard)

| 項目 | Firestorm(A14/M1 P) | Icestorm(A14/M1 E) | Avalanche(A15 P) | Blizzard(A15 E) |
|---|---|---|---|---|
| デコード / rename | 8 / 8 — jia.je 比較表・図。Dougall「pipeline width 8 uops」 | 未取得(Dougall はリタイア 4/サイクルのみ) | 8(A14/A15/A16 とも 8 Wide Decode の図)— G | 未取得 |
| ROB | 約 330(coalesced retire queue。1 エントリ最大 7 µop)・rename retire 約 623 — Dougall [二次]。G は A14 = 334 | coalesced retire 約 60・in-flight rename 約 111 — Dougall | **G: 390**(A14 334 / A15 390 / A16 274 の比較)。Dougall(検索要約): 約 293。jia.je 比較表: 274(§5 食い違い) | 未取得 |
| 物理レジスタ(整数 / FP) | 約 380 / 約 432 — Dougall・jia.je。G は 432 / 385(A14) | 約 79 / 約 87 — Dougall | G: 399 / 371 | 未取得 |
| 整数 ALU / LSU / FP | 6 ALU(分岐 2)/ 4(2 LD + 1 ST + 1 LD/ST)/ 4×128b — Dougall・jia.je | 3 ALU / 2(LD/ST + LD)/ 2 — Dougall | 6 / 4 / 4×128b — jia.je 比較表 | 未取得 |
| L1I / L1D | 192 / 128 KB — W・jia.je | 128 / 64 KB — W・jia.je | 192 / 128 KB — W | 128 / 64 KB — W(表の M2 行) |
| L2 | A14: 8 MB/2P(4096 KB/コア)、M1: 12 MB/4P(3072 KB/コア)— W | 4 MB — W | A15: 12 MB/2P(6144 KB/コア)、M2: 16 MB/4P(4096 KB/コア)— W | 4 MB — W |
| L2 遅延 | 18(既存の値。出典の記載なし)| 未取得 | 未取得 | 未取得 |
| L1 遅延 | load-to-use 4、ポインタ追跡 3 サイクル — jia.je 図(Firestorm) | ロード→ロード 3c — Dougall | 未取得 | 未取得 |
| SLC | A14 16 MB、M1 8 MB — W | — | A15 32 MB、M2 8 MB — W | — |
| 分岐ミスペナルティ | 13(既存。techboards のフォーラムがガイド旧版の値として言及 — 検索要約) | 未取得 | 未取得 | 未取得 |
| 最大クロック | A14 3.00 / M1 3.20 / M1 Pro・Max 3.23 GHz — W | A14 1.82 / M1 2.06 GHz — W | **A15: 3.23(iPhone 13 Pro)・2.93(iPad mini 6・iPhone 13)** — W。M2 3.49 — W | 2.02(A15)/ 2.42(M2)— W |

### 2.3 A16(Everest / Sawtooth)— 登録済みの確認

| 項目 | Everest(A16 P) | Sawtooth(A16 E) |
|---|---|---|
| デコード / rename | **8 / 8**(「8 Wide Decode」「8 µops」)— G(a14_a16・a16_a17 の両方の図) | 未取得 |
| ROB | **274**(Coalesced Retire Queue)、PRRT 586 — G。Dougall(検索要約)約 270 | 未取得(設計書 E3 の rob 108 は Handley 経由で未承認) |
| 物理レジスタ | 整数 約 350 / FP 約 380 — G | 未取得 |
| 整数 ALU / LSU / FP | 6 ALU(分岐 2)/ 4(ST・LD/ST・LD・LD)/ 4 — G | 未取得 |
| スケジューラ | 24・26・16・12・28・28(整数)、52(メモリ)、36×4(FP)— G | — |
| LDQ / STQ | 128 / 60 — G | — |
| L1I / L1D | 192 / 128 KB — G・W | 未取得 |
| L2 | 16 MB/2P(8192 KB/コア)— W | 4 MB — W |
| SLC | 24 MB — W | — |
| L2 遅延・分岐ミス・DRAM 遅延 | 未取得 | 未取得 |
| 最大クロック | 3.46 GHz — W・N(2020–3460 MHz) | **2.02 GHz** — W・N(プリセットは null) |

**既存の `Everest`(decodeWidth 9・rob 321)は A16 の値ではなく、A17 Pro(と M3)の P コアの値です。** Geekerwan の図で A16 = 8-wide・ROB 274、A17 Pro = 9-wide・ROB 321 が並べて示されています(§5 食い違い 1)。

### 2.4 A17 Pro(P: Geekerwan の表記「Coll」/ Wikipedia「Everest 第 2 世代」、E: Wikipedia「Sawtooth 第 2 世代」)と M3 系

| 項目 | A17 Pro P | A17 Pro E | M3 P(iMac 2023 で測定) | M3 E |
|---|---|---|---|---|
| コアの同一性 | — | — | **「同 A17 Pro」**(M3 の P は A17 Pro の P と同じ)— G(m2_m3 の図) | 未取得(jia.je の索引に「M3 E-Core」の項目名だけあり、ページなし) |
| デコード / rename | **9 / 9** — G。jia.je 図も 9-way decode・9-way rename | **5 / 5** — G | 9 / 9 — G・jia.je | 未取得 |
| ROB | **321**(coalesced)、PRRT 670 — G・jia.je。Dougall(検索要約)約 320 | **122**(coalesced)、PRRT 137 — G | 321 — G・jia.je | 未取得 |
| 物理レジスタ(整数 / FP) | 約 368 / 約 423 — G | 約 141 / 約 135 — G | 約 368 / 約 423 | 未取得 |
| 整数 ALU / LSU / FP | **8 ALU(分岐 3)/ 4 / 4** — G | 3 ALU / 2 / 3 — G | 8 / 4 / 4 — G・jia.je | 未取得 |
| LDQ / STQ | 145 / 65 — G(jia.je の M3 図は 142 / 63) | 44 / 24 — G | 142 / 63 — G・jia.je | 未取得 |
| L1I / L1D | 192 / 128 KB — G・W | 128 / 96 KB — W(G の図は L1I 192KB と表記。§5) | 192 / 128 KB — W・jia.je | 未取得 |
| L2 | 16 MB/2P(8192 KB/コア)— W | 4 MB — W | M3 16 MB/4P(4096)、M3 Pro 16 MB/6P(2731)、M3 Max 16 MB×2 クラスタ/12P(2731。内訳は推定)— W(既存の m3-pro-max.md) | 4 MB — W |
| L2 遅延 | 未取得 | 未取得 | 未取得(M3 Max で別クラスタの L2 は遅いという投稿のみ。検索要約) | 未取得 |
| SLC | 24 MB — W(A17 Pro の表は空欄。A16 と結合の可能性あり) | — | M3 8 / M3 Pro 12 / M3 Max 48 MB — W | — |
| 分岐ミス・DRAM 遅延 | 未取得 | 未取得 | 未取得 | 未取得 |
| 最大クロック | 3.78 GHz — W(GSMArena の Geekbench 記事)・N(2110–3780 MHz) | 2.11 GHz — W・N | 4.05 GHz — W(Tom's Hardware の Geekbench 記事)・N(2748–4056 MHz)。Pro/Max も同じ(m3-pro-max.md) | 2.75 GHz — W・N |

**M3 Pro / M3 Max が M3 と同じ P/E コアである根拠**: (1) Notebookcheck「The CPU cores themselves are almost identical on all of the M3 models」[二次](m3-pro-max.md で直接確認済み)、(2) Wikipedia の結合セルで M3〜M3 Max のクロック・L1 が同じ [二次]、(3) Geekerwan は M3(無印)の P を A17 Pro と同じとしている [二次]。**M3 Pro / Max そのものを測った資料は見つかっていません**。E コアについては Geekerwan の比較もなく、根拠は (1) だけです。

### 2.5 A18 / A18 Pro、A19 Pro、A20 Pro、M4、M5

| 項目 | A18 / A18 Pro P | A18 E | A19 Pro P | A19 Pro E | A20 Pro S(super)/ E | M4 P | M5 S |
|---|---|---|---|---|---|---|---|
| コア名 | Everest 第 3 世代 — W(表)。SoC コード名 A18 Tupai / A18 Pro Tahiti — W | Sawtooth 第 3 世代 — W | 未取得(W の表に名前なし。SoC は Tilos / Thera) | 未取得 | 「super」と「efficiency」— W(Apple の呼称)。N は「M6 S-Core / E-Core」 | 未取得(W の Donan 等はダイのコード名) | 「super core」— W |
| デコード / ROB | **未取得**。M4 P = 10-wide・ROB 361 の jia.je 図は参照に A18 の動画も挙げているが、A18 = M4 とは書いていない | デコード 5・ALU 3(A18 Pro E)— Wccftech が Geekerwan の図を説明 [二次] | 未取得(Wccftech は「P コアの差は小さい」とだけ) | **デコード 6・ALU 4**(5→6、3→4)— Wccftech [二次] | 未取得 | **10 / 10・ROB 361**(coalesced)、整数 約 446・FP 約 378、8 ALU / 4 LSU / 4 FP、LDQ 131・STQ 72 — jia.je(Geekerwan の測定) | 未取得 |
| L1I / L1D | 未取得 | 未取得 | 未取得 | 未取得 | S 192/128、E 160/96 KB — W | 192 / 128 KB — jia.je | 未取得 |
| L2 | A18 8 MB、A18 Pro 16 MB(P 2 コア)— W | 4 MB — W(A18 Pro) | 16 MB — W・N | 6 MB — W・N | S 16 MB / E 8 MB — W | 16 MB/4P — W・jia.je | S 16 MB / E 6 MB — W |
| SLC | A18 12 / A18 Pro 24 MB — W | — | 32 MB — W・N | — | 36 MB — W | 8 MB — W | 8 MB — W |
| 遅延・分岐ミス | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 | 未取得(M4 Pro の L2 は近いクラスタで約 27 サイクル、L1D 3 サイクル — David Huang の測定を Reddit が引用。検索要約) | 未取得 |
| 最大クロック | **4.05 GHz**(W の表)/ 4.04(W の A18 記事)/ 4040 MHz(N)。**A18 Pro も同じ**(W・N) | 2.42 GHz — W・N | 4.26 GHz — W・N | 2.6 GHz — W・N(W の A19 記事のインフォボックスは 2.26 で本文の 2.60 と不一致) | 4.93 GHz(Geekbench のリーク。W は GSMArena を引用)・E 2.64 — W | 4.4 GHz(W)/ 4464 MHz(N)。E 2.85(W)/ 2.9(N) | 4.4〜4.46 GHz(W)/ 4608 MHz(N)。E 3.0 GHz |

---

## 3. (c) 試算(メモリ上で uarch を足して計算。プリセットは未変更)

条件: u は既存の仕組み(代表 A16 の u を `uFrom` で借りる。E コアは `uFrom` なしなら ISA 平均)。σ は全ケースで 0.0274(AMD 3 件で決まり、Apple を足しても変わらない)。誤差は GB7 の [中央値] との差。

| ケース | uarch の中身 | A16 | A17 Pro | M3 | M3 Pro | M3 Max |
|---|---|---|---|---|---|---|
| S0 現状 | Everest = 9/321 | ST 0.0% | 未指定 | 未指定 | 未指定 | 未指定 |
| **S1**(資料どおり) | Everest を **8/8/274** に修正(u は 163.7→172.5 に再校正)、新レコード(A17 Pro P = M3 P)**9/9/321**・uFrom Everest | ST 0.0% | **ST +11.8%**(2825) | ST +8.6%(2987) | ST +5.9% | ST +5.6% |
| S1b | Everest を 9/321 のまま、新レコードも 9/9/321・uFrom Everest(A16 と A17 Pro を同じ値で扱う形) | 0.0% | ST +6.1%(2680) | ST +3.1% | ST +0.5% | ST +0.2% |
| S2 | S1 + E(A17 Pro E = Sawtooth 第 2 世代、**5/5/122**、u は ISA 平均 113.7)を A17 Pro・M3 系の E に | MT 計算不能(A16 の E は値なし) | MT **−15.5%** | MT −11.1% | MT −14.7% | MT −6.0% |
| S2b | S2 の E の u を Everest から借用(**根拠なし。確認用**) | 同上 | MT −3.2% | MT −2.4% | MT −6.4% | MT −2.6% |
| S4a | S1 で新レコードに l2KB=4096(M3 の 16MB/4) | — | ST +18.7% | ST +15.3% | +12.5% | +12.1% |
| S4b | Everest と新レコードの両方に l2KB=8192(16MB/2) | 0.0%(u=159.2) | ST +11.3% | ST +8.1% | +5.4% | +5.0% |

感度(コアの対応が未確認のため [推定] での確認用。登録の根拠にはしない):

| ケース | A18 | A18 Pro(4.05 GHz を仮置き) | A19 Pro | A20 Pro | M4 |
|---|---|---|---|---|---|
| S3: M4 P の値(10/10/361)を当てる | ST +16.8% | +12.8% | +7.7% | −4.2% | +7.7% |
| S3b: A17 Pro P の値(9/9/321)を当てる | ST +6.7% | +3.1% | −1.6% | −12.6% | −1.6% |

その他: A15 の P クロックを iPhone 13 Pro の 3.23 GHz にすると、A15 の ST は −1.3% → **+6.9%**(S5)。

読み取り:
1. **M3 系の ST は、資料どおりの値(S1)で 3 件とも ±10% 以内**(+5.6〜+8.6%)。A17 Pro は +11.8% で外れます。A17 Pro の公開値を Notebookcheck の GB7(2 件平均 2688)にすると +5.1% で、[中央値] 2527 が低めである可能性もあります(§4)。
2. 外れの主因は**モデルの形**です。Apple の P コアは IPC の天井が幅で決まり、8→9 で +12.5% になりますが、A16→A17 Pro の実際の IPC の伸びは数 %(Apple の主張は P コア +10% でクロック込み)。幅を正しく入れるほど ST が過大になる構造で、u の借用では吸収できません。
3. A16 の値を正しく直す(S1)と Everest の u が 163.7→172.5 に変わります。A16 は代表なので ST は 0% のままですが、**Everest を借りる全てのチップの ST が約 5% 上がります**。
4. MT は E コアの u を ISA 平均にすると −6〜−16% と低めに出ます(E コアの IPC×113.7 が実機より低い)。E コア専用の代表(校正)が無いので、u の決め方が MT の誤差を左右します。
5. l2KB を入れると ST がさらに +3〜7% 上がり(S4a)、A16 と同じ 8192 を入れれば差は出ません(S4b)。l2KB は uarch に 1 つしか持てないので、M3(4096)・M3 Pro/Max(2731)・A17 Pro(8192)の差は表せません。

---

## 4. ベンチ値(GB7 の公開値の確認と追加取得)

### 4.1 `gb7-scores.js` の Apple の行で標本が弱いもの

| 行 | single / multi | kind・n | 弱い点 |
|---|---|---|---|
| A16 | 2352 / 6373 | 中央値・**n=null** | マルチに「6373 / 5793(機種表記ゆれ)」の 2 値 |
| A18 Pro | 2897 / 7802 | 中央値・**n=2** | n≤2 |
| M1 Ultra | 2220 / 23609 | 中央値・**n=1** | n≤2(今回は取得していない) |
| M4 | 3242 / 13472 | 中央値・**n=null** | 「シングル: 10c / マルチ: iPad Pro」で機種が混在 |
| M5 | 3587 / 15273 | 中央値・**n=null** | 同上(マルチは iPad Pro) |
| A17 Pro・A18・A19 Pro・A20 Pro・M3 | n=3 | 中央値 | n=3 で弱め |

Geekbench Browser は 403 で**取得不可**。代わりに Notebookcheck の各 SoC の仕様ページ(2026-11-02 に直接取得)から GB7 を取りました。**Notebookcheck の値は個別の結果(1〜3 件)で、機種中央値ではありません**。

### 4.2 取得した値(GB7。GB6 は参考で別欄)

| チップ | GB7 ST / MT | 標本(機種) | GB6.7.1 ST / MT(参考) | 出典 |
|---|---|---|---|---|
| A16 | 2394 / 6643 | 1 件(iPhone 14 Pro Max D74AP) | 平均 2574 / 6448(5 件) | https://www.notebookcheck.net/Apple-A16-Bionic-Processor-Benchmarks-and-Specs.652742.0.html |
| A17 Pro | 平均 2688(2683〜2692)/ 平均 7209(7184〜7233) | 2 件(iPad mini 7 J410AP、iPhone 15 Pro Max D84AP) | 平均 2940 / 7299(3 件) | https://www.notebookcheck.net/Apple-A17-Pro-Processor-Benchmarks-and-Specs.756287.0.html |
| A18 | 2804 / 7602 | 1 件(iPhone 16e V59AP) | 平均 3288 / 8023(3 件) | https://www.notebookcheck.net/Apple-A18-Processor-Benchmarks-and-Specs.891555.0.html |
| A18 Pro | 3005 / 7947 | 1 件(iPhone 16 Pro) | 平均 3504 / 8744(3 件。iPhone 16 Pro・Pro Max・MacBook Neo) | https://www.notebookcheck.net/Apple-A18-Pro-Processor-Benchmarks-and-Specs.891556.0.html |
| A19 Pro | 中央値 3211(3175〜3290)/ 中央値 9003(8832〜9142) | 3 機種(iPhone 17 Pro・Air・17 Pro Max) | 平均 3840 / 9932(4 機種) | https://www.notebookcheck.net/Apple-A19-Pro-Processor-Benchmarks-and-Specs.1126974.0.html |
| A20 Pro | 4055 / 11622 | 1 件(iPhone 18 Pro、notebooksbilliger.de 経由) | 平均 4729 / 12715(2 件) | https://www.notebookcheck.net/Apple-A20-Pro-Processor-Benchmarks-and-Specs.1396010.0.html |
| M3 | 2902 / 11879 | 1 件(MacBook Pro 14 Nov 2023, Mac15,3) | 平均 3057 / 11921(7 件) | https://www.notebookcheck.net/Apple-M3-Processor-Benchmarks-and-Specs.764609.0.html |
| M3 Pro 12c | 2925 / 17582 | 1 件(m3-pro-max.md で取得済み) | 3138 / 15480 | 同文書 |
| M3 Max 16c | 2831 / 25533 | 1 件(同上) | 3127 / 21254 | 同文書 |
| M4 10c | 3416 / 16111 | 1 件(Mac mini 2024, Mac16,10) | 平均 3747 / 14978(6 件) | https://www.notebookcheck.net/Apple-M4-10-cores-Processor-Benchmarks-and-Specs.835975.0.html |
| M5 10c | 3525 / 15676 | 1 件(MacBook Air 13 2026, Mac17,3) | 平均 4228 / 17314(5 件) | https://www.notebookcheck.net/Apple-M5-10-Cores-Processor-Benchmarks-and-Specs.1139129.0.html |
| M1 Ultra | 未取得(今回は探していない) | — | — | — |
| A12・A13・A14・A15 | 未取得(n=5〜8 で弱くないため探していない) | — | — | — |

プリセットの [中央値] との差(Notebookcheck ÷ 既存 − 1): A16 +1.8% / +4.2%、A17 Pro **+6.4%** / +5.0%、A18 +0.2% / +0.3%、A18 Pro **+3.7%** / +1.9%、A19 Pro +1.6% / +2.6%、A20 Pro +1.7% / +3.7%、M3 +5.6% / +1.7%、M4 **+5.4% / +19.6%**(既存のマルチは iPad Pro の値で、Mac mini の 16111 との差が大きい)、M5 −1.7% / +2.6%。

注意: M4 の 16111 は Mac mini 1 件、既存の 13472 は iPad Pro(冷却が違う)。M5 も同様。どちらが「チップの値」かは機種の選び方の問題で、置き換える根拠にはなりません。

### 4.3 `gb7-scores.js` の書式で追記できる形(候補。追記はしていない)

`kind` は既存の区分「個別投稿」を使い、`n` は件数(機種数)。group は既存の Apple の group と分けて、出典が違うことが分かるようにする案です。

```js
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A17 Pro(Notebookcheck)",
  "single": 2688,
  "multi": 7209,
  "note": "2 件の平均(iPad mini 7 J410AP 2683/7184、iPhone 15 Pro Max D84AP 2692/7233)。https://www.notebookcheck.net/Apple-A17-Pro-Processor-Benchmarks-and-Specs.756287.0.html",
  "kind": "個別投稿",
  "n": 2
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A18 Pro(Notebookcheck)",
  "single": 3005,
  "multi": 7947,
  "note": "1 件(iPhone 16 Pro)。https://www.notebookcheck.net/Apple-A18-Pro-Processor-Benchmarks-and-Specs.891556.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A19 Pro(Notebookcheck)",
  "single": 3211,
  "multi": 9003,
  "note": "3 機種の中央値(iPhone 17 Pro 3175/9003、iPhone Air 3211/8832、iPhone 17 Pro Max 3290/9142)。https://www.notebookcheck.net/Apple-A19-Pro-Processor-Benchmarks-and-Specs.1126974.0.html",
  "kind": "個別投稿",
  "n": 3
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A16(Notebookcheck)",
  "single": 2394,
  "multi": 6643,
  "note": "1 件(iPhone 14 Pro Max D74AP)。https://www.notebookcheck.net/Apple-A16-Bionic-Processor-Benchmarks-and-Specs.652742.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A18(Notebookcheck)",
  "single": 2804,
  "multi": 7602,
  "note": "1 件(iPhone 16e V59AP)。https://www.notebookcheck.net/Apple-A18-Processor-Benchmarks-and-Specs.891555.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "A20 Pro(Notebookcheck)",
  "single": 4055,
  "multi": 11622,
  "note": "1 件(iPhone 18 Pro、notebooksbilliger.de 経由)。https://www.notebookcheck.net/Apple-A20-Pro-Processor-Benchmarks-and-Specs.1396010.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "M3(Notebookcheck)",
  "single": 2902,
  "multi": 11879,
  "note": "1 件(MacBook Pro 14 Nov 2023, Mac15,3, 8GB)。https://www.notebookcheck.net/Apple-M3-Processor-Benchmarks-and-Specs.764609.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "M4 10c(Notebookcheck)",
  "single": 3416,
  "multi": 16111,
  "note": "1 件(Mac mini 2024, Mac16,10)。既存の M4 行のマルチは iPad Pro。https://www.notebookcheck.net/Apple-M4-10-cores-Processor-Benchmarks-and-Specs.835975.0.html",
  "kind": "個別投稿",
  "n": 1
 },
 {
  "group": "Apple(Notebookcheck の仕様ページの GB7。個別の結果、2026-11-02 取得)",
  "name": "M5 10c(Notebookcheck)",
  "single": 3525,
  "multi": 15676,
  "note": "1 件(MacBook Air 13 2026, Mac17,3, 16GB)。https://www.notebookcheck.net/Apple-M5-10-Cores-Processor-Benchmarks-and-Specs.1139129.0.html",
  "kind": "個別投稿",
  "n": 1
 },
```

(`gb7-scores.js` は「自動生成(tools/extract-gb7.js)。設計書 §2.4 から抽出。手で編集しない」とあるので、実際に足すなら設計書 §2.4 の表に行を足してから生成し直す手順になります。)

---

## 5. (d) 食い違い

1. **既存の `Everest` の値は A16 ではない**: `uarch.js` の Everest(decode 9・ROB 321)は、Geekerwan の図では **A17 Pro の P コア**(と M3 の P)の値です。A16 の P は **8-wide・ROB 274**(Geekerwan)/ 約 270(Dougall、検索要約)。A16 の代表 u(163.7)は誤った幅で校正されています。
2. **M2 の P コアは A15 か A16 か**: Wikipedia・SemiAnalysis(記事名「A15 Based IP」)は M2 = Avalanche(A15)。Geekerwan の図は「M2 大核 同 A16」で、M2(iPad Pro 2022)の図は A16 の図と同じ数値(8-wide・ROB 274・同じスケジューラ)。
3. **A15 の ROB**: Geekerwan の比較数値は A15 = 390、Dougall(検索要約)は約 293、jia.je の比較表は Avalanche = 274。jia.je の「Avalanche」の図は Geekerwan の A16 の図と全項目が一致し(M2 = A16 という Geekerwan の判断に従って描いたものとみられる [推定])、既存 `Avalanche.rob: 274` の出典(jia.je)は実質 A16 の値です。
4. **A15 のクロック**: プリセットは 2.93 GHz(iPad mini 6・iPhone 13 の値)。Wikipedia は iPhone 13 Pro が 3.23 GHz、iPad mini 6 が 2.93 と 2 種類を載せています。GB7 の中央値は iPhone・iPad の機種をまとめたもので、どちらのクロックに合わせるかで ST の誤差が −1.3% と +6.9% に分かれます。
5. **コア名**: Geekerwan は A17 Pro の P を「Coll」と表記。A17 Pro の SoC のコード名も Coll とされ(A18 = Tupai・A18 Pro = Tahiti、M3 = Ibiza/Lobos/Palma も SoC・ダイのコード名)、コアの名前ではない可能性があります。Wikipedia の表は「Everest (2nd generation)」「Everest (3rd generation)」。**uarch のキーに「Coll」を使うのは避け**、「Everest 第 2 世代」のような名前にする方が安全です([推定])。
6. **A17 Pro の E コアの L1I**: Geekerwan の図は 192 KB、Wikipedia は 128 KB(+ L1D 96 KB)。
7. **A18 の P クロック**: Wikipedia の表 4.05 GHz、同 A18 記事 4.04 GHz、Notebookcheck 4040 MHz。A18 Pro も同じ値とする資料ばかりで、プリセットの A18 Pro は null。
8. **A19 の E クロック**: Wikipedia「Apple A19」のインフォボックスは 2.26 GHz、本文と Apple silicon の表は 2.60 GHz(A19 Pro のプリセットは 2.6)。
9. **A20 Pro**: クロック 4.93 GHz は発売前の Geekbench のリーク(W)。Notebookcheck の仕様表は「2 × 4.9 GHz S-Core、2.6 GHz E-Core」で、本文は「E コアは最大 4.9 GHz」と矛盾しています。
10. **M4・M5 のクロック**: M4 P は 4.4(W)/ 4464 MHz(N)、M5 S は 4.4〜4.46(W)/ 4608 MHz(N)。
11. **GB7 の M4・M5 のマルチ**: 既存の行は iPad Pro の値(M4 13472)。Mac mini の 1 件は 16111(+19.6%)。
12. **jia.je の M3 図と Geekerwan の A17 Pro 図の LDQ/STQ**: 142/63(M3)と 145/65(A17 Pro)。「同 A17 Pro」とされつつ数値は少し違います(測定誤差か別個体の差かは不明)。

---

## 6. (b) 未取得の一覧

- **全世代**: 分岐ミスペナルティ(Firestorm の 13 以外)、L2 遅延(A12 16・A13 14 の検索要約、M4 Pro 約 27 の検索要約、Firestorm 18 以外)、SLC 遅延、DRAM 遅延(A13 約 104 ns の検索要約以外)、MSHR。Apple の CPU Optimization Guide にあるとみられるが、ログイン必須で取得不可
- A12・A13: 幅(7 は検索要約のみ)・ROB・E コアの全値
- Icestorm・Blizzard・Sawtooth(A16): デコード/rename 幅、ROB(Icestorm は coalesced 約 60 のみ)
- A15 の ROB の確定(390 / 293 / 274 で食い違い)
- A17 Pro より後の E コア(A18・A19 Pro は Wccftech の説明のデコード幅・ALU 数のみ。ROB なし)、M3 系の E コア
- **A18・A18 Pro・A19 Pro・A20 Pro・M5 の P(S)コアの幅・ROB**(A19 Pro の Geekerwan の P コア図は見つからず)。M4 の P は jia.je の図(10/361)があるが、A18 と同じコアかは未確認
- M3 Pro / M3 Max を直接測った uarch の資料(M3 無印からの類推のみ)
- 最大クロックの [公表] 値(Apple は非公表)と、Geekbench Browser の個別結果の報告クロック(403 で取得不可)
- AnandTech の原ページ(A12・A13・A14 の解析)、Maynard Handley の M1 Overview、Chips and Cheese の Apple CPU 記事、WikiChip(今回未確認または取得不可)
- GB7: M1 Ultra(n=1)の追加の値、M3 Pro 11c・M3 Max 14c の値、A12〜A15 の追加値

---

## 7. (e) 実装の推奨

1. **最初に決めるべきこと: 既存の `Everest` の扱い**。資料どおり A16 = 8/8/274 に直すと、A16 の u が 163.7→172.5 に変わり、Everest を借りるもの全ての ST が約 +5% 動きます(現状 Everest を借りているのは A16 だけなので、今の固定値への影響は A16 の内部値だけ。A16 の ST は代表なので 0% のまま)。直さない場合は note の「出典は A17 の解析」を「A17 Pro・M3 の P コアの値(Geekerwan)。A16 自体は 8-wide・ROB 274」と書き換え、A16 の幅の誤りを明示するのが最低限です。
2. **登録できる世代(根拠が [二次] の原ページで 2 系統以上あるもの)**:
   - **A17 Pro の P(= M3・M3 Pro・M3 Max の P)**: 9/9・ROB 321(Geekerwan の図、jia.je の図。Dougall の約 320 は検索要約)。u は Everest から `uFrom` で借りる。キー名は「Everest 2」など(「Coll」は SoC のコード名の可能性)。**ST は M3 系 3 件が ±10% 以内(+5.6〜+8.6%)、A17 Pro は +11.8%**(Notebookcheck の GB7 を公開値にすると +5.1%)。
   - A16 の P の修正(上記 1)。
   - **登録しない方がよいもの**: A12・A13(幅・ROB が検索要約のみ)、A18〜A20 Pro・M4・M5(A18 系の幅・ROB の原資料なし。M4 の 10/361 は 1 系統)、E コア全般(A17 Pro E の 5/122 は Geekerwan 1 系統)。
3. **u の借用先**: P コアは `uFrom: 'Everest'`(A16 の代表)。A17 Pro / M3 系の新レコードの u をそのまま Everest から借りると、幅 8→9 で ST が +12% 跳ねる構造上の過大評価が出ます(§3 読み取り 2)。±10% を安定して満たすには、(i) A17 Pro を代表(calib)にして新レコード自身の u を校正する(M3 系は検証用)、または (ii) 新レコードに `decodeWidth`/`width` を入れても IPC の天井の上がり方を抑えるモデル側の調整(設計書 §5.2.1 の範囲)、のどちらかが要ります。(i) は A17 Pro の GB7 が n=3 なので、§4 の Notebookcheck の値と合わせて標本を厚くしてから。
4. **MT**: E コアの値が無いと MT は計算できません。A17 Pro E(5/5/122)だけを入れて u を ISA 平均にすると M3 系の MT は −6〜−15%、A17 Pro は −15.5% で、±10% に入るのは M3 Max だけです。E コアの u を P から借りると誤差は小さくなりますが(−2〜−6%)、設計上の根拠がありません。**MT は E コアの代表と u の決め方が決まるまで登録を見送る**のが妥当です。
5. **プリセット側の小さな修正候補**(いずれも [二次]): A16 の E クロック 2.02 GHz(W・N)、A18 Pro の P/E クロック 4.05(4.04)/ 2.42 GHz(W・N)、A15 の P クロックの扱い(2.93 か 3.23)。
6. **l2KB は入れない方がよい**: 同じ uarch で M3(4096)・M3 Pro/Max(2731)・A17 Pro(8192)と値が分かれ、入れると ST が +3〜7% 上がって A17 Pro・M3 の誤差が広がります(S4a)。入れるなら Everest と同じ値(8192)にそろえる(S4b、差はほぼ出ない)。
7. 登録すると変わるテスト: `tests/mix.test.js` の BASE の apple-m3・m3pro・m3max・a17pro の ST が null から数値になる(m3-pro-max.md §5(c) の 4 と同じ)。Everest を直すと A16 の内部の u(163.7)を参照するテストや設計書 §5.3.0 の表も見直しが要ります。
