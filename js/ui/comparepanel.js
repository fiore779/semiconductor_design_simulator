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

  function diffView(r, k, name) {
    const pr = CF.pairRow(r, k);
    return h('div', { class: 'cmp-diff' }, h('span', { class: 'small', text: `差(現在 − ${name}): ` }), h('b', { text: CF.diffText(pr) }),
      pr.kindMismatch ? h('div', { class: 'small warn-note', text: '区分が違う値どうしの差です' }) : null);
  }

  // opts: { design, ev, presets, baseline, evaluate(design) → ev(例外はここで捕まえる) }
  // 比較先は最大 2 つ(枠 A は必須、枠 B は「なし」を選べる)。2 つのとき、差は各比較先の列に「現在 − その比較先」で出す(比較先どうしの差は出さない)。
  function openCompare(opts) {
    const opt = CF.sourceOptions(opts.design, opts.presets, opts.baseline);
    const first = ['origin', 'history', 'preset'].map((k) => opt.find((o) => o.key === k)).find((o) => o && o.enabled); // 既定は 元のプリセット → 履歴の最初 → 別のプリセット
    const slots = [{ key: first ? first.key : 'origin', presetId: '' }, { key: 'none', presetId: '' }];
    const out = h('div', { class: 'cmp-out', 'aria-live': 'polite' });
    const presetList = (opts.presets || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));

    function makeSlot(i) {
      const sl = slots[i]; const name = CF.TARGET_NAMES[i];
      const typeOpts = opt.map((o) => h('option', { value: o.key, disabled: !o.enabled, selected: o.key === sl.key }, o.enabled ? o.label : `${o.label}(選べません: ${o.reason})`));
      if (i > 0) typeOpts.unshift(h('option', { value: 'none', selected: sl.key === 'none' }, '(なし: 比較先は 1 つ)'));
      const presetRow = h('label', { hidden: true }, '比較するプリセット ',
        h('select', { id: `cmp-preset${i ? i + 1 : ''}`, 'aria-label': `${name}の比較するプリセット`, onchange: (e) => { sl.presetId = e.target.value; render(); } },
          [h('option', { value: '' }, '(プリセットを選んでください)')].concat(presetList.map((p) => h('option', { value: p.id }, `${p.name}(${p.year})`)))));
      const sync = () => { presetRow.hidden = sl.key !== 'preset'; };
      const sel = h('select', { id: i ? 'cmp-src2' : 'cmp-src', 'aria-label': `${name}の種類`, onchange: (e) => { sl.key = e.target.value; sync(); render(); } }, typeOpts);
      sync();
      return h('p', {}, h('label', {}, `${name} `, sel), ' ', presetRow);
    }

    function render() {
      clear(out);
      const r = CF.resolveTargets(slots, opts.design, { presets: opts.presets, baseline: opts.baseline });
      r.errors.forEach((e) => {
        const wait = e.key === 'preset' && !slots[e.index].presetId;
        out.appendChild(h('p', { class: wait ? 'note' : 'err', text: wait ? `${CF.TARGET_NAMES[e.index]}: ${e.reason}` : `✗ ${CF.TARGET_NAMES[e.index]}: ${e.reason}` }));
      });
      r.duplicates.forEach((d) => out.appendChild(h('p', { class: 'note', text: `${CF.TARGET_NAMES[d.index]}は ${CF.TARGET_NAMES[0]} と同じ設計のため、重複して並べません(${d.label})` })));
      const B = [];
      r.targets.forEach((t, ti) => {
        try { B.push({ design: t.design, ev: opts.evaluate(t.design), sourceKey: t.sourceKey, label: t.label }); }
        catch (e) { out.appendChild(h('p', { class: 'err', text: `✗ ${CF.TARGET_NAMES[t.index != null ? t.index : ti]}を評価できませんでした: ${e.message}` })); }
      });
      if (!B.length) return;
      const A = { design: opts.design, ev: opts.ev };
      const multi = B.length > 1;
      const names = multi ? CF.TARGET_NAMES : ['比較先'];
      const da = CF.describe(opts.design, opts.ev);
      out.appendChild(h('p', { class: 'small', text: `現在: 「${da.name}」(${da.modeText}${da.edited ? '・編集済み' : ''}) / ${B.map((b, i) => `${names[i]}: ${b.label}`).join(' / ')}` }));
      const tb = h('tbody');
      CF.compareMulti(A, B).forEach((row) => {
        const tds = multi
          ? row.others.map((o, k) => { const td = cellView(o.cell, row); td.appendChild(diffView(row, k, names[k])); return td; })
          : [cellView(row.others[0].cell, row), h('td', {}, h('b', { text: CF.diffText(CF.pairRow(row, 0)) }), row.others[0].kindMismatch ? h('div', { class: 'small warn-note', text: '区分が違う値どうしの差です' }) : null)];
        tb.appendChild(h('tr', {}, [h('th', { scope: 'row' }, h('div', { text: row.label })), cellView(row.a, row)].concat(tds)));
      });
      const heads = multi ? ['項目', '現在'].concat(names.map((n) => `${n}(差は 現在 − ${n})`)) : ['項目', '現在', '比較先', '差(現在 − 比較先)'];
      out.appendChild(h('div', { class: 'cmp-scroll', role: 'region', 'aria-label': '比較表(横にスクロールできます)', tabindex: '0' },
        h('table', { class: `mini cmp-table cmp-cols-${B.length + 1}` }, h('caption', { class: 'small', text: `現在の設計と比較先 ${B.length} 件の数値の比較` }),
          h('thead', {}, h('tr', {}, heads.map((x, xi) => h('th', { scope: 'col' }, xi === 0 ? h('div', { text: x }) : x)))), tb)));
      out.appendChild(h('ul', { class: 'small' }, CF.compareNotesMulti(A, B).map((t) => h('li', { text: t }))));
    }

    DG.open('設計の比較', h('div', { class: 'cmp-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: '現在の設計を、元のプリセット・別のプリセット・履歴の最初の状態から最大 2 つ(比較先 A・B)と並べます。比較先どうしの差は出しません。比較は評価を再実行するだけで、設計は変更しません。' }),
      makeSlot(0), makeSlot(1),
      out));
    render();
  }

  root.SDS.ui.comparepanel = { openCompare };
})(window);
