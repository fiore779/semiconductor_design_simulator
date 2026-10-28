// 出所(元のチップ)ごとの色割り当て(設計書 §3.3 C / §8.13)。DOM に依存しない純関数。
(function (root) {
  'use strict';

  const MAX_DISTINCT = 16;

  function hslToRgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)];
  }

  // keys を文字列としてソートし、色相を等間隔(360/n)に分け、偶数番目/奇数番目で明度・彩度を変える。
  // 同じキー集合なら常に同じ色。MAX_DISTINCT(16)件までは見分けやすい。超えた分は色相が近づく/循環するため、
  // 色だけでは区別できない: ダイビューではラベルの略称(shortName)で区別する。
  // 返す色は [r,g,b](0..1)。dark では全体を少し明るくする。
  function originColors(keys, scheme) {
    const uniq = Array.from(new Set((keys || []).map(String))).sort();
    const n = uniq.length;
    const dark = scheme === 'dark';
    const out = {};
    uniq.forEach((k, i) => {
      // 隣り合う色相を直接並べないため、色相の割り当て順を 1 つ飛ばしにせず、明度・彩度の交互で補う
      const hue = (i * 360 / Math.max(n, 1)) % 360;
      const odd = i % 2 === 1;
      const l = (odd ? 0.62 : 0.40) + (dark ? 0.08 : 0);
      const s = odd ? 0.70 : 0.85;
      out[k] = hslToRgb(hue, s, l);
    });
    return out;
  }

  // 出所の略称。最後の英数字トークン。それが「Ultra」等の短い修飾語でなく、直前が数字だけ(例 "8 Elite")のときは最後の 2 トークン。
  // 例: Ryzen 7 9700X → 9700X / Core Ultra 7 265K → 265K / Snapdragon 8 Elite → 8 Elite。空なら '?'。
  function shortName(name) {
    const toks = String(name === undefined || name === null ? '' : name).split(/[\s　]+/).filter((t) => /[A-Za-z0-9]/.test(t));
    if (!toks.length) return '?';
    const last = toks[toks.length - 1];
    if (toks.length >= 2 && !/\d/.test(last) && /^\d{1,2}$/.test(toks[toks.length - 2])) return toks[toks.length - 2] + ' ' + last;
    return last;
  }

  const api = { originColors, shortName, MAX_DISTINCT };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.palette = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
