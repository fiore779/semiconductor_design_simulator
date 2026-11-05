'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const preset = (id) => D.presets.find((p) => p.id === id);

test('fromPreset: ダイ面積の合計は実測面積と一致し、区分を保持する', () => {
  const d = design.fromPreset(preset('intel-arl-285k'));
  assert.strictEqual(d.dies.length, 4);
  const sum = d.dies.reduce((s, x) => s + x.widthMm * x.heightMm, 0);
  assert.ok(Math.abs(sum - (117.4 + 23.1 + 86.6 + 24.7)) < 0.01);
  assert.ok(d.dies.every((x) => x.areaSource === 'meas'));
});

test('fromPreset: 面積が未取得のダイは areaKnown:false(仮寸法)で、面積を作らない', () => {
  const d = design.fromPreset(preset('intel-mtl-185h'));
  const base = d.dies.find((x) => !x.areaKnown);
  assert.ok(base);
  assert.strictEqual(base.areaMm2, null);
  assert.strictEqual(base.areaSource, null);
});

test('fromPreset: コア数とブロックの対応(コア総数 = core ブロック数)。ブロックは模式図と明示', () => {
  const p = preset('amd-zen5-9950x');
  const d = design.fromPreset(p);
  const cores = d.dies.flatMap((x) => x.blocks).filter((b) => b.kind === 'core');
  assert.strictEqual(cores.length, p.cfg.cores.reduce((s, c) => s + c.count, 0));
  assert.ok(d.dies.flatMap((x) => x.blocks).every((b) => b.schematic === true));
});

test('fromPreset: 生成直後のブロックはダイ内に収まり重ならない(validate が空)', () => {
  ['intel-arl-285k', 'amd-zen4-7950x', 'apple-m1', 'qc-8elite', 'nv-thor'].forEach((id) => {
    const d = design.fromPreset(preset(id));
    assert.deepStrictEqual(design.validate(d), [], id);
  });
});

test('validate: はみ出しと重なりを検出する', () => {
  const d = design.fromPreset(preset('apple-m1'));
  const die = d.dies[0]; die.blocks[0].x = die.widthMm; // はみ出し
  die.blocks[2].x = die.blocks[1].x; die.blocks[2].y = die.blocks[1].y; // 重なり
  const w = design.validate(d);
  assert.ok(w.some((x) => x.level === 'error'));
  assert.ok(w.some((x) => x.level === 'warn'));
});

test('serialize / parse: 往復で同一、形式不正は理由を返す', () => {
  const d = design.fromPreset(preset('amd-zen4-7700'));
  const r = design.parse(design.serialize(d));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.design, d);
  assert.strictEqual(design.parse('{').ok, false);
  assert.match(design.parse('{"schema":99,"dies":[]}').reason, /形式/);
});

test('origin: 再現モードとプリセット ID を記録する', () => {
  const d = design.fromPreset(preset('amd-zen4-7700'));
  assert.deepStrictEqual({ mode: d.origin.mode, base: d.origin.base }, { mode: 'reproduce', base: 'amd-zen4-7700' });
});

