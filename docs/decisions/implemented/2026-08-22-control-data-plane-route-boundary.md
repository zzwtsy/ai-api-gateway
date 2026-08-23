---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision: 控制面与数据面使用不同 HTTP Route 模式

Status: implemented

## Problem

控制面需要严格 Schema、OpenAPI 和生成客户端；数据面必须保留未知字段、原始错误和 SSE 字节。把同一 `createRoute`/DTO/Envelope 模式套在两者上会破坏透明代理语义。

## Decision

控制面使用 `createRoute → typed handler → service → OpenAPI`。数据面使用普通 Hono Route 和专用协议处理器，只最小提取 Gateway 负责字段，响应使用原协议表示。两类 Route 在 Application Composition Root 挂载，但不共享运行时 DTO 和统一 Envelope。

## Alternatives considered

- **所有入口都使用完整 Zod DTO。** 拒绝：不完整 Schema 会丢弃未知 Provider 扩展字段。
- **所有入口都返回 Gateway 统一 Envelope。** 拒绝：Harness 期待 OpenAI/Anthropic 兼容响应。
- **完全不生成 Gateway 数据面文档。** 未采用为绝对规则：可以生成宽松说明文档，但不能作为运行时模型或前端 OpenAPI 类型来源。

## Consequences

项目维护两个 HTTP 关注点和两组错误表示。控制面类型体验更强，数据面则保持协议透明。测试必须分别覆盖 OpenAPI Contract 和原始协议 Fixture。

## Verification

- ESLint Boundary 禁止 data-plane 导入 control-plane Schema；
- Control OpenAPI Contract Test；
- Unknown Field、Raw Byte 和 Gateway Error Fixture；
- 生成客户端只消费 `admin-openapi.json`。
