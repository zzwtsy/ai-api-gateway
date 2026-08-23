import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import semver from "semver";

const packageVersion = /(^ {2}"version": ")([^"]+)(",?$)/gmu;

export const projectVersionProjections = Object.freeze([
  projection("package.json", packageVersion),
  projection("apps/gateway/package.json", packageVersion),
  projection("apps/web/package.json", packageVersion),
  projection("apps/e2e/package.json", packageVersion),
  projection(".toolchain/baseline.json", /(^ {2}"projectVersion": ")([^"]+)(",?$)/gmu),
  projection(
    "apps/gateway/src/control-plane/http/openapi/configure-openapi.ts",
    /(^ {4}version: ")([^"]+)(",?$)/gmu,
  ),
  projection("README.md", /(^当前版本：`)([^`]+)(`。)/gmu),
  projection("README.en.md", /(^Current status: `)([^`]+)(`\.)/gmu),
  projection(
    "docs/architecture/current-implementation.md",
    /(^project_version:\s*)(\S+)(\s*$)/gmu,
  ),
  projection(
    "docs/roadmap/implementation-plan.md",
    /(^project_version:\s*)(\S+)(\s*$)/gmu,
  ),
  projection(
    "docs/references/openapi-outline.yaml",
    /(^ {2}version:\s*)(\S+)(\s*$)/gmu,
  ),
  projection(
    "docs/product/ux/design-tokens.json",
    /(^ {2}"version": ")([^"]+)(",?$)/gmu,
  ),
  projection(
    "docs/product/ux/page-contracts.json",
    /(^ {2}"version": ")([^"]+)(",?$)/gmu,
  ),
  projection(
    "docs/diagrams/current-container-architecture.dot",
    /(label="AI API Gateway 当前实现架构（)([^）]+)(）")/gu,
  ),
]);

export async function collectProjectVersionViolations(repositoryRoot) {
  const failures = [];
  const values = new Map();

  for (const item of projectVersionProjections) {
    try {
      const source = await readFile(path.join(repositoryRoot, item.path), "utf8");
      const matches = collectMatches(source, item.pattern);
      if (matches.length !== 1) {
        failures.push(`${item.path} 必须且只能包含一个项目版本投影，实际 ${matches.length} 个`);
        continue;
      }
      values.set(item.path, matches[0]);
    } catch (error) {
      failures.push(`${item.path} 无法读取：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const rootVersion = values.get("package.json");
  if (rootVersion === undefined)
    return failures;
  if (semver.valid(rootVersion) !== rootVersion) {
    failures.push(`根项目版本不是严格 SemVer：${rootVersion}`);
  }

  for (const item of projectVersionProjections) {
    const value = values.get(item.path);
    if (value !== undefined && value !== rootVersion) {
      failures.push(`${item.path} 版本 ${value} 与根版本 ${rootVersion} 不一致`);
    }
  }

  try {
    const changelog = await readFile(path.join(repositoryRoot, "CHANGELOG.md"), "utf8");
    failures.push(...collectChangelogViolations(changelog, rootVersion));
  } catch (error) {
    failures.push(`CHANGELOG.md 无法读取：${error instanceof Error ? error.message : String(error)}`);
  }

  return failures;
}

export async function setProjectVersion(repositoryRoot, targetVersion) {
  const normalizedTarget = targetVersion.trim();
  if (semver.valid(normalizedTarget) !== normalizedTarget) {
    throw new Error(`目标版本必须是不带 v 前缀的严格 SemVer，收到 ${JSON.stringify(targetVersion)}`);
  }

  const currentFailures = await collectProjectVersionViolations(repositoryRoot);
  if (currentFailures.length > 0) {
    throw new Error(`当前版本投影未收口：\n${currentFailures.join("\n")}`);
  }

  const rootSource = await readFile(path.join(repositoryRoot, "package.json"), "utf8");
  const currentVersion = collectMatches(rootSource, packageVersion)[0];
  if (currentVersion === undefined || semver.valid(currentVersion) !== currentVersion) {
    throw new Error(`无法从根 package.json 读取严格 SemVer`);
  }
  if (normalizedTarget === currentVersion)
    throw new Error(`目标版本与当前版本相同：${currentVersion}`);
  if (!semver.gt(normalizedTarget, currentVersion)) {
    throw new Error(`目标版本必须高于当前版本 ${currentVersion}，收到 ${normalizedTarget}`);
  }

  const updates = [];
  for (const item of projectVersionProjections) {
    const absolute = path.join(repositoryRoot, item.path);
    const source = await readFile(absolute, "utf8");
    const matches = collectMatches(source, item.pattern);
    if (matches.length !== 1 || matches[0] !== currentVersion) {
      throw new Error(`${item.path} 必须恰好投影一次当前版本 ${currentVersion}`);
    }
    const pattern = clonePattern(item.pattern);
    const updated = source.replace(pattern, `$1${normalizedTarget}$3`);
    if (updated === source)
      throw new Error(`${item.path} 项目版本替换未生效`);
    updates.push({ absolute, updated });
  }

  for (const update of updates) await writeFile(update.absolute, update.updated, "utf8");
  return { previousVersion: currentVersion, version: normalizedTarget, paths: updates.length };
}

export function collectChangelogViolations(source, rootVersion) {
  const failures = [];
  const versions = [...source.matchAll(/^## (\S+) — .+$/gmu)].map(match => match[1]);
  if (versions.length === 0)
    return ["CHANGELOG.md 缺少版本标题"];
  if (versions[0] !== rootVersion) {
    failures.push(`CHANGELOG.md 最新版本 ${versions[0]} 与根版本 ${rootVersion} 不一致`);
  }
  const seen = new Set();
  for (const version of versions) {
    if (semver.valid(version) !== version)
      failures.push(`CHANGELOG.md 包含非法 SemVer 标题：${version}`);
    if (seen.has(version))
      failures.push(`CHANGELOG.md 包含重复版本标题：${version}`);
    seen.add(version);
  }
  return failures;
}

function collectMatches(source, pattern) {
  return [...source.matchAll(clonePattern(pattern))].map(match => match[2]);
}

function clonePattern(pattern) {
  return new RegExp(pattern.source, pattern.flags);
}

function projection(relativePath, pattern) {
  return Object.freeze({ path: relativePath, pattern });
}