test('parse: 不正な形式は日本語の理由で弾く', () => {
  const base = () => design.fromPreset(preset('apple-m1'));
  const bad = (mut, re) => {
    const d = base(); mut(d);
    const r = design.parse(JSON.stringify(d));
    assert.strictEqual(r.ok, false); assert.ok(re.test(r.reason), r.reason);
  };
  const r0 = design.parse(JSON.stringify({ schema: design.SCHEMA, name: 'x', dies: [{}] }));
  assert.strictEqual(r0.ok, false); assert.ok(/ダイ 1/.test(r0.reason), r0.reason);
  bad((d) => { d.dies[0].widthMm = '10'; }, /widthMm.*有限の数/);
  bad((d) => { d.dies[0].blocks[0].x = '1'; }, /x が有限の数/);
  bad((d) => { d.dies[0].blocks[0].w = 0; }, /0 より大きい/);
  bad((d) => { d.dies[0].blocks[0].label = 5; }, /名前がありません/);
  bad((d) => { d.name = 5; }, /名前がありません/);
  bad((d) => { d.dies[0].name = 5; }, /名前がありません/);
  bad((d) => { d.dies[0].blocks[1].id = d.dies[0].blocks[0].id; }, /重複/);
  bad((d) => { d.dies[0].blocks[0].id = d.dies[0].id; }, /重複/);
  bad((d) => { d.dies[0].blocks = {}; }, /blocks が配列/);
  bad((d) => { d.dies[0].blocks = Array.from({ length: 501 }, (_, i) => ({ id: 'b' + i, label: 'b', x: 0, y: 0, w: 1, h: 1 })); }, /多すぎ/);
  bad((d) => { d.dies = Array.from({ length: 17 }, (_, i) => Object.assign({}, d.dies[0], { id: 'd' + i, blocks: [] })); }, /多すぎ/);
});

test('parse: 正常な全プリセットは通る', () => {
  D.presets.forEach((p) => assert.strictEqual(design.parse(design.serialize(design.fromPreset(p))).ok, true, p.id));
});

test('parse: 面積・寸法・文字列項目の追加検証', () => {
  const base = () => design.fromPreset(preset('apple-m1'));
  const bad = (mut, re) => { const d = base(); mut(d); const r = design.parse(JSON.stringify(d)); assert.strictEqual(r.ok, false); assert.ok(re.test(r.reason), r.reason); };
  bad((d) => { d.dies[0].areaMm2 = -100; }, /areaMm2/);
  bad((d) => { d.dies[0].widthMm = 1e6; }, /大きすぎ/);
  bad((d) => { d.dies[0].blocks[0].kind = { toString: 1 }; }, /kind が文字列/);
});

// ---- M3a: 編集用パラメータ ----
const imp = (id) => design.fromPreset(preset(id), { mode: 'improve' });
const totalCores = (d) => d.cfg.cores.reduce((s, c) => s + c.count, 0);
const coreBlocks = (d) => d.dies.reduce((s, x) => s + x.blocks.filter((b) => b.kind === 'core').length, 0);

test('cfg: fromPreset は cfg と baseCfg(同内容)を持ち、モードと locks が対応する', () => {
  const a = design.fromPreset(preset('intel-arl-285k'));
  assert.strictEqual(a.origin.mode, 'reproduce'); assert.deepStrictEqual(a.locks, { params: true });
  assert.deepStrictEqual(a.cfg, a.baseCfg); assert.notStrictEqual(a.cfg, a.baseCfg);
  assert.strictEqual(a.cfg.cores[0].type, preset('intel-arl-285k').cfg.cores[0].type);
  const b = imp('intel-arl-285k');
  assert.strictEqual(b.origin.mode, 'improve'); assert.deepStrictEqual(b.locks, { params: false });
});

test('setCoreCount: 正常系。元を壊さず、ブロック数がコア総数に一致して validate が空', () => {
  const d = imp('intel-arl-285k'); const before = JSON.stringify(d);
  const t = d.cfg.cores[0].type;
  const r = design.setCoreCount(d, t, 12);
  assert.ok(r.ok); assert.strictEqual(r.relaid, true);
  assert.strictEqual(JSON.stringify(d), before);
  assert.strictEqual(r.design.cfg.cores[0].count, 12);
  assert.strictEqual(coreBlocks(r.design), totalCores(r.design));
  assert.deepStrictEqual(design.validate(r.design), []);
  assert.strictEqual(design.setCoreCount(d, t, d.cfg.cores[0].count).relaid, false);
});

