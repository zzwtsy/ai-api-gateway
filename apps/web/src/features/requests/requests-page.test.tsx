import type { ReactNode } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequestsPage } from "./requests-page";

const hookMocks = vi.hoisted(() => ({
  useRequest: vi.fn(),
  useRequests: vi.fn(),
}));

vi.mock("./hooks", () => hookMocks);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...original,
    Link: ({ children, search: _search, to, ...props }: {
      readonly children?: ReactNode;
      readonly search?: unknown;
      readonly to: string;
    }) => <a href={to} {...props}>{children}</a>,
  };
});

const request = {
  id: "req_01",
  clientId: "client_01",
  protocol: "openai-chat",
  requestedModel: "deepseek-chat",
  upstreamModel: "deepseek-chat",
  routingSnapshotVersion: 1,
  stream: true,
  outcome: "succeeded",
  statusCode: 200,
  startedAt: "2026-08-23T08:00:00.000Z",
  finishedAt: "2026-08-23T08:00:01.000Z",
  latencyMs: 1000,
  ttftMs: 120,
  observationStatus: "complete",
  observedBytes: 512,
} as const;

describe("requests page", () => {
  beforeEach(() => {
    hookMocks.useRequest.mockReturnValue(idleQuery());
    hookMocks.useRequests.mockReturnValue(idleQuery());
  });

  it("renders a recoverable list error instead of the first-use empty state", () => {
    const refetch = vi.fn();
    hookMocks.useRequests.mockReturnValue(errorQuery("请求列表暂时不可用", refetch));

    render(<RequestsPage requestId={undefined} />);

    expect(screen.getByText("无法加载逻辑请求")).toBeVisible();
    expect(screen.getByText("请求列表暂时不可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeVisible();
    expect(screen.queryByText("还没有逻辑请求")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("keeps the request list available when only the inspector fails", () => {
    hookMocks.useRequests.mockReturnValue(readyQuery([request]));
    hookMocks.useRequest.mockReturnValue(errorQuery("详情读取失败"));

    render(<RequestsPage requestId="req_01" />);

    expect(screen.getByText("deepseek-chat")).toBeVisible();
    expect(screen.getByText("无法加载请求详情")).toBeVisible();
    expect(screen.getByText("详情读取失败")).toBeVisible();
    expect(screen.queryByText("选择一条请求")).not.toBeInTheDocument();
  });

  it("keeps cached rows visible when a background refresh fails", () => {
    hookMocks.useRequests.mockReturnValue({
      ...readyQuery([request]),
      error: new Error("刷新失败"),
      isError: true,
      isRefetchError: true,
    });

    render(<RequestsPage requestId={undefined} />);

    expect(screen.getByText("deepseek-chat")).toBeVisible();
    expect(screen.getByText("请求列表可能已过期")).toBeVisible();
    expect(screen.queryByText("还没有逻辑请求")).not.toBeInTheDocument();
  });
});

function idleQuery() {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isRefetchError: false,
    refetch: vi.fn(),
  };
}

function errorQuery(message: string, refetch = vi.fn()) {
  return {
    ...idleQuery(),
    error: new Error(message),
    isError: true,
    refetch,
  };
}

function readyQuery<T>(data: T) {
  return {
    ...idleQuery(),
    data,
  };
}
