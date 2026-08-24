import type {
  GatewayClientRecord,
  GatewayClientRepository,
  HarnessProfileRecord,
  PersistGatewayClientCommand,
  PersistGatewayClientKey,
} from "../../control-plane/features/clients/contracts.js";
import type { ProtocolId } from "../../core/requests/contracts.js";
import type { Database } from "../../db/client.js";
import { and, asc, eq } from "drizzle-orm";

import { AppError } from "../../core/errors/app-error.js";
import { gatewayClientKeys, gatewayClients, harnessProfiles } from "../../db/schema/index.js";

export class PostgresGatewayClientRepository implements GatewayClientRepository {
  public constructor(private readonly db: Database) {}

  public async listProfiles(): Promise<readonly HarnessProfileRecord[]> {
    const rows = await this.db.select().from(harnessProfiles).orderBy(asc(harnessProfiles.slug));
    return rows.map(row => ({ ...row, allowedProtocols: row.allowedProtocols as ProtocolId[] }));
  }

  public async getProfileBySlug(slug: string) {
    return (await this.listProfiles()).find(profile => profile.slug === slug) ?? null;
  }

  public async list(): Promise<readonly GatewayClientRecord[]> {
    const [clientRows, profileRows, keyRows] = await Promise.all([
      this.db.select().from(gatewayClients).orderBy(asc(gatewayClients.createdAt)),
      this.listProfiles(),
      this.db.select().from(gatewayClientKeys).orderBy(asc(gatewayClientKeys.createdAt)),
    ]);
    return clientRows.map((client) => {
      const profile = profileRows.find(item => item.id === client.harnessProfileId);
      if (profile === undefined)
        throw new Error(`Harness Profile ${client.harnessProfileId} is missing.`);
      return {
        id: client.id,
        name: client.name,
        status: client.status as GatewayClientRecord["status"],
        profile,
        allowedProtocols: client.allowedProtocols as ProtocolId[],
        lastUsedAt: client.lastUsedAt,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        keys: keyRows.filter(key => key.clientId === client.id).map(key => ({
          id: key.id,
          keyPrefix: key.keyPrefix,
          keyLast4: key.keyLast4,
          status: key.status as "active" | "expiring" | "revoked",
          expiresAt: key.expiresAt,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          revokedAt: key.revokedAt,
        })),
      };
    });
  }

  public async create(command: PersistGatewayClientCommand) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(gatewayClients).values({ id: command.clientId, harnessProfileId: command.profile.id, name: command.name, allowedProtocols: [...command.allowedProtocols], status: "active", createdAt: command.now, updatedAt: command.now });
        await tx.insert(gatewayClientKeys).values({ id: command.key.id, clientId: command.clientId, keyPrefix: command.key.keyPrefix, keyLast4: command.key.keyLast4, secretHash: command.key.secretHash, status: "active", createdAt: command.now });
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new AppError("CLIENT_CONFLICT", undefined, { cause: error });
      throw error;
    }
    return this.requiredClient(command.clientId);
  }

  public async addKey(clientId: string, key: PersistGatewayClientKey, now: Date, previousExpiresAt: Date | null) {
    if (!(await this.list()).some(client => client.id === clientId))
      return null;
    await this.db.transaction(async (tx) => {
      await tx.update(gatewayClientKeys).set({ status: "expiring", expiresAt: previousExpiresAt }).where(and(
        eq(gatewayClientKeys.clientId, clientId),
        eq(gatewayClientKeys.status, "active"),
      ));
      await tx.insert(gatewayClientKeys).values({ id: key.id, clientId, keyPrefix: key.keyPrefix, keyLast4: key.keyLast4, secretHash: key.secretHash, status: "active", createdAt: now });
      await tx.update(gatewayClients).set({ updatedAt: now }).where(eq(gatewayClients.id, clientId));
    });
    return this.requiredClient(clientId);
  }

  public async revokeKey(keyId: string, now: Date) {
    const [key] = await this.db.select({ clientId: gatewayClientKeys.clientId }).from(gatewayClientKeys).where(eq(gatewayClientKeys.id, keyId)).limit(1);
    if (key === undefined)
      return null;
    await this.db.update(gatewayClientKeys).set({ status: "revoked", revokedAt: now }).where(eq(gatewayClientKeys.id, keyId));
    return this.requiredClient(key.clientId);
  }

  private async requiredClient(clientId: string) {
    const client = (await this.list()).find(item => item.id === clientId);
    if (client === undefined)
      throw new Error(`Gateway Client ${clientId} is missing after a successful write.`);
    return client;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null)
    return false;
  if ("code" in error && error.code === "23505")
    return true;
  return "cause" in error && isUniqueViolation(error.cause);
}
