---
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Code Review Checklist

## Scope / Decision

- [ ] 变更是否在当前 Phase？
- [ ] 是否意外引入协议转换、能力路由、多租户、插件系统或预拆包？
- [ ] 是否需要新增/更新 Decision Note？
- [ ] Execution Plan 是否已经完成或应删除？

## Toolchain

- [ ] 仍然只有 TypeScript 6.x 单版本？
- [ ] 是否引入 TypeScript 7、Native Preview 或别名包？
- [ ] IDE/CI/Build 是否使用同一个 `tsc`？
- [ ] plain Node Artifact 是否验证？

## Architecture

- [ ] data-plane 是否依赖 control-plane？
- [ ] Feature 是否跨 Feature Import？
- [ ] Composition Root 是否仍是唯一具体装配点？
- [ ] Import 是否产生 Server/DB/Pool/Timer 副作用？
- [ ] 是否为单一消费者创建了多余 Package/Port/Repository？
- [ ] 显式注册是否更新？

## Control Plane Routes

- [ ] `createRoute` 字段完整？
- [ ] `operationId` 唯一且 SDK-friendly？
- [ ] Route/Handler 类型关联？
- [ ] `routes.ts` 是否保持静态可读？
- [ ] Error Code/Example 是否准确？
- [ ] OpenAPI 与生成客户端是否更新？

## Domain / Database

- [ ] 实体职责是否清晰？
- [ ] Endpoint/Provider、Account/Credential、Request/Attempt 是否混用？
- [ ] 历史快照是否保留？
- [ ] Migration 是否有回填和 Upgrade Test？
- [ ] 流式请求是否持有长事务？

## Data Plane

- [ ] 未知字段保留？
- [ ] 数据面是否误用控制面 DTO/Envelope？
- [ ] Provider SDK 是否重建完整请求？
- [ ] SSE 字节不重建？
- [ ] Abort/Backpressure 正确？
- [ ] Observer Queue 有界且不阻塞？
- [ ] 是否误用 `clone()` / `tee()`？
- [ ] 首字节后无回退？
- [ ] Attempt Budget 和协议一致性生效？

## Security

- [ ] Secret 是否进入普通对象、日志、Fixture、Snapshot 或 Error？
- [ ] 数据库是否只有哈希/密文？
- [ ] Header allowlist/SSRF/TLS？
- [ ] Raw Payload 和临时文件权限？
- [ ] Admin API CSRF/Session？

## Observability / Pricing

- [ ] Request/Attempt 正确区分？
- [ ] HTTP 与 semantic status 区分？
- [ ] Client cancellation 分类？
- [ ] TTFT 是语义输出？
- [ ] Route/Credential/Price Snapshot？
- [ ] observation incomplete 是否独立？
- [ ] 实际模型、所有 Attempt、unknown 不为 0？
- [ ] 金额是否避免 JS `number` 权威运算？

## UI

- [ ] loading/empty/error/stale/partial？
- [ ] 高风险显式保存？
- [ ] 状态不只靠颜色？
- [ ] URL 筛选恢复？
- [ ] 键盘和 aria？
- [ ] UI 是否只消费 Admin OpenAPI Client？
- [ ] Desktop 1280 / 1024 核心可用？

## Evidence

- [ ] 是否根据 `change-evidence-matrix` 选择了最小充分证据？
- [ ] Unit/Property/Integration/Protocol/E2E 中哪些真实相关？
- [ ] 是否验证外部世界，而不是系统自述？
- [ ] Source Plane 与 Artifact Plane 是否都覆盖了本次影响？
- [ ] 完成报告是否列出实际命令和结果？

## Documentation / Agent Assets

- [ ] OpenAPI/Schema/Generated API Types 更新？
- [ ] Architecture/Feature/Decision/Changelog 更新？
- [ ] AGENTS/Skill 引用命令和路径仍存在？
- [ ] Provider 验证日期更新？
