import type { Env } from "../../config/env-schema.js";
import type { SecretCipher } from "../../core/crypto/secret-cipher.js";
import type { Database } from "../../db/client.js";

import { eq } from "drizzle-orm";

import { gatewayKeyPrefix, hashGatewayKey } from "../../core/crypto/gateway-key.js";
import {
  gatewayClientKeys,
  gatewayClients,
  providerAccounts,
  providerCredentials,
  providers,
} from "../../db/schema/index.js";

type BootstrapConfiguration = Pick<Env, | "BOOTSTRAP_CONNECTION_ID"
  | "BOOTSTRAP_PROVIDER_API_KEY"
  | "BOOTSTRAP_PROVIDER_CREDENTIAL_ID"
  | "GATEWAY_CLIENT_KEY"
  | "GATEWAY_KEY_PEPPER">;

const BOOTSTRAP_PROFILE_ID = "profile-generic-openai-chat";

export async function ensurePostgresBootstrapConfiguration(
  db: Database,
  secretCipher: SecretCipher,
  config: BootstrapConfiguration,
): Promise<void> {
  const now = new Date();
  const accountId = `${config.BOOTSTRAP_CONNECTION_ID}-account`;
  const clientId = `${config.BOOTSTRAP_CONNECTION_ID}-client`;

  await db.transaction(async (tx) => {
    const [credential] = await tx.select({ id: providerCredentials.id })
      .from(providerCredentials)
      .where(eq(providerCredentials.id, config.BOOTSTRAP_PROVIDER_CREDENTIAL_ID))
      .limit(1);
    if (credential === undefined) {
      const [provider] = await tx.select({ id: providers.id })
        .from(providers)
        .where(eq(providers.id, config.BOOTSTRAP_CONNECTION_ID))
        .limit(1);
      if (provider === undefined) {
        await tx.insert(providers).values({
          id: config.BOOTSTRAP_CONNECTION_ID,
          slug: bootstrapProviderSlug(config.BOOTSTRAP_CONNECTION_ID),
          name: `Bootstrap ${config.BOOTSTRAP_CONNECTION_ID}`,
          presetKind: "custom",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }

      const [account] = await tx.select({ id: providerAccounts.id })
        .from(providerAccounts)
        .where(eq(providerAccounts.id, accountId))
        .limit(1);
      if (account === undefined) {
        await tx.insert(providerAccounts).values({
          id: accountId,
          providerId: config.BOOTSTRAP_CONNECTION_ID,
          name: "Bootstrap Account",
          billingMode: "unknown",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }

      const encrypted = secretCipher.encrypt(
        config.BOOTSTRAP_PROVIDER_API_KEY,
        config.BOOTSTRAP_PROVIDER_CREDENTIAL_ID,
      );
      await tx.insert(providerCredentials).values({
        id: config.BOOTSTRAP_PROVIDER_CREDENTIAL_ID,
        accountId,
        name: "Bootstrap Credential",
        encryptedSecret: encrypted.encryptedSecret,
        secretKeyId: encrypted.secretKeyId,
        fingerprint: encrypted.fingerprint,
        maskedDisplay: encrypted.maskedDisplay,
        status: "unverified",
        createdAt: now,
        updatedAt: now,
      });
    }

    const [client] = await tx.select({ id: gatewayClients.id })
      .from(gatewayClients)
      .where(eq(gatewayClients.id, clientId))
      .limit(1);
    if (client === undefined) {
      await tx.insert(gatewayClients).values({
        id: clientId,
        harnessProfileId: BOOTSTRAP_PROFILE_ID,
        name: `Bootstrap ${clientId}`,
        allowedProtocols: ["openai-chat"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(gatewayClientKeys).values({
        id: `${clientId}-key`,
        clientId,
        keyPrefix: gatewayKeyPrefix(config.GATEWAY_CLIENT_KEY),
        keyLast4: config.GATEWAY_CLIENT_KEY.slice(-4),
        secretHash: hashGatewayKey(config.GATEWAY_CLIENT_KEY, config.GATEWAY_KEY_PEPPER).toString("base64url"),
        status: "active",
        createdAt: now,
      });
    }
  });
}

function bootstrapProviderSlug(connectionId: string): string {
  const normalized = connectionId
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return normalized.length === 0 ? "bootstrap-provider" : `bootstrap-${normalized}`;
}
