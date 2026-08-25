import type { WebContractInput } from "../web-contract-policy.ts";

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { pageManifest } from "../../apps/web/src/routes/-page-manifest.ts";
import { collectWebContractViolations } from "../web-contract-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");

test("current delivered pages, generated routes and layout tokens form one contract", async () => {
  assert.deepEqual(collectWebContractViolations(await actualInput()), []);
});

test("planned product pages may remain outside the delivered navigation manifest", async () => {
  const input = await actualInput();
  const productPages = (input.pageContracts as { pages: unknown[] }).pages;
  assert.ok(productPages.length > input.pageManifest.length);
  assert.deepEqual(collectWebContractViolations(input), []);
});

test("duplicate and drifted manifest identities fail with field diagnostics", async () => {
  const input = await actualInput();
  const first = input.pageManifest[0] as Record<string, unknown>;
  const errors = collectWebContractViolations({
    ...input,
    pageManifest: [
      ...input.pageManifest,
      { ...first, path: "/unexpected" },
    ],
  });

  assert.ok(errors.some(error => error.includes("duplicate id \"overview\"")));
  assert.ok(errors.some(error => error.includes("overview.path") && error.includes("/unexpected")));
});

test("a delivered page without a generated route fails closed", async () => {
  const input = await actualInput();
  const errors = collectWebContractViolations({
    ...input,
    routeTreeSource: "export interface FileRouteTypes { fullPaths: '/' | '/requests' }",
  });
  assert.ok(errors.some(error => error.includes("/connections") && error.includes("is missing")));
});

test("an unreadable generated route shape fails instead of silently skipping route checks", async () => {
  const input = await actualInput();
  const errors = collectWebContractViolations({ ...input, routeTreeSource: "export const routeTree = {};" });
  assert.ok(errors.some(error => error.includes("could not read FileRouteTypes.fullPaths")));
});

test("layout token drift reports the CSS variable and both values", async () => {
  const input = await actualInput();
  const errors = collectWebContractViolations({
    ...input,
    cssSource: input.cssSource.replace(
      "--aigw-layout-request-master-min: 620px",
      "--aigw-layout-request-master-min: 600px",
    ),
  });
  assert.ok(errors.some(error => error.includes("--aigw-layout-request-master-min")
    && error.includes("620px") && error.includes("600px")));
});

test("unknown UX contract fields fail through the project JSON Schema", async () => {
  const input = await actualInput();
  const designTokens = structuredClone(input.designTokens) as Record<string, unknown>;
  designTokens.unownedThemeState = true;
  const errors = collectWebContractViolations({ ...input, designTokens });
  assert.ok(errors.some(error => error.includes("design-tokens.json") && error.includes("additional properties")));
});

test("an N/A lifecycle state without a reason fails closed", async () => {
  const input = await actualInput();
  const pageContracts = structuredClone(input.pageContracts) as {
    pages: Array<{ regions: Array<{ states: Array<Record<string, unknown>> }> }>;
  };
  const plannedState = pageContracts.pages[2]?.regions[0]?.states[0];
  assert.ok(plannedState);
  delete plannedState.reason;
  const errors = collectWebContractViolations({ ...input, pageContracts });
  assert.ok(errors.some(error => error.includes("page-contracts.json") && error.includes("reason")));
});

test("a lifecycle scenario without a real test-source association fails closed", async () => {
  const input = await actualInput();
  const missingScenario = "UX-OVERVIEW-LOADING";
  const errors = collectWebContractViolations({
    ...input,
    runtimeScenarioSources: input.runtimeScenarioSources.map(testSource => ({
      ...testSource,
      source: testSource.source.replaceAll(missingScenario, "REMOVED-SCENARIO"),
    })),
  });
  assert.ok(errors.some(error => error.includes(missingScenario) && error.includes("missing from test source")));
});

async function actualInput(): Promise<WebContractInput> {
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
  return {
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
  };
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
