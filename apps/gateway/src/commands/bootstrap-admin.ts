import process from "node:process";

import { env } from "../config/env.js";
import { createBetterAuth } from "../control-plane/auth/better-auth.js";
import { createLogger } from "../core/logging/logger.js";
import { createDatabase } from "../db/client.js";
import { runMigrations } from "../db/run-migrations.js";

async function main(): Promise<void> {
  if (env.NODE_ENV === "production" && env.BOOTSTRAP_ADMIN_PASSWORD === "change-me-before-production") {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be changed before production bootstrap");
  }

  const logger = createLogger(env);
  const database = createDatabase(env.DATABASE_URL, logger);
  try {
    await runMigrations(database.db);
    const auth = createBetterAuth(database.pool, env, { disableSignUp: false });
    await auth.signUpEmail({
      name: env.BOOTSTRAP_ADMIN_NAME,
      email: env.BOOTSTRAP_ADMIN_EMAIL,
      password: env.BOOTSTRAP_ADMIN_PASSWORD,
    });
    process.stdout.write(`Admin account created: ${env.BOOTSTRAP_ADMIN_EMAIL}\n`);
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
