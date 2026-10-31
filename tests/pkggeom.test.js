'use strict';
// 3D パッケージビューの純ロジック(js/render/pkggeom.js)のテスト。DOM・WebGL なし。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const M = require('../js/render/mat4.js');
const G = require('../js/render/pkggeom.js');

const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);
const FL = G.VERTEX_FLOATS;
const E = 1e-5; // Float32 の丸め
const preset = () => design.fromPreset(D.presets[0], { mode: 'reproduce' });
const die10 = [{ id: 'a', name: 'a', x: 0, y: 0, widthMm: 10, heightMm: 8, blocks: [{ id: 'a1', x: 1, y: 1, w: 3, h: 3, kind: 'core' }] }];
const two = () => [
  { id: 'a', name: 'a', x: 0, y: 0, widthMm: 5, heightMm: 5, blocks: [{ id: 'a1', x: 0, y: 0, w: 2, h: 2, kind: 'core' }] },
  { id: 'b', name: 'b', x: 8, y: 0, widthMm: 5, heightMm: 5, blocks: [] },
];
const inside = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
const vcount = (a) => a.length / FL;

test('頂点の float 数は 13', () => { assert.strictEqual(FL, 13); });

test('substrateSize: 余白は基板種別の既定とダイの 12% の大きいほう。未知の id は有機基板', () => {
  const s = G.substrateSize(die10, 'organic');
  assert.ok(near(s.margin, 4) && near(s.x0, -4) && near(s.x1, 14) && near(s.z0, -4) && near(s.z1, 12) && near(s.thickness, 1.0));
  const big = G.substrateSize([{ id: 'b', x: 0, y: 0, widthMm: 100, heightMm: 100, blocks: [] }], 'organic');
  assert.ok(near(big.margin, 12));
  assert.strictEqual(G.substrateSize(die10, undefined).id, 'organic'); assert.strictEqual(G.substrateSize(die10, 'nonexistent').id, 'organic');
  const si = G.substrateSize(die10, 'si-interposer');
  assert.ok(near(si.margin, 6) && near(si.thickness, 1.2));
  const e = G.substrateSize([], 'organic');
  assert.ok([e.x0, e.x1, e.z0, e.z1, e.w, e.d].every(Number.isFinite));
});

test('ihsRect: 基板より小さく、全ダイを含む', () => {
  [die10, two(), preset().dies].forEach((dies) => {
    const sub = G.substrateSize(dies, 'organic'); const ihs = G.ihsRect(dies, sub); const b = G.diesBounds(dies);
    assert.ok(ihs.x0 > sub.x0 && ihs.z0 > sub.z0 && ihs.x1 < sub.x1 && ihs.z1 < sub.z1);
    assert.ok(ihs.x0 < b.x0 && ihs.z0 < b.z0 && ihs.x1 > b.x1 && ihs.z1 > b.z1);
  });
});

test('capacitorLayout: 固定の規則で決まる個数・基板の内側・蓋の外側・ダイと重ならない。帯が狭ければ空', () => {
  const sub = G.substrateSize(die10, 'organic'); const ihs = G.ihsRect(die10, sub);
  const caps = G.capacitorLayout(sub, ihs);
  assert.ok(caps.length >= 1 && caps.length <= 80);
  assert.deepStrictEqual(G.capacitorLayout(sub, ihs), caps);
  caps.forEach((c) => {
    assert.ok(inside(sub, c.cx, c.cz), '基板の内側');
    assert.ok(!inside(ihs, c.cx, c.cz), '蓋の外側');
    die10.forEach((d) => assert.ok(!(c.cx >= d.x && c.cx <= d.x + d.widthMm && c.cz >= d.y && c.cz <= d.y + d.heightMm)));
  });
  assert.deepStrictEqual(G.capacitorLayout({ x0: 0, z0: 0, x1: 10, z1: 10, margin: 1 }, { x0: 0.8, z0: 0.8, x1: 9.2, z1: 9.2 }), []);
});

