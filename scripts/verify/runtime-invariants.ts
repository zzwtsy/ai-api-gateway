import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { collectRuntimeInvariantViolations } from "../runtime-invariants-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const manifestPath = path.join(import.meta.dirname, "runtime-invariants.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = await collectRuntimeInvariantViolations(root, manifest);
const count = manifest.owners?.length ?? 0;

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`runtime-invariants passed (${count} owned invariants)\n`);
}
