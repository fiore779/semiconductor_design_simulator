// コアエディタ(モード D の自作コア。設計書 §3.7.4)。ブラウザ専用のダイアログ。
// 基準コア(左)・編集欄(中)・結果(右)を並べ、入力のたびに coredef.evaluate(純関数)で右を更新する。
// 計算・検証は coredef(モデル層)と coreform(整形)に任せ、ここは描くだけ。設計への追加と履歴は main.js のコールバック側。
// 電力・最大クロック・MT への寄与の単独値は出さない(未実装と画面に明記)。
(function (root) {
  'use strict';
  const { h, clear, more } = root.SDS.ui.dom;
  const CF = root.SDS.ui.coreform;
  const MF = root.SDS.ui.mixform;
  const WN = root.SDS.ui.warnings;

  const NOT_OUTPUT = '出していないもの(未実装): 1 コアの消費電力(クロック別)、最大クロックの目安、MT への寄与の単独値。電力は公表電力に対する校正ができず、最大クロックは周波数・電圧の根拠がないためです。';
  const L3_NOTE = 'このエディタの ST は L3 を参照値で計算しています(設計に置いた L3 の容量は含みません)。基準との比較には影響しません。';

  // env: { def(coredef.clone の結果), nodes, toNodeId(設計のプロセス。null 可), evalCtx: { cal, uarch, presets, nodes } }
  // cb: { onAdd(def, count) → { ok, reason } }  成功したらダイアログを閉じるのは呼び出し側
  //     onRegister(def) → { ok, reason, message }(ユーザーライブラリへ登録。無ければボタンを出さない)、onExport(def) → { ok, reason, message }(JSON 書き出し)
  function openCoreEditor(env, cb) {
    const CDm = root.SDS.model.coredef;
    const DG = root.SDS.ui.dialogs;
    let def = env.def;
    const rows = {}; // key → { input, ratioEl, warnEl, errEl }
    const nodeName = (id) => { const n = (env.nodes || []).find((x) => x.id === id); return n ? n.name : (id || 'プロセス未取得'); };

    const resultEl = h('div', { class: 'ce-result', 'aria-live': 'polite' });
    const comboEl = h('p', { class: 'small warn-note', role: 'note', hidden: true });
    const nameErr = h('p', { class: 'err pmsg', role: 'alert', hidden: true });
    const addMsg = h('p', { class: 'err pmsg', role: 'alert', hidden: true });
    const okMsg = h('p', { class: 'small pmsg', role: 'status', hidden: true });
    const setText = (el, t, prefix) => { el.textContent = t ? `${prefix || ''}${t}` : ''; el.hidden = !t; };

    // ---- 左: 基準コア ----
    const b = def.base; const ed = CDm.editability(def); const der = CDm.areaDerivable(def);
    const areaText = b.area.origin === 'table' && b.area.withL2Mm2 != null ? `${MF.areaClassLabel('table')} ${b.area.withL2Mm2} mm²(L2 込み)` : `${MF.areaClassLabel(b.area.origin)}${b.area.mm2 != null ? ` ${b.area.mm2} mm²` : ''}`;
    const left = h('div', { class: 'ce-col' }, h('h3', { text: '基準コア' }),
      h('p', {}, h('b', { text: `${b.uarch} コア` })),
      h('p', { class: 'small', text: b.sourceChip || '出所不明' }),
      h('p', { class: 'small', text: `${nodeName(b.nodeId)} / ${MF.ISA_LABEL[b.isa] || b.isa}` }),
      h('p', { class: 'small', text: `面積: ${areaText}` }),
      h('p', { class: 'small' }, '面積の導出: ', h('span', { class: `badge ${der.ok ? 'area-table' : 'area-unknown'}`, text: der.ok ? '可' : '不可' }), der.ok ? '' : ` ${der.reason}`),
      h('h4', { text: '継承(編集不可)' }),
      h('ul', { class: 'small ce-inh' }, CF.inheritedRows(def).map((r) => h('li', {}, r.label, ' ', h('span', { class: 'badge', text: '継承' }), ` ${r.text}`))));

    // ---- 中: 編集欄 ----
    function onField(key, value) {
      const r = CF.applyField(def, key, value);
      if (r.ok) { def = r.def; setText(rows[key].errEl, ''); rows[key].input.removeAttribute('aria-invalid'); }
      else { setText(rows[key].errEl, `${r.reason}(入力値は計算に反映していません)`, '✗ '); rows[key].input.setAttribute('aria-invalid', 'true'); }
      refresh();
    }
    function fieldRow(f) {
      const e = ed[f.key]; const id = `ce-${f.key}`;
      let input;
      if (f.key === 'smt') {
        input = h('select', { id, disabled: !e.editable, onchange: (ev) => onField('smt', ev.target.value) },
          h('option', { value: '1', selected: def.params.smt === 1 }, 'SMT なし(1)'), h('option', { value: '2', selected: def.params.smt === 2 }, '2way'));
      } else {
        const ph = !e.editable && CF.baseValue(def, f.key) == null ? '未取得' : null;
        input = h('input', { id, type: 'text', inputmode: f.int ? 'numeric' : 'decimal', autocomplete: 'off', value: CF.displayValue(def, f.key), placeholder: ph, disabled: !e.editable,
          oninput: (ev) => onField(f.key, ev.target.value),
          onchange: (ev) => { if (!ev.target.getAttribute('aria-invalid')) ev.target.value = CF.displayValue(def, f.key); } });
      }
      const ratioEl = h('span', { class: 'small' }); const warnEl = h('span', { class: 'small warn-note', role: 'note' });
      const errEl = h('p', { class: 'err pmsg', role: 'alert', hidden: true });
      rows[f.key] = { input, ratioEl, warnEl, errEl };
      return h('div', { class: 'pfield' }, h('label', { for: id, text: f.label }),
        h('div', { class: 'pinput' }, input, f.unit ? h('span', { class: 'small', text: f.unit }) : null),
        h('div', {}, ratioEl, ' ', warnEl),
        !e.editable ? h('p', { class: 'small warn-note', text: `編集できません: ${e.reason}` }) : null,
        f.key === 'l2KB' && CDm.l2Display(def).usingReference ? h('p', { class: 'small', text: CDm.l2Display(def).note }) : null,
        f.key === 'smt' ? h('p', { class: 'small', text: 'SMT の面積増は未反映です(根拠となるデータがありません)' }) : null,
        errEl);
    }
    const nameI = h('input', { id: 'ce-name', type: 'text', value: def.name, autocomplete: 'off', maxlength: '80',
      oninput: (ev) => { const r = CDm.rename(def, ev.target.value); if (r.ok) { def = r.def; setText(nameErr, ''); nameI.removeAttribute('aria-invalid'); } else { setText(nameErr, r.reason, '✗ '); nameI.setAttribute('aria-invalid', 'true'); } } });
    const countI = h('input', { id: 'ce-count', type: 'text', inputmode: 'numeric', value: '1', autocomplete: 'off', 'aria-label': '設計に追加する個数(1〜64)' });
    const middle = h('div', { class: 'ce-col' }, h('h3', { text: '編集' }),
      CF.FIELDS.map(fieldRow), comboEl,
      h('div', { class: 'pfield' }, h('label', { for: 'ce-name', text: '名前' }), h('div', { class: 'pinput' }, nameI), nameErr));

    // ---- 右: 結果 ----
    function resultBody(ev) {
      const out = [];
      const RS = root.SDS.ui.results;
      out.push(h('h3', {}, '結果 ', RS.confBadge('low')));
      const st = ev.st;
      if (st.ok) {
        out.push(h('div', { class: 'big' }, h('span', { class: 'val', text: Math.round(st.score).toLocaleString('ja-JP') }), h('span', { class: 'unit', text: ' pt(ST 寄与・GB7 換算の予測)' })));
        if (st.deltaPct != null) out.push(h('p', { class: 'small', text: `基準 ${Math.round(st.baseScore).toLocaleString('ja-JP')} pt に対して ${st.deltaPct >= 0 ? '+' : ''}${Math.round(st.deltaPct * 10) / 10}%${ev.edited ? '' : '(未編集のため基準と同じ)'}` }));
        out.push(h('p', { class: 'small', text: `IPC ${Math.round(st.ipc * 100) / 100}(${CF.cpiText(st.parts)}。CPI の内訳)/ ${Math.round(st.fGHz * 100) / 100} GHz` }));
        out.push(h('p', { class: 'small', text: st.corrFrom === 'isa' ? '補正: 基準のマイクロアーキに専用の補正が無く、命令セット平均で代用(確度:低)' : `補正: 基準のマイクロアーキ(${b.uarch})の値を借用(確度:低)` }));
      } else out.push(h('p', { class: 'err', text: `✗ 性能を計算できません: ${st.reason}` }));
      // 面積
      const a = ev.area;
      if (a.placeMm2 != null) {
        out.push(h('div', { class: 'row' }, '面積 ', h('b', { text: CF.rangeText(a.rangeMm2) }), ' ', h('span', { class: `badge area-${a.derived ? 'derived' : (a.origin || 'unknown')}`, text: a.derived ? '導出(範囲)' : MF.areaClassLabel(a.origin) })));
        if (a.derived && a.rangeMm2[0] !== a.rangeMm2[1]) out.push(h('p', { class: 'small', text: `ダイへの配置には大きい側(${Math.round(a.placeMm2 * 100) / 100} mm²)を使います` }));
        if (a.derived && a.logicMm2 && a.l2Mm2) out.push(h('p', { class: 'small', text: `ロジック ${CF.rangeText(a.logicMm2)} / L2 ${CF.rangeText(a.l2Mm2)}(基準のプロセス上)` }));
        if (a.portConverted) out.push(h('p', { class: 'small warn-note', text: `基準とプロセスが違うため移植として換算(密度比 ×${Math.round(a.ratio * 1000) / 1000})。${a.portNote || ''}` }));
        else if (a.portNote) out.push(h('p', { class: 'small warn-note', text: `移植の換算ができません: ${a.portNote}` }));
      } else out.push(h('div', { class: 'row' }, '面積 ', h('b', { text: '未取得' })));
      if (a.reason) out.push(h('p', { class: 'small warn-note', text: `面積を導出していません: ${a.reason}` }));
      (a.notes || []).forEach((t) => out.push(h('p', { class: 'small', text: `注: ${t}` })));
      const ppa = CF.perfPerArea(ev);
      if (ppa) out.push(h('p', { class: 'small', text: `性能/面積: ${Math.round(ppa[0] * 10) / 10}〜${Math.round(ppa[1] * 10) / 10} pt/mm²(面積の大きい側〜小さい側)` }));
      // 警告
      const ul = h('ul', { class: 'warns' });
      ev.warnings.forEach((w) => ul.appendChild(h('li', { class: `w-${w.level}` }, `${WN.SYMBOL[w.level] || 'ⓘ'} ${w.text}`)));
      out.push(h('h4', { text: `確度・注意(${ev.warnings.length} 件)` }));
      out.push(ev.warnings.length ? ul : h('p', { class: 'small', text: '個別の警告はありません(確度は常に低です)。' }));
      ev.notes.forEach((t) => out.push(h('p', { class: 'low-banner', role: 'note' }, `⚠ ${t}`)));
      out.push(more('補足', { key: 'ce:more' }, h('p', { class: 'small', text: L3_NOTE }), h('p', { class: 'small warn-note', text: NOT_OUTPUT })));
      return out;
    }
    function refresh() {
      let ev = null;
      try { ev = CDm.evaluate(def, Object.assign({}, env.evalCtx, { toNodeId: env.toNodeId || null })); } catch (e) { ev = null; resultEl.textContent = `✗ 計算に失敗しました: ${e.message}`; }
      CF.FIELDS.forEach((f) => {
        const r = rows[f.key];
        r.ratioEl.textContent = CF.ratioText(def, f.key);
        const w = f.key === 'smt' ? null : CF.fieldWarning(ev, def, f.key);
        r.warnEl.textContent = w ? `⚠ 校正範囲外: ${w}` : '';
      });
      setText(comboEl, ev ? CF.comboWarning(ev, def) : null, '⚠ 校正範囲外: ');
      if (ev) { clear(resultEl); resultEl.appendChild(h('div', {}, resultBody(ev))); }
    }
    const right = h('div', { class: 'ce-col' }, resultEl);

    // ---- 下: 操作 ----
    function syncInputs() {
      CF.FIELDS.forEach((f) => {
        const r = rows[f.key];
        if (f.key === 'smt') r.input.value = String(def.params.smt); else r.input.value = CF.displayValue(def, f.key);
        setText(r.errEl, ''); r.input.removeAttribute('aria-invalid');
      });
    }
    // 入力欄にエラーが残っていれば拒否(追加・登録・書き出しで共通)。okMsg は成功の知らせをいったん消す
    function inputsOk() {
      setText(okMsg, ''); setText(addMsg, '');
      const bad = CF.FIELDS.find((f) => rows[f.key].input.getAttribute('aria-invalid')) || (nameI.getAttribute('aria-invalid') ? { label: '名前' } : null);
      if (bad) { setText(addMsg, `${bad.label}の入力にエラーがあります。直すか、基準に戻してください`, '✗ '); return false; }
      return true;
    }
    const actions = h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => { def = CDm.reset(def); syncInputs(); setText(addMsg, ''); refresh(); } }, '基準に戻す'),
      h('label', { for: 'ce-count', class: 'small', text: '個数' }), countI,
      h('button', { type: 'button', class: 'btn primary', onclick: () => {
        const pc = MF.parseCount(countI.value);
        if (!pc.ok) { setText(addMsg, pc.reason, '✗ '); return; }
        if (!inputsOk()) return;
        const res = cb.onAdd(def, pc.value);
        if (res && res.ok === false) setText(addMsg, res.reason, '✗ ');
      } }, 'ダイに追加'),
      cb.onRegister ? h('button', { type: 'button', class: 'btn', title: 'ブラウザのユーザーライブラリ(localStorage)に保存する。ライブラリからは新しい定義として設計に追加できる', onclick: () => {
        if (!inputsOk()) return;
        const res = cb.onRegister(def);
        if (res && res.ok === false) setText(addMsg, res.reason, '✗ ');
        else setText(okMsg, (res && res.message) || 'ライブラリに登録しました');
      } }, 'ライブラリに登録') : null,
      cb.onExport ? h('button', { type: 'button', class: 'btn', title: 'このコア定義を JSON ファイルに書き出す(ライブラリと同じ形式。localStorage が使えなくても使える)', onclick: () => {
        if (!inputsOk()) return;
        const res = cb.onExport(def);
        if (res && res.ok === false) setText(addMsg, res.reason, '✗ ');
        else setText(okMsg, (res && res.message) || 'JSON を書き出しました');
      } }, 'JSON 書き出し') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => DG.close() }, '閉じる'));

    refresh();
    DG.open('コアエディタ(自作コア・確度:低)', h('div', { class: 'coreeditor' },
      more('補足', { key: 'ce:intro' }, h('p', { class: 'note', text: '既存コアを複製し、発行幅・ROB・L2 容量・クロック・SMT を変えた自作コアを作ります。結果は基準コアの補正を借りた推定で、確度は常に低です。' })),
      h('div', { class: 'ce-grid' }, left, middle, right), addMsg, okMsg, actions));
  }

  root.SDS.ui.coreeditor = { openCoreEditor, NOT_OUTPUT };
})(window);
