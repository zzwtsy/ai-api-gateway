import type { ControlPlaneDependencies } from "../../dependencies.js";
import type { AppRouteHandler } from "../../http/context.js";
import type { GatewayClientRecord } from "./contracts.js";
import type {
  CreateGatewayClientRoute,
  ListGatewayClientsRoute,
  ListHarnessProfilesRoute,
  RevokeGatewayClientKeyRoute,
  RotateGatewayClientKeyRoute,
} from "./routes.js";
import type { GatewayClientView } from "./schemas.js";

import { successResponse } from "../../http/response.js";
import { GatewayClientService } from "./service.js";

export const listHarnessProfilesHandler: AppRouteHandler<ListHarnessProfilesRoute> = async c =>
  successResponse(c, (await createService(c.get("controlDependencies")).listProfiles()).map(profile => ({
    ...profile,
    allowedProtocols: [...profile.allowedProtocols],
  })));

export const listGatewayClientsHandler: AppRouteHandler<ListGatewayClientsRoute> = async c =>
  successResponse(c, (await createService(c.get("controlDependencies")).list()).map(toView));

export const createGatewayClientHandler: AppRouteHandler<CreateGatewayClientRoute> = async (c) => {
  const result = await createService(c.get("controlDependencies")).create(c.req.valid("json"));
  c.header("Cache-Control", "no-store");
  return successResponse(c, { client: toView(result.client), key: result.key }, { status: 201 });
};

export const rotateGatewayClientKeyHandler: AppRouteHandler<RotateGatewayClientKeyRoute> = async (c) => {
  const { clientId } = c.req.valid("param");
  const { overlapHours } = c.req.valid("json");
  const result = await createService(c.get("controlDependencies")).rotate(clientId, overlapHours);
  c.header("Cache-Control", "no-store");
  return successResponse(c, { client: toView(result.client), key: result.key });
};

export const revokeGatewayClientKeyHandler: AppRouteHandler<RevokeGatewayClientKeyRoute> = async (c) => {
  const { keyId } = c.req.valid("param");
  return successResponse(c, toView(await createService(c.get("controlDependencies")).revoke(keyId)));
};

function createService(dependencies: ControlPlaneDependencies): GatewayClientService {
  return new GatewayClientService(dependencies.gatewayClientRepository, dependencies.env.GATEWAY_KEY_PEPPER, dependencies.clock);
}

function toView(client: GatewayClientRecord): GatewayClientView {
  return {
    ...client,
    allowedProtocols: [...client.allowedProtocols],
    profile: { ...client.profile, allowedProtocols: [...client.profile.allowedProtocols] },
    keys: client.keys.map(key => ({
      ...key,
      expiresAt: key.expiresAt?.toISOString() ?? null,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
      revokedAt: key.revokedAt?.toISOString() ?? null,
    })),
    lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
