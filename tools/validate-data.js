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

// プリセット
const gbByName = new Map();
(D.gb7Scores || []).forEach((r) => gbByName.set(r.name, (gbByName.get(r.name) || 0) + 1));
const nodeIds = new Set((D.nodes || []).map((n) => n.id));
const pids = new Set();
(D.presets || []).forEach((p) => {
  ok(!pids.has(p.id), `presets: id 重複 ${p.id}`); pids.add(p.id);
  if (p.gb7 !== null) ok(gbByName.get(p.gb7) === 1, `presets ${p.id}: gb7 "${p.gb7}" が gb7-scores.js に一意に見つからない (${gbByName.get(p.gb7) || 0} 件)`);
  (p.dies || []).forEach((d) => {
    ok(d.mm2 === null || (typeof d.mm2 === 'number' && ['meas', 'pub', 'sec'].includes(d.s)), `presets ${p.id}: die ${d.name} の面積/区分が不正`);
    ok(!d.nodeId || nodeIds.has(d.nodeId) || /^tsmc-n6$/.test(d.nodeId), `presets ${p.id}: nodeId ${d.nodeId} が nodes.js に無い`);
  });
  ['base', 'peak'].forEach((k) => { const w = p.power && p.power[k]; ok(!w || (typeof w.w === 'number' && ['pub', 'sec', 'meas'].includes(w.s)), `presets ${p.id}: power.${k} 不正`); });
  ok(typeof p.calib === 'boolean', `presets ${p.id}: calib が boolean でない`);
  if (p.calib) ok(!!p.calibNote, `presets ${p.id}: calib=true なのに calibNote が無い`);
});

// 同じ GB7 行を 2 件のプリセットが使っていないか(全件)
const gbUsers = new Map();
(D.presets || []).forEach((p) => { if (p.gb7 !== null && p.gb7 !== undefined) gbUsers.set(p.gb7, (gbUsers.get(p.gb7) || []).concat(p.id)); });
gbUsers.forEach((v, k) => ok(v.length === 1, `presets: gb7 "${k}" を複数のプリセットが使用 (${v.join(', ')})`));

// cfg.l3Ccds(ST の L3 を 1 CCD 分にする。設計書 §5.3.3 G の3): 2 以上の整数で、l3MB が正の数であること
(D.presets || []).forEach((p) => {
  if (p.cfg && p.cfg.l3Ccds !== undefined) ok(Number.isInteger(p.cfg.l3Ccds) && p.cfg.l3Ccds >= 2 && typeof p.cfg.l3MB === 'number' && p.cfg.l3MB > 0, `presets ${p.id}: cfg.l3Ccds は 2 以上の整数で、l3MB が正の数であること`);
});

