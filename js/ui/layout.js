// 画面の配置(左欄の幅の保存・変更、メニューバーの高さの追跡)。docs/design/ui-cleanup.md §4.6。
// 純関数(幅の丸め・保存値の解釈・キー操作)は Node でテストする。initLayout だけがブラウザ専用(読み込み時には DOM を触らない)。
(function (root) {
  'use strict';

  const PARTS_MIN = 220; const PARTS_MAX = 480; const PARTS_DEFAULT = 300;
  const LS_PARTS = 'sds.ui.partsWidth';

  // 幅を [220, 480] に収め、ウィンドウ幅の 40% を超えないようにする。数でなければ既定。整数に丸める
  function clampPartsWidth(w, viewportW) {
    if (typeof w !== 'number' || !isFinite(w)) return PARTS_DEFAULT;
    let max = PARTS_MAX;
    if (typeof viewportW === 'number' && isFinite(viewportW)) max = Math.min(max, viewportW * 0.4);
    const v = Math.min(Math.max(w, PARTS_MIN), max);
    // 狭いウィンドウでは 40% の上限が下限を割ることがある。そのときは上限を優先する
    return Math.round(v);
  }
  // localStorage から読んだ文字列 → 220〜480 の数。不正なら null
  function parseStoredWidth(str) {
    if (typeof str !== 'string' || !/^\d{3}$/.test(str)) return null;
    const n = Number(str);
    return n >= PARTS_MIN && n <= PARTS_MAX ? n : null;
  }
  // キー操作での幅の変更。←/→ = ∓16(Shift で 48)、Home = 既定、それ以外は変えない
  function stepWidth(w, key, shift, viewportW) {
    let next = w;
    if (key === 'ArrowRight') next = w + (shift ? 48 : 16);
    else if (key === 'ArrowLeft') next = w - (shift ? 48 : 16);
    else if (key === 'Home') next = PARTS_DEFAULT;
    return clampPartsWidth(next, viewportW);
  }

  // ブラウザ専用。{ workarea, resizer, menubar, storage } → { setPartsWidth, getPartsWidth, destroy }
  function initLayout(o) {
    const { workarea, resizer, menubar } = o;
    let storage = null;
    try { storage = o.storage || null; } catch (e) { storage = null; }
    const vw = () => (typeof window !== 'undefined' ? window.innerWidth : undefined);
    let current = null; // null = CSS の段階的な既定幅
    const cleanups = [];
    const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); cleanups.push(() => t.removeEventListener(ev, fn, opt)); };

    function currentPx() {
      if (current != null) return current;
      const r = resizer && resizer.getBoundingClientRect ? resizer.getBoundingClientRect() : null;
      const wr = workarea.getBoundingClientRect();
      return r ? clampPartsWidth(r.left - wr.left + 3, vw()) : PARTS_DEFAULT;
    }
    function apply(w) {
      current = w;
      workarea.style.setProperty('--parts-w', `${w}px`);
      if (resizer) resizer.setAttribute('aria-valuenow', String(w));
    }
    function save() { try { if (storage && current != null) storage.setItem(LS_PARTS, String(current)); } catch (e) { /* 保存できなくても動作は続ける */ } }
    function forget() { try { if (storage) storage.removeItem(LS_PARTS); } catch (e) { /* 無視 */ } }

    // 起動時に保存した幅を戻す
    try {
      const w = storage ? parseStoredWidth(storage.getItem(LS_PARTS)) : null;
      if (w != null) apply(clampPartsWidth(w, vw()));
    } catch (e) { /* 読めなければ既定幅 */ }

    if (resizer) {
      if (current == null) resizer.setAttribute('aria-valuenow', String(currentPx()));
      let dragging = false;
      on(resizer, 'pointerdown', (e) => {
        dragging = true;
        try { resizer.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
        e.preventDefault();
      });
      on(resizer, 'pointermove', (e) => {
        if (!dragging) return;
        apply(clampPartsWidth(e.clientX - workarea.getBoundingClientRect().left, vw()));
      });
      const end = () => { if (dragging) { dragging = false; save(); } };
      on(resizer, 'pointerup', end);
      on(resizer, 'pointercancel', end);
      on(resizer, 'keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home') return;
        e.preventDefault();
        apply(stepWidth(currentPx(), e.key, e.shiftKey, vw()));
        save();
      });
      on(resizer, 'dblclick', () => {
        current = null;
        workarea.style.removeProperty('--parts-w');
        forget();
        resizer.setAttribute('aria-valuenow', String(currentPx()));
      });
    }

    // メニューバーの高さ(ヘルプ・トーストの表示位置に使う)
    let ro = null;
    const setBarH = () => {
      if (!menubar) return;
      const h = Math.round(menubar.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--menubar-h', `${h}px`);
    };
    if (menubar) {
      setBarH();
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(setBarH); ro.observe(menubar); }
      else on(window, 'resize', setBarH);
    }

    return {
      setPartsWidth(w) { apply(clampPartsWidth(w, vw())); save(); },
      getPartsWidth: currentPx,
      destroy() { cleanups.forEach((f) => f()); if (ro) ro.disconnect(); },
    };
  }

  const api = { PARTS_MIN, PARTS_MAX, PARTS_DEFAULT, LS_PARTS, clampPartsWidth, parseStoredWidth, stepWidth, initLayout };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.layout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
