'use strict';
// MediaTek Dimensity 9000〜9600 Pro と Switch 2 の T239 のダイ写真に倣った配置(floorplan.js の arm-soc。2026-11-03)のテスト。
// 配置・大きさは写真の目測で、実チップのフロアプランではない。画像は C:\LocalAI\画像(Kurnal の注釈つき)。docs/research/user-images.md 参照。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const FP = require('../js/model/floorplan.js');
const design = require('../js/model/design.js');
const E = require('../js/model/evaluate.js');

const byId = (id) => D.presets.find((p) => p.id === id);
const mk = (id) => design.fromPreset(byId(id));
const lay = (id) => mk(id).dies[0].layout || null;
const cores = (die) => die.blocks.filter((b) => b.kind === 'core');

const FRAME_OF = { 'mt-9000': 'mt-9000', 'mt-9200': 'mt-9200', 'mt-9300': 'mt-9300', 'mt-9400': 'mt-9400', 'mt-9500': 'mt-9500', 'mt-9600pro': 'mt-9600pro', 'nv-t239': 't239' };
// 注釈なしの写真(Orin・Thor。8200 は縦横比だけ採った)は構造から読めず、EPYC 7401 の写真はパッケージ上の黒いダイで中身が見えないので、従来の配置のまま
const NONE = ['nv-orin-agx', 'nv-thor', 'amd-epyc-7401'];

test('MediaTek・T239: 写真のある 7 件は arm-soc の photo。Dimensity 8200 は縦横比だけ写真に合わせた schematic。Orin・Thor と EPYC 7401 は従来の配置(layout なし)', () => {
  // 2026-11-04: Dimensity 8200(D8200-mt6896z-10.27x8.27x0.09mm.jpg。注釈なし)は縦横比 10.27/8.27 = 1.2418(画像 7667×6161 px = 1.2444 と 1% 以内)だけ採る。ブロックの配置は従来どおり
  const l8 = lay('mt-8200'); const d8 = mk('mt-8200').dies[0];
  assert.strictEqual(l8.template, 'arm-soc'); assert.strictEqual(l8.scaleBasis, 'schematic'); assert.strictEqual(l8.frame, undefined); assert.strictEqual(l8.aspect, 1.2418);
  assert.ok(l8.scaleNote.includes('縦横比のみ') && l8.scaleNote.includes('出典 URL 未確認') && l8.scaleNote.includes('模式で根拠なし') && l8.scaleNote.length <= 600);
  assert.ok(Math.abs(d8.widthMm / d8.heightMm - 1.2418) < 1e-9); assert.ok(Math.abs(1.2418 / (7667 / 6161) - 1) < 0.01);
  assert.ok(Math.abs(d8.widthMm * d8.heightMm - byId('mt-8200').dies[0].mm2) < 1e-6); assert.strictEqual(FP.checkLayout(l8), null);
  assert.strictEqual(design.parse(JSON.stringify(mk('mt-8200'))).ok, true);
  Object.keys(FRAME_OF).forEach((id) => {
    const l = lay(id); assert.ok(l, id);
    assert.strictEqual(l.template, 'arm-soc', id); assert.strictEqual(l.frame, FRAME_OF[id], id); assert.strictEqual(l.scaleBasis, 'photo', id);
    assert.ok(l.scaleNote.includes('目測') && l.scaleNote.includes('実チップのフロアプランではない') && l.scaleNote.includes('URL 候補'), id);
    assert.ok(l.scaleNote.length <= 600, id);
  });
  NONE.forEach((id) => assert.strictEqual(lay(id), null, id));
  assert.strictEqual(D.presets.filter((p) => p.vendor === 'MediaTek').length, 7);
  assert.strictEqual(D.presets.filter((p) => p.vendor === 'MediaTek' && lay(p.id)).length, 7);
  // 9600 Pro の写真は横長(ファイル名の寸法の縦横が逆)。12.80×10.47 = 134.0 mm² でプリセットと一致し、枠の比 1.22 とも合う
  assert.ok(Math.abs(12.80 * 10.47 - byId('mt-9600pro').dies[0].mm2) < 0.1);
  assert.ok(Math.abs(FP.TILE_FRAMES['mt-9600pro'].aspect / (12.80 / 10.47) - 1) < 0.01);
  assert.ok(lay('mt-9600pro').scaleNote.includes('縦横が逆'));
  // T239 の注記: 注釈の L3 は 2MiB・4MiB・2MiB(縦書き)で 2 通りに読める(cfg の 4MB と食い違うと断定しない)
  const n239 = lay('nv-t239').scaleNote; assert.ok(n239.includes('2 通りに読める') && n239.includes('cfg の 4MB') && n239.includes('食い違うかは未確定') && !n239.includes('2+4+2MiB'));
  // 注釈なしで推定した枠は『推定』と書いてある(9000 の左下のコア・9200 の左上の A715 と右上の X3・9400 の右上の X4 と 4 つ目の A720)
  assert.ok(lay('mt-9000').scaleNote.includes('注釈なし') && lay('mt-9000').scaleNote.includes('推定'));
  assert.ok(lay('mt-9200').scaleNote.includes('注釈なし') && lay('mt-9200').scaleNote.includes('X3') && lay('mt-9200').scaleNote.includes('推定'));
  assert.ok(lay('mt-9400').scaleNote.includes('注釈なし') && lay('mt-9400').scaleNote.includes('4 つ目の A720') && lay('mt-9400').scaleNote.includes('0.01 差'));
});

