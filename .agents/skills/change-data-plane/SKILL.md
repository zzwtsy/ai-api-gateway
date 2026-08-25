---
name: change-data-plane
description: Change an ai-api-gateway data-plane request lifecycle across protocol ingress, routing, credential selection, transport, streaming, observation, or Request/Attempt recording. Use for one end-to-end proxy-path change; do not use for control-plane CRUD or UI-only work.
---

# Change the data plane

Read first:

1. `apps/gateway/src/data-plane/AGENTS.md`
2. `docs/architecture/data-plane-protocol-proxy.md`
3. `docs/conventions/data-plane-streaming.md`
4. `docs/conventions/runtime-invariants.md`
5. `docs/conventions/defensive-patterns.md`
6. Fixtures and tests for the affected protocol

Non-negotiable rules:

- Preserve the ingress protocol and unknown Provider fields.
- Do not reconstruct transparent requests through a Provider SDK.
- Do not build observation with `Response.clone()`, `ReadableStream.tee()`, or `streamSSE()`.
- The primary stream may wait on downstream backpressure; observation must remain bounded and non-blocking.
- Propagate client cancellation to the upstream `AbortSignal`.
- Never change RouteTarget after the first downstream byte.
- Record every decision that affects the upstream request, but never record a full Secret.
- Keep `Request` and `Attempt` as separate records.
- Register every new high-risk relationship with its Source, Consumer, Test, and Manifest; reject decorative invariants without production enforcement.

Scope the change:

```bash
pnpm change-scope --base <confirmed-base>
pnpm evidence:select --base <confirmed-base>
```

Evidence:

- Routing, credentials, or transport: `pnpm check:data`.
- Body, headers, streaming, cancellation, or recording: `pnpm check:protocol`.
- Persistence: also run `pnpm check:db`.
- Runtime entrypoints or release artifacts: also run `pnpm check:artifact`.
