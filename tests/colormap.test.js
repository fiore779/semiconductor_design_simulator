'use strict';
const test = require('node:test');
const assert = require('node:assert');
const cm = require('../js/render/colormap.js');

for (const kind of ['power', 'temp']) {
  test(`${kind}: 明度が t に対して単調増加`, () => {
    let prev = -1;
    for (let i = 0; i <= 1000; i++) {
      const L = cm.luminance(cm.colorAt(i / 1000, kind));
      assert.ok(L >= prev - 1e-12, `t=${i / 1000}: ${L} < ${prev}`);
      prev = L;
    }
    assert.ok(cm.luminance(cm.colorAt(1, kind)) - cm.luminance(cm.colorAt(0, kind)) > 0.8);
  });
  test(`${kind}: 範囲外はクランプ、値は 0〜1`, () => {
    assert.deepStrictEqual(cm.colorAt(-5, kind), cm.colorAt(0, kind));
    assert.deepStrictEqual(cm.colorAt(7, kind), cm.colorAt(1, kind));
    for (let i = 0; i <= 100; i++) cm.colorAt(i / 100, kind).forEach((v) => assert.ok(v >= 0 && v <= 1));
  });
  test(`${kind}: NaN は中立色、LUT の長さと端`, () => {
    const n = cm.colorAt(NaN, kind);
    assert.strictEqual(n.length, 3);
    n.forEach((v) => assert.ok(v >= 0 && v <= 1));
    assert.strictEqual(cm.buildLut(kind).length, 256 * 4);
    assert.strictEqual(cm.buildLut(kind, 16).length, 16 * 4);
    const lut = cm.buildLut(kind, 8);
    assert.strictEqual(lut[3], 255);
    assert.deepStrictEqual(Array.from(lut.slice(28, 31)), [255, 255, 255]);
  });
}
test('電力と温度は別の色', () => {
  assert.notDeepStrictEqual(cm.colorAt(0.4, 'power'), cm.colorAt(0.4, 'temp'));
});