test('MediaTek・T239: ダイ面積・ダイ数はプリセットのまま、縦横比は写真の枠、コア数と種類ごとの数が一致、ダイ内に収まり重ならない', () => {
  Object.keys(FRAME_OF).forEach((id) => {
    const p = byId(id); const d = mk(id); const die = d.dies[0]; const tf = FP.TILE_FRAMES[FRAME_OF[id]];
    assert.strictEqual(d.dies.length, p.dies.length, id); assert.strictEqual(die.areaMm2, p.dies[0].mm2, id);
    assert.ok(Math.abs(die.widthMm * die.heightMm - p.dies[0].mm2) < 1e-6, id);
    assert.ok(Math.abs(die.widthMm / die.heightMm / tf.aspect - 1) < 1e-6, id);
    assert.deepStrictEqual(design.validate(d), [], id);
    assert.strictEqual(cores(die).length, p.cfg.cores.reduce((s, g) => s + g.count, 0), id);
    p.cfg.cores.forEach((g) => assert.strictEqual(cores(die).filter((b) => b.coreType === g.type).length, g.count, `${id} ${g.type}`));
    const l3 = die.blocks.filter((b) => b.kind === 'l3');
    if (p.cfg.l3MB) { assert.strictEqual(l3.length, 1, id); assert.strictEqual(l3[0].label, `L3 ${p.cfg.l3MB}MB`, id); } else assert.strictEqual(l3.length, 0, id); // Dimensity は cfg に L3 なし(写真の L3 は飾り)
    die.blocks.filter((b) => b.kind !== 'core' && b.kind !== 'l3').forEach((b) => assert.strictEqual(b.decorative, true, `${id} ${b.label}`));
    assert.ok(die.blocks.some((b) => b.kind === 'gpu') && die.blocks.some((b) => b.kind === 'uncore'), id);
    if (id !== 'nv-t239') assert.ok(die.blocks.some((b) => b.kind === 'npu'), id); // T239 に NPU 相当の注記は無い
    assert.strictEqual(die.layout.uncore, false); assert.strictEqual(die.layout.igpu, false);
  });
});

