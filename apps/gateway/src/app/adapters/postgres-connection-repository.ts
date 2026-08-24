import type {
  AccountRecord,
  AddEndpointCommand,
  BillingMode,
  ConnectionProtocol,
  ConnectionRecord,
  ConnectionRepository,
  CreateConnectionCommand,
  CredentialProbeTarget,
  CredentialRecord,
  CredentialStatus,
  EndpointRecord,
  RecordCredentialProbeCommand,
  RotateCredentialCommand,
} from "../../control-plane/features/connections/contracts.js";
import type { Database } from "../../db/client.js";
import { and, asc, eq } from "drizzle-orm";

import { AppError } from "../../core/errors/app-error.js";
import {
  endpointCredentials,
  providerAccounts,
  providerCredentials,
  providers,
  upstreamEndpoints,
} from "../../db/schema/index.js";

export class PostgresConnectionRepository implements ConnectionRepository {
  public constructor(private readonly db: Database) {}

  public async list(): Promise<readonly ConnectionRecord[]> {
    const [providerRows, endpointRows, accountRows, credentialRows, bindingRows] = await Promise.all([
      this.db.select().from(providers).orderBy(asc(providers.createdAt), asc(providers.id)),
      this.db.select().from(upstreamEndpoints).orderBy(asc(upstreamEndpoints.createdAt), asc(upstreamEndpoints.id)),
      this.db.select().from(providerAccounts).orderBy(asc(providerAccounts.createdAt), asc(providerAccounts.id)),
      this.db.select().from(providerCredentials).orderBy(asc(providerCredentials.createdAt), asc(providerCredentials.id)),
      this.db.select().from(endpointCredentials).orderBy(asc(endpointCredentials.createdAt)),
    ]);

    const endpointIdsByCredential = new Map<string, string[]>();
    for (const binding of bindingRows) {
      const endpointIds = endpointIdsByCredential.get(binding.credentialId) ?? [];
      endpointIds.push(binding.endpointId);
      endpointIdsByCredential.set(binding.credentialId, endpointIds);
    }
    const credentialsByAccount = new Map<string, CredentialRecord[]>();
    for (const credential of credentialRows) {
      const records = credentialsByAccount.get(credential.accountId) ?? [];
      records.push({
        id: credential.id,
        name: credential.name,
        maskedDisplay: credential.maskedDisplay,
        status: credential.status as CredentialStatus,
        endpointIds: endpointIdsByCredential.get(credential.id) ?? [],
        lastSuccessAt: credential.lastSuccessAt,
        lastFailureAt: credential.lastFailureAt,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        rotatedAt: credential.rotatedAt,
        disabledAt: credential.disabledAt,
      });
      credentialsByAccount.set(credential.accountId, records);
    }
    const accountsByProvider = new Map<string, AccountRecord[]>();
    for (const account of accountRows) {
      const records = accountsByProvider.get(account.providerId) ?? [];
      records.push({
        id: account.id,
        name: account.name,
        billingMode: account.billingMode as BillingMode,
        status: account.status as AccountRecord["status"],
        credentials: credentialsByAccount.get(account.id) ?? [],
      });
      accountsByProvider.set(account.providerId, records);
    }
    const endpointsByProvider = new Map<string, EndpointRecord[]>();
    for (const endpoint of endpointRows) {
      const records = endpointsByProvider.get(endpoint.providerId) ?? [];
      records.push({
        id: endpoint.id,
        name: endpoint.name,
        protocol: endpoint.protocol as ConnectionProtocol,
        baseUrl: endpoint.baseUrl,
        requestPath: endpoint.requestPath,
        authScheme: endpoint.authScheme as EndpointRecord["authScheme"],
        supportsStreaming: endpoint.supportsStreaming,
        status: endpoint.status as EndpointRecord["status"],
      });
      endpointsByProvider.set(endpoint.providerId, records);
    }

    return providerRows.map(provider => ({
      id: provider.id,
      name: provider.name,
      providerSlug: provider.slug,
      presetKind: provider.presetKind as ConnectionRecord["presetKind"],
      status: provider.status as ConnectionRecord["status"],
      endpoints: endpointsByProvider.get(provider.id) ?? [],
      accounts: accountsByProvider.get(provider.id) ?? [],
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    }));
  }