test('setCoreCount: 異常系(日本語の理由)', () => {
  const d = imp('intel-arl-285k'); const t = d.cfg.cores[0].type;
  [0, 65, 2.5, NaN, '8'].forEach((c) => { const r = design.setCoreCount(d, t, c); assert.strictEqual(r.ok, false); assert.ok(r.reason.includes('コア数')); });
  const r = design.setCoreCount(d, 'ZZ', 4); assert.strictEqual(r.ok, false); assert.ok(r.reason.includes('ZZ'));
});

test('setClock: boost を更新し base は変えない。範囲外は不可', () => {
  const d = imp('amd-zen5-9950x'); const g = d.cfg.cores[0];
  const r = design.setClock(d, g.type, 5.5);
  assert.ok(r.ok); assert.strictEqual(r.relaid, false);
  assert.strictEqual(r.design.cfg.cores[0].boostGHz, 5.5); assert.strictEqual(r.design.cfg.cores[0].baseGHz, g.baseGHz);
  assert.deepStrictEqual(r.design.dies, d.dies);
  [0.4, 8.1, Infinity, NaN].forEach((x) => { const e = design.setClock(d, g.type, x); assert.strictEqual(e.ok, false); assert.ok(e.reason.includes('GHz')); });
  // boost が無く max だけのコアは max を更新
  const m = JSON.parse(JSON.stringify(d)); delete m.cfg.cores[0].boostGHz; m.cfg.cores[0].maxGHz = 4;
  assert.strictEqual(design.setClock(m, g.type, 4.5).design.cfg.cores[0].maxGHz, 4.5);
});

test('setL3: 正常系と異常系。帯の高さが変わるときだけ再配置', () => {
  const d = imp('amd-zen5-9950x');
  const r = design.setL3(d, 64);
  assert.ok(r.ok); assert.strictEqual(r.design.cfg.l3MB, 64);
  assert.deepStrictEqual(design.validate(r.design), []);
  const r0 = design.setL3(d, 0); assert.ok(r0.ok); assert.strictEqual(r0.relaid, true);
  assert.ok(!r0.design.dies.some((x) => x.blocks.some((b) => b.kind === 'l3')));
  const r2 = design.setL3(design.setL3(d, 100).design, 110); assert.strictEqual(r2.relaid, false);
  assert.ok(r2.design.dies.some((x) => x.blocks.some((b) => b.label === "L3 55MB")));
  [-1, 513, NaN, Infinity].forEach((x) => { const e = design.setL3(d, x); assert.strictEqual(e.ok, false); assert.ok(e.reason.includes('L3')); });
});

test('ロック: 再現モードでは編集できず、unlock で改良モードになる', () => {
  const a = design.fromPreset(preset('amd-zen5-9950x')); const t = a.cfg.cores[0].type;
  const msg = '再現モードではパラメータはロックされています';
  assert.deepStrictEqual(design.setCoreCount(a, t, 4), { ok: false, reason: msg });
  assert.deepStrictEqual(design.setClock(a, t, 4), { ok: false, reason: msg });
  assert.deepStrictEqual(design.setL3(a, 8), { ok: false, reason: msg });
  const b = design.unlock(a);
  assert.strictEqual(b.origin.mode, 'improve'); assert.strictEqual(b.origin.unlockedFrom, 'reproduce'); assert.strictEqual(b.locks.params, false);
  assert.strictEqual(a.origin.mode, 'reproduce');
  assert.ok(design.setCoreCount(b, t, 4).ok);
});

