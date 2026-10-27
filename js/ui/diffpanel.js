// 差分ビュー(設計書 §8.6)。元のチップとの パラメータ差・結果差・要約。ブラウザ専用。計算は SDS.model.diff に任せ、描くだけ。
(function (root) {
  'use strict';
  const { h, clear } = root.SDS.ui.dom;
  const PF = root.SDS.ui.paramform;

  // cb: { onRevert(id, label), onRevertAll() }。ev は現在の評価(evaluate の結果)
  function renderDiff(el, design, ctx, ev, cb) {
    clear(el);
    if (!design || !PF.showDiff(design)) { el.hidden = true; return; }
    el.hidden = false;
    const DF = root.SDS.model.diff;
    const items = DF.paramDiff(design);
    const rd = DF.resultDiff(DF.baseEvaluation(design, ctx), ev);
    const sm = DF.summary(rd);
    const vh = PF.verdictHeadline(sm.verdict, sm.scope);

    el.appendChild(h('h2', { text: '元のチップとの差分' }));

    // 要約と注意帯
    if (!items.length) el.appendChild(h('p', { class: 'note', text: 'まだ変更していません。パラメータ欄で コア数・クロック・L3 を変えると、ここに差が出ます。' }));
    el.appendChild(h('div', { class: `verdict ${vh.cls}`, role: 'status' }, h('b', { text: vh.line }), h('p', { text: sm.text })));
    // 赤い帯は ST の確度が低いとき・校正範囲外のときだけ(MT は常に低いので下の固定の注記で済ませる)
    if (sm.lowConfidence || rd.outOfCalibration.length) {
      const band = h('div', { class: 'low-banner', role: 'note' });
      band.appendChild(h('div', { text: '⚠ 確度が低い予測です。目安として見てください(数値を精密な予測として扱わないでください)。' }));
      if (rd.outOfCalibration.length) {
        band.appendChild(h('div', { text: '校正した範囲の外の変更を含みます:' }));
        band.appendChild(h('ul', {}, rd.outOfCalibration.map((o) => h('li', { text: o.reason }))));
      }
      el.appendChild(band);
    }
    // 楽観側に偏る編集(クロック・コア数・L3 を上げた)のときは常に出す
    if (rd.optimistic) {
      const ob = h('div', { class: 'low-banner', role: 'note' }, h('div', { text: `⚠ ${PF.OPTIMISTIC_NOTE}` }));
      if (rd.optimisticReasons.length) ob.appendChild(h('ul', {}, rd.optimisticReasons.map((t) => h('li', { text: t }))));
      el.appendChild(ob);
    }
    el.appendChild(h('p', { class: 'note', text: PF.MT_ALWAYS_LOW }));

    // パラメータ差
    el.appendChild(h('h3', { text: 'パラメータの差' }));
    if (items.length) {
      const rows = PF.paramDiffRows(items);
      const tb = h('tbody');
      rows.forEach((r) => tb.appendChild(h('tr', {},
        h('td', { text: r.label }), h('td', { text: r.before }), h('td', {}, h('b', { text: r.after })),
        h('td', {}, h('button', { type: 'button', class: 'btn small-btn', 'aria-label': `${r.label} を元に戻す`, onclick: () => cb.onRevert(r.id, `${r.label}を元に戻す`) }, '↶ 元に戻す')))));
      el.appendChild(h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['項目', '元', '編集後', ''].map((x) => h('th', { text: x })))), tb));
      el.appendChild(h('div', { class: 'btnrow' }, h('button', { type: 'button', class: 'btn', onclick: cb.onRevertAll }, '↶ すべて元に戻す')));
    } else el.appendChild(h('p', { class: 'small', text: '変更した項目はありません。' }));

    // 結果差
    el.appendChild(h('h3', { text: '結果の差(予測)' }));
    const rtb = h('tbody');
    PF.resultRows(rd).forEach((r) => {
      rtb.appendChild(h('tr', {}, h('td', { text: r.name }), h('td', { text: r.before }), h('td', {}, h('b', { text: r.after })),
        h('td', { class: r.delta.cls }, h('b', { text: r.delta.text }))));
      if (r.reason) rtb.appendChild(h('tr', {}, h('td', { colspan: '4', class: 'small warn-note', text: r.reason })));
    });
    el.appendChild(h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['項目', '元・シミュレーション (pt)', '編集後 (pt・予測)', '増減'].map((x) => h('th', { text: x })))), rtb));

    // 再計算しないもの(常に明記)
    const why = ev.area && ev.area.recomputedReason ? `(${ev.area.recomputedReason})` : '';
    el.appendChild(h('p', { class: 'caution' }, h('b', { text: PF.NOT_RECOMPUTED }), why ? ` ${why}` : ''));
    el.appendChild(h('p', { class: 'note', text: '編集後の数値は予測で、公開値ではありません。公開値との差は出しません。' }));

    // 元のチップの公開値(参考)
    const bp = (r) => (r.basePublished != null ? r.basePublished.toLocaleString('ja-JP') : '未取得');
    el.appendChild(h('p', { class: 'small', text: `元のチップの公開値(参考): ST ${bp(ev.st)} / MT ${bp(ev.mt)}` }));
  }

  root.SDS.ui.diffpanel = { renderDiff };
})(window);
