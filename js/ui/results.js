// 結果パネルと再現度パネル(設計書 §8.5・§8.11)。ブラウザ専用。evaluate の結果を描くだけで、計算はしない。
// 精度の見せ方: 確度は必ず記号+文字で示す。MT は「低」を目立たせる。未取得は「未取得」と書く。
(function (root) {
  'use strict';
  const { h, clear, num, diff } = root.SDS.ui.dom;
  const PL = root.SDS.ui.presetlist;
  const RP = root.SDS.ui.reproduce;

  const CONF = { high: ['▲', '高'], medium: ['◆', '中'], low: ['▼', '低'] };
  function confBadge(c) {
    if (!c) return h('span', { class: 'badge conf-none', text: '確度: —' });
    return h('span', { class: `badge conf-${c}`, title: '推定の確度(校正データの量・質による)' }, `確度 ${CONF[c][0]} ${CONF[c][1]}`);
  }
  function srcBadge(s) { return h('span', { class: `badge src-${s || 'none'}`, title: '値の区分' }, `[${PL.sourceLabel(s)}]`); }
  function note(text, cls) { return h('p', { class: 'note' + (cls ? ' ' + cls : '') }, text); }

  function perfCard(title, r, extra) {
    const body = [];
    if (r.ok) {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val', text: Math.round(r.score).toLocaleString('ja-JP') }), h('span', { class: 'unit', text: ' pt(シミュレーション)' })));
    } else {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val na', text: '—' }), h('span', { class: 'unit', text: ' 計算できません' })));
      body.push(note(`理由: ${r.reason}`));
    }
    if (r.published != null) {
      body.push(h('div', { class: 'row' }, h('span', { text: '公開値 ' }), h('b', { text: r.published.toLocaleString('ja-JP') }), ' ', h('span', { class: 'badge', text: r.publishedKind || '' })));
      if (r.ok) body.push(h('div', { class: 'row' }, h('span', { text: '公開値との差 ' }), h('b', { text: diff(r.errPct) })));
    } else body.push(h('div', { class: 'row' }, '公開値: ', h('b', { text: '未取得' }), '(比較しません)'));
    if (r.ok && r.isCalibSample) body.push(note('校正に使った代表 SKU です。公開値と近いのは当然で、検証ではありません。', 'warn-note'));
    else if (r.ok && r.calibNotUsedForMt) body.push(note('ST の補正には使ったが、MT の σ の合わせには使っていない SKU です。', 'warn-note'));
    (extra || []).forEach((e) => body.push(e));
    return h('section', { class: `card conf-card-${r.ok ? r.confidence : 'none'}`, 'aria-label': title },
      h('header', {}, h('h3', { text: title }), r.ok ? confBadge(r.confidence) : confBadge(null)), body);
  }

  function renderResults(el, ev) {
    clear(el);
    el.appendChild(h('p', { class: 'caution' }, '概算です。ブロックの配置を動かしても、下の数値は変わりません(今回の編集は配置のみで、評価は元のチップの構成から計算しています)。'));
    // ST
    const stExtra = [];
    if (ev.st.ok && ev.st.corrSource === 'isa') stExtra.push(note('専用の補正が無く、命令セット平均で代用(確度低)', 'warn-note'));
    if (ev.st.ok && ev.st.fallback) stExtra.push(note('in-order コアの IPC は根拠のない仮の値です', 'warn-note'));
    el.appendChild(perfCard('シングル性能 (GB7 ST)', ev.st, stExtra));
    // MT
    const mtExtra = [];
    if (ev.mt.ok) {
      mtExtra.push(h('p', { class: 'low-banner' }, '▼ マルチ性能の確度は「低」です。この数値を精密な予測として扱わないでください。'));
      mtExtra.push(note('並列効率 σ は AMD の代表 3 件だけで合わせ、SMT 効果 γ は未校正、メモリ帯域の頭打ちは未実装です。'));
      if (ev.mt.mixedClock) mtExtra.push(note('一部コアのブーストクロックが未取得で基本クロックを使っており、数値が歪んでいます。', 'warn-note'));
      if (ev.mt.fallback) mtExtra.push(note('in-order コアの仮の IPC を含むため信頼できません。', 'warn-note'));
    }
    el.appendChild(perfCard('マルチ性能 (GB7 MT)', ev.mt, mtExtra));
    // 面積
    const a = ev.area;
    const aBody = [h('div', { class: 'big' }, h('span', { class: a.totalMm2 == null ? 'val na' : 'val', text: a.totalMm2 == null ? '未取得' : a.totalMm2.toFixed(1) }), h('span', { class: 'unit', text: a.totalMm2 == null ? '' : ' mm²' + (a.totalIsPartial ? '(一部のダイのみ)' : '') }))];
    if (a.reason) aBody.push(note(a.reason, a.totalIsPartial ? 'warn-note' : ''));
    const tbl = h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, h('th', { text: 'ダイ' }), h('th', { text: '面積' }), h('th', { text: '歩留まり' }))));
    const tb = h('tbody');
    a.dies.forEach((d) => tb.appendChild(h('tr', {},
      h('td', { text: d.name }),
      h('td', {}, d.known ? [d.mm2.toFixed(1) + ' mm² ', srcBadge(d.source)] : [h('b', { text: '未取得' }), d.note ? ` (${d.note})` : '']),
      h('td', { title: d.yield.reason || '' }, d.yield.value != null ? [(d.yield.value * 100).toFixed(1) + '% ', srcBadge(d.yield.d0Source)] : '未取得'))));
    tbl.appendChild(tb); aBody.push(tbl);
    aBody.push(h('div', { class: 'row' }, '全体の歩留まり: ', h('b', { text: a.yield != null ? (a.yield * 100).toFixed(1) + '%' : '未取得' }), a.yield == null && a.yieldReason ? ` (${a.yieldReason})` : ''));
    if (a.yield != null) aBody.push(note('歩留まりは Poisson モデルと欠陥密度の二次推定値による概算です。'));
    aBody.push(note('ブロックの大きさと配置は模式図です。実チップのフロアプランではありません。'));
    el.appendChild(h('section', { class: 'card', 'aria-label': 'ダイ面積' }, h('header', {}, h('h3', { text: 'ダイ面積' })), aBody));
    // 電力
    const pw = ev.power.published;
    const pBody = [h('p', { class: 'low-banner' }, '電力モデルは未校正です。計算した消費電力は表示せず、公表値だけを示します。')];
    const prow = (label, v) => v && pBody.push(h('div', { class: 'row' }, `${label}: `, h('b', { text: v.minW != null ? `${v.minW}〜${v.maxW} W` : `${v.w} W` }), ' ', v.s !== undefined ? srcBadge(v.s) : '', v.note ? h('span', { class: 'small', text: ` (${v.note})` }) : ''));
    prow('基準(TDP/PBP)', pw.base); prow('ピーク', pw.peak);
    if (pw.range) pBody.push(h('div', { class: 'row' }, '設定範囲: ', h('b', { text: `${pw.range.minW}〜${pw.range.maxW} W` })));
    if (ev.power.reason) pBody.push(h('div', { class: 'row' }, '公表値: ', h('b', { text: '未取得' }), ` (${ev.power.reason})`));
    el.appendChild(h('section', { class: 'card', 'aria-label': '消費電力(公表値)' }, h('header', {}, h('h3', { text: '消費電力(公表値のみ)' }), h('span', { class: 'badge conf-none', text: 'モデル未校正' })), pBody));
  }

  function renderRepro(el, ev) {
    clear(el);
    el.appendChild(h('h3', { text: '再現度(公開値との比較)' }));
    el.appendChild(h('p', { class: 'note', text: `性能の許容は ±${ev.tolerance * 100}%。公開値が無い項目は判定しません。` }));
    const t = h('table', { class: 'repro' }, h('thead', {}, h('tr', {}, ['項目', '公開値', 'シミュレーション', '差', '判定'].map((x) => h('th', { text: x })))));
    const tb = h('tbody');
    RP.reproductionRows(ev).forEach((r) => {
      const pubTxt = r.published == null ? '未取得' : (typeof r.published === 'number' ? r.published.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) : r.published);
      tb.appendChild(h('tr', { class: `v-${r.verdict}` },
        h('td', { text: r.label }), h('td', { text: pubTxt }),
        h('td', { text: r.sim == null ? '—' : r.sim.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) }),
        h('td', { text: r.diffPct == null ? '—' : diff(r.diffPct) }),
        h('td', {}, h('b', { text: RP.VERDICT_TEXT[r.verdict] }), r.note ? h('div', { class: 'small', text: r.note }) : null)));
    });
    t.appendChild(tb); el.appendChild(t);
  }

  root.SDS.ui.results = { renderResults, renderRepro, confBadge, srcBadge };
})(window);
