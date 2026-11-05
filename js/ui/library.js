// 部品ライブラリ(設計書 §8.7、整理: docs/design/ui-cleanup.md §4.2)。左のパーツ欄。C 混合・D 新規のときだけ表示。ブラウザ専用。
// 部品の一覧(blocklib.build の結果)を検索・絞り込みして見せ、[追加] で main.js に渡す。追加の検証・履歴は main.js と design.addPart 側。
// 絞り込み・検索語・表示件数・折りたたみの開閉はこのモジュールが持つ(設計が変わって再描画しても残す。保存はしない)。
(function (root) {
  'use strict';
  const { h, clear, more } = root.SDS.ui.dom;
  const MF = root.SDS.ui.mixform;
  const CF = () => root.SDS.ui.coreform;

  const filter = { isa: '', vendor: '', kind: '', text: '', addableOnly: false };
  const MAX_ROWS = 60; // 一度に描く部品の数(「さらに表示」で +60)
  const uiState = { shown: MAX_ROWS };
  const fold = (s) => String(s == null ? '' : s).normalize('NFKC').toLowerCase();

  // cb: { onAdd(part, { count, capacityMB }), onClone(part)(コアの「複製して編集」。無ければボタンを出さない), onEditDef(def)(自作コアの「この定義を元に編集」) }。msg: 直前の追加の失敗理由(日本語)。nodes: プロセス一覧(事前チェック・検索に使う)
  // env: { uarch(data/uarch.js), areas(data/blocklib.js) }。コアの「複製して編集」の可否の判定に使う(省略時は複製を出さない)
  function renderLibrary(el, design, parts, cb, msg, nodes, env) {
    // 再描画の前にフォーカスのある要素の id を覚える(描画後に戻す)。DOM スタブでは何もしない
    let focusId = null;
    try {
      const ae = typeof document !== 'undefined' ? document.activeElement : null;
      if (ae && ae.id && typeof el.contains === 'function' && el.contains(ae)) focusId = ae.id;
    } catch (e) { focusId = null; }

    clear(el);
    el.appendChild(h('h2', { text: '部品ライブラリ' }));
    el.appendChild(more('使い方・用語', { key: 'lib:help' }, h('p', { class: 'note', text: '実在チップから取り出した部品を、混合設計のダイに追加します。面積の区分: 表(出典あり)/推定(仮の比率)/未取得。「/」キーで検索欄に移動できます。' })));

    const listEl = h('ul', { class: 'lib-list', id: 'lib-list' });
    const countEl = h('p', { class: 'small', id: 'lib-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const msgEl = h('p', { class: 'err pmsg', id: 'lib-msg', role: 'alert' });
    const moreEl = h('div', { class: 'lib-more' });
    const emptyEl = h('p', { class: 'small', id: 'lib-empty' });
    const customHost = h('div', { class: 'lib-box' });
    const userHost = h('div', { class: 'lib-box' });
    const setMsg = (t) => { msgEl.textContent = t ? `✗ ${t}` : ''; msgEl.hidden = !t; };
    setMsg(msg);

    const hl = (text, tokens) => MF.highlightSegments(text, tokens).map((s) => (s.hit ? h('mark', { text: s.text }) : s.text));

    function row(p, tokens) {
      const badge = MF.areaBadge(p);
      const pre = MF.preCheck(design, p, nodes).filter((x) => x.level === 'error');
      const reason = pre.length ? MF.addBlockReason(design, p, nodes) : null;
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
      const meta = `${p.sourceChip || '出所不明'} / ${p.nodeId || 'プロセス未取得'} / ${MF.ISA_LABEL[p.isa] || p.isa || '命令セット不明'}${p.kind === 'core' && p.coreType ? ` / ${p.coreType}` : ''}`;
      return h('li', { class: 'lib-item' + (reason ? ' blocked' : '') },
        h('b', {}, hl(MF.partName(p), tokens)),
        h('div', { class: 'small' }, hl(meta, tokens)),
        h('div', { class: 'lib-meta' },
          h('span', { class: `badge area-${badge.cls}`, title: badge.note || '' }, badge.text),
          badge.cls === 'estimated' ? h('span', { class: 'small warn-note', text: isCore ? ' 仮の比率・P/E の区別なし' : ' 仮の比率' }) : null,
          ci ? h('span', { class: 'small' }, '面積の導出: ', h('span', { class: `badge ${ci.cloneable && ci.derivable ? 'area-table' : 'area-unknown'}`, text: ci.cloneable && ci.derivable ? '可' : '不可' }), ci.cloneable ? (ci.derivable ? '' : ` ${ci.derivReason}`) : ` 複製できません: ${ci.reason}`) : null),
        reason ? h('p', { class: 'small err lib-block', role: 'note', title: pre[0].text }, `⚠ ${reason}`) : null,
        h('div', { class: 'lib-add' },
          input ? h('label', { class: 'small', for: input.id }, isCore ? '個数 ' : '容量 ') : null, input, isL3 ? h('span', { class: 'small', text: 'MB' }) : null,
          h('button', { type: 'button', class: 'btn', id: `${idBase}-add`, disabled: !design || pre.length > 0, title: pre.length ? pre[0].text : null, onclick: add }, '追加'),
          ci ? h('button', { type: 'button', class: 'btn', id: `${idBase}-clone`, disabled: !design || !ci.cloneable || pre.length > 0, title: !ci.cloneable ? ci.reason : (pre.length ? pre[0].text : '複製して発行幅・ROB・L2・クロック・SMT を編集する(自作コア)'), onclick: () => cb.onClone(p) }, '複製して編集') : null));
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
    // 検索語(tokens)が自作コアの定義に当てはまるか。空なら全件
    const defMatches = (d, tokens) => {
      if (!tokens.length) return true;
      const b = d.base || {};
      const hay = fold([d.name, b.uarch, b.sourceChip, b.isa].map((s) => (s == null ? '' : s)).join('\n'));
      return tokens.every((t) => hay.includes(t));
    };
    const countSuffix = (tokens, m) => (tokens.length ? `・一致 ${m} 件` : '');

    // 設計に取り込んだコア定義(折りたたみ)。設計内に無ければ null
    function customBox(tokens) {
      const defs = (design && design.coreDefs) || [];
      if (!defs.length || !CF()) return null;
      const shown = defs.filter((d) => defMatches(d, tokens));
      return more(`自作コア(${defs.length} 件)${countSuffix(tokens, shown.length)}`, { key: 'lib:custom', cls: 'lib-custom' },
        h('p', { class: 'note', text: '設計に取り込んだコア定義です。性能は基準コアの補正を借りた推定(確度:低)。定義を後から編集して既存のブロックに反映する操作はありません(同じ基準の新しい定義として追加し直します)。' }),
        shown.map((d) => h('div', { class: 'lib-item' },
          h('b', { text: d.name }), h('div', { class: 'small', text: `基準: ${d.base.uarch}(${d.base.sourceChip || '出所不明'}) / ダイ上 ${CF().countOfDef(design, d.id)} 個` }),
          cb.onEditDef ? h('div', { class: 'lib-add' }, h('button', { type: 'button', class: 'btn', onclick: () => cb.onEditDef(d) }, 'この定義を元に編集')) : null)));
    }
    // ユーザーライブラリ(localStorage 'sds.userCores')の自作コア(折りたたみ)。設計に追加するたびに定義を設計へコピーする(以後は独立)
    function userBox(tokens) {
      if (!cb.onUseUser || !CF()) return null;
      const st = cb.userCores || { ok: false, reason: '保存状態を取得できません' };
      const cores = st.ok ? st.cores : [];
      const shown = cores.filter((e) => defMatches(e.def, tokens));
      const kids = [h('p', { class: 'note', text: 'ブラウザ(localStorage)に保存した自作コアです。「設計に追加」するたびに定義が設計へコピーされ、以後は独立します(ライブラリを削除・変更しても追加済みのブロックは変わりません)。同名のコアを登録すると「名前 (2)」の別のコアとして追加されます。性能は基準コアの補正を借りた推定(確度:低)。' })];
      if (!st.ok) kids.push(h('p', { class: 'small err', role: 'note' }, `⚠ ${st.reason}${st.unavailable ? '。保存と取り込みは使えません(JSON 書き出しのみ可)' : ''}`));
      shown.forEach((e) => {
        const d = e.def; const idb = `lib-user-${String(e.id).replace(/[^A-Za-z0-9_-]/g, '_')}`;
        const n = h('input', { id: `${idb}-n`, type: 'text', inputmode: 'numeric', value: '1', autocomplete: 'off', 'aria-label': `${d.name} の個数` });
        kids.push(h('div', { class: 'lib-item' },
          h('b', { text: d.name }), h('div', { class: 'small', text: `基準: ${d.base.uarch}(${d.base.sourceChip || '出所不明'}) / 登録 ${e.savedAt ? e.savedAt.slice(0, 16).replace('T', ' ') : '日時不明'}` }),
          h('div', { class: 'lib-add' },
            h('label', { class: 'small', for: n.id }, '個数 '), n,
            h('button', { type: 'button', class: 'btn', id: `${idb}-add`, disabled: !design, onclick: () => { const r = MF.parseCount(n.value); if (!r.ok) { setMsg(r.reason); return; } setMsg(''); cb.onUseUser(e, r.value); } }, '設計に追加'),
            cb.onExportUser ? h('button', { type: 'button', class: 'btn', onclick: () => cb.onExportUser(e) }, 'JSON 書き出し') : null,
            h('button', { type: 'button', class: 'btn', onclick: () => confirmDelete(e) }, '削除'))));
      });
      if (st.ok && !cores.length) kids.push(h('p', { class: 'small', text: '保存したコアはありません。コアエディタの[ライブラリに登録]か、下の JSON 取り込みで追加できます。' }));
      else if (st.ok && tokens.length && !shown.length) kids.push(h('p', { class: 'small', text: '検索語に一致する保存済みのコアはありません。' }));
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
      kids.push(h('div', { class: 'lib-add' }, h('label', { class: 'small', for: 'lib-user-file' }, 'JSON 取り込み(通信なし) '), file));
      return more(`ユーザーライブラリの自作コア(${cores.length} 件)${countSuffix(tokens, shown.length)}`, { key: 'lib:user', cls: 'lib-custom lib-user' }, kids);
    }

    // ---- 検索行・絞り込み(作り直さない部品。入力中にフォーカスを失わない) ----
    const clearBtn = h('button', { type: 'button', class: 'lib-clear', id: 'lib-clear', 'aria-label': '検索語を消す', title: '検索語を消す(Esc)' }, '×');
    clearBtn.hidden = !filter.text;
    const searchEl = h('input', { id: 'lib-search', type: 'search', value: filter.text, placeholder: '部品を検索(例: Zen 5 / M1 / Arm / N4)', autocomplete: 'off', spellcheck: 'false', 'aria-controls': 'lib-list' });
    const selEls = {};
    const addableEl = h('input', { type: 'checkbox', id: 'lib-addable', checked: filter.addableOnly });

    const focusFirstButton = (li) => {
      if (!li || typeof li.querySelector !== 'function') return;
      const b = li.querySelector('button:not([disabled])');
      if (b && typeof b.focus === 'function') b.focus();
    };
    const focusSearch = () => { if (typeof searchEl.focus === 'function') searchEl.focus(); };
    const setText = (t) => { filter.text = t; searchEl.value = t; uiState.shown = MAX_ROWS; refresh(); };
    searchEl.addEventListener('input', (e) => { filter.text = e.target.value; uiState.shown = MAX_ROWS; refresh(); });
    searchEl.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return; // IME の変換中の Enter/Esc は無視する
      if (e.key === 'Escape') {
        if (filter.text) setText(''); else if (typeof searchEl.blur === 'function') searchEl.blur();
        if (e.preventDefault) e.preventDefault();
      } else if (e.key === 'Enter') {
        focusFirstButton(listEl.firstChild);
      }
    });
    clearBtn.addEventListener('click', () => { setText(''); focusSearch(); });
    addableEl.addEventListener('change', (e) => { filter.addableOnly = !!e.target.checked; uiState.shown = MAX_ROWS; refresh(); });

    const sel = (label, key, opts) => {
      const s = h('select', { onchange: (e) => { filter[key] = e.target.value; uiState.shown = MAX_ROWS; refresh(); } }, opts.map(([v, t]) => h('option', { value: v, selected: filter[key] === v }, t)));
      selEls[key] = s;
      return h('label', { class: 'libf' }, label, s);
    };

    function clearAll() {
      filter.isa = ''; filter.vendor = ''; filter.kind = ''; filter.text = ''; filter.addableOnly = false;
      uiState.shown = MAX_ROWS;
      searchEl.value = ''; addableEl.checked = false;
      Object.keys(selEls).forEach((k) => { selEls[k].value = ''; });
      refresh(); focusSearch();
    }

    function refresh() {
      const tokens = MF.searchTokens(filter.text);
      let res = MF.filterParts(parts, filter, { nodes });
      let hidden = 0;
      if (filter.addableOnly) { const ok = res.filter((p) => MF.isAddable(design, p, nodes)); hidden = res.length - ok.length; res = ok; }
      res = MF.relevanceSort(res, tokens);
      const visible = Math.min(uiState.shown, res.length);
      clear(listEl);
      res.slice(0, visible).forEach((p) => listEl.appendChild(row(p, tokens)));
      const hasCondition = !!(tokens.length || filter.isa || filter.vendor || filter.kind);
      countEl.textContent = MF.libCountText({ matched: res.length, total: parts.length, visible, hasCondition, addableOnly: filter.addableOnly, hiddenByAddable: hidden });
      clearBtn.hidden = !filter.text;
      // 残りがあるときの「さらに表示」
      clear(moreEl);
      const remain = res.length - visible;
      moreEl.hidden = remain <= 0;
      if (remain > 0) {
        moreEl.appendChild(h('button', { type: 'button', class: 'btn', id: 'lib-more-btn', onclick: () => {
          const old = visible; uiState.shown += MAX_ROWS; refresh();
          const grown = listEl.children && listEl.children.length > old ? listEl.children[old] : null;
          if (grown && typeof grown.querySelector === 'function' && grown.querySelector('button:not([disabled])')) { focusFirstButton(grown); return; }
          // 増えた行に押せるボタンが無いときは、新しい「さらに表示」(無ければ増えた行の先頭)へフォーカスを移す
          const next = typeof el.querySelector === 'function' ? el.querySelector('#lib-more-btn') : null;
          const t = next || grown;
          if (t && typeof t.focus === 'function') { if (!next && t.setAttribute) t.setAttribute('tabindex', '-1'); t.focus(); }
        } },`さらに ${Math.min(MAX_ROWS, remain)} 件表示(残り ${remain} 件)`));
      }
      // 0 件の案内
      clear(emptyEl);
      const none = res.length === 0;
      emptyEl.hidden = !none;
      if (none) {
        if (!parts.length) emptyEl.appendChild(document.createTextNode('部品がありません'));
        else {
          emptyEl.appendChild(document.createTextNode(MF.emptyText(filter, filter.addableOnly) + ' '));
          emptyEl.appendChild(h('button', { type: 'button', class: 'linkbtn', id: 'lib-clearall', onclick: clearAll }, '条件をすべてクリア'));
        }
      }
      // 自作コアの 2 つの箱にも検索語を効かせる
      clear(customHost); const cb1 = customBox(tokens); if (cb1) customHost.appendChild(cb1);
      clear(userHost); const ub = userBox(tokens); if (ub) userHost.appendChild(ub);
    }

    el.appendChild(h('div', { class: 'lib-sticky' },
      h('div', { class: 'lib-search', role: 'search', 'aria-label': '部品の検索' },
        h('label', { class: 'visually-hidden', for: 'lib-search' }, '部品を検索'), searchEl, clearBtn),
      countEl));
    el.appendChild(h('div', { class: 'lib-filters' },
      sel('命令セット', 'isa', MF.ISA_OPTIONS),
      sel('メーカー', 'vendor', [['', 'すべて']].concat(MF.vendorsOf(parts).map((v) => [v, v]))),
      sel('種類', 'kind', MF.KIND_OPTIONS),
      h('label', { class: 'lib-addable' }, addableEl, ' 追加できるものだけ')));
    el.appendChild(customHost);
    el.appendChild(userHost);
    el.appendChild(msgEl);
    el.appendChild(listEl);
    el.appendChild(moreEl);
    el.appendChild(emptyEl);
    refresh();

    // 再描画前にフォーカスがあった要素へ戻す(無ければ何もしない)
    if (focusId && typeof el.querySelector === 'function') {
      try {
        const t = el.querySelector(`[id="${String(focusId).replace(/"/g, '')}"]`);
        if (t && typeof t.focus === 'function') {
          t.focus();
          if (t === searchEl && typeof t.setSelectionRange === 'function') t.setSelectionRange(t.value.length, t.value.length);
        }
      } catch (e) { /* フォーカス復帰の失敗は無視 */ }
    }
  }

  root.SDS.ui.library = { renderLibrary };
})(window);
