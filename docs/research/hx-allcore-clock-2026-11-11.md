# HX / H 系ノート CPU の全コア持続負荷時の実測クロック・消費電力調査

- 取得日: 2026-11-11
- 調査方法: WebSearch(extended 中心)で候補を探し、WebFetch で原ページを開いて該当の文や表の数値を抽出した。
- 採用の基準: 原ページで数値を確認できたものだけを「確認済み」とした。検索結果の要約にしか出てこない値は「未確認(参考)」として別の欄に分けた。推測や補間で埋めた値はない。
- 対象: Core Ultra 9 275HX / Core i9-14900HX / Core i7-14700HX / Core i9-13980HX / Core Ultra 9 285H

## 0. 読み方の注意(重要)

1. 全コア負荷を P/E 別のクロックで公表しているレビューはほとんどなかった。Notebookcheck(英語)は Prime95 ストレス時の「CPU clock」を 1 つの値でしか出しておらず、P/E 別ではない。本表では「全体(P/E 区別なし)」と書いた。P/E を分けて出しているのは主に中国のメディア(快科技 = mydrivers、腾讯新闻)の AIDA64 FPU 単体負荷(单烤)テスト。
2. 負荷の種類がそろっていない。Cinebench の MT ループで、クロックとワット数の両方が文章になっていたのは MSI Titan 16 AI 2025(275HX、55W 固定)だけだった。その他は Prime95 か AIDA64 FPU で、Cinebench より重い AVX 系の負荷のため、クロックは Cinebench 時より低めに出る傾向がある。
3. 消費電力は特に断りがなければ CPU パッケージ電力(レビュー記事の表記どおり)。Notebookcheck の「board power draw」や、外部計測のシステム全体の電力とは区別した。
4. ARK の最大ターボとの比は、比率 = 実測クロック ÷ ARK 最大ターボ(P または E)で計算した。P/E 区別のない値には、P 最大比と E 最大比を両方載せた。

## 1. ARK 最大ターボ(比の分母)

| CPU | P 最大ターボ | E 最大ターボ | 備考 |
|---|---|---|---|
| Core Ultra 9 275HX | 5.4 GHz | 4.6 GHz | 8P+16E、PBP 55W / MTP 160W |
| Core i9-14900HX | 5.8 GHz | 4.1 GHz | 8P+16E、全コア P 最大 5.2 GHz(Notebookcheck の記事)、MTP 157W |
| Core i7-14700HX | 5.5 GHz | 3.9 GHz | 8P+12E、MTP 157W |
| Core i9-13980HX | 5.6 GHz | 4.0 GHz | 8P+16E、MTP 157W |
| Core Ultra 9 285H | 5.4 GHz | 4.5 GHz(LP-E 2.5 GHz) | 6P+8E+2LPE、PBP 45W / MTP 115W |

## 2. 実測データ(原ページ確認済み)

書式: CPU / 機種 / 電力設定(モード) / P クロック / E クロック / 負荷 / 消費電力 / 出典 URL / 取得日 / 原ページ確認

### 2.1 Core Ultra 9 275HX

