import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionsPage } from "./connections-page";

const hookMocks = vi.hoisted(() => ({
  useConnections: vi.fn(),
  useCreateConnection: vi.fn(),
}));

vi.mock("./hooks", () => hookMocks);

describe("connections page", () => {
  beforeEach(() => {
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
  });

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

    render(<ConnectionsPage />);

    expect(screen.getByText("使用“添加连接”创建第一个上游 Endpoint。")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "添加连接" }));
    expect(screen.getByLabelText("名称")).toHaveValue("");
    expect(screen.getByLabelText("Provider 标识")).toHaveValue("");
    expect(screen.getByLabelText("上游 Base URL")).toHaveValue("");
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

    render(<ConnectionsPage />);

    expect(screen.getByText("无法加载连接")).toBeVisible();
    expect(screen.getByText("连接目录暂时不可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeVisible();
    expect(screen.queryByText("尚未创建控制面连接")).not.toBeInTheDocument();
  });

  it("keeps the cached directory visible when a background refresh fails", () => {
    hookMocks.useConnections.mockReturnValue({
      data: [{
        id: "conn_01",
        name: "主连接",
        provider: "deepseek",
        protocol: "openai-chat",
        baseUrl: "https://api.example.com",
        enabled: true,
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

    render(<ConnectionsPage />);

    expect(screen.getByText("主连接")).toBeVisible();
    expect(screen.getByText("连接目录可能已过期")).toBeVisible();
    expect(screen.queryByText("尚未创建控制面连接")).not.toBeInTheDocument();
  });
});