test('MediaTek・T239: 注釈どおりのコアの位置(プライム・中間・小)', () => {
  const px = (id, b) => { const die = mk(id).dies[0]; const t = FP.TILE_FRAMES[FRAME_OF[id]]; const k = (t.box[2] - t.box[0]) / die.widthMm; return { x: b.x * k, y: b.y * k, r: (b.x + b.w) * k, bt: (b.y + b.h) * k }; };
  const T = (id, type) => cores(mk(id).dies[0]).filter((b) => b.coreType === type);
  // 9300: X4 @3.25GHz は中央左(x 445〜620)、X4 @2.85GHz ×3 は左上・右上・右中、A720 @2.0GHz ×4 は上段中央の 4 枠
  const p93 = px('mt-9300', T('mt-9300', 'P')[0]); assert.ok(p93.x > 440 && p93.r < 625 && p93.y > 400);
  assert.strictEqual(T('mt-9300', 'M').filter((b) => px('mt-9300', b).y < 100).length, 2); // 左上・右上
  T('mt-9300', 'E').forEach((b) => { const q = px('mt-9300', b); assert.ok(q.x >= 585 && q.r <= 855 && q.bt <= 365, 'A720'); });
  // 9400: X925 @3.62GHz は右中央(x ≥ 1030)、X4 ×3 は左上・左中・右上(右上は x ≥ 930)、A720 ×4 は中段
  const p94 = px('mt-9400', T('mt-9400', 'P')[0]); assert.ok(p94.x >= 1030 && p94.y > 400 && p94.bt < 660);
  assert.strictEqual(T('mt-9400', 'M').filter((b) => px('mt-9400', b).x < 480).length, 2);
  assert.strictEqual(T('mt-9400', 'M').filter((b) => px('mt-9400', b).x >= 930).length, 1);
  // 9500: C1-Ultra @4.21GHz は右中央(x ≥ 1005)、C1-Premium ×3 は左上・右上・左中、C1-Pro ×4 は中央の 4 枠
  const p95 = px('mt-9500', T('mt-9500', 'P')[0]); assert.ok(p95.x >= 1000 && p95.y > 420);
  assert.strictEqual(T('mt-9500', 'M').filter((b) => px('mt-9500', b).x < 520).length, 2);
  T('mt-9500', 'E').forEach((b) => { const q = px('mt-9500', b); assert.ok(q.x >= 805 && q.r <= 1090, 'C1-Pro'); });
  // 9600 Pro: C2 Ultra ×2(P)は中央の左右(y 420〜640)、C2 Pro @4.35GHz ×3(M)は上段右(y < 165)、C2 Pro @3.1GHz ×3(E)は左上の縦列(x 487〜605)
  const pp = T('mt-9600pro', 'P').map((b) => px('mt-9600pro', b)).sort((a, b) => a.x - b.x);
  assert.ok(pp[0].x < 560 && pp[1].x > 1000 && pp.every((q) => q.y >= 420 && q.bt <= 640));
  T('mt-9600pro', 'M').forEach((b) => assert.ok(px('mt-9600pro', b).bt <= 165 && px('mt-9600pro', b).x >= 805));
  T('mt-9600pro', 'E').forEach((b) => assert.ok(px('mt-9600pro', b).x >= 485 && px('mt-9600pro', b).r <= 607));
  // 9000: X2 は L2 1MiB を含む左の枠、A710 ×3 は右上・右下・左下。A510 ×4 は「Dual A510 Cluster」の 2×2(推定)
  assert.strictEqual(T('mt-9000', 'P').length, 1); assert.strictEqual(T('mt-9000', 'M').length, 3); assert.strictEqual(T('mt-9000', 'E').length, 4);
  assert.ok(px('mt-9000', T('mt-9000', 'P')[0]).r < 595);
  // 9200: X3 は右上(L2 1MiB。x ≥ 1013)、A715 ×3(左下・右下・左上)、A510 ×4(左右のクラスタを 2 コアずつ)
  assert.ok(px('mt-9200', T('mt-9200', 'P')[0]).x >= 1010 && px('mt-9200', T('mt-9200', 'P')[0]).y < 940);
  assert.strictEqual(T('mt-9200', 'E').filter((b) => px('mt-9200', b).x < 745).length, 2);
  // 9000: A710 は右上(y≈1067)・右下(y≈1379)・左下(表記なし。x < 560)、A510 ×4 は x 553〜845・y 1350〜1507 の 2×2
  assert.strictEqual(T('mt-9000', 'M').filter((b) => px('mt-9000', b).x >= 845).length, 2);
  assert.strictEqual(T('mt-9000', 'M').filter((b) => px('mt-9000', b).x < 560 && px('mt-9000', b).y > 1340).length, 1);
  T('mt-9000', 'E').forEach((b) => { const q = px('mt-9000', b); assert.ok(q.x >= 550 && q.r <= 845 && q.y >= 1345 && q.bt <= 1510, 'A510'); });
  assert.strictEqual(T('mt-9000', 'E').filter((b) => px('mt-9000', b).x < 700).length, 2);
  // 9200: A715 は左上(x < 745、y < 1140)・左下(x < 750、y ≥ 1280)・右下(x ≥ 1040、y ≥ 1280)、A510 ×4 は y 1140〜1275 の左右 2 つずつ
  assert.strictEqual(T('mt-9200', 'M').filter((b) => px('mt-9200', b).r < 750 && px('mt-9200', b).bt < 1145).length, 1);
  assert.strictEqual(T('mt-9200', 'M').filter((b) => px('mt-9200', b).r < 750 && px('mt-9200', b).y >= 1275).length, 1);
  assert.strictEqual(T('mt-9200', 'M').filter((b) => px('mt-9200', b).x >= 1040 && px('mt-9200', b).y >= 1275).length, 1);
  T('mt-9200', 'E').forEach((b) => { const q = px('mt-9200', b); assert.ok(q.y >= 1138 && q.bt <= 1277, 'A510'); });
  assert.strictEqual(T('mt-9200', 'E').filter((b) => px('mt-9200', b).x >= 1050).length, 2);
  // 9400: A720 ×4 のうち 4 つ目(注釈なしの推定)は中段の右の枠(x ≥ 905)
  assert.strictEqual(T('mt-9400', 'E').filter((b) => px('mt-9400', b).x >= 905).length, 1);
  // T239: L3 の枠は注釈の範囲(y 292〜605、x 822〜978)の中で、縦は注釈の範囲を超えない
  const t239px = (() => { const die = mk('nv-t239').dies[0]; const b = die.blocks.find((x) => x.kind === 'l3'); const k = 1231 / die.widthMm; return { x: b.x * k, y: b.y * k, r: (b.x + b.w) * k, bt: (b.y + b.h) * k }; })();
  assert.ok(t239px.y >= 291 && t239px.bt <= 606 && t239px.x >= 821 && t239px.r <= 979, 'T239 の L3 は注釈の範囲内');
  // T239: A78C ×8 が左右 4 つずつの縦列(#1〜#4 が左、#5〜#8 が右)で、L3 は中央の列
  const t239 = mk('nv-t239').dies[0]; const cs = cores(t239); const l3 = t239.blocks.find((b) => b.kind === 'l3');
  assert.strictEqual(cs.filter((b) => b.x + b.w <= l3.x + 1e-6).length, 4); assert.strictEqual(cs.filter((b) => b.x >= l3.x + l3.w - 1e-6).length, 4);
});

