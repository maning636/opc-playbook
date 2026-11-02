#!/usr/bin/env node
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const gate = join(root, 'scripts', 'gate.mjs');
const sample = join(root, 'examples', 'sample-project');
const results = [];

function run(cwd, args) {
  return spawnSync(process.execPath, [gate, ...args, '--cwd', cwd], { encoding: 'utf8' });
}

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}\n      ${error.message}`);
  }
}

function withSample(fn) {
  const temp = mkdtempSync(join(tmpdir(), 'client-req-'));
  const cwd = join(temp, 'project');
  try {
    cpSync(sample, cwd, { recursive: true });
    fn(cwd);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function expect(result, status, text) {
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== status || (text && !output.includes(text))) {
    throw new Error(`期望退出码 ${status}${text ? ` 且包含 ${text}` : ''}，实际 ${result.status}\n${output}`);
  }
}

function edit(cwd, file, fn) {
  const path = join(cwd, '.req', file);
  writeFileSync(path, fn(readFileSync(path, 'utf8')));
}

check('虚构示例 7 步机判全部通过', () => withSample((cwd) => {
  for (let n = 1; n <= 7; n++) expect(run(cwd, ['check', String(n)]), 0, 'RESULT: PASS');
}));

check('空模板 7 步全部拦截', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'client-req-empty-'));
  try {
    expect(run(cwd, ['init']), 0);
    for (let n = 1; n <= 7; n++) expect(run(cwd, ['check', String(n)]), 1, 'RESULT: FAIL');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

check('所有使用者均未见时第 2 步拦截', () => withSample((cwd) => {
  edit(cwd, 'stakeholders.md', (text) => text.split(/\r?\n/).map((line) =>
    line.includes('| 使用') ? line.replace(/\| 是 \|\s*$/, '| 否 |') : line).join('\n'));
  expect(run(cwd, ['check', '2']), 1, '至少见过一位');
}));

check('T2 未清零时第 7 步拦截', () => withSample((cwd) => {
  edit(cwd, 'questions.md', (text) => text.split(/\r?\n/).map((line) => {
    if (!/^\| Q0[45] /.test(line)) return line;
    const cells = line.split('|');
    cells[6] = ' ';
    cells[7] = ' ';
    return cells.join('|');
  }).join('\n'));
  expect(run(cwd, ['check', '7']), 1, 'T2');
}));

check('自动化缩短 To-Be 流程可以通过', () => withSample((cwd) => {
  edit(cwd, 'process.md', (text) => text.split(/\r?\n/).filter((line) =>
    !line.startsWith('2. 班长收报工单')).join('\n'));
  expect(run(cwd, ['check', '3']), 0, 'RESULT: PASS');
}));

check('4 个有效问题可以通过第 4 步', () => withSample((cwd) => {
  edit(cwd, 'questions.md', (text) => text.split(/\r?\n/).filter((line) =>
    !/^\| Q0[56] /.test(line)).join('\n'));
  expect(run(cwd, ['check', '4']), 0, 'RESULT: PASS');
}));

check('机判通过后明确标记待语义审核', () => withSample((cwd) => {
  expect(run(cwd, ['check', '1']), 0, 'OVERALL: PENDING-MODEL-CHECK');
}));

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
