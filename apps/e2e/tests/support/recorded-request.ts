import type { APIRequestContext } from "@playwright/test";
import process from "node:process";

import { expect } from "@playwright/test";

const gatewayOrigin = `http://127.0.0.1:${process.env.AIGW_E2E_GATEWAY_PORT ?? "3001"}`;
const providerOrigin = `http://127.0.0.1:${process.env.AIGW_E2E_PROVIDER_PORT ?? "4010"}`;

export async function createRecordedRequest(request: APIRequestContext, model: string) {
  const body = {
    model,
    stream: true,
    messages: [{ role: "user", content: "hello" }],
    unknown_provider_extension: { preserved: true },
  };
  const gatewayResponse = await request.post(`${gatewayOrigin}/openai/v1/chat/completions`, {
    headers: {
      "authorization": "Bearer gw_dev_local_key",
      "content-type": "application/json",
    },
    data: body,
  });
  expect(gatewayResponse.status()).toBe(200);
  expect(await gatewayResponse.text()).toContain("data: [DONE]");

  const providerResponse = await request.get(`${providerOrigin}/received`, {
    params: { model },
  });
  const captured = await providerResponse.json() as { authorization: string; body: string };
  expect(captured.authorization).toBe("Bearer mock-provider-key");
  expect(JSON.parse(captured.body)).toEqual(body);

  const headers = { authorization: "Bearer admin_dev_local" };
  const listResponse = await request.get(`${gatewayOrigin}/admin/api/v1/requests`, { headers });
  const list = await listResponse.json() as {
    data: Array<{ id: string; outcome: string; requestedModel: string }>;
  };
  const recorded = list.data.find(item => item.requestedModel === model);
  expect(recorded?.outcome).toBe("succeeded");
  expect(recorded?.id).toBeTruthy();

  const requestId = recorded?.id ?? "missing-request-id";
  const detailResponse = await request.get(`${gatewayOrigin}/admin/api/v1/requests/${requestId}`, { headers });
  const detail = await detailResponse.json() as { data: { attempts: unknown[] } };
  expect(detail.data.attempts).toHaveLength(1);

  return { requestId };
}
