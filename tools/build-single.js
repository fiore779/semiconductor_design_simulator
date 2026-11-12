// index.html から参照される CSS・JS をすべて 1 つの HTML にインライン化する。
// 使い方: node tools/build-single.js [出力先]   (既定: dist/半導体設計シミュレーター.html)
// 依存パッケージなし。同じ入力なら同じ出力(時刻などは入れない。改行は LF に正規化)。
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(root, 'dist', '半導体設計シミュレーター.html');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); }
function sha(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// <script> の中身に </script や <!-- が現れても HTML として壊れないように、JS の文字列内で安全な形に直す
function escScript(js) { return js.replace(/<\/(script)/gi, '<\/$1').replace(/<!--/g, '<\!--'); }
function escStyle(css) { return css.replace(/<\/(style)/gi, '<\/$1'); }

function build() {
  const html = read('index.html');
  const files = [];
  let out = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g, (m, href) => {
    const css = read(href);
    files.push({ path: href, sha256: sha(css), bytes: Buffer.byteLength(css) });
    return `<style data-src="${href}" data-sha256="${sha(css)}">\n${escStyle(css)}\n</style>`;
  });
  out = out.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const js = read(src);
    files.push({ path: src, sha256: sha(js), bytes: Buffer.byteLength(js) });
    return `<script data-src="${src}" data-sha256="${sha(js)}">\n${escScript(js)}\n</script>`;
  });
  // 取りこぼし(外部参照の残り)を検出して失敗させる
  if (/<script[^>]*\ssrc=/i.test(out) || /<link[^>]*\shref=/i.test(out)) throw new Error('インライン化されていない script src / link href が残っています');
  const manifest = files.map((f) => `${f.sha256}  ${f.path}`).join('\n');
  const total = sha(manifest);
  const comment = `<!-- 単一ファイル版(tools/build-single.js で生成)。入力ファイル ${files.length} 個の SHA-256(全体: ${total}):\n${manifest.replace(/--/g, '- -')}\n-->\n`;
  out = out.replace(/<!DOCTYPE html>\n?/i, (m) => m + comment);
  return { html: out, files, total };
}

if (require.main === module) {
  const t0 = Date.now();
  const outPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT;
  const r = build();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, r.html, 'utf8');
  console.log(`${outPath}: ${(Buffer.byteLength(r.html) / 1024).toFixed(0)} KB, ${r.files.length} files, ${Date.now() - t0} ms, hash ${r.total.slice(0, 12)}`);
}
module.exports = { build };
