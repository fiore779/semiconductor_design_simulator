// 表示言語の切り替え(日本語 / English)。画面の文言は日本語で書かれており、英語表示のときは実行時に辞書で置き換える。
// - 辞書(js/i18n/en-*.js)は { '日本語': 'English' }。日本語側に ${1}・${2} を書くと、その部分を拾って英語側の ${1}・${2} に差し込む(数値や名前の入る文)。
// - 変換の順: 全文一致 → ${n} 付きの型 → 文中の既知の断片(長い順)。辞書に無い文(データの長い備考・出典など)は日本語のまま残る。
// - DOM(文字・title・aria-label・placeholder・alt)と canvas の fillText・alert 類を訳す。元の日本語は覚えておき、日本語に戻せる。
(function (root) {
  'use strict';
  const KEY = 'sds.lang';
  const exact = new Map(); const pats = []; let fragRe = null; let fragMap = null; let dirty = false;
  let lang = 'ja';
  const listeners = [];
  const JP = /[぀-ヿ一-鿿＀-￯]/;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function add(obj) {
    Object.keys(obj).forEach((ja) => {
      const en = obj[ja];
      if (typeof en !== 'string') return;
      if (/\$\{\d+\}/.test(ja)) {
        const parts = ja.split(/(\$\{\d+\})/); let src = ''; const order = [];
        parts.forEach((p) => { const m = /^\$\{(\d+)\}$/.exec(p); if (m) { src += '([\\s\\S]+?)'; order.push(+m[1]); } else src += esc(p); });
        pats.push({ re: new RegExp('^' + src + '$'), order, en, len: ja.length });
        pats.sort((a, b) => b.len - a.len);
      } else { exact.set(ja, en); }
    });
    dirty = true; cache.clear();
  }

  const cache = new Map();
  function buildFrag() {
    const keys = [...exact.keys()].filter((k) => k.length >= 2 && JP.test(k)).sort((a, b) => b.length - a.length);
    fragMap = exact;
    fragRe = keys.length ? new RegExp(keys.map(esc).join('|'), 'g') : null;
    dirty = false;
  }
  function pat(s) {
    for (let i = 0; i < pats.length; i++) {
      const m = pats[i].re.exec(s); if (!m) continue;
      const args = {}; pats[i].order.forEach((n, k) => { args[n] = tr(m[k + 1]); });
      return pats[i].en.replace(/\$\{(\d+)\}/g, (x, n) => (args[n] != null ? args[n] : x));
    }
    return null;
  }
  // 1 つの文字列を訳す(日本語を含まなければそのまま)
  function tr(s) {
    if (typeof s !== 'string' || !s || !JP.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    let out;
    const lead = /^\s*/.exec(s)[0]; const trail = /\s*$/.exec(s)[0]; const core = s.slice(lead.length, s.length - trail.length);
    if (exact.has(core)) out = lead + exact.get(core) + trail;
    else {
      const p = pat(core);
      if (p != null) out = lead + p + trail;
      else {
        // 複数行・区切りごとに全文一致を試し、残りは断片置換
        if (dirty || !fragRe) buildFrag();
        const lines = core.split('\n').map((ln) => {
          if (!JP.test(ln)) return ln;
          const l2 = ln.trim(); if (exact.has(l2)) return exact.get(l2);
          const p2 = pat(l2); if (p2 != null) return p2;
          return fragRe ? ln.replace(fragRe, (k) => fragMap.get(k)) : ln;
        });
        out = lead + lines.join('\n') + trail;
      }
    }
    if (cache.size > 20000) cache.clear();
    cache.set(s, out); return out;
  }
  const t = (s) => (lang === 'en' ? tr(s) : s);

  // ---- DOM ----
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const textRec = typeof WeakMap !== 'undefined' ? new WeakMap() : null; // Text → { ja, en }
  const attrRec = typeof WeakMap !== 'undefined' ? new WeakMap() : null; // Element → { attr: { ja, en } }
  let observer = null;

  function doText(n) {
    const rec = textRec.get(n); const cur = n.data;
    if (rec && rec.en === cur) return; // 自分が置いた英語
    if (!JP.test(cur)) { if (rec) textRec.delete(n); return; }
    const en = tr(cur); textRec.set(n, { ja: cur, en });
    if (en !== cur) n.data = en;
  }
  function doAttrs(el) {
    let rec = attrRec.get(el);
    for (let i = 0; i < ATTRS.length; i++) {
      const a = ATTRS[i]; if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a); const r = rec && rec[a];
      if (r && r.en === cur) continue;
      if (!JP.test(cur)) { if (r) delete rec[a]; continue; }
      const en = tr(cur); if (!rec) { rec = {}; attrRec.set(el, rec); }
      rec[a] = { ja: cur, en }; if (en !== cur) el.setAttribute(a, en);
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { doText(node); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName; if (tag === 'SCRIPT' || tag === 'STYLE') return;
    doAttrs(node);
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function restore(node) {
    if (node.nodeType === 3) { const r = textRec.get(node); if (r && r.en === node.data) node.data = r.ja; textRec.delete(node); return; }
    if (node.nodeType !== 1) return;
    const rec = attrRec.get(node);
    if (rec) { Object.keys(rec).forEach((a) => { if (node.getAttribute(a) === rec[a].en) node.setAttribute(a, rec[a].ja); }); attrRec.delete(node); }
    for (let c = node.firstChild; c; c = c.nextSibling) restore(c);
  }
  function pause() { if (observer) observer.takeRecords(); }
  function onMut(list) {
    if (lang !== 'en') return;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach((n) => walk(n));
    }
    pause(); // 自分の書き換えで再び呼ばれないようにする
  }
  function startObserver() {
    if (observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    observer = new MutationObserver(onMut);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function refreshChrome() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', lang);
    const tt = document.querySelector('title');
    if (tt) { if (!tt.__ja) tt.__ja = tt.textContent; tt.textContent = lang === 'en' ? tr(tt.__ja) : tt.__ja; }
    const b = document.getElementById('m-lang');
    if (b) { b.textContent = lang === 'en' ? '日本語' : 'English'; b.setAttribute('aria-label', lang === 'en' ? '日本語に切り替え' : 'Switch to English'); b.setAttribute('title', lang === 'en' ? '表示を日本語にする (Switch to Japanese)' : 'Switch the display language to English'); }
  }

  function setLang(l, opt) {
    l = l === 'en' ? 'en' : 'ja'; const changed = l !== lang; lang = l;
    if (!(opt && opt.noSave)) { try { root.localStorage.setItem(KEY, l); } catch (e) { /* 保存できなくても動く */ } }
    if (typeof document !== 'undefined' && document.body) {
      startObserver();
      if (l === 'en') walk(document.body); else restore(document.body);
      pause();
      refreshChrome();
      if (changed) { listeners.slice().forEach((f) => { try { f(l); } catch (e) { /* 通知先の失敗は無視 */ } }); try { root.dispatchEvent(new root.Event('resize')); } catch (e) { /* 再描画の促し。無くても動く */ } }
    }
  }
  function init() {
    let saved = null; try { saved = root.localStorage.getItem(KEY); } catch (e) { saved = null; }
    const nav = (root.navigator && (root.navigator.language || '')) || '';
    const want = saved || (/^ja/i.test(nav) ? 'ja' : 'en');
    const b = document.getElementById('m-lang');
    if (b) b.addEventListener('click', () => setLang(lang === 'en' ? 'ja' : 'en'));
    startObserver(); refreshChrome();
    if (want === 'en') setLang('en', { noSave: !saved });
  }

  // ---- canvas・ダイアログ ----
  function hookCanvas() {
    const P = root.CanvasRenderingContext2D && root.CanvasRenderingContext2D.prototype; if (!P || P.__i18n) return;
    ['fillText', 'strokeText', 'measureText'].forEach((fn) => {
      const orig = P[fn]; if (typeof orig !== 'function') return;
      P[fn] = function (s) { if (lang === 'en' && typeof s === 'string') arguments[0] = tr(s); return orig.apply(this, arguments); };
    });
    P.__i18n = true;
  }
  function hookDialogs() {
    ['alert', 'confirm', 'prompt'].forEach((fn) => {
      const orig = root[fn]; if (typeof orig !== 'function') return;
      root[fn] = function (m, d) { return orig.call(root, t(String(m)), d == null ? d : t(String(d))); };
    });
  }

  root.I18N = { add, tr, t, setLang, getLang: () => lang, onChange: (f) => { listeners.push(f); }, has: (s) => exact.has(s) };
  hookCanvas(); hookDialogs();
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function' && typeof document.addEventListener === 'function') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
