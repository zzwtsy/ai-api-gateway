import type {
  ConnectionDeletionImpact,
  ConnectionDeletionResult,
  ConnectionLifecycle,
} from "../../control-plane/features/connections/contracts.js";
import type { Database } from "../../db/client.js";

import { and, eq, inArray } from "drizzle-orm";

import { AppError } from "../../core/errors/app-error.js";
import {
  compatibilityFacts,
  compatibilityProbeRuns,
  compatibilityProfiles,
  endpointCredentials,
  providerAccounts,
  providerCredentials,
  providerModelBindings,
  providers,
  upstreamEndpoints,
} from "../../db/schema/index.js";

export class PostgresConnectionLifecycle implements ConnectionLifecycle {
  public constructor(private readonly db: Database) {}

  public async getDeletionImpact(connectionId: string): Promise<ConnectionDeletionImpact | null> {
    const [provider] = await this.db.select({ id: providers.id })
      .from(providers)
      .where(eq(providers.id, connectionId))
      .limit(1);
    if (provider === undefined)
      return null;

    const [endpoints, accounts, credentials, bindings, models, profiles, facts, runs] = await Promise.all([
      this.db.select({ id: upstreamEndpoints.id })
        .from(upstreamEndpoints)
        .where(eq(upstreamEndpoints.providerId, connectionId)),
      this.db.select({ id: providerAccounts.id })
        .from(providerAccounts)
        .where(eq(providerAccounts.providerId, connectionId)),
      this.db.select({ id: providerCredentials.id })
        .from(providerCredentials)
        .innerJoin(providerAccounts, eq(providerCredentials.accountId, providerAccounts.id))
        .where(eq(providerAccounts.providerId, connectionId)),
      this.db.select({ endpointId: endpointCredentials.endpointId })
        .from(endpointCredentials)
        .innerJoin(upstreamEndpoints, eq(endpointCredentials.endpointId, upstreamEndpoints.id))
        .where(eq(upstreamEndpoints.providerId, connectionId)),
      this.db.select({ id: providerModelBindings.id })
        .from(providerModelBindings)
        .innerJoin(upstreamEndpoints, eq(providerModelBindings.endpointId, upstreamEndpoints.id))
        .where(eq(upstreamEndpoints.providerId, connectionId)),
      this.db.select({ id: compatibilityProfiles.id })
        .from(compatibilityProfiles)
        .where(eq(compatibilityProfiles.connectionId, connectionId)),
      this.db.select({ profileId: compatibilityFacts.profileId })
        .from(compatibilityFacts)
        .innerJoin(compatibilityProfiles, eq(compatibilityFacts.profileId, compatibilityProfiles.id))
        .where(eq(compatibilityProfiles.connectionId, connectionId)),
      this.db.select({ status: compatibilityProbeRuns.status })
        .from(compatibilityProbeRuns)
        .where(eq(compatibilityProbeRuns.connectionId, connectionId)),
    ]);
    const activeProbeRunCount = runs.filter(run => isActiveProbe(run.status)).length;
    const blockedReason = activeProbeRunCount > 0 ? "active_probe" as const : null;

    return {
      endpointCount: endpoints.length,
      accountCount: accounts.length,
      credentialCount: credentials.length,
      credentialBindingCount: bindings.length,
      modelBindingCount: models.length,
      compatibilityProfileCount: profiles.length,
      compatibilityFactCount: facts.length,
      completedProbeRunCount: runs.filter(run => isCompletedProbe(run.status)).length,
      activeProbeRunCount,
      blocked: blockedReason !== null,
      blockedReason,
    };
  }

  public async deleteConnection(connectionId: string): Promise<ConnectionDeletionResult | null> {
    return this.db.transaction(async (tx) => {
      const [provider] = await tx.select({ id: providers.id })
        .from(providers)
        .where(eq(providers.id, connectionId))
        .for("update")
        .limit(1);
      if (provider === undefined)
        return null;
      const [activeProbe] = await tx.select({ id: compatibilityProbeRuns.id })
        .from(compatibilityProbeRuns)
        .where(and(
          eq(compatibilityProbeRuns.connectionId, connectionId),
          inArray(compatibilityProbeRuns.status, ["queued", "running"]),
        ))
        .for("update")
        .limit(1);
      if (activeProbe !== undefined)
        throw new AppError("CONNECTION_ACTIVE_PROBE");

      // ProbeRun keeps a RESTRICT reference to Credential; remove its Profile cascade first.
      await tx.delete(compatibilityProfiles)
        .where(eq(compatibilityProfiles.connectionId, connectionId));
      await tx.delete(providers)
        .where(eq(providers.id, connectionId));
      return { connectionId };
    });
  }
}

function isActiveProbe(status: string): boolean {
  return status === "queued" || status === "running";
}

function isCompletedProbe(status: string): boolean {
  return status === "succeeded" || status === "failed";
}
