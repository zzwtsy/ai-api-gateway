---
status: monitoring
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Postmortem: 干净 Checkout 的 Source Plane Gate 依赖忽略产物

Status: monitoring

## Executive summary

主 CI 的三个 Lane 因仓库脚本 Typecheck 和规范投影检查读取被忽略的本地产物而失败；修复将 Artifact Smoke 改为 Build 后启动真实编译入口，使规范检查直接验证维护源，并用 Import Gate 与空输出目录测试永久拒绝同类依赖。

## Impact

- Commit `192d9bca65c07beb8a77ac4cd86bfdfbaea6d37c` 的主 CI 中，`core`、`static`、`artifact` Lane 失败，依赖同 SHA 全绿 CI 的 Release 被阻塞；
- `activation` 与 `protocol` Lane 通过；Gateway/Web Build、OpenAPI、生成类型、浏览器 E2E 和 Docker Compose Smoke 均通过；
- 没有生产服务、Provider 请求、Secret、用户数据或发布产物受到影响；
- `pnpm/action-setup@v4` 与 `actions/upload-artifact@v4` 的 Node 20 Runtime 只产生警告，没有造成这次失败。

## Detection

GitHub Actions Run [`32670836554`](https://github.com/zzwtsy/ai-api-gateway/actions/runs/32670836554) 在全新 Checkout 中检测到失败。顶部注解显示三个 Lane 重复的四个 `TS2307`；完整 Static 日志另外显示 `.artifacts/spec/AI_API_GATEWAY_SPEC.md` 不存在。

## Timeline

- 2026-08-23 08:34:01 -07:00：初始仓库已经让 `docs:check` 对默认 `.artifacts/spec` 执行 `bundle-spec --check`；
- 2026-08-23 14:31:05 -07:00：Commit `a242b73629b9022783cd2aa67e4543cfe979fa2c` 将 `smoke.mjs` 改为 `smoke.ts` 并纳入 `scripts/tsconfig.json`；
- 2026-08-23 15:30:30 -07:00：Commit `192d9bca65c07beb8a77ac4cd86bfdfbaea6d37c` 完成本地质量基线，但工作区仍存在被忽略的 `dist` 与 `.artifacts/spec`；
- 2026-08-23 15:31 -07:00：同 SHA 主 CI 从干净 Checkout 启动并暴露两条产物前置依赖；
- 2026-08-23：Import Gate 与空输出目录测试先在旧执行路径上失败，随后直接修复并在故障注入恢复后通过。

## Root cause

Source Plane 与 Artifact Plane 的执行关系被反转：

1. `scripts/tsconfig.json` 扫描全部 `scripts/**/*.ts`；`scripts/artifact/smoke.ts` 使用字面量动态 import 指向 `apps/gateway/dist/**`；三个 Lane 的 `script-typecheck` 都早于 Build，因此干净 Checkout 没有可解析的 `.js` 或 `.d.ts`；
2. `scripts/docs/check-docs.ts` 执行 `bundle-spec.ts --check`，旧实现读取 `.artifacts/spec/**` 作为比较基线；该目录被忽略且不是 Checkout 的组成部分；
3. 本地工作区保留此前 Build 和 `docs:bundle` 生成的文件，使相同命令错误地获得了未声明前置条件。

## Why existing evidence missed it

- **Typecheck**：本地 `tsc` 从 `apps/gateway/dist/*.d.ts` 成功解析四个模块，没有模拟 Build 前状态；
- **Unit**：脚本测试没有覆盖不存在默认规范输出目录的 `--check`；
- **Import Gate**：旧实现把包含 `/dist/` 的目标映射回 `/src/`，因此把 Source Plane 对生成目录的导入判断为有效；
- **Integration / Protocol**：这些 Gate 不消费仓库脚本的生成目录，且 Protocol Lane 不包含 `script-typecheck`；
- **Artifact**：Build 后的 plain Node、浏览器和 Docker 入口均正常，不能证明 Build 前的脚本类型检查独立于产物；
- **CI**：主 CI 是首个同时满足干净 Checkout、Build 前脚本 Typecheck 和未生成规范目录的真实入口。

## Corrective changes

- Artifact Smoke 通过 Node 子进程启动 `apps/gateway/dist/index.js`、探测 `/healthz`，并在成功或失败后执行有界清理；
- Import Gate 拒绝任何源码字面量导入仓库内的 `dist` 或 `.artifacts`，不再把生成路径映射为源码路径；
- `bundle-spec.ts --check` 在内存中构建三个投影并验证全部维护源，不读取或写入默认输出目录；
- 新增空输出目录命令级测试，Release 资产测试继续覆盖三份规范的实际写入和确定性；
- 质量 Gate、文档系统和既有 Decision 明确 Source Plane 不得依赖忽略产物；
- CI 与 Release 将 `pnpm/action-setup` 和 `actions/upload-artifact` 固定到官方 Node 24 Runtime Commit，并由合同测试拒绝回退。

## Guard proof

- 在保留旧 `smoke.ts` 导入的状态下运行 `pnpm verify:imports`，退出码为 `1`，精确报告四个 `apps/gateway/dist/**` 导入；修复后命令通过；
- 将 `bundle-spec.ts --check` 最小恢复为读取目标文件后运行 `node --test scripts/tests/spec-bundle.test.ts`，测试以 `ENOENT` 和退出码 `1` 失败；恢复内存检查后同一测试通过；
- 合同测试把两个 Action 引用替换回 `@v4`，验证 Gate 与 Release Workflow Policy 都会拒绝 Node 20 Runtime；
- 修复后的 `pnpm test:scripts` 共 `76` 个测试通过，`pnpm typecheck:scripts`、`pnpm verify:imports`、`pnpm docs:check` 和 plain Node Artifact Smoke 通过。
- `pnpm check:docs`、`pnpm check:ci:static` 和 `pnpm check:ci:core` 全部通过；本地 `3001` 已有服务占用，因此 Artifact Gate 使用 `3401/4411/5274` 隔离端口重跑，Build、plain Node、5 个浏览器场景和 Docker Compose Smoke 全部通过并完成容器清理。

## Follow-up

- Owner：仓库维护者；验证方式：修复进入远端分支后，同 SHA 主 CI 的四个 Lane 全部通过，且 Job 汇总不再出现 Node 20 Action Runtime 警告；在完成该远端证据前保持 `monitoring`。
