import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { validateDecisionNote } from "../decision-notes-policy.ts";

const root = path.resolve(import.meta.dirname, "../..");
const decisionsRoot = path.join(root, "docs/decisions");
const lifecycles = ["implemented", "proposed", "rejected", "superseded"];
const failures: string[] = [];
let count = 0;

for (const lifecycle of lifecycles) {
  const directory = path.join(decisionsRoot, lifecycle);
  let entries: Dirent<string>[] = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      continue;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md"))
      continue;
    count += 1;
    const relative = `docs/decisions/${lifecycle}/${entry.name}`;
    const source = await readFile(path.join(directory, entry.name), "utf8");
    failures.push(...validateDecisionNote(relative, source));
  }
}

if (count === 0)
  failures.push("no active Decision Notes found");

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`decision-notes passed (${count} active notes)\n`);
}
