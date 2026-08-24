import type { GatewayClientAuthenticator, GatewayClientIdentity } from "../../data-plane/credentials/contracts.js";
import type { Database } from "../../db/client.js";
import { Buffer } from "node:buffer";
import { and, eq, or } from "drizzle-orm";
import { gatewayKeyPrefix, verifyGatewayKey } from "../../core/crypto/gateway-key.js";
import { gatewayClientKeys, gatewayClients } from "../../db/schema/index.js";

export class PostgresGatewayClientAuthenticator implements GatewayClientAuthenticator {
  public constructor(private readonly db: Database, private readonly pepper: string) {}
  public async authenticate(key: string): Promise<GatewayClientIdentity | null> {
    const now = new Date();
    const rows = await this.db.select({
      clientId: gatewayClients.id,
      clientName: gatewayClients.name,
      clientStatus: gatewayClients.status,
      keyPrefix: gatewayClientKeys.keyPrefix,
      secretHash: gatewayClientKeys.secretHash,
      keyStatus: gatewayClientKeys.status,
      expiresAt: gatewayClientKeys.expiresAt,
    }).from(gatewayClientKeys).innerJoin(gatewayClients, eq(gatewayClientKeys.clientId, gatewayClients.id)).where(and(
      eq(gatewayClientKeys.keyPrefix, gatewayKeyPrefix(key)),
      eq(gatewayClients.status, "active"),
      or(eq(gatewayClientKeys.status, "active"), eq(gatewayClientKeys.status, "expiring")),
    ));
    for (const row of rows) {
      if (row.expiresAt !== null && row.expiresAt <= now)
        continue;
      if (verifyGatewayKey(key, Buffer.from(row.secretHash, "base64url"), this.pepper)) {
        return { id: row.clientId, name: row.clientName, keyPrefix: row.keyPrefix };
      }
    }
    return null;
  }
}
