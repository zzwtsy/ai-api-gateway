# Lifecycle ownership

For a complex asynchronous candidate, map:

```text
operation
├── owner
├── publication point
├── cancellation source
├── settlement point
├── disposer
└── quiescence evidence
```

Map every sentinel, readiness Promise, AbortController, state flag, terminal marker, and cleanup registration to a distinct relationship. Mechanisms become merge candidates only when they mirror the same completion fact.

Do not merge orthogonal relationships merely to remove fields: synchronous publication and rollback, callback-error isolation, first-terminal-state arbitration, Worker/Process/Socket ownership, abort issuance and resource quiescence, or Provider Outcome, Termination, Retry, Fallback, Observation, and final Request Outcome.
