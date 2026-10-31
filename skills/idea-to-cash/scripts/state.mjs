#!/usr/bin/env node
// idea-to-cash · 项目状态机（state 存用户项目 .vibe/state.json，skill 目录不写入）
// 用法:
//   node state.mjs init   [--cwd <dir>] [--form-factor web|miniapp|app|internal] [--has-server true|false] [--idea "一句话"]
//   node state.mjs status [--cwd <dir>] [--json]
//   node state.mjs advance [--cwd <dir>] [--evidence <file>]
//   node state.mjs rollback --to <n> [--cwd <dir>]
//   node state.mjs set <form_factor|has_server|idea> <value> [--cwd <dir>]
// 退出码: 0 成功 ｜ 2 用法/状态错误

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, STAGES, FORM_FACTORS, getStage, isActive, nextActiveStage } from './stages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'assets', 'vibe-templates');

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

function die(msg) { console.error(`[state] ${msg}`); process.exit(2); }

function vibeDir(cwd) { return path.join(cwd, '.vibe'); }
function statePath(cwd) { return path.join(vibeDir(cwd), 'state.json'); }

function loadState(cwd) {
  const p = statePath(cwd);
  if (!fs.existsSync(p)) die(`未找到 ${p} —— 先跑 init`);
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (s.schema_version !== SCHEMA_VERSION) die(`state schema v${s.schema_version} ≠ 当前 v${SCHEMA_VERSION}，需迁移`);
  return s;
}

function saveState(cwd, s) {
  s.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath(cwd), JSON.stringify(s, null, 2) + '\n');
}

function copyTemplates(cwd) {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const copied = [];
  for (const f of fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.md'))) {
    const dst = path.join(vibeDir(cwd), f);
    if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(TEMPLATES_DIR, f), dst); copied.push(f); }
  }
  return copied;
}

function cmdInit(cwd, flags) {
  const p = statePath(cwd);
  if (fs.existsSync(p)) {
    console.log('[state] 已初始化过，保持原样（幂等）。当前状态：');
    return cmdStatus(cwd, {});
  }
  const ff = flags['form-factor'] || 'web';
  if (!FORM_FACTORS.includes(ff)) die(`form-factor 须为 ${FORM_FACTORS.join('|')}`);
  fs.mkdirSync(vibeDir(cwd), { recursive: true });
  const s = {
    schema_version: SCHEMA_VERSION,
    idea: flags.idea || '',
    form_factor: ff,
    has_server: String(flags['has-server']) === 'true',
    current_stage: 1,
    gates: {},
    created_at: new Date().toISOString(),
    updated_at: null,
  };
  saveState(cwd, s);
  const copied = copyTemplates(cwd);
  console.log(`[state] 初始化完成：形态=${ff}，自有服务器=${s.has_server ? '是' : '否'}`);
  if (copied.length) console.log(`[state] 已铺产物模板：${copied.join(', ')}`);
  console.log(`[state] 从第 1 关（方向判断）开始。填 .vibe/direction.md 后跑 gate check 1`);
}

function cmdStatus(cwd, flags) {
  const s = loadState(cwd);
  if (flags.json) { console.log(JSON.stringify(s, null, 2)); return; }
  console.log('idea-to-cash · 项目状态');
  console.log(`想法: ${s.idea || '(未填)'}`);
  console.log(`形态: ${s.form_factor} ｜ 自有服务器: ${s.has_server ? '是' : '否'}`);
  const lines = STAGES.map(st => {
    const g = s.gates[st.id];
    let mark = '·';
    if (g?.passed) mark = '✓';
    else if (g?.skipped) mark = '−';
    else if (s.current_stage === st.id) mark = '▶';
    else if (!isActive(st, s)) mark = '(跳)';
    return `  ${mark} ${String(st.id).padStart(2)} ${st.name}（${st.phase}）`;
  });
  console.log(lines.join('\n'));
  if (s.current_stage === 'done') {
    console.log('状态: 已毕业 —— 第一笔收款完成 🎉');
  } else {
    const cur = getStage(s.current_stage);
    console.log(`当前: 第 ${cur.id} 关 · ${cur.name}`);
    console.log(`下一步: 完成产物 .vibe/${cur.artifact}，然后 gate check ${cur.id}`);
  }
}

