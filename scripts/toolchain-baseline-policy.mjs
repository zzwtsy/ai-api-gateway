import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Check the committed, network-independent toolchain contract.
 * This complements the official CLI probe, which runs after dependencies exist.
 *
 * @param {string} root
 * @param {object} baseline
 */
export async function collectToolchainBaselineViolations(root, baseline) {
  const errors = [];
  const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
  const readText = async (relative) => readFile(path.join(root, relative), "utf8");

  const rootManifest = await readJson("package.json");
  const webManifest = await readJson("apps/web/package.json");
  const components = await readJson("apps/web/components.json");
  const catalog = await readText("pnpm-workspace.yaml");
  const eslint = await readText("eslint.config.mjs");
  const vite = await readText("apps/web/vite.config.ts");
  const router = await readText("apps/web/src/router.tsx");
  const generatedRouteTree = await readText(baseline.vite.router.generatedRouteTree);
  const css = await readText("apps/web/src/index.css");
  const button = await readText("apps/web/src/components/ui/button.tsx");
  const input = await readText("apps/web/src/components/ui/input.tsx");
  const separator = await readText("apps/web/src/components/ui/separator.tsx");

  if (rootManifest.version !== baseline.projectVersion) {
    errors.push(`root version must equal ${baseline.projectVersion}`);
  }
  if (rootManifest.devDependencies?.typescript !== baseline.typescript.version) {
    errors.push(`TypeScript owner must pin ${baseline.typescript.version}`);
  }
  if (components.style !== baseline.shadcn.preset) {
    errors.push(`components.json style must be ${baseline.shadcn.preset}`);
  }
  if (components.rsc !== false || components.tsx !== true) {
    errors.push("components.json must describe a client-side TypeScript Vite project");
  }
  if (components.tailwind?.css !== "src/index.css"
    || components.tailwind?.baseColor !== "neutral"
    || components.tailwind?.cssVariables !== true) {
    errors.push("components.json must keep the neutral Tailwind v4 CSS-variable contract");
  }
  const expectedAliases = {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  };
  for (const [key, expected] of Object.entries(expectedAliases)) {
    if (components.aliases?.[key] !== expected) {
      errors.push(`components.json alias ${key} must be ${expected}`);
    }
  }
  if (components.tailwind?.config !== "") {
    errors.push("Tailwind v4 components.json must keep tailwind.config as an empty string");
  }
  if (components.iconLibrary !== baseline.shadcn.iconLibrary) {
    errors.push(`components.json iconLibrary must be ${baseline.shadcn.iconLibrary}`);
  }
  if (webManifest.dependencies?.["@base-ui/react"] !== "catalog:") {
    errors.push("apps/web must own @base-ui/react through the workspace catalog");
  }
  if (webManifest.devDependencies?.[baseline.vite.router.plugin] !== "catalog:") {
    errors.push(`apps/web must own ${baseline.vite.router.plugin} through the workspace catalog`);
  }
  for (const dependency of [baseline.openapiClient.transport, baseline.openapiClient.queryAdapter]) {
    if (webManifest.dependencies?.[dependency] !== "catalog:") {
      errors.push(`apps/web must own ${dependency} through the workspace catalog`);
    }
  }
  const radixDependencies = Object.keys({
    ...(webManifest.dependencies ?? {}),
    ...(webManifest.devDependencies ?? {}),
  }).filter((name) => name.startsWith("@radix-ui/"));
  if (radixDependencies.length > 0) {
    errors.push(`apps/web may not depend on Radix primitives: ${radixDependencies.join(", ")}`);
  }
  for (const [name, version] of [
    ["@base-ui/react", "1.7.0"],
    ["tailwind-merge", "3.6.0"],
    ["shadcn", baseline.shadcn.cliVersion],
    ["@antfu/eslint-config", baseline.eslint.version],
    [baseline.vite.router.plugin, baseline.vite.router.pluginVersion],
    [baseline.openapiClient.transport, "0.17.0"],
    [baseline.openapiClient.queryAdapter, "0.5.4"],
  ]) {
    if (!catalog.includes(`  '${name}': ${version}`) && !catalog.includes(`  ${name}: ${version}`)) {
      errors.push(`pnpm catalog must pin ${name}@${version}`);
    }
  }
  if (rootManifest.devDependencies?.["@antfu/eslint-config"] !== "catalog:") {
    errors.push("root ESLint baseline must use @antfu/eslint-config");
  }
  for (const legacy of ["@eslint/js", "globals", "typescript-eslint"]) {
    if (rootManifest.devDependencies?.[legacy] !== undefined) {
      errors.push(`root devDependencies must not retain the pre-wizard ESLint package ${legacy}`);
    }
  }
  if (!eslint.includes('from "@antfu/eslint-config"')) {
    errors.push("eslint.config.mjs must compose from @antfu/eslint-config");
  }
  if (!/react:\s*true/u.test(eslint) || !/a11y:\s*true/u.test(eslint)) {
    errors.push("Antfu ESLint config must enable React and JSX accessibility rules");
  }
  if (!vite.includes('from "@tanstack/router-plugin/vite"')) {
    errors.push("apps/web/vite.config.ts must use @tanstack/router-plugin/vite");
  }
  if (!/tanstackRouter\(\{[\s\S]*?autoCodeSplitting:\s*true/u.test(vite)) {
    errors.push("TanStack Router Vite plugin must enable autoCodeSplitting");
  }
  const routerPluginIndex = vite.indexOf("tanstackRouter(");
  const reactPluginIndex = vite.indexOf("react()");
  if (routerPluginIndex < 0 || reactPluginIndex < 0 || routerPluginIndex > reactPluginIndex) {
    errors.push("TanStack Router Vite plugin must run before the React plugin");
  }
  if (!router.includes('from "./routeTree.gen"')) {
    errors.push("apps/web/src/router.tsx must consume the generated routeTree.gen.ts");
  }
  if (!generatedRouteTree.includes("automatically generated by TanStack Router")
    || !generatedRouteTree.includes("NOT make any changes")) {
    errors.push(`${baseline.vite.router.generatedRouteTree} must remain a TanStack Router generated artifact`);
  }
  if (!eslint.includes('"apps/web/src/routeTree.gen.ts"')) {
    errors.push("eslint.config.mjs must ignore the generated TanStack route tree");
  }
  if (!button.includes('from "@base-ui/react/button"') || button.includes("asChild") || button.includes("Slot")) {
    errors.push("Button must use the Base UI primitive and may not expose the Radix asChild contract");
  }
  if (!input.includes('from "@base-ui/react/input"')) {
    errors.push("Input must use the Base UI primitive");
  }
  if (!separator.includes('from "@base-ui/react/separator"')) {
    errors.push("Separator must use the Base UI primitive");
  }
  if (!css.includes('@import "shadcn/tailwind.css"')) {
    errors.push("shadcn Tailwind v4 shared utilities import is missing");
  }
  if (!css.includes("#root") || !css.includes("isolation: isolate")) {
    errors.push("Base UI portal stacking requires #root isolation");
  }

  for (const relative of [
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "apps/web/vitest.config.ts",
    "apps/web/src/test/setup.ts",
    baseline.openapiClient.schema,
    baseline.vite.router.generatedRouteTree,
  ]) {
    try {
      await access(path.join(root, relative));
    } catch {
      errors.push(`missing official Vite/Web baseline file ${relative}`);
    }
  }

  const apiEntries = await readdir(path.join(root, "apps/web/src/api"), { withFileTypes: true });
  const allowedApiFiles = new Set([path.basename(baseline.openapiClient.schema)]);
  for (const entry of apiEntries) {
    if (!entry.isFile() || !allowedApiFiles.has(entry.name)) {
      errors.push(`apps/web/src/api is generated-only; unexpected entry ${entry.name}`);
    }
  }

  const uiEntries = await readdir(path.join(root, "apps/web/src/components/ui"), { withFileTypes: true });
  const allowedUiFiles = new Set(baseline.shadcn.components.map((component) => `${component}.tsx`));
  for (const entry of uiEntries) {
    if (!entry.isFile() || !allowedUiFiles.has(entry.name)) {
      errors.push(`apps/web/src/components/ui is shadcn Registry-owned; unexpected entry ${entry.name}`);
    }
  }

  for (const component of baseline.shadcn.components) {
    const relative = `apps/web/src/components/ui/${component}.tsx`;
    try {
      const source = await readText(relative);
      if (!source.includes('data-slot="') && !/slot:\s*["\']/.test(source)) {
        errors.push(`${relative} does not expose a shadcn data-slot contract`);
      }
      const expectedDigest = baseline.shadcn.componentDigests?.[component];
      const actualDigest = createHash("sha256").update(source).digest("hex");
      if (expectedDigest !== actualDigest) {
        errors.push(`${relative} changed without updating the reviewed shadcn component digest`);
      }
    } catch {
      errors.push(`missing declared shadcn component ${relative}`);
    }
  }

  return errors;
}