| # | 機種 | 電力設定(モード) | P クロック | E クロック | 負荷 | 消費電力 | 出典 | 取得日 | 確認 |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Lenovo Legion Pro 7i 16 Gen 10 (RTX 5080) | Performance(ベンチ条件。PL1 156W / PL2 201W) | 3.9 GHz(全体・P/E 区別なし) | 同左 | Prime95 ストレス(安定時、95°C) | ~156 W | https://www.notebookcheck.net/Lenovo-Legion-Pro-7i-16-Gen-10-laptop-review.999828.0.html | 2026-11-11 | 済(原文 "The CPU would stabilize at 3.9 GHz, ~156 W, and 95 C when running Prime95 stress") |
| A2 | HP Omen Max 16 | Unleashed | 2.5 GHz(全体) | 同左 | Prime95 ストレス(安定時、98°C) | 108 W | https://www.notebookcheck.net/HP-Omen-Max-16-laptop-review-Super-fast-but-a-little-bit-too-hot.999164.0.html | 2026-11-11 | 済(原文 "would stabilize at 2.5 GHz, 98 C, and 108 W on Unleashed mode") |
| A3 | MSI Titan 16 AI 2025 | 55W 固定(锁55W) | ~3.0 GHz | 記載なし | Cinebench R23 MT(10 分) | 54.1 W(最大 57 W) | https://news.mydrivers.com/1/1044/1044868_all.htm | 2026-11-11 | 済(MT 25386pts) |
| A4 | MSI Titan 16 AI 2025 | 55W 固定 | ~3.3 GHz | 記載なし | Cinebench 2024 MT | 54.6 W | 同上 | 2026-11-11 | 済(MT 1495pts。原文の「最高功耗560W」は誤記と思われるため不採用) |
| A5 | MSI Titan 16 AI 2025 | 記載なし(既定) | 3.9 GHz(全核频率、P/E 区別なし) | 同左 | AIDA64 FPU 10 分(安定時、86°C) | 110 W(最大 186 W) | 同上 | 2026-11-11 | 済 |
| A6 | MSI Titan 16 AI 2025 | 記載なし | 3.0 GHz | 記載なし | CPU+GPU 同時負荷(双烤)30 分 | 63 W | 同上 | 2026-11-11 | 済(参考: 全コアの単体負荷ではない) |
| A7 | Lenovo ThinkPad T16g Gen 3 | Best Performance(PL1 65W / PL2 160W) | 記載なし | 記載なし | 10 分 CPU 負荷 | 160 W(短時間)→ 約 110 W → 1 分後に 65 W、以降 65〜90 W | https://www.notebookcheck.net/A-mobile-workstation-with-disappointing-performance-Lenovo-ThinkPad-T16g-Gen-3-review.1220451.0.html | 2026-11-11 | 済(電力のみ) |

### 2.2 Core i9-14900HX

| # | 機種 | 電力設定(モード) | P クロック | E クロック | 負荷 | 消費電力 | 出典 | 取得日 | 確認 |
|---|---|---|---|---|---|---|---|---|---|
| B1 | ASUS 天选5 Pro | PL1 100W / PL2 135W | 3.3 GHz | 2.7 GHz | AIDA64 FPU(13 分時点、最高 89°C) | 100 W(最初の 28 秒は 130 W) | https://m.mydrivers.com/newsview/957148_all.html | 2026-11-11 | 済 |
| B2 | 七彩虹 将星X17 Pro Max | 性能模式(TDP 55W / 最大 157W) | 3.6 GHz | 3.1 GHz | AIDA64 Stress FPU 30 分(98°C) | 120 W | https://news.mydrivers.com/1/959/959757.htm | 2026-11-11 | 済 |
| B3 | 七彩虹 将星X17 Pro Max | 性能模式 | 2.7 GHz | 2.3 GHz | AIDA64 FPU+FurMark(双烤) | 70 W | 同上 | 2026-11-11 | 済(参考: 双烤) |
| B4 | MSI Titan 18 HX A14VIG | Extreme Performance(ベンチ条件) | ~3.8 GHz(全体) | 同左 | Prime95 ストレス(ストレス表の値) | 記載なし | https://www.notebookcheck.net/MSI-Titan-18-HX-A14VIG-laptop-review-Year-of-the-dragon.794953.0.html | 2026-11-11 | 済(クロックのみ) |
| B5 | Schenker XMG Neo 17 (E24) 試作機 | PL 160W(PL4 250W)、水冷 Oasis は不使用 | 記載なし | 記載なし | Cinebench R23 MT(ベンチ中の平均) | パッケージ 平均 160 W(計測上は 170 W も観測) | https://www.notebookcheck.net/Intel-Raptor-Lake-HX-Refresh-analysis-Core-i9-14900HX-with-more-single-core-performance.790833.0.html | 2026-11-11 | 済(電力のみ。電力制限別の R23 MT: 150W=30308 / 130W=28933 / 115W=27750 / 100W=26323 / 80W=23334 / 55W=18258) |

### 2.3 Core i7-14700HX

| # | 機種 | 電力設定(モード) | P クロック | E クロック | 負荷 | 消費電力 | 出典 | 取得日 | 確認 |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Lenovo 拯救者 Y7000P 2024 | 野獣(Beast)プリセット(ゲーム検証時の記載) | 3.5 GHz | 記載なし | AIDA64 FPU 単体 10 分(93°C) | ~100 W(開始時 ~110 W) | https://news.qq.com/rain/a/20240604A037E800 | 2026-11-11 | 済 |
| C2 | Lenovo 拯救者 Y7000P 2024 | 同上 | ~2 GHz | 記載なし | 双烤 20 分(84°C) | ~45 W | 同上 | 2026-11-11 | 済(参考: 双烤) |
| C3 | Acer Predator Helios Neo 14 | Turbo/Max | 記載なし | 記載なし | AIDA64 FPU | ~115 W(平均 ~90°C) | https://nb.zol.com.cn/862/8628841.html | 2026-11-11 | 一部(ページが文字化けしていて原文を逐語確認できない。電力のみ) |

