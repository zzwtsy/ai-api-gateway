import type { ConnectionDetailTab } from "./connection-detail-tabs";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsPage } from "./connections-page";

const hookMocks = vi.hoisted(() => ({
  addEndpoint: vi.fn(),
  createConnection: vi.fn(),
  refetchCompatibility: vi.fn(),
  resetCompatibility: vi.fn(),
  startCompatibility: vi.fn(),
  useConnectionCompatibility: vi.fn(),
  useAddConnectionEndpoint: vi.fn(),
  useDisableProviderCredential: vi.fn(),
  useProbeProviderCredential: vi.fn(),
  useConnections: vi.fn(),
  useCreateConnection: vi.fn(),
  useRotateProviderCredential: vi.fn(),
  useStartCompatibilityProbe: vi.fn(),
}));

vi.mock("./hooks", () => hookMocks);

const onConnectionIdChange = vi.fn();
const onConnectionTabChange = vi.fn();
const retryModelBindings = vi.fn();

beforeEach(() => {
  hookMocks.addEndpoint.mockReset();
  onConnectionIdChange.mockReset();
  onConnectionTabChange.mockReset();
  retryModelBindings.mockReset();
  hookMocks.createConnection.mockReset();
  hookMocks.refetchCompatibility.mockReset();
  hookMocks.resetCompatibility.mockReset();
  hookMocks.startCompatibility.mockReset();
  hookMocks.useConnections.mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isRefetchError: false,
    refetch: vi.fn(),
  });
  hookMocks.useCreateConnection.mockReturnValue({
    create: hookMocks.createConnection,
    error: null,
    isError: false,
    isPending: false,
  });
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
    rotate: vi.fn(),
  });
  hookMocks.useDisableProviderCredential.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    disable: vi.fn(),
  });
  hookMocks.useProbeProviderCredential.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    probe: vi.fn(),
  });
  hookMocks.useConnectionCompatibility.mockReturnValue({
    data: { profiles: [], facts: [], runs: [] },
    error: null,
    isError: false,
    isPending: false,
    isRefetchError: false,
    refetch: hookMocks.refetchCompatibility,
  });
  hookMocks.useStartCompatibilityProbe.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    reset: hookMocks.resetCompatibility,
    start: hookMocks.startCompatibility,
  });
});

