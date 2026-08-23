---
document_id: AIGW-GLOSS-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 术语表

| 术语 | 定义 |
|---|---|
| Harness | 使用模型 API 完成 Agent/编码工作的客户端工具，例如 Codex、Claude Code、Pi。 |
| HarnessProfile | 某类 Harness 的协议、配置模板和兼容性行为。 |
| GatewayClient | Harness 的一个具体安装实例或用途。 |
| GatewayClientKey | Harness 调用 Gateway 使用的 Key；只保存哈希。 |
| Provider | AI 厂商或服务组织，例如 DeepSeek、智谱、Kimi。 |
| UpstreamEndpoint | Provider 的某个具体协议入口，由 Base URL、Path、协议和鉴权定义。 |
| ProviderAccount | Provider 中的账号、套餐或计费身份。 |
| ProviderCredential | 上游 API Key/Token；加密存储并可解密。 |
| EndpointCredential | Endpoint 与 Credential 的可用绑定、优先级和覆盖配置。 |
| ModelDefinition | 与具体 Endpoint 无关的基础模型概念。 |
| ProviderModelBinding | 某 Endpoint 接受的实际模型 ID 及其能力、限制和价格。 |
| RouteRule | 根据客户端、Harness、协议和请求模型进行匹配的规则。 |
| RouteTarget | RouteRule 按顺序尝试的同协议上游目标。 |
| RequestPatch | Header、Query 或 Body 的显式参数注入。 |
| Request | Harness 发起的一次逻辑请求。 |
| Attempt | Gateway 对上游发起的一次真实 HTTP 调用。 |
| TTFT | Time To First Token/semantic output；本文使用首个语义输出时间。 |
| SSE | Server-Sent Events，Chat/Responses/Anthropic 常用流式传输。 |
| Raw Payload | 原始或截断的请求/响应内容。 |
| NormalizedUsage | 从不同协议 Usage 映射出的统一 Token 字段。 |
| PricingRule | 某模型、Endpoint 或账号在时间范围内的价格规则。 |
| PricingSnapshot | Attempt 发生时冻结的实际价格。 |
| API-equivalent Cost | 按公开 API 单价估算的使用价值。 |
| Estimated Billed Cost | 根据账号计费模式估算的实际费用。 |
| Reported Cost | 厂商明确报告的费用。 |
| CompatibilityProfile | Endpoint 对某 Harness 的整体兼容状态。 |
| CompatibilityFact | 某个字段/能力的支持、忽略或不支持事实。 |
| Probe | 受控的兼容性或健康检测请求。 |
| Route Snapshot | Route Compiler 生成的不可变运行时路由配置。 |
| Fallback | 当前 Credential/Target 失败后，在同协议内尝试下一个目标。 |
| Cooldown | Credential 因 429 等原因暂时不参与选择。 |
| Circuit Breaker | Endpoint 连续失败后短时停止选择的状态机。 |
| Control Plane | Provider、模型、路由、客户端、UI 等配置管理。 |
| Data Plane | 实际请求鉴权、路由、转发、流式和记录。 |
