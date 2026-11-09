# 部品ライブラリのコア面積の調査(2026-11-09)

きっかけ(ユーザー指摘): 「285K の P コアより 388H の E コアが大きいのはおかしい」。
この文書は調査だけを記録する。コード・プリセット・既存の docs は変更していない。

区分の表記は `docs/research/block-areas.md` に合わせる: [公表] メーカー資料 / [実測] このプロジェクトで測った値(今回は無し) / [二次] 第三者の測定や注釈(Locuza、Fritzchens Fritz、Game.Keeps.Loading、Kurnal 由来の表、フォーラムの投稿など) / [推定] この文書で計算した値(式を書く) / 未取得。
「検索要約」は、Web 検索の要約にしか出てこず、原ページを開いて確認できていない値。

---

## 1. 今の仕組みと原因

### 1.1 面積の決め方(`js/model/blocklib.js` の `build`)

コア部品(プリセットのコア種別 1 つにつき 1 個)の `area` は、次の順で決まる。

1. `data/blocklib.js` の `blocklibAreas` に **uarch・chip(null なら全チップ)・nodeId の 3 つがすべて一致**する行があれば `origin:'table'`(L2 なし `mm2` と L2 込み `withL2Mm2`)。
2. 一致しなければ `origin:'estimated'`: **compute ダイの面積 × `CORE_FRACTION` 0.4 ÷ そのチップのコア総数**。P/E の区別はなく、L2 込みかどうかも決まっていない。
3. ダイ面積が無ければ `origin:'unknown'`(null)。

この推定値が原因。次の 3 つのせいで、実際の面積と大きくずれる。

- **P/E を区別しない**: 285K(8P+16E)では P も E も 117.4 × 0.4 ÷ 24 = 1.957 mm²。388H(4P+8E+4LP-E)では P も E も 115.1 × 0.4 ÷ 16 = 2.878 mm²。コア数が多いチップほど 1 個が小さくなるので、「285K の P(1.957)< 388H の E(2.878)」が起きる。
- **compute ダイに何が載っているかを見ない**: Lunar Lake の compute タイル(139.6 mm²)には GPU・NPU・メモリ側キャッシュも載っている。それでも 8 コアで割るので、Lion Cove = Skymont = 6.98 mm² になる(実際の値は約 4.5 / 約 1.7)。i3-12100(4P)の Golden Cove は 16.3 mm²(ただしこの SKU は表の値が使われる。下の 1.3)。
- **表との照合が厳しすぎる**: 表の行は nodeId が完全に一致しないと使われない。Arm の行は `chip` を 1 SKU に固定している。そのため、同じ uarch でも別の SKU は推定に落ちる。例: Zen 4 の行は `tsmc-n5` なので、Phoenix(`tsmc-n4`)の 7840HS は 8.84 mm² になる。Zen+(`gf-12`)は Zen 1 の行(`gf-14`)に当たらない。X4・A720 の行は `mt-9400` 専用なので、8 Gen 3 などは推定になる。

### 1.2 一覧の取り方と件数(node で実行。2026-11-09)

`tests/helpers.js` の `D` は **`data/blocklib.js` を読み込んでいない**(読み込み一覧に無い)。そのため、指示どおり `BL.build(ctx.presets, D.blocklibAreas, ctx.nodes)` を呼ぶと `D.blocklibAreas` が undefined になり、**表に一致するコアも含めて全部が「推定」になる**(コア部品 209 件 = 推定 200・unknown 9・表 0)。
ブラウザ(`index.html` は `data/blocklib.js` を読み込む)と同じ条件にするため、`data/blocklib.js` を先に require してから数え直した(`ctx` は `js/model/evaluate.js` の `makeContext()`)。

| origin | 件数 |
|---|---|
| table(§2.3 の表) | 17(Golden Cove ×4 SKU、Zen 1 ×6、Zen 4 ×2〔7700・7950X〕、8 Elite の Oryon 2 種、9400 の X925・X4・A720) |
| **estimated(根拠のない仮の既定値)** | **183** |
| unknown | 9(5800X・Kraken 350・325・320 の各コア、M5 Max) |

テストの補助ファイル(helpers.js)でブロック面積を検証する場合は、`data/blocklib.js` も読み込む必要がある(テストの直し方の提案。この調査では変えていない)。

