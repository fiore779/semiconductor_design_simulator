# Intel タイル型チップのダイ写真(ユーザー提供、2026-11-03)

`C:\LocalAI\画像` に追加された注釈つきダイ写真の確認結果と、`js/model/floorplan.js` の `TILE_FRAMES`(`x86-tile`)への反映。区分は **[二次]**(第三者の注釈画像。作者表記なし)。
- 「目測」= 画像の表示ピクセルから読んだ値(±5〜10%)。面積比は粗い。
- **出典 URL は未申告。ファイル名・画像内文字からの推定で、要ユーザー確認**。ユーザー指示「画像はファイル名を根拠にしてよい」に従う。
- 画像内に面積(mm²)・寸法の注記は無い(5 枚とも)。プリセットのダイ面積は変えない。

## (a) 画像ごとの表

**拡張子は .jpg だが中身は WebP**: `MTL_annotated.jpg`・`ARL_LQ_annotated.jpg`・`LNL_Package_Annotated.jpg`・`panther-lake-computex26-die-annotated.jpg`・`Wildcat-lake-computex26-series3-die-annotated.jpg`・`863ef392-…_1024x674.jpg`(先頭バイトが RIFF/WEBP で確認)。`arrow lake cpudie al3.jpg` と `Intel-Arrow-Lake-8P+16E-Tiles-Die-Shot.jpg` は本物の JPEG。

| ファイル | 実寸 (px) | 内容 | 使い方 |
|---|---|---|---|
| `MTL_annotated.jpg` | **13000×6470**(依頼文では 2220×1834 と記載。実ファイルは左) | Meteor Lake。左上が Compute タイル(Redwood Cove P 6、Crestmont の 4 コアクラスタ 2、L3 1.5MB×16 + リングストップの帯)、中央が SoC(2 コア Crestmont LP-E、NPU、メモリコントローラ、Media、Display)、右が GPU タイル(Xe-LPG 8)、下端が IO タイル | 185H の Compute タイル(photo) |
| `ARL_LQ_annotated.jpg` | **2220×1834**(依頼文では 6742×6850) | Arrow Lake の全タイル(左: Compute、右: SoC・GPU、下: IO)。Compute は P 8 + E クラスタ 4 + L3 3MB 帯 | `arrow lake cpudie al3.jpg` と同配置と確認。配置の相互確認に使用 |
| `arrow lake cpudie al3.jpg` | 3231×1816 | Arrow Lake の Compute タイルの拡大。P #1〜#8、Skymont E クラスタ #1〜#4(各 4 コア。内部に 1.5MB L2 ×2)、中央に Ring Agent + L3 Cache Tags の帯(上下に 2×1.5MB の L3 計 12 ブロック) | **285K の主な根拠**(photo) |
| `Intel-Arrow-Lake-8P+16E-Tiles-Die-Shot.jpg` | 2075×1130 | 左: パッケージ上のタイル配置(Compute N3B が右上の縦長、IO N6 が左、Filler 2、SoC N6 が下に横長、GPU N5 がさらに下)。右: 同じ注釈写真(横向き) | タイル配置は 3D 表示の参考(実装は現状維持。(d))。タイル面積比 Compute : SoC : GPU ≈ 1 : 0.74 : 0.19 がプリセット(117.4 : 86.6 : 23.1)と一致 |
| `LNL_Package_Annotated.jpg` | **6742×6850**(依頼文では 13000×6470) | Lunar Lake のパッケージ。上に LPDDR5X 2 個、下に Compute タイル(P 4、Skymont LP-E 4、L3 12MB の Ring Stop、Xe2-LPG 8、NPU、Media、Display、IPU、メモリコントローラ、SLC 4MB ×2)、その下に Platform Controller タイル | 268V の Compute タイル(photo) |
| `panther-lake-computex26-die-annotated.jpg`(WebP) | 971×1717 | Panther Lake の Compute タイル(縦長)。Cougar Cove P 4(2×2)、Darkmont 4(L2 を挟む)+「4 E-Cores」クラスタ、Cluster Low Power 4 E-Core、L3、NPU、Media、Display、メモリサイドキャッシュ、IPU、D2D、DDR コントローラ。**Kurnal 全体図の Compute タイルを 90° 回して反転した向き**(縦横比 0.564 の逆数 1.773 = 全体図の 1.771 と一致。L3・NPU・P・E の相対位置も対応) | 388H・386H・378H・358H の Compute タイル(photo) |
| `dh0gWbF8gG9AXfQw.jpg`(JPEG。2501×2000。Kurnal の注釈。透かし @Kurnal) | 2501×2000 | **Panther Lake の全体図**。Compute タイル(横向き。Cougar Cove P ×4、Darkmont E 4×2 クラスタ、Darkmont LPE ×4、L3 18MiB(6MiB×3)、NPU 5th(NCE ×3)、メモリコントローラ・MSC 4MB×2、Display?・Media?、128bit LPDDR5x/DDR5 PHY)、右に GPU タイル(Xe3 Core ×12 + Render Slice ×2 + GPU L2 8MiB ×2)、下に IO/Platform タイル(PCIe5・TBT5 ×2・USB・WiFi/BT)。**12Xe = X モデルの全体図で、4P+8E+4LPE と整合** | ptl-compute の枠(横向き)と、GPU・Platform タイルの飾りのダイの位置 |
| `1lgodfRzmK0H3DUG.jpg`(JPEG。1142×960。SemiAnalysis) | 1142×960 | 別の小さな Compute タイル(Cougar Cove ×4、Darkmont ×4(L2 1.5MB ×2 を共有)、6MB L3 ×2、NPU 5(NCE ×2)、4MB MSC ×2、LPDDR5X-7467/DDR-6400 PHY)。**4P+4LPE 系の非 X 向けと推定(未確認)** | プリセット無し(325 は面積・構成とも未取得)。**記録のみ** |
| `zsALH81651iOGldG.jpg`(JPEG。2409×960。SemiAnalysis) | 2409×960 | 左: Xe3 4 コアの GPU タイル(非 X 向け)、右: Xe3 12 コアの GPU タイル(X 向け)。右は縦横比 1.20(Kurnal 全体図の GPU タイル 0.838 を回した向きと一致) | 12Xe の GPU タイルの縦横比の相互確認。4 コア版は記録のみ |
| `Wildcat-lake-computex26-series3-die-annotated.jpg` | 1182×1427 | Wildcat Lake(Cougar Cove 2、Darkmont 4、L3、Xe 2、NPU、メモリサイドキャッシュ) | **プリセットが無いので反映せず記録のみ**(新プリセットは作らない) |
| `863ef392-…_1024x674.jpg`(参考) | 1024×674 | Meteor Lake ではなく Raptor Lake/Redwood Cove(Locuza の die shot、撮影 Nicolas Derumigny / comptoir-hardware)。ブロック名は Redwood Cove P 1 + 4x Crestmont E | コア内部の参考のみ。タイル全体の配置には使わない |

