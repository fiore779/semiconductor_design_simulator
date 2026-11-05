// DOM 生成の小さな補助(外部ライブラリなし)。ブラウザ専用。
(function (root) {
  'use strict';

  // h('div', { class: 'a', onclick: fn, 'aria-label': 'x', dataset: {k:'v'} }, 子...) 。子は文字列・Node・配列・null。
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => {
      const v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach((d) => { el.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // 数値の整形(null は「未取得」)
  function num(v, digits, unit) {
    if (v == null || !isFinite(v)) return '未取得';
    return v.toFixed(digits == null ? 0 : digits) + (unit ? ' ' + unit : '');
  }
  // 差(%)。色だけに頼らず ▲▼ と符号を付ける
  function diff(p) {
    if (p == null) return '—';
    const s = (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
    return (Math.abs(p) < 0.05 ? '＝ ' : p > 0 ? '▲ ' : '▼ ') + s;
  }

  // 折りたたみ(<details class="more">)。key を渡すと、開閉状態を再描画をまたいで保つ。中身がすべて空なら null を返す
  const openKeys = new Set();
  const hasContent = (c) => (Array.isArray(c) ? c.some(hasContent) : !(c == null || c === false || c === ''));
  function more(summary, opts, ...kids) {
    const o = opts || {};
    if (!kids.some(hasContent)) return null;
    const isOpen = o.key ? openKeys.has(o.key) : !!o.open;
    const props = { class: 'more' + (o.cls ? ' ' + o.cls : '') };
    if (isOpen) props.open = true;
    if (o.key) {
      props.ontoggle = (e) => {
        const t = (e && e.target) || null;
        const nowOpen = !!(t && (t.open === true || (t.hasAttribute && t.hasAttribute('open'))));
        if (nowOpen) openKeys.add(o.key); else openKeys.delete(o.key);
      };
    }
    return h('details', props, h('summary', { text: summary }), kids);
  }
  function moreReset() { openKeys.clear(); }

  const api = { h, clear, num, diff, more, moreReset };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.dom = api;
})(window);
