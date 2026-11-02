#!/usr/bin/env node
// client-requirements · 门禁：机判（结构/机械项）+ 模判清单（语义项，交给模型逐条判，须引用原文）
// 用法: node gate.mjs init   [--cwd <dir>]     铺设 .req/ 模板（已存在的文件不覆盖）
//       node gate.mjs status [--cwd <dir>]     报告卡在第几步
//       node gate.mjs check <1..7> [--cwd <dir>]
// 退出码: 0 通过 ｜ 1 机判失败 ｜ 2 用法/文件错误

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.join(HERE, '..', 'assets', 'templates');
const STEPS = [
  null,
  { name: '现场纪要', file: 'intake.md' },
  { name: '角色与诉求', file: 'stakeholders.md' },
  { name: '现状流程', file: 'process.md' },
  { name: '待补问清单', file: 'questions.md' },
  { name: '需求条目', file: 'requirements.md' },
  { name: '范围与验收', file: 'scope.md' },
  { name: '组装 PRD', file: 'prd.md' },
];
const TBD = '【需要确认】';

function die(msg) { console.error(`[gate] ${msg}`); process.exit(2); }

// ---- markdown 解析 ----
const isHint = line => /^\s*（[^（）]*）\s*$/.test(line);
const isBlank = line => /^\s*$/.test(line);

