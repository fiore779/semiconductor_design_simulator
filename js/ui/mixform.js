// 混合設計(モード C)の画面用の純関数(設計書 §3.3 C・§8.7)。DOM に依存しない。Node でテストする。
// 部品の絞り込み・面積バッジの文言・追加前の互換性の事前チェック・ダイ寸法の入力解釈・履歴ラベル・部品グループの一覧。
(function (root) {
  'use strict';

  const DIE_MIN_MM = 1; const DIE_MAX_MM = 100;
  const DEFAULT_DIE_MM = 12;
  const ISA_LABEL = { x86: 'x86', arm: 'Arm' };
  const KIND_LABEL = { core: 'コア', l3: 'L3', gpu: 'GPU', uncore: 'uncore' };
  const KIND_OPTIONS = [['', 'すべて'], ['core', 'コア'], ['l3', 'L3'], ['gpu', 'GPU'], ['uncore', 'uncore']];
  const ISA_OPTIONS = [['', 'すべて'], ['x86', 'x86'], ['arm', 'Arm']];
  // 面積の区分の表示名(blocklib の origin と、評価の class('ported' を含む))
  const AREA_CLASS_LABEL = { table: '表', estimated: '推定', unknown: '未取得', ported: '移植', mixed: '混在', derived: '導出(範囲)' };
  const SCHEMATIC_NOTE = 'ブロックの大きさは模式図です。面積は部品の値で、ブロックの大きさを変えても面積は変わりません';
  const ESTIMATE_NOTE = '推定は「ダイ面積 × 仮の比率」で出した目安です(比率は根拠のない仮の値)';

  const num = (x) => typeof x === 'number' && isFinite(x);
  const r2 = (x) => Math.round(x * 100) / 100;
  const norm = (s) => String(s == null ? '' : s).replace(/[０-９．]/g, (c) => (c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xFEE0))).trim();

  // ---- 絞り込み ----
  // q: { isa, vendor, kind, text }。空・未指定の条件は無視。text は名称・元のチップ・マイクロアーキ・コア種別の部分一致(大文字小文字を区別しない)
  function filterParts(parts, q) {
    const o = q || {};
    const t = o.text ? norm(o.text).toLowerCase() : '';
    return (parts || []).filter((p) => {
      if (o.isa && p.isa !== o.isa) return false;
      if (o.vendor && p.vendor !== o.vendor) return false;
      if (o.kind && p.kind !== o.kind) return false;
      if (t && ![p.label, p.sourceChip, p.uarch, p.coreType, partName(p)].some((s) => s && String(s).toLowerCase().includes(t))) return false;
      return true;
    });
  }
  function vendorsOf(parts) {
    return [...new Set((parts || []).map((p) => p.vendor).filter(Boolean))].sort();
  }

  // ---- 部品の表示 ----
  // 名称。コア: 「Zen 5 コア(AMD Ryzen 7 9700X)」。それ以外は部品のラベルをそのまま
  function partName(p) {
    if (!p) return '';
    if (p.kind === 'core') return `${p.uarch || 'コア'} コア(${p.sourceChip || '出所不明'})`;
    return p.label || p.id || '';
  }
  // 置くときの面積(コアは L2 込みがあればそれ)。不明なら null
  function placeAreaMm2(p) {
    const a = p && p.area;
    if (!a) return null;
    if (p.kind === 'core') return num(a.withL2Mm2) ? a.withL2Mm2 : num(a.mm2) ? a.mm2 : null;
    return num(a.mm2) ? a.mm2 : null;
  }
  // 面積バッジ: { cls:'table'|'estimated'|'unknown', label:'表'|'推定'|'未取得', text:'表 12.3 mm²', mm2, note }
  function areaBadge(p) {
    const origin = p && p.area && p.area.origin;
    const cls = origin === 'table' || origin === 'estimated' ? origin : 'unknown';
    const mm2 = cls === 'unknown' ? null : placeAreaMm2(p);
    const label = AREA_CLASS_LABEL[cls];
    const unit = p && p.kind === 'l3' ? ` (${p.capacityMB} MB 時)` : '';
    const text = mm2 == null ? '面積 未取得' : `${label} ${r2(mm2)} mm²${unit}`;
    return { cls: mm2 == null ? 'unknown' : cls, label: mm2 == null ? AREA_CLASS_LABEL.unknown : label, text, mm2, note: cls === 'estimated' ? ESTIMATE_NOTE : (p && p.area && p.area.note) || '' };
  }
  // 評価の区分('table'|'estimated'|'unknown'|'ported'|'mixed')の表示名
  const areaClassLabel = (c) => AREA_CLASS_LABEL[c] || '未取得';
  // 面積の区分は 2 軸: 出所(table / estimated / unknown)と、移植の換算の有無(portConverted)。
  // 数え方: table / estimated / unknown は出所で数え、ported は換算したブロックの数(出所とは別に数える。推定かつ移植のブロックは両方に入る)
  function areaClassCounts(blocks) {
    const c = { table: 0, estimated: 0, unknown: 0, derived: 0, ported: 0 };
    (blocks || []).forEach((b) => {
      const cls = b.class === 'table' || b.class === 'estimated' || b.class === 'derived' ? b.class : 'unknown';
      c[cls]++;
      if (b.portConverted || b.class === 'ported') c.ported++;
    });
    return c;
  }
  // 出所の区分 + 移植なら「・移植」(例: 推定・移植)
  const areaClassText = (cls, ported) => areaClassLabel(cls) + (ported ? '・移植' : '');
  // 移植の換算の説明(ブロック 1 個): 「元 7.43 mm² × 0.696 → 5.17 mm²(幅 4.14〜5.17。目安)」。換算していなければ null
  function portLine(b) {
    if (!b || !b.portConverted) return null;
    const now = num(b.areaMm2) ? b.areaMm2 : b.mm2; // 設計のブロックは areaMm2、評価のブロックは mm2
    if (!num(b.areaFromMm2) || !num(now)) return null;
    const range = Array.isArray(b.areaRangeMm2) && b.areaRangeMm2.length === 2 && r2(b.areaRangeMm2[0]) !== r2(b.areaRangeMm2[1]) ? `幅 ${r2(b.areaRangeMm2[0])}〜${r2(b.areaRangeMm2[1])}。` : '';
    const ratio = num(b.portRatio) ? ` × ${Math.round(b.portRatio * 1000) / 1000}` : '';
    return `元 ${r2(b.areaFromMm2)} mm²${ratio} → ${r2(now)} mm²(${range}目安)`;
  }

  // ---- 追加前の互換性の事前チェック ----
  // 設計にあるコアの命令セットと、これから置く部品の命令セットが違うなら error(design.addPart が断る。追加前に画面で知らせる)。
  // 戻り値: [{ level, code, text }]。プロセスが違えば warn(移植)。
  function preCheck(design, part, nodes) {
    const out = [];
    if (!design || !part) return out;
    const blocks = [];
    (design.dies || []).forEach((d) => (d.blocks || []).forEach((b) => blocks.push(b)));
    if (part.kind === 'core' && part.isa) {
      const have = [];
      blocks.forEach((b) => { if (b.kind === 'core' && b.isa && !have.includes(b.isa)) have.push(b.isa); });
      const other = have.filter((i) => i !== part.isa);
      if (other.length) {
        out.push({ level: 'error', code: 'isa-mix', text: `追加できません: ${other.map((i) => ISA_LABEL[i] || i).join('・')} のコアがある設計に ${ISA_LABEL[part.isa] || part.isa} のコアは追加できません(x86 と Arm のコアは同じ設計に混在できません)` });
      }
    }
    const toNode = (design.mix && design.mix.nodeId) || (design.dies && design.dies[0] && design.dies[0].nodeId) || null;
    if (part.nodeId && toNode && part.nodeId !== toNode) {
      const nm = (id) => { const n = (nodes || []).find((x) => x.id === id); return n ? n.name : id; };
      out.push({ level: 'warn', code: 'ported', text: `元のプロセス(${nm(part.nodeId)})と設計のプロセス(${nm(toNode)})が違うため、移植として面積を密度比で換算します(目安)` });
    }
    return out;
  }

  // ---- ダイ寸法 ----
  function sizeMessage(label, v) {
    if (v < DIE_MIN_MM || v > DIE_MAX_MM) return `ダイの${label}は ${DIE_MIN_MM}〜${DIE_MAX_MM} mm の数にしてください`;
    return null;
  }
  // 入力文字列 → { ok:true, w, h } か { ok:false, reason }。check(w,h) があれば(design.checkDieSize)それを先に使う
  function parseDieSize(wStr, hStr, check) {
    const one = (s, label) => {
      const t = norm(s);
      if (t === '') return { reason: `ダイの${label}を入力してください` };
      if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return { reason: `ダイの${label}は数字で入力してください` };
      return { v: Number(t) };
    };
    const w = one(wStr, '幅'); if (w.reason) return { ok: false, reason: w.reason };
    const h = one(hStr, '高さ'); if (h.reason) return { ok: false, reason: h.reason };
    const bad = typeof check === 'function' ? check(w.v, h.v) : (sizeMessage('幅', w.v) || sizeMessage('高さ', h.v));
    if (bad) return { ok: false, reason: bad };
    return { ok: true, w: w.v, h: h.v };
  }
  // L3 容量(0 より大きく 512 MB 以下)
  function parseCapacity(str) {
    const t = norm(str).replace(/\s*mb$/i, '');
    if (t === '') return { ok: false, reason: '容量を入力してください' };
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return { ok: false, reason: '容量は数字で入力してください' };
    const v = Number(t);
    if (!(v > 0 && v <= 512)) return { ok: false, reason: 'L3 の容量は 0 より大きく 512 MB 以下の数にしてください' };
    return { ok: true, value: v };
  }
  // 個数(コア。1〜64 の整数)
  function parseCount(str) {
    const t = norm(str);
    if (t === '') return { ok: false, reason: '個数を入力してください' };
    if (!/^\d+(\.\d*)?$/.test(t)) return { ok: false, reason: '個数は数字で入力してください' };
    const v = Number(t);
    if (!Number.isInteger(v)) return { ok: false, reason: '個数は整数にしてください(小数は使えません)' };
    if (v < 1 || v > 64) return { ok: false, reason: '個数は 1〜64 の整数にしてください' };
    return { ok: true, value: v };
  }

  // ---- 履歴ラベル(coalesce しない 1 手) ----
  function addLabel(part, count, capacityMB) {
    if (part.kind === 'core') return `${part.uarch || 'コア'} コアを ${count} 個追加`;
    if (part.kind === 'l3') return `L3 ${capacityMB != null ? capacityMB : part.capacityMB}MB を追加`;
    return `${part.label || part.id} を追加`;
  }
  const dieSizeLabel = (w, h) => `ダイ寸法を ${w}×${h} mm に変更`;
  const clockLabel = (name, ghz) => `${name} のクロックを ${ghz} GHz に変更`;
  const removeLabel = (name) => `${name} を削除`;

  // ---- 部品の一覧(混合パネル用) ----
  // コアは (出所プリセット, コア種別) でグループ化(groupId は design.setBlockClock の指定と同じ「プリセット id:coreType」)。
  // それ以外(L3・GPU・uncore)は 1 ブロック 1 行。戻り値: [{ key, groupId|null, kind, name, sourceChip, count, clockGHz|null, blockIds, areaMm2|null, areaClass }]
  function blockGroups(design) {
    const rows = []; const idx = new Map();
    ((design && design.dies) || []).forEach((d) => (d.blocks || []).forEach((b) => {
      const cls = !num(b.areaMm2) ? 'unknown' : (b.areaOrigin === 'table' || b.areaOrigin === 'estimated' || b.areaOrigin === 'derived' ? b.areaOrigin : 'unknown');
      const conv = num(b.areaMm2) && !!b.ported && !!b.portConverted;
      if (b.kind === 'core') {
        const gid = `${b.sourcePresetId || 'x'}:${b.coreType}`;
        let r = idx.get(gid);
        if (!r) {
          r = { key: gid, groupId: gid, kind: 'core', name: b.label, sourceChip: b.sourceChip || null, count: 0, clockGHz: num(b.clockGHz) ? b.clockGHz : null, blockIds: [], areaMm2: 0, areaKnown: true, areaClass: cls, portedCount: 0, portLines: [] };
          idx.set(gid, r); rows.push(r);
        }
        r.count++; r.blockIds.push(b.id);
        if (conv) { r.portedCount++; if (!r.portLines.length) r.portLines.push(portLine(b)); }
        if (num(b.areaMm2)) r.areaMm2 += b.areaMm2; else r.areaKnown = false;
        if (cls !== r.areaClass) r.areaClass = r.areaClass === 'unknown' ? cls : (cls === 'unknown' ? r.areaClass : 'mixed');
      } else {
        rows.push({ key: b.id, groupId: null, kind: b.kind, name: b.label, sourceChip: b.sourceChip || null, count: 1, clockGHz: null, blockIds: [b.id], areaMm2: num(b.areaMm2) ? b.areaMm2 : 0, areaKnown: num(b.areaMm2), areaClass: cls, portedCount: conv ? 1 : 0, portLines: conv ? [portLine(b)] : [] });
      }
    }));
    rows.forEach((r) => { if (!r.areaKnown && r.kind === 'core' && r.areaMm2 === 0) r.areaMm2 = null; if (!r.areaKnown && r.kind !== 'core') r.areaMm2 = null; });
    return rows;
  }

  // 使用率の説明文
  function utilizationText(mix) {
    if (!mix || mix.utilization == null) return '使用率: 算出できません';
    const base = `使用率 ${Math.round(mix.utilization * 1000) / 10}%(ブロック合計 ${r2(mix.usedMm2)} / ダイ ${r2(mix.dieMm2)} mm²)`;
    const parts = [base];
    // 自作コアの面積が範囲のとき: 上の値は大きい側。小さい側も併記する
    if (num(mix.utilizationMin) && num(mix.usedMinMm2) && mix.usedMinMm2 < mix.usedMm2 - 1e-9) parts.push(`自作コアの面積が範囲のため、上は大きい側。小さい側では ${Math.round(mix.utilizationMin * 1000) / 10}%(${r2(mix.usedMinMm2)} mm²)`);
    if (mix.unknownCount) parts.push(`面積が未取得の部品 ${mix.unknownCount} 個は含みません`);
    if (mix.portedCount) parts.push(`うち移植 ${mix.portedCount} 個は換算値(目安)`);
    return parts.join('。');
  }

  const api = {
    DIE_MIN_MM, DIE_MAX_MM, DEFAULT_DIE_MM, ISA_OPTIONS, KIND_OPTIONS, KIND_LABEL, ISA_LABEL, ESTIMATE_NOTE, SCHEMATIC_NOTE,
    filterParts, vendorsOf, partName, placeAreaMm2, areaBadge, areaClassLabel, areaClassCounts, areaClassText, portLine, preCheck,
    parseDieSize, parseCapacity, parseCount, addLabel, dieSizeLabel, clockLabel, removeLabel, blockGroups, utilizationText,
  };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.mixform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
