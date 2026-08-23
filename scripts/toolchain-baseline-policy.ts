import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

interface ToolchainBaseline {
  projectVersion: string;
  typescript: { version: string };
  shadcn: {
    cliVersion: string;
    preset: string;
    iconLibrary: string;
    components: string[];
    registryHooks?: string[];
    localPatches?: Record<string, unknown>;
    componentDigests?: Record<string, string>;
    hookDigests?: Record<string, string>;
    sourcePolicy: { components: string; hooks: string };
    theme: { primary: string; fontPackage: string };
  };
  eslint: { version: string };
  vite: {
    router: {
      plugin: string;
      pluginVersion: string;
      generatedRouteTree: string;
    };
  };
  openapiClient: { schema: string; transport: string; queryAdapter: string };
}

interface PackageManifest {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface ComponentManifest {
  style?: string;
  rsc?: boolean;
  tsx?: boolean;
  iconLibrary?: string;
  aliases?: Record<string, string>;
  tailwind?: { css?: string; baseColor?: string; cssVariables?: boolean; config?: string };
}

interface TypeScriptConfig {
  extends?: string;
  compilerOptions?: { baseUrl?: unknown; paths?: Record<string, string[]> };
}

interface BaselineSnapshot {
  rootManifest: PackageManifest;
  webManifest: PackageManifest;
  components: ComponentManifest;
  designTokens: { color?: { semantic?: { danger?: { foreground?: unknown; background?: unknown; border?: unknown } }; destructive?: unknown } };
  webTypeScriptConfigs: [string, TypeScriptConfig][];
  catalog: string;
  eslint: string;
  vite: string;
  router: string;
  generatedRouteTree: string;
  css: string;
  button: string;
  input: string;
  separator: string;
}

/**
 * 检查已提交且不依赖网络的工具链合同，补充依赖安装后的官方 CLI 探针。
 *
 * @returns 违规信息列表。
 */
export async function collectToolchainBaselineViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  const snapshot = await readBaselineSnapshot(root, baseline);
  return [
    ...collectToolchainConfigViolations(snapshot, baseline),
    ...collectDependencyViolations(snapshot, baseline),
    ...collectLintAndRuntimeViolations(snapshot, baseline),
    ...collectThemeViolations(snapshot, baseline),
    ...await collectRequiredFileViolations(root, baseline),
    ...await collectDirectoryOwnershipViolations(root, baseline),
    ...await collectRegistrySourceViolations(root, baseline),
  ];
}

async function readBaselineSnapshot(root: string, baseline: ToolchainBaseline): Promise<BaselineSnapshot> {
  const readJson = async <T>(relative: string): Promise<T> => JSON.parse(await readFile(path.join(root, relative), "utf8")) as T;
  const readText = async (relative: string): Promise<string> => readFile(path.join(root, relative), "utf8");
  const webTypeScriptConfigs = await Promise.all([
    "apps/web/tsconfig.json",
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
  ].map(async relative => [relative, await readJson<TypeScriptConfig>(relative)] as [string, TypeScriptConfig]));

  return {
    rootManifest: await readJson<PackageManifest>("package.json"),
    webManifest: await readJson<PackageManifest>("apps/web/package.json"),
    components: await readJson<ComponentManifest>("apps/web/components.json"),
    designTokens: await readJson<BaselineSnapshot["designTokens"]>("docs/product/ux/design-tokens.json"),
    webTypeScriptConfigs,
    catalog: await readText("pnpm-workspace.yaml"),
    eslint: await readText("eslint.config.ts"),
    vite: await readText("apps/web/vite.config.ts"),
    router: await readText("apps/web/src/router.tsx"),
    generatedRouteTree: await readText(baseline.vite.router.generatedRouteTree),
    css: await readText("apps/web/src/index.css"),
    button: await readText("apps/web/src/components/ui/button.tsx"),
    input: await readText("apps/web/src/components/ui/input.tsx"),
    separator: await readText("apps/web/src/components/ui/separator.tsx"),
  };
}

function collectToolchainConfigViolations(snapshot: BaselineSnapshot, baseline: ToolchainBaseline): string[] {
  return [
    ...collectProjectIdentityViolations(snapshot.rootManifest, baseline),
    ...collectComponentManifestViolations(snapshot.components, baseline),
  ];
}

function collectProjectIdentityViolations(rootManifest: PackageManifest, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
  if (rootManifest.version !== baseline.projectVersion) {
    errors.push(`root version must equal ${baseline.projectVersion}`);
  }
  if (rootManifest.devDependencies?.typescript !== baseline.typescript.version) {
    errors.push(`TypeScript owner must pin ${baseline.typescript.version}`);
  }
  return errors;
}

