---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 响应式、可访问性与内容语言

## 1. 响应式策略

这是桌面优先产品，不承诺手机完整操作，但不能在普通窄桌面上崩溃。

### 1.1 断点

| 视口 | 行为 |
| --- | --- |
| `>=1600px` | 完整侧栏；显示更多表格列；详情面板可更宽 |
| `1440–1599px` | 基准布局；隐藏少量次要列 |
| `1280–1439px` | 侧栏可折叠；减小 Gutter；保持所有核心任务 |
| `1024–1279px` | 侧栏折叠为图标；显示非阻断桌面建议；复杂两栏保持可用或顺序降级 |
| `<1024px` | 只保证浏览和紧急操作，不作为完整验收目标；不得出现文档级水平溢出 |

### 1.2 降级规则

- 先隐藏次要列，不隐藏对象、结果和主动作；
- 路由编辑预览可落到表单下方；
- 概览双栏可变单栏；
- KPI 从 4 列变 2 列；
- 连接目录缩窄，但不转换为卡片；
- 请求 Master–Detail 在最低承诺视口仍保持双栏，极窄时可改为列表 + Sheet，但语义不变。

## 2. 键盘

必须支持：

- `Ctrl/Cmd + K`：全局搜索；
- `Esc`：关闭 Dialog、Sheet、Popover；
- Tab / Shift+Tab：按视觉顺序移动；
- Enter / Space：激活按钮、菜单项和选中行；
- 方向键：Tabs、Menu、Command、Select 按组件语义工作；
- 焦点在浮层内循环，关闭后返回触发元素。

可以提供 `G` 后接页面快捷键，但不能成为完成任务的唯一方式。

## 3. Focus 与颜色

- 所有交互控件有可见 focus ring；
- 文字与背景满足 WCAG AA；
- 状态同时使用文字、图标和颜色；
- 不用仅红/绿区分成功失败；
- 禁用控件保持可读说明；
- Hover 不是唯一提示方式。

## 4. 语义与辅助技术

- 页面只有一个 `h1`；
- Dialog、Sheet、Drawer 都有 Title 和 Description；
- Table 使用正确 `thead`、`th`、`tbody`；
- 图表提供摘要或数据表；
- Icon-only Button 有 `aria-label` 和 Tooltip；
- Toast 使用合适 live region，但高风险错误不只依赖 Toast；
- Loading 通过 `aria-busy` 或可感知状态表达；
- ID、URL 和代码块允许复制并保持可读换行。

## 5. 内容语言

界面默认中文，但保留不可替代的领域术语：Request、Attempt、Endpoint、Credential、Provider、Gateway Key。首次出现时可用中文解释。

推荐：

```text
没有可用的 API Key
主账号正在冷却，42 秒后重新参与路由
最终成功，但使用了备用账号
目标 Endpoint 会忽略 reasoning.summary
价格未知，不计入已知费用合计
```

避免：

```text
Credential pool exhausted
ProviderModelBinding mismatch
Partial compatibility
Fallback executed
```

警告文案必须包含：发生了什么、影响、如何处理、是否阻止保存、证据或验证时间。

## 6. 数值与时间

- 数值使用 tabular numerals；
- 费用显示币种和精度规则；
- 百分比区分 `%` 与 `pp`；
- 相对时间配合 Tooltip 中绝对时间；
- 延迟单位统一为 ms 或 s，并按列一致；
- unknown、无数据和 0 使用不同显示。
