// 単一 HTML を作り、それを埋め込んだ exe ランチャーを csc.exe(Windows 標準の .NET Framework)で作る。
// 使い方: node tools/build-exe.js   (出力: dist/半導体設計シミュレーター.html と .exe)
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const htmlOut = path.join(dist, '半導体設計シミュレーター.html');
const exeOut = path.join(dist, '半導体設計シミュレーター.exe');
const csc = path.join(process.env.SystemRoot || 'C:\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');

const b = spawnSync(process.execPath, [path.join(__dirname, 'build-single.js'), htmlOut], { stdio: 'inherit' });
if (b.status !== 0) process.exit(b.status || 1);
if (!fs.existsSync(csc)) {
  console.error(`csc.exe が見つかりません(${csc})。exe は作れませんが、単一 HTML は ${htmlOut} にあります。`);
  process.exit(2);
}
const args = ['/nologo', '/target:winexe', '/optimize+', '/utf8output', `/out:${exeOut}`,
  `/resource:${htmlOut},app.html`, '/reference:System.Windows.Forms.dll', path.join(__dirname, 'launcher', 'Launcher.cs')];
const r = spawnSync(csc, args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
console.log(`${exeOut}: ${(fs.statSync(exeOut).size / 1024).toFixed(0)} KB`);