### 2.4 Core i9-13980HX

| # | 機種 | 電力設定(モード) | P クロック | E クロック | 負荷 | 消費電力 | 出典 | 取得日 | 確認 |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Alienware m18 R1 (RTX 4090) | 記載なし(PL1 143W / PL2 198W) | 3.4 GHz(全体) | 同左 | Prime95(安定時、99°C。初期 4.5 GHz / 198 W → 4.2 GHz / 175 W) | 143 W(board power と表記) | https://www.notebookcheck.net/Alienware-m18-R1-laptop-review-Bigger-and-heavier-than-the-MSI-Titan-GT77.703874.0.html | 2026-11-11 | 済 |
| D2 | ROG 枪神7 Plus 超竞版 | 增强模式 | ~4.0 GHz(P/E の区別は明記なし) | 同左 | AIDA64 単体負荷 30 分(パッケージ 92°C) | 平均パッケージ 139.4 W | https://news.qq.com/rain/a/20230220A09GFN00 | 2026-11-11 | 済 |

### 2.5 Core Ultra 9 285H

| # | 機種 | 電力設定(モード) | P クロック | E クロック | 負荷 | 消費電力 | 出典 | 取得日 | 確認 |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Lenovo Yoga Pro 9 16IAH10 (RTX 5050) | Windows Performance(PL1 61W / PL2 113W) | 3.2 GHz(全体) | 同左 | Prime95 ストレス(ストレス表の値) | 記載なし(PL1 61W は仕様値) | https://www.notebookcheck.net/Lenovo-Yoga-Pro-9-16IAH10-RTX-5050-review-Not-the-best-configuration-to-get.1189115.0.html | 2026-11-11 | 済(クロックのみ) |
| E2 | MSI Prestige 16 AI Evo | Balanced(115/45W) | 記載なし | 記載なし | Cinebench 連続ループ | 115 W(短時間)→ 45 W で安定。マルチ性能は約 30% 低下 | https://www.notebookcheck.net/MSI-Prestige-16-AI-Evo-review-The-multimedia-laptop-with-a-speedy-Arrow-Lake-CPU-and-impressive-runtimes.958869.0.html | 2026-11-11 | 済(電力のみ) |
| E3 | Asus Zenbook Duo | 記載なし | 記載なし | 記載なし | 持続負荷(Cinebench MT の大半は 35W/24W) | ピーク 60 W → 24 W で安定 | https://www.notebookcheck.net/Intel-Arrow-Lake-H-CPU-analysis-Core-Ultra-200H-makes-Lunar-Lake-almost-redundant.959328.0.html | 2026-11-11 | 済(電力のみ。電力制限別の CB2024 MT: 15W=451 / 20W=597 / 28W=778 / 35W=892 / 45W=977 / 55W=1042) |
| E4 | 中关村在线・快科技のテスト機(联想 小新Pro16GT AI 元启版) | 記載なし | 記載なし | 記載なし | 満載時(R23 MT 21403 / CB2024 MT 1174) | 50 W(73°C) | https://news.mydrivers.com/1/1034/1034683.htm | 2026-11-11 | 済(電力のみ) |

## 3. 未確認(参考)データ(検索結果の要約にのみ出現。原ページは 403 などで開けなかった)

| CPU | 機種 | 内容 | 出典 | 状態 |
|---|---|---|---|---|
| 275HX | 不明(知乎の回答) | FPU 単体負荷 / R23 で P 4.1 GHz・E 3.9 GHz・~145 W・93°C、R23 MT ~38000 | https://www.zhihu.com/question/13966061814/answer/1894791267499632005 | 未確認(403) |
| 275HX | Legion Pro 7i Gen10 | Performance 150 W 持続 / Balance 90 W / Quiet 55 W(Ultrabookreview) | https://www.ultrabookreview.com/71446-lenovo-legion-pro-7i-gen10-review/ | 未確認(403) |
| 14900HX | HP ZBook Fury 16 G11 | Prime95 で 2.3 GHz・69 W・82°C に落ち着く(PL1 69W) | https://www.notebookcheck.net/Nvidia-RTX-3500-Ada-performance-debut-HP-ZBook-Fury-16-G11-workstation-review.870630.0.html | 未確認(原ページで見つかったのはシステム電力 196 W → 111 W のみ。該当の文は見つからなかった) |
| 285H | ASUS 灵耀14 2025 | FPU 単体負荷で最大 61 W → 30 W 安定、81°C、2.3〜2.5 GHz | https://zhuanlan.zhihu.com/p/1920540369604551295 | 未確認(403) |

