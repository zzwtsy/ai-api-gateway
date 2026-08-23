---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Decision: Agent Skill 中英文均可并优先英文

Status: implemented

## Problem

Agent Skill 同时承担模型指令、跨项目复用和上游 Skill 同步。强制其全部使用中文会增加机械翻译、术语漂移和同步成本，但项目文档、界面和人与 Agent 的协作仍需要中文优先。

## Decision

Agent Skill 可以使用中文或英文，新写内容优先英文。现有中文 Skill 不为统一形式而机械翻译；修改时依据准确性、维护成本和上游同步需求选择语言。

这项例外只适用于 Skill 指令资产。`README.md`、`docs/`、AGENTS、Agent 协作输出和 Web UI 继续默认使用简体中文，代码与协议标识符继续保持英文。

## Alternatives considered

- **Skill 继续强制中文。** 拒绝：上游同步和跨项目复用需要重复翻译，且模型指令的英文术语更容易出现不必要改写。
- **所有 Agent 资产改为英文。** 拒绝：AGENTS 和协作输出直接服务当前中文维护者，会降低本地理解效率。
- **立即翻译全部现有中文 Skill。** 拒绝：没有行为收益，会制造大范围无语义 Diff 和新的校对负担。

## Consequences

Skill 可以更低成本地复用和跟进上游，同时保留中文项目体验。仓库会长期存在中英文 Skill，因此评审关注指令准确性和链接有效性，不追求语言表面统一。

## Verification

- `docs/conventions/language-and-localization.md` 明确 Skill 例外；
- `documentation-review` 不再把 Skill 纳入中文强制面；
- `pnpm verify:agent-assets`；
- `pnpm check:docs`。