function collectComponentManifestViolations(components: ComponentManifest, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
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
  if (baseline.shadcn.sourcePolicy.components !== "upstream-exact"
    || baseline.shadcn.sourcePolicy.hooks !== "linted-functional-equivalence"
    || Object.keys(baseline.shadcn.localPatches ?? {}).length > 0) {
    errors.push("shadcn components must remain upstream-exact while hooks remain linted and behavior-tested");
  }
  return errors;
}

function collectDependencyViolations(snapshot: BaselineSnapshot, baseline: ToolchainBaseline): string[] {
  return [
    ...collectWebDependencyViolations(snapshot.webManifest, baseline),
    ...collectRepositoryDependencyViolations(snapshot.catalog, snapshot.rootManifest, baseline),
  ];
}

function collectWebDependencyViolations(webManifest: PackageManifest, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
  if (webManifest.dependencies?.["@base-ui/react"] !== "catalog:") {
    errors.push("apps/web must own @base-ui/react through the workspace catalog");
  }
  if (webManifest.dependencies?.[baseline.shadcn.theme.fontPackage] !== "catalog:") {
    errors.push(`apps/web must own ${baseline.shadcn.theme.fontPackage} through the workspace catalog`);
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
  }).filter(name => name.startsWith("@radix-ui/"));
  if (radixDependencies.length > 0) {
    errors.push(`apps/web may not depend on Radix primitives: ${radixDependencies.join(", ")}`);
  }
  return errors;
}

function collectRepositoryDependencyViolations(catalog: string, rootManifest: PackageManifest, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
  for (const [name, version] of expectedCatalogVersions(baseline)) {
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
  return errors;
}

function expectedCatalogVersions(baseline: ToolchainBaseline): [string, string][] {
  return [
    ["@base-ui/react", "1.7.0"],
    ["tailwind-merge", "3.6.0"],
    ["shadcn", baseline.shadcn.cliVersion],
    ["@antfu/eslint-config", baseline.eslint.version],
    [baseline.vite.router.plugin, baseline.vite.router.pluginVersion],
    [baseline.openapiClient.transport, "0.17.0"],
    [baseline.openapiClient.queryAdapter, "0.5.4"],
  ];
}

function collectLintAndRuntimeViolations(snapshot: BaselineSnapshot, baseline: ToolchainBaseline): string[] {
  return [
    ...collectEslintViolations(snapshot.eslint),
    ...collectWebTypeScriptConfigViolations(snapshot.webTypeScriptConfigs),
    ...collectRouterViolations(snapshot, baseline),
    ...collectPrimitiveViolations(snapshot),
  ];
}

function collectEslintViolations(eslint: string): string[] {
  const errors: string[] = [];
  if (!eslint.includes("from \"@antfu/eslint-config\"")) {
    errors.push("eslint.config.ts must compose from @antfu/eslint-config");
  }
  if (!/react:\s*true/u.test(eslint) || !/a11y:\s*true/u.test(eslint)) {
    errors.push("Antfu ESLint config must enable React and JSX accessibility rules");
  }
  if (!/formatters:\s*false/u.test(eslint)) {
    errors.push("Antfu ESLint formatters must remain disabled");
  }
  if (!eslint.includes("\"apps/web/src/components/ui/**\"")) {
    errors.push("ESLint must completely ignore shadcn Registry-owned source");
  }
  if (eslint.includes("\"apps/web/src/hooks/use-mobile.ts\"")) {
    errors.push("ESLint must lint the generated use-mobile hook");
  }
  if (!eslint.includes("\"apps/web/src/routeTree.gen.ts\"")) {
    errors.push("eslint.config.ts must ignore the generated TanStack route tree");
  }
  return errors;
}

function collectRouterViolations(snapshot: BaselineSnapshot, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
  const { generatedRouteTree, router, vite } = snapshot;
  if (!vite.includes("from \"@tanstack/router-plugin/vite\"")) {
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
  if (!router.includes("from \"./routeTree.gen\"")) {
    errors.push("apps/web/src/router.tsx must consume the generated routeTree.gen.ts");
  }
  if (!generatedRouteTree.includes("automatically generated by TanStack Router")
    || !generatedRouteTree.includes("NOT make any changes")) {
    errors.push(`${baseline.vite.router.generatedRouteTree} must remain a TanStack Router generated artifact`);
  }
  return errors;
}

function collectPrimitiveViolations(snapshot: BaselineSnapshot): string[] {
  const errors: string[] = [];
  if (!snapshot.button.includes("from \"@base-ui/react/button\"")
    || snapshot.button.includes("asChild")
    || snapshot.button.includes("Slot")) {
    errors.push("Button must use the Base UI primitive and may not expose the Radix asChild contract");
  }
  if (!snapshot.input.includes("from \"@base-ui/react/input\"")) {
    errors.push("Input must use the Base UI primitive");
  }
  if (!snapshot.separator.includes("from \"@base-ui/react/separator\"")) {
    errors.push("Separator must use the Base UI primitive");
  }
  return errors;
}

function collectThemeViolations(snapshot: BaselineSnapshot, baseline: ToolchainBaseline): string[] {
  const errors: string[] = [];
  const { css, designTokens } = snapshot;
  if (!css.includes("@import \"shadcn/tailwind.css\"")) {
    errors.push("shadcn Tailwind v4 shared utilities import is missing");
  }
  if (!css.includes(`@import "${baseline.shadcn.theme.fontPackage}"`)) {
    errors.push(`shadcn theme must import ${baseline.shadcn.theme.fontPackage}`);
  }
  if (baseline.shadcn.theme.primary !== "blue"
    || !css.includes("--primary: oklch(0.488 0.243 264.376)")) {
    errors.push("shadcn theme must keep the reviewed Blue primary token");
  }
  const danger = designTokens.color?.semantic?.danger;
  if (danger?.foreground !== designTokens.color?.destructive
    || danger?.background !== "oklch(0.577 0.245 27.325 / 10%)"
    || danger?.border !== "transparent"
    || !css.includes("--destructive: oklch(0.577 0.245 27.325)")) {
    errors.push("UX danger token must map exactly to the official light destructive Badge treatment");
  }
  return errors;
}

async function collectRequiredFileViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  const errors: string[] = [];
  for (const relative of [
    "apps/web/tsconfig.app.json",
    "apps/web/tsconfig.node.json",
    "apps/web/vitest.config.ts",
    "apps/web/src/test/setup.ts",
    "apps/web/src/hooks/use-mobile.test.ts",
    baseline.openapiClient.schema,
    baseline.vite.router.generatedRouteTree,
  ]) {
    try {
      await access(path.join(root, relative));
    } catch {
      errors.push(`missing official Vite/Web baseline file ${relative}`);
    }
  }
  return errors;
}

async function collectDirectoryOwnershipViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  const errors: string[] = [];
  const apiEntries = await readdir(path.join(root, "apps/web/src/api"), { withFileTypes: true });
  const allowedApiFiles = new Set([path.basename(baseline.openapiClient.schema)]);
  for (const entry of apiEntries) {
    if (!entry.isFile() || !allowedApiFiles.has(entry.name)) {
      errors.push(`apps/web/src/api is generated-only; unexpected entry ${entry.name}`);
    }
  }

  const uiEntries = await readdir(path.join(root, "apps/web/src/components/ui"), { withFileTypes: true });
  const allowedUiFiles = new Set(baseline.shadcn.components.map(component => `${component}.tsx`));
  for (const entry of uiEntries) {
    if (!entry.isFile() || !allowedUiFiles.has(entry.name)) {
      errors.push(`apps/web/src/components/ui is shadcn Registry-owned; unexpected entry ${entry.name}`);
    }
  }
  return errors;
}

