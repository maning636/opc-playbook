#!/usr/bin/env node
// opc-business-registry · 共享业务 ID 注册表（三台状态机的唯一贯穿键）
//
// 业务 ID 是"一个业务线"的唯一编号，格式 REQ-<年>-<4位序号>，例如 REQ-2026-0001。
// 三台状态机各管各的状态，只靠这一个 ID 互相引用：
//   经营层 opc-doc/    ← 引用 ID（阶段 / 产物标题）
//   产品层 .vibe/      ← 引用 ID（state.json 的 biz_id）
//   工程层 PROGRESS.md ← 引用 ID（任务行）
//
// 注册表文件：<工作区根>/business.json（不属于任何一层，三层只读不写，只有本脚本写）
//
// 用法:
//   node bizid.mjs alloc [--cwd <dir>] [--title "业务一句话"] [--prefix REQ] [--year YYYY]
//   node bizid.mjs get [--cwd <dir>] [--json]
//   node bizid.mjs set-title "<title>" [--cwd <dir>]
//   node bizid.mjs link <layer> <ref> [--cwd <dir>]      # layer: opc|idea|engineering
//   node bizid.mjs unlink <layer> [--cwd <dir>]
//   node bizid.mjs status [--cwd <dir>] [--json]        # 只读巡检：ID 出现在哪些文件里
// 退出码: 0 成功 ｜ 2 用法/状态错误

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REGISTRY_SCHEMA_VERSION = 1;
export const REGISTRY_FILE = 'business.json';
export const LAYERS = ['opc', 'idea', 'engineering'];
export const BIZ_ID_RE = /^[A-Z][A-Z0-9]{1,9}-\d{4}-\d{4}$/;
export const LAYER_DIR_HINTS = {
  opc: ['opc-doc/'],
  idea: ['.vibe/'],
  engineering: ['PROGRESS.md', 'docs/'],
};

const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', '__pycache__', '.next', 'dist', 'build', '.idea', '.vscode']);
const SCAN_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml', '.mjs', '.js', '.ts', '.tsx', '.py', '.html', '.css']);
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

export function isValidBizId(id) {
  return typeof id === 'string' && BIZ_ID_RE.test(id);
}

export function registryPath(cwd) {
  return path.join(cwd, REGISTRY_FILE);
}

export function readRegistry(cwd) {
  const p = registryPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`注册表损坏，无法解析 ${p}：${e.message}`);
  }
}

export function writeRegistry(cwd, reg) {
  reg.schema_version = REGISTRY_SCHEMA_VERSION;
  reg.updated_at = new Date().toISOString();
  fs.writeFileSync(registryPath(cwd), JSON.stringify(reg, null, 2) + '\n');
  return reg;
}

function now() { return new Date().toISOString(); }

// 扫工作区里已有的 REQ-YYYY-NNNN，取同年前缀下最大序号 +1，避免撞号
export function scanExistingIds(cwd, prefix, year) {
  const re = new RegExp(`\\b${prefix}-${year}-(\\d{4})\\b`, 'g');
  let max = 0;
  const hits = [];
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.vibe') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      const ext = path.extname(e.name).toLowerCase();
      if (!SCAN_EXT.has(ext)) continue;
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (st.size > MAX_SCAN_BYTES) continue;
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        const seq = Number(m[1]);
        if (seq > max) max = seq;
        hits.push({ file: path.relative(cwd, full).split(path.sep).join('/'), id: m[0] });
      }
    }
  };
  walk(cwd, 0);
  return { max, hits };
}

export function guessLayer(relPath) {
  const p = relPath.split(path.sep).join('/');
  for (const layer of LAYERS) {
    for (const hint of LAYER_DIR_HINTS[layer]) {
      if (hint.endsWith('/') ? p.includes(hint) : p === hint || p.endsWith('/' + hint) || p.includes('/' + hint + '/')) {
        return layer;
      }
    }
  }
  return 'other';
}

// ---- CLI ----
function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { args.flags[key] = next; i++; }
      else args.flags[key] = true;
    } else args._.push(a);
  }
  return args;
}

function die(msg) { console.error(`[bizid] ${msg}`); process.exit(2); }

