# HX 系の標本追加用 Geekbench 7 取得結果(2026-11-11)

取得方法: Geekbench Browser(browser.geekbench.com/v7/cpu/search?q=...)の検索結果を 25 件ずつ 8 ページ、直近 200 件。区分は [実測](公開投稿の中央値)。プリセットにはまだ入れていない(公式スペックの取得待ち)。

| SKU | 全体中央値 ST / MT(n=200) | Windows のみ(件数 ST / MT) |
|---|---|---|
| Core i9-13980HX(24c, 2394MHz 表示) | 2503.5 / 18282.5 | 152 件 2478 / 18110 |
| Core i9-14900HX(24c, 2200MHz 表示) | 2422 / 17015.5 | 136 件 2567.5 / 18866.5 |
| Ryzen 9 7945HX(16c, 2501MHz 表示) | 2450.5 / 18740.5 | 118 件 2522 / 19261 |
| Core Ultra 9 285H(16c, 2900MHz 表示) | 2445.5 / 15928 | 150 件 2417.5 / 15750.5 |

## 公式スペックの取得状況
- 13980HX: Intel のスペックページ(https://www.intel.com/content/www/us/en/products/sku/232138/intel-core-i913980hx-processor-36m-cache-up-to-5-60-ghz/specifications.html 、取得日 2026-11-11)で、P 8・E 16・32 スレッド、最大ターボ 5.60GHz、P の最大ターボ 5.60GHz、E の最大ターボ 4.00GHz、L3 36MB、Intel 7、Q1'23 を確認。**【2026-11-11 訂正】当初の記録の「ベース/最大ターボのパワー(W)は未取得」は誤り。同日に ARK の原ページで PBP 55W / MTP 157W を取得済み**。ARK の 13980HX ページには P/E のベースクロックの項目は出ず、未取得のまま(推測しない)。
- 14900HX(ARK sku/235995): PBP 55W / MTP 157W、P ベース 2.2・E ベース 1.6GHz、最大ターボ 5.8GHz(P 5.8・E 4.1)。メモリは ARK の取得結果になく未取得。
- 285H(ARK sku/241747): PBP 45W / MTP 115W、P ベース 2.9・E ベース 2.7・LP-E ベース 1.0GHz、最大ターボ 5.4GHz(P 5.4・E 4.5・LP-E 2.5)、L3 24MB。メモリは未取得。
- 7945HX(amd.com の製品ページ): 既定 TDP 55W、cTDP 55〜75W、DDR5-5200、ほか上記の仕様。
- **最小保証パワー(Minimum Assured Power)**: 13980HX・14900HX・285H の ARK ページでは、この項目が取得結果に出ていない=未取得のまま(`range.minW` は null。表示は「最大 N W」)。
