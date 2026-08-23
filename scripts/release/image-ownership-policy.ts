import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const manifestMissingPattern = /(?:manifest|name)\s+(?:unknown|not found)\b/iu;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

type ImageInspectRunner = (
  file: string,
  args: readonly string[],
  options: { encoding: null; maxBuffer: number },
) => Promise<{ stdout: string | Buffer }>;

interface ImageOwnershipInput {
  versionReference: string;
  versionDigest: string | null;
  commitReference: string;
  commitDigest: string | null;
}

const defaultImageInspectRunner: ImageInspectRunner = async (file, args, options) => execFileAsync(file, args, options);

export async function inspectImageManifestDigest(reference: string, run: ImageInspectRunner = defaultImageInspectRunner): Promise<string | null> {
  try {
    const { stdout } = await run(
      "docker",
      ["buildx", "imagetools", "inspect", "--raw", reference],
      { encoding: null, maxBuffer: 1024 * 1024 * 4 },
    );
    const content = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
    return `sha256:${createHash("sha256").update(content).digest("hex")}`;
  } catch (error) {
    if (isMissingImageManifestError(error, reference))
      return null;
    const detail = readErrorOutput(error);
    throw new Error(`无法读取 GHCR Manifest ${reference}：${detail}`, { cause: error });
  }
}

export function decideImageTagOwnership({
  versionReference,
  versionDigest,
  commitReference,
  commitDigest,
}: ImageOwnershipInput): { mode: "first-publish"; digest: null } | { mode: "same-commit-retry"; digest: string } {
  validateOptionalDigest(versionReference, versionDigest);
  validateOptionalDigest(commitReference, commitDigest);

  if (versionDigest === null && commitDigest === null) {
    return { mode: "first-publish", digest: null };
  }
  if (versionDigest !== null && commitDigest !== null && versionDigest === commitDigest) {
    return { mode: "same-commit-retry", digest: versionDigest };
  }
  if (versionDigest === null || commitDigest === null) {
    throw new Error(
      `GHCR 标签归属不完整：${versionReference}=${versionDigest ?? "missing"}，${commitReference}=${commitDigest ?? "missing"}`,
    );
  }
  throw new Error(
    `GHCR 标签归属冲突：${versionReference}=${versionDigest}，${commitReference}=${commitDigest}`,
  );
}

export function isMissingImageManifestError(error: unknown, reference?: string): boolean {
  const lines = readErrorOutput(error).split(/\r?\n/u);
  return lines.some(line => manifestMissingPattern.test(line)
    || (reference !== undefined && line.includes(reference) && /\bnot found\b/iu.test(line)));
}

function validateOptionalDigest(reference: string, digest: string | null): void {
  if (digest !== null && !digestPattern.test(digest)) {
    throw new Error(`${reference} 返回非法 Manifest Digest：${String(digest)}`);
  }
}

function readErrorOutput(error: unknown): string {
  if (error === null || typeof error !== "object")
    return String(error);
  const record = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
  const values = [record.stderr, record.stdout, record.message]
    .map(value => Buffer.isBuffer(value) ? value.toString("utf8") : value)
    .filter(value => typeof value === "string" && value.trim() !== "");
  return values.join("\n").trim() || "unknown error";
}
