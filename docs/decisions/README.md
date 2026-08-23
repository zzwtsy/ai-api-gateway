---
status: active
last_reviewed_at: 2026-08-22
language: zh-CN
---

# Decision Notes

Decision Note 记录影响多个文件、模块或长期维护方式的选择：问题、最终决定、真实替代方案、代价和验证。它不替代当前架构文档和源码。

## 生命周期

```text
proposed/      尚未接受或尚未实施
implemented/   已实现，仍约束当前工程
rejected/      被明确否决，保留以避免重复争论
superseded/    曾经有效，已被新决策取代
```

文件名使用：

```text
YYYY-MM-DD-topic-in-kebab-case.md
```

## 何时必须写

- 协议、路由、回退或持久化语义改变；
- Secret 生命周期和安全策略改变；
- Workspace、模块或依赖边界改变；
- 公开 API、Wire Format 或 Migration 策略改变；
- TypeScript、Runtime、Build、CI 或语言基线改变；
- 引入新的运行时基础设施；
- 测试、发布或文档事实来源改变。

局部 Bug、文案、格式化和无行为重构通常不写。

## 规则

- `implemented` 用现在时描述已经交付的现实；
- `proposed` 必须包含验收条件和风险；
- `rejected` 在 Status 行写明拒绝原因；
- `superseded` 必须链接到取代它的新 Decision；
- 每份 Note 必须记录真实考虑过的替代方案；
- 不能把旧 Note 悄悄改写成相反结论；
- 当前源码、测试和现行 Convention 优先于历史 Note。

模板见 [`_template.md`](_template.md)，产品与工程决策索引见 [`decision-index.md`](decision-index.md)。
