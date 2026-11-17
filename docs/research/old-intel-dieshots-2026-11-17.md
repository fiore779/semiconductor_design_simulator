# 古い Core i(19 プリセット)のダイショットの枠(2026-11-17)

ユーザー指示「ダイショットは新しく追加したプリセット群に使用してください」。`data/presets/chips-old.js` の 19 SKU(第 2〜10 世代)に、ダイ写真から起こした枠(`TILE_FRAMES` の `x86-mono` の枠)を当てた。従来は x86-mono の模式配置(schematic。根拠なし)。
区分はすべて [二次](写真から目測。実チップのフロアプランではない)。ダイ面積はプリセットのまま(幅×高さの比だけ写真の縦横比にした)。

## 1. 使った写真(ブラウザで表示して目測。ファイルの保存・ダウンロードはしていない)

出典は CPU Graveyard(happytrees.org/dieshots。WikiChip などの画像の転載サイト)。WikiChip 本体と Flickr(Fritzchens Fritz)・Wikimedia Commons は、4 コア以上の Core i の写真が見つからず(Commons は Haswell・Sandy Bridge の 2 コア版だけ)、WikiChip はブラウザからエラーページになり、使っていない。

| 枠 | 写真(ファイル名・自然サイズ) | ページ | 使うプリセット |
|---|---|---|---|
| `snb-4c` | Intel-sandy_bridge-4-core-Intel_in_Deutschland.jpg(4465×2160) | Intel_-_Sandy_Bridge_(4-core) | 2600K・2500K・2720QM |
| `hsw-4c` | Intel-4th_Generation_Intel_Core_Processor_Die-Intel_in_Deutschland.jpg(5863×2160) | Intel_-_Haswell_(quad_core) | 4770K・4790K・4690K・4700HQ |
| `skl-4c` | Skylake_(quad-core).png(3158×2160) | Intel_-_Skylake_(quad-core) | 6700K・6600K・6700HQ |
| `kbl-4c` | Kaby_lake_(quad_core).png(3254×2160) | Intel_-_Kaby_Lake_(quad_core) | 7700K・7600K・7700HQ |
| `cfl-6c` | Intel_Core_i7_Gen8_(Coffee_Lake-S_14nm).jpg(3213×1758) | Intel_-_Core_i7_Gen8_(Coffee_Lake-S_14nm) | 8700K・8400 |
| `cfl-8c` | Intel-9th-Gen-Core.jpg(1935×906) | Intel_-_Core_i9-9900K_(Coffee_Lake) | 9900K・9700K |
| `cml-10c` | Intel_Core_i7_Gen10_(Comet_Lake-S_14nm).jpg(4880×2040) | Intel_-_Core_i7_Gen10_(Comet_Lake-S_14nm) | 10900K・10700K |

URL は `https://happytrees.org/dieshots/` + ページ名。
**ライセンス表記を確認したのは 9900K のページだけ(「Intel 著作」、写真提供元 en.wikichip.org)。** ほかの 6 枚はページ本文のライセンス欄を読んでいない。写真そのものをリポジトリに入れてはいない(座標だけをコードに入れた)。

## 2. 決め方

- 写真を 1191 px 幅(9th Gen だけ 1489 px)で表示し、ブロックの位置を画面のピクセルで目測した(±5〜10%)。ダイ外形(box)の縦横比は、写真の自然な縦横比(自然サイズの比)と 1% 以内で一致させた(テストで検査)。
- **写真は注釈なし。** コア(縦長の大きな領域の繰り返し)・L3(SRAM の縦帯。コアの間と両端)・GPU(規則的な EU の繰り返しの大きな領域。Skylake・Kaby Lake・Coffee Lake・Comet Lake の写真と同じ見た目)・リングバス(コア上下の間の横帯)・System Agent(コア群の反対側の縦帯)は**見た目から判別した推定**で、判別できない領域は「内訳は未判別」の飾り(PHY・I/O など)にした。
- L3 の帯は 5 番目の数(重み)で容量を分けた(例: コアの間の帯 2、端の帯 1。スライス数に近い比)。帯ごとのラベル(L3 2MB・4MB…)は目安で、実際のスライス境界ではない。
- 中段のリング帯は L3 の縦帯と交差するので、コアの列ごとの帯に分けた(重なりなし。テストで検査)。
- コアを無効にした SKU(10700K の 8/10 など)は空き枠を残す。HT なし・L3 を絞った SKU(2500K・4690K・6600K・7600K・8400・9700K)も同じダイの枠で、L3 は cfg の値を帯の重みで按分する(合計は cfg.l3MB のまま)。
- モバイル SKU(2720QM・4700HQ・6700HQ・7700HQ)は、デスクトップと同じ 4 コアのダイの写真を使う(chips-old.js の面積の流用と同じ前提。モバイル版が別ダイかどうかは未確認)。

## 3. 未確認・限界

- **ブラウザ上のアプリで描画を確認していない**(file:// が開けず、ローカルサーバーも起動できなかった)。確認はブロックの座標が全部ダイの内側にあること・重ならないこと・コア数と L3 の合計が cfg と一致することをテストで検査したところまで。見た目は push 後の Pages で確認してほしい。
- Haswell 4 コアの縦横比 2.71(写真の自然な縦横比)は、Intel の配布画像のもので、実チップの寸法と一致する確認がない(21.9×8.1 mm になる)。Sandy Bridge(2.07 → 21.1×10.2 mm)・Skylake(1.46 → 13.4×9.2 mm)など、ほかの写真の縦横比も実寸の注記はない。
- Sandy Bridge の左の大きな領域を GPU、Haswell の右の領域を GPU と判別したのは見た目による(Haswell は GPU の左の細い縦帯を System Agent・メディアとした)。誤っている可能性がある。
- 写真はすべて Intel 配布画像・または WikiChip 転載の色付き写真(偽色)。Fritzchens Fritz の実測写真ではない。
