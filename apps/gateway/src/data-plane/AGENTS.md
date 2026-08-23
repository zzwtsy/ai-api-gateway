# 数据面规则

- 不导入 Control Plane；
- 透明代理路径不使用 Provider SDK；
- 不使用封闭 DTO 校验完整 Provider Body；
- 没有明确 Patch 时保留原始请求字节和未知字段；
- 不使用 `Response.clone()`、`ReadableStream.tee()` 或 `streamSSE()`；
- Observer 只使用 `tryWrite`，不得对主流施加背压；
- 从不可变 RoutingSnapshot 路由，不逐请求查询配置表；
- 客户端取消必须中止上游请求；
- 发出首个下游字节后不得切换 RouteTarget；
- 记录所有影响上游的决定，但不得记录完整 Secret；
- Gateway 自有错误使用入口协议兼容表示，不伪装成上游错误；
- 数据面测试必须检查 Mock Provider 实际收到的内容和客户端实际收到的字节。

- 修改 Routing、Transport、Recording、Observation 或 Shutdown 关系时同步 `runtime-invariants.json`，并证明非法关系会变红；
- 读 `docs/conventions/defensive-patterns.md` 后再改取消、竞态、回退、Observer 或关闭流程；
- 上游影响必须可记录（Upstream-affecting ⇔ Recorded）。
