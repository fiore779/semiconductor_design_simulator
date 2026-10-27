// パッケージ基板(設計書 §3.6 を転記。2026-10-27)。
// 値は { v, s } 。s: 'pub'=公表 / 'sec'=二次 / 'tmp'=仮値(未取得。画面に「仮値」と表示。校正には使わない)。
// 未取得で仮値も置かないものは null。仮値の根拠は note に書く。
window.SDS_DATA = window.SDS_DATA || {};
(function () {
  const pub = (v, note) => ({ v, s: 'pub', ...(note ? { note } : {}) });
  const sec = (v, note) => ({ v, s: 'sec', ...(note ? { note } : {}) });
  const tmp = (v, note) => ({ v, s: 'tmp', note });
  window.SDS_DATA.substrates = [
    {
      id: 'organic', name: '有機基板(ABF 等)',
      conductivityWmK: sec(0.3, 'FR4 相当。ABF/BT 実機の値は未取得'),
      cteppmK: pub(20, 'ABF Tg171℃。有機一般は 12〜18'),
      minLSum: pub(5, 'SAP で 5/5。新 ABF で 2/2'),
      bumpPitchUm: sec(150, 'C4 約130〜176'),
      dk: pub(3.3), df: pub(0.0044),
      maxPackageMm2: sec(7200, '有機基板 7200mm² の搭載例'),
      costRel: pub(1, '基準'),
      bwDensity: sec('1.8 Tbps/mm² (Marvell OMIB)'),
    },
    {
      id: 'organic-bridge', name: '有機 + Si ブリッジ(EMIB / CoWoS-L)',
      conductivityWmK: tmp(0.3, '有機基板に準じる仮値'),
      cteppmK: null,
      minLSum: sec(2, '有機 RDL(Marvell OMIB) 2/2'),
      bumpPitchUm: sec(45, 'EMIB 45 / EMIB-T 36〜35 / UCIe-A 25〜55'),
      dk: null, df: null,
      maxPackageMm2: pub(2500, 'CoWoS-L 約3倍レチクル級を実証。Granite Rapids-AP 70×105mm'),
      costRel: tmp(1.5, '数値未取得。インターポーザ不要で超大型向けに安価との定性のみ → 仮値'),
      energyPjBit: sec(0.25, 'EMIB-T 約0.25 pJ/bit'),
    },
    {
      id: 'si-interposer', name: 'Si インターポーザ(CoWoS-S)',
      conductivityWmK: sec(150, 'Si'),
      cteppmK: pub(2.65, 'Si 2.6〜2.7'),
      minLSum: null,
      bumpPitchUm: pub(45, 'μバンプ 30〜60'),
      dk: null, df: null,
      maxPackageMm2: pub(2700, '3.3 倍レチクルまで'),
      costRel: tmp(3, '数値未取得。大面積で相対コスト最高との定性のみ → 仮値'),
      energyPjBit: null,
    },
    {
      id: 'glass', name: 'ガラスコア基板',
      conductivityWmK: sec(1.1, '1.0〜1.2。Si より大幅に低く放熱が課題'),
      cteppmK: pub(3, '低 CTE ガラス約3、別ガラス8、ホウケイ酸約3.2'),
      minLSum: sec(2, '2/2 (Resonac)、1.5/1.5 (Ushio)'),
      bumpPitchUm: null,
      dk: sec(5, '約4.5〜5.5(ガラス種で大きく違う。ベンダー値で信頼度低)'),
      df: sec(0.0025, '約0.002〜0.003。別記事では <0.001'),
      maxPackageMm2: null, panelNote: '510×515mm パネル(Intel)。パネル寸法でありパッケージ単体の上限ではない',
      costRel: tmp(2, '未取得 → 仮値'),
      warpNote: '有機比で基板反りが30〜40%低減(Amkor/STATS 測定)。Intel は「パターン歪み50%減、配線密度10倍」と発表',
      availability: '量産時期は未確定(Intel は今年代後半、報道では2030頃、SEMCO は2027年後半を目標、Absolics は遅延中)',
    },
    {
      id: 'fanout', name: 'ファンアウト(InFO / FOCoS)',
      conductivityWmK: null, cteppmK: null,
      minLSum: sec(2, 'CoWoS-R の RDL は最小ピッチ4(2/2 相当)。FOCoS パネル 5/8'),
      bumpPitchUm: sec(45, 'UCIe-A を CoWoS-R に載せた例'),
      dk: null, df: null, maxPackageMm2: null,
      costRel: tmp(2, '未取得。Si インターポーザより安価との定性のみ → 仮値'),
      energyPjBit: null,
    },
  ];
})();
