# -*- coding: utf-8 -*-
import io

EDITS = [
    (r"D:\opc-playbook\README.md", [
        ("27 个技能 · 2 个组", "29 个技能 · 2 个组"),
        ("27 个技能正文**全部按需拉取**，一次最多拉 3 个。",
         "29 个技能正文**全部按需拉取**，一次最多拉 3 个。"),
        ("（约 1.6k tokens）", "（约 1.7k tokens）"),
        ("### `opc` 组（14）—— OPC 经营层", "### `opc` 组（16）—— OPC 经营层"),
        ("外加：OPC 战略、OPC 编排、技术栈搭建、公司注册与合规。",
         "外加：OPC 战略、OPC 编排、技术栈搭建、公司注册与合规、**指标字典**、**实验设计**。"),
        ("| 本机自研（含 AI 一人公司 OPC 体系 5 个） | 18 | 见各 SKILL.md |",
         "| 本机自研（含 AI 一人公司 OPC 体系 7 个） | 20 | 见各 SKILL.md |"),
    ]),
    (r"D:\opc-playbook\AGENT.md", [
        ("27 个技能正文**没有一个**常驻上下文。", "29 个技能正文**没有一个**常驻上下文。"),
        ("（L0 路由表，约 1.6k tokens）", "（L0 路由表，约 1.7k tokens）"),
        ("我已经加载了 27 个技能", "我已经加载了 29 个技能"),
    ]),
    (r"D:\opc-playbook\NOTICE", [
        ("   收录内容: 18 个", "   收录内容: 20 个"),
        ("             opc/{opc-100day-profit, opc-strategy, opc-techstack, opc-compliance}",
         "             opc/{opc-100day-profit, opc-strategy, opc-techstack, opc-compliance,\n"
         "                 opc-metric-dictionary, opc-experiment-design}"),
        ("技能正文未做内容修改。\n----",
         "技能正文未做内容修改。\n"
         "2026-10-31 补充：新增 opc-metric-dictionary（指标字典）与\n"
         "opc-experiment-design（AB 实验设计），补齐 OPC 阶段机最后的悬空能力。\n----"),
    ]),
]

for path, pairs in EDITS:
    t = io.open(path, encoding="utf-8").read()
    for a, b in pairs:
        if a not in t:
            print("!! MISS %s :: %s" % (path, a[:56]))
            continue
        t = t.replace(a, b)
    io.open(path, "w", encoding="utf-8", newline="").write(t)
    print("ok", path)
