# Geekbench 7 公開値の Windows のみ化(第 2 回: 残りの SKU)(2026-11-13)

取得日: 2026-11-13(作業日 2026-11-14 のブラウザ取得。前回 docs/research/gb7-windows-only-2026-11-13.md と同じ扱いで取得日は 2026-11-13 と記す)。区分: [実測](Geekbench Browser の公開投稿のうち Platform 列が Windows の行の中央値)。プリセット・データへの反映はまだ(調査のみ)。

## 取得方法(前回と同じ)

- `https://browser.geekbench.com/v7/cpu/search?q=<SKU名>&page=N`(25 件/ページ、新しい投稿順)を Chrome の同じタブで順に読み(ページ内 fetch + DOMParser で各ページを取得)、各行の Platform 列が `Windows` の行だけを集めた。Windows 200 件に達した時点で打ち切り(最大 24 ページ)。今回の対象はすべて検索結果の全件を読み切っても 200 件に届かなかった。
- SKU の一致: 各行のプロセッサ名(`list-col-model` の 1 行目)が `<ベンダー> <SKU名>` と完全一致するものだけ(AMD の「 N-Core Processor」等の後置のみ許容)。Snapdragon は表示名が `Snapdragon 8cx Gen 3`(ベンダー名なし)なのでそれと完全一致。
- Windows on Arm: 8cx Gen 3 の行は Platform 列が `Windows` と表示される(Android 等の表記ではない)。Platform が `Windows` の行のみ採用。
- ST / MT はそれぞれの中央値(偶数件は中央 2 件の平均)。n < 30 は [低信頼]、Windows 件が 0 は「Windows 件なし」。
- 現行値は `data/benchmarks/gb7-scores.js`(プリセットの `gb7` 名で照合)。差 = Windows 中央値 / 現行 − 1。

## 対象/除外の判定(data/presets/chips-pc.js・chips-soc.js の全プリセット)

### 現行がすでに Windows のみ [実測] のもの(今回対象外)
chips-pc.js の 49 件のうち 44 件(前回 6cd207f で反映済み。2400G・2200G・2600X・5800U・12100 の n<200 も含む)。

### 今回の対象(Windows 実行可で、現行が Windows のみ [実測] でない)
| プリセット id | SKU | 判定理由 | 現行の区分 |
|---|---|---|---|
| amd-zen1-1800x | Ryzen 7 1800X | x86 デスクトップ | チャート(前回 n=16 で据え置き) |
| amd-zen1-1200 | Ryzen 3 1200 | x86 デスクトップ | チャート(前回 n=17 で据え置き) |
| amd-zen1-1500x | Ryzen 5 1500X | x86 デスクトップ | チャート(前回 n=25 で据え置き) |
| intel-ptl-x9-378h | Core Ultra X9 378H | x86 ノート | 直近25件の中央値(OS 混在、n 未記録。前回 n=27 で据え置き) |
| amd-epyc-7401 | EPYC 7401 | x86 サーバー(Windows Server 可) | 直近25件の中央値(n 未記録。前回 Windows 件なし) |
| qc-8cx-gen3 | Snapdragon 8cx Gen 3 | Windows on Arm ノート用 SoC(kind: mobile-pc) | 直近25件の中央値(n=17) |

Snapdragon X 系(X Elite / X Plus / X2 等)はプリセットに無い(chips-soc.js・chips-pc.js に該当なし)。

### 除外(Windows を実行できない、または判断に迷うもの)
| プリセット id | 理由 |
|---|---|
| apple-a12〜apple-a20pro(10 件) | iPhone/iPad の SoC。Windows 不可 |
| apple-m1〜apple-m5max(16 件) | Apple M。ネイティブの Windows 不可(仮想化のみ)。指示により不可扱い |
| qc-855, 865, 888, 8gen1, 8plus-gen1, 8gen2, 8gen3, 8elite, 8elite-gen5, 8s-gen3, 8s-gen4, 7plus-gen3, 780g, 7gen1, 7gen3, 7gen4, 720g, 6gen1, 4gen2, 8elite-x-gen6(20 件) | スマホ SoC(Android)。Windows on Arm の公式対応機が無い |
| mt-9000, 9200, 9300, 9400, 9500, 9600pro, 8200(7 件) | Dimensity スマホ SoC。Windows 不可 |
| nv-orin-agx, nv-thor, nv-t239 | NVIDIA Jetson / Switch 2。指示により不可 |
| nv-gb10 | GB10(DGX Spark)。DGX OS(Linux)で出荷。指示により不可。Windows 版の別製品(N1X 等)と混同しないため推測で含めない |

