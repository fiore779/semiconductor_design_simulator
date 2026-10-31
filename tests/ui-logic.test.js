'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D, gb7ByName } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const PL = require('../js/ui/presetlist.js');
const R = require('../js/ui/reproduce.js');
const W = require('../js/ui/warnings.js');
const P = (id) => D.presets.find((p) => p.id === id);
const ctx = E.makeContext();
const ev = (id) => E.evaluate(design.fromPreset(P(id)), ctx);

test('充実度: 13900K は ●、5800X(面積・電力が未取得)は ○、7700(IOD 面積未取得)は ◐', () => {
  assert.strictEqual(PL.completeness(P('intel-rpl-13900k'), gb7ByName).symbol, '●');
  const x = PL.completeness(P('amd-zen3-5800x'), gb7ByName);
  assert.strictEqual(x.symbol, '○'); assert.deepStrictEqual(x.missing, ['面積', '電力']);
  assert.strictEqual(PL.completeness(P('amd-zen4-7700'), gb7ByName).symbol, '◐');
});

test('区分ラベル: 未取得は「未取得」', () => {
  assert.deepStrictEqual(['meas', 'pub', 'sec', null].map(PL.sourceLabel), ['実測', '公表', '二次', '未取得']);
  assert.strictEqual(PL.areaSummary(P('amd-zen3-5800x')).text, '未取得');
  assert.ok(PL.areaSummary(P('amd-zen4-7700')).partial);
});

test('絞り込み: メーカー・種別・検索・年・充実度', () => {
  const all = D.presets;
  const amd = PL.filterPresets(all, { vendors: ['AMD'] }, gb7ByName);
  assert.ok(amd.length > 0 && amd.every((p) => p.vendor === 'AMD'));
  assert.strictEqual(PL.filterPresets(all, {}, gb7ByName).length, all.length);
  assert.ok(PL.filterPresets(all, { query: '9700x' }, gb7ByName).some((p) => p.id === 'amd-zen5-9700x'));
  assert.ok(PL.filterPresets(all, { yearMin: 2024 }, gb7ByName).every((p) => p.year >= 2024));
  assert.ok(PL.filterPresets(all, { levels: ['poor'] }, gb7ByName).every((p) => PL.completeness(p, gb7ByName).level === 'poor'));
  assert.strictEqual(PL.filterPresets(all, { query: 'xxxxnone' }, gb7ByName).length, 0);
});

test('並べ替え: 未取得は常に末尾', () => {
  [1, -1].forEach((dir) => {
    const areas = PL.sortPresets(D.presets, 'area', dir, gb7ByName).map((p) => PL.areaSummary(p).mm2);
    const i = areas.indexOf(null);
    assert.ok(i > 0 && areas.slice(i).every((a) => a === null));
  });
});

test('再現度の行: 代表は注記つき ok、MT は確度低、面積は同じ値、電力は計算値なし、未取得は判定しない', () => {
  const rows = R.reproductionRows(ev('amd-zen5-9700x'));
  assert.strictEqual(rows[0].verdict, 'ok'); assert.ok(rows[0].note.includes('検証ではない'));
  assert.ok(rows[1].note.includes('確度「低」'));
  assert.strictEqual(rows[2].verdict, 'trivial');
  assert.strictEqual(rows[3].sim, null);
  const r2 = R.reproductionRows(ev('amd-zen3-5800x'));
  assert.strictEqual(r2[2].verdict, 'na'); assert.strictEqual(r2[3].published, null); assert.ok(r2[3].note.includes('未取得'));
});

test('再現度: 許容を超えるものは ng(Meteor Lake 185H はモデルの限界で外れる)', () => {
  const rows = R.reproductionRows(ev('intel-mtl-185h'));
  assert.ok(rows.some((r) => r.verdict === 'ng'));
});

test('警告: 記号つきで重大度順に並ぶ', () => {
  const d = W.decorate([{ level: 'info', text: 'a' }, { level: 'error', text: 'b', blockId: 'x' }, { level: 'warn', text: 'c' }]);
  assert.deepStrictEqual(d.map((x) => x.symbol), ['✗', '⚠', 'ⓘ']);
  assert.ok(d[0].clickable && !d[1].clickable);
  assert.deepStrictEqual(W.counts([{ level: 'warn' }, { level: 'zzz' }]), { error: 0, warn: 1, info: 1 });
});

test('再現度: MT の仮 IPC(fallback)は判定しない(gray)、混在クロックと代表 SKU の注記、面積の差は null', () => {
  const rows = R.reproductionRows({
    tolerance: 0.1,
    st: { ok: true, score: 100, published: 100, publishedKind: 'x', errPct: 0, isCalibSample: false },
    mt: { ok: true, score: 500, published: 100, publishedKind: 'x', errPct: 400, fallback: true, mixedClock: true, isCalibSample: false },
    area: { totalMm2: 100, unknownCount: 0 }, power: { published: {}, reason: null },
  });
  assert.strictEqual(rows[1].verdict, 'gray');
  assert.ok(/仮の IPC を含むため信頼できない/.test(rows[1].note) && /boost 未取得/.test(rows[1].note));
  assert.strictEqual(rows[2].diffPct, null);
  const r2 = R.reproductionRows({
    tolerance: 0.1, st: { ok: false, reason: 'x', published: null },
    mt: { ok: true, score: 100, published: 100, publishedKind: 'x', errPct: 0, calibNotUsedForMt: true, isCalibSample: false },
    area: { totalMm2: null, reason: 'r' }, power: { published: {}, reason: null },
  });
  assert.ok(/MT の σ の合わせには使っていない/.test(r2[1].note) && !/一致して当然/.test(r2[1].note));
});

