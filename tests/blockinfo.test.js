'use strict';
// ブロック詳細(js/ui/blockinfo.js。2026-11-16)の整形。DOM に依存しない純関数を Node でテストする。
// 値・区分・「未取得」・例外が出ないこと・NaN/undefined を文字列に出さないこと・評価の値を変えないこと。
const test = require('node:test');
const assert = require('node:assert');
const { D } = require('./helpers');
const design = require('../js/model/design.js');
const BL = require('../js/model/blocklib.js');
const CD = require('../js/model/coredef.js');
const CF = require('../js/ui/coreform.js');
const E = require('../js/model/evaluate.js');
require('../js/sim/heatmap.js'); // blockinfo が電力の按分に使う(ブラウザでは SDS.sim.heatmap)
const BI = require('../js/ui/blockinfo.js');

const ctx = E.makeContext();
const P = (id) => D.presets.find((p) => p.id === id);
const mk = (id, mode) => design.fromPreset(P(id), { mode: mode || 'reproduce' });
const rows = (info) => info.sections.flatMap((s) => s.rows.map((r) => Object.assign({ section: s.heading }, r)));
const find = (info, label) => rows(info).find((r) => r.label === label);
const texts = (info) => [info.title, info.subtitle].concat(info.sections.flatMap((s) => [s.heading].concat(s.rows.flatMap((r) => [r.label, r.value, r.tag, r.note])))).filter((x) => x != null);
const firstOf = (d, pred) => d.dies.flatMap((x) => x.blocks).find(pred);
const desc = (d, ev, pred) => { const b = firstOf(d, pred); assert.ok(b, '該当ブロックがない'); return BI.describe(d, ev, b.id, ctx); };
const BAD = /NaN|undefined|\[object|-Infinity|\bInfinity(?! Fabric)/; // 「Infinity Fabric」(ブロック名)は正当

test('Zen 4 の 7800X3D(V-Cache・1 CCD): コア・L3 の詳細', () => {
  const d = mk('amd-zen4-7800x3d'); const ev = E.evaluate(d, ctx);
  const c = desc(d, ev, (b) => b.kind === 'core');
  assert.ok(c.title.includes('P コア') && c.title.includes('Zen 4'));
  assert.strictEqual(find(c, 'この種別のコア数').value, 'P コア 8 基のうち 1 基');
  assert.strictEqual(find(c, 'SMT').value, '2 way(1 コア 2 スレッド)');
  assert.strictEqual(find(c, 'ブーストクロック').value, '5 GHz');
  assert.strictEqual(find(c, '発行幅(rename)').value, '6');
  assert.strictEqual(find(c, '発行幅(rename)').tag, '二次');
  assert.strictEqual(find(c, 'ROB(リオーダー窓)').value, '320 エントリ');
  assert.strictEqual(find(c, 'L2 遅延').value, '14 サイクル');
  // uarch に無い値は「未取得」(推測しない)
  const l1 = find(c, 'L1D 容量'); assert.strictEqual(l1.value, '未取得'); assert.strictEqual(l1.tag, '未取得');
  assert.strictEqual(find(c, 'ST に使われるコア').value, 'はい');
  assert.strictEqual(find(c, 'ST スコア(Geekbench 7 相当)').value, `${Math.round(ev.st.score)} 点`);
  assert.strictEqual(find(c, 'ST のクロック').value, '5 GHz');
  assert.ok(find(c, 'IPC(モデル)').value.length > 0 && find(c, 'IPC(モデル)').tag === '推定');
  assert.strictEqual(find(c, 'ST が使う L3 容量').value, '96 MB');
  const m = ev.mt.detail[0];
  assert.strictEqual(find(c, '1 コア当たりのスコア(MT 条件)').value, `${Math.round(m.perCore)} 点`);
  assert.ok(find(c, '補正の種類').value.includes('専用') && find(c, '補正の種類').tag === '校正値');
  assert.ok(/^\d+\.\d+$/.test(find(c, '補正 u の値').value));
  const ar = find(c, '1 コアの面積(L2 込み)'); assert.strictEqual(ar.value, '3.84 mm²'); assert.strictEqual(ar.tag, '二次');
  assert.ok(find(c, '按分される電力').tag === '推定' && find(c, 'チップ平均の接合部温度 Tj').tag === '推定');
  assert.strictEqual(find(c, 'ダイ面積').tag, '実測');
  const l3 = desc(d, ev, (b) => b.kind === 'l3');
  assert.strictEqual(find(l3, '容量(L3 総量)').value, '96 MB');
  assert.ok(find(l3, '内訳(V-Cache など)').value.includes('V-Cache'));
  assert.strictEqual(find(l3, 'L3 を使えるコア').value, '全コア種別');
  const la = find(l3, 'L3 全体の面積'); assert.strictEqual(la.tag, '推定'); assert.ok(la.note.includes('根拠のない仮'));
});

test('7950X3D(2 CCD・CCD 別 L3・ST の CCD 指定): CCD ごとの容量と、ST に使われるコア', () => {
  const d = mk('amd-zen4-7950x3d'); const ev = E.evaluate(d, ctx);
  const p1 = desc(d, ev, (b) => b.coreType === 'P'); const p2 = desc(d, ev, (b) => b.coreType === 'P2');
  assert.strictEqual(find(p1, 'ST に使われるコア').value, 'はい');
  assert.strictEqual(find(p2, 'ST に使われるコア').value, 'いいえ');
  assert.ok(find(p1, 'ST が使う L3 容量').value.startsWith('CCD 0 の 96 MB'));
  assert.ok(find(p2, 'L3 の分割').value.includes('CCD 1 の L3 32 MB') && find(p2, 'L3 の分割').value.includes('16 スレッド'));
  assert.ok(find(p2, 'MT で使うクロック').note.includes('allCoreGHz') && find(p2, 'MT で使うクロック').tag === '二次');
  const l3 = desc(d, ev, (b) => b.kind === 'l3');
  assert.strictEqual(find(l3, 'CCD ごとの容量').value, 'CCD 0: 96 MB / CCD 1: 32 MB');
  assert.ok(find(l3, 'MT での CCD ごとの分割').value.includes('CCD 0: 96 MB ÷ 16 スレッド'));
});

test('285H(Lion Cove (Arrow Lake-H) の uRatio・LP-E の l3Types): 補正の借り先と L3 の使い手', () => {
  const d = mk('intel-arl-285h'); const ev = E.evaluate(d, ctx);
  const p = desc(d, ev, (b) => b.coreType === 'P');
  const k = find(p, '補正の種類');
  assert.ok(k.value.includes('Lion Cove') && k.value.includes('0.92') && k.value.includes('uRatio'), k.value);
  assert.strictEqual(k.tag, '推定'); assert.ok(k.note.length > 20);
  assert.ok(find(p, '補正 u の値').tag === '校正値');
  assert.strictEqual(find(p, 'L2 容量(コアあたり)').value, '3072 KB');
  assert.strictEqual(find(p, 'L3 遅延').value, '84 サイクル');
  const lp = desc(d, ev, (b) => b.coreType === 'LP-E');
  assert.strictEqual(find(lp, 'この種別のコア数').value, 'LP-E コア 2 基のうち 1 基');
  assert.strictEqual(find(lp, 'L3 の分割').value, 'この種別は L3 につながらない');
  assert.ok(find(lp, 'L3 の分割').note.includes('P・E'));
  assert.strictEqual(find(lp, 'ST に使われるコア').value, 'いいえ');
  assert.strictEqual(find(lp, '補正の種類').tag, '推定'); // Skymont は ISA 平均で代用
  assert.strictEqual(find(lp, '1 コアの面積').value, '未取得'); // 部品表に無い
  const l3 = desc(d, ev, (b) => b.kind === 'l3');
  assert.strictEqual(find(l3, 'L3 を使えるコア').value, 'P・E のみ');
  assert.ok(find(l3, 'L3 を使えるコア').note.includes('LP-E'));
});

test('5800U(uRatio 0.89・借り先 Zen 3)・ST の補正の借り先(Apple の uFrom)', () => {
  const d = mk('amd-zen3-5800u'); const ev = E.evaluate(d, ctx);
  const c = desc(d, ev, (b) => b.kind === 'core');
  assert.ok(find(c, '補正の種類').value.includes('Zen 3 の u × 比 0.89'));
  assert.ok(find(c, '補正の種類').note.includes('5800U'));
  assert.ok(find(c, 'DRAM 遅延(ST)').value.includes('ns') && find(c, 'DRAM 遅延(ST)').tag === '推定');
  const a = mk('apple-m3'); const ea = E.evaluate(a, ctx);
  const ap = desc(a, ea, (b) => b.coreType === 'P');
  assert.ok(find(ap, '補正の種類').value.includes('Everest') && find(ap, '補正の種類').value.includes('借用'));
});

test('Apple M・Snapdragon: uarch や電力が未取得のものは「未取得」と書き、例外にならない', () => {
  const a = mk('apple-m3'); const ea = E.evaluate(a, ctx);
  const e = desc(a, ea, (b) => b.coreType === 'E'); // E コアは uarch 未指定
  assert.strictEqual(find(e, 'マイクロアーキ(uarch)').value, '未取得');
  assert.strictEqual(find(e, 'マイクロアーキの記録').value, '未取得');
  assert.ok(find(e, 'MT').note.includes('MT を計算できません'));
  assert.strictEqual(find(e, '電力・温度').tag, '未取得');
  const q = mk('qc-8gen3'); const eq = E.evaluate(q, ctx);
  const qc = desc(q, eq, (b) => b.kind === 'core');
  assert.ok(qc.sections.length >= 6);
  const npu = firstOf(a, (b) => b.kind === 'npu');
  const n = BI.describe(a, ea, npu.id, ctx);
  assert.strictEqual(find(n, '計算への影響').value, 'なし(見た目だけ)');
  assert.strictEqual(find(n, 'このブロックの面積').value, '未取得');
});

test('飾りブロック(Uncore・iGPU)と、飾りでない uncore・gpu: 計算への影響の説明', () => {
  const d = mk('amd-zen4-7800x3d'); const ev = E.evaluate(d, ctx);
  const u = desc(d, ev, (b) => b.decorative === true && b.kind === 'uncore');
  assert.ok(find(u, '計算への影響').value.includes('見た目だけ'));
  assert.strictEqual(find(u, '按分される電力').value, '0 W');
  const g = desc(d, ev, (b) => b.kind === 'gpu');
  assert.strictEqual(find(g, '計算への影響').value, 'なし(見た目だけ)');
  const h = mk('intel-arl-285h'); const eh = E.evaluate(h, ctx);
  const nd = desc(h, eh, (b) => b.kind === 'uncore' && !b.decorative);
  assert.strictEqual(find(nd, '性能への影響').value, 'なし');
  assert.ok(find(nd, '電力・面積').value.includes('按分'));
});

const parts = BL.build(D.presets, D.blocklibAreas, D.nodes);

test('混合設計(C): 由来・面積の区分・移植・確度。電力・温度は出さない', () => {
  let d = design.fromScratch({ name: '混合', widthMm: 60, heightMm: 60, nodeId: 'tsmc-n4' });
  let r = design.addPart(d, BL.get(parts, 'core:amd-zen5-9700x:P'), { count: 2 }); assert.ok(r.ok, r.reason); d = r.design;
  r = design.addPart(d, BL.get(parts, 'l3:amd-zen5-9700x'), {}); assert.ok(r.ok, r.reason); d = r.design;
  r = design.addPart(d, BL.get(parts, 'core:intel-adl-12900k:P'), {}); assert.ok(r.ok, r.reason); d = r.design; // Intel 7 → N4 の移植
  const ev = E.evaluate(d, ctx);
  const z = BI.describe(d, ev, firstOf(d, (b) => b.sourcePresetId === 'amd-zen5-9700x' && b.kind === 'core').id, ctx);
  assert.strictEqual(find(z, 'この種別のコア数').value, 'P コア 2 基のうち 1 基');
  assert.ok(find(z, '出所(部品の元のチップ)').value.includes('9700X'));
  assert.ok(find(z, '面積(部品の値)').value.includes('mm²'));
  assert.ok(['公表', '二次', '推定'].includes(find(z, '面積(部品の値)').tag));
  assert.ok(find(z, '電力・温度').note.includes('推定していません'));
  assert.ok(find(z, 'クロック(設計で指定)').value.includes('GHz'));
  const a = BI.describe(d, ev, firstOf(d, (b) => b.sourcePresetId === 'intel-adl-12900k' && b.kind === 'core').id, ctx);
  assert.ok(find(a, 'プロセス移植').value.includes('密度比で換算') && find(a, 'プロセス移植').tag === '推定');
  const l3 = BI.describe(d, ev, firstOf(d, (b) => b.kind === 'l3').id, ctx);
  assert.ok(find(l3, '容量(このブロック)').value.endsWith('MB'));
  assert.strictEqual(find(l3, '面積(部品の値)').tag, '推定');
  // ST は最も速いコアだけ
  const stRows = [z, a].map((x) => find(x, 'ST に使われるコア').value).sort();
  assert.deepStrictEqual(stRows, ['いいえ', 'はい']);
});

test('新規設計(D): 自作コアの由来・編集可能な項目・面積の範囲・確度は低', () => {
  const ci = CF.cloneInfo(BL.get(parts, 'core:amd-zen1-1800x:P'), D.uarch, D.blocklibAreas);
  assert.ok(ci.cloneable);
  const def = CF.assignId(CF.applyField(CF.applyField(ci.def, 'rob', '240').def, 'width', '7').def, []);
  let d = design.fromScratch({ name: '新規', widthMm: 40, heightMm: 40, nodeId: 'tsmc-n4', entry: 'new' });
  const r = design.addPart(d, Object.assign({}, CD.toPart(def), { sourceChip: CF.customChip(def) }), { count: 3, nodes: ctx.nodes }); assert.ok(r.ok, r.reason); d = r.design;
  const ev = E.evaluate(d, ctx);
  const c = desc(d, ev, (b) => b.coreDefId);
  assert.ok(c.title.startsWith('自作コア'));
  const sec = c.sections.find((s) => s.heading.startsWith('自作コア'));
  assert.ok(sec && sec.heading.includes('確度:低'));
  assert.strictEqual(find(c, '基準コア(複製元)').value.startsWith('Zen 1'), true);
  assert.strictEqual(find(c, 'ROB(編集可能)').value, '240');
  assert.ok(find(c, 'ROB(編集可能)').note.includes('から変更'));
  assert.strictEqual(find(c, '発行幅(編集可能)').value, '7');
  assert.ok(find(c, 'クロック(編集可能)'));
  assert.ok(find(c, '面積(部品の値)').value.includes('範囲'));
  assert.strictEqual(find(c, '面積(部品の値)').tag, '推定');
  assert.ok(find(c, '補正の種類').value.includes('自作コア') && find(c, '補正の種類').note.includes('確度:低'));
  assert.ok(find(c, '電力・温度').note.includes('推定していません'));
});

test('選択の個数: 0 件は null、複数は「N 個選択中」だけ、見つからない id は空の詳細', () => {
  const d = mk('amd-zen4-7800x3d'); const ev = E.evaluate(d, ctx);
  assert.strictEqual(BI.describeSelection(d, ev, [], ctx), null);
  assert.strictEqual(BI.describeSelection(d, ev, null, ctx), null);
  const ids = d.dies[0].blocks.slice(0, 3).map((b) => b.id);
  const m = BI.describeSelection(d, ev, ids, ctx);
  assert.strictEqual(m.title, '3 個選択中'); assert.strictEqual(m.multi, true); assert.deepStrictEqual(m.sections, []);
  const one = BI.describeSelection(d, ev, [ids[0]], ctx);
  assert.ok(one.sections.length > 3);
  const nf = BI.describe(d, ev, 'no-such-block', ctx);
  assert.deepStrictEqual(nf.sections, []);
});

test('ctx(校正)を渡さなくても動く。u の数値は出さず、その旨を書く', () => {
  const d = mk('amd-zen4-7800x3d'); const ev = E.evaluate(d, ctx);
  const info = BI.describe(d, ev, firstOf(d, (b) => b.kind === 'core').id);
  assert.strictEqual(find(info, '補正 u の値').value, '未取得');
  assert.ok(find(info, '補正 u の値').note.includes('校正結果が渡されていない'));
  assert.strictEqual(find(info, '1 コアの面積(L2 込み)').value, '3.84 mm²'); // 面積はデータから読める
});

test('全プリセット(再現・改良)の全ブロックで、例外にならず、NaN・undefined を文字列に出さない。評価の値も描画で変わらない', () => {
  let n = 0; const errs = [];
  for (const p of ctx.presets) {
    for (const mode of ['reproduce', 'improve']) {
      const d = design.fromPreset(p, { mode });
      const ev = E.evaluate(d, ctx);
      const before = JSON.stringify(ev); const dbefore = JSON.stringify(d);
      for (const die of d.dies) for (const b of die.blocks) {
        try {
          const info = BI.describe(d, ev, b.id, ctx);
          n++;
          assert.ok(info.title && info.sections.length >= 2, `${p.id} ${b.id}: セクションが少ない`);
          texts(info).forEach((t) => assert.ok(typeof t === 'string' && !BAD.test(t), `${p.id} ${b.id}: 不正な文字列 ${t}`));
          info.sections.forEach((s) => s.rows.forEach((r) => {
            assert.ok(r.label && typeof r.value === 'string' && r.value.length > 0, `${p.id} ${b.id}: 空の値 ${r.label}`);
            if (r.value === '未取得') assert.strictEqual(r.tag, '未取得', `${p.id} ${b.id} ${r.label}: 未取得にタグが無い`);
          }));
        } catch (e) { errs.push(`${p.id} ${mode} ${b.id}: ${e.message}`); }
      }
      assert.strictEqual(JSON.stringify(ev), before, `${p.id}: 評価結果が変わった`);
      assert.strictEqual(JSON.stringify(d), dbefore, `${p.id}: 設計が変わった`);
    }
  }
  assert.deepStrictEqual(errs.slice(0, 5), []);
  assert.ok(n > 3000, `ブロック数が少なすぎる ${n}`);
});
