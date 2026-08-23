---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 智谱兼容性快照

> 快照日期：2026-08-20  
> 性质：文档声明 + 待实测。

## 1. Endpoint 建议

| 名称 | 协议 | 参考 Base URL | 初始状态 |
|---|---|---|---|
| 智谱通用 OpenAI | OpenAI Chat Completions | `https://open.bigmodel.cn/api/paas/v4/` | documented |
| 智谱 Coding Plan OpenAI | OpenAI Chat Completions | 厂商专属 Coding Endpoint | documented / plan-specific |
| 智谱 Anthropic | Anthropic Messages | `https://open.bigmodel.cn/api/anthropic` | documented |
| 智谱 Responses | OpenAI Responses | 未确认 | unverified / blocked by default |

## 2. Key 与套餐

智谱文档说明 Coding Plan/团队套餐 Key 与平台其他 API Key 可能不通用。设计上必须：

- 把普通 API 和 Coding Plan 建成不同 Endpoint；
- ProviderAccount 保存套餐类型；
- Credential 只绑定可用 Endpoint；
- 不尝试用同一个 Key 自动访问所有入口。

## 3. OpenAI Chat

文档确认：

- 使用 OpenAI SDK；
- Bearer Auth；
- Chat Completions；
- 流式；
- GLM Thinking 通过 `extra_body.thinking`；
- 某些参数范围和 OpenAI 不同。

需要 Probe Tool、Structured Output、Usage、缓存和错误语义。

## 4. Anthropic / Claude Code

文档确认：

- Anthropic SDK 可通过 Base URL 接入；
- Claude Code 有 Coding Plan 配置；
- GLM 模型可能使用 `[1m]` 后缀；
- Claude Code 需同时配置 Opus/Sonnet/Haiku 等槽位；
- Context/Auto Compact 参数需与模型一致。

Gateway Client 配置生成器应完整输出多槽位变量，不删除模型后缀。

## 5. Responses

当前设计不应把智谱 OpenAI Chat 兼容接口当作 Responses。没有明确原生 Responses 文档和 Probe 前：

```text
codex compatibility = blocked
openai_responses compatibility = unverified
```

这不是对未来能力的否定，而是遵守“不做协议转换”。

## 6. 推荐 Probe

- 通用 Chat 与 Coding Chat 分开测试；
- 同 Key 跨 Endpoint 鉴权测试；
- Anthropic Tool/Thinking/Stream；
- `[1m]` 模型 ID；
- 429 Header 和套餐限流；
- Usage 与价格返回。

## 7. 参考

- https://docs.bigmodel.cn/cn/api/introduction
- https://docs.bigmodel.cn/cn/guide/develop/openai/introduction
- https://docs.bigmodel.cn/cn/guide/develop/claude/introduction
- https://docs.bigmodel.cn/cn/guide/develop/claude
