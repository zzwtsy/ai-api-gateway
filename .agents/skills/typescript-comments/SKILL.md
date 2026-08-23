---
name: typescript-comments
description: Review, add, remove, or correct comments in non-generated TypeScript and TSX files for ai-api-gateway. Use for JSDoc, internal and test comments, TODOs, and TypeScript suppression directives; do not use for Markdown or non-TypeScript prose.
---

# TypeScript Comments

Keep comments only when they preserve a contract that TypeScript and local code cannot express. Comments in project-owned TypeScript follow the repository's Chinese-first output policy even though this skill is written in English.

## Sources of truth

- [TypeScript comment convention](../../../docs/conventions/typescript-comments.md)
- [Language and localization](../../../docs/conventions/language-and-localization.md)
- [Documentation ownership](../../../docs/conventions/documentation-system.md)
- [`trim-authoring-residue`](../trim-authoring-residue/SKILL.md) for a dedicated authoring-residue audit

Inspect the owning implementation, callers, tests, protocol contract, and lifecycle before changing a comment. A comment is not evidence that the behavior still exists.

## Scope

Apply to project-owned, non-generated `.ts` and `.tsx` files:

- public JSDoc and API-facing contract notes;
- internal invariants, ordering, ownership, security, and failure semantics;
- test comments that explain fixtures, real entry points, indirect observation, or negative controls;
- actionable TODOs with an owner or removal condition;
- `@ts-expect-error` descriptions.

Do not patch generated route trees, generated OpenAPI types, shadcn Registry source, fixtures, or snapshots. Change their owner and regenerate them when applicable. Use `documentation-review` for Markdown, prompts, diagnostics, and user-visible prose outside TypeScript.

## Workflow

1. Confirm whether the request is review-only or authorizes edits.
2. Identify the exact contract the comment must preserve and whether code or types can express it instead.
3. Add or retain the smallest complete statement of the non-local fact. Preserve actor, condition, ordering, ownership, failure, exception, and security semantics where relevant.
4. Remove narration of syntax, control flow, tests, review history, or self-justification.
5. Keep suppressions narrow. Never add `@ts-ignore` or `@ts-nocheck`; use `@ts-expect-error` only with a specific reason of at least 10 characters.
6. Run the narrowest typecheck, test, and lint evidence that can detect a regression.

Read [review scenarios](references/review-scenarios.md) when deciding whether a comment belongs in JSDoc, an internal invariant, a test, a Decision Note, or nowhere.