### 1.3 「推定」になっているコアの全件(uarch 別。値は今の `area.mm2`。単位 mm²)

| uarch | SKU(コア種別)= 今の値 | compute ダイ / 構成 |
|---|---|---|
| Lion Cove | 285K(P)1.957、275HX(P)1.957、265K(P)2.348、268V・258V・256V(P)6.98 | ARL 117.4 / LNL 139.6 |
| Skymont | 285K・275HX(E)1.957、265K(E)2.348、268V・258V・256V(LP-E)6.98 | 同上 |
| Cougar Cove | 388H・386H・378H・358H(P)2.878 | PTL 115.1(4P+8E+4LP-E) |
| Darkmont | 388H・386H・378H・358H(E・LP-E)2.878 | 同上 |
| Redwood Cove | 185H(P)1.703 | MTL 68.1(6P+8E+2LP-E) |
| Crestmont | 185H(E・LP-E)1.703 | 同上(LP-E は実際は SoC タイル側) |
| Raptor Cove | 13900K・14900K 4.205、14700K・14700HX 5.046、13700K 6.308、13600K・14600K 7.209 | RPL 252.3 |
| Gracemont | 12900K 5.2、12700K 6.933、12600K 8.32、13900K・14900K 4.205、14700K・14700HX 5.046、13700K 6.308、13600K・14600K 7.209 | ADL 208 / RPL 252.3 |
| Golden Cove | (12900K 5.2、12700K 6.933、12600K 8.32、12100 16.3 は推定式の値。実際は表 7.43 が使われる) | — |
| Zen+ | 2700X 10.585、2600X 14.113 | Pinnacle Ridge 211.7 |
| Zen 3 | 5600X 5.38、5950X 4.035、5800U 8.98、7735HS 10.435 | CCD 80.7 / Cezanne 179.6 / Rembrandt-R 208.7 |
| Zen 4 | 7840HS 8.84 | Phoenix 176.8 |
| Zen 5 | 9700X・9950X 3.51、395 3.355、HX 370 7.52 | CCD / Strix Point 225.6 |
| Zen 5c | HX 370(C)7.52 | Strix Point |
| Cortex-X925 | GB10(P)4.158 | GB10 S-die 207.9 |
| Cortex-A725 | GB10(E)4.158 | 同上 |
| Cortex-X4 | 8 Gen 3 6.865、8s Gen 3・7+ Gen 3 4.475、8s Gen 4 5.28、9300(P・M)7.02(9400 の M は表) | 各 SoC |
| Cortex-A720 | 8 Gen 3(M・M2)6.865、8s Gen 3・7+ Gen 3(M)4.475、8s Gen 4(M・M2・E)5.28、9300(E)7.02、7 Gen 4(P・M)3.515(9400 の E は表) | 各 SoC |
| Cortex-X1 / X2 / X3 | 888 5.61・8cx Gen 3 8.559 / 8 Gen 1 6.415・8+ Gen 1 5.14・9000 5.64 / 8 Gen 2 6.045・9200 6.16 | 各 SoC |
| Cortex-A76 / A77 / A78 / A78AE / A78C | 855 3.825・720G 2.775 / 865 4.345 / 888・780G・8200・6 Gen 1・4 Gen 2・8cx Gen 3 2.0〜8.6 / Orin 14.927 / T239 10.35 | 各 SoC |
| Cortex-A710 / A715 / A510 / A520 / A55 | 2.0〜7.0(8 Gen 1〜7 Gen 4、9000・9200 など計 28 件) | 各 SoC |
| C1-Ultra / C1-Premium / C1-Pro | 9500 7.03 | 9500 140.6 |
| C2-Ultra / C2-Pro | 9600 Pro 6.7 | 9600 Pro 134 |
| Neoverse V3AE | Thor 11.491 | Thor 402.2 |
| Oryon Prime / Performance | 8 Elite Gen 5 6.31、8 Elite Extreme Gen 6 6.66(8 Elite は表) | 各 SoC |
| Apple(名前あり) | Firestorm・Icestorm: A14 5.987、M1 6.15、M1 Pro 10.128、M1 Max・Ultra 17.28 / Avalanche・Blizzard: A15 7.34、M2 7.66 / Everest・Sawtooth: A16 7.693 / Everest 2nd gen: A17 Pro 7.6、M3 7.625、M3 Pro 7.307、M3 Max 11.928 / Vortex・Tempest: A12 5.68 / Lightning・Thunder: A13 6.74 | 各 SoC |
| Apple(**uarch が undefined**) | A17 Pro(E)、A18・A18 Pro・A19 Pro・A20 Pro(P・E)、M2 Pro・M2 Max・M2 Ultra・M3・M3 Pro・M3 Max(E)、M4・M4 Pro(P・E)、M5(super・E)。6.2〜16.2 | 各 SoC |