寸法の食い違い: 依頼文の画素数は 3 枚(MTL・ARL_LQ・LNL)で入れ替わっていた(実ファイルの画素数と画像内容で確認)。いずれも「実ファイルの寸法」を上表のとおりとした。

## (b) 画像 ↔ プリセット

| 枠(`TILE_FRAMES`) | 縦横比(幅/高さ。写真の枠の目測) | プリセット | scaleBasis |
|---|---|---|---|
| `mtl-compute` | 1.097(352×321) | intel-mtl-185h(Compute 68.1 mm² → 約 8.64×7.88 mm) | photo |
| `arl-compute` | 1.925(1963×1020) | intel-arl-285k(117.4 mm² → 約 15.0×7.8 mm) | photo |
| 同 | 同 | intel-arl-265k(E 12。E クラスタ 1 つ無効の目安) | reuse |
| 同 | 同 | intel-arl-275hx(HX が同じ Compute タイルかは検索要約で未確認) | reuse |
| `lnl-compute` | 1.899(1145×603) | intel-lnl-268v(139.6 mm² → 約 16.3×8.6 mm) | photo |
| 同 | 同 | intel-lnl-258v・256v(プリセット側が「268V と同じタイルを流用」) | reuse |
| `ptl-compute`(Kurnal 全体図の向き) | 1.771(1243×702。設計書の調査表の Kurnal 寸法 14.32×8.04 mm = 1.781 と 0.6% で一致) | intel-ptl-x9-388h(115.1 mm² → 約 14.28×8.06 mm) | photo |
| 同 | 同 | intel-ptl-x9-386h・x9-378h・x7-358h(プリセット側が「388H と同じ…を流用」。LNL の 258V・256V と同じ基準で、写真が 388H のタイルなので) | reuse |

Wildcat Lake: プリセット無し。反映せず。

## (c) 目測値(ダイに対する外接枠の面積 %)

