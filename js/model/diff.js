// 元のチップとの差分(設計書 §8.6)。パラメータの差・結果の差・「元に戻す」。UI に依存しない純関数。
// 項目 id: 'core:<種別>:count' / 'core:<種別>:clock' / 'l3'。
(function (root) {
  'use strict';

  const M = () => (root.SDS && root.SDS.model) || {};
  const clockOf = (g) => g.boostGHz || g.maxGHz || g.baseGHz || 0;
  const same = (a, b) => Math.abs(a - b) < 1e-9;

  // baseCfg と cfg の違い(変更があるものだけ)
  const memApi = () => (root.SDS && root.SDS.sim && root.SDS.sim.memory) || (typeof require === 'function' ? require('../sim/memory.js') : null);

  function paramDiff(design) {
    const out = [];
    if (!design.cfg || !design.baseCfg) return out;
    design.cfg.cores.forEach((g) => {
      const b = design.baseCfg.cores.find((c) => c.type === g.type);
      if (!b) return;
      if (g.count !== b.count) out.push({ id: `core:${g.type}:count`, label: `${g.type} コア数`, before: b.count, after: g.count, unit: '個' });
      if (!same(clockOf(g), clockOf(b))) out.push({ id: `core:${g.type}:clock`, label: `${g.type} クロック`, before: clockOf(b), after: clockOf(g), unit: 'GHz' });
    });
    if (!same(design.cfg.l3MB || 0, design.baseCfg.l3MB || 0)) out.push({ id: 'l3', label: 'L3 容量', before: design.baseCfg.l3MB || 0, after: design.cfg.l3MB || 0, unit: 'MB' });
    // メモリ構成(種別 + 速度)。値は表示用の文字列(例: DDR5-5600)
    // baseCfg に mem が無い(古い設計)ときは、そのチップの基準構成を元とみなす
    const MEM = memApi();
    const mn = design.cfg.mem; const mb = design.baseCfg.mem || (MEM && design.presetId ? MEM.refOf(design.presetId) : null);
    if (mb && mn && (mb.type !== mn.type || mb.mts !== mn.mts || (mb.oc === true) !== (mn.oc === true))) out.push({ id: 'memory', label: 'メモリ構成', before: MEM.label(mb), after: MEM.label(mn), unit: '' });
    return out;
  }

  // 1 項目だけ元に戻す(ロックに関係なく戻せる)。コア数・L3 はブロックを模式図として再配置する。
  // 戻り値: { ok:true, design, relaid }(relaid=true ならブロックを再配置した=手で動かした位置が失われた)
  function revertParam(design, id) {
    const D = M().design;
    if (!design.cfg || !design.baseCfg) return { ok: true, design: D.clone(design), relaid: false };
    const cfg = D.clone(design.cfg);
    let relayout = false;
    if (id === 'l3') { relayout = (cfg.l3MB || 0) !== (design.baseCfg.l3MB || 0); cfg.l3MB = design.baseCfg.l3MB; } else if (id === 'memory') {
      const MEM = memApi(); const ref = design.baseCfg.mem || (MEM && design.presetId ? MEM.refOf(design.presetId) : null);
      if (ref) cfg.mem = D.clone(ref); else delete cfg.mem;
    } else {
      const m = /^core:(.+):(count|clock)$/.exec(id);
      if (m) {
        const g = cfg.cores.find((c) => c.type === m[1]); const b = design.baseCfg.cores.find((c) => c.type === m[1]);
        if (g && b) {
          if (m[2] === 'count') { relayout = g.count !== b.count; g.count = b.count; } else {
            ['boostGHz', 'maxGHz'].forEach((k) => { if (b[k] != null) g[k] = b[k]; else delete g[k]; });
          }
        }
      }
    }
    return { ok: true, design: D.withCfg(design, cfg, relayout), relaid: relayout };
  }

  // すべて元に戻す(cfg=baseCfg)。コア数または L3 が baseCfg と違うときだけブロックを模式図として再配置する
  // (クロックだけの差なら手で動かした位置を保つ)。戻り値: { ok:true, design, relaid }
  function revertAll(design) {
    const D = M().design;
    if (!design.baseCfg) return { ok: true, design: D.clone(design), relaid: false };
    const cur = design.cfg || { cores: [], l3MB: 0 };
    const countsDiffer = cur.cores.length !== design.baseCfg.cores.length
      || design.baseCfg.cores.some((b) => { const g = cur.cores.find((c) => c.type === b.type); return !g || g.count !== b.count; });
    const relayout = countsDiffer || (cur.l3MB || 0) !== (design.baseCfg.l3MB || 0);
    return { ok: true, design: D.withCfg(design, design.baseCfg, relayout), relaid: relayout };
  }

  // 元の cfg に戻した設計の評価(差分の基準)
  function baseEvaluation(design, ctx) {
    const D = M().design; const E = M().evaluate;
    const b = D.clone(design);
    if (b.baseCfg) b.cfg = D.clone(b.baseCfg);
    return E.evaluate(b, ctx);
  }

  function metricDiff(b, n, name) {
    if (!b || !n || !b.ok || !n.ok) {
      const why = [!b || !b.ok ? `元: ${(b && b.reason) || '計算できません'}` : null, !n || !n.ok ? `編集後: ${(n && n.reason) || '計算できません'}` : null].filter(Boolean).join(' / ');
      return { ok: false, before: b && b.ok ? b.score : null, after: n && n.ok ? n.score : null, deltaPct: null, better: null, reason: `${name} の差を計算できません(${why})` };
    }
    const deltaPct = b.score > 0 ? (n.score / b.score - 1) * 100 : null;
    const better = deltaPct == null ? null : Math.abs(deltaPct) < 0.05 ? 'same' : deltaPct > 0 ? 'up' : 'down';
    return { ok: deltaPct != null, before: b.score, after: n.score, deltaPct, better, reason: deltaPct == null ? `${name}: 元の値が 0 のため比を出せません` : null, confidence: n.confidence };
  }

  // 結果の差。ST/MT のどちらかが計算できないときは、その項目の deltaPct は null と理由
  function resultDiff(evalBase, evalNow) {
    return {
      st: metricDiff(evalBase.st, evalNow.st, 'ST'),
      mt: metricDiff(evalBase.mt, evalNow.mt, 'MT'),
      edited: !!evalNow.edited,
      outOfCalibration: evalNow.outOfCalibration || [],
      // 赤い帯の条件になる「確度が低い」は ST だけ(MT は常に低いので固定の注記にとどめる)
      lowConfidence: !!(evalNow.st && evalNow.st.ok && evalNow.st.confidence === 'low'),
      optimistic: !!evalNow.optimistic,
      optimisticReasons: evalNow.optimisticReasons || [],
    };
  }

  // 「性能が上がったか」の要約。verdict: 'up' | 'down' | 'mixed' | 'same' | 'unknown'
  function summary(rd) {
    const word = { up: '上がる', down: '下がる', same: 'ほぼ変わらない' };
    const part = (name, m) => (m.ok ? `${name} は ${m.deltaPct >= 0 ? '+' : ''}${m.deltaPct.toFixed(1)}% で${word[m.better]}` : `${name} は比べられません`);
    const bs = [rd.st.better, rd.mt.better].filter(Boolean);
    let verdict = 'unknown';
    if (bs.length) {
      if (bs.every((b) => b === 'same')) verdict = 'same';
      else if (bs.every((b) => b === 'up' || b === 'same')) verdict = 'up';
      else if (bs.every((b) => b === 'down' || b === 'same')) verdict = 'down';
      else verdict = 'mixed';
    }
    // 片方だけ比べられるときは、比べられた方に限定して書く(「性能が上がる」と言い切らない)
    const scope = rd.st.ok && rd.mt.ok ? 'both' : rd.st.ok ? 'st' : rd.mt.ok ? 'mt' : 'none';
    let text = scope === 'st' ? `${part('ST', rd.st)}(MT は比べられません。予測)`
      : scope === 'mt' ? `${part('MT', rd.mt)}(ST は比べられません。予測)`
        : `${part('ST', rd.st)}、${part('MT', rd.mt)}(予測)`;
    if (rd.lowConfidence) text += '。確度は低いので目安として見てください';
    if (rd.outOfCalibration.length) text += '。校正した範囲の外の変更を含みます';
    return { verdict, text, scope, lowConfidence: !!rd.lowConfidence };
  }

  const api = { paramDiff, revertParam, revertAll, baseEvaluation, resultDiff, summary };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.diff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
