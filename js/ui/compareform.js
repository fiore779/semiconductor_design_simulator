// 比較ビューの純粋ロジック(設計書 §9「設計の比較」)。DOM に依存しない。Node でテストする。
// 比較は evaluate の結果を並べるだけで、設計は変更しない。値が無い(null / ok:false)ものは null と理由で返し、0 で埋めない。
// 公開値との差は、再現(A)・未編集の改良(B)だけで出す(編集後・混合 C/D の予測値には公開値が無い)。
(function (root) {
  'use strict';

  const node = typeof module !== 'undefined' && module.exports;
  const PL = () => (node ? require('./presetlist.js') : root.SDS.ui.presetlist);
  const PK = () => (node ? require('./packageform.js') : root.SDS.ui.packageform);
  const PF = () => (node ? require('./paramform.js') : root.SDS.ui.paramform);
  const DS = () => (node ? require('../model/design.js') : root.SDS.model.design);

  const KIND_TEXT = { pub: '公開', pred: '予測', est: '推定', set: '指定' };
  const CONF_TEXT = { high: '高', medium: '中', low: '低' };
  const kindText = (k) => KIND_TEXT[k] || '—';
  const confText = (c) => CONF_TEXT[c] || '—';

  const ROWS = [
    { key: 'st', label: 'シングル性能 (GB7 ST)', unit: 'pt', digits: 0, pct: true },
    { key: 'mt', label: 'マルチ性能 (GB7 MT)', unit: 'pt', digits: 0, pct: true },
    { key: 'area', label: 'ダイ面積', unit: 'mm²', digits: 1, pct: true },
    { key: 'power', label: '消費電力(モデル推定・全コア負荷)', unit: 'W', digits: 1, pct: true },
    { key: 'tj', label: '温度 Tj(推定)', unit: '℃', digits: 0, pct: false },
  ];

  const isNum = (v) => typeof v === 'number' && isFinite(v);

  function cell(o) {
    return Object.assign({ value: null, kind: null, kindText: '—', conf: null, confText: '—', reason: null, sub: [], pub: null, pubNote: null }, o);
  }
  const naCell = (reason) => cell({ reason: reason || '計算できません' });

  // 1 つの設計・評価から、1 項目のセルを作る。値が無ければ value:null と reason(0 では埋めない)
  function cellOf(key, design, ev) {
    if (!ev) return naCell('評価結果がありません');
    if (key === 'st' || key === 'mt') {
      const r = ev[key];
      if (!r || !r.ok || !isNum(r.score)) return Object.assign(naCell(r && r.reason), { pubNote: ev.isMix ? '混合設計のため、公開値との差は出しません' : ev.edited ? '編集後のため、公開値との差は出しません' : '値が無いため比較しません' });
      const c = cell({ value: r.score, kind: 'pred', kindText: kindText('pred'), conf: r.confidence || null, confText: confText(r.confidence) });
      if (!ev.isMix && !ev.edited && isNum(r.published)) c.pub = { published: r.published, errPct: isNum(r.errPct) ? r.errPct : null, kindText: r.publishedKind || '' };
      else c.pubNote = ev.isMix ? '混合設計の予測のため、公開値との差は出しません' : ev.edited ? '編集後の予測のため、公開値との差は出しません' : '公開値が未取得のため比較しません';
      if (c.pub && r.isCalibSample) c.sub.push('校正に使った代表 SKU のため、公開値に近くて当然(検証ではない)');
      if (c.pub && r.inUCalSet) c.sub.push('この uarch の ST 補正は複数 SKU の中央値(この SKU を含む)で決めた定数のため、学習内の誤差(検証ではない)');
      if (c.pub && r.calibNotUsedForMt) c.sub.push('ST の補正には使ったが、MT の σ の合わせには使っていない');
      if (key === 'mt') c.sub.push('MT の確度は常に低');
      return c;
    }
    if (key === 'area') {
      const a = ev.area;
      if (ev.isMix) {
        const m = a && a.mix;
        const dieMm2 = m && isNum(m.dieMm2) ? m.dieMm2 : (a && isNum(a.totalMm2) ? a.totalMm2 : null);
        if (dieMm2 == null) return naCell('ダイ寸法がありません');
        const c = cell({ value: dieMm2, kind: 'set', kindText: kindText('set') });
        c.sub.push('設計者が指定したダイ寸法(実測の面積ではない)');
        return c;
      }
      if (!a || !isNum(a.totalMm2)) return naCell((a && a.reason) || '面積が未取得');
      const srcs = [];
      (a.dies || []).forEach((d) => { if (d.known) { const t = PL().sourceLabel(d.source); if (!srcs.includes(t)) srcs.push(t); } });
      const c = cell({ value: a.totalMm2, kind: 'pub', kindText: `${kindText('pub')}${srcs.length ? `(${srcs.join('・')})` : ''}` });
      if (a.totalIsPartial) c.sub.push('一部のダイの面積が未取得(合計は取得できた分だけ)');
      if (ev.edited) c.sub.push('編集では再計算していない(元のチップの値)');
      return c;
    }
    if (key === 'power') {
      const pm = ev.powerModel;
      if (!pm || !pm.ok || !isNum(pm.estW)) return naCell((pm && pm.reason) || '電力を推定できません');
      const c = cell({ value: pm.estW, kind: 'est', kindText: kindText('est'), conf: 'low', confText: confText('low') });
      const v = pm.vsPublishedPeak;
      if (!ev.isMix && !ev.edited && v && isNum(v.publishedW)) c.pub = { published: v.publishedW, errPct: isNum(v.errPct) ? v.errPct : null, kindText: PK().peakKindText(v.s) };
      else c.pubNote = ev.isMix ? '混合設計のため、公開値との差は出しません' : ev.edited ? '編集後のため、公開値との差は出しません' : 'ピーク電力が未取得のため比較しません';
      c.sub.push('電力モデルの係数は根拠のない仮の既定値');
      return c;
    }
    if (key === 'tj') {
      const th = ev.thermal;
      if (!th || !th.ok) return naCell((th && th.reason) || '温度を推定できません');
      if (PK().isRunaway(th)) return naCell('熱暴走の恐れ(温度が収束しない)');
      if (!isNum(th.tjC)) return naCell('温度を推定できません');
      const c = cell({ value: th.tjC, kind: 'est', kindText: kindText('est'), conf: 'low', confText: confText('low') });
      c.sub.push('冷却の熱抵抗は根拠のない仮置き');
      if (th.throttled) c.sub.push('制限で持続クロックが下がる見込み(性能の数値には反映していない)');
      return c;
    }
    return naCell('未対応の項目');
  }

  function round(v, digits) { const m = Math.pow(10, digits); return Math.round(v * m) / m; }

  // 現在(a)と比較先(b)の表。差は a − b、% は b を基準(b が 0 以下なら % は出さない)
  function compareRows(a, b, whoB) {
    const wb = whoB || '比較先';
    return ROWS.map((r) => {
      const ca = cellOf(r.key, a.design, a.ev); const cb = cellOf(r.key, b.design, b.ev);
      const row = { key: r.key, label: r.label, unit: r.unit, digits: r.digits, a: ca, b: cb, abs: null, pct: null, diffReason: null, kindMismatch: false };
      if (isNum(ca.value) && isNum(cb.value)) {
        const abs = ca.value - cb.value;
        row.abs = Math.abs(abs) < 1e-9 ? 0 : abs;
        if (r.pct) { if (cb.value > 0) row.pct = (ca.value / cb.value - 1) * 100; else row.diffReason = `${wb}が 0 以下のため % は出しません`; }
        if (ca.kind !== cb.kind) row.kindMismatch = true;
      } else {
        const why = [];
        if (!isNum(ca.value)) why.push(`現在: ${ca.reason}`);
        if (!isNum(cb.value)) why.push(`${wb}: ${cb.reason}`);
        row.diffReason = why.join(' / ');
      }
      return row;
    });
  }

  // 最大 3 列: 現在(a)と比較先 others(1〜2 件)。差は各比較先ごとに「現在 − 比較先」(比較先どうしの差は出さない)
  // 戻り: [{ key, label, unit, digits, a, others: [{ cell, abs, pct, diffReason, kindMismatch }] }]
  const TARGET_NAMES = ['比較先A', '比較先B'];
  const MAX_TARGETS = 2;
  function compareMulti(a, others) {
    const list = (others || []).slice(0, MAX_TARGETS);
    const rows = ROWS.map((r) => ({ key: r.key, label: r.label, unit: r.unit, digits: r.digits, a: cellOf(r.key, a.design, a.ev), others: [] }));
    list.forEach((o, k) => {
      compareRows(a, o, list.length > 1 ? TARGET_NAMES[k] : '比較先').forEach((x, i) => {
        rows[i].others.push({ cell: x.b, abs: x.abs, pct: x.pct, diffReason: x.diffReason, kindMismatch: x.kindMismatch });
      });
    });
    return rows;
  }
  // compareMulti の 1 行から、比較先 k との組を compareRows の行と同じ形で取り出す(valueText / diffText に渡せる)
  function pairRow(row, k) {
    const o = row.others[k];
    return { key: row.key, label: row.label, unit: row.unit, digits: row.digits, a: row.a, b: o.cell, abs: o.abs, pct: o.pct, diffReason: o.diffReason, kindMismatch: o.kindMismatch };
  }

  // セルの値の表示。値が無いときは「—(理由)」
  function valueText(c, row) {
    if (!isNum(c.value)) return `—(${c.reason})`;
    return `${round(c.value, row.digits).toLocaleString('ja-JP', { minimumFractionDigits: row.digits, maximumFractionDigits: row.digits })} ${row.unit}`;
  }
  function pctText(p) {
    if (!isNum(p)) return '—';
    const t = p.toFixed(1);
    if (Number(t) === 0) return '＝ 0.0%'; // 丸めて 0 なら符号なし(-0.0% を出さない)
    return `${p > 0 ? '▲ ' : '▼ '}${p > 0 ? '+' : ''}${t}%`;
  }
  // 差の表示: 「+12 pt(▲ +3.1%)」。出せないときは「—(理由)」
  function diffText(row) {
    if (!isNum(row.abs)) return `—(${row.diffReason || '差を出せません'})`;
    let d = round(row.abs, row.digits); if (d === 0) d = 0; // -0 を 0 に
    const base = `${d > 0 ? '+' : ''}${d.toLocaleString('ja-JP', { minimumFractionDigits: row.digits, maximumFractionDigits: row.digits })} ${row.unit}`;
    return row.pct != null ? `${base}(${pctText(row.pct)})` : (row.diffReason ? `${base}(% は出しません: ${row.diffReason})` : base);
  }
  // 公開値の欄の表示(A・未編集 B だけ値が入る)
  function pubText(c, row) {
    if (c.pub) {
      const pv = c.pub.published.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
      return `公開値 ${pv} ${row.unit}${c.pub.kindText ? `(${c.pub.kindText})` : ''} との差 ${pctText(c.pub.errPct)}`;
    }
    return `公開値との差: —(${c.pubNote || '出しません'})`;
  }

  function describe(design, ev) {
    const mi = PF().modeInfo(design);
    return { name: design ? design.name : '', modeText: mi ? mi.text : '', isMix: !!(ev && ev.isMix), edited: !!(ev && ev.edited) };
  }

  const pkgText = (d) => { const p = d && d.package; return p ? `冷却 ${p.coolingId} / 基板 ${p.substrateId} / 電力制限 ${p.powerLimitW == null ? 'なし' : p.powerLimitW + ' W'}` : '不明'; };

  // 比較の注意(固定の文言と、状況に応じた文言)
  function compareNotes(a, b) { return compareNotesMulti(a, [b]); }
  function compareNotesMulti(a, others) {
    const list = others || [];
    const names = list.length > 1 ? TARGET_NAMES : ['比較先'];
    const n = [];
    n.push('ST / MT は予測(シミュレーション)で、MT の確度は常に低です。電力・温度は推定(確度:低。電力モデルの係数と冷却の熱抵抗は根拠のない仮置き)です。');
    [['現在', a]].concat(list.map((s, i) => [names[i], s])).forEach(([who, s]) => {
      if (s.ev && s.ev.isMix) n.push(`${who}は混合設計(C/D)です。性能は確度:低の予測で、電力・温度は出しません。公開値との差も出しません。`);
      else if (s.ev && s.ev.edited) n.push(`${who}は編集後の設計です。性能は予測で、公開値との差は出しません。面積・電力は編集では再計算していません(元のチップの値)。`);
    });
    list.forEach((b, i) => {
      if (pkgText(a.design) !== pkgText(b.design)) n.push(`パッケージ設定が違います(電力・温度の差に影響します)。現在: ${pkgText(a.design)} / ${names[i]}: ${pkgText(b.design)}`);
    });
    list.forEach((b, i) => {
      if (b.sourceKey === 'origin' || b.sourceKey === 'preset') n.push(`${names[i]}は既定のパッケージ設定で評価しています。`);
    });
    if (list.length > 1) n.push('差は各比較先ごとに「現在 − 比較先」で、% はその比較先を基準にしています。比較先どうしの差は出しません。区分(公開・予測・推定・指定)が違う値どうしの差は、同じ性質の値の差ではありません。');
    else n.push('差は「現在 − 比較先」、% は比較先を基準にしています。区分(公開・予測・推定・指定)が違う値どうしの差は、同じ性質の値の差ではありません。');
    return n;
  }

  // 比較先の選択肢。design: 現在の設計。baseline: 読み込み時点の設計(無ければ null)
  function sourceOptions(design, presets, baseline) {
    const preset = design && design.presetId ? (presets || []).find((p) => p.id === design.presetId) : null;
    return [
      { key: 'origin', label: '元のプリセット(未編集の再現)', enabled: !!preset, reason: preset ? null : '元のプリセットがありません(混合 C / 新規 D の設計)' },
      { key: 'preset', label: '別のプリセット', enabled: (presets || []).length > 0, reason: (presets || []).length ? null : 'プリセットがありません' },
      { key: 'history', label: '履歴の最初の状態(読み込み時点)', enabled: !!baseline, reason: baseline ? null : '履歴の最初の状態がありません' },
    ];
  }

  // 比較先の設計を作る(現在の設計は変えない)。args: { presets, presetId, baseline }
  function buildOther(key, design, args) {
    const a = args || {};
    const find = (id) => (a.presets || []).find((p) => p.id === id) || null;
    if (key === 'origin') {
      const p = design && design.presetId ? find(design.presetId) : null;
      if (!p) return { ok: false, reason: '元のプリセットがありません(混合 C / 新規 D の設計)' };
      return { ok: true, design: DS().fromPreset(p, { mode: 'reproduce' }), label: `元のプリセット: ${p.name}(未編集・再現)` };
    }
    if (key === 'preset') {
      const p = a.presetId ? find(a.presetId) : null;
      if (!p) return { ok: false, reason: '比較するプリセットを選んでください' };
      return { ok: true, design: DS().fromPreset(p, { mode: 'reproduce' }), label: `別のプリセット: ${p.name}(未編集・再現)` };
    }
    if (key === 'history') {
      if (!a.baseline) return { ok: false, reason: '履歴の最初の状態がありません' };
      return { ok: true, design: JSON.parse(JSON.stringify(a.baseline)), label: `履歴の最初の状態: ${a.baseline.name}` };
    }
    return { ok: false, reason: '比較先を選んでください' };
  }

  // 比較先の指定(最大 2 つ)を設計に解決する。specs: [{ key, presetId }]。key が空('' / 'none' / 未指定)の枠は無視する。
  // 同じ設計に解決された指定(同じ種類・同じプリセット、または元のプリセットと同じプリセット)は 2 つ目以降を重複として除く。
  // 戻り: { targets: [{ design, label, sourceKey }], errors: [{ index, key, reason }], duplicates: [{ index, label }] }
  function resolveTargets(specs, design, args) {
    const targets = []; const errors = []; const duplicates = []; const seen = [];
    (specs || []).slice(0, MAX_TARGETS).forEach((sp, index) => {
      if (!sp || !sp.key || sp.key === 'none') return;
      const o = buildOther(sp.key, design, Object.assign({}, args, { presetId: sp.presetId }));
      if (!o.ok) { errors.push({ index, key: sp.key, reason: o.reason }); return; }
      const sig = JSON.stringify(o.design);
      if (seen.includes(sig)) { duplicates.push({ index, label: o.label }); return; }
      seen.push(sig);
      targets.push({ index, design: o.design, label: o.label, sourceKey: sp.key });
    });
    return { targets, errors, duplicates };
  }

  const api = { TARGET_NAMES, MAX_TARGETS, compareMulti, pairRow, compareNotesMulti, resolveTargets, ROWS, KIND_TEXT, CONF_TEXT, cellOf, compareRows, valueText, diffText, pctText, pubText, describe, compareNotes, sourceOptions, buildOther, pkgText };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.compareform = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
