# Base タイルの熱除外(45d9ecb)の調査: 差分の原因・isPassiveDie の漏れ・Lunar Lake のメモリ(2026-11-12)

調査のみ。コード・データは変更していない。再現は node スクリプト(プリセット全 106 件を `evaluate` で評価し、45d9ecb の前後の thermal.js を差し替えて比較)。

## 結論(先に)

1. **「Base を持たない 4 件で理由文が変わった」は再現しない。** 5800X・Kraken Point(amd-kraken-350)・325・320 は、45d9ecb の前後で評価結果(理由文を含む)が完全に同じ(どれも `ダイ面積が全て未取得`)。45d9ecb の前後で全 106 件を比べると、差が出るのは 5 件だけ: 185H(注記が 1 行消える)、268V/258V/256V(Tj +1.4℃)、285H(温度が出なくなり、理由文が新文言)。担当の報告の 4 件は、差の検出方法(おそらく別の比較)が誤っていた可能性が高い。
2. **ユーザー指摘(1)** 4 件のうち Base 的なダイをデータに持つものは 0 件。5800X は dies が空、Kraken Point はモノリシックで面積 null、325 は Compute タイル 1 つだけ(null)、320 は Compute+IO の 2 つ(どちらも null)。320 は ARK 周りの調査(`intel-ptl-325-wcl-320.md`)で「UCIe・有機パッケージ(Foveros ではない)」とあり、Base は元々無い。5800X(CCD+IOD、有機基板)・Zen 系は Base もインターポーザも無く、IOD は発熱するダイ。
3. **ユーザー指摘(2)** Lunar Lake の Tj +1.4℃ の原因はメモリではない。45d9ecb で電力は変わっておらず(36.99986 → 36.99999 W)、変わったのは R_total だけ(1.8720 → 1.9097 K/W)。ΔTj = 37 W × 0.0377 K/W = 1.4℃ で完全に説明できる。メモリ(オンパッケージ LPDDR5X)の熱は、そもそも熱モデルに入っていない(下の §4)。ただし「メモリの扱いが粗い」という点は正しく、別の問題として残る。
4. **データ上の誤り(新発見)**: Lunar Lake の Base タイルのプロセスが `tsmc-n6` になっているが、Intel の資料(Tom's Hardware の Hot Chips/Tech Tour 記事)も Wikipedia も **Intel 22FFL** としている。面積 219.7 mm² の区分も `meas`(実測)と付けているが、出典の注記が無い(§3)。

## 1. 4 件の dies と、理由文が変わらなかった理由

| id | dies(名前 / 面積 / nodeId) | isPassiveDie 該当 | 45d9ecb 前後の評価 |
|---|---|---|---|
| amd-zen3-5800x | **空配列**(`dies: []`) | なし | 不変(`ダイ面積が全て未取得`) |
| amd-kraken-350 | `Kraken Point (モノリシック)` / null / tsmc-n4 | なし | 不変(同上) |
| intel-ptl-u5-325 | `Compute タイル` / null / intel-18a | なし | 不変(同上) |
| intel-wcl-c5-320 | `Compute タイル` / null / intel-18a、`I/O タイル(IO die)` / null / tsmc-n6 | なし | 不変(同上) |

thermal.js の分岐(`js/sim/thermal.js` solveThrottle、行 64〜68): `hasBase = (preset.dies||[]).some(isPassiveDie)` が false なら従来どおり `ダイ面積が全て未取得` を返す。新文言(`発熱するタイルの面積が全て未取得(Base タイルは…)`)が出るのは、Base 系のダイがあり、かつ残りの面積が全て null の場合だけ。4 件は Base を持たないので旧文言のまま。実測した 45d9ecb 前後の差は 5 件(下)。

| id | 前 | 後 |
|---|---|---|
| intel-mtl-185h | Tj 99.999℃。注記に「面積が未取得のダイが 1 個」 | Tj 同じ。その注記が消える(未取得だったのが Base タイル(22nm)で、除外されたため。正しい挙動) |
| intel-lnl-268v | Tj 94.263℃、R 1.8720 | Tj 95.659℃、R 1.9097 |
| intel-lnl-258v / 256v | Tj 94.262℃ | Tj 95.658℃ |
| intel-arl-285h | Tj 99.99993℃、電力 39.2W(未取得のタイル 4 個を無視し、Base 178mm² だけで R を計算していた) | 温度なし。理由 `発熱するタイルの面積が全て未取得(Base タイルは…)` |

「注記の文言」は変わっている(`面積が未取得のダイが` → `発熱するダイのうち面積が未取得が`)。ただし、これが出るのは「発熱するダイの面積が一部だけ取れている」場合で、4 件のどれもそうなっていない(面積が全部 null)。

## 2. dies に Base / インターポーザ相当があるプリセット(全 106 件を走査)

| 系列 | dies の構成 | Base 相当 | isPassiveDie |
|---|---|---|---|
| Meteor Lake(185H) | Compute / GPU / SoC / IO / `Base タイル(22nm)` null | あり | 除外される(OK) |
| Arrow Lake-H(285H) | Compute / GPU / SoC / IO(全部 null)/ `Base タイル` 178 sec | あり | 除外される(OK) |
| Lunar Lake(268V/258V/256V) | Compute 139.6 / Platform Controller 45.7 / `Base タイル` 219.7 | あり | 除外される(OK) |
| Arrow Lake-S(285K/265K) | Compute / GPU / SoC / IO の 4 つのみ | **データに無い**(実機は Foveros の土台を持つ。面積は未取得で、載せていないだけ) | 該当なし。熱には影響しない |
| Arrow Lake-HX(275HX)・Panther Lake-H(388H/386H/378H/358H) | Compute タイル 1 つだけ | データに無い | 同上 |
| Panther Lake U(325) | Compute タイル 1 つ(null) | 無い。Foveros か否かは未確認 | 同上 |
| Wildcat Lake(320) | Compute / IO | 無い(UCIe・有機パッケージ。`intel-ptl-325-wcl-320.md`) | 同上 |
| AMD Zen 4/5 デスクトップ・Dragon Range(7945HX) | CCD(×2)+ IOD | **無い**(有機基板に載せる構成で、パッシブな土台は無い。IOD は発熱する) | 該当なし(OK) |
| Zen 3 デスクトップ(5800X) | dies 空(5600X・5950X は CCD だけで IOD なし) | 無い | 該当なし。ただし IOD・CCD 未登録 |
| Strix Halo(395) | CCD ×2 + SoC/iGPU ダイ | 無い | 該当なし |
| M1 Ultra | `M1 Max ×2 (UltraFusion)` 1 件(×2 で 864) | UltraFusion はシリコンブリッジで、面積は載せていない | 該当なし |
| GB10 | S-die + G-die | 無い(2 つとも発熱) | 該当なし |
| EPYC 7401 | Zeppelin ×4(全部発熱) | 無い | 該当なし |
| Snapdragon 等の SoC | 1 ダイ | 無い | 該当なし |

名前に Base / Interposer / Foveros / PCD / ベース / インターポーザ を含むダイは、上の 5 件(185H・285H・268V・258V・256V の `Base タイル`)だけ。**今のデータで isPassiveDie の漏れは無い。** 将来の漏れの余地は、正規表現 `/^Base(\s|タイル|$)/` が名前の先頭の `Base` に依存している点(`Foveros Base`、`ベースタイル`、`Interposer`、`Base(22nm)`(空白なしで括弧)は拾えない)。

## 3. Lunar Lake の Base タイル

- 現状の dies: `Base タイル` 219.7 mm²、区分 `meas`(268V。258V・256V は `sec`・流用)、nodeId `tsmc-n6`。出典の注記なし(cea6d89、2026-10-27 の M0 で入れた値)。
- 面積の出所: Kurnal Insights のダイショット一覧 https://kurnal-insights.com/en/dieshot/ (2026-11-12 に原ページを取得して確認)に「Intel Lunar Lake Base Tile 13.1 × 16.77 mm · 219.7 mm²」の行がある。同ページの Compute Tile 139.6、Platform Controller Tile 45.7 とも一致する。**面積は Kurnal の計測で、公式値ではない**ので区分は `meas` ではなく二次(`sec`)が正しい(他の Kurnal 値と同じ扱いなら `meas` のまま、という運用もあり得るが、注記は必要)。
- プロセスの食い違い: Kurnal の同じ表は、この行のプロセスを `TSMC N6 / N7` と表示している(表では名前の前に処理の列が来る並びで確認。Compute が `TSMC N3 family`、Platform Controller が `TSMC N6 / N7`、MTL Base が `Intel ≥ 14nm` で整合する)。しかし、
  - Tom's Hardware(Intel の Lunar Lake アーキテクチャ発表の記事、原ページを 2026-11-12 に取得): 「the only Intel-fabbed silicon on the chip is the passive 22FFL Foveros base tile that facilitates communication between the tiles and the host system」「a stiffener … placed atop a 22FFL base Foveros tile」。 https://www.tomshardware.com/pc-components/cpus/intel-unwraps-lunar-lake-architecture-up-to-68-ipc-gain-for-e-cores-16-ipc-gain-for-p-cores
  - Wikipedia「Lunar Lake」(2026-11-12 に取得): 「Foveros interposer base tile | Intel 22FFL | 面積: unknown」。
  
  よって**プロセスは Intel 22FFL(Intel 16 と呼ばれることもある)が正しく、`tsmc-n6` は誤り**。Kurnal の分類が粗いか誤り。`docs/設計書.md` の表(行 192)も `TSMC N6/N7` になっている。nodes.js に 22nm / 22FFL が無いので、nodeId は仮置きしかできない(285H の Base は `intel-14` を仮に指定済み)。nodeId は歩留まり・コストに効くが、熱には効かない。
- 「発熱しない土台」か: Tom's Hardware は **passive** と明記(タイル間・ホストとの通信を仲介するだけ)。Intel の説明どおり、トランジスタを使うアクティブな回路を持たないベースなので、発熱は無視できる。HotChips 2024 の資料そのものは今回取得できていない(Tom's の記事は Intel の説明の報道)。
- 面積が 219.7 > Compute+PCT(185.3)なのは、Base がタイルより大きくスティフナーの下まで広がるため。

