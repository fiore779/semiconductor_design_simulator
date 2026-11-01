# M3 Pro・M3 Max のコア構成の調査(2026-11-01)

対象プリセット: `apple-m3pro`・`apple-m3max`(`data/presets/chips-soc.js` 56〜59 行)。この文書は調査結果の記録だけです。プリセットとデータは変更していません。

区分: [実測] > [公表] > [二次] > [推定] / 未取得。「検索要約」は検索結果の要約だけで、原ページは確認していないものです。「取得不可」はボット対策や 403 で読めなかったページで、回避はしていません。

## 0. 現状の確認(リポジトリ内)

### 0.1 Apple M シリーズのプリセットの書式

`m(id, name, year, gb7, dies, cores, extra)` で定義され、`cfg = { cores, memory: null }` になります。M シリーズには `l2`・`l3MB`・SLC の項目がありません(A シリーズにだけ `cfg.l2` の文字列があります)。

| プリセット | コア(type / uarch / count / maxGHz) | 備考 |
|---|---|---|
| apple-m1 | P Firestorm 4 / 3.2、E Icestorm 4 / (なし) | M1 が Firestorm の代表(calib) |
| apple-m1pro・m1max | P Firestorm 8 / 3.228、E Icestorm 2 / 2.064 | |
| apple-m2 | P Avalanche 4 / 3.49、E Blizzard 4 / 2.42 | M2 が Avalanche の代表(calib) |
| apple-m2pro | P 8、E 4(uarch・クロックなし) | |
| apple-m2max | P 8 / 3.7、E 4(uarch なし) | |
| **apple-m3** | **P 4 / 4.05、E 4 / 2.75(uarch なし)** | ST/MT は「uarch 未指定」 |
| **apple-m3pro** | **`[]`(空)** | ダイ 219.2mm² 'meas'、電力 peak 25W 'meas' |
| **apple-m3max** | **`[]`(空)** | ダイ 477.1mm² 'sec'(NamuWiki のみ)、電力 peak 56W 'meas' |
| apple-m4 | P 4 / 4.4、E 6 / 2.85(uarch なし) | |
| apple-m4pro | P 10 / 4.5、E 4(uarch なし) | |
| apple-m5・m5max | super / performance / E(uarch なし) | |

- **M3(無印)の uarch は登録されていません。** `data/uarch.js` にある Apple のレコードは Firestorm・Icestorm・Avalanche・Everest・Vortex・Tempest・Lightning・Thunder・Blizzard・Sawtooth です。設計書 §(D) 1689 行の「uarch レコード自体が無い Apple プリセット 13 件」に m3 が含まれ、そこには「m3pro・m3max はコア構成が空」と書かれています。
- `Everest` は A16 の P コアとして登録されていて、`apple-a16` がその代表(calib)です。値は decodeWidth 9・rob 321・vecBits 128 で、l2KB は null です。note には「出典は A17 の解析で、Everest の世代対応(A16 か A17 か)は資料間で食い違う」とあります。`Sawtooth` は数値がすべて null です。
- **今の評価結果(実行して確認、2026-11-01)**: `apple-m3` は ST「uarch 未指定」、MT「P コア: uarch 未指定」です。**`apple-m3pro`・`apple-m3max` は ST・MT とも「コアなし」で、「uarch 未指定」ではありません**(依頼の背景の記述との差。§5(d) を参照)。
- GB7(`data/benchmarks/gb7-scores.js`、設計書 §2.4、区分 [中央値] = Geekbench Browser の Mac の機種チャートから作った機種中央値。収集は 2026-10-25):
  - M3: 2749 / 11685(n=3)
  - M3 Pro: 2819(12c)/ 16728(n=3)
  - M3 Max: 2828(16c)/ 24512(n=4)
- フロアプラン(`js/model/floorplan.js`)の `apple-m3pro` の枠は P 6・E 6、`apple-m3max` の枠は P 12・E 4 です。どちらも 12 コア版と 16 コア版のダイ写真の配置です。