Apple の後半のプリセットは、コア種別に `uarch` が入っていない(ラベルが「undefined コア」になる)。面積の表を uarch 単位にする場合、ここは先に名前を入れる必要がある。

---

## 2. uarch ごとの実測・公表のコア面積

- 「L2 込み」は、私有 L2 はそのまま含め、共有 L2(Intel の E クラスタ、Apple のクラスタ)はクラスタ面積をコア数で割った値。部品をダイに置くときは L2 込みの値を使う(`placeAreaMm2` と `design.addPart`)ので、比べるのは L2 込み。
- 「差」= 提案値 ÷ 今の値 − 1。
- 確度: 高 = 出典の直接の測定値で、別の出典とも合う / 中 = 二次の測定値が 1 つ、または二次どうしで ±5% 程度 / 低 = フォーラムの値・検索要約・数え方があいまい。

### 2.1 Intel

| uarch(チップ・プロセス) | L2 なし | L2 込み(1 個) | クラスタ(4 個+共有 L2) | 区分・出典 | 確度 | 今の値 → 差 |
|---|---|---|---|---|---|---|
| **Lion Cove**(Lunar Lake、N3B、L2 2.5MB) | 3.43(AT フォーラム DavidC1)/ 3.45(同、別投稿)。ほかに 3.05・3.23 の説 | **4.53**(r/hardware の表。Kurnal のダイ写真から。「私有キャッシュはコア面積に含め、共有キャッシュは含めない」と注記)/ 4.45(Game.Keeps.Loading、WCCF-PTL の比較表)/ 4.67(AT フォーラム) | — | [二次] | 中(L2 込みは 3 つの出典が ±3%) | 268V・258V・256V: 6.98 → **−35%** |
| **Lion Cove**(Arrow Lake、N3B、L2 3MB) | Lunar Lake と同じコアなら 3.43 | **未取得**(Arrow Lake での測定は見つからない) | — | — | — | 285K・275HX 1.957、265K 2.348 |
| **Skymont**(Lunar Lake の LP-E、N3B、クラスタ L2 4MB) | 1.09(GKL / WCCF-PTL)/ 1.15(AT フォーラム。「FP ブロックを 2 倍にしなければ 1 mm² 未満」) | **1.73**(r/hardware の表)/ 1.75(AT フォーラム) | **6.79**(GKL / WCCF-PTL。÷4 = 1.70) | [二次] | 中(3 つの値が ±2%) | 6.98 → **−75%** |
| **Skymont**(Arrow Lake の E、N3B、クラスタ L2 4MB) | — | **未取得**(Arrow Lake での測定なし) | — | — | — | 285K・275HX 1.957、265K 2.348 |
| **Cougar Cove**(Panther Lake-H、Intel 18A、L2 3MB) | 未取得 | **4.49**(GKL / WCCF-PTL。「暫定」。写真は 2P+E クラスタ 3 個の別構成) | — | [二次] | 中〜低(出典 1 つ。SemiAnalysis は「Lion Cove とほぼ同じ面積に L2 を約 20% 多く詰めた」と書いている〔検索要約〕) | 388H・386H・378H・358H 2.878 → **+56%** |
| **Darkmont**(Panther Lake-H、Intel 18A、クラスタ L2 4MB) | 0.95(WCCF-PTL の表。本文の箇条書きとは食い違う) | 1.62 [推定] = 6.47 ÷ 4 | **6.47**(GKL / WCCF-PTL の表) | [二次](1 個の値は [推定]) | 中〜低 | E・LP-E 2.878 → **−44%** |
| **Redwood Cove**(Meteor Lake、Intel 4、L2 2MB) | 未取得 | **5.33**(GKL / WCCF-PTL の比較表。AT フォーラムでは「ダイ写真の注釈で 5.33」とも)/ 5.05(reddit。出典なし) | — | [二次] | 中 | 185H(P)1.703 → **+213%** |
| **Crestmont**(Meteor Lake の E、Intel 4、クラスタ L2 2MB) | 1.04(GKL / WCCF-PTL) | 1.48 [推定] = 5.90 ÷ 4 | **5.90**(GKL / WCCF-PTL) | [二次] | 中 | 185H(E)1.703 → **−13%** |
| Crestmont(Meteor Lake の **LP-E**。**SoC タイル、TSMC N6**) | 未取得 | 未取得 | 未取得 | SemiAnalysis・Tom's Hardware の記事に数字なし | — | 185H(LP-E)1.703。そもそも載るダイ(compute 68.1)が違う |
| **Golden Cove**(Alder Lake-S、Intel 7、L2 1.25MB) | 5.37 | 7.43(電源ゲート帯込み)/ 7.02(電源ゲートなし) | — | [二次] Locuza(LZ-ADL)。既存の表の値 | 中〜高(ユーザーの目測とも一致) | 表の値が使われている(変更不要) |
| **Gracemont**(Alder Lake-S、Intel 7、クラスタ L2 2MB) | 1.6〜1.7(Locuza) | 2.17 [推定] = 8.66 ÷ 4 | **8.66**(Locuza) | [二次] | 中 | 12900K 5.2(−58%)、12700K 6.933(−69%)、12600K 8.32(−74%) |
| **Gracemont**(Raptor Lake-S、Intel 7、クラスタ L2 4MB) | 1.588(Fritzchens Fritz、WCCF-RPL) | **2.570**(4MB の 1/4 込み。同) | 10.3 [推定] = 2.570 × 4 | [二次] | 中 | 13900K・14900K 4.205(−39%)、14700K・14700HX 5.046(−49%)、13700K 6.308(−59%)、13600K・14600K 7.209(−64%) |
| **Raptor Cove**(Raptor Lake-S、Intel 7、L2 2MB) | 7.429 は「新しい L2 なし」とあり意味があいまい(block-areas.md の食い違い 3) | **8.080**(Fritzchens Fritz、WCCF-RPL) | — | [二次] | 中 | 13900K・14900K 4.205(+92%)、14700K・14700HX 5.046(+60%)、13700K 6.308(+28%)、13600K・14600K 7.209(+12%) |

