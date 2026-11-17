// 英語表示の辞書(ダイビュー・3D 表示・sim の注記)。${n} は差し込み位置。
(function (root) {
  'use strict';
  if (!root.I18N) return;
  root.I18N.add({
    // ---- dieview ----
    '模式図(ブロックの大きさ・配置は実チップのものではありません)': 'Schematic (block sizes and placement are not those of the real chip)', 'このモードは推定できません(理由は下の注記を参照)': 'This mode cannot be estimated (see the note below)',
    'P/高性能コア': 'P / performance core', 'E コア': 'E core', 'LP-E コア': 'LP-E core', 'アンコア': 'Uncore', '電力密度': 'Power density', '温度': 'Temperature',
    'WebGL が使えません。ブラウザの設定(ハードウェアアクセラレーション)を確認するか、別のブラウザでお試しください。ダイビューは表示できません。': 'WebGL is unavailable. Check the browser settings (hardware acceleration) or try another browser. The die view cannot be shown.',
    '選択中のブロックはありません': 'No block selected', '選択中: ${1}': 'Selected: ${1}', '選択中: ${1} 個のブロック': 'Selected: ${1} blocks', '最高 ${1} ${2} 付近${3}': 'Max ${1} ${2} near ${3}', '、最低 ${1}': ', min ${1}',
    '${1}のヒートマップ(模式図)。${2}。配置の編集はできません。': 'Heat map of ${1} (schematic). ${2}. The layout cannot be edited.', 'ダイビュー(配置図): ダイ ${1} 個、ブロック ${2} 個。${3}': 'Die view (layout): ${1} die(s), ${2} block(s). ${3}',
    '${1}。矢印キーで選択ブロックを移動、Alt と矢印キーで選択の枠を移動、Esc で選択解除。': '${1}. Arrow keys move the selected block; Alt with arrow keys moves the selection frame; Esc clears the selection.', '面積未取得(仮寸法)': 'Area not obtained (provisional size)', ' 面積未取得': ' area not obtained', 'ほか ': 'and ', ' 件': ' more',
    '⇄ 破線の枠(小さい部品は隅の点)= 移植した部品': '⇄ Dashed frame (a dot in the corner for small parts) = ported part', '斜線 = 面積未取得': 'Hatching = area not obtained', '出所': 'Source', '範囲 ${1} K': 'Range ${1} K',
    // ---- pkggeom / pkgview3d ----
    'コンデンサの位置は模式(根拠なし)': 'Capacitor positions are schematic (no basis)', 'この種類は実物の上面にコンデンサが無いので描いていません': 'Not drawn because this type has no capacitors on the top surface of the real product',
    '実物の配置は未確認のため描いていません': 'Not drawn because the real layout has not been confirmed', '。蓋の下にあるため、蓋を透明にしたときに見えます(不透明の蓋では見えません)': '. They are under the lid, so they are visible when the lid is made transparent (not visible with an opaque lid)',
    '。基板の向きに合わせて 90° 回した位置は推定': '. The position rotated by 90° to match the substrate orientation is estimated', 'コンデンサの位置は${1}の実物写真に基づく模式(個数・サイズは目安)${2}${3}': 'Capacitor positions are a schematic based on a photo of the real ${1} (counts and sizes are approximate)${2}${3}',
    '3D は模式図。形状・厚みは実物と異なります': 'The 3D view is schematic. Shapes and thicknesses differ from the real product', '編集は 2D 表示で行います(3D では選択のみ)': 'Edit in the 2D view (selection only in 3D)', '蓋を表示': 'Show the lid', '蓋は半透明': 'Lid is translucent', '蓋は非表示': 'Lid is hidden',
    '${1}のヒートマップ。': 'Heat map of ${1}. ', '出所で色分け(${1} 種類)。': 'Colored by source (${1} kinds). ', 'パッケージの 3D 表示(模式図): ダイ ${1} 個${2}': 'Package 3D view (schematic): ${1} die(s)${2}',
    '、ブロック ${1} 個。${2}${3}。${4}。矢印キーで選択の枠を移動、Shift と矢印キーで回転、プラスとマイナスで拡大縮小、Esc で選択解除。編集は 2D 表示で行います。': ', ${1} block(s). ${2}${3}. ${4}. Arrow keys move the selection frame, Shift with arrow keys rotates, plus and minus zoom, Esc clears the selection. Edit in the 2D view.',
    '(面積未取得・仮寸法)': '(area not obtained, provisional size)', '⇄ = 移植した部品': '⇄ = ported part', '薄い色 = 面積未取得': 'Pale color = area not obtained',
    // ---- viewhost ----
    '表示': 'Show', '半透明': 'Translucent', '非表示': 'Hide', 'ドラッグ=回転 / ホイール=拡大縮小 / 右ドラッグ・Shift+ドラッグ=移動 / 矢印キー=回転、+ −=拡大縮小': 'Drag = rotate / wheel = zoom / right-drag or Shift+drag = pan / arrow keys = rotate, + − = zoom',
    'ブロックのドラッグ=移動、ハンドル=サイズ変更(編集はこの 2D 表示で)': 'Drag a block = move, handle = resize (edit in this 2D view)', 'ダイビューの表示方式とカメラ': 'Die view mode and camera', '3D 表示': '3D view', '2D 編集': '2D edit', '3D 表示 / 2D 編集の切替': 'Switch between 3D view and 2D edit',
    'カメラ': 'Camera', '上から': 'Top', '斜め': 'Oblique', '横から': 'Side', '下から': 'Bottom', 'リセット': 'Reset', 'ヒートスプレッダ(金属の蓋)の表示': 'Show the heat spreader (metal lid)', '蓋: ': 'Lid: ',
    'ラベル(ブロック名・ダイ名・寸法)を表示': 'Show labels (block name, die name, size)', 'ラベル ': 'Labels ', '表示の注記': 'Display notes', '3D 表示を開始できなかったため 2D 表示です': 'Showing 2D because the 3D view could not start', '${1} 表示に切り替えられませんでした': 'Could not switch to the ${1} view',
    // ---- sim/area ----
    'ダイ${1}: 面積が未取得': 'Die ${1}: area not obtained', 'ダイ${1}: ノード ${2} が不明': 'Die ${1}: node ${2} is unknown', '${1}: ウェハ価格が未取得': '${1}: wafer price not obtained', '${1}: 欠陥密度 D0 が未取得': '${1}: defect density D0 not obtained',
    'ダイ${1}: 良品数が 0 以下(面積が大きすぎる)': 'Die ${1}: good die count is 0 or less (the area is too large)', '基板未指定のため基板コストを含まない': 'Substrate cost is not included because no substrate is specified', '基板 ${1} が不明': 'Substrate ${1} is unknown',
    '${1}: 相対コストが未取得': '${1}: relative cost not obtained', '${1}: 基板コストは仮値': '${1}: the substrate cost is a provisional value',
    // ---- sim/heatmap ----
    'ブロックの大きさ・配置は模式図で、ブロックへの電力の按分は根拠のない仮の重み。分布の形は目安であり、実チップの温度分布ではない': 'Block sizes and placement are schematic, and the power apportioned to blocks uses unfounded provisional weights. The shape of the distribution is a guide, not the real chip\'s temperature distribution',
    '全体の電力が不正です(有限の 0 以上の数値が必要)': 'The total power is invalid (a finite number of 0 or more is required)', 'コアのクロック差(ダイ・種別ごとの動作周波数の違い)は無視している(ブロックにクロックの情報が無いため)': 'Clock differences between cores (differences in operating frequency per die and type) are ignored (blocks carry no clock information)',
    '按分できるブロックがありません(重みの合計が 0)': 'There are no blocks to apportion to (the total weight is 0)', 'セルに割り当てられず電力が反映されないブロックがある(ダイ外・大きさ 0 など): ${1}': 'Some blocks could not be assigned to cells, so their power is not reflected (outside the die, size 0, etc.): ${1}',
    '重なっているブロックは先に定義されたものを優先し、電力は二重計上していない: ${1}': 'For overlapping blocks the one defined first takes priority and power is not double-counted: ${1}', 'tMeanTargetC が不正です': 'tMeanTargetC is invalid',
    '§6.2 の k_hot(仮の経験式)は使わず、2D 熱拡散の結果の ΔT をそのまま使う': 'The provisional empirical formula k_hot of §6.2 is not used; the ΔT from the 2D heat diffusion is used as-is',
    '横方向の広がりはシリコンの熱伝導(kSi×tDie)、縦方向の分は呼び出し側の平均温度から逆算、全ダイは共通の蓋温度を共有。TIM・蓋・冷却器の分は仮置き': 'Lateral spread uses the silicon thermal conduction (kSi×tDie); the vertical part is back-calculated from the caller\'s average temperature; all dies share a common lid temperature. TIM, lid and cooler contributions are placeholders',
    'spreadMm / kLat は廃止(後方互換のため受けるが無視)': 'spreadMm / kLat are deprecated (accepted for backward compatibility but ignored)', 'tMeanTargetC が周囲温度以下のため、一様な温度で返した': 'Returned a uniform temperature because tMeanTargetC is at or below the ambient temperature',
    '平均温度の目標が低くシリコンの厚み方向の抵抗だけで超えるため、TIM・蓋・冷却器の分を 0 とした': 'The target average temperature is low and is exceeded by the silicon through-thickness resistance alone, so the TIM, lid and cooler contributions were set to 0',
    '§6.2 の k_hot(仮の経験式)の代わりに、2D 熱拡散の結果の ΔT をそのまま使う': 'Instead of the provisional empirical formula k_hot of §6.2, the ΔT from the 2D heat diffusion is used as-is', '一様': 'Uniform',
    // ---- sim/memory ----
    'このチップはメモリ構成を選べません(メモリが SoC に固定、または混合設計です)': 'The memory configuration cannot be chosen for this chip (the memory is fixed to the SoC, or this is a mixed design)', 'メモリ構成の形式が違います(type と mts が必要です)': 'The memory configuration format is wrong (type and mts are required)',
    'メモリ構成の oc は true か未指定にしてください': 'The oc of the memory configuration must be true or unspecified', 'このチップは ${1} に対応していません(対応: ${2})': 'This chip does not support ${1} (supported: ${2})', '${1} はメモリ OC できません(OC は DDR4 / DDR5 のみ)': '${1} cannot be overclocked (OC is DDR4 / DDR5 only)',
    '${1}-${2} は OC の選択肢にありません(OC: ${3} MT/s)': '${1}-${2} is not among the OC choices (OC: ${3} MT/s)', '${1}-${2} はこのチップの対応範囲外です(${3} は ${4} MT/s。対応最大を超える速度はメモリ OC で選びます)': '${1}-${2} is outside this chip\'s supported range (${3} is ${4} MT/s; speeds above the supported maximum are chosen with memory OC)',
    'メモリ ${1}(基準構成。補正なし)': 'Memory ${1} (base configuration; no correction)', '、遅延 ${1}→${2} ns(種別の代表値)': ', latency ${1}→${2} ns (representative value of the type)', '、遅延は未取得(帯域のみ)': ', latency not obtained (bandwidth only)',
    'メモリ ${1}(基準 ${2})。理論帯域 ${3}→${4} GB/s${5}': 'Memory ${1} (base ${2}). Theoretical bandwidth ${3}→${4} GB/s${5}', 'MT 係数 ${1}(範囲 ${2}〜${3})': 'MT factor ${1} (range ${2}–${3})',
    'メモリ構成による係数は推定(確度:低。感度は MT 帯域弾性 0.14〜0.27(GB7 実測の区間ごとの値)・ST 0.05〜0.12(GB5/GB6 の参考値)。GB7 の ST 実測は 0 件で、帯域と遅延は分離できていない)': 'The factor from the memory configuration is an estimate (confidence: low; sensitivity is MT bandwidth elasticity 0.14–0.27 (per-interval values from GB7 measurements) and ST 0.05–0.12 (GB5/GB6 reference values); there are 0 GB7 ST measurements and bandwidth and latency cannot be separated)',
    'メモリ OC は安定動作を保証しません。この速度での動作は推定(確度:低)です': 'Memory OC does not guarantee stable operation. Operation at this speed is an estimate (confidence: low)', 'この OC 速度は GB7 の実測(DDR5-8000 まで・9950X の MT のみ)の範囲外で、外挿です(確度:低)': 'This OC speed is outside the GB7 measurements (up to DDR5-8000, MT of the 9950X only) and is an extrapolation (confidence: low)',
    // ---- sim/perf ----
    'uarch 未指定': 'uarch not specified', 'クロック未取得': 'Clock not obtained', 'in-order コアは仮の IPC(根拠なし)': 'An in-order core uses a provisional IPC (no basis)', '幅・ROB が未取得のため計算できない': 'Cannot compute because width and ROB were not obtained', 'コアなし': 'No cores',
    '補正係数なし(校正データ不足)': 'No correction factor (insufficient calibration data)', 'calibrate: mode は \'rep\' か \'all\'(受け取った値: ${1})': 'calibrate: mode must be \'rep\' or \'all\' (received: ${1})',
    '電力 W に応じた連続式(c=${1}、指数 ${2}。min(1, c·W^指数))': 'A continuous formula of power in W (c=${1}, exponent ${2}; min(1, c·W^exponent))', '${1} コアのクロック未取得': 'Clock of ${1} cores not obtained', '${1} コア: ${2}': '${1} cores: ${2}',
    '使える代表 SKU がないため σ は既定値のまま': 'σ stays at its default because there is no usable representative SKU',
    // ---- sim/power ----
    'クロック(fGHz)が未取得': 'Clock (fGHz) not obtained', 'メモリチャネル数が未取得のため、メモリ分のアンコアは含めていない': 'The memory uncore is not included because the memory channel count was not obtained', 'L3 容量が未取得のため、L3 分のアンコアは含めていない': 'The L3 uncore is not included because the L3 capacity was not obtained',
    'power.base(PBP/TDP)が未取得': 'power.base (PBP/TDP) not obtained', 'コア構成なし': 'No core configuration', '${1} コアの baseGHz が未取得': 'baseGHz of ${1} cores not obtained', 'モデル電力が 0 以下': 'The model power is 0 or less',
    // ---- sim/thermal ----
    'power.js を先に読み込んでください': 'Load power.js first', 'area.js を先に読み込んでください': 'Load area.js first', '冷却 ${1} が不明': 'Cooling ${1} is unknown', '${1}: 熱伝導率が未取得': '${1}: thermal conductivity not obtained',
    'ダイ面積が未取得または 0': 'Die area not obtained or 0', '発熱するタイルの面積が全て未取得(Base タイルは発熱しないので熱の面積から除く)': 'The area of every heat-generating tile has not been obtained (the Base tile generates no heat, so it is excluded from the thermal area)', 'ダイ面積が全て未取得': 'No die area has been obtained',
    '発熱するダイのうち面積が未取得が ${1} 個あり、熱抵抗は取得済みのダイの合計で計算': '${1} heat-generating die(s) have no obtained area, so the thermal resistance is computed from the sum of the dies that have one', '熱暴走の恐れ(Tj が反復で収束しない)': 'Risk of thermal runaway (Tj does not converge in iteration)',
    '冷却不足(クロックを下限まで下げても Tj ${1}℃ が上限 ${2}℃ を超える)': 'Insufficient cooling (even at the lowest clock, Tj ${1} °C exceeds the ${2} °C limit)', '電力制限を満たせない(クロックを下限まで下げても超える)': 'Cannot meet the power limit (exceeded even at the lowest clock)'
  });
})(typeof window !== 'undefined' ? window : globalThis);
