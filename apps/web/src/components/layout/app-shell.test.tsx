import type { ReactNode } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pageManifest } from "@/routes/-page-manifest";

import { AppShell } from "./app-shell";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...original,
    Link: ({ to, activeOptions: _activeOptions, children, ...props }: {
      readonly to: string;
      readonly activeOptions?: unknown;
      readonly children?: ReactNode;
    }) => <a href={to} {...props}>{children}</a>,
    Outlet: () => <div>页面内容</div>,
    useRouterState: ({ select }: {
      readonly select: (state: { location: { pathname: string } }) => string;
    }) => select({ location: { pathname: "/requests" } }),
  };
});

describe("app shell", () => {
  beforeEach(() => {
    document.cookie = "sidebar_state=; path=/; max-age=0";
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it("shows the active route and current page title", () => {
    render(<AppShell pages={pageManifest} />);

    expect(screen.getByText("请求", { selector: "[data-slot=\"topbar-title\"]" })).toBeVisible();
    expect(screen.getByRole("link", { name: "请求" })).toHaveAttribute("data-active");
    expect(screen.getByText("监控")).toBeVisible();
    expect(screen.getByText("配置")).toBeVisible();
    expect(screen.queryByText("工作区")).not.toBeInTheDocument();
  });

  it("toggles from the Chinese control, persists, and restores the cookie state", () => {
    const firstRender = render(<AppShell pages={pageManifest} />);
    const sidebar = firstRender.container.querySelector("[data-slot=\"sidebar\"][data-state]");
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: "切换侧边栏" }));
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
    firstRender.unmount();

    const secondRender = render(<AppShell pages={pageManifest} />);
    expect(secondRender.container.querySelector("[data-slot=\"sidebar\"][data-state]"))
      .toHaveAttribute("data-state", "collapsed");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(secondRender.container.querySelector("[data-slot=\"sidebar\"][data-state]"))
      .toHaveAttribute("data-state", "expanded");
  });
});
