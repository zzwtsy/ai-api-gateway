import type { components } from "@/api/schema";

export const connectionFixture: components["schemas"]["Connection"] = {
  id: "provider_01",
  name: "DeepSeek",
  providerSlug: "deepseek",
  presetKind: "custom",
  status: "active",
  endpoints: [{
    id: "endpoint_01",
    name: "主 Endpoint",
    protocol: "openai-chat",
    baseUrl: "https://api.example.com",
    requestPath: "/v1/chat/completions",
    authScheme: "bearer",
    supportsStreaming: true,
    status: "active",
  }],
  accounts: [{
    id: "account_01",
    name: "主账号",
    billingMode: "unknown",
    status: "active",
    credentials: [{
      id: "credential_01",
      name: "主 Key",
      maskedDisplay: "sk-••••abcd",
      status: "unverified",
      endpointIds: ["endpoint_01"],
      lastSuccessAt: null,
      lastFailureAt: null,
      createdAt: "2026-08-24T08:00:00.000Z",
      updatedAt: "2026-08-24T08:00:00.000Z",
      rotatedAt: null,
      disabledAt: null,
    }],
  }],
  createdAt: "2026-08-24T08:00:00.000Z",
  updatedAt: "2026-08-24T08:00:00.000Z",
};

export function modelBindingFixture(id: string, endpointId: string, name: string) {
  return {
    id,
    endpointId,
    upstreamModelId: `${id}-upstream`,
    name,
    status: "unverified" as const,
    createdAt: "2026-08-24T08:00:00.000Z",
    updatedAt: "2026-08-24T08:00:00.000Z",
  };
}

export function probeRunFixture(status: "running" | "succeeded"): components["schemas"]["CompatibilityProbeRun"] {
  return {
    id: "run-1",
    profileId: "compatibility-profile-1",
    connectionId: "provider_01",
    endpointId: "endpoint_01",
    credentialId: "credential_01",
    harnessProfileId: "profile-generic-openai-chat",
    model: "deepseek-chat",
    checks: ["basic", "stream"],
    status,
    totalChecks: 2,
    completedChecks: status === "succeeded" ? 2 : 1,
    currentCheck: status === "succeeded" ? null : "stream",
    errorMessage: null,
    createdAt: "2026-08-24T12:00:00.000Z",
    startedAt: "2026-08-24T12:00:00.000Z",
    completedAt: status === "succeeded" ? "2026-08-24T12:00:01.000Z" : null,
    updatedAt: "2026-08-24T12:00:00.500Z",
  };
}
