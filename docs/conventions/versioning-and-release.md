---
document_id: AIGW-RELEASE-001
status: normative
last_reviewed_at: 2026-08-23
language: zh-CN
---

# 版本与发布约定

## 单一同步版本

根 `package.json` 是项目版本唯一所有者。Gateway、Web、E2E、工具链基线、OpenAPI、README、当前实现、Roadmap、UX Token 与页面合同等位置只是同一版本的投影；不得建立独立 Workspace 版本。

版本采用严格 SemVer，可依次使用 Alpha、Beta、RC 和 Stable 阶段。预发布数字标识符不得有前导零。目标版本由用户明确确认，不根据 Commit Type 或 Git Log 自动推断。

```bash
pnpm version:set -- <version>
pnpm verify:project-version
```

`version:set` 拒绝非法、相同或降级版本，只对登记位置执行恰好一次的定点替换，不修改 CHANGELOG、Commit、Tag 或远端。CHANGELOG 顶部条目由维护者使用中文语义分组编写；`verify:project-version` 要求最新标题等于根版本、标题不重复、全部投影一致。

Release Commit 标题固定为 `chore(release): v<version>`。准备 Release Commit 不授权 Push、合并或发布。

## 发布事务

发布由 `.github/workflows/release.yml` 的 `workflow_dispatch` 发起，输入不带 `v` 的版本。Workflow 只接受 `main` 的精确 Commit，并在任何远端写入前验证根版本、投影、CHANGELOG、Release Commit、同 SHA 主 CI 成功结果和既有 Tag 归属。

发布顺序固定为：

```text
生成并校验资产
→ 推送 linux/amd64 + linux/arm64 GHCR 镜像
→ 写入 SBOM 与 Build Provenance
→ 通过 Git Data API 创建 Annotated Tag v<version>
→ 创建 GitHub Release 并上传资产
```

GHCR 永久标签为 `<version>` 与 `sha-<commit>`。推送前必须查询两个标签的 Manifest：两者均明确不存在时允许首次发布；两者均存在且原始 Manifest Digest 相同时允许同版本、同 Commit 续跑；只有一个存在、Digest 不同或查询因认证、权限、网络等原因失败时一律失败关闭。只有 Registry 明确返回 `manifest unknown`、`name unknown` 或 `not found` 才能判定标签不存在。

只有无预发布标识的 Stable 更新 `latest`，不创建 `major` 或 `minor` 浮动标签。包可见性沿用仓库和组织设置。

发布资产包括内含 `.artifacts/source-metadata.json` 的确定性源码归档、三份生成规范、从 CHANGELOG 精确提取的中文 Release Notes 和 `SHA256SUMS`：

```bash
pnpm release:assets -- <version> [--check]
```

资产版本必须已经进入 `HEAD`。`--check` 只在临时目录生成和验证，不修改仓库，可在工作树含有其他改动时使用；普通模式要求干净工作树并写入 `.artifacts/release/<version>/`。Release Commit 完成后再执行资产检查，避免把新版本元数据与旧 Commit 内容组合。

## 重试与权限

镜像推送与 Tag/Release 创建不是原子操作。失败后只允许对相同版本和 SHA 重跑；GHCR 版本标签与 SHA 标签必须共同证明镜像归属，已有 `v<version>` 也必须最终解析到相同 Commit。任一身份冲突都失败关闭，禁止自动删除、移动或重写已发布版本。

版本选择、Push、合并和手动 Dispatch 是四个独立授权边界。`$version-release` 可准备版本与 Release Commit，但不得把准备授权扩展为远端写入。
