import type { PropsWithChildren } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OverviewPage } from "./overview-page";

const hookMocks = vi.hoisted(() => ({
  useGatewayClients: vi.fn(),
  useConnections: vi.fn(),
  useRequests: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: PropsWithChildren<{ to: string }>) => <a href={to}>{children}</a>,
}));
vi.mock("@/features/connections/hooks", () => ({
  useConnections: hookMocks.useConnections,
}));
vi.mock("@/features/clients/hooks", () => ({
  useGatewayClients: hookMocks.useGatewayClients,
}));
vi.mock("@/features/requests/hooks", () => ({
  useRequests: hookMocks.useRequests,
}));

describe("overview page", () => {
  beforeEach(() => {
    hookMocks.useGatewayClients.mockReturnValue({ data: [] });
    hookMocks.useConnections.mockReturnValue({ data: [] });
    hookMocks.useRequests.mockReturnValue({ data: [], isLoading: false });
  });

  it("covers UX-OVERVIEW-READY: keeps implementation explanations out of the product overview", () => {
    render(<OverviewPage />);

    expect(screen.getByText("最近请求")).toBeVisible();
    expect(screen.queryByText("请求转发链路")).not.toBeInTheDocument();
    expect(screen.queryByText(/TypeScript 6 单版本/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/留给后续功能/u)).not.toBeInTheDocument();
  });

  it("covers UX-OVERVIEW-FIRST-EMPTY: renders 3-step onboarding guide on initial setup", () => {
    render(<OverviewPage />);

    expect(screen.getByText("快速起步向导")).toBeVisible();
    expect(screen.getByText("1. 接入上游厂商")).toBeVisible();
    expect(screen.getByText("2. 确认可用模型")).toBeVisible();
    expect(screen.getByText("3. 签发接入密钥")).toBeVisible();
  });

  it("covers UX-OVERVIEW-LOADING: keeps the recent-request region in a loading state", () => {
    hookMocks.useRequests.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<OverviewPage />);

    expect(container.querySelector("[data-slot=\"skeleton\"]")).toBeVisible();
    expect(screen.queryByText("还没有请求记录")).not.toBeInTheDocument();
  });

  it("keeps onboarding visible while a Gateway Client is still missing", () => {
    hookMocks.useConnections.mockReturnValue({
      data: [{ id: "conn_1", name: "DeepSeek" }],
    });
    render(<OverviewPage />);

    expect(screen.getByText("快速起步向导")).toBeVisible();
  });

  it("hides onboarding only after connections and Gateway Clients both exist", () => {
    hookMocks.useConnections.mockReturnValue({
      data: [{ id: "conn_1", name: "DeepSeek" }],
    });
    hookMocks.useGatewayClients.mockReturnValue({
      data: [{ id: "client_1", name: "Codex" }],
    });
    render(<OverviewPage />);

    expect(screen.queryByText("快速起步向导")).not.toBeInTheDocument();
  });

  it("does not treat an unknown client query as an empty client list", () => {
    hookMocks.useGatewayClients.mockReturnValue({ data: undefined });

    render(<OverviewPage />);

    expect(screen.queryByText("快速起步向导")).not.toBeInTheDocument();
  });
});
