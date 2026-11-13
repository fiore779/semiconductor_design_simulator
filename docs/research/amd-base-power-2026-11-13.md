# AMD の base 電力の確認(7840HS / 7735HS の 35W、EPYC 7401 の 170W)— 2026-11-13

設計書 §13.4 の判断待ち行「AMD の原ページ未再取得の項目(…7840HS/7735HS の 35W〔範囲の下端〕、EPYC 7401 の 170W〔2 値の一方〕)」(§5.3.3 K-9)のうち、電力の 2 項目を公式資料で確認した。調査のみで、コード・データ・git は変更していない。

- 取得日: 2026-11-13(すべて)
- 取得方法: Chrome(新規タブ。ページの DOM から文字列を抽出)。amd.com は WebFetch がタイムアウトしたため Chrome を使用。
- データ区分: [公表]=AMD 公式(amd.com・ir.amd.com)、[二次]=第三者

## 前提: プロジェクトでの base と range の使われ方

- `power.base.w` は PBP/TDP として電力モデルの校正に使う(設計書 §5.3.0 付近、電力制限モデルの手順 (1))。
- mobile-pc の MT 持続クロック係数の帯は `power.range.maxW`(なければ base)で決まる(`perf.js` の mtClockInfo、設計書 1636 行付近・§13.4 3081 行)。7735HS・7840HS は range.maxW 54W で「60W 以下」帯。
- したがって 7840HS / 7735HS の base 35W を変えると電力校正の結果が、range.maxW を変えると帯が変わり得る(帯の境界は 60W なので 45W〜54W の間では帯は変わらない)。

## 結果の一覧

| SKU | 公式の値([公表]) | 現データ(`data/presets/chips-pc.js`) | 差 |
|---|---|---|---|
| Ryzen 7 7840HS | 製品ページ: Default TDP **35-54W**、AMD Configurable TDP (cTDP) **35-54W**(単一の既定値なし)。発表時のプレスリリース(2023-01-04): TDP **35-45W** | base 35W(pub、範囲の下端を採用)、range 35〜54W | 範囲は製品ページと一致。base 35W は公式の単一値ではなく範囲の下端(公式に単一の既定値は見つからない)。発表時の上限 45W と現在の製品ページ 54W が食い違う |
| Ryzen 7 7735HS | 製品ページ: Default TDP **35-54W**、cTDP **35-54W**。発表時のプレスリリース(2023-01-04): TDP **35W**(単一値) | base 35W(pub、範囲の下端を採用)、range 35〜54W | 値は一致。35W はプレスリリースに単一値として公表されている(「範囲の下端を仮置き」ではなく公式の単一値で裏付けられる) |
| EPYC 7401 | サーバー仕様一覧: Default TDP **["155","170"]**、cTDP **項目なし(空)**、System Memory Specification **["2400","2666"]**、Memory Channels **8** | base 170W(pub)、range 155〜170W | 値は一致。155W / 170W のどちらがどの条件かは、公式の amd.com では明記なし(未取得)。下記の二次資料では 170W = DDR4-2666 時、155W = DDR4-2400 時 |

注: 依頼文の「Ryzen 5 7735HS」は、公式・プリセットとも **Ryzen 7** 7735HS(8C/16T)。

## SKU ごとの詳細

### Ryzen 7 7840HS

- [公表] AMD 製品ページ(2026-11-13 取得)
  https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7840hs.html
  - 表記: 「Default TDP 35-54W」「AMD Configurable TDP (cTDP) 35-54W」
  - 同ページ: 8C/16T、Base 3.8 GHz、Max Boost 最大 5.1 GHz、L2 8 MB、L3 16 MB、TSMC 4nm、Launch Date「Q4 2023」(プリセットの year 2023 と矛盾はしない。プレスリリースは 2023-01 発表・2023-03 搭載機出荷予定で、ページの Q4 2023 との違いの理由は未取得)
- [公表] AMD プレスリリース(CES 2023、2023-01-04。ir.amd.com、2026-11-13 取得。ページは日本語表示だが表は英語)
  https://ir.amd.com/news-events/press-releases/detail/1111/amdextends-its-leadership-with-the-introduction-of-its-broadest-portfolio-of-high-performance-pc-products-for-mobile-and-desktop
  - Ryzen 7040HS 系の表: 7940HS / 7840HS / 7640HS とも TDP「35-45W」。7840HS は 8C/16T、最大 5.1GHz / 3.8GHz、Cache 24MB
- 問題点
  1. 公式に単一の既定 TDP はない(製品ページは Default TDP も cTDP も同じ範囲 35-54W)。base 35W は「範囲の下端」の選択で、値そのものは公式の範囲内だが「公式の既定値」ではない。
  2. 範囲の上限が資料で食い違う: 発表時 35-45W、現在の製品ページ 35-54W。理由(後の拡張か、表記の変更か)は公式に記載が見つからない(未取得)。
- 推奨
  - base 35W は据え置き(公式の範囲 35-54W の下端で、発表時の 35-45W の下端とも一致。両資料で共通する下端は 35W だけ)。区分 pub は維持してよいが、notes に「公式に単一の既定値はなく、35W は Default TDP 範囲の下端(製品ページ 35-54W・プレスリリース 35-45W の共通の下端)」と書くのが正確。
  - range は現在の公式製品ページの 35〜54W のまま(帯は 45W・54W のどちらでも「60W 以下」で変わらない)。notes に発表時の 35-45W を併記する。
  - §13.4 の当該項目は「公式で確認済み: 単一の既定値なし。35W は範囲の下端(ユーザー判断で採用可否)」に更新できる。下端を採るか(例: 中央・上端を採るか)は推測では決められないため、ユーザー判断のまま残す。

### Ryzen 7 7735HS

