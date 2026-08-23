import type { Gate, RunOptions } from "../gates/gate-runner.ts";
import assert from "node:assert/strict";

import test from "node:test";
import { allowedGateModes, gatesFor } from "../gates/definitions.ts";
import { aggregatePassed, runGateGraph, validateGateGraph } from "../gates/gate-runner.ts";

function gate(id: string, needs: string[] = [], after: string[] = []): Gate {
  return {
    id,
    label: id,
    command: "node",
    args: [],
    needs,
    after,
  };
}

test("all published gate modes form valid dependency graphs", () => {
  for (const mode of allowedGateModes) {
    assert.doesNotThrow(() => validateGateGraph(gatesFor(mode)), mode);
  }
});

test("required dependency failure skips dependent gates and fails the aggregate", async () => {
  const executed: string[] = [];
  const results = await runGateGraph([
    gate("first"),
    gate("dependent", ["first"]),
    gate("independent"),
  ], {
    maxConcurrency: 2,
    execute: async (current) => {
      executed.push(current.id);
      return { status: current.id === "first" ? "failed" : "passed", exitCode: current.id === "first" ? 1 : 0 };
    },
  });

  assert.deepEqual(executed.sort(), ["first", "independent"]);
  assert.equal(results.find(result => result.id === "dependent")?.status, "skipped");
  assert.equal(aggregatePassed(results), false);
});

test("after waits for settlement but does not inherit failure", async () => {
  const order: string[] = [];
  const results = await runGateGraph([
    gate("cleanup", [], ["failed"]),
    gate("failed"),
  ], {
    maxConcurrency: 2,
    execute: async (current) => {
      order.push(current.id);
      return { status: current.id === "failed" ? "failed" : "passed", exitCode: current.id === "failed" ? 1 : 0 };
    },
  });
  assert.deepEqual(order, ["failed", "cleanup"]);
  assert.equal(results.find(result => result.id === "cleanup")?.status, "passed");
});

test("invalid graph is rejected before execution", () => {
  assert.throws(() => validateGateGraph([gate("a", ["missing"])]), /missing dependency/u);
  assert.throws(() => validateGateGraph([gate("a", ["b"]), gate("b", ["a"])]), /dependency cycle/u);
  assert.throws(() => validateGateGraph([gate("same"), gate("same")]), /duplicate gate id/u);
  assert.throws(() => validateGateGraph([gate("a", ["b", "b"]), gate("b")]), /duplicate dependencies/u);
  assert.throws(() => validateGateGraph([gate("a", ["b"], ["b"]), gate("b")]), /both needs and after/u);
});

test("invalid executor status is converted into a failed Gate result", async () => {
  const invalidExecute = (async () => ({ status: "unknown", exitCode: 0 })) as unknown as NonNullable<RunOptions["execute"]>;
  const results = await runGateGraph([gate("invalid")], {
    execute: invalidExecute,
  });
  assert.equal(results[0]?.status, "failed");
  assert.match(results[0]?.error ?? "", /invalid status/u);
});
