# メモリ項(wPerMemCh)の出典調査 2026-11-12

調査のみ。プロジェクトのコードとデータは変えていない(試算は scratchpad の使い捨てスクリプトで、`js/sim/power.js` とプリセットを読み込んで実行しただけ)。取得日はすべて 2026-11-12。

区分: [公表] = メーカー/標準化団体の資料、[実測] = 第三者の測定、[二次] = 報道・解説記事、[推定] = 出典の値からの計算(参考値。採用値ではない)。
「原ページ確認」= 原ページ(PDF ならその本文)で数値・文言を自分で確認したもの。

---

## 0. 現状の把握(コード・データ)

- `js/sim/power.js`: `DEFAULT_UNCORE = { wPerL3MB: 0.1, wPerMemCh: 2.0, idleFactor: 0.2, singleFactor: 0.6 }`(コメントに「校正前の仮の既定値(根拠なし)」とある)。
  アンコア = `l3MB × wPerL3MB × actF + ch × wPerMemCh × actF`。actF は全コア負荷 1、シングル負荷 0.6、アイドル 0.2。**アンコア全体に powerK が掛かる**(`w: K * (coreW + uncoreW)`)。
- `memChannels()` はメモリ文字列の `(\d+)\s*ch` しか読まない。そのため:
  - 「2ch」と書いてあるプリセット(12900K、13900K、265K、**268V**、388H、AMD デスクトップ 9 件、Core Ultra 5 325、Core 5 320 は 1ch)だけにメモリ項が入る。
  - **185H・14700HX・7945HX は「2 チャネル」表記のため、メモリ項は今 0**(設計書 §5.2.4 の方針どおりで、「メモリチャネル数が未取得」の注記が出る)。Apple M シリーズは「128bit」表記なので同じく 0(しかも power.base が無く、電力の校正自体が行われない)。
  - 種別(DDR4 / DDR5 / LPDDR5 / LPDDR5X)、速度、オンパッケージかどうかは使われない。
- `data/memory.js` は種別・速度・バス幅(`bits`、既定 128、EPYC 7401 は 512)を持つが、電力モデルからは参照されない。
- 設計書 §6.1: 「メモリコントローラ+PHY: チャンネルあたり [W] × 種類(DDR5 / LPDDR5X)」を予定し、「DRAM 自体の電力はパッケージ電力に含めない」と書いている。オンパッケージ DRAM(Lunar Lake)の扱いには触れていない。
- 「ch」の単位: 268V の「2ch」は 64 bit 換算で 2 本という意味になる。Intel のデータシートでは **LPDDR5X 16 bit × 8 チャネル**(S2)。チャネル数をそのまま数えると 8 になり、2 W/ch のままなら 16 W(校正前)になる。単位をはっきりさせる必要がある。

---

## 1. 採用できる出典(原ページで数値を確認できたもの)

