// SoC 内蔵 GPU のデータ(2026-11-26 ユーザー指示「GB10 などプリセットにある SoC の iGPU を追加」)。kind:'igpu'・soc:true。
// openclScore: Geekbench 7 の OpenCL チャート(browser.geekbench.com/opencl-benchmarks。2026-11-26 取得。RTX 4060 = 100,000 基準。Primate Labs の集計平均 = [公表])。
//   **Apple・Adreno・Mali はシェーダー数・クロックが非公開(または未取得)なので、モデルの推定は出さない(spec なし)**。公開値だけを持ち、総合スコアではその公開値を GPU の値に使う(画面に明記)。
//   チャートの行は GPU コア数の違う機種を混ぜた平均(Apple の Pro/Max は上位構成が多い)。**Adreno は同じ GPU でも行が割れる**(例: 830 は 14,149 と 4,303)ので、行の多い方・主な行を使い note に書く。
//   Adreno・Mali の GPU 名と SoC の対応は一般に知られる対応([二次]。公式表との照合は未了)。対応が確認できなかった SoC(7 Gen 3・7 Gen 4・7 Gen 1・6 Gen 1・4 Gen 2・720G・8 Elite Extreme Gen 6・Dimensity 9600 Pro・
//   Apple A12〜A18・A19 Pro・A20 Pro の多く・M6 以降)は入れていない(チャートに行がない、または行が割れて特定できない)。Jetson AGX Orin・Switch 2 の T239 はチャートに行がなく、仕様も未確認で未追加。
//   Intel: Arc 140T(Arrow Lake H)は行が 18,615〜42,921 に広く割れる(共有メモリ容量別の行)ため入れていない。Arc Graphics(Meteor Lake)は Arrow Lake H の行と混在するため入れていない。
// 仕様(モデルを使う 2 件): GB10 = NVIDIA の公式仕様表(CUDA コア 6144・LPDDR5X 256bit 273 GB/s)。ブーストクロック 2525MHz は Tom's Hardware のみ([二次]。NVIDIA は非公表)。
//   Thor = NVIDIA の IGX/Jetson T5000 のデータシート(Blackwell 2560 コア・273 GB/s・GPU 最大 1.57GHz。[公表])。Thor のチャート行は未取得。
(function (root) {
  'use strict';
  const s = (id, name, brand, uarch, openclScore, note, spec) => Object.assign({ id, name, kind: 'igpu', soc: true, brand, uarch, openclScore, s: 'sec' }, spec || {}, note ? { note } : {});
  const spec = (shaders, boostMHz, bwGBs, memNote) => ({ shaders, boostMHz, bwGBs, memNote, bwS: 'pub' });
  const socgpus = [
    s('nv-gb10-gpu', 'GB10 の GPU(DGX Spark)', 'NVIDIA', 'Blackwell', 115190, 'CUDA コア 6144・273 GB/s は NVIDIA の仕様表。クロック 2525MHz は Tom\'s Hardware のみ([二次])', spec(6144, 2525, 273, 'LPDDR5X 256bit')),
    s('nv-thor-gpu', 'Thor の GPU(Jetson AGX Thor T5000)', 'NVIDIA', 'Blackwell', null, 'チャートの行は未取得。推定は GB10 の校正から', spec(2560, 1570, 273, 'LPDDR5X 256bit')),
    s('apple-m1-gpu', 'Apple M1 の GPU', 'Apple', 'Apple GPU', 17147, 'チャートの "M1" 行。VM の行(5,116)は除外'),
    s('apple-m1pro-gpu', 'Apple M1 Pro の GPU', 'Apple', 'Apple GPU', 37388),
    s('apple-m1max-gpu', 'Apple M1 Max の GPU', 'Apple', 'Apple GPU', 63775, 'チャートに "M2 Max (G14C B1)" 27,916 のような別行もあるが M1 Max は 1 行'),
    s('apple-m1ultra-gpu', 'Apple M1 Ultra の GPU', 'Apple', 'Apple GPU', 95771),
    s('apple-m2-gpu', 'Apple M2 の GPU', 'Apple', 'Apple GPU', 23842),
    s('apple-m2pro-gpu', 'Apple M2 Pro の GPU', 'Apple', 'Apple GPU', 45621),
    s('apple-m2max-gpu', 'Apple M2 Max の GPU', 'Apple', 'Apple GPU', 80621, '"M2 Max (G14C B1)" の 27,916 は別行(VM 等)として除外'),
    s('apple-m2ultra-gpu', 'Apple M2 Ultra の GPU', 'Apple', 'Apple GPU', 117965),
    s('apple-m3-gpu', 'Apple M3 の GPU', 'Apple', 'Apple GPU', 27467),
    s('apple-m3pro-gpu', 'Apple M3 Pro の GPU', 'Apple', 'Apple GPU', 45604),
    s('apple-m3max-gpu', 'Apple M3 Max の GPU', 'Apple', 'Apple GPU', 90022),
    s('apple-m4-gpu', 'Apple M4 の GPU', 'Apple', 'Apple GPU', 32145),
    s('apple-m4pro-gpu', 'Apple M4 Pro の GPU', 'Apple', 'Apple GPU', 63638, '"M4 Pro (G16S B1)" の 39,367 は別行として除外'),
    s('apple-m5-gpu', 'Apple M5 の GPU', 'Apple', 'Apple GPU', 43231),
    s('apple-m5max-gpu', 'Apple M5 Max の GPU', 'Apple', 'Apple GPU', 145011),
    s('apple-a18pro-gpu', 'Apple A18 Pro の GPU', 'Apple', 'Apple GPU', 18485),
    s('qc-adreno640', 'Adreno 640(Snapdragon 855)', 'Qualcomm', 'Adreno', 1202),
    s('qc-adreno650', 'Adreno 650(Snapdragon 865)', 'Qualcomm', 'Adreno', 1344),
    s('qc-adreno660', 'Adreno 660(Snapdragon 888)', 'Qualcomm', 'Adreno', 2100),
    s('qc-adreno642', 'Adreno 642(Snapdragon 780G)', 'Qualcomm', 'Adreno', 2898),
    s('qc-adreno730', 'Adreno 730(Snapdragon 8 Gen 1・8+ Gen 1)', 'Qualcomm', 'Adreno', 6130),
    s('qc-adreno732', 'Adreno 732(Snapdragon 7+ Gen 3)', 'Qualcomm', 'Adreno', 6024),
    s('qc-adreno735', 'Adreno 735(Snapdragon 8s Gen 3)', 'Qualcomm', 'Adreno', 6015),
    s('qc-adreno740', 'Adreno 740(Snapdragon 8 Gen 2)', 'Qualcomm', 'Adreno', 7247),
    s('qc-adreno750', 'Adreno 750(Snapdragon 8 Gen 3)', 'Qualcomm', 'Adreno', 10524),
    s('qc-adreno825', 'Adreno 825(Snapdragon 8s Gen 4)', 'Qualcomm', 'Adreno', 9942),
    s('qc-adreno830', 'Adreno 830(Snapdragon 8 Elite)', 'Qualcomm', 'Adreno', 14149, '行が割れる: "QUALCOMM Adreno(TM) 830" 14,149 と "Adreno (TM) 830" 4,303。多い方の行を使用'),
    s('qc-adreno840', 'Adreno 840(Snapdragon 8 Elite Gen 5)', 'Qualcomm', 'Adreno', 16212.5, '2 行(17,088 / 15,336)の平均'),
    s('qc-adreno8cx3', 'Adreno 8cx Gen 3(Snapdragon 8cx Gen 3)', 'Qualcomm', 'Adreno', 1422, '行が割れる(1,422 / 967)。大きい方を使用'),
    s('mt-g710mc10', 'Mali-G710 MC10(Dimensity 9000)', 'MediaTek', 'Mali', 5588),
    s('mt-g715mc11', 'Immortalis-G715 MC11(Dimensity 9200)', 'MediaTek', 'Mali', 8117),
    s('mt-g720mc12', 'Immortalis-G720 MC12(Dimensity 9300)', 'MediaTek', 'Mali', 10014),
    s('mt-g925mc12', 'Immortalis-G925 MC12(Dimensity 9400)', 'MediaTek', 'Mali', 12022),
    s('mt-g1ultramc12', 'Mali-G1-Ultra MC12(Dimensity 9500)', 'MediaTek', 'Mali', 14005),
    s('mt-g610mc6', 'Mali-G610 MC6(Dimensity 8200)', 'MediaTek', 'Mali', 3881),
    s('intel-arc-b390', 'Intel Arc B390(Panther Lake)', 'Intel', 'Xe3', 52095, '行が割れる: "Arc B390 GPU" 52,095 と "Arc(tm) B390 (PTL)" 16,903。大きい方を使用'),
  ];
  const presetIgpu = {
    'nv-gb10': { igpuId: 'nv-gb10-gpu' }, 'nv-thor': { igpuId: 'nv-thor-gpu' },
    'apple-m1': { igpuId: 'apple-m1-gpu' }, 'apple-m1pro': { igpuId: 'apple-m1pro-gpu' }, 'apple-m1max': { igpuId: 'apple-m1max-gpu' }, 'apple-m1ultra': { igpuId: 'apple-m1ultra-gpu' },
    'apple-m2': { igpuId: 'apple-m2-gpu' }, 'apple-m2pro': { igpuId: 'apple-m2pro-gpu' }, 'apple-m2max': { igpuId: 'apple-m2max-gpu' }, 'apple-m2ultra': { igpuId: 'apple-m2ultra-gpu' },
    'apple-m3': { igpuId: 'apple-m3-gpu' }, 'apple-m3pro': { igpuId: 'apple-m3pro-gpu' }, 'apple-m3max': { igpuId: 'apple-m3max-gpu' },
    'apple-m4': { igpuId: 'apple-m4-gpu' }, 'apple-m4pro': { igpuId: 'apple-m4pro-gpu' }, 'apple-m5': { igpuId: 'apple-m5-gpu' }, 'apple-m5max': { igpuId: 'apple-m5max-gpu' }, 'apple-a18pro': { igpuId: 'apple-a18pro-gpu' },
    'qc-855': { igpuId: 'qc-adreno640' }, 'qc-865': { igpuId: 'qc-adreno650' }, 'qc-888': { igpuId: 'qc-adreno660' }, 'qc-780g': { igpuId: 'qc-adreno642' },
    'qc-8gen1': { igpuId: 'qc-adreno730' }, 'qc-8plus-gen1': { igpuId: 'qc-adreno730' }, 'qc-7plus-gen3': { igpuId: 'qc-adreno732' }, 'qc-8s-gen3': { igpuId: 'qc-adreno735' },
    'qc-8gen2': { igpuId: 'qc-adreno740' }, 'qc-8gen3': { igpuId: 'qc-adreno750' }, 'qc-8s-gen4': { igpuId: 'qc-adreno825' }, 'qc-8elite': { igpuId: 'qc-adreno830' },
    'qc-8elite-gen5': { igpuId: 'qc-adreno840' }, 'qc-8cx-gen3': { igpuId: 'qc-adreno8cx3' },
    'mt-9000': { igpuId: 'mt-g710mc10' }, 'mt-9200': { igpuId: 'mt-g715mc11' }, 'mt-9300': { igpuId: 'mt-g720mc12' }, 'mt-9400': { igpuId: 'mt-g925mc12' }, 'mt-9500': { igpuId: 'mt-g1ultramc12' }, 'mt-8200': { igpuId: 'mt-g610mc6' },
    'intel-ptl-x9-388h': { igpuId: 'intel-arc-b390' },
  };
  if (typeof window !== 'undefined') {
    window.SDS_DATA = window.SDS_DATA || {};
    window.SDS_DATA.socgpus = socgpus;
    window.SDS_DATA.presetIgpu = Object.assign(window.SDS_DATA.presetIgpu || {}, presetIgpu);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { socgpus, presetIgpu };
})(typeof window !== 'undefined' ? window : globalThis);
