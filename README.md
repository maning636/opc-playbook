# opc-playbook

> **OPC 经营与商业判断技能库** —— 把「怎么做生意」这件事拆成可执行、可验证、可复用的技能。
> 29 个技能 · 2 个组 · 三层渐进披露（只有 `INDEX.md` 常驻）

---

## 这个库解决什么

做产品、做内容都容易，做**生意**容易变成"感觉"。这个库把经营判断拆成**两台状态机 + 一套分析工具**：

| 状态机 | 阶段数 | 入口 | 回答什么问题 |
|---|---:|---|---|
| **OPC 经营层** | 9 | `opc/opc-orchestrator` | 我该做什么生意？凭什么是你？第一步做什么？ |
| **idea-to-cash 产品层** | 16 | `growth-ops/idea-to-cash` | 从一个想法到收到钱，中间卡在哪？ |

两台状态机**共享同一个业务 ID**，互不覆盖、只互相引用：

```
回退只向上（往上游阶段退）        BLOCKED 只向下（往下游阶段退）
```

---

## 与其它库的分工

| 你要做的事 | 去哪个库 |
|---|---|
| 选赛道、定商业模式、写价值主张、算 MVP | **opc-playbook**（本库） |
| 拆目标、找根因、决策评分、创意变现 | **opc-playbook**（本库） |
| CRM 维护、现金流记账、合同、招聘、财务报表 | `agent-skills` |
| 交付红线、发布、软著、TDD 与复核清单 | `engineering-standard` |
| UI 级需求分析（show-me → 信息架构/页面清单） | `design-skills-playbook` |
| 多库组合、pin、composition 解析 | `skills-meta` |

> **本库不装进 Agent，也不多库混装。** 常驻的只有 `INDEX.md`（约 1.7k tokens），
> 29 个技能正文**全部按需拉取**，一次最多拉 3 个。

---

## 快速开始

```bash
# 1. 先看路由表（唯一该常驻的文件）
python tools/fetch.py --index

# 2. 定位技能
python tools/fetch.py --search "赛道 定位"

# 3. 只取需要的那一两个
python tools/fetch.py opc/opc-niche-positioning
python tools/fetch.py growth-ops/five-why

# 4. 一键清缓存
python tools/fetch.py --cache-clear
```

本地开发（不想走网络）：

```bash
python tools/fetch.py --offline opc/opc-niche-positioning
```

---

## 目录结构

```
opc-playbook/
├─ INDEX.md                 L0 路由表（唯一常驻）
├─ catalog.yaml             机器可读清单
├─ AGENT.md                 给 Agent 读的使用契约
├─ NOTICE                   出处与许可
├─ LICENSE                  MIT（本库原创部分）
├─ skills/
│  ├─ opc-niche-positioning/SKILL.md   （+ assets/ scripts/）
│  ├─ ...
│  └─ idea-to-cash/SKILL.md            （32 个文件，含状态机脚本）
└─ tools/
   ├─ fetch.py              取用工具（零依赖）
   ├─ regen_catalog.py      重生成 INDEX.md + catalog.yaml
   ├─ curated_zh.json       27 个技能的中文名与触发词
   ├─ domain_meta.json      分组元信息（唯一真相源）
   └─ fix_ids.py            id 规范化（一次性）
```

---

## 两组内容

### `opc` 组（16）—— OPC 经营层

资源盘点 → 赛道选择 → 商业模式 → 价值主张 → MVP → 转化闭环 → 资产沉淀 → 获客增长 → 经营体检

外加：OPC 战略、OPC 编排、技术栈搭建、公司注册与合规、**指标字典**、**实验设计**。

### `growth-ops` 组（13）—— 通用增长与分析

目标导向规划、第一性原理导师、五问法、霍夫曼价值分析、风险评分、
同伴顾问组、六顶思考帽、多 Agent 编排、个性化方案、异常检测、KPI 监控、CRM 数据治理、创意到回款。

---

## 出处与许可

| 来源 | 数量 | 许可 |
|---|---:|---|
| Anthropic `knowledge-work-plugins`（growth-ops 9 个） | 9 | Apache-2.0 |
| 本机自研（含 AI 一人公司 OPC 体系 7 个） | 20 | 见各 SKILL.md |

逐条记录在 `catalog.yaml` 的 `origin` 字段，详见 `NOTICE`。

---

## 相关

- 技能库：[`maning636/agent-skills`](https://github.com/maning636/agent-skills)
- 规范库：[`maning636/agent-workspace-spec`](https://github.com/maning636/agent-workspace-spec) ·
  [`maning636/engineering-standard`](https://github.com/maning636/engineering-standard) ·
  [`maning636/design-skills-playbook`](https://github.com/maning636/design-skills-playbook)
- 元库：`skills-meta`（本地）

**协议不重要的前提是——外部专家能读到。** 本库所有内容公开可读，欢迎直接读、直接提意见。
