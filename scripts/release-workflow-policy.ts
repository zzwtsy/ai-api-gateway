const requiredActions = [
  "docker/login-action@v4.6.0",
  "docker/setup-qemu-action@v4.2.0",
  "docker/setup-buildx-action@v4.3.0",
  "docker/metadata-action@v6.2.0",
  "docker/build-push-action@v7.3.0",
  "actions/attest-build-provenance@v4.2.2",
];
const expressionStart = "$" + "{{";

export function collectReleaseWorkflowViolations(source: string): string[] {
  const failures: string[] = [];
  requireMatch(failures, source, /^\s{2}workflow_dispatch:\s*$/mu, "Release Workflow 必须由 workflow_dispatch 手动触发");
  requireMatch(failures, source, /^\s{6}version:\s*\n\s{8}description:.+\n\s{8}required:\s*true\n\s{8}type:\s*string$/mu, "Release Workflow 必须要求 version 输入");
  for (const permission of ["contents: write", "packages: write", "actions: read", "id-token: write", "attestations: write"]) {
    requireMatch(failures, source, new RegExp(`^\\s{2}${permission}$`, "mu"), `Release Workflow 缺少权限 ${permission}`);
  }
  requireMatch(failures, source, /^\s{2}group: release-\$\{\{ inputs\.version \}\}$/mu, "发布并发键必须按版本串行");
  requireMatch(failures, source, /^\s{2}cancel-in-progress: false$/mu, "发布不得取消正在进行的同版本事务");
  requireText(failures, source, "test \"$GITHUB_REF\" = \"refs/heads/main\"", "发布必须限制在 main");
  requireText(failures, source, "test \"$(git rev-parse HEAD)\" = \"$GITHUB_SHA\"", "发布必须绑定精确 SHA");
  requireText(failures, source, "actions/workflows/ci.yml/runs", "发布必须查询同 SHA 主 CI");
  requireText(failures, source, "pnpm verify:project-version", "发布必须验证项目版本投影");
  requireText(failures, source, "chore(release): v$VERSION", "发布必须验证 Release Commit 标题");
  requireText(failures, source, "git rev-parse \"$tag^{}\"", "已有 Tag 必须最终解析到同一 Commit");
  for (const action of requiredActions) requireText(failures, source, `uses: ${action}`, `Release Workflow 缺少固定 Action ${action}`);
  requireText(failures, source, "platforms: linux/amd64,linux/arm64", "镜像必须覆盖 amd64 与 arm64");
  requireText(failures, source, `type=raw,value=${expressionStart} inputs.version }}`, "镜像必须发布永久版本标签");
  requireText(failures, source, "type=sha,prefix=sha-,format=long", "镜像必须发布完整 Commit 标签");
  requireText(failures, source, `type=raw,value=latest,enable=${expressionStart} !contains(inputs.version, '-') }}`, "latest 只能用于稳定版");
  requireText(failures, source, "sbom: true", "镜像必须生成 SBOM");
  requireText(failures, source, "provenance: mode=max", "镜像必须生成 Build Provenance");
  requireText(failures, source, "push-to-registry: true", "镜像证明必须写入 Registry");

  const registryLogin = source.indexOf("docker/login-action@v4.6.0");
  const buildxSetup = source.indexOf("docker/setup-buildx-action@v4.3.0");
  const imageOwnership = source.indexOf("scripts/release/verify-image-ownership.ts");
  const imagePush = source.indexOf("docker/build-push-action@v7.3.0");
  const tagApi = source.indexOf("git/tags\"");
  const releaseApi = source.indexOf("releases\"");
  if (!(registryLogin !== -1 && buildxSetup > registryLogin && imageOwnership > buildxSetup && imagePush > imageOwnership)) {
    failures.push("GHCR 版本与 Commit 标签归属必须在登录和 Buildx 初始化后、镜像推送前验证");
  }
  for (const [binding, message] of [
    [`IMAGE_NAME: ${expressionStart} env.IMAGE_NAME }}`, "GHCR 标签归属必须绑定当前镜像名"],
    [`VERSION: ${expressionStart} inputs.version }}`, "GHCR 标签归属必须绑定发布输入版本"],
    [`COMMIT_SHA: ${expressionStart} github.sha }}`, "GHCR 标签归属必须绑定当前完整 Commit"],
  ] satisfies readonly (readonly [string, string])[]) {
    requireText(failures, workflowStepContaining(source, imageOwnership), binding, message);
  }
  if (!(imagePush !== -1 && tagApi > imagePush && releaseApi > tagApi)) {
    failures.push("发布顺序必须是镜像推送、Annotated Tag、GitHub Release");
  }
  if (/git\s+tag\s+-f|refs\/tags\/.+PATCH|--method\s+DELETE/iu.test(source)) {
    failures.push("Release Workflow 不得移动或删除已发布 Tag");
  }
  return failures;
}

function workflowStepContaining(source: string, position: number): string {
  if (position < 0)
    return "";
  const start = source.lastIndexOf("\n      - ", position);
  const end = source.indexOf("\n      - ", position);
  return source.slice(start < 0 ? 0 : start, end < 0 ? source.length : end);
}

function requireText(failures: string[], source: string, expected: string, message: string): void {
  if (!source.includes(expected))
    failures.push(message);
}

function requireMatch(failures: string[], source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source))
    failures.push(message);
}