function cmdAdvance(cwd, flags) {
  const s = loadState(cwd);
  if (s.current_stage === 'done') { console.log('[state] 已毕业，无关可推进'); return; }
  const cur = s.current_stage;
  if (flags['skip-gate']) {
    console.log(`[state] ⚠️ --skip-gate：未过门禁强制推进第 ${cur} 关，已记录在案`);
  } else {
    const r = spawnSync('node', [path.join(__dirname, 'gate.mjs'), 'check', String(cur), '--cwd', cwd], { encoding: 'utf8' });
    process.stdout.write(r.stdout || '');
    if (r.status !== 0) {
      console.error(`[state] 第 ${cur} 关门禁未过，拒绝推进 —— 按上面缺项补产物；确要硬跳用 --skip-gate（后果自负）`);
      process.exit(2);
    }
  }
  s.gates[cur] = { passed: true, at: new Date().toISOString(), ...(flags['skip-gate'] ? { skipped_gate: true } : {}), ...(flags.evidence ? { evidence: flags.evidence } : {}) };
  const nxt = nextActiveStage(cur, s);
  const upper = nxt === 'done' ? 16 : nxt - 1;
  for (let id = cur + 1; id <= upper; id++) {
    if (!s.gates[id]) s.gates[id] = { skipped: true, reason: 'form_factor/has_server 路由' };
  }
  s.current_stage = nxt;
  saveState(cwd, s);
  if (nxt === 'done') console.log(`[state] 第 ${cur} 关通过 —— 全部 16 关完成，毕业 🎉`);
  else console.log(`[state] 第 ${cur} 关通过 → 当前第 ${nxt} 关（${getStage(nxt).name}）`);
}

function cmdRollback(cwd, flags) {
  const to = Number(flags.to);
  if (!Number.isInteger(to) || to < 1 || to > 16) die('rollback 需要 --to <1..16>');
  const s = loadState(cwd);
  for (const id of Object.keys(s.gates)) if (Number(id) >= to) delete s.gates[id];
  s.current_stage = to;
  saveState(cwd, s);
  console.log(`[state] 已回退到第 ${to} 关（${getStage(to).name}），第 ${to} 关及之后的 gate 记录已清除`);
}

function cmdSet(cwd, key, value) {
  const s = loadState(cwd);
  if (key === 'form_factor') {
    if (!FORM_FACTORS.includes(value)) die(`form_factor 须为 ${FORM_FACTORS.join('|')}`);
    s.form_factor = value;
  } else if (key === 'has_server') {
    if (!['true', 'false'].includes(value)) die('has_server 须为 true|false');
    s.has_server = value === 'true';
  } else if (key === 'idea') {
    s.idea = value || '';
  } else die(`不支持的 key：${key}（可用 form_factor|has_server|idea）`);
  saveState(cwd, s);
  console.log(`[state] ${key} = ${value}`);
}

// ---- main ----
const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const cwd = path.resolve(args.flags.cwd || process.cwd());

switch (cmd) {
  case 'init': cmdInit(cwd, args.flags); break;
  case 'status': cmdStatus(cwd, args.flags); break;
  case 'advance': cmdAdvance(cwd, args.flags); break;
  case 'rollback': cmdRollback(cwd, args.flags); break;
  case 'set': {
    const [, key, value] = args._;
    if (!key || value === undefined) die('用法：set <form_factor|has_server|idea> <value>');
    cmdSet(cwd, key, value); break;
  }
  default:
    die('用法：state.mjs <init|status|advance|rollback|set> …（见文件头注释）');
}
