# AMD 公式ページとの全 21 SKU 照合(2026-11-06)

ユーザー方針(2026-11-06)「インテルのデータが正式な値」(公式値を優先)に従い、AMD 公式ページ(amd.com)の原ページを Chrome の通常閲覧で取得し([公表]、2026-11-06)、プリセットの AMD 21 SKU と照合した。**amd.com は Chrome の通常閲覧なら取得できる。** 旧記述「amd.com は再取得しない方針」は改めた(設計書 §5.3.3 K-8)。

**この文書の限界(正直に)**: 以下の「プリセット値」は現在の `data/presets/chips-pc.js` から転記した。「公式との一致/食い違い」は、照合した leader の報告(implementer への依頼文)に基づく。**依頼文に含まれなかった項目(各 SKU の公式のコア・スレッド・L1/L2・Tjmax・発売日・ダイ数などの生の値)は、この文書には転記できていない(未記録。推測で埋めない)。** 公式の生値は、必要なら出典 URL から再取得して追記する。

## 1. 出典 URL

| 記号 | URL | 対象 |
|---|---|---|
| A | https://www.amd.com/en/products/specifications/processors.html | 製品ページがない古い世代 7 SKU と 5800U(製品ページは 404)の仕様一覧 |
| S | https://www.amd.com/en/products/specifications/server-processor.html | EPYC 7401 |
| HX 370 | https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-9-hx-370.html | |
| 350 | https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-7-350.html | |
| Max+ 395 | https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html | |
| 7840HS | https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7840hs.html | |
| 7735HS | https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7735hs.html | |

公式ページの開けた方: 製品ページが開けた SKU = 5800X・5600X・5950X・7700・7950X・9700X・9950X・HX 370・350・395・7840HS・7735HS。5800U は製品ページが 404(仕様一覧 A で確認)。古い世代 7 SKU(1800X・2700X・2600X・1500X・1200・2400G・2200G)は製品ページがなく、仕様一覧(出典 A)で確認。EPYC 7401 は S。**PPT は公式に項目なし**(TechPowerUp の [二次] のまま)。HX 370 の発売日は、公式ページの表記が 2025-07-28(プリセットの year は 2024 のまま。変更していない)。

## 2. 21 SKU の照合(プリセット値)と結果

プリセット値は 2026-11-06 の変更後。「結果」は、照合した項目(コア・スレッド・ベース・ブースト・L2/L3・TDP/cTDP・メモリ・プロセス・ダイ数)について。

