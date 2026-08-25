import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
});

test("UX-LOGIN-LIFECYCLE: 登录页可直接打开并继承根主题", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "控制面登录" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
});

for (const path of ["/login", "/", "/requests", "/connections", "/models", "/clients"]) {
  test(`UX-A11Y-STABLE-PAGES: ${path} 没有自动可检测的 WCAG 2.2 AA 违规`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

function formatViolations(violations: readonly { readonly id: string; readonly help: string; readonly nodes: readonly unknown[] }[]): string {
  return violations
    .map(violation => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
    .join("\n");
}
