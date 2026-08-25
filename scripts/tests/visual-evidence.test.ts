import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { collectVisualEvidenceViolations } from "../visual-evidence-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(await readFile(
  path.join(root, "docs/product/ux/assets/visual-evidence.json"),
  "utf8",
));
const assetFiles = Object.fromEntries(await Promise.all(
  manifest.assets.map(async (asset: { file: string }) => [
    asset.file,
    await readFile(path.join(root, "docs/product/ux/assets", asset.file)),
  ] as const),
));

test("published UI evidence records a clean Commit and exact asset digests", () => {
  assert.deepEqual(collectVisualEvidenceViolations({ manifest, assetFiles }), []);
});

test("published UI evidence rejects a replaced screenshot", () => {
  const changedFiles = { ...assetFiles, "overview.png": Buffer.from("changed") };
  const errors = collectVisualEvidenceViolations({ manifest, assetFiles: changedFiles });
  assert.ok(errors.some(error => error.includes("digest mismatch: overview.png")));
});

test("published UI evidence rejects dirty or incomplete provenance", () => {
  const changedManifest = structuredClone(manifest);
  changedManifest.source.dirty = true;
  changedManifest.assets = changedManifest.assets.filter((asset: { file: string }) => asset.file !== "clients.png");
  const errors = collectVisualEvidenceViolations({ manifest: changedManifest, assetFiles });
  assert.ok(errors.some(error => error.includes("clean worktree")));
  assert.ok(errors.some(error => error.includes("missing required asset: clients.png")));
});
