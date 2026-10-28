// コアエディタ(モード D の自作コア。設計書 §3.7.4・§3.7.7)の画面用の純関数。DOM に依存しない。Node でテストする。
// 入力文字列の解釈と検証(モデル層 coredef.validateParams を通す)、基準との比、ライブラリの「複製して編集」の可否、
// 設計に追加するときの id の決め方・出所名・履歴ラベル、結果パネルの注意帯(固定文言)。計算はしない(coredef.evaluate の結果を整形するだけ)。
(function (root) {
  'use strict';

  const CD = () => (root.SDS && root.SDS.model && root.SDS.model.coredef) || (typeof require === 'function' ? require('../model/coredef.js') : null);
  const num = (x) => typeof x === 'number' && isFinite(x);
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const norm = (s) => String(s == null ? '' : s).normalize('NFKC').trim();
  const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;

  // 編集項目(画面の並び順)。unit は入力欄の横の単位
  const FIELDS = [
    { key: 'width', label: '発行幅', unit: '', int: true },
    { key: 'rob', label: 'ROB', unit: '', int: true },
    { key: 'l2KB', label: 'L2 容量', unit: 'KB', int: true },
    { key: 'clockGHz', label: 'クロック', unit: 'GHz', int: false },
    { key: 'smt', label: 'SMT', unit: 'way', int: true },
  ];
  // 継承のみ(編集不可)の項目。基準コアの uarch 記録から表示する
  const INHERITED = [
    ['l1dKB', 'L1D', 'KB'], ['l2Lat', 'L2 遅延', ''], ['mshr', 'MSHR', ''], ['brPenalty', '分岐ミス', ''],
  ];

  // ---- 入力の解釈と適用 ----
  // parseField(key, str) → { ok:true, value } | { ok:false, reason }。形式だけ見る(範囲は coredef.validateParams)
  function parseField(key, str) {
    const f = FIELDS.find((x) => x.key === key);
    if (!f) return { ok: false, reason: `「${key}」は編集項目ではありません` };
    const s = norm(str).replace(/\s*(ghz|kb|way)$/i, '');
    if (s === '') return { ok: false, reason: `${f.label}を入力してください` };
    if (!NUM_RE.test(s)) return { ok: false, reason: `${f.label}は数字で入力してください` };
    const v = Number(s);
    if (!isFinite(v)) return { ok: false, reason: `${f.label}は数字で入力してください` };
    if (f.int && !Number.isInteger(v)) return { ok: false, reason: `${f.label}は整数にしてください(小数は使えません)` };
    return { ok: true, value: v };
  }
  // applyField(def, key, str) → { ok:true, def } | { ok:false, reason }
  //   編集した 1 項目だけを patch に渡す(L2 は編集したときだけ渡す。モデル層の注意: 渡すと uarch.js が null の基準にも値が入る)
  function applyField(def, key, str) {
    const p = parseField(key, str);
    if (!p.ok) return p;
    const r = CD().applyParams(def, { [key]: p.value });
    return r.ok ? { ok: true, def: r.def } : { ok: false, reason: r.reason };
  }

  // 入力欄に出す現在値(文字列)。null(未取得)は空
  function displayValue(def, key) {
    const e = CD().effective(def);
    const v = key === 'l2KB' ? CD().l2Display(def).value : e[key];
    return num(v) ? String(Math.round(v * 1000) / 1000) : '';
  }
  // 基準の値(表示用)。null なら null
  function baseValue(def, key) {
    const D = CD(); const u = def.base.uRecord;
    if (key === 'width') return num(u.width) ? u.width : null;
    if (key === 'rob') return num(u.rob) ? u.rob : null;
    if (key === 'l2KB') return D.l2Display(def).value;
    if (key === 'clockGHz') return num(def.base.defaultClockGHz) ? def.base.defaultClockGHz : null;
    if (key === 'smt') return def.base.smt;
    return null;
  }
  // 基準との比の文言: 「基準 192 → 240(×1.25)」。基準が未取得なら「基準 未取得」
  function ratioText(def, key) {
    const b = baseValue(def, key); const cur = CD().effective(def)[key];
    if (b == null) return '基準 未取得';
    if (key === 'l2KB' && !num(def.params.l2KB)) return `基準 ${b}${CD().l2Display(def).usingReference ? '(表の値)' : ''}`;
    if (key === 'l2KB' && CD().l2Display(def).usingReference) {   // 性能が使う基準は参照値(uarch.js が null)
      const pb = CD().perfL2KB(def);
      return pb === cur ? `基準 ${pb}(参照値)` : `基準 ${pb}(参照値) → ${cur}(×${r2(cur / pb)})`;
    }
    if (!num(cur) || b === cur) return `基準 ${b}`;
    return `基準 ${b} → ${cur}(×${r2(cur / b)})`;
  }
  // 継承項目の一覧 [{ label, text }]
  function inheritedRows(def) {
    const u = def.base.uRecord;
    const rows = [{ label: '命令セット', text: def.base.isa }];
    INHERITED.forEach(([k, label, unit]) => rows.push({ label, text: num(u[k]) ? `${u[k]}${unit}` : '未取得' }));
    return rows;
  }

  // ---- 部品ライブラリ: 「複製して編集」の可否 ----
  // cloneInfo(part, uarchDb, areas) → { cloneable, reason, derivable, derivReason, def }
  function cloneInfo(part, uarchDb, areas) {
    const r = CD().clone(part, uarchDb, areas);
    if (!r.ok) return { cloneable: false, reason: r.reason, derivable: false, derivReason: null, def: null };
    const d = CD().areaDerivable(r.def);
    return { cloneable: true, reason: null, derivable: d.ok, derivReason: d.ok ? null : d.reason, def: r.def };
  }

  // ---- 設計に追加するとき ----
  // 設計内に同じ内容(名前・基準・パラメータ)の定義があればその id(個数がまとまる)、無ければ新しい id
  function assignId(def, existingDefs) {
    const key = (x) => JSON.stringify({ name: x.name, base: x.base, params: x.params });
    const same = (existingDefs || []).find((x) => key(x) === key(def));
    const d = JSON.parse(JSON.stringify(def));
    d.id = same ? same.id : CD().nextId(existingDefs);
    return d;
  }
  // ブロックの出所名(ダイビューの出所色分けで基準チップと別の色にする。短縮名は空白を含まない 1 語)。例: 自作:Zen1
  const customChip = (def) => `自作:${String(def.base.uarch).replace(/\s+/g, '')}`;
  const addLabel = (def, count) => `自作コア『${def.name}』を ${count} 個追加`;

  // ---- 設計の中の自作コア ----
  // 設計のブロックが使っているコア定義(重複なし)
  function usedDefs(design) {
    const out = []; const defs = (design && design.coreDefs) || [];
    ((design && design.dies) || []).forEach((d) => (d.blocks || []).forEach((b) => {
      if (!b.coreDefId) return;
      const x = defs.find((y) => y.id === b.coreDefId);
      if (x && !out.includes(x)) out.push(x);
    }));
    return out;
  }
  const countOfDef = (design, id) => ((design && design.dies) || []).reduce((t, d) => t + (d.blocks || []).filter((b) => b.coreDefId === id).length, 0);

  // ---- 結果パネルの注意帯(§3.7.7。文言固定) ----
  const BAND1 = '混合設計の性能は確度:低です(校正した範囲の構成ではないため)';
  const BAND3 = '自作コアの面積は範囲です(ロジックの上限は仮定で、データから導けません)';
  const BAND5 = '電力・温度・最大クロックは出していません';
  const band2 = (names) => `自作コアの性能は基準コア(${names})の補正を借りた推定です。幅・ROB・L2 の変更の効果は検証できていません`;
  // customBands(ev, design) → [{ n(1〜5), level:'warn'|'info', text }]。自作コアがない設計では []
  function customBands(ev, design) {
    const defs = usedDefs(design);
    if (!defs.length) return [];
    const out = [{ n: 1, level: 'warn', text: BAND1 }];
    out.push({ n: 2, level: 'warn', text: band2([...new Set(defs.map((x) => x.base.uarch))].join('、')) });
    const blocks = (ev && ev.area && ev.area.mix && ev.area.mix.blocks) || [];
    if (blocks.some((b) => b.origin === 'derived')) out.push({ n: 3, level: 'warn', text: BAND3 });
    ((ev && ev.outOfCalibration) || []).forEach((o) => out.push({ n: 4, level: 'warn', text: `校正した範囲の外: ${o.reason}(確度は低)` }));
    ((ev && ev.optimisticReasons) || []).forEach((t) => out.push({ n: 4, level: 'warn', text: `上振れ側の予測: ${t}` }));
    out.push({ n: 5, level: 'info', text: BAND5 });
    return out;
  }

  // st.chosen が自作コアのときの説明 [文]。自作でなければ []
  function chosenCustomLines(chosen) {
    if (!chosen || !chosen.custom) return [];
    return [
      `選ばれたコアは自作コア『${chosen.coreDefName || chosen.label}』です(基準のマイクロアーキ: ${chosen.baseUarch || chosen.uarch || '不明'})。`,
      `補正は基準のマイクロアーキ(${chosen.baseUarch || chosen.uarch || '不明'})の値を借りています(確度:低)。`,
    ];
  }

  // ---- コアエディタの結果の整形 ----
  const rangeText = (r) => (Array.isArray(r) && num(r[0]) && num(r[1]) ? (r2(r[0]) === r2(r[1]) ? `${r2(r[1])} mm²` : `${r2(r[0])}〜${r2(r[1])} mm²`) : '未取得');
  // 性能/面積(pt/mm²)の範囲: ST ÷ 面積の大きい側と小さい側
  function perfPerArea(ev) {
    if (!ev || !ev.st || !ev.st.ok || !ev.area || !Array.isArray(ev.area.rangeMm2)) return null;
    const [lo, hi] = ev.area.rangeMm2;
    if (!(lo > 0 && hi > 0)) return null;
    return [ev.st.score / hi, ev.st.score / lo];
  }
  // CPI 内訳の整形(基本/分岐/メモリ)。parts = { base, br, mem }
  function cpiText(parts) {
    if (!parts) return '内訳なし';
    const f = (x) => (num(x) ? r2(x) : '—');
    return `基本 ${f(parts.base)} / 分岐 ${f(parts.br)} / メモリ ${f(parts.mem)}`;
  }
  // 入力欄の横に出す ⚠(校正範囲外)。key は width|rob|l2KB|clockGHz。clockGHz は field 名 'clock'
  function fieldWarning(ev, def, key) {
    if (!ev || !Array.isArray(ev.outOfCalibration)) return null;
    const suffix = key === 'clockGHz' ? 'clock' : key;
    const hit = ev.outOfCalibration.find((o) => o.field === `coredef:${def.id}:${suffix}`);
    return hit ? hit.reason : null;
  }
  const comboWarning = (ev, def) => { const hit = ev && (ev.outOfCalibration || []).find((o) => o.field === `coredef:${def.id}:combo`); return hit ? hit.reason : null; };

  const api = {
    FIELDS, BAND1, BAND3, BAND5, parseField, applyField, displayValue, baseValue, ratioText, inheritedRows, cloneInfo, assignId, customChip, addLabel,
    usedDefs, countOfDef, customBands, chosenCustomLines, rangeText, perfPerArea, cpiText, fieldWarning, comboWarning, r1,
  };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.coreform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
