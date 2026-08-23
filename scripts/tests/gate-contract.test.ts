import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { collectGateContractViolations } from "../gate-contract-policy.ts";
import { allowedGateModes, gatesFor } from "../gates/definitions.ts";

const root = path.resolve(import.meta.dirname, "../..");

async function actualInput() {
  const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const workspaceScripts: Record<string, Record<string, string>> = {};
  for (const relative of ["apps/gateway/package.json", "apps/web/package.json", "apps/e2e/package.json"]) {
    const manifest = JSON.parse(await readFile(path.join(root, relative), "utf8"));
    workspaceScripts[manifest.name] = manifest.scripts ?? {};
  }
  return {
    modes: allowedGateModes,
    gatesFor,
    rootScripts: rootManifest.scripts ?? {},
    workspaceScripts,
    ciSource: await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8"),
    e2eConfigSource: await readFile(path.join(root, "apps/e2e/playwright.config.ts"), "utf8"),
    dockerfileSource: await readFile(path.join(root, "Dockerfile"), "utf8"),
  };
}

test("current package scripts, Gate DAG and CI lanes form one contract", async () => {
  assert.deepEqual(collectGateContractViolations(await actualInput()), []);
});

test("Gate contract rejects a missing referenced root script", async () => {
  const input = await actualInput();
  const rootScripts = { ...input.rootScripts };
  delete rootScripts["verify:runtime-invariants"];
  const errors = collectGateContractViolations({ ...input, rootScripts });
  assert.ok(errors.some(error => error.includes("missing root script verify:runtime-invariants")));
});

test("CI Static and Docs modes both own project version verification", async () => {
  const input = await actualInput();
  for (const mode of ["ci-static", "docs"]) {
    assert.ok(input.gatesFor(mode).some(gate => gate.id === "project-version"));
  }
});

test("Gate contract rejects source-mode browser checks in the artifact lane", async () => {
  const input = await actualInput();
  const wrapped = (mode: string) => input.gatesFor(mode).map(gate => gate.id === "browser-e2e"
    ? { ...gate, env: {} }
    : gate);
  const errors = collectGateContractViolations({ ...input, gatesFor: wrapped });
  assert.ok(errors.some(error => error.includes("compiled Gateway/Web assets")));
});

test("Gate contract requires the Docker dependency stage to include the root postinstall entry", async () => {
  const input = await actualInput();
  const errors = collectGateContractViolations({
    ...input,
    dockerfileSource: input.dockerfileSource.replace(
      "COPY scripts/install-lefthook.ts scripts/install-lefthook.ts\n",
      "",
    ),
  });
  assert.ok(errors.some(error => error.includes("root postinstall entry")));
});

test("comments cannot impersonate CI, Playwright or Docker enforcement", async () => {
  const input = await actualInput();
  const errors = collectGateContractViolations({
    ...input,
    ciSource: input.ciSource.replace(/^\s*- run: pnpm check:ci:static --report .+$/mu, "      # pnpm check:ci:static --report .artifacts/gates/ci-static.json"),
    e2eConfigSource: input.e2eConfigSource.replace(
      "const useBuild = process.env.AIGW_E2E_USE_BUILD === \"1\";",
      "// process.env.AIGW_E2E_USE_BUILD === \"1\"",
    ),
    dockerfileSource: input.dockerfileSource.replace(
      "RUN pnpm install --frozen-lockfile",
      "# pnpm install --frozen-lockfile",
    ),
  });
  assert.ok(errors.some(error => error.includes("check:ci:static")));
  assert.ok(errors.some(error => error.includes("Playwright")));
  assert.ok(errors.some(error => error.includes("frozen lockfile")));
});