test('commitplan: ドラッグ+離す=1 手 / 続けて別のドラッグ=2 手 / 直後の矢印キー=別の手', () => {
  const CP = require('../js/ui/commitplan.js');
  const H = require('../js/history/history.js');
  let t = 0;
  const h = H.createHistory({ limit: 200, now: () => t }); // main.js と同じ設定(windowMs なし)
  let st = CP.initialState(); let cur = 0;
  const change = (info) => { // main.js の onChange + commit 相当
    const plan = CP.planChange(st, info); st = plan.state;
    h.push({ v: cur }, { v: ++cur }, info.label || '移動', { coalesce: plan.merge });
  };
  const drag = (label) => { change({ coalesce: true, label }); t += 20; change({ coalesce: true, label }); t += 20; change({ coalesce: false, label }); };
  drag('A');
  assert.strictEqual(h.list().length, 2); // 最初の状態 + 1 手
  t += 800; drag('A');
  assert.strictEqual(h.list().length, 3); // 0.8 秒後の別ドラッグは別の手(同じ label でも)
  t += 20; change({ coalesce: false, label: 'A' }); // 矢印キー(単発)
  assert.strictEqual(h.list().length, 4);
});

test('commitplan + history: ドラッグ中に 2 秒止めて離しても 1 手(時間の窓を使わない)', () => {
  const CP = require('../js/ui/commitplan.js');
  const H = require('../js/history/history.js');
  let t = 0;
  const h = H.createHistory({ limit: 200, now: () => t }); // main.js と同じ設定(windowMs なし)
  let st = CP.initialState(); let cur = 0;
  const change = (info) => { const plan = CP.planChange(st, info); st = plan.state; h.push({ v: cur }, { v: ++cur }, '移動', { coalesce: plan.merge }); };
  change({ coalesce: true }); t += 20; change({ coalesce: true });
  t += 2000; change({ coalesce: true }); // ドラッグの途中で 2 秒止める
  t += 2000; change({ coalesce: false }); // 止めたまま離す
  assert.strictEqual(h.list().length, 2); // 最初の状態 + 1 手
});

test('再現度: 電力の行(モデル推定 vs ピーク)。±15% で ✓/✗、公表ピーク無し・校正不可は判定しない、注記は必ず付く', () => {
  const rows = R.reproductionRows(ev('intel-adl-12900k'));
  const r = rows[rows.length - 1];
  assert.ok(/電力制限なし/.test(r.label) && /実測のピーク/.test(r.label));
  assert.strictEqual(r.published, 258.6); assert.ok(r.sim > 0);
  assert.strictEqual(r.verdict, Math.abs(r.diffPct) <= 15 ? 'ok' : 'ng');
  assert.ok(r.note.includes(R.POWER_CAVEAT) && /電力制限下/.test(r.note) && /未校正/.test(r.note));
  const mkEv = (pm) => ({ tolerance: 0.1, st: { ok: false, reason: 'x', published: null }, mt: { ok: false, reason: 'x', published: null }, area: { totalMm2: null, reason: 'r' }, power: { published: {}, reason: null }, powerModel: pm });
  const last = (pm) => { const x = R.reproductionRows(mkEv(pm)); return x[x.length - 1]; };
  const inTol = last({ ok: true, estW: 110, vsPublishedPeak: { publishedW: 100, estW: 110, errPct: 10 } });
  assert.strictEqual(inTol.verdict, 'ok'); assert.strictEqual(inTol.diffPct, 10);
  assert.strictEqual(last({ ok: true, estW: 115, vsPublishedPeak: { publishedW: 100, estW: 115, errPct: 15 } }).verdict, 'ok');
  assert.strictEqual(last({ ok: true, estW: 116, vsPublishedPeak: { publishedW: 100, estW: 116, errPct: 16 } }).verdict, 'ng');
  assert.strictEqual(last({ ok: true, estW: 80, vsPublishedPeak: { publishedW: 100, estW: 80, errPct: -20 } }).verdict, 'ng');
  const noPeak = last({ ok: true, estW: 80 });
  assert.strictEqual(noPeak.verdict, 'na'); assert.ok(/判定しない/.test(noPeak.note) && /未取得/.test(noPeak.note) && noPeak.note.includes(R.POWER_CAVEAT));
  const bad = last({ ok: false, reason: '基本電力が未取得' });
  assert.strictEqual(bad.verdict, 'na'); assert.ok(/基本電力が未取得/.test(bad.note));
  assert.strictEqual(last(undefined).verdict, 'na');
});

