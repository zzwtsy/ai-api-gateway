import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { collectReleaseWorkflowViolations } from "../release-workflow-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const source = await readFile(path.join(root, ".github/workflows/release.yml"), "utf8");
const expressionStart = "$" + "{{";

test("current Release Workflow satisfies the publication contract", () => {
  assert.deepEqual(collectReleaseWorkflowViolations(source), []);
});

test("Release Workflow rejects missing main, CI and immutable Tag guards", () => {
  const changed = source
    .replace("test \"$GITHUB_REF\" = \"refs/heads/main\"", "true")
    .replace("actions/workflows/ci.yml/runs", "actions/runs")
    .replace("git rev-parse \"$tag^{}\"", "git rev-parse HEAD");
  const failures = collectReleaseWorkflowViolations(changed);
  assert.ok(failures.some(failure => failure.includes("main")));
  assert.ok(failures.some(failure => failure.includes("主 CI")));
  assert.ok(failures.some(failure => failure.includes("已有 Tag")));
});

test("Release Workflow rejects unstable latest and reversed remote writes", () => {
  const changed = source
    .replace("type=raw,value=latest,enable=$" + "{{ !contains(inputs.version, '-') }}", "type=raw,value=latest")
    .replace("docker/build-push-action@v7.3.0", "docker/build-push-action@v7.3.1");
  const failures = collectReleaseWorkflowViolations(changed);
  assert.ok(failures.some(failure => failure.includes("latest")));
  assert.ok(failures.some(failure => failure.includes("发布顺序") || failure.includes("固定 Action")));
});

test("Release Workflow rejects pnpm setup that falls back to Node 20", () => {
  const changed = source.replace(
    "pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6.0.10",
    "pnpm/action-setup@v4",
  );
  assert.ok(collectReleaseWorkflowViolations(changed).some(failure => failure.includes("pnpm/action-setup")));
});

test("Release Workflow rejects a missing or late GHCR ownership guard", () => {
  const missing = source.replace("run: node scripts/release/verify-image-ownership.ts", "run: true");
  assert.ok(collectReleaseWorkflowViolations(missing).some(failure => failure.includes("GHCR")));

  const guard = "      - name: 验证 GHCR 镜像标签归属";
  const start = source.indexOf(guard);
  const end = source.indexOf("      - name: 计算镜像标签", start);
  const block = source.slice(start, end);
  const late = `${source.slice(0, start)}${source.slice(end)}${block}`;
  assert.ok(collectReleaseWorkflowViolations(late).some(failure => failure.includes("镜像推送前")));
});

test("Release Workflow binds the GHCR ownership guard to image, version and commit", () => {
  const guard = "      - name: 验证 GHCR 镜像标签归属";
  const start = source.indexOf(guard);
  const end = source.indexOf("      - name: 计算镜像标签", start);
  const block = source.slice(start, end);
  for (const [binding, expected] of [
    [`IMAGE_NAME: ${expressionStart} env.IMAGE_NAME }}`, "镜像名"],
    [`VERSION: ${expressionStart} inputs.version }}`, "输入版本"],
    [`COMMIT_SHA: ${expressionStart} github.sha }}`, "完整 Commit"],
  ] satisfies readonly (readonly [string, string])[]) {
    const changedBlock = block.replace(binding, `${binding.split(":")[0]}: missing`);
    const changed = `${source.slice(0, start)}${changedBlock}${source.slice(end)}`;
    assert.ok(collectReleaseWorkflowViolations(changed).some(failure => failure.includes(expected)));
  }
});