| ID | 区分 | 内容(数値) | 出典 URL | 原ページ確認 |
|---|---|---|---|---|
| S1 | [公表] | Lunar Lake の Memory on Package: 「Up to 40% lower PHY power」、「Up to 250mm² area savings」、「Support for 16b x4 channels」、「Up to 8.5GT/s per chip」、「Up to 32GB with 2 ranks」 | Intel, Hot Chips 2024(A. Gihon)スライド https://www.hc2024.hotchips.org/assets/program/conference/day1/56_HC2024.Intel.AGihon.final.pdf | 済(PDF 本文で確認) |
| S2 | [公表] | 200V シリーズは「compute tile、SOC tile、LPDDR5x MOP Memory を同じパッケージに載せる」。LPDDR5x: 最大 8533 MT/s、**8 channels of 16 bit**、VDDQ 0.3/0.5 V、VDD2H 1.07 V(範囲 1.01〜1.12 V)、VDD2L 0.9 V。DRAM の温度は P-Unit が読んで、メモリクロックを下げてスロットリングする。PBP の定義は「熱設計に使う最大の持続電力…Intel 指定のワークロードで検証」で、**DRAM を含むかどうかは書いていない**。注記に「PBP のワークロードは Thunderbolt などの I/O 接続を反映しない」とある | Intel Core Ultra 200V Series Processors Datasheet Vol.1、Doc 829568 Rev 004(2025 年 5 月) https://cdrdv2-public.intel.com/829568/829568-004.pdf | 済(PDF 本文 §1、Table 1、§14.1.1、§14.1.4、§14.2、§17.1.1) |
| S3 | [公表](インタビュー、Notebookcheck に掲載) | Intel の Robert Hallock:「メモリをパッケージに載せたことで、DRAM の PHY の電力が約 40% 減った」(原文 "reduces the PHY power cost of DRAM by ~40%") | https://www.notebookcheck.net/Conversations-around-ARM-vs-x86-power-are-false-Intel-s-Robert-Hallock-on-Lunar-Lake-s-strategy-and-how-it-is-well-poised-to-challenge-ARM-s-efficiency-narrative.867249.0.html | 済 |
| S4 | [二次] | 「Lunar Lake の消費電力には on-chip のメモリが含まれ、Meteor Lake では含まれていない」(Intel の IFA 2024 の比較について) | Notebookcheck https://www.notebookcheck.net/Core-Ultra-Series-2-In-Lunar-Lake-Intel-introduces-its-most-efficient-x86-CPU-yet.883389.0.html | 済 |
| S5 | [二次] | Intel の「パッケージ電力が最大 50% 低い」は、Lunar Lake 側だけ 32GB のオンパッケージメモリの電力を含めて測った、Meteor Lake 側のメモリ電力は測っていない | Tom's Hardware https://www.tomshardware.com/pc-components/cpus/intel-launches-lunar-lake-claims-arm-beating-battery-life-worlds-fastest-mobile-cpu-cores | 済(Chrome) |
| S6 | [二次] | 「The package power includes the LP5X memory」 | Wccftech https://wccftech.com/intel-core-ultra-200v-lunar-lake-launch-cpu-gpu-ai-leadership-over-qualcomm-amd-much-better-battery-life/amp/ | 済 |
| S7 | [実測] | Ryzen 9 9950X の SoC(I/O ダイ全体)の電力(Ryzen Master の「SoC Power」。メモリコントローラのほか Infinity Fabric・IO Hub なども含む)。DDR5-4800(VSoC 1.025 V): アイドル 7.6 W / Cinebench 10.6 W / Y-Cruncher 11.4 W。DDR5-4800 を VSoC 1.2 V にすると 11.5 / 17.0 / 18.0 W。DDR5-5600(VSoC 1.2 V): 11.6 / 17.4 / 18.6 W。DDR5-6000: 12.1 / 17.8 / 18.9 W。DDR5-7200: 13.7 / 20.0 / 21.5 W。DDR5-8000: 15.6 / 21.8 / 23.6 W。本文: 4800 を超えると BIOS が VSoC を 1.2 V に上げる。電力制限(TDP/PPT)はプロセッサ全体に掛かるので、I/O ダイが多く使うと CPU の分が減る | TechPowerUp「DDR5 Memory Performance Scaling with AMD Zen 5」p.3 https://www.techpowerup.com/review/ddr5-memory-performance-scaling-with-amd-zen-5/3.html (グラフ画像 https://tpucdn.com/review/ddr5-memory-performance-scaling-with-amd-zen-5/images/soc-power.png) | 済(Chrome。本文はブラウザの自動翻訳で日本語表示、グラフは原文の英語画像で数値を読んだ) |
| S8 | [公表] | Micron LPDDR5X CAMM2 Technical Brief(Rev A 12/2023): 仕様表で **Energy per Bit 4 pJ/bit**、Self-Refresh Power <1 mW、VDD/VDDQ 1.05 V / 0.5 V、最大 9.6 Gb/s。Table 2(1-beta の DDR5 x8 @5600〔SODIMM〕と LPDDR5X x8 @6400〔LPCAMM2〕のダイあたりの測定電流、mA): IDD0 32 → 18(-43.8%)、IDD2N(アイドル)23 → 7(-69.6%)、IDD4R(リード)302 → 140(-53.6%)、IDD6(セルフリフレッシュ)5.5 → 0.8(-85.5%)。Micron のラボで DDR5-4800 と LPDDR5X-4800 を比べ、PCMark 10・Cinebench で 57%、AI-Benchmark で 61% 低い電力(64 bit バスあたりのアクティブ電力は最大 61% 低い) | 確認したのは smtnet.com の転載 https://smtnet.com/library/files/upload/lpddr5x-camm2-technical-brief.pdf (micron.com の原本 URL は未確認。文書末尾に ©2023 Micron と文書番号 CCM004-676576390-11741 あり) | 済(転載 PDF の本文) |
| S9 | [公表] | NVIDIA Grace の LPDDR5X メモリ部は、8 チャネルの DDR5 と比べて帯域が最大 53% 多く、**GB/s あたりの電力は 1/8**、コストは同程度 | NVIDIA Developer Blog「NVIDIA Grace CPU Superchip Architecture In Depth」 https://developer.nvidia.com/blog/nvidia-grace-cpu-superchip-architecture-in-depth | 済 |
| S10 | [公表] | Micron と Meta の白書: LPDDR5X の電力は DDR5 の約 1/3、システム電力の 7% 未満。Tensor Rebatching では DRAM がシステム電力の 6.8%。Multichase の正規化 DRAM 電力は DDR5 = 1 に対して LPDDR5X = 0.23 / 0.25(75% 超の削減) | Micron white paper https://s25.q4cdn.com/621799436/files/doc_downloads/white_papers/lpddr-gen-purp-ai-wkloads-in-lg-scale-dc-deploy-white-paper-4.pdf | 済(PDF 本文) |
| S11 | [公表](設計の余裕値。測定値ではない) | Crucial(Micron): 消費電力は条件で変わるのでメモリの電力は公表していない。電源を選ぶときは標準的なコンシューマー向けメモリで**モジュールあたり 5 W** を見込むよう勧めている | https://www.crucial.com/support/articles-faq-memory/how-much-power-does-memory-use | 済(Chrome、自動翻訳表示) |
| S12 | [二次] | DDR5 の電圧は 1.1 V(DDR4 は 1.2 V)。DIMM 上で電圧を作る | Electronic Design(Objective Analysis) https://www.electronicdesign.com/technologies/embedded/article/21251500/objective-analysis-ddr5-dram-how-a-new-interface-improves-performance-with-less-power | 済 |
| S13 | [公表](JEDEC Mobile Forum 2013 の講演資料、M. Greenberg) | 「Energy per bit (pJ/bit = mW/Gbit/s)」の表。LPDDR4 の 2 ch / 4 ch、3200 / 4266 で、**仮定した** 1・2・5・10 pJ/bit のときの電力(例: 1 pJ/bit、2ch LPDDR4-3200 で 205 mW)。メモリコア電力・アドレス/コマンドバス・PHY・メモリコントローラは含まない。**pJ/bit の実測値ではなく、P = pJ/bit × 帯域 の式の出典として使う** | pc.watch に掲載の PDF https://pc.watch.impress.co.jp/img/pcw/docs/1197/355/JEDEC.pdf | 済(PDF 本文) |

