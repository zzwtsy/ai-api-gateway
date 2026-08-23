---
name: shadcn-product-ux
description: >-
  Use this skill when designing, reviewing, or refactoring product-style web UX with shadcn/ui and Lucide, especially dashboards, admin tools, settings, forms, tables, detail pages, and multi-step workflows. Turn requirements, screenshots, or an existing frontend into clear information architecture, predictable interaction patterns, appropriate shadcn component choices, complete UI states, accessible behavior, and implementation-ready guidance while preserving the default shadcn visual language. Do not use for isolated component installation or debugging, purely decorative marketing-site art direction, or non-web interfaces.
metadata:
  version: "1.0.0"
  scope: "product-web-ux"
---

# Shadcn Product UX

Design or improve product interfaces so users can understand the page, find the primary action, complete the task, understand system state, and recover from errors without reading documentation.

Default to the standard shadcn visual language and Lucide icons. Optimize task flow and information hierarchy before adding visual decoration.

## Scope

Use this skill for:

- product dashboards, admin tools, developer tools, settings, CRUD flows, forms, tables, detail pages, diagnostics, onboarding, and multi-step tasks;
- UX audits of screenshots, prototypes, or existing frontend code;
- information architecture, interaction design, state design, accessibility, responsive behavior, and implementation planning;
- implementation or refactoring when the project uses shadcn/ui and Lucide.

Do not use this skill as the primary workflow for:

- installing, updating, or debugging an isolated shadcn component;
- highly art-directed marketing pages whose main problem is brand expression rather than product usability;
- native mobile, desktop, game, or spatial interfaces;
- generic visual polish with no user task or product workflow.

When another specialized skill covers current shadcn APIs, repository conventions, frontend testing, or visual concept generation, compose with it rather than duplicating its instructions.

## Operating modes

Infer the mode from the request:

1. **Design** — turn requirements into an implementation-ready UX specification.
2. **Audit** — inspect an existing screen or flow and identify concrete usability defects.
3. **Refactor** — preserve behavior and information while improving hierarchy, consistency, states, and accessibility.
4. **Implement** — edit the frontend, make the workflow functional, and verify it in the browser.
5. **Focused review** — answer a narrow decision such as Dialog vs Sheet, table vs cards, or how to structure a form.

Do not force a full redesign when the user asks for a focused correction.

## Workflow

### 1. Establish the UX contract

Before choosing components, identify:

- the primary user;
- the page or flow's single main job;
- the primary action and successful outcome;
- the core objects and relationships the user must understand;
- the highest-risk mistakes or destructive actions;
- constraints from the repository, screenshots, copy, or existing product behavior.

Infer minor missing details when safe. State material assumptions instead of blocking progress with unnecessary questions.

### 2. Inspect the source of truth

For an existing product, inspect the relevant routes, components, styles, data shape, screenshots, and interaction behavior before proposing changes.

Preserve:

- the user's actual domain model and terminology;
- required fields and actions;
- stable navigation and URLs;
- accepted product behavior;
- existing project conventions that do not harm usability.

Do not invent navigation, metrics, entities, product claims, or workflows merely to fill the page.

### 3. Shape information architecture and task flow

Design from user questions rather than database tables or backend modules.

- Give each page one primary purpose.
- Keep stable business areas in primary navigation.
- Use pages, tabs, sections, and overlays according to task scope, not visual preference.
- Keep the primary action visible; place low-frequency actions in contextual menus.
- Reveal advanced configuration progressively without hiding core configuration.
- Minimize repeated decisions, manual entry, and context switching.

Read [references/component-decisions.md](references/component-decisions.md) when choosing navigation, overlays, data presentation, feedback, or destructive-action patterns.

### 4. Define the complete state model

For every important surface, design the states that can actually occur:

- initial/default;
- loading or submitting;
- populated/success;
- first-use empty;
- search or filter with no results;
- recoverable error;
- partial failure;
- disabled or unavailable with an explanation;
- permission denied when applicable;
- destructive confirmation and post-action recovery;
- narrow-screen and keyboard interaction.

Do not treat loading, empty, and error states as implementation afterthoughts.

### 5. Map the UX to shadcn primitives

Use existing shadcn components and built-in variants before custom components. Inspect `components.json`, installed components, the package manager, and current component documentation when implementation details matter.

Default rules:

- use semantic theme tokens rather than raw color utilities;
- keep the default shadcn palette, radii, borders, typography, and elevation unless the user explicitly requests a theme change;
- use layout utilities for structure, not to restyle every primitive;
- prefer tables or lists for dense, comparable data;
- use cards only for genuinely independent objects or concise summaries;
- use a full page for long or durable tasks, Sheet for contextual detail or light editing, and Dialog for short interruptive tasks;
- use AlertDialog only when explicit confirmation is justified;
- use Toast for transient completion feedback and inline Alert or field errors for persistent problems;
- keep form labels visible and place validation next to the affected field;
- keep overlay titles and accessible names even when visually hidden.

