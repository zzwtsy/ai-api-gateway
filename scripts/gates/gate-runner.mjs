import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const terminalStatuses = new Set(["passed", "failed", "skipped"]);

/**
 * Validate a gate dependency graph before any command is executed.
 *
 * @param {readonly Gate[]} gates
 * @returns {void}
 */
export function validateGateGraph(gates) {
  const byId = new Map();
  for (const gate of gates) {
    validateGate(gate);
    if (byId.has(gate.id)) {
      throw new Error(`duplicate gate id: ${gate.id}`);
    }
    byId.set(gate.id, gate);
  }

  for (const gate of gates) {
    for (const dependency of [...gate.needs, ...gate.after]) {
      if (!byId.has(dependency)) {
        throw new Error(`gate ${gate.id} references missing dependency ${dependency}`);
      }
      if (dependency === gate.id) {
        throw new Error(`gate ${gate.id} cannot depend on itself`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (id, stack) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id].join(" -> ");
      throw new Error(`gate dependency cycle: ${cycle}`);
    }
    visiting.add(id);
    stack.push(id);
    const gate = byId.get(id);
    for (const dependency of [...gate.needs, ...gate.after]) {
      visit(dependency, stack);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const gate of gates) visit(gate.id, []);
}

/**
 * Run validated gates with bounded concurrency.
 *
 * `needs` dependencies must pass. `after` dependencies only need to settle.
 * A gate skipped because a required dependency failed still makes the aggregate fail.
 *
 * @param {readonly Gate[]} gates
 * @param {RunOptions} options
 * @returns {Promise<GateResult[]>}
 */
export async function runGateGraph(gates, options = {}) {
  validateGateGraph(gates);
  const maxConcurrency = normalizeConcurrency(options.maxConcurrency ?? 3);
  const execute = options.execute ?? executeGateProcess;
  const pending = new Map(gates.map((gate) => [gate.id, gate]));
  const results = new Map();
  const running = new Map();

  while (pending.size > 0 || running.size > 0) {
    let changed = false;

    for (const [id, gate] of pending) {
      if (running.size >= maxConcurrency) break;

      const requiredFailure = gate.needs.find((dependency) => {
        const result = results.get(dependency);
        return result !== undefined && result.status !== "passed";
      });
      if (requiredFailure !== undefined) {
        const result = {
          id,
          label: gate.label,
          command: displayCommand(gate),
          status: "skipped",
          durationMs: 0,
          exitCode: null,
          signal: null,
          skippedBecause: requiredFailure,
        };
        pending.delete(id);
        results.set(id, result);
        options.onFinish?.(result);
        changed = true;
        continue;
      }

      const needsReady = gate.needs.every((dependency) => results.get(dependency)?.status === "passed");
      const afterReady = gate.after.every((dependency) => terminalStatuses.has(results.get(dependency)?.status));
      if (!needsReady || !afterReady) continue;

      pending.delete(id);
      options.onStart?.(gate);
      const startedAt = performance.now();
      const promise = Promise.resolve(execute(gate))
        .then((execution) => {
          if (execution.status !== "passed" && execution.status !== "failed") {
            throw new Error(`gate ${id} returned invalid status ${JSON.stringify(execution.status)}`);
          }
          return {
            id,
            label: gate.label,
            command: displayCommand(gate),
            status: execution.status,
            durationMs: Math.round(performance.now() - startedAt),
            exitCode: execution.exitCode ?? null,
            signal: execution.signal ?? null,
          };
        })
        .catch((error) => ({
          id,
          label: gate.label,
          command: displayCommand(gate),
          status: "failed",
          durationMs: Math.round(performance.now() - startedAt),
          exitCode: null,
          signal: null,
          error: error instanceof Error ? error.message : String(error),
        }))
        .then((result) => {
          running.delete(id);
          results.set(id, result);
          options.onFinish?.(result);
          return result;
        });
      running.set(id, promise);
      changed = true;
    }

    if (running.size > 0) {
      await Promise.race(running.values());
      continue;
    }
    if (!changed && pending.size > 0) {
      throw new Error(`gate graph cannot make progress: ${[...pending.keys()].join(", ")}`);
    }
  }

  return gates.map((gate) => results.get(gate.id));
}

/** @param {Gate} gate */
export function executeGateProcess(gate) {
  return new Promise((resolve) => {
    const child = spawn(gate.command, gate.args, {
      cwd: gate.cwd,
      env: { ...process.env, ...gate.env },
      stdio: "inherit",
    });
    let settled = false;
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      process.stderr.write(`${gate.id}: ${error.message}\n`);
      resolve({ status: "failed", exitCode: null, signal: null });
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        signal,
      });
    });
  });
}

