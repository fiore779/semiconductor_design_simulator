# SoC(Qualcomm・MediaTek・Apple・NVIDIA)の公式資料との照合(2026-11-07)

ユーザー指示(2026-11-06)「全体のデータを公式のデータにしてください」。Intel・AMD は bc71e98 で反映済み。今回は Qualcomm → MediaTek → Apple → NVIDIA の順。
公式資料は Chrome の通常閲覧で取得([公表]、原ページ確認済み、2026-11-07)。推測しない。公式に項目がないものは元の区分のまま、未取得は未取得のまま。

この文書は Qualcomm → MediaTek → Apple → NVIDIA の順の全段階を含む(完了)。§5 に全体の評価前後差の表。

## 1. Qualcomm

出典: https://www.qualcomm.com/smartphones/products/ 配下の各製品ページと、各ページの製品概要 PDF(product brief)。
8cx Gen 3 は https://www.qualcomm.com/laptops/products/snapdragon-8cx-gen-3-compute-platform 。

### 1.1 クロックの訂正(公式値へ)

| チップ | 項目 | 旧 | 新 | 備考 |
|---|---|---|---|---|
| 8 Elite Gen 5 | E(Oryon Performance) | 3.63 | 3.62 | 公式 Performance 最大 3.62 |
| 7 Gen 4 | E(A520) | 1.84 | 1.8 | |
| 8s Gen 4 | P(X4) | 3.21 | 3.2 | |
| 4 Gen 2 | P(A78) | 2.2 | 2.3 | 公式の仕様表 Rev C |
| 4 Gen 2 | E(A55) | 1.95 | 2.0 | 同上 |
| 8 Gen 3 | E(A520) | 2.27 | 2.3 | 公式 Efficiency 最大 2.3 |

### 1.2 一致したクロック(変更なし)

855・865・888・8 Gen 1・8+ Gen 1・8 Gen 2(P 3.19 は SM8550-AB 版の値)・8 Elite(P 4.32 は公式の別版の値。最大 4.47 の版もある)・7+ Gen 3・7 Gen 3・7 Gen 1・780G・720G・6 Gen 1・8cx Gen 3・8 Elite Extreme Gen 6(5.0 / 4.0)。
8 Gen 3 の P 3.3 は公式の 3.3GHz 版として一致。中間クラスタの 3.15 / 2.96 の分け方は公式になく [二次] のまま。

### 1.3 食い違い・版違い(値は変えず notes に記録)

- **8 Elite Gen 5 の P 4.61**: 公式の 4.6 版(SM8850-5-AC)にも 4.74 版にも合わない。GB7 の機種がどちらの版か不明なので変えない。
- **4 Gen 2**: 公式の仕様表(Rev C)は 2.3 / 2.0。製品ページの本文は「最大 2.2GHz」と書き、公式内で食い違う。仕様表を採用。
- **6 Gen 1 のメモリ**: 製品概要 PDF は LPDDR5-5500、製品ページは 3200MHz(I/O クロック換算で 6400)と食い違う。5500 のまま。
- **8cx Gen 3**: 公式ページの「Cache Capacity 18 GB」は単位が誤り(MB の誤記とみられるが推測せず)で不採用。
- **780G のメモリ表記**: 設計書 §2.7.4 の表(780G / 778G)は「LPDDR4X / LPDDR5」、プリセットは「LPDDR4-4266 相当(公式は LPDDR4、2.1GHz)」で食い違う。公式 brief の原文表記は LPDDR4(4x と書いていない)。調査担当の報告に基づく。原ページの再確認は未了(値は変えない)。

### 1.4 メモリ(公式の MT/s 換算は I/O クロック×2。「ch」表記は入れない)

新規に cfg.memory へ入れたもの([公表]):

| チップ | cfg.memory |
|---|---|
| 8 Elite / 8 Elite Gen 5 | LPDDR5X-10667, 最大 24GB |
| 8s Gen 3 / 7+ Gen 3 | LPDDR5X-8400, 最大 24GB |
| 8s Gen 4 | LPDDR5X-9600, 最大 24GB |
| 7 Gen 3 | LPDDR5-6400 / LPDDR4X-4266, 最大 16GB |
| 7 Gen 4 | LPDDR5X-8400 / LPDDR5-6400 / LPDDR4-4200, 最大 16GB |
| 780G | LPDDR4-4266 相当(公式は LPDDR4、2.1GHz), 最大 16GB(上の §1.3 の両論併記を参照) |
| 8 Elite Extreme Gen 6 | LPDDR5X / LPDDR6, 5300MHz, 最大 24GB |

