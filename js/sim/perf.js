// 性能モデル(設計書 §5)。UI に依存しない純関数。
// CPI を「基本 + 分岐 + メモリ」で積み上げ、クロックを掛けて Geekbench 7 の ST スコアにする(§5.2.1)。
// 絶対値の合わせ込みは uarch ごとの補正 u(§5.3)に集約する。以下の参照値(mpki など)は
// **Geekbench 7 の実際の負荷特性ではなく、校正前の仮の既定値**(DEFAULT_PARAMS)。u がその差を吸収する。
(function (root) {
  'use strict';

  // 校正前の仮の既定値。値の根拠はなく、モデルの形を決めるためのもの(設計書 §5.2.1 に明記)。
  const DEFAULT_PARAMS = {
    aIlp: 0.55, bIlp: 0.5,      // ILP 窓: 並列度 = aIlp × ROB^bIlp
    mpkiBr: 4,                  // 1000 命令あたり分岐ミス
    brOverlap: 0.3,             // 分岐ミスの一部は隠れる
    brPenaltyDefault: 15,       // brPenalty が未取得のコアに使う
    mpkiL1: 14, l1Ref: 32,      // L1 ミス/kI(参照容量 KB)
    mpkiL2: 3.5, l2Ref: 512,    // L2 ミス/kI(参照容量 KB)
    mpkiL3: 0.9, l3Ref: 2048,   // L3 ミス/kI(スレッドあたりの L3 容量 KB の参照)
    capExp: -0.5,               // √2 則: ミス率 ∝ 容量^-0.5
    dramNs: 85,                 // DRAM 遅延(時間固定。サイクル数はクロックに比例)
    l2LatDefault: 13, l3LatDefault: 40, mshrDefault: 10, kMlp: 48,
    inOrderIpc: 0.8,            // in-order コア(A55 系)の仮の IPC(根拠なし。fallback:true を結果に付ける)
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // コア 1 個の CPI 内訳。u: マイクロアーキ記録(data/uarch.js)。
  // opts: { fGHz, l3KBPerThread, noL3, params }。noL3=true は「L3 なし」(L2 ミスがそのまま DRAM へ行く。L3 の遅延の項も使わない)。
  // l3KBPerThread が未指定(null)で noL3 でもないときは、従来どおり参照値(l3Ref)で計算する(L3 容量が未取得のプリセット用)。
  function coreCpi(u, opts) {
    const p = Object.assign({}, DEFAULT_PARAMS, opts.params || {});
    const f = opts.fGHz;
    if (!u) return { ok: false, reason: 'uarch 未指定', ipc: null };
    if (!(f > 0)) return { ok: false, reason: 'クロック未取得', ipc: null };
    if (u.inOrder) {
      return { ok: true, fallback: true, confidence: 'low', cpi: 1 / p.inOrderIpc, ipc: p.inOrderIpc, parts: { base: 1 / p.inOrderIpc, br: 0, mem: 0 }, note: 'in-order コアは仮の IPC(根拠なし)' };
    }
    const ilp = u.rob ? p.aIlp * Math.pow(u.rob, p.bIlp) : null;
    // 発行幅 W が未取得なら decodeWidth を上限に使う(ROB 由来の並列度だけだと幅が過大になる。§5.2.1)。両方無ければ ROB だけ。
    const w = u.width || u.decodeWidth || null;
    let ceil;
    if (w && ilp) ceil = Math.min(w, ilp);
    else if (w) ceil = w;
    else if (ilp) ceil = ilp;
    else return { ok: false, reason: '幅・ROB が未取得のため計算できない' };
    const base = 1 / ceil;
    const br = (p.mpkiBr / 1000) * (u.brPenalty != null ? u.brPenalty : p.brPenaltyDefault) * (1 - p.brOverlap);
    const l1KB = u.l1dKB || p.l1Ref;
    const l2KB = u.l2KB || p.l2Ref;
    const l3KB = opts.l3KBPerThread || p.l3Ref;
    const m1 = p.mpkiL1 * Math.pow(l1KB / p.l1Ref, p.capExp);   // L1 ミス → L2 へ
    const m2 = p.mpkiL2 * Math.pow(l2KB / p.l2Ref, p.capExp);   // L2 ミス → L3 へ
    const m3 = opts.noL3 ? m2 : Math.min(m2, p.mpkiL3 * Math.pow(l3KB / p.l3Ref, p.capExp));   // L3 ミス → DRAM へ(L3 なしなら L2 ミスがそのまま DRAM へ。L3 のミスが L2 のミスを超えることはない)
    const mlp = clamp(Math.min(u.mshr || p.mshrDefault, u.rob ? u.rob / p.kMlp : 99), 1, 16);
    const withoutL3 = (m1 * (u.l2Lat != null ? u.l2Lat : p.l2LatDefault) + m2 * p.dramNs * f) / 1000; // L3 なし: L2 ミスがそのまま DRAM へ
    let memCycles = withoutL3; let l3Floor = false;
    if (!opts.noL3) {
      memCycles = (m1 * (u.l2Lat != null ? u.l2Lat : p.l2LatDefault) + m2 * (u.l3Lat != null ? u.l3Lat : p.l3LatDefault) + m3 * p.dramNs * f) / 1000;
      // 容量が明示された L3 は「L3 なしより悪くならない」とする(スレッドあたりの容量が極端に小さいと、L3 の遅延の分だけ L3 なしより遅く出るのを防ぐ。L3 の容量に対して単調になる)
      if (opts.l3KBPerThread && memCycles > withoutL3) { memCycles = withoutL3; l3Floor = true; }
    }
    const mem = memCycles / mlp;
    const cpi = base + br + mem;
    const missing = ['width', 'rob', 'brPenalty', 'l2Lat', 'l3Lat', 'mshr'].filter((k) => u[k] == null);
    return {
      ok: true, confidence: missing.length >= 4 ? 'low' : missing.length >= 2 ? 'medium' : 'high',
      cpi, ipc: 1 / cpi, parts: { base, br, mem }, missing, l3Floor,
    };
  }

  // プリセット/設計の「最速コア」: 種別 P(または super / プライム)で最大クロックのコア。
  function topCore(cores) {
    const clk = (c) => c.boostGHz || c.maxGHz || c.baseGHz || 0;
    const rank = (c) => ({ P: 3, super: 3, performance: 2, M: 2, M2: 2, C: 1, E: 1, 'LP-E': 0 }[c.type] ?? 1);
    return cores.slice().sort((a, b) => rank(b) - rank(a) || clk(b) - clk(a))[0] || null;
  }

  // 【2026-11-16 Ryzen X3D の CCD 別 L3 と ST の CCD 指定(任意の cfg 項目。9950X3D・7950X3D だけ。ユーザー決定「7950X3D 用に CCD 別 L3 と ST の CCD 指定を入れる」。調査 docs/research/ryzen-x3d-2026-11-15.md §4.3)】
  // cfg.l3CcdMB: CCD ごとの L3 容量 [MB](添字 = CCD 番号。例 [96, 32] = V-Cache 付き CCD 96MB + 通常 CCD 32MB。合計が cfg.l3MB)。cfg.cores[].ccd: そのコア記述が載る CCD 番号。cfg.stCcd: ST を実行する CCD 番号。
  // ST はその CCD の記述のクロックと L3(÷1 スレッド)で計算し、MT は各記述の L3 を「自分の CCD の L3 ÷ 自分の CCD の総スレッド数」にする。
  // 項目の無い SKU・旧保存データ・混合設計は従来どおり(l3Ccds の均等割り・最速コア)。設計の編集で l3MB が変わったときは l3CcdMB を比例して縮尺する。
  function l3CcdOf(cfg, core) {
    const a = cfg && cfg.l3CcdMB;
    if (!Array.isArray(a) || !core || !Number.isInteger(core.ccd) || !(a[core.ccd] > 0)) return null;
    const sum = a.reduce((t, x) => t + (x > 0 ? x : 0), 0);
    const k = cfg.l3MB > 0 && sum > 0 && Math.abs(cfg.l3MB - sum) > 1e-9 ? cfg.l3MB / sum : 1;
    const mb = a[core.ccd] * k;
    return { mb, big: a.every((x) => !(x * k > mb + 1e-9)) };
  }
  // ST を実行するコア記述: cfg.stCcd の CCD に載るもの。無ければ最速コア
  function stCoreOf(cfg) {
    const cs = (cfg && cfg.cores) || [];
    if (cfg && Number.isInteger(cfg.stCcd)) { const g = cs.find((c) => c.ccd === cfg.stCcd); if (g) return g; }
    return topCore(cs);
  }

  function memoryApi() {
    if (root.SDS && root.SDS.sim && root.SDS.sim.memory) return root.SDS.sim.memory;
    if (typeof require === 'function') return require('./memory.js');
    return { evaluate: () => ({ active: false }) };
  }

  // シングルコア性能。cal: { u: {uarch→補正}, uIsa: {isa→既定補正} }。opts.noMemory: メモリ構成の補正を掛けない(MT の内部呼び出し用)
  function stScore(preset, cal, uarchDb, opts) {
    const core = (opts && opts.core) || stCoreOf(preset.cfg);
    if (!core) return { ok: false, reason: 'コアなし' };
    const f = (opts && opts.fGHz) || core.boostGHz || core.maxGHz || core.baseGHz;
    if (!f) return { ok: false, reason: 'クロック未取得' };
    // 自作コア(設計書 §3.7.3)は複製時の uarch 記録を core.uRecord に持つ。無ければ従来どおり uarchDb を引く
    const isClone = !!core.uRecord;
    const u = core.uRecord || uarchDb[core.uarch];
    // ST は 1 スレッドが L3 を使う想定(全量)。MT のときだけ呼び出し側が threads=総スレッド数を渡して C_L3/N にする(§5.2.2)
    const threads = (opts && opts.threads) || 1;
    // l3MB が明示的に 0 なら「L3 なし」。null/undefined(未取得)は従来どおり参照値で計算する
    // 【2026-11-15 Lunar Lake の l3Types(任意の cfg 項目。例: ['P'])】L3 につながるコア種別。あると、そこに無い種別のコア(Lunar Lake の LP-E)は noL3 扱いにし、MT の L3 はその種別の総スレッド数(opts.l3Threads。mtScore が渡す)で割る。
    // 無い SKU・旧保存データ・混合設計は従来どおり(全コアが L3 を使い、総スレッド数で割る)。ST は最速コアが l3Types に入っていれば不変。設計書 §5.3.0【2026-11-15 Lunar Lake の l3Types】
    const l3Types = Array.isArray(preset.cfg.l3Types) && preset.cfg.l3Types.length ? preset.cfg.l3Types : null;
    const noL3 = preset.cfg.l3MB === 0 || (!!l3Types && !l3Types.includes(core.type));
    // チップレット(複数 CCD)の SKU は cfg.l3Ccds(CCD 数)を持つ。ST(threads=1)は 1 CCD 分(l3MB ÷ l3Ccds)だけを L3 容量にする。
    // 別 CCD の L3 はそのコアの L3 容量として使えない(IO ダイ経由のコア間転送のみ)ため、別 CCD 分は割引しても足さない(§5.3.3 G の3)。
    // MT は総 L3 ÷ 総スレッド数のまま(各 CCD の L3 を自分の CCD のスレッドで使うのと同じ値)。l3Ccds が無い SKU は従来どおり全量
    // cfg.l3CcdMB(CCD ごとの L3。2026-11-16)があり、コアが ccd を持つときは、その CCD の L3 ÷ (ST は 1、MT は mtScore が渡す自分の CCD のスレッド数)
    const ccdL3 = preset.cfg.l3MB ? l3CcdOf(preset.cfg, core) : null;
    const ccds = !ccdL3 && threads === 1 && preset.cfg.l3Ccds > 1 ? preset.cfg.l3Ccds : 1;
    const l3KB = ccdL3 ? (ccdL3.mb * 1024) / ((opts && opts.l3Threads) || 1) : preset.cfg.l3MB ? (preset.cfg.l3MB * 1024) / ccds / ((opts && opts.l3Threads) || threads) : null;
    // メモリ構成(§5.2.4)。選択が基準構成なら係数 1 で何も変えない。遅延は dramNs の差し替え(85 × lat(選択)/lat(基準))で入れ、帯域は後から ^bST を掛ける。
    // MT の呼び出し(opts.noMemory)では掛けない(MT は和にまとめて ^bMT を掛けるため。二重計上しない)
    const mem = opts && opts.noMemory ? null : memoryApi().evaluate(preset);
    let params = cal && cal.params;
    // 【2026-11-15 プラットフォームの DRAM 遅延(ST だけ。[二次]・[推定]。ユーザー指示「ST ×0.90 ではなく IPC で計算するようにして」)】preset.cfg.dramLat = { ns, s, src, cfg } があれば、dramNs(既定 85ns 固定)をその値にし、その上に mem.dramScale を掛ける。
    // 遅延は DRAM の種別ではなくプラットフォーム(メモリコントローラ・ファブリック)で決まる(デスクトップの DDR5 は 70〜88ns、ノートは 103〜148ns)。dramLat が無い SKU・旧保存データ・混合設計は従来どおり 85ns。MT の内部呼び出し(opts.noMemory)にも入れない(MT は連続式の c の再校正が要るため別判断)。設計書 §5.2・§5.3.0【2026-11-15 DRAM 遅延】
    const dl = !(opts && opts.noMemory) && preset.cfg && preset.cfg.dramLat && typeof preset.cfg.dramLat.ns === 'number' && preset.cfg.dramLat.ns > 0 ? preset.cfg.dramLat : null;
    if (dl) params = Object.assign({}, params || {}, { dramNs: dl.ns });
    if (mem && mem.active && mem.dramScale !== 1) params = Object.assign({}, params || {}, { dramNs: Object.assign({}, DEFAULT_PARAMS, params || {}).dramNs * mem.dramScale });
    const r = coreCpi(u, { fGHz: f, l3KBPerThread: l3KB, noL3, params });
    if (!r.ok) return { ok: false, reason: r.reason };
    let corr = cal && cal.u && cal.u[core.uarch];
    let corrSource = 'uarch';
    // 同じコア設計の派生(Zen 5c など)は uarch.js の uFrom で借り先の uarch の u を使う(代表の u が無く借り先にあるときだけ。ISA 平均より先。設計書 §5.3.3 K)
    let corrUFrom = null; let corrUarch = null; // corrUarch(2026-11-15): ratio のコア自身の uarch 名(借り先が同じ Zen 3 の Cezanne と Zen 3+ の注記を分けるため。ratio のときだけ付く)
    if (corr == null && u && u.uFrom && cal && cal.u && cal.u[u.uFrom] != null) { corr = cal.u[u.uFrom]; corrUFrom = u.uFrom; }
    // 別の uarch の u に比を掛ける(uarch.js の uRatioOf・uRatio。2026-11-13 Arrow Lake のリング接続 E = Lion Cove の u × 0.90。借り先の u が動けば連動)。corrSource は 'ratio':
    // 比は MT から合わせた校正値で出典つきの u ではないため、calibrateMt の「全コア uarch 専用」の判定(corrSource === 'uarch')に通らず、σ の代表に入らない(循環を避ける。設計書 §5.3.0)
    if (corr == null && u && u.uRatioOf && typeof u.uRatio === 'number' && cal && cal.u && cal.u[u.uRatioOf] != null) { corr = cal.u[u.uRatioOf] * u.uRatio; corrSource = 'ratio'; corrUFrom = u.uRatioOf; corrUarch = core.uarch; }
    if (corr == null) { corr = cal && cal.uIsa && cal.uIsa[core.isa || preset.isa]; /* 混合設計ではコアごとの isa(core.isa)を優先。通常のプリセットのコアには isa が無い */ corrSource = 'isa'; }
    const corrFrom = corrSource; // 補正の借り先('uarch'・'ratio'・'isa')。自作コアでは corrSource を 'clone' にするので別に残す
    if (isClone) corrSource = 'clone';
    if (corr == null) return { ok: false, reason: '補正係数なし(校正データ不足)' };
    const memActive = !!(mem && mem.active);
    return {
      ok: true, score: corr * r.ipc * f * (memActive ? mem.stBwFactor : 1), ipc: r.ipc, fGHz: f, corr, ...(dl ? { dramLat: dl } : {}), ...(memActive ? { memory: mem } : {}), corrSource, ...(corrUFrom ? { corrUFrom } : {}), ...(corrUarch ? { corrUarch } : {}), ...(isClone ? { corrFrom, clone: true } : {}), core, noL3, l3Floor: !!r.l3Floor, l3Ccds: !noL3 && ccds > 1 ? ccds : null, ...(ccdL3 ? { l3CcdMB: ccdL3.mb, l3CcdBig: ccdL3.big, ccd: core.ccd } : {}),
      confidence: isClone || corrSource === 'isa' || corrSource === 'ratio' ? 'low' : r.confidence, parts: r.parts, missing: r.missing,
      ...(r.fallback ? { fallback: true, note: r.note } : {}),
    };
  }

  // 校正。mode 'rep': calib:true のプリセットだけで u を決め、他は検証に使う(§5.3.1)。
  //        mode 'all': GB7 のある全プリセットの中央値で u を決める(再現モード用。検証にならない)。
  function calibrate(presets, gb7ByName, uarchDb, mode, params) {
    if (mode !== 'rep' && mode !== 'all') throw new Error(`calibrate: mode は 'rep' か 'all'(受け取った値: ${mode})`);
    const samples = {}; // uarch → [u 値]
    const isaSamples = {};
    const usedPresets = {}; // uarch → [preset id]
    presets.forEach((p) => {
      if (!p.gb7 || !gb7ByName[p.gb7]) return;
      if (mode === 'rep' && !p.calib) return;
      const core = topCore(p.cfg.cores || []);
      if (!core || !core.uarch) return;
      const raw = stScore(p, { u: { [core.uarch]: 1 }, params }, uarchDb);
      if (!raw.ok || raw.fallback) return; // 仮の IPC のコアは補正係数の元データにしない
      const u = gb7ByName[p.gb7].single / raw.score;
      (usedPresets[core.uarch] = usedPresets[core.uarch] || []).push(p.id);
      (samples[core.uarch] = samples[core.uarch] || []).push(u);
      (isaSamples[p.isa] = isaSamples[p.isa] || []).push(u);
    });
    const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
    const geo = (a) => Math.exp(a.reduce((s, x) => s + Math.log(x), 0) / a.length);
    const u = {}; Object.keys(samples).forEach((k) => { u[k] = median(samples[k]); });
    // 校正済み定数(uarch.js の uCal。M6 第 4 段): 代表の u が無い uarch にだけ当てる。代表の u がある uarch は代表を優先。
    // mode 'all' でも同様(その uarch に標本があれば標本の中央値が優先)。定数は代表ではないので usedPresets・n・uIsa には入れない
    const uFixed = {};
    Object.keys(uarchDb).forEach((name) => {
      const c = uarchDb[name].uCal;
      if (c && typeof c.u === 'number' && u[name] == null) { u[name] = c.u; uFixed[name] = { u: c.u, n: c.n, date: c.date, excluded: Array.isArray(c.excluded) ? c.excluded.slice() : [] }; }
    });
    const uIsa = {}; Object.keys(isaSamples).forEach((k) => { uIsa[k] = geo(isaSamples[k]); });
    // isValidation: 'rep' は代表で合わせて別 SKU で検証できる。'all' は全 SKU に合わせるので、その誤差は検証にならない(再現モード用)
    const n = {}; Object.keys(samples).forEach((k) => { n[k] = samples[k].length; });
    return { u, uIsa, params, mode, isValidation: mode === 'rep', n, usedPresets, uFixed };
  }

  // 校正前の仮の既定値(根拠なし)。mtScore の結果に uncalibrated として出す。メモリ帯域の頭打ち(§5.2.2 の BW_mem/B_score)は未実装。
  // 【2026-11-10 gammaSmt 0.25 → 0.30(ユーザー判断 A)】SMT の効果 γ は出典つきの実測がなく、校正の代表 4 件(1800X・5800X・7700・9700X)は全部 SMT ありで σ と分離できない(代表の誤差は γ によらず同じ)。
  // γ は 26 件の x86 デスクトップ(GB7 マルチのあるもの)の MAE で選んだ [推定・校正値]: 0.25 → 5.16、0.275 → 4.76、0.30 → 4.48、0.325 → 4.28、0.35 → 4.23(±10% 外は 0.25 で 2 件、0.275〜0.325 で 1 件)。
  // 0.30 は Arrow Lake(SMT なし)が ±10% に入る最小の γ に近い値で、MAE の最小(0.35〜0.375)よりは控えめ。検証用の SKU に合わせた値で、出典のある実測ではない。σ は新しい γ で代表から決め直す(calibrateMt)。docs/research/arrow-lake-mt-2026-11-10.md・gamma-smt-2026-11-10.md
  const MT_DEFAULTS = { sigma: 0.004, gammaSmt: 0.30 };

  // MT の持続クロック係数(§5.3.0)。全コア負荷時のクロック = 係数 × boost。[推定・校正値]で、実際の熱・電力制限を表すものではない。
  // preset.kind で引く(pc=1.0 に丸める。kind なし・混合設計・embedded・server は 1.0)。fByType を明示指定したときは掛けない。
  // 'mobile'(スマホ SoC)は一律 0.91。'mobile-pc' の 0.81 は x86 で電力が未取得のときのフォールバック(§5.3.3 G の1)で、mobile とは別の値(変えない)。Arm の mobile-pc で電力が未取得のときは 0.81 ではなく mobile と同じ値(armFlat。2026-11-14)。
  // 【2026-11-07 再校正 mobile 0.81 → 0.92】ユーザー指示「NG になっているものも修正して」。kind==='mobile' で MT が計算でき公開値がある 18 件(qc-855/865/888/8gen1/8plus-gen1/8gen2/8elite/8elite-gen5/8elite-x-gen6/780g/7gen1/7gen3/720g/6gen1/4gen2、
  // mt-9000/9200/8200)について、予測が公開値と一致する係数を二分法で逆算した中央値が 0.925(範囲 0.629〜1.292)。0.92 にすると MT の ±10% 外が 15 件 → 9 件。
  // 世代でばらつく(8 Elite 系 0.63〜0.76、古い 855/865/888/720G は 1.1〜1.3)ので 1 つの係数では表せない。チャート値からの逆算で偏りを含む。[推測・未検証]。docs/research/mobile-mt-factor-2026-11-07.md
  // 【2026-11-07 再々校正 mobile 0.92 → 0.91】ユーザー指示「NG の原因をできれば特定して直して」。Zen+ の uFrom・Zen 3 の代表・Arm の u(Oryon Performance の uFrom、A76/A77/X1 の代表、A78 の uCal)・Arrow Lake の L3 遅延を直した後に、
  // 同じ 18 件で逆算し直した中央値が 0.912(範囲 0.748〜1.036)。小数 2 桁で 0.91。直前の 0.92 は u の直し前の値。推測・未検証(チャート値からの逆算で偏りを含む)。docs/research/mobile-mt-factor-2026-11-07.md
  // 【2026-11-10 γ=0.30(ユーザー判断 A)に合わせて再校正 mobile 0.91 → 0.94】同じ 18 件で逆算し直した中央値 0.936(範囲 0.767〜1.065)。σ・γ が変わると MT の絶対値が変わるため。推測・未検証(チャート値からの逆算で偏りを含む)
  // 【2026-11-13 PC 系 CPU の GB7 の Windows のみ化 第 2 回(1800X の MT 公開値 6671 → 7203 で σ 0.03306 → 0.03183)に合わせて再校正 mobile 0.94 → 0.93】同じ 18 件で逆算し直した中央値 0.931(範囲 0.763〜1.058)。σ が変わると MT の絶対値が変わるため。推測・未検証(チャート値からの逆算で偏りを含む)
  // 【2026-11-14 Android の GB7 公開値を通常の群の中央値に取り直し(設計書 §2.4)、Oryon Performance の記録・Cortex-A78 の uCal 122.5 を直したあとで再校正 mobile 0.93 → 0.91】同じ 18 件で逆算し直した中央値 0.911(範囲 0.713〜1.076)。8 Elite 系の必要係数は 0.94〜1.01 で、ほかの SoC と同じ範囲に入った。推測・未検証(公開値からの逆算)。docs/research/qualcomm-ng-cause-2026-11-14.md §3.2
  const MT_CLOCK_FACTOR = { pc: 1.0, mobile: 0.91, 'mobile-pc': 0.81 };
  // 【2026-11-09 以降は下の連続式 MT_CLOCK_POWER。以下は 2 段の帯の経緯(履歴)】mobile-pc の TDP 帯別の係数([推定・校正値]。熱モデルではない。§5.3.3 G の1)。帯は公表電力 W(mtPublishedW)の上限 maxW 以下で決まる(境界は含む)。
  // 値は、MT を計算できる x86 mobile-pc 11 件(Kraken Point を除く)で「予測がチャート値と一致する係数」の帯内の中央値を小数 2 桁に丸めたもの(チャートの偏りを含む逆算。推測・未検証)。
  // 2026-11-05: 7840HS は range 35〜54W を取得して帯 0 に入ったが、帯の係数は再校正していない(標本 11 件に含めていない。含めると帯 0 の中央値は 0.72。設計書 §2.5.1)。
  // 帯 0 は 0.65 → 0.69 に再校正(Core 5 320 を標本に含めた。ユーザー指示 2026-11-05)。帯 0 は 6 件の中央値 0.688、帯 1 は 5 件の中央値 0.759(再校正時の値)。
  // 2026-11-06 に 14700HX の range が ARK の {45,157} になり帯 1 に移ったため、現在の標本は帯 0 が n=5・中央値 0.7185、帯 1 が n=6・0.7557。係数 0.69/0.76 は据え置き(帯 0 を 0.72 に再校正するかはユーザー判断待ち。設計書 §5.3.3 K-9)
  // 【2026-11-09 再校正 帯 0: 0.69 → 0.84、帯 1: 0.76 → 0.81】ユーザー指示「取り直しのあと再校正」(2026-11-07 に公開値を直近 25 件の全体中央値に取り直し、395・258V は 2026-11-09 に 200 件の全体中央値へ広げた)。
  // 標本は従来と同じ 11 件(id の除外ルールは据え置き: 7840HS・Kraken Point・268V/258V/256V/388H/275HX は除く)。公開値は**チャート値ではなく検索結果の全体中央値**。帯 0 は n=5・中央値 0.8398、帯 1 は n=6・0.8058(丸めて 0.84 / 0.81)。
  // 係数の値は逆算の結果で、実装上の判断(ユーザーが指示したのは再校正)。推測・未検証。docs/research/band-recalibration-2026-11-09.md
  // 【2026-11-09 2 段の帯をやめて連続式に: factor(W) = min(1, c · W^(1/3))】ユーザー指示「TDP が上がればスコアが上がるのが自然なので、係数を直して進めてください」。
  // 2 段の帯(0.84 / 0.81)は帯 0 > 帯 1 の逆転(TDP を下げると MT が上がる)が起きて不自然だった。電力が制限要因のとき動的電力 ∝ f³(電圧が周波数に比例すると単純化)で、持続クロック ∝ W^(1/3)。
  // **指数 1/3 は物理的な単純化による仮定 [推定]。c = 0.191 も [推定・校正値](実装上の判断)**: 従来と同じ標本 11 件(id の除外ルール据え置き)で、各 SKU の「予測 = 公開値」となる係数 k_i を W_i^(1/3) で割った値の中央値 0.1909 を小数 3 桁に丸めた。
  // 公開値はチャート値ではなく検索結果の全体中央値(2026-11-07 に 25 件、395・258V は 2026-11-09 に 200 件)。W は mtPublishedW(選んだ TDP も反映)。上限は 1.0(boost 超えにならない。115W 超で頭打ち)。
  // 一律 0.81 より誤差が大きい(標本内 MAE 0.113 対 0.089、LOO 0.133)が、単調性を優先するのがユーザーの意向。docs/research/band-recalibration-2026-11-09.md
  // 【2026-11-09 指数を 1/3 → 0.15、c を 0.191 → 0.429 に(ユーザー指示「指数を小さくして進めてください」)】指数 p を 0.10〜0.333 で 0.025 刻みに動かし、各 p で c = 標本 11 件の k_i ÷ W_i^p の中央値(小数 3 桁)として、
  // LOO MAE が最小の p を採用した(p=0.15 で LOO 0.0801・標本内 0.0791。一律 0.81 の標本内 0.0890 より小さい。p=1/3 は LOO 0.1329)。下限 0.10 は「TDP が上がれば MT が上がる」が実用上見える最低限の傾きとして置いた実装上の判断(0.15 は下限に張り付いていない)。
  // p が 0 に近いほど一律(定数)に近づく。指数 0.15 も c も [推定・校正値]で、物理的な根拠(f³)から離れた経験的な値。docs/research/band-recalibration-2026-11-09.md の §7
  // 【2026-11-10 γ=0.30(ユーザー判断 A)に合わせて c を再校正 0.429 → 0.443】p を 0.10〜0.325 で走査し直しても LOO 最小は p=0.15(LOO 0.0787、標本内 0.0752。一律 0.81 は標本内 0.0911)。指数は 0.15 のまま、c は k_i ÷ W_i^0.15 の中央値 0.4431(小数 3 桁で 0.443)。
  // 【2026-11-13 PC 系 CPU の GB7 を Windows のみの中央値に差し替え(ユーザー決定)、uCal(Golden/Raptor 114.1 → 116.5)の再計算のあとで c を再校正 0.443 → 0.411】p を 0.10〜1/3 で走査し直しても LOO 最小は p=0.15(LOO 0.0694、標本内 0.0673。一律 0.81 は標本内 0.0910)。
  // 指数は 0.15 のまま、c は k_i ÷ W_i^0.15 の中央値 0.4115(小数 3 桁で 0.411)。標本は 11 件のまま(id の除外ルール据え置き)。設計書 §5.3.0 の【2026-11-13】、docs/research/gb7-windows-only-2026-11-13.md
  // 【2026-11-13 Windows のみ化 第 2 回(1800X・1500X・1200・X9 378H・8cx Gen 3 の GB7 を Windows のみの中央値に差し替え)、Cougar Cove の uCal 98.3 を追加したあとで c を再校正 0.411 → 0.406】指数は 0.15 のまま、c は k_i ÷ W_i^0.15 の中央値 0.4063(小数 3 桁で 0.406)。標本は 11 件のまま(id の除外ルール据え置き)。
  // **p の走査(0.10〜1/3)では LOO 最小が下限の p=0.10 に移った**(p=0.10: LOO 0.0815・標本内 0.0783 / p=0.15: LOO 0.0905・標本内 0.0821。一律 0.81 は 0.0899 で、p=0.15 の LOO は一律 0.81 よりわずかに悪い)。指数の変更はユーザー判断待ちとして 0.15 を据え置いた(設計書 §5.3.0【2026-11-13 第 2 回】・§13.4)
  // 【2026-11-14 Redwood Cove の uCal 99.5 を追加したあとで c を再校正 0.406 → 0.411】(ユーザー指示「Meteor Lake のデータをほかにも取得して」)標本 11 件のうち 185H の P コアの u が ISA 平均 109.77 → 99.5 に下がり、185H の必要係数が上がった。指数は 0.15 のまま(ユーザー決定 2026-11-14)、c は k_i ÷ W_i^0.15 の中央値 0.4114(小数 3 桁で 0.411)。標本は 11 件のまま(id の除外ルール据え置き)。
  // p=0.15 の標本内 MAE 0.0784・LOO MAE 0.0842(一律 0.81 は 0.0900 で、連続式の LOO が一律 0.81 より小さい状態に戻った)。p の走査では LOO 最小は下限 p=0.10 のまま(LOO 0.0799)。設計書 §5.3.0【2026-11-14】
  // 【2026-11-15 265K の P の boost を 5.5GHz にした(Lion Cove の u 102.13 → 100.36)あとで c を再校正 0.411 → 0.412】(ユーザー決定「265K のクロックを 5.5GHz にして進めて」)標本 11 件の k_i ÷ W_i^0.15 の中央値 0.4121(小数 3 桁で 0.412)。指数は 0.15 のまま(ユーザー決定)。標本は 11 件のまま(id の除外ルール据え置き)。設計書 §5.3.0【2026-11-15 265K】
  // 【2026-11-15 プラットフォームの DRAM 遅延 dramLat を ST に入れた(uCal・x86 の u・σ 0.03183 → 0.03151 が動いた)あとで c を再校正 0.412 → 0.405】標本 11 件の k_i ÷ W_i^0.15 の中央値 0.4046(小数 3 桁で 0.405)。指数は 0.15 のまま(ユーザー決定)。標本は 11 件のまま(id の除外ルール据え置き)。MT 自体には遅延を入れていない(opts.noMemory は 85ns のまま)。設計書 §5.3.0【2026-11-15 DRAM 遅延】
  const MT_CLOCK_POWER = { c: 0.405, exp: 0.15, max: 1.0 };
  const mtClockByPower = (w) => Math.min(MT_CLOCK_POWER.max, MT_CLOCK_POWER.c * Math.pow(w, MT_CLOCK_POWER.exp));
  // 帯を決める公表電力: range.maxW(cTDP 上限など設定範囲の上限)があればそれ、なければ power.base.w。peak(短時間ピーク・実測)は使わない。どちらも無ければ null
  // 【2026-11-12 冷却による制限(ユーザー指示「冷却のプリセットを作って、それでマルチ性能が変わるようにする」)】選んだ冷却が MT 持続電力 sustainedW を持つ(ノート PC の冷却クラス。data/cooling.js)とき、
  // evaluate が preset.power.coolingW(と coolingId)として渡す。MT 用の W = min(公表電力から決めた W, coolingW)。coolingW が無い(既定。冷却の制限なし=メーカー想定)か、W 以上なら従来どおり。
  // 使うのは mobile-pc の連続式だけ(pc・mobile は mtClockInfo が W を使わない)。W が決まらない(公表電力なし)プリセットはフォールバック(0.81)のまま。ST は変えない。
  function mtPublishedW(preset) {
    const pw = (preset && preset.power) || {};
    const lim = (p) => {
      const cw = pw.coolingW;
      if (p && typeof cw === 'number' && cw > 0 && cw < p.w) return { w: cw, source: 'cooling', fromW: p.w, fromSource: p.source, coolingId: pw.coolingId || null };
      return p;
    };
    // ユーザーが設定範囲内で選んだ TDP(package.tdpW を evaluate が power.tdpW として渡す)があればそれを優先
    const sel = pw.tdpW; const rg = pw.range;
    if (rg && typeof sel === 'number' && sel >= rg.minW && sel <= rg.maxW) return lim({ w: sel, source: 'selected' });
    // 【2026-11-15 典型電力 typicalW(任意。14700HX だけ。[推定・校正値])】投稿機・レビュー機の典型的な持続電力 W。range.maxW や公表電力とは別の値で、MT のクロックを決める W としてだけ使う(選んだ TDP が無いとき、range.maxW より優先)。冷却の制限(lim)はそのまま効く(min(typicalW, coolingW))。冷却・温度・電力の計算は従来どおり公表電力基準(ここは mtPublishedW だけ)
    const tw = pw.typicalW;
    if (typeof tw === 'number' && tw > 0) return lim({ w: tw, source: 'typical' });
    const mx = pw.range && pw.range.maxW;
    if (typeof mx === 'number' && mx > 0) return lim({ w: mx, source: 'range.maxW' });
    const b = pw.base && pw.base.w;
    if (typeof b === 'number' && b > 0) return lim({ w: b, source: 'base' });
    return null;
  }
  // MT の係数と、その決め方。{ factor, band(帯の label。帯を使わないとき null), powerW, source, fallback(mobile-pc で電力が無く 0.81 を使った) }
  function mtClockInfo(preset) {
    const kind = preset && preset.kind;
    const flat = MT_CLOCK_FACTOR[kind];
    if (!flat) return { factor: 1.0, band: null, powerW: null, source: null, fallback: false };
    if (kind !== 'mobile-pc') return { factor: flat, band: null, powerW: null, source: null, fallback: false };
    const p = mtPublishedW(preset);
    // 【2026-11-15 7840HS の allCoreGHz】全コアが allCoreGHz(実測由来)を持つと、mtScore はクロックに電力の連続式を掛けない(下の factor は使われない)ので、選んだ TDP・冷却クラスは MT に効かない。powerIgnored: true で呼び出し側(evaluate・results)に知らせる(冷却の制限・編集扱いの判定に使う)
    const cores0 = (preset.cfg && preset.cfg.cores) || [];
    const powerIgnored = cores0.length > 0 && cores0.every((c) => typeof c.allCoreGHz === 'number' && c.allCoreGHz > 0);
    // 電力が未取得の Arm ノート用チップ(8cx Gen 3)は x86 由来の 0.81 ではなくスマホと同じ係数(mobile)を使う(2026-11-14。[推定・校正値]。0.81 と連続式の c は x86 11 件だけで決めた値で、同じ X1 / A78 世代のスマホの必要係数は 0.89〜1.11。設計書 §5.3.0【2026-11-14 Android】)
    if (!p && preset.isa === 'arm') return { factor: MT_CLOCK_FACTOR.mobile, band: null, powerW: null, source: null, fallback: true, armFlat: true };
    if (!p) return { factor: flat, band: null, powerW: null, source: null, fallback: true };
    // band は表示用のラベル(2 段の帯をやめたので「帯」ではなく連続式の説明)。factor は電力 W に応じた連続式(現在 c=0.411、指数 0.15。min(1, c·W^0.15)。MT_CLOCK_POWER)
    return { factor: mtClockByPower(p.w), band: `電力 W に応じた連続式(c=${MT_CLOCK_POWER.c}、指数 ${MT_CLOCK_POWER.exp}。min(1, c·W^指数))`, powerW: p.w, source: p.source, fallback: false, ...(powerIgnored ? { powerIgnored: true } : {}), ...(p.source === 'cooling' && !powerIgnored ? { coolingLimit: { coolingId: p.coolingId, sustainedW: p.w, fromW: p.fromW, fromSource: p.fromSource } } : {}) };
  }
  const mtClockFactor = (preset) => mtClockInfo(preset).factor;

  // MT スコア(§5.2.2)。fByType: { 種別 → 全コア負荷時の持続クロック GHz }(電力モデルが決める)。
  function mtScore(preset, cal, uarchDb, fByType, mtParams) {
    // 優先順位: 引数 mtParams > 校正結果 cal.mt > 仮の既定値
    const mp = Object.assign({}, MT_DEFAULTS, (cal && cal.mt) || {}, mtParams || {});
    const cores = preset.cfg.cores || [];
    const totalThreads = cores.reduce((t, c) => t + c.count * (c.smt || 1), 0);
    if (!(totalThreads > 0)) return { ok: false, reason: 'コアなし' };
    let sum = 0; let threads = 0; const detail = [];
    // l3Types(任意。stScore の注記参照): L3 を使える種別の総スレッド数。L3 を使えない種別は detail に noL3: true を付け、結果に l3NoTypes(その種別名)を付ける。l3Types が無い SKU は何も付かず従来どおり
    const l3Types = Array.isArray(preset.cfg.l3Types) && preset.cfg.l3Types.length ? preset.cfg.l3Types : null;
    const l3Threads = l3Types ? cores.filter((c) => l3Types.includes(c.type)).reduce((t, c) => t + c.count * (c.smt || 1), 0) : 0;
    const l3NoTypes = l3Types ? cores.filter((c) => !l3Types.includes(c.type)).map((c) => c.type) : [];
    // l3CcdMB(任意。l3CcdOf の注記参照): 各 CCD の総スレッド数。無い SKU は空で従来どおり
    const ccdThreads = {}; if (Array.isArray(preset.cfg.l3CcdMB)) cores.forEach((c) => { if (Number.isInteger(c.ccd)) ccdThreads[c.ccd] = (ccdThreads[c.ccd] || 0) + c.count * (c.smt || 1); });
    const clockInfo = mtClockInfo(preset); const kf = clockInfo.factor;
    const order = { high: 3, medium: 2, low: 1 }; let worst = 'high'; let anyFallback = false; let anyFloor = false;
    for (const c of cores) {
      // 既定は最大クロック(boost)× kind の係数(pc=1.0、mobile=0.91、mobile-pc は TDP 帯別。mtClockInfo)。電力制限モデルで決めた持続クロック(fByType)を渡せるが、現状の仮の電力モデルでは精度が下がる(設計書 §5.3.0)
      const given = fByType && fByType[c.type];
      // 任意項目 allCoreGHz(全コア負荷時の実測クロック。出典つき [二次]。2026-11-10 追加)があればそれを使う(係数は掛けない。実測なので)。無ければ従来どおり boost/max × 係数
      const allc = typeof c.allCoreGHz === 'number' && c.allCoreGHz > 0 ? c.allCoreGHz : null;
      const f0 = given || allc || c.boostGHz || c.maxGHz || c.baseGHz;
      const clockSource = given ? 'given' : allc ? 'allcore' : c.boostGHz ? 'boost' : c.maxGHz ? 'max' : 'base';
      // 係数は boost/max がある場合のみ掛ける(base へのフォールバックと fByType 指定には掛けない)
      const applied = clockSource === 'boost' || clockSource === 'max' ? kf : 1;
      let f = f0 ? f0 * applied : f0;
      // 【2026-11-15 Zen 5c の MT クロック(A1。[推定]。ユーザー決定「HX 370 と Kraken 350 の MT の項を入れて進めて」)】x86 の mobile-pc で、最速コア(P)と同じ設計の高密度コア(uarch.js の uFrom が最速コアの uarch を指すもの。Zen 5c)は、
      // MT クロック = min(自分の最大クロック, 係数 × P の最大クロック)。P は従来どおり(係数 × boost)。同じ電圧なら P が係数 × 最大で回るとき、最大クロックの低い高密度コアは自分の上限で回る、という考え方。
      // Zen 5c の全コア負荷時の実測クロックは未取得で、公開値に合わせた値ではない(係数は P と同じ mtClockInfo の値。式の形の根拠は設計書 §5.3.0【2026-11-15 Zen 5c】)。Intel の E コアや Arm・スマホ(uFrom を持つ Oryon Performance など)には当てない(isa x86・kind mobile-pc のときだけ)
      let clockCap = false;
      if (f && applied !== 1 && preset.kind === 'mobile-pc' && preset.isa === 'x86') {
        const top = topCore(cores); const ur = uarchDb[c.uarch];
        if (top && top !== c && ur && ur.uFrom && ur.uFrom === top.uarch) {
          const tf0 = top.boostGHz || top.maxGHz;
          if (tf0) { const cap = tf0 * kf; f = Math.min(f0, cap); clockCap = true; }
        }
      }
      if (!f) return { ok: false, reason: `${c.type} コアのクロック未取得` };
      const st = stScore(preset, cal, uarchDb, { core: c, fGHz: f, threads: totalThreads, ...(ccdThreads[c.ccd] > 0 && l3CcdOf(preset.cfg, c) ? { l3Threads: ccdThreads[c.ccd] } : l3Threads > 0 ? { l3Threads } : {}), noMemory: true });
      if (!st.ok) return { ok: false, reason: `${c.type} コア: ${st.reason}` };
      if (order[st.confidence] < order[worst]) worst = st.confidence;
      if (st.fallback) anyFallback = true;
      if (st.l3Floor) anyFloor = true;
      const smtGain = (c.smt || 1) === 2 ? 1 + mp.gammaSmt : 1;
      sum += st.score * c.count * smtGain; threads += c.count * (c.smt || 1);
      detail.push({ type: c.type, count: c.count, perCore: st.score, fGHz: f, clockFactor: clockCap ? f / f0 : applied, ...(clockCap ? { clockCap: true } : {}), clockSource, ...(l3Types && st.noL3 ? { noL3: true } : {}), ...(st.l3CcdMB ? { ccd: c.ccd, l3CcdMB: st.l3CcdMB } : {}), corrSource: st.corrSource, ...(st.corrUFrom ? { corrUFrom: st.corrUFrom } : {}), ...(st.corrUarch ? { corrUarch: st.corrUarch } : {}), ...(st.clone ? { corrFrom: st.corrFrom, clone: true } : {}), confidence: st.confidence });
    }
    const eta = 1 / (1 + mp.sigma * (threads - 1));
    // メモリ構成の MT 係数(§5.2.4)。基準構成では 1(厳密)。ST の内部呼び出しには掛けず、ここで 1 回だけ掛ける
    const mem = memoryApi().evaluate(preset); const memActive = !!(mem && mem.active); const memF = memActive ? mem.mtFactor : 1;
    // sigma・gammaSmt は未校正(既定値のまま)なので、呼び出し側が確度を過大評価しないよう明示する
    // 種別によってクロックの出所が違う(例: P は boost、E は boost 未取得で base)と、種別間の比が歪む。呼び出し側に知らせる
    const sources = new Set(detail.map((d) => d.clockSource));
    const mixedClock = sources.has('base') && sources.size > 1;
    const uncalibrated = Object.keys(MT_DEFAULTS).filter((k) => !(cal && cal.mt && cal.mt.fitted && cal.mt.fitted.includes(k)) && !(mtParams && k in mtParams));
    return { ok: true, score: sum * eta * memF, eta, ...(detail.some((d) => d.l3CcdMB) ? { l3PerCcd: detail.filter((d) => d.l3CcdMB).map((d) => ({ ccd: d.ccd, mb: d.l3CcdMB, threads: ccdThreads[d.ccd] })) } : {}), ...(memActive ? { memory: mem } : {}), clockFactor: detail.some((d) => d.clockFactor !== 1) ? kf : 1, clockInfo: Object.assign({}, clockInfo, memActive ? { memory: mem } : {}, { applied: detail.length && detail.every((d) => d.clockFactor !== 1 || d.clockCap) ? 'all' : detail.some((d) => d.clockFactor !== 1 || d.clockCap) ? 'partial' : 'none' }), threads, detail, uncalibrated, confidence: uncalibrated.length || mixedClock ? 'low' : worst, fallback: anyFallback, mixedClock, noL3: preset.cfg.l3MB === 0, l3Floor: anyFloor, ...(l3NoTypes.length ? { l3NoTypes } : {}) };
  }

  // MT の並列効率 σ を、校正代表 SKU(calib:true)の GB7 マルチ値に合わせる(§5.3)。γ_smt は固定(1 つの σ だけでは SMT と並列効率を分離できないため)。
  // 全コア負荷時のクロックは、既定では最大クロック(boost。なければ maxGHz、それもなければ baseGHz)に mtClockInfo の係数(pc=1.0、mobile=0.92、mobile-pc は TDP 帯別。base には掛けない)を掛けたもの。電力モデルは未接続(設計書 §5.3.0)。fByTypeOf(preset) で差し替え可能。
  // 対数誤差の二乗和を最小化する σ を、区間 [0, 0.2] の黄金分割探索で求める。
  function calibrateMt(presets, gb7ByName, uarchDb, cal, fByTypeOf) {
    // 代表のうち、全コアが uarch 専用の補正を持ち、仮の IPC を含まないものだけを使う(ISA 平均の代用は σ を歪める)
    const gamma = cal && cal.mt && cal.mt.gammaSmt != null ? cal.mt.gammaSmt : MT_DEFAULTS.gammaSmt;
    const reps = presets.filter((p) => {
      if (!(p.calib && p.gb7 && gb7ByName[p.gb7] && gb7ByName[p.gb7].multi)) return false;
      // 2026-11-07: kind:'mobile' の代表は σ の代表から除く(今回の実装上の判断。設計書 §5.3.3 の旧記述は「全コアが uarch 専用の補正を持つ代表 3 件〔AMD〕」で、kind による除外の記述はなかった)。
      // 8 Elite は Oryon Performance が uFrom: Oryon Prime で全コア uarch 専用の補正になり代表条件を満たすようになったが、電力制約の強い MT(k≈0.78)で σ を歪めるため除く。
      // GB10(kind:pc)や M1/M2(mobile-pc)は、将来 E コアの u が入ると σ の代表に入り得る(この除外では防がない)
      if (p.kind === 'mobile') return false;
      const r = mtScore(p, cal, uarchDb, fByTypeOf ? fByTypeOf(p) : null, { sigma: 0, gammaSmt: gamma });
      return r.ok && !r.fallback && r.detail.every((d) => d.corrSource === 'uarch');
    });
    if (!reps.length) return Object.assign({}, cal, { mt: { sigma: MT_DEFAULTS.sigma, gammaSmt: gamma, fitted: [], usedPresets: [], rmsLogError: null, note: '使える代表 SKU がないため σ は既定値のまま' } });
    const cost = (sigma) => {
      let e = 0; let n = 0;
      for (const p of reps) {
        const r = mtScore(p, cal, uarchDb, fByTypeOf ? fByTypeOf(p) : null, { sigma, gammaSmt: gamma });
        if (!r.ok) continue;
        e += Math.pow(Math.log(r.score / gb7ByName[p.gb7].multi), 2); n++;
      }
      return n ? e / n : Infinity;
    };
    let lo = 0; let hi = 0.2; const g = (Math.sqrt(5) - 1) / 2;
    let a = hi - g * (hi - lo); let b = lo + g * (hi - lo);
    for (let i = 0; i < 60; i++) { if (cost(a) < cost(b)) hi = b; else lo = a; a = hi - g * (hi - lo); b = lo + g * (hi - lo); }
    const sigma = (lo + hi) / 2;
    const used = reps.map((p) => p.id);
    return Object.assign({}, cal, { mt: { sigma, gammaSmt: gamma, fitted: ['sigma'], usedPresets: used, rmsLogError: Math.sqrt(cost(sigma)) } });
  }

  const api = { DEFAULT_PARAMS, MT_DEFAULTS, MT_CLOCK_FACTOR, MT_CLOCK_POWER, mtClockByPower, mtPublishedW, mtClockInfo, mtClockFactor, coreCpi, topCore, stScore, calibrate, calibrateMt, mtScore };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.perf = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
