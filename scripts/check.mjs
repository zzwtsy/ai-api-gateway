import process from "node:process";
import { parseArgs } from "node:util";

import { allowedGateModes, gatesFor } from "./gates/definitions.mjs";
import {
  aggregatePassed,
  displayCommand,
  normalizeConcurrency,
  runGateGraph,
  writeGateReport,
} from "./gates/gate-runner.mjs";

const { mode, reportPath } = parseCli(process.argv.slice(2));
const gates = gatesFor(mode);
const maxConcurrency = normalizeConcurrency(parseConcurrency(process.env.AIGW_GATE_CONCURRENCY));
const results = await runGateGraph(gates, {
  maxConcurrency,
  onStart: (gate) => {
    process.stdout.write(`\n=== ${gate.id}: ${gate.label} ===\n${displayCommand(gate)}\n`);
  },
  onFinish: (result) => {
    const glyph = result.status === "passed" ? "✓" : result.status === "skipped" ? "-" : "✗";
    const detail = result.skippedBecause === undefined ? "" : `（依赖 ${result.skippedBecause} 未通过）`;
    process.stdout.write(`${glyph} ${result.id} ${result.durationMs}ms ${detail}\n`);
  },
});

process.stdout.write("\nGate 汇总\n");
for (const result of results) {
  process.stdout.write(`${result.status.padEnd(7)} ${String(result.durationMs).padStart(6)}ms  ${result.id}\n`);
}

if (reportPath !== undefined) {
  await writeGateReport(reportPath, { mode, maxConcurrency, results });
  process.stdout.write(`Gate 报告：${reportPath}\n`);
}
process.exitCode = aggregatePassed(results) ? 0 : 1;

function parseCli(args) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      report: { type: "string" },
    },
  });
  const mode = positionals[0];
  if (positionals.length !== 1 || !allowedGateModes.includes(mode)) {
    throw new Error(`用法：node scripts/check.mjs <${allowedGateModes.join("|")}> [--report <path>]`);
  }
  return { mode, reportPath: values.report };
}

function parseConcurrency(raw) {
  if (raw === undefined || raw === "") return 3;
  const value = Number.parseInt(raw, 10);
  if (String(value) !== raw.trim()) {
    throw new Error(`AIGW_GATE_CONCURRENCY 必须是正整数，收到 ${JSON.stringify(raw)}`);
  }
  return value;
}
