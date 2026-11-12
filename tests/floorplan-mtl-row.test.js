'use strict';
// Meteor Lake(185H)・Arrow Lake-H(285H)のタイルの並べ方: Compute | SoC | GPU の横一列、IOE は Compute の下、Base は全体の下(MTL_annotated.jpg の配置)。面積は変えない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');

const mk = (id) => design.fromPreset(D.presets.find((p) => p.id === id));
const get = (d, re) => d.dies.find((x) => re.test(x.name));

['intel-mtl-185h', 'intel-arl-285h'].forEach((id) => {
  test(`${id}: Compute | SoC | GPU が横一列(上端そろえ)、IOE は Compute の下で同じ幅、Base は全体の下`, () => {
    const d = mk(id);
    const c = get(d, /Compute/); const s = get(d, /SoC/); const g = get(d, /GPU/); const io = get(d, /IO/); const b = get(d, /Base/);
    [c, s, g, io, b].forEach((x) => assert.ok(x, id));
    assert.ok(c.x < s.x && s.x < g.x);
    assert.ok(s.x >= c.x + c.widthMm && g.x >= s.x + s.widthMm);
    assert.strictEqual(c.y, 0); assert.strictEqual(s.y, 0); assert.strictEqual(g.y, 0);
    assert.strictEqual(io.x, c.x); assert.ok(io.y >= c.y + c.heightMm);
    assert.ok(Math.abs(io.widthMm - c.widthMm) < 1e-9);
    const bottom = Math.max(io.y + io.heightMm, s.y + s.heightMm, g.y + g.heightMm);
    assert.ok(b.y >= bottom);
    d.dies.forEach((x) => assert.ok(x.x >= 0 && Number.isFinite(x.x + x.y + x.widthMm + x.heightMm), x.name));
  });
});

test('185H: 面積は変えない(幅×高さ = 面積)。写真の縦横比: SoC 約 0.85、GPU 約 0.41', () => {
  const d = mk('intel-mtl-185h');
  [['Compute', 68.1], ['GPU', 41.9], ['SoC', 96.8], ['IO', 24.7]].forEach(([n, a]) => {
    const x = get(d, new RegExp(n)); assert.strictEqual(x.areaMm2, a);
    assert.ok(Math.abs(x.widthMm * x.heightMm - a) < 0.01, n);
  });
  const s = get(d, /SoC/); const g = get(d, /GPU/);
  assert.ok(Math.abs(s.widthMm / s.heightMm - 361 / 423) < 0.01);
  assert.ok(Math.abs(g.widthMm / g.heightMm - 163 / 400) < 0.01);
});

test('285H: 面積が未取得のタイルは面積 null のまま(推測値を入れない)。Base は 178 のまま', () => {
  const d = mk('intel-arl-285h');
  ['Compute', 'GPU', 'SoC', 'IO'].forEach((n) => { const x = get(d, new RegExp(n)); assert.strictEqual(x.areaMm2, null, n); assert.strictEqual(x.areaKnown, false, n); });
  assert.strictEqual(get(d, /Base/).areaMm2, 178);
});

test('ほかの SKU のタイルの並べ方は変えない(275HX・285K・LNL・PTL はこの規則の対象外)', () => {
  ['intel-arl-275hx', 'intel-arl-285k', 'intel-lnl-268v', 'intel-ptl-x9-388h'].forEach((id) => {
    const d = mk(id); const c = d.dies[0];
    assert.strictEqual(c.x, 0); assert.strictEqual(c.y, 0);
    d.dies.slice(1).forEach((x) => assert.strictEqual(x.y, 0, id)); // 従来は横並び(y = 0)
  });
});
