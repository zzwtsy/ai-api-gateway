import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pageManifest } from "../../apps/web/src/routes/-page-manifest.ts";

import { resolveSourceCommit } from "./source-identity.ts";

interface SpecBundle {
  id: string;
  title: string;
  output: string;
  sources: string[];
}

interface PackageManifest {
  version: string;
}

interface SpecBundleManifest {
  bundles?: SpecBundle[];
}

export interface BuildSpecBundlesOptions {
  repositoryRoot: string;
  outputDirectory: string;
  checkOnly: boolean;
  sourceCommit?: string;
}

export interface SpecBundleResult {
  outputPath: string;
  sourceCount: number;
}

export async function buildSpecBundles(options: BuildSpecBundlesOptions): Promise<SpecBundleResult[]> {
  const { repositoryRoot, outputDirectory, checkOnly } = options;
  const packageManifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  ) as PackageManifest;
  const bundleManifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "docs/spec-bundles.json"), "utf8"),
  ) as SpecBundleManifest;
  const commit = options.sourceCommit ?? await resolveSourceCommit(repositoryRoot);
  const seenOutputs = new Set<string>();
  const results: SpecBundleResult[] = [];

  if (!checkOnly)
    await mkdir(outputDirectory, { recursive: true });

  for (const bundle of bundleManifest.bundles ?? []) {
    validateBundle(bundle, seenOutputs);
    const outputPath = path.join(outputDirectory, bundle.output);
    const body = await buildBundle(bundle, outputPath, repositoryRoot, packageManifest.version, commit);
    if (!checkOnly)
      await writeFile(outputPath, body, "utf8");
    results.push({ outputPath, sourceCount: bundle.sources.length });
  }

  return results;
}

async function buildBundle(
  bundle: SpecBundle,
  outputPath: string,
  repositoryRoot: string,
  version: string,
  commit: string,
): Promise<string> {
  const sections: string[] = [];
  for (const sourcePath of bundle.sources) {
    const absolute = path.join(repositoryRoot, sourcePath);
    const raw = await readFile(absolute, "utf8");
    const content = rewriteLocalLinks(stripFrontmatter(raw), absolute, outputPath, repositoryRoot).trim();
    if (content.length === 0)
      throw new Error(`Empty bundle source: ${sourcePath}`);
    sections.push(`<!-- SOURCE: ${sourcePath} -->\n\n${content}`);
  }
  const header = [
    "<!-- GENERATED FILE. DO NOT EDIT. -->",
    `<!-- Sources: docs/spec-bundles.json#${bundle.id} -->`,
    "",
    `# ${bundle.title}`,
    "",
    `> 项目版本：${version}  `,
    `> Git Commit：${commit}  `,
    "> 默认语言：简体中文（zh-CN）  ",
    "> 维护方式：修改模块化源文档后运行 `pnpm docs:bundle`，禁止直接修改本文件。",
    "",
  ].join("\n");
  const deliveredPages = bundle.sources.includes("docs/product/ux/README.md")
    ? renderDeliveredPages()
    : "";
  return `${header}${deliveredPages}${sections.join("\n\n---\n\n")}\n`;
}

function renderDeliveredPages(): string {
  const pages = pageManifest
    .map(page => `- ${page.label}（\`${page.path}\`，${page.navGroup}）`)
    .join("\n");
  return [
    "## 当前已交付导航页面",
    "",
    "本节由 `apps/web/src/routes/-page-manifest.ts` 生成；生成路由一致性由 `pnpm verify:web-contracts` 校验。目标页面和页内能力仍以本规范与机器合同为准。",
    "",
    pages,
    "",
    "---",
    "",
  ].join("\n");
}

function validateBundle(bundle: SpecBundle, seenOutputs: Set<string>): void {
  if (typeof bundle.id !== "string" || typeof bundle.title !== "string" || typeof bundle.output !== "string") {
    throw new TypeError("Invalid docs/spec-bundles.json entry");
  }
  if (!Array.isArray(bundle.sources) || bundle.sources.length === 0)
    throw new Error(`Bundle ${bundle.id} has no sources`);
  if (!bundle.output.endsWith(".md") || path.basename(bundle.output) !== bundle.output)
    throw new Error(`Bundle ${bundle.id} output must be a Markdown filename`);
  if (seenOutputs.has(bundle.output))
    throw new Error(`Duplicate bundle output: ${bundle.output}`);
  seenOutputs.add(bundle.output);
  const sourceSet = new Set(bundle.sources);
  if (sourceSet.size !== bundle.sources.length)
    throw new Error(`Bundle ${bundle.id} contains duplicate sources`);
}

function stripFrontmatter(text: string): string {
  if (!text.startsWith("---\n"))
    return text;
  const end = text.indexOf("\n---\n", 4);
  return end === -1 ? text : text.slice(end + 5).replace(/^\n+/, "");
}

function rewriteLocalLinks(text: string, sourceFile: string, outputFile: string, repositoryRoot: string): string {
  return text.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (whole: string, prefix: string, rawTarget: string, suffix: string) => {
    const target = rawTarget.trim();
    if (/^(?:#|https?:|mailto:|data:)/.test(target) || target.includes(" \"") || target.includes(" '"))
      return whole;
    const [pathname = "", anchor] = target.split("#", 2);
    const resolved = path.resolve(path.dirname(sourceFile), decodeURIComponent(pathname));
    const relativeToRoot = path.relative(repositoryRoot, resolved);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot))
      return whole;
    const rewritten = path.relative(path.dirname(outputFile), resolved).replaceAll(path.sep, "/");
    return `${prefix}${rewritten}${anchor === undefined ? "" : `#${anchor}`}${suffix}`;
  });
}
