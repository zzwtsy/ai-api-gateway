# UI copy decision rubric

Use this rubric after identifying the page's primary task. It is a judgment aid, not a scoring system.

## Classification

| Classification | Use when | Required result |
| --- | --- | --- |
| `keep` | The copy passes a retention criterion and is already at the decision point | Preserve the full meaning and verify the state |
| `shorten` | The fact matters, but the wording repeats context or contains unnecessary mechanism | Keep the actor, consequence, condition, and next action |
| `move` | The fact matters only during a particular action or state | Put it beside that action, state, or progressive disclosure owner |
| `delete` | The interface already expresses the fact, or it does not affect the current task | Remove it without replacing it with decorative prose |
| `add` | The interface omits a necessary consequence, recovery action, distinction, or accessible name | Add the smallest complete statement at the decision point |

## Decision questions

For each string, answer:

1. What user decision or action changes after reading it?
2. What error, cost, security issue, or misunderstanding occurs if it is absent?
3. Is the information already expressed by the title, label, control, data, or state?
4. Is the information needed now, only after an action begins, only on failure, or only in documentation?
5. Is this the closest surface to the affected action or state?
6. Can the user recover or proceed after reading it?
7. Does removing or shortening it weaken a domain distinction, negative guarantee, or timing rule?
8. Does assistive technology receive the same actionable meaning?

An answer of “it explains the system” is insufficient unless that explanation changes the current task.

## Surface guidance

### Page Header

- Use the title to identify the workspace.
- Keep at most one short task-oriented description when the page purpose is not evident from navigation, data, and primary action.
- Do not summarize architecture, identity boundaries, or the entire resource lifecycle.

### Card and section headers

- Do not restate the Page Header or title.
- Use a description only when it changes how the section should be interpreted or used.
- Prefer live status, a relevant constraint, or an action over explanatory filler.

### Field help

- Explain non-obvious format, scope, source, default, or downstream effect.
- Do not repeat the label or placeholder.
- Keep validation errors specific to the invalid value and recovery.

### Tables and inspectors

- Let column labels, values, badges, and selection state carry ordinary meaning.
- Keep detail subtitles to identity or comparison context; do not narrate that the panel is a detail view.
- Put lifecycle consequences beside the lifecycle action rather than in every list and detail header.

### Alerts

- Reserve persistent Alerts for information requiring attention in the current state.
- Include subject, consequence, and action when recovery exists.
- Move delivery progress, untested-capability inventories, and general architecture notes to their durable owner.

### Dialogs and confirmations

- State what action will occur, what cannot be undone or recovered, and what remains available afterward.
- Put one-time Secret and destructive-action warnings before dismissal or confirmation.
- Avoid repeating the same warning in the opener, title, description, body, and footer.

### Empty, stale, permission, and error states

- Name the affected subject.
- Distinguish no data, no filtered results, loading, stale data, denied access, and failure.
- Provide the next safe action when one exists.
- Do not use architecture explanations as substitutes for recovery.

### Buttons, menus, tooltips, and accessible names

- Use action plus object when context is ambiguous.
- Use Tooltips for optional clarification, not essential instructions or warnings.
- `aria-label` describes the action or destination, not the icon's appearance.
- A placeholder is an example or hint, not a durable label.

## Conflict order

When goals conflict, prefer:

1. correctness, safety, and irreversible consequences;
2. task completion and recovery;
3. meaningful domain distinctions;
4. information hierarchy and proximity;
5. brevity and visual density.

This order protects necessary copy without treating every true technical fact as interface content.
