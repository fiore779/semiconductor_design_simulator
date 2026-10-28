'use strict';
const test = require('node:test');
const assert = require('node:assert');
const p = require('../js/render/palette.js');

const keys = (n) => Array.from({ length: n }, (_, i) => 'chip' + i);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('同じキー集合なら順序に関わらず同じ色', () => {
  const a = p.originColors(['b', 'a', 'c'], 'light');
  const b = p.originColors(['c', 'b', 'a', 'a'], 'light');
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(Object.keys(a).sort(), ['a', 'b', 'c']);
});

test('色は 0..1 の範囲で、light と dark で異なる', () => {
  const l = p.originColors(['x', 'y'], 'light'); const d = p.originColors(['x', 'y'], 'dark');
  Object.values(l).concat(Object.values(d)).forEach((c) => c.forEach((v) => assert.ok(v >= 0 && v <= 1)));
  assert.notDeepStrictEqual(l.x, d.x);
});

test('16 件まで色が重ならない(色距離 0.2 以上)', () => {
  for (const scheme of ['light', 'dark']) {
    for (let n = 2; n <= 16; n++) {
      const c = Object.values(p.originColors(keys(n), scheme));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(dist(c[i], c[j]) >= 0.2, `${scheme} n=${n} ${i}-${j}`);
    }
  }
});

test('空・17 件以上でも落ちない', () => {
  assert.deepStrictEqual(p.originColors([], 'light'), {});
  assert.strictEqual(Object.keys(p.originColors(keys(20), 'light')).length, 20);
});

test('shortName', () => {
  assert.strictEqual(p.shortName('Ryzen 7 9700X'), '9700X');
  assert.strictEqual(p.shortName('Core Ultra 7 265K'), '265K');
  assert.strictEqual(p.shortName('Snapdragon 8 Elite'), '8 Elite');
  assert.strictEqual(p.shortName(''), '?');
  assert.strictEqual(p.shortName(null), '?');
  assert.strictEqual(p.shortName('その他'), '?');
});
