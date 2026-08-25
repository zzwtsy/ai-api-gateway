# Documentation review examples

Use these examples to calibrate “complete contract before brevity” and “one fact, one owner.” Verify every technical fact against current source before adapting it; the wording is not a project conclusion.

## Comment: replace control-flow narration with a sequencing contract

Weak:

```ts
// First write the Attempt, then update the Request, and finally notify listeners.
```

Better:

```ts
// Publish the terminal Request state only after the Attempt is durable; otherwise detail readers can observe a Request whose Attempt does not exist.
```

The first comment paraphrases the code. The second explains the non-interchangeable order and its consequence. When writing an actual project comment, follow the owning surface's language convention.

## Comment: replace self-defense with ownership evidence

Weak:

```ts
// This assertion is safe because nothing can fail here.
```

Better:

```ts
// The route compiler is the sole constructor and validates every protected field before publishing the snapshot.
```

Delete the entire comment when code and types already make the sole construction path obvious.

## Data plane: preserve a negative guarantee

Weak:

```text
The Gateway tries to preserve upstream responses.
```

Better:

```text
The Gateway forwards upstream responses within the ingress protocol. Unless a documented Gateway Patch applies, it neither reconstructs SSE events nor removes unknown Provider fields.
```

“Tries to” discards the falsifiable contract.

## State: do not rewrite `unknown` as `0`

Weak:

```text
Display cost as 0 when no price is available.
```

Better:

```text
Cost is `unknown` when no verifiable price exists; display `0` only when the calculated result is explicitly zero.
```

## One fact, one owner

Weak: a Feature document manually lists every API field, database column, and frontend TypeScript type.

Better: the Feature document explains user semantics and links to the `operationId`, Drizzle schema or migration, and generated API type. Field-level facts remain with their owners.

## Separate Decisions from current facts

Weak:

```text
We decided in 2026 to use a monorepo, so the current directory layout is...
```

Better:

- Architecture describes current directories and dependencies in the present tense.
- The Decision records why the monorepo was chosen, the alternatives considered, and its costs.
- Architecture links the Decision instead of copying its history.

## Test comment: explain indirect observation

Weak:

```ts
// Click the first row and wait for details.
```

Better:

```ts
// Enter details from the request list so this scenario also exercises URL recovery and the generated client's real call path.
```

## Diagnostic: name the subject, rule, and correction

Weak:

```text
Invalid configuration.
```

Better:

```text
RouteTarget `route-1` uses `anthropic-messages` and cannot serve the `openai-chat` ingress; select a target with the same protocol.
```

The project-facing diagnostic should be rendered in Simplified Chinese while retaining stable English Error Codes and protocol identifiers.

## Remove authoring process from current facts

Weak:

```text
The previous review asked us to move Retry here.
```

Better:

```text
The Route Resolver owns Retry decisions before the first downstream byte; Transport does not own fallback policy.
```

When the ownership choice needs durable rationale, link the owning Decision.