function parseSections(raw, level = 2) {
  const re = new RegExp(`^${'#'.repeat(level)}\\s+(.+?)\\s*$`);
  const sections = [];
  let cur = null;
  raw.split(/\r?\n/).forEach((text, i) => {
    const m = text.match(re);
    if (m) { cur = { title: m[1], lines: [] }; sections.push(cur); }
    else if (cur) cur.lines.push({ text, no: i + 1 });
  });
  return sections;
}
function subSections(sec) {
  const subs = [];
  let cur = null;
  for (const l of sec ? sec.lines : []) {
    const m = l.text.match(/^###\s+(.+?)\s*$/);
    if (m) { cur = { title: m[1], lines: [] }; subs.push(cur); }
    else if (cur) cur.lines.push(l);
  }
  return subs;
}
const findSection = (secs, prefix) => secs.find(s => s.title.startsWith(prefix)) || null;
const contentLines = sec => sec ? sec.lines.filter(l => !isBlank(l.text) && !isHint(l.text)) : [];
const hasContent = sec => contentLines(sec).length > 0;
const quote = (sec, n = 60) => {
  const l = contentLines(sec)[0];
  return l ? l.text.trim().slice(0, n) : '(空)';
};
const listItems = sec => contentLines(sec).filter(l => /^(\d+[.、)）]|[-*])\s*\S/.test(l.text.trim()));
const itemText = l => l.text.trim().replace(/^(\d+[.、)）]|[-*])\s*/, '');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function fieldValue(sec, label) {
  for (const l of contentLines(sec)) {
    const m = l.text.trim().match(new RegExp(`^${escapeRe(label)}[:：]\\s*(.*)$`));
    if (m) return m[1].trim();
  }
  return '';
}
const fieldFilled = (sec, label) => { const v = fieldValue(sec, label); return !!v && !/^[（(]/.test(v); };
// 表格：跳过表头和分隔行，返回单元格数组
function tableRows(sec) {
  const rows = contentLines(sec).map(l => l.text.trim()).filter(t => t.startsWith('|'));
  return rows.slice(2).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
}
const hasDigit = s => /\d/.test(s);
const PLACEHOLDER = /\{[^{}]{0,40}\}/;

function load(cwd, file) {
  const p = path.join(cwd, '.req', file);
  if (!fs.existsSync(p)) return null;
  return parseSections(fs.readFileSync(p, 'utf8'));
}
const missing = file => ({ checks: [{ label: `${file} 存在`, pass: false, detail: `缺 .req/${file}，先跑 gate.mjs init` }], model: [] });
const fail = (label, pass, detail = '') => ({ label, pass, detail });

// ---- 第 1 步 · 现场纪要 ----
function gate1(cwd) {
  const s = load(cwd, 'intake.md');
  if (!s) return missing('intake.md');
  const info = findSection(s, '基本信息'), said = findSection(s, '客户原话'),
        facts = findSection(s, '事实'), mat = findSection(s, '真实材料'), guess = findSection(s, '推断');
  const checks = [fail('intake.md 存在', true)];
  const bid = fieldValue(info, '业务 ID');
  checks.push(fail('「业务 ID」格式 REQ-<年>-<4位序号>', /^REQ-\d{4}-\d{4}$/.test(bid), bid ? `当前为 ${bid}` : '为空，用 opc-business-registry 分配'));
  for (const f of ['客户', '行业', '拜访日期', '参会人']) checks.push(fail(`「${f}」已填`, fieldFilled(info, f), '为空'));
  const quotes = listItems(said).filter(l => /[:：]\s*[「“"]/.test(l.text));
  checks.push(fail('客户原话 ≥3 条且带说话人', quotes.length >= 3, `仅 ${quotes.length} 条符合「说话人：「原话」」格式`));
  const fs_ = listItems(facts);
  const noSrc = fs_.filter(l => !/出处[:：]\s*\S/.test(l.text));
  checks.push(fail('事实 ≥3 条', fs_.length >= 3, `仅 ${fs_.length} 条`));
  checks.push(fail('每条事实都有「出处：」', fs_.length > 0 && noSrc.length === 0, noSrc.map(l => `第 ${l.no} 行`).join('、')));
  const vague = fs_.filter(l => /应该|可能|估计|大概|也许|似乎|好像/.test(l.text));
  checks.push(fail('事实段没有推断词（应该/可能/估计…）', vague.length === 0, vague.map(l => `第 ${l.no} 行 → 移到「推断」`).join('、')));
  checks.push(fail('真实材料 ≥1 项', listItems(mat).length >= 1, '没有真实材料就把"能否提供样例"列成 T1 问题'));
  const model = [
    `「客户原话」是原句而不是你的转述 ｜ 原文: 「${quote(said)}」`,
    `每条「推断」都会在第 4 步变成一个问题 ｜ 推断: 「${quote(guess)}」`,
  ];
  return { checks, model };
}

// ---- 第 2 步 · 角色与诉求 ----
function gate2(cwd) {
  const s = load(cwd, 'stakeholders.md');
  if (!s) return missing('stakeholders.md');
  const table = findSection(s, '角色表'), conflict = findSection(s, '冲突'), boss = findSection(s, '拍板人');
  const rows = tableRows(table).filter(r => r[1]);
  const types = new Set(rows.flatMap(r => (r[2] || '').split(/[\/、,，\s]+/).filter(Boolean)));
  const need = ['出钱', '使用', '审批', '对接IT'];
  const lack = need.filter(t => !types.has(t));
  const checks = [
    fail('stakeholders.md 存在', true),
    fail('角色表 ≥2 人', rows.length >= 2, `仅 ${rows.length} 人`),
    fail('四类角色都有人（出钱/使用/审批/对接IT）', lack.length === 0, `缺 ${lack.join('/')} —— 不知道是谁就列成 T1 问题`),
    fail('每个角色「最在意」「最怕」都已填', rows.length > 0 && rows.every(r => r[3] && r[4]), '有空格'),
    fail('「冲突」段已填', hasContent(conflict), '没有冲突也要写理由'),
  ];
  for (const f of ['需求拍板', '验收签字', '付款审批']) checks.push(fail(`「${f}」已填`, fieldFilled(boss, f), '为空'));
  const users = rows.filter(r => (r[2] || '').includes('使用'));
  const unseen = users.filter(r => !/^(是|见过|已见)/.test(r[5] || ''));
  checks.push(fail('至少见过一位「使用」角色', users.length > 0 && unseen.length < users.length,
    unseen.length === users.length && users.length ? '一个都没见过，先补访或列入 T1' : '没有「使用」角色'));
  const model = [
    `至少见过一位"使用"角色 ｜ 使用者: ${users.map(r => `${r[1]}（是否见过：${r[5] || '空'}）`).join('；') || '(无)'}${unseen.length === users.length && users.length ? ' ⚠ 一个都没见过' : ''}`,
    `「冲突」写清了谁说了算 ｜ 原文: 「${quote(conflict)}」`,
  ];
  return { checks, model };
}

// ---- 第 3 步 · 现状流程 ----
function gate3(cwd) {
  const s = load(cwd, 'process.md');
  if (!s) return missing('process.md');
  const asis = findSection(s, 'As-Is'), pain = findSection(s, '痛点'), tobe = findSection(s, 'To-Be');
  const a = listItems(asis), p = listItems(pain), t = listItems(tobe);
  const noActor = a.filter(l => { const parts = itemText(l).split('｜').map(x => x.trim()); return parts.length < 2 || !parts[1]; });
  const MARK = /【(不变|改|新增|取消)】/;
  const unmarked = t.filter(l => !MARK.test(l.text));
  const checks = [
    fail('process.md 存在', true),
    fail('As-Is ≥3 步', a.length >= 3, `仅 ${a.length} 步`),
    fail('As-Is 每步有执行人（步骤 ｜ 执行人 ｜ 工具 ｜ 耗时）', a.length > 0 && noActor.length === 0, noActor.map(l => `第 ${l.no} 行`).join('、')),
    fail('痛点 ≥1 条且每条含数字', p.length >= 1 && p.every(l => hasDigit(l.text)), p.length ? '有痛点没量化' : '为空'),
    fail('To-Be 非空（允许自动化缩短流程）', t.length > 0, '为空'),
    fail('To-Be 每步标【不变/改/新增/取消】', t.length > 0 && unmarked.length === 0, unmarked.map(l => `第 ${l.no} 行`).join('、')),
    fail('To-Be 至少一步有变化', t.some(l => /【(改|新增|取消)】/.test(l.text)), '全是【不变】，这个项目做什么？'),
  ];
  const model = [
    `As-Is 写的是客户现在怎么干，不是你设想的流程 ｜ 第一步: 「${a[0] ? itemText(a[0]).slice(0, 60) : '(缺)'}」`,
    `每个【改】【新增】都对应一条痛点 ｜ 痛点: 「${quote(pain)}」`,
  ];
  return { checks, model };
}


// ---- 第 4 步 · 待补问清单（报价闸门）----
function questionRows(cwd) {
  const s = load(cwd, 'questions.md');
  if (!s) return null;
  return tableRows(findSection(s, '问题表')).filter(r => r[2]);
}
export function questionsOpen(cwd, tier) {
  const rows = questionRows(cwd) || [];
  return rows.filter(r => r[1] === tier && !(r[5] && r[6])).map(r => r[0] || '(无编号)');
}
export function t1Open(cwd) {
  return questionsOpen(cwd, 'T1');
}
function gate4(cwd) {
  const rows = questionRows(cwd);
  if (!rows) return missing('questions.md');
  const s = load(cwd, 'questions.md');
  const badTier = rows.filter(r => !/^T[123]$/.test(r[1] || ''));
  const t1 = rows.filter(r => r[1] === 'T1');
  const open = t1Open(cwd);
  const noWhy = rows.filter(r => !r[3]);
  const checks = [
    fail('questions.md 存在', true),
    fail('档位只能是 T1/T2/T3', rows.length > 0 && badTier.length === 0, badTier.map(r => r[0] || '?').join('、')),
    fail('每题都写了「为什么要问」', rows.length > 0 && noWhy.length === 0, noWhy.map(r => r[0] || '?').join('、')),
    fail('至少 1 个 T1', t1.length >= 1, '没有 T1 说明你还没想清楚报价风险在哪'),
    fail('T1 全部已答且有出处（不清零不报价）', t1.length > 0 && open.length === 0, `未清零: ${open.join('、')}`),
  ];
  const model = [
    `每题的「为什么要问」确实会改变报价、范围或设计（不是为问而问） ｜ 例: ${rows[0] ? `${rows[0][0]}「${rows[0][3]}」` : '(无)'}`,
    `T1 的答案来自客户本人，不是你替客户答的 ｜ 例: ${t1[0] ? `${t1[0][0]} 答「${t1[0][5]}」出处「${t1[0][6]}」` : '(无)'}`,
    `「本轮结论」写清了哪些推断被推翻 ｜ 原文: 「${quote(findSection(s, '本轮结论'))}」`,
  ];
  return { checks, model };
}

// ---- 第 5 步 · 需求条目 ----
const JUDGE_WORDS = /能|不能|可以|不可|一致|为0|为 0|对照|成功|失败|拒绝|拦截|显示|生成|导出|通过/;
const VAGUE_WORDS = /好用|稳定|快速|智能|友好|美观|方便|流畅|高效/;
function reqItems(cwd) {
  const s = load(cwd, 'requirements.md');
  if (!s) return null;
  return subSections(findSection(s, '功能需求'))
    .filter(x => /^F\d+/.test(x.title))
    .map(x => ({ id: x.title.match(/^F\d+/)[0], title: x.title, sec: x }));
}
function gate5(cwd) {
  const items = reqItems(cwd);
  if (!items) return missing('requirements.md');
  const s = load(cwd, 'requirements.md');
  const checks = [fail('requirements.md 存在', true), fail('功能需求 ≥1 条（### F01 名称）', items.length >= 1, '为空')];
  const named = items.filter(it => it.title.replace(/^F\d+/, '').trim());
  checks.push(fail('每条需求标题有名称', items.length > 0 && named.length === items.length, items.filter(it => !named.includes(it)).map(it => it.id).join('、')));
  for (const it of items) {
    const v = k => fieldValue(it.sec, k);
    const f = k => fieldFilled(it.sec, k);
    const errs = [];
    if (!/^P[012]$/.test(v('优先级'))) errs.push('优先级不是 P0/P1/P2');
    for (const k of ['类型', '来源', '使用者', '场景', '验收']) if (!f(k)) errs.push(`「${k}」为空`);
    for (const k of ['输入样例', '输出样例']) {
      if (!f(k)) errs.push(`「${k}」为空`);
      else if (PLACEHOLDER.test(v(k))) errs.push(`「${k}」含 {占位符}`);
    }
    const acc = v('验收');
    if (v('优先级') === 'P0' && acc) {
      if (!hasDigit(acc) && !JUDGE_WORDS.test(acc)) errs.push('P0 验收不可判定（无数字、无判定词）');
      else if (!hasDigit(acc) && VAGUE_WORDS.test(acc)) errs.push('P0 验收只有形容词（好用/稳定/快速…）');
    }
    if (/AI/i.test(v('类型'))) {
      for (const k of ['资料来源', '效果指标', '兜底', '审核']) if (!f(k)) errs.push(`AI 项「${k}」为空`);
      if (f('效果指标') && !hasDigit(v('效果指标'))) errs.push('「效果指标」没有数字');
    }
    checks.push(fail(`${it.title} 字段完整、样例真实、验收可判定`, errs.length === 0, errs.join('；')));
  }
  const nf = findSection(s, '非功能需求');
  for (const k of ['性能', '安全', '兼容', '数据保留']) checks.push(fail(`非功能「${k}」已填`, fieldFilled(nf, k), '为空，确实无要求就写"无特殊要求"'));
  const edge = listItems(findSection(s, '边界'));
  checks.push(fail('边界 ≥3 条', edge.length >= 3, `仅 ${edge.length} 条`));
  const first = items[0];
  const model = [
    `输入/输出样例是客户的真实数据，不是编的 ｜ ${first ? `${first.id} 输入: 「${fieldValue(first.sec, '输入样例').slice(0, 60)}」` : '(无)'}`,
    `每条需求都能追溯到 process.md 的某个【改】【新增】步骤 ｜ ${items.map(it => `${it.id} 来源「${fieldValue(it.sec, '来源').slice(0, 20)}」`).join('；') || '(无)'}`,
    `P0 只放"没有它客户就不付钱"的条目 ｜ P0: ${items.filter(it => fieldValue(it.sec, '优先级') === 'P0').map(it => it.id).join('、') || '(无)'}`,
  ];
  return { checks, model };
}

// ---- 第 6 步 · 范围与验收 ----
function gate6(cwd) {
  const s = load(cwd, 'scope.md');
  if (!s) return missing('scope.md');
  const items = reqItems(cwd) || [];
  const p0 = items.filter(it => fieldValue(it.sec, '优先级') === 'P0').map(it => it.id);
  const inScope = listItems(findSection(s, '报价内'));
  const inText = inScope.map(itemText).join('\n');
  const notIn = p0.filter(id => !new RegExp(`\\b${id}\\b`).test(inText));
  const cases = tableRows(findSection(s, '验收用例')).filter(r => r[1]);
  const covered = new Set(cases.filter(r => r[3]).flatMap(r => r[1].match(/F\d+/g) || []));
  const noCase = p0.filter(id => !covered.has(id));
  const exclude = listItems(findSection(s, '不含'));
  const rule = findSection(s, '变更规则');
  const open = t1Open(cwd);
  const checks = [
    fail('scope.md 存在', true),
    fail('requirements.md 里有 P0', p0.length >= 1, '没有 P0 就没有可验收的东西，回第 5 步'),
    fail('报价内 ≥1 条', inScope.length >= 1, '为空'),
    fail('每条 P0 都在报价内', p0.length > 0 && notIn.length === 0, `缺: ${notIn.join('、')}`),
    fail('每条 P0 都有验收用例且期望结果已填', p0.length > 0 && noCase.length === 0, `缺: ${noCase.join('、')}`),
    fail('不含 ≥3 条', exclude.length >= 3, `仅 ${exclude.length} 条`),
  ];
  for (const k of ['提出方式', '评估时限', '计价方式', '决定人']) checks.push(fail(`变更规则「${k}」已填`, fieldFilled(rule, k), '为空'));
  checks.push(fail('第 4 步 T1 已清零', open.length === 0, `未清零: ${open.join('、')}`));
  const model = [
    `「不含」覆盖了客户最可能误以为包含的内容（数据迁移、培训、硬件、运维、二期功能…） ｜ 原文: ${exclude.map(itemText).slice(0, 3).join('；') || '(无)'}`,
    `验收用例的期望结果，客户的验收人能自己照着判 ｜ 例: ${cases[0] ? `${cases[0][0]}「${cases[0][3]}」` : '(无)'}`,
  ];
  return { checks, model };
}

// ---- 第 7 步 · 组装 PRD ----
const PRD_SECTIONS = ['文档信息', '背景与目标', '角色', '现状与目标流程', '功能需求', '非功能需求', 'AI 效果', '范围与验收', '变更规则', '风险与待定'];
function gate7(cwd) {
  const s = load(cwd, 'prd.md');
  if (!s) return missing('prd.md');
  const questionsExist = questionRows(cwd) !== null;
  const t2Open = questionsOpen(cwd, 'T2');
  const checks = [
    fail('prd.md 存在', true),
    fail('questions.md 存在', questionsExist, '先完成第 4 步'),
    fail('第 4 步 T2 已清零', questionsExist && t2Open.length === 0, `未清零: ${t2Open.join('、')}`),
  ];
  const absent = PRD_SECTIONS.filter(t => !findSection(s, t));
  checks.push(fail('十个章节齐全', absent.length === 0, `缺: ${absent.join('、')}`));
  const empty = PRD_SECTIONS.filter(t => {
    const sec = findSection(s, t);
    if (!sec) return false;
    if (t === '非功能需求') return !['性能', '安全', '兼容'].some(k => fieldFilled(sec, k));
    if (t === '文档信息') return !fieldFilled(sec, '项目');
    return !hasContent(sec);
  });
  checks.push(fail('每个章节都有内容', empty.length === 0, `空: ${empty.join('、')}`));
  checks.push(fail('「版本」已填', fieldFilled(findSection(s, '文档信息'), '版本'), '为空'));
  const residue = [];
  const dir = path.join(cwd, '.req');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (line.includes(TBD) && !isHint(line)) residue.push(`${f}:${i + 1}`);
    });
  }
  checks.push(fail(`.req/ 下没有残留${TBD}`, residue.length === 0, residue.slice(0, 8).join('、')));
  const ph = s.flatMap(sec => sec.lines).filter(l => !isHint(l.text) && PLACEHOLDER.test(l.text));
  checks.push(fail('prd.md 没有 {占位符}', ph.length === 0, ph.slice(0, 5).map(l => `第 ${l.no} 行`).join('、')));
  const ids = (reqItems(cwd) || []).map(it => it.id);
  const prdText = (findSection(s, '功能需求')?.lines || []).map(l => l.text).join('\n');
  const prdIds = [...new Set(prdText.match(/F\d+/g) || [])];
  const model = [
    `PRD 的 F 编号与 requirements.md 一致，没有新增也没有遗漏 ｜ requirements: ${ids.join('、') || '(无)'}；prd: ${prdIds.join('、') || '(无)'}`,
    `「背景与目标」的目标带数字，且能在验收用例里找到对应 ｜ 原文: 「${quote(findSection(s, '背景与目标'))}」`,
    `「AI 效果」写了指标、兜底和人工审核 ｜ 原文: 「${quote(findSection(s, 'AI 效果'))}」`,
  ];
  return { checks, model };
}

