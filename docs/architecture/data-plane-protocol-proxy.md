---
document_id: AIGW-PROXY-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 协议代理设计

## 1. 支持的入口

| Profile | 路径 | 协议 | 主要客户端 |
|---|---|---|---|
| OpenAI Chat | `/openai/v1/chat/completions` | OpenAI Chat Completions | 通用 OpenAI SDK、Pi 等 |
| OpenAI Responses | `/openai/v1/responses` | OpenAI Responses | 通用 Responses 客户端 |
| Codex Responses | `/codex/responses` | OpenAI Responses | Codex CLI/App/IDE |
| Codex Models | `/codex/models` | Codex model catalog | Codex |
| Anthropic Messages | `/anthropic/v1/messages` | Anthropic Messages | Claude Code、Anthropic SDK |
| OpenAI Models | `/openai/v1/models` | OpenAI models list | 通用客户端 |

所有路径可通过部署前缀调整，但一个 Harness 配置生成器必须输出匹配的 Base URL。

## 2. 请求处理步骤

```text
1. 生成 gateway_request_id
2. 识别入口协议和 Profile
3. 读取 Gateway Client Key
4. 验证 GatewayClient 权限
5. 限制请求大小与 Content-Type
6. 最小解析 JSON 获取 model
7. 匹配 RouteRule
8. 选择 RouteTarget 与 Credential
9. 构造上游 URL、Header、Query、Body
10. 创建 Attempt
11. 发送请求
12. 透明返回响应 / SSE
13. 旁路解析 Usage、TTFT 和终态
14. 完成 Attempt 与 Request
```

## 3. 请求体策略

### 3.1 保留未知字段

代理层不得使用字段有限的 DTO 完整反序列化后再序列化。推荐使用以下策略之一：

- 读取原始 JSON 为通用对象，只修改已知 JSON Pointer；
- 使用 Lossless JSON 库；
- 对顶层 `model` 做受控重写并保留所有其他字段。

MVP 可以使用标准 JSON 解析，但必须有测试保证未知字段保留。

### 3.2 受保护字段

默认禁止通用 Body Patch 修改：

```text
/messages
/input
/tools
/stream
/model              只允许路由引擎修改
```

允许配置的常见字段示例：

```text
/thinking/type
/reasoning_effort
/reasoning/effort
/service_tier
/prompt_cache_key
```

如果厂商扩展需要修改受保护结构，必须通过专用代码路径和 ADR，不得由任意 JSON Patch 开放。

### 3.3 Patch 模式

- `default_if_absent`：字段不存在时写入；客户端值优先。
- `force`：始终覆盖；UI 必须明确显示。
- `reject_on_conflict`：客户端提交不同值时拒绝请求。

Patch 应按 Provider → Endpoint → Credential → RouteTarget 的层级合并，后层优先；冲突必须可解释。

## 4. Header 策略

### 4.1 接收的客户端鉴权

```text
Authorization: Bearer <gateway-key>
x-api-key: <gateway-key>
```

如果两者同时存在且值不同，返回 `gateway_auth_conflict`。

### 4.2 永久阻止透传

```text
Authorization
x-api-key
Cookie
Set-Cookie
Proxy-Authorization
```

这些 Header 在构造上游请求时完全重建。

### 4.3 可透传或重建的上下文 Header

根据 Endpoint allowlist 处理：

```text
anthropic-version
anthropic-beta
session-id
thread-id
x-client-request-id
traceparent
tracestate
user-agent                 默认替换或追加 Gateway 标识
accept
content-type
```

不使用全量 denylist 透传，因为未来认证 Header 可能以自定义名称出现。应采用 allowlist + Endpoint 显式扩展。

### 4.4 Gateway 响应 Header

```text
x-gateway-request-id
x-gateway-client
x-gateway-provider          可配置是否暴露
x-gateway-model             可配置是否暴露
```

不得向客户端返回上游 Secret 或内部数据库 ID。

## 5. URL 和 Query

`UpstreamEndpoint` 保存明确的 `base_url` 和 `request_path`。URL Join 必须处理：

- Base URL 末尾斜杠；
- Request Path 前导斜杠；
- 已有 Query；
- URL 编码；
- 禁止客户端控制 Host、协议或目标路径；
- 防止 SSRF：自定义 Endpoint 保存时验证协议和目标地址策略。

Query 合并顺序：

