// WebGL ダイビュー(設計書 §8.1)。ダイ・ブロックを上から見たフロアプランとして描き、移動・リサイズ・ズーム・パンを扱う。
// 構成: WebGL canvas(矩形・ストライプ)+ その上に重ねる 2D canvas(ラベル・縮尺・注記、pointer-events:none)。
// 色は CSS 変数に依存せず、JS 側の light/dark パレットを使う。描画は変更時のみ(requestAnimationFrame + dirty フラグ)。
// 幾何計算は geom.js(純関数)。
(function (root) {
  'use strict';

  const geom = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./geom.js') : root.SDS.render.geom;

  // ---- パレット(#rrggbb)----
  const PALETTES = {
    light: {
      bg: '#eef0f3', dieFill: '#fbfbf8', dieEdge: '#3b4250',
      unknownA: '#fff1d6', unknownB: '#e8c27a',
      coreP: '#2f5fb3', coreE: '#8fb6ea', coreLP: '#bcd5f3', l3: '#d9962b', gpu: '#3a9a6a', uncore: '#8a7bb8', other: '#9aa0a6',
      blockEdge: '#1c2430', sel: '#e8590c', handleFill: '#ffffff',
      text: '#1c2430', textOnDark: '#ffffff', note: '#4a5260', overlay: '#eef0f3', pill: '#ffffff',
    },
    dark: {
      bg: '#14171c', dieFill: '#222831', dieEdge: '#aab2c0',
      unknownA: '#3a3220', unknownB: '#7a6030',
      coreP: '#4c7fd6', coreE: '#7da2d8', coreLP: '#a3bde2', l3: '#c98a2e', gpu: '#3fae7a', uncore: '#9a8bc8', other: '#7a8088',
      blockEdge: '#0b0d10', sel: '#ff8a3d', handleFill: '#14171c',
      text: '#e6e9ee', textOnDark: '#ffffff', note: '#aab2c0', overlay: '#14171c', pill: '#2a303a',
    },
  };
  // ラベルを載せる色が明るい系のとき文字を暗くするためのキー
  const LIGHT_BLOCKS = { coreE: 1, coreLP: 1 };

  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const rgba = (h, a) => { const c = hexToRgb(h); return [c[0], c[1], c[2], a === undefined ? 1 : a]; };

  function blockColorKey(b) {
    if (b.kind === 'l3') return 'l3';
    if (b.kind === 'gpu') return 'gpu';
    if (b.kind === 'uncore') return 'uncore';
    if (b.kind === 'core') {
      const t = String(b.coreType || '');
      if (/^LP/i.test(t)) return 'coreLP';
      if (/^E/i.test(t)) return 'coreE';
      return 'coreP'; // P / super / C / performance など
    }
    return 'other';
  }

  const VS = 'attribute vec2 a_pos;attribute vec4 a_col;attribute vec4 a_col2;attribute float a_str;uniform vec2 u_res;' +
    'varying vec4 v_col;varying vec4 v_col2;varying float v_str;' +
    'void main(){v_col=a_col;v_col2=a_col2;v_str=a_str;gl_Position=vec4(a_pos.x/u_res.x*2.0-1.0,1.0-a_pos.y/u_res.y*2.0,0.0,1.0);}';
  const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'uniform float u_period;varying vec4 v_col;varying vec4 v_col2;varying float v_str;' +
    'void main(){vec4 c=v_col;if(v_str>0.5){float t=mod(gl_FragCoord.x+gl_FragCoord.y,u_period);if(t>=u_period*0.5)c=v_col2;}gl_FragColor=c;}';

  const NOTE_TEXT = '模式図(コア別面積は未取得のため等分)';
  const HEAT_TEXT = '電力密度/温度のヒートマップは M4 で対応します';
  const GL_ERROR_TEXT = 'WebGL が使えません。ブラウザの設定(ハードウェアアクセラレーション)を確認するか、別のブラウザでお試しください。ダイビューは表示できません。';

  function emptyApi() {
    return { available: false, setDesign() {}, setSelection() {}, setViewMode() {}, fit() {}, destroy() {} };
  }

  function createDieView(container, handlers) {
    const H = handlers || {};
    const doc = container.ownerDocument || document;
    const win = doc.defaultView || window;

    // ---- canvas と GL コンテキスト ----
    const glCanvas = doc.createElement('canvas');
    let gl = null;
    try {
      const opt = { alpha: false, antialias: false, preserveDrawingBuffer: true }; // preserve: PNG 書き出し用
      gl = glCanvas.getContext('webgl2', opt) || glCanvas.getContext('webgl', opt) || glCanvas.getContext('experimental-webgl', opt);
    } catch (e) { gl = null; }
    if (!gl) {
      container.textContent = '';
      const p = doc.createElement('p');
      p.className = 'dieview-error';
      p.setAttribute('role', 'alert');
      p.textContent = GL_ERROR_TEXT;
      container.appendChild(p);
      return emptyApi();
    }

    const labelCanvas = doc.createElement('canvas');
    const ctx2d = labelCanvas.getContext('2d');
    if (win.getComputedStyle(container).position === 'static') container.style.position = 'relative';
    [glCanvas, labelCanvas].forEach((c) => { c.style.position = 'absolute'; c.style.left = '0'; c.style.top = '0'; c.style.width = '100%'; c.style.height = '100%'; c.style.display = 'block'; });
    labelCanvas.style.pointerEvents = 'none';
    glCanvas.tabIndex = 0;
    glCanvas.setAttribute('role', 'img');
    glCanvas.style.touchAction = 'none';
    container.appendChild(glCanvas);
    container.appendChild(labelCanvas);

    // ---- 状態 ----
    let design = { dies: [] };
    let selection = [];
    let viewMode = 'place';
    let view = { x: 0, y: 0, zoom: 10 };
    let cssW = 0; let cssH = 0; let dpr = 1;
    let fitSig = null;
    let dirty = true; let rafId = 0; let destroyed = false;
    let drag = null; let spaceDown = false; let hoverCursor = '';
    let palName = 'light';
    let glLost = false;
    let prog = null; let buf = null; let loc = null;

    // ---- GL 初期化 ----
    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); }
      return s;
    }
    function initGL() {
      const vs = compile(gl.VERTEX_SHADER, VS); const fs = compile(gl.FRAGMENT_SHADER, FS);
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      loc = {
        pos: gl.getAttribLocation(prog, 'a_pos'), col: gl.getAttribLocation(prog, 'a_col'),
        col2: gl.getAttribLocation(prog, 'a_col2'), str: gl.getAttribLocation(prog, 'a_str'),
        res: gl.getUniformLocation(prog, 'u_res'), period: gl.getUniformLocation(prog, 'u_period'),
      };
      buf = gl.createBuffer();
    }
    try { initGL(); } catch (e) {
      container.removeChild(glCanvas); container.removeChild(labelCanvas);
      container.textContent = '';
      const p = doc.createElement('p');
      p.className = 'dieview-error'; p.setAttribute('role', 'alert'); p.textContent = GL_ERROR_TEXT;
      container.appendChild(p);
      return emptyApi();
    }

    // ---- 描画要求 ----
    function invalidate() {
      dirty = true;
      if (!rafId && !destroyed) rafId = win.requestAnimationFrame(frame);
    }
    function frame() {
      rafId = 0;
      if (destroyed || !dirty) return;
      dirty = false;
      draw();
    }

    // ---- サイズ ----
    function resize() {
      const r = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)); const h = Math.max(1, Math.round(r.height));
      const d = win.devicePixelRatio || 1;
      if (w === cssW && h === cssH && d === dpr) return;
      const first = cssW === 0;
      cssW = w; cssH = h; dpr = d;
      glCanvas.width = Math.round(w * d); glCanvas.height = Math.round(h * d);
      labelCanvas.width = glCanvas.width; labelCanvas.height = glCanvas.height;
      if (first || fitSig === 'pending') { fitSig = null; maybeAutoFit(); }
      invalidate();
    }
    let ro = null; let onWinResize = null;
    if (typeof win.ResizeObserver === 'function') { ro = new win.ResizeObserver(resize); ro.observe(container); }
    else { onWinResize = resize; win.addEventListener('resize', onWinResize); }

    // ---- パレット(prefers-color-scheme)----
    let mql = null; let onScheme = null;
    function readScheme() { return (mql && mql.matches) ? 'dark' : 'light'; }
    if (typeof win.matchMedia === 'function') {
      mql = win.matchMedia('(prefers-color-scheme: dark)');
      palName = readScheme();
      onScheme = () => { palName = readScheme(); invalidate(); };
      if (mql.addEventListener) mql.addEventListener('change', onScheme); else if (mql.addListener) mql.addListener(onScheme);
    }
    const pal = () => PALETTES[palName];

    // ---- fit ----
    function designSig(d) { return d.dies.map((x) => `${x.id}:${x.x},${x.y},${x.widthMm},${x.heightMm}`).join('|'); }
    function doFit() { view = geom.fit(design.dies, cssW, cssH, 48); invalidate(); }
    function maybeAutoFit() {
      if (cssW === 0 || !design.dies.length) { if (design.dies.length) fitSig = 'pending'; return; }
      const sig = designSig(design);
      if (sig !== fitSig) { fitSig = sig; doFit(); }
    }

    // ---- aria ----
    function updateAria() {
      const nBlocks = design.dies.reduce((s, d) => s + d.blocks.length, 0);
      const names = [];
      design.dies.forEach((d) => d.blocks.forEach((b) => { if (selection.indexOf(b.id) >= 0) names.push(b.label || b.id); }));
      const selText = names.length === 0 ? '選択中のブロックはありません' : names.length <= 3 ? `選択中: ${names.join('、')}` : `選択中: ${names.length} 個のブロック`;
      glCanvas.setAttribute('aria-label', `ダイビュー(配置図): ダイ ${design.dies.length} 個、ブロック ${nBlocks} 個。${selText}。矢印キーで選択ブロックを移動、Esc で選択解除。`);
    }

    // ---- 描画 ----
    function draw() {
      if (glLost || !cssW) return;
      const P = pal();
      const verts = [];
      const rect = (x, y, w, h, col, stripe, col2) => {
        const c2 = col2 || col; const s = stripe ? 1 : 0;
        const x1 = (x + w) * dpr; const y1 = (y + h) * dpr; const x0 = x * dpr; const y0 = y * dpr;
        const pts = [x0, y0, x1, y0, x0, y1, x1, y0, x1, y1, x0, y1];
        for (let i = 0; i < 12; i += 2) verts.push(pts[i], pts[i + 1], col[0], col[1], col[2], col[3], c2[0], c2[1], c2[2], c2[3], s);
      };
      const outline = (r, t, col) => {
        rect(r.x - t / 2, r.y - t / 2, r.w + t, t, col); rect(r.x - t / 2, r.y + r.h - t / 2, r.w + t, t, col);
        rect(r.x - t / 2, r.y + t / 2, t, r.h - t, col); rect(r.x + r.w - t / 2, r.y + t / 2, t, r.h - t, col);
      };
      const edge = rgba(P.blockEdge, 0.9); const dieEdge = rgba(P.dieEdge, 1); const selCol = rgba(P.sel, 1);

      design.dies.forEach((die) => {
        const r = geom.screenRect(view, geom.dieWorldRect(die));
        if (die.areaKnown === false) rect(r.x, r.y, r.w, r.h, rgba(P.unknownA), true, rgba(P.unknownB));
        else rect(r.x, r.y, r.w, r.h, rgba(P.dieFill));
        outline(r, 2, dieEdge);
      });
      const selRects = [];
      design.dies.forEach((die) => die.blocks.forEach((b) => {
        const r = geom.screenRect(view, geom.blockWorldRect(die, b));
        rect(r.x, r.y, r.w, r.h, rgba(P[blockColorKey(b)]));
        if (selection.indexOf(b.id) >= 0) selRects.push(r); else outline(r, 1, edge);
      }));
      selRects.forEach((r) => {
        outline(r, 3, selCol);
        const pts = geom.handlePoints(r); const hs = geom.HANDLE_PX;
        geom.HANDLES.forEach((k) => {
          const p = pts[k];
          rect(p.x - hs / 2 - 1, p.y - hs / 2 - 1, hs + 2, hs + 2, selCol);
          rect(p.x - hs / 2 + 1, p.y - hs / 2 + 1, hs - 2, hs - 2, rgba(P.handleFill));
        });
      });
      if (viewMode !== 'place') rect(0, 0, cssW, cssH, rgba(P.overlay, 0.72)); // グレーアウト

      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      const bg = hexToRgb(P.bg);
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniform2f(loc.res, glCanvas.width, glCanvas.height);
      gl.uniform1f(loc.period, 10 * dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
      const stride = 11 * 4;
      gl.enableVertexAttribArray(loc.pos); gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(loc.col); gl.vertexAttribPointer(loc.col, 4, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(loc.col2); gl.vertexAttribPointer(loc.col2, 4, gl.FLOAT, false, stride, 24);
      gl.enableVertexAttribArray(loc.str); gl.vertexAttribPointer(loc.str, 1, gl.FLOAT, false, stride, 40);
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 11);

      drawLabels(P);
    }

    function drawLabels(P) {
      const c = ctx2d;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const FONT = '12px sans-serif';
      c.font = FONT; c.textBaseline = 'middle';
      let anySchematic = false;

      design.dies.forEach((die) => {
        const r = geom.screenRect(view, geom.dieWorldRect(die));
        c.textAlign = 'left'; c.fillStyle = P.text; c.font = 'bold 13px sans-serif';
        let name = die.name || die.id;
        c.fillText(name, r.x, r.y - 10);
        if (die.areaKnown === false) {
          const wName = c.measureText(name).width;
          c.font = FONT; c.fillStyle = P.sel;
          c.fillText('面積未取得(仮寸法)', r.x + wName + 10, r.y - 10);
        }
        c.font = FONT;
        die.blocks.forEach((b) => {
          if (b.schematic) anySchematic = true;
          const br = geom.screenRect(view, geom.blockWorldRect(die, b));
          const text = b.label || '';
          if (!text) return;
          if (br.h < 14 || c.measureText(text).width > br.w - 4) return; // 入らなければ省略
          c.textAlign = 'center';
          c.fillStyle = LIGHT_BLOCKS[blockColorKey(b)] && palName === 'light' ? P.text : (LIGHT_BLOCKS[blockColorKey(b)] ? '#101418' : P.textOnDark);
          c.fillText(text, br.x + br.w / 2, br.y + br.h / 2);
        });
      });

      // 縮尺バー(左下)と注記
      if (design.dies.length) {
        const mm = geom.niceLength(view.zoom, 100); const px = mm * view.zoom;
        const x = 16; const y = cssH - 16;
        c.strokeStyle = P.text; c.lineWidth = 2; c.beginPath();
        c.moveTo(x, y - 4); c.lineTo(x, y); c.lineTo(x + px, y); c.lineTo(x + px, y - 4); c.stroke();
        c.textAlign = 'left'; c.fillStyle = P.text; c.font = FONT;
        c.fillText(`${mm >= 1 ? mm : mm.toFixed(Math.max(0, -Math.floor(Math.log10(mm))))} mm`, x + px + 8, y - 4);
        if (anySchematic) { c.fillStyle = P.note; c.fillText(NOTE_TEXT, x, y - 22); }
      }

      if (viewMode !== 'place') {
        c.font = 'bold 15px sans-serif'; c.textAlign = 'center';
        const w = c.measureText(HEAT_TEXT).width + 32;
        c.fillStyle = P.pill; c.fillRect(cssW / 2 - w / 2, cssH / 2 - 20, w, 40);
        c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(cssW / 2 - w / 2 + 0.5, cssH / 2 - 19.5, w - 1, 39);
        c.fillStyle = P.text; c.fillText(HEAT_TEXT, cssW / 2, cssH / 2);
      }
    }

    // ---- 設計の更新(新しいオブジェクトを返す。元は壊さない)----
    function withBlocks(d, rects) {
      return Object.assign({}, d, {
        dies: d.dies.map((die) => {
          if (!die.blocks.some((b) => rects[b.id])) return die;
          return Object.assign({}, die, { blocks: die.blocks.map((b) => (rects[b.id] ? Object.assign({}, b, rects[b.id]) : b)) });
        }),
      });
    }
    const findDie = (d, id) => d.dies.find((x) => x.id === id);
    const findBlock = (die, id) => die.blocks.find((b) => b.id === id);
    function emitChange(d, coalesce) {
      design = d; invalidate();
      if (H.onChange) H.onChange(d, { coalesce: !!coalesce });
    }
    function setSel(ids) {
      selection = ids.slice(); updateAria(); invalidate();
      if (H.onSelect) H.onSelect(selection.slice());
    }

    // ---- 入力 ----
    function pos(e) { const r = glCanvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    const hitOpts = () => ({ selectedIds: selection, handlePx: geom.HANDLE_PX });
    const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    function setCursor(c) { if (c !== hoverCursor) { hoverCursor = c; glCanvas.style.cursor = c; } }

    function onPointerDown(e) {
      if (drag) return;
      const p = pos(e);
      glCanvas.focus({ preventScroll: true });
      const wantPan = e.button === 1 || (e.button === 0 && spaceDown);
      if (e.button !== 0 && e.button !== 1) return;
      let hit = null;
      if (!wantPan && viewMode === 'place') hit = geom.hitTest(design, view, p.x, p.y, hitOpts());
      try { glCanvas.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      e.preventDefault();
      if (hit && hit.type === 'handle') {
        drag = { type: 'resize', id: e.pointerId, sx: p.x, sy: p.y, design0: design, dieId: hit.dieId, blockId: hit.blockId, handle: hit.handle, moved: false };
      } else if (hit && hit.type === 'block') {
        const already = selection.indexOf(hit.blockId) >= 0;
        let next = selection;
        if (e.shiftKey) next = already ? selection.filter((i) => i !== hit.blockId) : selection.concat(hit.blockId);
        else if (!already) next = [hit.blockId];
        if (next.join() !== selection.join()) setSel(next);
        if (next.indexOf(hit.blockId) < 0) { drag = null; return; }
        drag = { type: 'move', id: e.pointerId, sx: p.x, sy: p.y, design0: design, primary: hit.blockId, moved: false, shift: e.shiftKey, wasSelected: already };
      } else {
        drag = { type: 'pan', id: e.pointerId, sx: p.x, sy: p.y, view0: view, moved: false, click: e.button === 0 && !wantPan };
      }
    }

    function applyMove(p, e) {
      const d0 = drag.design0; const dxMm = (p.x - drag.sx) / view.zoom; const dyMm = (p.y - drag.sy) / view.zoom;
      const noSnap = !!e.shiftKey;
      const items = [];
      d0.dies.forEach((die) => die.blocks.forEach((b) => { if (selection.indexOf(b.id) >= 0) items.push({ die, b }); }));
      const prim = items.find((it) => it.b.id === drag.primary);
      if (!prim) return;
      const res = geom.moveBlock(prim.die, prim.b, dxMm, dyMm, { noSnap });
      let dx = res.x - prim.b.x; let dy = res.y - prim.b.y;
      items.forEach((it) => {
        dx = Math.max(-it.b.x, Math.min(it.die.widthMm - it.b.w - it.b.x, dx));
        dy = Math.max(-it.b.y, Math.min(it.die.heightMm - it.b.h - it.b.y, dy));
      });
      const rects = {};
      items.forEach((it) => { rects[it.b.id] = { x: Math.round((it.b.x + dx) * 1e9) / 1e9, y: Math.round((it.b.y + dy) * 1e9) / 1e9 }; });
      emitChange(withBlocks(d0, rects), true);
    }
    function applyResize(p, e) {
      const d0 = drag.design0; const die = findDie(d0, drag.dieId); const b = die && findBlock(die, drag.blockId);
      if (!b) return;
      const r = geom.resizeBlock(die, b, drag.handle, (p.x - drag.sx) / view.zoom, (p.y - drag.sy) / view.zoom, { noSnap: !!e.shiftKey });
      emitChange(withBlocks(d0, { [b.id]: r }), true);
    }

    function onPointerMove(e) {
      const p = pos(e);
      if (!drag) {
        if (viewMode !== 'place') { setCursor('default'); return; }
        if (spaceDown) { setCursor('grab'); return; }
        const hit = geom.hitTest(design, view, p.x, p.y, hitOpts());
        setCursor(hit && hit.type === 'handle' ? CURSORS[hit.handle] : hit && hit.type === 'block' ? 'move' : '');
        return;
      }
      if (e.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) < 3) return;
      drag.moved = true;
      if (drag.type === 'pan') {
        view = geom.panBy(drag.view0, p.x - drag.sx, p.y - drag.sy); setCursor('grabbing'); invalidate();
      } else if (drag.type === 'move') applyMove(p, e);
      else if (drag.type === 'resize') applyResize(p, e);
    }

    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      try { glCanvas.releasePointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      if (cancelled && d.type !== 'pan' && d.moved) {
        const unchanged = JSON.stringify(design) === JSON.stringify(d.design0); // 動いていない(元に戻っている)なら履歴に積まない
        design = d.design0; invalidate(); if (H.onChange) H.onChange(design, { coalesce: false, unchanged }); return;
      }
      if (d.type === 'pan') {
        if (!d.moved && d.click && selection.length) setSel([]);
        setCursor('');
      } else if (d.moved) {
        if (H.onChange) H.onChange(design, { coalesce: false }); // 最終変更を 1 回(履歴は 1 手)
      } else if (d.type === 'move' && !d.shift && d.wasSelected && selection.length > 1) {
        setSel([d.primary]); // 複数選択中に動かさずクリック → そのブロックだけ選択
      }
    }
    const onPointerUp = (e) => endDrag(e, false);
    const onPointerCancel = (e) => endDrag(e, true);

    function onWheel(e) {
      e.preventDefault();
      const p = pos(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      view = geom.zoomAt(view, p.x, p.y, Math.exp(-dy * 0.0015));
      invalidate();
    }

    function onKeyDown(e) {
      if (e.key === ' ' || e.code === 'Space') { spaceDown = true; setCursor('grab'); e.preventDefault(); return; }
      if (e.key === 'Escape') { if (selection.length) setSel([]); return; }
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const dv = dirs[e.key];
      if (!dv || !selection.length || viewMode !== 'place' || drag) return;
      e.preventDefault();
      const g = geom.DEFAULT_GRID_MM;
      let dx = dv[0] * g; let dy = dv[1] * g;
      const items = [];
      design.dies.forEach((die) => die.blocks.forEach((b) => { if (selection.indexOf(b.id) >= 0) items.push({ die, b }); }));
      items.forEach((it) => {
        dx = Math.max(-it.b.x, Math.min(it.die.widthMm - it.b.w - it.b.x, dx));
        dy = Math.max(-it.b.y, Math.min(it.die.heightMm - it.b.h - it.b.y, dy));
      });
      if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) return;
      const rects = {};
      items.forEach((it) => { rects[it.b.id] = { x: Math.round((it.b.x + dx) * 1e9) / 1e9, y: Math.round((it.b.y + dy) * 1e9) / 1e9 }; });
      emitChange(withBlocks(design, rects), false);
    }
    function onKeyUp(e) { if (e.key === ' ' || e.code === 'Space') { spaceDown = false; setCursor(''); } }
    function onBlur() { spaceDown = false; }
    function onContextLost(e) { e.preventDefault(); glLost = true; }
    function onContextRestored() { glLost = false; try { initGL(); } catch (err) { glLost = true; return; } invalidate(); }

    glCanvas.addEventListener('pointerdown', onPointerDown);
    glCanvas.addEventListener('pointermove', onPointerMove);
    glCanvas.addEventListener('pointerup', onPointerUp);
    glCanvas.addEventListener('pointercancel', onPointerCancel);
    glCanvas.addEventListener('wheel', onWheel, { passive: false });
    glCanvas.addEventListener('keydown', onKeyDown);
    glCanvas.addEventListener('keyup', onKeyUp);
    glCanvas.addEventListener('blur', onBlur);
    glCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    glCanvas.addEventListener('webglcontextlost', onContextLost);
    glCanvas.addEventListener('webglcontextrestored', onContextRestored);

    resize();
    updateAria();
    invalidate();

    // ---- 公開 API ----
    return {
      available: true,
      setDesign(d) {
        design = d && d.dies ? d : { dies: [] };
        if (drag && drag.type !== 'pan') drag = null; // 外部から設計が差し替わったらドラッグを中断
        const ids = new Set(); design.dies.forEach((x) => x.blocks.forEach((b) => ids.add(b.id)));
        selection = selection.filter((i) => ids.has(i)); // 消えたブロックの選択は外す(通知はしない)
        maybeAutoFit(); updateAria(); invalidate();
      },
      setSelection(ids) { selection = (ids || []).slice(); updateAria(); invalidate(); },
      setViewMode(m) { viewMode = (m === 'power' || m === 'temp') ? m : 'place'; invalidate(); },
      fit() { if (cssW) doFit(); },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (rafId) win.cancelAnimationFrame(rafId);
        glCanvas.removeEventListener('pointerdown', onPointerDown);
        glCanvas.removeEventListener('pointermove', onPointerMove);
        glCanvas.removeEventListener('pointerup', onPointerUp);
        glCanvas.removeEventListener('pointercancel', onPointerCancel);
        glCanvas.removeEventListener('wheel', onWheel);
        glCanvas.removeEventListener('keydown', onKeyDown);
        glCanvas.removeEventListener('keyup', onKeyUp);
        glCanvas.removeEventListener('blur', onBlur);
        glCanvas.removeEventListener('webglcontextlost', onContextLost);
        glCanvas.removeEventListener('webglcontextrestored', onContextRestored);
        if (ro) ro.disconnect();
        if (onWinResize) win.removeEventListener('resize', onWinResize);
        if (mql && onScheme) { if (mql.removeEventListener) mql.removeEventListener('change', onScheme); else if (mql.removeListener) mql.removeListener(onScheme); }
        if (!glLost) { try { gl.deleteBuffer(buf); gl.deleteProgram(prog); } catch (e) { /* 無視 */ } }
        const ext = gl.getExtension && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        if (glCanvas.parentNode) glCanvas.parentNode.removeChild(glCanvas);
        if (labelCanvas.parentNode) labelCanvas.parentNode.removeChild(labelCanvas);
      },
    };
  }

  const api = { createDieView, PALETTES, blockColorKey };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.createDieView = createDieView;
  root.SDS.render.dieview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
