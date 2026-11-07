'use strict';
// Intel タイル型(x86-tile)の Compute タイルを注釈つきダイ写真の目測に倣って配置するテスト。配置・大きさは目測で、実チップのフロアプランではない。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const comp = (id) => mk(id).dies.find((x) => x.layout);

const PHOTO = { 'intel-mtl-185h': 'mtl-compute', 'intel-arl-285k': 'arl-compute', 'intel-lnl-268v': 'lnl-compute', 'intel-ptl-x9-388h': 'ptl-compute' };
const REUSE = { 'intel-ptl-x9-386h': 'ptl-compute', 'intel-ptl-x9-378h': 'ptl-compute', 'intel-ptl-x7-358h': 'ptl-compute', 'intel-arl-265k': 'arl-compute', 'intel-arl-275hx': 'arl-compute', 'intel-lnl-258v': 'lnl-compute', 'intel-lnl-256v': 'lnl-compute' };

test('Intel タイル: photo 4 件・reuse 7 件は x86-tile + 枠、scaleNote は 600 字以内で「目測」「推定」を含む', () => {
  Object.keys(PHOTO).forEach((id) => { const l = comp(id).layout; assert.strictEqual(l.template, 'x86-tile', id); assert.strictEqual(l.scaleBasis, 'photo', id); assert.strictEqual(l.frame, PHOTO[id], id); });
  Object.keys(REUSE).forEach((id) => { const l = comp(id).layout; assert.strictEqual(l.template, 'x86-tile', id); assert.strictEqual(l.scaleBasis, 'reuse', id); assert.strictEqual(l.frame, REUSE[id], id); });
  Object.keys(PHOTO).concat(Object.keys(REUSE)).forEach((id) => {
    const l = comp(id).layout; assert.ok(l.scaleNote.length <= 600, `${id} ${l.scaleNote.length}`);
    assert.ok(l.scaleNote.includes('目測') && l.scaleNote.includes('推定'), id);
    assert.strictEqual(FP.checkLayout(l), null, id);
  });
});

test('Intel タイル: ダイ面積は公表値のまま・縦横比は写真の枠・コア数が一致・ブロックはダイ内で重ならない', () => {
  Object.keys(PHOTO).concat(Object.keys(REUSE)).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = comp(id);
    assert.strictEqual(d.dies.length, p.dies.length, id);
    const src = p.dies.find((x) => typeof x.mm2 === 'number' && /Compute/.test(x.name));
    assert.strictEqual(die.areaMm2, src.mm2, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - src.mm2) < 1e-6, id);
    const fr = FP.TILE_FRAMES[die.layout.frame];
    assert.ok(Math.abs(die.widthMm / die.heightMm / fr.aspect - 1) < 1e-6, id);
    const want = p.cfg.cores.reduce((s, g) => s + g.count, 0);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'core').length, want, id);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'l3').length, 1, id);
    assert.deepStrictEqual(design.validate(d), [], id);
    die.blocks.forEach((b) => { if (b.decorative) assert.ok(['uncore', 'gpu', 'npu'].includes(b.kind), id); else assert.ok(['core', 'l3'].includes(b.kind), id); });
  });
});

test('Intel タイル: ダイの縦横比(285K 1.92、268V 1.90、388H 1.77、185H 1.10)とタイルごとのコア数の枠', () => {
  const r = (id) => { const x = comp(id); return x.widthMm / x.heightMm; };
  assert.ok(Math.abs(r('intel-arl-285k') - 1.925) < 0.01);
  assert.ok(Math.abs(r('intel-lnl-268v') - 1.899) < 0.01);
  const pn = comp('intel-ptl-x9-388h').layout.scaleNote; assert.ok(pn.includes('縮尺の注記はなく') && pn.includes('独立した検証なし') && !pn.includes('Xe3 4 コア版'));
  assert.ok(Math.abs(r('intel-ptl-x9-388h') - 1.771) < 0.01);
  assert.ok(Math.abs(r('intel-mtl-185h') - 1.097) < 0.01);
  Object.keys(FP.TILE_FRAMES).forEach((k) => { const t = FP.TILE_FRAMES[k]; assert.strictEqual(t.big.length, t.nom.p, k); assert.strictEqual(t.small.length, t.nom.e, k); assert.strictEqual(t.lp.length, t.nom.lp, k); });
});

