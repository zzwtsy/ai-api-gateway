import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "./bindings.js";

import { existsSync } from "node:fs";

import path from "node:path";

import { serveStatic } from "@hono/node-server/serve-static";

export function registerWebAssets(app: OpenAPIHono<AppEnv>, webDistDirectory: string | undefined): void {
  if (webDistDirectory === undefined || !existsSync(path.join(webDistDirectory, "index.html"))) {
    return;
  }
  app.use("/assets/*", serveStatic({ root: webDistDirectory }));
  app.get("/favicon.svg", serveStatic({ path: path.join(webDistDirectory, "favicon.svg") }));
  app.get("*", serveStatic({ path: path.join(webDistDirectory, "index.html") }));
}
