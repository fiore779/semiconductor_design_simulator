# Lunar Lake(Core Ultra 200V: 268V・258V・256V)のキャッシュ階層と、LP-E の u の再調査(2026-11-13)

- 依頼: ユーザー指摘「Lunar Lake はキャッシュ仕様が特殊(L0 など)。LP-E(Skymont)は Arrow Lake のリング接続 E と同じコアだが、キャッシュ階層が違う」。
- 前提: Arrow Lake のリング接続 E は `Skymont (Arrow Lake リング E)`(uRatioOf: 'Lion Cove'、uRatio 0.90)としてすでに実装されている(`data/uarch.js` 37 行、`js/sim/perf.js` 112〜114 行)。現状の ng は **30/158**(σ=0.03306、γ=0.30、c=0.411、Lion Cove u=102.131、x86 ISA 平均 u=109.180)。
- 方法: `tests/helpers.js` と同じ読み込みで `E.makeContext()` を作り、LNL 3 件は `perf.coreCpi` を直接呼ぶ再実装(per-core の L3 を変えられるようにした)で、ほかは `perf.stScore`/`mtScore` のままで評価した。再実装で現状の値(268V 11.8/-6.0 など)が一致することを確認した。mobile-pc の MT クロックは現行の連続式 c·W^0.15(37W で 0.706)。**コード・データ・設計書・git は変更していない(試算のみ)**。使い捨てスクリプトは scratchpad の `lnc0.js`〜`lnc4.js`、Hot Chips のスライドから文字を取り出したのは `pdfgrep.js`(`hc24/text.txt`)。
- 区分: [公表]=メーカー発表、[実測]=測定値そのもの、[二次]=報道・フォーラム・Wikipedia の記述、[推定]=本メモでの計算。取得日はすべて 2026-11-13。

## 0. 結論(要約)

1. **キャッシュ階層(確定したもの)**: P コア(Lion Cove)は L0 48KB(4c)/L1 192KB(9c)/L2 2.5MB(17c)/L3 12MB を P コアだけで共有(51c)。LP-E クラスタ(Skymont 4 コア)は L1D 32KB(4c)、L2 4MB をクラスタで共有(19c)。**LP-E は L3 につながっていない**。L2 のミスは **8MB のメモリサイドキャッシュ(MSC)** に行き、その先が LPDDR5X。MSC は CPU コア(P・E)も IO エンジンも使う。区分と出典は §1。
2. **現状のモデルの誤り**(確認済み): ① **LP-E が L3 12MB を P と分け合う形で計算されている**(12MB ÷ 8 スレッド、L3 遅延は Arrow Lake の 69 サイクル)。② P の L2 が Arrow Lake の 3MB、L3 遅延が Arrow Lake の 84 サイクル(LNL は 2.5MB・51c)。③ MT で P の L3 が 12MB÷8(本当は P 4 スレッドで 12MB÷4)。④ MSC は使われない(perf.js は `memorySideCacheMB` を読まない。258V・256V には値も無い)。⑤ DRAM の遅延はどの SKU も 85ns 固定(LNL の実測は P から 131ns、E から 170ns)。L0 はモデルにないが、Arrow Lake と同じコアなので u に吸収されていて、LNL に特有の誤りではない。
3. **キャッシュを正しくしたときの ipc_model**(試算): LP-E は 1 コアあたり **-6.6%**(4.098 → 3.829、MT の 2.61GHz で。L3 を外したため)。P は MT で +3.3%(12MB÷4)、ST で +1.7%(L2 2.5MB・L3 51c)。**ST は P の修正で悪化する**(258V +9.2 → +11.1%、256V +9.9 → +11.8% で ng。u は Arrow Lake 265K の条件で校正されているため)。
4. **LNL の MT の過小(-6〜-9%)の主な原因は、キャッシュよりクロック**だと見られる: Tom's Hardware の実測(258V、Cinebench の MT の平均)は **P 3.0GHz・E 3.5GHz**。モデルは P 3.39・E 2.61GHz(P と E に同じ係数 0.706 を掛けている)。**LNL は E の方が P より速く回る**。実測の比を使うと、現状のキャッシュのままで MT は -0.3 / -2.8 / -0.6%。
5. **LP-E に u 比 0.90(A)を当てるのは不可**(推奨しない)。当てるとキャッシュやクロックの組み合わせによらず LNL の MT は -8〜-21% で、正しいキャッシュでは 3 件とも ng(ng 33〜35)。0.90 は Arrow Lake の MT に合わせた校正値で、約 13% の未分離の要因(リングの競合、24 スレッドの η など)を含む。Lunar Lake の LP-E にはこれをそのまま持っていく根拠がない。
   - 一方、「同じコアには同じ u を使い、キャッシュの差は ipc_model で表す」考え方は裏付けがある。同じ u ならモデルの「Arrow Lake の E ÷ LNL の LP-E」(1 スレッド、4.6 対 3.7GHz)は **1.58** になり、Chips and Cheese の SPEC の差(整数 1.51・浮動小数点 1.63)と合う(§3.4)。LP-E に当てるなら、前回メモの B(物理的な IPC の比 0.875 → u=105.7、ISA 平均より -3%)の方が筋が良い。
