// 設計データ(設計書 §7)。プリセットから「ダイ+ブロック」の編集用データを作る。UI・WebGL に依存しない純関数。
//
// 注意: プリセットにはコア別・ブロック別の面積(§2.3)がほとんど無いので、**ブロックの大きさと配置は模式図**
// (コアはダイの面積を等分、L3 は容量に比例した帯)。実チップのフロアプランではない。各ブロックに
// `schematic: true` を付け、UI は「模式図」と明示する。ダイ全体の面積は実測/公表/二次の区分つきで保持する。
(function (root) {
  'use strict';

  const SCHEMA = 1;
  const ASPECT = 1.4; // ダイの縦横比(面積から幅×高さを作るための仮の値。実チップの寸法ではない)
  const GAP_MM = 2;   // ダイ間の隙間(表示用)

  // ダイの役割を名前から推定する(模式図の割り当て用)
  function dieRole(name) {
    if (/gpu/i.test(name)) return 'gpu';
    if (/soc|platform|\bio\b|iod|base|pct|コントローラ/i.test(name)) return 'uncore';
    return 'compute';
  }

  // 面積 mm² から幅・高さ(表示用の仮の寸法)
  function dieSize(mm2) {
    const w = Math.sqrt(mm2 * ASPECT);
    return { widthMm: w, heightMm: mm2 / w };
  }

  // コアを格子に敷き詰める。ダイの内側(余白 mrg)に、下側 l3Frac を L3 に使う。
  function layoutCompute(die, cores, l3MB) {
    const blocks = [];
    const mrg = Math.min(die.widthMm, die.heightMm) * 0.06;
    const innerW = die.widthMm - mrg * 2;
    const innerH = die.heightMm - mrg * 2;
    const l3Frac = l3MB ? Math.min(0.3, 0.1 + l3MB / 400) : 0;
    const coreH = innerH * (1 - l3Frac);
    const list = [];
    cores.forEach((g) => { for (let i = 0; i < g.count; i++) list.push(g); });
    const n = list.length || 1;
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * innerW) / Math.max(coreH, 1e-6))));
    const rows = Math.ceil(n / cols);
    const cw = innerW / cols; const ch = coreH / rows;
    const gap = Math.min(cw, ch) * 0.08;
    list.forEach((g, i) => {
      blocks.push({
        id: `${die.id}-core-${i}`, kind: 'core', coreType: g.type, uarch: g.uarch || null, label: `${g.type}`,
        x: mrg + (i % cols) * cw + gap / 2, y: mrg + Math.floor(i / cols) * ch + gap / 2, w: cw - gap, h: ch - gap, schematic: true,
      });
    });
    if (l3MB) blocks.push({ id: `${die.id}-l3`, kind: 'l3', label: `L3 ${l3MB}MB`, x: mrg, y: mrg + coreH, w: innerW, h: innerH * l3Frac - mrg * 0.2, schematic: true });
    return blocks;
  }

  function oneBlock(die, kind, label) {
    const m = Math.min(die.widthMm, die.heightMm) * 0.06;
    return [{ id: `${die.id}-${kind}`, kind, label, x: m, y: m, w: die.widthMm - m * 2, h: die.heightMm - m * 2, schematic: true }];
  }

  // プリセット → 設計。面積が未取得のダイは areaKnown:false の仮寸法(10×10mm)で置く。
  function fromPreset(preset, opts) {
    const o = opts || {};
    const dies = []; let cursorX = 0;
    const srcDies = (preset.dies && preset.dies.length) ? preset.dies : [{ name: preset.name, mm2: null, s: null, nodeId: null }];
    const roles = srcDies.map((d) => dieRole(d.name));
    let computeIdx = roles.indexOf('compute');
    if (computeIdx < 0) computeIdx = 0;
    srcDies.forEach((sd, i) => {
      const known = typeof sd.mm2 === 'number';
      const size = known ? dieSize(sd.mm2) : { widthMm: 10, heightMm: 10 };
      const die = {
        id: `die${i}`, name: sd.name, nodeId: sd.nodeId || null, areaMm2: known ? sd.mm2 : null, areaSource: known ? sd.s : null,
        areaKnown: known, areaNote: sd.note || null, x: cursorX, y: 0, widthMm: size.widthMm, heightMm: size.heightMm, blocks: [],
      };
      cursorX += die.widthMm + GAP_MM;
      if (i === computeIdx) die.blocks = layoutCompute(die, (preset.cfg && preset.cfg.cores) || [], preset.cfg && preset.cfg.l3MB);
      else if (roles[i] === 'gpu') die.blocks = oneBlock(die, 'gpu', 'GPU');
      else die.blocks = oneBlock(die, 'uncore', 'SoC / I/O');
      dies.push(die);
    });
    return {
      schema: SCHEMA, name: o.name || preset.name,
      origin: { mode: o.mode || 'reproduce', base: preset.id, parts: [] },
      presetId: preset.id, substrate: o.substrate || 'organic', cooling: o.cooling || null, dies,
    };
  }

  const clone = (d) => JSON.parse(JSON.stringify(d));

  // 検証: ブロックのダイ外はみ出し・重なり(§9 の DRC 風)。戻り値は警告の配列。
  function validate(design) {
    const warns = [];
    design.dies.forEach((die) => {
      const bs = die.blocks;
      bs.forEach((b) => {
        if (b.x < -1e-6 || b.y < -1e-6 || b.x + b.w > die.widthMm + 1e-6 || b.y + b.h > die.heightMm + 1e-6) warns.push({ level: 'error', dieId: die.id, blockId: b.id, text: `${b.label}: ダイの外にはみ出しています` });
      });
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i]; const b = bs[j];
        if (a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6) warns.push({ level: 'warn', dieId: die.id, blockId: a.id, text: `${a.label} と ${b.label} が重なっています` });
      }
    });
    return warns;
  }

  function serialize(design) { return JSON.stringify(design); }
  function parse(text) {
    let d; try { d = JSON.parse(text); } catch (e) { return { ok: false, reason: 'JSON として読めません' }; }
    if (!d || d.schema !== SCHEMA || !Array.isArray(d.dies)) return { ok: false, reason: '形式が違います(schema または dies がありません)' };
    const bad = checkShape(d);
    if (bad) return { ok: false, reason: bad };
    return { ok: true, design: d };
  }

  // 形式の検証(読み込んだ設計が validate/評価/描画で壊れないように)。問題があれば日本語の理由、なければ null
  const MAX_DIES = 16; const MAX_BLOCKS = 500;
  const MAX_SIZE_MM = 1000; // 寸法の上限(これを超えると描画が崩れる。実チップは最大でも 100 mm 台)
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  function checkShape(d) {
    if (typeof d.name !== 'string') return '名前がありません(name が文字列ではありません)';
    if (d.dies.length > MAX_DIES) return `ダイが多すぎます(${d.dies.length} 個。上限 ${MAX_DIES})`;
    const ids = new Set(); let total = 0;
    for (let i = 0; i < d.dies.length; i++) {
      const die = d.dies[i]; const t = `ダイ ${i + 1}`;
      if (!die || typeof die !== 'object' || Array.isArray(die)) return `${t}: 形式が違います`;
      if (typeof die.id !== 'string' || !die.id) return `${t}: id が文字列ではありません`;
      if (ids.has(die.id)) return `${t}: id「${die.id}」が重複しています`;
      ids.add(die.id);
      if (typeof die.name !== 'string') return `${t}: 名前がありません(name が文字列ではありません)`;
      for (const k of ['x', 'y', 'widthMm', 'heightMm']) if (!isNum(die[k])) return `${t}: ${k} が有限の数ではありません`;
      if (!(die.widthMm > 0 && die.heightMm > 0)) return `${t}: 幅・高さは 0 より大きい値にしてください`;
      if (die.widthMm > MAX_SIZE_MM || die.heightMm > MAX_SIZE_MM) return `${t}: 寸法が大きすぎます(上限 ${MAX_SIZE_MM} mm)`;
      if (die.areaMm2 != null && !(isNum(die.areaMm2) && die.areaMm2 > 0)) return `${t}: areaMm2 は正の数か null にしてください`;
      if (!Array.isArray(die.blocks)) return `${t}: blocks が配列ではありません`;
      total += die.blocks.length;
      if (die.blocks.length > MAX_BLOCKS || total > MAX_BLOCKS) return `ブロックが多すぎます(上限 ${MAX_BLOCKS} 個)`;
      for (let j = 0; j < die.blocks.length; j++) {
        const b = die.blocks[j]; const u = `${t} のブロック ${j + 1}`;
        if (!b || typeof b !== 'object' || Array.isArray(b)) return `${u}: 形式が違います`;
        if (typeof b.id !== 'string' || !b.id) return `${u}: id が文字列ではありません`;
        if (ids.has(b.id)) return `${u}: id「${b.id}」が重複しています`;
        ids.add(b.id);
        if (typeof b.label !== 'string') return `${u}: 名前がありません(label が文字列ではありません)`;
        for (const k of ['x', 'y', 'w', 'h']) if (!isNum(b[k])) return `${u}: ${k} が有限の数ではありません`;
        if (!(b.w > 0 && b.h > 0)) return `${u}: 幅・高さは 0 より大きい値にしてください`;
        for (const k of ['kind', 'coreType', 'uarch']) if (b[k] != null && typeof b[k] !== 'string') return `${u}: ${k} が文字列ではありません`;
      }
    }
    return null;
  }

  const api = { SCHEMA, dieRole, dieSize, fromPreset, clone, validate, serialize, parse };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.design = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
