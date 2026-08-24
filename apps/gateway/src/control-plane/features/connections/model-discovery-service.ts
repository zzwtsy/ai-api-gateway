import type { SecretCipher } from "../../../core/crypto/secret-cipher.js";
import type { ConnectionRepository, ModelCatalogDiscoverer } from "./contracts.js";

import { AppError } from "../../../core/errors/app-error.js";

export class ModelDiscoveryService {
  public constructor(
    private readonly repository: ConnectionRepository,
    private readonly secretCipher: SecretCipher,
    private readonly discoverer: ModelCatalogDiscoverer,
  ) {}

  public async discover(input: {
    readonly endpointId: string;
    readonly credentialId: string;
    readonly modelsPath: string;
  }) {
    const target = await this.repository.getCredentialProbeTarget(input.credentialId, input.endpointId);
    if (target === null)
      throw new AppError("MODEL_DISCOVERY_TARGET_NOT_FOUND");
    if (target.credentialStatus === "disabled")
      throw new AppError("CREDENTIAL_DISABLED");
    if (target.endpoint.status === "disabled")
      throw new AppError("ENDPOINT_DISABLED");

    const result = await this.discoverer.discover({
      endpoint: target.endpoint,
      modelsPath: input.modelsPath,
      secret: this.secretCipher.decrypt(target.encryptedSecret, target.secretKeyId, target.credentialId),
    });
    if (result.outcome === "failed")
      throw new AppError("MODEL_DISCOVERY_FAILED");

    return { models: result.modelIds.map(id => ({ id })) };
  }
}
