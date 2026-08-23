import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  collectProjectVersionViolations,
  projectVersionProjections,
  setProjectVersion,
} from "../project-version-policy.mjs";
import {
  createProjectVersionFixture,
  fixtureVersion,
  previousFixtureVersion,
} from "./helpers/project-version-fixture.mjs";

test("version setter accepts ordered Alpha, Beta, RC and Stable targets", async () => {
  for (const target of ["1.2.3-alpha.4", "1.2.3-beta.1", "1.2.3-rc.1", "1.2.3"]) {
    const root = await fixture();
    const result = await setProjectVersion(root, target);
    assert.equal(result.version, target);
    const changelogPath = path.join(root, "CHANGELOG.md");
    const changelog = await readFile(changelogPath, "utf8");
    await writeFile(changelogPath, changelog.replace(`## ${fixtureVersion}`, `## ${target}`), "utf8");
    assert.deepEqual(await collectProjectVersionViolations(root), []);
  }
});

test("version setter rejects invalid, equal and lower versions", async () => {
  for (const target of ["1.2.3-alpha.01", fixtureVersion, previousFixtureVersion]) {
    const root = await fixture();
    await assert.rejects(setProjectVersion(root, target));
  }
});

test("version verifier detects drift in every registered projection", async () => {
  for (const item of projectVersionProjections) {
    const root = await fixture();
    const absolute = path.join(root, item.path);
    const source = await readFile(absolute, "utf8");
    await writeFile(absolute, source.replace(fixtureVersion, "9.9.9"), "utf8");
    const failures = await collectProjectVersionViolations(root);
    assert.ok(failures.length > 0, `${item.path} drift must fail`);
  }
});

test("version verifier rejects missing and duplicate CHANGELOG versions", async () => {
  const missingRoot = await fixture();
  await writeFile(path.join(missingRoot, "CHANGELOG.md"), "# 变更日志\n", "utf8");
  assert.ok((await collectProjectVersionViolations(missingRoot)).some(failure => failure.includes("缺少版本标题")));

  const duplicateRoot = await fixture();
  const changelogPath = path.join(duplicateRoot, "CHANGELOG.md");
  const changelog = await readFile(changelogPath, "utf8");
  await writeFile(changelogPath, `${changelog}\n## ${fixtureVersion} — 2026-01-01\n`, "utf8");
  assert.ok((await collectProjectVersionViolations(duplicateRoot)).some(failure => failure.includes("重复版本标题")));
});

async function fixture() {
  return (await createProjectVersionFixture()).root;
}
