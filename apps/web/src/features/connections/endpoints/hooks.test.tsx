import type { ReactNode } from "react";
import type { UpdateEndpointInput } from "./hooks";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api-runtime/client";
import {
  useDeleteEndpoint,
  useEndpointDeletionImpact,
  useUpdateEndpoint,
} from "../hooks";

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal("fetch", mock);
  return mock;
});

const updateInput: UpdateEndpointInput = {
  name: "Responses Endpoint",
  protocol: "openai-responses",
  baseUrl: "https://api.example.com",
  requestPath: "/v1/responses",
  authScheme: "bearer",
  supportsStreaming: true,
  credentialIds: ["credential_01"],
};

describe("Endpoint lifecycle hooks", () => {
  let requests: RecordedRequest[];
  let responses: ResponseSpec[];

  beforeEach(() => {
    requests = [];
    responses = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push({
        body: request.body === null ? null : await request.clone().text(),
        method: request.method,
        url: request.url,
      });
      const response = responses.shift();
      if (response === undefined) {
        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
      }
      return jsonResponse(response.status, response.body);
    });
  });

  it("sends a typed PATCH and invalidates only the three Endpoint dependency queries after success", async () => {
    responses.push({ status: 200, body: successEnvelope({ id: "connection_01" }) });
    const queryClient = createQueryClient();
    const keys = seedDependencyQueries(queryClient, "connection_01");
    const otherCompatibilityKey = compatibilityKey("connection_02");
    queryClient.setQueryData(otherCompatibilityKey, { data: "other" });
    const { result } = renderHook(() => useUpdateEndpoint("connection_01"), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await result.current.update("endpoint_01", updateInput);
    });

    expect(requests).toEqual([{
      body: JSON.stringify(updateInput),
      method: "PATCH",
      url: "http://localhost:3000/admin/api/v1/endpoints/endpoint_01",
    }]);
    expectInvalidated(queryClient, keys);
    expect(queryClient.getQueryState(otherCompatibilityKey)?.isInvalidated).toBe(false);
  });

  it("sends DELETE without a body and invalidates the same precise dependencies after success", async () => {
    responses.push({ status: 200, body: successEnvelope({ id: "connection_01" }) });
    const queryClient = createQueryClient();
    const keys = seedDependencyQueries(queryClient, "connection_01");
    const { result } = renderHook(() => useDeleteEndpoint("connection_01"), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await result.current.remove("endpoint_01");
    });

    expect(requests).toEqual([{
      body: null,
      method: "DELETE",
      url: "http://localhost:3000/admin/api/v1/endpoints/endpoint_01",
    }]);
    expectInvalidated(queryClient, keys);
  });

  it("does not invalidate dependency queries when PATCH fails", async () => {
    responses.push({
      status: 409,
      body: errorEnvelope("ENDPOINT_ACTIVE_PROBE"),
    });
    const queryClient = createQueryClient();
    const keys = seedDependencyQueries(queryClient, "connection_01");
    const { result } = renderHook(() => useUpdateEndpoint("connection_01"), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await expect(result.current.update("endpoint_01", updateInput)).rejects.toBeTruthy();
    });

    for (const key of keys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
  });

  it("does not invalidate dependency queries when DELETE fails", async () => {
    responses.push({
      status: 409,
      body: errorEnvelope("ENDPOINT_ACTIVE_PROBE"),
    });
    const queryClient = createQueryClient();
    const keys = seedDependencyQueries(queryClient, "connection_01");
    const { result } = renderHook(() => useDeleteEndpoint("connection_01"), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await expect(result.current.remove("endpoint_01")).rejects.toBeTruthy();
    });

    for (const key of keys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
  });

  it("fetches deletion impact only for an open flow with an Endpoint and isolates each Endpoint cache key", async () => {
    responses.push(
      { status: 200, body: successEnvelope(deletionImpact(1)) },
      { status: 200, body: successEnvelope(deletionImpact(2)) },
    );
    const queryClient = createQueryClient();
    const { result, rerender } = renderHook(
      ({ enabled, endpointId }: { enabled: boolean; endpointId: string | undefined }) => (
        useEndpointDeletionImpact(endpointId, enabled)
      ),
      {
        initialProps: { enabled: false, endpointId: "endpoint_01" as string | undefined },
        wrapper: wrapperFor(queryClient),
      },
    );

    expect(requests).toHaveLength(0);
    rerender({ enabled: true, endpointId: undefined });
    await Promise.resolve();
    expect(requests).toHaveLength(0);

    rerender({ enabled: true, endpointId: "endpoint_01" });
    await waitFor(() => expect(result.current.data?.modelBindingCount).toBe(1));
    rerender({ enabled: true, endpointId: "endpoint_02" });
    await waitFor(() => expect(result.current.data?.modelBindingCount).toBe(2));

    expect(requests.map(request => request.url)).toEqual([
      "http://localhost:3000/admin/api/v1/endpoints/endpoint_01/deletion-impact",
      "http://localhost:3000/admin/api/v1/endpoints/endpoint_02/deletion-impact",
    ]);
    expect(queryClient.getQueryData(deletionImpactKey("endpoint_01"))).toMatchObject({
      data: { modelBindingCount: 1 },
    });
    expect(queryClient.getQueryData(deletionImpactKey("endpoint_02"))).toMatchObject({
      data: { modelBindingCount: 2 },
    });
  });
});

interface RecordedRequest {
  body: string | null;
  method: string;
  url: string;
}

interface ResponseSpec {
  body: unknown;
  status: number;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function connectionsKey() {
  return api.queryOptions("get", "/admin/api/v1/connections").queryKey;
}

function compatibilityKey(connectionId: string) {
  return api.queryOptions("get", "/admin/api/v1/connections/{connectionId}/compatibility", {
    params: { path: { connectionId } },
  }).queryKey;
}

function modelBindingsKey() {
  return api.queryOptions("get", "/admin/api/v1/models").queryKey;
}

function deletionImpactKey(endpointId: string) {
  return api.queryOptions("get", "/admin/api/v1/endpoints/{endpointId}/deletion-impact", {
    params: { path: { endpointId } },
  }).queryKey;
}

function seedDependencyQueries(queryClient: QueryClient, connectionId: string) {
  const keys = [connectionsKey(), compatibilityKey(connectionId), modelBindingsKey()] as const;
  for (const key of keys) {
    queryClient.setQueryData(key, { data: "current" });
  }
  return keys;
}

function expectInvalidated(queryClient: QueryClient, keys: readonly (readonly unknown[])[]) {
  for (const key of keys) {
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  }
}

function deletionImpact(modelBindingCount: number) {
  return {
    credentialBindingCount: 1,
    modelBindingCount,
    compatibilityProfileCount: 1,
    compatibilityFactCount: 1,
    completedProbeRunCount: 1,
    activeProbeRunCount: 0,
    blocked: false,
  };
}

function successEnvelope(data: unknown) {
  return {
    success: true,
    code: "COMMON_OK",
    message: "成功",
    data,
    error: null,
    meta: { requestId: "request_test" },
  };
}

function errorEnvelope(code: string) {
  return {
    success: false,
    code,
    message: "操作失败",
    data: null,
    error: { type: "business" },
    meta: { requestId: "request_test" },
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
