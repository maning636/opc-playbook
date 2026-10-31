#!/usr/bin/env node
// idea-to-cash · 幻觉依赖核查（slopsquatting 防线，第 8 关配套）
// 读 <cwd>/package.json 的 dependencies + devDependencies，逐个查 npm registry 是否真实存在。
// 用法: node slopcheck.mjs [--cwd <dir>]
// 退出码: 0 全部真实/无 package.json ｜ 1 发现疑似幻觉包 ｜ 2 用法/解析错误
// 网络失败按警告处理（不拦），离线环境不误伤。

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const cwdIdx = argv.indexOf('--cwd');
const cwd = path.resolve(cwdIdx > -1 ? argv[cwdIdx + 1] : process.cwd());
const pkgPath = path.join(cwd, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('[slopcheck] 无 package.json —— 无 npm 依赖可查，跳过（其他语言的依赖请手动去官方 registry 核对）');
  process.exit(0);
}

let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); }
catch { console.error('[slopcheck] package.json 解析失败'); process.exit(2); }

const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
if (!deps.length) { console.log('[slopcheck] 无依赖，跳过'); process.exit(0); }

console.log(`[slopcheck] 核查 ${deps.length} 个依赖是否真实存在于 npm registry…`);
let fake = 0, warn = 0;
for (const name of deps) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`;
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (res.status === 404) { fake++; console.log(`  [✗] ${name} —— npm 上不存在！疑似 AI 幻觉包，别装（slopsquatting 攻击面）`); }
    else if (res.ok) {
      const meta = await res.json();
      const latest = meta['dist-tags']?.latest || '?';
      console.log(`  [x] ${name}@${latest} 存在`);
    } else { warn++; console.log(`  [?] ${name} —— registry 返回 ${res.status}，请手动确认`); }
  } catch {
    warn++; console.log(`  [?] ${name} —— 网络失败，请手动确认（不拦截）`);
  }
}
console.log(fake ? `RESULT: FAIL（${fake} 个疑似幻觉包）` : warn ? `RESULT: PASS（${warn} 个待手动确认）` : 'RESULT: PASS');
process.exit(fake ? 1 : 0);