function eachTri(arr, fn) {
  for (let i = 0; i + 3 * FL <= arr.length; i += 3 * FL) {
    const p = [0, 1, 2].map((k) => [arr[i + k * FL], arr[i + k * FL + 1], arr[i + k * FL + 2]]);
    const n = [arr[i + 3], arr[i + 4], arr[i + 5]];
    fn(p, n, i);
  }
}

test('buildScene: 頂点数は 3 の倍数・範囲内・三角形の向きが法線と一致', () => {
  const d = preset();
  ['glass', 'solid'].forEach((ihsMode) => {
    const s = G.buildScene(d, { ihsMode });
    [s.opaque, s.shadow, s.glass].forEach((arr) => {
      assert.strictEqual(arr.length % (3 * FL), 0);
      for (let i = 0; i < arr.length; i += FL) {
        assert.ok(arr[i] >= s.sub.x0 - E && arr[i] <= s.sub.x1 + E, `x ${arr[i]}`);
        assert.ok(arr[i + 2] >= s.sub.z0 - E && arr[i + 2] <= s.sub.z1 + E, `z ${arr[i + 2]}`);
        assert.ok(arr[i + 1] >= -s.sub.thickness - E && arr[i + 1] <= s.ihsTop + E, `y ${arr[i + 1]}`);
      }
      eachTri(arr, (p, n) => {
        const c = M.cross(M.sub(p[1], p[0]), M.sub(p[2], p[0]));
        assert.ok(M.dot(c, n) > 0, '三角形の向きが法線と逆');
      });
    });
    assert.strictEqual(s.counts.dies, d.dies.length);
    assert.strictEqual(s.counts.blocks, d.dies.reduce((a, x) => a + x.blocks.length, 0));
    assert.strictEqual(s.counts.caps, s.caps.length);
  });
});

test('buildScene: 蓋の表示モード(非表示 / 不透明 / 半透明)・選択・ヒートマップ・色', () => {
  const d = preset();
  const g = G.buildScene(d, { ihsMode: 'glass' }); const off = G.buildScene(d, { ihsMode: 'off' }); const solid = G.buildScene(d, { ihsMode: 'solid' });
  assert.ok(g.glass.length > 0); assert.strictEqual(off.glass.length, 0); assert.strictEqual(solid.glass.length, 0);
  assert.strictEqual(vcount(off.opaque), vcount(g.opaque)); assert.ok(vcount(solid.opaque) > vcount(g.opaque));
  for (let i = 9; i < g.glass.length; i += FL) assert.ok(g.glass[i] > 0.2 && g.glass[i] < 0.4);
  assert.strictEqual(G.buildScene(d, {}).glass.length, g.glass.length, '既定は半透明');
  const sel = G.buildScene(d, { ihsMode: 'off', selection: [d.dies[0].blocks[0].id] });
  assert.ok(vcount(sel.opaque) > vcount(off.opaque));
  const heat = G.buildScene(d, { ihsMode: 'off', heatDieIds: [d.dies[0].id] });
  assert.strictEqual(heat.heatQuads.length, 1); assert.strictEqual(heat.heatQuads[0].dieId, d.dies[0].id);
  assert.strictEqual(heat.heatQuads[0].verts.length, 6 * FL);
  assert.strictEqual(heat.heatQuads[0].verts[10], G.MAT.HEAT);
  assert.notStrictEqual(vcount(heat.opaque), vcount(off.opaque));
  const red = G.buildScene(d, { ihsMode: 'off', colorOf: () => [1, 0, 0] });
  let found = false;
  for (let i = 0; i < red.opaque.length; i += FL) if (red.opaque[i + 6] === 1 && red.opaque[i + 7] === 0 && red.opaque[i + 8] === 0 && red.opaque[i + 9] === 1) { found = true; break; }
  assert.ok(found, 'colorOf の色がブロックの頂点に使われる');
});