- [公表] AMD 製品ページ(2026-11-13 取得)
  https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7735hs.html
  - 表記: 「Default TDP 35-54W」「AMD Configurable TDP (cTDP) 35-54W」
  - 同ページ: 8C/16T、Base 3.2 GHz、Max Boost 最大 4.75 GHz、L2 4 MB、L3 16 MB、TSMC 6nm、Launch Date「Q2 2023」
- [公表] 同じプレスリリース(2023-01-04、上の URL)
  - Ryzen 7035 系の表: 「AMD Ryzen 7 7735HS 8C/16T Up to 4.75 GHz / 3.2 GHz 20MB 35W」。同表の 7535HS も 35W、7735U・7535U・7335U は 15-28W(U は範囲、HS は単一値で書き分けている)
- 問題点: 製品ページは範囲表記のみだが、発表時の公式資料には単一値 35W がある。
- 推奨
  - base 35W は据え置き。notes の「範囲の下端を既定値とした選択はユーザー未確認」を、「AMD プレスリリース(2023-01-04)で TDP 35W(単一値)を公表。現在の製品ページは Default TDP / cTDP とも 35-54W」に置き換える。これで 7735HS の 35W は判断待ちから外せる。
  - range 35〜54W は製品ページのとおりで据え置き。

### EPYC 7401

- [公表] AMD サーバー仕様一覧(2026-11-13 取得。表は仮想スクロールのため、ページ内の data-json から該当行を読み出した)
  https://www.amd.com/en/products/specifications/server-processor.html
  (旧 URL https://www.amd.com/en/products/cpu/amd-epyc-7401 はこの一覧へ転送。個別製品ページ …/7001-series/amd-epyc-7401.html は 404)
  - 「AMD EPYC™ 7401」の行: Series EPYC 7001、24C/48T、Base 2 GHz、Max Boost 3 GHz、L3 64 MB、**Default TDP ["155","170"]**、**AMD Configurable TDP (cTDP) 値なし**、SP3、1P/2P、DDR4、**Memory Channels "8"**、System Memory Specification ["2400","2666"]、Per Socket Mem BW ["153.6","170.6"]
  - 同じ 2 値の並びは 7401P・7351・7501 などにもある。7451・7601 は TDP 180W・メモリ 2666 の 1 値だけ。
- [二次] AMD「EPYC Data Sheet」(Naples 世代)の第三者サイト上のコピー(https://www.karma-group.ru/upload/iblock/10c/amd-epyc-data-sheet.pdf 。2026-11-13、WebFetch で取得した PDF の文字列を抽出)
  - 7401 の行: 24 / 48 / Base 2.00 / All Core Boost 2.80 / Max Boost 3.00 / TDP「155/170」/ L3 64 / DDR 8ch / Max DDR Freq (1DPC)「2400/2666」/ 2P 理論メモリ帯域「307/341」/ x128
  - 表の列で TDP とメモリ速度が同じ並び(155/170 と 2400/2666)で書かれているが、両者の対応を説明する脚注は抽出した文字列には無かった。AMD のサイト上の原本は見つけられなかった(amd.com の PDF は取得タイムアウト)。
- [二次] WikiChip「7401」(検索結果の要約。原ページは接続拒否で未確認): TDP 170W で DDR4-2666 対応、DDR4-2400 使用時は TDP 155W、とする。
- 問題点: 公式(amd.com)は 2 値を並べるだけで、cTDP 欄は空。155W / 170W はそれぞれメモリ 2400 / 2666 と対になる設定とみられるが、その対応は二次資料でしか確認できない。
- 推奨
  - base 170W は据え置き。プリセットのメモリは DDR4-2666(公式の 2 値のうち上)なので、二次資料の対応(2666 ↔ 170W)と整合する。区分は、値 170W 自体は公式一覧にあるので pub のまま。「170W = DDR4-2666 時」という対応の部分だけ [二次](WikiChip、データシートのコピーの列の並び)と notes に書く。
  - range 155〜170W は「cTDP 範囲」ではない(公式の cTDP 欄は空)。notes に「range は公式 Default TDP の 2 値(メモリ 2400/2666 に対応するとみられる。[二次])で、cTDP ではない」と明記する。server は mtClockInfo の帯に使われないので、評価への影響はない。
  - 付随: notes の「チャネル数 8 は TechPowerUp の値のまま」は、公式一覧の Memory Channels "8" で [公表] に引き上げられる(電力モデルが「数字+ch」を読む件があるので、文字列を変える場合は電力・温度への影響に注意)。

## §13.4 への反映案(ユーザー判断用)

| 項目 | 現状 | 案 |
|---|---|---|
| 7735HS の 35W | 判断待ち(範囲の下端) | 解決: 公式プレスリリースの単一値 35W。notes の根拠だけ差し替え、値は不変 |
| 7840HS の 35W | 判断待ち(範囲の下端) | 公式に単一値なし(製品ページ 35-54W、発表時 35-45W)を確認済み。35W は両資料に共通する下端。採用はユーザー判断のまま(値は不変) |
| EPYC 7401 の 170W | 判断待ち(2 値の一方) | 公式は 155/170W の 2 値・cTDP 欄なし。170W は DDR4-2666 時([二次])で、プリセットのメモリ 2666 と整合。値は不変、対応関係の出典を notes に追記 |

いずれも数値の変更は不要(評価結果は変わらない見込み)。変更は notes と §13.4 の記述のみ。

## 未取得

- 7840HS の範囲上限が 45W → 54W になった理由(公式資料なし)。
- EPYC 7401 の 155W/170W とメモリ速度の対応を明記した AMD 公式資料(amd.com 上の Naples データシート原本・脚注)。
- 7840HS / 7735HS の製品ページのメモリチャネル数(今回は抽出していない)。
