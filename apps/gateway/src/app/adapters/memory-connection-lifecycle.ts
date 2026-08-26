import type {
  CompatibilityProbeRepository,
  ConnectionDeletionImpact,
  ConnectionLifecycle,
  ConnectionRecord,
  ConnectionRepository,
} from "../../control-plane/features/connections/contracts.js";
import type { ModelBindingRepository } from "../../control-plane/features/models/contracts.js";

import { AppError } from "../../core/errors/app-error.js";

type ConnectionMutationRepository = ConnectionRepository & {
  deleteConnection: (connectionId: string) => Promise<ConnectionRecord | null>;
};

export class MemoryConnectionLifecycle implements ConnectionLifecycle {
  public constructor(
    private readonly connections: ConnectionMutationRepository,
    private readonly models: ModelBindingRepository,
    private readonly compatibility: CompatibilityProbeRepository,
  ) {}

  public async getDeletionImpact(connectionId: string): Promise<ConnectionDeletionImpact | null> {
    const connection = await this.connections.getById(connectionId);
    if (connection === null)
      return null;

    const [compatibility, models] = await Promise.all([
      this.compatibility.listByConnection(connectionId),
      this.models.list(),
    ]);
    const profileIds = new Set(compatibility.profiles.map(profile => profile.id));
    const activeProbeRunCount = compatibility.runs.filter(run => isActiveProbe(run.status)).length;
    const blockedReason = activeProbeRunCount > 0 ? "active_probe" as const : null;

    return {
      endpointCount: connection.endpoints.length,
      accountCount: connection.accounts.length,
      credentialCount: connection.accounts.reduce((count, account) => count + account.credentials.length, 0),
      credentialBindingCount: connection.accounts
        .flatMap(account => account.credentials)
        .reduce((count, credential) => count + credential.endpointIds.length, 0),
      modelBindingCount: models.filter(model => connection.endpoints.some(endpoint => endpoint.id === model.endpointId)).length,
      compatibilityProfileCount: compatibility.profiles.length,
      compatibilityFactCount: compatibility.facts.filter(fact => profileIds.has(fact.profileId)).length,
      completedProbeRunCount: compatibility.runs.filter(run => isCompletedProbe(run.status)).length,
      activeProbeRunCount,
      blocked: blockedReason !== null,
      blockedReason,
    };
  }

  public async deleteConnection(connectionId: string) {
    const connection = await this.connections.getById(connectionId);
    if (connection === null)
      return null;
    const compatibility = await this.compatibility.listByConnection(connectionId);
    if (compatibility.runs.some(run => isActiveProbe(run.status)))
      throw new AppError("CONNECTION_ACTIVE_PROBE");

    await Promise.all(connection.endpoints.map(endpoint => this.compatibility.deleteForEndpoint(endpoint.id)));
    await Promise.all(connection.endpoints.map(endpoint => this.models.deleteForEndpoint(endpoint.id)));
    const deleted = await this.connections.deleteConnection(connectionId);
    return deleted === null ? null : { connectionId };
  }
}

function isActiveProbe(status: string): boolean {
  return status === "queued" || status === "running";
}

function isCompletedProbe(status: string): boolean {
  return status === "succeeded" || status === "failed";
}
