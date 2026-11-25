// 英語表示の辞書(GPU 評価ダイアログ)。${n} は差し込み位置。
(function (root) {
  'use strict';
  if (!root.I18N) return;
  root.I18N.add({
    'GPU': 'GPU', 'GPU(dGPU・iGPU)の Geekbench 7 OpenCL スコアの推定': 'Estimate of Geekbench 7 OpenCL scores for GPUs (dGPU and iGPU)',
    'GPU 評価': 'GPU evaluation', 'GPU を選ぶ': 'Choose a GPU', '計算機': 'Calculator',
    'iGPU(確度:低。メモリ帯域は典型構成の [推定]・標本の幅が大きい)': 'iGPU (confidence: low. Memory bandwidth is an [estimate] for a typical configuration; the samples spread widely)',
    'dGPU(デスクトップ向け)': 'dGPU (desktop)',
    '世代': 'Architecture', '帯域 GB/s': 'Bandwidth GB/s', '公開値 OpenCL': 'Published OpenCL', '推定': 'Estimate', '差': 'Diff', '±10%': '±10%',
    '(推定)': '(est.)', '校正のみ(同世代 1 件)': 'Calibration only (1 per architecture)',
    'シェーダー数': 'Shaders', 'クロック MHz': 'Clock MHz', 'メモリ帯域 GB/s': 'Memory bandwidth GB/s',
    '3 つとも 0 より大きい数を入れてください。': 'Enter a number greater than 0 in all three fields.',
    '推定できません(この世代のデータがありません)。': 'Cannot estimate (no data for this architecture).',
    '推定 OpenCL スコア ${1}(TFLOPS ${2}。この SKU の公開値 ${3}。RTX 4060 = 100,000)': 'Estimated OpenCL score ${1} (TFLOPS ${2}; published value for this SKU ${3}; RTX 4060 = 100,000)',
    'Geekbench 7 GPU(OpenCL)のスコアを、シェーダー数・クロック・メモリ帯域から推定します。公開値はチャートの平均([公表])、仕様は Wikipedia([二次]。公式との照合は未了)。SKU 別の特別な係数はありません。': 'Estimates the Geekbench 7 GPU (OpenCL) score from shader count, clock and memory bandwidth. Published values are the chart averages ([published]); specifications come from Wikipedia ([secondary]; not yet checked against official pages). There are no per-SKU coefficients.',
    '±10% 以内: dGPU ${1}・iGPU ${2}(係数は同じデータで当てた学習内の値。iGPU は同じ世代の iGPU の中央値で校正し、1 件だけの世代は検証できません)。': 'Within ±10%: dGPU ${1}, iGPU ${2} (coefficients are fitted on the same data, so in-sample. iGPUs are calibrated on the median of the same architecture; an architecture with a single iGPU cannot be validated).',
    'iGPU のメモリ帯域は CPU と共有です。ここでは理論値で、GPU が実際に使える分は小さくなります(その差は iGPU の u に含まれます)。': 'The iGPU shares its memory bandwidth with the CPU. The value here is theoretical; what the GPU can actually use is smaller (that gap is absorbed in the iGPU u).'
  });
})(typeof window !== 'undefined' ? window : globalThis);
