// ブロック詳細(2026-11-16。ユーザー指示「コアなどをクリックしたら詳細な情報が出るようにしてください」)の整形。DOM に依存しない純関数。Node でテストする。
// 新しい計算はしない: evaluate の結果(ST/MT の detail・clockInfo・powerModel・thermal)、uarch 記録、プリセットの cfg、部品ライブラリの面積から整形して出す。
// 例外: ブロックへの電力の按分(heatmap.blockPowers。ヒートマップと同じ仮の重み)だけ、電力モデルが出ているときに既存関数を呼ぶ。
// 無い値は「未取得」と書く(推測で埋めない)。区分は tag に短い文字で入れる: 実測・公表・二次・推定・校正値・模式図。
// describe(design, evalResult, blockId, ctx) → { title, subtitle, blockKind, sections: [{ heading, rows: [{ label, value, tag, note }] }] }
//   ctx(省略可): evaluate.makeContext() の結果({ presets, uarch, nodes, cal, mixParts })。省略時は SDS_DATA から読む(cal が無いので u の数値は出さない)。
(function (root) {
  'use strict';

  const NA = '未取得';
  const num = (x) => typeof x === 'number' && isFinite(x);
  const rd = (v, d) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  // 数値の整形。有限でなければ null(行の値が null なら「未取得」になる)
  const nf = (v, d, unit) => (num(v) ? `${rd(v, d == null ? 0 : d)}${unit ? ` ${unit}` : ''}` : null);
  const short = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > (n || 120) ? `${t.slice(0, n || 120)}…` : t; };
  const S_TAG = { meas: '実測', pub: '公表', sec: '二次', est: '推定' };
  const sTag = (s) => S_TAG[s] || null;

  const KIND_NAME = { core: 'コア', l3: 'L3 キャッシュ', gpu: 'GPU', uncore: 'SoC / I/O', npu: 'NPU' };
  const TYPE_NOTE = { P: '高性能コア', E: '高効率コア', 'LP-E': '低消費電力の高効率コア', P2: '高性能コア(2 つめの CCD)' };

  // 行を作る。値が null/空なら「未取得」(タグも未取得)
  function row(label, value, tag, note) {
    const miss = value == null || value === '';
    return { label, value: miss ? NA : String(value), tag: miss ? '未取得' : (tag || null), note: note ? String(note) : null };
  }

  // ---- しくみと歴史(2026-11-18。一般的な説明。数値は書かず、数値の根拠は下の各セクションにある) ----
  const KIND_EXPLAIN = {
    core: 'コアは、プログラムの命令を取り出して実行する CPU の中心の回路です。コアが多いほど同時に進められる処理が増え(MT)、1 つのコアが速いほど 1 つの処理が速く終わります(ST)。',
    l3: 'L3 キャッシュは、全コアで共有する大きく速い記憶領域です。メインメモリ(DRAM)よりはるかに速いので、容量が大きいほどメモリ待ちが減ります。ただし面積を使うので、容量はダイ面積とのトレードオフです。',
    gpu: '内蔵 GPU は、画面の表示と、画像などの並列計算を受け持つ回路です。このシミュレーターは GPU の性能を計算せず、図の上の見た目だけの飾りです。',
    uncore: 'Uncore(SoC・I/O)は、コア以外の周辺回路(メモリコントローラ・バス・PCIe・画面出力など)をまとめた呼び名です。コアに命令とデータを届ける通り道で、性能・電力に効きますが、このシミュレーターでは見た目だけの飾りです。',
    npu: 'NPU は、AI(ニューラルネットワーク)の計算専用の回路です。CPU や GPU より少ない電力で AI の処理を行えます。このシミュレーターでは性能を計算せず、見た目だけの飾りです。',
  };
  // 飾りの uncore ブロックのラベルに含まれる語から、もう少し具体的な説明を選ぶ(先に一致したものを使う)
  const LABEL_EXPLAIN = [
    [/L2 キャッシュ/, 'L2 キャッシュは、コア(または 2 コア)ごとの 2 段目のキャッシュです。L1 より大きく少し遅い。Core 2 以前のチップは L3 を持たず、L2 が最後のキャッシュで、ここにないデータはメインメモリまで取りに行きます。写真では規則正しい細かい格子の大きな領域として見えます。'],
    [/L2 まわり|L2 の制御/, 'L2 キャッシュの制御回路(どのデータを置くか・追い出すかの管理)などです。内訳は写真から判別できていません。'],
    [/FSB|バスインターフェース|バス・I\/O/, 'FSB(フロントサイドバス)は、CPU とチップセット(メモリコントローラを持つ別チップ)をつなぐ共有の通り道です。Core 2 以前のメモリは、ここを通ってアクセスします。全コアが共有するので、コアが増えると混み合います。Nehalem 以降はメモリコントローラが CPU に入り、FSB はなくなりました。'],
    [/メモリコントローラ|Uncore|System Agent/, 'メモリコントローラなど、コアの外側の共通の回路です。メインメモリへの読み書きや、PCIe・画面出力などの I/O を受け持ちます。'],
    [/PCIe|DMI/, 'PCIe・DMI は、グラフィックスカードやチップセットとつなぐ高速の入出力です。'],
    [/PLL|PHY|I\/O/, 'I/O・PHY・PLL は、チップの外(メモリ・ほかのチップ)と電気信号をやり取りする回路や、クロックを作る回路です。チップの外周に並ぶことが多いです。'],
    [/eDRAM/, 'eDRAM は、大容量の L4 キャッシュ(別ダイ)につなぐ回路です。'],
  ];
  const TYPE_EXPLAIN = {
    P: 'P コア(高性能コア)は、1 つの処理を速く終えることを重視した大きなコアです。幅が広く、先読みの窓(ROB)が大きく、クロックが高い。',
    E: 'E コア(高効率コア)は、面積と電力あたりの性能を重視した小さなコアです。P コア 1 つの面積に複数個置けるので、MT を効率よく伸ばせます。',
    'LP-E': 'LP-E コアは、さらに電力を絞った低消費電力のコアです。軽い作業のときに使います。',
    P2: 'P2 は 2 つめの CCD(小さなダイ)にある高性能コアです。CCD ごとに L3 を持ちます。',
  };
  function historyRows(block, info) {
    const PLm = dep('ui', 'presetlist', './presetlist.js');
    const rows = [];
    const kind = block.kind; let text = KIND_EXPLAIN[kind] || null;
    if (kind === 'core') { const multiType = !!(info.preset0 && info.preset0.cfg && Array.isArray(info.preset0.cfg.cores) && info.preset0.cfg.cores.length > 1); const te = multiType ? TYPE_EXPLAIN[block.coreType] : null; if (te) text = te + ' ' + text; } // P・E などの種類があるチップだけ、種類の説明を足す
    else { const le = LABEL_EXPLAIN.find((x) => x[0].test(String(block.label || ''))); if (le) text = le[1]; }
    if (text) rows.push(row('はたらき', text, null, '一般的な説明(出典のある数値ではありません)'));
    const p = info.preset0;
    const hi = PLm && PLm.historyOf && p ? PLm.historyOf(p.vendor, p.family) : null;
    if (hi) {
      rows.push(row(`この世代(${p.family})の歴史`, hi.text, '二次', hi.source));
      if (hi.learn) rows.push(row('この世代で学べること', hi.learn, null, hi.kw.length ? `キーワード: ${hi.kw.join('・')}(「歴史」ボタンの用語集)` : null));
    }
    return rows;
  }
  // 待ち時間のサイクル数を時間(ns)に直す: ns = サイクル ÷ GHz。DRAM の待ちは時間が固定で、クロックが高いほどサイクル数が増える
  function latencyRows(rec, g, ev, info) {
    if (!rec) return [];
    const dm = ev && ev.mt && ev.mt.ok && g ? (ev.mt.detail || []).find((x) => x.type === g.type) : null;
    const f = (dm && num(dm.fGHz) && dm.fGHz > 0 && dm.fGHz) || (ev && ev.st && ev.st.ok && num(ev.st.fGHz) && ev.st.fGHz > 0 && ev.st.fGHz) || null;
    if (!f) return [];
    const parts = []; const ns = (c) => rd(c / f, 1);
    if (num(rec.l1dLat)) parts.push(`L1D ${ns(rec.l1dLat)} ns`);
    if (num(rec.l2Lat)) parts.push(`L2 ${ns(rec.l2Lat)} ns`);
    if (num(rec.l3Lat)) parts.push(`L3 ${ns(rec.l3Lat)} ns`);
    const rows = [];
    if (parts.length) rows.push(row('待ち時間の時間換算', `${parts.join(' / ')}(${rd(f, 2)}GHz のとき)`, sTag(rec.s), 'サイクル数 ÷ クロック。クロックが高いほど、同じサイクル数でも待ち時間は短い(時間で見ると)'));
    const P = PFm(); const dram = (ev && ev.st && ev.st.dramLat && num(ev.st.dramLat.ns) && ev.st.dramLat.ns) || (P && P.DEFAULT_PARAMS && P.DEFAULT_PARAMS.dramNs) || null;
    if (dram) rows.push(row('メインメモリ(DRAM)の待ち', `約 ${rd(dram, 0)} ns = 約 ${rd(dram * f, 0)} サイクル(${rd(f, 2)}GHz のとき)`, '推定', 'モデルが使う DRAM 遅延(プラットフォームで決まる値。出典のない既定値のこともある)。キャッシュに無いデータを取りに行くと、この間コアは待つ。クロックを上げても ns は変わらず、サイクル数だけが増える'));
    void info;
    return rows;
  }

  // ---- 依存モジュール(実行時に引く。読み込み順を問わない) ----
  const S = () => root.SDS || {};
  const dep = (ns, name, file) => (S()[ns] && S()[ns][name]) || (typeof require === 'function' ? (() => { try { return require(file); } catch (e) { return null; } })() : null);
  const DSm = () => dep('model', 'design', '../model/design.js');
  const BLm = () => dep('model', 'blocklib', '../model/blocklib.js');
  const HMm = () => dep('sim', 'heatmap', '../sim/heatmap.js');
  const PFm = () => dep('sim', 'perf', '../sim/perf.js');
  const EVm = () => dep('model', 'evaluate', '../model/evaluate.js');

  const partsCache = new WeakMap();
  function partsOf(ctx) {
    if (ctx && Array.isArray(ctx.mixParts)) return ctx.mixParts;
    const D = root.SDS_DATA || {};
    const presets = (ctx && ctx.presets) || D.presets || [];
    const BL = BLm(); if (!BL) return [];
    if (partsCache.has(presets)) return partsCache.get(presets);
    let parts = [];
    try { parts = BL.build(presets, D.blocklibAreas || [], (ctx && ctx.nodes) || D.nodes || []); } catch (e) { parts = []; }
    partsCache.set(presets, parts);
    return parts;
  }

  function findBlock(design, id) {
    for (const die of (design && design.dies) || []) { const b = (die.blocks || []).find((x) => x.id === id); if (b) return { die, block: b }; }
    return null;
  }

  // ブロックの cfg 上のコア記述(グループ)。通常: design.cfg.cores の type 一致。混合: deriveCfg のグループ(出所・uarch・自作コアが一致するもの)
  function groupOf(design, block, mix) {
    if (block.kind !== 'core') return null;
    if (mix) {
      const DS = DSm(); if (!DS || !DS.deriveCfg) return null;
      let cfg; try { cfg = DS.deriveCfg(design); } catch (e) { return null; }
      return (cfg.cores || []).find((g) => g.coreType === block.coreType && (g.sourcePresetId || '') === (block.sourcePresetId || '') && (g.uarch || '') === (block.uarch || '') && (g.coreDefId || '') === (block.coreDefId || '')) || null;
    }
    const cores = (design.cfg && design.cfg.cores) || [];
    return cores.find((g) => g.type === block.coreType) || null;
  }

  // ST に使われるコア種別(perf.stScore の選び方と同じ: cfg.stCcd の CCD に載るもの、無ければ最速コア。混合は評価結果の chosen)
  function stTypeOf(design, ev, preset0, mix) {
    if (mix) return ev && ev.st && ev.st.chosen ? ev.st.chosen.type : null;
    const PF = PFm();
    const cores = ((design.cfg && design.cfg.cores) || []).map((g) => {
      if (g.ccd != null || !preset0 || !preset0.cfg || !Array.isArray(preset0.cfg.cores)) return g;
      const b = preset0.cfg.cores.find((x) => x.type === g.type);
      return b && b.ccd != null ? Object.assign({}, g, { ccd: b.ccd }) : g;
    });
    const stCcd = preset0 && preset0.cfg ? preset0.cfg.stCcd : null;
    if (Number.isInteger(stCcd)) { const g = cores.find((c) => c.ccd === stCcd); if (g) return g.type; }
    const t = PF && PF.topCore ? PF.topCore(cores) : null;
    return t ? t.type : null;
  }

  const clockText = { given: '電力モデルで決めた持続クロック', allcore: '全コア負荷時の実測クロック(allCoreGHz)', boost: 'ブースト(最大)クロック × 係数', max: '最大クロック × 係数', base: 'ベースクロック(ブースト未取得)' };
  const corrKind = { uarch: 'この uarch 専用の補正 u(校正済み)', ratio: '別の uarch の u に比を掛けた値', isa: '命令セット(ISA)の平均 u で代用(専用の補正なし)', clone: '自作コア: 基準コアの補正を借用' };

  // ---- 各セクション ----
  function dieAreaRow(die) {
    const known = num(die.areaMm2);
    return row('ダイ面積', known ? nf(die.areaMm2, 1, 'mm²') : null, known ? sTag(die.areaSource) : null, known ? null : short([die.areaNote || 'このダイの面積は未取得(推測しない)', die.sizeNote].filter(Boolean).join('。'), 200));
  }

  function basicRows(design, ev, ctxInfo) {
    const { die, block, g, mix, preset0 } = ctxInfo;
    const rows = [];
    if (block.kind === 'core') {
      const typeNote = TYPE_NOTE[block.coreType];
      rows.push(row('種別', block.coreType || null, null, typeNote || null));
      rows.push(row('マイクロアーキ(uarch)', block.uarch || (g && g.uarch) || null));
      if (g) {
        const tname = g.coreType || block.coreType || g.type;
        rows.push(row('この種別のコア数', `${tname} コア ${g.count} 基のうち 1 基`, null, '同じ種別のブロックは同じ値(性能・クロックは種別ごとに決まる)'));
        rows.push(row('SMT', (g.smt || 1) === 2 ? '2 way(1 コア 2 スレッド)' : 'なし(1 コア 1 スレッド)'));
      } else rows.push(row('この種別のコア数', null, null, 'cfg にこの種別の記述がありません'));
    } else {
      rows.push(row('種別', KIND_NAME[block.kind] || block.kind || null));
    }
    rows.push(row('ダイ', die.name || die.id || null));
    rows.push(dieAreaRow(die));
    if (block.schematic) rows.push(row('位置・大きさ', `${nf(block.w, 2, 'mm')} × ${nf(block.h, 2, 'mm')}`, '模式図', 'ブロックの大きさと位置は実チップのフロアプランではありません(面積の値とは別)'));
    if (mix && block.sourceChip) rows.push(row('出所(部品の元のチップ)', block.sourceChip));
    void ev; void preset0;
    return rows;
  }

  function clockRows(g, ctxInfo, ev) {
    const { mix } = ctxInfo;
    const rows = [];
    if (!g) return [row('クロック', null)];
    if (mix) {
      rows.push(row('クロック(設計で指定)', nf(g.boostGHz, 2, 'GHz'), null, '混合設計では部品の既定クロック(基準チップのブースト)。部品ごとに編集できる'));
    } else {
      rows.push(row('ベースクロック', nf(g.baseGHz, 2, 'GHz'), null, 'プリセットの値(出典はプリセットの notes)'));
      rows.push(row('ブーストクロック', nf(g.boostGHz != null ? g.boostGHz : g.maxGHz, 2, 'GHz')));
      if (num(g.allCoreGHz)) rows.push(row('全コア負荷時のクロック(allCoreGHz)', nf(g.allCoreGHz, 3, 'GHz'), '二次', '出典と区分はプリセットの notes'));
    }
    const d = ev && ev.mt && ev.mt.ok ? (ev.mt.detail || []).find((x) => x.type === g.type) : null;
    if (d) {
      const f = nf(d.fGHz, 2, 'GHz');
      const factor = num(d.clockFactor) && d.clockFactor !== 1 ? `係数 ${rd(d.clockFactor, 3)}` : '';
      const src = (clockText[d.clockSource] || d.clockSource || '出所不明') + (d.clockCap ? '(最速コアのクロックを上限にした値)' : '');
      const tag = d.clockSource === 'allcore' ? '二次' : (d.clockSource === 'boost' || d.clockSource === 'max') && d.clockFactor !== 1 ? '推定' : null;
      rows.push(row('MT で使うクロック', f, tag, `${src}${factor ? `、${factor}` : ''}`));
    } else rows.push(row('MT で使うクロック', null, null, ev && ev.mt && !ev.mt.ok ? `MT を計算できません: ${ev.mt.reason}` : null));
    return rows;
  }

  function microRows(rec, g, ev, info) {
    if (!rec) return [row('マイクロアーキの記録', null, null, 'uarch の記録がありません')];
    const t = sTag(rec.s);
    const rows = [];
    const add = (label, v, unit, note) => rows.push(row(label, nf(v, 0, unit), t, note));
    // 2026-11-18: 各項目の意味(一般的な説明)を note に付けた
    add('発行幅(rename)', rec.width, '', '1 クロックに処理を始められる命令数の上限。大きいほど IPC の上限が高い');
    add('デコード幅', rec.decodeWidth, '', '1 クロックに読み解ける命令数。発行幅と同じくらいないと、前段が詰まる');
    add('ROB(リオーダー窓)', rec.rob, 'エントリ', '先読みして、順序を入れ替えながら実行できる命令の窓。大きいほど、メモリ待ちの間にも別の命令を進められる');
    add('L1D 容量', rec.l1dKB, 'KB', '最も速く最も小さい 1 段目のデータキャッシュ');
    add('L1D 遅延', rec.l1dLat, 'サイクル', 'L1D にあるデータが届くまでのクロック数。小さいほど速い');
    add('L2 容量(コアあたり)', rec.l2KB, 'KB', rec.l2KB == null ? null : '共有 L2 は共有コア数で割った値。2 段目のキャッシュで、L1D より大きく遅い');
    add('L2 遅延', rec.l2Lat, 'サイクル', 'L2 にあるデータが届くまでのクロック数');
    add('L3 遅延', rec.l3Lat, 'サイクル', '共有 L3 の待ち時間。L2 より長い。L3 の無いチップ(Core 2 以前など)では空欄');
    add('MSHR(同時ミス処理数)', rec.mshr, '', 'キャッシュに無かったデータの取得を、同時にいくつまで追いかけられるか。多いほど、メモリ待ちを重ね合わせて隠せる');
    add('分岐ミスペナルティ', rec.brPenalty, 'サイクル', 'if 文の分かれ道の予想が外れたとき、やり直しに失われるクロック数。パイプラインが長いほど大きい');
    add('ベクトル幅', rec.vecBits, 'bit', '1 命令で同時に処理できるデータの幅(SIMD。SSE・AVX など)。広いほど画像や科学計算で速い');
    if (rec.inOrder) rows.push(row('実行方式', 'in-order(順序実行)', null, 'ST の IPC は根拠のない仮の値(0.8)'));
    latencyRows(rec, g, ev, info).forEach((r) => rows.push(r));
    return rows;
  }

  // 補正 u の種類と値。d: MT の detail の 1 件(無ければ ST の結果)。cal は評価時の校正(ctx.cal。無ければ数値は出さない)
  function correctionRows(rec, g, d, ctx, isa) {
    const rows = [];
    if (!d) return [row('補正の種類', null, null, 'このコアは MT・ST の計算に使われていない(uarch 未取得などで計算できない)ため、補正は決まっていません')];
    const cs = d.corrSource;
    const cal = ctx && ctx.cal;
    // ST の結果は uFrom の借り先を持たないので、その uarch に専用の u が無く借り先にあるとき(perf.stScore と同じ条件)は借り先を補う
    const from = d.corrUFrom || (cs === 'uarch' && cal && cal.u && g && cal.u[g.uarch] == null && rec && rec.uFrom && cal.u[rec.uFrom] != null ? rec.uFrom : null);
    let kindText = corrKind[cs] || null;
    if (cs === 'uarch' && from) kindText = `同じコア設計の ${from} の u を借用(uFrom)`;
    if (cs === 'ratio') kindText = `${d.corrUFrom || '別の uarch'} の u × 比 ${rec && num(rec.uRatio) ? rec.uRatio : '(未取得)'}(uRatio)`;
    if (cs === 'clone') kindText = `自作コア: 基準コア(${(g && g.uRecord && d.corrFrom) ? `補正の借り先は ${d.corrFrom}` : '基準 uarch'})の補正を借用`;
    const ktag = cs === 'uarch' && !from ? '校正値' : '推定';
    let note = null;
    if (cs === 'ratio') { const EV = EVm(); note = EV && EV.ratioInfo ? short(EV.ratioInfo(d.corrUFrom, d.corrUarch), 200) : '比は別の SKU の測定から合わせた校正値(推定)'; }
    else if (cs === 'isa') note = '確度は低(専用の補正が無いため、同じ命令セットの平均で代用)';
    else if (cs === 'clone') note = '基準コアの補正を借りた推定(確度:低)。幅・ROB・L2 の変更の効果は検証できていない';
    rows.push(row('補正の種類', kindText, ktag, note));
    // u の数値(校正結果から読むだけ。新規に計算しない)
    let u = null;
    if (cal && cal.u) {
      if (cs === 'isa') u = cal.uIsa ? cal.uIsa[isa] : null;
      else if (cs === 'ratio') u = num(cal.u[d.corrUFrom]) && rec && num(rec.uRatio) ? cal.u[d.corrUFrom] * rec.uRatio : null;
      else if (cs === 'uarch') u = from ? cal.u[from] : (g ? cal.u[g.uarch] : null);
    }
    rows.push(row('補正 u の値', nf(u, 3, ''), num(u) ? '校正値' : null, num(u) ? 'ST スコア = u × IPC × クロック。u はモデルの絶対値を実測に合わせる係数' : (cal ? '数値を取得できません' : '校正結果が渡されていないため数値は出しません')));
    if (rec && rec.uCal && num(rec.uCal.u)) rows.push(row('校正済み定数 uCal', `${rd(rec.uCal.u, 3)}(${num(rec.uCal.n) ? `${rec.uCal.n} 件の中央値` : '件数不明'}${rec.uCal.date ? `、${rec.uCal.date}` : ''})`, '校正値', rec.uCal.basis ? short(rec.uCal.basis, 140) : null));
    if (rec && rec.uRatioOf && cs !== 'ratio') rows.push(row('uRatio の借り先', `${rec.uRatioOf} × ${num(rec.uRatio) ? rec.uRatio : NA}`, '推定'));
    if (rec && rec.uFrom && !from && cs === 'uarch') rows.push(row('uFrom(借り先の候補)', rec.uFrom, null, 'この uarch に専用の補正があるためそちらを使用'));
    return rows;
  }

  function stRows(design, ev, ctxInfo) {
    const { g, mix, preset0 } = ctxInfo;
    const st = ev && ev.st;
    if (!st) return [row('ST への寄与', null, null, '評価結果がありません')];
    if (!st.ok) return [row('ST', null, null, `ST を計算できません: ${st.reason || '理由不明'}`)];
    const stType = stTypeOf(design, ev, preset0, mix);
    const isSt = !!g && stType != null && g.type === stType;
    if (!isSt) return [row('ST に使われるコア', 'いいえ', null, `ST は種別 ${stType == null ? '(不明)' : stType} のコアで計算します(このコアは ST には使われない)`)];
    const rows = [row('ST に使われるコア', 'はい', null, 'ST スコアはこの種別のコア 1 基(1 スレッド)で計算')];
    rows.push(row('ST スコア(Geekbench 7 相当)', nf(st.score, 0, '点'), '推定', '性能モデルの予測値(公開値との比較は結果パネル)'));
    rows.push(row('ST のクロック', nf(st.fGHz, 2, 'GHz')));
    const p = st.parts;
    if (p && num(p.base) && num(p.br) && num(p.mem)) {
      const cpi = p.base + p.br + p.mem;
      rows.push(row('IPC(モデル)', nf(1 / cpi, 2, ''), '推定', `CPI ${rd(cpi, 3)} = 基本 ${rd(p.base, 3)} + 分岐 ${rd(p.br, 3)} + メモリ ${rd(p.mem, 3)}`));
    } else rows.push(row('IPC(モデル)', null));
    // ST が使う L3
    let l3 = null; let l3note = null;
    if (st.noL3) l3 = 'なし(L3 につながらない・L3 なし)';
    else if (num(st.l3CcdMB)) { l3 = `CCD ${st.ccd} の ${nf(st.l3CcdMB, 0, 'MB')}`; l3note = 'ST はその CCD の L3 を 1 スレッドで使う'; }
    else if (num(design.cfg && design.cfg.l3MB) && design.cfg.l3MB > 0) {
      const cc = st.l3Ccds > 1 ? st.l3Ccds : 1;
      l3 = `${nf(design.cfg.l3MB / cc, 1, 'MB')}${cc > 1 ? `(総量 ${design.cfg.l3MB} MB を ${cc} CCD で割った 1 CCD 分)` : ''}`;
      l3note = 'ST は L3 を 1 スレッドで使う想定';
    }
    rows.push(row('ST が使う L3 容量', l3, null, l3note));
    if (st.fallback) rows.push(row('注意', 'in-order コアの IPC は仮の値', '推定'));
    rows.push(row('確度', st.confidence === 'high' ? '高' : st.confidence === 'medium' ? '中' : st.confidence === 'low' ? '低' : null));
    if (st.dramLat && num(st.dramLat.ns)) { const EV = EVm(); rows.push(row('DRAM 遅延(ST)', `${st.dramLat.ns} ns`, sTag(st.dramLat.s === '推定' ? 'est' : st.dramLat.s === '実測' ? 'meas' : st.dramLat.s === '二次' ? 'sec' : null), EV && EV.dramLatInfo ? short(EV.dramLatInfo(st.dramLat), 160) : null)); }
    return rows;
  }

  function mtRows(design, ev, ctxInfo) {
    const { g } = ctxInfo;
    const mt = ev && ev.mt;
    if (!mt) return [row('MT への寄与', null, null, '評価結果がありません')];
    if (!mt.ok) return [row('MT', null, null, `MT を計算できません: ${mt.reason || '理由不明'}`)];
    const d = g ? (mt.detail || []).find((x) => x.type === g.type) : null;
    if (!d) return [row('MT への寄与', null, null, 'この種別は MT の内訳にありません')];
    const rows = [];
    rows.push(row('1 コア当たりのスコア(MT 条件)', nf(d.perCore, 0, '点'), '推定', 'MT のクロックと L3 の分割(スレッド数で割った容量)で計算した、1 コアの ST 相当'));
    rows.push(row('この種別の台数', `${d.count} 基${(g && g.smt === 2) ? '(SMT 2 way)' : ''}`));
    rows.push(row('MT スコア(全体)', nf(mt.score, 0, '点'), '推定', `総スレッド ${num(mt.threads) ? mt.threads : NA}(並列効率 σ・SMT の効果は校正が弱く確度は低)`));
    // L3 の分割
    const l3Types = ctxInfo.l3Types;
    let l3 = null; let l3note = null;
    if (d.noL3) { l3 = 'この種別は L3 につながらない'; l3note = l3Types ? `l3Types(${l3Types.join('・')})に含まれない種別` : null; }
    else if (num(d.l3CcdMB)) {
      const per = (mt.l3PerCcd || []).find((x) => x.ccd === d.ccd);
      l3 = `CCD ${d.ccd} の L3 ${nf(d.l3CcdMB, 0, 'MB')}${per && num(per.threads) ? ` を、その CCD の ${per.threads} スレッドで分け合う` : ''}`;
      l3note = 'CCD ごとの L3(cfg.l3CcdMB)で計算';
    } else if (num(design.cfg && design.cfg.l3MB) && design.cfg.l3MB > 0) {
      l3 = `L3 総量 ${design.cfg.l3MB} MB を${l3Types ? `、L3 につながる種別(${l3Types.join('・')})の` : '、全'}スレッドで分け合う`;
      if (mt.l3Ccds > 1) l3note = `チップレット(${mt.l3Ccds} CCD): 各 CCD の L3 を自分の CCD のスレッドで使うのと同じ値`;
    } else l3 = 'L3 なし';
    rows.push(row('L3 の分割', l3, null, l3note));
    if (mt.fallback) rows.push(row('注意', 'in-order コアの仮の IPC を含む', '推定'));
    return rows;
  }

  // 面積(部品ライブラリの表・ブロックの値から。コア 1 基の面積は表に無ければ未取得)
  function areaCls(origin, partS) {
    if (origin === 'table') return partS === 'pub' ? '公表' : partS === 'sec' ? '二次' : '二次';
    if (origin === 'estimated' || origin === 'derived') return '推定';
    return null;
  }
  const ORIGIN_NOTE = { table: '表(出典あり)', estimated: '推定(根拠は note)', derived: '導出(範囲。ロジックの上限は仮定)', unknown: '未取得' };
  function areaRows(design, ctxInfo, ctx) {
    const { block, mix, preset0 } = ctxInfo;
    const rows = [];
    const parts = partsOf(ctx);
    if (mix || block.areaOrigin != null || (block.areaMm2 != null && design.presetId == null)) {
      const origin = num(block.areaMm2) ? (block.areaOrigin || 'unknown') : 'unknown';
      const part = block.partId ? parts.find((p) => p.id === block.partId) : null;
      const range = Array.isArray(block.areaRangeMm2) && num(block.areaRangeMm2[0]) && num(block.areaRangeMm2[1]) ? block.areaRangeMm2 : null;
      const val = num(block.areaMm2) ? `${nf(block.areaMm2, 2, 'mm²')}${range ? `(範囲 ${rd(range[0], 2)}〜${rd(range[1], 2)} mm²。大きい側を配置に使用)` : ''}` : null;
      const nt = [ORIGIN_NOTE[origin] || ORIGIN_NOTE.unknown];
      if (block.portConverted && block.portNote) nt.push(`移植: ${short(block.portNote, 110)}`);
      else if (part && part.area && part.area.note && origin !== 'unknown') nt.push(short(part.area.note, 110));
      rows.push(row('面積(部品の値)', val, areaCls(origin, part && part.area ? part.area.s : null), nt.join(' / ')));
      if (block.ported) rows.push(row('プロセス移植', block.portConverted ? `密度比で換算(元 ${nf(block.areaFromMm2, 2, 'mm²')}、比 ${nf(block.portRatio, 3, '')})` : '換算できていない(元の値のまま)', '推定'));
      rows.push(row('ブロックの大きさ', '模式図', '模式図', 'ブロックの大きさを変えても面積は変わりません'));
      return rows;
    }
    // プリセット由来: コアは 1 基分(部品表の uarch × プロセス)、L3 は総量(ダイ面積 × 仮の比率)
    const pid = design.presetId || (preset0 && preset0.id);
    if (block.kind === 'core') {
      const part = parts.find((p) => p.id === `core:${pid}:${block.coreType}`);
      const a = part && part.area;
      if (a && (num(a.withL2Mm2) || num(a.mm2))) {
        const withL2 = num(a.withL2Mm2) ? a.withL2Mm2 : a.mm2;
        rows.push(row('1 コアの面積(L2 込み)', nf(withL2, 2, 'mm²'), areaCls(a.origin, a.s), short(a.note, 130)));
        if (num(a.withL2Mm2) && num(a.mm2)) rows.push(row('1 コアの面積(L2 なし)', nf(a.mm2, 2, 'mm²'), areaCls(a.origin, a.s)));
      } else rows.push(row('1 コアの面積', null, null, a ? short(a.note, 130) : '部品表にこのコアの記述がありません'));
      rows.push(row('面積の使われ方', '表示のみ', null, '面積は部品表の値。編集しても再計算せず、ブロックの大きさ(模式図)とも連動しない'));
    } else if (block.kind === 'l3') {
      const part = parts.find((p) => p.id === `l3:${pid}`);
      const a = part && part.area;
      rows.push(row('L3 全体の面積', a && num(a.mm2) ? nf(a.mm2, 2, 'mm²') : null, a && num(a.mm2) ? areaCls(a.origin, a.s) : null, a ? short(a.note, 130) : 'ダイ面積が未取得のため推定できません'));
    } else {
      rows.push(row('このブロックの面積', null, null, 'ブロック単位の面積は未取得(上の「ダイ面積」は、このブロックが載るダイ全体)'));
    }
    return rows;
  }

  // 電力・温度(推定)。電力モデルが出ている設計だけ
  function powerRows(design, ev, ctxInfo) {
    const { block } = ctxInfo;
    const pm = ev && ev.powerModel;
    if (!pm || !pm.ok || !num(pm.estW)) return [row('電力・温度', null, null, `この設計では推定していません${pm && pm.reason ? `(${short(pm.reason, 80)})` : ''}`)];
    const rows = [];
    const HM = HMm();
    let w = null; let skipReason = null;
    if (block.decorative === true) { skipReason = '飾りブロックは電力を受け持たない(見た目だけ)'; w = 0; }
    else if (HM && HM.blockPowers) {
      try { const bp = HM.blockPowers(design, pm.estW); if (bp.ok && num(bp.byBlock[block.id])) w = bp.byBlock[block.id]; } catch (e) { w = null; }
    }
    rows.push(row('按分される電力', nf(w, 2, 'W'), '推定', skipReason || `全体 ${nf(pm.estW, 0, 'W')}(全コア負荷・最大クロック・電力制限なし)を、ヒートマップと同じ仮の重みで分けた値。確度:低`));
    const area = num(block.w) && num(block.h) ? block.w * block.h : null;
    if (num(w) && area > 0) rows.push(row('電力密度(模式図の大きさ当たり)', nf(w / area, 3, 'W/mm²'), '推定', 'ブロックの大きさは模式図のため、実チップの電力密度ではない'));
    const th = ev.thermal;
    if (th && th.ok && num(th.tjC)) rows.push(row('チップ平均の接合部温度 Tj', nf(th.tjC, 1, '℃'), '推定', `冷却「${th.coolingId}」(熱抵抗は仮置き)での平均。ブロック単位の温度は出していません(ヒートマップの「温度」表示は模式図)`));
    else rows.push(row('チップ平均の接合部温度 Tj', null, null, th && th.ok ? '熱暴走の恐れ(温度が収束しない)' : (th && th.reason ? short(th.reason, 80) : '推定できません')));
    return rows;
  }

  function customCoreRows(design, block, g, ev) {
    const def = block.coreDefId ? (design.coreDefs || []).find((x) => x.id === block.coreDefId) : null;
    if (!def) return [];
    const rows = [row('自作コア', def.name || def.id, null, '複製して編集したコア。確度は常に低')];
    rows.push(row('基準コア(複製元)', `${def.base && def.base.uarch ? def.base.uarch : NA}${def.base && def.base.sourceChip ? `(${def.base.sourceChip})` : ''}`));
    const p = def.params || {}; const b = (def.base && def.base.uRecord) || {};
    const bv = { width: b.width, rob: b.rob, l2KB: b.l2KB, clockGHz: def.base && def.base.defaultClockGHz, smt: def.base && def.base.smt };
    [['width', '発行幅', ''], ['rob', 'ROB', ''], ['l2KB', 'L2 容量', 'KB'], ['clockGHz', 'クロック', 'GHz'], ['smt', 'SMT', 'way']].forEach(([k, lab, unit]) => {
      const cur = p[k]; const base = bv[k];
      const changed = num(cur) && num(base) && cur !== base;
      rows.push(row(`${lab}(編集可能)`, nf(cur, 2, unit), null, num(base) ? `基準 ${rd(base, 2)}${unit ? ` ${unit}` : ''}${changed ? ' から変更' : '(基準のまま)'}` : '基準の値は未取得'));
    });
    void g; void ev;
    return rows;
  }

  function l3Rows(design, ev, ctxInfo, ctx, uarchDb) {
    const { block, mix, preset0 } = ctxInfo;
    const rows = [];
    const cfg = design.cfg || {};
    const pcfg = (preset0 && preset0.cfg) || {};
    const total = mix ? (num(block.capacityMB) ? block.capacityMB : null) : (num(cfg.l3MB) ? cfg.l3MB : null);
    rows.push(row(mix ? '容量(このブロック)' : '容量(L3 総量)', nf(total, 1, 'MB'), null, mix ? '混合設計では置いた部品ごとの容量' : 'プリセットの値。ブロックの表示容量や大きさは模式図'));
    const arr = !mix && Array.isArray(pcfg.l3CcdMB) ? pcfg.l3CcdMB : null;
    if (arr && num(total)) {
      const sum = arr.reduce((t, x) => t + (num(x) && x > 0 ? x : 0), 0);
      const k = sum > 0 && Math.abs(total - sum) > 1e-9 ? total / sum : 1;
      rows.push(row('CCD ごとの容量', arr.map((x, i) => `CCD ${i}: ${nf(x * k, 1, 'MB')}`).join(' / '), null, 'プリセットの cfg.l3CcdMB(合計が総量)'));
    } else if (!mix) {
      const cc = (ev && ev.st && ev.st.l3Ccds) || pcfg.l3Ccds;
      if (num(cc) && cc > 1) rows.push(row('CCD 数', `${cc} 個(L3 は CCD ごとに独立)`, null, '1 コアが使える L3 は自分の CCD の分だけ'));
    }
    if (!mix && pcfg.l3Note) rows.push(row('内訳(V-Cache など)', short(pcfg.l3Note, 220), '二次', 'プリセットの l3Note'));
    // 遅延(コア種別ごとの uarch 記録)
    const lat = [];
    const groups = mix ? (DSm() && DSm().deriveCfg ? (() => { try { return DSm().deriveCfg(design).cores || []; } catch (e) { return []; } })() : []) : (cfg.cores || []);
    groups.forEach((g) => { const rec = g.uRecord || (uarchDb && uarchDb[g.uarch]); lat.push(`${g.coreType || g.type}: ${rec && num(rec.l3Lat) ? `${rec.l3Lat} サイクル` : NA}`); });
    const anyLat = groups.some((g) => { const r = g.uRecord || (uarchDb && uarchDb[g.uarch]); return r && num(r.l3Lat); });
    rows.push(row('L3 遅延(コア種別ごと)', lat.length ? lat.join(' / ') : null, anyLat ? '二次' : null, 'uarch の記録(コアから見た遅延)'));
    // 使える種別
    const lt = !mix && Array.isArray(pcfg.l3Types) && pcfg.l3Types.length ? pcfg.l3Types : null;
    rows.push(row('L3 を使えるコア', lt ? `${lt.join('・')} のみ` : '全コア種別', null, lt ? `l3Types。ほかの種別${groups.filter((g) => !lt.includes(g.type)).map((g) => `(${g.type})`).join('')}は L3 につながらない(性能の計算でも L3 を使わない)` : null));
    if (ev && ev.mt && ev.mt.ok && Array.isArray(ev.mt.l3PerCcd) && ev.mt.l3PerCcd.length) rows.push(row('MT での CCD ごとの分割', ev.mt.l3PerCcd.map((x) => `CCD ${x.ccd}: ${nf(x.mb, 0, 'MB')} ÷ ${x.threads} スレッド`).join(' / ')));
    return rows;
  }

  function decorRows(block) {
    if (block.decorative === true) return [row('計算への影響', 'なし(見た目だけ)', null, '飾りブロック: 性能・電力・面積・温度の計算に影響しません。実チップのフロアプランでもありません')];
    return [row('性能への影響', 'なし', null, '性能は、コア数・クロック・L3 の設定で計算します(このブロックは使いません)'), row('電力・面積', '電力の按分には使う', null, '電力・面積は「電力・温度」「面積」を参照(大きさは模式図)')];
  }

  // ---- 本体 ----
  function describe(design, evalResult, blockId, ctx) {
    const hit = findBlock(design, blockId);
    if (!hit) return { title: 'ブロックが見つかりません', subtitle: '', blockKind: null, sections: [] };
    const { die, block } = hit;
    const D = root.SDS_DATA || {};
    const DS = DSm();
    const mix = !!(DS && DS.isMix && DS.isMix(design));
    const presets = (ctx && ctx.presets) || D.presets || [];
    const uarchDb = (ctx && ctx.uarch) || D.uarch || {};
    const preset0 = design.presetId ? presets.find((p) => p.id === design.presetId) || (evalResult && evalResult.preset) || null : null;
    const g = groupOf(design, block, mix);
    const l3Types = !mix && preset0 && preset0.cfg && Array.isArray(preset0.cfg.l3Types) && preset0.cfg.l3Types.length ? preset0.cfg.l3Types : null;
    const info = { die, block, g, mix, preset0, l3Types };
    const rec = block.kind === 'core' ? ((g && g.uRecord) || uarchDb[block.uarch] || (g && uarchDb[g.uarch]) || null) : null;
    const sections = [];
    const add = (heading, rows) => { if (rows && rows.length) sections.push({ heading, rows }); };

    let title; let subtitle = `${KIND_NAME[block.kind] || block.kind}。ダイ: ${die.name || die.id}`;
    if (block.kind === 'core') {
      const def = block.coreDefId ? (design.coreDefs || []).find((x) => x.id === block.coreDefId) : null;
      title = def ? `自作コア「${def.name || def.id}」` : `${block.coreType || 'コア'} コア${block.uarch ? `(${block.uarch})` : ''}`;
      if (block.label && block.label !== block.coreType && !def) subtitle = `${block.label}。${subtitle}`;
    } else title = block.label || KIND_NAME[block.kind] || 'ブロック';

    add('基本', basicRows(design, evalResult, info));
    add('しくみと歴史', historyRows(block, info)); // 2026-11-18
    if (block.kind === 'core') {
      add('クロック', clockRows(g, info, evalResult));
      if (block.coreDefId) add('自作コア(確度:低)', customCoreRows(design, block, g, evalResult));
      add('マイクロアーキテクチャ(uarch の記録)', microRows(rec, g, evalResult, info));
      const dMt = evalResult && evalResult.mt && evalResult.mt.ok && g ? (evalResult.mt.detail || []).find((x) => x.type === g.type) : null;
      const isStCore = !!g && !!evalResult && !!evalResult.st && evalResult.st.ok && stTypeOf(design, evalResult, preset0, mix) === g.type;
      const d = dMt || (isStCore ? evalResult.st : null);
      add('性能の補正(u)', correctionRows(rec, g, d, ctx, (g && g.isa) || (preset0 && preset0.isa) || block.isa));
      add('ST(シングル)への寄与', stRows(design, evalResult, info));
      add('MT(マルチ)への寄与', mtRows(design, evalResult, info));
    } else if (block.kind === 'l3') {
      add('キャッシュ', l3Rows(design, evalResult, info, ctx, uarchDb));
    } else {
      add('計算への影響', decorRows(block));
    }
    add('面積', areaRows(design, info, ctx));
    add('電力・温度(推定・確度:低)', powerRows(design, evalResult, info));
    return { title, subtitle, blockKind: block.kind, sections };
  }

  // 選択の個数で分ける。0 件: null、2 件以上: 『N 個選択中』だけ
  function describeSelection(design, evalResult, ids, ctx) {
    const a = Array.isArray(ids) ? ids : [];
    if (!a.length) return null;
    if (a.length > 1) return { title: `${a.length} 個選択中`, subtitle: '', blockKind: null, multi: true, count: a.length, sections: [] };
    return describe(design, evalResult, a[0], ctx);
  }

  const api = { describe, describeSelection, KIND_NAME };
  root.SDS = root.SDS || {}; root.SDS.ui = root.SDS.ui || {}; root.SDS.ui.blockinfo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