### 採用しないもの(確認できなかった、または質が低い)

- Intel IFA 2024 プレス資料の脚注「Including 32GB memory」(igorslab.de の PDF): 403 で原本を開けず、検索の要約だけ。→ 未確認。
- Wikipedia 系の「オンパッケージメモリで TDP が 2 W 増える」: 出典がリーク・報道で、Intel の一次資料が見つからない。→ 不採用。
- NVIDIA の FMS 2025 講演(GH200、LPDDR5X 19.9 W と DDR5 86.5 W): PDF の取得がタイムアウトし、数値は検索の要約だけ。→ 未確認。
- ISSCC の LPDDR5 送受信回路の pJ/bit(1.11 pJ/bit @7.5 Gb/s など): ResearchGate の要約だけで原論文を見ていない。I/O 回路の 1 ピンだけの値なので、メモリ系全体の値にも使えない。→ 不採用。
- Patsnap・Wevolver・Lexar・SEO サイトの pJ/bit(DDR5 14〜16、LPDDR5X 6.5〜7.5 など): 出典がなく、同じページ内でも数値が食い違う。→ 不採用。
- SemiAnalysis「The Memory Wall」: 種別ごとの pJ/bit の値が無い(「チップの外へ 1 bit 出すのに 2 pJ」という一般論だけ)。→ 不採用。
- MacRumors フォーラムの powermetrics「DRAM Power」(M1 Max でアイドル 227 mW など): 個人の書き込み。→ 不採用。

---

## 2. 調査項目ごとの結果

### 2-1) CPU 側のメモリコントローラ+PHY の電力

