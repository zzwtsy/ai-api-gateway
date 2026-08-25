import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const requiredAgentAssets = Object.freeze([
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
  "docs/conventions/typescript-comments.md",
  "docs/conventions/git-commits.md",
  "docs/conventions/versioning-and-release.md",
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
  "docs/decisions/implemented/2026-08-23-synchronized-version-and-verifiable-release.md",
  "CONTRIBUTING.md",
  "README.en.md",
  ".agents/skills/execution-plan/SKILL.md",
  ".agents/skills/add-control-feature/SKILL.md",
  ".agents/skills/change-data-plane/SKILL.md",
  ".agents/skills/verify-before-push/SKILL.md",
  ".agents/skills/push-branch-safely/SKILL.md",
  ".agents/skills/simplification-audit/SKILL.md",
  ".agents/skills/postmortem/SKILL.md",
  ".agents/skills/update-shadcn/SKILL.md",
  ".agents/skills/typescript-comments/SKILL.md",
  ".agents/skills/git-commit/SKILL.md",
  ".agents/skills/prepare-version/SKILL.md",
  ".agents/skills/publish-release/SKILL.md",
  "scripts/change-scope.ts",
  "scripts/select-evidence.ts",
  "scripts/gates/gate-runner.ts",
  "scripts/verify/runtime-invariants.json",
  "scripts/verify/toolchain-baseline.ts",
  "scripts/verify/toolchain-official.ts",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
]);

interface AgentAssetOptions {
  required?: readonly string[];
}

interface SkillLockEntry {
  sourceType?: string;
}

export async function collectAgentAssetViolations(repositoryRoot: string, options: AgentAssetOptions = {}) {
  const required = options.required ?? requiredAgentAssets;
  const failures: string[] = [];
  for (const relative of required) {
    try {
      await access(path.join(repositoryRoot, relative));
    } catch {
      failures.push(`missing required agent/document asset: ${relative}`);
    }
  }

  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
  const scripts = new Set(Object.keys(manifest.scripts ?? {}));
  const thirdPartySkills = await readThirdPartySkills(repositoryRoot);
  const projectSkills = await readProjectSkills(repositoryRoot, thirdPartySkills);
  const markdownFiles = await findMarkdown(repositoryRoot);
  for (const file of markdownFiles) {
    const source = await readFile(file, "utf8");
    const relative = normalize(path.relative(repositoryRoot, file));
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/gu)) {
      const target = match[1];
      if (target === undefined || /^(?:https?:|mailto:)/u.test(target))
        continue;
      const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
      try {
        await access(resolved);
      } catch {
        failures.push(`${relative} links missing ${target}`);
      }
    }

    if (isLockedThirdPartySkill(relative, thirdPartySkills))
      continue;
    for (const match of source.matchAll(/`pnpm\s+(?:run\s+)?([\w:-]+)(?:\s|`)/gu)) {
      const command = match[1];
      if (command !== undefined && !command.startsWith("--") && !scripts.has(command) && !["install", "exec", "dlx"].includes(command)) {
        failures.push(`${relative} references unknown root script ${command}`);
      }
    }
  }

  const skillTextFiles = await findSkillTextFiles(path.join(repositoryRoot, ".agents/skills"));
  for (const file of skillTextFiles) {
    const relative = normalize(path.relative(repositoryRoot, file));
    if (isLockedThirdPartySkill(relative, thirdPartySkills))
      continue;
    const source = await readFile(file, "utf8");
    failures.push(...collectCrossSkillReferenceViolations(relative, source, projectSkills));
  }

  return { failures, markdownCount: markdownFiles.length };
}

async function readProjectSkills(repositoryRoot: string, thirdPartySkills: ReadonlySet<string>): Promise<Set<string>> {
  const skillsRoot = path.join(repositoryRoot, ".agents/skills");
  const names = new Set<string>();
  try {
    for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || thirdPartySkills.has(entry.name))
        continue;
      try {
        await access(path.join(skillsRoot, entry.name, "SKILL.md"));
        names.add(entry.name);
      } catch {
        // Ignore empty or non-Skill directories.
      }
    }
  } catch {
    // A missing Skill root is reported by required asset checks when applicable.
  }
  return names;
}

function collectCrossSkillReferenceViolations(relative: string, source: string, projectSkills: ReadonlySet<string>): string[] {
  const owner = relative.match(/^\.agents\/skills\/([^/]+)\//u)?.[1];
  if (owner === undefined || !projectSkills.has(owner))
    return [];

  const failures: string[] = [];
  for (const other of projectSkills) {
    if (other === owner)
      continue;
    const escaped = other.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const reference = new RegExp(`(^|[^a-z0-9-])${escaped}(?=$|[^a-z0-9-])`, "mu");
    if (reference.test(source))
      failures.push(`${relative} references project skill ${other}; project skills must be independent`);
  }
  return failures;
}

async function readThirdPartySkills(repositoryRoot: string): Promise<Set<string>> {
  try {
    const lock = JSON.parse(await readFile(path.join(repositoryRoot, "skills-lock.json"), "utf8")) as { skills?: Record<string, SkillLockEntry> };
    return new Set(Object.entries(lock.skills ?? {})
      .filter(([, entry]) => entry !== null && typeof entry === "object" && entry.sourceType === "github")
      .map(([name]) => name));
  } catch {
    return new Set();
  }
}

function isLockedThirdPartySkill(relative: string, names: ReadonlySet<string>): boolean {
  const match = relative.match(/^\.agents\/skills\/([^/]+)\//u);
  return match?.[1] !== undefined && names.has(match[1]);
}

async function findMarkdown(directory: string): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".artifacts"].includes(entry.name))
      continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory())
      results.push(...await findMarkdown(fullPath));
    else if (entry.name.endsWith(".md"))
      results.push(fullPath);
  }
  return results;
}

async function findSkillTextFiles(directory: string): Promise<string[]> {
  const results: string[] = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory())
        results.push(...await findSkillTextFiles(fullPath));
      else if (/\.(?:json|md|mjs|py|sh|ts|tsx|ya?ml)$/u.test(entry.name))
        results.push(fullPath);
    }
  } catch {
    // The required asset checks own missing project directories.
  }
  return results;
}

function normalize(value: string): string {
  return value.replaceAll(path.sep, "/");
}
