// メモリ構成(種別 × 速度)の選択と、ST/MT スコアへの補正係数(設計書 §5.2.4)。UI に依存しない純関数。
// 選択肢の表は data/memory.js(SDS_DATA.memory。プリセット id → { ref, bits, options })。表に無い id(メモリ固定・混合・D)は active:false で係数 1。
// **選択が基準構成(ref)のとき、係数はすべて厳密に 1**(校正の u・σ は補正前の値で行い、補正は後から掛ける)。
// 係数と遅延表は [推定・校正値]: 実測から求めた代表値で、公開スコアへの調整ではない(根拠は設計書 §5.2.4 と docs/research/memory-scaling.md)。
// メモリ OC(2026-11-02): 対応最大を超える速度を DDR4 / DDR5 に限って選べる。選択に oc:true の印が付く(LPDDR 系は OC 不可)。
(function (root) {
  'use strict';

  // MT: 帯域の弾性。**GB7 の実測だけ**(9950X: DDR5-4800→6000 +6.2%、6000→8000 +4.2%、4800→8000 +10.7%)から単一の指数を最小二乗(対数)で当てた値 0.196 を 0.20 に丸めた。
  // 範囲は区間ごとの指数 0.14(6000→8000)〜0.27(4800→6000)。MT 係数 = (B/B_ref)^B_MT。残差は設計書 §5.2.4 の表
  const B_MT = 0.20; const B_MT_RANGE = [0.14, 0.27];
  // ST: 帯域の弾性。GB7 の ST 実測は 0 件なので、GB5/GB6 の参考値(同じ種別で速度を上げると +1〜3%、弾性 0.05〜0.12)の下側で据え置き。遅延の効果は別に dramNs の差し替えで入れる(二重計上しない)
  const B_ST = 0.05;
  // 種別ごとの DRAM 遅延 [ns]。DDR4: 12600K DDR4-3600 で 76(AIDA64)、DDR5: Phoenix 系 DDR5-5600 SO-DIMM で 90(DDR4 はデスクトップ、DDR5 はノートの値で、プラットフォームが混在している)、
  // LPDDR5X: Phoenix 系 7467/7500 で 114〜120 → 120、LPDDR5: LPDDR5X-6400 の 121〜133 から 125 = [推定]。
  // LPDDR4X は実測がないので載せない(遅延比は 1 = 遅延の効果なし。帯域項だけ)。
  const LATENCY_NS = { DDR4: 76, DDR5: 90, LPDDR5: 125, LPDDR5X: 120 };

  // メモリ OC で追加できる速度(MT/s)。DDR4 / DDR5 のみ。公式最大を超えるものだけが選択肢になる。出典と区分は設計書 §5.2.4
  const OC_LADDER = { DDR4: [3600, 4000], DDR5: [6000, 6400, 6800, 7200, 7600, 8000] };
  // GB7 の実測がある上限(DDR5 の 8000 まで。9950X の MT のみ)。DDR4 の OC はすべて、これを超える速度は外挿
  const GB7_MEASURED_MAX = { DDR5: 8000 };

  const tableOf = () => (root.SDS_DATA && root.SDS_DATA.memory) || {};
  const entry = (presetId) => (typeof presetId === 'string' && Object.prototype.hasOwnProperty.call(tableOf(), presetId) ? tableOf()[presetId] : null);

  const label = (sel) => (sel ? `${sel.type}-${sel.mts}${sel.oc ? ' OC' : ''}` : '—');
  const bandwidthGBs = (mts, bits) => (mts * bits) / 8 / 1000;
  const isSel = (s) => !!s && typeof s === 'object' && !Array.isArray(s) && typeof s.type === 'string' && Number.isFinite(s.mts);
  const ocSpeeds = (o) => (OC_LADDER[o.type] || []).filter((v) => v > o.max);

  // 選べる構成。メモリ固定なら null。{ ref, bits, options:[{ type, speeds:[...], ocSpeeds:[...](OC 不可の種別は空), max, s, src }] }
  function optionsOf(presetId) {
    const e = entry(presetId);
    return e ? { ref: Object.assign({}, e.ref), bits: e.bits, options: e.options.map((x) => Object.assign({}, x, { speeds: x.speeds.slice(), ocSpeeds: ocSpeeds(x) })) } : null;
  }
  const refOf = (presetId) => { const e = entry(presetId); return e ? { type: e.ref.type, mts: e.ref.mts } : null; };

  // 選択の検証。問題があれば日本語の理由、なければ null。oc は true か未指定のみ(false は不可 = 表現を 1 通りにする)
  function check(presetId, sel) {
    const e = entry(presetId);
    if (!e) return 'このチップはメモリ構成を選べません(メモリが SoC に固定、または混合設計です)';
    if (!isSel(sel)) return 'メモリ構成の形式が違います(type と mts が必要です)';
    if (sel.oc !== undefined && sel.oc !== true) return 'メモリ構成の oc は true か未指定にしてください';
    const o = e.options.find((x) => x.type === sel.type);
    if (!o) return `このチップは ${sel.type} に対応していません(対応: ${e.options.map((x) => x.type).join('、')})`;
    if (sel.oc) {
      if (!OC_LADDER[sel.type]) return `${sel.type} はメモリ OC できません(OC は DDR4 / DDR5 のみ)`;
      if (!ocSpeeds(o).includes(sel.mts)) return `${sel.type}-${sel.mts} は OC の選択肢にありません(OC: ${ocSpeeds(o).join('/') || 'なし'} MT/s)`;
      return null;
    }
    if (!o.speeds.includes(sel.mts)) return `${sel.type}-${sel.mts} はこのチップの対応範囲外です(${sel.type} は ${o.speeds.join('/')} MT/s。対応最大を超える速度はメモリ OC で選びます)`;
    return null;
  }

  // preset.id と preset.cfg.mem(選択。無ければ基準構成)から係数を出す。preset は評価用の実効プリセットでもよい
  function evaluate(preset) {
    const id = preset && preset.id;
    const e = entry(id);
    if (!e) return { active: false, stFactor: 1, mtFactor: 1, dramScale: 1, stBwFactor: 1 };
    let sel = preset.cfg && preset.cfg.mem;
    let invalid = false;
    if (!isSel(sel) || check(id, sel)) { invalid = sel != null; sel = e.ref; } // 不正な選択は基準構成として扱う(parse が拒否するので通常は来ない)
    const oc = sel.oc === true;
    const isRef = !oc && sel.type === e.ref.type && sel.mts === e.ref.mts;
    const bw = bandwidthGBs(sel.mts, e.bits); const bwRef = bandwidthGBs(e.ref.mts, e.bits);
    const bwRatio = isRef ? 1 : bw / bwRef;
    const lat = LATENCY_NS[sel.type] != null ? LATENCY_NS[sel.type] : null; const latRef = LATENCY_NS[e.ref.type] != null ? LATENCY_NS[e.ref.type] : null;
    const latRatio = !isRef && lat != null && latRef != null ? lat / latRef : 1; // どちらかが未取得なら遅延の効果なし(1)
    const stBwFactor = isRef ? 1 : Math.pow(bwRatio, B_ST);
    const mtFactor = isRef ? 1 : Math.pow(bwRatio, B_MT);
    const mtRange = isRef ? [1, 1] : [Math.pow(bwRatio, B_MT_RANGE[0]), Math.pow(bwRatio, B_MT_RANGE[1])].sort((a, b) => a - b);
    const measuredMax = GB7_MEASURED_MAX[sel.type];
    const extrapolated = oc && !(measuredMax != null && sel.mts <= measuredMax); // OC のうち GB7 実測の範囲外(DDR4 のすべて、DDR5 の 8000 超)
    const selection = oc ? { type: sel.type, mts: sel.mts, oc: true } : { type: sel.type, mts: sel.mts };
    return {
      active: true, invalid, isRef, oc, extrapolated, selection, ref: { type: e.ref.type, mts: e.ref.mts }, label: label(selection), refLabel: label(e.ref), bits: e.bits,
      bwGBs: bw, refBwGBs: bwRef, bwRatio, latNs: lat, refLatNs: latRef, latRatio, latKnown: lat != null && latRef != null,
      stBwFactor, dramScale: latRatio, mtFactor, mtRange,
    };
  }

  const pct = (f) => `${f >= 1 ? '+' : ''}${((f - 1) * 100).toFixed(1)}%`;
  // 表示用の説明を部品ごとに返す(結果パネル・書き出し用)。{ config: 構成と帯域・遅延, mt: MT 係数と範囲 }。基準構成なら mt は null
  function describeParts(m) {
    if (!m || !m.active) return null;
    if (m.isRef) return { config: `メモリ ${m.label}(基準構成。補正なし)`, mt: null };
    const lat = m.latKnown ? `、遅延 ${m.refLatNs}→${m.latNs} ns(種別の代表値)` : '、遅延は未取得(帯域のみ)';
    return {
      config: `メモリ ${m.label}(基準 ${m.refLabel})。理論帯域 ${m.refBwGBs.toFixed(1)}→${m.bwGBs.toFixed(1)} GB/s${lat}`,
      mt: `MT 係数 ${pct(m.mtFactor)}(範囲 ${pct(m.mtRange[0])}〜${pct(m.mtRange[1])})`,
    };
  }
  function describe(m) {
    const p = describeParts(m);
    return p ? (p.mt ? `${p.config}。${p.mt}` : p.config) : null;
  }

  const WARNING = 'メモリ構成による係数は推定(確度:低。感度は MT 帯域弾性 0.14〜0.27(GB7 実測の区間ごとの値)・ST 0.05〜0.12(GB5/GB6 の参考値)。GB7 の ST 実測は 0 件で、帯域と遅延は分離できていない)';
  const OC_WARNING = 'メモリ OC は安定動作を保証しません。この速度での動作は推定(確度:低)です';
  const OC_EXTRAPOLATION = 'この OC 速度は GB7 の実測(DDR5-8000 まで・9950X の MT のみ)の範囲外で、外挿です(確度:低)';

  const api = { B_MT, B_MT_RANGE, B_ST, LATENCY_NS, OC_LADDER, GB7_MEASURED_MAX, WARNING, OC_WARNING, OC_EXTRAPOLATION, label, bandwidthGBs, optionsOf, refOf, check, evaluate, describe, describeParts };
  root.SDS = root.SDS || {}; root.SDS.sim = root.SDS.sim || {}; root.SDS.sim.memory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
