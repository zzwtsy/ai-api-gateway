import process from "node:process";

import { env } from "../config/env.js";
import { createLogger } from "../core/logging/logger.js";
import { createDatabase } from "../db/client.js";
import { runMigrations } from "../db/run-migrations.js";

async function main(): Promise<void> {
  const logger = createLogger(env);
  const database = createDatabase(env.DATABASE_URL, logger);
  try {
    await runMigrations(database.db);
    process.stdout.write("Database migrations completed.\n");
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
