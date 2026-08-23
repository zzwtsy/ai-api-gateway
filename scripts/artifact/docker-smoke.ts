import { spawn } from "node:child_process";
import process from "node:process";

const compose = ["compose", "--profile", "demo"];
let started = false;

try {
  await run("docker", [...compose, "up", "-d", "--build", "gateway-demo"]);
  started = true;
  await waitFor("http://127.0.0.1:3001/healthz", 90_000);

  const body = {
    model: "demo-model",
    stream: true,
    messages: [{ role: "user", content: "artifact smoke" }],
    unknown_provider_extension: { preserved: true },
  };
  const response = await fetch("http://127.0.0.1:3001/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": "Bearer gw_dev_local_key",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const downstream = await response.text();
  if (!response.ok || !downstream.includes("data: [DONE]")) {
    throw new Error(`Docker Gateway response failed: ${response.status} ${downstream.slice(0, 300)}`);
  }

  const received = await fetch("http://127.0.0.1:4010/received").then(value => value.json()) as { authorization?: unknown; body?: unknown };
  if (received.authorization !== "Bearer mock-provider-key"
    || typeof received.body !== "string"
    || JSON.stringify(JSON.parse(received.body)) !== JSON.stringify(body)) {
    throw new Error("Docker Mock Provider did not receive the expected credential and body");
  }

  const list = await fetch("http://127.0.0.1:3001/admin/api/v1/requests", {
    headers: { authorization: "Bearer admin_dev_local" },
  }).then(value => value.json()) as { data?: { outcome?: unknown; id?: unknown }[] };
  if (!Array.isArray(list.data) || list.data.length !== 1 || list.data[0]?.outcome !== "succeeded") {
    throw new Error("Docker Request record does not contain one successful logical request");
  }

  const requestId = list.data[0]?.id;
  if (typeof requestId !== "string")
    throw new Error("Docker Request record is missing its id");
  const detail = await fetch(`http://127.0.0.1:3001/admin/api/v1/requests/${requestId}`, {
    headers: { authorization: "Bearer admin_dev_local" },
  }).then(value => value.json()) as { data?: { attempts?: unknown[] } };
  if (!Array.isArray(detail.data?.attempts) || detail.data.attempts.length !== 1) {
    throw new Error("Docker Request detail does not contain exactly one Attempt");
  }

  process.stdout.write("docker artifact smoke passed\n");
} catch (error) {
  if (started) {
    await run("docker", [...compose, "logs", "--no-color", "postgres", "mock-provider", "gateway-demo"], { allowFailure: true });
  }
  throw error;
} finally {
  if (started) {
    await run("docker", [...compose, "down", "-v", "--remove-orphans"], { allowFailure: true });
  }
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok)
        return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function run(command: string, args: string[], options: { allowFailure?: boolean } = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || options.allowFailure === true) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with ${code ?? signal ?? "unknown"}`));
      }
    });
  });
}
