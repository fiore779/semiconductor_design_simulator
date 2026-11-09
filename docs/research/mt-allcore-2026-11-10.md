# 全コア実測クロック(allCoreGHz)で MT を計算する(デスクトップ x86 の MT 過大。2026-11-10)

きっかけ: デスクトップ x86 の MT 過大(5950X +23.0%、285K +14.9%、265K +13.1%)のうち、5950X は全コア負荷時のクロックが boost の約 0.8 倍まで下がること([二次] HEXUS・KitGuru)が要因だった。任意項目 `allCoreGHz` を追加して MT のクロックに使えるか調べて実装した。

## 1. 出典(2026-11-10 に原ページを取得して確認)

- 5950X: KitGuru「Ryzen 9 5950X レビュー」の「Stock-Clocked Operating Frequencies」に「We see the 5950X hitting around **3.85-4.0GHz all-core frequency** in the demanding Cinebench workload. This clock speed value holds up well using air or AIO cooling.」https://www.kitguru.net/components/cpu/luke-hill/amd-ryzen-9-5950x-zen-3-cpu-review/3 。HEXUS に「the average all-core speed is approximately **3.85GHz**」https://m.hexus.net/tech/reviews/cpu/146440-amd-ryzen-9-5950x-ryzen-9-5900x/?page=3 。区分 [二次](レビュー機の実測)。
- 5800X: KitGuru「Ryzen 7 5800X レビュー」に「We see the 5800X hitting around **4.55GHz all-core frequency** in the demanding Cinebench workload.」https://www.kitguru.net/components/cpu/luke-hill/amd-ryzen-7-5800x-cpu-review/2 。区分 [二次]。boost 4.7GHz の 0.968 倍。

値: 5950X は KitGuru の範囲 3.85〜4.0 の中央 **3.925GHz**(HEXUS の 3.85 とも整合。推測で動かしていない。3.85 でも結果はほぼ同じ)。

## 2. 実装

- `cfg.cores[].allCoreGHz`(任意、0.5〜8GHz)。`js/sim/perf.js` の `mtScore` は、あればそれをクロックに使い(clockSource `allcore`、係数は掛けない。実測なので)、無ければ従来どおり boost / max × 係数。ST は boost のまま(単スレッドは boost で走る)。
- `js/model/design.js`: 設計の cfg にコピー(`cfgFromPreset`)、保存データの検証、`setClock` で boost との比を保ってスケール。

## 3. 影響の測定(実装前に測った。全プリセットの MT。差 = 予測 / 公開値 − 1)

| 条件 | σ | 5950X | 5800X | 285K | デスクトップ(pc)27 件の MAE |
|---|---|---|---|---|---|
| なし(従来) | 0.02888 | +23.0% | +4.9% | +14.9% | 6.13 |
| **5950X だけ**(採用) | 0.02888 | **+3.5%** | +4.9% | +14.9% | **5.41** |
| 5800X だけ | 0.02829 | +24.2% | +5.5% | +15.8% | 6.26 |
| 両方 | 0.02829 | +4.5% | +2.9% | +15.8% | 5.54 |

- **5950X だけ**: 5950X の MT のみが動き(+23.0% → +3.5%、ng→ok)、**ほかの SKU の予測は 1 件も変わらない**(悪化する SKU なし)。MT の ±10% 外(全プリセット)は **15 → 14 件**。
- **5800X にも付けると見送り**: 5800X は σ の校正代表(x86 の 4 件 = 1800X・5800X・7700・9700X)で、全コアクロックにすると σ が 0.0289 → 0.0283 に下がる。残りの代表(1800X・7700・9700X)には全コアの実測が無く boost のままなので、**代表のクロックが揃わない**(5800X だけ全コア)。その結果、5950X を含めても **33 件の SKU の誤差が悪化**した(12900K +6.9 → +7.8、285K +14.9 → +15.8、265K +13.1 → +13.9、7950X +6.5 → +7.6、9950X +7.5 → +8.5、275HX +29.9 → +30.9 ほか。反転は 865・8+ Gen 1 の MT が -10.1 / -10.0 → -9.7 で ng→ok になるだけで、これは σ の動きによる縁の変化)。指示「悪化する SKU があれば実装せず」に従い、5800X の allCoreGHz は**実装していない**(値 4.55GHz と出典はここと 5950X の errCause に記録)。σ の代表の全コアクロックを揃えるには、1800X・7700・9700X の全コア実測が要る(データ待ち)。
- 残るデスクトップの MT 過大: 285K +14.9%、265K +13.1%(Arrow Lake。原因未特定。SMT なしの η、ダイ間遅延の疑い)。5950X は解消。

## 4. 変更したもの

- `data/presets/chips-pc.js`(5950X に `allCoreGHz: 3.925`、notes・errCause に出典)、`js/sim/perf.js`、`js/model/design.js`。
- テスト: `perf.test.js`(allCoreGHz の使われ方、5950X +3.5%、ほかの SKU に付いていないこと)、`design.test.js`(cfg への引き継ぎ・スケール・検証)、`mix.test.js` の BASE_M5B(5950X の MT 18390 → 15484)、`memory-baseline.json`、評価ハッシュ。
