import type {
  ConnectionProtocol,
  ConnectionRecord,
  ConnectionRepository,
  CreateConnectionInput,
} from "../../control-plane/features/connections/contracts.js";
import type { Clock } from "../../core/time/clock.js";

import type { Database } from "../../db/client.js";
import { randomUUID } from "node:crypto";
import { and, asc, eq, or } from "drizzle-orm";
import { AppError } from "../../core/errors/app-error.js";
import { connections } from "../../db/schema/index.js";

export class PostgresConnectionRepository implements ConnectionRepository {
  public constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  public async list(): Promise<readonly ConnectionRecord[]> {
    const rows = await this.db.select().from(connections).orderBy(asc(connections.createdAt), asc(connections.id));
    return rows.map(toRecord);
  }

  public async getById(id: string): Promise<ConnectionRecord | null> {
    const [row] = await this.db.select().from(connections).where(eq(connections.id, id)).limit(1);
    return row === undefined ? null : toRecord(row);
  }

  public async create(input: CreateConnectionInput): Promise<ConnectionRecord> {
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    const now = this.clock.now();
    const [conflict] = await this.db
      .select({ id: connections.id })
      .from(connections)
      .where(or(
        eq(connections.name, input.name),
        and(eq(connections.protocol, input.protocol), eq(connections.baseUrl, baseUrl)),
      ))
      .limit(1);
    if (conflict !== undefined) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    const [row] = await this.db
      .insert(connections)
      .values({
        id: randomUUID(),
        name: input.name,
        provider: input.provider,
        protocol: input.protocol,
        baseUrl,
        enabled: input.enabled,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (row === undefined) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    return toRecord(row);
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function toRecord(row: typeof connections.$inferSelect): ConnectionRecord {
  return {
    ...row,
    protocol: row.protocol as ConnectionProtocol,
  };
}
