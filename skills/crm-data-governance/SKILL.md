---
id: growth-ops/crm-data-governance
domain: growth-ops
name: crm-data-governance
description: CRM 数据治理方法论。覆盖：数据模型设计、数据质量规则、字段标准化、主数据管理、合规审计。适用场景：新 CRM 实施、CRM 数据迁移、CRM 数据清洗、CRM 合规审计（GDPR/PIPL）。
origin: 本机自研
license: 见来源
library: opc-playbook
---


# CRM 数据治理 (crm-data-governance)

## 1. 适用边界

### 1.1 适用场景
- 新 CRM 系统的数据模型设计
- 现有 CRM 的数据质量提升
- CRM 数据迁移（从旧 CRM 到新 CRM）
- GDPR / PIPL 等隐私合规审计
- 多系统数据整合（CRM + ERP + BI）

### 1.2 不适用
- 单条数据修复（属 `data-cleaning` skill）
- 业务规则配置（属 `crm-configuration` skill）
- 系统架构设计（属 `solution-design` skill）

## 2. CRM 核心实体模型

### 2.1 标准三段式

```
Company（公司）
  ↕ (1:N)
Contact（联系人）
  ↕ (N:M)
Deal / Opportunity（交易 / 商机）
  ↓ (1:N)
Activity / Task（活动 / 任务）
```

### 2.2 实体字段最小集

#### Company 字段

```
必填：
  - id（主键）
  - name（公司名称）
  - created_at, updated_at

建议：
  - industry（行业）
  - size（员工数 / 营收）
  - website
  - country / region
  - source（来源渠道）
  - owner_id（负责人）
  - status（活跃 / 流失 / 潜在）
  - tags（标签）

可选：
  - 工商信息（注册号 / 法人）
  - 财务信息（仅高级 CRM）
  - 自定义字段（按行业）
```

#### Contact 字段

```
必填：
  - id
  - email（唯一）
  - first_name, last_name

建议：
  - company_id（关联公司）
  - phone
  - role（决策者 / 影响者 / 使用者）
  - seniority（高级 / 中级 / 初级）
  - department
  - source（来源）
  - owner_id
  - tags

可选：
  - LinkedIn / 微信
  - 生日 / 喜好
  - 沟通偏好
  - 时区
```

#### Deal 字段

```
必填：
  - id
  - stage（当前阶段）
  - amount（金额）
  - close_date（预期成交日）

建议：
  - company_id, contact_ids
  - owner_id（负责人）
  - source（来源）
  - probability（成交概率 %）
  - forecast_category（Pipeline / Best Case / Commit / Omitted）
  - tags

可选：
  - 产品 / 服务明细
  - 竞争对手
  - 决策链
  - 关键日期
```

### 2.3 扩展实体

```
Lead（线索）：
  - 比 Deal 更早期
  - 可能未关联 Company
  - 通常有 source + 营销归因

Activity / Task（活动）：
  - 通话 / 邮件 / 会议
  - 关联到 Deal 或 Contact
  - 用于追踪互动历史

Product / Service（产品）：
  - 关联到 Deal（多对多）
  - 用于产品组合分析

Quote / Order（报价 / 订单）：
  - 比 Deal 更具体
  - 含详细价格 + 条款
```

## 3. 数据质量规则（6 个维度）

### 3.1 完整性（Completeness）

```
- 必填字段缺失率 < 5%
- 关键字段（email / company_name）缺失率 < 1%
- 关联缺失（Contact 无 Company）率 < 10%
```

### 3.2 准确性（Accuracy）

```
- Email 格式正确率 > 99%
- 电话号码格式正确率 > 95%
- 行业 / 规模与实际匹配（抽样验证）
- 金额单位一致（避免币种混淆）
```

### 3.3 一致性（Consistency）

```
- 同一公司在多系统唯一标识
- 同一联系人在不同模块一致
- 阶段定义全局一致（不出现「lead」和「prospect」混用）
```

### 3.4 时效性（Timeliness）

```
- 新线索 < 24h 进入 CRM
- 阶段变更 < 实时更新（< 1h 延迟）
- 联系人变动 < 7 天更新
```

### 3.5 唯一性（Uniqueness）

