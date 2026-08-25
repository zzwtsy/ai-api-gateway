---
status: generated
last_reviewed_at: 2026-08-23
language: zh-CN
---

<!-- GENERATED FILE. DO NOT EDIT. -->
<!-- Source: current TypeScript import graph. Run `pnpm docs:module-graph`. -->

# 当前模块依赖图

本文件由生产源码中的静态 Import 自动生成，用于发现实际依赖方向与架构文档漂移。它描述当前事实，不替代 `eslint-plugin-boundaries` 的允许矩阵。

## Gateway 模块依赖

```mermaid
flowchart LR
  n_617070["app"]
  n_636f6d6d616e6473["commands"]
  n_636f6e666967["config"]
  n_636f6e74726f6c2d706c616e65["control-plane"]
  n_636f6e74726f6c3a636c69656e7473["control:clients"]
  n_636f6e74726f6c3a636f6e6e656374696f6e73["control:connections"]
  n_636f6e74726f6c3a6865616c7468["control:health"]
  n_636f6e74726f6c3a6d6f64656c73["control:models"]
  n_636f6e74726f6c3a7265717565737473["control:requests"]
  n_636f7265["core"]
  n_646174612d706c616e65["data-plane"]
  n_6462["db"]
  n_656e747279["entry"]
  n_617070 --> n_636f6e666967
  n_617070 --> n_636f6e74726f6c2d706c616e65
  n_617070 --> n_636f6e74726f6c3a636c69656e7473
  n_617070 --> n_636f6e74726f6c3a636f6e6e656374696f6e73
  n_617070 --> n_636f6e74726f6c3a6d6f64656c73
  n_617070 --> n_636f7265
  n_617070 --> n_646174612d706c616e65
  n_617070 --> n_6462
  n_636f6d6d616e6473 --> n_617070
  n_636f6d6d616e6473 --> n_636f6e666967
  n_636f6d6d616e6473 --> n_636f6e74726f6c2d706c616e65
  n_636f6d6d616e6473 --> n_636f7265
  n_636f6d6d616e6473 --> n_6462
  n_636f6e74726f6c2d706c616e65 --> n_636f6e666967
  n_636f6e74726f6c2d706c616e65 --> n_636f6e74726f6c3a636c69656e7473
  n_636f6e74726f6c2d706c616e65 --> n_636f6e74726f6c3a636f6e6e656374696f6e73
  n_636f6e74726f6c2d706c616e65 --> n_636f6e74726f6c3a6865616c7468
  n_636f6e74726f6c2d706c616e65 --> n_636f6e74726f6c3a6d6f64656c73
  n_636f6e74726f6c2d706c616e65 --> n_636f6e74726f6c3a7265717565737473
  n_636f6e74726f6c2d706c616e65 --> n_636f7265
  n_636f6e74726f6c3a636c69656e7473 --> n_636f6e74726f6c2d706c616e65
  n_636f6e74726f6c3a636c69656e7473 --> n_636f7265
  n_636f6e74726f6c3a636f6e6e656374696f6e73 --> n_636f6e74726f6c2d706c616e65
  n_636f6e74726f6c3a636f6e6e656374696f6e73 --> n_636f7265
  n_636f6e74726f6c3a6865616c7468 --> n_636f6e74726f6c2d706c616e65
  n_636f6e74726f6c3a6d6f64656c73 --> n_636f6e74726f6c2d706c616e65
  n_636f6e74726f6c3a6d6f64656c73 --> n_636f7265
  n_636f6e74726f6c3a7265717565737473 --> n_636f6e74726f6c2d706c616e65
  n_636f6e74726f6c3a7265717565737473 --> n_636f7265
  n_636f7265 --> n_636f6e666967
  n_646174612d706c616e65 --> n_636f6e666967
  n_646174612d706c616e65 --> n_636f7265
  n_6462 --> n_636f7265
  n_656e747279 --> n_617070
```

