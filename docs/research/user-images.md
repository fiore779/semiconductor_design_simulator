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
| `1lgodfRzmK0H3DUG.jpg`(SemiAnalysis) | 1142×960 | 4P+4LPE 系の小さい Compute タイル(非 X 向けと推定) | プリセット無し。記録のみ(4P+4LPE の枠 `ptl-compute-4p4lpe` は `Panther Lake_dies.jpg` から作り、2026-11-04 に Core Ultra 5 325 が使う) |
| `zsALH81651iOGldG.jpg`(SemiAnalysis) | 2409×960 | Xe3 4 コアの GPU タイル(左)と 12 コアの GPU タイル(右) | 縦横比の相互確認。4 コア版は記録のみ |
| `Wildcat-lake-computex26-series3-die-annotated.jpg` | 1182×1427 | Wildcat Lake(compute die 単体と判断) | 2026-11-04 に Core 5 320 の枠 `wcl-compute`(photo)。下の「Wildcat Lake のダイ写真の反映」 |
| `863ef392-…_1024x674.jpg` | 1024×674 | Raptor Lake/Redwood Cove の die shot(Locuza) | コア内部の参考のみ |

拡張子は .jpg だが MTL・ARL_LQ・LNL・Panther Lake・Wildcat Lake・`863ef392-…` の 6 枚は中身が WebP。依頼文の画素数は MTL・ARL_LQ・LNL の 3 枚で入れ替わっていた。実ファイルの寸法を上表に記載。

### Panther Lake の 3 構成(`Panther Lake_dies.jpg`。2026-11-04 受領)
ユーザー提供の 542×350 px(JPEG)。**出典 URL は未申告。Intel の資料由来の可能性があるが未確認**。画像はダイ写真風の着色画像(写真か描画かは未確認)で、縮尺の注記はない。左から「4P+4LPE+4Xe」「4P+8E+4LPE+4Xe」「4P+8E+4LPE+12Xe」の 3 パッケージ。各構成とも、上に Compute タイル(左の大きなブロック)、その右に Platform タイル(縦長)、下に GPU タイル(左下の横長ブロック)で、右下と(中・右は)右上に無地の灰青のブロック(フィラー。実チップの詰め物と解釈。機能の根拠なし)がある。
目測は表示ピクセル(元ファイルを 3 倍に拡大して 10px 格子で読んだ。±2px)。

| 構成 | Compute(幅×高さ) | Platform | GPU(幅×高さ) | 無地ブロック |
|---|---|---|---|---|
| 4P+4LPE+4Xe(左) | 112×162 | 53×162(Compute と下端が揃う) | 111×45 | 右下 53×45 |
| 4P+8E+4LPE+4Xe(中) | 111×198 | 53×161 | 111×45 | 右上 53×36・右下 53×45 |
| 4P+8E+4LPE+12Xe(右) | 110×198 | 53×161 | 110×93 | 右上 53×37・右下 53×93 |

- 中と右の Compute は同じ(4P+8E+4LPE。幅 110〜111・高さ 198。縦横比 0.56 が Kurnal の 115.1 mm² の Compute 14.27×8.06 mm の 0.565 と一致)。左の Compute(4P+4LPE)は E クラスタが無く、高さが 162 で中の 0.82 倍(E の帯 約 36px 分短い)。幅は同じ。
- 縮尺は Compute(115.1 mm²。プリセット値)に合わせると約 13.9 px/mm。GPU 12Xe は 110×93 = 7.9×6.7 mm(Kurnal 6.78×8.14 の回転)= 約 54 mm²(Kurnal 55.2 に対し約 -2%)。Platform 53×161 = 3.8×11.6 mm = 約 44 mm²(Kurnal 12.44×4.0 = 49.8 に対し約 9〜12% 小さい。長辺 -7%・短辺 -4%)。4Xe の GPU は 111×45 = 8.0×3.2 mm = 約 26 mm²(12Xe の高さ比 0.49)。**画像と Kurnal の値は GPU で一致、Platform は 12% 以内**。画像の縮尺は未確認(着色画像)。
- 反映: 386H の飾りのダイに 4Xe の GPU タイル(3.29×8.14 mm = 約 26.8 mm²。12Xe の Kurnal 値に画像の高さ比 0.485 を掛けた[推定]。`sizeBasis` に「出典未確認」と記載)。388H・378H・358H(12Xe、Kurnal 二次値)と Platform タイルは変更なし。左の 4P+4LPE の Compute は枠(`ptl-compute-4p4lpe`。E 帯を除き縦横比 1.446)だけ追加。**対応するプリセットは無い**(ダイの面積も未取得)。評価・面積合計には影響しない。

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
| `delidded.jpg` | 1420×1000 | **Ryzen 7000(Raphael)のパッケージ図**(Zen 4 CCD ×2 + Client I/O Die。AMD の公式図の転用) | 蓋を外した模式図(レンダリング。縮尺保証なし)。ダイ内の配置は無い。CCD 5nm 8c、IOD 6nm・iGPU のラベル | **2026-11-04 反映**: IOD の位置・縦横比の目測(下の節)。Raphael の CCD 内は既存の reuse のまま(ダイ内配置の根拠にならない) |
| `GNR_Package_Annotated.jpg` | 8681×8678 | **AMD Zen 5(Granite Ridge)の蓋なしパッケージ写真**(注釈つき。2026-11-04 訂正: 以前の「Intel Granite Rapids」は誤記) | IOD: PCIe 5.0 x16 PHY・PCIe Root・Display Engine・Media Engine・メモリコントローラ・128bit DDR5-5600 PHY・IFOP PHY ×2・GPU 注釈。CCD: Zen 5 コア ×8・L3 32MB・IFOP PHY・SMU | **IOD の縦横比・位置に反映(2026-11-04)**。Zen 5 の CCD 内の配置は今回は変更しない |
| `Zen4_Core_annotated.jpg` | 9143×4320 | **Zen 4 コア 1 つ + L2 の拡大注釈**(CCD 全体ではない)。幅は左約 70% がコア、右約 26% が L2 1MB(512KB ×2)、下に CPL | コア内部の注釈 | **記録のみ**(CCD 内の配置の根拠にならない。core+L2 の幅比 約 70%:26% は参考) |

