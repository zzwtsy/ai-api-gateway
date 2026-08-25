# Interaction decisions

Read this reference when choosing a page structure, detail pattern, overlay, navigation pattern, data presentation, or action placement.

## Decide before mapping components

Evaluate these dimensions:

| Dimension | Question |
| --- | --- |
| Modality | Must the user resolve or dismiss this task before continuing? |
| Frequency | Is this occasional, or repeated across many records? |
| Duration | Is it a brief closed task or a durable workspace? |
| Background comparison | Must the user read or operate on surrounding content while it is open? |
| Recoverability | Must URL, refresh, Back, or sharing restore this state? |
| Complexity | Is the content one focused decision or several independent sections? |
| Device behavior | Should narrow screens stack, navigate, or use a temporary overlay? |

Do not infer the answer from the component library or desired animation.

## Page, inspector, inline detail, or overlay

| Pattern | Choose when | Avoid when |
| --- | --- | --- |
| Page or detail route | The task is durable, deep-linkable, multi-section, long, or needs complex recovery | The interaction is tiny and meaningful only inside the current context |
| Persistent inspector / Master-Detail | Users repeatedly select records, compare list and detail, or diagnose while retaining context | The detail needs the whole workspace or the list has no continuing value |
| Inline detail / expandable row | A short detail belongs to one item and expansion does not destroy list scanning | Content is tall, repeated expansion causes instability, or deep linking matters |
| Dialog | A short modal task has a clear start and end, such as a decision or compact form | Long content, background comparison, deep linking, or extensive recovery is required |
| Sheet | A temporary modal tool benefits from edge placement, such as filters or supplemental inspection | It is the main destination, a frequent record detail, or a large workspace |
| Drawer | A narrow-screen temporary action or panel benefits from bottom placement | It is used as a desktop default without a device-specific reason |
| Popover | A lightweight anchored choice or explanation is dismissed without workflow state | The task needs extensive input, durable errors, or independent navigation |
| AlertDialog | An irreversible or broad-impact action requires deliberate acknowledgment | The action is routine, reversible, or can offer Undo |

### Modal Sheet is not a persistent inspector

Most shadcn Sheet implementations use modal Dialog semantics: a backdrop, focus containment, background scroll lock, and blocked background interaction. The page remains visually recognizable but not operationally available.

Use a persistent inspector instead when users must:

- move through several records without reopening an overlay;
- compare selected detail with table rows or metrics;
- keep the selected object visible in the URL;
- spend sustained time reading or editing;
- preserve a stable spatial anchor.

## Overlay lifecycle

- Keep at most one modal task active unless a nested confirmation is unavoidable and explicitly designed.
- An overlay owns one coherent task, not unrelated create, detail, secret, confirmation, and progress states.
- After close, return focus to the invoking control or the next valid target.
- Define whether Escape, backdrop click, browser Back, route changes, and refresh dismiss or restore the task.
- Preserve unsaved input after recoverable submission failures.
- Do not keep a background job dependent on an open overlay; move durable progress to a page-owned status.
- Constrain width and height to the task, then verify geometry at actual viewports. A larger overlay is not a substitute for a page.

## Table, list, cards, or description list

| Pattern | Choose when | Requirement |
| --- | --- | --- |
| Table | Users compare repeated attributes across records | Stable columns, explicit sort/filter state, deliberate overflow, predictable row actions |
| List | Records need compact summaries without strict column comparison | Clear primary text, flexible metadata, stable action placement |
| Cards | A small number of independent or heterogeneous objects need separate summaries | Each card represents a real unit rather than framing layout |
| Description list | One object's fields and values are being read | Readable labels, wrapping, and copy affordances where useful |

Avoid ambiguous full-row activation when rows also contain links, selection, or actions. Make selection and navigation semantics explicit.

## Navigation, peer views, disclosure, and steps

| Pattern | Use for | Avoid for |
| --- | --- | --- |
| Route navigation | Stable business areas and durable destinations | Temporary local options |
| Tabs | Peer views of the same object or context | Sequential steps or unrelated modules |
| Accordion / Collapsible | Optional or advanced information | Required inputs or critical state |
| Step flow | Ordered work with dependencies or meaningful progress | Arbitrary grouping of a small form |

Put shareable filters, pagination, selected records, or tabs in the URL when refresh and navigation should preserve them. Never place secrets or unsaved sensitive inputs in the URL.

## Direct actions and menus

Show an action directly when it is the primary action, frequent, required for recovery, safety-critical, or otherwise difficult to discover. Use contextual menus for low-frequency actions that share an object. Separate destructive actions and name their consequence.

## Feedback and destructive friction

| Situation | Default treatment |
| --- | --- |
| Local short pending action | Pending label or spinner in the initiating control |
| Durable background work | Page-owned progress or polling state |
| Transient successful completion | Toast plus durable state update when applicable |
| Persistent failure | Inline error or Alert with recovery |
| Invalid field | Associated field error and invalid state |
| Reversible low-impact action | Perform, confirm transiently, offer Undo when feasible |
| Irreversible or broad-impact action | AlertDialog naming object, scope, and consequence |

A Toast is not the only record of a persistent failure or required follow-up.
