---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Kimi 兼容性快照

> 快照日期：2026-08-20  
> 性质：文档声明 + 待实测。

## 1. Endpoint 建议

| 名称 | 协议 | 参考 Base URL | 初始状态 |
|---|---|---|---|
| Kimi OpenAI Chat | OpenAI Chat Completions | `https://api.moonshot.cn/v1` | documented |
| Kimi Anthropic | Anthropic Messages | `https://api.moonshot.cn/anthropic` | documented / Claude Code guide |
| Kimi Responses | OpenAI Responses | 未提供原生路径 | blocked by default |

## 2. OpenAI Chat

官方 API 概述确认：

- 主要兼容 OpenAI Chat Completions；
- Bearer Auth；
- SSE；
- `/v1/models`；
- `thinking` 通过扩展字段；
- `partial` 位于 assistant message，不是顶层字段；
- `prompt_cache_key` 对 Coding Agent 有意义。

Gateway 不自动注入嵌套 `partial`，仅透传客户端提交值。

## 3. Claude Code

官方指南确认：

- Anthropic Base URL `https://api.moonshot.cn/anthropic`；
- 使用 `ANTHROPIC_AUTH_TOKEN`；
- 建议同时配置主模型、Opus、Sonnet、Haiku、Fable、Subagent；
- 只配置部分变量可能使后台任务静默失败；
- `kimi-k3[1m]` 等后缀是模型 ID 的一部分；
- 不同模型对 Thinking 有不同约束。

Gateway 配置生成器必须完整输出所有槽位，并把每个槽位当独立客户端请求模型匹配。

## 4. Codex

官方 Codex 指南明确说明：Codex 使用 Responses API，而 Kimi 开放平台提供 Chat Completions；指南依赖 CC Switch 转换请求和流式响应。

因此本项目在“不做协议转换”边界下：

```text
Kimi Chat → 不能作为 Codex Responses RouteTarget
Kimi Responses → 在官方提供原生 Endpoint 并 Probe 前不存在
```

UI 可以显示“官方接入方案依赖第三方转换器，本 Gateway 不提供该转换”。

## 5. 推荐 Probe

- Chat：Thinking on/off、Tool、Structured Output、prompt_cache_key、Usage；
- Anthropic：所有 Claude Code 模型槽位、Thinking、Tool Use/Result、WebSearch 行为；
- 长上下文模型后缀；
- 429/504；
- SSE 中断和客户端取消。

## 6. 参考

- https://platform.kimi.com/docs/api/overview
- https://platform.kimi.com/docs/api/chat
- https://platform.kimi.com/docs/guide/codex-kimi
- https://platform.kimi.com/docs/guide/claude-code-kimi
- https://platform.kimi.com/docs/pricing/chat