- **IOD の位置合わせ(2026-11-04。ユーザー談「IO ダイは Zen 4/5 共通」)**: Raphael(7700・7950X)と Granite Ridge(9700X・9950X)の IOD に同じ値を当てた(`floorplan.js` の `IOD_PLACE`、`design.js` の `arrangeChiplet`)。ダイ面積は未取得のまま(仮の 100 mm² 相当で縦横比だけ決める)。評価(ST/MT/面積/電力)は全プリセットで不変。ただし熱マップの電力按分(100W 時 CCD/IOD)は IOD が正方形でなくなるため 0.4〜0.65 ポイント変わる(7700 76.16/23.84→75.51/24.49、7950X 86.46/13.55→86.04/13.96、9700X 75.76/24.24→75.11/24.89、9950X 86.20/13.80→85.78/14.22。評価には影響しない)。
  - `delidded.jpg`(表示=実寸 1420×1000)の目測: CCD ×2 は x 490〜980・y 203〜358(1 枚 約 245×155 px、間隔 約 3 px)、IOD は x 588〜890・y 455〜675(302×220 px = 縦横比 1.37)。CCD 下端と IOD 上端の隙間 97 px(CCD 高さの 0.63 倍。ただし図中の文字「Infinity Fabric over Package」を含む)。IOD の水平中心 739 と CCD ペアの中心 735 はほぼ一致(差 約 1%)。
  - `GNR_Package_Annotated.jpg`(表示 1932 基準): IOD x 665〜1270・y 565〜1030(605×465 = 縦横比 1.30)、CCD(1 つ)x 972〜1408・y 1208〜1580(436×372)。隙間 178 px(CCD 高さの 0.48 倍)。IOD の水平中心 967、CCD の中心 1190(実写の向きで CCD が IOD の右寄り。ずれは IOD 幅の 0.37 倍)。**この実写は delidded.jpg と 180° 向きが違う**(実写はピン 1 の三角が左上、delidded は右下)。実装は delidded の向き(CCD 上・IOD 下)なので、実写を 180° 回した位置で当てる = CCD 1 つのとき CCD は IOD の左寄り(IOD は CCD の右寄り)。
  - 2 つの縦横比(1.37 と 1.30)は差 約 5%。レンダリングより**注釈つき実写を優先**し、縦横比 1.30・隙間 0.48・CCD 1 つのときの水平ずれ +0.37(IOD 幅比。delidded の向きで IOD が CCD の右寄り。実写の 180° 回転後の値)・CCD 2 つは中央揃いとした。
  - 面積比の照合: IOD/CCD の面積比は delidded.jpg 1.75(302×220 ÷ 245×155)、実写 1.73(605×465 ÷ 436×372)。公表値(Raphael IOD 約 122〜125 mm²、CCD 約 70 mm² → 約 1.75。プリセットに IOD の面積は無く、公表値は記憶による参考)と一致。縮尺は図の比と大きくずれない。
  - `iodBlocks`(SoC / I/O + iGPU 飾り)の内部配置は注釈つき IOD に合わせていない(ブロックの種類・個数を変えない方針。今回は縦横比とダイ間の位置のみ)。
  - Zen 5 の CCD の recipe は変えていない。Zen 4 CCD の recipe の `scaleNote` は「IOD の位置・縦横比を写真の目測で合わせた。CCD 内は Zen 3 写真の流用」と記載(basis は reuse)。

- **EPYC 7401**: Zeppelin 4 個(各 6 コア有効 = 3+3)に同じ写真の枠が使えるが、`design.fromPreset`・`relayoutCompute` は「コアとブロックを持つ最初の 1 ダイ」だけを扱い、4 ダイへのコア配分が未対応のため、従来の配置のまま。実装するなら別作業(ダイごとのコア数配分の追加が要る)。
- **Phoenix 2・Locuza の Rembrandt モックアップ・Intel の 2 枚・Zen4_Core_annotated.jpg**: プリセットの配置には使っていない(delidded.jpg・GNR_Package_Annotated.jpg は IOD の位置・縦横比にのみ使用)。
- **注釈なしの 2 枚(Rembrandt-R・Phoenix 1)**: 写真から構造が読める CCX(コア ×8 + L3。縦の区切り線から 4 行)だけ置いた。GPU・NPU・PHY は注釈が無く推測しないため、残りは 1 種類の「未判別」の飾りの 4 枠(`rest-l/r/t/b`)。写真の注釈つきが入ったら置き換える。
- Zeppelin の縦横比 2.275 は写真から(213 mm² で 22.0×9.7 mm)。AMD の CCX 44 mm² に対し、写真の CCX 1 つの面積比 約 20.5% は 43.7 mm² で整合(テストで ±10% を確認)。Raven Ridge の CCX(コア + L3 4M)は 18.9% ≈ 39.7 mm²。

## Snapdragon のダイ写真の受領(2026-11-03。`C:\LocalAI\画像`。区分 [二次]。座標は表示ピクセル〔最大辺 1600 px に縮小したコピー〕からの目測 ±5〜10%。元ファイルは変更していない)

