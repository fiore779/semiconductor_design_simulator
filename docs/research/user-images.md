# ユーザー提供の画像と出典(2026-10-31)

ユーザーが `C:\LocalAI` に置いた画像。ブロック配置・縮尺の根拠(区分 [二次]。画像から目測した値は「目測」と明記する)。
出典のページ本文は未取得(TechPowerUp は 403。他は未確認)。画像そのものだけが根拠。

| 画像 | 内容 | 出典(ユーザー提示) | 備考 |
|---|---|---|---|
| `12900K.png`(ユーザーの手書きスケッチ) | 12900K の配置の概略 | ユーザー作成 | 実物の配置とは異なる(実物は横長)。使わない |
| 12900K の注釈つきダイ写真(会話に貼付) | Platform I/O・Uncore・P コア 4 個×2 段・L3/リングバス・E コアのクラスタ(上下)・iGPU。横長(約 2:1) | https://www.techpowerup.com/review/intel-core-i9-12900k-alder-lake-12th-gen/2.html | ページ本文は 403 で取得不可 |
| `ryzen zen3~2ccd.png`(ユーザーの手書きスケッチ) | CCD 2 つ(左コア列・L3・右コア列)+ IO ダイの概略 | ユーザー作成 | 配置の考え方の参考 |
| `画像\5950x.jpg` | 5950X のパッケージ(蓋なし)。CCD 2 つが上に横並び、その下に大きな IO ダイ、周囲に SMD 部品 | https://bit-tech.net/reviews/tech/cpus/amd-ryzen-9-5950x-and-ryzen-7-5800x/1/ (ユーザー提示。どちらの画像の出典かは未確認) | IO ダイは CCD より明らかに大きい。**IOD の縦横比 1.4 は目測**(CCD の下の IOD の外形を画像から読んだ値。幅 約 73 px × 高さ 約 53 px)。この比と AMD 公表の cIOD 125 mm²([公表]、block-areas.md の AMD-Z3)から飾りの IO ダイ(`design.decorDies`)の寸法を決めた |
| `画像\AMD-Ryzen-5000-Zen-3-Desktop-CPU_Vermeer_Die-Shot_1-1480x976.jpg` | Zen 3 Vermeer の CCD の注釈つきダイ写真(1480×976、縦横比約 1.52)。上部にデバッグ/ウェハテストバンプ・Global Memory Interconnect 2(Infinity Fabric)・SMU、その下に左右 4 コアずつと中央の L3 列 | https://wccftech.com/amd-ryzen-5000-zen-3-vermeer-undressed-high-res-die-shots-close-ups-pictured-detailed/ (ユーザー提示) | 目測(ダイ幅比): 左コア+FP 約 19%、L2 約 5%、L3 約 50%、L2 約 5%、右コア約 19%。上部の帯は高さの約 15% |

## 画像の場所として提示された URL(2026-10-31。画像ファイルは未受領)

| 対象 | URL | 状態 |
|---|---|---|
| Core i9-13900K(Raptor Lake-S)のダイ写真 | https://www.techpowerup.com/review/intel-core-i9-13900k/2.html | TechPowerUp は 403 で取得不可。画像はユーザーが保存して渡す想定 |
| Ryzen AI 9 HX 370(Strix Point)の注釈つきダイ写真 | https://www.techpowerup.com/325035/amd-strix-point-silicon-pictured-and-annotated | 同上 |
| Ryzen AI 7 350(Krackan/Kraken Point) | https://www.tomshardware.com/pc-components/cpus/amd-ryzen-ai-7-300-krackan-point-apu-allegedly-spotted-in-a-benchmark-and-shipping-manifest-sports-eight-zen-5-cores-and-lpddr5x-8000-memory | 調査メモ(kraken-point.md)では、同記事は発売前でダイ写真は無く「ダイ写真が出たら配置を確認する」とあるのみ。ダイ写真・フロアプランは未取得のまま |

## 画像の受領(2026-10-31 追記。`C:\LocalAI\画像`。区分はいずれも [二次]。目測はこのプロジェクトで画像から読んだ値)

