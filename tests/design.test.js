'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const preset = (id) => D.presets.find((p) => p.id === id);

test('fromPreset: ダイ面積の合計は実測面積と一致し、区分を保持する', () => {
  const d = design.fromPreset(preset('intel-arl-285k'));
  assert.strictEqual(d.dies.length, 4);
  const sum = d.dies.reduce((s, x) => s + x.widthMm * x.heightMm, 0);
  assert.ok(Math.abs(sum - (117.4 + 23.1 + 86.6 + 24.7)) < 0.01);
  assert.ok(d.dies.every((x) => x.areaSource === 'meas'));
});

test('fromPreset: 面積が未取得のダイは areaKnown:false(仮寸法)で、面積を作らない', () => {
  const d = design.fromPreset(preset('intel-mtl-185h'));
  const base = d.dies.find((x) => !x.areaKnown);
  assert.ok(base);
  assert.strictEqual(base.areaMm2, null);
  assert.strictEqual(base.areaSource, null);
});

test('fromPreset: コア数とブロックの対応(コア総数 = core ブロック数)。ブロックは模式図と明示', () => {
  const p = preset('amd-zen5-9950x');
  const d = design.fromPreset(p);
  const cores = d.dies.flatMap((x) => x.blocks).filter((b) => b.kind === 'core');
  assert.strictEqual(cores.length, p.cfg.cores.reduce((s, c) => s + c.count, 0));
  assert.ok(d.dies.flatMap((x) => x.blocks).every((b) => b.schematic === true));
});

test('fromPreset: 生成直後のブロックはダイ内に収まり重ならない(validate が空)', () => {
  ['intel-arl-285k', 'amd-zen4-7950x', 'apple-m1', 'qc-8elite', 'nv-thor'].forEach((id) => {
    const d = design.fromPreset(preset(id));
    assert.deepStrictEqual(design.validate(d), [], id);
  });
});

test('validate: はみ出しと重なりを検出する', () => {
  const d = design.fromPreset(preset('apple-m1'));
  const die = d.dies[0]; die.blocks[0].x = die.widthMm; // はみ出し
  die.blocks[2].x = die.blocks[1].x; die.blocks[2].y = die.blocks[1].y; // 重なり
  const w = design.validate(d);
  assert.ok(w.some((x) => x.level === 'error'));
  assert.ok(w.some((x) => x.level === 'warn'));
});

test('serialize / parse: 往復で同一、形式不正は理由を返す', () => {
  const d = design.fromPreset(preset('amd-zen4-7700'));
  const r = design.parse(design.serialize(d));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.design, d);
  assert.strictEqual(design.parse('{').ok, false);
  assert.match(design.parse('{"schema":99,"dies":[]}').reason, /形式/);
});

test('origin: 再現モードとプリセット ID を記録する', () => {
  const d = design.fromPreset(preset('amd-zen4-7700'));
  assert.deepStrictEqual({ mode: d.origin.mode, base: d.origin.base }, { mode: 'reproduce', base: 'amd-zen4-7700' });
});

test('parse: 不正な形式は日本語の理由で弾く', () => {
  const base = () => design.fromPreset(preset('apple-m1'));
  const bad = (mut, re) => {
    const d = base(); mut(d);
    const r = design.parse(JSON.stringify(d));
    assert.strictEqual(r.ok, false); assert.ok(re.test(r.reason), r.reason);
  };
  const r0 = design.parse(JSON.stringify({ schema: design.SCHEMA, name: 'x', dies: [{}] }));
  assert.strictEqual(r0.ok, false); assert.ok(/ダイ 1/.test(r0.reason), r0.reason);
  bad((d) => { d.dies[0].widthMm = '10'; }, /widthMm.*有限の数/);
  bad((d) => { d.dies[0].blocks[0].x = '1'; }, /x が有限の数/);
  bad((d) => { d.dies[0].blocks[0].w = 0; }, /0 より大きい/);
  bad((d) => { d.dies[0].blocks[0].label = 5; }, /名前がありません/);
  bad((d) => { d.name = 5; }, /名前がありません/);
  bad((d) => { d.dies[0].name = 5; }, /名前がありません/);
  bad((d) => { d.dies[0].blocks[1].id = d.dies[0].blocks[0].id; }, /重複/);
  bad((d) => { d.dies[0].blocks[0].id = d.dies[0].id; }, /重複/);
  bad((d) => { d.dies[0].blocks = {}; }, /blocks が配列/);
  bad((d) => { d.dies[0].blocks = Array.from({ length: 501 }, (_, i) => ({ id: 'b' + i, label: 'b', x: 0, y: 0, w: 1, h: 1 })); }, /多すぎ/);
  bad((d) => { d.dies = Array.from({ length: 17 }, (_, i) => Object.assign({}, d.dies[0], { id: 'd' + i, blocks: [] })); }, /多すぎ/);
});

test('parse: 正常な全プリセットは通る', () => {
  D.presets.forEach((p) => assert.strictEqual(design.parse(design.serialize(design.fromPreset(p))).ok, true, p.id));
});

test('parse: 面積・寸法・文字列項目の追加検証', () => {
  const base = () => design.fromPreset(preset('apple-m1'));
  const bad = (mut, re) => { const d = base(); mut(d); const r = design.parse(JSON.stringify(d)); assert.strictEqual(r.ok, false); assert.ok(re.test(r.reason), r.reason); };
  bad((d) => { d.dies[0].areaMm2 = -100; }, /areaMm2/);
  bad((d) => { d.dies[0].widthMm = 1e6; }, /大きすぎ/);
  bad((d) => { d.dies[0].blocks[0].kind = { toString: 1 }; }, /kind が文字列/);
});
