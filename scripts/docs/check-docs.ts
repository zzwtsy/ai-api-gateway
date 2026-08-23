import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { collectProjectVersionViolations } from "../project-version-policy.ts";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const failures: string[] = [];
const requiredChineseEntries: string[] = [
  "README.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "docs/README.md",
  "docs/conventions/language-and-localization.md",
  "docs/conventions/documentation-system.md",
  "apps/gateway/AGENTS.md",
  "apps/gateway/src/control-plane/AGENTS.md",
  "apps/gateway/src/data-plane/AGENTS.md",
  "apps/web/AGENTS.md",
  "apps/e2e/AGENTS.md",
];

for (const relative of requiredChineseEntries) {
  const absolute = path.join(root, relative);
  try {
    const content = await readFile(absolute, "utf8");
    if (!/[\u3400-\u9FFF]/u.test(content))
      failures.push(`${relative} does not contain Chinese-first content`);
  } catch {
    failures.push(`missing required Chinese entry: ${relative}`);
  }
}

const markdownFiles = await findFiles(root, name => name.endsWith(".md"));
for (const file of markdownFiles) {
  const source = await readFile(file, "utf8");
  const relative = rel(file);
  if (relative.startsWith("docs/") && !source.startsWith("---\n")) {
    failures.push(`${relative} is missing frontmatter`);
  }
  if (relative.startsWith("docs/") && !source.includes("language: zh-CN")) {
    failures.push(`${relative} is missing language: zh-CN`);
  }
  if (!relative.startsWith("docs/decisions/superseded/") && source.includes("/api/admin/v1")) {
    failures.push(`${relative} uses obsolete control-plane base path /api/admin/v1`);
  }
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]?.trim();
    if (raw === undefined || /^(?:#|https?:|mailto:|data:)/.test(raw) || raw.includes(" \"") || raw.includes(" '"))
      continue;
    const pathname = raw.split("#", 1)[0] ?? "";
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(pathname));
    try {
      await access(resolved);
    } catch {
      failures.push(`${relative} links missing ${raw}`);
    }
  }
}

const forbiddenRootFiles = [
  "PROJECT_ARCHITECTURE.md",
  "AI_API_GATEWAY_DESIGN.md",
  "AI_API_GATEWAY_ENGINEERING_SPEC.md",
  "AI_API_GATEWAY_FRONTEND_DESIGN.md",
];
for (const name of forbiddenRootFiles) {
  try {
    await access(path.join(root, name));
    failures.push(`obsolete root specification file exists: ${name}`);
  } catch {
    // expected
  }
}

const docsRootEntries = await readdir(path.join(root, "docs"), { withFileTypes: true });
for (const entry of docsRootEntries) {
  if (entry.isFile() && /^\d{2}-/.test(entry.name))
    failures.push(`legacy numbered document remains active: docs/${entry.name}`);
}

const packageManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageManifest.name !== "ai-api-gateway")
  failures.push(`root package name must be ai-api-gateway`);
failures.push(...await collectProjectVersionViolations(root));

const applicationSource = await readFile(path.join(root, "apps/gateway/src/app/create-application.ts"), "utf8");
const controlPlaneBasePath = applicationSource.match(/app\.route\("([^"]+)",\s*createControlPlane\(\)\)/u)?.[1];
if (controlPlaneBasePath === undefined) {
  failures.push("cannot resolve control-plane base path from create-application.ts");
} else {
  const controlApiDoc = await readFile(path.join(root, "docs/conventions/control-plane-api.md"), "utf8");
  if (!controlApiDoc.includes(`Base Path：\`${controlPlaneBasePath}\``)) {
    failures.push(`control-plane API documentation does not use source base path ${controlPlaneBasePath}`);
  }
  const outline = await readFile(path.join(root, "docs/references/openapi-outline.yaml"), "utf8");
  if (!outline.includes(`- url: ${controlPlaneBasePath}`)) {
    failures.push(`OpenAPI outline does not use source base path ${controlPlaneBasePath}`);
  }
}
if (packageManifest.devDependencies?.typescript !== "6.0.3")
  failures.push("TypeScript must remain exactly 6.0.3");

const bundleManifest = JSON.parse(await readFile(path.join(root, "docs/spec-bundles.json"), "utf8"));
const outputs = new Set<string>();
for (const bundle of bundleManifest.bundles ?? []) {
  if (outputs.has(bundle.output))
    failures.push(`duplicate spec output: ${bundle.output}`);
  outputs.add(bundle.output);
  const sources = new Set();
  for (const source of bundle.sources ?? []) {
    if (sources.has(source))
      failures.push(`duplicate source in ${bundle.id}: ${source}`);
    sources.add(source);
    try {
      await access(path.join(root, source));
    } catch {
      failures.push(`bundle ${bundle.id} references missing source: ${source}`);
    }
  }
}

const uxReadme = await readFile(path.join(root, "docs/product/ux/README.md"), "utf8");
if (/规范版本：v0\.3\.0/.test(uxReadme))
  failures.push("UX README still owns an obsolete independent version");

try {
  await execFileAsync(process.execPath, ["scripts/docs/bundle-spec.ts", "--check"], { cwd: root, encoding: "utf8" });
} catch (error) {
  failures.push(`spec bundle check failed: ${error instanceof Error ? error.message : String(error)}`);
}

for (const [label, script] of [
  ["module graph", "scripts/docs/generate-module-graph.ts"],
  ["Decision Notes", "scripts/verify/decision-notes.ts"],
] satisfies readonly (readonly [string, string])[]) {
  try {
    const args = script.includes("generate-module-graph") ? [script, "--check"] : [script];
    await execFileAsync(process.execPath, args, { cwd: root, encoding: "utf8" });
  } catch (error) {
    failures.push(`${label} check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`docs-check passed (${markdownFiles.length} Markdown files, ${outputs.size} generated projections)\n`);
}

async function findFiles(directory: string, predicate: (name: string) => boolean): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "coverage", ".artifacts", "test-results", "playwright-report"].includes(entry.name))
      continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory())
      results.push(...await findFiles(absolute, predicate));
    else if (predicate(entry.name))
      results.push(absolute);
  }
  return results;
}

function rel(file: string): string {
  return path.relative(root, file).replaceAll(path.sep, "/");
}
