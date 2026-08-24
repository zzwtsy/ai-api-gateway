import type { SecretCipher } from "../../core/crypto/secret-cipher.js";
import type { ProviderCredential, ProviderCredentialResolver } from "../../data-plane/credentials/provider-credentials.js";
import type { Database } from "../../db/client.js";
import { eq } from "drizzle-orm";
import { providerCredentials } from "../../db/schema/index.js";

export class PostgresProviderCredentialResolver implements ProviderCredentialResolver {
  public constructor(private readonly db: Database, private readonly secretCipher: SecretCipher) {}
  public async resolve(id: string): Promise<ProviderCredential | null> {
    const [row] = await this.db.select({
      id: providerCredentials.id,
      encryptedSecret: providerCredentials.encryptedSecret,
      secretKeyId: providerCredentials.secretKeyId,
      status: providerCredentials.status,
    }).from(providerCredentials).where(eq(providerCredentials.id, id)).limit(1);
    if (row === undefined || row.status === "disabled" || row.status === "auth_failed" || row.status === "unavailable")
      return null;
    return { id: row.id, secret: this.secretCipher.decrypt(row.encryptedSecret, row.secretKeyId, row.id) };
  }
}
