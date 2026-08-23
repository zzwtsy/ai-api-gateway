# Shadcn Component Decisions

Load this reference when choosing a component or interaction pattern. Start with the default below and deviate only for a concrete task requirement.

## Page, Dialog, Sheet, or Drawer

| Pattern | Default use | Avoid when |
| --- | --- | --- |
| Page | durable tasks, long forms, deep links, multi-section details, complex recovery | the interaction is tiny and tightly coupled to the current context |
| Dialog | short, interruptive, closed task; explicit decision; small form | content is long, needs deep linking, or requires extensive comparison |
| Sheet | contextual detail, light editing, filters, supplemental information while preserving the underlying page | the task is the user's main destination or needs a large workspace |
| Drawer | narrow-screen action or contextual panel where bottom placement fits the device | used as a desktop default without a task-based reason |
| AlertDialog | irreversible or high-impact confirmation requiring deliberate acknowledgment | routine, reversible actions that can use undo or simple confirmation |

Every overlay needs an accessible title. After close, return focus to the invoking control or the next logical target.

## Table, list, or cards

| Pattern | Choose it when | Key requirement |
| --- | --- | --- |
| Table | users compare repeated attributes across records | stable columns, sort/filter feedback, deliberate narrow-screen overflow |
| List | records need a compact summary and flexible metadata | clear primary text, predictable row actions, scan-friendly spacing |
| Cards | a small number of independent summaries or heterogeneous objects | each card must represent a real unit, not merely frame layout |
| Description list | displaying field/value details for one object | readable labels, sensible wrapping, copy affordances where useful |

Do not replace a table with cards solely to appear more modern.

## Tabs, navigation, accordion, or steps

| Pattern | Use for | Do not use for |
| --- | --- | --- |
| Sidebar/navigation | stable business areas or distinct routes | temporary local view options |
| Tabs | peer views of the same object or context | sequential workflows or unrelated modules |
| Accordion/Collapsible | optional detail or advanced configuration | required fields or critical state |
| Stepper | ordered tasks with dependencies or meaningful progress | arbitrary grouping of a single form |

Keep navigation labels concrete and domain-based. Avoid internal service or database terminology unless users already think in those terms.

## Direct action or DropdownMenu

Show an action directly when it is:

- the page's primary action;
- a frequent row action;
- necessary to recover from the current state;
- safety-critical or time-sensitive;
- difficult to discover by inference.

Use `DropdownMenu` for low-frequency contextual actions that share an object. Group destructive actions separately and place them last.

## Select, Combobox, RadioGroup, ToggleGroup, or Command

| Need | Default |
| --- | --- |
| small mutually exclusive set visible at once | RadioGroup or ToggleGroup according to semantics |
| moderate fixed set | Select |
| searchable or large set | Combobox |
| command palette or cross-product action search | Command inside Dialog |
| independent on/off setting | Switch or Checkbox according to whether change is immediate or submitted |

Do not use a searchable Combobox for three obvious choices or a Select for hundreds of unsearchable records.

## Feedback

| Situation | Default |
| --- | --- |
| transient successful completion | Sonner toast |
| persistent page-level problem | Alert or inline error region |
| invalid field | field-level message and invalid state |
| initial loading | Skeleton matching final geometry |
| local short pending action | Spinner/pending label in the initiating control |
| long background task | durable status with progress or polling state |
| no records | Empty component with cause-appropriate guidance |

A toast must not be the only way to learn about a persistent failure or required follow-up.

## Destructive actions

Choose friction based on consequence:

1. **Reversible and low impact:** perform, show toast, offer Undo.
2. **Reversible but surprising:** short confirmation or explicit menu wording, then Undo where possible.
3. **Irreversible or broad impact:** AlertDialog naming the object and consequence.
4. **Catastrophic or account-wide:** typed confirmation, prerequisite checks, and explicit scope.

Do not use typed confirmation as a universal deletion pattern.

## Lucide icon mapping

Use a stable mapping across the product. Typical defaults:

| Meaning | Icon |
| --- | --- |
| create/add | `Plus` |
| edit | `Pencil` |
| delete | `Trash2` |
| search | `Search` |
| filter | `ListFilter` |
| settings | `Settings` |
| more actions | `Ellipsis` |
| retry/refresh | `RefreshCw` |
| copy | `Copy` |
| external destination | `ExternalLink` |
| success | `CircleCheck` |
| warning | `TriangleAlert` |
| error | `CircleX` |
| information | `Info` |

Use the project's installed Lucide package and naming conventions. Do not mix outline icon libraries without a deliberate design-system decision.
