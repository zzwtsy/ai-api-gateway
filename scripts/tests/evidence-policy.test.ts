import assert from "node:assert/strict";
import test from "node:test";

import { selectEvidence } from "../evidence-policy.ts";

test("data-plane protocol changes select protocol and data evidence", () => {
  const result = selectEvidence([
    "apps/gateway/src/data-plane/protocols/openai-chat/handler.ts",
    "fixtures/protocols/openai-chat/golden-path/expected-snapshot.json",
  ]);
  assert.ok(result.surfaces.includes("data"));
  assert.ok(result.surfaces.includes("protocol"));
  assert.ok(result.commands.includes("pnpm check:data"));
  assert.ok(result.commands.includes("pnpm check:protocol"));
  assert.ok(result.riskFlags.includes("data-plane-hot-path"));
});

test("unknown paths conservatively select the complete gate", () => {
  const result = selectEvidence(["mystery/runtime.bin"]);
  assert.deepEqual(result.unmatched, ["mystery/runtime.bin"]);
  assert.ok(result.commands.includes("pnpm check:all"));
});

test("documentation-only changes do not select runtime gates", () => {
  const result = selectEvidence(["docs/conventions/testing.md"]);
  assert.deepEqual(result.commands, ["pnpm check:docs"]);
});

test("visible Web and UX contract changes select Web and browser evidence", () => {
  const result = selectEvidence([
    "apps/web/src/components/layout/app-shell.tsx",
    "apps/web/src/components/ui/alert.tsx",
    "apps/web/src/features/requests/requests-page.tsx",
    "apps/web/src/index.css",
    "apps/web/src/routes/_workspace/requests.tsx",
    "docs/product/ux/page-contracts.json",
  ]);

  assert.ok(result.surfaces.includes("web"));
  assert.ok(result.surfaces.includes("e2e"));
  assert.ok(result.surfaces.includes("docs"));
  assert.ok(result.commands.includes("pnpm check:web"));
  assert.ok(result.commands.includes("pnpm check:e2e"));
});

test("pure Web state modules keep the unit-level evidence boundary", () => {
  const result = selectEvidence([
    "apps/web/src/features/requests/hooks.ts",
    "apps/web/src/features/requests/request-view-model.ts",
    "apps/web/src/features/requests/request-view-model.test.ts",
  ]);

  assert.deepEqual(result.surfaces, ["web"]);
  assert.deepEqual(result.commands, ["pnpm check:web"]);
});

test("known repository governance and request-recording paths never fall through to unknown", () => {
  const result = selectEvidence([
    ".github/pull_request_template.md",
    "CHANGELOG.md",
    "apps/gateway/package.json",
    "apps/gateway/src/app/adapters/memory-request-store.ts",
    "apps/gateway/src/app/shutdown-controller.test.ts",
    "commitlint.config.ts",
  ]);
  assert.deepEqual(result.unmatched, []);
  assert.ok(result.surfaces.includes("repository"));
  assert.ok(result.surfaces.includes("docs"));
  assert.ok(result.surfaces.includes("data"));
  assert.ok(result.surfaces.includes("artifact"));
});
