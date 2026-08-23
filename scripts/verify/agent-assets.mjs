import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const required = [
  "AGENTS.md",
  "ai/AGENTS.md",
  "ai/golden-paths.md",
  "ai/change-evidence-matrix.md",
  "apps/gateway/AGENTS.md",
  "apps/gateway/src/control-plane/AGENTS.md",
  "apps/gateway/src/data-plane/AGENTS.md",
  "apps/web/AGENTS.md",
  "apps/e2e/AGENTS.md",
  "docs/README.md",
  "docs/conventions/language-and-localization.md",
  "docs/conventions/documentation-system.md",
  "docs/conventions/change-scope-and-evidence.md",
  "docs/conventions/runtime-invariants.md",
  "docs/conventions/defensive-patterns.md",
  "docs/conventions/simplification-and-entropy-control.md",
  "docs/architecture/current-implementation.md",
  "docs/references/official-toolchain-baseline.md",
  ".toolchain/baseline.json",
  "docs/postmortems/README.md",
  "docs/postmortems/_template.md",
  "docs/decisions/implemented/2026-08-22-unified-repository-and-generated-projections.md",
  "docs/decisions/implemented/2026-08-22-chinese-first-project.md",
  "docs/decisions/implemented/2026-08-22-repository-anti-corruption-loop.md",
  "docs/decisions/implemented/2026-08-22-official-toolchain-initializers.md",
  "CONTRIBUTING.md",
  "README.en.md",
  ".agents/skills/execution-plan/SKILL.md",
  ".agents/skills/add-control-feature/SKILL.md",
  ".agents/skills/change-data-plane/SKILL.md",
  ".agents/skills/pre-push-checks/SKILL.md",
  ".agents/skills/simplification-audit/SKILL.md",
  ".agents/skills/postmortem/SKILL.md",
  ".agents/skills/update-shadcn/SKILL.md",
  "scripts/change-scope.mjs",
  "scripts/select-evidence.mjs",
  "scripts/gates/gate-runner.mjs",
  "scripts/verify/runtime-invariants.json",
  "scripts/verify/toolchain-baseline.mjs",
  "scripts/verify/toolchain-official.mjs",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
];
const failures = [];
for (const relative of required) {
  try { await access(path.join(root, relative)); } catch { failures.push(`missing required agent/document asset: ${relative}`); }
}

const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const scripts = new Set(Object.keys(manifest.scripts ?? {}));
const markdownFiles = await findMarkdown(root);
for (const file of markdownFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const target = match[1];
    if (target === undefined || /^(?:https?:|mailto:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    try { await access(resolved); } catch { failures.push(`${path.relative(root, file)} links missing ${target}`); }
  }
  for (const match of source.matchAll(/`pnpm\s+(?:run\s+)?([\w:-]+)(?:\s|`)/g)) {
    const command = match[1];
    if (command !== undefined && !command.startsWith("--") && !scripts.has(command) && !["install", "exec", "dlx"].includes(command)) {
      failures.push(`${path.relative(root, file)} references unknown root script ${command}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`agent-assets passed (${markdownFiles.length} Markdown files)\n`);
}

async function findMarkdown(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".artifacts"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await findMarkdown(fullPath));
    else if (entry.name.endsWith(".md")) results.push(fullPath);
  }
  return results;
}
