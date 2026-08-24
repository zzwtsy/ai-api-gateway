import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const desktopViewports = [
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
] as const;

for (const viewport of desktopViewports) {
  test(`Sidebar 在 ${viewport.width}x${viewport.height} 保持折叠合同`, async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    await page.setViewportSize(viewport);
    await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
    await page.context().clearCookies();
    await page.goto("/requests");

    const sidebar = page.locator("[data-slot=\"sidebar\"][data-state]");
    const trigger = page.getByRole("button", { name: "切换侧边栏" });
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await expect(page.locator("[data-slot=\"topbar-title\"]")).toHaveText("请求");
    await expect(page.getByRole("link", { name: "请求", exact: true }))
      .toHaveAttribute("data-active", "");
    await expectNoDocumentOverflow(page);

    await trigger.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await expect.poll(async () => page.context().cookies())
      .toContainEqual(expect.objectContaining({ name: "sidebar_state", value: "false" }));
    await expectNoDocumentOverflow(page);

    await page.reload();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");

    const requestsLink = page.getByRole("link", { name: "请求", exact: true });
    await requestsLink.hover();
    const tooltip = page.locator("[data-slot=\"tooltip-content\"]", { hasText: "请求" });
    await expect(tooltip).toBeVisible();
    await expectAtTop(tooltip);

    await page.keyboard.press("Control+b");
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(browserErrors).toEqual([]);
  });
}

test("Select Portal 在 Sidebar 与 Inset 之上", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
  await page.goto("/connections");
  await page.getByRole("button", { name: "添加连接" }).click();
  await page.getByLabel("连接名称").fill("Portal 测试连接");
  await page.getByLabel("Provider 标识").fill("portal-test");
  await page.getByLabel("Provider API Key").fill("provider-portal-test-key");
  await page.getByRole("button", { name: "下一步：Endpoint" }).click();
  await page.getByRole("combobox", { name: "协议" }).click();

  const popup = page.locator("[data-slot=\"select-content\"][data-open]");
  await expect(popup).toBeVisible();
  await expectAtTop(popup);
  expect(browserErrors).toEqual([]);
});

test("窄视口使用官方 Sidebar Sheet", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 700, height: 800 });
  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
  await page.goto("/requests");

  const trigger = page.getByRole("button", { name: "切换侧边栏" });
  await trigger.click();
  const mobileSidebar = page.locator("[data-slot=\"sidebar\"][data-mobile=\"true\"]");
  const overlay = page.locator("[data-slot=\"sheet-overlay\"]");
  await expect(mobileSidebar).toBeVisible();
  await expect(overlay).toBeVisible();
  await expectAtTop(mobileSidebar);
  await expect.poll(async () => mobileSidebar.evaluate(element => (
    element.contains(element.ownerDocument.activeElement)
  ))).toBe(true);

  await page.mouse.click(650, 400);
  await expect(mobileSidebar).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(browserErrors).toEqual([]);
});

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

async function expectAtTop(locator: Locator): Promise<void> {
  await expect.poll(async () => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + Math.min(rect.height / 2, 12);
    const topElement = element.ownerDocument.elementFromPoint(x, y);
    return topElement !== null && (element === topElement || element.contains(topElement));
  })).toBe(true);
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  await expect.poll(async () => page.locator("html").evaluate(element => (
    element.scrollWidth <= element.clientWidth
  ))).toBe(true);
}
