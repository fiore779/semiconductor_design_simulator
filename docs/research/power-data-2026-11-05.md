# 電力(TDP・ピーク電力)の追加取得と、入れなかった値の記録(2026-11-05)

ユーザー指示(2026-11-05)「TDP が取れていないものが複数あったのでできるだけ取得してください」。調査担当 3 名の結果のうち、根拠のあるものだけをプリセットの power に入れた。推測・計算で出した値・出典不明の値・測定条件が違う値は入れていない。この文書は、(1) 入れた値の出典、(2) 入れなかった値と不採用の理由、(3) 既存 note の訂正を残す。設計書は §2.5・§2.5.1。

## 1. 入れた値

### Intel(区分 pub。Intel ARK の原ページを確認、2026-11-05)
URL は https://www.intel.com/content/www/us/en/products/sku/<番号>/…/specifications.html

| 製品 | 番号 | base | peak | range | 備考 |
|---|---|---|---|---|---|
| Core Ultra 7 258V | 240957 | 17W | 37W | 8〜37W | 新規 |
| Core Ultra 7 256V | 240954 | 17W | 37W | 8〜37W | 新規 |
| Core Ultra 7 268V | 240958 | 17W | 37W(追加) | 8〜37W | base は sec → pub に更新 |
| Core Ultra 9 275HX | 242293 | 55W | 160W | 45〜160W | 新規 |
| Core i9-14900K | 236773 | 125W | 253W(追加) | — | base は sec → pub に更新 |

range の下限は ARK の「最小保証パワー」(Minimum Assured Power)で、cTDP ではない。peak は「最大ターボ・パワー」(Maximum Turbo Power)。

### AMD(区分 sec。TechPowerUp CPU データベースの原ページを Chrome で確認、2026-11-05)
URL は https://www.techpowerup.com/cpu-specs/<slug>

| 製品 | slug | 入れた値 |
|---|---|---|
| Ryzen 7 5800X | ryzen-7-5800x.c2362 | base 105W、peak 142W(PPT)。**65W ではなく 105W** |
| Ryzen 3 1200 | ryzen-3-1200.c1899 | base 65W |
| Ryzen 7 7840HS | ryzen-7-7840hs.c3033 | base 35W、range 35〜54W |
| Ryzen 5 5600X | ryzen-5-5600x.c2365 | peak 88W(PPT) |
| Ryzen 9 5950X | ryzen-9-5950x.c2364 | peak 142W(PPT) |
| Ryzen 7 7700 | ryzen-7-7700.c2960 | peak 88W(PPT) |
| Ryzen 7 9700X | ryzen-7-9700x.c3651 | peak 88W(PPT)。拡張 cTDP 105W のとき PPT 142W(note に記載) |
| Ryzen AI Max+ 395 | ryzen-ai-max-395.c3994 | base 55W(range 45〜120W は既存)。amd.com は使わない方針で TechPowerUp を根拠とした(amd.com 由来の検索要約も 55W) |
| Ryzen 7 5800U | ryzen-7-5800u.c2746 | base 15W(range 10〜25W は既存) |
| Ryzen 5 2400G | ryzen-5-2400g.c1976 | base 65W(range 46〜65W は既存) |
| Ryzen 3 2200G | ryzen-3-2200g.c1978 | base 65W(range 46〜65W は既存) |
| Ryzen 7 7735HS | ryzen-7-7735hs.c3041 | base 35W(range 35〜54W は既存) |
| EPYC 7401 | epyc-7401.c1924 | base 170W(range 155〜170W は既存) |

HX 370・350 は base 28W(既存)で変更なし。PPT は公表されたソケットの電力上限で、レビューの実測ピークではない。

