---
name: audit-product-ux
description: Audit an existing task-focused product Web interface for evidence-backed information-architecture, interaction, state-lifecycle, accessibility, responsive, and shadcn/ui usage defects. Use for review, assessment, or gap analysis. This Skill is read-only and does not design a replacement, implement code, install components, or review wording in isolation.
metadata:
  version: "1.0.0"
  scope: "product-web-ux-audit"
---

# Audit product UX

Identify defects that materially impair the user's task, recovery, accessibility, correct interpretation, or safety. Separate observable defects from visual preference and keep every conclusion within the available evidence.

## Authority and boundary

Use explicit user goals, product contracts, source, current runtime behavior, and recorded evidence. A screenshot proves one rendered state; source suggests behavior; only a running browser can prove the exercised interaction, viewport, and focus behavior.

This workflow is always read-only. Do not edit files, install components, create a redesign, or turn a structural audit into isolated wording cleanup.

## Workflow

1. Confirm the audited routes, tasks, states, viewports, revision, worktree status, and available evidence.
2. Identify the main job, success outcome, primary action, core objects, costly mistakes, sensitive data, and recovery expectations.
3. Read owning components, routes, state lifecycles, tests, design tokens, `components.json`, installed primitives, and current product UX contracts.
4. Exercise the primary workflow in a browser when runtime verification is in scope and available. Read [audit evidence](references/audit-evidence.md) for evidence levels, viewport checks, focus, geometry, state recovery, and reporting limits.
5. Check information hierarchy, action discoverability, modality, state ownership, URL recovery, loading/empty/error/stale distinctions, responsive priority, keyboard flow, accessible naming, Secret handling, and semantic token use.
6. Order findings by user impact. For each, provide observable evidence, consequence, owning-layer recommendation, and a testable acceptance criterion.
7. Report source-only findings, browser-observed findings, unverified states, actual commands, evidence paths, and remaining risks separately.

## Finding severity

- **Critical:** blocks the primary task, exposes sensitive data, or causes destructive loss.
- **High:** materially impairs a frequent task, recovery, accessibility, or correct interpretation.
- **Medium:** creates recurring friction, ambiguity, or inconsistent state behavior.
- **Low:** limited polish or consistency issue with small task impact.

Do not assign severity from aesthetic dislike. If evidence cannot establish a defect, label it as an assumption or verification gap rather than a finding.

## Completion gate

Before finishing, confirm that every finding maps to a user consequence and failing acceptance criterion; evidence type and limits are explicit; defects and preferences are separated; and no browser, accessibility, responsive, or visual-regression claim exceeds what was actually exercised.
