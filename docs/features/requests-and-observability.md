---
document_id: AIGW-OBS-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 请求可观测性

## 1. 双层事实模型

```text
Request = Harness 发起的一次逻辑请求
Attempt = Gateway 对上游的一次真实 HTTP 调用
```

示例：

```text
Request #1 最终成功
├── Attempt 1：智谱主 Key → 429
└── Attempt 2：智谱备用 Key → 200
```

从客户端角度错误率是 0%，从上游 Attempt 角度错误率是 50%。两者不得混合。

## 2. Request 生命周期

```text
received
→ authenticated
→ routed
→ attempting
→ streaming / waiting
→ succeeded | failed | cancelled | interrupted
```

关键时间：

```text
received_at
route_resolved_at
first_attempt_started_at
first_upstream_byte_at
first_semantic_output_at
completed_at
```

## 3. Attempt 生命周期

```text
created
→ connecting
→ headers_received
→ streaming / body_received
→ succeeded | failed | cancelled | interrupted
```

Attempt 在发送上游前创建，确保连接错误也有记录。

## 4. 状态与错误分类

### 4.1 Request final_status

```text
succeeded
failed
cancelled
interrupted
```

### 4.2 Attempt status

```text
succeeded
failed
cancelled
interrupted
```

### 4.3 error_category

```text
client_error
gateway_auth_error
gateway_routing_error
gateway_validation_error
gateway_internal_error
upstream_auth_error
upstream_rate_limit
upstream_client_error
upstream_server_error
connection_error
timeout
protocol_error
stream_interrupted
client_cancelled
unknown
```

HTTP 状态只是证据之一。例如 Responses 可以 HTTP 200 后发送 `response.failed`。

## 5. 指标口径

### 5.1 请求级

```text
request_count
request_success_rate
request_error_rate
client_cancel_rate
stream_interruption_rate
fallback_rate
average_attempts_per_request
p50/p95/p99 total_latency
p50/p95/p99 ttft
```

公式：

```text
request_error_rate = final failed requests / all completed requests
fallback_rate = requests with attempt_count >= 2 / all requests
```

客户端取消默认从 Provider 错误率中排除，但单独统计。

### 5.2 Attempt 级

```text
attempt_count
attempt_success_rate
attempt_error_rate
rate_limit_rate
upstream_5xx_rate
auth_failure_rate
connection_failure_rate
p50/p95/p99 attempt_latency
```

### 5.3 TTFT

```text
TTFT = first_semantic_output_at - request.received_at
```

如果没有语义输出：

- 非流式使用完整响应到达时间作为 first semantic output；
- 请求失败时 TTFT 为 null；
- 心跳、空 delta、Header 不算语义输出。

## 6. Usage 归一化

系统保留 `raw_usage`，并映射到：

```text
input_tokens
output_tokens
reasoning_tokens
cache_read_tokens
cache_write_tokens
audio_input_tokens
audio_output_tokens
total_tokens
```

映射器按 `protocol + endpoint compatibility profile` 版本化。新字段出现时：

- 原始数据仍保存；
- 未识别字段不丢失；
- 后续可以离线重算 normalized usage；
- 不能把缺失字段按 0 处理。

## 7. Raw Payload

### 7.1 策略

```text
full
truncated
metadata_only
disabled
```

默认：`truncated`。

分别配置 Request 和 Response：

```text
request_body_policy
response_body_policy
max_request_body_bytes
max_response_body_bytes
retention_days
```

### 7.2 脱敏

永久脱敏：

```text
Authorization
x-api-key
Cookie
Set-Cookie
Provider 自定义认证 Header
```

可配置 JSON Pointer 脱敏：

```text
/user
/metadata/email
/messages/*/content
```

默认不自动删除 Prompt，因为详细日志是用户需求，但必须清晰显示风险。

### 7.3 存储

MVP 可把小型截断 Payload 存 PostgreSQL JSONB/Text；完整大型 Payload 建议放本地对象存储目录并在数据库保存引用、大小和哈希。不得把大 Body 直接放主 Request 行。

## 8. 请求详情数据

请求详情至少显示：

```text
Gateway Request ID
客户端 / Harness
协议与入口路径
请求模型
匹配 RouteRule
实际 Provider / Endpoint / Model
最终 Account / Credential Mask
Request 状态
Attempt 列表
TTFT / 总耗时
Usage / Cost
兼容性警告
时间线
Raw Request / Response 策略
```

## 9. 时间线事件

推荐事件类型：

```text
request.received
client.authenticated
route.resolved
attempt.started
attempt.headers_received
attempt.first_semantic_output
attempt.failed
credential.cooldown_started
route.fallback
response.completed
stream.interrupted
client.cancelled
request.completed
```

时间线从结构化事件生成，不依赖文本日志正则解析。

## 10. Trace 与 Request ID

- Gateway 生成内部 Request ID；
- 保存客户端 `x-client-request-id`、`thread-id`、`session-id`；
- 保存上游 `x-request-id` 等常见 ID；
- 支持 `traceparent`/`tracestate` 透传和记录；
- 不把内部数据库 ID 暴露给上游。

## 11. 聚合维度

```text
time bucket
harness profile
gateway client
provider
endpoint
account
credential
requested model
upstream model
protocol
route rule
status/error category
```

Dashboard 默认不下钻到 Credential；详细分析页可选。

## 12. 数据保留

建议默认：

```text
Request/Attempt metadata: 180 天
Raw truncated payload: 30 天
Raw full payload: 7 天
hourly aggregates: 1 年
daily aggregates: 长期
```

具体值由用户配置。清理任务必须分批执行，避免锁表。

## 13. 内部应用日志

应用日志与请求事实分开：

- 应用日志：启动、配置发布、数据库、后台任务；
- Request/Attempt：可查询业务事实；
- 审计日志：Secret、Route、Client Key 等高风险变更。

应用日志推荐生产 JSONL，字段包含 `requestId`，但不能成为分析数据源。

## 14. 验收条件

- 主 Key 429、备用 Key 成功时，Request 成功且 Attempt 一成一败；
- 请求错误率与 Attempt 错误率不同；
- Responses HTTP 200 + `response.failed` 记录语义失败；
- 客户端取消不计入 Provider 5xx；
- TTFT 使用首个语义事件；
- 未知 Usage 显示 unknown；
- Raw Payload 关闭后仍保存最小元数据；
- 所有 Secret 均被脱敏。
