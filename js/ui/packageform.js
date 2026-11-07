// パッケージ設定・電力/温度カードの純粋ロジック(設計書 §6・§8.10・§8.11)。DOM に依存しない。Node でテストする。
(function (root) {
  'use strict';

  const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;
  const normalize = (s) => String(s == null ? '' : s).normalize('NFKC').trim();

  const COOLING_NOTE = '冷却の熱抵抗は根拠のない仮置きです(プリセットの TDP からの逆算は未実施)。';
  const POWER_MODEL_NOTE = '電力モデルは根拠のない仮の既定値。公表の基本電力に合わせただけで、コア種別間の電力比・電圧-周波数特性は未校正';
  const TJ_NOTE = '制限の判定はダイ平均の温度で行っています。局所(ヒートマップの最高)は上限を超えうる。ヒートマップの局所差は TIM を含まず過小寄り';
  const RUNAWAY_TEXT = '熱暴走のため持続値はありません(温度が収束しない)';
  const INFEASIBLE_TEXT = '✗ 制限を満たせない(最小クロックでも超過)';

  // 電力制限(W)。空欄=制限なし(null)。1〜1000。末尾の「W」は許す
  function parsePowerLimit(str) {
    const s = normalize(str).replace(/\s*w$/i, '');
    if (s === '') return { ok: true, value: null };
    if (!NUM_RE.test(s)) return { ok: false, reason: '電力制限は数字で入力してください(例: 65)。制限なしは空欄にします' };
    const v = Number(s);
    if (!isFinite(v) || v < 1 || v > 1000) return { ok: false, reason: '電力制限は 1〜1000 W の数にしてください(制限なしは空欄)' };
    return { ok: true, value: v };
  }

  const LIMITED = { none: '制限なし', power: '電力制限', thermal: '温度制限', cooling: '冷却不足', runaway: '熱暴走の恐れ' };
  const LIMITED_SYMBOL = { none: '✓', power: '▼', thermal: '▼', cooling: '✗', runaway: '✗' };
  function limitedByText(code) { return LIMITED[code] || '不明'; }
  function limitedBySymbol(code) { return LIMITED_SYMBOL[code] || '？'; }

  // 値の区分バッジ。item は { v, s } か null(未取得)
  function sourceBadge(item) {
    if (!item || item.v == null) return { text: '未取得', kind: 'none' };
    if (item.s === 'tmp') return { text: '仮値', kind: 'tmp' };
    if (item.s === 'pub') return { text: '公表', kind: 'pub' };
    if (item.s === 'sec') return { text: '二次', kind: 'sec' };
    return { text: '区分不明', kind: 'none' };
  }
  const SUB_FIELDS = [
    ['conductivityWmK', '熱伝導率', 'W/m·K'], ['maxPackageMm2', '最大パッケージ', 'mm²'], ['costRel', 'コスト係数', '(有機基板=1)'],
  ];
  // 基板の特性値の表示行: [{ label, text, badge:{text,kind}, note }]
  function substrateRows(sub) {
    if (!sub) return [];
    return SUB_FIELDS.map(([key, label, unit]) => {
      const it = sub[key] || null;
      const has = it && it.v != null;
      return { label, text: has ? `${Math.round(it.v * 1000) / 1000} ${unit}` : '未取得', badge: sourceBadge(it), note: has && it.note ? it.note : '' };
    });
  }

  const nameOf = (list, id) => { const x = (list || []).find((c) => c.id === id); return x ? x.name : String(id); };
  function packageLabel(kind, list, oldId, newId) {
    return `${kind === 'cooling' ? '冷却' : '基板'}: ${nameOf(list, oldId)}→${nameOf(list, newId)}`;
  }
  function powerLimitLabel(oldW, newW) {
    const f = (w) => (w == null ? '制限なし' : `${w} W`);
    return `電力制限: ${f(oldW)}→${f(newW)}`;
  }

  // 冷却のドロップダウン用の1行(熱抵抗は仮置きの注記つき)
  function coolingOptionText(c) { return `${c.name}(R=${c.rK_W} K/W${c.s === 'tmp' ? '・仮置き' : ''})`; }

  // 持続クロックの行。cores は design.cfg.cores(boostGHz/maxGHz/baseGHz)。sustainedGHz は { 種別: GHz }
  function sustainedRows(thermal, cores) {
    if (!thermal || !thermal.ok || !thermal.sustainedGHz) return [];
    const maxOf = (t) => { const g = (cores || []).find((c) => c.type === t); return g ? (g.boostGHz || g.maxGHz || g.baseGHz || null) : null; };
    return Object.keys(thermal.sustainedGHz).map((t) => {
      const s = thermal.sustainedGHz[t]; const m = maxOf(t);
      return { type: t, sustained: s, max: m, ratioPct: m > 0 ? (s / m) * 100 : null };
    });
  }

  // 温度カードの表示用の状態。{ state:'na'|'runaway'|'ok', ... }
  function tjView(thermal) {
    if (!thermal || !thermal.ok) return { state: 'na', reason: (thermal && thermal.reason) || '温度を推定できません' };
    if (thermal.tjC == null || !isFinite(thermal.tjC)) {
      return { state: 'runaway', text: '熱暴走の恐れ(収束しません)', lastC: typeof thermal.tjLastC === 'number' && isFinite(thermal.tjLastC) ? thermal.tjLastC : null };
    }
    return { state: 'ok', tjC: thermal.tjC };
  }

  // 熱暴走か(温度が収束しない。tjC が無い場合も含む)。このとき持続電力・持続クロック・最後の反復値は物理的に無意味なので出さない
  function isRunaway(thermal) {
    return !!(thermal && thermal.ok && (thermal.limitedBy === 'runaway' || thermal.tjC == null || !isFinite(thermal.tjC)));
  }
  // 温度カードの注記の一覧。冷却の熱抵抗が仮置きの注意は帯で常に出すので、ここでは除く
  function thermalNotes(thermal) {
    return ((thermal && thermal.notes) || []).filter((n) => !/^冷却の熱抵抗は根拠のない仮置き$/.test(n));
  }
  // power.peak の値の区分(s)に合わせた「ピーク」の呼び方。区分が取れないときは「ピーク電力」
  function peakKindText(s) {
    if (s === 'meas') return '実測のピーク';
    if (s === 'pub') return '公表のピーク';
    if (s === 'sec') return 'ピーク(二次情報)';
    return 'ピーク電力';
  }
  // 温度カードの過大寄り注記。A 再現(未編集)で、モデル推定が公表ピークより 15% 超大きいときだけ。無ければ ''
  function overEstimateNote(pm, edited) {
    const v = !edited && pm && pm.ok ? pm.vsPublishedPeak : null;
    if (!v || typeof v.errPct !== 'number' || !(v.errPct > 15)) return '';
    return `電力の推定が${peakKindText(v.s)}より +${Math.round(v.errPct)}% 大きいため、温度・持続クロックの低下は過大寄りです`;
  }
  // 電力制限の初期値の出所の表示(ユーザーが変えた・空欄にした後は出さない)
  function powerLimitSourceText(pkg, peakItem) {
    if (!pkg || pkg.powerLimitW == null) return '';
    if (pkg.powerLimitSource === 'peak') return `初期値: ${peakKindText(peakItem && peakItem.s)}から(${pkg.powerLimitW} W)`;
    if (pkg.powerLimitSource === 'tdp') return `選んだ TDP から(${pkg.powerLimitW} W)`;
    if (pkg.powerLimitSource === 'base') return `初期値: 公表の基本電力から(${pkg.powerLimitW} W)`;
    return '';
  }

  const api = { TJ_NOTE, RUNAWAY_TEXT, INFEASIBLE_TEXT, isRunaway, thermalNotes, powerLimitSourceText, COOLING_NOTE, POWER_MODEL_NOTE, peakKindText, overEstimateNote, parsePowerLimit, limitedByText, limitedBySymbol, sourceBadge, substrateRows, packageLabel, powerLimitLabel, coolingOptionText, sustainedRows, tjView };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.packageform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
