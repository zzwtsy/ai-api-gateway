import { readFile } from "node:fs/promises";
import path from "node:path";

export function registryArtifactPaths(baseline) {
  return [
    ...baseline.shadcn.components.map(
      component => `apps/web/src/components/ui/${component}.tsx`,
    ),
    ...(baseline.shadcn.registryHooks ?? []).map(
      hook => `apps/web/src/hooks/${hook}.ts`,
    ),
  ];
}

export function officialRegistryArtifactPaths(baseline) {
  return baseline.shadcn.components.map(
    component => `apps/web/src/components/ui/${component}.tsx`,
  );
}

export async function collectOfficialRegistrySourceViolations(
  repositoryRoot,
  generatedRoot,
  baseline,
) {
  const generated = await readGeneratedRegistryArtifacts(generatedRoot, baseline);
  const failures = [...generated.failures];
  for (const relative of officialRegistryArtifactPaths(baseline)) {
    let current;
    try {
      current = await readFile(path.join(repositoryRoot, relative));
    } catch (error) {
      failures.push(`${relative} 无法读取：${errorMessage(error)}`);
      continue;
    }
    const generatedSource = generated.sources.get(relative);
    if (generatedSource === undefined) {
      continue;
    }
    if (!current.equals(generatedSource)) {
      failures.push(`${relative} 与固定 shadcn CLI 的官方输出不完全一致`);
    }
  }
  return failures;
}

async function readGeneratedRegistryArtifacts(generatedRoot, baseline) {
  const sources = new Map();
  const failures = [];
  for (const relative of registryArtifactPaths(baseline)) {
    try {
      sources.set(relative, await readFile(path.join(generatedRoot, relative)));
    } catch (error) {
      failures.push(`固定 shadcn CLI 未生成 ${relative}：${errorMessage(error)}`);
    }
  }
  return { sources, failures };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
