---
status: normative
last_reviewed_at: 2026-08-25
language: zh-CN
---

# 组件与交互契约

## 1. shadcn 组件映射

| 产品模式 | 组件 |
| --- | --- |
| 应用导航 | `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarFooter`, `SidebarInset` |
| 面包屑 | `Breadcrumb` |
| 页面动作 | `Button`, `DropdownMenu` |
| Theme 偏好 | `DropdownMenu`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` |
| 全局搜索 | `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` |
| 数据比较 | `Table`, `Badge`, `StatusBadge`, `Tooltip`, `Pagination` |
| 同级视图 | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| 持久问题 | `Alert` |
| 临时反馈 | `Sonner` |
| 加载 | `Skeleton`, `Spinner` |
| 空状态 | `Empty` |
| 短任务 / 创建 / 轮换 / 凭据展示 | `Dialog` |
| 上下文详情 / 辅助工具 / 全局筛选 / 报文检查 | `Sheet` |
| 高风险确认 | `AlertDialog` |
| 表单 | `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError` |
| 输入组合 | `InputGroup`, `InputGroupInput`, `InputGroupAddon` |
| 选择 | `Select`, `Combobox`, `ToggleGroup`, `Switch`, `Checkbox`, `RadioGroup` |
| 分隔 | `Separator` |
| 长内容 / 工作台 | `ScrollArea`, `Resizable`（请求 Master–Detail） |
| 图表 | shadcn `Chart` + Recharts |

## 2. 组件使用规则

1. 优先组合现有 shadcn 组件，不自造同义基础组件。
2. Feature 代码只负责布局和业务状态，不覆盖基础组件的颜色、字体和圆角。
3. 使用语义 Token，如 `bg-background`、`text-muted-foreground`、`border-border`；禁止在业务组件中硬编码状态色。
4. 使用 `gap-*` 管理间距，不使用 `space-x-*` / `space-y-*`。
5. 等宽高使用 `size-*`。
6. 条件 class 使用 `cn()`。
7. `Dialog`、`Sheet`、`Drawer` 必须包含 Title；视觉上不需要时使用 `sr-only`。
8. `TabsTrigger` 必须位于 `TabsList` 内。
9. `SelectItem`、`DropdownMenuItem`、`DropdownMenuLabel`、`CommandItem` 必须位于对应 Group 中。
10. Loading Button 由 `Spinner + disabled` 组合，不定义不存在的 `isLoading` 属性。
11. `components/ui` 保持官方 Registry 原样；产品差异进入语义 Token、`components/product` 或布局组合。

## 3. 状态 Badge

产品状态统一使用 `<StatusBadge tone="success | warning | danger | neutral">`。`success` 与 `warning` 使用全局产品 Token，`danger` 映射官方 `destructive`，`neutral` 映射官方 `secondary`。普通数量、协议或对象标签继续直接使用官方 `Badge`。

## 4. Button 层级

| Variant | 用途 |
| --- | --- |
| `default` | 每个页面或任务的唯一主要动作 |
| `outline` | 次级动作、测试、导出、取消 |
| `ghost` | 行级操作、无边框导航动作 |
| `destructive` | 删除、撤销、不可逆操作 |
| `link` | 文本上下文中的轻量跳转 |

每个页面标题区原则上只有一个 `default` 主按钮。多个同权主要按钮会削弱层级。

## 5. Table

表格用于模型、路由、客户端、请求列表和健康比较。

必须：

- 服务器分页或可预测分页；
- 数值右对齐并使用 tabular numerals；
- 主信息和辅助信息在同一单元格形成两行层级；
- 行 Hover、选中和键盘焦点可见；
- 行内按钮阻止触发行点击；
- 过滤后空状态与首次为空状态分开；
- 长字段使用截断 + Tooltip，不无限撑宽；
- 次要列按断点隐藏，核心比较列始终保留。

禁止用 Checkbox 列装饰表格；只有确实存在批量操作时才显示多选。

## 6. Form

表单使用 `FieldGroup + Field`。每个字段必须有可见 Label；Placeholder 不替代 Label。

校验：

```tsx
<Field data-invalid={hasError}>
  <FieldLabel htmlFor="api-key">API Key</FieldLabel>
  <Input id="api-key" aria-invalid={hasError} />
  <FieldDescription>只在提交时写入加密存储。</FieldDescription>
  {hasError ? <FieldError>API Key 格式无效。</FieldError> : null}
