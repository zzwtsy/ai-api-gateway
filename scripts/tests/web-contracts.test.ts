import type { WebContractInput } from "../web-contract-policy.ts";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

async function actualInput(): Promise<WebContractInput> {
  const [pageContractsSource, designTokensSource, routeTreeSource, cssSource] = await Promise.all([
    readFile(path.join(root, "docs/product/ux/page-contracts.json"), "utf8"),
    readFile(path.join(root, "docs/product/ux/design-tokens.json"), "utf8"),
    readFile(path.join(root, "apps/web/src/routeTree.gen.ts"), "utf8"),
    readFile(path.join(root, "apps/web/src/index.css"), "utf8"),
  ]);
  return {
    pageContracts: JSON.parse(pageContractsSource),
    designTokens: JSON.parse(designTokensSource),
    pageManifest,
    routeTreeSource,
    cssSource,
  };
}
