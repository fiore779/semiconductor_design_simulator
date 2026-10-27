// ダイビューの幾何計算(設計書 §8.1)。DOM・WebGL に依存しない純関数。
// ビュー: view = { x, y, zoom }。screen = world * zoom + (x, y)(単位: ワールド mm → 画面 px)。
(function (root) {
  'use strict';

  const MIN_SIZE_MM = 0.2;
  const DEFAULT_GRID_MM = 0.1;
  const HANDLE_PX = 8;
  const MIN_ZOOM = 0.5;   // px/mm
  const MAX_ZOOM = 2000;
  // ハンドル名: 8 個(西=左, 東=右, 北=上, 南=下)
  const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function worldToScreen(view, wx, wy) { return { x: wx * view.zoom + view.x, y: wy * view.zoom + view.y }; }
  function screenToWorld(view, sx, sy) { return { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom }; }

  // カーソル位置(sx, sy)のワールド点を保ったまま倍率を factor 倍する。新しい view を返す。
  function zoomAt(view, sx, sy, factor, minZoom, maxZoom) {
    const z = clamp(view.zoom * factor, minZoom || MIN_ZOOM, maxZoom || MAX_ZOOM);
    const w = screenToWorld(view, sx, sy);
    return { x: sx - w.x * z, y: sy - w.y * z, zoom: z };
  }

  function panBy(view, dxPx, dyPx) { return { x: view.x + dxPx, y: view.y + dyPx, zoom: view.zoom }; }

  // ブロック(ダイ相対)→ ワールド矩形
  function blockWorldRect(die, b) { return { x: die.x + b.x, y: die.y + b.y, w: b.w, h: b.h }; }
  function dieWorldRect(die) { return { x: die.x, y: die.y, w: die.widthMm, h: die.heightMm }; }

  // 矩形(画面 px)上の 8 ハンドル中心
  function handlePoints(r) {
    const cx = r.x + r.w / 2; const cy = r.y + r.h / 2; const x2 = r.x + r.w; const y2 = r.y + r.h;
    return {
      nw: { x: r.x, y: r.y }, n: { x: cx, y: r.y }, ne: { x: x2, y: r.y }, e: { x: x2, y: cy },
      se: { x: x2, y: y2 }, s: { x: cx, y: y2 }, sw: { x: r.x, y: y2 }, w: { x: r.x, y: cy },
    };
  }

  function screenRect(view, wr) {
    const p = worldToScreen(view, wr.x, wr.y);
    return { x: p.x, y: p.y, w: wr.w * view.zoom, h: wr.h * view.zoom };
  }

  const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // ヒットテスト(画面 px の座標)。優先順: 選択中ブロックのハンドル > 最前面のブロック > 最前面のダイ。
  // 後ろの要素ほど前面(描画順)。戻り値: {type:'handle',dieId,blockId,handle} | {type:'block',dieId,blockId} | {type:'die',dieId} | null
  // opts: { selectedIds:[], handlePx }
  function hitTest(design, view, sx, sy, opts) {
    const o = opts || {};
    const sel = o.selectedIds || [];
    const hs = (o.handlePx || HANDLE_PX) / 2 + 1; // ハンドルは画面 px で一定サイズ(少し余裕)
    const dies = design.dies;
    // 1) ハンドル(選択中ブロックのみ。前面側から)
    for (let i = dies.length - 1; i >= 0; i--) {
      const die = dies[i];
      for (let j = die.blocks.length - 1; j >= 0; j--) {
        const b = die.blocks[j];
        if (sel.indexOf(b.id) < 0) continue;
        const pts = handlePoints(screenRect(view, blockWorldRect(die, b)));
        for (let k = 0; k < HANDLES.length; k++) {
          const p = pts[HANDLES[k]];
          if (Math.abs(sx - p.x) <= hs && Math.abs(sy - p.y) <= hs) return { type: 'handle', dieId: die.id, blockId: b.id, handle: HANDLES[k] };
        }
      }
    }
    // 2) ブロック
    for (let i = dies.length - 1; i >= 0; i--) {
      const die = dies[i];
      for (let j = die.blocks.length - 1; j >= 0; j--) {
        const b = die.blocks[j];
        if (inRect(screenRect(view, blockWorldRect(die, b)), sx, sy)) return { type: 'block', dieId: die.id, blockId: b.id };
      }
    }
    // 3) ダイ
    for (let i = dies.length - 1; i >= 0; i--) {
      if (inRect(screenRect(view, dieWorldRect(dies[i])), sx, sy)) return { type: 'die', dieId: dies[i].id };
    }
    return null;
  }

  // グリッドスナップ。disable(Shift 押下時 true)なら素通し。
  function snap(v, grid, disable) {
    const g = grid === undefined ? DEFAULT_GRID_MM : grid;
    if (disable || !g) return v;
    return Math.round(v / g) * g;
  }

  // 浮動小数の誤差を丸める(0.1 刻みの表示ずれ防止)
  const tidy = (v) => Math.round(v * 1e9) / 1e9;

  // 移動: 元ブロック b(ダイ相対 mm)を (dx, dy) mm 動かす。スナップ後、ダイ内にクランプ。戻り値 {x,y,w,h}
  // opts: { grid, noSnap }
  function moveBlock(die, b, dx, dy, opts) {
    const o = opts || {};
    const nx = snap(b.x + dx, o.grid, o.noSnap);
    const ny = snap(b.y + dy, o.grid, o.noSnap);
    return {
      x: tidy(clamp(nx, 0, Math.max(0, die.widthMm - b.w))),
      y: tidy(clamp(ny, 0, Math.max(0, die.heightMm - b.h))),
      w: b.w, h: b.h,
    };
  }

  // リサイズ: handle の辺だけ (dx, dy) mm 動かす。最小サイズ・ダイ内にクランプ。戻り値 {x,y,w,h}
  function resizeBlock(die, b, handle, dx, dy, opts) {
    const o = opts || {};
    const min = o.minSize || MIN_SIZE_MM;
    let l = b.x; let t = b.y; let r = b.x + b.w; let bt = b.y + b.h;
    if (handle.indexOf('w') >= 0) l = snap(l + dx, o.grid, o.noSnap);
    if (handle.indexOf('e') >= 0) r = snap(r + dx, o.grid, o.noSnap);
    if (handle.indexOf('n') >= 0) t = snap(t + dy, o.grid, o.noSnap);
    if (handle.indexOf('s') >= 0) bt = snap(bt + dy, o.grid, o.noSnap);
    // 動かす辺だけ、ダイ内かつ最小サイズを守る
    if (handle.indexOf('w') >= 0) l = clamp(l, 0, r - min);
    if (handle.indexOf('e') >= 0) r = clamp(r, l + min, die.widthMm);
    if (handle.indexOf('n') >= 0) t = clamp(t, 0, bt - min);
    if (handle.indexOf('s') >= 0) bt = clamp(bt, t + min, die.heightMm);
    return { x: tidy(l), y: tidy(t), w: tidy(r - l), h: tidy(bt - t) };
  }

  // 全ダイが収まる view。width/height は画面 px、margin は px。ダイ無しなら既定。
  function fit(dies, width, height, margin) {
    const m = margin === undefined ? 40 : margin;
    if (!dies || !dies.length || width <= 0 || height <= 0) return { x: 0, y: 0, zoom: 10 };
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    dies.forEach((d) => {
      x0 = Math.min(x0, d.x); y0 = Math.min(y0, d.y);
      x1 = Math.max(x1, d.x + d.widthMm); y1 = Math.max(y1, d.y + d.heightMm);
    });
    const ww = Math.max(x1 - x0, 1e-6); const wh = Math.max(y1 - y0, 1e-6);
    const aw = Math.max(width - m * 2, 1); const ah = Math.max(height - m * 2, 1);
    const zoom = clamp(Math.min(aw / ww, ah / wh), MIN_ZOOM / 10, MAX_ZOOM);
    return { zoom, x: (width - ww * zoom) / 2 - x0 * zoom, y: (height - wh * zoom) / 2 - y0 * zoom };
  }

  // 縮尺バー用: 目標 px 幅に近い「きりの良い」mm 長さ(1,2,5 ×10^n)
  function niceLength(zoom, targetPx) {
    const raw = targetPx / zoom;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    const n = f >= 5 ? 5 : f >= 2 ? 2 : 1;
    return n * p;
  }

  const api = {
    MIN_SIZE_MM, DEFAULT_GRID_MM, HANDLE_PX, MIN_ZOOM, MAX_ZOOM, HANDLES,
    worldToScreen, screenToWorld, zoomAt, panBy, blockWorldRect, dieWorldRect, handlePoints, screenRect,
    hitTest, snap, moveBlock, resizeBlock, fit, niceLength,
  };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.geom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
