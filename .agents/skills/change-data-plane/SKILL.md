---
name: change-data-plane
description: 修改协议入口、路由、凭据、传输、Streaming、观测或 Request/Attempt 记录。
---

# 修改数据面

先读：

1. `apps/gateway/src/data-plane/AGENTS.md`
2. `docs/architecture/data-plane-protocol-proxy.md`
3. `docs/conventions/data-plane-streaming.md`
4. `docs/conventions/runtime-invariants.md`
5. `docs/conventions/defensive-patterns.md`
6. 受影响协议 Fixture 和测试

不可协商规则：

- 保持入口协议和未知 Provider 字段；
- 不使用 Provider SDK 重建透明请求；
- 不使用 `Response.clone()`、`ReadableStream.tee()` 或 `streamSSE()` 构建观测；
- 主流可以等待下游背压，观测必须有界且非阻塞；
- 客户端取消传播到上游 `AbortSignal`；
- 首个下游字节后不改变 RouteTarget；
- 记录所有影响上游的决定，不记录完整 Secret；
- `Request` 和 `Attempt` 保持独立记录；
- 新高风险关系必须登记 Source、Consumer、Test 和 Manifest，不接受未被生产调用的装饰性 invariant。

执行：

```bash
pnpm change-scope --base <confirmed-base>
pnpm evidence:select --base <confirmed-base>
```

证据：

- 路由、凭据或 Transport：`pnpm check:data`；
- Body、Header、Stream、取消或记录：`pnpm check:protocol`；
- 持久化：额外运行 `pnpm check:db`；
- 入口或发布产物：额外运行 `pnpm check:artifact`。
