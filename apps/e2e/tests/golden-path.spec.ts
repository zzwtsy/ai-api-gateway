import { expect, test } from "@playwright/test";

import { createRecordedRequest } from "./support/recorded-request.js";

test("OpenAI Chat request reaches the provider and appears as one Request with one Attempt", async ({ page, request }) => {
  await createRecordedRequest(request, "demo-model");

  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "请求" })).toBeVisible();
  await page.getByText("demo-model").first().click();
  await expect(page.getByText("第 1 次尝试")).toBeVisible();
  await expect(page.getByText("bootstrap-provider-credential")).toBeVisible();
});
