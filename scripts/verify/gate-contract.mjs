import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { collectGateContractViolations } from "../gate-contract-policy.mjs";
import { allowedGateModes, gatesFor } from "../gates/definitions.mjs";
import { collectReleaseWorkflowViolations } from "../release-workflow-policy.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const workspaceScripts = {};
for (const relative of ["apps/gateway/package.json", "apps/web/package.json", "apps/e2e/package.json"]) {
  const manifest = JSON.parse(await readFile(path.join(root, relative), "utf8"));
  workspaceScripts[manifest.name] = manifest.scripts ?? {};
}
const failures = collectGateContractViolations({
  modes: allowedGateModes,
  gatesFor,
  rootScripts: rootManifest.scripts ?? {},
  workspaceScripts,
  ciSource: await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8"),
  e2eConfigSource: await readFile(path.join(root, "apps/e2e/playwright.config.ts"), "utf8"),
  dockerfileSource: await readFile(path.join(root, "Dockerfile"), "utf8"),
});
failures.push(...collectReleaseWorkflowViolations(
  await readFile(path.join(root, ".github/workflows/release.yml"), "utf8"),
));

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`gate-contract passed (${allowedGateModes.length} modes)\n`);
}
