// 画面の組み立て(設計書 §8・§9)。ブラウザ専用。状態: 設計・履歴・選択・表示モード。
// 計算は SDS.model.evaluate、元に戻す/やり直しは SDS.history、ダイビューは SDS.render.createDieView(あれば)。
(function () {
  'use strict';
  const S = window.SDS;
  const $ = (id) => document.getElementById(id);
  const AUTOSAVE_KEY = 'sds.autosave.v1';

  const need = ['sim', 'model', 'history', 'ui'];
  const missing = need.filter((k) => !S || !S[k]);
  if (missing.length || !S.sim.perf || !S.sim.area || !S.model.design || !S.model.evaluate || !S.model.diff || !S.ui.paramform || !S.ui.params || !S.ui.diffpanel || !S.ui.panels || !S.ui.dialogs || !S.ui.results || !S.ui.dom || !S.ui.commitplan || !S.ui.packageform || !S.ui.packagepanel || !S.ui.heatdata || !S.ui.mixform || !S.ui.library || !S.ui.mixpanel || !S.model.blocklib || !S.model.compat) {
    document.body.insertBefore(Object.assign(document.createElement('p'), { className: 'fatal', textContent: '✗ 必要なスクリプトが読み込まれていません(コンソールを確認してください)。このページは動きません。' }), document.body.firstChild);
    return;
  }
  const { h, clear } = S.ui.dom;
  const DS = S.model.design; const DF = S.model.diff; const PF = S.ui.paramform; const PM = S.ui.params; const DP = S.ui.diffpanel; const EV = S.model.evaluate; const PN = S.ui.panels; const RS = S.ui.results; const DG = S.ui.dialogs; const CP = S.ui.commitplan; const PK = S.ui.packageform; const PP = S.ui.packagepanel; const HD = S.ui.heatdata; const MF = S.ui.mixform; const LB = S.ui.library; const MP = S.ui.mixpanel; const BL = S.model.blocklib;

  let ctx;
  try { ctx = EV.makeContext(); } catch (e) {
    $('notice').textContent = `✗ 校正の初期化に失敗しました: ${e.message}`; $('notice').className = 'err';
    return;
  }

  let design = null;
  const history = S.history.createHistory({ limit: 200 }) /* まとめるかどうかは commitplan が決める(時間の窓は使わない。ドラッグ中に止めても 1 手) */;
  let selection = []; let viewMode = 'place'; let view = null; let propMsg = ''; let ignoreUntil = 0; let saveTimer = null; let noticeTimer = null;
  let lastEval = null; let paramMsgs = {}; let pkgMsgs = {}; let mixMsgs = {}; let libMsg = ''; let mixParts = null;

  // ---- 通知 ----
  function notify(text, kind) {
    const n = $('notice'); n.textContent = text; n.className = kind || 'info';
    clearTimeout(noticeTimer);
    if (kind !== 'err') noticeTimer = setTimeout(() => { n.textContent = ''; n.className = ''; }, 8000);
  }

  function notifyRelaid() { notify('ブロックを模式図として再配置しました(手で動かした位置は失われます)。', 'info'); }

  // ---- ダイビュー ----
  function setViewMsg(text) { const m = $('viewmsg'); clear(m); if (text) m.appendChild(typeof text === 'string' ? document.createTextNode(text) : text); m.hidden = !text; }
  function fallbackList() {
    // ダイビューが無いとき: ブロックの一覧(選択だけできる)
    const box = h('div', { class: 'fallback' }, h('p', { class: 'err', text: '✗ ダイビューを表示できません(読み込み失敗または WebGL 不可)。代わりにブロックの一覧を表示します。' }));
    if (design) design.dies.forEach((d) => {
      box.appendChild(h('h4', { text: `${d.name}(${d.widthMm.toFixed(1)}×${d.heightMm.toFixed(1)} mm)` }));
      box.appendChild(h('ul', {}, d.blocks.map((b) => h('li', {}, h('button', { type: 'button', class: 'linkbtn' + (selection.includes(b.id) ? ' sel' : ''), onclick: () => selectBlocks([b.id]) }, b.label)))));
    });
    return box;
  }
  let dragRun = false; // ダイビューのドラッグ中(coalesce:true の連続)かどうか
  function initView() {
    if (!(S.render && typeof S.render.createDieView === 'function')) { view = null; return; }
    try {
      const v = S.render.createDieView($('dieview'), {
        onSelect(ids) { selection = ids || []; renderProps(); },
        // ドラッグ中は coalesce:true が続き、離したときに coalesce:false が 1 回来る。この最後の 1 回も同じ 1 手にまとめる
        onChange(next, info) {
          // 動いていないキャンセル(pointercancel)は履歴に積まない
          if (info && info.unchanged) { dragRun = false; return; }
          const plan = CP.planChange({ dragRun }, info); // ドラッグの最初は新しい手、続きと離したときはまとめる
          dragRun = plan.state.dragRun;
          commit(next, (info && info.label) || 'ブロックの移動・変形', plan.merge, true);
        },
      });
      view = v.available === false ? null : v; // WebGL 不可なら一覧表示に切り替える(エラー文はダイビュー側に出ている)
    } catch (e) { view = null; setViewMsg(`✗ ダイビューを作れませんでした: ${e.message}`); }
  }
  function renderEmptyOrFallback() {
    if (!design) { setViewMsg(h('div', {}, h('p', { text: '設計がありません。「新規」から実在チップを選ぶか、「開く」で保存した設計を読み込んでください。' }), h('button', { type: 'button', class: 'btn primary', onclick: openNew }, '新規'))); return; }
    if (!view) setViewMsg(fallbackList()); else setViewMsg('');
  }

  // ---- 選択 ----
  function selectBlocks(ids) { selection = ids; if (view) view.setSelection(ids); renderProps(); if (!view) renderEmptyOrFallback(); }

  // ---- 描画 ----
  const isMix = () => !!design && DS.isMix(design);
  const ORIGIN_TEXT = { table: '表(出典あり)', estimated: '推定(仮の比率)', unknown: '未取得' };
  function mixPropsExtra() {
    return {
      origin(b) {
        const cls = typeof b.areaMm2 !== 'number' ? 'unknown' : (b.areaOrigin === 'table' || b.areaOrigin === 'estimated' ? b.areaOrigin : 'unknown');
        const area = typeof b.areaMm2 === 'number' ? `${Math.round(b.areaMm2 * 100) / 100} mm²` : '未取得';
        const pl = MF.portLine(b);
        const portText = pl ? ` / 移植(密度比で換算): ${pl}` : '';
        const est = cls === 'estimated' ? ` / ${MF.ESTIMATE_NOTE}` : '';
        const core = b.kind === 'core' && cls === 'estimated' ? ' / コア面積は P/E の区別なし' : '';
        return `出所: ${b.sourceChip || '—'} / 面積: ${area}(${ORIGIN_TEXT[cls] || '未取得'})${portText}${est}${core}${b.portNote ? ` / ${b.portNote}` : ''} / ${MF.SCHEMATIC_NOTE}`;
      },
      onRemove: onRemoveBlock,
    };
  }
  function renderProps() { PN.renderProps($('props'), design || { dies: [] }, selection, onPropEdit, propMsg, isMix() ? mixPropsExtra() : null); }
  function renderHistory() { PN.renderHistory($('history'), history, jumpTo, undo, redo); }
  function renderButtons() {
    $('m-undo').disabled = !history.canUndo(); $('m-redo').disabled = !history.canRedo(); $('m-save').disabled = !design;
    $('designname').textContent = design ? `設計: ${design.name}` : '';
    const mi = PF.modeInfo(design); const mb = $('modebadge');
    mb.textContent = mi ? `${mi.symbol} ${mi.text}${mi.locked ? '(ロック中)' : ''}` : '';
    mb.className = 'badge modebadge' + (mi ? ` mode-${mi.code}` : ''); mb.hidden = !mi;
  }
  function libraryParts() {
    if (!mixParts) mixParts = BL.build(ctx.presets, (window.SDS_DATA && window.SDS_DATA.blocklibAreas) || [], ctx.nodes);
    return mixParts;
  }
  // C 混合のときだけ、部品ライブラリ・混合設計パネルを出し、パラメータ欄と簡易パーツ欄を隠す
  function renderMixPanels() {
    const mix = isMix();
    $('library').hidden = !mix; $('mixpanel').hidden = !mix; $('params').hidden = mix;
    const pl = document.querySelector('.partslist'); if (pl) pl.hidden = mix;
    if (!mix) { clear($('library')); clear($('mixpanel')); return; }
    LB.renderLibrary($('library'), design, libraryParts(), { onAdd: onAddPart }, libMsg, ctx.nodes);
    MP.renderMix($('mixpanel'), design, lastEval, { onDieSize: onDieSizeEdit, onClock: onBlockClockEdit }, mixMsgs, ctx.nodes);
  }
  function renderParamsPanel() {
    if (isMix()) { clear($('params')); return; }
    PM.renderParams($('params'), design, { onCount: (t, v, i) => onParamEdit('count', t, v, i), onClock: (t, v, i) => onParamEdit('clock', t, v, i), onL3: (v, i) => onParamEdit('l3', null, v, i), onUnlock }, paramMsgs);
  }
  const peakOf = (d) => { const p = d && ctx.presets.find((q) => q.id === d.presetId); return (p && p.power && p.power.peak) || null; };
  function renderPackagePanel() {
    PP.renderPackage($('package'), design, { onCooling: (id) => onPackageEdit('cooling', id), onSubstrate: (id) => onPackageEdit('substrate', id), onPowerLimit: (s) => onPackageEdit('limit', s) }, pkgMsgs, peakOf(design));
  }
  // ヒートマップのデータ接続。電力密度・温度のモードのときだけ計算する。ダイビューに setHeatmap が無ければ何もしない
  function updateHeat() {
    const note = $('heatnote');
    const canSet = !!(view && typeof view.setHeatmap === 'function');
    if (viewMode === 'place' || !design || !lastEval) { if (canSet) view.setHeatmap(null); note.hidden = true; note.textContent = ''; return; }
    const r = HD.buildHeatmap(design, lastEval, viewMode, null);
    if (canSet) view.setHeatmap(r.ok ? r.data : null);
    note.hidden = false; note.className = r.ok ? 'small' : 'small err';
    note.textContent = r.ok ? (r.longNote || r.data.note) + (canSet ? '' : '(ダイビューがヒートマップ表示に未対応のため、色は表示されません)') : `✗ ${r.reason}`;
  }
  function renderDiffPanel() {
    DP.renderDiff($('diff'), design, ctx, lastEval, {
      onRevert: (id, label) => { const r = DF.revertParam(design, id); if (commit(r.design, label, false) && r.relaid) notifyRelaid(); },
      onRevertAll: () => { const r = DF.revertAll(design); if (commit(r.design, 'すべて元に戻す(パラメータ)', false) && r.relaid) notifyRelaid(); },
    });
  }
  function renderAll(opts) {
    const o = opts || {};
    renderButtons();
    if (!design) {
      clear($('results')).appendChild(h('p', { class: 'note', text: '設計を読み込むと、ここに結果が出ます。' }));
      clear($('repro')); clear($('diff')); $('diff').hidden = true; clear($('validation')); renderMixPanels(); renderParamsPanel(); renderPackagePanel(); updateHeat(); renderProps(); renderHistory(); renderEmptyOrFallback();
      return;
    }
    lastEval = EV.evaluate(design, ctx);
    RS.renderResults($('results'), lastEval, design);
    if (PF.showRepro(design)) RS.renderRepro($('repro'), lastEval); else clear($('repro')); // B では差分ビューに置き換え
    renderDiffPanel(); renderMixPanels(); renderParamsPanel(); renderPackagePanel(); updateHeat();
    PN.renderValidation($('validation'), lastEval.warnings, (id) => selectBlocks([id]));
    if (!o.skipProps) renderProps();
    renderHistory();
    renderEmptyOrFallback(); // ダイビューがあっても、「設計がありません」の表示を消す(設計があるとき)
  }

  // ---- 自動保存(localStorage が使えなくても動作は続ける) ----
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        if (design) localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), design }));
      } catch (e) { /* 使えない環境・容量超過は無視して続ける */ }
    }, 300);
  }
  function loadAutosave() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      const r = DS.parse(JSON.stringify(o.design));
      if (!r.ok) return { error: r.reason };
      return { design: r.design, savedAt: o.savedAt };
    } catch (e) { return null; }
  }

  // ---- 設計の読み込み・変更 ----
  // 設計を丸ごと差し替える(履歴は作り直す)。評価に失敗したら元の設計に戻す。
  // M2 で保存した古い設計(cfg なし)は、プリセットから編集用パラメータを補う
  function ensure(d) { const p = ctx.presets.find((q) => q.id === d.presetId) || null; return DS.ensurePackage(DS.ensureCfg(d, p), p); }
  // ダイビューの色分け: 混合は出所('origin')、プリセットは種類('kind')。ダイビューが未対応なら何もしない
  function applyColorMode() { if (view && typeof view.setColorMode === 'function') view.setColorMode(design && DS.isMix(design) ? 'origin' : 'kind'); }
  function loadDesign(d, how) {
    const prev = design;
    dragRun = false; design = ensure(d); selection = []; propMsg = ''; paramMsgs = {}; pkgMsgs = {}; mixMsgs = {}; libMsg = '';
    try { renderAll(); } catch (e) {
      design = prev; try { renderAll(); } catch (e2) { /* 元の設計も描けないときは諦める */ }
      notify(`✗ この設計を表示できませんでした: ${e.message}`, 'err'); return false;
    }
    history.clear(); renderHistory(); renderButtons();
    if (view) { view.setDesign(design); applyColorMode(); view.setSelection([]); view.setViewMode(viewMode); if (view.fit) view.fit(); updateHeat(); }
    scheduleSave();
    return true;
  }
  function confirmDiscard() { return !(history.canUndo() || history.canRedo()) || window.confirm('現在の編集内容(履歴)を破棄して読み込みます。よろしいですか?'); }

  // 編集を履歴に積む。fromView=true のときダイビューは既に新しい設計を持っている。
  function commit(next, label, coalesce, fromView, fromProps) {
    if (Date.now() < ignoreUntil) { dragRun = false; if (fromView && view) view.setDesign(design); return false; }
    if (history.futureCount() > 0 && !window.confirm('履歴の途中から編集すると、これより先の履歴(やり直せる手)が捨てられます。続けますか?')) {
      ignoreUntil = Date.now() + 1000; // ドラッグ中に何度も確認しない
      dragRun = false;
      if (view) view.setDesign(design);
      if (fromProps) renderProps();
      return false;
    }
    history.push(design, next, label, { coalesce });
    design = next;
    if (!fromView && view) view.setDesign(design);
    propMsg = ''; paramMsgs = {}; pkgMsgs = {}; mixMsgs = {}; libMsg = '';
    renderAll({ skipProps: !!fromProps });
    scheduleSave();
    return true;
  }
  function undo() { dragRun = false; const d = history.undo(); if (d) applyHistory(d); }
  function redo() { dragRun = false; const d = history.redo(); if (d) applyHistory(d); }
  function jumpTo(i) { dragRun = false; const d = history.jumpTo(i); if (d) applyHistory(d); }
  function applyHistory(d) { design = d; propMsg = ''; paramMsgs = {}; pkgMsgs = {}; mixMsgs = {}; libMsg = ''; if (view) view.setDesign(design); renderAll(); scheduleSave(); }

  // プロパティ欄の数値編集
  function onPropEdit(blockId, field, value, input, oldStr) {
    const hit = PN.findBlock(design, blockId);
    if (!hit) return;
    if (!isFinite(value)) { propMsg = '数値を入力してください'; input.value = oldStr; renderProps(); return; }
    if ((field === 'w' || field === 'h') && !(value > 0)) { propMsg = '幅・高さは 0 より大きい値にしてください'; input.value = oldStr; renderProps(); return; }
    if (value === hit.block[field]) return;
    const next = DS.clone(design);
    PN.findBlock(next, blockId).block[field] = value;
    commit(next, `${hit.block.label}(${blockId}) の ${field} を変更`, false, false, true);
  }

  // パラメータ欄の編集(コア数・クロック・L3)。検証は paramform と design.js の両方。失敗は入力欄の下に出して値を戻す
  function onParamEdit(field, type, str, input) {
    const rows = PF.paramRows(design);
    if (!rows) return;
    const key = field === 'l3' ? 'l3' : `${field}:${type}`;
    const fail = (reason) => { paramMsgs = { [key]: reason }; renderParamsPanel(); };
    const g = type != null ? rows.cores.find((c) => c.type === type) : null;
    const cur = field === 'count' ? g.count : field === 'clock' ? g.clock : rows.l3MB;
    if (field === 'clock' && cur == null && String(str).trim() === '') { paramMsgs = {}; renderParamsPanel(); return; } // 未取得のまま空欄
    const parsed = field === 'count' ? PF.parseCount(str) : field === 'clock' ? PF.parseClock(str) : PF.parseL3(str);
    if (!parsed.ok) { fail(parsed.reason); return; }
    if (cur != null && Math.abs(parsed.value - cur) < 1e-9) { paramMsgs = {}; renderParamsPanel(); return; } // 変更なし(表記ゆれは整える)
    const res = field === 'count' ? DS.setCoreCount(design, type, parsed.value) : field === 'clock' ? DS.setClock(design, type, parsed.value) : DS.setL3(design, parsed.value);
    if (!res.ok) { fail(res.reason); return; }
    const label = PF.editLabel(field, type, cur, parsed.value);
    if (commit(res.design, label, false)) {
      if (res.relaid) notifyRelaid();
    } else renderParamsPanel();
  }
  // パッケージ設定の編集(冷却・基板・電力制限)。ロックの対象外なので A 再現でも可。失敗は入力欄の下に出して元に戻す
  function onPackageEdit(kind, value) {
    if (!design) return;
    const pkg = design.package || DS.defaultPackage(null);
    const fail = (reason) => { pkgMsgs = { [kind]: reason }; renderPackagePanel(); };
    let res; let label;
    if (kind === 'cooling') {
      if (value === pkg.coolingId) { pkgMsgs = {}; renderPackagePanel(); return; }
      res = DS.setCooling(design, value); label = PK.packageLabel('cooling', (window.SDS_DATA || {}).cooling, pkg.coolingId, value);
    } else if (kind === 'substrate') {
      if (value === pkg.substrateId) { pkgMsgs = {}; renderPackagePanel(); return; }
      res = DS.setSubstrate(design, value); label = PK.packageLabel('substrate', (window.SDS_DATA || {}).substrates, pkg.substrateId, value);
    } else {
      const p = PK.parsePowerLimit(value);
      if (!p.ok) { fail(p.reason); return; }
      if (p.value === (pkg.powerLimitW == null ? null : pkg.powerLimitW)) { pkgMsgs = {}; renderPackagePanel(); return; }
      res = DS.setPowerLimit(design, p.value); label = PK.powerLimitLabel(pkg.powerLimitW, p.value);
    }
    if (!res.ok) { fail(res.reason); return; }
    if (!commit(res.design, label, false)) renderPackagePanel();
  }
  // ---- 混合設計の編集(部品の追加・削除、ダイ寸法、クロック)。失敗は理由を日本語で見せ、設計は変えない ----
  function onAddPart(part, o) {
    if (!design || !isMix()) return;
    // x86 と Arm の混在は addPart が断る(既定)。追加前の表示は部品ライブラリ(preCheck)が出す
    const res = DS.addPart(design, part, { count: o.count, capacityMB: o.capacityMB, nodes: ctx.nodes });
    if (!res.ok) { libMsg = res.reason; renderMixPanels(); return; }
    const label = MF.addLabel(part, o.count, o.capacityMB);
    if (commit(res.design, label, false)) {
      notify(`${label}しました。`, 'info');
    } else renderMixPanels();
  }
  function onRemoveBlock(blockId) {
    if (!design || !isMix()) return;
    const hit = PN.findBlock(design, blockId);
    const res = DS.removeBlock(design, blockId);
    if (!res.ok) { propMsg = res.reason; renderProps(); return; }
    selection = selection.filter((id) => id !== blockId);
    if (!commit(res.design, MF.removeLabel(hit ? hit.block.label : blockId), false)) renderProps();
    else if (view) view.setSelection(selection);
  }
  function onDieSizeEdit(wStr, hStr) {
    if (!design || !isMix()) return;
    const die = design.dies[0];
    const fail = (reason) => { mixMsgs = { die: reason }; renderMixPanels(); };
    const p = MF.parseDieSize(wStr, hStr, DS.checkDieSize);
    if (!p.ok) { fail(p.reason); return; }
    if (Math.abs(p.w - die.widthMm) < 1e-9 && Math.abs(p.h - die.heightMm) < 1e-9) { mixMsgs = {}; renderMixPanels(); return; }
    const res = DS.setDieSize(design, die.id, p.w, p.h);
    if (!res.ok) { fail(res.reason); return; }
    if (!commit(res.design, MF.dieSizeLabel(p.w, p.h), false)) renderMixPanels();
  }
  function onBlockClockEdit(groupId, str) {
    if (!design || !isMix()) return;
    const row = MF.blockGroups(design).find((r) => r.groupId === groupId);
    const key = `clock:${groupId}`;
    const fail = (reason) => { mixMsgs = { [key]: reason }; renderMixPanels(); };
    if (row && row.clockGHz == null && String(str).trim() === '') { mixMsgs = {}; renderMixPanels(); return; }
    const p = PF.parseClock(str);
    if (!p.ok) { fail(p.reason); return; }
    if (row && row.clockGHz != null && Math.abs(p.value - row.clockGHz) < 1e-9) { mixMsgs = {}; renderMixPanels(); return; }
    const res = DS.setBlockClock(design, groupId, p.value);
    if (!res.ok) { fail(res.reason); return; }
    if (!commit(res.design, MF.clockLabel(row ? row.name : groupId, PF.trimNum(p.value)), false)) renderMixPanels();
  }
  function onUnlock() {
    if (!design || !window.confirm('ロックを解除して改良モードにします。パラメータ(コア数・クロック・L3)を編集できるようになります。再現モードの検証(公開値との比較)は、差分ビューに置き換わります。よろしいですか?')) return;
    if (commit(DS.unlock(design), 'ロックを解除して改良モードにする', false)) notify('改良モードにしました。パラメータを編集できます。', 'info');
  }

  // ---- 保存・開く ----
  function save() {
    if (!design) return;
    const blob = new Blob([DS.serialize(design)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(design.name || 'design').replace(/[\\/:*?"<>|]/g, '_')}.sds.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify('設計をファイルに保存しました(ダウンロード)。', 'info');
  }
  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onerror = () => notify('✗ ファイルを読めませんでした', 'err');
    rd.onload = () => {
      const r = DS.parse(String(rd.result));
      if (!r.ok) { notify(`✗ 開けません: ${r.reason}`, 'err'); return; }
      if (!confirmDiscard()) return;
      if (loadDesign(r.design, 'file')) notify(`「${r.design.name}」を開きました。`, 'info');
    };
    rd.readAsText(f);
  }

  // ---- ダイアログ ----
  function openNew() { DG.openNew({ onPickMode(key) { if (key === 'A' || key === 'B') openPresets(); else if (key === 'C') openMix(); } }); }
  function openMix() {
    DG.openMix(ctx, {
      onCreate(o) {
        if (!confirmDiscard()) return { ok: true };
        let d;
        try { d = DS.fromScratch({ name: o.name, widthMm: o.w, heightMm: o.h, nodeId: o.nodeId }); } catch (e) { return { ok: false, reason: e.message }; }
        DG.close();
        if (loadDesign(d, 'mix')) notify(`混合設計「${d.name}」を作りました。左の部品ライブラリから部品を追加してください。`, 'info');
        return { ok: true };
      },
    });
  }
  function openPresets() {
    DG.openPresets(ctx, {
      onReproduce(preset) {
        if (!confirmDiscard()) return;
        DG.close();
        if (loadDesign(DS.fromPreset(preset, { mode: 'reproduce' }), 'preset')) notify(`「${preset.name}」を再現モードで読み込みました。`, 'info');
      },
      onImprove(preset) {
        if (!confirmDiscard()) return;
        DG.close();
        if (loadDesign(DS.fromPreset(preset, { mode: 'improve' }), 'preset')) notify(`「${preset.name}」を改良モードで読み込みました。パラメータ欄で編集できます。`, 'info');
      },
    });
  }

  // ---- 表示切替 ----
  function setMode(m) {
    viewMode = m;
    document.querySelectorAll('.vm').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
    if (view) view.setViewMode(m);
    $('viewhint').textContent = m === 'place' ? '' : HD.SCHEMATIC;
    if (m === 'place' && view && typeof view.setHeatmap === 'function') view.setHeatmap(null);
    updateHeat();
  }

  // ---- イベント ----
  $('m-new').addEventListener('click', openNew);
  $('m-preset').addEventListener('click', openPresets);
  $('m-open').addEventListener('click', () => $('fileinput').click());
  $('fileinput').addEventListener('change', onFile);
  $('m-save').addEventListener('click', save);
  $('m-undo').addEventListener('click', undo);
  $('m-redo').addEventListener('click', redo);
  $('v-fit').addEventListener('click', () => { if (view && view.fit) view.fit(); });
  $('m-help').addEventListener('click', () => { const hp = $('help'); hp.hidden = !hp.hidden; $('m-help').setAttribute('aria-expanded', String(!hp.hidden)); });
  document.querySelectorAll('.vm').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.addEventListener('keydown', (e) => {
    const t = e.target; const tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    else if (k === 's') { e.preventDefault(); save(); }
    else if (k === 'o') { e.preventDefault(); $('fileinput').click(); }
  });

  // ---- 起動 ----
  initView();
  const auto = loadAutosave();
  renderAll();
  if (!view) {
    // ダイビューが無い旨を必ず見せる(設計が無い間も)
    const note = h('p', { class: 'err', text: '✗ ダイビューを表示できません(js/render/dieview.js の読み込み失敗、または WebGL が使えません)。' });
    $('center').insertBefore(note, $('viewwrap'));
  }
  setMode('place');
  if (auto && auto.error) notify(`前回の自動保存は読み込めませんでした: ${auto.error}`, 'err');
  else if (auto) {
    if (loadDesign(auto.design, 'autosave')) notify(`前回の自動保存(${auto.savedAt ? auto.savedAt.replace('T', ' ').slice(0, 16) : '日時不明'})から復元しました。履歴は復元されません。`, 'info');
  }
  window.SDS_APP = { get design() { return design; }, undo, redo, history };
})();
