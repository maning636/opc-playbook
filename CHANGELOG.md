# CHANGELOG

## Unreleased

### Added

- 新增 `growth-ops/client-requirements` 七步客户需求技能、虚构样例、模板与零依赖门禁。
- 新增 H2 需求包交接契约，明确优先级、F/A 编号映射及 CP/CC 反向变化路径。
- 新增门禁回归测试入口：`node skills/client-requirements/scripts/test/run.mjs`。

### Fixed

- 所有使用者均未见时，第 2 步不再错误放行。
- T2 未清零时，第 7 步不再错误放行；机判后增加 `OVERALL: PENDING-MODEL-CHECK`。
- To-Be 允许通过自动化缩短；问题数量不再作为独立硬门。
- 修正两台状态机却写成“三台”的陈旧索引与说明。

### Boundaries

- 自有产品继续走 `idea-to-cash` 轻量原型路径，不强制完整 H2。
- 未新建 `lead-to-renewal` 状态机；真实客户交接与验收仍需项目试点。
- 示例均为虚构材料，不代表真实客户交付结果。
