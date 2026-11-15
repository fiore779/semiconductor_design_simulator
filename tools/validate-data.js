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
// ノート PC の冷却クラス(2026-11-12。sustainedW = MT 持続電力 [W]): 値は正の数で、幅(sustainedRangeW)に含まれ、区分は meas([実測])・件数・取得日・出典が付いていること。sustainedW を持たない冷却は MT を制限しない
(D.cooling || []).filter((c) => c.sustainedW !== undefined).forEach((c) => {
  ok(typeof c.sustainedW === 'number' && c.sustainedW > 0, `cooling ${c.id}: sustainedW が正の数でない`);
  ok(Array.isArray(c.sustainedRangeW) && c.sustainedRangeW.length === 2 && c.sustainedRangeW[0] <= c.sustainedW && c.sustainedW <= c.sustainedRangeW[1], `cooling ${c.id}: sustainedRangeW が [下限, 上限] で sustainedW を含まない`);
  ok(c.sustainedS === 'meas' && Number.isInteger(c.sustainedN) && c.sustainedN > 0 && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(c.sustainedDate || '') && typeof c.sustainedSrc === 'string' && c.sustainedSrc, `cooling ${c.id}: sustained の区分(meas)・件数・取得日・出典が無い`);
});
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
  { const tw = p.power && p.power.typicalW; // 2026-11-15: 任意項目 power.typicalW(MT のクロックを決める典型電力 W。プリセット由来のみで保存データには載らない)。数で、range があればその範囲内
    if (tw !== undefined) { ok(typeof tw === 'number' && isFinite(tw) && tw > 0 && tw <= 1000, `presets ${p.id}: power.typicalW 不正`); const rg = p.power.range; if (rg && typeof rg.minW === 'number' && typeof rg.maxW === 'number' && typeof tw === 'number') ok(tw >= rg.minW && tw <= rg.maxW, `presets ${p.id}: power.typicalW が range の外`); ok(typeof p.power.typicalNote === 'string' && p.power.typicalNote.length > 0, `presets ${p.id}: power.typicalW に typicalNote(区分・根拠)が無い`); } }
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
// cfg.dramLat(プラットフォームの DRAM 遅延。2026-11-15): ns は 20〜300 の有限数、s は 実測・二次・推定、src と cfg は空でない文字列。s が 推定 のとき src は「代用:」で始まる(別の SKU の値の代用であることを明記)
(D.presets || []).forEach((p) => {
  const d = p.cfg && p.cfg.dramLat; if (d === undefined) return;
  ok(d && typeof d.ns === 'number' && Number.isFinite(d.ns) && d.ns >= 20 && d.ns <= 300, `presets ${p.id}: cfg.dramLat.ns が 20〜300 の数でない`);
  ok(d && ['実測', '二次', '推定'].includes(d.s), `presets ${p.id}: cfg.dramLat.s が 実測・二次・推定 のいずれでもない`);
  ok(d && typeof d.src === 'string' && d.src.length > 10 && typeof d.cfg === 'string' && d.cfg.length > 0, `presets ${p.id}: cfg.dramLat の src・cfg が空`);
  ok(!d || d.s !== '推定' || /^代用:/.test(d.src), `presets ${p.id}: cfg.dramLat.s が 推定 なのに src が「代用:」で始まらない`);
});
// uRatioOf: 借り先の uarch が存在し、cal.u に直接 u を持つこと(代表の u か uCal)。uRatio は 0 より大きい有限数(2026-11-13)
(function () {
  const P = require(path.join(root, 'js', 'sim', 'perf.js'));
  const gb7 = {}; (D.gb7Scores || []).forEach((r) => { gb7[r.name] = r; });
  const cal = P.calibrate(D.presets || [], gb7, D.uarch || {}, 'rep', null);
  Object.keys(D.uarch || {}).forEach((name) => {
    const u = D.uarch[name];
    if (u.uRatioOf == null && u.uRatio == null) return;
    ok(typeof u.uRatioOf === 'string' && !!D.uarch[u.uRatioOf], `uarch ${name}.uRatioOf「${u.uRatioOf}」が uarch に無い`);
    ok(typeof u.uRatio === 'number' && Number.isFinite(u.uRatio) && u.uRatio > 0, `uarch ${name}.uRatio が 0 より大きい有限数でない`);
    ok(cal.u && typeof cal.u[u.uRatioOf] === 'number', `uarch ${name}.uRatioOf「${u.uRatioOf}」が cal.u に直接 u を持たない(代表の u か uCal が必要)`);
  });
})();
const sig = (p) => (((p.cfg && p.cfg.cores) || []).map((c) => `${c.uarch}x${c.count}`).sort().join('+')) + '|' + (p.dies || []).map((d) => `${d.name}:${d.mm2}`).join(',');
const sigCount = new Map();
// 2026-11-04: Core Ultra 5 325・Core 5 320 もダイ面積が未取得(Kraken Point と同じ扱い。ユーザーは 2 件の追加を指示しただけで、例外の登録は実装上の判断)
// 2026-11-11: Core Ultra 9 285H(Arrow Lake-H)もダイ面積が未取得(6P+8E の compute tile は 285K・275HX の 8P+16E タイルとは別のダイ。推測しない。ユーザーは HX 系の標本 4 件の追加を指示しただけで、例外の登録は実装上の判断)
const C2_EXCEPTIONS = new Set(['amd-kraken-350', 'intel-ptl-u5-325', 'intel-wcl-c5-320', 'intel-arl-285h']);
// GB10(DGX Spark)は 2026-11-03 に GB7 未取得の例外として追加したが、2026-11-06 にユーザー提供の検索結果(6 件の中央値)で GB7 を採用したため、例外から外した(設計書 §13 M5b-4)
// Core 5 320(Wildcat Lake)は 2026-11-04 にユーザー提供の検索結果(先頭 8 件の中央値)で GB7 を採用したため、例外から外した
const C1_EXCEPTIONS = new Set([]);
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
  // 例外(ユーザー選択 2026-11-07): GB10 は Cortex-X925 の 2 件目の校正代表(calib:true)。ほかの追加分は false
  ok(p.id === 'nv-gb10' ? p.calib === true : p.calib === false, `${id}: 追加分の calib は false(nv-gb10 だけ true)`);
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

