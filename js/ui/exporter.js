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
    if (ev.memory && ev.memory.active) {
      const mm = ev.memory;
      add('メモリ構成', mm.label, '設計', '', mm.isRef ? '基準構成(補正なし)' : `基準 ${mm.refLabel}。MT 係数 ${((mm.mtFactor - 1) * 100).toFixed(1)}%・ST 帯域項 ${((mm.stBwFactor - 1) * 100).toFixed(1)}%(遅延は dramNs に反映)。推定(確度:低)${mm.oc ? `。メモリ OC(安定動作を保証しない${mm.extrapolated ? '・GB7 実測の範囲外=外挿' : ''})` : ''}`);
    }
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
      (c.refs || []).forEach((x) => add(`${lab} 参考値(判定外)(pt)`, fix(x.value, 0), `参考(${x.kind || '種別不明'})`, '', `判定には使わない${x.device && !/^\(機種ではなく/.test(x.device) ? `。機種: ${x.device}` : ''}${isNum(x.diffPct) ? `。参考との差 ${fix(x.diffPct, 1)}%` : ''}`));
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

  // ---- PNG(ダイ図)の純ロジック(DOM 非依存。canvas への描画は exportpanel.js)----
  // 解像度は devicePixelRatio に依存させない: 出力幅は元画像の幅を MIN〜MAX に収めた値。高さにも上限がある。
  const PNG = { MAX_WIDTH: 2400, MIN_WIDTH: 900, MAX_HEIGHT: 4800, BASE_WIDTH: 1200 };
  const PNG_NOTE = '性能・面積は概算。電力・温度は推定(確度:低)。ブロック配置は模式図。';
  const PNG_MODE_TEXT = { place: 'ブロック配置', power: '電力密度ヒートマップ(推定)', temp: '温度ヒートマップ(推定)' };

  // 画像に描く文字から、制御文字・双方向制御文字(U+202A-202E, U+2066-2069, U+200E/F, U+061C)・行/段落区切りを空白に置換する
  const CTRL_RANGES = [[0, 0x1f], [0x7f, 0x9f], [0x61c, 0x61c], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]];
  function sanitizeText(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s)) { const c = ch.codePointAt(0); out += CTRL_RANGES.some((r) => c >= r[0] && c <= r[1]) ? ' ' : ch; }
    return out.replace(/ {2,}/g, ' ').trim();
  }

  // 画像内に入れる文字情報。date: 書き出し日時の文字列、mode: 'place' | 'power' | 'temp'
  function pngInfo(design, ev, opts) {
    const o = opts || {}; const C = CF();
    const fmt = (key, label, unit, digits) => {
      const c = C.cellOf(key, design, ev);
      if (!isNum(c.value)) return { label, text: `${label}: —(${c.reason || '値なし'})` };
      const tag = [c.kindText, c.confText && c.confText !== '—' ? `確度:${c.confText}` : ''].filter(Boolean).join('・');
      return { label, text: `${label}: ${fix(c.value, digits)} ${unit}${tag ? ` [${tag}]` : ''}` };
    };
    const mm = ev && ev.memory && ev.memory.active && !ev.memory.isRef ? ev.memory : null; // 基準構成のときは出さない(画像の既定の表示を変えない)
    return {
      title: sanitizeText(design && design.name != null ? design.name : ''),
      subtitle: `${PNG_MODE_TEXT[o.mode] || PNG_MODE_TEXT.place}${o.noData ? '(データなし)' : ''}${o.date ? ` / ${o.date}` : ''}`,
      values: [fmt('st', 'ST', 'pt', 0), fmt('mt', 'MT', 'pt', 0), fmt('area', 'ダイ面積', 'mm²', 1), fmt('power', '電力(推定)', 'W', 1), fmt('tj', '温度 Tj(推定)', '℃', 0)].concat(mm ? [{ label: 'メモリ', text: `メモリ: ${mm.label}(基準 ${mm.refLabel})` }] : []),
      note: PNG_NOTE,
    };
  }

  // wrapText の結果を maxLines 行までにし、超えた分は最終行の末尾を「…」に置き換える(「…」込みで maxW 以内)
  function wrapLimited(measure, text, maxW, maxLines) {
    const lines = wrapText(measure, text, maxW);
    if (lines.length <= maxLines) return lines;
    const out = lines.slice(0, maxLines);
    let last = Array.from(out[maxLines - 1]);
    while (last.length && measure(last.join('') + '…') > maxW) last.pop();
    out[maxLines - 1] = last.join('') + '…';
    return out;
  }

  // 文字を maxW 以内に折り返す(measure(text) → 幅)。1 文字ずつ数えるので日本語でも使える。空文字は []
  function wrapText(measure, text, maxW) {
    const lines = []; let cur = '';
    Array.from(String(text == null ? '' : text)).forEach((ch) => {
      if (cur && measure(cur + ch) > maxW) { lines.push(cur); cur = ch; } else cur += ch;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // 出力幅と文字サイズ。srcW: 元画像の幅(px)。不正なら { ok:false, reason }
  function pngMetrics(srcW) {
    if (!isNum(srcW) || srcW < 1) return { ok: false, reason: 'ダイ図の大きさが取得できません' };
    const width = Math.round(Math.min(PNG.MAX_WIDTH, Math.max(PNG.MIN_WIDTH, srcW)));
    const scale = Math.min(2, Math.max(0.8, width / PNG.BASE_WIDTH));
    const r = (v) => Math.round(v * scale);
    return { ok: true, width, scale, pad: r(24), gap: r(12), fontTitle: r(22), font: r(15), fontSmall: r(13), lineH: r(22), titleH: r(32) };
  }

  // 縦方向の配置。in: { srcW, srcH, titleLines(省略時 1), legendRows, valueLines, noteLines }(行数)。高さが上限を超えたらダイ図を高さに合わせて縮小する(縮小後の幅が最小幅(900-2*pad)未満になる場合だけ { ok:false, reason })
  function pngLayout(m, inp) {
    if (!m || !m.ok) return { ok: false, reason: (m && m.reason) || '配置を計算できません' };
    if (!isNum(inp.srcW) || !isNum(inp.srcH) || inp.srcW < 1 || inp.srcH < 1) return { ok: false, reason: 'ダイ図の大きさが取得できません' };
    let imgW = m.width - 2 * m.pad; let imgH = Math.max(1, Math.round(imgW * inp.srcH / inp.srcW));
    let y = m.pad;
    const title = { y }; y += Math.max(1, inp.titleLines | 0) * m.titleH;
    const subtitle = { y }; y += m.lineH + m.gap;
    const imageY = y; y += imgH + m.gap;
    const legend = { y }; y += Math.max(0, inp.legendRows | 0) * m.lineH + ((inp.legendRows | 0) > 0 ? m.gap : 0);
    const values = { y }; y += Math.max(0, inp.valueLines | 0) * m.lineH + m.gap;
    const note = { y }; y += Math.max(0, inp.noteLines | 0) * m.lineH + m.pad;
    if (y > PNG.MAX_HEIGHT) { // 縦長: 高さに合わせてダイ図を縮小(中央寄せ)。縮小しすぎる(幅が最小幅未満)なら失敗
      const newH = imgH - (y - PNG.MAX_HEIGHT);
      const newW = Math.round(newH * inp.srcW / inp.srcH);
      if (newH < 1 || newW < PNG.MIN_WIDTH - 2 * m.pad) return { ok: false, reason: `画像が大きすぎます(縦長のため縮小すると幅が ${Math.max(0, newW)}px になります。下限 ${PNG.MIN_WIDTH - 2 * m.pad}px)` };
      const shift = imgH - newH;
      imgW = newW; imgH = newH;
      legend.y -= shift; values.y -= shift; note.y -= shift; y = PNG.MAX_HEIGHT;
    }
    const image = { x: m.pad + Math.round((m.width - 2 * m.pad - imgW) / 2), y: imageY, w: imgW, h: imgH };
    return { ok: true, width: m.width, height: y, title, subtitle, image, legend, values, note };
  }

  const api = { safeFileName, csvCell, toCsv, toJson, resultRows, toSummaryText, HEADER, PNG, PNG_NOTE, pngInfo, sanitizeText, wrapText, wrapLimited, pngMetrics, pngLayout };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.exporter = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
