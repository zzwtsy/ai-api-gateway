import process from "node:process";

import {
  decideImageTagOwnership,
  inspectImageManifestDigest,
} from "./image-ownership-policy.ts";

const imageName = requiredEnvironment("IMAGE_NAME");
const version = requiredEnvironment("VERSION");
const commit = requiredEnvironment("COMMIT_SHA");
if (!/^[0-9a-f]{40,64}$/u.test(commit)) {
  throw new Error(`COMMIT_SHA 必须是完整 Git SHA，收到 ${JSON.stringify(commit)}`);
}

const versionReference = `${imageName}:${version}`;
const commitReference = `${imageName}:sha-${commit}`;
const [versionDigest, commitDigest] = await Promise.all([
  inspectImageManifestDigest(versionReference),
  inspectImageManifestDigest(commitReference),
]);
const decision = decideImageTagOwnership({
  versionReference,
  versionDigest,
  commitReference,
  commitDigest,
});

process.stdout.write(
  decision.mode === "first-publish"
    ? `GHCR 标签归属校验通过：${versionReference} 与 ${commitReference} 均未发布。\n`
    : `GHCR 标签归属校验通过：相同 Commit 续跑（${decision.digest}）。\n`,
);

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "")
    throw new Error(`缺少环境变量 ${name}`);
  return value;
}
