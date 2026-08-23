import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  createReleaseAssets,
  parseReleaseAssetArguments,
} from "./release-assets-policy.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const { version, check } = parseReleaseAssetArguments(process.argv.slice(2));

let temporaryRoot;
try {
  temporaryRoot = check ? await mkdtemp(path.join(os.tmpdir(), "aigw-release-check-")) : undefined;
  const outputDirectory = temporaryRoot ?? path.join(repositoryRoot, ".artifacts/release", version);
  const result = await createReleaseAssets({
    repositoryRoot,
    outputDirectory,
    version,
    allowDirty: check,
  });
  process.stdout.write(
    `${check ? "release-assets check passed" : "release assets generated"} (${result.version}, ${result.commit.slice(0, 12)}, ${result.assetNames.length} assets)\n`,
  );
} finally {
  if (temporaryRoot !== undefined)
    await rm(temporaryRoot, { recursive: true, force: true });
}