- **AMD(DIMM、DDR5)**: S7 が唯一の実測。I/O ダイ全体で DDR5-4800 のとき負荷時 10.6〜11.4 W、DDR5-5600 以上(VSoC 1.2 V)で 17.4〜23.6 W。メモリ速度による差の大部分は **VSoC が 1.025 → 1.2 V に上がること**による(同じ 4800 で 1.2 V にすると 10.6 → 17.0 W。電圧が同じなら 4800 → 5600 で +0.4 W)。I/O ダイには MC 以外も含まれるので、MC+PHY だけの W ではない。測ったのは 9950X で、7945HX(Dragon Range)が同じ I/O ダイで同じ VSoC かは未確認。
- **Intel**: 種別ごとの MC+PHY の W は見つからなかった。比率だけ: オンパッケージにすると PHY の電力が「最大 40%」(S1)、「約 40%」(S3)減る。基準は基板上・SO-DIMM・CAMM2 のメモリ(TechPowerUp の解説。検索の要約で、原ページは見ていない)。
- **pJ/bit**: 種別(DDR4 / DDR5 / LPDDR5 / LPDDR5X)ごとの MC+PHY の pJ/bit は、一次資料で確認できた値が無い。計算に使える式だけ確認できた: P[mW] = E[pJ/bit] × 帯域[Gbit/s](S13 の定義 pJ/bit = mW/(Gbit/s))。

### 2-2) DRAM チップ自体の電力と、オンパッケージ DRAM がパッケージ電力に入るか

- **DRAM の値(出典あり)**:
  - LPDDR5X のエネルギー: **4 pJ/bit**(S8。どこまで含むか〔DRAM だけか、I/O の終端を含むか〕は書いていない)。
  - ダイあたりの電流(S8 Table 2): DDR5-5600 x8 で IDD4R 302 mA / IDD2N 23 mA、LPDDR5X-6400 x8 で 140 mA / 7 mA。
  - 比率: LPDDR5X は DDR5 の約 1/3(S10、サーバー)、GB/s あたり 1/8(S9、サーバー。システムとして)、クライアントのベンチで -57〜61%(S8、どちらも 4800)。
  - 種別ごとの DRAM の W/ch(DDR4、LPDDR5)は未取得。Micron の DDR5 データシートの IDD 表(Digi-Key・Farnell・Mouser の PDF)は取得がタイムアウト。Micron の電力計算ツール(TN-40-07 / TN-53-01 の系統)はダウンロードが必要なので使っていない。
- **Lunar Lake のオンパッケージ LPDDR5X は CPU パッケージの電力に入るか**:
  - Intel の一次資料(S2)では、LPDDR5x は「プロセッサーの同じパッケージ」に載り、DRAM の温度はプロセッサーの P-Unit が管理する。ただし **PBP/MTP の定義に DRAM の電力を含むとは書いていない**(ARK の定義も「プロセッサー」の電力で、DRAM への言及は確認できなかった)。
  - Intel の発表の比較(パッケージ電力 -50%)では、Lunar Lake 側に 32GB のメモリの電力を含めたと複数の報道が書いている(S4、S5、S6、いずれも [二次])。Intel の原資料の脚注(IFA 資料)は 403 で未確認。
  - 結論: 「Intel のマーケティング上のパッケージ電力には DRAM が入っている」は [二次] で 3 件一致。「ARK の PBP 17 W に DRAM が入っている」は**未確認**(明記した Intel の資料が見つからない)。
  - Notebookcheck・Chips and Cheese で、Lunar Lake の DRAM の電力を分けて測った記事は見つからなかった(Chips and Cheese の Lion Cove 記事は、メモリサイドキャッシュの目的として「オンパッケージ DRAM の電力は大きい」と書いているだけ。数値なし。検索の要約)。

---

## 3. 既存モデルとの比較(試算は参考。値はまだ入れない)

### 3-1. 出典値から計算した参考値([推定]、計算式つき)

