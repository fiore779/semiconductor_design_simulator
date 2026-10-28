// 部品ライブラリ用: 1コア単位の面積(設計書 §2.3 を転記。元のプロセスでの値)。
// キー = { uarch, chip(プリセット id。null ならそのマイクロアーキを載せる全プリセット), nodeId(そのコアが載るダイのプロセス) }。
// 値  = { noL2Mm2, withL2Mm2, l2KB, s, note }。未取得は null。s: 'pub'=公表 / 'sec'=二次・有志のダイ写真注釈による推定。
// 設計書に無い値は作らない。Apple Firestorm(掲示板で食い違い)・Avalanche/Everest(未取得)・Carmel(L2 込みか未確認)は入れない
// (入れないものは blocklib.build が「推定」(ダイ面積×仮の比率÷コア数)か「未取得」にする)。
// 注意: Real World Tech の値は投稿者自身が「ざっくり」と断っており、L2 の按分の仕方が不明なので L2 込みの値は参考扱い。
window.SDS_DATA = window.SDS_DATA || {};
window.SDS_DATA.blocklibAreas = [
  { uarch: 'Zen 1', chip: null, nodeId: 'gf-14', noL2Mm2: 5.5, withL2Mm2: 7, l2KB: 512, s: 'pub', note: 'Zeppelin(14nm)。AMD の ISSCC 資料(4コアのブロックで 44 mm²、L3 16 mm² 込み)。L2 なしは 7 − 1.5(L2 512KB)の計算値' },
  { uarch: 'Oryon Prime', chip: 'qc-8elite', nodeId: 'tsmc-n3e', noL2Mm2: 2.14, withL2Mm2: 5.22, l2KB: 6144, s: 'sec', note: 'Snapdragon 8 Elite の Oryon L(性能)。ダイ写真の注釈(Real World Tech 掲示板)。L2 込みは 6MB L2 の按分' },
  { uarch: 'Oryon Performance', chip: 'qc-8elite', nodeId: 'tsmc-n3e', noL2Mm2: 0.91, withL2Mm2: 1.9, l2KB: 2048, s: 'sec', note: 'Snapdragon 8 Elite の Oryon M(効率)。ダイ写真の注釈(Real World Tech 掲示板)。L2 2MB' },
  { uarch: 'Cortex-X925', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 2.784, withL2Mm2: 3.335, l2KB: 2048, s: 'sec', note: 'Dimensity 9400(3nm)。ダイ写真の注釈(Baidu Tieba、Real World Tech 掲示板経由)。L2 2MB' },
  { uarch: 'Cortex-X4', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 1.405, withL2Mm2: 1.687, l2KB: 1024, s: 'sec', note: 'Dimensity 9400(3nm)。同上。L2 1MB' },
  { uarch: 'Cortex-A720', chip: 'mt-9400', nodeId: 'tsmc-n3e', noL2Mm2: 0.816, withL2Mm2: 0.976, l2KB: 512, s: 'sec', note: 'Dimensity 9400(3nm)。同上。L2 0.5MB' },
  { uarch: 'Zen 4', chip: null, nodeId: 'tsmc-n5', noL2Mm2: null, withL2Mm2: 3.84, l2KB: 1024, s: 'pub', note: '5nm。報道(L2 1MB 込み)。L2 なしの値は未取得' },
  { uarch: 'Golden Cove', chip: null, nodeId: 'intel-7', noL2Mm2: 5.37, withL2Mm2: 7.43, l2KB: 1280, s: 'sec', note: 'Alder Lake(Intel 7)。出典 Locuza(ダイ写真の注釈)。設計書 §2.8.4(Locuza の推定値)' },
];
