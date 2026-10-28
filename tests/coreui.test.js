'use strict';
// モード D の UI の純関数(js/ui/coreform.js)と、mixform の derived 区分、paramform の D バッジ(設計書 §3.7.4・§3.7.7、T5)。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'blocklib.js'));
const DS = require('../js/model/design.js');
const BL = require('../js/model/blocklib.js');
const E = require('../js/model/evaluate.js');
const CD = require('../js/model/coredef.js');
const CF = require('../js/ui/coreform.js');
const MF = require('../js/ui/mixform.js');
const PF = require('../js/ui/paramform.js');

const parts = BL.build(D.presets, D.blocklibAreas, D.nodes);
const P = (id) => BL.get(parts, id);
const ctx = E.makeContext();
const ZEN1 = 'core:amd-zen1-1800x:P';
const X4 = 'core:mt-9400:M';
const info = (id) => CF.cloneInfo(P(id), D.uarch, D.blocklibAreas);
const allInfo = () => parts.filter((p) => p.kind === 'core').map((p) => CF.cloneInfo(p, D.uarch, D.blocklibAreas));

test('parseField: 形式だけを見る(空・非数・小数の整数項目)', () => {
  assert.deepStrictEqual(CF.parseField('width', ' ６ '), { ok: true, value: 6 });
  assert.deepStrictEqual(CF.parseField('clockGHz', '3.7 GHz'), { ok: true, value: 3.7 });
  assert.strictEqual(CF.parseField('width', '').ok, false);
  assert.ok(CF.parseField('rob', 'abc').reason.includes('数字'));
  assert.ok(CF.parseField('rob', '12.5').reason.includes('整数'));
  assert.strictEqual(CF.parseField('isa', 'arm').ok, false);
});

test('applyField: validateParams のエラーを項目ごとの日本語で返す / 1 項目だけを patch に渡す', () => {
  const def = info(ZEN1).def;
  const bad = CF.applyField(def, 'width', '99');
  assert.strictEqual(bad.ok, false); assert.ok(bad.reason.includes('2〜16'));
  assert.ok(CF.applyField(def, 'rob', '5').reason.includes('32〜1024'));
  assert.ok(CF.applyField(def, 'l2KB', '10').reason.includes('64〜16384'));
  assert.ok(CF.applyField(def, 'clockGHz', '9').reason.includes('0.5〜8.0'));
  const ok = CF.applyField(def, 'rob', '240');
  assert.ok(ok.ok); assert.strictEqual(ok.def.params.rob, 240); assert.strictEqual(ok.def.params.l2KB, def.params.l2KB);
  // L2 を触らない編集では、uarch.js が null の基準でも L2 は null のまま(参照値で計算。RD8)
  const x4 = info(X4);
  assert.ok(x4.cloneable);
  assert.strictEqual(x4.def.params.l2KB, null);
  const e = CF.applyField(x4.def, 'smt', '1');
  assert.ok(e.ok); assert.strictEqual(e.def.params.l2KB, null);
  // 編集不可の欄は理由つきで拒否
  const noArea = allInfo().find((i) => i.cloneable && !i.derivable && i.def.base.uRecord.rob != null);
  assert.ok(noArea, '面積を導けない基準がある');
  const rj = CF.applyField(noArea.def, 'rob', '300');
  assert.strictEqual(rj.ok, false); assert.ok(rj.reason.includes('面積'));
});

test('cloneInfo: 複製不可は理由つき / 面積の導出 可・不可', () => {
  const all = allInfo();
  assert.ok(all.some((i) => !i.cloneable && i.reason));
  assert.ok(all.some((i) => i.cloneable && i.derivable));
  assert.ok(all.some((i) => i.cloneable && !i.derivable && i.derivReason));
  assert.strictEqual(info(ZEN1).derivable, true);
});

test('表示: 現在値・基準との比・継承項目', () => {
  const def = CF.applyField(info(ZEN1).def, 'rob', '240').def;
  assert.strictEqual(CF.displayValue(def, 'rob'), '240');
  assert.ok(CF.ratioText(def, 'rob').includes('192') && CF.ratioText(def, 'rob').includes('×1.25'));
  assert.strictEqual(CF.ratioText(info(ZEN1).def, 'rob'), '基準 192');
  const labels = CF.inheritedRows(def).map((r) => r.label);
  assert.ok(labels.includes('命令セット') && labels.includes('MSHR'));
  // 基準が未取得の項目は「未取得」(値を作らない)
  const nul = allInfo().find((i) => i.cloneable && i.def.base.uRecord.width == null);
  if (nul) { assert.strictEqual(CF.ratioText(nul.def, 'width'), '基準 未取得'); assert.strictEqual(CF.displayValue(nul.def, 'width'), ''); }
});

