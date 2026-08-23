import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  createReleaseAssets,
  extractReleaseNotes,
  parseReleaseAssetArguments,
} from "../release/release-assets-policy.ts";
import {
  createProjectVersionFixture,
  fixtureChangelog,
  fixtureVersion,
  previousFixtureVersion,
} from "./helpers/project-version-fixture.ts";

const execFileAsync = promisify(execFile);
const version = fixtureVersion;

test("release notes are the exact matching synthetic CHANGELOG section", () => {
  const notes = extractReleaseNotes(fixtureChangelog(), version);
  assert.match(notes, new RegExp(`^## ${version.replaceAll(".", "\\.")} —`, "u"));
  assert.ok(!notes.includes(`## ${previousFixtureVersion}`));
  assert.equal([...notes.matchAll(/^## /gmu)].length, 1);
});

test("release asset argument parser accepts the pnpm script separator", () => {
  assert.deepEqual(parseReleaseAssetArguments(["--", version, "--check"]), {
    version,
    check: true,
  });
});

test("release assets contain deterministic archive metadata, three specs and checksums", async () => {
  const fixture = await createProjectVersionFixture({
    includeReleaseSources: true,
    initializeGit: true,
  });
  const first = await mkdtemp(path.join(os.tmpdir(), "aigw-release-a-"));
  const second = await mkdtemp(path.join(os.tmpdir(), "aigw-release-b-"));
  const firstResult = await createReleaseAssets({
    repositoryRoot: fixture.root,
    outputDirectory: first,
    version,
  });
  const secondResult = await createReleaseAssets({
    repositoryRoot: fixture.root,
    outputDirectory: second,
    version,
  });
  assert.equal(firstResult.commit, secondResult.commit);

  const archiveName = `ai-api-gateway-v${version}.tar.gz`;
  const firstArchive = await readFile(path.join(first, archiveName));
  const secondArchive = await readFile(path.join(second, archiveName));
  assert.equal(createHash("sha256").update(firstArchive).digest("hex"), createHash("sha256").update(secondArchive).digest("hex"));

  const prefix = `ai-api-gateway-v${version}/`;
  const { stdout } = await execFileAsync("tar", [
    "-xOf",
    path.join(first, archiveName),
    `${prefix}.artifacts/source-metadata.json`,
  ], { encoding: "utf8" });
  const metadata = JSON.parse(stdout);
  assert.equal(metadata.version, version);
  assert.equal(metadata.commit, firstResult.commit);

  const specNames = firstResult.assetNames.filter(name => name.startsWith("AI_API_GATEWAY_") && name.endsWith("_SPEC.md"));
  assert.equal(specNames.length, 3);
  const sums = await readFile(path.join(first, "SHA256SUMS"), "utf8");
  for (const name of firstResult.assetNames.filter(name => name !== "SHA256SUMS")) {
    assert.match(sums, new RegExp(`^[0-9a-f]{64}  ${name.replaceAll(".", "\\.")}$`, "mu"));
  }
});