test('parse: cfg が往復で保たれる。壊れた cfg は拒否。cfg 無しの古い設計は読めて ensureCfg で補える', () => {
  const r = design.setClock(imp('amd-zen5-9950x'), 'P', 5.0);
  const t = design.parse(design.serialize(r.design));
  assert.ok(t.ok); assert.deepStrictEqual(t.design.cfg, r.design.cfg); assert.deepStrictEqual(t.design.baseCfg, r.design.baseCfg);
  const bad = JSON.parse(design.serialize(r.design)); bad.cfg.cores[0].count = 1.5;
  assert.strictEqual(design.parse(JSON.stringify(bad)).ok, false);
  const bad2 = JSON.parse(design.serialize(r.design)); bad2.baseCfg.l3MB = null;
  assert.strictEqual(design.parse(JSON.stringify(bad2)).ok, false);
  const old = JSON.parse(design.serialize(r.design)); delete old.cfg; delete old.baseCfg; delete old.locks;
  const p = design.parse(JSON.stringify(old)); assert.ok(p.ok);
  const fixed = design.ensureCfg(p.design, preset('amd-zen5-9950x'));
  assert.deepStrictEqual(fixed.cfg, fixed.baseCfg); assert.ok(fixed.cfg.cores.length > 0); assert.ok(fixed.locks);
});

test('parse: cfg の検証はエディタの範囲に揃っている(コア数 1〜64・クロック 0.5〜8・L3 0〜512・種別重複)', () => {
  const base = () => design.fromPreset(preset('amd-zen5-9950x'), { mode: 'improve' });
  const bad = (mut, re) => { const d = base(); mut(d); const r = design.parse(JSON.stringify(d)); assert.strictEqual(r.ok, false); assert.ok(re.test(r.reason), r.reason); };
  ['cfg', 'baseCfg'].forEach((k) => {
    bad((d) => { d[k].cores[0].count = 0; }, /1〜64/);
    bad((d) => { d[k].cores[0].count = 65; }, /1〜64/);
    bad((d) => { d[k].cores[0].boostGHz = 0.4; }, /0.5〜8/);
    bad((d) => { d[k].cores[0].boostGHz = 9; }, /0.5〜8/);
    bad((d) => { d[k].cores[0].baseGHz = 'x'; }, /baseGHz/);
    bad((d) => { d[k].l3MB = 513; }, /0〜512/);
    bad((d) => { d[k].l3MB = -1; }, /l3MB/);
    bad((d) => { d[k].cores.push(Object.assign({}, d[k].cores[0])); }, /重複/);
  });
  // コア構成が未取得のプリセット(cores 空)の設計は開ける
  const empty = base(); empty.cfg.cores = []; empty.baseCfg.cores = [];
  assert.strictEqual(design.parse(JSON.stringify(empty)).ok, true);
  // 境界値は通る
  const ok = base(); ok.cfg.cores[0].count = 64; ok.cfg.cores[0].boostGHz = 8; ok.cfg.cores[0].baseGHz = 0.5; ok.cfg.l3MB = 512; ok.baseCfg.l3MB = 0;
  assert.strictEqual(design.parse(JSON.stringify(ok)).ok, true);
  const noClock = base(); delete noClock.cfg.cores[0].boostGHz; delete noClock.cfg.cores[0].baseGHz;
  assert.strictEqual(design.parse(JSON.stringify(noClock)).ok, true); // クロック未取得は許す
});

test('parse: locks の検証(オブジェクトで params は真偽値)', () => {
  const base = () => design.fromPreset(preset('apple-m1'));
  const bad = (locks) => { const d = base(); d.locks = locks; const r = design.parse(JSON.stringify(d)); assert.strictEqual(r.ok, false); assert.ok(/locks/.test(r.reason), r.reason); };
  bad('yes'); bad([]); bad(5); bad({}); bad({ params: 'true' }); bad({ params: 1 }); bad({ params: null });
  [true, false].forEach((v) => { const d = base(); d.locks = { params: v }; assert.strictEqual(design.parse(JSON.stringify(d)).ok, true); });
  const none = JSON.parse(design.serialize(base())); delete none.locks; assert.strictEqual(design.parse(JSON.stringify(none)).ok, true); // 古い設計
});