### 6. Apply Lucide consistently

Use Lucide as functional iconography, not decoration.

- Pair icons with text for unfamiliar, high-value, or destructive actions.
- Give every icon-only control an accessible name.
- Use one icon metaphor consistently for each action across the product.
- Do not use color alone to communicate status.
- Avoid adding icons to every label, metric, card, or navigation item when they do not improve recognition.
- Let the shadcn component control icon sizing when its API or styles already do so.

### 7. Produce or implement the result

For a design or audit deliverable, use [assets/ux-spec-template.md](assets/ux-spec-template.md) and omit sections that do not apply.

For implementation:

- preserve the repository's framework, routing, state, data-fetching, form, and testing conventions;
- build real interactions rather than inert mock controls;
- keep repeated UI in reusable components or explicit variants;
- preserve user input after recoverable failures;
- prevent duplicate submissions and show pending state immediately;
- avoid adding a dependency when a current shadcn primitive or small local composition is sufficient;
- use realistic existing data or clearly marked fixtures; do not present invented metrics as real.

### 8. Verify the experience

When code or a runnable prototype is available:

1. open the actual page in a browser;
2. complete the primary workflow;
3. test at least one narrow and one wide viewport;
4. use keyboard navigation through the main controls;
5. exercise loading, empty, invalid, success, and failure states where feasible;
6. inspect focus visibility, clipping, wrapping, scroll behavior, and overlay focus management;
7. compare the result against the accepted requirements or source screen.

Use [references/qa-checklist.md](references/qa-checklist.md) for a full review before handoff.

## Non-negotiable UX rules

- A user should understand where they are, what the page contains, and what to do next without guessing.
- Each page has one visually dominant primary action; secondary actions must not compete with it.
- Every asynchronous action communicates pending, success, and failure states.
- Errors explain what failed and how to recover; recoverable errors do not discard user input.
- Initial empty state and filtered-empty state are different problems and need different guidance.
- Important information cannot exist only in a tooltip, placeholder, transient toast, icon, or color.
- A disabled control either has an obvious prerequisite or explains why it is unavailable.
- Destructive friction is proportional to consequence: prefer undo for reversible actions and explicit confirmation for irreversible actions.
- Responsive design reorganizes priority and interaction; it is not merely a compressed desktop layout.
- Accessibility is part of the definition of done, not a later polish pass.

## Default visual direction

Preserve the default shadcn character:

- neutral semantic colors;
- restrained borders and shadows;
- clear typography and spacing hierarchy;
- one accent hierarchy rather than many competing colors;
- low visual noise;
- limited, purposeful motion;
- no gradients, glass effects, glow, oversized radii, or decorative color systems unless requested.

Do not confuse restraint with removing labels, descriptions, affordances, or state feedback.

## High-value gotchas

- Do not wrap the whole page, every section, and every row in nested cards. Borders and spacing often establish enough hierarchy.
- Do not turn structured, comparable records into a card grid merely because cards look modern.
- Do not hide the only important action inside an ellipsis menu.
- Do not place a long multi-section form inside a Dialog.
- Do not use Tabs for sequential steps or unrelated business areas.
- Do not use placeholder text as the only field label.
- Do not use Toast as the only record of a persistent failure.
- Do not make every deletion require typed confirmation; calibrate friction to reversibility and impact.
- Do not add helper copy that repeats the label without clarifying behavior, consequences, format, or defaults.
- Do not remove useful text in pursuit of a cleaner-looking screenshot.

## Output quality

### Design specification

Include the page goal, user flow, information hierarchy, component mapping, state model, responsive behavior, accessibility requirements, and acceptance criteria. Prefer concrete decisions over a menu of equal options.

### UX audit

Report issues by impact. For each issue include evidence, user consequence, recommended change, and a testable acceptance criterion. Separate UX defects from subjective visual preferences.

### Implementation

Deliver functional code consistent with the existing project, then report the workflow tested, states verified, responsive widths checked, accessibility checks performed, and any intentional deviations.

## Completion gate

Before finishing, confirm:

- the primary task and action are unambiguous;
- the hierarchy works without relying on decoration;
- component choices match task scope;
- all meaningful states have a design or implementation;
- keyboard and focus behavior are viable;
- the page remains usable at narrow widths;
- errors preserve context and offer recovery;
- no invented product facts were introduced;
- the result still looks and behaves like default shadcn rather than a custom theme.
