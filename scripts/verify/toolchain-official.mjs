import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../..");
const baseline = JSON.parse(await readFile(path.join(root, ".toolchain/baseline.json"), "utf8"));
const failures = [];

const result = spawnSync(
  "pnpm",
  ["exec", "shadcn", "info", "--cwd", "apps/web", "--json"],
  { cwd: root, encoding: "utf8", env: process.env },
);
if (result.status !== 0) {
  failures.push(`shadcn info failed: ${result.stderr.trim() || `exit ${String(result.status)}`}`);
} else {
  try {
    const info = JSON.parse(result.stdout);
    const base = findKey(info, "base");
    const style = findKey(info, "style");
    const tailwindVersion = findKey(info, "tailwindVersion");
    if (base !== "base") failures.push(`shadcn info base must be base, got ${JSON.stringify(base)}`);
    if (style !== "nova" && style !== "base-nova") {
      failures.push(`shadcn info style must be nova/base-nova, got ${JSON.stringify(style)}`);
    }
    if (tailwindVersion !== "v4") {
      failures.push(`shadcn info tailwindVersion must be v4, got ${JSON.stringify(tailwindVersion)}`);
    }
  } catch (error) {
    failures.push(`cannot parse shadcn info JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const [relative, expected] of [
  ["node_modules/shadcn/package.json", baseline.shadcn.cliVersion],
  ["node_modules/@antfu/eslint-config/package.json", baseline.eslint.version],
  ["apps/web/node_modules/@base-ui/react/package.json", "1.7.0"],
]) {
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
  process.stdout.write("official toolchain probe passed\n");
}

function findKey(value, key) {
  if (value === null || typeof value !== "object") return undefined;
  if (Object.hasOwn(value, key)) return value[key];
  for (const child of Object.values(value)) {
    const found = findKey(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}