| From | To | 代表性 Import |
| --- | --- | --- |
| `app` | `config` | `apps/gateway/src/app/adapters/postgres-bootstrap-configuration.ts → apps/gateway/src/config/env-schema.ts`<br>`apps/gateway/src/app/create-dependencies.ts → apps/gateway/src/config/env-schema.ts`<br>`apps/gateway/src/app/lifecycle.ts → apps/gateway/src/config/env.ts` |
| `app` | `control-plane` | `apps/gateway/src/app/bindings.ts → apps/gateway/src/control-plane/auth/contracts.ts`<br>`apps/gateway/src/app/bindings.ts → apps/gateway/src/control-plane/dependencies.ts`<br>`apps/gateway/src/app/create-application.ts → apps/gateway/src/control-plane/create-control-plane.ts` |
| `app` | `control:clients` | `apps/gateway/src/app/adapters/memory-gateway-client-repository.ts → apps/gateway/src/control-plane/features/clients/contracts.ts`<br>`apps/gateway/src/app/adapters/postgres-gateway-client-repository.ts → apps/gateway/src/control-plane/features/clients/contracts.ts` |
| `app` | `control:connections` | `apps/gateway/src/app/adapters/compatibility-probe-record.ts → apps/gateway/src/control-plane/features/connections/contracts.ts`<br>`apps/gateway/src/app/adapters/compatibility-probe-runner.ts → apps/gateway/src/control-plane/features/connections/contracts.ts`<br>`apps/gateway/src/app/adapters/memory-compatibility-probe-repository.ts → apps/gateway/src/control-plane/features/connections/contracts.ts` |
| `app` | `control:models` | `apps/gateway/src/app/adapters/memory-model-binding-repository.ts → apps/gateway/src/control-plane/features/models/contracts.ts`<br>`apps/gateway/src/app/adapters/postgres-model-binding-repository.ts → apps/gateway/src/control-plane/features/models/contracts.ts` |
| `app` | `core` | `apps/gateway/src/app/adapters/compatibility-probe-runner.ts → apps/gateway/src/core/crypto/secret-cipher.ts`<br>`apps/gateway/src/app/adapters/compatibility-probe-runner.ts → apps/gateway/src/core/logging/logger.ts`<br>`apps/gateway/src/app/adapters/compatibility-probe-runner.ts → apps/gateway/src/core/time/clock.ts` |
| `app` | `data-plane` | `apps/gateway/src/app/adapters/memory-request-store.ts → apps/gateway/src/data-plane/recording/invariant.ts`<br>`apps/gateway/src/app/adapters/postgres-gateway-client-authenticator.ts → apps/gateway/src/data-plane/credentials/contracts.ts`<br>`apps/gateway/src/app/adapters/postgres-provider-credential-resolver.ts → apps/gateway/src/data-plane/credentials/provider-credentials.ts` |
| `app` | `db` | `apps/gateway/src/app/adapters/postgres-bootstrap-configuration.ts → apps/gateway/src/db/client.ts`<br>`apps/gateway/src/app/adapters/postgres-bootstrap-configuration.ts → apps/gateway/src/db/schema/index.ts`<br>`apps/gateway/src/app/adapters/postgres-compatibility-probe-repository.ts → apps/gateway/src/db/client.ts` |
| `commands` | `app` | `apps/gateway/src/commands/export-openapi.ts → apps/gateway/src/app/create-application.ts`<br>`apps/gateway/src/commands/export-openapi.ts → apps/gateway/src/app/create-dependencies.ts` |
| `commands` | `config` | `apps/gateway/src/commands/bootstrap-admin.ts → apps/gateway/src/config/env.ts`<br>`apps/gateway/src/commands/export-openapi.ts → apps/gateway/src/config/env-schema.ts`<br>`apps/gateway/src/commands/migrate.ts → apps/gateway/src/config/env.ts` |
| `commands` | `control-plane` | `apps/gateway/src/commands/bootstrap-admin.ts → apps/gateway/src/control-plane/auth/better-auth.ts`<br>`apps/gateway/src/commands/export-openapi.ts → apps/gateway/src/control-plane/http/openapi/configure-openapi.ts` |
| `commands` | `core` | `apps/gateway/src/commands/bootstrap-admin.ts → apps/gateway/src/core/logging/logger.ts`<br>`apps/gateway/src/commands/export-openapi.ts → apps/gateway/src/core/logging/logger.ts`<br>`apps/gateway/src/commands/migrate.ts → apps/gateway/src/core/logging/logger.ts` |
| `commands` | `db` | `apps/gateway/src/commands/bootstrap-admin.ts → apps/gateway/src/db/client.ts`<br>`apps/gateway/src/commands/bootstrap-admin.ts → apps/gateway/src/db/run-migrations.ts`<br>`apps/gateway/src/commands/migrate.ts → apps/gateway/src/db/client.ts` |
| `control-plane` | `config` | `apps/gateway/src/control-plane/auth/better-auth.ts → apps/gateway/src/config/env-schema.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/config/env-schema.ts` |
| `control-plane` | `control:clients` | `apps/gateway/src/control-plane/create-control-plane.ts → apps/gateway/src/control-plane/features/clients/index.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/control-plane/features/clients/contracts.ts` |
| `control-plane` | `control:connections` | `apps/gateway/src/control-plane/create-control-plane.ts → apps/gateway/src/control-plane/features/connections/index.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/control-plane/features/connections/contracts.ts` |
| `control-plane` | `control:health` | `apps/gateway/src/control-plane/create-control-plane.ts → apps/gateway/src/control-plane/features/health/index.ts` |
| `control-plane` | `control:models` | `apps/gateway/src/control-plane/create-control-plane.ts → apps/gateway/src/control-plane/features/models/index.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/control-plane/features/models/contracts.ts` |
| `control-plane` | `control:requests` | `apps/gateway/src/control-plane/create-control-plane.ts → apps/gateway/src/control-plane/features/requests/index.ts` |
| `control-plane` | `core` | `apps/gateway/src/control-plane/auth/require-control-session.ts → apps/gateway/src/core/errors/app-error.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/core/crypto/secret-cipher.ts`<br>`apps/gateway/src/control-plane/dependencies.ts → apps/gateway/src/core/requests/contracts.ts` |
| `control:clients` | `control-plane` | `apps/gateway/src/control-plane/features/clients/handlers.ts → apps/gateway/src/control-plane/dependencies.ts`<br>`apps/gateway/src/control-plane/features/clients/handlers.ts → apps/gateway/src/control-plane/http/context.ts`<br>`apps/gateway/src/control-plane/features/clients/handlers.ts → apps/gateway/src/control-plane/http/response.ts` |
| `control:clients` | `core` | `apps/gateway/src/control-plane/features/clients/contracts.ts → apps/gateway/src/core/requests/contracts.ts`<br>`apps/gateway/src/control-plane/features/clients/service.ts → apps/gateway/src/core/crypto/gateway-key.ts`<br>`apps/gateway/src/control-plane/features/clients/service.ts → apps/gateway/src/core/errors/app-error.ts` |
| `control:connections` | `control-plane` | `apps/gateway/src/control-plane/features/connections/handlers.ts → apps/gateway/src/control-plane/dependencies.ts`<br>`apps/gateway/src/control-plane/features/connections/handlers.ts → apps/gateway/src/control-plane/http/context.ts`<br>`apps/gateway/src/control-plane/features/connections/handlers.ts → apps/gateway/src/control-plane/http/response.ts` |
| `control:connections` | `core` | `apps/gateway/src/control-plane/features/connections/compatibility-service.ts → apps/gateway/src/core/errors/app-error.ts`<br>`apps/gateway/src/control-plane/features/connections/compatibility-service.ts → apps/gateway/src/core/time/clock.ts`<br>`apps/gateway/src/control-plane/features/connections/contracts.ts → apps/gateway/src/core/crypto/secret-cipher.ts` |
| `control:health` | `control-plane` | `apps/gateway/src/control-plane/features/health/handlers.ts → apps/gateway/src/control-plane/http/context.ts`<br>`apps/gateway/src/control-plane/features/health/handlers.ts → apps/gateway/src/control-plane/http/response.ts`<br>`apps/gateway/src/control-plane/features/health/index.ts → apps/gateway/src/control-plane/http/create-router.ts` |
| `control:models` | `control-plane` | `apps/gateway/src/control-plane/features/models/handlers.ts → apps/gateway/src/control-plane/http/context.ts`<br>`apps/gateway/src/control-plane/features/models/handlers.ts → apps/gateway/src/control-plane/http/response.ts`<br>`apps/gateway/src/control-plane/features/models/index.ts → apps/gateway/src/control-plane/http/create-router.ts` |
| `control:models` | `core` | `apps/gateway/src/control-plane/features/models/service.ts → apps/gateway/src/core/errors/app-error.ts`<br>`apps/gateway/src/control-plane/features/models/service.ts → apps/gateway/src/core/time/clock.ts` |
| `control:requests` | `control-plane` | `apps/gateway/src/control-plane/features/requests/handlers.ts → apps/gateway/src/control-plane/http/context.ts`<br>`apps/gateway/src/control-plane/features/requests/handlers.ts → apps/gateway/src/control-plane/http/response.ts`<br>`apps/gateway/src/control-plane/features/requests/index.ts → apps/gateway/src/control-plane/http/create-router.ts` |
| `control:requests` | `core` | `apps/gateway/src/control-plane/features/requests/handlers.ts → apps/gateway/src/core/requests/contracts.ts`<br>`apps/gateway/src/control-plane/features/requests/service.ts → apps/gateway/src/core/errors/app-error.ts`<br>`apps/gateway/src/control-plane/features/requests/service.ts → apps/gateway/src/core/requests/contracts.ts` |
| `core` | `config` | `apps/gateway/src/core/logging/logger.ts → apps/gateway/src/config/env-schema.ts` |
| `data-plane` | `config` | `apps/gateway/src/data-plane/dependencies.ts → apps/gateway/src/config/env-schema.ts`<br>`apps/gateway/src/data-plane/transport/undici-registry.ts → apps/gateway/src/config/env-schema.ts` |
| `data-plane` | `core` | `apps/gateway/src/data-plane/credentials/static-authenticator.ts → apps/gateway/src/core/crypto/gateway-key.ts`<br>`apps/gateway/src/data-plane/dependencies.ts → apps/gateway/src/core/requests/contracts.ts`<br>`apps/gateway/src/data-plane/dependencies.ts → apps/gateway/src/core/time/clock.ts` |
| `db` | `core` | `apps/gateway/src/db/client.ts → apps/gateway/src/core/logging/logger.ts` |
| `entry` | `app` | `apps/gateway/src/index.ts → apps/gateway/src/app/lifecycle.ts` |
## Web 模块依赖

