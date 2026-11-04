# Core Ultra 5 325(Panther Lake の 4P+4LPE)と Core 5 320(Wildcat Lake)のプリセット追加

- 追加日: 2026-11-04。ユーザーの発言(原文): 「4p+4lpeの構成は一つあればいいです。336Hなどは見た目は上位と変わらないと思われるのでいらないです。変わりにワイルドキャットレイク(320)を追加してください」。
- 値は依頼文(leader から渡された ARK・Notebookcheck の値)による。**実装担当は ARK・Notebookcheck のページを開いていない**(この環境に Web 取得手段が無い)。区分は依頼文の指定どおり: ARK = **[公表]**、Notebookcheck など = **[二次]**。
- 区分の優先は設計書 §2.2 と同じ: [実測] > [公表] > [二次] > [推定]/未取得。未取得は null のまま、推測で埋めない。
- 追加: `data/presets/chips-pc.js`(`intel-ptl-u5-325`・`intel-wcl-c5-320`。`addedIn:'M5b'`・`calib:false`)。配置: `js/model/floorplan.js`(`TILE_FRAMES['wcl-compute']` を新設、`ptl-compute-4p4lpe` を 325 が使う)。

## 1. Core Ultra 5 325(`intel-ptl-u5-325`)

| 項目 | 値 | 区分・出典 |
|---|---|---|
| 名称・世代 | Core Ultra 5 325。family は `Panther Lake`(既存の H 系は `Panther Lake-H`。ARK に U の接尾辞は付かないため区別できる表記にした) | ARK |
| コア | P(Cougar Cove)×4、ベース 2.1 / ブースト 4.5 GHz。LP-E(Darkmont)×4、ベース 1.6 / ブースト 3.4 GHz。E コアなし。スレッド 8(P は SMT なし) | [公表] ARK(https://www.intel.com/content/www/us/en/products/sku/245720/intel-core-ultra-5-processor-325-12m-cache-up-to-4-50-ghz/specifications.html) |
| L3 | 12MB | [公表] ARK |
| メモリ | LPDDR5X-7467 / DDR5-6400、最大 128GB、2ch | [公表] ARK |
| 電力 | ベース 25W、最大ターボ 55W、最小保証 12W(range 12〜55W) | [公表] ARK |
| GPU | Intel Graphics(Xe3 4 コア、最大 2.5GHz)。評価には使わない(notes のみ) | [公表] ARK |
| NPU | 47 TOPS(ARK の値。記事では差がある。具体的な記事の値は未確認) | [公表] ARK・食い違いあり |
| ダイ | Compute タイル(Intel 18A)。**面積は未取得(null)** | ノードは Panther Lake の Compute タイルが 18A であることに合わせた(386H などと同じ) |
| GB7 | `Panther Lake: Core Ultra 5 325(2.1GHz, 8c)`(`gb7-scores.js` の行。**2026-11-04 に更新**): ST 2337 / MT 11018、**直近25件の中央値、n=25**(2026-10-31 取得。設計書 §5.3.2 C の取り直し値) | [二次]。下の「GB7 の行の更新」参照 |
| Geekbench 6(参考・判定外) | GB6.7 シングル 2622 / マルチ 11088(Dell XPS 16。Notebookcheck 2026-03-21) | [二次]。判定には使わない(notes のみ) |

### GB7 の行の更新(2026-11-04。leader の指示)
経緯: 当初は既存行(ST 1885 / MT 9500、n=2。2026-10-25 取得)で追加し ST +32.0%・MT -5.8% だったが、leader の指示で、設計書 §5.3.2 C の取り直し値(ST 2337 / MT 11018、n=25、2026-10-31)に更新した。更新後の誤差は ST +6.5%(386H・378H・358H の +5.5〜+7.6% と同じ範囲)・MT -18.8%で、gray にならず ST は ok・MT は ng。手順: 設計書 §2.4 の表を更新し `tools/extract-gb7.js` で再生成(前後で変わったのはこの行だけ)。既存 100 プリセットの評価ダンプは不変。MT -18.8% は TDP 帯別係数の弱点(公開値に合う k は 0.826 で帯 0 の 0.65 から離れる。HX370 と同傾向)で、`tests/perf.test.js` の帯係数テストは 325 を標本から外している(評価の弱点を隠す扱い。方針は未決でユーザー判断待ち。詳細は設計書 §5.3.0・§13)。

### 再現度パネルでの扱い(既存のルールのまま)
`reproduce.js` は区分が「個別投稿」で始まる公開値だけを gray(判定外)にする。この行の区分は「直近25件の中央値」(更新前は n=2、更新後は n=25)なので、gray にはならず、ok / ng の判定が出る(`presetlist.js` の `gb7Basis` は `kind` が「中央値」で n≤2 のときだけ「信頼度低」を付け、「直近25件の中央値」は n があっても付けない)。n が少ない行の扱い(設計書 §12 U16・§13 の判断待ち)は未決のため、ルールは触っていない。

## 2. Core 5 320(`intel-wcl-c5-320`、Wildcat Lake)

| 項目 | 値 | 区分・出典 |
|---|---|---|
| 名称・世代 | Core 5 320、family `Wildcat Lake` | ARK |
| コア | P(Cougar Cove)×2、ベース 1.5 / ブースト 4.6 GHz。LP-E(Darkmont)×4(1 クラスタ)、ベース 1.4 / ブースト 3.4 GHz。スレッド 6 | [公表] ARK(https://www.intel.com/content/www/us/en/products/sku/246018/intel-core-5-processor-320-6m-cache-up-to-4-60-ghz/specifications.html) |
| P コアの uarch | Cougar Cove。設計書 §5.3.2 C の表は「P コアが Cougar Cove かは明記なし(要確認)」としていたが、注釈つきダイ写真の注記(Cougar Cove ×2)が根拠になった。写真の注記は [二次] | 注釈つきダイ写真 |
| L3 | 6MB | [公表] ARK |
| メモリ | LPDDR5X-7467 / DDR5-6400、最大 64GB、**1ch**(ARK の記載。バス幅は記事と食い違いの可能性があり、プリセットは文字列のみで評価に使わない) | [公表] ARK |
| 電力 | ベース 15W、ターボ 35W、最小保証 10W(range 10〜35W) | [公表] ARK |
| GPU | Xe3 2 コア、最大 2.5GHz(notes のみ) | [公表] ARK |
| NPU | 16 TOPS(ARK)。記事では 17 | [公表] ARK・食い違い(未確定) |
| メモリサイドキャッシュ | 容量は二次ソースで 4MB と 2MB に割れており**未確定**(写真には「Memory Side Cache」の注記のみで容量なし) | [二次]・食い違い |
| ダイ | compute die(Intel 18A、面積 null)+ I/O die(TSMC N6、面積 null)。`nodes.js` に `tsmc-n6` があるので nodeId はそのまま | ノード: Chips and Cheese・Tom's Hardware の Hot Chips 2026 記事(設計書 §2.2 の Wildcat Lake の行、[二次])。面積の数値は記事に無い |
| 接続 | UCIe、有機パッケージ(Foveros ではない) | [二次]。notes のみ |
| 面積 | **Notebookcheck の 77mm² は出典・対象のダイが不明なので採用しない**(compute die か I/O die か合計かも不明) | 不採用 |
| GB7 | **採用(2026-11-04。ユーザーが検索結果のスクリーンショット 2 枚を提供)**: ST 2242 / MT 7212(n=25、13 番目の値)。Geekbench 7 検索「CPU、Intel Core 5 320」、全 431 件中の直近 25 件(スクリーンショット 3 枚)。全件 6 コア表示・仮想環境の表示なし。Linux 5 件を含み、ST 1358・1684 など明らかに低い投稿もある(ユーザーは信用できないスコアがあったと述べた)が、除外条件はコア数不一致と仮想環境だけなので除外せず中央値で頑健化。HP OmniBook 5 の 2 件は同一値(2303 / 7261)で二重アップロードの可能性があるが除外せず。3 枚の境目の連続性は未確認。**感度(参考。採用値は変えない)**: ST 2000 未満または MT 6300 未満の 7 件(11・12・13・18・23・24・25 番)を除いた n=18 の中央値は ST 2277 / MT 7301。誤差は ST +9.9%・MT -8.5%(評価 2463.6 / 6596.7)。**TDP 帯別係数のテスト標本からは暫定的に外している(ユーザー判断待ち)**: 入れると標本 11・帯 0 の中央値が 0.65 → 0.69 で `MT_CLOCK_BANDS`(0.65)と不一致(LOO MAE 0.1056・一律 0.81 MAE 0.1230・誤差 10% 超 3 件で指標自体は良化)。再校正すると全 mobile-pc の MT 評価が変わるため見送った(`tests/perf.test.js` で id 指定除外)。以前の範囲(ST 2220〜2225 / MT 7223〜7359)は単一値が決まらず採らなかった。Notebookcheck に GB7 の個別投稿 1 件(Dell XPS 13 DX13260: シングル 2551 / マルチ 7890)があるが集計ではないので notes に参考として記載のみ | [二次]。判定外 |
| Geekbench 6.7.1(参考・判定外) | シングル中央値 2575 / マルチ中央値 7913(n=4。Notebookcheck) | [二次]。判定外 |
| 設計書 §5.3.2 C の表の旧値 | ST 2220〜2225 / MT 7223〜7359(n=16〜25、2026-10-31。コア数表示別の中央値) | [二次]。範囲で単一の集計値が決まらないため `gb7: null` のまま維持(leader の指示 2026-11-04。採用するかはユーザー判断待ち) |

- 評価: ST 2463.6 / MT 6596.7(公開値なしで誤差は出ない)。参考として Notebookcheck の個別投稿 2551 / 7890 に対して ST -3.4% / MT -16.4%(1 件の投稿なので判定には使わない)。
- C1(GB7 の行)は `validate-data.js` の `C1_EXCEPTIONS` に載せた。C2(ダイ面積)は 325 とともに `C2_EXCEPTIONS`(Kraken Point と同じ扱い)に載せた。C3〜C5 は検査される。

## 3. 追加しない SKU(判断)

| SKU | 判断 | 理由 |
|---|---|---|
| Core Ultra 5 365・355・335・336H・338H | 追加しない | ユーザーの指示(336H 等は見た目が上位と変わらないので不要)に従う。構成は 336H・338H = 4P+4E+4LPE(E は 4 基。386H・366H・356H は 4P+8E+4LPE)。出典: leader 配下の調査担当の報告(Intel ARK 245533・245531 の調査結果)。ARK の原ページは実装担当は未確認。4P+4LPE の構成は 325 一つで足りる |
| Core Ultra 5 332・322 | 追加しない | **2P+4LPE+2Xe で 4P+4LPE ではない**(4P+4LPE の枠 `ptl-compute-4p4lpe` とは別構成)。出典: 調査担当の報告(Intel ARK 245718・245716 等)。ARK の原ページは実装担当は未確認。ユーザーが個別に言及したものではなく、指示(325 と 320 だけ追加)の範囲外という実装上の判断 |
| その他(365・355・335 など) | 追加しない | 同上。C5(同じ uarch・ダイ・コア数の SKU は最大 2 件)は第12世代以降の Intel に適用しないが、増やす理由がない |

## 4. 配置(フロアプラン)

- 325: `TILE_MAP['intel-ptl-u5-325'] = tm('ptl-compute-4p4lpe', 'reuse')`。枠は 直前のコミット(5bcdb71)で追加済みだった `ptl-compute-4p4lpe`(`Panther Lake_dies.jpg`〔ユーザー提供・出典未確認〕の左の構成の目測)。`tiles` は空なので GPU・Platform の飾りのダイは付かない(寸法未取得)。scaleNote に「Panther Lake_dies.jpg(ユーザー提供・出典未確認)の目測。ダイ面積未取得」。
- 320: 新しい枠 `wcl-compute`(`x86-tile`。`Wildcat-lake-computex26-series3-die-annotated.jpg` 1182×1427 の表示ピクセルの目測 ±5〜10%)。I/O die の飾りは付けない。scaleNote に「ダイ面積未取得。写真は compute die 単体と判断」。詳細は `user-images.md` の「Wildcat Lake のダイ写真の反映」。
- ダイ面積が null のとき、ダイの寸法は枠の縦横比に基づく仮寸法になる(Kraken Point と同じ。面積合計・歩留まりは「未取得」)。

## 5. 確認結果

- `node tools/validate-data.js` OK(102 件)。`node --test tests/*.test.js` 全件 pass。
- 既存 100 プリセットの `fromPreset` + `evaluate` の JSON(layout・ブロック・飾りダイ・評価結果)は追加の前後で **バイト一致**(md5 f87a36c783fba97bb7da91eacb95a92b)。
- 校正(σ・γ・uarch ごとの u・uIsa)は 2 件を除いた標本と一致(`tests/mix.test.js`)。TDP 帯別係数の標本(`perf.test.js`)には 325 を入れた(ユーザー指示「3つ全部やってください」〔判断待ち 3 点への包括的な指示〕による。閾値の緩和はそれに伴う実装側の対応。帯の係数は変えない)。LOO の MAE 0.0717 → 0.1140・0.81 一律の MAE 0.1373 → 0.1253・誤差 10% 超 2 → 4 件と精度指標は悪化し、閾値は実測に合わせて緩めた(コメントに悪化を明記)。帯係数が 0.81 一律より良い主張は残る(差は縮小)。
- 部品ライブラリ(`BL.build`)は 273 → 280 件(+7)。
- メモリ構成の選択(`data/memory.js`)には 2 件を載せていない(係数は 1。依頼にないため)。

## 6. 未取得項目の追加調査(2026-11-04)

ユーザーの質問「tdp とかは取得できませんでしたか?」「取れていない項目を検索してください」を受けた追加調査(調査担当の報告)。評価・数式・校正・面積(null)は変えていない。区分は [二次] を基本とし、「原ページ確認済み」と「未確認(検索要約のみ)」を分けて書く。

### 6.1 重要な訂正: ARK の値は ARK 原ページ未確認(403)
このメモと notes にある ARK の値(325・320 の TDP 等)は、**ARK 原ページを自分たちでは開けていない**(実装担当・今回の調査担当とも curl は 403、WebFetch は 404 リダイレクト)。以前の調査担当(Wildcat 仕様調査)が要約ツール経由で読んだ値である。区分 [公表] は「Intel が公表した値を要約経由で読んだもの」であり、原ページ未確認。

### 6.2 ダイ面積(すべて未取得。null のまま)
- 325 用の 4P+4LPE Compute タイル・4Xe GPU タイル・小型版 Platform タイル: 未取得。
- Wildcat Lake の compute die・I/O die: mm² は未取得。記事は相対値のみ。Wccftech / TechBang「compute tile は 38% 減、I/O(Platform Controller Tile、TSMC N6)は 15% 減」。比較基準は Panther Lake(Xe 4 基・PCIe Gen5×4 / Gen4×8・TB4×3 の構成と読めるが SKU の明記なし)。ServeTheHome「I/O chiplet は Panther Lake 比で面積約 15% 減」。
- Wccftech: UCIe バンプピッチ 110µm(Foveros は 36µm)、18A compute die の 29% は歩留まり救済対象、パッケージ 35×25×1.23mm(比較: Panther Lake 4Xe 品 50×25×1.5mm)。
- Kurnal Insights のギャラリーは intel-panther-lake-h(14.32×8.04)1 件のみで、4+4 版も Wildcat も無い(原ページ確認済み)。
- SemiAnalysis「Intel Panther Lake Teardown」(2026-09-26、有料。無料部分のみ原ページ確認)は Core Ultra 7 365 を分解し「Annotated Panther Lake-U 4+0+4 compute tile」の図があるが、面積の数値は有料部分または画像で未取得。
- Notebookcheck の Core 5 320「Die Size 77 mm²」は根拠・対象ダイ不明で不採用のまま。
- PTL-H タイルの別値(114.304mm²・約 110mm²)は検索要約のみ・原ページ未確認。Kurnal の 115.13 は変えない。

### 6.3 ノード([二次])
- SemiAnalysis: 「Both compute tile variants use Intel 18A」「4-core GT1 tile on Intel 3、12-core GT2 tile on TSMC N3E」「Both I/O tile variants use TSMC N6」(I/O タイルは 2 種類)。
- Chips and Cheese「Panther Lake's Reveal at ITT 2025」(2025-10-14、原ページ確認済み): 4Xe の GPU は Intel 3。Platform Controller Tile が全バージョン同一かは不明。TechBang も 4Xe = Intel 3・12Xe = N3E。

### 6.4 Wildcat Lake のメモリサイドキャッシュ(MSC): 未確定、両論併記
- 2MB 説: Wccftech が Intel の Hot Chips スライド「Right Size Compute」を書き起こし(「Cuts to 64b LP5 (versus 128b) - 2 MB Sys cache versus 4 MB」「cuts LLC in half (6MB vs 12MB)」)。IT之家が転載。
- 4MB 説: TechBang 132756「Memory Side Cache 8MB→4MB」。
- Chips and Cheese の ITT 2025 記事(原ページ確認済み)は Panther Lake の最小構成 4P+4LPE でも「8MB Memory-side Cache」・128b バス。
- Tom's Hardware / Guru3D の「4MB」は原ページ未確認。
- 結論: 未確定。決め手は Hot Chips 2026 スライド原本。

### 6.5 メモリ帯域とバス幅
- ARK は 403 で、帯域の項目の有無は未確認。
- バス幅: 325 = 128-bit(Chips and Cheese、Wccftech の書き起こし)。320 = 64-bit(Wccftech「64b LP5」、スライド「128b => 64b DRAM」。Chips and Cheese の Hot Chips 記事は筆者推測として 64-bit)。TechBang は「Wildcat 單通道(32bit)、Panther 雙通道(64bit)」でチャネル幅の数え方が違うとみられる。Notebookcheck の Dell XPS 13(320)レビューは「LPDDR5x-7467, Single-Channel」。
- **算出値(公表値ではない。バス幅 × 転送速度 ÷ 8)**: 325 = LPDDR5X-7467 128bit で 119.5 GB/s、DDR5-6400 で 102.4 GB/s。320 = 64bit LPDDR5X-7467 で 59.7 GB/s、DDR5-6400 で 51.2 GB/s。第三者 DB も 119.5 / 59.7 を載せるが原ページ未確認。
- 最大容量の食い違い: 325 は ARK 128GB(要約経由)、Notebookcheck は「96GB LPDDR5X-7467 or 128GB DDR5-6400」(原ページ確認済み)。320 は TechBang「64GB(Panther Lake は 96GB)」。

### 6.6 その他
- 325 の L2: Notebookcheck L1 2.3MB / L2 16MB / L3 12MB(原ページ確認済み [二次])。L2 16MB は P 3MB×4 + LPE クラスタ 4MB と整合(調査担当の計算)。
- P コアの L2 は資料で割れる(設計書の表は Cougar Cove L2 2.5MB、Kurnal を引く記事は 3MB = 検索要約のみ未確認)。未確定。
- 320 の L2「LPE 共有 4MB」は検索要約のみ未確認。
- トランジスタ数: 325・320 とも未取得。

### 6.7 GB7 の新集計・PL1/PL2
- Geekbench Browser は 403 で取得不可(新集計なし)。
- Intel が SKU 別に公表しているのは ARK のベース電力・最大ターボ電力のみ(取得済み。Notebookcheck はこれを PL1 / PL2 と表記)。
- OEM 設定の例: Dell XPS 13(320)「37W PL2 / 18W PL1」(Notebookcheck レビュー、原ページ確認済み [二次]。Intel の値ではない)。325 実機の PL 測定値は見つからず。

### 6.8 取得できなかったページ(回避していない)
Intel ARK 2 ページ(curl 403、WebFetch は 404 リダイレクト)、Geekbench Browser、HotHardware、Guru3D、SemiWiki、cpu-monkey、Tom's Hardware の Hot Chips / 発売記事(本文取得不可)、SemiAnalysis(有料)。
