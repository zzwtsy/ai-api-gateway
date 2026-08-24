import type {
  CompatibilityFactRecord,
  CompatibilityProbeRepository,
  CompatibilityProbeRunRecord,
  CompatibilityProfileRecord,
  ConnectionCompatibilityRecord,
  CreateCompatibilityProbeRunCommand,
} from "../../control-plane/features/connections/contracts.js";

import { createQueuedCompatibilityProbeRun } from "./compatibility-probe-record.js";

export class MemoryCompatibilityProbeRepository implements CompatibilityProbeRepository {
  readonly #profiles = new Map<string, CompatibilityProfileRecord>();
  readonly #runs = new Map<string, CompatibilityProbeRunRecord>();
  readonly #facts = new Map<string, CompatibilityFactRecord>();

  public async createRun(command: CreateCompatibilityProbeRunCommand) {
    const active = [...this.#runs.values()].find(run =>
      run.endpointId === command.endpointId
      && run.credentialId === command.credentialId
      && run.model === command.model
      && (run.status === "queued" || run.status === "running"),
    );
    if (active !== undefined)
      return { run: active, created: false };

    const profile = [...this.#profiles.values()].find(item =>
      item.endpointId === command.endpointId && item.harnessProfileId === command.harnessProfileId,
    ) ?? {
      id: command.profileId,
      connectionId: command.connectionId,
      endpointId: command.endpointId,
      harnessProfileId: command.harnessProfileId,
      status: "unverified" as const,
      lastProbeAt: null,
      summary: null,
    };
    this.#profiles.set(profile.id, profile);
    const run = createQueuedCompatibilityProbeRun(command, profile.id);
    this.#runs.set(run.id, run);
    return { run, created: true };
  }

  public async listByConnection(connectionId: string): Promise<ConnectionCompatibilityRecord> {
    const profiles = [...this.#profiles.values()].filter(profile => profile.connectionId === connectionId);
    const profileIds = new Set(profiles.map(profile => profile.id));
    return {
      profiles,
      facts: [...this.#facts.values()]
        .filter(fact => profileIds.has(fact.profileId))
        .sort((left, right) => right.verifiedAt.getTime() - left.verifiedAt.getTime()),
      runs: [...this.#runs.values()]
        .filter(run => run.connectionId === connectionId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    };
  }

  public async claimRun(runId: string, now: Date): Promise<CompatibilityProbeRunRecord | null> {
    const run = this.#runs.get(runId);
    if (run === undefined || run.status !== "queued")
      return null;
    const updated = { ...run, status: "running" as const, startedAt: now, updatedAt: now };
    this.#runs.set(runId, updated);
    return updated;
  }

  public async recordCheck(command: Parameters<CompatibilityProbeRepository["recordCheck"]>[0]) {
    const run = this.#runs.get(command.runId);
    if (run === undefined || run.status !== "running")
      return null;
    for (const fact of command.facts) {
      const record: CompatibilityFactRecord = {
        profileId: run.profileId,
        featureKey: fact.featureKey,
        supportLevel: fact.supportLevel,
        evidenceSource: "probed",
        evidenceRef: run.id,
        verifiedModelId: run.model,
        verifiedAt: command.now,
        notes: fact.notes,
      };
      this.#facts.set(factKey(record), record);
    }
    const updated = {
      ...run,
      completedChecks: command.completedChecks,
      currentCheck: command.nextCheck,
      updatedAt: command.now,
    };
    this.#runs.set(run.id, updated);
    return updated;
  }

  public async completeRun(command: Parameters<CompatibilityProbeRepository["completeRun"]>[0]) {
    const run = this.#runs.get(command.runId);
    if (run === undefined || run.status !== "running")
      return null;
    const updated = {
      ...run,
      status: "succeeded" as const,
      completedChecks: run.totalChecks,
      currentCheck: null,
      completedAt: command.now,
      updatedAt: command.now,
    };
    this.#runs.set(run.id, updated);
    const profile = this.#profiles.get(run.profileId);
    if (profile !== undefined) {
      this.#profiles.set(profile.id, {
        ...profile,
        status: command.profileStatus,
        lastProbeAt: command.now,
        summary: command.summary,
      });
    }
    return updated;
  }

  public async failRun(runId: string, errorMessage: string, now: Date) {
    const run = this.#runs.get(runId);
    if (run === undefined || (run.status !== "queued" && run.status !== "running"))
      return null;
    const updated = {
      ...run,
      status: "failed" as const,
      currentCheck: null,
      errorMessage,
      completedAt: now,
      updatedAt: now,
    };
    this.#runs.set(runId, updated);
    return updated;
  }
}

function factKey(fact: CompatibilityFactRecord): string {
  return `${fact.profileId}\u0000${fact.featureKey}\u0000${fact.verifiedModelId}`;
}
