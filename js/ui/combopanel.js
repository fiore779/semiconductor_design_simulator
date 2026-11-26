// CPU + GPU 総合スコアのダイアログ(設計書 2026-11-26)。ブラウザ専用。CPU は今の設計の評価、GPU は「GPU プリセット」で選んだもの。
// buildCombo は DOM に依存しない純関数(テストで使う)。opts.cpuScores(sharedL3MB|null) → { ok, name, st, mt, stPub, mtPub, l3MB, reason }(main.js が評価する)。
(function (root) {
  'use strict';
  const CB = root.SDS.combo;
  // i: { cpu(共有なしの評価), cpuShared(共有ありの評価。shared のとき), gpu: {pred, pub, name}, w, shared, sharedMB }
  function buildCombo(i) {
    const igpu = !!(i.gpu && i.gpu.kind === 'igpu'); // キャッシュを CPU と共有するのは iGPU だけ(dGPU は別カード・別メモリ)
    const shared = !!i.shared && igpu;
    const cpu = shared && i.cpuShared ? i.cpuShared : i.cpu;
    const out = { shared, slot: igpu ? 'igpu' : 'dgpu', w: CB.clampW(i.w), reason: null, est: null, pub: null, diffPct: null, split: null, cpuUsed: null };
    if (!cpu || !cpu.ok) { out.reason = (cpu && cpu.reason) || 'CPU の設計を先に読み込んでください(「CPU プリセット」)'; return out; }
    if (!i.gpu || i.gpu.pred == null) { out.reason = 'GPU を選んでください(「GPU プリセット」)'; return out; }
    out.split = shared ? CB.sharedSplit(i.sharedMB, true) : null;
    out.cpuUsed = cpu;
    out.est = CB.combined(cpu.st, cpu.mt, i.gpu.pred, out.w);
    // 公開値ベース: CPU の ST・MT の公開値と GPU の公開値がそろうときだけ(共有キャッシュの条件は公開値にないので、共有なしの CPU の公開値)
    out.pub = CB.combined(i.cpu.stPub, i.cpu.mtPub, i.gpu.pub, out.w);
    out.diffPct = out.est != null && out.pub != null ? (out.est / out.pub - 1) * 100 : null;
    return out;
  }

  function openCombo(opts) {
    const { h } = root.SDS.ui.dom; const DG = root.SDS.ui.dialogs; const GP = root.SDS.ui.gpupanel;
    const fmt = (v, d) => (v == null || !isFinite(v) ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d }));
    const base = opts.cpuScores(null);
    const sel = GP.activeSelection(base && base.presetId, base && base.memBwGBs);
    const gpuInfo = sel ? GP.selectionInfo(sel) : null;
    const wI = h('input', { type: 'range', min: '0', max: '100', step: '5', value: '50', id: 'cb-w', 'aria-label': 'CPU の重み(%)' });
    const wL = h('span', { id: 'cb-wl', text: 'CPU 50% / GPU 50%' });
    const shC = h('input', { type: 'checkbox', id: 'cb-sh' });
    const l3 = base && base.ok && typeof base.l3MB === 'number' ? base.l3MB : 0;
    const mbI = h('input', { type: 'number', id: 'cb-mb', min: '0', step: '1', value: String(l3), style: 'width:6em' });
    const out = h('div', { id: 'cb-out', role: 'status', 'aria-live': 'polite' });
    const update = () => {
      shC.disabled = !(gpuInfo && gpuInfo.kind === 'igpu');
      const shared = shC.checked && !shC.disabled; const mb = +mbI.value;
      const w = (+wI.value) / 100; wL.textContent = `CPU ${Math.round(w * 100)}% / GPU ${Math.round((1 - w) * 100)}%`;
      const cpuShared = shared && mb >= 0 ? opts.cpuScores(mb / 2) : null;
      const r = buildCombo({ cpu: base, cpuShared, gpu: gpuInfo, w, shared, sharedMB: mb });
      while (out.firstChild) out.removeChild(out.firstChild);
      if (r.reason) { out.appendChild(h('p', { class: 'warn', text: r.reason })); return; }
      const c = r.cpuUsed;
      out.appendChild(h('table', { class: 'small', style: 'border-collapse:collapse' },
        h('tr', null, h('th', { text: '' }), h('th', { text: '推定' }), h('th', { text: '公開値' })),
        h('tr', null, h('td', { text: 'CPU ST(Geekbench 7)' }), h('td', { text: fmt(c.st) }), h('td', { text: fmt(base.stPub) })),
        h('tr', null, h('td', { text: 'CPU MT(Geekbench 7)' }), h('td', { text: fmt(c.mt) }), h('td', { text: fmt(base.mtPub) })),
        h('tr', null, h('td', { text: `GPU(${gpuInfo.name}。OpenCL)` }), h('td', { text: gpuInfo.usePub ? '(公開値を使用)' : fmt(gpuInfo.pred) }), h('td', { text: fmt(gpuInfo.pub) })),
        h('tr', null, h('th', { text: `総合スコア(${GP.slotLabel(r.slot)})` }), h('th', { text: fmt(r.est) }), h('th', { text: fmt(r.pub) }))));
      out.appendChild(h('p', { text: r.diffPct == null ? '公開値ベースの総合は、CPU の公開値と GPU の公開値がそろわないので出せません。' : `公開値ベースの総合との差: ${r.diffPct >= 0 ? '+' : ''}${r.diffPct.toFixed(1)}%` }));
      if (r.shared && r.split) out.appendChild(h('p', { class: 'small', text: `キャッシュ共有: 共有容量 ${fmt(mb, 1)} MB を半分ずつ。CPU は L3 ${fmt(r.split.cpuMB, 1)} MB で再評価(共有なしの CPU: ST ${fmt(base.st)}・MT ${fmt(base.mt)})。GPU 側は ${fmt(r.split.gpuMB, 1)} MB だが、GPU のモデルにキャッシュ容量の項がなく、GPU スコアには反映していない。` }));
    };
    [wI, shC, mbI].forEach((e) => e.addEventListener('input', update));
    shC.addEventListener('change', update);
    update();
    DG.open('CPU + GPU 総合スコア', h('div', { class: 'combo-dialog', style: 'padding:10px 14px;overflow:auto' },
      h('p', { class: 'note', text: `総合 = 1000 × CPU 指数^w × GPU 指数^(1−w)。CPU 指数 = √(ST/${CB.REF.st} × MT/${CB.REF.mt})、GPU 指数 = OpenCL/${CB.REF.gpu.toLocaleString('en-US')}。基準 = Core i9-13980HX + RTX 4060 で 1000 点。基準と重みは本ツールの取り決めで、Geekbench の公式の総合点ではありません。` }),
      h('p', { text: `CPU: ${base && base.ok ? base.name : '(未選択)'}　GPU: ${gpuInfo ? gpuInfo.name : '(未選択)'}` }),
      h('div', null, h('label', null, 'CPU の重み ', wI), ' ', wL),
      h('div', null, h('label', null, shC, ' CPU と GPU でキャッシュを共有する(半分ずつ)'), ' ', h('label', null, '共有容量 MB ', mbI), h('span', { class: 'small', text: '(既定 = CPU の L3。iGPU のときだけ使えます)' })),
      out));
  }

  root.SDS.ui.combopanel = { openCombo, buildCombo };
})(window);
