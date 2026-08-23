import path from "node:path";
import process from "node:process";

import {
  assertStableGitSourceState,
  readGitSourceState,
} from "./git-source-state.mjs";

const repositoryRoot = path.resolve(process.argv[2] ?? process.cwd());
const state = await readGitSourceState(repositoryRoot);
const expectedCommit = process.argv[3];
const expectedStatusFingerprint = process.argv[4];
if ((expectedCommit === undefined) !== (expectedStatusFingerprint === undefined)) {
  throw new Error("预期 Git 身份必须同时提供 Commit 与工作树状态指纹");
}
if (expectedCommit !== undefined && expectedStatusFingerprint !== undefined) {
  assertStableGitSourceState(
    { commit: expectedCommit, statusFingerprint: expectedStatusFingerprint },
    state,
  );
}
process.stdout.write(`${JSON.stringify(state)}\n`);
