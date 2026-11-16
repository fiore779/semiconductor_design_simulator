'use strict';
// Meteor Lake(185H)・Arrow Lake-H(285H)のタイルの並べ方: Compute | SoC | GPU の横一列、IOE は Compute の下、Base は全体の下(MTL_annotated.jpg の配置)。面積は変えない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');

const mk = (id) => design.fromPreset(D.presets.find((p) => p.id === id));
const get = (d, re) => d.dies.find((x) => re.test(x.name));

['intel-mtl-185h', 'intel-arl-285h'].forEach((id) => {
  test(`${id}: Compute | SoC | GPU が横一列(隙間は写真の 1〜2px)、IOE は Compute の下で同じ幅・隙間 3px、Base は全体の下に敷く土台(underlay)`, () => {
    const d = mk(id);
    const c = get(d, /Compute/); const s = get(d, /SoC/); const g = get(d, /GPU/); const io = get(d, /IO/); const b = get(d, /Base/);
    [c, s, g, io, b].forEach((x) => assert.ok(x, id));
    const u = c.widthMm / 352; // 写真(幅 2000 に縮小)の 1px あたりの mm
    // 写真の測定: Compute→SoC 1px、SoC→GPU 2px、Compute→IOE 3px、上端は SoC が 7px・GPU が 20px 下(MTL_annotated.jpg)
    assert.ok(Math.abs(s.x - (c.x + c.widthMm + 1 * u)) < 1e-9, 'Compute→SoC');
    assert.ok(Math.abs(g.x - (s.x + s.widthMm + 2 * u)) < 1e-9, 'SoC→GPU');
    assert.ok(Math.abs(s.y - (c.y + 7 * u)) < 1e-9 && Math.abs(g.y - (c.y + 20 * u)) < 1e-9);
    assert.strictEqual(io.x, c.x); assert.ok(Math.abs(io.y - (c.y + c.heightMm + 3 * u)) < 1e-9);
    assert.ok(Math.abs(io.widthMm - c.widthMm) < 1e-9);
    assert.ok(s.x - (c.x + c.widthMm) < 0.1 && g.x - (s.x + s.widthMm) < 0.1, 'タイルは 0.1mm 未満の隙間で詰まる(旧: 2mm)');
    // Base は土台: タイル群の下に重なる(185H はタイル群を囲む。285H は面積 178 を保ち中心を合わせる)
    assert.strictEqual(b.underlay, true);
    ['Compute', 'SoC', 'GPU', 'IO'].forEach((n) => assert.notStrictEqual(get(d, new RegExp(n)).underlay, true, n));
    const placed = [c, s, g, io]; const left = Math.min(...placed.map((x) => x.x)); const right = Math.max(...placed.map((x) => x.x + x.widthMm));
    const top = Math.min(...placed.map((x) => x.y)); const bottom = Math.max(...placed.map((x) => x.y + x.heightMm));
    if (b.areaKnown === false) assert.ok(b.x <= left && b.y <= top && b.x + b.widthMm >= right && b.y + b.heightMm >= bottom, 'タイル群を囲む');
    else assert.ok(Math.abs((b.x + b.widthMm / 2) - (left + right) / 2) < 1e-9 && Math.abs((b.y + b.heightMm / 2) - (top + bottom) / 2) < 1e-9, '面積既知(285H)はタイル群と中心が一致');
    d.dies.forEach((x) => assert.ok(x.x >= 0 && x.y >= 0 && Number.isFinite(x.x + x.y + x.widthMm + x.heightMm), x.name));
  });
});

test('185H: Base は面積未取得のまま、外形はタイル群に左 20・上 28・右 20・下 20 px を足した仮寸法(約 22.9×12.0mm)。寸法の根拠は sizeNote(areaNote・評価は不変)', () => {
  const d = mk('intel-mtl-185h'); const b = get(d, /Base/);
  assert.strictEqual(b.areaMm2, null); assert.strictEqual(b.areaKnown, false);
  const c = get(d, /Compute/); const u = c.widthMm / 352;
  const placed = d.dies.filter((x) => !x.underlay); const left = Math.min(...placed.map((x) => x.x)); const right = Math.max(...placed.map((x) => x.x + x.widthMm));
  const top = Math.min(...placed.map((x) => x.y)); const bottom = Math.max(...placed.map((x) => x.y + x.heightMm));
  assert.ok(Math.abs(b.x - (left - 20 * u)) < 1e-9 && Math.abs(b.y - (top - 28 * u)) < 1e-9);
  assert.ok(Math.abs(b.widthMm - (right - left + 40 * u)) < 1e-9 && Math.abs(b.heightMm - (bottom - top + 48 * u)) < 1e-9);
  assert.ok(b.widthMm > 22 && b.widthMm < 24 && b.heightMm > 11.5 && b.heightMm < 12.5);
  assert.match(b.sizeNote, /MTL_annotated.jpg/); assert.strictEqual(b.areaNote, '寸法の記載なし');
});

test('土台(underlay)は Meteor Lake・Arrow Lake-H の Base だけ。Lunar Lake・Panther Lake の Base などには付けない', () => {
  D.presets.forEach((p) => { const d = mk(p.id); const n = d.dies.filter((x) => x.underlay === true).length; assert.strictEqual(n, p.id === 'intel-mtl-185h' || p.id === 'intel-arl-285h' ? 1 : 0, p.id); });
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
