import process from "node:process";
import { fileURLToPath } from "node:url";

import { config as loadDotEnv } from "dotenv";

import { EnvSchema } from "./env-schema.js";

const rootEnvironmentPath = fileURLToPath(new URL("../../../../.env", import.meta.url));
loadDotEnv({ path: rootEnvironmentPath, quiet: true });

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  const issues = result.error.issues
    .map(issue => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = result.data;
