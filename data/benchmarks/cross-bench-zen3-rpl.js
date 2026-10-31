// GB7 以外のベンチマークの公開スコア(性能予測の誤差の切り分け用。設計書 §5.3.3)。取得 2026-10-31。
// 予測(perf.js)・校正・プリセットには使っていない(参照用の生データ。アプリ・tests からは読み込まない。tools/validate-data.js は全 data/*.js を require する)。
// 区分: 'sec' = [二次](第三者の集計サイト)。原典の個別レビューは確認していない。
// 出典:
//   nbc  = Notebookcheck「Mobile Processors - Benchmark List」 https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html
//          ページは「average」と書くが、一覧の値は SKU ページの個別結果の中央値と一致した(14700HX の GB6、7735HS の R23、5800U の R23 で確認)。
//          個別結果は各社レビュー機(電力設定は機種ごとに違う)。n は SKU ページで確認できたものだけ記録(null = 未確認)。
//          GB7 列は 14700HX・7735HS とも n=1(Geekbench Browser の個別投稿とみられる。推測)。
//   pm   = PassMark CPU Benchmarks(cpu.php / compare)。ユーザー投稿の平均。n = samples(null = ページに表示なし)。
//          行ごとの取得 URL は pmUrl。名前だけの URL は別 SKU に飛ぶことがあるため、ページ上の CPU 名を確認した値だけを入れた。
// 列: r15 = Cinebench R15 [S, M]、r23 = Cinebench R23 [S, M]、zip = 7-Zip 18.03 [S, M](MIPS)、gb5m = Geekbench 5.5 Multi、
//     gb6 = Geekbench 6.7 [S, M]、gb7 = Geekbench 7.0 [S, M](NBC 一覧の値)、bl = Blender 3.3 Classroom(秒。小さいほど速い)、
//     cb24 = Cinebench 2024 [S, M](SKU ページの値。avg と median は note)、pm = PassMark [CPU Mark, Single Thread]。null = 未取得または空欄。
(function (root, factory) {
  const v = factory();
  if (typeof module === 'object' && module.exports) module.exports = v;
  if (root && root.window !== undefined || typeof window !== 'undefined') {
    const w = typeof window !== 'undefined' ? window : root.window;
    w.SDS_DATA = w.SDS_DATA || {};
    w.SDS_DATA.crossBench = v;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SRC = {
    nbc: { url: 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html', date: '2026-10-31', s: 'sec', stat: '中央値(一覧の値)' },
    pm: { url: 'https://www.cpubenchmark.net/', date: '2026-10-31', s: 'sec', stat: 'ユーザー投稿の平均' },
  };
  const PM = 'https://www.cpubenchmark.net/';
  const PM_CMP_ZEN3 = PM + 'compare/3859vs3869vs3870vs6199vs6344/AMD-Ryzen-5-5600X-vs-AMD-Ryzen-7-5800X-vs-AMD-Ryzen-9-5900X-vs-AMD-Ryzen-5-9600X-vs-AMD-Ryzen-7-9800X3D'; // 5600X id=3859、5800X id=3869、5900X id=3870
  const PM_CMP_RPL = PM + 'compare/5717vs5719/Intel-Core-i9-14900K-vs-Intel-Core-i7-14700K'; // 14900K id=5717、14700K id=5719
  const rows = [
    // ---- Zen 3 / Zen 3+(と比較用の Zen 2・Zen 4)----
    { sku: 'Ryzen 7 5800U', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '15(10–25)W', r15: [229, 1613], r23: [1427, 8154], zip: [5362.5, 42603.5], gb5m: 6722.5, gb6: [1865, 7934], gb7: null, bl: null, cb24: null, pm: [17928, 2982], pmN: 997, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+7+5800U', nbcUrl: 'https://www.notebookcheck.net/AMD-Ryzen-7-5800U-Processor-Benchmarks-and-Specs.510374.0.html', note: 'NBC SKU ページ: R23 n=5(30/25W 級 4 機種+電力不明 1)、GB6 n=1(HP ProBook 455 G8)、GB5.5 n=4(ST 中央値 1428.5)' },
    { sku: 'Ryzen 7 5825U', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '15W', r15: [232, 1757], r23: [1452, 10152], zip: [5427, 48177], gb5m: 7074.5, gb6: [1988, 8644], gb7: null, bl: 555, cb24: null, pm: null },
    { sku: 'Ryzen 5 5600U', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '25W(NBC 表記)', r15: [223, 1321], r23: [1371, 7792.5], zip: [5204.5, 37815.5], gb5m: 5773, gb6: [1885, 7232], gb7: null, bl: 798, cb24: null, pm: [14779, 2830], pmN: 1239, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+5+5600U' },
    { sku: 'Ryzen 7 PRO 5850U', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '15W', r15: [227, 1467], r23: [1405, 8716], zip: [5231, 44266], gb5m: 6889, gb6: [1976, 8162], gb7: null, bl: null, cb24: null, pm: null },
    { sku: 'Ryzen 7 5800H', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '45W', r15: [229, 2005], r23: [1416, 12091.5], zip: [5499.5, 54052], gb5m: 7641, gb6: [1991, 9411], gb7: [1855, 9927], bl: 499.5, cb24: null, pm: [20432, 2984], pmN: 10988, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+7+5800U&id=3907', note: 'PassMark: id=3907 は 5800H のページ(URL の cpu= 名と違うが、ページ上の名前 AMD Ryzen 7 5800H を確認)' },
    { sku: 'Ryzen 9 5900HX', uarch: 'Zen 3', kind: 'mobile-pc', tdp: '45W', r15: [240, 2106], r23: [1488, 12845], zip: [5750, 58664], gb5m: 8462, gb6: [1957, 9485], gb7: null, bl: 434, cb24: null, pm: [21961, 3148], pmN: 4267, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+9+5900HX' },
    { sku: 'Ryzen 7 6800U', uarch: 'Zen 3+', kind: 'mobile-pc', tdp: '28W', r15: [242, 1776], r23: [1506, 10546], zip: [5452.5, 50614], gb5m: 7678, gb6: [2028, 8771], gb7: null, bl: 504, cb24: null, pm: [20651, 3197], pmN: 553, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+7+6800U' },
    { sku: 'Ryzen 7 6800H', uarch: 'Zen 3+', kind: 'mobile-pc', tdp: '45W', r15: [242.5, 2136], r23: [1542, 13094], zip: [5758, 58341], gb5m: 9331, gb6: [2056, 9584.5], gb7: null, bl: 392, cb24: null, pm: null },
    { sku: 'Ryzen 9 6900HX', uarch: 'Zen 3+', kind: 'mobile-pc', tdp: '45W', r15: [249, 2231], r23: [1558, 13497], zip: [5817, 61333], gb5m: 9647, gb6: [2148, 10340], gb7: [2186, 12189], bl: 407, cb24: null, pm: null },
    { sku: 'Ryzen 7 7735HS', uarch: 'Zen 3+', kind: 'mobile-pc', tdp: '35W', r15: [248, 2153.4], r23: [1546, 13106], zip: [5786, 58770], gb5m: 9357, gb6: [2098, 9970], gb7: [1897, 9377], bl: 394.5, cb24: [90, 620], pm: [22118, 3232], pmN: 4797, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+7+7735HS', nbcUrl: 'https://www.notebookcheck.net/AMD-Ryzen-7-7735HS-Processor-Benchmarks-and-Specs.681410.0.html', note: 'NBC SKU ページ:R23 n=15(35〜114W)、GB6.7 n=9(ST avg 2085 / MT avg 9426)、GB7 n=1(MSI Bravo 15 C7VE)、CB2024 n=5(avg 89.2 / 671、median 90 / 620)' },
    { sku: 'Ryzen 7 7735U', uarch: 'Zen 3+', kind: 'mobile-pc', tdp: '28W', r15: [234, 1698], r23: [1490, 10085], zip: [5579, 48972], gb5m: 8203, gb6: [2001, 7987], gb7: [2121, 9283], bl: 540, cb24: null, pm: null },
    { sku: 'Ryzen 5 5600X', uarch: 'Zen 3', kind: 'pc', tdp: '65W', r15: [254, 1968], r23: [1541, 11838], zip: [6594, 56607], gb5m: 8980, gb6: [2178, 9023], gb7: null, bl: null, cb24: null, pm: [21820, 3366], pmN: 36499, pmUrl: PM_CMP_ZEN3, note: 'PassMark id=3859' },
    { sku: 'Ryzen 7 5700X', uarch: 'Zen 3', kind: 'pc', tdp: '65W', r15: [253, 2329], r23: [1499, 13184], zip: [6522, 65777], gb5m: 9353, gb6: [2186, 9331], gb7: null, bl: 374, cb24: null, pm: null },
    { sku: 'Ryzen 7 5800X', uarch: 'Zen 3', kind: 'pc', tdp: '105W', r15: [265.5, 2608.5], r23: [1574.5, 15476], zip: [6906.5, 72113.5], gb5m: 10723.5, gb6: [2265, 10035], gb7: [2158, 12035], bl: 336, cb24: null, pm: [27656, 3449], pmN: 26328, pmUrl: PM_CMP_ZEN3, note: 'PassMark id=3869(cpu.php?cpu=AMD+Ryzen+7+5800X&id=3869 でも同じ値)' },
    { sku: 'Ryzen 7 5800X3D', uarch: 'Zen 3', kind: 'pc', tdp: '105W', r15: [241, 2413], r23: [1452, 14317], zip: [6799, 69518], gb5m: 10856, gb6: [2166, 12050], gb7: [2103, 12923], bl: null, cb24: null, pm: [28287, 3234], pmN: 12271, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+7+5800X', note: 'PassMark: id なしの URL が 5800X3D のページを返した(ページ上の名前 AMD Ryzen 7 5800X3D を確認)' },
    { sku: 'Ryzen 9 5900X', uarch: 'Zen 3', kind: 'pc', tdp: '105W', r15: [250, 2695], r23: [1527, 16262], zip: [6582, 90443], gb5m: 11765, gb6: [2290, 13339], gb7: [2190.5, 15008], bl: null, cb24: null, pm: [38879, 3465], pmN: 27790, pmUrl: PM_CMP_ZEN3, note: 'PassMark id=3870' },
    { sku: 'Ryzen 9 5950X', uarch: 'Zen 3', kind: 'pc', tdp: '105W', r15: [266.5, 4324], r23: [1614, 26017], zip: [6851.5, 122978], gb5m: 16248, gb6: [2256, 13355], gb7: [2192, 16256], bl: null, cb24: null, pm: [45240, 3477], pmN: 20011, pmUrl: PM + 'cpu.php?cpu=AMD+Ryzen+9+5950X' },
    { sku: 'Ryzen 7 5700U', uarch: 'Zen 2', kind: 'mobile-pc', tdp: '25W(NBC 表記)', r15: [188, 1480], r23: [1258, 8650], zip: [4568, 40443.5], gb5m: 6254, gb6: [1591, 5643], gb7: null, bl: 698.5, cb24: null, pm: null, note: 'Lucienne(Zen 2)。Zen 3 ではない(比較用)' },
    { sku: 'Ryzen 7 7840HS', uarch: 'Zen 4', kind: 'mobile-pc', tdp: '35W', r15: [278.5, 2564.5], r23: [1775, 16155.5], zip: [6603, 70062.5], gb5m: 11847, gb6: [2663.5, 13065.5], gb7: [2356.5, 13976.5], bl: 319.5, cb24: null, pm: null },
    { sku: 'Ryzen 9 7950X', uarch: 'Zen 4', kind: 'pc', tdp: '170W', r15: [315.5, 5947.5], r23: [2000, 36523], zip: [8118, 157038], gb5m: 23897, gb6: [2969, 19807], gb7: [2744, 25143], bl: 134, cb24: null, pm: null },
    // ---- Raptor Lake / Alder Lake(と比較用の Arrow Lake-HX)----
    { sku: 'Core i7-14700HX', uarch: 'Raptor Cove', kind: 'mobile-pc', tdp: '55(157)W', r15: [296, 3812], r23: [2103, 24595], zip: [6900, 93134], gb5m: 17691, gb6: [2884, 15765], gb7: [2579, 19414], bl: 243, cb24: [118.8, 1209], pm: [36361, 3935], pmN: 2172, pmUrl: PM + 'cpu.php?cpu=Intel+Core+i7-14700HX', nbcUrl: 'https://www.notebookcheck.net/Intel-Core-i7-14700HX-Processor-Benchmarks-and-Specs.790522.0.html', note: 'NBC SKU ページ:R23 n=9(PL 115〜190W)、GB6.7 n=9(ST avg 2789・範囲 2378〜2975 / MT avg 15947・範囲 14163〜17562)、GB7 n=1(Lenovo 83JE)、CB2024 は avg(n=7、ST 100.6〜125.5 / MT 792〜1408)' },
    { sku: 'Core i7-14650HX', uarch: 'Raptor Cove', kind: 'mobile-pc', tdp: '55W', r15: [284, 3799], r23: [1963, 24455], zip: [6364, 93686], gb5m: 16508, gb6: [2744, 15878], gb7: [2456, 17810], bl: 247, cb24: null, pm: [33233, 3836], pmN: null, pmUrl: PM + 'cpu.php?cpu=Intel+Core+i7-14650HX' },
    { sku: 'Core i9-14900HX', uarch: 'Raptor Cove', kind: 'mobile-pc', tdp: '55(157)W', r15: [310.5, 4574], r23: [2181.5, 30055], zip: [7151.5, 115640], gb5m: 20002, gb6: [3013, 17606.5], gb7: [2814.5, 22773.5], bl: 205, cb24: null, pm: [43513, 4160], pmN: 7229, pmUrl: PM + 'cpu.php?cpu=Intel+Core+i9-14900HX' },
    { sku: 'Core i7-13700HX', uarch: 'Raptor Cove', kind: 'mobile-pc', tdp: '55W', r15: [272, 3277], r23: [1875, 20479], zip: [6166, 78076], gb5m: 14435, gb6: [2541, 11793], gb7: [2363, 17187], bl: 274, cb24: null, pm: [31527, 3791], pmN: null, pmUrl: PM + 'cpu.php?cpu=Intel+Core+i7-13700HX' },
    { sku: 'Core i9-13900HX', uarch: 'Raptor Cove', kind: 'mobile-pc', tdp: '55W', r15: [296, 4494.5], r23: [2056, 27900], zip: [6895, 115262], gb5m: 20013.5, gb6: [2871, 16712], gb7: [2586.5, 21840], bl: 202, cb24: null, pm: null },
    { sku: 'Core i9-12900HX', uarch: 'Golden Cove', kind: 'mobile-pc', tdp: '55W', r15: [278, 3566], r23: [1912.5, 23150], zip: [6336, 86541], gb5m: 16311.5, gb6: [2564, 13931], gb7: [2301, 15184], bl: 267, cb24: null, pm: null },
    { sku: 'Core i7-14700K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125(253)W', r15: [313.5, 5035], r23: [2160, 33440.5], zip: [7195.5, 126436], gb5m: 21565, gb6: [2922, 19147], gb7: [2635, 22642], bl: 181.5, cb24: null, pm: [51899, 4453], pmN: 9048, pmUrl: PM_CMP_RPL, note: 'PassMark id=5719' },
    { sku: 'Core i5-14600K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125W', r15: [297, 3640], r23: [2064, 24491], zip: [6910, 93235], gb5m: 17516, gb6: [2879, 17409], gb7: [2628, 19479], bl: 223, cb24: null, pm: null },
    { sku: 'Core i9-14900K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125W', r15: [324.5, 6103], r23: [2262.5, 39399.5], zip: [7932, 145207], gb5m: 25199, gb6: [3243, 21397], gb7: [2909, 22851], bl: 144.5, cb24: null, pm: [58166, 4689], pmN: 13975, pmUrl: PM_CMP_RPL, note: 'PassMark id=5717' },
    { sku: 'Core i7-13700K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125W', r15: [303, 4507.5], r23: [2116, 30745], zip: [7061.5, 111390], gb5m: 20190.5, gb6: [2962, 19249], gb7: [2605, 23052], bl: 176.5, cb24: null, pm: null },
    { sku: 'Core i9-13900K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125W', r15: [318, 5805.5], r23: [2238.5, 38271.5], zip: [7272, 146984], gb5m: 24033, gb6: [3070, 20800], gb7: [2683, 23319], bl: 140.5, cb24: null, pm: null },
    { sku: 'Core i5-13600K', uarch: 'Raptor Cove', kind: 'pc', tdp: '125W', r15: [287.5, 3642], r23: [2000.5, 24221], zip: [6377.5, 89587], gb5m: 16670.5, gb6: [2750, 15890], gb7: [2540, 19219], bl: 224, cb24: null, pm: null },
    { sku: 'Core i9-12900K', uarch: 'Golden Cove', kind: 'pc', tdp: '125W', r15: [289, 4057], r23: [2004.5, 26125], zip: [6575.5, 97315.5], gb5m: 17776, gb6: [2715, 17450], gb7: [2454, 19296], bl: null, cb24: null, pm: null },
    { sku: 'Core i7-12700K', uarch: 'Golden Cove', kind: 'pc', tdp: '125W', r15: [272, 3325], r23: [1850.5, 19784], zip: [6269.5, 73438.5], gb5m: 14016, gb6: [2580, 16200], gb7: [2385, 16879], bl: null, cb24: null, pm: null },
    { sku: 'Core Ultra 9 275HX', uarch: 'Lion Cove', kind: 'mobile-pc', tdp: '55W', r15: [334, 5619.5], r23: [2204, 35589], zip: [6751, 111212], gb5m: 22612, gb6: [3062, 19464], gb7: [2810, 24763], bl: 154.5, cb24: null, pm: null },
  ];
  return { SRC, rows, date: '2026-10-31' };
});
