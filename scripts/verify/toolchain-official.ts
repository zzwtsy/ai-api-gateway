import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  collectOfficialRegistrySourceViolations,
  registryArtifactPaths,
} from "../toolchain-official-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const shadcnCli = path.join(root, "node_modules/shadcn/dist/index.js");
const baseline = JSON.parse(await readFile(path.join(root, ".toolchain/baseline.json"), "utf8"));
const failures: string[] = [];

const result = spawnSync(
  process.execPath,
  [shadcnCli, "info", "--cwd", "apps/web", "--json"],
  { cwd: root, encoding: "utf8", env: process.env },
);
if (result.status !== 0) {
  failures.push(`shadcn info failed: ${commandFailureDetail(result)}`);
} else {
  try {
    const info = JSON.parse(result.stdout);
    const base = findKey(info, "base");
    const style = findKey(info, "style");
    const tailwindVersion = findKey(info, "tailwindVersion");
    if (base !== "base")
      failures.push(`shadcn info base must be base, got ${JSON.stringify(base)}`);
    if (style !== "nova" && style !== "base-nova") {
      failures.push(`shadcn info style must be nova/base-nova, got ${JSON.stringify(style)}`);
    }
    if (tailwindVersion !== "v4") {
      failures.push(`shadcn info tailwindVersion must be v4, got ${JSON.stringify(tailwindVersion)}`);
    }
    if (info.preset?.code !== baseline.shadcn.presetCode) {
      failures.push(`shadcn preset code must be ${baseline.shadcn.presetCode}, got ${JSON.stringify(info.preset?.code)}`);
    }
    if (info.preset?.values?.theme !== baseline.shadcn.theme.primary) {
      failures.push(`shadcn theme must be ${baseline.shadcn.theme.primary}, got ${JSON.stringify(info.preset?.values?.theme)}`);
    }
    if (info.preset?.values?.font !== baseline.shadcn.theme.font) {
      failures.push(`shadcn font must be ${baseline.shadcn.theme.font}, got ${JSON.stringify(info.preset?.values?.font)}`);
    }
    if (JSON.stringify(info.components) !== JSON.stringify(baseline.shadcn.components)) {
      failures.push("shadcn installed component list must match the reviewed baseline");
    }
  } catch (error) {
    failures.push(`cannot parse shadcn info JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (result.status === 0) {
  let temporaryRoot: string | undefined;
  try {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aigw-shadcn-official-"));
    await cp(path.join(root, "apps/web"), path.join(temporaryRoot, "apps/web"), {
      recursive: true,
      filter: source => !source.split(path.sep).some(part => [
        "node_modules",
        "dist",
        "coverage",
        "test-results",
        "playwright-report",
      ].includes(part)),
    });
    for (const relative of ["package.json", "pnpm-workspace.yaml", "tsconfig.base.json"]) {
      await cp(path.join(root, relative), path.join(temporaryRoot, relative));
    }
    for (const relative of registryArtifactPaths(baseline)) {
      await rm(path.join(temporaryRoot, relative), { force: true });
    }

    const generation = spawnSync(
      process.execPath,
      [
        shadcnCli,
        "add",
        ...baseline.shadcn.components,
        "--cwd",
        path.join(temporaryRoot, "apps/web"),
        "--yes",
        "--silent",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, CI: "true", NO_COLOR: "1" },
        maxBuffer: 1024 * 1024 * 20,
      },
    );
    if (generation.status !== 0) {
      failures.push(
        `shadcn isolated generation failed: ${commandFailureDetail(generation)}`,
      );
    } else {
      failures.push(...await collectOfficialRegistrySourceViolations(root, temporaryRoot, baseline));
    }
  } catch (error) {
    failures.push(`cannot verify official shadcn source: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (temporaryRoot !== undefined) {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

for (const [relative, expected] of [
  ["node_modules/shadcn/package.json", baseline.shadcn.cliVersion],
  ["node_modules/@antfu/eslint-config/package.json", baseline.eslint.version],
  ["apps/web/node_modules/@base-ui/react/package.json", "1.7.0"],
] satisfies readonly (readonly [string, string])[]) {
  try {
    const manifest = JSON.parse(await readFile(path.join(root, relative), "utf8"));
    if (manifest.version !== expected) {
      failures.push(`${relative} must be ${expected}, got ${manifest.version}`);
    }
  } catch (error) {
    failures.push(`cannot read installed tool ${relative}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("official toolchain probe and Registry component byte comparison passed\n");
}

function findKey(value: unknown, key: string): unknown {
  if (value === null || typeof value !== "object")
    return undefined;
  const record = value as Record<string, unknown>;
  if (Object.hasOwn(record, key))
    return record[key];
  for (const child of Object.values(record)) {
    const found = findKey(child, key);
    if (found !== undefined)
      return found;
  }
  return undefined;
}

function commandFailureDetail(result: SpawnSyncReturns<string>): string {
  const stderr = result.stderr?.trim();
  const stdout = result.stdout?.trim();
  return (stderr !== undefined && stderr !== "" ? stderr : undefined)
    ?? (stdout !== undefined && stdout !== "" ? stdout : undefined)
    ?? result.error?.message
    ?? `exit ${String(result.status)}`;
}
