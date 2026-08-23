import { z } from "zod";

const DEVELOPMENT_BETTER_AUTH_SECRET = "development-better-auth-secret-change-me";
const DEVELOPMENT_CONTROL_TOKEN = "admin_dev_local";
const DEVELOPMENT_GATEWAY_KEY = "gw_dev_local_key";
const DEVELOPMENT_GATEWAY_PEPPER = "development-gateway-key-pepper";
const DEVELOPMENT_PROVIDER_URL = "http://127.0.0.1:4010";
const DEVELOPMENT_PROVIDER_KEY = "mock-provider-key";
const DEVELOPMENT_BOOTSTRAP_PASSWORD = "change-me-before-production";
const EXAMPLE_BETTER_AUTH_SECRET = "replace-with-at-least-32-random-characters";
const EXAMPLE_GATEWAY_PEPPER = "replace-with-a-random-pepper";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  DATABASE_URL: z.string().url().default("postgresql://aigw:aigw@127.0.0.1:5432/aigw"),
  STORAGE_DRIVER: z.enum(["postgres", "memory"]).default("postgres"),
  BETTER_AUTH_SECRET: z.string().min(32).default(DEVELOPMENT_BETTER_AUTH_SECRET),
  BETTER_AUTH_URL: z.string().url().default("http://127.0.0.1:3001"),
  WEB_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  WEB_DIST_DIR: z.string().optional(),
  DEV_ADMIN_TOKEN: z.string().min(12).default(DEVELOPMENT_CONTROL_TOKEN),
  GATEWAY_CLIENT_KEY: z.string().min(16).default(DEVELOPMENT_GATEWAY_KEY),
  GATEWAY_KEY_PEPPER: z.string().min(16).default(DEVELOPMENT_GATEWAY_PEPPER),
  BOOTSTRAP_PROVIDER_BASE_URL: z.string().url().default(DEVELOPMENT_PROVIDER_URL),
  BOOTSTRAP_PROVIDER_API_KEY: z.string().min(1).default(DEVELOPMENT_PROVIDER_KEY),
  ROUTING_SNAPSHOT_VERSION: z.coerce.number().int().positive().default(1),
  OBSERVER_MAX_BUFFER_BYTES: z.coerce.number().int().positive().default(65_536),
  UPSTREAM_CONNECTIONS: z.coerce.number().int().positive().max(128).default(8),
  UPSTREAM_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  UPSTREAM_HEADERS_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  UPSTREAM_BODY_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).default("Owner"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("owner@example.com"),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).default(DEVELOPMENT_BOOTSTRAP_PASSWORD),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") {
    return;
  }

  if (value.STORAGE_DRIVER !== "postgres") {
    context.addIssue({
      code: "custom",
      path: ["STORAGE_DRIVER"],
      message: "Production requires PostgreSQL storage.",
    });
  }

  const forbiddenDefaults: ReadonlyArray<readonly [keyof typeof value, string]> = [
    ["BETTER_AUTH_SECRET", DEVELOPMENT_BETTER_AUTH_SECRET],
    ["BETTER_AUTH_SECRET", EXAMPLE_BETTER_AUTH_SECRET],
    ["GATEWAY_CLIENT_KEY", DEVELOPMENT_GATEWAY_KEY],
    ["GATEWAY_KEY_PEPPER", DEVELOPMENT_GATEWAY_PEPPER],
    ["GATEWAY_KEY_PEPPER", EXAMPLE_GATEWAY_PEPPER],
    ["BOOTSTRAP_PROVIDER_BASE_URL", DEVELOPMENT_PROVIDER_URL],
    ["BOOTSTRAP_PROVIDER_API_KEY", DEVELOPMENT_PROVIDER_KEY],
  ];
  for (const [field, forbiddenValue] of forbiddenDefaults) {
    if (value[field] === forbiddenValue) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: `${field} must be explicitly configured for production.`,
      });
    }
  }

  for (const field of ["GATEWAY_CLIENT_KEY", "GATEWAY_KEY_PEPPER"] as const) {
    if (value[field].length < 32) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: `${field} must contain at least 32 characters in production.`,
      });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;
