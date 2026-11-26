// GPU 評価ダイアログ(設計書 2026-11-25〜。dGPU 52 SKU・iGPU 10 SKU の Geekbench 7 OpenCL スコアの推定)。ブラウザ専用。外部通信なし。
// 上段: 一覧(公開値・推定・差。許容 ±10%)。下段: 計算機(SKU を選び、シェーダー数・クロック・メモリ帯域を変えて推定を見る)。
// buildRows / estimate は DOM に依存しない純関数(テストで使う)。
(function (root) {
  'use strict';
  const GP = root.SDS.gpuperf;
  const TOL = 0.10;
  const isI = (g) => g.kind === 'igpu';

  // 一覧の行。u は同じ世代・同じ区分(dGPU / iGPU)の中央値。その世代の行がない・1 件だけ(自分自身)のときは検証にならない(selfOnly)
  function buildRows(gpus, igpus) {
    const all = (gpus || []).concat(igpus || []);
    return all.map((g) => {
      const cls = isI(g) ? 'igpu' : 'dgpu';
      const u = GP.uOf(all, g.uarch, undefined, cls);
      const others = all.filter((x) => x.uarch === g.uarch && isI(x) === isI(g) && x.id !== g.id && x.openclScore > 0).length;
      const pred = GP.predict(g, u);
      const err = pred != null && g.openclScore > 0 ? pred / g.openclScore - 1 : null;
      return { id: g.id, name: g.name, cls, uarch: g.uarch, tflops: GP.tflops(g), bwGBs: g.bwGBs, published: g.openclScore, predicted: pred, err, selfOnly: others === 0, ok: err != null && Math.abs(err) <= TOL && others > 0, g };
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
  let selection = null;
  const allData = () => { const D = root.SDS_DATA || {}; return (D.gpus || []).concat(D.igpus || []); };
  function getSelection() { return selection; }
  function selectionInfo(sel) {
    const all = allData(); const g0 = all.find((x) => x.id === sel.id); if (!g0) return null;
    const e = estimate(all, sel.id, sel.over);
    return { id: g0.id, name: g0.name + (sel.over ? '(仕様を変更)' : ''), pred: e ? e.predicted : null, pub: g0.openclScore, kind: g0.kind || 'dgpu' };
  }
  function openGpuPanel() {
    const { h } = root.SDS.ui.dom; const DG = root.SDS.ui.dialogs;
    const D = root.SDS_DATA || {};
    const gpus = D.gpus || []; const igpus = D.igpus || [];
    const all = gpus.concat(igpus);
    const rows = buildRows(gpus, igpus);
    const fmt = (v, d) => (v == null || !isFinite(v) ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d }));
    const pct = (e) => (e == null ? '—' : (Math.abs(e) < 0.0005 ? '＝ ' : e > 0 ? '▲ ' : '▼ ') + (e >= 0 ? '+' : '') + (e * 100).toFixed(1) + '%');
    const judge = (r) => (r.err == null ? '—' : r.selfOnly ? '校正のみ(同世代 1 件)' : r.ok ? 'ok' : 'ng');
    const th = (t) => h('th', { scope: 'col', text: t });
    const tbl = (cls) => h('table', { class: 'gpu-table small', style: 'border-collapse:collapse;width:100%' },
      h('caption', { text: cls === 'igpu' ? 'iGPU(確度:低。メモリ帯域は典型構成の [推定]・標本の幅が大きい)' : 'dGPU(デスクトップ向け)' }),
      h('thead', null, h('tr', null, th('GPU'), th('世代'), th('TFLOPS'), th('帯域 GB/s'), th('公開値 OpenCL'), th('推定'), th('差'), th('±10%'))),
      h('tbody', null, rows.filter((r) => r.cls === cls).map((r) => h('tr', null,
        h('td', { text: r.name }), h('td', { text: r.uarch }), h('td', { text: fmt(r.tflops, 1) }), h('td', { text: fmt(r.bwGBs, 1) + (r.g.bwS === 'est' ? '(推定)' : '') }),
        h('td', { text: fmt(r.published) }), h('td', { text: fmt(r.predicted) }), h('td', { text: pct(r.err) }), h('td', { text: judge(r) })))));
    const within = (cls) => { const t = rows.filter((r) => r.cls === cls && !r.selfOnly && r.err != null); return `${t.filter((r) => r.ok).length}/${t.length}`; };
    // 計算機
    const sel = h('select', { id: 'gpu-sel', 'aria-label': 'GPU を選ぶ' }, all.map((g) => h('option', { value: g.id, text: g.name })));
    const inp = (id, label, step) => { const i = h('input', { type: 'number', id, step: String(step), min: '1', style: 'width:7em' }); return { i, wrap: h('label', { style: 'margin-right:12px' }, label + ' ', i) }; };
    const sh = inp('gpu-sh', 'シェーダー数', 1); const mh = inp('gpu-mhz', 'クロック MHz', 10); const bw = inp('gpu-bw', 'メモリ帯域 GB/s', 0.1);
    const out = h('p', { id: 'gpu-out', role: 'status', 'aria-live': 'polite' });
    const base = () => all.find((x) => x.id === sel.value);
    const read = () => ({ shaders: +sh.i.value, boostMHz: +mh.i.value, bwGBs: +bw.i.value });
    const update = () => {
      const o = read(); const g0 = base();
      if (!(o.shaders > 0 && o.boostMHz > 0 && o.bwGBs > 0)) { out.textContent = '3 つとも 0 より大きい数を入れてください。'; return; }
      const e = estimate(all, g0.id, o);
      out.textContent = e.predicted == null ? '推定できません(この世代のデータがありません)。' : `推定 OpenCL スコア ${fmt(e.predicted)}(TFLOPS ${fmt(e.tflops, 2)}。この SKU の公開値 ${fmt(e.published)}。RTX 4060 = 100,000)`;
    };
    const load = () => { const g = base(); sh.i.value = g.shaders; mh.i.value = g.boostMHz; bw.i.value = g.bwGBs; update(); };
    sel.addEventListener('change', load); [sh.i, mh.i, bw.i].forEach((i) => i.addEventListener('input', update));
    load();
    const cur = h('p', { id: 'gpu-cur', role: 'status', 'aria-live': 'polite', text: selection ? '選択中: ' + selectionInfo(selection).name : '選択中: なし' });
    const pick = h('button', { type: 'button', class: 'btn primary', id: 'gpu-pick', onclick: () => { const o = read(); const g0 = base(); const same = o.shaders === g0.shaders && o.boostMHz === g0.boostMHz && o.bwGBs === g0.bwGBs; selection = { id: g0.id, over: same ? null : o }; cur.textContent = '選択中: ' + selectionInfo(selection).name + '(「総合スコア」で CPU と合わせます)'; } }, 'この GPU を選ぶ');
    DG.open('GPU プリセット', h('div', { class: 'gpu-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: 'Geekbench 7 GPU(OpenCL)のスコアを、シェーダー数・クロック・メモリ帯域から推定します。公開値はチャートの平均([公表])、仕様は Wikipedia([二次]。公式との照合は未了)。SKU 別の特別な係数はありません。' }),
      h('p', { class: 'small', text: `±10% 以内: dGPU ${within('dgpu')}・iGPU ${within('igpu')}(係数は同じデータで当てた学習内の値。iGPU は同じ世代の iGPU の中央値で校正し、1 件だけの世代は検証できません)。` }),
      h('h3', { text: 'GPU を選ぶ・仕様を変えて推定' }), h('div', { class: 'gpurow' }, h('label', null, 'GPU ', sel), ' ', sh.wrap, mh.wrap, bw.wrap, pick), out, cur,
      h('p', { class: 'small', text: 'iGPU のメモリ帯域は CPU と共有です。ここでは理論値で、GPU が実際に使える分は小さくなります(その差は iGPU の u に含まれます)。' }),
      tbl('dgpu'), h('div', { style: 'height:10px' }), tbl('igpu')));
  }

  root.SDS.ui.gpupanel = { openGpuPanel, buildRows, estimate, getSelection, selectionInfo, TOL };
})(window);
