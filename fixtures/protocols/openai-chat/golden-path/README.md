---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# OpenAI Chat Keyless Golden Path Fixture

该 Fixture 固定一条不依赖真实 Provider Key 的完整协议旅程：原始 JSON 请求进入真实 Hono Application，经 Gateway Client Key、RoutingSnapshot、Provider Credential、Transport、原始 SSE 流和 Request/Attempt Recorder 后输出可比较快照。

`upstream-response.json` 的 Chunk 会故意在一个中文 UTF-8 字符内部切分，用于证明 Gateway 不按字符串重新组装 SSE。输入还包含 Cookie、`x-api-key` 和未知 Provider 字段：前两者不得进入上游，未知字段必须逐字节保留。

更新流程：先解释可观察协议为何变化，再修改 `expected-snapshot.json`。不得使用自动 Normalizer 隐藏真实字段漂移；只允许在测试代码中移除 UUID 和绝对时间等非确定值。
