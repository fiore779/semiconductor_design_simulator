// 下部パネル: プロパティ・履歴・検証(設計書 §8・§9・§8.12)。ブラウザ専用。状態は持たず、main.js から渡された値を描く。
(function (root) {
  'use strict';
  const { h, clear, more } = root.SDS.ui.dom;
  const WN = root.SDS.ui.warnings;

  const KIND_NAME = { core: 'コア', l3: 'L3 キャッシュ', gpu: 'GPU', uncore: 'SoC / I/O', npu: 'NPU' };

  function findBlock(design, id) {
    for (const d of design.dies) { const b = d.blocks.find((x) => x.id === id); if (b) return { die: d, block: b }; }
    return null;
  }

  // プロパティ。sel: 選択中の block id 配列。onEdit(blockId, field, value) は main.js が履歴に積む。
  function renderProps(el, design, sel, onEdit, msg, extra) {
    clear(el);
    el.appendChild(h('h3', { text: 'プロパティ' }));
    if (!sel.length) { el.appendChild(h('p', { class: 'note', text: 'ブロックを選ぶと、種別と位置・大きさを数値で編集できます。' })); return; }
    if (sel.length > 1) { el.appendChild(h('p', { text: `${sel.length} 個のブロックを選択中(複数選択の数値編集は未対応)` })); return; }
    const hit = findBlock(design, sel[0]);
    if (!hit) { el.appendChild(h('p', { class: 'note', text: '選択中のブロックが見つかりません。' })); return; }
    const { die, block } = hit;
    el.appendChild(h('p', {}, h('b', { text: block.label }), ` — 種別: ${KIND_NAME[block.kind] || block.kind}${block.coreType ? `(${block.coreType})` : ''} / ダイ: ${die.name}`));
    if (block.schematic) el.appendChild(h('p', { class: 'note', text: '模式図: 大きさと位置は実チップのフロアプランではありません。' }));
    if (die.layout && root.SDS.model && root.SDS.model.floorplan) el.appendChild(h('p', { class: 'note', text: root.SDS.model.floorplan.scaleText(die.layout) + (die.layout.scaleNote ? `(根拠: ${die.layout.scaleNote})` : '') }));
    if (block.decorative) el.appendChild(h('p', { class: 'note', text: '飾りブロック: 見た目だけで、性能・電力・面積・温度の計算には影響しません。' }));
    const grid = h('div', { class: 'propgrid' });
    [['x', 'x'], ['y', 'y'], ['w', '幅 w'], ['h', '高さ h']].forEach(([f, lab]) => {
      const id = `prop-${f}`;
      grid.appendChild(h('label', { for: id, text: `${lab} (mm)` }));
      grid.appendChild(h('input', {
        id, type: 'number', step: '0.1', value: String(Math.round(block[f] * 1000) / 1000),
        onchange: (e) => onEdit(block.id, f, parseFloat(e.target.value), e.target, String(block[f])),
      }));
    });
    el.appendChild(grid);
    if (msg) el.appendChild(h('p', { class: 'err', role: 'alert', text: `✗ ${msg}` }));
    // 混合設計: 出所・面積の区分と削除。extra: { onRemove(blockId), origin(block) → 文字列 }
    if (extra) {
      if (extra.origin) el.appendChild(h('p', { class: 'small', text: extra.origin(block) }));
      if (extra.onRemove) el.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => extra.onRemove(block.id) }, 'このブロックを削除'));
    }
  }

  function renderHistory(el, history, onJump, onUndo, onRedo) {
    clear(el);
    el.appendChild(h('h3', { text: '履歴' }));
    // 元に戻す/やり直すはツールバーにあるため、ここには置かない(onUndo・onRedo は呼び出し側との互換のため受け取るだけ)
    const ol = h('ol', { class: 'hist', start: '0' });
    history.list().forEach((it) => ol.appendChild(h('li', {}, h('button', {
      type: 'button', class: 'hist-item' + (it.current ? ' cur' : ''), 'aria-current': it.current ? 'step' : null, onclick: () => onJump(it.index),
    }, `${it.index}. ${it.label}`, it.current ? ' ◀ 現在' : ''))));
    el.appendChild(ol);
  }

  function renderValidation(el, warnings, onPick) {
    clear(el);
    const items = WN.decorate(warnings); const c = WN.counts(warnings);
    el.appendChild(h('h3', {}, '検証 ', h('span', { class: 'small', text: `✗ ${c.error} / ⚠ ${c.warn} / ⓘ ${c.info}` })));
    if (!items.length) { el.appendChild(h('p', { text: '問題は見つかりませんでした。' })); return; }
    const li = (w) => h('li', { class: `w-${w.level}` }, w.clickable
      ? h('button', { type: 'button', class: 'linkbtn', title: 'クリックでこのブロックを選択', onclick: () => onPick(w.blockId) }, w.label)
      : h('span', { text: w.label }));
    // error・warn は常に見せ、info は折りたたむ(件数は見出しにも出ている)
    const main = items.filter((w) => w.level !== 'info');
    const infos = items.filter((w) => w.level === 'info');
    if (main.length) el.appendChild(h('ul', { class: 'warns' }, main.map(li)));
    if (infos.length) el.appendChild(more(`ⓘ 情報 ${infos.length} 件`, { key: 'val:info' }, h('ul', { class: 'warns' }, infos.map(li))));
  }

  // ブロック詳細カード(2026-11-16)。ダイビューの上に重ねる浮動カードの制御。内容の整形は blockinfo(純関数)。
  // el: カードの要素(role=region・aria-live は index.html)。deps: { getState() → { design, evalResult, ctx }, onClose?() }。
  // sync(ids): main.js の renderProps から毎回呼ぶ。選択が変わったら開き(複数選択は『N 個選択中』だけ)、同じ選択なら内容だけ更新する(×で閉じた後は、選択が変わるまで開き直さない)。
  function createBlockCard(el, deps) {
    let sel = []; let open = false; let lastKey = null;
    const keyOf = (ids) => ids.join(',');
    function hide() { el.hidden = true; clear(el); lastKey = null; }
    function render() {
      const st = deps.getState() || {};
      if (!open || !sel.length || !st.design) { hide(); return; }
      const BI = root.SDS.ui.blockinfo;
      let info = null; let err = null;
      try { info = BI ? BI.describeSelection(st.design, st.evalResult, sel, st.ctx) : null; } catch (e) { err = e && e.message ? e.message : String(e); }
      const key = keyOf(sel);
      const top = key === lastKey ? el.scrollTop : 0;
      clear(el); el.hidden = false; lastKey = key;
      el.appendChild(h('div', { class: 'bc-head' },
        h('h3', { class: 'bc-title', text: err ? 'ブロック詳細' : (info ? info.title : 'ブロック詳細') }),
        h('button', { type: 'button', class: 'btn small-btn bc-close', 'aria-label': 'ブロック詳細を閉じる', title: '閉じる (Esc)', onclick: () => close() }, '×')));
      if (err) { el.appendChild(h('p', { class: 'note', text: `詳細を表示できませんでした: ${err}` })); return; }
      if (!info) { el.appendChild(h('p', { class: 'note', text: '詳細がありません。' })); return; }
      if (info.subtitle) el.appendChild(h('p', { class: 'note bc-sub', text: info.subtitle }));
      if (info.multi) { el.appendChild(h('p', { text: '1 個だけ選ぶと、そのブロックの詳細を表示します。' })); return; }
      info.sections.forEach((sec) => {
        const dl = h('dl', { class: 'bc-sec' });
        sec.rows.forEach((r) => dl.appendChild(h('div', { class: 'bc-row' },
          h('dt', { text: r.label }),
          h('dd', {}, r.value, r.tag ? h('span', { class: 'badge bc-tag', dataset: { tag: r.tag }, text: `[${r.tag}]` }) : null, r.note ? h('div', { class: 'bc-note', text: r.note }) : null))));
        el.appendChild(h('h4', { class: 'bc-h', text: sec.heading }));
        el.appendChild(dl);
      });
      el.scrollTop = top;
    }
    function select(ids) { sel = (ids || []).slice(); open = sel.length > 0; render(); }
    function refresh() { render(); }
    function sync(ids) { const a = (ids || []).slice(); if (keyOf(a) !== keyOf(sel)) select(a); else render(); }
    function close() { if (!open) return; open = false; hide(); if (deps.onClose) deps.onClose(); }
    function isOpen() { return open && sel.length > 0 && !el.hidden; }
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); close(); } });
    hide();
    return { select, refresh, sync, close, isOpen };
  }

  // ダイビュー左上の型番表示(2026-11-16)。プリセット選択画面の行と同じ表記(presetlist.viewCaption)。設計が無ければ隠す。edited は PF.isEdited(design)
  function renderViewCaption(el, design, ctx, edited) {
    const cap = design ? root.SDS.ui.presetlist.viewCaption(design, ctx, ctx.gb7ByName, !!edited) : null;
    clear(el); el.hidden = !cap;
    if (!cap) { el.removeAttribute('aria-label'); return null; }
    el.setAttribute('aria-label', `設計の型番: ${cap.name}${cap.text}`);
    el.appendChild(h('b', { text: cap.name }));
    el.appendChild(h('span', { class: 'small', title: cap.title, text: cap.text }));
    return cap;
  }

  root.SDS.ui.panels = { renderProps, renderHistory, renderValidation, findBlock, createBlockCard, renderViewCaption };
})(window);
