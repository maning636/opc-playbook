---
id: opc/opc-business-registry
domain: opc
name: opc-business-registry
description: 共享业务 ID 注册表 —— 给一条业务线分配唯一编号（REQ-年份-序号），并让经营层、产品层、工程层三台状态机靠同一个 ID 互相引用、互不覆盖。当需要立项、给业务起编号、或要确认"这三份东西是不是同一件事"时使用。
origin: 本机自研
license: 见来源
library: opc-playbook
---

# 共享业务 ID 注册表

## 这是什么

一个业务线（HyperFrames、OPC 本身、任何一个要做的产品）需要一个**唯一编号**，
用来在三个地方认出"这是同一件事"：

| 层 | 状态文件 | 这个 ID 出现在哪 |
|---|---|---|
| 经营层 OPC | `opc-doc/state/current-stage.json` | 阶段文件头、`opc-doc/outputs/*.md` 标题行 |
| 产品层 idea-to-cash | `.vibe/state.json` | `biz_id` 字段 |
| 工程层 engineering | `docs/` + `PROGRESS.md` | 任务行前缀、PR 标题 |

**ID 格式**：`REQ-<4位年份>-<4位序号>`，例如 `REQ-2026-0001`。

编号一旦分配**不再变更**。业务改名、换方向、拆成新业务，都用新号。

## 为什么要有它

没有共享 ID 的时候，三台状态机会各说各话：

- 经营层说"我们在做 HyperFrames"
- 产品层说"当前在第 7 关，审美第一屏"
- 工程层说"任务 #12 改一下配色"

**三句话可能指的是三个东西，也可能是一个东西——你分不出来。**

有共享 ID 之后：

- 一眼能确认"这三个说的是同一件事"
- 任何一层 BLOCKED，能立刻定位到另外两层卡在哪
- 台账、PR、产物文件能互相追溯

## 三条不可破的规则

1. **ID 唯一贯穿** —— 一个 ID 只对应一条业务线，永不复用、永不改号。
2. **状态机互不覆盖，只互相引用** —— 每层只维护自己的状态文件。
   任何一层擅自改另一层的状态 = 违规。本注册表**只记指针，不搬状态**。
3. **回退只向上 / BLOCKED 只向下** —— 往上游阶段退叫回退，往下游阶段退叫 BLOCKED 传递。

## 怎么用

注册表落在**工作区根目录**的 `business.json`，不属于任何一层：

```json
{
  "schema_version": 1,
  "id": "REQ-2026-0001",
  "prefix": "REQ",
  "year": 2026,
  "seq": 1,
  "title": "HyperFrames AI 视频创作工作站",
  "allocated_at": "2026-10-31T08:00:00.000Z",
  "updated_at": "2026-10-31T08:12:00.000Z",
  "layers": {
    "opc":       { "ref": "opc-doc/state/current-stage.json", "at": "..." },
    "idea":      { "ref": ".vibe/state.json",                "at": "..." },
    "engineering": { "ref": "PROGRESS.md",                   "at": "..." }
  }
}
```

### 分配一个业务 ID

```bash
node scripts/bizid.mjs alloc --cwd <工作区根> --title "HyperFrames AI 视频创作工作站"
```

- 先扫一遍工作区里已有的 `REQ-<年>-<序号>`，取最大序号 +1，**不会撞号**
- 已经分配过就**不重复分配**（幂等），重复跑只会打印现有 ID
- 想换前缀：`--prefix PROJ`；想指定年份：`--year 2025`

### 登记某一层的指针

```bash
node scripts/bizid.mjs link opc       opc-doc/state/current-stage.json
node scripts/bizid.mjs link idea      .vibe/state.json
node scripts/bizid.mjs link engineering PROGRESS.md
```

**这只记路径，不读也不写那一层的状态内容。**

### 巡检：ID 到底出现在哪些文件里

```bash
node scripts/bizid.mjs status --cwd <工作区根>
```

输出分层的"ID 出现位置"清单，能直接看出：

- 哪层还没登记指针
- 哪个文件里出现了裸 ID（没在标题里、没法追溯）

### 产品层怎么取

产品层的 `state.json` 自带 `biz_id` 字段，由 `state.mjs` 维护：

```bash
node <idea-to-cash>/scripts/state.mjs init --cwd <工作区根> --biz-id REQ-2026-0001
node <idea-to-cash>/scripts/state.mjs set biz_id REQ-2026-0001 --cwd <工作区根>
```

`init` 时若**不给** `--biz-id`，会自动去读工作区根的 `business.json` 取现成的 ID。

## 检查单

- [ ] 一个业务线只有一个 ID，三层用的是同一个
- [ ] `business.json` 在工作区根，不在任何一层的目录里
- [ ] `layers` 三个指针都登记了，且指向各自层的**状态文件**（不是产物目录）
- [ ] 产出的 markdown 标题行带了 ID（`# REQ-2026-0001 · XXX`）
- [ ] 没有第二份注册表（别在 `.vibe/` 或 `opc-doc/` 里另存一份）

## 与其它 Skill 的关系

| Skill | 关系 |
|---|---|
| `opc-orchestrator` | 经营层的 9 阶段；阶段文件里带同一个 ID |
| `idea-to-cash` | 产品层的 16 关；`state.json` 的 `biz_id` 字段 |
| `engineering-standard`（外部库） | 工程层 P0-P6；`PROGRESS.md` 任务行带同一个 ID |

## 产出物

- `<工作区根>/business.json` —— 业务 ID 注册表（三层共享的锚点）
