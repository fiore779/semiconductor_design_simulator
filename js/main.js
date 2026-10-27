// 画面の組み立て(設計書 §8・§9)。ブラウザ専用。状態: 設計・履歴・選択・表示モード。
// 計算は SDS.model.evaluate、元に戻す/やり直しは SDS.history、ダイビューは SDS.render.createDieView(あれば)。
(function () {
  'use strict';
  const S = window.SDS;
  const $ = (id) => document.getElementById(id);
  const AUTOSAVE_KEY = 'sds.autosave.v1';

  const need = ['sim', 'model', 'history', 'ui'];
  const missing = need.filter((k) => !S || !S[k]);
  if (missing.length || !S.sim.perf || !S.sim.area || !S.model.design || !S.model.evaluate || !S.ui.panels || !S.ui.dialogs || !S.ui.results || !S.ui.dom || !S.ui.commitplan) {
    document.body.insertBefore(Object.assign(document.createElement('p'), { className: 'fatal', textContent: '✗ 必要なスクリプトが読み込まれていません(コンソールを確認してください)。このページは動きません。' }), document.body.firstChild);
    return;
  }
  const { h, clear } = S.ui.dom;
  const DS = S.model.design; const EV = S.model.evaluate; const PN = S.ui.panels; const RS = S.ui.results; const DG = S.ui.dialogs; const CP = S.ui.commitplan;

  let ctx;
  try { ctx = EV.makeContext(); } catch (e) {
    $('notice').textContent = `✗ 校正の初期化に失敗しました: ${e.message}`; $('notice').className = 'err';
    return;
  }

  let design = null;
  const history = S.history.createHistory({ limit: 200 }) /* まとめるかどうかは commitplan が決める(時間の窓は使わない。ドラッグ中に止めても 1 手) */;
  let selection = []; let viewMode = 'place'; let view = null; let propMsg = ''; let ignoreUntil = 0; let saveTimer = null; let noticeTimer = null;
  let lastEval = null;

  // ---- 通知 ----
  function notify(text, kind) {
    const n = $('notice'); n.textContent = text; n.className = kind || 'info';
    clearTimeout(noticeTimer);
    if (kind !== 'err') noticeTimer = setTimeout(() => { n.textContent = ''; n.className = ''; }, 8000);
  }

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
  function renderProps() { PN.renderProps($('props'), design || { dies: [] }, selection, onPropEdit, propMsg); }
  function renderHistory() { PN.renderHistory($('history'), history, jumpTo, undo, redo); }
  function renderButtons() {
    $('m-undo').disabled = !history.canUndo(); $('m-redo').disabled = !history.canRedo(); $('m-save').disabled = !design;
    $('designname').textContent = design ? `設計: ${design.name}` : '';
  }
  function renderAll(opts) {
    const o = opts || {};
    renderButtons();
    if (!design) {
      clear($('results')).appendChild(h('p', { class: 'note', text: '設計を読み込むと、ここに結果が出ます。' }));
      clear($('repro')); clear($('validation')); renderProps(); renderHistory(); renderEmptyOrFallback();
      return;
    }
    lastEval = EV.evaluate(design, ctx);
    RS.renderResults($('results'), lastEval); RS.renderRepro($('repro'), lastEval);
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
  function loadDesign(d, how) {
    const prev = design;
    dragRun = false; design = d; selection = []; propMsg = '';
    try { renderAll(); } catch (e) {
      design = prev; try { renderAll(); } catch (e2) { /* 元の設計も描けないときは諦める */ }
      notify(`✗ この設計を表示できませんでした: ${e.message}`, 'err'); return false;
    }
    history.clear(); renderHistory(); renderButtons();
    if (view) { view.setDesign(design); view.setSelection([]); view.setViewMode(viewMode); if (view.fit) view.fit(); }
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
    propMsg = '';
    renderAll({ skipProps: !!fromProps });
    scheduleSave();
    return true;
  }
  function undo() { dragRun = false; const d = history.undo(); if (d) applyHistory(d); }
  function redo() { dragRun = false; const d = history.redo(); if (d) applyHistory(d); }
  function jumpTo(i) { dragRun = false; const d = history.jumpTo(i); if (d) applyHistory(d); }
  function applyHistory(d) { design = d; propMsg = ''; if (view) view.setDesign(design); renderAll(); scheduleSave(); }

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
  function openNew() { DG.openNew({ onPickMode(key) { if (key === 'A') openPresets(); } }); }
  function openPresets() {
    DG.openPresets(ctx, {
      onReproduce(preset) {
        if (!confirmDiscard()) return;
        DG.close();
        if (loadDesign(DS.fromPreset(preset, { mode: 'reproduce' }), 'preset')) notify(`「${preset.name}」を再現モードで読み込みました。`, 'info');
      },
    });
  }

  // ---- 表示切替 ----
  function setMode(m) {
    viewMode = m;
    document.querySelectorAll('.vm').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
    if (view) view.setViewMode(m);
    $('viewhint').textContent = m === 'place' ? '' : '電力モデルは未校正のため、この表示は模式的な目安です(実測や正確な予測ではありません)。';
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
