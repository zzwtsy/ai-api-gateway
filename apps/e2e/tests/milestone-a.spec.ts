import type { Page } from "@playwright/test";

import { randomUUID } from "node:crypto";
import process from "node:process";

import { expect, test } from "@playwright/test";

const adminHeaders = { authorization: "Bearer admin_dev_local" };
const providerPort = process.env.AIGW_E2E_PROVIDER_PORT ?? "4010";
const providerOrigin = `http://127.0.0.1:${providerPort}`;

test.use({ trace: "off" });

test("里程碑 A 的连接、模型与客户端流程通过真实控制面", async ({ page, request }) => {
  const browserErrors = collectBrowserErrors(page);
  const runId = randomUUID().slice(0, 8);
  const connectionName = `里程碑 A 模拟上游 ${runId}`;
  const clientName = `Codex · 里程碑 A ${runId}`;
  const providerSecret = "provider-e2e-secret-seed";
  const validProviderSecret = `mock-provider-${runId}-key`;
  const compatibilityModel = `probe-model-${runId}`;

  await page.setExtraHTTPHeaders(adminHeaders);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/connections");
  await expect(page).toHaveTitle(/AI API Gateway/u);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);

  await page.getByRole("button", { name: "添加连接" }).click();
  await page.getByLabel("连接名称").fill(connectionName);
  await page.getByLabel("Provider 标识").fill(`milestone-a-${runId}`);
  await page.getByLabel("Provider API Key").fill(providerSecret);
  await page.getByRole("button", { name: "下一步：Endpoint" }).click();
  await page.getByLabel("上游 Base URL").fill(providerOrigin);
  await page.getByRole("button", { name: "创建连接" }).click();

  await expect(page.getByText(connectionName, { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "完整兼容性测试" })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("tab")).toBeNull();
  await expect(page.getByText(providerSecret, { exact: true })).toHaveCount(0);
  await expect.poll(() => (
    new URL(page.url()).searchParams.get("connectionId")
  )).not.toBeNull();
  const selectedConnectionId = new URL(page.url()).searchParams.get("connectionId");
  if (selectedConnectionId === null)
    throw new Error("创建连接后 URL 缺少 connectionId");
  await page.getByRole("tab", { name: "账号" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("accounts");
  await expect(page.getByText("••••seed", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(connectionName, { exact: true }).last()).toBeVisible();
  await expect(page.getByText("••••seed", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("connectionId")).toBe(selectedConnectionId);
  expect(new URL(page.url()).searchParams.get("tab")).toBe("accounts");

  await page.goto(`/connections?connectionId=${encodeURIComponent(selectedConnectionId)}&tab=compatibility`);
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("compatibility");
  await expect(page.getByRole("tab", { name: "兼容性" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("尚无完整兼容性事实")).toBeVisible();

  await page.getByRole("tab", { name: "Endpoints" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("endpoints");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Endpoints" })).toBeVisible();

  const accountsTab = page.getByRole("tab", { name: "账号" });
  await accountsTab.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("accounts");

  const credentials = page.getByRole("region", { name: "账号与凭据" });
  await expect(credentials).toBeVisible();
  await credentials.getByRole("button", { name: "测试" }).click();
  await expect(page.getByText("该测试可能产生 Provider 费用")).toBeVisible();
  const probeButton = page.getByRole("button", { name: "发送计费测试请求" });
  await expect(probeButton).toBeDisabled();
  await page.getByLabel("请求模型").fill("demo-model");
  await probeButton.click();
  await expect(page.getByText("最小连通性测试未通过")).toBeVisible();
  await expect(page.getByText(/分类：鉴权失败/u)).toBeVisible();

  await credentials.getByRole("button", { name: "轮换" }).click();
  await page.getByLabel("新的 Provider Secret").fill(validProviderSecret);
  await page.getByRole("button", { name: "保存新 Secret" }).click();
  await expect(page.getByText("••••-key", { exact: true })).toBeVisible();
  await credentials.getByRole("button", { name: "测试" }).click();
  await page.getByLabel("请求模型").fill("demo-model");
  await page.getByRole("button", { name: "发送计费测试请求" }).click();
  await expect(page.getByText("最小连通性测试成功")).toBeVisible();
  await expectNoDocumentOverflow(page);

  await page.getByRole("tab", { name: "Endpoints" }).click();
  await page.getByRole("button", { name: "添加 Endpoint" }).click();
  await page.getByLabel("Endpoint 名称").fill("Responses Endpoint");
  await page.getByRole("combobox", { name: "协议" }).click();
  await page.getByRole("option", { name: "OpenAI Responses" }).click();
  await expect(page.getByLabel("请求路径")).toHaveValue("/v1/responses");
  await page.getByRole("button", { name: "添加 Endpoint" }).click();
  await expect(page.getByRole("cell", { name: "Responses Endpoint" })).toBeVisible();
  await expect(page.getByText("/v1/responses", { exact: false })).toBeVisible();

  const startProbeRoute = /\/admin\/api\/v1\/endpoints\/[^/]+\/probe$/u;
  await page.route(startProbeRoute, route => route.fulfill({
    status: 409,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      code: "ENDPOINT_DISABLED",
      message: "已禁用的 Endpoint 不能测试",
      data: null,
      error: { type: "business" },
      meta: { requestId: "req_compatibility_recoverable_error" },
    }),
  }));
  await page.getByRole("tab", { name: "兼容性" }).click();
  const fullProbeButton = page.getByRole("button", { name: "开始完整测试" });
  await fullProbeButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("会发送多次真实上游请求")).toBeVisible();
  await expect(page.getByLabel("测试 Endpoint")).toBeFocused();
  await page.getByLabel("实测模型 ID").fill(compatibilityModel);
  await page.getByRole("button", { name: "开始计费测试" }).click();
  await expect(page.getByText("已禁用的 Endpoint 不能测试")).toBeVisible();
  await expect(page.getByLabel("实测模型 ID")).toHaveValue(compatibilityModel);
  expect(browserErrors).toEqual([expect.stringContaining("409")]);
  browserErrors.length = 0;
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectOverlayInsideViewport(page);
  await expectNoDocumentOverflow(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.unroute(startProbeRoute);
  await page.getByRole("button", { name: "开始计费测试" }).click();
  await expect(page.getByText("正在测试兼容性")).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("compatibility");
  await page.getByRole("button", { name: "关闭并后台继续" }).click();
  await expect(page.getByText("完整测试正在运行")).toBeVisible();
  await expect(page.getByRole("button", { name: "重新测试" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "兼容性" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("cell", { name: "鉴权", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SSE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Tool Call", exact: true })).toBeVisible();
  await expect(page.getByText("已验证", { exact: true })).toBeVisible();
  await expect(page.getByText(compatibilityModel, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(providerSecret, { exact: true })).toHaveCount(0);
  await expectNoDocumentOverflow(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole("cell", { name: "鉴权", exact: true })).toBeVisible();
  await expectConnectionLayout(page, "stacked");
  await expectNoDocumentOverflow(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectConnectionLayout(page, "side-by-side");

  const receivedResponse = await request.get(`${providerOrigin}/received`, {
    params: { history: "true", model: compatibilityModel },
  });
  expect(receivedResponse.ok()).toBe(true);
  const receivedRequests = await receivedResponse.json() as CapturedProviderRequest[];
  expect(receivedRequests).toHaveLength(9);
  expect(receivedRequests.every(item => item.path === "/v1/chat/completions")).toBe(true);
  expect(receivedRequests.every(item => item.authorization === `Bearer ${validProviderSecret}`)).toBe(true);
  expectCompatibilityProbeBodies(receivedRequests.map(item => JSON.parse(item.body) as Record<string, unknown>), compatibilityModel);

  await page.goto("/models");
  await page.getByRole("button", { name: "添加模型绑定" }).click();
  await page.getByRole("combobox", { name: "目标 Endpoint" }).click();
  await page.getByRole("option", { name: `${connectionName} / 默认 Endpoint` }).click();
  await page.getByRole("button", { name: "获取上游模型" }).click();
  await page.getByRole("combobox", { name: "选择上游模型" }).click();
  await page.getByRole("option", { name: "demo-model", exact: true }).click();
  await expect(page.getByLabel("上游模型 ID")).toHaveValue("demo-model");
  await page.getByLabel("显示名称").fill("里程碑 A 演示模型");
  await page.getByRole("button", { name: "创建模型绑定" }).click();

  await expect(page.getByText("里程碑 A 演示模型", { exact: true })).toBeVisible();
  await expect(page.getByText("未验证", { exact: true })).toBeVisible();
  await expect(page.getByText("能力与价格未知", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);

  await page.goto("/clients");
  await page.getByRole("button", { name: "添加客户端" }).first().click();
  await page.getByLabel("客户端名称").fill(clientName);
  await page.getByRole("combobox", { name: "Harness Profile" }).click();
  await page.getByRole("option", { name: "Codex", exact: true }).click();
  await expect(page.getByText("OpenAI Responses", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "入口协议" })).toHaveCount(0);
  await page.getByRole("button", { name: "创建客户端" }).click();

  const revealedKey = page.getByLabel("完整 Gateway Key");
  await expect(revealedKey).toBeVisible();
  expect((await revealedKey.inputValue()).startsWith("gw_codex_")).toBe(true);
  await page.getByRole("button", { name: "我已保存，关闭" }).click();
  await expect(revealedKey).toHaveCount(0);
  const clientRow = page.getByRole("row").filter({ hasText: clientName });
  await expect(clientRow.getByText("1 个可用", { exact: true })).toBeVisible();
  const protocolCell = clientRow.getByRole("cell").nth(1);
  await expect(protocolCell.getByText("OpenAI Responses", { exact: true })).toBeVisible();
  await expect(protocolCell.getByText("Codex", { exact: true })).toHaveCount(0);
  await clientRow.getByRole("button", { name: "查看详情" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("clientId")).not.toBeNull();
  const selectedClientId = new URL(page.url()).searchParams.get("clientId");
  if (selectedClientId === null)
    throw new Error("打开客户端详情后 URL 缺少 clientId");
  await expect(page.locator("code").filter({ hasText: /^gw_codex_[\w-]+••••[\w-]{4}$/u })).toBeVisible();
  await expect(page.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
  await expect(page.getByText(/YOUR_GATEWAY_CLIENT_KEY/u)).toBeVisible();
  await page.reload();
  await expect(page.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(selectedClientId);

  await page.getByRole("button", { name: "轮换 Key 并生成完整配置" }).click();
  await expect(page.getByLabel("完整 Gateway Key")).toHaveCount(0);
  await page.getByRole("button", { name: "确认轮换" }).click();
  await expect(page.getByLabel("完整 Gateway Key")).toBeVisible();
  await page.getByRole("button", { name: "我已保存，返回详情" }).click();
  await expect(page.getByText("现有完整 Gateway Key 无法恢复")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(selectedClientId);
  await page.getByRole("button", { name: "撤销" }).first().click();
  await page.getByRole("button", { name: "确认撤销" }).click();
  await page.getByText(/^历史 Key（\d+）$/u).click();
  await expect(page.getByText("已撤销", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expectOverlayInsideViewport(page);
    await expectNoDocumentOverflow(page);
  }

  await page.setViewportSize({ width: 700, height: 800 });
  await expectOverlayInsideViewport(page);

  await page.keyboard.press("Escape");
  await expect.poll(() => new URL(page.url()).searchParams.get("clientId")).toBeNull();
  await page.goto("/clients?clientId=missing-client");
  await expect.poll(() => new URL(page.url()).searchParams.get("clientId")).toBeNull();
  await expect(page.getByText("现有完整 Gateway Key 无法恢复")).toHaveCount(0);

  await page.goto(`/connections?connectionId=${encodeURIComponent(selectedConnectionId)}&tab=models`);
  await expect(page.getByRole("tab", { name: "模型" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("里程碑 A 演示模型", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoDocumentOverflow(page);
  }

  await page.setViewportSize({ width: 700, height: 800 });
  const detailTabs = page.getByRole("tablist", { name: "连接详情视图" });
  await expect(detailTabs).toBeVisible();
  await expect.poll(async () => detailTabs.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= element.ownerDocument.documentElement.clientWidth;
  })).toBe(true);
  await page.getByRole("tab", { name: "账号" }).click();
  await expect(page.getByRole("region", { name: "账号与凭据" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

async function expectOverlayInsideViewport(page: Page): Promise<void> {
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect.poll(async () => sheet.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0
      && rect.right <= element.ownerDocument.documentElement.clientWidth
      && rect.top >= 0
      && rect.bottom <= element.ownerDocument.documentElement.clientHeight;
  })).toBe(true);
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500)
      errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const diagnostics = await page.locator("html").evaluate((element) => {
    const viewportWidth = element.clientWidth;
    const nodes = element.ownerDocument.querySelectorAll("body *");
    const candidates: { className: string; right: number; tag: string }[] = [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes.item(index);
      const rect = node.getBoundingClientRect();
      candidates.push({
        className: node.className.toString().slice(0, 120),
        right: Math.round(rect.right),
        tag: node.tagName.toLowerCase(),
      });
    }
    const offenders = candidates
      .filter(item => item.right > viewportWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 8);
    return {
      clientWidth: viewportWidth,
      offenders,
      scrollWidth: element.scrollWidth,
    };
  });

  expect(
    diagnostics.scrollWidth,
    `文档横向溢出：${JSON.stringify(diagnostics)}`,
  ).toBeLessThanOrEqual(diagnostics.clientWidth);
}

interface CapturedProviderRequest {
  readonly path: string;
  readonly authorization: string | undefined;
  readonly body: string;
}

async function expectConnectionLayout(page: Page, expected: "side-by-side" | "stacked"): Promise<void> {
  const directory = page.locator("[data-slot=card]").filter({
    has: page.getByText("Provider 目录", { exact: true }),
  });
  const detail = page.locator("[data-slot=card][aria-labelledby=connection-detail-title]");
  const [directoryBox, detailBox] = await Promise.all([directory.boundingBox(), detail.boundingBox()]);
  expect(directoryBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  if (directoryBox === null || detailBox === null)
    return;
  if (expected === "stacked") {
    expect(detailBox.y).toBeGreaterThanOrEqual(directoryBox.y + directoryBox.height);
    return;
  }
  expect(detailBox.x).toBeGreaterThanOrEqual(directoryBox.x + directoryBox.width);
}

function expectCompatibilityProbeBodies(
  bodies: readonly Record<string, unknown>[],
  model: string,
): void {
  expect(bodies[0]).toMatchObject({ model, stream: false });
  expect(bodies[1]).toMatchObject({ model, stream: true });
  expect(bodies[1]).not.toHaveProperty("stream_options");
  expect(bodies[2]).toMatchObject({ model, stream: false });
  expect(bodies[3]).toMatchObject({ model, aigw_probe_unknown_field: { preserved: true } });
  expect(bodies[4]).toMatchObject({
    model,
    tool_choice: { type: "function", function: { name: "aigw_probe" } },
  });
  expect(bodies[5]).toMatchObject({ model, reasoning_effort: "low" });
  expect(bodies[6]).toMatchObject({
    model,
    response_format: { type: "json_schema", json_schema: { name: "aigw_probe", strict: true } },
  });
  expect(bodies[7]).not.toHaveProperty("model");
  expect(bodies[8]).toMatchObject({
    model,
    stream: true,
    stream_options: { include_usage: true },
  });
}
