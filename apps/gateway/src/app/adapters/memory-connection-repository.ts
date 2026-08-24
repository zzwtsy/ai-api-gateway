import type {
  AddEndpointCommand,
  ConnectionRecord,
  ConnectionRepository,
  CreateConnectionCommand,
  CredentialProbeTarget,
  CredentialRecord,
  RecordCredentialProbeCommand,
  RotateCredentialCommand,
} from "../../control-plane/features/connections/contracts.js";

import { AppError } from "../../core/errors/app-error.js";

export class MemoryConnectionRepository implements ConnectionRepository {
  readonly #items = new Map<string, ConnectionRecord>();
  readonly #credentialFingerprints = new Map<string, string>();
  readonly #credentialSecrets = new Map<string, { encryptedSecret: string; secretKeyId: string }>();

  public async list(): Promise<readonly ConnectionRecord[]> {
    return [...this.#items.values()].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public async getById(id: string): Promise<ConnectionRecord | null> {
    return this.#items.get(id) ?? null;
  }

  public async create(command: CreateConnectionCommand): Promise<ConnectionRecord> {
    const normalizedBaseUrl = normalizeBaseUrl(command.endpoint.baseUrl);
    const hasConflict = [...this.#items.values()].some(item =>
      item.name === command.name
      || item.providerSlug === command.providerSlug
      || item.endpoints.some(endpoint =>
        endpoint.protocol === command.endpoint.protocol
        && endpoint.baseUrl === normalizedBaseUrl
        && endpoint.requestPath === command.endpoint.requestPath,
      ),
    );
    if (hasConflict || [...this.#credentialFingerprints.values()].includes(command.credential.encrypted.fingerprint)) {
      throw new AppError("CONNECTION_CONFLICT");
    }
    const record: ConnectionRecord = {
      id: command.providerId,
      name: command.name,
      providerSlug: command.providerSlug,
      presetKind: "custom",
      status: "active",
      endpoints: [{
        id: command.endpointId,
        name: command.endpoint.name,
        protocol: command.endpoint.protocol,
        baseUrl: normalizedBaseUrl,
        requestPath: command.endpoint.requestPath,
        authScheme: command.endpoint.authScheme,
        supportsStreaming: command.endpoint.supportsStreaming,
        status: "active",
      }],
      accounts: [{
        id: command.accountId,
        name: command.account.name,
        billingMode: command.account.billingMode,
        status: "active",
        credentials: [{
          id: command.credential.id,
          name: command.credential.name,
          maskedDisplay: command.credential.encrypted.maskedDisplay,
          status: "unverified",
          endpointIds: [command.endpointId],
          lastSuccessAt: null,
          lastFailureAt: null,
          createdAt: command.now,
          updatedAt: command.now,
          rotatedAt: null,
          disabledAt: null,
        }],
      }],
      createdAt: command.now,
      updatedAt: command.now,
    };
    this.#items.set(record.id, record);
    this.#credentialFingerprints.set(command.credential.id, command.credential.encrypted.fingerprint);
    this.#credentialSecrets.set(command.credential.id, {
      encryptedSecret: command.credential.encrypted.encryptedSecret,
      secretKeyId: command.credential.encrypted.secretKeyId,
    });
    return record;
  }

