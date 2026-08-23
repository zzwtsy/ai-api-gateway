import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveSourceCommit } from "../docs/source-identity.ts";

test("source archive metadata reproduces the original Git identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aigw-source-identity-"));
  await mkdir(path.join(root, ".artifacts"), { recursive: true });
  await writeFile(path.join(root, ".artifacts/source-metadata.json"), JSON.stringify({
    formatVersion: 1,
    version: "9.8.7-test.1",
    commit: "8e382a955d3c7794247f66a049522ac86388c25d",
  }));
  assert.equal(await resolveSourceCommit(root, {}), "8e382a955d3c");
});

test("explicit packaging identity is validated and takes precedence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aigw-source-identity-"));
  assert.equal(await resolveSourceCommit(root, { AIGW_SOURCE_COMMIT: "abcdef1234567890" }), "abcdef123456");
  await assert.rejects(
    resolveSourceCommit(root, { AIGW_SOURCE_COMMIT: "not-a-commit" }),
    /hexadecimal Git commit id/u,
  );
});

test("unversioned directories fail closed to an explicit archive marker", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aigw-source-identity-"));
  assert.equal(await resolveSourceCommit(root, {}), "unversioned-source-archive");
});
