import type { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs, TextDecoder } from "node:util";

const FORMAT_VERSION = 1;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const utf8 = new TextDecoder("utf-8", { fatal: true });

export interface ChangeScopeOptions {
  base: string;
  head?: string;
}

export interface ChangeScopeReport {
  formatVersion: number;
  repositoryRoot: string;
  input: { base: string; head: string };
  resolved: { baseSha: string; headSha: string; mergeBaseSha: string };
  paths: {
    committed: string[];
    staged: string[];
    unstaged: string[];
    untracked: string[];
  };
}

interface GitResult {
  status: number | null;
  stdout: Buffer;
  stderr: Buffer;
  error: Error | undefined;
}

/**
 * 收集一次待提交变更中的 Commit 与工作树路径。
 * 调用者必须提供已确认的 Base；此工具不会猜测或 Fetch Base。
 *
 * @returns 可复核的变更范围报告。
 */
export function collectChangeScope(options: ChangeScopeOptions, cwd: string = process.cwd()): ChangeScopeReport {
  if (typeof options.base !== "string" || options.base.trim() === "") {
    throw new Error("missing required base ref");
  }
  const headRef = options.head ?? "HEAD";
  const root = trimLine(requireGitText(cwd, ["rev-parse", "--show-toplevel"], "cannot locate Git worktree"));
  const baseSha = resolveCommit(root, "base", options.base);
  const headSha = resolveCommit(root, "head", headRef);
  const mergeBaseSha = resolveMergeBase(root, baseSha, headSha);

  return {
    formatVersion: FORMAT_VERSION,
    repositoryRoot: root,
    input: { base: options.base, head: headRef },
    resolved: { baseSha, headSha, mergeBaseSha },
    paths: {
      committed: diffPaths(root, [mergeBaseSha, headSha], "cannot inspect committed paths"),
      staged: diffPaths(root, ["--cached"], "cannot inspect staged paths"),
      unstaged: diffPaths(root, [], "cannot inspect unstaged paths"),
      untracked: parsePathSet(
        requireGitBytes(root, ["ls-files", "--others", "--exclude-standard", "-z", "--"], "cannot inspect untracked paths"),
        "cannot inspect untracked paths",
      ),
    },
  };
}

export function allChangedPaths(report: ChangeScopeReport): string[] {
  return [...new Set([
    ...report.paths.committed,
    ...report.paths.staged,
    ...report.paths.unstaged,
    ...report.paths.untracked,
  ])].sort();
}

export function renderChangeScope(args: string[], cwd: string = process.cwd()): string {
  const options = parseCli(args);
  return `${JSON.stringify(collectChangeScope(options, cwd), null, 2)}\n`;
}

function parseCli(args: string[]): ChangeScopeOptions {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    strict: true,
    options: {
      base: { type: "string" },
      head: { type: "string", default: "HEAD" },
    },
  });
  if (values.base === undefined) {
    throw new Error("用法：pnpm change-scope --base <verified-ref> [--head <ref>]");
  }
  return { base: values.base, head: values.head };
}

function resolveCommit(root: string, label: string, ref: string): string {
  const result = runGit(root, [
    "-c",
    "core.warnAmbiguousRefs=true",
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${ref}^{commit}`,
  ]);
  const stderr = decode(result.stderr, `${label} ref`, "stderr");
  if (/\bambiguous\b/iu.test(stderr)) {
    throw new Error(`${label} ref ${JSON.stringify(ref)} is ambiguous; use a fully qualified ref or commit id`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} ref ${JSON.stringify(ref)} does not resolve to a commit: ${failureDetail(result, stderr)}`);
  }
  const values = decode(result.stdout, `${label} ref`, "stdout").trim().split(/\r?\n/u).filter(Boolean);
  if (values.length !== 1)
    throw new Error(`${label} ref ${JSON.stringify(ref)} did not resolve to exactly one commit`);
  return values[0] ?? "";
}

function resolveMergeBase(root: string, baseSha: string, headSha: string): string {
  const result = runGit(root, ["merge-base", "--all", baseSha, headSha]);
  const stderr = decode(result.stderr, "merge-base", "stderr");
  if (result.status !== 0)
    throw new Error(`base and head have no merge base: ${failureDetail(result, stderr)}`);
  const bases = decode(result.stdout, "merge-base", "stdout").trim().split(/\r?\n/u).filter(Boolean);
  if (bases.length !== 1)
    throw new Error(`base and head do not have a unique merge base; found ${bases.length}`);
  return bases[0] ?? "";
}

function diffPaths(root: string, args: string[], context: string): string[] {
  return parsePathSet(requireGitBytes(root, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--ignore-submodules=none",
    "--name-only",
    "-z",
    ...args,
    "--",
  ], context), context);
}

function parsePathSet(output: Buffer, context: string): string[] {
  const values: string[] = [];
  let start = 0;
  for (let end = 0; end < output.length; end += 1) {
    if (output[end] !== 0)
      continue;
    if (end > start)
      values.push(decode(output.subarray(start, end), context, "path"));
    start = end + 1;
  }
  return [...new Set(values)].sort();
}

function requireGitText(root: string, args: string[], context: string): string {
  const result = runGit(root, args);
  const stderr = decode(result.stderr, context, "stderr");
  if (result.status !== 0)
    throw new Error(`${context}: ${failureDetail(result, stderr)}`);
  return decode(result.stdout, context, "stdout");
}

function requireGitBytes(root: string, args: string[], context: string): Buffer {
  const result = runGit(root, args);
  if (result.status !== 0) {
    const stderr = decode(result.stderr, context, "stderr");
    throw new Error(`${context}: ${failureDetail(result, stderr)}`);
  }
  return result.stdout;
}

function runGit(root: string, args: string[]): GitResult {
  const result = spawnSync("git", ["-C", root, "-c", "core.fsmonitor=false", ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", LANG: "C", LC_ALL: "C" },
    maxBuffer: MAX_GIT_OUTPUT,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
}

function failureDetail(result: GitResult, stderr: string): string {
  return result.error?.message ?? (stderr.trim() || `git exited with status ${String(result.status)}`);
}

function decode(value: Uint8Array<ArrayBufferLike>, context: string, channel: string): string {
  try {
    return utf8.decode(value);
  } catch {
    throw new Error(`${context}: Git ${channel} is not valid UTF-8`);
  }
}

function trimLine(value: string): string {
  return value.replace(/\r?\n$/u, "");
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(renderChangeScope(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`change-scope: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
