import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const gatewayPort = process.env.AIGW_ARTIFACT_GATEWAY_PORT ?? "3302";
const healthUrl = `http://127.0.0.1:${gatewayPort}/healthz`;
const gateway = spawn(process.execPath, ["apps/gateway/dist/index.js"], {
  cwd: root,
  env: {
    NODE_ENV: "test",
    STORAGE_DRIVER: "memory",
    LOG_LEVEL: "silent",
    PORT: gatewayPort,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
let processFailure: Error | undefined;

gateway.stderr?.setEncoding("utf8");
gateway.stderr?.on("data", (chunk: string) => {
  stderr = `${stderr}${chunk}`.slice(-4_000);
});
gateway.once("error", (error) => {
  processFailure = error;
});
gateway.once("exit", (code, signal) => {
  processFailure = new Error(`Gateway 构建产物提前退出：${code ?? signal ?? "unknown"}${formatStderr(stderr)}`);
});

try {
  await waitForHealth(healthUrl, 15_000, () => processFailure);
  process.stdout.write("artifact smoke passed\n");
} finally {
  await stopProcess(gateway);
}

async function waitForHealth(url: string, timeoutMs: number, failure: () => Error | undefined): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "尚未请求";
  while (Date.now() < deadline) {
    const processError = failure();
    if (processError !== undefined)
      throw processError;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok)
        return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`等待 Gateway 构建产物超时：${url}（${lastError}）${formatStderr(stderr)}`);
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null)
    return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const graceful = await Promise.race([
    exited.then(() => true),
    new Promise<false>((resolve) => {
      timer = setTimeout(resolve, 5_000, false);
    }),
  ]);
  if (timer !== undefined)
    clearTimeout(timer);
  if (graceful)
    return;
  child.kill("SIGKILL");
  await exited;
}

function formatStderr(output: string): string {
  const normalized = output.trim();
  return normalized === "" ? "" : `\n${normalized}`;
}
