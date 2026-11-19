// テスト共通: データとモデルを Node で読み込む(ブラウザと同じ window.SDS_DATA / window.SDS の形)。
'use strict';
const path = require('path');
global.window = globalThis;
const root = path.join(__dirname, '..');
[
  'data/benchmarks/gb7-scores.js', 'data/nodes.js', 'data/substrates.js', 'data/cooling.js', 'data/uarch.js',
  'data/presets/chips-pc.js', 'data/presets/chips-soc.js', 'data/presets/chips-old.js', 'data/presets/chips-old-amd.js', 'data/memory.js',
  'data/history-edu.js', // 2026-11-18: 歴史の教材部分(時代区分・用語集・学べること・試してみよう)
  'data/history.js', // 2026-11-18: 世代の歴史・全体の歴史・一覧の世代順
  'data/caplayouts.js', // 2026-11-16: 3D のコンデンサ配置(index.html と同じ条件にする)
  'data/blocklib.js', // 2026-11-09: ブラウザ(index.html)と同じ条件にする(読まないと D.blocklibAreas が undefined になり、表に当たるコアも全部「不明」になる)
].forEach((f) => require(path.join(root, f)));
const sim = {};
['memory', 'perf', 'power', 'thermal', 'area'].forEach((m) => { try { sim[m] = require(path.join(root, 'js', 'sim', m + '.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } });
const D = globalThis.SDS_DATA;
const gb7ByName = {};
D.gb7Scores.forEach((r) => { gb7ByName[r.name] = r; });
module.exports = { D, sim, gb7ByName };
