import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

import { buildSpecBundles } from "./spec-bundle.ts";

const root = path.resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  args: process.argv.slice(2),
  strict: true,
  options: {
    "check": { type: "boolean", default: false },
    "output-dir": { type: "string" },
  },
});
const outputDirectory = values["output-dir"] === undefined
  ? path.join(root, ".artifacts/spec")
  : path.resolve(root, values["output-dir"]);
const results = await buildSpecBundles({
  repositoryRoot: root,
  outputDirectory,
  checkOnly: values.check,
});
for (const result of results) {
  process.stdout.write(`${values.check ? "checked" : "generated"}: ${path.relative(root, result.outputPath)} (${result.sourceCount} sources)\n`);
}
