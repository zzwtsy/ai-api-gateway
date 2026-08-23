import type { HttpBindings } from "@hono/node-server";

import type { BaseVariables } from "../../core/http/env.js";
import type { GatewayClientIdentity } from "../credentials/contracts.js";
import type { DataPlaneDependencies } from "../dependencies.js";

export interface DataEnv {
  Bindings: HttpBindings;
  Variables: BaseVariables & {
    dataDependencies: DataPlaneDependencies;
    gatewayClient: GatewayClientIdentity;
  };
}
