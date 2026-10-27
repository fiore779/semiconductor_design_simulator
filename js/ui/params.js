// パラメータ欄(設計書 §3.3)。コア数・クロック・L3 の表示と編集。ブラウザ専用。状態は持たず、main.js から渡された値を描く。
// 編集の確定は change(blur / Enter)。検証と設計の更新は main.js のコールバック側で行い、エラー文は msgs に入れて渡す。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
  const PF = root.SDS.ui.paramform;

  let keepFocusId = null; // Enter で確定したときは同じ入力欄、Tab のときは移動先の入力欄へ、再描画後にフォーカスを戻す

  function field(id, label, value, opts) {
    const o = opts || {};
    const msg = o.msg;
    const msgId = `${id}-msg`;
    const input = h('input', {
      id, type: 'text', inputmode: o.int ? 'numeric' : 'decimal', autocomplete: 'off', value,
      readonly: o.readonly ? true : null, 'aria-readonly': o.readonly ? 'true' : null,
      placeholder: o.placeholder || null, 'aria-invalid': msg ? 'true' : null, 'aria-describedby': msg ? msgId : null,
      onchange: (e) => o.onCommit(e.target.value, e.target),
      onkeydown: (e) => {
        if (e.key === 'Enter') { keepFocusId = id; e.target.blur(); setTimeout(() => { if (keepFocusId === id) keepFocusId = null; }, 0); } else if (e.key === 'Tab') {
          // Tab で確定して再描画されると、移動先の入力欄が消えてフォーカスを失う。移動先(次/前の入力欄)の id を覚えて、再描画後に戻す
          const list = Array.from((e.target.closest('#params') || document).querySelectorAll('input[id^="pf-"]'));
          const to = list[list.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
          if (to) { const tid = to.id; keepFocusId = tid; setTimeout(() => { if (keepFocusId === tid) keepFocusId = null; }, 0); }
        }
      },
    });
    return h('div', { class: 'pfield' },
      h('label', { for: id, text: label }),
      h('div', { class: 'pinput' }, input, o.unit ? h('span', { class: 'small', text: o.unit }) : null),
      o.extra || null,
      msg ? h('p', { class: 'err pmsg', id: msgId, role: 'alert', text: `✗ ${msg}` }) : null);
  }

  // cb: { onCount(type, str, input), onClock(type, str, input), onL3(str, input), onUnlock() }。msgs: { 'count:P': '…', 'clock:P': '…', l3: '…' }
  function renderParams(el, design, cb, msgs) {
    clear(el);
    el.appendChild(h('h2', { text: 'パラメータ' }));
    const mode = PF.modeInfo(design);
    const rows = design ? PF.paramRows(design) : null;
    if (!mode) { el.appendChild(h('p', { class: 'note', text: '設計を読み込むと、ここでコア数・クロック・L3 を確認できます。' })); return; }
    if (!rows) {
      el.appendChild(h('p', { class: 'note warn-note', text: '編集不可: この設計には編集用のパラメータがなく、元のプリセットも見つからないため補えませんでした。' }));
      return;
    }
    const m = msgs || {};
    const ro = !mode.editable;
    if (mode.locked) {
      el.appendChild(h('div', { class: 'lockbox' },
        h('p', { text: '■ 再現モードではロック中です(読み取り専用)。' }),
        h('button', { type: 'button', class: 'btn', onclick: cb.onUnlock }, 'ロックを解除して改良モードにする')));
    } else if (!mode.editable) {
      el.appendChild(h('p', { class: 'note', text: '読み取り専用です。' }));
    }
    rows.cores.forEach((g) => {
      const key = g.type.replace(/[^A-Za-z0-9_-]/g, '_');
      const box = h('fieldset', { class: 'pgroup' }, h('legend', { text: `${g.type} コア${g.uarch ? `(${g.uarch})` : ''}` }));
      box.appendChild(field(`pf-count-${key}`, 'コア数', String(g.count), { readonly: ro, int: true, unit: '個', msg: m[`count:${g.type}`], onCommit: (v, i) => cb.onCount(g.type, v, i) }));
      box.appendChild(field(`pf-clock-${key}`, 'クロック', g.clock == null ? '' : PF.trimNum(g.clock), {
        readonly: ro, unit: 'GHz', placeholder: g.clock == null ? '未取得' : null, msg: m[`clock:${g.type}`], onCommit: (v, i) => cb.onClock(g.type, v, i),
        extra: g.clock == null ? h('p', { class: 'small warn-note', text: 'クロックは未取得です。入力するとブースト値として新設します。' }) : null,
      }));
      el.appendChild(box);
    });
    el.appendChild(h('fieldset', { class: 'pgroup' }, h('legend', { text: 'キャッシュ' }),
      field('pf-l3', 'L3 容量', PF.trimNum(rows.l3MB), { readonly: ro, unit: 'MB', msg: m.l3, onCommit: (v, i) => cb.onL3(v, i) })));
    if (mode.editable) {
      el.appendChild(h('p', { class: 'note', text: '入力後に Enter か Tab で確定します。範囲外・不正な値は元に戻ります。' }));
      el.appendChild(h('p', { class: 'note', text: 'コア数・L3 を変えると、ブロックは模式図として再配置されます(手で動かした位置は失われます)。' }));
    }
    if (keepFocusId) {
      const f = el.querySelector(`#${keepFocusId}`);
      if (f) f.focus();
      keepFocusId = null;
    }
  }

  root.SDS.ui.params = { renderParams };
})(window);
