import type { AddEndpointsCommand } from "../../control-plane/features/connections/contracts.js";
import type { Database } from "../../db/client.js";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../../core/errors/app-error.js";

import { endpointCredentials, providerAccounts, providerCredentials, providers, upstreamEndpoints } from "../../db/schema/index.js";
import { endpointAddress, isUniqueViolation, normalizeBaseUrl } from "./connection-create-validation.js";

export async function addEndpointBatch(db: Database, command: AddEndpointsCommand): Promise<string | null> {
  const endpoints = command.endpoints.map(endpoint => ({ ...endpoint, baseUrl: normalizeBaseUrl(endpoint.baseUrl) }));
  let providerFound = false;
  try {
    await db.transaction(async (tx) => {
      const [provider] = await tx.select({ id: providers.id }).from(providers).where(eq(providers.id, command.connectionId)).for("update").limit(1);
      if (provider === undefined)
        return;
      providerFound = true;
      validateEndpointBatch(command, endpoints, await tx.select().from(upstreamEndpoints));
      const credentialIds = [...new Set(endpoints.flatMap(endpoint => endpoint.credentialIds))];
      await assertEndpointCredentials(tx, command.connectionId, credentialIds);
      await tx.insert(upstreamEndpoints).values(endpoints.map(endpoint => ({
        id: endpoint.endpointId,
        providerId: command.connectionId,
        name: endpoint.name,
        protocol: endpoint.protocol,
        baseUrl: endpoint.baseUrl,
        requestPath: endpoint.requestPath,
        authScheme: endpoint.authScheme,
        supportsStreaming: endpoint.supportsStreaming,
        status: "active",
        createdAt: command.now,
        updatedAt: command.now,
      })));
      await tx.insert(endpointCredentials).values(endpoints.flatMap(endpoint => endpoint.credentialIds.map(credentialId => ({
        endpointId: endpoint.endpointId,
        credentialId,
        enabled: true,
        priority: 100,
        createdAt: command.now,
      }))));
      await tx.update(providers).set({ updatedAt: command.now }).where(eq(providers.id, command.connectionId));
    });
  } catch (error) {
    if (error instanceof AppError)
      throw error;
    if (isUniqueViolation(error))
      throw new AppError("CONNECTION_CONFLICT", undefined, { cause: error });
    throw error;
  }
  return providerFound ? command.connectionId : null;
}

type Transaction = Parameters<Database["transaction"]>[0] extends (arg: infer T) => unknown ? T : never;

export async function assertEndpointCredentials(
  tx: Transaction,
  providerId: string,
  credentialIds: readonly string[],
): Promise<void> {
  const rows = credentialIds.length === 0
    ? []
    : await tx.select({
        id: providerCredentials.id,
        status: providerCredentials.status,
        providerId: providerAccounts.providerId,
      }).from(providerCredentials).innerJoin(providerAccounts, eq(providerCredentials.accountId, providerAccounts.id)).where(inArray(providerCredentials.id, credentialIds)).for("update");
  const credentials = new Map(rows.map(row => [row.id, row] as const));
  if (credentialIds.some((id) => {
    const credential = credentials.get(id);
    return credential === undefined || credential.providerId !== providerId || credential.status === "disabled";
  })) {
    throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
  }
}

function validateEndpointBatch(
  command: AddEndpointsCommand,
  endpoints: readonly AddEndpointsCommand["endpoints"][number][],
  existing: readonly (typeof upstreamEndpoints.$inferSelect)[],
): void {
  if (endpoints.length === 0)
    throw new AppError("COMMON_VALIDATION_FAILED");
  const ids = new Set(existing.map(endpoint => endpoint.id));
  const names = new Set(existing.filter(endpoint => endpoint.providerId === command.connectionId).map(endpoint => endpoint.name));
  const addresses = new Set(existing.map(endpoint => endpointAddress(endpoint)));
  for (const endpoint of endpoints) {
    if (ids.has(endpoint.endpointId) || names.has(endpoint.name) || addresses.has(endpointAddress(endpoint)))
      throw new AppError("CONNECTION_CONFLICT");
    if (endpoint.credentialIds.length === 0 || new Set(endpoint.credentialIds).size !== endpoint.credentialIds.length)
      throw new AppError("COMMON_VALIDATION_FAILED");
    ids.add(endpoint.endpointId);
    names.add(endpoint.name);
    addresses.add(endpointAddress(endpoint));
  }
}