## 4. 最大ターボとの比と代表値

### 4.1 データ点ごとの比(確認済みでクロックがあるもの)

| # | CPU | 実測 | 電力 | 負荷 | P 最大比 | E 最大比 |
|---|---|---|---|---|---|---|
| A1 | 275HX | 3.9(全体) | 156 W | Prime95 | 0.72 | 0.85 |
| A2 | 275HX | 2.5(全体) | 108 W | Prime95 | 0.46 | 0.54 |
| A3 | 275HX | P 3.0 | 54 W | CB R23 MT | 0.56 | - |
| A4 | 275HX | P 3.3 | 55 W | CB 2024 MT | 0.61 | - |
| A5 | 275HX | 3.9(全核) | 110 W | AIDA64 FPU | 0.72 | 0.85 |
| B1 | 14900HX | P 3.3 / E 2.7 | 100 W | AIDA64 FPU | 0.57 | 0.66 |
| B2 | 14900HX | P 3.6 / E 3.1 | 120 W | AIDA64 FPU | 0.62 | 0.76 |
| B4 | 14900HX | 3.8(全体) | 不明 | Prime95 | 0.66 | 0.93 |
| C1 | 14700HX | P 3.5 | 100 W | AIDA64 FPU | 0.64 | - |
| D1 | 13980HX | 3.4(全体) | 143 W | Prime95 | 0.61 | 0.85 |
| D2 | 13980HX | 4.0(全体) | 139.4 W | AIDA64 | 0.71 | 1.00 |
| E1 | 285H | 3.2(全体) | 不明(PL1 61W) | Prime95 | 0.59 | 0.71 |

双烤(A6, B3, C2)は全コアの単体負荷ではないため、代表値の計算から外した。

### 4.2 CPU ごとの代表値(中央値)と幅(単体の全コア負荷、確認済みのみ)

| CPU | クロック中央値(幅) | P 最大比 中央値(幅) | 電力 中央値(幅) | n | 備考 |
|---|---|---|---|---|---|
| 275HX(フル電力: A1, A2, A5) | 3.9 GHz(2.5〜3.9)、全体値 | 0.72(0.46〜0.72) | 110 W(108〜156) | 3 | P/E 別の値はない。55W 固定時の P は 3.0〜3.3 GHz(比 0.56〜0.61) |
| 14900HX | P 3.45 GHz(3.3〜3.6)、E 2.9 GHz(2.7〜3.1) | P 0.60(0.57〜0.62)、E 0.71(0.66〜0.76) | 110 W(100〜120) | P/E 別 2 件(+全体値 3.8 GHz が 1 件) | B4 を含めた全体の中央値は 3.6 GHz |
| 14700HX | P 3.5 GHz(1 点のみ) | 0.64 | 100 W | 1 | E の値は未取得 |
| 13980HX | 3.7 GHz(3.4〜4.0)、全体値 | 0.66(0.61〜0.71) | 141 W(139.4〜143) | 2 | P/E 別の値はない |
| 285H | 3.2 GHz(1 点のみ)、全体値 | 0.59 | 未取得(仕様上の PL1 61W のみ。他機種の持続電力は 24〜50 W) | 1 | P/E 別の値はない |

## 5. 未取得の項目

- 275HX: P/E 別の全コアクロック(フル電力時)は未取得。55W 固定時の P のみ取得。
- 14700HX: E クロックは未取得。Cinebench MT 中のクロックも未取得。
- 13980HX: P/E 別のクロックは未取得。
- 285H: P/E 別のクロックと、クロックと電力を同時に記したデータは未取得。
- 全 CPU: Cinebench 2024 MT のループ中に P/E 別クロックとワット数を両方記したデータは、Titan 16 AI(275HX、55W、P のみ)の 1 件だけ。Ultrabookreview、Zhihu、Tom's Hardware 等は WebFetch が 403 で開けないか、該当の数値を本文に書いていなかった。
- 確認できなかった媒体: Ultrabookreview、TechPowerUp、PCWorld、HotHardware、Hardware Unboxed、Gamers Nexus(動画のみで本文に数値がないか、検索で見つからなかった)。
