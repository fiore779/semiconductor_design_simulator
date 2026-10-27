// プリセット選択の純粋ロジック(設計書 §8.4)。DOM に依存しない。Node でテストする。
(function (root) {
  'use strict';

  const SOURCE_LABEL = { meas: '実測', pub: '公表', sec: '二次' };
  const KIND_LABEL = { pc: 'PC', 'mobile-pc': 'ノートPC', mobile: 'モバイル', embedded: '組込み' };
  // 区分バッジの文字。未取得(null)は「未取得」と書く。'sec' は二次・推定をまとめたもの。
  function sourceLabel(s) { return SOURCE_LABEL[s] || '未取得'; }
  function kindLabel(k) { return KIND_LABEL[k] || k; }

  // データ充実度: 面積(全ダイ取得)・電力(いずれか取得)・GB7(スコアあり)の 3 項目。
  // 3 つ揃う=● full / 2 つ=◐ partial / 1 つ以下=○ poor。
  function completeness(preset, gb7ByName) {
    const dies = preset.dies || [];
    const p = preset.power || {};
    const items = {
      area: dies.length > 0 && dies.every((d) => typeof d.mm2 === 'number'),
      power: !!(p.base || p.peak || p.range),
      gb7: !!(preset.gb7 && (!gb7ByName || gb7ByName[preset.gb7])),
    };
    const labels = { area: '面積', power: '電力', gb7: 'GB7 スコア' };
    const missing = Object.keys(items).filter((k) => !items[k]).map((k) => labels[k]);
    const n = 3 - missing.length;
    const level = n === 3 ? 'full' : n === 2 ? 'partial' : 'poor';
    return { level, symbol: { full: '●', partial: '◐', poor: '○' }[level], text: { full: '完全', partial: '一部未取得', poor: '大半が未取得' }[level], missing };
  }

  // 総面積の表示用(未取得ダイがあれば部分合計である旨を返す)
  function areaSummary(preset) {
    const dies = preset.dies || [];
    const known = dies.filter((d) => typeof d.mm2 === 'number');
    if (!known.length) return { mm2: null, text: '未取得', partial: false };
    const mm2 = known.reduce((s, d) => s + d.mm2, 0);
    const partial = known.length < dies.length;
    return { mm2, partial, text: `${mm2.toFixed(1)} mm²${partial ? '(一部未取得)' : ''}` };
  }

  // 絞り込み。f: { vendors:[], kinds:[], query:'', yearMin, yearMax, levels:[] }(空配列=絞り込まない)
  function filterPresets(presets, f, gb7ByName) {
    const q = ((f && f.query) || '').trim().toLowerCase();
    const has = (a, v) => !a || !a.length || a.includes(v);
    return presets.filter((p) => {
      if (!has(f.vendors, p.vendor) || !has(f.kinds, p.kind)) return false;
      if (f.yearMin != null && p.year < f.yearMin) return false;
      if (f.yearMax != null && p.year > f.yearMax) return false;
      if (f.levels && f.levels.length && !f.levels.includes(completeness(p, gb7ByName).level)) return false;
      if (q) {
        const hay = [p.name, p.family, p.vendor, p.id, p.isa, ...(p.cfg && p.cfg.cores ? p.cfg.cores.map((c) => c.uarch) : [])].join(' ').toLowerCase();
        return q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });
  }

  // 並べ替え。key: 'name' | 'year' | 'area' | 'gb7'(降順は dir=-1)。未取得は常に末尾。
  function sortPresets(list, key, dir, gb7ByName) {
    const d = dir === -1 ? -1 : 1;
    const val = (p) => key === 'year' ? p.year : key === 'area' ? areaSummary(p).mm2 : key === 'gb7' ? ((gb7ByName && gb7ByName[p.gb7]) ? gb7ByName[p.gb7].single : null) : p.name;
    return list.slice().sort((a, b) => {
      const x = val(a); const y = val(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y, 'ja') : x - y) * d;
    });
  }

  const api = { sourceLabel, kindLabel, completeness, areaSummary, filterPresets, sortPresets };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.presetlist = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
