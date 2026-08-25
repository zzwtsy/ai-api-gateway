import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { pageManifest } from "../../apps/web/src/routes/-page-manifest.ts";
import { collectWebContractViolations } from "../web-contract-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const [
  pageContractsSource,
  pageContractsSchemaSource,
  designTokensSource,
  designTokensSchemaSource,
  routeTreeSource,
  cssSource,
  indexHtmlSource,
  themeProviderSource,
  themeSource,
  runtimeScenarioSources,
] = await Promise.all([
  readFile(path.join(root, "docs/product/ux/page-contracts.json"), "utf8"),
  readFile(path.join(root, "docs/product/ux/schemas/page-contracts.schema.json"), "utf8"),
  readFile(path.join(root, "docs/product/ux/design-tokens.json"), "utf8"),
  readFile(path.join(root, "docs/product/ux/schemas/design-tokens.schema.json"), "utf8"),
  readFile(path.join(root, "apps/web/src/routeTree.gen.ts"), "utf8"),
  readFile(path.join(root, "apps/web/src/index.css"), "utf8"),
  readFile(path.join(root, "apps/web/index.html"), "utf8"),
  readFile(path.join(root, "apps/web/src/components/layout/theme-provider.tsx"), "utf8"),
  readFile(path.join(root, "apps/web/src/components/layout/theme.ts"), "utf8"),
  readRuntimeScenarioSources(),
]);

const failures = collectWebContractViolations({
  pageContracts: JSON.parse(pageContractsSource),
  pageContractsSchema: JSON.parse(pageContractsSchemaSource),
  designTokens: JSON.parse(designTokensSource),
  designTokensSchema: JSON.parse(designTokensSchemaSource),
  pageManifest,
  routeTreeSource,
  runtimeScenarioSources,
  cssSource,
  indexHtmlSource,
  themeProviderSource,
  themeSource,
});

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`web-contracts structural and scenario-association checks passed (${pageManifest.length} delivered pages; runtime scenarios not executed)\n`);
}

async function readRuntimeScenarioSources() {
  const sourceRoots = ["apps/web/src", "apps/e2e/tests"];
  const files = (await Promise.all(sourceRoots.map(async (sourceRoot) => {
    const absoluteRoot = path.join(root, sourceRoot);
    const entries = await readdir(absoluteRoot, { recursive: true, withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && /\.(?:test|spec)\.tsx?$/u.test(entry.name))
      .map(entry => path.join(entry.parentPath, entry.name));
  }))).flat();
  return Promise.all(files.map(async file => ({
    path: path.relative(root, file),
    source: await readFile(file, "utf8"),
  })));
}
