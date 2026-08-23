import type { Env } from "../config/env-schema.js";
import type { AppLogger } from "../core/logging/logger.js";
import { systemClock } from "../core/time/clock.js";
import { createBetterAuth } from "../control-plane/auth/better-auth.js";
import { unavailableControlAuth } from "../control-plane/auth/development-auth.js";
import { StaticGatewayClientAuthenticator } from "../data-plane/credentials/static-authenticator.js";
import { StaticProviderCredentialResolver } from "../data-plane/credentials/provider-credentials.js";
import { StaticRoutingSnapshotStore } from "../data-plane/routing/static-snapshot.js";
import { UndiciTransportRegistry } from "../data-plane/transport/undici-registry.js";
import { createDatabase } from "../db/client.js";
import { MemoryConnectionRepository } from "./adapters/memory-connection-repository.js";
import { MemoryRequestStore } from "./adapters/memory-request-store.js";
import { PostgresConnectionRepository } from "./adapters/postgres-connection-repository.js";
import { PostgresRequestStore } from "./adapters/postgres-request-store.js";
import type { ApplicationDependencies } from "./dependencies.js";

export interface RuntimeResources {
  readonly dependencies: ApplicationDependencies;
  close(): Promise<void>;
}

export function createInMemoryDependencies(env: Env, logger: AppLogger): ApplicationDependencies {
  const targetUrl = resolveTargetUrl(env.BOOTSTRAP_PROVIDER_BASE_URL, "/v1/chat/completions");
  return {
    env,
    logger,
    clock: systemClock,
    controlAuth: unavailableControlAuth,
    connectionRepository: new MemoryConnectionRepository(systemClock),
    requestStore: new MemoryRequestStore(),
    gatewayClientAuthenticator: new StaticGatewayClientAuthenticator(
      env.GATEWAY_CLIENT_KEY,
      env.GATEWAY_KEY_PEPPER,
    ),
    providerCredentialResolver: new StaticProviderCredentialResolver([
      { id: "bootstrap-provider-credential", secret: env.BOOTSTRAP_PROVIDER_API_KEY },
    ]),
    routingSnapshotStore: new StaticRoutingSnapshotStore({
      version: env.ROUTING_SNAPSHOT_VERSION,
      target: {
        connectionId: "bootstrap-provider-connection",
        credentialId: "bootstrap-provider-credential",
        protocol: "openai-chat",
        origin: targetUrl.origin,
        path: targetUrl.path,
      },
    }),
    transportRegistry: new UndiciTransportRegistry(env),
  };
}

export function createRuntimeResources(env: Env, logger: AppLogger): RuntimeResources {
  if (env.STORAGE_DRIVER === "memory") {
    const dependencies = createInMemoryDependencies(env, logger);
    return {
      dependencies,
      close: async () => dependencies.transportRegistry.close(),
    };
  }

  const database = createDatabase(env.DATABASE_URL, logger);
  const targetUrl = resolveTargetUrl(env.BOOTSTRAP_PROVIDER_BASE_URL, "/v1/chat/completions");
  const transportRegistry = new UndiciTransportRegistry(env);
  const dependencies: ApplicationDependencies = {
    env,
    logger,
    clock: systemClock,
    controlAuth: createBetterAuth(database.pool, env),
    connectionRepository: new PostgresConnectionRepository(database.db, systemClock),
    requestStore: new PostgresRequestStore(database.db),
    gatewayClientAuthenticator: new StaticGatewayClientAuthenticator(
      env.GATEWAY_CLIENT_KEY,
      env.GATEWAY_KEY_PEPPER,
    ),
    providerCredentialResolver: new StaticProviderCredentialResolver([
      { id: "bootstrap-provider-credential", secret: env.BOOTSTRAP_PROVIDER_API_KEY },
    ]),
    routingSnapshotStore: new StaticRoutingSnapshotStore({
      version: env.ROUTING_SNAPSHOT_VERSION,
      target: {
        connectionId: "bootstrap-provider-connection",
        credentialId: "bootstrap-provider-credential",
        protocol: "openai-chat",
        origin: targetUrl.origin,
        path: targetUrl.path,
      },
    }),
    transportRegistry,
  };

  return {
    dependencies,
    close: async () => {
      await transportRegistry.close();
      await database.close();
    },
  };
}

function resolveTargetUrl(baseUrl: string, routePath: string): { origin: string; path: string } {
  const url = new URL(baseUrl);
  const prefix = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return {
    origin: url.origin,
    path: `${prefix}${routePath}`,
  };
}
