import type { ReactNode } from "react";
import type { ConnectionModelBindingsState } from "./connection-detail";
import type { ConnectionDetailTab } from "./connection-detail-tabs";
import type { components } from "@/api/schema";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionDetail } from "./connection-detail";
import { connectionFixture as connection } from "./connection-detail.test-fixtures";

const hookMocks = vi.hoisted(() => ({
  addEndpoint: vi.fn(),
  disable: vi.fn(),
  probe: vi.fn(),
  rotate: vi.fn(),
  startCompatibility: vi.fn(),
  resetCompatibility: vi.fn(),
  refetchCompatibility: vi.fn(),
  useConnectionCompatibility: vi.fn(),
  useAddConnectionEndpoint: vi.fn(),
  useDisableProviderCredential: vi.fn(),
  useProbeProviderCredential: vi.fn(),
  useRotateProviderCredential: vi.fn(),
  useStartCompatibilityProbe: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => (
    <a className={className} href="/models">{children}</a>
  ),
}));
vi.mock("./hooks", () => hookMocks);

const onTabChange = vi.fn();
let startCompatibilityData: { data: components["schemas"]["CompatibilityProbeRun"] } | undefined;
const emptyModelBindings: ConnectionModelBindingsState = {
  data: [],
  error: null,
  loading: false,
  onRetry: vi.fn(),
  stale: false,
};

beforeEach(() => {
  hookMocks.addEndpoint.mockReset();
  hookMocks.disable.mockReset();
  hookMocks.rotate.mockReset();
  hookMocks.probe.mockReset();
  hookMocks.startCompatibility.mockReset();
  startCompatibilityData = undefined;
  hookMocks.resetCompatibility.mockReset();
  hookMocks.refetchCompatibility.mockReset();
  onTabChange.mockReset();
  hookMocks.useAddConnectionEndpoint.mockReturnValue({
    add: hookMocks.addEndpoint,
    error: null,
    isError: false,
    isPending: false,
  });
  hookMocks.useRotateProviderCredential.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    rotate: hookMocks.rotate,
  });
  hookMocks.useDisableProviderCredential.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    disable: hookMocks.disable,
  });
  hookMocks.useProbeProviderCredential.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    probe: hookMocks.probe,
  });
  hookMocks.useConnectionCompatibility.mockReturnValue({
    data: { profiles: [], facts: [], runs: [] },
    error: null,
    isError: false,
    isPending: false,
    isRefetchError: false,
    refetch: hookMocks.refetchCompatibility,
  });
  hookMocks.useStartCompatibilityProbe.mockImplementation(() => ({
    data: startCompatibilityData,
    error: null,
    isError: false,
    isPending: false,
    reset: hookMocks.resetCompatibility,
    start: hookMocks.startCompatibility,
  }));
});

