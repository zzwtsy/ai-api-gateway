---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 数据库与 Migration 约定

PostgreSQL 是控制配置和 Request/Attempt 历史的持久化事实来源。Drizzle TypeScript Schema 是代码事实，经过评审并提交的 SQL Migration 是部署事实。

## 规则

- 使用 `pnpm db:generate` 生成 Migration；
- 使用 `pnpm db:migrate` 应用已提交 Migration；
- 生产环境禁止 `drizzle-kit push`；
- Schema、SQL Migration、Drizzle Journal 和 Snapshot 必须同一个 PR 更新；
- 上游流式响应期间不得保持数据库事务；
- Request 与首个 Attempt 的创建使用短事务；
- Attempt 完成与 Request 最终汇总使用短事务；
- 并发唯一性由数据库约束兜底，不只做先查后写；
- 新增金额字段时使用 PostgreSQL `numeric`，API 返回字符串；
- 未知 Usage 或费用保持未知，不得写成 `0`；
- 时间使用 `timestamptz`，Duration 使用整数毫秒或微秒；
- Migration 必须验证空库安装和已有版本升级。

领域关系见 [领域模型](../architecture/domain-model.md)。
