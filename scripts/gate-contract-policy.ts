import type { Gate } from "./gates/gate-runner.ts";
import { validateGateGraph } from "./gates/gate-runner.ts";

export interface GateContractInput {
  modes: readonly string[];
  gatesFor: (mode: string) => readonly Gate[];
  rootScripts: Readonly<Record<string, string>>;
  workspaceScripts: Readonly<Record<string, Readonly<Record<string, string>>>>;
  ciSource: string;
  e2eConfigSource: string;
  dockerfileSource: string;
}

/**
 * 验证 package scripts、Gate 定义和 CI 入口共同描述同一套可执行质量系统。
 *
 * @returns 违规信息列表。
 */
export function collectGateContractViolations(input: GateContractInput): string[] {
  return [
    ...collectModeViolations(input),
    ...collectCiEntrypointViolations(input),
    ...collectArtifactLaneViolations(input),
  ];
}

function collectModeViolations(input: GateContractInput): string[] {
  const failures: string[] = [];
  for (const mode of input.modes) {
    let gates: readonly Gate[];
    try {
      gates = input.gatesFor(mode);
      validateGateGraph(gates);
    } catch (error) {
      failures.push(`${mode}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const expectedModeScript = modeScript(mode);
    const command = input.rootScripts[expectedModeScript];
    if (command !== `node scripts/check.ts ${mode}`) {
      failures.push(`${expectedModeScript} must delegate exactly to Gate mode ${mode}`);
    }

    for (const gate of gates) {
      failures.push(...collectGateReferenceViolations(mode, gate, input));
    }
  }
  return failures;
}

function collectGateReferenceViolations(mode: string, gate: Gate, input: GateContractInput): string[] {
  if (gate.command !== "pnpm")
    return [];
  if (gate.args[0] === "run") {
    const script = gate.args[1];
    return script === undefined || input.rootScripts[script] === undefined
      ? [`${mode}/${gate.id}: references missing root script ${script ?? "<missing>"}`]
      : [];
  }
  if (gate.args[0] !== "--filter")
    return [];

  const workspace = gate.args[1];
  const operation = gate.args[2];
  if (workspace === undefined || input.workspaceScripts[workspace] === undefined) {
    return [`${mode}/${gate.id}: references unknown workspace ${workspace ?? "<missing>"}`];
  }
  if (operation !== "exec" && operation !== undefined && input.workspaceScripts[workspace]?.[operation] === undefined) {
    return [`${mode}/${gate.id}: workspace ${workspace} has no script ${operation}`];
  }
  return [];
}

function collectCiEntrypointViolations(input: GateContractInput): string[] {
  const failures: string[] = [];
  for (const mode of ["ci-static", "ci-core", "ci-protocol", "ci-artifact"]) {
    const script = modeScript(mode);
    const command = `pnpm ${script} --report .artifacts/gates/${mode}.json`;
    if (!new RegExp(`^\\s*-\\s+run:\\s+${escapeRegExp(command)}\\s*$`, "mu").test(input.ciSource)) {
      failures.push(`CI does not execute ${script} with a machine-readable report`);
    }
  }
  return failures;
}

function collectArtifactLaneViolations(input: GateContractInput): string[] {
  const failures: string[] = [];
  const artifactGates = input.gatesFor("ci-artifact");
  const browser = artifactGates.find(gate => gate.id === "browser-e2e");
  if (browser?.env?.AIGW_E2E_USE_BUILD !== "1") {
    failures.push("artifact browser gate must execute compiled Gateway/Web assets");
  }
  if (!artifactGates.some(gate => gate.id === "docker-smoke")) {
    failures.push("artifact lane is missing Docker Compose smoke");
  }
  if (!/^const useBuild = process\.env\.AIGW_E2E_USE_BUILD === "1";$/mu.test(input.e2eConfigSource)) {
    failures.push("Playwright config does not own compiled-artifact mode");
  }
  if (!/^RUN pnpm install --frozen-lockfile$/mu.test(input.dockerfileSource)) {
    failures.push("Dockerfile must install from the frozen lockfile");
  }
  const lifecycleCopy = input.dockerfileSource.indexOf("COPY scripts/install-lefthook.ts scripts/install-lefthook.ts");
  const install = input.dockerfileSource.indexOf("RUN pnpm install --frozen-lockfile");
  if (lifecycleCopy === -1 || install === -1 || lifecycleCopy > install) {
    failures.push("Dockerfile must copy the root postinstall entry before installing dependencies");
  }

  return failures;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function modeScript(mode: string): string {
  if (mode === "hygiene")
    return "hygiene";
  if (mode.startsWith("ci-"))
    return `check:ci:${mode.slice(3)}`;
  return `check:${mode}`;
}
