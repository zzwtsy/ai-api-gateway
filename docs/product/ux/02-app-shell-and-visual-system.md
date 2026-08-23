---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# App Shell 与视觉系统

## 1. 视觉方向

整体采用默认 shadcn 语义与中性配色，但通过精确密度、开放式布局、状态色和信息结构形成现代产品感。视觉应接近专业开发者工具，而不是通用后台模板。

必须遵守：

- 真白色内容表面；
- 中性灰背景；
- 黑色主操作；
- 彩色只承载状态和对象识别；
- 1px 边框和极轻阴影；
- 小半径；
- 表格、分栏、开放式 KPI 优先；
- 不使用渐变、玻璃、发光、超大圆角、装饰性彩色卡片、无意义徽章墙。

![重构后界面总览](assets/contact-sheet.png)

## 2. Shell 结构

```text
┌──────────────── Sidebar（浮动 inset） ────────────────┐
│ Brand                                                   │
│ Monitoring / Configuration / System navigation          │
│ System health footer                                    │
└─────────────────────────────────────────────────────────┘

  ┌──────────────── Main Surface（独立白色表面） ───────┐
  │ Topbar：Breadcrumb / Search / Quick Create / Health  │
  ├───────────────────────────────────────────────────────┤
  │ Page Scroll                                           │
  │ Page Header                                           │
  │ Page Content                                          │
  └───────────────────────────────────────────────────────┘
```

Sidebar 与 Main Surface 均浮在中性页面背景上，外边距 12px，圆角 12px。它们是整套界面最主要的框架动作；页面内部不得继续层层套大圆角容器。

## 3. 尺寸 Token

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--sidebar-width` | 230px | 展开侧栏 |
| collapsed sidebar | 70px | 1280px 以下窄桌面 |
| `--topbar-height` | 56px | 全局顶栏 |
| `--page-gutter` | 24px | 1440px 基准页边距 |
| compact gutter | 20px / 16px | 1440px 以下 / 1280px 以下 |
| `--radius` | 10px | Card、主面板、编辑分区 |
| `--radius-sm` | 6px | Button、Input、Select |
| shell radius | 12px | Sidebar 与 Main Surface |
| default control height | 34px | Button、Input、Select |
| small control height | 30px | Toolbar、次级动作 |
| table row | 42px | 默认数据行 |
| table header | 35px | 表头 |
| page top padding | 22px | 普通页面 |

这些值由 [`design-tokens.json`](design-tokens.json) 锁定。Feature 代码不得复制硬编码值。

## 4. 颜色 Token

### 4.1 基础色

| 语义 | 值 |
| --- | --- |
| 页面背景 | `#f4f4f5` |
| 内容表面 | `#ffffff` |
| 主文字 / 主操作 | `#18181b` |
| 次级文字 | `#71717a` |
| 边框 / 输入框 | `#e4e4e7` |
| 轻背景 | `#fafafa` |
| Focus ring | `#a1a1aa` |

### 4.2 状态色

| 状态 | 前景 | 软背景 | 边框 |
| --- | --- | --- | --- |
| Success | `#15803d` | `#f0fdf4` | `#bbf7d0` |
| Warning | `#b45309` | `#fffbeb` | `#fde68a` |
| Danger | `#b91c1c` | `#fef2f2` | `#fecaca` |
| Info | `#1d4ed8` | `#eff6ff` | `#bfdbfe` |
| Purple object accent | `#7e22ce` | `#faf5ff` | `#e9d5ff` |

状态色只能用于 Badge、Alert、状态图标、轻量对象标识和必要的趋势提示。大面积布局仍保持中性。

## 5. Typography

字体栈：

```text
Inter, system-ui, -apple-system, BlinkMacSystemFont,
Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif
```

| 层级 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| Page title | 22 / 30 | 680 | 页面一级标题 |
| Editor title | 18 / 26 | 670 | 路由编辑页 |
| Entity title | 16 / 23 | 660 | 连接详情、设置分区 |
| Card title | 13 / 19 | 650 | 区块标题 |
| Body | 12–14 / 18–21 | 400–560 | 表格、说明、控件 |
| Helper | 10–11 / 14–17 | 400–560 | 辅助信息、表头、描述 |
| Monospace | 12–13 | 500–650 | ID、模型名、URL、Key Mask |

页面标题和主要数值使用负字距与 tabular numerals。不能把整页设置成等宽字体。

## 6. 阴影、边框和层级

- 普通页面表面：1px 边框 + `shadow-xs`；
- Card：1px 边框 + `shadow-xs`；
- Dropdown/Popover：边框 + `shadow-sm`；
- Dialog：仅浮层使用明显阴影；
- Sheet：使用方向性阴影；
- 选中表格行：背景变化 + 左侧 2px 内嵌标识，不使用发光描边。

页面内的视觉层级主要靠边框、背景、留白、排版和布局建立，不依赖阴影堆叠。

## 7. 图标

统一使用 `components.json` 指定的图标库，当前设计为 Lucide 风格：

- 线性、圆角端点、统一描边；
- 导航与控件图标默认 15–16px；
- Provider 标识可使用字母 Mark 或品牌图标，但不得与操作图标混淆；
- 纯图标按钮必须有可访问名称和 Tooltip；
- 状态不能只靠图标表达，必须有文字或 Badge。

## 8. 密度规则

- 页面默认是中等偏紧凑密度；
- 一屏应能看到主任务和足够上下文；
- 不为追求“留白感”牺牲比较效率；
- 不把每个指标做成独立大卡片；
- 不把表格转换为卡片列表；
- Card 只用于形成真正的任务区块，不作为所有内容的默认容器。