test('groupByFamily: 並び(メーカー→年の降順→名前)・空リスト・family 未定義は「その他」・全件が1回ずつ入る', () => {
  assert.deepStrictEqual(PL.groupByFamily([]), []);
  const L = [
    { id: 'a', vendor: 'B', family: 'F1', year: 2020, name: 'z' },
    { id: 'b', vendor: 'A', family: 'F2', year: 2021, name: 'y' },
    { id: 'c', vendor: 'A', family: 'F3', year: 2023, name: 'x' },
    { id: 'd', vendor: 'A', family: 'F2', year: 2021, name: 'a' },
    { id: 'e', vendor: 'A', year: 2010, name: 'q' },
  ];
  const g = PL.groupByFamily(L);
  assert.deepStrictEqual(g.map((x) => `${x.vendor}/${x.family}`), ['A/F3', 'A/F2', 'A/その他', 'B/F1']);
  assert.deepStrictEqual(g[1].items.map((p) => p.id), ['d', 'b']);
  assert.strictEqual(g[2].items[0].id, 'e');
  const all = PL.groupByFamily(D.presets);
  assert.strictEqual(all.reduce((s, x) => s + x.items.length, 0), D.presets.length);
  assert.ok(all.length > 1 && all.length < D.presets.length);
});

test('groupByFamily: 同じ年のファミリーは新しい世代が上(Zen 5 → Zen 4 → Zen 3+)', () => {
  const L = [
    { id: 'a', vendor: 'AMD', family: 'Zen 3+ (Rembrandt-R)', year: 2023, name: 'a' },
    { id: 'b', vendor: 'AMD', family: 'Zen 4 (Phoenix)', year: 2023, name: 'b' },
    { id: 'c', vendor: 'AMD', family: 'Zen 5 (Granite Ridge)', year: 2023, name: 'c' },
    { id: 'd', vendor: 'AMD', family: 'Zen 10 (X)', year: 2023, name: 'd' },
  ];
  assert.deepStrictEqual(PL.groupByFamily(L).map((x) => x.family.split(' ')[1]), ['10', '5', '4', '3+']);
});

test('絞り込み: 命令セット・充実度。server ラベル', () => {
  const all = D.presets;
  const arm = PL.filterPresets(all, { isa: ['arm'] }, gb7ByName);
  assert.ok(arm.length > 0 && arm.every((p) => p.isa === 'arm'));
  const x86 = PL.filterPresets(all, { isa: ['x86'] }, gb7ByName);
  assert.strictEqual(arm.length + x86.length, all.filter((p) => p.isa === 'arm' || p.isa === 'x86').length);
  assert.strictEqual(PL.filterPresets(all, { isa: [] }, gb7ByName).length, all.length);
  const full = PL.filterPresets(all, { levels: ['full'] }, gb7ByName);
  assert.ok(full.length > 0 && full.every((p) => PL.completeness(p, gb7ByName).level === 'full'));
  const armFull = PL.filterPresets(all, { isa: ['arm'], levels: ['full'] }, gb7ByName);
  assert.ok(armFull.every((p) => p.isa === 'arm' && PL.completeness(p, gb7ByName).level === 'full') && armFull.length <= Math.min(arm.length, full.length));
  assert.strictEqual(PL.kindLabel('server'), 'サーバー');
});

test('gb7Basis: n が null のものは件数を出さない(0 や推測で埋めない)', () => {
  assert.strictEqual(PL.gb7Basis(null), null);
  assert.deepStrictEqual(PL.gb7Basis({ kind: '中央値', n: 1 }), { label: '中央値 n=1', n: 1, low: true });
  assert.strictEqual(PL.gb7Basis({ kind: '中央値', n: 7 }).low, false);
  const unk = PL.gb7Basis({ kind: '中央値', n: null });
  assert.strictEqual(unk.n, null); assert.ok(!/n=/.test(unk.label)); assert.strictEqual(unk.low, null);
  assert.strictEqual(PL.gb7Basis({ kind: '直近25件の中央値', n: null }).label, '直近25件の中央値');
  assert.strictEqual(PL.gb7Basis({ kind: '個別投稿の中央値', n: null }).label, '個別投稿の中央値');
  assert.strictEqual(PL.gb7Basis({ kind: '個別投稿 n=5以上', n: null }).low, true);
  assert.strictEqual(PL.lowReason({ kind: '中央値', n: 2 }), '件数が少ない(n≤2)');
  assert.strictEqual(PL.lowReason({ kind: '個別投稿の中央値', n: null }), '個別投稿の中央値');
  assert.strictEqual(PL.lowReason({ kind: '中央値', n: 9 }), null);
  assert.strictEqual(PL.gb7Basis({ kind: 'チャート', n: null }).label, 'チャート');
  assert.ok(!PL.gb7Basis({ kind: '直近25件の中央値', n: null }).label.includes('n='));
  Object.values(gb7ByName).forEach((r) => { const b = PL.gb7Basis(r); assert.ok(b.label); if (r.n == null) assert.strictEqual(b.n, null); });
});