test('assignId / customChip / addLabel', () => {
  const def = CF.applyField(info(ZEN1).def, 'rob', '240').def;
  const first = CF.assignId(def, []);
  assert.strictEqual(first.id, 'cd1');
  assert.strictEqual(CF.assignId(def, [first]).id, 'cd1'); // 同じ内容は同じ id(個数がまとまる)
  const other = CF.applyField(def, 'rob', '250').def;
  assert.strictEqual(CF.assignId(other, [first]).id, 'cd2');
  assert.strictEqual(CF.customChip(def), '自作:Zen1');
  assert.strictEqual(CF.addLabel(def, 4), `自作コア『${def.name}』を 4 個追加`);
});

test('自作コアを置いた設計: 注意帯 1〜5・chosen・区分 derived・出所名・D バッジ', () => {
  const def0 = CF.applyField(CF.applyField(info(ZEN1).def, 'rob', '240').def, 'width', '7').def;
  const def = CF.assignId(def0, []);
  let d = DS.fromScratch({ name: 't', widthMm: 40, heightMm: 40, nodeId: 'gf-14', entry: 'new' });
  const part = Object.assign({}, CD.toPart(def), { sourceChip: CF.customChip(def) });
  const r = DS.addPart(d, part, { count: 2, nodes: D.nodes });
  assert.ok(r.ok, r.reason); d = r.design;
  assert.strictEqual(d.origin.entry, 'new'); assert.strictEqual(d.dies[0].blocks[0].sourceChip, '自作:Zen1'); assert.strictEqual(d.dies[0].blocks[0].areaOrigin, 'derived');
  assert.ok(DS.parse(DS.serialize(d)).ok, '出所名を変えても保存して開ける');
  const ev = E.evaluate(d, ctx);
  const bands = CF.customBands(ev, d);
  assert.deepStrictEqual([...new Set(bands.map((b) => b.n))], [1, 2, 3, 4, 5]);
  assert.ok(bands.find((b) => b.n === 2).text.includes('基準コア(Zen 1)'));
  assert.strictEqual(bands.find((b) => b.n === 5).text, '電力・温度・最大クロックは出していません');
  assert.ok(bands.some((b) => b.n === 4 && b.text.includes('校正した範囲の外')) && bands.some((b) => b.n === 4 && b.text.includes('上振れ側')));
  assert.ok(CF.chosenCustomLines(ev.st.chosen).join('').includes('Zen 1'));
  assert.deepStrictEqual(CF.chosenCustomLines({ custom: false }), []);
  assert.deepStrictEqual(CF.usedDefs(d).map((x) => x.id), ['cd1']); assert.strictEqual(CF.countOfDef(d, 'cd1'), 2);
  assert.strictEqual(MF.areaClassCounts(ev.area.mix.blocks).derived, 2);
  assert.ok(MF.utilizationText(ev.area.mix).includes('小さい側'));
  assert.strictEqual(MF.blockGroups(d)[0].areaClass, 'derived');
  assert.strictEqual(PF.modeInfo(d).code, 'D'); assert.strictEqual(PF.modeInfo(d).text, 'D 新規');
  const plain = DS.fromScratch({ widthMm: 10, heightMm: 10 });
  assert.strictEqual(PF.modeInfo(plain).code, 'C');
  assert.deepStrictEqual(CF.customBands(E.evaluate(plain, ctx), plain), []); // 自作コアなし → 注意帯なし
  // 単独評価の ⚠
  const ce = CD.evaluate(def, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes });
  assert.strictEqual(CF.fieldWarning(ce, def, 'width'), null); // 7/6=1.17 は範囲内
  assert.ok(CF.comboWarning(ce, def).includes('2 項目以上'));
  assert.ok(CF.perfPerArea(ce)[0] <= CF.perfPerArea(ce)[1]);
  assert.ok(CF.rangeText([1, 2]).includes('〜') && !CF.rangeText([1, 1]).includes('〜'));
  const wide = CF.applyField(info(ZEN1).def, 'rob', '400').def; // 192 の 2.08 倍
  assert.ok(CF.fieldWarning(CD.evaluate(wide, { cal: ctx.cal, uarch: D.uarch, presets: ctx.presets, nodes: D.nodes }), wide, 'rob'));
});

test('858 mm² 超のダイは検証に reticle 警告 / 最小ダイで外接矩形に合う', () => {
  let d = DS.fromScratch({ name: 't', widthMm: 100, heightMm: 8, nodeId: 'gf-14', entry: 'new' });
  assert.ok(!E.evaluate(d, ctx).warnings.some((w) => w.code === 'reticle'));
  d = DS.setDieSize(d, 'die0', 100, 9).design; // 900 mm²
  assert.ok(E.evaluate(d, ctx).warnings.some((w) => w.code === 'reticle' && w.text.includes('858')));
  const r = DS.addPart(DS.fromScratch({ widthMm: 30, heightMm: 30, nodeId: 'gf-14' }), P(ZEN1), { count: 2 });
  assert.ok(r.ok, r.reason);
  const f = DS.fitDieToBlocks(r.design, 'die0');
  assert.ok(f.ok && f.changed && f.widthMm < 30);
});
