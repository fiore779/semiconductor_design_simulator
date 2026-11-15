// メモリ構成の選択肢(設計書 §5.2.4)。プリセット id ごとに、基準構成(ref)・バス幅・選べる種別と速度の候補を持つ。
// ここに無い id(メモリ固定のチップ、混合・D モード)は選択肢を出さず、メモリ係数は 1。
// 速度は種別ごとの代表的な離散値(LADDER)のうち、そのチップの対応最大(max)以下のもの + max 自身。**対応最大を超える値は出さない**(OC・EXPO は対象外)。
// s: 対応最大の出典区分 'pub'(Intel ARK など公式) / 'sec'(Wikipedia など二次)。出典は src。2026-11-06 に Intel・AMD の全選択肢を公式(ARK・amd.com)の pub に統一した(sec は今は無い)。
// ref: 基準構成(既定の選択)。決め方(2026-11-02 に実態に合わせて整理):
//   (1) プリセットの cfg.memory 文字列に構成があれば、その先頭(12900K: DDR4-3200 / 13900K: DDR5-5600 / 14900K: DDR5-5600 / 285K・265K: DDR5-6400 / 185H: LPDDR5X-7467 /
//       388H: LPDDR5X-9600 / 1800X: DDR4-2666 / 2700X: DDR4-2933 / 5800X 等: DDR4-3200 / 7700・7950X: DDR5-5200 / 9700X・9950X: DDR5-5600 / HX 370・Kraken: DDR5-5600 / EPYC 7401: DDR4-2666)。
//       DIMM の種別(DDR4 / DDR5)が先に書かれている SKU はそれを優先(デスクトップは DIMM、LPDDR は先頭でない限り選ばない)。
//   (2) cfg.memory が null / 未取得の SKU は、同じファミリーで文字列のある SKU に合わせる:
//       Alder Lake の 12700K・12600K・12100 → 12900K に合わせて DDR4-3200 / Raptor Lake の 13700K・13600K・14700K・14600K → 13900K の DDR5-5600 /
//       14700HX → 14900K の DDR5-5600 / 275HX → 265K の DDR5-6400 / 386H・378H・358H → 388H の LPDDR5X-9600 /
//       Zen 1 の 1500X・1200 → 1800X の DDR4-2666 / Zen+・Raven Ridge → 2700X の DDR4-2933 / 5800U → Wikipedia の先頭の DDR4-3200 / 7735HS → 先頭の DDR5-4800 / 7840HS → HX 370 に合わせて DDR5-5600。
//   「主種別」= 仕様表で先頭に書かれた種別(上の規則で決まらないときだけ使う。該当なし)。
//   **公開 GB7 値がどの構成で測られたかは不明**(Geekbench Browser が 403 で取得不可。docs/research/memory-scaling.md §6(e))。
// OC(メモリ OC): この表には載せない。js/sim/memory.js の OC_LADDER のうち max を超えるものが、DDR4 / DDR5 に限って選べる。
(function (root) {
  'use strict';

  // 種別ごとの代表的な速度(MT/s)。実在する規格の速度のみ。LPDDR4X は 3733 / 4266、LPDDR5 は 5500 / 6400
  const LADDER = {
    DDR4: [2133, 2400, 2666, 2933, 3200, 3600],
    DDR5: [4800, 5200, 5600, 6000, 6400, 7200, 8000],
    LPDDR4X: [3733, 4266],
    LPDDR5: [5500, 6400],
    LPDDR5X: [6400, 7500, 8000, 8533, 9600],
  };

  const ARK = 'Intel ARK';
  const AMD = 'AMD 公式(amd.com の仕様一覧・製品ページ、2026-11-06)';
  const o = (type, max, s, src) => ({ type, max, s, src });

  // 128 bit(2ch)が既定。EPYC 7401 だけ 8ch(512 bit)
  const T = {};
  const add = (ids, ref, opts, bits) => { ids.forEach((id) => { T[id] = { ref, bits: bits || 128, opts }; }); };

  // ---- Intel ----
  add(['intel-adl-12900k'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 4800, 'pub', ARK)]);
  add(['intel-adl-12700k', 'intel-adl-12600k', 'intel-adl-12100'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 4800, 'pub', ARK)]);
  add(['intel-rpl-13900k', 'intel-rpl-13700k', 'intel-rpl-13600k'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-rpl-14900k', 'intel-rpl-14700hx', 'intel-rpl-13980hx'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-rpl-14700k', 'intel-rpl-14600k'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-arl-285k', 'intel-arl-265k', 'intel-arl-275hx'], { type: 'DDR5', mts: 6400 }, [o('DDR5', 6400, 'pub', ARK)]);
  add(['intel-mtl-185h'], { type: 'LPDDR5X', mts: 7467 }, [o('LPDDR5X', 7467, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-ptl-x9-386h'], { type: 'LPDDR5X', mts: 9600 }, [o('LPDDR5X', 9600, 'pub', ARK), o('DDR5', 7200, 'pub', ARK)]);
  add(['intel-ptl-x9-388h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h'], { type: 'LPDDR5X', mts: 9600 }, [o('LPDDR5X', 9600, 'pub', ARK)]);

  // ---- AMD ----
  add(['amd-zen1-1800x', 'amd-zen1-1500x', 'amd-zen1-1200'], { type: 'DDR4', mts: 2666 }, [o('DDR4', 2666, 'pub', AMD)]);
  add(['amd-zenplus-2700x', 'amd-zenplus-2600x', 'amd-raven-2400g', 'amd-raven-2200g'], { type: 'DDR4', mts: 2933 }, [o('DDR4', 2933, 'pub', AMD)]);
  add(['amd-zen3-5800x', 'amd-zen3-5800x3d', 'amd-zen3-5600x', 'amd-zen3-5950x'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'pub', AMD)]);
  add(['amd-zen3-5800u'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'pub', AMD), o('LPDDR4X', 4266, 'pub', AMD + '(公式の表記は LPDDR4-4266)')]);
  add(['amd-zen3p-7735hs'], { type: 'DDR5', mts: 4800 }, [o('DDR5', 4800, 'pub', AMD), o('LPDDR5', 6400, 'pub', AMD)]);
  add(['amd-zen4-7700', 'amd-zen4-7800x3d', 'amd-zen4-7950x3d', 'amd-zen4-7950x', 'amd-zen4-7945hx'], { type: 'DDR5', mts: 5200 }, [o('DDR5', 5200, 'pub', AMD)]);
  add(['amd-zen5-9700x', 'amd-zen5-9800x3d', 'amd-zen5-9950x3d', 'amd-zen5-9950x'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'pub', AMD)]);
  add(['amd-zen4-7840hs'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'pub', AMD), o('LPDDR5X', 7500, 'pub', AMD)]);
  add(['amd-strix-hx370', 'amd-kraken-350'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'pub', AMD), o('LPDDR5X', 8000, 'pub', AMD)]);
  add(['amd-epyc-7401'], { type: 'DDR4', mts: 2666 }, [o('DDR4', 2666, 'pub', AMD)], 512);

  // ---- メモリ固定(オンパッケージ。2026-11-12 追加) ----
  // Lunar Lake は LPDDR5X がプロセッサーと同じパッケージに載り、種別・速度・容量が型番で決まる(ユーザーは選べない)。選択肢(上の表)には載せず、ここに固定値を持つ。
  // 値は Intel ARK の原ページ(2026-11-12 に Chrome で確認 [公表])。ARK の表記は 268V が「最大メモリ 32GB」「LPDDR5X 8533 MT/s まで」「最大 2 チャネル」、258V は 32GB、256V は 16GB(どちらも 8533・2 チャネル)。
  // 評価(メモリ係数・ST/MT・電力)には使わない(表に無い id は従来どおり係数 1)。表示と保存データの移行だけに使う。
  const FIXED_SRC = 'Intel ARK(2026-11-12 確認)';
  const fx = (gb, sku) => ({ type: 'LPDDR5X', mts: 8533, gb, onPackage: true, fixed: true, s: 'pub', src: FIXED_SRC + ' https://www.intel.com/content/www/us/en/products/sku/' + sku + '/specifications.html' });
  const FIXED = {
    'intel-lnl-268v': fx(32, 240958),
    'intel-lnl-258v': fx(32, 240957),
    'intel-lnl-256v': fx(16, 240954),
  };

  // Apple M シリーズ(2026-11-13 追加。ユーザー指示「SoC のパッケージ上に実装されているものだけを固定する」。docs/research/onpackage-memory-2026-11-13.md)。
  // 種別・速度は固定(読み取り専用)。容量は 1 型番に複数の公式構成があるので gb は配列(選択肢)で、既定 defaultGb を持つ。
  //   defaultGb: プリセットは容量を持たない(cfg.memory は種別・速度・バス幅・帯域だけ)ので、選択肢の最小(= 基本構成)を既定とする。容量は評価に使わない。
  //   s: オンパッケージの根拠の区分(M1・M3/Pro/Max は Apple Newsroom の custom package で [公表]、それ以外は Wikipedia で [二次])。
  //   typeS: 種別・速度の区分。Apple は LPDDR の種別と MT/s を公表しない(Support・Newsroom は容量と帯域のみ)ので、全件 [二次](Wikipedia)。
  //   gbS: 容量の構成の区分。Apple Support の技術仕様ページの標準構成 + Configurable to で [公表]。
  //   M3 Max は 16 コア CPU 版(プリセットの 12P+4E)の一覧(14 コア CPU 版は 36 / 96GB で含めない)。
  //   M5 Max はプリセットが GPU 構成を持たず(40 コア版か 32 コア版か決められない)、両版の公式構成(40 コア: 48/64/128、32 コア: 36)を合わせた一覧にする。
  const NEWS = 'Apple Newsroom';
  const SUP = 'Apple Support';
  const US = 'https://support.apple.com/en-us/';
  const ap = (type, mts, gb, onS, ground, urls, extra) => ({
    type, mts, gb, defaultGb: gb[0], onPackage: true, fixed: true, s: onS, typeS: 'sec', gbS: 'pub',
    src: `オンパッケージ: ${ground}。種別・速度: Wikipedia [二次](Apple は非公表)。容量の構成: ${SUP}(2026-11-13) ${urls.map((u) => US + u).join(' 、')}` + (extra ? `。${extra}` : ''),
  });
  const GR_PUB = (u) => `${NEWS} の custom package の記述 [公表] ${u}`;
  const GR_SEC = (w) => `Wikipedia の ${w} [二次](Apple 公式の文言は未取得)`;
  Object.assign(FIXED, {
    'apple-m1': ap('LPDDR4X', 4266, [8, 16], 'pub', GR_PUB('https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/'), ['111883']),
    'apple-m1pro': ap('LPDDR5', 6400, [16, 32], 'sec', GR_SEC('Apple M1(memory on package)'), ['111902', '111901']),
    'apple-m1max': ap('LPDDR5', 6400, [32, 64], 'sec', GR_SEC('Apple M1(memory on package)'), ['111901', '111900']),
    'apple-m1ultra': ap('LPDDR5', 6400, [64, 128], 'sec', GR_SEC('Apple M1(memory on package)。Newsroom の packaging architecture は 2 ダイの接続の話'), ['111900'], '速度 6400 はプリセットの既存の記録'),
    'apple-m2': ap('LPDDR5', 6400, [8, 16, 24], 'sec', GR_SEC('Apple M2(system-in-a-package)'), ['111867', '111837']),
    'apple-m2pro': ap('LPDDR5', 6400, [16, 32], 'sec', GR_SEC('Apple M2(system-in-a-package)'), ['111340', '111837']),
    'apple-m2max': ap('LPDDR5', 6400, [32, 64, 96], 'sec', GR_SEC('Apple M2(system-in-a-package)'), ['111340', '111835'], '96GB は GPU 38 コア版のみ'),
    'apple-m2ultra': ap('LPDDR5', 6400, [64, 128, 192], 'sec', GR_SEC('Apple M2(system-in-a-package)'), ['111835']),
    'apple-m3': ap('LPDDR5', 6400, [8, 16, 24], 'pub', GR_PUB('https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/'), ['117735']),
    'apple-m3pro': ap('LPDDR5', 6400, [18, 36], 'pub', GR_PUB('同上(M3 ファミリー)'), ['117736', '117737']),
    'apple-m3max': ap('LPDDR5', 6400, [48, 64, 128], 'pub', GR_PUB('同上(M3 ファミリー)'), ['117736', '117737'], '16 コア CPU 版(プリセットの 12P+4E)の一覧。14 コア CPU 版は 36 / 96GB'),
    'apple-m4': ap('LPDDR5X', 7500, [16, 24, 32], 'sec', GR_SEC('Apple M4(packaged with LPDDR5X unified memory。on-package の明記ではない)'), ['121552', '121555']),
    'apple-m4pro': ap('LPDDR5X', 8533, [24, 48, 64], 'sec', GR_SEC('Apple M4(packaged with LPDDR5X unified memory。on-package の明記ではない)'), ['121555', '121553'], '64GB は Mac mini の構成'),
    'apple-m5': ap('LPDDR5X', 9600, [16, 24, 32], 'sec', GR_SEC('Apple M5(unified memory in a single package)'), ['125405']),
    'apple-m5max': ap('LPDDR5X', 9600, [36, 48, 64, 128], 'sec', GR_SEC('Apple M5(unified memory in a single package)。Newsroom の advanced packaging は 2 ダイの接続の話'), ['126318'], 'GPU 40 コア版は 48/64/128GB、GPU 32 コア版は 36GB(既定 36GB は GPU 32 コア版の構成。プリセットは GPU 構成を持たないので両版を合わせた一覧)'),
  });

  // max 以下の LADDER の値 + max 自身(例: 7467 は LADDER に無いが、Intel 185H の対応最大なので足す)
  function speedsOf(type, max) {
    const l = (LADDER[type] || []).filter((v) => v <= max);
    if (!l.includes(max)) l.push(max);
    return l.sort((a, b) => a - b);
  }

  const table = {};
  Object.keys(T).forEach((id) => {
    const e = T[id];
    table[id] = { ref: e.ref, bits: e.bits, options: e.opts.map((x) => ({ type: x.type, speeds: speedsOf(x.type, x.max), max: x.max, s: x.s, src: x.src })) };
  });

  root.SDS_DATA = root.SDS_DATA || {};
  root.SDS_DATA.memory = table;
  root.SDS_DATA.memoryLadder = LADDER;
  root.SDS_DATA.memoryFixed = FIXED;
})(typeof window !== 'undefined' ? window : globalThis);
