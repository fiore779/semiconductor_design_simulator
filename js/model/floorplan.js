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
    'apple-soc': 'Apple シリコン(ダイ写真に倣う)',
  };
  const TEMPLATE_IDS = Object.keys(TEMPLATES);
  const MAX_UNITS = 4;
  const SCALE_BASES = ['photo', 'survey', 'reuse', 'schematic'];

  // 縮尺の根拠の説明(画面の注記)
  const SCALE_TEXT = {
    photo: 'ブロックの大きさは、このチップ(同じダイ)のダイ写真の目測に基づく目安。実チップのフロアプランではない',
    survey: 'ブロックの大きさは、面積調査(二次資料の測定値)に基づく目安。実チップのフロアプランではない',
    reuse: 'ブロックの配置と大きさの比は、他の世代・SKU の写真や値の流用による目安(このチップの写真・測定なし)。実チップのフロアプランではない',
    schematic: '模式図(ブロックの大きさは根拠なし。配置も実チップのものではありません)',
  };
  const scaleText = (layout) => SCALE_TEXT[(layout && layout.scaleBasis) || 'schematic'] || SCALE_TEXT.schematic;

  // 飾りの IO ダイ(design.decorDies。dies には入れない=評価に影響しない)。IOD のデータが無い Zen 3 の CCD 単独のプリセット(5600X・5950X)に、
  // パッケージ写真(5950x.jpg)に倣って CCD の下側中央に表示する。大きさは AMD 公表の Zen 3 cIOD 125 mm²(GF 12nm。AMD の Zen 3 発表資料 = block-areas.md の AMD-Z3)、縦横比は写真の目測。
  const DECOR_IOD = { areaMm2: 125, aspect: 1.4, label: 'IOD(飾り・面積は参考)', sizeBasis: { s: 'pub', source: 'AMD Zen 3 発表資料の cIOD(GF 12nm)125 mm²(docs/research/block-areas.md の AMD-Z3)', note: '縦横比 1.4 は 5950x.jpg(パッケージ写真)の IOD の外形を画像から読んだ目測。評価には含まない' } };
  // Compute タイルの写真の枠に、全体図の相対位置の飾りのタイル(GPU・Platform)がある場合の飾りのダイ(座標は Compute のダイを基準。寸法は二次資料の mm 値、なければ Compute の面積に全体図の px 比を当てた[推定]。評価には含まない)
  function tileDecor(layout, die, presetId) {
    const TF = layout && layout.template === 'x86-tile' ? TILE_FRAMES[layout.frame] : null;
    if (!TF || !TF.tiles.length || !die || !(die.areaMm2 > 0)) return null;
    const s = die.widthMm / (TF.box[2] - TF.box[0]);
    const skip = (TILE_MAP[presetId] && TILE_MAP[presetId].skip) || [];
    return TF.tiles.filter((t) => skip.indexOf(t[1]) < 0).map((t) => {
      const w = t[7] || (t[5] - t[3]) * s; const h = t[8] || (t[6] - t[4]) * s;
      return { id: t[0], kind: t[1], label: t[2], x: r4(die.x + (t[3] - TF.box[0]) * s), y: r4(die.y + (t[4] - TF.box[1]) * s), widthMm: r4(w), heightMm: r4(h), areaMm2: r4(w * h),
        sizeBasis: { s: t[7] ? 'sec' : 'est', source: t[7] ? `Kurnal の寸法 ${t[7]}×${t[8]} mm〔幅×高さ。向きは全体図に合わせた〕(Tom's Hardware 2026-03 の引用経由。[二次])。位置は Kurnal 全体図(dh0gWbF8gG9AXfQw.jpg。出典は推定)の目測[推定]` : 'Kurnal 全体図の相対比を Compute タイルの面積に当てはめた[推定]', note: '評価・面積合計には含まない。実測面積ではない' } };
    });
  }
  const MAX_DECOR = 4; const MAX_DECOR_TEXT = 300;
  // 画面の注記。「AMD 公表値」は sizeBasis.s が pub のときだけ。面積が無くても「飾り・評価には含まない」は出す
  const decorNote = (decor) => {
    const d = decor && decor[0]; if (!d) return null;
    if (decor.some((x) => x.kind !== 'iod')) return '飾りのタイル(GPU・Platform)は見た目だけ。寸法は二次資料(Kurnal)、位置は全体図の目測の推定(参考。評価・面積合計には含まない)';
    if (typeof d.areaMm2 !== 'number') return '飾りの IOD は見た目だけで、大きさは参考(評価には含まない)';
    const who = d.sizeBasis && d.sizeBasis.s === 'pub' ? 'AMD 公表値' : '参考値';
    return `飾りの IOD の大きさは ${who} ${d.areaMm2}mm²、縦横比は写真の目測(参考。評価には含まない)`;
  };

  // 飾りダイの検証。問題があれば日本語の理由、なければ null。ids: 設計内の既存 id の Set(重複検出。呼び出し側が追加する)
  // templates: 設計内のダイの layout.template の配列(あれば kind との対応を検査: iod は amd-chiplet、gpu-tile / platform-tile は x86-tile)
  function checkDecorDies(list, ids, templates) {
    if (!Array.isArray(list)) return 'decorDies が配列ではありません';
    if (list.length > MAX_DECOR) return `飾りのダイが多すぎます(${list.length} 個。上限 ${MAX_DECOR})`;
    for (let i = 0; i < list.length; i++) {
      const d = list[i]; const t = `飾りのダイ ${i + 1}`;
      if (!d || typeof d !== 'object' || Array.isArray(d)) return `${t}: 形式が違います`;
      if (typeof d.id !== 'string' || !d.id) return `${t}: id が文字列ではありません`;
      if (ids) { if (ids.has(d.id)) return `${t}: id「${d.id}」が重複しています`; ids.add(d.id); }
      if (['iod', 'gpu-tile', 'platform-tile'].indexOf(d.kind) < 0) return `${t}: kind は iod / gpu-tile / platform-tile のどれかにしてください`;
      if (Array.isArray(templates) && templates.indexOf(d.kind === 'iod' ? 'amd-chiplet' : 'x86-tile') < 0) return `${t}: kind「${d.kind}」は ${d.kind === 'iod' ? 'AMD チップレット(amd-chiplet)' : 'Intel タイル型(x86-tile)'}の設計だけに付けられます`;
      if (typeof d.label !== 'string' || d.label.length > 80) return `${t}: label は 80 文字以内の文字列にしてください`;
      for (const k of ['x', 'y']) if (!(typeof d[k] === 'number' && isFinite(d[k]) && Math.abs(d[k]) <= 10000)) return `${t}: ${k} が有限の数ではありません`;
      for (const k of ['widthMm', 'heightMm']) if (!(typeof d[k] === 'number' && isFinite(d[k]) && d[k] > 0 && d[k] <= 1000)) return `${t}: ${k} は 0 より大きく 1000 以下の数にしてください`;
      if (d.areaMm2 != null && !(typeof d.areaMm2 === 'number' && isFinite(d.areaMm2) && d.areaMm2 > 0 && d.areaMm2 <= 10000)) return `${t}: areaMm2 は 0 より大きく 10000 以下の数か null にしてください`;
      if (d.areaMm2 != null && Math.abs((d.widthMm * d.heightMm) / d.areaMm2 - 1) > 0.01) return `${t}: 幅×高さが areaMm2 と 1% 以上ずれています`;
      if (d.sizeBasis != null) {
        const b = d.sizeBasis;
        if (!b || typeof b !== 'object' || Array.isArray(b)) return `${t}: sizeBasis の形式が違います`;
        for (const k of ['s', 'source', 'note']) if (b[k] != null && !(typeof b[k] === 'string' && b[k].length <= MAX_DECOR_TEXT)) return `${t}: sizeBasis.${k} は ${MAX_DECOR_TEXT} 文字以内の文字列にしてください`;
      }
    }
    return null;
  }

  // 内蔵 GPU / NPU の有無(模式図に飾りとして描くかどうか)。各社の公表仕様による。表に無い SKU は描かない(推測で足さない)。
  const DECOR_FACTS = {
    'intel-adl-12900k': { igpu: true }, 'intel-adl-12700k': { igpu: true }, 'intel-adl-12600k': { igpu: true }, 'intel-adl-12100': { igpu: true },
    'intel-rpl-13900k': { igpu: true }, 'intel-rpl-13700k': { igpu: true }, 'intel-rpl-13600k': { igpu: true },
    'intel-rpl-14900k': { igpu: true }, 'intel-rpl-14700k': { igpu: true }, 'intel-rpl-14600k': { igpu: true }, 'intel-rpl-14700hx': { igpu: true },
    'amd-raven-2400g': { igpu: true }, 'amd-raven-2200g': { igpu: true }, 'amd-zen3-5800u': { igpu: true }, 'amd-zen3p-7735hs': { igpu: true },
    'amd-zen4-7840hs': { igpu: true, npu: true }, 'amd-strix-hx370': { igpu: true, npu: true, frame: 'strix-point' }, 'amd-kraken-350': { igpu: true, npu: true, frame: 'kraken-point' },
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
  // Kraken Point(Ryzen AI 7 350)は Strix Point の写真の配置を流用: Zen 5 ×4(1 段)、Zen 5c ×4(1 段)、L3 は合計 16MB(内訳未取得なので 1 ブロック)、GPU は 8CU(Strix の 16CU の半分の面積)、NPU は同じ。
  const KR = {
    W: 1858, H: 905, Z5: ST.Z5, Z5_L3: ST.Z5_L3, Z5C: { x: 95, w: 152, y: [525], h: 195 }, Z5C_L3: null, L3_MODE: 'one', MAX_BIG: 4, MAX_SMALL: 4,
    DECO: ST.DECO.map((d) => (d[0] === 'phy-b' ? [d[0], d[1], 720, 785, 470, 115] : d[0] === 'phy-r' ? [d[0], d[1], 1745, 700, 113, 205] : d)),
    NPU: ST.NPU, GPU: [['gpu', 'GPU', 720, 495, 850, 140], ['gpuc', 'GPU(制御)', 720, 310, 580, 185]],
  };
  ST.L3_MODE = 'two';
  const FRAMES = { 'strix-point': ST, 'kraken-point': KR };
  // aspect: 寸法注記などの根拠があるものだけ数を渡す(M1 Pro・M1 Max)。null は枠の比(幅/高さ)
  // 時計回りに 90° 回す(画像が横向きのとき。左端が上端になる)。写真の座標のまま枠を作り、回して返す
  const rotCW = (fr) => {
    const bx = fr.box[0]; const by = fr.box[1]; const H = fr.box[3] - by; const W = fr.box[2] - bx;
    const rr = (r) => [H - (r[1] - by) - r[3], r[0] - bx, r[3], r[2]];
    return { box: [0, 0, H, W], aspect: fr.aspect, big: fr.big.map(rr), small: fr.small.map(rr), deco: fr.deco.map((d) => [d[0], d[1], d[2]].concat(rr(d.slice(3, 7)))) };
  };
  const af = (box, aspect, big, small, deco) => ({ box, aspect: aspect == null ? (box[2] - box[0]) / (box[3] - box[1]) : aspect, big, small, deco });
  const APPLE_FRAMES = {
    // M1(Locuza 注釈 FCBl1gcWEAUOdRw.jpg の左。ダイ 396×394)
    'apple-m1': af([18, 404, 414, 798], null, [[25, 520, 50, 40], [75, 520, 50, 40], [25, 668, 50, 44], [75, 668, 50, 44]], [[205, 614, 40, 26], [245, 614, 40, 26], [205, 680, 28, 26], [233, 680, 28, 26]], [
      ['gpu1', 'GPU', 'g', 24, 428, 266, 88], ['gpu2', 'GPU', 'g', 130, 516, 160, 48], ['media', 'Media Engine', 'u', 296, 430, 96, 140], ['slc', 'SLC', 'u', 130, 566, 160, 44], ['npu', 'NPU', 'n', 128, 614, 76, 86],
      ['phy-t', 'Memory PHY', 'u', 18, 404, 396, 16], ['phy-r', 'Memory PHY', 'u', 396, 420, 18, 296], ['io', 'I/O PHY ほか', 'u', 18, 716, 396, 82]]),
    // M1 Pro(同 中央。ダイ 686×467)
    'apple-m1pro': af([499, 331, 1185, 798], 1.465, [[712, 410, 46, 56], [758, 410, 46, 56], [804, 410, 46, 56], [850, 410, 47, 56], [712, 550, 46, 56], [758, 550, 46, 56], [804, 550, 46, 56], [850, 550, 47, 56]], [[630, 452, 28, 22], [658, 452, 28, 22]], [
      ['media', 'Media Engine', 'u', 978, 445, 205, 70], ['npu', 'NPU', 'n', 983, 540, 130, 75], ['gpu', 'GPU', 'g', 655, 618, 372, 180], ['slc-l', 'SLC', 'u', 567, 618, 88, 180], ['slc-r', 'SLC', 'u', 1030, 618, 95, 180],
      ['phy-l', 'LPDDR5 PHY', 'u', 499, 530, 62, 268], ['phy-r', 'LPDDR5 PHY', 'u', 1127, 530, 58, 268]]),
    // M1 Max(同 右。ダイ 720×783。縦横比はプリセットの面積と Apple の寸法 19.3×22.4 mm の 0.86 に合わせる)
    'apple-m1max': af([1270, 15, 1990, 798], 0.86, [[1497, 98, 55, 50], [1552, 98, 55, 50], [1607, 98, 55, 50], [1662, 98, 55, 50], [1497, 247, 55, 56], [1552, 247, 55, 56], [1607, 247, 55, 56], [1662, 247, 55, 56]], [[1410, 143, 26, 26], [1436, 143, 26, 26]], [
      ['media', 'Media Engine', 'u', 1775, 138, 180, 80], ['npu', 'NPU', 'n', 1780, 235, 135, 75], ['gpu', 'GPU', 'g', 1435, 318, 390, 394], ['slc-l1', 'SLC', 'u', 1343, 318, 86, 195], ['slc-l2', 'SLC', 'u', 1343, 517, 86, 195],
      ['slc-r1', 'SLC', 'u', 1832, 318, 90, 195], ['slc-r2', 'SLC', 'u', 1832, 517, 90, 195], ['phy-l', 'LPDDR5 PHY', 'u', 1270, 222, 68, 576], ['phy-r', 'LPDDR5 PHY', 'u', 1925, 222, 65, 576],
      ['npu2', 'NPU(2 つ目)', 'n', 1480, 717, 135, 72], ['media2', 'Media Engine(2 つ目)', 'u', 1700, 717, 225, 72]]),
    // M2(69502024-…1024x421.jpg の中央。ダイ 392×354)
    'apple-m2': af([356, 28, 748, 382], null, [[363, 138, 44, 55], [407, 138, 44, 55], [363, 272, 44, 48], [407, 272, 44, 48]], [[525, 205, 25, 25], [550, 205, 25, 25], [525, 235, 25, 25], [550, 235, 25, 25]], [
      ['phy-t', 'Memory PHY', 'u', 358, 30, 350, 22], ['gpu1', 'GPU', 'g', 380, 56, 305, 62], ['gpu2', 'GPU', 'g', 560, 120, 125, 62], ['slc', 'SLC', 'u', 463, 122, 95, 72], ['npu', 'NPU', 'n', 455, 285, 150, 48],
      ['io', 'I/O PHY ほか', 'u', 362, 336, 386, 46], ['phy-r', 'Memory PHY', 'u', 735, 90, 13, 200]]),
    // M2 Pro(FmsTp7NWIAAfVjB.jpg。ダイ 884×587)
    'apple-m2pro': af([8, 5, 892, 592], null, [[307, 92, 68, 70], [375, 92, 64, 70], [440, 92, 64, 70], [505, 92, 67, 70], [307, 292, 68, 48], [375, 292, 64, 48], [440, 292, 64, 48], [505, 292, 67, 48]], [[146, 131, 36, 32], [182, 131, 36, 32], [226, 165, 36, 34], [226, 200, 36, 32]], [
      ['media1', 'Media Engine', 'u', 612, 176, 124, 70], ['media2', 'Media Engine', 'u', 748, 150, 120, 70], ['npu', 'NPU', 'n', 636, 247, 160, 106], ['gpu', 'GPU', 'g', 197, 362, 505, 230], ['slc-l', 'SLC', 'u', 105, 362, 92, 230],
      ['slc-r', 'SLC', 'u', 702, 362, 90, 230], ['phy-l', 'LPDDR5', 'u', 25, 287, 70, 305], ['phy-r', 'LPDDR5', 'u', 808, 287, 82, 305]]),
    // M3(A3QSjPxt4…jpg の左。ダイ 276×230)
    'apple-m3': af([32, 366, 308, 596], null, [[38, 448, 40, 36], [78, 448, 40, 36], [68, 518, 40, 34], [108, 518, 40, 34]], [[170, 488, 28, 25], [198, 488, 28, 25], [170, 515, 28, 25], [198, 515, 28, 25]], [
      ['phy-t', 'LPDDR5', 'u', 35, 367, 265, 13], ['gpu', 'GPU', 'g', 40, 383, 262, 62], ['slc', 'SLC', 'u', 125, 446, 92, 42], ['npu', 'NPU', 'n', 35, 512, 31, 40], ['display', 'Display Engine', 'u', 258, 468, 46, 36], ['tb', 'Thunderbolt', 'u', 80, 572, 60, 22]]),
    // M3 Pro(同 中央。ダイ 284×344)
    'apple-m3pro': af([358, 252, 642, 596], null, [[525, 412, 32, 30], [557, 412, 32, 30], [475, 495, 32, 32], [507, 495, 32, 32], [539, 495, 32, 32], [571, 495, 32, 32]], [[594, 405, 22, 24], [616, 405, 22, 24], [594, 430, 22, 24], [616, 430, 22, 24], [594, 455, 22, 24], [616, 455, 22, 24]], [
      ['gpu-t', 'GPU', 'g', 368, 268, 258, 102], ['gpu-l', 'GPU', 'g', 368, 372, 82, 48], ['slc', 'SLC', 'u', 452, 372, 105, 36], ['npu', 'NPU', 'n', 606, 482, 32, 20], ['display', 'Display Engine', 'u', 375, 458, 95, 55],
      ['phy-t', 'LPDDR5', 'u', 358, 252, 284, 15], ['io', 'I/O ・Thunderbolt', 'u', 380, 555, 255, 40]]),
    // M3 Max(同 右。ダイ 460×482。GPU・LPDDR5 は下端 y≈595 まで)
    'apple-m3max': af([700, 115, 1160, 597], null, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [808 + 29 * i, 172, 29, 28]).concat([0, 1, 2, 3].map((i) => [868 + 29 * i, 238, 29, 22])), [[758, 220, 22, 24], [780, 220, 22, 24], [758, 248, 22, 24], [780, 248, 22, 24]], [
      ['io', 'I/O', 'u', 820, 118, 130, 18], ['tb', 'Thunderbolt', 'u', 962, 120, 140, 30], ['display', 'Display Engine ×3', 'u', 1058, 172, 100, 82], ['npu', 'NPU', 'n', 702, 182, 45, 70], ['gpu', 'GPU', 'g', 788, 328, 300, 269],
      ['slc-l', 'SLC', 'u', 742, 328, 42, 269], ['slc-r', 'SLC', 'u', 1090, 328, 42, 269], ['phy-l', 'LPDDR5', 'u', 703, 255, 35, 342], ['phy-r', 'LPDDR5', 'u', 1135, 260, 25, 337]]),
    // M4(GQmKpHhWwAAMHfw.jpg。ダイ 977×1009。画像内の寸法注記は単位の誤りなので使わない)
    'apple-m4': af([745, 73, 1722, 1082], null, [[765, 380, 110, 155], [878, 380, 112, 155], [862, 645, 112, 150], [975, 645, 112, 150]], [[1222, 578, 70, 55], [1222, 635, 70, 55], [1243, 700, 80, 50], [1340, 705, 65, 45], [1255, 765, 70, 55], [1328, 765, 75, 55]], [
      ['gpu', 'GPU', 'g', 818, 140, 840, 225], ['slc', 'SLC', 'u', 1100, 370, 262, 150], ['cache', 'CPU キャッシュ', 'u', 758, 553, 430, 85], ['npu', 'Neural Engine', 'n', 755, 645, 105, 285], ['media', 'Media Engines', 'u', 1545, 388, 108, 182],
      ['display', 'Display Engine', 'u', 1538, 645, 182, 175], ['tb', 'Thunderbolt ×4', 'u', 755, 930, 380, 150], ['io', 'I/O', 'u', 1140, 1015, 400, 65], ['phy-t', 'LPDDR5X', 'u', 815, 75, 775, 60], ['phy-r', 'LPDDR5X', 'u', 1658, 260, 62, 300]]),
    // M5(HS9wa9vbgAAb2Mm.jpg。ダイ 1728×1638)
    'apple-m5': af([92, 92, 1820, 1730], null, [[122, 632, 205, 262], [328, 632, 200, 262], [303, 1160, 205, 260], [508, 1160, 205, 260]], [[883, 975, 135, 100], [883, 1085, 135, 110], [790, 1205, 125, 100], [922, 1215, 135, 95], [1062, 1215, 140, 95], [1208, 1205, 125, 100]], [
      ['gpu-a', 'GPU', 'g', 195, 190, 1620, 205], ['gpu-b', 'GPU', 'g', 130, 408, 535, 215], ['gpu-c', 'GPU', 'g', 668, 408, 430, 215], ['gpu-d', 'GPU', 'g', 1100, 415, 540, 205],
      ['phy-t', 'LPDDR5X PHY', 'u', 195, 95, 1620, 85], ['phy-l', 'LPDDR5X PHY', 'u', 100, 135, 80, 235], ['phy-r', 'LPDDR5X PHY', 'u', 1735, 420, 80, 200], ['l2', 'L2(共有 8MiB ×2)', 'u', 122, 945, 490, 170],
      ['slc1', 'SLC', 'u', 676, 645, 205, 270], ['slc2', 'SLC', 'u', 965, 645, 205, 130], ['slc3', 'SLC', 'u', 945, 803, 212, 140], ['ane', 'ANE', 'n', 105, 1115, 195, 300], ['ane2', 'Neural Engine', 'n', 105, 1420, 440, 120],
      ['media', 'ProRes / Media / Decode', 'u', 1175, 642, 625, 175], ['encode', 'Encode Engine ×2', 'u', 1540, 880, 260, 485], ['isp', 'Apple ISP', 'u', 1337, 1000, 200, 300], ['dsp', 'DSP', 'u', 545, 1425, 365, 115],
      ['isp-cpu', 'ISP CPU', 'u', 912, 1425, 108, 110], ['display', 'Display Engine', 'u', 1025, 1425, 505, 115], ['se', 'Secure Enclave', 'u', 1585, 1385, 215, 150], ['hub', 'I/O Hub', 'u', 1145, 1540, 440, 70],
      ['tb', 'Thunderbolt 4 ×4', 'u', 118, 1548, 880, 180], ['phy-b', 'PCIe / USB / CSI PHY', 'u', 1000, 1620, 640, 110]]),
    // A14(CfQArDx7…png の左。ダイ 252×307)
    'apple-a14': af([38, 48, 290, 355], null, [[55, 243, 41, 25], [98, 243, 41, 25]], [[148, 188, 20, 18], [170, 188, 20, 18], [146, 240, 18, 18], [166, 240, 18, 18]], [
      ['gpu', 'GPU', 'g', 58, 80, 150, 68], ['slc', 'システムキャッシュ', 'u', 50, 150, 200, 28], ['npu', 'NPU', 'n', 55, 278, 140, 38], ['ddr-l', 'DDR', 'u', 38, 55, 10, 290], ['ddr-r', 'DDR', 'u', 280, 55, 10, 290]]),
    // A15(左がA16 …jpg の右半分。TechInsights のダイ写真。ダイ 718×1051。スケールバー 2.0 mm = 165 px)
    'apple-a15': af([738, 45, 1456, 1096], null, [[750, 687, 130, 135], [882, 687, 130, 135]], [[1008, 487, 76, 60], [1008, 560, 76, 58], [1048, 622, 74, 64], [1124, 622, 74, 64]], [
      ['gpu1', 'GPU', 'g', 790, 57, 155, 105], ['gpu2', 'GPU', 'g', 787, 165, 155, 105], ['gpu-sl', 'GPU SL', 'g', 946, 63, 74, 207], ['gpu3', 'GPU', 'g', 1023, 52, 155, 105], ['gpu4', 'GPU', 'g', 1021, 162, 154, 108], ['gpu5', 'GPU', 'g', 1183, 108, 155, 108],
      ['slc1', 'SLC(L3 cache)', 'u', 750, 272, 185, 185], ['slc2', 'SLC(L3 cache)', 'u', 1082, 275, 183, 185], ['p-cache1', 'CPU 1 cache', 'u', 750, 552, 90, 133], ['p-sl', 'CPU 1 SL', 'u', 842, 552, 68, 133], ['p-cache2', 'CPU 1 cache', 'u', 912, 552, 90, 133],
      ['e-sl', 'CPU 2 SL', 'u', 1084, 532, 64, 86], ['e-cache', 'CPU 2 cache', 'u', 1150, 532, 92, 86], ['npu', 'NPU(16)', 'n', 788, 828, 232, 212],
      ['ddr-l1', 'DDR', 'u', 740, 58, 22, 192], ['ddr-l2', 'DDR', 'u', 740, 828, 22, 168], ['ddr-r1', 'DDR', 'u', 1433, 58, 23, 196], ['ddr-r2', 'DDR', 'u', 1433, 896, 23, 170]]),
    // A12(A12_575px.jpg。TechInsights のダイ写真 + AnandTech の注釈。ダイ 658×556)
    'apple-a12': af([10, 10, 668, 566], null, [[183, 337, 87, 110], [183, 447, 87, 110]], [[440, 440, 45, 28], [440, 468, 45, 28], [440, 496, 45, 28], [440, 524, 45, 31]], [
      ['npu', 'NPU', 'n', 45, 337, 138, 193], ['l2', 'CPU L2(4 バンク)', 'u', 270, 337, 85, 220], ['small-l2', 'Small L2(2 バンク)', 'u', 355, 430, 85, 127], ['slc', 'System Cache(4 スライス)', 'u', 363, 203, 122, 225],
      ['gpu1', 'GPU', 'g', 485, 140, 175, 190], ['gpu2', 'GPU', 'g', 485, 332, 180, 195], ['ddr1', 'DDR Logic', 'u', 70, 22, 140, 22], ['ddr2', 'DDR Logic', 'u', 487, 22, 140, 22], ['ddr3', 'DDR Logic', 'u', 45, 531, 138, 26], ['ddr4', 'DDR Logic', 'u', 525, 531, 140, 26]]),
    // A13(A13_die.jpg。TechInsights のダイ写真 + Andrei の注釈。ダイ 660×562)
    'apple-a13': af([12, 10, 672, 572], null, [[170, 17, 100, 95], [170, 112, 100, 95]], [[190, 262, 48, 48], [190, 310, 48, 50], [310, 262, 50, 48], [310, 310, 50, 50]], [
      ['npu', 'NPU', 'n', 40, 47, 128, 143], ['big-l2', 'Big L2', 'u', 273, 17, 72, 200], ['small-l2', 'Small L2', 'u', 238, 262, 72, 98], ['slc', 'System Cache', 'u', 368, 17, 112, 342], ['gpu', 'GPU', 'g', 480, 17, 185, 370]]),
    // A16(左がA16 …jpg の左半分。Angstronomics の注釈。ダイ 733×1096。縦横比は a16-hd.jpg の 0.619)
    'apple-a16': af([2, 0, 735, 1096], 0.619, [[125, 690, 135, 140], [262, 690, 138, 140]], [[180, 396, 90, 66], [180, 466, 90, 66], [48, 540, 88, 64], [138, 540, 90, 64]], [
      ['gpu1', 'GPU', 'g', 100, 38, 150, 92], ['gpu2', 'GPU', 'g', 100, 132, 150, 92], ['gpu-sl', 'GPU SL', 'g', 253, 40, 77, 185], ['gpu3', 'GPU', 'g', 333, 32, 152, 92], ['gpu4', 'GPU', 'g', 330, 134, 152, 92], ['gpu5', 'GPU', 'g', 502, 84, 150, 92],
      ['slc1', 'SLC(12MB)', 'u', 25, 258, 172, 124], ['slc1-c', 'SLC Ctrl', 'u', 200, 256, 48, 126], ['slc2-c', 'SLC Ctrl', 'u', 373, 262, 48, 126], ['slc2', 'SLC(12MB)', 'u', 423, 262, 172, 126],
      ['l2e', 'L2(4MB)', 'u', 22, 450, 95, 90], ['l2e-c', 'L2 Ctrl', 'u', 118, 450, 60, 90], ['l2p1', 'L2(8MB)', 'u', 20, 607, 188, 76], ['l2p-c', 'L2 Ctrl', 'u', 210, 607, 102, 76], ['l2p2', 'L2(8MB)', 'u', 315, 607, 186, 76],
      ['npu', 'NPU(16 コア)', 'n', 60, 840, 340, 200], ['lp1', 'LPDDR5', 'u', 3, 28, 50, 175], ['lp2', 'LPDDR5', 'u', 683, 28, 50, 180], ['lp3', 'LPDDR5', 'u', 3, 905, 50, 190], ['lp4', 'LPDDR5', 'u', 683, 905, 50, 190]]),
    // A17 Pro(A17-Pro-die-shot_3.jpg。ダイ 1133×1747)
    'apple-a17pro': af([25, 33, 1158, 1780], null, [[217, 1268, 176, 228], [403, 1268, 178, 230]], [[455, 785, 132, 92], [455, 890, 132, 92], [505, 995, 130, 98], [645, 998, 120, 95]], [
      ['gpu1', 'GPU', 'g', 130, 90, 255, 185], ['gpu2', 'GPU', 'g', 512, 95, 255, 180], ['gpu3', 'GPU', 'g', 768, 85, 252, 180], ['gpu4', 'GPU', 'g', 130, 295, 258, 172], ['gpu5', 'GPU', 'g', 515, 298, 255, 172], ['gpu6', 'GPU', 'g', 780, 285, 248, 172],
      ['slc1', 'SLC(12MB)', 'u', 48, 480, 272, 252], ['slc2', 'SLC(12MB)', 'u', 548, 482, 275, 252], ['l2e', 'L2(4MB)', 'u', 662, 848, 145, 142], ['l2p1', 'L2(8MB)', 'u', 55, 1103, 265, 150], ['l2p2', 'L2(8MB)', 'u', 488, 1105, 268, 150],
      ['l2x', 'L2(3MB)', 'u', 42, 858, 172, 115], ['unk1', '小枠(用途の注記なし)', 'u', 50, 745, 205, 100], ['unk2', '小枠(用途の注記なし)', 'u', 48, 980, 215, 110]]),
    // A18 Pro(HighYield-A18-Pro.jpg の左。ChipWise の写真。横向きなので 90° 回転して縦にする。ダイ 612×375)
    'apple-a18pro': rotCW(af([8, 115, 620, 490], 0.649, [[436, 175, 95, 75], [436, 250, 95, 72]], [[265, 262, 38, 42], [303, 262, 40, 42], [343, 282, 35, 50], [343, 336, 35, 45]], [
      ['gpu0', 'GPU', 'g', 22, 148, 70, 80], ['gpu1', 'GPU', 'g', 92, 148, 70, 80], ['gpu2', 'GPU', 'g', 22, 232, 70, 163], ['gpu3', 'GPU', 'g', 92, 232, 70, 163], ['gpu4', 'GPU', 'g', 22, 398, 70, 72], ['gpu5', 'GPU', 'g', 92, 398, 70, 72],
      ['slc1', 'SLC', 'u', 163, 120, 85, 100], ['slc2', 'SLC', 'u', 165, 308, 78, 100], ['npu', 'NPU(8 コア)', 'n', 248, 120, 132, 82], ['e-cache', 'E-core cache', 'u', 285, 318, 55, 62], ['p-cache1', 'P-core cache', 'u', 382, 120, 52, 112], ['p-cache2', 'P-core cache', 'u', 382, 282, 52, 100]])),
    // A18(同 右。ダイ 554×367)
    'apple-a18': rotCW(af([636, 148, 1190, 515], 0.664, [[1032, 205, 90, 80], [1032, 285, 90, 78]], [[862, 292, 38, 38], [902, 292, 38, 38], [940, 318, 35, 38], [940, 368, 35, 35]], [
      ['gpu0', 'GPU', 'g', 648, 182, 70, 72], ['gpu1', 'GPU', 'g', 718, 182, 66, 72], ['gpu2', 'GPU', 'g', 648, 258, 70, 170], ['gpu3', 'GPU', 'g', 718, 258, 66, 170], ['gpu4', 'GPU', 'g', 648, 432, 70, 64],
      ['slc1', 'SLC', 'u', 787, 165, 46, 80], ['slc2', 'SLC', 'u', 789, 355, 43, 75], ['npu', 'NPU(8 コア)', 'n', 840, 158, 138, 80], ['e-cache', 'E-core cache', 'u', 893, 350, 45, 62], ['p-cache1', 'P-core cache', 'u', 977, 185, 52, 110], ['p-cache2', 'P-core cache', 'u', 977, 300, 52, 95]])),
    // A19 Pro(A19 Pro8.03x12.29x0.23mmdieshot.jpg。縮小コピー 1048×1600 で目測。ダイ 1027×1590)
    'apple-a19pro': af([5, 5, 1032, 1595], 0.6534, [[160, 1180, 190, 235], [350, 1180, 200, 235]], [[365, 722, 120, 73], [375, 835, 105, 85], [435, 940, 128, 75], [565, 940, 125, 75]], [
      ['gpu1', 'GPU', 'g', 22, 22, 248, 205], ['gpu2', 'GPU', 'g', 22, 235, 252, 190], ['gpu3', 'GPU', 'g', 415, 30, 245, 200], ['gpu4', 'GPU', 'g', 462, 235, 235, 195], ['gpu5', 'GPU', 'g', 660, 30, 255, 200], ['gpu6', 'GPU', 'g', 697, 235, 260, 195], ['gpu-l2', 'GPU L2', 'u', 277, 235, 160, 190],
      ['slc1', 'SLC(8MiB)', 'u', 85, 430, 250, 128], ['slc2', 'SLC(8MiB)', 'u', 85, 560, 250, 130], ['slc3', 'SLC(8MiB)', 'u', 515, 432, 268, 130], ['slc4', 'SLC(8MiB)', 'u', 515, 565, 268, 125], ['slc-c1', 'SLC Controller', 'u', 337, 432, 55, 258], ['slc-c2', 'SLC Controller', 'u', 460, 432, 55, 258],
      ['e-amx', 'E-AMX', 'u', 580, 705, 100, 90], ['e-l2', 'E L2(6MiB)', 'u', 583, 800, 190, 130], ['p-amx', 'P-AMX', 'u', 218, 838, 135, 200], ['npu', 'ANE(16)', 'n', 20, 695, 195, 345],
      ['p-l2a', 'P L2(8MiB)', 'u', 12, 1040, 262, 130], ['p-l2c', 'P Cluster L2(16MiB)', 'u', 278, 1040, 160, 130], ['p-l2b', 'P L2(8MiB)', 'u', 440, 1040, 262, 130],
      ['lpe', 'LPE コア ×2(プリセットに無い)', 'u', 557, 1258, 85, 100], ['video', 'Video Engine?', 'u', 790, 435, 150, 255], ['media', 'Media Engine?', 'u', 20, 1180, 135, 130], ['isp', 'ISP?', 'u', 705, 985, 190, 185], ['se', 'SE?', 'u', 720, 1290, 190, 120],
      ['display', 'Display?', 'u', 275, 1440, 260, 150], ['pcie', 'PCIe / ASDCI', 'u', 680, 1435, 350, 160], ['tbt', 'TBT/USB4 PHY ほか', 'u', 920, 25, 100, 200], ['lp-l', 'LPDDR5x', 'u', 8, 430, 72, 262], ['lp-l2', 'LPDDR5x', 'u', 12, 1335, 60, 160],
      ['lp-r1', 'LPDDR5x', 'u', 975, 230, 50, 170], ['lp-r2', 'LPDDR5x', 'u', 975, 1190, 52, 200], ['dphy', 'Display PHY', 'u', 15, 1520, 110, 60]]),
    // A20 Pro(A20Pro-8.00x12.35x0.67.jpg。縮小コピー 1034×1600 で目測。ダイ 1025×1585)
    'apple-a20pro': af([5, 10, 1030, 1595], 0.6478, [[262, 1015, 190, 215], [455, 1015, 190, 215]], [[8, 545, 120, 100], [8, 648, 120, 100], [8, 752, 125, 100], [135, 778, 115, 92]], [
      ['gpu1', 'GPU', 'g', 15, 40, 252, 160], ['gpu2', 'GPU', 'g', 268, 40, 250, 160], ['gpu3', 'GPU', 'g', 522, 40, 250, 160], ['gpu4', 'GPU', 'g', 775, 40, 150, 160], ['gpu5', 'GPU', 'g', 15, 205, 255, 160], ['gpu6', 'GPU', 'g', 680, 205, 240, 160], ['gpu7', 'GPU', 'g', 15, 370, 255, 160], ['gpu-l2', 'GPU L2(1MiB)', 'u', 385, 212, 283, 92],
      ['slc1', 'SLC(12MiB)', 'u', 282, 338, 235, 196], ['slc-c1', 'SLC Controller', 'u', 520, 375, 40, 160], ['slc-c2', 'SLC Controller', 'u', 640, 415, 40, 330], ['slc2', 'SLC(12MiB)', 'u', 682, 375, 235, 200], ['slc3', 'SLC(12MiB)', 'u', 682, 577, 235, 193],
      ['e-amx', 'E-AMX', 'u', 205, 555, 60, 50], ['e-l2', 'E L2(8MiB)', 'u', 190, 628, 245, 135], ['p-amx', 'P-AMX', 'u', 258, 765, 230, 105],
      ['p-l2a', 'P L2(8MiB)', 'u', 122, 875, 250, 110], ['p-l2c', 'P L2(16MiB)', 'u', 378, 875, 155, 110], ['p-l2b', 'P L2(8MiB)', 'u', 535, 875, 250, 110],
      ['ane-a', 'ANE', 'n', 8, 865, 112, 320], ['ane-b', 'ANE #1(Cache 2MiB)', 'n', 122, 990, 138, 240], ['ane-c', 'ANE', 'n', 8, 1185, 112, 100], ['ane-d', 'ANE #2(Cache 2MiB)', 'n', 8, 1290, 258, 185],
      ['lpe', 'LPE コア(プリセットに無い)', 'u', 650, 1118, 85, 70], ['isp', 'ISP?', 'u', 780, 1040, 150, 140], ['se', 'Secure Enclave', 'u', 715, 1195, 280, 260], ['video', 'Video Engine?', 'u', 275, 1240, 438, 230],
      ['media', 'Media Engine?', 'u', 8, 1480, 370, 112], ['usb', 'USB / Display?', 'u', 385, 1480, 335, 115], ['pcie', 'PCIe / ASDCI', 'u', 722, 1470, 308, 125], ['lp-r', 'LPDDR5X PHY(32bit)×3', 'u', 928, 205, 102, 615]]),
  };
  // M2 Max: M2 Pro の配置を土台に、GPU(と SLC・メモリ PHY)の領域を縦に 2 倍にし、CPU 側は同じ。下に Media(追加分)の帯を足す
  // (Apple 公表の M2 Pro → M2 Max: GPU コア 19→38、メモリ帯域 200→400GB/s、メディアエンジンのエンコード 1→2、CPU コア数は同じ)。面積はプリセットのまま。
  (function () {
    const p = APPLE_FRAMES['apple-m2pro']; const Y = 362;
    const deco = p.deco.map((d) => {
      if (d[0] === 'phy-l' || d[0] === 'phy-r') return [d[0], d[1], d[2], d[3], d[4], d[5], (Y - d[4]) + 2 * (592 - Y)];
      return d[4] >= Y ? [d[0], d[1], d[2], d[3], Y + (d[4] - Y) * 2, d[5], d[6] * 2] : d;
    }).concat([['media-ex', 'Media Engine(追加分)', 'u', 197, 822, 505, 150]]);
    const H = 972 - 5; const W = 884;
    APPLE_FRAMES['apple-m2max'] = af([8, 5, 892, 972], W / H, p.big, p.small, deco);
  })();
  const APPLE_MAP = {
    'apple-m1': { frame: 'apple-m1', basis: 'photo', src: 'FCBl1gcWEAUOdRw.jpg(Locuza 注釈。出典は推定: https://x.com/Locuza_/status/1450271726827413508)' },
    'apple-m1pro': { frame: 'apple-m1pro', basis: 'photo', src: 'FCBl1gcWEAUOdRw.jpg(Locuza 注釈。出典は推定)。縦横比は Figure3_M1_family…png の寸法注記(18.9×12.9 mm)と一致' },
    'apple-m1max': { frame: 'apple-m1max', basis: 'photo', src: 'FCBl1gcWEAUOdRw.jpg(Locuza 注釈。出典は推定)。縦横比は Figure3_M1_family…png の寸法注記(19.3×22.4 mm = 0.86)を優先' },
    'apple-m1ultra': { frame: 'apple-m1max', units: 2, basis: 'reuse', src: 'M1 Max の配置(FCBl1gcWEAUOdRw.jpg。Locuza 注釈。出典は推定: https://x.com/Locuza_/status/1450271726827413508)を上下に 2 つ(UltraFusion の接合)。外形は Figure3_M1_family_chip_photo_comparison_20220516-1-1024x592.png の寸法注記 19.3×44.8 mm = 0.43(出典は推定: https://hacarus.com/ai-lab/05202022-m1-ultra/)。M1 Ultra 自身のブロック注釈なし' },
    'apple-m2': { frame: 'apple-m2', basis: 'photo', src: '69502024-…_1024x421.jpg(Locuza / SemiAnalysis 注釈。出典は推定: SemiAnalysis の M2 die shot 記事)。低解像度で大まかな配置' },
    'apple-m2pro': { frame: 'apple-m2pro', basis: 'photo', src: 'FmsTp7NWIAAfVjB.jpg(High Yield 注釈。出典は推定: https://x.com/highyieldYT/status/1615407009334960129)' },
    'apple-m2max': { frame: 'apple-m2max', basis: 'reuse', src: 'M2 Pro(FmsTp7NWIAAfVjB.jpg)の配置を土台にした模式。M2 Max 自身のダイ写真なし。Apple 公表の M2 Pro → M2 Max の比較(GPU コア 19→38 で 2 倍、メモリ帯域 200→400GB/s で 2 倍、CPU コア数は同じ、メディアエンジンのエンコード 1→2、トランジスタ 400 億→670 億)に沿って GPU・SLC・メモリ PHY の領域を縦に 2 倍にし、下に Media 追加分の帯を足した(帯の大きさは面積合わせの模式)' },
    'apple-m2ultra': { frame: 'apple-m2max', units: 2, basis: 'reuse', src: 'M2 Max の模式(M2 Pro の FmsTp7NWIAAfVjB.jpg〔High Yield 注釈。出典は推定: https://x.com/highyieldYT/status/1615407009334960129〕の配置を、Apple 公表の M2 Pro → M2 Max の比較に沿って GPU 側を縦に 2 倍にした reuse)を上下に 2 つ。M2 Max・M2 Ultra 自身の写真がなく、二重の流用で根拠は弱い' },
    'apple-m3': { frame: 'apple-m3', basis: 'photo', src: 'A3QSjPxt4oYcYuy8i6kRtX-1200-80.jpg(High Yield 注釈。出典は推定: Tom’s Hardware の M3 注釈ダイ写真の記事)' },
    'apple-m3pro': { frame: 'apple-m3pro', basis: 'photo', src: 'A3QSjPxt4oYcYuy8i6kRtX-1200-80.jpg(High Yield 注釈。出典は推定: Tom’s Hardware の M3 注釈ダイ写真の記事)。コア数はプリセットの構成(M3 Pro は P6+E6、M3 Max は P12+E4。Apple 公表の 12 コア版・16 コア版と判断=推定)で、枠に実コアのブロックを置く。個々のコアの位置・大きさは写真の目測' },
    'apple-m3max': { frame: 'apple-m3max', basis: 'photo', src: 'A3QSjPxt4oYcYuy8i6kRtX-1200-80.jpg(High Yield 注釈。出典は推定: Tom’s Hardware の M3 注釈ダイ写真の記事)。コア数はプリセットの構成(M3 Pro は P6+E6、M3 Max は P12+E4。Apple 公表の 12 コア版・16 コア版と判断=推定)で、枠に実コアのブロックを置く。個々のコアの位置・大きさは写真の目測' },
    'apple-m4': { frame: 'apple-m4', basis: 'photo', src: 'GQmKpHhWwAAMHfw.jpg(Frederic_Orange 注釈。出典は推定: https://x.com/Frederic_Orange/status/1804125571670036831)。画像内の寸法注記は単位の誤りなので使わない' },
    'apple-m5': { frame: 'apple-m5', basis: 'photo', src: 'HS9wa9vbgAAb2Mm.jpg("Apple Silicon M5 | TSMC N3P"。作者表記なし。出典は X のユーザー提示 URL のうち推定)。HT9pyHnWYAAM3HY.jpg も同じ配置' },
    'apple-a14': { frame: 'apple-a14', basis: 'photo', src: 'CfQArDx7gRsAo3U5xpXsTC-750-80.png(A14 & M1 Die Photos。出典は推定: Tom’s Hardware の M1 と A14 の floorplan の記事)。低解像度・ラベルのみの大まかな配置' },
    'apple-a15': { frame: 'apple-a15', basis: 'photo', src: 'TechInsights のダイ写真(左がA16 02820a31-…_1736x1307.jpg の右半分。チップ名は画像内に無く、ユーザー申告で A15。スケールバー 2.0 mm = 165 px から約 8.7×12.75 mm 以上でプリセットの 110.1 mm² と整合。右端・下端が切れている可能性)。出典は推定: https://www.angstronomics.com/p/apple-a16-die-analysis の画像の右半分' },
    'apple-a12': { frame: 'apple-a12', basis: 'photo', src: 'A12_575px.jpg(TechInsights のダイ写真 + AnandTech の注釈。出典は推定: https://www.iphoneincanada.ca/2018/10/05/a12-bionic-review/ の転載)。チップ名は画像内に無く、ファイル名と Big 2 + Small 4 の構成から。低解像度でコア 1 個ずつの枠は無く、Big / Small の区画を 2 つ・4 つに分けた推定' },
    'apple-a13': { frame: 'apple-a13', basis: 'photo', src: 'A13_die.jpg(TechInsights のダイ写真 + Andrei の注釈。出典は推定: https://gadgets-news.ru/apple-a13-bionic/ の転載)。チップ名は画像内に無くファイル名と Lightning / Thunder の表記から。低解像度でコア 1 個ずつの枠は無く、区画を 2 つ・4 つに分けた推定' },
    'apple-a16': { frame: 'apple-a16', basis: 'photo', src: '左がA16 02820a31-…_1736x1307.jpg の左半分(Angstronomics の注釈 "Photo: TechanaLye / Edit/Marking: Angstronomics"。出典は推定: https://www.angstronomics.com/p/apple-a16-die-analysis)の配置。縦横比は注釈つき左半分の 0.671 ではなく、ダイの四辺のパッド列まで写る a16-hd.jpg(ラベルなしの高解像度写真。左半分との配置比較で A16 と対応づけ)の 0.619 を採用(8% の差。理由: a16-hd はダイ縁まで写る)。注釈画像はぼやけていて境界は粗い' },
    'apple-a17pro': { frame: 'apple-a17pro', basis: 'photo', src: 'A17-Pro-die-shot_3.jpg(作者表記なし。チップ名は画像内に無く**ファイル名のみ**。出典は推定: https://iphone-mania.jp/news-554645/ だが根拠は弱い)。a17pro.jpg(ラベルなしの高解像度写真)とは配置の比較で対応づけた。NPU の注記が無く、左の小枠 8 個は用途不明の飾りとして描く(NPU とは断定しない)' },
    'apple-a18': { frame: 'apple-a18', basis: 'photo', src: 'HighYield-A18-Pro.jpg の右(HighYield 注釈 + ChipWise の写真。画像内に出典 https://chipwise.tech/our-portfolio/apple-a18-a18-pro-die-shot/ の記載。横向きなので 90° 回転)。画像内の面積 90 mm² とプリセット 92.4 mm² の差(−2.6%)は記録のみ。縦横比は A18.jpg(ラベルなしの高解像度写真。GPU 5 個の模様と配置比較で A18 と対応づけ)の 0.664' },
    'apple-a18pro': { frame: 'apple-a18pro', basis: 'photo', src: 'HighYield-A18-Pro.jpg の左(HighYield 注釈 + ChipWise の写真。画像内に出典 https://chipwise.tech/our-portfolio/apple-a18-a18-pro-die-shot/ の記載。横向きなので 90° 回転)。画像内の面積 105 mm² とプリセット 109.7 mm² の差(−4.3%)は記録のみ。縦横比は A18P.jpg(ラベルなしの高解像度写真。GPU 6 個の模様と配置比較で A18 Pro と対応づけ)の 0.649' },
    'apple-a19pro': { frame: 'apple-a19pro', basis: 'photo', src: 'A19 Pro8.03x12.29x0.23mmdieshot.jpg(Kurnal の透かし。チップ名は画像内に無く、ファイル名と P/E のクロック 4.26 / 2.6 GHz がプリセットと一致することから。寸法 8.03×12.29 mm は**ファイル名のみで画像内に注記なし**。積 98.69 mm² = プリセット 98.7 mm²)。出典は推定: https://kurnal-insights.com/en/dieshot/?m=Apple。ISP? など「?」つきは作者も未確定。LPE コア 2 は飾り(プリセットに無く、コア数に数えない)' },
    'apple-a20pro': { frame: 'apple-a20pro', basis: 'photo', src: 'A20Pro-8.00x12.35x0.67.jpg(Kurnal の透かし。**チップ名は画像内に無くファイル名のみ**。寸法 8.00×12.35 mm は**ファイル名のみで画像内に注記なし**。積 98.80 mm² = プリセット 98.8 mm²)。出典は推定: https://kurnal-insights.com/en/dieshot/?m=Apple。ISP? など「?」つきは作者も未確定。LPE コアは飾り(プリセットに無く、コア数に数えない)' },
  };
  const FRAME_INFO = {
    'strix-point': { basis: 'photo', note: 'Strix Point(Ryzen AI 9 HX 370)の TechPowerUp 注釈つきダイ写真(1858×1200。X ユーザー @GPUsAreMagic の注釈。AMD の確認はない)の目測。ダイの縦横比は写真の 1.55(実寸 12.06×18.71 mm で 1.55)。Zen 5 ×4 + L3 16MB、Zen 5c ×8 + L3 8MB、GPU・NPU・PHY などは飾り' },
    'kraken-point': { basis: 'reuse', note: 'Strix Point(HX 370)のダイ写真の配置を流用し、構成の違い(Zen 5c は 4 個、GPU は 8CU で Strix の半分の面積、L3 は合計 16MB で内訳未取得のため 1 ブロック)を反映した目安。別のダイなので大きさはこのチップの写真・実測ではない。ダイ面積は未取得で仮寸法。ykZo39…jpg(出典・型番とも未確認のパッケージ写真。着色・注釈なし)は根拠にしておらず、その縦横比(約 1.4)とも合わない' },
  };
  // ---- Intel タイル型(x86-tile)の Compute タイル: 注釈つきダイ写真の目測の枠(写真の表示ピクセル座標。box がダイの外形)----
  // big = P コア枠(順に埋める)、small = E コア枠(クラスタ順)、lp = LP-E コア枠、l3 = L3 帯(1 ブロック)、deco = 飾り(kind: g=GPU n=NPU u=その他。計算除外)。
  // コア数が枠より少なければ空き枠のまま、多ければ fits() が false になり根拠を schematic に落とす。
  const quad = (x, y, w, h) => [[x, y, w / 2, h / 2], [x + w / 2, y, w / 2, h / 2], [x, y + h / 2, w / 2, h / 2], [x + w / 2, y + h / 2, w / 2, h / 2]];
  const tf = (box, nom, big, small, lp, l3, deco, tiles) => ({ box, aspect: (box[2] - box[0]) / (box[3] - box[1]), nom, big, small, lp, l3, deco, tiles: tiles || [] });
  const TILE_FRAMES = {
    // Meteor Lake Compute タイル(MTL_annotated.jpg 13000×6470 の表示 2000×995 で目測。Compute は左上 [510,297,862,618]、下は IO タイル)。P 6 + E 4 コア×2 クラスタ。LP-E 2 は写真では SoC タイル側
    'mtl-compute': tf([510, 297, 862, 618], { p: 6, e: 8, lp: 2 },
      [[520, 300, 75, 120], [600, 300, 72, 120], [678, 300, 74, 120], [520, 497, 78, 119], [600, 497, 72, 119], [678, 497, 74, 119]],
      quad(758, 300, 102, 118).concat(quad(758, 520, 102, 94)), [[824, 422, 36, 48], [824, 472, 36, 48]], [520, 420, 302, 77], []),
    // Arrow Lake Compute タイル(arrow lake cpudie al3.jpg 3231×1816 の表示 2000×1124。ARL_LQ_annotated.jpg の左のタイルと同配置)。P #1〜#8、E クラスタ #1〜#4(各 4 コア)、中央に L3 + リングエージェントの帯
    'arl-compute': tf([12, 28, 1975, 1048], { p: 8, e: 16, lp: 0 },
      [[62, 45, 262, 333], [62, 700, 262, 335], [727, 45, 258, 333], [727, 700, 258, 335], [1017, 45, 258, 333], [1017, 700, 258, 335], [1680, 45, 260, 333], [1680, 730, 260, 305]],
      quad(352, 45, 346, 333).concat(quad(352, 700, 346, 335), quad(1305, 45, 347, 333), quad(1305, 700, 347, 335)), [], [62, 392, 1773, 296],
      [['edge', 'リング右端・Fabric ほか', 'u', 1842, 385, 98, 335]]),
    // Lunar Lake Compute タイル(LNL_Package_Annotated.jpg 6742×6850 の表示 1904×1934。Compute は [380,712,1525,1315]、下は Platform Controller タイル)。P 4、LP-E(Skymont)4、L3 12MB、GPU・NPU・メディアは同じタイル内
    'lnl-compute': tf([380, 712, 1525, 1315], { p: 4, e: 0, lp: 4 },
      [[1237, 757, 141, 160], [1382, 757, 138, 160], [1237, 1050, 135, 160], [1382, 1050, 138, 160]], [], quad(990, 968, 190, 187), [1237, 920, 283, 128], [
        ['phy', 'LPDDR5X PHY', 'u', 585, 716, 925, 40], ['media', 'Media Engine', 'u', 720, 757, 305, 160], ['slc-l', 'SLC', 'u', 1030, 757, 50, 160], ['mc', 'メモリコントローラ', 'u', 1082, 757, 100, 160], ['slc-r', 'SLC', 'u', 1185, 757, 48, 160],
        ['gpu', 'GPU(Xe2-LPG 8)', 'g', 405, 762, 235, 552], ['gpu-l2a', 'GPU L2', 'g', 642, 767, 76, 148], ['unslice', 'Unslice・Interconnect', 'u', 642, 918, 76, 245], ['gpu-l2b', 'GPU L2', 'g', 642, 1165, 76, 150],
        ['npu', 'NPU', 'n', 722, 952, 212, 362], ['npu-c', 'NPU 制御・L2', 'n', 938, 955, 42, 200], ['display', 'Display Engine', 'u', 940, 1160, 240, 150], ['ipu', 'IPU', 'u', 1237, 1212, 285, 100]]),
    // Panther Lake Compute タイル(Kurnal の全体図 dh0gWbF8gG9AXfQw.jpg 2501×2000 の表示 2000×1599 で目測。Compute は [85,428,1328,1130]。panther-lake-computex26-die-annotated.jpg は同じタイルを 90° 回して反転した向きで、縦横比 0.564 の逆数 1.77 と一致し、L3・NPU・P・E の相対位置も対応)。
    // Cougar Cove P 4(上 2・下 2)、Darkmont E 4×2 クラスタ(左端の上下)、Darkmont LPE 4(中央)、L3 18MiB(6MiB×3)、NPU 5th、メモリコントローラ・MSC、Display?・Media?。右に GPU タイル(Xe3 12 コア)、下に Platform タイル(飾りのダイで表す)
    'ptl-compute': tf([85, 428, 1328, 1130], { p: 4, e: 8, lp: 4 },
      [[325, 497, 165, 203], [325, 848, 165, 205], [493, 497, 170, 203], [493, 848, 170, 205]],
      quad(97, 462, 225, 235).concat(quad(97, 848, 225, 235)), quad(727, 765, 225, 225), [152, 700, 513, 148], [
        ['phy', 'LPDDR5x / DDR5 PHY', 'u', 325, 432, 848, 45], ['mc', 'メモリコントローラ・メモリサイドキャッシュ', 'u', 665, 497, 240, 203], ['npu', 'NPU(5th。NCE ×3)', 'n', 915, 497, 345, 222],
        ['display', 'Display Engine?', 'u', 985, 760, 108, 360], ['media', 'Media Engine?', 'u', 1108, 760, 190, 360], ['soc-gpu', 'SoC to GPU', 'u', 1302, 432, 22, 320], ['soc-iod', 'SoC to IOD', 'u', 510, 1095, 470, 30]],
      // GPU タイル(Xe3 12 コア)と Platform タイルの飾りのダイ: 位置は Kurnal 全体図の目測(Compute の px を mm に換算)、寸法は設計書の調査表の Kurnal 寸法(GPU 8.14×6.78、I/O 12.44×4.00 mm。二次)。全体図の面積比(0.48・0.43)と 1% 以内で一致
      [['decor0', 'gpu-tile', 'GPU タイル(Xe3 12 コア。飾り・位置は推定)', 1343, 428, 1938, 1138, 6.78, 8.14], ['decor1', 'platform-tile', 'Platform タイル(飾り・位置は推定)', 250, 1135, 1340, 1480, 12.44, 4.0]]),
  };
  // ---- AMD のモノリシックダイ(Zeppelin・Raven Ridge・Cezanne・Rembrandt-R・Phoenix 1)と Strix Halo の SoC ダイの写真の枠(2026-11-03 追加)----
  // TILE_FRAMES と同じ形(写真の表示ピクセル座標。box がダイの外形)。template が amd-apu / x86-mono のダイが frame で使う。l3 は 1 枠か、枠の配列(Zeppelin の 2 CCX。容量は等分)。
  // 注釈のない写真(Phoenix 1・Rembrandt-R)は、構造が写真から読めるコア 8 個と L3 だけを置き、残りは 1 種類の「未判別」の飾りに分ける(推測で GPU・NPU を置かない)。
  const restOf = (box, c, label) => [
    ['rest-l', label, 'u', box[0], box[1], c[0] - box[0], box[3] - box[1]], ['rest-r', label, 'u', c[2], box[1], box[2] - c[2], box[3] - box[1]],
    ['rest-t', label, 'u', c[0], box[1], c[2] - c[0], c[1] - box[1]], ['rest-b', label, 'u', c[0], c[3], c[2] - c[0], box[3] - c[3]],
  ].filter((d) => d[5] > 0 && d[6] > 0);
  const REST_LABEL = 'GPU・NPU・I/O ほか(注釈なしの写真。内訳は未判別)';
  const ccxCols = (x0, y0, wl, wl3, wr, rowH) => { // 1 CCX(左コア列 | L3 | 右コア列、各 4 行)のコア枠(左上から下へ、次に右)
    const big = []; [0, 1].forEach((side) => { for (let i = 0; i < 4; i++) big.push([side === 0 ? x0 : x0 + wl + wl3, y0 + i * rowH, side === 0 ? wl : wr, rowH]); });
    return { big, l3: [x0 + wl, y0, wl3, rowH * 4] };
  };
  const PH1 = ccxCols(300, 110, 355, 285, 350, 165); const RMB = ccxCols(165, 15, 325, 360, 325, 190);
  const AMD_FRAMES = {
    // Zeppelin(Zen 1 / Zen+。Zeppelin_annotated.jpg 19700×8660 の表示 2000×879)。左の CCX は注釈つき(コア ×4 + L2 の列、中央 L3 8M)。右の CCX は写真では「CCX」とだけ注記で、同じ構造として左と同じ比率でコアと L3 を置いた(推定)
    // コアは 2 つの CCX に交互に割り当てる(6 コア = 3+3、4 コア = 2+2 の SKU に合わせる)
    zeppelin: tf([0, 0, 2000, 879], { p: 8, e: 0, lp: 0 },
      [[18, 272, 272, 206], [1025, 232, 275, 208], [18, 480, 272, 205], [1025, 441, 275, 207], [618, 272, 275, 206], [1632, 232, 278, 207], [618, 480, 275, 205], [1632, 441, 278, 207]], [], [],
      [[290, 272, 328, 413], [1300, 232, 332, 416]], [
        ['ifop-tl', 'IFOP PHY', 'u', 18, 8, 162, 108], ['tag-l', 'Tag Directory', 'u', 18, 150, 182, 112], ['ddr', '128bit DDR4 PHY', 'u', 212, 8, 628, 212], ['umc', 'UMC ×2 / CCM', 'u', 845, 8, 170, 205],
        ['cake1', 'CAKE / Fabric Switch', 'u', 1020, 8, 105, 145], ['ifop-t', 'IFOP PHY', 'u', 1152, 8, 303, 45], ['tag-t', 'Tag Directory', 'u', 1128, 55, 167, 98],
        ['ifis-t', 'IFIS / PCI-E x16 / SATA x8 PHY', 'u', 1460, 8, 525, 117], ['sata', 'SATA / 10GbE Buffers', 'u', 1350, 127, 580, 92],
        ['fab-mid', 'Fabric Switch / IOMS', 'u', 895, 245, 125, 200], ['cake-mid', 'CAKE ×3', 'u', 895, 448, 95, 135], ['ioroot', 'IO Root', 'u', 925, 652, 465, 182], ['ioroot-l', 'IO Root', 'u', 925, 586, 98, 66], ['ioroot-r', 'IO Root', 'u', 1390, 652, 440, 70],
        ['usb-buf', 'USB Buffers', 'u', 1430, 725, 185, 35], ['usb5g', 'USB 5G ×4', 'u', 1390, 790, 260, 80], ['usb-ctl', 'USB Control', 'u', 1655, 790, 75, 80], ['misc-io', 'Misc. IO + SMU', 'u', 1935, 225, 50, 575], ['misc-br', 'Misc. IO', 'u', 1730, 800, 255, 70],
        ['ifis-b', 'IFIS / PCI-E x16 PHY', 'u', 18, 750, 517, 120], ['psp', 'PSP / PSP ROM', 'u', 538, 742, 185, 80], ['wafl', 'WAFL Control / PHY', 'u', 725, 738, 195, 98], ['ifop-b', 'IFOP PHY', 'u', 540, 838, 725, 36]]),
    // Raven Ridge(RavenRidge_annotated.jpg 10461×5945 の表示 2000×1137)。1 CCX(コア ×4 + L2、中央 L3 4M)、右に Vega の GPU(Compute Unit)
    'raven-ridge': tf([0, 0, 2000, 1137], { p: 4, e: 0, lp: 0 },
      [[125, 255, 320, 235], [125, 495, 320, 235], [703, 255, 317, 235], [703, 495, 317, 235]], [], [], [445, 255, 258, 475], [
        ['ddr', '128 bit DDR4 PHY', 'u', 10, 8, 830, 215], ['mc', 'MC ×2', 'u', 842, 8, 218, 205], ['mm', 'Multimedia Engine', 'u', 1062, 8, 483, 92], ['ifr', 'IF Router', 'u', 1062, 102, 98, 190],
        ['rast', 'Rasterizer', 'g', 1162, 102, 226, 193], ['gpu-l2t', 'GPU L2 512K', 'g', 1547, 8, 438, 92], ['cu', 'GPU(Compute Unit)', 'g', 1390, 102, 595, 790], ['rop', 'ROP ×8', 'g', 1050, 297, 236, 205],
        ['gcp', 'GCP', 'g', 1050, 504, 236, 92], ['hws', 'HWS and ACEs', 'g', 1288, 380, 100, 510], ['gpu-l2b', 'GPU L2 512K', 'g', 1580, 895, 405, 108], ['disp', 'Display Engine', 'u', 1580, 1005, 405, 125],
        ['disp2', 'Display ×2', 'u', 1398, 1040, 178, 88], ['misc', 'Misc IO', 'u', 10, 225, 115, 780], ['ioroot', 'IO Root and Controllers', 'u', 222, 735, 1060, 205], ['psp', 'PSP', 'u', 125, 745, 95, 135],
        ['usbbuf', 'USB Buffers', 'u', 127, 942, 398, 63], ['usb-etc', 'USB / SATA / Display / IO Mux', 'u', 10, 1007, 978, 123], ['pcie', 'PCI-E x12', 'u', 990, 1010, 402, 118]]),
    // Cezanne(Cx4d2xiOUBzlnMX4.jpg 994×960 の上 918 px がダイ。Locuza 注釈)。コア 4+4(上下の 2 段)と中央の L3、右に Vega の GPU。写真の「8MB L3$」は注記のとおりで、プリセットの L3 16MB(ダイ全体)とは異なる
    cezanne: tf([0, 0, 994, 918], { p: 8, e: 0, lp: 0 },
      [0, 1, 2, 3].map((i) => [40 + 110 * i, 245, 110, 185]).concat([0, 1, 2, 3].map((i) => [40 + 110 * i, 648, 110, 190])), [], [], [40, 432, 440, 214], [
        ['ddr', 'DDR4 / LPDDR4X PHY', 'u', 12, 8, 535, 142], ['umc', 'Unified Memory Controller ×2', 'u', 12, 155, 310, 88], ['vcn', 'VCN Engine 2.2', 'u', 345, 155, 198, 88],
        ['gpu-l2a', 'GPU L2 256KB ×2', 'g', 485, 317, 100, 73], ['cu', 'GPU(GCN5 / Vega Compute Unit)', 'g', 483, 392, 270, 252], ['gpu-l2b', 'GPU L2 256KB ×2', 'g', 485, 646, 132, 40], ['rop', 'Color ROP ×4 / Z ROP ×16', 'g', 755, 470, 50, 190],
        ['phy-a', 'PHY Lanes', 'u', 895, 8, 95, 155], ['pcie', 'PCIe 3.0 PHY ×5', 'u', 895, 165, 95, 287], ['phy-b', 'PHY Lanes', 'u', 895, 454, 95, 64], ['phy-c', 'PHY Block ×4', 'u', 895, 652, 95, 263],
        ['io-b', '下辺(注釈なし。内訳は未判別)', 'u', 12, 842, 875, 72]]),
    // Rembrandt-R(Rembrandt-R-12.84x16.25.jpg 4275×5415 の表示 1579×2000。注釈なしの写真。縦横比 0.790 はファイル名の 12.84×16.25 mm と一致)。上の CCX だけ判別(左右 4 コア + 中央 L3)
    'rembrandt-r': tf([0, 0, 1579, 2000], { p: 8, e: 0, lp: 0 }, RMB.big, [], [], RMB.l3, restOf([0, 0, 1579, 2000], [165, 15, 1175, 775], REST_LABEL)),
    // Phoenix 1(zen4-Phoenix1-15.91x11.11x0.35mm.jpg 4439×6358 の表示 1396×2000。注釈なしの写真。縦横比 0.698 はファイル名の 15.91×11.11 mm と一致)。上の CCX だけ判別
    phoenix1: tf([0, 0, 1396, 2000], { p: 8, e: 0, lp: 0 }, PH1.big, [], [], PH1.l3, restOf([0, 0, 1396, 2000], [300, 110, 1290, 770], REST_LABEL)),
    // Strix Halo の SoC ダイ(Strix-Halo-All-16.02x19.20.jpg 6724×8237 の表示 1633×2000 の下側。Kurnal 注釈。上の 2 つは Zen 5 CCD)。ダイ 約 1625×1360 px(縦横比 1.195 = 19.2×16.02 mm)。コアは無く全部が飾り相当
    'strix-halo-soc': tf([5, 635, 1630, 1995], { p: 0, e: 0, lp: 0 }, [], [], [], null, [
      ['ifop1', 'New IFOP#1 with TSV?', 'u', 48, 640, 610, 38], ['ifop2', 'New IFOP#2 with TSV?', 'u', 835, 640, 605, 38], ['phy-l', 'LPDDR5X / DDR5 Memory PHY', 'u', 10, 740, 130, 645], ['phy-r', 'LPDDR5X / DDR5 Memory PHY(4×32bit)', 'u', 1492, 760, 135, 640],
      ['cache-ctl', 'Cache Control #1・#2', 'u', 160, 685, 135, 82], ['mall-l', 'MALL Cache 16MiB(#1〜#4)', 'u', 142, 770, 222, 615], ['mall-r', 'MALL Cache 16MiB(#5〜#8)', 'u', 1262, 765, 228, 630],
      ['gpu-l2', 'GPU L2 512KiB ×8', 'g', 392, 727, 845, 63], ['gpu-fe', 'GPU(RB+・Primitive・Rasterizer)', 'g', 405, 792, 830, 146], ['gpu-wgp', 'GPU(RDNA 3.5 WGP ×20)', 'g', 392, 942, 788, 682], ['dummy', 'Big Dummy Area(ダミー領域)', 'u', 1183, 968, 54, 387, 'deco'],
      ['npu', 'Ryzen XDNA NPU', 'n', 8, 1415, 350, 275], ['npu-ctl', 'NPU Control & Cache', 'n', 165, 1692, 190, 60], ['media', 'Media Engine #1・#2', 'u', 1207, 1408, 420, 195], ['display', 'Display Engine', 'u', 1250, 1608, 330, 160], ['dphy', 'Display PHY', 'u', 1583, 1700, 45, 160],
      ['pcie-ctl', 'PCIe 4.0 x16 / Buffer', 'u', 478, 1798, 385, 78], ['pcie-phy', 'PCIe 5.0 x4 PHY ×4', 'u', 478, 1878, 365, 75], ['usb3', 'USB Buffer / USB 3.x PHY', 'u', 868, 1840, 250, 120],
      ['usb4', 'USB4 Buffer / PHY ×2', 'u', 1122, 1772, 265, 190], ['phy-br', 'USB / Display PHY ほか', 'u', 1390, 1860, 235, 135]]),
  };
  Object.assign(TILE_FRAMES, AMD_FRAMES);
  // 枠ごとに使えるテンプレート(checkLayout が検査。Intel の枠は x86-tile だけ、AMD の単体ダイの枠は amd-apu / x86-mono、Strix Halo の SoC は amd-apu だけ)
  Object.keys(TILE_FRAMES).forEach((k) => { TILE_FRAMES[k].tpl = AMD_FRAMES[k] ? (k === 'strix-halo-soc' ? ['amd-apu'] : ['amd-apu', 'x86-mono']) : ['x86-tile']; });
  TILE_FRAMES['strix-halo-soc'].live = true; // 評価に影響しない点は同じだが、SoC ダイは従来どおり電力按分に参加する(従来の「GPU」1 ブロックは飾りではなかった)
  const AMD_SRC = {
    zeppelin: 'Zeppelin_annotated.jpg(Zeppelin。19700×8660。作者表記なし。出典 URL 未取得)。左の CCX は注釈つき(Zen 1 コア ×4 + L2 512K、L3 8M)、右の CCX は注記が「CCX」だけで、同じ構造として左と同じ比率でコアと L3 を置いた推定。2 つの CCX にコアを交互に割り当てる。縦横比は写真の 2.275(実寸の注記なし。213 mm² は PC Games Hardware。CCX 1 つの面積比 約 20.5% は AMD の CCX 44 mm² と整合)',
    'raven-ridge': 'RavenRidge_annotated.jpg(Raven Ridge。10461×5945。作者表記なし。出典 URL 未取得)。1 CCX(Zen 1 コア ×4 + L2 512K、L3 4M)、Vega の Compute Unit などの GPU、IO。縦横比は写真の 1.759(実寸の注記なし)。GPU の枠は Vega 11 CU 全体(2200G は 8CU 有効)',
    cezanne: 'Cx4d2xiOUBzlnMX4.jpg(Cezanne。Locuza 注釈。Fritzchens Fritz のダイ写真。画像内の出典 https://www.flickr.com/photos/130561288@N04/51375154375/)。Zen 3 コア 4+4、L3、Vega の GPU、PHY。写真の L3 は「8MB」の注記で、プリセットの 16MB とは別(L3 は 1 枠に全量を割り当てた)。実寸の注記なしで、縦横比は写真の 1.083',
    'rembrandt-r': 'Rembrandt-R-12.84x16.25.jpg(Rembrandt-R。4275×5415。@Kurnal の表記はないが Strix Halo の画像と同じ透かしあり。**注釈なし**。縦横比 0.790 = ファイル名の 12.84×16.25 mm と一致。ただし面積 208.7 mm² のプリセットの注記が Kurnal の実測 12.84×16.25 mm 由来で、同じ出典の可能性があり独立した検証にはならない。出典 URL 未取得)。上の CCX(左右 4 コア + 中央 L3)だけ写真の構造から置き、そのほか(GPU・NPU・メモリ PHY・I/O)は判別せず 1 種類の「未判別」の飾りにした。FH9oQiNXEAAwTeZ.jpg(Locuza の Rembrandt の推定モックアップ。Cezanne・Navi22 の写真から組んだ想像図)は実物と配置が違うので根拠にしていない',
    phoenix1: 'zen4-Phoenix1-15.91x11.11x0.35mm.jpg(Phoenix 1。4439×6358。**注釈なし**。縦横比 0.698 = ファイル名の 15.91×11.11 mm と一致、積 176.8 mm² = プリセット。出典 URL 未取得)。上の CCX(左右 4 コア + 中央 L3)だけ写真の構造から置き、そのほか(GPU・NPU・PHY・I/O)は判別せず 1 種類の「未判別」の飾りにした。Phoenix 2 の注釈つき写真(AMD-Phoenix-2-Die-Shot-annotated.preview.jpg)は別のダイ(Zen 4 ×2 + Zen 4c ×4)で、プリセットが無く使っていない',
  };
  const AMD_MAP = {
    'amd-zen1-1800x': { frame: 'zeppelin', basis: 'photo' }, 'amd-zen1-1500x': { frame: 'zeppelin', basis: 'photo', extra: '同じ Zeppelin ダイの SKU(コア無効。空き枠を残す)' }, 'amd-zen1-1200': { frame: 'zeppelin', basis: 'photo', extra: '同じ Zeppelin ダイの SKU(コア無効。空き枠を残す)' },
    'amd-zenplus-2700x': { frame: 'zeppelin', basis: 'reuse', extra: 'Zen+(Pinnacle Ridge。12nm)は Zeppelin(14nm)と同じ設計・ほぼ同じ面積(211.7 / 213 mm²)なので Zeppelin の写真の配置を流用(Pinnacle Ridge 自身の写真・測定なし)' },
    'amd-zenplus-2600x': { frame: 'zeppelin', basis: 'reuse', extra: 'Zen+(Pinnacle Ridge。12nm)は Zeppelin(14nm)と同じ設計・ほぼ同じ面積(211.7 / 213 mm²)なので Zeppelin の写真の配置を流用(Pinnacle Ridge 自身の写真・測定なし)。コア無効の SKU で空き枠を残す' },
    'amd-raven-2400g': { frame: 'raven-ridge', basis: 'photo' }, 'amd-raven-2200g': { frame: 'raven-ridge', basis: 'photo', extra: '2400G と同じダイ' },
    'amd-zen3-5800u': { frame: 'cezanne', basis: 'photo' }, 'amd-zen3p-7735hs': { frame: 'rembrandt-r', basis: 'photo' }, 'amd-zen4-7840hs': { frame: 'phoenix1', basis: 'photo' },
  };
  // Strix Halo の SoC ダイ(CCD は別ダイ)に写真の枠を当てる。classify の socDie と、design.fromPreset が使う
  const SOC_DIE = { 'amd-strixhalo-395': { frame: 'strix-halo-soc', src: 'Strix-Halo-All-16.02x19.20.jpg(Kurnal の注釈。6724×8237。出典は推定: https://kurnal-insights.com/en/dieshot/?sort=yearDesc&m=AMD&t=desktop-soc&id=amd-strix-halo-full-package)。SoC ダイの縦横比 1.195 は 19.2×16.02 mm(ファイル名の 16.02x19.20。積 307.6 mm² = プリセットの面積)と一致。注釈に「?」つきの項目あり(作者も未確定)。GPU の WGP 20 個(40CU)・NPU・MALL・PHY などはすべてプリセットに無いブロックで、SoC ダイは従来どおり電力按分に参加する' } };
  // Strix Halo の Zen 5 CCD(CCD ×2 の写真。同じ画像の上側。SoC ダイと同尺で、CCD 1 つ 767×625 px = 約 9.06×7.39 mm = 66.9 mm² でプリセットの 67.1 mm² と整合)
  const RECIPE_OF = { 'amd-strixhalo-395': 'Zen 5 (Strix Halo)' };
  const TILE_SRC = {
    'mtl-compute': 'MTL_annotated.jpg(Meteor Lake。作者表記なし。チップ名は画像内の Redwood Cove / Crestmont / Xe-LPG とファイル名から)。P 6 + E 4 コア×2 クラスタ。LP-E 2 は写真では SoC タイル側にあるが、コアのブロックは Compute タイルのダイに置く仕様なので、右端の SoC Tile Interconnect の帯の上に模式で重ねた(実際の位置ではない)',
    'arl-compute': 'arrow lake cpudie al3.jpg(Arrow Lake の Compute タイルの拡大注釈。ARL_LQ_annotated.jpg の左のタイルと同じ配置。作者表記なし)。P #1〜#8、E クラスタ #1〜#4(各 4 コア)、中央に L3 とリングエージェントの帯',
    'lnl-compute': 'LNL_Package_Annotated.jpg(Lunar Lake のパッケージ注釈。作者表記なし)。Compute タイル(P 4・LP-E 4・L3・GPU・NPU・メディアが一枚)',
    'ptl-compute': 'Kurnal の Panther Lake 全体図 dh0gWbF8gG9AXfQw.jpg と panther-lake-computex26-die-annotated.jpg(同じ Compute タイル。縦横比 1.77 が一致)。P 4・Darkmont E 4×2 クラスタ・LPE 4・L3 18MiB・NPU・メディアなど',
  };
  const tm = (frame, basis, extra) => ({ frame, basis, src: TILE_SRC[frame] + (extra ? `。${extra}` : '') });
  const PTL_NOTE = '写真は Compute タイル(Kurnal 全体図の向き)。画像に縮尺の注記はなく、Compute の 115.1mm² はプリセット値(Kurnal・二次)を当てはめた。GPU(12Xe)・Platform タイルの飾りのダイの寸法も Kurnal の二次値で独立した検証なし、位置は目測の推定';
  const PTL_REUSE = '388H と同じ 4P+8E+4LP-E の Compute タイルの流用(プリセット側の注記に従う。258V・256V と同じ基準)。';
  const TILE_MAP = {
    'intel-mtl-185h': tm('mtl-compute', 'photo'),
    'intel-arl-285k': tm('arl-compute', 'photo'),
    'intel-arl-265k': tm('arl-compute', 'reuse', '285K の配置を流用(E クラスタ 1 つ無効の SKU。空いた枠は最後のクラスタ)'),
    'intel-arl-275hx': tm('arl-compute', 'reuse', '285K の配置を流用(HX が同じ Compute タイルなのは検索要約で原ページ未確認)'),
    'intel-lnl-268v': tm('lnl-compute', 'photo'),
    'intel-lnl-258v': tm('lnl-compute', 'reuse', '268V と同じ Compute タイルの流用(プリセット側の注記に従う)'),
    'intel-lnl-256v': tm('lnl-compute', 'reuse', '268V と同じ Compute タイルの流用(プリセット側の注記に従う)'),
    'intel-ptl-x9-388h': tm('ptl-compute', 'photo', PTL_NOTE),
    // 386H は GPU が 4Xe(プリセットの notes)。12Xe の GPU タイルは出さない(4Xe の寸法は二次資料なし)。Platform タイルのみ
    'intel-ptl-x9-386h': Object.assign(tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE + '。386H の GPU は 4Xe のため GPU タイルは出さない'), { skip: ['gpu-tile'] }),
    'intel-ptl-x9-378h': tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE),
    'intel-ptl-x7-358h': tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE),
  };
  // AMD CCD(8 コア): top = 上部の帯(Debug / Infinity Fabric / SMU)の高さ比、core = コア+L2 の幅比(左右とも)、aspect = 幅/高さ。
  const CCD_RECIPES = {
    'Zen 3': { aspect: 1.516, top: 0.154, core: 0.247, basis: 'photo', note: 'Zen 3 CCD の注釈つきダイ写真(WCCFTech、ユーザー提示)の目測(上部の帯 約15%、コア+L2 約25%、L3 約50%)。面積比は AMD 公表(CCX 68 / CCD 81 mm²)と Locuza(二次)と整合' },
    'Zen 5': { aspect: 1.188, top: 0.174, core: 0.354, basis: 'survey', note: 'Fritzchens Fritz の Zen 5 CCD 測定値(コア+L2 7.1%、L3 23.3%。二次)' },
    'Zen 5 (Strix Halo)': { aspect: 1.227, top: 0.127, core: 0.355, basis: 'photo', note: 'Strix Halo の Zen 5 CCD ×2 の注釈つきダイ写真(Strix-Halo-All-16.02x19.20.jpg の上側。Kurnal の注釈。出典は推定)の目測(縦横比 767×625 px = 1.227、IFOP の帯 約 13%、コア+L2 約 35.5%、L3 約 29%)。SoC ダイと同尺の写真で、CCD 1 つ 約 66.9 mm² はプリセットの 67.1 mm² と整合。9950X の Zen 5 CCD(Fritzchens Fritz の測定値の比)とも近い' },
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
    if (preset && preset.vendor === 'Apple' && APPLE_MAP[preset.id]) {
      const m = APPLE_MAP[preset.id]; const dies = preset.dies || [];
      if (!dies.length) return null;
      return { uncore: false, igpu: false, npu: false, template: 'apple-soc', units: m.units || 1, frame: m.frame, dieIndex: 0, scaleBasis: m.basis, scaleNote: `${m.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま。出典 URL はファイル名・透かしからの推定で、ユーザー提示の URL のうちのどれかは要確認`, iodGpu: false, decorIod: false };
    }
    if (!preset || preset.isa !== 'x86') return null;
    const dies = preset.dies || [];
    const groups = (preset.cfg && preset.cfg.cores) || [];
    if (!dies.length || !groups.length) return null;
    const role = typeof roleOf === 'function' ? roleOf : () => 'compute';
    const facts = DECOR_FACTS[preset.id] || {};
    const base = { uncore: false, igpu: false, npu: false, units: 1, scaleBasis: 'schematic', scaleNote: '', iodGpu: false, decorIod: false };
    const ccd = dies.findIndex((d) => /CCD/i.test(d.name || ''));
    if (ccd >= 0) {
      const u = firstBigUarch(preset);
      const known = Object.prototype.hasOwnProperty.call(CCD_RECIPES, u);
      const key = RECIPE_OF[preset.id] || (known ? u : DEFAULT_RECIPE); const rc = CCD_RECIPES[key];
      const sd = SOC_DIE[preset.id]; const socIdx = sd ? dies.findIndex((d, i) => i !== ccd && /SoC/i.test(d.name || '')) : -1;
      return Object.assign(base, {
        socDie: socIdx >= 0 ? { dieIndex: socIdx, frame: sd.frame } : null,
        template: 'amd-chiplet', units: ccdUnits(dies[ccd].name), dieIndex: ccd, recipe: key,
        scaleBasis: known || RECIPE_OF[preset.id] ? rc.basis : 'reuse', scaleNote: known || RECIPE_OF[preset.id] ? rc.note : `${CCD_RECIPES[DEFAULT_RECIPE].note}(この世代の値なし。流用)`,
        iodGpu: known && (u === 'Zen 4' || u === 'Zen 5'), // Zen 4 以降(Raphael・Granite Ridge)の IOD には内蔵 GPU がある
        decorIod: dies.length === 1 && u === 'Zen 3', // IOD のデータが無い Zen 3 の CCD 単独のプリセット: 飾りの IO ダイを別欄に出す
      });
    }
    const ci = dies.findIndex((d) => role(d.name) === 'compute');
    if (ci < 0) return null;
    const dname = dies[ci].name || '';
    if (/タイル|tile/i.test(dname)) {
      const tmap = TILE_MAP[preset.id];
      if (tmap && TILE_FRAMES[tmap.frame]) return Object.assign(base, { template: 'x86-tile', dieIndex: ci, frame: tmap.frame, scaleBasis: tmap.basis, scaleNote: `${tmap.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま。出典 URL は未申告(推定・要ユーザー確認)` });
      return Object.assign(base, { template: 'x86-tile', dieIndex: ci });
    }
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
      const am = AMD_MAP[preset.id];
      if (am && TILE_FRAMES[am.frame]) {
        const note = `${AMD_SRC[am.frame]}${am.extra ? `。${am.extra}` : ''}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま`;
        return Object.assign(base, { template: facts.igpu ? 'amd-apu' : 'x86-mono', uncore: true, igpu: !!facts.igpu, npu: !!facts.npu, dieIndex: ci, frame: am.frame, scaleBasis: am.basis, scaleNote: note });
      }
      if (facts.igpu) {
        if (facts.frame && FRAME_INFO[facts.frame]) {
          const fi = FRAME_INFO[facts.frame];
          return Object.assign(base, { template: 'amd-apu', uncore: true, igpu: true, npu: !!facts.npu, dieIndex: ci, frame: facts.frame, scaleBasis: fi.basis, scaleNote: fi.note });
        }
        return Object.assign(base, { template: 'amd-apu', uncore: true, igpu: true, npu: !!facts.npu, dieIndex: ci, scaleBasis: 'schematic', scaleNote: 'ブロックの大きさに根拠なし(このチップの写真・測定なし)' });
      }
      return Object.assign(base, { template: 'x86-mono', uncore: true, dieIndex: ci });
    }
    return null;
  }

  // Strix Halo の SoC ダイ(classify の socDie)→ そのダイの layout(コアなし。写真の枠の飾りだけ)。design.fromPreset が使う
  function socLayout(preset) {
    const sd = preset && SOC_DIE[preset.id]; if (!sd) return null;
    return { template: 'amd-apu', uncore: false, igpu: false, npu: false, units: 1, scaleBasis: 'photo', scaleNote: `${sd.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま`, frame: sd.frame };
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
      case 'x86-mono': return TILE_FRAMES[layout.frame] ? TILE_FRAMES[layout.frame].aspect : 1.1;
      case 'apple-soc': { const a = APPLE_FRAMES[layout.frame]; return a ? a.aspect / u : 1; }
      case 'amd-apu': return FRAMES[layout.frame] ? FRAMES[layout.frame].W / FRAMES[layout.frame].H : TILE_FRAMES[layout.frame] ? TILE_FRAMES[layout.frame].aspect : 1.1;
      case 'x86-tile': return TILE_FRAMES[layout.frame] ? TILE_FRAMES[layout.frame].aspect : 1.2;
      case 'amd-chiplet': return (CCD_RECIPES[layout.recipe] || CCD_RECIPES[DEFAULT_RECIPE]).aspect * (u + (u - 1) * CCD_GAP);
      default: return null;
    }
  }

  // 編集後のコア数が、写真・調査の枠(ダイの実際のコア枠数)に収まるか
  function fits(layout, cores) {
    if (!layout) return true;
    const flat = []; (cores || []).forEach((g) => { for (let i = 0; i < (g.count || 0); i++) flat.push(g); });
    const nBig = flat.filter((g) => !isSmall(g.type)).length; const nSmall = flat.length - nBig;
    if (layout.template === 'apple-soc') { const a = APPLE_FRAMES[layout.frame]; const un = layout.units || 1; return !!a && nBig <= a.big.length * un && nSmall <= a.small.length * un; }
    if (usesTileFrame(layout) && TILE_FRAMES[layout.frame]) { const t = TILE_FRAMES[layout.frame]; const nLp = flat.filter((g) => /^LP/i.test(String(g.type || ''))).length; return nBig <= t.big.length && nSmall - nLp <= t.small.length && nLp <= t.lp.length; }
    if (FRAMES[layout.frame]) return nBig <= FRAMES[layout.frame].MAX_BIG && nSmall <= FRAMES[layout.frame].MAX_SMALL;
    if (layout.template === 'intel-hybrid' && layout.slots) return nBig <= layout.slots.p && nSmall <= layout.slots.e;
    if (layout.template === 'amd-chiplet') return flat.length <= 8 * (layout.units || 1);
    return true;
  }
  // TILE_FRAMES の枠を使うテンプレート(Intel のタイル、AMD の APU・モノリシックのダイ写真)
  function usesTileFrame(layout) { return !!layout && (layout.template === 'x86-tile' || layout.template === 'amd-apu' || layout.template === 'x86-mono'); }
  const EDITED_NOTE = '編集でコア数が元のダイの枠を超えたため、ブロックの大きさに根拠はありません';
  // 編集後の layout(枠を超えたら根拠を schematic に落とす。超えなければそのまま)
  function afterEdit(layout, cores, l3MB) {
    if (!layout || layout.scaleBasis === 'schematic') return layout;
    // Apple は cfg に L3 が無く(SLC は飾り)、写真の枠に L3 の置き場所が無い。編集で L3 を足したら根拠なしの従来配置に落とす
    if (layout.template === 'apple-soc' && typeof l3MB === 'number' && l3MB > 0) return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: '編集で L3 を追加したため、ブロックの大きさに根拠はありません(Apple の写真の枠に L3 は無い)' });
    if (fits(layout, cores)) return layout;
    return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: EDITED_NOTE });
  }

  const checkLayout = (l) => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) return 'layout: 形式が違います';
    if (typeof l.template !== 'string') return 'layout.template が文字列ではありません';
    if (TEMPLATE_IDS.indexOf(l.template) < 0) return `layout.template「${l.template}」は未知のテンプレートです`;
    for (const k of ['uncore', 'igpu', 'npu']) if (l[k] != null && typeof l[k] !== 'boolean') return `layout.${k} は true か false にしてください`;
    if (l.units != null && !(Number.isInteger(l.units) && l.units >= 1 && l.units <= MAX_UNITS)) return `layout.units は 1〜${MAX_UNITS} の整数にしてください`;
    if (l.scaleBasis != null && SCALE_BASES.indexOf(l.scaleBasis) < 0) return 'layout.scaleBasis は photo / survey / reuse / schematic のどれかにしてください';
    if (l.scaleNote != null && !(typeof l.scaleNote === 'string' && l.scaleNote.length <= 600)) return 'layout.scaleNote は 600 文字以内の文字列にしてください';
    if (l.frame != null) {
      if (typeof l.frame !== 'string') return 'layout.frame が文字列ではありません';
      // template と frame の対応: apple-soc は APPLE_FRAMES、amd-apu は FRAMES(Strix・Kraken)か TILE_FRAMES、x86-tile・x86-mono は TILE_FRAMES(Intel の Compute タイル・AMD のダイ写真の枠)。ほかのテンプレートは frame を持たない
      const has = (o) => Object.prototype.hasOwnProperty.call(o, l.frame);
      if (l.template === 'apple-soc' ? !has(APPLE_FRAMES) : l.template === 'x86-tile' || l.template === 'x86-mono' ? !(has(TILE_FRAMES) && TILE_FRAMES[l.frame].tpl.indexOf(l.template) >= 0) : (l.template !== 'amd-apu' || !(has(FRAMES) || (has(TILE_FRAMES) && TILE_FRAMES[l.frame].tpl.indexOf(l.template) >= 0)))) return `layout.frame「${l.frame}」はテンプレート ${l.template} では使えません`;
    } else if (l.template === 'apple-soc') return 'apple-soc には layout.frame が要ります';
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

    const AF = L.template === 'apple-soc' ? APPLE_FRAMES[L.frame] : null;
    if (AF && L.scaleBasis !== 'schematic' && fits(L, cores)) {
      // Apple: ダイ写真の枠に沿う。units > 1(Ultra)は同じ枠を上下に重ねる。コアを無効化した分・構成未取得の枠は空き(未取得のときは飾りで表す)
      const un = Math.max(1, L.units || 1); const FW = AF.box[2] - AF.box[0]; const FH = AF.box[3] - AF.box[1];
      const KIND = { g: 'gpu', n: 'npu', u: 'uncore' };
      const bigAll = flat.filter((g) => !isSmall(g.type)); const smallAll = flat.filter((g) => isSmall(g.type));
      const sl = (list, i) => { const base = Math.floor(list.length / un); const extra = list.length % un; const from = i * base + Math.min(i, extra); return list.slice(from, from + base + (i < extra ? 1 : 0)); };
      for (let u = 0; u < un; u++) {
        const sx = W / FW; const sy = (H / un) / FH; const oy = u * (H / un); const ip = un > 1 ? `${die.id}-u${u}-` : `${die.id}-`;
        const X = (x) => (x - AF.box[0]) * sx; const Y = (y) => oy + (y - AF.box[1]) * sy;
        const b = sl(bigAll, u); const s2 = sl(smallAll, u);
        AF.big.forEach((r, i) => { if (i < b.length) coreBlock(b[i], X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy); else if (!flat.length) put(`${ip}pslot${i}`, 'uncore', 'P コア(構成未取得)', X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy, deco); });
        AF.small.forEach((r, i) => { if (i < s2.length) coreBlock(s2[i], X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy); else if (!flat.length) put(`${ip}eslot${i}`, 'uncore', 'E コア(構成未取得)', X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy, deco); });
        AF.deco.forEach((d) => put(ip + d[0], KIND[d[2]], d[1], X(d[3]), Y(d[4]), d[5] * sx, d[6] * sy, deco));
      }
      return blocks;
    }
    const TF = usesTileFrame(L) ? TILE_FRAMES[L.frame] || null : null;
    if (TF && L.scaleBasis !== 'schematic' && fits(L, cores)) {
      // Intel タイル型の Compute タイル: 写真の枠に沿う。コアは P → E(クラスタ順)→ LP-E の順に枠へ。余った枠は空き。飾り・L3 は枠のとおり
      const sx = W / (TF.box[2] - TF.box[0]); const sy = H / (TF.box[3] - TF.box[1]);
      const X = (x) => (x - TF.box[0]) * sx; const Y = (y) => (y - TF.box[1]) * sy;
      const KIND = { g: 'gpu', n: 'npu', u: 'uncore' };
      const isLp = (g) => /^LP/i.test(String(g.type || ''));
      const bigs = flat.filter((g) => !isSmall(g.type)); const lps = flat.filter(isLp); const es = flat.filter((g) => isSmall(g.type) && !isLp(g));
      [[bigs, TF.big], [es, TF.small], [lps, TF.lp]].forEach((pr) => pr[0].forEach((g, i) => { const r = pr[1][i]; coreBlock(g, X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy); }));
      if (hasL3 && TF.l3) {
        const rs = Array.isArray(TF.l3[0]) ? TF.l3 : [TF.l3]; // 複数枠(Zeppelin の 2 CCX)は容量を等分
        rs.forEach((r, i) => put(rs.length === 1 ? `${die.id}-l3` : `${die.id}-l3-${i}`, 'l3', `L3 ${rs.length === 1 ? l3MB : Math.round((l3MB / rs.length) * 100) / 100}MB`, X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy));
      }
      TF.deco.forEach((d) => put(`${die.id}-${d[0]}`, KIND[d[2]], d[1], X(d[3]), Y(d[4]), d[5] * sx, d[6] * sy, TF.live && d[7] !== 'deco' ? undefined : deco));
      return blocks;
    }
    const FR = FRAMES[L.frame];
    if (FR && fits(L, cores)) {
      const sx = W / FR.W; const sy = H / FR.H;
      const R = (id, kind, label, x, y, w, h, extra) => put(id, kind, label, x * sx, y * sy, w * sx, h * sy, extra);
      const big = flat.filter((g) => !isSmall(g.type)); const small = flat.filter((g) => isSmall(g.type));
      big.forEach((g, i) => coreBlock(g, (FR.Z5.x + i * FR.Z5.w) * sx, FR.Z5.y * sy, FR.Z5.w * sx, FR.Z5.h * sy));
      small.forEach((g, i) => coreBlock(g, (FR.Z5C.x + (i % 4) * FR.Z5C.w) * sx, FR.Z5C.y[Math.floor(i / 4)] * sy, FR.Z5C.w * sx, FR.Z5C.h * sy));
      if (hasL3) {
        if (FR.L3_MODE === 'two') {
          const a = Math.round((l3MB * 2 / 3) * 100) / 100; const b = Math.round((l3MB - a) * 100) / 100; // 写真は Zen 5 側 16MB・Zen 5c 側 8MB(2:1)
          R(`${die.id}-l3`, 'l3', `L3 ${a}MB`, FR.Z5_L3.x, FR.Z5_L3.y, FR.Z5_L3.w, FR.Z5_L3.h);
          R(`${die.id}-l3-1`, 'l3', `L3 ${b}MB`, FR.Z5C_L3.x, FR.Z5C_L3.y, FR.Z5C_L3.w, FR.Z5C_L3.h);
        } else R(`${die.id}-l3`, 'l3', `L3 ${l3MB}MB`, FR.Z5_L3.x, FR.Z5_L3.y, FR.Z5_L3.w, FR.Z5_L3.h); // 内訳(Zen 5 側 / Zen 5c 側)は未取得
      }
      FR.DECO.forEach((d) => R(`${die.id}-${d[0]}`, 'uncore', d[1], d[2], d[3], d[4], d[5], deco));
      if (L.npu) R(`${die.id}-npu`, 'npu', 'NPU', FR.NPU[0], FR.NPU[1], FR.NPU[2], FR.NPU[3], deco);
      if (L.igpu) FR.GPU.forEach((d) => R(`${die.id}-${d[0]}`, 'gpu', d[1], d[2], d[3], d[4], d[5], deco));
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

  const api = { TEMPLATES, TEMPLATE_IDS, DECOR_FACTS, CCD_RECIPES, SCALE_BASES, SCALE_TEXT, MAX_UNITS, DECOR_IOD, APPLE_FRAMES, TILE_FRAMES, tileDecor, classify, toLayout, socLayout, aspectOf, checkDecorDies, decorNote, checkLayout, fits, afterEdit, layoutDie, iodBlocks, scaleText, isSmall };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.floorplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
