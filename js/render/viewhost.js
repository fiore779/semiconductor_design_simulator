// ダイビュー領域の 3D 表示 / 2D 編集の切替(設計書 §8.1)。dieview(2D)と pkgview3d(3D)のどちらか一方だけを生き物として保持し、
// 切替時に作り直して、設計・選択・表示モード・色分け・ヒートマップの状態を引き継ぐ(履歴・自動保存には関与しない)。
// 公開 API は dieview と同じ(setDesign / setSelection / setViewMode / setColorMode / setHeatmap / fit / captureCanvas / destroy)に、
// setDimension / getDimension を足したもの。既定は 3D。表示設定(3D/2D・蓋の表示・3D のラベル表示)は localStorage に任意で保存する(失敗しても無視)。
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  const LS_DIM = 'sds.view.dimension';
  const LS_IHS = 'sds.view.ihs';
  const LS_LABELS = 'sds.view.labels'; // '1' 表示(既定)/ '0' 非表示
  const BAR_H = 36;
  const IHS_LABELS = { solid: '表示', glass: '半透明', off: '非表示' };
  const HINT_3D = 'ドラッグ=回転 / ホイール=拡大縮小 / 右ドラッグ・Shift+ドラッグ=移動 / 矢印キー=回転、+ −=拡大縮小';
  const HINT_2D = 'ブロックのドラッグ=移動、ハンドル=サイズ変更(編集はこの 2D 表示で)';

  function createViewHost(container, handlers, opts) {
    const H = handlers || {};
    const O = opts || {};
    const doc = container.ownerDocument || document;
    const win = doc.defaultView || window;
    const f2 = (O.factories && O.factories.createDieView) || (root.SDS && root.SDS.render && root.SDS.render.createDieView) || (isNode ? require('./dieview.js').createDieView : null);
    const f3 = (O.factories && O.factories.createPackageView3D) || (root.SDS && root.SDS.render && root.SDS.render.createPackageView3D) || (isNode ? require('./pkgview3d.js').createPackageView3D : null);

    // ---- 保存(任意。使えなくても動く)----
    function store() { try { return O.storage !== undefined ? O.storage : win.localStorage; } catch (e) { return null; } }
    function load(key, allowed, dflt) {
      try { const s = store(); const v = s && s.getItem(key); return allowed.indexOf(v) >= 0 ? v : dflt; } catch (e) { return dflt; }
    }
    function save(key, v) { try { const s = store(); if (s) s.setItem(key, v); } catch (e) { /* 無視 */ } }

    // ---- 状態(切替で引き継ぐもの)----
    let dim = load(LS_DIM, ['3d', '2d'], '3d');
    let ihsMode = load(LS_IHS, ['solid', 'glass', 'off'], 'glass');
    let labelsOn = load(LS_LABELS, ['1', '0'], '1') === '1';
    let design = { dies: [] }; let selection = []; let viewMode = 'place'; let colorMode = 'kind'; let heat = null;
    let cur = null; let destroyed = false;

    // ---- DOM: 上に操作バー、下にビュー ----
    const bar = doc.createElement('div');
    bar.className = 'vh-bar';
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'ダイビューの表示方式とカメラ');
    const stage = doc.createElement('div');
    stage.className = 'vh-stage';
    const set = (el, o) => { Object.keys(o).forEach((k) => { el.style[k] = o[k]; }); };
    if (win.getComputedStyle(container).position === 'static') container.style.position = 'relative';
    set(bar, { position: 'absolute', left: '0', top: '0', right: '0', display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'center', boxSizing: 'border-box', padding: '3px 8px', minHeight: BAR_H + 'px' });
    set(stage, { position: 'absolute', left: '0', right: '0', top: BAR_H + 'px', bottom: '0' });

    function mk(tag, text, props) {
      const el = doc.createElement(tag);
      if (text) el.textContent = text;
      Object.keys(props || {}).forEach((k) => { if (k === 'class') el.className = props[k]; else el.setAttribute(k, props[k]); });
      return el;
    }
    const btn3 = mk('button', '3D 表示', { type: 'button', class: 'btn vh-dim', 'data-dim': '3d' });
    const btn2 = mk('button', '2D 編集', { type: 'button', class: 'btn vh-dim', 'data-dim': '2d' });
    const dimGroup = mk('span', '', { role: 'group', 'aria-label': '3D 表示 / 2D 編集の切替' });
    set(dimGroup, { display: 'inline-flex', gap: '4px', flex: '0 0 auto' });
    dimGroup.appendChild(btn3); dimGroup.appendChild(btn2);
    const camGroup = mk('span', '', { role: 'group', 'aria-label': 'カメラ' });
    set(camGroup, { display: 'inline-flex', gap: '4px', alignItems: 'center', flex: '0 0 auto' });
    const camBtns = [['上から', 'top'], ['斜め', 'oblique'], ['横から', 'side'], ['リセット', 'reset']].map((p) => {
      const b = mk('button', p[0], { type: 'button', class: 'btn vh-cam', 'data-cam': p[1] });
      b.addEventListener('click', () => { if (cur && cur.setCameraPreset) cur.setCameraPreset(p[1]); });
      camGroup.appendChild(b);
      return b;
    });
    const ihsSel = mk('select', '', { class: 'vh-ihs', id: 'vh-ihs', 'aria-label': 'ヒートスプレッダ(金属の蓋)の表示' });
    ['solid', 'glass', 'off'].forEach((k) => { const o = mk('option', IHS_LABELS[k], { value: k }); ihsSel.appendChild(o); });
    ihsSel.value = ihsMode;
    const ihsLabel = mk('label', '蓋: ', { class: 'small', for: 'vh-ihs' });
    set(ihsLabel, { whiteSpace: 'nowrap' });
    ihsLabel.appendChild(ihsSel);
    camGroup.appendChild(ihsLabel);
    // ラベル(ブロック名・ダイ名・寸法)の表示切替。切ると物だけが見える
    const lblChk = mk('input', '', { type: 'checkbox', id: 'vh-labels', class: 'vh-labels', 'aria-label': 'ラベル(ブロック名・ダイ名・寸法)を表示' });
    lblChk.checked = labelsOn;
    const lblLabel = mk('label', 'ラベル ', { class: 'small', for: 'vh-labels' });
    set(lblLabel, { whiteSpace: 'nowrap' });
    lblLabel.appendChild(lblChk);
    camGroup.appendChild(lblLabel);
    const hint = mk('span', '', { class: 'small vh-hint' });
    set(hint, { minWidth: '0' });
    const status = mk('span', '', { class: 'small vh-status', role: 'status' });
    set(status, { whiteSpace: 'nowrap', flex: '0 0 auto' });
    bar.appendChild(dimGroup); bar.appendChild(camGroup); bar.appendChild(hint); bar.appendChild(status);
    container.appendChild(bar); container.appendChild(stage);

    // バーは狭いと折り返して高くなる。ビュー領域の上端を実際の高さに合わせる
    function layout() { const h = Math.max(BAR_H, Math.ceil(bar.offsetHeight || 0)); stage.style.top = h + 'px'; }
    let barRo = null; let onWinResize = null;
    if (typeof win.ResizeObserver === 'function') { barRo = new win.ResizeObserver(layout); barRo.observe(bar); }
    else if (win.addEventListener) { onWinResize = layout; win.addEventListener('resize', onWinResize); }
    function syncBar() {
      btn3.setAttribute('aria-pressed', dim === '3d' ? 'true' : 'false');
      btn2.setAttribute('aria-pressed', dim === '2d' ? 'true' : 'false');
      camGroup.style.display = dim === '3d' ? 'inline-flex' : 'none';
      hint.textContent = dim === '3d' ? HINT_3D : HINT_2D;
      ihsSel.value = ihsMode; lblChk.checked = labelsOn; layout();
    }

    // ---- ビューの作成と状態の引き継ぎ ----
    const wrapped = {
      onSelect(ids) { selection = (ids || []).slice(); if (H.onSelect) H.onSelect(ids); },
      onChange(next, info) { if (next && next.dies) design = next; if (H.onChange) H.onChange(next, info); },
    };
    function destroyCur() { if (cur) { try { cur.destroy(); } catch (e) { /* 無視 */ } cur = null; } stage.textContent = ''; }
    // d のビューを作る。作れたら true(状態を引き継ぐ)。作れなければ false(エラー文は stage に出ている)。
    function mount(d) {
      destroyCur();
      const factory = d === '3d' ? f3 : f2;
      let v = null;
      try { v = factory ? factory(stage, wrapped) : null; } catch (e) { v = null; }
      if (!v || v.available === false) { if (v && v.destroy) { try { v.destroy(); } catch (e) { /* 無視 */ } } return false; }
      cur = v;
      if (d === '3d' && v.setIhsMode) v.setIhsMode(ihsMode);
      if (d === '3d' && v.setLabels) v.setLabels(labelsOn);
      v.setDesign(design); v.setColorMode(colorMode); v.setSelection(selection); v.setViewMode(viewMode); v.setHeatmap(heat);
      return true;
    }

    let ok = mount(dim);
    status.textContent = '';
    if (!ok && dim === '3d') { // 3D が作れなければ 2D に切り替える(同じ WebGL 不可なら 2D も失敗してエラー文が出る)
      ok = mount('2d');
      if (ok) { dim = '2d'; status.textContent = '3D 表示を開始できなかったため 2D 表示です'; }
    }
    if (!ok) { // WebGL が使えない: 現行と同じ文言(各ビューが stage に書いた)を残し、バーは隠す
      const msg = stage.textContent;
      container.textContent = '';
      const p = doc.createElement('p');
      p.className = 'dieview-error'; p.setAttribute('role', 'alert'); p.textContent = msg;
      container.appendChild(p);
      return { available: false, setDesign() {}, setSelection() {}, setViewMode() {}, setColorMode() {}, setHeatmap() {}, fit() {}, captureCanvas() { return null; }, destroy() {}, setDimension() { return false; }, getDimension() { return dim; } };
    }
    syncBar();

    function setDimension(d) {
      if (destroyed || (d !== '3d' && d !== '2d') || d === dim) return d === dim;
      const prev = dim;
      if (mount(d)) { dim = d; save(LS_DIM, d); status.textContent = ''; }
      else { mount(prev); status.textContent = `${d === '3d' ? '3D' : '2D'} 表示に切り替えられませんでした`; }
      syncBar();
      return dim === d;
    }
    btn3.addEventListener('click', () => setDimension('3d'));
    btn2.addEventListener('click', () => setDimension('2d'));
    ihsSel.addEventListener('change', (e) => {
      const v = (e && e.target && e.target.value) || ihsSel.value;
      if (['solid', 'glass', 'off'].indexOf(v) < 0) return;
      ihsMode = v; save(LS_IHS, v);
      if (cur && cur.setIhsMode) cur.setIhsMode(v);
    });

    lblChk.addEventListener('change', (e) => {
      const on = e && e.target && typeof e.target.checked === 'boolean' ? e.target.checked : lblChk.checked;
      labelsOn = !!on; save(LS_LABELS, labelsOn ? '1' : '0');
      if (cur && cur.setLabels) cur.setLabels(labelsOn);
    });

    return {
      available: true,
      setDesign(d) { design = d && d.dies ? d : { dies: [] }; if (cur) cur.setDesign(design); },
      setSelection(ids) { selection = (ids || []).slice(); if (cur) cur.setSelection(selection); },
      setViewMode(m) { viewMode = (m === 'power' || m === 'temp') ? m : 'place'; if (cur) cur.setViewMode(viewMode); },
      setColorMode(m) { colorMode = m === 'origin' ? 'origin' : 'kind'; if (cur) cur.setColorMode(colorMode); },
      setHeatmap(data) { heat = data || null; if (cur) cur.setHeatmap(heat); },
      fit() { if (cur) cur.fit(); },
      captureCanvas(w) { return cur && cur.captureCanvas ? cur.captureCanvas(w) : null; },
      setDimension, getDimension() { return dim; },
      setLabels(on) { labelsOn = on !== false; lblChk.checked = labelsOn; save(LS_LABELS, labelsOn ? '1' : '0'); if (cur && cur.setLabels) cur.setLabels(labelsOn); },
      getLabels() { return labelsOn; },
      destroy() {
        if (destroyed) return;
        destroyed = true; destroyCur();
        if (barRo) barRo.disconnect();
        if (onWinResize && win.removeEventListener) win.removeEventListener('resize', onWinResize);
        if (bar.parentNode) bar.parentNode.removeChild(bar);
        if (stage.parentNode) stage.parentNode.removeChild(stage);
      },
    };
  }

  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.createViewHost = createViewHost;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createViewHost };
})(typeof window !== 'undefined' ? window : globalThis);