## 4. メモリ(オンパッケージ LPDDR5X)の扱い

- データ: `cfg.memory = 'オンパッケージ LPDDR5X-8533, 2ch, 最大 32GB'`(268V。ARK は 2 チャネル)。Tom's の記事によれば LPDDR5X-8500 を 2 スタック、パッケージ上に直接載せる(16GB か 32GB)。
- 電力モデル(`js/sim/power.js` chipPower): メモリは **チャネル数 × wPerMemCh(2.0 W、根拠なしの仮置き)× 稼働率** のアンコア項として入るだけ。DRAM チップ自体の電力は別に持たない。268V の calibratePower(`power.base` = 17 W 公表 PBP に powerK を合わせる)では、powerK = 1.791、コア分 7.69 W、アンコア 9.31 W(L3 12MB 分 1.2×K ≒ 2.1 W、メモリ 2ch 分 4.0×K ≒ 7.2 W)。つまり**公表電力 17W の約 42% を、根拠のない 2 W/ch が占めている**。この分はプロセッサーの電力(ARK の値)に含まれる前提で扱っており、DRAM の電力が上乗せされているわけではない(ARK の PBP/MTP に DRAM 分が含まれるかは未確認)。
- 熱モデル(`js/sim/thermal.js`): 面積はダイの面積だけ。メモリの発熱・DRAM のパッケージ面積は入らない。Tj = 25 + P × R_total の P はチップ電力のみ。
- 268V の既定 Package: 薄型ノート(R_冷却 2.0 K/W、tAmb 25℃、Tj 上限 100℃)、有機基板、電力制限 37 W。解くと**電力制限 37 W で持続クロックが決まる**(limitedBy: power、s = 0.793、P 3.96GHz、LP-E 2.93GHz)。Tj 94〜96℃ は、25 + 37 W × 1.87〜1.91 K/W で、ほぼ冷却の仮置き値 2.0 K/W と電力制限で決まる。面積は R の 1〜5% しか動かさない。
- ユーザー仮説「メモリが原因」の検証:
  - Tj +1.4℃ の内訳: R_total 1.8720(面積 405.0 mm²)→ 1.9097(面積 185.3 mm²)。rDie は 0.0049 → 0.0108 K/W、基板経路 rSub は 28.2 → 38.0 K/W に増える。ΔTj = 37 × (1.9097 − 1.8720) = **1.40℃**(測定値は 94.263 → 95.659 = 1.396℃)。電力は 36.99986 → 36.99999 W で、変化は無い。メモリ項(calibratePower と chipPower の `cfg.memory` の読み取り)は 45d9ecb で触っていない。**メモリは原因ではない。**
  - ただし、メモリの扱いを変えると**持続クロックは大きく動く**(Tj は電力制限 37W で決まるため 95.66℃ のまま):

    | wPerMemCh | powerK | s | P コア | LP-E | Tj |
    |---|---|---|---|---|---|
    | 0 W | 3.095 | 0.698 | 3.49 GHz | 2.58 GHz | 95.66℃ |
    | **2 W(現行)** | 1.791 | 0.793 | 3.96 GHz | 2.93 GHz | 95.66℃ |
    | 4 W | 1.260 | 0.861 | 4.30 GHz | 3.18 GHz | 95.66℃ |

    メモリ項が小さいほど、同じ 17W にコアが割り当てられるので powerK が大きくなり、持続クロックは下がる。つまりメモリの熱の入れ方は Tj ではなく**持続クロック(MT)**に効く。これは Lunar Lake に限らず全プリセット共通の仮置き(2 W/ch)の問題。
  - 仮に DRAM の発熱(2 パッケージで 3 W 程度と仮定。**根拠なしの例**)を CPU と同じ経路に足すと、+3 × 1.91 = +5.7℃。45d9ecb の +1.4℃ より大きいが、現状はモデルに入っていない。

