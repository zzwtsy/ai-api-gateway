import process from "node:process";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";

import { env } from "../config/env.js";
import { createLogger } from "../core/logging/logger.js";
import { createApplication } from "./create-application.js";
import { createRuntimeResources } from "./create-dependencies.js";
import { ShutdownController } from "./shutdown-controller.js";

export async function startApplication(): Promise<void> {
  const logger = createLogger(env);
  const resources = createRuntimeResources(env, logger);
  try {
    await resources.initialize();
  } catch (error) {
    await resources.close();
    throw error;
  }
  const webDistDirectory = env.WEB_DIST_DIR ?? fileURLToPath(new URL("../../../web/dist", import.meta.url));
  const app = createApplication(resources.dependencies, { webDistDirectory });
  const server = serve({
    fetch: app.fetch,
    port: env.PORT,
  }, (info) => {
    logger.info({ port: info.port }, "AI API Gateway listening");
  });

  const shutdownController = new ShutdownController({
    stopAccepting: async () => closeServer(server),
    closeResources: async () => resources.close(),
  });
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown started");
    try {
      await shutdownController.shutdown();
      logger.info("shutdown complete");
    } catch (error) {
      logger.error({ err: error, signal }, "shutdown failed");
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

function closeServer(server: { close: (callback: (error?: Error) => void) => void }): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => error === undefined ? resolve() : reject(error));
  });
}
