// 書き出しの純粋ロジック(設計書 §9「書き出し」)。DOM・通信に依存しない。Node でテストする。
// JSON は設計の保存形式(DS.serialize)と同じ。CSV は 項目,値,区分,確度,注記(UTF-8 BOM 付き・式インジェクション対策)。
// 値が無い項目は値を「—」にして注記に理由を書く(0 では埋めない)。
(function (root) {
  'use strict';

  const node = typeof module !== 'undefined' && module.exports;
  const CF = () => (node ? require('./compareform.js') : root.SDS.ui.compareform);
  const DS = () => (node ? require('../model/design.js') : root.SDS.model.design);
  const PL = () => (node ? require('./presetlist.js') : root.SDS.ui.presetlist);

  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const fix = (v, d) => (isNum(v) ? v.toFixed(d).replace(/^-(0(.0+)?)$/, '$1') : '—');
  const NA = '—';

  // ファイル名: 禁止文字・制御文字を _ に置換。末尾の空白・ドット、Windows の予約名、長すぎる名前、空を直す
  const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  function safeFileName(name, ext) {
    let s = String(name == null ? '' : name).replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '');
    if (!s) s = 'design';
    const cps = Array.from(s); // サロゲートペアを壊さないよう、コードポイントで数える
    if (cps.length > 80) s = cps.slice(0, 80).join('').replace(/[\s.]+$/, '') || 'design';
    if (RESERVED.test(s.split('.')[0].replace(/\s+$/, ''))) s = '_' + s; // 予約名は最初の '.' より前で判定
    return s + (ext || '');
  }

  // CSV の 1 セル。式として解釈されうる先頭(= + - @ とタブ・CR)には ' を付ける。カンマ・引用符・改行を含むなら "" で囲む
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  const HEADER = ['項目', '値', '区分', '確度', '注記'];
  // rows: [{item, value, kind, conf, note}] → BOM 付き CSV 文字列(行末 CRLF)
  function toCsv(rows) {
    const lines = [HEADER].concat(rows.map((r) => [r.item, r.value, r.kind, r.conf, r.note]));
    return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  function toJson(design) { return DS().serialize(design); }

  // 結果の行。ev は evaluate の結果、design は評価した設計
  function resultRows(design, ev) {
    const C = CF(); const rows = [];
    const add = (item, value, kind, conf, note) => rows.push({ item, value: value == null ? '' : String(value), kind: kind || '', conf: conf || '', note: note || '' });
    const d = C.describe(design, ev);
    add('設計名', design.name, '設計', '', '');
    add('モード', d.modeText, '設計', '', d.edited ? '編集済み(性能は予測。公開値との差は出さない)' : '');
    // 性能・面積・電力・温度は compareform のセルと同じ判定を使う(画面と書き出しで食い違わせない)
    const pushCell = (key, label, unit, digits) => {
      const c = C.cellOf(key, design, ev);
      const ok = isNum(c.value);
      const notes = ok ? c.sub.slice() : [`値なし: ${c.reason}`];
      add(`${label}${ok ? `(${unit})` : ''}`, ok ? fix(c.value, digits) : NA, c.kindText, c.confText === '—' ? '' : c.confText, notes.join(' / '));
      return c;
    };
    ['st', 'mt'].forEach((k) => {
      const lab = k === 'st' ? 'シングル性能 GB7 ST' : 'マルチ性能 GB7 MT';
      const c = pushCell(k, lab, 'pt', 0);
      if (c.pub) {
        add(`${lab} 公開値(pt)`, fix(c.pub.published, 0), `公開${c.pub.kindText ? `(${c.pub.kindText})` : ''}`, '', '');
        add(`${lab} 公開値との差(%)`, isNum(c.pub.errPct) ? fix(c.pub.errPct, 1) : NA, '予測と公開値の差', '', isNum(c.pub.errPct) ? '' : '値なし');
      } else add(`${lab} 公開値との差(%)`, NA, '', '', c.pubNote || '出さない');
    });
    pushCell('area', 'ダイ面積', 'mm²', 1);
    if (ev.isMix) {
      const m = ev.area && ev.area.mix;
      add('ブロック面積の使用率(%)', m && isNum(m.utilization) ? (m.utilization * 100).toFixed(1) : NA, '推定', '', m && isNum(m.utilization) ? '部品の面積の出所は 表/推定/導出 が混在。ブロック合計 ÷ ダイ面積' : '値なし: 使用率を出せません');
    } else {
      const a = ev.area;
      (a.dies || []).forEach((x) => add(`ダイ面積: ${x.name}(mm²)`, x.known ? fix(x.mm2, 1) : NA, x.known ? `公開(${PL().sourceLabel(x.source)})` : '', '', x.known ? '' : (x.note || '値なし: 面積が未取得')));
      add('全体の歩留まり(%)', isNum(a.yield) ? (a.yield * 100).toFixed(1) : NA, isNum(a.yield) ? '推定' : '', '', isNum(a.yield) ? 'Poisson モデルと欠陥密度の二次推定による概算' : `値なし: ${a.yieldReason || '未取得'}`);
      const pw = ev.power && ev.power.published;
      if (pw) {
        [['公表電力 基準(W)', pw.base], ['公表電力 ピーク(W)', pw.peak]].forEach(([lab, v]) => add(lab, v ? (v.minW != null ? `${v.minW}〜${v.maxW}` : String(v.w)) : NA, v ? `公開(${PL().sourceLabel(v.s)})` : '', '', v ? (v.note || '') + (ev.edited ? ' 編集では再計算していない(元のチップの値)' : '') : '値なし: 未取得'));
      }
    }
    pushCell('power', '電力 モデル推定・全コア負荷', 'W', 1);
    const pc = C.cellOf('power', design, ev);
    if (pc.pub) add('電力 推定と公表ピークの差(%)', isNum(pc.pub.errPct) ? fix(pc.pub.errPct, 1) : NA, '推定と公開の差', '', '判定はしない(電力モデルは未校正)');
    pushCell('tj', '温度 平均 Tj', '℃', 0);
    (ev.warnings || []).forEach((w) => add('警告', w.text, w.level === 'warn' ? '警告' : w.level === 'error' ? 'エラー' : '情報', '', ''));
    return rows;
  }

  // 画面用の要約テキスト(コピー用)。opts.date: 書き出し日時の文字列(省略可)
  function toSummaryText(design, ev, opts) {
    const rows = resultRows(design, ev);
    const L = [`【${design.name}】の評価結果${opts && opts.date ? `(${opts.date})` : ''}`];
    rows.forEach((r) => {
      if (r.item === '設計名') return;
      if (r.item === '警告') { L.push(`⚠ ${r.value}`); return; }
      const tag = [r.kind, r.conf ? `確度:${r.conf}` : ''].filter(Boolean).join('・');
      L.push(`${r.item}: ${r.value}${tag ? ` [${tag}]` : ''}${r.note ? ` — ${r.note}` : ''}`);
    });
    L.push('※ 性能・面積は概算。電力・温度は推定(確度:低)で、電力モデルの係数と冷却の熱抵抗は根拠のない仮置き。ブロックの配置は模式図。');
    return L.join('\n');
  }

  const api = { safeFileName, csvCell, toCsv, toJson, resultRows, toSummaryText, HEADER };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.exporter = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