  public async addEndpoint(command: AddEndpointCommand): Promise<ConnectionRecord | null> {
    const connection = this.#items.get(command.connectionId);
    if (connection === undefined)
      return null;
    const normalizedBaseUrl = normalizeBaseUrl(command.baseUrl);
    const conflict = [...this.#items.values()].some(item => item.endpoints.some(endpoint =>
      (item.id === command.connectionId && endpoint.name === command.name)
      || (endpoint.protocol === command.protocol
        && endpoint.baseUrl === normalizedBaseUrl
        && endpoint.requestPath === command.requestPath),
    ));
    if (conflict)
      throw new AppError("CONNECTION_CONFLICT");
    const credentialIds = new Set(command.credentialIds);
    const updated: ConnectionRecord = {
      ...connection,
      endpoints: [...connection.endpoints, {
        id: command.endpointId,
        name: command.name,
        protocol: command.protocol,
        baseUrl: normalizedBaseUrl,
        requestPath: command.requestPath,
        authScheme: command.authScheme,
        supportsStreaming: command.supportsStreaming,
        status: "active",
      }],
      accounts: connection.accounts.map(account => ({
        ...account,
        credentials: account.credentials.map(credential => credentialIds.has(credential.id)
          ? { ...credential, endpointIds: [...credential.endpointIds, command.endpointId] }
          : credential),
      })),
      updatedAt: command.now,
    };
    this.#items.set(updated.id, updated);
    return updated;
  }

  public async rotateCredential(command: RotateCredentialCommand): Promise<ConnectionRecord | null> {
    const owner = this.#findCredentialOwner(command.credentialId);
    if (owner === null) {
      return null;
    }
    const duplicate = [...this.#credentialFingerprints.entries()].some(([id, fingerprint]) =>
      id !== command.credentialId && fingerprint === command.encrypted.fingerprint,
    );
    if (duplicate) {
      throw new AppError("CREDENTIAL_CONFLICT");
    }
    const updated = replaceCredential(owner.connection, command.credentialId, credential => ({
      ...credential,
      maskedDisplay: command.encrypted.maskedDisplay,
      status: "unverified",
      updatedAt: command.now,
      rotatedAt: command.now,
      disabledAt: null,
    }), command.now);
    this.#items.set(updated.id, updated);
    this.#credentialFingerprints.set(command.credentialId, command.encrypted.fingerprint);
    this.#credentialSecrets.set(command.credentialId, {
      encryptedSecret: command.encrypted.encryptedSecret,
      secretKeyId: command.encrypted.secretKeyId,
    });
    return updated;
  }

  public async disableCredential(credentialId: string, now: Date): Promise<ConnectionRecord | null> {
    const owner = this.#findCredentialOwner(credentialId);
    if (owner === null) {
      return null;
    }
    const updated = replaceCredential(owner.connection, credentialId, credential => ({
      ...credential,
      status: "disabled",
      updatedAt: now,
      disabledAt: now,
    }), now);
    this.#items.set(updated.id, updated);
    return updated;
  }

  public async getCredentialProbeTarget(credentialId: string, endpointId: string): Promise<CredentialProbeTarget | null> {
    const owner = this.#findCredentialOwner(credentialId);
    const encrypted = this.#credentialSecrets.get(credentialId);
    if (owner === null || encrypted === undefined)
      return null;
    const credential = owner.connection.accounts.flatMap(account => account.credentials).find(item => item.id === credentialId);
    const endpoint = owner.connection.endpoints.find(item => item.id === endpointId);
    if (credential === undefined || endpoint === undefined || !credential.endpointIds.includes(endpointId))
      return null;
    return {
      connectionId: owner.connection.id,
      credentialId,
      credentialStatus: credential.status,
      ...encrypted,
      endpoint,
    };
  }

  public async recordCredentialProbe(command: RecordCredentialProbeCommand): Promise<ConnectionRecord | null> {
    const owner = this.#findCredentialOwner(command.credentialId);
    if (owner === null)
      return null;
    const updated = replaceCredential(owner.connection, command.credentialId, credential => ({
      ...credential,
      status: command.status ?? credential.status,
      lastSuccessAt: command.succeeded ? command.now : credential.lastSuccessAt,
      lastFailureAt: command.succeeded ? credential.lastFailureAt : command.now,
      updatedAt: command.now,
    }), command.now);
    this.#items.set(updated.id, updated);
    return updated;
  }

  #findCredentialOwner(credentialId: string): { connection: ConnectionRecord } | null {
    for (const connection of this.#items.values()) {
      if (connection.accounts.some(account => account.credentials.some(credential => credential.id === credentialId))) {
        return { connection };
      }
    }
    return null;
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function replaceCredential(
  connection: ConnectionRecord,
  credentialId: string,
  update: (credential: CredentialRecord) => CredentialRecord,
  now: Date,
): ConnectionRecord {
  return {
    ...connection,
    accounts: connection.accounts.map(account => ({
      ...account,
      credentials: account.credentials.map(credential => credential.id === credentialId ? update(credential) : credential),
    })),
    updatedAt: now,
  };
}
