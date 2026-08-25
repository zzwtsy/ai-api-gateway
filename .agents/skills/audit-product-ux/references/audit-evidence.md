# Audit evidence

Read this reference when evaluating runtime behavior or calibrating claims.

## Evidence levels

| Evidence | Supports | Does not establish by itself |
| --- | --- | --- |
| Requirement or product contract | Intended behavior and constraints | Delivery or runtime correctness |
| Source inspection | Structure, component choice, state wiring, likely behavior | Rendered geometry, focus behavior, browser compatibility |
| Static screenshot | One visual state at one viewport | Workflow, keyboard, transitions, responsive behavior |
| Component test | Local rendering and interaction contract | Full routing, layout, browser integration |
| Running-browser assertion | Observed behavior in the tested environment | Untested states, browsers, or viewports |
| Trace, video, or screenshot artifact | Reproducible evidence of one recorded run | Claims outside that revision and scenario |

State the source revision and dirty worktree when relevant. Never attribute uncommitted behavior solely to the recorded Commit.

## Browser checks

When runtime verification is available:

1. complete the primary workflow;
2. test relevant wide and narrow viewports;
3. use keyboard navigation through main controls;
4. exercise reachable loading, empty, invalid, success, stale, partial, and failure states;
5. inspect focus visibility and return, clipping, wrapping, scroll ownership, and document overflow;
6. verify URL, selection, refresh, Back, and recovery behavior;
7. inspect console errors that affect the workflow.

For layout claims, inspect the relevant bounding boxes, minimum usable widths, overlap, document overflow, reading and focus order, modal backdrop, background interaction, touch target size, and narrow-screen stacking. A full-page screenshot alone is insufficient.

## Finding format

Each finding states:

- **Evidence:** current source or observed runtime fact;
- **Impact:** what becomes blocked, slower, confusing, inaccessible, or risky;
- **Recommendation:** one correction at the owning layer;
- **Acceptance criterion:** an observable condition that fails if the defect returns.

Report actual commands, routes, states, browsers, viewports, artifacts, source-only conclusions, unverified states, and remaining risks.