| # | 対象 | 式と出典 | 結果 |
|---|---|---|---|
| C1 | 268V の LPDDR5X の DRAM(帯域いっぱいのとき) | 帯域 = 8533 MT/s × 128 bit(16 bit × 8、S2)= 136.5 GB/s = 1092 Gbit/s。P = 4 pJ/bit(S8)× 1092 Gbit/s(式は S13) | **4.37 W**(帯域 100% のとき。実際の負荷の帯域使用率は不明) |
| C2 | DRAM の VDD 系だけ、64 bit(x8 ダイ 8 個、1 ランク)あたり | P = IDD(S8)× 電圧 × 8。DDR5 は 1.1 V(S12)、LPDDR5X は 1.05 V(S8 の VDD)。**IDD がどの電源系の値かは S8 に書いていない**ので、電圧の当てはめは前提(推定) | DDR5-5600: リード連続 2.66 W / アイドル 0.20 W。LPDDR5X-6400: リード連続 1.18 W / アイドル 0.059 W。VPP・VDD1・VDDQ は含まない。LPDDR5X は 8533 ではなく 6400 の値 |
| C3 | 268V の DRAM(C2 を 128 bit に) | C2 の LPDDR5X × 2 | リード連続 2.35 W / アイドル 0.12 W |
| C4 | AMD の I/O ダイ(S7)を 2 チャネルで割る | 10.6 W ÷ 2 | 5.3 W/ch(I/O ダイ全体なので上限側)。アイドル → Cinebench の増分 3.0 W ÷ 2 = 1.5 W/ch(MC だけの値ではない) |

### 3-2. 「2 W/ch」は妥当か

- 268V(オンパッケージ LPDDR5X): モデルのメモリ分は校正前 4.0 W(2 W × 2)で、**powerK = 1.791 が掛かって 7.16 W**(PBP 17 W の 42%)。出典から作った DRAM だけの参考値は、帯域いっぱいで 4.37 W(C1)、リード連続で 2.35 W(C3)。PHY/MC の W は未取得。
  - 校正前の 4.0 W だけなら C1 に近い。しかし powerK が掛かるので、**帯域いっぱいの DRAM だけの値より約 1.6 倍大きい**。全コア負荷(Cinebench 相当)で帯域が使い切られる根拠も無い。
  - DRAM がそもそも PBP に入るかが未確認(§2-2)。入らないなら、残るのは PHY/MC だけ(値は未取得)。
- DIMM の機種(14700HX・7945HX など): DRAM は CPU パッケージの外。設計書 §6.1 の「DRAM はパッケージ電力に含めない」と合う。CPU 側の参考値は AMD の I/O ダイ全体で 5.3 W/ch(上限側)〜 1.5 W/ch(負荷による増分)。2 W/ch はこの範囲に入るが、Intel の値は無く、AMD の値も I/O ダイ全体のもの。
- 判断: **種別・実装場所ごとに置き換えるための出典値は、まだそろっていない**。そろっているのは「LPDDR5X の DRAM 4 pJ/bit」「LPDDR5X / DDR5 の IDD の比」「AMD の I/O ダイの実測」「オンパッケージで PHY -40%」だけ。DDR4・LPDDR5(Apple)・Intel の MC+PHY は未取得。

### 3-3. 置き換えるなら、こういう表になる(空欄は未取得。値は入れていない)

| 種別 | CPU 側 MC+PHY(パッケージに入る) | DRAM(オンパッケージのときだけパッケージに入る) | 出典 |
|---|---|---|---|
| DDR4-3200 | 未取得 | 未取得(パッケージ外) | — |
| DDR5-4800 / 5600 / 6400 | AMD: I/O ダイ全体 10.6 W(4800、2ch、負荷)/ 17.4 W(5600、VSoC 1.2 V)[実測]。Intel: 未取得 | パッケージ外。参考: IDD4R 302 mA/ダイ(x8、5600)→ C2 で 2.66 W/64 bit | S7、S8 |
| LPDDR5-6400(Apple M) | 未取得 | 未取得(Apple は公表なし) | — |
| LPDDR5X-7467 / 8533 / 9600 | オンパッケージなら基板上より PHY 電力が最大 40% 減(比率だけ)[公表] | 4 pJ/bit [公表] → 268V で帯域 100% のとき 4.37 W(C1)。IDD4R 140 mA/ダイ(x8、6400) | S1、S3、S8 |

実装の形の提案(案。値は未定):
1. 「ch」をやめ、`data/memory.js` の `bits`(バス幅)と種別を使い、64 bit あたり、または pJ/bit × 帯域 × 帯域使用率 で計算する。268V の「2ch」は 16 bit × 8 と食い違って見えるため。
2. 項を 2 つに分ける: (a) CPU 側の MC+PHY(常にパッケージに入る)、(b) DRAM(オンパッケージのときだけ。PBP に入るかは要確認)。
3. メモリ項は **powerK の外**に置く(出典の値は実際の W なので、校正係数を掛けると大きくなりすぎる。今の 268V は 4.0 W → 7.16 W)。

