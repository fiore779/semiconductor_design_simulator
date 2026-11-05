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
    'arm-soc': 'Arm SoC(Snapdragon・Dimensity・Switch 2 の T239・GB10 の S-die。ダイ写真に倣う)',
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
  // 縦横比だけ写真のファイル名の寸法に合わせた模式図(layout.aspect を持つ schematic。ASPECT_ONLY の 4 件)の注記
  const ASPECT_ONLY_TEXT = '縦横比だけ写真(ファイル名の寸法)に合わせた模式図。ブロックの配置・大きさは模式で根拠なし';
  const scaleText = (layout) => (layout && layout.scaleBasis === 'schematic' && typeof layout.aspect === 'number' ? ASPECT_ONLY_TEXT : SCALE_TEXT[(layout && layout.scaleBasis) || 'schematic'] || SCALE_TEXT.schematic);

  // 飾りの IO ダイ(design.decorDies。dies には入れない=評価に影響しない)。IOD のデータが無い Zen 3 の CCD 単独のプリセット(5600X・5950X)に、
  // パッケージ写真(5950x.jpg)に倣って CCD の下側中央に表示する。大きさは AMD 公表の Zen 3 cIOD 125 mm²(GF 12nm。AMD の Zen 3 発表資料 = block-areas.md の AMD-Z3)、縦横比は写真の目測。
  const DECOR_IOD = { areaMm2: 125, aspect: 1.4, label: 'IOD(飾り・面積は参考)', sizeBasis: { s: 'pub', source: 'AMD Zen 3 発表資料の cIOD(GF 12nm)125 mm²(docs/research/block-areas.md の AMD-Z3)', note: '縦横比 1.4 は 5950x.jpg(パッケージ写真)の IOD の外形を画像から読んだ目測。評価には含まない' } };
  // Compute タイルの写真の枠に、全体図の相対位置の飾りのタイル(GPU・Platform)がある場合の飾りのダイ(座標は Compute のダイを基準。寸法は二次資料の mm 値、なければ Compute の面積に全体図の px 比を当てた[推定]。評価には含まない)
  function tileDecor(layout, die, presetId) {
    const TF = layout && layout.template === 'x86-tile' ? TILE_FRAMES[layout.frame] : null;
    if (!TF || !TF.tiles.length || !die || !(die.areaMm2 > 0)) return null;
    const s = die.widthMm / (TF.box[2] - TF.box[0]);
    const skip = (TILE_MAP[presetId] && TILE_MAP[presetId].skip) || [];
    return TF.tiles.filter((t) => skip.indexOf(t[0]) < 0).map((t) => { // skip はタイルの id(例: 'decor0')で指定
      const w = t[7] || (t[5] - t[3]) * s; const h = t[8] || (t[6] - t[4]) * s;
      const own = t[9]; // 10 番目: 独自の根拠 { s, source }(Kurnal の二次値でない寸法。例: 4Xe の GPU タイル)
      return { id: t[0], kind: t[1], label: t[2], x: r4(die.x + (t[3] - TF.box[0]) * s), y: r4(die.y + (t[4] - TF.box[1]) * s), widthMm: r4(w), heightMm: r4(h), areaMm2: r4(w * h),
        sizeBasis: own ? { s: own.s, source: own.source, note: '評価・面積合計には含まない。実測面積ではない' } : { s: t[7] ? 'sec' : 'est', source: t[7] ? `Kurnal の寸法 ${t[7]}×${t[8]} mm〔幅×高さ。向きは全体図に合わせた〕(Tom's Hardware 2026-03 の引用経由。[二次])。位置は Kurnal 全体図(dh0gWbF8gG9AXfQw.jpg。出典は推定)の目測[推定]` : 'Kurnal 全体図の相対比を Compute タイルの面積に当てはめた[推定]', note: '評価・面積合計には含まない。実測面積ではない' } };
    });
  }
  const MAX_DECOR = 4; const MAX_DECOR_TEXT = 300;
  // 画面の注記。「AMD 公表値」は sizeBasis.s が pub のときだけ。面積が無くても「飾り・評価には含まない」は出す
  const decorNote = (decor) => {
    const d = decor && decor[0]; if (!d) return null;
    if (decor.some((x) => x.kind !== 'iod')) return '飾りのタイル(GPU・Platform)は見た目だけ。寸法は二次資料(Kurnal)、位置は全体図の目測の推定(参考。評価・面積合計には含まない)' + (decor.some((x) => x.id === 'decor2') ? '。4Xe の GPU タイルの寸法は Panther Lake_dies.jpg(出典未確認)の目測' : '');
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
      [['decor0', 'gpu-tile', 'GPU タイル(Xe3 12 コア。飾り・位置は推定)', 1343, 428, 1938, 1138, 6.78, 8.14],
        // 4Xe 版(386H)の GPU タイル: Panther Lake_dies.jpg(ユーザー提供。出典未確認)の同一画像内の相対寸法。12Xe 構成の GPU の高さ 93px に対し 4Xe 構成は 45px(比 0.49)、幅は同じ(111px)。12Xe の Kurnal 値に比を掛けた(3.29×8.14 mm)。位置の px は 12Xe と同じ起点
        ['decor2', 'gpu-tile', 'GPU タイル(Xe3 4 コア。飾り・位置と寸法は推定)', 1343, 428, 1630, 1138, 3.29, 8.14, { s: 'est', source: 'Panther Lake_dies.jpg(ユーザー提供。出典未確認)の目測[推定]: 同一画像で 12Xe 構成の GPU の高さ 93px に対し 4Xe 構成は 45px(比 0.49)、幅は同じ。12Xe の Kurnal 値 6.78×8.14 mm に比を掛けた' }], ['decor1', 'platform-tile', 'Platform タイル(飾り・位置は推定)', 250, 1135, 1340, 1480, 12.44, 4.0]]),
    // Panther Lake の 4P+4LPE の Compute タイル(E クラスタ無し。Core Ultra 5 325 が使う)。Panther Lake_dies.jpg(ユーザー提供。出典未確認)の左の構成の目測: 中の 4P+8E+4LPE の Compute(111×198px)に対し 112×162px = 長辺が 0.82 倍。
    // ptl-compute から E クラスタの帯(x 97〜322)を除き、box の左端を E 帯の右(313)まで切った(座標は ptl-compute と共通)。縦横比 1.446 は画像(縦長)の 162/112=1.45 と一致(Kurnal の向きに直した値)。ダイの面積は未取得。GPU・Platform の飾りのタイルは付けない
    'ptl-compute-4p4lpe': tf([313, 428, 1328, 1130], { p: 4, e: 0, lp: 4 },
      [[325, 497, 165, 203], [325, 848, 165, 205], [493, 497, 170, 203], [493, 848, 170, 205]],
      [], quad(727, 765, 225, 225), [325, 700, 340, 148], [
        ['phy', 'LPDDR5x / DDR5 PHY', 'u', 325, 432, 848, 45], ['mc', 'メモリコントローラ・メモリサイドキャッシュ', 'u', 665, 497, 240, 203], ['npu', 'NPU(5th。NCE ×3)', 'n', 915, 497, 345, 222],
        ['display', 'Display Engine?', 'u', 985, 760, 108, 360], ['media', 'Media Engine?', 'u', 1108, 760, 190, 360], ['soc-gpu', 'SoC to GPU', 'u', 1302, 432, 22, 320], ['soc-iod', 'SoC to IOD', 'u', 510, 1095, 470, 30]]),
    // Wildcat Lake(Core 5 320)の Compute タイル(Wildcat-lake-computex26-series3-die-annotated.jpg 1182×1427 の表示ピクセルで目測。compute die 単体の写真。ダイの外形 [10,14,1178,1420])。
    // Cougar Cove ×2(下の左右)、Darkmont ×4(1 クラスタ。2×2 で中央に L2$)、L3(下の中央)、Memory Side Cache・NPU・iGPU(Xe Core ×2)・Media・Display・DDR Controller・Interconnect は注釈どおり。容量の数値の注記はない。NPU の右上の張り出し(約 65×75px)は省いた。Cougar Cove 内の L2$ は P コアに含める
    'wcl-compute': tf([10, 14, 1178, 1420], { p: 2, e: 0, lp: 4 },
      [[142, 1130, 331, 268], [725, 1128, 335, 270]],
      [], [[222, 642, 146, 157], [448, 642, 148, 157], [222, 857, 143, 145], [450, 857, 147, 145]], [487, 1133, 225, 262], [
        ['media', 'Media Engines', 'u', 35, 25, 520, 310], ['display', 'Display Engine', 'u', 118, 348, 438, 268], ['gpu', 'iGPU(Xe3 2 コア)', 'g', 637, 55, 527, 490],
        ['npu', 'NPU', 'n', 672, 562, 383, 280], ['msc', 'Memory Side Cache', 'u', 690, 858, 368, 258], ['ddr', 'DDR Controller', 'u', 1067, 640, 102, 758],
        ['icn-v', 'Interconnect', 'u', 568, 55, 58, 560], ['icn-h', 'Interconnect', 'u', 27, 1008, 650, 115],
        ['l2-v', 'Darkmont L2$', 'u', 380, 642, 58, 358], ['l2-hl', 'Darkmont L2$', 'u', 226, 810, 150, 36], ['l2-hr', 'Darkmont L2$', 'u', 442, 810, 150, 36]]),
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
  // ---- Qualcomm Snapdragon(Kurnal 等の注釈つきダイ写真。2026-11-03 追加)。template は arm-soc。TILE_FRAMES と同じ形(写真の表示ピクセル座標。box がダイの外形)----
  // big = プライム → 中間コアの順(cfg の P → M → M2 の順に埋める)、small = 小コア(cfg の E)。cfg に L3 が無い(l3MB なし)ので frame の l3 は null で、写真の L3 は飾り(deco)で置く。座標は表示ピクセルからの目測(±5〜10%)。
  const qf = (box, big, small, deco) => tf(box, { p: big.length, e: small.length, lp: 0 }, big, small, [], null, deco);
  const QC_FRAMES = {
    // 855(855 sm8150.jpg 5670×5925 の表示 1531×1600)。Kryo 485: A76 2.84GHz ×1(右端)+ 2.42GHz ×3、A55 ×4、L3 2+1+1MiB、SLC 3MiB
    'sd-855': qf([0, 0, 1531, 1600], [[637, 132, 198, 255], [88, 132, 178, 230], [270, 132, 178, 230], [452, 132, 180, 230]], [[222, 515, 98, 110], [322, 515, 96, 110], [420, 530, 98, 110], [545, 528, 98, 112]], [
      ['l3', 'L3 キャッシュ 4MiB(1+2+1。cfg に L3 なし)', 'u', 222, 390, 445, 118], ['slc', 'System Level Cache 3MiB', 'u', 442, 707, 392, 360], ['modem', 'Baseband X24(PCIe 経由の 5G)', 'u', 962, 125, 470, 520],
      ['hex-l', 'Hexagon 690?', 'n', 92, 740, 325, 280], ['hex-r', 'Hexagon 690?', 'n', 925, 682, 560, 165], ['gpu', 'GPU(Adreno 640 768 ALU)', 'g', 905, 858, 530, 692], ['isp', 'Spectra 380 ISP', 'u', 88, 1100, 770, 350],
      ['phy-lt', 'LPDDR4X PHY', 'u', 8, 75, 72, 365], ['phy-rt', 'LPDDR4X PHY', 'u', 1443, 75, 72, 365], ['phy-lb', 'LPDDR4X PHY', 'u', 8, 1190, 72, 350], ['phy-rb', 'LPDDR4X PHY', 'u', 1443, 1200, 72, 350], ['csi', 'CSI', 'u', 95, 1495, 310, 58]]),
    // 865(865 sm8250.jpg 5674×6695 の表示 1356×1600)。Kryo 585: A77 2.84GHz ×1(HP)+ 2.42GHz ×3、A55 ×4、L3 4MiB、SLC 3MiB
    'sd-865': qf([0, 0, 1356, 1600], [[288, 490, 210, 262], [112, 112, 175, 230], [288, 112, 175, 230], [112, 465, 175, 240]], [[465, 112, 92, 100], [472, 218, 92, 100], [566, 232, 90, 90], [660, 244, 90, 78]], [
      ['l3a', 'L3 キャッシュ 2MiB(合計 4MiB。cfg に L3 なし)', 'u', 112, 365, 195, 95], ['l3b', 'L3 キャッシュ 2MiB', 'u', 555, 350, 195, 95], ['slc', 'System Level Cache 3MiB', 'u', 505, 580, 410, 150], ['slc2', 'SLC(768KiB ほか)', 'u', 370, 765, 315, 185],
      ['hex', 'Hexagon DSP + VPU 665', 'n', 820, 50, 430, 390], ['gpu', 'GPU(Adreno 650 768 ALU?)', 'g', 700, 905, 545, 640], ['dpu', 'DPU 995', 'u', 8, 712, 275, 215], ['isp', 'Spectra 480 ISP', 'u', 108, 955, 590, 575],
      ['phy-lt', 'LPDDR5 / 4X PHY', 'u', 20, 155, 70, 285], ['phy-rt', 'LPDDR5 / 4X PHY', 'u', 1262, 205, 65, 285], ['phy-lb', 'LPDDR5 / 4X PHY', 'u', 8, 1235, 75, 280], ['phy-rb', 'LPDDR5 / 4X PHY', 'u', 1245, 1262, 85, 300],
      ['dsi', 'DSI', 'u', 8, 445, 85, 205], ['csi-l', 'CSI', 'u', 8, 985, 65, 210], ['csi-b', 'CSI', 'u', 105, 1535, 200, 55]]),
    // 888(SM8350.jpg 6760×6998 の表示 1546×1600)。X1 2.84GHz ×1、A78 2.4GHz ×3、A55 ×4、L3 4MiB、SLC 3MiB
    'sd-888': qf([0, 0, 1546, 1600], [[243, 845, 228, 300], [85, 962, 155, 175], [115, 1255, 155, 175], [272, 1265, 155, 170]], [[448, 1272, 72, 82], [522, 1260, 74, 82], [598, 1250, 74, 84], [438, 1362, 72, 72]], [
      ['l3', 'L3 キャッシュ 4MiB(2+?+2。cfg に L3 なし)', 'u', 115, 1152, 590, 95], ['slc', 'System Level Cache 3MiB', 'u', 478, 780, 425, 360], ['gpu', 'GPU(Adreno 660 768 ALU)', 'g', 108, 148, 480, 620], ['modem', 'Snapdragon X60 5G', 'u', 685, 100, 755, 475],
      ['pcie', 'PCIe x8', 'u', 903, 48, 435, 45], ['hex', 'Hexagon 780(26 TOPS)', 'n', 1010, 590, 490, 395], ['vpu', 'VPU 665', 'u', 985, 1017, 450, 210], ['isp', 'Spectra 580 ISP', 'u', 945, 1232, 500, 250], ['dpu', 'DPU', 'u', 700, 1385, 240, 150],
      ['csi', 'CSI', 'u', 950, 1485, 540, 60], ['phy-lt', 'LPDDR5 PHY', 'u', 15, 115, 80, 260], ['phy-rt', 'LPDDR5 PHY', 'u', 1445, 205, 78, 265], ['phy-lb', 'LPDDR5 PHY', 'u', 20, 1185, 78, 262], ['phy-rb', 'LPDDR5 PHY', 'u', 1448, 1130, 78, 270]]),
    // 8 Gen 1(Snapdragon 8 Gen1… v2-…_1440w.jpg の左半分。TechInsights の写真 + xian333c の Floor Plan。表示 1440×778 の x 8〜692)。X2 ×1、A710 ×3、A510(写真の「Dual A510 cluster」を 2 つ + 単独の 2 つ = 2+2)×4
    'sd-8gen1': qf([8, 8, 692, 750], [[225, 122, 132, 112], [60, 55, 88, 63], [52, 122, 88, 68], [260, 50, 85, 72]], [[82, 195, 56, 32], [82, 227, 56, 32], [92, 265, 56, 32], [92, 297, 56, 32]], [
      ['l3', 'L3 キャッシュ 4×1.5MiB(cfg に L3 なし)', 'u', 148, 55, 72, 230], ['slc', 'SLC 4×1MiB', 'u', 205, 295, 155, 135], ['gmem', 'GMEM', 'u', 392, 55, 58, 95], ['gpu', 'GPU(Adreno 730)', 'g', 452, 55, 235, 335],
      ['dsp', 'DSP?', 'n', 288, 435, 170, 295], ['modem', 'Modem?', 'u', 468, 398, 215, 310], ['isp', 'ISP', 'u', 50, 520, 210, 190], ['csi', 'CSI', 'u', 18, 520, 28, 175],
      ['phy-tl', '16bit DDR チャネル', 'u', 105, 18, 118, 32], ['phy-tr', '16bit DDR チャネル', 'u', 548, 18, 122, 32], ['phy-bl', '16bit DDR チャネル', 'u', 105, 716, 122, 28], ['phy-br', '16bit DDR チャネル', 'u', 468, 712, 120, 30]]),
    // 8 Gen 2(sm8550Dieshot.jpg 7631×7222 の表示 1600×1514)。X3 ×1、A715 / A710 の中間コア ×4(写真の注釈の枠。cfg では同じ M 種別なので A715 と A710 の割当は区別しない)、A510 ×3(写真の注釈「A510 2core cluster」〔左上の帯〕を 2 等分した 2 枠 + 「A510 1core」〔その右の枠〕の 1 枠)
    'sd-8gen2': qf([0, 0, 1600, 1514], [[1025, 445, 243, 282], [1060, 88, 150, 188], [1215, 88, 140, 188], [1358, 90, 142, 185], [1262, 445, 120, 185]], [[828, 170, 69, 105], [897, 170, 69, 105], [970, 100, 88, 175]], [
      ['l3a', 'L3 キャッシュ 2MiB(合計 8MiB。cfg に L3 なし)', 'u', 828, 290, 155, 135], ['l3b', 'L3 キャッシュ 2MiB', 'u', 1010, 290, 155, 135], ['l3c', 'L3 キャッシュ 2MiB', 'u', 1188, 290, 150, 135], ['l3d', 'L3 キャッシュ 2MiB', 'u', 1360, 290, 140, 135],
      ['slc', 'System Level Cache 6MiB', 'u', 610, 440, 280, 330], ['gpu', 'GPU(Adreno 740 1536 ALU)', 'g', 715, 830, 805, 600], ['hex', 'Hexagon DSP', 'n', 20, 610, 385, 185], ['isp', 'ISP', 'u', 85, 95, 480, 330], ['dpu', 'DPU', 'u', 85, 430, 340, 170],
      ['vpu', 'Adreno VPU', 'u', 570, 60, 255, 370], ['modem', 'Snapdragon X70 5G', 'u', 90, 1055, 625, 360], ['csi', 'CSI', 'u', 75, 15, 500, 60], ['phy-lt', 'LPDDR5X PHY', 'u', 8, 235, 70, 215], ['phy-lb', 'LPDDR5X PHY', 'u', 8, 1050, 70, 235], ['phy-rt', 'LPDDR5X PHY', 'u', 1525, 190, 60, 245], ['phy-rb', 'LPDDR5X PHY', 'u', 1525, 1050, 62, 235]]),
    // 8 Gen 3(SM8650.jpg 7575×6335 の表示 1600×1338)。X4 ×1、A720 Gold 3.15GHz ×3 + 2.96GHz ×2、A520 Silver ×2(2.27GHz)。L3 12MiB(3MiB ×4)
    'sd-8gen3': qf([0, 0, 1600, 1338], [[975, 405, 225, 265], [912, 75, 145, 170], [1058, 75, 142, 170], [1200, 75, 142, 170], [1212, 395, 153, 155], [1372, 395, 122, 150]], [[1345, 118, 72, 115], [1418, 140, 70, 100]], [
      ['l3a', 'L3 キャッシュ 3MiB(合計 12MiB。cfg に L3 なし)', 'u', 790, 248, 160, 130], ['l3b', 'L3 キャッシュ 3MiB', 'u', 978, 248, 167, 130], ['l3c', 'L3 キャッシュ 3MiB', 'u', 1163, 248, 172, 130], ['l3d', 'L3 キャッシュ 3MiB', 'u', 1348, 255, 170, 130],
      ['slc', 'System Level Cache 6MiB', 'u', 540, 395, 290, 340], ['dpu', 'Adreno DPU', 'u', 1212, 560, 370, 170], ['gpu', 'GPU(Adreno 750 1536 ALU)', 'g', 635, 740, 880, 570], ['isp', 'Spectra ISP', 'u', 75, 65, 450, 485], ['csi', 'CSI', 'u', 70, 15, 340, 50], ['vpu', 'Adreno VPU 8650', 'u', 535, 45, 370, 200],
      ['ai', 'Hexagon V73M DSP・Low power AI', 'n', 8, 562, 530, 385], ['modem', 'Snapdragon X75 5G', 'u', 75, 1045, 490, 285], ['dsi', 'DSI', 'u', 8, 415, 60, 150], ['phy-lt', 'LPDDR5X PHY', 'u', 8, 210, 62, 195], ['phy-lb', 'LPDDR5X PHY', 'u', 8, 950, 62, 235], ['phy-rt', 'LPDDR5X PHY', 'u', 1528, 175, 60, 225], ['phy-rb', 'LPDDR5X PHY', 'u', 1518, 925, 70, 205]]),
    // 8 Elite(SM8750shuiying.jpg 7961×7039 の表示 1600×1415)。Phoenix L ×2(4.32GHz。写真の 1 つの大きい帯を左右に 2 等分した推定)、Phoenix M ×6(3.53GHz。上 3 + 下 3)。L2 は L クラスタ 12MB・M クラスタ 12MB
    'sd-8elite': qf([0, 0, 1600, 1415], [[745, 152, 185, 208], [930, 152, 182, 208]], [[1215, 20, 125, 155], [1340, 20, 122, 155], [1462, 20, 125, 155], [1200, 450, 125, 125], [1330, 450, 125, 125], [1458, 450, 125, 125]], [
      ['l2l', 'L クラスタ L2 12MB', 'u', 735, 365, 380, 275], ['l2m', 'M クラスタ L2 12MB', 'u', 1125, 178, 395, 262], ['slc1', 'SLC#1(2MB)', 'u', 715, 640, 230, 85], ['slc2', 'SLC#2(2MB)', 'u', 695, 728, 245, 115], ['slc', 'System Level Cache 8MB', 'u', 945, 640, 395, 125], ['slc34', 'SLC#3・#4(各 2MB)', 'u', 1345, 585, 230, 175],
      ['gpu', 'GPU(Adreno 830 1536 ALU)', 'g', 705, 845, 815, 540], ['isp', 'Spectra ISP', 'u', 90, 75, 410, 395], ['csi', 'CSI', 'u', 75, 20, 365, 50], ['vpu', 'Adreno 8 VPU', 'u', 505, 150, 225, 325], ['dpu', 'Adreno 8 DPU', 'u', 30, 485, 500, 90], ['dsi', 'DSI', 'u', 8, 585, 65, 70],
      ['npu', 'Hexagon V79(Dual NPU)', 'n', 80, 660, 420, 135], ['lpi', 'Low-power AI System', 'n', 8, 800, 340, 225], ['modem', 'Snapdragon X80 5G', 'u', 85, 1045, 480, 245], ['phy-lt', 'LPDDR5X PHY', 'u', 8, 175, 70, 230], ['phy-lb', 'LPDDR5X PHY', 'u', 8, 1030, 70, 250], ['phy-rt', 'LPDDR5X PHY', 'u', 1525, 195, 62, 215], ['phy-rb', 'LPDDR5X PHY', 'u', 1525, 1085, 62, 205]]),
    // 8 Elite Gen 5(8EliteG5 Dieshot.jpg 6309×5588 の表示 1600×1417。SM8850)。Oryon 3rd L ×2(4.61GHz。上に 1 つ、L2 の下に 1 つ)、M ×6(3.63GHz。M クラスタ L2 12MiB の左右に 3 つずつ)
    'sd-8elite-gen5': qf([0, 0, 1600, 1417], [[818, 50, 178, 215], [582, 510, 180, 210]], [[1002, 50, 120, 138], [1002, 190, 120, 135], [1002, 330, 120, 138], [1395, 50, 125, 130], [1395, 185, 125, 140], [1395, 325, 125, 140]], [
      ['l2l', 'L クラスタ L2 12MiB', 'u', 607, 275, 390, 225], ['l2m', 'M クラスタ L2 12MiB', 'u', 1125, 50, 262, 380], ['slc1', 'SLC#1(2MiB)', 'u', 768, 632, 190, 100], ['slc2', 'SLC#2(2MiB)', 'u', 720, 745, 240, 90], ['slc', 'SLC 8MiB', 'u', 965, 615, 120, 130], ['slc34', 'SLC#3・#4(各 2MiB)', 'u', 1095, 570, 235, 175],
      ['gpu', 'GPU(Adreno 840)', 'g', 712, 840, 805, 480], ['isp', 'Spectra ISP', 'u', 80, 75, 455, 335], ['csi', 'CSI', 'u', 75, 25, 350, 50], ['vpu', 'Adreno 8 VPU', 'u', 560, 90, 250, 180], ['dpu', 'Adreno 8 DPU', 'u', 25, 445, 300, 140],
      ['npu', 'Hexagon DSP', 'n', 12, 615, 560, 330], ['modem', 'Snapdragon X85 5G', 'u', 85, 1040, 520, 250], ['usb', 'USB / UFS', 'u', 840, 1345, 270, 60], ['phy-lt', 'LPDDR5X PHY', 'u', 8, 175, 65, 235], ['phy-lb', 'LPDDR5X PHY', 'u', 8, 1030, 65, 260], ['phy-rt', 'LPDDR5X PHY', 'u', 1525, 95, 65, 205], ['phy-rb', 'LPDDR5X PHY', 'u', 1525, 1100, 65, 205]]),
    // 7+ Gen 3 / 8s Gen 3(7gen3+&8Sgen3.jpg 5307×6764 の表示 1255×1600。7+ Gen 3 / 8s Gen 3 共通のダイ=画像内の両チップ併記・ファイル名・URL の綴りから)。X4 ×1、A720 ×4、A520 ×3(2 コア + 1 コア)、L3 4MiB(2MiB ×2)
    'sd-7p3-8s3': qf([0, 0, 1255, 1600], [[990, 470, 165, 180], [775, 40, 150, 170], [930, 40, 155, 170], [1090, 40, 150, 160], [1090, 222, 145, 148]], [[650, 225, 80, 125], [730, 225, 80, 125], [812, 230, 70, 120]], [
      ['l3a', 'L3 キャッシュ 2MiB(合計 4MiB。cfg に L3 なし)', 'u', 915, 228, 115, 145], ['l3b', 'L3 キャッシュ 2MiB', 'u', 752, 362, 150, 150], ['x4-l2', 'X4 の L2 256KiB', 'u', 985, 405, 100, 62], ['slc1', 'SLC(896KiB ×2)', 'u', 415, 615, 250, 105], ['slc2', 'System Level Cache 3584KiB', 'u', 470, 727, 230, 130],
      ['isp', 'Spectra ISP', 'u', 95, 90, 300, 450], ['vpu', 'VPU?', 'u', 405, 150, 220, 330], ['csi', 'CSI', 'u', 200, 20, 345, 60], ['dsi', 'DSI', 'u', 20, 590, 65, 95], ['ai', 'Hexagon DSP・Low Power AI', 'n', 40, 770, 380, 320], ['modem', 'Snapdragon X70 / X62 5G', 'u', 90, 1100, 630, 420],
      ['gpu', 'GPU(Adreno 735 / 732 768 ALU)', 'g', 715, 950, 440, 590], ['pcie', 'PCIe', 'u', 360, 1525, 330, 70], ['wifi', 'WiFi + BT', 'u', 118, 1530, 230, 65], ['phy-lt', 'LPDDR5X PHY', 'u', 10, 265, 75, 245], ['phy-lb', 'LPDDR5X PHY', 'u', 10, 1095, 75, 245], ['phy-rt', 'LPDDR5X PHY', 'u', 1160, 380, 95, 270], ['phy-rb', 'LPDDR5X PHY', 'u', 1160, 965, 95, 245]]),
    // 8s Gen 4(8sGen4.jpg 7451×4711 の表示 1600×1012。SM8735)。X4 3.21GHz ×1、A720 3.01GHz ×3 + 2.8GHz ×2、A720 2.02GHz ×2(小コア)。L3 8MiB(2MiB ×4)
    'sd-8s-gen4': qf([0, 0, 1600, 1012], [[402, 222, 205, 245], [28, 165, 122, 135], [28, 305, 122, 120], [100, 455, 120, 115], [275, 15, 110, 125], [482, 88, 118, 130]], [[28, 28, 120, 110], [150, 28, 122, 110]], [
      ['l3a', 'L3 キャッシュ #1(2MiB。合計 8MiB。cfg に L3 なし)', 'u', 155, 185, 120, 95], ['l3b', 'L3 キャッシュ #2(2MiB)', 'u', 305, 145, 160, 80], ['l3c', 'L3 キャッシュ #3(2MiB)', 'u', 165, 315, 110, 110], ['l3d', 'L3 キャッシュ #4(2MiB)', 'u', 290, 285, 110, 140],
      ['slc', 'SLC 6MiB', 'u', 375, 472, 235, 80], ['slca', 'SLC #1(1.5MiB)', 'u', 655, 215, 115, 110], ['slcb', 'SLC #2(1.5MiB)', 'u', 660, 330, 130, 105], ['slcc', 'SLC #3(1.5MiB)', 'u', 580, 555, 140, 105], ['slcd', 'SLC #4(1.5MiB)', 'u', 405, 615, 140, 115],
      ['npu', 'Hexagon NPU', 'n', 790, 75, 315, 125], ['npu2', 'Scalar + L2 / HMX', 'n', 790, 205, 310, 130], ['modem', 'Snapdragon X75 5G', 'u', 1112, 70, 478, 320], ['ufs', 'UFS コントローラ', 'u', 628, 75, 95, 140], ['gpu', 'GPU(Adreno 825)', 'g', 725, 620, 860, 320],
      ['isp', 'Spectra ISP', 'u', 75, 580, 325, 360], ['csi', 'CSI', 'u', 8, 675, 60, 235], ['dpu', 'Adreno DPU', 'u', 540, 745, 175, 255], ['phy-t', 'LPDDR5X PHY', 'u', 415, 25, 190, 40], ['phy-t2', 'LPDDR5X PHY', 'u', 1095, 25, 195, 40], ['phy-b', 'LPDDR5X PHY', 'u', 240, 945, 215, 60], ['phy-b2', 'LPDDR5X PHY', 'u', 920, 945, 230, 55]]),
    // 8 Elite Extreme Gen 6(SM8975.jpg 8531×7396 の表示 1600×1387)。Oryon-L ×2(5.01GHz。上と、L2 の右下)、Oryon-M ×6(4.03GHz 上 3 + 3.74GHz 下 3)。L2 は M クラスタ 16MiB
    'sd-8elite-x-gen6': qf([0, 0, 1600, 1387], [[898, 50, 170, 195], [1070, 415, 168, 150]], [[1070, 50, 135, 120], [1205, 50, 130, 120], [1335, 50, 130, 120], [1240, 420, 105, 145], [1348, 420, 100, 145], [1455, 420, 110, 145]], [
      ['l2m', 'L2 キャッシュ 16MiB', 'u', 1070, 175, 450, 235], ['lpi', 'LPI?', 'n', 1125, 575, 395, 165], ['slct', 'SLC(2MiB ×2。SLC 8MiB の一部)', 'u', 612, 355, 255, 245], ['slcb', 'SLC(2MiB ×2。SLC 8MiB の一部)', 'u', 695, 757, 260, 245],
      ['gpu', 'GPU(Adreno 850)', 'g', 958, 762, 562, 590], ['gpu-s3', 'GPU(Slice #3。GMEM 6MiB を含む)', 'g', 620, 1005, 338, 295], ['isp', 'Spectra ISP', 'u', 78, 75, 500, 320], ['csi', 'CSI', 'u', 105, 28, 340, 45], ['vpu', 'Adreno VPU', 'u', 685, 90, 210, 175], ['dpu', 'Adreno 8 DPU', 'u', 10, 400, 375, 115], ['dsi', 'DSI', 'u', 8, 520, 60, 130],
      ['hmx', 'HMX', 'n', 72, 525, 285, 125], ['npu', 'Hexagon NPU(V83 ×2)', 'n', 12, 680, 480, 270], ['modem', 'Snapdragon X105 5G', 'u', 85, 1015, 480, 310], ['usb', 'USB / UFS', 'u', 795, 1320, 160, 60],
      ['phy-lt', 'LPDDR5x&6 PHY', 'u', 8, 125, 62, 230], ['phy-rt', 'LPDDR5x&6 PHY', 'u', 1525, 150, 62, 215], ['phy-lb', 'LPDDR5x&6 PHY', 'u', 8, 1010, 65, 260], ['phy-rb', 'LPDDR5x&6 PHY', 'u', 1525, 1065, 62, 215]]),
    // 7 Gen 1(sn7450Kurnal.jpg 7472×6535 の表示 1600×1399。SM7450)。A710 HP 2.5GHz ×1、A710 HD 2.36GHz ×3、A510 2 コア ×2(2 つずつに区切った)。L3 2MiB
    'sd-7gen1': qf([0, 0, 1600, 1399], [[985, 378, 235, 200], [995, 22, 215, 190], [1215, 8, 215, 170], [995, 220, 215, 150]], [[1432, 35, 72, 135], [1504, 35, 72, 135], [1352, 345, 75, 130], [1427, 345, 75, 130]], [
      ['l3a', 'L3 キャッシュ(1MiB。合計 2MiB。cfg に L3 なし)', 'u', 1235, 195, 170, 120], ['l3b', 'L3 キャッシュ(1MiB)', 'u', 1435, 180, 140, 130], ['slc', 'System Level Cache 2MiB', 'u', 1225, 500, 270, 250], ['gpu', 'GPU(Adreno 644 768 ALU)', 'g', 990, 752, 505, 640],
      ['dsp', 'Low Power AI Subsystem DSP', 'n', 550, 85, 270, 395], ['dpu', 'DPU', 'u', 830, 100, 150, 395], ['modem', 'Snapdragon X62 5G', 'u', 90, 520, 430, 390], ['isp', 'Spectra ISP', 'u', 105, 945, 770, 355], ['csi', 'CSI', 'u', 370, 1305, 330, 90],
      ['phy-rt', 'LPDDR4x/5 PHY', 'u', 1500, 315, 75, 275], ['phy-rb', 'LPDDR4x/5 PHY', 'u', 1500, 785, 75, 265]]),
    // 8cx Gen 3(8CXG3.jpg 7094×7832 の表示 1449×1600。SC8280XP)。X1 ×4(3.0GHz)、A78 ×4(2.42GHz。注釈の A78 は 3 つ。4 つ目〔左上〕の枠は注釈が「System Level Cache 512KiByte」だが、構造が A78 と似ているため 4 つ目の A78 と推定した=注釈と食い違う)。L3 8MiB
    'sd-8cx-gen3': qf([0, 0, 1449, 1600], [[638, 85, 180, 225], [820, 35, 180, 270], [1002, 35, 180, 270], [1185, 85, 172, 225], [1233, 315, 128, 150], [762, 447, 125, 118], [888, 447, 125, 118], [605, 315, 120, 150]], [], [
      ['l3a', 'L3 キャッシュ 3MiB(合計 8MiB。cfg に L3 なし)', 'u', 728, 330, 145, 112], ['l3t', 'L3 タグ', 'u', 875, 330, 210, 112], ['l3b', 'L3 キャッシュ 3MiB', 'u', 1088, 330, 140, 112], ['slc', 'System Level Cache 6MiB', 'u', 1020, 540, 320, 260],
      ['gpu-f', 'GPU(Rops ほか)', 'g', 640, 685, 335, 340], ['gpu-m', 'GPU(Adreno 690 Cluster 3・4)', 'g', 635, 1035, 360, 490], ['gpu-c', 'GPU(Adreno 690 Cluster 1・2)', 'g', 1000, 850, 355, 680],
      ['npu', 'Hexagon V73 + Tensor(2 コア)', 'n', 70, 715, 500, 665], ['isp', 'Spectra ISP', 'u', 70, 92, 495, 615], ['pcie', 'PCIe x4', 'u', 378, 20, 215, 42], ['phy-t', 'LPDDR4X PHY', 'u', 1210, 15, 205, 70], ['phy-r', 'LPDDR4X PHY(右列 #3〜#8)', 'u', 1385, 90, 60, 1480], ['phy-b', 'LPDDR4X PHY', 'u', 1160, 1535, 225, 55], ['usb', 'USB バッファ(USB4?)', 'u', 200, 1440, 430, 150]]),
  };
  Object.assign(TILE_FRAMES, QC_FRAMES);
  // ---- MediaTek Dimensity(Kurnal の注釈つきダイ写真。2026-11-03 追加)と Switch 2 の T239(Kurnal の注釈つき)。template は arm-soc。Dimensity は cfg に L3 が無く(写真の L3 は飾り)、T239 は cfg の l3MB=4 があるので frame の l3 を持つ ----
  // big = プライム → 中間コア、small = 小コア(cfg の E)。座標は表示ピクセルからの目測(±5〜10%)
  const MT_FRAMES = {
    // Dimensity 9000(D9000-mt6983.jpg 6787×7296 の表示 1488×1600)。X2 ×1、A710 ×3(左下の枠は A710 の表記なしで、L2 256KiB の容量から推定)、A510 ×4(注釈の「Dual A510 Cluster」を左右 2 つに分け、さらに各 2 コアに分けた推定)。L3 4×2MiB、SLC 3+3MiB、Mali-G710 MP10、APU 590
    'mt-9000': qf([0, 0, 1488, 1600], [[382, 990, 208, 166], [847, 1067, 166, 133], [847, 1379, 166, 128], [382, 1347, 169, 146]], [[555, 1350, 145, 77], [555, 1428, 145, 77], [702, 1350, 140, 77], [702, 1428, 140, 77]], [
      ['l3a', 'L3 キャッシュ 2MiB(4 つで 8MiB。cfg に L3 なし)', 'u', 385, 1180, 130, 148], ['l3b', 'L3 キャッシュ 2MiB', 'u', 567, 1173, 120, 160], ['l3c', 'L3 キャッシュ 2MiB', 'u', 702, 1173, 131, 160], ['l3d', 'L3 キャッシュ 2MiB', 'u', 883, 1220, 130, 147],
      ['dsu', 'DSU-110', 'u', 597, 1007, 246, 150], ['slc', 'System Level Cache 3+3MiB', 'u', 493, 773, 370, 208],
      ['gpu-a', 'GPU(Mali-G710 MP10。#1〜#7)', 'g', 683, 110, 687, 340], ['gpu-t', 'GPU(#2 上段)', 'g', 860, 28, 165, 82], ['gpu-r', 'GPU(#8・#9)', 'g', 1115, 475, 325, 170], ['gpu-l2', 'GPU L2 3MiB?', 'g', 683, 450, 300, 135],
      ['apu-a', 'APU 590(Performance ×3・Flexible)', 'n', 883, 668, 557, 396], ['apu-b', 'APU 590(Performance #2・#3)', 'n', 1040, 1070, 305, 215],
      ['modem', 'Baseband M80 5G・LTE', 'u', 120, 75, 520, 440], ['axi', 'AXI 64/128bit Interconnect', 'u', 362, 520, 320, 250], ['disp', 'MiraVision 790 Disp', 'u', 72, 557, 275, 215], ['isp', 'Imagiq 790 ISP', 'u', 58, 780, 310, 260], ['media', 'Media Engine(Encode・VP-9・AV1)', 'u', 115, 1055, 245, 420],
      ['phy-lt', '16bit LPDDR5 メモリチャネル', 'u', 18, 85, 72, 375], ['phy-rt', '16bit LPDDR5 メモリチャネル', 'u', 1388, 85, 72, 370], ['phy-lb', '16bit LPDDR5 メモリチャネル', 'u', 18, 1068, 75, 380], ['phy-rb', '16bit LPDDR5 メモリチャネル', 'u', 1388, 1125, 75, 335],
      ['usb-b', 'USB Buffer・UFS', 'u', 1035, 1385, 310, 200], ['csi-b', 'CSI ×6', 'u', 165, 1545, 520, 48]]),
    // Dimensity 9200(D9200-mt6985.jpg 10199×9504 の表示 1600×1491)。X3 ×1(右上。表記なしで L2 1MiB・L1 64KiB の構造から推定)、A715 ×3(@2.85GHz。左下・右下・左上)、A510 ×4(@1.8GHz。注釈の「2Core Cluster」〔左〕と右の A510 を 2 コアずつに分けた推定)。L3 4×2MiB、SLC 3+3M、Mali G715 MC11、APU 690
    'mt-9200': qf([0, 0, 1600, 1491], [[1013, 933, 180, 194], [603, 1280, 144, 153], [1047, 1280, 153, 157], [590, 980, 153, 160]], [[599, 1140, 70, 135], [669, 1140, 71, 135], [1053, 1140, 72, 135], [1125, 1140, 72, 135]], [
      ['l3a', 'L3 2MiB(4 つで 8MiB。cfg に L3 なし)', 'u', 753, 1137, 137, 136], ['l3b', 'L3 2MiB', 'u', 905, 1137, 135, 136], ['l3c', 'L3 2MiB', 'u', 757, 1290, 133, 140], ['l3d', 'L3 2MiB', 'u', 905, 1290, 135, 140],
      ['dsu', 'DSU・リング(注釈なし)', 'u', 747, 977, 258, 120], ['slc', 'System Level Cache 3M + 3M', 'u', 585, 820, 415, 150],
      ['gpu-a', 'GPU(Mali G715 #1〜#4・#7)', 'g', 565, 55, 560, 350], ['gpu-b', 'GPU(Mali G715 #8〜#11)', 'g', 1125, 155, 355, 340], ['gpu-c', 'GPU(ALU・TMU・ROP・#6)', 'g', 600, 405, 375, 160], ['gpu-cache', 'GPU Cache', 'g', 598, 568, 375, 235],
      ['apu', 'APU 690(4+2 コア)', 'n', 100, 160, 425, 600], ['apu4', 'APU Core Performance #4', 'n', 60, 68, 145, 92],
      ['modem', 'M80 Baseband(5G R16 Modem)', 'u', 15, 785, 510, 420], ['modem2', '4G Modem・BT・WiFi', 'u', 40, 1205, 520, 135], ['ufs', 'UFS 4.0 PHY', 'u', 10, 245, 88, 140],
      ['mv', 'MiraVision 890', 'u', 975, 500, 580, 300], ['imagiq', 'Imagiq 890 ISP', 'u', 1235, 805, 315, 230], ['dsp', 'DSP?', 'u', 1235, 1045, 310, 300], ['csi', 'CSI ×6', 'u', 1555, 880, 38, 470], ['pcie', 'PCIe PHY・USB PHY', 'u', 1500, 80, 92, 305],
      ['phy-t1', '16bit LPDDR5X 4266MHz', 'u', 210, 25, 250, 125], ['phy-t2', '16bit LPDDR5X 4266MHz', 'u', 1155, 25, 250, 125], ['phy-b1', '16bit LPDDR5X 4266MHz', 'u', 105, 1348, 250, 115], ['phy-b2', '16bit LPDDR5X 4266MHz', 'u', 1205, 1345, 390, 120]]),
    // Dimensity 9300(D9300-mt6989.jpg 6414×7602 の表示 1350×1600)。注釈どおり: X4 @3.25GHz ×1(中央左)、X4 @2.85GHz ×3(左上・右上・右中)、A720 @2.0GHz ×4(上段 2 + その下 2)。L3 8MiB、SLC 10MiB、Mali-G720 MC12、APU 790
    'mt-9300': qf([0, 0, 1350, 1600], [[445, 422, 175, 168], [440, 45, 165, 160], [840, 65, 165, 150], [840, 455, 165, 155]], [[605, 60, 115, 145], [722, 65, 115, 145], [590, 212, 115, 145], [732, 215, 118, 145]], [
      ['l3a', 'L3 キャッシュ(左。8MiB の一部。cfg に L3 なし)', 'u', 442, 210, 147, 205], ['l3b', 'L3 キャッシュ(右。8MiB の一部)', 'u', 870, 238, 135, 205], ['dvfs', 'DVFS・リング(注釈なし)', 'u', 625, 415, 215, 140], ['slc', 'System Level Cache 10MiB(5MiB ×2)', 'u', 440, 595, 395, 205],
      ['apu', 'APU 790(Flexible ×2・Performance ×4・cube)', 'n', 100, 165, 318, 755], ['usb', 'USB PHY / USB Buffer', 'u', 65, 5, 355, 150],
      ['imagiq', 'MediaTek Imagiq 990', 'u', 1012, 60, 235, 395], ['mv', 'MediaTek MiraVision 990', 'u', 1030, 495, 285, 330], ['phy-r1', 'LPDDR5T 4800MHz', 'u', 1252, 268, 85, 222], ['phy-r2', 'LPDDR5T 4800MHz', 'u', 1262, 1305, 78, 245], ['phy-l1', 'LPDDR5T 4800MHz', 'u', 8, 165, 88, 225], ['phy-l2', 'LPDDR5T 4800MHz', 'u', 8, 1185, 88, 220],
      ['gpu-a', 'GPU(Mali-G720 #1〜#4)', 'g', 85, 950, 725, 195], ['gpu-b', 'GPU(Mali-G720 #5〜#8)', 'g', 130, 1148, 675, 215], ['gpu-c', 'GPU(Mali-G720 #9〜#12)', 'g', 205, 1363, 545, 200],
      ['modem', 'MediaTek M80? 5G Baseband', 'u', 815, 1110, 440, 350], ['ufs', 'UFS', 'u', 60, 1545, 125, 50], ['csi', 'CSI ×6', 'u', 832, 5, 480, 45]]),
    // Dimensity 9400(D9400-mt6991.jpg 8000×7419 の表示 1600×1484)。注釈どおり: X925 @3.62GHz ×1(右中央)、X4 @3.3GHz ×2(左上・左中)、A720 @2.4GHz ×3(中段の左 3 つ)。推定(注釈なし): X4 の 3 つ目(右上の L2 1MiB の枠)、A720 の 4 つ目(中段の右の L2 512KiB の枠)。L3 12MiB、SLC 10MiB、Mali-G925 MP12、APU 890
    'mt-9400': qf([0, 0, 1600, 1484], [[1030, 405, 255, 248], [470, 45, 185, 175], [470, 400, 180, 170], [935, 48, 190, 177]], [[470, 240, 125, 145], [615, 235, 135, 145], [750, 235, 140, 145], [910, 240, 135, 145]], [
      ['l3a', 'L3 キャッシュ 3MiB(12MiB の一部。cfg に L3 なし)', 'u', 655, 55, 140, 150], ['l3b', 'L3 キャッシュ 3MiB', 'u', 795, 55, 135, 150], ['l3c', 'L3 キャッシュ 3MiB', 'u', 655, 410, 140, 160], ['l3d', 'L3 キャッシュ 3MiB', 'u', 1055, 230, 140, 172],
      ['ctrl', 'L3 Controller・Cache', 'u', 795, 420, 230, 150], ['slc', 'System Level Cache 10MiB(5MiB ×2)', 'u', 535, 580, 490, 210],
      ['apu-a', 'APU 890(Cluster #1)', 'n', 105, 128, 335, 450], ['apu-b', 'APU 890(Cluster #2・NPU)', 'n', 40, 580, 300, 125], ['same-cache', 'D9300 と同じブロック(キャッシュ)', 'u', 345, 580, 185, 230], ['same-core', 'D9300 と同じブロック(用途は注釈のまま)', 'u', 55, 708, 290, 100],
      ['gpu-a', 'GPU(Mali-G925 #2・ALU・Rops)', 'g', 70, 865, 375, 165], ['gpu-c', 'GPU(Mali-G925 #7・#8)', 'g', 565, 945, 460, 130], ['gpu-b', 'GPU(Mali-G925 #3・#4)', 'g', 125, 1035, 360, 150], ['gpu-b2', 'GPU(Mali-G925 #5・#6)', 'g', 120, 1190, 365, 180], ['gpu-l2', 'GPU L2 2304KiB?', 'g', 490, 1085, 195, 170], ['gpu-d', 'GPU(Mali-G925 #9・#10)', 'g', 690, 1110, 340, 150], ['gpu-e', 'GPU(Mali-G925 #11・#12)', 'g', 490, 1260, 375, 125],
      ['imagiq', 'MediaTek imagiq 1090(上段)', 'u', 1130, 88, 360, 140], ['imagiq-b', 'MediaTek imagiq 1090(下段)', 'u', 1198, 230, 292, 170], ['mv', 'MediaTek Miravision 1090', 'u', 1295, 438, 290, 385], ['modem', 'MediaTek 5G Modem New Baseband', 'u', 1040, 1180, 445, 215],
      ['phy-l1', '16bit LPDDR5X 5334MHz', 'u', 8, 170, 92, 250], ['phy-l2', '16bit LPDDR5X 5334MHz', 'u', 8, 1062, 90, 370], ['phy-r1', '16bit LPDDR5X 5334MHz', 'u', 1495, 165, 92, 255], ['phy-r2', '16bit LPDDR5X 5334MHz', 'u', 1500, 1000, 90, 255],
      ['csi', 'CSI ×4', 'u', 1190, 48, 340, 45], ['usb', 'USB・UFS・PCIe / USB3 / Lan', 'u', 225, 45, 225, 85]]),
    // Dimensity 9500(D9500-mt6993.jpg 7531×6339 の表示 1600×1347)。注釈どおり: C1-Ultra @4.21GHz ×1(右中央)、C1-Premium @3.5GHz ×3(左上・右上・左中)、C1-Pro @2.7GHz ×4。L3 は 4MiB ×4 + 16MiB の注記、SLC 10MiB、Mali G1-Ultra MP12、NPU 990
    'mt-9500': qf([0, 0, 1600, 1347], [[1005, 425, 222, 225], [505, 40, 165, 165], [1090, 65, 170, 180], [505, 400, 165, 175]], [[955, 65, 130, 140], [810, 230, 130, 135], [940, 230, 120, 140], [880, 405, 125, 140]], [
      ['l3a', 'L3 キャッシュ 4MiB(cfg に L3 なし)', 'u', 672, 55, 128, 170], ['l3b', 'L3 キャッシュ 4MiB', 'u', 800, 55, 155, 170], ['l3c', 'L3 キャッシュ 4MiB', 'u', 505, 225, 165, 170], ['l3d', 'L3 キャッシュ 16MiB(注記)', 'u', 665, 228, 145, 170], ['l3e', 'L3 キャッシュ 4MiB', 'u', 1085, 248, 140, 170],
      ['dsu', 'DSU-120? Controller', 'u', 680, 400, 200, 145], ['sme', 'SME?(×4)', 'u', 672, 550, 333, 110], ['slc-a', 'SLC 10MiB(5MiB)', 'u', 375, 580, 240, 290], ['slc-b', 'SLC 10MiB(5MiB)', 'u', 615, 665, 330, 200],
      ['npu', 'NPU 990(MDLA #2〜#4・NPU Cache 4MiB)', 'n', 165, 115, 330, 440], ['npu-t', 'NPU(Scalar・Vector・Tensor)', 'n', 335, 30, 160, 82], ['mvpu', 'MediaTek MVPU #1・#2', 'n', 62, 392, 100, 175], ['cache', '4MiB Cache・Security Engine・1.5MiB Cache', 'u', 30, 570, 340, 300],
      ['gpu-a', 'GPU(Mali G1-Ultra #1・Alu・Rops)', 'g', 95, 875, 365, 140], ['gpu-core', 'GPU(Mali G1-Ultra MP12 中央)', 'g', 460, 900, 235, 200], ['gpu-b', 'GPU(Mali G1-Ultra #3・#4)', 'g', 112, 1020, 345, 130], ['gpu-c', 'GPU(Mali G1-Ultra #5・#6)', 'g', 112, 1155, 360, 135],
      ['gpu-d', 'GPU(Mali G1-Ultra #11・#12)', 'g', 695, 905, 355, 140], ['gpu-e', 'GPU(Mali G1-Ultra #9・#10)', 'g', 695, 1045, 355, 140], ['gpu-f', 'GPU(Mali G1-Ultra #7・#8)', 'g', 545, 1190, 370, 150], ['npu-l2', 'NPU L2 Cache 2MiB', 'n', 470, 1100, 225, 90],
      ['imagiq', 'MediaTek ImageIQ 1190', 'u', 1265, 70, 235, 315], ['enc', 'Video Encode & Decode', 'u', 1235, 395, 320, 265], ['mv', 'MediaTek Miravision 1190', 'u', 1135, 725, 370, 270], ['modem', 'MediaTek M90 5G Modem', 'u', 1175, 1115, 330, 215],
      ['phy-l1', 'LPDDR5X PHY', 'u', 10, 115, 75, 220], ['phy-l2', 'LPDDR5X PHY', 'u', 10, 1030, 75, 235], ['phy-r1', 'LPDDR5X PHY', 'u', 1500, 185, 70, 205], ['phy-r2', 'LPDDR5X PHY', 'u', 1512, 925, 60, 225],
      ['csi', 'CSI ×6', 'u', 1040, 15, 455, 45], ['pcie', 'PCIe 5.0 ・USB', 'u', 35, 5, 260, 100], ['ufs', 'UFS コントローラ', 'u', 1050, 1030, 82, 160]]),
    // Dimensity 9600 Pro(D9600-Pro-MT6995Z-10.47x12.80x0.15mm.jpg 8817×7232 の表示 1600×1312。写真は横長で、ファイル名の 10.47×12.80 は縦横の順が逆。12.80×10.47 と読むと 1.223 で写真の 1.219 と一致、積 134.0 mm² = プリセット)。注釈どおり: C2 Ultra @4.55GHz ×2(中央の左右)、C2 Pro @4.35GHz ×3(上段右)、C2 Pro @3.1GHz ×3(左上の縦列)。L3 16MiB、SLC 10MiB、Mali G2 Ultra MP12、NPU 1090
    'mt-9600pro': qf([0, 0, 1600, 1312], [[530, 422, 215, 215], [1003, 420, 225, 220], [808, 45, 122, 118], [935, 45, 125, 118], [1063, 45, 127, 118]], [[487, 40, 118, 130], [487, 172, 118, 118], [487, 292, 118, 122]], [
      ['l3a', 'L3 キャッシュ 4MiB(16MiB の一部。cfg に L3 なし)', 'u', 635, 205, 123, 200], ['l3b', 'L3 キャッシュ 4MiB', 'u', 760, 205, 125, 200], ['l3c', 'L3 キャッシュ 4MiB', 'u', 905, 205, 135, 200], ['l3d', 'L3 キャッシュ 4MiB', 'u', 1045, 205, 140, 200],
      ['sme', 'SME ×2', 'u', 608, 50, 198, 115], ['diag', 'リング・512KiB(注釈なし)', 'u', 748, 440, 252, 148],
      ['slc1', 'SLC#1 2.5MiB', 'u', 560, 645, 215, 150], ['slc2', 'SLC#2 2.5MiB', 'u', 780, 590, 215, 190], ['slc3', 'SLC#3 2.5MiB', 'u', 1000, 648, 195, 145], ['slc4', 'SLC#4 2.5MiB', 'u', 868, 845, 225, 115],
      ['npu-a', 'NPU 1090(MDLA #1・#2)', 'n', 140, 100, 335, 172], ['npu-b', 'NPU 1090(NPU L2 4MiB)', 'n', 140, 272, 335, 213], ['npu-c', 'NPU 1090(MDLA #3・#4)', 'n', 158, 487, 335, 153], ['mvpu', 'MVPU #1・#2', 'n', 35, 375, 98, 160], ['hub', 'Sensor hub・audio DSP', 'u', 55, 642, 440, 160],
      ['gpu-a', 'GPU(Mali G2 Ultra #1〜#3)', 'g', 20, 815, 500, 135], ['gpu-b', 'GPU(Mali G2 Ultra #4・#5)', 'g', 140, 965, 365, 145], ['gpu-c', 'GPU(Mali G2 Ultra #8・#9)', 'g', 140, 1112, 365, 150], ['gpu-core', 'GPU(Mali G2 Ultra-MP12 中央・GPU L2 4MiB)', 'g', 505, 965, 210, 300], ['gpu-d', 'GPU(Mali G2 Ultra #7・NX Core ほか)', 'g', 715, 965, 370, 150], ['gpu-e', 'GPU(Mali G2 Ultra #10・#12ほか)', 'g', 715, 1118, 425, 145],
      ['mtk', 'MediaTek(ISP ほか。注記は社名のみ)', 'u', 1195, 82, 277, 265], ['imageiq', 'ImageIQ 1290', 'u', 1232, 360, 250, 240], ['video', 'Video Engine', 'u', 1095, 800, 195, 160], ['mv', 'MediaTek Miravision 1290', 'u', 1295, 690, 285, 160], ['modem', 'MediaTek M90 5G Modem', 'u', 1150, 1120, 328, 150],
      ['phy-l1', 'LPDDR5x & 6 PHY', 'u', 8, 85, 115, 230], ['phy-l2', 'LPDDR5x & 6 PHY', 'u', 8, 990, 115, 290], ['phy-r1', 'LPDDR5x & 6 PHY', 'u', 1478, 115, 90, 235], ['phy-r2', 'LPDDR5x & 6 PHY', 'u', 1478, 855, 90, 265],
      ['csi', 'CSI #1〜#6', 'u', 1195, 35, 330, 28], ['usb', 'USB・PCIE', 'u', 140, 25, 280, 65]]),
  };
  // Switch 2 の T239(im1AIk2736qP6cwD.jpg 1231×960。Kurnal の注釈)。A78C ×8(左右 4 つずつ)、L3 は中央の列(注釈の範囲 y 292〜605。注釈は 2MiB〔上〕・「L3 Cache (share)」・4MiB・2MiB〔縦書き〕で、4MiB が L3 全体とも各部分とも読める)、GPU は TPC #1〜#6(12 SM)
  const NV_FRAMES = {
    't239': tf([0, 0, 1231, 960], { p: 8, e: 0, lp: 0 },
      [[667, 292, 151, 98], [667, 390, 151, 97], [667, 487, 151, 93], [667, 580, 151, 96], [980, 292, 152, 96], [980, 388, 152, 97], [980, 485, 152, 95], [980, 580, 152, 98]], [], [], [822, 292, 156, 313], [
        ['gpu-a', 'GPU(TPC #1〜#4。SM #1〜#8)', 'g', 180, 38, 425, 477], ['gpu-b', 'GPU(TPC #5・#6)', 'g', 797, 5, 406, 210], ['gpu-l2', 'GPU L2 Cache 1MiB(4×256KiB)', 'g', 797, 215, 406, 75],
        ['memctl', 'Memory Control', 'u', 1010, 680, 122, 165], ['memctl2', 'Memory Control', 'u', 1005, 870, 222, 85], ['phy-r', '64bit LPDDR5T/X Memory PHY', 'u', 1140, 292, 88, 560], ['phy-b', '64bit LPDDR5T/X Memory PHY', 'u', 452, 885, 545, 70], ['pcie', 'PCIe 4.0 x8', 'u', 10, 140, 68, 490]]),
  };
  // GB10(DGX Spark)の S-die(GB102in1.jpg 9034×3951 の左半分。表示 2000×875 の目測で左のダイは x 0〜1085。Kurnal の注釈)。X925 #1〜#5 が上のクラスタ、#6〜#10 が下。A725 #1〜#5 は上、#6〜#10 は下。L3 16MiB(上)・8MiB(下)は重み 2:1 で cfg の 24MB を分ける。G-die は別ダイで、frame 'gb10-gpu'(下。SOC_DIE / socLayout)
  NV_FRAMES.gb10 = tf([0, 0, 1085, 875], { p: 10, e: 10, lp: 0 },
    [[135, 45, 125, 112], [262, 45, 122, 112], [387, 45, 120, 112], [135, 172, 125, 125], [135, 300, 125, 115], [137, 447, 123, 128], [137, 577, 123, 126], [137, 705, 123, 130], [262, 752, 120, 85], [387, 752, 120, 85]],
    [[503, 178, 55, 52], [563, 142, 65, 50], [277, 350, 55, 55], [335, 350, 62, 55], [403, 350, 70, 60], [272, 452, 62, 50], [340, 452, 62, 50], [403, 442, 56, 55], [393, 637, 62, 60], [472, 648, 62, 58]], [],
    [[270, 165, 200, 180, 2], [270, 525, 98, 195, 1]], [
      ['io-l', 'USB4・PCIe 5.0 / 4.0・USB 3.0 / 2.0(左端の I/O 列)', 'u', 12, 100, 120, 735], ['mipi', 'MIPI DSI ×3', 'u', 135, 850, 115, 22],
      ['phy-t', '32bit LPDDR5 メモリ PHY #1〜#4', 'u', 530, 5, 430, 128], ['phy-b', '32bit LPDDR5 メモリ PHY #5〜#8', 'u', 530, 748, 415, 127],
      ['mc1', 'Memory Cache 2MiB', 'u', 634, 140, 95, 70], ['mc2', 'Memory Cache 2MiB', 'u', 731, 140, 95, 70], ['mc3', 'Memory Cache 2MiB', 'u', 578, 222, 95, 70], ['mc4', 'Memory Cache 2MiB', 'u', 675, 222, 100, 70],
      ['mc5', 'Memory Cache 2MiB', 'u', 690, 598, 80, 58], ['mc6', 'Memory Cache 2MiB', 'u', 538, 688, 92, 50], ['mc7', 'Memory Cache 2MiB', 'u', 633, 688, 95, 50], ['mc8', 'Memory Cache 2MiB', 'u', 733, 688, 80, 50],
      ['isp', 'ISP + Audio DSP', 'u', 830, 140, 145, 175], ['hub', 'Coherence Hub', 'u', 478, 425, 118, 140],
      ['slc', 'SLC 16MiB(上段)', 'u', 598, 312, 185, 213], ['slc-b', 'SLC(下段の 1MiB 区画)', 'u', 535, 597, 150, 52], ['slc-c', 'SLC(1MiB 区画)', 'u', 667, 528, 55, 55],
      ['npu', 'Nvidia NPU 4 Core', 'n', 785, 455, 190, 200], ['flash', '17x Flash', 'u', 815, 695, 100, 50],
      ['d2d', 'Die to Die Channel', 'u', 975, 225, 60, 335], ['nvl', 'NV-Link', 'u', 1036, 225, 42, 335], ['disp', 'Nvidia Display Engine', 'u', 980, 565, 100, 310]]);
  // GB10 の G-die(同じ GB102in1.jpg の右半分。表示 2000×875 の目測でダイは x 1095〜1988・y 6〜873)。コアなし(GPU の演算ブロックは電力按分に参加する live の枠)。
  // 注釈どおり: GPC#1〜#4(各 TPC ×6 = 3 区画×TPC 2 つ)、Raster Engine/3D FF ×4(縦の帯)、GPU L2(左上 1.5MiB ×8 と左下 12MiB。「24MiB」の注記は中央)、NV-Link・Die to Die Channel(左端)、NVDEC・NVENC。
  // GPC#1 の右端の区画は「TPC#2・TPC#1・SM#1〜#4」の拡大注記で、TPC#5・#6 とみられる(未確認)。中央(注記「GPU L2 Cache 24MiB」の位置)は構造を判別できず『未判別』の飾り
  NV_FRAMES['gb10-gpu'] = tf([1095, 6, 1988, 873], { p: 0, e: 0, lp: 0 }, [], [], [], null, [
    ['l2a', 'GPU L2 Cache 1.5MiB ×8(左上)', 'g', 1188, 10, 172, 317], ['l2b', 'GPU L2 Cache 12MiB(左下)', 'g', 1197, 555, 163, 315], ['l2x', '未判別(注記「GPU L2 Cache 24MiB」の位置)', 'u', 1175, 331, 210, 220, 'deco'],
    ['rast1', 'Raster Engine/3D FF', 'g', 1362, 10, 68, 215], ['rast2', 'Raster Engine/3D FF', 'g', 1387, 228, 78, 212], ['rast3', 'Raster Engine/3D FF', 'g', 1387, 442, 78, 213], ['rast4', 'Raster Engine/3D FF', 'g', 1368, 659, 74, 213],
    ['gpc1a', 'GPC#1 TPC#1・#2', 'g', 1432, 10, 171, 215], ['gpc1b', 'GPC#1 TPC#3・#4', 'g', 1605, 10, 171, 215], ['gpc1c', 'GPC#1 TPC#5・#6(SM 拡大注記つき)', 'g', 1778, 10, 177, 215],
    ['gpc2a', 'GPC#2 TPC#7・#8', 'g', 1467, 228, 170, 210], ['gpc2b', 'GPC#2 TPC#9・#10', 'g', 1639, 228, 174, 210], ['gpc2c', 'GPC#2 TPC#11・#12', 'g', 1815, 228, 170, 210],
    ['gpc3a', 'GPC#3 TPC#13・#14', 'g', 1467, 442, 170, 211], ['gpc3b', 'GPC#3 TPC#15・#16', 'g', 1639, 442, 174, 211], ['gpc3c', 'GPC#3 TPC#17・#18', 'g', 1815, 442, 170, 211],
    ['gpc4a', 'GPC#4 TPC#19・#20', 'g', 1444, 659, 150, 213], ['gpc4b', 'GPC#4 TPC#21・#22', 'g', 1596, 659, 198, 213], ['gpc4c', 'GPC#4 TPC#23・#24', 'g', 1796, 659, 189, 213],
    ['nvl', 'NV-Link', 'u', 1100, 228, 44, 330], ['d2d', 'Die to Die Channel', 'u', 1146, 228, 27, 330], ['nvdec', 'NVDEC・NVENC', 'u', 1100, 582, 93, 288]]);
  Object.assign(TILE_FRAMES, MT_FRAMES, NV_FRAMES);
  // 枠ごとに使えるテンプレート(checkLayout が検査。Intel の枠は x86-tile だけ、Snapdragon・Dimensity・T239 の枠は arm-soc だけ、AMD の単体ダイの枠は amd-apu / x86-mono、Strix Halo の SoC は amd-apu だけ)
  Object.keys(TILE_FRAMES).forEach((k) => { TILE_FRAMES[k].tpl = AMD_FRAMES[k] ? (k === 'strix-halo-soc' ? ['amd-apu'] : ['amd-apu', 'x86-mono']) : (QC_FRAMES[k] || MT_FRAMES[k] || NV_FRAMES[k]) ? ['arm-soc'] : ['x86-tile']; });
  TILE_FRAMES['strix-halo-soc'].live = true; // 評価に影響しない点は同じだが、SoC ダイは従来どおり電力按分に参加する(従来の「GPU」1 ブロックは飾りではなかった)
  TILE_FRAMES['gb10-gpu'].live = true; // GB10 の G-die も同じ(従来の「GPU」1 ブロックは飾りではなかった。'deco' を付けた「未判別」だけ飾り)
  TILE_FRAMES['gb10-gpu'].coreless = true; // コアも L3 も持たないダイ専用の枠(parse〔checkShape〕が、コア・L3 のブロックがあるダイへの誤用を拒否する。design.validate〔DRC〕は拒否しない)
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
  // Qualcomm Snapdragon の写真の枠(arm-soc)。出典の URL は C:\LocalAI\画像\必要な画像リスト.md の Kurnal Insights のページ(チップ名・SM 型番で対応づけた候補。ページ本文は未取得)
  const QC_SRC = {
    'sd-855': '855 sm8150.jpg(Kurnal の注釈。5670×5925。SM8150。URL 候補: https://kurnal-insights.com/en/dieshot/dieshotqualcomm-snapdragon-855sm8150/)',
    'sd-865': '865 sm8250.jpg(Kurnal の注釈。5674×6695。SM8250。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-865/)',
    'sd-888': 'SM8350.jpg(Kurnal の注釈。6760×6998。SM8350 = 888。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-888sm8350/)',
    'sd-8gen1': 'Snapdragon 8 Gen1(左)と 8+ Gen1(右)のダイショット …_1440w.jpg の左半分(TechInsights の写真 + xian333c の Floor Plan。右半分の 8+ Gen 1 は注釈なし・知乎 @Michael Yeh の透かしで、別のダイ配置のため使っていない。URL 候補: https://zhuanlan.zhihu.com/p/597438689)',
    'sd-8gen2': 'sm8550Dieshot.jpg(Kurnal の注釈。7631×7222。SM8550。URL 候補: https://kurnal-insights.com/dieshot/qualcomm-snapdragon-8gen2sm8550/)。A510 は写真の注釈どおり「2core cluster」を 2 等分した 2 枠 + 「1core」の 1 枠(2 コアクラスタの 2 等分は写真に境界が無く目測)。中間コアの A715 / A710 の割当は区別しない',
    'sd-8gen3': 'SM8650.jpg(Kurnal の注釈。7575×6335。SM8650。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8gen3/)',
    'sd-8elite': 'SM8750shuiying.jpg(Kurnal の注釈。7961×7039。SM8750。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8elitesm8750/)。Phoenix L 2 個は写真の 1 つの帯を左右に 2 等分した推定',
    'sd-8elite-gen5': '8EliteG5 Dieshot.jpg(Kurnal の注釈。6309×5588。SM8850。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-8elite-gen5sm8850/)',
    'sd-7p3-8s3': '7gen3+&8Sgen3.jpg(Kurnal の注釈。5307×6764。画像内に 7+ Gen 3 / 8s Gen 3 の両チップを併記〔クロック・Adreno・モデム〕、SM7675 / SM8635 共通のダイと判断。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-7gen38sgen3sm7675sm8635/)',
    'sd-8s-gen4': '8sGen4.jpg(Kurnal の注釈。7451×4711。SM8735。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8sgen4sm8735/)',
    'sd-8elite-x-gen6': 'SM8975.jpg(Kurnal の注釈。8531×7396。SM8975。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-8elite-extreme-gen6sm8975/)',
    'sd-7gen1': 'sn7450Kurnal.jpg(Kurnal の注釈。7472×6535。SM7450。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-7gen1sm7450/)',
    'sd-8cx-gen3': '8CXG3.jpg(Kurnal の注釈。7094×7832。SC8280XP。URL 候補: https://kurnal-insights.com/en/dieshot/qualcomm-snapdragon-8cxgen3sa8295psc8280/)。A78 の 4 つ目〔左上の枠〕は、写真の注釈が「System Level Cache 512KiByte」だが、構造が A78 と似ているため 4 つ目の A78 と推定した(注釈と食い違う)',
  };
  const SAME89 = '(根拠: 画像内にクロック〔X4 3.0/2.8GHz、A720 2.8/2.61GHz〕・Adreno 735/732・モデム X70/X62 の両チップ併記、ファイル名 7gen3+&8Sgen3、URL の綴り sm7675sm8635、プリセットの面積・プロセスの一致〔89.5 mm²・N4〕。このダイ自身の写真なので photo)';
  const QC_MAP = {
    'qc-855': { frame: 'sd-855', basis: 'photo' }, 'qc-865': { frame: 'sd-865', basis: 'photo' }, 'qc-888': { frame: 'sd-888', basis: 'photo' }, 'qc-8gen1': { frame: 'sd-8gen1', basis: 'photo' },
    'qc-8gen2': { frame: 'sd-8gen2', basis: 'photo' }, 'qc-8gen3': { frame: 'sd-8gen3', basis: 'photo' }, 'qc-8elite': { frame: 'sd-8elite', basis: 'photo' }, 'qc-8elite-gen5': { frame: 'sd-8elite-gen5', basis: 'photo' },
    'qc-7plus-gen3': { frame: 'sd-7p3-8s3', basis: 'photo', extra: '8s Gen 3 と同じダイ' + SAME89 },
    'qc-8s-gen3': { frame: 'sd-7p3-8s3', basis: 'photo', extra: '7+ Gen 3 と同じダイ' + SAME89 },
    'qc-8s-gen4': { frame: 'sd-8s-gen4', basis: 'photo' }, 'qc-8elite-x-gen6': { frame: 'sd-8elite-x-gen6', basis: 'photo' }, 'qc-7gen1': { frame: 'sd-7gen1', basis: 'photo' }, 'qc-8cx-gen3': { frame: 'sd-8cx-gen3', basis: 'photo' },
  };
  // MediaTek Dimensity と Switch 2 の T239 の写真の枠(arm-soc)。出典の URL は必要な画像リスト.md の Kurnal Insights のページ(チップ名・MT 型番で対応づけた候補。ページ本文は未取得)。画像内の透かしは @Kurnal
  const MT_SRC = {
    'mt-9000': 'D9000-mt6983.jpg(Kurnal の注釈。6787×7296。MT6983。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9000-mt6983/)。A510 4 つは「Dual A510 Cluster」を左右・各 2 コアに分けた推定。左下のコア枠は A710 の表記なし(注釈なし。L2 256KiB の容量と構造から A710 と推定)',
    'mt-9200': 'D9200-mt6985.jpg(Kurnal の注釈。10199×9504。MT6985。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9200-mt6985/)。A510 4 つは注釈の 2 コアクラスタ(左)と右の A510 を 2 コアずつに分けた推定。注釈なし〔推定〕: 左上の A715 は構造から、右上の X3 は表記なしで L2 1MiB・L1 64KiB の構造から X3 と推定',
    'mt-9300': 'D9300-mt6989.jpg(Kurnal の注釈。6414×7602。MT6989。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9300-mt6989/)。X4 @3.25GHz ×1・X4 @2.85GHz ×3・A720 @2.0GHz ×4 は注釈どおり',
    'mt-9400': 'D9400-mt6991.jpg(Kurnal の注釈。8000×7419。MT6991。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9400-mt6991/)。X925 @3.62GHz(プリセットは 3.63。0.01 差)・X4 @3.3GHz ×2〔#2・#3〕・A720 @2.4GHz ×3〔@2〜@4〕は注釈どおり。注釈なし〔推定〕: 右上の X4 #1(L2 1MiB の構造から)と 4 つ目の A720(右の枠。L2 512KiB の構造から)',
    'mt-9500': 'D9500-mt6993.jpg(Kurnal の注釈。7531×6339。MT6993。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9500-mt6993/)。C1-Ultra @4.21GHz・C1-Premium @3.5GHz ×3・C1-Pro @2.7GHz ×4 は注釈どおり',
    'mt-9600pro': 'D9600-Pro-MT6995Z-10.47x12.80x0.15mm.jpg(Kurnal の注釈。8817×7232。MT6995Z。URL 候補: https://kurnal-insights.com/en/dieshot/mediatek-dimensity-9600-pro-mt6995/)。写真は横長で、ファイル名の寸法は縦横が逆の記載(12.80×10.47 = 134.0 mm² でプリセットと一致)。C2 Ultra @4.55GHz ×2・C2 Pro @4.35GHz ×3・C2 Pro @3.1GHz ×3 は注釈どおり',
  };
  const NV_SRC = {
    't239': 'im1AIk2736qP6cwD.jpg(Kurnal の注釈。1231×960。ファイル名にチップ名なし。画像内の A78C ×8・TPC #1〜#6・LPDDR5T/X からユーザー申告の Switch 2 の T239 と判定。寸法の記載なし。URL 候補: https://www.techpowerup.com/336485/full-die-shot-analysis-of-nintendo-switch-2-soc-indicates-samsung-8-nm-production-origins)。L3 は中央の列で、注釈は 2MiB〔上〕・L3 Cache (share) 4MiB・2MiB〔縦書き〕で、4MiB が L3 全体とも各部分とも読める(2 通りに読める。cfg の 4MB と食い違うかは未確定)ため、注釈の範囲(縦 y 292〜605)の 1 枠に cfg の容量を割り当てた',
  };
  NV_SRC.gb10 = 'GB102in1.jpg(Kurnal の注釈。9034×3951。透かし @Kurnal。左が S-die・右が G-die の 1 枚で、左のダイだけ使う。寸法 12.91×16.10 mm〔ページの値。画像内に記載なし〕は縦横比と一致。URL 候補: https://kurnal-insights.com/en/dieshot/nvidia-gb10/)。X925 5+5・A725 5+5・L3 16MiB〔上〕/ 8MiB〔下〕・SLC・NPU・PHY・C2C は注釈どおり。推定: L3 は cfg の 24MB を 16:8 に分けた(どちらが 16MB かは出典で食い違う)、SLC の 1MiB 区画は 3 枠に束ねた〔下段の左隣の区画は枠外、上段の枠の右端は 2 段目の区画を切る〕、Memory Cache 2MiB ×8 と SLC の関係は不明、A725 の小さな枠は目測の誤差が大きい。G-die は別ダイ(frame gb10-gpu)';
  const ARM_MAP = {
    'mt-9000': { frame: 'mt-9000', basis: 'photo', src: MT_SRC['mt-9000'] }, 'mt-9200': { frame: 'mt-9200', basis: 'photo', src: MT_SRC['mt-9200'] }, 'mt-9300': { frame: 'mt-9300', basis: 'photo', src: MT_SRC['mt-9300'] },
    'mt-9400': { frame: 'mt-9400', basis: 'photo', src: MT_SRC['mt-9400'] }, 'mt-9500': { frame: 'mt-9500', basis: 'photo', src: MT_SRC['mt-9500'] }, 'mt-9600pro': { frame: 'mt-9600pro', basis: 'photo', src: MT_SRC['mt-9600pro'] },
    'nv-t239': { frame: 't239', basis: 'photo', src: NV_SRC['t239'] },
    'nv-gb10': { frame: 'gb10', basis: 'photo', src: NV_SRC['gb10'] },
  };
  // Strix Halo の SoC ダイ(CCD は別ダイ)に写真の枠を当てる。classify の socDie と、design.fromPreset が使う
  // template は socLayout が layout に入れるテンプレート(Strix Halo は amd-apu、GB10 の G-die は arm-soc)。match は CCD・S-die 以外から SoC ダイ(G-die)を探す名前の判定
  const SOC_DIE = { 'amd-strixhalo-395': { template: 'amd-apu', frame: 'strix-halo-soc', src: 'Strix-Halo-All-16.02x19.20.jpg(Kurnal の注釈。6724×8237。出典は推定: https://kurnal-insights.com/en/dieshot/?sort=yearDesc&m=AMD&t=desktop-soc&id=amd-strix-halo-full-package)。SoC ダイの縦横比 1.195 は 19.2×16.02 mm(ファイル名の 16.02x19.20。積 307.6 mm² = プリセットの面積)と一致。注釈に「?」つきの項目あり(作者も未確定)。GPU の WGP 20 個(40CU)・NPU・MALL・PHY などはすべてプリセットに無いブロックで、SoC ダイは従来どおり電力按分に参加する' },
    'nv-gb10': { template: 'arm-soc', frame: 'gb10-gpu', match: /G-die/i, src: 'GB102in1.jpg の右半分(Kurnal の注釈。9034×3951。透かし @Kurnal。出典 URL https://kurnal-insights.com/en/dieshot/nvidia-gb10/ はファイル名一致による対応づけ。ページ本文は調査担当が取得済み。画像内に URL の記載なし)。縦横比 1.03 は写真の目測(Kurnal の寸法 13.45×12.91 mm = 1.04 と 1.2% 差)。GPC#1〜#4・TPC・Raster Engine・GPU L2・NV-Link・NVDEC・NVENC は注釈どおり、中央は未判別の飾り。N3E は推定。GPU 演算ブロックは従来の「GPU」1 ブロックと同じく電力按分に参加する' } };
  // Strix Halo の Zen 5 CCD(CCD ×2 の写真。同じ画像の上側。SoC ダイと同尺で、CCD 1 つ 767×625 px = 約 9.06×7.39 mm = 66.9 mm² でプリセットの 67.1 mm² と整合)
  const RECIPE_OF = { 'amd-strixhalo-395': 'Zen 5 (Strix Halo)' };
  const TILE_SRC = {
    'mtl-compute': 'MTL_annotated.jpg(Meteor Lake。作者表記なし。チップ名は画像内の Redwood Cove / Crestmont / Xe-LPG とファイル名から)。P 6 + E 4 コア×2 クラスタ。LP-E 2 は写真では SoC タイル側にあるが、コアのブロックは Compute タイルのダイに置く仕様なので、右端の SoC Tile Interconnect の帯の上に模式で重ねた(実際の位置ではない)',
    'arl-compute': 'arrow lake cpudie al3.jpg(Arrow Lake の Compute タイルの拡大注釈。ARL_LQ_annotated.jpg の左のタイルと同じ配置。作者表記なし)。P #1〜#8、E クラスタ #1〜#4(各 4 コア)、中央に L3 とリングエージェントの帯',
    'lnl-compute': 'LNL_Package_Annotated.jpg(Lunar Lake のパッケージ注釈。作者表記なし)。Compute タイル(P 4・LP-E 4・L3・GPU・NPU・メディアが一枚)',
    'ptl-compute': 'Kurnal の Panther Lake 全体図 dh0gWbF8gG9AXfQw.jpg と panther-lake-computex26-die-annotated.jpg(同じ Compute タイル。縦横比 1.77 が一致)。P 4・Darkmont E 4×2 クラスタ・LPE 4・L3 18MiB・NPU・メディアなど',
    'ptl-compute-4p4lpe': 'Panther Lake_dies.jpg(ユーザー提供・出典未確認)の 4P+4LPE 構成の目測。ptl-compute の配置から E クラスタを除いた流用。ダイ面積未取得',
    'wcl-compute': 'Wildcat-lake-computex26-series3-die-annotated.jpg(注釈つきダイ写真。作者表記なし)の目測。Cougar Cove ×2・Darkmont ×4・L3・MSC・Xe Core ×2・NPU など。ダイ面積未取得。写真は compute die 単体と判断',
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
    // 12Xe の SKU は 4Xe 版の GPU タイル(decor2)を出さない。386H は GPU が 4Xe(プリセットの notes)なので 12Xe 版(decor0)を出さず、4Xe 版を出す
    'intel-ptl-x9-388h': Object.assign(tm('ptl-compute', 'photo', PTL_NOTE), { skip: ['decor2'] }),
    'intel-ptl-x9-386h': Object.assign(tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE + '。386H の GPU は 4Xe のため 12Xe の GPU タイルは出さず、4Xe の GPU タイルは Panther Lake_dies.jpg の相対寸法の目測(出典未確認)'), { skip: ['decor0'] }),
    'intel-ptl-x9-378h': Object.assign(tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE), { skip: ['decor2'] }),
    'intel-ptl-x7-358h': Object.assign(tm('ptl-compute', 'reuse', PTL_REUSE + PTL_NOTE), { skip: ['decor2'] }),
    // 325 の frame(ptl-compute-4p4lpe)は tiles が空なので、GPU・Platform の飾りのタイルは出ない(寸法未取得)。320 の I/O タイルの飾りも付けない
    'intel-ptl-u5-325': tm('ptl-compute-4p4lpe', 'reuse'),
    'intel-wcl-c5-320': tm('wcl-compute', 'photo'),
  };
  // AMD CCD(8 コア): top = 上部の帯(Debug / Infinity Fabric / SMU)の高さ比、core = コア+L2 の幅比(左右とも)、aspect = 幅/高さ。
  const CCD_RECIPES = {
    'Zen 3': { aspect: 1.516, top: 0.154, core: 0.247, basis: 'photo', note: 'Zen 3 CCD の注釈つきダイ写真(WCCFTech、ユーザー提示)の目測(上部の帯 約15%、コア+L2 約25%、L3 約50%)。面積比は AMD 公表(CCX 68 / CCD 81 mm²)と Locuza(二次)と整合' },
    'Zen 5': { aspect: 1.188, top: 0.174, core: 0.354, basis: 'survey', note: 'Fritzchens Fritz の Zen 5 CCD 測定値(コア+L2 7.1%、L3 23.3%。二次)。IOD は Zen 4/5 共通(ユーザー談)で、IOD の位置・縦横比は GNR_Package_Annotated.jpg と delidded.jpg の目測' },
    'Zen 5 (Strix Halo)': { aspect: 1.227, top: 0.127, core: 0.355, basis: 'photo', note: 'Strix Halo の Zen 5 CCD ×2 の注釈つきダイ写真(Strix-Halo-All-16.02x19.20.jpg の上側。Kurnal の注釈。出典は推定)の目測(縦横比 767×625 px = 1.227、IFOP の帯 約 13%、コア+L2 約 35.5%、L3 約 29%)。SoC ダイと同尺の写真で、CCD 1 つ 約 66.9 mm² はプリセットの 67.1 mm² と整合。9950X の Zen 5 CCD(Fritzchens Fritz の測定値の比)とも近い' },
    'Zen 4': { aspect: 1.516, top: 0.16, core: 0.276, basis: 'reuse', note: 'delidded.jpg(AMD 公式図のレンダリング。縮尺保証なし)と GNR_Package_Annotated.jpg の目測で IOD の位置・縦横比を合わせた(IOD は Zen 4/5 共通。ユーザー談)。Zen 4 CCD 内の配置は Zen 3 写真の構造に Zen 4 の面積比(コア+L2 5.8%、L3 約 37%。低信頼)を当てた流用で、このチップの CCD 写真ではない' },
  };
  const DEFAULT_RECIPE = 'Zen 3';
  // Zen 4(Raphael)・Zen 5(Granite Ridge)共通の Client I/O Die の配置(IOD は共通のダイ。ユーザー談)。ダイ面積はプリセットのまま(縦横比だけ)。
  // aspect = 幅/高さ: GNR_Package_Annotated.jpg(注釈つき実写。IOD 605×465 px = 1.30)を採用。delidded.jpg(AMD 公式図のレンダリング)の目測は 302×220 px = 1.37(差 5%)。
  // gap = CCD 下端と IOD 上端の隙間(CCD の高さ比): 実写 178 / 372 px = 0.48(delidded は 97 / 155 = 0.63 だが図中の文字を含む)。
  // dx1 = CCD 1 つのとき、IOD の水平中心を CCD の中心から IOD 幅の何倍ずらすか(実写は delidded.jpg と 180° 向きが違う〔ピン 1 の三角が左上〕。実写で CCD は IOD の右寄り〔223 / 605 = 0.37〕なので、delidded の向き(CCD 上・IOD 下)に回すと CCD は IOD 中心より左、IOD は CCD の右寄り = +0.37)。CCD 2 つは delidded.jpg で中央揃い(ずれ約 1%)。
  const IOD_PLACE = { aspect: 1.30, gap: 0.48, dx1: 0.37 };
  const CCD_TOP = [0.257, 0.733]; // 上部の帯の区切り(Debug | Infinity Fabric | SMU の幅比。Zen 3 写真の目測)
  const CCD_GAP = 0.03;           // 1 つのダイ内の CCD どうしの隙間(CCD 幅比)

  const isSmall = (type) => /^(E|LP|C)/i.test(String(type || ''));
  const hasSmallGroup = (preset) => ((preset.cfg && preset.cfg.cores) || []).some((g) => isSmall(g.type));
  const ccdUnits = (name) => { const m = /[×x]\s*(\d+)/i.exec(String(name || '')); const n = m ? parseInt(m[1], 10) : 1; return n >= 1 && n <= MAX_UNITS ? n : 1; };
  const firstBigUarch = (preset) => { const g = ((preset.cfg && preset.cfg.cores) || []).find((x) => !isSmall(x.type)); return g ? g.uarch : null; };
  const sumCount = (preset, small) => ((preset.cfg && preset.cfg.cores) || []).filter((g) => isSmall(g.type) === small).reduce((s, g) => s + (g.count || 0), 0);

  // プリセット → classify の結果({ template, uncore, igpu, npu, units, scaleBasis, scaleNote, slots?, recipe?, dieIndex, iodGpu })か null(判定できない / 対象外。呼び出し側は従来の配置にする)。
  // roleOf(name) はダイ名 → 'compute' | 'gpu' | 'uncore'。
  // 注釈なしのダイ写真(Kurnal Insights。画像は C:\LocalAI\画像)の縦横比(幅/高さ)だけを採る 4 件。ファイル名の寸法の幅×高さが画像の実ピクセル比と一致する向きで、面積(mm²)はプリセットと一致。
  // 6 Gen 1 と 4 Gen 2 のファイル名は「小さい方 x 大きい方」の順だが、画像は横長(8702×7198 = 1.209、6896×6827 = 1.010)なので、横 = ファイル名の後ろの値とした。7 Gen 3(6941×9251 = 0.750、縦長)・Dimensity 8200(7667×6161 = 1.244)は前 x 後 = 幅 x 高さ
  const ASPECT_ONLY = {
    'qc-6gen1': { aspect: 1.2114, file: 'sd6gen1-sm6450-6.67x8.08.jpg', dims: '横 8.08 × 縦 6.67 mm = 53.9 mm²。画像 8702×7198 px は横長' },
    'qc-4gen2': { aspect: 1.0095, file: 'sd4gen2-sm4450-6.32x6.38.jpg', dims: '横 6.38 × 縦 6.32 mm = 40.3 mm²。画像 6896×6827 px' },
    'qc-7gen3': { aspect: 0.7494, file: 'SD7gen3 sm7550 6.43x8.58.jpg', dims: '横 6.43 × 縦 8.58 mm = 55.2 mm²。画像 6941×9251 px は縦長' },
    'mt-8200': { aspect: 1.2418, file: 'D8200-mt6896z-10.27x8.27x0.09mm.jpg', dims: '横 10.27 × 縦 8.27 mm = 84.9 mm²。画像 7667×6161 px' },
  };

  function classify(preset, roleOf) {
    if (preset && preset.vendor === 'Apple' && APPLE_MAP[preset.id]) {
      const m = APPLE_MAP[preset.id]; const dies = preset.dies || [];
      if (!dies.length) return null;
      return { uncore: false, igpu: false, npu: false, template: 'apple-soc', units: m.units || 1, frame: m.frame, dieIndex: 0, scaleBasis: m.basis, scaleNote: `${m.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま。出典 URL はファイル名・透かしからの推定で、ユーザー提示の URL のうちのどれかは要確認`, iodGpu: false, decorIod: false };
    }
    if (preset && preset.vendor === 'Qualcomm' && QC_MAP[preset.id]) {
      const m = QC_MAP[preset.id]; const dies = preset.dies || [];
      if (!dies.length || !TILE_FRAMES[m.frame]) return null;
      return { uncore: false, igpu: false, npu: false, template: 'arm-soc', units: 1, frame: m.frame, dieIndex: 0, scaleBasis: m.basis, scaleNote: `${QC_SRC[m.frame]}${m.extra ? `。${m.extra}` : ''}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま。出典 URL はリストの候補(ページ未取得・要ユーザー確認)`, iodGpu: false, decorIod: false };
    }
    if (preset && (preset.vendor === 'MediaTek' || preset.vendor === 'NVIDIA') && ARM_MAP[preset.id]) {
      const m = ARM_MAP[preset.id]; const dies = preset.dies || [];
      if (!dies.length || !TILE_FRAMES[m.frame]) return null;
      const res = { uncore: false, igpu: false, npu: false, template: 'arm-soc', units: 1, frame: m.frame, dieIndex: 0, scaleBasis: m.basis, scaleNote: `${m.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま。出典 URL はリストの候補(ページ未取得・要ユーザー確認)`, iodGpu: false, decorIod: false };
      // GB10: コアを持たない G-die(別ダイ)にも写真の枠を当てる(design.fromPreset が socLayout で layout とブロックを作る)
      const sd = SOC_DIE[preset.id];
      if (sd) { const gi = dies.findIndex((d, i) => i !== 0 && sd.match && sd.match.test(d.name || '')); if (gi >= 0) res.socDie = { dieIndex: gi, frame: sd.frame }; }
      return res;
    }
    if (preset && ASPECT_ONLY[preset.id] && (preset.dies || []).length) {
      // 注釈なしのダイ写真しかない 4 件: ダイの縦横比だけ写真のファイル名の寸法に合わせる(frame なし。ブロックの配置は従来どおりの模式。面積はプリセットのまま)
      const m = ASPECT_ONLY[preset.id]; const dies = preset.dies;
      const ci = Math.max(0, dies.findIndex((d) => (typeof roleOf === 'function' ? roleOf(d.name) : 'compute') === 'compute'));
      return { uncore: false, igpu: false, npu: false, template: 'arm-soc', units: 1, dieIndex: ci, scaleBasis: 'schematic', aspect: m.aspect, scaleNote: `縦横比のみ写真のファイル名の寸法(${m.file}。${m.dims}。出典 URL 未確認)に合わせた。ブロックの配置・大きさは模式で根拠なし`, iodGpu: false, decorIod: false };
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
        iodPlace: !RECIPE_OF[preset.id] && known && (u === 'Zen 4' || u === 'Zen 5'), // Raphael・Granite Ridge の IOD(Strix Halo は対象外)
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

  // コアを持たない別ダイ(Strix Halo の SoC ダイ、GB10 の G-die。classify の socDie)→ そのダイの layout(コアなし。写真の枠のブロックだけ)。design.fromPreset が使う
  function socLayout(preset) {
    const sd = preset && SOC_DIE[preset.id]; if (!sd) return null;
    return { template: sd.template || 'amd-apu', uncore: false, igpu: false, npu: false, units: 1, scaleBasis: 'photo', scaleNote: `${sd.src}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま`, frame: sd.frame };
  }

  // classify の結果 → die.layout に保存する形(dieIndex・iodGpu は保存しない)
  function toLayout(c) {
    if (!c) return null;
    const l = { template: c.template, uncore: !!c.uncore, igpu: !!c.igpu, npu: !!c.npu, units: c.units || 1, scaleBasis: c.scaleBasis || 'schematic', scaleNote: c.scaleNote || '' };
    if (c.slots) l.slots = { p: c.slots.p, e: c.slots.e };
    if (c.recipe) l.recipe = c.recipe;
    if (c.frame) l.frame = c.frame;
    if (c.aspect) l.aspect = c.aspect;
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
      case 'arm-soc': return TILE_FRAMES[layout.frame] ? TILE_FRAMES[layout.frame].aspect : (typeof layout.aspect === 'number' && layout.aspect > 0 ? layout.aspect : 1);
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
  function usesTileFrame(layout) { return !!layout && (layout.template === 'x86-tile' || layout.template === 'amd-apu' || layout.template === 'x86-mono' || layout.template === 'arm-soc'); }
  const EDITED_NOTE = '編集でコア数が元のダイの枠を超えたため、ブロックの大きさに根拠はありません';
  // 編集後の layout(枠を超えたら根拠を schematic に落とす。超えなければそのまま)
  function afterEdit(layout, cores, l3MB) {
    if (!layout || layout.scaleBasis === 'schematic') return layout;
    // Apple・Snapdragon・Dimensity は cfg に L3 が無く(SLC・L3 は飾り)、写真の枠に L3 の置き場所が無い。編集で L3 を足したら根拠なしの従来配置に落とす。
    // frame に l3 がある枠(T239)は L3 を変えても photo のまま(ラベルだけ更新。L3 を 0 にすると L3 ブロックが無くなるだけ)
    if ((layout.template === 'apple-soc' || (layout.template === 'arm-soc' && !(TILE_FRAMES[layout.frame] && TILE_FRAMES[layout.frame].l3))) && typeof l3MB === 'number' && l3MB > 0) return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: `編集で L3 を追加したため、ブロックの大きさに根拠はありません(写真の枠に L3 は無い)` });
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
      // template と frame の対応: apple-soc は APPLE_FRAMES、amd-apu は FRAMES(Strix・Kraken)か TILE_FRAMES、x86-tile・x86-mono・arm-soc は TILE_FRAMES(Intel の Compute タイル・AMD のダイ写真・Snapdragon の枠)。ほかのテンプレートは frame を持たない
      const has = (o) => Object.prototype.hasOwnProperty.call(o, l.frame);
      if (l.template === 'apple-soc' ? !has(APPLE_FRAMES) : l.template === 'x86-tile' || l.template === 'x86-mono' || l.template === 'arm-soc' ? !(has(TILE_FRAMES) && TILE_FRAMES[l.frame].tpl.indexOf(l.template) >= 0) : (l.template !== 'amd-apu' || !(has(FRAMES) || (has(TILE_FRAMES) && TILE_FRAMES[l.frame].tpl.indexOf(l.template) >= 0)))) return `layout.frame「${l.frame}」はテンプレート ${l.template} では使えません`;
    } else if (l.template === 'apple-soc' || (l.template === 'arm-soc' && !(l.scaleBasis === 'schematic' && l.aspect != null))) return `${l.template} には layout.frame が要ります`;
    if (l.aspect != null && !(l.template === 'arm-soc' && l.frame == null && l.scaleBasis === 'schematic' && typeof l.aspect === 'number' && isFinite(l.aspect) && l.aspect >= 0.25 && l.aspect <= 4)) return 'layout.aspect は frame のない arm-soc(scaleBasis が schematic)の縦横比(0.25〜4 の数)だけに使えます';
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
        const rs = Array.isArray(TF.l3[0]) ? TF.l3 : [TF.l3]; // 複数枠(Zeppelin の 2 CCX)は容量を等分。枠の 5 番目の数(重み)があれば容量をその比で分ける(GB10 の 16MB + 8MB クラスタ = 重み 2:1)
        const wsum = rs.reduce((a, r) => a + (r[4] || 1), 0);
        rs.forEach((r, i) => put(rs.length === 1 ? `${die.id}-l3` : `${die.id}-l3-${i}`, 'l3', `L3 ${rs.length === 1 ? l3MB : Math.round((l3MB * (r[4] || 1) / wsum) * 100) / 100}MB`, X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy));
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

  const api = { TEMPLATES, TEMPLATE_IDS, DECOR_FACTS, CCD_RECIPES, SCALE_BASES, SCALE_TEXT, MAX_UNITS, DECOR_IOD, IOD_PLACE, APPLE_FRAMES, TILE_FRAMES, tileDecor, classify, toLayout, socLayout, aspectOf, checkDecorDies, decorNote, checkLayout, fits, afterEdit, layoutDie, iodBlocks, scaleText, isSmall };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.floorplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
