'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const CF = require('../js/ui/compareform.js');
const EX = require('../js/ui/exporter.js');
const P = (id) => D.presets.find((p) => p.id === id);
const ctx = E.makeContext();
const evalOf = (d) => E.evaluate(d, ctx);
const side = (d) => ({ design: d, ev: evalOf(d) });
const row = (rows, k) => rows.find((r) => r.key === k);

test('比較: 同じ設計どうしは差が 0、公開値との差は A 未編集で出る', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const rows = CF.compareRows(side(d), side(design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' })));
  ['st', 'mt', 'area', 'power', 'tj'].forEach((k) => assert.strictEqual(row(rows, k).abs, 0, k));
  assert.ok(row(rows, 'st').a.pub && typeof row(rows, 'st').a.pub.errPct === 'number');
  assert.strictEqual(row(rows, 'st').pct, 0);
  assert.ok(CF.diffText(row(rows, 'st')).includes('＝'));
});

test('比較: 編集後(B)は公開値との差を出さず、元のプリセットとの差が出る。設計は変更しない', () => {
  const orig = design.fromPreset(P('intel-rpl-13900k'), { mode: 'improve' });
  const edited = design.setClock(orig, orig.cfg.cores[0].type, 6.2);
  assert.ok(edited.ok, edited.reason);
  const before = JSON.stringify(edited.design);
  const o = CF.buildOther('origin', edited.design, { presets: D.presets });
  assert.ok(o.ok);
  const A = side(edited.design); const B = side(o.design);
  const rows = CF.compareRows(A, B);
  assert.strictEqual(JSON.stringify(edited.design), before);
  const st = row(rows, 'st');
  assert.strictEqual(st.a.pub, null);
  assert.ok(st.a.pubNote.includes('編集後'));
  assert.ok(st.b.pub, '未編集の比較先は公開値の差を出す');
  assert.ok(st.abs > 0 && st.pct > 0);
  assert.ok(row(rows, 'area').a.sub.some((t) => t.includes('再計算していない')));
  assert.ok(CF.compareNotes(A, B).some((t) => t.includes('編集後')));
});

test('比較: 混合(C)は公開値の差を出さず、電力・温度は「—(理由)」で 0 を使わない。元のプリセットは選べない', () => {
  const m = design.fromScratch({ name: 'mix', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  const opts = CF.sourceOptions(m, D.presets, m);
  assert.strictEqual(opts.find((o) => o.key === 'origin').enabled, false);
  assert.strictEqual(opts.find((o) => o.key === 'history').enabled, true);
  assert.strictEqual(CF.buildOther('origin', m, { presets: D.presets }).ok, false);
  const b = CF.buildOther('preset', m, { presets: D.presets, presetId: 'intel-rpl-13900k' });
  const rows = CF.compareRows(side(m), side(b.design));
  const pw = row(rows, 'power'); const tj = row(rows, 'tj');
  assert.strictEqual(pw.a.value, null); assert.strictEqual(pw.abs, null);
  assert.ok(CF.valueText(pw.a, pw).startsWith('—(') && CF.diffText(pw).startsWith('—('));
  assert.ok(tj.diffReason.includes('現在'));
  assert.ok(row(rows, 'area').a.kind === 'set' && row(rows, 'area').kindMismatch);
  const c = CF.cellOf('st', m, evalOf(m));
  assert.strictEqual(c.value, null); // コアが無い設計の ST は値なし
});

test('比較: 比較先の選択(別のプリセット未選択・履歴なし)は理由つきで失敗する。baseline は複製される', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'));
  assert.strictEqual(CF.buildOther('preset', d, { presets: D.presets }).ok, false);
  assert.strictEqual(CF.buildOther('history', d, { presets: D.presets }).ok, false);
  const h = CF.buildOther('history', d, { presets: D.presets, baseline: d });
  assert.ok(h.ok && h.design !== d && JSON.stringify(h.design) === JSON.stringify(d));
  assert.strictEqual(CF.sourceOptions(d, D.presets, null).find((o) => o.key === 'history').enabled, false);
});

test('比較: 全プリセットとの比較で例外にならず、値なしは 0 でなく null と理由', () => {
  const A = side(design.fromPreset(P('intel-rpl-13900k')));
  for (const p of D.presets) {
    const rows = CF.compareRows(A, side(design.fromPreset(p)));
    rows.forEach((r) => {
      [r.a, r.b].forEach((c) => { if (c.value == null) assert.ok(c.reason, `${p.id} ${r.key} 理由なし`); });
      if (r.abs == null) assert.ok(r.diffReason);
      CF.diffText(r); CF.valueText(r.a, r); CF.pubText(r.a, r);
    });
  }
});

test('書き出し: ファイル名の置換', () => {
  assert.strictEqual(EX.safeFileName('a/b:c*d?e"f<g>h|i\\j', '.json'), 'a_b_c_d_e_f_g_h_i_j.json');
  assert.strictEqual(EX.safeFileName('  ..  ', '.csv'), 'design.csv');
  assert.strictEqual(EX.safeFileName('', '.csv'), 'design.csv');
  assert.strictEqual(EX.safeFileName('CON', '.csv'), '_CON.csv');
  assert.strictEqual(EX.safeFileName('x'.repeat(200), '').length, 80);
  assert.strictEqual(EX.safeFileName('a\nb', ''), 'a_b');
});

test('書き出し: CSV のセルは式インジェクション対策と引用符のエスケープ', () => {
  ['=1+1', '@SUM(A1)', '\tx', '\rx'].forEach((s) => assert.ok(EX.csvCell(s).replace(/^"/, '').startsWith("'"), s));
  assert.strictEqual(EX.csvCell('a,b'), '"a,b"');
  assert.strictEqual(EX.csvCell('say "hi"'), '"say ""hi"""');
  assert.strictEqual(EX.csvCell('x\ny'), '"x\ny"');
  assert.strictEqual(EX.csvCell(null), '');
  assert.strictEqual(EX.csvCell('日本語'), '日本語');
  assert.strictEqual(EX.csvCell('1=1'), '1=1');
});

test('書き出し: CSV は BOM 付きで 5 列、値なしは「—」と理由(0 で埋めない)。設計名が式でも無効化される', () => {
  const m = design.fromScratch({ name: '=cmd|x', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  const rows = EX.resultRows(m, evalOf(m));
  const csv = EX.toCsv(rows);
  assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.startsWith('\uFEFF項目,値,区分,確度,注記\r\n'));
  assert.ok(csv.includes("'=cmd|x"));
  const pw = rows.find((r) => r.item.startsWith('電力'));
  assert.strictEqual(pw.value, '—'); assert.ok(pw.note.includes('値なし'));
  const tj = rows.find((r) => r.item.startsWith('温度'));
  assert.strictEqual(tj.value, '—');
  assert.ok(rows.some((r) => r.item === 'シングル性能 GB7 ST 公開値との差(%)' && r.value === '—' && r.note.includes('混合')));
});

test('書き出し: A 再現では公開値と差、区分・確度が入る。要約テキストと JSON(保存形式と同じ)', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const ev = evalOf(d);
  const rows = EX.resultRows(d, ev);
  const st = rows.find((r) => r.item.startsWith('シングル性能 GB7 ST(pt)'));
  assert.ok(Number(st.value) > 0 && st.kind === '予測' && st.conf);
  assert.ok(rows.some((r) => r.item === 'シングル性能 GB7 ST 公開値との差(%)' && /^-?\d/.test(r.value)));
  assert.strictEqual(rows.find((r) => r.item.startsWith('電力 モデル推定')).conf, '低');
  const txt = EX.toSummaryText(d, ev, { date: '2026-10-28 12:00' });
  assert.ok(txt.includes(d.name) && txt.includes('2026-10-28') && txt.includes('確度:低') && txt.includes('仮置き'));
  assert.strictEqual(EX.toJson(d), design.serialize(d));
  assert.ok(design.parse(EX.toJson(d)).ok);
});

test('書き出し: 全プリセット(再現・改良)で CSV と要約が作れる', () => {
  for (const p of D.presets) for (const mode of ['reproduce', 'improve']) {
    const d = design.fromPreset(p, { mode });
    const ev = evalOf(d);
    const rows = EX.resultRows(d, ev);
    EX.toSummaryText(d, ev);
    assert.ok(EX.toCsv(rows).split('\r\n').length > 8, p.id);
    rows.forEach((r) => assert.ok(r.item && typeof r.value === 'string', `${p.id}: ${r.item}`));
  }
});

test('書き出し: 数値だけのセルは ' + "'" + ' を付けず、数値以外の - + = @ は付ける', () => {
  assert.strictEqual(EX.csvCell('-2.5'), '-2.5');
  assert.strictEqual(EX.csvCell('+3'), '+3');
  assert.strictEqual(EX.csvCell('=1+1'), "'=1+1");
  assert.strictEqual(EX.csvCell('-abc'), "'-abc");
  assert.strictEqual(EX.csvCell('-1e5'), "'-1e5");
});

test('書き出し: ファイル名の予約名は最初の . より前で判定、80 文字切りでサロゲートペアを壊さない', () => {
  assert.strictEqual(EX.safeFileName('con.foo', '.csv'), '_con.foo.csv');
  assert.strictEqual(EX.safeFileName('com1.x.y', ''), '_com1.x.y');
  assert.strictEqual(EX.safeFileName('console', ''), 'console');
  const s = EX.safeFileName('😀'.repeat(100), '');
  assert.strictEqual(Array.from(s).length, 80);
  assert.ok(!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s));
});

test('比較: 丸めて 0 の差は符号を付けない(-0 を出さない)', () => {
  assert.strictEqual(CF.pctText(-0.04), '＝ 0.0%');
  assert.strictEqual(CF.pctText(0.04), '＝ 0.0%');
  assert.strictEqual(CF.pctText(-3.14), '▼ -3.1%');
  assert.strictEqual(CF.pctText(3.14), '▲ +3.1%');
  const t = CF.diffText({ abs: -0.0004, digits: 0, unit: 'pt', pct: -0.04, diffReason: null });
  assert.ok(!t.includes('-0') && t.startsWith('0 pt'), t);
  assert.ok(CF.diffText({ abs: -0.4, digits: 0, unit: 'pt', pct: -0.01, diffReason: null }).startsWith('0 pt(＝ 0.0%'));
});

test('比較: 比較先が元・別のプリセットのとき既定パッケージの注意を出す', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const mk = (k) => CF.compareNotes(side(d), Object.assign(side(d), { sourceKey: k })).some((t) => t.includes('既定のパッケージ設定で評価'));
  assert.ok(mk('origin')); assert.ok(mk('preset')); assert.ok(!mk('history'));
});

// ---- PNG(ダイ図)の純ロジック ----
test('PNG: 注記・主要値・区分が画像用テキストに入り、値が無い項目は 0 で埋めず理由を書く', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const info = EX.pngInfo(d, evalOf(d), { date: '2026-10-31 12:00', mode: 'power' });
  assert.strictEqual(info.title, d.name);
  assert.ok(info.subtitle.includes('電力密度ヒートマップ') && info.subtitle.includes('2026-10-31 12:00'));
  assert.deepStrictEqual(info.values.map((v) => v.label), ['ST', 'MT', 'ダイ面積', '電力(推定)', '温度 Tj(推定)']);
  assert.ok(info.values[3].text.includes('確度:低') && info.values[0].text.includes('予測'));
  assert.ok(info.note.includes('性能・面積は概算') && info.note.includes('電力・温度は推定(確度:低)') && info.note.includes('模式図'));
  assert.ok(info.values.every((v) => !v.text.includes('NaN') && !v.text.includes('undefined')));
  const bad = EX.pngInfo(d, null, {});
  assert.ok(bad.values.every((v) => v.text.includes('—(')));
  assert.ok(bad.subtitle.includes('ブロック配置'));
});

test('PNG: 出力幅は上限 2400・下限 900 に収まり devicePixelRatio で巨大にならない。高さ超過・不正値は ok:false', () => {
  assert.strictEqual(EX.pngMetrics(8000).width, 2400);
  assert.strictEqual(EX.pngMetrics(300).width, 900);
  assert.strictEqual(EX.pngMetrics(1500).width, 1500);
  [0, -1, NaN, Infinity, undefined, '5'].forEach((v) => assert.strictEqual(EX.pngMetrics(v).ok, false, String(v)));
  const m = EX.pngMetrics(1200);
  const L = EX.pngLayout(m, { srcW: 1200, srcH: 600, legendRows: 2, valueLines: 5, noteLines: 2 });
  assert.ok(L.ok && L.width === 1200 && L.image.w === 1200 - 2 * m.pad && L.image.h === Math.round(L.image.w / 2));
  assert.ok(L.title.y < L.subtitle.y && L.subtitle.y < L.image.y && L.image.y + L.image.h <= L.legend.y && L.legend.y < L.values.y && L.values.y < L.note.y && L.note.y < L.height);
  const L0 = EX.pngLayout(m, { srcW: 1200, srcH: 600, legendRows: 0, valueLines: 5, noteLines: 1 });
  assert.ok(L0.height < L.height);
  // 縦長: 失敗でなく高さ 4800 に合わせて縮小(中央寄せ)。縮小後の幅が下限未満なら失敗
  const tl = EX.pngLayout(m, { srcW: 1200, srcH: 6000, legendRows: 1, valueLines: 5, noteLines: 1 });
  assert.ok(tl.ok && tl.height === EX.PNG.MAX_HEIGHT && tl.image.w < 1200 - 2 * m.pad && tl.image.w >= 900 - 2 * m.pad);
  assert.strictEqual(tl.image.x, m.pad + Math.round((m.width - 2 * m.pad - tl.image.w) / 2));
  assert.ok(tl.image.y + tl.image.h <= tl.legend.y && tl.note.y < tl.height);
  const tall = EX.pngLayout(m, { srcW: 1200, srcH: 100000, legendRows: 0, valueLines: 5, noteLines: 1 });
  assert.strictEqual(tall.ok, false); assert.ok(tall.reason.includes('大きすぎ'));
  assert.strictEqual(EX.pngLayout(m, { srcW: 1200, srcH: 600, titleLines: 2, legendRows: 0, valueLines: 5, noteLines: 1 }).image.y, L0.image.y + m.titleH);
  assert.strictEqual(EX.pngLayout(m, { srcW: 0, srcH: 10 }).ok, false);
  assert.strictEqual(EX.pngLayout({ ok: false, reason: 'x' }, {}).reason, 'x');
});

test('PNG: wrapText は幅以内に折り返し、文字を失わない', () => {
  const measure = (t) => Array.from(t).length * 10;
  const lines = EX.wrapText(measure, 'あいうえおかきくけこさ', 35);
  assert.deepStrictEqual(lines, ['あいう', 'えおか', 'きくけ', 'こさ']);
  assert.strictEqual(lines.join(''), 'あいうえおかきくけこさ');
  assert.deepStrictEqual(EX.wrapText(measure, '', 100), []);
  assert.deepStrictEqual(EX.wrapText(measure, 'ab', 1), ['a', 'b']);
});

test('PNG: タイトルの制御文字・双方向制御文字は空白に置換し、2 行を超える分は … で切る', () => {
  assert.strictEqual(EX.sanitizeText('a' + String.fromCharCode(8238) + 'b' + String.fromCharCode(8294) + 'c' + String.fromCharCode(0) + 'd' + String.fromCharCode(10) + 'e' + String.fromCharCode(8207) + 'f'), 'a b c d e f');
  assert.strictEqual(EX.sanitizeText(null), '');
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  assert.strictEqual(EX.pngInfo(Object.assign({}, d, { name: 'x' + String.fromCharCode(0x202e) + 'y' }), evalOf(d), {}).title, 'x y');
  const measure = (t) => Array.from(t).length * 10;
  const lines = EX.wrapLimited(measure, 'あ'.repeat(50), 100, 2);
  assert.strictEqual(lines.length, 2); assert.ok(lines[1].endsWith('…') && measure(lines[1]) <= 100);
  assert.deepStrictEqual(EX.wrapLimited(measure, 'あ'.repeat(15), 100, 2), ['あ'.repeat(10), 'あ'.repeat(5)]);
  assert.ok(EX.pngInfo(d, evalOf(d), { mode: 'power', noData: true }).subtitle.includes('電力密度ヒートマップ(推定)(データなし)'));
});

// ---- 3 設計の比較(現在 + 比較先 最大 2) ----
test('3 列比較: 差は各比較先ごとに 現在−比較先。比較先どうしの差は持たない。1 対 1 と同じ値になる', () => {
  const cur = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const A = side(cur);
  const b1 = side(design.fromPreset(P('amd-zen4-7950x'), { mode: 'reproduce' }));
  const b2 = side(design.fromPreset(P('intel-rpl-13700k'), { mode: 'reproduce' }));
  const rows = CF.compareMulti(A, [b1, b2]);
  assert.strictEqual(rows.length, CF.ROWS.length);
  const one1 = CF.compareRows(A, b1); const one2 = CF.compareRows(A, b2);
  rows.forEach((r, i) => {
    assert.strictEqual(r.others.length, 2);
    assert.strictEqual(r.others[0].abs, one1[i].abs); assert.strictEqual(r.others[1].abs, one2[i].abs);
    assert.strictEqual(r.others[0].pct, one1[i].pct); assert.strictEqual(r.others[1].pct, one2[i].pct);
    assert.ok(!('abs' in r) && !('b' in r));
  });
  const st = rows.find((r) => r.key === 'st');
  assert.strictEqual(st.others[0].abs, st.a.value - b1.ev.st.score);
  assert.strictEqual(st.others[1].abs, st.a.value - b2.ev.st.score);
  assert.ok(CF.diffText(CF.pairRow(st, 1)).includes('pt'));
  assert.ok(st.others[0].cell.pub && st.others[1].cell.pub, '未編集 B は公開値との差が出る');
  const notes = CF.compareNotesMulti(A, [b1, b2]);
  assert.ok(notes.some((t) => t.includes('比較先どうしの差は出しません')));
});

test('3 列比較: 比較先 1 つだけなら compareRows と同じ。比較先 0 / 3 以上でも壊れない', () => {
  const A = side(design.fromPreset(P('intel-rpl-13900k')));
  const b = side(design.fromPreset(P('amd-zen4-7950x')));
  const one = CF.compareRows(A, b);
  const m = CF.compareMulti(A, [b]);
  m.forEach((r, i) => { assert.strictEqual(r.others.length, 1); assert.strictEqual(CF.diffText(CF.pairRow(r, 0)), CF.diffText(one[i])); });
  assert.deepStrictEqual(CF.compareNotesMulti(A, [b]), CF.compareNotes(A, b));
  assert.strictEqual(CF.compareMulti(A, []).every((r) => r.others.length === 0), true);
  assert.strictEqual(CF.compareMulti(A, [b, b, b])[0].others.length, 2);
});

test('3 列比較: 比較先の解決(未選択・なし・エラー・重複)', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' });
  const args = { presets: D.presets, baseline: d };
  let r = CF.resolveTargets([{ key: 'origin' }, { key: 'none' }], d, args);
  assert.strictEqual(r.targets.length, 1); assert.strictEqual(r.errors.length, 0); assert.strictEqual(r.duplicates.length, 0);
  r = CF.resolveTargets([{ key: 'origin' }, { key: 'history' }], d, args);
  assert.strictEqual(r.targets.length, 1, '履歴の最初が元のプリセットと同じ設計なら重複');
  const base2 = design.fromPreset(P('amd-zen4-7950x'));
  r = CF.resolveTargets([{ key: 'origin' }, { key: 'history' }], d, { presets: D.presets, baseline: base2 });
  assert.strictEqual(r.targets.length, 2, '別の設計なら 2 つ並ぶ');
  // 同じ種類・同じプリセットの重複 → 2 つ目は除く
  r = CF.resolveTargets([{ key: 'preset', presetId: 'amd-zen4-7950x' }, { key: 'preset', presetId: 'amd-zen4-7950x' }], d, args);
  assert.strictEqual(r.targets.length, 1); assert.deepStrictEqual(r.duplicates.map((x) => x.index), [1]);
  // 元のプリセットと「別のプリセット」で同じプリセットを選んだ場合も同じ設計なので重複
  r = CF.resolveTargets([{ key: 'origin' }, { key: 'preset', presetId: 'intel-rpl-13900k' }], d, args);
  assert.strictEqual(r.targets.length, 1); assert.strictEqual(r.duplicates.length, 1);
  // プリセット未選択はエラー(理由つき)。もう一方は有効
  r = CF.resolveTargets([{ key: 'preset', presetId: '' }, { key: 'origin' }], d, args);
  assert.strictEqual(r.targets.length, 1); assert.strictEqual(r.errors[0].index, 0); assert.ok(r.errors[0].reason);
  // 履歴なし
  r = CF.resolveTargets([{ key: 'history' }], d, { presets: D.presets });
  assert.strictEqual(r.targets.length, 0); assert.strictEqual(r.errors.length, 1);
  // 3 つ目は無視、空指定は何も返さない
  assert.strictEqual(CF.resolveTargets([{ key: 'origin' }, { key: 'history' }, { key: 'origin' }], d, { presets: D.presets, baseline: base2 }).targets.length, 2);
  assert.strictEqual(CF.resolveTargets([], d, args).targets.length, 0);
});

test('3 列比較: 値なし(混合)は各列で「—(理由)」、編集済み/未編集で公開値の差が分かれ、比較先名が理由に入る', () => {
  const orig = design.fromPreset(P('intel-rpl-13900k'), { mode: 'improve' });
  const e = design.setClock(orig, orig.cfg.cores[0].type, 6.2);
  assert.ok(e.ok, e.reason);
  const mix = design.fromScratch({ name: 'mix', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  const A = side(e.design); const B1 = side(design.fromPreset(P('intel-rpl-13900k'), { mode: 'reproduce' })); const B2 = side(mix);
  const rows = CF.compareMulti(A, [B1, B2]);
  const st = rows.find((r) => r.key === 'st'); const pw = rows.find((r) => r.key === 'power');
  assert.strictEqual(st.a.pub, null); assert.ok(st.others[0].cell.pub); assert.strictEqual(st.others[1].cell.pub, null);
  assert.ok(st.others[0].abs > 0);
  assert.strictEqual(pw.others[1].abs, null);
  assert.ok(pw.others[1].diffReason.includes('比較先B'));
  assert.ok(CF.diffText(CF.pairRow(pw, 1)).startsWith('—('));
  assert.ok(CF.valueText(pw.others[1].cell, pw).startsWith('—('));
  const area = rows.find((r) => r.key === 'area');
  assert.strictEqual(area.others[1].kindMismatch, true); assert.strictEqual(area.others[0].kindMismatch, false);
  const notes = CF.compareNotesMulti(A, [B1, B2]);
  assert.ok(notes.some((t) => t.startsWith('現在は編集後')) && notes.some((t) => t.startsWith('比較先Bは混合設計')));
  rows.forEach((r) => r.others.forEach((o) => { if (o.abs == null) assert.ok(o.diffReason); }));
});

test('3 列比較: 全プリセットを比較先 A・B にしても例外にならない', () => {
  const A = side(design.fromPreset(P('intel-rpl-13900k')));
  const ps = D.presets.slice(0, 12).map((p) => side(design.fromPreset(p)));
  for (let i = 0; i + 1 < ps.length; i++) CF.compareMulti(A, [ps[i], ps[i + 1]]).forEach((r) => r.others.forEach((o, k) => { CF.diffText(CF.pairRow(r, k)); CF.valueText(o.cell, r); CF.pubText(o.cell, r); }));
});

test('書き出し(CSV/JSON/要約)に比較は含まれない(3 列対応は不要)', () => {
  const d = design.fromPreset(P('intel-rpl-13900k'));
  const ev = evalOf(d);
  const csv = EX.toCsv(EX.resultRows(d, ev)); const txt = EX.toSummaryText(d, ev, {}); const json = EX.toJson(d);
  [csv, txt, json].forEach((o) => assert.ok(!o.includes('比較先') && !o.includes('差(現在')));
});

test('参考値(判定外): 再現で refs があれば比較セル・書き出しに載る。判定の値は変えない。refs が空なら出力は従来どおり', () => {
  const withRef = design.fromPreset(D.presets.find((p) => { const e = evalOf(design.fromPreset(p, { mode: 'reproduce' })); return e.st && e.st.refs && e.st.refs.length; }), { mode: 'reproduce' });
  const ev = evalOf(withRef);
  const c = CF.cellOf('st', withRef, ev);
  assert.ok(c.refs && c.refs.length === ev.st.refs.length);
  assert.ok(c.refs.every((x) => !('verdict' in x)));
  assert.strictEqual(c.pub.errPct, ev.st.errPct);
  const t = CF.refTexts(c);
  assert.ok(t[0].startsWith('参考(判定外)') && t[0].includes('判定ではない'));
  const rows = EX.resultRows(withRef, ev);
  const rr = rows.filter((r) => r.item.includes('参考値(判定外)'));
  assert.ok(rr.length >= 1 && rr.every((r) => r.note.includes('判定には使わない') && r.kind.startsWith('参考(')));
  // refs を空にすると、参考値の行が無く、他の行は同じ
  const ev2 = JSON.parse(JSON.stringify(ev)); ev2.st.refs = []; ev2.mt.refs = [];
  const base = EX.resultRows(withRef, ev2);
  assert.deepStrictEqual(rows.filter((r) => !r.item.includes('参考値(判定外)')), base);
  assert.deepStrictEqual(CF.refTexts(CF.cellOf('st', withRef, ev2)), []);
  assert.strictEqual(CF.cellOf('st', withRef, ev2).refs, undefined);
  // 編集後は載せない
  const ed = design.setClock(design.fromPreset(P('intel-rpl-13900k'), { mode: 'improve' }), 'P', 6.2);
  assert.ok(ed.ok);
  assert.strictEqual(P('intel-mtl-185h') != null, true);
  const mtl = design.fromPreset(P('intel-mtl-185h'), { mode: 'improve' });
  const mtlEd = design.setClock(mtl, mtl.cfg.cores[0].type, 4.5);
  assert.ok(mtlEd.ok, mtlEd.reason);
  const mix = design.fromScratch({ name: 'mix', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  [ed.design, mtlEd.design, mix].forEach((dd) => {
    const e = evalOf(dd);
    ['st', 'mt'].forEach((k) => assert.strictEqual(CF.cellOf(k, dd, e).refs, undefined, k));
    assert.ok(!EX.resultRows(dd, e).some((r) => r.item.includes('参考値(判定外)')));
  });
});
