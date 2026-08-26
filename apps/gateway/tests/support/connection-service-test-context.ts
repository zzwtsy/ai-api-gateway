import type { CredentialProber } from "../../src/control-plane/features/connections/contracts.js";
import type { SecretCipher } from "../../src/core/crypto/secret-cipher.js";
import type { Clock } from "../../src/core/time/clock.js";

import { MemoryCompatibilityProbeRepository } from "../../src/app/adapters/memory-compatibility-probe-repository.js";
import { MemoryConnectionLifecycle } from "../../src/app/adapters/memory-connection-lifecycle.js";
import { MemoryConnectionRepository } from "../../src/app/adapters/memory-connection-repository.js";
import { MemoryEndpointLifecycle } from "../../src/app/adapters/memory-endpoint-lifecycle.js";
import { MemoryModelBindingRepository } from "../../src/app/adapters/memory-model-binding-repository.js";
import { ConnectionService } from "../../src/control-plane/features/connections/service.js";

export function createConnectionServiceTestContext(
  secretCipher: SecretCipher,
  clock: Clock,
  credentialProber: CredentialProber,
) {
  const repository = new MemoryConnectionRepository();
  const compatibilityRepository = new MemoryCompatibilityProbeRepository();
  const modelBindingRepository = new MemoryModelBindingRepository(async endpointId =>
    (await repository.list()).some(connection => connection.endpoints.some(endpoint => endpoint.id === endpointId)));
  const endpointLifecycle = new MemoryEndpointLifecycle(
    repository,
    modelBindingRepository,
    compatibilityRepository,
  );
  const connectionLifecycle = new MemoryConnectionLifecycle(
    repository,
    modelBindingRepository,
    compatibilityRepository,
  );
  return {
    repository,
    service: new ConnectionService(repository, secretCipher, clock, credentialProber, endpointLifecycle, connectionLifecycle),
  };
}
