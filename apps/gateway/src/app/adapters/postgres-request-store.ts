import type {
  CompleteRequestWithAttemptInput,
  GatewayAttemptRecord,
  GatewayRequestRecord,
  ProtocolId,
  RequestStore,
  RequestWithAttempts,
  StartedRequestWithAttempt,
  StartRequestWithAttemptInput,
} from "../../core/requests/contracts.js";

import type { Database } from "../../db/client.js";
import { asc, desc, eq } from "drizzle-orm";
import {
  assertCompleteRequestAttemptInvariant,
  assertStartRequestAttemptInvariant,
} from "../../data-plane/recording/invariant.js";
import { gatewayAttempts, gatewayRequests } from "../../db/schema/index.js";

export class PostgresRequestStore implements RequestStore {
  public constructor(private readonly db: Database) {}

  public async startRequestWithAttempt(
    input: StartRequestWithAttemptInput,
  ): Promise<StartedRequestWithAttempt> {
    assertStartRequestAttemptInvariant(input);
    return this.db.transaction(async (transaction) => {
      const [request] = await transaction.insert(gatewayRequests).values({
        ...input.request,
        outcome: "running",
        statusCode: null,
        finishedAt: null,
        latencyMs: null,
        ttftMs: null,
        observationStatus: "pending",
        observedBytes: 0,
      }).returning();
      if (request === undefined)
        throw new Error("request insert returned no row");

      const [attempt] = await transaction.insert(gatewayAttempts).values({
        ...input.attempt,
        outcome: "running",
        statusCode: null,
        finishedAt: null,
        errorCode: null,
        fallbackReason: null,
      }).returning();
      if (attempt === undefined)
        throw new Error("attempt insert returned no row");
      return { request: toRequest(request), attempt: toAttempt(attempt) };
    });
  }

  public async completeRequestWithAttempt(input: CompleteRequestWithAttemptInput): Promise<void> {
    assertCompleteRequestAttemptInvariant(input);
    await this.db.transaction(async (transaction) => {
      const { id: requestId, ...requestUpdates } = input.request;
      const { id: attemptId, ...attemptUpdates } = input.attempt;
      await transaction.update(gatewayRequests)
        .set(requestUpdates)
        .where(eq(gatewayRequests.id, requestId));
      await transaction.update(gatewayAttempts)
        .set({
          ...attemptUpdates,
          errorCode: input.attempt.errorCode ?? null,
          fallbackReason: input.attempt.fallbackReason ?? null,
        })
        .where(eq(gatewayAttempts.id, attemptId));
    });
  }

  public async listRequests(limit: number): Promise<readonly GatewayRequestRecord[]> {
    const rows = await this.db.select().from(gatewayRequests).orderBy(desc(gatewayRequests.startedAt)).limit(limit);
    return rows.map(toRequest);
  }

  public async getRequest(id: string): Promise<RequestWithAttempts | null> {
    const [request] = await this.db.select().from(gatewayRequests).where(eq(gatewayRequests.id, id)).limit(1);
    if (request === undefined)
      return null;
    const attempts = await this.db
      .select()
      .from(gatewayAttempts)
      .where(eq(gatewayAttempts.requestId, id))
      .orderBy(asc(gatewayAttempts.sequence));
    return { ...toRequest(request), attempts: attempts.map(toAttempt) };
  }
}

function toRequest(row: typeof gatewayRequests.$inferSelect): GatewayRequestRecord {
  return {
    ...row,
    protocol: row.protocol as ProtocolId,
    outcome: row.outcome as GatewayRequestRecord["outcome"],
    observationStatus: row.observationStatus as GatewayRequestRecord["observationStatus"],
  };
}

function toAttempt(row: typeof gatewayAttempts.$inferSelect): GatewayAttemptRecord {
  return {
    ...row,
    outcome: row.outcome as GatewayAttemptRecord["outcome"],
  };
}
