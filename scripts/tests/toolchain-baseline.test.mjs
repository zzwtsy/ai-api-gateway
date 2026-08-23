import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectToolchainBaselineViolations } from "../toolchain-baseline-policy.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const baseline = JSON.parse(await readFile(path.join(root, ".toolchain/baseline.json"), "utf8"));

test("committed source conforms to the official toolchain baseline", async () => {
  assert.deepEqual(await collectToolchainBaselineViolations(root, baseline), []);
});

test("baseline rejects a silent switch back to Radix primitives", async () => {
  const fixtureRoot = await createFixture();
  const webManifestPath = path.join(fixtureRoot, "apps/web/package.json");
  const webManifest = JSON.parse(await readFile(webManifestPath, "utf8"));
  webManifest.dependencies["@radix-ui/react-slot"] = "catalog:";
  await writeFile(webManifestPath, `${JSON.stringify(webManifest, null, 2)}\n`);

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some((error) => error.includes("Radix primitives")));
});

test("baseline rejects unrecorded edits to reviewed shadcn component source", async () => {
  const fixtureRoot = await createFixture();
  const buttonPath = path.join(fixtureRoot, "apps/web/src/components/ui/button.tsx");
  await writeFile(buttonPath, `${await readFile(buttonPath, "utf8")}\n// unreviewed edit\n`);

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some((error) => error.includes("reviewed shadcn component digest")));
});

test("baseline rejects non-registry files inside components/ui", async () => {
  const fixtureRoot = await createFixture();
  const testPath = path.join(fixtureRoot, "apps/web/src/components/ui/button.test.tsx");
  await writeFile(testPath, "// project-owned test must live outside components/ui\n");

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some((error) => error.includes("Registry-owned") && error.includes("button.test.tsx")));
});

test("baseline rejects manual router composition replacing the generated route tree", async () => {
  const fixtureRoot = await createFixture();
  await writeFile(path.join(fixtureRoot, "apps/web/src/router.tsx"), "export const router = {};\n");

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some((error) => error.includes("generated routeTree.gen.ts")));
});

async function createFixture() {
  const target = await mkdtemp(path.join(tmpdir(), "aigw-toolchain-baseline-"));
  const files = [
    "package.json",
    "pnpm-workspace.yaml",
    "eslint.config.mjs",
    "apps/web/package.json",
    "apps/web/components.json",
    "apps/web/src/index.css",
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "apps/web/vitest.config.ts",
    "apps/web/vite.config.ts",
    "apps/web/src/router.tsx",
    baseline.vite.router.generatedRouteTree,
    baseline.openapiClient.schema,
    "apps/web/src/test/setup.ts",
    ...baseline.shadcn.components.map((component) => `apps/web/src/components/ui/${component}.tsx`),
  ];
  for (const relative of files) {
    const destination = path.join(target, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, relative), destination);
  }
  return target;
}