既存の文字列(855 64bit〔4×16bit〕・865・8 Gen 1・8+ Gen 1・8 Gen 2・8 Gen 3・7 Gen 1・720G〔32bit・最大 8GB〕・6 Gen 1・8cx Gen 3〔128bit〕)の種別・速度・バス幅は [二次] から [公表] に。888 は LPDDR5 のみ公式(製品概要に LPDDR4X-4266 の記載なし)で、LPDDR4X は [二次]。帯域(GB/s)は公式に記載なく [二次]/換算のまま。4 Gen 2 のメモリは今回の公式値の指示に含まれず未取得のまま。

### 1.5 プロセス(すべて [公表]。ファウンドリ名は非公表)

- 4nm: 8 Gen 1・8+ Gen 1・8 Gen 2・8 Gen 3・8s Gen 3・8s Gen 4・7+ Gen 3・7 Gen 3・7 Gen 4・7 Gen 1・6 Gen 1・4 Gen 2
- 3nm: 8 Elite・8 Elite Gen 5 / 2nm: 8 Elite Extreme Gen 6
- 5nm: 888・780G / 5LPE: 8cx Gen 3 / 7nm: 855・865 / 8nm: 720G
- 7 Gen 3 は公式が「4nm」だけで N4P とは書かない(N4P は [二次])。プリセットの nodeId は変えない。

### 1.6 キャッシュ

- 8 Elite Extreme Gen 6 の L2 16MB(Oryon Flex Cache)は [公表]。SLC 8MB は [二次]。
- **Qualcomm の L3/SLC の容量は公式資料のどれにも載っていない**。そのため notes の食い違い(8 Gen 3 の 12MB 対 8MB、888 の 4 対 3MB、8s Gen 3 の 8 対 12MB)はそのまま([二次]・未取得)。
- スマホ SoC の l3MB は設計方針(§5.3.0)で未定義のまま、入れない。

### 1.7 評価への影響(Qualcomm の段階の値。最終値は §5)

全 102 件の fromPreset + evaluate を変更前後でダンプして比較。この段階で変わったのは 3 件のみ。**判定(ok / ng / gray / na)の反転はなし**。
**以下は Qualcomm 段階の値。9400 の校正変更を含む最終値は §5 の表(8 Elite Gen 5 の MT 10942.8、4 Gen 2 の ST 766.7・MT 1816.3 など)。**

| プリセット | 項目 | 前 | 後(Qualcomm 段階) | 原因 |
|---|---|---|---|---|
| qc-8elite-gen5 | MT | 10960.5(+42.31%、ng) | 10940.4(+42.05%、ng) | E 3.63→3.62 |
| qc-8s-gen4 | ST | 1332.5(+9.31%、ok) | 1329.0(+9.03%、ok) | P 3.21→3.2 |
| qc-4gen2 | ST | 738.1(-4.26%、ok) | 766.5(-0.58%、ok) | P 2.2→2.3 |
| qc-4gen2 | MT | 1756.3(-5.32%、gray) | 1815.8(-2.11%、gray) | E 1.95→2.0 |

- 8 Gen 3 の E 2.27→2.3 と 7 Gen 4 の E 1.84→1.8 は、8 Gen 3 は MT が出ず(null)ST は P コアで決まる、7 Gen 4 は ST/MT とも出ない(null)ため、評価は不変。
- (Qualcomm の段階だけの時点では)校正(ctx.cal)は完全に不変。9400 の訂正後の最終の差は §5 を参照。MT 帯係数・ほかの 99 件の評価も不変。メモリ文字列の追加は評価(memory 係数)に影響しない(data/memory.js に SoC の id がないため)。
- 固定値の更新(Qualcomm 段階): `tests/fixtures/memory-baseline.json`(3 件)、`tests/mix.test.js` の BASE(8 Elite Gen 5 の MT、8s Gen 4 の ST)と BASE_M5B(4 Gen 2 の ST/MT)、`tests/floorplan-scale.test.js` の評価ハッシュ(notes 文面を含むため)。