### Apple(区分 meas。Notebookcheck の CPU 全コア負荷の測定。peak として入れた)
| チップ | peak | 条件 | URL |
|---|---|---|---|
| M1 | 15W | Cinebench R23 マルチの平均パッケージ電力、MacBook Pro 13。MacBook Air は 13.2W | https://www.notebookcheck.net/Apple-M2-SoC-Analysis-Worse-CPU-efficiency-compared-to-the-M1.637834.0.html |
| M1 Pro | 27W(旧 21.5W) | CPU 全コア負荷。10 コア版〔8P+2E。プリセットの構成〕27W、8 コア版 21W。旧 21.5W は出典を確認できなかった | URL は調査担当が記録せず未記録(原ページ確認済みは本文の値のみ) |
| M2 Pro | 34W | マルチ最大 CPU、12 コア版。別記事は約 36W、10 コア版は 27〜28W | https://www.notebookcheck.net/Apple-M2-Pro-and-M2-Max-analysis-GPU-is-more-efficient-the-CPU-not-always.699140.0.html |
| M3 | 21W | 全負荷 CPU 20〜21W | https://www.notebookcheck.com/Apple-M3-SoC-in-der-Analyse-Hoehere-Leistung-und-verbesserte-Effizienz.766392.0.html |
| M4 | 24W | MacBook Pro 14、マルチ最大 CPU。Mac mini は 21.5W | https://www.notebookcheck.net/Apple-MacBook-Pro-14-M4-review-The-M4-base-model-with-important-improvements.923443.0.html |
| M5 | 30.5W | CPU だけの負荷の短時間値。持続 27.5W | https://www.notebookcheck.net/Analysis-of-the-Apple-M5-SoC-Apple-silicon-extends-its-lead-over-AMD-Intel-and-Qualcomm.1144213.0.html |
| M5 Max | 75W | 16 インチ、CPU だけの負荷の最大。High Power で持続 70W、Auto は 54W に低下、14 インチは 50W を維持できない | https://www.notebookcheck.net/Apple-s-fastest-laptop-starts-to-show-its-age-Apple-MacBook-Pro-16-2026-M5-Max-Review.1250821.0.html |

M1・M2 Pro・M3・M4・M5・M5 Max は Notebookcheck の原ページ確認済み(WebFetch 経由で要約モデルを通して読んだため、文言は短い引用の範囲でのみ確認)。M1 Pro は「8 コア版 21W・10 コア版 27W」(Notebookcheck の M1 Pro / Max 分析。原ページ確認済みは本文の値のみ)で、URL は調査担当が記録しておらず未記録。M3 Pro の 25W(Notebookcheck 本文は 26〜27W)は別件として変更していない。

### MediaTek
Dimensity 9600 Pro: **不採用(参考値。power には入れない。一度入れたがレビュー対応で null に戻し、値と出典はプリセットの notes と §3 に記録)**。理由: ES・端末全体か SoC か不明・測定者不明・MediaTek の主張と不整合で、8 Gen 2 や A16 / A18 Pro を不採用にした基準と揃えた。以下は参考値の内容: peak 22.7W(区分 sec 相当)。Geekbench 6 マルチ 12,765 点のときの値、工程機(ES)、端末全体か SoC かは不明、測定者も不明。IT之家 https://www.ithome.com/1/014/806.htm を原ページで確認。Geekbench 7 マルチでは約 23.5W。MediaTek の「マルチのピーク電力 61% 減」という主張と整合しない。

### NVIDIA
- Thor: range 40〜130W を維持。モード MAXN / 120W(既定。T5000)/ 90W / 70W、モジュールの TDP 予算 130W、40W は製品ページの下限。power.modes の note に記録。https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/ 、https://docs.nvidia.com/jetson/archives/r38.4/DeveloperGuide/SD/PlatformPowerAndPerformance/JetsonThor.html を原ページで確認。
- Orin: range 15〜60W を維持。既定 30W(mode ID 2)は公式ドキュメントで裏付け済み。

## 2. 既存値の訂正(値は変更なし)
- M3 Max: note の「チップ全体 約78W」は Notebookcheck の「Cinebench マルチ時・外部モニター接続のシステム全体の値」でチップの値ではない。peak 56W は変更なし。
- Switch 2 の T239: base 19W は Nintendo 公式の **Switch 2 本体全体**・TV モード・マリオカート ワールドの平均消費電力(Full HD / 4K の平均)。SoC 単体の値ではない。出典の区別: Nintendo 公式の仕様ページ https://www.nintendo.com/en-gb/Hardware/Nintendo-Switch-2/Nintendo-Switch-2-Specifications-2785627.html は**原ページ確認済み**(ホーム 8W・スリープ 0.5W)。19W の出典は Nintendo 公式の消費電力値と Tom's Hardware のワットメーター実測(ドック時 18〜19W)で、**検索要約のみ**。19W は既存の値で、§2.5 の規則(システム全体の値は power に入れない)の例外として残している(設計書 §2.5 NVIDIA 節・§13.4 の判断待ち)。
- Snapdragon 8 Gen 2 の bigCore 4.9W: 「8 Gen 2 for Galaxy」(OC 版)のピークの値で、無印の 8 Gen 2 ではない。出典の区別: OC 版であることと ES の明記は Wccftech の**原ページ確認済み**。Golden Reviewer は Wccftech 経由(一次は未確認)。SPECint06 Big Core は測定の種類。
- Snapdragon 8 Elite Gen 5 の 19.5W: ES のボード電力(GB6 マルチ 12,546 点)。ES の明記は Wccftech の原ページ確認済み。
- Dimensity 9500 の 18W: ES(GB6 マルチ 10,716 点)。
- Snapdragon 8 Gen 1 の 11.1W と Dimensity 9000 の 9.8W: GB5 時代(2021 年)の値。8 Gen 1 は報道で 11.2W と食い違う。

