# AI API Gateway

AI API Gateway is a **Chinese-first**, personal, self-hosted gateway for multiple AI API providers and coding harnesses.

The project keeps OpenAI Chat Completions, OpenAI Responses, and Anthropic Messages as separate protocol boundaries. It focuses on deterministic same-protocol routing, multiple provider credentials, request/attempt diagnostics, and cost observability.

Chinese documentation in [`README.md`](README.md) and [`docs/`](docs/README.md) is authoritative. Code identifiers, HTTP fields, operation IDs, error codes, and environment variables remain English for ecosystem compatibility. English documentation is an auxiliary projection and is not required to mirror every internal document immediately.

Current status: `0.1.0-alpha.3`. The repository contains Control Plane and streaming Data Plane vertical slices plus an executable anti-corruption loop: explicit change scope, evidence selection, a dependency-aware gate runner, owned runtime invariants, keyless real-composition snapshots, artifact-path checks, postmortems, and simplification audits. Complete routing, encrypted credentials, pricing, and multi-protocol support remain in progress.

```bash
corepack enable
pnpm install
pnpm api:generate
cp .env.example .env
pnpm db:start
pnpm db:migrate
pnpm dev
```

See the [Chinese README](README.md) for architecture, commands, and project rules.
