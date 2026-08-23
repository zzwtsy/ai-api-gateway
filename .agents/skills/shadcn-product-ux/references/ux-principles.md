# Product UX Principles

Load this reference when a task needs deeper UX rationale, a design review, or page-level structure beyond the core workflow in `SKILL.md`.

## 1. Clarity before density reduction

A clear interface lets users answer four questions quickly:

1. Where am I?
2. What objects or information are here?
3. What can I do now?
4. What happened after I acted?

Reducing visible content does not automatically reduce cognitive load. Hiding labels, actions, state, or context often makes an interface look cleaner while making it harder to operate.

## 2. Page anatomy

Use this default structure for product pages:

```text
Page header
├── title
├── concise purpose or context
└── one primary action

Task controls
├── search
├── filters
├── sort or view controls
└── batch actions when selection exists

Primary content
├── table, list, form, detail, or workspace
├── loading state
├── empty states
└── error states

Footer controls
└── pagination, save actions, or secondary metadata when needed
```

Do not add every region mechanically. Use only what supports the page's task.

## 3. Information hierarchy

Build hierarchy with:

- page and section titles;
- font weight and muted text;
- spacing and alignment;
- dividers and background changes;
- stable placement of actions;
- content density appropriate to the task.

Use elevation and cards sparingly. A surface needs a container only when the container communicates ownership, independence, interaction, or layer.

## 4. Primary and secondary actions

The primary action should be the most likely next step for the current page, not the action the business most wants clicked.

Good hierarchy:

- primary: one default button;
- secondary: outline or subdued buttons;
- tertiary: ghost controls, links, or menus;
- destructive: visually distinct and separated from routine actions.

A row can expose one common action directly and put low-frequency actions in a contextual menu. Do not hide the main page action or the only way to recover from a problem.

## 5. Feedback and system status

Every asynchronous interaction needs immediate acknowledgment. Depending on duration and scope, use:

- pending text, spinner, or progress near the initiating control;
- optimistic feedback only when rollback is reliable;
- inline success when the result changes a durable page state;
- toast for transient confirmation;
- alert or error content for persistent failure;
- background-job status when work continues after navigation.

Disable duplicate submission while preserving the user's ability to cancel when cancellation is meaningful.

## 6. Error prevention and recovery

Prefer preventing invalid states:

- choose constrained controls for constrained values;
- provide safe defaults;
- validate format near the field;
- explain consequential options before submission;
- preview destructive scope;
- preserve user-entered values after failure;
- support undo when the action is cheap to reverse.

Error copy should identify the failed action, the likely cause when known, and the next recovery step. Do not expose raw infrastructure errors as the only explanation.

## 7. Progressive disclosure

Show the minimum information needed to make the current decision, while keeping advanced controls discoverable.

Good candidates for progressive disclosure:

- provider-specific settings;
- retry, timeout, headers, and proxy options;
- uncommon filters;
- diagnostic metadata;
- destructive or administrative actions.

Do not hide required inputs, frequently used controls, current state, or the consequences of a choice.

## 8. Data-dense interfaces

Use a table when users compare the same attributes across many records. Use a list when records need a compact summary but not strict column comparison. Use cards for a small set of independent summaries or objects with materially different content.

For tables:

- keep names or identifiers easy to scan;
- align numeric data consistently;
- show status with text plus a semantic treatment;
- expose sort state;
- preserve filters in the URL when useful;
- avoid making the entire row an ambiguous interactive target;
- keep row actions predictable;
- support horizontal overflow deliberately on narrow screens.

## 9. Forms

Group fields by user intent, not data model ownership.

- Keep labels visible.
- Explain only non-obvious format, consequence, default, or behavior.
- Put validation next to the field.
- Use a stable save area.
- Warn before losing unsaved changes when the cost is meaningful.
- Separate advanced or dangerous settings from routine values.
- Avoid multi-column forms when reading order or error association becomes ambiguous.

For long forms, prefer a page with sections and an anchored save action over a tall modal.

## 10. Empty states

Differentiate:

- **First-use empty:** explain the object and provide the creation action.
- **Filtered empty:** explain that nothing matches and offer to clear or adjust conditions.
- **Permission empty:** explain access limitations without suggesting an impossible action.
- **Error that looks empty:** show the failure; do not silently present an empty collection.

Use illustration or iconography only when it helps orientation. The copy and next action carry the UX.

## 11. Responsive behavior

At narrow widths:

- preserve the main task and primary action;
- collapse or move low-frequency navigation and filters;
- stack form fields in a clear reading order;
- avoid shrinking tap targets;
- choose deliberate overflow for tables and code;
- use Drawer or Sheet only when it preserves context better than navigation;
- avoid hiding critical status or actions without an alternate path.

## 12. Accessibility

At minimum:

- semantic headings and landmarks;
- visible labels and accessible names;
- logical focus order;
- visible focus indication;
- keyboard-operable controls;
- overlay focus trapping and focus return;
- text or icon support for color-coded status;
- error association with the relevant field;
- sufficient contrast through semantic theme tokens;
- reduced-motion support for nonessential animation.

Tooltip content supplements an accessible name; it does not replace one.