### 1.8 取得できなかったもの

- Qualcomm の L3/SLC の容量(公式資料に記載なし)。
- メモリのバス幅・帯域(新規に入れた 8 Elite 系・8s 系・7 系・780G・Extreme Gen 6 は公式に記載なし)。
- ファウンドリ名(非公表)。

## 2. MediaTek

- notes に個別 URL(https://www.mediatek.com/products/smartphones/mediatek-dimensity-<型番>。9500 のクロックは https://www.mediatek.com/dimensity-9500 、9600 Pro のクロックはプレスリリース)、プロセス・メモリ・L2/L3/SLC・クロックの [公表] を反映済み(「個別 URL 未記録」の記述は更新)。cfg の値は変更なし。
- **9400 の P(X925)3.63→3.62 を反映(ユーザー承認「公式優先」)**。9400 は Arm の校正の代表のため、校正が自動で変わった(Cortex-X925 の u 90.4787→90.6919、uIsa.arm 113.7276→113.7611)。σ・γ・x86 の u・uCal・MT 帯係数は不変。X925 を使う GB10 の ST/MT と、ISA 平均 u を使う ARM 全般の ST/MT が最大約 0.2%(GB10 の ST +0.24%)動いた。判定の反転は 0 件。経緯: いったん校正が変わることを理由に止めて報告し、承認を得て反映した。
- 公式にない項目: X4・A720 のクロック(9400)、「X4×3 が 2.85」の分け方(9300)、9200 の L3/SLC(公式ページに記載なし、[二次] NBC のまま)。

## 3. Apple

出典: Apple Support の仕様ページ(https://support.apple.com/en-us/<ID>)と Newsroom。**値(cfg・dies)は変えず、notes に [公表] を追記**。

- **Apple が公表しない項目(公式に項目なし。元の区分のまま)**: クロック、キャッシュ容量(L2・SLC)、TDP、ダイ面積、メモリの種類(LPDDR)、バス幅。帯域の一部(Support にある M1 Pro 以降の帯域は元から [公表])。
- **[公表] に上げた項目**: コア数(A12・A15〜A19 Pro は 2P+4E、A20 Pro は super 2 + 高効率 4、M1 4P+4E、M1 Pro/Max 8P+2E、M1 Ultra 16P+4E、M2 4P+4E、M2 Pro/Max 8P+4E、M2 Ultra 16P+8E、M3 4P+4E、M3 Pro 6P+6E、M3 Max 12P+4E、M4 4P+6E、M4 Pro 10P+4E、M5 4 super+6E、M5 Max 6 super+12 performance)、トランジスタ数(A14 118 億、M1 160 億、M1 Pro 337 億、M1 Max 570 億、M1 Ultra 1,140 億、M2 200 億、M2 Pro 400 億、M2 Max 670 億、M2 Ultra 1,340 億、M3 250 億、M3 Pro 370 億、M3 Max 920 億、M4 280 億)、プロセス世代(A12 7nm、A14・A15・M1 系 5nm、M2 系 第 2 世代 5nm、A17 Pro・M3 系 3nm、A18・A18 Pro・M4 系 第 2 世代 3nm、M5・M5 Max 第 3 世代 3nm、A20 Pro 2nm。TSMC N3B/N3E などの具体名は [二次])、最大メモリ容量(M1 16GB、M1 Pro 32GB、M1 Max 64GB、M1 Ultra 128GB、M2 24GB、M2 Pro 32GB、M2 Max 96GB、M2 Ultra 192GB、M3 24GB、M3 Pro 36GB、M3 Max 128GB、M4 32GB、M4 Pro 64GB、M5 32GB、M5 Max 128GB)。
- **公式未取得(Support ページ・Newsroom の今回の照合範囲では記載なし)**: A13 のコア数、A14 のコア内訳、A16・A19 Pro のプロセス世代、M4 Pro・M5 系・A17 Pro・A19 Pro のトランジスタ数、GPU コア数・Neural Engine の値(プリセットに項目がなく、今回は新規に入れていない)。
- **M1 の帯域 68.25GB/s**: 「Support 仕様ページ(111883)に帯域の項目なし」と注記を書き換えた(値は不変)。
- **A20 Pro**: 「super 2 + E 4」と注記(数は一致)。
- **M5 Max**: 公式は「2 つの第 3 世代 3nm ダイを Fusion Architecture でつないだ構成」。ダイ面積が未取得のため dies は空のまま(面積・電力の評価に影響する変更は入れていない)。
- 記録されていない Newsroom の記事 URL は「Newsroom(URL 未記録)」と書いた。評価の数値は不変。

## 4. NVIDIA

- **Jetson AGX Orin**(https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ と開発者ガイド r36.4): 12 コア Cortex-A78AE、L2 3MB + L3 6MB、最大 2.2GHz、64GB・256bit LPDDR5・204.8GB/s、15〜60W は一致([公表])。**モード別**: MaxN は 12 コア 2201.6MHz、15W は 4 コア 1113.6MHz、30W(既定)は 8 コア 1728MHz、50W は 12 コア 1497.6MHz。プリセットの 12 コア・2.2GHz は MaxN の値で、Geekbench の測定モードは不明のため**値は変えず notes に記録**。プロセス(Samsung 8nm)は公式ページになく [二次]/未取得。
- **Jetson AGX Thor**(製品ページ・開発者ガイド r38.4): 14 コア Neoverse-V3AE、L2 1MB/コア、共有 L3 16MB、2.6GHz、128GB・256bit LPDDR5X・273GB/s、40〜130W、既定 120W(14 コア 2601MHz)はすべて一致。T4000(12 コア・40〜70W)は別 SKU。プロセスは公式ページになく [二次]/未取得。
- **Switch 2 の T239**(https://www.nintendo.com/jp/hardware/switch2/specs/index.html): 消費電力は TV モードのゲームプレイ時 約 19W・メニュー表示時 約 8W・スリープ 約 0.5W / 5W。CPU/GPU は「NVIDIA 社製カスタムプロセッサー」とだけで、CPU 構成・クロック・キャッシュ・メモリ・プロセスは公式に非公表。power.base の note から、ページに書かれていない条件(ゲーム名・Full HD / 4K の平均)を外した。
- **GB10(DGX Spark)**(製品ページ・hardware.html・ホワイトペーパー WP-12718-001_v02 2026-04-02): CPU 20 コア(X925×10 最大 4GHz + A725×10 最大 2.8GHz)、128GB LPDDR5X・256bit・273GB/s(8533Mbps、16 チャネル)、TDP 140W(CPU と GPU を含む。電源 240W は別)、S-die と G-die は TSMC 3nm、L3 は Cluster0 16MiB・Cluster1 8MiB、GPU は 48 SM・2.4GHz・L2 24MiB が [公表]。G-die の N3E は [二次]/推定。SLC 16MB は公式資料のどこにもない。
  - **L2 の表記の違い**: ホワイトペーパー Table 3 は p コア「2 MiB per cluster」・e コア「512 KiB per cluster」で、プリセットの notes の「コア当たり [二次]」と表記が違う。notes に併記。cfg に L2 の数値は無い。ただし data/uarch.js の Cortex-X925 は l2KB 2048(コア当たり。Dimensity 9400 でも使う)を持つ。**影響の測定**(値は変えず、一時スクリプトで X925 の l2KB だけ差し替えて GB10 を評価): 2048 → ST 2137.5 / MT 17890.6、1024 → 2133.9 / 17912.7、410(2048 を 5 コアで割った場合)→ 2127.2 / 17955.1。ST -0.5% 以内・MT +0.4% 以内で、判定(ng / ng)は変わらない。A725 は uarch.js に l2KB がなく測れない。

## 5. 全体の評価前後差(全 102 件の fromPreset + evaluate、2026-11-07)

- 数値が変わったのは 24 件。**判定(ok / ng / gray / na)の反転は 0 件**。
- 校正: `u['Cortex-X925']` 90.4787→90.6919、`uIsa.arm` 113.7276→113.7611 のみ(9400 の P を公式 3.62 にしたため)。ほかの u・σ・γ・MT 帯係数(0.69 / 0.76)は不変。
- Apple の変更は notes のみ、NVIDIA は notes と power / area の note 文面のみで、数値は不変。

| プリセット | ST 前 → 後(誤差) | MT 前 → 後(誤差) |
|---|---|---|
| qc-855 | 682.5(-18.36%)→ 682.7(-18.33%) | 2177.7(-18.68%)→ 2178.4(-18.66%) |
| qc-865 | 871.9(-13.50%)→ 872.1(-13.48%) | 2660.8(-16.30%)→ 2661.6(-16.27%) |
| qc-888 | 1143.1(8.97%)→ 1143.4(9.00%) | 2930.5(-9.38%)→ 2931.4(-9.36%) |
| qc-8gen1 | 1069.0(0.00%)→ 同 | 3189.9(-1.45%)→ 3190.6(-1.43%) |
| qc-8plus-gen1 | 1128.9 → 同 | 3470.7(-10.87%)→ 3471.5(-10.85%) |
| qc-8gen2 | 1426.0 → 同 | 4473.8(-1.22%)→ 4474.9(-1.20%) |
| qc-8elite | 1866.0 → 同 | 10607.2(36.67%)→ 10609.6(36.70%) |
| qc-8elite-gen5 | 1970.9 → 同 | 10960.5(42.31%)→ 10942.8(42.08%) |
| qc-8s-gen4 | 1332.5(9.31%)→ 1329.0(9.03%) | 計算不能のまま |
| qc-780g | 794.5(-5.53%)→ 794.7(-5.50%) | 2576.2(-1.79%)→ 2576.9(-1.76%) |
| qc-7gen3 | 1061.7(7.24%)→ 1062.0(7.27%) | 3190.2(3.04%)→ 3191.1(3.07%) |
| qc-7gen1 | 930.7(5.41%)→ 931.0(5.44%) | 2976.0(7.05%)→ 2976.9(7.08%) |
| qc-720g | 571.5(-16.09%)→ 571.6(-16.06%) | 1466.7(-20.24%)→ 1467.1(-20.22%) |
| qc-8elite-x-gen6 | 2108.6 → 同 | 11896.0(21.26%)→ 11898.6(21.29%) |
| qc-6gen1 | 738.1(-9.32%)→ 738.4(-9.29%) | 2510.8(-11.62%)→ 2511.5(-11.60%) |
| qc-4gen2 | 738.1(-4.26%)→ 766.7(-0.55%) | 1756.3(-5.32%)→ 1816.3(-2.09%) |
| qc-8cx-gen3 | 1196.4(-9.02%)→ 1196.7(-8.99%) | 5591.3(-16.82%)→ 5592.9(-16.80%) |
| mt-9000 | 1084.1 → 同 | 3463.5(-9.66%)→ 3464.3(-9.64%) |
| mt-9200 | 1372.8 → 同 | 3772.7(-6.89%)→ 3773.5(-6.87%) |
| mt-9400 | 1741.0(0.00%、代表)→ 同 | 計算不能のまま |
| mt-8200 | 980.4(3.09%)→ 980.7(3.12%) | 3208.4(-2.18%)→ 3209.3(-2.16%) |
| nv-orin-agx | 787.7(-0.29%)→ 788.0(-0.26%) | 5925.3(-13.93%)→ 5927.0(-13.90%) |
| nv-t239 | 408.4 → 408.5(公開値なし) | 2477.8 → 2478.5(公開値なし) |
| nv-gb10 | 2132.5(-18.73%)→ 2137.5(-18.54%) | 17860.9(-13.28%)→ 17890.6(-13.13%) |

固定値の更新: `tests/mix.test.js` の BASE(15 件。8s Gen 4 を含む)・BASE_M5B(8 件)、`tests/fixtures/memory-baseline.json`(24 件。mt-9400 の丸め差を含む)、`tests/floorplan-gb10.test.js`(GB10 の誤差)、`tests/floorplan-scale.test.js` の評価ハッシュ。閾値は動かしていない。

## 6. 未反映の提案

- Orin の測定モード(GB7 の機種・電力モードの特定)。特定できたら cfg のコア数・クロックをモードに合わせるか検討。
- 8 Elite Gen 5 の P 4.61 がどの版(4.6 / 4.74)か。
- 780G のメモリ表記(brief の原ページ再確認)。
- Apple の GPU コア数・Neural Engine をプリセットの項目にするか。
- MT 帯の標本の中央値・LOO は再計算していない(係数は据え置き)。
