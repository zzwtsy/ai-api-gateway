import { expect, test } from "@playwright/test";

test("OpenAI Chat request reaches the provider and appears as one Request with one Attempt", async ({ page, request }) => {
  const body = {
    model: "demo-model",
    stream: true,
    messages: [{ role: "user", content: "hello" }],
    unknown_provider_extension: { preserved: true },
  };
  const gatewayResponse = await request.post("http://127.0.0.1:3001/openai/v1/chat/completions", {
    headers: {
      authorization: "Bearer gw_dev_local_key",
      "content-type": "application/json",
    },
    data: body,
  });
  expect(gatewayResponse.status()).toBe(200);
  expect(await gatewayResponse.text()).toContain("data: [DONE]");

  const providerResponse = await request.get("http://127.0.0.1:4010/received");
  const captured = await providerResponse.json() as { authorization: string; body: string };
  expect(captured.authorization).toBe("Bearer mock-provider-key");
  expect(JSON.parse(captured.body)).toEqual(body);

  const listResponse = await request.get("http://127.0.0.1:3001/admin/api/v1/requests", {
    headers: { authorization: "Bearer admin_dev_local" },
  });
  const list = await listResponse.json() as { data: Array<{ id: string; outcome: string }> };
  expect(list.data).toHaveLength(1);
  expect(list.data[0]?.outcome).toBe("succeeded");

  const detailResponse = await request.get(`http://127.0.0.1:3001/admin/api/v1/requests/${list.data[0]?.id}`, {
    headers: { authorization: "Bearer admin_dev_local" },
  });
  const detail = await detailResponse.json() as { data: { attempts: unknown[] } };
  expect(detail.data.attempts).toHaveLength(1);

  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "请求" })).toBeVisible();
  await page.getByText("demo-model").first().click();
  await expect(page.getByText("Attempt 1")).toBeVisible();
  await expect(page.getByText("bootstrap-provider-credential")).toBeVisible();
});
