---
document_id: AIGW-CHANGE-EVIDENCE-001
status: normative
last_reviewed_at: 2026-08-22
language: zh-CN
---

# 变更范围与证据选择

## 1. 目标

每次修改都必须先回答两个问题：**实际改变了什么表面**，以及**什么证据能够让该回归真正变红**。不允许仅凭任务描述猜测影响范围，也不允许把“运行了很多测试”当作证据充分。

## 2. 变更范围报告

使用显式 Base 生成版本化报告：

```bash
pnpm change-scope --base origin/main
```

报告分别列出：

```text
committed   merge-base 到 HEAD 的已提交路径
staged      已暂存但未提交路径
unstaged    已跟踪但未暂存路径
untracked   未跟踪路径
```

Base 必须来自当前 PR、分支或用户明确指定的上游，不由脚本猜测，也不在脚本内自动 Fetch。无法解析 Base、存在多个 Merge Base 或 Git 输出不是有效 UTF-8 时直接失败。

## 3. 证据选择

```bash
pnpm evidence:select --base origin/main
pnpm evidence:select --base origin/main --json
```

选择器把路径映射到以下表面：

- `control`：控制面 Route、Schema、认证和 Repository；
- `data`：数据面路由、凭据、传输、观测和记录；
- `protocol`：协议 Handler、Fixture 和字节语义；
- `database`：Drizzle Schema、Migration 和持久化；
- `web`：页面、Feature、组件和浏览器状态；
- `artifact`：构建入口、Docker、发布内容和运行脚本；
- `docs`：现行规范、Decision、Agent 规则和生成投影；
- `security`：Secret、认证、加密、导出和日志；
- `unknown`：策略尚未识别的路径。

`unknown` 不是“无需验证”，而是保守升级为 `pnpm check:all`，直到为该路径补充明确策略和自测。

## 4. 风险信号

选择器还必须标记：

| 信号 | 含义 |
| --- | --- |
| `data-plane-hot-path` | 可能影响真实上游请求、流式字节或取消传播 |
| `secret-or-auth` | 可能影响 Gateway Key、Provider Credential、Session 或日志泄露 |
| `persistent-format` | 可能影响数据库、Migration、Fixture 或可重放格式 |
| `release-entry` | 可能影响 plain Node、Docker、静态资源或正式启动入口 |
| `durable-decision` | 可能改变长期工程规则，需要新增或更新 Decision Note |

风险信号用于要求额外证据，不用于自动推断产品决定。

## 5. 最小充分证据

本地优先运行选择器给出的最窄命令；以下情况升级为完整检查：

- 变更跨越 Control/Data/DB/Web 多个平面；
- 修改根工具链、Gate Runner、边界规则或 CI；
- 出现未知路径；
- 准备发布；
- 正在诊断 CI 与本地结果不一致；
- 用户明确要求完整演练。

完成报告必须列出实际运行的命令和结果。不能写“相关测试通过”而不说明相关测试是什么。

## 6. 机器保证

- `scripts/change-scope.mjs` 有临时 Git 仓库自测；
- `scripts/evidence-policy.mjs` 有高风险、文档-only 和 unknown 路径自测；
- `scripts/gates/gate-runner.mjs` 在执行任何命令前验证依赖图；
- 缺失依赖、循环、重复 Gate ID、失败依赖跳过和 `after` 语义都有负向测试；
- CI 使用明确 Lane，不在 Workflow 中重新手写另一套命令顺序。
