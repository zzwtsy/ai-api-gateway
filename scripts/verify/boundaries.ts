import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const gatewayRoot = path.join(root, "apps/gateway/src");
const webRoot = path.join(root, "apps/web/src");
const gatewayFiles = await findTypeScript(gatewayRoot, { includeTsx: false, includeTests: false });
const webFiles = await findTypeScript(webRoot, { includeTsx: true, includeTests: false });
const failures: string[] = [];
const importPattern = /\bfrom\s*["']([^"']+)["']|^\s*(?:import|export)\s*["']([^"']+)["']/gmu;

const allowedGatewayLayers: Readonly<Record<string, ReadonlySet<string>>> = {
  "app": new Set(["app", "control-plane", "data-plane", "core", "db", "config"]),
  "control-plane": new Set(["control-plane", "core", "db", "config"]),
  "data-plane": new Set(["data-plane", "core", "db", "config"]),
  "core": new Set(["core", "config"]),
  "db": new Set(["db", "core", "config"]),
  "config": new Set(["config"]),
  "commands": new Set(["app", "control-plane", "data-plane", "core", "db", "config", "commands"]),
  "entry": new Set(["app"]),
};

for (const file of gatewayFiles) {
  const relative = relativePath(gatewayRoot, file);
  const fromLayer = relative === "index.ts" ? "entry" : relative.split("/")[0] ?? "";
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined || !specifier.startsWith("."))
      continue;
    const resolved = path.normalize(path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts")));
    if (!resolved.startsWith(gatewayRoot))
      continue;
    const targetRelative = relativePath(gatewayRoot, resolved);
    const targetLayer = targetRelative.split("/")[0] ?? "";
    if (allowedGatewayLayers[fromLayer]?.has(targetLayer) !== true) {
      failures.push(`${relative} may not import ${targetRelative}`);
    }
    checkControlFeatureIsolation(relative, targetRelative, failures);
  }

  if (fromLayer === "data-plane") {
    for (const token of ["Response.clone(", ".tee(", "streamSSE("]) {
      if (source.includes(token))
        failures.push(`${relative} contains forbidden data-plane token ${token}`);
    }
    if (/from\s+["'](?:openai|@anthropic-ai\/sdk|ai)["']/.test(source)) {
      failures.push(`${relative} imports a provider or orchestration SDK on the transparent path`);
    }
  }
}

for (const file of webFiles) {
  const relative = relativePath(webRoot, file);
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined)
      continue;
    const resolved = await resolveWebImport(file, specifier);
    if (resolved === null || !resolved.startsWith(webRoot))
      continue;
    const targetRelative = relativePath(webRoot, resolved);
    checkWebBoundary(relative, targetRelative, failures);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`boundaries passed (${gatewayFiles.length} gateway + ${webFiles.length} web source files)\n`);
}

function checkControlFeatureIsolation(from: string, target: string, output: string[]): void {
  const expression = /^control-plane\/features\/([^/]+)\//;
  const fromFeature = expression.exec(from)?.[1];
  const targetFeature = expression.exec(target)?.[1];
  if (fromFeature !== undefined && targetFeature !== undefined && fromFeature !== targetFeature) {
    output.push(`${from} may not import control-plane feature ${targetFeature}`);
  }
}

function checkWebBoundary(from: string, target: string, output: string[]): void {
  const featureExpression = /^features\/([^/]+)\//;
  const fromFeature = featureExpression.exec(from)?.[1];
  const targetFeature = featureExpression.exec(target)?.[1];
  if (fromFeature !== undefined && targetFeature !== undefined && fromFeature !== targetFeature) {
    output.push(`${from} may not import web feature ${targetFeature}`);
  }

  const fromLayer = from.split("/")[0] ?? "";
  const targetLayer = target.split("/")[0] ?? "";
  if (["api", "components", "lib"].includes(fromLayer) && ["features", "routes"].includes(targetLayer)) {
    output.push(`${from} may not depend on higher-level web module ${target}`);
  }
}

async function resolveWebImport(fromFile: string, specifier: string): Promise<string | null> {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = path.join(webRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return path.normalize(candidate);
    } catch {
      // The import verifier owns missing-path diagnostics.
    }
  }
  return path.normalize(base);
}

function relativePath(base: string, file: string): string {
  return path.relative(base, file).replaceAll(path.sep, "/");
}

async function findTypeScript(
  directory: string,
  options: { includeTsx: boolean; includeTests: boolean },
): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findTypeScript(fullPath, options));
      continue;
    }
    const matchesExtension = entry.name.endsWith(".ts") || (options.includeTsx && entry.name.endsWith(".tsx"));
    const isTest = /\.(?:test|spec)\.[^.]+$/.test(entry.name);
    if (matchesExtension && (options.includeTests || !isTest))
      results.push(fullPath);
  }
  return results;
}
