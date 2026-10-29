// 新規作成画面(設計書 §8.3)とプリセット選択画面(§8.4)。ブラウザ専用。
// A 再現・B 改良・C 混合・D 新規が有効。
(function (root) {
  'use strict';
  const { h, clear, num } = root.SDS.ui.dom;
  const PL = root.SDS.ui.presetlist;
  const { srcBadge } = root.SDS.ui.results;

  let overlay = null; let lastFocus = null;

  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function isOpen() { return !!overlay; }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function open(title, content) {
    if (overlay) overlay.remove(); else lastFocus = document.activeElement;
    overlay = h('div', { class: 'overlay', role: 'presentation' },
      h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('header', {}, h('h2', { text: title }), h('button', { type: 'button', class: 'btn', onclick: close, 'aria-label': '閉じる(Esc)' }, '✕ 閉じる')), content));
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);
    const first = overlay.querySelector('button:not([disabled]):not(.btn-close), input, select');
    if (first) { const f = overlay.querySelector('.card-mode:not([disabled]), input[type=search]') || first; f.focus(); }
  }

  // ---- 新規(4 モードの入口) ----
  function openNew(cb) {
    const card = (key, title, desc, enabled) => h('button', {
      type: 'button', class: 'card-mode' + (enabled ? '' : ' disabled'), disabled: !enabled, 'aria-disabled': enabled ? null : 'true',
      onclick: () => { if (enabled) { cb.onPickMode(key); } },
    }, h('b', { text: `${key} ${title}` }), h('span', { text: desc }), enabled ? h('em', { text: '選べます' }) : h('em', { class: 'unimpl', text: '未実装(今回は選べません)' }));
    open('どう始めますか?', h('div', { class: 'modes' },
      card('A', '再現', '実在チップを忠実に再現し、公開値と比べる', true),
      card('B', '改良', '実在チップを土台に、コア数・クロック・L3 を変えて自分用に改造する', true),
      card('C', '混合', '複数チップの部品を組み合わせる', true),
      card('D', '新規', 'プロセスとダイ寸法を決めて空のダイを作り、既存コアを複製・編集した自作コアを置く', true)));
  }

  // ---- プリセット選択 ----
  function openPresets(ctx, cb) {
    const presets = ctx.presets; const g = ctx.gb7ByName;
    const f = { vendors: [], kinds: [], isa: [], query: '', yearMin: null, yearMax: null, levels: [] };
    let sortKey = 'name'; let sortDir = 1; let selected = null;
    let focusEls = {}; // refresh のたびに作り直す: キー → 要素(フォーカスの復帰用)
    const openGroups = new Map(); // 利用者が手で開閉したグループ(自動の開閉より優先)
    const listEl = h('div', { class: 'preset-list' });
    const detailEl = h('div', { class: 'preset-detail', 'aria-live': 'polite' });
    const countEl = h('p', { class: 'small', role: 'status' });
    const goBtn = h('button', { type: 'button', class: 'btn primary', disabled: true, onclick: () => { if (selected) cb.onReproduce(selected); } }, '再現する');
    const impBtn = h('button', { type: 'button', class: 'btn', disabled: true, onclick: () => { if (selected && cb.onImprove) cb.onImprove(selected); } }, '改良する');

    function detail(p) {
      clear(detailEl);
      if (!p) { detailEl.appendChild(h('p', { class: 'note', text: '左の一覧からチップを選んでください。' })); goBtn.disabled = true; impBtn.disabled = true; return; }
      goBtn.disabled = false; impBtn.disabled = !cb.onImprove;
      const c = PL.completeness(p, g);
      const gb = g[p.gb7];
      const pw = p.power || {};
      const rows = [];
      rows.push(h('h3', {}, p.name, ' ', h('span', { class: `badge fill-${c.level}`, title: `データ充実度: ${c.text}` }, `${c.symbol} ${c.text}`)));
      if (p.calib) rows.push(h('p', { class: 'badge calib', text: `★ 校正の代表 SKU(再現しても検証にならない)${p.calibNote ? ': ' + p.calibNote : ''}` }));
      rows.push(h('p', { class: 'small', text: `${p.vendor} / ${p.family} / ${p.year} 年 / ${PL.kindLabel(p.kind)} / ${p.isa}` }));
      rows.push(h('h4', { text: 'コア構成' }), h('ul', {}, (p.cfg.cores || []).map((k) => h('li', { text: `${k.type}: ${k.uarch || 'マイクロアーキ未指定'} ×${k.count}${k.smt === 2 ? '(SMT)' : ''}  基本 ${num(k.baseGHz, 1, 'GHz')} / ブースト ${num(k.boostGHz, 1, 'GHz')}` }))));
      rows.push(h('p', { class: 'small', text: `L3: ${p.cfg.l3MB != null ? p.cfg.l3MB + ' MB' : '未取得'} / メモリ: ${p.cfg.memory || '未取得'}` }));
      rows.push(h('h4', { text: 'ダイ面積' }), p.dies && p.dies.length ? h('ul', {}, p.dies.map((d) => h('li', {}, `${d.name}: `, d.mm2 != null ? [`${d.mm2} mm² `, srcBadge(d.s)] : h('b', { text: '未取得' }), d.nodeId ? ` (${(ctx.nodes.find((n) => n.id === d.nodeId) || { name: d.nodeId }).name})` : ''))) : h('p', {}, h('b', { text: '未取得' })));
      const pv = (label, v) => h('li', {}, `${label}: `, v ? [`${v.w} W `, srcBadge(v.s), v.note ? ` ${v.note}` : ''] : h('b', { text: '未取得' }));
      rows.push(h('h4', { text: '消費電力(公表値)' }), h('ul', {}, pv('基準', pw.base), pv('ピーク', pw.peak), pw.range ? h('li', { text: `範囲: ${pw.range.minW}〜${pw.range.maxW} W` }) : null));
      rows.push(h('h4', { text: 'Geekbench 7' }), gb ? h('p', {}, `ST ${gb.single} / MT ${gb.multi != null ? gb.multi : '未取得'} `, h('span', { class: 'badge', title: PL.lowReason(gb), text: PL.gb7Basis(gb).label + (PL.gb7Basis(gb).low ? ' ⚠ 信頼度低' : '') })) : h('p', {}, h('b', { text: '未取得' })));
      if (p.notes) rows.push(h('p', { class: 'small', text: `備考: ${p.notes}` }));
      c.missing.length && rows.push(h('p', { class: 'note warn-note', text: `未取得の項目: ${c.missing.join('・')}` }));
      detailEl.appendChild(h('div', {}, rows));
    }

    // 行末の GB7 区分。n が null のものは件数を出さない。信頼度が低いものは文字で「⚠ 信頼度低」と添える(色だけに頼らない)。
    function gbText(gb) {
      if (!gb) return 'GB7 ST 未取得';
      const b = PL.gb7Basis(gb);
      return `GB7 ST ${gb.single}(${b.label}${b.low ? ' ⚠ 信頼度低' : ''})`;
    }
    function rowEl(p) {
      const el = rowEl0(p); focusEls['row:' + p.id] = el.firstChild; return el;
    }
    function rowEl0(p) {
      const c = PL.completeness(p, g); const a = PL.areaSummary(p); const gb = g[p.gb7];
      const node = p.dies && p.dies[0] && p.dies[0].nodeId ? (ctx.nodes.find((n) => n.id === p.dies[0].nodeId) || {}).name : null;
      return h('li', { role: 'none' }, h('button', {
        type: 'button', role: 'option', dataset: { id: p.id }, class: 'preset-row' + (p === selected ? ' sel' : ''), 'aria-selected': p === selected ? 'true' : 'false',
        onclick: () => { selected = p; detail(p); refresh('row:' + p.id); }, ondblclick: () => cb.onReproduce(p),
      }, h('span', { class: `badge fill-${c.level}`, title: c.text, text: c.symbol }), h('b', { text: p.name }),
      h('span', { class: 'small', title: PL.lowReason(gb), text: ` ${p.family} ${p.year} / ${node || 'ノード未取得'} / 面積 ${a.text} / ${gbText(gb)}` })));
    }

    function refresh(focusKey) {
      focusEls = {};
      refresh0();
      const t = focusKey && focusEls[focusKey];
      if (t && t.focus) t.focus();
    }
    function changed() { openGroups.clear(); refresh(); } // 検索語・絞り込みが変わったら手動の開閉を捨て、自動展開に従う
    function refresh0() {
      const res = PL.sortPresets(PL.filterPresets(presets, f, g), sortKey, sortDir, g);
      clear(listEl);
      countEl.textContent = `${res.length} 件 / 全 ${presets.length} 件`;
      if (selected && !res.includes(selected)) { selected = null; detail(null); }
      if (sortKey !== 'name') {
        // 並べ替えの意味を保つため、名前順以外はグループ化せず平らに出す
        listEl.appendChild(h('ul', { class: 'preset-items flat', role: 'listbox', 'aria-label': 'プリセット一覧' }, res.map(rowEl)));
        return;
      }
      const autoOpen = f.query.trim() !== '' || res.length <= 30;
      PL.groupByFamily(res).forEach((grp, i) => {
        const key = grp.vendor + '/' + grp.family;
        const open = openGroups.has(key) ? openGroups.get(key) : autoOpen;
        const bodyId = `pg-${i}`;
        const head = h('button', {
          type: 'button', class: 'group-head', dataset: { key }, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': bodyId,
          onclick: () => { openGroups.set(key, !open); refresh('grp:' + key); },
        }, h('span', { 'aria-hidden': 'true', text: open ? '▼ ' : '▶ ' }), h('b', { text: `${grp.vendor} / ${grp.family}` }), h('span', { class: 'small', text: ` (${grp.items.length} 件)` }));
        focusEls['grp:' + key] = head;
        listEl.appendChild(h('div', { class: 'preset-group' }, head,
          h('ul', { id: bodyId, class: 'preset-items', role: 'listbox', 'aria-label': `${grp.vendor} / ${grp.family}`, hidden: !open }, grp.items.map(rowEl))));
      });
    }

    const checks = (label, name, opts, arr) => h('fieldset', {}, h('legend', { text: label }), opts.map(([v, t]) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', onchange: (e) => { const i = arr.indexOf(v); if (e.target.checked && i < 0) arr.push(v); if (!e.target.checked && i >= 0) arr.splice(i, 1); changed(); } }), ' ' + t)));
    const vendors = [...new Set(presets.map((p) => p.vendor))];
    const kinds = [...new Set(presets.map((p) => p.kind))];
    const yr = (k) => (e) => { const v = parseInt(e.target.value, 10); f[k] = isNaN(v) ? null : v; changed(); };
    const years = presets.map((p) => p.year);
    const filters = h('div', { class: 'filters' },
      h('label', {}, '検索(チップ名・世代・コア名)', h('input', { type: 'search', placeholder: '例: 9700X, Zen 5, M1', oninput: (e) => { f.query = e.target.value; changed(); } })),
      checks('メーカー', 'v', vendors.map((v) => [v, v]), f.vendors),
      checks('種別', 'k', kinds.map((k) => [k, PL.kindLabel(k)]), f.kinds),
      h('fieldset', {}, h('legend', { text: '年代' }), h('input', { type: 'number', 'aria-label': '年(から)', placeholder: String(Math.min(...years)), oninput: yr('yearMin') }), ' 〜 ', h('input', { type: 'number', 'aria-label': '年(まで)', placeholder: String(Math.max(...years)), oninput: yr('yearMax') })),
      checks('命令セット', 'i', [...new Set(presets.map((p) => p.isa).filter(Boolean))].map((v) => [v, v]), f.isa),
      checks('データの充実度', 'l', [['full', '● 完全'], ['partial', '◐ 一部未取得'], ['poor', '○ 大半が未取得']], f.levels),
      h('label', {}, '並べ替え', h('select', { onchange: (e) => { const [k, d] = e.target.value.split(':'); sortKey = k; sortDir = parseInt(d, 10); refresh(); } },
        [['name:1', '名前'], ['year:-1', '新しい順'], ['year:1', '古い順'], ['area:-1', '面積が大きい順'], ['gb7:-1', 'GB7 ST が高い順']].map(([v, t]) => h('option', { value: v, text: t })))));

    detail(null); refresh();
    open('プリセットを選ぶ(A 再現 / B 改良)', h('div', { class: 'preset-dialog' },
      filters, h('div', { class: 'list-col' }, countEl, listEl), h('div', { class: 'detail-col' }, detailEl, h('div', { class: 'actions' }, goBtn, impBtn))));
  }

  // ---- 混合設計の設定(モード C の入口。opts.entry === 'new' なら D 新規の入口: ① プロセス ② ダイ寸法の 2 ステップ。設計書 §3.7.2) ----
  // ctx.nodes: プロセス一覧。cb.onCreate({ name, w, h, nodeId, entry }) は { ok, reason } を返す(成功ならダイアログを閉じるのは呼び出し側)
  function openMix(ctx, cb, opts) {
    const isNew = !!(opts && opts.entry === 'new');
    const MF = root.SDS.ui.mixform;
    const nodes = ctx.nodes || [];
    const defNode = (nodes.find((n) => n.id === 'tsmc-n4') || nodes[0] || {}).id || '';
    const nameI = h('input', { id: 'mxd-name', type: 'text', value: isNew ? '新規チップ' : '混合チップ', autocomplete: 'off' });
    const wI = h('input', { id: 'mxd-w', type: 'text', inputmode: 'decimal', value: String(MF.DEFAULT_DIE_MM), autocomplete: 'off', 'aria-label': 'ダイの幅(mm)' });
    const hI = h('input', { id: 'mxd-h', type: 'text', inputmode: 'decimal', value: String(MF.DEFAULT_DIE_MM), autocomplete: 'off', 'aria-label': 'ダイの高さ(mm)' });
    const nodeS = h('select', { id: 'mxd-node' }, nodes.map((n) => h('option', { value: n.id, selected: n.id === defNode }, n.name)));
    const msg = h('p', { class: 'err pmsg', role: 'alert', hidden: true });
    const setMsg = (t) => { msg.textContent = t ? `✗ ${t}` : ''; msg.hidden = !t; };
    const create = () => {
      const check = root.SDS.model && root.SDS.model.design && root.SDS.model.design.checkDieSize;
      const r = MF.parseDieSize(wI.value, hI.value, check);
      if (!r.ok) { setMsg(r.reason); return; }
      setMsg('');
      const res = cb.onCreate({ name: nameI.value.trim() || (isNew ? '新規チップ' : '混合チップ'), w: r.w, h: r.h, nodeId: nodeS.value || null, entry: isNew ? 'new' : null });
      if (res && res.ok === false) setMsg(res.reason);
    };
    const row = (id, label, input, unit) => h('div', { class: 'pfield' }, h('label', { for: id, text: label }), h('div', { class: 'pinput' }, input, unit ? h('span', { class: 'small', text: unit }) : null));
    const sizeRow = h('div', { class: 'pfield', role: 'group', 'aria-label': 'ダイ寸法' }, h('span', { class: 'lbl', text: (isNew ? '② ' : '') + 'ダイ寸法(1〜100 mm)' }),
      h('div', { class: 'pinput' }, h('label', { for: 'mxd-w', class: 'small', text: '幅' }), wI, h('span', { class: 'small', text: '×' }), h('label', { for: 'mxd-h', class: 'small', text: '高さ' }), hI, h('span', { class: 'small', text: 'mm' })));
    const nodeRow = row('mxd-node', (isNew ? '① ' : '') + 'プロセス', nodeS);
    open(isNew ? '新規設計の設定(D 新規)' : '混合設計の設定(C 混合)', h('div', { class: 'mixdialog' },
      h('p', { class: 'note', text: isNew ? 'プロセスとダイ寸法を決めて空のダイを作ります。続けて左の部品ライブラリで、既存コアを「複製して編集」した自作コアを置きます。プロセスは後から変えられません。目標性能からの構成の提案は作りません(未実装)。' : '空のダイを作り、部品ライブラリから実在チップの部品を置いていきます。プロセスは後から変えられません。' }),
      row('mxd-name', '設計名', nameI),
      isNew ? [nodeRow, sizeRow] : [sizeRow, nodeRow],
      msg,
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onclick: create }, '作成'), h('button', { type: 'button', class: 'btn', onclick: close }, 'キャンセル'))));
  }

  root.SDS.ui.dialogs = { openNew, openPresets, openMix, open, close, isOpen };
})(window);