補足:
- **1 個のコアとクラスタの比**(L2 込み。測定値だけで計算した [推定]): Skymont/Lion Cove(LNL)= 1.73/4.53 = 0.38、Darkmont/Cougar Cove = 1.62/4.49 = 0.36、Crestmont/Redwood Cove = 1.48/5.33 = 0.28、Gracemont/Golden Cove = 2.17/7.43 = 0.29。インテルの「E コア 4 個 ≈ P コア 1 個」(Architecture Day 2021、検索要約)と、Tom's Hardware(Nemez の注釈)の「Skymont のクラスタは Lion Cove 1 個より少し大きい」に合う。**E は P の約 0.3〜0.4 倍**であり、今の「P = E」は根本的に違う。
- Lion Cove の「L2 込み − L2 なし」= 4.53 − 3.43 = 1.10 mm²(L2 2.5MB、約 0.44 mm²/MB)。
- `data/uarch.js` の Lion Cove の l2KB は 3072(Arrow Lake の値)で、Lunar Lake(2.5MB)にも同じ値が使われている。面積とは別の問題だが記録しておく。
- Panther Lake の LP-E(Darkmont)は compute タイル(18A)上の別クラスタ。Meteor Lake の LP-E(Crestmont)は SoC タイル(N6)上にある。どちらのプリセットも「compute ダイのコア」として数えている。

### 2.2 AMD

