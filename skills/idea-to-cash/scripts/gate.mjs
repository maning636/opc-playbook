#!/usr/bin/env node
// idea-to-cash · 门禁：机判（结构/机械项）+ 模判清单（语义项，输出给模型逐条判，须引用原文）
// 用法: node gate.mjs check <1..16> [--cwd <dir>]
// 退出码: 0 机判通过/该关被路由跳过 ｜ 1 机判失败 ｜ 2 用法/文件错误

import fs from 'node:fs';
import path from 'node:path';
import { getStage, isActive } from './stages.mjs';

function die(msg) { console.error(`[gate] ${msg}`); process.exit(2); }

// ---- markdown 解析 ----
const isHint = line => /^\s*（[^（）]*）\s*$/.test(line);  // 整行被全角括号包住才算模板提示行；「（模拟）xxx」这类内容行不误伤
const isBlank = line => /^\s*$/.test(line);

function parseSections(raw) {
  const lines = raw.split('\n');
  const sections = [];
  let cur = null;
  lines.forEach((text, i) => {
    const m = text.match(/^##\s+(.+?)\s*$/);
    if (m) { cur = { title: m[1], lines: [] }; sections.push(cur); }
    else if (cur) cur.lines.push({ text, no: i + 1 });
  });
  return sections;
}
const findSection = (secs, prefix) => secs.find(s => s.title.startsWith(prefix)) || null;
const contentLines = sec => sec ? sec.lines.filter(l => !isBlank(l.text) && !isHint(l.text)) : [];
const hasContent = sec => contentLines(sec).length > 0;
const quote = sec => {
  const l = contentLines(sec)[0];
  return l ? l.text.trim().slice(0, 60) : '(空)';
};
const listItems = sec => contentLines(sec).filter(l => /^(\d+[.、)）]|[-*])\s*\S/.test(l.text.trim()));
const countNumbers = sec => (contentLines(sec).map(l => l.text).join(' ').match(/\d+(\.\d+)?/g) || []).length;
const checkedCount = sec => contentLines(sec).filter(l => /^- \[[xX]\]/.test(l.text.trim())).length;
const uncheckedItems = sec => contentLines(sec).filter(l => /^- \[ \]/.test(l.text.trim()));
// 「字段: 值」判定；值为空或以（开头（提示文本）视为未填
function fieldFilled(sec, label) {
  for (const l of contentLines(sec)) {
    const m = l.text.trim().match(new RegExp(`^${label}[:：]\\s*(.*)$`));
    if (m) { const v = m[1].trim(); return !!v && !/^[（(]/.test(v); }
  }
  return false;
}
const fieldValue = (sec, label) => {
  for (const l of contentLines(sec)) {
    const m = l.text.trim().match(new RegExp(`^${label}[:：]\\s*(.*)$`));
    if (m) return m[1].trim();
  }
  return '';
};

function loadArtifact(cwd, file) {
  const p = path.join(cwd, '.vibe', file);
  if (!fs.existsSync(p)) return null;
  return parseSections(fs.readFileSync(p, 'utf8'));
}
const missing = file => ({ checks: [{ label: `${file} 存在`, pass: false, detail: `缺 .vibe/${file}` }], model: [] });

// ---- 关 1-3（M1 已验）----
function gate1(cwd) {
  const secs = loadArtifact(cwd, 'direction.md');
  if (!secs) return missing('direction.md');
  const checks = [{ label: 'direction.md 存在', pass: true }];
  const person = findSection(secs, '具体的人');
  const reason = findSection(secs, '切换理由');
  const action = findSection(secs, '第一个动作');
  checks.push({ label: '「具体的人」已填', pass: hasContent(person), detail: '段落为空' });
  checks.push({ label: '「切换理由」已填', pass: hasContent(reason), detail: '段落为空' });
  checks.push({ label: '「第一个动作」已填', pass: hasContent(action), detail: '段落为空' });
  const model = [
    `具体的人是真人画像（职业/场景可见），不是"用户/人群"这类泛称 ｜ 原文: 「${quote(person)}」`,
    `切换理由含一个数字或具体动作，不是形容词堆叠 ｜ 原文: 「${quote(reason)}」`,
    `第一个动作今天可执行，且不是"开发/做 MVP" ｜ 原文: 「${quote(action)}」`,
  ];
  return { checks, model };
}

function gate2(cwd) {
  const secs = loadArtifact(cwd, 'direction.md');
  if (!secs) return missing('direction.md');
  const checks = [{ label: 'direction.md 存在', pass: true }];
  const q = n => findSection(secs, `Q${n}`);
  for (let n = 1; n <= 5; n++) checks.push({ label: `Q${n} 段存在且已填`, pass: hasContent(q(n)), detail: '段落缺失或为空' });
  const q2n = listItems(q(2)).length, q4n = listItems(q(4)).length, q5n = countNumbers(q(5));
  checks.push({ label: 'Q2 现有解法 ≥3 条', pass: q2n >= 3, detail: `仅 ${q2n} 条` });
  checks.push({ label: 'Q4 具体渠道 ≥2 条', pass: q4n >= 2, detail: `仅 ${q4n} 条` });
  checks.push({ label: 'Q5 含 ≥4 个数字（成本/定价/毛利/用户数）', pass: q5n >= 4, detail: `仅 ${q5n} 个数字` });
  const model = [
    `Q2 是"他手上已有的办法"（含土办法/忍着），不是竞品吐槽 ｜ 原文: 「${quote(q(2))}」`,
    `Q3 是一个数字或具体动作 ｜ 原文: 「${quote(q(3))}」`,
    `Q4 渠道具体到"哪个群/哪个话题/哪个关键词"，不是"社交媒体/内容营销" ｜ 原文: 「${quote(q(4))}」`,
    `Q5 结论能落到"要多少付费用户才活得下去" ｜ 原文: 「${quote(q(5))}」`,
  ];
  return { checks, model };
}

function gate3(cwd) {
  const secs = loadArtifact(cwd, 'vdf.md');
  if (!secs) return missing('vdf.md');
  const checks = [{ label: 'vdf.md 存在', pass: true }];
  const V = findSection(secs, 'V 场景'), D = findSection(secs, 'D 数据'),
        F = findSection(secs, 'F 操作流程'), B = findSection(secs, '边界');
  checks.push({ label: '四段齐全（V/D/F/边界）', pass: !!(V && D && F && B), detail: `缺 ${[!V && 'V', !D && 'D', !F && 'F', !B && '边界'].filter(Boolean).join('/')}` });
  if (D) {
    const ph = contentLines(D).find(l => /\{[^{}]{0,40}\}/.test(l.text));
    checks.push({ label: 'D 段无 {} 占位符', pass: !ph, detail: ph ? `第 ${ph.no} 行发现 \`${ph.text.trim().match(/\{[^{}]{0,40}\}/)[0]}\`` : '' });
    const dText = contentLines(D).map(l => l.text.trim());
    const filled = label => {
      const i = dText.findIndex(t => t.startsWith(label));
      if (i < 0) return false;
      const inline = dText[i].replace(new RegExp(`^${label}[:：]?`), '').trim();
      if (inline) return true;
      const next = dText[i + 1];
      return !!next && !/^(输入示例|输出示例|映射关系)/.test(next);
    };
    checks.push({ label: '「输入示例」有真实内容', pass: filled('输入示例'), detail: '为空' });
    checks.push({ label: '「输出示例」有真实内容', pass: filled('输出示例'), detail: '为空' });
  }
  if (B) {
    const n = listItems(B).length;
    checks.push({ label: '边界 ≥3 条', pass: n >= 3, detail: `仅 ${n} 条 —— 少于 3 条说明还没想清楚"不做什么"` });
  }
  const model = [
    `输入/输出示例是真实数据样例，不是规则描述或占位描述 ｜ 原文: 「${D ? quote(D) : '(缺)'}」`,
    `F 含失败处理，且步骤是用户视角的操作序列 ｜ 原文: 「${F ? quote(F) : '(缺)'}」`,
  ];
  return { checks, model };
}

// ---- 关 4-16（M2）----
function gate4(cwd) {
  const secs = loadArtifact(cwd, 'build-log.md');
  if (!secs) return missing('build-log.md');
  const run = findSection(secs, '跑通确认');
  const checks = [
    { label: 'build-log.md 存在', pass: true },
    { label: '项目已开 Git（.git 存在）', pass: fs.existsSync(path.join(cwd, '.git')), detail: '未初始化 git —— 改坏了没得退' },
    { label: '「跑通确认」两项均已勾选', pass: checkedCount(run) >= 2, detail: `仅勾 ${checkedCount(run)}/2` },
    { label: '「工具与环境」已填', pass: hasContent(findSection(secs, '工具与环境')), detail: '为空' },
  ];
  return { checks, model: [] };
}

function gate5(cwd) {
  const secs = loadArtifact(cwd, 'validation.md');
  if (!secs) return missing('validation.md');
  const way = findSection(secs, '验证方式'), data = findSection(secs, '数据'), concl = findSection(secs, '结论');
  const checks = [
    { label: 'validation.md 存在', pass: true },
    { label: '「验证方式」已填', pass: hasContent(way), detail: '为空' },
    { label: '「数据」含真实数字', pass: countNumbers(data) >= 1, detail: '没有任何数字 —— 验证动作可能没真做' },
    { label: '「结论」已填', pass: hasContent(concl), detail: '为空' },
  ];
  const model = [
    `数据像真实执行过的（有渠道/人数/点击），不是拍的 ｜ 原文: 「${quote(data)}」`,
    `结论与数据自洽（点的人少却写"继续做"要说明理由） ｜ 原文: 「${quote(concl)}」`,
  ];
  return { checks, model };
}

function gate6(cwd) {
  const secs = loadArtifact(cwd, 'blueprint.md');
  if (!secs) return missing('blueprint.md');
  const mods = findSection(secs, '模块列表'), flow = findSection(secs, '数据流'),
        contract = findSection(secs, '对接契约'), gap = findSection(secs, '与第一版的差距');
  const fast = mods && contentLines(mods).some(l => l.text.includes('豁免拆分'));
  const n = listItems(mods).length;
  const hasCode = contract && contract.lines.some(l => l.text.trim().startsWith('```')) &&
    (() => { // 代码块内有非空行
      const ls = contract.lines; let inside = false;
      for (const l of ls) {
        if (l.text.trim().startsWith('```')) { inside = !inside; continue; }
        if (inside && l.text.trim()) return true;
      }
      return false;
    })();
  const checks = [
    { label: 'blueprint.md 存在', pass: true },
    { label: '四段齐全（模块/数据流/契约/差距）', pass: !!(mods && flow && contract && gap), detail: '有段缺失' },
    { label: fast ? '模块拆分：fast 豁免（单功能点）' : '模块数 3-7 个', pass: fast || (n >= 3 && n <= 7), detail: `当前 ${n} 个` },
    { label: '「数据流」已填', pass: hasContent(flow), detail: '为空' },
    { label: '对接契约代码块非空', pass: !!hasCode, detail: '契约代码块为空 —— 单位/类型没钉死，返工率最高的就是这' },
    { label: '「与第一版的差距」已填（无差距写"无"）', pass: hasContent(gap), detail: '为空' },
  ];
  const model = [
    `模块独立性：删掉任一模块，其他模块不报错（口试） ｜ 原文: 「${quote(mods)}」`,
    `契约字段带类型和单位（金额分/元、日期格式钉死） ｜ 引用契约代码块内容判定`,
  ];
  return { checks, model };
}

function gate7(cwd) {
  const secs = loadArtifact(cwd, 'crap-check.md');
  if (!secs) return missing('crap-check.md');
  const focus = findSection(secs, '第一屏焦点'), crap = findSection(secs, 'CRAP 自查');
  const c = checkedCount(crap);
  const checks = [
    { label: 'crap-check.md 存在', pass: true },
    { label: '「第一屏焦点」已填', pass: hasContent(focus), detail: '为空' },
    { label: 'CRAP 四项勾选 ≥3', pass: c >= 3, detail: `仅勾 ${c}/4` },
  ];
  const model = [
    `焦点是具体的那一个（大标题/主按钮/细节图），不是"整体好看" ｜ 原文: 「${quote(focus)}」`,
  ];
  return { checks, model };
}

function gate8(cwd) {
  const secs = loadArtifact(cwd, 'review.md');
  if (!secs) return missing('review.md');
  const parts = ['审安全', '审边界', '审逻辑', '审性能'].map(p => [p, findSection(secs, p)]);
  const checks = [{ label: 'review.md 存在', pass: true }];
  for (const [name, sec] of parts) {
    checks.push({ label: `「${name}」有 ≥1 条已处理（- [x]）`, pass: checkedCount(sec) >= 1, detail: '没有已处理记录' });
  }
  const manual = findSection(secs, '关键路径手测记录');
  checks.push({ label: '「关键路径手测记录」已填', pass: hasContent(manual), detail: '为空 —— 出错代价最大的路径必须亲手走' });
  const model = [
    `已处理项是具体动作（改了哪、怎么防），不是"已检查"三个字 ｜ 原文: 「${quote(parts[0][1])}」`,
    `手测覆盖了钱/数据/对外发送这类出错代价最大的路径 ｜ 原文: 「${quote(manual)}」`,
  ];
  return { checks, model };
}

function launchGate(cwd, sectionPrefix, fields, boxTotal) {
  const secs = loadArtifact(cwd, 'launch.md');
  if (!secs) return missing('launch.md');
  const sec = findSection(secs, sectionPrefix);
  if (!sec) return { checks: [{ label: `「${sectionPrefix}」段存在`, pass: false, detail: 'launch.md 缺该段' }], model: [] };
  const checks = [{ label: `「${sectionPrefix}」段存在`, pass: true }];
  for (const f of fields) checks.push({ label: `「${f}」已填`, pass: fieldFilled(sec, f), detail: '为空或还是提示文本' });
  const c = checkedCount(sec);
  checks.push({ label: `清单 ${boxTotal} 项全部勾选`, pass: c >= boxTotal, detail: `仅勾 ${c}/${boxTotal}${uncheckedItems(sec)[0] ? ` —— 未勾如「${uncheckedItems(sec)[0].text.trim().slice(6, 40)}」` : ''}` });
  return { checks, model: [] };
}

const gate9 = cwd => {
  const r = launchGate(cwd, 'Web 上线', ['部署方式', '域名', '备案决策'], 5);
  r.model = [
    `备案决策与用户市场自洽（主打大陆用户 + 大陆服务器 → 备案应已启动） ｜ 引用「备案决策」原文判定`,
  ];
  return r;
};
const gate10 = cwd => launchGate(cwd, '后端运维', ['服务器配置'], 5);
const gate11 = cwd => launchGate(cwd, 'App / 小程序上架', ['目标平台'], 3);
const gate12 = cwd => launchGate(cwd, '内网访问', ['方案'], 4);

function gate13(cwd) {
  const secs = loadArtifact(cwd, 'pricing.md');
  if (!secs) return missing('pricing.md');
  const three = findSection(secs, '定价三问'), model_ = findSection(secs, '模型与价格'),
        anchor = findSection(secs, '锚点'), verify = findSection(secs, '验证计划');
  const priceHasNum = label => /\d/.test(fieldValue(model_, label));
  const checks = [
    { label: 'pricing.md 存在', pass: true },
    { label: '三问已答（给谁/替代方案/省多少）', pass: ['给谁用', '替代方案花多少', '用了省下/多赚多少'].every(f => fieldFilled(three, f)), detail: '有问未答' },
    { label: '「定价模型」已选', pass: fieldFilled(model_, '定价模型'), detail: '为空' },
    { label: '首发价/正式价是具体数字', pass: priceHasNum('首发价') && priceHasNum('正式价'), detail: '价格缺数字' },
    { label: '「涨价节点」已定', pass: fieldFilled(model_, '涨价节点'), detail: '为空 —— 定低了想涨极难，先想好节点' },
    { label: '「锚点」已填（不拆档也要写明理由）', pass: hasContent(anchor), detail: '为空' },
    { label: '「验证计划」已填', pass: hasContent(verify), detail: '为空' },
  ];
  const model = [
    `是价值定价不是成本定价：价格落在"替代方案价上限"之内、由三问答案支撑 ｜ 原文: 「${quote(three)}」`,
    `验证计划里有"真付钱"级别的证据来源（预售/真单），不只是口头问 ｜ 原文: 「${quote(verify)}」`,
  ];
  return { checks, model };
}

function gate14(cwd) {
  const secs = loadArtifact(cwd, 'payment.md');
  if (!secs) return missing('payment.md');
  const ch = findSection(secs, '收款渠道'), lp = findSection(secs, '落地页三块'), link = findSection(secs, '支付链路四件事');
  const boxes = contentLines(link).filter(l => /^- \[/.test(l.text.trim()));
  const moneyBox = boxes.find(l => l.text.includes('真钱'));
  const checks = [
    { label: 'payment.md 存在', pass: true },
    { label: '「渠道」已填', pass: fieldFilled(ch, '渠道'), detail: '为空或还是提示文本' },
    { label: '落地页三块已填（价值/证明/CTA）', pass: ['价值主张（一句话）', '社会证明（放什么证据）', '单一 CTA（按钮文案）'].every(f => fieldFilled(lp, f)), detail: '有块未填' },
    { label: '支付链路清单全部勾选', pass: checkedCount(link) >= boxes.length && boxes.length >= 5, detail: `仅勾 ${checkedCount(link)}/${boxes.length}` },
    { label: '「用真钱自己测过一笔」已勾（必测）', pass: !!moneyBox && /\[[xX]\]/.test(moneyBox.text), detail: '真钱自测未勾 —— 这条 AI 替代不了你，必须真的去点一次' },
  ];
  const model = [
    `CTA 是单一动作，落地页没有互相打架的多个 offer ｜ 原文: 「${quote(lp)}」`,
  ];
  return { checks, model };
}

function gate15(cwd) {
  const secs = loadArtifact(cwd, 'gtm.md');
  if (!secs) return missing('gtm.md');
  const chan = findSection(secs, '渠道'), posts = findSection(secs, '已发内容记录'), dm = findSection(secs, '一对一私聊');
  const checks = [
    { label: 'gtm.md 存在', pass: true },
    { label: '具体渠道 ≥2 个', pass: listItems(chan).length >= 2, detail: `仅 ${listItems(chan).length} 个` },
    { label: '已发内容 ≥1 条记录', pass: listItems(posts).length >= 1, detail: '还没发过任何内容' },
    { label: '私聊数据已记录（含数字）', pass: /\d/.test(fieldValue(dm, '已私聊数')) && /\d/.test(fieldValue(dm, '真实试用数')), detail: '已私聊数/真实试用数缺数字' },
    { label: '「有效渠道结论」已填', pass: hasContent(findSection(secs, '有效渠道结论')), detail: '为空' },
  ];
  const model = [
    `已发内容是"How I"真实过程（带真实数字），不是"How to"教程腔 ｜ 原文: 「${quote(posts)}」`,
    `渠道具体到入口（哪个群/话题/关键词），并复用了第 2 关 Q4 的侦察结果 ｜ 原文: 「${quote(chan)}」`,
  ];
  return { checks, model };
}

function gate16(cwd) {
  const secs = loadArtifact(cwd, 'payment.md');
  if (!secs) return missing('payment.md');
  const first = findSection(secs, '第一笔收款');
  const checks = [
    { label: '「第一笔收款」段存在', pass: !!first, detail: 'payment.md 缺该段' },
    { label: '金额是具体数字', pass: /\d/.test(fieldValue(first, '金额')), detail: '为空' },
    { label: '「来源」已填', pass: fieldFilled(first, '来源'), detail: '为空' },
    { label: '「为什么买」已填（他的原话）', pass: fieldFilled(first, '为什么买'), detail: '为空 —— 这句话是把第一笔复制成第十笔的地图' },
  ];
  const model = [
    `是陌生人付费（朋友凑数只算一半，别当终点） ｜ 原文: 「${first ? fieldValue(first, '来源') : '(缺)'}」`,
  ];
  return { checks, model };
}

const GATES = { 1: gate1, 2: gate2, 3: gate3, 4: gate4, 5: gate5, 6: gate6, 7: gate7, 8: gate8, 9: gate9, 10: gate10, 11: gate11, 12: gate12, 13: gate13, 14: gate14, 15: gate15, 16: gate16 };

// ---- main ----
const argv = process.argv.slice(2);
if (argv[0] !== 'check') die('用法：gate.mjs check <1..16> [--cwd <dir>]');
const n = Number(argv[1]);
if (!Number.isInteger(n) || n < 1 || n > 16) die('关卡号须为 1..16');
const cwdIdx = argv.indexOf('--cwd');
const cwd = path.resolve(cwdIdx > -1 ? argv[cwdIdx + 1] : process.cwd());
const stage = getStage(n);

// 形态路由：被跳过的关直接 SKIPPED
let state = { form_factor: 'web', has_server: false };
const sp = path.join(cwd, '.vibe', 'state.json');
if (fs.existsSync(sp)) { try { state = JSON.parse(fs.readFileSync(sp, 'utf8')); } catch { /* 用默认 */ } }
if (!isActive(stage, state)) {
  console.log(`GATE ${n} · ${stage.name} —— SKIPPED（form_factor=${state.form_factor}/has_server=${!!state.has_server} 路由：该关对当前项目不适用）`);
  console.log('RESULT: SKIPPED');
  process.exit(0);
}

const { checks, model } = GATES[n](cwd);
const failed = checks.filter(c => !c.pass);
console.log(`GATE ${n} · ${stage.name} —— 机判: ${failed.length ? 'FAIL' : 'PASS'}`);
for (const c of checks) console.log(`  [${c.pass ? 'x' : ' '}] ${c.label}${!c.pass && c.detail ? ' —— ' + c.detail : ''}`);
if (!failed.length && model.length) {
  console.log('MODEL-CHECK（模型按证据判定，须引用原文；任一不合格即拒绝推进）:');
  for (const m of model) console.log(`  - ${m}`);
}
console.log(`RESULT: ${failed.length ? 'FAIL' : 'PASS'}`);
process.exit(failed.length ? 1 : 0);
