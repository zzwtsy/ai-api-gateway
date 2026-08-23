---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# DeepSeek 兼容性快照

> 快照日期：2026-08-20  
> 性质：文档声明 + 待实测；运行时应以 Endpoint Probe 为准。

## 1. Endpoint 建议

| 名称 | 协议 | 参考 Base URL | 初始状态 |
|---|---|---|---|
| DeepSeek Chat | OpenAI Chat Completions | `https://api.deepseek.com` | documented |
| DeepSeek Responses | OpenAI Responses | `https://api.deepseek.com` | partial / probe required |
| DeepSeek Anthropic | Anthropic Messages | `https://api.deepseek.com/anthropic` | partial / probe required |

Request Path 必须由预设明确保存，不能仅凭表格推断。

## 2. Chat Completions

文档确认：

- OpenAI 兼容 Chat Completions；
- 支持 SSE，通常以 `[DONE]` 结束；
- Usage 包含 prompt/cache hit/cache miss/completion；
- 支持 Function Tool；
- Thinking 使用 `thinking` 扩展与 `reasoning_effort`；
- 某些采样参数在 Thinking 模式会被忽略。

Gateway 行为：只透传和记录，不自动删除被忽略参数。CompatibilityFact 标记 `ignored`。

## 3. Responses

官方提供 Responses 文档和 Codex 适配指南，但兼容性不是完整 OpenAI parity。需要重点 Probe：

```text
支持模型范围
HTTP/SSE 终态
function tool
custom apply_patch
其他 custom tool
reasoning.summary
text.format/json_schema
parallel_tool_calls
prompt_cache_key
service_tier
store/previous_response_id
图片和文件输入
```

Route 创建时不能因为 Endpoint 返回 200 就标记 fully verified。模型支持可能随时间变化，必须按具体模型记录。

## 4. Anthropic

文档确认：

- Base URL 为 Anthropic 兼容入口；
- `x-api-key` 可用；
- `anthropic-version` / `anthropic-beta` 可能被忽略；
- Claude 模型名可能被服务端映射；
- 未支持模型名可能自动落到默认 Flash 模型。

Gateway 应主动把客户端模型映射为明确 DeepSeek 模型 ID，保存 upstream reported model，避免依赖隐式映射。

## 5. 推荐 CompatibilityProfile

```text
openai_chat: documented
openai_responses: partial + probe required
codex: partial + model-specific probe
anthropic: partial
claude_code: partial + multi-model-slot probe
```

## 6. 推荐 Probe Fixture

- Chat：非流式、SSE、Tool、Thinking、Usage/cache；
- Responses：文本、Function Tool、apply_patch、Reasoning、Structured Output、semantic failure；
- Anthropic：文本、Tool Use/Result、Thinking、Claude 别名和明确模型 ID；
- 所有协议：401、429、500、客户端取消。

## 7. 参考

- https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
- https://api-docs.deepseek.com/zh-cn/guides/responses_api
- https://api-docs.deepseek.com/zh-cn/guides/anthropic_api
- https://api-docs.deepseek.com/zh-cn/guides/coding_agents
