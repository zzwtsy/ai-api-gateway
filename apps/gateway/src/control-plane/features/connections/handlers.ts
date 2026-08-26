import type { ControlPlaneDependencies } from "../../dependencies.js";
import type { AppRouteHandler } from "../../http/context.js";

import type { CompatibilityProbeRunRecord, ConnectionRecord } from "./contracts.js";
import type {
  AddConnectionEndpointRoute,
  CreateConnectionRoute,
  DeleteConnectionRoute,
  DeleteEndpointRoute,
  DisableProviderCredentialRoute,
  DiscoverUpstreamModelsRoute,
  GetConnectionCompatibilityRoute,
  GetConnectionDeletionImpactRoute,
  GetConnectionRoute,
  GetEndpointDeletionImpactRoute,
  ListConnectionsRoute,
  ProbeEndpointRoute,
  ProbeProviderCredentialRoute,
  RotateProviderCredentialRoute,
  UpdateEndpointRoute,
} from "./routes.js";
import type {
  CompatibilityProbeRunView,
  ConnectionCompatibilityView,
  ConnectionView,
  CredentialProbeResultView,
  UpstreamModelCatalogView,
} from "./schemas.js";
import { successResponse } from "../../http/response.js";
import { CompatibilityProbeService } from "./compatibility-service.js";
import { ModelDiscoveryService } from "./model-discovery-service.js";
import { ConnectionService } from "./service.js";

export const listConnectionsHandler: AppRouteHandler<ListConnectionsRoute> = async (c) => {
  const service = createService(c.get("controlDependencies"));
  const items = await service.list();
  return successResponse(c, items.map(toView));
};

export const getConnectionHandler: AppRouteHandler<GetConnectionRoute> = async (c) => {
  const service = createService(c.get("controlDependencies"));
  const { connectionId } = c.req.valid("param");
  return successResponse(c, toView(await service.getById(connectionId)));
};

export const createConnectionHandler: AppRouteHandler<CreateConnectionRoute> = async (c) => {
  const service = createService(c.get("controlDependencies"));
  const item = await service.create(c.req.valid("json"));
  return successResponse(c, toView(item), { status: 201 });
};

export const getConnectionDeletionImpactHandler: AppRouteHandler<GetConnectionDeletionImpactRoute> = async (c) => {
  const { connectionId } = c.req.valid("param");
  return successResponse(c, await createService(c.get("controlDependencies")).getConnectionDeletionImpact(connectionId));
};

export const deleteConnectionHandler: AppRouteHandler<DeleteConnectionRoute> = async (c) => {
  const { connectionId } = c.req.valid("param");
  return successResponse(c, await createService(c.get("controlDependencies")).deleteConnection(connectionId));
};

export const addConnectionEndpointHandler: AppRouteHandler<AddConnectionEndpointRoute> = async (c) => {
  const { connectionId } = c.req.valid("param");
  const item = await createService(c.get("controlDependencies")).addEndpoints(connectionId, c.req.valid("json").endpoints);
  return successResponse(c, toView(item), { status: 201 });
};

export const updateEndpointHandler: AppRouteHandler<UpdateEndpointRoute> = async (c) => {
  const { endpointId } = c.req.valid("param");
  const item = await createService(c.get("controlDependencies")).updateEndpoint(endpointId, c.req.valid("json"));
  return successResponse(c, toView(item));
};

export const getEndpointDeletionImpactHandler: AppRouteHandler<GetEndpointDeletionImpactRoute> = async (c) => {
  const { endpointId } = c.req.valid("param");
  return successResponse(c, await createService(c.get("controlDependencies")).getEndpointDeletionImpact(endpointId));
};

export const deleteEndpointHandler: AppRouteHandler<DeleteEndpointRoute> = async (c) => {
  const { endpointId } = c.req.valid("param");
  const item = await createService(c.get("controlDependencies")).deleteEndpoint(endpointId);
  return successResponse(c, toView(item));
};

export const rotateProviderCredentialHandler: AppRouteHandler<RotateProviderCredentialRoute> = async (c) => {
  const service = createService(c.get("controlDependencies"));
  const { credentialId } = c.req.valid("param");
  const { secret } = c.req.valid("json");
  return successResponse(c, toView(await service.rotateCredential(credentialId, secret)));
};