test('buildScene: チップレット(複数ダイ)も同じ基板に並ぶ', () => {
  const s = G.buildScene({ dies: two() }, {});
  assert.strictEqual(s.counts.dies, 2);
  assert.ok(s.ihs.x0 < 0 && s.ihs.x1 > 13 && s.ihs.z0 < 0 && s.ihs.z1 > 5);
  for (let i = 0; i < s.opaque.length; i += FL) assert.ok(s.opaque[i] >= s.sub.x0 - E && s.opaque[i] <= s.sub.x1 + E);
  assert.strictEqual(G.buildScene({ dies: [] }, {}).counts.dies, 0); // ダイ無しでも例外にならない
});

const topDie = [{ id: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 2, y: 2, w: 3, h: 3 }] }];
test('rayBox / pickTop: ブロック・ダイ上面・外れ', () => {
  assert.ok(near(G.rayBox({ o: [0.5, 5, 0.5], d: [0, -1, 0] }, [0, 0, 0], [1, 1, 1]), 4));
  assert.strictEqual(G.rayBox({ o: [2, 5, 0.5], d: [0, -1, 0] }, [0, 0, 0], [1, 1, 1]), null);
  const a = G.pickTop({ o: [3.5, 50, 3.5], d: [0, -1, 0] }, topDie);
  assert.strictEqual(a.type, 'block'); assert.strictEqual(a.blockId, 'b1'); assert.strictEqual(a.dieId, 'd'); assert.ok(near(a.u, 0.35) && near(a.v, 0.35));
  const b = G.pickTop({ o: [8, 50, 8], d: [0, -1, 0] }, topDie);
  assert.strictEqual(b.type, 'die'); assert.ok(near(b.u, 0.8) && near(b.v, 0.8));
  assert.strictEqual(G.pickTop({ o: [20, 50, 20], d: [0, -1, 0] }, topDie), null);
});

const bounds = { cx: 10, cy: 0, cz: 5, radius: 20 };
test('カメラ: プリセット・回転の制限・ズームの制限・パンの向きと制限', () => {
  const top = G.createCamera(bounds, 1.5, 'top'); const side = G.createCamera(bounds, 1.5, 'side'); const ob = G.createCamera(bounds, 1.5);
  assert.strictEqual(top.pitch, G.PITCH_MAX); assert.strictEqual(side.pitch, G.PITCH_MIN);
  assert.ok(near(ob.pitch, 0.62) && near(ob.yaw, 0.6)); assert.deepStrictEqual(ob.target, [10, 0, 5]); assert.ok(ob.dist > ob.radius);
  assert.ok(G.orbit(ob, 1e6, 1e6).pitch <= G.PITCH_MAX); assert.ok(G.orbit(ob, 0, -1e6).pitch >= G.PITCH_MIN);
  assert.ok(near(G.orbit(ob, 100, 0).yaw, ob.yaw - 0.8)); assert.ok(near(ob.yaw, 0.6), '元は変更されない');
  assert.ok(near(G.zoom(ob, 1e-6).dist, ob.radius * 0.2)); assert.ok(near(G.zoom(ob, 1e6).dist, ob.radius * 8));
  assert.ok(near(G.zoom(ob, 0.5).dist, ob.dist * 0.5));
  const p = G.pan(ob, 100, 0, 600);
  const dv = M.sub(p.target, ob.target);
  assert.ok(M.dot(dv, G.cameraAxes(ob).right) < 0, '右へドラッグ → 注視点は左へ');
  const far = G.pan(ob, 1e7, 1e7, 600, bounds);
  assert.ok(far.target.every((v, i) => Math.abs(v - [10, 0, 5][i]) <= 30 + 1e-9));
});