## 1. M3 Pro

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| 構成 | 11 コア = 5P+6E、12 コア = 6P+6E の 2 種 | [公表] | Apple「MacBook Pro (14-inch, M3 Pro or M3 Max, Nov 2023) - Tech Specs」 https://support.apple.com/117736 (直接)。12 コア版は Newsroom https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/ にも「six performance cores and six efficiency cores」とある(直接) |
| プリセットはどちらか | **12 コア版(6P+6E)と判断** | [推定] | 根拠: GB7 の注記が「シングル: 12c」、フロアプランの枠が P 6・E 6、電力 25W の note が「マルチ時 CPU 約24〜27W」(Notebookcheck の 11c は 24W、12c は 27W)。プリセット自体にはコア数の記載がない |
| クラスタ | P クラスタ 1 個(5 か 6 コアが有効)、E クラスタ 1 個(6 コア) | [二次] | Notebookcheck「Apple M3 Pro & M3 Max analysis」 https://www.notebookcheck.net/Apple-M3-Pro-M3-Max-analysis-Apple-has-significantly-upgraded-its-Max-CPU.782974.0.html (直接、2023-12-14) |
| GPU | 14 コア(11c 版)/ 18 コア(12c 版) | [公表] | support.apple.com/117736 |
| P 最大クロック | 4.05 GHz(Notebookcheck は 4056 MHz) | [二次] | Wikipedia「Apple silicon」の比較表(wikitext を直接取得。M3〜M3 Ultra の 9 行に結合セル 4.05 GHz)。Wikipedia「Apple M3」のインフォボックスも 4.05(出典は Tom's Hardware の M3 の Geekbench 記事で、Pro の値ではない)。Notebookcheck の仕様表「2748 - 4056 MHz」「6 x 4.1 GHz」 https://www.notebookcheck.net/Apple-M3-Pro-12-Core-Processor-Benchmarks-and-Specs.781711.0.html (直接)。Apple は非公表 |
| P クロックの実測 | Geekbench が報告する周波数は約 4.05〜4.06 GHz | 検索要約(原ページ未確認) | Geekbench Browser の個別結果は 403 で**取得不可** |
| E 最大クロック | 2.75 GHz(Notebookcheck は 2748 MHz) | [二次] | 上と同じ(Wikipedia の結合セル、Notebookcheck の仕様表) |
| L2 | P 16 MB(6 コアで共有)、E 4 MB | [二次] | Wikipedia「Apple M3」の l2cache「M3 and M3 Pro: 16 MiB」、Wikipedia「Apple silicon」の結合セル(M3〜M3 Pro の 5 行で P 16MB / E 4MB)。Notebookcheck の「L2 20 MB」(16+4)とも合う |
| SLC | 12 MB | [二次] | Wikipedia「Apple silicon」の M3 Pro の SLC セル「12 MB」。Notebookcheck の仕様表の「L3 Cache: 12 MB」(SLC を L3 の欄に書いたものとみられる)。Apple は非公表 |
| メモリ帯域 | 150 GB/s | [公表] | support.apple.com/117736「150GB/s memory bandwidth」。Wikipedia は 153.6 GB/s(192bit、LPDDR5-6400 からの計算値)[二次] |
| メモリ | 18 / 36 GB | [公表] | support.apple.com/117736 |
| トランジスタ | 370 億 | [公表] | Apple Newsroom(上記)「M3 Pro consists of 37 billion transistors」 |
| ダイ面積 | 219.2 mm²(13.77 × 15.92 mm) | 既存どおり 'meas'(Kurnal) | Kurnal Insights の一覧 https://kurnal-insights.com/dieshot/?id=apple-m3pro-apl1203 (直接。HTML に埋め込まれたカードの値)。Wikipedia も 219.22 mm²(出典は sina.cn)。**プリセットの 219.2 と一致** |
| 製造プロセス | 3 nm(TSMC N3B) | 3nm は [公表]、N3B は [二次] | Newsroom「3-nanometer」。N3B は Wikipedia。プリセットの nodeId `tsmc-n3b` と一致 |
| 発表・発売 | 発表 2023-10-30、店頭 2023-11-07 | [公表] | Apple Newsroom https://www.apple.com/newsroom/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/ 「availability beginning November 7」。プリセットの year 2023 と一致 |
| 型番 | APL1203 / T6030 | [二次] | Wikipedia「Apple silicon」 |

## 2. M3 Max

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| 構成 | 14 コア = 10P+4E、16 コア = 12P+4E | [公表] | support.apple.com/117736。16 コア版は Newsroom「12 performance cores and four efficiency cores」 |
| プリセットはどちらか | **16 コア版(12P+4E)と判断** | [推定] | 根拠: GB7 の注記が「シングル: 16c」、フロアプランの枠が P 12・E 4、電力 56W は Notebookcheck の「M3 Max up to 56 watts」(16c の 14/16 インチ) |
| クラスタ | P クラスタ 2 個(各 5 か 6 コアが有効)、E クラスタ 1 個(4 コア) | [二次] | Notebookcheck の M3 Pro/Max の分析記事(上記、直接) |
| GPU | 30 コア(14c 版)/ 40 コア(16c 版) | [公表] | support.apple.com/117736 |
| P 最大クロック | 4.05 GHz(Notebookcheck は 4056 MHz、「12 x 4.1 GHz」) | [二次] | Wikipedia「Apple silicon」の結合セル。Notebookcheck https://www.notebookcheck.net/Apple-M3-Max-16-Core-Processor-Benchmarks-and-Specs.781712.0.html (直接) |
| P クロックの実測 | Geekbench の報告は 4.06 GHz / 4055 MHz / 4047 MHz の例 | 検索要約(原ページ未確認) | browser.geekbench.com/v6/cpu/… は 403 で**取得不可** |
| E 最大クロック | 2.75 GHz(Notebookcheck は 2748 MHz) | [二次] | 同上 |
| L2 | P 32 MB(16 MB × 2 クラスタとみられる)、E 4 MB | [二次](32 MB と 4 MB)/ [推定](16 MB × 2 の内訳) | Wikipedia「Apple M3」「M3 Max: 32 MiB」、Wikipedia「Apple silicon」「P-core: 32 MB / E-core: 4 MB」。内訳は「P クラスタ 2 個」(Notebookcheck)と合計 32 MB から推定したもので、明記した資料はない |
| SLC | 48 MB | [二次] | Wikipedia「Apple silicon」の SLC セル、LowEndMac https://lowendmac.com/1234/apple-silicon-m3-max-chip-specs/ (直接。出典は Wikipedia なので独立した出典ではない) |
| メモリ帯域 | 300 GB/s(14c)/ 400 GB/s(16c) | [公表] | support.apple.com/117736。Wikipedia は 307.2 / 409.6 GB/s(384bit / 512bit)[二次] |
| メモリ | 36 / 96 GB(14c)、48 / 64 / 128 GB(16c) | [公表] | support.apple.com/117736 |
| トランジスタ | 920 億 | [公表] | Newsroom「M3 Max consists of 92 billion transistors」 |
| ダイ面積 | 約 477 mm²(プリセット 477.1、NamuWiki のみ) | 検索要約(原ページ未確認) | 検索結果では 477 mm² を載せる仕様サイトが複数、503 mm² が 1 件、フォーラムの 600〜700 mm² が 1 件。Kurnal の一覧に M3 Max は無い(直接確認)。Wikipedia「Apple silicon」の面積の欄は空。**2 つ目の出典は未取得のまま** |
| 製造プロセス | 3 nm(TSMC N3B) | [公表] / [二次] | M3 Pro と同じ |
| 発表・発売 | 発表 2023-10-30、店頭 2023-11-07 | [公表] | Newsroom(上記)。16c 版を遅れて出荷した記載はない |
| 型番 | APL1204 / T6034(14c)・T6031(16c) | [二次] | Wikipedia「Apple silicon」 |

## 3. Geekbench(7 が主、6 は参考)

| チップ | 出典 | シングル | マルチ | 標本 | 区分 |
|---|---|---|---|---|---|
| M3 Pro(プリセット) | 設計書 §2.4(Geekbench Browser の Mac 機種チャート、2026-10-25) | 2819(12c) | 16728 | 機種 n=3 | [中央値] |
| M3 Pro 12c | Notebookcheck の仕様ページ(GB 7.0、直接) | 2925 | 17582 | 1 件(min=avg=max。MacBook Pro 14 Nov 2023) | [実測](n=1) |
| M3 Pro 12c | Notebookcheck(GB 6.7.1、参考) | 3138 | 15480 | 1 件 | [実測](GB6) |
| M3 Max(プリセット) | 設計書 §2.4 | 2828(16c) | 24512 | 機種 n=4 | [中央値] |
| M3 Max 16c | Notebookcheck の仕様ページ(GB 7.0、直接) | 2831 | 25533 | 1 件(MacBook Pro 16 Nov 2023、Mac15,9、64GB) | [実測](n=1) |
| M3 Max 16c | Notebookcheck(GB 6.7.1、参考) | 平均 3127(3096〜3157) | 平均 21254(21243〜21264) | 2 件 | [実測](GB6) |
| — | Geekbench Browser(`/mac-benchmarks`・`/v7/cpu/search`・`/v6/cpu/…`) | — | — | — | **取得不可**(403) |

- プリセットの値との差(Notebookcheck の値 ÷ プリセット − 1): M3 Pro はシングル +3.8%・マルチ +5.1%、M3 Max はシングル +0.1%・マルチ +4.2%。Notebookcheck は 1 件だけなので、**プリセットの [中央値] を置き換える根拠にはなりません**。大きな矛盾はありません。
- 11c 版・14c 版の GB7 は未取得です。プリセットのマルチ値が 12c・16c の機種だけから取ったものかは、設計書 §2.4 に注記がなく未確認です(シングルにだけ「12c」「16c」と書かれています)。

### 3.1 M3(無印)から流用できる値・できない値

| 値 | 流用 | 理由 |
|---|---|---|
| P・E のクロック(4.05 / 2.75) | **できる**(ただし [二次]) | Wikipedia の結合セルが M3〜M3 Max で同じ値。Notebookcheck の仕様表も同じ(2748〜4056 MHz) |
| コアの種類(P・E のマイクロアーキテクチャ) | **概ねできる**([二次]) | Notebookcheck「The CPU cores themselves are almost identical on all of the M3 models」(直接)。Apple は公表していない |
| uarch レコード | **流用元が無い** | M3 自身が uarch 未登録 |
| P の L2 | **できない** | M3 は 16 MB を 4 コアで共有(コアあたり 4096 KB)、M3 Pro は 16 MB を 6 コア(2731 KB)、M3 Max は 32 MB を 12 コア(16 MB × 2 クラスタとすると 2731 KB)。`uarch.js` の `l2KB` は uarch ごとに 1 つの値しか持てないので、M3 と Pro/Max で同じ uarch レコードを使うと L2 の差は表せない(Avalanche の note と同じ問題) |
| SLC | できない | 8 / 12 / 48 MB で違う(ただしシミュレーターは今は SLC を使っていない) |
| メモリ帯域 | できない | 100 / 150 / 300・400 GB/s(MT のメモリ帯域による頭打ちは未実装。perf.js 144 行) |
| GB7 | できない | チップごとに別の行がある |

## 4. ST/MT の評価に必要な値と、まだ取れていないもの

`js/sim/perf.js` の計算の条件:
- ST の条件は 3 つです。(1) 最速コアに `uarch` があること。(2) その uarch に幅か ROB のどちらかがあること。(3) 補正 u があること(その uarch の代表、なければ ISA 平均)。
- MT は**全てのコア種別**について同じ条件と、クロックが必要です。
- L2 は `uarch.l2KB` だけを使い、プリセットの L2・SLC・メモリ帯域は使いません。

| 必要な値 | M3 Pro / Max の状況 |
|---|---|
| コア数・クロック | §1・§2 のとおり、プリセットに足せる([公表] と [二次]) |
| P コアの uarch | **未登録**。Wikipedia「Apple silicon」の M シリーズの表は、M3 系のコア名の欄が N/a(wikitext で `rowspan=18 {{N/a}}` を確認)。Wikipedia「Apple M3」のインフォボックスは「Ibiza/Lobos/Palma」で、これはダイ(M3 / Pro / Max)のコード名。A17 Pro は Wikipedia の A シリーズの表で「Everest (2nd generation) / Sawtooth (2nd generation)」とされている。**M3 の P コア = A17 Pro の P コア**とする資料はフォーラムの議論だけ(検索要約。MacRumors のスレッドでは賛否が分かれる) |
| P の幅・ROB | 未取得([実測]・[公表] なし)。既存の `Everest`(decode 9、rob 321)の note には A17 の解析とある。フォーラム経由の Dougall Johnson の A17 Pro の値「約 320 の coalesced ROB、9-wide decode」が検索要約で出てくる(原ページ未確認) |
| E コアの uarch と幅・ROB | 未取得。`Sawtooth` は全て null。設計書 E3 では Sawtooth の rob 108(Handley 経由。実質 1 系統)を「反映できる」と提案しているが、ユーザーの判断待ち |
| L2(コアあたり) | 容量は [二次] で取れた(§3.1 の換算)。遅延は未取得 |
| 補正 u | P を `Everest` にするなら A16 の代表の u(163.7)を使うことになる。M3 系専用の代表は無い |
| 分岐ミスペナルティ、L2/L3 遅延、MSHR | 未取得(全て既定値になる) |
| メモリ帯域 | [公表] で取れたが、モデルは使っていない |

**M3 Pro / Max の CPU コアが M3 と同じか**: [二次] Notebookcheck は「ほぼ同じ」としています。M3 と同じものが Everest / Sawtooth(A16 の第 1 世代)かどうかは、Wikipedia(A17 Pro = 第 2 世代)と、データベースの `Everest` の note(値は A17 の解析)が食い違います。**Apple の公表は無く、確定できません。**

## 5. まとめ

### (a) プリセットに足せる値と区分

M シリーズの既存の書式(`{ type, uarch, count, maxGHz }`。M3 無印と同じく uarch を書かない形)に合わせると、次のようになります。

| プリセット | 足せる値 | 区分 |
|---|---|---|
| apple-m3pro | `{ type:'P', count:6, maxGHz:4.05 }`, `{ type:'E', count:6, maxGHz:2.75 }` | コア数は [公表](12c 版)、クロックは [二次](Wikipedia・Notebookcheck)。12c 版とした判断は [推定](GB7 の注記とフロアプランの枠から) |
| apple-m3max | `{ type:'P', count:12, maxGHz:4.05 }`, `{ type:'E', count:4, maxGHz:2.75 }` | 同上(16c 版) |
| 両方の notes に書ける値 | GPU 18 / 40 コア、メモリ帯域 150 / 400 GB/s、トランジスタ 370 億 / 920 億([公表])。L2 P 16 MB / 32 MB・E 4 MB、SLC 12 / 48 MB([二次])。発表 2023-10-30・発売 2023-11-07([公表]) | M シリーズのプリセットに l2・SLC・帯域の項目は無いので、入れるなら notes(または `cfg.l2` を M 系に新しく作る) |
| uarch(任意) | `Everest` / `Sawtooth` を付ける案。**根拠は [二次] の「M3 系のコアはほぼ同じ」と、A17 Pro = Everest 第 2 世代という Wikipedia の記述だけ。M3 にも付いていないので、付けるなら M3 も含めて判断が要る** | [推定] |

### (b) 未取得の一覧

- P・E の最大クロックの [公表] 値(Apple は非公表)と、原ページで確かめた [実測] 値(Geekbench Browser は 403 で取得不可)
- 全コア負荷時のクロック(Notebookcheck に「2.748 GHz(M3 Pro)/ 2.567 GHz(M3 Max)」とあるが、P と E のどちらかが文から読み取れない。§(d))
- M3 系の P・E コアの uarch の確定(コード名、幅、ROB、分岐ミスペナルティ、L2 遅延、MSHR)
- M3 Max のダイ面積の 2 つ目の出典(477 は検索要約と NamuWiki だけ)
- M3 Max の L2 のクラスタごとの内訳(16 MB × 2 は推定)
- 11c 版・14c 版の GB7、プリセットの GB7 マルチ値が何コアの機種か
- SLC・L2 の [公表] 値(Apple は非公表)
- MacRumors のフォーラム「m3 pro max l2 and slc sizes」は 403 で取得不可。Tom's Hardware の注釈ダイ写真の記事と M3 の Geekbench の記事は本文を取得できず(タイトルだけ)

### (c) ST/MT が計算できるようになった場合の副作用

実際に計算して確かめました(データは変えず、メモリ上でプリセットを書き換えて `evaluate` を実行。スクリプトは `C:\Users\kazut\AppData\Local\Temp\claude\C--LocalAI\2b29d328-e730-4ba9-bee8-aa44168650d2\scratchpad\trial.js`)。

1. **コア数とクロックだけを足した場合**(uarch なし): ST/MT は計算できるようになりません。理由が「コアなし」から「uarch 未指定」に変わるだけで、M3 無印と同じ状態です。
2. **P を Everest、E を Sawtooth にした場合**:
   - ST は M3 Pro・M3 Max・M3 とも **2678.0** で、GB7 との差は Pro −5.0%、Max −5.3%、M3 −2.6%。±10% 以内です。
   - 補正は A16 の代表の u(163.7)を借ります。`Everest.l2KB` が null なので、3 チップの L2 の差は ST に出ません(同じクロックなので同じ値)。
   - MT は「E コア: 幅・ROB が未取得」で計算できないままです。
3. **さらに Sawtooth に rob 108 を仮に入れた場合**(設計書 E3 の未承認の提案。確認のための仮の計算): MT は M3 Pro 13034.9(−22.1%)、M3 Max 20771.2(−15.3%)、M3 9488.5(−18.8%)。3 件とも ±10% を外れます。M3 Pro は電力が peak だけで公表電力が無いので、係数は 0.81 のフォールバックになります。
4. **固定値のテストが落ちる**:
   - `tests/mix.test.js` の `BASE` は `"apple-m3pro":[null,null]`・`"apple-m3max":[null,null]` で、uarch を付けると ST が数値になって落ちます。コアだけを足す場合は null のままで通ります。
   - `tests/floorplan-apple.test.js` 67〜76 行は、コアが空で枠を「構成未取得」の飾りで描くことを前提にしています(コアのブロック 0 個、飾り 10 個以上)。**コアを足すと、uarch の有無に関係なく落ちます**。`js/model/floorplan.js` 175・176 行の src の文言、`js/model/design.js` 718 行のコメント(空のコアを許す理由)、設計書の該当箇所(2066 行・2579 行・1689 行)も書き直しが要ります。
   - `floorplan-apple.test.js` 121 行の setL3 のテストは、`cores.length` が 0 でなくなると setCoreCount の分岐を通るようになります。
5. **校正への影響**: どちらも `calib:false` なので、代表の u とσは変わりません。ただし、uarch を付けて ST が計算できるようになると、設計書 §5.3.0 の「代表以外での検証」の件数と誤差の集計(計算不能の件数など)が変わります。今の ST の計算不能は 99 件中 22 件で、M3 系 3 件に uarch を付けると 19 件になります。
6. Everest を流用すると、「A16 の P コア」というレコードの意味が「A16〜M3 の P コア」に広がり、`Everest` に将来 l2KB などを入れたときに A16 と M3 系が同時に動きます。

### (d) 食い違い

1. **依頼の背景と現状の差**: 依頼では「ST/MT が『計算できません(uarch 未指定)』」となっていますが、実際の `apple-m3pro` / `apple-m3max` の理由は**「コアなし」**です。「uarch 未指定」になるのは `apple-m3` です。
2. **M3 Pro の L2・SLC**: Wikipedia と Notebookcheck は P 16 MB・SLC 12 MB、LowEndMac は P 32 MB・SLC 24 MB です。LowEndMac は出典を Wikipedia としており、Wikipedia の表の結合セルを読み違えたとみられます([推定])。eustasy の一覧も 24 MB(検索要約)で、MacRumors の推定は 12 MB(検索要約)です。
3. **メモリ帯域**: Apple は 150 / 300 / 400 GB/s、Wikipedia は 153.6 / 307.2 / 409.6 GB/s です(公表値の丸めと、バス幅からの計算値の差)。
4. **Notebookcheck の文の曖昧さ**: 分析記事では「The performance cores can achieve a maximum of 4.056 Ghz or ~3.6 GHz when all cores are placed under load in the M3, and up to 2.748 GHz in the M3 Pro — however, the M3 Max can only achieve up to 2.567 GHz」となっています。2.748 は同じサイトの仕様表の E コアの最大値(2748 MHz)と同じで、E コアのことか、P コアの全コア負荷時の値かが文から決められません。M3 Max の 2.567 も同様です。
5. **Everest の世代**: Wikipedia の A シリーズの表は A16 = Everest、A17 Pro = Everest (2nd generation) です。`uarch.js` の `Everest` は A16 用ですが、値の出典は A17 の解析と note にあります。M3 系のコア名は Wikipedia の M シリーズの表で N/a です。
6. **M3 Max のダイ面積**: 477(複数の仕様サイト、検索要約)、503(1 件)、600〜700(フォーラム)と幅があります。プリセットの 477.1(NamuWiki)は多数派と一致しますが、どれも原典は未確認です。
7. **GB7**: Notebookcheck の GB 7.0 の 1 件は、プリセットの [中央値] より M3 Pro で +3.8% / +5.1%、M3 Max で +0.1% / +4.2% 高くなっています。n=1 で、矛盾とまでは言えません。

## 出典(取得の状態)

- 直接取得:
  - Apple Newsroom(M3 系の発表、MacBook Pro の発表)
  - support.apple.com/117736
  - Wikipedia「Apple M3」「Apple silicon」(wikitext)
  - Notebookcheck の M3 Pro 12-Core と M3 Max 16-Core の仕様ページ、M3 Pro/Max の分析記事
  - LowEndMac の M3 Pro と M3 Max のページ
  - Kurnal Insights のダイ写真の一覧
- 検索要約のみ:
  - Geekbench Browser の個別結果の周波数
  - M3 Max のダイ面積の各サイト
  - MacRumors・AnandTech フォーラムの SLC と ROB の値
  - eustasy
- 取得不可(403): browser.geekbench.com(`/mac-benchmarks`、`/search`、`/v7/cpu/search`、`/v6/cpu/…`)、forums.macrumors.com
- 本文を取得できなかったもの(タイトルだけ): Tom's Hardware の 2 記事
