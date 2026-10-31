'use strict';
// ユーザーライブラリ(自作コアの保存。設計書 §3.7.4)。storage は注入するフェイクで試す。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { D } = require('./helpers');
require(path.join(__dirname, '..', 'data', 'blocklib.js'));
const BL = require('../js/model/blocklib.js');
const CD = require('../js/model/coredef.js');
const UC = require('../js/model/usercores.js');

const parts = BL.build(D.presets, D.blocklibAreas, D.nodes);
const mkDef = (id, name) => { const r = CD.clone(BL.get(parts, 'core:amd-zen1-1800x:P'), D.uarch, D.blocklibAreas, { id: id || 'cd1', name }); assert.ok(r.ok, r.reason); return r.def; };
const fakeStorage = (init) => { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem(k, v) { m[k] = String(v); }, removeItem(k) { delete m[k]; } }; };

test('登録・一覧・往復一致(保存形式 v1・キー sds.userCores)', () => {
  const st = fakeStorage();
  assert.strictEqual(UC.KEY, 'sds.userCores');
  assert.deepStrictEqual(UC.list(st), { ok: true, cores: [], seq: 1 });
  const def = mkDef('cd1', '試作A');
  const r = UC.add(st, def, { now: '2026-10-31T00:00:00.000Z' });
  assert.ok(r.ok, r.reason); assert.strictEqual(r.entry.id, 'uc1');
  const raw = JSON.parse(st.m['sds.userCores']);
  assert.strictEqual(raw.v, 1); assert.strictEqual(raw.cores.length, 1); assert.strictEqual(raw.cores[0].savedAt, '2026-10-31T00:00:00.000Z');
  const l = UC.list(st);
  assert.ok(l.ok); assert.deepStrictEqual(l.cores[0].def, def);   // 往復で定義が一致
  assert.strictEqual(UC.add(st, mkDef('cd2', '試作B')).entry.id, 'uc2');
  assert.strictEqual(UC.list(st).cores.length, 2);
});

test('同名は上書きせず「名前 (2)」で別 id として追加する', () => {
  const st = fakeStorage();
  UC.add(st, mkDef('cd1', 'X')); const r2 = UC.add(st, mkDef('cd1', 'X')); const r3 = UC.add(st, mkDef('cd1', 'X'));
  assert.strictEqual(r2.entry.def.name, 'X (2)'); assert.strictEqual(r3.entry.def.name, 'X (3)');
  assert.deepStrictEqual(r2.renamed, [{ from: 'X', to: 'X (2)' }]);
  const long = 'あ'.repeat(80); UC.add(st, mkDef('cd1', long));
  const r4 = UC.add(st, mkDef('cd1', long));
  assert.strictEqual(r4.entry.def.name.length, 80); assert.ok(r4.entry.def.name.endsWith(' (2)'));
  assert.strictEqual(new Set(UC.list(st).cores.map((e) => e.id)).size, 5);
});

test('削除: 存在する id は消え、無い id は理由つきで失敗。id は再利用しない', () => {
  const st = fakeStorage();
  UC.add(st, mkDef('cd1', 'A')); UC.add(st, mkDef('cd1', 'B'));
  assert.ok(UC.remove(st, 'uc1').ok);
  assert.deepStrictEqual(UC.list(st).cores.map((e) => e.def.name), ['B']);
  const r = UC.remove(st, 'uc1'); assert.ok(!r.ok && r.reason);
  assert.strictEqual(UC.add(st, mkDef('cd1', 'C')).entry.id, 'uc3');
});

test('最大番号を削除して再登録しても id を再利用しない(seq)。seq が無い・壊れた旧データは最大番号+1', () => {
  const st = fakeStorage();
  UC.add(st, mkDef('cd1', 'A')); UC.add(st, mkDef('cd1', 'B'));
  assert.ok(UC.remove(st, 'uc2').ok);
  assert.strictEqual(JSON.parse(st.m[UC.KEY]).seq, 3);
  assert.strictEqual(UC.add(st, mkDef('cd1', 'C')).entry.id, 'uc3');
  [undefined, 'x', -1, 0, 1.5, 1].forEach((bad) => {
    const s2 = fakeStorage({ [UC.KEY]: JSON.stringify({ v: 1, seq: bad, cores: [{ id: 'uc5', savedAt: 't', def: mkDef('cd1', 'Z') }] }) });
    assert.strictEqual(UC.add(s2, mkDef('cd1', 'Y')).entry.id, 'uc6', String(bad));
  });
  // 名前の切り詰めはコードポイント単位(サロゲートペアを壊さない)
  const em = '😀'.repeat(40); UC.add(st, mkDef('cd1', em));   // UTF-16 で 80 文字ちょうど
  const nm = UC.add(st, mkDef('cd1', em)).entry.def.name;
  assert.ok(nm.length <= 80 && nm.endsWith(' (2)')); assert.ok(UC.list(st).ok);   // 切り詰め後も validateDef を通る assert.ok(!/[\ud800-\udbff](?![\udc00-\udfff])/.test(nm));
});

test('件数の上限(100)を超える追加は拒否し、保存内容を変えない', () => {
  const st = fakeStorage();
  const many = []; for (let i = 0; i < UC.MAX_CORES; i++) many.push({ id: `uc${i + 1}`, savedAt: 't', def: mkDef('cd1', `n${i}`) });
  st.m[UC.KEY] = JSON.stringify({ v: 1, cores: many });
  const before = st.m[UC.KEY];
  const r = UC.add(st, mkDef('cd1', 'もう1つ'));
  assert.ok(!r.ok && /上限/.test(r.reason)); assert.strictEqual(st.m[UC.KEY], before);
  assert.ok(UC.remove(st, 'uc1').ok); assert.ok(UC.add(st, mkDef('cd1', 'もう1つ')).ok);
  const imp = UC.importText(fakeStorage(), JSON.stringify({ v: 1, cores: many.concat(many[0]) }));
  assert.ok(!imp.ok && /多すぎ/.test(imp.reason));
});

