# [Feature or Page] UX Specification

Use this template for a new design, redesign, or audit. Omit sections that do not apply; do not fill gaps with invented product facts.

## 1. UX contract

- **Primary user:**
- **Main job:**
- **Successful outcome:**
- **Primary action:**
- **Core objects:**
- **Material constraints or assumptions:**

## 2. Information architecture

Describe the page's place in navigation, its child views, and the relationship between core objects.

```text
[Navigation or page hierarchy]
```

## 3. Primary workflow

1. [User action]
2. [System response]
3. [Next decision]
4. [Successful outcome]

Include recovery branches only where they materially affect the design.

## 4. Page anatomy

```text
Page header
├── [title/context]
└── [primary action]

[Controls or task context]

Primary content
└── [table/list/form/detail/workspace]
```

For each region, explain why it exists and what decision it supports.

## 5. Component mapping

| Need | shadcn component or pattern | Rationale |
| --- | --- | --- |
| [need] | [component] | [why this fits the task] |

## 6. State model

| State | User sees | Available action | Recovery or transition |
| --- | --- | --- | --- |
| Loading | | | |
| Populated | | | |
| First-use empty | | | |
| Filtered empty | | | |
| Invalid | | | |
| Error | | | |
| Success | | | |
| Disabled/permission | | | |

## 7. Interaction rules

- [Primary and secondary action behavior]
- [Overlay behavior and focus return]
- [Pending and duplicate-submission behavior]
- [Destructive action and undo/confirmation]
- [URL, selection, filter, or pagination persistence]

## 8. Content and terminology

- **Page title:**
- **Primary action label:**
- **Empty-state heading and guidance:**
- **Error guidance:**
- **Terms that must remain consistent:**

Avoid placeholder-only labels and generic messages such as “Operation failed.”

## 9. Responsive behavior

- **Wide:**
- **Medium:**
- **Narrow:**
- **Table/code overflow:**
- **Navigation/filter adaptation:**

## 10. Accessibility requirements

- [Keyboard path]
- [Focus management]
- [Accessible names]
- [Validation association]
- [Status communication beyond color]
- [Reduced motion if applicable]

## 11. Acceptance criteria

- [ ] The user can identify the page and primary action without instruction.
- [ ] The primary workflow completes using mouse and keyboard.
- [ ] Loading, empty, error, and success states are defined.
- [ ] Recoverable failure preserves context and user input.
- [ ] Narrow-screen behavior preserves the main task.
- [ ] Default shadcn visual language and semantic tokens are preserved.
- [ ] No unverified product facts or metrics were introduced.

## Audit findings variant

For an audit, replace sections 3–6 with findings in this format:

### [Severity] [Finding title]

- **Evidence:** [observable behavior or layout]
- **User impact:** [what becomes slower, confusing, risky, or inaccessible]
- **Recommendation:** [specific change]
- **Acceptance criterion:** [testable result]
