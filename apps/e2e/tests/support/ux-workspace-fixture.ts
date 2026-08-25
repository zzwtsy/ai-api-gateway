import type { APIRequestContext } from "@playwright/test";

import process from "node:process";

const gatewayPort = process.env.AIGW_E2E_GATEWAY_PORT ?? "3001";
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;
const headers = { authorization: "Bearer admin_dev_local" };

export interface ModelWorkspaceFixture {
  readonly connectionId: string;
  readonly endpointId: string;
  readonly modelBindingIds: readonly [string, string];
}

export interface ClientWorkspaceFixture {
  readonly clientId: string;
  readonly clientSecret: string;
}

export async function createModelWorkspaceFixture(
  request: APIRequestContext,
): Promise<ModelWorkspaceFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const connectionResponse = await request.post(`${gatewayOrigin}/admin/api/v1/connections`, {
    headers,
    data: {
      name: `UX 上游 ${suffix}`,
      providerSlug: `ux-${suffix}`,
      endpoint: {
        name: "默认 Endpoint",
        protocol: "openai-chat",
        baseUrl: `https://ux-${suffix}.invalid`,
        requestPath: "/v1/chat/completions",
        authScheme: "bearer",
        supportsStreaming: true,
      },
      account: { name: "主账号", billingMode: "unknown" },
      credential: { name: "主 Key", secret: `provider-${suffix}` },
    },
  });
  assertStatus(connectionResponse.status(), 201, "创建 UX 连接");
  const connectionPayload = await connectionResponse.json() as {
    data: { id: string; endpoints: readonly [{ id: string }] };
  };
  const connectionId = connectionPayload.data.id;
  const endpointId = connectionPayload.data.endpoints[0].id;

  const modelBindingIds = await Promise.all(["主模型", "备用模型"].map(async (name, index) => {
    const response = await request.post(`${gatewayOrigin}/admin/api/v1/models`, {
      headers,
      data: {
        endpointId,
        upstreamModelId: `ux-model-${index}-${suffix}`,
        name: `${name} ${suffix}`,
      },
    });
    assertStatus(response.status(), 201, `创建 ${name}`);
    const payload = await response.json() as { data: { id: string } };
    return payload.data.id;
  }));

  return {
    connectionId,
    endpointId,
    modelBindingIds: modelBindingIds as [string, string],
  };
}

export async function createClientWorkspaceFixture(
  request: APIRequestContext,
  options: { readonly clientRotations?: number } = {},
): Promise<ClientWorkspaceFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const clientResponse = await request.post(`${gatewayOrigin}/admin/api/v1/clients`, {
    headers,
    data: {
      name: `UX 客户端 ${suffix}`,
      profileSlug: "codex",
      allowedProtocols: ["openai-responses"],
    },
  });
  assertStatus(clientResponse.status(), 201, "创建 UX 客户端");
  const clientPayload = await clientResponse.json() as {
    data: { client: { id: string }; key: string };
  };
  for (let index = 0; index < (options.clientRotations ?? 0); index += 1) {
    const rotateResponse = await request.post(
      `${gatewayOrigin}/admin/api/v1/clients/${encodeURIComponent(clientPayload.data.client.id)}/keys/rotate`,
      { headers, data: { overlapHours: 24 } },
    );
    assertStatus(rotateResponse.status(), 200, `轮换 UX 客户端 Key ${index + 1}`);
  }

  return {
    clientId: clientPayload.data.client.id,
    clientSecret: clientPayload.data.key,
  };
}

function assertStatus(actual: number, expected: number, operation: string): void {
  if (actual !== expected)
    throw new Error(`${operation}失败：期望 HTTP ${expected}，收到 ${actual}`);
}
