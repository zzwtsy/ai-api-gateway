# Product UX QA Checklist

Use this before handing off an implemented page, prototype, or high-fidelity specification. Mark only checks that apply.

## Purpose and hierarchy

- [ ] The page has one clear primary job.
- [ ] The title and supporting context explain where the user is.
- [ ] One primary action is visually dominant and easy to find.
- [ ] Secondary and destructive actions do not compete with the primary action.
- [ ] The content order follows the user's decision process.
- [ ] Important information is not hidden solely for visual cleanliness.

## Information architecture

- [ ] Primary navigation contains stable business areas rather than temporary actions.
- [ ] Tabs represent peer views of the same context.
- [ ] Sequential work uses ordered steps rather than tabs.
- [ ] Advanced settings are discoverable but do not obscure the core path.
- [ ] Existing URLs, terminology, and object relationships remain coherent.

## Component fit

- [ ] Tables are used for dense comparison; cards are used only for real independent units.
- [ ] Long or durable work uses a page instead of a modal.
- [ ] Sheet, Dialog, Drawer, and AlertDialog match the task's scope and consequence.
- [ ] Frequently used actions are visible rather than buried in menus.
- [ ] The interface uses existing shadcn components and built-in variants where practical.
- [ ] Semantic tokens preserve default light and dark theme behavior.

## States and feedback

- [ ] Initial loading has a stable placeholder or clear pending state.
- [ ] First-use empty state explains the object and next action.
- [ ] Filtered-empty state offers to clear or change conditions.
- [ ] Submitting prevents accidental duplicate actions.
- [ ] Success is reflected in durable page state and, where useful, a toast.
- [ ] Recoverable failures preserve user input and context.
- [ ] Partial failure does not erase successfully loaded content.
- [ ] Disabled controls have an obvious prerequisite or explanation.
- [ ] Permission-denied state does not offer actions the user cannot complete.

## Forms

- [ ] Every field has a persistent label.
- [ ] Help text explains non-obvious format, defaults, behavior, or consequences.
- [ ] Validation is associated with and displayed near the affected field.
- [ ] Required and optional status is clear.
- [ ] Constrained values use constrained controls.
- [ ] Save and cancel actions remain predictable throughout the product.
- [ ] Leaving with meaningful unsaved work is handled deliberately.
- [ ] Destructive settings are separated from routine fields.

## Destructive actions

- [ ] Confirmation friction matches impact and reversibility.
- [ ] The confirmation names the affected object and scope.
- [ ] Undo is offered for low-risk reversible actions when feasible.
- [ ] Destructive actions are separated from routine menu actions.
- [ ] The post-delete focus and navigation state remain valid.

## Lucide and semantics

- [ ] Icon-only controls have accessible names.
- [ ] Unfamiliar or destructive actions include visible text.
- [ ] The same action uses the same icon metaphor across the product.
- [ ] Icons support meaning rather than decorate every label.
- [ ] Status is communicated by text or icon as well as color.

## Keyboard and accessibility

- [ ] The primary workflow is keyboard-operable.
- [ ] Focus order follows visual and task order.
- [ ] Focus indicators are clearly visible.
- [ ] Opening and closing overlays manages focus correctly.
- [ ] Headings, landmarks, labels, and buttons use appropriate semantics.
- [ ] Errors are announced or associated with controls where applicable.
- [ ] Tooltip content is not the sole accessible name or sole source of critical information.
- [ ] Nonessential motion respects reduced-motion preferences.

## Responsive behavior

- [ ] The primary task remains available at narrow widths.
- [ ] Controls do not clip, overlap, or wrap ambiguously.
- [ ] Tap targets remain usable.
- [ ] Forms use a clear single-column reading order when needed.
- [ ] Tables and code blocks have deliberate overflow behavior.
- [ ] Navigation and filters move into an appropriate narrow-screen pattern.
- [ ] Content priority changes intentionally instead of merely shrinking.

## Browser verification

- [ ] The primary workflow was completed in the running product.
- [ ] At least one wide and one narrow viewport were checked.
- [ ] Loading, empty, invalid, success, and failure states were exercised where feasible.
- [ ] No console error blocks the workflow.
- [ ] No invented product fact, metric, or claim appears as real data.
- [ ] The final surface still reads as default shadcn rather than an unrequested custom theme.
