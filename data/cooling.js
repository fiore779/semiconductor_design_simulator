// 冷却プリセット(設計書 §6.2)。
// R_冷却 は「プリセットの TDP と Tj 上限から R = (Tj_max − T_周囲) / TDP で逆算した初期値」。
// ここの数値は**根拠のない仮置き**(s: 'tmp')。実装(M4)でプリセットの公表 TDP から逆算して置き換える。画面に「仮値」と表示し、校正には使わない。
// 単位: rK_W = 熱抵抗 K/W、tAmbC / tjMaxC = ℃。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.cooling = [
  { id: 'passive-phone', name: 'パッシブ(スマホ相当)', rK_W: 10, tAmbC: 25, tjMaxC: 85, s: 'tmp', note: '根拠なしの仮置き(スマホの持続電力が数W 台という報道値に合わせた桁感のみ)' },
  { id: 'thin-laptop', name: '薄型ノート', rK_W: 2.0, tAmbC: 25, tjMaxC: 100, s: 'tmp' },
  { id: 'small-fan', name: '小型ファン', rK_W: 1.2, tAmbC: 25, tjMaxC: 100, s: 'tmp' },
  { id: 'air-tower', name: '空冷タワー', rK_W: 0.35, tAmbC: 25, tjMaxC: 100, s: 'tmp' },
  { id: 'aio-360', name: '360mm 水冷', rK_W: 0.2, tAmbC: 25, tjMaxC: 100, s: 'tmp' },
  // ---- ノート PC の冷却クラス(2026-11-12 追加。ユーザー指示「冷却のプリセットを作って、それでマルチ性能が変わるようにする」)。sustainedW = CPU が MT 持続負荷で保てるパッケージ電力 [W]([実測]。クラスの中央値。範囲は sustainedRangeW)。
  // MT への接続は mobile-pc の連続式だけ: MT 用の W = min(公表電力から決めた W, sustainedW)(js/sim/perf.js)。上の sustainedW を持たない冷却(既存の仮置き 5 件)は MT を制限しない(メーカー想定のまま)。ST・pc・mobile は変えない。
  { id: 'laptop-thin-light', name: 'ノート: 薄型軽量(iGPU・17mm 以下)', rK_W: 2.68, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 28, sustainedRangeW: [15, 35], sustainedS: 'meas', sustainedN: 9, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 17〜50W(Strix Halo の Flow Z13 を除く 9 件の中央値 28W。除かない 10 件は 29W)。PL1 設定の中央値も 28W' },
  { id: 'laptop-standard', name: 'ノート: 標準(iGPU・17mm 超)', rK_W: 1.67, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 45, sustainedRangeW: [35, 60], sustainedS: 'meas', sustainedN: 6, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 24〜75W、中央値 46.5W(6 件)。PL1 設定の中央値 45W を代表に採用' },
  { id: 'laptop-thin-dgpu', name: 'ノート: 薄型 dGPU(21.5mm 以下)', rK_W: 1.15, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 65, sustainedRangeW: [50, 90], sustainedS: 'meas', sustainedN: 9, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 52〜88W、中央値 65W(9 件)。PL1 設定の中央値は 74W' },
  { id: 'laptop-gaming', name: 'ノート: ゲーミング標準(21.5〜28.5mm)', rK_W: 0.6, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 125, sustainedRangeW: [95, 160], sustainedS: 'meas', sustainedN: 7, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 101〜156W、中央値 125W(7 件)' },
  { id: 'laptop-gaming-large', name: 'ノート: 大型ゲーミング(28.5mm 以上または 3kg 以上)', rK_W: 0.52, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 145, sustainedRangeW: [130, 175], sustainedS: 'meas', sustainedN: 6, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 135〜171W、中央値 145W(6 件)。PL1 設定の中央値 144.5W' },
  { id: 'laptop-workstation', name: 'ノート: 厚型ワークステーション', rK_W: 1.14, tAmbC: 25, tjMaxC: 100, s: 'tmp', rkNote: 'R は (Tj 上限 − 周囲) ÷ MT 持続電力 から逆算した仮置き(ダイ・基板の経路を含まない近似。熱モデルの値は推定で確度:低)',
    sustainedW: 66, sustainedRangeW: [60, 90], sustainedS: 'meas', sustainedN: 3, sustainedDate: '2026-11-12', sustainedSrc: 'docs/research/cooling-class-power-2026-11-12.md(Notebookcheck の英語版レビュー 79 本。取得日 2026-11-12)', sustainedNote: '実測 65〜69W、中央値 66W(3 件)。静音・熱を優先する設定で厚みの割に低い' },
];
