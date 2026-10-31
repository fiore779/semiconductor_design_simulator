'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/render/mat4.js');

const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);
const nearArr = (a, b, e) => a.length === b.length && a.every((v, i) => near(v, b[i], e));
const T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1];

test('mat4: 単位行列との積は元の行列。平行移動の適用と合成', () => {
  const m = M.multiply(M.perspective(0.6, 1.5, 0.1, 100), M.lookAt([3, 4, 5], [0, 0, 0], [0, 1, 0]));
  assert.ok(nearArr(M.multiply(M.identity(), m), m)); assert.ok(nearArr(M.multiply(m, M.identity()), m));
  const p = M.transformPoint(T, [1, 1, 1]);
  assert.deepStrictEqual(p.slice(0, 3), [3, 4, 5]); assert.strictEqual(p[3], 1);
  assert.deepStrictEqual(M.transformPoint(M.multiply(T, T), [0, 0, 0]).slice(0, 3), [4, 6, 8]);
});

test('mat4: 逆行列との積は単位行列。特異行列は null', () => {
  const m = M.multiply(M.perspective(0.6, 1.5, 0.1, 100), M.lookAt([3, 4, 5], [0, 0, 0], [0, 1, 0]));
  const inv = M.invert(m);
  assert.ok(inv && nearArr(M.multiply(m, inv), M.identity(), 1e-9));
  assert.strictEqual(M.invert(new Array(16).fill(0)), null);
});

test('mat4: lookAt は視線方向が -z、右が +x。視線と up が平行でも壊れない', () => {
  const v = M.lookAt([0, 0, 10], [0, 0, 0], [0, 1, 0]);
  const o = M.transformPoint(v, [0, 0, 0]);
  assert.ok(near(o[0], 0) && near(o[1], 0) && near(o[2], -10));
  assert.ok(near(M.transformPoint(v, [1, 0, 0])[0], 1));
  const top = M.lookAt([0, 10, 0], [0, 0, 0], [0, 1, 0]);
  assert.ok(top.every(Number.isFinite));
  assert.ok(near(M.transformPoint(top, [0, 0, 0])[2], -10));
});

test('mat4: perspective は near 面が z=-1、far 面が z=+1', () => {
  const p = M.perspective(Math.PI / 2, 1, 1, 10);
  assert.ok(near(M.transformPoint(p, [0, 0, -1])[2], -1)); assert.ok(near(M.transformPoint(p, [0, 0, -10])[2], 1));
});

test('mat4: ベクトル演算', () => {
  assert.deepStrictEqual(M.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.ok(nearArr(M.normalize([3, 0, 4]), [0.6, 0, 0.8])); assert.deepStrictEqual(M.normalize([0, 0, 0]), [0, 0, 0]);
  assert.strictEqual(M.dot([1, 2, 3], [4, 5, 6]), 32); assert.strictEqual(M.length([3, 4, 0]), 5);
  assert.deepStrictEqual(M.sub([3, 3, 3], [1, 2, 3]), [2, 1, 0]); assert.deepStrictEqual(M.add([1, 1, 1], M.scale([1, 2, 3], 2)), [3, 5, 7]);
});
