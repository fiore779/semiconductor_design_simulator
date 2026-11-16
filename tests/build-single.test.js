'use strict';
// 単一 HTML ビルド(tools/build-single.js)の検査: 再現性・全入力の取り込み・外部参照なし・インライン版が単独で読み込める
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { build } = require('../tools/build-single.js');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [...index.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const norm = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');

test('同じ入力から、同じ出力ができる(再現可能)', () => {
  assert.strictEqual(build().html, build().html);
});

test('index.html の全スクリプト・CSS が、書かれた順に、ハッシュつきで入っている', () => {
  const { html, files } = build();
  assert.ok(srcs.length >= 50 && srcs.some((s) => s.startsWith('data/presets/')) && srcs.some((s) => s.startsWith('data/benchmarks/')));
  assert.ok(srcs.includes('js/ui/blockinfo.js'), 'ブロック詳細(blockinfo.js)がビルド対象に含まれる');
  assert.ok(srcs.includes('data/caplayouts.js'), 'コンデンサ配置のデータ(caplayouts.js。2026-11-16)がビルド対象に含まれる');
  const tags = [...html.matchAll(/<script data-src="([^"]+)" data-sha256="([0-9a-f]{64})">/g)];
  assert.deepStrictEqual(tags.map((m) => m[1]), srcs);
  tags.forEach((m) => assert.strictEqual(m[2], sha(norm(m[1])), `${m[1]} のハッシュが一致しない`));
  assert.ok(html.includes('data-src="css/app.css"'));
  assert.strictEqual(files.length, srcs.length + 1);
  files.forEach((f) => assert.ok(html.includes(f.sha256), `${f.path} のハッシュが先頭の一覧に無い`));
});

test('外部 URL への参照(src / href / fetch / import / Worker / @import / url())が無い', () => {
  const { html } = build();
  assert.ok(!/<(script|link|img|iframe|source)\b[^>]*\s(src|href)\s*=\s*["']?(https?:|\/\/|[^"'#>\s]+\.(js|css))/i.test(html), '外部ファイルを参照するタグがある');
  assert.ok(!/<script[^>]*\ssrc=/i.test(html) && !/<link[^>]*\shref=/i.test(html));
  const code = srcs.map(norm).join('\n');
  assert.ok(!/\bfetch\s*\(|new\s+Worker\s*\(|XMLHttpRequest|\bimportScripts\s*\(|^\s*import\s.+from\s/m.test(code), 'ネットワーク/外部ファイル読み込みの API がある');
  assert.ok(!/@import|url\(\s*["']?https?:/.test(norm('css/app.css')));
});

test('インライン版のスクリプトを、ブラウザと同じ条件(1 つずつ順に)で読み込める。プリセット 112 件・評価が動く', () => {
  const { html } = build();
  const blocks = [...html.matchAll(/<script data-src="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/script>/g)];
  assert.strictEqual(blocks.length, srcs.length);
  const ctx = vm.createContext({});
  ctx.window = ctx;
  for (const [, src, code] of blocks) {
    if (src === 'js/main.js') continue;
    vm.runInContext(code, ctx, { filename: src });
  }
  const { evaluate, makeContext } = ctx.SDS.model.evaluate;
  const c = makeContext();
  assert.strictEqual(c.presets.length, 112);
  const d = ctx.SDS.model.design.fromPreset(c.presets[0], { mode: 'reproduce' });
  const ev = evaluate(d, c);
  assert.ok(ev && typeof ev === 'object');
  assert.ok(ctx.SDS.model.floorplan, 'フロアプランが登録されている');
});