function cmdAlloc(cwd, flags) {
  const existing = readRegistry(cwd);
  if (existing) {
    console.log(`[bizid] 已分配 ${existing.id}，不重复分配（幂等）。`);
    console.log(`[bizid] 当前标题：${existing.title || '(未填)'}`);
    return;
  }
  const prefix = String(flags.prefix || 'REQ').toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(prefix)) die('prefix 须为 1-10 位大写字母/数字，首位是字母');
  const year = Number(flags.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2999) die('year 须为 4 位年份');
  const { max, hits } = scanExistingIds(cwd, prefix, year);
  const seq = max + 1;
  if (seq > 9999) die('同年序号已用尽');
  const id = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  const reg = {
    schema_version: REGISTRY_SCHEMA_VERSION,
    id,
    prefix,
    year,
    seq,
    title: flags.title || '',
    allocated_at: now(),
    updated_at: null,
    layers: {},
  };
  writeRegistry(cwd, reg);
  console.log(`[bizid] 已分配业务 ID：${id}`);
  console.log(`[bizid] 注册表：${path.join(cwd, REGISTRY_FILE)}`);
  if (hits.length) console.log(`[bizid] 扫描到已有同前缀 ID ${hits.length} 处（最大序号 ${max}），本号顺延`);
  console.log(`[bizid] 把它写进三层的产物标题里：opc-doc/outputs/*.md、.vibe/state.json、PROGRESS.md 任务行`);
}

function cmdGet(cwd, flags) {
  const reg = readRegistry(cwd);
  if (!reg) die(`未分配业务 ID（${path.join(cwd, REGISTRY_FILE)} 不存在）—— 先跑 alloc`);
  if (flags.json) { console.log(JSON.stringify(reg, null, 2)); return; }
  console.log(`业务 ID：${reg.id}`);
  console.log(`业务名称：${reg.title || '(未填)'}`);
  console.log(`分配时间：${reg.allocated_at}`);
}

function cmdSetTitle(cwd, value) {
  const reg = readRegistry(cwd);
  if (!reg) die('未分配业务 ID —— 先跑 alloc');
  reg.title = value || '';
  writeRegistry(cwd, reg);
  console.log(`[bizid] 标题 = ${reg.title || '(空)'}`);
}

function cmdLink(cwd, layer, ref) {
  if (!LAYERS.includes(layer)) die(`layer 须为 ${LAYERS.join('|')}`);
  if (!ref) die('用法：link <layer> <ref>（ref = 该层状态/台账的相对路径）');
  const reg = readRegistry(cwd);
  if (!reg) die('未分配业务 ID —— 先跑 alloc');
  reg.layers = reg.layers || {};
  reg.layers[layer] = { ref, at: now() };
  writeRegistry(cwd, reg);
  console.log(`[bizid] ${reg.id} → ${layer} 层指向 ${ref}`);
  console.log(`[bizid] 注意：本脚本只记指针，不读也不写该层的状态内容`);
}

function cmdUnlink(cwd, layer) {
  if (!LAYERS.includes(layer)) die(`layer 须为 ${LAYERS.join('|')}`);
  const reg = readRegistry(cwd);
  if (!reg) die('未分配业务 ID —— 先跑 alloc');
  delete (reg.layers || {})[layer];
  writeRegistry(cwd, reg);
  console.log(`[bizid] 已解除 ${layer} 层的引用`);
}

function cmdStatus(cwd, flags) {
  const reg = readRegistry(cwd);
  if (!reg) {
    console.log('[bizid] 未分配业务 ID —— 跑 alloc 分配一个');
    return;
  }
  const scan = scanExistingIds(cwd, reg.prefix, reg.year);
  const byLayer = {};
  for (const h of scan.hits) {
    const l = guessLayer(h.file);
    (byLayer[l] = byLayer[l] || []).push(h.file);
  }
  if (flags.json) {
    console.log(JSON.stringify({ registry: reg, occurrences: byLayer }, null, 2));
    return;
  }
  console.log(`业务 ID：${reg.id}`);
  console.log(`业务名称：${reg.title || '(未填)'}`);
  console.log('层指针：');
  for (const l of LAYERS) {
    const p = reg.layers && reg.layers[l];
    console.log(`  ${p ? '→' : ' '} ${l.padEnd(11)} ${p ? p.ref : '(未登记)'}`);
  }
  console.log('ID 出现位置（只读巡检）：');
  for (const l of [...LAYERS, 'other']) {
    const files = byLayer[l];
    if (!files || !files.length) continue;
    console.log(`  ${l} (${files.length}):`);
    for (const f of [...new Set(files)].slice(0, 20)) console.log(`    - ${f}`);
  }
  const missing = LAYERS.filter(l => !(reg.layers && reg.layers[l]));
  if (missing.length) console.log(`提示：${missing.join('、')} 层还没登记指针（link <layer> <ref>）`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const cwd = path.resolve(args.flags.cwd || process.cwd());
  switch (cmd) {
    case 'alloc': cmdAlloc(cwd, args.flags); break;
    case 'get': cmdGet(cwd, args.flags); break;
    case 'set-title': cmdSetTitle(cwd, args._[1]); break;
    case 'link': cmdLink(cwd, args._[1], args._[2]); break;
    case 'unlink': cmdUnlink(cwd, args._[1]); break;
    case 'status': cmdStatus(cwd, args.flags); break;
    default:
      die('用法：bizid.mjs <alloc|get|set-title|link|unlink|status> …（见文件头注释）');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
