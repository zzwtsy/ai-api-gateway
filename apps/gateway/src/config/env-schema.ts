import { Buffer } from "node:buffer";
import { z } from "zod";

const DEVELOPMENT_BETTER_AUTH_SECRET = "development-better-auth-secret-change-me";
const DEVELOPMENT_CONTROL_TOKEN = "admin_dev_local";
const DEVELOPMENT_GATEWAY_KEY = "gw_dev_local_key";
const DEVELOPMENT_GATEWAY_PEPPER = "development-gateway-key-pepper";
const DEVELOPMENT_PROVIDER_FINGERPRINT_PEPPER = "development-provider-fingerprint-pepper";
const DEVELOPMENT_PROVIDER_SECRET_KEY_ID = "development-v1";
const DEVELOPMENT_PROVIDER_SECRET_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const DEVELOPMENT_PROVIDER_SECRET_KEYRING = JSON.stringify({
  [DEVELOPMENT_PROVIDER_SECRET_KEY_ID]: DEVELOPMENT_PROVIDER_SECRET_KEY,
});
const DEVELOPMENT_PROVIDER_URL = "http://127.0.0.1:4010";
const DEVELOPMENT_PROVIDER_KEY = "mock-provider-key";
const DEVELOPMENT_BOOTSTRAP_PASSWORD = "change-me-before-production";
const EXAMPLE_BETTER_AUTH_SECRET = "replace-with-at-least-32-random-characters";
const EXAMPLE_GATEWAY_PEPPER = "replace-with-a-random-pepper";
const EXAMPLE_PROVIDER_FINGERPRINT_PEPPER = "replace-with-a-provider-fingerprint-pepper";

const ProviderSecretKeyringSchema = z.string().default(DEVELOPMENT_PROVIDER_SECRET_KEYRING).transform((value, context): Record<string, string> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    context.addIssue({ code: "custom", message: "PROVIDER_SECRET_KEYRING must be a JSON object." });
    return z.NEVER;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    context.addIssue({ code: "custom", message: "PROVIDER_SECRET_KEYRING must be a JSON object." });
    return z.NEVER;
  }
  const keyring: Record<string, string> = {};
  for (const [keyId, encoded] of Object.entries(parsed)) {
    if (!/^[A-Z0-9][\w.-]{0,63}$/i.test(keyId) || typeof encoded !== "string") {
      context.addIssue({ code: "custom", message: "Provider Secret key IDs or values are invalid." });
      return z.NEVER;
    }
    const key = Buffer.from(encoded, "base64");
    if (key.byteLength !== 32 || key.toString("base64") !== encoded) {
      context.addIssue({ code: "custom", message: `Provider Secret key ${keyId} must be canonical Base64 for exactly 32 bytes.` });
      return z.NEVER;
    }
    keyring[keyId] = encoded;
  }
  if (Object.keys(keyring).length === 0) {
    context.addIssue({ code: "custom", message: "PROVIDER_SECRET_KEYRING must contain at least one key." });
    return z.NEVER;
  }
  return keyring;
});

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  DATABASE_URL: z.url().default("postgresql://aigw:aigw@127.0.0.1:5432/aigw"),
  STORAGE_DRIVER: z.enum(["postgres", "memory"]).default("postgres"),
  BETTER_AUTH_SECRET: z.string().min(32).default(DEVELOPMENT_BETTER_AUTH_SECRET),
  BETTER_AUTH_URL: z.url().default("http://127.0.0.1:3001"),
  WEB_ORIGIN: z.url().default("http://127.0.0.1:5173"),
  WEB_DIST_DIR: z.string().optional(),
  DEV_ADMIN_TOKEN: z.string().min(12).default(DEVELOPMENT_CONTROL_TOKEN),
  GATEWAY_CLIENT_KEY: z.string().min(16).default(DEVELOPMENT_GATEWAY_KEY),
  GATEWAY_KEY_PEPPER: z.string().min(16).default(DEVELOPMENT_GATEWAY_PEPPER),
  PROVIDER_SECRET_ACTIVE_KEY_ID: z.string().min(1).max(64).default(DEVELOPMENT_PROVIDER_SECRET_KEY_ID),
  PROVIDER_SECRET_KEYRING: ProviderSecretKeyringSchema,
  PROVIDER_SECRET_FINGERPRINT_PEPPER: z.string().min(16).default(DEVELOPMENT_PROVIDER_FINGERPRINT_PEPPER),
  BOOTSTRAP_PROVIDER_BASE_URL: z.url().default(DEVELOPMENT_PROVIDER_URL),
  BOOTSTRAP_PROVIDER_API_KEY: z.string().min(1).default(DEVELOPMENT_PROVIDER_KEY),
  BOOTSTRAP_CONNECTION_ID: z.string().min(1).default("bootstrap-provider-connection"),
  BOOTSTRAP_PROVIDER_CREDENTIAL_ID: z.string().min(1).default("bootstrap-provider-credential"),
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
  if (!(value.PROVIDER_SECRET_ACTIVE_KEY_ID in value.PROVIDER_SECRET_KEYRING)) {
    context.addIssue({
      code: "custom",
      path: ["PROVIDER_SECRET_ACTIVE_KEY_ID"],
      message: "PROVIDER_SECRET_ACTIVE_KEY_ID must exist in PROVIDER_SECRET_KEYRING.",
    });
  }

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
    ["PROVIDER_SECRET_ACTIVE_KEY_ID", DEVELOPMENT_PROVIDER_SECRET_KEY_ID],
    ["PROVIDER_SECRET_FINGERPRINT_PEPPER", DEVELOPMENT_PROVIDER_FINGERPRINT_PEPPER],
    ["PROVIDER_SECRET_FINGERPRINT_PEPPER", EXAMPLE_PROVIDER_FINGERPRINT_PEPPER],
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

  for (const field of ["GATEWAY_CLIENT_KEY", "GATEWAY_KEY_PEPPER", "PROVIDER_SECRET_FINGERPRINT_PEPPER"] as const) {
    if (value[field].length < 32) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: `${field} must contain at least 32 characters in production.`,
      });
    }
  }

  if (Object.values(value.PROVIDER_SECRET_KEYRING).includes(DEVELOPMENT_PROVIDER_SECRET_KEY)) {
    context.addIssue({
      code: "custom",
      path: ["PROVIDER_SECRET_KEYRING"],
      message: "PROVIDER_SECRET_KEYRING must not contain the development key in production.",
    });
  }
});

export type Env = z.infer<typeof EnvSchema>;
