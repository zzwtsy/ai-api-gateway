import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const outputPath = path.join(root, "docs/architecture/generated-module-graph.md");
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;

export async function buildModuleGraphDocument(repositoryRoot = root) {
  const sections = [];
  sections.push(await renderGraph({
    root: repositoryRoot,
    sourceRoot: path.join(repositoryRoot, "apps/gateway/src"),
    title: "Gateway 模块依赖",
    classify: classifyGateway,
    includeTsx: false,
  }));
  sections.push(await renderGraph({
    root: repositoryRoot,
    sourceRoot: path.join(repositoryRoot, "apps/web/src"),
    title: "Web 模块依赖",
    classify: classifyWeb,
    includeTsx: true,
  }));

  return [
    "---",
    "status: generated",
    "last_reviewed_at: 2026-08-23",
    "language: zh-CN",
    "---",
    "",
    "<!-- GENERATED FILE. DO NOT EDIT. -->",
    "<!-- Source: current TypeScript import graph. Run `pnpm docs:module-graph`. -->",
    "",
    "# 当前模块依赖图",
    "",
    "本文件由生产源码中的静态 Import 自动生成，用于发现实际依赖方向与架构文档漂移。它描述当前事实，不替代 `eslint-plugin-boundaries` 的允许矩阵。",
    "",
    ...sections,
    "",
  ].join("\n");
}

async function renderGraph(options) {
  const files = await findSourceFiles(options.sourceRoot, options.includeTsx);
  const nodes = new Set();
  const edges = new Map();
  for (const file of files) {
    const from = options.classify(relative(options.sourceRoot, file));
    if (from === null) continue;
    nodes.add(from);
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (specifier === undefined || (!specifier.startsWith(".") && !specifier.startsWith("@/"))) continue;
      const target = await resolveImport(file, specifier, options.sourceRoot);
      if (target === null || !target.startsWith(options.sourceRoot)) continue;
      const to = options.classify(relative(options.sourceRoot, target));
      if (to === null) continue;
      nodes.add(to);
      if (from === to) continue;
      const key = `${from}\u0000${to}`;
      const samples = edges.get(key) ?? [];
      samples.push(`${relative(options.root, file)} → ${relative(options.root, target)}`);
      edges.set(key, samples);
    }
  }

  const sortedNodes = [...nodes].sort();
  const sortedEdges = [...edges.entries()]
    .map(([key, samples]) => {
      const [from, to] = key.split("\u0000");
      return { from, to, samples: [...new Set(samples)].sort() };
    })
    .sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));

  const lines = [
    `## ${options.title}`,
    "",
    "```mermaid",
    "flowchart LR",
    ...sortedNodes.map((node) => `  ${nodeId(node)}[\"${escapeMermaid(node)}\"]`),
    ...sortedEdges.map((edge) => `  ${nodeId(edge.from)} --> ${nodeId(edge.to)}`),
    "```",
    "",
    "| From | To | 代表性 Import |",
    "| --- | --- | --- |",
    ...sortedEdges.map((edge) => `| \`${edge.from}\` | \`${edge.to}\` | ${edge.samples.slice(0, 3).map((sample) => `\`${sample}\``).join("<br>")} |`),
  ];
  if (sortedEdges.length === 0) lines.push("| — | — | 当前没有跨层静态 Import | ");
  return lines.join("\n");
}

function classifyGateway(relativePath) {
  if (relativePath === "index.ts") return "entry";
  const [first, second] = relativePath.split("/");
  if (first === "commands") return "commands";
  if (first === "control-plane" && second === "features") {
    return `control:${relativePath.split("/")[2] ?? "unknown"}`;
  }
  return first ?? null;
}

function classifyWeb(relativePath) {
  const [first, second] = relativePath.split("/");
  if (first === "features") return `feature:${second ?? "unknown"}`;
  if (first === "routes") return "routes";
  if (["main.tsx", "app.tsx", "router.tsx"].includes(relativePath)) return "application";
  return first ?? null;
}

async function resolveImport(fromFile, specifier, sourceRoot) {
  const withoutExtension = specifier.replace(/\.js$/u, "");
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, withoutExtension.slice(2))
    : path.resolve(path.dirname(fromFile), withoutExtension);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return path.normalize(candidate);
    } catch {
      // Missing imports are owned by verify:imports.
    }
  }
  return null;
}

async function findSourceFiles(directory, includeTsx) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findSourceFiles(absolute, includeTsx));
      continue;
    }
    const source = entry.name.endsWith(".ts") || (includeTsx && entry.name.endsWith(".tsx"));
    const test = /\.(?:test|spec)\.[^.]+$/u.test(entry.name);
    if (source && !test) results.push(absolute);
  }
  return results;
}

function nodeId(value) {
  return `n_${Buffer.from(value).toString("hex")}`;
}

function escapeMermaid(value) {
  return value.replaceAll('"', "&quot;");
}

function relative(base, value) {
  return path.relative(base, value).replaceAll(path.sep, "/");
}

const entry = process.argv[1];
if (entry !== undefined && path.resolve(entry) === fileURLToPath(import.meta.url)) {
  const content = await buildModuleGraphDocument();
  if (process.argv.includes("--check")) {
    let current = null;
    try { current = await readFile(outputPath, "utf8"); } catch { /* stale */ }
    if (current !== content) {
      process.stderr.write("generated module graph is stale; run `pnpm docs:module-graph`\n");
      process.exitCode = 1;
    } else {
      process.stdout.write("generated module graph is up to date\n");
    }
  } else {
    await writeFile(outputPath, content, "utf8");
    process.stdout.write(`generated: ${relative(root, outputPath)}\n`);
  }
}
