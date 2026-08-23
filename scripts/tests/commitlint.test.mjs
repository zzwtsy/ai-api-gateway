import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

for (const message of [
  "feat: 支持中文摘要",
  "feat: Add API support",
  "fix(auth): correct token refresh",
  "docs(api-v2): 更新 OpenAPI 文档",
]) {
  test(`Commitlint accepts ${message}`, async () => {
    assert.equal(await lint(message), 0);
  });
}

for (const message of [
  "unknown: 不允许的类型",
  "feat:",
  `feat: ${"a".repeat(95)}`,
]) {
  test(`Commitlint rejects ${message.slice(0, 40)}`, async () => {
    assert.notEqual(await lint(message), 0);
  });
}

async function lint(message) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "aigw-commitlint-"));
  const messagePath = path.join(directory, "COMMIT_EDITMSG");
  await writeFile(messagePath, `${message}\n`, "utf8");
  return await new Promise((resolve, reject) => {
    const child = spawn(path.join(root, "node_modules/.bin/commitlint"), ["--config", "commitlint.config.mjs", "--edit", messagePath], {
      cwd: root,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("exit", code => resolve(code ?? 1));
  });
}
