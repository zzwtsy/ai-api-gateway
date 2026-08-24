import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { pageManifest } from "../../apps/web/src/routes/-page-manifest.ts";
import { collectWebContractViolations } from "../web-contract-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const [pageContractsSource, designTokensSource, routeTreeSource, cssSource] = await Promise.all([
  readFile(path.join(root, "docs/product/ux/page-contracts.json"), "utf8"),
  readFile(path.join(root, "docs/product/ux/design-tokens.json"), "utf8"),
  readFile(path.join(root, "apps/web/src/routeTree.gen.ts"), "utf8"),
  readFile(path.join(root, "apps/web/src/index.css"), "utf8"),
]);

const failures = collectWebContractViolations({
  pageContracts: JSON.parse(pageContractsSource),
  designTokens: JSON.parse(designTokensSource),
  pageManifest,
  routeTreeSource,
  cssSource,
});

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`web-contracts passed (${pageManifest.length} delivered pages)\n`);
}