| uarch(チップ・プロセス) | L2 なし | L2 込み | 区分・出典 | 確度 | 今の値 → 差 |
|---|---|---|---|---|---|
| Zen 1(Zeppelin・Raven Ridge、GF 14nm) | 約 5.5 | 7 | [公表] AMD ISSCC 2017(既存の表) | 中〜高 | 表の値が使われている |
| **Zen+**(Pinnacle Ridge、GF 12nm) | — | 未取得(個別の測定なし) | Pinnacle Ridge は Zeppelin と同じ 213 mm² で同じ配置(AT-Z2、[二次]) | — | 2700X 10.585、2600X 14.113 |
| **Zen 3**(Vermeer CCD、N7) | 3.24(電源バンク込み)/ 3.09 | **4.05** [推定] = 3.24 + L2 0.81 | [二次] Locuza(LZ-ADL)。L2 は記事内で 0.70〜0.81 の幅 | 中 | 5600X 5.38(−25%)、5950X 4.035(+0.4%) |
| Zen 3(Cezanne、N7) | — | 未取得 | — | — | 5800U 8.98 |
| Zen 3+(Rembrandt-R、N6) | — | 未取得 | — | — | 7735HS 10.435 |
| Zen 4(CCD、N5) | 約 2.73(検索要約) | 3.84 | 既存の表は 's: pub'(「報道」)だが、block-areas.md では「フォーラムの見積もり・検索要約」。**区分が食い違う**(SemiAnalysis の Zen 4c 記事は Zen 4c との比〔L2 込みで −35.4%〕だけで、mm² は表の画像の中) | 低〜中 | 表の値が使われている |
| **Zen 4**(Phoenix、N4) | — | 未取得(Phoenix での測定なし) | — | — | 7840HS 8.84 |
| **Zen 5**(Granite Ridge CCD、N4P) | **3.723** | **4.772** | [二次] Fritzchens Fritz(9600X の CCD 写真の説明欄の寸法。FF-Z5) | 高(寸法が直接書かれている) | 9700X・9950X 3.51(+36%)、395 3.355(+42%) |
| **Zen 5**(Strix Point、N4P) | — | 4.15 | [二次] r/hardware の表(「私有キャッシュ込み」)・AT フォーラム。検索要約 | 低〜中 | HX 370(P)7.52 → −45% |
| **Zen 5c**(Strix Point、N4P) | — | 3.09 | 同上。TechPowerUp の「Zen 5c は Zen 5 より約 25% 小さい」と整合(3.09/4.15 = −26%) | 低〜中 | HX 370(C)7.52 → −59% |

補足: Strix Point の Zen 5(4.15)と CCD の Zen 5(4.772)は 13% 違う。モバイル版は FPU が狭い(AVX-512 を 256 bit 幅で 2 回に分けて実行する)とされ、小さくてもおかしくない。ただし数え方も違う可能性がある。

### 2.3 Arm・Qualcomm・NVIDIA

| uarch | 値(L2 込み) | 区分・出典 | 今の値 |
|---|---|---|---|
| Cortex-X925 / X4 / A720(9400、N3E) | 3.335 / 1.687 / 0.976 | 既存の表([二次] Real World Tech 掲示板、Baidu Tieba の注釈) | 9400 だけに使われる |
| Oryon Prime / Performance(8 Elite、N3E) | 5.22 / 1.9 | 既存の表([二次]) | 8 Elite だけに使われる |
| Snapdragon X Elite の Oryon(N4P) | クラスタ 16.1(4 コア + L2 12MB)、1 個 2.55(検索要約) | [二次] WCCF-X(block-areas.md 3 章) | プリセットなし |
| Snapdragon 8 Gen 3 | CPU 全体 21.8 mm²(SoC 137 mm²)。1 コア単位は未取得 | [二次] AT フォーラム(Kurnal のダイ写真)、検索要約 | 6.865(×8 = 54.9 で CPU 全体の 2.5 倍) |
| X1・X2・X3・A76・A77・A78 系・A710・A715・A510・A520・A55・A725・C1 系・C2 系・Neoverse V3AE・Oryon(Gen 5/Gen 6) | **未取得** | 1 コアの mm² を載せた出典は見つからない(Arm は公表していない) | — |

注意: A510 は 2 コアで FP/SIMD と L2 を共有する「マージドコア」なので、「1 コアの面積」をどう数えるかを先に決める必要がある。

### 2.4 Apple

