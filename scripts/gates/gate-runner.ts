import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export interface Gate {
  id: string;
  label: string;
  command: string;
  args: string[];
  needs: string[];
  after: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
}

interface GateExecution {
  status: "passed" | "failed";
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
}

export interface GateResult {
  id: string;
  label: string;
  command: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  skippedBecause?: string;
  error?: string;
}

export interface RunOptions {
  maxConcurrency?: number;
  execute?: (gate: Gate) => Promise<GateExecution> | GateExecution;
  onStart?: (gate: Gate) => void;
  onFinish?: (result: GateResult) => void;
}

const terminalStatuses = new Set<GateResult["status"]>(["passed", "failed", "skipped"]);

/**
 * 在执行任何命令前验证 Gate 依赖图。
 */
export function validateGateGraph(gates: readonly Gate[]): void {
  const byId = new Map<string, Gate>();
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

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, stack: string[]): void => {
    if (visited.has(id))
      return;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id].join(" -> ");
      throw new Error(`gate dependency cycle: ${cycle}`);
    }
    visiting.add(id);
    stack.push(id);
    const gate = byId.get(id);
    if (gate === undefined)
      throw new Error(`missing gate during graph traversal: ${id}`);
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
 * 以受限并发运行已验证的 Gate。
 *
 * `needs` 依赖必须通过，`after` 依赖只需完成。因必需依赖失败而跳过的 Gate
 * 仍会使整体结果失败。
 *
 * @returns 按声明顺序排列的 Gate 结果。
 */
export async function runGateGraph(gates: readonly Gate[], options: RunOptions = {}): Promise<GateResult[]> {
  validateGateGraph(gates);
  const maxConcurrency = normalizeConcurrency(options.maxConcurrency ?? 3);
  const execute = options.execute ?? executeGateProcess;
  const pending = new Map<string, Gate>(gates.map(gate => [gate.id, gate]));
  const results = new Map<string, GateResult>();
  const running = new Map<string, Promise<GateResult>>();

  while (pending.size > 0 || running.size > 0) {
    let changed = false;

    for (const [id, gate] of pending) {
      if (running.size >= maxConcurrency)
        break;

      const requiredFailure = gate.needs.find((dependency) => {
        const result = results.get(dependency);
        return result !== undefined && result.status !== "passed";
      });
      if (requiredFailure !== undefined) {
        const result: GateResult = {
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

      const needsReady = gate.needs.every(dependency => results.get(dependency)?.status === "passed");
      const afterReady = gate.after.every((dependency) => {
        const result = results.get(dependency);
        return result !== undefined && terminalStatuses.has(result.status);
      });
      if (!needsReady || !afterReady)
        continue;

      pending.delete(id);
      options.onStart?.(gate);
      const startedAt = performance.now();
      const promise = Promise.resolve(execute(gate))
        .then((execution): GateResult => {
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
        .catch((error): GateResult => ({
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

  return gates.map((gate) => {
    const result = results.get(gate.id);
    if (result === undefined)
      throw new Error(`missing terminal result for gate ${gate.id}`);
    return result;
  });
}

function executeGateProcess(gate: Gate): Promise<GateExecution> {
  return new Promise<GateExecution>((resolve) => {
    const child = spawn(gate.command, gate.args, {
      cwd: gate.cwd,
      env: { ...process.env, ...gate.env },
      stdio: "inherit",
    });
    let settled = false;
    child.once("error", (error) => {
      if (settled)
        return;
      settled = true;
      process.stderr.write(`${gate.id}: ${error.message}\n`);
      resolve({ status: "failed", exitCode: null, signal: null });
    });
    child.once("exit", (code, signal) => {
      if (settled)
        return;
      settled = true;
      resolve({
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        signal,
      });
    });
  });
}

export function normalizeConcurrency(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`gate concurrency must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

export function aggregatePassed(results: readonly GateResult[]): boolean {
  return results.every(result => result.status === "passed");
}

/**
 * 写入供维护者与 Coding Agent 使用的稳定机器可读报告。
 */
export async function writeGateReport(
  outputPath: string,
  report: { mode: string; maxConcurrency: number; results: readonly GateResult[] },
): Promise<void> {
  const absolute = path.resolve(outputPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify({
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    ...report,
    passed: aggregatePassed(report.results),
  }, null, 2)}\n`, "utf8");
}

export function displayCommand(gate: Gate): string {
  return [gate.command, ...gate.args].map(shellQuote).join(" ");
}

function shellQuote(value: string): string {
  return /^[\w./:@=-]+$/u.test(value) ? value : JSON.stringify(value);
}

function validateGate(gate: Gate): void {
  if (typeof gate.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/u.test(gate.id)) {
    throw new Error(`invalid gate id: ${JSON.stringify(gate.id)}`);
  }
  if (typeof gate.label !== "string" || gate.label.trim() === "") {
    throw new Error(`gate ${gate.id} requires a label`);
  }
  if (typeof gate.command !== "string" || gate.command.trim() === "") {
    throw new Error(`gate ${gate.id} requires a command`);
  }
  if (!Array.isArray(gate.args) || !gate.args.every(value => typeof value === "string")) {
    throw new Error(`gate ${gate.id} args must be a string array`);
  }
  if (!Array.isArray(gate.needs) || !Array.isArray(gate.after)) {
    throw new TypeError(`gate ${gate.id} needs/after must be arrays`);
  }
  for (const [kind, dependencies] of [["needs", gate.needs], ["after", gate.after]] as const) {
    if (!dependencies.every(dependency => typeof dependency === "string" && /^[a-z0-9][a-z0-9-]*$/u.test(dependency))) {
      throw new Error(`gate ${gate.id} ${kind} must contain valid gate ids`);
    }
    if (new Set(dependencies).size !== dependencies.length) {
      throw new Error(`gate ${gate.id} ${kind} contains duplicate dependencies`);
    }
  }
  const overlap = gate.needs.find(dependency => gate.after.includes(dependency));
  if (overlap !== undefined) {
    throw new Error(`gate ${gate.id} cannot list ${overlap} in both needs and after`);
  }
}