| 枠 | ブロック |
|---|---|
| mtl-compute | P コア 1 個 約 8%(6 個)、E クラスタ 約 10.7%(2 個)、L3 帯 約 21%(L3 1.5MB×16 + リングストップ) |
| arl-compute | P コア 約 4.4%(8 個)、E クラスタ 約 5.7%(4 個)、L3 + リングエージェントの帯 約 26% |
| lnl-compute | P コア 約 3.3%(4 個)、LP-E クラスタ 約 5.2%、L3 約 5.2%、GPU 約 19%、NPU 約 11%、Media 約 7%、Display 約 5% |
| ptl-compute | P コア 1 個 約 3.8%(4 個)、Darkmont クラスタ 約 6.1%(2 個)、LPE クラスタ 約 5.8%、L3 18MiB 約 8.7%、NPU 約 8.8%、Media 約 7.8%、Display 約 4.5% |

面積注記が画像に無いので、プリセットの面積との差の記録は無し(縦横比だけを写真から採用)。

## Panther Lake: 前回の誤解の訂正と全体図(2026-11-03)

- **訂正**: 当初「`panther-lake-computex26-die-annotated.jpg` はおそらく Xe3 4 コア版のダイで X モデルには使えない」と記録したが、**誤り**。ユーザーの説明では、最初に保存した画像は Compute タイルで、全体図(Kurnal)も取得できた。4P+8E+4LP-E の Compute タイルとして H 系 4 件(388H・386H・378H・358H)に使える。
- 全体図(`dh0gWbF8gG9AXfQw.jpg`)の Compute タイルとは、縦横比(1.771 と 1/0.564 = 1.773)と L3・NPU・P・E の相対位置で照合し、同じタイル(向きが違うだけ)と判断した。枠は全体図の向き(横長)で作った。
- **scaleBasis**: 388H = **photo**、386H・378H・358H = **reuse**(プリセットが「388H と同じタイルの流用」と注記。LNL の 258V・256V と同じ基準)。**画像に縮尺の注記はない**。Compute の 115.1 mm² はプリセット値(Kurnal・二次)を当てはめた。GPU・Platform の寸法も Kurnal の二次値で、独立した検証なし。位置は目測の推定。
- **GPU は SKU で違う**(設計書の Wikipedia 表・`chips-pc.js` の notes): 388H・378H・358H = Arc B390(**12 Xe**)、386H = **4 Xe**。12Xe の GPU タイルの飾りは 388H・378H・358H だけに付け、386H は Platform タイルのみ(4Xe の GPU タイルは寸法の二次資料が無いので出さない。記録のみ)。
- **GPU タイル・Platform タイルは飾りのダイ**(`design.decorDies`。kind は gpu-tile / platform-tile。dies に入れず、評価・面積合計に含まない。Zen 3 の cIOD と同じ仕組みを `x86-tile` にも許した)。位置は全体図の目測(GPU は Compute の右、Platform は下)で**推定**。寸法は設計書の調査表の Kurnal 値(GPU 6.78×8.14 mm〔表の 8.14×6.78 を全体図の向きに合わせた〕、Platform 12.44×4.00 mm。二次。Tom’s Hardware 2026-03 の引用経由で独立でない)。全体図の px から出した面積比(GPU 0.484・Platform 0.431)は、その寸法から出る 0.480・0.432 と 1% 以内で一致。
- **非 X 向けの 4P+4LPE 系**(`1lgodfRzmK0H3DUG.jpg`・`zsALH81651iOGldG.jpg` の左の 4Xe の GPU タイル): プリセット(Core Ultra 5 325)は面積・構成とも未取得のため**反映せず記録のみ**。**非 X 向けの全体像は未取得で、部分画像(Compute タイル・GPU タイル)のみ記録した**。画像の出典・チップ名は推定・要ユーザー確認。

## (d) 実装の方針と未対応

- 実装: `floorplan.js` の `TILE_FRAMES`(P 枠・E 枠・LP-E 枠・L3 帯・飾り)。コア数が枠より少なければ空き枠(コアの大きさは変わらない)、多ければ `fits()` が false で schematic に落ちる(Apple と同じ)。GPU・NPU・メモリコントローラ・Media などは飾り(decorative、計算除外)。他タイル(GPU・SoC・IO・Base)は従来どおり 1 ブロック。
- **Meteor Lake の LP-E 2 コア**は写真では SoC タイル側(2-Core Crestmont Cluster)。コアのブロックは Compute のダイに置く仕様(コア数の一致テスト)なので、Compute タイル右端の SoC Tile Interconnect の帯の上に模式で重ねた(実際の位置ではない)。
- **3D パッケージ表示のタイル配置は現状維持**。ARL の左図は Compute が縦長(右上)・IO が左・SoC が下・GPU がさらに下だが、写真の Compute は横長(右の注釈写真は 90° 回転)で、Compute のブロックを回転させる処理が必要になり範囲が大きい。未対応。
- 出典 URL・チップ名はすべて推定(ファイル名・画像内文字)。要ユーザー確認。
