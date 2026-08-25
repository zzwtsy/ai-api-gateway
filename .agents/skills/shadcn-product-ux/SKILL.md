---
name: shadcn-product-ux
description: >-
  Design or audit task-focused product web UX in applications that use shadcn/ui. Use when a request requires information architecture, interaction-pattern decisions, state lifecycles, accessibility, responsive behavior, or implementation-ready UX guidance. Do not use for isolated shadcn installation, upgrades, or debugging; generic React fixes; decorative marketing art direction; or non-web interfaces.
metadata:
  version: "2.0.0"
  scope: "product-web-ux"
---

# Product UX for shadcn applications

Decide the user's task, information structure, interaction model, and state ownership before mapping the result to shadcn primitives. shadcn is an implementation layer, not the UX method.

## Authority and scope

Use evidence in this order:

1. explicit user goals and constraints;
2. the product's current source of truth, domain model, routes, and accepted behavior;
3. observed runtime behavior and trustworthy evidence;
4. this skill's defaults when the product has not made a decision.

Honor an established design system. Preserve default shadcn styling only when the product has adopted it or no stronger visual direction exists.

Choose the operating mode from the request:

- **Focused decision:** resolve one interaction or information-architecture choice.
- **Design:** produce an implementation-ready UX contract.
- **Audit:** identify evidence-backed defects and acceptance criteria.
- **Refactor or implement:** change code only when the user explicitly requests changes.

Audit, review, explanation, and recommendation requests are read-only. Do not turn them into implementation work.

## Workflow

### 1. Establish the task and evidence boundary

Identify:

- primary user and main job;
- successful outcome and primary action;
- core objects and relationships;
- costly mistakes, destructive actions, and sensitive data;
- stable URLs, terminology, and accepted behavior;
- available evidence: requirements, source, screenshots, prototype, or running product.

Distinguish confirmed behavior, source-level inference, visual observation, and unverified assumption. A screenshot does not prove interaction, keyboard behavior, loading states, or responsive transitions.

### 2. Shape the information and task flow

Organize the interface around user decisions rather than database tables or backend modules. Give each page one main job, keep the primary action visible, and preserve useful context across recovery and navigation.

Read [UX principles](references/ux-principles.md) for page hierarchy, dense data, forms, progressive disclosure, and content decisions.

### 3. Define state ownership and lifecycle

Decide which state belongs to the URL, server cache, unsaved form, background job, or transient feedback. Define loading, populated, empty, invalid, pending, success, recoverable failure, partial failure, disabled, permission, and destructive states only where they can occur.

Read [state lifecycles](references/state-lifecycles.md) when the flow uses asynchronous work, URL-restorable selection, overlays, background jobs, optimistic updates, cancellation, or recoverable forms.

### 4. Choose interaction patterns

Choose modality, persistence, and spatial structure before choosing a component. Consider task frequency, duration, background comparison, deep-linking, content complexity, and narrow-screen behavior.

Read [interaction decisions](references/interaction-decisions.md) whenever selecting among a page, persistent inspector, inline detail, Dialog, Sheet, Drawer, Popover, table, list, cards, navigation, or action placement.

### 5. Map the decision to the product's UI system

When implementation details matter, inspect `components.json`, installed primitives, package versions, current component documentation, and repository conventions.

- Prefer existing primitives and explicit local compositions over parallel component systems.
- Use semantic theme tokens; do not encode product meaning in raw colors.
- Preserve visible labels, useful descriptions, focus affordances, and state feedback.
- Use Lucide icons functionally and consistently; icon-only controls need accessible names.
- Do not add dependencies when an existing primitive or small composition is sufficient.

### 6. Deliver and verify at the requested depth

For audits and implementation handoffs, read [audit and evidence](references/audit-evidence.md). Verify only claims supported by the available environment. When a runnable product is available and the request includes implementation or runtime validation, exercise the primary workflow in a browser at relevant wide and narrow viewports.

Do not claim browser, accessibility, responsive, or visual-regression verification from type checking, component rendering, source inspection, or screenshots alone.

## Non-negotiable decisions

- Do not choose a component because content should appear on a particular edge; choose modality and state ownership first.
- A modal Sheet visually preserves the page but does not preserve interactive background context. Use a persistent inspector when users must compare or operate on the background.
- Do not make Sheet the default record-detail pattern. High-frequency comparison belongs in a persistent inspector or Master-Detail layout; durable multi-section details belong on a page.
- Do not use one overlay as a state-machine shell for unrelated create, detail, confirmation, secret, and background-job states.
- Do not put long multi-section work in a Dialog.
- Do not nest modal workflows when a sequential state, inline confirmation, or page transition can express the task.
- Do not hide the only primary or recovery action in a menu.
- Do not turn comparable records into cards solely for visual novelty.
- Do not treat loading, first-use empty, filtered empty, error, `unknown`, and zero as interchangeable.
- Recoverable failures preserve user input and successful surrounding content.
- Responsive behavior changes priority and structure; it is not a uniformly shrunken desktop screen.

## Deliverables

Match the output to the request rather than filling a universal template.

### Focused decision

State the decision, evidence, material tradeoff, rejected alternative, and testable acceptance criterion.

### UX audit

Order findings by impact. Each finding contains observable evidence, user consequence, recommendation, and acceptance criterion. Separate defects from subjective preferences and state what was not verified.

### Design contract

Include the page or flow goal, information hierarchy, primary workflow, interaction pattern, state ownership, responsive behavior, accessibility requirements, and acceptance criteria. Add component mapping only after those decisions.

### Implementation

Preserve product behavior and repository conventions, implement real interactions, and report actual checks, viewports, states, and remaining gaps. Never imply that the skill itself grants permission to modify code or external systems.

## Completion gate

Before finishing, confirm that:

- the main job, successful outcome, and primary action are unambiguous;
- interaction patterns match modality, frequency, durability, and comparison needs;
- state owners and recovery transitions are defined;
- narrow-screen and keyboard behavior remain viable;
- claims do not exceed the available evidence;
- the result follows the product's design system without inventing product facts.
