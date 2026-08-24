import type { Clock } from "../../../core/time/clock.js";
import type {
  CompatibilityProbeCoordinator,
  CompatibilityProbeRepository,
  ConnectionProtocol,
  ConnectionRepository,
} from "./contracts.js";

import { randomUUID } from "node:crypto";

import { AppError } from "../../../core/errors/app-error.js";
import { compatibilityProbeChecks } from "./contracts.js";

const harnessProfileIdByProtocol: Readonly<Record<ConnectionProtocol, string>> = {
  "openai-chat": "profile-generic-openai-chat",
  "openai-responses": "profile-codex",
  "anthropic-messages": "profile-claude-code",
};

export class CompatibilityProbeService {
  public constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly compatibilityRepository: CompatibilityProbeRepository,
    private readonly coordinator: CompatibilityProbeCoordinator,
    private readonly clock: Clock,
  ) {}

  public async list(connectionId: string) {
    if (await this.connectionRepository.getById(connectionId) === null)
      throw new AppError("CONNECTION_NOT_FOUND");
    return this.compatibilityRepository.listByConnection(connectionId);
  }

  public async start(input: {
    readonly endpointId: string;
    readonly credentialId: string;
    readonly model: string;
  }) {
    const target = await this.connectionRepository.getCredentialProbeTarget(input.credentialId, input.endpointId);
    if (target === null)
      throw new AppError("COMPATIBILITY_PROBE_TARGET_NOT_FOUND");
    if (target.credentialStatus === "disabled")
      throw new AppError("CREDENTIAL_DISABLED");
    if (target.endpoint.status === "disabled")
      throw new AppError("ENDPOINT_DISABLED");

    const harnessProfileId = harnessProfileIdByProtocol[target.endpoint.protocol];
    const result = await this.compatibilityRepository.createRun({
      runId: randomUUID(),
      profileId: `compatibility-profile:${input.endpointId}:${harnessProfileId}`,
      connectionId: target.connectionId,
      endpointId: input.endpointId,
      credentialId: input.credentialId,
      harnessProfileId,
      model: input.model,
      checks: compatibilityProbeChecks,
      now: this.clock.now(),
    });
    if (result.created)
      this.coordinator.enqueue(result.run.id);
    return result.run;
  }
}
