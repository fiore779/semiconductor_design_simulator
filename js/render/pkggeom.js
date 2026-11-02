// 3D パッケージビューの純ロジック(設計書 §8.1)。DOM・WebGL に依存しない。
// 座標系: 右手系。x = 右(ダイの x mm)、y = 上(高さ)、z = 手前(ダイの y mm。2D の下方向)。基板の上面が y = 0。
// 上から見る(yaw 0・pitch 最大)と、2D ダイビューと同じ向き(x 右・y 下)になる。
// 注意: 厚み・コンデンサ・蓋・バンプは**模式**であり、実チップの寸法ではない。平面サイズ(mm)とブロック配置だけが設計データに忠実。
(function (root) {
  'use strict';

  const M = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./mat4.js') : root.SDS.render.mat4;

  // ---- 定数(すべて模式)----
  const FOV = 0.61;               // 縦の画角(約 35°)
  const PITCH_MIN = 0.03;         // ほぼ真横
  const PITCH_MAX = Math.PI / 2 - 0.001; // ほぼ真上
  const VERTEX_FLOATS = 13;       // pos3 + normal3 + color4 + material1 + uv2
  // 材質 ID(シェーダと共有)
  const MAT = { GENERIC: 0, SUB_TOP: 1, SUB_SIDE: 2, METAL: 3, SILICON: 4, BLOCK: 5, GOLD: 6, IHS: 7, UNDERFILL: 8, SHADOW: 9, HEAT: 10 };
  const UF_H = 0.10;              // ダイ下のアンダーフィル/バンプ層の高さ(模式)
  const UF_MARGIN = 0.18;         // アンダーフィルのはみ出し
  const CAP_LEN = 1.0; const CAP_WID = 0.5; const CAP_H = 0.45; const CAP_PITCH = 1.6; const CAP_TERM = 0.22;
  const CAP_MAX_PER_SIDE = 20;
  const IHS_PLATE_T = 0.5; const IHS_WALL_T = 0.8; const IHS_TIM_GAP = 0.15;
  const SUBSTRATE_STYLE = {
    organic: { margin: 4, thickness: 1.0 },
    'organic-bridge': { margin: 5, thickness: 1.0 },
    'si-interposer': { margin: 6, thickness: 1.2 },
    glass: { margin: 4, thickness: 1.1 },
    fanout: { margin: 4, thickness: 0.9 },
  };
  const DEFAULT_SUBSTRATE_ID = 'organic';
  const IHS_MODES = ['solid', 'glass', 'off'];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- 寸法の算出 ----
  // 全ダイの外接矩形(mm)。ダイが無いときは 20x20 の仮の矩形。
  function diesBounds(dies) {
    if (!dies || !dies.length) return { x0: 0, z0: 0, x1: 20, z1: 20 };
    let x0 = Infinity; let z0 = Infinity; let x1 = -Infinity; let z1 = -Infinity;
    dies.forEach((d) => {
      x0 = Math.min(x0, d.x); z0 = Math.min(z0, d.y);
      x1 = Math.max(x1, d.x + d.widthMm); z1 = Math.max(z1, d.y + d.heightMm);
    });
    return { x0, z0, x1, z1 };
  }

  // ダイの厚み(模式。見やすさ優先で 0.4〜0.8 mm の範囲に収める)。全ダイ共通。
  function dieThickness(dies) {
    const b = diesBounds(dies);
    return clamp(0.04 * Math.max(b.x1 - b.x0, b.z1 - b.z0), 0.4, 0.8);
  }

  // ブロック板の高さ(ダイ表面からの盛り上がり。模式)
  const blockHeight = (dieT) => 0.12 * dieT;

  // パッケージ基板の矩形。substrateId が無い/未知なら既定(有機基板)。余白は基板種別ごとの既定と、ダイの大きさの 12% の大きいほう。
  function substrateSize(dies, substrateId) {
    const st = SUBSTRATE_STYLE[substrateId] || SUBSTRATE_STYLE[DEFAULT_SUBSTRATE_ID];
    const b = diesBounds(dies);
    const margin = Math.max(st.margin, 0.12 * Math.max(b.x1 - b.x0, b.z1 - b.z0));
    const x0 = b.x0 - margin; const z0 = b.z0 - margin; const x1 = b.x1 + margin; const z1 = b.z1 + margin;
    return { x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, margin, thickness: st.thickness, id: SUBSTRATE_STYLE[substrateId] ? substrateId : DEFAULT_SUBSTRATE_ID };
  }

  // ヒートスプレッダ(蓋)の矩形: 全ダイの外接矩形 + 余白。基板より必ず小さい(基板の縁から 0.55 × 余白 以上内側)。
  function ihsRect(dies, sub) {
    const b = diesBounds(dies);
    const pad = 0.45 * sub.margin;
    return { x0: b.x0 - pad, z0: b.z0 - pad, x1: b.x1 + pad, z1: b.z1 + pad, wall: IHS_WALL_T };
  }

  // チップコンデンサ(SMD)の模式配置: 蓋と基板の縁のあいだの帯に、4 辺それぞれ等間隔で並べる(角は空ける)。
  // 帯の幅が足りない(< 1.4 mm)ときは置かない。戻り値: [{ cx, cz, axis:'x'|'z', len, wid, h }](個数は固定の規則で決まる。実機の配置ではない)
  function capacitorLayout(sub, ihs) {
    const out = [];
    const gx0 = ihs.x0 - sub.x0; const gx1 = sub.x1 - ihs.x1; const gz0 = ihs.z0 - sub.z0; const gz1 = sub.z1 - ihs.z1;
    const g = Math.min(gx0, gx1, gz0, gz1);
    if (!(g >= 1.4)) return out;
    const place = (axis, fixed, a0, a1) => { // 辺に沿って [a0, a1] に等間隔で並べる
      const n = Math.min(CAP_MAX_PER_SIDE, Math.floor((a1 - a0) / CAP_PITCH));
      for (let i = 0; i < n; i++) {
        const t = a0 + ((i + 0.5) / n) * (a1 - a0);
        out.push(axis === 'x' ? { cx: t, cz: fixed, axis, len: CAP_LEN, wid: CAP_WID, h: CAP_H } : { cx: fixed, cz: t, axis, len: CAP_LEN, wid: CAP_WID, h: CAP_H });
      }
    };
    const cornerSkip = g; // 角の分だけ内側から並べる
    place('x', (sub.z0 + ihs.z0) / 2, sub.x0 + cornerSkip, sub.x1 - cornerSkip);
    place('x', (sub.z1 + ihs.z1) / 2, sub.x0 + cornerSkip, sub.x1 - cornerSkip);
    place('z', (sub.x0 + ihs.x0) / 2, sub.z0 + cornerSkip, sub.z1 - cornerSkip);
    place('z', (sub.x1 + ihs.x1) / 2, sub.z0 + cornerSkip, sub.z1 - cornerSkip);
    return out;
  }

  // ---- 頂点の組み立て ----
  function createMesh() {
    const v = [];
    const vert = (p, n, c, mat, u, w) => { v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3], mat, u || 0, w || 0); };
    // 四角形(p0..p3 は法線 n から見て反時計回り)を 2 三角形で追加
    function quad(p0, p1, p2, p3, n, c, mat, uv) {
      const t = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
      vert(p0, n, c, mat, t[0][0], t[0][1]); vert(p1, n, c, mat, t[1][0], t[1][1]); vert(p2, n, c, mat, t[2][0], t[2][1]);
      vert(p0, n, c, mat, t[0][0], t[0][1]); vert(p2, n, c, mat, t[2][0], t[2][1]); vert(p3, n, c, mat, t[3][0], t[3][1]);
    }
    // 直方体。faces: { top, bottom, px, nx, pz, nz }(false で省略。既定は下面以外)。
    // opts: { sideColor, topColor, mat, topMat, sideMat }
    function box(x0, y0, z0, x1, y1, z1, color, mat, faces, opts) {
      const f = Object.assign({ top: true, bottom: false, px: true, nx: true, pz: true, nz: true }, faces || {});
      const o = opts || {};
      const tc = o.topColor || color; const sc = o.sideColor || color;
      const tm = o.topMat === undefined ? mat : o.topMat; const sm = o.sideMat === undefined ? mat : o.sideMat;
      if (f.top) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], tc, tm, [[0, 1], [1, 1], [1, 0], [0, 0]]);
      if (f.bottom) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], sc, sm);
      if (f.pz) quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], sc, sm);
      if (f.nz) quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], sc, sm);
      if (f.px) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], sc, sm);
      if (f.nx) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], sc, sm);
    }
    // 矩形の枠(上面の縁取り)。厚さ t の 4 本の細い直方体。
    function frame(x0, z0, x1, z1, y0, y1, t, color, mat) {
      const tt = Math.min(t, (x1 - x0) / 2, (z1 - z0) / 2);
      if (!(tt > 0)) return;
      box(x0, y0, z0, x1, y1, z0 + tt, color, mat); box(x0, y0, z1 - tt, x1, y1, z1, color, mat);
      box(x0, y0, z0 + tt, x0 + tt, y1, z1 - tt, color, mat); box(x1 - tt, y0, z0 + tt, x1, y1, z1 - tt, color, mat);
    }
    return { quad, box, frame, toFloat32() { return new Float32Array(v); }, get vertexCount() { return v.length / VERTEX_FLOATS; }, _v: v };
  }

  const SUB_COLORS = {
    organic: [0.09, 0.33, 0.20], 'organic-bridge': [0.08, 0.30, 0.22], 'si-interposer': [0.23, 0.26, 0.31], glass: [0.30, 0.42, 0.45], fanout: [0.10, 0.28, 0.24],
  };
  const COL = {
    subSide: [0.55, 0.45, 0.22], metalSide: [0.15, 0.16, 0.19], underfill: [0.38, 0.27, 0.12], capBody: [0.30, 0.20, 0.13], capGold: [0.86, 0.68, 0.22],
    ihs: [0.80, 0.82, 0.85], sel: [0.91, 0.35, 0.05], frameWhite: [1, 1, 1], iod: [0.10, 0.36, 0.42], iodSide: [0.06, 0.20, 0.24],
  };
  const withA = (c, a) => [c[0], c[1], c[2], a === undefined ? 1 : a];

  // 飾りの IO ダイ(design.decorDies。評価に影響しない見た目だけのダイ)。基板サイズ・蓋・ダイの厚み・カメラの外接には含める。選択・光線交差の対象外。
  const decorOf = (design) => (design && Array.isArray(design.decorDies) ? design.decorDies : []);
  const DECOR_H = 0.7; // 飾りダイの高さ(通常のダイの厚みに対する比)

  // 描画対象全体の外接球(カメラの注視点・距離・パンの制限に使う)。頂点は作らない。
  function designBounds(design) {
    const dies = ((design && design.dies) || []).concat(decorOf(design));
    const sub = substrateSize(dies, design && design.package && design.package.substrateId);
    const dieT = dieThickness(dies); const bh = blockHeight(dieT);
    const ihsTop = UF_H + dieT + 2 * bh + IHS_TIM_GAP + IHS_PLATE_T;
    return {
      cx: sub.cx, cy: (ihsTop - sub.thickness) / 2, cz: sub.cz, radius: 0.5 * Math.sqrt(sub.w * sub.w + sub.d * sub.d + (ihsTop + sub.thickness) * (ihsTop + sub.thickness)),
      box: { x0: sub.x0, x1: sub.x1, z0: sub.z0, z1: sub.z1, y0: -sub.thickness, y1: ihsTop }, // 基板〜蓋の外接直方体(初期カメラを画面いっぱいに合わせる用)
    };
  }

  // 設計(dies を持つオブジェクト)から描画用の頂点を作る。
  // opts: {
  //   colorOf(die, block) → [r,g,b]            ブロックの色(種別 / 出所)
  //   dieTopColor(die) → [r,g,b]               ダイ上面(シリコン)の色(面積未取得は別色にできる)
  //   selection: string[]                      選択中のブロック ID
  //   heatDieIds: string[]                     ヒートマップのテクスチャを貼るダイの ID(上面をテクスチャ矩形に置き換え、ブロックは枠だけ)
  //   ihsMode: 'solid' | 'glass' | 'off'       既定 'glass'
  // }
  // 戻り値: { opaque, shadow, glass: Float32Array, heatQuads:[{dieId, verts}], sub, ihs, caps, dieT, blockH, dieTop, bounds:{cx,cy,cz,radius}, counts }
  function buildScene(design, opts) {
    const o = opts || {};
    const dies = (design && design.dies) || [];
    const decor = decorOf(design); const allDies = dies.concat(decor); // 基板・蓋・厚みは飾りのダイも含めて決める
    const sel = new Set(o.selection || []);
    const heatIds = new Set(o.heatDieIds || []);
    const ihsMode = IHS_MODES.indexOf(o.ihsMode) >= 0 ? o.ihsMode : 'glass';
    const substrateId = design && design.package && design.package.substrateId;
    const sub = substrateSize(allDies, substrateId);
    const dieT = dieThickness(allDies); const bh = blockHeight(dieT);
    const dieTop = UF_H + dieT;
    const colorOf = o.colorOf || (() => [0.6, 0.6, 0.6]);
    const dieTopColor = o.dieTopColor || (() => [0.82, 0.83, 0.86]);

    const opaque = createMesh(); const shadow = createMesh(); const glass = createMesh();
    const heatQuads = [];

    // 基板
    const sc = SUB_COLORS[sub.id] || SUB_COLORS.organic;
    opaque.box(sub.x0, -sub.thickness, sub.z0, sub.x1, 0, sub.z1, withA(sc), MAT.SUB_SIDE, { bottom: true }, { topColor: withA(sc), topMat: MAT.SUB_TOP, sideColor: withA(COL.subSide) });

    dies.forEach((die) => {
      const x0 = die.x; const z0 = die.y; const x1 = die.x + die.widthMm; const z1 = die.y + die.heightMm;
      // 接地面の暗いにじみ(3 層)
      [[0.9, 0.16], [0.5, 0.14], [0.2, 0.12]].forEach((s) => {
        const e = s[0] * Math.max(0.4, dieT);
        shadow.quad([x0 - e, 0.004, z1 + e], [x1 + e, 0.004, z1 + e], [x1 + e, 0.004, z0 - e], [x0 - e, 0.004, z0 - e], [0, 1, 0], withA([0, 0, 0], s[1]), MAT.SHADOW);
      });
      // アンダーフィル/バンプ層(側面にバンプの粒を模したパターン)
      opaque.box(x0 - UF_MARGIN, 0, z0 - UF_MARGIN, x1 + UF_MARGIN, UF_H, z1 + UF_MARGIN, withA(COL.underfill), MAT.UNDERFILL, null, { topMat: MAT.GENERIC });
      // ダイ本体(側面は金属光沢の暗色。ヒートマップ時は上面をテクスチャ矩形に置き換える)
      const hasHeat = heatIds.has(die.id);
      opaque.box(x0, UF_H, z0, x1, dieTop, z1, withA(COL.metalSide), MAT.METAL, { top: !hasHeat }, { topColor: withA(dieTopColor(die)), topMat: MAT.SILICON });
      if (hasHeat) {
        const q = createMesh();
        q.quad([x0, dieTop, z1], [x1, dieTop, z1], [x1, dieTop, z0], [x0, dieTop, z0], [0, 1, 0], [1, 1, 1, 1], MAT.HEAT, [[0, 1], [1, 1], [1, 0], [0, 0]]);
        heatQuads.push({ dieId: die.id, verts: q.toFloat32() });
      }
      // ブロック(わずかに盛り上がった板)
      die.blocks.forEach((b) => {
        const bx0 = die.x + b.x; const bz0 = die.y + b.y; const bx1 = bx0 + b.w; const bz1 = bz0 + b.h;
        const selected = sel.has(b.id);
        const lift = selected ? bh : 0;
        if (hasHeat) { // 枠だけ。選択中はオレンジ
          opaque.frame(bx0, bz0, bx1, bz1, dieTop, dieTop + bh * 0.35 + lift * 0.3, Math.max(0.02, Math.min(0.06, 0.15 * Math.min(b.w, b.h))), withA(selected ? COL.sel : COL.frameWhite), MAT.BLOCK);
          return;
        }
        const c = colorOf(die, b);
        const top = withA(c); const side = withA([c[0] * 0.62, c[1] * 0.62, c[2] * 0.62]);
        opaque.box(bx0, dieTop, bz0, bx1, dieTop + bh + lift, bz1, top, MAT.BLOCK, null, { sideColor: side });
        if (selected) opaque.frame(bx0, bz0, bx1, bz1, dieTop + bh + lift, dieTop + bh + lift + bh * 0.4, Math.max(0.025, Math.min(0.07, 0.15 * Math.min(b.w, b.h))), withA(COL.sel), MAT.BLOCK);
      });
    });

    // 飾りの IO ダイ: 通常のダイより少し低い、濃い青緑の直方体(ブロックなし)
    decor.forEach((d) => {
      const x0 = d.x; const z0 = d.y; const x1 = d.x + d.widthMm; const z1 = d.y + d.heightMm; const h = dieT * DECOR_H;
      [[0.9, 0.16], [0.5, 0.14], [0.2, 0.12]].forEach((s) => {
        const e = s[0] * Math.max(0.4, dieT);
        shadow.quad([x0 - e, 0.004, z1 + e], [x1 + e, 0.004, z1 + e], [x1 + e, 0.004, z0 - e], [x0 - e, 0.004, z0 - e], [0, 1, 0], withA([0, 0, 0], s[1]), MAT.SHADOW);
      });
      opaque.box(x0, 0, z0, x1, h, z1, withA(COL.iodSide), MAT.METAL, null, { topColor: withA(COL.iod), topMat: MAT.SILICON });
    });

    // ヒートスプレッダ(蓋)と、その外側のコンデンサ
    const ihs = ihsRect(allDies, sub);
    const caps = capacitorLayout(sub, ihs);
    caps.forEach((c) => {
      const hl = c.axis === 'x' ? c.len / 2 : c.wid / 2; const hw = c.axis === 'x' ? c.wid / 2 : c.len / 2;
      const x0 = c.cx - hl; const x1 = c.cx + hl; const z0 = c.cz - hw; const z1 = c.cz + hw;
      const t = CAP_TERM;
      if (c.axis === 'x') {
        opaque.box(x0 + t, 0, z0, x1 - t, c.h, z1, withA(COL.capBody), MAT.GENERIC);
        opaque.box(x0, 0, z0, x0 + t, c.h, z1, withA(COL.capGold), MAT.GOLD); opaque.box(x1 - t, 0, z0, x1, c.h, z1, withA(COL.capGold), MAT.GOLD);
      } else {
        opaque.box(x0, 0, z0 + t, x1, c.h, z1 - t, withA(COL.capBody), MAT.GENERIC);
        opaque.box(x0, 0, z0, x1, c.h, z0 + t, withA(COL.capGold), MAT.GOLD); opaque.box(x0, 0, z1 - t, x1, c.h, z1, withA(COL.capGold), MAT.GOLD);
      }
    });
    const ihsTop = dieTop + 2 * bh + IHS_TIM_GAP + IHS_PLATE_T; // 選択で持ち上げたブロックの上に収まる高さ
    if (ihsMode !== 'off') {
      const target = ihsMode === 'solid' ? opaque : glass;
      const a = ihsMode === 'solid' ? 1 : 0.28;
      const col = withA(COL.ihs, a);
      const wt = Math.min(ihs.wall, (ihs.x1 - ihs.x0) / 3, (ihs.z1 - ihs.z0) / 3);
      const yp = ihsTop - IHS_PLATE_T;
      const wf = { top: false, bottom: false };
      target.box(ihs.x0, yp, ihs.z0, ihs.x1, ihsTop, ihs.z1, col, MAT.IHS, { bottom: true });
      target.box(ihs.x0, 0, ihs.z0, ihs.x1, yp, ihs.z0 + wt, col, MAT.IHS, wf);
      target.box(ihs.x0, 0, ihs.z1 - wt, ihs.x1, yp, ihs.z1, col, MAT.IHS, wf);
      target.box(ihs.x0, 0, ihs.z0 + wt, ihs.x0 + wt, yp, ihs.z1 - wt, col, MAT.IHS, wf);
      target.box(ihs.x1 - wt, 0, ihs.z0 + wt, ihs.x1, yp, ihs.z1 - wt, col, MAT.IHS, wf);
    }

    return {
      opaque: opaque.toFloat32(), shadow: shadow.toFloat32(), glass: glass.toFloat32(), heatQuads,
      sub, ihs, caps, dieT, blockH: bh, dieTop, ihsTop,
      bounds: designBounds(design),
      counts: { dies: dies.length, decor: decor.length, blocks: dies.reduce((s, d) => s + d.blocks.length, 0), caps: caps.length },
    };
  }

  // ---- 光線との交差 ----
  // 光線 { o:[x,y,z], d:[x,y,z] } と軸平行ボックス。手前の交点までの距離 t(>= 0)か null。
  function rayBox(ray, mn, mx) {
    let t0 = 0; let t1 = Infinity;
    for (let i = 0; i < 3; i++) {
      const d = ray.d[i]; const o = ray.o[i];
      if (Math.abs(d) < 1e-12) { if (o < mn[i] || o > mx[i]) return null; continue; }
      let a = (mn[i] - o) / d; let b = (mx[i] - o) / d;
      if (a > b) { const tmp = a; a = b; b = tmp; }
      if (a > t0) t0 = a; if (b < t1) t1 = b;
      if (t0 > t1) return null;
    }
    return t0;
  }

  // 光線がダイ上面・ブロックのどこに当たるか。戻り値: null | { type:'block', dieId, blockId, t, point, u, v } | { type:'die', dieId, t, point, u, v }
  // u, v: 当たった点の、ダイ内の位置(0〜1。u は左→右、v は上→下)。opts: { selection }(選択中のブロックは高く描かれる)
  function pickTop(ray, dies, opts) {
    const o = opts || {};
    const sel = new Set(o.selection || []);
    const dieT = dieThickness(dies.concat(o.decor || [])); const bh = blockHeight(dieT); const dieTop = UF_H + dieT; // 飾りのダイは選択対象外(厚みの計算にだけ含める)
    let best = null;
    const consider = (t, type, die, blockId) => {
      if (t === null || t === undefined || !(t >= 0)) return;
      if (best && t > best.t) return;
      const point = [ray.o[0] + ray.d[0] * t, ray.o[1] + ray.d[1] * t, ray.o[2] + ray.d[2] * t];
      const u = clamp((point[0] - die.x) / die.widthMm, 0, 1); const v = clamp((point[2] - die.y) / die.heightMm, 0, 1);
      best = type === 'block' ? { type, dieId: die.id, blockId, t, point, u, v } : { type, dieId: die.id, t, point, u, v };
    };
    dies.forEach((die) => {
      // ダイ上面(平面 y = dieTop)
      if (Math.abs(ray.d[1]) > 1e-12) {
        const t = (dieTop - ray.o[1]) / ray.d[1];
        if (t >= 0) {
          const x = ray.o[0] + ray.d[0] * t; const z = ray.o[2] + ray.d[2] * t;
          if (x >= die.x && x <= die.x + die.widthMm && z >= die.y && z <= die.y + die.heightMm) consider(t, 'die', die);
        }
      }
      die.blocks.forEach((b) => {
        const hgt = bh * (sel.has(b.id) ? 2 : 1);
        const t = rayBox(ray, [die.x + b.x, dieTop, die.y + b.y], [die.x + b.x + b.w, dieTop + hgt, die.y + b.y + b.h]);
        consider(t, 'block', die, b.id);
      });
    });
    return best;
  }

  // ---- オービットカメラ ----
  // cam: { yaw, pitch, dist, target:[x,y,z], fov, radius }(radius: 対象の外接球の半径。ズームの上下限に使う)
  const PRESETS = { top: { yaw: 0, pitch: PITCH_MAX }, oblique: { yaw: 0.6, pitch: 0.62 }, side: { yaw: 0, pitch: PITCH_MIN }, bottom: { yaw: 0, pitch: -PITCH_MAX } };

  function fitDistance(radius, fov, aspect) {
    const half = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * Math.max(aspect, 0.05)));
    return 1.05 * radius / Math.sin(half);
  }

  // bounds: { cx, cy, cz, radius }。preset: 'top' | 'oblique'(既定)| 'side'
  // 外接直方体 box の 8 頂点がすべて画面(NDC の ±fill)に収まる最小の距離を二分探索で求める。bounds.box が無ければ球で見積もる(従来の余裕のある距離)。
  function fitBoxDistance(cam, box, aspect, fill) {
    const corners = [];
    [box.x0, box.x1].forEach((x) => [box.y0, box.y1].forEach((y) => [box.z0, box.z1].forEach((z) => corners.push([x, y, z]))));
    const fits = (dist) => {
      const m = cameraMatrices(Object.assign({}, cam, { dist }), aspect);
      return corners.every((c) => { const r = M.transformPoint(m.vp, c); return r[3] > 0 && Math.abs(r[0]) <= fill && Math.abs(r[1]) <= fill; });
    };
    let lo = cam.radius * 0.3; let hi = cam.dist * 1.5;
    if (!fits(hi)) return cam.dist;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    return hi;
  }

  function createCamera(bounds, aspect, preset) {
    const p = PRESETS[preset] || PRESETS.oblique;
    const cam = { yaw: p.yaw, pitch: p.pitch, dist: fitDistance(bounds.radius, FOV, aspect || 1), target: [bounds.cx, bounds.cy, bounds.cz], fov: FOV, radius: bounds.radius };
    if (bounds.box) cam.dist = fitBoxDistance(cam, bounds.box, aspect || 1, 0.93);
    return cam;
  }

  // ドラッグの px から回転(1px = 0.008 rad)。右へドラッグ → 物体が右へ回る(カメラは左へ)。pitch は真下〜真上(±90°)まで動かせる(基板の下面も見える)。yaw は無制限(360°)。
  function orbit(cam, dxPx, dyPx) {
    return Object.assign({}, cam, { yaw: cam.yaw - dxPx * 0.008, pitch: clamp(cam.pitch + dyPx * 0.008, -PITCH_MAX, PITCH_MAX) });
  }

  // 距離を factor 倍(< 1 で近づく)。対象の外接球の半径の 0.2 倍〜8 倍に制限。
  function zoom(cam, factor) {
    return Object.assign({}, cam, { dist: clamp(cam.dist * factor, cam.radius * 0.2, cam.radius * 8) });
  }

  function eyeOf(cam) {
    const cp = Math.cos(cam.pitch);
    return [cam.target[0] + cam.dist * cp * Math.sin(cam.yaw), cam.target[1] + cam.dist * Math.sin(cam.pitch), cam.target[2] + cam.dist * cp * Math.cos(cam.yaw)];
  }

  // 画面の右・上の単位ベクトル(ワールド座標)
  function cameraAxes(cam) {
    const f = M.normalize(M.sub(cam.target, eyeOf(cam)));
    let right = M.normalize(M.cross(f, [0, 1, 0]));
    if (right[0] === 0 && right[1] === 0 && right[2] === 0) right = [1, 0, 0];
    return { forward: f, right, up: M.cross(right, f) };
  }

  // パン(右ドラッグ等)。画面上で dx,dy px 動かしたぶん、物体がついてくるように対象点を動かす。対象点は外接球の中心から ±1.5 半径に制限しない(呼び出し側が bounds で制限)。
  function pan(cam, dxPx, dyPx, viewportH, bounds) {
    const s = 2 * cam.dist * Math.tan(cam.fov / 2) / Math.max(1, viewportH);
    const ax = cameraAxes(cam);
    let t = [cam.target[0] - ax.right[0] * dxPx * s + ax.up[0] * dyPx * s, cam.target[1] - ax.right[1] * dxPx * s + ax.up[1] * dyPx * s, cam.target[2] - ax.right[2] * dxPx * s + ax.up[2] * dyPx * s];
    if (bounds) {
      const lim = bounds.radius * 1.5;
      t = [clamp(t[0], bounds.cx - lim, bounds.cx + lim), clamp(t[1], bounds.cy - lim, bounds.cy + lim), clamp(t[2], bounds.cz - lim, bounds.cz + lim)];
    }
    return Object.assign({}, cam, { target: t });
  }

  function cameraMatrices(cam, aspect) {
    const eye = eyeOf(cam);
    const near = Math.max(0.01, cam.dist * 0.02); const far = cam.dist + cam.radius * 4;
    const view = M.lookAt(eye, cam.target, [0, 1, 0]);
    const proj = M.perspective(cam.fov, aspect, near, far);
    const vp = M.multiply(proj, view);
    return { eye, view, proj, vp, invVp: M.invert(vp) };
  }

  // 画面上の点(ndcX, ndcY: -1〜1、上が +1)を通る光線
  function screenRay(cam, aspect, ndcX, ndcY) {
    const m = cameraMatrices(cam, aspect);
    if (!m.invVp) return null;
    const a = M.transformPoint(m.invVp, [ndcX, ndcY, -1]); const b = M.transformPoint(m.invVp, [ndcX, ndcY, 1]);
    const d = M.normalize(M.sub(b, a));
    return { o: m.eye, d };
  }

  // ワールド点 → 画面 px({x, y, visible}。y は下向き)
  function project(vp, p, w, h) {
    const r = M.transformPoint(vp, p);
    return { x: (r[0] * 0.5 + 0.5) * w, y: (1 - (r[1] * 0.5 + 0.5)) * h, visible: r[3] > 0 && r[2] >= -1 && r[2] <= 1 };
  }

  const api = {
    FOV, PITCH_MIN, PITCH_MAX, VERTEX_FLOATS, MAT, UF_H, IHS_MODES, SUBSTRATE_STYLE, PRESETS, COL,
    decorOf, DECOR_H, diesBounds, designBounds, dieThickness, blockHeight, substrateSize, ihsRect, capacitorLayout, createMesh, buildScene,
    rayBox, pickTop, fitDistance, createCamera, orbit, zoom, pan, eyeOf, cameraAxes, cameraMatrices, screenRay, project,
  };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.pkggeom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
