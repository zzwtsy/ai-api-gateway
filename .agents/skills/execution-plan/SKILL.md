---
name: execution-plan
description: Create and maintain a temporary implementation plan for an ai-api-gateway change that crosses modules, protocols, database schemas, security boundaries, lifecycles, or delivery phases. Use before and during non-trivial implementation; do not use for mechanical single-file edits, durable specifications, or completed-work status records.
---

# Execution plan

Before implementing a change that crosses feature boundaries or changes a durable contract, create `docs/plans/<kebab-topic>.md`.

Include:

```markdown
---
status: draft
last_reviewed_at: <YYYY-MM-DD>
language: zh-CN
---

# <topic>

## Goal and scope
## Explicitly out of scope
## Current evidence
## Decisions
## Files to add or modify
## Implementation steps
## Verification commands
## Risks and rollback
## Documentation and Decision Notes
```

Rules:

- Base the plan on current source and tests, not memory or stale Decision Notes.
- Name the owning module for every step.
- Select concrete verification commands from `ai/change-evidence-matrix.md`.
- State exclusions explicitly so the implementation does not expand its scope.
- Write the plan itself in Simplified Chinese; keep code identifiers and commands in English.
- Delete or archive the temporary plan after completion, and move durable facts into the owning Convention, Architecture document, or Decision Note.
