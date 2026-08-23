# 贡献指南

感谢参与 AI API Gateway。项目以中文为默认协作语言，同时保持代码和协议边界对国际生态友好。

## 沟通语言

- Issue、PR 描述、评审意见和项目文档默认使用简体中文；
- 不要求贡献者提供完整英文翻译；
- 英文 Issue 或 PR 同样欢迎，维护者可以用中文回复并补充必要英文摘要；
- 代码标识符、文件名、API 字段、错误码、环境变量和 Git 分支名使用英文；
- Conventional Commit 前缀使用英文，摘要可以使用中文，例如 `feat(routing): 增加路由快照编译器`。

## 开始修改前

1. 阅读根目录 `AGENTS.md`；
2. 阅读目标目录最近的局部 `AGENTS.md`；
3. 按 `docs/README.md` 的任务路由读取最小相关文档；
4. 搜索当前源码、测试、Migration 和 Decision Note，确认文档没有漂移；
5. 用 `pnpm change-scope --base <已确认的基线>` 查看完整变更范围；
6. 用 `pnpm evidence:select --base <已确认的基线>` 选择最小充分证据；
7. 跨模块、协议、数据库、安全或生命周期变更先写 `docs/plans/<topic>.md`。

## 代码和文档

- 控制面 Feature 使用显式 `routes.ts → handlers.ts → service.ts → index.ts`；
- 数据面保持协议透明，不复用控制面 DTO 或统一响应 Envelope；
- 重要规则必须有测试、静态检查或生成物校验，而不能只写在 Prompt 中；
- 高风险模块新增不变量时，必须同时提供所有者文件、生产调用点、负向测试，并登记到 `scripts/verify/runtime-invariants.json`；
- 新门禁必须证明“重新引入缺陷会失败”，禁止只验证命令能够启动；
- 影响外部行为的修改必须同步当前文档；
- 改变长期决策时新增或更新 Decision Note，并记录未采用的替代方案；
- 不手工修改生成的 OpenAPI 客户端或 `.artifacts/spec/` 单文件规范。

## 验证

根据 `ai/change-evidence-matrix.md` 选择最小充分证据。提交说明中列出实际运行命令和结果，不写笼统的“测试通过”。

先记录变更范围与证据选择：

```bash
pnpm change-scope --base origin/main
pnpm evidence:select --base origin/main
```

常见命令：

```bash
pnpm check:quick
pnpm check:control
pnpm check:protocol
pnpm check:db
pnpm check:web
pnpm check:e2e
pnpm check:docs
```

完整本地演练只在跨仓库修改、发布演练或 CI 诊断时运行：

```bash
pnpm check:all
```

## Pull Request

- 一个 PR 只解决一个主要问题；
- 明确关联 Issue 或说明为什么不需要 Issue；
- 说明行为变化、数据/API/安全影响、验证命令和已知限制；
- 不提交真实 API Key、数据库密码、会话 Cookie 或包含用户 Prompt 的 Fixture；
- 生成文件、Migration 和当前文档必须与源码同一个 PR 更新；
- 逃逸到真实入口、构建产物或主分支的缺陷必须补 Postmortem，并把根因转成永久门禁；
- 阶段性功能完成或发布前运行 `pnpm hygiene`，记录删除、合并或明确保留的熵。
