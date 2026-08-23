---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 模型页

![模型页](assets/models.png)

## 1. 页面目标

模型页展示每个 Endpoint 上真实可调用的模型绑定，而不是只维护一份抽象模型目录。用户应能判断能力、上下文、价格和元数据来源。

## 2. 主表格

核心列：

- 上游模型；
- 请求别名；
- Provider / Endpoint；
- 能力；
- 上下文；
- 输入 / 输出价格；
- 来源；
- 状态。

每行代表一个 `ProviderModelBinding`。相同基础模型在不同 Endpoint 上必须允许出现多行，因为能力、价格和稳定性可能不同。

## 3. 筛选与动作

筛选：搜索、Provider、协议、价格状态、能力、状态。

主操作：

- 同步 models.dev；
- 添加模型绑定。

同步使用 Dialog 展示来源、预计变更、覆盖规则和进度；不应无提示覆盖本地字段。

## 4. 元数据优先级

固定优先级：

```text
手动覆盖
> Endpoint / 账号专属覆盖
> 本地 Probe
> models.dev Provider Model
> models.dev Base Model
> unknown
```

每个字段都应保存来源，而不是整行只有一个模糊“来自 models.dev”。详情 Sheet 应逐字段展示当前值、来源、最后更新时间和覆盖入口。

## 5. 价格

- 价格按输入、缓存读取、输出等维度存储；
- 货币和计价单位明确；
- 手动覆盖不能被同步覆盖；
- 历史 Request/Attempt 使用当时 PricingSnapshot；
- unknown 使用明确 Badge，不能显示 `$0.00`；
- 未知价格的模型仍可路由，但界面必须持续提示成本不完整。

## 6. 模型详情 Sheet

包含：

- Provider / Endpoint / 模型 ID；
- 请求别名；
- 能力矩阵；
- 上下文与最大输出；
- 价格与来源；
- 最近 Probe；
- 使用该绑定的路由；
- 最近请求与错误；
- 手动覆盖与禁用。

详情属于上下文审阅和轻量编辑，使用宽版 Sheet；复杂能力 Probe 进入独立任务或 Dialog。

## 7. 状态

```text
正常 / 需关注 / 未验证 / unknown / 已禁用 / 同步过期
```

“需关注”必须有具体原因，例如价格未知、Probe 过期或 Endpoint 兼容性下降。