test('不正な定義は拒否(範囲外の params・uCal などオブジェクトを含む uRecord・汚染キー)', () => {
  const st = fakeStorage();
  const bad1 = mkDef('cd1', 'a'); bad1.params.width = 99;
  const bad2 = mkDef('cd1', 'b'); bad2.base.uRecord.uCal = { u: 1 };
  const bad3 = mkDef('cd1', 'c'); bad3.name = '';
  [bad1, bad2, bad3, null, 'x', []].forEach((b) => { const r = UC.add(st, b); assert.ok(!r.ok && r.reason, JSON.stringify(b)); });
  assert.strictEqual(st.m[UC.KEY], undefined);
  const bad4 = JSON.parse(JSON.stringify(mkDef('cd1', 'd'))); Object.defineProperty(bad4, 'extra', { value: JSON.parse('{"__proto__":{"x":1}}'), enumerable: true });
  assert.ok(!UC.add(st, bad4).ok);
});

test('取り込み: 壊れた JSON・巨大入力・版違い・汚染キー・不正 def を拒否し、何も保存しない', () => {
  const st = fakeStorage();
  const good = JSON.parse(UC.exportCore(mkDef('cd1', 'G')).text);
  const cases = [
    ['{', /JSON として読めません/], ['null', /形式/], ['[]', /形式/], [JSON.stringify({ v: 2, cores: [] }), /版/], [JSON.stringify({ v: 1 }), /配列/],
    [JSON.stringify({ v: 1, cores: [] }), /取り込めるコアがありません/], [JSON.stringify({ v: 1, cores: [1] }), /形式/],
    ['x'.repeat(UC.MAX_IMPORT_CHARS + 1), /大きすぎ/],
    ['{"v":1,"__proto__":{"polluted":1},"cores":[]}', /使えないキー/],
    [JSON.stringify(good).replace('"def":{', '"def":{"constructor":{"prototype":{"p":1}},'), /使えないキー/],
    [JSON.stringify(good).replace('"width":', '"__proto__":1,"width":'), /使えないキー/],
  ];
  cases.forEach(([t, re]) => { const r = UC.importText(st, t); assert.ok(!r.ok && re.test(r.reason), `${t.slice(0, 40)} → ${r.reason}`); });
  const badDef = JSON.parse(JSON.stringify(good)); badDef.cores[0].def.params.smt = 3;
  assert.ok(!UC.importText(st, JSON.stringify(badDef)).ok);
  assert.strictEqual(st.m[UC.KEY], undefined); assert.strictEqual({}.polluted, undefined);
  assert.ok(!UC.importText(st, 123).ok);
});

test('書き出し→取り込みの往復一致(新しい id で追加され、定義は同一)。不正な定義は書き出せない', () => {
  const def = mkDef('cd7', '往復');
  const ex = UC.exportCore(def); assert.ok(ex.ok);
  const doc = JSON.parse(ex.text); assert.strictEqual(doc.v, 1); assert.strictEqual(doc.cores.length, 1);
  const st = fakeStorage();
  const r = UC.importText(st, ex.text); assert.ok(r.ok, r.reason);
  assert.deepStrictEqual(UC.list(st).cores[0].def, def);
  assert.strictEqual(UC.importText(st, ex.text).entries[0].def.name, '往復 (2)');   // 同名は別 id
  const bad = mkDef('cd1', 'z'); bad.params.rob = 1;
  assert.ok(!UC.exportCore(bad).ok);
});

test('storage が使えない・例外を投げる・容量超過・保存データ破損は握りつぶさず reason を返す', () => {
  const noSt = UC.list(null); assert.ok(!noSt.ok && noSt.unavailable && /JSON 書き出しだけ/.test(noSt.reason));
  assert.ok(!UC.add(undefined, mkDef()).ok);
  const thrGet = { getItem() { throw new Error('SecurityError'); }, setItem() {} };
  const g = UC.list(thrGet); assert.ok(!g.ok && g.unavailable && /SecurityError/.test(g.reason));
  const quota = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
  const q = UC.add(quota, mkDef()); assert.ok(!q.ok && /QuotaExceededError/.test(q.reason) && /JSON 書き出し/.test(q.reason));
  assert.ok(!UC.importText(quota, UC.exportCore(mkDef()).text).ok);
  const quotaRm = fakeStorage(); UC.add(quotaRm, mkDef()); quotaRm.setItem = () => { throw new Error('Quota'); };
  assert.ok(!UC.remove(quotaRm, 'uc1').ok);
  const broken = fakeStorage({ [UC.KEY]: '{oops' });
  const b = UC.list(broken); assert.ok(!b.ok && b.corrupt);
  assert.ok(!UC.add(broken, mkDef()).ok); assert.strictEqual(broken.m[UC.KEY], '{oops');   // 壊れたデータを黙って上書きしない
  const dup = fakeStorage({ [UC.KEY]: JSON.stringify({ v: 1, cores: [{ id: 'a', def: mkDef() }, { id: 'a', def: mkDef() }] }) });
  assert.ok(UC.list(dup).corrupt);
});
