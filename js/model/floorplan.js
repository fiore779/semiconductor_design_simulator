// 実物風フロアプラン(模式図)の生成(設計書 §8.1)。プリセットの種類(Intel ハイブリッド・AMD チップレットなど)ごとに、
// 現実の CPU の写真・ダイショットで見られる大まかな配置(「コア列 | L3 | コア列」・上に Uncore・下に iGPU)に倣ってブロックを並べる。UI・WebGL に依存しない純関数。
//
// 重要: これは**模式図**である。各ブロックの面積は未取得で、実チップのフロアプランではない。ブロックの大きさと位置は、配置のための仮の比率で決めている。
//   - コア・L3 は性能・面積の計算に使う実際の構成(cfg)のブロック。個数はプリセットのコア数と一致する。
//   - 「飾りブロック」(Uncore・iGPU・NPU)は見た目だけのブロックで `decorative: true`。性能・電力・面積・温度の計算に一切影響しない
//     (電力の按分では重みゼロ、評価はプリセットの値から出すのでブロックを見ない)。内蔵 GPU・NPU があるかは下の DECOR_FACTS の表にある SKU だけを描く。
//   - ダイの面積は公表値のまま。ダイの幅×高さだけを、テンプレートごとの縦横比で決める(面積は変えない)。
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

  // 内蔵 GPU / NPU の有無(模式図に飾りとして描くかどうか)。各社の公表仕様による。表に無い SKU は描かない(推測で足さない)。
  //   igpu: そのプリセットの SKU に内蔵グラフィックスがある。npu: 専用の AI 演算器(NPU)がある。
  const DECOR_FACTS = {
    'intel-adl-12900k': { igpu: true }, 'intel-adl-12700k': { igpu: true }, 'intel-adl-12600k': { igpu: true }, 'intel-adl-12100': { igpu: true },
    'intel-rpl-13900k': { igpu: true }, 'intel-rpl-13700k': { igpu: true }, 'intel-rpl-13600k': { igpu: true },
    'intel-rpl-14900k': { igpu: true }, 'intel-rpl-14700k': { igpu: true }, 'intel-rpl-14600k': { igpu: true }, 'intel-rpl-14700hx': { igpu: true },
    'amd-raven-2400g': { igpu: true }, 'amd-raven-2200g': { igpu: true }, 'amd-zen3-5800u': { igpu: true }, 'amd-zen3p-7735hs': { igpu: true },
    'amd-zen4-7840hs': { igpu: true, npu: true }, 'amd-strix-hx370': { igpu: true, npu: true },
  };

  const isSmall = (type) => /^(E|LP|C)/i.test(String(type || ''));
  const hasSmallGroup = (preset) => ((preset.cfg && preset.cfg.cores) || []).some((g) => isSmall(g.type));
  const ccdUnits = (name) => { const m = /[×x]\s*(\d+)/i.exec(String(name || '')); const n = m ? parseInt(m[1], 10) : 1; return n >= 1 && n <= MAX_UNITS ? n : 1; };

  // プリセット → { template, uncore, igpu, npu, units, dieIndex } か null(判定できない / 対象外。呼び出し側は従来の配置にする)。
  // dieIndex: テンプレートを当てるダイ(preset.dies の添字)。roleOf(name) はダイ名 → 'compute' | 'gpu' | 'uncore'。
  function classify(preset, roleOf) {
    if (!preset || preset.isa !== 'x86') return null;
    const dies = preset.dies || [];
    const groups = (preset.cfg && preset.cfg.cores) || [];
    if (!dies.length || !groups.length) return null;
    const role = typeof roleOf === 'function' ? roleOf : () => 'compute';
    const facts = DECOR_FACTS[preset.id] || {};
    const ccd = dies.findIndex((d) => /CCD/i.test(d.name || ''));
    if (ccd >= 0) return { template: 'amd-chiplet', uncore: false, igpu: false, npu: false, units: ccdUnits(dies[ccd].name), dieIndex: ccd };
    const ci = dies.findIndex((d) => role(d.name) === 'compute');
    if (ci < 0) return null;
    const dname = dies[ci].name || '';
    const tile = /タイル|tile/i.test(dname);
    if (tile) return { template: 'x86-tile', uncore: false, igpu: false, npu: false, units: 1, dieIndex: ci };
    if (dies.length !== 1) return null; // 複数ダイで CCD でもタイルでもない(EPYC 等): 従来の配置
    if (preset.vendor === 'Intel') {
      if (hasSmallGroup(preset)) return { template: 'intel-hybrid', uncore: true, igpu: !!facts.igpu, npu: false, units: 1, dieIndex: ci };
      return { template: 'x86-mono', uncore: true, igpu: !!facts.igpu, npu: false, units: 1, dieIndex: ci };
    }
    if (preset.vendor === 'AMD') {
      if (facts.igpu) return { template: 'amd-apu', uncore: true, igpu: true, npu: !!facts.npu, units: 1, dieIndex: ci };
      return { template: 'x86-mono', uncore: true, igpu: false, npu: false, units: 1, dieIndex: ci };
    }
    return null;
  }

  // ダイの縦横比(幅 / 高さ)。面積から幅×高さを作るときの仮の値(実チップの寸法ではない)。
  function aspectOf(layout) {
    if (!layout) return null;
    const u = layout.units || 1;
    switch (layout.template) {
      case 'intel-hybrid': return 0.82;
      case 'x86-mono': return 1.1;
      case 'amd-apu': return 1.1;
      case 'x86-tile': return 1.2;
      case 'amd-chiplet': return 1.1 * u + 0.15 * (u - 1);
      default: return null;
    }
  }

  const checkLayout = (l) => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) return 'layout: 形式が違います';
    if (typeof l.template !== 'string') return 'layout.template が文字列ではありません';
    if (TEMPLATE_IDS.indexOf(l.template) < 0) return `layout.template「${l.template}」は未知のテンプレートです`;
    for (const k of ['uncore', 'igpu', 'npu']) if (l[k] != null && typeof l[k] !== 'boolean') return `layout.${k} は true か false にしてください`;
    if (l.units != null && !(Number.isInteger(l.units) && l.units >= 1 && l.units <= MAX_UNITS)) return `layout.units は 1〜${MAX_UNITS} の整数にしてください`;
    return null;
  };

  const r4 = (x) => Math.round(x * 10000) / 10000;

  // layout に従ってダイ 1 個ぶんのブロックを並べる。cores: [{type, uarch, count}]、l3MB: 数または 0/undefined。戻り値: ブロックの配列。
  // コア・L3 のブロック数は cores・l3MB と一致する(コアは count の合計、L3 は units 個)。
  function layoutDie(die, cores, l3MB, layout) {
    const L = layout || {};
    const W = die.widthMm; const H = die.heightMm;
    const units = Math.max(1, Math.min(MAX_UNITS, L.units || 1));
    const mrg = Math.min(W, H) * 0.04;
    const innerW = W - mrg * 2; const innerH = H - mrg * 2;
    const blocks = [];
    const put = (id, kind, label, x, y, w, h, extra) => {
      const ins = Math.min(Math.min(W, H) * 0.004, w * 0.2, h * 0.2);
      blocks.push(Object.assign({ id, kind, label, x: r4(x + ins), y: r4(y + ins), w: r4(w - 2 * ins), h: r4(h - 2 * ins), schematic: true }, extra || {}));
    };
    const deco = { decorative: true };

    const uncoreH = L.uncore ? innerH * 0.10 : 0;
    const gpuH = L.igpu ? innerH * (L.template === 'intel-hybrid' ? 0.30 : 0.28) : 0;
    const coreTop = mrg + uncoreH; const coreH = innerH - uncoreH - gpuH;
    if (L.uncore) put(`${die.id}-uncore`, 'uncore', 'Uncore', mrg, mrg, innerW, uncoreH, deco);
    if (L.igpu) {
      const y = coreTop + coreH;
      const gw = L.npu ? innerW * 0.7 : innerW;
      put(`${die.id}-igpu`, 'gpu', 'iGPU', mrg, y, gw, gpuH, deco);
      if (L.npu) put(`${die.id}-npu`, 'npu', 'NPU', mrg + gw, y, innerW - gw, gpuH, deco);
    }

    // コア: 種別の順は保つ。大コア(P など)と小コア(E・LP-E・C)に分け、小コアは大コア列の下に 2 列のクラスタで置く
    const flat = [];
    (cores || []).forEach((g) => { for (let i = 0; i < (g.count || 0); i++) flat.push(g); });
    const bigs = flat.filter((g) => !isSmall(g.type)); const smalls = flat.filter((g) => isSmall(g.type));
    const slice = (list, i) => { const base = Math.floor(list.length / units); const extra = list.length % units; const from = i * base + Math.min(i, extra); return list.slice(from, from + base + (i < extra ? 1 : 0)); };
    const ugap = units > 1 ? mrg * 1.5 : 0;
    const uw = (innerW - ugap * (units - 1)) / units;
    const hasL3 = typeof l3MB === 'number' && l3MB > 0;
    const l3w = hasL3 ? uw * 0.18 : 0;
    const colW = (uw - l3w) / 2;
    let coreNo = 0;
    const coreBlock = (g, x, y, w, h) => put(`${die.id}-core-${coreNo++}`, 'core', `${g.type}`, x, y, w, h, { coreType: g.type, uarch: g.uarch || null });
    for (let u = 0; u < units; u++) {
      const ux = mrg + u * (uw + ugap);
      const b = slice(bigs, u); const s = slice(smalls, u);
      const bl = Math.ceil(b.length / 2); const sl = Math.ceil(s.length / 2);
      const bigRows = bl; const smallRows = Math.ceil(sl / 2);
      const totalU = bigRows + smallRows * 0.5;
      if (totalU > 0) {
        const unitH = coreH / totalU;
        const sideCores = (side) => {
          const x0 = ux + (side === 0 ? 0 : colW + l3w);
          const bb = side === 0 ? b.slice(0, bl) : b.slice(bl);
          const ss = side === 0 ? s.slice(0, sl) : s.slice(sl);
          bb.forEach((g, i) => coreBlock(g, x0, coreTop + i * unitH, colW, unitH));
          ss.forEach((g, k) => coreBlock(g, x0 + (k % 2) * (colW / 2), coreTop + bigRows * unitH + Math.floor(k / 2) * (unitH / 2), colW / 2, unitH / 2));
        };
        sideCores(0); sideCores(1);
      }
      if (hasL3) {
        const per = Math.round((l3MB / units) * 100) / 100;
        put(units === 1 ? `${die.id}-l3` : `${die.id}-l3-${u}`, 'l3', `L3 ${per}MB`, ux + colW, coreTop, l3w, coreH);
      }
    }
    return blocks;
  }

  const api = { TEMPLATES, TEMPLATE_IDS, DECOR_FACTS, MAX_UNITS, classify, aspectOf, checkLayout, layoutDie, isSmall };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.floorplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
