import { randomUUID } from "node:crypto";

import type { Context } from "hono";
import { stream } from "hono/streaming";
import type { StatusCode } from "hono/utils/http-status";

import type { DataEnv } from "../../http/env.js";
import type { AttemptOutcome, RequestOutcome } from "../../../core/requests/contracts.js";
import { BoundedByteObserver } from "../../observation/bounded-byte-observer.js";
import { openAiErrorResponse } from "../../http/openai-error.js";
import { assertRoutingDecisionInvariant } from "../../routing/invariant.js";
import type { UpstreamResponse } from "../../transport/contracts.js";
import { buildUpstreamHeaders, copyUpstreamResponseHeaders } from "./headers.js";
import { readOpenAiChatRequest, type OpenAiChatRequestInfo } from "./request.js";

export async function handleOpenAiChatCompletions(c: Context<DataEnv>) {
  const dependencies = c.get("dataDependencies");
  const client = c.get("gatewayClient");
  const startedAt = dependencies.clock.now();
  const body = new Uint8Array(await c.req.arrayBuffer());

  let requestInfo: OpenAiChatRequestInfo;
  try {
    requestInfo = readOpenAiChatRequest(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON request";
    return openAiErrorResponse(c, 400, message, "invalid_request_body");
  }

  const decision = dependencies.routingSnapshotStore.resolve({
    protocol: "openai-chat",
    requestedModel: requestInfo.requestedModel,
  });
  if (decision === null) {
    return openAiErrorResponse(c, 404, "No compatible route target was found", "route_not_found");
  }
  assertRoutingDecisionInvariant({
    protocol: "openai-chat",
    requestedModel: requestInfo.requestedModel,
  }, decision);

  const providerCredential = await dependencies.providerCredentialResolver.resolve(decision.target.credentialId);
  if (providerCredential === null) {
    return openAiErrorResponse(c, 503, "The selected provider credential is unavailable", "credential_unavailable");
  }

  const requestId = randomUUID();
  const attemptId = randomUUID();
  await dependencies.requestStore.startRequestWithAttempt({
    request: {
      id: requestId,
      clientId: client.id,
      protocol: "openai-chat",
      requestedModel: requestInfo.requestedModel,
      upstreamModel: decision.target.upstreamModel,
      routingSnapshotVersion: decision.snapshotVersion,
      stream: requestInfo.stream,
      startedAt,
    },
    attempt: {
      id: attemptId,
      requestId,
      sequence: 1,
      connectionId: decision.target.connectionId,
      credentialId: decision.target.credentialId,
      upstreamModel: decision.target.upstreamModel,
      startedAt,
    },
  });

  const abortController = new AbortController();
  const abortFromClient = () => abortController.abort(new Error("client disconnected"));
  if (c.req.raw.signal.aborted) {
    abortFromClient();
  } else {
    c.req.raw.signal.addEventListener("abort", abortFromClient, { once: true });
  }
  let upstream: UpstreamResponse;
  try {
    upstream = await dependencies.transportRegistry.request({
      origin: decision.target.origin,
      path: decision.target.path,
      method: "POST",
      headers: buildUpstreamHeaders(c.req.raw.headers, providerCredential.secret),
      body,
      signal: abortController.signal,
    });
  } catch (error) {
    c.req.raw.signal.removeEventListener("abort", abortFromClient);
    const finishedAt = dependencies.clock.now();
    const cancelled = abortController.signal.aborted;
    await completeRecords(c, {
      requestId,
      attemptId,
      requestOutcome: cancelled ? "client_cancelled" : "failed",
      attemptOutcome: cancelled ? "client_cancelled" : "failed",
      statusCode: null,
      startedAt,
      finishedAt,
      ttftMs: null,
      observationStatus: "complete",
      observedBytes: 0,
      errorCode: error instanceof Error ? error.name : "UPSTREAM_REQUEST_FAILED",
    });
    return openAiErrorResponse(
      c,
      cancelled ? 408 : 502,
      cancelled ? "The client cancelled the request" : "The upstream provider could not be reached",
      cancelled ? "client_cancelled" : "upstream_unavailable",
    );
  }

  copyUpstreamResponseHeaders((name, value) => c.header(name, value), upstream.headers);
  c.header("x-gateway-request-id", requestId);
  c.status(upstream.statusCode as StatusCode);

  return stream(c, async (output) => {
    let clientCancelled = false;
    output.onAbort(() => {
      clientCancelled = true;
      abortController.abort(new Error("client disconnected"));
    });

    const observer = new BoundedByteObserver(dependencies.env.OBSERVER_MAX_BUFFER_BYTES);
    let streamError: unknown = null;
    try {
      for await (const chunk of upstream.body) {
        observer.tryWrite(chunk, dependencies.clock.now());
        await output.write(chunk);
      }
    } catch (error) {
      streamError = error;
    }

    c.req.raw.signal.removeEventListener("abort", abortFromClient);
    const finishedAt = dependencies.clock.now();
    const observation = await observer.finish();
    const statusSucceeded = upstream.statusCode >= 200 && upstream.statusCode < 300;
    const cancelled = clientCancelled || abortController.signal.aborted;
    const requestOutcome: Exclude<RequestOutcome, "running"> = cancelled
      ? "client_cancelled"
      : statusSucceeded && streamError === null
        ? "succeeded"
        : "failed";
    const attemptOutcome: Exclude<AttemptOutcome, "running"> = cancelled
      ? "client_cancelled"
      : statusSucceeded && streamError === null
        ? "succeeded"
        : "failed";

    await completeRecords(c, {
      requestId,
      attemptId,
      requestOutcome,
      attemptOutcome,
      statusCode: upstream.statusCode,
      startedAt,
      finishedAt,
      ttftMs: observation.firstByteAt === null
        ? null
        : observation.firstByteAt.getTime() - startedAt.getTime(),
      observationStatus: observation.status,
      observedBytes: observation.observedBytes,
      errorCode: streamError instanceof Error ? streamError.name : undefined,
    });

    if (streamError !== null && !cancelled) {
      throw streamError;
    }
  });
}

interface CompletionInput {
  readonly requestId: string;
  readonly attemptId: string;
  readonly requestOutcome: Exclude<RequestOutcome, "running">;
  readonly attemptOutcome: Exclude<AttemptOutcome, "running">;
  readonly statusCode: number | null;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly ttftMs: number | null;
  readonly observationStatus: "complete" | "incomplete";
  readonly observedBytes: number;
  readonly errorCode?: string;
}

async function completeRecords(c: Context<DataEnv>, input: CompletionInput): Promise<void> {
  const dependencies = c.get("dataDependencies");
  try {
    await dependencies.requestStore.completeRequestWithAttempt({
      request: {
        id: input.requestId,
        outcome: input.requestOutcome,
        statusCode: input.statusCode,
        finishedAt: input.finishedAt,
        latencyMs: input.finishedAt.getTime() - input.startedAt.getTime(),
        ttftMs: input.ttftMs,
        observationStatus: input.observationStatus,
        observedBytes: input.observedBytes,
      },
      attempt: {
        id: input.attemptId,
        outcome: input.attemptOutcome,
        statusCode: input.statusCode,
        finishedAt: input.finishedAt,
        ...(input.errorCode === undefined ? {} : { errorCode: input.errorCode }),
      },
    });
  } catch (error) {
    c.get("logger").error({ err: error, requestId: input.requestId }, "request recording completion failed");
  }
}
