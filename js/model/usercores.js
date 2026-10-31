// ユーザーライブラリ(自作コアの保存。設計書 §3.7.4 の「保存」)。UI に依存しない純ロジック。
// storage(localStorage 互換: getItem / setItem)は引数で渡す(Node でテストできる)。キーは 'sds.userCores'(自動保存とは別)。
// 形式 v1: { v: 1, cores: [{ id, savedAt, def }] }。def は coredef の定義で、保存・読込・取り込みのすべてで coredef.validateDef を通す。
// 失敗(不正・上限・容量超過・storage の例外)は握りつぶさず { ok:false, reason } で返す。読み込み順: coredef.js の後(実行時に引くので順序不問)。
(function (root) {
  'use strict';

  const KEY = 'sds.userCores';
  const VERSION = 1;
  const MAX_CORES = 100;          // 保存件数の上限
  const MAX_IMPORT_CHARS = 1000000; // 取り込む JSON の最大文字数(これを超えたら解析しない)
  const MAX_STORE_CHARS = 5000000;  // 保存データの読込上限
  const MAX_DEF_CHARS = 100000;   // 1 コア定義の JSON 文字数の上限
  const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
  const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
  const NO_STORAGE = 'localStorage が使えません。ブラウザへの保存はできないため、JSON 書き出しだけ使えます';

  const coredef = () => (root.SDS && root.SDS.model && root.SDS.model.coredef) || (typeof require === 'function' ? require('./coredef.js') : null);
  const fail = (reason, extra) => Object.assign({ ok: false, reason }, extra || {});
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const copy = (o) => JSON.parse(JSON.stringify(o));

  // 汚染キー(__proto__ 等)・深すぎる入れ子を含むか。JSON.parse は '__proto__' を自分のキーとして作るので Object.keys で見える
  function hasBadKey(v, depth) {
    if (depth > 12) return true;
    if (Array.isArray(v)) return v.some((x) => hasBadKey(x, depth + 1));
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) { if (BAD_KEYS.includes(k) || hasBadKey(v[k], depth + 1)) return true; }
    }
    return false;
  }

  // 1 コア定義の検証。問題があれば日本語の理由、なければ null
  function checkDef(def) {
    if (hasBadKey(def, 0)) return '使えないキー(__proto__ など)または深すぎる入れ子を含みます';
    const CD = coredef(); if (!CD) return 'コア定義の検証を使えません';
    const bad = CD.validateDef(def); if (bad) return bad;
    let s; try { s = JSON.stringify(def); } catch (e) { return 'コア定義を JSON にできません'; }
    if (s.length > MAX_DEF_CHARS) return 'コア定義が大きすぎます';
    return null;
  }

  // text → { ok:true, cores:[{id, savedAt, def}] } | { ok:false, reason }。maxChars を超える入力は解析しない
  function parseDoc(text, maxChars) {
    if (typeof text !== 'string') return fail('JSON の文字列ではありません');
    if (text.length > (maxChars || MAX_IMPORT_CHARS)) return fail(`データが大きすぎます(${text.length} 文字。上限 ${maxChars || MAX_IMPORT_CHARS})`);
    let doc; try { doc = JSON.parse(text); } catch (e) { return fail('JSON として読めません(壊れているか、別の形式のファイルです)'); }
    if (hasBadKey(doc, 0)) return fail('使えないキー(__proto__ など)または深すぎる入れ子を含むため拒否しました');
    if (!isObj(doc)) return fail('ユーザーライブラリの形式ではありません');
    if (doc.v !== VERSION) return fail(`未対応の版です(v=${String(doc.v)}。対応は v${VERSION})`);
    if (!Array.isArray(doc.cores)) return fail('cores が配列ではありません');
    if (doc.cores.length > MAX_CORES) return fail(`コアが多すぎます(${doc.cores.length} 個。上限 ${MAX_CORES})`);
    const out = [];
    for (let i = 0; i < doc.cores.length; i++) {
      const e = doc.cores[i];
      if (!isObj(e)) return fail(`${i + 1} 番目の項目の形式が違います`);
      const bad = checkDef(e.def); if (bad) return fail(`${i + 1} 番目: ${bad}`);
      const id = typeof e.id === 'string' && ID_RE.test(e.id) ? e.id : null;
      const savedAt = typeof e.savedAt === 'string' && e.savedAt.length <= 40 ? e.savedAt : '';
      out.push({ id, savedAt, def: copy(e.def) });
    }
    const seq = Number.isInteger(doc.seq) && doc.seq >= 1 && doc.seq <= 1e9 ? doc.seq : null; // 次に使う番号。無い・壊れていれば null(最大番号+1 にフォールバック)
    return { ok: true, cores: out, seq };
  }

  const numOf = (id) => { const m = /^uc(\d+)$/.exec(id); return m ? +m[1] : 0; };
  // 次に使う番号: seq と(最大番号+1)の大きい方。最大番号のコアを削除しても番号を再使用しない
  const nextSeq = (cores, seq) => Math.max(seq || 1, cores.reduce((n, e) => Math.max(n, numOf(e.id)), 0) + 1);
  const toText = (entries, seq) => JSON.stringify({ v: VERSION, seq: nextSeq(entries, seq), cores: entries.map((e) => ({ id: e.id, savedAt: e.savedAt, def: e.def })) });

  // 保存済みの一覧。{ ok:true, cores } | { ok:false, reason, unavailable?, corrupt? }。保存なし(null)は空の一覧
  function list(storage) {
    if (!storage || typeof storage.getItem !== 'function') return fail(NO_STORAGE, { unavailable: true });
    let raw;
    try { raw = storage.getItem(KEY); } catch (e) { return fail(`${NO_STORAGE}(${e && e.message ? e.message : e})`, { unavailable: true }); }
    if (raw == null) return { ok: true, cores: [], seq: 1 };
    const r = parseDoc(raw, MAX_STORE_CHARS);
    if (!r.ok) return fail(`保存済みのライブラリを読めません: ${r.reason}(ブラウザの保存データ ${KEY} を消すと復旧できます)`, { corrupt: true });
    const seen = new Set(); const cores = [];
    for (const e of r.cores) { if (!e.id || seen.has(e.id)) return fail(`保存済みのライブラリの id が不正または重複しています(ブラウザの保存データ ${KEY} を消すと復旧できます)`, { corrupt: true }); seen.add(e.id); cores.push(e); }
    return { ok: true, cores, seq: nextSeq(cores, r.seq) };
  }

  // 同名があれば「名前 (2)」「名前 (3)」…にして別のコアとして追加する(上書きしない。80 文字に収める)
  function uniqueName(name, cores) {
    const names = new Set(cores.map((e) => e.def.name));
    if (!names.has(name)) return name;
    for (let n = 2; n < 100000; n++) {
      const suf = ` (${n})`; let head = ''; // validateDef は UTF-16 の長さで 80 文字までなので、コードポイント単位で足して 80 - suf を超えない所で止める
      for (const ch of name) { if (head.length + ch.length > 80 - suf.length) break; head += ch; }
      const cand = `${head}${suf}`;
      if (!names.has(cand)) return cand;
    }
    return name;
  }

  // defs を検証してまとめて追加する(1 つでも不正なら何も保存しない)。→ { ok:true, entries:[{id,savedAt,def}], renamed:[…] } | { ok:false, reason }
  function addMany(storage, defs, opts) {
    const cur = list(storage); if (!cur.ok) return cur;
    if (!Array.isArray(defs) || !defs.length) return fail('追加するコアがありません');
    if (cur.cores.length + defs.length > MAX_CORES) return fail(`ライブラリがいっぱいです(保存済み ${cur.cores.length} 個 + 追加 ${defs.length} 個 > 上限 ${MAX_CORES})。不要なコアを削除してください`);
    const savedAt = (opts && opts.now) || new Date().toISOString();
    const all = cur.cores.slice(); const added = []; const renamed = []; let seq = cur.seq;
    for (let i = 0; i < defs.length; i++) {
      const bad = checkDef(defs[i]); if (bad) return fail(defs.length > 1 ? `${i + 1} 番目: ${bad}` : bad);
      const def = copy(defs[i]);
      const nm = uniqueName(def.name, all);
      if (nm !== def.name) { renamed.push({ from: def.name, to: nm }); def.name = nm; }
      const e = { id: `uc${seq}`, savedAt, def }; seq++;
      all.push(e); added.push(e);
    }
    try { storage.setItem(KEY, toText(all, seq)); } catch (e) { return fail(`ブラウザに保存できませんでした(容量超過または保存禁止): ${e && e.message ? e.message : e}。JSON 書き出しを使ってください`); }
    return { ok: true, entries: added, renamed };
  }
  const add = (storage, def, opts) => { const r = addMany(storage, [def], opts); return r.ok ? { ok: true, entry: r.entries[0], renamed: r.renamed } : r; };

  function remove(storage, id) {
    const cur = list(storage); if (!cur.ok) return cur;
    const rest = cur.cores.filter((e) => e.id !== id);
    if (rest.length === cur.cores.length) return fail('そのコアは保存されていません(すでに削除された可能性があります)');
    try { storage.setItem(KEY, toText(rest, cur.seq)); } catch (e) { return fail(`ブラウザに保存できませんでした: ${e && e.message ? e.message : e}`); }
    return { ok: true };
  }

  // コア単体の書き出し文字列(保存と同じ形式 v1。cores は 1 件)。不正な定義は拒否
  function exportCore(def, opts) {
    const bad = checkDef(def); if (bad) return fail(bad);
    return { ok: true, text: toText([{ id: def.id, savedAt: (opts && opts.now) || new Date().toISOString(), def }]) };
  }

  // JSON 文字列の取り込み(検証必須)。ライブラリへ新しい id で追加する。壊れた JSON・巨大入力・汚染キーは拒否
  function importText(storage, text, opts) {
    const r = parseDoc(text, MAX_IMPORT_CHARS); if (!r.ok) return r;
    if (!r.cores.length) return fail('取り込めるコアがありません');
    return addMany(storage, r.cores.map((e) => e.def), opts);
  }

  const api = { KEY, VERSION, MAX_CORES, MAX_IMPORT_CHARS, MAX_STORE_CHARS, NO_STORAGE, parseDoc, list, add, addMany, remove, exportCore, importText, uniqueName };
  root.SDS = root.SDS || {}; root.SDS.model = root.SDS.model || {}; root.SDS.model.usercores = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
