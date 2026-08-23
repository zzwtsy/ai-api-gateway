import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const commitPattern = /^[0-9a-f]{7,64}$/u;

/**
 * 解析生成投影使用的不可变源码身份。Git Checkout 以真实 HEAD 为准；Release Archive
 * 从 `.artifacts/source-metadata.json` 读取同一身份；显式环境变量只供写入元数据前的
 * 可复现打包任务使用。
 *
 * @returns 12 位 Git Commit，或无版本源码归档标识。
 */
export async function resolveSourceCommit(root: string, environment: NodeJS.ProcessEnv = process.env): Promise<string> {
  const explicit = environment.AIGW_SOURCE_COMMIT?.trim();
  if (explicit !== undefined && explicit !== "") {
    if (!commitPattern.test(explicit))
      throw new Error("AIGW_SOURCE_COMMIT must be a hexadecimal Git commit id");
    return explicit.slice(0, 12);
  }

  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    const commit = stdout.trim();
    if (commitPattern.test(commit))
      return commit;
  } catch {
    // Source archives intentionally have no .git directory; metadata below owns that path.
  }

  try {
    const metadata = JSON.parse(await readFile(path.join(root, ".artifacts/source-metadata.json"), "utf8"));
    const commit = typeof metadata.commit === "string" ? metadata.commit.trim() : "";
    if (!commitPattern.test(commit))
      throw new Error("invalid commit");
    return commit.slice(0, 12);
  } catch {
    return "unversioned-source-archive";
  }
}
