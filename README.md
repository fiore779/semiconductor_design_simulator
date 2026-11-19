# 半導体設計シミュレーター

CPU/SoC のダイ設計を、ブラウザ上で組み立てて性能・面積・電力・温度の目安を見られるシミュレーターです。HTML + WebGL で動き、すべてローカルで完結します(ネットワーク接続・サーバーは不要)。

## すぐ開く

**[▶ ブラウザで開く(GitHub Pages)](https://fiore779.github.io/semiconductor_design_simulator/)**

- このリポジトリを手元に置いた状態(クローン、または ZIP の展開後)で、**`起動.cmd` をダブルクリック**すると、既定のブラウザで開きます。ほかに、`index.html` をブラウザへドラッグするか、ダブルクリックしても開けます。インストールもビルドも不要です。
- 上のリンクは GitHub Pages(main ブランチの `index.html`)で、インストール不要でそのまま動きます。オフラインで使うときは、次のどちらかを使ってください。
  - [Releases](https://github.com/fiore779/semiconductor_design_simulator/releases/latest) から `semiconductor-design-simulator.html`(1 ファイルだけで動く版)をダウンロードして、ブラウザで開く。
  - Windows なら、同じ Releases の `semiconductor-design-simulator.exe` をダブルクリックする(Node.js 不要。署名がないため、初回に SmartScreen の警告が出ることがあります)。

WebGL が使えるブラウザ(Chrome・Edge・Firefox・Safari の最近の版)が必要です。

表示言語は、メニューバーの「English / 日本語」ボタンで切り替えられます(選んだ言語はブラウザに保存されます。初回はブラウザの言語に従います)。英語は実行時の辞書で訳しており、データの長い備考・出典などは日本語のまま残ります。

## 4 つの始め方

- **A 再現**: 実在チップ(プリセット 166 件)を読み込み、公開されているベンチマーク値(Geekbench 7)と比べて、再現度を確認します。
- **B 改良**: プリセットのコア数・クロック・L3・メモリ構成などを編集し、変えたときの結果の差を見ます。
- **C 混合**: 部品ライブラリから実在チップのコアやキャッシュを選び、空のダイに置いて組み合わせます。
- **D 新規**: プロセスとダイ寸法を決めて空のダイを作り、既存コアを複製して編集した自作コアを置きます。

## 注意

- 結果は目安の推定です。根拠と限界は設計書([docs/設計書.md](docs/設計書.md))と調査メモ([docs/research/](docs/research/))にあります。
- すべての値に [実測]・[公表]・[二次]・[推定] の区分と出典を付けています。推測で値は入れません。

## 開発者向け

- 配布物(単一 HTML と exe)の作成: `node tools/build-exe.js`(または `tools\build-all.cmd`)。Node.js と、Windows 標準の `csc.exe` が必要です。出力は `dist/` です。
- テスト: `node --test tests/`
- データの検証: `node tools/validate-data.js`

作者: fiore779
