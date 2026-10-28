// 互換性チェック(設計書 §3.3 C「混ぜるときの検証」)。UI に依存しない純関数。
// 戻り値は [{ level:'error'|'warn'|'info', code, text(日本語), blockId?, blockIds? }]。
// error = 配置不可(既定)、warn = 警告、info = 注記。読み込み順: 依存なし(nodes は引数で受ける)。
(function (root) {
  'use strict';

  const num = (x) => typeof x === 'number' && isFinite(x);
  const ISA_LABEL = { x86: 'x86', arm: 'Arm' };

  const nodeOf = (nodes, id) => (nodes || []).find((n) => n.id === id) || null;
  const densityOf = (n) => (n && n.density && num(n.density.v) && n.density.v > 0 ? n.density.v : null);

  // 密度の幅 [下限, 上限]。range が無ければ v だけ(幅 0)
  const densityRange = (n) => {
    const v = densityOf(n);
    if (!v) return null;
    const r = n.density.range;
    if (Array.isArray(r) && r.length === 2 && num(r[0]) && num(r[1]) && r[0] > 0 && r[1] >= r[0]) return [r[0], r[1]];
    return [v, v];
  };

  // 移植した面積。mm2 を fromNodeId のプロセスから toNodeId のプロセスへ密度比で換算する。
  //   面積' = 面積 × 密度(元) ÷ 密度(先)(同じ回路を作り直すと面積は密度に反比例)
  // 密度に幅(density.range)があるときは、**面積が大きくなる側(元の密度は上限、移植先の密度は下限)を保守的な値**として mm2 に採用し、
  // 幅は mm2Range:[小, 大]・ratioRange:[小, 大] で返す。ratio は mm2 に対応する(保守的な)比。幅が無ければ mm2Range=[mm2, mm2]。
  // どちらかの密度が未取得なら換算しない: { ok:false, mm2:null, ratio:null, reason }。
  // 注意: Intel と TSMC では密度の定義が違う(Intel は NAND2+scan FF の自社式)ので、会社をまたぐ換算は目安。note に書く。
  // 電力は C·V²·f の比で再計算する設計(§3.3 C)だが、混合設計には電力モデルがないため今回は面積だけ。
  function portArea(mm2, fromNodeId, toNodeId, nodes) {
    if (!num(mm2) || mm2 <= 0) return { ok: false, mm2: null, ratio: null, reason: '元の面積が未取得のため換算できません' };
    if (!fromNodeId || !toNodeId) return { ok: false, mm2: null, ratio: null, reason: '元または先のプロセスが未取得のため換算できません' };
    if (fromNodeId === toNodeId) return { ok: true, mm2, mm2Range: [mm2, mm2], ratio: 1, ratioRange: [1, 1], reason: null, note: null };
    const a = nodeOf(nodes, fromNodeId); const b = nodeOf(nodes, toNodeId);
    if (!a) return { ok: false, mm2: null, ratio: null, reason: `プロセス「${fromNodeId}」がデータにありません` };
    if (!b) return { ok: false, mm2: null, ratio: null, reason: `プロセス「${toNodeId}」がデータにありません` };
    const da = densityRange(a); const db = densityRange(b);
    if (!da) return { ok: false, mm2: null, ratio: null, reason: `${a.name} のトランジスタ密度が未取得のため換算できません` };
    if (!db) return { ok: false, mm2: null, ratio: null, reason: `${b.name} のトランジスタ密度が未取得のため換算できません` };
    const ratio = da[1] / db[0];                 // 面積が大きくなる側(保守的)
    const ratioMin = da[0] / db[1];              // 面積が小さくなる側
    const notes = [];
    if (ratio !== ratioMin) notes.push('密度に幅があるため、面積が大きくなる側(元は上限・先は下限)を採用しています');
    if ((a.vendor === 'Intel') !== (b.vendor === 'Intel')) notes.push('Intel と他社では密度の定義が違う(Intel は NAND2+scan FF の自社式)ため、換算した面積は目安です');
    if (a.densityNote || b.densityNote) notes.push('密度の値に幅・食い違いがあります(' + [a.densityNote && `${a.name}: ${a.densityNote}`, b.densityNote && `${b.name}: ${b.densityNote}`].filter(Boolean).join(' / ') + ')');
    notes.push('L2(SRAM)を含む面積にロジックの密度比を掛けているため、SRAM は縮み方がロジックより小さく、縮み方が過大になりうる');
    return { ok: true, mm2: mm2 * ratio, mm2Range: [mm2 * ratioMin, mm2 * ratio], ratio, ratioRange: [ratioMin, ratio], reason: null, note: notes.join('。') };
  }

  function allBlocks(design) {
    const out = [];
    (design.dies || []).forEach((d) => d.blocks.forEach((b) => out.push(Object.assign({ dieId: d.id }, b))));
    return out;
  }

  const designNodeId = (design) => (design.mix && design.mix.nodeId) || (design.dies && design.dies[0] && design.dies[0].nodeId) || design.nodeId || null;

  // ダイの使用率。ブロックの面積合計(面積が未取得のブロックは含めない)÷ ダイ面積。
  const RETICLE_MM2 = 858; // 単一ダイの露光上限(26×33 mm)。出典 URL 未取得[二次相当・要確認]

  function utilization(design) {
    const die = (design.dies || [])[0];
    const dieMm2 = die ? (num(die.areaMm2) ? die.areaMm2 : die.widthMm * die.heightMm) : null;
    let used = 0; let usedMin = 0; let unknown = 0;
    // 導出(範囲)の面積のブロックは、使用率の大きい側(areaMm2)と小さい側(範囲の下限)を併記する
    allBlocks(design).forEach((b) => {
      if (num(b.areaMm2)) { used += b.areaMm2; usedMin += b.areaOrigin === 'derived' && Array.isArray(b.areaRangeMm2) && num(b.areaRangeMm2[0]) ? b.areaRangeMm2[0] : b.areaMm2; } else unknown++;
    });
    return { dieMm2, usedMm2: used, usedMinMm2: usedMin, ratio: dieMm2 > 0 ? used / dieMm2 : null, ratioMin: dieMm2 > 0 ? usedMin / dieMm2 : null, unknownCount: unknown };
  }

  // メモリ種別の粗い判定(プリセットの cfg.memory 文字列から)。判定できなければ空集合
  function memoryTypes(s) {
    const set = new Set();
    if (typeof s !== 'string') return set;
    if (/LPDDR5X/i.test(s)) set.add('LPDDR5X');
    if (/LPDDR5(?!X)/i.test(s)) set.add('LPDDR5');
    if (/LPDDR4/i.test(s)) set.add('LPDDR4');
    if (/(^|[^P])DDR5/i.test(s)) set.add('DDR5');
    if (/(^|[^P])DDR4/i.test(s)) set.add('DDR4');
    return set;
  }

  function check(design, parts, nodes) {
    const out = [];
    const blocks = allBlocks(design);
    const partOf = (b) => (parts || []).find((p) => p.id === b.partId) || null;
    const toNode = designNodeId(design);
    const toN = nodeOf(nodes, toNode);

    // (a) 命令セットの混在 = error(配置不可。既定)
    const coreBlocks = blocks.filter((b) => b.kind === 'core');
    const isaOf = (b) => b.isa || (partOf(b) && partOf(b).isa) || null;
    const isas = [];
    coreBlocks.forEach((b) => { const i = isaOf(b); if (i && !isas.includes(i)) isas.push(i); });
    if (isas.length > 1) {
      const minor = coreBlocks.find((b) => isaOf(b) !== isas[0]);
      out.push({ level: 'error', code: 'isa-mix', blockId: minor ? minor.id : undefined, blockIds: coreBlocks.filter((b) => isaOf(b) !== isas[0]).map((b) => b.id), text: `命令セットが混在しています(${isas.map((i) => ISA_LABEL[i] || i).join(' と ')})。x86 と Arm のコアは同じチップに配置できません` });
    }

    // (b) プロセスの違い = 移植(warn)
    const byPart = new Map();
    blocks.forEach((b) => {
      const from = b.fromNodeId || (partOf(b) && partOf(b).nodeId) || null;
      if (!b.partId || !from || !toNode || from === toNode) return;
      const k = `${b.partId}`;
      if (!byPart.has(k)) byPart.set(k, { from, ids: [], label: b.label });
      byPart.get(k).ids.push(b.id);
    });
    byPart.forEach((v, partId) => {
      const fromN = nodeOf(nodes, v.from);
      const pa = portArea(1, v.from, toNode, nodes);
      const rr = (x) => Math.round(x * 1000) / 1000;
      const detail = pa.ok ? `面積は密度比で再計算(保守的な値で ×${rr(pa.ratio)}${pa.ratioRange[0] !== pa.ratioRange[1] ? `。幅 ×${rr(pa.ratioRange[0])}〜${rr(pa.ratioRange[1])}` : ''})、電力は C·V²·f の比で再計算が必要(今回は電力を評価しない)` : `面積は換算していません(${pa.reason})`;
      out.push({ level: 'warn', code: 'ported', blockId: v.ids[0], blockIds: v.ids, partId, text: `移植: ${v.label} ${v.ids.length} 個は元のプロセス(${fromN ? fromN.name : v.from})と設計のプロセス(${toN ? toN.name : toNode})が違います。${detail}${pa.note ? `。${pa.note}` : ''}` });
    });
    // 元プロセスが未取得の部品 = 移植かどうか判定できない
    const noNode = blocks.filter((b) => b.partId && !(b.fromNodeId || (partOf(b) && partOf(b).nodeId)));
    if (noNode.length) out.push({ level: 'warn', code: 'node-unknown', blockId: noNode[0].id, blockIds: noNode.map((b) => b.id), text: `${noNode.length} 個の部品は元のプロセスが未取得のため、移植かどうか判定できません` });

    // (c) 面積が未取得の部品
    const unk = blocks.filter((b) => !num(b.areaMm2));
    if (unk.length) out.push({ level: 'warn', code: 'area-unknown', blockId: unk[0].id, blockIds: unk.map((b) => b.id), text: `面積が未取得の部品が ${unk.length} 個あります(使用率・ダイに入るかの判定に含めていません。ブロックの大きさは仮の寸法です)` });
    const est = blocks.filter((b) => b.areaOrigin === 'estimated');
    if (est.length) out.push({ level: 'info', code: 'area-estimated', blockId: est[0].id, blockIds: est.map((b) => b.id), text: `${est.length} 個の部品は面積が推定です(ダイ面積に仮の比率を掛けた値。実チップの面積ではありません)` });

    // (d) ダイに入りきらない
    const u = utilization(design);
    if (u.dieMm2 > 0 && u.usedMm2 > u.dieMm2 + 1e-9) out.push({ level: 'error', code: 'die-overflow', text: `ブロックの合計面積 ${Math.round(u.usedMm2 * 100) / 100} mm² がダイ面積 ${Math.round(u.dieMm2 * 100) / 100} mm² を超えています` });
    const ranged = u.ratio != null && u.usedMinMm2 < u.usedMm2 - 1e-9;
    if (u.ratio != null) out.push({ level: 'info', code: 'utilization', value: u.ratio, valueMin: u.ratioMin, usedMm2: u.usedMm2, usedMinMm2: u.usedMinMm2, dieMm2: u.dieMm2, text: `ダイの使用率 ${Math.round(u.ratio * 1000) / 10}%(${Math.round(u.usedMm2 * 100) / 100} / ${Math.round(u.dieMm2 * 100) / 100} mm²)${ranged ? `。自作コアの面積が範囲のため、小さい側では ${Math.round(u.ratioMin * 1000) / 10}%(${Math.round(u.usedMinMm2 * 100) / 100} mm²)` : ''}` });
    // 露光上限(エラーにはしない。計算は続ける)。ちょうど 858 mm² は出さない
    if (u.dieMm2 > RETICLE_MM2 + 1e-9) out.push({ level: 'warn', code: 'reticle', text: `単一ダイの露光上限(約 ${RETICLE_MM2} mm²)を超えています。チップレット分割は未対応です` });

    // (f) メモリ種別がチップ間で食い違う(判定できないチップは除く。共通の種別がなければ警告)
    const mems = new Map();
    blocks.forEach((b) => {
      const pid = b.sourcePresetId || (partOf(b) && partOf(b).sourcePresetId);
      if (!pid || mems.has(pid)) return;
      const p = partOf(b);
      const types = memoryTypes((p && p.sourceMemory) || b.sourceMemory);
      if (types.size) mems.set(pid, { chip: b.sourceChip || (p && p.sourceChip) || pid, types });
    });
    if (mems.size >= 2) {
      const list = [...mems.values()];
      const common = [...list[0].types].filter((t) => list.every((m) => m.types.has(t)));
      if (!common.length) out.push({ level: 'warn', code: 'memory-mismatch', text: `メモリ種別が元のチップ間で食い違っています(${list.map((m) => `${m.chip}: ${[...m.types].join('/')}`).join('、')})。メモリコントローラの整合を確認してください` });
    }

    // (e) 混合による性能低下は入れない
    out.push({ level: 'info', code: 'no-mix-penalty', text: '混合による性能低下は反映していません(今回の評価は CPU ベンチのみ)' });
    return out;
  }

  const api = { RETICLE_MM2, check, portArea, utilization, memoryTypes, designNodeId };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.compat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
