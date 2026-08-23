import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";

import type { ControlEnv } from "./env.js";

export type ControlOpenApi<S extends Schema = Record<never, never>> = OpenAPIHono<ControlEnv, S>;
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, ControlEnv>;
