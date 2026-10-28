// ヒートマップ用カラーマップ(純関数)。虹色は使わず、明度(輝度)が t に対して単調増加するもの。
// 電力密度: 暗い紫 → 赤紫 → 橙 → 黄 → 白 / 温度: 暗い青 → 青 → 赤 → 橙 → 黄 → 白。
// 区間ごとの RGB 線形補間で、輝度は RGB の線形和なので、各停止点の輝度が増加していれば全体で単調増加になる。
(function (root) {
  'use strict';

  const STOPS = {
    power: [
      [0.0, [0.10, 0.04, 0.25]], [0.35, [0.60, 0.10, 0.30]], [0.65, [0.95, 0.50, 0.10]],
      [0.85, [1.00, 0.92, 0.35]], [1.0, [1.00, 1.00, 1.00]],
    ],
    temp: [
      [0.0, [0.03, 0.06, 0.30]], [0.2, [0.15, 0.15, 0.55]], [0.4, [0.80, 0.10, 0.10]],
      [0.65, [0.95, 0.45, 0.05]], [0.85, [1.00, 0.90, 0.30]], [1.0, [1.00, 1.00, 1.00]],
    ],
  };
  const NEUTRAL = [0.5, 0.5, 0.5]; // NaN 用の中立色(灰)

  // t(0〜1、範囲外はクランプ)→ [r,g,b](0〜1)。kind は 'power' | 'temp'(それ以外は power)。NaN は中立色。
  function colorAt(t, kind) {
    if (typeof t !== 'number' || t !== t) return NEUTRAL.slice();
    const s = STOPS[kind] || STOPS.power;
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    for (let i = 1; i < s.length; i++) {
      if (x <= s[i][0]) {
        const a = s[i - 1]; const b = s[i];
        const f = (x - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return s[s.length - 1][1].slice();
  }

  // 相対輝度(線形和。単調性の確認・文字色の判断用)
  const luminance = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  // n 段の LUT(Uint8Array n*4、RGBA、A=255)。
  function buildLut(kind, n) {
    const m = n === undefined ? 256 : Math.max(2, Math.floor(n));
    const out = new Uint8Array(m * 4);
    for (let i = 0; i < m; i++) {
      const c = colorAt(i / (m - 1), kind);
      out[i * 4] = Math.round(c[0] * 255); out[i * 4 + 1] = Math.round(c[1] * 255); out[i * 4 + 2] = Math.round(c[2] * 255); out[i * 4 + 3] = 255;
    }
    return out;
  }

  const api = { colorAt, buildLut, luminance };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.colormap = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
