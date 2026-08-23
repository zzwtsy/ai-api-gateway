import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const manifestMissingPattern = /(?:manifest|name)\s+(?:unknown|not found)\b/iu;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

export async function inspectImageManifestDigest(reference, run = execFileAsync) {
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
}) {
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

export function isMissingImageManifestError(error, reference) {
  const lines = readErrorOutput(error).split(/\r?\n/u);
  return lines.some(line => manifestMissingPattern.test(line)
    || (reference !== undefined && line.includes(reference) && /\bnot found\b/iu.test(line)));
}

function validateOptionalDigest(reference, digest) {
  if (digest !== null && !digestPattern.test(digest)) {
    throw new Error(`${reference} 返回非法 Manifest Digest：${String(digest)}`);
  }
}

function readErrorOutput(error) {
  if (error === null || typeof error !== "object")
    return String(error);
  const values = [error.stderr, error.stdout, error.message]
    .map(value => Buffer.isBuffer(value) ? value.toString("utf8") : value)
    .filter(value => typeof value === "string" && value.trim() !== "");
  return values.join("\n").trim() || "unknown error";
}
