---
name: documentation-review
description: 在编写、移动、审查或精简 ai-api-gateway 的 Markdown、非 TypeScript 文字、Prompt、诊断和用户可见字符串时使用；决定事实归属、保留完整命题、执行中文优先与生成物规则。`.ts/.tsx` 注释由 `typescript-comments` 负责。
---

# 文档与文字审查

写到足以保存合同，然后删除重复、装饰和作者过程。缩短字数不是目标；目标是让当前 Commit 的读者能够找到唯一事实来源，并完整理解行为、条件、时序、所有权、失败和例外。

本 Skill 同时负责“是否需要文字”“文字放在哪里”和“文字是否完整”。作者会话视角残留由 [`trim-authoring-residue`](../trim-authoring-residue/SKILL.md) 提供专项扫描。

## 事实来源

- [文档地图](../../../docs/README.md)
- [文档系统约定](../../../docs/conventions/documentation-system.md)
- [语言与本地化约定](../../../docs/conventions/language-and-localization.md)
- [Vibecoding 与 Agent 工程治理](../../../docs/conventions/vibecoding-and-agent-governance.md)
- [Decision Notes](../../../docs/decisions/README.md)
- [质量门禁与验证证据](../../../docs/conventions/quality-gates-and-evidence.md)
- [TypeScript 注释约定](../../../docs/conventions/typescript-comments.md)

先读取拥有该事实的代码、Schema、Migration、OpenAPI、测试或产品规范；不要仅根据现有段落推断行为。

## 确认范围与写权限

范围来自用户明确指定的文件、当前任务，或已确认 Base 的 `change-scope`。审查任务只报告；明确要求写、修复、移动或精简时才修改。不要把一个局部文案任务扩张成全仓库改写。

生成目录、Fixture、Snapshot 和自动生成 API 类型属于派生资产。修改拥有源后重新生成，不直接润色派生文件。

## 先决定事实的家

| 内容 | 拥有位置 |
| --- | --- |
| 产品目标、用户、范围和术语 | `docs/product/` |
| 当前系统组成、数据流和模块边界 | `docs/architecture/` + 当前源码 |
| 用户可感知 Feature 语义 | `docs/features/` |
| 当前工程必须如何执行 | `docs/conventions/` |
| 长期选择、替代方案和代价 | `docs/decisions/` |
| 尚未完成工作的建议顺序 | `docs/roadmap/` |
| 外部事实、协议材料和设计参考 | `docs/references/` |
| 临时实施序列 | `docs/plans/` |
| 控制面 HTTP 契约 | `createRoute` 生成的 OpenAPI |
| 数据库结构 | Drizzle Schema + 已提交 Migration |
| 前端 API 类型 | OpenAPI 生成的 `apps/web/src/api/schema.d.ts` |
| UI Token | `docs/product/ux/design-tokens.json` + Web Theme |

一个事实只有一个详细解释的家。其他位置保留使用者在本地必须知道的最小合同，然后链接到拥有者。不要为“方便”复制字段清单、Schema、测试库存、模块图或状态表。

## 区分文档类型

- **当前事实**：用现在时写入 Product、Architecture、Feature 或 Convention，并与源码一致；
- **Decision Note**：解释为什么选择、真实替代方案、代价和验证；不替代当前事实；
- **Execution Plan**：面向下一步，可在实施中重写；完成后删除或把耐久事实迁回拥有文档；
- **Postmortem**：保留事件时间线、证据、因果链、影响和永久 Guard；
- **Tutorial**：按依赖顺序带读者到可观察结果；
- **Reference**：在明确范围内支持查找，不要求顺序阅读。

大量混合 Tutorial 与 Reference 时拆分；少量辅助内容使用明确小节。不要把评审过程或实现流水账塞进当前事实文档。

## 保留完整命题

改写前枚举段落中的事实命题，至少保留：

- Actor 与 Action；
- 条件、时序和顺序；
- “必须”“可以”“禁止”等强度；
- 否定保证、例外和兼容义务；
- 所有权、副作用、失败模式和后果。

只在每个事实从新文字、代码或链接中仍可恢复时删除。不能为了简洁把“首字节后禁止回退”弱化成“通常不回退”，也不能把 `unknown`、无数据和 `0` 合并成一个空态。

