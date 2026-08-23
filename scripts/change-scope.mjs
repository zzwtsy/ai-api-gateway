import { spawnSync } from "node:child_process";
import process from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, TextDecoder } from "node:util";

const FORMAT_VERSION = 1;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Collect the committed and worktree paths that make up one outgoing change.
 * The caller must provide the verified base ref; the tool never guesses or fetches it.
 *
 * @param {{ base: string, head?: string }} options
 * @param {string} cwd
 */
export function collectChangeScope(options, cwd = process.cwd()) {
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

/** @param {ReturnType<typeof collectChangeScope>} report */
export function allChangedPaths(report) {
  return [...new Set([
    ...report.paths.committed,
    ...report.paths.staged,
    ...report.paths.unstaged,
    ...report.paths.untracked,
  ])].sort();
}

/** @param {string[]} args @param {string} cwd */
export function renderChangeScope(args, cwd = process.cwd()) {
  const options = parseCli(args);
  return `${JSON.stringify(collectChangeScope(options, cwd), null, 2)}\n`;
}

function parseCli(args) {
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

function resolveCommit(root, label, ref) {
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
  if (values.length !== 1) throw new Error(`${label} ref ${JSON.stringify(ref)} did not resolve to exactly one commit`);
  return values[0];
}

function resolveMergeBase(root, baseSha, headSha) {
  const result = runGit(root, ["merge-base", "--all", baseSha, headSha]);
  const stderr = decode(result.stderr, "merge-base", "stderr");
  if (result.status !== 0) throw new Error(`base and head have no merge base: ${failureDetail(result, stderr)}`);
  const bases = decode(result.stdout, "merge-base", "stdout").trim().split(/\r?\n/u).filter(Boolean);
  if (bases.length !== 1) throw new Error(`base and head do not have a unique merge base; found ${bases.length}`);
  return bases[0];
}

function diffPaths(root, args, context) {
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

function parsePathSet(output, context) {
  const values = [];
  let start = 0;
  for (let end = 0; end < output.length; end += 1) {
    if (output[end] !== 0) continue;
    if (end > start) values.push(decode(output.subarray(start, end), context, "path"));
    start = end + 1;
  }
  return [...new Set(values)].sort();
}

function requireGitText(root, args, context) {
  const result = runGit(root, args);
  const stderr = decode(result.stderr, context, "stderr");
  if (result.status !== 0) throw new Error(`${context}: ${failureDetail(result, stderr)}`);
  return decode(result.stdout, context, "stdout");
}

function requireGitBytes(root, args, context) {
  const result = runGit(root, args);
  if (result.status !== 0) {
    const stderr = decode(result.stderr, context, "stderr");
    throw new Error(`${context}: ${failureDetail(result, stderr)}`);
  }
  return result.stdout;
}

function runGit(root, args) {
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

function failureDetail(result, stderr) {
  return result.error?.message ?? (stderr.trim() || `git exited with status ${String(result.status)}`);
}

function decode(value, context, channel) {
  try {
    return utf8.decode(value);
  } catch {
    throw new Error(`${context}: Git ${channel} is not valid UTF-8`);
  }
}

function trimLine(value) {
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
