# Product UX principles

Read this reference when designing page hierarchy, dense data, forms, progressive disclosure, or content structure.

## Orient the user

A product surface should quickly answer:

1. Where am I?
2. What objects or information are here?
3. What can I do now?
4. What happened after I acted?

Reducing visible information does not automatically reduce cognitive load. Do not hide labels, current state, recovery actions, or consequences merely to make a screenshot look cleaner.

## Organize around the task

A typical page may contain:

```text
Page header: title, concise context, primary action
Task controls: search, filters, sort, selection actions
Primary content: table, list, form, detail, or workspace
Local states: loading, empty, stale, error, progress
Durable controls: pagination, save, or relevant metadata
```

Use only the regions that support the main job. Derive navigation and sections from user questions, not service topology or database ownership.

## Build hierarchy without decorative containers

Use headings, spacing, alignment, dividers, muted text, stable action placement, and appropriate density before adding elevation or cards. A container should communicate ownership, independence, interaction, or layer.

Keep one visually dominant primary action for the current task. Expose frequent and recovery actions directly; place low-frequency contextual actions in menus. Separate destructive actions from routine controls.

## Present dense data deliberately

Use tables when users compare repeated attributes, lists for compact summaries, description lists for one object's facts, and cards for a small number of genuinely independent or heterogeneous objects.

For dense records:

- keep names and identifiers scannable;
- align numeric values consistently;
- communicate status with text or icon as well as color;
- expose sort and filter state;
- make selection, navigation, and row actions unambiguous;
- preserve useful filters or selection in the URL when appropriate;
- define narrow-screen overflow instead of silently hiding core facts.

## Design forms by user intent

- Group fields by the user's decision, not backend ownership.
- Keep labels visible and associate validation with the field.
- Explain non-obvious format, default, behavior, or consequence.
- Prevent invalid combinations when possible.
- Preserve input after recoverable failure.
- Use stable save and cancel actions.
- Separate advanced and dangerous settings from routine input.
- Prefer a page for long multi-section forms.

## Reveal complexity progressively

Good candidates include provider-specific options, headers, retries, timeouts, proxies, uncommon filters, diagnostic metadata, and destructive administration. Keep advanced controls discoverable.

Do not hide required fields, frequently used actions, current status, or consequences behind disclosure.

## Use accurate feedback

Every asynchronous action needs immediate acknowledgment appropriate to its scope. Reflect durable success in durable page state. Use Toast for transient confirmation, inline errors for persistent failure, and page-owned progress for work that continues after navigation.

Differentiate first-use empty, filtered empty, permission denial, error, `unknown`, and zero. Each has a different explanation and recovery action.

## Preserve accessibility and responsive priority

Use semantic headings and landmarks, visible labels, accessible names, logical focus order, visible focus indication, keyboard-operable controls, associated errors, and status communication beyond color.

At narrow widths, preserve the main task and primary action, stack content in a meaningful reading order, keep tap targets usable, and move or collapse only lower-priority controls. Choose a temporary mobile overlay only when it fits the mobile task; do not let it dictate the desktop structure.
