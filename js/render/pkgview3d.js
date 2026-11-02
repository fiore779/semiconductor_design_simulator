// 3D パッケージビュー(設計書 §8.1)。ダイ・ブロックを実物のCPUパッケージに近い形(基板・ダイ・蓋・コンデンサ)で描く。
// 形状(厚み・コンデンサ・蓋・バンプ)は**模式図**。ダイの平面サイズ(mm)とブロック配置だけが設計データに忠実。編集は 2D ビュー(dieview.js)で行い、ここでは選択のみ。
// 構成: WebGL canvas(3D)+ その上に重ねる 2D canvas(ラベル・注記、pointer-events:none)。描画は変更時のみ(requestAnimationFrame + dirty)。
// 自動アニメーションはしない(prefers-reduced-motion に常に配慮した状態)。シェーダは GLSL ES 1.00(WebGL1/2 のどちらでも動く)。
// 幾何・カメラ・光線交差は pkggeom.js(純関数)、行列は mat4.js。
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  const G = isNode ? require('./pkggeom.js') : root.SDS.render.pkggeom;
  const colormap = isNode ? require('./colormap.js') : root.SDS.render.colormap;
  const palette = isNode ? require('./palette.js') : root.SDS.render.palette;
  const dv = isNode ? require('./dieview.js') : root.SDS.render.dieview;
  const PALETTES = dv.PALETTES; const blockColorKey = dv.blockColorKey;

  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  const VS = 'attribute vec3 a_pos;attribute vec3 a_nrm;attribute vec4 a_col;attribute float a_mat;attribute vec2 a_uv;uniform mat4 u_vp;' +
    'varying vec3 v_pos;varying vec3 v_nrm;varying vec4 v_col;varying float v_mat;varying vec2 v_uv;' +
    'void main(){v_pos=a_pos;v_nrm=a_nrm;v_col=a_col;v_mat=a_mat;v_uv=a_uv;gl_Position=u_vp*vec4(a_pos,1.0);}';
  const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'uniform vec3 u_eye;uniform vec3 u_light;uniform float u_ambient;uniform sampler2D u_tex;' +
    'varying vec3 v_pos;varying vec3 v_nrm;varying vec4 v_col;varying float v_mat;varying vec2 v_uv;' +
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);' +
    'return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}' +
    'bool isMat(float k){return abs(v_mat-k)<0.5;}' +
    'void main(){' +
    'vec3 n=normalize(v_nrm);vec3 base=v_col.rgb;float spec=0.15;float shin=16.0;' +
    'vec4 tx=texture2D(u_tex,v_uv);if(isMat(10.0)){gl_FragColor=vec4(tx.rgb,1.0);return;}' +
    'if(isMat(9.0)){gl_FragColor=v_col;return;}' +
    'if(isMat(1.0)){float nz=vnoise(v_pos.xz*45.0);float ln=step(0.93,fract(v_pos.x*3.0))+step(0.93,fract(v_pos.z*3.0));' +
    'base=base*(0.82+0.3*nz)+vec3(0.025)*ln;spec=0.12;shin=10.0;}' +
    'else if(isMat(2.0)){base=base*(0.78+0.3*step(0.5,fract(v_pos.y*7.0)));spec=0.05;shin=8.0;}' +
    'else if(isMat(3.0)){base=base*(0.85+0.3*vnoise(vec2(v_pos.y*90.0,(v_pos.x+v_pos.z)*3.0)));spec=0.9;shin=48.0;}' +
    'else if(isMat(4.0)){base=base*(0.96+0.08*vnoise(v_pos.xz*60.0));spec=0.45;shin=64.0;}' +
    'else if(isMat(5.0)){spec=0.25;shin=24.0;}' +
    'else if(isMat(6.0)){base=base*1.08;spec=0.9;shin=40.0;}' +
    'else if(isMat(7.0)){base=base*(0.93+0.12*vnoise(vec2(v_pos.x*50.0,v_pos.z*50.0)));spec=0.85;shin=60.0;}' +
    'else if(isMat(8.0)){if(abs(n.y)<0.5){float s=abs(n.x)>0.5?v_pos.z:v_pos.x;vec2 c=fract(vec2(s*10.0,v_pos.y*10.0))-0.5;' +
    'float bump=smoothstep(0.40,0.28,length(c));base=mix(base,vec3(0.78,0.78,0.80),bump);spec=0.5*bump+0.05;shin=30.0;}}' +
    'vec3 L=normalize(u_light);float diff=max(dot(n,L),0.0);float fill=max(dot(n,normalize(vec3(0.5,0.3,-0.6))),0.0)*0.2;' +
    'float amb=u_ambient+0.12*n.y;vec3 V=normalize(u_eye-v_pos);vec3 Hh=normalize(L+V);' +
    'float sp=pow(max(dot(n,Hh),0.0),shin)*spec;' +
    'vec3 col=base*(amb+0.75*diff+fill)+vec3(sp);' +
    'gl_FragColor=vec4(col,v_col.a);}';

  const GL_ERROR_TEXT = 'WebGL が使えません。ブラウザの設定(ハードウェアアクセラレーション)を確認するか、別のブラウザでお試しください。ダイビューは表示できません。';
  const NOTE_3D = '3D は模式図。形状・厚みは実物と異なります';
  const FPM = isNode ? require('../model/floorplan.js') : (root.SDS && root.SDS.model && root.SDS.model.floorplan);
  // 実物風フロアプランのダイがあれば、縮尺の根拠の注記(なければ null)
  const scaleNote = (d) => {
    const die = d && d.dies && d.dies.find((x) => x.layout);
    const a = die && FPM ? FPM.scaleText(die.layout) : null; const b = d && FPM ? FPM.decorNote(d.decorDies) : null;
    return a && b ? `${a}。${b}` : (a || b);
  };
  const EDIT_HINT = '編集は 2D 表示で行います(3D では選択のみ)';
  const HEAT_TEXT = 'このモードは推定できません(理由は下の注記を参照)';
  const KIND_LEGEND = { coreP: 'P/高性能コア', coreE: 'E コア', coreLP: 'LP-E コア', l3: 'L3 キャッシュ', gpu: 'GPU', uncore: 'アンコア', npu: 'NPU', other: 'その他' };
  const KIND_NAMES = { power: '電力密度', temp: '温度' };
  const LIGHT_DIR = [-0.45, 0.85, 0.5];
  const STRIDE = G.VERTEX_FLOATS * 4;

  function fmtVal(v, kind) {
    if (!isFinite(v)) return '-';
    if (kind === 'temp') return v.toFixed(1);
    return v === 0 ? '0' : String(Number(v.toPrecision(3)));
  }
  const mix = (c, t, a) => [c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a];
  const WHITE = [1, 1, 1]; const BLACK = [0, 0, 0];

  function emptyApi() {
    return {
      available: false, setDesign() {}, setSelection() {}, setViewMode() {}, setColorMode() {}, setHeatmap() {}, fit() {}, captureCanvas() { return null; }, destroy() {},
      setCameraPreset() {}, setIhsMode() {}, getIhsMode() { return 'glass'; }, setLabels() {}, getLabels() { return true; }, getNotes() { return []; },
    };
  }

  function createPackageView3D(container, handlers) {
    const H = handlers || {};
    const doc = container.ownerDocument || document;
    const win = doc.defaultView || window;

    // ---- canvas と GL コンテキスト ----
    const glCanvas = doc.createElement('canvas');
    let gl = null;
    try {
      const opt = { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: true }; // preserve: PNG 書き出し用
      gl = glCanvas.getContext('webgl2', opt) || glCanvas.getContext('webgl', opt) || glCanvas.getContext('experimental-webgl', opt);
    } catch (e) { gl = null; }
    const showError = () => {
      container.textContent = '';
      const p = doc.createElement('p');
      p.className = 'dieview-error'; p.setAttribute('role', 'alert'); p.textContent = GL_ERROR_TEXT;
      container.appendChild(p);
    };
    if (!gl) { showError(); return emptyApi(); }

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
    let colorMode = 'kind';
    let ihsMode = 'glass';
    let labelsOn = true; // ブロック名・ダイ名・寸法のラベルの表示(false で物だけが見える。注記・凡例は常に表示)
    let heat = null;
    const heatTex = new Map();
    let cam = null; let camSig = null;
    let cssW = 0; let cssH = 0; let dpr = 1;
    let dirty = true; let sceneDirty = true; let rafId = 0; let destroyed = false; let glLost = false;
    let drag = null; let hover = null; let palName = 'light';
    let scene = null;
    let prog = null; let loc = null; let bufs = null; let blankTex = null;

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
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      ['a_pos', 'a_nrm', 'a_col', 'a_mat', 'a_uv'].forEach((n, i) => gl.bindAttribLocation(prog, i, n));
      gl.linkProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      loc = {
        vp: gl.getUniformLocation(prog, 'u_vp'), eye: gl.getUniformLocation(prog, 'u_eye'), light: gl.getUniformLocation(prog, 'u_light'),
        amb: gl.getUniformLocation(prog, 'u_ambient'), tex: gl.getUniformLocation(prog, 'u_tex'),
      };
      bufs = { opaque: gl.createBuffer(), shadow: gl.createBuffer(), glass: gl.createBuffer(), quad: gl.createBuffer() };
      blankTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, blankTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      heatTex.clear(); // コンテキスト再作成時は古いテクスチャは無効
      uploadHeat();
      sceneDirty = true;
    }

    // ---- ヒートマップのテクスチャ(2D ビューと同じ作り方。NEAREST + CLAMP_TO_EDGE)----
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
      // 途中まで作った GL の資源を解放し、コンテキストも手放してからエラーを出す
      try { if (bufs) Object.keys(bufs).forEach((k) => gl.deleteBuffer(bufs[k])); } catch (e2) { /* 無視 */ }
      try { if (blankTex) gl.deleteTexture(blankTex); } catch (e2) { /* 無視 */ }
      try { if (prog) gl.deleteProgram(prog); } catch (e2) { /* 無視 */ }
      try { const ext = gl.getExtension && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e2) { /* 無視 */ }
      container.removeChild(glCanvas); container.removeChild(labelCanvas);
      showError();
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

    // ---- カメラ ----
    const aspect = () => (cssH > 0 ? cssW / cssH : 1);
    const designSig = (d) => (d.package && d.package.substrateId || '') + '#' + d.dies.concat(G.decorOf(d)).map((x) => `${x.id}:${x.x},${x.y},${x.widthMm},${x.heightMm}`).join('|');
    function currentBounds() { return G.designBounds(design); }
    function resetCamera(preset) {
      cam = G.createCamera(currentBounds(), aspect(), preset || 'oblique'); invalidate();
    }
    // 蓋「表示」でもヒートマップ中は半透明で描く(利用者の設定は変えない)
    const effIhs = () => (ihsMode === 'solid' && heatActive() ? 'glass' : ihsMode);
    function maybeAutoFit() {
      if (cssW === 0 || !design.dies.length) { if (design.dies.length) camSig = 'pending'; return; }
      const sig = designSig(design);
      if (sig !== camSig) { // 向きは保ち、距離と注視点だけ合わせ直す
        camSig = sig; const keep = cam; resetCamera('oblique');
        if (keep) cam = Object.assign({}, cam, { yaw: keep.yaw, pitch: keep.pitch });
      }
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
      if (first || camSig === 'pending') { camSig = null; maybeAutoFit(); }
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
      onScheme = () => { palName = readScheme(); sceneDirty = true; invalidate(); };
      if (mql.addEventListener) mql.addEventListener('change', onScheme); else if (mql.addListener) mql.addListener(onScheme);
    }
    const pal = () => PALETTES[palName];

    // ---- 出所による色分け(2D ビューと同じ規則)----
    const originKey = (b) => b.sourcePresetId || b.sourceChip || 'その他';
    const originOn = () => colorMode === 'origin' && !!palette && !heatActive();
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
    function originColor(b, base) {
      const k = blockColorKey(b);
      if (typeof b.areaMm2 !== 'number') return mix(base, WHITE, 0.7);
      if (k === 'coreP') return base;
      if (k === 'coreE') return mix(base, WHITE, 0.35);
      if (k === 'coreLP') return mix(base, WHITE, 0.6);
      if (k === 'l3') return mix(base, WHITE, 0.2);
      if (k === 'gpu') return mix(base, BLACK, 0.35);
      if (k === 'uncore' || k === 'npu') return mix(base, [0.5, 0.5, 0.5], 0.55);
      return mix(base, [0.5, 0.5, 0.5], 0.3);
    }
    const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

    // ---- aria ----
    function updateAria() {
      const nBlocks = design.dies.reduce((s, d) => s + d.blocks.length, 0);
      const names = [];
      design.dies.forEach((d) => d.blocks.forEach((b) => { if (selection.indexOf(b.id) >= 0) names.push(b.label || b.id); }));
      const selText = names.length === 0 ? '選択中のブロックはありません' : names.length <= 3 ? `選択中: ${names.join('、')}` : `選択中: ${names.length} 個のブロック`;
      const ihsText = ihsMode === 'solid' ? '蓋を表示' : ihsMode === 'glass' ? '蓋は半透明' : '蓋は非表示';
      const mode = heatActive() ? `${KIND_NAMES[heat.kind]}のヒートマップ。` : viewMode !== 'place' ? '' : (originOn() ? `出所で色分け(${originInfo().list.length} 種類)。` : '');
      glCanvas.setAttribute('aria-label', `パッケージの 3D 表示(模式図): ダイ ${design.dies.length} 個${G.decorOf(design).length ? `(ほかに見た目だけの飾りのダイ ${G.decorOf(design).length} 個)` : ''}、ブロック ${nBlocks} 個。${mode}${ihsText}。${selText}。矢印キーで回転、プラスとマイナスで拡大縮小、Esc で選択解除。編集は 2D 表示で行います。`);
    }

    // ---- シーン(頂点)の作り直し ----
    function rebuildScene() {
      sceneDirty = false;
      const P = pal(); const heatOn = heatActive();
      const oInfo = originOn() ? originInfo() : null;
      const colorOf = (die, b) => (oInfo ? originColor(b, oInfo.byKey.get(originKey(b)).color) : hexToRgb(P[blockColorKey(b)]));
      const dieTopColor = (die) => (die.areaKnown === false ? hexToRgb(P.unknownB) : [0.60, 0.63, 0.70]);
      scene = G.buildScene(design, {
        colorOf, dieTopColor, selection, ihsMode: effIhs(),
        heatDieIds: heatOn ? design.dies.filter((d) => heatTex.has(d.id)).map((d) => d.id) : [],
      });
      const up = (buf, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); };
      up(bufs.opaque, scene.opaque); up(bufs.shadow, scene.shadow); up(bufs.glass, scene.glass);
    }
    function bindLayout(buf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      const at = (i, n, off) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, STRIDE, off); };
      at(0, 3, 0); at(1, 3, 12); at(2, 4, 24); at(3, 1, 40); at(4, 2, 44);
    }

    // ---- 描画 ----
    function draw() {
      if (glLost || !cssW) return;
      const P = pal();
      if (sceneDirty || !scene) rebuildScene();
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      const bg = hexToRgb(P.bg);
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (design.dies.length && cam) {
        const m = G.cameraMatrices(cam, aspect());
        gl.useProgram(prog);
        gl.uniformMatrix4fv(loc.vp, false, new Float32Array(m.vp));
        gl.uniform3f(loc.eye, m.eye[0], m.eye[1], m.eye[2]);
        gl.uniform3f(loc.light, LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2]);
        gl.uniform1f(loc.amb, palName === 'dark' ? 0.42 : 0.5);
        gl.uniform1i(loc.tex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        gl.disable(gl.BLEND);
        // 1) 不透明(基板・ダイ・ブロック・コンデンサ・不透明の蓋)
        gl.bindTexture(gl.TEXTURE_2D, blankTex);
        bindLayout(bufs.opaque);
        gl.drawArrays(gl.TRIANGLES, 0, scene.opaque.length / G.VERTEX_FLOATS);
        // 2) ヒートマップのテクスチャ矩形(ダイごと)
        scene.heatQuads.forEach((q) => {
          const t = heatTex.get(q.dieId);
          if (!t) return;
          gl.bindTexture(gl.TEXTURE_2D, t.tex);
          bindLayout(bufs.quad);
          gl.bufferData(gl.ARRAY_BUFFER, q.verts, gl.DYNAMIC_DRAW);
          gl.drawArrays(gl.TRIANGLES, 0, q.verts.length / G.VERTEX_FLOATS);
        });
        gl.bindTexture(gl.TEXTURE_2D, blankTex);
        // 3) 半透明(接地面の影 → 半透明の蓋)。深度は書かない
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
        gl.disable(gl.CULL_FACE); // 影の面は上向き。カメラが下から見ることはないが念のため
        bindLayout(bufs.shadow);
        gl.drawArrays(gl.TRIANGLES, 0, scene.shadow.length / G.VERTEX_FLOATS);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        if (scene.glass.length) {
          gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
          bindLayout(bufs.glass);
          gl.drawArrays(gl.TRIANGLES, 0, scene.glass.length / G.VERTEX_FLOATS);
        }
        gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      }
      drawLabels(P);
    }

    function drawLabels(P) {
      const c = ctx2d;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const FONT = '12px sans-serif';
      c.font = FONT; c.textBaseline = 'middle';
      const heatOn = heatActive();
      const oInfo = originOn() ? originInfo() : null;
      const x = 16; const y = cssH - 16;
      if (design.dies.length && cam && scene) {
        const vp = G.cameraMatrices(cam, aspect()).vp;
        const prj = (p) => G.project(vp, p, cssW, cssH);
        const bh = scene.blockH; const dieTop = scene.dieTop;
        // 飾りのダイ(IOD・GPU・Platform タイル)のラベル(ダイの下側。CCD のブロックに重ならない)
        const showLabels = labelsOn && cam.pitch >= 0; // 下から見ているときは、上面のラベルを出さない(裏から透けて見えるため)
        if (showLabels) G.decorOf(design).forEach((d) => {
          const hh = scene.dieT * G.DECOR_H;
          const cs = [prj([d.x, hh, d.y]), prj([d.x + d.widthMm, hh, d.y]), prj([d.x, hh, d.y + d.heightMm]), prj([d.x + d.widthMm, hh, d.y + d.heightMm])];
          if (!cs.every((p) => p.visible)) return;
          const botY = Math.max.apply(null, cs.map((p) => p.y));
          const midX = (Math.min.apply(null, cs.map((p) => p.x)) + Math.max.apply(null, cs.map((p) => p.x))) / 2;
          c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.bg;
          c.font = 'bold 13px sans-serif'; c.fillStyle = P.text; c.strokeText(d.label, midX, botY + 14); c.fillText(d.label, midX, botY + 14);
          c.font = FONT; c.fillStyle = P.note; const dim = `${d.widthMm.toFixed(2)} × ${d.heightMm.toFixed(2)} mm`;
          c.strokeText(dim, midX, botY + 29); c.fillText(dim, midX, botY + 29);
        });
        (showLabels ? design.dies : []).forEach((die) => { // ラベル非表示のときは何も出さず、物だけを見せる
          // ダイ名と寸法(設計データの mm)。ダイの 4 隅を画面に投影し、画面上でいちばん上の縁のさらに上(=ダイの外側)に出して、ブロックに重ならないようにする
          const cs = [prj([die.x, dieTop, die.y]), prj([die.x + die.widthMm, dieTop, die.y]), prj([die.x, dieTop, die.y + die.heightMm]), prj([die.x + die.widthMm, dieTop, die.y + die.heightMm])];
          if (cs.every((p) => p.visible)) {
            const topY = Math.min.apply(null, cs.map((p) => p.y));
            const midX = (Math.min.apply(null, cs.map((p) => p.x)) + Math.max.apply(null, cs.map((p) => p.x))) / 2;
            c.textAlign = 'center'; c.fillStyle = P.text; c.font = 'bold 13px sans-serif';
            const nm = (die.name || die.id) + (die.areaKnown === false ? '(面積未取得・仮寸法)' : '');
            c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.bg;
            c.strokeText(nm, midX, topY - 22); c.fillText(nm, midX, topY - 22);
            c.font = FONT; c.fillStyle = P.note;
            const dim = `${die.widthMm.toFixed(2)} × ${die.heightMm.toFixed(2)} mm`;
            c.strokeText(dim, midX, topY - 8); c.fillText(dim, midX, topY - 8);
          }
          c.font = FONT;
          die.blocks.forEach((b) => {
            const text = b.label || '';
            if (!text) return;
            const sel = selection.indexOf(b.id) >= 0;
            const yy = dieTop + bh * (sel ? 2 : 1) + 0.002;
            const x0 = die.x + b.x; const z0 = die.y + b.y;
            const pts = [prj([x0, yy, z0]), prj([x0 + b.w, yy, z0]), prj([x0, yy, z0 + b.h]), prj([x0 + b.w, yy, z0 + b.h])];
            if (pts.some((p) => !p.visible)) return;
            if (effIhs() === 'solid') return; // 不透明の蓋の下のブロック名は出さない
            const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
            const bw = Math.max.apply(null, xs) - Math.min.apply(null, xs); const bhPx = Math.max.apply(null, ys) - Math.min.apply(null, ys);
            const cx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2; const cy = (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2;
            const label = oInfo ? (b.ported ? '⇄ ' : '') + text : text;
            if (bhPx < 14 || c.measureText(label).width > bw * 0.7 - 4) return;
            c.textAlign = 'center';
            const col = oInfo ? originColor(b, oInfo.byKey.get(originKey(b)).color) : hexToRgb(P[blockColorKey(b)]);
            const dk = heatOn ? true : lumOf(col) < 0.5;
            c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = dk ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
            c.strokeText(label, cx, cy);
            c.fillStyle = dk ? '#ffffff' : '#101418';
            c.fillText(label, cx, cy);
          });
        });
      }
      // 注記(模式図であること / 縮尺の根拠 / 編集は 2D で)は、画面では canvas の外(ビューの下の DOM。getNotes)に出す。PNG 書き出し(capturing)のときだけ画像に描く
      if (capturing) {
        c.font = FONT; c.textAlign = 'left'; c.fillStyle = P.note;
        let yy = y; c.fillText(NOTE_3D, x, yy);
        const sc = scaleNote(design); // 実物風フロアプランの縮尺の根拠(あれば)
        if (sc) { // 狭い画面では折り返す(下の行から上へ積む)
          const maxW = Math.max(120, cssW - 32 - 220); const ls = []; let cur2 = '';
          Array.from(sc).forEach((ch) => { if (c.measureText(cur2 + ch).width > maxW) { ls.push(cur2); cur2 = ch; } else cur2 += ch; });
          if (cur2) ls.push(cur2);
          for (let i = ls.length - 1; i >= 0; i--) { yy -= 18; c.fillText(ls[i], x, yy); }
        }
        if (heatOn && heat.note && design.dies.length) {
          const maxW = Math.max(120, cssW - 32 - 200);
          const lines = []; let cur = '';
          Array.from(String(heat.note)).forEach((ch) => { if (c.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; });
          if (cur) lines.push(cur);
          const base = yy - 18;
          for (let i = 0; i < lines.length; i++) c.fillText(lines[i], x, base - (lines.length - 1 - i) * 16);
        }
      }
      if (heatOn) drawHeatOverlay(c, P, FONT);
      else if (oInfo) drawOriginLegend(c, P, FONT, oInfo);
      if (viewMode !== 'place' && !heatOn) {
        c.fillStyle = P.overlay; c.globalAlpha = 0.72; c.fillRect(0, 0, cssW, cssH); c.globalAlpha = 1;
        c.font = 'bold 15px sans-serif'; c.textAlign = 'center';
        const w = c.measureText(HEAT_TEXT).width + 32;
        c.fillStyle = P.pill; c.fillRect(cssW / 2 - w / 2, cssH / 2 - 20, w, 40);
        c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(cssW / 2 - w / 2 + 0.5, cssH / 2 - 19.5, w - 1, 39);
        c.fillStyle = P.text; c.fillText(HEAT_TEXT, cssW / 2, cssH / 2);
      }
    }

    function drawOriginLegend(c, P, FONT, info) {
      if (!info.list.length) return;
      const MAXN = 8; const shown = info.list.slice(0, MAXN); const rest = info.list.length - shown.length;
      const lines = shown.map((e) => ({ col: e.color, text: e.name + ' (' + e.count + ')' }));
      if (rest > 0) lines.push({ col: null, text: 'ほか ' + rest + ' 件' });
      if (info.ported) lines.push({ col: null, text: '⇄ = 移植した部品' });
      if (info.noArea) lines.push({ col: null, text: '薄い色 = 面積未取得' });
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

    function drawHeatOverlay(c, P, FONT) {
      const lg = heat.legend || {};
      const unit = lg.unit || '';
      const hasRange = isFinite(lg.min) && isFinite(lg.max);
      const realVal = (v) => (lg.uniform || !hasRange ? (hasRange ? lg.min : NaN) : lg.min + v * (lg.max - lg.min));
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
      // カーソル位置のセル値(ダイ上面への光線交差)
      if (hover && cam && !capturing) {
        const hit = pickAt(hover.x, hover.y);
        if (hit) {
          const hd = heat.dies.find((d) => d.dieId === hit.dieId);
          const die = design.dies.find((d) => d.id === hit.dieId);
          if (hd && die && hd.nx >= 1 && hd.ny >= 1) {
            const ix = Math.min(hd.nx - 1, Math.floor(hit.u * hd.nx)); const iy = Math.min(hd.ny - 1, Math.floor(hit.v * hd.ny));
            const v = hd.values[iy * hd.nx + ix];
            const txt = `${die.name || die.id} (${ix}, ${iy}): ${fmtVal(realVal(v), heat.kind)} ${unit}`;
            c.font = FONT; c.textAlign = 'left';
            const tw = c.measureText(txt).width + 12;
            const tx = Math.min(hover.x + 14, cssW - tw - 4); const ty = Math.max(hover.y - 26, 4);
            c.fillStyle = P.pill; c.fillRect(tx, ty, tw, 20);
            c.strokeStyle = P.note; c.lineWidth = 1; c.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 19);
            c.fillStyle = P.text; c.fillText(txt, tx + 6, ty + 10);
          }
        }
      }
    }

    // ---- 選択(光線交差)----
    function pickAt(px, py) {
      if (!cam || !design.dies.length) return null;
      if (effIhs() === 'solid') return null; // 不透明の蓋の下は選べない
      const ray = G.screenRay(cam, aspect(), (px / cssW) * 2 - 1, 1 - (py / cssH) * 2);
      if (!ray) return null;
      return G.pickTop(ray, design.dies, { selection, decor: G.decorOf(design) });
    }
    function setSel(ids) {
      selection = ids.slice(); sceneDirty = true; updateAria(); invalidate();
      if (H.onSelect) H.onSelect(selection.slice());
    }

    // ---- 入力 ----
    function pos(e) { const r = glCanvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onPointerDown(e) {
      if (drag) return;
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      const p = pos(e);
      glCanvas.focus({ preventScroll: true });
      try { glCanvas.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      e.preventDefault();
      const pan = e.button === 1 || e.button === 2;
      // Shift+左ドラッグ = パン。ただし Shift+クリック(動かさない)は選択の追加・解除に使う
      drag = { id: e.pointerId, sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: false, pan: pan || e.shiftKey, click: e.button === 0, shift: e.shiftKey };
    }
    function onPointerMove(e) {
      const p = pos(e);
      if (heatActive()) { hover = p; invalidate(); } else if (hover) { hover = null; invalidate(); }
      if (!drag || e.pointerId !== drag.id || !cam) return;
      if (!drag.moved && Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) < 3) return;
      drag.moved = true;
      const dx = p.x - drag.lx; const dy = p.y - drag.ly; drag.lx = p.x; drag.ly = p.y;
      if (drag.pan) cam = G.pan(cam, dx, dy, cssH, currentBounds()); else cam = G.orbit(cam, dx, dy);
      glCanvas.style.cursor = drag.pan ? 'move' : 'grabbing';
      invalidate();
    }
    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      try { glCanvas.releasePointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      glCanvas.style.cursor = '';
      if (cancelled || d.moved || !d.click) return;
      const p = pos(e);
      const hit = pickAt(p.x, p.y);
      if (hit && hit.type === 'block') {
        const already = selection.indexOf(hit.blockId) >= 0;
        let next;
        if (d.shift) next = already ? selection.filter((i) => i !== hit.blockId) : selection.concat(hit.blockId);
        else next = [hit.blockId];
        if (next.join() !== selection.join()) setSel(next);
      } else if (selection.length) setSel([]);
    }
    const onPointerUp = (e) => endDrag(e, false);
    const onPointerCancel = (e) => endDrag(e, true);
    function onWheel(e) {
      e.preventDefault();
      if (!cam) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      cam = G.zoom(cam, Math.exp(dy * 0.0015)); invalidate();
    }
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { if (selection.length) setSel([]); return; }
      if (!cam) return;
      const rot = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -15], ArrowDown: [0, 15] }[e.key];
      if (rot) { e.preventDefault(); cam = G.orbit(cam, rot[0], rot[1]); invalidate(); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); cam = G.zoom(cam, 0.85); invalidate(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); cam = G.zoom(cam, 1 / 0.85); invalidate(); }
      else if (e.key === '0') { e.preventDefault(); resetCamera('oblique'); }
    }
    const onPointerLeave = () => { if (hover) { hover = null; invalidate(); } };
    function onContextLost(e) { e.preventDefault(); glLost = true; }
    function onContextRestored() { glLost = false; try { initGL(); } catch (err) { glLost = true; return; } invalidate(); }
    const onContextMenu = (e) => e.preventDefault();

    glCanvas.addEventListener('pointerdown', onPointerDown);
    glCanvas.addEventListener('pointermove', onPointerMove);
    glCanvas.addEventListener('pointerup', onPointerUp);
    glCanvas.addEventListener('pointercancel', onPointerCancel);
    glCanvas.addEventListener('pointerleave', onPointerLeave);
    glCanvas.addEventListener('wheel', onWheel, { passive: false });
    glCanvas.addEventListener('keydown', onKeyDown);
    glCanvas.addEventListener('contextmenu', onContextMenu);
    glCanvas.addEventListener('webglcontextlost', onContextLost);
    glCanvas.addEventListener('webglcontextrestored', onContextRestored);

    let capturing = false;
    resize();
    updateAria();
    invalidate();

    // ---- 公開 API(dieview と同じ入力 + 3D 用)----
    return {
      available: true,
      setDesign(d) {
        design = d && d.dies ? d : { dies: [] };
        const ids = new Set(); design.dies.forEach((x) => x.blocks.forEach((b) => ids.add(b.id)));
        selection = selection.filter((i) => ids.has(i)); // 消えたブロックの選択は外す(通知はしない)
        sceneDirty = true; maybeAutoFit(); updateAria(); invalidate();
      },
      setColorMode(m) { colorMode = m === 'origin' ? 'origin' : 'kind'; sceneDirty = true; updateAria(); invalidate(); },
      setSelection(ids) { selection = (ids || []).slice(); sceneDirty = true; updateAria(); invalidate(); },
      setViewMode(m) { viewMode = (m === 'power' || m === 'temp') ? m : 'place'; hover = null; sceneDirty = true; updateAria(); invalidate(); },
      // data: null | { kind, dies:[{dieId,nx,ny,values,cellMm}], legend:{min,max,unit,uniform,label}, note }
      setHeatmap(data) {
        heat = data && data.dies && (data.kind === 'power' || data.kind === 'temp') ? data : null;
        if (!glLost) { try { uploadHeat(); } catch (e) { heatTex.clear(); } }
        sceneDirty = true; updateAria(); invalidate();
      },
      // 全体表示: 今の向きのまま、距離と注視点だけ合わせる
      fit() {
        if (!cssW || !cam) return;
        const keep = cam; resetCamera('oblique'); cam = Object.assign({}, cam, { yaw: keep.yaw, pitch: keep.pitch }); invalidate();
      },
      // 'top'(上から)| 'oblique'(斜め)| 'side'(横から)| 'reset'(斜め + 全体表示)
      setCameraPreset(name) {
        if (!cssW) return;
        resetCamera(name === 'top' || name === 'side' || name === 'bottom' ? name : 'oblique');
      },
      setIhsMode(m) { ihsMode = G.IHS_MODES.indexOf(m) >= 0 ? m : 'glass'; sceneDirty = true; updateAria(); invalidate(); },
      setLabels(on) { labelsOn = on !== false; invalidate(); },
      // 画面の注記(ビューの下に DOM で出す文)。PNG には従来どおり captureCanvas が画像に描く
      getNotes() {
        const n = [NOTE_3D]; const sc = scaleNote(design); if (sc) n.push(sc);
        n.push(EDIT_HINT);
        if (heatActive() && heat.note && design.dies.length) n.push(String(heat.note));
        return n;
      },
      getLabels() { return labelsOn; },
      getIhsMode() { return ihsMode; },
      getCamera() { return cam ? Object.assign({}, cam) : null; }, // 読み取り専用の写し(テスト・診断用)
      // PNG 書き出し用。dieview.captureCanvas と同じ形({ canvas, mode, noData, legend })。選択・ホバー・編集案内を外して同期で再描画し、
      // GL と 2D のラベルをオフスクリーン canvas に合成して返す。失敗・描画不可なら null。
      captureCanvas(maxWidth) {
        let lost = false;
        try { lost = !!(gl.isContextLost && gl.isContextLost()); } catch (e) { lost = true; }
        if (destroyed || glLost || lost || !cssW || !design.dies.length) return null;
        const selSaved = selection; const hoverSaved = hover;
        try {
          selection = []; hover = null; capturing = true; sceneDirty = true;
          draw();
          const cv = doc.createElement('canvas');
          const lim = maxWidth > 0 ? maxWidth : 2400; const k = Math.min(1, lim / glCanvas.width);
          cv.width = Math.max(1, Math.round(glCanvas.width * k)); cv.height = Math.max(1, Math.round(glCanvas.height * k));
          const c = cv.getContext('2d');
          if (!c) return null;
          c.drawImage(glCanvas, 0, 0, cv.width, cv.height); c.drawImage(labelCanvas, 0, 0, cv.width, cv.height);
          const heatOn = heatActive();
          const noData = viewMode !== 'place' && !heatOn;
          const legend = [];
          if (!heatOn && !noData && !originOn()) {
            const seen = {};
            design.dies.forEach((d) => d.blocks.forEach((b) => { seen[blockColorKey(b)] = true; }));
            Object.keys(KIND_LEGEND).forEach((kk) => { if (seen[kk]) legend.push({ text: KIND_LEGEND[kk], color: pal()[kk] }); });
          }
          return { canvas: cv, mode: viewMode, noData, legend };
        } catch (e) { return null; } finally { selection = selSaved; hover = hoverSaved; capturing = false; sceneDirty = true; invalidate(); }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (rafId) win.cancelAnimationFrame(rafId);
        glCanvas.removeEventListener('pointerdown', onPointerDown);
        glCanvas.removeEventListener('pointermove', onPointerMove);
        glCanvas.removeEventListener('pointerup', onPointerUp);
        glCanvas.removeEventListener('pointercancel', onPointerCancel);
        glCanvas.removeEventListener('pointerleave', onPointerLeave);
        glCanvas.removeEventListener('wheel', onWheel);
        glCanvas.removeEventListener('keydown', onKeyDown);
        glCanvas.removeEventListener('contextmenu', onContextMenu);
        glCanvas.removeEventListener('webglcontextlost', onContextLost);
        glCanvas.removeEventListener('webglcontextrestored', onContextRestored);
        if (ro) ro.disconnect();
        if (onWinResize) win.removeEventListener('resize', onWinResize);
        if (mql && onScheme) { if (mql.removeEventListener) mql.removeEventListener('change', onScheme); else if (mql.removeListener) mql.removeListener(onScheme); }
        freeHeatTex();
        if (!glLost) { try { Object.keys(bufs).forEach((k) => gl.deleteBuffer(bufs[k])); gl.deleteTexture(blankTex); gl.deleteProgram(prog); } catch (e) { /* 無視 */ } }
        const ext = gl.getExtension && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        if (glCanvas.parentNode) glCanvas.parentNode.removeChild(glCanvas);
        if (labelCanvas.parentNode) labelCanvas.parentNode.removeChild(labelCanvas);
      },
    };
  }

  const api = { createPackageView3D, NOTE_3D, EDIT_HINT };
  root.SDS = root.SDS || {}; root.SDS.render = root.SDS.render || {}; root.SDS.render.createPackageView3D = createPackageView3D;
  root.SDS.render.pkgview3d = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
