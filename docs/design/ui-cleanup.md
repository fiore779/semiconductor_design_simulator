# UI 整理と部品ライブラリ検索の改善 設計書

作成日: 2026-11-05 / 対象: HTML+JS(plain script UMD、外部ライブラリなし、日本語 UI、ローカルのみ)
元になった要望(2026-11-05): (1)「全体的に ui がごちゃごちゃになっているのでそこを修正してください」 (2)「コアなどを追加するときに、検索機能がないので、純粋に探しづらいです」。追加確認の回答: 検索が欲しい画面は「部品ライブラリ(C 混合・D 新規)」。

表記: 根拠の種類を **[F]** = コアを読んで確認した事実、**[S]** = スクリーンショット(C 混合の初期画面。`C:\Users\kazut\AppData\Local\Temp\claude-chrome-screenshots-tcby5Q\screenshot-1793872649581-0.jpg`)で確認した事実、**[I]** = 推定(ブラウザが使えないため、コードから画面を推定)に分けて書く。

`docs/設計書.md` は編集しない(`grep -c '^`' docs/設計書.md` = 33 を保つ)。§8 への反映は、この実装が終わってから leader が別途判断する(「未決事項」U10)。

---

## 1. 概要

### 1.1 目的
1. 画面の情報密度・常時表示の説明文・重複する注意書き・色の使い方・領域の高さ配分を整理し、「何を見ればよいか」が分かる画面にする。
2. 部品ライブラリ(左欄)で、コアなどを**探して追加する操作**を速く確実にする(検索欄を最上部に固定、一覧を画面内に見せる、検索対象の拡張、ハイライト、件数、クリア、キーボード操作)。

### 1.2 満たす要件

| ID | 要件 |
|---|---|
| R1 | 古い・不要な文言(「M2 では部品の追加はできません(簡易表示)」と箇条書きなど)を削除する |
| R2 | 常時表示の補足説明を `<details>`(折りたたみ)に移す。確度・エラーなど**判断に必要な情報は隠さない** |
| R3 | 重複する注意書きを 1 か所にまとめる |
| R4 | 左パーツ欄の幅を広げ、利用者が幅を変えられるようにする(保存あり) |
| R5 | 部品ライブラリの並びを変える: 検索欄を最上部に固定、説明は折りたたみ、自作コア欄は折りたたみで一覧の下ではなく上に、一覧が最初から見える |
| R6 | 一覧の 1 行を小さくする(追加できない部品の長い赤文を 1 行にする、「追加できるものだけ」の絞り込み) |
| R7 | 検索を改善する: 検索対象の拡張、複数語 AND、ハイライト、件数、クリア(×)、`/` と Esc、0 件の案内、60 件超の「さらに表示」、状態保持、再描画後のフォーカス復帰 |
| R8 | D 新規の「コア複製元の選択」にも同じ検索が効くこと(現状調査の結果は §2.3。専用の選択一覧は無く、部品ライブラリを共用している) |
| R9 | 右の結果カードを整理する(注意帯を 1 つの枠にまとめる、カード内の前提・補足を折りたたむ、赤の使いどころを絞る) |
| R10 | 下段 3 欄の高さ・列幅・重複ボタン・検証パネルの情報行を整理する |
| R11 | ヘルプとトーストを、レイアウトを押し下げない重ね表示にする(キャンバスのリサイズ防止) |
| R12 | CSS の重複・上書きを整理し、幅 1280px 以下でレイアウトが崩れないようにする |
| R13 | 評価(ST/MT/面積/電力/温度)の数値・警告の文言(`evaluate.js` が返す文)は一切変えない |
| R14 | アクセシビリティ(キーボード・aria・コントラスト)とライト/ダークの両テーマを維持する |
| R15 | 既存テストを全部通し、新機能のテストを追加する |

---

## 2. 現状の整理(根拠つき)

### 2.1 「ごちゃごちゃ」の原因

| # | 原因 | 根拠 | 対応 |
|---|---|---|---|
| C1 | **左欄の幅が狭い**。`#workarea` の列は `css/app.css` の 50 行目(170px)・138 行目・146 行目(230px)・173 行目(210px)で 4 回定義され、最後の 230px が有効。パディングを引くと実効 約 205px | [F] app.css / [S] 左欄の文が 4〜5 文字ずつで折り返している | R4, R12 |
| C2 | **C 混合の左欄で、一覧が説明文の下にある**。`library.js` の追加順は「h2 → 説明 → 検索・3 つの絞り込み → 自作コア(設計内)→ ユーザーライブラリ(長い説明+JSON 取り込み)→ エラー → 件数 → 一覧」(95〜126 行)。一覧は 4 画面分下にあり、スクロールしないと見えない | [F] library.js:15〜126 / [S] 一覧は画面外 | R5 |
| C3 | **件数表示・エラー表示も一覧の直前(最下部)にある**。検索しても件数が見えず、「追加」が失敗した理由(`libMsg`)も見えない | [F] library.js:122〜123 | R5, R7 |
| C4 | **一覧の中の入れ子スクロール**。`.lib-list` は `max-height: 46vh` の別スクロール、その外側の `#parts` もスクロールする。さらに追加のたびに全体が作り直され(`renderMixPanels` → `renderLibrary` が `clear` してから描く)、一覧のスクロール位置と入力フォーカスが失われる | [F] app.css:197, main.js:111〜118, library.js:16 | R5, R7 |
| C5 | **一覧 1 行が大きい**。1 部品あたり「名前」「出所/プロセス/命令セット/種別」「面積バッジ+注記」「事前チェックの赤文」「面積の導出」「個数入力+追加+複製して編集」の最大 6 段(約 110〜140px)。60 行で約 7000px | [F] library.js:42〜51 | R6 |
| C6 | **追加できない部品の赤文が各行に出る**。設計に x86 のコアがあると、Arm のコア行すべてに「⚠ 追加できません: x86 のコアがある設計に Arm のコアは追加できません(…混在できません)」(約 3 行)が付く(`MF.preCheck` の error を行ごとに表示)。ほとんどの行が赤くなる | [F] library.js:28,46 / mixform.js:100 | R6 |
| C7 | **改良モード(A/B)の左欄に古い文言が常に出る**。`index.html` 49〜56 行の「M2 では部品の追加はできません(簡易表示)。」「コア/キャッシュ/SoC/I/O」の箇条書き(機能しない見出しだけの一覧)と、長い「ブロックの配置は…模式図…」。C では `main.js:114` が隠している | [F] index.html:48〜56, main.js:114 / [S] 要望文にもある | R1 |
| C8 | **同じ内容の注意書きが複数箇所に出る**(下表) | [F] 下表 | R3 |
| C9 | **右の結果カードの情報過多**。混合の ST カード 1 枚に、見出し・値・「公開値はありません」・長い前提文(`MIX_PERF_PREMISE` 約 90 字)・最速コアの説明・L3 注記が積まれる。MT はさらに赤帯 1 つと注記 3〜4 つ。面積カードは注記が最大 8 個。電力・温度カードは各々赤帯 1 つ。右欄全体が 5 カード+上部の注意 3 つで [I] 約 2500px 以上 | [F] results.js:100〜180 / [S] カード 1 枚で約 200px・2 枚目の途中で画面が終わる | R9 |
| C10 | **赤の使いすぎで、赤が合図にならない**。赤は `.low-banner`(赤地・赤字・太字・赤枠。混合で上部 2 つ、MT・電力・温度カードに各 1 つ、自作コア注意帯は最大 5 つ)、`.conf-low` バッジ(5 カード)、`.conf-card-low` の 6px 左枠(混合の ST/MT 全カード)、`.err`。C 混合では評価が常に確度低なので、画面の大半が赤くなる。**コントラスト自体は問題ない**(下の実測) | [F] app.css:71〜76, results.js / [S] 赤い帯 2 つ+赤枠のカード | R9 |
| C11 | **ヘルプが画面を押し下げる**。`#help` は通常のブロックで、開くと「ショートカット」+「できること/できないこと」の長い 3 段落(約 250px)が上部に入り、ワークエリアが縮む | [F] index.html:31〜45, app.css:40 | R11 |
| C12 | **トーストがレイアウトを動かす**。`#notice` は通常のブロック。`:not(:empty)` で約 30px の高さが生じ 8 秒で消える。その間ワークエリア(ダイビュー)の高さが変わり、`ResizeObserver` でキャンバスが再描画される。エラー(`err`)は消えず領域を取り続ける | [F] app.css:42〜44, main.js:30〜34, dieview.js:240 / [S] 緑の帯が全幅 | R11 |
| C13 | **下段の高さが固定 210px**。3 欄とも同じ高さ。プロパティは未選択のとき 1 行(「ブロックを選ぶと…」)なのに 1.1fr 取る。検証パネルは情報行が 3〜4 行並び(C 混合: 警告 1+情報 3 など)右の結果カードと同じ内容を繰り返す。履歴欄には「元に戻す/やり直す」ボタンがあり、ツールバーと重複 | [F] app.css:99, panels.js:45〜56, evaluate.js:321〜334 / [S] | R10 |
| C14 | **CSS の上書きが散らばっている**。`#workarea` の列定義が 4 回(上記)、`#parts{display:none}`(1000px 以下)は 172〜176 行で打ち消され実質無効、`.filters input…` と `.pinput input…` と `.coreeditor .pinput input…` が同じ見た目の宣言を繰り返す | [F] app.css | R12 |
| C15 | **ダイビュー上部が 3 段**(配置/電力密度/温度/全体表示、3D 表示/2D 編集、操作ヒント)。ダイが小さく見える | [S] / viewhost.js が `.vh-bar` を作る | スコープ外(§2.4。U7) |

#### C8: 重複する注意書きの一覧(C 混合の初期画面)
| 内容 | 出る場所 |
|---|---|
| 混合の性能は確度:低 | 右上の黄色い説明、5 カードの確度バッジ、検証パネルの警告、(自作コアがあれば)注意帯 1 |
| 混合による性能低下は反映していません | 右の赤帯、検証パネルの情報(evaluate が出す)ほか |
| 電力・温度は出さない/推定できない | 右上の黄色い説明、電力カード、温度カード、検証パネルの情報(自作コアのとき) |
| ブロックの大きさ・配置は模式図 | `index.html` の左(A/B のみ)、`results.js` 面積カード 2 回(137 行と 138 行の `SCHEMATIC_NOTE`)、`mixpanel.js:69`、`panels.js:24`(プロパティ)、`viewhost.js` の注記、`heatdata.js` |
| 「編集後の数値は予測で、公開値ではありません。公開値との差は出しません。」 | B モード: `diffpanel.js:66`、`results.js:29`(ST と MT の 2 枚)、さらに赤帯「予測(編集後)」(189 行)。**同一文が 3 か所** |
| 冷却の熱抵抗は仮置き | 温度カードの赤帯(`results.js:64`)とパッケージ設定欄(`packagepanel.js:29`) |
| ST/MT を計算できない理由 | カードの「理由: コアなし」と検証パネルの情報 |

(`js/` 内で「確度:低/確度は常に低/確度低」を含む記述は 13 ファイル 39 箇所。[F] grep)

#### 配色のコントラスト(計算値。ライト/ダーク)
`--muted` 6.33/6.01、`--warn` on panel 9.36/5.93、`--warn` on `--warn-bg` 7.45/5.37、`--ng` on `--low-bg` 5.97/5.56、`--accent` on panel 5.57(ダーク)。すべて 4.5:1 以上。**色の組み合わせは変えない**。問題は色の質でなく、**同じ強さの赤・黄が同時に多数出ること**(C10)。

### 2.2 部品ライブラリの検索の現状 [F]
- 検索欄はある(`library.js:106`)。`oninput` で `filter.text` を更新し `refresh()` で**入力のたびに絞り込む**(既存)。絞り込みの状態(`filter`)はモジュール変数で、再描画しても残る(既存)。
- 検索対象(`mixform.js` の `filterParts`): `label`・`sourceChip`・`uarch`・`coreType`・`partName(p)` の**部分一致**(大文字小文字は区別しない)。**単語を空白で分けて AND にはしていない**(「zen 5」は 1 つの文字列として探す)。**メーカー・命令セット・種類・プロセス(ノード)は検索語では探せない**(プルダウンのみ)。
- 件数は「N 件 / 全 M 件」と、60 件を超えると「(先頭の 60 件を表示。絞り込んでください)」(`MAX_ROWS=60`)。ただし**一覧の直前(最下部)**にあり、60 件を超えた分を見る方法は絞り込みだけ(「さらに表示」が無い)。
- ハイライト・クリア(×)・キーボード操作・0 件の案内は無い。0 件のときは何も出ない(空の一覧と「0 件 / 全 280 件」だけ)。
- 部品は計 280 件(コア 209・L3 48・GPU 5・uncore 18、メーカー 6)。1 行の生成(`preCheck`・`cloneInfo`)は軽い(60 行で測定 1ms 未満・`preCheck` のみ)ため、入力ごとの全再描画のままでよい(デバウンスしない)。

### 2.3 D 新規の「コア複製元の選択」 [F]
- 専用の選択一覧は**無い**。`coreform.js` は DOM を持たない純関数(`cloneInfo` 等)、`coreeditor.js` は複製済みの定義(`env.def`)を受けて開くダイアログで、コアを選ぶ UI は持たない。
- 複製元の選択は、**部品ライブラリのコア行の「複製して編集」ボタン**(`library.js:51` → `main.js` の `onCloneCore` → `coreeditor` を開く)。D 新規でも、C と同じ `#library` を使う(`DS.isMix` は `origin.mode==='mix'` で C/D 共通、D は `origin.entry==='new'`。`main.js:111〜117`)。設計書 §8.9 の「[既存コアから複製]」はこのボタンで実現している。
- 結論: **D 向けに別の検索は要らない**。部品ライブラリの検索を改善すれば D にもそのまま効く。D の入口メッセージ(`main.js:449`)は「左の部品ライブラリでコアを選び、『複製して編集』…」と案内済みで、変更不要。D 固有の改善は、一覧の初期絞り込みを「コア」にするか(U5。実装しない)だけ。
- ユーザーライブラリ(自作コア)と設計内の自作コアの一覧は検索欄の対象外だったので、R7 で同じ検索語が効くようにする(名前・基準 uarch・基準チップ)。

### 2.4 スコープ外(やらないこと)
- 評価・モデル(`js/model/`・`js/sim/`・`data/`)の変更。警告の文言(`evaluate.js` が返す `warnings[].text`)の変更。
- ダイビュー(`js/render/`)の変更。ダイビュー上部 3 段の統合(C15)・3D/2D 切替バー・操作ヒントの位置。
- ダイアログ(新規・プリセット選択・比較・書き出し・設定)の整理。プリセット選択ダイアログの検索は既に最上部にある。
- 検索の仮名ゆれ(ひらがな/カタカナ)・あいまい検索・検索履歴・並べ替え UI。
- 部品をダイへドラッグして置く操作(設計書 §8.7 の記述にあるが現状は未実装で、今回も扱わない)。
- ライトテーマ/ダークテーマの色トークン(`:root` の変数値)の変更。**追加のみ**(`--mark-bg` など。§5.3)。
- `docs/設計書.md` の編集。

---

## 3. 変更・追加するファイル

実装順(小さく確実なものから。**各ステップごとに `node --test tests/` を全部通してから次へ進む**)。

| 順 | パス | 種別 | 役割・変更の要点 | 要件 |
|---|---|---|---|---|
| S1 | `index.html` | 変更 | `.partslist`(M2 の文言・箇条書き・模式図の注記)を削除。ヘルプの文に `/` を追加し、模式図・飾りの 1 文を移す | R1 |
| S1 | `js/main.js` | 変更 | `main.js:114` の `.partslist` の `hidden` 切替を削除 | R1 |
| S1 | `js/ui/panels.js` | 変更 | `renderHistory` の「元に戻す/やり直す」ボタン行を削除(引数は残す) | R10 |
| S1 | `js/ui/diffpanel.js` | 変更 | 66 行「編集後の数値は予測で…」を削除(結果側に残る) | R3 |
| S1 | `js/ui/results.js` | 変更 | 面積カードの模式図の注記 2 つを 1 つにまとめる | R3 |
| S2 | `js/ui/mixform.js` | 変更 | 検索の純関数を追加・拡張(§4.1) | R7 |
| S2 | `js/ui/dom.js` | 変更 | `more()`(折りたたみの共通部品)を追加 | R2 |
| S2 | `js/ui/library.js` | 変更 | 並び・検索・ハイライト・件数・クリア・「さらに表示」・フォーカス復帰(§4.2) | R5〜R8 |
| S2 | `index.html`, `js/main.js` | 変更 | 左欄のタブ(部品ライブラリ / 混合設計)、`/` ショートカット(§4.4) | R5, R7 |
| S2 | `css/app.css` | 変更 | ライブラリ・タブ・`mark`・`.more` のスタイル | R5〜R7 |
| S3 | `js/ui/results.js` | 変更 | 注意帯のグループ化、カード内の前提・補足を `more()` に(§4.5) | R2, R9 |
| S3 | `js/ui/diffpanel.js`, `js/ui/params.js`, `js/ui/packagepanel.js`, `js/ui/mixpanel.js`, `js/ui/coreeditor.js` | 変更 | 補足文の折りたたみ(§4.5) | R2 |
| S3 | `js/ui/panels.js` | 変更 | 検証パネルの情報行を折りたたむ | R10 |
| S4 | `js/ui/layout.js` | **新規** | 左欄幅の保存・復元・クランプ(純関数)と、リサイズ操作・メニューバー高さの追跡(ブラウザ専用) | R4, R11 |
| S4 | `index.html`, `js/main.js`, `css/app.css` | 変更 | リサイズ用の仕切り、ヘルプ・トーストの重ね表示、下段の高さ、CSS 整理、幅の段階 | R4, R10〜R12 |
| S5 | `tests/mixform.test.js` | 変更 | 検索の純関数のテスト | R7, R15 |
| S5 | `tests/layout.test.js` | **新規** | `layout.js` の純関数のテスト | R4, R15 |
| S5 | `tests/browserload.test.js` | 変更 | `layout` の登録、ライブラリの DOM の並び・検索・ハイライトの確認 | R5〜R7, R15 |
| S5 | `tests/ui-cleanup.test.js` | **新規** | `more()`・結果パネルの折りたたみ・検証パネル・履歴パネルの確認(DOM スタブ) | R2, R3, R9, R10, R15 |

変更しないもの: `js/model/*`、`js/sim/*`、`js/render/*`、`data/*`、`docs/設計書.md`、`index.html` の `<script>` の読み込み順のうち既存分(`layout.js` は `panels.js` の直後・`main.js` の直前に 1 行足すだけ)。

---

## 4. インターフェース

### 4.1 `js/ui/mixform.js`(純関数。DOM なし。Node でテストする)

**`filterParts(parts, q, opts)`** (R7) — 既存関数の拡張。後方互換(第 3 引数は省略可)。
- `q`: `{ isa, vendor, kind, text }`(既存)。`opts`: `{ nodes }`(省略可。プロセス一覧。`[{ id, name }]`)。
- `isa`・`vendor`・`kind` の判定は既存どおり(完全一致)。
- `text` の判定を次に変える:
  1. 文字列を `normalize('NFKC')` → `toLowerCase()` → 空白(半角・全角・連続)で分割 → 空要素を除いた語の配列 `tokens`。`tokens` が空なら text 条件なし。
  2. 部品ごとに**検索対象の文字列**を 1 つ作る(下の 12 項目を `\n` で連結し、同じく NFKC+小文字化): `p.label`、`p.sourceChip`、`p.uarch`、`p.coreType`、`partName(p)`、`p.vendor`、`p.isa`、`ISA_LABEL[p.isa]`、`p.kind`、`KIND_LABEL[p.kind]`(「コア」「L3」「GPU」「uncore」)、`p.nodeId`、プロセス名(`opts.nodes` から `p.nodeId` で引いた `name`。無ければ空)。
  3. **すべての語**がその文字列に部分一致するものだけを残す(AND)。語の順序は問わない。
- 既存の挙動との差: 「zen 5」は旧版では 1 つの文字列だったが、新版は「zen」と「5」の AND(旧版の一致集合を含む上位集合)。`tests/mixform.test.js` の既存アサーション(`zen 5` で `core:amd-zen5-9700x:P` を含む、存在しない語で 0 件、空で全件)は変わらず通る。

**`searchTokens(text)`** (R7) — `string → string[]`。上の手順 1。`filterParts`・`highlightSegments`・`relevanceSort` が共有する。

**`highlightSegments(text, tokens)`** (R7) — `(string, string[]) → [{ text, hit }]`。`text` を一致部分とそうでない部分に分ける。
- 一致は `text.toLowerCase()` 上で語を探す(大文字小文字を区別しない)。ただし `text.toLowerCase().length !== text.length` のとき(まれな文字)は分けず `[{ text, hit:false }]` を返す。NFKC は掛けない(元の文字列の位置を保つため)。したがって全角の語は一致しても強調されない場合がある(許容。検索自体は一致する)。
- 複数語の一致範囲が重なる・隣り合うときは 1 つにまとめる。`tokens` が空なら `[{ text, hit:false }]`。連結すると必ず元の `text` に戻る。空文字は `[]`。
- DOM を作らない(`library.js` が `<mark>` を作る。`innerHTML` は使わない)。

**`relevanceSort(parts, tokens)`** (R7) — 新しい配列を返す(元は変えない)。`tokens` が空なら入力と同じ順。空でないとき、次の 4 段階で安定整列する(同じ段の中は元の順)。語頭 = 直前が英数字でない位置。
- 0 段: 検索語全体(`tokens` を空白でつないだ語句)が、`partName(p)` または `uarch` に**語頭の位置で**連続して含まれる(「Ryzen 5」の中の「zen 5」は数えない)。
- 1 段: 全語が `partName(p)` の語頭で一致する。
- 2 段: 全語が `partName(p)` に部分一致する。
- 3 段: それ以外。
- 数字だけの語・語句は、一致の直後が数字なら一致としない(「5」は「5800X」に当たらない)。

**`isAddable(design, part, nodes)`** (R6) — `boolean`。`preCheck(design, part, nodes)` の結果に `level==='error'` が 1 つも無ければ true。

**`addBlockReason(design, part, nodes)`** (R6) — `string|null`。error があれば**短文**を返す。`code==='isa-mix'` のとき「命令セットが違うため追加不可(設計は x86 のコアのみ)」の形(設計にあるコアの命令セット名 `ISA_LABEL` を `・` で連結して入れる。例: 「命令セットが違うため追加不可(この設計は x86)」)。それ以外の error は `text` をそのまま返す。error が無ければ null。長い原文(`preCheck` の `text`)は `title` 属性と、ボタンの `title`(既存)に残す。

**`libCountText(info)`** (R7) — `info = { matched, total, visible, hasCondition, addableOnly, hiddenByAddable }` → `string`。次の形(`hasCondition` = 検索語または 3 つのプルダウンのどれかが指定されている):
- 条件なし: `全 ${total} 件`(`matched > visible` なら末尾に `・先頭 ${visible} 件を表示`)。
- 条件あり: `${matched} 件が該当(全 ${total} 件)`(`matched > visible` なら末尾に `・先頭 ${visible} 件を表示`)。
- `hiddenByAddable > 0` のとき末尾に `・追加できない ${hiddenByAddable} 件を除く`。
- `matched === 0` のとき `0 件が該当(全 ${total} 件)`。

**`emptyText(q, addableOnly)`** (R7) — `string`。0 件のときの案内。`「${text}」に一致する部品はありません。` + (命令セット・メーカー・種類の指定があれば `絞り込み: 命令セット=Arm / メーカー=AMD / 種類=コア` を連結)+ (`addableOnly` なら `「追加できるものだけ」も有効です。`)。`text` が空なら先頭を `この条件に合う部品はありません。` にする。

### 4.2 `js/ui/library.js`

**`renderLibrary(el, design, parts, cb, msg, nodes, env)`** — **シグネチャ・引数の意味・`cb` の各コールバックは変えない**(`tests/browserload.test.js` の 114・154・441 行の呼び出しがそのまま通ること)。変更は内部の組み立てと見た目だけ。

モジュール変数(再描画をまたいで保つ。**設計が変わっても消さない**):
- `filter = { isa, vendor, kind, text, addableOnly }`(`addableOnly` を追加。既定 false)。
- `uiState = { helpOpen:false, customOpen:false, userOpen:false, shown: MAX_ROWS }`。`shown` は「今表示する行数」で、`filter` が変わるたびに `MAX_ROWS`(60)に戻す。

**DOM の並び**(上から。`el` = `#library`):

| 順 | 要素 | 内容 |
|---|---|---|
| 1 | `h2` | 「部品ライブラリ」 |
| 2 | `more()`(`key:'lib:help'`) | 要約「使い方・用語」。中に旧説明文(「実在チップから取り出した部品を…面積の区分: 表(出典あり)/推定(仮の比率)/未取得。」)。**既定は閉じる** |
| 3 | `div.lib-sticky`(`position: sticky`) | 検索行+件数行(下記) |
| 4 | `div.lib-filters` | 命令セット・メーカー・種類の 3 つのプルダウンを 1 行(狭ければ折り返す)+ チェック「追加できるものだけ」 |
| 5 | `more()`(`key:'lib:custom'`) | **設計内に自作コア(`design.coreDefs`)があるときだけ**。要約「この設計の自作コア(N 件)」。中身は現行のまま(説明文も `<p class="note">` のまま中に入れる) |
| 6 | `more()`(`key:'lib:user'`) | `cb.onUseUser` があるとき。要約「ユーザーライブラリの自作コア(N 件)」。中身は現行のまま(説明文・各コアの行・JSON 取り込み) |
| 7 | `p.err#lib-msg`(`role=alert`) | `msg`(`libMsg`)と `setMsg` の表示。**一覧の直前**に移す(旧: 最下部) |
| 8 | `ul#lib-list.lib-list` | 部品の行(`MAX_ROWS` ずつ) |
| 9 | `div.lib-more` | 残りがあるとき「さらに 60 件表示(残り N 件)」ボタン |
| 10 | `p#lib-empty.small` | 0 件のとき `emptyText` +「条件をすべてクリア」の `linkbtn` |

要素 5・6 の**要約の文言は現行の見出しをそのまま使う**(`自作コア(N 件)`、`ユーザーライブラリの自作コア(N 件)`)。既存テストが `textContent` でこれらを探す(§8)。検索語があるとき、要約の末尾に `・一致 M 件` を足す(M は 5・6 の中身を検索語で絞った件数。下の「検索語の適用」)。

**検索行**(`div.lib-search`、`role="search"`、`aria-label="部品の検索"`):
- `label`(視覚的に隠す `.visually-hidden`。`for="lib-search"`): 「部品を検索」
- `input#lib-search`: `type="search"`、`placeholder="部品を検索(例: Zen 5 / M1 / Arm / N4)"`、`autocomplete="off"`、`spellcheck="false"`、`aria-controls="lib-list"`、`value = filter.text`。
- `button#lib-clear`: 表示「×」、`aria-label="検索語を消す"`、`type="button"`、検索語が空のときは `hidden`。大きさ 24×24px 以上。
- ブラウザ既定の検索欄の「×」(WebKit の `::-webkit-search-cancel-button`)は CSS で消す(自前の `#lib-clear` と二重にならないように)。
- イベント:
  - `input`: `filter.text = value`、`uiState.shown = MAX_ROWS`、`refresh()`、クリアボタンの表示更新。**検索欄は作り直さない**(フォーカス維持。現行と同じ)。
  - `keydown` **Esc**: 検索語が空でなければ、空にして `refresh()`(フォーカスは検索欄に残す)。空なら `blur()`。どちらも `preventDefault()`。
  - `keydown` **Enter**: 一覧の最初の行の、無効でない最初のボタン(通常は「追加」)にフォーカスを移す(行が無ければ何もしない)。
  - クリアボタンの `click`: 検索語を空にして `refresh()`、検索欄にフォーカスを戻す。
- 件数行 `p#lib-count.small`(`role="status"`、`aria-live="polite"`、`aria-atomic="true"`): `libCountText` の結果。

**一覧の組み立て(`refresh()`)**:
1. `tokens = searchTokens(filter.text)`。
2. `res = filterParts(parts, filter, { nodes })`。
3. `filter.addableOnly` が true なら `isAddable(design, p, nodes)` で絞る。除いた件数を `hiddenByAddable` とする。
4. `res = relevanceSort(res, tokens)`。
5. `visible = Math.min(uiState.shown, res.length)`。`res.slice(0, visible)` の各部品で `row(p, tokens)` を作る。
6. 件数行・「さらに表示」・0 件の案内を更新。「さらに表示」は押すたびに `uiState.shown += MAX_ROWS` して再描画し、**押した位置が動かないよう**、押下後にフォーカスを新しく増えた最初の行の先頭ボタンへ移す(0 件増えなければ何もしない)。

**行(`row(p, tokens)`)**(R6)— 1 行を最大 4 段にする:
1. 名前(`<b>`。`highlightSegments(MF.partName(p), tokens)` で `<mark>` を入れる)。
2. 小さい 1 行: `出所チップ / プロセス / 命令セット / コア種別`(現行の文と同じ。同じく `highlightSegments`)。
3. 小さい 1 行(`flex-wrap`): 面積バッジ(現行)+(推定のとき)「仮の比率・P/E の区別なし」+(コアで `ci` があるとき)**「面積の導出: 可/不可」**(文言は現行のまま。`ci.cloneable` が false のときの「複製できません: 理由」も現行のまま同じ行に続ける)。
4. 操作行 `.lib-add`(現行の個数/容量入力+「追加」+「複製して編集」。順序・`aria-label`・`disabled`・`title` は現行どおり)。
- 追加できない部品(`MF.addBlockReason` が非 null): 現行の `p.small.err`(長い赤文)を、**1 行の短文**(`small err`。先頭「⚠ 」+`addBlockReason`)に置き換え、原文は `title` に入れる。赤を使うのはこの 1 行だけ。行全体に `.lib-item.blocked`(文字を `--muted` に、枠を破線に)を付けて視覚的に控えめにする。「追加」ボタンの `disabled`・`title` は現行どおり。
- ボタンに `id` を付ける(`${idBase}-add`、`${idBase}-clone`。`idBase` は現行の `lib-…`)。再描画後のフォーカス復帰に使う。

**検索語の適用(自作コアの 2 つの箱)**: 検索語があるとき、`design.coreDefs` の各定義とユーザーライブラリの各エントリを、`d.name`・`d.base.uarch`・`d.base.sourceChip`・`d.base.isa` を連結した文字列に対して `searchTokens` の全語が含まれるものだけ表示する(検索語が空なら全件)。箱が閉じていても要約の `・一致 M 件` で分かる。プルダウン(命令セット・メーカー・種類)はこの 2 つの箱には適用しない。

**フォーカスと位置の復帰**(R7): `renderLibrary` の先頭(`clear(el)` の前)で、`document.activeElement` が `el` の内側にあり `id` を持つなら、その `id` を覚える。組み立て後に、同じ `id` の要素があれば `focus()`。無ければ(追加後に行が消えた・並びが変わった等)何もしない。`#parts` のスクロール位置は、同じフレームで作り直すため保たれる([I]。ブラウザで確認すること)。`document`・`el.querySelector` が無い環境(テストの DOM スタブ)では、この処理を何もせず通る(`typeof document === 'undefined'`・`document.activeElement` が falsy・`el.querySelector` の戻りが null のどれでも例外にしない)。

### 4.3 `js/ui/dom.js`

**`more(summary, opts, ...kids)`** (R2) — `<details class="more">` を返す。
- `summary`: 要約の文字列(`<summary>` の `text`)。
- `opts`: `{ key?: string, open?: boolean, cls?: string }`。`key` を渡すと、**開閉状態を画面の再描画をまたいで保つ**(モジュール内の `Set` に開いているキーを持つ。`toggle` イベントで追加/削除。生成時に `key` が Set にあれば `open`)。`key` が無ければ `open` の指定(既定 false)だけ。`cls` は追加のクラス。
- `kids`: 中身(`h()` の子と同じ。文字列・Node・配列・null)。子がすべて null/空なら **`null` を返す**(呼び出し側は `h()` の子に渡すだけでよい)。
- `h('details', …)` で作る(`open` は `h()` が `setAttribute('open','')` する。DOM スタブでも動く)。`innerHTML`・`classList` は使わない。
- 追加で公開: `moreReset()`(開閉状態の全消去。テスト用)。

### 4.4 `index.html` / `js/main.js` の左欄タブと `/` ショートカット(R5, R7)

`index.html` の `<aside id="parts">` の先頭に、`#library` の前、次を足す(`partslist` は S1 で削除済み):
- `div#parts-tabs.tabs`(`role="tablist"`、`aria-label="左欄の表示"`、`hidden`)。中に 2 つの `button.tab`(`type="button"`、`role="tab"`)。`#tab-library`(`aria-controls="library"`、表示「部品ライブラリ」)、`#tab-mix`(`aria-controls="mixpanel"`、表示「混合設計(N)」。N は `MF.blockGroups(design).length`)。
- `#library` と `#mixpanel` に `role="tabpanel"` と `aria-labelledby`(`tab-library` / `tab-mix`)を付ける。

`main.js`:
- 変数 `leftTab`(`'library' | 'mix'`、既定 `'library'`)を足す。**設計を読み込む・新規作成する `loadDesign` で `'library'` に戻す**。`commit`(編集)では戻さない(追加のたびにタブが切り替わらない)。
- `renderMixPanels()`: `#parts-tabs.hidden = !mix`。`#library.hidden = !mix || leftTab !== 'library'`。`#mixpanel.hidden = !mix || leftTab !== 'mix'`。タブの `aria-selected`・`tabindex`(選択中が 0、他が -1)・ラベルの件数を更新。`MP.renderMix` は**非表示のときも**これまでどおり呼ぶ(状態・入力欄の `keepFocusId` の整合のため)。
- タブの操作: クリック。←/→ で隣のタブへフォーカスと選択を移す(Home/End は不要)。
- `document` の `keydown`(現行の 503 行のハンドラ)の**先頭(Ctrl の判定より前)**に追加: `e.key === '/'` かつ Ctrl・Meta・Alt なし、ダイアログが開いていない、`e.target` が `INPUT`/`TEXTAREA`/`SELECT`/`contentEditable` でない、`isMix()` が true のとき: `leftTab = 'library'` にして `renderMixPanels()`(タブが違うときだけ)、`#lib-search` に `focus()` し `select()`、`preventDefault()`。`isMix()` でないときは何もしない(`/` を奪わない)。
- ヘルプ(`index.html` の `#help`)のショートカット一覧に 1 項目を足す: 「/: 部品ライブラリの検索欄へ移動(混合・新規設計のとき)/ 検索欄で Esc: 検索語を消す・Enter: 先頭の部品へ移動」。

### 4.5 結果・補足の折りたたみ(`results.js` ほか。R2, R3, R9)

**共通ルール(3 層)**
1. **常に見える**: 確度バッジ、値、エラー(✗)、計算できない理由、**設計書が「常時表示」「常に明記」と定めた文**(§3.7.7 の注意帯 1〜5、「再計算しないもの」`PF.NOT_RECOMPUTED`、「混合による性能低下は反映していません」)、MT の「▼ マルチ性能の確度は「低」です…」の 1 文、B の「予測(編集後)」の 1 文。**偏りの向きの警告は常時表示**(reviewer 指摘、2026-11-05): B の「電力制限でこの値に届かない可能性が高い」(`optBand` と `diffpanel` の楽観側の帯)、MT/ST の「in-order コアの仮の IPC を含むため信頼できません」「…数値が歪んでいます」、A の「校正に使った代表 SKU です…検証ではありません」。`results.js` では `always` クラス(`isBanner` が `low-banner` と同じく折りたたみの外に出す)で表し、折りたたみ(前提と注意)の件数にも含めない。
   - 実装メモ: `params.js` のメモリ補足の `key` は `params:mem`(`params:more` は別)、`coreeditor.js` の説明は `ce:intro`(結果欄の補足は `ce:more`)に分けた。
   - 既知の制約: 検索のたびにユーザーライブラリ欄が再生成され、その個数入力は 1 に戻る。通知(トースト)の「×」ボタンは `aria-live` の領域の中にある。
2. **折りたたむ(`more()`)**: 計算の前提・補足・用語の説明・既に別の場所で言っていること。要約には**件数と ⚠ を入れる**(例: 「⚠ 前提と注意(3 件)」)。
3. **ヘルプへ**: 操作の説明(「入力後に Enter か Tab で確定します」など)。

**赤の使いどころ**(R9): 赤(`--ng`)は、①エラー・計算不能・入力エラー(✗)、②確度バッジ `.conf-low`(意味のある段階表示として残す)、③`.low-banner` は「▼ マルチ性能の確度は「低」です…」と「予測(編集後)…」と差分パネルの「確度が低い予測です」の 3 種だけ。それ以外の ⚠ の注意は黄(下の `.alertbox` または既存の `.caution`)に統一する。

**`results.js` の具体的な変更**

| 場所 | 現状 | 変更後 |
|---|---|---|
| `renderMixResults` の冒頭(152〜157 行) | 黄の説明 1 つ + 赤帯 2 つ + 自作コアの注意帯(最大 5 つの赤帯) | **1 つの `div.alertbox`**(`role="note"`)の中に `ul.alertlist`: ① 「⚠ 混合による性能低下は反映していません(今回の評価は CPU ベンチのみ)」 ② 「⚠ 混合設計は校正した範囲の外です(確度は常に低)」(**この 2 文の文言は現状のまま**)、③ 自作コアがあるとき `customBands` の各項目(`⚠`/`ⓘ` の記号と文は現状のまま。`level:'info'` の項目も同じリストに入れる)。旧い黄の説明文(「混合設計の概算です。性能は部品のコア構成から予測した値で…」)は `more('この画面の見方', {key:'res:mixhelp'})` に入れ、`alertbox` の直後に置く |
| `mixPerfCard` | 値、「公開値はありません」、`MIX_PERF_PREMISE`、`extra` を全部並べる | 値・理由(計算できないとき)・`low-banner`(MT の 1 文)はそのまま。`note` と `extra` のうち `low-banner` でないものを `more('⚠ 前提と注意(N 件)', {key:'res:st'}または{key:'res:mt'})` に入れる。N は入れた項目数 |
| `mixAreaCard` | 注意の `note` が最大 8 個 | 値・使用率の行・面積の出所バッジ行・「ブロックごとの面積」の `details`(現行)は残す。注意の `note` 群(移植・推定・導出・未取得・模式図)を `more('⚠ 面積の注意(N 件)', {key:'res:area'})` に入れる。**模式図の 2 つの注意(137・138 行)は 1 つにする**: 「ブロックの大きさと配置は模式図です。実チップのフロアプランではありません。歩留まりは算出しません。」を残し、`SCHEMATIC_NOTE`(「面積は部品の値で、ブロックの大きさを変えても面積は変わりません」を含む)は `mixpanel.js:69` に残す(面積カードからは外す) |
| `powerModelBlock`・`thermalCard` | 赤帯(`low-banner`)で `POWER_MODEL_NOTE`・`COOLING_NOTE…` | クラスを `caution`(黄)に変える。文言は変えない |
| `optBand` | 赤帯 | クラスを `caution` に変える |
| `perfCard`(A/B) | 値・公開値・差・注記(校正 SKU・L3・メモリ…)を並べる | 値・公開値・差(`row`)・計算できない理由はそのまま。`warn-note` 系の `note` と `extra` のうち `low-banner` でないものを `more('⚠ 前提と注意(N 件)', {key:'res:st'/'res:mt'})` に。**編集後の 2 つの `note`(29 行の「編集後の数値は予測で、公開値ではありません。公開値との差は出しません。」)は削除**(189 行の赤帯 1 つに集約。`diffpanel.js:66` も削除) |
| `renderResults`(188 行の `caution`) | 長い説明 | `more('この画面の見方', {key:'res:help'})` に入れる |
| `.conf-card-low` の 6px 赤い左枠(app.css:73) | 混合の全カードと A/B の低確度カードに付く | **ルールを削除**(確度バッジが残るので情報は失われない)。`conf-card-low` のクラス名自体は `results.js` に残してよい(影響なし) |

**他パネル**

| ファイル | 変更 |
|---|---|
| `diffpanel.js` | 66 行の `note` を削除。`MT_ALWAYS_LOW`(39 行)・「元のチップの公開値(参考)」(70 行)・`optimistic` の帯(35〜38 行)を `more('⚠ 注意と前提(N 件)', {key:'diff:more'})` に入れる。`NOT_RECOMPUTED` の `caution`(65 行)は**常時表示のまま**。`low-banner`(24〜32 行)は赤のまま。並びは「見出し → 要約(verdict)→ 赤帯 → パラメータの差 → 結果の差 → NOT_RECOMPUTED → `more`」 |
| `params.js` | 115〜116 行の 2 つの `note` と、`memorySection` の `v.ocNote`・`v.note`・`srcText` を含む行を `more('補足', {key:'params:more'})` に。`理論帯域…` の行とメモリの警告(`warn-note`)は残す |
| `packagepanel.js` | 18 行の `note`(「環境の設定です。再現モード(ロック中)でも変更できます。」)と、冷却の `⚠ COOLING_NOTE`(29 行)を `more('補足', {key:'pkg:more'})` に。温度カードが同じ注意を常に出すため |
| `mixpanel.js` | 36 行(縦横比の入力…未実装)、69〜70 行の 2 つの `note` を `more('補足', {key:'mix:more'})` に。使用率・部品の一覧・ダイ寸法の入力・エラーは残す |
| `coreeditor.js` | 171 行の説明、`L3_NOTE`・`NOT_OUTPUT`(112〜113 行)を `more('補足', {key:'ce:more'})` に。**ダイアログ内のエラー・入力欄の ⚠・「確度・注意」の警告一覧は変えない** |
| `panels.js` `renderValidation` | `WN.decorate` の結果のうち `level==='info'` が **1 件以上**あるとき、`error` と `warn` を従来どおり並べ、`info` は `more('ⓘ 情報 N 件', {key:'val:info'})` の中に並べる(`error`・`warn` が 0 件で `info` だけのときも同じ。「問題は見つかりませんでした。」は `items` が空のときだけ)。見出しの `✗ n / ⚠ n / ⓘ n` は現行のまま。シグネチャ不変 |
| `panels.js` `renderHistory` | 「元に戻す/やり直す」の `btnrow`(48〜50 行)を削除(ツールバーに同じボタンがある)。引数 `onUndo`・`onRedo` は受け取って使わない(呼び出し側 `main.js:97` は変更不要) |
| `panels.js` `renderProps` | 変更なし(未選択時の 1 行のまま) |

### 4.6 `js/ui/layout.js`(新規。UMD。`mixform.js` と同じ書式)

読み込み時に DOM を触らない(`tests/browserload.test.js` が DOM スタブ付きの `vm` で `index.html` の順に読み込むため)。

純関数(Node でテストする):
- `clampPartsWidth(w, viewportW)` → `number`。`w` を `[PARTS_MIN=220, PARTS_MAX=480]` に収め、さらに `viewportW * 0.4` を超えないようにする(`viewportW` が数でなければ上限だけ)。`w` が数でなければ `PARTS_DEFAULT` を返す。整数に丸める。
- `parseStoredWidth(str)` → `number|null`。`localStorage` から読んだ文字列。`/^\d{3}$/` に合い `220〜480` なら数、それ以外は null。
- `stepWidth(w, key, shift, viewportW)` → `number`。`ArrowRight` = +16(`shift` で +48)、`ArrowLeft` = -16(-48)、`Home` = `PARTS_DEFAULT`、それ以外は `w`。結果は `clampPartsWidth` を通す。
- 定数: `PARTS_MIN=220`、`PARTS_MAX=480`、`PARTS_DEFAULT=300`、`LS_PARTS='sds.ui.partsWidth'`。

ブラウザ専用:
- `initLayout({ workarea, resizer, menubar, storage })` → `{ setPartsWidth(w), getPartsWidth(), destroy() }`。
  - 起動時に `storage`(`localStorage`。取得で例外なら null として無視。`viewhost.js` の `store()` と同じ流儀)から幅を読み、あれば `workarea.style.setProperty('--parts-w', `${w}px`)`。無ければ何も設定しない(CSS の段階的な既定幅を使う。§5.2)。
  - `resizer`(`#parts-resizer`)の `pointerdown` で `setPointerCapture`、`pointermove` で `clampPartsWidth(e.clientX - workarea.getBoundingClientRect().left, window.innerWidth)` を設定、`pointerup`/`pointercancel` で保存(`try/catch`。失敗しても無視)。
  - `keydown`(`ArrowLeft`/`ArrowRight`/`Home`)で `stepWidth`。変更のたびに保存し、`aria-valuenow` を更新。`dblclick` で既定へ戻す(保存した値も消す)。
  - `menubar` の高さを `ResizeObserver`(無ければ `window` の `resize`)で追い、`document.documentElement.style.setProperty('--menubar-h', `${h}px`)`(ヘルプとトーストの `top` に使う)。
- `main.js` で `initLayout(...)` を `initView()` の前に 1 回呼ぶ。

### 4.7 `main.js` のそのほかの変更(R11)
- `notify(text, kind)`(30〜34 行): `n.textContent = text` をやめ、`clear(n)` の後に `span`(`text`)と「×」ボタン(`button.btn.small-btn`、`aria-label="通知を閉じる"`、押すと `n.textContent=''`・`n.className=''`・タイマー解除)を入れる。自動で消える条件(`kind !== 'err'` のとき 8 秒)は現行のまま。
- `#m-help` のクリック(501 行): 開くとき `#help` の `top` を `#menubar` の下端に合わせる(`--menubar-h` を CSS で使うので、通常は JS 不要。`initLayout` が未実行でも壊れないよう CSS 側に 44px の既定を置く)。`#help` を開いている間に **Esc** で閉じ、フォーカスを `#m-help` に戻す(`keydown` の先頭、ダイアログ判定の前に追加)。
- 設計変更で `renderMixPanels` が呼ばれるたびに、左欄タブの件数を更新する(§4.4)。

---

## 5. データ構造・スタイル

### 5.1 保存する設定(`localStorage`、任意。失敗しても動作は続ける)

| キー | 値 | 備考 |
|---|---|---|
| `sds.ui.partsWidth` | `"220"`〜`"480"` の整数文字列 | 左欄の幅(px)。設計(JSON・履歴・自動保存)には**含めない**(表示設定。`sds.view.*` と同じ扱い) |

検索語・絞り込み・折りたたみの開閉は**保存しない**(セッション内のモジュール変数のみ。リロードで初期化)。

### 5.2 レイアウト(`css/app.css`)

**列幅は 1 か所に統合**する(旧 50・138・146・173 行の `#workarea` と、172〜176 行の `#parts` 関連を削除して書き直す)。

- `#workarea`: `position: relative`、`display: grid`、`min-height: 0`。
  - `grid-template-columns: min(var(--parts-w, var(--parts-w-def)), 40vw) minmax(240px, 1fr) var(--right-w)`。
  - 段階(`--parts-w-def` と `--right-w`): 幅 1281px 以上 = 300px / 400px。1280px 以下 = 272px / 360px。1000px 以下 = 220px / 320px。
  - 利用者が保存した幅(`--parts-w`)は段階の既定より優先。ただし `40vw` を超えない(狭い窓で中央が潰れない)。
- `#parts-resizer`(`index.html` の `#workarea` の直下の子。グリッドのセルは取らない): `position: absolute`、`top:0`、`bottom:0`、`left: calc(min(var(--parts-w, var(--parts-w-def)), 40vw) - 3px)`、幅 7px、`cursor: col-resize`、`z-index: 5`。中央に 1px の線(`--border`)。`:hover`・`:focus-visible` で `--accent` の 3px 線。`touch-action: none`。属性: `role="separator"`、`aria-orientation="vertical"`、`aria-label="パーツ欄の幅"`、`aria-valuemin="220"`、`aria-valuemax="480"`、`aria-valuenow`(JS が更新)、`tabindex="0"`、`title="ドラッグか ←/→ で幅を変更。ダブルクリックで元に戻す"`。1000px 以下ではそのまま使える(最大は `40vw`)。
- `#parts`: 現行の `overflow:auto`・パディングを維持。**`#parts .partslist` 関連と `@media (max-width:1000px){ #parts{display:none} }` は削除**(実質無効だった)。
- `#bottom`: `height: clamp(150px, 24vh, 240px)`。`grid-template-columns: minmax(200px, 0.9fr) minmax(180px, 0.8fr) 1.6fr`。1000px 以下は `1fr 1fr` と `height: clamp(200px, 30vh, 280px)`。`.propgrid` の `max-width:280px` は維持。
- `#help`: `position: fixed`、`top: var(--menubar-h, 44px)`、`right: 10px`、`width: min(720px, 96vw)`、`max-height: calc(100vh - var(--menubar-h, 44px) - 16px)`、`overflow: auto`、`z-index: 40`、`border: 1px solid var(--border)`、`border-radius: 6px`、`box-shadow: 0 6px 20px rgba(0,0,0,.35)`。`[hidden]` で消える(現行の `#help[hidden]` を維持)。
- `#notice`: `position: fixed`、`top: var(--menubar-h, 44px)`、`left: 50%`、`transform: translateX(-50%)`、`z-index: 60`、`max-width: min(760px, 94vw)`、`display: flex`、`gap: 8px`、`align-items: center`、`border: 1px solid var(--border)`、`border-radius: 6px`、`box-shadow` は `#help` と同じ。`#notice:empty { display: none }`。既存の色(`--ok-bg`・`.err` の `--low-bg`)は維持。`min-height:0`・`padding:0 10px` の旧ルールは削除。
- `.lib-list`・`.mx-parts`: **`max-height` を削除**(入れ子スクロールをやめ、`#parts` の 1 本のスクロールにする。`mx-parts` は混合設計タブの中なので同様)。
- `.lib-sticky`: `position: sticky`、`top: -8px`(`#parts` の上パディング 8px を打ち消す)、`background: var(--panel)`、`z-index: 3`、`padding: 4px 0 2px`、下に `border-bottom: 1px solid var(--border)`。
- `.lib-search`: `display:flex; gap:4px`。`#lib-search` は `flex:1; min-width:0`、`font-size:1em`、パディング `5px 8px`、`border: 1px solid var(--border)`、`background: var(--bg)`、`color: var(--text)`。`:focus-visible` は既存の全体ルール(3px `--focus`)に任せる。
- `.lib-filters`: `display:grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 4px`。`select` は `min-width:0; text-overflow: ellipsis`。「追加できるものだけ」のチェックは全幅(`grid-column: 1 / -1`)。
- `.lib-item`: パディングを `3px 6px`、`margin: 3px 0` に詰める。`.lib-item.blocked`: 文字色 `--muted`、`border-style: dashed`。
- `.tabs`: `display:flex; gap:2px; border-bottom: 1px solid var(--border); margin: -2px 0 6px`。`.tab`: 既存の `.btn` と同じ配色、下枠なし、選択中(`aria-selected="true"`)は背景 `--accent`・文字 `--accent-text`・先頭に「● 」(既存の `.btn[aria-pressed="true"]::before` と同じ流儀。**色だけに頼らない**)。
- `details.more`: `margin: 6px 0`、`border-top: 1px dashed var(--border)`、`padding-top: 3px`。`summary`: `cursor:pointer`、`color: var(--muted)`、`font-size: 0.9em`、`padding: 2px 0`。`details[open] > summary`: `color: var(--text)`。
- `.alertbox`: `border: 1px solid var(--warn)`、`border-left-width: 4px`、`background: var(--warn-bg)`、`border-radius: 4px`、`padding: 4px 8px`、`margin: 6px 0`。`.alertlist`: `list-style:none; margin:0; padding:0`。`li`: `margin: 2px 0`、`font-size: 0.92em`。
- `.low-banner`: 太字をやめる(`font-weight: normal`)。ただし 1 文目の強調が必要なら中の `<b>` で行う(今回は変更しない)。
- `.visually-hidden`: 標準の「視覚的にだけ隠す」(`position:absolute; width:1px; height:1px; overflow:hidden; clip: rect(0 0 0 0); white-space:nowrap`)。
- `.lib-clear`: 24px 角、`border:none`、`background:none`、`color: var(--muted)`、`cursor:pointer`。`[hidden]` で消える。
- 重複した「入力欄の見た目」(`.filters input…`・`.pinput input…`・`.libf input…`・`.coreeditor .pinput input…`・`.mixdialog …`・`.lib-add input`)を、共通のセレクタ 1 つ(`:where(.pinput, .libf, .filters, .mixdialog .pinput, .coreeditor .pinput) :is(input:not([type=checkbox]), select)`)にまとめる。**見た目(font・色・枠・角丸・パディング)は現状と同じ**にする。まとめにくい個別の幅指定(`.lib-add input{width:5em}` など)は残す。**この共通化は S4 の最後に行い、崩れたらやめてよい**(R12 の必須ではない)。

### 5.3 色トークンの追加(`:root`、ライト/ダーク両方。既存の値は変えない)
| 変数 | ライト | ダーク | 用途 | コントラスト(計算値) |
|---|---|---|---|---|
| `--mark-bg` | `#ffe08a` | `#5a4300` | 検索語のハイライト背景 | — |
| `--mark-text` | `#1b1f24` | `#ffe9a8` | 同・文字 | ライト 12.84:1 / ダーク 7.81:1 |

`mark { background: var(--mark-bg); color: var(--mark-text); font-weight: bold; text-decoration: underline; text-decoration-thickness: 1px; border-radius: 2px; padding: 0 1px }`。**色に加えて太字+下線**を付ける(色だけに頼らない)。

---

## 6. 処理フロー

### 6.1 部品を探して追加する(C/D。正常系)
1. 設計を作る/開く → `loadDesign` → `leftTab='library'` → 左欄に「部品ライブラリ」タブが開く。検索欄と件数(「全 280 件・先頭 60 件を表示」)が最上部、その下に絞り込みの 1 行、自作コアの 2 つの折りたたみ(閉)、一覧が見える。
2. `/` を押す(入力欄の外で)→ 検索欄にフォーカス。「zen 5」と打つ → 入力のたびに一覧が絞られ、件数が「15 件が該当(全 280 件)」になり、名前の「Zen」「5」が強調される。
3. Enter → 先頭の部品の「追加」にフォーカス → 個数を変えて Enter/Space で追加 → `cb.onAdd` → `main.js` が `commit` → `renderAll` → `renderLibrary` が作り直される。このとき**検索語・絞り込み・折りたたみの開閉(`more` の `key`)・表示件数は保たれ**、押していたボタンの `id` へフォーカスが戻る。
4. 「混合設計(N)」タブに切り替えると、ダイ寸法・部品の一覧・クロックが見える(従来の `#mixpanel`)。

### 6.2 異常系・境界
- 追加が失敗(`DS.addPart` が拒否): `libMsg` が一覧の直前の `#lib-msg` に赤字(`role=alert`)で出る(これまでは最下部)。
- 検索で 0 件: 一覧は空、件数は「0 件が該当(全 280 件)」、`#lib-empty` に案内と「条件をすべてクリア」(押すと検索語・3 つのプルダウン・「追加できるものだけ」を初期化して `refresh()`、検索欄にフォーカス)。
- 60 件を超える: 件数に「先頭 60 件を表示」、一覧の下に「さらに 60 件表示(残り N 件)」。押すと +60。条件を変えると 60 に戻る。
- 「追加できるものだけ」: `hiddenByAddable` を件数行に表示(隠していることが分かる)。既定は**オフ**。
- 命令セットの違うコアが並ぶ: 該当行は 1 行の短い赤文(§4.2)、行は淡色・破線枠。

### 6.3 左欄の幅
- ドラッグ: `pointermove` ごとに `--parts-w` を更新(ダイビューは `ResizeObserver` で追従)。離したとき保存。
- 保存値が不正・範囲外: `parseStoredWidth` が null → 既定幅。保存の失敗は無視。
- ウィンドウを狭めたとき: `min(…, 40vw)` が効くため、保存した幅が大きくても中央が 240px を割らない(1000px のとき最大 400px、ただし中央の最小 240px を grid が守る)。

---

## 7. エラーハンドリングと境界条件

- `localStorage` が使えない/例外: 幅の保存・復元だけ無効(既定幅で動作)。メッセージは出さない。
- DOM スタブ(`tests/browserload.test.js` の `FakeNode`): `querySelector` は常に null、`classList`・`focus`・`isConnected` は無い。**`library.js`・`dom.js`・`results.js`・`panels.js` の描画経路では、これらを呼ばない(呼ぶときは存在を確認する)**。`document` が未定義・`document.activeElement` が null/未定義でも例外にしない。`h()` が対応する属性(`class`・`text`・`value`・`disabled`・`on…`・その他は `setAttribute`)だけを使う。
- 検索語が極端に長い(10000 文字など): `searchTokens` は先頭 200 文字で打ち切る。語は最大 8 個まで(超えた分は無視)。
- 検索語に正規表現の記号(`( ) [ ] . * +` など): 文字列の部分一致(`includes`)だけを使い、正規表現にしない。
- IME の変換中: `input` イベントごとに絞り込む(現行と同じ)。変換中の未確定文字で一時的に 0 件になるのは許容。
- `parts` が空: 件数「全 0 件」、一覧は空、0 件の案内は出さない(`total === 0` のとき `emptyText` を使わず「部品がありません」とだけ出す)。
- `design` が null: 現行どおり「追加」を `disabled`。検索・絞り込みは動く。
- `MF.preCheck` が error を返す部品を `addableOnly` で除くとき、除外件数を必ず件数行に出す(黙って隠さない)。
- 折りたたみの中にある**エラー・入力の失敗**は出さない設計にしない: `more()` に入れてよいのは §4.5 の表の項目だけ。`aria-invalid` の入力欄・`role="alert"` の文は折りたたまない。
- ヘルプ・トーストの重ね表示がダイアログ(`z-index: 50`)と競合しないこと: `#help` = 40、`#notice` = 60 で、通知がダイアログより前面に出る(エラーの通知を見逃さないため)。ダイアログの `overlay` の背景はトーストを隠さない。
- 幅 1280px 以下: 左 272 / 右 360 → 中央は 1280 - 632 = 648px。1000px: 220 + 320 → 中央 460px。ダイビュー上部のボタン群は既存どおり折り返す。`.cmp-scroll` など既存の横スクロール枠は触らない。

---

## 8. テスト方針

`node --test tests/` を各ステップ(S1〜S5)の後に全件実行する。評価のハッシュ・数値を固定している既存テスト(`floorplan-scale.test.js`、`evaluate.test.js` ほか)がすべて通ること(R13)。

### 8.1 既存テストへの影響(確認済み)
- `tests/browserload.test.js`: `FakeNode` の `textContent` は子を連結する(`<details>` の中身も含む)ため、折りたたみに入れた文も `textContent` に残る。通ること(変更不要)を確認するアサーション: 109〜112 行(`混合設計(予測)`・`混合による性能低下は反映していません`・`混合設計は校正した範囲の外です`・`元 7.43 mm²`・`全コアが最大クロックで動く前提`・`最速として選んだコア`・`うち移植 1 個は換算値`)、149〜151 行(自作コアの注意帯の文言 4 種)、155 行(`複製して編集`・`自作コア(1 件)`・`この定義を元に編集`・`面積の導出`)、442 行(`ユーザーライブラリの自作コア(1 件)`・`設計に追加`・`JSON 取り込み`)、443 行(`設計に追加` ボタンを `findAll` で探して `listeners.click()`)。したがって、**これらの文言と、「設計に追加」ボタンの `textContent === '設計に追加'` を変えてはならない**(§4.2 の「要約の文言は現行のまま」の理由)。
- `tests/mixform.test.js`(16〜28 行): `filterParts` の既存アサーションは通る(§4.1)。
- `tests/paramform.test.js`・`tests/diff.test.js`: `PF.NOT_RECOMPUTED` などの定数は変えない。
- CSS を読むテストは無い(確認済み。`grep` で `app.css` を参照するテストなし)。

### 8.2 追加するテスト(要件 ID ごと)

**`tests/mixform.test.js`(純関数。R7, R6)**
- R7 複数語 AND: `filterParts(parts, {text:'zen 5 9700x'})` が `core:amd-zen5-9700x:P` を含み、`{text:'zen 5'}` の部分集合。語順を入れ替えても同じ集合。
- R7 検索対象の拡張: `{text:'arm'}` の全結果に `isa==='arm'` の部品が含まれ、`kind==='core'` 以外(L3 など)の `isa` が x86 の部品は含まれない。`{text:'amd'}` で `vendor==='AMD'` の部品が出る(出所チップに AMD を含まない部品があればそれも出る)。`{text:'l3'}` で `kind==='l3'` の全件が含まれる。`{text:'コア'}` で `kind==='core'` の全件が含まれる。`nodes` を渡して `{text: <ノード名の一部>}` で該当ノードの部品が出る(例: `D.nodes` の最初のノード名の一部)。`nodes` を渡さないとノード名では出ない(`nodeId` では出る)。
- R7 全角: `{text:'ＺＥＮ　５'}`(全角)が `{text:'zen 5'}` と同じ結果。
- R7 0 件・空: 存在しない語で 0 件、`{text:'   '}`(空白だけ)は全件。
- R7 `highlightSegments`: 連結すると元の文字列に戻る(複数の入力で)。`('Zen 5 コア(AMD)', ['zen','5'])` で `hit:true` の部分文字列が `Zen` と `5`。重なる語(`['zen','en']`)が 1 つにまとまる。空の `tokens`・空文字・大文字小文字の違い。
- R7 `relevanceSort`: 名前に全語が入る部品が先頭側に来る。`tokens` が空なら元の順。元の配列を変更しない。
- R6 `isAddable`・`addBlockReason`: x86 のコアを置いた設計(`DS.fromScratch`+`DS.addPart`)で、Arm のコア部品は `false`・短文(「命令セットが違うため追加不可」を含み 60 字以内)、x86 の部品は `true`・null。空の設計は常に `true`。
- R7 `libCountText`・`emptyText`: 条件なし/あり/60 超/`addableOnly`/0 件の各文字列を完全一致で確認。

**`tests/layout.test.js`(新規。R4)**
- `clampPartsWidth`: 下限・上限・`viewportW * 0.4` の上限・数でない入力(NaN・文字列・undefined → 既定 300)・小数の丸め。
- `parseStoredWidth`: `"300"` → 300、`"219"`・`"481"`・`"abc"`・`""`・null・`"3000"` → null。
- `stepWidth`: ArrowRight +16、Shift で +48、ArrowLeft、Home、上限・下限で止まる、他のキーは変化なし。

**`tests/browserload.test.js`(DOM スタブ。R5〜R7, R14)**
- 登録: モジュール一覧(48 行)に `'layout'` を足す。`index.html` の `<script>` に `js/ui/layout.js` があり、`panels.js` より後・`main.js` より前。
- R5 並び: C の設計で `renderLibrary` した DOM を平らにたどり、`id` が `lib-search` の要素が、`id` が `lib-list` の要素より**前**にあり、ユーザーライブラリの見出し(`ユーザーライブラリの自作コア`)の**前**にあること。`lib-count` が `lib-list` の前にあること。`lib-msg` が `lib-list` の前にあること(`msg` に '理由' を渡したとき、その文が含まれる)。
- R5 折りたたみ: `design.coreDefs` があるとき `tag==='details'` の要素が 2 つあり、いずれも `open` 属性が無い(既定は閉)。
- R7 絞り込み・ハイライト: 検索欄の `listeners.input({ target:{ value:'zen 5' } })` を呼ぶと、一覧(`lib-list` の子)の数が `filterParts` の結果(最大 60)と一致し、`tag==='mark'` の要素が 1 つ以上あり、その `textContent` に `Zen`(大文字小文字は問わない)が含まれる。件数行の `textContent` に `件が該当` が含まれる。
- R7 0 件: `value:'zzzzqqqq'` → 一覧の子が 0、`lib-empty` の `textContent` に `一致する部品はありません` が含まれ、「条件をすべてクリア」のボタンがある。そのボタンの `listeners.click()` で全件に戻る。
- R7 クリア・Esc: クリアボタンの `hidden` は検索語が空のとき属性あり、検索語があるとき無し。検索欄の `listeners.keydown({ key:'Escape', preventDefault(){} })` で `filter.text` が空に戻る(一覧が全件側に戻る)。
- R7 さらに表示: 全件(280)で一覧の子が 60、`lib-more` のボタンの `listeners.click()` で 120。
- R7 状態保持: 1 度目の `renderLibrary` で検索語を入れた後、同じ `parts` で 2 度目の `renderLibrary` を呼ぶと、検索欄の `value` 属性(`attrs.value` または `value`)が保たれ、一覧が絞り込み済み。
- R6 追加不可の短文: x86 の設計に Arm の部品を含む一覧で、`lib-item.blocked` 相当の行に `命令セットが違うため追加不可` があり、旧い長文(`x86 と Arm のコアは同じ設計に混在できません` の全文)は `textContent` に出ない(`title` 属性は `textContent` に含まれないため)。「追加できるものだけ」のチェックを入れる(`listeners.change({ target:{ checked:true } })`)と、その行が消え、件数行に `追加できない` と件数が出る。
- R14 aria: 検索欄に `aria-controls`・`type==='search'`、`lib-count` に `role==='status'`、クリアボタンに `aria-label`、タブは `role==='tab'`(`main.js` はスタブで読み込めないため、タブの属性は `index.html` の文字列検査で確認: `role="tablist"`・`role="tab"`・`aria-controls`、`#parts-resizer` の `role="separator"` と `aria-valuemin`・`aria-valuemax`・`tabindex="0"`)。
- 例外にならないこと: 既存の 114・154 行の呼び出し(`env` なし・`cb` が最小)が通る。`document.activeElement` が無いスタブで通る。

**`tests/ui-cleanup.test.js`(新規。R2, R3, R9, R10)**
- R2 `more()`: `summary` を子に持つ `details` を返す。`key` つきで `open` を設定したあと同じ `key` で作り直すと `open` 属性が付く(再描画で保たれる)。`moreReset()` 後は閉。子がすべて null のとき null。
- R3 重複の解消: B の編集後の設計(`DS.setCoreCount` などで編集)で `renderResults`+`renderDiff` の出力を連結した `textContent` に、`編集後の数値は予測で、公開値ではありません。公開値との差は出しません。` が**含まれない**こと(または含まれても 0 回)。C の面積カードの `textContent` に `ブロックの大きさと配置は模式図です` が 1 回だけ。
- R9 結果パネル(C): `renderResults` の出力で、`class` に `alertbox` を含む要素が 1 つ(自作コアがあるときも 1 つ)で、その中に `混合による性能低下は反映していません`・`混合設計は校正した範囲の外です` が含まれる(自作コアありのとき `customBands` の 5 種の文言も含まれる)。`class` に `low-banner` を含む要素の数が、C の ST/MT/面積/電力/温度の全体で、MT の「▼ マルチ性能の確度は「低」です」の 1 つだけ(自作コアなし・MT が計算できるとき)。`details` の `summary` に `前提と注意` が含まれ、`(N 件)` の N が中身の項目数と一致。
- R9 `NOT_RECOMPUTED` は `details` の外にある(B の差分パネル。`details` の子孫でないこと)。自作コアの注意帯(§3.7.7)5 種は `details` の外。
- R10 検証パネル: `info` だけの警告 3 件 → `details` の中に 3 件、外に 0 件。`error`・`warn`・`info` の混在 → `error`・`warn` は `details` の外、`info` は中。警告 0 件 → 「問題は見つかりませんでした。」。見出しの件数表示 `✗ 0 / ⚠ 1 / ⓘ 3` が現行どおり。`onPick` が `clickable` な項目でまだ呼べる。
- R10 履歴パネル: `renderHistory` の出力に `元に戻す`・`やり直す` のボタンが無く、履歴の項目ボタン(`hist-item`)は従来どおり並び、`onJump` が呼べる。
- R13 評価不変: このテストファイルでは、`evaluate` を呼んだ結果の JSON を、UI の描画関数を呼ぶ前後で比較し一致を確認する(描画が評価を変更しない)。モデル・データのファイルを変更していないことは、実装者が完了報告に「変更したファイルの一覧」で示し、reviewer が確認する(リポジトリは git 管理外のため差分では確認できない)。

### 8.3 目視確認(ブラウザで。実装者が実機で行い、結果を報告に書く)
1280×720 と 1000×700、ライトとダーク(OS の設定 `prefers-color-scheme` を切り替える):
1. C 混合の初期画面で、検索欄・件数・一覧の先頭が最初から見える。左欄が 272px 以上で、文が折り返しすぎない。
2. `/` で検索欄、Esc で消去、Enter で先頭の「追加」。追加後に検索語と押したボタンのフォーカスが残る。
3. ハイライトがダーク/ライトの両方で読める(太字+下線も出ている)。
4. 仕切りのドラッグ・矢印キー・ダブルクリック。リロードで幅が保たれる。`localStorage` を無効にしても動く。
5. ヘルプを開いてもダイビューの高さが変わらない(キャンバスが再描画されない)。トーストも同様。エラーのトーストの「×」で閉じられる。
6. 右の結果カードが短くなり、赤が「確度」「MT の 1 文」「エラー」に絞られている。折りたたみの開閉が、数値を編集しても保たれる。
7. 下段の履歴にボタンが無く、検証の情報行が折りたたまれている。

---

## 9. 未決事項(ユーザーまたは leader の判断が要る点)

| ID | 内容 | 設計上の既定(実装はこの既定で進める) | 理由 |
|---|---|---|---|
| U1 | **折りたたみの既定状態と、折りたたむ範囲** | すべて**閉**。ただし §3.7.7 の注意帯 1〜5・`NOT_RECOMPUTED`・「混合による性能低下は反映していません」・MT の 1 文・エラー・偏りの向きの警告(電力制限で届かない可能性・仮の IPC・クロックの歪み・代表 SKU。reviewer 指摘 2026-11-05)は**折りたたまない**(まとめて 1 つの枠にするだけ)。要約には件数と ⚠ を入れる | プロジェクトは「確度・限界を隠さない」方針(設計書 §3.7.7 は「常時表示。文言固定」)。隠すと誤解を招く判断はユーザーが決めること |
| U2 | **説明文を消してよい範囲** | 削除するのは (a) 「M2 では部品の追加はできません」+箇条書き (b) `diffpanel.js:66` と `results.js:29` の重複文 (c) 面積カードの重複 1 文。「飾り(Uncore・iGPU・NPU)は計算に影響しない」の文は、ヘルプの「できること」へ移す(プロパティパネルの飾りブロックの注記は残る) | (a)〜(c)は同じ内容が他にある/古い。「飾り」の文は A/B の左欄にしか無く、消すと情報が失われる |
| U3 | **左欄のタブ化**(部品ライブラリ / 混合設計) | 採用(§4.4)。入れ子スクロール廃止のため | 一覧と混合設計パネルを同じ縦スクロールに積むと、60 行の下に混合設計が埋もれる。タブ案が不可なら、混合設計パネルを一覧の上に置き、一覧の `max-height` を `55vh` に戻す代替案(その場合 R5 の一覧可視性は弱まる) |
| U4 | **「追加できるものだけ」の既定** | オフ(隠さない)。件数に除外数を出す | 黙って隠すと「ない」と誤解する |
| U5 | **D 新規の一覧の初期絞り込み**(種類=コア) | しない | D でも L3 などを置くことがあるため。要望が出たら `origin.entry==='new'` の初回だけ `filter.kind='core'` にする小変更 |
| U6 | **ユーザーライブラリ欄の既定**(件数が 1 以上でも閉か) | 閉(要約に件数と、検索時は一致件数) | 一覧を最初から見せる要望を優先。使う頻度が高いなら、件数が 1 以上のときだけ開く案も可(`uiState.userOpen` の初期値のみの変更) |
| U7 | **ダイビュー上部 3 段の統合**(C15) | 今回はしない(`js/render/viewhost.js` の DOM 変更が絡み、3D/2D のテストが多い) | スコープ外。やるなら別タスク |
| U8 | **左欄の既定幅 300px**(1280px 以下は 272px) | この値 | 現在 230px。1280px で中央が 648px 残る。広すぎ・狭すぎならユーザーが変更(仕切りで調整可・保存) |
| U9 | **`/` キーの割り当て** | 混合・新規設計のときだけ検索欄へ(入力欄の外のとき) | 現行のショートカットは Ctrl 系と Esc のみで衝突しない。プリセット選択ダイアログは既に検索欄に自動フォーカス |
| U10 | **`docs/設計書.md` §8 への反映** | 今回は編集しない(`grep -c '^`'` = 33 を守るため)。実装後、leader の判断で §8.7・§8.13 に追記 | 指示による |
| U11 | **ブラウザでの目視は未実施**(設計者の環境ではブラウザが使えない) | §8.3 を実装者が実機で行う。[I] とした箇所(合計の高さの見積もり、フォーカス復帰、`#parts` のスクロール位置の保持、sticky の見え方)は実機で確認する | 推定を事実として書かないため |

---

## 10. 表示切替(2026-11-05、ユーザー要望)

要望: 「画面に出ているものが多すぎる。左側以外はいらない。あとで表示できるようにするだけでいい」。

- **ツールバー**(メニューバー内、ヘルプの前)に 3 つのトグルボタン `#t-right`(結果)・`#t-bottom`(下段)・`#t-place`(配置)。`aria-pressed` と `aria-controls`(`right` / `bottom` / `center`)を持つ。Tab で届き、Enter/Space で切り替わる。
- **既定**: 結果=隠す、下段=隠す、配置=表示。定数は `js/ui/layout.js` の `PANEL_DEFAULTS`(1 か所。`place: false` にすると配置も既定で隠す)。左欄 `#parts` は常時表示。
- **保存**: localStorage `sds.ui.panels`(JSON。真偽値だけ採用、壊れていれば既定)。`parsePanels` / `serializePanels` / `togglePanel` / `panelClasses` は純関数(`tests/layout.test.js`)。`initPanelToggles` がブラウザ専用で、ボタンの aria-pressed・パネルの `hidden`・`#app` の `hide-right|bottom|place` クラスを同期する。
- **列・行**: `#workarea` の列は `--center-col` / `--right-col` で決まり、`#app.hide-right` で右列 0px、`#app.hide-place` で中央 0px(右が表示なら右が残りを使う)。下段は `hidden` で行ごと消え、`#workarea`(flex:1)が縦に広がる。1280px・1000px 以下の `--right-w` の段階とは独立(仕切りは `--parts-w` のまま動く)。
- **ダイビュー**: `dieview.js` は `ResizeObserver` で container を監視しており、幅・高さの変化に追従する。配置を再表示したときは、隠している間のサイズ変化に合わせて `view.fit()` を 1 回呼ぶ。
- **バッジ**(隠している間だけ。`warnings.js` の `badgeInfo` / `resultsFlag` / `errorNotice`): 「下段」=検証の `✗ エラー件数 ⚠ 警告件数`(info は数えない。エラーがあれば強い色 `.tbadge.err`)。「結果」=`◆`(結果パネルの「常に見せる」警告: 仮の IPC・クロックの歪み・楽観的な予測がある)。エラー件数が**増えたとき**だけ、下段が隠れていれば `notify(…, 'err')` で「エラーが N 件あります。「下段」で表示できます」を 1 回出す(同数の再描画では出さない)。
- **描画**: 隠したパネルも DOM は残し、`renderAll` は従来どおり描く(再表示で最新。負荷は従来どおり)。
- **ショートカット**: 追加しない(ヘルプに、ボタンの説明を 1 行追記)。
- **評価**: `js/model`・`js/sim`・`data` は変更なし(全 102 プリセットの evaluate ダンプが開始前後で一致)。
