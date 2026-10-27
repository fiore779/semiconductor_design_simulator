// ダイビューの onChange を履歴にどうまとめるかの判定(DOM 非依存の純関数)。Node でテストする。
// ドラッグは「coalesce:true が続き、最後に coalesce:false が 1 回」来る。最初の 1 回は新しい手、続きと最後は同じ手にまとめる。
// 矢印キー移動などの単発(coalesce:false)は、ドラッグ中でなければ別の手になる。
(function (root) {
  'use strict';

  // state: { dragRun }(直前の onChange がドラッグの途中だったか)。戻り値: { merge, state }
  function planChange(state, info) {
    const dragRun = !!(state && state.dragRun);
    return { merge: dragRun, state: { dragRun: !!(info && info.coalesce) } };
  }
  const initialState = () => ({ dragRun: false });

  const api = { planChange, initialState };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.commitplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