| uarch | 値 | 区分・出典 | 確度 |
|---|---|---|---|
| Firestorm(M1、N5) | 1 個 2.25、P クラスタ 15.42(4 コア + L2 12MB 込み → 1 個あたり 3.86 [推定]) | 検索要約(転載サイト。block-areas.md 3 章) | 低 |
| Icestorm(M1) | 0.6 | 同上 | 低 |
| Avalanche(M2、N5P) | 「P コア群に 5.2 mm²」(何個分・何を含むかは書かれていない)。コアは M1 より 21%、A15 より 7% 大きい | [二次] SemiAnalysis「Apple M2 Die Shot and Architecture Analysis」 | 低(絶対値として使えない) |
| M4 の P コア(N3E) | 3.00(1 個か合計かが記事から分からない)/ AT フォーラム「M4-P 3 mm²」(L2 を含むかで投稿者どうしが食い違う) | [二次] WCCF-X、AT フォーラム | 低 |
| Blizzard・Everest・Sawtooth・Everest 2nd gen・A17〜A20・M3・M5 の P/E | **未取得** | — | — |

---

## 3. 提案する値(実装時の候補)

区分は 3 つ。**実測/二次の値** = 2 章の値そのもの。**流用** = 同じ uarch・同じプロセスの別の SKU の値。**推定(根拠: …)** = 比や差分から計算した値で、推定と明記する。

| uarch・SKU | 提案(L2 込み) | 区分 |
|---|---|---|
| Lion Cove(268V・258V・256V) | 4.53(L2 なし 3.43) | 二次 |
| Lion Cove(285K・265K・275HX) | 4.75 | **推定**(根拠: Lunar Lake の 4.53 + L2 の増分 0.5MB × 0.44 mm²/MB。コアの論理部分は同じで L2 だけ 2.5→3MB と仮定) |
| Skymont(LNL の LP-E) | 1.73(クラスタ 6.79) | 二次 |
| Skymont(ARL の E) | 1.73 | **流用**(根拠: 同じ N3B、クラスタの L2 も同じ 4MB。Arrow Lake ではリング接続などクラスタ周りが違うので ±10% の誤差を見込む) |
| Cougar Cove(388H ほか 4 SKU) | 4.49 | 二次(暫定値) |
| Darkmont(E・LP-E) | 1.62(クラスタ 6.47) | 二次(1 個はクラスタ ÷ 4)。LP-E は**流用**(根拠: 同じ 18A のタイル上。LP-E クラスタの L2 容量は未確認) |
| Redwood Cove(185H) | 5.33 | 二次 |
| Crestmont(185H の E) | 1.48(クラスタ 5.90) | 二次 |
| Crestmont(185H の LP-E、N6) | 未取得。どうしても埋めるなら 1.48 × 密度比(Intel 4 → N6。`compat.portArea`) | **推定**(根拠: 移植式。LP-E クラスタは 2 コアで L2 構成も違うので確度は低い) |
| Gracemont(ADL) | 2.17 / (RPL)2.570 | 二次(ADL はクラスタ ÷ 4) |
| Raptor Cove | 8.080 | 二次 |
| Zen+ | 7(Zen 1 の値) | **流用**(根拠: Pinnacle Ridge は Zeppelin と同じ配置・同じダイ面積) |
| Zen 3(5600X・5950X・5800U) | 4.05 | 二次 + 推定(L2 を足した)。5800U(Cezanne、同じ N7)は**流用** |
| Zen 3+(7735HS、N6) | 4.05 × 密度比(N7→N6) | **推定**(根拠: 移植式) |
| Zen 4(7840HS) | 3.84 | **流用**(根拠: N4 は N5 の派生。ただし 3.84 自体の確度が低い) |
| Zen 5(CCD) | 4.772(L2 なし 3.723) | 二次 |
| Zen 5 / Zen 5c(HX 370) | 4.15 / 3.09 | 二次(低) |
| X925(GB10) | 3.335 | **流用**(根拠: 9400 と同じ N3E、L2 2MB) |
| X4・A720(8 Gen 3・8s Gen 3・7+ Gen 3・8s Gen 4・9300・7 Gen 4、N4P) | 9400 の値 × 密度比(N3E→N4P) | **推定**(根拠: 移植式。L2 容量が SKU で違えば補正が要る) |
| 上記以外の Arm・Apple | 未取得 | 推測で埋めない。どうしても置けるようにするなら、同じダイの P との比(下の 4.2 の案 C)を「推定」と明記して使う |

---

## 4. 影響と直し方

### 4.1 ブロック面積を使っているところ

