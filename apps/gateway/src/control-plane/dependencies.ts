import type { Env } from "../config/env-schema.js";
import type { RequestStore } from "../core/requests/contracts.js";
import type { ControlAuth } from "./auth/contracts.js";
import type { ConnectionRepository } from "./features/connections/contracts.js";

export interface ControlPlaneDependencies {
  readonly env: Env;
  readonly controlAuth: ControlAuth;
  readonly connectionRepository: ConnectionRepository;
  readonly requestStore: RequestStore;
}
