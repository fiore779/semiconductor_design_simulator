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

  // PNG(ダイ図)を合成する。cap: dieview.captureCanvas() の戻り値。成功: Promise<{ ok:true, blob }>、失敗: Promise<{ ok:false, reason }>(reject しない)
  // 画面は 2D canvas に ダイ図 + 凡例 + 設計名・日時・主要値 + 概算の注記 を描く。解像度は exporter.PNG の上限に従う。
  function composePng(cap, design, ev, date, doc) {
    const fail = (reason) => Promise.resolve({ ok: false, reason });
    try {
      if (!cap || !cap.canvas) return fail('ダイ図を取得できません(WebGL が使えない、またはダイ図が表示されていません)');
      const src = cap.canvas;
      const m = EX.pngMetrics(src.width);
      if (!m.ok) return fail(m.reason);
      const out = (doc || document).createElement('canvas');
      const c = out.getContext && out.getContext('2d');
      if (!c) return fail('2D canvas を作れません');
      const fam = 'sans-serif';
      const info = EX.pngInfo(design, ev, { date, mode: cap.mode, noData: !!cap.noData });
      const legend = cap.legend || [];
      const innerW = m.width - 2 * m.pad;
      c.font = `bold ${m.fontTitle}px ${fam}`;
      const measure0 = (t) => c.measureText(t).width;
      const titleLines = EX.wrapLimited(measure0, info.title, innerW, 2);
      c.font = `${m.font}px ${fam}`;
      const measure = (t) => c.measureText(t).width;
      const noteLines = EX.wrapText(measure, info.note, innerW);
      const valueLines = info.values.length;
      // 凡例は横に並べ、入らなければ折り返す(行数を先に数える)
      const swW = m.font; const itemGap = m.pad;
      const legendRowsArr = [[]]; let rowW = 0;
      legend.forEach((it) => {
        const w = swW + 6 + measure(it.text) + itemGap;
        if (rowW + w > innerW && legendRowsArr[legendRowsArr.length - 1].length) { legendRowsArr.push([]); rowW = 0; }
        legendRowsArr[legendRowsArr.length - 1].push(it); rowW += w;
      });
      const legendRows = legend.length ? legendRowsArr.length : 0;
      const L = EX.pngLayout(m, { srcW: src.width, srcH: src.height, titleLines: titleLines.length, legendRows, valueLines, noteLines: noteLines.length });
      if (!L.ok) return fail(L.reason);
      out.width = L.width; out.height = L.height; // サイズ変更で状態が初期化される
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, L.width, L.height);
      c.textBaseline = 'middle'; c.textAlign = 'left';
      const mid = (y) => y + m.lineH / 2;
      c.fillStyle = '#1c2430'; c.font = `bold ${m.fontTitle}px ${fam}`;
      titleLines.forEach((t, i) => c.fillText(t, m.pad, L.title.y + (i + 0.5) * m.titleH, innerW));
      c.fillStyle = '#4a5260'; c.font = `${m.font}px ${fam}`;
      c.fillText(info.subtitle, m.pad, mid(L.subtitle.y), innerW);
      c.drawImage(src, L.image.x, L.image.y, L.image.w, L.image.h);
      c.strokeStyle = '#3b4250'; c.lineWidth = 1; c.strokeRect(L.image.x - 0.5, L.image.y - 0.5, L.image.w + 1, L.image.h + 1);
      legendRowsArr.forEach((row, ri) => {
        let x = m.pad; const y = mid(L.legend.y + ri * m.lineH);
        row.forEach((it) => {
          c.fillStyle = it.color; c.fillRect(x, y - swW / 2, swW, swW);
          c.strokeStyle = '#1c2430'; c.strokeRect(x + 0.5, y - swW / 2 + 0.5, swW - 1, swW - 1);
          c.fillStyle = '#1c2430'; c.fillText(it.text, x + swW + 6, y);
          x += swW + 6 + measure(it.text) + itemGap;
        });
      });
      c.fillStyle = '#1c2430'; c.font = `${m.font}px ${fam}`;
      info.values.forEach((v, i) => c.fillText(v.text, m.pad, mid(L.values.y + i * m.lineH), innerW));
      c.fillStyle = '#9a3412'; c.font = `bold ${m.fontSmall}px ${fam}`;
      noteLines.forEach((t, i) => c.fillText(t, m.pad, mid(L.note.y + i * m.lineH), innerW));
      if (typeof out.toBlob !== 'function') return fail('このブラウザは canvas.toBlob に対応していません');
      return new Promise((resolve) => {
        try {
          out.toBlob((blob) => resolve(blob ? { ok: true, blob } : { ok: false, reason: 'PNG への変換に失敗しました(画像が大きすぎる可能性があります)' }), 'image/png');
        } catch (e) { resolve({ ok: false, reason: `PNG への変換に失敗しました: ${e.message}` }); }
      });
    } catch (e) { return fail(`画像の合成に失敗しました: ${e.message}`); }
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  function localStamp(dt) { return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`; }

  // opts: { design, ev, notify(text, kind), getCurrent() → {design, ev} | null, captureDie() → dieview.captureCanvas() の結果 | null }
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
    let pngBusy = false;
    const pngBtn = h('button', { type: 'button', class: 'btn', onclick: () => onPng(), title: '現在の表示(配置/ヒートマップ)+凡例+主要値+概算の注記を 1 枚の画像にします' }, 'PNG(ダイ図)で保存');
    const onPng = () => {
      if (pngBusy) return;
      let p;
      try {
        const { design: d, ev } = cur();
        const cap = opts.captureDie ? opts.captureDie(EX.PNG.MAX_WIDTH) : null; // 同期で描画して取得(preserveDrawingBuffer に頼らない)
        p = composePng(cap, d, ev, localStamp(new Date()), document).then((r) => {
          if (!r.ok) { say(`✗ PNG を書き出せませんでした: ${r.reason}。JSON・CSV・要約テキストは使えます。`, true); return; }
          const n = EX.safeFileName(d.name, '.diagram.png'); download(r.blob, n, 'image/png'); say(`ダイ図を PNG で保存しました(${n})。`);
        });
      } catch (e) { say(`✗ PNG を書き出せませんでした: ${e.message}。JSON・CSV・要約テキストは使えます。`, true); return; }
      pngBusy = true; pngBtn.disabled = true;
      p.catch((e) => say(`✗ PNG を書き出せませんでした: ${e.message}。JSON・CSV・要約テキストは使えます。`, true)).then(() => { pngBusy = false; pngBtn.disabled = false; });
    };
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
        pngBtn,
        h('button', { type: 'button', class: 'btn', onclick: onCopy }, '要約テキストをコピー')),
      h('ul', { class: 'small' },
        h('li', { text: 'JSON: 「開く」で読み込める設計データ(「保存」と同じ形式)。' }),
        h('li', { text: 'CSV: 項目,値,区分,確度,注記。値が無い項目は「—」と理由を書き、0 では埋めません。= + - @ で始まるセルは先頭に \' を付けています。Excel で開く日本語は UTF-8 BOM 付き。' }),
        h('li', { text: 'PNG: 現在のダイビューの表示(ブロック配置またはヒートマップ)に、凡例・設計名・日時・主要値と「性能・面積は概算。電力・温度は推定(確度:低)。ブロック配置は模式図」の注記を添えた画像(幅は最大 2400px)。' }),
        h('li', { text: '要約テキスト: 画面の結果を貼り付け用の文章にします。電力・温度は推定(確度:低)と明記されます。' })),
      msg, manual));
  }

  root.SDS.ui.exportpanel = { openExport, download, composePng };
})(window);