| 場所 | 使い方 | 影響 |
|---|---|---|
| `js/model/design.js` `addPart`(混合設計 D) | コアは `withL2Mm2`、無ければ `mm2` の面積で正方形のブロックを置く。ノードが違えば `compat.portArea` で換算する | 置くブロックの大きさがそのまま変わる。E が P と同じ大きさで置かれ、ARL の P は小さすぎる |
| `js/model/compat.js`(使用率・警告) | ダイ上のブロック面積を合計して使用率を出す。`areaOrigin==='estimated'` のブロックがあると警告する | 使用率と「入らない」の判定が変わる |
| `design.fitDieToBlocks` → ダイ面積 → `evaluate`(歩留まり・ウェハあたりのダイ数) | ブロックの外接矩形でダイ寸法を決める | 混合設計のダイ面積・歩留まりが変わる |
| `js/model/coredef.js`(自作コア・複製) | 基準コアの `noL2Mm2` と `withL2Mm2` が両方そろわないと面積を導けない | 推定の部品(L2 なし・L2 込みの区別が無い)は基準にできない。表の行が増えると、使える基準も増える |
| `js/ui/mixform.js`・`coreeditor.js`・`library` | 面積の表示と区分のバッジ | 表示だけ |
| **プリセットのフロアプラン**(`design.fromPreset` → `floorplan.js` の写真テンプレート / `layoutCompute`) | 写真の座標か格子の割り付けで決まり、blocklib の面積は**使わない** | 影響なし(プリセットの評価・ダイ面積・歩留まりは変わらない) |

`L3_FRACTION`(0.15)も同じ種類の仮の値。測定値は 1MB あたり 0.49 mm²(Zen 5)、約 0.66(RPL)、約 1.0(ADL、リング込み)で、チップによって 2 倍違う。

### 4.2 直し方の案

**A. `data/blocklib.js` を uarch 単位の面積表にする(本命)**
- 行を `{ uarch, nodeId, variant(例: 'l2-3MB'), noL2Mm2, withL2Mm2, l2KB, cluster: { cores, mm2, l2KB } | null, s, basis, note, src }` にする。`chip` は「その SKU 固有の値」のときだけ使う。
- 3 章の表の [二次] の値を入れる。流用・推定の値は `s: 'est'` と `basis`(例: 「LNL 4.53 + L2 0.5MB × 0.44」)を付けて区別する。
- 設計書 §2.3 の表にも同じ行を追記する(`data/blocklib.js` の冒頭に「設計書 §2.3 を転記」とあるため)。Zen 4 の 3.84 の区分(pub か、フォーラムの値か)はこのとき決め直す。

**B. `js/model/blocklib.js` の `findTable` を段階的にする**
1. uarch + chip が一致
2. uarch + nodeId が一致(chip は問わない)
3. uarch が一致してノードが違う → `compat.portArea` で換算し、`origin: 'ported'`(または 'estimated')と換算の根拠を note に書く
4. 表に無い → 案 C か 'unknown'

そのうえで `origin` に `'table' | 'ported' | 'estimated' | 'unknown'` を持たせる。`evaluate.js` の 310 行目の class の振り分けと `mixform.areaClassLabel` に 'ported' を足す。

**C. 最後の手段として推定式を残すなら、P/E を区別する**
- 今の「ダイ × 0.4 ÷ 全コア数」はやめる。そのチップに表の値があるコア種別があれば、それとの比で決める(E ≈ P × 0.3〜0.4。2.1 の補足の測定値の比)。
- 比も使えない場合は `unknown` にする(推測で埋めない方針に合わせる)。
- どうしても推定式を残すなら、種別ごとに重みを付ける: 面積 = ダイ × CORE_FRACTION × w_type ÷ Σ(count × w)。w は P = 1、E/LP-E = 0.35(2.1 の測定値の比の中央付近)、M(Arm の中コア)= 未定。ダイの種類(GPU・NPU を同じダイに載せる SoC か、CPU だけの compute タイルか)で CORE_FRACTION を変えないと、LNL の 6.98 のような外れは直らない。

**D. 付随する直し**
- `data/presets/*`: Apple の後半のプリセット(A17 Pro の E、A18〜A20、M2 Pro〜M5)のコア種別に `uarch` を入れる。今は undefined なので、uarch 単位の表に当たらない。
- `tests/helpers.js`: 読み込み一覧に `data/blocklib.js` を足す。足さないと、node のテストで `D.blocklibAreas` が undefined になる。
- テストの案: (1) 同じ uarch・同じ nodeId の部品は SKU が違っても面積が等しい。(2) 同じチップの中で E の L2 込み面積 < P の L2 込み面積。(3) `origin:'estimated'` の件数が増えていない。
- Meteor Lake の LP-E(SoC タイル・N6)は compute ダイの部品として作られている。部品の nodeId を「そのコアが実際に載るダイ」にするかどうかは別に決める。

