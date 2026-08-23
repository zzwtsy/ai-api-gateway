import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const trackedPath = path.join(root, "apps/web/src/api/schema.d.ts");
const tracked = await readFile(trackedPath, "utf8");
if (tracked.includes("Generated contract placeholder")) {
  process.stderr.write("Generated API types are still the source-archive placeholder. Run `pnpm api:generate` once after `pnpm install`.\n");
  process.exitCode = 1;
} else {
  const temporary = await mkdtemp(path.join(tmpdir(), "aigw-openapi-check-"));
  const generatedPath = path.join(temporary, "schema.d.ts");
  try {
    await execFileAsync("node", ["scripts/openapi/generate-types.ts"], {
      cwd: root,
      env: { ...process.env, OPENAPI_OUTPUT: generatedPath },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const generated = await readFile(generatedPath, "utf8");
    if (generated !== tracked) {
      process.stderr.write("Generated API types are stale. Run `pnpm api:generate` and review the diff.\n");
      process.exitCode = 1;
    } else {
      process.stdout.write("generated API types passed\n");
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