## 5. 修正が必要な点(優先度順)

1. **(高)Lunar Lake の Base タイルの nodeId が誤り**(`tsmc-n6` → Intel 22FFL)。nodes.js に 22FFL が無いので、285H と同様に仮の nodeId + 注記が必要。または nodes.js に 22FFL を追加する(出典: Tom's Hardware、Wikipedia。歩留まり・コストの計算に効く)。268V/258V/256V の 3 行と、設計書の表(行 192)。熱の計算には影響しない。あわせて Base の面積 219.7 の注記(出典: Kurnal、区分は二次)と、268V の区分を見直す。
2. **(中)isPassiveDie を名前の正規表現だけに頼らない**。`die(..., { passive: true })` のようなフラグ、または `isPassive` 属性を dies に持たせ、isPassiveDie は `d.passive === true || 名前の正規表現` にする。今のデータでは漏れは無いが、`Foveros Base`・`ベースタイル`・`Interposer`・`Base(22nm)` は拾えず、将来 Arrow Lake-S/HX・Panther Lake に Base を足すと取りこぼす。タイルの名前を変える運用と干渉しない。
3. **(中)45d9ecb のコミット/報告の訂正**: 「Base を持たない 4 件で理由文が変わった」は誤り。理由文は 285H だけが変わり、185H は注記が 1 行消え、LNL 3 件は Tj のみ。4 件(5800X・Kraken・325・320)は変わっていない。報告の差の検出を見直す(今回の比較は `tests/helpers.js` で全プリセットを evaluate し、thermal.js の solveThrottle だけを差し替えて比べたもの)。
4. **(中)R_total の基板経路の面積**: 現状は上面経路(rDie)も基板経路(rSub)も、同じ「発熱するダイの面積」。基板に熱を流す経路は、Base タイルを通るので、基板経路は Base を含む全面積(405 mm²)のほうが物理的に近い。そうすると LNL の R は 1.8771 K/W(Tj 94.45℃、+0.2℃)で、元の値にほぼ戻る。+1.4℃ のうち大半は rSub の面積の変更で生じている。上面経路だけ発熱するダイにする案を検討できる(判断が要る。今の値は冷却が仮置きなので誤差の範囲)。
5. **(低)メモリ項(wPerMemCh = 2 W/ch)の根拠なし**: LPDDR5X(オンパッケージ)と DDR5 / LPDDR5X(基板上)を区別せず、同じ 2 W/ch を使い、公表電力の 4 割強を占める。持続クロックと MT に効く(§4 の表)。メモリ種別ごとの値を出典つきで調べるか、画面に「メモリ分の電力は仮置き」と出す。オンパッケージの DRAM の発熱を別項(熱の入力)にする場合は、出典(Micron/Samsung の LPDDR5X のデータシートなど)が先。
6. **(低)5800X の dies が空**(CCD 80.7 mm² は 5600X に Zen 3 CCD として入っている。IOD は 5600X・5950X・5800X のどれにも無い)。温度が出ないのは、面積が取れていないため。5800X に CCD 80.7 を入れる(5600X の「6 コア品」の注記と同じ CCD)のは別の判断で、今回の調査対象外。

## 6. 調べられなかったこと

- Intel Hot Chips 2024 の資料そのもの(Lunar Lake の Base タイルのプロセス・面積)。Tom's Hardware と Wikipedia までで、Intel の一次資料は未取得。
- Panther Lake(U/H)の Base タイルの有無・プロセス。
- Arrow Lake-S/HX の Base タイルの面積。
- ARK の PBP/MTP(268V の 17 W / 37 W)がオンパッケージ DRAM の電力を含むか。
