// 書き出しダイアログ(設計書 §9「書き出し」)。ブラウザ専用。内容は SDS.ui.exporter が作る。外部通信はしない。
// ダウンロードは Blob + a[download]、コピーは navigator.clipboard(使えなければ手動コピー用の欄を出す)。
(function (root) {
  'use strict';
  const { h } = root.SDS.ui.dom;
  const EX = root.SDS.ui.exporter;
  const DG = root.SDS.ui.dialogs;

  function download(text, name, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // opts: { design, ev, notify(text, kind), getCurrent() → {design, ev} | null }
  // ボタンを押した時点の最新の設計・評価を getCurrent で取る(無ければ開いた時点のもの)
  function openExport(opts) {
    const cur = () => { const c = opts.getCurrent ? opts.getCurrent() : null; return c && c.design && c.ev ? c : { design: opts.design, ev: opts.ev }; };
    const d = opts.design;
    const msg = h('p', { class: 'small', role: 'status' });
    const manual = h('textarea', { rows: '10', cols: '70', readonly: true, hidden: true, 'aria-label': '手動コピー用の要約テキスト' });
    const say = (t, err) => { msg.textContent = t; msg.className = err ? 'err small' : 'small'; if (opts.notify) opts.notify(t, err ? 'err' : 'info'); };
    const safe = (fn) => () => { try { fn(); } catch (e) { say(`✗ 書き出せませんでした: ${e.message}`, true); } };
    const onJson = safe(() => { const { design: d } = cur(); const n = EX.safeFileName(d.name, '.sds.json'); download(EX.toJson(d), n, 'application/json'); say(`設計を JSON で保存しました(${n})。`); });
    const onCsv = safe(() => { const { design: d, ev } = cur(); const n = EX.safeFileName(d.name, '.result.csv'); download(EX.toCsv(EX.resultRows(d, ev)), n, 'text/csv;charset=utf-8'); say(`結果を CSV で保存しました(${n}。UTF-8 BOM 付き)。`); });
    const onCopy = () => {
      let text;
      try { const { design: d, ev } = cur(); text = EX.toSummaryText(d, ev, { date: new Date().toISOString().replace('T', ' ').slice(0, 16) }); } catch (e) { say(`✗ 要約を作れませんでした: ${e.message}`, true); return; }
      const fallback = () => { manual.value = text; manual.hidden = false; manual.focus(); manual.select(); say('クリップボードを使えませんでした。下の欄を選択してコピーしてください。', true); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => say('要約テキストをクリップボードにコピーしました。'), fallback);
        else fallback();
      } catch (e) { fallback(); }
    };
    DG.open('書き出し', h('div', { class: 'export-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: `現在の設計「${d.name}」と評価結果を書き出します。通信はしません(ファイルのダウンロードとクリップボードだけ)。` }),
      h('div', { class: 'btnrow' },
        h('button', { type: 'button', class: 'btn primary', onclick: onJson, title: '設計の保存形式(「保存」と同じ)' }, '設計を JSON で保存'),
        h('button', { type: 'button', class: 'btn', onclick: onCsv, title: '項目,値,区分,確度,注記' }, '結果を CSV で保存'),
        h('button', { type: 'button', class: 'btn', onclick: onCopy }, '要約テキストをコピー')),
      h('ul', { class: 'small' },
        h('li', { text: 'JSON: 「開く」で読み込める設計データ(「保存」と同じ形式)。' }),
        h('li', { text: 'CSV: 項目,値,区分,確度,注記。値が無い項目は「—」と理由を書き、0 では埋めません。= + - @ で始まるセルは先頭に \' を付けています。Excel で開く日本語は UTF-8 BOM 付き。' }),
        h('li', { text: '要約テキスト: 画面の結果を貼り付け用の文章にします。電力・温度は推定(確度:低)と明記されます。' })),
      msg, manual));
  }

  root.SDS.ui.exportpanel = { openExport, download };
})(window);