出典 URL は、ユーザーの `必要な画像リスト.md`(優先 9)に並ぶ Kurnal Insights のページを**チップ名・SM 型番で対応づけた候補**(ページ本文は未取得)。ファイル名の SMxxxx・数値は根拠として採用(既定の方針)。全て真の JPEG。画像内の透かしは `@Kurnal`(+ 中国語の透かし。ファイルにより異なる)。

| 画像 | 実寸 (px) | 判定したチップ・注釈 | 出典(URL 候補) | 反映先 |
|---|---|---|---|---|
| `855 sm8150.jpg` | 5670×5925 | **855(SM8150)**。注釈つき(Kryo 485: A76 2.84GHz ×1 + 2.42GHz ×3、A55 ×4、L3 2+1+1MiB、SLC 3MiB、Adreno 640、Baseband X24、Hexagon 690?、Spectra 380) | https://kurnal-insights.com/en/dieshot/dieshotqualcomm-snapdragon-855sm8150/ | qc-855(photo) |
| `865 sm8250.jpg` | 5674×6695 | **865(SM8250)**。注釈つき(A77 2.84GHz ×1 + 2.42GHz ×3、A55 ×4、L3 4MiB、SLC 3MiB、Adreno 650、Hexagon DSP+VPU665、Spectra 480) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-865/ | qc-865(photo) |
| `SM8350.jpg` | 6760×6998 | **888(SM8350)**。注釈つき(X1 2.84GHz ×1、A78 ×3、A55 ×4、L3 4MiB、SLC 3MiB、Adreno 660、X60 モデム、Hexagon 780) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-888sm8350/ | qc-888(photo) |
| `720g sm7125.jpg` | 5594×6023 | **720G(SM7125)**。**注釈なし**(コアの位置が読めない) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-720gsm7125/ | **反映しない(未判別)** |
| `SD780G sm7350.jpg` | 8709×10893 | **780G(SM7350)**。**注釈なし** | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-780gsm7350/ | **反映しない(未判別)** |
| `Snapdragon 8 Gen1（左）と8+ Gen1のダイショット（右）v2-…_1440w.jpg` | 1440×778(1 枚に 2 チップ) | **左 = 8 Gen 1**(TechInsights の写真 + xian333c の Floor Plan。X2・A710 ×3・A510 ×4、L3 4×1.5MiB、SLC 4×1MiB、Adreno 730)。**右 = 8+ Gen 1**(知乎 @Michael Yeh の透かし、TechInsights の透かし。**注釈なし**。GPU の外形線だけあり、ダイの配置は左と異なる = 別のダイ) | https://zhuanlan.zhihu.com/p/597438689(候補) | 左: qc-8gen1(photo)。右: 反映しない |
| `sm8550Dieshot.jpg` | 7631×7222 | **8 Gen 2(SM8550)**。注釈つき(X3、A715 / A710、A510、L3 2MiB ×4、SLC 6MiB、Adreno 740、X70 モデム) | https://kurnal-insights.com/dieshot/qualcomm-snapdragon-8gen2sm8550/ | qc-8gen2(photo)。A510 は写真の注釈どおり「2core cluster」を 2 等分した 2 枠 + 「1core」の 1 枠(2 等分は写真に境界が無く目測)。中間コアの A715 / A710 の割当は区別しない |
| `8CXG3.jpg` | 7094×7832 | **8cx Gen 3(SC8280XP)**。注釈つき(Kryo 680 Prime X1 ×4 3.0GHz、Gold A78 2.42GHz〔注釈は 3 つ〕、L3 8MiB、Adreno 690、Hexagon V73 + Tensor) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8cxgen3sa8295psc8280/ | qc-8cx-gen3(photo)。A78 の 4 つ目〔左上の枠〕は写真の注釈が「System Level Cache 512KiByte」で、構造が A78 と似ているため 4 つ目の A78 と推定(注釈と食い違う) |
| `sn7450Kurnal.jpg` | 7472×6535 | **7 Gen 1(SM7450)**。注釈つき(A710 HP 2.5GHz ×1、HD 2.36GHz ×3、A510 2 コア ×2、L3 2MiB、SLC 2MiB、Adreno 644、X62 モデム) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-7gen1sm7450/ | qc-7gen1(photo) |
| `sd6gen1-sm6450-6.67x8.08.jpg` | 8702×7198(ファイル名の寸法 6.67×8.08 mm = 53.9 mm² = プリセット) | **6 Gen 1(SM6450)**。**注釈なし** | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-6gen1-sm6450/ | ブロックは反映しない(未判別)。**縦横比だけ採った(2026-11-04。幅/高さ 8.08/6.67 = 1.2114。画像 8702×7198 = 1.209 は横長で、ファイル名の後ろの値が横)** |
| `SM8650.jpg` | 7575×6335 | **8 Gen 3(SM8650)**。注釈つき(X4 3.30GHz、A720 Gold 3.15GHz ×3 + 2.96GHz ×2、A520 ×2、L3 12MiB、SLC 6MiB、Adreno 750、X75 モデム) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8gen3/ | qc-8gen3(photo) |
| `sd4gen2-sm4450-6.32x6.38.jpg` | 6896×6827(6.32×6.38 mm = 40.3 mm² = プリセット) | **4 Gen 2(SM4450)**。**注釈なし** | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-4gen2-sm4450/ | ブロックは反映しない(未判別)。**縦横比だけ採った(2026-11-04。6.38/6.32 = 1.0095。画像 6896×6827 = 1.0101)** |
| `SM8750shuiying.jpg` | 7961×7039 | **8 Elite(SM8750)**。注釈つき(Phoenix L 4.32GHz、Phoenix M ×6 3.53GHz、L2 12MB ×2、SLC 8MB、Adreno 830、X80 モデム、Hexagon V79) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8elitesm8750/ | qc-8elite(photo)。Phoenix L の 2 個は写真の 1 つの帯を左右 2 等分した推定 |
| `SD7gen3 sm7550 6.43x8.58.jpg` | 6941×9251(6.43×8.58 mm = 55.2 mm² = プリセット) | **7 Gen 3(SM7550)**。**注釈なし** | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-7gen3sm7550/ | ブロックは反映しない(未判別)。**縦横比だけ採った(2026-11-04。6.43/8.58 = 0.7494。画像 6941×9251 = 0.7503 は縦長)** |
| `7gen3+&8Sgen3.jpg` | 5307×6764 | **7+ Gen 3(SM7675)と 8s Gen 3(SM8635)の共通のダイ**(画像内に両チップ併記)。注釈つき(X4 3.0/2.8GHz、A720 ×4 2.8/2.61GHz、A520 ×3〔2 コア + 1 コア〕、L3 4MiB、SLC 3584KiB、Adreno 735/732、X70/X62 モデム)。クロック表記は 8s Gen 3 の 3.0GHz と 7+ Gen 3 の 2.8GHz の両方を併記 | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-7gen38sgen3sm7675sm8635/ | qc-7plus-gen3・qc-8s-gen3(**どちらも photo**。同じダイで、プリセットの面積 89.5 mm²・プロセス N4 も同じ。1 枚の写真が両チップのダイ自身) |
| `8Gen5.jpg` | 9386×5915 | **8 Gen 5(SM8845)**。注釈つき(Oryon 3rd L ×2 3.8GHz、E ×6 3.32GHz、Adreno 829、X80 モデム)。ユーザー注記「参考」 | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8gen5sm8845/ | **プリセット無し。記録のみ**。ファイル名と画像内の表記(3.8GHz / 3.32GHz)から判定し、8 Elite Gen 5 ではない |
| `8EliteG5 Dieshot.jpg` | 6309×5588 | **8 Elite Gen 5(SM8850)**。注釈つき(Oryon 3rd L ×2 4.61GHz、M ×6 3.63GHz、L2 12MiB ×2、SLC 8MiB、Adreno 840、X85 モデム) | https://kurnal-insights.com/en/dieshot/qualcomm-8elite-gen5sm8850/ | qc-8elite-gen5(photo)。**8Gen5.jpg と取り違えない**(4.61GHz のほうが 8 Elite Gen 5 = プリセットの P クロック 4.61 と一致) |
| `8sGen4.jpg` | 7451×4711 | **8s Gen 4(SM8735)**。注釈つき(X4 3.21GHz、A720 3.01GHz ×3・2.8GHz ×2・2.02GHz ×2、L3 8MiB、SLC 6MiB、Adreno 825、X75 モデム) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8sgen4sm8735/ | qc-8s-gen4(photo)。プリセットのクロック(3.21 / 3.0 / 2.8 / 2.02)と一致 |
| `SM8975.jpg` | 8531×7396 | **8 Elite Extreme Gen 6(SM8975)**。注釈つき(Oryon-L ×2 5.01GHz、Oryon-M ×6〔4.03GHz ×3 + 3.74GHz ×3〕、L2 16MiB、SLC 8MiB、Adreno 850、X105 モデム) | https://kurnal-insights.com/en/dieshot/qualcomm-8elite-extreme-gen6sm8975/ | qc-8elite-x-gen6(photo) |
| `XEDieshoty.jpg` | 6460×6701 | **Snapdragon X Elite / X Plus(X1E。同じダイ)**。注釈つき(Oryon ×12〔3 クラスタ ×4〕、Adreno 741 表記の GPU、Hexagon V73 +Tensor、PCIe 4.0 x8 ほか) | https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-x-elitex-plusx1e/ | **プリセット無し。記録のみ**。X2 系の画像は無い |