describe("connections page states", () => {
  it("guides first use without prefilled development fixtures", async () => {
    const user = userEvent.setup();
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage();

    expect(screen.getByText("使用“添加连接”创建第一个上游 Endpoint。")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "添加连接" }));
    expect(screen.getByLabelText("连接名称")).toHaveValue("");
    expect(screen.getByLabelText("Provider 标识")).toHaveValue("");
    expect(screen.getByText("Provider 与访问凭据")).toBeVisible();
    expect(screen.queryByLabelText("上游 Base URL")).not.toBeInTheDocument();
  });

  it("renders a recoverable error without also claiming the directory is empty", () => {
    hookMocks.useConnections.mockReturnValue({
      data: undefined,
      error: new Error("连接目录暂时不可用"),
      isError: true,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage();

    expect(screen.getByText("无法加载连接")).toBeVisible();
    expect(screen.getByText("连接目录暂时不可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeVisible();
    expect(screen.queryByText("尚未创建控制面连接")).not.toBeInTheDocument();
  });
});

describe("connection URL selection", () => {
  it("keeps the cached directory visible when a background refresh fails", () => {
    hookMocks.useConnections.mockReturnValue({
      data: [{
        id: "conn_01",
        name: "主连接",
        providerSlug: "deepseek",
        presetKind: "custom",
        status: "active",
        endpoints: [{
          id: "endpoint_01",
          name: "默认 Endpoint",
          protocol: "openai-chat",
          baseUrl: "https://api.example.com",
          requestPath: "/v1/chat/completions",
          authScheme: "bearer",
          supportsStreaming: true,
          status: "active",
        }],
        accounts: [],
        createdAt: "2026-08-23T08:00:00.000Z",
        updatedAt: "2026-08-23T08:00:00.000Z",
      }],
      error: new Error("刷新失败"),
      isError: true,
      isLoading: false,
      isPending: false,
      isRefetchError: true,
      refetch: vi.fn(),
    });

    renderConnectionsPage();

    expect(screen.getAllByText("主连接").length).toBeGreaterThan(0);
    expect(screen.getByText("连接目录可能已过期")).toBeVisible();
    expect(screen.queryByText("尚未创建控制面连接")).not.toBeInTheDocument();
  });

  it("uses the URL-selected connection as the detail context", () => {
    hookMocks.useConnections.mockReturnValue({
      data: [
        connectionFixture("conn_01", "主连接"),
        connectionFixture("conn_02", "备用连接"),
      ],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage("conn_02");

    expect(screen.getByRole("button", { name: "备用连接" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "主连接" })).toHaveAttribute("aria-pressed", "false");
    expect(onConnectionIdChange).not.toHaveBeenCalled();
  });

  it.each([undefined, "missing-connection"])(
    "canonicalizes a missing or invalid URL selection (%s)",
    async (connectionId) => {
      hookMocks.useConnections.mockReturnValue({
        data: [connectionFixture("conn_01", "主连接")],
        error: null,
        isError: false,
        isLoading: false,
        isPending: false,
        isRefetchError: false,
        refetch: vi.fn(),
      });

      renderConnectionsPage(connectionId);

      await waitFor(() => {
        expect(onConnectionIdChange).toHaveBeenCalledWith("conn_01", { replace: true });
      });
    },
  );
});

describe("connection creation dialog", () => {
  it("validates the Provider step before revealing Endpoint settings", async () => {
    const user = userEvent.setup();
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));

    expect(screen.getByLabelText("连接名称")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByLabelText("上游 Base URL")).not.toBeInTheDocument();
  });

  it("selects the newly created connection and closes the dialog", async () => {
    const user = userEvent.setup();
    hookMocks.createConnection.mockResolvedValue({ id: "conn_new" });
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await user.type(screen.getByLabelText("连接名称"), "新连接");
    await user.type(screen.getByLabelText("Provider 标识"), "new-provider");
    await user.type(screen.getByLabelText("Provider API Key"), "provider-secret");
    await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
    await user.type(screen.getByLabelText("上游 Base URL"), "https://provider.example.com");
    await user.click(screen.getByRole("button", { name: "创建连接" }));

    await waitFor(() => {
      expect(onConnectionIdChange).toHaveBeenLastCalledWith("conn_new");
    });
    expect(screen.queryByRole("heading", { name: "添加连接" })).not.toBeInTheDocument();
  });

  it("shows Select labels and updates an untouched recommended request path", async () => {
    const user = userEvent.setup();
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await completeProviderStep(user, "protocol-default");
    const protocol = screen.getByRole("combobox", { name: "协议" });
    const requestPath = screen.getByLabelText("请求路径");
    expect(screen.getByLabelText("上游 Base URL")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("请输入合法的 URL")).not.toBeInTheDocument();
    expect(protocol).toHaveTextContent("OpenAI Chat Completions");

    await user.click(protocol);
    await user.click(screen.getByRole("option", { name: "OpenAI Responses" }));
    expect(protocol).toHaveTextContent("OpenAI Responses");
    expect(requestPath).toHaveValue("/v1/responses");
  });

  it("preserves a manually edited request path when the protocol changes", async () => {
    const user = userEvent.setup();
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });
    renderConnectionsPage();

    await user.click(screen.getByRole("button", { name: "添加连接" }));
    await completeProviderStep(user, "protocol-custom");
    const protocol = screen.getByRole("combobox", { name: "协议" });
    const requestPath = screen.getByLabelText("请求路径");
    await user.clear(requestPath);
    await user.type(requestPath, "/custom/chat");
    await user.click(protocol);
    await user.click(screen.getByRole("option", { name: "Anthropic Messages" }));

    expect(protocol).toHaveTextContent("Anthropic Messages");
    expect(requestPath).toHaveValue("/custom/chat");
  });
});

async function completeProviderStep(user: ReturnType<typeof userEvent.setup>, slug: string) {
  await user.type(screen.getByLabelText("连接名称"), `连接 ${slug}`);
  await user.type(screen.getByLabelText("Provider 标识"), slug);
  await user.type(screen.getByLabelText("Provider API Key"), "provider-secret");
  await user.click(screen.getByRole("button", { name: "下一步：Endpoint" }));
}

function renderConnectionsPage(
  connectionId: string | undefined = undefined,
  connectionTab: ConnectionDetailTab = "overview",
) {
  return render(
    <ConnectionsPage
      connectionId={connectionId}
      connectionTab={connectionTab}
      modelBindings={{
        data: [],
        error: null,
        loading: false,
        onRetry: retryModelBindings,
        stale: false,
      }}
      onConnectionIdChange={onConnectionIdChange}
      onConnectionTabChange={onConnectionTabChange}
    />,
  );
}

function connectionFixture(id: string, name: string) {
  return {
    id,
    name,
    providerSlug: `${id}-provider`,
    presetKind: "custom",
    status: "active",
    endpoints: [{
      id: `${id}-endpoint`,
      name: "默认 Endpoint",
      protocol: "openai-chat",
      baseUrl: "https://api.example.com",
      requestPath: "/v1/chat/completions",
      authScheme: "bearer",
      supportsStreaming: true,
      status: "active",
    }],
    accounts: [],
    createdAt: "2026-08-23T08:00:00.000Z",
    updatedAt: "2026-08-23T08:00:00.000Z",
  };
}
