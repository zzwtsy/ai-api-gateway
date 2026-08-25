---
status: normative
last_reviewed_at: 2026-08-25
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
- 添加模型绑定（使用居中 Dialog，聚焦完成模型发现与绑定配置）。

“添加模型绑定”保持单步流程，按目标 Endpoint、可选上游模型发现、上游模型 ID 与显示名称的顺序组织。Dialog 使用真实 Trigger，关闭后焦点返回主操作；Header 与 Footer 固定，表单主体在 1024px 工作面内独立滚动，并持续提供“取消 / 创建模型绑定”。

Endpoint 加载、失败或为空时仍允许打开 Dialog，并在原位展示加载、重试或前置条件说明，不使用无解释的禁用按钮。模型发现失败和创建失败都保留手工输入；发现结果只能填充模型 ID 与空白或仍跟随旧 ID 的显示名称。

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

详情属于可通过 `modelBindingId` 恢复的临时上下文审阅和轻量编辑，使用右侧 Sheet；复杂能力 Probe 进入独立任务或 Dialog。无效 ID 在目录成功加载后从 URL 删除，不自动选择首项。

Sheet 固定于视口，不改变目录宽度、位置或文档高度；Header 固定，Body 独立滚动。窄视口占满可用宽度，`sm` 及以上不超过宽版 Sheet。Escape、遮罩、关闭按钮和浏览器后退均可关闭；关闭后焦点返回原“查看详情”按钮。当前 DTO 未提供能力、价格或健康事实时必须显示 `unknown`，不得推断或显示为 0。

## 7. 状态

```text
正常 / 需关注 / 未验证 / unknown / 已禁用 / 同步过期
```

“需关注”必须有具体原因，例如价格未知、Probe 过期或 Endpoint 兼容性下降。
