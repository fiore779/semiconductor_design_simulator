# Apple の P/E コアの追加調査(E コア、A18〜A20 Pro、M4 系、M5 系。2026-11-03)

対象: Apple の E コア(Icestorm・Blizzard・Sawtooth ほか)と、A18 / A18 Pro / A19 / A19 Pro / A20 Pro、M4 / M4 Pro / M4 Max、M5 / M5 Pro / M5 Max の P(S)/E コア。**この文書は調査の記録だけです。`data/` 配下のファイルは変更していません。**

前提にした既存の資料: `docs/research/apple-uarch.md`(2026-11-02。A12〜A20 Pro・M3 系の uarch と GB7)、`docs/research/m3-pro-max.md`。そこに書いてある値は繰り返さず、**今回新しく取れた値と、まだ取れていない値**を中心に書きます。

区分: [実測] > [公表] > [二次] > [推定] / 未取得。「検索要約」は検索結果の要約だけで、原ページを確認していないもの。「取得不可」はボット対策・403・接続拒否で読めなかったページで、回避していません(Geekbench Browser・reddit.com・Notebookcheck の比較ページは 403 または取得不可。amd.com は対象外のため未アクセス。〔2026-11-06 更新: amd.com は Chrome の通常閲覧なら取得できる〕)。

---

## 0. リポジトリ内の現状(2026-11-03 に確認)

### 0.1 `data/uarch.js` の Apple のレコード

| キー | 中身 | 状態 |
|---|---|---|
| Firestorm | 幅 8・ROB 330・L1D 128・L2 3072/コア ほか | 登録済み |
| Icestorm | vecBits 128 のみ | **幅・ROB 未登録** |
| Avalanche | ROB 274・l2KB 4096 | 幅未登録(ROB 274 は実質 A16 の値。apple-uarch.md §5-3) |
| Everest | 8/8・ROB 274・L1D 128(A16 の P。2026-11-02 訂正済み) | 登録済み |
| Everest 2nd gen | 9/9・ROB 321(A17 Pro / M3 系の P)、uFrom Everest | 登録済み |
| Vortex / Tempest / Lightning / Thunder | note のみ | 未登録 |
| Blizzard | note のみ | **未登録** |
| Sawtooth | note のみ | **未登録** |
| A17 Pro の E、A18 以降の P/E、M4・M5 系の全コア | レコードなし | **未登録** |

### 0.2 プリセット(`data/presets/chips-soc.js`)

| プリセット | P(S)コア | E コア | 不足 |
|---|---|---|---|
| apple-a16 | Everest ×2 / 3.46 | Sawtooth ×4 / **null** | E クロック |
| apple-a17pro | Everest 2nd gen ×2 / 3.78 | uarch なし ×4 / 2.11 | E の uarch |
| apple-a18 | uarch なし ×2 / 4.05 | uarch なし ×4 / 2.42 | uarch |
| apple-a18pro | uarch なし ×2 / **null** | uarch なし ×4 / **null** | クロック・uarch |
| apple-a19pro | uarch なし ×2 / 4.26 | uarch なし ×4 / 2.6 | uarch |
| apple-a20pro | uarch なし ×2 / 4.93 | uarch なし ×4 / 2.64 | uarch。P は Apple の呼称では「super」ではない(§1) |
| apple-m4 | P ×4 / 4.4 | E ×6 / 2.85 | uarch |
| apple-m4pro | P ×10 / 4.5 | E ×4 / **null** | E クロック・uarch |
| apple-m5 | super ×4 / **null** | E ×6 / **null** | クロック・uarch |
| apple-m5max | super ×6 / **null** | performance ×12 / **null** | クロック・uarch |
| **apple-m4max** | — | — | **プリセットなし**(GB7 は `tools/gb7-skipped.txt` に中央値あり) |
| **apple-m5pro** | — | — | **プリセットなし**(同上) |
| apple-a19(無印) | — | — | プリセットなし(今回の対象外) |