test('Intel タイル: 265K は 285K より E 枠が 4 つ空く(コアの大きさは同じ)・写真の外のコア数に増やすと schematic に落ちる', () => {
  const a = comp('intel-arl-285k'); const b = comp('intel-arl-265k');
  assert.strictEqual(a.blocks.filter((x) => x.coreType === 'E').length, 16);
  assert.strictEqual(b.blocks.filter((x) => x.coreType === 'E').length, 12);
  assert.strictEqual(a.blocks.find((x) => x.coreType === 'P').w, b.blocks.find((x) => x.coreType === 'P').w);
  const d = mk('intel-arl-285k'); const r = design.unlock(d);
  const e = design.setCoreCount(r, 'P', 10);
  assert.ok(e.ok);
  const l = e.design.dies.find((x) => x.layout).layout;
  assert.strictEqual(l.scaleBasis, 'schematic');
  const e2 = design.setCoreCount(r, 'E', 12);
  assert.strictEqual(e2.design.dies.find((x) => x.layout).layout.scaleBasis, 'photo');
});

test('Intel タイル: frame の検査(未知の frame・他テンプレートの frame は不可)', () => {
  const ok = (l) => FP.checkLayout(l) === null;
  assert.ok(ok({ template: 'x86-tile', frame: 'arl-compute' }));
  assert.ok(!ok({ template: 'x86-tile', frame: 'nope' }));
  assert.ok(!ok({ template: 'intel-hybrid', frame: 'arl-compute' }));
  assert.ok(!ok({ template: 'apple-soc', frame: 'arl-compute' }));
  // Wildcat Lake は 2026-11-04 に Core 5 320 を追加(frame は wcl-compute。下の専用テスト)
  assert.deepStrictEqual(D.presets.filter((p) => /wcl|wildcat/i.test(p.id)).map((p) => p.id), ['intel-wcl-c5-320']);
});

