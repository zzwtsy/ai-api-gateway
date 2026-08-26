import type { SecretCipher } from "../../../core/crypto/secret-cipher.js";
import type { Clock } from "../../../core/time/clock.js";
import type {
  AddEndpointInput,
  ConnectionLifecycle,
  ConnectionRepository,
  CreateConnectionInput,
  CredentialProber,
  EndpointDeletionImpact,
  EndpointLifecycle,
} from "./contracts.js";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../core/errors/app-error.js";

import {
  validateAddEndpointInputs,
  validateCreateInput,
  validateExistingConflicts,
} from "./validation.js";

export class ConnectionService {
  public constructor(
    private readonly repository: ConnectionRepository,
    private readonly secretCipher: SecretCipher,
    private readonly clock: Clock,
    private readonly credentialProber: CredentialProber,
    private readonly endpointLifecycle: EndpointLifecycle,
    private readonly connectionLifecycle: ConnectionLifecycle,
  ) {}

  public list() {
    return this.repository.list();
  }

  public async getById(id: string) {
    const item = await this.repository.getById(id);
    if (item === null) {
      throw new AppError("CONNECTION_NOT_FOUND");
    }
    return item;
  }

  public async getConnectionDeletionImpact(connectionId: string) {
    const impact = await this.connectionLifecycle.getDeletionImpact(connectionId);
    if (impact === null)
      throw new AppError("CONNECTION_NOT_FOUND");
    return impact;
  }

  public async deleteConnection(connectionId: string) {
    const result = await this.connectionLifecycle.deleteConnection(connectionId);
    if (result === null)
      throw new AppError("CONNECTION_NOT_FOUND");
    return result;
  }

  public async create(input: CreateConnectionInput) {
    validateCreateInput(input);
    const existing = await this.repository.list();
    validateExistingConflicts(input, existing);

    const endpointIds = new Map<string, string>();
    for (const endpoint of input.endpoints) {
      endpointIds.set(endpoint.ref, randomUUID());
    }
    const credentialIds = new Map<string, string>();
    const encryptedCredentials = new Map<string, {
      readonly id: string;
      readonly name: string;
      readonly encrypted: ReturnType<SecretCipher["encrypt"]>;
    }>();
    for (const account of input.accounts) {
      for (const credential of account.credentials) {
        const id = randomUUID();
        credentialIds.set(credential.ref, id);
        encryptedCredentials.set(credential.ref, {
          id,
          name: credential.name,
          encrypted: this.secretCipher.encrypt(credential.secret, id),
        });
      }
    }
    const fingerprints = new Set<string>();
    for (const credential of encryptedCredentials.values()) {
      if (fingerprints.has(credential.encrypted.fingerprint))
        throw new AppError("CREDENTIAL_CONFLICT");
      fingerprints.add(credential.encrypted.fingerprint);
      if (await this.repository.hasCredentialFingerprint(credential.encrypted.fingerprint))
        throw new AppError("CREDENTIAL_CONFLICT");
    }

    const now = this.clock.now();
    return this.repository.create({
      providerId: randomUUID(),
      name: input.name,
      providerSlug: input.providerSlug,
      endpoints: input.endpoints.map(endpoint => ({
        id: endpointIds.get(endpoint.ref)!,
        name: endpoint.name,
        protocol: endpoint.protocol,
        baseUrl: endpoint.baseUrl,
        requestPath: endpoint.requestPath,
        authScheme: endpoint.authScheme,
        supportsStreaming: endpoint.supportsStreaming,
        credentialIds: endpoint.credentialRefs.map(ref => credentialIds.get(ref)!),
      })),
      accounts: input.accounts.map(account => ({
        id: randomUUID(),
        name: account.name,
        billingMode: account.billingMode,
        credentials: account.credentials.map(credential => encryptedCredentials.get(credential.ref)!),
      })),
      now,
    });
  }

  public async addEndpoints(connectionId: string, inputs: readonly AddEndpointInput[]) {
    const connection = await this.repository.getById(connectionId);
    if (connection === null)
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    validateAddEndpointInputs(connection, inputs, await this.repository.list());
    const now = this.clock.now();
    const commands = inputs.map(input => ({ ...input, endpointId: randomUUID() }));
    const item = await this.endpointLifecycle.addEndpoints({ connectionId, endpoints: commands, now });
    if (item === null)
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    return item;
  }

  public async updateEndpoint(endpointId: string, input: AddEndpointInput) {
    const item = await this.endpointLifecycle.updateEndpoint({
      ...input,
      endpointId,
      now: this.clock.now(),
    });
    if (item === null)
      throw new AppError("ENDPOINT_NOT_FOUND");
    return item;
  }

  public async getEndpointDeletionImpact(endpointId: string): Promise<EndpointDeletionImpact> {
    const impact = await this.endpointLifecycle.getDeletionImpact(endpointId);
    if (impact === null)
      throw new AppError("ENDPOINT_NOT_FOUND");
    return impact;
  }

  public async deleteEndpoint(endpointId: string) {
    const item = await this.endpointLifecycle.deleteEndpoint(endpointId, this.clock.now());
    if (item === null)
      throw new AppError("ENDPOINT_NOT_FOUND");
    return item;
  }

  public async rotateCredential(credentialId: string, secret: string) {
    const item = await this.repository.rotateCredential({
      credentialId,
      encrypted: this.secretCipher.encrypt(secret, credentialId),
      now: this.clock.now(),
    });
    if (item === null) {
      throw new AppError("CREDENTIAL_NOT_FOUND");
    }
    return item;
  }

  public async disableCredential(credentialId: string) {
    const item = await this.repository.disableCredential(credentialId, this.clock.now());
    if (item === null) {
      throw new AppError("CREDENTIAL_NOT_FOUND");
    }
    return item;
  }

  public async probeCredential(credentialId: string, endpointId: string, model: string) {
    const target = await this.repository.getCredentialProbeTarget(credentialId, endpointId);
    if (target === null) {
      throw new AppError("CREDENTIAL_PROBE_TARGET_NOT_FOUND");
    }
    if (target.credentialStatus === "disabled") {
      throw new AppError("CREDENTIAL_DISABLED");
    }
    const checkedAt = this.clock.now();
    const result = await this.credentialProber.probe({
      endpoint: target.endpoint,
      model,
      secret: this.secretCipher.decrypt(target.encryptedSecret, target.secretKeyId, target.credentialId),
    });
    const status = probeCredentialStatus(result.classification);
    const connection = await this.repository.recordCredentialProbe({
      credentialId,
      status,
      succeeded: result.classification === "healthy",
      now: checkedAt,
    });
    if (connection === null) {
      throw new AppError("CREDENTIAL_NOT_FOUND");
    }
    return {
      credentialId,
      endpointId,
      model,
      outcome: result.classification === "healthy" ? "succeeded" as const : "failed" as const,
      ...result,
      checkedAt,
    };
  }
}

function probeCredentialStatus(classification: Awaited<ReturnType<CredentialProber["probe"]>>["classification"]) {
  if (classification === "healthy" || classification === "auth_failed" || classification === "unavailable")
    return classification;
  return null;
}
