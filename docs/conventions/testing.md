---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 当前测试证据约定

使用能够证明受影响行为的最窄证据，本地不机械重复完整 CI 矩阵。

- 单元测试：路由匹配、凭据选择、错误分类、Observer 上限；
- 控制面合同测试：OpenAPI `operationId`、描述、响应和 Envelope；
- 协议 Fixture：未知字段、任意 Chunk 边界、原始字节、取消和首字节前后失败；
- PostgreSQL 集成测试：Testcontainers + 真实 Migration；
- 浏览器旅程：连接创建、代理请求和 Request/Attempt 检查器；
- Artifact Smoke：编译 JavaScript、Vite 产物、Migration 和 Docker 启动。

测试必须验证外部世界：模拟上游实际收到什么、客户端实际收到什么、数据库实际记录什么。组件自己返回的 `success: true` 不是充分证据。

完整策略见 [测试与验收](testing-and-acceptance.md)，变更矩阵见 [质量门禁与证据](quality-gates-and-evidence.md)。
