---
name: add-control-feature
description: Add or modify a strict Hono OpenAPI control-plane feature in ai-api-gateway through the repository's golden path. Use for a control-plane vertical slice; do not use for data-plane proxy behavior or UI-only work.
---

# Add a control-plane feature

Read first:

1. `apps/gateway/src/control-plane/AGENTS.md`
2. `docs/conventions/http-contracts-and-route-definition.md`
3. The nearest existing feature

Implement an explicit vertical slice:

```text
schemas.ts
routes.ts
handlers.ts
service.ts or contracts.ts when justified
index.ts
co-located unit tests
```

Requirements:

- Use `createRoute` with an SDK-friendly, globally unique `operationId`.
- Export `typeof route`; handlers use `AppRouteHandler<RouteType>`.
- Keep database I/O and long callbacks out of `routes.ts`.
- Bind routes and handlers explicitly in `index.ts`.
- Register the feature explicitly; do not add filesystem scanning.
- Write OpenAPI `summary`, `description`, and response descriptions in Simplified Chinese.
- Keep tags, `operationId`, schema names, field names, and Error Codes in English.
- Update the OpenAPI contract tests and regenerate the Web schema.
- Run `pnpm check:control` and report the exact result.
