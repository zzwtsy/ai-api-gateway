import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { collectToolchainBaselineViolations } from "../toolchain-baseline-policy.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const baseline = JSON.parse(
  await readFile(path.join(root, ".toolchain/baseline.json"), "utf8"),
);
const violations = await collectToolchainBaselineViolations(root, baseline);

if (violations.length > 0) {
  process.stderr.write(`toolchain-baseline violations:\n${violations.map((value) => `  - ${value}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `toolchain-baseline passed (shadcn ${baseline.shadcn.cliVersion}, Base UI, Antfu ${baseline.eslint.version})\n`,
  );
}