- **7 Gen 4(qc-7gen4)**と MediaTek・NVIDIA の画像は無い(未反映)。
- **反映した 14 件の根拠は photo**(自分のダイ自身の写真)。reuse にした件は無い: 7+ Gen 3 と 8s Gen 3 は、画像内の両チップ併記(X4 3.0/2.8GHz・A720 2.8/2.61GHz のクロック、Adreno 735/732、モデム X70/X62)、ファイル名(7gen3+&8Sgen3)、URL の綴り(sm7675sm8635)、プリセットの面積・プロセスの一致(89.5 mm²・N4)から同じダイと判断し、流用ではなく、流用ではなく同じダイの photo と判断した(別ダイなら reuse にする)。8+ Gen 1 は 8 Gen 1 と別のダイ(Samsung 4nm と TSMC N4。右半分の写真は配置が違う)なので 8 Gen 1 の流用にもしていない。
- **ブロックを反映しなかった 7 件**: 720G・780G・8+ Gen 1・6 Gen 1・4 Gen 2・7 Gen 3(注釈なしでコアの位置が読めない。推測しない)、7 Gen 4(画像なし)。AMD の注釈なしの写真(Rembrandt-R・Phoenix 1)はコア ×8 が CCX の構造として読めたが、Snapdragon の注釈なしの写真は同様に読める構造が無かった。**このうち 6 Gen 1・4 Gen 2・7 Gen 3 は 2026-11-04 に縦横比だけ採った**(下の「縦横比だけ採る拡張」)。従来の配置のまま(layout なし)は 720G・780G・8+ Gen 1・7 Gen 4 の 4 件。
- **プリセットのクロックとの照合**: 8s Gen 4・8 Elite・8 Elite Gen 5・8 Elite Extreme Gen 6・8cx Gen 3・7 Gen 1・855・865 は、注釈のクロック・コア数がプリセットと一致(855 の A76 2.84 / 2.42 / A55 1.8、8 Elite Extreme の L 5.0 / M 4.03・3.74〔プリセットは E 4.0 の 1 値〕など)。
- **座標の特記**: 注釈つきでも注釈から外れる・境界が無い箇所がある: 8 Gen 2 の A510(注釈「2core cluster」を 2 等分した 2 枠 + 「1core」の 1 枠。2 等分は目測。中間コアの A715 / A710 の割当は区別しない)、8 Elite の Phoenix L 2 個(1 つの帯を左右 2 等分した推定)、**8cx Gen 3 の 4 つ目の A78(枠の注釈は「System Level Cache 512KiByte」だが、構造が A78 と似ているため A78 と推定。注釈と食い違う)**、7 Gen 1 の A510 2 コアを 2 つずつに区切った点、8 Elite Extreme Gen 6 の GPU は Slice #3(GMEM 6MiB を含む)も飾りに含めた。`scaleNote` に記載。L3 は cfg に無い(`l3MB` なし)ので L3 ブロックではなく飾りで置いた。

