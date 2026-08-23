import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const manifests = await findManifests(root);
const findings: string[] = [];

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
      if (entries.typescript !== "6.0.3")
        findings.push(`${relative} must pin TypeScript exactly to 6.0.3`);
    }
  }
}

const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (rootManifest.devDependencies?.typescript !== "6.0.3") {
  findings.push("root devDependencies.typescript must be 6.0.3");
}

if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`typescript-version passed (${manifests.length} manifests, one TypeScript 6.0.3 owner)\n`);
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
