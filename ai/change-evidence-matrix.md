---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 变更—证据矩阵

先运行 `pnpm change-scope --base <confirmed-base>` 和 `pnpm evidence:select --base <confirmed-base>`。选择器无法识别的路径升级为 `pnpm check:all`。

| 变更 | 至少运行 |
| --- | --- |
| 控制面 Route | `pnpm check:control` + 对应 Route Unit |
| Zod/OpenAPI Schema | OpenAPI Contract + Generated API Types Freshness + Web Typecheck |
| Routing | Resolver Unit + Property + Routing Snapshot |
| Credential Scheduler | Scheduler Unit + Cooldown/Concurrency Integration |
| Streaming | Raw Fixture + Abort + Backpressure + Random Chunk |
| Provider Adapter | Mock Provider Integration + Usage/Error Snapshot |
| DB Schema/Migration | Empty/Upgrade Migration + Testcontainers |
| Request/Attempt | DB Integration + Timeline Snapshot |
| Secret/Logging/Export | Redaction + Negative Scan + Dump Assertion |
| Web Page | Component + URL State + Playwright Journey |
| Build/Entry | tsc/Vite + plain Node + Docker Smoke |
| Boundary | ESLint Boundary + Architecture Doc |
| TypeScript Config | Single-version Gate + all Workspace Typecheck |
| Docs/AGENTS | Link + Script Reference + Agent Asset Check |
| Runtime Invariant | Source + Production Consumer + Negative Test + Manifest Gate |
| Gate/CI Policy | Script Unit + Invalid Graph/Failure Propagation + CI Lane Contract |
| Escaped Defect | Real Entry Regression + Postmortem + Guard Proof |
| Phase/Release Closure | `pnpm hygiene` + Consumer Audit + Artifact Smoke |

本地执行最窄的有效命令；CI 执行完整 Lane。完成报告必须写实际命令，不写笼统的“全部测试通过”。