| SKU | プリセット値(コア構成 ベース/ブースト・L3・TDP・メモリ) | 結果 |
|---|---|---|
| Ryzen 7 1800X | 8C Zen 1 3.6/4.0・L3 16MB・TDP 95W・DDR4-2666 | 一致(出典 A) |
| Ryzen 7 2700X | 8C Zen+ 3.7/4.3・L3 16MB・TDP 105W・DDR4-2933 | 一致。ブースト 4.3 は公式 4.3(TechPowerUp 4.35 は採らない)。notes に追記 |
| Ryzen 7 5800X | 8C Zen 3 3.8/4.7・L3 32MB・TDP 105W・DDR4-3200 | 一致 |
| Ryzen 5 5600X | 6C Zen 3 3.7/4.6・L3 32MB・TDP 65W・DDR4-3200 | 一致 |
| Ryzen 9 5950X | 16C Zen 3 3.4/4.9・L3 64MB・TDP 105W・DDR4-3200 | 一致 |
| Ryzen 7 7700 | 8C Zen 4 3.8/5.3・L3 32MB・TDP 65W・DDR5-5200 | 一致 |
| Ryzen 9 7950X | 16C Zen 4 4.5/5.7・L3 64MB・TDP 170W・DDR5-5200 | 一致 |
| Ryzen 7 9700X | 8C Zen 5 3.8/5.5・L3 32MB・TDP 65W・DDR5-5600 | 一致 |
| Ryzen 9 9950X | 16C Zen 5 4.3/5.7・L3 64MB・TDP 170W・DDR5-5600 | 一致 |
| Ryzen AI 9 HX 370 | 4C Zen 5 2.0/5.1 + 8C Zen 5c 2.0/**3.3**・L3 24MB・TDP 28W(cTDP 15〜54W)・DDR5-5600 / LPDDR5X-8000 | **食い違い 1 件**: Zen 5c ブースト(ユーザー申告 2026-11-05 は 3.4、公式は 3.3)→ 公式優先で 3.4 → 3.3 に訂正。ベース 2.0 は公式と一致。公式: Zen 5 ベース 2.0・最大 5.1、Zen 5c ベース 2.0・最大 3.3、L2 12MB、L3 24MB、既定 TDP 28W、cTDP 15〜54W、TSMC 4nm。TechPowerUp の Zen 5c「ベース 1.4 / 最大 3.3」のベース 1.4 は公式と合わず誤りと考えられる |
| Ryzen AI 7 350 | 4C Zen 5 2.0/5.0 + 4C Zen 5c 2.0/3.5・L3 16MB・TDP 28W(cTDP 15〜54W) | 値は一致。L3 16MB は公式で確認(TechPowerUp の 8MB は誤り)。l3Note を更新 |
| Ryzen AI Max+ 395 | 16C Zen 5 3.0/5.1・L3 64MB・TDP 55W(45〜120W)・**LPDDR5X-8000, 256bit** | **食い違い(抜け)1 件**: memory に速度がなかった(`LPDDR5X, 256bit`)。公式は LPDDR5X-8000・256bit・最大 128GB → `LPDDR5X-8000, 256bit` に。「ch」表記は入れない(電力モデルが `(\d+)\s*ch` を読む)。評価は不変 |
| Ryzen 5 2600X | 6C Zen+ 3.6/4.2・L3 16MB・TDP 95W・DDR4-2933 | 一致。ブースト 4.2 は公式 4.2(TechPowerUp 4.25 は採らない)。notes に追記 |
| Ryzen 5 1500X | 4C Zen 1 3.5/3.7・L3 16MB・TDP 65W・DDR4-2666 | 一致(出典 A) |
| Ryzen 7 7840HS | 8C Zen 4 3.8/5.1・L3 16MB・TDP 35W(35〜54W)・DDR5-5600 / LPDDR5X-7500 | 値は一致。公式は Default TDP を範囲「35〜54W」と表記し、単一の既定値を決めていない。power.base 35W は範囲の下端を採用(値は変更なし、notes に記録) |
| Ryzen 7 5800U | 8C Zen 3 1.9/4.4・L3 16MB・TDP 15W(10〜25W)・DDR4-3200 / **LPDDR4-4266** | **食い違い 1 件**: memory 表記 LPDDR4X-4267(TechPowerUp)→ 公式の LPDDR4-4266(DDR4 は最大 3200、LPDDR4 は最大 4266)。cTDP は公式も 15W 既定・10〜25W(TechPowerUp は「25W」だけだったが公式で 10〜25W を確認。下限 10W は公式でも 10W)。評価は不変 |
| Ryzen 3 1200 | 4C Zen 1 3.1/3.4・SMT なし・L3 8MB・TDP 65W | 一致(出典 A) |
| Ryzen 5 2400G | 4C Zen 1 3.6/3.9・L3 4MB・TDP 65W(46〜65W) | 一致(出典 A) |
| Ryzen 3 2200G | 4C Zen 1 3.5/3.7・SMT なし・L3 4MB・TDP 65W(46〜65W) | 一致(出典 A) |
| EPYC 7401 | 24C Zen 1 2.0/3.0・L3 64MB・TDP 170W(155〜170W)・DDR4-2666・8ch | 値は一致。Default TDP は公式で 155W / 170W の 2 値が並ぶ(メモリ 2400 / 2666 MT/s と同じ並びで、2 つの動作設定と読めるが、どちらがどの設定かは公式に記載なし=未取得)。出典 S。値は変更なし |
| Ryzen 7 7735HS | 8C Zen 3 3.2/4.75・L3 16MB・TDP 35W(35〜54W)・DDR5-4800 / LPDDR5-6400 | 値は一致。7840HS と同じく公式は Default TDP を範囲 35〜54W と表記。35W は範囲の下端(値は変更なし、notes に記録) |

## 3. 今回変更した値(まとめ)

1. HX 370 の Zen 5c boostGHz 3.4 → 3.3(公式優先)。notes を公式の値で書き直し、旧「ユーザー申告を優先」は公式優先に改めた。
2. Max+ 395 の memory に LPDDR5X-8000 を追加(評価不変)。
3. 5800U の memory 表記を LPDDR4-4266 に(評価不変)。
4. notes だけの変更: 7840HS・7735HS(TDP 範囲)、350(l3Note)、EPYC 7401(TDP 2 値)、2700X・2600X(ブースト)、5800U(cTDP)。値は変更なし。

評価の変化は HX 370 の MT だけ(12543.3 → 12352.4、-16.5% → -17.7%、判定 ng のまま=反転なし)。校正・帯係数は不変。詳細は設計書 §5.3.3 K-8。

## 4. 区分の引き上げ候補: 2026-11-06 反映済み(ユーザー指示「全体のデータを公式のデータにしてください」)

(旧見出し「記録のみ。今回はやらない=ユーザー未承認」。詳細は `docs/設計書.md` §5.3.3 K-9。) 反映したもの: 21 SKU の power.base(TDP)を pub(7840HS・7735HS は範囲 35〜54W の下端 35W、EPYC 7401 は 155W / 170W の 2 値の一方 170W を採用=ユーザー未確認)、メモリの出典を公式へ(チャネル数は TechPowerUp の値のまま)、`data/memory.js` の AMD 全選択肢を pub、395 の最大メモリ 128GB、L2 合計 19 件(依頼の値。**原ページ未再取得**)。PPT・拡張 cTDP 105W・[実測] の peak は元の区分のまま。評価の変化は AMD では無し(数値は完全一致)。
**追記(2026-11-06)**: この文書「限界」で未転記だった公式の生値(L1/L2・Tjmax・ダイ数・発売日)は、Chrome のツールが使えず再取得できなかったため追記できていない(未取得のまま)。

(以下は反映前の候補一覧。記録として残す。)

公式で確認できたため [二次] → [公表] にできる項目の候補(プリセットの power.*.s は 'sec' が多い)。

- TDP / cTDP(power.base.s・range): 公式の製品ページ・仕様一覧で確認できた SKU。ただし 7840HS・7735HS は公式が範囲(35〜54W)表記で単一の既定値がなく、EPYC 7401 は 2 値が並ぶので、引き上げは範囲の扱いを決めてから。
- メモリ(cfg.memory): 395(LPDDR5X-8000)・5800U(LPDDR4-4266)・HX 370・350 など、公式にある SKU。最大容量(395 は 128GB)の追記も候補。
- コア数・クロック(ベース/ブースト)・L3: 21 SKU すべて公式と一致または訂正済みなので、区分を [公表] に上げられる。
- PPT(power.peak): 公式に項目なし。TechPowerUp の [二次] のまま。
- 面積(dies.s)は公式にダイ面積の項目がなく、対象外。

## 5. 未解決・不確か

- HX 370 の発売日: 公式ページ表記は 2025-07-28。プリセットの year は 2024(発表時期)のまま。どちらを使うかは未決定。
- EPYC 7401 の 155W / 170W: どちらがどの動作設定かは公式に記載なし(未取得)。
- 7840HS・7735HS の既定 TDP: 公式は範囲表記のみ。35W は下端を採った仮置き。
- Tjmax・L1・ダイ数・発売日などの公式生値は、この文書に転記できていない(上の「限界」参照)。

## 6. 2026-11-06 にプリセット(`cfg.l2`)へ反映した AMD の L2 合計と、メモリの照合結果

**L2 合計(依頼文の値。原ページ未再取得)**: 実装担当は Chrome のツールが使えず、amd.com を再取得できていない。HX 370 12MB・350 8MB・395 16MB は公式で確認済み(この文書の他の記録。HX 370 は §2 の行、350・395 は照合担当の報告)。ほかは Zen 1〜3・Zen+ が 512KB/コア、Zen 4/5 が 1MB/コアと整合している。

| SKU | L2 合計 | 構成との整合 |
|---|---|---|
| Ryzen 7 1800X | 4MB | Zen 1 512KB × 8 |
| Ryzen 7 2700X | 4MB | Zen+ 512KB × 8 |
| Ryzen 5 2600X | 3MB | 512KB × 6 |
| Ryzen 5 1500X | 2MB | 512KB × 4 |
| Ryzen 3 1200 | 2MB | 512KB × 4 |
| Ryzen 5 2400G | 2MB | 512KB × 4 |
| Ryzen 7 5800X | 4MB | Zen 3 512KB × 8 |
| Ryzen 5 5600X | 3MB | 512KB × 6 |
| Ryzen 9 5950X | 8MB | 512KB × 16 |
| Ryzen 7 7700 | 8MB | Zen 4 1MB × 8 |
| Ryzen 9 7950X | 16MB | 1MB × 16 |
| Ryzen 7 9700X | 8MB | Zen 5 1MB × 8(既存の `l2MBPerCore: 1` とも一致) |
| Ryzen 9 9950X | 16MB | 1MB × 16 |
| Ryzen AI 9 HX 370 | 12MB | 公式確認済み(§2) |
| Ryzen AI 7 350 | 8MB | 公式確認済み。1MB × 8 |
| Ryzen AI Max+ 395 | 16MB | 公式確認済み。1MB × 16 |
| Ryzen 7 7840HS | 8MB | Zen 4 1MB × 8 |
| Ryzen 7 5800U | 4MB | Zen 3 512KB × 8 |
| Ryzen 7 7735HS | 4MB | Zen 3+ 512KB × 8 |

2200G・EPYC 7401 は依頼の一覧になく、L2 は未追加。

**メモリの照合結果(公式 A の仕様一覧の表。依頼文の報告)**:

| SKU | 公式のメモリ |
|---|---|
| Ryzen AI 7 350 | DDR5 / LPDDR5X・2ch・最大 256GB・LPDDR5X-8000 / DDR5-5600 |
| Ryzen 3 1200 | DDR4・2ch・2667 |
| Ryzen 5 2400G・Ryzen 3 2200G | DDR4・2ch・2933 |

(これらの「2ch」はプリセットの `memory` の「2 チャネル」と一致。350 の最大 256GB は未反映=プリセットに最大容量を入れていない。)