test('Panther Lake: GPU・Platform タイルは飾りのダイ(decorDies)。寸法は二次資料の Kurnal 値で、評価・ダイ数・面積合計に入らない', () => {
  const E = require('../js/model/evaluate.js'); const ctx = E.makeContext();
  // 388H・378H・358H は 12Xe(Arc B390。設計書の Wikipedia 表)で GPU+Platform、386H は 4Xe で Platform のみ
  const x386 = mk('intel-ptl-x9-386h');
  // 386H(4Xe)は 4Xe 版の GPU タイル(decor2。Panther Lake_dies.jpg の同一画像内の相対寸法の目測。出典未確認)+ Platform
  assert.deepStrictEqual(x386.decorDies.map((x) => x.kind), ['gpu-tile', 'platform-tile']);
  assert.deepStrictEqual(x386.decorDies.map((x) => x.id), ['decor2', 'decor1']);
  assert.ok(x386.dies[0].layout.scaleNote.includes('4Xe'));
  {
    const [g4, pl4] = x386.decorDies; const c = x386.dies[0];
    assert.strictEqual(g4.sizeBasis.s, 'est'); assert.ok(g4.sizeBasis.source.includes('出典未確認') && g4.sizeBasis.source.includes('Panther Lake_dies.jpg'));
    assert.ok(g4.label.includes('4 コア') && g4.label.includes('推定'));
    // 12Xe(6.78×8.14)の約 0.49 倍の幅で高さは同じ。面積は Compute の約 0.23 倍(画像の 45/93×0.484)
    assert.ok(Math.abs(g4.widthMm / 6.78 - 0.4855) < 0.01 && Math.abs(g4.heightMm - 8.14) < 1e-3);
    assert.ok(Math.abs(g4.areaMm2 / c.areaMm2 - 0.2327) < 0.01, String(g4.areaMm2 / c.areaMm2));
    assert.ok(g4.x >= c.x + c.widthMm); assert.ok(pl4.y >= c.y + c.heightMm - 1e-6);
    assert.ok(!(pl4.x < g4.x + g4.widthMm && g4.x < pl4.x + pl4.widthMm && pl4.y < g4.y + g4.heightMm && g4.y < pl4.y + pl4.heightMm));
    assert.ok(FP.decorNote(x386.decorDies).includes('Panther Lake_dies.jpg'));
    assert.strictEqual(FP.checkDecorDies(x386.decorDies, new Set(), ['x86-tile']), null);
  }
  assert.deepStrictEqual(design.validate(x386), []);
  ['intel-ptl-x9-388h', 'intel-ptl-x9-378h', 'intel-ptl-x7-358h'].forEach((id) => {
    const d = mk(id); const c = d.dies[0];
    assert.strictEqual(d.dies.length, byId(id).dies.length, id);
    assert.strictEqual(d.decorDies.length, 2, id);
    const [g, pl] = d.decorDies;
    assert.strictEqual(g.kind, 'gpu-tile'); assert.strictEqual(pl.kind, 'platform-tile');
    assert.ok(g.label.includes('飾り') && g.label.includes('推定') && pl.label.includes('推定'));
    assert.strictEqual(g.sizeBasis.s, 'sec'); assert.ok(g.sizeBasis.source.includes('[推定]') && g.sizeBasis.source.includes('8.14'));
    assert.ok(Math.abs(g.widthMm - 6.78) < 1e-3 && Math.abs(g.heightMm - 8.14) < 1e-3 && Math.abs(pl.widthMm - 12.44) < 1e-3 && Math.abs(pl.heightMm - 4) < 1e-3); // 設計書の調査表の Kurnal 寸法
    // 面積比は Kurnal 全体図の目測: GPU 約 0.48、Platform 約 0.43(Compute 基準)
    assert.ok(Math.abs(g.areaMm2 / c.areaMm2 - 0.484) < 0.01, String(g.areaMm2 / c.areaMm2));
    assert.ok(Math.abs(pl.areaMm2 / c.areaMm2 - 0.431) < 0.01);
    assert.ok(Math.abs(g.widthMm * g.heightMm - g.areaMm2) < 1e-3);
    // 配置: GPU は Compute の右、Platform は Compute の下。重ならない
    assert.ok(g.x >= c.x + c.widthMm); assert.ok(pl.y >= c.y + c.heightMm - 1e-6);
    assert.ok(!(pl.x < g.x + g.widthMm && g.x < pl.x + pl.widthMm && pl.y < g.y + g.heightMm && g.y < pl.y + pl.heightMm));
    assert.deepStrictEqual(design.validate(d), [], id);
    assert.deepStrictEqual(design.parse(design.serialize(d)).ok, true, id);
    const bare = JSON.parse(JSON.stringify(d)); delete bare.decorDies;
    assert.deepStrictEqual(E.evaluate(d, ctx), E.evaluate(bare, ctx), id);
  });
  assert.ok(FP.decorNote(mk('intel-ptl-x9-388h').decorDies).includes('評価・面積合計には含まない'));
  // 386H の評価も decorDies の有無で同じ
  const b386 = JSON.parse(JSON.stringify(x386)); delete b386.decorDies; assert.deepStrictEqual(E.evaluate(x386, ctx), E.evaluate(b386, ctx));
  // ほかの Intel タイル(枠に tiles が無い)・AMD 以外には付かない
  assert.ok(!mk('intel-arl-285k').decorDies); assert.ok(!mk('intel-lnl-268v').decorDies);
});

test('ptl-compute を使う TILE_MAP の各プリセットは、12Xe の GPU(decor0)か 4Xe の GPU(decor2)のどちらか一方だけを出す', () => {
  const ids = D.presets.map((p) => p.id).filter((id) => comp(id) && comp(id).layout && comp(id).layout.frame === 'ptl-compute');
  assert.strictEqual(ids.length, 4);
  ids.forEach((id) => {
    const gpus = mk(id).decorDies.filter((x) => x.kind === 'gpu-tile').map((x) => x.id);
    assert.strictEqual(gpus.length, 1, id);
    assert.strictEqual(gpus[0], id === 'intel-ptl-x9-386h' ? 'decor2' : 'decor0', id);
  });
});

