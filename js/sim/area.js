// 面積・歩留まり・コスト(設計書 §4)。UI に依存しない純関数。
// 未取得(null)は 0 などで埋めない。取れない値は null を返し、理由(reasons)を添える。
(function (root) {
  'use strict';

  // ダイ面積の合計。dies: [{ mm2 }]。mm2 が null/非数のダイは未取得として unknownCount に数える。
  function dieAreaMm2(dies) {
    let mm2 = 0; let knownCount = 0; let unknownCount = 0;
    (dies || []).forEach((d) => {
      if (d && typeof d.mm2 === 'number' && isFinite(d.mm2)) { mm2 += d.mm2; knownCount++; } else unknownCount++;
    });
    return { mm2, knownCount, unknownCount };
  }

  // 歩留まり(Poisson モデル)。areaMm2 [mm²]、d0PerCm2 [個/cm²]。
  function yieldRate(areaMm2, d0PerCm2) { return Math.exp((-d0PerCm2 * areaMm2) / 100); }

  // 1 ウェハから取れるダイ数(標準近似式 π(d/2)²/A − πd/√(2A))。
  function diesPerWafer(areaMm2, waferMm) {
    const d = waferMm || 300;
    if (!(areaMm2 > 0)) return 0;
    return Math.max(0, Math.floor((Math.PI * (d / 2) * (d / 2)) / areaMm2 - (Math.PI * d) / Math.sqrt(2 * areaMm2)));
  }

  // コスト指数 = Σ ウェハ価格 ÷ (1 ウェハの良品ダイ数) + 基板の相対コスト。
  // areas[i] と nodeIds[i] は同じダイ。d0ByNode(任意)で D0 を上書きできる。
  // 価格・D0・基板コスト(基板未指定を含む)のどれかが未取得なら total は null(partialTotal に取れた分だけ入れる)。
  function costIndex(args) {
    const D = root.SDS_DATA || {};
    const areas = args.areas || []; const nodeIds = args.nodeIds || [];
    const reasons = []; const parts = []; let sum = 0; let missing = false;
    const miss = (msg) => { missing = true; reasons.push(msg); parts.push(null); };
    areas.forEach((a, i) => {
      const id = nodeIds[i];
      const node = (D.nodes || []).find((n) => n.id === id);
      if (typeof a !== 'number' || !isFinite(a)) return miss(`ダイ${i}: 面積が未取得`);
      if (!node) return miss(`ダイ${i}: ノード ${id} が不明`);
      const price = node.waferUsd && node.waferUsd.v;
      const d0 = (args.d0ByNode && args.d0ByNode[id] != null) ? args.d0ByNode[id] : (node.d0 && node.d0.v);
      if (price == null) return miss(`${node.name}: ウェハ価格が未取得`);
      if (d0 == null) return miss(`${node.name}: 欠陥密度 D0 が未取得`);
      const good = diesPerWafer(a, args.waferMm) * yieldRate(a, d0);
      if (!(good > 0)) return miss(`ダイ${i}: 良品数が 0 以下(面積が大きすぎる)`);
      const c = price / good; parts.push(c); sum += c;
    });
    let substrate = null;
    if (args.substrateId == null) {
      // 基板未指定: 基板コスト抜きの値を合計と誤解させないよう total は null にする(設計書 §4: コスト = ウェハ価格÷良品数 + 基板コスト係数)
      missing = true; reasons.push('基板未指定のため基板コストを含まない');
    } else {
      const sub = (D.substrates || []).find((b) => b.id === args.substrateId);
      if (!sub) { missing = true; reasons.push(`基板 ${args.substrateId} が不明`); }
      else if (!sub.costRel) { missing = true; reasons.push(`${sub.name}: 相対コストが未取得`); }
      else { substrate = sub.costRel.v; sum += substrate; if (sub.costRel.s === 'tmp') reasons.push(`${sub.name}: 基板コストは仮値`); }
    }
    return { ok: !missing, total: missing ? null : sum, partialTotal: sum, dieCosts: parts, substrateCost: substrate, reasons };
  }

  const api = { dieAreaMm2, yield: yieldRate, diesPerWafer, costIndex };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.area = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
