import path from "node:path";
import process from "node:process";

import { collectAgentAssetViolations } from "../agent-assets-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const { failures, markdownCount } = await collectAgentAssetViolations(root);

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`agent-assets passed (${markdownCount} Markdown files)\n`);
}
