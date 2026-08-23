---
document_id: AIGW-CLIENT-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Harness、Gateway Client 与客户端 Key

## 1. 两种 Key 的边界

```text
Gateway Client Key
- 给 Codex / Claude Code / Pi 使用
- 用于认证和统计客户端
- 数据库只保存哈希

Provider Credential
- Gateway 调用厂商时使用
- 可解密、加密存储
- 永不暴露给 Harness
```

不得复用同一张表或同一 Secret 管理逻辑。

## 2. HarnessProfile

建议内置：

```text
codex
claude-code
generic-openai-chat
generic-openai-responses
generic-anthropic
pi
```

Profile 描述：

- 允许协议；
- Base URL 模板；
- Key 应放在哪个 Header；
- 是否需要模型目录；
- 推荐超时；
- 配置生成模板；
- Probe 套件。

Codex 当前自定义 Provider 以 Responses 为主要 Wire API，Profile 应默认只允许 Responses，不应将 Chat Endpoint 暴露为可选目标。

## 3. GatewayClient

同一 Harness 可以创建多个 Client：

```text
Codex - Arch
Codex - Windows
Codex - 笔记本
```

好处：

- 分析设备或用途；
- 单独撤销 Key；
- 单独覆盖路由；
- 单独设置成本上限；
- 不依赖 IP 地址。

## 4. Key 格式

推荐：

```text
gw_<profile>_<random>
```

示例：

```text
gw_codex_4J2...
gw_claude_8MT...
```

Key 至少包含 256 bit 随机熵。Prefix 只用于 UI 识别，不能减少安全随机性。

数据库保存：

```text
prefix = gw_codex
last4 = 7A42
secret_hash = Argon2id 或 HMAC-SHA-256
```

对于高吞吐认证，推荐使用带服务器 Pepper 的 HMAC-SHA-256 索引，再进行常量时间比较；Argon2id 更适合人类密码。最终选择需在实现 ADR 中确定。

## 5. Key 创建和轮换

创建响应只返回一次：

```json
{
  "clientId": "...",
  "key": "gw_codex_...",
  "prefix": "gw_codex",
  "last4": "7A42"
}
```

轮换支持短暂重叠：

```text
新 Key active
旧 Key expiring，设置 expires_at
到期后 revoked
```

这样 Harness 可以无中断更新配置。

## 6. 认证流程

1. 从允许的 Header 读取候选 Key；
2. 检查冲突；
3. 通过 Key Prefix 快速定位候选；
4. 计算哈希并常量时间比较；
5. 检查 Key 状态和过期时间；
6. 检查 GatewayClient 状态；
7. 验证入口协议；
8. 更新 `last_used_at`，但不阻塞请求主路径。

## 7. 客户端权限

单用户系统不需要复杂 RBAC，但每个 Client 应支持最小策略：

```text
allowed_protocols
allowed_route_tags          可选
allowed_model_patterns      可选
daily_cost_limit            可选
monthly_cost_limit          可选
request_rate_limit          可选
status
```

限制默认关闭。成本上限达到后，返回明确 Gateway 错误，不能自动换到免费模型。

## 8. 统计归因

每个 Request 必须记录：

```text
client_id
client_name_snapshot
harness_profile_id
harness_profile_slug_snapshot
key_id
```

UI 可按：

- HarnessProfile 聚合：所有 Codex；
- GatewayClient 聚合：Codex - Arch；
- Client Key 下钻：轮换前后 Key；
- 设备标签聚合：workstation / server。

Key ID 只用于安全审计，不应成为普通分析页面默认维度。

## 9. 配置生成器

### 9.1 Codex

生成内容包括：

- Gateway Base URL；
- 环境变量 Key 名；
- `wire_api = "responses"`；
- `supports_websockets = false`；
- 请求重试建议；
- 模型名；
- 可选模型目录配置。

### 9.2 Claude Code

生成：

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
ANTHROPIC_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL
CLAUDE_CODE_SUBAGENT_MODEL
```

系统应提示：Claude Code 可能使用多个内部模型槽位，只配置一个模型变量可能导致后台任务或子 Agent 路由到未配置模型。

### 9.3 通用 OpenAI / Anthropic

按操作系统输出：

- Bash/Zsh；
- PowerShell；
- Windows CMD；
- Python SDK；
- Node.js SDK。

## 10. Client Profile 入口

推荐使用独立 Base URL，而不是 User-Agent 猜测：

```text
Codex:       https://gateway.example/codex
OpenAI:      https://gateway.example/openai/v1
Anthropic:   https://gateway.example/anthropic
```

原因：

- Codex `/models` 格式与标准 OpenAI `/models` 不同；
- 兼容性策略不同；
- 日志天然知道入口 Profile；
- User-Agent 不稳定且可伪造。

## 11. 隐私

GatewayClient 名称可能包含设备名或项目名。导出和截图时提供匿名显示选项；Raw Payload 中不要自动注入 Client 名称给上游，除非用户明确配置。

## 12. 验收条件

- 不同 Harness Key 能独立统计；
- 同一 Harness 多实例能独立撤销；
- Key 完整值只显示一次；
- 旧 Key 可设置短暂过期窗口；
- Client 不能使用未授权协议；
- Codex 和标准 OpenAI 模型目录互不混淆；
- 配置生成器输出可直接复制的命令和配置片段。
