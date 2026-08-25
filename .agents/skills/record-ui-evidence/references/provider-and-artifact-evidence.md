# Provider and artifact evidence

Read this reference when the claim depends on an external effect, compiled entrypoint, or live Provider compatibility.

## External-world verification

Check the surfaces relevant to the scenario:

- headers, query, and body received by the Mock Provider;
- bytes or structure received by the client;
- the Request and every Attempt in the Admin API or database;
- RouteTarget, Credential ID, Snapshot Version, Error, Usage, Cost, and Observation state;
- whether client cancellation terminates upstream work;
- URL filters, details, refresh, and Back behavior;
- whether sockets, timers, and writes become quiescent after shutdown.

A Toast, table row, or self-reported success message does not prove these effects.

## Artifact entrypoint

Development success does not prove a release entrypoint. When the claim concerns compiled output, use the project's build mode and artifact Gate, and record the actual static-resource, route, API, browser, and process entrypoints. Do not substitute Dev Server results for Dist, plain Node, or Docker evidence.

## Live Provider

A live smoke is optional evidence. Run one only when the user explicitly requests it and credentials can be injected safely. Never read, display, record, or capture full credentials, real prompts, or upstream responses. Label the evidence `Live` and record Provider, model, minimal claim, and material that cannot be published. Without credentials, use the keyless Mock Provider path; absence of a live smoke is not an ordinary-contributor failure.
