// idea-to-cash · 16 关定义 + 形态路由（state.mjs / gate.mjs 共享）
export const SCHEMA_VERSION = 1;
export const FORM_FACTORS = ['web', 'miniapp', 'app', 'internal'];

// skip(state) 返回 true = 该关对当前项目不适用（自动跳过）
export const STAGES = [
  { id: 1,  key: 'direction',     name: '方向判断',      phase: '开工前',   artifact: 'direction.md',  skip: null },
  { id: 2,  key: 'five-questions',name: '五题验证',      phase: '开工前',   artifact: 'direction.md',  skip: null },
  { id: 3,  key: 'vdf',           name: 'VDF 需求表达',  phase: '开工前',   artifact: 'vdf.md',        skip: null },
  { id: 4,  key: 'build',         name: '动手做第一版',  phase: '动手做',   artifact: 'build-log.md',  skip: null },
  { id: 5,  key: 'validate',      name: '最小验证',      phase: '四大能力', artifact: 'validation.md', skip: null },
  { id: 6,  key: 'blueprint',     name: '系统蓝图',      phase: '四大能力', artifact: 'blueprint.md',  skip: null },
  { id: 7,  key: 'aesthetics',    name: '审美第一屏',    phase: '四大能力', artifact: 'crap-check.md', skip: s => s.form_factor === 'internal' },
  { id: 8,  key: 'review',        name: '上线前四审',    phase: '四大能力', artifact: 'review.md',     skip: null },
  { id: 9,  key: 'launch-web',    name: 'Web 上线',      phase: '上线',     artifact: 'launch.md',     skip: s => s.form_factor !== 'web' },
  { id: 10, key: 'backend-ops',   name: '后端运维',      phase: '上线',     artifact: 'launch.md',     skip: s => !s.has_server },
  { id: 11, key: 'app-store',     name: 'App/小程序上架', phase: '上线',    artifact: 'launch.md',     skip: s => !['app', 'miniapp'].includes(s.form_factor) },
  { id: 12, key: 'intranet',      name: '内网访问',      phase: '上线',     artifact: 'launch.md',     skip: s => s.form_factor !== 'internal' },
  { id: 13, key: 'pricing',       name: '定价',          phase: '卖东西',   artifact: 'pricing.md',    skip: null },
  { id: 14, key: 'ship',          name: '上架收款',      phase: '卖东西',   artifact: 'payment.md',    skip: null },
  { id: 15, key: 'coldstart',     name: '冷启动',        phase: '卖东西',   artifact: 'gtm.md',        skip: null },
  { id: 16, key: 'first-payment', name: '第一笔收款',    phase: '卖东西',   artifact: '(state 终态)',  skip: null },
];

export function getStage(id) {
  return STAGES.find(s => s.id === Number(id)) || null;
}

export function isActive(stage, state) {
  return !(stage.skip && stage.skip(state));
}

// 从 fromId 之后找第一个 active 关；没有则返回 'done'
export function nextActiveStage(fromId, state) {
  for (const s of STAGES) {
    if (s.id > fromId && isActive(s, state)) return s.id;
  }
  return 'done';
}
