// 再現度パネルの純粋ロジック(設計書 §8.5)。evaluate の結果から表の行を作る。DOM に依存しない。
// 判定: ok=許容内 / ng=超過 / na=公開値が無い・計算できない・モデル値が無いため判定しない
//       gray=公開値が弱い(個別投稿・件数少)ため判定に含めない(§8.5 の[推定]の扱いに準じた仮定)
//       trivial=プリセットの値そのもので比較にならない(面積)
(function (root) {
  'use strict';

  const VERDICT_TEXT = { ok: '✓ 許容内', ng: '✗ 超過', na: '— 判定しない', gray: '○ 参考(判定外)', trivial: '＝ 同じ値(検証ではない)' };

  const MIXED_TEXT = 'E コアの boost 未取得で base に落ち、クロックが混在している(13900K など)';

  function perfRow(label, r, tol, isMt) {
    const row = { label, published: r.published, publishedKind: r.publishedKind, sim: r.ok ? r.score : null, diffPct: r.errPct, verdict: 'na', note: '' };
    const add = (s) => { row.note = row.note ? row.note + ' / ' + s : s; };
    if (r.published == null) { row.note = '公開値が未取得'; return row; }
    if (!r.ok) { row.note = `計算できません: ${r.reason}`; return row; }
    if (/^個別投稿/.test(r.publishedKind || '')) { row.verdict = 'gray'; row.note = `公開値は${r.publishedKind}(件数が少ない)ため判定に含めない`; return row; }
    if (isMt && r.fallback) { row.verdict = 'gray'; row.note = '仮の IPC を含むため信頼できない(判定しない)'; if (r.mixedClock) add(MIXED_TEXT); return row; }
    const ok = Math.abs(r.errPct) <= tol * 100;
    row.verdict = ok ? 'ok' : 'ng';
    if (r.isCalibSample) add('校正に使った代表 SKU のため、一致して当然(検証ではない)');
    else if (r.calibNotUsedForMt) add('ST の補正には使ったが、MT の σ の合わせには使っていない');
    if (isMt && r.mixedClock) add(MIXED_TEXT);
    if (!ok) add('原因: モデルの限界か入力データ不足(未調査)');
    if (r.confidence === 'low') add('確度「低」');
    return row;
  }

  // 電力の判定(A 再現のみ)。モデル推定(全コア・最大クロック・電力制限なし)と公表ピークの差が ±15% 以内なら ok。
  // 条件が揃っていない(推定は制限なし、公表ピークは制限下)うえ、モデルは未校正なので、必ず注記を付ける
  const POWER_TOL = 0.15;
  const peakKind = (s) => ((typeof module !== 'undefined' && module.exports) ? require('./packageform.js') : root.SDS.ui.packageform).peakKindText(s);
  const powerLabel = (s) => `電力: モデル推定(全コア・最大クロック・電力制限なし)vs ${peakKind(s)}`;
  const POWER_LABEL = powerLabel(undefined);
  const POWER_CAVEAT = '推定は電力制限なしの値、比べるピークは電力制限下の値で条件が揃っていない。モデルは根拠のない仮の既定値で未校正';
  function powerRow(ev) {
    const pm = ev.powerModel;
    const row = { label: powerLabel(pm && pm.vsPublishedPeak && pm.vsPublishedPeak.s), published: null, publishedKind: null, sim: null, diffPct: null, verdict: 'na', note: '' };
    const fin = (head) => { row.note = `${head}。${POWER_CAVEAT}`; return row; };
    if (!pm || !pm.ok) return fin(`判定しない: ${(pm && pm.reason) || '電力モデルを校正できない'}`);
    row.sim = pm.estW;
    const v = pm.vsPublishedPeak;
    if (!v) return fin(`判定しない: ${pm.vsPublishedPeakReason || 'ピーク電力が未取得'}`);
    row.published = v.publishedW; row.diffPct = v.errPct;
    const ok = Math.abs(v.errPct) <= POWER_TOL * 100;
    row.verdict = ok ? 'ok' : 'ng';
    return fin(`許容 ±${POWER_TOL * 100}%`);
  }

  function reproductionRows(ev) {
    const tol = ev.tolerance;
    const rows = [perfRow('シングル性能(GB7)', ev.st, tol), perfRow('マルチ性能(GB7)', ev.mt, tol, true)];
    const a = ev.area;
    rows.push({
      label: 'ダイ面積', published: a.totalMm2, publishedKind: null, sim: a.totalMm2, diffPct: null, // 差は「—」(同じ値なので +0.0% とは書かない)
      verdict: a.totalMm2 == null ? 'na' : 'trivial',
      note: a.totalMm2 == null ? a.reason : '設計の面積はプリセットの値をそのまま使っているため比較にならない' + (a.unknownCount ? `(${a.unknownCount} 個のダイは未取得)` : ''),
    });
    const pw = ev.power.published;
    const pubTxt = [pw.base && `基準 ${pw.base.w} W`, pw.peak && `ピーク ${pw.peak.w} W`, pw.range && `${pw.range.minW}〜${pw.range.maxW} W`].filter(Boolean).join(' / ');
    rows.push({ label: '消費電力', published: pubTxt || null, publishedKind: null, sim: null, diffPct: null, verdict: 'na', note: pubTxt ? '公表値の一覧(モデル推定との比較は次の行)' : (ev.power.reason || '公表値が未取得') });
    rows.push(powerRow(ev));
    return rows;
  }

  const api = { VERDICT_TEXT, POWER_TOL, POWER_LABEL, POWER_CAVEAT, reproductionRows };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.reproduce = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
