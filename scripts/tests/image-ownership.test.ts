import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  decideImageTagOwnership,
  inspectImageManifestDigest,
  isMissingImageManifestError,
} from "../release/image-ownership-policy.ts";

const versionReference = "ghcr.io/example/aigw:1.2.3";
const commitReference = `ghcr.io/example/aigw:sha-${"a".repeat(40)}`;
const digest = `sha256:${"1".repeat(64)}`;

test("GHCR ownership allows a first publish when both tags are absent", () => {
  assert.deepEqual(decideImageTagOwnership({
    versionReference,
    versionDigest: null,
    commitReference,
    commitDigest: null,
  }), { mode: "first-publish", digest: null });
});

test("GHCR ownership allows a retry only when both tags share one digest", () => {
  assert.deepEqual(decideImageTagOwnership({
    versionReference,
    versionDigest: digest,
    commitReference,
    commitDigest: digest,
  }), { mode: "same-commit-retry", digest });
});

test("GHCR ownership rejects one-sided and conflicting tags", () => {
  assert.throws(() => decideImageTagOwnership({
    versionReference,
    versionDigest: digest,
    commitReference,
    commitDigest: null,
  }), /归属不完整/u);
  assert.throws(() => decideImageTagOwnership({
    versionReference,
    versionDigest: digest,
    commitReference,
    commitDigest: `sha256:${"2".repeat(64)}`,
  }), /归属冲突/u);
});

test("manifest inspection hashes raw registry bytes", async () => {
  const content = Buffer.from("{\"schemaVersion\":2}");
  const result = await inspectImageManifestDigest(versionReference, async () => ({
    stdout: content,
    stderr: Buffer.alloc(0),
  }));
  assert.equal(result, `sha256:${createHash("sha256").update(content).digest("hex")}`);
});

test("manifest inspection treats only explicit missing responses as absent", async () => {
  assert.equal(isMissingImageManifestError({ stderr: "manifest unknown" }), true);
  assert.equal(isMissingImageManifestError({ stderr: "manifest not found" }), true);
  assert.equal(isMissingImageManifestError({ stderr: `ERROR: ${versionReference}: not found` }, versionReference), true);
  assert.equal(isMissingImageManifestError({ stderr: "connection timed out" }), false);
  assert.equal(isMissingImageManifestError({ stderr: "docker: executable file not found in $PATH" }, versionReference), false);

  assert.equal(await inspectImageManifestDigest(versionReference, async () => {
    throw Object.assign(new Error("inspect failed"), { stderr: "manifest unknown" });
  }), null);
  await assert.rejects(
    inspectImageManifestDigest(versionReference, async () => {
      throw Object.assign(new Error("inspect failed"), { stderr: "dial tcp: connection timed out" });
    }),
    /无法读取 GHCR Manifest/u,
  );
});