// M5b 追加分(addedIn:'M5b')だけの追加基準 C1〜C5(設計書 §13 M5b-4。C5 は第12世代以降の Intel を除く)。既存 65 件は対象外。
// uCal.excluded(校正の標本から除外した preset id)は実在すること(typo で inUCalSet が狂わないように)
Object.keys(D.uarch || {}).forEach((name) => {
  const c = D.uarch[name].uCal;
  if (!c || c.excluded == null) return;
  ok(Array.isArray(c.excluded), `uarch ${name}.uCal.excluded が配列でない`);
  (Array.isArray(c.excluded) ? c.excluded : []).forEach((id) => ok((D.presets || []).some((p) => p.id === id), `uarch ${name}.uCal.excluded の id「${id}」が presets に無い`));
});
const sig = (p) => (((p.cfg && p.cfg.cores) || []).map((c) => `${c.uarch}x${c.count}`).sort().join('+')) + '|' + (p.dies || []).map((d) => `${d.name}:${d.mm2}`).join(',');
const sigCount = new Map();
const C2_EXCEPTIONS = new Set(['amd-kraken-350']);
// C1 の例外(id 指定。C2〜C5 は続ける): GB10(DGX Spark)は GB7 が未取得(二次資料にも無い。N1X の値は別製品なので入れない)で gb7: null。ユーザー指示 2026-11-03(設計書 §13 M5b-4)
const C1_EXCEPTIONS = new Set(['nv-gb10']);
const INTEL_GEN12_PLUS_P = new Set(['Golden Cove', 'Raptor Cove', 'Redwood Cove', 'Lion Cove', 'Cougar Cove']);
const isIntelGen12Plus = (p) => p.vendor === 'Intel' && ((p.cfg && p.cfg.cores) || []).some((c) => INTEL_GEN12_PLUS_P.has(c.uarch));
(D.presets || []).forEach((p) => sigCount.set(sig(p), (sigCount.get(sig(p)) || 0) + 1));
(D.presets || []).filter((p) => p.addedIn === 'M5b').forEach((p) => {
  const id = `presets ${p.id}(M5b)`;
  // C1 GB7
  const g = (D.gb7Scores || []).find((r) => r.name === p.gb7);
  if (C1_EXCEPTIONS.has(p.id)) ok(p.gb7 === null, `${id}: C1 の例外は gb7 が null であること`);
  else {
    ok(!!g && gbByName.get(p.gb7) === 1 && Number.isFinite(g.single) && Number.isFinite(g.multi), `${id}: C1 gb7 が一意に一致し single/multi が数値であること`);
    ok(!/64c/.test(p.gb7 || ''), `${id}: C1 定義が不明な GB7 行(64c 表記)は使えない`);
  }
  // C2 面積
  const numDies = (p.dies || []).filter((d) => typeof d.mm2 === 'number');
  // C2 の例外(id 指定。C1・C3・C4 は続ける): Kraken Point はダイ面積が未取得(仮寸法表示)。ユーザー指示 2026-10-31(設計書 §13)
  if (!C2_EXCEPTIONS.has(p.id)) ok(numDies.length >= 1, `${id}: C2 mm2 が数値のダイが 1 つも無い`);
  numDies.forEach((d) => ok(['meas', 'pub'].includes(d.s) || (d.s === 'sec' && !!d.note), `${id}: C2 die ${d.name} の区分は meas/pub、または note つきの sec のみ`));
  // C3 構成(uarch が存在・count・クロックは cores のどれか 1 件以上。LP-E など個別に未取得のコアは null を許す)
  const cores = (p.cfg && p.cfg.cores) || [];
  ok(cores.length >= 1, `${id}: C3 cfg.cores が空`);
  cores.forEach((c, i) => ok(!!(D.uarch && D.uarch[c.uarch]) && Number.isFinite(c.count) && c.count > 0, `${id}: C3 cores[${i}] の uarch(${c.uarch})/count が不正`));
  ok(cores.some((c) => [c.baseGHz, c.boostGHz, c.maxGHz].some((v) => typeof v === 'number')), `${id}: C3 クロックが 1 件も無い`);
  // C4 ノード
  numDies.forEach((d) => ok(!!d.nodeId && nodeIds.has(d.nodeId), `${id}: C4 die ${d.name} の nodeId(${d.nodeId}) が nodes.js に無い`));
  // C5 代表性(uarch・ダイ・コア数が同じ SKU は既存と合わせて最大 2 件)
  // 例外(ユーザー決定 2026-10-29。設計書 §13 M5b-4): 第12世代以降の Intel(P コアが Golden Cove 以降)には C5 を適用しない
  ok(isIntelGen12Plus(p) || sigCount.get(sig(p)) <= 2, `${id}: C5 uarch・ダイ・コア数が同じ SKU が 3 件以上 (${sigCount.get(sig(p))})`);
  ok(p.calib === false, `${id}: 追加分の calib は false`);
});

// メモリ構成の選択肢(data/memory.js。設計書 §5.2.4): id が実在し、基準が選択肢に含まれ、速度は対応最大以下で、区分・出典が付いていること
Object.keys(D.memory || {}).forEach((id) => {
  const e = D.memory[id];
  ok(pids.has(id), `memory ${id}: プリセットに無い id`);
  ok(e.bits > 0 && Number.isInteger(e.bits), `memory ${id}: bits が不正`);
  ok(Array.isArray(e.options) && e.options.length >= 1, `memory ${id}: options が空`);
  const types = new Set();
  (e.options || []).forEach((o) => {
    ok(!types.has(o.type), `memory ${id}: 種別 ${o.type} が重複`); types.add(o.type);
    ok(['pub', 'sec'].includes(o.s) && typeof o.src === 'string' && o.src, `memory ${id}/${o.type}: 区分(pub/sec)・出典が無い`);
    ok(Array.isArray(o.speeds) && o.speeds.length && o.speeds.every((v) => Number.isInteger(v) && v > 0 && v <= o.max) && o.speeds.includes(o.max), `memory ${id}/${o.type}: speeds が対応最大 ${o.max} を超えるか、最大を含まない`);
  });
  const ro = (e.options || []).find((o) => o.type === (e.ref && e.ref.type));
  ok(!!ro && ro.speeds.includes(e.ref.mts), `memory ${id}: 基準構成が選択肢に含まれない`);
});

console.log(`プリセット ${(D.presets || []).length} 件 / ファイル ${files.length} / nodes ${(D.nodes || []).length} / substrates ${(D.substrates || []).length} / cooling ${(D.cooling || []).length} / gb7 ${(D.gb7Scores || []).length}`);
if (errs.length) { console.error('エラー:\n' + errs.join('\n')); process.exit(1); }
console.log('OK');