---

## 5. 出典

- WCCF-PTL(Game.Keeps.Loading の測定。Lion Cove 4.45・Skymont 1.09/6.79・Redwood Cove 5.33・Crestmont 1.04/5.90・Cougar Cove 4.49・Darkmont 0.95/6.47): https://wccftech.com/intel-panther-lake-compute-tile-die-shot-18a-next-gen-cougar-cove-p-darkmont-e-cores/ (2026-11-09 に WebFetch で再確認。L2 を含むかは記事に書かれていない)
- AnandTech フォーラム(DavidC1: Skymont 1.15/1.75、Lion Cove 3.43/4.67): https://forums.anandtech.com/threads/intel-meteor-arrow-lunar-panther-lakes-wcl-discussion-threads.2606448/post-41309560 (2026-11-09 取得)
- AnandTech フォーラム(DavidC1: Skymont 1.15、Lion Cove 3.45): https://forums.anandtech.com/threads/intel-meteor-arrow-lunar-panther-lakes-wcl-discussion-threads.2606448/post-41318999 (2026-11-09 取得)
- AnandTech フォーラム(Redwood Cove 5.33 / 5.05、Zen 5 4.15、Skymont 1.73): https://forums.anandtech.com/threads/intel-meteor-arrow-lunar-panther-lakes-wcl-discussion-threads.2606448/post-41316292 (2026-11-09 取得)
- AnandTech フォーラム(M4-P 3 mm²、Lion Cove 4.5、Zen 5 4.15、Zen 5c 1.9〔3nm、L2 なし〕): https://forums.anandtech.com/threads/intel-meteor-arrow-lunar-panther-lakes-wcl-discussion-threads.2606448/post-41328753 (2026-11-09 取得)
- r/hardware「Lunar Lake die shot」(Lion Cove 4.53・Skymont 1.73〔L2 込み〕、Strix Zen 5 4.15・Zen 5c 3.09): https://www.reddit.com/r/hardware/comments/1fuuucj/lunar_lake_die_shot/ — **原ページは取得できなかった**(ミラーは 404、reddit は Chrome の安全制限で開けない)。検索要約のみ
- Tom's Hardware(Nemez の注釈。Skymont のクラスタは Lion Cove 1 個より少し大きい。mm² の記載なし): https://www.tomshardware.com/pc-components/cpus/intel-lunar-lake-cpu-gets-die-annotation-four-skymont-e-cores-slightly-bigger-than-one-lion-cove-p-core (Chrome で本文を確認)
- HotHardware(Kurnal の Panther Lake-H 注釈。Cougar Cove 4・Darkmont 8・LP-E 4。mm² の記載なし): https://hothardware.com/news/intel-ptl-h-die-shots (Chrome で本文を確認)
- Wccftech(ASUS の 285K のダイ写真。mm² の記載なし): https://wccftech.com/intel-core-ultra-9-285k-cpu-detailed-die-shots-3nm-arrow-lake-compared-10nm-raptor-lake/
- Kurnal Insights のダイ一覧(タイル面積のみ。1 コアの値なし。MTL の SoC タイル 96.8 mm² など): https://kurnal-insights.com/dieshot/
- SemiAnalysis「Zen 4c」(比のみ): https://newsletter.semianalysis.com/p/zen-4c-amds-response-to-hyperscale
- SemiAnalysis「Apple M2 Die Shot」(P コア群に 5.2 mm²、比のみ): https://newsletter.semianalysis.com/p/apple-m2-die-shot-and-architecture
- 既存の調査(Locuza・Fritzchens Fritz・AMD 資料など): `docs/research/block-areas.md`
- 取得できなかったもの: TechPowerUp(Lunar Lake 注釈の記事・フォーラム。403)、Guru3D(403)、reddit(上記)、Chiphell(567)。Arrow Lake の Lion Cove・Skymont の 1 コア面積は、どの出典にも無かった。
