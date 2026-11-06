# AMD Kraken Point(Krackan Point)調査メモ

調査日: 2026-10-31。表記は AMD 社内コード名の綴り揺れがあり、二次資料の多くは **"Krackan Point"** と書く(本メモでは同じものとして扱う)。

## 0. データのルールと出典の略号

区分は **[実測] > [公表] > [二次] > [推定] / 未取得**。値ごとに区分と出典を付ける。

| 略号 | 出典 | 取得方法・状態 |
|---|---|---|
| W300 | Wikipedia「Template:AMD Ryzen AI Mobile 300 series」 https://en.wikipedia.org/w/index.php?title=Template:AMD_Ryzen_AI_Mobile_300_series&action=raw | 原ページ(wikitext)を直接取得し、rowspan を手で展開して読んだ。[二次](表の出典の多くは AMD 公式) |
| W400 | Wikipedia「Template:AMD Ryzen AI Mobile 400 series」 https://en.wikipedia.org/w/index.php?title=Template:AMD_Ryzen_AI_Mobile_400_series&action=raw | 同上。[二次] |
| WZ5 | Wikipedia「Zen 5」 https://en.wikipedia.org/w/index.php?title=Zen_5&action=raw | 同上。[二次] |
| NBC350 | Notebookcheck「AMD Ryzen AI 7 350 Processor - Benchmarks and Specs」 https://www.notebookcheck.net/AMD-Ryzen-AI-7-350-Processor-Benchmarks-and-Specs.949825.0.html | 原ページを直接取得(WebFetch、2026-10-31)。仕様は [二次]、ベンチは機種レビューの [実測] の集計 |
| NBC340 | Notebookcheck「AMD Ryzen AI 5 340 Processor - Benchmarks and Specs」 https://www.notebookcheck.net/AMD-Ryzen-AI-5-340-Processor-Benchmarks-and-Specs.950403.0.html | 同上 |
| NBC370 | Notebookcheck「AMD Ryzen AI 9 HX 370 Processor - Benchmarks and Specs」 https://www.notebookcheck.net/AMD-Ryzen-AI-9-HX-370-Processor-Benchmarks-and-Specs.836729.0.html | 同上(比較用) |
| NBC330R | Notebookcheck レビュー「Dual debut in the Lenovo IdeaPad Slim 5 16: Ryzen AI 5 330 and Radeon 820M in review」 https://www.notebookcheck.net/Dual-debut-in-the-Lenovo-IdeaPad-Slim-5-16-Ryzen-AI-5-330-and-Radeon-820M-in-review.1166676.0.html | 原ページを直接取得。[実測] |
| HH330 | HotHardware「AMD Unveils Ryzen AI 5 330 To Fuel Cheaper Copilot+ Laptops」(2025-07-16) https://hothardware.com/news/amd-unveils-ryzen-ai-5-330-cheaper-copilot-laptops | 原ページを直接取得。[二次] |
| TH-CES | Tom's Hardware「AMD launches Ryzen AI 300 and 200 series chips for laptops」 https://www.tomshardware.com/pc-components/cpus/amd-launches-ryzen-ai-300-and-200-series-chips-for-laptops | 原ページを直接取得(本文 HTML からキーワード抽出)。[二次] |
| CW | cpu-wiki「ryzen ai 7 350」 https://cpu-wiki.pages.dev/cpu/ryzen-ai-7-350 | 原ページを直接取得。[二次](出典の記載なし。信頼度低) |

