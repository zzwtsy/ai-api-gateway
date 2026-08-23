import { validateGateGraph } from "./gates/gate-runner.mjs";

/**
 * Validate that package scripts, Gate definitions and CI entrypoints describe
 * one executable quality system rather than three drifting command lists.
 *
 * @param {GateContractInput} input
 * @returns {string[]}
 */
export function collectGateContractViolations(input) {
  const failures = [];
  for (const mode of input.modes) {
    let gates;
    try {
      gates = input.gatesFor(mode);
      validateGateGraph(gates);
    } catch (error) {
      failures.push(`${mode}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const expectedModeScript = modeScript(mode);
    const command = input.rootScripts[expectedModeScript];
    if (command !== `node scripts/check.mjs ${mode}`) {
      failures.push(`${expectedModeScript} must delegate exactly to Gate mode ${mode}`);
    }

    for (const gate of gates) {
      if (gate.command !== "pnpm") continue;
      if (gate.args[0] === "run") {
        const script = gate.args[1];
        if (script === undefined || input.rootScripts[script] === undefined) {
          failures.push(`${mode}/${gate.id}: references missing root script ${script ?? "<missing>"}`);
        }
        continue;
      }
      if (gate.args[0] === "--filter") {
        const workspace = gate.args[1];
        const operation = gate.args[2];
        if (workspace === undefined || input.workspaceScripts[workspace] === undefined) {
          failures.push(`${mode}/${gate.id}: references unknown workspace ${workspace ?? "<missing>"}`);
          continue;
        }
        if (operation !== "exec" && operation !== undefined && input.workspaceScripts[workspace]?.[operation] === undefined) {
          failures.push(`${mode}/${gate.id}: workspace ${workspace} has no script ${operation}`);
        }
      }
    }
  }

  for (const mode of ["ci-static", "ci-core", "ci-protocol", "ci-artifact"]) {
    const script = modeScript(mode);
    const command = `pnpm ${script} --report .artifacts/gates/${mode}.json`;
    if (!new RegExp(`^\\s*-\\s+run:\\s+${escapeRegExp(command)}\\s*$`, "mu").test(input.ciSource)) {
      failures.push(`CI does not execute ${script} with a machine-readable report`);
    }
  }

  const artifactGates = input.gatesFor("ci-artifact");
  const browser = artifactGates.find((gate) => gate.id === "browser-e2e");
  if (browser?.env?.AIGW_E2E_USE_BUILD !== "1") {
    failures.push("artifact browser gate must execute compiled Gateway/Web assets");
  }
  if (!artifactGates.some((gate) => gate.id === "docker-smoke")) {
    failures.push("artifact lane is missing Docker Compose smoke");
  }
  if (!/^const useBuild = process\.env\.AIGW_E2E_USE_BUILD === "1";$/mu.test(input.e2eConfigSource)) {
    failures.push("Playwright config does not own compiled-artifact mode");
  }
  if (!/^RUN pnpm install --frozen-lockfile$/mu.test(input.dockerfileSource)) {
    failures.push("Dockerfile must install from the frozen lockfile");
  }

  return failures;
}

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** @param {string} mode */
export function modeScript(mode) {
  if (mode === "hygiene") return "hygiene";
  if (mode.startsWith("ci-")) return `check:ci:${mode.slice(3)}`;
  return `check:${mode}`;
}

/**
 * @typedef {object} GateContractInput
 * @property {readonly string[]} modes
 * @property {(mode: string) => readonly import("./gates/gate-runner.mjs").Gate[]} gatesFor
 * @property {Readonly<Record<string, string>>} rootScripts
 * @property {Readonly<Record<string, Readonly<Record<string, string>>>>} workspaceScripts
 * @property {string} ciSource
 * @property {string} e2eConfigSource
 * @property {string} dockerfileSource
 */
