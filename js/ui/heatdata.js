// ヒートマップ用データの組み立て(設計書 §6・§8.12)。DOM に依存しない。Node でテストする。
// 総電力は powerModel.estW、平均温度は thermal.tjC(どちらも推定・確度低)。分布の形は js/sim/heatmap.js の模式図。
(function (root) {
  'use strict';
  const HM = (root.SDS && root.SDS.sim && root.SDS.sim.heatmap) || (typeof require === 'function' ? require('../sim/heatmap.js') : null);
  const EXTRA = '総電力・温度は推定(確度:低)';
  const SCHEMATIC = 'ブロックの大きさ・配置と電力の按分は模式図・仮の重み。実チップの分布ではありません';

  // 戻り値: { ok:true, data:{kind,dies,legend,note}, notes } か { ok:false, reason }
  // kind: 'power' | 'temp'。ctx は省略可(ctx.cooling に冷却一覧を渡せる。省略時は SDS_DATA.cooling)
  function buildHeatmap(design, evaluation, kind, ctx) {
    if (kind !== 'power' && kind !== 'temp') return { ok: false, reason: `表示の種類 ${kind} は対象外です` };
    if (!HM) return { ok: false, reason: 'ヒートマップの計算が読み込まれていません' };
    if (!design || !Array.isArray(design.dies) || !design.dies.length) return { ok: false, reason: '設計がありません' };
    const pm = evaluation && evaluation.powerModel;
    if (!pm || !pm.ok || !(typeof pm.estW === 'number' && isFinite(pm.estW))) {
      return { ok: false, reason: `電力モデルが使えないため表示できません${pm && pm.reason ? `: ${pm.reason}` : ''}` };
    }
    // 総電力の基準: 温度は、平均温度 Tj(thermal.tjC)と整合する持続時の電力(thermal.powerW)。電力密度は制限なしの全コア負荷の推定(estW)
    const th0 = evaluation.thermal;
    const useSustained = kind === 'temp' && th0 && th0.ok && typeof th0.powerW === 'number' && isFinite(th0.powerW);
    const totalW = useSustained ? th0.powerW : pm.estW;
    const basis = useSustained ? `総電力 ${totalW.toFixed(0)} W(持続時。平均温度と整合)` : `総電力 ${totalW.toFixed(0)} W(全コア負荷・最大クロック・電力制限なし)`;
    const bp = HM.blockPowers(design, totalW);
    if (!bp.ok) return { ok: false, reason: bp.reason };
    const pg = HM.powerDensityGrid(design, bp.byBlock);
    let fields; // [{ g, field }]
    if (kind === 'power') {
      fields = pg.grids.map((g) => ({ g, field: g.rho }));
    } else {
      const th = evaluation.thermal;
      if (!th || !th.ok) return { ok: false, reason: `温度を推定できないため表示できません${th && th.reason ? `: ${th.reason}` : ''}` };
      if (th.tjC == null || !isFinite(th.tjC)) return { ok: false, reason: '熱暴走の恐れ(温度が収束しない)ため、温度分布は表示できません' };
      const cl = ((ctx && ctx.cooling) || (root.SDS_DATA && root.SDS_DATA.cooling) || []).find((c) => c.id === th.coolingId);
      const sol = HM.solveTemperature(pg.grids, { tMeanTargetC: th.tjC, tAmbientC: cl && typeof cl.tAmbC === 'number' ? cl.tAmbC : 25 });
      if (sol.ok === false) return { ok: false, reason: sol.reason || '温度分布を計算できません' };
      fields = pg.grids.map((g) => ({ g, field: sol.dies.find((r) => r.dieId === g.dieId).T }));
    }
    // 凡例の最小・最大は全ダイ共通にする(ダイごとに色の基準が変わらないよう、連結して正規化)
    let total = 0; fields.forEach((f) => { total += f.field.length; });
    const all = new Float32Array(total); let off = 0;
    fields.forEach((f) => { all.set(f.field, off); off += f.field.length; });
    const colored = HM.toColors(all, kind);
    off = 0;
    const dies = fields.map((f) => {
      const n = f.field.length; const values = colored.values.slice(off, off + n); off += n;
      return { dieId: f.g.dieId, nx: f.g.nx, ny: f.g.ny, values, cellMm: f.g.cellMm };
    });
    // 画面内に重ねる注記は短く(長い説明はダイビュー下の注記に出す)
    const note = `模式図・仮の重み・推定(確度:低)。${basis}`;
    // 凡例の最小・最大・単位・表示範囲・最高セルのダイ名をテキストでも示す(画面の凡例は canvas で読み上げられないため)
    const lg = colored.legend; const fmtV = kind === 'temp' ? (v) => v.toFixed(1) : (v) => String(Number(v.toPrecision(3)));
    let legendText = '';
    if (lg && isFinite(lg.min) && isFinite(lg.max)) {
      if (lg.uniform) legendText = `一様(${fmtV(lg.min)} ${lg.unit})`;
      else {
        let hot = null; let best = -1;
        dies.forEach((d) => { d.values.forEach((v) => { if (v > best) { best = v; hot = d.dieId; } }); });
        const hd = hot && design.dies.find((x) => x.id === hot);
        legendText = `最小 ${fmtV(lg.min)} 〜 最大 ${fmtV(lg.max)} ${lg.unit}${hd ? `(最高はダイ「${hd.name || hd.id}」)` : ''}。表示範囲 ${fmtV(lg.max - lg.min)} ${kind === 'temp' ? 'K' : lg.unit}`;
      }
    }
    const local = '制限の判定はダイ平均の温度で行っており、局所(ヒートマップの最高)は上限を超えうる。局所差は TIM を含まず過小寄り';
    return { ok: true, data: { kind, dies, legend: lg, note }, notes: pg.notes || [], totalW, basis, legendText, longNote: `${colored.tentativeNote || HM.NOTE_TENTATIVE}。${EXTRA}。${basis}。${legendText ? `${legendText}。` : ''}${kind === 'temp' ? `${local}。` : ''}` };
  }

  const api = { buildHeatmap, EXTRA, SCHEMATIC };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.heatdata = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