// ---- 命令 ----
const GATES = [null, gate1, gate2, gate3, gate4, gate5, gate6, gate7];

function argValue(args, flag) {
  const i = args.indexOf(flag);
  if (i < 0) return null;
  if (!args[i + 1]) die(`${flag} 缺参数`);
  return args[i + 1];
}

function cmdInit(cwd) {
  const dir = path.join(cwd, '.req');
  fs.mkdirSync(dir, { recursive: true });
  const copied = [], skipped = [];
  for (const step of STEPS.slice(1)) {
    const dst = path.join(dir, step.file);
    if (fs.existsSync(dst)) { skipped.push(step.file); continue; }
    fs.copyFileSync(path.join(TEMPLATES, step.file), dst);
    copied.push(step.file);
  }
  console.log(`[init] ${dir}`);
  console.log(`  复制: ${copied.join(', ') || '(无)'}`);
  console.log(`  跳过(已存在): ${skipped.join(', ') || '(无)'}`);
  console.log('  下一步: 按 references/step-1-intake.md 填 intake.md，然后 gate.mjs check 1');
  return 0;
}

function cmdStatus(cwd) {
  if (!fs.existsSync(path.join(cwd, '.req'))) { console.log('STATUS: 未初始化 —— 先跑 gate.mjs init'); return 1; }
  for (let n = 1; n <= 7; n++) {
    const { checks } = GATES[n](cwd);
    const bad = checks.filter(c => !c.pass);
    if (bad.length) {
      console.log(`STATUS: 卡在第 ${n} 步 · ${STEPS[n].name}（.req/${STEPS[n].file}）`);
      bad.slice(0, 5).forEach(c => console.log(`  [ ] ${c.label}${c.detail ? ` —— ${c.detail}` : ''}`));
      if (bad.length > 5) console.log(`  …另有 ${bad.length - 5} 项，跑 gate.mjs check ${n} 看全部`);
      return 1;
    }
  }
  console.log('STATUS: 7 步机判全部通过 —— 跑 check 7 完成模判后，可把 prd.md 交给工程层与验收层');
  return 0;
}

