import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const scanRoots = [
  path.join(root, "apps/gateway"),
  path.join(root, "apps/web"),
  path.join(root, "apps/e2e"),
  path.join(root, "scripts"),
];
const sourceExtensions = [".ts", ".tsx", ".d.ts", ".mts", ".cts", ".mjs", ".cjs", ".js", ".json"];
const files = (await Promise.all(scanRoots.map(findSourceFiles))).flat();
const failures = [];
const patterns = [
  /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
  /import\(\s*["']([^"']+)["']\s*\)/g,
];

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier === undefined || (!specifier.startsWith(".") && !specifier.startsWith("@/"))) {
        continue;
      }
      const base = specifier.startsWith("@/")
        ? resolveAlias(file, specifier)
        : path.resolve(path.dirname(file), specifier);
      if (base === null || await resolvesToFile(base) === false) {
        failures.push(`${relative(file)} imports unresolved ${specifier}`);
      }
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`imports passed (${files.length} source files)\n`);
}

function resolveAlias(file, specifier) {
  const webRoot = path.join(root, "apps/web");
  if (!isInside(webRoot, file)) {
    return null;
  }
  return path.join(webRoot, "src", specifier.slice(2));
}

async function resolvesToFile(base) {
  const extension = path.extname(base);
  const candidates = [];
  if (extension !== "") {
    candidates.push(base);
    if ([".js", ".mjs", ".cjs"].includes(extension)) {
      const stem = base.slice(0, -extension.length);
      candidates.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.d.ts`, `${stem}.mts`, `${stem}.cts`);
    } else if (!sourceExtensions.includes(extension)) {
      // Generated/source basenames may contain a semantic suffix such as routeTree.gen.ts.
      for (const suffix of sourceExtensions) candidates.push(`${base}${suffix}`);
    }
  } else {
    candidates.push(base);
    for (const suffix of sourceExtensions) {
      candidates.push(`${base}${suffix}`);
      candidates.push(path.join(base, `index${suffix}`));
    }
  }
  const builtSourceCandidate = base.includes(`${path.sep}dist${path.sep}`)
    ? base.replace(`${path.sep}dist${path.sep}`, `${path.sep}src${path.sep}`)
    : null;
  if (builtSourceCandidate !== null) {
    const extension = path.extname(builtSourceCandidate);
    const stem = extension === "" ? builtSourceCandidate : builtSourceCandidate.slice(0, -extension.length);
    candidates.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`);
  }
  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return true;
    }
  }
  return false;
}

async function isFile(file) {
  try {
    await access(file);
    const parent = path.dirname(file);
    const name = path.basename(file);
    const entries = await readdir(parent, { withFileTypes: true });
    return entries.some((entry) => entry.name === name && entry.isFile());
  } catch {
    return false;
  }
}

async function findSourceFiles(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "coverage", "test-results", "playwright-report"].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findSourceFiles(fullPath));
    } else if (sourceExtensions.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function isInside(directory, file) {
  const relativePath = path.relative(directory, file);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}
