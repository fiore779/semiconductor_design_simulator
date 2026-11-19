# AMD の Ryzen より前のプリセットを追加(2026-11-19)

ユーザー指示「AMD の ryzen 以前のものもプリセットを作ってください。FX だったりアスロンだったりです」。世代ごとに 1 SKU(同じダイの別 SKU は FX-6300 だけ)で 13 件。153 → 166 件。

## 1. 追加した SKU

| 世代 | SKU | プロセス | ダイ | L3 | GB7(Windows 中央値。定格±6%) |
|---|---|---|---|---|---|
| K7 Thunderbird | Athlon 1400(2001) | 180nm | 120mm² | なし(L2 256KB) | なし(32bit) |
| K7 Barton | Athlon XP 3200+(2003) | 130nm | 101mm² | なし(L2 512KB) | なし(32bit) |
| K8 Venice | Athlon 64 3200+(2005) | 90nm | 84mm² | なし | なし(標本 2 件・OC) |
| K8 Brisbane | Athlon 64 X2 5000+(2006) | 65nm | 118mm² | なし | なし(標本 2 件・OC) |
| K10 Agena | Phenom X4 9950 BE(2008) | 65nm | 285mm² | 2MB | 318 / 955(n=3) |
| K10 Deneb | Phenom II X4 955 BE(2009) | 45nm | 258mm² | 6MB | 396 / 1172(n=10) |
| K10 Thuban | Phenom II X6 1090T BE(2010) | 45nm | 346mm² | 6MB | 438 / 1665(n=3) |
| K10 Propus | Athlon II X4 640(2010) | 45nm | 169mm² | なし | なし(ST が不自然) |
| Bobcat Zacate | E-350(2011) | TSMC 40nm | 75mm² | なし | なし(MT < ST) |
| Bulldozer Zambezi | FX-8150(2011) | 32nm SOI | 315mm² | 8MB | 596 / 2574(全 OS n=2) |
| Piledriver Trinity | A10-5800K(2012) | 32nm SOI | 246mm² | なし | 517 / 1359(n=3) |
| Piledriver Vishera | FX-8350(2012) | 32nm SOI | 315mm² | 8MB | 577 / 2617(n=32) |
| Piledriver Vishera | FX-6300(2012) | 32nm SOI | 315mm²(流用) | 8MB | 549 / 1848(n=23) |

## 2. 出典

