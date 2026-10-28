// パラメータ欄・差分ビューの純粋ロジック(設計書 §3.3・§8.6)。DOM に依存しない。Node でテストする。
// 入力文字列の解釈と検証メッセージ、増減の表示用整形、差分行の組み立て、モード表示の判定。
(function (root) {
  'use strict';

  const clockOf = (g) => g.boostGHz || g.maxGHz || g.baseGHz || 0;
  const trimNum = (v) => String(Math.round(v * 1000) / 1000);

  // 全角数字などを半角にして前後の空白を除く
  function normalize(s) { return String(s == null ? '' : s).normalize('NFKC').trim(); }
  const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;

  // コア数: 1〜64 の整数。戻り値は { ok:true, value } か { ok:false, reason }
  function parseCount(str) {
    const s = normalize(str);
    if (s === '') return { ok: false, reason: 'コア数を入力してください' };
    if (!NUM_RE.test(s)) return { ok: false, reason: 'コア数は数字で入力してください' };
    const v = Number(s);
    if (!Number.isInteger(v)) return { ok: false, reason: 'コア数は整数にしてください(小数は使えません)' };
    if (v < 1 || v > 64) return { ok: false, reason: 'コア数は 1〜64 の整数にしてください' };
    return { ok: true, value: v };
  }

  // クロック: 0.5〜8.0 GHz。末尾の「GHz」は許す
  function parseClock(str) {
    const s = normalize(str).replace(/\s*ghz$/i, '');
    if (s === '') return { ok: false, reason: 'クロックを入力してください' };
    if (!NUM_RE.test(s)) return { ok: false, reason: 'クロックは数字で入力してください(例: 5.7)' };
    const v = Number(s);
    if (!isFinite(v) || v < 0.5 || v > 8) return { ok: false, reason: 'クロックは 0.5〜8.0 GHz の数にしてください' };
    return { ok: true, value: v };
  }

  // L3: 0〜512 MB。末尾の「MB」は許す
  function parseL3(str) {
    const s = normalize(str).replace(/\s*mb$/i, '');
    if (s === '') return { ok: false, reason: 'L3 の容量を入力してください' };
    if (!NUM_RE.test(s)) return { ok: false, reason: 'L3 は数字で入力してください(例: 64)' };
    const v = Number(s);
    if (!isFinite(v) || v < 0 || v > 512) return { ok: false, reason: 'L3 は 0〜512 MB の数にしてください' };
    return { ok: true, value: v };
  }

  // モード表示。A 再現 / B 改良。記号+文字
  function modeInfo(design) {
    if (!design) return null;
    const improve = !!(design.origin && design.origin.mode === 'improve');
    const locked = !!(design.locks && design.locks.params);
    const hasCfg = !!(design.cfg && Array.isArray(design.cfg.cores));
    if (design.presetId == null && design.origin && design.origin.mode === 'mix') return { code: 'C', symbol: '◇', text: 'C 混合', locked: false, editable: false, hasCfg };
    return improve
      ? { code: 'B', symbol: '✎', text: 'B 改良', locked, editable: hasCfg && !locked, hasCfg }
      : { code: 'A', symbol: '■', text: 'A 再現', locked, editable: hasCfg && !locked, hasCfg };
  }

  // 編集済みか(cfg が baseCfg と違う)
  function isEdited(design) {
    return !!(design && design.cfg && design.baseCfg) && JSON.stringify(design.cfg) !== JSON.stringify(design.baseCfg);
  }
  // 差分ビューを出すか: B のとき、または A でも編集済みのとき(cfg が無い設計では出さない)
  function showDiff(design) {
    if (!design || !design.cfg) return false;
    const m = modeInfo(design);
    return m.code === 'B' || isEdited(design);
  }
  // 再現度パネル(公開値との比較)を出すか: A で未編集のときだけ
  function showRepro(design) {
    if (!design) return false;
    return modeInfo(design).code === 'A' && !isEdited(design);
  }

  // パラメータ欄の行。clock が null なら未取得
  function paramRows(design) {
    if (!design || !design.cfg || !Array.isArray(design.cfg.cores)) return null;
    const base = design.baseCfg || design.cfg;
    return {
      cores: design.cfg.cores.map((g) => {
        const b = base.cores.find((c) => c.type === g.type) || g;
        const c = clockOf(g); const c0 = clockOf(b);
        return { type: g.type, uarch: g.uarch || null, count: g.count, clock: c > 0 ? c : null, baseCount: b.count, baseClock: c0 > 0 ? c0 : null };
      }),
      l3MB: design.cfg.l3MB || 0, baseL3MB: base.l3MB || 0,
    };
  }

  // 履歴ラベル。field: 'count' | 'clock' | 'l3'
  function editLabel(field, type, before, after) {
    if (field === 'count') return `${type} コア数 ${before}→${after}`;
    if (field === 'clock') return `${type} クロック ${before ? trimNum(before) : '未取得'}→${trimNum(after)} GHz`;
    return `L3 ${trimNum(before)}→${trimNum(after)} MB`;
  }

  // 差分行(paramDiff の項目)の表示用文字列
  function fmtParamValue(item, v) {
    if (item.unit === 'GHz' && !(v > 0)) return '未取得';
    if (item.unit === 'GHz') return `${trimNum(v)} GHz`;
    if (item.unit === 'MB') return `${trimNum(v)} MB`;
    return `${v} ${item.unit || ''}`.trim();
  }
  function paramDiffRows(items) {
    return (items || []).map((it) => ({ id: it.id, label: it.label, before: fmtParamValue(it, it.before), after: fmtParamValue(it, it.after) }));
  }

  // 増減の表示。色だけに頼らず ▲▼＝ と文字(上がる/下がる)を付ける。pct が null なら表示しない
  function deltaView(pct) {
    if (pct == null || !isFinite(pct)) return { arrow: '—', word: '', text: '—', cls: 'd-none' };
    const better = Math.abs(pct) < 0.05 ? 'same' : pct > 0 ? 'up' : 'down';
    const arrow = { up: '▲', down: '▼', same: '＝' }[better];
    const word = { up: '上がる', down: '下がる', same: 'ほぼ変わらない' }[better];
    const sign = pct > 0 ? '+' : '';
    return { arrow, word, text: `${arrow} ${sign}${pct.toFixed(1)}% ${word}`, cls: `d-${better}`, better };
  }

  const fmtScore = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v).toLocaleString('ja-JP') : '—');

  // 結果差の行(resultDiff の st / mt)
  function resultRows(rd) {
    const row = (name, m) => ({
      name, before: fmtScore(m.before), after: fmtScore(m.after),
      delta: m.ok ? deltaView(m.deltaPct) : deltaView(null), reason: m.ok ? null : m.reason,
    });
    return [row('シングル性能 (ST)', rd.st), row('マルチ性能 (MT)', rd.mt)];
  }

  // 要約の見出し(summary の verdict から)。記号+文字
  const VERDICT = {
    up: { symbol: '▲', text: '性能が上がる見込み(予測)', cls: 'd-up' },
    down: { symbol: '▼', text: '性能が下がる見込み(予測)', cls: 'd-down' },
    mixed: { symbol: '◆', text: '上がる項目と下がる項目があります(予測)', cls: 'd-mixed' },
    same: { symbol: '＝', text: 'ほとんど変わらない見込み(予測)', cls: 'd-same' },
    unknown: { symbol: '—', text: '性能の変化を判定できません', cls: 'd-none' },
  };
  // scope: 'st' | 'mt' なら、比べられた方だけに限定した見出しにする(例: 「ST は上がる見込み(MT は比べられません)」)
  const ONE = { up: '上がる見込み', down: '下がる見込み', same: 'ほとんど変わらない見込み' };
  function verdictHeadline(verdict, scope) {
    const v = VERDICT[verdict] || VERDICT.unknown;
    if ((scope === 'st' || scope === 'mt') && ONE[verdict]) {
      const [me, other] = scope === 'st' ? ['ST', 'MT'] : ['MT', 'ST'];
      return Object.assign({}, v, { text: `${me} は${ONE[verdict]}(${other} は比べられません。予測)`, line: `${v.symbol} ${me} は${ONE[verdict]}(${other} は比べられません。予測)` });
    }
    return Object.assign({ line: `${v.symbol} ${v.text}` }, v);
  }

  const OPTIMISTIC_NOTE = '電力・温度は推定として別カードに載せているが、性能の数値には反映していない(電力制限でこの値に届かない可能性が高い)';
  const MT_ALWAYS_LOW = 'MT は常に確度が低い';
  const NOT_RECOMPUTED = '面積・公表電力・歩留まりは編集では再計算されません(コア別面積が未取得のため)。';

  const api = {
    clockOf, parseCount, parseClock, parseL3, modeInfo, isEdited, showDiff, showRepro, paramRows, editLabel,
    fmtParamValue, paramDiffRows, deltaView, fmtScore, resultRows, verdictHeadline, trimNum, NOT_RECOMPUTED, OPTIMISTIC_NOTE, MT_ALWAYS_LOW,
  };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.paramform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