test('Panther Lake 4P+4LPE の Compute 枠(ptl-compute-4p4lpe。Panther Lake_dies.jpg の左の構成の目測。Core Ultra 5 325 が使う): E 無し・縦横比は画像の 162/112 と一致', () => {
  const T = FP.TILE_FRAMES['ptl-compute-4p4lpe']; const M = FP.TILE_FRAMES['ptl-compute'];
  assert.ok(T);
  assert.strictEqual(FP.checkLayout({ template: 'x86-tile', frame: 'ptl-compute-4p4lpe' }), null);
  assert.ok(!(FP.checkLayout({ template: 'amd-apu', frame: 'ptl-compute-4p4lpe' }) === null));
  assert.deepStrictEqual(T.nom, { p: 4, e: 0, lp: 4 });
  assert.strictEqual(T.big.length, 4); assert.strictEqual(T.small.length, 0); assert.strictEqual(T.lp.length, 4);
  assert.strictEqual(T.tiles.length, 0); // ダイ面積が未取得なので飾りのタイルは付けない
  assert.ok(Math.abs(T.aspect - 162 / 112) < 0.01, String(T.aspect));
  // 長辺は 4P+8E+4LPE の枠の約 0.82 倍(画像の 162/198)。短辺は同じ
  assert.ok(Math.abs((T.box[2] - T.box[0]) / (M.box[2] - M.box[0]) - 162 / 198) < 0.01);
  assert.strictEqual(T.box[3] - T.box[1], M.box[3] - M.box[1]);
  // ブロックは枠内
  const inBox = (x, y, w, h) => x >= T.box[0] && y >= T.box[1] && x + w <= T.box[2] + 1e-6 && y + h <= T.box[3] + 1e-6;
  T.big.concat(T.lp).forEach((r) => assert.ok(inBox(r[0], r[1], r[2], r[3]), JSON.stringify(r)));
  assert.ok(inBox(T.l3[0], T.l3[1], T.l3[2], T.l3[3]));
  T.deco.forEach((r) => assert.ok(inBox(r[3], r[4], r[5], r[6]), r[0]));
  // 4P+8E+4LPE の枠(ptl-compute)は従来どおり E 8
  assert.strictEqual(M.small.length, 8);
});

// ---- 2026-11-04 追加: Core Ultra 5 325(4P+4LPE)・Core 5 320(Wildcat Lake)。ダイ面積は未取得(null) ----
const NEW2 = { 'intel-ptl-u5-325': 'ptl-compute-4p4lpe', 'intel-wcl-c5-320': 'wcl-compute' };
test('325・320: x86-tile + 専用の枠で checkLayout を通り、ダイ面積 null でも寸法・ブロック(コア数・L3)・飾りが出て、飾りのタイル・飾りのダイは付かない', () => {
  Object.keys(NEW2).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = comp(id); const l = die.layout;
    assert.strictEqual(l.template, 'x86-tile', id);
    assert.strictEqual(l.frame, NEW2[id], id);
    assert.strictEqual(FP.checkLayout(l), null, id);
    assert.ok(l.scaleNote.length <= 600 && l.scaleNote.includes('目測') && l.scaleNote.includes('ダイ面積未取得'), `${id} ${l.scaleNote.length}`);
    assert.strictEqual(die.areaMm2, null, id);
    assert.ok(die.widthMm > 0 && die.heightMm > 0, id);
    assert.ok(Math.abs(die.widthMm / die.heightMm / FP.TILE_FRAMES[l.frame].aspect - 1) < 1e-6, id);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'core').length, p.cfg.cores.reduce((s, g) => s + g.count, 0), id);
    assert.strictEqual(die.blocks.filter((b) => b.kind === 'l3').length, 1, id);
    assert.strictEqual(d.decorDies === undefined || d.decorDies === null || d.decorDies.length === 0, true, id);
    assert.deepStrictEqual(design.validate(d), [], id);
    die.blocks.forEach((b) => { if (b.decorative) assert.ok(['uncore', 'gpu', 'npu'].includes(b.kind), id); else assert.ok(['core', 'l3'].includes(b.kind), id); });
  });
  assert.ok(comp('intel-ptl-u5-325').layout.scaleNote.includes('Panther Lake_dies.jpg(ユーザー提供・出典未確認)'));
  assert.strictEqual(comp('intel-ptl-u5-325').layout.scaleBasis, 'reuse');
  assert.ok(comp('intel-wcl-c5-320').layout.scaleNote.includes('compute die 単体と判断'));
});

