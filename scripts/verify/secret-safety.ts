import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const files = await findFiles(root);
const failures: string[] = [];
const suspicious = [
  /sk-[A-Za-z0-9]{20,}/,
  /sk-ant-[\w-]{20,}/,
  /Bearer\s+(?!gw_dev_local_key|mock-provider-key|admin_dev_local)[\w-]{24,}/,
];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const expression of suspicious) {
    if (expression.test(source))
      failures.push(`${path.relative(root, file)} contains a secret-like token`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`secret-safety passed (${files.length} text files scanned)\n`);
}

async function findFiles(directory: string): Promise<string[]> {
  const results: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".artifacts", "coverage"].includes(entry.name))
      continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory())
      results.push(...await findFiles(fullPath));
    else if (/\.(?:ts|tsx|mjs|md|json|yaml|yml|env|sql|txt)$/.test(entry.name) || entry.name === ".env.example")
      results.push(fullPath);
  }
  return results;
}
