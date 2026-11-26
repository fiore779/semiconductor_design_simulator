// 英語表示の辞書(GPU 評価ダイアログ)。${n} は差し込み位置。
(function (root) {
  'use strict';
  if (!root.I18N) return;
  root.I18N.add({
    'CPU プリセット': 'CPU presets', '実在チップ(CPU・SoC)のプリセットを選ぶ': 'Choose a preset of a real chip (CPU / SoC)',
    'GPU プリセット': 'GPU presets', 'GPU(dGPU・iGPU)のプリセットを選ぶ。Geekbench 7 OpenCL スコアの推定': 'Choose a GPU (dGPU / iGPU) preset. Estimates the Geekbench 7 OpenCL score',
    '総合スコア': 'Combined score', '今の CPU と選んだ GPU を合わせた総合スコア(キャッシュ共有は半分ずつ)': 'Combined score of the current CPU and the chosen GPU (a shared cache is split in half)',
    'GPU を選ぶ・仕様を変えて推定': 'Choose a GPU / change its specs and estimate', 'この GPU を選ぶ': 'Choose this GPU', '選択中: なし': 'Selected: none',
    '選択中: 1': 'Selected: 1', '選択中: 1(「総合スコア」で CPU と合わせます)': 'Selected: 1 (combine it with the CPU in "Combined score")', '(仕様を変更)': '(specs changed)',
    'CPU + GPU 総合スコア': 'CPU + GPU combined score', 'CPU の重み(%)': 'CPU weight (%)', 'CPU の重み ': 'CPU weight ',
    'CPU と GPU でキャッシュを共有する(半分ずつ)': 'CPU and GPU share the cache (split in half)', '共有容量 MB ': 'Shared capacity MB ', '(既定 = CPU の L3)': '(default = the CPU L3)',
    'CPU の設計を先に読み込んでください(「CPU プリセット」)': 'Load a CPU design first ("CPU presets")', 'GPU を選んでください(「GPU プリセット」)': 'Choose a GPU first ("GPU presets")',
    'CPU 1% / GPU 2%': 'CPU 1% / GPU 2%', '公開値': 'Published', 'CPU ST(Geekbench 7)': 'CPU ST (Geekbench 7)', 'CPU MT(Geekbench 7)': 'CPU MT (Geekbench 7)', 'GPU(1。OpenCL)': 'GPU (1; OpenCL)',
    '公開値ベースの総合は、CPU の公開値と GPU の公開値がそろわないので出せません。': 'The published-value combined score cannot be shown because the CPU and GPU published values are not both available.',
    '公開値ベースの総合との差: 1': 'Difference from the published-value combined score: 1',
    'キャッシュ共有: 共有容量 1 MB を半分ずつ。CPU は L3 2 MB で再評価(共有なしの CPU: ST 3・MT 4)。GPU 側は 5 MB だが、GPU のモデルにキャッシュ容量の項がなく、GPU スコアには反映していない。': 'Shared cache: the shared 1 MB is split in half. The CPU is re-evaluated with 2 MB of L3 (without sharing: ST 3, MT 4). The GPU side gets 5 MB, but the GPU model has no cache-capacity term, so it is not reflected in the GPU score.',
    '基準と重みは本ツールの取り決めで、Geekbench の公式の総合点ではありません。': 'The reference and the weight are conventions of this tool, not an official Geekbench combined score.',
    'この設計は L3 を変えて再評価できません': 'This design cannot be re-evaluated with a different L3',
    'iGPU 搭載時': 'With iGPU', 'dGPU 搭載時': 'With dGPU', '総合スコア(1)': 'Combined score (1)',
    '選択中: dGPU 1 / iGPU 2。総合スコアに使うのは 3(dGPU 優先。片方だけ表示)': 'Selected: dGPU 1 / iGPU 2. Used for the combined score: 3 (dGPU takes priority; only one is shown)',
    'dGPU の選択を解除': 'Clear the dGPU selection', 'iGPU の選択を解除': 'Clear the iGPU selection', 'なし': 'none',
    '(既定 = CPU の L3。iGPU のときだけ使えます)': '(default = the CPU L3; available only for an iGPU)',
    '(この CPU 内蔵。クロックはこの SKU の値)': '(built into this CPU; the clock is this SKU value)',
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
