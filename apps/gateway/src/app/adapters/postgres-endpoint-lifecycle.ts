import type {
  AddEndpointsCommand,
  ConnectionRecord,
  ConnectionRepository,
  EndpointDeletionImpact,
  EndpointLifecycle,
  UpdateEndpointCommand,
} from "../../control-plane/features/connections/contracts.js";
import type { Database } from "../../db/client.js";
import { and, eq, sql } from "drizzle-orm";
import { AppError } from "../../core/errors/app-error.js";

import {
  compatibilityFacts,
  compatibilityProbeRuns,
  compatibilityProfiles,
  endpointCredentials,
  providerModelBindings,
  providers,
  upstreamEndpoints,
} from "../../db/schema/index.js";
import { endpointAddress, isUniqueViolation, normalizeBaseUrl } from "./connection-create-validation.js";
import { assertEndpointCredentials } from "./postgres-connection-endpoint-operations.js";

export class PostgresEndpointLifecycle implements EndpointLifecycle {
  public constructor(
    private readonly db: Database,
    private readonly connections: ConnectionRepository,
  ) {}

  public addEndpoints(command: AddEndpointsCommand): Promise<ConnectionRecord | null> {
    return this.connections.addEndpoints(command);
  }

  public async updateEndpoint(command: UpdateEndpointCommand): Promise<ConnectionRecord | null> {
    const providerId = await this.db.transaction(async (tx) => {
      const [endpoint] = await tx.select().from(upstreamEndpoints).where(eq(upstreamEndpoints.id, command.endpointId)).for("update").limit(1);
      if (endpoint === undefined)
        return null;
      const existingBindings = await tx.select({ credentialId: endpointCredentials.credentialId })
        .from(endpointCredentials)
        .where(eq(endpointCredentials.endpointId, command.endpointId));
      const normalizedBaseUrl = normalizeBaseUrl(command.baseUrl);
      const existingEndpoints = await tx.select().from(upstreamEndpoints);
      validateEndpointUpdate(command, normalizedBaseUrl, existingEndpoints, endpoint.id, endpoint.providerId);
      const material = hasMaterialChange(endpoint, existingBindings.map(binding => binding.credentialId), command, normalizedBaseUrl);
      if (material)
        await assertNoActiveProbe(tx, command.endpointId);
      const credentialIds = [...new Set(command.credentialIds)];
      await assertEndpointCredentials(tx, endpoint.providerId, credentialIds);
      await tx.update(upstreamEndpoints).set({
        name: command.name,
        protocol: command.protocol,
        baseUrl: normalizedBaseUrl,
        requestPath: command.requestPath,
        authScheme: command.authScheme,
        supportsStreaming: command.supportsStreaming,
        updatedAt: command.now,
      }).where(eq(upstreamEndpoints.id, command.endpointId));
      await tx.delete(endpointCredentials).where(eq(endpointCredentials.endpointId, command.endpointId));
      await tx.insert(endpointCredentials).values(credentialIds.map(credentialId => ({
        endpointId: command.endpointId,
        credentialId,
        enabled: true,
        priority: 100,
        createdAt: command.now,
      })));
      if (material)
        await invalidateDependentEvidence(tx, command.endpointId, command.now);
      await tx.update(providers).set({ updatedAt: command.now }).where(eq(providers.id, endpoint.providerId));
      return endpoint.providerId;
    }).catch((error) => {
      if (error instanceof AppError)
        throw error;
      if (isUniqueViolation(error))
        throw new AppError("CONNECTION_CONFLICT", undefined, { cause: error });
      throw error;
    });
    if (providerId === null)
      return null;
    return this.connections.getById(providerId);
  }

  public async getDeletionImpact(endpointId: string): Promise<EndpointDeletionImpact | null> {
    const [endpoint] = await this.db.select({ id: upstreamEndpoints.id }).from(upstreamEndpoints).where(eq(upstreamEndpoints.id, endpointId)).limit(1);
    if (endpoint === undefined)
      return null;
    const [bindings, models, profiles, facts, runs] = await Promise.all([
      this.db.select({ id: endpointCredentials.credentialId }).from(endpointCredentials).where(eq(endpointCredentials.endpointId, endpointId)),
      this.db.select({ id: providerModelBindings.id }).from(providerModelBindings).where(eq(providerModelBindings.endpointId, endpointId)),
      this.db.select({ id: compatibilityProfiles.id }).from(compatibilityProfiles).where(eq(compatibilityProfiles.endpointId, endpointId)),
      this.db.select({ id: compatibilityFacts.profileId }).from(compatibilityFacts).innerJoin(compatibilityProfiles, eq(compatibilityFacts.profileId, compatibilityProfiles.id)).where(eq(compatibilityProfiles.endpointId, endpointId)),
      this.db.select({ status: compatibilityProbeRuns.status }).from(compatibilityProbeRuns).where(eq(compatibilityProbeRuns.endpointId, endpointId)),
    ]);
    const activeProbeRunCount = runs.filter(run => run.status === "queued" || run.status === "running").length;
    return {
      credentialBindingCount: bindings.length,
      modelBindingCount: models.length,
      compatibilityProfileCount: profiles.length,
      compatibilityFactCount: facts.length,
      completedProbeRunCount: runs.filter(run => run.status === "succeeded" || run.status === "failed").length,
      activeProbeRunCount,
      blocked: activeProbeRunCount > 0,
    };
  }

