// 検証パネル用の純粋ロジック(設計書 §8.12)。警告の並べ替えと記号付け。DOM に依存しない。
(function (root) {
  'use strict';
  const SYMBOL = { error: '✗', warn: '⚠', info: 'ⓘ' };
  const NAME = { error: 'エラー', warn: '警告', info: '情報' };
  const ORDER = { error: 0, warn: 1, info: 2 };
  // level は 'error'|'warn'|'info'。不明な値は info 扱い。記号+名前を必ず付ける(色に頼らない)。
  function decorate(warnings) {
    return warnings.map((w) => {
      const level = SYMBOL[w.level] ? w.level : 'info';
      return Object.assign({}, w, { level, symbol: SYMBOL[level], levelName: NAME[level], label: `${SYMBOL[level]} ${NAME[level]}: ${w.text}`, clickable: !!w.blockId });
    }).sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  }
  function counts(warnings) {
    const c = { error: 0, warn: 0, info: 0 };
    warnings.forEach((w) => { c[SYMBOL[w.level] ? w.level : 'info']++; });
    return c;
  }
  const api = { SYMBOL, decorate, counts };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.warnings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
