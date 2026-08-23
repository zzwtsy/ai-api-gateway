---
document_id: AIGW-SCOPE-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 范围与设计原则

## 1. 不可破坏的产品边界

### 1.1 不做跨协议转换

入口协议与上游协议必须一致：

```text
OpenAI Chat Completions → OpenAI Chat Completions
OpenAI Responses        → OpenAI Responses
Anthropic Messages      → Anthropic Messages
```

以下行为禁止：

```text
Responses → Chat Completions
Chat Completions → Anthropic Messages
Anthropic Messages → Responses
```

“兼容”只表示上游声称或实测可接受该协议，不代表所有字段语义一致。

### 1.2 不做能力驱动自动路由

系统不会因为请求包含图片、音频、Web Search、Tool、MCP 或 Structured Output 而自动切换模型，也不会调用第二个模型生成图片描述或补充能力。

能力元数据仅用于：

- UI 展示；
- 创建路由时警告；
- Endpoint Probe；
- 请求失败后的解释；
- 人工决策。

### 1.3 不做多租户平台

系统面向单一所有者，不实现组织、租户、计费售卖、充值、发票、复杂 RBAC 或对外开发者门户。

### 1.4 不做移动端

页面只保证桌面浏览器体验。最低宽度目标 1280px，设计基准 1440px。

## 2. 协议透明代理原则

Gateway 可以：

- 识别入口路径和协议；
- 验证 Gateway Client Key；
- 读取请求中的 `model`；
- 修改 `model`；
- 替换鉴权 Header；
- 修改目标 URL；
- 添加已配置的 Header、Query 和受控 Body Patch；
- 添加 Gateway Request ID；
- 旁路解析 SSE 统计指标。

Gateway 不可以：

- 删除未知 JSON 字段；
- 重建完整请求 DTO 后丢弃未来字段；
- 改写 `messages`、`input`、`tools` 的结构；
- 重新生成上游 SSE 事件；
- 把上游错误伪造成另一厂商错误；
- 在客户端已收到首字节后更换上游；
- 在未明确配置的情况下修复、删除或降级参数。

## 3. 控制面与数据面分离

逻辑上分为：

- **数据面**：鉴权、路由、转发、流式、取消、Attempt 记录；
- **控制面**：Provider、Endpoint、Credential、模型、路由、客户端、价格、Probe 和 UI。

MVP 可以部署为同一进程，但代码边界必须分开。控制面数据库查询失败时，已经编译并缓存的路由快照应尽量继续服务短时间请求。

## 4. 确定性优先

相同的客户端、协议、模型和有效配置应得到相同的 RouteRule。Credential 的 Round Robin 可以变化，但规则匹配结果必须可解释、可模拟、可复现。

禁止隐式“最优模型选择”。价格、延迟和能力不参与自动模型选择，除非未来通过显式 ADR 引入。

## 5. 外部元数据不是真相源

models.dev、厂商文档和 Provider `/models` 接口都可能不完整或过时。运行时真相按优先级分为：

```text
本地明确配置
> 受控 Probe 结果
> 厂商文档声明
> models.dev 元数据
> unknown
```

外部同步不得覆盖用户手动字段。

## 6. 失败必须显式

- 未匹配路由：返回稳定 Gateway 错误；
- 路由协议不一致：禁止保存或启用；
- 价格未知：显示 `unknown`；
- Usage 缺失：显示 `unknown`，而不是 0；
- 兼容性未验证：显示 `unverified`；
- Raw Payload 被截断或关闭：在请求详情中显示记录策略。

## 7. 安全默认值

- Gateway Client Key 只保存哈希；
- Provider Credential 必须可解密但加密存储；
- 所有认证 Header 永久脱敏；
- 导出默认不包含 Provider Credential；
- Raw Payload 默认使用截断模式；
- 高风险更改需要显式保存；
- 不允许从客户端透传上游鉴权 Header。

## 8. MVP 明确包含

- OpenAI Chat Completions HTTP/SSE；
- OpenAI Responses HTTP/SSE；
- Anthropic Messages HTTP/SSE；
- Codex 专用 Responses 入口和模型目录；
- Gateway Client Key；
- 同厂商多个账号和多个 API Key；
- 确定性模型映射；
- 同协议 RouteTarget 回退；
- Request/Attempt 日志；
- Usage、价格和成本；
- models.dev 预填；
- Endpoint Probe；
- Desktop Web UI；
- Docker Compose 单机部署。

## 9. MVP 明确不包含

- WebSocket Responses；
- Zstandard 请求体改写；
- Remote Compaction；
- `previous_response_id` 服务端状态模拟；
- 多实例一致性与分布式锁；
- Redis/Kafka；
- 自动视觉路由；
- 自动能力降级；
- 自动质量评测与智能模型选择；
- 对外用户注册与团队权限。
