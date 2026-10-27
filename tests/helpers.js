// テスト共通: データとモデルを Node で読み込む(ブラウザと同じ window.SDS_DATA / window.SDS の形)。
'use strict';
const path = require('path');
global.window = globalThis;
const root = path.join(__dirname, '..');
[
  'data/benchmarks/gb7-scores.js', 'data/nodes.js', 'data/substrates.js', 'data/cooling.js', 'data/uarch.js',
  'data/presets/chips-pc.js', 'data/presets/chips-soc.js',
].forEach((f) => require(path.join(root, f)));
const sim = {};
['perf', 'power', 'thermal', 'area'].forEach((m) => { try { sim[m] = require(path.join(root, 'js', 'sim', m + '.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } });
const D = globalThis.SDS_DATA;
const gb7ByName = {};
D.gb7Scores.forEach((r) => { gb7ByName[r.name] = r; });
module.exports = { D, sim, gb7ByName };
