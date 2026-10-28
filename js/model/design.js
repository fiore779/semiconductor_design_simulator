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
    const mode = o.mode === 'improve' ? 'improve' : 'reproduce';
    const cfg = cfgFromPreset(preset);
    return {
      schema: SCHEMA, name: o.name || preset.name,
      origin: { mode, base: preset.id, parts: [] },
      locks: { params: mode === 'reproduce' },
      presetId: preset.id, dies,
      cfg, baseCfg: clone(cfg), package: defaultPackage(preset),
    };
  }

  // ---- パッケージ設定(冷却・基板・電力制限)。環境の設定でチップの設計ではないので、ロック(A 再現)の対象外 ----
  const DEFAULT_COOLING = { pc: 'air-tower', 'mobile-pc': 'thin-laptop', mobile: 'passive-phone', embedded: 'small-fan' };
  // 電力制限の初期値(設計書 §6.1): プリセットの公表ピーク電力(MTP など)があればそれ、なければ公表の基本電力、どちらも無ければ制限なし(null)。
  // 出所は powerLimitSource('peak'|'base'|null。ユーザーが変えたら 'user')
  function defaultPowerLimit(preset) {
    const p = (preset && preset.power) || {};
    const ok = (x) => !!x && typeof x.w === 'number' && isFinite(x.w) && x.w >= 1 && x.w <= 1000;
    if (ok(p.peak)) return { powerLimitW: p.peak.w, powerLimitSource: 'peak' };
    if (ok(p.base)) return { powerLimitW: p.base.w, powerLimitSource: 'base' };
    return { powerLimitW: null, powerLimitSource: null };
  }
  function defaultPackage(preset) {
    return Object.assign({ coolingId: DEFAULT_COOLING[preset && preset.kind] || 'air-tower', substrateId: 'organic' }, defaultPowerLimit(preset));
  }
  // package が無い古い設計に既定のパッケージを補った新しい設計を返す(あれば複製のみ)
  function ensurePackage(design, preset) {
    const d = clone(design);
    if (!d.package) d.package = defaultPackage(preset);
    return d;
  }
  const dataIds = (key) => { const a = (root.SDS_DATA || {})[key]; return Array.isArray(a) ? a.map((x) => x.id) : null; };
  function setPackageField(design, field, value, key, label) {
    const ids = dataIds(key);
    if (typeof value !== 'string' || !value || (ids && !ids.includes(value))) return fail(`${label}「${value}」は選べません`);
    const d = clone(design);
    d.package = Object.assign(defaultPackage(null), d.package || {}, { [field]: value });
    return { ok: true, design: d };
  }
  function setCooling(design, id) { return setPackageField(design, 'coolingId', id, 'cooling', '冷却'); }
  function setSubstrate(design, id) { return setPackageField(design, 'substrateId', id, 'substrates', '基板'); }
  function setPowerLimit(design, w) {
    if (w !== null && !(typeof w === 'number' && isFinite(w) && w >= 1 && w <= 1000)) return fail('電力制限は 1〜1000 W の数か、制限なし(null)にしてください');
    const d = clone(design);
    d.package = Object.assign(defaultPackage(null), d.package || {}, { powerLimitW: w, powerLimitSource: w === null ? null : 'user' });
    return { ok: true, design: d };
  }

  function clone(d) { return JSON.parse(JSON.stringify(d)); }

  // 編集用パラメータ(§3.3)。プリセットの cfg から性能に効く項目だけをコピーする(値のないキーは作らない)
  function cfgFromPreset(preset) {
    const c = preset.cfg || {};
    const keys = ['type', 'uarch', 'count', 'smt', 'baseGHz', 'boostGHz', 'maxGHz'];
    const cores = (c.cores || []).map((g) => { const r = {}; keys.forEach((k) => { if (g[k] != null) r[k] = g[k]; }); return r; });
    return { cores, l3MB: typeof c.l3MB === 'number' ? c.l3MB : 0 };
  }

  // 古い設計(cfg なし。M2 で保存したもの)に cfg/baseCfg/locks を補った新しい設計を返す。cfg があればそのまま(複製)返す。
  function ensureCfg(design, preset) {
    const d = clone(design);
    if (!d.cfg || !d.baseCfg) {
      const cfg = preset ? cfgFromPreset(preset) : null;
      if (cfg) { if (!d.cfg) d.cfg = cfg; if (!d.baseCfg) d.baseCfg = clone(cfg); }
    }
    if (!d.locks) d.locks = { params: !!(d.origin && d.origin.mode === 'reproduce') };
    return d;
  }

  // ---- パラメータ編集(新しい設計を返す。元は壊さない) ----
  const LOCKED = '再現モードではパラメータはロックされています';
  const fail = (reason) => ({ ok: false, reason });
  const clockOf = (g) => g.boostGHz || g.maxGHz || g.baseGHz || 0;

  function l3Frac(mb) { return mb ? Math.min(0.3, 0.1 + mb / 400) : 0; }

  // cfg に合わせてコアのブロックを**模式図として再配置**する(手で動かした位置は失われる)。
  // コアまたは L3 のブロックを持つダイ(最初の1つ)だけを作り直す。戻り値は新しい設計。
  function relayoutCompute(design) {
    const d = clone(design);
    const die = d.dies.find((x) => x.blocks.some((b) => b.kind === 'core' || b.kind === 'l3'));
    if (die) die.blocks = layoutCompute(die, d.cfg.cores, d.cfg.l3MB);
    return d;
  }

  // cfg を差し替えた設計を返す(ロックは見ない=差分の「元に戻す」用)。relayout=true ならブロックを再配置。
  function withCfg(design, cfg, relayout) {
    const d = clone(design); d.cfg = clone(cfg);
    return relayout ? relayoutCompute(d) : d;
  }

  function setCoreCount(design, type, count) {
    if (design.locks && design.locks.params) return fail(LOCKED);
    if (!design.cfg) return fail('編集用のパラメータがありません');
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 64) return fail('コア数は 1〜64 の整数にしてください');
    const g = design.cfg.cores.find((c) => c.type === type);
    if (!g) return fail(`コア種別「${type}」はこの設計にありません`);
    const d = clone(design);
    d.cfg.cores.find((c) => c.type === type).count = count;
    if (g.count === count) return { ok: true, design: d, relaid: false };
    // コア数が変わるとブロック数が変わるので、模式図として再配置する(手で動かした位置はリセットされる)
    return { ok: true, design: relayoutCompute(d), relaid: true };
  }

  function setClock(design, type, ghz) {
    if (design.locks && design.locks.params) return fail(LOCKED);
    if (!design.cfg) return fail('編集用のパラメータがありません');
    if (typeof ghz !== 'number' || !isFinite(ghz) || ghz < 0.5 || ghz > 8) return fail('クロックは 0.5〜8.0 GHz の数にしてください');
    if (!design.cfg.cores.some((c) => c.type === type)) return fail(`コア種別「${type}」はこの設計にありません`);
    const d = clone(design);
    const g = d.cfg.cores.find((c) => c.type === type);
    // boost を更新(boost がなく max があれば max。どちらも無ければ boost を新設)。base は変えない
    if (g.boostGHz == null && g.maxGHz != null) g.maxGHz = ghz; else g.boostGHz = ghz;
    return { ok: true, design: d, relaid: false };
  }

  function setL3(design, mb) {
    if (design.locks && design.locks.params) return fail(LOCKED);
    if (!design.cfg) return fail('編集用のパラメータがありません');
    if (typeof mb !== 'number' || !isFinite(mb) || mb < 0 || mb > 512) return fail('L3 は 0〜512 MB の数にしてください');
    const d = clone(design);
    const old = d.cfg.l3MB || 0;
    d.cfg.l3MB = mb;
    if (old === mb) return { ok: true, design: d, relaid: false };
    // 帯の高さ(割合)が同じなら位置は動かさず、ラベルだけ更新。違えば再配置
    if (old > 0 && mb > 0 && l3Frac(old) === l3Frac(mb)) {
      d.dies.forEach((die) => die.blocks.forEach((b) => { if (b.kind === 'l3') b.label = `L3 ${mb}MB`; }));
      return { ok: true, design: d, relaid: false };
    }
    return { ok: true, design: relayoutCompute(d), relaid: true };
  }

  // 再現(A)→改良(B)。パラメータのロックを外す
  function unlock(design) {
    const d = clone(design);
    d.origin = Object.assign({}, d.origin, { mode: 'improve', unlockedFrom: 'reproduce' });
    d.locks = Object.assign({}, d.locks, { params: false });
    return d;
  }

  // ---- 混合(モード C。設計書 §3.3 C)。部品(blocklib の部品)を 1 つのダイに寄せ集めて新しいチップにする ----
  const MIX_DIE_MIN_MM = 1; const MIX_DIE_MAX_MM = 100;
  const PLACEHOLDER_MM = 2; // 面積が未取得の部品の仮の寸法(実寸ではない)
  const EPS_MM = 1e-6;

  // ダイ寸法の検証。問題があれば日本語の理由、なければ null
  function checkDieSize(w, h) {
    for (const [v, n] of [[w, '幅'], [h, '高さ']]) {
      if (!isNum(v) || v < MIX_DIE_MIN_MM || v > MIX_DIE_MAX_MM) return `ダイの${n}は ${MIX_DIE_MIN_MM}〜${MIX_DIE_MAX_MM} mm の数にしてください`;
    }
    return null;
  }

  // 空のダイ 1 個の混合設計。opts: { name, widthMm, heightMm, nodeId }。寸法が範囲外なら RangeError(UI は checkDieSize で先に確かめる)
  function fromScratch(opts) {
    const o = opts || {};
    const w = o.widthMm == null ? 10 : o.widthMm; const h = o.heightMm == null ? 10 : o.heightMm;
    const bad = checkDieSize(w, h);
    if (bad) throw new RangeError(bad);
    const nodeId = typeof o.nodeId === 'string' && o.nodeId ? o.nodeId : null;
    const name = typeof o.name === 'string' && o.name ? o.name : '混合チップ';
    return {
      schema: SCHEMA, name,
      origin: { mode: 'mix', base: null, parts: [] },
      locks: { params: false },
      presetId: null,
      dies: [{ id: 'die0', name: 'ダイ', nodeId, areaMm2: w * h, areaSource: null, areaKnown: true, areaNote: '設計者が指定したダイ寸法', x: 0, y: 0, widthMm: w, heightMm: h, blocks: [] }],
      cfg: { cores: [], l3MB: 0 }, baseCfg: null,
      package: defaultPackage({ kind: 'pc' }),
      mix: { nodeId },
    };
  }

  const isMix = (d) => !!d && d.presetId == null && !!d.origin && d.origin.mode === 'mix';
  const overlap = (a, b) => a.x < b.x + b.w - EPS_MM && b.x < a.x + a.w - EPS_MM && a.y < b.y + b.h - EPS_MM && b.y < a.y + a.h - EPS_MM;
  const fits = (die, r) => r.x >= -EPS_MM && r.y >= -EPS_MM && r.x + r.w <= die.widthMm + EPS_MM && r.y + r.h <= die.heightMm + EPS_MM;

  // 空き領域を探す(左下から。既存ブロックの右端・下端を候補にする)。見つからなければ null。形は正方形 → 横長 → 縦長の順に試す。
  function findSpot(die, area) {
    const shapes = [1, 2, 0.5].map((k) => { const w = Math.sqrt(area * k); return { w, h: area / w }; });
    const xs = [0]; const ys = [0];
    die.blocks.forEach((b) => { xs.push(b.x + b.w); ys.push(b.y + b.h); });
    const uniq = (a) => [...new Set(a.map((v) => Math.round(v * 1e6) / 1e6))].sort((p, q) => p - q);
    for (const s of shapes) for (const y of uniq(ys)) for (const x of uniq(xs)) {
      const r = { x, y, w: s.w, h: s.h };
      if (fits(die, r) && !die.blocks.some((b) => overlap(r, b))) return r;
    }
    return null;
  }

  function nextBlockId(design) {
    let n = 0;
    design.dies.forEach((d) => d.blocks.forEach((b) => { const m = /-p(\d+)$/.exec(b.id); if (m) n = Math.max(n, +m[1]); }));
    return n + 1;
  }

  // ブロック(kind:'core')から cfg を再計算する純関数。同じ (uarch, coreType, sourcePresetId) をグループ化する。
  // group.type は cfg 内で一意(checkCfg の制約)。同じ coreType が複数チップ由来のときは「coreType@プリセット id」にする。
  // group.id = 「プリセット id:coreType」(setBlockClock の指定に使う)。
  const groupIdOf = (b) => `${b.sourcePresetId || 'x'}:${b.coreType}`;
  function deriveCfg(design) {
    const groups = []; const idx = new Map(); let l3 = 0;
    design.dies.forEach((d) => d.blocks.forEach((b) => {
      if (b.kind === 'l3') { l3 += isNum(b.capacityMB) ? b.capacityMB : 0; return; }
      if (b.kind !== 'core') return;
      const key = `${b.sourcePresetId || ''}\u0000${b.coreType}\u0000${b.uarch || ''}`;
      let g = idx.get(key);
      if (!g) {
        g = { id: groupIdOf(b), type: b.coreType, coreType: b.coreType, uarch: b.uarch || undefined, isa: b.isa || undefined, sourcePresetId: b.sourcePresetId || undefined, label: b.label, count: 0, smt: b.smt || 1, _clk: b.clockGHz };
        idx.set(key, g); groups.push(g);
      }
      g.count++;
    }));
    const typeCount = {};
    groups.forEach((g) => { typeCount[g.coreType] = (typeCount[g.coreType] || 0) + 1; });
    const cores = groups.map((g) => {
      const r = {}; Object.keys(g).forEach((k) => { if (k !== '_clk' && g[k] !== undefined) r[k] = g[k]; });
      if (typeCount[g.coreType] > 1) r.type = `${g.coreType}@${g.sourcePresetId || g.id}`;
      if (isNum(g._clk)) r.boostGHz = g._clk;
      return r;
    });
    return { cores, l3MB: l3 };
  }

  const withDerivedCfg = (d) => { d.cfg = deriveCfg(d); return d; };

  const ISA_MIX_REASON = 'x86 と Arm のコアは同じ設計に混在できません(既定)';
  const MAX_SAME_PART = 64; // 同じ部品(partId)のブロック数の上限(コアは同じグループの個数。checkCfg の count と同じ)

  // 部品を置く。opts: { dieId, x, y, count, capacityMB(L3), nodes, allowIsaMix(実験用。true のときだけ x86 と Arm の混在を許す。UI には出さない) }。x,y を省略すると空き領域に自動配置。
  // 置けない(ダイに入らない・重なる・不正な指定)ときは { ok:false, reason }。元の設計は壊さない。
  function addPart(design, part, opts) {
    const o = opts || {};
    if (!isMix(design)) return fail('混合モードの設計にだけ部品を置けます');
    if (!part || typeof part !== 'object' || typeof part.id !== 'string' || typeof part.kind !== 'string') return fail('部品が不正です');
    const d = clone(design);
    const die = o.dieId ? d.dies.find((x) => x.id === o.dieId) : d.dies[0];
    if (!die) return fail(`ダイ「${o.dieId}」がありません`);
    const manual = o.x != null || o.y != null;
    if (manual && !(isNum(o.x) && isNum(o.y))) return fail('配置位置 x, y は有限の数にしてください');
    const n = part.kind === 'core' ? (o.count == null ? 1 : o.count) : 1;
    if (!Number.isInteger(n) || n < 1 || n > 64) return fail('個数は 1〜64 の整数にしてください');
    let cap = null;
    if (part.kind === 'l3') {
      cap = o.capacityMB == null ? part.capacityMB : o.capacityMB;
      if (!isNum(cap) || cap <= 0 || cap > 512) return fail('L3 の容量は 0 より大きく 512 MB 以下の数にしてください');
    }
    if (part.kind !== 'core') {
      const same = d.dies.reduce((t, x) => t + x.blocks.filter((b) => b.partId === part.id).length, 0);
      if (same + 1 > MAX_SAME_PART) return fail(`同じ部品は ${MAX_SAME_PART} 個までです`);
    }
    const total = d.dies.reduce((t, x) => t + x.blocks.length, 0);
    if (total + n > MAX_BLOCKS) return fail(`ブロックが多すぎます(上限 ${MAX_BLOCKS} 個)`);
    if (part.kind === 'core' && part.isa && o.allowIsaMix !== true) {
      // x86 と Arm のコアは同じ設計に混在できない(既定)。読み込んだ設計に混在があれば compat の isa-mix エラーで残る
      const have = new Set(); d.dies.forEach((x) => x.blocks.forEach((b) => { if (b.kind === 'core' && b.isa) have.add(b.isa); }));
      if ([...have].some((i) => i !== part.isa)) return fail(ISA_MIX_REASON);
    }
    if (part.kind === 'core') {
      const same = die.blocks.filter((b) => b.kind === 'core' && b.sourcePresetId === part.sourcePresetId && b.coreType === part.coreType).length;
      if (same + n > 64) return fail('同じ種類のコアは 64 個までです');
    }
    // 面積: 部品の面積(コアは L2 込みがあればそれ)。L3 は 1MB あたり × 容量。プロセスが違えば密度比で換算(移植)
    const a = part.area || {};
    let base = part.kind === 'core' ? (isNum(a.withL2Mm2) ? a.withL2Mm2 : isNum(a.mm2) ? a.mm2 : null) : (isNum(a.mm2) ? a.mm2 : null);
    if (part.kind === 'l3' && base != null) base = isNum(a.perMBMm2) ? a.perMBMm2 * cap : base * (cap / (part.capacityMB || cap));
    const toNode = (d.mix && d.mix.nodeId) || die.nodeId || null;
    const fromNode = part.nodeId || null;
    const ported = !!(fromNode && toNode && fromNode !== toNode);
    let areaMm2 = base; let portConverted = false; let portNote = null; let portInfo = null;
    if (ported && base != null) {
      const C = root.SDS && root.SDS.model && root.SDS.model.compat;
      const nodes = o.nodes || (root.SDS_DATA && root.SDS_DATA.nodes) || [];
      const r = C ? C.portArea(base, fromNode, toNode, nodes) : { ok: false, reason: '換算モジュールがありません' };
      // 密度に幅があるときは面積が大きくなる側(保守的)を採用。元の面積・幅・比も残す
      if (r.ok) { areaMm2 = r.mm2; portConverted = true; portNote = r.note; portInfo = { areaFromMm2: base, areaRangeMm2: r.mm2Range, portRatio: r.ratio }; } else portNote = r.reason;
    }
    const dim = areaMm2 != null && areaMm2 > 0 ? areaMm2 : PLACEHOLDER_MM * PLACEHOLDER_MM;
    const placed = [];
    let seq = nextBlockId(d);
    for (let i = 0; i < n; i++) {
      let r;
      if (manual && i === 0) {
        const sq = Math.sqrt(dim);
        r = { x: o.x, y: o.y, w: sq, h: sq };
        if (!fits(die, r)) return fail('ダイからはみ出します');
        if (die.blocks.some((b) => overlap(r, b))) return fail('ほかのブロックと重なります');
      } else r = findSpot(die, dim);
      if (!r) return fail(`ダイに入りません(空き領域が足りない: ${Math.round(dim * 100) / 100} mm² の部品 ${n - i} 個)`);
      const b = {
        id: `${die.id}-p${seq++}`, kind: part.kind, partId: part.id,
        label: part.kind === 'l3' ? `L3 ${cap}MB` : (part.kind === 'core' ? `${part.uarch} (${part.coreType})` : part.label),
        sourceChip: part.sourceChip || null, sourcePresetId: part.sourcePresetId || null, isa: part.isa || null, sourceMemory: part.sourceMemory || null, fromNodeId: fromNode,
        ported, portConverted, areaMm2, areaOrigin: (part.area && part.area.origin) || 'unknown', x: r.x, y: r.y, w: r.w, h: r.h, schematic: true,
      };
      if (portNote) b.portNote = portNote;
      if (portInfo) Object.assign(b, portInfo);
      if (part.kind === 'core') { b.coreType = part.coreType; b.uarch = part.uarch; b.smt = part.smt || 1; b.clockGHz = isNum(part.defaultClockGHz) ? part.defaultClockGHz : null; }
      if (part.kind === 'l3') b.capacityMB = cap;
      die.blocks.push(b); placed.push(b);
      d.origin.parts.push({ blockId: b.id, partId: part.id, from: part.sourcePresetId || null, ported });
    }
    withDerivedCfg(d);
    // 保存して開けなくなる設計は作らない(checkCfg の上限: コア種別 16 まで・L3 合計 512 MB まで)
    if (d.cfg.cores.length > MAX_DIES) return fail(`コアの種類(グループ)が多すぎます(上限 ${MAX_DIES})`);
    if (d.cfg.l3MB > 512) return fail('L3 の合計容量が 512 MB を超えます');
    return { ok: true, design: d, blockIds: placed.map((b) => b.id) };
  }

  function removeBlock(design, blockId) {
    if (!isMix(design)) return fail('混合モードの設計だけで使えます');
    const d = clone(design);
    let found = false;
    d.dies.forEach((die) => { const n = die.blocks.length; die.blocks = die.blocks.filter((b) => b.id !== blockId); if (die.blocks.length !== n) found = true; });
    if (!found) return fail(`ブロック「${blockId}」がありません`);
    d.origin.parts = d.origin.parts.filter((p) => p.blockId !== blockId);
    withDerivedCfg(d);
    return { ok: true, design: d };
  }

  // 部品(グループ)ごとのクロック。groupId は deriveCfg のグループ id(「プリセット id:coreType」)。範囲は setClock と同じ 0.5〜8 GHz
  function setBlockClock(design, groupId, ghz) {
    if (!isMix(design)) return fail('混合モードの設計だけで使えます');
    if (typeof ghz !== 'number' || !isFinite(ghz) || ghz < 0.5 || ghz > 8) return fail('クロックは 0.5〜8.0 GHz の数にしてください');
    const d = clone(design);
    let hit = 0;
    d.dies.forEach((die) => die.blocks.forEach((b) => { if (b.kind === 'core' && groupIdOf(b) === groupId) { b.clockGHz = ghz; hit++; } }));
    if (!hit) return fail(`コアの種類「${groupId}」はこの設計にありません`);
    withDerivedCfg(d);
    return { ok: true, design: d, relaid: false };
  }

  // ダイ寸法の変更(1〜100 mm)。ブロックがはみ出すなら { ok:false, reason }
  function setDieSize(design, dieId, w, h) {
    if (!isMix(design)) return fail('混合モードの設計だけで使えます');
    const bad = checkDieSize(w, h);
    if (bad) return fail(bad);
    const d = clone(design);
    const die = d.dies.find((x) => x.id === dieId);
    if (!die) return fail(`ダイ「${dieId}」がありません`);
    const out = die.blocks.find((b) => !fits({ widthMm: w, heightMm: h }, b));
    if (out) return fail(`ブロック「${out.label}」がはみ出すため、その大きさにはできません`);
    die.widthMm = w; die.heightMm = h; die.areaMm2 = w * h;
    return { ok: true, design: d };
  }

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
    const mixBad = checkMix(d);
    if (mixBad) return mixBad;
    for (const k of ['cfg', 'baseCfg']) if (d[k] != null) { const r = checkCfg(d[k], k); if (r) return r; }
    if (d.locks != null) {
      if (typeof d.locks !== 'object' || Array.isArray(d.locks)) return 'locks: 形式が違います(オブジェクトではありません)';
      if (typeof d.locks.params !== 'boolean') return 'locks.params は true か false にしてください';
    }
    if (d.package != null) {
      const k = d.package;
      if (typeof k !== 'object' || Array.isArray(k)) return 'package: 形式が違います';
      if (typeof k.coolingId !== 'string') return 'package.coolingId が文字列ではありません';
      if (typeof k.substrateId !== 'string') return 'package.substrateId が文字列ではありません';
      if (k.powerLimitW === undefined) k.powerLimitW = null; // 欠落は制限なしとして受ける
      if (k.powerLimitSource != null && typeof k.powerLimitSource !== 'string') return 'package.powerLimitSource が文字列ではありません';
      if (k.powerLimitW !== null && !(isNum(k.powerLimitW) && k.powerLimitW >= 1 && k.powerLimitW <= 1000)) return 'package.powerLimitW は null か 1〜1000 の数にしてください';
    }
    return null;
  }

  // 由来(origin)と混合(mix)の検証。presetId は文字列か null。mix 設計は origin.parts と mix.nodeId を持つ
  function checkMix(d) {
    if (d.presetId != null && typeof d.presetId !== 'string') return 'presetId が文字列でも null でもありません';
    const o = d.origin;
    if (o != null) {
      if (typeof o !== 'object' || Array.isArray(o)) return 'origin: 形式が違います';
      if (o.parts != null) {
        if (!Array.isArray(o.parts)) return 'origin.parts が配列ではありません';
        if (o.parts.length > MAX_BLOCKS) return 'origin.parts が多すぎます';
        for (let i = 0; i < o.parts.length; i++) {
          const p = o.parts[i]; const t = 'origin.parts の ' + (i + 1) + ' 番目';
          if (!p || typeof p !== 'object' || Array.isArray(p)) return t + ': 形式が違います';
          if (typeof p.blockId !== 'string' || !p.blockId) return t + ': blockId が文字列ではありません';
          if (typeof p.partId !== 'string' || !p.partId) return t + ': partId が文字列ではありません';
          if (p.from != null && typeof p.from !== 'string') return t + ': from が文字列でも null でもありません';
          if (typeof p.ported !== 'boolean') return t + ': ported は true か false にしてください';
        }
      }
    }
    if (o && o.mode === 'mix') {
      if (d.presetId != null) return '混合設計の presetId は null にしてください';
      if (!d.mix || typeof d.mix !== 'object' || Array.isArray(d.mix)) return 'mix がありません(混合設計に必要です)';
      if (d.mix.nodeId != null && typeof d.mix.nodeId !== 'string') return 'mix.nodeId が文字列ではありません';
      if (!Array.isArray(o.parts)) return 'origin.parts がありません(混合設計に必要です)';
      const bad = checkMixBlocks(d);
      if (bad) return bad;
      // ブロックから組み直した cfg にも上限を当てる(グループ数・L3 合計)
      const cfg = deriveCfg(d);
      if (cfg.cores.length > MAX_DIES) return `コアの種類(グループ)が多すぎます(${cfg.cores.length} 個。上限 ${MAX_DIES})`;
      if (cfg.l3MB > 512) return `L3 の合計が大きすぎます(${cfg.l3MB} MB。上限 512 MB)`;
      return null;
    }
    return null;
  }

  // 混合設計のブロック・由来の検証(巨大な値や不整合で評価・描画が壊れないように)。問題があれば日本語の理由、なければ null
  function checkMixBlocks(d) {
    const strOrNull = (v) => v == null || typeof v === 'string';
    const byGroup = new Map(); const blockIds = new Set();
    for (const die of d.dies) {
      for (let j = 0; j < die.blocks.length; j++) {
        const b = die.blocks[j]; const u = `${die.name || die.id} のブロック「${b.label}」`;
        blockIds.add(b.id);
        if (b.clockGHz != null && !(isNum(b.clockGHz) && b.clockGHz >= 0.5 && b.clockGHz <= 8)) return `${u}: clockGHz は null か 0.5〜8 GHz の有限の数にしてください`;
        if (b.areaMm2 != null && !(isNum(b.areaMm2) && b.areaMm2 > 0 && b.areaMm2 <= 1e4)) return `${u}: areaMm2 は null か 0 より大きく 10000 mm² 以下の数にしてください`;
        if (b.capacityMB != null && !(isNum(b.capacityMB) && b.capacityMB > 0 && b.capacityMB <= 512)) return `${u}: capacityMB は 0 より大きく 512 MB 以下の数にしてください`;
        if (b.smt != null && b.smt !== 1 && b.smt !== 2) return `${u}: smt は 1 か 2 にしてください`;
        for (const k of ['isa', 'sourcePresetId', 'sourceChip', 'partId']) if (!strOrNull(b[k])) return `${u}: ${k} が文字列でも null でもありません`;
        for (const k of ['ported', 'portConverted']) if (b[k] != null && typeof b[k] !== 'boolean') return `${u}: ${k} は true か false にしてください`;
        if (b.areaFromMm2 != null && !(isNum(b.areaFromMm2) && b.areaFromMm2 > 0 && b.areaFromMm2 <= 1e4)) return `${u}: areaFromMm2 が不正です`;
        if (b.portRatio != null && !(isNum(b.portRatio) && b.portRatio > 0 && b.portRatio <= 100)) return `${u}: portRatio が不正です`;
        if (b.areaRangeMm2 != null && !(Array.isArray(b.areaRangeMm2) && b.areaRangeMm2.length === 2 && b.areaRangeMm2.every((x) => isNum(x) && x > 0 && x <= 1e4))) return `${u}: areaRangeMm2 が不正です`;
        // 同じ種類(コアは出所とコア種別、それ以外は部品)の個数の上限
        const key = b.kind === 'core' ? `core\u0000${b.sourcePresetId || ''}\u0000${b.coreType || ''}` : `${b.kind || ''}\u0000${b.partId || b.id}`;
        const n = (byGroup.get(key) || 0) + 1; byGroup.set(key, n);
        if (n > MAX_SAME_PART) return `同じ種類のブロックが ${MAX_SAME_PART} 個を超えています(${b.label})`;
      }
    }
    const seen = new Set();
    for (const p of d.origin.parts) {
      if (seen.has(p.blockId)) return `origin.parts の blockId「${p.blockId}」が重複しています`;
      seen.add(p.blockId);
      if (!blockIds.has(p.blockId)) return `origin.parts の blockId「${p.blockId}」に対応するブロックがありません`;
    }
    return null;
  }

  // 編集用パラメータの検証(cfg / baseCfg)。範囲はパラメータ編集(setCoreCount / setClock / setL3)と同じ
  function checkCfg(c, name) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return `${name}: 形式が違います`;
    if (!Array.isArray(c.cores)) return `${name}: cores が配列ではありません`;
    if (c.cores.length > MAX_DIES) return `${name}: コア種別が多すぎます`;
    // 注意: コア種別が空でも通す(apple-m3pro / m3max はコア構成が未取得で cores が空。拒否すると保存した設計が開けなくなる)
    if (!isNum(c.l3MB) || c.l3MB < 0 || c.l3MB > 512) return `${name}: l3MB は 0〜512 MB の有限の数にしてください`;
    const types = new Set();
    for (let i = 0; i < c.cores.length; i++) {
      const g = c.cores[i]; const t = `${name} のコア ${i + 1}`;
      if (!g || typeof g !== 'object' || Array.isArray(g)) return `${t}: 形式が違います`;
      if (typeof g.type !== 'string') return `${t}: type が文字列ではありません`;
      if (types.has(g.type)) return `${t}: コア種別「${g.type}」が重複しています`;
      types.add(g.type);
      if (!Number.isInteger(g.count) || g.count < 1 || g.count > 64) return `${t}: count は 1〜64 の整数にしてください`;
      for (const k of ['baseGHz', 'boostGHz', 'maxGHz']) if (g[k] != null && !(isNum(g[k]) && g[k] >= 0.5 && g[k] <= 8)) return `${t}: ${k} は 0.5〜8 GHz の有限の数にしてください`;
    }
    return null;
  }

  const api = {
    SCHEMA, dieRole, dieSize, fromPreset, clone, validate, serialize, parse,
    cfgFromPreset, ensureCfg, defaultPackage, fromScratch, addPart, removeBlock, setBlockClock, setDieSize, deriveCfg, checkDieSize, isMix, ensurePackage, setCooling, setSubstrate, setPowerLimit, setCoreCount, setClock, setL3, unlock, withCfg, clockOf, relayoutCompute,
  };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.design = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
