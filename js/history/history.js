// 元に戻す/やり直し(設計書 §9)。状態は design 全体のスナップショット(JSON 複製)。UI 非依存。
// 各エントリ = 1 回の編集 { label, before, after }。pos は「適用済みの手の数」(0 なら最初の状態)。
(function (root) {
  'use strict';

  const snap = (d) => JSON.parse(JSON.stringify(d));

  function createHistory(opts) {
    const limit = (opts && opts.limit) || 200;
    let items = []; // { label, before, after }
    let pos = 0;
    let lastAt = 0; // 最後の push の時刻(windowMs 用)
    const windowMs = (opts && opts.windowMs) || Infinity; // coalesce する最大間隔(任意。main.js では未使用=時間の窓なし。まとめるかどうかは呼び出し側の commitplan が決める)
    const now = (opts && opts.now) || Date.now;

    // coalesce=true で、直前の手(最新の適用済みの手)と label が同じなら、その手の after だけ更新して 1 手にまとめる。
    function push(before, after, label, o) {
      const lab = label || '編集';
      const t = now();
      const atEnd = pos === items.length; // 取り消した後の最初の編集は、前の手にまとめない
      if (!atEnd) items.length = pos; // 取り消した先の枝を捨てる(確認は UI 側)
      const last = items[pos - 1];
      if (atEnd && o && o.coalesce && last && last.label === lab && t - lastAt <= windowMs) { last.after = snap(after); lastAt = t; return; }
      lastAt = t;
      items.push({ label: lab, before: snap(before), after: snap(after) });
      if (items.length > limit) items.shift(); // 古い方から捨てる
      pos = items.length;
    }
    // 戻り値は戻した先の design(複製)。戻せないときは null。
    function undo() { if (pos <= 0) return null; pos--; return snap(items[pos].before); }
    function redo() { if (pos >= items.length) return null; const d = snap(items[pos].after); pos++; return d; }
    const canUndo = () => pos > 0;
    const canRedo = () => pos < items.length;
    // 一覧: index 0 = 最初の状態、i>=1 は i 番目の手を適用した状態。current は現在位置のもの。
    function list() {
      const out = [{ index: 0, label: '最初の状態', current: pos === 0 }];
      items.forEach((it, i) => out.push({ index: i + 1, label: it.label, current: pos === i + 1 }));
      return out;
    }
    // index の状態へ移動して、その時点の design(複製)を返す。範囲外は null。
    function jumpTo(index) {
      if (!Number.isInteger(index) || index < 0 || index > items.length) return null;
      pos = index;
      return index === 0 ? (items.length ? snap(items[0].before) : null) : snap(items[index - 1].after);
    }
    // 現在位置から先(やり直せる手)があるか。jumpTo 後に push すると捨てられるので UI が確認に使う。
    const futureCount = () => items.length - pos;
    function clear() { items = []; pos = 0; lastAt = 0; }

    return { push, undo, redo, canUndo, canRedo, list, jumpTo, clear, futureCount };
  }

  const api = { createHistory };
  root.SDS = root.SDS || {}; root.SDS.history = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
