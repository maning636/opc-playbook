import io, os, sys

ROOT = r"D:\opc-playbook"

def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    with io.open(p, "r", encoding="utf-8") as f:
        t = f.read()
    for old, new in pairs:
        if old not in t:
            print("MISS  %s :: %r" % (rel, old[:60]))
            sys.exit(1)
        t = t.replace(old, new, 1)
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(t)
    print("OK    %s (%d edits)" % (rel, len(pairs)))

patch("AGENT.md", [
    ("- 29 个技能正文**没有一个**常驻上下文。\n- 常驻的只有 `INDEX.md`（L0 路由表，约 1.7k tokens）。",
     "- 30 个技能正文**没有一个**常驻上下文。\n- 常驻的只有 `INDEX.md`（L0 路由表，约 1.8k tokens）。"),
    ('不要对用户说"我已经加载了 29 个技能"。', '不要对用户说"我已经加载了 30 个技能"。'),
    ("""启动任一状态机时，先确认**当前在第几关**，不要从头重跑。""",
     """**共享业务 ID**（三层的唯一贯穿键）

| 项 | 值 |
|---|---|
| 格式 | `REQ-<4位年份>-<4位序号>`，例 `REQ-2026-0001` |
| 注册表 | 工作区根 `business.json`（**不属于任何一层**，三层只读） |
| 分配器 | `opc/opc-business-registry` |

- 状态机之间**只引用同一个号**，不互相写状态。
- 启动任一状态机时，先确认**当前在第几关**，不要从头重跑。
- 项目还没分配 ID（`state.json` 的 `biz_id` 为空），提醒用户先分配一个。"""),
])

patch("README.md", [
    ("> 29 个技能 · 2 个组 · 三层渐进披露（只有 `INDEX.md` 常驻）",
     "> 30 个技能 · 2 个组 · 三层渐进披露（只有 `INDEX.md` 常驻）"),
    ("""两台状态机**共享同一个业务 ID**，互不覆盖、只互相引用：

```
回退只向上（往上游阶段退）        BLOCKED 只向下（往下游阶段退）
```""",
     """两台状态机**共享同一个业务 ID**，互不覆盖、只互相引用：

```
业务 ID  REQ-2026-0001   ← opc/opc-business-registry 分配，写在工作区根 business.json
回退只向上（往上游阶段退）        BLOCKED 只向下（往下游阶段退）
```"""),
    ("> **本库不装进 Agent，也不多库混装。** 常驻的只有 `INDEX.md`（约 1.7k tokens），\n> 29 个技能正文**全部按需拉取**，一次最多拉 3 个。",
     "> **本库不装进 Agent，也不多库混装。** 常驻的只有 `INDEX.md`（约 1.8k tokens），\n> 30 个技能正文**全部按需拉取**，一次最多拉 3 个。"),
    ("   ├─ curated_zh.json       29 个技能的中文名与触发词",
     "   ├─ curated_zh.json       30 个技能的中文名与触发词"),
    ("### `opc` 组（16）—— OPC 经营层", "### `opc` 组（17）—— OPC 经营层"),
    ("外加：OPC 战略、OPC 编排、技术栈搭建、公司注册与合规、**指标字典**、**实验设计**。",
     "外加：OPC 战略、OPC 编排、技术栈搭建、公司注册与合规、**指标字典**、**实验设计**、**共享业务 ID 注册表**。"),
    ("| 本机自研（含 AI 一人公司 OPC 体系 7 个） | 20 | 见各 SKILL.md |",
     "| 本机自研（含 AI 一人公司 OPC 体系 7 个） | 21 | 见各 SKILL.md |"),
])

patch("NOTICE", [
    ("   收录内容: 20 个\n", "   收录内容: 21 个\n"),
    ("""             opc/{opc-100day-profit, opc-strategy, opc-techstack, opc-compliance,
                 opc-metric-dictionary, opc-experiment-design}""",
     """             opc/{opc-100day-profit, opc-strategy, opc-techstack, opc-compliance,
                 opc-metric-dictionary, opc-experiment-design,
                 opc-business-registry}"""),
    ("""2026-10-31 补充：新增 opc-metric-dictionary（指标字典）与
opc-experiment-design（AB 实验设计），补齐 OPC 阶段机最后的悬空能力。""",
     """2026-10-31 补充：新增 opc-metric-dictionary（指标字典）与
opc-experiment-design（AB 实验设计），补齐 OPC 阶段机最后的悬空能力。
2026-10-31 补充：新增 opc-business-registry（共享业务 ID 注册表）；
同时 idea-to-cash 的 state.json 升级到 v2（新增 biz_id / layers 字段，
v1 状态文件会自动迁移）。两处改动均为本机自研。"""),
])
print("ALL DONE")
