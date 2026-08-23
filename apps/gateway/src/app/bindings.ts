import type { HttpBindings } from "@hono/node-server";

import type { ControlUser } from "../control-plane/auth/contracts.js";
import type { ControlPlaneDependencies } from "../control-plane/dependencies.js";
import type { BaseVariables } from "../core/http/env.js";
import type { DataPlaneDependencies } from "../data-plane/dependencies.js";
import type { GatewayClientIdentity } from "../data-plane/credentials/contracts.js";

export interface AppEnv {
  Bindings: HttpBindings;
  Variables: BaseVariables & {
    controlDependencies: ControlPlaneDependencies;
    dataDependencies: DataPlaneDependencies;
    controlUser: ControlUser;
    gatewayClient: GatewayClientIdentity;
  };
}
