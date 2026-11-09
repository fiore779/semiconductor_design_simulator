// 部品ライブラリ(設計書 §3.3 C・§8.7)。プリセットから「コア 1 個単位」と「ブロック(L3 / GPU / uncore)」の部品を作る。
// UI に依存しない純関数。読み込み順: data/blocklib.js・data/nodes.js・data/presets の後(js/model/design.js は実行時に引くので順序不問)。
//
// コアの面積の決め方(2026-11-09 に作り直し。調査: docs/research/core-areas-2026-11-09.md)。段階的に照合する:
//   1. SKU 一致(表の chip / chips が同じプリセットで、プロセスも一致)  → origin 'table'(測定値・公表値。basis 'measured')または 'estimated'(表の推定・流用)
//   2. uarch + プロセス一致(SKU は問わない。同じ uarch・同じプロセスなら SKU が違っても同じ面積)
//   3. 同じ uarch の別プロセスの値を compat.portArea で換算(区分『移植』。origin 'estimated'、area.basis 'port'、s 'est')
//   4. どれも無ければ origin 'unknown'(面積 null。推測で埋めない)
// 従来の「ダイ面積 × 0.4 ÷ コア総数」の推定式は廃止した(根拠のない仮の既定値で、P/E の区別がなく、285K の P(1.957)が 388H の E(2.878)より小さくなる原因だった)。
//
// 面積の区分(area.origin):
//   'table'     … data/blocklib.js(設計書 §2.3 の表)の測定値・公表値(basis 'measured'。s は 'pub' か 'sec')
//   'estimated' … 根拠つきの推定: 表の推定・流用(basis 'estimate' / 'reuse')か、移植換算(basis 'port')。s は 'est'。根拠は note に書く(根拠のない仮の比率ではない)
//   'unknown'   … 表にも移植の元にも無い。area.mm2 は null(0 や推測値で埋めない)
// L3 とダイ(GPU・uncore)の面積は従来どおり(L3 はダイ面積 × L3_FRACTION の根拠のない仮の既定値の推定。コアの推定式とは別で、今回は直していない)。
(function (root) {
  'use strict';

  // 根拠のない仮の既定値。L3 がダイに占める比率。実チップのフロアプランから出した値ではなく、校正もしていない。
  // 実測は 1MB あたり 0.49 mm²(Zen 5)・約 0.66(RPL)・約 1.0(ADL。リング込み)とチップで 2 倍違う(docs/research/core-areas-2026-11-09.md 4.1)。目安にすぎず note に式と比率を必ず書く。
  const L3_FRACTION = 0.15;

  function designApi() {
    if (root.SDS && root.SDS.model && root.SDS.model.design) return root.SDS.model.design;
    if (typeof require === 'function') return require('./design.js');
    return null;
  }
  function compatApi() {
    if (root.SDS && root.SDS.model && root.SDS.model.compat) return root.SDS.model.compat;
    if (typeof require === 'function') { try { return require('./compat.js'); } catch (e) { return null; } }
    return null;
  }
  const roleOf = (name) => { const V = designApi(); return V ? V.dieRole(name) : 'compute'; };

  const num = (x) => typeof x === 'number' && isFinite(x);
  const r3 = (x) => Math.round(x * 1000) / 1000;

  // そのプリセットの compute ダイ(最初の compute 役。無ければ最初のダイ)。ダイが無ければ null
  function computeDie(preset) {
    const dies = preset.dies || [];
    if (!dies.length) return null;
    const i = dies.findIndex((d) => roleOf(d.name) === 'compute');
    return dies[i < 0 ? 0 : i];
  }

  const clockOf = (g) => g.boostGHz || g.maxGHz || g.baseGHz || null;

  const typeOk = (a, coreType) => !a.coreTypes || a.coreTypes.includes(coreType);
  const isSpecific = (a) => a.chip != null || Array.isArray(a.chips);
  const forChip = (a, chipId) => a.chip === chipId || (Array.isArray(a.chips) && a.chips.includes(chipId));
  // 段階 1・2: { row, stage } か null。stage = 'sku'(SKU 一致)| 'uarch-node'(uarch + プロセス一致)
  function findTable(areas, uarch, chipId, nodeId, coreType) {
    const rows = (areas || []).filter((a) => a.uarch === uarch && typeOk(a, coreType) && (a.nodeId == null || a.nodeId === nodeId));
    const sku = rows.find((a) => isSpecific(a) && forChip(a, chipId));
    if (sku) return { row: sku, stage: 'sku' };
    const gen = rows.find((a) => !isSpecific(a));
    return gen ? { row: gen, stage: 'uarch-node' } : null;
  }
  // 段階 3: 同じ uarch の別プロセスの行(withL2 がある。一般の行を優先)から compat.portArea で換算。換算できなければ null
  function findPorted(areas, uarch, nodeId, coreType, nodes) {
    if (!nodeId) return null;
    const C = compatApi(); if (!C) return null;
    const rows = (areas || []).filter((a) => a.uarch === uarch && typeOk(a, coreType) && a.nodeId && a.nodeId !== nodeId && num(a.withL2Mm2));
    rows.sort((x, y) => (isSpecific(x) ? 1 : 0) - (isSpecific(y) ? 1 : 0));
    for (const a of rows) {
      const w = C.portArea(a.withL2Mm2, a.nodeId, nodeId, nodes);
      if (!w.ok) continue;
      const n0 = num(a.noL2Mm2) ? C.portArea(a.noL2Mm2, a.nodeId, nodeId, nodes) : null;
      return { row: a, withL2Mm2: r3(w.mm2), mm2: n0 && n0.ok ? r3(n0.mm2) : null, ratio: w.ratio, note: w.note };
    }
    return null;
  }

  // build(presets, areas, nodes) → 部品の配列(コア部品 → ブロック部品の順。プリセット順)
  function build(presets, areas, nodes) {
    const uarchDb = (root.SDS_DATA && root.SDS_DATA.uarch) || {};
    const parts = [];
    (presets || []).forEach((p) => {
      const cdie = computeDie(p);
      const nodeId = cdie ? cdie.nodeId || null : null;
      const dieKnown = !!cdie && num(cdie.mm2) && cdie.mm2 > 0;
      const groups = (p.cfg && p.cfg.cores) || [];
      const common = { sourceChip: p.name, sourcePresetId: p.id, vendor: p.vendor || null, isa: p.isa || null, nodeId, sourceMemory: (p.cfg && p.cfg.memory) || null };

      groups.forEach((g) => {
        const t = findTable(areas, g.uarch, p.id, nodeId, g.type);
        const u = uarchDb[g.uarch] || {};
        let area;
        if (t) {
          const a = t.row;
          const meas = (a.basis || 'measured') === 'measured';
          area = { mm2: a.noL2Mm2 == null ? null : a.noL2Mm2, withL2Mm2: a.withL2Mm2 == null ? null : a.withL2Mm2, l2KB: a.l2KB == null ? null : a.l2KB, variant: a.variant || null, s: a.s || null, basis: a.basis || 'measured', origin: meas ? 'table' : 'estimated', note: (t.stage === 'uarch-node' ? '同じ uarch・同じプロセスの値。' : '') + (a.note || '') };
        } else {
          const pt = findPorted(areas, g.uarch, nodeId, g.type, nodes);
          if (pt) {
            area = { mm2: pt.mm2, withL2Mm2: pt.withL2Mm2, l2KB: pt.row.l2KB == null ? null : pt.row.l2KB, s: 'est', basis: 'port', origin: 'estimated', note: `移植(根拠: ${pt.row.nodeId} の値 ${pt.row.withL2Mm2} mm²〔${pt.row.uarch}、L2 込み。出所は表の行〕に密度比 ${r3(pt.ratio)} を掛けて ${nodeId} に換算。L2 容量が SKU で違えば補正が要る。区分: 移植)${pt.note ? '。' + pt.note : ''}` };
          } else {
            area = { mm2: null, withL2Mm2: null, l2KB: u.l2KB == null ? null : u.l2KB, s: null, basis: null, origin: 'unknown', note: '不明: このコア(uarch × プロセス)の 1 コア面積は表になく、移植換算の元もありません。推測で埋めません(従来の「ダイ面積 × 仮の比率 ÷ コア数」の推定式は 2026-11-09 に廃止)' };
          }
        }
        parts.push(Object.assign({
          id: `core:${p.id}:${g.type}`, kind: 'core', label: `${g.uarch || 'uarch 未指定'} コア(${p.name} の ${g.type})`, uarch: g.uarch, coreType: g.type,
          defaultClockGHz: clockOf(g), smt: g.smt || 1, area,
        }, common));
      });

      // L3: 容量は同プリセットの l3MB。面積は推定(compute ダイ × L3_FRACTION。仮)か未取得
      const l3 = p.cfg && num(p.cfg.l3MB) ? p.cfg.l3MB : 0;
      if (l3 > 0) {
        let area;
        if (dieKnown) {
          const mm2 = r3(cdie.mm2 * L3_FRACTION);
          area = { mm2, perMBMm2: r3(mm2 / l3), s: 'sec', origin: 'estimated', note: `推定: ダイ面積 ${cdie.mm2} mm² × L3 の割合 ${L3_FRACTION}(根拠のない仮の既定値)= ${mm2} mm²(${l3} MB。1MB あたり ${r3(mm2 / l3)} mm²)` };
        } else area = { mm2: null, perMBMm2: null, s: null, origin: 'unknown', note: 'ダイ面積が未取得のため L3 面積を推定できません' };
        parts.push(Object.assign({ id: `l3:${p.id}`, kind: 'l3', label: `L3 ${l3}MB(${p.name})`, capacityMB: l3, area }, common));
      }

      // GPU・uncore: プリセットのダイ(タイル)のうち役割が gpu / uncore のもの。面積 = そのダイの面積
      (p.dies || []).forEach((d, i) => {
        const role = roleOf(d.name);
        if (role === 'compute') return;
        const known = num(d.mm2) && d.mm2 > 0;
        const area = known
          ? { mm2: d.mm2, s: d.s || null, origin: 'table', note: `${d.name} のダイ面積${d.note ? `(${d.note})` : ''}` }
          : { mm2: null, s: null, origin: 'unknown', note: `${d.name} の面積は未取得` };
        parts.push(Object.assign({}, common, { id: `${role}:${p.id}:${i}`, kind: role, label: `${d.name}(${p.name})`, nodeId: d.nodeId || null, area }));
      });
    });
    return parts;
  }

  const get = (parts, id) => (parts || []).find((p) => p.id === id) || null;

  // search(parts, {isa, vendor, text}): 指定した条件すべてに合う部品。text は label / sourceChip / uarch の部分一致(大文字小文字を区別しない)
  function search(parts, q) {
    const o = q || {};
    const t = o.text ? String(o.text).toLowerCase() : null;
    return (parts || []).filter((p) => {
      if (o.isa && p.isa !== o.isa) return false;
      if (o.vendor && p.vendor !== o.vendor) return false;
      if (o.kind && p.kind !== o.kind) return false;
      if (t && ![p.label, p.sourceChip, p.uarch, p.coreType].some((s) => s && String(s).toLowerCase().includes(t))) return false;
      return true;
    });
  }

  // 部品をダイに置くときの面積(L2 込みがあればそれ。コアは L2 が無いと動かないため)。不明なら null
  function placeAreaMm2(part) {
    const a = part && part.area;
    if (!a) return null;
    if (part.kind === 'core') return num(a.withL2Mm2) ? a.withL2Mm2 : num(a.mm2) ? a.mm2 : null;
    return num(a.mm2) ? a.mm2 : null;
  }

  const api = { L3_FRACTION, build, get, search, computeDie, placeAreaMm2 };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.blocklib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
