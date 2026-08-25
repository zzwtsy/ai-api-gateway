import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectAgentAssetViolations } from "../agent-assets-policy.ts";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aigw-agent-assets-"));
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, ".agents/skills/pnpm"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { "known:script": "true" } }), "utf8");
  await writeFile(path.join(root, "skills-lock.json"), JSON.stringify({
    skills: { pnpm: { sourceType: "github" } },
  }), "utf8");
  return root;
}

test("agent asset policy rejects a missing required project skill", async () => {
  const root = await fixture();
  const result = await collectAgentAssetViolations(root, { required: [".agents/skills/project/SKILL.md"] });
  assert.ok(result.failures.some(failure => failure.includes("missing required agent/document asset")));
});

test("agent asset policy keeps link validation for locked third-party skills", async () => {
  const root = await fixture();
  await writeFile(path.join(root, ".agents/skills/pnpm/SKILL.md"), "[missing](references/missing.md)\n", "utf8");
  const result = await collectAgentAssetViolations(root, { required: [] });
  assert.ok(result.failures.some(failure => failure.includes("links missing")));
});

test("agent asset policy rejects unknown project scripts but skips locked third-party examples", async () => {
  const root = await fixture();
  await writeFile(path.join(root, "docs/project.md"), "Run `pnpm unknown:project` now.\n", "utf8");
  await writeFile(path.join(root, ".agents/skills/pnpm/SKILL.md"), "Run `pnpm unknown:upstream` now.\n", "utf8");
  const result = await collectAgentAssetViolations(root, { required: [] });
  assert.ok(result.failures.some(failure => failure.includes("unknown:project")));
  assert.ok(!result.failures.some(failure => failure.includes("unknown:upstream")));
});

test("agent asset policy rejects cross-skill references in project skills", async () => {
  const root = await fixture();
  await mkdir(path.join(root, ".agents/skills/skill-a/agents"), { recursive: true });
  await mkdir(path.join(root, ".agents/skills/skill-a"), { recursive: true });
  await mkdir(path.join(root, ".agents/skills/skill-b"), { recursive: true });
  await writeFile(path.join(root, ".agents/skills/skill-a/SKILL.md"), "Independent.\n", "utf8");
  await writeFile(path.join(root, ".agents/skills/skill-a/agents/openai.yaml"), "default_prompt: Use $skill-b.\n", "utf8");
  await writeFile(path.join(root, ".agents/skills/skill-b/SKILL.md"), "Independent.\n", "utf8");
  const result = await collectAgentAssetViolations(root, { required: [] });
  assert.ok(result.failures.some(failure => failure.includes("references project skill skill-b")));
});

test("agent asset policy permits self references and skips locked third-party skills", async () => {
  const root = await fixture();
  await mkdir(path.join(root, ".agents/skills/skill-a"), { recursive: true });
  await writeFile(path.join(root, ".agents/skills/skill-a/SKILL.md"), "Use `$skill-a` and `.agents/skills/skill-a/references`.\n", "utf8");
  await writeFile(path.join(root, ".agents/skills/pnpm/SKILL.md"), "Third party may mention skill-a.\n", "utf8");
  const result = await collectAgentAssetViolations(root, { required: [] });
  assert.ok(!result.failures.some(failure => failure.includes("project skill")));
});
