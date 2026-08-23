import type { Env } from "../config/env-schema.js";
import type { RequestStore } from "../core/requests/contracts.js";
import type { Clock } from "../core/time/clock.js";
import type { GatewayClientAuthenticator } from "./credentials/contracts.js";
import type { ProviderCredentialResolver } from "./credentials/provider-credentials.js";
import type { RoutingSnapshotStore } from "./routing/contracts.js";
import type { TransportRegistry } from "./transport/contracts.js";

export interface DataPlaneDependencies {
  readonly env: Env;
  readonly clock: Clock;
  readonly requestStore: RequestStore;
  readonly gatewayClientAuthenticator: GatewayClientAuthenticator;
  readonly providerCredentialResolver: ProviderCredentialResolver;
  readonly routingSnapshotStore: RoutingSnapshotStore;
  readonly transportRegistry: TransportRegistry;
}