| 画像 | 内容 | 出典(ユーザー提示) | フロアプランでの使い方 |
|---|---|---|---|
| `arch2.jpg`(1920×893、縦横比 2.15) | **13900K(Raptor Lake-S 8P+16E)**の TechPowerUp 注釈つきダイ写真。左に Uncore(x≈110–395)、P コア 4 個×2 段(x 400–1120)、E コアクラスタ(4 コア)が上下×2 列で計 4 クラスタ(x 1125–1605)、中央に「36MB Shared L3 Cache + Ringbus」の横帯(y≈345–600)、右端に Xe-LP iGPU(x 1605–1905) | https://www.techpowerup.com/review/intel-core-i9-13900k/2.html | Raptor Lake 8P+16E ダイ(13900K・14900K・13700K など 7 件)の座標(`floorplan.js` の `HY_RPL`)。縦横比は写真の 2.15 を採用(実寸 23.8×10.8 mm なら 2.20、差 2%。プリセットの面積 252.3 mm² は変えず、写真と同じ座標で並べるため写真の比を採る) |
| `9cmjsNVFJxZLl6yD.jpg`(1858×1200、縦横比 1.55) | **Strix Point(Ryzen AI 9 HX 370)**の注釈つきダイ写真。左列に Zen 5 クラスタ(コア+L2 の段、その下に L3 16MB)、その下に Zen 5c クラスタ(コア+L2、L3 8MB、さらに下に Zen 5c の段)。中央にメモリコントローラ、右上に NPU、中央〜右に RDNA 3.5 GPU(大きい)、右端に Media Engine、上端に DDR5/LPDDR5X PHY、下端に PCIe/USB PHY | https://www.techpowerup.com/325035/amd-strix-point-silicon-pictured-and-annotated | amd-strix-hx370 の座標(`floorplan.js` の `ST`)。縦横比 1.55(実寸 12.06×18.71 mm = 1.55 と一致)。注釈は X ユーザーの @GPUsAreMagic による推定で AMD の確認はない(PCGH-STX と同じ) |
| `ykZo39MPXqS7Ldgarwoa7o-750-80.jpg` | AMD の APU のパッケージ写真(蓋なし。ダイが 1 つで周囲に SMD 部品、ダイは着色された写真)。**型番はユーザー申告で Ryzen AI 7 350(Kraken Point)**(2026-10-31)。出典はユーザー申告(2026-10-31)で Tom's Hardware の記事(下の「画像の場所として提示された URL」の 3 行目と同じ URL) | https://www.tomshardware.com/pc-components/cpus/amd-ryzen-ai-7-300-krackan-point-apu-allegedly-spotted-in-a-benchmark-and-shipping-manifest-sports-eight-zen-5-cores-and-lpddr5x-8000-memory(記事ページ本文は未取得。調査メモ kraken-point.md の「ダイ写真なし」は記事本文の読み取りで、この画像が記事内の画像かは未確認。区分 [二次]) | (2026-11-01 追記)Kraken Point の配置は、この写真ではなく Strix Point の写真(`9cmjs…jpg`)の配置の流用(`scaleBasis` = reuse)で、この写真は**根拠にしていない**。この写真のダイの縦横比(約 1.4)と、流用した枠の縦横比(約 2.05)は合わない。以下は従来の記述: 注釈なしの着色写真で、コア・GPU・NPU の判別は目視のみ。Kraken Point の縦横比(約 1.3〜1.4、目測)と、配置の大まかな傾向の参考に使えるが、根拠にするには出典の確認が要る(使うなら `scaleBasis` は schematic のまま、または「目測の参考」と明記) |

### 12900K の基準枠(1682×846 px)の出所
- 12900K の注釈つきダイ写真(TechPowerUp のレビューの画像、上の表の「会話に貼付」の行)は**会話にだけ存在し、ファイルは無い**。ユーザーが会話に貼った画像から目測した座標が `HY_ADL`(1682×846)で、`arch2.jpg` から測ったものではない(arch2.jpg は 13900K で、別の画像)。
- したがって 12900K 系(Alder Lake-S 8P+8E)の `photo` は「会話に貼られた 12900K の写真の目測」が根拠で、リポジトリ内に再確認できる画像ファイルは無い。

