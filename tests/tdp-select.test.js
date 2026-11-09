'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');
const ctx = E.makeContext();
const pre = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(pre(id), { mode: 'reproduce' });
const rg = (id) => Object.assign({ peak: pre(id).power.peak || null, base: pre(id).power.base || null }, pre(id).power.range);

test('setTdp: 範囲内なら tdpW と電力制限が入り、null で既定に戻る。範囲外・範囲なしは日本語で拒否', () => {
  const id = 'intel-mtl-185h'; const d = mk(id);
  const a = design.setTdp(d, 45, rg(id)); assert.ok(a.ok);
  assert.strictEqual(a.design.package.tdpW, 45); assert.strictEqual(a.design.package.powerLimitW, 45); assert.strictEqual(a.design.package.powerLimitSource, 'tdp');
  const b = design.setTdp(a.design, null, rg(id)); assert.ok(b.ok); assert.strictEqual(b.design.package.tdpW, undefined);
  assert.deepStrictEqual([b.design.package.powerLimitW, b.design.package.powerLimitSource], [d.package.powerLimitW, d.package.powerLimitSource]);
  for (const w of [34, 116, NaN, '45']) { const r = design.setTdp(d, w, rg(id)); assert.strictEqual(r.ok, false); assert.ok(/設定範囲/.test(r.reason)); }
  assert.strictEqual(design.setTdp(d, 45, null).ok, false);
  assert.ok(design.parse(design.serialize(a.design)).ok !== false);
});

test('TDP を選ぶと MT の係数(電力 W の連続式)が変わり編集済み扱い。TDP を上げるほど MT が単調に上がる。既定(上限)なら従来と同じ', () => {
  const id = 'intel-mtl-185h'; const d = mk(id);
  const base = E.evaluate(d, ctx);
  assert.strictEqual(base.mt.clockInfo.source, 'range.maxW');
  const lo = E.evaluate(design.setTdp(d, 45, rg(id)).design, ctx);
  assert.strictEqual(lo.mt.clockInfo.source, 'selected'); assert.ok(/連続式/.test(lo.mt.clockInfo.band));
  // 2026-11-09: 2 段の帯の逆転(0.84 > 0.81 で TDP を下げると MT が上がる)をやめ、連続式 min(1, c·W^(1/3)) にした。TDP を下げると MT が下がる(自然な向き)が復活した
  assert.ok(lo.mt.score < base.mt.score); assert.strictEqual(lo.edited, true);
  // 単調性: 35(設定範囲の下限)→ 45 → 65 → 80 → 115W で MT が単調に上がる
  const scores = [35, 45, 65, 80, 115].map((w) => E.evaluate(design.setTdp(d, w, rg(id)).design, ctx).mt.score);
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i] > scores[i - 1], `TDP を上げると MT が上がる: ${scores[i - 1]} → ${scores[i]}`);
  const top = E.evaluate(design.setTdp(d, 115, rg(id)).design, ctx);
  assert.strictEqual(top.mt.score, base.mt.score); assert.strictEqual(top.edited, false);
});
