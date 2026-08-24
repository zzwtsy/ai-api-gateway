import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { projectVersionProjections } from "../../project-version-policy.ts";
import {
  isolatedGitEnvironment,
  isolateGitProcessEnvironment,
} from "./isolated-git-environment.ts";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

isolateGitProcessEnvironment();

export const fixtureVersion = "1.2.3-alpha.3";
export const previousFixtureVersion = "1.2.3-alpha.2";

interface ProjectVersionFixtureOptions {
  version?: string;
  includeReleaseSources?: boolean;
  initializeGit?: boolean;
}

export async function createProjectVersionFixture({
  version = fixtureVersion,
  includeReleaseSources = false,
  initializeGit = false,
}: ProjectVersionFixtureOptions = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aigw-project-version-"));

  if (includeReleaseSources)
    await copyReleaseSources(root);

  const currentVersion = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  ).version;
  for (const item of projectVersionProjections) {
    const source = await readFile(path.join(repositoryRoot, item.path), "utf8");
    const pattern = clonePattern(item.pattern);
    const matches = [...source.matchAll(clonePattern(item.pattern))];
    if (matches.length !== 1 || matches[0]?.[2] !== currentVersion) {
      throw new Error(`${item.path} 无法从 ${currentVersion} 建立合成版本 Fixture`);
    }
    const updated = source.replace(pattern, `$1${version}$3`);
    await writeFixtureFile(root, item.path, updated);
  }

  await writeFixtureFile(root, "CHANGELOG.md", fixtureChangelog(version));

  let commit: string | undefined;
  if (initializeGit) {
    await runGit(root, ["init", "--quiet"]);
    await runGit(root, ["config", "user.name", "AIGW Test"]);
    await runGit(root, ["config", "user.email", "aigw-test@example.invalid"]);
    await runGit(root, ["add", "."]);
    await runGit(root, ["commit", "--quiet", "-m", `chore(release): v${version}`]);
    commit = (await runGit(root, ["rev-parse", "HEAD"])).trim();
  }

  return { root, version, commit };
}

export function fixtureChangelog(version: string = fixtureVersion): string {
  return `# 变更日志

## ${version} — 2026-08-23

### 修复

- 验证合成发布资产。

## ${previousFixtureVersion} — 2026-08-22

### 新增

- 建立上一版本记录。
`;
}

async function copyReleaseSources(root: string): Promise<void> {
  for (const relative of [
    "scripts/docs/bundle-spec.ts",
    "scripts/docs/spec-bundle.ts",
    "scripts/docs/source-identity.ts",
    "docs/spec-bundles.json",
  ]) {
    await copyFile(root, relative);
  }
  const manifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "docs/spec-bundles.json"), "utf8"),
  );
  const sources = new Set<string>(
    (manifest.bundles ?? []).flatMap((bundle: { sources?: string[] }) => bundle.sources ?? []),
  );
  for (const relative of sources) await copyFile(root, relative);
}

async function copyFile(root: string, relative: string): Promise<void> {
  const destination = path.join(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(repositoryRoot, relative), destination);
}

async function writeFixtureFile(root: string, relative: string, content: string): Promise<void> {
  const destination = path.join(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}

async function runGit(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: isolatedGitEnvironment(),
  });
  return stdout;
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}
