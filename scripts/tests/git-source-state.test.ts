import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  assertStableGitSourceState,
  readGitSourceState,
} from "../evidence/git-source-state.ts";
import {
  isolatedGitEnvironment,
  isolateGitProcessEnvironment,
} from "./helpers/isolated-git-environment.ts";

isolateGitProcessEnvironment();

const execFileAsync = promisify(execFile);

test("Git source state records a full clean Commit identity", async () => {
  const root = await createGitFixture();
  const state = await readGitSourceState(root);
  assert.match(state.commit, /^[0-9a-f]{40,64}$/u);
  assert.equal(state.dirty, false);
  assert.equal(state.directoryKey, state.commit);
  assert.doesNotThrow(() => assertStableGitSourceState(state, state));
});

test("Git source state records Dirty work and rejects identity changes", async () => {
  const root = await createGitFixture();
  const clean = await readGitSourceState(root);
  await writeFile(path.join(root, "untracked.txt"), "dirty\n", "utf8");
  const dirty = await readGitSourceState(root);
  assert.equal(dirty.dirty, true);
  assert.equal(dirty.directoryKey, `dirty-${dirty.commit.slice(0, 12)}`);
  assert.throws(() => assertStableGitSourceState(clean, dirty), /工作树状态发生变化/u);
});

test("Git source state rejects a HEAD change after recording starts", async () => {
  const root = await createGitFixture();
  const before = await readGitSourceState(root);
  await writeFile(path.join(root, "tracked.txt"), "next commit\n", "utf8");
  await runGit(root, ["add", "tracked.txt"]);
  await runGit(root, ["commit", "--quiet", "-m", "test: change identity"]);
  const after = await readGitSourceState(root);
  assert.notEqual(before.commit, after.commit);
  assert.throws(() => assertStableGitSourceState(before, after), /HEAD 或工作树状态发生变化/u);
});

test("Git source state fails closed outside a committed repository", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aigw-not-git-"));
  await assert.rejects(readGitSourceState(root), /无法读取 UI 证据的 Git 源身份/u);
});

async function createGitFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aigw-git-source-"));
  await runGit(root, ["init", "--quiet"]);
  await runGit(root, ["config", "user.name", "AIGW Test"]);
  await runGit(root, ["config", "user.email", "aigw-test@example.invalid"]);
  await writeFile(path.join(root, "tracked.txt"), "clean\n", "utf8");
  await runGit(root, ["add", "tracked.txt"]);
  await runGit(root, ["commit", "--quiet", "-m", "test: seed"]);
  return root;
}

async function runGit(root: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: isolatedGitEnvironment(),
  });
}
