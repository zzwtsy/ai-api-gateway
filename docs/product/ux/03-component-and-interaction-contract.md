---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 组件与交互契约

## 1. shadcn 组件映射

| 产品模式 | 组件 |
| --- | --- |
| 应用导航 | `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarFooter`, `SidebarInset` |
| 面包屑 | `Breadcrumb` |
| 页面动作 | `Button`, `DropdownMenu` |
| 全局搜索 | `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` |
| 数据比较 | `Table`, `Badge`, `StatusBadge`, `Tooltip`, `Pagination` |
| 同级视图 | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| 持久问题 | `Alert` |
| 临时反馈 | `Sonner` |
| 加载 | `Skeleton`, `Spinner` |
| 空状态 | `Empty` |
| 短任务 | `Dialog` |
| 上下文详情 / 编辑 | `Sheet` |
| 高风险确认 | `AlertDialog` |
| 表单 | `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError` |
| 输入组合 | `InputGroup`, `InputGroupInput`, `InputGroupAddon` |
| 选择 | `Select`, `Combobox`, `ToggleGroup`, `Switch`, `Checkbox`, `RadioGroup` |
| 分隔 | `Separator` |
| 长内容 | `ScrollArea`, `Resizable`（请求 Master–Detail） |
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
9. `SelectItem`、`DropdownMenuItem`、`CommandItem` 必须位于对应 Group 中。
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

## 7. Dialog、Sheet 与独立页面

| 模式 | 使用场景 | 禁止场景 |
| --- | --- | --- |
| Dialog | 1–3 个步骤的短任务；添加客户端；同步模型 | 长表单、需要频繁查阅背景数据 |
| Sheet | 记录详情；添加账号；模型与客户端上下文编辑 | 复杂路由编辑、全页设置 |
| AlertDialog | 删除、撤销 Key、覆盖配置、暴露 Secret | 普通保存成功 |
| 独立页面 | 路由编辑、长流程、耐久任务 | 简单单字段编辑 |

Sheet 默认 500px，宽版 640px。Sheet 内必须有固定 Header、可滚动 Body、固定 Footer。

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
