---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 流式观测使用有界、非阻塞旁路

Status: implemented

## Problem

系统需要解析 Usage、TTFT 和错误信息，但慢速解析器不能保留长时间 Provider Stream 的无限副本，也不能延迟客户端接收数据。

## Decision

主流只按下游需求读取并写出上游 Chunk。每个 Chunk 通过 `tryWrite` 尝试放入有界 Observer 队列；超出预算时丢弃后续旁路数据，并把观测标记为不完整。

## Alternatives considered

- **`ReadableStream.tee()`。** 拒绝：慢分支可能累积无界数据。
- **等待 Observer 解析完成。** 拒绝：观测会成为主路径背压。
- **完整缓冲响应后统一解析。** 拒绝：破坏流式延迟并放大内存风险。

## Consequences

过载时部分 Usage 细节可能缺失，但客户端传输保持权威和稳定。产品必须明确区分 `observation_incomplete` 与 `request_failed`。

## Verification

- Observer 容量和溢出单元测试；
- 原始 Streaming 协议测试；
- Data Plane 静态检查禁止 `clone()`、`tee()` 和 `streamSSE()`。
