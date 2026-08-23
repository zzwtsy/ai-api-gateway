import path from "node:path";
import process from "node:process";

import { collectProjectVersionViolations, projectVersionProjections } from "../project-version-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const failures = await collectProjectVersionViolations(root);

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`project-version passed (${projectVersionProjections.length} synchronized projections)\n`);
}
