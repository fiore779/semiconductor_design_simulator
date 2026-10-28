// 部品ライブラリ(設計書 §8.7)。左のパーツ欄。C 混合のときだけ表示。ブラウザ専用。
// 部品の一覧(blocklib.build の結果)を絞り込んで見せ、[追加] で main.js に渡す。追加の検証・履歴は main.js と design.addPart 側。
// 絞り込みの状態はこのモジュールが持つ(設計が変わって再描画しても、検索語などは残す)。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
  const MF = root.SDS.ui.mixform;

  const filter = { isa: '', vendor: '', kind: '', text: '' };
  const MAX_ROWS = 60; // 一度に描く部品の数(多すぎると重い。絞り込みを促す)

  // cb: { onAdd(part, { count, capacityMB }) }。msg: 直前の追加の失敗理由(日本語)。nodes: プロセス一覧(事前チェックの文に使う)
  function renderLibrary(el, design, parts, cb, msg, nodes) {
    clear(el);
    el.appendChild(h('h2', { text: '部品ライブラリ' }));
    el.appendChild(h('p', { class: 'note', text: '実在チップから取り出した部品を、混合設計のダイに追加します。面積の区分: 表(出典あり)/推定(仮の比率)/未取得。' }));

    const listEl = h('ul', { class: 'lib-list' });
    const countEl = h('p', { class: 'small', role: 'status' });
    const msgEl = h('p', { class: 'err pmsg', role: 'alert' });
    const setMsg = (t) => { msgEl.textContent = t ? `✗ ${t}` : ''; msgEl.hidden = !t; };
    setMsg(msg);

    function row(p) {
      const badge = MF.areaBadge(p);
      const pre = MF.preCheck(design, p, nodes).filter((x) => x.level === 'error');
      const isCore = p.kind === 'core'; const isL3 = p.kind === 'l3';
      const idBase = `lib-${p.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
      let input = null;
      if (isCore) input = h('input', { id: `${idBase}-n`, type: 'text', inputmode: 'numeric', value: '1', autocomplete: 'off', 'aria-label': `${MF.partName(p)} の個数` });
      else if (isL3) input = h('input', { id: `${idBase}-c`, type: 'text', inputmode: 'decimal', value: String(p.capacityMB), autocomplete: 'off', 'aria-label': `${p.label} の容量(MB)` });
      const add = () => {
        const o = {};
        if (isCore) { const r = MF.parseCount(input.value); if (!r.ok) { setMsg(r.reason); return; } o.count = r.value; }
        if (isL3) { const r = MF.parseCapacity(input.value); if (!r.ok) { setMsg(r.reason); return; } o.capacityMB = r.value; }
        setMsg('');
        cb.onAdd(p, o);
      };
      return h('li', { class: 'lib-item' },
        h('b', { text: MF.partName(p) }),
        h('div', { class: 'small', text: `${p.sourceChip || '出所不明'} / ${p.nodeId || 'プロセス未取得'} / ${MF.ISA_LABEL[p.isa] || p.isa || '命令セット不明'}${p.kind === 'core' && p.coreType ? ` / ${p.coreType}` : ''}` }),
        h('div', {}, h('span', { class: `badge area-${badge.cls}`, title: badge.note || '' }, badge.text), badge.cls === 'estimated' ? h('span', { class: 'small warn-note', text: isCore ? ' 仮の比率・P/E の区別なし' : ' 仮の比率' }) : null),
        pre.length ? h('p', { class: 'small err', role: 'note' }, `⚠ ${pre[0].text}`) : null,
        h('div', { class: 'lib-add' },
          input ? h('label', { class: 'small', for: input.id }, isCore ? '個数 ' : '容量 ') : null, input, isL3 ? h('span', { class: 'small', text: 'MB' }) : null,
          h('button', { type: 'button', class: 'btn', disabled: !design || pre.length > 0, title: pre.length ? pre[0].text : null, onclick: add }, '追加')));
    }

    function refresh() {
      const res = MF.filterParts(parts, filter);
      clear(listEl);
      countEl.textContent = `${res.length} 件 / 全 ${parts.length} 件${res.length > MAX_ROWS ? `(先頭の ${MAX_ROWS} 件を表示。絞り込んでください)` : ''}`;
      res.slice(0, MAX_ROWS).forEach((p) => listEl.appendChild(row(p)));
    }

    const sel = (label, key, opts) => h('label', { class: 'libf' }, label,
      h('select', { onchange: (e) => { filter[key] = e.target.value; refresh(); } }, opts.map(([v, t]) => h('option', { value: v, selected: filter[key] === v }, t))));
    el.appendChild(h('div', { class: 'lib-filters' },
      h('label', { class: 'libf' }, '検索', h('input', { type: 'search', value: filter.text, placeholder: '例: Zen 5, M1', oninput: (e) => { filter.text = e.target.value; refresh(); } })),
      sel('命令セット', 'isa', MF.ISA_OPTIONS),
      sel('メーカー', 'vendor', [['', 'すべて']].concat(MF.vendorsOf(parts).map((v) => [v, v]))),
      sel('種類', 'kind', MF.KIND_OPTIONS)));
    el.appendChild(msgEl);
    el.appendChild(countEl);
    el.appendChild(listEl);
    refresh();
  }

  root.SDS.ui.library = { renderLibrary };
})(window);
