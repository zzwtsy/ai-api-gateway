# UI copy review examples

These examples demonstrate the decision process. Adapt them to the actual page task and state instead of treating the wording as a template.

## Delete an architecture explainer from an operational overview

Candidate:

```text
Gateway Key → same-protocol routing → upstream Endpoint → streaming response → Request / Attempt
```

Decision: `delete` or `move` to onboarding or product documentation when the overview already shows request status, latency, and navigation. The chain may be a correct contract, but it does not change the routine monitoring task.

Keep a concise version only when the page is explicitly teaching first-time integration and the explanation leads to the next setup action.

## Remove repeated resource descriptions

Candidate sequence:

```text
Page: Issue an independent Gateway Client Key for each Harness instance.
Card: Control-plane login and Gateway Client Key use separate identity boundaries.
Inspector: Client details and Gateway Key lifecycle.
```

Decision: keep one task description if needed, delete the Card restatement, and use the Inspector subtitle only for identity or comparison context. Put lifecycle consequences beside Rotate or Revoke.

## Consolidate one-time Secret copy

Weak distribution:

```text
The full Key is shown once.
The existing full Key cannot be recovered.
The template contains no Secret.
Rotate the Key to generate a complete configuration.
```

Decision: `shorten` and `move`. Show the non-recoverable consequence in the one-time reveal before dismissal. Beside Rotate, explain that rotation creates a new Key and state the old Key overlap window. A static template may simply identify its placeholder.

Do not delete the non-recoverable consequence or overlap timing; both affect user decisions.

## Move deployment instructions out of ordinary login UI

Candidate:

```text
Production uses Better Auth sessions. Development may use a restricted control-plane token.
Run `pnpm db:bootstrap` after the first deployment.
```

Decision: `move` framework and CLI details to deployment documentation or an initialization-only operational state. Ordinary login UI should identify the credential requested and provide recovery for invalid credentials.

## Replace delivery-status copy with a precise state

Candidate:

```text
Streaming, Usage, and field compatibility have not been fully tested yet.
```

Decision: delivery progress is not product UI. Delete it, or replace it with a precise unsupported or unknown state only when that state changes whether the user should run a compatibility Probe. Put cost or side-effect warnings next to the Probe action.

## Preserve a consequential domain distinction

Candidate:

```text
No Usage data was returned; this is not the same as zero tokens.
```

Decision: `keep` when the surrounding metric would otherwise display an ambiguous zero or dash. The distinction prevents an incorrect cost or health judgment.

## Keep empty and error states action-oriented

Weak empty state:

```text
This directory stores all configured upstream provider metadata.
```

Better:

```text
No connections yet. Add a connection to configure the first upstream Endpoint.
```

Weak error state:

```text
Something went wrong.
```

Better:

```text
Connections could not be loaded. The last successful data remains visible. Retry.
```

State only facts the implementation can verify; do not claim cached data remains visible when it does not.

## Give icon-only controls an actionable name

Weak:

```tsx
<Button aria-label="X"><X /></Button>
```

Better:

```tsx
<Button aria-label="关闭客户端详情"><X /></Button>
```

The accessible name describes the action and object rather than the icon shape.