6. **推奨する修正案(実装はユーザー判断)**: §4。優先順位は (1) LP-E を L3 なしにし、P の L3 を P のスレッドだけで割る(ST は不変、ng 30 のまま)→ (2) MT のクロックを LNL の実測(P 3.0・E 3.5)にする → (3) P の L2 2.5MB・L3 51c は、DRAM の遅延(機種別)を入れるまで保留 → (4) LP-E の u は ISA 平均のまま、または B(105.7)。A 0.90 は当てない。

## 1. キャッシュ階層(出典つき)

| 項目 | 値 | 区分 | 出典 |
|---|---|---|---|
| P: L0(データ) | 48KB/コア、4 サイクル(Redwood Cove の 5 から短縮) | [実測](258V)・容量は [二次] | Chips and Cheese「Lion Cove: Intel's P-Core Roars」 https://old.chipsandcheese.com/2024/09/27/lion-cove-intels-p-core-roars/ 、Wikipedia「Lunar Lake」 https://en.wikipedia.org/wiki/Lunar_Lake |
| P: L1(データ。Intel の呼び方で「L1」、文献により L1.5) | 192KB/コア、9 サイクル(1.88ns) | [実測] | 同 Chips and Cheese |
| P: L1I | 64KB/コア | [二次] | Wikipedia「Lunar Lake」 |
| P: L2 | **2.5MB/コア**、17 サイクル。帯域は 32B/サイクルが上限 | 容量 [二次]・遅延 [実測] | 同 Chips and Cheese、Wikipedia。Arrow Lake は 3MB(設計書 1021 行の「3MB/2.5MB の食い違い」は、LNL=2.5MB・ARL=3MB で解消) |
| P: L3 | **12MB**(Intel Smart Cache)、3MB×4 スライス、**P コアだけ**がリング上にある。51 サイクル(Arrow Lake は 80 超)。1 コアの読み出しは約 10B/サイクル強 | 容量 [公表]・その他 [実測]/[二次] | Intel ARK 258V https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html(Cache 12MB、L2 と帯域は記載なし)、Chips and Cheese(「Lunar Lake gives E-Cores the boot, leaving just the P-Cores and their associated L3 slices on the ring bus」)、Chips and Cheese「Examining Intel's Arrow Lake at the system level」 https://chipsandcheese.com/p/examining-intels-arrow-lake-at-the(LNL 約 52c、ARL 80c 超) |
| LP-E: L1D | 32KB、4 サイクル(Crestmont の 3 から増加) | [実測]・容量 [二次] | Chips and Cheese「Skymont: Intel's E-Cores Reach for the Sky」 https://chipsandcheese.com/p/skymont-intels-e-cores-reach-for-the-sky 、Wikipedia |
| LP-E: L2 | **4MB を 4 コアで共有**、19 サイクル。クラスタ全体 128B/サイクル、1 コア 28〜29B/サイクル | 容量 [公表]・その他 [実測] | Hot Chips 2024 の Intel のスライド(「Increased 4MB L2 cache」) https://www.hc2024.hotchips.org/assets/program/conference/day1/56_HC2024.Intel.AGihon.final.pdf 、同 Chips and Cheese |
| LP-E: L3 | **なし** | [実測]/[二次] | Chips and Cheese「Skymont in Desktop Form」 https://chipsandcheese.com/p/skymont-in-desktop-form-atom-unleashed(「leaving the Skymont cluster with no L3 cache」)。Wikipedia の infobox には「E コアには P から使えない専用の L3」とあるが、容量の記載がなく、Chips and Cheese・Intel とも合わない(MSC と混同している可能性。推測) |
| メモリサイドキャッシュ(MSC) | **8MB**(「8MB physical cache」)。目的は「DRAM の通信と電力を減らす」「遅延と帯域の両方を改善」「IO エンジンのキャッシュ」。**E コアのクラスタの説明にも「Mem side cache for power and latency」とある**(E も使う) | [公表] | Hot Chips 2024 の Intel のスライド(PDF の文字を抽出して確認) |
| MSC の遅延 | P から約 30ns(MSC に当たる範囲)。LP-E から 8MB の試験で 59.5ns(214 サイクル。一部は L2 に当たっているので下限) | [実測] | 同 Chips and Cheese の Lion Cove・Skymont の記事 |
| MSC の命中率 | **LP-E の L2 ミスの約 34%**(Arrow Lake の 36MB L3 は 97%) | [実測](負荷は SPEC 系と見られる。条件の詳細は未取得) | Chips and Cheese「Skymont in Desktop Form」 |
| L2 ミスの帯域(LP-E クラスタ) | 約 60GB/s(Arrow Lake の Skymont クラスタは 80GB/s 超) | [実測] | 同上 |
| クラスタ間のコヒーレンシ | 約 55ns(前世代の 1/3) | [公表] | Hot Chips 2024 の Intel のスライド |
| DRAM の遅延 | P から約 131.4ns(負荷をかけると 112.4ns)、LP-E から約 170ns(1GB の試験。別のコアが帯域を使うと 133ns) | [実測] | Chips and Cheese の Lion Cove・Skymont の記事。参考: Arrow Lake 285K(DDR5-8000)は約 99ns(uarch.js の Lion Cove の note) |
| メモリ | オンパッケージ LPDDR5X-8533、最大 32GB(2 ランク)、「16b x4 channels」(パッケージあたり。ARK の数え方では 2 チャネル) | [公表] | Hot Chips 2024 のスライド、ARK |
| メモリの帯域 | 約 136.5GB/s(8533MT/s × 128bit ÷ 8)。Intel の Computex 2024 の資料の「Lunar Lake 136GB/s」 | 計算は [推定]、Intel の数字は検索結果の要約経由 [二次](原ページは取得できず。タイムアウト) | https://edc.intel.com/content/www/us/en/products/performance/benchmarks/computex-2024 |
| MT 中のクロック(258V、Asus Zenbook S14、Performance モード、Cinebench MT) | **P の平均 3.0GHz、E の平均 3.5GHz**、平均電力 19W。288V も P 3.0・E 3.4。ST のピークは P 4.6・E 3.55GHz | [実測](Tom's Hardware の記事 [二次]。GB7 ではない) | https://www.tomshardware.com/pc-components/cpus/the-only-shipping-intel-core-ultra-9-equipped-laptop-is-slower-than-the-core-ultra-7-258v-used-in-reviews(Chrome で本文を確認) |
| Intel の最適化マニュアル | 未取得(今回は見ていない) | — | — |
| MSC の帯域・P から見た命中率 | **未取得** | — | — |

- 268V・258V・256V は同じ compute タイル(4P+4LP-E、L3 12MB、MSC 8MB)。違いはクロックとメモリ容量だけ(ARK・Tom's Hardware「同じキャッシュ容量」)。**MSC 8MB は Lunar Lake の compute タイルの仕様**(Hot Chips の公表)なので、258V・256V にも当てはまる(SKU 別に MSC を記載した資料は無いが、ダイが同じ。推定)。

## 2. 現状のモデルの表し方(確認済み)

| 項目 | 現状 | 実物 | 判定 |
|---|---|---|---|
| プリセット(chips-pc.js 78・240・421 行) | 4P(Lion Cove)+4 LP-E(`Skymont`)、`l3MB: 12`。`memorySideCacheMB: 8` は 268V だけ | 同上、MSC 8MB は 3 件とも | 258V・256V の MSC が欠落(perf に影響なし) |
| P の uarch(`Lion Cove`) | l1dKB 192(L1 として)・l2KB **3072**・l2Lat 17・l3Lat **84**(Arrow Lake)、L0 は note だけ | L2 2.5MB、L3 51c | L2・L3 遅延は Arrow Lake の値 |
| LP-E の uarch(`Skymont`) | l1dKB 未設定(参照の 32KB)・l2KB 1024(4MB/4)・l2Lat 19・**l3Lat 69(Arrow Lake)** | L1/L2 は一致。L3 なし | L3 があることになっている |
| L3 の割り方(perf.js 99 行) | ST: 12MB 全量。MT: **12MB ÷ 総スレッド 8 = 1.5MB を P にも LP-E にも** | P は 12MB÷4、LP-E は 0 | P は過小、LP-E は過大 |
| MSC | 使わない(perf.js は `memorySideCacheMB` を読まない) | P の L3 ミス・LP-E の L2 ミスの一部を受ける | 欠落 |
| DRAM | 85ns × f(全 SKU 共通の仮の値。memory.js はメモリ固定の LNL では係数 1) | P 131ns・E 170ns(ARL は 99ns) | 機種差なし(u に吸収) |
| L0 / L1 の遅延 | coreCpi は L1 の容量だけ使い、l1dLat は使わない。L0 の項は無い | — | Arrow Lake と同じコアなので u に吸収され、LNL に特有の誤りではない |
| LP-E の u | 代表・uCal・uFrom・uRatio が無く **x86 ISA 平均 109.18**(corrSource 'isa') | — | — |
| MT のクロック | mobile-pc の連続式 0.411·37^0.15 = 0.706 を P・LP-E の両方の boost に掛ける → P 3.39(258V)/3.53(268V)、LP-E 2.61GHz | 258V の CB MT: P 3.0・E 3.5 | **E が過小、P が過大**(LNL では E の方が速い) |

**LNL の LP-E と Arrow Lake のリング接続 E の違い(モデル上)**: 同じなのは幅・ROB・L1/L2・L3 遅延(69c)の記録。違うのは ① uarch 名(LNL は `Skymont` で ISA 平均の u、ARL は `Skymont (Arrow Lake リング E)` で Lion Cove × 0.90)、② クロック、③ L3 の容量(LNL は 12MB÷8 = 1.5MB、265K は 30MB÷20 = 1.5MB で、たまたま同じ)。実物では LNL の LP-E は L3 が無く、MSC と遅い DRAM につながっているが、**モデルでは 1 スレッドあたりの L3 が Arrow Lake と同じになっている**(3.7GHz で ipc_model 3.920 が両者で一致)。

### 2.1 現状の誤差(確認済み)

| SKU | ST | MT | 1 コアの値(MT) |
|---|---|---|---|
| 268V | +11.8 | -6.0 | P 1711(3.53GHz)、LP-E 1169(2.61GHz) |
| 258V | +9.2 | -8.6 | P 1654(3.39GHz)、LP-E 1169 |
| 256V | +9.9 | -6.5 | 同上 |

## 3. 試算

### 3.1 ipc_model の変化(258V。確認済み)

| 条件 | 現状 | 修正後 | 変化 |
|---|---|---|---|
| P の ST(4.8GHz、L3 12MB 全量) | 5.061 | 5.148(L2 2.5MB・L3 51c) | +1.7% |
| P の MT(3.39GHz) | 4.775(L3 1.5MB/スレッド、84c) | 4.932(12MB÷4 だけ)/ 5.015(さらに L2 2.5MB・L3 51c) | +3.3% / +5.0% |
| LP-E の MT(2.61GHz) | 4.098(L3 1.5MB、69c) | 3.829(L3 なし) | **-6.6%** |
| LP-E + DRAM 170/99 倍 | — | 3.261(L3 なし)/ 3.550(MSC 8MB÷4、59.5ns) | -20% / -13% |
| P + DRAM 131.4/99 倍 | — | ST 5.042、MT 4.874 | ST -0.4%(L2・L3 の修正と打ち消し合う) |

- **MSC をモデルの L3 として入れても効かない**(確認済み): 59.5ns の L3 では、coreCpi の式(L2 ミスがすべて L3 の遅延を払い、L3 ミスはさらに DRAM の遅延を払う)で損益分岐点の約 54ns(= (1 − m3/m2) × 85ns)を超える。このため「L3 なし」の下限(l3Floor)に張り付き、結果は L3 なしと同じになる。命中率を 34% に合わせても同じ。DRAM の遅延を 170ns に上げたときだけ MSC が効く(3.261 → 3.550)。
- DRAM の遅延の比(131.4/99、170/99)は、Arrow Lake 285K の 99ns(DDR5-8000)との比で、u を校正した 265K(DDR5-6400)の値ではない [推定]。

### 3.2 LNL 3 件の誤差(u とキャッシュとクロックの組み合わせ。全 158 判定の ng。x86 mobile-pc 22 件の MT の MAE)

キャッシュ: cur=現状。fixL3only=P は 12MB÷4 で記録は変えず、LP-E は L3 なし(**ST は不変**)。fix=fixL3only+P の L2 2.5MB・L3 51c。fixP=P だけ fix(LP-E は L3 あり。物理的には誤り。参考)。
クロック: formula=現行の連続式(P・E とも boost × 0.706)。meas=258V の実測の比(P は boost × 0.625、E は boost × 3.5/3.7)を 3 件に当てたもの [推定]。
LP-E の u は 285H の LP-E 2 個にも同じ値を当てた(285H の MT 列)。

| LP-E の u | キャッシュ | クロック | 268V ST / MT | 258V ST / MT | 256V ST / MT | 285H MT | ng | mobile MAE |
|---|---|---|---|---|---|---|---|---|
| ISA 109.18(現状) | cur | formula | 11.8 / -6.0 | 9.2 / -8.6 | 9.9 / -6.5 | 8.5 | **30** | 6.24 |
| ISA 109.18 | cur | meas | 11.8 / **-0.3** | 9.2 / **-2.8** | 9.9 / **-0.6** | 8.5 | 30 | **5.45** |
| ISA 109.18 | fixL3only | formula | 11.8 / -6.4 | 9.2 / -9.3 | 9.9 / -7.2 | 8.5 | 30 | 6.33 |
| **ISA 109.18** | **fixL3only** | **meas** | 11.8 / -4.1 | 9.2 / -6.8 | 9.9 / -4.7 | 8.5 | **30** | 5.99 |
| ISA 109.18 | fix | formula | 13.7 / -5.5 | **11.1** / -8.4 | **11.8** / -6.3 | 8.5 | 32 | 6.20 |
| ISA 109.18 | fix | meas | 13.7 / -3.2 | **11.1** / -6.0 | **11.8** / -3.8 | 8.5 | 32 | 5.88 |
| ISA 109.18 | fixP | meas | 13.7 / +1.9 | 11.1 / -0.8 | 11.8 / +1.4 | 8.5 | 32 | 5.48 |
| B 105.7 | cur | formula | 11.8 / -7.2 | 9.2 / -9.8 | 9.9 / -7.7 | 8.2 | 30 | 6.40 |
| B 105.7 | cur | meas | 11.8 / -1.9 | 9.2 / -4.4 | 9.9 / -2.2 | 8.2 | 30 | 5.66 |
| B 105.7 | fixL3only | formula | 11.8 / -7.6 | 9.2 / **-10.4** | 9.9 / -8.4 | 8.2 | 31 | 6.47 |
| **B 105.7** | **fixL3only** | **meas** | 11.8 / -5.5 | 9.2 / -8.2 | 9.9 / -6.1 | 8.2 | **30** | 6.17 |
| B 105.7 | fix | meas | 13.7 / -4.6 | 11.1 / -7.4 | 11.8 / -5.2 | 8.2 | 32 | 6.06 |
| A 0.90(91.9) | cur | formula | 11.8 / **-12.0** | 9.2 / **-14.6** | 9.9 / **-12.6** | 7.2 | 33 | 7.01 |
| A 0.90 | cur | meas | 11.8 / -8.1 | 9.2 / **-10.6** | 9.9 / -8.5 | 7.2 | 31 | 6.46 |
| A 0.90 | fixL3only | formula | 11.8 / **-12.1** | 9.2 / **-14.9** | 9.9 / **-12.9** | 7.2 | 33 | 7.04 |
| A 0.90 | fixL3only | meas | 11.8 / **-11.1** | 9.2 / **-13.7** | 9.9 / **-11.7** | 7.2 | 33 | 6.89 |
| A 0.90 | fix | formula | 13.7 / -11.1 | 11.1 / -14.0 | 11.8 / -12.0 | 7.2 | 35 | 6.91 |
| A 0.90 | fix | meas | 13.7 / -10.2 | 11.1 / -12.9 | 11.8 / -10.9 | 7.2 | 35 | 6.77 |
| A 0.90 | fixP | meas | 13.7 / -5.9 | 11.1 / -8.6 | 11.8 / -6.5 | 7.2 | 32 | 6.18 |

- LNL 以外の SKU は、285H の MT(LP-E の u を変えたときだけ。8.5 → 8.2 / 7.2。ok のまま)を除いて全件不変(確認済み)。ST が変わるのは P の L2・L3 遅延を直した「fix」だけ。
- DRAM の遅延を LNL の実測の比(P × 1.33、E × 1.72)にすると、ST は戻る(258V 11.1 → 8.8%)が、MT は -12〜-21% に下がる(ISA・formula で 268V -12.5 / 258V -15.2 / 256V -13.3。lnc1.js・lnc3.js)。DRAM の遅延だけを機種別にすると、u を校正した 265K との整合が崩れる(265K 側の DRAM の遅延も機種別にする必要がある)。このため単独では入れられない(推測)。

### 3.3 LP-E の u に必要な値(MT の誤差 0。確認済み)

| 条件 | 268V | 258V | 256V |
|---|---|---|---|
| 現状のキャッシュ・連続式のクロック | 126.2 | 134.0 | 127.5 |
| 修正キャッシュ(fix)・連続式 | 125.9 | 135.0 | 128.1 |
| 修正キャッシュ(fix)・LP-E 3.7GHz | 97.9 | 105.0 | 99.6 |
| 現状のキャッシュ・LP-E 3.7GHz | 93.2 | 98.9 | 94.1 |

- 連続式(LP-E 2.61GHz)のままでは、LP-E に ISA 平均(109)より 15〜24% 高い u が必要になり、物理的に不自然(Skymont が Lion Cove の u を上回る)。**MT の過小の主な原因は LP-E のクロックの過小**と見られる(推測。実測 3.5GHz と符合)。

### 3.4 同じコアに同じ u を使う考え方の検証(確認済み・解釈は推測)

1 スレッド(SPEC 相当): Arrow Lake のリング接続 E(285K、L3 36MB、4.6GHz)÷ LNL の LP-E(3.7GHz)

| LNL の LP-E のキャッシュ | 同じ u のとき(u によらない) | LNL の LP-E が ISA 平均・ARL が 0.90 のとき |
|---|---|---|
| 現状(L3 12MB 全量、69c) | 1.264 | 1.064 |
| L3 なし | **1.575** | 1.326 |
| L3 なし + DRAM × 1.72 | 1.928 | 1.623 |

- Chips and Cheese(Skymont in Desktop Form)の SPEC CPU2017 では、Arrow Lake の Skymont が Lunar Lake の Skymont より整数 +51%・浮動小数点 +63%(比 1.51・1.63)[実測・二次]。**同じ u で LNL の L3 を外すと 1.575 になり、測定の間に入る**。つまり、プラットフォームの差はクロックと ipc_model のキャッシュの差だけでおおむね説明でき、u を変える必要はない(推測)。ただし SPEC 実行中のクロック(ARL 4.6・LNL 3.7GHz という前提)は記事で確認できていない(記事には数値がない)。
- 1 クロックあたり(3.5GHz、LNL の条件)の LP-E ÷ P(u×ipc): ISA 0.756、B 0.732、A 0.637。前回メモの測定(Arrow Lake の条件で 0.86〜0.88)から、LNL では L3 が無い分だけ下がるのが自然。A の 0.637 は低すぎる(推測)。

## 4. 結論と修正案(実装はしない。ユーザー判断)

### 4.1 キャッシュの表し方の修正案

1. **【推奨・優先】L3 にアクセスできるコアの種別を持たせる**: 例えばプリセットに `cfg.l3Types: ['P']`(または各コアに `l3: false`)を足し、perf.js の stScore で ① そのコアが L3 を使えないなら `noL3` 扱い、② MT の L3 は「L3 を使える種別の総スレッド数」で割る。LNL 3 件に入れる。効果(fixL3only): ST は不変、MT は連続式で -0.4〜-0.7 pt、ng 30 のまま。**物理的に正しい形にしても誤差は悪化しない**。
   - 285H の LP-E 2 個(SoC タイル、Meteor Lake と同じく L3 なしと見られる。未確認)にも同じ仕組みが使える(効果は小さいと推測。未試算)。
2. **【推奨】MT のクロック**: LNL は E が P より速く回る(実測 P 3.0・E 3.5GHz、258V の CB MT)。`allCoreGHz` に P 3.0・LP-E 3.5 を入れると、現状のキャッシュで MT は -0.3〜-2.8%、修正キャッシュで -4.1〜-6.8%(すべて ok)。副作用: `allCoreGHz` があると連続式の係数も冷却の制限も掛からない(perf.js 246〜250 行)ため、LNL の MT は TDP の選択や冷却で変わらなくなる。この値は Cinebench・Zenbook S14 の Performance モード(PL1 28W 前後)の値で、GB7 の値ではない [二次]。268V・256V は未取得なので、258V の値の流用(268V は P の boost が高いので比で当てる、など)になる。代わりに、連続式の係数を種別別にする案もある(LP-E に掛けない、など。根拠は同じ実測 1 件)。
3. **【保留】P の L2 2.5MB・L3 51c**: 事実としては正しいが、入れると ST が +1.9 pt 悪化し、258V・256V が ng になる(ng 30 → 32)。u は 265K(L2 3MB・L3 84c・DRAM 約 99ns)の条件で校正されている。LNL の DRAM の遅延(131ns)を入れないと、片側だけ直すことになる。入れるなら `Lion Cove (Lunar Lake)` の記録(uFrom: 'Lion Cove'、l2KB 2560、l3Lat 51)と、機種別の dramNs を同時に入れる。dramNs を機種別にするのは全 SKU に関わるので、別件にするのが妥当(推測)。
4. **【データだけ】MSC**: 258V・256V にも `memorySideCacheMB: 8` を入れられる(Hot Chips 2024 の公表で、compute タイルの仕様。§1 の注)。perf は使わないので ST/MT は不変。モデルに入れても、LP-E から 59.5ns の値では L3 なしと同じになる(§3.1)。入れる意味が出るのは、機種別の DRAM の遅延を入れたときだけ。
5. **設計書の記述の修正候補**: 983 行「メモリサイドキャッシュが別に 8MB(NPU・表示系向け)」→ Intel は CPU を含む全体向けとし、E のクラスタの説明にも挙げている(「NPU・表示系だけ」ではない)。1021 行の L2 の食い違いは「LNL 2.5MB・ARL 3MB」で解消。814 行・1863 行の「258V/256V の MSC は未確認」は、ダイが同じなので解消できる(SKU 別の記載は無い)。

### 4.2 LP-E に Skymont 用の u の比を当ててよいか

- **A(u の比 0.90。Arrow Lake のリング接続 E の現行値)は当てない**。根拠: ① 0.90 は 285K・265K の MT から合わせた校正値で、1 クロックあたりでは 0.76 になる。測定の 0.86〜0.88 との差(約 13%)は Arrow Lake 側の要因(24 スレッドの η、リング・L3 の競合、MT 中の E クロック)の可能性があり、内訳は分かっていない。② LNL に当てると、どのキャッシュ・クロックの組み合わせでも MT は -6〜-21% で、物理的に正しい組み合わせ(fix/fixL3only)では 3 件とも ng(ng 33〜35)。③ 正しいキャッシュでは、LP-E の IPC の低さはすでに ipc_model に入る(L3 を外して -6.6%)。そこへ ARL 用の割引を重ねると、二重に下げることになる可能性が高い(推測)。
- **同じコアに同じ u を使う(B、物理的な IPC の比 0.875 → u=105.7)は当ててもよい**。根拠: §3.4 で、同じ u と L3 なしでの ARL/LNL の比(1.575)が SPEC の測定(1.51〜1.63)と合う。ISA 平均(109.18)との差は -3% で、LNL の MT は -1.2〜-1.6 pt、ng 30 のまま(fixL3only・meas)。ただし B 0.875 自体が Arrow Lake の GB5・CB2024 の測定から出した値で、GB7 の値ではない。ISA 平均のままでも誤差はほぼ同じ。
- **当て方の注意**: 当てる場合は `Skymont` の記録に `uRatioOf: 'Lion Cove'`、`uRatio: 0.875 × 1.1827 ≈ 1.035`(1 クロックあたりの比を u の比に直した値。Lion Cove と Skymont の ipc_model の比 1.1827 は 265K の条件で出したもの)を入れる。285H の LP-E も同じ記録なので一緒に動く(285H MT 8.5 → 8.2%)。corrSource は 'ratio' なので σ の代表は不変。
- 副作用(確認済み): LNL・285H 以外の SKU は不変。LNL の ST は不変(LP-E は最速コアではない)。

### 4.3 推測と確認済みの区別

- 確認済み: §1 の [公表]/[実測] の値(各出典の本文で確認。AnandTech は接続できず、Intel の Computex の資料はタイムアウトで原ページ未確認)、§2 のモデルの表し方、§3 の試算の数値。
- 推測: 「LNL の MT の過小の主因はクロック」(実測は Cinebench 1 件で、GB7 の MT 中のクロックは未取得)、「A 0.90 を LNL に当てると二重に下げる」、「SPEC のクロックは ARL 4.6・LNL 3.7GHz」、「285H の LP-E は L3 なし」、「MSC は 258V・256V にもある」(同じダイなので確度は高い)。

## 5. 未取得・限界

- GB7 の MT 実行中の LNL の P・LP-E のクロック(今回は Cinebench の値で代用)。268V・256V の MT 中のクロック。
- MSC の P から見た命中率・帯域、MSC のヒット時の正確な遅延(LP-E からの 59.5ns は下限)。
- Intel の最適化マニュアルの Lunar Lake の記述(今回は見ていない)。AnandTech の Lunar Lake の解説(接続できず)。
- 機種別の DRAM の遅延をモデルに入れたときの全 SKU への影響(u の再校正が必要で、今回は LNL だけの感度として試算)。

## 6. 実装結果(2026-11-15。ユーザー決定: §4.1 の 1・2 を実施。ほか〔P の L2 2.5MB・L3 51c、MSC 8MB、LP-E の u、285H〕は今回やらない)

### 6.1 §4.1 の 1: `cfg.l3Types`(コミット 1)

- プリセットの `cfg` に任意項目 `l3Types`(コア種別の配列)を追加し、LNL 3 件に `['P']` を入れた。`js/sim/perf.js` の `stScore` は、`l3Types` があり自分の `type` がそこに無いコアを `noL3` 扱いにし、MT の L3 は `l3Types` の総スレッド数(`opts.l3Threads`。`mtScore` が渡す)で割る。`l3Types` が無い SKU は評価が完全に不変(106 件の前後比較。LNL 3 件以外は ST・MT・誤差とも一致)。`l3Types` は保存データに載せず、`effectivePreset` が `preset.cfg` から付ける(`dramLat` と同じ)。検証は `tools/validate-data.js`。結果パネルに注記(`l3Notes`)。
- 結果(現在のモデル: c 0.405・dramLat 入り): ST は 3 件とも不変(268V +6.85%・258V +4.57%・256V +5.22%)。MT は 268V -6.82 → -7.31%、258V -9.43 → -10.15%、256V -7.34 → -8.08%(-0.49〜-0.74 ポイント。§4.1 の試算 -0.4〜-0.7 と同じ)。
- **試算との違い**: 試算(§3.2)は「ng 30 のまま」だったが、試算の基準は c 0.411・dramLat なしだった。現在は 258V の MT が -9.43% と縁にあり、-10.15% で ng になった(延べ ng 4 → 5)。この ng は次の 6.2(MT クロック)で解消する。
