import type { PropsWithChildren } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OverviewPage } from "./overview-page";

const hookMocks = vi.hoisted(() => ({
  useConnections: vi.fn(),
  useRequests: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: PropsWithChildren) => <a href="/requests">{children}</a>,
}));
vi.mock("@/features/connections/hooks", () => ({
  useConnections: hookMocks.useConnections,
}));
vi.mock("@/features/requests/hooks", () => ({
  useRequests: hookMocks.useRequests,
}));

describe("overview page", () => {
  beforeEach(() => {
    hookMocks.useConnections.mockReturnValue({ data: [] });
    hookMocks.useRequests.mockReturnValue({ data: [], isLoading: false });
  });

  it("describes the current request path without development progress copy", () => {
    render(<OverviewPage />);

    expect(screen.getByText("请求转发链路")).toBeVisible();
    expect(screen.getByText(/保持入口协议并透明转发流式响应/u)).toBeVisible();
    expect(screen.queryByText(/TypeScript 6 单版本/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/留给后续功能/u)).not.toBeInTheDocument();
  });
});
