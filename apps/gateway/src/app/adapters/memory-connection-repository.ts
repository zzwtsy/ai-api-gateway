import type {
  AddEndpointsCommand,
  ConnectionRecord,
  ConnectionRepository,
  CreateConnectionCommand,
  CredentialProbeTarget,
  CredentialRecord,
  RecordCredentialProbeCommand,
  RotateCredentialCommand,
  UpdateEndpointCommand,
} from "../../control-plane/features/connections/contracts.js";
import { AppError } from "../../core/errors/app-error.js";

import {
  endpointAddress,
  hasConnectionConflict,
  normalizeBaseUrl,
  normalizeCreateConnectionEndpoints,
  validateCreateConnectionCommand,
  validateCredentialFingerprints,
} from "./connection-create-validation.js";

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

  public async hasCredentialFingerprint(fingerprint: string): Promise<boolean> {
    return [...this.#credentialFingerprints.values()].includes(fingerprint);
  }

  public async create(command: CreateConnectionCommand): Promise<ConnectionRecord> {
    const normalizedEndpoints = normalizeCreateConnectionEndpoints(command);
    const credentials = command.accounts.flatMap(account => account.credentials);
    validateCreateConnectionCommand(command, normalizedEndpoints);
    await validateCredentialFingerprints(credentials, fingerprint => this.hasCredentialFingerprint(fingerprint));
    const endpointAddresses = new Set(normalizedEndpoints.map(endpoint => endpointAddress(endpoint)));
    if (hasConnectionConflict(this.#items.values(), command, endpointAddresses)) {
      throw new AppError("CONNECTION_CONFLICT");
    }

    const record: ConnectionRecord = {
      id: command.providerId,
      name: command.name,
      providerSlug: command.providerSlug,
      presetKind: "custom",
      status: "active",
      endpoints: normalizedEndpoints.map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        protocol: endpoint.protocol,
        baseUrl: endpoint.baseUrl,
        requestPath: endpoint.requestPath,
        authScheme: endpoint.authScheme,
        supportsStreaming: endpoint.supportsStreaming,
        status: "active",
      })),
      accounts: command.accounts.map(account => ({
        id: account.id,
        name: account.name,
        billingMode: account.billingMode,
        status: "active",
        credentials: account.credentials.map(credential => ({
          id: credential.id,
          name: credential.name,
          maskedDisplay: credential.encrypted.maskedDisplay,
          status: "unverified",
          endpointIds: normalizedEndpoints
            .filter(endpoint => endpoint.credentialIds.includes(credential.id))
            .map(endpoint => endpoint.id),
          lastSuccessAt: null,
          lastFailureAt: null,
          createdAt: command.now,
          updatedAt: command.now,
          rotatedAt: null,
          disabledAt: null,
        })),
      })),
      createdAt: command.now,
      updatedAt: command.now,
    };
    this.#items.set(record.id, record);
    this.#storeCredentials(credentials);
    return record;
  }

  public async addEndpoints(command: AddEndpointsCommand): Promise<ConnectionRecord | null> {
    const connection = this.#items.get(command.connectionId);
    if (connection === undefined)
      return null;
    const endpointNames = new Set(connection.endpoints.map(endpoint => endpoint.name));
    const endpointAddresses = new Set([...this.#items.values()].flatMap(item => item.endpoints).map(endpoint => endpointAddress(endpoint)));
    const normalizedEndpoints = command.endpoints.map(endpoint => ({ ...endpoint, baseUrl: normalizeBaseUrl(endpoint.baseUrl) }));
    for (const endpoint of normalizedEndpoints) {
      if (endpointNames.has(endpoint.name) || endpointAddresses.has(endpointAddress(endpoint)))
        throw new AppError("CONNECTION_CONFLICT");
      endpointNames.add(endpoint.name);
      endpointAddresses.add(endpointAddress(endpoint));
      if (new Set(endpoint.credentialIds).size !== endpoint.credentialIds.length || endpoint.credentialIds.length === 0)
        throw new AppError("COMMON_VALIDATION_FAILED");
      const credentials = connection.accounts.flatMap(account => account.credentials);
      if (endpoint.credentialIds.some((id) => {
        const credential = credentials.find(item => item.id === id);
        return credential === undefined || credential.status === "disabled";
      })) {
        throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
      }
    }
    const updated: ConnectionRecord = {
      ...connection,
      endpoints: [...connection.endpoints, ...normalizedEndpoints.map(endpoint => ({
        id: endpoint.endpointId,
        name: endpoint.name,
        protocol: endpoint.protocol,
        baseUrl: endpoint.baseUrl,
        requestPath: endpoint.requestPath,
        authScheme: endpoint.authScheme,
        supportsStreaming: endpoint.supportsStreaming,
        status: "active" as const,
      }))],
      accounts: connection.accounts.map(account => ({
        ...account,
        credentials: account.credentials.map(credential => normalizedEndpoints.some(endpoint => endpoint.credentialIds.includes(credential.id))
          ? { ...credential, endpointIds: [...credential.endpointIds, ...normalizedEndpoints.filter(endpoint => endpoint.credentialIds.includes(credential.id)).map(endpoint => endpoint.endpointId)] }
          : credential),
      })),
      updatedAt: command.now,
    };
    this.#items.set(updated.id, updated);
    return updated;
  }

  public async deleteConnection(connectionId: string): Promise<ConnectionRecord | null> {
    const connection = this.#items.get(connectionId);
    if (connection === undefined)
      return null;
    this.#items.delete(connectionId);
    for (const credential of connection.accounts.flatMap(account => account.credentials)) {
      this.#credentialFingerprints.delete(credential.id);
      this.#credentialSecrets.delete(credential.id);
    }
    return connection;
  }

  public async updateEndpoint(command: UpdateEndpointCommand): Promise<ConnectionRecord | null> {
    const owner = this.#findEndpointOwner(command.endpointId);
    if (owner === null)
      return null;
    const normalizedBaseUrl = normalizeBaseUrl(command.baseUrl);
    const endpointNames = new Set(owner.connection.endpoints
      .filter(endpoint => endpoint.id !== command.endpointId)
      .map(endpoint => endpoint.name));
    const addresses = new Set([...this.#items.values()]
      .flatMap(item => item.endpoints)
      .filter(endpoint => endpoint.id !== command.endpointId)
      .map(endpoint => endpointAddress(endpoint)));
    if (endpointNames.has(command.name) || addresses.has(endpointAddress({ ...command, baseUrl: normalizedBaseUrl })))
      throw new AppError("CONNECTION_CONFLICT");
    if (new Set(command.credentialIds).size !== command.credentialIds.length || command.credentialIds.length === 0)
      throw new AppError("COMMON_VALIDATION_FAILED");
    const credentials = owner.connection.accounts.flatMap(account => account.credentials);
    if (command.credentialIds.some((id) => {
      const credential = credentials.find(item => item.id === id);
      return credential === undefined || credential.status === "disabled";
    })) {
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    }
    const selected = new Set(command.credentialIds);
    const updated: ConnectionRecord = {
      ...owner.connection,
      endpoints: owner.connection.endpoints.map(endpoint => endpoint.id === command.endpointId
        ? {
            ...endpoint,
            name: command.name,
            protocol: command.protocol,
            baseUrl: normalizedBaseUrl,
            requestPath: command.requestPath,
            authScheme: command.authScheme,
            supportsStreaming: command.supportsStreaming,
          }
        : endpoint),
      accounts: owner.connection.accounts.map(account => ({
        ...account,
        credentials: account.credentials.map(credential => ({
          ...credential,
          endpointIds: selected.has(credential.id)
            ? [...credential.endpointIds.filter(id => id !== command.endpointId), command.endpointId]
            : credential.endpointIds.filter(id => id !== command.endpointId),
        })),
      })),
      updatedAt: command.now,
    };
    this.#items.set(updated.id, updated);
    return updated;
  }

  public async deleteEndpoint(endpointId: string, now: Date): Promise<ConnectionRecord | null> {
    const owner = this.#findEndpointOwner(endpointId);
    if (owner === null)
      return null;
    const updated: ConnectionRecord = {
      ...owner.connection,
      endpoints: owner.connection.endpoints.filter(endpoint => endpoint.id !== endpointId),
      accounts: owner.connection.accounts.map(account => ({
        ...account,
        credentials: account.credentials.map(credential => ({
          ...credential,
          endpointIds: credential.endpointIds.filter(id => id !== endpointId),
        })),
      })),
      updatedAt: now,
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

  #findEndpointOwner(endpointId: string): { connection: ConnectionRecord; endpoint: ConnectionRecord["endpoints"][number] } | null {
    for (const connection of this.#items.values()) {
      const endpoint = connection.endpoints.find(item => item.id === endpointId);
      if (endpoint !== undefined)
        return { connection, endpoint };
    }
    return null;
  }

  #storeCredentials(credentials: readonly CreateConnectionCommand["accounts"][number]["credentials"][number][]): void {
    for (const credential of credentials) {
      this.#credentialFingerprints.set(credential.id, credential.encrypted.fingerprint);
      this.#credentialSecrets.set(credential.id, {
        encryptedSecret: credential.encrypted.encryptedSecret,
        secretKeyId: credential.encrypted.secretKeyId,
      });
    }
  }
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
