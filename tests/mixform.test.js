'use strict';
// 混合設計(モード C)の画面用の純関数(js/ui/mixform.js)。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'blocklib.js'));
const DS = require('../js/model/design.js');
const BL = require('../js/model/blocklib.js');
const MF = require('../js/ui/mixform.js');

const parts = BL.build(D.presets, D.blocklibAreas, D.nodes);
const P = (id) => BL.get(parts, id);
const mk = () => DS.fromScratch({ name: 't', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4' });

test('filterParts: 命令セット・メーカー・種類・テキスト', () => {
  const x86 = MF.filterParts(parts, { isa: 'x86' });
  assert.ok(x86.length > 0 && x86.every((p) => p.isa === 'x86'));
  const arm = MF.filterParts(parts, { isa: 'arm', kind: 'core' });
  assert.ok(arm.length > 0 && arm.every((p) => p.isa === 'arm' && p.kind === 'core'));
  assert.ok(MF.filterParts(parts, { kind: 'l3' }).every((p) => p.kind === 'l3'));
  const zen5 = MF.filterParts(parts, { text: 'zen 5' });
  assert.ok(zen5.some((p) => p.id === 'core:amd-zen5-9700x:P'));
  assert.strictEqual(MF.filterParts(parts, { text: 'このチップは存在しない' }).length, 0);
  assert.strictEqual(MF.filterParts(parts, {}).length, parts.length);
  const v = MF.vendorsOf(parts);
  assert.ok(v.includes('AMD') && MF.filterParts(parts, { vendor: 'AMD' }).every((p) => p.vendor === 'AMD'));
});

test('partName: コアは「Zen 5 コア(チップ名)」', () => {
  assert.ok(MF.partName(P('core:amd-zen5-9700x:P')).startsWith('Zen 5 コア('));
  assert.ok(MF.partName(P('core:amd-zen5-9700x:P')).includes('9700X'));
  assert.strictEqual(MF.partName(P('l3:amd-zen5-9700x')), P('l3:amd-zen5-9700x').label);
});

test('areaBadge: 表 / 推定(仮の比率の注記)/ 未取得', () => {
  const t = MF.areaBadge(P('core:mt-9400:P'));
  assert.strictEqual(t.cls, 'table'); assert.strictEqual(t.label, '表'); assert.ok(t.text.startsWith('表 ') && t.text.endsWith('mm²'));
  assert.strictEqual(t.mm2, 3.335); // L2 込み
  const e = MF.areaBadge(P('core:amd-zen5-9700x:P'));
  assert.strictEqual(e.cls, 'estimated'); assert.ok(e.text.startsWith('推定 ')); assert.ok(e.note.includes('仮'));
  const u = MF.areaBadge({ kind: 'core', area: { mm2: null, origin: 'unknown' } });
  assert.strictEqual(u.cls, 'unknown'); assert.strictEqual(u.mm2, null); assert.ok(u.text.includes('未取得'));
  assert.strictEqual(MF.areaBadge({}).cls, 'unknown');
  assert.deepStrictEqual(['table', 'estimated', 'unknown', 'ported'].map(MF.areaClassLabel), ['表', '推定', '未取得', '移植']);
  // 2 軸: 出所(table / estimated / unknown)と移植の換算(portConverted)を別に数える。推定かつ移植は両方に入る
  const c = MF.areaClassCounts([{ class: 'table' }, { class: 'estimated', portConverted: true }, { class: 'estimated' }, { class: 'zzz' }]);
  assert.deepStrictEqual(c, { table: 1, estimated: 2, unknown: 1, derived: 0, ported: 1 });
  assert.strictEqual(MF.areaClassCounts([{ class: 'derived' }, { class: 'derived', portConverted: true }]).derived, 2);
  assert.strictEqual(MF.areaClassLabel('derived'), '導出(範囲)'); assert.strictEqual(MF.areaClassText('derived', true), '導出(範囲)・移植');
  assert.strictEqual(MF.areaClassText('estimated', true), '推定・移植'); assert.strictEqual(MF.areaClassText('table', false), '表');
  assert.strictEqual(MF.portLine({ portConverted: true, areaFromMm2: 7.43, portRatio: 100 / 143.7, areaMm2: 5.17, areaRangeMm2: [4.14, 5.17] }), '元 7.43 mm² × 0.696 → 5.17 mm²(幅 4.14〜5.17。目安)');
  assert.strictEqual(MF.portLine({ portConverted: false }), null);
  assert.ok(MF.utilizationText({ utilization: 0.5, usedMm2: 10, dieMm2: 20, portedCount: 2 }).includes('うち移植 2 個は換算値(目安)'));
});

test('preCheck: x86 のある設計に Arm コアを足すと error、同じ ISA なら無し、プロセス違いは warn', () => {
  let d = mk();
  const x86 = P('core:amd-zen5-9700x:P');
  const arm = P('core:mt-9400:P');
  assert.deepStrictEqual(MF.preCheck(d, x86, D.nodes).filter((x) => x.level === 'error'), []);
  const r = DS.addPart(d, x86, { count: 2 }); assert.ok(r.ok, r.reason); d = r.design;
  assert.deepStrictEqual(MF.preCheck(d, x86, D.nodes).filter((x) => x.level === 'error'), []);
  const pre = MF.preCheck(d, arm, D.nodes);
  const err = pre.find((x) => x.level === 'error');
  assert.ok(err && err.code === 'isa-mix' && err.text.includes('x86') && err.text.includes('Arm'));
  assert.ok(pre.some((x) => x.level === 'warn' && x.code === 'ported')); // 9400 は N3E、設計は N4
  assert.deepStrictEqual(MF.preCheck(null, arm), []);
  // L3 は ISA を持たないので error にならない
  assert.deepStrictEqual(MF.preCheck(d, P('l3:mt-9400'), D.nodes).filter((x) => x.level === 'error'), []);
});

test('parseDieSize: 解釈と検証メッセージ', () => {
  assert.deepStrictEqual(MF.parseDieSize('12', '12.5'), { ok: true, w: 12, h: 12.5 });
  assert.deepStrictEqual(MF.parseDieSize(' １２ ', '8'), { ok: true, w: 12, h: 8 });
  assert.strictEqual(MF.parseDieSize('', '5').ok, false);
  assert.ok(MF.parseDieSize('', '5').reason.includes('幅'));
  assert.ok(MF.parseDieSize('5', 'abc').reason.includes('高さ'));
  assert.ok(MF.parseDieSize('0.5', '5').reason.includes('1〜100'));
  assert.ok(MF.parseDieSize('101', '5').reason.includes('1〜100'));
  assert.strictEqual(MF.parseDieSize('1', '100').ok, true);
  // design.checkDieSize を渡すとその理由を使う(範囲は同じ)
  assert.strictEqual(MF.parseDieSize('200', '5', DS.checkDieSize).reason, DS.checkDieSize(200, 5));
  assert.strictEqual(MF.parseDieSize('10', '10', DS.checkDieSize).ok, true);
});

test('parseCount / parseCapacity', () => {
  assert.deepStrictEqual(MF.parseCount('8'), { ok: true, value: 8 });
  ['', '0', '65', '1.5', 'x', '-1'].forEach((s) => assert.strictEqual(MF.parseCount(s).ok, false, s));
  assert.strictEqual(MF.parseCount('64').ok, true);
  assert.deepStrictEqual(MF.parseCapacity('32'), { ok: true, value: 32 });
  assert.deepStrictEqual(MF.parseCapacity('16 MB'), { ok: true, value: 16 });
  ['', '0', '513', 'x', '-4'].forEach((s) => assert.strictEqual(MF.parseCapacity(s).ok, false, s));
});

test('履歴ラベル', () => {
  assert.strictEqual(MF.addLabel(P('core:amd-zen5-9700x:P'), 8), 'Zen 5 コアを 8 個追加');
  assert.strictEqual(MF.addLabel(P('l3:amd-zen5-9700x'), 1, 24), 'L3 24MB を追加');
  assert.strictEqual(MF.addLabel(P('l3:amd-zen5-9700x'), 1), 'L3 32MB を追加');
  assert.ok(MF.dieSizeLabel(12, 10).includes('12×10'));
  assert.ok(MF.clockLabel('Zen 5', 5).includes('5 GHz'));
  assert.ok(MF.removeLabel('X').includes('削除'));
});

test('blockGroups / utilizationText: Zen 5 コア 8 個 + L3', () => {
  let d = mk();
  let r = DS.addPart(d, P('core:amd-zen5-9700x:P'), { count: 8 }); assert.ok(r.ok, r.reason); d = r.design;
  r = DS.addPart(d, P('l3:amd-zen5-9700x'), {}); assert.ok(r.ok, r.reason); d = r.design;
  const g = MF.blockGroups(d);
  assert.strictEqual(g.length, 2);
  const core = g.find((x) => x.kind === 'core');
  assert.strictEqual(core.count, 8); assert.strictEqual(core.groupId, 'amd-zen5-9700x:P'); assert.strictEqual(core.blockIds.length, 8);
  assert.strictEqual(core.clockGHz, 5.5); assert.ok(core.areaMm2 > 0);
  assert.strictEqual(g.find((x) => x.kind === 'l3').groupId, null);
  // groupId は design.setBlockClock で通る
  assert.ok(DS.setBlockClock(d, core.groupId, 4.5).ok);
  const C = require('../js/model/compat.js');
  const u = C.utilization(d);
  const txt = MF.utilizationText({ utilization: u.ratio, usedMm2: u.usedMm2, dieMm2: u.dieMm2, unknownCount: 0 });
  assert.ok(txt.startsWith('使用率 ') && txt.includes('%'));
  assert.ok(MF.utilizationText({ utilization: 0.5, usedMm2: 1, dieMm2: 2, unknownCount: 3 }).includes('3 個'));
  assert.ok(MF.utilizationText(null).includes('算出できません'));
});

// ---- 検索(UI 整理 R6・R7。docs/design/ui-cleanup.md §4.1) ----
const ids = (a) => new Set(a.map((p) => p.id));
const subset = (a, b) => [...a].every((x) => b.has(x));

test('R7 searchTokens: NFKC・小文字・空白(全角含む)で分割。先頭 200 文字・最大 8 語', () => {
  assert.deepStrictEqual(MF.searchTokens('ＺＥＮ　５  Arm'), ['zen', '5', 'arm']);
  assert.deepStrictEqual(MF.searchTokens('   '), []);
  assert.deepStrictEqual(MF.searchTokens(null), []);
  assert.strictEqual(MF.searchTokens('a b c d e f g h i j').length, 8);
  assert.ok(MF.searchTokens('x'.repeat(10000))[0].length <= 200);
});

test('R7 filterParts: 複数語は AND(語順は問わない)で、旧版の一致集合を含む', () => {
  const a = ids(MF.filterParts(parts, { text: 'zen 5 9700x' }));
  const b = ids(MF.filterParts(parts, { text: 'zen 5' }));
  assert.ok(a.has('core:amd-zen5-9700x:P') && subset(a, b) && a.size < b.size);
  assert.deepStrictEqual([...ids(MF.filterParts(parts, { text: '9700x 5 zen' }))].sort(), [...a].sort());
  assert.strictEqual(MF.filterParts(parts, { text: 'zen 存在しない語' }).length, 0);
});

test('R7 filterParts: 検索対象の拡張(メーカー・命令セット・種類・プロセス)と正規表現記号', () => {
  const arm = ids(MF.filterParts(parts, { text: 'arm' }));
  assert.ok(MF.filterParts(parts, { isa: 'arm', kind: 'core' }).every((p) => arm.has(p.id)));
  assert.ok(parts.some((p) => p.isa === 'arm' && arm.has(p.id)));
  const amd = ids(MF.filterParts(parts, { text: 'amd' }));
  assert.ok(parts.filter((p) => p.vendor === 'AMD').every((p) => amd.has(p.id)));
  const l3 = ids(MF.filterParts(parts, { text: 'l3' }));
  assert.ok(parts.filter((p) => p.kind === 'l3').every((p) => l3.has(p.id)));
  const core = ids(MF.filterParts(parts, { text: 'コア' }));
  assert.ok(parts.filter((p) => p.kind === 'core').every((p) => core.has(p.id)));
  // プロセス名: nodes を渡したときだけ名前で探せる。nodeId では常に探せる
  const withNode = parts.find((p) => p.nodeId && D.nodes.some((n) => n.id === p.nodeId && !n.name.toLowerCase().includes(p.nodeId.toLowerCase())));
  assert.ok(withNode);
  const node = D.nodes.find((n) => n.id === withNode.nodeId);
  assert.ok(ids(MF.filterParts(parts, { text: node.name }, { nodes: D.nodes })).has(withNode.id));
  assert.ok(!ids(MF.filterParts(parts, { text: node.name })).has(withNode.id));
  assert.ok(ids(MF.filterParts(parts, { text: withNode.nodeId })).has(withNode.id));
  assert.doesNotThrow(() => MF.filterParts(parts, { text: '( [ . * + \\' }));
  assert.strictEqual(MF.filterParts(parts, { text: '.*' }).length, 0);
});

test('R7 filterParts: 全角は半角と同じ結果。空白だけなら全件、存在しない語は 0 件', () => {
  assert.deepStrictEqual([...ids(MF.filterParts(parts, { text: 'ＺＥＮ　５' }))].sort(), [...ids(MF.filterParts(parts, { text: 'zen 5' }))].sort());
  assert.strictEqual(MF.filterParts(parts, { text: '   ' }).length, parts.length);
  assert.strictEqual(MF.filterParts(parts, { text: 'zzzzqqqq' }).length, 0);
});

test('R7 highlightSegments: 連結すると元に戻る・一致部分・重なりの統合・空', () => {
  const cat = (s) => s.map((x) => x.text).join('');
  for (const [t, k] of [['Zen 5 コア(AMD)', ['zen', '5']], ['abc', []], ['ABC abc', ['abc']], ['x', ['zz']], ['aaa', ['aa']]]) assert.strictEqual(cat(MF.highlightSegments(t, k)), t);
  const seg = MF.highlightSegments('Zen 5 コア(AMD)', ['zen', '5']);
  assert.deepStrictEqual(seg.filter((x) => x.hit).map((x) => x.text), ['Zen', '5']);
  assert.deepStrictEqual(MF.highlightSegments('Zen', ['zen', 'en']), [{ text: 'Zen', hit: true }]);
  assert.deepStrictEqual(MF.highlightSegments('Zen', []), [{ text: 'Zen', hit: false }]);
  assert.deepStrictEqual(MF.highlightSegments('', ['a']), []);
  assert.deepStrictEqual(MF.highlightSegments('ABC', ['b']).map((x) => x.hit), [false, true, false]);
  // toLowerCase で長さが変わる文字は分けない
  assert.deepStrictEqual(MF.highlightSegments('İ', ['i']), [{ text: 'İ', hit: false }]);
});

test('R7 relevanceSort: 名前に全語が入る部品が先。空の tokens は元の順。元の配列は変えない', () => {
  const list = [P('l3:amd-zen5-9700x'), P('core:amd-zen5-9700x:P')];
  assert.ok(list.every(Boolean));
  const before = list.map((p) => p.id);
  const sorted = MF.relevanceSort(list, ['コア']);
  assert.strictEqual(sorted[0].id, 'core:amd-zen5-9700x:P');
  assert.deepStrictEqual(list.map((p) => p.id), before);
  assert.deepStrictEqual(MF.relevanceSort(list, []).map((p) => p.id), before);
  assert.notStrictEqual(MF.relevanceSort(list, []), list);
});

test('R7 relevanceSort: 「zen 5」で Zen 5 の部品が Zen 3 の 5800X より先(数字は他の数字列の途中では語頭扱いにしない)', () => {
  const tokens = MF.searchTokens('zen 5');
  const res = MF.relevanceSort(MF.filterParts(parts, { text: 'zen 5' }), tokens);
  const iz5 = res.findIndex((p) => p.uarch === 'Zen 5' && p.kind === 'core');
  const i5800 = res.findIndex((p) => /5800X/.test(MF.partName(p)) && p.uarch === 'Zen 3');
  assert.ok(iz5 >= 0 && i5800 >= 0, `${iz5} ${i5800}`);
  assert.ok(iz5 < i5800);
  assert.ok(res.slice(0, 3).every((p) => /zen 5/i.test(MF.partName(p))));
  // 「Ryzen 5 5600X」の Zen 3 コア: 「Ry-zen 5」の途中一致は語頭でないので先頭グループに入らない
  const first = res.slice(0, 3).map((p) => MF.partName(p));
  assert.ok(first.every((n) => /^zen 5/i.test(n)), first.join(' | '));
  const iRyzen = res.findIndex((p) => /Ryzen 5 5600X/.test(MF.partName(p)) && p.uarch === 'Zen 3');
  if (iRyzen >= 0) assert.ok(iRyzen > 2 && iz5 < iRyzen);
  const lastZ5 = res.map((p) => /^zen 5/i.test(MF.partName(p))).lastIndexOf(true);
  assert.ok(iRyzen < 0 || iRyzen > lastZ5, `${iRyzen} ${lastZ5}`);
});

test('R7 relevanceSort: 数字だけの検索語「5」は「5800X」の途中に当たっても同順位にならない', () => {
  const res = MF.relevanceSort(MF.filterParts(parts, { text: '5' }), MF.searchTokens('5'));
  const iz5 = res.findIndex((p) => p.uarch === 'Zen 5' && p.kind === 'core');
  const i5800 = res.findIndex((p) => /5800X/.test(MF.partName(p)) && p.uarch === 'Zen 3');
  assert.ok(iz5 >= 0 && i5800 >= 0 && iz5 < i5800);
  // 「Zen 3 コア(… 5800X)」には単独の「5」が無いので、「Zen 5 コア」と同じ段には入らない
  assert.ok(!/\b5\b/.test(MF.partName(res[i5800])));
});

test('R6 isAddable・addBlockReason: x86 の設計に Arm のコアは不可(短文)、x86 は可、空の設計は常に可', () => {
  let d = mk();
  const arm = parts.find((p) => p.kind === 'core' && p.isa === 'arm');
  const x86 = P('core:amd-zen5-9700x:P');
  assert.strictEqual(MF.isAddable(d, arm, D.nodes), true);
  assert.strictEqual(MF.addBlockReason(d, arm, D.nodes), null);
  const r = DS.addPart(d, x86, { count: 1, nodes: D.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  assert.strictEqual(MF.isAddable(d, arm, D.nodes), false);
  const why = MF.addBlockReason(d, arm, D.nodes);
  assert.ok(why.includes('命令セットが違うため追加不可') && why.length <= 60 && why.includes('x86'), why);
  assert.strictEqual(MF.isAddable(d, x86, D.nodes), true);
  assert.strictEqual(MF.addBlockReason(d, x86, D.nodes), null);
});

test('R7 libCountText・emptyText', () => {
  assert.strictEqual(MF.libCountText({ matched: 280, total: 280, visible: 60, hasCondition: false }), '全 280 件・先頭 60 件を表示');
  assert.strictEqual(MF.libCountText({ matched: 30, total: 280, visible: 30, hasCondition: false }), '全 280 件');
  assert.strictEqual(MF.libCountText({ matched: 15, total: 280, visible: 15, hasCondition: true }), '15 件が該当(全 280 件)');
  assert.strictEqual(MF.libCountText({ matched: 100, total: 280, visible: 60, hasCondition: true }), '100 件が該当(全 280 件)・先頭 60 件を表示');
  assert.strictEqual(MF.libCountText({ matched: 10, total: 280, visible: 10, hasCondition: true, addableOnly: true, hiddenByAddable: 5 }), '10 件が該当(全 280 件)・追加できない 5 件を除く');
  assert.strictEqual(MF.libCountText({ matched: 0, total: 280, visible: 0, hasCondition: true }), '0 件が該当(全 280 件)');
  assert.strictEqual(MF.emptyText({ text: 'zzz' }, false), '「zzz」に一致する部品はありません。');
  assert.strictEqual(MF.emptyText({ text: '', isa: 'arm', vendor: 'AMD', kind: 'core' }, true), 'この条件に合う部品はありません。絞り込み: 命令セット=Arm / メーカー=AMD / 種類=コア。「追加できるものだけ」も有効です。');
});
