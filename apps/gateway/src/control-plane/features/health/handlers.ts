import type { AppRouteHandler } from "../../http/context.js";

import type { HealthRoute } from "./routes.js";
import { successResponse } from "../../http/response.js";

export const healthHandler: AppRouteHandler<HealthRoute> = c => successResponse(c, { status: "ok" as const });
