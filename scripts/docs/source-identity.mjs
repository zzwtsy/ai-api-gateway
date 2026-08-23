import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const commitPattern = /^[0-9a-f]{7,64}$/u;

/**
 * Resolve the immutable source identity used by generated projections.
 * A live Git checkout is authoritative. A release archive carries the same
 * identity in `.artifacts/source-metadata.json`; an explicit environment value
 * is reserved for reproducible packaging jobs that operate before metadata is written.
 *
 * @param {string} root
 * @param {NodeJS.ProcessEnv} [environment]
 */
export async function resolveSourceCommit(root, environment = process.env) {
  const explicit = environment.AIGW_SOURCE_COMMIT?.trim();
  if (explicit !== undefined && explicit !== "") {
    if (!commitPattern.test(explicit)) throw new Error("AIGW_SOURCE_COMMIT must be a hexadecimal Git commit id");
    return explicit.slice(0, 12);
  }

  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    const commit = stdout.trim();
    if (commitPattern.test(commit)) return commit;
  } catch {
    // Source archives intentionally have no .git directory; metadata below owns that path.
  }

  try {
    const metadata = JSON.parse(await readFile(path.join(root, ".artifacts/source-metadata.json"), "utf8"));
    const commit = typeof metadata.commit === "string" ? metadata.commit.trim() : "";
    if (!commitPattern.test(commit)) throw new Error("invalid commit");
    return commit.slice(0, 12);
  } catch {
    return "unversioned-source-archive";
  }
}
