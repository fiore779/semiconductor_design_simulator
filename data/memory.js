// メモリ構成の選択肢(設計書 §5.2.4)。プリセット id ごとに、基準構成(ref)・バス幅・選べる種別と速度の候補を持つ。
// ここに無い id(メモリ固定のチップ、混合・D モード)は選択肢を出さず、メモリ係数は 1。
// 速度は種別ごとの代表的な離散値(LADDER)のうち、そのチップの対応最大(max)以下のもの + max 自身。**対応最大を超える値は出さない**(OC・EXPO は対象外)。
// s: 対応最大の出典区分 'pub'(Intel ARK など公式) / 'sec'(Wikipedia など二次)。出典は src。
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
  const WIKI = 'Wikipedia';
  const o = (type, max, s, src) => ({ type, max, s, src });

  // 128 bit(2ch)が既定。EPYC 7401 だけ 8ch(512 bit)
  const T = {};
  const add = (ids, ref, opts, bits) => { ids.forEach((id) => { T[id] = { ref, bits: bits || 128, opts }; }); };

  // ---- Intel ----
  add(['intel-adl-12900k'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 4800, 'pub', ARK)]);
  add(['intel-adl-12700k', 'intel-adl-12600k', 'intel-adl-12100'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'sec', WIKI + ' Alder Lake'), o('DDR5', 4800, 'sec', WIKI + ' Alder Lake')]);
  add(['intel-rpl-13900k', 'intel-rpl-13700k', 'intel-rpl-13600k'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'sec', WIKI + ' Raptor Lake'), o('DDR5', 5600, 'sec', WIKI + ' Raptor Lake')]);
  add(['intel-rpl-14900k', 'intel-rpl-14700hx'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-rpl-14700k', 'intel-rpl-14600k'], { type: 'DDR5', mts: 5600 }, [o('DDR4', 3200, 'sec', WIKI + ' Raptor Lake'), o('DDR5', 5600, 'sec', WIKI + ' Raptor Lake')]);
  add(['intel-arl-285k', 'intel-arl-265k', 'intel-arl-275hx'], { type: 'DDR5', mts: 6400 }, [o('DDR5', 6400, 'pub', ARK)]);
  add(['intel-mtl-185h'], { type: 'LPDDR5X', mts: 7467 }, [o('LPDDR5X', 7467, 'pub', ARK), o('DDR5', 5600, 'pub', ARK)]);
  add(['intel-ptl-x9-386h'], { type: 'LPDDR5X', mts: 9600 }, [o('LPDDR5X', 9600, 'pub', ARK), o('DDR5', 7200, 'pub', ARK)]);
  add(['intel-ptl-x9-388h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h'], { type: 'LPDDR5X', mts: 9600 }, [o('LPDDR5X', 9600, 'pub', ARK)]);

  // ---- AMD ----
  add(['amd-zen1-1800x', 'amd-zen1-1500x', 'amd-zen1-1200'], { type: 'DDR4', mts: 2666 }, [o('DDR4', 2666, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zenplus-2700x', 'amd-zenplus-2600x', 'amd-raven-2400g', 'amd-raven-2200g'], { type: 'DDR4', mts: 2933 }, [o('DDR4', 2933, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zen3-5800x', 'amd-zen3-5600x', 'amd-zen3-5950x'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zen3-5800u'], { type: 'DDR4', mts: 3200 }, [o('DDR4', 3200, 'sec', WIKI + ' List of AMD Ryzen processors'), o('LPDDR4X', 4266, 'sec', WIKI + ' List of AMD Ryzen processors(表記は LPDDR4-4266)')]);
  add(['amd-zen3p-7735hs'], { type: 'DDR5', mts: 4800 }, [o('DDR5', 4800, 'sec', WIKI + ' List of AMD Ryzen processors'), o('LPDDR5', 6400, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zen4-7700', 'amd-zen4-7950x'], { type: 'DDR5', mts: 5200 }, [o('DDR5', 5200, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zen5-9700x', 'amd-zen5-9950x'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-zen4-7840hs'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'sec', WIKI + ' List of AMD Ryzen processors'), o('LPDDR5X', 7500, 'sec', WIKI + ' List of AMD Ryzen processors')]);
  add(['amd-strix-hx370', 'amd-kraken-350'], { type: 'DDR5', mts: 5600 }, [o('DDR5', 5600, 'sec', WIKI + ' List of AMD Ryzen processors'), o('LPDDR5X', 8000, 'sec', WIKI + ' List of AMD Ryzen processors(発売時は 7500。8000 は検索要約のみ)')]);
  add(['amd-epyc-7401'], { type: 'DDR4', mts: 2666 }, [o('DDR4', 2666, 'sec', WIKI + ' Epyc')], 512);

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
})(typeof window !== 'undefined' ? window : globalThis);
