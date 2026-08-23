import type { HttpBindings } from "@hono/node-server";

import type { BaseVariables } from "../../core/http/env.js";
import type { ControlUser } from "../auth/contracts.js";
import type { ControlPlaneDependencies } from "../dependencies.js";

export interface ControlEnv {
  Bindings: HttpBindings;
  Variables: BaseVariables & {
    controlDependencies: ControlPlaneDependencies;
    controlUser: ControlUser;
  };
}
