// 設計の評価(結果パネル用)。UI に依存しない純関数。Node でテストする。
// 方針: 取れない値は null と理由で返す(推測で埋めない)。電力・温度のモデルは根拠のない仮の既定値で校正が弱い
// (設計書 §5.3.0・§6)ので、powerModel / thermal に**推定(確度:低)として別に**載せ、性能の数値には反映しない。
// 編集後(design.cfg が baseCfg と違う)は性能・電力とも公表値との差を出さない(元の構成に対する相対変化だけ)。
// 配置の編集(ブロックを動かす)では ST/MT/面積/電力は変わらない(再計算しても同じ値)。
(function (root) {
  'use strict';

  const TOLERANCE = 0.10; // 性能の許容誤差 ±10%(設計書 §5.3)

  function sims() { return (root.SDS && root.SDS.sim) || {}; }

  // 起動時に一度だけ作る校正。mode 'rep'(代表 SKU で合わせ、他は検証)。
  function makeContext() {
    const D = root.SDS_DATA || {};
    const S = sims();
    const gb7ByName = {};
    (D.gb7Scores || []).forEach((r) => { gb7ByName[r.name] = r; });
    const presets = D.presets || [];
    const uarch = D.uarch || {};
    const cal0 = S.perf.calibrate(presets, gb7ByName, uarch, 'rep', null);
    const cal = S.perf.calibrateMt(presets, gb7ByName, uarch, cal0);
    return { presets, gb7ByName, uarch, nodes: D.nodes || [], cal };
  }

  const pct = (sim, pub) => (typeof pub === 'number' && pub > 0 && typeof sim === 'number' ? (sim / pub - 1) * 100 : null);

  function evalPerf(kind, preset, ctx, gb7, stOpts) {
    const S = sims();
    const base = { ok: false, score: null, confidence: null, corrSource: null, fallback: false, reason: null, published: null, publishedKind: null, errPct: null, isCalibSample: false };
    // ST は calib フラグ。MT は σ の合わせに実際に使った SKU だけ(calib:true でも MT で使っていない代表 SKU は検証側)
    base.isCalibSample = kind === 'st' ? !!preset.calib : !!(ctx.cal && ctx.cal.mt && (ctx.cal.mt.usedPresets || []).includes(preset.id));
    // 代表 SKU だが MT の σ の合わせには使っていない
    base.calibNotUsedForMt = kind === 'mt' && !!preset.calib && !base.isCalibSample;
    const pubVal = gb7 ? (kind === 'st' ? gb7.single : gb7.multi) : null;
    if (typeof pubVal === 'number') { base.published = pubVal; base.publishedKind = gb7.kind || null; }
    const r = kind === 'st' ? S.perf.stScore(preset, ctx.cal, ctx.uarch, stOpts) : S.perf.mtScore(preset, ctx.cal, ctx.uarch, null);
    if (kind === 'mt') Object.assign(base, { mixedClock: false, uncalibrated: [], threads: null });
    if (!r.ok) { base.reason = r.reason || '計算できません'; return base; }
    Object.assign(base, {
      ok: true, score: r.score, confidence: r.confidence, fallback: !!r.fallback,
      corrSource: kind === 'st' ? r.corrSource : null, corrFrom: kind === 'st' ? (r.corrFrom || null) : null,
      errPct: pct(r.score, pubVal),
      noL3: !!r.noL3 || preset.cfg.l3MB === 0, l3Floor: !!r.l3Floor,
    });
    if (kind === 'st') { base.fGHz = r.fGHz; base.parts = r.parts; } else {
      base.clockFactor = r.clockFactor == null ? 1 : r.clockFactor; base.mixedClock = !!r.mixedClock; base.uncalibrated = r.uncalibrated || []; base.threads = r.threads; base.detail = r.detail;
      base.corrSources = r.detail.map((d) => d.corrSource);
      base.corrFroms = r.detail.map((d) => d.corrFrom || d.corrSource);
    }
    if (pubVal == null) base.reason = '公開値が未取得のため比較できません';
    return base;
  }

  function evalArea(design, ctx) {
    const S = sims();
    const dies = design.dies.map((d) => {
      const known = typeof d.areaMm2 === 'number' && isFinite(d.areaMm2);
      let yieldInfo = { value: null, reason: null };
      if (!known) yieldInfo.reason = '面積が未取得';
      else {
        const node = d.nodeId ? ctx.nodes.find((n) => n.id === d.nodeId) : null;
        const d0 = node && node.d0 && typeof node.d0.v === 'number' ? node.d0 : null;
        if (!node) yieldInfo.reason = 'プロセスノードが未取得';
        else if (!d0) yieldInfo.reason = `${node.name}: 欠陥密度 D0 が未取得`;
        else yieldInfo = { value: S.area.yield(d.areaMm2, d0.v), reason: null, d0: d0.v, d0Source: d0.s, nodeName: node.name };
      }
      return { id: d.id, name: d.name, mm2: known ? d.areaMm2 : null, source: known ? (d.areaSource || null) : null, known, note: d.areaNote || null, yield: yieldInfo };
    });
    const sum = S.area.dieAreaMm2(dies.map((d) => ({ mm2: d.mm2 })));
    let yieldTotal = null; let yieldReason = null;
    const bad = dies.find((d) => d.yield.value == null);
    if (!dies.length) yieldReason = 'ダイがありません';
    else if (bad) yieldReason = `${bad.name}: ${bad.yield.reason}`;
    else yieldTotal = dies.reduce((p, d) => p * d.yield.value, 1);
    return {
      dies, totalMm2: sum.knownCount ? sum.mm2 : null, knownCount: sum.knownCount, unknownCount: sum.unknownCount,
      totalIsPartial: sum.unknownCount > 0 && sum.knownCount > 0,
      reason: sum.knownCount ? (sum.unknownCount ? `${sum.unknownCount} 個のダイは面積が未取得(合計に含まない)` : null) : '面積が未取得',
      yield: yieldTotal, yieldReason,
    };
  }

  function evalPower(preset) {
    const p = preset.power || {};
    const pub = { base: p.base || null, peak: p.peak || null, range: p.range || null };
    const any = pub.base || pub.peak || pub.range;
    return {
      published: pub, reason: any ? null : '消費電力の公表値が未取得',
      model: null, modelReason: '電力モデルは未校正(C_eff・リーク・冷却の既定値に根拠がない)。推定は powerModel(別カード)に載せ、確度は低',
    };
  }

  // 校正の注意を日本語の文にする
  function calibrationWarnings(st, mt) {
    const w = [];
    if (st.ok && (st.corrSource === 'isa' || st.corrFrom === 'isa')) w.push({ level: 'warn', text: 'ST: このマイクロアーキに専用の補正がなく、同じ命令セットの平均で代用しています(確度は低)' });
    if (st.ok && st.fallback) w.push({ level: 'warn', text: 'ST: in-order コアの IPC は根拠のない仮の値です' });
    if (!st.ok) w.push({ level: 'info', text: `ST を計算できません: ${st.reason}` });
    if (mt.ok) {
      w.push({ level: 'warn', text: 'MT: 確度は低です(並列効率 σ は AMD の代表 3 件だけで合わせ、SMT の効果 γ は未校正、メモリ帯域の頭打ちは未実装)' });
      if (mt.fallback) w.push({ level: 'warn', text: 'MT: in-order コアの仮の IPC を含むため信頼できません' });
      if (mt.mixedClock) w.push({ level: 'warn', text: 'MT: 一部のコアのブーストクロックが未取得で基本クロックを使っており、コア種別間でクロックの出所が混在しています(数値が歪みます)' });
      if ((mt.corrFroms || mt.corrSources) && (mt.corrFroms || mt.corrSources).includes('isa')) w.push({ level: 'warn', text: 'MT: 一部のコアは専用の補正がなく、命令セット平均で代用しています' });
    } else w.push({ level: 'info', text: `MT を計算できません: ${mt.reason}` });
    return w;
  }

  // ---- 編集(§3.3 B): design.cfg で置き換えた「実効プリセット」で性能を計算する ----
  const CLOCK_TOL = 0.25; // 校正範囲: クロックは元の ±25%
  const clockOf = (g) => g.boostGHz || g.maxGHz || g.baseGHz || 0;
  const isEdited = (design) => !!(design.cfg && design.baseCfg) && JSON.stringify(design.cfg) !== JSON.stringify(design.baseCfg);

  function effectivePreset(preset, cfg) {
    // 元のプリセットの L3 が未取得(null)で、設計側が 0(cfgFromPreset が未取得を 0 にしている)なら null のまま渡す
    // (0 は「L3 なし」の意味になるので、未取得のプリセットの結果が変わらないようにする)
    const l3MB = (preset.cfg.l3MB == null && cfg.l3MB === 0) ? preset.cfg.l3MB : cfg.l3MB;
    return Object.assign({}, preset, { cfg: Object.assign({}, preset.cfg, { cores: cfg.cores, l3MB }) });
  }

  const EPS = 1e-9; // 境界(ちょうど ±25% / 2 倍 / 半分)を範囲内にするための浮動小数の余裕
  const MAX_CLOCK_MARGIN = 1.05; // 収録チップの最大クロックの 1.05 倍まで

  // 同じ命令セットの収録プリセットの最大クロック(boost/max。無ければ base)。無ければ null
  function maxClockOf(presets, isa) {
    let m = 0;
    (presets || []).forEach((p) => { if (p.isa === isa && p.cfg) (p.cfg.cores || []).forEach((g) => { m = Math.max(m, clockOf(g)); }); });
    return m > 0 ? m : null;
  }

  // 校正した範囲の外か。クロックが元の ±25% 超、コア数が元の 2 倍超または半分未満、L3 が元の 0.5〜2 倍の外、
  // 同じ命令セットの収録チップの最大クロックの 1.05 倍超、元のクロックが未取得なのに入力した場合。
  // opts: { maxClockGHz }(省略可。同じ命令セットの収録プリセットの最大クロック)
  function outOfCalibration(cfg, baseCfg, opts) {
    const out = [];
    const maxClk = opts && opts.maxClockGHz > 0 ? opts.maxClockGHz : null;
    cfg.cores.forEach((g) => {
      const b = baseCfg.cores.find((c) => c.type === g.type);
      if (!b) return;
      const f0 = clockOf(b); const f1 = clockOf(g);
      const field = `core:${g.type}:clock`;
      if (f0 <= 0 && f1 > 0) out.push({ field, reason: `${g.type} コアは元のクロックが未取得のため、入力したクロック ${f1} GHz には根拠がなく、校正した範囲の外です` });
      else if (f0 > 0 && Math.abs(f1 / f0 - 1) > CLOCK_TOL + EPS) out.push({ field, reason: `${g.type} コアのクロック ${f1} GHz は元(${f0} GHz)の ±25% を超えており、校正した範囲の外です` });
      else if (f1 > 0 && Math.abs(f1 - f0) > EPS && maxClk && f1 > maxClk * MAX_CLOCK_MARGIN + EPS) out.push({ field, reason: `${g.type} コアのクロック ${f1} GHz は、収録しているチップの最大クロック(${maxClk} GHz)を超えています` });
      if (b.count > 0 && (g.count > b.count * 2 + EPS || g.count < b.count / 2 - EPS)) out.push({ field: `core:${g.type}:count`, reason: `${g.type} コア数 ${g.count} は元(${b.count})の 2 倍超または半分未満で、校正した範囲の外です` });
    });
    const l0 = baseCfg.l3MB || 0; const l1 = cfg.l3MB || 0;
    if (l0 !== l1) {
      if (l0 === 0) out.push({ field: 'l3', reason: `元は L3 がないのに ${l1} MB に増やしており、校正した範囲の外です` });
      else if (l1 === 0) out.push({ field: 'l3', reason: `元は L3 が ${l0} MB あるのに 0 にしており、校正した範囲の外です` });
      else if (l1 > l0 * 2 + EPS || l1 < l0 / 2 - EPS) out.push({ field: 'l3', reason: `L3 ${l1} MB は元(${l0} MB)の 0.5〜2 倍の外で、校正した範囲の外です` });
    }
    return out;
  }

  // 楽観側に偏る編集か(電力・温度の制限を計算しないので、クロック・コア数・L3 を元より上げた予測は上振れ側)。
  // clockUp: クロックを上げたか(ST に効く)
  function optimisticInfo(cfg, baseCfg) {
    const reasons = []; let clockUp = false;
    cfg.cores.forEach((g) => {
      const b = baseCfg.cores.find((c) => c.type === g.type);
      if (!b) return;
      if (clockOf(g) > clockOf(b) + EPS) { clockUp = true; reasons.push(`${g.type} コアのクロックを元より上げています`); }
      if (g.count > b.count) reasons.push(`${g.type} コア数を元より増やしています`);
    });
    if ((cfg.l3MB || 0) > (baseCfg.l3MB || 0)) reasons.push('L3 容量を元より増やしています');
    return { optimistic: reasons.length > 0, reasons, clockUp };
  }

  const OPTIMISTIC_NOTE = '電力・温度は推定として別カードに載せているが、性能の数値には反映していない(電力制限でこの値に届かない可能性が高い)';

  // ---- 電力・温度の推定(設計書 §6)。精度は低い: 電力モデルは根拠のない仮の既定値で、公表の基本電力に合わせただけ ----
  const POWER_NOTE = '電力モデルは根拠のない仮の既定値で、公表の基本電力に合わせただけ。コア種別間の電力比・V-f 曲線は未校正';
  const THERMAL_NOTE = '冷却の熱抵抗は根拠のない仮置き';
  const maxClockMap = (preset) => { const m = {}; ((preset.cfg && preset.cfg.cores) || []).forEach((g) => { m[g.type] = g.boostGHz || g.maxGHz || g.baseGHz; }); return m; };

  // 校正の powerK は元のプリセット(未編集の構成)の公表基本電力で決め、編集後の構成にも同じ powerK を使う
  // (編集後の構成で合わせ直すと、コア数・クロックの変化が基本電力に吸収されて相対変化が消えるため)
  function evalPowerModel(preset0, preset, edited) {
    const S = sims();
    const mk = (r) => Object.assign({ confidence: 'low', notes: [POWER_NOTE] }, r);
    const cal = S.power.calibratePower(preset0);
    if (!cal.ok) return mk({ ok: false, reason: cal.reason, powerK: null });
    const estAt = (pr) => S.power.chipPower(pr, { powerK: cal.powerK }, maxClockMap(pr), 'all', S.power.CAL_TJ_C);
    const est = estAt(preset);
    if (!est.ok) return mk({ ok: false, reason: est.reason, powerK: cal.powerK });
    const out = mk({ ok: true, estW: est.w, powerK: cal.powerK, calibratedToW: cal.baseW, tjC: S.power.CAL_TJ_C, load: 'all' });
    const peak = preset0.power && preset0.power.peak;
    if (edited) {
      // 編集後の設計に公表値は無い: 公表ピークとの差は出さない(性能側と同じ)
      out.vsPublishedPeak = null; out.vsPublishedPeakReason = '編集後のため公表値とは比べない';
      const b = estAt(preset0);
      if (b.ok && b.w > 0) { out.baseEstW = b.w; out.deltaPct = (est.w / b.w - 1) * 100; }
    } else if (peak && typeof peak.w === 'number' && peak.w > 0) out.vsPublishedPeak = { publishedW: peak.w, estW: est.w, errPct: (est.w / peak.w - 1) * 100, s: peak.s || null };
    return out;
  }

  function evalThermal(design, preset0, preset, pm) {
    const S = sims();
    const V = (root.SDS && root.SDS.model && root.SDS.model.design) || null;
    const pkg = design.package || (V ? V.defaultPackage(preset0) : { coolingId: 'air-tower', substrateId: 'organic', powerLimitW: null });
    const base = { tentative: true, coolingId: pkg.coolingId, substrateId: pkg.substrateId, powerLimitW: pkg.powerLimitW != null ? pkg.powerLimitW : null };
    if (!pm.ok) return Object.assign(base, { ok: false, reason: `電力モデルを校正できないため温度は推定できません: ${pm.reason}`, notes: [THERMAL_NOTE] });
    const r = S.thermal.solveThrottle({ preset, cal: { powerK: pm.powerK }, coolingId: pkg.coolingId, substrateId: pkg.substrateId, powerLimitW: base.powerLimitW });
    if (!r.ok) return Object.assign(base, { ok: false, reason: r.reason, notes: [THERMAL_NOTE] });
    const target = maxClockMap(preset);
    const runaway = r.limitedBy === 'runaway' || r.tjC == null || !isFinite(r.tjC);
    const throttled = !runaway && Object.keys(r.fByType).some((k) => target[k] > 0 && r.fByType[k] < target[k] * 0.999);
    return Object.assign(base, {
      ok: true, limitedBy: r.limitedBy, tjC: r.tjC, tjLastC: r.tjLastC, sustainedGHz: r.fByType, powerW: r.powerW, rTotal: r.rTotal,
      converged: r.converged, feasible: r.feasible, throttled, notes: [THERMAL_NOTE].concat(r.notes || []),
    });
  }

  function addPowerThermal(result, design, preset0, preset, edited) {
    const pm = evalPowerModel(preset0, preset, edited);
    const th = evalThermal(design, preset0, preset, pm);
    result.powerModel = pm; result.thermal = th;
    result.throttled = !!th.throttled;
    result.warnings.push({ level: 'warn', text: '電力・温度は推定(確度:低)' });
    if (th.ok && (th.limitedBy === 'runaway' || th.tjC == null || !isFinite(th.tjC))) result.warnings.push({ level: 'warn', text: '熱暴走の恐れ(温度が収束しません)。持続クロックは推定できません' });
    else if (th.throttled) result.warnings.push({ level: 'warn', text: 'この設計は電力・温度の制限で持続クロックが下がる見込み(性能の数値には反映していない)' });
  }

  // ---- 混合(モード C。設計書 §3.3 C)。design.presetId が null の設計を、design から作る仮想プリセットで評価する ----
  // 混合による性能低下は入れない(U9)。確度は常に low(校正範囲外の構成)。公表値・電力モデル・温度は無い。
  const MIX_NO_POWER = '混合設計には公表電力がなく、電力モデルを校正できません';

  function mixPreset(design) {
    const V = (root.SDS && root.SDS.model && root.SDS.model.design) || null;
    const cfg = (V && V.deriveCfg) ? V.deriveCfg(design) : design.cfg;
    const isas = []; cfg.cores.forEach((g) => { if (g.isa && !isas.includes(g.isa)) isas.push(g.isa); });
    const d0 = design.dies[0];
    return {
      id: 'mix', name: design.name, vendor: '(混合)', isa: isas[0] || null, kind: 'pc',
      cfg: { cores: cfg.cores, l3MB: cfg.l3MB, memory: null },
      dies: [{ name: d0 ? d0.name : '', mm2: d0 && typeof d0.areaMm2 === 'number' ? d0.areaMm2 : null, s: null, nodeId: d0 ? d0.nodeId : null }],
      power: { base: null, peak: null }, gb7: null, calib: false,
    };
  }

  const ISA_MIX_NO_PERF = 'x86 と Arm の混在は配置不可のため性能を出しません';

  function evaluateMix(design, ctx) {
    const S = sims();
    const V = (root.SDS && root.SDS.model && root.SDS.model.design) || null;
    const C = (root.SDS && root.SDS.model && root.SDS.model.compat) || null;
    const BL = (root.SDS && root.SDS.model && root.SDS.model.blocklib) || null;
    const preset = mixPreset(design);
    const area = evalArea(design, ctx);
    const warnings = V ? V.validate(design).map((w) => Object.assign({}, w)) : [];
    if (!ctx.mixParts && BL) ctx.mixParts = BL.build(ctx.presets, (root.SDS_DATA && root.SDS_DATA.blocklibAreas) || [], ctx.nodes);
    const parts = ctx.mixParts || [];
    const compat = C ? C.check(design, parts, ctx.nodes) : [];
    const isaMix = compat.some((c) => c.level === 'error' && c.code === 'isa-mix');
    let st; let mt;
    if (isaMix) {
      // 配置不可の設計(x86 と Arm の混在)では、性能の数値を出さない
      const none = (kind) => Object.assign(evalPerf(kind, Object.assign({}, preset, { cfg: Object.assign({}, preset.cfg, { cores: [] }) }), ctx, null), { ok: false, score: null, confidence: null, reason: ISA_MIX_NO_PERF });
      st = none('st'); mt = none('mt');
    } else {
      // ST: コアごとに計算して最も速いグループ(種別名の順位ではなく実際のスコア)。ISA ごとの補正はグループの isa を使う。
      // 選んだグループの結果をそのまま使うので、部品を置いた順で値は変わらない
      let best = null; let firstReason = null;
      preset.cfg.cores.forEach((g) => {
        const r = S.perf.stScore(Object.assign({}, preset, { isa: g.isa || preset.isa }), ctx.cal, ctx.uarch, { core: g, fGHz: g.boostGHz });
        if (r.ok) { if (!best || r.score > best.score) best = Object.assign({ g }, r); } else if (!firstReason) firstReason = `${g.type}: ${r.reason}`;
      });
      st = evalPerf('st', best ? Object.assign({}, preset, { isa: best.g.isa || preset.isa }) : preset, ctx, null, best ? { core: best.g, fGHz: best.fGHz } : undefined);
      if (!best && !st.ok && firstReason) st.reason = firstReason;
      if (best && st.ok) {
        st.chosen = { type: best.g.type, label: best.g.label || best.g.type, uarch: best.g.uarch || null, isa: best.g.isa || null, fGHz: best.fGHz, corrSource: best.corrSource, custom: !!best.g.coreDefId };
        if (best.g.coreDefId) {
          const cdef = (design.coreDefs || []).find((x) => x.id === best.g.coreDefId);
          Object.assign(st.chosen, { coreDefId: best.g.coreDefId, coreDefName: cdef ? cdef.name : null, baseUarch: best.g.uarch || null });
        }
      }
      mt = evalPerf('mt', preset, ctx, null);
      if (mt.ok && mt.detail) mt.detail.forEach((dt) => { const g = preset.cfg.cores.find((x) => x.type === dt.type); dt.label = (g && (g.label || g.type)) || dt.type; });
    }
    [st, mt].forEach((r) => {
      r.isMix = true; r.edited = false; r.published = null; r.publishedKind = null; r.errPct = null; r.isCalibSample = false; r.calibNotUsedForMt = false;
      if (r.ok) { r.confidence = 'low'; r.reason = '混合設計の予測値のため公開値はありません'; }
    });
    // 面積: 使用率と、ブロックごとの面積の区分(出所 class = table/estimated/unknown と、移植の換算の有無 portConverted の 2 軸)
    const util = C ? C.utilization(design) : { dieMm2: null, usedMm2: 0, ratio: null, unknownCount: 0 };
    const blocks = []; let portedCount = 0;
    design.dies.forEach((die) => die.blocks.forEach((b) => {
      const known = typeof b.areaMm2 === 'number' && isFinite(b.areaMm2);
      const cls = !known ? 'unknown' : (b.areaOrigin === 'table' || b.areaOrigin === 'estimated' || b.areaOrigin === 'derived' ? b.areaOrigin : 'unknown');
      const conv = known && !!b.ported && !!b.portConverted;
      if (conv) portedCount++;
      blocks.push({
        blockId: b.id, label: b.label, mm2: known ? b.areaMm2 : null, class: cls, ported: !!b.ported, portConverted: conv, origin: b.areaOrigin || 'unknown',
        areaFromMm2: typeof b.areaFromMm2 === 'number' ? b.areaFromMm2 : null, areaRangeMm2: Array.isArray(b.areaRangeMm2) ? b.areaRangeMm2.slice() : null, portRatio: typeof b.portRatio === 'number' ? b.portRatio : null,
      });
    }));
    area.mix = { dieMm2: util.dieMm2, usedMm2: util.usedMm2, usedMinMm2: util.usedMinMm2, utilization: util.ratio, utilizationMin: util.ratioMin, unknownCount: util.unknownCount, portedCount, blocks };
    area.recomputed = false;
    compat.forEach((c) => warnings.push(Object.assign({}, c)));
    warnings.push({ level: 'warn', text: '混合設計の性能は確度:低です(校正した範囲の構成ではないため。ST は最も速いコア、MT は各コアの寄与の合算)' });
    // 自作コア(設計書 §3.7.7): 注意帯 2〜5。校正範囲外・上振れ側は定義ごとに判定する
    const CD = (root.SDS && root.SDS.model && root.SDS.model.coredef) || null;
    const usedDefs = []; preset.cfg.cores.forEach((g) => { const x = g.coreDefId && (design.coreDefs || []).find((y) => y.id === g.coreDefId); if (x && !usedDefs.includes(x)) usedDefs.push(x); });
    let ooc = []; const optReasons = [];
    if (usedDefs.length && CD) {
      warnings.push({ level: 'warn', text: `自作コアの性能は基準コア(${usedDefs.map((x) => x.base.uarch).join('、')})の補正を借りた推定です。幅・ROB・L2 の変更の効果は検証できていません` });
      if (blocks.some((b) => b.origin === 'derived')) warnings.push({ level: 'warn', text: '自作コアの面積は範囲です(ロジックの上限は仮定で、データから導けません)' });
      usedDefs.forEach((x) => {
        CD.outOfCalibration(x, { presets: ctx.presets }).forEach((o) => { ooc.push(o); warnings.push({ level: 'warn', text: `校正した範囲の外: ${o.reason}(確度は低)` }); });
        CD.optimisticInfo(x).reasons.forEach((t) => { optReasons.push(t); warnings.push({ level: 'warn', text: `上振れ側の予測: ${x.name}: ${t}` }); });
      });
    }
    if (usedDefs.length || (design.origin && design.origin.entry === 'new')) warnings.push({ level: 'info', text: '電力・温度・最大クロックは出していません' });
    return {
      st, mt, area, isMix: true, published: null, errPct: null, compat,
      power: { published: { base: null, peak: null, range: null }, reason: '混合設計には公表電力がありません', model: null, modelReason: MIX_NO_POWER },
      warnings: warnings.concat(calibrationWarnings(st, mt)), preset: null, tolerance: TOLERANCE, edited: false, outOfCalibration: ooc, optimistic: optReasons.length > 0, optimisticReasons: optReasons, throttled: false,
      powerModel: { ok: false, reason: MIX_NO_POWER, confidence: 'low', notes: [POWER_NOTE] },
      thermal: { ok: false, reason: MIX_NO_POWER, tentative: true, notes: [THERMAL_NOTE] },
    };
  }

  function evaluate(design, ctx) {
    if (design.presetId == null && design.origin && design.origin.mode === 'mix') return evaluateMix(design, ctx);
    const preset0 = ctx.presets.find((p) => p.id === design.presetId) || null;
    const hasCfg = !!(preset0 && design.cfg && Array.isArray(design.cfg.cores));
    const edited = hasCfg && isEdited(design);
    const preset = hasCfg ? effectivePreset(preset0, design.cfg) : preset0;
    const V = (root.SDS && root.SDS.model && root.SDS.model.design) || null;
    const area = evalArea(design, ctx);
    const warnings = V ? V.validate(design).map((w) => Object.assign({}, w)) : [];
    if (!preset) {
      const none = (r) => ({ ok: false, score: null, confidence: null, corrSource: null, fallback: false, reason: r, published: null, publishedKind: null, errPct: null });
      const reason = '元のプリセットが見つかりません(性能・電力は評価しません)';
      warnings.push({ level: 'info', text: reason });
      return { st: none(reason), mt: Object.assign(none(reason), { mixedClock: false, uncalibrated: [] }), area, power: { published: { base: null, peak: null, range: null }, reason, model: null, modelReason: '電力モデルは未校正' }, warnings, preset: null, tolerance: TOLERANCE, throttled: false, powerModel: { ok: false, reason, confidence: 'low', notes: [POWER_NOTE] }, thermal: { ok: false, reason, tentative: true, notes: [THERMAL_NOTE] } };
    }
    const gb7 = preset.gb7 ? ctx.gb7ByName[preset.gb7] || null : null;
    const st = evalPerf('st', preset, ctx, gb7);
    const mt = evalPerf('mt', preset, ctx, gb7);
    const result = { st, mt, area, power: evalPower(preset0), warnings: warnings.concat(calibrationWarnings(st, mt)), preset: preset0, tolerance: TOLERANCE, edited: false, outOfCalibration: [], optimistic: false, optimisticReasons: [] };
    if (hasCfg) {
      [st, mt].forEach((r) => { r.edited = edited; r.basePublished = r.published; });
      area.recomputed = false;
    }
    if (edited) {
      result.edited = true;
      // 編集後の設計に公開値は無い: 公開値との差は出さず、元のチップの値は basePublished に残す
      [st, mt].forEach((r) => { r.published = null; r.publishedKind = null; r.errPct = null; r.isCalibSample = false; r.calibNotUsedForMt = false; if (r.ok) r.reason = '編集後の予測値のため公開値はありません'; });
      area.recomputedReason = 'コア別面積は未取得のため編集では再計算しない';
      result.power.recomputed = false;
      result.warnings.push({ level: 'warn', text: '編集後の数値は予測です。公開値ではありません' });
      result.warnings.push({ level: 'info', text: '編集で変わるのは性能のみです。面積・公表電力・歩留まりは再計算していません(コア別面積が未取得のため)' });
      const ooc = outOfCalibration(design.cfg, design.baseCfg, { maxClockGHz: maxClockOf(ctx.presets, preset0.isa) });
      result.outOfCalibration = ooc;
      if (ooc.length) {
        [st, mt].forEach((r) => { if (r.ok) r.confidence = 'low'; });
        ooc.forEach((o) => result.warnings.push({ level: 'warn', text: `校正した範囲の外: ${o.reason}(確度は低)` }));
      }
      const opt = optimisticInfo(design.cfg, design.baseCfg);
      result.optimistic = opt.optimistic; result.optimisticReasons = opt.reasons;
      if (opt.optimistic) {
        mt.confidence = mt.ok ? 'low' : mt.confidence;
        if (opt.clockUp && st.ok) st.confidence = 'low';
        result.warnings.push({ level: 'warn', text: `楽観側の予測: ${OPTIMISTIC_NOTE}` });
      }
    }
    addPowerThermal(result, design, preset0, preset, edited);
    return result;
  }

  const api = { TOLERANCE, CLOCK_TOL, OPTIMISTIC_NOTE, makeContext, evaluate, outOfCalibration, optimisticInfo, maxClockOf, isEdited };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.evaluate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
