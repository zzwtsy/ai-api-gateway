# Authoring-residue rewrite examples

## Replace PR vantage with the delivered mechanism

Bad:

```text
This PR adds fallback protection after the first byte.
```

Better:

```text
After the downstream receives the first upstream byte, RouteTarget remains fixed. A later upstream error ends the current Attempt and cannot trigger fallback.
```

## Replace review process with technical basis

Bad:

```ts
// The reviewer asked us to copy the object here.
```

Better:

```ts
// Multiple requests may read a published Snapshot concurrently; freeze it before publication and expose no mutable reference afterward.
```

Do not invent a copying requirement when the real contract is a process-local read-only borrow.

## Replace change history with a present-tense counterfactual

Bad:

```ts
// This used to record Client Cancel as Provider 500.
```

Better:

```ts
// Client Cancel terminates the Request independently and does not contribute to the Provider failure rate.
```

When the Guard needs rationale:

```ts
// Without checking Client Abort before Provider classification, cancellations contaminate the Provider failure rate.
```

## Delete control-flow narration or state a sequencing contract

Bad:

```ts
// First save the Attempt, then update the Request, and finally notify subscribers.
```

Better:

```ts
// Notify subscribers only after both the Attempt and Request terminal states are readable.
```

## Replace a vague plan with the real boundary

Bad:

```ts
// This queue size should be enough for now.
```

Better:

```ts
// Retain at most 256 Observations. On overflow, drop diagnostics and mark observationStatus=incomplete without blocking the response stream.
```

When no limit has been accepted, use an owned Issue or `TODO` instead of inventing a number.

## Replace a private label with a resolvable fact

Bad:

```text
Per decision 7, the pricing snapshot is fixed when the Attempt is created.
```

Better:

```text
The pricing snapshot is fixed when the Attempt is created so later catalog changes cannot rewrite historical cost.
```

Add a Markdown link only when the corresponding committed Decision Note exists.

## Preserve legitimate runtime old and new state

Keep:

```text
The new connection accepts requests only after the old connection finishes draining.
```

Here, old and new identify concurrent runtime objects rather than repository history.

## Preserve sourced measurement rationale

Keep:

```text
The batch limit is 500 records; measurements on the target hardware keep the transaction below 200 ms at that size.
```

Record the measurement environment when it affects the conclusion.

## Preserve real Decision alternatives

Keep in a Decision Note:

```text
Alternative considered: rebuild requests through a Provider SDK. Rejected because it cannot preserve unknown fields or raw Streaming bytes with the same guarantees.
```

Do not copy the alternative into every Handler comment. Keep only the local contract and a resolvable link where needed.