test('MediaTek・T239: 枠ごとに使えるテンプレート(checkLayout の tpl)。arm-soc だけ、ほかのテンプレートでは使えない', () => {
  const ok = (t, f) => assert.strictEqual(FP.checkLayout({ template: t, frame: f }), null, t + '+' + f);
  const ng = (t, f) => assert.ok(FP.checkLayout({ template: t, frame: f }), t + '+' + f);
  Object.values(FRAME_OF).forEach((f) => {
    assert.deepStrictEqual(FP.TILE_FRAMES[f].tpl, ['arm-soc'], f);
    ok('arm-soc', f); ng('x86-tile', f); ng('x86-mono', f); ng('amd-apu', f); ng('apple-soc', f); ng('amd-chiplet', f);
  });
  // Orin・Thor・Dimensity 8200 の枠は無い(反映していない)
  ['mt-8200', 'orin', 'thor', 'nv-orin', 'nv-thor'].forEach((f) => { assert.ok(!FP.TILE_FRAMES[f], f); ng('arm-soc', f); });
  // design.parse も拒否する(arm-soc の枠を x86-tile・amd-apu にした)
  const a = JSON.parse(JSON.stringify(mk('mt-9400'))); a.dies[0].layout.template = 'x86-tile';
  assert.strictEqual(design.parse(JSON.stringify(a)).ok, false);
  const b = JSON.parse(JSON.stringify(mk('nv-t239'))); b.dies[0].layout.template = 'amd-apu';
  assert.strictEqual(design.parse(JSON.stringify(b)).ok, false);
  const c = JSON.parse(JSON.stringify(mk('mt-9400'))); assert.strictEqual(design.parse(JSON.stringify(c)).ok, true);
  const d2 = JSON.parse(JSON.stringify(mk('nv-t239'))); assert.strictEqual(design.parse(JSON.stringify(d2)).ok, true);
  assert.strictEqual(Object.keys(FP.TILE_FRAMES).filter((k) => /^mt-/.test(k)).length, 6);
});

test('MediaTek・T239: 全枠で、コアが枠一杯でもブロックはダイ内に収まり重ならない', () => {
  Object.values(FRAME_OF).forEach((f) => {
    const tf = FP.TILE_FRAMES[f]; const die = { id: 'd', widthMm: 12, heightMm: 12 / tf.aspect };
    const cs = [{ type: 'P', uarch: 'x', count: tf.big.length }].concat(tf.small.length ? [{ type: 'E', uarch: 'y', count: tf.small.length }] : []);
    const bs = FP.layoutDie(die, cs, 0, { template: 'arm-soc', frame: f, scaleBasis: 'photo' });
    assert.strictEqual(bs.filter((b) => b.kind === 'core').length, tf.big.length + tf.small.length, f);
    bs.forEach((b) => { assert.ok(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= die.widthMm + 1e-9 && b.y + b.h <= die.heightMm + 1e-9 && b.w > 0 && b.h > 0, f + ' ' + b.label); });
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]; const c = bs[j];
      assert.ok(!(a.x < c.x + c.w - 1e-9 && c.x < a.x + a.w - 1e-9 && a.y < c.y + c.h - 1e-9 && c.y < a.y + a.h - 1e-9), f + ': ' + a.label + ' と ' + c.label);
    }
  });
});

