---
document_id: AIGW-SOURCES-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 参考来源

> 检索日期：2026-08-22。厂商接口、Harness 行为和工程参考项目会变化；实施前应通过官方文档、代码快照、Compatibility Probe 和版本化 Fixture 重新验证。

## OpenAI Codex

- Repository: https://github.com/openai/codex
- Provider registry: https://github.com/openai/codex/blob/main/codex-rs/model-provider-info/src/lib.rs
- Responses request types: https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/common.rs
- Responses transport: https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/endpoint/responses.rs
- Models endpoint: https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/endpoint/models.rs

设计时重点：自定义 Provider 的 Responses 语义、Header/Query、Retry、Stream Idle、WebSocket 和专用 Models Catalog。

## DeepSeek

- Chat Completions: https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
- Responses: https://api-docs.deepseek.com/zh-cn/api/create-response
- Responses Guide: https://api-docs.deepseek.com/zh-cn/guides/responses_api
- Anthropic API: https://api-docs.deepseek.com/zh-cn/guides/anthropic_api
- Agent integrations: https://api-docs.deepseek.com/zh-cn/guides/coding_agents

需要持续验证：Responses 支持模型、状态语义、字段静默忽略、Custom Tool、图片/文件输入和无状态限制。

## 智谱

- API introduction: https://docs.bigmodel.cn/cn/api/introduction
- HTTP API: https://docs.bigmodel.cn/cn/guide/develop/http/introduction
- OpenAI compatibility: https://docs.bigmodel.cn/cn/guide/develop/openai/introduction
- Claude API compatibility: https://docs.bigmodel.cn/cn/guide/develop/claude/introduction
- Claude Code: https://docs.bigmodel.cn/cn/guide/develop/claude

需要持续验证：通用 API 与 Coding Plan Endpoint/Key 的差异、Responses 是否正式提供、模型后缀和 Claude Code 版本兼容性。

## Kimi

- API Overview: https://platform.kimi.com/docs/api/overview
- Chat Completions: https://platform.kimi.com/docs/api/chat
- Codex guide: https://platform.kimi.com/docs/guide/codex-kimi
- Claude Code guide: https://platform.kimi.com/docs/guide/claude-code-kimi
- Pricing: https://platform.kimi.com/docs/pricing/chat

公开 Chat 兼容入口不能被当作原生 Responses RouteTarget；外部转换不符合本项目协议保持边界。

## models.dev

- Website/API: https://models.dev/api.json
- Repository: https://github.com/anomalyco/models.dev

models.dev 只作为模型能力、上下文和参考价格预填，不是运行时可用性或最终计费真相。

## UI 与工程初始化技术

- shadcn/ui Vite 安装：https://ui.shadcn.com/docs/installation/vite
- shadcn CLI：https://ui.shadcn.com/docs/cli
- shadcn Base UI 迁移说明：https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- Base UI：https://base-ui.com/react/overview/quick-start
- Antfu ESLint Config：https://github.com/antfu/eslint-config
- Vite React TypeScript Template：https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
- TanStack Router：https://tanstack.com/router/latest
- TanStack Router File-Based Routing：https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing
- TanStack Router Vite Plugin：https://tanstack.com/router/latest/docs/framework/react/routing/installation-with-vite
- TanStack Query：https://tanstack.com/query/latest
- OpenAPI TypeScript：https://openapi-ts.dev/
- openapi-fetch：https://openapi-ts.dev/openapi-fetch/
- openapi-react-query：https://openapi-ts.dev/openapi-react-query/
- TanStack Table：https://tanstack.com/table/latest

固定版本、初始化命令和本地补丁见 [官方工具链初始化基线](official-toolchain-baseline.md)。

## 工程参考：hono-openapi-starter

- Repository: https://github.com/zzwtsy/hono-openapi-starter
- Feature Route: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/features/projects/routes.ts
- Typed Handler: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/features/projects/handlers.ts
- Feature binding: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/features/projects/index.ts
- Explicit registration: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/app/register-features.ts
- Application composition: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/app/create-application.ts
- Static OpenAPI export: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/src/app/export-openapi.ts
- OpenAPI contract test: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/backend/tests/contract/openapi-contract.test.ts
- Generated client freshness: https://github.com/zzwtsy/hono-openapi-starter/blob/main/scripts/openapi/check-generated.mjs
- Dependency boundaries: https://github.com/zzwtsy/hono-openapi-starter/blob/main/eslint.config.mjs
- Agent guide: https://github.com/zzwtsy/hono-openapi-starter/blob/main/AGENTS.md
- Web Vite file-route setup: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/frontend/vite.config.ts
- Web generated route tree: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/frontend/src/routeTree.gen.ts
- Thin file route: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/frontend/src/routes/_authenticated/dashboard.tsx
- Web router composition: https://github.com/zzwtsy/hono-openapi-starter/blob/main/apps/frontend/src/router.tsx

本规范吸收：垂直切片、显式 `routes → handlers → service → index`、无副作用 Application Composition、OpenAPI 单一事实来源、生成物新鲜度检查、文档任务路由和 ESLint 依赖边界。

不直接继承：企业 IAM/组织权限、项目特有审计复杂度和 Alova/Wormhole 客户端选择。

## 工程参考：deepseek-harness

- Repository: https://github.com/deepseek-ai/deepseek-harness
- Root Agent contract: https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md
- Architecture: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
- Testing policy: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md
- Defensive patterns: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/defensive-patterns.md
- Agent Notes lifecycle: https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/README.md
- Gate runner: https://github.com/deepseek-ai/deepseek-harness/blob/master/scripts/run-gates.ts
- Pre-push evidence selection: https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-pre-push-checks/SKILL.md
- Git hooks: https://github.com/deepseek-ai/deepseek-harness/blob/master/lefthook.yml

本规范吸收：文档路由、局部 Agent 规则、Decision Note、按变更选择最小充分证据、Keyless Snapshot、验证外部世界、Source/Artifact 双路径、可执行不变量、有限并发 Gate Runner 和 Agent Asset 校验。

不直接继承：Everything-is-a-plugin、几十个发布 Package、全仓库每文件 100% Coverage、大型多平台矩阵和强制全量双语同步。

## 证据管理要求

每条 Provider/Harness 兼容性结论保存：

```text
source_url
source_type
documented_at / tested_at
provider
endpoint
model
harness_version
gateway_version
result
notes
```

文档声明和 Probe 冲突时保留两类证据，UI 显示冲突，并优先采用近期、可复现的 Endpoint + Model 实测结果。
