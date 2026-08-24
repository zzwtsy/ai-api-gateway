import type {
  CompatibilityFactObservation,
  CompatibilityProbeCheck,
  CompatibilityProbeCoordinator,
  CompatibilityProber,
  CompatibilityProbeRepository,
  CompatibilityProfileStatus,
  ConnectionProtocol,
  ConnectionRepository,
  CredentialProbeClassification,
} from "../../control-plane/features/connections/contracts.js";
import type { SecretCipher } from "../../core/crypto/secret-cipher.js";
import type { AppLogger } from "../../core/logging/logger.js";
import type { Clock } from "../../core/time/clock.js";

export class CompatibilityProbeRunner implements CompatibilityProbeCoordinator {
  readonly #jobs = new Map<string, { readonly controller: AbortController; readonly settlement: Promise<void> }>();
  #closed = false;

  public constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly compatibilityRepository: CompatibilityProbeRepository,
    private readonly prober: CompatibilityProber,
    private readonly secretCipher: SecretCipher,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  public enqueue(runId: string): void {
    if (this.#closed || this.#jobs.has(runId))
      return;
    const controller = new AbortController();
    const settlement = Promise.resolve()
      .then(async () => this.#execute(runId, controller.signal))
      .finally(() => this.#jobs.delete(runId));
    this.#jobs.set(runId, { controller, settlement });
  }

  public async close(): Promise<void> {
    this.#closed = true;
    const jobs = [...this.#jobs.values()];
    for (const job of jobs)
      job.controller.abort();
    await Promise.all(jobs.map(job => job.settlement));
  }

  async #execute(runId: string, signal: AbortSignal): Promise<void> {
    try {
      const run = await this.compatibilityRepository.claimRun(runId, this.clock.now());
      if (run === null)
        return;
      const target = await this.connectionRepository.getCredentialProbeTarget(run.credentialId, run.endpointId);
      if (target === null || target.connectionId !== run.connectionId || target.credentialStatus === "disabled") {
        await this.compatibilityRepository.failRun(run.id, "测试目标已不存在或不可用。", this.clock.now());
        return;
      }
      const secret = this.secretCipher.decrypt(target.encryptedSecret, target.secretKeyId, target.credentialId);
      const observations: CompatibilityFactObservation[] = [];
      for (let index = 0; index < run.checks.length; index += 1) {
        const check = run.checks[index];
        if (check === undefined)
          continue;
        const result = await this.prober.probeCheck({
          check,
          endpoint: target.endpoint,
          model: run.model,
          secret,
          signal,
        });
        observations.push(...result.facts);
        if (result.credentialResult !== undefined) {
          await this.connectionRepository.recordCredentialProbe({
            credentialId: run.credentialId,
            status: credentialStatus(result.credentialResult.classification),
            succeeded: result.credentialResult.classification === "healthy",
            now: this.clock.now(),
          });
        }
        const nextCheck = run.checks[index + 1] ?? null;
        await this.compatibilityRepository.recordCheck({
          runId: run.id,
          facts: result.facts,
          completedChecks: index + 1,
          nextCheck,
          now: this.clock.now(),
        });
        if (result.stopRemainingChecks === true) {
          await this.#recordSkipped(run.id, run.checks.slice(index + 1), target.endpoint.protocol, index + 1, observations);
          break;
        }
      }
      const profileStatus = profileStatusFor(observations);
      await this.compatibilityRepository.completeRun({
        runId: run.id,
        profileStatus,
        summary: profileSummary(observations),
        now: this.clock.now(),
      });
    } catch (error) {
      const interrupted = signal.aborted;
      await this.compatibilityRepository.failRun(
        runId,
        interrupted ? "Gateway 关闭，兼容性测试已中断。" : "兼容性测试执行失败，请重试。",
        this.clock.now(),
      );
      this.logger.warn({
        probeRunId: runId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }, interrupted ? "compatibility probe interrupted" : "compatibility probe failed");
    }
  }

  async #recordSkipped(
    runId: string,
    checks: readonly CompatibilityProbeCheck[],
    protocol: ConnectionProtocol,
    completedBefore: number,
    observations: CompatibilityFactObservation[],
  ): Promise<void> {
    for (let index = 0; index < checks.length; index += 1) {
      const check = checks[index];
      if (check === undefined)
        continue;
      const fact = skippedFact(check, protocol);
      observations.push(fact);
      await this.compatibilityRepository.recordCheck({
        runId,
        facts: [fact],
        completedChecks: completedBefore + index + 1,
        nextCheck: checks[index + 1] ?? null,
        now: this.clock.now(),
      });
    }
  }
}

function credentialStatus(classification: CredentialProbeClassification) {
  if (classification === "healthy" || classification === "auth_failed" || classification === "unavailable")
    return classification;
  return null;
}

function skippedFact(check: CompatibilityProbeCheck, protocol: ConnectionProtocol): CompatibilityFactObservation {
  return {
    featureKey: check === "harness"
      ? harnessFeatureKey(protocol)
      : {
          basic: "request.basic",
          stream: "stream.sse",
          usage: "usage.reported",
          unknown_field: "fields.unknown",
          tools: "tools.function_call",
          reasoning: "reasoning.output",
          structured_output: "output.structured",
          error_shape: "error.envelope",
        }[check],
    supportLevel: "unknown",
    notes: "因 Credential 鉴权失败，本项未发送上游请求。",
  };
}

function harnessFeatureKey(protocol: ConnectionProtocol): string {
  return {
    "openai-chat": "harness.openai_chat.stream_usage",
    "openai-responses": "harness.codex.apply_patch",
    "anthropic-messages": "harness.claude_code.tool_use",
  }[protocol];
}

function profileStatusFor(facts: readonly CompatibilityFactObservation[]): CompatibilityProfileStatus {
  const authentication = facts.find(fact => fact.featureKey === "auth.valid");
  const basic = facts.find(fact => fact.featureKey === "request.basic");
  if (authentication?.supportLevel === "unsupported" || basic?.supportLevel === "unsupported")
    return "blocked";
  if (authentication === undefined || basic === undefined)
    return "partial";
  return facts.every(fact => fact.supportLevel === "supported" || fact.supportLevel === "ignored")
    ? "verified"
    : "partial";
}

function profileSummary(facts: readonly CompatibilityFactObservation[]): string {
  const positive = facts.filter(fact => fact.supportLevel === "supported" || fact.supportLevel === "ignored").length;
  return `已记录 ${facts.length} 项实测事实，其中 ${positive} 项通过。`;
}
