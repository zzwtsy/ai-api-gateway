import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSpecBundles } from "../docs/spec-bundle.ts";

const root = path.resolve(import.meta.dirname, "../..");

test("spec bundle check validates source without pre-existing generated files", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aigw-spec-check-"));
  const outputDirectory = path.join(temporaryRoot, "spec");
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));

  const results = await buildSpecBundles({
    repositoryRoot: root,
    outputDirectory,
    checkOnly: true,
  });

  assert.deepEqual(results.map(result => path.basename(result.outputPath)), [
    "AI_API_GATEWAY_SPEC.md",
    "AI_API_GATEWAY_ENGINEERING_SPEC.md",
    "AI_API_GATEWAY_FRONTEND_SPEC.md",
  ]);
  await assert.rejects(access(outputDirectory));
});

test("frontend bundles project delivered navigation from the page manifest", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aigw-spec-delivered-pages-"));
  const outputDirectory = path.join(temporaryRoot, "spec");
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));

  await buildSpecBundles({
    repositoryRoot: root,
    outputDirectory,
    checkOnly: false,
    sourceCommit: "0000000000000000000000000000000000000000",
  });

  const frontend = await readFile(path.join(outputDirectory, "AI_API_GATEWAY_FRONTEND_SPEC.md"), "utf8");
  assert.match(frontend, /## 当前已交付导航页面/u);
  assert.match(frontend, /- 客户端（`\/clients`，配置）/u);
  assert.match(frontend, /生成路由一致性由 `pnpm verify:web-contracts` 校验/u);
});