## Apple シリコンの画像の受領(2026-11-01。詳細は `apple-images.md`。区分は [二次]。出典は全件「推定・要ユーザー確認」)

| プリセットへの使い方 | 画像(`C:\LocalAI\画像`) | 備考 |
|---|---|---|
| M1・M1 Pro・M1 Max(photo)、M1 Ultra(reuse) | `FCBl1gcWEAUOdRw.jpg`(Locuza 注釈)、縦横比・外形は `Figure3_M1_family_chip_photo_comparison_20220516-1-1024x592.png` の寸法注記 | M1 Max は注記 19.3×22.4 mm(0.86)を優先。Ultra は Max を上下 2 つ(0.43) |
| M2・A15(photo) | `69502024-a55e-4ceb-bbd4-0cf1193153d8_1024x421.jpg`(中身 WebP でなく JPEG。Locuza / SemiAnalysis 注釈) | 低解像度で大まかな配置 |
| M2 Pro(photo) | `FmsTp7NWIAAfVjB.jpg`(High Yield 注釈) | |
| M2 Max(reuse)、M2 Ultra(reuse) | **M2 Max 自身の写真なし**。M2 Pro の配置を土台にした模式 | 根拠: ユーザーが提示した Apple 公表の比較(M2 Pro → M2 Max: GPU コア 最大 19→38 で 2 倍、メモリ帯域 200→400GB/s で 2 倍、CPU コア 最大 12 で同じ、メディアエンジン ビデオエンコード・ProRes エンコード 1→2 で 2 倍、トランジスタ 400 億→670 億)。[公表]。GPU・SLC・メモリ PHY を縦に 2 倍、CPU 側は同じにし、面積合わせの Media 追加分の帯を下に足した(帯の大きさは模式) |
| M3・M3 Pro・M3 Max(photo) | `A3QSjPxt4oYcYuy8i6kRtX-1200-80.jpg`(中身 WebP。High Yield 注釈) | M3 Pro・M3 Max はプリセットにコア構成が無く、コアの枠は「構成未取得」の飾り |
| M4(photo) | `GQmKpHhWwAAMHfw.jpg`(Frederic_Orange 注釈) | 画像内の寸法注記 "1.28mm x1,21mm" は単位が誤りで使わない |
| M5(photo) | `HS9wa9vbgAAb2Mm.jpg`("Apple Silicon M5 \| TSMC N3P")。`HT9pyHnWYAAM3HY.jpg`(ファイル名は "m6"。semianalysis の透かし)は **M5 の配置とほぼ一致する別画像 = M5 として記録**(座標は #8 を使用) | |
| A14(photo) | `CfQArDx7gRsAo3U5xpXsTC-750-80.png`(中身 WebP。A14 & M1 Die Photos) | 低解像度・ラベルのみ |
| **今回は使わず記録のみ** | `HT2YKyUXsAA60ya.jpg`(SemiAnalysis の透かし。P-Core 4 + S-Core 2 + E-core 6、GPU 12 コア、縦横比 約 1.14。**チップ名の記載なし**) | **M6 の可能性があるが確定できず、M6 のプリセットも無い**ので使っていない。確定したら `apple-images.md` の対応表に足す |
| 使わない | `0_xSrDbHu5rDBXfqDp.jpg`(M5 Max/Ultra の想像図)、`l_tm1989_m1pro_max_05.jpg`・`tm1989_m1pro_max_13.jpg`(Apple の模式図)、`HJ2AUyOakAAixSS.jpg`・`HJ2AUyNaIAEinLl.jpg`(M5 Pro のタイル。プリセット無し)、`image-1793455459066.jpg`(Apple ではなく Intel の 12900K 系) | |

プリセットの面積は変えない(画像の面積注記との小差は `apple-images.md` の (c) に記録)。出典 URL はファイル名・透かし・X の投稿 ID からの**推定**で、確定ではない。

## Apple A シリーズの画像の受領(2026-11-02。詳細は `apple-a-images.md`。区分は [二次]。出典は全件「推定・要ユーザー確認」)

| プリセット | 画像(`C:\LocalAI\画像`) | 備考 |
|---|---|---|
| A12 | `A12_575px.jpg`(TechInsights + AnandTech 注釈、678×571) | チップ名は画像内に無い。低解像度で区画を 2・4 に分けた推定 |
| A13 | `A13_die.jpg`(TechInsights + Andrei 注釈、678×585) | 同上 |
| A15(置き換え) | `左がA16 02820a31-…_1736x1307.jpg` の**右半分**(TechInsights。スケールバー 2.0 mm) | チップ名は画像内に無く、ユーザー申告で A15。右端・下端が切れている可能性。従来の `69502024-…jpg` の A15 より鮮明なので置き換え。A14 は既存の `CfQArDx7…png` のまま |
| A16 | 同ファイルの左半分(Angstronomics 注釈)+ `a16-hd.jpg`(ラベルなし。縦横比 0.619 を採用) | 注釈画像の 0.671 との 8% 差は、ダイ縁まで写る a16-hd を優先 |
| A17 Pro | `A17-Pro-die-shot_3.jpg`(注釈)+ `a17pro.jpg`(ラベルなし) | **チップ名はファイル名のみ**。NPU の注記なし |
| A18・A18 Pro | `HighYield-A18-Pro.jpg`(HighYield / ChipWise 注釈。画像内に出典 URL)+ `A18.jpg`・`A18P.jpg`(ラベルなし。縦横比 0.664 / 0.649) | 画像内の面積 90 / 105 mm² とプリセット 92.4 / 109.7 の差は記録のみ |
| A19 Pro | `A19 Pro8.03x12.29x0.23mmdieshot.jpg`(Kurnal) | 寸法はファイル名のみ。LPE コア 2 は飾り |
| A20 Pro | `A20Pro-8.00x12.35x0.67.jpg`(Kurnal) | **チップ名・寸法はファイル名のみ**。LPE コアは飾り |

座標は各画像の表示ピクセルから目測(±5〜10%)。大きい画像(A19 Pro・A20 Pro)は縮小コピーで読んだ(元ファイルは変更していない)。

## ユーザーの補足
- Zen 3(5950X)と Zen 4 / Zen 5(7950X・9950X)は構造が同じ。ただし Zen 4 以降は IO ダイに iGPU が加わる(ユーザー談。調査メモでの裏付けは別途)。

## Intel タイル型の注釈つきダイ写真の受領(2026-11-03。`C:\LocalAI\画像`。区分 [二次]。出典 URL は未申告=推定・要ユーザー確認)

詳細は [intel-tile-images.md](intel-tile-images.md)。

| 画像 | 実寸 (px) | 内容 | 反映先 |
|---|---|---|---|
| `MTL_annotated.jpg` | 13000×6470 | Meteor Lake 全タイル(Compute・SoC・GPU・IO) | 185H の Compute(photo) |
| `ARL_LQ_annotated.jpg` | 2220×1834 | Arrow Lake 全タイル | 配置の相互確認 |
| `arrow lake cpudie al3.jpg` | 3231×1816 | Arrow Lake Compute タイルの拡大(P #1〜#8、E クラスタ #1〜#4) | 285K(photo)、265K・275HX(reuse) |
| `Intel-Arrow-Lake-8P+16E-Tiles-Die-Shot.jpg` | 2075×1130 | パッケージ上のタイル配置+注釈写真 | 3D 配置は現状維持(記録のみ) |
| `LNL_Package_Annotated.jpg` | 6742×6850 | Lunar Lake パッケージ(Compute・Platform Controller・LPDDR5X) | 268V(photo)、258V・256V(reuse) |
| `panther-lake-computex26-die-annotated.jpg` | 971×1717 | Panther Lake の Compute タイル(Kurnal 全体図の Compute を回して反転した向き) | 388H(photo)、386H・378H・358H(reuse。「Xe3 4 コア版」とした 2026-11-03 の当初の解釈は誤りで、ユーザーの説明により訂正) |
| `dh0gWbF8gG9AXfQw.jpg`(Kurnal) | 2501×2000 | Panther Lake の全体図(Compute・12Xe の GPU・Platform の 3 タイル) | ptl-compute の枠(横向き)と、12Xe の GPU(388H・378H・358H)・Platform タイル(386H 含む 4 件)の飾りのダイ(decorDies) |
| `1lgodfRzmK0H3DUG.jpg`(SemiAnalysis) | 1142×960 | 4P+4LPE 系の小さい Compute タイル(非 X 向けと推定) | プリセット無し。記録のみ |
| `zsALH81651iOGldG.jpg`(SemiAnalysis) | 2409×960 | Xe3 4 コアの GPU タイル(左)と 12 コアの GPU タイル(右) | 縦横比の相互確認。4 コア版は記録のみ |
| `Wildcat-lake-computex26-series3-die-annotated.jpg` | 1182×1427 | Wildcat Lake | プリセット無し。記録のみ |
| `863ef392-…_1024x674.jpg` | 1024×674 | Raptor Lake/Redwood Cove の die shot(Locuza) | コア内部の参考のみ |

拡張子は .jpg だが MTL・ARL_LQ・LNL・Panther Lake・Wildcat Lake・`863ef392-…` の 6 枚は中身が WebP。依頼文の画素数は MTL・ARL_LQ・LNL の 3 枚で入れ替わっていた。実ファイルの寸法を上表に記載。

## AMD のダイ写真の受領(2026-11-03。`C:LocalAI画像`。区分 [二次]。出典 URL は、ユーザーから申告のあったものはなく、画像内に出典の記載があるもの(Cezanne の flickr URL)と、ファイル名・透かしからの推定(Strix Halo の Kurnal のページ URL)だけ。それ以外は「出典未取得」。座標は表示ピクセルからの目測 ±5〜10%)

寸法はファイル名の表記を根拠に採用(既定の方針)。画像内に実寸の注記があるものは無い。

| 画像 | 実寸 (px) | 判定したチップ | 内容 | 反映先 |
|---|---|---|---|---|
| `Zeppelin_annotated.jpg` | 19700×8660(縦横比 2.275) | **Zeppelin(Zen 1 / Zen+)** | 注釈つき。左の CCX(Zen 1 コア ×4・L2 512K・L3 8M)、右の CCX(「CCX」とだけ注記)、128bit DDR4 PHY、UMC、IFOP PHY、IO Root、PSP、USB など | 1800X・1500X・1200(photo)、2700X・2600X(reuse。Zen+ は同設計の 12nm 版として流用) |
| `RavenRidge_annotated.jpg` | 10461×5945(1.759) | **Raven Ridge** | 注釈つき。1 CCX(コア ×4・L2・L3 4M)、Vega の Compute Unit ×(10+)、ROP・Rasterizer・Display・PCI-E x12・USB など | 2400G・2200G(photo。2200G は同じダイで GPU 8CU 有効) |
| `Cx4d2xiOUBzlnMX4.jpg` | 994×960(ダイ部 994×918、縦横比 1.083) | **Cezanne**(Locuza 注釈、2021-08。ダイ写真は Fritzchens Fritz。画像内に flickr の出典 URL) | コア 4+4(上下 2 段)、中央 L3(注記は 8MB)、Vega の GPU、PHY | 5800U(photo) |
| `Rembrandt-R-12.84x16.25.jpg` | 4275×5415(0.790 = 12.84/16.25) | **Rembrandt-R**(ファイル名) | **注釈なし**。上に CCX(左右 4 コア + 中央 L3)、下は GPU などだが判別せず | 7735HS(photo。CCX だけ。残りは未判別の飾り) |
| `zen4-Phoenix1-15.91x11.11x0.35mm.jpg` | 4439×6358(0.698 = 11.11/15.91) | **Phoenix 1**(Zen 4。ファイル名) | **注釈なし**。上に CCX(左右 4 コア + 中央 L3)。ユーザー注記のとおり Phoenix 1 の注釈つきは無い | 7840HS(photo。CCX だけ。残りは未判別の飾り) |
| `AMD-Phoenix-2-Die-Shot-annotated.preview.jpg` | 640×382 | **Phoenix 2**(Zen 4 ×2 + Zen 4c ×4、GPU 4CU。注釈つきの低解像度プレビュー) | Zen 4 ×2・Zen 4c ×4・16MB L3・GPU・WGP・メモリコントローラ・Media Engine・PCIe・USB・Display | **プリセット無し(別ダイ)。記録のみ** |
| `Strix-Halo-All-16.02x19.20.jpg` | 6724×8237(1633×2000 表示) | **Strix Halo**(ファイル名・Kurnal の透かし) | 上に Zen 5 CCD ×2(各 約 767×625 px、180° 回転した向き。Zen Core #1〜#8・L3 32MiB・IFOP with TSV)、下に SoC ダイ(縦横比 1.195 = 19.2×16.02 mm)。SoC は GPU L2 ×8・RDNA 3.5 WGP #1〜#20・NPU(XDNA)・MALL 16MiB ×2・メモリ PHY・Media Engine ×2・Display・PCIe 4.0 x16・USB4 など | Strix Halo の SoC ダイ(photo、飾り)と CCD の比(photo)。SoC の 16.02×19.20 = 307.6 mm² はプリセットの面積と一致 |
| `FH9oQiNXEAAwTeZ.jpg` | 900×506 | **Rembrandt のモックアップ**("6nm Rembrandt die estimate, die size according to Patrick Schur 208.33 mm²"。Cezanne・Navi22 の写真の要素を組んだ Locuza の 2021-12 の想像図) | 実物の写真ではない。実物(Rembrandt-R の写真)と配置が違う | **使わない**(想像図) |
| `5cac7a55-463a-44db-a5a4-af985c35cc05_2434x1656.jpg` | 2434×1656(ファイル名の表記。中身は WebP らしく Windows の画像 API では読めず、表示は Read で確認) | **Intel Alder Lake-S2(6+0)のモックアップ**(Locuza、2022-08) | Golden Cove ×6・L3 3MiB ×6・iGPU 16EU など。**AMD ではない** | **記録のみ**(12100 の x86-mono は schematic のまま。反映は別途ユーザー判断) |
| `delidded.jpg` | 1420×1000 | **Ryzen 7000(Raphael)のパッケージ図**(Zen 4 CCD ×2 + Client I/O Die。AMD の公式図の転用) | 蓋を外した模式図。ダイ内の配置は無い。CCD 5nm 8c、IOD 6nm・iGPU のラベル | **記録のみ**(Raphael の CCD は既存の reuse。ダイ内配置の根拠にならない) |
| `GNR_Package_Annotated.jpg` | — | **Intel Granite Rapids**(ユーザー指示。画像は今回は開いていない) | Intel | **記録のみ**(AMD ではない) |

- **EPYC 7401**: Zeppelin 4 個(各 6 コア有効 = 3+3)に同じ写真の枠が使えるが、`design.fromPreset`・`relayoutCompute` は「コアとブロックを持つ最初の 1 ダイ」だけを扱い、4 ダイへのコア配分が未対応のため、従来の配置のまま。実装するなら別作業(ダイごとのコア数配分の追加が要る)。
- **Phoenix 2・Locuza の Rembrandt モックアップ・Intel の 2 枚・delidded.jpg**: プリセットの配置には使っていない。
- **注釈なしの 2 枚(Rembrandt-R・Phoenix 1)**: 写真から構造が読める CCX(コア ×8 + L3。縦の区切り線から 4 行)だけ置いた。GPU・NPU・PHY は注釈が無く推測しないため、残りは 1 種類の「未判別」の飾りの 4 枠(`rest-l/r/t/b`)。写真の注釈つきが入ったら置き換える。
- Zeppelin の縦横比 2.275 は写真から(213 mm² で 22.0×9.7 mm)。AMD の CCX 44 mm² に対し、写真の CCX 1 つの面積比 約 20.5% は 43.7 mm² で整合(テストで ±10% を確認)。Raven Ridge の CCX(コア + L3 4M)は 18.9% ≈ 39.7 mm²。
