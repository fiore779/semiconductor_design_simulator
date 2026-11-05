// 混合設計パネル(設計書 §3.3 C・§8.7)。ダイ寸法・プロセス・部品の一覧(個数とクロック)・使用率。ブラウザ専用。
// 状態は持たず、main.js から渡された値を描く。変更の検証と設計の更新は main.js のコールバック側(design.setDieSize など)。
(function (root) {
  'use strict';
  const { h, clear, more } = root.SDS.ui.dom;
  const MF = root.SDS.ui.mixform;
  const PF = root.SDS.ui.paramform;

  let keepFocusId = null;
  const RETICLE_MM2 = (root.SDS.model && root.SDS.model.compat && root.SDS.model.compat.RETICLE_MM2) || 858;

  // cb: { onDieSize(wStr, hStr), onClock(groupId, str, input), onFitDie()(中身に合わせて最小ダイ。無ければボタンを出さない) }。msgs: { die, ['clock:'+groupId] }。nodes: プロセス一覧
  function renderMix(el, design, ev, cb, msgs, nodes) {
    clear(el);
    el.appendChild(h('h2', { text: '混合設計' }));
    if (!design) return;
    const m = msgs || {};
    const die = (design.dies || [])[0];
    const nodeId = (design.mix && design.mix.nodeId) || (die && die.nodeId) || null;
    const node = (nodes || []).find((n) => n.id === nodeId);

    // ダイ寸法
    if (die) {
      const wI = h('input', { id: 'mx-w', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(die.widthMm), 'aria-label': 'ダイの幅(mm)', 'aria-invalid': m.die ? 'true' : null });
      const hI = h('input', { id: 'mx-h', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: String(die.heightMm), 'aria-label': 'ダイの高さ(mm)', 'aria-invalid': m.die ? 'true' : null });
      const commit = () => { keepFocusId = null; cb.onDieSize(wI.value, hI.value); };
      const onKey = (e) => { if (e.key === 'Enter') { e.target.blur(); } };
      wI.addEventListener('change', commit); hI.addEventListener('change', commit);
      wI.addEventListener('keydown', onKey); hI.addEventListener('keydown', onKey);
      el.appendChild(h('fieldset', { class: 'pgroup' }, h('legend', { text: 'ダイ寸法' }),
        h('div', { class: 'pinput' }, h('label', { for: 'mx-w', class: 'small', text: '幅' }), wI, h('span', { class: 'small', text: '×' }), h('label', { for: 'mx-h', class: 'small', text: '高さ' }), hI, h('span', { class: 'small', text: 'mm' })),
        h('p', { class: 'small', text: `${MF.DIE_MIN_MM}〜${MF.DIE_MAX_MM} mm。小さくするとき、ブロックがはみ出す大きさにはできません` }),
        m.die ? h('p', { class: 'err pmsg', role: 'alert', text: `✗ ${m.die}` }) : null,
        cb.onFitDie ? h('div', { class: 'btnrow' }, h('button', { type: 'button', class: 'btn', id: 'mx-fit', disabled: !die.blocks.length, title: die.blocks.length ? '配置済みブロックの外接矩形(0.1 mm 単位で切り上げ。下限 1 mm)にダイ寸法を合わせる' : 'ブロックがありません', onclick: () => cb.onFitDie() }, '中身に合わせて最小ダイ')) : null,
        die.widthMm * die.heightMm > RETICLE_MM2 + 1e-9 ? h('p', { class: 'small warn-note', role: 'note', text: `⚠ ダイ面積 ${Math.round(die.widthMm * die.heightMm)} mm² は単一ダイの露光上限(約 ${RETICLE_MM2} mm²。出典未取得で要確認)を超えています。チップレット分割は未対応です` }) : null));
    }
    el.appendChild(h('p', { class: 'small' }, 'プロセス: ', h('b', { text: node ? node.name : (nodeId || '未指定') }), '(変更はできません。部品のプロセスが違うと「移植」になります)'));

    // 使用率
    const mix = ev && ev.area && ev.area.mix;
    el.appendChild(h('p', { class: 'mx-util', role: 'status', text: MF.utilizationText(mix) }));

    // 部品の一覧
    const rows = MF.blockGroups(design);
    el.appendChild(h('h3', { text: `部品(${rows.length} 件)` }));
    if (!rows.length) el.appendChild(h('p', { class: 'note', text: 'まだ部品がありません。上の「部品ライブラリ」から追加してください。' }));
    const ul = h('ul', { class: 'mx-parts' });
    rows.forEach((r) => {
      const li = h('li', { class: 'mx-part' },
        h('b', { text: r.kind === 'core' ? `${r.name} ×${r.count}` : r.name }),
        h('div', { class: 'small', text: `出所: ${r.sourceChip || '—'} / 面積: ${r.areaMm2 == null ? '未取得' : `${Math.round(r.areaMm2 * 100) / 100} mm²`}(${MF.areaClassText(r.areaClass, r.portedCount > 0)}${r.portedCount && r.count > 1 ? ` ${r.portedCount}/${r.count} 個` : ''})` }));
      if (r.portLines && r.portLines.length) li.appendChild(h('div', { class: 'small', text: `移植: ${r.portLines[0]}${r.count > 1 ? '(1 個あたり)' : ''}` }));
      if (r.groupId) {
        const id = `mx-clk-${r.groupId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
        const msg = m[`clock:${r.groupId}`];
        const input = h('input', {
          id, type: 'text', inputmode: 'decimal', autocomplete: 'off', value: r.clockGHz == null ? '' : PF.trimNum(r.clockGHz), placeholder: r.clockGHz == null ? '未取得' : null,
          'aria-invalid': msg ? 'true' : null,
          onchange: (e) => { keepFocusId = id; setTimeout(() => { if (keepFocusId === id) keepFocusId = null; }, 0); cb.onClock(r.groupId, e.target.value, e.target); },
          onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        });
        li.appendChild(h('div', { class: 'pinput' }, h('label', { for: id, class: 'small', text: 'クロック' }), input, h('span', { class: 'small', text: 'GHz(0.5〜8)' })));
        if (msg) li.appendChild(h('p', { class: 'err pmsg', role: 'alert', text: `✗ ${msg}` }));
      }
      ul.appendChild(li);
    });
    el.appendChild(ul);
    el.appendChild(more('補足', { key: 'mix:more' },
      h('p', { class: 'note', text: '縦横比の入力・I/O 外周の制約は未実装です。歩留まりは指定したダイ面積で決まります' }),
      h('p', { class: 'note', text: `${MF.SCHEMATIC_NOTE}。` }),
      h('p', { class: 'note', text: 'ブロックの削除は、ダイビューで選んでから下の「プロパティ」欄の削除ボタンで行います。' })));
    if (keepFocusId) {
      const f = el.querySelector(`#${keepFocusId}`);
      if (f) f.focus();
      keepFocusId = null;
    }
  }

  root.SDS.ui.mixpanel = { renderMix };
})(window);
