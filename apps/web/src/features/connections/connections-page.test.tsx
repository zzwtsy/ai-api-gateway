import type { ConnectionDetailTab } from "./connection-detail-tabs";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsPage } from "./connections-page";

const hookMocks = vi.hoisted(() => ({
  refetchCompatibility: vi.fn(),
  resetCompatibility: vi.fn(),
  startCompatibility: vi.fn(),
  useConnectionDeletionImpact: vi.fn(),
  useConnectionCompatibility: vi.fn(),
  useAddConnectionEndpoint: vi.fn(),
  useDeleteConnection: vi.fn(),
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
  onConnectionIdChange.mockReset();
  onConnectionTabChange.mockReset();
  retryModelBindings.mockReset();
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
    create: vi.fn(),
    error: null,
    isError: false,
    isPending: false,
  });
  hookMocks.useAddConnectionEndpoint.mockReturnValue({
    add: vi.fn(),
    error: null,
    isError: false,
    isPending: false,
  });
  hookMocks.useRotateProviderCredential.mockReturnValue({ error: null, isError: false, isPending: false, rotate: vi.fn() });
  hookMocks.useDisableProviderCredential.mockReturnValue({ error: null, isError: false, isPending: false, disable: vi.fn() });
  hookMocks.useProbeProviderCredential.mockReturnValue({ error: null, isError: false, isPending: false, probe: vi.fn() });
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
  hookMocks.useConnectionDeletionImpact.mockReturnValue({
    data: {
      endpointCount: 1,
      accountCount: 0,
      credentialCount: 0,
      credentialBindingCount: 0,
      modelBindingCount: 0,
      compatibilityProfileCount: 0,
      compatibilityFactCount: 0,
      completedProbeRunCount: 0,
      activeProbeRunCount: 0,
      blocked: false,
      blockedReason: null,
    },
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  });
  hookMocks.useDeleteConnection.mockReturnValue({
    error: null,
    isError: false,
    isPending: false,
    remove: vi.fn(),
  });
});

describe("connections page states", () => {
  it("covers UX-CONNECTIONS-DIRECTORY-LIFECYCLE: guides first use without prefilled development fixtures", async () => {
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

    expect(screen.getByText("尚未添加连接")).toBeVisible();
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
      data: [connectionFixture("conn_01", "主连接")],
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
      data: [connectionFixture("conn_01", "主连接"), connectionFixture("conn_02", "备用连接")],
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

  it("selects the next Provider after deleting the current connection", async () => {
    const user = userEvent.setup();
    const removeConnection = vi.fn().mockResolvedValue({ connectionId: "conn_01" });
    hookMocks.useDeleteConnection.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      remove: removeConnection,
    });
    hookMocks.useConnections.mockReturnValue({
      data: [connectionFixture("conn_01", "主连接"), connectionFixture("conn_02", "备用连接")],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    renderConnectionsPage("conn_01");
    await user.click(screen.getByRole("button", { name: "删除连接" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(removeConnection).toHaveBeenCalledWith("conn_01");
    expect(onConnectionIdChange).toHaveBeenCalledWith("conn_02", { replace: true });
  });

  it("clears the URL and focuses Add Connection after deleting the last connection", async () => {
    const user = userEvent.setup();
    const removeConnection = vi.fn().mockResolvedValue({ connectionId: "conn_01" });
    hookMocks.useDeleteConnection.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      remove: removeConnection,
    });
    hookMocks.useConnections.mockReturnValue({
      data: [connectionFixture("conn_01", "主连接")],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });

    const view = renderConnectionsPage("conn_01");
    await user.click(screen.getByRole("button", { name: "删除连接" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(onConnectionIdChange).toHaveBeenCalledWith(undefined, { replace: true });
    hookMocks.useConnections.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isRefetchError: false,
      refetch: vi.fn(),
    });
    view.rerender(
      <ConnectionsPage
        connectionId={undefined}
        connectionTab="overview"
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
    await waitFor(() => expect(screen.getByRole("button", { name: "添加连接" })).toHaveFocus());
  });
});

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