- **構成・クロック・TDP・発売日**: Wikipedia の AMD の各一覧(Athlon / Athlon XP / Athlon 64 / Athlon 64 X2 / Phenom / Phenom II / Athlon II / FX / APU)。A10-5800K は Wikipedia の APU 一覧(3.8/4.2GHz・100W)、Athlon II X4 640 は Athlon II 一覧(3.0GHz・95W・2010-05-11)、Athlon XP 3200+ は SimHQ・TechPowerUp も 76.8W/77W。E-350 は AnandTech の Brazos の記事(1.6GHz・18W)・Tom's Hardware(TSMC 40nm)・sysrqmts(L1 64KB・L2 512KB/コア。1 件の出典)。すべて [二次]。
- **ダイ面積**: Thunderbird 120mm²(AnandTech・Tom's Hardware。別の表は 117)、Barton 101mm²(Tom's Hardware の表。発売時の記事は 115)、Venice 84mm²(HotHardware・AMD。TechPowerUp は 83)、Brisbane 118mm²(Wikipedia。同ページの別の表は 126)、Agena 285mm²(Tom's Hardware)、Deneb 258mm²(Wikipedia。Tom's Hardware は 243)、Thuban 346mm²(Wikipedia)、Propus 169mm²(TechPowerUp の DB・sysrqmts)、Zambezi・Vishera 315mm²(AnandTech・TechPowerUp。Tom's 316、Wikipedia 319)、Trinity 246mm²(AnandTech・TechPowerUp・Wikipedia)、Zacate 75mm²(PC Watch のスライド)。すべて [二次]。
- **uarch**: Agner Fog の microarchitecture.pdf 第 20 章(K7・K8・K10)・第 21 章(Bulldozer 系)・第 26 章(Bobcat)。ROB は K8 が 72(Hardware Secrets の「Inside AMD64 Architecture」)、K7 が 72(Microprocessor Report 1998)、Bulldozer が 128(Chips and Cheese)、Bobcat が 56(Agner Fog)。**K10 の ROB 72 と Piledriver の ROB 128 は個別の出典がなく [推定]**。L2・L3 の遅延は Bulldozer 系だけ(Agner Fog の表: L2 21・20、L3 87)。K7・K8・K10・Bobcat の L2/L3 遅延は未取得。

## 3. Geekbench 7 の取り方と採らなかった標本

browser.geekbench.com/v7/cpu/search?q=SKU名 を検索し(取得 2026-11-19)、Windows の投稿の中央値を出した。**標本の「クロック」表示が定格と違う(オーバークロックや動作クロック)投稿が多いので、定格クロックの±6% の投稿に絞った**(FX-8350 は全 100 件の Windows 中央値 ST 580.5 に対し、絞ると 576.5。Phenom II X4 955 は 10 件すべてが範囲内)。

- **K7**: 32bit のみで Geekbench が動かず、公開値なし。
- **K8**: Athlon 64 X2 5000+・5200+・5400+・Athlon 64 3200+・3500+ はいずれも標本が 1〜3 件で、ほとんどが 2.6〜4.2GHz のオーバークロック(例: 5200+ は 3307・3900MHz)。しかも同じ「3200+」「5200+」に複数のダイ(Clawhammer・Newcastle・Winchester・Venice、Windsor・Brisbane)があり、投稿の名前から絞れない。採らなかった。
- **Athlon II X4 640(Propus)**: 絞った標本 3 件(OS 表示なし。Linux とみられる)の ST 416 が、L3 つきで 3.2GHz の Phenom II X4 955(396)を上回り不自然。採らず、uCal の標本からも外した。
- **E-350(Bobcat)**: 標本 3 件の MT(93)がシングル(126)より低く、信頼できない。採らなかった。
- **FX-8150**: 絞った標本が全 OS で 2 件(Windows は 1 件が範囲外)。採ったが標本が非常に少ない。
- **Llano(A6-3650)・Kaveri(A10-7850K)・Bristol Ridge(A12-9800)・Jaguar(Athlon 5350)**: 標本が 1〜5 件と少ない、または ROB を確認できないので、プリセットにしなかった。

## 4. モデルの扱いと限界

- 補正 u: K10 79.3(n=3)・Bulldozer 85.6(n=1)・Piledriver 81.8(n=3)。学習内で検証ではない。K7・K8・Bobcat は補正 u がなく ISA 平均で計算する(参考にならない)。
- **FX の数え方**: 整数コア 1 つを 1 コアと数える(販売名どおり)と MT が +18〜30% 高く出る。1 モジュールを 1 コア・2 スレッドと数えると −12〜−20% 低く出る。どちらも合わず、Bulldozer の共有部分(デコード・浮動小数点・L2)を表せないこのモデルの限界。特別な係数は入れていない。
- Trinity(L3 なし)は ST の u が 96.7 と高い(DRAM 遅延の見積もりが大きすぎる可能性。原因は未調査)。
- **ダイ写真の枠**(2026-11-19 の追加分): CPU Graveyard(happytrees.org/dieshots)の写真で 9 枠を作った(Barton・Venice・Agena・Deneb・Thuban・Zambezi・Vishera・Trinity・Zacate)。Fritzchens Fritz の Venice・Agena はパブリックドメイン、Barton は Martijn Boer のパブリックドメイン、Deneb は AMD 著作と表記、ほかはライセンス不明の表記。**写真が CPU Graveyard に無い Athlon(Thunderbird)・Athlon 64 X2(Brisbane)・Athlon II X4(Propus)は模式の配置のまま**(Windsor・Toledo の写真はあるが別のダイ)。Zambezi・Vishera・Trinity は整数コア 2 つの境界を写真から判別できず、ロジックの塊を 2 等分した推定。Zacate のコアの位置は目測の推定で確度が低い。FX-6300 は FX-8350 の枠(空き枠 2 つ)、E-350 は E-450 の写真を使う。caplayouts(コンデンサ)は写真未確認の unknown のまま。
- 蓋なし: K7(Socket A のダイむき出し)と Bobcat(BGA)。
