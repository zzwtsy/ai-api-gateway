import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const commitPattern = /^[0-9a-f]{40,64}$/u;

export interface GitSourceState {
  commit: string;
  dirty: boolean;
  statusFingerprint: string;
  directoryKey: string;
}

type GitRunner = (
  file: string,
  args: readonly string[],
  options: { cwd: string; encoding: "utf8" },
) => Promise<{ stdout: string; stderr: string }>;

const defaultGitRunner: GitRunner = async (file, args, options) => execFileAsync(file, args, options);

export async function readGitSourceState(repositoryRoot: string, run: GitRunner = defaultGitRunner): Promise<GitSourceState> {
  try {
    const firstCommit = await readCommit(repositoryRoot, run);
    const { stdout: status } = await run(
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    const secondCommit = await readCommit(repositoryRoot, run);
    if (firstCommit !== secondCommit) {
      throw new Error(`读取证据身份期间 HEAD 从 ${firstCommit} 变为 ${secondCommit}`);
    }
    const statusFingerprint = createHash("sha256").update(status).digest("hex");
    const dirty = status !== "";
    return {
      commit: firstCommit,
      dirty,
      statusFingerprint,
      directoryKey: dirty ? `dirty-${firstCommit.slice(0, 12)}` : firstCommit,
    };
  } catch (error) {
    throw new Error(
      `无法读取 UI 证据的 Git 源身份：${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export function assertStableGitSourceState(
  before: Pick<GitSourceState, "commit" | "statusFingerprint">,
  after: Pick<GitSourceState, "commit" | "statusFingerprint">,
): void {
  if (before.commit !== after.commit || before.statusFingerprint !== after.statusFingerprint) {
    throw new Error("UI 证据录制期间 HEAD 或工作树状态发生变化");
  }
}

async function readCommit(repositoryRoot: string, run: GitRunner): Promise<string> {
  const { stdout } = await run(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const commit = stdout.trim();
  if (!commitPattern.test(commit))
    throw new Error(`Git HEAD 不是完整 Commit SHA：${commit}`);
  return commit;
}
