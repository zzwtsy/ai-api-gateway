import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, Gauge, KeyRound, Plug, ScrollText } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const navigation = [
  { to: "/", label: "概览", icon: Gauge },
  { to: "/connections", label: "连接", icon: Plug },
  { to: "/requests", label: "请求", icon: ScrollText },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  const pageTitle = navigation.find(({ to }) => isRouteActive(pathname, to))?.label
    ?? "控制面";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={readSidebarDefaultOpen()}>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="AI API Gateway"
                  render={<Link to="/" aria-label="返回概览" />}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Activity className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">AI API Gateway</span>
                    <span className="truncate text-xs text-muted-foreground">个人控制面</span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>工作区</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map(({ to, label, icon: Icon }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        isActive={isRouteActive(pathname, to)}
                        tooltip={label}
                        render={<Link to={to} activeOptions={{ exact: to === "/" }} />}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="管理员登录" render={<Link to="/login" />}>
                  <KeyRound />
                  <span>管理员登录</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Gateway 在线" render={<div />}>
                  <Activity className="text-success-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">Gateway 在线</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      Node 模块化单体 · 路由快照 v1
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="min-w-0 overflow-hidden border">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger aria-label="切换侧边栏" title="切换侧边栏" />
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <p data-slot="topbar-title" className="text-sm font-medium">{pageTitle}</p>
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-8 py-7">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function isRouteActive(pathname: string, to: (typeof navigation)[number]["to"]): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function readSidebarDefaultOpen(): boolean {
  if (typeof document === "undefined")
    return true;

  const value = document.cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith("sidebar_state="))
    ?.split("=")[1];

  return value !== "false";
}
