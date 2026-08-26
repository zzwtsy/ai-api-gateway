import type {
  AddEndpointsCommand,
  CompatibilityProbeRepository,
  ConnectionRecord,
  ConnectionRepository,
  EndpointDeletionImpact,
  EndpointLifecycle,
  UpdateEndpointCommand,
} from "../../control-plane/features/connections/contracts.js";
import type { ModelBindingRepository } from "../../control-plane/features/models/contracts.js";
import { AppError } from "../../core/errors/app-error.js";

import { normalizeBaseUrl } from "./connection-create-validation.js";

type EndpointMutationRepository = ConnectionRepository & {
  updateEndpoint: (command: UpdateEndpointCommand) => Promise<ConnectionRecord | null>;
  deleteEndpoint: (endpointId: string, now: Date) => Promise<ConnectionRecord | null>;
};

export class MemoryEndpointLifecycle implements EndpointLifecycle {
  public constructor(
    private readonly connections: EndpointMutationRepository,
    private readonly models: ModelBindingRepository,
    private readonly compatibility: CompatibilityProbeRepository,
  ) {}

  public addEndpoints(command: AddEndpointsCommand): Promise<ConnectionRecord | null> {
    return this.connections.addEndpoints(command);
  }

  public async updateEndpoint(command: UpdateEndpointCommand): Promise<ConnectionRecord | null> {
    const owner = await findEndpointOwner(this.connections, command.endpointId);
    if (owner === null)
      return null;
    const material = endpointChanged(owner.connection, owner.endpoint, command);
    const compatibility = await this.compatibility.listByConnection(owner.connection.id);
    if (material && hasActiveRun(compatibility.runs, command.endpointId))
      throw new AppError("ENDPOINT_ACTIVE_PROBE");
    const updated = await this.connections.updateEndpoint(command);
    if (updated === null)
      return null;
    if (material) {
      await this.compatibility.invalidateForEndpoint(command.endpointId, command.now);
      await this.models.resetForEndpoint(command.endpointId, command.now);
    }
    return updated;
  }

  public async getDeletionImpact(endpointId: string): Promise<EndpointDeletionImpact | null> {
    const owner = await findEndpointOwner(this.connections, endpointId);
    if (owner === null)
      return null;
    const [compatibility, models] = await Promise.all([
      this.compatibility.listByConnection(owner.connection.id),
      this.models.list(),
    ]);
    const profiles = compatibility.profiles.filter(profile => profile.endpointId === endpointId);
    const profileIds = new Set(profiles.map(profile => profile.id));
    const runs = compatibility.runs.filter(run => run.endpointId === endpointId);
    return {
      credentialBindingCount: owner.connection.accounts
        .flatMap(account => account.credentials)
        .filter(credential => credential.endpointIds.includes(endpointId))
        .length,
      modelBindingCount: models.filter(model => model.endpointId === endpointId).length,
      compatibilityProfileCount: profiles.length,
      compatibilityFactCount: compatibility.facts.filter(fact => profileIds.has(fact.profileId)).length,
      completedProbeRunCount: runs.filter(run => run.status === "succeeded" || run.status === "failed").length,
      activeProbeRunCount: runs.filter(run => run.status === "queued" || run.status === "running").length,
      blocked: runs.some(run => run.status === "queued" || run.status === "running"),
    };
  }

  public async deleteEndpoint(endpointId: string, now: Date): Promise<ConnectionRecord | null> {
    const owner = await findEndpointOwner(this.connections, endpointId);
    if (owner === null)
      return null;
    const compatibility = await this.compatibility.listByConnection(owner.connection.id);
    if (hasActiveRun(compatibility.runs, endpointId))
      throw new AppError("ENDPOINT_ACTIVE_PROBE");
    const deleted = await this.connections.deleteEndpoint(endpointId, now);
    if (deleted === null)
      return null;
    await this.compatibility.deleteForEndpoint(endpointId);
    await this.models.deleteForEndpoint(endpointId);
    return deleted;
  }
}

async function findEndpointOwner(
  repository: ConnectionRepository,
  endpointId: string,
): Promise<{ readonly connection: ConnectionRecord; readonly endpoint: ConnectionRecord["endpoints"][number] } | null> {
  const connections = await repository.list();
  for (const connection of connections) {
    const endpoint = connection.endpoints.find(item => item.id === endpointId);
    if (endpoint !== undefined)
      return { connection, endpoint };
  }
  return null;
}

function endpointChanged(
  connection: ConnectionRecord,
  endpoint: ConnectionRecord["endpoints"][number],
  command: UpdateEndpointCommand,
): boolean {
  if (endpoint.protocol !== command.protocol
    || endpoint.baseUrl !== normalizeBaseUrl(command.baseUrl)
    || endpoint.requestPath !== command.requestPath
    || endpoint.authScheme !== command.authScheme
    || endpoint.supportsStreaming !== command.supportsStreaming) {
    return true;
  }
  const selected = new Set(command.credentialIds);
  const current = new Set(connection.accounts
    .flatMap(account => account.credentials)
    .filter(credential => credential.endpointIds.includes(endpoint.id))
    .map(credential => credential.id));
  return selected.size !== current.size || [...selected].some(id => !current.has(id));
}

function hasActiveRun(
  runs: readonly { readonly endpointId: string; readonly status: string }[],
  endpointId: string,
): boolean {
  return runs.some(run => run.endpointId === endpointId && (run.status === "queued" || run.status === "running"));
}
