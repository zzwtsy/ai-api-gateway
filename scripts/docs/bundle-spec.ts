import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

import { resolveSourceCommit } from "./source-identity.ts";

const root = path.resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  args: process.argv.slice(2),
  strict: true,
  options: {
    "check": { type: "boolean", default: false },
    "output-dir": { type: "string" },
  },
});
const outputDirectory = values["output-dir"] === undefined
  ? path.join(root, ".artifacts/spec")
  : path.resolve(root, values["output-dir"]);
const checkOnly = values.check;

const packageManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const bundleManifest = JSON.parse(await readFile(path.join(root, "docs/spec-bundles.json"), "utf8"));
const commit = await resolveSourceCommit(root);
const seenOutputs = new Set();

interface SpecBundle {
  id: string;
  title: string;
  output: string;
  sources: string[];
}

if (!checkOnly)
  await mkdir(outputDirectory, { recursive: true });

for (const bundle of bundleManifest.bundles ?? [] as SpecBundle[]) {
  validateBundle(bundle);
  const outputPath = path.join(outputDirectory, bundle.output);
  const body = await buildBundle(bundle, outputPath);
  if (checkOnly) {
    let current;
    try {
      current = await readFile(outputPath, "utf8");
    } catch {
      throw new Error(`Missing generated specification: ${path.relative(root, outputPath)}. Run pnpm docs:bundle.`);
    }
    if (current !== body) {
      throw new Error(`Stale generated specification: ${path.relative(root, outputPath)}. Run pnpm docs:bundle.`);
    }
  } else {
    await writeFile(outputPath, body, "utf8");
  }
  process.stdout.write(`${checkOnly ? "checked" : "generated"}: ${path.relative(root, outputPath)} (${bundle.sources.length} sources)\n`);
}

async function buildBundle(bundle: SpecBundle, outputPath: string): Promise<string> {
  const sections: string[] = [];
  for (const sourcePath of bundle.sources) {
    const absolute = path.join(root, sourcePath);
    const raw = await readFile(absolute, "utf8");
    const content = rewriteLocalLinks(stripFrontmatter(raw), absolute, outputPath).trim();
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
    `> 项目版本：${packageManifest.version}  `,
    `> Git Commit：${commit}  `,
    "> 默认语言：简体中文（zh-CN）  ",
    "> 维护方式：修改模块化源文档后运行 `pnpm docs:bundle`，禁止直接修改本文件。",
    "",
  ].join("\n");
  return `${header}${sections.join("\n\n---\n\n")}\n`;
}

function validateBundle(bundle: SpecBundle): void {
  if (typeof bundle.id !== "string" || typeof bundle.title !== "string" || typeof bundle.output !== "string") {
    throw new TypeError("Invalid docs/spec-bundles.json entry");
  }
  if (!Array.isArray(bundle.sources) || bundle.sources.length === 0) {
    throw new Error(`Bundle ${bundle.id} has no sources`);
  }
  if (!bundle.output.endsWith(".md") || path.basename(bundle.output) !== bundle.output) {
    throw new Error(`Bundle ${bundle.id} output must be a Markdown filename`);
  }
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

function rewriteLocalLinks(text: string, sourceFile: string, outputFile: string): string {
  return text.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (whole: string, prefix: string, rawTarget: string, suffix: string) => {
    const target = rawTarget.trim();
    if (/^(?:#|https?:|mailto:|data:)/.test(target) || target.includes(" \"") || target.includes(" '"))
      return whole;
    const [pathname = "", anchor] = target.split("#", 2);
    const resolved = path.resolve(path.dirname(sourceFile), decodeURIComponent(pathname));
    const relativeToRoot = path.relative(root, resolved);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot))
      return whole;
    const rewritten = path.relative(path.dirname(outputFile), resolved).replaceAll(path.sep, "/");
    return `${prefix}${rewritten}${anchor === undefined ? "" : `#${anchor}`}${suffix}`;
  });
}
