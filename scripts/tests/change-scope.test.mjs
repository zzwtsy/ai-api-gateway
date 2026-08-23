import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { allChangedPaths, collectChangeScope } from "../change-scope.mjs";
import {
  isolatedGitEnvironment,
  isolateGitProcessEnvironment,
} from "./helpers/isolated-git-environment.mjs";

isolateGitProcessEnvironment();

test("change scope reports committed, staged, unstaged and untracked paths independently", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aigw-change-scope-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Test"]);
    git(root, ["config", "user.email", "test@example.com"]);
    await writeFile(path.join(root, "committed.txt"), "base\n", "utf8");
    await writeFile(path.join(root, "staged.txt"), "base\n", "utf8");
    await writeFile(path.join(root, "unstaged.txt"), "base\n", "utf8");
    git(root, ["add", "."]);
    git(root, ["commit", "-qm", "base"]);
    const base = git(root, ["rev-parse", "HEAD"]).stdout.trim();

    await writeFile(path.join(root, "committed.txt"), "next\n", "utf8");
    git(root, ["add", "committed.txt"]);
    git(root, ["commit", "-qm", "committed change"]);
    await writeFile(path.join(root, "staged.txt"), "next\n", "utf8");
    git(root, ["add", "staged.txt"]);
    await writeFile(path.join(root, "unstaged.txt"), "next\n", "utf8");
    await writeFile(path.join(root, "untracked.txt"), "next\n", "utf8");

    const report = collectChangeScope({ base }, root);
    assert.deepEqual(report.paths.committed, ["committed.txt"]);
    assert.deepEqual(report.paths.staged, ["staged.txt"]);
    assert.deepEqual(report.paths.unstaged, ["unstaged.txt"]);
    assert.deepEqual(report.paths.untracked, ["untracked.txt"]);
    assert.deepEqual(allChangedPaths(report), ["committed.txt", "staged.txt", "unstaged.txt", "untracked.txt"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: isolatedGitEnvironment(),
  });
  assert.equal(result.status, 0, result.stderr);
  return result;
}