  public async getById(id: string): Promise<ConnectionRecord | null> {
    return (await this.list()).find(connection => connection.id === id) ?? null;
  }

  public async create(command: CreateConnectionCommand): Promise<ConnectionRecord> {
    try {
      await this.db.transaction(async (tx) => {
        const baseUrl = normalizeBaseUrl(command.endpoint.baseUrl);
        await tx.insert(providers).values({
          id: command.providerId,
          slug: command.providerSlug,
          name: command.name,
          presetKind: "custom",
          status: "active",
          createdAt: command.now,
          updatedAt: command.now,
        });
        await tx.insert(upstreamEndpoints).values({
          id: command.endpointId,
          providerId: command.providerId,
          name: command.endpoint.name,
          protocol: command.endpoint.protocol,
          baseUrl,
          requestPath: command.endpoint.requestPath,
          authScheme: command.endpoint.authScheme,
          supportsStreaming: command.endpoint.supportsStreaming,
          status: "active",
          createdAt: command.now,
          updatedAt: command.now,
        });
        await tx.insert(providerAccounts).values({
          id: command.accountId,
          providerId: command.providerId,
          name: command.account.name,
          billingMode: command.account.billingMode,
          status: "active",
          createdAt: command.now,
          updatedAt: command.now,
        });
        await tx.insert(providerCredentials).values({
          id: command.credential.id,
          accountId: command.accountId,
          name: command.credential.name,
          encryptedSecret: command.credential.encrypted.encryptedSecret,
          secretKeyId: command.credential.encrypted.secretKeyId,
          fingerprint: command.credential.encrypted.fingerprint,
          maskedDisplay: command.credential.encrypted.maskedDisplay,
          status: "unverified",
          createdAt: command.now,
          updatedAt: command.now,
        });
        await tx.insert(endpointCredentials).values({
          endpointId: command.endpointId,
          credentialId: command.credential.id,
          enabled: true,
          priority: 100,
          createdAt: command.now,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("CONNECTION_CONFLICT", undefined, { cause: error });
      }
      throw error;
    }
    return this.requiredConnection(command.providerId);
  }

  public async addEndpoint(command: AddEndpointCommand): Promise<ConnectionRecord | null> {
    if (await this.getById(command.connectionId) === null)
      return null;
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(upstreamEndpoints).values({
          id: command.endpointId,
          providerId: command.connectionId,
          name: command.name,
          protocol: command.protocol,
          baseUrl: normalizeBaseUrl(command.baseUrl),
          requestPath: command.requestPath,
          authScheme: command.authScheme,
          supportsStreaming: command.supportsStreaming,
          status: "active",
          createdAt: command.now,
          updatedAt: command.now,
        });
        await tx.insert(endpointCredentials).values(command.credentialIds.map(credentialId => ({
          endpointId: command.endpointId,
          credentialId,
          enabled: true,
          priority: 100,
          createdAt: command.now,
        })));
        await tx.update(providers).set({ updatedAt: command.now }).where(eq(providers.id, command.connectionId));
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new AppError("CONNECTION_CONFLICT", undefined, { cause: error });
      throw error;
    }
    return this.requiredConnection(command.connectionId);
  }

  public async rotateCredential(command: RotateCredentialCommand): Promise<ConnectionRecord | null> {
    const ownerId = await this.providerIdForCredential(command.credentialId);
    if (ownerId === null) {
      return null;
    }
    try {
      await this.db.update(providerCredentials).set({
        encryptedSecret: command.encrypted.encryptedSecret,
        secretKeyId: command.encrypted.secretKeyId,
        fingerprint: command.encrypted.fingerprint,
        maskedDisplay: command.encrypted.maskedDisplay,
        status: "unverified",
        updatedAt: command.now,
        rotatedAt: command.now,
        disabledAt: null,
      }).where(eq(providerCredentials.id, command.credentialId));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("CREDENTIAL_CONFLICT", undefined, { cause: error });
      }
      throw error;
    }
    return this.requiredConnection(ownerId);
  }

  public async disableCredential(credentialId: string, now: Date): Promise<ConnectionRecord | null> {
    const ownerId = await this.providerIdForCredential(credentialId);
    if (ownerId === null) {
      return null;
    }
    await this.db.update(providerCredentials).set({
      status: "disabled",
      updatedAt: now,
      disabledAt: now,
    }).where(eq(providerCredentials.id, credentialId));
    return this.requiredConnection(ownerId);
  }

  public async getCredentialProbeTarget(credentialId: string, endpointId: string): Promise<CredentialProbeTarget | null> {
    const [row] = await this.db
      .select({
        credentialId: providerCredentials.id,
        connectionId: upstreamEndpoints.providerId,
        credentialStatus: providerCredentials.status,
        encryptedSecret: providerCredentials.encryptedSecret,
        secretKeyId: providerCredentials.secretKeyId,
        endpointId: upstreamEndpoints.id,
        endpointName: upstreamEndpoints.name,
        endpointProtocol: upstreamEndpoints.protocol,
        endpointBaseUrl: upstreamEndpoints.baseUrl,
        endpointRequestPath: upstreamEndpoints.requestPath,
        endpointAuthScheme: upstreamEndpoints.authScheme,
        endpointSupportsStreaming: upstreamEndpoints.supportsStreaming,
        endpointStatus: upstreamEndpoints.status,
      })
      .from(endpointCredentials)
      .innerJoin(providerCredentials, eq(endpointCredentials.credentialId, providerCredentials.id))
      .innerJoin(upstreamEndpoints, eq(endpointCredentials.endpointId, upstreamEndpoints.id))
      .where(and(
        eq(endpointCredentials.credentialId, credentialId),
        eq(endpointCredentials.endpointId, endpointId),
        eq(endpointCredentials.enabled, true),
      ))
      .limit(1);
    if (row === undefined)
      return null;
    return {
      connectionId: row.connectionId,
      credentialId: row.credentialId,
      credentialStatus: row.credentialStatus as CredentialStatus,
      encryptedSecret: row.encryptedSecret,
      secretKeyId: row.secretKeyId,
      endpoint: {
        id: row.endpointId,
        name: row.endpointName,
        protocol: row.endpointProtocol as ConnectionProtocol,
        baseUrl: row.endpointBaseUrl,
        requestPath: row.endpointRequestPath,
        authScheme: row.endpointAuthScheme as EndpointRecord["authScheme"],
        supportsStreaming: row.endpointSupportsStreaming,
        status: row.endpointStatus as EndpointRecord["status"],
      },
    };
  }

  public async recordCredentialProbe(command: RecordCredentialProbeCommand): Promise<ConnectionRecord | null> {
    const ownerId = await this.providerIdForCredential(command.credentialId);
    if (ownerId === null)
      return null;
    await this.db.update(providerCredentials).set({
      ...(command.status === null ? {} : { status: command.status }),
      ...(command.succeeded ? { lastSuccessAt: command.now } : { lastFailureAt: command.now }),
      updatedAt: command.now,
    }).where(eq(providerCredentials.id, command.credentialId));
    return this.requiredConnection(ownerId);
  }

  private async providerIdForCredential(credentialId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ providerId: providerAccounts.providerId })
      .from(providerCredentials)
      .innerJoin(providerAccounts, eq(providerCredentials.accountId, providerAccounts.id))
      .where(eq(providerCredentials.id, credentialId))
      .limit(1);
    return row?.providerId ?? null;
  }

  private async requiredConnection(id: string): Promise<ConnectionRecord> {
    const connection = await this.getById(id);
    if (connection === null) {
      throw new Error(`Connection ${id} was not available after a successful write.`);
    }
    return connection;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === "23505") {
    return true;
  }
  return "cause" in error && isUniqueViolation(error.cause);
}
