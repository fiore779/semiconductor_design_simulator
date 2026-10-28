// 部品ライブラリ(設計書 §3.3 C・§8.7)。プリセットから「コア 1 個単位」と「ブロック(L3 / GPU / uncore)」の部品を作る。
// UI に依存しない純関数。読み込み順: data/blocklib.js・data/nodes.js・data/presets の後(js/model/design.js は実行時に引くので順序不問)。
//
// 面積の区分(area.origin):
//   'table'     … data/blocklib.js(設計書 §2.3 の表)に一致した値
//   'estimated' … 表に無いので推定。**推定式の比率は根拠のない仮の既定値**(下の CORE_FRACTION / L3_FRACTION)
//   'unknown'   … ダイ面積も未取得。area.mm2 は null(0 や推測値で埋めない)
(function (root) {
  'use strict';

  // 根拠のない仮の既定値。コア部(L2 含む)がダイに占める比率 / L3 がダイに占める比率。実チップのフロアプランから出した値ではない。
  // 校正もしていない。推定面積は目安にすぎず、note に式と比率を必ず書く。
  const CORE_FRACTION = 0.4;
  const L3_FRACTION = 0.15;

  function designApi() {
    if (root.SDS && root.SDS.model && root.SDS.model.design) return root.SDS.model.design;
    if (typeof require === 'function') return require('./design.js');
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

  function findTable(areas, uarch, chipId, nodeId) {
    return (areas || []).find((a) => a.uarch === uarch && (a.chip == null || a.chip === chipId) && (a.nodeId == null || a.nodeId === nodeId)) || null;
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
      const totalCores = groups.reduce((t, g) => t + (g.count || 0), 0);
      const common = { sourceChip: p.name, sourcePresetId: p.id, vendor: p.vendor || null, isa: p.isa || null, nodeId, sourceMemory: (p.cfg && p.cfg.memory) || null };

      groups.forEach((g) => {
        const t = findTable(areas, g.uarch, p.id, nodeId);
        const u = uarchDb[g.uarch] || {};
        let area;
        if (t) {
          area = { mm2: t.noL2Mm2 == null ? null : t.noL2Mm2, withL2Mm2: t.withL2Mm2 == null ? null : t.withL2Mm2, l2KB: t.l2KB == null ? null : t.l2KB, s: t.s || null, origin: 'table', note: t.note || '' };
        } else if (dieKnown && totalCores > 0) {
          const mm2 = r3((cdie.mm2 * CORE_FRACTION) / totalCores);
          area = {
            mm2, withL2Mm2: null, l2KB: u.l2KB == null ? null : u.l2KB, s: 'sec', origin: 'estimated',
            note: `推定: ダイ面積 ${cdie.mm2} mm² × コア部の比率 ${CORE_FRACTION}(根拠のない仮の既定値)÷ コア総数 ${totalCores} = ${mm2} mm²。表(§2.3)に無いコア。P/E の区別なし(どの種別のコアも同じ面積)。L2 を含むかは不明`,
          };
        } else {
          area = { mm2: null, withL2Mm2: null, l2KB: u.l2KB == null ? null : u.l2KB, s: null, origin: 'unknown', note: cdie ? 'ダイ面積が未取得のためコア面積を推定できません' : 'ダイ情報がありません' };
        }
        parts.push(Object.assign({
          id: `core:${p.id}:${g.type}`, kind: 'core', label: `${g.uarch} コア(${p.name} の ${g.type})`, uarch: g.uarch, coreType: g.type,
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

  const api = { CORE_FRACTION, L3_FRACTION, build, get, search, computeDie, placeAreaMm2 };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.blocklib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
