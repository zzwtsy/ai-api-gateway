import type { Env } from "../config/env-schema.js";
import type { AppLogger } from "../core/logging/logger.js";
import type { ApplicationDependencies } from "./dependencies.js";
import { createBetterAuth } from "../control-plane/auth/better-auth.js";
import { unavailableControlAuth } from "../control-plane/auth/development-auth.js";
import { SecretCipher } from "../core/crypto/secret-cipher.js";
import { systemClock } from "../core/time/clock.js";
import { StaticProviderCredentialResolver } from "../data-plane/credentials/provider-credentials.js";
import { StaticGatewayClientAuthenticator } from "../data-plane/credentials/static-authenticator.js";
import { StaticRoutingSnapshotStore } from "../data-plane/routing/static-snapshot.js";
import { UndiciTransportRegistry } from "../data-plane/transport/undici-registry.js";
import { createDatabase } from "../db/client.js";
import { CompatibilityProbeRunner } from "./adapters/compatibility-probe-runner.js";
import { MemoryCompatibilityProbeRepository } from "./adapters/memory-compatibility-probe-repository.js";
import { MemoryConnectionRepository } from "./adapters/memory-connection-repository.js";
import { MemoryGatewayClientRepository } from "./adapters/memory-gateway-client-repository.js";
import { MemoryModelBindingRepository } from "./adapters/memory-model-binding-repository.js";
import { MemoryRequestStore } from "./adapters/memory-request-store.js";
import { ensurePostgresBootstrapConfiguration } from "./adapters/postgres-bootstrap-configuration.js";
import { PostgresCompatibilityProbeRepository } from "./adapters/postgres-compatibility-probe-repository.js";
import { PostgresConnectionRepository } from "./adapters/postgres-connection-repository.js";
import { PostgresGatewayClientAuthenticator } from "./adapters/postgres-gateway-client-authenticator.js";
import { PostgresGatewayClientRepository } from "./adapters/postgres-gateway-client-repository.js";
import { PostgresModelBindingRepository } from "./adapters/postgres-model-binding-repository.js";
import { PostgresProviderCredentialResolver } from "./adapters/postgres-provider-credential-resolver.js";
import { PostgresRequestStore } from "./adapters/postgres-request-store.js";
import { TransportCompatibilityProber } from "./adapters/transport-compatibility-prober.js";
import { TransportCredentialProber } from "./adapters/transport-credential-prober.js";
import { TransportModelCatalogDiscoverer } from "./adapters/transport-model-catalog-discoverer.js";
import { closeRuntimeResources } from "./runtime-resource-order.js";

export interface RuntimeResources {
  readonly dependencies: ApplicationDependencies;
  initialize: () => Promise<void>;
  close: () => Promise<void>;
}

export function createInMemoryDependencies(env: Env, logger: AppLogger): ApplicationDependencies {
  return createInMemoryGraph(env, logger).dependencies;
}

