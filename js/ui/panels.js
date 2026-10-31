// 下部パネル: プロパティ・履歴・検証(設計書 §8・§9・§8.12)。ブラウザ専用。状態は持たず、main.js から渡された値を描く。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
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
    el.appendChild(h('div', { class: 'btnrow' },
      h('button', { type: 'button', class: 'btn', disabled: !history.canUndo(), onclick: onUndo }, '↶ 元に戻す'),
      h('button', { type: 'button', class: 'btn', disabled: !history.canRedo(), onclick: onRedo }, '↷ やり直す')));
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
    const ul = h('ul', { class: 'warns' });
    items.forEach((w) => ul.appendChild(h('li', { class: `w-${w.level}` }, w.clickable
      ? h('button', { type: 'button', class: 'linkbtn', title: 'クリックでこのブロックを選択', onclick: () => onPick(w.blockId) }, w.label)
      : h('span', { text: w.label }))));
    el.appendChild(ul);
  }

  root.SDS.ui.panels = { renderProps, renderHistory, renderValidation, findBlock };
})(window);
