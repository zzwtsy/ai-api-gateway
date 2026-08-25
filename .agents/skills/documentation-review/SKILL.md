---
name: documentation-review
description: Write, move, review, or simplify durable ai-api-gateway Markdown documentation, AGENTS files, Conventions, Architecture and Feature documents, Decision Notes, Postmortems, or Plans. Decide fact ownership, preserve complete propositions, and enforce the repository's Chinese-first and generated-asset rules. Do not use for source comments, prompts, diagnostics, or product UI copy.
---

# Project documentation review

Write enough to preserve the contract, then remove duplication, decoration, and authoring process. Shorter text is not the goal. A reader at the current commit must be able to find the single fact owner and recover behavior, conditions, timing, ownership, failure, and exceptions.

This workflow owns durable project documentation only: whether a fact belongs in documentation, which document type owns it, and whether the proposition is complete. Source comments, prompts, diagnostics, and product UI copy are out of scope; report the boundary without expanding the task.

## Sources of truth

- [Documentation map](../../../docs/README.md)
- [Documentation system](../../../docs/conventions/documentation-system.md)
- [Language and localization](../../../docs/conventions/language-and-localization.md)
- [Vibecoding and Agent governance](../../../docs/conventions/vibecoding-and-agent-governance.md)
- [Decision Notes](../../../docs/decisions/README.md)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)

Read the code, schema, migration, OpenAPI definition, tests, or product contract that owns a fact before editing its prose. Do not infer behavior from the existing paragraph alone.

## Scope and write authority

Scope comes from the files the user named, the current task, or `change-scope` against a confirmed Base. Review requests are read-only; edit only when the user asks to write, repair, move, or simplify. Do not turn a local documentation task into a repository-wide rewrite.

Generated directories, fixtures, snapshots, and generated API types are derived assets. Change their owner and regenerate them rather than polishing generated output directly.

## Choose the fact owner

| Content | Owning location |
| --- | --- |
| Product goal, users, scope, terminology | `docs/product/` |
| Current system composition, data flow, module boundaries | `docs/architecture/` plus current source |
| User-observable feature semantics | `docs/features/` |
| Current engineering requirements | `docs/conventions/` |
| Durable choices, alternatives, and costs | `docs/decisions/` |
| Suggested order of unfinished work | `docs/roadmap/` |
| External facts, protocol material, design references | `docs/references/` |
| Temporary implementation sequence | `docs/plans/` |
| Control-plane HTTP contract | OpenAPI generated from `createRoute` |
| Database structure | Drizzle schema plus committed migration |
| Web API types | Generated `apps/web/src/api/schema.d.ts` |
| UI tokens | `docs/product/ux/design-tokens.json` plus Web theme |

A fact has one detailed owner. Other locations keep only the local contract a consumer must know and link to the owner. Do not duplicate field inventories, schemas, test lists, module graphs, or state tables for convenience.

## Distinguish document types

- **Current fact:** present-tense Product, Architecture, Feature, or Convention content that matches current source.
- **Decision Note:** why a durable choice was made, real alternatives, costs, and verification; it does not replace current facts.
- **Execution Plan:** mutable next-step sequencing; remove it on completion or move durable facts to their owners.
- **Postmortem:** evidence, timeline, causal chain, impact, and permanent guards for an escaped defect.
- **Tutorial:** dependency-ordered guidance that leads to an observable result.
- **Reference:** scoped lookup material without an expected reading order.

Split substantial mixed Tutorial and Reference content. Do not put review narration or an implementation diary into current-fact documentation.

## Preserve complete propositions

Before rewriting, enumerate the passage's facts. Preserve:

- actor and action;
- conditions, timing, and ordering;
- normative strength such as must, may, and must not;
- negative guarantees, exceptions, and compatibility obligations;
- ownership, side effects, failure modes, and consequences.

Delete a passage only when every fact remains recoverable from the replacement, owning code, or link. Never weaken “must not fall back after the first downstream byte” into “normally does not fall back,” or collapse `unknown`, no data, and `0` into one empty state.

## Minimum coverage by surface

### Markdown

- Explain the document's own subject; summarize and link subordinate subjects.
- Keep configuration, defaults, errors, limitations, and public behavior aligned with source.
- Architecture owns relationships and flow; Features own user semantics; Conventions own required practice.
- Do not hand-maintain inventories that OpenAPI, schemas, module graphs, directories, or scripts can generate.

### AGENTS and Skill files

State the trigger boundary, sources of truth, prohibited shortcuts, workflow, and verification. Preserve useful judgment instead of turning guidance into a brittle script, while making non-negotiable semantics explicit. Every relative link and `pnpm` command must exist.

### Decision Notes and Postmortems

- Record only alternatives that were actually considered; do not invent entries to fill a template.
- An `implemented` Decision describes delivered reality in the present tense; a `superseded` Decision links its replacement.
- Preserve incident evidence and causal chains that justify permanent guards.

## Language contract

- `README.md`, `docs/`, AGENTS files, collaboration output, and the Web UI default to Simplified Chinese.
- Project-owned Skill instructions default to English; required Simplified Chinese output and target-language literals remain explicit where they affect behavior.
- Keep code identifiers, filenames, package names, HTTP fields, `operationId`, Error Codes, log fields, and environment variables in English.
- Introduce precise entities once when needed; do not repeat bilingual labels mechanically.
- `README.en.md` is an international entrypoint, not a mandatory mirror of internal documentation.
- Never use stale English material to overwrite the current Chinese source of truth.
- Do not create an empty i18n abstraction before a second product language exists.

## Move, delete, and generate

1. Before moving content, search inbound links, anchors, code comments, and script references.
2. Delete the old location, write the new owner, and repair every reference in the same change.
3. Run the generator after changing an owning source; never patch `.artifacts/spec/`, `routeTree.gen.ts`, or `schema.d.ts` manually.
4. Git tags and releases preserve old specifications; do not keep active `old/` or `v0.x/` copies.
5. If deleting prose changes promised behavior, treat it as a product or architecture change rather than disguising it as editing.

## Workflow

1. Confirm scope, Base, and write authority.
2. Route from `docs/README.md` to the smallest owning document.
3. Read the owning code, schema, migration, OpenAPI definition, and recent tests.
4. Classify candidate passages as `keep`, `add`, `trim`, `restore`, `move`, or `defer`.
5. Change the owner first, then update links and derived assets.
6. Use [examples](references/examples.md) to check proposition completeness, placement, and authoring residue.
7. Run the evidence appropriate to the changed surface.
8. Report the inspected scope, edits, deliberately retained content, unresolved items, and actual commands.

## Validation

For documentation, AGENTS files, Skill files, and Decision Notes:

```bash
pnpm check:docs
git diff --check
```

When a specification-projection owner changes:

```bash
pnpm docs:bundle
pnpm check:docs
```

Protocol, database, or artifact documentation that accompanies behavior changes still requires the owning behavior Gate; green documentation checks do not prove the implementation.

This workflow is adapted from DeepSeek Harness `dsh-doc-standards` and `dsh-prose-standard` for this repository. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
