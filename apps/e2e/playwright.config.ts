import process from "node:process";

import { defineConfig } from "@playwright/test";

const useBuild = process.env.AIGW_E2E_USE_BUILD === "1";
const gatewayPort = process.env.AIGW_E2E_GATEWAY_PORT ?? "3001";
const providerPort = process.env.AIGW_E2E_PROVIDER_PORT ?? "4010";
const webPort = process.env.AIGW_E2E_WEB_PORT ?? "5173";
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;
const providerOrigin = `http://127.0.0.1:${providerPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
const gatewayEnvironment = {
  NODE_ENV: "test",
  STORAGE_DRIVER: "memory",
  LOG_LEVEL: "silent",
  PORT: gatewayPort,
  WEB_ORIGIN: webOrigin,
  BOOTSTRAP_PROVIDER_BASE_URL: providerOrigin,
};

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: useBuild ? gatewayOrigin : webOrigin,
    trace: "retain-on-failure",
  },
  webServer: useBuild
    ? [
        {
          command: "pnpm mock-provider",
          url: `${providerOrigin}/health`,
          reuseExistingServer: false,
          env: { MOCK_PROVIDER_PORT: providerPort },
        },
        {
          command: "node ../gateway/dist/index.js",
          url: `${gatewayOrigin}/healthz`,
          reuseExistingServer: false,
          env: gatewayEnvironment,
        },
      ]
    : [
        {
          command: "pnpm mock-provider",
          url: `${providerOrigin}/health`,
          reuseExistingServer: process.env.CI === undefined,
          env: { MOCK_PROVIDER_PORT: providerPort },
        },
        {
          command: "pnpm --filter @aigw/gateway dev",
          url: `${gatewayOrigin}/healthz`,
          reuseExistingServer: process.env.CI === undefined,
          env: gatewayEnvironment,
        },
        {
          command: `pnpm --filter @aigw/web exec vite --host 127.0.0.1 --port ${webPort}`,
          url: webOrigin,
          reuseExistingServer: process.env.CI === undefined,
          env: { AIGW_WEB_GATEWAY_ORIGIN: gatewayOrigin },
        },
      ],
});
