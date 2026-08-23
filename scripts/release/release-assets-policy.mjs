import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs, promisify } from "node:util";

import { collectProjectVersionViolations } from "../project-version-policy.mjs";

const execFileAsync = promisify(execFile);

export function parseReleaseAssetArguments(rawArgs) {
  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: { check: { type: "boolean", default: false } },
  });
  if (positionals.length !== 1)
    throw new Error("用法：pnpm release:assets -- <version> [--check]");
  return { version: positionals[0], check: values.check };
}

export async function createReleaseAssets({ repositoryRoot, outputDirectory, version, allowDirty = false }) {
  const versionFailures = await collectProjectVersionViolations(repositoryRoot);
  if (versionFailures.length > 0)
    throw new Error(`版本合同未通过：\n${versionFailures.join("\n")}`);

  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
  if (manifest.version !== version) {
    throw new Error(`发布版本 ${version} 与根版本 ${manifest.version} 不一致`);
  }

  const headManifest = JSON.parse((await execFileAsync("git", ["show", "HEAD:package.json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })).stdout);
  if (headManifest.version !== version) {
    throw new Error(`发布版本 ${version} 尚未进入 HEAD（HEAD 版本为 ${headManifest.version}）`);
  }
  if (!allowDirty) {
    const status = (await execFileAsync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    })).stdout;
    if (status !== "")
      throw new Error("生成正式发布资产前工作树必须干净");
  }

  const changelog = await readFile(path.join(repositoryRoot, "CHANGELOG.md"), "utf8");
  const releaseNotes = extractReleaseNotes(changelog, version);
  const commit = (await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })).stdout.trim();
  if (!/^[0-9a-f]{40,64}$/u.test(commit))
    throw new Error(`无法解析发布 Commit：${commit}`);

  await mkdir(outputDirectory, { recursive: true });
  const temporarySpecDirectory = path.join(outputDirectory, ".spec-work");
  await mkdir(temporarySpecDirectory, { recursive: true });
  await execFileAsync(process.execPath, [
    path.join(repositoryRoot, "scripts/docs/bundle-spec.mjs"),
    "--output-dir",
    temporarySpecDirectory,
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, AIGW_SOURCE_COMMIT: commit },
  });

  const bundleManifest = JSON.parse(await readFile(path.join(repositoryRoot, "docs/spec-bundles.json"), "utf8"));
  const specificationNames = (bundleManifest.bundles ?? []).map(bundle => bundle.output);
  if (specificationNames.length !== 3 || new Set(specificationNames).size !== 3) {
    throw new Error(`发布合同要求恰好三份规范，实际 ${specificationNames.length} 份`);
  }
  for (const name of specificationNames) {
    await cp(path.join(temporarySpecDirectory, name), path.join(outputDirectory, name));
  }
  await rm(temporarySpecDirectory, { recursive: true, force: true });

  const archiveName = `ai-api-gateway-v${version}.tar.gz`;
  const archivePath = path.join(outputDirectory, archiveName);
  const prefix = `ai-api-gateway-v${version}/`;
  const metadata = `${JSON.stringify({ formatVersion: 1, version, commit }, null, 2)}\n`;
  await execFileAsync("git", [
    "archive",
    "--format=tar.gz",
    `--prefix=${prefix}`,
    `--add-virtual-file=${prefix}.artifacts/source-metadata.json:${metadata}`,
    `--output=${archivePath}`,
    "HEAD",
  ], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });

  const notesName = "RELEASE_NOTES.md";
  await writeFile(path.join(outputDirectory, notesName), releaseNotes, "utf8");

  const assetNames = [archiveName, ...specificationNames, notesName].sort();
  const checksums = [];
  for (const name of assetNames) {
    const content = await readFile(path.join(outputDirectory, name));
    checksums.push(`${createHash("sha256").update(content).digest("hex")}  ${name}`);
  }
  await writeFile(path.join(outputDirectory, "SHA256SUMS"), `${checksums.join("\n")}\n`, "utf8");

  const archivedMetadata = await readArchiveMetadata(archivePath, prefix);
  if (archivedMetadata.version !== version || archivedMetadata.commit !== commit) {
    throw new Error(`源码归档元数据与发布身份不一致`);
  }

  return {
    version,
    commit,
    assetNames: [...assetNames, "SHA256SUMS"],
  };
}

export function extractReleaseNotes(changelog, version) {
  const headings = [...changelog.matchAll(/^## (\S+) — .+$/gmu)];
  const index = headings.findIndex(match => match[1] === version);
  if (index === -1)
    throw new Error(`CHANGELOG.md 缺少版本 ${version}`);
  const start = headings[index].index;
  const end = headings[index + 1]?.index ?? changelog.length;
  const notes = changelog.slice(start, end).trim();
  if (!/[\u3400-\u9FFF]/u.test(notes))
    throw new Error(`版本 ${version} 的 Release Notes 必须包含中文语义`);
  return `${notes}\n`;
}

async function readArchiveMetadata(archivePath, prefix) {
  const { stdout } = await execFileAsync("tar", [
    "-xOf",
    archivePath,
    `${prefix}.artifacts/source-metadata.json`,
  ], { encoding: "utf8" });
  return JSON.parse(stdout);
}
