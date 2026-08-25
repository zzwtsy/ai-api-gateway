---
name: simplification-audit
description: Perform a read-only entropy audit at phase closeout, before release, when duplicate state or abstractions appear, or before adding a package, registry, state machine, public configuration, or infrastructure. Prove candidates through real consumers, lifecycle ownership, and net deletion. Do not implement deletion or refactoring.
---

# Simplification audit

Simplification reduces the implementation, test, documentation, compatibility, and runtime-state surface the project owns. It does not move the same complexity behind another wrapper. `knip`, `jscpd`, module graphs, and line counts discover candidates; they do not prove deletion safety.

## Sources of truth

- [Simplification and entropy control](../../../docs/conventions/simplification-and-entropy-control.md)
- [Defensive engineering patterns](../../../docs/conventions/defensive-patterns.md)
- [Decision Notes](../../../docs/decisions/README.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- The nearest `AGENTS.md`, source, tests, Decisions, and Postmortems for the affected module

## Boundary

Investigate, prove, rank, and report candidates only. Do not delete implementation, change dependencies, move Decisions, update ignores, or alter runtime state. Treat later authorization to implement a candidate as a new change task.

## Strong candidates

- A public API, configuration, event, Registry hook, or durable field has no production, build, dynamic, or compatibility consumer.
- Two caches, events, fields, or memory objects mirror the same authoritative fact.
- A single-caller package, Repository, or Port has no independent release, replacement, or isolation value.
- A generalized capability has no current product owner.
- An invariant, rollback, fixture, or expected output protects only a removed API.
- A healthy dependency or Node 24 built-in fully replaces project-owned code and enables net deletion of implementation and dedicated tests.
- A maintained source and its generated output are both edited manually.
- Several Promises, sentinels, booleans, and disposers encode the same liveness or settlement fact.

One static-tool result, a few duplicated lines, or subjective complexity is not strong evidence.

## Workflow

1. Generate scope from a confirmed Base, then read owning rules, current Decisions, recent tests, and real entrypoints.
2. Search broadly and investigate the largest production implementation and state machines before smaller candidates.
3. Use [Consumer proof](references/consumer-proof.md) to classify production, non-production, build/dynamic, compatibility, and no-consumer usage.
4. Use [Lifecycle ownership](references/lifecycle-ownership.md) to distinguish mergeable state from orthogonal relationships in complex asynchronous code.
5. Use [Dependency replacement](references/dependency-replacement.md) to calculate residual semantics and net deletion.
6. Use [Decision supersession](references/decision-supersession.md) to distinguish full from partial replacement.
7. Reject candidates that lack evidence, merely transfer complexity, or break a negative guarantee.
8. Report a small set ranked by net benefit and risk; do not implement them.

## Candidate record

For every non-trivial candidate, record the current owner and behavior, each consumer class, proposed deletion or merge, required residual semantics, net deletion, lost capability, risk, need for a durable Decision, and verification that would detect regression.

Do not mark a candidate proven without explicit production-call and compatibility searches. Preserve real entrypoints, dynamic registration, protocol and Secret guarantees, wire and database compatibility, client abort, first-byte boundaries, rollback, observer isolation, shutdown quiescence, and glue exposed only in release artifacts.

## Discovery commands

```bash
pnpm knip
pnpm duplication
pnpm docs:module-graph:check
pnpm hygiene
```

Report every actual command, tool limitation, candidate proof, and unverified entrypoint. Never manufacture a simplification result through ignores, allowlists, raised thresholds, removed negative tests, or weakened invariants.

This workflow is adapted from DeepSeek Harness `dsh-find-simplifications` for this repository. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
