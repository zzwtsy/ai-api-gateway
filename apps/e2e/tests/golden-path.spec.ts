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

test("product pages keep implementation explanations and development fixtures out of task flows", async ({ page }) => {
  await page.setExtraHTTPHeaders({ authorization: "Bearer admin_dev_local" });
  await page.goto("/");

  await expect(page.getByText("最近请求", { exact: true })).toBeVisible();
  await expect(page.getByText("请求转发链路", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/TypeScript 6 单版本/u)).toHaveCount(0);
  await expect(page.getByText(/留给后续功能/u)).toHaveCount(0);

  await page.goto("/connections");
  await expect(page.getByRole("heading", { name: "连接" })).toBeVisible();
  await expect(page.getByText(/数据面不会跨协议转换/u)).toHaveCount(0);
  await expect(page.getByText(/账号与凭据将作为/u)).toHaveCount(0);
  await page.getByRole("button", { name: "添加连接" }).click();
  await expect(page.getByLabel("连接名称")).toHaveValue("");
  await expect(page.getByLabel("Provider 标识")).toHaveValue("");
  await expect(page.getByText("Provider 与访问凭据")).toBeVisible();
  await expect(page.getByLabel("上游 Base URL")).toHaveCount(0);
});