判断に迷ったもの: なし(上記はすべて指示の区分どおり)。参考: gb7-scores.js にはプリセットを持たない x86 の値(Core Ultra 5 135U・225H〔チャート〕、Threadripper 1950X/1900X〔チャート〕、EPYC 7551〔直近25件〕、Intel 第2〜第11世代〔チャート、参考データのみ〕)もあるが、今回の範囲(プリセット)外として取り直していない。

## 結果(取得日 2026-11-13、区分 [実測])

| SKU | プリセット id | Windows n | ST 中央値 | MT 中央値 | 現行 ST / MT(区分) | ST 差 | MT 差 | 投稿日の範囲(新→旧) | 読んだ行(OS 内訳) | 備考 |
|---|---|---|---|---|---|---|---|---|---|---|
| Ryzen 7 1800X | amd-zen1-1800x | 16 [低信頼] | 1157 | 7203 | 1126 / 6671(チャート) | +2.8% | +8.0% | Nov 01, 2026〜Jul 23, 2026 | 20(Windows 16, Linux 4)=全件 | 8c:16 |
| Ryzen 3 1200 | amd-zen1-1200 | 17 [低信頼] | 987 | 3016 | 979 / 2936(チャート) | +0.8% | +2.7% | Nov 06, 2026〜Jul 23, 2026 | 22(Windows 17, Linux 5)=全件 | 4c:17 |
| Ryzen 5 1500X | amd-zen1-1500x | 25 [低信頼] | 1140 | 4476 | 1107 / 4256(チャート) | +3.0% | +5.2% | Nov 07, 2026〜Jul 26, 2026 | 31(Windows 25, Linux 6)=全件 | 4c:25 |
| Core Ultra X9 378H | intel-ptl-x9-378h | 27 [低信頼] | 2443 | 16600 | 2600 / 17300(直近25件、OS 混在) | -6.0% | -4.0% | Nov 12, 2026〜Jul 29, 2026 | 29(Windows 27, Linux 2)=全件 | 16c:27 |
| EPYC 7401 | amd-epyc-7401 | 0 **Windows 件なし** | — | — | 957 / 10113(直近25件) | — | — | — | 1(Linux 1)=全件 | 検索「EPYC 7401」の結果は Linux 1 件のみ |
| Snapdragon 8cx Gen 3 | qc-8cx-gen3 | 39 | 1364 | 6610 | 1315 / 6722(直近25件、n=17) | +3.7% | -1.7% | Nov 04, 2026〜Jul 24, 2026 | 53(Windows 53)=全件 | 8c:39 / 除外名: Snapdragon 8cx Gen 2 14 |

注:
- x86 の 5 件は前回(2026-11-13)の取得と n・中央値・日付範囲が完全に一致した(その後の新規投稿なし)。
- 8cx Gen 3 は検索語「Snapdragon 8cx Gen 3」と「8cx Gen 3」で同じ 53 行・同じ結果。検索語「SC8280XP」は Android 1 行のみ(該当名なし)。
- 参考(採用せず): Surface Pro 9 5G 等の「Microsoft SQ3」(8cx Gen 3 の Microsoft 向け版)は名前が異なるため完全一致から除外。検索「SQ3」で Windows 10 件、ST 1372 / MT 6305(8c:10)。含めるかはユーザー判断。

## 要約

- 対象 6 件(Windows 実行可で未 [実測] のプリセット)。うち値が取れたのは 5 件。
- n < 30 [低信頼]: 1800X(16)、1200(17)、1500X(25)、X9 378H(27)。30 ≤ n < 200: 8cx Gen 3(39)。
- Windows 件なし: EPYC 7401(検索結果は Linux 1 件のみ)。
- 現行との差が大きい順: 1800X(MT +8.0%)、X9 378H(ST -6.0% / MT -4.0%)、1500X(MT +5.2%)、8cx Gen 3(ST +3.7%)、1200(MT +2.7%)。
- 除外: Apple A/M(26 件)、スマホ用 Snapdragon(20 件)、Dimensity(7 件)、NVIDIA Orin/Thor/T239/GB10(4 件)。
