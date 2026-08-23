---
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# Decision: 同步应用版本并从已验证 Commit 发布

Status: implemented

## Problem

根 Manifest、三个 Workspace、OpenAPI 和多份规范都显示项目版本，但原有校验散落在 `docs:check`，没有受控更新入口，也没有验证 CHANGELOG。直接依赖全仓库字符串替换会误改历史版本或测试 Fixture。另一方面，Tag、容器镜像和 GitHub Release 若由不同入口创建，可能指向不同 Commit；先创建 Tag 再等待 CI 也无法保证该 Tag 对应的完整主 CI 已经成功。

## Decision

根 `package.json` 继续作为唯一项目版本所有者。共享版本政策登记全部当前投影，`version:set` 只接受用户明确给出的、更高的严格 SemVer，并对每个登记位置执行一次定点替换；`docs:check` 与 `verify:project-version` 复用同一政策。CHANGELOG 由维护者编写中文语义分组，Verifier 检查最新标题、重复版本和 SemVer。

版本阶段使用 Alpha、Beta、RC 与 Stable。Release Commit 固定为 `chore(release): v<version>`。版本准备不自动提交，也不从 Commit Type 推断版本。

远端发布由手动 Workflow 完成。它先确认当前 SHA 是 `main` 精确 Head、相同 SHA 的主 CI 已成功、版本投影和 Release Commit 一致、已有 Tag 没有指向其他 Commit；登录 GHCR 后还要证明 `<version>` 与 `sha-<commit>` 两个标签均不存在，或二者的 Manifest Digest 相同。单边标签、Digest 冲突以及认证、权限或网络查询错误都失败关闭。随后发布多架构 GHCR 镜像和证明，再通过 Git Data API 创建 Annotated Tag，最后创建 GitHub Release。源码归档、三份规范、Release Notes 和校验和都携带相同版本与 Commit 身份。

## Alternatives considered

- **使用 `pnpm` 内置 `version` 或 Changesets 自动推断和更新。** 未采用：本仓库不发布多个 npm Package，自动推断无法决定预发布阶段，也会引入独立版本所有权。
- **从 Git Log 自动生成 CHANGELOG。** 未采用：Commit Type 不能代替面向用户的中文语义分组，历史日志也不完整表达兼容性和激活要求。
- **Push Tag 后由 Tag Workflow 发布。** 未采用：Tag 会在完整主 CI 成功前成为远端事实，失败恢复需要移动或删除已发布 Tag。
- **在镜像成功前创建 Release/Tag。** 未采用：容器是本项目的主要运行交付物，先公开 Release 会产生没有可用镜像的版本。

## Consequences

- 新增版本投影必须登记到共享政策和负向测试；遗漏会阻止 Docs 与 CI Static Gate；
- 发布需要先合并 Release Commit 并等待同 SHA 主 CI 成功，再单独授权手动 Dispatch；
- 镜像与 GitHub Release 仍不是原子事务，但只有 GHCR 两个永久标签共同证明相同镜像且 Git Tag 归属一致时，同版本同 SHA 才可安全续跑；
- 仓库维护一个小型资产生成器和 Workflow 静态合同，不引入 npm 发布、Changesets 或独立 Workspace 版本。

## Verification

- `pnpm test:scripts`；
- `pnpm verify:project-version`；
- `pnpm release:assets -- <version> --check`；
- `pnpm verify:gate-contract`；
- `pnpm check:docs`；
- Release Workflow 的 main/SHA/CI、权限、Action、平台、GHCR 双标签归属、Prerelease 与写入顺序负向测试。
