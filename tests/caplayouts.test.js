'use strict';
// 3D パッケージビューのコンデンサ配置(2026-11-16。data/caplayouts.js と js/render/pkggeom.js の capacitorLayout・capSpecOf・capacitorNote)のテスト。
// 調査: docs/research/capacitor-layout-2026-11-16.md。caps は描画だけに使う(評価には影響しない)。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const G = require('../js/render/pkggeom.js');
const { createPackageView3D } = require('../js/render/pkgview3d.js');

const L = D.caplayouts;
const STATES = ['rules', 'none', 'unknown'];
const GRADES = ['実測', '公表', '二次', '推定'];
const mk = (id) => design.fromPreset(D.presets.find((p) => p.id === id), { mode: 'reproduce' });
const rectOf = (c) => { const hl = c.axis === 'x' ? c.len / 2 : c.wid / 2; const hw = c.axis === 'x' ? c.wid / 2 : c.len / 2; return { x0: c.cx - hl, x1: c.cx + hl, z0: c.cz - hw, z1: c.cz + hw }; };
const E = 1e-6;
const overlap = (a, b) => a.x0 < b.x1 - E && a.x1 > b.x0 + E && a.z0 < b.z1 - E && a.z1 > b.z0 + E;
const dieRects = (d) => d.dies.concat(d.decorDies || []).map((x) => ({ x0: x.x, z0: x.y, x1: x.x + x.widthMm, z1: x.y + x.heightMm }));

