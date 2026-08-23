import { spawnSync } from "node:child_process";
import process from "node:process";

const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});

if (probe.status !== 0 || probe.stdout.trim() !== "true") {
  process.stdout.write("lefthook install skipped: initialize a Git repository first.\n");
  process.exit(0);
}

const install = spawnSync("lefthook", ["install"], { stdio: "inherit" });
if (install.error !== undefined) {
  process.stderr.write(`lefthook install failed: ${install.error.message}\n`);
  process.exitCode = 1;
} else {
  process.exitCode = install.status ?? 1;
}
