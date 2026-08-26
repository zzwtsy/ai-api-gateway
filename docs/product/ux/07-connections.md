---
status: normative
last_reviewed_at: 2026-08-25
language: zh-CN
---

# 连接页

![连接页](assets/connections.png)

## 1. 页面目标

连接页按 Provider 组织 Endpoint、账号、Credential、模型和兼容性。用户应先判断厂商是否可用，再进入具体配置。

## 2. Provider 目录 + 耐久详情

```text
┌──── Provider Directory ────┬──────────── Provider Detail ─────────────┐
│ 搜索                        │ Header：名称、状态、测试、更多            │
│ 仅显示 Provider 名称        │ Tabs：概览 / Endpoints / 账号 / 模型... │
│ 整项点击切换                │ 当前 Tab 的耐久内容                       │
└─────────────────────────────┴──────────────────────────────────────────┘
```

1280px 及以上使用双列，左侧目录约 300px，右侧详情填满剩余空间；1024px 窄工作面按目录、详情上下排列，避免压缩详情表格。Provider 切换不离开页面，详情 Tab 保持在 URL 中。

选中连接使用 `connectionId`，非默认详情 Tab 使用 `tab`，默认概览省略 `tab`。缺失或无效连接 ID 规范化到首项，无效 Tab 规范化到概览；刷新、返回和分享必须恢复同一上下文。删除成功后选择目录中的下一个连接，没有剩余连接时清除 `connectionId` 并回到“添加连接”入口。

## 3. Provider 列表

目录项只显示 Provider 名称，整项是选择当前详情的操作面，并使用选中态表达上下文。目录不重复展示 Endpoint、账号、协议、状态或独立“查看”按钮，避免固定宽度内出现横向滚动；这些事实由右侧详情拥有。

## 4. 详情 Header

显示 Provider 名称、类型、Endpoint 数、最近使用和状态。右侧操作：

- 测试连接；
- 删除连接；
- 更多菜单。

“添加账号”是页面主操作，位于 Page Header；具体 Provider 上下文中也可在账号 Tab 提供次级入口。

### 4.1 创建连接

“添加连接”使用两步居中 Dialog，避免把 Provider、Endpoint 和 Credential 的全部字段同时堆叠：

1. **Provider**：选择可选模板，填写连接名称、Provider 标识和 Provider API Key；
2. **Endpoint**：配置协议、Base URL、请求路径，以及默认账号和 Credential 名称。

“下一步”只校验第一步字段；返回上一步、服务端失败和协议切换都保留已输入内容。模板可以补全两步字段，但用户手工修改请求路径后，协议切换不得再次覆盖。Footer 持续提供取消、上一步和当前主操作；Dialog 在 1024px 工作面内保持完整边界，内容超高时只滚动表单主体，Header 与 Footer 保持可见。

## 5. Tabs

### 5.1 概览

- 顶部健康 Alert；
- 24h 请求、Attempt 成功率、P95 延迟、可用模型；
- Endpoint 健康表；
- 兼容性摘要。

### 5.2 Endpoints

每个 Endpoint 显示协议、Base URL、请求路径、流式支持和状态。不同协议 Endpoint 必须分开，不能只展示一个通用 Base URL。

“添加 Endpoint”使用居中 Dialog，默认继承当前 Provider 的 Base URL 和鉴权方式，支持在同一次提交中添加多行；每行独立配置协议、请求路径和 Credential 绑定。协议切换联动推荐请求路径，用户手工修改路径后不再覆盖。提交时必须显式绑定当前 Provider 下至少一个未禁用 Credential；没有可用 Credential 时禁用入口并解释原因。批量新增以原子结果呈现，不显示部分成功。

“编辑”使用同一套完整 Endpoint 字段，包括名称、协议、Base URL、请求路径、鉴权方式、流式支持和 Credential 绑定。只修改名称不会使已有 Compatibility 或 Model Binding 失效；其他实质配置变化会清理兼容性事实并重置模型绑定，进行中的 Probe 会阻止保存。

“删除”先加载真实影响摘要，再显示明确的不可撤销确认，包括 Credential 绑定、Model Binding、Compatibility Profile/Fact、已完成 Probe 和进行中 Probe 数量。影响加载失败提供“重新加载”；存在进行中 Probe 时阻断确认。确认后删除 Endpoint 配置和其全部 Compatibility/Model 数据，历史 Request 与 Attempt 保留，不假设存在 Endpoint Routing 引用。取消或 Escape 返回原删除行入口，成功删除后焦点回到稳定的“添加 Endpoint”入口；最后一个 Endpoint 删除后只在 Endpoints Tab 显示局部空状态。

添加与编辑 Dialog 均使用固定 Header/Footer 和唯一滚动 Body；1024×768 工作面内 Header、Footer 与主动作保持可达，内容超高时只滚动 Body。

### 5.3 账号

显示 Account 与 Credential：优先级组、Masked Key、状态、冷却剩余、最近错误、最后使用、测试与禁用。

添加账号使用居中 Dialog：

- 账号名称；
- API Key；
- 可选优先级；
- 保存前验证；
- Secret 不回填；
- 完成后列表立即更新并显示测试结果。

### 5.4 模型

展示该 Provider 的模型绑定，并可跳转到全局模型页。

### 5.5 兼容性

按 Endpoint 展示：未知字段透传、SSE、Usage、TTFT、`stream_options`、工具、视觉等实测结果。每个结论包含验证日期、样例模型和证据来源。

### 5.6 高级

Header、Query、有限 Body Patch、Timeout、Proxy 等低频设置。默认折叠，修改后必须显式保存和重新 Probe。

## 6. 测试行为

“测试连接”不是单一 ping。至少包括：

- 鉴权；
- 模型请求；
- 流式响应；
- Usage；
- 关键字段兼容性。

测试是长任务，应显示进度，可关闭浮层，结果持续显示在详情页。

完整兼容性 Probe 的 Run、进度和模型级事实由服务端拥有。关闭启动/进度浮层不取消任务，兼容性 Tab 继续轮询；刷新带 `tab=compatibility` 的 URL 后从服务端恢复运行中、失败或完成状态。完整 Credential、原始请求和原始响应不进入页面。

## 7. 删除与禁用

删除 Account 或 Credential 前，必须列出引用它的路由和影响。若仍被已发布路由引用，默认阻断删除，只允许先禁用或迁移引用。Credential 禁用属于高影响即时操作，必须使用确认 Dialog，确认前不得调用写 API。

Endpoint 的删除影响与确认规则见 Endpoints Tab；当前实现不声明 Endpoint Routing 引用。

连接删除属于不可逆的配置级操作。确认前先加载真实影响摘要，列出 Endpoint、账号、Credential、绑定、模型和兼容性数据数量；历史 Request 与 Attempt 明确保留。进行中的 Compatibility Probe 由服务端阻断，影响加载失败或 DELETE 失败时保留 Dialog 并提供重试；Bootstrap 连接与普通连接一样允许删除。成功后焦点回到下一个目录项，若删除最后一个连接则回到“添加连接”。

连接详情通过 `connectionId` 和 `tab=endpoints` 保持 Endpoint 上下文；刷新与浏览器 Back 后仍恢复同一连接和 Endpoints Tab。
