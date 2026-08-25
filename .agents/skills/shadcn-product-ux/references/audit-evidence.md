# Audit and evidence

Read this reference for UX audits, implementation verification, and handoff claims.

## Establish the evidence level

| Evidence | Supports | Does not establish by itself |
| --- | --- | --- |
| Requirements or product contract | Intended behavior and constraints | Delivery or runtime correctness |
| Source inspection | Structure, component choice, state wiring, likely behavior | Rendered geometry, focus behavior, browser compatibility |
| Static screenshot | One visual state at one viewport | Workflow, loading, keyboard, transitions, responsive behavior |
| Component test | Local rendering and interaction contract | Full routing, layout, browser integration |
| Running-browser assertion | Observed behavior in the tested environment | Untested states, browsers, or viewports |
| Trace, video, or screenshot artifact | Reproducible evidence of a recorded run | Claims outside its source state and scenario |

State the source revision and whether the worktree is dirty when that matters. Never attribute uncommitted behavior solely to the recorded commit.

## Audit findings

Order findings by user impact:

- **Critical:** prevents the primary task, exposes sensitive data, or causes destructive loss.
- **High:** materially impairs a frequent task, recovery, accessibility, or correct interpretation.
- **Medium:** adds recurring friction, ambiguity, or inconsistent behavior.
- **Low:** limited polish or consistency issue with small task impact.

Each finding contains:

- **Evidence:** observable source or runtime fact;
- **Impact:** what becomes slower, confusing, inaccessible, or risky;
- **Recommendation:** one concrete correction at the owning layer;
- **Acceptance criterion:** a condition that can fail when the defect returns.

Separate defects from visual preferences. Do not assign severity from aesthetic dislike alone.

## Browser verification

When a runnable product is available and runtime verification is in scope:

1. complete the primary workflow;
2. test relevant wide and narrow viewports;
3. use keyboard navigation through the main controls;
4. exercise reachable loading, empty, invalid, success, and failure states;
5. inspect focus visibility and return, clipping, wrapping, scroll ownership, and document overflow;
6. verify URL, selection, and recovery behavior;
7. inspect console errors that affect the workflow.

For layout changes, compare meaningful region geometry rather than relying only on a full-page screenshot. Depending on the claim, assert:

- panel and content bounding boxes;
- minimum usable widths;
- overlap and document-level overflow;
- reading and focus order;
- modal backdrop and background interaction;
- stable placement while switching records;
- touch target size and narrow-screen stacking.

## Handoff

Report:

- actual commands and results;
- workflows, states, browsers, and viewports verified;
- evidence paths when artifacts were recorded;
- source-only conclusions;
- unverified states and remaining risks.

Type checking, linting, build success, or unit tests do not prove visual or end-to-end behavior. A screenshot proves only the captured state. Do not use confident completion language beyond the evidence.