function cmdCheck(cwd, n) {
  if (!(n >= 1 && n <= 7)) die('check 需要 1..7');
  if (!fs.existsSync(path.join(cwd, '.req'))) die(`${cwd} 下没有 .req/，先跑 gate.mjs init`);
  const { checks, model } = GATES[n](cwd);
  const ok = checks.every(c => c.pass);
  console.log(`GATE ${n} · ${STEPS[n].name} —— 机判: ${ok ? 'PASS' : 'FAIL'}`);
  for (const c of checks) console.log(`  [${c.pass ? 'x' : ' '}] ${c.label}${!c.pass && c.detail ? ` —— ${c.detail}` : ''}`);
  if (ok && model.length) {
    console.log('MODEL-CHECK（模型按证据判定，须引用原文；任一不合格即拒绝推进）:');
    model.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  }
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'}`);
  if (ok) console.log(`OVERALL: ${model.length ? 'PENDING-MODEL-CHECK' : 'PASS'}`);
  return ok ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  const cwd = path.resolve(argValue(args, '--cwd') || process.cwd());
  const cmd = args[0];
  if (cmd === 'init') return cmdInit(cwd);
  if (cmd === 'status') return cmdStatus(cwd);
  if (cmd === 'check') return cmdCheck(cwd, Number(args[1]));
  die('用法: gate.mjs init|status|check <1..7> [--cwd <dir>]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