**取得不可(ボット対策・403。回避していない)**:
- TechPowerUp CPU Database(https://www.techpowerup.com/cpu-specs/ryzen-ai-7-350.c4004 ほか): HTTP 403。
- Geekbench Browser(GB7 検索 https://browser.geekbench.com/v7/cpu/search?q=Ryzen+AI+7+350 、プロセッサページ https://browser.geekbench.com/processors/amd-ryzen-ai-7-350 、個別結果 v6/cpu/15517578): WebFetch は 403、curl は Cloudflare の「Just a moment...」。
- NanoReview(https://nanoreview.net/en/gpu/radeon-820m): HTTP 403。
- Guru3D(https://www.guru3d.com/story/ryzen-ai-5-330-detailed-specs-zen-5-zen-5c-and-radeon-4-cu-gpu/): HTTP 403。

**AMD 公式(amd.com)は再取得していない(本メモ作成時点。2026-11-06 更新: Chrome の通常閲覧なら取得でき、350 は公式で確認済み。amd-official-audit-2026-11-06.md 参照)。** W300 の各 SKU 名は amd.com の製品ページにリンクしており、W300 の値は AMD 公表値の転記と思われるが、本メモでは W300 経由の [二次] として扱う。

## 1. SKU 一覧

### 1.1 Kraken Point 世代(Ryzen AI 300 のうち Ryzen AI 5 / 7)

W300 の表を展開した値。全 SKU 共通(W300 の共通項目欄): パッケージ BGA **FP8**、DDR5-5600 / LPDDR5X-8000 デュアルチャネル、PCIe 4.0 16 レーン、USB4 ×2、USB 3.2 Gen2 ×2、iGPU は RDNA 3.5、NPU は XDNA 2、Zen 5 / Zen 5c とも AVX-512 を 256bit 幅 FPU で実行、L1 80KB/コア(D48+I32)、L2 1MB/コア、プロセス TSMC N4P。

| SKU | コード名 | 総コア(スレッド) | Zen 5 | Zen 5c | ベース | 最大ブースト Zen 5 | 最大ブースト Zen 5c | L2 合計 | L3 合計 | iGPU | iGPU クロック | NPU | TDP(cTDP) | 発売 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ryzen AI 7 350 | Krackan Point | 8 (16) | 4 | 4 | 2.0 GHz | 5.0 GHz | 3.5 GHz | 8 MB | 16 MB | Radeon 860M, 8 CU | 3.0 GHz | 50 TOPS | 28 W (15–54 W) | 2025-02-18 |
| Ryzen AI 7 PRO 350 | Krackan Point | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 2025-03-27 |
| Ryzen AI 5 340 | Krackan Point | 6 (12) | 3 | 3 | 2.0 GHz | 4.8 GHz | 3.4 GHz | 6 MB | 16 MB | Radeon 840M, 4 CU | 2.9 GHz | 50 TOPS | 28 W (15–54 W) | 2025-02-18(注1) |
| Ryzen AI 5 PRO 340 | Krackan Point | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 | 2025-03-27(注1) |
| Ryzen AI 5 330 | **Krackan Point 2**(注2) | 4 (8) | 1 | 3 | 2.0 GHz | 4.5 GHz | 3.4 GHz | 4 MB | 8 MB | Radeon 820M, 2 CU | 2.8 GHz | 50 TOPS | 28 W (15–28 W) | 2025-07 |

区分と出典:
- 上表のコア数・クロック・L3・iGPU・NPU・TDP・発売日は全て **[二次] W300**。L2 合計は W300 の「1MB/コア」×コア数で計算(NBC350 も「L2 8 MB」、NBC340 も「L2 6 MB」と記載 [二次]、HH330 も 330 の L2 4MB [二次])。
- 注1: W300 は 350 と 340 の発売日欄を rowspan で共有している(「(March 27, 2025) February 18, 2025」)。340 個別の日付は原表で区別されていない。
- 注2: 330 が別ダイ「Krackan Point 2」であることは NBC330R の仕様行「Krackan Point 2 (Zen 5)」[二次] と HH330「Officially another Krackan Point part (and unofficially, Krackan Point 2)」[二次]。AMD は公式には Krackan Point と呼んでいる(検索要約(原ページ未確認)、Guru3D)。
- 発表: CES 2025(2025-01-06)。NBC350・NBC340 の Announcement Date「01/06/2025」[二次]、W300 の Strix Halo 欄の CES 出典も同日。
- メモリ: NBC350・NBC340 とも「DDR5-5600 / LPDDR5x-8000」[二次] で W300 と一致。
- TDP の補足: NBC350・NBC340 は「28 Watt (TDP Turbo PL2: 54 Watt)」[二次]。TH-CES は「AMD offers a wide cTDP Range for Krackan, from 15W to 54W」[二次]。
- NPU の補足: NBC350 は「50 TOPS INT8 (Chip AI: 66 TOPS INT8)」、NBC340 は「50 TOPS INT8(chip AI 59 TOPS)」[二次]。

### 1.2 Zen 5c のベースクロック

W300 はベースクロックを 1 列(全 SKU 2.0 GHz)しか持たず、Zen 5 / Zen 5c を区別していない。HH330 は 330 について「single Zen 5 core clocked at 2GHz to 4.5GHz, and three Zen 5c cores clocked at 2GHz to 3.4GHz」[二次] と、両方 2.0 GHz と書く。350・340 の Zen 5c ベースを別に示す出典は**未取得**。

### 1.3 同じダイを使う可能性がある後継 SKU(参考。ダイの対応は未確認)

W400(Ryzen AI 400 = Gorgon Point、2026-01-05 発売)には Kraken Point と同じ構成の SKU が並ぶ。W400 はダイ名を区別しておらず、**どれが Krackan / Krackan 2 ダイかは未確認**。

| SKU(W400 [二次]) | Zen 5 + Zen 5c | ベース | ブースト Zen 5 / 5c | L3 | iGPU | NPU | TDP |
|---|---|---|---|---|---|---|---|
| Ryzen AI 7 450 | 4 + 4 | 2.0 | 5.1 / 3.6 | 16 MB | 860M 8CU 3.1GHz | 50 TOPS | 15–54 W |
| Ryzen AI 7 445 | 2 + 4 | 2.0 | 4.6 / 3.5 | 8 MB | 840M 4CU 2.9GHz | 50 TOPS | 15–54 W |
| Ryzen AI 5 PRO 440 | 3 + 3 | 2.0 | 4.8 / 3.5 | 16 MB | 840M 4CU 2.9GHz | 50 TOPS | 15–54 W |
| Ryzen AI 5 435 | 2 + 4 | 2.0 | 4.5 / 3.4 | 8 MB | 840M 4CU 2.8GHz | 50 TOPS | 15–54 W |
| Ryzen AI 5 430 | 1 + 3 | 2.0 | 4.5 / 3.4 | 8 MB | 840M 4CU 2.8GHz | 50 TOPS | 15–28 W |

- デスクトップ AM5 版 Ryzen AI 400(450G/440G/435G など。2026-03-02、OEM)も W「Template:AMD Ryzen AI 400 Series」にある [二次](構成は 450G 8C/16T・L3 16MB・860M、440G 6C/12T・16MB・840M、435G 6C/12T・8MB・840M)。ダイ対応は未確認。
- Notebookcheck に「Ryzen AI 7 345」(L3 8MB)のページがある: 検索要約(原ページ未確認)。

## 2. ダイ

| 項目 | 値 | 区分・出典 |
|---|---|---|
| プロセス | TSMC N4P FinFET | [二次] W300 共通項目。NBC350/NBC340「4 nm」[二次] |
| パッケージ | FP8(BGA) | [二次] W300 共通項目、NBC350/NBC340「FP8」 |
| トランジスタ数 | **未取得** | NBC350・NBC340 とも記載なし。TechPowerUp は「unknown」とされる: 検索要約(原ページ未確認、TPU は取得不可) |
| ダイ名「モノリシック」(プリセットの die 名) | プロジェクトの推論 | 出典で明示されたものではない。W300 が全 SKU を FP8 の単一 BGA パッケージ(APU)として記載していること、TH-CES が単一ダイ(CCX 数のみ未確定)を前提に書いていることからの推論 [推定] |
| ダイ面積(Krackan Point) | **未取得** | 信頼できる出典なし。下の候補値は採用しない |
| ダイ面積(Krackan Point 2) | **未取得** | HH330 はダイに言及なし |
| ダイ写真・フロアプラン注釈 | **未取得** | Tom's Hardware(TH-CES)は「the final layout will be confirmed once die-shots become available」と書いた [二次]。その後のダイ写真・注釈は検索で見つからず |
| ブロック配置・面積比(Zen 5 / Zen 5c / L3 / iGPU / NPU / メモリコントローラ) | **未取得** | 同上 |

ダイ面積の候補値(いずれも出典が弱く、未取得扱い):
- **195 mm²**: CW「Die size 195 mm²」(直接取得、出典の記載なし)[二次・信頼度低]。Technical City(Ryzen AI 7 PRO 350)と NanoReview(Radeon 820M)も 195 mm² とする: 検索要約(原ページ未確認。NanoReview は取得不可)。データベースサイト間の転記と思われ、元の測定は不明。
- **約 198 mm²**: AnandTech フォーラムの投稿者が Strix Point の面積から見積もった推測: 検索要約(原ページ未確認)。[推定] にも満たない。
- **178 mm²**: Notebookcheck の比較ページに出る値だが、比較相手の Phoenix/Hawk Point のダイ面積と思われる(Krackan の値ではない): 検索要約(原ページ未確認)。

## 3. ベンチマーク

### 3.1 Geekbench 7(優先)

| SKU | シングル | マルチ | 区分・出典 |
|---|---|---|---|
| Ryzen AI 7 350 | 2116 | 11354 | Geekbench Browser のプロセッサチャート: **検索要約(原ページ未確認)**。ページは 403 で取得不可。要約は「Geekbench 7 CPU scores are calibrated against a baseline score of 2,500 (Ryzen 7 7700)」の文言があったとする |
| Ryzen AI 7 350 | 2567 | 14103 | [二次] NBC350「Geekbench 7.0」欄(2026-11-01 訂正: NBC の測定ではなく Geekbench Browser の投稿の転載。nbc-gb7-mobile.md)。Framework Laptop 13 (FRANMGCP07)、RAM 31GB の 1 件のみ |
| Ryzen AI 5 340 | 2598 | 10657 | [二次] NBC340「Geekbench 7.0」欄(同上の訂正の可能性。転載か未確認)。Framework Laptop 13 (FRANMGCP05)、RAM 14GB の 1 件のみ |
| Ryzen AI 5 340 | 約 2246 | 約 9412 | CPU-monkey: **検索要約(原ページ未確認)**。要約自体が「レイアウトが崩れていてラベルの対応が不確か」としている |
| Ryzen AI 5 330 | 未取得 | 未取得 | NBC330R に GB7 なし |
| (比較)Ryzen AI 9 HX 370 | 2350 | 15014 | プロジェクトの gb7-scores.js(チャート、2026-10-25 収集) |
| (比較)Ryzen AI 9 HX 370 | 2784 | 17515 | [二次] NBC370「Geekbench 7.0」欄(2026-11-01 訂正: Geekbench Browser の転載。機体は Meigao F8BAC のミニ PC)。Micro Computer (HK) AI Series の 1 件のみ |

読み方の注意: Notebookcheck の GB7 は 1 件ずつで、HX 370 では Geekbench チャート値より ST +18%・MT +17% 高い。Kraken の Notebookcheck 値をそのままチャート値の代わりに使うと高めに出る。350 の比(NBC 同士で 350/HX370 = ST 0.92・MT 0.81、チャート同士(350 は検索要約)で ST 0.90・MT 0.76)はおおむね揃う。

### 3.2 Geekbench 6(参考)

| SKU | 版 | シングル(min / avg / median / max) | マルチ(min / avg / median / max) | 区分・出典 |
|---|---|---|---|---|
| Ryzen AI 7 350 | 6.7.1 | 1874 / 2748 / 2853 / 2942 | 10774 / 12771 / 12835 / 14194 | [実測] NBC350(機種レビューの集計) |
| Ryzen AI 7 350 | 6.3(初期のリーク) | 2677 | 11742 | Notebookcheck ニュース(Acer Swift の個別投稿): 検索要約(原ページ未確認) |
| Ryzen AI 5 340 | 6.7.1 | 2776 / 2782 / 2781.5 / 2787 | 10668 / 10765 / 10765 / 10862 | [実測] NBC340 |
| Ryzen AI 5 330 | 6.7 | 2576 | 7814 | [実測] NBC330R(Lenovo IdeaPad Slim 5 16、Adaptive モード PL1 30W / PL2 40W) |
| Ryzen AI 5 330 | 6.3(初期) | 1949 | 7047 | Notebookcheck ニュース: 検索要約(原ページ未確認) |
| (比較)HX 370 | 6.7.1 | 2780 / 2886 / 2880.5 / 2965 | 11973 / 14644 / 14996 / 16311 | [実測] NBC370 |

### 3.3 Cinebench ほか

| SKU | ベンチ | シングル | マルチ | 区分・出典 |
|---|---|---|---|---|
| Ryzen AI 7 350 | Cinebench R23 | 1916 / 1961 / 1958 / 2006(min/avg/med/max、18 件) | 12647 / 15870 / 16014.5 / 18243 | [実測] NBC350 |
| Ryzen AI 7 350 | Cinebench 2024 | 113.5 / 115.8 / 115.7 / 119(15 件) | 720 / 884 / 901 / 1011 | [実測] NBC350 |
| Ryzen AI 5 340 | Cinebench R23 | 1912 / 1916 / 1915.5 / 1919 | 12044 / 12532 / 12532 / 13020 | [実測] NBC340 |
| Ryzen AI 5 340 | Cinebench 2024 | 112 / 112.5 / 112.5 / 113 | 652 / 668 / 668 / 684 | [実測] NBC340 |
| Ryzen AI 5 330 | Cinebench R23 | 1812 | 7840 | [実測] NBC330R |
| Ryzen AI 7 350 | Geekbench 5.1–5.5 | 805 / 1896 / 2075 / 2155 | 6705 / 11093 / 11251.5 / 12968 | [実測] NBC350 |
| Ryzen AI 5 340 | Geekbench 5.1–5.5 | 1985 / 2009 / 2009 / 2033 | 8735 / 8884 / 8884 / 9033 | [実測] NBC340 |

Notebookcheck の集計は機種・電力設定(NBC350 の掲載機は 40〜125W 程度まで幅がある、検索要約)が混ざっている。

## 4. Strix Point(Ryzen AI 9 HX 370)との差

| 項目 | Strix Point(HX 370) | Kraken Point(AI 7 350 / AI 5 340) | 区分・出典 |
|---|---|---|---|
| コア uarch | Zen 5 + Zen 5c | Zen 5 + Zen 5c(同じ) | [二次] W300、WZ5「Codenamed Strix Point (...) & Krackan Point (for the mid-range Ryzen AI 5 and 7 300 series)」 |
| FPU | 256bit 幅で AVX-512 | 同じ(W300 は Ryzen AI 300 共通の記述) | [二次] W300 |
| コア構成 | 4 + 8 | 4 + 4(350)/ 3 + 3(340)/ 1 + 3(330) | [二次] W300 |
| L3 合計 | 24 MB | 16 MB(350・340)/ 8 MB(330) | [二次] W300 |
| L3 の構成 | Zen 5 の 4 コアで 16 MB + Zen 5c の 8 コアで 8 MB の 2 CCX。互いの L3 にはアクセスできない | **未取得**(下記) | Strix は [二次] WZ5(出典 Chips and Cheese 2024-08-10・TechPowerUp 2024-07-24) |
| Zen 5c の最大ブースト | 3.3 GHz | 3.5 GHz(350)/ 3.4 GHz(340・330) | [二次] W300 |
| Zen 5 の最大ブースト | 5.1 GHz | 5.0 GHz(350)/ 4.8 GHz(340)/ 4.5 GHz(330) | [二次] W300 |
| ベース | 2.0 GHz | 2.0 GHz | [二次] W300 |
| iGPU | 890M 16 CU 2.9 GHz | 860M 8 CU 3.0 GHz / 840M 4 CU 2.9 GHz / 820M 2 CU 2.8 GHz | [二次] W300 |
| NPU | XDNA 2、50 TOPS | XDNA 2、50 TOPS | [二次] W300 |
| TDP | 28 W(15–54 W) | 28 W(15–54 W)、330 は 28 W(15–28 W) | [二次] W300 |
| パッケージ | FP8 | FP8 | [二次] W300 |
| ダイ面積 | プロジェクト 225.6 mm² [実測]。WZ5 は 232.5 mm²(TechPowerUp 2024-07-16)[二次] | 未取得 | — |

Kraken Point の L3 構成について分かっていること:
- Notebookcheck(NBC350 の説明文、および英語版ファミリー説明)「The Krackan Point family APUs are powered by Zen 5 and Zen 5c microarchitecture cores located in separate clusters」、350 は「4x Zen 5c with less cache」[二次]。→ Strix と同じく Zen 5 と Zen 5c が別クラスタで、Zen 5c 側の L3 が小さいことを示唆するが、各クラスタの容量は書いていない。「separate clusters」と 350 の「4x Zen 5c with less cache」は検索要約経由(原ページ未確認)。直接確認できたのは NBC340 の「3x Zen 5c with less cache」まで。
- TH-CES(発表時)「Given Krackan's smaller core count, a dual-CCX design might not be necessary. However, the final layout will be confirmed once die-shots become available.」[二次]。→ 発表時点では未確定。
- overclockers.ru のブログが「Geekbench の表示ではコアが 2 クラスタに分かれている」と書く: 検索要約(原ページ未確認)。
- Krackan Point 2(330): TechPowerUp フォーラムが「4 コアが 1 クラスタで L3 8MB を共有」と書く: 検索要約(原ページ未確認、TPU は取得不可)。HH330 は「4MB of L2 and 8MB of L3」とだけ書く [二次]。
- 結論: **Kraken Point の L3 分割(例: 8MB + 8MB か、Strix 風の Zen 5 側 16MB だけか等)は未取得**。Geekbench の個別結果ページ(キャッシュのトポロジー表示)は取得不可。

## 5. プロジェクトのプリセット書式との突き合わせ

`data/presets/chips-pc.js` の `amd-strix-hx370` の項目構成:
`id, name, vendor, family, isa, kind, year, gb7, dies[ die(name, mm2, s, nodeId, note) ], power{ base: pw(w, s, note), peak, range{minW, maxW} }, cfg{ cores[ {type, uarch, count, smt, baseGHz, boostGHz} ], l3MB, (l3Note/l3Ccds 等), memory }, calib, (addedIn, notes)`

Ryzen AI 7 350 を同じ書式で書くと、埋まるのは次の通り(参考。ファイルは編集していない):
- `id`(例 `amd-kraken-350`)、`name: 'Ryzen AI 7 350'`、`vendor: 'AMD'`、`family: 'Kraken Point'`、`isa: 'x86'`、`kind: 'mobile-pc'`、`year: 2025` … W300 [二次] から可。
- `power.base: pw(28, 'sec', 'cTDP 15〜54W')`、`power.range: { minW: 15, maxW: 54 }` … W300 [二次]。
- `cfg.cores`: `{ type:'P', uarch:'Zen 5', count:4, smt:2, baseGHz:2.0, boostGHz:5.0 }`、`{ type:'C', uarch:'Zen 5c', count:4, smt:2, baseGHz:null, boostGHz:3.5 }` … W300 [二次](Zen 5c の baseGHz は HX 370 と同じく null)。
- `cfg.l3MB: 16`、`cfg.memory: 'DDR5-5600 / LPDDR5X-8000'` … W300 [二次]。

**足りない値(未取得)**:
1. `dies[0].mm2`(Krackan Point のダイ面積)と区分。[実測]・[公表] なし。候補 195 mm² は出典不明のデータベース値で採用不可。Krackan Point 2(330)も同じく未取得。
2. ダイのトランジスタ数(プリセットの項目ではないが面積校正の参考): 未取得。
3. `gb7` の文字列: `data/benchmarks/gb7-scores.js` に Kraken Point の行が無く、validate-data.js の照合のため、先に gb7-scores に行を足す必要がある。チャート値(350 の 2116 / 11354)は検索要約のみ(Geekbench Browser は取得不可)。§2.4 の「直近25件の中央値」手法も Cloudflare で今回は不可。使えるのは Notebookcheck の 1 件の [実測](350: 2567 / 14103、340: 2598 / 10657)だけで、件数が少なく校正には向かない。
4. `cfg.l3Note` / `l3Ccds` に当たる L3 の分割: 未取得(Zen 5 側と Zen 5c 側の容量)。
5. Zen 5c の `baseGHz`: 未取得(W300 は共通のベース 2.0 GHz のみ。HX 370 のプリセットも null)。
6. `power.peak`([実測] のピーク電力): 未取得(今回は調べていない。NBC330R には電力モードごとの PL1/PL2 の記載あり: Adaptive 30/40W、Performance 36/51W、Battery Saver 25/40W)。
7. 340・330 を別プリセットにする場合: 340 は 350 と同じダイ(無効化)という明示的な出典が未取得。330 は Krackan Point 2(別ダイ)という [二次] 情報があるため、350 の面積は流用できない。

## 6. 食い違い・未確認事項

1. **350 の L3 容量**: W300・NBC350・TechSpot 等は 16 MB。TechPowerUp(検索要約、取得不可)・CW(直接)・chipversus(検索要約)は **8 MB**。CW は TechPowerUp の転記の可能性がある。L3 分割(Zen 5 側 8MB + Zen 5c 側 8MB 等)を 1 クラスタ分だけ書いた値かもしれないが、確認できない。
2. **330 の L3 容量**: W300・HH330 は 8 MB。chipversus・fpsbench は 4 MB(検索要約、原ページ未確認)。
3. **330 の iGPU CU 数**: W300 は 820M **2 CU**。Guru3D の記事タイトルは「Radeon 4 CU GPU」(検索要約、原ページ取得不可)。物理 CU と有効 CU の違いの可能性があるが未確認。
4. **ダイ面積**: 195 mm²(出典不明のデータベース群)以外に根拠のある値がない。
5. **Strix Point のダイ面積**(既存プリセット): プロジェクトは 225.6 mm² [実測](12.06 × 18.71 mm。TechPowerUp の注釈記事の寸法と一致、検索要約)、WZ5 は TechPowerUp 2024-07-16 を出典に 232.5 mm²。Kraken 調査の範囲外だが食い違いとして記録。
6. **Geekbench 7 の値の性質**: Geekbench チャート(検索要約)と Notebookcheck の 1 件値で ST が約 20% 違う(350: 2116 と 2567)。HX 370 でも同じ傾向(2350 と 2784)なので、Notebookcheck の個別値はチャートより高めと見るべき。340 の Notebookcheck 値(ST 2598)が 350(2567)より高いのも 1 件ずつのばらつき。
7. **340 の発売日**: W300 は 350 と同じ欄にまとめていて個別の日付が不明。
8. **Zen 5c のベースクロック**(350・340): 未取得。
9. **L3 の CCX 構成**: Notebookcheck は「別クラスタ」と書くが根拠を示していない。Tom's Hardware は発表時点で未確定とした。ダイ写真が見つからないため未確認。
10. **Ryzen AI 400 のうち Krackan 系ダイを使う SKU**: W400 はダイ名を区別しておらず未確認。
