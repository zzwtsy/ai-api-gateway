import process from "node:process";
import { parseArgs } from "node:util";

import { allChangedPaths, collectChangeScope } from "./change-scope.ts";
import { renderEvidenceSelection, selectEvidence } from "./evidence-policy.ts";

try {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: false,
    strict: true,
    options: {
      base: { type: "string" },
      head: { type: "string", default: "HEAD" },
      json: { type: "boolean", default: false },
    },
  });
  if (values.base === undefined) {
    throw new Error("用法：pnpm evidence:select --base <verified-ref> [--head <ref>] [--json]");
  }
  const scope = collectChangeScope({ base: values.base, head: values.head });
  const selection = selectEvidence(allChangedPaths(scope));
  process.stdout.write(values.json
    ? `${JSON.stringify({ scope, selection }, null, 2)}\n`
    : renderEvidenceSelection(selection));
} catch (error) {
  process.stderr.write(`evidence-select: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