function createInMemoryGraph(env: Env, logger: AppLogger) {
  const secretCipher = createSecretCipher(env);
  const connectionRepository = new MemoryConnectionRepository();
  const compatibilityProbeRepository = new MemoryCompatibilityProbeRepository();
  const transportRegistry = new UndiciTransportRegistry(env);
  const compatibilityProbeCoordinator = new CompatibilityProbeRunner(
    connectionRepository,
    compatibilityProbeRepository,
    new TransportCompatibilityProber(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    secretCipher,
    systemClock,
    logger,
  );
  const dependencies: ApplicationDependencies = {
    env,
    logger,
    clock: systemClock,
    secretCipher,
    controlAuth: unavailableControlAuth,
    connectionRepository,
    credentialProber: new TransportCredentialProber(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    modelCatalogDiscoverer: new TransportModelCatalogDiscoverer(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    compatibilityProbeRepository,
    compatibilityProbeCoordinator,
    gatewayClientRepository: new MemoryGatewayClientRepository(),
    modelBindingRepository: new MemoryModelBindingRepository(async endpointId =>
      (await connectionRepository.list()).some(connection => connection.endpoints.some(endpoint => endpoint.id === endpointId))),
    requestStore: new MemoryRequestStore(),
    ...createStaticProxyDependencies(env),
    transportRegistry,
  };
  return { dependencies, compatibilityProbeCoordinator };
}

export function createRuntimeResources(env: Env, logger: AppLogger): RuntimeResources {
  if (env.STORAGE_DRIVER === "memory") {
    const { dependencies, compatibilityProbeCoordinator } = createInMemoryGraph(env, logger);
    return {
      dependencies,
      initialize: async () => {},
      close: async () => closeRuntimeResources({
        stopBackgroundTasks: async () => compatibilityProbeCoordinator.close(),
        closeTransport: async () => dependencies.transportRegistry.close(),
        closeStorage: async () => {},
      }),
    };
  }

  const database = createDatabase(env.DATABASE_URL, logger);
  const transportRegistry = new UndiciTransportRegistry(env);
  const secretCipher = createSecretCipher(env);
  const connectionRepository = new PostgresConnectionRepository(database.db);
  const compatibilityProbeRepository = new PostgresCompatibilityProbeRepository(database.db);
  const compatibilityProbeCoordinator = new CompatibilityProbeRunner(
    connectionRepository,
    compatibilityProbeRepository,
    new TransportCompatibilityProber(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    secretCipher,
    systemClock,
    logger,
  );
  const dependencies: ApplicationDependencies = {
    env,
    logger,
    clock: systemClock,
    secretCipher,
    controlAuth: createBetterAuth(database.pool, env),
    connectionRepository,
    credentialProber: new TransportCredentialProber(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    modelCatalogDiscoverer: new TransportModelCatalogDiscoverer(transportRegistry, env.UPSTREAM_HEADERS_TIMEOUT_MS),
    compatibilityProbeRepository,
    compatibilityProbeCoordinator,
    gatewayClientRepository: new PostgresGatewayClientRepository(database.db),
    modelBindingRepository: new PostgresModelBindingRepository(database.db),
    requestStore: new PostgresRequestStore(database.db),
    gatewayClientAuthenticator: new PostgresGatewayClientAuthenticator(database.db, env.GATEWAY_KEY_PEPPER),
    providerCredentialResolver: new PostgresProviderCredentialResolver(database.db, secretCipher),
    routingSnapshotStore: createBootstrapRoutingSnapshot(env),
    transportRegistry,
  };

  return {
    dependencies,
    initialize: async () => ensurePostgresBootstrapConfiguration(database.db, secretCipher, env),
    close: async () => closeRuntimeResources({
      stopBackgroundTasks: async () => compatibilityProbeCoordinator.close(),
      closeTransport: async () => transportRegistry.close(),
      closeStorage: async () => database.close(),
    }),
  };
}

function createSecretCipher(env: Env): SecretCipher {
  return new SecretCipher({
    activeKeyId: env.PROVIDER_SECRET_ACTIVE_KEY_ID,
    keys: env.PROVIDER_SECRET_KEYRING,
    fingerprintPepper: env.PROVIDER_SECRET_FINGERPRINT_PEPPER,
  });
}

function createStaticProxyDependencies(
  env: Env,
): Pick<ApplicationDependencies, "gatewayClientAuthenticator" | "providerCredentialResolver" | "routingSnapshotStore"> {
  return {
    gatewayClientAuthenticator: new StaticGatewayClientAuthenticator(
      env.GATEWAY_CLIENT_KEY,
      env.GATEWAY_KEY_PEPPER,
    ),
    providerCredentialResolver: new StaticProviderCredentialResolver([
      { id: env.BOOTSTRAP_PROVIDER_CREDENTIAL_ID, secret: env.BOOTSTRAP_PROVIDER_API_KEY },
    ]),
    routingSnapshotStore: createBootstrapRoutingSnapshot(env),
  };
}

function createBootstrapRoutingSnapshot(env: Env): StaticRoutingSnapshotStore {
  const targetUrl = resolveTargetUrl(env.BOOTSTRAP_PROVIDER_BASE_URL, "/v1/chat/completions");
  return new StaticRoutingSnapshotStore({
    version: env.ROUTING_SNAPSHOT_VERSION,
    target: {
      connectionId: env.BOOTSTRAP_CONNECTION_ID,
      credentialId: env.BOOTSTRAP_PROVIDER_CREDENTIAL_ID,
      protocol: "openai-chat",
      origin: targetUrl.origin,
      path: targetUrl.path,
    },
  });
}

function resolveTargetUrl(baseUrl: string, routePath: string): { origin: string; path: string } {
  const url = new URL(baseUrl);
  const prefix = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return {
    origin: url.origin,
    path: `${prefix}${routePath}`,
  };
}
