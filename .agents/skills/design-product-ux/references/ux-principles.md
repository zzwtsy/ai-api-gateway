# Product UX principles

Read this reference when designing page hierarchy, dense data, forms, progressive disclosure, or content structure.

## Orient the user

A product surface should quickly answer where the user is, what objects are present, what action is available, and what happened after an action. Reducing visible information does not automatically reduce cognitive load; do not hide current state, recovery, or consequences for decorative cleanliness.

## Organize around the task

A page may contain a title and concise context, task controls, primary content, local states, and durable controls such as save or pagination. Use only regions that support the main job. Derive sections from user questions, not service topology.

Build hierarchy with headings, spacing, alignment, dividers, muted text, and stable actions before adding Cards or elevation. A container should communicate ownership, independence, interaction, or layer.

Keep one visually dominant primary action. Expose frequent, recovery, and safety-critical actions directly; put low-frequency contextual actions in menus and separate destructive actions.

## Dense data

Use tables for repeated attribute comparison, lists for compact summaries, description lists for one object's facts, and Cards for a small number of genuinely independent or heterogeneous objects.

For dense records:

- keep names and identifiers scannable;
- align numeric values consistently;
- communicate status beyond color;
- expose sort and filter state;
- make selection, navigation, and row actions unambiguous;
- preserve shareable filters or selection in the URL when appropriate;
- define narrow-screen overflow instead of silently hiding core facts.

## Forms

Group fields by user decision, keep visible labels, associate validation with fields, explain non-obvious format or consequence, preserve input after recoverable failure, and keep save/cancel stable. Separate advanced and dangerous settings. Prefer a page for long multi-section forms.

## Progressive disclosure and feedback

Good disclosure candidates include provider-specific options, headers, retries, timeouts, uncommon filters, diagnostic metadata, and destructive administration. Required inputs, frequent actions, current status, and consequences remain visible.

Asynchronous actions need immediate acknowledgment. Durable success appears in durable page state. Use transient feedback for transient confirmation, inline errors for persistent failure, and page-owned progress for work that survives navigation.

## Accessibility and responsive priority

Specify semantic headings and landmarks, visible labels, accessible names, logical focus order, visible focus indication, keyboard operation, associated errors, and status communication beyond color.

At narrow widths preserve the main task and primary action, stack content in meaningful reading order, retain usable touch targets, and move only lower-priority controls. A temporary mobile overlay does not determine the desktop structure.
