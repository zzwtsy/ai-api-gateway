import type { RuntimeInvariantOwner } from "../runtime-invariants-policy.ts";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import test from "node:test";
import { collectRuntimeInvariantViolations } from "../runtime-invariants-policy.ts";

async function fixture(consumerSource = "assertInvariant(value);\n") {
  const root = await mkdtemp(path.join(tmpdir(), "aigw-invariant-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src/invariant.ts"), "export function assertInvariant(value) { if (!value) throw new Error(); }\n");
  await writeFile(path.join(root, "src/invariant.test.ts"), "assertInvariant(false);\n");
  await writeFile(path.join(root, "src/consumer.ts"), consumerSource);
  return root;
}

const manifestOwner: RuntimeInvariantOwner = {
  name: "example relationship",
  source: "src/invariant.ts",
  test: "src/invariant.test.ts",
  consumers: ["src/consumer.ts"],
  symbol: "assertInvariant",
};
const manifest = { owners: [manifestOwner] };

test("runtime invariant manifest accepts source, negative test and production enforcement", async () => {
  const root = await fixture();
  assert.deepEqual(await collectRuntimeInvariantViolations(root, manifest), []);
});

test("runtime invariant manifest rejects an ornamental invariant without production enforcement", async () => {
  const root = await fixture("runWithoutGuard(value);\n");
  const errors = await collectRuntimeInvariantViolations(root, manifest);
  assert.ok(errors.some(error => error.includes("does not enforce assertInvariant")));
});

test("runtime invariant manifest rejects an owner without consumers", async () => {
  const root = await fixture();
  const errors = await collectRuntimeInvariantViolations(root, {
    owners: [{ ...manifestOwner, consumers: [] }],
  });
  assert.ok(errors.some(error => error.includes("at least one production consumer")));
});

test("comments and strings cannot impersonate production invariant enforcement", async () => {
  const root = await fixture("// assertInvariant(value);\nconst text = \"assertInvariant(value)\";\nrunWithoutGuard(value);\n");
  const errors = await collectRuntimeInvariantViolations(root, manifest);
  assert.ok(errors.some(error => error.includes("does not enforce assertInvariant")));
});