export const disableProviderCredentialHandler: AppRouteHandler<DisableProviderCredentialRoute> = async (c) => {
  const service = createService(c.get("controlDependencies"));
  const { credentialId } = c.req.valid("param");
  return successResponse(c, toView(await service.disableCredential(credentialId)));
};

export const probeProviderCredentialHandler: AppRouteHandler<ProbeProviderCredentialRoute> = async (c) => {
  const { credentialId } = c.req.valid("param");
  const { endpointId, model } = c.req.valid("json");
  const result = await createService(c.get("controlDependencies")).probeCredential(credentialId, endpointId, model);
  return successResponse(c, {
    ...result,
    checkedAt: result.checkedAt.toISOString(),
  } satisfies CredentialProbeResultView);
};

export const probeEndpointHandler: AppRouteHandler<ProbeEndpointRoute> = async (c) => {
  const { endpointId } = c.req.valid("param");
  const { credentialId, model } = c.req.valid("json");
  const run = await createCompatibilityService(c.get("controlDependencies")).start({
    endpointId,
    credentialId,
    model,
  });
  return successResponse(c, toRunView(run), { status: 202 });
};

export const discoverUpstreamModelsHandler: AppRouteHandler<DiscoverUpstreamModelsRoute> = async (c) => {
  const { endpointId } = c.req.valid("param");
  const { credentialId, modelsPath } = c.req.valid("json");
  const result = await createModelDiscoveryService(c.get("controlDependencies")).discover({
    endpointId,
    credentialId,
    modelsPath,
  });
  return successResponse(c, result satisfies UpstreamModelCatalogView);
};

export const getConnectionCompatibilityHandler: AppRouteHandler<GetConnectionCompatibilityRoute> = async (c) => {
  const { connectionId } = c.req.valid("param");
  const result = await createCompatibilityService(c.get("controlDependencies")).list(connectionId);
  return successResponse(c, {
    profiles: result.profiles.map(profile => ({
      ...profile,
      lastProbeAt: profile.lastProbeAt?.toISOString() ?? null,
    })),
    facts: result.facts.map(fact => ({ ...fact, verifiedAt: fact.verifiedAt.toISOString() })),
    runs: result.runs.map(toRunView),
  } satisfies ConnectionCompatibilityView);
};

function toView(item: ConnectionRecord): ConnectionView {
  return {
    ...item,
    endpoints: [...item.endpoints],
    accounts: item.accounts.map(account => ({
      ...account,
      credentials: account.credentials.map(credential => ({
        ...credential,
        endpointIds: [...credential.endpointIds],
        lastSuccessAt: credential.lastSuccessAt?.toISOString() ?? null,
        lastFailureAt: credential.lastFailureAt?.toISOString() ?? null,
        createdAt: credential.createdAt.toISOString(),
        updatedAt: credential.updatedAt.toISOString(),
        rotatedAt: credential.rotatedAt?.toISOString() ?? null,
        disabledAt: credential.disabledAt?.toISOString() ?? null,
      })),
    })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function createService(dependencies: ControlPlaneDependencies): ConnectionService {
  return new ConnectionService(
    dependencies.connectionRepository,
    dependencies.secretCipher,
    dependencies.clock,
    dependencies.credentialProber,
    dependencies.endpointLifecycle,
    dependencies.connectionLifecycle,
  );
}

function createCompatibilityService(dependencies: ControlPlaneDependencies): CompatibilityProbeService {
  return new CompatibilityProbeService(
    dependencies.connectionRepository,
    dependencies.compatibilityProbeRepository,
    dependencies.compatibilityProbeCoordinator,
    dependencies.clock,
  );
}

function createModelDiscoveryService(dependencies: ControlPlaneDependencies): ModelDiscoveryService {
  return new ModelDiscoveryService(
    dependencies.connectionRepository,
    dependencies.secretCipher,
    dependencies.modelCatalogDiscoverer,
  );
}

function toRunView(run: CompatibilityProbeRunRecord): CompatibilityProbeRunView {
  return {
    ...run,
    checks: [...run.checks],
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    updatedAt: run.updatedAt.toISOString(),
  };
}
