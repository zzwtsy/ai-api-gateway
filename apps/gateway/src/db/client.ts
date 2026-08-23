import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { AppLogger } from "../core/logging/logger.js";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export function createDatabase(connectionString: string, logger: AppLogger): DatabaseHandle {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000
  });
  pool.on("error", (error) => logger.error({ err: error }, "postgres pool error"));

  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    close: async () => pool.end()
  };
}
