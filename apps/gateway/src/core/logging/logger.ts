import pino, { type Logger } from "pino";

import type { Env } from "../../config/env-schema.js";

export type AppLogger = Logger;

export function createLogger(config: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): AppLogger {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: "ai-api-gateway", environment: config.NODE_ENV },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.x-api-key",
        "req.headers.cookie",
        "request.headers.authorization",
        "request.headers.x-api-key",
        "request.headers.cookie",
        "headers.authorization",
        "headers.x-api-key",
        "providerCredential",
        "providerCredential.secret",
        "credential.secret",
        "gatewayClientKey",
        "password",
        "token",
      ],
      censor: "[REDACTED]",
    },
  });
}