## 3. 入れなかった値と理由(試した出典と値は調査担当の報告にある範囲。実装担当は再調査していない)
- **Zen 1 / Zen+(1800X・2700X・2600X・1500X)の PPT**: 公表資料なし。TDP×1.35 の計算値は推定なので入れない。
- **Core Ultra 5 225H**: 取得対象に含まれていない(未取得のまま)。

出典の書き方は「URL」と「原ページ確認済み / 検索要約のみ」を分ける。

### 3.1 Apple(Ultra と A シリーズ)
- **M1 Ultra**: フォーラム投稿の約 83W(検証不能。https://www.techpowerup.com/forums/posts/4717316 。検索要約のみ)。Max の 2 倍(約 58W)は推定。入れない。
- **M2 Ultra**: Ars Technica の「CPU 負荷時 61W」の転載。壁際かチップかが不明で、転載元は 403 で読めなかった。Max の 2 倍(約 72W / 68W)は推定。入れない。
- **Mac Studio の最大消費電力**(Apple 公式。[公表]、壁際・システム全体。https://support.apple.com/en-us/102027 。原ページ確認済み): M1 Ultra 215W / M1 Max 115W / M2 Ultra 295W / M2 Max 145W / M3 Ultra 270W / M5 Max 200W / M5 Ultra 385W。チップの電力ではないので power の値には入れず、M1 Ultra・M2 Ultra の note に別項目で記録した。
- **A14・A15**: Golden Reviewer の X 投稿でシングル時 4.5W / 5.1W(GB5)、Linpack 4.8W / 5.5W([二次]。https://iphone-mania.jp/news-410720/ 。検索要約のみ)。シングル / マルチが資料間で食い違う。シングル時の値で条件が違うため入れない。
- **A16**: 端末全体の平均 4.3W([実測] Notebookcheck、GB5.5・150cd。https://www.notebookcheck.net/Apple-A16-Bionic-Processor-Benchmarks-and-Specs.652742.0.html 。原ページ確認済み)。SoC 単体ではない。入れない。
- **A18 Pro**: 端末全体の平均 4.5W(https://www.notebookcheck.net/A18-Pro-vs-A18_18006_18007.247596.0.html 。検索要約のみ)。SoC 単体ではない。入れない。
- **A20 Pro**: Geekerwan の図に電力の記録なし(https://xenospectrum.com/en/a20-pro-liquid-nitrogen-cpu-performance/ 。検索要約のみ)。
- 取得できなかったページ: AnandTech(閉鎖)、Phoronix・TechPowerUp フォーラム・TechSpot・smallformfactor.net・notebookcheck-cn.com(403)。

### 3.2 Qualcomm / MediaTek(不採用の理由を含む)
- **Snapdragon 8+ Gen 1**: GSMArena の Burnout で CPU 9.88W(8 Gen 1 は 9.61W)。CPU / GPU 混合の負荷でピークか平均か不明。https://m.gsmarena.com/testing_the_snapdragon_8_gen_1_plus-review-2426p2.php 。原ページ確認済み。条件が違うので入れない(Snapdragon 865 も同様に値なし)。
- **Snapdragon 8 Gen 2**: 約 12W(Geekerwan ES・GB5。https://zhuanlan.zhihu.com/p/586132850 。検索要約のみ・403)/ GB6 マルチ平均 8.1W(8 Gen 2 領先版。端末か CPU か不明。https://mobile.zol.com.cn/824/8243751.html )/ 端末ピーク 15.85W(XDA の Burnout。端末全体。https://www.xda-developers.com/snapdragon-8-gen-2-vs-mediatek-dimensity-9200/ )。ES・別 SKU・端末全体が混在するので入れない。
- **Snapdragon 8 Gen 3**: 「14W 弱」(Ice Universe のリーク曲線。https://www.smartprix.com/bytes/mediatek-dimensity-9300-vs-qualcomm-snapdragon-8-gen-3-which-is-more-power-efficient/ )/ GB6 シングルで X4 単体 2.01W(快科技。https://news.mydrivers.com/1/960/960175_all.htm )/ GB6 ピーク 11W(小白測評の引用。GSMArena のコメント欄で、Turnstile のため未確認)。リーク曲線・概数・未確認なので入れない。
- **Dimensity 9300**: 「16W 強」(同じリーク曲線)/ X4 単体 1.73W / 多核ピーク 14.7W・11.2W など(条件不明)/ MediaTek 公式は「8 Gen 3 のピーク性能を約 11W で達成(8 Gen 3 は約 15W)」(相対比較)。入れない。
- **Snapdragon 8cx Gen 3**: Notebookcheck 仕様表の TDP 7W(出典なし、本文は 7〜9W)/ TechInsights の 10〜12W。食い違うので入れない。
- **Snapdragon 8 Elite Extreme Gen 6**: Qualcomm の「CPU 電力効率 +37%」(相対値のみ)。入れない。
- **Dimensity 9600 Pro**: 不採用(参考値として記録)。GB6 マルチ 12,765 点のとき 22.7W(GB7 マルチでは約 23.5W)。ES の工程機で、端末全体か SoC かは不明、測定者も不明。IT之家 https://www.ithome.com/1/014/806.htm 、原ページ確認済み。MediaTek の「マルチのピーク電力 61% 減」の主張と整合しない。プリセットの notes にも同じ内容を記録。
- **Dimensity 8200**: 王者栄耀 2.12W(ゲーム時。チップか端末か不明)。入れない。
- **Snapdragon 865・8s Gen 3・8s Gen 4・7 系・720G・6 Gen 1・4 Gen 2**: 値なし。データベースの TDP は出典不明、Notebookcheck の GB5.5 の電力は端末全体なので不採用。
- 取得できなかったページ: zhihu・nanoreview(403)、GSMArena のコメント欄(Turnstile)、AnandTech、web.archive.org、EDN China(タイムアウト)。
- 既存 peak の再確認: 8 Gen 1 の 11.1W は Geekerwan の GB5 マルチ(報道は 11.2W)。Dimensity 9000 の 9.8W は ES・GB5(1,287 / 4,474 点)・ベイパーチャンバーなし。8 Elite の 16.5W は Geekerwan の GB6 マルチ(Notebookcheck の後続記事は約 17W、初出 16.8W)。8 Elite Gen 5 の 19.5W は ES のボード電力・GB6 マルチ 12,546 点。Dimensity 9500 の 18W は ES・GB6 マルチ 10,716 点。Dimensity 9400 は Notebookcheck「over 18 watts」(GB6 マルチ、Geekerwan。18.4W とする報道は検索要約のみ)。Dimensity 9200 の 14W は既存どおりコメント欄のみ(信頼度低)。

### 3.3 NVIDIA(確認した原ページ)
- Orin: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/ と r36.4 の DeveloperGuide。
- Thor: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/ と r38.4 の DeveloperGuide。
- T239: Nintendo 公式 https://www.nintendo.com/en-gb/Hardware/Nintendo-Switch-2/Nintendo-Switch-2-Specifications-2785627.html (ホーム 8W・スリープ 0.5W)。

## 4. 評価への影響
設計書 §2.5.1 に前後の表。要点: ST は 102 件すべて不変。電力モデルの校正(powerK)は **プリセットごと**で、既存のどのプリセットの校正値も変わらない。peak が入ると電力制限が base → peak になり持続クロック・温度が変わる(5600X・5950X・7700・9700X)。base が入ったプリセット 8 件(395・7840HS・5800U・1200・2400G・2200G・EPYC 7401・7735HS)は電力モデル・温度が新たに出る。7840HS は公表 cTDP 範囲(35〜54W)が入って MT の帯が 0.81(電力未取得のフォールバック)→ 0.69 になり、MT が -2.5%(ok)→ -14.3%(ng)に変わった。これは**データの追加による変化であって、値の取り違えではない**。帯の係数は再校正していない(判断待ちとして設計書 §13.4 に登録)。
