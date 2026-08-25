# State ownership and lifecycles

Read this reference when a flow uses asynchronous data, forms, URL-restorable selection, overlays, background jobs, destructive actions, cancellation, or partial failure.

## Assign one owner to each state

| State | Typical owner | Notes |
| --- | --- | --- |
| Server data | Query cache or route loader | Do not copy it into a second global client store without a distinct need |
| Shareable selection, filters, pagination, tabs | URL | Normalize invalid values and define Back/refresh behavior |
| Unsaved form input | Form instance local to the task | Preserve through recoverable errors; clear only after success or deliberate discard |
| Overlay open state | Invoking page or local workflow | Do not encode secrets or temporary confirmations in the URL |
| Background-job progress | Server-backed job plus page query | Closing an overlay must not orphan or cancel it unless cancellation is explicit |
| Transient acknowledgment | Local state or Toast | It cannot be the only record of durable success or failure |

Avoid two independent owners for the same fact. Derived display state should be calculated from the owning state rather than synchronized through effects.

## Define transitions, not only screenshots

For each meaningful state, specify:

- entry event;
- visible result;
- available action;
- exit or recovery event;
- data that persists across the transition;
- URL, focus, and selection after the transition.

Common states include initial loading, populated, first-use empty, filtered empty, invalid, submitting, success, recoverable error, partial failure, stale data, disabled, permission denied, and destructive confirmation. Include only states the product can actually reach.

## Asynchronous actions

- Acknowledge input immediately and prevent accidental duplicate submission.
- Keep the initiating control and affected region associated with the pending state.
- Preserve input after recoverable failure.
- When cached content exists, a refresh failure should not erase it; show stale state and retry locally.
- A local failure replaces only its owned region.
- Optimistic updates require a credible rollback and must not mask server rejection.
- Cancellation must define whether it stops the client wait, the server task, or both.

## Background jobs

Separate configuration and acceptance from durable execution:

```text
configure task
→ confirm or submit
→ server accepts durable job
→ close temporary task UI
→ page-owned progress and result
```

An overlay may configure or start a job, but progress that survives navigation belongs to a durable page surface. State whether closing, refreshing, navigating, or signing out affects execution.

## Overlay transitions

- Use one overlay for one coherent task.
- Prefer replacing one modal state over stacking multiple modal roots.
- A confirmation opened from a detail surface returns to a valid detail state after cancel.
- A one-time secret state must explain what becomes unrecoverable on close and must not enter URL, logs, screenshots, or ordinary persistence.
- Closing after success returns focus and leaves the durable page state updated.
- Reopening a creation task should not silently restore abandoned sensitive input unless the product explicitly promises drafts.

## Destructive actions

Calibrate friction to consequence and reversibility:

1. low impact and reversible: perform and offer Undo when feasible;
2. surprising but reversible: short confirmation or explicit wording;
3. irreversible or broad impact: AlertDialog naming object, scope, and consequence;
4. catastrophic or account-wide: prerequisite checks and typed confirmation only when proportional.

After deletion or revocation, ensure the selected URL, focus target, list count, and detail surface remain valid.

## Responsive lifecycle

Responsive behavior may change presentation without changing the underlying state owner. A desktop persistent inspector can become stacked detail or route navigation on a narrow screen while retaining selection, reading order, and recovery semantics. Do not make a modal mobile fallback change the desktop interaction model by default.
