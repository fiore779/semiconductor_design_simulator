// コア定義(モード D の自作コア。設計書 §3.7)。UI に依存しない純関数。
// 基準コア(blocklib の部品)を複製し、発行幅・ROB・L2 容量・クロック・SMT だけを編集する。
// 性能は perf.stScore に「複製した uarch 記録(uRecord)」を渡して出し(補正 u は基準 uarch から借りる。確度は常に low)、
// 面積は基準の面積が「表(両方の面積を持つ)」のときだけ**範囲**として導く。電力・温度・最大クロックは出さない。
//
// 面積の導出(§3.7.3)について: L2 の容量比例(0.88 倍/倍々)は同ノード・同出典の 3 点に基づく。
// ロジックの上限(幅は 2 乗、ROB は 1 乗)と下限(変わらない)は**データから導けない設計上の仮定[推定・出典なし]**。
// 回帰式は作っていない。読み込み順: perf.js・compat.js の後(実行時に引くので順序不問)。
(function (root) {
  'use strict';

  const num = (x) => typeof x === 'number' && isFinite(x);
  const int = (x) => typeof x === 'number' && Number.isInteger(x);
  const EPS = 1e-9;

  // 入力の拒否範囲(§3.7.5)
  const LIMITS = { width: [2, 16], rob: [32, 1024], l2KB: [64, 16384], clockGHz: [0.5, 8.0] };
  // 校正範囲(§3.7.5)
  const CAL = { widthRob: [0.67, 1.5], l2: [0.5, 2], clockTol: 0.25, maxClockMargin: 1.05 };
  const L2_PER_DOUBLING = 0.88; // 容量が倍になるたびに 1MB あたりの面積が下がる比の最小(Arm 3 点・同一出典。0.320→0.282→0.276 mm²/MB)
  const MAX_DEFS = 16;
  const EDITABLE = ['width', 'rob', 'l2KB', 'clockGHz', 'smt'];

  const NOTE_ASSUMPTION = 'ロジック面積の範囲(上限: 幅は 2 乗・ROB は 1 乗で増える、下限: 変わらない)は、データから導けない設計上の仮定[推定・出典なし]です';
  const NOTE_L2 = 'L2 面積は容量に比例(倍々で 1MB あたり 0.88 倍まで下がる範囲。同ノード・同出典の 3 点に基づく)';
  const NOTE_SMT = 'SMT の面積増は未反映です(根拠となるデータがありません)';
  const NOTE_CLOCK_AREA = 'クロックを変えても面積は変えていません(根拠なし)';
  const NOTE_NO_OUTPUT = '電力・温度・最大クロックは出していません';
  const NOTE_L2_LAT = 'L2 容量を変えても L2 遅延は変えていません(遅延悪化は反映せず、上振れ側の予測です)';

  const perfApi = () => (root.SDS && root.SDS.sim && root.SDS.sim.perf) || (typeof require === 'function' ? require('../sim/perf.js') : null);
  const compatApi = () => (root.SDS && root.SDS.model && root.SDS.model.compat) || (typeof require === 'function' ? require('./compat.js') : null);
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const fail = (reason, extra) => Object.assign({ ok: false, reason }, extra || {});

  // ---- 作成 ----
  // clone(basePart, uarchDb, areas, opts) → { ok:true, def } | { ok:false, reason }
  //   basePart: blocklib の部品(kind:'core')。uarchDb: data/uarch.js の記録。areas: data/blocklib.js(現状は部品の area から読むので未使用。互換のため受ける)。
  //   opts: { id(既定 'cd1'), name(既定「<uarch> 改」) }
  //   基準なし・コア以外・uarch 記録なし・命令セット未取得は作れない(ゼロからの定義は不可。RD2)。
  function clone(basePart, uarchDb, areas, opts) {
    const o = opts || {};
    if (!basePart || typeof basePart !== 'object' || basePart.kind !== 'core') return fail('基準コアがありません(コア定義は既存コアの複製が必須です)');
    if (typeof basePart.id !== 'string' || !basePart.id) return fail('基準コアの部品 id がありません');
    if (typeof basePart.uarch !== 'string' || !basePart.uarch) return fail('基準コアのマイクロアーキが未取得です');
    const rec = uarchDb && uarchDb[basePart.uarch];
    if (!rec || typeof rec !== 'object') return fail(`マイクロアーキ「${basePart.uarch}」の記録がないため、補正を借りられず複製できません`);
    if (typeof basePart.isa !== 'string' || !basePart.isa) return fail('基準コアの命令セットが未取得です');
    const a = basePart.area || {};
    const origin = a.origin === 'table' || a.origin === 'estimated' ? a.origin : 'unknown';
    const area = {
      origin, mm2: num(a.mm2) ? a.mm2 : null, noL2Mm2: origin === 'table' && num(a.mm2) ? a.mm2 : null,
      withL2Mm2: num(a.withL2Mm2) ? a.withL2Mm2 : null, l2KB: num(a.l2KB) ? a.l2KB : null, s: typeof a.s === 'string' ? a.s : null,
    };
    const uRecord = copy(rec);
    const smt = basePart.smt === 2 ? 2 : 1;
    const def = {
      id: typeof o.id === 'string' && o.id ? o.id : 'cd1',
      name: typeof o.name === 'string' && o.name ? o.name : `${basePart.uarch} 改`,
      base: {
        partId: basePart.id, uarch: basePart.uarch, isa: basePart.isa, sourcePresetId: basePart.sourcePresetId || null, sourceChip: basePart.sourceChip || null,
        nodeId: basePart.nodeId || null, defaultClockGHz: num(basePart.defaultClockGHz) ? basePart.defaultClockGHz : null, smt, uRecord, area,
      },
      params: null,
    };
    def.params = baseParams(def);
    const bad = validateDef(def);
    return bad ? fail(bad) : { ok: true, def };
  }

  // 基準の値そのままの params(null は null のまま。初期値を作らない)
  function baseParams(def) {
    const u = def.base.uRecord;
    return {
      width: num(u.width) ? u.width : null, rob: num(u.rob) ? u.rob : null, l2KB: num(u.l2KB) ? u.l2KB : null,
      clockGHz: num(def.base.defaultClockGHz) ? def.base.defaultClockGHz : null, smt: def.base.smt,
    };
  }

  function nextId(coreDefs) {
    let n = 0;
    (coreDefs || []).forEach((d) => { const m = /^cd(\d+)$/.exec(d && d.id); if (m) n = Math.max(n, +m[1]); });
    return `cd${n + 1}`;
  }

  // ---- 基準の値 ----
  // 基準の L2 容量(uarch.js の値。null なら表の値)。どちらも無ければ null
  function baseL2KB(def) {
    const u = def.base.uRecord.l2KB; if (num(u)) return u;
    const t = def.base.area.l2KB; return num(t) ? t : null;
  }
  // 面積の L2 比の分母: 表の l2KB(無ければ uarch.js の値)。設計書 §3.7.11
  function areaL2KB(def) {
    const t = def.base.area.l2KB; if (num(t)) return t;
    const u = def.base.uRecord.l2KB; return num(u) ? u : null;
  }
  // 性能が実際に使う基準の L2(uRecord.l2KB。null なら perf の参照値)
  function perfL2KB(def) {
    const u = def.base.uRecord.l2KB; if (num(u)) return u;
    const P = perfApi(); return P && P.DEFAULT_PARAMS && num(P.DEFAULT_PARAMS.l2Ref) ? P.DEFAULT_PARAMS.l2Ref : 512;
  }
  // 表と uarch.js の l2KB が食い違うとき { table, uarch }、そうでなければ null
  function l2Mismatch(def) {
    const t = def.base.area.l2KB; const u = def.base.uRecord.l2KB;
    return num(t) && num(u) && t !== u ? { table: t, uarch: u } : null;
  }
  // 表示用: L2 の入力欄の初期値と、参照値で計算中か(uarch.js が null で表の値を表示する場合)
  function l2Display(def) {
    const u = def.base.uRecord.l2KB;
    if (num(u)) return { value: u, usingReference: false, note: null };
    const t = baseL2KB(def);
    return { value: t, usingReference: true, note: '基準の L2 容量は uarch.js に未取得のため、性能は参照値 512KB で計算中(入力すると、その値で計算します)' };
  }

  // 面積を基準の表から導けるか(基準の面積が「表」で、L2 なし・L2 込みの両方を持つとき。§3.7.3)
  function areaDerivable(def) {
    const a = def.base.area;
    if (a.origin !== 'table') return { ok: false, reason: `基準コアの面積が表の実データではない(${a.origin === 'estimated' ? '推定' : '未取得'})ため、面積を導けません` };
    if (!num(a.noL2Mm2) || !num(a.withL2Mm2)) return { ok: false, reason: '基準コアの面積は L2 なし・L2 込みの両方がそろっていないため、L2 とロジックに分けられず、面積を導けません' };
    if (!(a.withL2Mm2 > a.noL2Mm2)) return { ok: false, reason: '基準コアの L2 込みの面積が L2 なしより大きくないため、面積を導けません' };
    if (!num(areaL2KB(def)) || !(areaL2KB(def) > 0)) return { ok: false, reason: '基準コアの L2 容量が未取得のため、面積を導けません' };
    return { ok: true, reason: null };
  }

  // 項目ごとの編集可否。{ width|rob|l2KB|clockGHz|smt: { editable, reason } }
  function editability(def) {
    const der = areaDerivable(def); const u = def.base.uRecord;
    const area = (key, label) => {
      if (!num(u[key])) return { editable: false, reason: `基準コアの${label}が未取得のため、編集できません(値を作りません)` };
      if (!der.ok) return { editable: false, reason: `${der.reason}。面積が反映されない編集は誤解を生むため無効にしています` };
      return { editable: true, reason: null };
    };
    return {
      width: area('width', '発行幅'), rob: area('rob', 'ROB'),
      l2KB: der.ok ? { editable: true, reason: null } : { editable: false, reason: `${der.reason}。面積が反映されない編集は誤解を生むため無効にしています` },
      clockGHz: { editable: true, reason: null }, smt: { editable: true, reason: null },
    };
  }

  // ---- 編集 ----
  const inherited = (k) => (k === 'isa' ? '命令セットは基準コアから継承され、変更できません(別の命令セットが欲しいときはその命令セットの基準コアを選びます)' : `「${k}」は継承のみで、編集できません`);

  // validateParams(def, patch) → { ok, errors:[{field, reason}], params(適用後) }。patch は編集項目の一部でよい。
  function validateParams(def, patch) {
    const errors = []; const ed = editability(def);
    const params = Object.assign({}, def.params);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, errors: [{ field: null, reason: '編集内容が不正です' }], params };
    Object.keys(patch).forEach((k) => {
      if (!EDITABLE.includes(k)) { errors.push({ field: k, reason: inherited(k) }); return; }
      const v = patch[k];
      if (ed[k] && !ed[k].editable) { errors.push({ field: k, reason: ed[k].reason }); return; }
      if (k === 'smt') {
        if (v !== 1 && v !== 2) { errors.push({ field: k, reason: 'SMT は 1 か 2 にしてください' }); return; }
      } else if (k === 'clockGHz') {
        if (!num(v) || v < LIMITS.clockGHz[0] || v > LIMITS.clockGHz[1]) { errors.push({ field: k, reason: 'クロックは 0.5〜8.0 GHz の数にしてください' }); return; }
      } else {
        const [lo, hi] = LIMITS[k]; const label = { width: '発行幅', rob: 'ROB', l2KB: 'L2 容量(KB)' }[k];
        if (!int(v) || v < lo || v > hi) { errors.push({ field: k, reason: `${label}は ${lo}〜${hi} の整数にしてください` }); return; }
      }
      params[k] = v;
    });
    return { ok: errors.length === 0, errors, params };
  }

  // applyParams(def, patch) → { ok:true, def } | { ok:false, reason, errors }。元の def は壊さない
  function applyParams(def, patch) {
    const r = validateParams(def, patch);
    if (!r.ok) return fail(r.errors[0].reason, { errors: r.errors });
    const d = copy(def); d.params = r.params;
    return { ok: true, def: d };
  }

  // 基準に戻す(params を基準の値へ)
  function reset(def) { const d = copy(def); d.params = baseParams(d); return d; }

  function rename(def, name) {
    if (typeof name !== 'string' || !name.trim() || name.length > 80) return fail('名前は 1〜80 文字にしてください');
    const d = copy(def); d.name = name; return { ok: true, def: d };
  }

  // 実効の値(params が null の項目は基準の値)
  function effective(def) {
    const p = def.params; const u = def.base.uRecord;
    return {
      width: p.width != null ? p.width : (num(u.width) ? u.width : null),
      rob: p.rob != null ? p.rob : (num(u.rob) ? u.rob : null),
      l2KB: p.l2KB != null ? p.l2KB : baseL2KB(def),
      clockGHz: p.clockGHz != null ? p.clockGHz : (num(def.base.defaultClockGHz) ? def.base.defaultClockGHz : null),
      smt: p.smt,
    };
  }

  // 基準に対する比(基準が無い項目は 1)。l2 は性能が実際に使う値基準(params.l2KB / perfL2KB)
  const rat = (v, b) => (num(v) && num(b) && b > 0 ? v / b : 1);
  function ratios(def) {
    const e = effective(def); const u = def.base.uRecord; const p = def.params;
    return { width: rat(e.width, u.width), rob: rat(e.rob, u.rob), l2: p.l2KB != null ? rat(p.l2KB, perfL2KB(def)) : 1 };
  }
  // 面積用の比。l2 は表の l2KB 基準
  function areaRatios(def) {
    const r = ratios(def); const p = def.params;
    return { width: r.width, rob: r.rob, l2: p.l2KB != null && p.l2KB !== def.base.uRecord.l2KB ? rat(p.l2KB, areaL2KB(def)) : 1 };
  }

  const isEdited = (def) => {
    const e = effective(def); const b = effective(Object.assign({}, def, { params: baseParams(def) }));
    const r = ratios(def);
    return Math.abs(r.width - 1) > EPS || Math.abs(r.rob - 1) > EPS || Math.abs(r.l2 - 1) > EPS
      || (e.clockGHz !== b.clockGHz) || e.smt !== b.smt || (def.params.l2KB != null && def.params.l2KB !== def.base.uRecord.l2KB);
  };

  // perf.stScore に渡す uarch 記録: 基準の記録に params を上書きしたもの。params が null の項目は基準のまま
  // (uRecord.l2KB が null の基準は、L2 を入力しない限り null のまま=参照値で計算。RD8)
  function uRecordOf(def) {
    const u = copy(def.base.uRecord); const p = def.params;
    if (p.width != null) u.width = p.width;
    if (p.rob != null) u.rob = p.rob;
    if (p.l2KB != null) u.l2KB = p.l2KB;
    return u;
  }

  // ブロック(コア)として置くときの部品。design.addCoreDef が使う
  function toPart(def) {
    const e = effective(def); const a = def.base.area;
    return {
      id: `custom:${def.id}`, kind: 'core', label: def.name, uarch: def.base.uarch, coreType: `custom:${def.id}`, coreDefId: def.id, coreDef: def,
      isa: def.base.isa, sourceChip: def.base.sourceChip, sourcePresetId: null, nodeId: def.base.nodeId, defaultClockGHz: e.clockGHz, smt: e.smt,
      area: { origin: a.origin, mm2: a.mm2, withL2Mm2: a.withL2Mm2, l2KB: a.l2KB, s: a.s },
    };
  }

  // ---- 面積(§3.7.3) ----
  // deriveArea(def, ctx) → { ok:true, derived, origin, placeMm2, rangeMm2, ... }
  //   ctx: { toNodeId, nodes }(設計のノードが基準と違えば compat.portArea の比を掛ける)
  //   derived:true  … 範囲。baseRangeMm2(基準ノード上)・logicMm2・l2Mm2([下限, 上限])・rangeMm2(移植後)・placeMm2(= rangeMm2 の上限。配置に使う)
  //                   origin:'derived'
  //   derived:false … 導出しない。基準の面積(その区分のまま)を placeMm2 に(基準も未取得なら null)。移植で変わるなら rangeMm2 に幅
  //   共通: ported / portConverted / ratio / ratioRange / portNote / notes(画面と保存データに出す注記)
  function deriveArea(def, ctx) {
    const c = ctx || {}; const C = compatApi();
    const a = def.base.area; const der = areaDerivable(def);
    const from = def.base.nodeId || null; const to = c.toNodeId || null;
    const ported = !!(from && to && from !== to);
    const out = { ok: true, derived: false, origin: a.origin, placeMm2: null, rangeMm2: null, baseRangeMm2: null, logicMm2: null, l2Mm2: null, ported, portConverted: false, ratio: null, ratioRange: null, portNote: null, reason: null, notes: [NOTE_SMT, NOTE_CLOCK_AREA] };
    let lo; let hi;
    if (der.ok) {
      const r = areaRatios(def); const l0 = a.noL2Mm2; const m0 = a.withL2Mm2 - a.noL2Mm2;
      const rw2 = r.width * r.width;
      const logic = [l0 * Math.min(1, rw2) * Math.min(1, r.rob), l0 * Math.max(1, rw2) * Math.max(1, r.rob)];
      const s = Math.abs(Math.log2(r.l2));
      const l2 = r.l2 >= 1 ? [m0 * r.l2 * Math.pow(L2_PER_DOUBLING, s), m0 * r.l2] : [m0 * r.l2, m0 * r.l2 * Math.pow(1 / L2_PER_DOUBLING, s)];
      const unchanged = r.width === 1 && r.rob === 1 && r.l2 === 1;
      if (unchanged) {
        // 未編集は表の区分のまま・範囲 0(導出ではない)。注意帯 3・NOTE_ASSUMPTION を出さない
        lo = hi = a.withL2Mm2;
      } else {
        lo = logic[0] + l2[0]; hi = logic[1] + l2[1];
        out.derived = true; out.origin = 'derived'; out.logicMm2 = logic; out.l2Mm2 = l2; out.baseRangeMm2 = [lo, hi];
        out.notes.unshift(NOTE_ASSUMPTION, NOTE_L2);
      }
    } else {
      const base = num(a.withL2Mm2) ? a.withL2Mm2 : (num(a.mm2) ? a.mm2 : null);
      out.reason = der.reason;
      if (base == null) return out;
      lo = hi = base;
    }
    out.placeMm2 = hi; out.rangeMm2 = [lo, hi];
    if (ported) {
      const pa = C ? C.portArea(hi, from, to, c.nodes) : { ok: false, reason: '換算モジュールがありません' };
      if (pa.ok) {
        out.portConverted = true; out.ratio = pa.ratio; out.ratioRange = pa.ratioRange; out.portNote = pa.note;
        out.placeMm2 = pa.mm2; out.rangeMm2 = [lo * pa.ratioRange[0], pa.mm2];
      } else out.portNote = pa.reason;
    }
    return out;
  }

  // ---- 校正範囲外・上振れ側(§3.7.5) ----
  function maxClockOf(presets, isa) {
    let m = 0;
    (presets || []).forEach((p) => { if (p.isa === isa && p.cfg) (p.cfg.cores || []).forEach((g) => { m = Math.max(m, g.boostGHz || g.maxGHz || g.baseGHz || 0); }); });
    return m > 0 ? m : null;
  }
  const f2 = (x) => Math.round(x * 100) / 100;

  // outOfCalibration(def, ctx) → [{ field:'coredef:<id>:width' など, reason }]。ctx: { presets, maxClockGHz }(どちらも省略可)
  function outOfCalibration(def, ctx) {
    const c = ctx || {}; const out = []; const r = ratios(def); const e = effective(def); const id = def.id;
    const maxClk = c.maxClockGHz > 0 ? c.maxClockGHz : maxClockOf(c.presets, def.base.isa);
    const gen = (key, label, ratio) => {
      if (ratio < CAL.widthRob[0] - EPS || ratio > CAL.widthRob[1] + EPS) out.push({ field: `coredef:${id}:${key}`, reason: `${label}の変更(基準の ${f2(ratio)} 倍)は 0.67〜1.5 倍の外で、校正した範囲の外です(一世代を超える変更)` });
    };
    gen('width', '発行幅', r.width); gen('rob', 'ROB', r.rob);
    if (r.l2 < CAL.l2[0] - EPS || r.l2 > CAL.l2[1] + EPS) out.push({ field: `coredef:${id}:l2KB`, reason: `L2 容量の変更(基準の ${f2(r.l2)} 倍)は 0.5〜2 倍の外で、校正した範囲の外です` });
    const changed = [r.width, r.rob, r.l2].filter((x) => Math.abs(x - 1) > EPS).length;
    if (changed >= 2) out.push({ field: `coredef:${id}:combo`, reason: '幅・ROB・L2 のうち 2 項目以上を同時に変えており、校正した範囲の外です(1 項目ずつの変化でしか世代間比較が成り立たず、同時に動かした影響は検証できない)' });
    const f0 = def.base.defaultClockGHz; const f1 = e.clockGHz; const field = `coredef:${id}:clock`;
    if (!(num(f0) && f0 > 0)) {
      if (num(f1) && f1 > 0) out.push({ field, reason: `基準コアの既定クロックが未取得のため、入力したクロック ${f1} GHz には根拠がなく、校正した範囲の外です` });
    } else if (num(f1) && f1 > 0) {
      if (Math.abs(f1 / f0 - 1) > CAL.clockTol + EPS) out.push({ field, reason: `クロック ${f1} GHz は基準(${f0} GHz)の ±25% を超えており、校正した範囲の外です` });
      else if (Math.abs(f1 - f0) > EPS && maxClk && f1 > maxClk * CAL.maxClockMargin + EPS) out.push({ field, reason: `クロック ${f1} GHz は、収録しているチップの最大クロック(${maxClk} GHz)を超えています` });
    }
    return out;
  }

  // optimisticInfo(def) → { optimistic, reasons }。幅・ROB・L2・クロックのどれかを基準より増やした場合
  function optimisticInfo(def) {
    const r = ratios(def); const e = effective(def); const f0 = def.base.defaultClockGHz; const reasons = [];
    const tail = '(遅延悪化・電力・熱の制限を計算していない)';
    if (r.width > 1 + EPS) reasons.push(`発行幅を基準より増やしています${tail}`);
    if (r.rob > 1 + EPS) reasons.push(`ROB を基準より増やしています${tail}`);
    if (r.l2 > 1 + EPS) reasons.push(`L2 容量を基準より増やしています${tail}`);
    if (def.base.smt === 1 && e.smt === 2) reasons.push('SMT を増やした(γ 未校正)');
    if (num(f0) && num(e.clockGHz) && e.clockGHz > f0 + EPS) reasons.push(`クロックを基準より上げています${tail}`);
    return { optimistic: reasons.length > 0, reasons };
  }

  // ---- 整合性チェック(§3.7.4) ----
  // checks(def, ctx) → [{ level:'warn'|'info', code, text }]。ctx: { cal }(cal.params があればそれを使う)
  function checks(def, ctx) {
    const P = perfApi(); const p = Object.assign({}, P ? P.DEFAULT_PARAMS : {}, (ctx && ctx.cal && ctx.cal.params) || {});
    const out = []; const e = effective(def); const u = def.base.uRecord;
    if (num(e.rob) && num(e.width) && p.aIlp > 0) {
      const ilp = p.aIlp * Math.pow(e.rob, p.bIlp);
      if (ilp < e.width) out.push({ level: 'warn', code: 'ilp-limit', text: `ROB が小さく、幅 ${e.width} を使い切れません(ILP 上限 ${f2(ilp)} < ${e.width})。幅を上げても IPC は上がりません` });
    }
    if (num(e.rob) && p.kMlp > 0) {
      const mlp = (rob, mshr) => Math.max(1, Math.min(16, Math.min(num(mshr) ? mshr : p.mshrDefault, rob / p.kMlp)));
      const m1 = mlp(e.rob, u.mshr); const m0 = mlp(num(u.rob) ? u.rob : e.rob, u.mshr);
      if (m1 < m0 - EPS) out.push({ level: 'info', code: 'mlp-down', text: `ROB が小さくなり、同時に処理できるメモリミス数(MLP ${f2(m1)})が基準(${f2(m0)})より下がります` });
    }
    if (ratios(def).l2 > 1 + EPS) out.push({ level: 'info', code: 'l2-latency', text: NOTE_L2_LAT });
    if (def.params.l2KB != null && !num(u.l2KB)) out.push({ level: 'info', code: 'l2-ref-base', text: `基準は参照値 ${perfL2KB(def)}KB で計算しており、基準比には ${perfL2KB(def)}→${def.params.l2KB} の差が含まれる` });
    const mm = l2Mismatch(def);
    if (mm) out.push({ level: 'info', code: 'l2-mismatch', text: `表 ${mm.table} KB / uarch.js ${mm.uarch} KB が食い違う(設計書 §3.7.11)。面積は表の値、性能は uarch.js の値を基準にしている` });
    return out;
  }

  // ---- 評価(§3.7.3・§3.7.7) ----
  // evaluate(def, ctx) → { ok, edited, confidence:'low', st, area, outOfCalibration, optimistic, optimisticReasons, checks, warnings:[{level,text}], notes, power:null, thermal:null, maxClockGHz:null }
  //   ctx: { cal, uarch(= data/uarch.js), presets, nodes, toNodeId, l3MB(省略時 null=参照値で計算), maxClockGHz }
  //   st: { ok, score, ipc, parts:{base,br,mem}, fGHz, corr, corrSource:'clone', corrFrom, confidence:'low', baseScore, baseIpc, deltaPct, reason? }
  function evaluate(def, ctx) {
    const c = ctx || {}; const P = perfApi();
    const e = effective(def); const uRec = uRecordOf(def);
    const preset = { isa: def.base.isa, cfg: { cores: [], l3MB: c.l3MB === undefined ? null : c.l3MB } };
    const core = { type: `custom:${def.id}`, uarch: def.base.uarch, isa: def.base.isa, count: 1, smt: e.smt, boostGHz: e.clockGHz || undefined, uRecord: uRec };
    const r = P.stScore(preset, c.cal, c.uarch, { core });
    const st = r.ok ? { ok: true, score: r.score, ipc: r.ipc, parts: r.parts, fGHz: r.fGHz, corr: r.corr, corrSource: 'clone', corrFrom: r.corrFrom, confidence: 'low', missing: r.missing } : { ok: false, score: null, reason: r.reason, confidence: 'low' };
    if (r.ok) {
      const b = P.stScore(preset, c.cal, c.uarch, { core: { type: 'base', uarch: def.base.uarch, isa: def.base.isa, count: 1, smt: def.base.smt, boostGHz: def.base.defaultClockGHz || undefined, uRecord: copy(def.base.uRecord) } });
      st.baseScore = b.ok ? b.score : null; st.baseIpc = b.ok ? b.ipc : null; st.baseParts = b.ok ? b.parts : null;
      st.deltaPct = b.ok && b.score > 0 ? (r.score / b.score - 1) * 100 : null;
    }
    const area = deriveArea(def, { toNodeId: c.toNodeId || null, nodes: c.nodes });
    const ooc = outOfCalibration(def, c); const opt = optimisticInfo(def); const chk = checks(def, c);
    const warnings = [];
    ooc.forEach((o) => warnings.push({ level: 'warn', field: o.field, text: `校正した範囲の外: ${o.reason}(確度は低)` }));
    opt.reasons.forEach((t) => warnings.push({ level: 'warn', text: `上振れ側の予測: ${t}` }));
    chk.forEach((k) => warnings.push({ level: k.level, code: k.code, text: k.text }));
    if (r.ok && r.corrFrom === 'isa') warnings.push({ level: 'warn', text: 'この基準のマイクロアーキに専用の補正がなく、同じ命令セットの平均で代用しています' });
    return {
      ok: r.ok, edited: isEdited(def), confidence: 'low', st, area, outOfCalibration: ooc, optimistic: opt.optimistic, optimisticReasons: opt.reasons, checks: chk, warnings,
      notes: [`自作コアの性能は基準コア(${def.base.uarch})の補正を借りた推定です。幅・ROB・L2 の変更の効果は検証できていません`, NOTE_NO_OUTPUT],
      power: null, thermal: null, maxClockGHz: null,
    };
  }

  // ---- 検証(読み込んだ設計・保存用)。問題があれば日本語の理由、なければ null ----
  const KEY_RE = /^[A-Za-z0-9_-]{1,32}$/;
  const strOrNull = (v, max) => v == null || (typeof v === 'string' && v.length <= (max || 200));
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

  function validateDef(def) {
    if (!isObj(def)) return 'コア定義の形式が違います';
    if (typeof def.id !== 'string' || !KEY_RE.test(def.id)) return 'コア定義の id は英数字・_・- の 1〜32 文字にしてください';
    const t = `コア定義「${def.id}」`;
    if (typeof def.name !== 'string' || !def.name || def.name.length > 80) return `${t}: 名前は 1〜80 文字の文字列にしてください`;
    const b = def.base; if (!isObj(b)) return `${t}: base がありません`;
    if (typeof b.partId !== 'string' || !b.partId || b.partId.length > 200) return `${t}: base.partId が不正です`;
    if (typeof b.uarch !== 'string' || !b.uarch || b.uarch.length > 80) return `${t}: base.uarch が不正です`;
    if (typeof b.isa !== 'string' || !b.isa || b.isa.length > 16) return `${t}: base.isa が不正です`;
    for (const k of ['sourcePresetId', 'sourceChip', 'nodeId']) if (!strOrNull(b[k])) return `${t}: base.${k} が文字列でも null でもありません`;
    if (b.defaultClockGHz != null && !(num(b.defaultClockGHz) && b.defaultClockGHz >= 0.5 && b.defaultClockGHz <= 8)) return `${t}: base.defaultClockGHz は null か 0.5〜8 GHz の数にしてください`;
    if (b.smt !== 1 && b.smt !== 2) return `${t}: base.smt は 1 か 2 にしてください`;
    if (!isObj(b.uRecord)) return `${t}: base.uRecord がありません`;
    const ks = Object.keys(b.uRecord); if (ks.length > 40) return `${t}: base.uRecord の項目が多すぎます`;
    for (const k of ks) {
      const v = b.uRecord[k];
      if (v == null || typeof v === 'boolean') continue;
      if (typeof v === 'string') { if (v.length > 2000) return `${t}: base.uRecord.${k} が長すぎます`; continue; }
      if (!(num(v) && v >= 0 && v <= 1e6)) return `${t}: base.uRecord.${k} は null か 0 以上 1e6 以下の数(または文字列・真偽値)にしてください`;
    }
    for (const k of ['width', 'rob']) { const v = b.uRecord[k]; if (v != null && !(num(v) && v >= 1 && v <= 1e5)) return `${t}: base.uRecord.${k} が不正です`; }
    const a = b.area; if (!isObj(a)) return `${t}: base.area がありません`;
    if (!['table', 'estimated', 'unknown'].includes(a.origin)) return `${t}: base.area.origin は table / estimated / unknown のいずれかにしてください`;
    for (const k of ['mm2', 'noL2Mm2', 'withL2Mm2']) if (a[k] != null && !(num(a[k]) && a[k] > 0 && a[k] <= 1e4)) return `${t}: base.area.${k} は null か 0 より大きく 10000 mm² 以下の数にしてください`;
    if (a.l2KB != null && !(num(a.l2KB) && a.l2KB > 0 && a.l2KB <= 1e6)) return `${t}: base.area.l2KB が不正です`;
    if (!strOrNull(a.s, 16)) return `${t}: base.area.s が不正です`;
    const p = def.params; if (!isObj(p)) return `${t}: params がありません`;
    for (const k of Object.keys(p)) if (!EDITABLE.includes(k)) return `${t}: params.${k} は編集項目ではありません`;
    if (p.smt !== 1 && p.smt !== 2) return `${t}: params.smt は 1 か 2 にしてください`;
    if (p.clockGHz != null && !(num(p.clockGHz) && p.clockGHz >= 0.5 && p.clockGHz <= 8)) return `${t}: params.clockGHz は null か 0.5〜8 GHz の数にしてください`;
    const ed = editability(def);
    for (const k of ['width', 'rob', 'l2KB']) {
      const v = p[k]; if (v == null) continue;
      const [lo, hi] = LIMITS[k];
      if (!(int(v) && v >= lo && v <= hi)) return `${t}: params.${k} は ${lo}〜${hi} の整数か null にしてください`;
      const baseV = k === 'l2KB' ? b.uRecord.l2KB : b.uRecord[k];
      if (!ed[k].editable && v !== baseV) return `${t}: params.${k} は編集できない基準(${ed[k].reason})なのに、基準と違う値です`;
    }
    return null;
  }

  // validateDefs(coreDefs) → 理由 | null(配列・個数・id の重複)
  function validateDefs(list) {
    if (!Array.isArray(list)) return 'coreDefs が配列ではありません';
    if (list.length > MAX_DEFS) return `コア定義が多すぎます(${list.length} 個。上限 ${MAX_DEFS})`;
    const ids = new Set();
    for (const d of list) {
      const bad = validateDef(d); if (bad) return bad;
      if (ids.has(d.id)) return `コア定義の id「${d.id}」が重複しています`;
      ids.add(d.id);
    }
    return null;
  }

  const api = {
    LIMITS, CAL, MAX_DEFS, L2_PER_DOUBLING, NOTE_ASSUMPTION, NOTE_NO_OUTPUT,
    clone, nextId, baseParams, baseL2KB, areaL2KB, perfL2KB, l2Mismatch, areaRatios, l2Display, areaDerivable, editability, validateParams, applyParams, reset, rename, effective, ratios, isEdited,
    uRecordOf, toPart, deriveArea, outOfCalibration, optimisticInfo, checks, evaluate, validateDef, validateDefs, maxClockOf,
  };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.coredef = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
