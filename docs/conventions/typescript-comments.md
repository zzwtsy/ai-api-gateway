---
document_id: AIGW-TS-COMMENTS-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# TypeScript 注释约定

## 目标与范围

本约定适用于项目拥有、非生成的 `.ts` 与 `.tsx`。注释只保存类型系统和局部代码无法表达的调用合同、时序、所有权、安全边界与失败语义；不以注释数量衡量质量，也不要求每个 Export 都写 JSDoc。

生成的 Route Tree、OpenAPI 类型、Fixture、Snapshot 和 shadcn Registry 源码由各自生成链拥有，不直接增加或润色注释。

## 注释所有权

| 内容 | 应放位置 |
| --- | --- |
| 调用者可见的 Reject、取消、副作用、所有权或时序差异 | 拥有 API 的公开 JSDoc |
| 非局部顺序、竞态约束、安全边界或反直觉失败 | Invariant 附近的内部注释 |
| Fixture、真实入口、平台适配、间接观察或负向控制的必要原因 | 对应测试设置或断言旁 |
| 跨模块长期选择及放弃的替代方案 | Decision Note；本地只在必要时保留短链接 |
| 类型和函数名已经完整表达的字段或控制流 | 不写注释 |

注释使用简体中文；代码标识符、协议字段、Error Code 和外部专有名词保持英文。删除逐行控制流翻译、评审编号、变更叙述、设计会话残留和“这里安全/正确”式自我证明。

## TODO 与抑制指令

TODO 必须描述具体缺失行为以及可删除条件。跨文件或跨阶段工作应由 Roadmap、Issue 或执行计划拥有，不在源码中维护第二套任务清单。

非生成 TypeScript 禁止 `@ts-ignore` 和 `@ts-nocheck`。只有外部类型与已验证运行时合同无法一致表达时才可使用 `@ts-expect-error`，并写至少 10 个字符的具体原因。优先使用类型收窄、验证解析或更准确的外部声明解决问题。

ESLint 对 `apps/**/*.{ts,tsx}` 执行上述抑制规则；生成 Route Tree、OpenAPI 类型和 shadcn Registry 继续由现有排除策略拥有。不引入 TypeDoc、`require-jsdoc` 或注释覆盖率。

## Agent 路由与验证

TypeScript JSDoc、内部/测试注释、TODO 与抑制指令由 `$typescript-comments` 处理。Markdown、Prompt、诊断和其他可见文字仍由 `documentation-review` 处理；作者过程残留可以叠加 `trim-authoring-residue` 专项审查。

至少运行最窄 Typecheck、相关测试和目标文件 ESLint。跨协议、安全或生命周期的注释变化不能只以文字 Gate 证明，必须读取并验证对应行为所有者。
