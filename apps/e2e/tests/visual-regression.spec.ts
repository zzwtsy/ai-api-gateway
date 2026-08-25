import type { APIRequestContext, Locator } from "@playwright/test";

import process from "node:process";

import { expect, test } from "@playwright/test";

const gatewayPort = process.env.AIGW_E2E_GATEWAY_PORT ?? "3001";
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;
const headers = { authorization: "Bearer admin_dev_local" };

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders(headers);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test("App Shell 的 Light 与 Dark 语义表面保持稳定", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "概览" })).toBeVisible();
  await expect(page).toHaveScreenshot("app-shell-light.png", screenshotOptions());

  await page.getByRole("button", { name: "选择界面主题" }).click();
  await page.getByRole("menuitemradio", { name: "深色" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page).toHaveScreenshot("app-shell-dark.png", screenshotOptions());
});

test("Models 详情 Sheet 的稳定区域保持语义层级", async ({ page, request }) => {
  const { bindingId } = await createModelFixture(request);
  await page.goto(`/models?modelBindingId=${encodeURIComponent(bindingId)}`);

  const detailSheet = page.getByRole("dialog", { name: "视觉回归模型" });
  await expect(detailSheet).toBeVisible();
  await expect(detailSheet).toHaveScreenshot("models-inspector.png", {
    ...screenshotOptions(),
    mask: dynamicModelValues(detailSheet),
  });
});

test("Clients 详情 Sheet 的稳定区域保持单屏滚动结构", async ({ page, request }) => {
  const { clientId } = await createClientFixture(request);
  await page.goto(`/clients?clientId=${encodeURIComponent(clientId)}`);

  const detailSheet = page.getByRole("dialog", { name: "视觉回归客户端" });
  await expect(detailSheet).toBeVisible();
  await expect(detailSheet).toHaveScreenshot("clients-inspector.png", {
    ...screenshotOptions(),
    mask: dynamicClientValues(detailSheet),
  });
});

function screenshotOptions() {
  return {
    animations: "disabled" as const,
    caret: "hide" as const,
    maxDiffPixelRatio: 0.01,
  };
}

function dynamicModelValues(inspector: Locator): Locator[] {
  return [
    inspector.locator("code"),
    inspector.locator("dt", { hasText: /创建时间|更新时间/u }).locator("..").locator("dd"),
  ];
}

function dynamicClientValues(inspector: Locator): Locator[] {
  return [
    inspector.locator("code"),
    inspector.locator("dt", { hasText: /创建时间|更新时间|创建|最后使用/u }).locator("..").locator("dd"),
  ];
}

async function createModelFixture(request: APIRequestContext): Promise<{ readonly bindingId: string }> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const connectionResponse = await request.post(`${gatewayOrigin}/admin/api/v1/connections`, {
    headers,
    data: {
      name: "视觉回归上游",
      providerSlug: `visual-regression-${suffix}`,
      endpoint: {
        name: "默认 Endpoint",
        protocol: "openai-chat",
        baseUrl: `https://visual-regression-${suffix}.invalid`,
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
      },
      account: { name: "主账号", billingMode: "unknown" },
      credential: { name: "主 Key", secret: `visual-regression-${suffix}` },
    },
  });
  expect(connectionResponse.status()).toBe(201);
  const connection = await connectionResponse.json() as { data: { endpoints: readonly [{ id: string }] } };
  const modelResponse = await request.post(`${gatewayOrigin}/admin/api/v1/models`, {
    headers,
    data: {
      endpointId: connection.data.endpoints[0].id,
      upstreamModelId: "visual-regression-model",
      name: "视觉回归模型",
    },
  });
  expect(modelResponse.status()).toBe(201);
  const model = await modelResponse.json() as { data: { id: string } };
  return { bindingId: model.data.id };
}

async function createClientFixture(request: APIRequestContext): Promise<{ readonly clientId: string }> {
  const response = await request.post(`${gatewayOrigin}/admin/api/v1/clients`, {
    headers,
    data: {
      name: "视觉回归客户端",
      profileSlug: "codex",
      allowedProtocols: ["openai-responses"],
    },
  });
  expect(response.status()).toBe(201);
  const client = await response.json() as { data: { client: { id: string } } };
  return { clientId: client.data.client.id };
}
