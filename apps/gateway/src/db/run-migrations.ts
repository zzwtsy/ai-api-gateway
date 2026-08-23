import type { Database } from "./client.js";

import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder });
}