// 固定メモリ(data/memory.js の memoryFixed。Lunar Lake): id が実在し、選択肢の表と重複せず、種別・速度・容量・オンパッケージ・固定・区分・出典が揃っていること
Object.keys(D.memoryFixed || {}).forEach((id) => {
  const f = D.memoryFixed[id];
  ok(pids.has(id), `memoryFixed ${id}: プリセットに無い id`);
  ok(!(D.memory && D.memory[id]), `memoryFixed ${id}: 選択肢の表(memory)にも載っている`);
  ok(typeof f.type === 'string' && f.type && Object.prototype.hasOwnProperty.call(D.memoryLadder || {}, f.type), `memoryFixed ${id}: type が不正`);
  ok(Number.isInteger(f.mts) && f.mts > 0, `memoryFixed ${id}: mts が不正`);
  // gb: 単一の正整数(型番で 1 つ)か、2 件以上の昇順の正整数配列(公式構成の選択肢。defaultGb が含まれること)
  if (Array.isArray(f.gb)) {
    ok(f.gb.length >= 2 && f.gb.every((v, i) => Number.isInteger(v) && v > 0 && (i === 0 || v > f.gb[i - 1])), `memoryFixed ${id}: gb 配列が不正(2 件以上の昇順の正整数)`);
    ok(f.gb.includes(f.defaultGb), `memoryFixed ${id}: defaultGb が gb に含まれない`);
  } else {
    ok(Number.isInteger(f.gb) && f.gb > 0, `memoryFixed ${id}: gb が不正`);
    ok(f.defaultGb === undefined, `memoryFixed ${id}: 単一の gb に defaultGb は不要`);
  }
  ok(f.onPackage === true && f.fixed === true, `memoryFixed ${id}: onPackage / fixed が true でない`);
  ok(['pub', 'sec'].includes(f.s) && typeof f.src === 'string' && f.src, `memoryFixed ${id}: 区分(pub/sec)・出典が無い`);
  ok(['typeS', 'gbS'].every((k) => f[k] === undefined || ['pub', 'sec'].includes(f[k])), `memoryFixed ${id}: typeS / gbS が pub/sec でない`);
  // 種別・速度は、プリセットの cfg.memory 文字列(評価は触らない)に含まれていること
  const pr = (D.presets || []).find((p) => p.id === id);
  const ms = pr && pr.cfg && pr.cfg.memory;
  ok(typeof ms === 'string', `memoryFixed ${id}: プリセットの cfg.memory が文字列でない(プリセットが無い、または cfg.memory が未設定)`);
  if (typeof ms === 'string') ok(ms.includes(`${f.type}-${f.mts}`), `memoryFixed ${id}: 種別・速度 ${f.type}-${f.mts} がプリセットの cfg.memory「${ms}」に含まれない`);
});

console.log(`プリセット ${(D.presets || []).length} 件 / ファイル ${files.length} / nodes ${(D.nodes || []).length} / substrates ${(D.substrates || []).length} / cooling ${(D.cooling || []).length} / gb7 ${(D.gb7Scores || []).length}`);
if (errs.length) { console.error('エラー:\n' + errs.join('\n')); process.exit(1); }
console.log('OK');