test('MediaTek・T239: 編集で枠を超えたら schematic の従来配置に落ちる。Dimensity は L3 を足しても落ちる(枠に L3 が無い)が、T239 は L3 の容量を変えても photo のまま(枠に L3 がある)', () => {
  const ed = (id, type, n) => { const u = design.unlock(mk(id)); const r = design.setCoreCount(u, type, n); assert.ok(r.ok, id); assert.deepStrictEqual(design.validate(r.design), [], `${id} ${type} ${n}`); return r.design.dies[0]; };
  assert.strictEqual(ed('mt-9400', 'E', 2).layout.scaleBasis, 'photo'); // 空き枠
  const over = ed('mt-9400', 'E', 5); assert.strictEqual(over.layout.scaleBasis, 'schematic'); assert.strictEqual(cores(over).length, 9);
  assert.ok(!over.blocks.some((b) => b.decorative), '根拠なしに落ちたら従来の配置(飾りなし)');
  assert.strictEqual(ed('nv-t239', 'P', 8).layout.scaleBasis, 'photo'); assert.strictEqual(ed('nv-t239', 'P', 9).layout.scaleBasis, 'schematic');
  const u = design.unlock(mk('mt-9300')); const r = design.setL3(u, 8); assert.ok(r.ok);
  const die = r.design.dies[0]; assert.strictEqual(die.layout.scaleBasis, 'schematic'); assert.strictEqual(die.blocks.filter((b) => b.kind === 'l3').length, 1);
  assert.deepStrictEqual(design.validate(r.design), []); assert.ok(die.layout.scaleNote.includes('L3'));
  // T239: L3 4 → 8MB は photo のまま、ブロックの位置は同じでラベルだけ更新
  const t0 = mk('nv-t239'); const t1 = design.setL3(design.unlock(t0), 8); assert.ok(t1.ok);
  const d1 = t1.design.dies[0]; assert.strictEqual(d1.layout.scaleBasis, 'photo');
  const l30 = t0.dies[0].blocks.find((b) => b.kind === 'l3'); const l31 = d1.blocks.find((b) => b.kind === 'l3');
  assert.deepStrictEqual([l31.x, l31.y, l31.w, l31.h], [l30.x, l30.y, l30.w, l30.h]); assert.strictEqual(l31.label, 'L3 8MB');
  assert.deepStrictEqual(design.validate(t1.design), []);
  // T239: L3 を 0 にしても photo のまま、L3 のブロックが無くなるだけ(コア・飾りは同じ位置)。Dimensity は L3 0 のまま(0 → 0)なら何も変わらない
  const t2 = design.setL3(design.unlock(t0), 0); assert.ok(t2.ok); const d2 = t2.design.dies[0];
  assert.strictEqual(d2.layout.scaleBasis, 'photo'); assert.strictEqual(d2.blocks.filter((b) => b.kind === 'l3').length, 0); assert.strictEqual(d2.blocks.length, t0.dies[0].blocks.length - 1);
  assert.deepStrictEqual(cores(d2).map((b) => [b.x, b.y]), cores(t0.dies[0]).map((b) => [b.x, b.y])); assert.deepStrictEqual(design.validate(t2.design), []);
  const m0 = design.setL3(design.unlock(mk('mt-9400')), 0); assert.ok(m0.ok); assert.strictEqual(m0.design.dies[0].layout.scaleBasis, 'photo');
});

test('MediaTek・T239: 評価結果は配置に依存しない(ブロックを全部取り除いても同じ)', () => {
  const ctx = E.makeContext();
  Object.keys(FRAME_OF).forEach((id) => {
    const a = mk(id); const b = JSON.parse(JSON.stringify(a)); b.dies.forEach((x) => { x.blocks = []; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(E.evaluate(a, ctx))), JSON.parse(JSON.stringify(E.evaluate(b, ctx))), id);
  });
});
