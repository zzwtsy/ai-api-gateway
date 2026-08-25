# Interaction decisions

Read this reference when choosing page structure, detail pattern, overlay, navigation, data presentation, or action placement.

## Decision dimensions

| Dimension | Question |
| --- | --- |
| Modality | Must this task be resolved before continuing? |
| Frequency | Is it occasional or repeated across many records? |
| Duration | Is it brief or a durable workspace? |
| Background comparison | Must surrounding content remain operable? |
| Recoverability | Must URL, refresh, Back, or sharing restore it? |
| Complexity | Is it one focused decision or several sections? |
| Device behavior | Should narrow screens stack, navigate, or use a temporary overlay? |

Do not infer these answers from a desired animation or component library.

## Pattern selection

| Pattern | Choose when | Avoid when |
| --- | --- | --- |
| Page or detail route | Durable, deep-linkable, multi-section, long, or complex recovery | Tiny action meaningful only in current context |
| Persistent inspector | Repeated selection, comparison, diagnosis, or stable list-detail context | Detail needs the whole workspace |
| Inline detail | Short item-owned detail that preserves scanning | Tall content, repeated instability, or deep linking matters |
| Dialog | Short modal task with clear start and end | Long content, background comparison, deep linking, extensive recovery |
| Sheet | Temporary modal tool benefits from edge placement | Main destination, frequent record detail, or large workspace |
| Drawer | Narrow-screen temporary action benefits from bottom placement | Desktop default without device-specific reason |
| Popover | Lightweight anchored choice or explanation | Extensive input, durable errors, independent navigation |
| AlertDialog | Irreversible or broad-impact acknowledgment | Routine or reversible action |

A typical shadcn Sheet uses modal Dialog semantics: backdrop, focus containment, background scroll lock, and blocked background interaction. It is not a persistent inspector merely because the page remains visible.

## Overlay lifecycle

- Keep at most one modal task active unless nested confirmation is unavoidable.
- One overlay owns one coherent task.
- Define Escape, backdrop, Back, route change, refresh, close focus, and unsaved input behavior.
- Background work must not depend on an open overlay unless cancellation is explicit.
- Constrain width and height to the task and verify actual viewport geometry.

## Presentation and navigation

Use a Table for comparison, List for flexible compact summaries, Cards for real independent units, and a description list for one object's fields. Avoid ambiguous full-row activation when rows also contain selection or actions.

Use route navigation for durable destinations, Tabs for peer views of one context, disclosure for optional information, and steps only for ordered dependent work. Put shareable filters, pagination, selection, or tabs in the URL when refresh should preserve them. Never put Secrets or unsaved sensitive input in the URL.

Show primary, frequent, recovery, and safety-critical actions directly. Menus are for low-frequency contextual actions. Name destructive scope and consequence.
