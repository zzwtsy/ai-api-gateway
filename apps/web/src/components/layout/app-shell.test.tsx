import type { ReactNode } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pageManifest } from "@/routes/-page-manifest";

import { AppShell } from "./app-shell";
import { ThemeProvider } from "./theme-provider";

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
    window.localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it("shows the active route and current page title", () => {
    renderAppShell();

    expect(screen.getByRole("heading", { level: 1, name: "请求" })).toBeVisible();
    expect(screen.getByRole("link", { name: "请求" })).toHaveAttribute("data-active");
    expect(screen.getByText("监控")).toBeVisible();
    expect(screen.getByText("配置")).toBeVisible();
    expect(screen.queryByText("工作区")).not.toBeInTheDocument();
  });

  it("toggles from the Chinese control, persists, and restores the cookie state", () => {
    const firstRender = renderAppShell();
    const sidebar = firstRender.container.querySelector("[data-slot=\"sidebar\"][data-state]");
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: "切换侧边栏" }));
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
    firstRender.unmount();

    const secondRender = renderAppShell();
    expect(secondRender.container.querySelector("[data-slot=\"sidebar\"][data-state]"))
      .toHaveAttribute("data-state", "collapsed");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(secondRender.container.querySelector("[data-slot=\"sidebar\"][data-state]"))
      .toHaveAttribute("data-state", "expanded");
  });

  it("opens the theme menu and changes the theme", async () => {
    renderAppShell();

    const trigger = screen.getByRole("button", { name: "选择界面主题" });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "深色" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme-preference", "dark");
    expect(screen.queryByRole("menuitemradio", { name: "深色" })).not.toBeInTheDocument();
  });
});

function renderAppShell() {
  return render(
    <ThemeProvider>
      <AppShell pages={pageManifest} />
    </ThemeProvider>,
  );
}