```mermaid
flowchart LR
  n_617069["api"]
  n_6170706c69636174696f6e["application"]
  n_636f6d706f6e656e7473["components"]
  n_666561747572653a61757468["feature:auth"]
  n_666561747572653a636c69656e7473["feature:clients"]
  n_666561747572653a636f6e6e656374696f6e73["feature:connections"]
  n_666561747572653a6d6f64656c73["feature:models"]
  n_666561747572653a7265717565737473["feature:requests"]
  n_686f6f6b73["hooks"]
  n_696e6465782e637373["index.css"]
  n_6c6962["lib"]
  n_726f757465547265652e67656e2e7473["routeTree.gen.ts"]
  n_726f75746573["routes"]
  n_74657374["test"]
  n_6170706c69636174696f6e --> n_636f6d706f6e656e7473
  n_6170706c69636174696f6e --> n_696e6465782e637373
  n_6170706c69636174696f6e --> n_6c6962
  n_6170706c69636174696f6e --> n_726f757465547265652e67656e2e7473
  n_636f6d706f6e656e7473 --> n_686f6f6b73
  n_636f6d706f6e656e7473 --> n_6c6962
  n_666561747572653a61757468 --> n_636f6d706f6e656e7473
  n_666561747572653a61757468 --> n_6c6962
  n_666561747572653a636c69656e7473 --> n_636f6d706f6e656e7473
  n_666561747572653a636c69656e7473 --> n_6c6962
  n_666561747572653a636f6e6e656374696f6e73 --> n_636f6d706f6e656e7473
  n_666561747572653a636f6e6e656374696f6e73 --> n_6c6962
  n_666561747572653a6d6f64656c73 --> n_636f6d706f6e656e7473
  n_666561747572653a6d6f64656c73 --> n_6c6962
  n_666561747572653a7265717565737473 --> n_636f6d706f6e656e7473
  n_666561747572653a7265717565737473 --> n_6c6962
  n_666561747572653a7265717565737473 --> n_726f75746573
  n_726f75746573 --> n_636f6d706f6e656e7473
  n_726f75746573 --> n_666561747572653a61757468
  n_726f75746573 --> n_666561747572653a636c69656e7473
  n_726f75746573 --> n_666561747572653a636f6e6e656374696f6e73
  n_726f75746573 --> n_666561747572653a6d6f64656c73
  n_726f75746573 --> n_666561747572653a7265717565737473
  n_726f75746573 --> n_6c6962
  n_726f757465547265652e67656e2e7473 --> n_726f75746573
```

