# State ownership and lifecycles

Read this reference for asynchronous data, forms, URL-restorable selection, overlays, background jobs, destructive actions, cancellation, or partial failure.

## One owner per state

| State | Typical owner | Constraint |
| --- | --- | --- |
| Server data | Query cache or route loader | Do not copy into a second global store without a distinct need |
| Shareable selection, filters, pagination, tabs | URL | Normalize invalid values and define Back/refresh |
| Unsaved form input | Task-local form | Preserve through recoverable failure |
| Overlay open state | Invoking page or local workflow | Do not encode Secrets or temporary confirmations in URL |
| Background-job progress | Server job plus page query | Closing an overlay must not orphan it |
| Transient acknowledgment | Local state or transient feedback | Cannot be the only durable success or failure record |

Derived display state should be calculated from its owner rather than synchronized through Effects.

## Define transitions

For each reachable state, specify the entry event, visible result, available actions, exit or recovery, persisted data, URL, focus, and selection. Distinguish initial loading, populated, first-use empty, filtered empty, invalid, submitting, success, recoverable error, partial failure, stale, disabled, permission denied, and destructive confirmation when the product can reach them.

## Asynchronous and background work

- Acknowledge input immediately and prevent accidental duplicate submission.
- Keep the initiating control associated with pending state.
- Preserve input after recoverable failure.
- A refresh failure must not erase cached successful content; show stale state and retry locally.
- Optimistic updates need credible rollback.
- Cancellation must state whether it stops client wait, server work, or both.

Durable background work follows this ownership shape:

```text
configure
→ server accepts durable job
→ temporary task UI may close
→ page-owned progress and result
```

## Overlay, Secret, and destructive transitions

Prefer replacing one modal state over stacking multiple roots. Cancel returns to a valid prior state; success updates durable page state and returns focus. One-time Secret state explains what becomes unrecoverable on close and never enters URL, logs, screenshots, or ordinary persistence.

Calibrate destructive friction to consequence and reversibility. After deletion or revocation, keep the selected URL, focus target, list count, and detail surface valid.

## Responsive lifecycle

Presentation may change without changing state ownership. A desktop inspector can become stacked detail or route navigation at narrow width while preserving selection, reading order, and recovery. A modal fallback must not silently change the desktop interaction model.
