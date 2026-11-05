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
  // 隠している「下段」ボタンのバッジ。{ error, warn, text, level('error'|'warn'|'none') }。info は数えない
  function badgeInfo(warnings) {
    const c = counts(Array.isArray(warnings) ? warnings : []);
    const parts = [];
    if (c.error) parts.push(`${SYMBOL.error} ${c.error}`);
    if (c.warn) parts.push(`${SYMBOL.warn} ${c.warn}`);
    return { error: c.error, warn: c.warn, text: parts.join(' '), level: c.error ? 'error' : c.warn ? 'warn' : 'none' };
  }
  // 隠している「結果」ボタンの ◆。結果パネルの「常に見せる」警告(仮の IPC・クロックの歪み・予測が楽観的)があるか
  function resultsFlag(ev) {
    if (!ev || typeof ev !== 'object') return false;
    const st = ev.st || {}; const mt = ev.mt || {};
    return !!(ev.optimistic || (st.ok && st.fallback) || (mt.ok && (mt.fallback || mt.mixedClock)));
  }
  // エラー件数が増えたときだけ、隠している間に一度案内する。戻り値は文言(出さないなら null)
  function errorNotice(prevErrors, nextErrors, bottomHidden) {
    if (!bottomHidden || !(nextErrors > 0) || !(nextErrors > (prevErrors || 0))) return null;
    return `エラーが ${nextErrors} 件あります。「下段」で表示できます`;
  }
  const api = { SYMBOL, decorate, counts, badgeInfo, resultsFlag, errorNotice };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.warnings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
