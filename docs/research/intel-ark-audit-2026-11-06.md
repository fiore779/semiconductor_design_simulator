# Intel ARK との全 SKU 照合(2026-11-06)

ユーザー指示(2026-11-06)「インテルのデータが正式な値なので P ブーストを、ARK の P コア最大ターボに揃える用にしてください」。Intel ARK の原ページを Chrome で確認([公表]、2026-11-06)し、プリセットの Intel 24 SKU と照合した。

## 1. 照合の結果

コア数・スレッド・クロック・L3・電力・メモリ・プロセスは 24 SKU すべて一致。**食い違いは 13900K・13700K の P boost のみ**。

| SKU | ARK ID | P base | Performance-core Max Turbo | Turbo Boost Max 3.0 | Max Turbo | 旧 P boost | 新 P boost |
|---|---|---|---|---|---|---|---|
| Core i9-13900K | 230496 | 3.0 | **5.4** | 5.7 | 5.8(Thermal Velocity Boost) | 5.8 | **5.4** |
| Core i7-13700K | 230500 | 3.4 | **5.3** | (5.4 = Max Turbo) | 5.4(Turbo Boost Max 3.0) | 5.4 | **5.3** |

旧値はどちらも ARK の Max Turbo の値(13900K は Thermal Velocity Boost、13700K は Turbo Boost Max 3.0)で、P-core Max ではなかった。URL:
- https://www.intel.com/content/www/us/en/products/sku/230496/intel-core-i913900k-processor-36m-cache-up-to-5-80-ghz/specifications.html
- https://www.intel.com/content/www/us/en/products/sku/230500/intel-core-i713700k-processor-30m-cache-up-to-5-40-ghz/specifications.html

ほかの 22 SKU は P boost がすでに P-core Max に一致(12900K 5.1、12700K 4.9、14900K 5.6、14700K 5.5、285K 5.5、265K 5.4)か、P-core Max = Max Turbo で区別がない(12600K・13600K・14600K・12100・14700HX・185H・275HX・Lunar Lake 268V/258V/256V・Panther Lake 388H/386H/378H/358H・325・320)。

規則「P boost は ARK の Performance-core Max Turbo を使う」の適用範囲は、**2026-11-06 時点で ARK と照合した全 Intel SKU(24 件)に適用済み**(2026-11-05 は 265K・285K のみ)。

ARK ID/スラッグ: 12900K 134599/intel-core-i912900k-processor-30m-cache-up-to-5-20-ghz、12700K 134594、12600K 134589、12100 134584、13900K 230496、13700K 230500、13600K 230493、14900K 236773、14700K 236783、14600K 236799、14700HX 235997、185H 236849、268V 240958、258V 240957、256V 240954、275HX 242293、285K 241060、265K 241063、388H 245526、386H 245529、378H 246128、358H 245527、325 245720、320 246018。

## 2. 反映した変更と評価への影響

詳細(前後の表・校正の確認・固定値の更新)は `docs/設計書.md` §5.3.0 の「【2026-11-06】13900K・13700K の P boost を ARK の…」の項。要点:

- `data/presets/chips-pc.js`: 13900K の P boost 5.8 → 5.4、13700K の P boost 5.4 → 5.3(notes に出典・旧値・ユーザー指示)。
- `data/uarch.js`: Golden Cove・Raptor Cove の `uCal` を 112.7 → 114.1(標本 10 件に 13900K・13700K が入っているため。中央値 114.136)。
- 評価が変わるのは 11 件(13900K・13700K と、uCal を使う Golden/Raptor 9 件)。**判定(ok/ng)の反転は 0 件**。12100 の MT が +9.996%(許容 ±10% の縁)。
- 校正定数: x86 ISA 平均 u・Lion Cove の u・σ・γ・MT の帯係数 0.69/0.76 は不変。`ctx.cal` で動くのは Golden/Raptor の u(`u` と `uFixed`)だけ。
- 帯 0 の「一致する k」の中央値は 0.6856 → 0.6828(丸め 0.68)に動いた(14700HX が標本のため)。係数 0.69 は変えていない。

## 3. 提案 (a)〜(h): 2026-11-06 反映済み(ユーザー指示「全体のデータを公式のデータにしてください」)

(旧見出し「未反映の提案(ユーザー未承認のため今回はやらない)」。反映の詳細と評価の前後差は `docs/設計書.md` §5.3.3 K-9。) 反映の結果:
- (a)(c)(d)(e)(f)(g)(h) は表のとおり反映。(d) の 12900K の最大メモリ 128GB はこの表にない追加(ほかの第 12 世代と同じ値。ARK 原ページは再取得していない)。
- (b) 14700HX の range は {45,55} → {45,157}、185H は {35,65} → {35,115} に反映。**14700HX の MT 帯が 0 → 1 になり、MT 15235.2 → 16538.4(誤差 +5.65% → +14.69%、判定 ok → ng)。帯係数 0.69/0.76 は変更せず、帯 0 の再校正はユーザー判断待ち。**
- 注: 反映の際、実装担当は ARK の原ページを再取得していない(この文書の記録に基づく)。

(以下は反映前の提案の表。記録として残す。)

| 記号 | 内容 | 備考 |
|---|---|---|
| (a) | power の区分 sec → pub(値は同じ) | 対象: 12900K・13700K・14700K・12700K・12600K・13600K・14600K・12100・285K・265K・185H・14700HX・388H・386H・378H・358H の base / peak。388H〜358H の peak 注記「65W または 80W」→「80W(ARK)」 |
| (b) | 14700HX の range 上限 55(PBP)→ 157(MTP)の検討。注記「cTDP 45W」→「Minimum Assured Power 45W」 | range.maxW は MT の帯係数(mtPublishedW)の帯の判定に使われる。157W にすると帯 0(60W 以下)→ 帯 1 に移る。**MT の帯係数の標本と判定が変わる**ので、採用するなら帯係数の再検討が必要 |
| (c) | 185H の range 上限 65 は ARK に該当項目なし | 注記の見直しのみ |
| (d) | メモリの最大容量・チャネルの追記 | 185H 96GB・2 チャネル、13900K/14900K 192GB、285K/265K 256GB、268V 32GB、388H 96GB など。表記は「2ch」ではなく「2 チャネル」(電力モデルの `memChannels` が「数字+ch」を読むため) |
| (e) | L3 の l3Note [二次] → [公表] | 258V・256V・275HX |
| (f) | 388H の notes の URL をスラッグ付きに | |
| (g) | L2 合計の追記 | 12900K 14MB、12700K 12MB、12600K 9.5MB、12100 5MB、13900K/14900K 32MB、13700K 24MB、14700K 28MB、13600K/14600K 20MB、285K/275HX 40MB |
| (h) | 12900K の peak 258.6W([実測] Phoronix)は ARK の MTP 241W と別定義 | 注記に追記 |