### 3-4. 代表機種の試算(参考。ベースクロック・全コア負荷・Tj 70℃、PBP に校正)

`calibratePower` / `chipPower` を読み込んで wPerMemCh だけ変えて実行(コードは変えていない)。「仮に 2ch」はメモリ文字列の末尾に「2ch」を足したとき。

| 機種(PBP) | 条件 | powerK | コアの W | メモリ分の W(PBP に対する割合) |
|---|---|---|---|---|
| 268V(17 W) | **現行** 2 W/ch | 1.791 | 7.69 | 7.16(42.1%) |
| 〃 | 0 W/ch(メモリ項なし) | 3.095 | 13.29 | 0 |
| 〃 | 0.059 W/ch(C2 の LPDDR5X アイドル) | 3.030 | 13.01 | 0.36(2.1%) |
| 〃 | 1.176 W/ch(C2 の LPDDR5X リード連続) | 2.167 | 9.30 | 5.10(30.0%) |
| 〃 | 2.184 W/ch(C1 の 4.37 W を 2 で割る) | 1.724 | 7.40 | 7.53(44.3%) |
| 〃 | 参考: K の外に固定 2.35 W(C3)/ 4.37 W(C1) | 2.667 / 2.299 | 11.45 / 9.87 | 2.35 / 4.37(13.8% / 25.7%) |
| 185H(45 W) | **現行**(「2 チャネル」表記なので 0) | 4.117 | 35.12 | 0 |
| 〃 | 仮に 2ch・2 W/ch | 3.014 | 25.71 | 12.06(26.8%) |
| 〃 | 仮に 2ch・1.176 W/ch(LPDDR5X リード連続) | 3.388 | 28.90 | 7.97(17.7%) |
| 14700HX(55 W) | **現行**(0) | 4.116 | 41.42 | 0 |
| 〃 | 仮に 2ch・2 W/ch | 3.168 | 31.88 | 12.67(23.0%) |
| 〃 | 仮に 2ch・1.5 / 5.3 W/ch(C4) | 3.361 / 2.295 | 33.83 / 23.10 | 10.08 / 24.33(18.3% / 44.2%) |
| 7945HX(55 W) | **現行**(0) | 2.149 | 41.25 | 0 |
| 〃 | 仮に 2ch・2 W/ch | 1.859 | 35.67 | 7.43(13.5%) |
| 〃 | 仮に 2ch・1.5 / 5.3 W/ch(C4) | 1.924 / 1.520 | 36.92 / 29.17 | 5.77 / 16.11(10.5% / 29.3%) |
| Apple M1 / M3 / M4 | 現行 | — | — | power.base が無く校正されない(メモリ項も 0) |

読み方: メモリ項を増やすと powerK が下がり、コアの W(= 持続クロック・MT)が下がる。268V のコアの W は、メモリ項の決め方しだいで 7.4〜13.3 W(約 1.8 倍)も変わる。K の外に出すかどうかでも大きく変わる。

---

## 4. 未取得・未確認のもの

1. ARK の PBP(17 W)に、オンパッケージ LPDDR5X の電力が入るかを明記した Intel の資料(データシート 829568 の PBP の定義には記載なし。IFA 資料の脚注は 403)。
2. Intel の MC+PHY の W(DDR5 / LPDDR5X、種別・速度ごと)。Meteor Lake / Arrow Lake / Raptor Lake いずれも無し。
3. 種別ごとの MC+PHY・DRAM の pJ/bit(DDR4、DDR5、LPDDR5)の一次資料。LPDDR5X の 4 pJ/bit(Micron)だけ確認できた。
4. Micron の DDR5 / DDR4 のデータシートの IDD 表(PDF の取得がタイムアウト)、Micron の電力計算ツール(ダウンロードが必要なので不可)。
5. Apple M シリーズの DRAM の電力(公表なし。powermetrics の「DRAM Power」はフォーラムの書き込みだけ)。
6. 7945HX の I/O ダイが 9950X と同じで、VSoC も同じか。
7. Lunar Lake の DRAM の電力を分けて測った第三者の記事(Notebookcheck・Chips and Cheese では見つからなかった)。
8. S8 の IDD がどの電源系(VDD / VDD2H など)の値か。C2 の電圧の当てはめはこれ次第。
9. 全コア負荷(校正のワークロード)でのメモリ帯域の使用率。pJ/bit × 帯域で計算するには、これが必要。
