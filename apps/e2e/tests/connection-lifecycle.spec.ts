import type { APIRequestContext, Locator } from "@playwright/test";

import process from "node:process";

import { expect, test } from "@playwright/test";

const gatewayPort = process.env.AIGW_E2E_GATEWAY_PORT ?? "3001";
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;
const adminHeaders = { authorization: "Bearer admin_dev_local" };

test("连接删除在桌面视口完成确认、URL 切换和最后一项焦点恢复", async ({ page, request }) => {
  const browserIssues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      browserIssues.push(`console: ${message.text()}`);
  });
  page.on("pageerror", error => browserIssues.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500)
      browserIssues.push(`${response.status()} ${response.url()}`);
  });
  await page.context().clearCookies();
  await page.setExtraHTTPHeaders(adminHeaders);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const firstName = `待删除连接 ${suffix}`;
  const secondName = `保留连接 ${suffix}`;
  const firstId = await createConnection(request, firstName, `first-${suffix}`);
  const secondId = await createConnection(request, secondName, `second-${suffix}`);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/connections?connectionId=${encodeURIComponent(firstId)}`);
  await expect(page.getByRole("button", { name: firstName, exact: true })).toBeVisible();
  const firstTrigger = page.getByRole("button", { name: "删除连接", exact: true });
  await firstTrigger.click();
  let dialog = page.getByRole("alertdialog", { name: `删除连接 ${firstName}？` });
  await expectDeletionDialogReady(dialog);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(firstTrigger).toBeFocused();

  await firstTrigger.click();
  dialog = page.getByRole("alertdialog", { name: `删除连接 ${firstName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(firstTrigger).toBeFocused();

  await firstTrigger.click();
  dialog = page.getByRole("alertdialog", { name: `删除连接 ${firstName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(dialog).toHaveCount(0);
  const secondTrigger = page.getByRole("button", { name: secondName, exact: true });
  await expect(secondTrigger).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: secondName, exact: true })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("connectionId")).toBeTruthy();
  const remainingAfterFirstDelete = await listConnectionIds(request);
  expect(remainingAfterFirstDelete).toContain(secondId);
  expect(remainingAfterFirstDelete).not.toContain(firstId);

  await page.setViewportSize({ width: 1024, height: 768 });
  const secondDeleteTrigger = page.getByRole("button", { name: "删除连接", exact: true });
  await secondDeleteTrigger.click();
  dialog = page.getByRole("alertdialog", { name: `删除连接 ${secondName}？` });
  await expectDeletionDialogReady(dialog);
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("尚未添加连接", { exact: true })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("connectionId")).toBeNull();
  await expect(page.getByRole("button", { name: "添加连接" })).toBeFocused();
  await expect.poll(async () => (await listConnectionIds(request)).filter(id => id === firstId || id === secondId)).toEqual([]);
  expect(browserIssues).toEqual([]);
});

async function createConnection(request: APIRequestContext, name: string, slug: string): Promise<string> {
  const response = await request.post(`${gatewayOrigin}/admin/api/v1/connections`, {
    headers: adminHeaders,
    data: {
      name,
      providerSlug: slug,
      endpoints: [{
        ref: "endpoint",
        name: "Chat",
        protocol: "openai-chat",
        baseUrl: `https://${slug}.invalid`,
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
        credentialRefs: ["credential"],
      }],
      accounts: [{
        ref: "account",
        name: "Primary",
        billingMode: "unknown",
        credentials: [{ ref: "credential", name: "Primary Key", secret: `fake-${slug}-provider-key` }],
      }],
    },
  });
  expect(response.status(), `创建 ${name} 失败`).toBe(201);
  const payload = await response.json() as { readonly data: { readonly id: string } };
  return payload.data.id;
}

async function listConnectionIds(request: APIRequestContext): Promise<string[]> {
  const response = await request.get(`${gatewayOrigin}/admin/api/v1/connections`, { headers: adminHeaders });
  expect(response.status()).toBe(200);
  const payload = await response.json() as { readonly data: readonly { readonly id: string }[] };
  return payload.data.map(connection => connection.id);
}

async function expectDeletionDialogReady(dialog: Locator): Promise<void> {
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Endpoint", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/历史 Request 和 Attempt 会保留/u)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "确认删除" })).toBeEnabled();
  await expect.poll(() => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const view = element.ownerDocument.defaultView;
    return view !== null
      && rect.left >= 0
      && rect.right <= view.innerWidth + 1
      && rect.top >= 0
      && rect.bottom <= view.innerHeight + 1;
  })).toBe(true);
}
