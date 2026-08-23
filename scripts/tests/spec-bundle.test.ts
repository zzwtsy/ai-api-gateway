import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");

test("spec bundle check validates source without pre-existing generated files", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aigw-spec-check-"));
  const outputDirectory = path.join(temporaryRoot, "spec");
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));

  const { stdout } = await execFileAsync(process.execPath, [
    "scripts/docs/bundle-spec.ts",
    "--check",
    "--output-dir",
    outputDirectory,
  ], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal([...stdout.matchAll(/^checked:/gmu)].length, 3);
  await assert.rejects(access(outputDirectory));
});