```text
Endpoint 默认 Query
→ Credential Query Override
→ RouteTarget Query Patch
```

客户端原始 Query 只允许协议明确支持的参数；管理路径参数不得透传。

## 6. 非流式响应

上游 HTTP 状态、Content-Type 和 Body 默认原样返回。移除 Hop-by-Hop Header：

```text
connection
keep-alive
proxy-authenticate
proxy-authorization
te
trailer
transfer-encoding
upgrade
```

同时记录：

- 上游 Request ID；
- HTTP 状态；
- Duration；
- Usage；
- 实际模型；
- 错误分类。

## 7. 流式响应

### 7.1 字节透传与有界旁路

Gateway 不把上游事件转成内部统一事件后再生成 SSE。正确结构：

```text
Upstream chunk
├── Main path：await write to client，遵守客户端背压
└── Observer Tap：try-enqueue 到有界队列
                  ├── 成功：协议旁路解析
                  └── 满载：observation_incomplete，不阻塞主路径
```

禁止使用 `Response.clone()`、`ReadableStream.tee()` 或 `streamSSE()` 作为长期透明流实现。Observer 解析失败、变慢或达到字节上限只影响统计完整性，不得中断或改变已正常传输的流。

### 7.2 结束条件

- Chat Completions：通常 `data: [DONE]`；
- Responses：观察 `response.completed`、`response.failed`、`response.incomplete`；
- Anthropic Messages：观察 `message_stop` 或协议错误事件。

HTTP 200 不等于语义成功。Request 和 Attempt 必须保存 `semantic_status`。

### 7.3 时间指标

```text
started_at
connected_at
first_upstream_byte_at
first_semantic_output_at
completed_at
```

TTFT 默认使用 `first_semantic_output_at - started_at`。第一个心跳或空 SSE 事件不算语义输出。

### 7.4 背压与取消

- 客户端写入速度控制上游读取；
- 不创建无界缓冲；
- 客户端断开时 Abort 上游请求；
- 上游取消结果记录为 `client_cancelled`，不能误算为 Provider 错误；
- Raw Response 记录可以截断，但不能阻塞流。

## 8. 请求压缩

MVP 不支持需要修改的压缩 JSON 请求体。若收到 `Content-Encoding: zstd` 或未知压缩：

- 对无需改写的纯透明模式可在未来考虑透传；
- 当前因必须重写 `model`，返回明确 `gateway_unsupported_content_encoding`；
- Codex 配置生成器应关闭 Gateway 未支持的请求压缩能力。

## 9. WebSocket

MVP 不支持 Responses WebSocket。Codex Provider 配置应声明 `supports_websockets = false`。未来支持时必须新增独立 Transport 实现，不能把 HTTP/SSE 假装成 WebSocket。

## 10. Gateway 自有错误

上游返回的错误尽量原样透传。Gateway 自己产生的错误按入口协议使用最小兼容 Envelope，同时通过 Header 暴露稳定代码。

OpenAI/Codex 入口：

```json
{
  "error": {
    "message": "No route matches model gpt-5.4",
    "type": "gateway_error",
    "param": "model",
    "code": "gateway_no_route"
  }
}
```

Anthropic 入口：

```json
{
  "type": "error",
  "error": {
    "type": "gateway_error",
    "message": "No route matches model claude-sonnet-*"
  }
}
```

响应 Header：

```text
x-gateway-error-code: gateway_no_route
x-gateway-request-id: req_...
```

这只是入口协议的错误序列化，不属于跨协议转换。

## 11. 标准 Gateway 错误码

```text
gateway_auth_missing
gateway_auth_invalid
gateway_auth_conflict
gateway_client_disabled
gateway_protocol_not_allowed
gateway_invalid_json
gateway_model_missing
gateway_no_route
gateway_route_ambiguous
gateway_route_target_unavailable
gateway_patch_conflict
gateway_request_too_large
gateway_unsupported_content_encoding
gateway_upstream_connect_error
gateway_upstream_timeout
gateway_stream_interrupted
gateway_internal_error
```

## 12. 协议回归测试

每个入口至少测试：

- 未知顶层字段原样保留；
- `model` 精确改写；
- Header 鉴权替换；
- Query 合并；
- 非流式 Body 原样返回；
- SSE 字节序列相同；
- 客户端取消传播；
- 旁路解析失败不影响客户端；
- Gateway 错误 Envelope 正确；
- 上游错误 Body 不被重写。