async function collectRegistrySourceViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  return [
    ...await collectComponentSourceViolations(root, baseline),
    ...await collectHookSourceViolations(root, baseline),
  ];
}

async function collectComponentSourceViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  const errors: string[] = [];
  for (const component of baseline.shadcn.components) {
    const relative = `apps/web/src/components/ui/${component}.tsx`;
    try {
      const source = await readFile(path.join(root, relative), "utf8");
      if (!source.includes("data-slot=\"") && !/slot:\s*["']/.test(source)) {
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

async function collectHookSourceViolations(root: string, baseline: ToolchainBaseline): Promise<string[]> {
  const errors: string[] = [];
  for (const hook of baseline.shadcn.registryHooks ?? []) {
    const relative = `apps/web/src/hooks/${hook}.ts`;
    try {
      const source = await readFile(path.join(root, relative), "utf8");
      const expectedDigest = baseline.shadcn.hookDigests?.[hook];
      const actualDigest = createHash("sha256").update(source).digest("hex");
      if (expectedDigest !== actualDigest) {
        errors.push(`${relative} changed without updating the reviewed shadcn hook digest`);
      }
    } catch {
      errors.push(`missing declared shadcn hook ${relative}`);
    }
  }
  return errors;
}

function collectWebTypeScriptConfigViolations(configEntries: [string, TypeScriptConfig][]): string[] {
  const errors: string[] = [];
  for (const [relative, config] of configEntries) {
    if (config.compilerOptions?.baseUrl !== undefined) {
      errors.push(`${relative} must not use the TypeScript 7 deprecated baseUrl option`);
    }
    const aliases = config.compilerOptions?.paths?.["@/*"];
    if (aliases?.length !== 1 || aliases[0] !== "./src/*") {
      errors.push(`${relative} must explicitly keep @/* mapped to ./src/*`);
    }
  }

  for (const [relative, config] of configEntries.slice(1)) {
    if (config.extends !== "../../tsconfig.base.json") {
      errors.push(`${relative} must extend the root tsconfig.base.json`);
    }
  }
  return errors;
}
