// 結果パネルと再現度パネル(設計書 §8.5・§8.11)。ブラウザ専用。evaluate の結果を描くだけで、計算はしない。
// 精度の見せ方: 確度は必ず記号+文字で示す。MT は「低」を目立たせる。未取得は「未取得」と書く。
(function (root) {
  'use strict';
  const { h, clear, num, diff } = root.SDS.ui.dom;
  const PL = root.SDS.ui.presetlist;
  const RP = root.SDS.ui.reproduce;
  const PK = root.SDS.ui.packageform;

  const CONF = { high: ['▲', '高'], medium: ['◆', '中'], low: ['▼', '低'] };
  function confBadge(c) {
    if (!c) return h('span', { class: 'badge conf-none', text: '確度: —' });
    return h('span', { class: `badge conf-${c}`, title: '推定の確度(校正データの量・質による)' }, `確度 ${CONF[c][0]} ${CONF[c][1]}`);
  }
  function srcBadge(s) { return h('span', { class: `badge src-${s || 'none'}`, title: '値の区分' }, `[${PL.sourceLabel(s)}]`); }
  function note(text, cls) { return h('p', { class: 'note' + (cls ? ' ' + cls : '') }, text); }

  function perfCard(title, r, extra, edited) {
    const body = [];
    if (r.ok) {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val', text: Math.round(r.score).toLocaleString('ja-JP') }), h('span', { class: 'unit', text: edited ? ' pt(予測・編集後)' : ' pt(シミュレーション)' })));
    } else {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val na', text: '—' }), h('span', { class: 'unit', text: ' 計算できません' })));
      body.push(note(`理由: ${r.reason}`));
    }
    if (edited) {
      // 編集後の設計に公開値は無い。元のチップの公開値は参考として別に示す(差は出さない)
      body.push(h('div', { class: 'row' }, h('span', { text: '元のチップの公開値(参考) ' }), h('b', { text: r.basePublished != null ? r.basePublished.toLocaleString('ja-JP') : '未取得' })));
      body.push(note('編集後の数値は予測で、公開値ではありません。公開値との差は出しません。'));
    } else if (r.published != null) {
      body.push(h('div', { class: 'row' }, h('span', { text: '公開値 ' }), h('b', { text: r.published.toLocaleString('ja-JP') }), ' ', h('span', { class: 'badge', text: r.publishedKind || '' })));
      if (r.ok) body.push(h('div', { class: 'row' }, h('span', { text: '公開値との差 ' }), h('b', { text: diff(r.errPct) })));
    } else body.push(h('div', { class: 'row' }, '公開値: ', h('b', { text: '未取得' }), '(比較しません)'));
    if (r.ok && r.isCalibSample) body.push(note('校正に使った代表 SKU です。公開値と近いのは当然で、検証ではありません。', 'warn-note'));
    else if (r.ok && r.calibNotUsedForMt) body.push(note('ST の補正には使ったが、MT の σ の合わせには使っていない SKU です。', 'warn-note'));
    (extra || []).forEach((e) => body.push(e));
    return h('section', { class: `card conf-card-${r.ok ? r.confidence : 'none'}`, 'aria-label': title },
      h('header', {}, h('h3', { text: title }), r.ok ? confBadge(r.confidence) : confBadge(null)), body);
  }

  const optBand = () => h('p', { class: 'low-banner', role: 'note' }, `⚠ ${root.SDS.ui.paramform.OPTIMISTIC_NOTE}(電力・温度の確度は低く、冷却の熱抵抗は仮置きです)。`);

  // 電力カードの「モデルの推定」部分。ok:false のときは理由だけで、数値は出さない
  function powerModelBlock(pm, edited, isA) {
    const box = h('div', { class: 'modelbox' }, h('h4', { text: 'モデルの推定(確度:低)' }));
    if (!pm || !pm.ok) {
      box.appendChild(h('div', { class: 'row' }, h('span', { class: 'val na', text: '—' }), ' 推定できません'));
      box.appendChild(note(`理由: ${(pm && pm.reason) || '不明'}`, 'warn-note'));
    } else {
      box.appendChild(h('div', { class: 'big' }, h('span', { class: 'val', text: pm.estW.toFixed(1) }), h('span', { class: 'unit', text: ' W(推定・全コア負荷)' })));
      const v = pm.vsPublishedPeak;
      if (edited) box.appendChild(h('div', { class: 'row small', text: '編集後のため公表値とは比べません(元の構成に対する相対変化だけ)' }));
      else if (v) box.appendChild(h('div', { class: 'row' }, `${PK.peakKindText(v.s)} ${v.publishedW} W との差: `, h('b', { text: diff(v.errPct) }), h('span', { class: 'small', text: isA ? '(判定は再現度パネル(±15%)に出しています)' : '(外れていてもそのまま表示。合否の判定はしません)' })));
      else box.appendChild(h('div', { class: 'row small', text: 'ピーク電力が未取得のため、比較しません' }));
      if (edited && pm.deltaPct != null) box.appendChild(h('div', { class: 'row' }, '元の構成に対する相対変化: ', h('b', { text: diff(pm.deltaPct) }), h('span', { class: 'small', text: ` (元の推定 ${pm.baseEstW.toFixed(1)} W)` })));
    }
    box.appendChild(h('p', { class: 'low-banner', role: 'note' }, `⚠ ${PK.POWER_MODEL_NOTE}`));
    return box;
  }

  // 温度カード。冷却の熱抵抗は仮置きなので、注意帯は常に出す
  function thermalCard(th, design, pm, isA) {
    const body = [h('p', { class: 'low-banner', role: 'note' }, `⚠ ${PK.COOLING_NOTE}温度・持続クロックは目安です(暫定値)。`)];
    const v = PK.tjView(th);
    if (PK.isRunaway(th)) {
      // 熱暴走: 持続電力・持続クロック・最後の反復値(物理的に無意味)は出さない
      body.push(h('div', { class: 'big' }, h('span', { class: 'val na', text: '—' }), h('span', { class: 'unit', text: ' 熱暴走の恐れ' })));
      body.push(h('p', { class: 'caution', role: 'note' }, `✗ ${PK.RUNAWAY_TEXT}`));
    } else if (v.state === 'na') {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val na', text: '—' }), h('span', { class: 'unit', text: ' 推定できません' })));
      body.push(note(`理由: ${v.reason}`, 'warn-note'));
    } else {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val', text: v.tjC.toFixed(0) }), h('span', { class: 'unit', text: ' ℃ (平均 Tj・推定)' })));
      body.push(note(PK.TJ_NOTE));
      const over = isA ? PK.overEstimateNote(pm, false) : '';
      if (over) body.push(note(over, 'warn-note'));
      body.push(h('div', { class: 'row' }, '制限の理由: ', h('b', { text: `${PK.limitedBySymbol(th.limitedBy)} ${PK.limitedByText(th.limitedBy)}` }), th.feasible === false ? h('b', { class: 'err', text: ` ${PK.INFEASIBLE_TEXT}` }) : null));
      if (typeof th.powerW === 'number') body.push(h('div', { class: 'row' }, '持続時の電力: ', h('b', { text: `${th.powerW.toFixed(1)} W` }), th.powerLimitW != null ? ` (電力制限 ${th.powerLimitW} W)` : ''));
      const rows = PK.sustainedRows(th, design && design.cfg && design.cfg.cores);
      if (rows.length) {
        const tb = h('tbody');
        rows.forEach((r) => tb.appendChild(h('tr', {}, h('td', { text: r.type }), h('td', { text: `${r.sustained.toFixed(2)} GHz` }),
          h('td', { text: r.max != null ? `${r.max.toFixed(2)} GHz` : '未取得' }), h('td', { text: r.ratioPct != null ? `${r.ratioPct.toFixed(0)}%` : '—' }))));
        body.push(h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['コア', '持続クロック', '最大クロック', '比'].map((x) => h('th', { text: x })))), tb));
      }
      if (th.throttled) body.push(h('p', { class: 'caution', role: 'note' }, '▼ 電力・温度の制限で持続クロックが下がる見込み(性能の数値には反映していません)'));
    }
    const notes = PK.thermalNotes(th);
    if (notes.length && !PK.isRunaway(th)) body.push(h('ul', { class: 'small thermal-notes' }, notes.map((n) => h('li', { text: n }))));
    return h('section', { class: 'card', 'aria-label': '温度(推定)' }, h('header', {}, h('h3', { text: '温度(推定)' }), confBadge('low')), body);
  }

  // ---- 混合設計(モード C)の結果。公開値・再現度は無い。確度は常に低。混合による性能低下は反映しない(U9) ----
  const MIX_NO_PENALTY = '混合による性能低下は反映していません(今回の評価は CPU ベンチのみ)';
  const MIX_OUT_OF_CALIB = '混合設計は校正した範囲の外です';
  const MIX_PERF_PREMISE = '全コアが最大クロックで動く前提です。電力・熱・メモリ帯域の制限は見ていません。L2 を共有するクラスタも見ていません(大きなコアを大量に置くといくらでも伸びます)。';
  const NO_OWN_CORR = '専用の補正が無く、命令セット平均で代用(確度低)';
  const ghz = (x) => (typeof x === 'number' ? `${Math.round(x * 100) / 100} GHz` : '—');
  function mixPerfCard(title, r, extra) {
    const body = [];
    if (r.ok) body.push(h('div', { class: 'big' }, h('span', { class: 'val', text: Math.round(r.score).toLocaleString('ja-JP') }), h('span', { class: 'unit', text: ' pt(混合設計・予測)' })));
    else {
      body.push(h('div', { class: 'big' }, h('span', { class: 'val na', text: '—' }), h('span', { class: 'unit', text: ' 計算できません' })));
      body.push(note(`理由: ${r.reason}`));
    }
    body.push(note('混合設計の予測値で、公開値はありません。公開値との差・再現度は出しません。'));
    body.push(note(MIX_PERF_PREMISE, 'warn-note'));
    (extra || []).forEach((e) => body.push(e));
    return h('section', { class: 'card conf-card-low', 'aria-label': title }, h('header', {}, h('h3', { text: title }), confBadge('low')), body);
  }
  function mixAreaCard(a) {
    const mix = a.mix || {};
    const MF = root.SDS.ui.mixform;
    const body = [];
    body.push(h('div', { class: 'big' }, h('span', { class: mix.utilization == null ? 'val na' : 'val', text: mix.utilization == null ? '—' : `${Math.round(mix.utilization * 1000) / 10}%` }), h('span', { class: 'unit', text: ' 使用率(ブロック合計 ÷ ダイ面積)' })));
    body.push(h('div', { class: 'row', text: MF.utilizationText(mix) }));
    const c = MF.areaClassCounts(mix.blocks);
    body.push(h('div', { class: 'row' }, '面積の出所: ',
      ['table', 'estimated', 'unknown'].concat(c.derived ? ['derived'] : []).map((k) => h('span', { class: `badge area-${k}`, text: `${MF.areaClassLabel(k)} ${c[k]}` })), ' / 移植の換算: ',
      h('span', { class: 'badge area-ported', text: `移植 ${c.ported}` })));
    if (c.ported) body.push(note('移植は面積の換算値(目安)です。密度に幅があるため、面積が大きくなる側を採用しています。L2(SRAM)を含む値にロジックの密度比を掛けているので、縮み方が過大になりうる。', 'warn-note'));
    if (c.estimated) body.push(note(MF.ESTIMATE_NOTE, 'warn-note'));
    if (c.derived) body.push(note('導出(範囲)は自作コアの面積です。基準コアの表の面積から導いた範囲で、ロジックの上限は仮定(データから導けません)。ダイへの配置・使用率には範囲の大きい側を使っています。', 'warn-note'));
    if (mix.unknownCount) body.push(note(`面積が未取得の部品が ${mix.unknownCount} 個あります(使用率に含めていません。ブロックの大きさは仮の寸法です)`, 'warn-note'));
    if (mix.blocks && mix.blocks.length) {
      const tb = h('tbody');
      mix.blocks.forEach((b) => {
        const pl = MF.portLine(b);
        tb.appendChild(h('tr', {}, h('td', { text: b.label }),
          h('td', {}, b.mm2 == null ? '未取得' : `${Math.round(b.mm2 * 100) / 100} mm²`, b.class === 'derived' && b.areaRangeMm2 ? h('div', { class: 'small', text: `範囲 ${root.SDS.ui.coreform.rangeText(b.areaRangeMm2)}(大きい側を使用)` }) : null, pl ? h('div', { class: 'small', text: pl }) : null),
          h('td', {}, h('span', { class: `badge area-${b.class}`, text: MF.areaClassText(b.class, b.portConverted) }))));
      });
      body.push(h('details', {}, h('summary', { text: `ブロックごとの面積(${mix.blocks.length} 件)` }),
        h('table', { class: 'mini' }, h('thead', {}, h('tr', {}, ['ブロック', '面積', '区分'].map((x) => h('th', { text: x })))), tb)));
    }
    body.push(note('ブロックの大きさと配置は模式図です。実チップのフロアプランではありません。歩留まりは算出しません。'));
    body.push(note(MF.SCHEMATIC_NOTE + '。'));
    return h('section', { class: 'card', 'aria-label': 'ダイ面積(混合設計)' }, h('header', {}, h('h3', { text: 'ダイ面積(混合設計)' })), body);
  }
  // L3 なし/下限の注記(性能カード用)
  function l3Notes(r) {
    const out = [];
    if (!r || !r.ok) return out;
    if (r.noL3) out.push(note('L3 なしとして計算しています。', 'warn-note'));
    else if (r.l3Floor) out.push(note('スレッドあたりの L3 が小さく、L3 なしと同じ値になっています(モデルの下限)。', 'warn-note'));
    return out;
  }

  function renderMixResults(el, ev, design) {
    el.appendChild(h('p', { class: 'caution' }, '混合設計の概算です。性能は部品のコア構成から予測した値で、公開値はありません。電力・温度は混合設計では推定できません。ブロックの配置を変えても数値は変わりません。'));
    el.appendChild(h('p', { class: 'low-banner', role: 'note' }, `⚠ ${MIX_NO_PENALTY}`));
    el.appendChild(h('p', { class: 'low-banner', role: 'note' }, `⚠ ${MIX_OUT_OF_CALIB}(確度は常に低)`));
    // 自作コアがあるとき: 注意帯 1〜5(設計書 §3.7.7。文言固定)
    const bands = root.SDS.ui.coreform.customBands(ev, design);
    if (bands.length) el.appendChild(h('div', { class: 'custom-bands', 'aria-label': '自作コアの注意' }, bands.map((x) => h('p', { class: x.level === 'warn' ? 'low-banner' : 'note', role: 'note' }, `${x.level === 'warn' ? '⚠' : 'ⓘ'} ${x.text}`))));
    const stExtra = [];
    if (ev.st.ok && ev.st.chosen) {
      const ch = ev.st.chosen;
      stExtra.push(note(`最速として選んだコア: ${ch.label}(${ghz(ch.fGHz)})。各グループのクロックで計算し、最も速いものを採用しています。`));
      root.SDS.ui.coreform.chosenCustomLines(ch).forEach((t) => stExtra.push(note(t, 'warn-note')));
      if (ch.corrSource === 'isa' || ev.st.corrSource === 'isa') stExtra.push(note(`${ch.label}: ${NO_OWN_CORR}`, 'warn-note'));
    }
    l3Notes(ev.st).forEach((n) => stExtra.push(n));
    el.appendChild(mixPerfCard('シングル性能 (GB7 ST) 混合設計(予測)', ev.st, stExtra));
    const mtExtra = [];
    if (ev.mt.ok) {
      mtExtra.push(h('p', { class: 'low-banner' }, '▼ マルチ性能の確度は「低」です。この数値を精密な予測として扱わないでください。'));
      mtExtra.push(note('各コアの寄与を合算した値です。並列効率 σ は AMD の代表 3 件だけで合わせ、SMT 効果 γ は未校正、メモリ帯域の頭打ちは未実装です。'));
      if (ev.mt.mixedClock) mtExtra.push(note('一部コアのブーストクロックが未取得で基本クロックを使っており、数値が歪んでいます。', 'warn-note'));
      if (ev.mt.fallback) mtExtra.push(note('in-order コアの仮の IPC を含むため信頼できません。', 'warn-note'));
      (ev.mt.detail || []).filter((d) => d.corrSource === 'isa').forEach((d) => mtExtra.push(note(`${d.label || d.type}(${ghz(d.fGHz)}): ${NO_OWN_CORR}`, 'warn-note')));
    }
    l3Notes(ev.mt).forEach((n) => mtExtra.push(n));
    el.appendChild(mixPerfCard('マルチ性能 (GB7 MT) 混合設計(予測)', ev.mt, mtExtra));
    el.appendChild(mixAreaCard(ev.area));
    // 電力・温度: ok:false の理由だけを出す(数値は出さない)
    el.appendChild(h('section', { class: 'card', 'aria-label': '電力(推定)' }, h('header', {}, h('h3', { text: '電力(推定)' }), confBadge('low')), [powerModelBlock(ev.powerModel, false, false)]));
    el.appendChild(thermalCard(ev.thermal, design, ev.powerModel, false));
  }

  function renderResults(el, ev, design) {
    clear(el);
    if (ev.isMix) { renderMixResults(el, ev, design); return; }
    const edited = !!ev.edited;
    const isA = root.SDS.ui.paramform.showRepro(design); // A 再現(未編集)のときだけ再現度パネルが出る
    el.appendChild(h('p', { class: 'caution' }, '概算です。配置の編集では数値は変わりません。パラメータ(コア数・クロック・L3)の編集では性能だけ再計算します(面積・公表電力は再計算しません)。電力・温度は推定(確度:低・仮置き)として別のカードに載せ、性能の数値には反映しません。'));
    if (edited) el.appendChild(h('p', { class: 'low-banner' }, '予測(編集後): 下の性能は編集したパラメータでの予測です。公開値ではありません。'));
    // ST
    const stExtra = [];
    if (ev.st.ok && ev.st.corrSource === 'isa') stExtra.push(note('専用の補正が無く、命令セット平均で代用(確度低)', 'warn-note'));
    if (ev.st.ok && ev.st.fallback) stExtra.push(note('in-order コアの IPC は根拠のない仮の値です', 'warn-note'));
    l3Notes(ev.st).forEach((n) => stExtra.push(n));
    if (ev.optimistic) stExtra.push(optBand());
    el.appendChild(perfCard(edited ? 'シングル性能 (GB7 ST) 予測(編集後)' : 'シングル性能 (GB7 ST)', ev.st, stExtra, edited));
    // MT
    const mtExtra = [];
    if (ev.optimistic) mtExtra.push(optBand());
    if (ev.mt.ok) {
      mtExtra.push(h('p', { class: 'low-banner' }, '▼ マルチ性能の確度は「低」です。この数値を精密な予測として扱わないでください。'));
      mtExtra.push(note('並列効率 σ は AMD の代表 3 件だけで合わせ、SMT 効果 γ は未校正、メモリ帯域の頭打ちは未実装です。'));
      if (ev.mt.mixedClock) mtExtra.push(note('一部コアのブーストクロックが未取得で基本クロックを使っており、数値が歪んでいます。', 'warn-note'));
      if (ev.mt.fallback) mtExtra.push(note('in-order コアの仮の IPC を含むため信頼できません。', 'warn-note'));
    }
    l3Notes(ev.mt).forEach((n) => mtExtra.push(n));
    el.appendChild(perfCard(edited ? 'マルチ性能 (GB7 MT) 予測(編集後)' : 'マルチ性能 (GB7 MT)', ev.mt, mtExtra, edited));
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
    if (edited) aBody.push(note('編集後も面積・歩留まりは再計算していません(元のチップの値のまま。コア別面積が未取得のため)。', 'warn-note'));
    el.appendChild(h('section', { class: 'card', 'aria-label': 'ダイ面積' }, h('header', {}, h('h3', { text: 'ダイ面積' })), aBody));
    // 電力
    const pw = ev.power.published;
    const pBody = [h('h4', { text: '公表値' })];
    const prow = (label, v) => v && pBody.push(h('div', { class: 'row' }, `${label}: `, h('b', { text: v.minW != null ? `${v.minW}〜${v.maxW} W` : `${v.w} W` }), ' ', v.s !== undefined ? srcBadge(v.s) : '', v.note ? h('span', { class: 'small', text: ` (${v.note})` }) : ''));
    prow('基準(TDP/PBP)', pw.base); prow('ピーク', pw.peak);
    if (pw.range) pBody.push(h('div', { class: 'row' }, '設定範囲: ', h('b', { text: `${pw.range.minW}〜${pw.range.maxW} W` })));
    if (ev.power.reason) pBody.push(h('div', { class: 'row' }, '公表値: ', h('b', { text: '未取得' }), ` (${ev.power.reason})`));
    if (edited) pBody.push(note('公表電力は編集では再計算していません(元のチップの公表値)。', 'warn-note'));
    pBody.push(powerModelBlock(ev.powerModel, edited, isA));
    el.appendChild(h('section', { class: 'card', 'aria-label': '電力(推定)' }, h('header', {}, h('h3', { text: '電力(推定)' }), confBadge('low')), pBody));
    el.appendChild(thermalCard(ev.thermal, design, ev.powerModel, isA));
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
