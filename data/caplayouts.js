// チップコンデンサ(SMD)の配置規則(3D パッケージビューの上面。2026-11-16)。調査: docs/research/capacitor-layout-2026-11-16.md
// 描画だけに使う。評価(ST/MT・電力・温度・面積)には使わない。
//
// 状態(state):
//   'rules'   ① 実物の上面にコンデンサが有る。写真から作った規則(groups)で描く。
//   'none'    ② 実物の上面に無い。0 個(「実物の上面に無いので描いていません」と表示)。
//   'unknown' ③ 写真が取れず不明。0 個(「実物の配置は未確認のため描いていません」と表示)。
// 区分(basis[].grade): '実測' = 実物の写真を自分で見た観察 / '公表' = メーカー資料・メーカー配布の画像 / '二次' = 記事・他者のイラスト / '推定' = 推測。
//   取得日(basis[].date)はすべて 2026-11-16。画像は保存・転載していない(URL と、見えたものの文章だけ)。
//
// 規則の書き方(座標は基板・蓋に対する割合。シミュレーターの基板は実パッケージの大きさ・縦横比ではないため、割合で書いて当てはめる):
//   place: 'outside'  基板の縁と蓋のあいだの帯(蓋の外側)に置く。蓋が無い実物でも、模式の蓋の外側の帯に置く。
//          'underLid' 蓋の内側、ダイの外接矩形と蓋の縁のあいだの帯に置く(蓋の下にある実物。蓋「ガラス」「なし」のときだけ見え、不透明の蓋では見えない)。
//   frame: 'square'   実物の向きのまま当てはめる。
//          'portrait' 実物は縦長(長辺が上下)。基板が横長なら、時計回りに 90° 回して当てはめる(回す向きは固定。実チップの向きとの対応は [推定])。
//   groups[]: { edge: 'left'|'right'|'top'|'bottom'(frame 上の辺。frame が 'portrait' のとき写真の向き = 蓋の刻印が読める向き),
//               from, to: 辺に沿った範囲(0〜1。left/right は上→下、top/bottom は左→右。外側の矩形の辺の長さに対する割合),
//               depth: [d0, d1]: 帯の厚さに対する割合(0 = 外側の縁、1 = 内側(蓋の縁またはダイ側)),
//               rows: 帯の厚さ方向の行数, perRow: 辺に沿った 1 行の個数(どちらも上限。置けない分は減らす。個数は目安),
//               axis: 'perp' = 長辺が縁に垂直 / 'para' = 長辺が縁に平行 }
//   サイズは模式(1.0 × 0.5 mm。pkggeom.js)。公表値が無いので変えない。ダイと重なるものは pkggeom.js が落とす。
window.SDS_DATA = window.SDS_DATA || {};
(function () {
  const DATE = '2026-11-16';
  const b = (grade, text, url) => ({ grade, text, date: DATE, ...(url ? { url } : {}) });
  const G = (edge, from, to, depth, rows, perRow, axis) => ({ edge, from, to, depth, rows, perRow, axis });
  const W = (kind, name, state, o) => Object.assign({ id: kind, name, state, place: 'outside', frame: 'square', groups: [] }, o);

  const URL = {
    am5: 'https://commons.wikimedia.org/wiki/File:AMD@4nmCCD(6nmIOD)@Zen5@Granite_Ridge@Ryzen_5_9600X@100-000001405_BY_2429SUY_9AEQ579S40073_DSC01876.jpg',
    am5lid: 'https://commons.wikimedia.org/wiki/File:AMD_Ryzen_7000-Serie_-_Der_ultimative_CPU_und_Mainboard_Vergleich_(Memory_PC)_05.png',
    am4: 'https://commons.wikimedia.org/wiki/File:AMD@7nm(12nmIOD)@Zen3@Vermeer@Ryzen_5_5600X@100-000000064_BG_2042SUS_9JF6228V00014_DSCx2.jpg',
    adl: 'https://commons.wikimedia.org/wiki/File:A-00.07.00.443.png',
    rpl: 'https://commons.wikimedia.org/wiki/File:Intel@intel7(10nmESF)@RaptorLake@RPL(8P%2B16E)@i9-13900K@ES_DSC05587-DSC05587.jpg',
    arl: 'https://commons.wikimedia.org/wiki/File:INTEL_CORE_ULTRA_7_265K_-_DOVRESTI_COMPRARLO%C2%BF_%F0%9F%91%80_(1920p_25fps_VP9_LQ-128kbit_AAC)-00.01.50.800.png',
    mtl: 'https://www.ltec-biz.com/wp-content/uploads/2024/09/Img20240903105328-1024x578.jpg',
    lnl: 'https://indianexpress.com/wp-content/uploads/2024/06/intel-lunar-lake.jpg',
    ces25: 'https://www.tomshardware.com/pc-components/cpus/heres-all-the-sexy-silicon-amd-launched-at-ces-2025-strix-halo-krackan-point-ryzen-9000x3d-fire-range-and-hawk-point-refresh-pose-for-family-photo',
    m1: 'https://hacarus.com/wp-content/uploads/2021/01/M1-Packege_and_M1_photo_by_Apple_EN_W1920-1024x605.png',
    pop: 'https://medias.yolegroup.com/uploads/2023/04/qualcomm-snapdragon-8-gen-2-soc_package-cross-section-optical-view.jpg',
    orin: 'https://jetsonhacks.com/',
    gb10: 'https://regmedia.co.uk/2025/08/27/gb10_nvidia_superchip.jpg',
  };
  const NOPHOTO = '写真を見つけられなかった、または写真から判断できなかった';

  const kinds = [
    // ---- ① 上面に有る ----
    W('am5', 'AMD AM5(Ryzen 7000・9000)', 'rules', {
      basis: [
        b('実測', 'Ryzen 5 9600X の蓋を外した基板(Fritzchens Fritz、CC0): コンデンサは 8 か所の塊で、蓋の足(接着剤の跡)のあいだにあり、ダイの周りを一周する。左右の辺は厚い(3〜4 列の格子)、上下の辺は中央より左右に 1 塊ずつ(2 行)。基板全体で約 150〜200 個(目視の概数)', URL.am5),
        b('実測', '蓋付きの上面(10 SKU の写真。解像度は低い): 蓋の切り欠きの中にコンデンサの格子が見える。1 CCD・2 CCD・X3D で配置は同じ', URL.am5lid),
        b('推定', '向き(長辺が横)は斜めの写真のため不確か。基板の縁からの深さと各塊の範囲は写真の目測'),
      ],
      note: '蓋の切り欠きから見える。シミュレーターの蓋は切り欠きの無い矩形なので、蓋の外側の帯に置く。空きパッドの格子は部品ではないので描かない',
      groups: [
        G('left', 0.12, 0.46, [0.05, 1], 4, 30, 'perp'), G('left', 0.54, 0.88, [0.05, 1], 4, 30, 'perp'),
        G('right', 0.12, 0.46, [0.05, 1], 4, 30, 'perp'), G('right', 0.54, 0.88, [0.05, 1], 4, 30, 'perp'),
        G('top', 0.20, 0.45, [0.1, 1], 2, 8, 'para'), G('top', 0.55, 0.80, [0.1, 1], 2, 8, 'para'),
        G('bottom', 0.20, 0.45, [0.1, 1], 2, 8, 'para'), G('bottom', 0.55, 0.80, [0.1, 1], 2, 8, 'para'),
      ],
    }),
    W('am4-zen3', 'AMD AM4(Zen 3。Ryzen 5000)', 'rules', {
      place: 'underLid',
      basis: [
        b('実測', 'Ryzen 5 5600X の蓋を外した基板(近赤外の写真、Fritzchens Fritz、CC BY 2.0): 蓋を接着する枠の内側(= 蓋の下)に、右辺は縦 2 列 × 約 11 行、左辺は縦 1〜2 列(約 14 個)、上辺・下辺は中央の左右に 2 行 × 4 個ずつ。合計約 65〜70 個(目視の概数)', URL.am4),
        b('実測', '蓋付きの上面(Athlon 3000G、低解像度): 蓋が基板のほぼ全面を覆い、上面にコンデンサは見えない', 'https://commons.wikimedia.org/wiki/Category:AMD_Athlon_3000G'),
        b('推定', '5800X・5800X3D・5950X は 5600X と同じ Vermeer の基板と推定(写真は 5600X のみ確認)'),
      ],
      note: '蓋の下にある(蓋「ガラス」「なし」のときだけ見える。不透明の蓋では見えない)。実物の蓋は基板のほぼ全面を覆うが、シミュレーターの蓋は小さいので、帯が狭く、縁に垂直な列は 1 列に減る。実物では 1.6 × 0.9 mm 程度に見える([推定])が、サイズは模式のまま',
      groups: [
        G('right', 0.12, 0.88, [0.35, 1], 2, 11, 'perp'),
        G('left', 0.12, 0.42, [0.35, 1], 2, 4, 'perp'), G('left', 0.58, 0.88, [0.35, 1], 2, 4, 'perp'),
        G('top', 0.15, 0.45, [0.2, 1], 2, 4, 'para'), G('top', 0.55, 0.85, [0.2, 1], 2, 4, 'para'),
        G('bottom', 0.15, 0.45, [0.2, 1], 2, 4, 'para'), G('bottom', 0.55, 0.85, [0.2, 1], 2, 4, 'para'),
      ],
    }),
    W('lga1700', 'Intel LGA1700(第 12〜14 世代)', 'rules', {
      frame: 'portrait',
      basis: [
        b('実測', 'Core i9-12900K の上面(動画の静止画、Commons): 長辺の下寄りに 4 個が縦 1 列(長辺が縁に垂直)、下の短辺の中央より右に 3〜4 個が横 1 列 + 右下の角寄りに 1 個。細かい点の格子はテストパッドと推定し数えない', URL.adl),
        b('実測', 'Core i9-13900K(ES)の蓋を外した基板(Fritzchens Fritz): 蓋の下(ダイの周り)にコンデンサは無い。蓋の外は 12900K と同じ', URL.rpl),
        b('二次', '同じ 13900K の写真(Wccftech。向きが 90° 回っている): 同じ配置', 'https://cdn.wccftech.com/wp-content/uploads/2022/10/Intel-13th-Gen-Raptor-Lake-Core-i9-13900K-CPU-Die-Shots-_2.jpg'),
        b('推定', '12100(H0)は同じソケットなので近いと推定。シミュレーターの基板は横長(ダイが横長)なので、縦長の実物を時計回りに 90° 回して当てはめる。回す向きは固定で、実チップの向きとの対応は推定'),
      ],
      note: '上面に約 8 個だけ(蓋の下は無し)。基板が横長のとき 90° 回して当てはめるので、位置は [推定]',
      groups: [
        G('left', 0.70, 0.90, [0.1, 0.9], 1, 4, 'perp'),
        G('bottom', 0.55, 0.75, [0.1, 0.9], 1, 3, 'para'), G('bottom', 0.82, 0.88, [0.1, 0.9], 1, 1, 'para'),
      ],
    }),
    W('lga1851', 'Intel LGA1851(Core Ultra 200S)', 'rules', {
      frame: 'portrait',
      basis: [
        b('実測', 'Core Ultra 9 285K と 7 265K の上面(動画の静止画、Commons): 左の長辺は上寄り 2 個・中ほどより下に 2 個・下寄りに約 6 個の縦 1 列、右の長辺は下の角寄りに 2 個。上下の短辺には見えない。各個の長辺は縁に垂直。合計約 12 個', URL.arl),
        b('推定', 'シミュレーターの基板は 4 タイルを横一列に並べるので横長。縦長の実物を時計回りに 90° 回して当てはめる(回す向きは固定で、推定)'),
      ],
      note: '上面に約 12 個(長辺のみ)。蓋の下・裏面は未確認。基板が横長のとき 90° 回して当てはめるので、位置は [推定]',
      groups: [
        G('left', 0.16, 0.24, [0.1, 0.9], 1, 2, 'perp'), G('left', 0.60, 0.70, [0.1, 0.9], 1, 2, 'perp'), G('left', 0.74, 0.92, [0.1, 0.9], 1, 6, 'perp'),
        G('right', 0.84, 0.94, [0.1, 0.9], 1, 2, 'perp'),
      ],
    }),
    W('amd-fp-ring', 'AMD モバイル単一ダイ(Krackan Point・Hawk Point 系)', 'rules', {
      basis: [
        b('二次', 'AMD が CES 2025 で配った実物の写真(Tom\'s Hardware): Krackan Point(350 と同じダイ)・Hawk Point Refresh(7840HS と同じダイ)は、補強枠の内側、ダイのすぐ外側を囲んで小さなコンデンサが並ぶ。左右は縦の列(小さな塊が数個ずつ)、上下は横の列。蓋は無い。1 辺 10〜20 個程度(写真が小さく概数)', URL.ces25),
        b('推定', '向き(長辺が縁に平行か垂直か)は不確か。7840HS を Hawk Point と同じパッケージとする点も二次情報'),
      ],
      note: '蓋の無い実物のダイを囲む輪。シミュレーターの蓋の外側の帯に置く。向きは不確か',
      groups: [
        G('left', 0.12, 0.30, [0.3, 1], 1, 4, 'para'), G('left', 0.41, 0.59, [0.3, 1], 1, 4, 'para'), G('left', 0.70, 0.88, [0.3, 1], 1, 4, 'para'),
        G('right', 0.12, 0.30, [0.3, 1], 1, 4, 'para'), G('right', 0.41, 0.59, [0.3, 1], 1, 4, 'para'), G('right', 0.70, 0.88, [0.3, 1], 1, 4, 'para'),
        G('top', 0.12, 0.30, [0.3, 1], 2, 3, 'para'), G('top', 0.41, 0.59, [0.3, 1], 2, 3, 'para'), G('top', 0.70, 0.88, [0.3, 1], 2, 3, 'para'),
        G('bottom', 0.12, 0.30, [0.3, 1], 2, 3, 'para'), G('bottom', 0.41, 0.59, [0.3, 1], 2, 3, 'para'), G('bottom', 0.70, 0.88, [0.3, 1], 2, 3, 'para'),
      ],
    }),
    W('amd-fl1', 'AMD FL1(Dragon Range)', 'rules', {
      basis: [
        b('二次', '同じ Tom\'s Hardware の記事の Fire Range(Dragon Range と同じ FL1 パッケージ)の写真: 補強枠の内側にダイ(IOD と CCD)を囲む密な格子。左右の辺が厚い(3〜4 列)、上辺は 2 行、下辺は薄い。蓋は無い。約 100 個以上(概数)', URL.ces25),
        b('推定', '確度は低〜中(Dragon Range そのものの写真ではない)。向きは不確か。写真は IOD が上・CCD が下だが、シミュレーターは CCD が上・IOD が下。基板の辺に対して決めるため、写真の上辺の厚い側が基板の上辺に来る'),
      ],
      note: '蓋の無い実物。写真は Fire Range(同じ FL1)から。シミュレーターの蓋の外側の帯に置く。確度は低〜中',
      groups: [
        G('left', 0.10, 0.90, [0, 1], 4, 30, 'para'), G('right', 0.10, 0.90, [0, 1], 4, 30, 'para'),
        G('top', 0.14, 0.86, [0, 1], 2, 30, 'para'), G('bottom', 0.14, 0.86, [0.4, 1], 1, 30, 'para'),
      ],
    }),
    W('apple-m1', 'Apple M1', 'rules', {
      place: 'underLid',
      basis: [
        b('公表', 'Apple の M1 の説明用写真(蓋の中を見せた図。Hacarus の記事が引用): 蓋付きの上面にコンデンサは見えない。蓋の中の SoC ダイの上側に約 2 行(左寄りに 5〜6 個、右寄りに 3 個。約 9 個)、下側に約 3 行 × 5〜6 個(約 15 個)。ダイの左右には無い', URL.m1),
        b('二次', 'Commons のイラスト(上の写真と EE Times Asia の分解記事をもとに描いたもの、CC0): 同じ配置', 'https://commons.wikimedia.org/wiki/File:Apple_M1_no_heatsink.png'),
      ],
      note: '蓋の下にある(蓋「ガラス」「なし」のときだけ見える。不透明の蓋では見えない)。パッケージ内の DRAM は描かない。M1 Pro 以降は未確認',
      groups: [
        G('top', 0.08, 0.40, [0.2, 1], 2, 3, 'para'), G('top', 0.55, 0.75, [0.2, 1], 1, 3, 'para'),
        G('bottom', 0.08, 0.70, [0, 1], 3, 5, 'para'),
      ],
    }),
    W('nv-orin', 'NVIDIA Jetson AGX Orin', 'rules', {
      basis: [
        b('公表', 'NVIDIA の Orin パッケージの画像(JetsonHacks 2022-04 の記事。写真か CG かは未確認): 補強枠の内側、ダイの外側に輪の形。上辺・下辺は小さな塊が 5〜6 個ずつ(各 2〜4 個)、左右は縦の列(左約 8 個・右約 12 個)。合計約 50 個(概数)', URL.orin),
        b('推定', '向きは不確か。CG の可能性があるため確度は低い'),
      ],
      note: '蓋の無い実物のダイを囲む輪。シミュレーターの蓋の外側の帯に置く。画像が CG の可能性があり、確度は低い',
      groups: [
        G('top', 0.10, 0.22, [0.2, 0.9], 1, 3, 'para'), G('top', 0.26, 0.38, [0.2, 0.9], 1, 3, 'para'), G('top', 0.42, 0.54, [0.2, 0.9], 1, 3, 'para'), G('top', 0.58, 0.70, [0.2, 0.9], 1, 3, 'para'), G('top', 0.74, 0.86, [0.2, 0.9], 1, 3, 'para'),
        G('bottom', 0.10, 0.22, [0.2, 0.9], 1, 3, 'para'), G('bottom', 0.26, 0.38, [0.2, 0.9], 1, 3, 'para'), G('bottom', 0.42, 0.54, [0.2, 0.9], 1, 3, 'para'), G('bottom', 0.58, 0.70, [0.2, 0.9], 1, 3, 'para'), G('bottom', 0.74, 0.86, [0.2, 0.9], 1, 3, 'para'),
        G('left', 0.15, 0.85, [0.2, 0.9], 1, 8, 'para'), G('right', 0.12, 0.88, [0.2, 0.9], 1, 12, 'para'),
      ],
    }),
    W('nv-gb10', 'NVIDIA GB10(DGX Spark)', 'rules', {
      frame: 'portrait',
      basis: [
        b('公表', 'NVIDIA の GB10 の画像(The Register の記事): 縦長の基板(公表 31 × 50 mm)、補強枠。ダイ領域の上と下にそれぞれ 2 行 × 約 8 個(中央寄り)、左右の長辺に沿って 1〜2 列の縦の列(途中で数か所切れる)', URL.gb10),
        b('推定', '画像はダイ写真を重ねた宣伝用で、実物写真ではない可能性が高い。確度は低い。シミュレーターの基板は横長なので、縦長の実物を時計回りに 90° 回して当てはめる(推定)'),
      ],
      note: '宣伝用の画像に基づくので確度は低い。蓋の無い実物。基板が横長のとき 90° 回して当てはめる',
      groups: [
        G('top', 0.25, 0.75, [0.2, 0.9], 2, 8, 'para'), G('bottom', 0.25, 0.75, [0.2, 0.9], 2, 8, 'para'),
        G('left', 0.08, 0.46, [0.2, 0.9], 2, 10, 'para'), G('left', 0.54, 0.92, [0.2, 0.9], 2, 10, 'para'),
        G('right', 0.08, 0.46, [0.2, 0.9], 2, 10, 'para'), G('right', 0.54, 0.92, [0.2, 0.9], 2, 10, 'para'),
      ],
    }),
    // ---- ② 上面に無い ----
    W('intel-mobile-bga', 'Intel モバイル BGA(Meteor Lake・Lunar Lake)', 'none', {
      basis: [
        b('二次', 'Meteor Lake(Core Ultra 9)のパッケージ上面の写真(エルテック): 基板の外周に補強枠、中央にタイルの積層。基板の上面にコンデンサは見えない。蓋は無い', URL.mtl),
        b('二次', 'Lunar Lake を基板に載せた写真(Indian Express)と手に持った写真(guru3d): 補強枠、ダイ、DRAM 2 個。パッケージの上面にコンデンサは無い', URL.lnl),
      ],
    }),
    W('intel-arl-h', 'Intel Arrow Lake-H(285H)', 'none', {
      basis: [
        b('推定', 'Meteor Lake と同じ系統のパッケージと推定(写真は未確認)。上面にコンデンサは無いものとして描かない', URL.mtl),
      ],
    }),
    W('phone-pop', 'スマホ SoC(PoP)', 'none', {
      basis: [
        b('二次', 'Snapdragon 8 Gen 2 のパッケージ断面(Yole SystemPlus 2023): DRAM と SoC の積層(PoP)', URL.pop),
        b('推定', '実機で上から見えるのは DRAM パッケージの樹脂の上面で、コンデンサは無い。Apple A 系・Dimensity・ほかの Snapdragon も同じ扱い(SKU ごとには未確認)'),
      ],
    }),
    // ---- ③ 写真が取れず不明 ----
    W('am4-unconfirmed', 'AMD AM4(Zen 1・Zen+・Raven Ridge)', 'unknown', { basis: [b('推定', `蓋の下の配置は Zen 3(5600X)でのみ確認。Zen 1・Zen+・Raven Ridge は${NOPHOTO}`)] }),
    W('intel-old-unconfirmed', 'Intel LGA1155・1150・1151・1200・モバイル(第2〜10世代の Core i)', 'unknown', { basis: [{ grade: '推定', text: `第2〜10世代の Core i(2026-11-17 に追加)は${NOPHOTO}(調べていない)`, date: '2026-11-17' }] }),
    W('amd-old-unconfirmed', 'AMD Socket A・754・939・AM2(+)・AM3(+)・FM2・FT1(Ryzen より前)', 'unknown', { basis: [{ grade: '推定', text: `2026-11-19 に追加した AMD の旧世代(K7〜Piledriver・Bobcat)は${NOPHOTO}(調べていない)`, date: '2026-11-19' }] }),
    W('intel-mobile-unconfirmed', 'Intel モバイル BGA(Panther Lake・Wildcat Lake)', 'unknown', { basis: [b('推定', `Panther Lake・Wildcat Lake は${NOPHOTO}`)] }),
    W('intel-hx-bga', 'Intel HX(BGA)', 'unknown', { basis: [b('推定', `13980HX で検索した写真は実際には 13900K(LGA1700)で、HX の BGA の上面の写真は${NOPHOTO}`)] }),
    W('amd-fp-unconfirmed', 'AMD モバイル単一ダイ(Strix Point・Rembrandt-R・Cezanne)', 'unknown', { basis: [b('推定', `Strix Point(HX 370)・Rembrandt-R(7735HS)・Cezanne(5800U)は${NOPHOTO}`)] }),
    W('am5-apu', 'AMD AM5 の APU(Ryzen 8000G。8500G・8700G)', 'unknown', { basis: [b('推定', `AM5 の蓋付きの APU(Phoenix)は${NOPHOTO}。AM5 の既存の配置(Raphael・Granite Ridge の 2 チップレット構成の写真)は、モノリシックのダイの APU に当てはまるか未確認のため流用していない`)] }),
    W('amd-fp11', 'AMD Strix Halo(FP11)', 'unknown', { basis: [b('二次', `CES 2025 の写真(Tom\'s Hardware)は低解像度で、個数・向きを判断できなかった(左右に縦の列、下辺に 1 列に見える)`, URL.ces25)] }),
    W('amd-sp3', 'AMD SP3(EPYC)', 'unknown', { basis: [b('推定', `EPYC 7401 は${NOPHOTO}`)] }),
    W('apple-m-unconfirmed', 'Apple M 系(M1 以外)', 'unknown', { basis: [b('推定', `M1 Pro・Max・Ultra・M2〜M5 は${NOPHOTO}`)] }),
    W('qc-pc-bga', 'Snapdragon 8cx Gen 3', 'unknown', { basis: [b('推定', `8cx Gen 3 そのものは${NOPHOTO}`)] }),
    W('nv-tegra-unconfirmed', 'NVIDIA Thor・T239', 'unknown', { basis: [b('推定', `Thor・T239 は${NOPHOTO}`)] }),
  ];

  // プリセット id → 種類 id(全件。調査メモ §1.1)
  const map = {};
  const put = (kind, ids) => ids.split(/\s+/).forEach((id) => { map[id] = kind; });
  put('am4-zen3', 'amd-zen3-5800x amd-zen3-5800x3d amd-zen3-5600x amd-zen3-5950x');
  put('am4-unconfirmed', 'amd-zen1-1800x amd-zen1-1500x amd-zen1-1200 amd-zenplus-2700x amd-zenplus-2600x amd-raven-2400g amd-raven-2200g');
  put('am5', 'amd-zen4-7700 amd-zen4-7800x3d amd-zen4-7950x amd-zen4-7950x3d amd-zen5-9700x amd-zen5-9800x3d amd-zen5-9950x amd-zen5-9950x3d');
  put('lga1700', 'intel-adl-12900k intel-adl-12700k intel-adl-12600k intel-adl-12100 intel-rpl-13900k intel-rpl-13700k intel-rpl-13600k intel-rpl-14900k intel-rpl-14700k intel-rpl-14600k');
  put('lga1851', 'intel-arl-285k intel-arl-265k');
  put('intel-mobile-bga', 'intel-mtl-185h intel-lnl-268v intel-lnl-258v intel-lnl-256v');
  put('intel-arl-h', 'intel-arl-285h');
  put('intel-old-unconfirmed', 'intel-snb-2600k intel-snb-2500k intel-snb-2720qm intel-hsw-4770k intel-hsw-4790k intel-hsw-4690k intel-hsw-4700hq intel-skl-6700k intel-skl-6600k intel-skl-6700hq intel-kbl-7700k intel-kbl-7600k intel-kbl-7700hq intel-cfl-8700k intel-cfr-9900k intel-cfr-9700k intel-cml-10900k intel-cml-10700k intel-nhm-860 intel-wsm-980x intel-ivb-3770k intel-ivb-3570k intel-bdw-5775c intel-wlf-e8400 intel-yfd-q9550 intel-yfd-q9650 intel-p3-katmai-600b intel-p3-cmn-1000 intel-p3-tlt-1400s intel-p4-wlm-1500 intel-pm-bns-16 intel-p4-nwd-30c intel-pm-dth-755 intel-pd-smf-820 intel-p4-prs-531 intel-p4-cdm-631 intel-pd-prl-945 intel-cd-yna-t2500 intel-c2-cnr-e6600 intel-c2-kts-q6600');
  put('amd-old-unconfirmed', 'amd-k7-athlon-1400 amd-k7-xp-3200 amd-k8-venice-3200 amd-k8-brisbane-5000 amd-k10-agena-9950 amd-k10-deneb-955 amd-k10-thuban-1090t amd-k10-propus-x4-640 amd-bd-fx8150 amd-pd-fx8350 amd-pd-fx6300 amd-pd-a10-5800k amd-bobcat-e350');
  put('intel-mobile-unconfirmed', 'intel-ptl-x9-388h intel-ptl-x9-386h intel-ptl-x9-378h intel-ptl-x7-358h intel-ptl-u5-325 intel-wcl-c5-320');
  put('intel-hx-bga', 'intel-rpl-13980hx intel-rpl-14900hx intel-rpl-14700hx intel-arl-275hx');
  put('amd-fp-ring', 'amd-kraken-350 amd-zen4-7840hs');
  put('amd-fp-unconfirmed', 'amd-strix-hx370 amd-zen3p-7735hs amd-zen3-5800u');
  put('am5-apu', 'amd-zen4-8500g amd-zen4-8700g');
  put('amd-fl1', 'amd-zen4-7945hx');
  put('amd-fp11', 'amd-strixhalo-395');
  put('amd-sp3', 'amd-epyc-7401');
  put('apple-m1', 'apple-m1');
  put('apple-m-unconfirmed', 'apple-m1pro apple-m1max apple-m1ultra apple-m2 apple-m2pro apple-m2max apple-m2ultra apple-m3 apple-m3pro apple-m3max apple-m4 apple-m4pro apple-m5 apple-m5max');
  put('phone-pop', 'apple-a12 apple-a13 apple-a14 apple-a15 apple-a16 apple-a17pro apple-a18 apple-a18pro apple-a19pro apple-a20pro ' +
    'qc-855 qc-865 qc-888 qc-8gen1 qc-8plus-gen1 qc-8gen2 qc-8gen3 qc-8elite qc-8elite-gen5 qc-8s-gen3 qc-8s-gen4 qc-7plus-gen3 qc-780g qc-7gen3 qc-7gen4 qc-7gen1 qc-720g qc-8elite-x-gen6 qc-6gen1 qc-4gen2 ' +
    'mt-9000 mt-9200 mt-9300 mt-9400 mt-9500 mt-9600pro mt-8200');
  put('qc-pc-bga', 'qc-8cx-gen3');
  put('nv-orin', 'nv-orin-agx');
  put('nv-tegra-unconfirmed', 'nv-thor nv-t239');
  put('nv-gb10', 'nv-gb10');

  window.SDS_DATA.caplayouts = { kinds, presets: map };
})();
