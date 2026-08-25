---
name: record-ui-evidence
description: Record and verify Playwright assertions, screenshots, traces, videos, or GIF evidence for an ai-api-gateway UI or browser-flow change from an exact commit and one isolated run. Use real Gateway and Web entrypoints with a Mock Provider by default. Do not design or repair the UI.
---

# Record UI evidence

Browser evidence must exercise the entrypoint a user actually reaches. Start the real Gateway and Web application and mock only the external Provider by default. Verify Provider receipt, client output, and Request/Attempt state instead of capturing only the system's own success indication.

A GIF is optional presentation, not a substitute for Playwright assertions, traces, or artifact checks. Contributors without live Provider credentials must be able to run the keyless golden path.

## Sources of truth

- [End-to-end test rules](../../../apps/e2e/AGENTS.md)
- [Playwright configuration](../../../apps/e2e/playwright.config.ts)
- [Quality gates and evidence](../../../docs/conventions/quality-gates-and-evidence.md)
- [Web product UX convention](../../../docs/conventions/web-product-ux.md)

## Evidence selection

| Change | Primary evidence | Optional presentation |
| --- | --- | --- |
| Static layout, density, responsive behavior | Browser assertions and screenshots at 1280px and 1024px | Before/after images |
| Forms, navigation, filter recovery | Playwright test plus trace | Short video or GIF |
| Streaming, pending, error recovery | State assertions plus trace or video | GIF |
| Request detail, Attempt, diagnosis | Browser assertions plus Admin API or database verification | Storyboard |
| Release entrypoint or static assets | Built-artifact browser test | Screenshot or video |
| Real Provider compatibility | Optional live Provider smoke | Explicitly labeled live demonstration |

A screenshot proves one state; a GIF or video demonstrates one path. A behavioral contract still requires assertions that can fail.

## Fix the source identity

Read the full commit and worktree status before and after recording. Discard the entire temporary run if either identity changes:

```bash
git status --short --branch
git rev-parse HEAD
```

Formal PR evidence should come from a clean worktree. Evidence for uncommitted work must record `dirty: true` and must not attribute worktree behavior to the commit. Every frame, trace, video, and external check in one scenario must come from the same server, Mock Provider, storage root, browser context, and run. Restart from fresh state after failure; never splice different runs.

Use an isolated browser context. Do not read the user's cookies, extensions, Local Storage, or session, and do not override Git identity through environment variables.

## Exercise real entrypoints

```bash
pnpm --filter @aigw/e2e test -- golden-path.spec.ts
pnpm check:e2e
```

When the claim concerns compiled output:

```bash
pnpm build
AIGW_E2E_USE_BUILD=1 pnpm --filter @aigw/e2e test -- golden-path.spec.ts
pnpm check:artifact
```

Do not replace a real entrypoint with test-only DOM injection, fabricated system events, or an internal component mount. The external Provider mock is part of the official keyless evidence path.

## Workflow

1. Define one falsifiable claim, target state, entrypoint, viewport, and evidence form.
2. Fix Git identity and an isolated runtime environment.
3. Complete the scenario through the real entrypoint. Wait on a unique DOM or external state, not a fixed delay.
4. Verify Provider receipt, client output, Request/Attempt state, URL recovery, or the artifact entrypoint. Read [Provider and artifact evidence](references/provider-and-artifact-evidence.md) for complex external checks or a live Provider.
5. Read [Presentation and metadata](references/presentation-and-metadata.md) when producing a storyboard, GIF, video, or metadata file.
6. Inspect the final evidence for order, legibility, state, Secrets, and personal data.
7. Recheck Git identity and worktree state. Report what the evidence proves and what remains unverified.

## Boundary and safety

- Do not design, repair, or refactor the UI; record the defect and stop scope expansion.
- Do not read, print, capture, or persist full keys, cookies, user prompts, real upstream responses, or personal data.
- Do not install recording or encoding dependencies automatically.
- Do not upload evidence, modify a PR, or commit large media to a durable branch automatically.
- Typechecks, lint, unit tests, and screenshots do not prove real browser interaction.

This workflow is adapted from DeepSeek Harness `record-browser-gif` for this repository's keyless Mock Provider path. See [Third-Party Notices](../THIRD_PARTY_NOTICES.md) for licensing.
