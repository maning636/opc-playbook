---
id: opc/opc-compliance
domain: opc
name: opc-compliance
description: AI One-Person Company (OPC) compliance guide for company registration, tax optimization, copyright protection, and legal risk isolation in China. Use when user needs to register a company (Hangzhou/Suzhou focus), handle tax and finance compliance, address AI-specific legal requirements (algorithm filing, data compliance, model filing), or choose between business entity types. Triggers include "注册公司" "AI公司注册" "杭州注册" "财税合规" "算法备案" "数据合规" "个体户还是公司" "节税" "版权" "合同模板".
origin: 本地自研（AI 一人公司 OPC 体系）
license: 自研/内部使用
library: opc-playbook
---

# OPC Compliance: 注册 · 财税 · 版权合规

这个 skill 帮新手解决“什么时候注册、怎么安全收钱、合同怎么签、AI业务有哪些红线”。它用于自查和准备专业咨询，不替代律师、会计师或主管部门意见。

## 快速诊断

| 用户问题 | 当前任务 | 推荐入口 | 合格产出 |
|----------|----------|----------|----------|
| 还没收钱，要注册吗 | 判断是否需要主体 | [主体选择决策树](references/entity-selection.md) | 继续个人验证/注册个体户/注册有限公司的决定 |
| 准备签第一单 | 设计安全收款路径 | [合同模板](assets/toolkit-06-contract-template.md) | 合同、付款方式、发票说明 |
| 开始稳定收入 | 建账和凭证留存 | [财税合规与节税](references/tax-optimization.md) | 对公账户、月度凭证文件夹 |
| 要做 AI 产品 | 检查备案和数据边界 | [AI合规清单](references/ai-legal-compliance.md) | ICP/算法/数据/版权自查 |
| 选择城市 | 比较注册和政策成本 | [城市选择矩阵](assets/toolkit-04-city-selection.md) | 注册城市和代账方案 |

## 新手合规顺序

1. **先确认是否真的要收钱**：没有付费验证前，不要为“创业仪式感”注册公司。
2. **有第一笔B端订单时，优先合同和收款路径**：金额、交付物、验收、退款、版权归属要写清。
3. **月收入稳定后建立主体**：个人客户低价试水可延后；企业客户、开票、平台入驻通常需要主体。
4. **所有业务凭证归档**：合同、发票、银行回单、交付记录、聊天确认都要保存。
5. **涉及用户数据或公开 AI 产品时做专项合规检查**。

## 主体选择原则

| 情况 | 建议 | 理由 |
|------|------|------|
| 还在验证，收入不稳定 | 暂不注册或个体户短期试水 | 降低固定成本 |
| 企业客户、需要合同/发票/对公 | 有限责任公司 | 信任、风控、知识产权更友好 |
| 个人接单、低风险、月收入较低 | 个体户可过渡 | 成本低，但无限责任 |
| 有融资、合伙、股权计划 | 先咨询律师/财税顾问 | 架构错误后期成本很高 |

一人公司最大的风险不是“没注册”，而是注册后仍然公私不分。

## 财务防火墙

必须做到：

- 业务收入和支出尽量走对公账户或可解释账户。
- 不用公司账户支付个人消费。
- 所有收入有合同、订单或聊天确认。
- 所有支出有发票、账单、付款记录和业务用途说明。
- 每月固定一天整理凭证，至少保存5年。

## AI 业务红线

| 场景 | 风险 | 新手动作 |
|------|------|----------|
| 用客户数据训练或分析 | 隐私和数据安全 | 合同写明用途、范围、保存期限 |
| AI生成图片/文案/代码交付 | 版权和侵权 | 保留生成记录和人工审核记录 |
| 对外提供AI产品 | ICP、算法、模型、内容安全 | 上线前做专项合规检查 |
| 医疗、法律、金融建议 | 专业责任风险 | 明确辅助性质，必要时专家复核 |
| 抓取平台数据 | 平台协议和数据来源 | 不绕过权限，不采集敏感信息 |

## 什么时候必须找专业人士

- 单笔合同金额超过 ¥5000，且交付结果会影响客户收入、合规或数据安全。
- 涉及退款、违约、侵权、投诉、客户数据泄露。
- 需要注册公司、申请核定征收、做股权设计、申请高新或软著。
- 产品面向公众开放，涉及算法推荐、深度合成、用户画像或个人信息处理。

## 配套工具

| 工具 | 用途 | 位置 |
|------|------|------|
| 主体选择决策树 | 个体户/有限公司/合伙判断 | [references/entity-selection.md](references/entity-selection.md) |
| 长三角注册说明 | 杭州/苏州等注册注意事项 | [references/yangtze-delta-registration.md](references/yangtze-delta-registration.md) |
| 税务优化决策树 | 凭证、成本、工资与分红 | [assets/toolkit-05-tax-optimization.md](assets/toolkit-05-tax-optimization.md) |
| AI服务合同模板 | 版权归属和责任划分 | [assets/toolkit-06-contract-template.md](assets/toolkit-06-contract-template.md) |
| 风险评估评分卡 | 关键决策前风险评估 | [assets/toolkit-10-risk-assessment.md](assets/toolkit-10-risk-assessment.md) |