/** @param {number} value */
export function normalizeConcurrency(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`gate concurrency must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** @param {readonly GateResult[]} results */
export function aggregatePassed(results) {
  return results.every((result) => result.status === "passed");
}

/**
 * Write a stable machine-readable report for humans and coding agents.
 *
 * @param {string} outputPath
 * @param {{ mode: string, maxConcurrency: number, results: readonly GateResult[] }} report
 */
export async function writeGateReport(outputPath, report) {
  const absolute = path.resolve(outputPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify({
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    ...report,
    passed: aggregatePassed(report.results),
  }, null, 2)}\n`, "utf8");
}

/** @param {Gate} gate */
export function displayCommand(gate) {
  return [gate.command, ...gate.args].map(shellQuote).join(" ");
}

/** @param {string} value */
function shellQuote(value) {
  return /^[A-Za-z0-9_./:@=-]+$/u.test(value) ? value : JSON.stringify(value);
}

/** @param {Gate} gate */
function validateGate(gate) {
  if (typeof gate.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/u.test(gate.id)) {
    throw new Error(`invalid gate id: ${JSON.stringify(gate.id)}`);
  }
  if (typeof gate.label !== "string" || gate.label.trim() === "") {
    throw new Error(`gate ${gate.id} requires a label`);
  }
  if (typeof gate.command !== "string" || gate.command.trim() === "") {
    throw new Error(`gate ${gate.id} requires a command`);
  }
  if (!Array.isArray(gate.args) || !gate.args.every((value) => typeof value === "string")) {
    throw new Error(`gate ${gate.id} args must be a string array`);
  }
  if (!Array.isArray(gate.needs) || !Array.isArray(gate.after)) {
    throw new Error(`gate ${gate.id} needs/after must be arrays`);
  }
  for (const [kind, dependencies] of [["needs", gate.needs], ["after", gate.after]]) {
    if (!dependencies.every((dependency) => typeof dependency === "string" && /^[a-z0-9][a-z0-9-]*$/u.test(dependency))) {
      throw new Error(`gate ${gate.id} ${kind} must contain valid gate ids`);
    }
    if (new Set(dependencies).size !== dependencies.length) {
      throw new Error(`gate ${gate.id} ${kind} contains duplicate dependencies`);
    }
  }
  const overlap = gate.needs.find((dependency) => gate.after.includes(dependency));
  if (overlap !== undefined) {
    throw new Error(`gate ${gate.id} cannot list ${overlap} in both needs and after`);
  }
}

/**
 * @typedef {object} Gate
 * @property {string} id
 * @property {string} label
 * @property {string} command
 * @property {string[]} args
 * @property {string[]} needs
 * @property {string[]} after
 * @property {string | undefined} [cwd]
 * @property {Record<string, string | undefined> | undefined} [env]
 */

/**
 * @typedef {object} GateExecution
 * @property {"passed" | "failed"} status
 * @property {number | null} [exitCode]
 * @property {NodeJS.Signals | null} [signal]
 */

/**
 * @typedef {object} GateResult
 * @property {string} id
 * @property {string} label
 * @property {string} command
 * @property {"passed" | "failed" | "skipped"} status
 * @property {number} durationMs
 * @property {number | null} exitCode
 * @property {NodeJS.Signals | null} signal
 * @property {string | undefined} [skippedBecause]
 * @property {string | undefined} [error]
 */

/**
 * @typedef {object} RunOptions
 * @property {number | undefined} [maxConcurrency]
 * @property {((gate: Gate) => Promise<GateExecution> | GateExecution) | undefined} [execute]
 * @property {((gate: Gate) => void) | undefined} [onStart]
 * @property {((result: GateResult) => void) | undefined} [onFinish]
 */