### 0.3 GB7(`data/benchmarks/gb7-scores.js`・`GB7_REF`)

- 登録済み: A16〜A20 Pro、M4、M4 Pro(3340 / 24802、14c、n=3)、M5、M5 Max(3725 / 35001、18c、n=6)の中央値。A16〜A20 Pro・M3 系・M4 10c・M5 10c の Notebookcheck 個別値(NBC 行・`GB7_REF`)。
- `tools/gb7-skipped.txt` に残っているもの: M4 Max(3380〜3402 / 25412(14c)〜28741(16c)、各 n=3)、M5 Pro(3678〜3680 / 29537(15c)〜33497(18c)、n=2〜3)、M5 Ultra。
- **Notebookcheck の個別値が未登録**: M4 Pro、M4 Max、M5 Pro、M5 Max(§4 で今回取得)。

---

## 1. コアの命名

Apple はコアのコード名を公表していません。以下の名前は Apple の呼称(「performance」「efficiency」「super」)を除いて**通称**です。

| チップ | P(S)コアの名前 | E コアの名前 | 区分・出典 |
|---|---|---|---|
| A14 / M1 | Firestorm(通称) | Icestorm(通称) | [二次] Wikipedia「Apple silicon」の表 https://en.wikipedia.org/wiki/Apple_silicon |
| A15 / M2 | Avalanche(通称) | Blizzard(通称) | [二次] 同上 |
| A16 | Everest(通称) | Sawtooth(通称) | [二次] 同上(表の出典は Angstronomics・iphonewired) |
| A17 Pro / M3 系 | Everest 第 2 世代(通称) | Sawtooth 第 2 世代(通称) | [二次] 同上 |
| A18 / A18 Pro | Everest 第 3 世代(通称) | Sawtooth 第 3 世代(通称) | [二次] 同上。A18 = Tupai・A18 Pro = Tahiti は**SoC のコード名**(Wikipedia「Apple A18」https://en.wikipedia.org/wiki/Apple_A18) |
| A19 / A19 Pro | **名前なし**(Apple の呼称は performance) | **名前なし**(efficiency) | Wikipedia の表に名前の欄が空。Apple は「2 performance and 4 efficiency cores」[公表] https://support.apple.com/en-us/125090 |
| A20 Pro | 名前なし。Wikipedia は「super」、Notebookcheck は「M6 S-Core」 | 名前なし(efficiency) | Apple の iPhone 18 Pro の発表は「6-core CPU」とだけ書き、コアの種類を分けていない [公表] https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/ 。「super」は二次資料の表記 [二次] |
| M4 / M4 Pro / M4 Max | 名前なし(Apple の呼称は performance) | 名前なし(efficiency) | Wikipedia「Apple M4」のインフォボックスの「Donan/BravaChop/Brava」は**ダイのコード名**で出典なし(https://en.wikipedia.org/wiki/Apple_M4)。コアの名前ではない |
| M5 | **super core**(Apple の呼称。発表時は「performance core」で、2026-03 に「super core」へ改称) | efficiency | [公表] https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/ (発表時「up to four performance cores」)、https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ (「now called super cores」) |
| M5 Pro / M5 Max | super core | **performance core**(「all-new performance core」。M5 の E コアとも M4 までの P コアとも別の新設計) | [公表] 同上 M5 Pro/Max の発表 |

注意: **M5 Pro / M5 Max の「performance」コアは M4 までの P コアとは別物**で、多スレッドの電力効率に寄せた中間コアです。プリセットの `type: 'performance'` は M4 までの `type: 'P'` と混ぜないこと([公表] の記述から。設計の扱いは [推定])。

---

## 2. マイクロアーキテクチャ(デコード幅・ROB・実行ポート・L1・L2)

凡例: 「W」= Wikipedia の wikitext(直接取得)[二次]、「N」= Notebookcheck の仕様ページ(直接取得)[二次]、「G 経由」= Geekerwan の動画の数値を記事が説明したもの(動画本体は未確認)[二次]。

### 2.1 E コア

| 項目 | Icestorm(A14/M1) | Blizzard(A15/M2) | Sawtooth(A16) | A17 Pro E(Sawtooth 第 2 世代) | A18 Pro E(Sawtooth 第 3 世代) | A19 Pro E | A20 Pro E | M4 E | M5 E |
|---|---|---|---|---|---|---|---|---|---|
| デコード幅 | **未取得**(Dougall のページに記載なし) | 未取得 | 未取得 | 5(既存 apple-uarch.md・Geekerwan の図) | **5** — G 経由 [二次] Wccftech https://wccftech.com/a19-pro-efficiency-cores-analysis-amazing-architectural-improvements/ ・GAZLOG https://gazlog.jp/entry/apple-a19pro-deepdive-e-core-leap/ | **6** — G 経由 [二次] 同上 | 未取得 | 未取得 | 未取得 |
| リタイア幅 | 4 µop/サイクル — [二次] Dougall https://dougallj.github.io/applecpu/icestorm.html | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 |
| ROB | coalesced retire queue 約 60・in-flight rename 約 111 — [二次] Dougall(同上。「通常の ROB ではない可能性」と注記) | 未取得 | 未取得 | 122(既存) | **未取得** | **未取得** | 未取得 | 未取得 | 未取得 |
| 物理レジスタ | 整数 約 79 / FP 約 87 — Dougall | 未取得 | 未取得 | 約 141 / 約 135(既存) | 未取得 | 整数と FP を 1 つのファイルに統合(数値なし)— G 経由 [二次] | 未取得 | 未取得 | 未取得 |
| 実行ユニット | 整数 3・LD/ST 2・FP/SIMD 2 — Dougall | 未取得 | 未取得 | ALU 3・LSU 2・FP 3(既存) | **ALU 3** — G 経由 [二次] | **ALU 4** — G 経由 [二次] | 未取得 | 未取得 | 未取得 |
| LDQ / STQ | 30 / 18 — Dougall | 未取得 | 未取得 | 44 / 24(既存) | 未取得 | 未取得 | 未取得 | 未取得 | 未取得 |
| L1I / L1D | 128 / 64 KB — W | 128 / 64 KB — W | 未取得(W の表は A16 の L1 を個別に載せていない) | 128 / 96 KB — W(G の図は L1I 192) | 未取得 | 128 / 64 KB — 検索要約(W の表とされる。原ページの該当セルは未確認) | **160 / 96 KB** — W(表の出典は Kurnal Insights のダイ写真) | 128 / 64 KB — W(M4 の結合セル。[二次]、セル結合からの読み取り) | 128 / 64 KB — W |
| L2(クラスタ共有) | 4 MB/4 コア — W | 4 MB — W | 4 MB — W | 4 MB — W | 4 MB — W・Wikipedia「Apple A18」 | **6 MB** — W・GAZLOG(4→6 MB) | **8 MB** — W | 4 MB — W(M4・M4 Pro・M4 Max)。N の M4 Max ページの「L2 4 MB」も E 側の値とみられる [推定] | **6 MB** — W |
| 同一性 | — | — | — | — | — | 「全く新しい設計」— G 経由 [二次] | — | M4 系の E は全チップ同じ — [二次] Eclectic Light https://eclecticlight.co/2024/11/18/inside-m4-chips-e-and-p-cores/ | N「A19 Pro と似たコア」[二次] |

性能の伸び(参考。uarch の値ではない):
- A19 Pro E は A18 Pro E 比で SPEC2017 整数 +29%・FP +22%、IPC 整数 +21%・FP +14%、電力ほぼ同じ — G 経由 [二次](Wccftech・GAZLOG)。
- M4 E は A17 Pro E 比で SPECint +20%・SPECfp +25%、電力 +57% — 検索要約(r/hardware の Geekerwan の要約。reddit.com は取得不可で原文未確認)。

### 2.2 P(S)コア

| 項目 | A18 / A18 Pro P | A19 Pro P | A20 Pro P(S) | M4 P(M4 / Pro / Max) | M5 super | M5 Pro / Max の performance |
|---|---|---|---|---|---|---|
| デコード / rename | **未取得** | **未取得** | **未取得** | 10 / 10 — 既存 apple-uarch.md(jia.je の図 = Geekerwan の測定、1 系統)。「9→10 wide」は検索要約(r/hardware) | **未取得**(Apple は「increased front-end bandwidth」とだけ [公表]) | **未取得** |
| ROB | 未取得 | 未取得 | 未取得 | 361(coalesced)— 既存(jia.je)。「ROB 約 +12%、PRRT 約 +14%」は検索要約 | 未取得 | 未取得 |
| 実行ユニット | 未取得 | 未取得 | 未取得 | 8 ALU / 4 LSU / 4 FP — 既存(jia.je) | 未取得 | 未取得 |
| IPC の伸び | — | 対 A18 Pro P で整数 +9%・FP +4%(SPEC2017)— G 経由 [二次] GAZLOG | — | 対 M3 で SPECint +8%・SPECfp +9% — 検索要約 | 対 M4 で約 +10%(アナリストの推定)— [推定] Creative Strategies https://www.creativestrategies.com/research/m5-apple-silicon-its-all-about-the-cache-and-tensors/ | — |
| L1I / L1D | 未取得(W の表は個別に載せていない) | 未取得 | **192 / 128 KB** — W | 192 / 128 KB — W・jia.je | **192 / 128 KB** — W | **128 / 64 KB** — W(M5 Pro/Max の P) |
| L2(クラスタ共有) | A18 8 MB・A18 Pro 16 MB(2 コア)— W | 16 MB — W | 16 MB — W | M4 16 MB/4P — W。M4 Pro・Max 32 MB(16 MB×2 クラスタ。2 クラスタは [実測] Eclectic Light の powermetrics で P0・P1 を確認、M4 Pro)— W | 16 MB — W | 16 MB — W。N の M5 Pro/Max ページは「L2 32 MB・L3 24 MB」 |
| SLC | A18 12 MB・A18 Pro 24 MB — W(Wikipedia「Apple A18」は L3 と表記) | 32 MB — W | 36 MB — W | M4 8 MB — W。Pro/Max は W に記載なし | 8 MB — W | M5 Pro 24 MB・M5 Max 48 MB — W |
| A18 = M4 か | 未確認(jia.je の M4 P の図は A18 の動画も参照に挙げるが、同一とは書いていない https://raw.githubusercontent.com/jiegec/cpu/master/docs/m4_pcore.md ) | — | — | — | — | — |

---

## 3. クロック(コア種別ごと)とコア構成数

### 3.1 コア構成数

| チップ | 構成 | 区分・出典 |
|---|---|---|
| A18 / A18 Pro | 2P + 4E | [二次] W(Apple の iPhone 16 系の仕様ページは今回未確認) |
| A19 Pro | 2P + 4E | [公表] https://support.apple.com/en-us/125090 (「6‑core CPU with 2 performance and 4 efficiency cores」) |
| A20 Pro | 2 + 4(6 コア) | 6 コアは [公表](iPhone 18 Pro の発表)。2+4 の内訳は [二次](W・各報道。Apple の仕様ページは未確認) |
| M4 | 4P + 6E(10c)。9c 版・8c 版あり(3P+6E、4P+4E)| [二次] W(Apple の発表の「up to」以外は Wikipedia) |
| M4 Pro | 10P + 4E(14c)/ 8P + 4E(12c) | 14c は [公表](「up to 10 performance cores and four efficiency cores」https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/ )。12c の内訳は [二次] N・W |
| M4 Max | **12P + 4E(16c)/ 10P + 4E(14c)** | 16c は [公表](同上「up to 12 performance cores and four efficiency cores」)。14c は [二次] W |
| M5 | 4S + 6E(10c)/ 3S + 6E(9c) | 10c は [公表](「six efficiency cores and up to four performance cores」M5 の発表)。9c は [二次] W |
| M5 Pro | **6S + 12P(18c)/ 5S + 10P(15c)** | 18c は [公表](「18-core CPU with 6 super cores and 12 all-new performance cores」M5 Pro/Max の発表)。15c は [二次] W |
| M5 Max | 6S + 12P(18c) | [公表] 同上 |

### 3.2 最大クロック(Apple は非公表)

| チップ | P(S) | E(M5 Pro/Max は performance) | 区分・出典 |
|---|---|---|---|
| A16 E | — | **2.02 GHz** | [二次] W・N(既存 apple-uarch.md §2.3。プリセットは null) |
| A18 | 4.05(W の表)/ 4.04(W「Apple A18」)/ 4.02(Geekerwan 経由、GAZLOG) | 2.42 | [二次] |
| A18 Pro | **4.05 / 4.04 / 4.02**(同上。A18 と同じとする資料ばかり) | **2.42** | [二次] W・Wikipedia「Apple A18」・GAZLOG・Wccftech。プリセットは null |
| A19 Pro | 4.26(W・N)/ **4.22**(Geekerwan 経由、GAZLOG) | 2.60(W・N・Wccftech・GAZLOG) | [二次]。P は資料で 0.04 GHz 違う |
| A20 Pro | 4.93(W。Geekbench のリーク)・約 4.93(multiplayer.it の報道、検索要約) | 2.64(W) | [二次]。既存の食い違い(N の本文)は apple-uarch.md §5-9 |
| M4 | 4.4(W)/ 4464 MHz(N の範囲上限) | 2.85(W)/ 2.9・2890 MHz(N)。読者コメントの powermetrics では 2892 MHz(Eclectic Light のコメント欄、未検証) | [二次] |
| M4 Pro | **4.51 GHz**(W・N 4512 MHz)。**4511 MHz を観測**(シングルスレッド試験、powermetrics) | **2.59 GHz**(W・N 2592 MHz)。**E の周波数段 1020〜2592 MHz**(M4 Pro 14c、powermetrics) | 観測値は [実測] Eclectic Light https://eclecticlight.co/2024/11/18/inside-m4-chips-e-and-p-cores/ 。W・N は [二次] https://www.notebookcheck.net/Apple-M4-Pro-14-cores-Processor-Benchmarks-and-Specs.915303.0.html |
| M4 Max | 4.51(W)/ 4.5・4512 MHz(N) | 2.59(W)/ 2.6・2592 MHz(N) | [二次] https://www.notebookcheck.net/Apple-M4-Max-16-cores-Processor-Benchmarks-and-Specs.920458.0.html 。E は M4 系共通(Eclectic Light)なので M4 Pro の [実測] 2592 MHz と一致 |
| M5 | 4.4(3S 版)/ 4.46(4S 版)— W。**4608 MHz** — N の仕様表(N の本文は「up to 4.4 GHz」) | 3.0(W)/ 3048 MHz(N) | [二次] https://www.notebookcheck.net/Apple-M5-10-Cores-Processor-Benchmarks-and-Specs.1139129.0.html 。S は資料で 4.46 と 4.61 に分かれる |
| M5 Pro | 4.6(W・N。範囲上限 4608 MHz) | 4.4(W・N) | [二次] https://www.notebookcheck.net/Apple-M5-Pro-18-Core-Processor-Benchmarks-and-Specs.1242671.0.html |
| M5 Max | 4.6(N)/ 約 4.61(W 本文) | 4.4(N) | [二次] https://www.notebookcheck.net/Apple-M5-Max-Processor-Benchmarks-and-Specs.1244918.0.html |

参考: M3 の E は 744〜2748 MHz(Eclectic Light が powermetrics で確認と記述、[実測]。プリセット 2.75 と一致)。

---

## 4. Geekbench の公開スコア

Geekbench Browser は 403 で取得不可。以下は Notebookcheck の仕様ページに載っている**個別の結果**で、機種中央値ではありません。版は Notebookcheck の表記のまま(GB7 = 7.0、GB6 = 6.7.1)。

### 4.1 GB7(プロジェクトの基準)

| チップ | ST / MT | 標本 | 既存の中央値との差 | 出典 |
|---|---|---|---|---|
| M4 Pro 14c | **3488 / 25815** | 1 件(MacBook Pro 14 2024 Mac16,8, 24GB) | 既存 3340 / 24802 に対し +4.4% / +4.1% | https://www.notebookcheck.net/Apple-M4-Pro-14-cores-Processor-Benchmarks-and-Specs.915303.0.html |
| M4 Pro 12c | 3185 / 19193 | 1 件(MacBook Pro 14 2024 M4 Pro Entry) | 既存行なし | https://www.notebookcheck.net/Apple-M4-Pro-12-cores-Processor-Benchmarks-and-Specs.922301.0.html |
| M4 Max 16c | **3455 / 29679** | 1 件(MacBook Pro 16 2024 Mac16,5, 64GB) | skipped の中央値 3380〜3402 / 28741(16c)に対し MT +3.3% | https://www.notebookcheck.net/Apple-M4-Max-16-cores-Processor-Benchmarks-and-Specs.920458.0.html |
| M5 Pro 18c | **3693 / 34285** | 1 件(MacBook Pro 14 2026 Mac17,9, 64GB) | skipped の中央値 3678〜3680 / 33497(18c)に対し +0.4% / +2.4% | https://www.notebookcheck.net/Apple-M5-Pro-18-Core-Processor-Benchmarks-and-Specs.1242671.0.html |
| M5 Max 18c | **3766 / 35738** | 1 件(MacBook Pro 16 2026, notebooksbilliger.de, 48GB) | 既存 3725 / 35001 に対し +1.1% / +2.1% | https://www.notebookcheck.net/Apple-M5-Max-Processor-Benchmarks-and-Specs.1244918.0.html |
| A16〜A20 Pro、M3 系、M4 10c、M5 10c | 登録済み(`GB7_REF`・NBC 行) | — | — | apple-uarch.md §4 |
| A19(無印)・M4 Max 14c・M5 Pro 15c | 未取得(今回は探していない) | — | — | — |

### 4.2 GB6(参考。プロジェクトの基準ではない)

| チップ | ST / MT | 標本 | 出典 |
|---|---|---|---|
| M4 Pro 14c | 平均 3882 / 22527(2 件: 3927/22544、3836/22509) | MacBook Pro 14・16 2024 | 同上 |
| M4 Pro 12c | 3837〜3928 / 20385〜20617(3 件。行の版表記は 6.3.0) | MacBook Pro 14 Entry ×2、Mac mini | 同上 |
| M4 Max 16c | 3880 / 25760(1 件) | MacBook Pro 16(notebooksbilliger.de) | 同上 |
| M5 Pro 18c | 4295 / 28436(1 件) | MacBook Pro 16 2026 | 同上 |
| M5 Max 18c | 中央値 4322 / 29256(シミュレーション 1 件を含む 5 件。実機 4 件は 4268〜4336 / 29233〜30057) | MacBook Pro 14・16 2026 | 同上 |

---

## 5. 食い違い・注意

1. **A18 Pro / A19 Pro の P クロック**: W は 4.05 / 4.26 GHz、Geekerwan 経由(GAZLOG)は 4.02 / 4.22 GHz。Geekerwan の値は測定値の可能性がありますが動画本体は未確認。
2. **M5 の super コアのクロック**: W 4.46(4S 版)と N の仕様表 4608 MHz(N の本文は 4.4)。4608 MHz は M5 Pro/Max の S コアと同じ値で、N が流用した可能性があります([推定])。
3. **M4 の E コアの最大クロック**: W 2.85、N 2.9(2890 MHz)、Eclectic Light の読者コメント 2892 MHz。一方 M4 Pro/Max の E は 2592 MHz(Eclectic Light の [実測])。「M4 系の E は全チップ同じ」(Eclectic Light)とクロックの差が両立するかは未確認(作者自身もコメントの値を「謎」としている)。
4. **M5 Pro/Max の L2**: W は S 16 MB + P 16 MB、N は「L2 32 MB・L3 24 MB」(L3 は SLC の 24 MB を指すとみられる。ただし M5 Max の SLC は W で 48 MB)。
5. **M4 Pro 12c の構成**: N の仕様表は 8P+4E、本文は「10 のうち 8」。W も 8P+4E。
6. **A20 Pro の「super」**: Apple の iPhone 18 Pro の発表文はコアの種類を書いておらず、「super」は二次資料の呼称です。M5 系の super と同じ設計かは未確認。
7. **M5 の「performance core」の改称**: 2025-10 の M5 の発表では大コアを「performance core」と呼び、2026-03 に「super core」へ改称。M5 Pro/Max の「performance core」は別の新コア。古い資料の「M5 の P コア」は今の「super」を指します。

---

## 6. プロジェクトに追加できる値・未取得の値(まとめ)

### 6.1 追加できる値

| 対象 | 値 | 区分 | 出典 | 注意 |
|---|---|---|---|---|
| apple-a16 の E maxGHz | 2.02 | [二次] | W・N(apple-uarch.md §2.3) | 2 系統で一致 |
| apple-a18pro の P / E maxGHz | 4.05(4.04)/ 2.42 | [二次] | W・Wikipedia「Apple A18」・Wccftech・GAZLOG | P は 4.02〜4.05 で揺れる |
| apple-m4pro の E maxGHz | 2.59(2592 MHz) | **[実測]**(powermetrics)+ [二次] | Eclectic Light・W・N | 3 系統で一致 |
| apple-m4pro の P maxGHz | 4.5 → 4.51(4511〜4512 MHz) | [実測](観測)+ [二次] | Eclectic Light・W・N | 既存 4.5 でも差は 0.2% |
| apple-m5 の S / E maxGHz | 4.46(W)または 4.61(N)/ 3.0(3048 MHz) | [二次] | W・N | S は食い違いあり(§5-2) |
| apple-m5max の S / performance maxGHz | 4.6(4608 MHz)/ 4.4 | [二次] | N・W | — |
| 新プリセット apple-m4max(16c) | 12P + 4E、P 4.51 / E 2.59 GHz | 構成 [公表]、クロック [二次] | Apple Newsroom・W・N | ダイ面積は設計書の約 454 mm²([推定]、NamuWiki のみ) |
| 新プリセット apple-m5pro(18c) | 6S + 12performance、S 4.6 / P 4.4 GHz | 構成 [公表]、クロック [二次] | Apple Newsroom・W・N | 2 ダイ構成([公表]) |
| GB7 個別値(`GB7_REF` 候補) | M4 Pro 14c 3488/25815、M4 Max 16c 3455/29679、M5 Pro 18c 3693/34285、M5 Max 3766/35738(各 1 件、GB7.0) | 個別投稿 | §4.1 の Notebookcheck | 機種 1 件ずつ |
| L2(クラスタ)| M4 Pro/Max P 32 MB(16×2)、M5 S 16 / E 6、M5 Pro/Max S 16 / P 16、A19 Pro E 6、A20 Pro E 8 | [二次] | W(M4 Pro の 2 クラスタは Eclectic Light で [実測]) | プリセットの `l2` 文字列として。uarch の l2KB は使い分けられないので入れない(apple-uarch.md §7-6) |
| L1(uarch の l1dKB) | A20 Pro S 128 / E 96、M5 S 128 / E 64、M5 Pro/Max P 64 | [二次] | W(1 系統) | uarch レコード自体が無いので、レコードを作る場合の候補 |
| E コアの幅・ALU | A18 Pro E: デコード 5・ALU 3 / A19 Pro E: デコード 6・ALU 4 | [二次](Geekerwan の動画の説明、1 系統) | Wccftech・GAZLOG | ROB が無いので IPC の天井を計算できず、uarch に入れても ST/MT は動かない(幅だけでは不十分) |
| Icestorm の補足 | リタイア 4/サイクル、retire queue 約 60、整数 3・LD/ST 2・FP 2、LDQ/STQ 30/18 | [二次] | Dougall | デコード幅は無い。retire queue を rob に使うかは要判断 |

### 6.2 未取得の値

| 対象 | 未取得の項目 |
|---|---|
| Icestorm | デコード / rename 幅(Dougall のページに無い) |
| Blizzard(A15/M2 E) | デコード幅・ROB・実行ユニット・L2 遅延(全て) |
| Sawtooth(A16 E) | デコード幅・ROB・実行ユニット・L1(全て) |
| A18 / A18 Pro の E | ROB・実行ポートの内訳・L1 |
| A19 Pro の E | ROB・物理レジスタ数・LDQ/STQ。L1 は検索要約のみ |
| A20 Pro の E、M4 の E、M5 の E | デコード幅・ROB・実行ユニット(全て) |
| A18 / A18 Pro の P | デコード幅・ROB・実行ポート・L1。M4 P(10/361)と同じコアかどうか |
| A19 Pro の P、A20 Pro の P(S) | デコード幅・ROB・実行ポート(A20 Pro は L1 のみ取得) |
| M5 の super、M5 Pro/Max の performance | デコード幅・ROB・実行ポート(Apple は定性的な説明のみ) |
| 全コア | 分岐ミスペナルティ・L2 遅延・SLC 遅延・MSHR(Apple の CPU Optimization Guide はログイン必須で取得不可) |
| クロック | A20 Pro の P の確定値(リーク値のみ)、M4 Max 14c・M5 Pro 15c の個別値。[公表] のクロックは全チップ無し(Apple は非公表) |
| GB7 | A19 無印、M4 Max 14c・M5 Pro 15c の個別値、M4 Pro / M4 Max / M5 Pro の 2 件目以降の個別値(Geekbench Browser は 403) |
| 原資料 | Geekerwan の A18 / A19 Pro / M4 / M5 の動画本体(Bilibili / YouTube)、reddit.com の M4 解析スレッド(取得不可)、Chips and Cheese の Apple CPU 記事(検索で見つからず) |

---

## 7. 取得の記録

| 資料 | 状態 |
|---|---|
| Wikipedia「Apple silicon」「Apple M4」「Apple M5」「Apple A18」(wikitext を直接取得) | 直接 |
| Apple Newsroom(M4 Pro/Max、M5、M5 Pro/Max、iPhone 18 Pro)、support.apple.com/en-us/125090 | 直接 |
| Notebookcheck の仕様ページ(M4 10c・M4 Pro 14c・M4 Pro 12c・M4 Max 16c・M5 10c・M5 Pro 18c・M5 Max) | 直接 |
| Notebookcheck の比較ページ(M4 Pro 14c vs M5 10c) | **403 で取得不可**(回避していない) |
| Eclectic Light「Inside M4 chips: E and P cores」 | 直接 |
| Wccftech「A19 Pro efficiency cores analysis」、GAZLOG(A19 Pro の E コア) | 直接(中身は Geekerwan の動画の説明) |
| Dougall Johnson の Icestorm のページ | 直接 |
| jia.je の索引・jiegec/cpu リポジトリ(GitHub API・raw) | 直接。Apple の E コアや A18 以降の図は無い |
| reddit.com(r/hardware の M4 Geekerwan スレッド) | **取得不可**。第三者のミラーサイトは使っていない |
| Geekbench Browser | 403(今回はアクセスしていない) |
