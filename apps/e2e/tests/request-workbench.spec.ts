import type { Locator, Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

import { createRecordedRequest } from "./support/recorded-request.js";

const adminHeaders = { authorization: "Bearer admin_dev_local" };

test("Request Workbench preserves URL state and follows the committed desktop geometry", async ({ page, request }) => {
  const model = "request-workbench-layout-model";
  const { requestId } = await createRecordedRequest(request, model);
  await page.setExtraHTTPHeaders(adminHeaders);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/requests");

  const modelLink = page.getByRole("link", { name: new RegExp(model, "u") });
  await modelLink.press("Enter");
  await expect(page).toHaveURL(new RegExp(`[?&]requestId=${requestId}(?:&|$)`, "u"));
  await expect(page.getByText("第 1 次尝试")).toBeVisible();

  const workbench = page.locator("[data-slot=\"request-workbench\"]");
  const aria = await workbench.ariaSnapshot();
  expect(aria).toContain("region \"逻辑请求\"");
  expect(aria).toContain("region \"请求详情\"");
  expect(aria).toContain("上游尝试链");

  await expectSideBySideGeometry(page);
  await expectNoDocumentOverflow(page);

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`[?&]requestId=${requestId}(?:&|$)`, "u"));
  await expect(page.getByText("第 1 次尝试")).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expectStackedGeometry(page);
    await expectNoDocumentOverflow(page);
  }
});

test("Request List and Inspector recover independently", async ({ page, request }) => {
  const model = "request-workbench-error-model";
  const { requestId } = await createRecordedRequest(request, model);
  const unexpectedBrowserErrors = collectUnexpectedBrowserErrors(page);
  await page.setExtraHTTPHeaders(adminHeaders);
  await page.setViewportSize({ width: 1440, height: 1000 });

  let detailShouldFail = true;
  await page.route(`**/admin/api/v1/requests/${requestId}`, async (route) => {
    if (detailShouldFail) {
      await route.fulfill({ status: 503, contentType: "application/json", body: errorEnvelope("详情暂时不可用") });
      return;
    }
    await route.continue();
  });
  await page.goto(`/requests?requestId=${requestId}`);
  await expect(page).toHaveTitle(/AI API Gateway/u);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);

  const master = page.getByRole("region", { name: "逻辑请求" });
  const inspector = page.getByRole("region", { name: "请求详情" });
  await expect(master.getByText(model)).toBeVisible();
  await expect(inspector.getByText("无法加载请求详情")).toBeVisible();
  await expectHorizontallyContainedBy(inspector, inspector.getByRole("alert"));
  detailShouldFail = false;
  await inspector.getByRole("button", { name: "重新加载" }).click();
  await expect(inspector.getByText("第 1 次尝试")).toBeVisible();
  await page.unroute(`**/admin/api/v1/requests/${requestId}`);

  await page.route(/\/admin\/api\/v1\/requests(?:\?.*)?$/u, route => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: errorEnvelope("列表暂时不可用"),
  }));
  await page.reload();

  await expect(master.getByText("无法加载逻辑请求")).toBeVisible();
  await expectHorizontallyContainedBy(master, master.getByRole("alert"));
  await expectHorizontallyContainedBy(master, master.getByRole("button", { name: "重新加载" }));
  await expect(inspector.getByText("第 1 次尝试")).toBeVisible();
  await expect(master.getByText("还没有逻辑请求")).toHaveCount(0);
  expect(unexpectedBrowserErrors).toEqual([]);
});

async function expectSideBySideGeometry(page: Page): Promise<void> {
  const masterBox = await box(page.locator("[data-slot=\"request-master\"]"));
  const inspectorBox = await box(page.locator("[data-slot=\"request-inspector\"]"));
  expect(Math.abs(masterBox.y - inspectorBox.y)).toBeLessThanOrEqual(1);
  expect(masterBox.x + masterBox.width).toBeLessThanOrEqual(inspectorBox.x + 1);
  expect(masterBox.width).toBeGreaterThanOrEqual(620);
  expect(inspectorBox.width).toBeGreaterThanOrEqual(390);
}

async function expectStackedGeometry(page: Page): Promise<void> {
  const masterBox = await box(page.locator("[data-slot=\"request-master\"]"));
  const inspectorBox = await box(page.locator("[data-slot=\"request-inspector\"]"));
  expect(inspectorBox.y).toBeGreaterThanOrEqual(masterBox.y + masterBox.height - 1);
  expect(Math.abs(masterBox.x - inspectorBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(masterBox.width - inspectorBox.width)).toBeLessThanOrEqual(1);
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value ?? { x: 0, y: 0, width: 0, height: 0 };
}

async function expectHorizontallyContainedBy(container: Locator, child: Locator): Promise<void> {
  const containerBox = await box(container);
  const childBox = await box(child);
  expect(childBox.x).toBeGreaterThanOrEqual(containerBox.x - 1);
  expect(childBox.x + childBox.width).toBeLessThanOrEqual(containerBox.x + containerBox.width + 1);
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  await expect.poll(async () => page.locator("html").evaluate(element => (
    element.scrollWidth <= element.clientWidth
  ))).toBe(true);
}

function collectUnexpectedBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error")
      return;
    const value = message.text();
    if (/Failed to load resource:.*503/iu.test(value))
      return;
    errors.push(value);
  });
  return errors;
}

function errorEnvelope(message: string): string {
  return JSON.stringify({
    success: false,
    code: "COMMON_INTERNAL_ERROR",
    message,
    data: null,
    error: { type: "internal" },
    meta: { requestId: "req_e2e_error" },
  });
}