test('ensureCfg: プリセットが無い(null)ときは cfg を補えないが、locks は補い、元を壊さない', () => {
  const d = design.fromPreset(preset('apple-m1'), { mode: 'improve' });
  delete d.cfg; delete d.baseCfg; delete d.locks; const before = JSON.stringify(d);
  const r = design.ensureCfg(d, null);
  assert.strictEqual(r.cfg, undefined); assert.strictEqual(r.baseCfg, undefined); assert.deepStrictEqual(r.locks, { params: false });
  assert.strictEqual(JSON.stringify(d), before);
  const a = design.fromPreset(preset('apple-m1')); delete a.locks;
  assert.deepStrictEqual(design.ensureCfg(a, null).locks, { params: true }); // 再現モードはロック
});

test('保存→開くの往復: 編集した設計の locks・origin・cfg・baseCfg・ブロックが保たれる', () => {
  let d = design.unlock(design.fromPreset(preset('amd-zen5-9950x')));
  d = design.setClock(design.setCoreCount(d, 'P', 24).design, 'P', 5.9).design;
  d = design.setL3(d, 96).design;
  const r = design.parse(design.serialize(d));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.design.locks, { params: false });
  assert.deepStrictEqual(r.design.origin, d.origin); assert.strictEqual(r.design.origin.unlockedFrom, 'reproduce');
  assert.deepStrictEqual(r.design.cfg, d.cfg); assert.deepStrictEqual(r.design.baseCfg, d.baseCfg);
  assert.deepStrictEqual(r.design.dies, d.dies);
  assert.deepStrictEqual(design.ensureCfg(r.design, preset('amd-zen5-9950x')), d);
  // ロック中の設計もロックのまま戻る
  const a = design.parse(design.serialize(design.fromPreset(preset('amd-zen5-9950x')))).design;
  assert.deepStrictEqual(a.locks, { params: true });
});

// ---- パッケージ設定 ----
test('fromPreset: kind ごとの既定のパッケージ', () => {
  const byKind = (kind) => D.presets.find((p) => p.kind === kind);
  const pk = design.fromPreset(byKind('pc')).package;
  assert.strictEqual(pk.coolingId, 'air-tower'); assert.strictEqual(pk.substrateId, 'organic');
  assert.strictEqual(design.fromPreset(byKind('mobile-pc')).package.coolingId, 'thin-laptop');
  assert.strictEqual(design.fromPreset(byKind('mobile')).package.coolingId, 'passive-phone');
  assert.strictEqual(design.fromPreset(byKind('embedded')).package.coolingId, 'small-fan');
});

test('電力制限の初期値: ピーク→基本→null、変更で user、空欄で null', () => {
  const pre = (id) => D.presets.find((p) => p.id === id);
  const pk = (id) => design.fromPreset(pre(id)).package;
  assert.deepStrictEqual([pk('intel-adl-12900k').powerLimitW, pk('intel-adl-12900k').powerLimitSource], [258.6, 'peak']);
  // 2026-11-05: 9700X に PPT 88W のピークを入れたため「ピーク優先」の例になった。基本のみの例は 1800X(95W、ピークなし)、どちらも無い例は Snapdragon 865(5800X は TDP 105W・PPT 142W を入れたため)
  assert.deepStrictEqual([pk('amd-zen5-9700x').powerLimitW, pk('amd-zen5-9700x').powerLimitSource], [88, 'peak']);
  assert.deepStrictEqual([pk('amd-zen1-1800x').powerLimitW, pk('amd-zen1-1800x').powerLimitSource], [95, 'base']);
  assert.deepStrictEqual([pk('qc-865').powerLimitW, pk('qc-865').powerLimitSource], [null, null]);
  const d = design.fromPreset(pre('intel-adl-12900k'));
  const a = design.setPowerLimit(d, 100).design.package; assert.deepStrictEqual([a.powerLimitW, a.powerLimitSource], [100, 'user']);
  const b = design.setPowerLimit(d, null).design.package; assert.deepStrictEqual([b.powerLimitW, b.powerLimitSource], [null, null]);
  // package が無い古い設計も同じ規則で補う。冷却の変更は電力制限を変えない
  const old = design.fromPreset(pre('amd-zen1-1800x')); delete old.package;
  assert.strictEqual(design.ensurePackage(old, pre('amd-zen1-1800x')).package.powerLimitSource, 'base');
  assert.strictEqual(design.setCooling(d, 'aio-360').design.package.powerLimitSource, 'peak');
  // 旧フィールド substrate / cooling は書かない
  assert.ok(!('substrate' in d) && !('cooling' in d));
});

