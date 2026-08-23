---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 前端验收清单

## 1. 规范完整性

- [ ] 活动文档树只存在现行 UI 规范和现行视觉稿；
- [ ] 历史 UI 文档、旧视觉稿和补丁式说明未混入活动文档树；
- [ ] `pnpm docs:bundle` 能由 `docs/product/ux/` 生成前端单文件规范；
- [ ] `design-tokens.json` 与实现 CSS 一致；
- [ ] 页面名称、导航和主操作与 `page-contracts.json` 一致。

## 2. 产品语义

- [ ] 所有路由目标与入口协议一致；
- [ ] Request 与 Attempt 在列表、详情、指标和文案中分开；
- [ ] Gateway Client Key 与 Provider Credential 分开；
- [ ] unknown 不按 0 计算；
- [ ] 价格历史使用 PricingSnapshot；
- [ ] 最终成功但发生回退可见；
- [ ] 已发送首字节后不再切换目标的规则可见。

## 3. Shell 与视觉

- [ ] 浮动 inset Sidebar 与 Main Surface 结构正确；
- [ ] 背景为中性灰，内容表面为真白；
- [ ] 页面主操作在 Page Header；
- [ ] 顶栏只保留全局能力；
- [ ] 无渐变、玻璃、发光、超大圆角和装饰性卡片墙；
- [ ] 表格、分栏和开放式 KPI 保持高密度；
- [ ] Token、排版、边框、半径和阴影符合规范。

## 4. 页面功能

- [ ] 概览可从 Attention 进入具体问题；
- [ ] 请求筛选、选中行和 Inspector Tabs 可操作；
- [ ] Attempts 显示完整上游尝试链；
- [ ] 连接可添加账号并执行 Probe；
- [ ] 模型可查看字段来源和 unknown 价格；
- [ ] 路由可模拟、校验、保存并发布；
- [ ] 客户端创建后只显示一次完整 Key；
- [ ] 设置按分区显式保存高风险项；
- [ ] `Ctrl/Cmd + K` 可定位页面和对象。

## 5. 状态

- [ ] 每页实现 loading；
- [ ] 首次为空与筛选为空分开；
- [ ] error 可重试；
- [ ] partial 保留成功内容；
- [ ] stale 显示最后成功时间；
- [ ] disabled 显示原因；
- [ ] unknown 显式显示；
- [ ] Toast 不承载必须阅读的信息。

## 6. 响应式

- [ ] 1440 × 1000 无裁切与文档级水平溢出；
- [ ] 1280 宽保留全部核心任务；
- [ ] 1024 × 768 侧栏折叠并显示非阻断提示；
- [ ] 次要列按断点隐藏，核心列保留；
- [ ] 路由编辑预览在窄视口顺序降级；
- [ ] Sheet、Dialog、Inspector 内部滚动可用。

## 7. 可访问性

- [ ] 键盘可到达所有核心控件；
- [ ] Focus ring 清晰；
- [ ] Overlay 有 Title，关闭后焦点返回；
- [ ] Icon-only Button 有 accessible name；
- [ ] 状态不只靠颜色；
- [ ] Table、Tabs、Menu、Command 语义正确；
- [ ] 图表有文本摘要；
- [ ] 自动化无高严重度 a11y 问题。

## 8. 安全

- [ ] Secret 不进入 URL、日志、缓存、截图和导出；
- [ ] API Key 不回填；
- [ ] 完整 Gateway Key 关闭后不可恢复；
- [ ] 删除或撤销显示影响；
- [ ] 诊断包只包含脱敏元数据；
- [ ] 控制面认证错误与上游鉴权错误文案不同。

## 9. 视觉回归检查点

至少比较：

1. Sidebar 宽度、选中态与 Footer；
2. Topbar 高度、搜索和快速创建；
3. Page Header 与主操作；
4. 表格行高、表头、选中行；
5. Request Master–Detail 比例；
6. Connections 目录与详情比例；
7. Route Editor 两栏与 Sticky 预览；
8. Settings 开放式行布局；
9. Badge / Alert 状态色；
10. 1024px 折叠行为。
