---
name: design-product-ux
description: Design task-focused product Web UX for shadcn/ui applications when the request needs information architecture, interaction-pattern decisions, state ownership, responsive behavior, accessibility requirements, or an implementation-ready UX contract. Do not use for audits, code implementation, isolated component installation, generic React fixes, or decorative marketing art direction.
metadata:
  version: "1.0.0"
  scope: "product-web-ux-design"
---

# Design product UX

Decide the user's task, information structure, interaction model, and state ownership before mapping the result to shadcn primitives. The deliverable is a testable design contract, not source changes or a review of the current interface.

## Authority and boundary

Use evidence in this order: explicit user goals and constraints; current product contracts, routes, and domain model; observed behavior; then this Skill's defaults. Distinguish confirmed facts, source inference, runtime observation, and assumptions.

Do not edit code, install components, rewrite copy, or report audit findings. When current implementation evidence is incomplete, state the assumption that the design depends on.

## Workflow

1. Identify the primary user, main job, success outcome, core objects, primary action, costly mistakes, sensitive data, stable URLs, terminology, and accepted behavior.
2. Shape page hierarchy and task flow around user decisions rather than service topology or database tables. Read [UX principles](references/ux-principles.md) for dense data, forms, progressive disclosure, and content hierarchy.
3. Assign each state to one owner and specify reachable transitions, persistence, recovery, URL, focus, and selection. Read [state lifecycles](references/state-lifecycles.md) for asynchronous work, overlays, background jobs, destructive actions, and responsive presentation.
4. Choose modality and spatial pattern from frequency, duration, background comparison, recoverability, complexity, and device behavior. Read [interaction decisions](references/interaction-decisions.md) before selecting page, inspector, inline detail, Dialog, Sheet, Drawer, Popover, table, list, cards, navigation, or action placement.
5. Inspect `components.json`, installed primitives, semantic tokens, and repository conventions only when component mapping is part of the requested handoff.
6. Deliver the smallest contract that makes implementation and verification unambiguous.

## Non-negotiable decisions

- Choose modality and state ownership before choosing a component or screen edge.
- A modal Sheet does not preserve interactive background context; use a persistent pattern when comparison requires it.
- Keep one modal task coherent; do not use one overlay for unrelated create, detail, secret, confirmation, and progress states.
- Durable multi-section work belongs on a page; long work does not belong in a Dialog.
- Do not hide the only primary, recovery, or safety-critical action in a menu.
- Do not collapse loading, first-use empty, filtered empty, error, stale, `unknown`, and zero into one state.
- Recoverable failures preserve input and successful surrounding content.
- Responsive behavior reprioritizes structure; it is not a uniformly shrunken desktop layout.

## Deliverable

Include the page or flow goal, information hierarchy, primary workflow, interaction pattern with material tradeoff, state owners and transitions, responsive behavior, accessibility requirements, sensitive-data constraints, and testable acceptance criteria. Add shadcn component mapping only after those decisions.
