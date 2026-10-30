// 設計書 §2.4 の表から Geekbench 7 のスコアを取り出し、data/benchmarks/gb7-scores.js を生成する。
// 数値に一意に読める行だけを採用し、範囲表記・未取得などは skipped.txt に理由付きで出す(手動確認用)。
// 使い方: node tools/extract-gb7.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(root, 'docs', '設計書.md'), 'utf8').split(/\r?\n/);

const start = doc.findIndex((l) => l.startsWith('### 2.4 '));
const end = doc.findIndex((l, i) => i > start && /^### 2\.5 /.test(l));
if (start < 0 || end < 0) throw new Error('§2.4 が見つかりません');

// 数値セルを読む。"2920〜2921"(範囲)、"3242(10c)"(注記)、"6373 / 5793(…)"(複数値) に対応。
// 戻り値: { v: 先頭の値, hi: 範囲の上限(あれば), note: 注記(あれば) } / 読めなければ null
const num = (s) => {
  const t = s.replace(/[約,]/g, '').trim();
  const m = t.match(/^(\d+)\s*(?:[〜~]\s*(\d+)(?:\([^)]*\))?)?\s*(?:\(([^)]*)\))?\s*(?:\/.*)?$/);
  if (!m) return null;
  return { v: Number(m[1]), hi: m[2] ? Number(m[2]) : null, note: m[3] || (t.includes('/') ? '複数値あり(先頭を採用): ' + t : '') };
};

let heading = '';
let sub = '';
let tableKind = ''; // 区分の列が無い表の既定の区分(「追加取得分」節=直近25件の中央値、その中の Jetson 表=個別投稿の中央値。U16)
const rows = [];
const skipped = [];

for (let i = start; i < end; i++) {
  const line = doc[i];
  if (line.startsWith('#### ')) { heading = line.replace(/^####\s*/, ''); sub = ''; tableKind = heading.startsWith('追加取得分') ? '直近25件の中央値' : ''; continue; }
  if (tableKind && /^\s*-\s*\*\*NVIDIA Jetson/.test(line)) tableKind = '個別投稿の中央値';
  if (!line.trim().startsWith('|')) continue;
  if (heading.startsWith('Intel 第2〜第11世代')) continue; // 別処理(下)
  const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  if (cells.length < 3) continue;
  if (/^[-: ]+$/.test(cells[0]) || cells[0] === 'チップ' || /^チップ/.test(cells[0]) || cells[0] === '世代') continue;
  if (cells[0] === '' && cells.length > 3) cells[0] = sub; // 第2〜11世代の継続行
  const [name, s, m] = cells;
  const single = num(s);
  const multi = num(m);
  const rest = cells.slice(3);
  const kindCell = rest.find((c) => /\[(チャート|中央値|個別投稿|直近25件の中央値)/.test(c)) || '';
  if (single === null || multi === null) {
    skipped.push(`${heading} | ${line.trim().slice(0, 140)}`);
    continue;
  }
  if (name.includes(' / ') && (s.includes('/') || m.includes('/'))) { // 1行に2つのチップがある行は採用しない
    skipped.push(`${heading} | (2チップ併記) ${line.trim().slice(0, 140)}`);
    continue;
  }
  const nCell = rest.find((c) => /^\d+$/.test(c));
  // 備考欄が「N件」で始まる行(追加取得分の「13件」「17件(機種が混在)」など)は N を件数として読む。「直近25件」「約12件」のように先頭が数字でないものは対象外
  const nNote = rest.map((c) => c.match(/^(\d+)件/)).find(Boolean);
  rows.push({
    group: heading,
    name,
    single: single.v,
    multi: multi.v,
    ...(single.hi ? { singleHi: single.hi } : {}),
    ...(multi.hi ? { multiHi: multi.hi } : {}),
    ...(single.note || multi.note ? { note: [single.note && 'シングル: ' + single.note, multi.note && 'マルチ: ' + multi.note].filter(Boolean).join(' / ') } : {}),
    kind: (kindCell.match(/\[(.+?)\]/) || [, ''])[1] || tableKind || 'チャート',
    n: nCell ? Number(nCell) : (nNote ? Number(nNote[1]) : null),
  });
}

// 第2〜11世代の表は列構成が違う(世代 | SKU | シングル | マルチ)ので別に処理する
const genStart = doc.findIndex((l) => l.startsWith('#### Intel 第2〜第11世代'));
const gen = [];
if (genStart >= 0) {
  let g = '';
  for (let i = genStart + 1; i < end; i++) {
    const line = doc[i];
    if (line.startsWith('#### ')) break;
    if (!line.trim().startsWith('|')) continue;
    const c = line.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    if (c.length !== 4 || c[0] === '世代' || /^[-: ]+$/.test(c[0])) continue;
    if (c[0]) g = c[0];
    const s = num(c[2]); const m = num(c[3]);
    if (s === null || m === null) continue;
    gen.push({ group: 'Intel 第2〜第11世代', generation: g, name: c[1], single: s.v, multi: m.v, kind: 'チャート', n: null });
  }
}
// 上のループが第2〜11世代の表を誤って拾っていたら除去(列数が違うため)
const keep = rows.filter((r) => !(r.group.startsWith('Intel 第2〜第11世代')));

const all = keep.concat(gen);
const header = '// 自動生成(tools/extract-gb7.js)。設計書 §2.4 から抽出。手で編集しない。\n' +
  '// 区分: チャート=Geekbench 公式チャートの SKU 平均 / 中央値=同じ SoC の機種スコアの中央値(n=機種数) / 個別投稿・直近25件の中央値=検索結果から\n';
fs.writeFileSync(
  path.join(root, 'data', 'benchmarks', 'gb7-scores.js'),
  header + 'window.SDS_DATA = window.SDS_DATA || {};\nwindow.SDS_DATA.gb7Scores = ' + JSON.stringify(all, null, 1) + ';\n',
);
fs.writeFileSync(path.join(root, 'tools', 'gb7-skipped.txt'), skipped.join('\n') + '\n');
console.log(`採用 ${all.length} 行 / 除外 ${skipped.length} 行 (tools/gb7-skipped.txt)`);
