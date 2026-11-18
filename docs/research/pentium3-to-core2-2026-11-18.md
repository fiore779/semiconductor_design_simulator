# Pentium III 〜 Core 2(65nm)を世代ごとに追加(2026-11-18)

ユーザー指示「ペン3まで作ってください。その中でも世代はあったはずなので世代ごとに作ってください。また、ダイショットも取得してある程度現実に近づけてください。あとはデスクトップ用以外はヒートスプレッダをつけないようにしてください」「geekbench6とかからも収集してください。そもそも32bitのものとかもあるのでスコアすらなくてもしょうがないです」。`data/presets/chips-old.js` に 14 SKU を追加した(139 → 153 件)。誤差の追い込みはしていない(ユーザー発言「古い奴は誤差を出す必要はないです」)。

## 1. 追加した SKU(世代ごとに 1 つ)

| 世代・コア | SKU | プロセス | ダイ | 蓋 | GB の値 |
|---|---|---|---|---|---|
| Pentium III Katmai | 600B | 250nm | 128mm² | なし(カートリッジ) | なし(32bit) |
| Pentium III Coppermine | 1000 | 180nm | 106mm² | **なし**(FC-PGA はダイむき出し) | なし |
| Pentium III Tualatin | 1400S | 130nm | 80mm² | あり(FC-PGA2) | なし |
| Pentium 4 Willamette | 1.5GHz | 180nm | 217mm² | あり | なし(32bit) |
| Pentium M Banias | 1.6GHz | 130nm | 83mm² | なし(モバイル) | なし |
| Pentium 4 Northwood | 3.0C(HT) | 130nm | 131mm² | あり | なし(32bit) |
| Pentium M Dothan | 755 | 90nm | 87mm² | なし(モバイル) | なし |
| Pentium D Smithfield | 820 | 90nm | 206mm² | あり | **[推定] 189 / 313**(GB6 換算) |
| Pentium 4 Prescott | 531(HT・64bit) | 90nm | 112mm² | あり | **[推定] 207 / 236** |
| Pentium 4 Cedar Mill | 631(HT・64bit) | 65nm | 81mm² | あり | **[推定] 198 / 226** |
| Pentium D Presler | 945 | 65nm | 2×81mm²(MCM) | あり | **[推定] 217 / 382** |
| Core Duo Yonah | T2500 | 65nm | 90.3mm² | なし(モバイル) | なし(32bit) |
| Core 2 Duo Conroe | E6600 | 65nm | 143mm² | あり | なし(標本 1 件) |
| Core 2 Quad Kentsfield | Q6600 | 65nm | 2×143mm²(MCM) | あり | [実測] 297 / 760(**n=4**) |

スペック(クロック・FSB・L2・TDP・発売)は Wikipedia の各 Intel プロセッサ一覧と、Intel の ARK(検索で得た一覧。古い SKU のページ本体は取得できない)。すべて [二次]。ダイ面積は Wikipedia・AnandTech・Hardware Museum・Tom's Hardware([二次])。Pentium III の Katmai の L2(外付け)は面積に含まない。

## 2. Geekbench 6 の値の GB7 への換算([推定])

- Pentium III・Pentium 4 の Willamette/Northwood・Pentium M・Core Duo は 32bit のみで、Geekbench 5・6・7 のどれも動かず、公開値はない(Geekbench 5 の「Pentium II/III」104 件は別の最新 CPU の誤認識で使えない)。
- 64bit 対応の NetBurst(Prescott 531・Cedar Mill 631・Pentium D 820・945)は Geekbench 6 に標本がある。Geekbench 6 の名前は型番がまとまる(「Pentium D 820/915/920」「Pentium 4 531/630」)ので、各結果ページの CPUID(Model・L2 容量・コア数・クロック)で Smithfield / Presler / Prescott / Cedar Mill を分けた。標本は Pentium 4 531 が Linux 5 件、Pentium D 820 が Linux 8 件(Windows はない)、Pentium 4 631 が Windows 7 件、Pentium D 945 が Windows 17 件。
- **換算比**: Core 2 の E8400・Q9550・Q9650 で、Geekbench 7 の Windows のみの中央値 ÷ Geekbench 6 の Windows のみの中央値(E8400 395/669、Q9550 384/1122、Q9650 398/1107)。ST は 1.124・1.107・1.143(中央値 1.124)、MT は 1.111・1.119・1.205(中央値 1.119)。この比を NetBurst に当てるのは仮定で、アーキテクチャの違いによる偏りは見ていない。区分は [推定](実測ではない)。各行に換算前の値と n を残した。
- SKU 別の補正 u の揃い方: Prescott 51.0・Smithfield 48.8(uCal 49.9)、Cedar Mill 44.13・Presler 44.12(uCal 44.1)。同じコアの異なる SKU でよく揃う。ただしこの ST は学習内で、検証ではない。
- Conroe の uCal 70.3 は Q6600 の 1 SKU(標本 4 件)だけから決めた。Penryn の 85.7 より低い。

