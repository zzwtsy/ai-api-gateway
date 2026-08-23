# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/e2e/package.json apps/e2e/package.json
COPY scripts/install-lefthook.ts scripts/install-lefthook.ts
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/gateway/node_modules ./apps/gateway/node_modules
COPY --from=build /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=build /app/apps/gateway/drizzle ./apps/gateway/drizzle
COPY --from=build /app/apps/gateway/package.json ./apps/gateway/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD node -e "fetch('http://127.0.0.1:3001/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node apps/gateway/dist/commands/migrate.js && node apps/gateway/dist/index.js"]
