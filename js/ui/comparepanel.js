// 比較ビュー(設計書 §9「設計の比較」)。ブラウザ専用。表の中身は SDS.ui.compareform が作り、ここは描くだけ。
// 比較は evaluate を再実行するだけで、設計・履歴・選択は変えない。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
  const CF = root.SDS.ui.compareform;
  const DG = root.SDS.ui.dialogs;

  function cellView(c, row) {
    const kids = [h('div', {}, h('b', { class: Number.isFinite(c.value) ? '' : 'na', text: CF.valueText(c, row) }))];
    if (Number.isFinite(c.value)) {
      kids.push(h('div', {}, h('span', { class: `badge src-${c.kind}`, title: '値の区分', text: `[${c.kindText}]` }), ' ',
        h('span', { class: `badge conf-${c.conf || 'none'}`, title: '推定の確度', text: c.conf ? `確度 ${c.confText}` : '確度 —' })));
      c.sub.forEach((t) => kids.push(h('div', { class: 'small warn-note', text: t })));
      if (row.key !== 'area' && row.key !== 'tj') kids.push(h('div', { class: 'small', text: CF.pubText(c, row) }));
    }
    return h('td', {}, kids);
  }

  // opts: { design, ev, presets, baseline, evaluate(design) → ev(例外は呼び出し側で捕まえない=ここで捕まえる) }
  function openCompare(opts) {
    const opt = CF.sourceOptions(opts.design, opts.presets, opts.baseline);
    const first = ['origin', 'history', 'preset'].map((k) => opt.find((o) => o.key === k)).find((o) => o && o.enabled); // 既定は 元のプリセット → 履歴の最初 → 別のプリセット
    let key = first ? first.key : 'origin'; let presetId = '';
    const out = h('div', { class: 'cmp-out', 'aria-live': 'polite' });
    const sel = h('select', { id: 'cmp-src', 'aria-label': '比較先の種類', onchange: (e) => { key = e.target.value; syncPreset(); render(); } },
      opt.map((o) => h('option', { value: o.key, disabled: !o.enabled, selected: o.key === key }, o.enabled ? o.label : `${o.label}(選べません: ${o.reason})`)));
    const presetSel = h('select', { id: 'cmp-preset', 'aria-label': '比較するプリセット', onchange: (e) => { presetId = e.target.value; render(); } },
      [h('option', { value: '' }, '(プリセットを選んでください)')].concat((opts.presets || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ja')).map((p) => h('option', { value: p.id }, `${p.name}(${p.year})`))));
    const presetRow = h('label', { hidden: true }, '比較するプリセット ', presetSel);
    function syncPreset() { presetRow.hidden = key !== 'preset'; }

    function render() {
      clear(out);
      const o = CF.buildOther(key, opts.design, { presets: opts.presets, presetId, baseline: opts.baseline });
      if (!o.ok) { out.appendChild(h('p', { class: key === 'preset' && !presetId ? 'note' : 'err', text: key === 'preset' && !presetId ? o.reason : `✗ ${o.reason}` })); return; }
      let ev2;
      try { ev2 = opts.evaluate(o.design); } catch (e) { out.appendChild(h('p', { class: 'err', text: `✗ 比較先を評価できませんでした: ${e.message}` })); return; }
      const A = { design: opts.design, ev: opts.ev }; const B = { design: o.design, ev: ev2, sourceKey: key };
      const da = CF.describe(opts.design, opts.ev);
      out.appendChild(h('p', { class: 'small', text: `現在: 「${da.name}」(${da.modeText}${da.edited ? '・編集済み' : ''}) / 比較先: ${o.label}` }));
      const tb = h('tbody');
      CF.compareRows(A, B).forEach((r) => {
        tb.appendChild(h('tr', {}, h('th', { scope: 'row', text: r.label }), cellView(r.a, r), cellView(r.b, r),
          h('td', {}, h('b', { text: CF.diffText(r) }), r.kindMismatch ? h('div', { class: 'small warn-note', text: '区分が違う値どうしの差です' }) : null)));
      });
      out.appendChild(h('table', { class: 'mini cmp-table' }, h('thead', {}, h('tr', {}, ['項目', '現在', '比較先', '差(現在 − 比較先)'].map((x) => h('th', { text: x })))), tb));
      out.appendChild(h('ul', { class: 'small' }, CF.compareNotes(A, B).map((t) => h('li', { text: t }))));
    }

    syncPreset();
    DG.open('設計の比較', h('div', { class: 'cmp-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: '現在の設計を、元のプリセット・別のプリセット・履歴の最初の状態のどれか 1 つと並べます。比較は評価を再実行するだけで、設計は変更しません。' }),
      h('p', {}, h('label', {}, '比較先 ', sel), ' ', presetRow),
      out));
    render();
  }

  root.SDS.ui.comparepanel = { openCompare };
})(window);