test('wcl-compute 枠: P 2・LP-E(Darkmont)4・E 無し、枠・飾りは写真(1182×1427)の中でダイ外形に収まり互いに重ならない。x86-tile 専用', () => {
  const T = FP.TILE_FRAMES['wcl-compute'];
  assert.ok(T);
  assert.deepStrictEqual(T.nom, { p: 2, e: 0, lp: 4 });
  assert.strictEqual(FP.checkLayout({ template: 'x86-tile', frame: 'wcl-compute' }), null);
  ['amd-apu', 'x86-mono', 'arm-soc', 'intel-hybrid'].forEach((t) => assert.ok(FP.checkLayout({ template: t, frame: 'wcl-compute' }) !== null, t));
  assert.strictEqual(T.tiles.length, 0); // I/O タイルの飾りは付けない
  assert.ok(T.box[0] >= 0 && T.box[1] >= 0 && T.box[2] <= 1182 && T.box[3] <= 1427);
  assert.ok(Math.abs(T.aspect - 1168 / 1406) < 1e-9);
  const rects = [];
  T.big.forEach((r, i) => rects.push(['P' + i, r])); T.lp.forEach((r, i) => rects.push(['LP' + i, r])); rects.push(['l3', T.l3]);
  T.deco.forEach((d) => rects.push([d[0], [d[3], d[4], d[5], d[6]]]));
  rects.forEach(([n, r]) => assert.ok(r[0] >= T.box[0] && r[1] >= T.box[1] && r[0] + r[2] <= T.box[2] && r[1] + r[3] <= T.box[3], n));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i][1]; const b = rects[j][1];
    assert.ok(a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1], `${rects[i][0]} と ${rects[j][0]} が重なる`);
  }
  // 5-core 以上などの枠外の構成は schematic に落ちる(P を 3 に増やす)
  const r = design.unlock(mk('intel-wcl-c5-320'));
  const e = design.setCoreCount(r, 'P', 3);
  assert.ok(e.ok);
  assert.strictEqual(e.design.dies.find((x) => x.layout).layout.scaleBasis, 'schematic');
});