## MediaTek・NVIDIA のダイ写真の受領(2026-11-03。`C:\LocalAI\画像`。区分 [二次]。座標は最大辺 1600 px に縮小したコピーの表示ピクセルからの目測 ±5〜10%。元ファイルは変更していない)

出典 URL は、ユーザーの `必要な画像リスト.md`(優先 9)に並ぶ Kurnal Insights のページ(T239 は TechPowerUp の記事)を**型番で対応づけた候補**(ページ本文は未取得)。ファイル名の型番・寸法は根拠として採用(既定の方針)。透かしは `@Kurnal`(Dimensity の注釈つき・T239)、`万…`らしい中国語の透かし(8200・Orin・Thor。判読不能。Snapdragon の注釈なし 6 件と同じ系統)、`TECHPOWERUP`(1924-front.small.jpg)。

| 画像 | 実寸 (px) | 判定した内容・注釈 | 出典(URL 候補) | 反映先 |
|---|---|---|---|---|
| `D9000-mt6983.jpg` | 6787×7296 | **Dimensity 9000(MT6983)**。注釈つき(X2 + L2 1MiB、A710 ×3、Dual A510 Cluster、L3 2MiB ×4、DSU-110、SLC 3+3MiB、Mali G710 MP10 #1〜#9、APU 590、M80 5G、MiraVision 790、Imagiq 790、Media Engine、LPDDR5 16bit ×4) | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9000-mt6983/ | mt-9000(photo)。A510 ×4 は「Dual A510 Cluster」を 2×2 に分けた推定。**左下のコア枠は A710 の表記なし(注釈なし)。L2 256KiB の容量と構造から A710 と推定**(A710 の表記があるのは右上・右下の 2 つだけ) |
| `D9200-mt6985.jpg` | 10199×9504 | **Dimensity 9200(MT6985)**。注釈つきだが、コアの表記は A715 @2.85GHz ×2(左下・右下)、2Core Cluster A510 @1.8GHz、右の A510 だけ。**X3 の表記はなく**、右上の枠(L2 1MiB・L1 64KiB の構造)は X3 と推定、左上の枠も注釈なしで A715 と推定。ほか L3 2MiByte ×4、SLC 3M ×2、Mali G715 MC11、APU 690、M80 Baseband、MiraVision 890、Imagiq 890) | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9200-mt6985/ | mt-9200(photo)。注釈なし〔推定〕: 左上の A715 と右上の X3、A510 ×4 は 2 コアクラスタ ×2 を 2 コアずつに分けた推定 |
| `D9300-mt6989.jpg` | 6414×7602 | **Dimensity 9300(MT6989)**。注釈つき(X4 @3.25GHz、X4 @2.85GHz ×3、A720 @2.0GHz ×4、L3 8MiByte、SLC 10MiByte、Mali-G720 MC12 #1〜#12、APU 790、MediaTek M80?、Imagiq 990、MiraVision 990、LPDDR5T) | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9300-mt6989/ | mt-9300(photo)。コアは注釈どおり |
| `D8200-mt6896z-10.27x8.27x0.09mm.jpg` | 7667×6161 | **Dimensity 8200(MT6896Z)**。**注釈なし**(コアの位置が読めない)。10.27×8.27 mm = 84.9 mm² = プリセット、縦横比 1.244(写真 1.244 と一致)。中国語の透かし | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-8200-mt6896/ | ブロックは反映しない(未判別)。**縦横比だけ採った(2026-11-04。10.27/8.27 = 1.2418。画像 7667×6161 = 1.2444)** |
| `D9400-mt6991.jpg` | 8000×7419 | **Dimensity 9400(MT6991)**。注釈つき(X925 @3.62GHz〔プリセットのクロックは 3.63GHz。0.01GHz 差〕、X4 @3.3GHz ×2〔#2・#3。3 つ目は表記なし〕、A720 @2.4GHz ×3〔@2〜@4。4 つ目は表記なし〕、L3 12MiByte、SLC 10MiByte、Mali-G925 MP12、APU 890、5G Modem、imagiq 1090、Miravision 1090、LPDDR5X 5334MHz) | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9400-mt6991/ | mt-9400(photo)。**注釈なし〔推定〕**: 右上の X4 #1(L2 1MiByte の構造から)と、4 つ目の A720(中段の右の枠。注釈は @2・@3・@4 の 3 つだけ。L2 512KiB の構造から) |
| `D9500-mt6993.jpg` | 7531×6339 | **Dimensity 9500(MT6993)**。注釈つき(C1-Ultra @4.21GHz、C1-Premium @3.5GHz ×3、C1-Pro @2.7GHz ×4、L3 4MiB ×4 + 16MiByte、SLC 10MiB、Mali G1-Ultra MP12 @1.7GHz、NPU 990、M90 5G Modem、ImageIQ 1190、Miravision 1190) | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9500-mt6993/ | mt-9500(photo)。コアは注釈どおり |
| `D9600-Pro-MT6995Z-10.47x12.80x0.15mm.jpg` | 8817×7232(横長) | **Dimensity 9600 Pro(MT6995Z)**。注釈つき(C2 Ultra @4.55GHz ×2、C2 Pro @4.35GHz ×3、C2 Pro @3.1GHz ×3、SME ×2、16MiB L3、10MiB SLC、Mali G2 Ultra-MP12 @1.8GHz、NPU 1090、M90 5G Modem、ImageIQ 1290、Miravision 1290)。ファイル名の 10.47x12.80 は縦横の順が逆で、12.80×10.47 = 134.0 mm² = プリセット、比 1.223 = 写真 1.219 | https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9600-pro-mt6995/ | mt-9600pro(photo)。コアは注釈どおり |
| `OrinX.jpg` | 7299×6630(縦横比 1.101) | **Orin(Jetson AGX Orin)**。**注釈なし**。左上に 6 組の対称な構造〔A78AE のクラスタに見えるが 12 コアの対応は読めない〕、右にある規則的な大きな領域〔GPU と思われる〕。中国語の透かし | https://kurnal-insights.com/en/dieshot/nvidia-orin-x/ | **反映しない**(GPU 主体の大型 SoC でコアが読めない) |
| `Thor.jpg` | 8189×5006(縦横比 1.636) | **Thor(Jetson AGX Thor)**。**注釈なし**。左上に緑の大きな規則的領域〔GPU と思われる〕、右側にコア+L2 らしい構造が並ぶが V3AE ×14 の対応は読めない。中国語の透かし | https://kurnal-insights.com/en/dieshot/nvidia-thor/ | **反映しない**(同上) |
| `im1AIk2736qP6cwD.jpg` | 1231×960(縦横比 1.282) | **Switch 2 の T239**。注釈つき(Arm Cortex A78C #1〜#8 〔@?Ghz〕、L3 Cache (share) 2MiByte・4MiByte・2MiByte、GPU TPC #1〜#6〔SM #1〜#8 ほか〕、GPU L2 Cache 1MiB 4×256KiB、PCIe 4.0 x8、64bit LPDDR5T/X、Memory Control)。ファイル名にチップ名なし。`@Kurnal` の透かし。寸法の記載なし | https://www.techpowerup.com/336485/full-die-shot-analysis-of-nintendo-switch-2-soc-indicates-samsung-8-nm-production-origins(URL 候補。画像との対応は未確認) | nv-t239(photo)。A78C ×8 は注釈どおり(左右 4 つずつ)。L3 は注釈の範囲(y 292〜605)の 1 枠にし cfg の 4MB を割り当て(注釈は 2MiB〔上〕・L3 Cache (share) 4MiB・2MiB〔縦書き〕で、4MiB が L3 全体〔2+2〕とも各部分とも読める=**2 通りに読める**。cfg の 4MB と食い違うかは未確定)。縦横比は写真の 1.282(寸法の記載なし。プリセットの 207 mm² に当てはめた) |
| `1924-front.small.jpg` | 508×350 | **EPYC 7401 のパッケージ(蓋なし)**。黒いダイ 4 個が 2×2、周囲に SMD 部品。**注釈なし・ダイの中身が見えない**。`TECHPOWERUP` の透かし。ファイル名の 1924 は TechPowerUp の CPU データベースの ID(c1924)と一致 | https://www.techpowerup.com/cpu-specs/epyc-7401.c1924 | **記録のみ**(中身が見えず、4 ダイへのコア配分も未対応) |

- **反映した 7 件の根拠は photo**(自分のダイ自身の写真)。reuse にした件は無い。Dimensity の cfg はプリセットの P/M/E の 1+3+4(9600 Pro は 2+3+3)で、写真の注釈のクロックとコア数が一致する(9300 の X4 ×4 は P 1 + M 3 の cfg と対応)。
- **プリセットの面積との照合**: 9600 Pro・8200 だけファイル名に寸法があり、プリセットの面積(134.0・84.9 mm²)と一致(8200 の寸法はファイル名のみ)。9000〜9500・T239 は寸法の記載なしで、面積はプリセットのまま、縦横比は写真の枠の比。
- **反映しなかった理由**: 8200・Orin・Thor は注釈なしでコアの位置が読めない(推測しない)。Snapdragon の注釈なし 6 件(720G・780G・8+ Gen 1・6 Gen 1・4 Gen 2・7 Gen 3)と同じ扱い。EPYC 7401 は黒いダイで中身なし。縦横比だけ採る拡張は、8200 だけ 2026-11-04 に実施した(1.2418。下の「縦横比だけ採る拡張」)。Orin(1.101)・Thor(1.636)はファイル名に寸法が無く、未実施(対象外)。
- **推定箇所**: `scaleNote` に記載(9000・9200 の A510 の 2 コア分割、9000 の左下のコア〔A710〕、9200 の左上の A715 と右上の X3、9400 の右上の X4 #1 と 4 つ目の A720、T239 の L3 の枠)。9400 の X925 のクロック 3.62GHz はプリセットの 3.63 と 0.01 差。deco の座標は注釈の領域の目測の外形で、重ならないよう調整した。

## GB10(DGX Spark)のダイ写真の受領(2026-11-03。`C:\LocalAI\画像\GB102in1.jpg`。区分 [二次])

| 画像 | 実寸 (px) | 判定した内容・注釈 | 出典(URL 候補) | 反映先 |
|---|---|---|---|---|
| `GB102in1.jpg` | 9034×3951(縦横比 2.286)。左が S-die・右が G-die の 1 枚 | 左(S-die): ARM X925 #1〜#10(各 @3.9Ghz)、Cortex A725 #1〜#10(各 @2.8Ghz)、L3 Cache 16MiB(4MiB ×4。上)・8MiB(4MiB ×2。下)、SLC 16MiB(1MiB の小区画)、Memory Cache 2MiB ×8、32Bit LPDDR5#1〜#8 Memory PHY、Coherence Hub、Nvidia NPU 4 Core、ISP+Audio DSP、Display Engine、17x Flash、Die to Die Channel、NV-Link、USB4.0・PCIe5.0 x4・PCIe4.0 x4・USB3.0/2.0・MIPI DSI。右(G-die): GPC#1〜#4・TPC#1〜#24・SM の例示・Raster Engine/3D FF ×4・GPU L2 24MiB(1.5MiB ×8 + 12MiB)・NV-Link・Die to Die Channel・NVDEC/NVENC。透かし `@Kurnal` | 出典 https://kurnal-insights.com/en/dieshot/nvidia-gb10/(ファイル名が Kurnal 個別ページの主画像 `/uploads/Nvidia/nvidia-gb10/GB102in1.jpg` と一致。画像内に URL の記載なし。ページ本文は調査担当が取得済み) | `nv-gb10` の S-die(arm-soc の photo。`TILE_FRAMES.gb10`)。G-die は layout なし |

- **寸法と縦横比**: Kurnal のページの寸法(S-die 12.91×16.10 mm、G-die 12.91×13.45 mm、合計 12.91×29.55 mm)は画像と整合する(画像の左右の境目は全幅の約 0.544、16.10/29.55 = 0.545)。S-die の枠は表示 2000×875 の左 1085 px で、縦横比 1.240 は 16.10/12.91 = 1.247 と 1% 以内。面積 207.9 / 173.6 mm² はプリセットの値(Kurnal の寸法の積)。
- **反映した内容(S-die)**: X925 5+5・A725 5+5(上下 2 クラスタ)、L3 2 枠(16MiB・8MiB。cfg の 24MB を重み 2:1 に分ける)、SLC・Memory Cache 2MiB ×8・LPDDR5 PHY・NPU・ISP・Coherence Hub・Display・Die to Die・NV-Link・左端の I/O 列(コア以外は飾り)。ブロックは 44 個。
- **推定箇所**: `scaleNote` に記載(L3 の 16 / 8MB の cfg への当てはめ〔どちらが 16MB かは出典で食い違う〕、SLC の 1MiB 区画を数枠に束ねたこと、Memory Cache 2MiB ×8 と SLC の関係が不明なこと、A725 の小さな枠の目測誤差)。
- **G-die を反映しなかった理由**: 既存の仕組みでは arm-soc に付けられる飾りダイの種類が無く(`decorDies` は iod・gpu-tile・platform-tile で、amd-chiplet・x86-tile の設計だけ)、コアなしの 2 つ目のダイに枠を当てる `SOC_DIE` / `socLayout` は Strix Halo 専用(amd-apu 固定)。G-die は従来どおり面積 173.6 mm² の 1 ブロック GPU。必要な拡張は設計書 §8.1(arm-soc 項の GB10)に記載。

## 縦横比だけ採る拡張(2026-11-04。ユーザー指示「3つ全部」の項目 3。Snapdragon 6 Gen 1・4 Gen 2・7 Gen 3、Dimensity 8200 の 4 件。区分 [二次]・出典 URL 未確認)
- **使い方**: 注釈なしのダイ写真しかなく、ブロックの位置が読めないが、**ファイル名にダイの寸法があり、プリセットの面積と一致する**チップについて、ダイの縦横比(幅/高さ)だけを写真に合わせる。`js/model/floorplan.js` の `ASPECT_ONLY`(preset id → `aspect`・ファイル名・寸法の説明)に足すと、`classify` が frame なしの `arm-soc`・`scaleBasis: 'schematic'`・`layout.aspect` を返し、`design.fromPreset` が `aspectOf(layout)` でダイの幅・高さを決める(面積はプリセットのまま)。ブロックは従来の配置(`layoutCompute`)で、根拠のない模式。新しい対象を足すときは、ファイル名の寸法の積がプリセットの面積と一致し、縦横の向きが画像の実ピクセル比と 1% 以内で合うことを確認する(`tests/floorplan-snapdragon.test.js`・`floorplan-mediatek.test.js` の追加時に同じ確認を足す)。
- **対象**: 下の表の 4 件だけ。720G・780G・8+ Gen 1 はファイル名に寸法がなく対象外(従来の配置のまま。扱い不変)。7 Gen 4 は画像なし。Orin・Thor はファイル名に寸法がなく対象外。
- **向きの確認**(画像の実ピクセルを `file` コマンドとファイルヘッダで確認): 6 Gen 1 と 4 Gen 2 のファイル名は「小さい方 x 大きい方」(6.67x8.08、6.32x6.38)だが、画像は横長(8702×7198 = 1.209、6896×6827 = 1.010)なので、横 = ファイル名の後ろの値とした。7 Gen 3(6941×9251 = 0.750、縦長)と 8200(7667×6161 = 1.244)は前 x 後 = 横 x 縦。4 Gen 2 は EXIF の向きが upper-right(左右反転)だが縦横の入れ替えはない。

| id | ファイル名 | 幅 × 高さ(mm)= 面積 | 採用した縦横比(幅/高さ) | 画像の実ピクセル比 |
|---|---|---|---|---|
| qc-6gen1 | `sd6gen1-sm6450-6.67x8.08.jpg` | 8.08 × 6.67 = 53.9 mm²(プリセット 53.9) | 1.2114 | 8702×7198 = 1.2089 |
| qc-4gen2 | `sd4gen2-sm4450-6.32x6.38.jpg` | 6.38 × 6.32 = 40.3 mm²(プリセット 40.3) | 1.0095 | 6896×6827 = 1.0101 |
| qc-7gen3 | `SD7gen3 sm7550 6.43x8.58.jpg` | 6.43 × 8.58 = 55.2 mm²(プリセット 55.2) | 0.7494 | 6941×9251 = 0.7503 |
| mt-8200 | `D8200-mt6896z-10.27x8.27x0.09mm.jpg` | 10.27 × 8.27 = 84.9 mm²(プリセット 84.9) | 1.2418 | 7667×6161 = 1.2444 |

- scaleNote(600 文字以内)は「縦横比のみ写真のファイル名の寸法(ファイル名。寸法。出典 URL 未確認)に合わせた。ブロックの配置・大きさは模式で根拠なし」。画面の縮尺注記は schematic の「模式図」の文言。
- 件数: 従来の配置 14 → 10、schematic 1 → 5(12100 の x86-mono + この 4 件)。他の 98 プリセットの layout・寸法・ブロック・飾りダイと、全プリセットの評価は変更前と一致(`tests/floorplan-snapdragon.test.js` の固定ハッシュは 74 件 → 70 件に更新。評価の固定ハッシュ `floorplan-scale.test.js` は不変)。

## Wildcat Lake のダイ写真の反映と Panther Lake 小型枠の使用先(2026-11-04。Core 5 320・Core Ultra 5 325 の追加。区分 [二次])

- **使用先の更新**: `ptl-compute-4p4lpe`(`Panther Lake_dies.jpg` の 4P+4LPE の目測。2026-11-04 に追加し、使うプリセットが無かった)を **Core Ultra 5 325**(`intel-ptl-u5-325`、reuse)が使う。GPU・Platform の飾りのタイルは付けない(寸法が未取得)。
- **`Wildcat-lake-computex26-series3-die-annotated.jpg`**(1182×1427 の WebP。作者表記・出典 URL なし。ユーザー提供)を **Core 5 320**(`intel-wcl-c5-320`、photo)の枠 `wcl-compute` にした。**compute die 単体の写真**と判断した(I/O die の写真ではない。PHY・I/O の帯がなく、コア・GPU・NPU・メディア・ディスプレイが 1 枚に載るため)。
- **ダイの外形**: 表示ピクセル [10, 14, 1178, 1420](縦横比 0.831)。ダイ面積は未取得なので縮尺なし(寸法は縦横比だけで決まる仮寸法)。
- **注釈どおりに置いたもの(座標は表示ピクセルの目測 ±5〜10%)**:

| ブロック | 座標(x, y, 幅, 高さ) | 備考 |
|---|---|---|
| Cougar Cove ×2(P) | 左 (142, 1130, 331, 268)、右 (725, 1128, 335, 270) | 各 P コア内の L2$ の小枠は P コアに含める |
| Darkmont ×4(LP-E。1 クラスタ) | (222, 642, 146, 157)、(448, 642, 148, 157)、(222, 857, 143, 145)、(450, 857, 147, 145) | 2×2。中央の十字は Darkmont L2$(飾り 3 枠: 縦 (380, 642, 58, 358)、横 左 (226, 810, 150, 36)・右 (442, 810, 150, 36)) |
| L3 | (487, 1133, 225, 262) | 容量の数値の注記なし。cfg の 6MB を割り当て |
| Memory Side Cache | (690, 858, 368, 258) | 容量は二次ソースで 4MB と 2MB に割れており未確定。数値は載せない |
| NPU | (672, 562, 383, 280) | 右上の張り出し(約 65×75 px)は省いた |
| iGPU(Xe Core ×2 を含む) | (637, 55, 527, 490) | Xe Core の 2 つの枠は iGPU の中に収まるので 1 枠にまとめた |
| Media Engines | (35, 25, 520, 310) | |
| Display Engine | (118, 348, 438, 268) | |
| DDR Controller | (1067, 640, 102, 758) | 縦長の帯 |
| Interconnect | 縦 (568, 55, 58, 560)、横 (27, 1008, 650, 115) | L 字の領域を 2 枠で近似 |

- **推定・省いた箇所**: 座標は目測。コア以外はすべて飾り(計算に入らない)。写真の左端の暗い領域(パッドなど)、Interconnect が L 字に続く細い帯、NPU の張り出しは省いた。**容量の数値は写真にない**(L3・MSC とも)。
- **I/O die の飾りは付けない**(寸法・位置が未取得。`decorDies` は付かない)。プリセットの dies には I/O タイル(TSMC N6、面積 null)が実在ダイとして載るが、layout は compute die だけ。
- テスト: `tests/floorplan-intel-tile.test.js`(`wcl-compute` は `x86-tile` 専用で `checkLayout` を通る、枠・飾りがダイ外形に収まり互いに重ならない、P を 3 に増やすと schematic に落ちる)。