| From | To | 代表性 Import |
| --- | --- | --- |
| `application` | `components` | `apps/web/src/app.tsx → apps/web/src/components/layout/theme-provider.tsx`<br>`apps/web/src/router.tsx → apps/web/src/components/product/route-error-state.tsx` |
| `application` | `index.css` | `apps/web/src/main.tsx → apps/web/src/index.css` |
| `application` | `lib` | `apps/web/src/app.tsx → apps/web/src/lib/query-client.ts`<br>`apps/web/src/router.tsx → apps/web/src/lib/query-client.ts` |
| `application` | `routeTree.gen.ts` | `apps/web/src/router.tsx → apps/web/src/routeTree.gen.ts` |
| `components` | `hooks` | `apps/web/src/components/ui/sidebar.tsx → apps/web/src/hooks/use-mobile.ts` |
| `components` | `lib` | `apps/web/src/components/product/data-error-state.tsx → apps/web/src/lib/utils.ts`<br>`apps/web/src/components/product/status-badge.tsx → apps/web/src/lib/utils.ts`<br>`apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts` |
| `feature:auth` | `components` | `apps/web/src/features/auth/login-page.tsx → apps/web/src/components/ui/button.tsx`<br>`apps/web/src/features/auth/login-page.tsx → apps/web/src/components/ui/card.tsx`<br>`apps/web/src/features/auth/login-page.tsx → apps/web/src/components/ui/field.tsx` |
| `feature:auth` | `lib` | `apps/web/src/features/auth/login-page.tsx → apps/web/src/lib/auth-client.ts` |
| `feature:clients` | `components` | `apps/web/src/features/clients/client-config-snippets.tsx → apps/web/src/components/ui/button.tsx`<br>`apps/web/src/features/clients/client-detail.tsx → apps/web/src/components/product/status-badge.tsx`<br>`apps/web/src/features/clients/client-detail.tsx → apps/web/src/components/ui/alert-dialog.tsx` |
| `feature:clients` | `lib` | `apps/web/src/features/clients/client-detail.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/clients/client-directory.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/clients/create-client-form.tsx → apps/web/src/lib/api-runtime/client.ts` |
| `feature:connections` | `components` | `apps/web/src/features/connections/add-endpoint-form.tsx → apps/web/src/components/ui/button.tsx`<br>`apps/web/src/features/connections/add-endpoint-form.tsx → apps/web/src/components/ui/checkbox.tsx`<br>`apps/web/src/features/connections/add-endpoint-form.tsx → apps/web/src/components/ui/field.tsx` |
| `feature:connections` | `lib` | `apps/web/src/features/connections/add-endpoint-form.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/connections/compatibility-panel.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/connections/compatibility-probe-sheet.tsx → apps/web/src/lib/api-runtime/client.ts` |
| `feature:models` | `components` | `apps/web/src/features/models/create-model-binding-form.tsx → apps/web/src/components/ui/button.tsx`<br>`apps/web/src/features/models/create-model-binding-form.tsx → apps/web/src/components/ui/dialog.tsx`<br>`apps/web/src/features/models/create-model-binding-form.tsx → apps/web/src/components/ui/field.tsx` |
| `feature:models` | `lib` | `apps/web/src/features/models/create-model-binding-form.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/models/hooks.ts → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/models/models-page.tsx → apps/web/src/lib/api-runtime/client.ts` |
| `feature:requests` | `components` | `apps/web/src/features/requests/components/request-diagnostic-banner.tsx → apps/web/src/components/ui/button.tsx`<br>`apps/web/src/features/requests/requests-page.tsx → apps/web/src/components/product/data-error-state.tsx`<br>`apps/web/src/features/requests/requests-page.tsx → apps/web/src/components/product/page-header.tsx` |
| `feature:requests` | `lib` | `apps/web/src/features/requests/hooks.ts → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/requests/requests-page.tsx → apps/web/src/lib/api-runtime/client.ts`<br>`apps/web/src/features/requests/requests-page.tsx → apps/web/src/lib/utils.ts` |
| `feature:requests` | `routes` | `apps/web/src/features/requests/components/request-diagnostic-banner.tsx → apps/web/src/routes/-deep-links.ts` |
| `routes` | `components` | `apps/web/src/routes/-components/overview-page.tsx → apps/web/src/components/product/page-header.tsx`<br>`apps/web/src/routes/-components/overview-page.tsx → apps/web/src/components/product/request-status.tsx`<br>`apps/web/src/routes/-components/overview-page.tsx → apps/web/src/components/ui/button.tsx` |
| `routes` | `feature:auth` | `apps/web/src/routes/login.tsx → apps/web/src/features/auth/login-page.tsx` |
| `routes` | `feature:clients` | `apps/web/src/routes/-components/overview-page.tsx → apps/web/src/features/clients/hooks.ts`<br>`apps/web/src/routes/_workspace/clients.tsx → apps/web/src/features/clients/clients-page.tsx` |
| `routes` | `feature:connections` | `apps/web/src/routes/-components/models-route-page.tsx → apps/web/src/features/connections/hooks.ts`<br>`apps/web/src/routes/-components/overview-page.tsx → apps/web/src/features/connections/hooks.ts`<br>`apps/web/src/routes/-deep-links.ts → apps/web/src/features/connections/connection-detail-tabs.ts` |
| `routes` | `feature:models` | `apps/web/src/routes/-components/models-route-page.tsx → apps/web/src/features/models/models-page.tsx`<br>`apps/web/src/routes/_workspace/connections.tsx → apps/web/src/features/models/hooks.ts` |
| `routes` | `feature:requests` | `apps/web/src/routes/-components/overview-page.tsx → apps/web/src/features/requests/hooks.ts`<br>`apps/web/src/routes/_workspace/requests.tsx → apps/web/src/features/requests/requests-page.tsx` |
| `routes` | `lib` | `apps/web/src/routes/-components/overview-page.tsx → apps/web/src/lib/metrics.ts` |
| `routeTree.gen.ts` | `routes` | `apps/web/src/routeTree.gen.ts → apps/web/src/routes/__root.tsx`<br>`apps/web/src/routeTree.gen.ts → apps/web/src/routes/_workspace`<br>`apps/web/src/routeTree.gen.ts → apps/web/src/routes/_workspace/clients.tsx` |