```
- Email 全局唯一（不允许重复）
- Company name 在同一区域内唯一
- 关键标识符（订单号 / 发票号）全局唯一
```

### 3.6 合规性（Compliance）

```
- GDPR：用户可导出 + 删除数据
- PIPL：个人信息分类 + 同意管理
- 行业合规：金融 KYC / 医疗 HIPAA
- 数据保留期限：到期自动归档 / 删除
```

## 4. 字段标准化

### 4.1 行业枚举（Indusrty）

```
标准分类（如 NAICS / GICS）：
  - 11 Agriculture
  - 21 Mining
  - 22 Utilities
  - 23 Construction
  - 31-33 Manufacturing
  - 42 Wholesale Trade
  - 44-45 Retail
  - 48-49 Transportation
  - 51 Information
  - 52 Finance and Insurance
  - 53 Real Estate
  - 54 Professional Services
  - 55 Management
  - 56 Administrative
  - 61 Educational Services
  - 62 Health Care
  - 71 Arts
  - 72 Accommodation
  - 81 Other Services
  - 92 Public Administration
```

### 4.2 公司规模（Size）

```
- 1-10 (Micro)
- 11-50 (Small)
- 51-200 (Small-Medium)
- 201-500 (Medium)
- 501-1000 (Medium-Large)
- 1001-5000 (Large)
- 5001-10000 (Very Large)
- 10000+ (Enterprise)
```

### 4.3 来源渠道（Source）

```
- Organic Search（自然搜索）
- Paid Search（付费搜索）
- Social Media（社交媒体）
- Email Marketing（邮件营销）
- Referral（推荐）
- Direct（直接访问）
- Event（线下活动）
- Cold Outreach（冷触达）
- Partner（合作伙伴）
- Content Download（内容下载）
- Web Demo / Trial（在线演示 / 试用）
- Other
```

### 4.4 Deal Stage（按抽象阶段）

```
通用 5-7 阶段（具体名称以 CRM 后端 enum 为准）：
  - 阶段 1：初接触 / New
  - 阶段 2：资格确认 / Qualified
  - 阶段 3：需求确认 / Needs Analysis
  - 阶段 4：方案评估 / Proposal
  - 阶段 5：合同谈判 / Negotiation
  - 阶段 6：成交 / Closed Won
  - 阶段 X：失败 / Closed Lost

阶段命名必须先 crm-discover（参见 sales-funnel skill）
```

## 5. 主数据管理（MDM）

### 5.1 主数据范围

```
核心主数据：
  - Company
  - Contact
  - Product

参考数据：
  - Industry enum
  - Region enum
  - Source enum
  - Stage enum
  - Custom field 值
```

### 5.2 主数据规则

```
唯一性：
  - Email 全局唯一（Contact）
  - 工商注册号 + 国家（Company）

命名：
  - Company 名称标准化（去除「有限公司」「股份有限公司」等后缀用于展示）

合并：
  - 检测重复 → 人工确认 → 合并
  - 保留主记录 + 关联历史

归属：
  - 主数据有明确 owner（团队或个人）
  - 变更需要审批
```

### 5.3 数据治理组织

```
数据所有者（Data Owner）：
  - 高管 / 业务线负责人
  - 决策字段定义 + 访问权限

数据管理员（Data Steward）：
  - 业务专家
  - 日常数据质量 + 主数据维护

数据使用者（Data User）：
  - 销售 / 营销 / 服务
  - 创建 / 更新数据
```

## 6. CRM 数据迁移

### 6.1 迁移流程

```
Step 1：源系统盘点
  - 实体清单 + 字段清单 + 数据量
  - 数据质量现状评估

Step 2：目标模型映射
  - 源字段 → 目标字段映射表
  - 必填 / 可选 / 转换规则

Step 3：数据清洗
  - 去重
  - 标准化（行业 / 规模 / 来源）
  - 补全（必填字段）
  - 验证（email 格式等）

Step 4：试迁移 + 验证
  - 抽样验证数据准确性
  - 关联关系是否保留
  - 历史活动是否完整

Step 5：正式迁移
  - 全量迁移
  - 增量同步（如需双写期）

Step 6：旧系统下线
  - 保留只读快照（合规要求）
  - 切换业务到新系统
```

