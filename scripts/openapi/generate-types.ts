import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import openapiTS, { astToString } from "openapi-typescript";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const temporary = await mkdtemp(path.join(tmpdir(), "aigw-openapi-"));
const specification = path.join(temporary, "admin-openapi.json");
const output = process.env.OPENAPI_OUTPUT ?? path.join(root, "apps/web/src/api/schema.d.ts");

try {
  await run(["--filter", "@aigw/gateway", "openapi:export", "--", specification]);
  const ast = await openapiTS(pathToFileURL(specification));
  await writeFile(output, astToString(ast), "utf8");
  process.stdout.write(`OpenAPI types generated: ${output}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

async function run(args: string[]): Promise<void> {
  const { stdout, stderr } = await execFileAsync("pnpm", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (stdout)
    process.stdout.write(stdout);
  if (stderr)
    process.stderr.write(stderr);
}
