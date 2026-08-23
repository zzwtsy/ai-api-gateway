---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 数据面流式传输约定

数据面在没有明确 Gateway Patch 时保留原始请求语义，并按顺序透传上游响应字节。

```text
上游 Chunk
├── await downstream.write(chunk)  由客户端背压控制
└── observer.tryWrite(chunk)        有界、非阻塞、不等待
```

## 强制规则

- 主流允许等待下游背压；
- 客户端取消必须触发上游 `AbortSignal`；
- Observer 队列满时标记 `observation_incomplete` 并丢弃旁路数据；
- Observer 失败不得改变客户端响应；
- 发出首个下游字节后不得切换 Credential 或 RouteTarget；
- 流式请求期间不得持有数据库事务；
- 路由决定来自不可变快照，不逐请求查询配置表。

## 禁止行为

- 使用 `Response.clone()` 构建长期观测分支；
- 使用 `ReadableStream.tee()` 让慢分支无限累积；
- 使用 `streamSSE()` 或 JSON 重新序列化 Provider 事件；
- 将完整响应累计到内存后再发送；
- 把观测解析加入主路径背压；
- 把客户端取消统计为 Provider 5xx。

完整协议合同见 [数据面协议代理](../architecture/data-plane-protocol-proxy.md)。
