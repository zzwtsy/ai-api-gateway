import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";

import type { ControlEnv } from "./env.js";

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, ControlEnv>;
