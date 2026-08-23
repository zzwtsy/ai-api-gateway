import type { HttpBindings } from "@hono/node-server";

import type { AppLogger } from "../logging/logger.js";

export interface BaseVariables {
  logger: AppLogger;
  requestId: string;
}

export interface BaseEnv {
  Bindings: HttpBindings;
  Variables: BaseVariables;
}
