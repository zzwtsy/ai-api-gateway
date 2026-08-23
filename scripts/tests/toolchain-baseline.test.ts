import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectToolchainBaselineViolations } from "../toolchain-baseline-policy.ts";

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
  assert.ok(errors.some(error => error.includes("Radix primitives")));
});

test("baseline rejects unrecorded edits to reviewed shadcn component source", async () => {
  const fixtureRoot = await createFixture();
  const buttonPath = path.join(fixtureRoot, "apps/web/src/components/ui/button.tsx");
  await writeFile(buttonPath, `${await readFile(buttonPath, "utf8")}\n// unreviewed edit\n`);

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("reviewed shadcn component digest")));
});

test("baseline rejects local patches to Registry-owned source", async () => {
  const patchedBaseline = structuredClone(baseline);
  patchedBaseline.shadcn.localPatches.badge = ["product variant"];

  const errors = await collectToolchainBaselineViolations(root, patchedBaseline);
  assert.ok(errors.some(error => error.includes("upstream-exact")));
});

test("baseline rejects excluding the generated use-mobile hook from ESLint", async () => {
  const fixtureRoot = await createFixture();
  const eslintPath = path.join(fixtureRoot, "eslint.config.ts");
  const eslint = await readFile(eslintPath, "utf8");
  await writeFile(
    eslintPath,
    eslint.replace(
      "\"apps/web/src/components/ui/**\",",
      "\"apps/web/src/components/ui/**\",\n      \"apps/web/src/hooks/use-mobile.ts\",",
    ),
  );

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("must lint the generated use-mobile hook")));
});

test("baseline rejects a Danger token that drifts from the official destructive Badge", async () => {
  const fixtureRoot = await createFixture();
  const tokenPath = path.join(fixtureRoot, "docs/product/ux/design-tokens.json");
  const tokens = JSON.parse(await readFile(tokenPath, "utf8"));
  tokens.color.semantic.danger = {
    foreground: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
  };
  await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`);

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("danger token")));
});

test("baseline rejects non-registry files inside components/ui", async () => {
  const fixtureRoot = await createFixture();
  const testPath = path.join(fixtureRoot, "apps/web/src/components/ui/button.test.tsx");
  await writeFile(testPath, "// project-owned test must live outside components/ui\n");

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("Registry-owned") && error.includes("button.test.tsx")));
});

test("baseline rejects manual router composition replacing the generated route tree", async () => {
  const fixtureRoot = await createFixture();
  await writeFile(path.join(fixtureRoot, "apps/web/src/router.tsx"), "export const router = {};\n");

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("generated routeTree.gen.ts")));
});

test("baseline rejects baseUrl in every Web TypeScript face", async () => {
  for (const relative of [
    "apps/web/tsconfig.json",
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
  ]) {
    const fixtureRoot = await createFixture();
    const configPath = path.join(fixtureRoot, relative);
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.compilerOptions.baseUrl = ".";
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

    const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
    assert.ok(errors.some(error => error.includes(relative) && error.includes("baseUrl")));
  }
});

test("baseline rejects missing Web aliases and root config inheritance", async () => {
  const fixtureRoot = await createFixture();
  const solutionPath = path.join(fixtureRoot, "apps/web/tsconfig.json");
  const solution = JSON.parse(await readFile(solutionPath, "utf8"));
  delete solution.compilerOptions.paths;
  await writeFile(solutionPath, `${JSON.stringify(solution, null, 2)}\n`);

  const nodePath = path.join(fixtureRoot, "apps/web/tsconfig.node.json");
  const node = JSON.parse(await readFile(nodePath, "utf8"));
  delete node.extends;
  await writeFile(nodePath, `${JSON.stringify(node, null, 2)}\n`);

  const errors = await collectToolchainBaselineViolations(fixtureRoot, baseline);
  assert.ok(errors.some(error => error.includes("tsconfig.json") && error.includes("@/*")));
  assert.ok(errors.some(error => error.includes("tsconfig.node.json") && error.includes("extend")));
});

async function createFixture() {
  const target = await mkdtemp(path.join(tmpdir(), "aigw-toolchain-baseline-"));
  const files = [
    "package.json",
    "pnpm-workspace.yaml",
    "eslint.config.ts",
    "apps/web/package.json",
    "apps/web/components.json",
    "docs/product/ux/design-tokens.json",
    "apps/web/src/index.css",
    "apps/web/tsconfig.json",
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "apps/web/vitest.config.ts",
    "apps/web/vite.config.ts",
    "apps/web/src/router.tsx",
    baseline.vite.router.generatedRouteTree,
    baseline.openapiClient.schema,
    "apps/web/src/test/setup.ts",
    "apps/web/src/hooks/use-mobile.test.ts",
    ...baseline.shadcn.components.map((component: string) => `apps/web/src/components/ui/${component}.tsx`),
    ...(baseline.shadcn.registryHooks ?? []).map((hook: string) => `apps/web/src/hooks/${hook}.ts`),
  ];
  for (const relative of files) {
    const destination = path.join(target, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, relative), destination);
  }
  return target;
}
