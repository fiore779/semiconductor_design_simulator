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
  // q: { isa, vendor, kind, text }。空・未指定の条件は無視。opts: { nodes: [{ id, name }] }(省略可。プロセス名でも探す)
  // text は空白(半角・全角)で分けた全語の AND。名称・元のチップ・マイクロアーキ・コア種別・メーカー・命令セット・種類・プロセスの部分一致
  // (NFKC で正規化し、大文字小文字を区別しない。正規表現は使わない)
  const MAX_TOKENS = 8; const MAX_QUERY_CHARS = 200;
  const fold = (s) => String(s == null ? '' : s).normalize('NFKC').toLowerCase();
  function searchTokens(text) {
    if (text == null) return [];
    const t = fold(String(text).slice(0, MAX_QUERY_CHARS));
    return t.split(/[\s　]+/).filter(Boolean).slice(0, MAX_TOKENS);
  }
  function searchHaystack(p, nodes) {
    const node = p.nodeId ? (nodes || []).find((n) => n && n.id === p.nodeId) : null;
    return fold([p.label, p.sourceChip, p.uarch, p.coreType, partName(p), p.vendor, p.isa, ISA_LABEL[p.isa], p.kind, KIND_LABEL[p.kind], p.nodeId, node ? node.name : '']
      .map((s) => (s == null ? '' : s)).join('\n'));
  }
  function filterParts(parts, q, opts) {
    const o = q || {};
    const tokens = searchTokens(o.text);
    const nodes = opts && opts.nodes;
    return (parts || []).filter((p) => {
      if (o.isa && p.isa !== o.isa) return false;
      if (o.vendor && p.vendor !== o.vendor) return false;
      if (o.kind && p.kind !== o.kind) return false;
      if (tokens.length) {
        const hay = searchHaystack(p, nodes);
        if (!tokens.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }
  // text を tokens の一致部分で分ける: [{ text, hit }]。連結すると元の text に戻る。NFKC は掛けない(位置を保つため)
  function highlightSegments(text, tokens) {
    const s = text == null ? '' : String(text);
    if (!s) return [];
    const toks = (tokens || []).filter(Boolean);
    const low = s.toLowerCase();
    if (!toks.length || low.length !== s.length) return [{ text: s, hit: false }];
    const ranges = [];
    toks.forEach((t) => {
      let i = low.indexOf(t);
      while (i >= 0) { ranges.push([i, i + t.length]); i = low.indexOf(t, i + t.length); }
    });
    if (!ranges.length) return [{ text: s, hit: false }];
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [ranges[0].slice()];
    for (let k = 1; k < ranges.length; k++) {
      const last = merged[merged.length - 1];
      if (ranges[k][0] <= last[1]) last[1] = Math.max(last[1], ranges[k][1]); else merged.push(ranges[k].slice());
    }
    const out = []; let pos = 0;
    merged.forEach(([a, b]) => {
      if (a > pos) out.push({ text: s.slice(pos, a), hit: false });
      out.push({ text: s.slice(a, b), hit: true });
      pos = b;
    });
    if (pos < s.length) out.push({ text: s.slice(pos), hit: false });
    return out;
  }
  // 名称に全語が入る部品を先に並べる(安定整列。元の配列は変えない)
  function relevanceSort(parts, tokens) {
    const arr = (parts || []).slice();
    const toks = (tokens || []).filter(Boolean);
    if (!toks.length) return arr;
    // 順位: 0 = 検索語全体(空白を保った連続した語句)が名前・uarch に含まれる / 1 = 全語が語頭で一致 / 2 = 全語が名前に部分一致 / 3 = それ以外。同順位は元の順
    const phrase = toks.join(' ');
    const isWord = (c) => /[a-z0-9]/.test(c);
    const atWordStart = (n, t) => {
      const digits = /^\d+$/.test(t);
      for (let i = n.indexOf(t); i >= 0; i = n.indexOf(t, i + 1)) {
        if (i > 0 && isWord(n[i - 1])) continue;
        if (digits && i + t.length < n.length && /\d/.test(n[i + t.length])) continue; // 数字は他の数字列の途中に当たるだけなら不一致
        return true;
      }
      return false;
    };
    // 語句全体の連続一致。開始位置が語頭のものだけ(「Ryzen 5」の中の「zen 5」は数えない)
    // 数字だけの語句は、一致の直後が数字なら一致としない(「5」が「5800X」に当たらない)
    const phraseDigits = /^\d+$/.test(phrase);
    const phraseAtWordStart = (n) => {
      for (let i = n.indexOf(phrase); i >= 0; i = n.indexOf(phrase, i + 1)) {
        if (i > 0 && isWord(n[i - 1])) continue;
        if (phraseDigits && i + phrase.length < n.length && /\d/.test(n[i + phrase.length])) continue;
        return true;
      }
      return false;
    };
    const rank = (p) => {
      const n = fold(partName(p)); const u = fold(p.uarch);
      if (phraseAtWordStart(n) || (u && phraseAtWordStart(u))) return 0;
      if (toks.every((t) => atWordStart(n, t))) return 1;
      if (toks.every((t) => n.includes(t))) return 2;
      return 3;
    };
    const keyed = arr.map((p, i) => ({ p, i, r: rank(p) }));
    keyed.sort((a, b) => a.r - b.r || a.i - b.i);
    return keyed.map((k) => k.p);
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

  // 追加できる(事前チェックに error が無い)か。一覧の絞り込み(「追加できるものだけ」)に使う
  const isAddable = (design, part, nodes) => !preCheck(design, part, nodes).some((x) => x.level === 'error');
  // 追加できない理由の短文(一覧の 1 行用)。error が無ければ null。原文は preCheck の text(title に残す)
  function addBlockReason(design, part, nodes) {
    const err = preCheck(design, part, nodes).find((x) => x.level === 'error');
    if (!err) return null;
    if (err.code !== 'isa-mix') return err.text;
    const have = [];
    ((design && design.dies) || []).forEach((d) => (d.blocks || []).forEach((b) => { if (b.kind === 'core' && b.isa && !have.includes(b.isa)) have.push(b.isa); }));
    return `命令セットが違うため追加不可(この設計は ${have.map((i) => ISA_LABEL[i] || i).join('・')})`;
  }

  // ---- 部品ライブラリの件数・0 件の文 ----
  // info: { matched, total, visible, hasCondition, addableOnly, hiddenByAddable }
  function libCountText(info) {
    const i = info || {};
    const more = i.matched > i.visible ? `・先頭 ${i.visible} 件を表示` : '';
    let s;
    if (i.matched === 0) s = `0 件が該当(全 ${i.total} 件)`;
    else if (i.hasCondition) s = `${i.matched} 件が該当(全 ${i.total} 件)${more}`;
    else s = `全 ${i.total} 件${more}`;
    if (i.hiddenByAddable > 0) s += `・追加できない ${i.hiddenByAddable} 件を除く`;
    return s;
  }
  // 0 件のときの案内。q: { isa, vendor, kind, text }
  function emptyText(q, addableOnly) {
    const o = q || {};
    const text = String(o.text == null ? '' : o.text).trim();
    let s = text ? `「${text}」に一致する部品はありません。` : 'この条件に合う部品はありません。';
    const f = [];
    if (o.isa) f.push(`命令セット=${ISA_LABEL[o.isa] || o.isa}`);
    if (o.vendor) f.push(`メーカー=${o.vendor}`);
    if (o.kind) f.push(`種類=${KIND_LABEL[o.kind] || o.kind}`);
    if (f.length) s += `絞り込み: ${f.join(' / ')}。`;
    if (addableOnly) s += '「追加できるものだけ」も有効です。';
    return s;
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
    filterParts, searchTokens, highlightSegments, relevanceSort, isAddable, addBlockReason, libCountText, emptyText, vendorsOf, partName, placeAreaMm2, areaBadge, areaClassLabel, areaClassCounts, areaClassText, portLine, preCheck,
    parseDieSize, parseCapacity, parseCount, addLabel, dieSizeLabel, clockLabel, removeLabel, blockGroups, utilizationText,
  };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.mixform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