test('カメラ: 画面中心の光線は注視点を通る。投影の確認と背面の点', () => {
  const cam = G.createCamera(bounds, 1.5);
  const r = G.screenRay(cam, 1.5, 0, 0);
  assert.ok(r.o.every((v, i) => near(v, G.eyeOf(cam)[i])) && near(M.length(r.d), 1));
  const t = M.sub(cam.target, r.o); const dist = M.length(M.sub(t, M.scale(r.d, M.dot(t, r.d))));
  assert.ok(dist < 1e-6, `最短距離 ${dist}`);
  const vp = G.cameraMatrices(cam, 1.5).vp;
  const c = G.project(vp, cam.target, 900, 600);
  assert.ok(near(c.x, 450, 1e-4) && near(c.y, 300, 1e-4) && c.visible);
  const eye = G.eyeOf(cam);
  const behind = M.add(eye, M.scale(M.normalize(M.sub(eye, cam.target)), 5));
  assert.strictEqual(G.project(vp, behind, 900, 600).visible, false);
  // 上から見ると 2D と同じ向き(x 右、z 下)
  const topCam = G.createCamera(bounds, 1.5, 'top'); const tv = G.cameraMatrices(topCam, 1.5).vp;
  const o = G.project(tv, [10, 0, 5], 900, 600); const px = G.project(tv, [12, 0, 5], 900, 600); const pz = G.project(tv, [10, 0, 7], 900, 600);
  assert.ok(px.x > o.x && near(px.y, o.y, 0.5)); assert.ok(pz.y > o.y && near(pz.x, o.x, 0.5));
});

test('クリックの光線選択: 画面中心にダイ上面があれば、そのブロックを返す', () => {
  const dies = [{ id: 'd', x: 0, y: 0, widthMm: 10, heightMm: 10, blocks: [{ id: 'b1', x: 3, y: 3, w: 4, h: 4 }] }];
  const s = G.buildScene({ dies }, {});
  const cam = G.createCamera(s.bounds, 1.5, 'top');
  const hit = G.pickTop(G.screenRay(cam, 1.5, 0, 0), dies);
  assert.ok(hit && hit.type === 'block' && hit.blockId === 'b1');
});

test('designBounds は buildScene の bounds と同じで、半径は正', () => {
  const d = preset();
  assert.deepStrictEqual(G.designBounds(d), G.buildScene(d, {}).bounds);
  assert.ok(G.designBounds(d).radius > 0);
});

test('初期カメラは基板〜蓋の外接直方体が画面いっぱい(NDC 0.93 以内)に収まり、球で見積もった距離より近い', () => {
  const { D } = require('./helpers');
  const design = require('../js/model/design.js');
  ['intel-adl-12900k', 'amd-zen5-9950x', 'apple-m1'].forEach((id) => {
    const d = design.fromPreset(D.presets.find((p) => p.id === id));
    const b = G.designBounds(d);
    assert.ok(b.box);
    [['top', 1.6], ['oblique', 1.6], ['oblique', 0.8], ['side', 1.6]].forEach(([pr, asp]) => {
      const cam = G.createCamera(b, asp, pr);
      if (asp > 1 && pr !== 'side') assert.ok(cam.dist < G.fitDistance(b.radius, G.FOV, asp), `${id} ${pr}: 球より近い`); // 横長の画面では従来(球)より近づく
      const m = G.cameraMatrices(cam, asp);
      let worst = 0;
      [b.box.x0, b.box.x1].forEach((x) => [b.box.y0, b.box.y1].forEach((y) => [b.box.z0, b.box.z1].forEach((z) => {
        const p = require('../js/render/mat4.js').transformPoint(m.vp, [x, y, z]); worst = Math.max(worst, Math.abs(p[0]), Math.abs(p[1]));
      })));
      assert.ok(worst <= 0.93 + 1e-6, `${id} ${pr}: ${worst}`);
      if (pr !== 'side') assert.ok(worst > 0.8, `${id} ${pr}: 余白が大きすぎる ${worst}`);
    });
  });
});

test('createCamera: 外接直方体が球の 1.5 倍の距離でも収まらないときは、従来の球の距離に落ちる', () => {
  const b = { cx: 0, cy: 0, cz: 0, radius: 1, box: { x0: -1000, x1: 1000, y0: -1, y1: 1, z0: -1000, z1: 1000 } };
  const cam = G.createCamera(b, 1.5, 'oblique');
  assert.strictEqual(cam.dist, G.fitDistance(1, G.FOV, 1.5));
  const b2 = { cx: 0, cy: 0, cz: 0, radius: 1 }; // box なしも球
  assert.strictEqual(G.createCamera(b2, 1.5, 'top').dist, G.fitDistance(1, G.FOV, 1.5));
});