test('parse: powerLimitW の欠落は null、powerLimitSource は文字列か null', () => {
  const d = design.fromPreset(D.presets[0]);
  const withPk = (pk) => design.parse(JSON.stringify(Object.assign({}, d, { package: pk })));
  const r = withPk({ coolingId: 'a', substrateId: 'organic' });
  assert.ok(r.ok); assert.strictEqual(r.design.package.powerLimitW, null);
  assert.ok(withPk({ coolingId: 'a', substrateId: 'organic', powerLimitW: 65, powerLimitSource: 'user' }).ok);
  assert.ok(withPk({ coolingId: 'a', substrateId: 'organic', powerLimitW: null, powerLimitSource: null }).ok);
  assert.strictEqual(withPk({ coolingId: 'a', substrateId: 'organic', powerLimitW: 65, powerLimitSource: 5 }).ok, false);
});

test('setCooling/setSubstrate/setPowerLimit: 正常・ロック中でも変更可・元を壊さない', () => {
  const d = design.fromPreset(D.presets[0], { mode: 'reproduce' });
  assert.ok(d.locks.params);
  const before = JSON.stringify(d);
  const a = design.setCooling(d, 'aio-360'); assert.ok(a.ok); assert.strictEqual(a.design.package.coolingId, 'aio-360');
  const b = design.setSubstrate(a.design, 'glass'); assert.ok(b.ok); assert.strictEqual(b.design.package.substrateId, 'glass');
  const c = design.setPowerLimit(b.design, 65); assert.ok(c.ok); assert.strictEqual(c.design.package.powerLimitW, 65);
  assert.strictEqual(design.setPowerLimit(c.design, null).design.package.powerLimitW, null);
  assert.strictEqual(JSON.stringify(d), before);
});

test('setCooling/setSubstrate/setPowerLimit: 不正は日本語の理由', () => {
  const d = design.fromPreset(D.presets[0]);
  for (const r of [design.setCooling(d, 'nope'), design.setSubstrate(d, 5), design.setPowerLimit(d, 0), design.setPowerLimit(d, 1001), design.setPowerLimit(d, NaN), design.setPowerLimit(d, '65')]) {
    assert.strictEqual(r.ok, false); assert.ok(/選べません|ください/.test(r.reason));
  }
});

test('ensurePackage: 無ければ補い、あれば保つ', () => {
  const p = D.presets[0];
  const d = design.fromPreset(p); delete d.package;
  const e = design.ensurePackage(d, p); assert.ok(e.package.coolingId); assert.strictEqual(d.package, undefined);
  const f = design.setCooling(e, 'aio-360').design;
  assert.strictEqual(design.ensurePackage(f, p).package.coolingId, 'aio-360');
});

test('parse: package の検証', () => {
  const d = design.fromPreset(D.presets[0]);
  assert.ok(design.parse(design.serialize(d)).ok);
  const ok = (pk) => design.parse(JSON.stringify(Object.assign({}, d, { package: pk }))).ok;
  assert.strictEqual(ok({ coolingId: 1, substrateId: 'organic', powerLimitW: null }), false);
  assert.strictEqual(ok({ coolingId: 'a', substrateId: 'organic', powerLimitW: 0 }), false);
  assert.strictEqual(ok({ coolingId: 'a', substrateId: 'organic', powerLimitW: 65 }), true);
});