## 各文字表面的最低覆盖

### Markdown

- 说明该文档自己的主题；对子主题只总结职责并链接；
- 当前配置、默认值、错误、限制和公开行为必须与代码一致；
- Architecture 说明关系和数据流，Feature 说明用户语义，Convention 说明必须如何做；
- 不手写可以由目录、OpenAPI、Schema、模块图或脚本生成的库存。

### AGENTS 与 Skill

写清触发范围、事实来源、禁止捷径、工作流和验证。保持“指导而非脚本”的判断空间，但必须明确不可破坏语义。所有相对链接和 `pnpm` 命令必须真实存在。

### Prompt、诊断和可见字符串

文字就是行为：

- 用户可见 `message` 使用中文，Error Code、协议字段、模型 ID 和技术标识保持英文；
- 诊断应指出失败主体、违反规则和可执行修正，不叙述内部执行过程；
- Prompt 或模型可见 Tool Schema 变化需要 Snapshot、行为测试或明确说明为什么不适用；
- UI 文案变化需要 Component 或浏览器证据；不要只检查语法。

### Decision 与 Postmortem

- Decision 必须记录真实考虑过的替代方案，不为填模板编造；
- `implemented` 用现在时描述已交付现实；`superseded` 链接新拥有者；
- Postmortem 保留可验证时间线和因果，不删除决定永久 Guard 的证据。

## 中文优先

- `README.md`、`docs/`、AGENTS、协作输出和 Web 界面默认使用简体中文；
- Agent Skill 中英文均可，新写内容优先英文，不机械翻译现有中文 Skill；
- 代码标识符、文件名、包名、HTTP 字段、`operationId`、Error Code、日志字段和环境变量保持英文；
- 精确实体首次可写“逻辑请求（Request）”“上游尝试（Attempt）”，后续不反复中英并列；
- `README.en.md` 是国际入口，不是内部文档的强制镜像；
- 英文内容落后时不得反向覆盖中文当前事实；
- 没有第二语言前不建立空 i18n 抽象。

## 移动、删除与生成

1. 移动前搜索所有入链、锚点、代码注释和脚本引用；
2. 在同一变更中删除旧位置、写入新位置并修复所有引用；
3. 修改维护源后运行生成器，禁止手工修复 `.artifacts/spec/`、`routeTree.gen.ts` 或 `schema.d.ts`；
4. 历史版本由 Git Tag/Release 保存，不在活动文档树建立 `old/`、`v0.x/` 副本；
5. 删除文字若会改变承诺行为，先按长期取舍流程处理，不把产品变化伪装成编辑。

## 工作流

1. 确认范围、Base 和写权限；
2. 从 `docs/README.md` 路由到最小拥有文档；
3. 阅读拥有代码、Schema、Migration、OpenAPI 和最近测试；
4. 为候选段落标记 `keep`、`add`、`trim`、`restore`、`move` 或 `defer`；
5. 先修改拥有源，再更新链接和派生资产；
6. 使用 [示例](references/examples.md) 和 [`trim-authoring-residue`](../trim-authoring-residue/SKILL.md) 复查；
7. 运行与表面匹配的验证；
8. 报告检查范围、明确修改、刻意保留、未决项和实际命令。

## 验证

文档、AGENTS、Skill 或 Decision：

```bash
pnpm check:docs
git diff --check
```

修改规范投影拥有源时按需生成：

```bash
pnpm docs:bundle
pnpm check:docs
```

修改 UI、Prompt 或用户可见字符串时增加：

```bash
pnpm check:web
```

协议、数据库或 Artifact 文档若伴随行为修改，仍必须运行相应行为 Gate；文档绿色不能证明实现正确。

`.ts/.tsx` 中的 JSDoc、内部注释、测试注释、TODO 和 TypeScript 抑制指令改用 [`typescript-comments`](../typescript-comments/SKILL.md)；本 Skill 不复制其规则。

本 Skill 参考 DeepSeek Harness `dsh-doc-standards` 与 `dsh-prose-standard`，已按本项目重写；许可见 [Third-Party Notices](../THIRD_PARTY_NOTICES.md)。
