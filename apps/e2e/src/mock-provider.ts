import type { IncomingMessage, ServerResponse } from "node:http";

import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";

interface CapturedRequest {
  readonly path: string;
  readonly authorization: string | undefined;
  readonly body: string;
}

let lastRequest: CapturedRequest | null = null;

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (request.url === "/received") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(lastRequest));
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404);
    response.end();
    return;
  }

  const body = await readBody(request);
  lastRequest = {
    path: request.url,
    authorization: request.headers.authorization,
    body,
  };
  if (request.headers.authorization !== "Bearer mock-provider-key") {
    sendJson(response, 401, { error: { message: "invalid provider credential" } });
    return;
  }

  const parsed = JSON.parse(body) as { model?: string; stream?: boolean };
  if (parsed.stream === true) {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    });
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-e2e", model: parsed.model, choices: [{ delta: { content: "hello" } }] })}\n\n`);
    setTimeout(() => {
      response.end("data: [DONE]\n\n");
    }, 15);
    return;
  }

  sendJson(response, 200, {
    id: "chatcmpl-e2e",
    model: parsed.model,
    choices: [{ message: { role: "assistant", content: "hello" } }],
  });
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
