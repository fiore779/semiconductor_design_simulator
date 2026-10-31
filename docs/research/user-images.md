# ユーザー提供の画像と出典(2026-10-31)

ユーザーが `C:\LocalAI` に置いた画像。ブロック配置・縮尺の根拠(区分 [二次]。画像から目測した値は「目測」と明記する)。
出典のページ本文は未取得(TechPowerUp は 403。他は未確認)。画像そのものだけが根拠。

| 画像 | 内容 | 出典(ユーザー提示) | 備考 |
|---|---|---|---|
| `12900K.png`(ユーザーの手書きスケッチ) | 12900K の配置の概略 | ユーザー作成 | 実物の配置とは異なる(実物は横長)。使わない |
| 12900K の注釈つきダイ写真(会話に貼付) | Platform I/O・Uncore・P コア 4 個×2 段・L3/リングバス・E コアのクラスタ(上下)・iGPU。横長(約 2:1) | https://www.techpowerup.com/review/intel-core-i9-12900k-alder-lake-12th-gen/2.html | ページ本文は 403 で取得不可 |
| `ryzen zen3~2ccd.png`(ユーザーの手書きスケッチ) | CCD 2 つ(左コア列・L3・右コア列)+ IO ダイの概略 | ユーザー作成 | 配置の考え方の参考 |
| `画像\5950x.jpg` | 5950X のパッケージ(蓋なし)。CCD 2 つが上に横並び、その下に大きな IO ダイ、周囲に SMD 部品 | https://bit-tech.net/reviews/tech/cpus/amd-ryzen-9-5950x-and-ryzen-7-5800x/1/ (ユーザー提示。どちらの画像の出典かは未確認) | IO ダイは CCD より明らかに大きい |
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
| `ykZo39MPXqS7Ldgarwoa7o-750-80.jpg` | AMD の APU のパッケージ写真(蓋なし。ダイが 1 つで周囲に SMD 部品)。**出典・型番とも未確認** | 不明(ユーザーからも未提示) | どの SKU か分からないため**使っていない**(記録のみ) |

### 12900K の基準枠(1682×846 px)の出所
- 12900K の注釈つきダイ写真(TechPowerUp のレビューの画像、上の表の「会話に貼付」の行)は**会話にだけ存在し、ファイルは無い**。ユーザーが会話に貼った画像から目測した座標が `HY_ADL`(1682×846)で、`arch2.jpg` から測ったものではない(arch2.jpg は 13900K で、別の画像)。
- したがって 12900K 系(Alder Lake-S 8P+8E)の `photo` は「会話に貼られた 12900K の写真の目測」が根拠で、リポジトリ内に再確認できる画像ファイルは無い。

## ユーザーの補足
- Zen 3(5950X)と Zen 4 / Zen 5(7950X・9950X)は構造が同じ。ただし Zen 4 以降は IO ダイに iGPU が加わる(ユーザー談。調査メモでの裏付けは別途)。
