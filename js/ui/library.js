// 部品ライブラリ(設計書 §8.7)。左のパーツ欄。C 混合のときだけ表示。ブラウザ専用。
// 部品の一覧(blocklib.build の結果)を絞り込んで見せ、[追加] で main.js に渡す。追加の検証・履歴は main.js と design.addPart 側。
// 絞り込みの状態はこのモジュールが持つ(設計が変わって再描画しても、検索語などは残す)。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
  const MF = root.SDS.ui.mixform;
  const CF = () => root.SDS.ui.coreform;

  const filter = { isa: '', vendor: '', kind: '', text: '' };
  const MAX_ROWS = 60; // 一度に描く部品の数(多すぎると重い。絞り込みを促す)

  // cb: { onAdd(part, { count, capacityMB }), onClone(part)(コアの「複製して編集」。無ければボタンを出さない), onEditDef(def)(自作コアの「この定義を元に編集」) }。msg: 直前の追加の失敗理由(日本語)。nodes: プロセス一覧(事前チェックの文に使う)
  // env: { uarch(data/uarch.js), areas(data/blocklib.js) }。コアの「複製して編集」の可否の判定に使う(省略時は複製を出さない)
  function renderLibrary(el, design, parts, cb, msg, nodes, env) {
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
      const ci = isCore && cb.onClone && env && CF() ? CF().cloneInfo(p, env.uarch, env.areas) : null;
      return h('li', { class: 'lib-item' },
        h('b', { text: MF.partName(p) }),
        h('div', { class: 'small', text: `${p.sourceChip || '出所不明'} / ${p.nodeId || 'プロセス未取得'} / ${MF.ISA_LABEL[p.isa] || p.isa || '命令セット不明'}${p.kind === 'core' && p.coreType ? ` / ${p.coreType}` : ''}` }),
        h('div', {}, h('span', { class: `badge area-${badge.cls}`, title: badge.note || '' }, badge.text), badge.cls === 'estimated' ? h('span', { class: 'small warn-note', text: isCore ? ' 仮の比率・P/E の区別なし' : ' 仮の比率' }) : null),
        pre.length ? h('p', { class: 'small err', role: 'note' }, `⚠ ${pre[0].text}`) : null,
        ci ? h('div', { class: 'small' }, '面積の導出: ', h('span', { class: `badge ${ci.cloneable && ci.derivable ? 'area-table' : 'area-unknown'}`, text: ci.cloneable && ci.derivable ? '可' : '不可' }), ci.cloneable ? (ci.derivable ? '' : ` ${ci.derivReason}`) : ` 複製できません: ${ci.reason}`) : null,
        h('div', { class: 'lib-add' },
          input ? h('label', { class: 'small', for: input.id }, isCore ? '個数 ' : '容量 ') : null, input, isL3 ? h('span', { class: 'small', text: 'MB' }) : null,
          h('button', { type: 'button', class: 'btn', disabled: !design || pre.length > 0, title: pre.length ? pre[0].text : null, onclick: add }, '追加'),
          ci ? h('button', { type: 'button', class: 'btn', disabled: !design || !ci.cloneable || pre.length > 0, title: !ci.cloneable ? ci.reason : (pre.length ? pre[0].text : '複製して発行幅・ROB・L2・クロック・SMT を編集する(自作コア)'), onclick: () => cb.onClone(p) }, '複製して編集') : null));
    }

    // cb: { userCores: usercores.list の結果, onUseUser(entry, count), onDeleteUser(entry), onExportUser(entry), onImportUser(text) }
    function confirmDelete(entry) {
      const DG = root.SDS.ui.dialogs;
      DG.open('ライブラリから削除', h('div', { style: 'padding:10px 14px' },
        h('p', { text: `「${entry.def.name}」をユーザーライブラリから削除します。設計に追加済みのブロックは変わりません。元に戻せません(JSON を書き出していれば取り込み直せます)。` }),
        h('div', { class: 'btnrow' },
          h('button', { type: 'button', class: 'btn primary', onclick: () => { DG.close(); cb.onDeleteUser(entry); } }, '削除する'),
          h('button', { type: 'button', class: 'btn', onclick: () => DG.close() }, 'やめる'))));
    }
    function userBox() {
      const st = cb.userCores || { ok: false, reason: '保存状態を取得できません' };
      const cores = st.ok ? st.cores : [];
      const box = h('div', { class: 'lib-custom lib-user' }, h('h3', { text: `ユーザーライブラリの自作コア(${cores.length} 件)` }),
        h('p', { class: 'note', text: 'ブラウザ(localStorage)に保存した自作コアです。「設計に追加」するたびに定義が設計へコピーされ、以後は独立します(ライブラリを削除・変更しても追加済みのブロックは変わりません)。同名のコアを登録すると「名前 (2)」の別のコアとして追加されます。性能は基準コアの補正を借りた推定(確度:低)。' }));
      if (!st.ok) box.appendChild(h('p', { class: 'small err', role: 'note' }, `⚠ ${st.reason}${st.unavailable ? '。保存と取り込みは使えません(JSON 書き出しのみ可)' : ''}`));
      cores.forEach((e) => {
        const d = e.def; const idb = `lib-user-${e.id}`;
        const n = h('input', { id: `${idb}-n`, type: 'text', inputmode: 'numeric', value: '1', autocomplete: 'off', 'aria-label': `${d.name} の個数` });
        box.appendChild(h('div', { class: 'lib-item' },
          h('b', { text: d.name }), h('div', { class: 'small', text: `基準: ${d.base.uarch}(${d.base.sourceChip || '出所不明'}) / 登録 ${e.savedAt ? e.savedAt.slice(0, 16).replace('T', ' ') : '日時不明'}` }),
          h('div', { class: 'lib-add' },
            h('label', { class: 'small', for: n.id }, '個数 '), n,
            h('button', { type: 'button', class: 'btn', disabled: !design, onclick: () => { const r = MF.parseCount(n.value); if (!r.ok) { setMsg(r.reason); return; } setMsg(''); cb.onUseUser(e, r.value); } }, '設計に追加'),
            cb.onExportUser ? h('button', { type: 'button', class: 'btn', onclick: () => cb.onExportUser(e) }, 'JSON 書き出し') : null,
            h('button', { type: 'button', class: 'btn', onclick: () => confirmDelete(e) }, '削除'))));
      });
      if (st.ok && !cores.length) box.appendChild(h('p', { class: 'small', text: '保存したコアはありません。コアエディタの[ライブラリに登録]か、下の JSON 取り込みで追加できます。' }));
      const file = h('input', { type: 'file', accept: '.json,application/json', id: 'lib-user-file', disabled: !!st.unavailable, 'aria-label': 'ユーザーライブラリの JSON を取り込む',
        onchange: (ev) => {
          const f = ev.target.files && ev.target.files[0]; if (!f) return;
          const max = (root.SDS.model.usercores && root.SDS.model.usercores.MAX_IMPORT_CHARS) || 1000000;
          if (f.size > max) { setMsg(`ファイルが大きすぎます(上限 ${max} バイト)`); ev.target.value = ''; return; }
          const rd = new FileReader();
          rd.onload = () => { cb.onImportUser(String(rd.result)); };
          rd.onerror = () => setMsg('ファイルを読めませんでした');
          rd.readAsText(f);
          ev.target.value = '';
        } });
      box.appendChild(h('div', { class: 'lib-add' }, h('label', { class: 'small', for: 'lib-user-file' }, 'JSON 取り込み(通信なし) '), file));
      return box;
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
    // 自作コア: 設計に取り込んだコア定義の一覧
    const defs = (design && design.coreDefs) || [];
    if (defs.length && CF()) {
      const box = h('div', { class: 'lib-custom' }, h('h3', { text: `自作コア(${defs.length} 件)` }),
        h('p', { class: 'note', text: '設計に取り込んだコア定義です。性能は基準コアの補正を借りた推定(確度:低)。定義を後から編集して既存のブロックに反映する操作はありません(同じ基準の新しい定義として追加し直します)。' }));
      defs.forEach((d) => box.appendChild(h('div', { class: 'lib-item' },
        h('b', { text: d.name }), h('div', { class: 'small', text: `基準: ${d.base.uarch}(${d.base.sourceChip || '出所不明'}) / ダイ上 ${CF().countOfDef(design, d.id)} 個` }),
        cb.onEditDef ? h('div', { class: 'lib-add' }, h('button', { type: 'button', class: 'btn', onclick: () => cb.onEditDef(d) }, 'この定義を元に編集')) : null)));
      el.appendChild(box);
    }
    // ユーザーライブラリ(localStorage 'sds.userCores')の自作コア。設計に追加するたびに定義を設計へコピーする(以後は独立)
    if (cb.onUseUser && CF()) el.appendChild(userBox());
    el.appendChild(msgEl);
    el.appendChild(countEl);
    el.appendChild(listEl);
    refresh();
  }

  root.SDS.ui.library = { renderLibrary };
})(window);
