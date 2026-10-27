// data/*.js を読み込んで形式を検査する。使い方: node tools/validate-data.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(path.join(root, 'data'));
files.forEach((f) => require(f));
const D = window.SDS_DATA;
const errs = [];
const ok = (c, m) => { if (!c) errs.push(m); };

const ids = new Set();
(D.nodes || []).forEach((n) => {
  ok(!ids.has(n.id), `nodes: id 重複 ${n.id}`); ids.add(n.id);
  ['density', 'sram', 'cpp', 'mx'].forEach((k) => {
    const v = n[k];
    ok(v === null || (typeof v.v === 'number' && ['pub', 'sec'].includes(v.s)), `nodes ${n.id}.${k}: 形式不正`);
  });
});
(D.substrates || []).forEach((b) => {
  ['conductivityWmK', 'cteppmK', 'minLSum', 'bumpPitchUm', 'dk', 'df', 'maxPackageMm2', 'costRel'].forEach((k) => {
    const v = b[k];
    ok(v === null || v === undefined || (typeof v.v === 'number' && ['pub', 'sec', 'tmp'].includes(v.s)), `substrates ${b.id}.${k}: 形式不正`);
    if (v && v.s === 'tmp') ok(!!v.note, `substrates ${b.id}.${k}: 仮値に根拠メモがない`);
  });
});
(D.cooling || []).forEach((c) => ok(c.s === 'tmp' && c.rK_W > 0, `cooling ${c.id}: 形式不正`));
(D.gb7Scores || []).forEach((r) => {
  ok(Number.isFinite(r.single) && Number.isFinite(r.multi) && r.single > 0 && r.multi >= r.single / 2, `gb7 ${r.name}: 値が不自然 (${r.single}/${r.multi})`);
});

console.log(`ファイル ${files.length} / nodes ${(D.nodes || []).length} / substrates ${(D.substrates || []).length} / cooling ${(D.cooling || []).length} / gb7 ${(D.gb7Scores || []).length}`);
if (errs.length) { console.error('エラー:\n' + errs.join('\n')); process.exit(1); }
console.log('OK');
