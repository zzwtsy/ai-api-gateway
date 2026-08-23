import type {
  CompleteRequestWithAttemptInput,
  GatewayAttemptRecord,
  GatewayRequestRecord,
  RequestStore,
  RequestWithAttempts,
  StartedRequestWithAttempt,
  StartRequestWithAttemptInput,
} from "../../core/requests/contracts.js";
import {
  assertCompleteRequestAttemptInvariant,
  assertStartRequestAttemptInvariant,
} from "../../data-plane/recording/invariant.js";

export class MemoryRequestStore implements RequestStore {
  readonly #requests = new Map<string, GatewayRequestRecord>();
  readonly #attempts = new Map<string, GatewayAttemptRecord>();

  public async startRequestWithAttempt(
    input: StartRequestWithAttemptInput,
  ): Promise<StartedRequestWithAttempt> {
    assertStartRequestAttemptInvariant(input);
    const request: GatewayRequestRecord = {
      ...input.request,
      outcome: "running",
      statusCode: null,
      finishedAt: null,
      latencyMs: null,
      ttftMs: null,
      observationStatus: "pending",
      observedBytes: 0,
    };
    const attempt: GatewayAttemptRecord = {
      ...input.attempt,
      outcome: "running",
      statusCode: null,
      finishedAt: null,
      errorCode: null,
      fallbackReason: null,
    };
    this.#requests.set(request.id, request);
    this.#attempts.set(attempt.id, attempt);
    return { request, attempt };
  }

  public async completeRequestWithAttempt(input: CompleteRequestWithAttemptInput): Promise<void> {
    assertCompleteRequestAttemptInvariant(input);
    const request = this.#requests.get(input.request.id);
    const attempt = this.#attempts.get(input.attempt.id);
    if (request === undefined || attempt === undefined) {
      return;
    }
    this.#requests.set(request.id, { ...request, ...input.request });
    this.#attempts.set(attempt.id, {
      ...attempt,
      ...input.attempt,
      errorCode: input.attempt.errorCode ?? null,
      fallbackReason: input.attempt.fallbackReason ?? null,
    });
  }

  public async listRequests(limit: number): Promise<readonly GatewayRequestRecord[]> {
    return [...this.#requests.values()]
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
      .slice(0, limit);
  }

  public async getRequest(id: string): Promise<RequestWithAttempts | null> {
    const request = this.#requests.get(id);
    if (request === undefined) return null;
    const attempts = [...this.#attempts.values()]
      .filter((attempt) => attempt.requestId === id)
      .sort((left, right) => left.sequence - right.sequence);
    return { ...request, attempts };
  }
}
