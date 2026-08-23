import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectOfficialRegistrySourceViolations,
  registryArtifactPaths,
} from "../toolchain-official-policy.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const baseline = JSON.parse(
  await readFile(path.join(repositoryRoot, ".toolchain/baseline.json"), "utf8"),
);

test("official Registry comparison accepts byte-identical generated artifacts", async () => {
  const generatedRoot = await copyRegistryArtifacts();
  assert.deepEqual(
    await collectOfficialRegistrySourceViolations(repositoryRoot, generatedRoot, baseline),
    [],
  );
});

test("official Registry comparison rejects source changed together with its reviewed digest", async () => {
  const sourceRoot = await copyRegistryArtifacts();
  const generatedRoot = await copyRegistryArtifacts();
  const relative = "apps/web/src/components/ui/button.tsx";
  const absolute = path.join(sourceRoot, relative);
  const changed = `${await readFile(absolute, "utf8")}\n// locally reviewed but not official\n`;
  await writeFile(absolute, changed, "utf8");

  const changedBaseline = structuredClone(baseline);
  changedBaseline.shadcn.componentDigests.button = createHash("sha256")
    .update(changed)
    .digest("hex");
  assert.equal(
    changedBaseline.shadcn.componentDigests.button,
    createHash("sha256").update(await readFile(absolute)).digest("hex"),
  );

  const failures = await collectOfficialRegistrySourceViolations(
    sourceRoot,
    generatedRoot,
    changedBaseline,
  );
  assert.ok(failures.some(failure => failure.includes(relative)));
});

test("official Registry comparison does not require byte-identical generated hooks", async () => {
  const generatedRoot = await copyRegistryArtifacts();
  const relative = "apps/web/src/hooks/use-mobile.ts";
  const source = await readFile(path.join(generatedRoot, relative), "utf8");
  await writeFile(
    path.join(generatedRoot, relative),
    `${source}\n`,
  );

  assert.deepEqual(
    await collectOfficialRegistrySourceViolations(repositoryRoot, generatedRoot, baseline),
    [],
  );
});

test("official Registry comparison requires the CLI to generate registered hooks", async () => {
  const generatedRoot = await copyRegistryArtifacts();
  const relative = "apps/web/src/hooks/use-mobile.ts";
  await rm(path.join(generatedRoot, relative));

  const failures = await collectOfficialRegistrySourceViolations(
    repositoryRoot,
    generatedRoot,
    baseline,
  );
  assert.ok(failures.some(failure => failure.includes(`未生成 ${relative}`)));
});

async function copyRegistryArtifacts() {
  const target = await mkdtemp(path.join(os.tmpdir(), "aigw-official-registry-"));
  for (const relative of registryArtifactPaths(baseline)) {
    const destination = path.join(target, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(repositoryRoot, relative), destination);
  }
  return target;
}
