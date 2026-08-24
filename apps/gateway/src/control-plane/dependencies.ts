import type { Env } from "../config/env-schema.js";
import type { SecretCipher } from "../core/crypto/secret-cipher.js";
import type { RequestStore } from "../core/requests/contracts.js";
import type { Clock } from "../core/time/clock.js";
import type { ControlAuth } from "./auth/contracts.js";
import type { GatewayClientRepository } from "./features/clients/contracts.js";
import type {
  CompatibilityProbeCoordinator,
  CompatibilityProbeRepository,
  ConnectionRepository,
  CredentialProber,
  ModelCatalogDiscoverer,
} from "./features/connections/contracts.js";
import type { ModelBindingRepository } from "./features/models/contracts.js";

export interface ControlPlaneDependencies {
  readonly env: Env;
  readonly clock: Clock;
  readonly secretCipher: SecretCipher;
  readonly controlAuth: ControlAuth;
  readonly connectionRepository: ConnectionRepository;
  readonly credentialProber: CredentialProber;
  readonly modelCatalogDiscoverer: ModelCatalogDiscoverer;
  readonly compatibilityProbeRepository: CompatibilityProbeRepository;
  readonly compatibilityProbeCoordinator: CompatibilityProbeCoordinator;
  readonly gatewayClientRepository: GatewayClientRepository;
  readonly modelBindingRepository: ModelBindingRepository;
  readonly requestStore: RequestStore;
}
