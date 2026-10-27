'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createHistory } = require('../js/history/history.js');
const S = (n) => ({ v: n });

test('undo/redo の往復', () => {
  const h = createHistory();
  assert.ok(!h.canUndo() && !h.canRedo());
  h.push(S(0), S(1), 'a'); h.push(S(1), S(2), 'b');
  assert.deepStrictEqual(h.undo(), S(1)); assert.deepStrictEqual(h.undo(), S(0));
  assert.strictEqual(h.undo(), null); assert.ok(h.canRedo());
  assert.deepStrictEqual(h.redo(), S(1)); assert.deepStrictEqual(h.redo(), S(2));
  assert.strictEqual(h.redo(), null);
});

test('スナップショットは複製(後で元を変えても影響しない)', () => {
  const h = createHistory(); const a = S(1); h.push(S(0), a, 'a'); a.v = 99;
  h.undo(); assert.deepStrictEqual(h.redo(), S(1));
});

test('coalesce: 同じ label の連続 push は 1 手', () => {
  const h = createHistory();
  h.push(S(0), S(1), 'move', { coalesce: true }); h.push(S(1), S(2), 'move', { coalesce: true }); h.push(S(2), S(3), 'move', { coalesce: true });
  assert.strictEqual(h.list().length, 2);
  assert.deepStrictEqual(h.undo(), S(0)); assert.deepStrictEqual(h.redo(), S(3));
  h.push(S(3), S(4), 'other', { coalesce: true }); assert.strictEqual(h.list().length, 3); // label が違えば別の手
  h.push(S(4), S(5), 'other'); assert.strictEqual(h.list().length, 4); // coalesce なしも別の手
});

test('coalesce: undo の後の編集は前の手にまとめない / windowMs を超えたら別の手', () => {
  const h = createHistory();
  h.push(S(0), S(1), 'move', { coalesce: true }); h.push(S(1), S(2), 'x'); h.undo();
  h.push(S(1), S(9), 'x', { coalesce: true });
  assert.strictEqual(h.list().length, 3);
  let t = 0; const g = createHistory({ windowMs: 100, now: () => t });
  g.push(S(0), S(1), 'm', { coalesce: true }); t = 50; g.push(S(1), S(2), 'm', { coalesce: true }); t = 500; g.push(S(2), S(3), 'm', { coalesce: true });
  assert.strictEqual(g.list().length, 3);
});

test('上限を超えたら古い方から捨てる', () => {
  const h = createHistory({ limit: 3 });
  for (let i = 0; i < 5; i++) h.push(S(i), S(i + 1), 'e' + i);
  const l = h.list(); assert.strictEqual(l.length, 4);
  assert.deepStrictEqual(h.undo(), S(4)); h.undo(); assert.deepStrictEqual(h.undo(), S(2));
  assert.strictEqual(h.canUndo(), false);
});

test('jumpTo と、jumpTo 後の push で枝を捨てる', () => {
  const h = createHistory();
  h.push(S(0), S(1), 'a'); h.push(S(1), S(2), 'b'); h.push(S(2), S(3), 'c');
  assert.deepStrictEqual(h.jumpTo(1), S(1)); assert.strictEqual(h.futureCount(), 2);
  assert.deepStrictEqual(h.jumpTo(0), S(0));
  assert.strictEqual(h.jumpTo(9), null); assert.strictEqual(h.jumpTo(-1), null);
  h.jumpTo(2);
  assert.ok(h.list()[2].current);
  h.push(S(2), S(20), 'd');
  assert.deepStrictEqual(h.list().map((x) => x.label), ['最初の状態', 'a', 'b', 'd']);
  assert.ok(!h.canRedo());
  h.clear(); assert.ok(!h.canUndo()); assert.strictEqual(h.list().length, 1);
});
