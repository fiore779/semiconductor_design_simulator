// 実物風フロアプラン(模式図)の生成(設計書 §8.1)。プリセットの種類(Intel ハイブリッド・AMD チップレットなど)ごとに、
// 現実の CPU のダイ写真・面積調査(docs/research/block-areas.md)に倣ってブロックを並べる。UI・WebGL に依存しない純関数。
//
// 重要: これは**模式図**である。ブロックの大きさと位置は、注釈つきダイ写真の目測と、二次資料の面積測定から決めた「目安」で、実チップのフロアプランではない。
//   - コア・L3 は性能・面積の計算に使う実際の構成(cfg)のブロック。個数はプリセットのコア数と一致する(L2 はコアのブロックに含めて描く)。
//   - 「飾りブロック」(Uncore・Platform I/O・Infinity Fabric・SMU・iGPU・NPU)は見た目だけで `decorative: true`。性能・電力・面積・温度の計算に一切影響しない
//     (電力の按分では重みゼロ、評価はプリセットの値から出すのでブロックを見ない)。内蔵 GPU・NPU があるかは DECOR_FACTS の表にある SKU だけを描く。
//   - ダイの面積は公表値のまま。ダイの幅×高さだけを、テンプレートごとの縦横比で決める(面積は変えない)。
//   - 縮尺の根拠は die.layout.scaleBasis に持つ: 'photo'(ダイ写真の目測+面積調査)/ 'survey'(面積調査の測定値)/ 'reuse'(他の世代・SKU の値や写真の流用。このチップの写真・測定なし)/ 'schematic'(根拠なし。従来の模式)。
(function (root) {
  'use strict';

  const TEMPLATES = {
    'intel-hybrid': 'Intel ハイブリッド(モノリシック)',
    'x86-mono': 'x86 モノリシック(P コアのみ・内蔵 GPU なし等)',
    'amd-chiplet': 'AMD チップレット(CCD)',
    'amd-apu': 'AMD モノリシック APU',
    'x86-tile': 'x86 コンピュートタイル',
  };
  const TEMPLATE_IDS = Object.keys(TEMPLATES);
  const MAX_UNITS = 4;
  const SCALE_BASES = ['photo', 'survey', 'reuse', 'schematic'];

  // 縮尺の根拠の説明(画面の注記)
  const SCALE_TEXT = {
    photo: 'ブロックの大きさは、このチップの注釈つきダイ写真の目測に基づく目安。実チップのフロアプランではない',
    survey: 'ブロックの大きさは、面積調査(二次資料の測定値)に基づく目安。実チップのフロアプランではない',
    reuse: 'ブロックの配置と大きさの比は、他の世代・SKU の写真や値の流用による目安(このチップの写真・測定なし)。実チップのフロアプランではない',
    schematic: '模式図(ブロックの大きさは根拠なし。配置も実チップのものではありません)',
  };
  const scaleText = (layout) => SCALE_TEXT[(layout && layout.scaleBasis) || 'schematic'] || SCALE_TEXT.schematic;

  // 内蔵 GPU / NPU の有無(模式図に飾りとして描くかどうか)。各社の公表仕様による。表に無い SKU は描かない(推測で足さない)。
  const DECOR_FACTS = {
    'intel-adl-12900k': { igpu: true }, 'intel-adl-12700k': { igpu: true }, 'intel-adl-12600k': { igpu: true }, 'intel-adl-12100': { igpu: true },
    'intel-rpl-13900k': { igpu: true }, 'intel-rpl-13700k': { igpu: true }, 'intel-rpl-13600k': { igpu: true },
    'intel-rpl-14900k': { igpu: true }, 'intel-rpl-14700k': { igpu: true }, 'intel-rpl-14600k': { igpu: true }, 'intel-rpl-14700hx': { igpu: true },
    'amd-raven-2400g': { igpu: true }, 'amd-raven-2200g': { igpu: true }, 'amd-zen3-5800u': { igpu: true }, 'amd-zen3p-7735hs': { igpu: true },
    'amd-zen4-7840hs': { igpu: true, npu: true }, 'amd-strix-hx370': { igpu: true, npu: true, frame: 'strix-point' }, 'amd-kraken-350': { igpu: true, npu: true },
  };

  // ---- 根拠データ ----
  // Intel ハイブリッド(Alder Lake-S 8P+8E の 12900K の注釈つきダイ写真の目測、1682×846 px の基準枠)。
  const HY_ADL = { H: 846, X0: 385, IO_X: 10, IO_W: 90, UNC_X: 100, UNC_Y: 55, UNC_H: 715, PW: 186.25, P_Y: [55, 552], P_H: 275, L3_Y: 330, L3_H: 222, EW: 245, E_Y: [60, 552], E_H: 270, GPU_W: 300, MARGIN: 7, Y0: 15, Y1: 825 };
  // Raptor Lake-S 8P+16E(13900K)の TechPowerUp 注釈つきダイ写真(arch2.jpg、1920×893 px)の目測。E クラスタが 2 列(上下 4 つ)、L3 は 36MB の横帯。
  const HY_RPL = { H: 893, X0: 397, IO_X: 20, IO_W: 90, UNC_X: 110, UNC_Y: 65, UNC_H: 815, PW: 181, P_Y: [65, 600], P_H: 275, L3_Y: 345, L3_H: 255, EW: 240, E_Y: [85, 600], E_H: 255, GPU_W: 300, MARGIN: 15, Y0: 60, Y1: 880 };
  const hybridFrameOf = (slots) => (slots && slots.e > 8 ? HY_RPL : HY_ADL);
  // Strix Point(Ryzen AI 9 HX 370)の TechPowerUp 注釈つきダイ写真(1858×1200 px)の目測。Zen 5 ×4 + L3 16MB、Zen 5c ×8(上下 4 つずつ)+ L3 8MB、右に GPU・NPU など。
  const ST = {
    W: 1858, H: 1200, Z5: { x: 80, w: 155, y: 100, h: 270 }, Z5_L3: { x: 80, y: 370, w: 620, h: 150 },
    Z5C: { x: 95, w: 152, y: [525, 825], h: 195 }, Z5C_L3: { x: 90, y: 725, w: 620, h: 95 }, MAX_BIG: 4, MAX_SMALL: 8,
    DECO: [['mem-phy', 'メモリ PHY', 100, 5, 1450, 88], ['mc', 'メモリコントローラ', 700, 95, 290, 210], ['display', 'Display', 1020, 95, 275, 170], ['media', 'Media Engine', 1575, 410, 165, 430], ['phy-b', 'PCIe / USB PHY', 995, 1075, 470, 115], ['phy-r', 'USB PHY', 1745, 700, 113, 490]],
    NPU: [1300, 95, 425, 300], GPU: [['gpu', 'GPU', 720, 495, 850, 405], ['gpuc', 'GPU(制御)', 720, 310, 580, 185]],
  };
  // AMD CCD(8 コア): top = 上部の帯(Debug / Infinity Fabric / SMU)の高さ比、core = コア+L2 の幅比(左右とも)、aspect = 幅/高さ。
  const CCD_RECIPES = {
    'Zen 3': { aspect: 1.516, top: 0.154, core: 0.247, basis: 'photo', note: 'Zen 3 CCD の注釈つきダイ写真(WCCFTech、ユーザー提示)の目測(上部の帯 約15%、コア+L2 約25%、L3 約50%)。面積比は AMD 公表(CCX 68 / CCD 81 mm²)と Locuza(二次)と整合' },
    'Zen 5': { aspect: 1.188, top: 0.174, core: 0.354, basis: 'survey', note: 'Fritzchens Fritz の Zen 5 CCD 測定値(コア+L2 7.1%、L3 23.3%。二次)' },
    'Zen 4': { aspect: 1.516, top: 0.16, core: 0.276, basis: 'reuse', note: '配置と比の流用: Zen 3 CCD の写真の構造に、Zen 4 の面積比(コア+L2 5.8%、L3 約 37%。検索要約で低信頼)を当てた目安。このチップの写真・実測ではない' },
  };
  const DEFAULT_RECIPE = 'Zen 3';
  const CCD_TOP = [0.257, 0.733]; // 上部の帯の区切り(Debug | Infinity Fabric | SMU の幅比。Zen 3 写真の目測)
  const CCD_GAP = 0.03;           // 1 つのダイ内の CCD どうしの隙間(CCD 幅比)

  const isSmall = (type) => /^(E|LP|C)/i.test(String(type || ''));
  const hasSmallGroup = (preset) => ((preset.cfg && preset.cfg.cores) || []).some((g) => isSmall(g.type));
  const ccdUnits = (name) => { const m = /[×x]\s*(\d+)/i.exec(String(name || '')); const n = m ? parseInt(m[1], 10) : 1; return n >= 1 && n <= MAX_UNITS ? n : 1; };
  const firstBigUarch = (preset) => { const g = ((preset.cfg && preset.cfg.cores) || []).find((x) => !isSmall(x.type)); return g ? g.uarch : null; };
  const sumCount = (preset, small) => ((preset.cfg && preset.cfg.cores) || []).filter((g) => isSmall(g.type) === small).reduce((s, g) => s + (g.count || 0), 0);

  // プリセット → classify の結果({ template, uncore, igpu, npu, units, scaleBasis, scaleNote, slots?, recipe?, dieIndex, iodGpu })か null(判定できない / 対象外。呼び出し側は従来の配置にする)。
  // roleOf(name) はダイ名 → 'compute' | 'gpu' | 'uncore'。
  function classify(preset, roleOf) {
    if (!preset || preset.isa !== 'x86') return null;
    const dies = preset.dies || [];
    const groups = (preset.cfg && preset.cfg.cores) || [];
    if (!dies.length || !groups.length) return null;
    const role = typeof roleOf === 'function' ? roleOf : () => 'compute';
    const facts = DECOR_FACTS[preset.id] || {};
    const base = { uncore: false, igpu: false, npu: false, units: 1, scaleBasis: 'schematic', scaleNote: '', iodGpu: false };
    const ccd = dies.findIndex((d) => /CCD/i.test(d.name || ''));
    if (ccd >= 0) {
      const u = firstBigUarch(preset);
      const known = Object.prototype.hasOwnProperty.call(CCD_RECIPES, u);
      const key = known ? u : DEFAULT_RECIPE; const rc = CCD_RECIPES[key];
      return Object.assign(base, {
        template: 'amd-chiplet', units: ccdUnits(dies[ccd].name), dieIndex: ccd, recipe: key,
        scaleBasis: known ? rc.basis : 'reuse', scaleNote: known ? rc.note : `${CCD_RECIPES[DEFAULT_RECIPE].note}(この世代の値なし。流用)`,
        iodGpu: known && (u === 'Zen 4' || u === 'Zen 5'), // Zen 4 以降(Raphael・Granite Ridge)の IOD には内蔵 GPU がある
      });
    }
    const ci = dies.findIndex((d) => role(d.name) === 'compute');
    if (ci < 0) return null;
    const dname = dies[ci].name || '';
    if (/タイル|tile/i.test(dname)) return Object.assign(base, { template: 'x86-tile', dieIndex: ci });
    if (dies.length !== 1) return null; // 複数ダイで CCD でもタイルでもない(EPYC 等): 従来の配置
    if (preset.vendor === 'Intel') {
      if (hasSmallGroup(preset)) {
        const m = /(\d+)\s*P\s*\+\s*(\d+)\s*E/i.exec(dname);
        const slots = m ? { p: parseInt(m[1], 10), e: parseInt(m[2], 10) } : { p: sumCount(preset, false), e: sumCount(preset, true) };
        let basis = 'reuse'; let note = '12900K の注釈つきダイ写真の目測の配置を、コア数に合わせて列を増減した目安(このダイの写真・測定なし)';
        if (m && slots.p === 8 && slots.e === 8) { basis = 'photo'; note = '12900K(Alder Lake-S 8P+8E)の TechPowerUp 注釈つきダイ写真(ユーザーが会話に貼付)の目測。Locuza の面積測定(二次)の P コア 3.57%・E クラスタ 4.16%・iGPU 16.1% と、実装は ±10% 以内で一致。コアを無効化した SKU は空き枠を残す'; }
        else if (m && slots.p === 8 && slots.e === 16) { basis = 'photo'; note = '13900K(Raptor Lake-S 8P+16E)の TechPowerUp 注釈つきダイ写真(arch2.jpg)の目測。ダイの縦横比は写真の 2.15(実寸 23.8×10.8 mm なら 2.20 で、差 2%)。コアを無効化した SKU は空き枠を残す'; }
        return Object.assign(base, { template: 'intel-hybrid', uncore: true, igpu: !!facts.igpu, dieIndex: ci, slots, scaleBasis: basis, scaleNote: note });
      }
      return Object.assign(base, { template: 'x86-mono', uncore: true, igpu: !!facts.igpu, dieIndex: ci });
    }
    if (preset.vendor === 'AMD') {
      if (facts.igpu) {
        if (facts.frame === 'strix-point') {
          return Object.assign(base, { template: 'amd-apu', uncore: true, igpu: true, npu: !!facts.npu, dieIndex: ci, frame: 'strix-point', scaleBasis: 'photo', scaleNote: 'Strix Point(Ryzen AI 9 HX 370)の TechPowerUp 注釈つきダイ写真(1858×1200。X ユーザー @GPUsAreMagic の注釈。AMD の確認はない)の目測。ダイの縦横比は写真の 1.55(実寸 12.06×18.71 mm で 1.55)。Zen 5 ×4 + L3 16MB、Zen 5c ×8 + L3 8MB、GPU・NPU・PHY などは飾り' });
        }
        return Object.assign(base, { template: 'amd-apu', uncore: true, igpu: true, npu: !!facts.npu, dieIndex: ci, scaleBasis: 'schematic', scaleNote: 'ブロックの大きさに根拠なし(このチップの写真・測定なし)' });
      }
      return Object.assign(base, { template: 'x86-mono', uncore: true, dieIndex: ci });
    }
    return null;
  }

  // classify の結果 → die.layout に保存する形(dieIndex・iodGpu は保存しない)
  function toLayout(c) {
    if (!c) return null;
    const l = { template: c.template, uncore: !!c.uncore, igpu: !!c.igpu, npu: !!c.npu, units: c.units || 1, scaleBasis: c.scaleBasis || 'schematic', scaleNote: c.scaleNote || '' };
    if (c.slots) l.slots = { p: c.slots.p, e: c.slots.e };
    if (c.recipe) l.recipe = c.recipe;
    if (c.frame) l.frame = c.frame;
    return l;
  }

  function hybridFrame(slots, nBig, nSmall, igpu) {
    const sp = Math.max((slots && slots.p) || 0, nBig); const se = Math.max((slots && slots.e) || 0, nSmall);
    const pc = Math.max(1, Math.ceil(sp / 2)); const clusters = Math.ceil(se / 4); const ecol = Math.ceil(clusters / 2);
    const F = hybridFrameOf(slots);
    return { F, pc, clusters, ecol, refW: F.X0 + F.PW * pc + F.EW * ecol + (igpu ? F.GPU_W : 0) + F.MARGIN, refH: F.H };
  }

  // ダイの縦横比(幅 / 高さ)。面積から幅×高さを作るときの値(面積は変えない)。
  function aspectOf(layout) {
    if (!layout) return null;
    const u = layout.units || 1;
    switch (layout.template) {
      case 'intel-hybrid': { const f = hybridFrame(layout.slots, 0, 0, layout.igpu); return f.refW / f.refH; }
      case 'x86-mono': return 1.1;
      case 'amd-apu': return layout.frame === 'strix-point' ? ST.W / ST.H : 1.1;
      case 'x86-tile': return 1.2;
      case 'amd-chiplet': return (CCD_RECIPES[layout.recipe] || CCD_RECIPES[DEFAULT_RECIPE]).aspect * (u + (u - 1) * CCD_GAP);
      default: return null;
    }
  }

  // 編集後のコア数が、写真・調査の枠(ダイの実際のコア枠数)に収まるか
  function fits(layout, cores) {
    if (!layout) return true;
    const flat = []; (cores || []).forEach((g) => { for (let i = 0; i < (g.count || 0); i++) flat.push(g); });
    const nBig = flat.filter((g) => !isSmall(g.type)).length; const nSmall = flat.length - nBig;
    if (layout.frame === 'strix-point') return nBig <= ST.MAX_BIG && nSmall <= ST.MAX_SMALL;
    if (layout.template === 'intel-hybrid' && layout.slots) return nBig <= layout.slots.p && nSmall <= layout.slots.e;
    if (layout.template === 'amd-chiplet') return flat.length <= 8 * (layout.units || 1);
    return true;
  }
  const EDITED_NOTE = '編集でコア数が元のダイの枠を超えたため、ブロックの大きさに根拠はありません';
  // 編集後の layout(枠を超えたら根拠を schematic に落とす。超えなければそのまま)
  function afterEdit(layout, cores) {
    if (!layout || layout.scaleBasis === 'schematic' || fits(layout, cores)) return layout;
    return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: EDITED_NOTE });
  }

  const checkLayout = (l) => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) return 'layout: 形式が違います';
    if (typeof l.template !== 'string') return 'layout.template が文字列ではありません';
    if (TEMPLATE_IDS.indexOf(l.template) < 0) return `layout.template「${l.template}」は未知のテンプレートです`;
    for (const k of ['uncore', 'igpu', 'npu']) if (l[k] != null && typeof l[k] !== 'boolean') return `layout.${k} は true か false にしてください`;
    if (l.units != null && !(Number.isInteger(l.units) && l.units >= 1 && l.units <= MAX_UNITS)) return `layout.units は 1〜${MAX_UNITS} の整数にしてください`;
    if (l.scaleBasis != null && SCALE_BASES.indexOf(l.scaleBasis) < 0) return 'layout.scaleBasis は photo / survey / reuse / schematic のどれかにしてください';
    if (l.scaleNote != null && !(typeof l.scaleNote === 'string' && l.scaleNote.length <= 400)) return 'layout.scaleNote は 400 文字以内の文字列にしてください';
    if (l.frame != null && l.frame !== 'strix-point') return 'layout.frame が未知です';
    if (l.recipe != null && !(typeof l.recipe === 'string' && Object.prototype.hasOwnProperty.call(CCD_RECIPES, l.recipe))) return 'layout.recipe が未知です';
    if (l.slots != null) {
      const s = l.slots;
      if (!s || typeof s !== 'object' || Array.isArray(s) || !Number.isInteger(s.p) || !Number.isInteger(s.e) || s.p < 0 || s.e < 0 || s.p > 64 || s.e > 64) return 'layout.slots は { p, e }(0〜64 の整数)にしてください';
    }
    return null;
  };

  const r4 = (x) => Math.round(x * 10000) / 10000;

  // 別ダイとして実在する IOD(Zen 4 以降)のブロック: 従来の「SoC / I/O」ブロック(飾りではない。電力按分の対象)を左に、内蔵 GPU の飾りブロックを右に置く。
  function iodBlocks(die) {
    const W = die.widthMm; const H = die.heightMm; const m = Math.min(W, H) * 0.06;
    const innerW = W - 2 * m; const innerH = H - 2 * m; const gw = innerW * 0.3; const gap = Math.min(W, H) * 0.01;
    return [
      { id: `${die.id}-uncore`, kind: 'uncore', label: 'SoC / I/O', x: r4(m), y: r4(m), w: r4(innerW - gw - gap), h: r4(innerH), schematic: true },
      { id: `${die.id}-igpu`, kind: 'gpu', label: 'iGPU', x: r4(m + innerW - gw), y: r4(m), w: r4(gw), h: r4(innerH), schematic: true, decorative: true },
    ];
  }

  // layout に従ってダイ 1 個ぶんのブロックを並べる。cores: [{type, uarch, count}]、l3MB: 数または 0/undefined。戻り値: ブロックの配列。
  // コア・L3 のブロック数は cores・l3MB と一致する(コアは count の合計、L3 は units 個)。
  function layoutDie(die, cores, l3MB, layout) {
    const L = layout || {};
    const W = die.widthMm; const H = die.heightMm;
    const blocks = [];
    const put = (id, kind, label, x, y, w, h, extra) => {
      const ins = Math.min(Math.min(W, H) * 0.002, w * 0.2, h * 0.2);
      blocks.push(Object.assign({ id, kind, label, x: r4(x + ins), y: r4(y + ins), w: r4(w - 2 * ins), h: r4(h - 2 * ins), schematic: true }, extra || {}));
    };
    const deco = { decorative: true };
    const flat = [];
    (cores || []).forEach((g) => { for (let i = 0; i < (g.count || 0); i++) flat.push(g); });
    const hasL3 = typeof l3MB === 'number' && l3MB > 0;
    let coreNo = 0;
    const coreBlock = (g, x, y, w, h) => put(`${die.id}-core-${coreNo++}`, 'core', `${g.type}`, x, y, w, h, { coreType: g.type, uarch: g.uarch || null });

    if (L.frame === 'strix-point' && fits(L, cores)) {
      const sx = W / ST.W; const sy = H / ST.H;
      const R = (id, kind, label, x, y, w, h, extra) => put(id, kind, label, x * sx, y * sy, w * sx, h * sy, extra);
      const big = flat.filter((g) => !isSmall(g.type)); const small = flat.filter((g) => isSmall(g.type));
      big.forEach((g, i) => coreBlock(g, (ST.Z5.x + i * ST.Z5.w) * sx, ST.Z5.y * sy, ST.Z5.w * sx, ST.Z5.h * sy));
      small.forEach((g, i) => coreBlock(g, (ST.Z5C.x + (i % 4) * ST.Z5C.w) * sx, ST.Z5C.y[Math.floor(i / 4)] * sy, ST.Z5C.w * sx, ST.Z5C.h * sy));
      if (hasL3) {
        const a = Math.round((l3MB * 2 / 3) * 100) / 100; const b = Math.round((l3MB - a) * 100) / 100; // 写真は Zen 5 側 16MB・Zen 5c 側 8MB(2:1)
        R(`${die.id}-l3`, 'l3', `L3 ${a}MB`, ST.Z5_L3.x, ST.Z5_L3.y, ST.Z5_L3.w, ST.Z5_L3.h);
        R(`${die.id}-l3-1`, 'l3', `L3 ${b}MB`, ST.Z5C_L3.x, ST.Z5C_L3.y, ST.Z5C_L3.w, ST.Z5C_L3.h);
      }
      ST.DECO.forEach((d) => R(`${die.id}-${d[0]}`, 'uncore', d[1], d[2], d[3], d[4], d[5], deco));
      if (L.npu) R(`${die.id}-npu`, 'npu', 'NPU', ST.NPU[0], ST.NPU[1], ST.NPU[2], ST.NPU[3], deco);
      if (L.igpu) ST.GPU.forEach((d) => R(`${die.id}-${d[0]}`, 'gpu', d[1], d[2], d[3], d[4], d[5], deco));
      return blocks;
    }

    if (L.template === 'intel-hybrid') {
      const big = flat.filter((g) => !isSmall(g.type)); const small = flat.filter((g) => isSmall(g.type));
      const f = hybridFrame(L.slots, big.length, small.length, L.igpu); const HY = f.F;
      const sx = W / f.refW; const sy = H / f.refH;
      const R = (id, kind, label, x, y, w, h, extra) => put(id, kind, label, x * sx, y * sy, w * sx, h * sy, extra);
      R(`${die.id}-io`, 'uncore', 'Platform I/O', HY.IO_X, HY.Y0, HY.IO_W, HY.Y1 - HY.Y0, deco);
      R(`${die.id}-uncore`, 'uncore', 'Uncore', HY.UNC_X, HY.UNC_Y, HY.X0 - HY.UNC_X, HY.UNC_H, deco);
      big.forEach((g, i) => { const col = Math.floor(i / 2); const row = i % 2; coreBlock(g, (HY.X0 + col * HY.PW) * sx, HY.P_Y[row] * sy, HY.PW * sx, HY.P_H * sy); });
      const ex0 = HY.X0 + HY.PW * f.pc;
      small.forEach((g, i) => {
        const cl = Math.floor(i / 4); const k = i % 4; const col = Math.floor(cl / 2); const row = cl % 2;
        const cx = ex0 + col * HY.EW + (k % 2) * (HY.EW / 2); const cy = HY.E_Y[row] + Math.floor(k / 2) * (HY.E_H / 2);
        coreBlock(g, cx * sx, cy * sy, (HY.EW / 2) * sx, (HY.E_H / 2) * sy);
      });
      if (hasL3) R(`${die.id}-l3`, 'l3', `L3 ${l3MB}MB`, HY.X0, HY.L3_Y, HY.PW * f.pc + HY.EW * f.ecol, HY.L3_H);
      if (L.igpu) R(`${die.id}-igpu`, 'gpu', 'iGPU', f.refW - HY.MARGIN - HY.GPU_W, HY.Y0, HY.GPU_W, HY.Y1 - HY.Y0, deco);
      return blocks;
    }

    const units = Math.max(1, Math.min(MAX_UNITS, L.units || 1));
    const mrg = L.template === 'amd-chiplet' ? 0 : Math.min(W, H) * 0.04;
    const innerW = W - mrg * 2; const innerH = H - mrg * 2;
    const rc = CCD_RECIPES[L.recipe] || null;
    const chiplet = L.template === 'amd-chiplet';
    const uncoreH = L.uncore ? innerH * 0.10 : 0;
    const gpuH = L.igpu ? innerH * 0.28 : 0;
    let coreTop = mrg + uncoreH; let coreH = innerH - uncoreH - gpuH;
    if (L.uncore) put(`${die.id}-uncore`, 'uncore', 'Uncore', mrg, mrg, innerW, uncoreH, deco);
    if (L.igpu) {
      const y = coreTop + coreH; const gw = L.npu ? innerW * 0.7 : innerW;
      put(`${die.id}-igpu`, 'gpu', 'iGPU', mrg, y, gw, gpuH, deco);
      if (L.npu) put(`${die.id}-npu`, 'npu', 'NPU', mrg + gw, y, innerW - gw, gpuH, deco);
    }
    // CCD は 1 つのダイに units 個を横に並べる。各 CCD の上部に帯(Debug / Infinity Fabric / SMU)を置く(飾り)
    const ugap = units > 1 ? (innerW / (units + (units - 1) * CCD_GAP)) * CCD_GAP : 0;
    const uw = (innerW - ugap * (units - 1)) / units;
    const bigsAll = chiplet ? flat : flat.filter((g) => !isSmall(g.type));
    const smallsAll = chiplet ? [] : flat.filter((g) => isSmall(g.type));
    const slice = (list, i) => { const base = Math.floor(list.length / units); const extra = list.length % units; const from = i * base + Math.min(i, extra); return list.slice(from, from + base + (i < extra ? 1 : 0)); };
    const coreFrac = rc ? rc.core : 0.41;
    const l3w = hasL3 ? uw * (1 - 2 * coreFrac) : 0;
    const colW = hasL3 ? uw * coreFrac : uw / 2;
    for (let u = 0; u < units; u++) {
      const ux = mrg + u * (uw + ugap);
      let uTop = coreTop; let uH = coreH;
      if (chiplet) {
        const th = innerH * (rc ? rc.top : 0.154);
        const xs = [0, CCD_TOP[0], CCD_TOP[1], 1];
        [['debug', 'Debug / テスト用'], ['if', 'Infinity Fabric'], ['smu', 'SMU']].forEach((n, i) => put(`${die.id}-ccd${u}-${n[0]}`, 'uncore', n[1], ux + xs[i] * uw, mrg, (xs[i + 1] - xs[i]) * uw, th, deco));
        uTop = mrg + th; uH = innerH - th;
      }
      const b = slice(bigsAll, u); const s = slice(smallsAll, u);
      const bl = Math.ceil(b.length / 2); const sl = Math.ceil(s.length / 2);
      const bigRows = b.length ? Math.max(chiplet ? 4 : 0, bl) : 0; const smallRows = Math.ceil(sl / 2);
      const totalU = bigRows + smallRows * 0.5;
      if (totalU > 0) {
        const unitH = uH / totalU;
        [0, 1].forEach((side) => {
          const x0 = ux + (side === 0 ? 0 : colW + l3w);
          const bb = side === 0 ? b.slice(0, bl) : b.slice(bl);
          const ss = side === 0 ? s.slice(0, sl) : s.slice(sl);
          bb.forEach((g, i) => coreBlock(g, x0, uTop + i * unitH, colW, unitH));
          ss.forEach((g, k) => coreBlock(g, x0 + (k % 2) * (colW / 2), uTop + bigRows * unitH + Math.floor(k / 2) * (unitH / 2), colW / 2, unitH / 2));
        });
      }
      if (hasL3) {
        const per = Math.round((l3MB / units) * 100) / 100;
        put(units === 1 ? `${die.id}-l3` : `${die.id}-l3-${u}`, 'l3', `L3 ${per}MB`, ux + colW, uTop, l3w, uH);
      }
    }
    return blocks;
  }

  const api = { TEMPLATES, TEMPLATE_IDS, DECOR_FACTS, CCD_RECIPES, SCALE_BASES, SCALE_TEXT, MAX_UNITS, classify, toLayout, aspectOf, checkLayout, fits, afterEdit, layoutDie, iodBlocks, scaleText, isSmall };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.floorplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
