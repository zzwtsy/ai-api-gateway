import { defineConfig } from "@playwright/test";

const useBuild = process.env.AIGW_E2E_USE_BUILD === "1";
const gatewayEnvironment = {
  NODE_ENV: "test",
  STORAGE_DRIVER: "memory",
  LOG_LEVEL: "silent",
  BOOTSTRAP_PROVIDER_BASE_URL: "http://127.0.0.1:4010",
};

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: useBuild ? "http://127.0.0.1:3001" : "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: useBuild
    ? [
        {
          command: "pnpm mock-provider",
          url: "http://127.0.0.1:4010/health",
          reuseExistingServer: false,
        },
        {
          command: "node ../gateway/dist/index.js",
          url: "http://127.0.0.1:3001/healthz",
          reuseExistingServer: false,
          env: gatewayEnvironment,
        },
      ]
    : [
        {
          command: "pnpm mock-provider",
          url: "http://127.0.0.1:4010/health",
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "pnpm --filter @aigw/gateway dev",
          url: "http://127.0.0.1:3001/healthz",
          reuseExistingServer: !process.env.CI,
          env: gatewayEnvironment,
        },
        {
          command: "pnpm --filter @aigw/web dev",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: !process.env.CI,
        },
      ],
});