## 3. uarch(`data/uarch.js`)

11 個を追加: Katmai・Coppermine・Tualatin(P6)、Willamette・Northwood・Prescott・Cedar Mill(NetBurst)、Banias・Dothan・Yonah(Pentium M 系)、Conroe(Core)。出典は Agner Fog の microarchitecture.pdf(P6: 幅 3・ROB 40・分岐ミス 10〜20 の幅、NetBurst: 幅 3・ROB 126・分岐ミス 24 以上・L1D 8/16KB、PM 系: 分岐ミス約 13、Core 2: ROB 96・分岐ミス 15)と Chips and Cheese(Penryn の L1D 3・L2 約 15)、L2 容量は Wikipedia の一覧。出典が取れない項目(P6 の L1D・L2 遅延、PM の ROB・L1D、NetBurst の L1D 遅延・L2 遅延、分岐ミスの幅)は未設定にした(推測しない)。Willamette・Northwood は NetBurst の同じ系統として Prescott の u を借りる(uFrom)。共有 L2(Yonah・Conroe・Kentsfield)は 1 コアあたりの容量に直した近似。

**P6・Pentium M 系(Katmai・Coppermine・Tualatin・Banias・Dothan・Yonah)は公開値も補正 u もなく、ISA 平均の補正で計算するため、ST・MT の予測は実際より大きく出る(参考にならない。確度:低)**。たとえば Pentium M 1.6GHz が約 415 と出る。

## 4. 蓋(ヒートスプレッダ)

プリセットに `noLid: true` を付けると `package.lid` が false になり、3D 表示で蓋を描かない(表示設定にかかわらず。`js/render/pkggeom.js`)。モバイル向け(kind が pc 以外)は蓋なし。ユーザー指示は「デスクトップ用以外は蓋なし」だが、実物でダイがむき出しのデスクトップ向けも蓋なしにした(Katmai のカートリッジ、Coppermine の FC-PGA。Tom's Hardware の比較表・Wikipedia の記載。866MHz 以上の Coppermine と Tualatin の FC-PGA2 には蓋がある)。**既存のモバイル向け 4 件(i7-2720QM・4700HQ・6700HQ・7700HQ)も蓋なしになった**。デスクトップ向けの Pentium 4(Willamette 以降)は蓋あり(「蓋付き」と記す資料。個別の確認は未取得)。

## 5. ダイ写真の枠(CPU Graveyard = happytrees.org/dieshots)

13 の新しい枠(`cmn-1c`・`tlt-1c`・`wlm-1c`・`nwd-1c`・`prs-1c`・`cdm-1c`・`prl-2c`・`smf-2c`・`bns-1c`・`dth-1c`・`yna-2c`・`cnr-2c`・`kts-4c`)。写真はブラウザで表示して目測し、保存していない。ライセンスは多くが「unknown license」(Dothan は Intel の報道用写真で著作権 Intel)。コア・L2・バス・I/O の判別は見た目による推定で、判別できない領域は「内訳は未判別」の飾り。L3 はないので L2 は飾り(deco)で置く。

- **Cedar Mill・Presler**: CPU Graveyard に写真がなく、Prescott 2MB の写真(65nm の縮小で配置が同じとみなす)を代用した。Presler は同じ枠を 2 つ並べた。scaleBasis は reuse([推定])。
- **Katmai**: 写真がなく、枠なし(模式図)。
- **Dothan**: 左端が切れた拡大写真で、ダイの外形は完全ではない。
- Smithfield は 1 つのダイに 2 コア、Kentsfield は Conroe 2 つの MCM。アプリ上の描画は確認していない(テストで枠・重なり・縦横比・コア数まで)。

## 6. 限界

- P6・Pentium M 系の ST・MT は参考にならない(上記)。NetBurst の値は Geekbench 6 の換算の [推定]。Pentium D 820・Pentium 4 531 は Windows の標本がなく Linux の標本(n=8・5)。
- TDP・構成は Intel ARK の本体を取得できず [二次](Pentium D 945 は ARK と Wikipedia が食い違い、ARK を採った)。
- Pentium 4 Northwood の 131mm² は Wikipedia の 1 つの出典だけ。Dothan の面積は出典で 83.6〜87mm² と食い違う。
- 取り上げた SKU は世代ごとに 1 つ。Mobile Merom・Celeron・Pentium II 以前・Xeon は対象外。
