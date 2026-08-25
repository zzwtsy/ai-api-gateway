---
status: normative
last_reviewed_at: 2026-08-25
language: zh-CN
---

# 前端验收清单

本文件是相关前端交付选择和执行检查项的无状态模板，不记录当前完成度。实际交付页面由静态 Page Manifest 与生成路由拥有；每次验证结果由测试、Gate Report 和 UI Evidence 记录。未涉及的检查项保持未勾选不代表已交付能力失败。

## 1. 规范完整性

- [ ] 活动文档树只存在现行 UI 规范和现行视觉稿；
- [ ] 历史 UI 文档、旧视觉稿和补丁式说明未混入活动文档树；
- [ ] `pnpm docs:bundle` 能由 `docs/product/ux/` 生成前端单文件规范；
- [ ] `design-tokens.json` 与实现 CSS 一致；
- [ ] 已交付 Page Manifest 的页面名称、Path 与导航分组和 `page-contracts.json`、生成路由一致；
- [ ] 产品合同中的计划页面不会被误判为已交付导航。

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
- [ ] Light 使用浅色 Sidebar 与白色内容面，Dark 使用中性深色语义表面，Primary 保持蓝色方向；
- [ ] Theme Dropdown Menu 可选择跟随系统、浅色、深色，刷新、系统变化与同源标签页同步符合合同；
- [ ] Sidebar 可点击和通过 `Cmd/Ctrl+B` 折叠，刷新后恢复，折叠导航显示中文 Tooltip；
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
- [ ] stale 保留最后成功数据并说明刷新失败；
- [ ] Request List 与 Inspector 任一失败时，另一侧仍可独立使用；
- [ ] disabled 显示原因；
- [ ] unknown 显式显示；
- [ ] Toast 不承载必须阅读的信息。

## 6. 响应式

- [ ] 1440 × 1000 无裁切与文档级水平溢出；
- [ ] Request Master–Detail 在 1440px 以不小于 620px / 390px 的双栏显示；
- [ ] 1280 宽保留全部核心任务，Request Master–Detail 按阅读顺序上下排列；
- [ ] 1024 × 768 展开与折叠状态均无内容裁切，Request Master–Detail 保持上下排列；
- [ ] Clients/Models Inspector 在 1440px 并排，在 1280px 与 1024px 上下排列；外层不超过内容视口且 Body 独立滚动；
- [ ] `<768px` Sidebar Sheet 打开、关闭、焦点和遮罩 Smoke 通过；
- [ ] 次要列按断点隐藏，核心列保留；
- [ ] 路由编辑预览在窄视口顺序降级；
- [ ] Sheet、Dialog、Inspector 内部滚动可用。

## 7. 可访问性

- [ ] 键盘可到达所有核心控件；
- [ ] Focus ring 清晰；
- [ ] 200% Zoom 与 320 CSS px Reflow 下核心内容可达且页面无横向滚动；
- [ ] `prefers-reduced-motion` 下非必要动画被移除；
- [ ] Overlay 有 Title，关闭后焦点返回；
- [ ] Icon-only Button 有 accessible name；
- [ ] 状态不只靠颜色；
- [ ] Table、Tabs、Menu、Command 语义正确；
- [ ] 图表有文本摘要；
- [ ] Chromium 与 Firefox 目标场景的 axe 自动扫描无违规；自动扫描不被描述为 WCAG 认证。

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

可见页面、路由、布局、产品组件、shadcn Primitive 或 Theme 的变更必须同时有 `check:web` 与真实浏览器 E2E；纯 Hook 和纯 View Model 使用 Web Typecheck 与单元测试。
