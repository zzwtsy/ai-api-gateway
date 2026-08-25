import { expect, test } from "@playwright/test";

import {
  createClientWorkspaceFixture,
  createModelWorkspaceFixture,
} from "./support/ux-workspace-fixture.js";

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
});

test("UX-THEME-PREFERENCE: system/light/dark 可切换并在刷新后恢复", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "system");

  await page.getByRole("button", { name: "选择界面主题" }).click();
  await page.getByRole("menuitemradio", { name: "浅色" }).click();
  await expect(page.getByRole("menuitemradio", { name: "浅色" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "选择界面主题" })).toBeFocused();
  await expect(page.locator("html")).toHaveClass(/light/u);
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "light");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/u);
  await expect(page.locator("meta[name=\"theme-color\"]")).toHaveAttribute("content", "#ffffff");

  await page.getByRole("button", { name: "选择界面主题" }).click();
  await page.getByRole("menuitemradio", { name: "深色" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator("meta[name=\"theme-color\"]")).toHaveAttribute("content", "#171717");
});

test("UX-THEME-STORAGE-SYNC: 同源浏览上下文共享主题偏好", async ({ browserName, context, page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  let peerThemeRoot = page.locator("html");
  if (browserName === "firefox") {
    await page.locator("body").evaluate((body) => {
      const frame = body.ownerDocument.createElement("iframe");
      frame.dataset.testid = "theme-peer";
      frame.src = "/";
      body.append(frame);
    });
    const peer = page.frameLocator("[data-testid=\"theme-peer\"]");
    await expect(peer.getByRole("button", { name: "选择界面主题" })).toBeVisible();
    peerThemeRoot = peer.locator("html");
  } else {
    const peer = await context.newPage();
    await peer.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
    await peer.goto("/", { waitUntil: "domcontentloaded" });
    await expect(peer.getByRole("button", { name: "选择界面主题" })).toBeVisible();
    peerThemeRoot = peer.locator("html");
  }

  await page.getByRole("button", { name: "选择界面主题" }).click();
  await page.getByRole("menuitemradio", { name: "深色" }).click();

  await expect(peerThemeRoot).toHaveClass(/dark/u);
  await expect(peerThemeRoot).toHaveAttribute("data-theme-preference", "dark");
});

test("UX-THEME-KEYBOARD: 主题菜单支持键盘选择并返回触发按钮", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "选择界面主题" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio", { name: "跟随系统" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitemradio", { name: "深色" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(trigger).toBeFocused();
});

test("UX-REFLOW-320: 已交付页面在 200% 等效宽度和 320 CSS px 下不产生文档横向滚动", async ({ page }) => {
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/requests", "/connections", "/models", "/clients"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect.poll(() => page.locator("html").evaluate(element => element.scrollWidth - element.clientWidth))
        .toBeLessThanOrEqual(1);
    }
  }
});

test("UX-MODELS-INSPECTOR-LIFECYCLE: 模型 Inspector 保持非模态 URL 工作台", async ({ page, request }) => {
  const fixture = await createModelWorkspaceFixture(request);
  const [firstBindingId, secondBindingId] = fixture.modelBindingIds;

  for (const viewport of [
    { width: 1440, height: 1000, sideBySide: true },
    { width: 1280, height: 900, sideBySide: false },
    { width: 1024, height: 768, sideBySide: false },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/models?modelBindingId=${encodeURIComponent(firstBindingId)}`);
    const master = page.locator("[data-slot=\"models-master\"]");
    const inspector = page.getByRole("region", { name: /主模型/u });
    await expect(master).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectWorkspaceGeometry(page, master, inspector, viewport.sideBySide);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/models?modelBindingId=${encodeURIComponent(firstBindingId)}`);
  await page.locator(`#model-binding-detail-trigger-${secondBindingId}`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("modelBindingId")).toBe(secondBindingId);
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("modelBindingId")).toBe(firstBindingId);
});

test("UX-CLIENTS-INSPECTOR-LIFECYCLE: 客户端 Inspector 单屏且正文内部滚动", async ({ page, request }) => {
  const fixture = await createClientWorkspaceFixture(request, { clientRotations: 7 });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`/clients?clientId=${encodeURIComponent(fixture.clientId)}`);

  const master = page.locator("[data-slot=\"clients-master\"]");
  const inspector = page.getByRole("region", { name: /UX 客户端/u });
  const body = inspector.locator("[data-slot=\"inspector-body\"]");
  const header = inspector.locator("#client-inspector-title");
  await expectWorkspaceGeometry(page, master, inspector, false);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(fixture.clientSecret, { exact: true })).toHaveCount(0);

  const scrollState = await body.evaluate(element => ({
    clientHeight: element.clientHeight,
    overflowY: element.ownerDocument.defaultView?.getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollState.overflowY).toBe("auto");
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

  const headerTop = await header.evaluate(element => element.getBoundingClientRect().top);
  await body.evaluate(element => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => header.evaluate(element => Math.round(element.getBoundingClientRect().top)))
    .toBe(Math.round(headerTop));
});

async function expectWorkspaceGeometry(
  page: import("@playwright/test").Page,
  master: import("@playwright/test").Locator,
  inspector: import("@playwright/test").Locator,
  sideBySide: boolean,
): Promise<void> {
  const masterBox = await master.boundingBox();
  const inspectorBox = await inspector.boundingBox();
  const workspaceBox = await page.locator("[data-slot=\"workspace-content\"]").boundingBox();
  expect(masterBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  if (masterBox === null || inspectorBox === null || workspaceBox === null)
    return;
  if (sideBySide)
    expect(inspectorBox.x).toBeGreaterThan(masterBox.x + masterBox.width - 2);
  else
    expect(inspectorBox.y).toBeGreaterThan(masterBox.y + masterBox.height - 2);
  expect(inspectorBox.height).toBeLessThanOrEqual(workspaceBox.height + 1);
  const documentOverflow = await page.locator("html").evaluate(element => element.scrollWidth - element.clientWidth);
  expect(documentOverflow).toBeLessThanOrEqual(1);
}
