import type { SecretCipher } from "../../../core/crypto/secret-cipher.js";
import type { Clock } from "../../../core/time/clock.js";
import type { AddEndpointInput, ConnectionRepository, CreateConnectionInput, CredentialProber } from "./contracts.js";
import { randomUUID } from "node:crypto";

import { AppError } from "../../../core/errors/app-error.js";

export class ConnectionService {
  public constructor(
    private readonly repository: ConnectionRepository,
    private readonly secretCipher: SecretCipher,
    private readonly clock: Clock,
    private readonly credentialProber: CredentialProber,
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

  public create(input: CreateConnectionInput) {
    const credentialId = randomUUID();
    return this.repository.create({
      ...input,
      providerId: randomUUID(),
      endpointId: randomUUID(),
      accountId: randomUUID(),
      credential: {
        id: credentialId,
        name: input.credential.name,
        encrypted: this.secretCipher.encrypt(input.credential.secret, credentialId),
      },
      now: this.clock.now(),
    });
  }

  public async addEndpoint(connectionId: string, input: AddEndpointInput) {
    const connection = await this.repository.getById(connectionId);
    if (connection === null)
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    const availableCredentialIds = new Set(connection.accounts
      .flatMap(account => account.credentials)
      .filter(credential => credential.status !== "disabled")
      .map(credential => credential.id));
    if (input.credentialIds.some(credentialId => !availableCredentialIds.has(credentialId)))
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
    const item = await this.repository.addEndpoint({
      ...input,
      connectionId,
      endpointId: randomUUID(),
      now: this.clock.now(),
    });
    if (item === null)
      throw new AppError("ENDPOINT_TARGET_NOT_FOUND");
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
