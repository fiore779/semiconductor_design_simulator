// WebGL ダイビュー(設計書 §8.1)。ダイ・ブロックを上から見たフロアプランとして描き、移動・リサイズ・ズーム・パンを扱う。
// 構成: WebGL canvas(矩形・ストライプ)+ その上に重ねる 2D canvas(ラベル・縮尺・注記、pointer-events:none)。
// 色は CSS 変数に依存せず、JS 側の light/dark パレットを使う。描画は変更時のみ(requestAnimationFrame + dirty フラグ)。
// 幾何計算は geom.js(純関数)。
(function (root) {
  'use strict';

  const geom = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./geom.js') : root.SDS.render.geom;
  const colormap = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./colormap.js') : root.SDS.render.colormap;
  const palette = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./palette.js') : root.SDS.render.palette;

  // ---- パレット(#rrggbb)----
  const PALETTES = {
    light: {
      bg: '#eef0f3', dieFill: '#fbfbf8', dieEdge: '#3b4250',
      unknownA: '#fff1d6', unknownB: '#e8c27a',
      coreP: '#2f5fb3', coreE: '#8fb6ea', coreLP: '#bcd5f3', l3: '#d9962b', gpu: '#3a9a6a', uncore: '#8a7bb8', npu: '#c0709a', other: '#9aa0a6',
      blockEdge: '#1c2430', sel: '#e8590c', handleFill: '#ffffff',
      text: '#1c2430', textOnDark: '#ffffff', note: '#4a5260', overlay: '#eef0f3', pill: '#ffffff',
    },
    dark: {
      bg: '#14171c', dieFill: '#222831', dieEdge: '#aab2c0',
      unknownA: '#3a3220', unknownB: '#7a6030',
      coreP: '#4c7fd6', coreE: '#7da2d8', coreLP: '#a3bde2', l3: '#c98a2e', gpu: '#3fae7a', uncore: '#9a8bc8', npu: '#c27ba8', other: '#7a8088',
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
    if (b.kind === 'npu') return 'npu';
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

  const NOTE_TEXT = '模式図(ブロックの大きさ・配置は実チップのものではありません)';
  const FPM = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('../model/floorplan.js') : (root.SDS && root.SDS.model && root.SDS.model.floorplan);
  // 実物風フロアプランのダイがあれば、縮尺の根拠の注記
  const noteText = (d) => {
    const die = d && d.dies && d.dies.find((x) => x.layout);
    const a = die && FPM ? FPM.scaleText(die.layout) : NOTE_TEXT; const b = d && FPM ? FPM.decorNote(d.decorDies) : null;
    return b ? `${a}。${b}` : a;
  };
  const HEAT_TEXT = 'このモードは推定できません(理由は下の注記を参照)';
  const KIND_LEGEND = { coreP: 'P/高性能コア', coreE: 'E コア', coreLP: 'LP-E コア', l3: 'L3 キャッシュ', gpu: 'GPU', uncore: 'アンコア', npu: 'NPU', other: 'その他' };
  const KIND_NAMES = { power: '電力密度', temp: '温度' };

  // テクスチャ用の 2 つ目のシェーダ(ヒートマップの矩形)。属性位置は bindAttribLocation で固定する。
  const VS_T = 'attribute vec2 a_pos;attribute vec2 a_uv;uniform vec2 u_res;varying vec2 v_uv;' +
    'void main(){v_uv=a_uv;gl_Position=vec4(a_pos.x/u_res.x*2.0-1.0,1.0-a_pos.y/u_res.y*2.0,0.0,1.0);}';
  const FS_T = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}';

  // 凡例・ホバーの値の表示。温度は 0.1℃ 単位、電力密度は有効数字 3 桁
  function fmtVal(v, kind) {
    if (!isFinite(v)) return '-';
    if (kind === 'temp') return v.toFixed(1);
    return v === 0 ? '0' : String(Number(v.toPrecision(3)));
  }
  const GL_ERROR_TEXT = 'WebGL が使えません。ブラウザの設定(ハードウェアアクセラレーション)を確認するか、別のブラウザでお試しください。ダイビューは表示できません。';

  function emptyApi() {
    return { available: false, setDesign() {}, setSelection() {}, setViewMode() {}, setColorMode() {}, setHeatmap() {}, fit() {}, captureCanvas() { return null; }, destroy() {} };
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
    let progT = null; let locT = null; let bufT = null;
    let heat = null;              // setHeatmap で渡されたデータ(null なら無し)
    const heatTex = new Map();    // dieId -> { tex, nx, ny }
    let colorMode = 'kind';       // 'kind'(種別で色分け)| 'origin'(出所で色分け)
    let hover = null;             // カーソル位置(CSS px)。ヒートマップ中のセル値表示用

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
      const vt = compile(gl.VERTEX_SHADER, VS_T); const ft = compile(gl.FRAGMENT_SHADER, FS_T);
      progT = gl.createProgram();
      gl.attachShader(progT, vt); gl.attachShader(progT, ft);
      gl.bindAttribLocation(progT, 0, 'a_pos'); gl.bindAttribLocation(progT, 1, 'a_uv');
      gl.linkProgram(progT);
      gl.deleteShader(vt); gl.deleteShader(ft);
      if (!gl.getProgramParameter(progT, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(progT));
      locT = { res: gl.getUniformLocation(progT, 'u_res'), tex: gl.getUniformLocation(progT, 'u_tex') };
      bufT = gl.createBuffer();
      heatTex.clear(); // コンテキスト再作成時は古いテクスチャは無効
      uploadHeat();
    }

    // ---- ヒートマップのテクスチャ(各ダイ 1 枚、LUT 適用済み RGBA。NEAREST + CLAMP_TO_EDGE なので WebGL1 の NPOT でも可)----
    function freeHeatTex() {
      if (!glLost) heatTex.forEach((t) => { try { gl.deleteTexture(t.tex); } catch (e) { /* 無視 */ } });
      heatTex.clear();
    }
    function uploadHeat() {
      freeHeatTex();
      if (!heat || !heat.dies) return;
      const lut = colormap.buildLut(heat.kind, 256);
      const maxSide = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
      heat.dies.forEach((d) => {
        const nx = d.nx | 0; const ny = d.ny | 0;
        if (nx < 1 || ny < 1 || nx > maxSide || ny > maxSide || !d.values || d.values.length < nx * ny) return;
        const px = new Uint8Array(nx * ny * 4);
        for (let k = 0; k < nx * ny; k++) {
          const v = d.values[k];
          if (v !== v) { const c = colormap.colorAt(NaN, heat.kind); px[k * 4] = c[0] * 255; px[k * 4 + 1] = c[1] * 255; px[k * 4 + 2] = c[2] * 255; px[k * 4 + 3] = 255; continue; }
          const i = Math.round(Math.max(0, Math.min(1, v)) * 255) * 4;
          px[k * 4] = lut[i]; px[k * 4 + 1] = lut[i + 1]; px[k * 4 + 2] = lut[i + 2]; px[k * 4 + 3] = 255;
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nx, ny, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        heatTex.set(d.dieId, { tex, nx, ny });
      });
    }
    const heatActive = () => !!(heat && viewMode !== 'place' && heat.kind === viewMode);
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
    const decorOf = (d) => (d && Array.isArray(d.decorDies) ? d.decorDies : []);
    function designSig(d) { return d.dies.concat(decorOf(d)).map((x) => `${x.id}:${x.x},${x.y},${x.widthMm},${x.heightMm}`).join('|'); }
    function doFit() { view = geom.fit(design.dies.concat(decorOf(design)), cssW, cssH, 48); invalidate(); }
    function maybeAutoFit() {
      if (cssW === 0 || !design.dies.length) { if (design.dies.length) fitSig = 'pending'; return; }
      const sig = designSig(design);
      if (sig !== fitSig) { fitSig = sig; doFit(); }
    }

    // ---- 出所による色分け(混合設計)----
    const originKey = (b) => b.sourcePresetId || b.sourceChip || 'その他';
    const originOn = () => colorMode === 'origin' && !!palette && !heatActive();
    // 出所ごとの { key, name, count, color:[r,g,b] }(キーのソート順)と、ported / 面積未取得の有無
    function originInfo() {
      const map = new Map(); let ported = false; let noArea = false;
      design.dies.forEach((d) => d.blocks.forEach((b) => {
        const k = originKey(b);
        const e = map.get(k) || { key: k, name: b.sourceChip || k, count: 0 };
        e.count++; map.set(k, e);
        if (b.ported) ported = true;
        if (typeof b.areaMm2 !== 'number') noArea = true;
      }));
      const cols = palette.originColors(Array.from(map.keys()), palName);
      const list = Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      list.forEach((e) => { e.color = cols[e.key]; });
      return { list, byKey: map, ported, noArea };
    }
    const mix = (c, t, a) => [c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a];
    const WHITE = [1, 1, 1]; const BLACK = [0, 0, 0];
    // 出所色 + 種別: コアは明度で(P/super 濃い → E → LP-E 薄い)、L3 は薄い斜線、GPU は濃い斜線、uncore は灰色寄り
    function originFill(b, base) {
      const k = blockColorKey(b);
      if (typeof b.areaMm2 !== 'number') return { col: base, col2: null, stripe: 'noarea' };
      if (k === 'coreP') return { col: base };
      if (k === 'coreE') return { col: mix(base, WHITE, 0.35) };
      if (k === 'coreLP') return { col: mix(base, WHITE, 0.6) };
      if (k === 'l3') return { col: base, col2: mix(base, WHITE, 0.45), stripe: 'kind' };
      if (k === 'gpu') return { col: base, col2: mix(base, BLACK, 0.35), stripe: 'kind' };
      if (k === 'uncore' || k === 'npu') return { col: mix(base, [0.5, 0.5, 0.5], 0.55) };
      return { col: mix(base, [0.5, 0.5, 0.5], 0.3) };
    }
    const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

    // ---- aria ----
    function hotDieName() { // 正規化値が最大のセルを持つダイの名前(一様なら null)
      let best = -1; let name = null;
      design.dies.forEach((die) => {
        const hd = heat.dies.find((d) => d.dieId === die.id);
        if (!hd) return;
        const mi = geom.maxCellIndex(hd.values);
        if (mi >= 0 && hd.values[mi] > best) { best = hd.values[mi]; name = die.name || die.id; }
      });
      return name;
    }
    function updateAria() {
      const nBlocks = design.dies.reduce((s, d) => s + d.blocks.length, 0);
      const names = [];
      design.dies.forEach((d) => d.blocks.forEach((b) => { if (selection.indexOf(b.id) >= 0) names.push(b.label || b.id); }));
      const selText = names.length === 0 ? '選択中のブロックはありません' : names.length <= 3 ? `選択中: ${names.join('、')}` : `選択中: ${names.length} 個のブロック`;
      if (heatActive()) {
        const lg = heat.legend || {};
        const ok = isFinite(lg.min) && isFinite(lg.max);
        const hot = hotDieName();
        const text = lg.uniform ? `一様(${ok ? fmtVal(lg.min, heat.kind) : '-'} ${lg.unit || ''})` : ok ? `最高 ${fmtVal(lg.max, heat.kind)} ${lg.unit || ''} 付近${hot ? `(${hot})` : ''}、最低 ${fmtVal(lg.min, heat.kind)}` : '値なし';
        glCanvas.setAttribute('aria-label', `${KIND_NAMES[heat.kind]}のヒートマップ(模式図)。${text}。配置の編集はできません。`);
        return;
      }
      glCanvas.setAttribute('aria-label', `ダイビュー(配置図): ダイ ${design.dies.length} 個、ブロック ${nBlocks} 個。${originOn() ? `出所で色分け(${originInfo().list.length} 種類)。` : ''}${selText}。矢印キーで選択ブロックを移動、Esc で選択解除。`);
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

      const heatOn = heatActive();
      const oInfo = originOn() ? originInfo() : null;
      const heatQuads = []; // [{ tex, r }]
      // 飾りの IO ダイ: 薄く出すだけ(編集・選択・ヒットテストの対象外)
      decorOf(design).forEach((d) => {
        const r = geom.screenRect(view, geom.dieWorldRect(d));
        rect(r.x, r.y, r.w, r.h, rgba('#1f7a85', 0.32)); outline(r, 1, rgba('#1f7a85', 0.75));
      });
      design.dies.forEach((die) => {
        const r = geom.screenRect(view, geom.dieWorldRect(die));
        const ht = heatOn ? heatTex.get(die.id) : null;
        if (ht) heatQuads.push({ tex: ht.tex, r });
        else if (die.areaKnown === false) rect(r.x, r.y, r.w, r.h, rgba(P.unknownA), true, rgba(P.unknownB));
        else rect(r.x, r.y, r.w, r.h, rgba(P.dieFill));
        if (!ht) outline(r, 2, dieEdge);
      });
      const edgeDark = rgba('#000000', 0.55); const edgeLight = rgba('#ffffff', 0.9);
      const dieEdgeHeat = (r) => { outline(r, 4, edgeDark); outline(r, 2, edgeLight); };
      const verts0 = verts.splice(0); // ここまで(ダイの下地)を 1 回目の描画に、以降を 2 回目に回す
      const selRects = [];
      design.dies.forEach((die) => {
        if (heatOn && heatTex.get(die.id)) dieEdgeHeat(geom.screenRect(view, geom.dieWorldRect(die)));
        die.blocks.forEach((b) => {
          const r = geom.screenRect(view, geom.blockWorldRect(die, b));
          if (heatOn) { // ヒートマップ中はブロックを塗らず、外枠だけ残す
            if (selection.indexOf(b.id) >= 0) selRects.push(r); else { outline(r, 3, edgeDark); outline(r, 1, edgeLight); }
            return;
          }
          if (oInfo) {
            const f = originFill(b, oInfo.byKey.get(originKey(b)).color);
            const c1 = [f.col[0], f.col[1], f.col[2], 1];
            if (f.stripe === 'noarea') rect(r.x, r.y, r.w, r.h, c1, true, rgba(P.dieFill)); // 面積未取得: 斜線
            else if (f.stripe) rect(r.x, r.y, r.w, r.h, c1, true, [f.col2[0], f.col2[1], f.col2[2], 1]);
            else rect(r.x, r.y, r.w, r.h, c1);
          } else rect(r.x, r.y, r.w, r.h, rgba(P[blockColorKey(b)]));
          if (selection.indexOf(b.id) >= 0) selRects.push(r); else outline(r, 1, edge);
          if (oInfo && b.ported && r.w > 10 && r.h > 10) { // 移植した部品: 内側に破線の二重線(暗+白)
            const segs = geom.dashedRectSegments({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 }, 5, 3);
            const dash = (t, col) => segs.forEach((sg) => {
              if (sg.y0 === sg.y1) rect(sg.x0, sg.y0 - t / 2, sg.x1 - sg.x0, t, col); else rect(sg.x0 - t / 2, sg.y0, t, sg.y1 - sg.y0, col);
            });
            dash(4, rgba('#000000', 0.85)); dash(2, rgba('#ffffff', 1));
          } else if (oInfo && b.ported) { // 小さいブロックには破線が出ないので、隅に小さな印(点: 暗い縁+白)を付ける
            const dx = Math.min(5, Math.max(1, r.w / 3)); const dy = Math.min(5, Math.max(1, r.h / 3));
            rect(r.x + 1, r.y + 1, dx + 2, dy + 2, rgba('#000000', 0.85)); rect(r.x + 2, r.y + 2, dx, dy, rgba('#ffffff', 1));
          }
        });
      });
      selRects.forEach((r) => {
        outline(r, 3, selCol);
        const pts = geom.handlePoints(r); const hs = geom.HANDLE_PX;
        geom.HANDLES.forEach((k) => {
          const p = pts[k];
          rect(p.x - hs / 2 - 1, p.y - hs / 2 - 1, hs + 2, hs + 2, selCol);
          rect(p.x - hs / 2 + 1, p.y - hs / 2 + 1, hs - 2, hs - 2, rgba(P.handleFill));
        });
      });
      if (viewMode !== 'place' && !heatOn) rect(0, 0, cssW, cssH, rgba(P.overlay, 0.72)); // データ無し: グレーアウト

      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      const bg = hexToRgb(P.bg);
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const flush = (vs) => {
        if (!vs.length) return;
        gl.useProgram(prog);
        gl.uniform2f(loc.res, glCanvas.width, glCanvas.height);
        gl.uniform1f(loc.period, 10 * dpr);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vs), gl.DYNAMIC_DRAW);
        for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
        const stride = 11 * 4;
        gl.enableVertexAttribArray(loc.pos); gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(loc.col); gl.vertexAttribPointer(loc.col, 4, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(loc.col2); gl.vertexAttribPointer(loc.col2, 4, gl.FLOAT, false, stride, 24);
        gl.enableVertexAttribArray(loc.str); gl.vertexAttribPointer(loc.str, 1, gl.FLOAT, false, stride, 40);
        gl.drawArrays(gl.TRIANGLES, 0, vs.length / 11);
      };
      flush(verts0);
      if (heatQuads.length) { // ヒートマップのテクスチャ矩形(ダイごと)
        gl.useProgram(progT);
        gl.uniform2f(locT.res, glCanvas.width, glCanvas.height);
        gl.uniform1i(locT.tex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufT);
        for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
        heatQuads.forEach((q) => {
          const x0 = q.r.x * dpr; const y0 = q.r.y * dpr; const x1 = (q.r.x + q.r.w) * dpr; const y1 = (q.r.y + q.r.h) * dpr;
          // u,v: v=0 が画像の 1 行目(= ダイの上端)
          const qv = new Float32Array([x0, y0, 0, 0, x1, y0, 1, 0, x0, y1, 0, 1, x1, y0, 1, 0, x1, y1, 1, 1, x0, y1, 0, 1]);
          gl.bindTexture(gl.TEXTURE_2D, q.tex);
          gl.bufferData(gl.ARRAY_BUFFER, qv, gl.DYNAMIC_DRAW);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
      }
      flush(verts);

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
      const heatOn = heatActive();
      const oInfo = originOn() ? originInfo() : null;

      decorOf(design).forEach((d) => { // 飾りの IO ダイのラベル(ダイの下側)
        const r = geom.screenRect(view, geom.dieWorldRect(d));
        c.textAlign = 'left'; c.fillStyle = P.text; c.font = FONT; c.fillText(d.label, r.x + 6, r.y + 14); // ダイの内側(縮尺バー・注記と重ならない)
      });
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
          if (oInfo) { // 候補を長い順に試し、入る最初のものを使う(出所の略称・移植 ⇄・面積未取得を添える)
            const f = originFill(b, oInfo.byKey.get(originKey(b)).color);
            const base = (b.ported ? '⇄ ' : '') + (b.label || '');
            const sn = b.sourceChip ? palette.shortName(b.sourceChip) : '?';
            const withSrc = sn !== '?' ? base + ' ' + sn : base;
            const cands = typeof b.areaMm2 !== 'number' ? [withSrc + ' 面積未取得', base + ' 面積未取得', withSrc, base] : [withSrc, base];
            const t2 = cands.find((t) => t.trim() && br.h >= 14 && c.measureText(t).width <= br.w - 4);
            if (!t2) return;
            c.textAlign = 'center';
            const dk = lumOf(f.col) < 0.5;
            c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = dk ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
            c.strokeText(t2, br.x + br.w / 2, br.y + br.h / 2);
            c.fillStyle = dk ? '#ffffff' : '#101418';
            c.fillText(t2, br.x + br.w / 2, br.y + br.h / 2);
            return;
          }
          const text = b.label || '';
          if (!text) return;
          if (br.h < 14 || c.measureText(text).width > br.w - 4) return; // 入らなければ省略
          c.textAlign = 'center';
          if (heatOn) { // ヒートマップ上は縁取り付きの白文字
            c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.8)';
            c.strokeText(text, br.x + br.w / 2, br.y + br.h / 2);
            c.fillStyle = '#ffffff';
          } else c.fillStyle = LIGHT_BLOCKS[blockColorKey(b)] && palName === 'light' ? P.text : (LIGHT_BLOCKS[blockColorKey(b)] ? '#101418' : P.textOnDark);
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
        if (heatOn) {
          let heatLines = 0;
          if (heat.note) { // 注記は折り返して縮尺バーの上へ(下から積む)
            const maxW = Math.max(120, cssW - 32 - 200);
            const lines = []; let cur = '';
            Array.from(String(heat.note)).forEach((ch) => {
              if (c.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
            });
            if (cur) lines.push(cur);
            c.fillStyle = P.note; c.textAlign = 'left';
            for (let i = 0; i < lines.length; i++) c.fillText(lines[i], x, y - 22 - (lines.length - 1 - i) * 16);
            heatLines = lines.length;
          }
          const dn = FPM ? FPM.decorNote(design.decorDies) : null; // ヒートマップ表示中も飾りの IOD の注記は消さない
          if (dn) { c.fillStyle = P.note; c.textAlign = 'left'; c.fillText(dn, x, y - 22 - heatLines * 16); }
        } else if (anySchematic) { // 注記は狭い画面では折り返す(縮尺バーの上へ、下から積む)
          c.fillStyle = P.note; c.textAlign = 'left';
          const maxW = Math.max(120, cssW - 32 - 200); const ls = []; let cur2 = '';
          Array.from(noteText(design)).forEach((ch) => { if (c.measureText(cur2 + ch).width > maxW) { ls.push(cur2); cur2 = ch; } else cur2 += ch; });
          if (cur2) ls.push(cur2);
          for (let i = 0; i < ls.length; i++) c.fillText(ls[i], x, y - 22 - (ls.length - 1 - i) * 16);
        }
      }
      if (heatOn) drawHeatOverlay(c, P, FONT);
      else if (oInfo) drawOriginLegend(c, P, FONT, oInfo);

      if (viewMode !== 'place' && !heatOn) {
        c.font = 'bold 15px sans-serif'; c.textAlign = 'center';
        const w = c.measureText(HEAT_TEXT).width + 32;
        c.fillStyle = P.pill; c.fillRect(cssW / 2 - w / 2, cssH / 2 - 20, w, 40);
        c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(cssW / 2 - w / 2 + 0.5, cssH / 2 - 19.5, w - 1, 39);
        c.fillStyle = P.text; c.fillText(HEAT_TEXT, cssW / 2, cssH / 2);
      }
    }

    // 出所の凡例(右上): 色見本 + 出所名 + 個数。最大 8 件、超えたら「ほか n 件」
    function drawOriginLegend(c, P, FONT, info) {
      if (!info.list.length) return;
      const MAXN = 8; const shown = info.list.slice(0, MAXN); const rest = info.list.length - shown.length;
      const lines = shown.map((e) => ({ col: e.color, text: e.name + ' (' + e.count + ')' }));
      if (rest > 0) lines.push({ col: null, text: 'ほか ' + rest + ' 件' });
      if (info.ported) lines.push({ col: null, text: '⇄ 破線の枠(小さい部品は隅の点)= 移植した部品' });
      if (info.noArea) lines.push({ col: null, text: '斜線 = 面積未取得' });
      c.font = FONT; c.textBaseline = 'middle'; c.textAlign = 'left';
      const lh = 18; const sw = 12;
      const w = Math.min(Math.max.apply(null, lines.map((l) => c.measureText(l.text).width)) + sw + 24, cssW - 16);
      const h = (lines.length + 1) * lh + 8; const x = cssW - 16 - w; const y = 12;
      c.fillStyle = P.pill; c.fillRect(x, y, w, h);
      c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      c.fillStyle = P.text; c.font = 'bold 12px sans-serif'; c.fillText('出所', x + 8, y + 4 + lh / 2);
      c.font = FONT;
      lines.forEach((l, i) => {
        const ly = y + 4 + lh * (i + 1) + lh / 2;
        if (l.col) {
          c.fillStyle = 'rgb(' + Math.round(l.col[0] * 255) + ',' + Math.round(l.col[1] * 255) + ',' + Math.round(l.col[2] * 255) + ')';
          c.fillRect(x + 8, ly - sw / 2, sw, sw);
          c.strokeStyle = P.text; c.lineWidth = 1; c.strokeRect(x + 8.5, ly - sw / 2 + 0.5, sw - 1, sw - 1);
        }
        c.fillStyle = P.text; c.fillText(l.text, x + 8 + (l.col ? sw + 6 : 0), ly);
      });
    }

    // ヒートマップ中の 2D オーバーレイ: 最大セルの十字、凡例(右下)、カーソル位置のセル値
    function drawHeatOverlay(c, P, FONT) {
      const lg = heat.legend || {};
      const unit = lg.unit || '';
      const hasRange = isFinite(lg.min) && isFinite(lg.max);
      const realVal = (v) => (lg.uniform || !hasRange ? (hasRange ? lg.min : NaN) : lg.min + v * (lg.max - lg.min));
      // 最大セルの十字(一様なら最大の意味がないので出さない)
      if (!lg.uniform) {
        design.dies.forEach((die) => {
          const hd = heat.dies.find((d) => d.dieId === die.id);
          if (!hd || !heatTex.get(die.id)) return;
          const mi = geom.maxCellIndex(hd.values);
          if (mi < 0) return;
          const r = geom.screenRect(view, geom.dieWorldRect(die));
          const px = r.x + ((mi % hd.nx) + 0.5) / hd.nx * r.w; const py = r.y + (Math.floor(mi / hd.nx) + 0.5) / hd.ny * r.h;
          const s = 9;
          [['rgba(0,0,0,0.9)', 5], ['#ffffff', 2]].forEach((st) => {
            c.strokeStyle = st[0]; c.lineWidth = st[1]; c.beginPath();
            c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s); c.lineTo(px, py + s); c.stroke();
          });
        });
      }
      // 凡例(右下): カラーバー + min/max/単位
      const bw = 180; const bh = 14; const bx = cssW - 16 - bw; const by = cssH - 16 - bh - 26;
      c.font = FONT; c.textBaseline = 'middle';
      const title = `${KIND_NAMES[heat.kind] || ''}${lg.label ? `: ${lg.label}` : ''}${unit ? ` [${unit}]` : ''}`;
      c.fillStyle = P.pill; c.fillRect(bx - 8, by - 26, bw + 16, bh + 26 + 24 + 6);
      c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(bx - 7.5, by - 25.5, bw + 15, bh + 26 + 24 + 5);
      c.textAlign = 'left'; c.fillStyle = P.text; c.font = 'bold 12px sans-serif';
      c.fillText(title, bx, by - 14);
      c.font = FONT;
      const g = c.createLinearGradient(bx, 0, bx + bw, 0);
      for (let i = 0; i <= 8; i++) { const col = colormap.colorAt(i / 8, heat.kind); g.addColorStop(i / 8, `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})`); }
      c.fillStyle = g; c.fillRect(bx, by, bw, bh);
      c.strokeStyle = P.text; c.lineWidth = 1; c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      c.fillStyle = P.text;
      if (lg.uniform) {
        c.textAlign = 'left'; c.fillText(`一様(${hasRange ? fmtVal(lg.min, heat.kind) : '-'} ${unit})`, bx, by + bh + 12);
      } else {
        c.textAlign = 'left'; c.fillText(hasRange ? fmtVal(lg.min, heat.kind) : '-', bx, by + bh + 12);
        c.textAlign = 'right'; c.fillText(hasRange ? `${fmtVal(lg.max, heat.kind)} ${unit}` : '-', bx + bw, by + bh + 12);
        if (hasRange && heat.kind === 'temp') { c.textAlign = 'center'; c.fillText(`範囲 ${fmtVal(lg.max - lg.min, 'temp')} K`, bx + bw / 2, by + bh + 12); }
      }
      // カーソル位置のセル値
      if (hover) {
        for (let i = design.dies.length - 1; i >= 0; i--) {
          const die = design.dies[i]; const hd = heat.dies.find((d) => d.dieId === die.id);
          if (!hd) continue;
          const cell = geom.cellAt(view, die, hd.nx, hd.ny, hover.x, hover.y);
          if (!cell) continue;
          const v = hd.values[cell.index];
          const txt = `${die.name || die.id} (${cell.ix}, ${cell.iy}): ${fmtVal(realVal(v), heat.kind)} ${unit}`;
          c.font = FONT; c.textAlign = 'left';
          const tw = c.measureText(txt).width + 12;
          const tx = Math.min(hover.x + 14, cssW - tw - 4); const ty = Math.max(hover.y - 26, 4);
          c.fillStyle = P.pill; c.fillRect(tx, ty, tw, 20);
          c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 19);
          c.fillStyle = P.text; c.fillText(txt, tx + 6, ty + 10);
          break;
        }
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
      if (heatActive()) { hover = p; invalidate(); } else if (hover) hover = null;
      if (!drag) {
        if (viewMode !== 'place') { setCursor(spaceDown ? 'grab' : 'default'); return; }
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
    const onPointerLeave = () => { if (hover) { hover = null; invalidate(); } };
    glCanvas.addEventListener('pointerleave', onPointerLeave);
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
      // 'kind'(既定: 種別で色分け)| 'origin'(出所ごとに色分け)。setDesign の前後どちらで呼んでもよい。
      setColorMode(m) { colorMode = m === 'origin' ? 'origin' : 'kind'; updateAria(); invalidate(); },
      setSelection(ids) { selection = (ids || []).slice(); updateAria(); invalidate(); },
      setViewMode(m) {
        viewMode = (m === 'power' || m === 'temp') ? m : 'place';
        if (viewMode !== 'place' && drag && drag.type !== 'pan') drag = null; // ヒートマップ中は編集不可
        hover = null; updateAria(); invalidate();
      },
      // data: null | { kind, dies:[{dieId,nx,ny,values,cellMm}], legend:{min,max,unit,uniform,label}, note }
      setHeatmap(data) {
        heat = data && data.dies && (data.kind === 'power' || data.kind === 'temp') ? data : null;
        if (!glLost) { try { uploadHeat(); } catch (e) { heatTex.clear(); } }
        updateAria(); invalidate();
      },
      fit() { if (cssW) doFit(); },
      // PNG 書き出し用(設計書 §9)。選択枠とホバー表示を外して同期で再描画し、同じ処理の中で GL と 2D のラベルを
      // オフスクリーン canvas に合成して返す(preserveDrawingBuffer に頼らない)。失敗・描画不可なら null。
      // 戻り値: { canvas, mode:'place'|'power'|'temp', noData, legend:[{ text, color:'#rrggbb' }] }(凡例は種別色分け時だけ。ヒートマップ・出所色分けの凡例は画像内に描かれている)
      // maxWidth: 出力の最大幅(px。既定 2400)。元が大きければ drawImage で縮小したサイズのオフスクリーンだけを作る。
      // データ無しのヒートマップ(画面はグレーアウト)は mode にその種別、noData:true、legend は空を返す。
      captureCanvas(maxWidth) {
        let lost = false;
        try { lost = !!(gl.isContextLost && gl.isContextLost()); } catch (e) { lost = true; }
        if (destroyed || glLost || lost || !cssW || !design.dies.length) return null;
        const selSaved = selection; const hoverSaved = hover;
        try {
          selection = []; hover = null;
          draw();
          const cv = doc.createElement('canvas');
          const lim = maxWidth > 0 ? maxWidth : 2400; const k = Math.min(1, lim / glCanvas.width);
          cv.width = Math.max(1, Math.round(glCanvas.width * k)); cv.height = Math.max(1, Math.round(glCanvas.height * k));
          const c = cv.getContext('2d');
          if (!c) return null;
          c.drawImage(glCanvas, 0, 0, cv.width, cv.height); c.drawImage(labelCanvas, 0, 0, cv.width, cv.height);
          const heatOn = heatActive(); const noDataEarly = viewMode !== 'place' && !heatOn;
          const legend = [];
          if (!heatOn && !noDataEarly && !originOn()) {
            const seen = {};
            design.dies.forEach((d) => d.blocks.forEach((b) => { seen[blockColorKey(b)] = true; }));
            Object.keys(KIND_LEGEND).forEach((k) => { if (seen[k]) legend.push({ text: KIND_LEGEND[k], color: pal()[k] }); });
          }
          const noData = viewMode !== 'place' && !heatOn;
          return { canvas: cv, mode: viewMode, noData, legend };
        } catch (e) { return null; } finally { selection = selSaved; hover = hoverSaved; invalidate(); }
      },
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
        glCanvas.removeEventListener('pointerleave', onPointerLeave);
        freeHeatTex();
        if (!glLost) { try { gl.deleteBuffer(buf); gl.deleteBuffer(bufT); gl.deleteProgram(prog); gl.deleteProgram(progT); } catch (e) { /* 無視 */ } }
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