### 6.2 迁移常见问题

```
字段映射遗漏：
  - 自定义字段未识别
  - 行业分类不一致

数据丢失：
  - 必填字段未填 → 跳过
  - 关联关系丢失
  - 附件 / 文件丢失

重复数据：
  - 同一公司在两个系统中重复
  - 同一联系人重复

质量问题：
  - 历史数据质量问题在新系统中暴露
  - 数据量级变化
```

## 7. 数据质量监控

### 7.1 监控指标

```
- 必填字段缺失率
- 重复 email 数
- 重复 Company 数
- 关联断裂数（Contact 无 Company）
- 阶段停滞时长分布
- 数据更新及时性
```

### 7.2 监控频率

```
- 实时：数据写入校验
- 每日：质量指标计算
- 每周：质量报告 + 异常跟进
- 每月：质量趋势分析
```

## 8. 合规审计

### 8.1 GDPR 合规要点

```
合法基础：6 种之一（同意 / 合同 / 法律义务 / 重大利益 / 公共任务 / 合法利益）
数据最小化：只收集必要字段
目的限制：明确数据用途
存储限制：保留期限 + 到期删除
数据主体权利：
  - 知情权（隐私政策）
  - 访问权（数据导出）
  - 更正权
  - 删除权（被遗忘权）
  - 限制处理权
  - 数据可携权
  - 反对权
  - 不被自动化决策权
跨境传输：SCC / BCR / 充分性认定
违规通知：72h 内通报监管
```

### 8.2 PIPL（中国）合规要点

```
个人信息定义：单独 + 共同 + 推断
敏感个人信息：生物识别 / 医疗 / 金融 / 14 岁以下
处理规则：
  - 合法 + 正当 + 必要 + 诚信
  - 明确告知 + 同意
  - 不得过度收集
跨境传输：安全评估 / 标准合同 / 认证
数据主体权利：知情 / 决定 / 查询 / 更正 / 删除
```

### 8.3 行业合规

```
金融（KYC / 反洗钱）：
  - 客户身份验证
  - 交易监控
  - 可疑交易报告

医疗（HIPAA）：
  - PHI 保护
  - 最小必要
  - 加密传输

教育（FERPA / COPPA）：
  - 学生记录保护
  - 家长同意
```

## 9. 输出物清单

| 场景 | 产物 |
|------|------|
| 模型设计 | `data-model.md` + `field-definitions.md` + `enum-lists.md` |
| 数据质量 | `quality-rules.md` + `quality-dashboard.md` |
| 主数据 | `mdm-policy.md` + `dedup-rules.md` + `owner-mapping.md` |
| 数据迁移 | `migration-plan.md` + `field-mapping.md` + `data-quality-report.md` |
| 合规 | `compliance-audit.md` + `gdpr-checklist.md` + `pipl-checklist.md` |

## 10. 反模式

- ❌ 直接复制旧 CRM 字段（不做规范化）
- ❌ 必填字段过少（数据质量差）
- ❌ 不做去重（同一公司多次创建）
- ❌ 枚举值不统一（"lead" vs "prospect"）
- ❌ 阶段定义漂移（不同销售用不同术语）
- ❌ 不做质量监控（问题积累）
- ❌ 合规只是 PPT（未落到字段权限）
- ❌ 迁移不验证（数据丢失无人发现）

## 11. 自我审计清单

- [ ] 实体模型是否完整（Company / Contact / Deal / Activity）
- [ ] 字段定义是否 SMART（具体 + 可测 + 必填/可选）
- [ ] 枚举值是否标准化（行业 / 规模 / 来源）
- [ ] 数据质量 6 维度是否有规则
- [ ] 主数据是否有 owner + 治理流程
- [ ] 迁移是否有试运行 + 验证
- [ ] 合规清单是否落地到字段权限
- [ ] 质量监控是否有 dashboard

如有任何一项未达，**不要**输出 "CRM 数据治理完成" 结论。

## 12. 修订日志

### v1.0（2026-09-17）
- 初始版本
- 不绑定具体 CRM 后端，按标准三段式设计（Company / Contact / Deal）