test('325・320: 325 の GB7(n=25)の誤差と判定、320 は GB7 なし。どちらも校正に入らない', () => {
  const E = require('../js/model/evaluate.js'); const ctx = E.makeContext();
  const r325 = E.evaluate(mk('intel-ptl-u5-325'), ctx); const r320 = E.evaluate(mk('intel-wcl-c5-320'), ctx);
  assert.ok(r325.st.ok && r325.mt.ok && r320.st.ok && r320.mt.ok);
  assert.deepStrictEqual([r325.st.published, r325.mt.published], [2337, 11018]); // 2026-11-04 に n=2 の旧値(1885 / 9500)を n=25 の取り直し値に更新
  // 2026-11-07: Zen 3 の代表を加えて x86 の ISA 平均 u が 107.832→106.818 に動き、さらに Lion Cove の L3 遅延 75→84 で代表 265K の予測が下がって Lion Cove の u が 97.780→98.323 に動いた(Lion Cove の u は不変ではない。旧記述の誤りを訂正)。ST 6.9182→5.9134、MT -14.0594→-15.6143(Skymont の L3 遅延 69 も効いた)
  assert.ok(Math.abs(r325.st.errPct - 5.9134) < 0.001 && Math.abs(r325.mt.errPct + 15.6143) < 0.001); // MT 誤差は 2026-11-05 の帯 0 再校正(0.65 → 0.69)で -18.8091 → -14.4345。同日 2 回目: 265K の P boost 5.5→5.4 に伴う Lion Cove の u 再校正で ST 6.4515 → 6.9182、MT -14.4345 → -14.0594
  const rows325 = require('../js/ui/reproduce.js').reproductionRows(r325); // n=25 の「直近25件の中央値」は gray にならず ok / ng の判定が出る
  assert.strictEqual(rows325.find((x) => /シングル/.test(x.label)).verdict, 'ok');
  assert.strictEqual(rows325.find((x) => /マルチ/.test(x.label)).verdict, 'ng');
  assert.deepStrictEqual([r320.st.published, r320.mt.published], [2242, 7212]); // 2026-11-04 にユーザー提供の検索結果(スクリーンショット 3 枚、直近 25 件、n=25)の中央値を採用
  // 2026-11-07: 同上の校正の動きで ST 10.3659→9.3287(ng → ok に反転)、MT -3.3499→-4.8887
  assert.ok(Math.abs(r320.st.errPct - 9.3287) < 0.001 && Math.abs(r320.mt.errPct + 4.8887) < 0.001); // MT 誤差は 2026-11-05 の帯 0 再校正で -8.5311 → -3.7717。同日 2 回目: Lion Cove の u 再校正で ST 9.8842 → 10.3659(許容 ±10% を超えて ok → ng)、MT -3.7717 → -3.3499
  const rows320 = require('../js/ui/reproduce.js').reproductionRows(r320);
  assert.strictEqual(rows320.find((x) => /シングル/.test(x.label)).verdict, 'ok'); // 2026-11-07: ST +9.3% で ng → ok(下の旧コメントは当時の記録) // n=25 は gray にならず判定が出る(ST +10.4%。2026-11-05 の Lion Cove u 再校正前は +9.9% で ok)
  assert.strictEqual(rows320.find((x) => /マルチ/.test(x.label)).verdict, 'ok'); // MT -3.8%(2026-11-05 の再校正後。再校正前は -8.5%)
  assert.strictEqual(r325.area.totalMm2, null); assert.strictEqual(r320.area.totalMm2, null);
  assert.strictEqual(byId('intel-ptl-u5-325').calib, false); assert.strictEqual(byId('intel-wcl-c5-320').calib, false);
});

test('decorDies の検査: kind とテンプレートの対応(iod は amd-chiplet、gpu-tile / platform-tile は x86-tile)', () => {
  const mkd = (kind) => [{ id: 'dx', kind, label: 'x', x: 0, y: 0, widthMm: 2, heightMm: 2, areaMm2: 4 }];
  assert.strictEqual(FP.checkDecorDies(mkd('iod'), new Set(), ['amd-chiplet']), null);
  assert.ok(FP.checkDecorDies(mkd('iod'), new Set(), ['x86-tile']));
  assert.strictEqual(FP.checkDecorDies(mkd('gpu-tile'), new Set(), ['x86-tile']), null);
  assert.ok(FP.checkDecorDies(mkd('platform-tile'), new Set(), ['amd-chiplet']));
  assert.ok(FP.checkDecorDies(mkd('gpu-tile'), new Set(), [undefined, null]));
  assert.ok(FP.checkDecorDies(mkd('bad'), new Set(), ['x86-tile']));
  // 設計(parse)でも拒否: 5950X に gpu-tile、388H に iod
  const a = JSON.parse(JSON.stringify(mk('amd-zen3-5950x'))); a.decorDies[0].kind = 'gpu-tile';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const p = JSON.parse(JSON.stringify(mk('intel-ptl-x9-388h'))); p.decorDies[0].kind = 'iod';
  assert.strictEqual(design.parse(JSON.stringify(p)).ok, false);
});
