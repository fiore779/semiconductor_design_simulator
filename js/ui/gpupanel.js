// GPU 評価ダイアログ(設計書 2026-11-25〜。dGPU 52 SKU・iGPU 10 SKU の Geekbench 7 OpenCL スコアの推定)。ブラウザ専用。外部通信なし。
// 上段: 一覧(公開値・推定・差。許容 ±10%)。下段: 計算機(SKU を選び、シェーダー数・クロック・メモリ帯域を変えて推定を見る)。
// buildRows / estimate は DOM に依存しない純関数(テストで使う)。
(function (root) {
  'use strict';
  const GP = root.SDS.gpuperf;
  const TOL = 0.10;
  const isI = (g) => g.kind === 'igpu';
  // ブランド(表示のグループ分け)。SoC 行は brand を持つ。それ以外は世代から決める
  const BRANDS = ['NVIDIA', 'AMD', 'Intel', 'Apple', 'Qualcomm', 'MediaTek'];
  const UARCH_BRAND = { Ampere: 'NVIDIA', Ada: 'NVIDIA', Blackwell: 'NVIDIA', 'RDNA 2': 'AMD', 'RDNA 3': 'AMD', 'RDNA 4': 'AMD', Alchemist: 'Intel', Battlemage: 'Intel', Xe3: 'Intel' };
  const brandOf = (g) => g.brand || UARCH_BRAND[g.uarch] || 'その他';
  const kindLabel = (g) => (g.soc ? 'SoC 内蔵' : isI(g) ? 'iGPU' : 'dGPU');

  // 一覧の行。u は同じ世代・同じ区分(dGPU / iGPU)の中央値。その世代の行がない・1 件だけ(自分自身)のときは検証にならない(selfOnly)
  function buildRows(gpus, igpus) {
    const all = (gpus || []).concat(igpus || []);
    return all.map((g) => {
      const cls = isI(g) ? 'igpu' : 'dgpu';
      const u = GP.uOf(all, g.uarch, undefined, cls);
      const others = all.filter((x) => x.uarch === g.uarch && isI(x) === isI(g) && x.id !== g.id && x.openclScore > 0 && GP.hasSpec(x)).length;
      const pred = GP.predict(g, u);
      const err = pred != null && g.openclScore > 0 ? pred / g.openclScore - 1 : null;
      return { id: g.id, name: g.name, brand: brandOf(g), kind: kindLabel(g), noSpec: !GP.hasSpec(g), cls, uarch: g.uarch, tflops: GP.tflops(g), bwGBs: g.bwGBs, published: g.openclScore, predicted: pred, err, selfOnly: others === 0, ok: err != null && Math.abs(err) <= TOL && others > 0, g };
    });
  }
  // 計算機: SKU の仕様を上書きして推定。u は元の SKU の区分・世代のもの(全 SKU から)
  function estimate(all, id, over) {
    const g0 = all.find((x) => x.id === id); if (!g0) return null;
    const g = Object.assign({}, g0, over || {});
    const u = GP.uOf(all, g0.uarch, undefined, isI(g0) ? 'igpu' : 'dgpu');
    return { tflops: GP.tflops(g), predicted: GP.predict(g, u), published: g0.openclScore };
  }

  // 選んだ GPU(総合スコア用)。id と、計算機で上書きした仕様(あれば)。画面を閉じても残る(保存はしない)
  // 2 枠(dgpu・igpu)。総合スコアに使うのは dGPU 優先(dGPU が選ばれていればそれ、なければ iGPU)
  const slots = { dgpu: null, igpu: null };
  const allData = () => { const D = root.SDS_DATA || {}; return (D.gpus || []).concat(D.igpus || [], D.socgpus || []); };
  function getSelection() { const k = slots.dgpu ? 'dgpu' : slots.igpu ? 'igpu' : null; return k ? Object.assign({ slot: k }, slots[k]) : null; }
  // CPU プリセットに内蔵の iGPU(data/igpus.js の presetIgpu)。クロックはその SKU の値で上書きする。無ければ null
  // memBwGBs: その CPU のメモリ構成の理論帯域(メモリを選べる CPU だけ。js/sim/memory.js)。あれば iGPU の帯域をそれにする(iGPU は CPU とメモリを共有)。固定構成・不明なら iGPU 行の典型値のまま
  function autoIgpu(presetId, memBwGBs) {
    const m = presetId && ((root.SDS_DATA || {}).presetIgpu || {})[presetId]; if (!m) return null;
    const bw = typeof memBwGBs === 'number' && memBwGBs > 0 ? memBwGBs : null;
    return { id: m.igpuId, over: Object.assign(m.boostMHz > 0 ? { boostMHz: m.boostMHz } : {}, bw ? { bwGBs: bw } : {}), auto: true };
  }
  // 総合スコアに使う GPU: dGPU の選択 > iGPU の手動選択 > CPU 内蔵の iGPU(自動)。どれもなければ null
  function activeSelection(presetId, memBwGBs) {
    if (slots.dgpu) return Object.assign({ slot: 'dgpu' }, slots.dgpu);
    if (slots.igpu) return Object.assign({ slot: 'igpu' }, slots.igpu);
    const a = autoIgpu(presetId, memBwGBs); return a ? Object.assign({ slot: 'igpu' }, a) : null;
  }
  const slotLabel = (k) => (k === 'igpu' ? 'iGPU 搭載時' : 'dGPU 搭載時');
  function selectionInfo(sel) {
    const all = allData(); const g0 = all.find((x) => x.id === sel.id); if (!g0) return null;
    const e = estimate(all, sel.id, sel.over);
    const usePub = (!e || e.predicted == null) && g0.openclScore > 0; // 推定モデルのない GPU(Apple・Adreno・Mali など)は公開値を GPU の値に使う
    return { id: g0.id, usePub, name: g0.name + (usePub ? '(推定モデルなし。公開値を使用)' : '') + (sel.auto ? (sel.over && sel.over.boostMHz ? '(この CPU 内蔵。クロックはこの SKU の値' : '(この CPU 内蔵') + (sel.over && sel.over.bwGBs ? '・メモリ帯域はこの CPU のメモリ構成の ' + sel.over.bwGBs.toFixed(1) + ' GB/s' : '') + ')' : sel.over ? '(仕様を変更)' : ''), pred: usePub ? g0.openclScore : e ? e.predicted : null, pub: g0.openclScore, kind: g0.kind || 'dgpu' };
  }
  function openGpuPanel() {
    const { h } = root.SDS.ui.dom; const DG = root.SDS.ui.dialogs;
    const D = root.SDS_DATA || {};
    const gpus = D.gpus || []; const igpus = (D.igpus || []).concat(D.socgpus || []);
    const all = gpus.concat(igpus);
    const rows = buildRows(gpus, igpus);
    const fmt = (v, d) => (v == null || !isFinite(v) ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d }));
    const pct = (e) => (e == null ? '—' : (Math.abs(e) < 0.0005 ? '＝ ' : e > 0 ? '▲ ' : '▼ ') + (e >= 0 ? '+' : '') + (e * 100).toFixed(1) + '%');
    const judge = (r) => (r.noSpec ? '仕様非公開(公開値のみ)' : r.predicted != null && r.published == null ? '公開値なし' : r.err == null ? '—' : r.selfOnly ? '校正のみ(同世代 1 件)' : r.ok ? 'ok' : 'ng');
    const th = (t) => h('th', { scope: 'col', text: t });
    const tbl = (brand) => h('table', { class: 'gpu-table small', style: 'border-collapse:collapse;width:100%' },
      h('caption', null, brand + ' ', h('span', { text: brand === 'NVIDIA' || brand === 'AMD' || brand === 'Intel' ? '(dGPU・iGPU・SoC 内蔵。iGPU・SoC は確度:低。メモリ帯域は典型構成の [推定]・標本の幅が大きい)' : '(SoC 内蔵。シェーダー数・クロックが非公開のため推定なし。公開値のみ)' })),
      h('thead', null, h('tr', null, th('GPU'), th('種別'), th('世代'), th('TFLOPS'), th('帯域 GB/s'), th('公開値 OpenCL'), th('推定'), th('差'), th('±10%'))),
      h('tbody', null, rows.filter((r) => r.brand === brand).map((r) => h('tr', null,
        h('td', { text: r.name }), h('td', { text: r.kind }), h('td', { text: r.uarch }), h('td', { text: r.noSpec ? '—' : fmt(r.tflops, 1) }), h('td', { text: r.noSpec ? '—' : fmt(r.bwGBs, 1) + (r.g.bwS === 'est' ? '(推定)' : '') }),
        h('td', { text: fmt(r.published) }), h('td', { text: fmt(r.predicted) }), h('td', { text: pct(r.err) }), h('td', { text: judge(r) })))));
    const within = (cls) => { const t = rows.filter((r) => r.cls === cls && !r.selfOnly && r.err != null); return `${t.filter((r) => r.ok).length}/${t.length}`; };
    // 計算機
    const brandList = BRANDS.filter((b) => all.some((g) => brandOf(g) === b));
    const sel = h('select', { id: 'gpu-sel', 'aria-label': 'GPU を選ぶ' }, brandList.map((b) => h('optgroup', { label: b }, all.filter((g) => brandOf(g) === b).map((g) => h('option', { value: g.id, text: g.name + '(' + kindLabel(g) + ')' })))));
    const inp = (id, label, step) => { const i = h('input', { type: 'number', id, step: String(step), min: '1', style: 'width:7em' }); return { i, wrap: h('label', { style: 'margin-right:12px' }, label + ' ', i) }; };
    const sh = inp('gpu-sh', 'シェーダー数', 1); const mh = inp('gpu-mhz', 'クロック MHz', 10); const bw = inp('gpu-bw', 'メモリ帯域 GB/s', 0.1);
    const out = h('p', { id: 'gpu-out', role: 'status', 'aria-live': 'polite' });
    const base = () => all.find((x) => x.id === sel.value);
    const read = () => ({ shaders: +sh.i.value, boostMHz: +mh.i.value, bwGBs: +bw.i.value });
    const update = () => {
      const o = read(); const g0 = base();
      if (!GP.hasSpec(g0)) { out.textContent = `仕様(シェーダー数・クロック)が非公開のため推定できません。公開値 ${fmt(g0.openclScore)} を総合スコアに使います(RTX 4060 = 100,000)`; return; }
      if (!(o.shaders > 0 && o.boostMHz > 0 && o.bwGBs > 0)) { out.textContent = '3 つとも 0 より大きい数を入れてください。'; return; }
      const e = estimate(all, g0.id, o);
      out.textContent = e.predicted == null ? '推定できません(この世代のデータがありません)。' : `推定 OpenCL スコア ${fmt(e.predicted)}(TFLOPS ${fmt(e.tflops, 2)}。この SKU の公開値 ${fmt(e.published)}。RTX 4060 = 100,000)`;
    };
    const load = () => { const g = base(); const ok = GP.hasSpec(g); sh.i.value = ok ? g.shaders : ''; mh.i.value = ok ? g.boostMHz : ''; bw.i.value = ok ? g.bwGBs : ''; [sh.i, mh.i, bw.i].forEach((i) => { i.disabled = !ok; }); update(); };
    sel.addEventListener('change', load); [sh.i, mh.i, bw.i].forEach((i) => i.addEventListener('input', update));
    load();
    const curText = () => {
      const act = getSelection(); const nm = (k) => (slots[k] ? selectionInfo(slots[k]).name : 'なし');
      return `選択中: dGPU ${nm('dgpu')} / iGPU ${nm('igpu')}。総合スコアに使うのは ${act ? slotLabel(act.slot) + '(' + selectionInfo(act).name + ')' : 'なし'}(dGPU 優先。片方だけ表示)`;
    };
    const cur = h('p', { id: 'gpu-cur', role: 'status', 'aria-live': 'polite', text: curText() });
    const clear = (k) => h('button', { type: 'button', class: 'btn', id: 'gpu-clr-' + k, onclick: () => { slots[k] = null; cur.textContent = curText(); } }, k === 'igpu' ? 'iGPU の選択を解除' : 'dGPU の選択を解除');
    const pick = h('button', { type: 'button', class: 'btn primary', id: 'gpu-pick', onclick: () => { const o = read(); const g0 = base(); const same = !GP.hasSpec(g0) || o.shaders === g0.shaders && o.boostMHz === g0.boostMHz && o.bwGBs === g0.bwGBs; slots[g0.kind === 'igpu' ? 'igpu' : 'dgpu'] = { id: g0.id, over: same ? null : o }; cur.textContent = curText(); } }, 'この GPU を選ぶ');
    DG.open('GPU プリセット', h('div', { class: 'gpu-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: 'Geekbench 7 GPU(OpenCL)のスコアを、シェーダー数・クロック・メモリ帯域から推定します。公開値はチャートの平均([公表])、仕様は Wikipedia([二次]。公式との照合は未了)。SKU 別の特別な係数はありません。' }),
      h('p', { class: 'small', text: `±10% 以内: dGPU ${within('dgpu')}・iGPU/SoC ${within('igpu')}(係数は同じデータで当てた学習内の値。iGPU は同じ世代の iGPU の中央値で校正し、1 件だけの世代は検証できません)。` }),
      h('h3', { text: 'GPU を選ぶ・仕様を変えて推定' }), h('div', { class: 'gpurow' }, h('label', null, 'GPU ', sel), ' ', sh.wrap, mh.wrap, bw.wrap, pick), out, cur, h('div', null, clear('dgpu'), ' ', clear('igpu')),
      h('p', { class: 'small', text: 'iGPU のメモリ帯域は CPU と共有です。ここでは理論値で、GPU が実際に使える分は小さくなります(その差は iGPU の u に含まれます)。' }),
      ...brandList.map((b) => h('div', { style: 'margin-top:10px' }, tbl(b)))));
  }

  root.SDS.ui.gpupanel = { openGpuPanel, buildRows, brandOf, BRANDS, estimate, getSelection, activeSelection, autoIgpu, selectionInfo, slotLabel, TOL };
})(window);
