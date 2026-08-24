import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import process from "node:process";

const compose = ["compose", "--profile", "demo"];
const gatewayPort = process.env.AIGW_DOCKER_GATEWAY_PORT ?? "3301";
const providerPort = process.env.AIGW_DOCKER_PROVIDER_PORT ?? "4310";
const composeEnvironment = {
  ...process.env,
  AIGW_DOCKER_GATEWAY_PORT: gatewayPort,
  AIGW_DOCKER_PROVIDER_PORT: providerPort,
  BETTER_AUTH_SECRET: "docker-smoke-only-better-auth-secret",
  GATEWAY_CLIENT_KEY: "docker-smoke-only-gateway-client-key",
  GATEWAY_KEY_PEPPER: "docker-smoke-only-gateway-key-pepper",
  PROVIDER_SECRET_ACTIVE_KEY_ID: "docker-smoke-v1",
  PROVIDER_SECRET_KEYRING: JSON.stringify({
    "docker-smoke-v1": Buffer.alloc(32, 11).toString("base64"),
  }),
  PROVIDER_SECRET_FINGERPRINT_PEPPER: "docker-smoke-only-provider-fingerprint-pepper",
  BOOTSTRAP_PROVIDER_BASE_URL: "http://mock-provider:4010",
  BOOTSTRAP_PROVIDER_API_KEY: "docker-smoke-only-provider-key",
};
let composeInvoked = false;

try {
  composeInvoked = true;
  await run("docker", [...compose, "up", "-d", "--build", "gateway-demo"]);
  await waitFor(`http://127.0.0.1:${gatewayPort}/healthz`, 90_000);

  const body = {
    model: "demo-model",
    stream: true,
    messages: [{ role: "user", content: "artifact smoke" }],
    unknown_provider_extension: { preserved: true },
  };
  const response = await fetch(`http://127.0.0.1:${gatewayPort}/openai/v1/chat/completions`, {
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

  const received = await fetch(`http://127.0.0.1:${providerPort}/received`).then(value => value.json()) as { authorization?: unknown; body?: unknown };
  if (received.authorization !== "Bearer mock-provider-key"
    || typeof received.body !== "string"
    || JSON.stringify(JSON.parse(received.body)) !== JSON.stringify(body)) {
    throw new Error("Docker Mock Provider did not receive the expected credential and body");
  }

  const list = await fetch(`http://127.0.0.1:${gatewayPort}/admin/api/v1/requests`, {
    headers: { authorization: "Bearer admin_dev_local" },
  }).then(value => value.json()) as { data?: { outcome?: unknown; id?: unknown }[] };
  if (!Array.isArray(list.data) || list.data.length !== 1 || list.data[0]?.outcome !== "succeeded") {
    throw new Error("Docker Request record does not contain one successful logical request");
  }

  const requestId = list.data[0]?.id;
  if (typeof requestId !== "string")
    throw new Error("Docker Request record is missing its id");
  const detail = await fetch(`http://127.0.0.1:${gatewayPort}/admin/api/v1/requests/${requestId}`, {
    headers: { authorization: "Bearer admin_dev_local" },
  }).then(value => value.json()) as { data?: { attempts?: unknown[] } };
  if (!Array.isArray(detail.data?.attempts) || detail.data.attempts.length !== 1) {
    throw new Error("Docker Request detail does not contain exactly one Attempt");
  }

  process.stdout.write("docker artifact smoke passed\n");
} catch (error) {
  if (composeInvoked) {
    await run("docker", [...compose, "logs", "--no-color", "postgres", "mock-provider", "gateway-demo"], { allowFailure: true });
  }
  throw error;
} finally {
  if (composeInvoked) {
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
    const child = spawn(command, args, { stdio: "inherit", env: composeEnvironment });
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
