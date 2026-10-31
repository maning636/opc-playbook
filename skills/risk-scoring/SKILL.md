---
id: growth-ops/risk-scoring
domain: growth-ops
name: risk-scoring
description: 多维度风险评分模型方法论。覆盖：风险维度设计、权重分配、评分算法、阈值设定、动态调整。适用场景：客户/供应商/项目/交易风险评估、信用评分、合规风险评估。
origin: 本机自研
license: 见来源
library: opc-playbook
---


# 风险评分 (risk-scoring)

## 1. 适用边界

### 1.1 适用场景
- 客户信用评估（B2B 销售 / 借贷）
- 供应商风险评估（采购风控）
- 项目风险评估（项目立项 / 投标）
- 交易反欺诈（电商 / 支付）
- 合规风险评分（KYC / AML）

### 1.2 不适用
- 单维度风险（如纯信用记录查询）
- 战略级风险评估（属 `strategic-risk` skill）
- 实时风控决策（< 100ms，需用专门模型）
- 法律纠纷风险（属 `litigation-risk` skill）

## 2. 评分模型设计（W-D-A-T）

### 2.1 四要素

```
W - Weight（权重）     各维度的相对重要性
D - Dimension（维度）   风险评估的多个维度
A - Algorithm（算法）   综合评分的计算方法
T - Threshold（阈值）   风险等级的分界点
```

### 2.2 维度设计（以客户风险为例）

```
财务维度（30%）
  - 营收规模
  - 现金流
  - 负债率
  - 信用记录

行业维度（20%）
  - 行业风险评级
  - 监管风险
  - 周期性

合作维度（25%）
  - 历史合作年限
  - 历史付款记录
  - 合同金额

外部维度（25%）
  - 工商信息（是否异常）
  - 法律诉讼
  - 舆情风险
```

**原则**：3-7 个维度最佳（太少不全面，太多权重难分）

### 2.3 权重分配方法

| 方法 | 适用 | 步骤 |
|------|------|------|
| 专家打分（Delphi） | 行业知识丰富 | 5-10 个专家独立打分 → 加权平均 |
| 历史数据回归 | 有大量历史违约数据 | Logistic 回归计算权重 |
| AHP 层次分析 | 维度之间有层次关系 | 两两比较 → 计算权重 |
| 等权重 | 起步阶段 / 维度重要性相近 | 每个维度 1/N |

**建议**：起步用专家打分，积累数据后用回归优化

## 3. 评分算法

### 3.1 线性加权（最常用）

```python
def score(risk_data):
    dimensions = {
        'finance': {'weight': 0.30, 'value': normalize_finance(risk_data)},
        'industry': {'weight': 0.20, 'value': normalize_industry(risk_data)},
        'partnership': {'weight': 0.25, 'value': normalize_partnership(risk_data)},
        'external': {'weight': 0.25, 'value': normalize_external(risk_data)},
    }
    
    total = sum(d['weight'] * d['value'] for d in dimensions.values())
    return total  # 0-100 分
```

**优点**：简单、可解释
**缺点**：线性假设（实际风险可能非线性）

### 3.2 Logistic 回归（数据驱动）

```python
from sklearn.linear_model import LogisticRegression
# X: 各维度归一化分数
# y: 历史违约标签（1=违约, 0=正常）
model = LogisticRegression().fit(X, y)
# 输出违约概率 p，然后转分数: score = (1 - p) * 100
```

**优点**：捕捉非线性
**缺点**：需要大量历史数据

### 3.3 决策树（规则化）

```
IF 行业 in (高风险) AND 负债率 > 80% → 高风险 (score < 40)
IF 历史付款有 2 次以上逾期 → 高风险
IF 行业 in (低风险) AND 负债率 < 30% → 低风险 (score > 80)
...
```

**优点**：业务可解释 + 可手写规则
**缺点**：复杂场景难覆盖

### 3.4 集成模型（生产级）

```
线性加权 + Logistic 回归 + 决策树 → 综合投票 / 加权
```

## 4. 阈值与等级

### 4.1 风险等级划分（典型）

| 分数区间 | 等级 | 含义 | 建议动作 |
|---------|------|------|----------|
| 0-30 | 高风险 | 建议拒绝 | 不合作 / 需担保 |
| 31-50 | 中高风险 | 严格审查 | 提高预付款 / 担保 |
| 51-70 | 中风险 | 标准审查 | 标准合同 + 监控 |
| 71-100 | 低风险 | 简化流程 | 标准合作 |

### 4.2 阈值校准

- **误判成本权衡**：
  - 误报高风险（实际是好的）→ 损失客户
  - 误报低风险（实际是差的）→ 坏账损失
- **业务目标决定**：保守行业（金融）严进，激进行业（早期 SaaS）宽进

## 5. 数据归一化（Normalization）

不同维度的原始数据需要归一化到 0-100：

### 5.1 Min-Max 归一化

```python
def normalize(value, min_val, max_val):
    return (value - min_val) / (max_val - min_val) * 100
```

适用：分布均匀的连续值

### 5.2 Z-Score 归一化

```python
def normalize_z(value, mean, std):
    z = (value - mean) / std
    return max(0, min(100, (z + 3) / 6 * 100))  # 映射到 0-100
```

适用：正态分布数据

### 5.3 分箱（Bucketing）

```python
def normalize_bucket(value, buckets):
    for i, bucket in enumerate(buckets):
        if value <= bucket:
            return i * 100 / len(buckets)
```

适用：非线性关系 + 业务可解释

## 6. 动态调整机制

### 6.1 评分模型定期回测

```
每季度：
- 用历史违约数据回测当前模型
- 计算 KS / AUC 指标
- 准确率下降 > 5% 触发模型更新
```

### 6.2 关键风险事件触发重评

```
- 客户被列入失信被执行人 → 立即降级
- 客户行业出现系统性风险 → 行业维度批量调整
- 重大舆情事件 → 外部维度重评
```

### 6.3 模型监控

| 指标 | 含义 | 阈值 |
|------|------|------|
| KS | 区分好坏样本能力 | > 0.3 |
| AUC | 整体预测准确率 | > 0.7 |
| PSI | 样本分布稳定性 | < 0.2 |
| 命中率 | 实际违约客户被识别比例 | > 80% |

## 7. 输出物清单

| 场景 | 产物 |
|------|------|
| 模型设计 | `dimension-design.md` + `weight-rationale.md` + `algorithm-choice.md` |
| 实施 | `scoring-code.md` + `threshold-rules.md` |
| 监控 | `model-monitoring.md` + `backtest-report.md` |
| 决策 | `risk-grade-table.md` + `action-recommendations.md` |

## 8. 反模式

- ❌ 维度太多（> 10），权重难分
- ❌ 等权重起步（忽视维度差异）
- ❌ 不做归一化（不同维度直接相加）
- ❌ 阈值拍脑袋（没回测校准）
- ❌ 模型上线不监控（准确率漂移无人发现）
- ❌ 评分只是数字，不联动业务动作
- ❌ 人工调分（破坏模型一致性）

## 9. 自我审计清单

- [ ] 维度数量是否在 3-7 之间
- [ ] 权重是否有 rationale（专家打分 / 回归）
- [ ] 是否做了归一化
- [ ] 阈值是否有回测校准
- [ ] 模型是否有监控机制（KS/AUC/PSI）
- [ ] 评分结果是否联动业务动作
- [ ] 是否有 version control（评分规则变更可追溯）

如有任何一项未达，**不要**输出 "风险评分模型上线" 结论。

## 10. 修订日志

### v1.0（2026-09-17）
- 初始版本
