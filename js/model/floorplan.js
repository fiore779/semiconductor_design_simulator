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
    'amd-zen4-7840hs': { igpu: true, npu: true }, 'amd-zen4-8500g': { igpu: true }, 'amd-zen4-8700g': { igpu: true, npu: true }, 'amd-strix-hx370': { igpu: true, npu: true, frame: 'strix-point' }, 'amd-kraken-350': { igpu: true, npu: true, frame: 'kraken-point' },
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
    // Phoenix 2(AMD-Phoenix-2-Die-Shot-annotated.preview.jpg 640×382 の注釈つきプレビュー。2026-11-16 追加)。Zen 4 ×2(左下)、Zen 4c ×4(左上 3 + 下に 1)、中央左に L3 16MB、右に GPU(4CU。WGP ×2)・メモリコントローラ・Media Engine、上辺に DDR5 PHY、下辺に PCIe、右辺に Display・USB。
    // 座標は表示ピクセルからの目測(±5〜10%。低解像度のプレビューで境界は粗い)。box は縦横比を Kurnal の寸法 15.01×9.06 mm(1.657)に合わせた(画像の 640×382 は 1.675 で、縁の約 1%)。コアは Zen 4(P)→ Zen 4c(C。small)の順に枠へ
    phoenix2: tf([3, 0, 636, 382], { p: 2, e: 4, lp: 0 },
      [[40, 205, 55, 112], [97, 205, 55, 112]],
      [[40, 38, 58, 60], [100, 38, 58, 60], [160, 38, 58, 60], [153, 205, 60, 58]], [], [40, 108, 225, 95], [
        ['ddr-a', 'DDR5 PHY(32bit + 8bit ECC)', 'u', 15, 4, 135, 28], ['ddr-b', 'DDR5 PHY(32bit + 8bit ECC)', 'u', 158, 4, 130, 28], ['ddr-c', 'DDR5 PHY(32bit + 8bit ECC)', 'u', 348, 4, 135, 28], ['ddr-d', 'DDR5 PHY(32bit + 8bit ECC)', 'u', 490, 4, 130, 28],
        ['mc', 'Memory Controller', 'u', 225, 36, 145, 66], ['media', 'Media Engine', 'u', 375, 36, 125, 66],
        ['gpu', 'GPU(4CU)', 'g', 277, 127, 210, 78], ['gpu-l', 'GPU', 'g', 277, 207, 78, 70], ['gpu-wgp', 'GPU(WGP ×2)', 'g', 357, 207, 130, 70],
        ['display', 'Display', 'u', 596, 70, 38, 56], ['usb', 'USB(USB2・USB4 / USB3)', 'u', 583, 172, 52, 110], ['usb-b', 'USB2', 'u', 583, 300, 52, 56],
        ['pcie', 'PCIe(x4 ×3・x2)', 'u', 285, 327, 255, 46], ['misc', 'MISC', 'u', 10, 322, 60, 52], ['io-l', 'I/O(左辺の列)', 'u', 10, 36, 25, 284],
        ['rest', 'そのほか(注釈なし。内訳は未判別)', 'u', 503, 104, 78, 218]]),
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
  // ---- 古い Intel Core i(第 2〜10 世代のデスクトップ・H 系のモノリシックダイ)の写真の枠(2026-11-17 追加。ユーザー指示「ダイショットは新しく追加したプリセット群に使用してください」)----
  // 座標は各写真をブラウザで表示したときのピクセルの目測(±5〜10%)。box = ダイの外形(縦横比は写真の自然な縦横比と一致させた。実寸の注記は無い)。写真は注釈なしなので、コア・L3・GPU・リングバス・System Agent は
  // 見た目から判別し、判別できない領域は「内訳は未判別」の飾りにした。L3 は SRAM の縦帯(コアの間・端)を枠にし、5 番目の数(重み)でスライス数に近い比に分ける。docs/research/old-intel-dieshots-2026-11-17.md
  const UNK = '(内訳は未判別)';
  const colRows = (xs, w, yT, hT, yB, hB) => { const r = []; xs.forEach((x) => { r.push([x, yT, w, hT]); r.push([x, yB, w, hB]); }); return r; }; // 列ごとに上段・下段の順
  const ringCols = (xs, w, y, h, label) => xs.map((x, i) => [`ring${i}`, label, 'u', x, y, w, h]); // 中段のリング帯は L3 の縦帯と交差するので、コアの列ごとに分ける
  const INTEL_OLD_FRAMES = {
    // Sandy Bridge 4 コア(Intel in Deutschland の写真 4465×2160)。左に GPU、4 つのコア(上)と各コアの下の L3 スライス、右に System Agent
    'snb-4c': tf([0, 37, 1191, 613], { p: 4, e: 0, lp: 0 },
      [[278, 45, 182, 310], [463, 45, 182, 310], [648, 45, 182, 310], [832, 45, 182, 310]], [], [],
      [[278, 360, 182, 182], [463, 360, 182, 182], [648, 360, 182, 182], [832, 360, 182, 182]], [
        ['gpu', 'GPU(内蔵。左側の大きな領域)', 'g', 8, 45, 267, 495], ['sa', `System Agent${UNK}`, 'u', 1018, 45, 110, 495], ['io-r', `I/O・PHY(右端${UNK})`, 'u', 1131, 45, 54, 495],
        ['phy-b', `メモリ・I/O の PHY(下辺${UNK})`, 'u', 428, 545, 700, 66], ['io-bl', `I/O(左下${UNK})`, 'u', 5, 545, 420, 66]]),
    // Haswell 4 コア GT2(Intel in Deutschland の写真 5863×2160)。左に I/O、4 つの「L3 スライス(上)+ コア(下)」、右に GPU
    'hsw-4c': tf([0, 106, 1191, 545], { p: 4, e: 0, lp: 0 },
      [[170, 280, 155, 262], [332, 280, 155, 262], [493, 280, 155, 262], [655, 280, 155, 262]], [], [],
      [[170, 150, 155, 130], [332, 150, 155, 130], [493, 150, 155, 130], [655, 150, 155, 130]], [
        ['io-l', `System Agent・I/O(左端${UNK})`, 'u', 2, 150, 165, 392], ['pad-t', `I/O・PHY(上辺${UNK})`, 'u', 2, 108, 848, 40],
        ['sa', `System Agent・メディア(GPU の左${UNK})`, 'u', 815, 150, 45, 392], ['gpu', 'GPU(内蔵 GT2。右側の大きな領域)', 'g', 862, 108, 326, 434]]),
    // Skylake 4 コア GT2(Skylake_(quad-core).png 3158×2160)。左に GPU、中央に 2×2 のコアと L3(縦帯)、右に System Agent・I/O
    'skl-4c': tf([120, 0, 1070, 650], { p: 4, e: 0, lp: 0 },
      [[510, 45, 155, 255], [510, 385, 155, 255], [715, 45, 155, 255], [715, 385, 155, 255]], [], [],
      [[487, 45, 23, 595, 1], [668, 45, 47, 595, 2], [872, 45, 23, 595, 1]], [
        ['disp-t', `ディスプレイ・I/O(左上の帯${UNK})`, 'u', 127, 3, 245, 42], ['io-t', `I/O・PHY(上辺${UNK})`, 'u', 375, 3, 692, 40], ['gpu', 'GPU(内蔵 GT2。左側の大きな領域)', 'g', 127, 52, 252, 588],
        ['sa-l', `System Agent・メディア(GPU と L3 の間${UNK})`, 'u', 382, 52, 103, 588], ...ringCols([510, 715], 155, 300, 85, `コア間のリング・L2 まわり(中段${UNK})`), ['sa-r', `System Agent・I/O(右側${UNK})`, 'u', 897, 45, 170, 595]]),
    // Kaby Lake 4 コア GT2(Kaby_lake_(quad_core).png 3254×2160)。Skylake と同じ設計だが、写真は左右が逆(左に I/O・コア、右に GPU)
    'kbl-4c': tf([106, 0, 1085, 650], { p: 4, e: 0, lp: 0 },
      [[305, 45, 158, 255], [305, 385, 158, 255], [510, 45, 158, 255], [510, 385, 158, 255]], [], [],
      [[283, 45, 22, 595, 1], [465, 45, 45, 595, 2], [668, 45, 24, 595, 1]], [
        ['io-t', `I/O・PHY(上辺${UNK})`, 'u', 110, 3, 975, 40], ['io-l', `I/O(左辺${UNK})`, 'u', 110, 48, 172, 592], ...ringCols([305, 510], 158, 300, 85, `コア間のリング・L2 まわり(中段${UNK})`),
        ['sa', `System Agent・メディア(コアと GPU の間${UNK})`, 'u', 694, 48, 135, 592], ['gpu', 'GPU(内蔵 GT2。右側の大きな領域)', 'g', 830, 48, 255, 592]]),
    // Coffee Lake 6 コア(Intel_Core_i7_Gen8_(Coffee_Lake-S_14nm).jpg 3213×1758)。左に GPU、3 列 × 上下 2 段のコア、右に System Agent
    'cfl-6c': tf([0, 0, 1191, 651], { p: 6, e: 0, lp: 0 },
      colRows([415, 627, 830], 153, 10, 252, 350, 248), [], [],
      [[396, 10, 19, 588, 1], [570, 10, 55, 588, 2], [782, 10, 46, 588, 2], [985, 10, 25, 588, 1]], [
        ['gpu', 'GPU(内蔵 GT2。左側の大きな領域)', 'g', 8, 8, 386, 590], ...ringCols([415, 627, 830], 153, 262, 86, `コア間のリング(中段${UNK})`), ['sa', `System Agent・I/O(右側${UNK})`, 'u', 1012, 10, 175, 590],
        ['phy-b', `メモリ・I/O の PHY(下辺${UNK})`, 'u', 8, 602, 1180, 46]]),
    // Coffee Lake Refresh 8 コア(Intel-9th-Gen-Core.jpg 1935×906)。左に GPU、4 列 × 上下 2 段のコア、右に System Agent
    'cfl-8c': tf([0, 57, 1489, 754], { p: 8, e: 0, lp: 0 },
      colRows([440, 660, 885, 1100], 170, 70, 275, 430, 275), [], [],
      [[415, 70, 25, 635, 1], [612, 70, 46, 635, 2], [832, 70, 51, 635, 2], [1057, 70, 41, 635, 2], [1272, 70, 28, 635, 1]], [
        ['gpu', 'GPU(内蔵 GT2。左側の大きな領域)', 'g', 2, 70, 410, 636], ...ringCols([440, 660, 885, 1100], 170, 345, 85, `コア間のリング(中段${UNK})`), ['sa', `System Agent・I/O(右側${UNK})`, 'u', 1302, 70, 185, 636],
        ['phy-b', `メモリ・I/O の PHY(下辺${UNK})`, 'u', 2, 710, 1485, 44]]),
    // Comet Lake 10 コア(Intel_Core_i7_Gen10_(Comet_Lake-S_14nm).jpg 4880×2040)。左に GPU、5 列 × 上下 2 段のコア、右に System Agent
    'cml-10c': tf([0, 76, 1191, 574], { p: 10, e: 0, lp: 0 },
      colRows([315, 468, 620, 772, 922], 115, 90, 190, 338, 188), [], [],
      [[297, 88, 18, 437, 1], [432, 88, 34, 437, 2], [585, 88, 33, 437, 2], [737, 88, 33, 437, 2], [890, 88, 30, 437, 2], [1038, 88, 17, 437, 1]], [
        ['gpu', 'GPU(内蔵 GT2。左側の大きな領域)', 'g', 8, 88, 287, 437], ...ringCols([315, 468, 620, 772, 922], 115, 280, 56, `コア間のリング(中段${UNK})`), ['sa', `System Agent・I/O(右側${UNK})`, 'u', 1057, 88, 128, 437],
        ['phy-b', `メモリ・I/O の PHY(下辺${UNK})`, 'u', 8, 528, 1177, 44]]),
    // 2026-11-18 追加(第1・第3・第5世代)。座標は写真の表示ピクセルの目測(±5〜10%)
    // Nehalem Lynnfield 4 コア(Intel_nehalem_lynfield_die_shot.jpg 2196×1351)。上辺に I/O、4 つのコア(上段)、中央に Uncore、下段に L3(左右 2 つの大きな領域)、右に PCIe・DMI など
    'nhm-lyn-4c': tf([0, 0, 1154, 710], { p: 4, e: 0, lp: 0 },
      [[62, 96, 201, 372], [267, 96, 196, 372], [569, 96, 197, 372], [770, 96, 196, 372]], [], [],
      [[66, 480, 396, 220], [568, 480, 396, 220]], [
        ['io-t', `I/O・PHY(上辺${UNK})`, 'u', 5, 8, 1015, 84], ['io-l', `I/O(左端${UNK})`, 'u', 5, 95, 55, 605], ['unc', `Uncore(中央の縦帯。メモリコントローラ・QPI など${UNK})`, 'u', 466, 95, 100, 605],
        ['io-r', `PCIe・DMI・I/O(右側${UNK})`, 'u', 970, 95, 180, 605], ['io-tr', `I/O(右上${UNK})`, 'u', 1022, 8, 128, 84]]),
    // Westmere(Gulftown)6 コア(Intel-xeon_5600-westmere-die-6-core-intel_in_deutschland.jpg 3226×1724)。上段に L3(左右 2 つ)、その下に 6 つのコア、中央に Uncore、下段に I/O
    'wsm-6c': tf([0, 0, 1154, 617], { p: 6, e: 0, lp: 0 },
      [[62, 192, 160, 308], [226, 192, 160, 308], [386, 192, 158, 308], [616, 192, 160, 308], [776, 192, 160, 308], [936, 192, 162, 308]], [], [],
      [[62, 10, 482, 176], [618, 10, 480, 176]], [
        ['unc', `Uncore(中央の縦帯。メモリコントローラ・QPI など${UNK})`, 'u', 547, 8, 68, 602], ['io-l', `I/O(左端${UNK})`, 'u', 5, 8, 55, 492], ['io-r', `I/O(右端${UNK})`, 'u', 1100, 8, 50, 492],
        ['io-bl', `I/O・PHY(下段左${UNK})`, 'u', 5, 503, 540, 107], ['io-br', `I/O・PHY(下段右${UNK})`, 'u', 618, 503, 532, 107]]),
    // Ivy Bridge 4 コア GT2(Ivy_bridge_die_(quad-core).jpg 800×336)。左に GPU(EU 16 基が左端に 2 段)、4 つのコア(上)と各コアの下の L3 スライス、右に System Agent・I/O
    'ivb-4c': tf([0, 0, 1154, 485], { p: 4, e: 0, lp: 0 },
      [[389, 8, 148, 267], [539, 8, 148, 267], [690, 8, 146, 267], [839, 8, 145, 267]], [], [],
      [[357, 282, 180, 136], [538, 282, 150, 136], [689, 282, 148, 136], [838, 282, 147, 136]], [
        ['gpu', 'GPU(内蔵 GT2。左側の大きな領域)', 'g', 8, 8, 347, 410], ['sa', `System Agent(右側${UNK})`, 'u', 987, 8, 90, 412], ['io-r', `I/O・PHY(右端${UNK})`, 'u', 1080, 8, 72, 414],
        ['phy-b', `メモリ・I/O の PHY(下辺${UNK})`, 'u', 38, 424, 1040, 59], ['io-bl', `I/O(左下${UNK})`, 'u', 6, 424, 30, 58]]),
    // Broadwell-H 4 コア GT3e(Intel_Core_i7_Gen5_(Broadwell-H_QC_GT3e_14nm).jpg 1097×976)。上段に「L3 スライス(上)+ コア(下)」×4、左右に System Agent・I/O、下半分に GPU(GT3e の大きな領域)
    'bdw-4c': tf([0, 0, 1154, 1027], { p: 4, e: 0, lp: 0 },
      [[270, 195, 145, 305], [420, 195, 158, 305], [595, 195, 145, 305], [748, 195, 157, 305]], [], [],
      [[270, 55, 145, 135], [420, 55, 158, 135], [595, 55, 145, 135], [748, 55, 157, 135]], [
        ['io-t', `I/O・PHY(上辺${UNK})`, 'u', 145, 8, 935, 42], ['sa-l', `System Agent・I/O(左側${UNK})`, 'u', 8, 55, 258, 445], ['sa-r', `System Agent・I/O(右側${UNK})`, 'u', 915, 55, 235, 445],
        ['gpu', 'GPU(内蔵 GT3e。下半分の大きな領域)', 'g', 8, 505, 970, 515], ['io-br', `I/O・eDRAM 接続など(右下${UNK})`, 'u', 982, 505, 168, 515]]),
    // 2026-11-18 追加(Core 2 世代。ユーザー指示「core2も追加してください」)。L3 はなく(cfg.l3MB 0)、共有 L2 は飾り(deco)で置く。座標は写真の表示ピクセル(スクリーンショット座標)の目測(±5〜10%)
    // Wolfdale 2 コア(Intel_Core_2_Quad_(Yorkfield_45nm).jpg 4322×3083 の左のダイ。写真は 2 ダイの横並びで、box は左のダイだけ)。上辺に I/O・PLL、2 つのコア(上段)、下半分に共有 L2 6MB、左右に FSB・I/O
    'wlf-2c': tf([175, 0, 745, 812], { p: 2, e: 0, lp: 0 },
      [[215, 60, 238, 338], [459, 60, 238, 338]], [], [], null, [
        ['io-t', `I/O・PLL(上辺${UNK})`, 'u', 185, 5, 550, 52], ['io-l', `FSB・I/O(左端${UNK})`, 'u', 180, 60, 33, 338], ['io-r', `FSB・I/O(右端${UNK})`, 'u', 700, 60, 40, 338],
        ['l2', 'L2 キャッシュ(2 コアで共有 6MB。下半分の大きな領域)', 'u', 256, 402, 409, 400], ['l2-l', `L2 まわりの回路・I/O(下段左${UNK})`, 'u', 180, 402, 74, 405], ['l2-r', `L2 まわりの回路・I/O(下段右${UNK})`, 'u', 667, 402, 73, 405]]),
    // Yorkfield 4 コア(同じ写真の全体。Wolfdale 2 つの MCM を 1 つの枠として扱う)。左のダイのコア 2 + 右のダイのコア 2、各ダイの下半分に共有 L2 6MB
    'yfd-4c': tf([175, 0, 1314, 812], { p: 4, e: 0, lp: 0 },
      [[215, 60, 238, 338], [459, 60, 238, 338], [785, 60, 238, 338], [1029, 60, 238, 338]], [], [], null, [
        ['io-t', `I/O・PLL(左のダイの上辺${UNK})`, 'u', 185, 5, 550, 52], ['io-l', `FSB・I/O(左のダイの左端${UNK})`, 'u', 180, 60, 33, 338], ['io-r', `FSB・I/O(左のダイの右端${UNK})`, 'u', 700, 60, 40, 338],
        ['l2', 'L2 キャッシュ(左のダイ。2 コアで共有 6MB。下半分の大きな領域)', 'u', 256, 402, 409, 400], ['l2-l', `L2 まわりの回路・I/O(左のダイの下段左${UNK})`, 'u', 180, 402, 74, 405], ['l2-r', `L2 まわりの回路・I/O(左のダイの下段右${UNK})`, 'u', 667, 402, 73, 405],
        ['io-t2', `I/O・PLL(右のダイの上辺${UNK})`, 'u', 755, 5, 550, 52], ['io-l2', `FSB・I/O(右のダイの左端${UNK})`, 'u', 750, 60, 33, 338], ['io-r2', `FSB・I/O(右のダイの右端${UNK})`, 'u', 1270, 60, 40, 338],
        ['l2b', 'L2 キャッシュ(右のダイ。2 コアで共有 6MB。下半分の大きな領域)', 'u', 826, 402, 409, 400], ['l2-lb', `L2 まわりの回路・I/O(右のダイの下段左${UNK})`, 'u', 750, 402, 74, 405], ['l2-rb', `L2 まわりの回路・I/O(右のダイの下段右${UNK})`, 'u', 1237, 402, 73, 405]]),
    // 2026-11-18 追加(Pentium III 〜 Core 2 の 65nm。ユーザー指示「ペン3まで作ってください。ダイショットも取得して」)。L3 はなく(cfg.l3MB 0)、L2 は飾り(deco)で置く。座標は写真の表示ピクセル(スクリーンショット座標)の目測(±5〜10%)
    // Pentium III Coppermine(Intel_Pentium_3_(Coppermine_180nm).jpg 3140×2636)。左に L2 256KB の大きな領域、右にコア
    'cmn-1c': tf([262, 0, 1228, 812], { p: 1, e: 0, lp: 0 },
      [[662, 28, 546, 760]], [], [], null, [
        ['l2', 'L2 キャッシュ(256KB。左側の大きな領域)', 'u', 288, 158, 345, 625], ['bus-t', `バスインターフェース・I/O(左上${UNK})`, 'u', 290, 25, 348, 130],
        ['io-t', `I/O(上辺${UNK})`, 'u', 270, 5, 940, 18], ['io-b', `I/O(下辺${UNK})`, 'u', 270, 790, 940, 20]]),
    // Pentium III Tualatin(Intel_Pentium_3_(Tualatin_130nm).png 1878×1200)。左に L2 の大きな領域、右にコア
    'tlt-1c': tf([108, 0, 1380, 812], { p: 1, e: 0, lp: 0 },
      [[818, 35, 528, 740]], [], [], null, [
        ['l2', 'L2 キャッシュ(左側の大きな領域)', 'u', 145, 160, 640, 615], ['bus-t', `バスインターフェース・I/O(左上${UNK})`, 'u', 145, 35, 655, 122],
        ['io-t', `I/O(上辺${UNK})`, 'u', 150, 5, 1230, 25], ['io-b', `I/O(下辺${UNK})`, 'u', 150, 780, 1230, 25]]),
    // Pentium 4 Willamette(Intel_Pentium_4_(Willamette_180nm).jpg 2272×2000)。上にコア(トレースキャッシュなど)、下段に L2 256KB(左右 2 つの配列)とバス
    'wlm-1c': tf([283, 0, 1206, 812], { p: 1, e: 0, lp: 0 },
      [[290, 20, 915, 570]], [], [], null, [
        ['l2a', 'L2 キャッシュ(下段左)', 'u', 316, 607, 190, 172], ['l2c', `L2 の制御(下段中央${UNK})`, 'u', 508, 607, 203, 172], ['l2b', 'L2 キャッシュ(下段右)', 'u', 713, 607, 180, 172],
        ['bus', `バスインターフェース(下段右端${UNK})`, 'u', 900, 605, 300, 175]]),
    // Pentium 4 Northwood(Intel_Pentium_4_(Northwood_130nm).png 1792×1784)。上にコア、下段に L2 512KB(左右 2 つの配列)とバス
    'nwd-1c': tf([336, 0, 1152, 812], { p: 1, e: 0, lp: 0 },
      [[345, 40, 800, 490]], [], [], null, [
        ['l2a', 'L2 キャッシュ(下段左)', 'u', 376, 543, 150, 238], ['l2c', `L2 の制御(下段中央${UNK})`, 'u', 528, 543, 196, 238], ['l2b', 'L2 キャッシュ(下段右)', 'u', 725, 543, 150, 238],
        ['bus', `バスインターフェース(下段右端${UNK})`, 'u', 885, 545, 262, 235]]),
    // Pentium 4 Prescott 1MB(Intel_Pentium_4_(Prescott-1M_G1_90nm).jpg 2648×2544)。上にコア、下段に L2 1MB の大きな配列、右下にバス
    'prs-1c': tf([322, 0, 1167, 812], { p: 1, e: 0, lp: 0 },
      [[330, 47, 830, 510]], [], [], null, [
        ['io-t', `I/O(上辺${UNK})`, 'u', 330, 8, 830, 36], ['l2', 'L2 キャッシュ(1MB。下段の大きな領域)', 'u', 350, 563, 690, 215], ['bus', `バスインターフェース(右下${UNK})`, 'u', 1042, 565, 118, 215],
        ['io-b', `I/O(下辺${UNK})`, 'u', 330, 780, 830, 28]]),
    // Cedar Mill(Prescott-2M の写真。Intel_Pentium_4_(Prescott-2M_N0_90nm).jpg 3170×2649 を代用)。左に L2 2MB の大きな領域、右にコア
    'cdm-1c': tf([258, 0, 1230, 812], { p: 1, e: 0, lp: 0 },
      [[695, 10, 495, 785]], [], [], null, [
        ['l2', 'L2 キャッシュ(2MB。左側の大きな領域)', 'u', 298, 25, 392, 662], ['l2-b', `L2 まわりの回路(下段左${UNK})`, 'u', 298, 692, 392, 100], ['io-l', `I/O(左端${UNK})`, 'u', 262, 8, 34, 790]]),
    // Presler(Cedar Mill の写真を 2 つ並べた。2 つのダイの MCM)
    'prl-2c': tf([258, 0, 2202, 812], { p: 2, e: 0, lp: 0 },
      [[695, 10, 495, 785], [1667, 10, 495, 785]], [], [], null, [
        ['l2', 'L2 キャッシュ(左のダイ。2MB)', 'u', 298, 25, 392, 662], ['l2-b', `L2 まわりの回路(左のダイの下段${UNK})`, 'u', 298, 692, 392, 100], ['io-l', `I/O(左のダイの左端${UNK})`, 'u', 262, 8, 34, 790],
        ['l2b', 'L2 キャッシュ(右のダイ。2MB)', 'u', 1270, 25, 392, 662], ['l2-bb', `L2 まわりの回路(右のダイの下段${UNK})`, 'u', 1270, 692, 392, 100], ['io-lb', `I/O(右のダイの左端${UNK})`, 'u', 1234, 8, 34, 790]]),
    // Pentium D Smithfield(Intel_Pentium_D_(Smithfield_90nm).jpg 2503×1200)。1 つのダイに 2 つのコア(左右)。各コアの下に L2 1MB
    'smf-2c': tf([0, 49, 1489, 763], { p: 2, e: 0, lp: 0 },
      [[18, 62, 718, 480], [758, 62, 718, 480]], [], [], null, [
        ['l2', 'L2 キャッシュ(左のコア。1MB)', 'u', 18, 545, 640, 178], ['l2b', 'L2 キャッシュ(右のコア。1MB)', 'u', 758, 545, 620, 178],
        ['bus', `バスインターフェース(左のコアの下段右端${UNK})`, 'u', 660, 545, 76, 178], ['busb', `バスインターフェース(右のコアの下段右端${UNK})`, 'u', 1380, 545, 98, 178],
        ['io-b', `I/O(下辺・左${UNK})`, 'u', 18, 725, 718, 32], ['io-bb', `I/O(下辺・右${UNK})`, 'u', 758, 725, 718, 32]]),
    // Pentium M Banias(Intel_Pentium_M_(Banias_130nm).jpg 1600×1198)。左に L2 1MB の大きな領域、右にコア
    'bns-1c': tf([202, 0, 1287, 812], { p: 1, e: 0, lp: 0 },
      [[650, 38, 622, 740]], [], [], null, [
        ['l2', 'L2 キャッシュ(1MB。左側の大きな領域)', 'u', 217, 38, 425, 735], ['io-t', `I/O(上辺${UNK})`, 'u', 217, 15, 1050, 22], ['io-b', `I/O(下辺${UNK})`, 'u', 217, 775, 1050, 30]]),
    // Pentium M Dothan(Intel の報道用写真。Intel-Dothan_(…)-intel-newsroom.jpg 1599×875。左端が切れた拡大の写真)。左に L2 2MB の大きな領域、右にコア
    'dth-1c': tf([2, 0, 1489, 812], { p: 1, e: 0, lp: 0 },
      [[838, 38, 615, 740]], [], [], null, [
        ['l2', 'L2 キャッシュ(2MB。左側の大きな領域)', 'u', 4, 62, 828, 722], ['io-t', `I/O(上辺${UNK})`, 'u', 4, 3, 830, 56], ['io-b', `I/O(下辺${UNK})`, 'u', 4, 786, 1450, 24]]),
    // Core Duo Yonah(Intel_Core_Duo_(Yonah_65nm).jpg 1110×820)。上段に 2 つのコア(左右対称)、中央に共有のバス、下段に共有 L2 2MB
    'yna-2c': tf([206, 9, 1282, 802], { p: 2, e: 0, lp: 0 },
      [[262, 15, 395, 470], [832, 15, 395, 470]], [], [], null, [
        ['bus-c', `共有のバスインターフェース(中央${UNK})`, 'u', 660, 15, 170, 470], ['l2', 'L2 キャッシュ(2 コアで共有 2MB。下段の大きな領域)', 'u', 268, 492, 892, 298],
        ['l2-r', `L2 まわりの回路(下段右端${UNK})`, 'u', 1162, 492, 64, 298], ['io-l', `I/O(左端${UNK})`, 'u', 208, 12, 52, 780], ['io-r', `I/O(右端${UNK})`, 'u', 1228, 12, 52, 780]]),
    // Core 2 Duo Conroe(Intel_Core_2_Duo_(Conroe_G0_65nm).jpg 3574×2722)。左に共有 L2 4MB の大きな領域、右に上下 2 つのコア
    'cnr-2c': tf([211, 0, 1277, 812], { p: 2, e: 0, lp: 0 },
      [[695, 48, 578, 350], [695, 415, 578, 345]], [], [], null, [
        ['l2', 'L2 キャッシュ(2 コアで共有 4MB。左側の大きな領域)', 'u', 215, 62, 475, 698], ['io-t', `バス・I/O(上辺${UNK})`, 'u', 215, 5, 1060, 40], ['io-b', `バス・I/O(下辺${UNK})`, 'u', 215, 762, 1060, 48]]),
    // Core 2 Quad Kentsfield(Intel_Core_2_Quad_(Kentsfield_65nm).png 1674×1102)。Conroe 2 つの MCM。各ダイの上段に 2 コア、下段に共有 L2 4MB
    'kts-4c': tf([127, 0, 1362, 812], { p: 4, e: 0, lp: 0 },
      [[165, 10, 270, 425], [440, 10, 268, 425], [783, 10, 270, 425], [1058, 10, 268, 425]], [], [], null, [
        ['l2', 'L2 キャッシュ(左のダイ。2 コアで共有 4MB)', 'u', 172, 448, 536, 358], ['l2-l', `L2 まわりの回路(左のダイの下段左${UNK})`, 'u', 130, 628, 42, 180], ['l2-r', `L2 まわりの回路(左のダイの下段右${UNK})`, 'u', 710, 628, 34, 180],
        ['io-l', `FSB・I/O(左のダイの左端${UNK})`, 'u', 130, 10, 33, 615], ['io-r', `FSB・I/O(左のダイの右端${UNK})`, 'u', 712, 10, 32, 615],
        ['l2b', 'L2 キャッシュ(右のダイ。2 コアで共有 4MB)', 'u', 790, 448, 536, 358], ['l2-lb', `L2 まわりの回路(右のダイの下段左${UNK})`, 'u', 748, 628, 42, 180], ['l2-rb', `L2 まわりの回路(右のダイの下段右${UNK})`, 'u', 1328, 628, 34, 180],
        ['io-lb', `FSB・I/O(右のダイの左端${UNK})`, 'u', 748, 10, 33, 615], ['io-rb', `FSB・I/O(右のダイの右端${UNK})`, 'u', 1330, 10, 32, 615]]),
    // Pentium III Katmai(Intel@250nm@P6@Katmai@Pentium III@SL35D DSCx1 polysilicon microscope stitched@5x.jpg 5736×6817。Fritzchens Fritz。CC0)。コアのロジックと L1 だけ(L2 は別チップ)
    'ktm-1c': tf([200, 0, 837, 757], { p: 1, e: 0, lp: 0 },
      [[232, 30, 573, 695]], [], [], null, [
        ['io-l', `I/O(左端${UNK})`, 'u', 203, 5, 27, 745], ['io-r', `I/O(右端${UNK})`, 'u', 808, 5, 28, 745], ['io-t', `I/O(上辺${UNK})`, 'u', 232, 4, 573, 24], ['io-b', `I/O(下辺${UNK})`, 'u', 232, 728, 573, 26]]),
    // Alder Lake-S H0(6P。i5-12400F の写真。Intel@intel7(10nmESF)@AlderLake@ADL-S(6P+0E)@i5-12400F@SRL5Z DSCx10 poly@5xExt.jpg 13419×8843。Fritzchens Fritz。CC0)。右に GPU、3 列 × 上下 2 段の P コア、列ごとの L2 と中段の L3
    'adl-6p': tf([4, 41, 1033, 718], { p: 6, e: 0, lp: 0 },
      [[318, 88, 144, 220], [468, 88, 144, 220], [618, 88, 145, 220], [318, 492, 144, 216], [468, 492, 144, 216], [618, 492, 145, 216]], [], [],
      [[318, 365, 144, 72, 1], [468, 365, 144, 72, 1], [618, 365, 145, 72, 1]], [
        ['l2a', 'L2 キャッシュ(上段。コアごと 1.25MB)', 'u', 318, 310, 445, 52], ['l2b', 'L2 キャッシュ(下段。コアごと 1.25MB)', 'u', 318, 440, 445, 50],
        ['sa', `System Agent・メモリコントローラ・I/O(左側の大きな領域${UNK})`, 'u', 8, 88, 305, 620], ['io-t', `I/O(上辺${UNK})`, 'u', 8, 45, 860, 40], ['io-tr', `I/O(右上${UNK})`, 'u', 872, 45, 158, 43],
        ['gpu', 'GPU(内蔵。右側の大きな領域)', 'g', 792, 90, 238, 615]]),
  };

  // ---- AMD の Ryzen より前(2026-11-19。happytrees.org/dieshots の写真。座標は写真をブラウザで開いた画面の座標) ----
  const AMD_OLD_FRAMES = {
    // Athlon XP Barton(写真 1024×561。Martijn Boer。パブリックドメイン)。左にコア、右に L2 512KB
    'brt-1c': tf([8, 98, 1030, 660], { p: 1, e: 0, lp: 0 },
      [[47, 135, 603, 487]], [], [], null, [
        ['l2', 'L2 キャッシュ(512KB。右側の大きな領域)', 'u', 656, 135, 334, 490], ['io-t', `I/O(上辺${UNK})`, 'u', 50, 100, 940, 33], ['io-b', `I/O(下辺${UNK})`, 'u', 50, 626, 940, 32],
        ['io-l', `I/O(左端${UNK})`, 'u', 10, 100, 36, 558], ['io-r', `I/O(右端${UNK})`, 'u', 992, 100, 38, 558]]),
    // Athlon 64 Venice(AMD_Athlon64_Venice_ADA3400DAA4BY.jpg 2048×1815。Fritzchens Fritz。パブリックドメイン)。左にコア、右に L2 512KB(赤)、下段にメモリコントローラ・HyperTransport
    'vnc-1c': tf([91, 0, 945, 757], { p: 1, e: 0, lp: 0 },
      [[140, 64, 445, 532]], [], [], null, [
        ['l2', 'L2 キャッシュ(512KB。右側の赤い大きな領域)', 'u', 592, 68, 268, 614], ['mc', `メモリコントローラ・HyperTransport(下段${UNK})`, 'u', 185, 600, 400, 85],
        ['io-t', `I/O(上辺${UNK})`, 'u', 135, 15, 725, 45], ['io-b', `I/O(下辺${UNK})`, 'u', 185, 688, 675, 56], ['io-r', `I/O(右端${UNK})`, 'u', 864, 15, 64, 730], ['io-l', `I/O(左端${UNK})`, 'u', 104, 15, 31, 730]]),
    // Phenom X4 Agena(AMD_Phenom_Agena_HD9750WCJ4BGH.jpg 2048×1939。Fritzchens Fritz。パブリックドメイン)。2×2 のコア、中央の列に各コアの L2、中央の帯に L3 2MB・クロスバー
    'agn-4c': tf([118, 0, 918, 757], { p: 4, e: 0, lp: 0 },
      [[262, 55, 205, 278], [630, 55, 220, 278], [262, 428, 205, 275], [630, 428, 220, 275]], [], [],
      [[290, 342, 260, 70, 1], [556, 342, 265, 70, 1]], [
        ['l2a', 'L2 キャッシュ(左上のコア。512KB)', 'u', 472, 68, 72, 262], ['l2b', 'L2 キャッシュ(右上のコア。512KB)', 'u', 556, 68, 72, 262], ['l2c', 'L2 キャッシュ(左下のコア。512KB)', 'u', 472, 432, 72, 258], ['l2d', 'L2 キャッシュ(右下のコア。512KB)', 'u', 556, 432, 72, 258],
        ['io-l', `メモリ・I/O の PHY(左端${UNK})`, 'u', 122, 5, 135, 745], ['io-r', `I/O(右端${UNK})`, 'u', 855, 5, 62, 745], ['io-t', `I/O(上辺${UNK})`, 'u', 260, 5, 590, 45], ['io-b', `I/O(下辺${UNK})`, 'u', 260, 705, 590, 45]]),
    // Phenom II X4 Deneb(AMD_Phenom_II_X4_(Deneb_45nm).jpg 2078×1612。AMD 著作と表記)。左に 2×2 のコアと各コアの L2、右に L3 6MB、中央の帯にクロスバー
    'dnb-4c': tf([30, 0, 1006, 757], { p: 4, e: 0, lp: 0 },
      [[120, 82, 185, 243], [455, 82, 185, 243], [120, 432, 185, 250], [455, 432, 185, 250]], [], [],
      [[648, 85, 280, 250, 2], [648, 430, 280, 250, 2], [715, 22, 278, 60, 1], [715, 682, 278, 60, 1]], [
        ['l2a', 'L2 キャッシュ(左上のコア。512KB)', 'u', 308, 82, 66, 235], ['l2b', 'L2 キャッシュ(右上のコア。512KB)', 'u', 386, 82, 66, 235], ['l2c', 'L2 キャッシュ(左下のコア。512KB)', 'u', 308, 452, 66, 230], ['l2d', 'L2 キャッシュ(右下のコア。512KB)', 'u', 386, 452, 66, 230],
        ['xbar', `クロスバー・メモリコントローラ(中央の帯${UNK})`, 'u', 120, 336, 808, 92], ['io-l', `I/O(左端${UNK})`, 'u', 45, 20, 60, 725], ['io-t', `I/O(上辺${UNK})`, 'u', 110, 22, 535, 55], ['io-b', `I/O(下辺${UNK})`, 'u', 110, 688, 530, 60],
        ['io-r', `I/O(右側の帯${UNK})`, 'u', 932, 160, 62, 440]]),
    // Phenom II X6 Thuban(AMD_Phenom_II_X6_(Thuban_45nm).jpg 3128×2272)。上下 3 コアずつ、各コアの L2、右に L3 6MB、中央の帯にクロスバー
    'thb-6c': tf([0, 3, 1036, 755], { p: 6, e: 0, lp: 0 },
      [[68, 110, 172, 225], [308, 92, 166, 230], [598, 92, 148, 230], [68, 432, 172, 225], [308, 452, 166, 230], [598, 452, 148, 230]], [], [],
      [[748, 12, 272, 240, 2], [772, 252, 195, 85, 1], [772, 425, 195, 92, 1], [748, 518, 272, 235, 2]], [
        ['l2a', 'L2 キャッシュ(左上のコア。512KB)', 'u', 243, 112, 57, 205], ['l2b', 'L2 キャッシュ(中上のコア。512KB)', 'u', 476, 92, 58, 205], ['l2c', 'L2 キャッシュ(右上のコア。512KB)', 'u', 536, 92, 58, 205],
        ['l2d', 'L2 キャッシュ(左下のコア。512KB)', 'u', 243, 445, 57, 205], ['l2e', 'L2 キャッシュ(中下のコア。512KB)', 'u', 476, 468, 58, 210], ['l2f', 'L2 キャッシュ(右下のコア。512KB)', 'u', 536, 468, 58, 210],
        ['xbar', `クロスバー・メモリコントローラ(中央の帯${UNK})`, 'u', 70, 338, 690, 88], ['io-l', `I/O(左端${UNK})`, 'u', 12, 55, 52, 650], ['io-t', `I/O(上辺${UNK})`, 'u', 205, 18, 535, 60], ['io-b', `I/O(下辺${UNK})`, 'u', 210, 690, 535, 55],
        ['io-r', `I/O(右側の帯${UNK})`, 'u', 970, 255, 50, 262]]),
    // FX-8150 Zambezi(AMD_FX-8150_(Bulldozer,_Zambezi_32nm).jpg 2705×2199)。四隅に 4 つのモジュール(左に整数コアのロジック、横に L2 2MB)、中段に L3 の帯 4 本
    'zmb-8c': tf([52, 0, 984, 757], { p: 8, e: 0, lp: 0 },
      [[105, 54, 223, 88], [105, 142, 223, 90], [672, 50, 222, 90], [672, 140, 222, 88], [105, 532, 223, 85], [105, 617, 223, 87], [672, 518, 222, 92], [672, 610, 222, 93]], [], [],
      [[105, 270, 360, 62, 1], [105, 428, 360, 62, 1], [533, 264, 360, 60, 1], [533, 435, 360, 60, 1]], [
        ['l2a', 'L2 キャッシュ(左上のモジュール。2MB。2 コアで共有)', 'u', 332, 52, 158, 172], ['l2b', 'L2 キャッシュ(右上のモジュール。2MB。2 コアで共有)', 'u', 510, 48, 157, 170],
        ['l2c', 'L2 キャッシュ(左下のモジュール。2MB。2 コアで共有)', 'u', 332, 538, 158, 166], ['l2d', 'L2 キャッシュ(右下のモジュール。2MB。2 コアで共有)', 'u', 510, 542, 157, 166],
        ['nb-l', `クロスバー・メモリコントローラ(中央左${UNK})`, 'u', 103, 335, 394, 92], ['nb-r', `クロスバー・メモリコントローラ(中央右${UNK})`, 'u', 505, 326, 392, 106],
        ['io-r', `I/O(右端の帯${UNK})`, 'u', 918, 10, 64, 735], ['io-l', `I/O(左端${UNK})`, 'u', 56, 10, 45, 735], ['io-t', `I/O(上辺${UNK})`, 'u', 105, 2, 790, 45], ['io-b', `I/O(下辺${UNK})`, 'u', 105, 712, 790, 40]]),
    // FX-8350 Vishera(AMD_FX-8350_(Vishera_32nm).jpg 3475×2795)。Zambezi と同じ 4 モジュールの配置(写真は注釈用の着色)
    'vsh-8c': tf([48, 0, 989, 757], { p: 8, e: 0, lp: 0 },
      [[138, 45, 230, 100], [138, 145, 230, 100], [712, 50, 225, 98], [712, 148, 225, 97], [138, 515, 230, 99], [138, 614, 230, 99], [712, 510, 225, 100], [712, 610, 225, 100]], [], [],
      [[138, 262, 360, 62, 1], [138, 435, 360, 62, 1], [640, 270, 295, 62, 1], [640, 430, 295, 62, 1]], [
        ['l2a', 'L2 キャッシュ(左上のモジュール。2MB。2 コアで共有)', 'u', 368, 45, 160, 170], ['l2b', 'L2 キャッシュ(右上のモジュール。2MB。2 コアで共有)', 'u', 548, 50, 160, 165],
        ['l2c', 'L2 キャッシュ(左下のモジュール。2MB。2 コアで共有)', 'u', 368, 545, 160, 165], ['l2d', 'L2 キャッシュ(右下のモジュール。2MB。2 コアで共有)', 'u', 548, 540, 160, 170],
        ['nb-l', `クロスバー・メモリコントローラ(中央左${UNK})`, 'u', 148, 350, 375, 60], ['nb-r', `クロスバー・メモリコントローラ(中央右${UNK})`, 'u', 540, 336, 395, 92],
        ['io-l', `I/O(左端の帯${UNK})`, 'u', 52, 10, 78, 740], ['io-r', `I/O(右端${UNK})`, 'u', 958, 10, 28, 740], ['io-t', `I/O(上辺${UNK})`, 'u', 138, 2, 820, 40], ['io-b', `I/O(下辺${UNK})`, 'u', 138, 716, 820, 40]]),
    // A10 Trinity(AMD_A10_APU_(Trinity_32nm).jpg 2695×1973)。左に GPU の大きな領域、右に 2 モジュール(各モジュールは 2 コアのロジック + 下に L2 2MB)。写真は注釈用の着色
    'trn-4c': tf([1, 0, 1035, 757], { p: 4, e: 0, lp: 0 },
      [[505, 112, 118, 265], [623, 112, 118, 265], [787, 112, 110, 265], [897, 112, 108, 265]], [], [], null, [
        ['gpu', 'GPU(内蔵。左側の大きな領域)', 'g', 5, 5, 490, 660], ['l2a', 'L2 キャッシュ(左のモジュール。2MB。2 コアで共有)', 'u', 505, 385, 235, 185], ['l2b', 'L2 キャッシュ(右のモジュール。2MB。2 コアで共有)', 'u', 820, 385, 185, 185],
        ['mid', `モジュール間の通路・クロスバー(中央${UNK})`, 'u', 745, 100, 40, 360], ['nb', `メモリコントローラ・ノースブリッジ(中央下${UNK})`, 'u', 742, 465, 52, 125],
        ['io-t', `I/O(上辺${UNK})`, 'u', 500, 5, 530, 95], ['io-b', `I/O(下辺${UNK})`, 'u', 245, 670, 785, 82], ['io-r', `ディスプレイ・I/O(右下${UNK})`, 'u', 800, 575, 235, 95]]),
    // E-450 Zacate(AMD_E-450_APU_(Zacate,_Ontario_40nm).jpg 2051×1821)。E-350 と同じ 2 コアのダイ。左の列に 2 つのコアと各コアの L2、中央は GPU、右端に DDR3 の PHY。コアの位置は目測の推定
    'zct-2c': tf([92, 0, 945, 757], { p: 2, e: 0, lp: 0 },
      [[103, 172, 192, 205], [103, 380, 192, 205]], [], [], null, [
        ['l2a', 'L2 キャッシュ(上のコア。512KB)', 'u', 103, 20, 192, 148], ['l2b', 'L2 キャッシュ(下のコア。512KB)', 'u', 103, 590, 192, 148],
        ['gpu', 'GPU(内蔵。中央の大きな領域)', 'g', 300, 60, 535, 545], ['io-r', `DDR3 の PHY・I/O(右端${UNK})`, 'u', 838, 15, 98, 725], ['io-b', `ディスプレイ・UVD・I/O(下段${UNK})`, 'u', 300, 610, 535, 135]]),
    // Athlon Thunderbird(AMD@180nm@K7@Thunderbird(Model4 CPUID642)@AMD Athlon A0800MPR24B A DSCx07 poly@5xBF.jpg 11376×7866。Fritzchens Fritz。CC0)。左に L2 256KB、右にコア
    'tbd-1c': tf([0, 21, 1036, 737], { p: 1, e: 0, lp: 0 },
      [[232, 68, 795, 622]], [], [], null, [
        ['l2', 'L2 キャッシュ(256KB。左側の大きな領域)', 'u', 14, 65, 213, 628], ['io-t', `I/O(上辺${UNK})`, 'u', 14, 26, 1010, 38], ['io-b', `I/O(下辺${UNK})`, 'u', 14, 695, 1010, 38]]),
  };
  Object.assign(TILE_FRAMES, INTEL_OLD_FRAMES, AMD_OLD_FRAMES);
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
  Object.keys(INTEL_OLD_FRAMES).forEach((k) => { TILE_FRAMES[k].tpl = ['x86-mono']; });
  Object.keys(AMD_OLD_FRAMES).forEach((k) => { TILE_FRAMES[k].tpl = ['x86-mono']; }); // AMD の旧世代(2026-11-19) // 古い Intel のモノリシックダイ(x86-mono だけ)
  TILE_FRAMES['strix-halo-soc'].live = true; // 評価に影響しない点は同じだが、SoC ダイは従来どおり電力按分に参加する(従来の「GPU」1 ブロックは飾りではなかった)
  TILE_FRAMES.gb10.l3Frac = 0.6; // 2026-11-07: GB10 の cfg.l3MB は L3 24 + SLC 16 = 40MB(SLC 全体を L3 相当)。写真の L3 枠(16 + 8MB)が表すのは 24/40
  TILE_FRAMES['gb10-gpu'].live = true; // GB10 の G-die も同じ(従来の「GPU」1 ブロックは飾りではなかった。'deco' を付けた「未判別」だけ飾り)
  TILE_FRAMES['gb10-gpu'].coreless = true; // コアも L3 も持たないダイ専用の枠(parse〔checkShape〕が、コア・L3 のブロックがあるダイへの誤用を拒否する。design.validate〔DRC〕は拒否しない)
  const AMD_SRC = {
    zeppelin: 'Zeppelin_annotated.jpg(Zeppelin。19700×8660。作者表記なし。出典 URL 未取得)。左の CCX は注釈つき(Zen 1 コア ×4 + L2 512K、L3 8M)、右の CCX は注記が「CCX」だけで、同じ構造として左と同じ比率でコアと L3 を置いた推定。2 つの CCX にコアを交互に割り当てる。縦横比は写真の 2.275(実寸の注記なし。213 mm² は PC Games Hardware。CCX 1 つの面積比 約 20.5% は AMD の CCX 44 mm² と整合)',
    'raven-ridge': 'RavenRidge_annotated.jpg(Raven Ridge。10461×5945。作者表記なし。出典 URL 未取得)。1 CCX(Zen 1 コア ×4 + L2 512K、L3 4M)、Vega の Compute Unit などの GPU、IO。縦横比は写真の 1.759(実寸の注記なし)。GPU の枠は Vega 11 CU 全体(2200G は 8CU 有効)',
    cezanne: 'Cx4d2xiOUBzlnMX4.jpg(Cezanne。Locuza 注釈。Fritzchens Fritz のダイ写真。画像内の出典 https://www.flickr.com/photos/130561288@N04/51375154375/)。Zen 3 コア 4+4、L3、Vega の GPU、PHY。写真の L3 は「8MB」の注記で、プリセットの 16MB とは別(L3 は 1 枠に全量を割り当てた)。実寸の注記なしで、縦横比は写真の 1.083',
    'rembrandt-r': 'Rembrandt-R-12.84x16.25.jpg(Rembrandt-R。4275×5415。@Kurnal の表記はないが Strix Halo の画像と同じ透かしあり。**注釈なし**。縦横比 0.790 = ファイル名の 12.84×16.25 mm と一致。ただし面積 208.7 mm² のプリセットの注記が Kurnal の実測 12.84×16.25 mm 由来で、同じ出典の可能性があり独立した検証にはならない。出典 URL 未取得)。上の CCX(左右 4 コア + 中央 L3)だけ写真の構造から置き、そのほか(GPU・NPU・メモリ PHY・I/O)は判別せず 1 種類の「未判別」の飾りにした。FH9oQiNXEAAwTeZ.jpg(Locuza の Rembrandt の推定モックアップ。Cezanne・Navi22 の写真から組んだ想像図)は実物と配置が違うので根拠にしていない',
    phoenix1: 'zen4-Phoenix1-15.91x11.11x0.35mm.jpg(Phoenix 1。4439×6358。**注釈なし**。縦横比 0.698 = ファイル名の 15.91×11.11 mm と一致、積 176.8 mm² = プリセット。出典 URL 未取得)。上の CCX(左右 4 コア + 中央 L3)だけ写真の構造から置き、そのほか(GPU・NPU・PHY・I/O)は判別せず 1 種類の「未判別」の飾りにした。Phoenix 2 の注釈つき写真(AMD-Phoenix-2-Die-Shot-annotated.preview.jpg)は別のダイ(Zen 4 ×2 + Zen 4c ×4)で、プリセットが無く使っていない',
    phoenix2: 'AMD-Phoenix-2-Die-Shot-annotated.preview.jpg(Phoenix 2。640×382 の低解像度プレビュー。作者・出典 URL 未取得。注釈つき: Zen 4 ×2・Zen 4c ×4・16 MB L3・GPU・WGP ×2・Memory Controller・Media Engine・DDR5 PHY・PCIe・USB・Display・MISC)。縦横比は Kurnal の寸法 15.01×9.06 mm(1.657。プリセットのダイ面積 136.0 mm²)に合わせた(画像は 1.675)。プレビューが低解像度のため、各ブロックの境界は粗い目測。GPU は写真の「GPU」と「WGP」の注記から 4CU(WGP ×2)',
  };
  const AMD_MAP = {
    'amd-zen1-1800x': { frame: 'zeppelin', basis: 'photo' }, 'amd-zen1-1500x': { frame: 'zeppelin', basis: 'photo', extra: '同じ Zeppelin ダイの SKU(コア無効。空き枠を残す)' }, 'amd-zen1-1200': { frame: 'zeppelin', basis: 'photo', extra: '同じ Zeppelin ダイの SKU(コア無効。空き枠を残す)' },
    'amd-zenplus-2700x': { frame: 'zeppelin', basis: 'reuse', extra: 'Zen+(Pinnacle Ridge。12nm)は Zeppelin(14nm)と同じ設計・ほぼ同じ面積(211.7 / 213 mm²)なので Zeppelin の写真の配置を流用(Pinnacle Ridge 自身の写真・測定なし)' },
    'amd-zenplus-2600x': { frame: 'zeppelin', basis: 'reuse', extra: 'Zen+(Pinnacle Ridge。12nm)は Zeppelin(14nm)と同じ設計・ほぼ同じ面積(211.7 / 213 mm²)なので Zeppelin の写真の配置を流用(Pinnacle Ridge 自身の写真・測定なし)。コア無効の SKU で空き枠を残す' },
    'amd-raven-2400g': { frame: 'raven-ridge', basis: 'photo' }, 'amd-raven-2200g': { frame: 'raven-ridge', basis: 'photo', extra: '2400G と同じダイ' },
    'amd-zen3-5800u': { frame: 'cezanne', basis: 'photo' }, 'amd-zen3p-7735hs': { frame: 'rembrandt-r', basis: 'photo' }, 'amd-zen4-7840hs': { frame: 'phoenix1', basis: 'photo' }, 'amd-zen4-8700g': { frame: 'phoenix1', basis: 'photo' }, 'amd-zen4-8500g': { frame: 'phoenix2', basis: 'photo' },
  };
  // Qualcomm Snapdragon の写真の枠(arm-soc)。出典の URL は C:\LocalAI\画像\必要な画像リスト.md の Kurnal Insights のページ(チップ名・SM 型番で対応づけた候補。ページ本文は未取得)
  // 古い Intel Core i(2026-11-17)。写真は WikiChip 由来の画像(Intel 著作)の転載サイト happytrees.org(CPU Graveyard)で表示して目測した。ライセンス表記の確認は 9900K のページだけ(Intel 著作)。写真は注釈なし。縦横比は写真のもの(実寸の注記なし)
  const INTEL_OLD_SRC = {
    'ktm-1c': 'Pentium III Katmai のダイ写真(Intel@250nm@P6@Katmai@Pentium III@SL35D DSCx1 polysilicon microscope stitched@5x.jpg 5736×6817。Fritzchens Fritz。CC0。出典 https://commons.wikimedia.org/wiki/File:Intel@250nm@P6@Katmai@Pentium_III@SL35D_DSCx1_polysilicon_microscope_stitched@5x_(38241648116).jpg)。コアのロジックと L1 のみで、L2 は別チップなので写っていない。縦横比 0.84',
    'adl-6p': 'Alder Lake-S H0(P コア 6 つ)のダイ写真(i5-12400F の poly@5xExt.jpg 13419×8843。Fritzchens Fritz。CC0。出典 https://commons.wikimedia.org/wiki/File:Intel@intel7(10nmESF)@AlderLake@ADL-S(6P+0E)@i5-12400F@SRL5Z_DSCx10_poly@5xExt.jpg)。右に GPU、3 列 × 上下 2 段の P コア、中段に L3。縦横比 1.52。ブロックの境界は目測。i3-12100 は P コア 2 つを無効にして使う',
    'snb-4c': 'Sandy Bridge 4 コアのダイ写真(Intel-sandy_bridge-4-core-Intel_in_Deutschland.jpg 4465×2160。出典 https://happytrees.org/dieshots/Intel_-_Sandy_Bridge_(4-core))。コア ×4 + 各コア下の L3 スライス ×4、左に GPU、右に System Agent。縦横比 2.07(実寸の注記なし)',
    'hsw-4c': 'Haswell 4 コア GT2 のダイ写真(Intel-4th_Generation_Intel_Core_Processor_Die-Intel_in_Deutschland.jpg 5863×2160。出典 https://happytrees.org/dieshots/Intel_-_Haswell_(quad_core))。左に I/O、4 つの「L3 スライス + コア」、右に GPU。縦横比 2.71(Intel の配布画像で、実寸と一致するかは未確認)',
    'skl-4c': 'Skylake 4 コア GT2 のダイ写真(Skylake_(quad-core).png 3158×2160。出典 https://happytrees.org/dieshots/Intel_-_Skylake_(quad-core))。左に GPU、2×2 のコアと L3 の縦帯、右に System Agent・I/O。縦横比 1.46(実寸の注記なし)',
    'kbl-4c': 'Kaby Lake 4 コア GT2 のダイ写真(Kaby_lake_(quad_core).png 3254×2160。出典 https://happytrees.org/dieshots/Intel_-_Kaby_Lake_(quad_core))。Skylake と同じ設計で左右が逆(右に GPU)。縦横比 1.51(実寸の注記なし)',
    'cfl-6c': 'Coffee Lake 6 コア GT2 のダイ写真(Intel_Core_i7_Gen8_(Coffee_Lake-S_14nm).jpg 3213×1758。出典 https://happytrees.org/dieshots/Intel_-_Core_i7_Gen8_(Coffee_Lake-S_14nm))。左に GPU、3 列 × 上下 2 段のコア、右に System Agent。縦横比 1.83(実寸の注記なし)',
    'cfl-8c': 'Coffee Lake Refresh 8 コア GT2 のダイ写真(Intel-9th-Gen-Core.jpg 1935×906。出典 https://happytrees.org/dieshots/Intel_-_Core_i9-9900K_(Coffee_Lake)。Intel 著作と表記)。左に GPU、4 列 × 上下 2 段のコア、右に System Agent。縦横比 2.14(実寸の注記なし)',
    'cml-10c': 'Comet Lake 10 コア GT2 のダイ写真(Intel_Core_i7_Gen10_(Comet_Lake-S_14nm).jpg 4880×2040。出典 https://happytrees.org/dieshots/Intel_-_Core_i7_Gen10_(Comet_Lake-S_14nm))。左に GPU、5 列 × 上下 2 段のコア、右に System Agent。縦横比 2.39(実寸の注記なし)',
  };
  Object.assign(INTEL_OLD_SRC, {
    'nhm-lyn-4c': 'Nehalem Lynnfield 4 コアのダイ写真(Intel_nehalem_lynfield_die_shot.jpg 2196×1351。出典 https://happytrees.org/dieshots/Intel_-_Nehalem-Lynnfield_(quad-core))。上に I/O、4 コア、中央に Uncore、下に L3。縦横比 1.63(実寸の注記なし)',
    'wsm-6c': 'Westmere 6 コアのダイ写真(Intel-xeon_5600-westmere-die-6-core-intel_in_deutschland.jpg 3226×1724。Xeon 5600 の写真で、Core i7-980X(Gulftown)と同じ 6 コアのダイとみなした([二次]。設計書 §2.1 の Gulftown 239mm² と Westmere-EP 248mm² は食い違い)。出典 https://happytrees.org/dieshots/Intel_-_Xeon_5600_(Westmere_6-core))。上段に L3、6 コア、中央に Uncore。縦横比 1.87(実寸の注記なし)',
    'ivb-4c': 'Ivy Bridge 4 コアのダイ写真(Ivy_bridge_die_(quad-core).jpg 800×336。Intel 著作と表記。出典 https://happytrees.org/dieshots/Intel_-_Ivy_Bridge_(4-core))。左に GPU、4 コアと各コア下の L3 スライス、右に System Agent。縦横比 2.38(実寸の注記なし)',
    'bdw-4c': 'Broadwell-H 4 コア GT3e のダイ写真(Intel_Core_i7_Gen5_(Broadwell-H_QC_GT3e_14nm).jpg 1097×976。出典 https://happytrees.org/dieshots/Intel_-_Core_i7_Gen5_(Broadwell-H_QC_GT3e_14nm))。上に「L3 スライス + コア」、下半分に GPU(GT3e)。128MB の eDRAM は別ダイで写真に含まれない。縦横比 1.12(実寸の注記なし)',
  });
  Object.assign(INTEL_OLD_SRC, {
    'wlf-2c': 'Core 2 Duo(Wolfdale 6M)のダイ写真(Intel_Core_2_Quad_(Yorkfield_45nm).jpg 4322×3083 の左のダイ 1 つぶん。出典 https://happytrees.org/dieshots/Intel_-_Core_2_Quad_(Yorkfield_45nm)。ライセンスは不明と表記。Yorkfield は Wolfdale 2 つの MCM なので、1 つぶんを Wolfdale のダイとみなした)。上に I/O、2 コア、下半分に共有 L2 6MB。縦横比 0.70(Penryn-6M の写真 1513×2160 の 0.70 と一致)',
    'yfd-4c': 'Core 2 Quad(Yorkfield)のダイ写真(Intel_Core_2_Quad_(Yorkfield_45nm).jpg 4322×3083。出典 https://happytrees.org/dieshots/Intel_-_Core_2_Quad_(Yorkfield_45nm)。ライセンスは不明と表記)。Wolfdale 2 つの MCM で、左右のダイにコア 2 つと共有 L2 6MB。2 ダイを 1 つの枠として扱う。縦横比 1.40(実寸の注記なし)',
  });
  Object.assign(INTEL_OLD_SRC, {
    'cmn-1c': 'Pentium III Coppermine のダイ写真(Intel_Pentium_3_(Coppermine_180nm).jpg 3140×2636。出典 https://happytrees.org/dieshots/Intel_-_Pentium_3_(Coppermine_180nm)。ライセンスは不明と表記)。左に L2 256KB、右にコア。縦横比 1.19',
    'tlt-1c': 'Pentium III Tualatin のダイ写真(Intel_Pentium_3_(Tualatin_130nm).png 1878×1200。出典 https://happytrees.org/dieshots/Intel_-_Pentium_3_(Tualatin_130nm)。ライセンスは不明と表記)。左に L2、右にコア。縦横比 1.57',
    'wlm-1c': 'Pentium 4 Willamette のダイ写真(Intel_Pentium_4_(Willamette_180nm).jpg 2272×2000。出典 https://happytrees.org/dieshots/Intel_-_Pentium_4_(Willamette_180nm)。ライセンスは不明と表記)。上にコア、下段に L2 256KB。縦横比 1.14',
    'nwd-1c': 'Pentium 4 Northwood のダイ写真(Intel_Pentium_4_(Northwood_130nm).png 1792×1784。出典 https://happytrees.org/dieshots/Intel_-_Pentium_4_(Northwood_130nm)。ライセンスは不明と表記)。上にコア、下段に L2 512KB。縦横比 1.00',
    'prs-1c': 'Pentium 4 Prescott 1MB のダイ写真(Intel_Pentium_4_(Prescott-1M_G1_90nm).jpg 2648×2544。出典 https://happytrees.org/dieshots/Intel_-_Pentium_4_(Prescott-1M_G1_90nm)。ライセンスは不明と表記)。上にコア、下段に L2 1MB。縦横比 1.04',
    'cdm-1c': 'Pentium 4 Prescott 2MB のダイ写真(Intel_Pentium_4_(Prescott-2M_N0_90nm).jpg 3170×2649。出典 https://happytrees.org/dieshots/Intel_-_Pentium_4_(Prescott-2M_N0_90nm)。ライセンスは不明と表記)を Cedar Mill(65nm の縮小版)に代用した。Cedar Mill 自体の写真は CPU Graveyard に無く、縮小で配置が同じとみなした([推定])。左に L2 2MB、右にコア。縦横比 1.20',
    'prl-2c': 'Presler は Cedar Mill 2 つの MCM なので、Cedar Mill(Prescott 2MB の写真 3170×2649。出典 https://happytrees.org/dieshots/Intel_-_Pentium_4_(Prescott-2M_N0_90nm))の枠を左右に 2 つ並べた([推定]。Presler 自体の写真は CPU Graveyard に無い)。縦横比 2.39',
    'smf-2c': 'Pentium D Smithfield のダイ写真(Intel_Pentium_D_(Smithfield_90nm).jpg 2503×1200。出典 https://happytrees.org/dieshots/Intel_-_Pentium_D_(Smithfield_90nm)。ライセンスは不明と表記)。1 つのダイに 2 コア(左右)、各コアの下に L2 1MB。縦横比 2.09',
    'bns-1c': 'Pentium M Banias のダイ写真(Intel_Pentium_M_(Banias_130nm).jpg 1600×1198。出典 https://happytrees.org/dieshots/Intel_-_Pentium_M_(Banias_130nm)。ライセンスは不明と表記)。左に L2 1MB、右にコア。縦横比 1.34',
    'dth-1c': 'Pentium M Dothan の Intel の報道用写真(Intel-Dothan_(…)-intel-newsroom.jpg 1599×875。出典 https://happytrees.org/dieshots/Intel_-_Pentium_M_(Dothan_2M)。Intel 著作と表記)。左端が切れた拡大写真で、ダイの外形は完全ではない。左に L2 2MB、右にコア。縦横比 1.83',
    'yna-2c': 'Core Duo Yonah のダイ写真(Intel_Core_Duo_(Yonah_65nm).jpg 1110×820。出典 https://happytrees.org/dieshots/Intel_-_Core_Duo_(Yonah_65nm)。ライセンスは不明と表記)。上段に 2 コア(左右対称)、下段に共有 L2 2MB。縦横比 1.35',
    'cnr-2c': 'Core 2 Duo Conroe のダイ写真(Intel_Core_2_Duo_(Conroe_G0_65nm).jpg 3574×2722。出典 https://happytrees.org/dieshots/Intel_-_Core_2_Duo_(Conroe_G0_65nm)。ライセンスは不明と表記)。左に共有 L2 4MB、右に上下 2 つのコア。縦横比 1.31',
    'kts-4c': 'Core 2 Quad Kentsfield のダイ写真(Intel_Core_2_Quad_(Kentsfield_65nm).png 1674×1102。出典 https://happytrees.org/dieshots/Intel_-_Core_2_Quad_(Kentsfield_65nm)。ライセンスは不明と表記)。Conroe 2 つの MCM。各ダイの上段に 2 コア、下段に共有 L2 4MB。縦横比 1.52',
  });
  const INTEL_OLD_MAP = {
    'intel-p3-katmai-600b': { frame: 'ktm-1c', basis: 'photo' }, 'intel-adl-12100': { frame: 'adl-6p', basis: 'photo', extra: 'H0 の 6P のダイから P コア 2 つを無効にした SKU(空き枠を残す)' },
    'intel-nhm-860': { frame: 'nhm-lyn-4c', basis: 'photo' }, 'intel-wsm-980x': { frame: 'wsm-6c', basis: 'photo' },
    'intel-ivb-3770k': { frame: 'ivb-4c', basis: 'photo' }, 'intel-ivb-3570k': { frame: 'ivb-4c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 6MB)' },
    'intel-bdw-5775c': { frame: 'bdw-4c', basis: 'photo' },
    'intel-p3-cmn-1000': { frame: 'cmn-1c', basis: 'photo' }, 'intel-p3-tlt-1400s': { frame: 'tlt-1c', basis: 'photo' }, 'intel-p4-wlm-1500': { frame: 'wlm-1c', basis: 'photo' }, 'intel-p4-nwd-30c': { frame: 'nwd-1c', basis: 'photo' },
    'intel-p4-prs-531': { frame: 'prs-1c', basis: 'photo' }, 'intel-p4-cdm-631': { frame: 'cdm-1c', basis: 'reuse' }, 'intel-pd-smf-820': { frame: 'smf-2c', basis: 'photo' }, 'intel-pd-prl-945': { frame: 'prl-2c', basis: 'reuse' },
    'intel-pm-bns-16': { frame: 'bns-1c', basis: 'photo' }, 'intel-pm-dth-755': { frame: 'dth-1c', basis: 'photo' }, 'intel-cd-yna-t2500': { frame: 'yna-2c', basis: 'photo' }, 'intel-c2-cnr-e6600': { frame: 'cnr-2c', basis: 'photo' }, 'intel-c2-kts-q6600': { frame: 'kts-4c', basis: 'photo' },
    'intel-wlf-e8400': { frame: 'wlf-2c', basis: 'photo' }, 'intel-yfd-q9550': { frame: 'yfd-4c', basis: 'photo' }, 'intel-yfd-q9650': { frame: 'yfd-4c', basis: 'photo', extra: 'Q9550 と同じ Yorkfield(クロックだけ違う)' },
    'intel-snb-2600k': { frame: 'snb-4c', basis: 'photo' }, 'intel-snb-2500k': { frame: 'snb-4c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 を 6MB に制限)' }, 'intel-snb-2720qm': { frame: 'snb-4c', basis: 'photo', extra: '同じ 4 コアのダイのモバイル SKU(L3 6MB)' },
    'intel-hsw-4770k': { frame: 'hsw-4c', basis: 'photo' }, 'intel-hsw-4790k': { frame: 'hsw-4c', basis: 'photo' }, 'intel-hsw-4690k': { frame: 'hsw-4c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 6MB)' }, 'intel-hsw-4700hq': { frame: 'hsw-4c', basis: 'photo', extra: '同じ 4 コアのダイのモバイル SKU' },
    'intel-skl-6700k': { frame: 'skl-4c', basis: 'photo' }, 'intel-skl-6600k': { frame: 'skl-4c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 6MB)' }, 'intel-skl-6700hq': { frame: 'skl-4c', basis: 'photo', extra: '同じ 4 コアのダイのモバイル SKU(L3 6MB)' },
    'intel-kbl-7700k': { frame: 'kbl-4c', basis: 'photo' }, 'intel-kbl-7600k': { frame: 'kbl-4c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 6MB)' }, 'intel-kbl-7700hq': { frame: 'kbl-4c', basis: 'photo', extra: '同じ 4 コアのダイのモバイル SKU(L3 6MB)' },
    'intel-cfl-8700k': { frame: 'cfl-6c', basis: 'photo' },
    'intel-cfr-9900k': { frame: 'cfl-8c', basis: 'photo' }, 'intel-cfr-9700k': { frame: 'cfl-8c', basis: 'photo', extra: '同じダイの SKU(HT 無効・L3 12MB)' },
    'intel-cml-10900k': { frame: 'cml-10c', basis: 'photo' }, 'intel-cml-10700k': { frame: 'cml-10c', basis: 'photo', extra: '同じダイの SKU(コア 2 つ無効。空き枠を残す)' },
  };
  const AMD_OLD_SRC = {
    'tbd-1c': 'Athlon Thunderbird のダイ写真(AMD@180nm@K7@Thunderbird(Model4 CPUID642)@AMD Athlon A0800MPR24B A DSCx07 poly@5xBF.jpg 11376×7866。Fritzchens Fritz。CC0。出典 https://commons.wikimedia.org/wiki/File:AMD@180nm@K7@Thunderbird(Model4_CPUID642)@AMD_Athlon_A0800MPR24B_A_DSCx07_poly@5xBF.jpg)。左に L2 256KB、右にコア。縦横比 1.45',
    'brt-1c': 'Athlon XP Barton のダイ写真(Athlon XP (Barton core)。Martijn Boer。パブリックドメイン。出典 https://happytrees.org/dieshots/AMD_-_Athlon_XP_(Barton_core))。左にコア、右に L2 512KB。縦横比 1.82',
    'vnc-1c': 'Athlon 64 Venice のダイ写真(AMD_Athlon64_Venice_ADA3400DAA4BY.jpg 2048×1815。Fritzchens Fritz。パブリックドメイン。出典 https://happytrees.org/dieshots/AMD_-_ADA3400DAA4BY)。左にコア、右に L2 512KB(赤)。縦横比 1.13',
    'agn-4c': 'Phenom X4 Agena のダイ写真(AMD_Phenom_Agena_HD9750WCJ4BGH.jpg 2048×1939。Fritzchens Fritz。パブリックドメイン。出典 https://happytrees.org/dieshots/AMD_-_HD9750WCJ4BGH_(Phenom_X4_9750))。2×2 のコア、中央に各コアの L2 と L3・クロスバー。L3 の位置は目測の推定。縦横比 1.06',
    'dnb-4c': 'Phenom II X4 Deneb のダイ写真(AMD_Phenom_II_X4_(Deneb_45nm).jpg 2078×1612。AMD 著作と表記。出典 https://happytrees.org/dieshots/AMD_-_Phenom_II_X4_(Deneb_45nm))。左に 2×2 のコアと各コアの L2、右に L3 6MB。縦横比 1.29',
    'thb-6c': 'Phenom II X6 Thuban のダイ写真(AMD_Phenom_II_X6_(Thuban_45nm).jpg 3128×2272。ライセンスは不明と表記。出典 https://happytrees.org/dieshots/AMD_-_Phenom_II_X6_(Thuban_45nm))。上下 3 コアずつ、右に L3 6MB。縦横比 1.38',
    'zmb-8c': 'FX-8150 Zambezi のダイ写真(AMD_FX-8150_(Bulldozer,_Zambezi_32nm).jpg 2705×2199。ライセンスは不明と表記。出典 https://happytrees.org/dieshots/AMD_-_FX-8150_(Bulldozer,_Zambezi_32nm))。四隅に 4 つのモジュール、中段に L3 の帯 4 本。各モジュールの整数コア 2 つの境界は写真から判別できず、ロジックの塊を上下に 2 等分した推定。縦横比 1.23',
    'vsh-8c': 'FX-8350 Vishera のダイ写真(AMD_FX-8350_(Vishera_32nm).jpg 3475×2795。着色された写真。ライセンスは不明と表記。出典 https://happytrees.org/dieshots/AMD_-_FX-8350_(Vishera_32nm))。Zambezi と同じ 4 モジュールの配置で、整数コア 2 つの境界は上下 2 等分の推定。縦横比 1.24',
    'trn-4c': 'A10 Trinity のダイ写真(AMD_A10_APU_(Trinity_32nm).jpg 2695×1973。着色された写真。ライセンスは不明と表記。出典 https://happytrees.org/dieshots/AMD_-_A10_APU_(Trinity_32nm))。左に GPU、右に 2 モジュール(各モジュールは 2 コア + 下に L2 2MB)。整数コア 2 つの境界は左右 2 等分の推定。縦横比 1.37',
    'zct-2c': 'E-450 Zacate のダイ写真(AMD_E-450_APU_(Zacate,_Ontario_40nm).jpg 2051×1821。ライセンスは不明と表記。出典 https://happytrees.org/dieshots/AMD_-_E-450_APU_(Zacate,_Ontario_40nm))。E-350 と同じダイ。左の列に 2 コアと L2、中央は GPU。コアの位置は目測の推定で、確度は低い。縦横比 1.13',
  };
  const AMD_OLD_MAP = {
    'amd-k7-athlon-1400': { frame: 'tbd-1c', basis: 'photo', extra: '写真は Athlon 800(A0800MPR24B)の同じ Thunderbird ダイ' },
    'amd-k7-xp-3200': { frame: 'brt-1c', basis: 'photo' }, 'amd-k8-venice-3200': { frame: 'vnc-1c', basis: 'photo' }, 'amd-k10-agena-9950': { frame: 'agn-4c', basis: 'photo' }, 'amd-k10-deneb-955': { frame: 'dnb-4c', basis: 'photo' },
    'amd-k10-thuban-1090t': { frame: 'thb-6c', basis: 'photo' }, 'amd-bd-fx8150': { frame: 'zmb-8c', basis: 'photo' }, 'amd-pd-fx8350': { frame: 'vsh-8c', basis: 'photo' },
    'amd-pd-fx6300': { frame: 'vsh-8c', basis: 'photo', extra: 'FX-8350 と同じダイの SKU(モジュール 1 つ無効。空き枠を残す)' }, 'amd-pd-a10-5800k': { frame: 'trn-4c', basis: 'photo' }, 'amd-bobcat-e350': { frame: 'zct-2c', basis: 'photo', extra: 'E-450 と同じダイ(E-350 は E-450 の低クロック版)' },
  };
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
    'mtl-compute': 'MTL_annotated.jpg(Meteor Lake。作者表記なし。チップ名は画像内の Redwood Cove / Crestmont / Xe-LPG とファイル名から)。P 6 + E 4 コア×2 クラスタ。LP-E 2(2-Core Crestmont Cluster)は写真どおり SoC タイルの左上寄りに置く(Compute タイルの枠の LP-E 枠は使わない)',
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
    'intel-arl-285h': tm('mtl-compute', 'reuse', 'Arrow Lake-H の Compute タイル(6P+8E+2LP-E。Lion Cove / Skymont)の写真は無いため、Meteor Lake の配置(P 6・E 4×2 クラスタ・LP-E 2)を流用。ダイ面積は未取得で、寸法は表示用の仮の値(面積ではない)'),
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
  // Meteor Lake(185H)・Arrow Lake-H(285H)のタイルの並べ方。MTL_annotated.jpg(表示 2576 幅の目測)の配置:
  // 左に Compute、その下に IOE(Compute と同じ幅で接する)、中央に SoC、右に GPU(3 タイルが横一列)。Base タイル(Foveros)は土台として全体の下に置く。
  // 寸法は表示 2000 幅に換算した写真の目測(px。Compute の枠は mtl-compute の 352 幅)。SoC 361×423、GPU 163×400、IOE 352×105。
  // 面積が分かっているタイルは面積を変えず写真の縦横比だけ採る(IOE は幅を Compute に合わせる)。面積が未取得のタイル(285H)は、写真の寸法を Compute の幅で換算した表示用の仮寸法(面積ではない。推測値を入れない)
  const TILE_ROW = { 'intel-mtl-185h': true, 'intel-arl-285h': true };
  const TILE_ROW_PX = { gpu: [163, 400], soc: [361, 423], ioe: [352, 105] };
  const tileRowRole = (name) => /GPU/i.test(name) ? 'gpu' : /SoC/i.test(name) ? 'soc' : /IO/i.test(name) ? 'ioe' : /Base/i.test(name) ? 'base' : /Compute/i.test(name) ? 'compute' : null;
  // Compute 以外のタイル(GPU・SoC・IOE)の幅・高さ(mm)。対象外のチップ・ダイは null(従来の寸法)
  function tileRowSize(presetId, name, mm2, computeW) {
    const role = TILE_ROW[presetId] ? tileRowRole(name) : null; const px = role && TILE_ROW_PX[role];
    if (!px || !(computeW > 0)) return null;
    if (typeof mm2 === 'number' && mm2 > 0) {
      const w = role === 'ioe' ? computeW : Math.sqrt(mm2 * px[0] / px[1]);
      return { widthMm: w, heightMm: mm2 / w };
    }
    const s = computeW / 352;
    return { widthMm: px[0] * s, heightMm: px[1] * s };
  }
  // dies(design のダイ配列。x・y を書き換える)を並べる。対象外のチップなら false
  // 2026-11-16: 位置は MTL_annotated.jpg(幅 2000 に縮小した座標)の測定どおり。タイルはほぼ隙間なく詰まっている:
  //   Compute x510–862 y298–617 / IOE x500–862 y620–725 / SoC x863–1227 y305–725 / GPU x1229–1395 y318–717(px)。
  //   隙間は Compute→SoC 1px・SoC→GPU 2px・Compute→IOE 3px、上端は SoC が Compute より 7px・GPU が 20px 下。1px は Compute の幅(352px)換算でスケールする。
  //   (旧: ダイ間の隙間を表示用の 2mm〔GAP_MM〕で離していた。)
  // Base タイル(Foveros の土台)は写真では独立して見えず、全タイルの下に敷かれる。外形は金属枠の内側(x490–1415 y270–745 = 925×475px)で、
  //   タイル群の外接矩形に左 20・上 28・右 20・下 20 px 足した大きさ(目測)。面積が未取得の Base(185H)は、この外形を表示用の仮寸法にする(面積は未取得のまま)。
  //   面積が既知の Base(285H の 178mm²)は面積を保ち、タイル群の中心に重ねる。どちらも die.underlay = true(描画で土台として低く・先に描く)。
  // 面積が全部未取得のタイル(285H)は、写真の比を保ったまま全体を縮尺して、面積が既知の Base の内側(タイル群+写真の余白)に収める。
  // 縮尺 u(mm/px)= min(Base 幅 / 外形幅, Base 高 / 外形高)。外形 = タイル群の外接矩形に左 20・上 28・右 20・下 20 px を足したもの(px は Compute 幅 352px 基準)。
  // size = Compute の仮寸法({widthMm, heightMm})。戻り値: 縮尺した Compute の寸法か、対象外なら null。dieSize(mm2, aspect) は design.js のもの
  function tileRowFit(presetId, srcDies, size, dieSize) {
    if (!TILE_ROW[presetId] || !size || !(size.widthMm > 0)) return null;
    const base = (srcDies || []).find((d) => tileRowRole(d.name) === 'base');
    const tiles = (srcDies || []).filter((d) => ['compute', 'soc', 'gpu', 'ioe'].indexOf(tileRowRole(d.name)) >= 0);
    if (!base || !(typeof base.mm2 === 'number' && base.mm2 > 0) || !tiles.length || tiles.some((d) => typeof d.mm2 === 'number')) return null;
    const bs = dieSize(base.mm2, null); const cPxH = 352 * size.heightMm / size.widthMm;
    const px = TILE_ROW_PX; const M = BASE_MARGIN_PX;
    const wPx = 352 + TILE_ROW_GAP_PX.soc + px.soc[0] + TILE_ROW_GAP_PX.gpu + px.gpu[0];
    const hPx = Math.max(cPxH + TILE_ROW_GAP_PX.ioe + px.ioe[1], TILE_ROW_DY_PX.soc + px.soc[1], TILE_ROW_DY_PX.gpu + px.gpu[1]);
    const u = Math.min(bs.widthMm / (wPx + M.left + M.right), bs.heightMm / (hPx + M.top + M.bottom));
    const k = (352 * u) / size.widthMm;
    return { widthMm: size.widthMm * k, heightMm: size.heightMm * k };
  }
  const TILE_FIT_NOTE = '285H のタイルの実寸は未取得(面積も未取得)。写真(Meteor Lake)の比を保ったまま全体を縮尺し、タイル群と写真の余白(外形 925×475px 相当)が Base(面積 178mm²)の内側に収まる大きさにした表示用の仮寸法';
  const TILE_ROW_GAP_PX = { soc: 1, gpu: 2, ioe: 3 };
  const TILE_ROW_DY_PX = { soc: 7, gpu: 20 };
  const BASE_MARGIN_PX = { left: 20, top: 28, right: 20, bottom: 20 };
  const BASE_NOTE = '表示用の仮寸法: MTL_annotated.jpg の金属枠の内側を、タイル群の外接矩形に左 20・上 28・右 20・下 20 px(Compute の幅 352px 換算)足して目測した。実寸ではなく、面積は未取得のまま';
  // LP-E コアは写真では SoC タイル(2-Core "Crestmont" Cluster。SoC タイル左上寄り)にある。MTL_annotated.jpg(幅 2000 の座標)の測定:
  //   SoC タイル x863–1227 y305–725(361×423px 換算の原点は 863,305)に対し、LP-E の 2 コアは x890–988 y338–388(タイル内 x27 y33 幅 98 高 50 px)。
  // レイアウトは Compute ダイが作るので、その後でこの関数が LP-E のブロックを SoC ダイへ移す(ブロック id は変えない。計算はダイをまたいで全ブロックを見るため影響なし)。
  // SoC ダイのブロックは、LP-E の枠を除いた 4 枚の「SoC / I/O」に作り直す(同じ高さの箱が重なって 3D で面がちらつくのを避ける)。何度呼んでも同じ結果
  const LPE_IN_SOC_PX = { x: 27, y: 33, w: 98, h: 50 };
  function tileRowMoveLpe(presetId, dies) {
    if (!TILE_ROW[presetId]) return false;
    const comp = dies.find((d) => tileRowRole(d.name) === 'compute'); const soc = dies.find((d) => tileRowRole(d.name) === 'soc');
    if (!comp || !soc) return false;
    const isLpe = (b) => b.kind === 'core' && /^LP/i.test(String(b.coreType || b.label || ''));
    const moved = comp.blocks.filter(isLpe);
    comp.blocks = comp.blocks.filter((b) => !isLpe(b));
    if (!moved.length) return false;
    const sx = soc.widthMm / 361; const sy = soc.heightMm / 423; const R = (v) => Math.round(v * 1e4) / 1e4;
    const g = Math.min(soc.widthMm, soc.heightMm) * 0.004; // ブロック間の隙間(縁が接して「重なり」と判定されないよう縮める)
    const m = Math.min(soc.widthMm, soc.heightMm) * 0.06; const L = LPE_IN_SOC_PX;
    const lx = L.x * sx; const ly = L.y * sy; const lw = L.w * sx; const lh = L.h * sy;
    const n = moved.length; const cw = lw / n;
    moved.forEach((b, i) => { b.x = R(lx + i * cw + g); b.y = R(ly + g); b.w = R(cw - 2 * g); b.h = R(lh - 2 * g); });
    const rects = [[m, ly + lh, soc.widthMm - 2 * m, soc.heightMm - m - (ly + lh)], [m, m, soc.widthMm - 2 * m, ly - m], [m, ly, lx - m, lh], [lx + lw, ly, soc.widthMm - m - (lx + lw), lh]];
    const uncore = []; rects.forEach((r) => { if (r[2] > 1e-6 && r[3] > 1e-6) uncore.push({ id: `${soc.id}-uncore${uncore.length ? '-' + uncore.length : ''}`, kind: 'uncore', label: 'SoC / I/O', x: R(r[0] + g), y: R(r[1] + g), w: R(r[2] - 2 * g), h: R(r[3] - 2 * g), schematic: true }); });
    soc.blocks = uncore.concat(moved);
    return true;
  }
  // ---- Ryzen X3D の積層(表示専用。評価・面積・ダイ数に入らない。design.stackDies)----
  // top: Zen 3・Zen 4 は V-Cache ダイが CCD の上に載る(Zen 3 41mm²・Zen 4 36mm²。[二次] Tom's Hardware。docs/research/ryzen-x3d-2026-11-15.md §1.2)。V-Cache の無い部分は構造用シリコンで高さをそろえる。
  //   載る位置・縦横比は表示用の目測(出典なし)。2 CCD 品は V-Cache が片方(左)の CCD だけ。
  // under: Zen 5 は V-Cache ダイが CCD の下(CCD を上に載せる。基板=ベースダイではない)。面積は未取得。CCD より各辺 50µm 大きい([二次] Tom Wassick の分解)が、見て分かるよう各辺 0.1mm にした表示用の値。
  const STACK = { 'amd-zen3-5800x3d': { kind: 'top', mm2: 41 }, 'amd-zen4-7800x3d': { kind: 'top', mm2: 36 }, 'amd-zen4-7950x3d': { kind: 'top', mm2: 36 }, 'amd-zen5-9800x3d': { kind: 'under' }, 'amd-zen5-9950x3d': { kind: 'under' } };
  const STACK_MARGIN = 0.1;
  // ccd = 配置後の CCD ダイ(x・y・widthMm・heightMm・blocks・layout.units)。戻り値: stackDies の配列(対象外は null)
  function stackDies(presetId, ccd) {
    const st = STACK[presetId]; if (!st || !ccd) return null;
    const units = (ccd.layout && ccd.layout.units) || 1; const cw = ccd.widthMm / (units > 1 ? units + (units - 1) * CCD_GAP : 1); const ch = ccd.heightMm;
    const R = (v) => Math.round(v * 1e4) / 1e4; const out = [];
    if (st.kind === 'under') {
      const w = ccd.widthMm + 2 * STACK_MARGIN; const h = ch + 2 * STACK_MARGIN;
      out.push({ id: 'stack-base', kind: 'base', dieId: ccd.id, label: 'V-Cache ダイ(CCD の下)', x: R(ccd.x - STACK_MARGIN), y: R(ccd.y - STACK_MARGIN), widthMm: R(w), heightMm: R(h), areaMm2: null,
        note: '面積は未取得。CCD より各辺 0.1mm 大きい表示用の値(実測は 50µm。Tom Wassick の分解 [二次])' });
      return out;
    }
    const l3 = (ccd.blocks || []).filter((b) => b.kind === 'l3' && b.x < cw);
    const cxl = l3.length ? (Math.min.apply(null, l3.map((b) => b.x)) + Math.max.apply(null, l3.map((b) => b.x + b.w))) / 2 : cw / 2;
    const vh = Math.min(ch * 0.8, Math.sqrt(st.mm2 * 1.1)); const vw = Math.min(cw * 0.9, st.mm2 / vh);
    const vx = Math.max(0, Math.min(cw - vw, cxl - vw / 2)); const vy = (ch - vh) / 2;
    const ar = Math.abs(vw * vh / st.mm2 - 1) < 0.01 ? st.mm2 : null;
    out.push({ id: 'stack-vcache', kind: 'vcache', dieId: ccd.id, label: 'V-Cache ダイ(CCD の上)', x: R(ccd.x + vx), y: R(ccd.y + vy), widthMm: R(vw), heightMm: R(vh), areaMm2: ar,
      note: '面積 ' + st.mm2 + 'mm² は [二次] Tom\'s Hardware。載る位置・縦横比は表示用の目測' });
    [[0, 0, vx, ch], [vx + vw, 0, cw - vx - vw, ch], [vx, 0, vw, vy], [vx, vy + vh, vw, ch - vy - vh]].forEach((r, i) => {
      if (r[2] > 1e-3 && r[3] > 1e-3) out.push({ id: 'stack-fill-' + i, kind: 'si-fill', dieId: ccd.id, label: '構造用シリコン', x: R(ccd.x + r[0]), y: R(ccd.y + r[1]), widthMm: R(r[2]), heightMm: R(r[3]), areaMm2: null });
    });
    return out;
  }
  function tileRowPlace(presetId, dies, gap) {
    if (!TILE_ROW[presetId]) return false;
    const by = {}; dies.forEach((d) => { const r = tileRowRole(d.name); if (r && !by[r]) by[r] = d; });
    if (!by.compute) return false;
    const c = by.compute; c.x = 0; c.y = 0;
    const u = c.widthMm / 352; // 1px(写真の縮小座標)あたりの mm
    let x = c.widthMm + TILE_ROW_GAP_PX.soc * u;
    if (by.soc) { by.soc.x = x; by.soc.y = TILE_ROW_DY_PX.soc * u; x += by.soc.widthMm + TILE_ROW_GAP_PX.gpu * u; }
    if (by.gpu) { by.gpu.x = x; by.gpu.y = TILE_ROW_DY_PX.gpu * u; }
    if (by.ioe) { by.ioe.x = 0; by.ioe.y = c.heightMm + TILE_ROW_GAP_PX.ioe * u; }
    const placed = [c, by.soc, by.gpu, by.ioe].filter(Boolean);
    const left = Math.min.apply(null, placed.map((d) => d.x)); const top = Math.min.apply(null, placed.map((d) => d.y));
    const right = Math.max.apply(null, placed.map((d) => d.x + d.widthMm)); const bottom = Math.max.apply(null, placed.map((d) => d.y + d.heightMm));
    if (by.base) {
      const bs = by.base; bs.underlay = true;
      if (bs.areaKnown !== false && placed.every((d) => d.areaKnown === false)) placed.forEach((d) => { d.sizeNote = TILE_FIT_NOTE; });
      if (bs.areaKnown === false) {
        const M = BASE_MARGIN_PX;
        bs.x = left - M.left * u; bs.y = top - M.top * u;
        bs.widthMm = (right - left) + (M.left + M.right) * u; bs.heightMm = (bottom - top) + (M.top + M.bottom) * u;
        bs.sizeNote = BASE_NOTE; // 評価(area.note)に出る areaNote は変えない
      } else { bs.x = (left + right) / 2 - bs.widthMm / 2; bs.y = (top + bottom) / 2 - bs.heightMm / 2; }
    }
    const all = dies.filter((d) => d.x != null); const minX = Math.min.apply(null, all.map((d) => d.x)); const minY = Math.min.apply(null, all.map((d) => d.y));
    all.forEach((d) => { d.x -= minX; d.y -= minY; });
    return true;
  }
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
      const io = INTEL_OLD_MAP[preset.id];
      if (io && TILE_FRAMES[io.frame]) {
        const note = `${INTEL_OLD_SRC[io.frame]}${io.extra ? `。${io.extra}` : ''}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま`;
        return Object.assign(base, { template: 'x86-mono', uncore: true, igpu: !!facts.igpu, dieIndex: ci, frame: io.frame, scaleBasis: io.basis, scaleNote: note });
      }
      return Object.assign(base, { template: 'x86-mono', uncore: true, igpu: !!facts.igpu, dieIndex: ci });
    }
    if (preset.vendor === 'AMD') {
      const ao = AMD_OLD_MAP[preset.id]; // Ryzen より前(2026-11-19)
      if (ao && TILE_FRAMES[ao.frame]) {
        const note = `${AMD_OLD_SRC[ao.frame]}${ao.extra ? `。${ao.extra}` : ''}。ブロックの大きさは写真の目測(±5〜10%)で、実チップのフロアプランではない。ダイ面積はプリセットのまま`;
        return Object.assign(base, { template: 'x86-mono', uncore: true, igpu: false, dieIndex: ci, frame: ao.frame, scaleBasis: ao.basis, scaleNote: note });
      }
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
  function afterEdit(layout, cores, l3MB, baseL3MB) {
    if (!layout || layout.scaleBasis === 'schematic') return layout;
    // Apple・Snapdragon・Dimensity は写真の枠に L3 の置き場所が無い(SLC・L3 は飾り)。cfg.l3MB は SLC 全体を L3 相当として入れてある(2026-11-07、GPU 未実装のため)ので、
    // 元の容量(baseL3MB。省略時 0)から変えて L3 が 0 より大きいときだけ、根拠なしの従来配置に落とす(元のままなら飾りの SLC が L3 を表すので photo のまま)。
    // frame に l3 がある枠(T239)は L3 を変えても photo のまま(ラベルだけ更新。L3 を 0 にすると L3 ブロックが無くなるだけ)
    const base = typeof baseL3MB === 'number' ? baseL3MB : 0;
    if ((layout.template === 'apple-soc' || (layout.template === 'arm-soc' && !(TILE_FRAMES[layout.frame] && TILE_FRAMES[layout.frame].l3))) && typeof l3MB === 'number' && l3MB > 0 && l3MB !== base) return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: base > 0 ? `編集で L3(SLC 相当)の容量を変えたため、ブロックの大きさに根拠はありません(写真の枠に L3 は無い)` : `編集で L3 を追加したため、ブロックの大きさに根拠はありません(写真の枠に L3 は無い)` });
    if (fits(layout, cores)) {
      // 写真の枠に L3 が無い SoC で L3 を 0 にした場合、図には飾りの SLC が残るが評価は L3 なしになる、と一言添える(scaleNote は 600 文字以内)
      const noSlot = layout.template === 'apple-soc' || (layout.template === 'arm-soc' && !(TILE_FRAMES[layout.frame] && TILE_FRAMES[layout.frame].l3));
      const sn = String(layout.scaleNote || '');
      if (noSlot && base > 0 && l3MB === 0 && !sn.includes(ZERO_L3_NOTE) && sn.length + ZERO_L3_NOTE.length + 1 <= 600) return Object.assign({}, layout, { scaleNote: sn ? sn + ' ' + ZERO_L3_NOTE : ZERO_L3_NOTE });
      return layout;
    }
    return Object.assign({}, layout, { scaleBasis: 'schematic', scaleNote: EDITED_NOTE });
  }
  const ZERO_L3_NOTE = '【L3 を 0 に編集】図の飾りの SLC は残るが、評価は L3 なし。';

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
        const l3Show = Math.round(l3MB * (TF.l3Frac || 1) * 100) / 100; // l3Frac: cfg の l3MB のうち写真の L3 枠が表す割合(GB10 は L3 24 + SLC 16 の 40MB のうち 24MB = 0.6。SLC は飾りで表す)
        const rs = Array.isArray(TF.l3[0]) ? TF.l3 : [TF.l3]; // 複数枠(Zeppelin の 2 CCX)は容量を等分。枠の 5 番目の数(重み)があれば容量をその比で分ける(GB10 の 16MB + 8MB クラスタ = 重み 2:1)
        const wsum = rs.reduce((a, r) => a + (r[4] || 1), 0);
        rs.forEach((r, i) => put(rs.length === 1 ? `${die.id}-l3` : `${die.id}-l3-${i}`, 'l3', `L3 ${rs.length === 1 ? l3Show : Math.round((l3Show * (r[4] || 1) / wsum) * 100) / 100}MB`, X(r[0]), Y(r[1]), r[2] * sx, r[3] * sy));
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

  const api = { TEMPLATES, TEMPLATE_IDS, DECOR_FACTS, CCD_RECIPES, SCALE_BASES, SCALE_TEXT, MAX_UNITS, DECOR_IOD, IOD_PLACE, tileRowSize, tileRowPlace, tileRowFit, tileRowMoveLpe, stackDies, APPLE_FRAMES, TILE_FRAMES, tileDecor, classify, toLayout, socLayout, aspectOf, checkDecorDies, decorNote, checkLayout, fits, afterEdit, layoutDie, iodBlocks, scaleText, isSmall };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.floorplan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
