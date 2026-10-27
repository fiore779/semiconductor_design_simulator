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
];
