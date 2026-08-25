import { createHash } from "node:crypto";

const requiredPublishedAssets = [
  "clients.png",
  "connections.png",
  "contact-sheet.png",
  "models.png",
  "overview-compact-desktop.png",
  "overview.png",
  "requests.png",
] as const;

interface VisualEvidenceInput {
  readonly assetFiles: Readonly<Record<string, Uint8Array>>;
  readonly manifest: unknown;
}

export function collectVisualEvidenceViolations(input: VisualEvidenceInput): string[] {
  if (!isRecord(input.manifest))
    return ["visual evidence manifest must be an object"];

  const failures = collectSourceViolations(input.manifest);
  if (!Array.isArray(input.manifest.assets))
    return [...failures, "visual evidence manifest assets must be an array"];

  return [...failures, ...collectAssetViolations(input.manifest.assets, input.assetFiles)];
}

function collectSourceViolations(manifest: Record<string, unknown>): string[] {
  const failures: string[] = [];
  if (manifest.schemaVersion !== 1)
    failures.push("visual evidence manifest schemaVersion must be 1");

  const source = manifest.source;
  if (!isRecord(source)) {
    failures.push("visual evidence manifest source must be an object");
  } else {
    if (typeof source.commit !== "string" || !/^[0-9a-f]{40}$/u.test(source.commit))
      failures.push("visual evidence source.commit must be a full Git object ID");
    if (source.dirty !== false)
      failures.push("published visual evidence must come from a clean worktree");
    if (source.browser !== "chromium")
      failures.push("published visual evidence browser must be chromium");
    if (source.provider !== "mock")
      failures.push("published visual evidence provider must be mock");
    if (typeof source.scenario !== "string" || source.scenario.length === 0)
      failures.push("visual evidence source.scenario must be non-empty");
    if (typeof source.commit === "string" && typeof source.scenario === "string") {
      const expectedMetadata = `.artifacts/ui-evidence/${source.commit}/${source.scenario}/metadata.json`;
      if (source.metadata !== expectedMetadata)
        failures.push(`visual evidence source.metadata must be ${expectedMetadata}`);
    }
  }
  return failures;
}

function collectAssetViolations(
  assets: readonly unknown[],
  assetFiles: Readonly<Record<string, Uint8Array>>,
): string[] {
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const asset of assets) {
    if (!isRecord(asset) || typeof asset.file !== "string") {
      failures.push("visual evidence asset must have a string file");
      continue;
    }
    if (asset.file !== asset.file.split("/").at(-1) || !asset.file.endsWith(".png")) {
      failures.push(`visual evidence asset file must be a PNG basename: ${asset.file}`);
      continue;
    }
    if (seen.has(asset.file))
      failures.push(`duplicate visual evidence asset: ${asset.file}`);
    seen.add(asset.file);

    const bytes = assetFiles[asset.file];
    if (bytes === undefined) {
      failures.push(`visual evidence asset is missing: ${asset.file}`);
      continue;
    }
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (asset.sha256 !== actual)
      failures.push(`visual evidence asset digest mismatch: ${asset.file}`);
  }

  for (const required of requiredPublishedAssets) {
    if (!seen.has(required))
      failures.push(`visual evidence manifest is missing required asset: ${required}`);
  }
  return failures;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
