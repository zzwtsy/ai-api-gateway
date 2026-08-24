import type {
  CompatibilityProbeRunRecord,
  CreateCompatibilityProbeRunCommand,
} from "../../control-plane/features/connections/contracts.js";

export function createQueuedCompatibilityProbeRun(
  command: CreateCompatibilityProbeRunCommand,
  profileId: string,
) {
  return {
    id: command.runId,
    profileId,
    connectionId: command.connectionId,
    endpointId: command.endpointId,
    credentialId: command.credentialId,
    harnessProfileId: command.harnessProfileId,
    model: command.model,
    checks: [...command.checks],
    status: "queued",
    totalChecks: command.checks.length,
    completedChecks: 0,
    currentCheck: command.checks[0] ?? null,
    errorMessage: null,
    createdAt: command.now,
    startedAt: null,
    completedAt: null,
    updatedAt: command.now,
  } satisfies CompatibilityProbeRunRecord;
}
