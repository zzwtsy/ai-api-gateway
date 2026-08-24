import type { IncomingMessage, ServerResponse } from "node:http";

import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

interface CapturedRequest {
  readonly path: string;
  readonly authorization: string | undefined;
  readonly body: string;
}

let lastRequest: CapturedRequest | null = null;
const requestsByModel = new Map<string, CapturedRequest[]>();
const lastModelByAuthorization = new Map<string, string>();

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://mock-provider.local");
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (url.pathname === "/received") {
    const model = url.searchParams.get("model");
    const history = url.searchParams.get("history") === "true";
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(
      model === null
        ? lastRequest
        : history
          ? requestsByModel.get(model) ?? []
          : requestsByModel.get(model)?.at(-1) ?? null,
    ));
    return;
  }
  if (request.method === "GET" && url.pathname === "/v1/models") {
    if (!isAcceptedAuthorization(request.headers.authorization)) {
      sendJson(response, 401, { error: { message: "invalid provider credential" } });
      return;
    }
    sendJson(response, 200, {
      object: "list",
      data: [
        { id: "demo-model", object: "model" },
        { id: "demo-reasoning-model", object: "model" },
      ],
    });
    return;
  }
  if (request.method !== "POST" || url.pathname !== "/v1/chat/completions") {
    response.writeHead(404);
    response.end();
    return;
  }

  const body = await readBody(request);
  const capturedRequest = {
    path: url.pathname,
    authorization: request.headers.authorization,
    body,
  };
  lastRequest = capturedRequest;
  const authorization = request.headers.authorization;
  if (!isAcceptedAuthorization(authorization)) {
    sendJson(response, 401, { error: { message: "invalid provider credential" } });
    return;
  }

  const parsed = JSON.parse(body) as Record<string, unknown>;
  const requestedModel = parsed.model === undefined ? undefined : String(parsed.model);
  const model = requestedModel ?? lastModelByAuthorization.get(authorization);
  if (requestedModel !== undefined)
    lastModelByAuthorization.set(authorization, requestedModel);
  if (model !== undefined) {
    const history = requestsByModel.get(model) ?? [];
    history.push(capturedRequest);
    requestsByModel.set(model, history);
  }
  await delay(120);
  if (parsed.model === undefined) {
    sendJson(response, 400, { error: { message: "model is required", type: "invalid_request_error" } });
    return;
  }
  if (parsed.stream === true) {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    });
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-e2e", model: parsed.model, choices: [{ delta: { content: "hello" } }] })}\n\n`);
    if (parsed.stream_options !== undefined) {
      response.write(`data: ${JSON.stringify({ id: "chatcmpl-e2e", model: parsed.model, choices: [], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\n`);
    }
    setTimeout(() => {
      response.end("data: [DONE]\n\n");
    }, 120);
    return;
  }

  if (parsed.tools !== undefined) {
    const toolName = readToolName(parsed.tool_choice) ?? "aigw_probe";
    sendJson(response, 200, {
      id: "chatcmpl-e2e",
      model: parsed.model,
      choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "call-e2e", type: "function", function: { name: toolName, arguments: "{\"ok\":true}" } }] } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    return;
  }
  if (parsed.response_format !== undefined) {
    sendJson(response, 200, {
      id: "chatcmpl-e2e",
      model: parsed.model,
      choices: [{ message: { role: "assistant", content: "{\"ok\":true}" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    return;
  }
  if (parsed.reasoning_effort !== undefined) {
    sendJson(response, 200, {
      id: "chatcmpl-e2e",
      model: parsed.model,
      choices: [{ message: { role: "assistant", content: "hello" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, completion_tokens_details: { reasoning_tokens: 1 } },
    });
    return;
  }

  sendJson(response, 200, {
    id: "chatcmpl-e2e",
    model: parsed.model,
    choices: [{ message: { role: "assistant", content: "hello" } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });
}

function isAcceptedAuthorization(value: string | undefined): value is string {
  return value === "Bearer mock-provider-key"
    || /^Bearer mock-provider-[\da-f]{8}-key$/u.test(value ?? "");
}

function readToolName(value: unknown): string | null {
  if (typeof value !== "object" || value === null)
    return null;
  const functionChoice = (value as Record<string, unknown>).function;
  if (typeof functionChoice !== "object" || functionChoice === null)
    return null;
  const name = (functionChoice as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

const host = process.env.MOCK_PROVIDER_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.MOCK_PROVIDER_PORT ?? "4010", 10);

server.listen(port, host, () => {
  process.stdout.write(`Mock Provider listening on http://${host}:${port}\n`);
});

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