  public async deleteEndpoint(endpointId: string, now: Date): Promise<ConnectionRecord | null> {
    const providerId = await this.db.transaction(async (tx) => {
      const [endpoint] = await tx.select({ providerId: upstreamEndpoints.providerId }).from(upstreamEndpoints).where(eq(upstreamEndpoints.id, endpointId)).for("update").limit(1);
      if (endpoint === undefined)
        return null;
      await assertNoActiveProbe(tx, endpointId);
      await tx.delete(upstreamEndpoints).where(eq(upstreamEndpoints.id, endpointId));
      await tx.update(providers).set({ updatedAt: now }).where(eq(providers.id, endpoint.providerId));
      return endpoint.providerId;
    });
    if (providerId === null)
      return null;
    return this.connections.getById(providerId);
  }
}

function validateEndpointUpdate(
  command: UpdateEndpointCommand,
  normalizedBaseUrl: string,
  existing: readonly (typeof upstreamEndpoints.$inferSelect)[],
  endpointId: string,
  providerId: string,
): void {
  const others = existing.filter(endpoint => endpoint.id !== endpointId);
  if (others.some(endpoint => endpoint.providerId === providerId && endpoint.name === command.name))
    throw new AppError("CONNECTION_CONFLICT");
  if (others.some(endpoint => endpointAddress(endpoint) === endpointAddress({ ...command, baseUrl: normalizedBaseUrl })))
    throw new AppError("CONNECTION_CONFLICT");
  if (command.credentialIds.length === 0 || new Set(command.credentialIds).size !== command.credentialIds.length)
    throw new AppError("COMMON_VALIDATION_FAILED");
}

function hasMaterialChange(
  endpoint: typeof upstreamEndpoints.$inferSelect,
  bindingIds: readonly string[],
  command: UpdateEndpointCommand,
  normalizedBaseUrl: string,
): boolean {
  return endpoint.protocol !== command.protocol
    || endpoint.baseUrl !== normalizedBaseUrl
    || endpoint.requestPath !== command.requestPath
    || endpoint.authScheme !== command.authScheme
    || endpoint.supportsStreaming !== command.supportsStreaming
    || !sameSet(bindingIds, command.credentialIds);
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return left.length === rightSet.size && left.every(item => rightSet.has(item));
}

async function assertNoActiveProbe(tx: Parameters<Database["transaction"]>[0] extends (arg: infer T) => unknown ? T : never, endpointId: string): Promise<void> {
  const [run] = await tx.select({ id: compatibilityProbeRuns.id }).from(compatibilityProbeRuns).where(and(
    eq(compatibilityProbeRuns.endpointId, endpointId),
    sql`${compatibilityProbeRuns.status} in ('queued', 'running')`,
  )).for("update").limit(1);
  if (run !== undefined)
    throw new AppError("ENDPOINT_ACTIVE_PROBE");
}

async function invalidateDependentEvidence(
  tx: Parameters<Database["transaction"]>[0] extends (arg: infer T) => unknown ? T : never,
  endpointId: string,
  now: Date,
): Promise<void> {
  await tx.delete(compatibilityFacts).where(sql`${compatibilityFacts.profileId} in (
    select ${compatibilityProfiles.id} from ${compatibilityProfiles}
    where ${compatibilityProfiles.endpointId} = ${endpointId}
  )`);
  await tx.update(compatibilityProfiles).set({
    status: "unverified",
    lastProbeAt: null,
    summary: null,
    updatedAt: now,
  }).where(eq(compatibilityProfiles.endpointId, endpointId));
  await tx.update(providerModelBindings).set({
    status: "unverified",
    updatedAt: now,
  }).where(eq(providerModelBindings.endpointId, endpointId));
}