</Field>;
```

表单应先阻断可确定的错误，再允许提交。路由协议不一致、空 Secret、非法 URL、悬空引用属于阻断错误；兼容性部分支持可作为警告并要求显式确认。

## 7. 交互容器分层体系（Dialog、Master–Detail、Sheet 与独立页面）

| 容器模式 | 适用场景 | 严格禁止场景 | 视线与空间考量 |
| --- | --- | --- | --- |
| **Dialog (居中模态)** | 1–3 步短任务；添加客户端；添加 Endpoint / 账号；Key 轮换；一次性 Secret 与配置展示；快速连通性测试 | 多分区复杂配置、长表单、需要频繁比对背景数据的长时间任务 | 居中（`max-w-lg` 或 `max-w-xl`），视线自然落在中轴黄金区域，任务结束即关闭，无单侧视觉偏航。 |
| **Master–Detail (双栏工作台)** | 请求排障、连接检视等需要持续比对目录与详情的高频深度工作 | 简单的一次性轻量任务；打开后会迫使目录降级为不稳定上下堆叠的详情 | 无遮罩左右分栏，左侧主列表 + 右侧 Inspector，支持连续切换与键盘导航。 |
| **Sheet (侧滑抽屉)** | 客户端与模型的临时上下文详情；全局高级筛选面板；宽幅只读 Raw Payload / 日志报文检视 | 作为主创建表单、一次性 Secret 弹层；在单个 Sheet 内部嵌套多步骤状态轮播 | 默认 500px（宽版 640px）。固定 Header、滚动 Body；不参与底层页面布局，通过遮罩和进入/退出过渡明确层级。 |
| **AlertDialog** | 删除、撤销 Key、覆盖配置、暴露 Secret 等高风险不可逆确认 | 普通保存成功、常规操作 | 紧凑居中警告，强制用户明确意图。 |
| **独立页面** | 路由编辑、长流程配置、规则多分区编排 | 简单单字段编辑或短任务 | 独占视口，承载复杂结构化业务流。 |

Persistent Inspector 使用命名 `region`，不提供遮罩、焦点陷阱或背景滚动锁。Request 等持续比对工作区的外层高度不得超过 App Shell 内容视口，Header 固定，Body 是唯一纵向滚动 Owner。Clients 与 Models 详情使用命名 `dialog` 的 URL-owned Sheet；打开前后目录 Bounding Box 与文档高度保持不变，Sheet 不超过视口，关闭后焦点返回原“查看详情”按钮。

## 8. 反馈层级

- `FieldError`：字段错误；
- Inline helper：局部约束或即时解释；
- `Alert`：需要持续可见的兼容性、隐私、协议或风险信息；
- `Sonner`：普通保存、复制、导出任务创建；
- Banner：数据库、主密钥、数据面等系统级问题；
- `AlertDialog`：高风险确认；
- Progress/Activity：Probe、模型同步、导入和备份。

Toast 不承载必须阅读的信息，也不替代页面状态更新。

## 9. 状态词汇

### 9.1 连接与账号

```text
正常 / 部分兼容 / 冷却中 / 鉴权失败 / 不可用 / 未验证 / 已禁用
```

### 9.2 请求

```text
成功 / 成功·回退 / 最终失败 / 已取消 / 流中断
```

### 9.3 成本

```text
厂商报告 / Gateway 估算 / 参考值 / 包月内 / unknown
```

同一个状态在不同页面必须使用相同文本、Badge tone 和解释。

## 10. Loading、Empty、Error、Partial

每个数据页面必须实现：

- `loading`：保留布局骨架，使用 Skeleton；
- `first-empty`：说明如何创建第一条数据；
- `filtered-empty`：说明当前筛选无结果并提供清除动作；
- `error`：说明发生了什么、影响和重试动作；
- `partial`：保留已成功区域，对失败区块单独 Alert；
- `stale`：显示最后成功数据与更新时间；
- `disabled`：展示禁用原因和恢复路径；
- `unknown`：明确未知，不伪装为正常或 0。
