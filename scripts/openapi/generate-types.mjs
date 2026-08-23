import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const temporary = await mkdtemp(path.join(tmpdir(), "aigw-openapi-"));
const specification = path.join(temporary, "admin-openapi.json");
const output = process.env.OPENAPI_OUTPUT ?? path.join(root, "apps/web/src/api/schema.d.ts");

try {
  await run(["--filter", "@aigw/gateway", "openapi:export", "--", specification]);
  await run(["exec", "openapi-typescript", specification, "-o", output]);
  process.stdout.write(`OpenAPI types generated: ${output}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

async function run(args) {
  const { stdout, stderr } = await execFileAsync("pnpm", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}
