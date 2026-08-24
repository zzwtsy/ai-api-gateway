import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
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
