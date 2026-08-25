---
name: review-ui-copy
description: Review or revise user-visible Web product copy for task relevance, duplication, placement, state recovery, safety consequences, information density, and accessible naming. Use for page descriptions, helper text, alerts, dialogs, empty or error states, toasts, tooltips, and control labels. Do not use for general documentation, translation-only work, or authoring-process residue.
---

# Review UI Copy

Make every visible string earn its place in the user's current task. Correct facts are not automatically useful interface copy: they may be redundant, misplaced, too early, too persistent, or better owned by product documentation.

This repository is Chinese-first. User-visible prose defaults to Simplified Chinese, while code identifiers, protocol names, model IDs, HTTP fields, Error Codes, and other technical identifiers remain in English. Follow the [language and localization convention](../../../docs/conventions/language-and-localization.md).

## Boundary

This Skill owns copy value and placement for task-focused Web interfaces, including:

- page titles and descriptions;
- section headings and Card descriptions;
- field labels, placeholders, and helper text;
- table labels and status explanations;
- loading, empty, filtered-empty, stale, permission, error, and success states;
- Alerts, Dialogs, confirmation copy, one-time Secret disclosure, and Toasts;
- buttons, links, menus, tooltips, `aria-label`, and other accessible names.

This Skill does not own general documentation, source comments, translation-only work, authoring-process cleanup, information architecture, containers, state ownership, responsive structure, or interaction-pattern design. Do not turn a copy review into an unsolicited layout redesign. Report a structural problem when copy cannot fix it, and change that structure only when the user authorizes a separately scoped implementation.

## Retention test

Keep a visible string only when it does at least one of the following:

1. changes the user's current decision or next action;
2. explains an irreversible consequence, security boundary, charge, or destructive effect;
3. explains a non-obvious format, default, scope, state, or timing rule;
4. provides recovery or a concrete next step after an empty, stale, denied, or failed state;
5. distinguishes concepts that users could otherwise confuse in a consequential way;
6. supplies an accessible name or relationship that the rendered interface does not otherwise expose.

If none applies, delete the string or move the durable fact to its documentation owner. “True at the current `HEAD`” and “important to the architecture” are not retention criteria by themselves.

Use the [decision rubric](references/decision-rubric.md) for surface-specific placement and the [examples](references/examples.md) when the correct classification is unclear.

## Workflow

1. Confirm whether the user requested an audit, an implementation, or both. Audit-only work remains read-only.
2. Identify the page's primary user task and the decisions required to complete it.
3. Read the owning component, relevant state lifecycle, product UX contract, and nearby tests. Do not infer conditional UI only from a screenshot.
4. Inventory visible copy by state and surface, including overlays, errors, stale data, empty results, destructive confirmations, one-time Secrets, and accessible names.
5. Classify each candidate as `keep`, `shorten`, `move`, `delete`, or `add`. Record the retention criterion and target location for every non-obvious decision.
6. Remove repeated facts across Page Header, Card, Inspector, helper text, and Dialog. Keep each fact at the closest point where it changes a decision.
7. Preserve the full consequence for Secrets, destructive actions, charges, permissions, and `unknown` versus `0`; brevity must not weaken the contract.
8. Edit the owning source. Update focused component or browser evidence for behaviorally important copy; avoid broad snapshots that merely freeze wording.
9. Verify the rendered result at the minimum supported viewport and relevant overlay height. Check reading order, clipping, internal scrolling, focus context, and accessible names.
10. Report the reviewed surfaces, classification decisions, deliberately retained risk copy, actual gates, browser evidence, and any unverified states.

## Safeguards

- Do not use word count, character count, or keyword scans as acceptance evidence. They can find candidates but cannot establish task value or correct placement.
- Do not delete recovery actions, error subjects, irreversible consequences, security boundaries, cost warnings, or meaningful state distinctions merely to reduce density.
- Do not repeat a critical warning everywhere. Put it at the decision point, then use progressive disclosure for additional detail when needed.
- Do not expose implementation frameworks, CLI bootstrap commands, internal architecture, delivery status, or testing progress in ordinary product UI unless that information is itself the user's current operational task.
- Do not put critical information only in a Tooltip, placeholder, color, icon, or Toast.
- Do not replace precise domain terms with friendly but ambiguous wording. Explain the term once where misunderstanding changes behavior.
- Do not claim visual or interaction quality from TypeScript, unit tests, string assertions, or static source review alone.

## Validation

For visible copy changes:

```bash
pnpm check:web
git diff --check
```

Add the focused Component or E2E gate selected for the affected state. Rendered browser evidence is required when copy changes layout density, overlay height, truncation, reading order, or interaction context.

For audit-only work, distinguish source findings from browser-observed evidence and do not mutate files.
