import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const manifests = await findManifests(root);
const findings: string[] = [];
const expectedVersion = "6.0.3";

for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const entries = manifest[section] ?? {};
    for (const forbidden of ["@typescript/native", "@typescript/typescript6"]) {
      if (forbidden in entries)
        findings.push(`${path.relative(root, manifestPath)} uses forbidden ${forbidden}`);
    }
    if ("typescript" in entries) {
      const relative = path.relative(root, manifestPath);
      if (relative !== "package.json")
        findings.push(`${relative} declares its own TypeScript version`);
      if (relative === "package.json" && entries.typescript !== "catalog:")
        findings.push(`${relative} must resolve TypeScript through the workspace catalog`);
    }
  }
}

const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (rootManifest.devDependencies?.typescript !== "catalog:") {
  findings.push("root devDependencies.typescript must be catalog:");
}

const workspace = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
const typeScriptCatalogEntry = new RegExp(`(?:^|\\n) {2}typescript: ${expectedVersion}(?:\\n|$)`, "u");
if (!typeScriptCatalogEntry.test(workspace)) {
  findings.push(`pnpm workspace catalog must pin TypeScript exactly to ${expectedVersion}`);
}

if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`typescript-version passed (${manifests.length} manifests, one TypeScript ${expectedVersion} catalog owner)\n`);
}

async function findManifests(directory: string): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".artifacts"].includes(entry.name))
      continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory())
      results.push(...await findManifests(fullPath));
    else if (entry.name === "package.json")
      results.push(fullPath);
  }
  return results;
}
