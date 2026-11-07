// パッケージ設定パネル(設計書 §8.10)。冷却・基板・電力制限。ブラウザ専用。状態は持たず、main.js から渡された値を描く。
// 変更の検証と設計の更新は main.js のコールバック側(DS.setCooling など)で行い、失敗の理由は msg に入れて渡す。
(function (root) {
  'use strict';
  const { h, clear, more } = root.SDS.ui.dom;
  const PK = root.SDS.ui.packageform;

  // cb: { onCooling(id), onSubstrate(id), onPowerLimit(str, input) }。msgs: { cooling, substrate, limit }
  function renderPackage(el, design, cb, msgs, peakItem, range) {
    clear(el);
    el.appendChild(h('h2', { text: 'パッケージ設定' }));
    if (!design) { el.appendChild(h('p', { class: 'note', text: '設計を読み込むと、冷却・基板・電力制限を設定できます。' })); return; }
    const D = root.SDS_DATA || {};
    const cooling = D.cooling || []; const subs = D.substrates || [];
    const pkg = design.package || { coolingId: '', substrateId: '', powerLimitW: null };
    const m = msgs || {};
    const msgEl = (id, text) => (text ? h('p', { class: 'err pmsg', id, role: 'alert', text: `✗ ${text}` }) : null);
    el.appendChild(more('補足', { key: 'pkg:more' },
      h('p', { class: 'note', text: '環境の設定です。再現モード(ロック中)でも変更できます。' }),
      h('p', { class: 'small warn-note', text: `⚠ ${PK.COOLING_NOTE}` })));

    // 冷却
    const cSel = h('select', {
      id: 'pk-cooling', 'aria-describedby': m.cooling ? 'pk-cooling-msg' : null, 'aria-invalid': m.cooling ? 'true' : null,
      onchange: (e) => cb.onCooling(e.target.value),
    }, cooling.map((c) => h('option', { value: c.id, selected: c.id === pkg.coolingId }, PK.coolingOptionText(c))));
    const cur = cooling.find((c) => c.id === pkg.coolingId);
    if (!cur) cSel.appendChild(h('option', { value: pkg.coolingId, selected: true }, `${pkg.coolingId}(一覧に無い)`));
    el.appendChild(h('div', { class: 'pfield' }, h('label', { for: 'pk-cooling', text: '冷却' }), cSel,
      cur ? h('p', { class: 'small', text: `周囲 ${cur.tAmbC} ℃ / Tj 上限 ${cur.tjMaxC} ℃` }) : null,
      msgEl('pk-cooling-msg', m.cooling)));

    // 基板
    const sSel = h('select', {
      id: 'pk-substrate', 'aria-describedby': m.substrate ? 'pk-substrate-msg' : null, 'aria-invalid': m.substrate ? 'true' : null,
      onchange: (e) => cb.onSubstrate(e.target.value),
    }, subs.map((s) => h('option', { value: s.id, selected: s.id === pkg.substrateId }, s.name)));
    const sub = subs.find((s) => s.id === pkg.substrateId);
    if (!sub) sSel.appendChild(h('option', { value: pkg.substrateId, selected: true }, `${pkg.substrateId}(一覧に無い)`));
    const dl = h('dl', { class: 'subprops' });
    PK.substrateRows(sub).forEach((r) => {
      dl.appendChild(h('dt', { text: r.label }));
      dl.appendChild(h('dd', {}, h('span', { text: r.text }), ' ', h('span', { class: `badge src-${r.badge.kind}`, title: '値の区分', text: `[${r.badge.text}]` }), r.note ? h('span', { class: 'small', text: ` ${r.note}` }) : null));
    });
    el.appendChild(h('div', { class: 'pfield' }, h('label', { for: 'pk-substrate', text: '基板' }), sSel, dl, msgEl('pk-substrate-msg', m.substrate)));

    // TDP(公表の設定範囲があるチップだけ。範囲内で選ぶ。空欄=既定=範囲の上限)
    if (range && typeof range.minW === 'number' && typeof range.maxW === 'number') {
      el.appendChild(h('div', { class: 'pfield' },
        h('label', { for: 'pk-tdp', text: `TDP(設定範囲 ${range.minW}〜${range.maxW} W。空欄=上限)` }),
        h('div', { class: 'pinput' }, h('input', {
          id: 'pk-tdp', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: pkg.tdpW == null ? '' : String(pkg.tdpW),
          placeholder: `${range.maxW}`, 'aria-invalid': m.tdp ? 'true' : null, 'aria-describedby': m.tdp ? 'pk-tdp-msg' : null,
          onchange: (e) => cb.onTdp(e.target.value, e.target),
          onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        }), h('span', { class: 'small', text: 'W' })),
        h('p', { class: 'small', text: '選ぶと電力制限も同じ値になります。MT の持続クロック係数は 60W 以下/超の 2 段階でしか変わりません(モバイル PC のみ)。既定以外では公開値との比較は出しません。' }),
        msgEl('pk-tdp-msg', m.tdp)));
    }

    // 電力制限
    el.appendChild(h('div', { class: 'pfield' },
      h('label', { for: 'pk-limit', text: '電力制限(空欄=制限なし)' }),
      h('div', { class: 'pinput' }, h('input', {
        id: 'pk-limit', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: pkg.powerLimitW == null ? '' : String(pkg.powerLimitW),
        placeholder: '制限なし', 'aria-invalid': m.limit ? 'true' : null, 'aria-describedby': m.limit ? 'pk-limit-msg' : null,
        onchange: (e) => cb.onPowerLimit(e.target.value, e.target),
        onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
      }), h('span', { class: 'small', text: 'W (1〜1000)' })),
      PK.powerLimitSourceText(pkg, peakItem) ? h('p', { class: 'small', text: PK.powerLimitSourceText(pkg, peakItem) }) : null,
      msgEl('pk-limit-msg', m.limit)));
  }

  root.SDS.ui.packagepanel = { renderPackage };
})(window);