describe("connection detail credential actions", () => {
  it("shows only the masked credential and its endpoint binding", () => {
    renderConnectionDetail("accounts");

    expect(screen.getByText("sk-••••abcd")).toBeVisible();
    expect(screen.getByText("主 Endpoint")).toBeVisible();
    expect(screen.getAllByText("未验证").length).toBeGreaterThan(0);
  });

  it("clears the rotation form after replacing a credential secret", async () => {
    const user = userEvent.setup();
    hookMocks.rotate.mockResolvedValue(undefined);
    renderConnectionDetail("accounts");

    await user.click(screen.getByRole("button", { name: "轮换" }));
    await user.type(screen.getByLabelText("新的 Provider Secret"), "provider-secret-value");
    await user.click(screen.getByRole("button", { name: "保存新 Secret" }));

    expect(hookMocks.rotate).toHaveBeenCalledWith("credential_01", { secret: "provider-secret-value" });
    expect(screen.queryByLabelText("新的 Provider Secret")).not.toBeInTheDocument();
    expect(screen.queryByText("provider-secret-value")).not.toBeInTheDocument();
  });

  it("requires confirmation before disabling a credential", async () => {
    const user = userEvent.setup();
    hookMocks.disable.mockResolvedValue(undefined);
    renderConnectionDetail("accounts");

    await user.click(screen.getByRole("button", { name: "禁用" }));
    expect(hookMocks.disable).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认禁用" }));
    expect(hookMocks.disable).toHaveBeenCalledWith("credential_01");
  });

  it("requires an explicit model and fee-labelled action before probing", async () => {
    const user = userEvent.setup();
    hookMocks.probe.mockResolvedValue({
      credentialId: "credential_01",
      endpointId: "endpoint_01",
      model: "deepseek-chat",
      outcome: "succeeded",
      classification: "healthy",
      statusCode: 200,
      checkedAt: "2026-08-24T08:00:00.000Z",
    });
    renderConnectionDetail("accounts");

    await user.click(screen.getByRole("button", { name: "测试" }));
    expect(screen.getByText("该测试可能产生 Provider 费用")).toBeVisible();
    const submit = screen.getByRole("button", { name: "发送计费测试请求" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("请求模型"), "deepseek-chat");
    await user.click(submit);

    expect(hookMocks.probe).toHaveBeenCalledWith("credential_01", {
      endpointId: "endpoint_01",
      model: "deepseek-chat",
    });
    expect(screen.getByText("最小连通性测试成功")).toBeVisible();
  });
});

describe("connection detail views", () => {
  it("renders only known configuration facts in the overview", () => {
    renderConnectionDetail("overview");

    expect(screen.getByText("“启用”不代表兼容")).toBeVisible();
    expect(screen.getByText(/请在“兼容性”中测试流式、Usage 和字段支持/u)).toBeVisible();
    expect(screen.queryByRole("button", { name: "完整兼容性测试" })).not.toBeInTheDocument();
    expect(screen.queryByText("sk-••••abcd")).not.toBeInTheDocument();
  });

  it("reports a supported tab change through the controlled contract", async () => {
    const user = userEvent.setup();
    renderConnectionDetail("overview");

    await user.click(screen.getByRole("tab", { name: "Endpoints" }));

    expect(onTabChange).toHaveBeenCalledWith("endpoints");
  });

  it("adds another protocol Endpoint with an explicit Credential binding", async () => {
    const user = userEvent.setup();
    hookMocks.addEndpoint.mockResolvedValue({});
    renderConnectionDetail("endpoints");

    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));
    await user.type(screen.getByLabelText("Endpoint 名称"), "Responses Endpoint");
    const protocol = screen.getByRole("combobox", { name: "协议" });
    await user.click(protocol);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));

    expect(protocol).toHaveTextContent("OpenAI Responses");
    expect(screen.getByLabelText("请求路径")).toHaveValue("/v1/responses");
    expect(screen.getByRole("checkbox", { name: /主账号 · 主 Key/u })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "添加 Endpoint" }));

    expect(hookMocks.addEndpoint).toHaveBeenCalledWith("provider_01", {
      name: "Responses Endpoint",
      protocol: "openai-responses",
      baseUrl: "https://api.example.com",
      requestPath: "/v1/responses",
      authScheme: "bearer",
      supportsStreaming: true,
      credentialIds: ["credential_01"],
    });
    expect(screen.queryByRole("heading", { name: "添加 Endpoint" })).not.toBeInTheDocument();
  });

  it("disables Add Endpoint when the Provider has no usable Credential", () => {
    const disabledConnection = {
      ...connection,
      accounts: connection.accounts.map(account => ({
        ...account,
        credentials: account.credentials.map(credential => ({
          ...credential,
          status: "disabled" as const,
        })),
      })),
    };
    render(
      <ConnectionDetail
        connection={disabledConnection}
        modelBindings={emptyModelBindings}
        onTabChange={onTabChange}
        tab="endpoints"
      />,
    );

    expect(screen.getByRole("button", { name: "添加 Endpoint" })).toBeDisabled();
    expect(screen.getByText("需要至少一个未禁用的 Credential 才能添加 Endpoint。")).toBeVisible();
  });

  it("covers UX-CONNECTIONS-DETAIL-PROBE: starts a fee-labelled full probe and keeps progress in a closeable sheet", async () => {
    const user = userEvent.setup();
    const run = probeRunFixture("running");
    hookMocks.startCompatibility.mockImplementation(async () => {
      startCompatibilityData = { data: run };
      return run;
    });
    renderConnectionDetail("compatibility");

    await user.click(screen.getByRole("button", { name: "开始完整测试" }));
    expect(screen.getByText("会发送多次真实上游请求")).toBeVisible();
    expect(screen.getByText(/完整 Secret 不会返回浏览器/u)).toBeVisible();
    await user.type(screen.getByLabelText("实测模型 ID"), "deepseek-chat");
    await user.click(screen.getByRole("button", { name: "开始计费测试" }));

    expect(hookMocks.startCompatibility).toHaveBeenCalledWith("endpoint_01", {
      credentialId: "credential_01",
      model: "deepseek-chat",
    });
    expect(onTabChange).toHaveBeenCalledWith("compatibility");
    expect(await screen.findByText("正在测试兼容性")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "关闭并后台继续" }));
    expect(screen.queryByText("正在测试兼容性")).not.toBeInTheDocument();
  });

  it("renders durable model-scoped compatibility facts after refresh", () => {
    hookMocks.useConnectionCompatibility.mockReturnValue({
      data: {
        profiles: [{
          id: "compatibility-profile-1",
          connectionId: "provider_01",
          endpointId: "endpoint_01",
          harnessProfileId: "profile-generic-openai-chat",
          status: "partial",
          lastProbeAt: "2026-08-24T12:00:00.000Z",
          summary: "已记录 10 项实测事实，其中 8 项通过。",
        }],
        facts: [{
          profileId: "compatibility-profile-1",
          featureKey: "stream.sse",
          supportLevel: "supported",
          evidenceSource: "probed",
          evidenceRef: "run-1",
          verifiedModelId: "deepseek-chat",
          verifiedAt: "2026-08-24T12:00:00.000Z",
          notes: "SSE 包含语义事件和协议终态。",
        }],
        runs: [probeRunFixture("succeeded")],
      },
      error: null,
      isError: false,
      isPending: false,
      isRefetchError: false,
      refetch: hookMocks.refetchCompatibility,
    });

    renderConnectionDetail("compatibility");

    expect(screen.getByText("部分兼容")).toBeVisible();
    expect(screen.getByText("SSE")).toBeVisible();
    expect(screen.getByText("deepseek-chat")).toBeVisible();
    expect(screen.getByText("SSE 包含语义事件和协议终态。")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新测试" })).toBeVisible();
  });

  it("shows only model bindings owned by the selected connection", () => {
    renderConnectionDetail("models", {
      ...emptyModelBindings,
      data: [
        modelBindingFixture("model_01", "endpoint_01", "当前连接模型"),
        modelBindingFixture("model_02", "endpoint_other", "其他连接模型"),
      ],
    });

    expect(screen.getByText("当前连接模型")).toBeVisible();
    expect(screen.queryByText("其他连接模型")).not.toBeInTheDocument();
  });

  it("keeps a model query failure inside the models tab and offers retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn().mockResolvedValue(undefined);
    renderConnectionDetail("models", {
      data: undefined,
      error: new Error("模型服务不可用"),
      loading: false,
      onRetry,
      stale: false,
    });

    expect(screen.getByText("无法加载模型绑定")).toBeVisible();
    expect(screen.getByText("模型服务不可用")).toBeVisible();
    expect(screen.getByText("DeepSeek")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "重新加载" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

function renderConnectionDetail(
  tab: ConnectionDetailTab,
  modelBindings: ConnectionModelBindingsState = emptyModelBindings,
) {
  return render(
    <ConnectionDetail
      connection={connection}
      modelBindings={modelBindings}
      onTabChange={onTabChange}
      tab={tab}
    />,
  );
}

function modelBindingFixture(id: string, endpointId: string, name: string) {
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

function probeRunFixture(status: "running" | "succeeded"): components["schemas"]["CompatibilityProbeRun"] {
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