test('対応表: 全プリセットを網羅し、未知の id も、種類の取りこぼしも無い。種類ごとに状態・根拠(区分・取得日)がある', () => {
  assert.strictEqual(D.presets.length, 112);
  const missing = D.presets.filter((p) => !(p.id in L.presets)).map((p) => p.id);
  assert.deepStrictEqual(missing, []);
  const known = new Set(D.presets.map((p) => p.id));
  assert.deepStrictEqual(Object.keys(L.presets).filter((id) => !known.has(id)), [], '対応表に無いプリセット id がある');
  assert.strictEqual(Object.keys(L.presets).length, 112);
  const ids = L.kinds.map((k) => k.id);
  assert.strictEqual(new Set(ids).size, ids.length, '種類 id の重複');
  Object.values(L.presets).forEach((k) => assert.ok(ids.includes(k), `未定義の種類 ${k}`));
  ids.forEach((k) => assert.ok(Object.values(L.presets).includes(k), `どのプリセットにも使われない種類 ${k}`));
  L.kinds.forEach((k) => {
    assert.ok(STATES.includes(k.state), k.id);
    assert.ok(k.basis.length >= 1 && k.basis.every((b) => GRADES.includes(b.grade) && b.date === '2026-11-16' && typeof b.text === 'string' && b.text.length > 5), `${k.id} の根拠`);
    if (k.state === 'rules') {
      assert.ok(k.groups.length >= 1 && ['outside', 'underLid'].includes(k.place) && ['square', 'portrait'].includes(k.frame), k.id);
      assert.ok(k.basis.some((b) => b.grade !== '推定' && (b.url || b.grade === '推定')), `${k.id} に推定以外の根拠(出典)がある`);
      k.groups.forEach((g) => assert.ok(['left', 'right', 'top', 'bottom'].includes(g.edge) && g.from >= 0 && g.to <= 1 && g.from < g.to && g.depth[0] >= 0 && g.depth[1] <= 1 && g.depth[0] < g.depth[1] && g.rows >= 1 && g.perRow >= 1 && ['perp', 'para'].includes(g.axis), k.id));
    } else assert.deepStrictEqual(k.groups, [], `${k.id}: 描かない種類は規則を持たない`);
    (k.basis.filter((b) => b.url)).forEach((b) => assert.ok(/^https:\/\//.test(b.url), b.url));
  });
  // 件数(2026-11-16 時点): ① 30 件(am4-zen3 4・am5 8・lga1700 10・lga1851 2・amd-fp-ring 2・amd-fl1 1・apple-m1 1・nv-orin 1・nv-gb10 1)、② 42 件(モバイル BGA の MTL・LNL 4・ARL-H 1・スマホ PoP 37)、③ 39 件
  const by = { rules: 0, none: 0, unknown: 0 };
  D.presets.forEach((p) => { by[G.capSpecOf(L, p.id).state]++; });
  assert.deepStrictEqual(by, { rules: 30, none: 42, unknown: 40 }); // 2026-11-16: Phoenix 2 の 7545U(パッケージ写真なし → unknown)で 39 → 40
});

test('capSpecOf: 引ける id は種類を返し、null・未知の id・プロトタイプ上の名前は null', () => {
  assert.strictEqual(G.capSpecOf(L, 'amd-zen4-7800x3d').id, 'am5');
  assert.strictEqual(G.capSpecOf(L, 'apple-m1').id, 'apple-m1'); assert.strictEqual(G.capSpecOf(L, 'apple-m2').id, 'apple-m-unconfirmed');
  [null, undefined, 'nonexistent', 'constructor', '__proto__', 'toString'].forEach((x) => assert.strictEqual(G.capSpecOf(L, x), null, String(x)));
  assert.strictEqual(G.capSpecOf(null, 'am5'), null); assert.strictEqual(G.capSpecOf({}, 'am5'), null);
});

test('種類ごと: ① は 1 個以上で、全部が基板内・ダイ(飾りを含む)と重ならない・互いに重ならない。outside は蓋の外、underLid は蓋の内側。② ③ は 0 個。決定的', () => {
  D.presets.forEach((p) => {
    const d = design.fromPreset(p, { mode: 'reproduce' });
    const spec = G.capSpecOf(L, p.id);
    const s = G.buildScene(d, { capSpec: spec });
    assert.strictEqual(s.counts.caps, s.caps.length);
    if (spec.state !== 'rules') { assert.strictEqual(s.caps.length, 0, `${p.id}(${spec.id}): ② ③ は 0 個`); return; }
    assert.ok(s.caps.length >= 1, `${p.id}(${spec.id}): ① は 1 個以上`);
    assert.deepStrictEqual(G.buildScene(d, { capSpec: spec }).caps, s.caps, '決定的');
    const dies = dieRects(d); const rs = s.caps.map(rectOf);
    rs.forEach((r, i) => {
      assert.ok(r.x0 >= s.sub.x0 && r.x1 <= s.sub.x1 && r.z0 >= s.sub.z0 && r.z1 <= s.sub.z1, `${p.id}: 基板内`);
      dies.forEach((x) => assert.ok(!overlap(r, x), `${p.id}: ダイと重なる`));
      if (spec.place === 'underLid') assert.ok(r.x0 >= s.ihs.x0 - E && r.x1 <= s.ihs.x1 + E && r.z0 >= s.ihs.z0 - E && r.z1 <= s.ihs.z1 + E, `${p.id}: 蓋の範囲の内側`);
      else assert.ok(!overlap(r, s.ihs), `${p.id}: 蓋の外側`);
      for (let j = i + 1; j < rs.length; j++) assert.ok(!overlap(r, rs[j]), `${p.id}: コンデンサどうしが重なる`);
    });
  });
});

test('個数の目安: 12900K 8 個・285K 12 個(調査メモの目視)。AM5 は 1 辺ごとに 8 塊を置く(100 個前後)。Orin は約 50 個', () => {
  const n = (id) => G.buildScene(mk(id), { capSpec: G.capSpecOf(L, id) }).caps.length;
  assert.strictEqual(n('intel-adl-12900k'), 8); assert.strictEqual(n('intel-rpl-13900k'), 8); assert.strictEqual(n('intel-arl-285k'), 12);
  assert.ok(n('amd-zen4-7800x3d') >= 80 && n('amd-zen4-7800x3d') <= 160);
  assert.ok(n('nv-orin-agx') >= 40 && n('nv-orin-agx') <= 60);
  assert.ok(n('apple-m1') >= 15 && n('apple-m1') <= 24);
});

test('spec なしは従来の模式配置のまま(buildScene・capacitorLayout とも)。spec = null も同じ', () => {
  const d = mk('amd-zen4-7800x3d');
  const all = d.dies.concat(d.decorDies || []);
  const sub = G.substrateSize(all, d.package && d.package.substrateId); const ihs = G.ihsRect(all, sub);
  const legacy = G.capacitorLayout(sub, ihs);
  assert.ok(legacy.length >= 1);
  assert.deepStrictEqual(G.capacitorLayout(sub, ihs, undefined, all), legacy);
  assert.deepStrictEqual(G.capacitorLayout(sub, ihs, null, all), legacy);
  assert.deepStrictEqual(G.buildScene(d, {}).caps, legacy);
  assert.notDeepStrictEqual(G.buildScene(d, { capSpec: G.capSpecOf(L, 'amd-zen4-7800x3d') }).caps, legacy, 'AM5 の規則は模式配置と違う');
  // 従来の模式配置は、帯が狭ければ空(規則のときの 1.4 mm 未満の判定は使わない)
  assert.deepStrictEqual(G.capacitorLayout({ x0: 0, z0: 0, x1: 10, z1: 10, margin: 1 }, { x0: 0.8, z0: 0.8, x1: 9.2, z1: 9.2 }), []);
});

test('portrait の枠: 基板が横長なら時計回りに 90° 回す(左の長辺 → 上の長辺)。縦長なら回さない。rules 以外の spec・ダイの無い underLid は空', () => {
  const spec = { state: 'rules', place: 'outside', frame: 'portrait', groups: [{ edge: 'left', from: 0.1, to: 0.3, depth: [0, 1], rows: 1, perRow: 3, axis: 'perp' }] };
  const mkSub = (w, h) => ({ x0: 0, z0: 0, x1: w, z1: h, margin: 4 }); const mkIhs = (w, h) => ({ x0: 4, z0: 4, x1: w - 4, z1: h - 4 });
  // 縦長(20 × 40): 左の辺に 3 個。帯は x 0〜4。perp なので長辺は x 方向
  const tall = G.capacitorLayout(mkSub(20, 40), mkIhs(20, 40), spec, [{ x: 4, y: 4, widthMm: 12, heightMm: 32 }]);
  assert.strictEqual(tall.length, 3);
  tall.forEach((c) => { assert.ok(c.cx < 4 && c.axis === 'x'); assert.ok(c.cz > 0.1 * 40 && c.cz < 0.3 * 40); });
  // 横長(40 × 20): 時計回りに回って上の辺(z 0〜4)。左の辺の上寄り(from 0.1〜0.3)は、上の辺では右寄り(1 - 0.3〜1 - 0.1)
  const wide = G.capacitorLayout(mkSub(40, 20), mkIhs(40, 20), spec, [{ x: 4, y: 4, widthMm: 32, heightMm: 12 }]);
  assert.strictEqual(wide.length, 3);
  wide.forEach((c) => { assert.ok(c.cz < 4 && c.axis === 'z', '上の辺で、長辺は縁に垂直(= z 方向)'); assert.ok(c.cx > 0.7 * 40 && c.cx < 0.9 * 40, `cx=${c.cx}`); });
  // square の枠は回さない
  const sq = G.capacitorLayout(mkSub(40, 20), mkIhs(40, 20), Object.assign({}, spec, { frame: 'square' }), [{ x: 4, y: 4, widthMm: 32, heightMm: 12 }]);
  sq.forEach((c) => assert.ok(c.cx < 4));
  // 空になる場合
  assert.deepStrictEqual(G.capacitorLayout(mkSub(20, 40), mkIhs(20, 40), { state: 'none', groups: [] }, []), []);
  assert.deepStrictEqual(G.capacitorLayout(mkSub(20, 40), mkIhs(20, 40), { state: 'unknown' }, []), []);
  assert.deepStrictEqual(G.capacitorLayout(mkSub(20, 40), mkIhs(20, 40), Object.assign({}, spec, { place: 'underLid' }), []), [], 'underLid はダイが無いと帯を決められない');
  // 帯が置く個数に足りないときは減らす(重ならない)。厚さ 0.5 mm の帯には長さ 1.0 の perp は置けない
  assert.deepStrictEqual(G.capacitorLayout(mkSub(20, 40), { x0: 0.5, z0: 4, x1: 16, z1: 36 }, spec, []), []);
});

test('注記(capacitorNote): ① 実物写真に基づく模式 / ② 上面に無いので描かない / ③ 未確認 / preset 由来でない設計は根拠なし。蓋の下の種類は不透明の蓋では見えない旨を足す', () => {
  const t = (id) => G.capacitorNote(G.capSpecOf(L, id));
  assert.ok(t('amd-zen4-7800x3d').includes('コンデンサの位置は') && t('amd-zen4-7800x3d').includes('AMD AM5') && t('amd-zen4-7800x3d').includes('実物写真に基づく模式(個数・サイズは目安)'));
  assert.ok(!t('amd-zen4-7800x3d').includes('不透明の蓋では見えません'));
  assert.ok(t('amd-zen3-5600x').includes('不透明の蓋では見えません') && t('apple-m1').includes('不透明の蓋では見えません'));
  assert.ok(t('intel-adl-12900k').includes('90° 回した位置は推定') && t('intel-arl-285k').includes('90° 回した位置は推定'));
  assert.strictEqual(t('intel-mtl-185h'), 'この種類は実物の上面にコンデンサが無いので描いていません');
  assert.strictEqual(t('qc-855'), 'この種類は実物の上面にコンデンサが無いので描いていません');
  assert.strictEqual(t('intel-ptl-x9-388h'), '実物の配置は未確認のため描いていません');
  assert.strictEqual(G.capacitorNote(null), 'コンデンサの位置は模式(根拠なし)');
});

test('3D ビュー: design.presetId から種類を引いて描き、画面の注記に 1 行足す。混合・新規(presetId なし)は従来の模式配置 + 根拠なしの注記', () => {
  const mkView = () => {
    const uploads = [];
    const gl = new Proxy({}, { get(t, k) { if (k === 'isContextLost') return () => false; if (k === 'getExtension') return () => null; if (k === 'bufferData') return (a, data) => { if (data && data.length) uploads.push(data.length); }; if (k === 'getParameter') return () => 4096; if (/^[A-Z_0-9]+$/.test(String(k))) return 1; return () => 1; } });
    const ctx2d = new Proxy({}, { get(t, k) { if (k === 'measureText') return () => ({ width: 10 }); if (k === 'createLinearGradient') return () => ({ addColorStop() {} }); return () => {}; }, set() { return true; } });
    const raf = [];
    const mkCanvas = () => { const c = { width: 0, height: 0, style: {}, attrs: {}, listeners: {}, parentNode: null }; c.getContext = (ty) => (ty === '2d' ? ctx2d : gl); c.addEventListener = () => {}; c.removeEventListener = () => {}; c.setAttribute = (k, v) => { c.attrs[k] = v; }; c.focus = () => {}; c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 }); return c; };
    const doc = { createElement: () => mkCanvas() };
    doc.defaultView = { devicePixelRatio: 1, getComputedStyle: () => ({ position: 'relative' }), requestAnimationFrame: (f) => { raf.push(f); return raf.length; }, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {} };
    const container = { ownerDocument: doc, style: {}, children: [], getBoundingClientRect: () => ({ width: 800, height: 600 }), appendChild(c) { this.children.push(c); c.parentNode = this; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); } };
    const view = createPackageView3D(container, {});
    return { view, uploads, run() { raf.splice(0).forEach((f) => f()); } };
  };
  const notesOf = (d) => { const a = mkView(); a.view.setDesign(d); a.run(); return { notes: a.view.getNotes(), uploads: a.uploads }; };
  const capNote = (notes) => notes.find((n) => n.includes('コンデンサ') || n.includes('実物の配置は未確認'));
  assert.ok(capNote(notesOf(mk('amd-zen4-7800x3d')).notes).includes('実物写真に基づく模式'));
  assert.strictEqual(capNote(notesOf(mk('intel-mtl-185h')).notes), 'この種類は実物の上面にコンデンサが無いので描いていません');
  assert.strictEqual(capNote(notesOf(mk('intel-ptl-x9-388h')).notes), '実物の配置は未確認のため描いていません');
  const scratch = design.fromScratch({ name: 'x', widthMm: 20, heightMm: 20, nodeId: 'tsmc-n4' });
  scratch.dies[0].blocks = [{ id: 'b', x: 0, y: 0, w: 5, h: 5, kind: 'core', coreType: 'P', label: 'c' }];
  const sc = notesOf(scratch); assert.strictEqual(capNote(sc.notes), 'コンデンサの位置は模式(根拠なし)');
  // ダイ無しでは注記を出さない(何も描かない設計)
  assert.ok(!mkView().view.getNotes().some((n) => n.includes('コンデンサ')));
  // 描かない種類は、頂点がコンデンサのぶんだけ少ない(MTL: 0 個 / 従来の模式配置: 1 個以上)
  const withSpec = notesOf(mk('intel-mtl-185h')).uploads; const legacyD = mk('intel-mtl-185h'); legacyD.presetId = null;
  const noSpec = notesOf(legacyD).uploads;
  assert.ok(withSpec.reduce((a, b) => a + b, 0) < noSpec.reduce((a, b) => a + b, 0));
});
