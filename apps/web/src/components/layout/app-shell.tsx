import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, Boxes, Gauge, KeyRound, Plug, ScrollText, UserRoundCog } from "lucide-react";

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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeSelect } from "./theme-select";

const navigationIcons = {
  gauge: Gauge,
  connections: Plug,
  requests: ScrollText,
  models: Boxes,
  clients: UserRoundCog,
} as const;

interface NavigationPage {
  readonly icon: keyof typeof navigationIcons;
  readonly id: string;
  readonly label: string;
  readonly navGroup: string;
  readonly path: string;
}

export function AppShell({ pages }: { readonly pages: readonly NavigationPage[] }) {
  const pathname = useRouterState({ select: state => state.location.pathname });
  const pageTitle = pages.find(({ path }) => isRouteActive(pathname, path))?.label
    ?? "控制面";
  const navigationGroups = groupNavigation(pages);

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
                  <span className="truncate font-semibold">AI API Gateway</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            {navigationGroups.map(group => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.pages.map(({ path, label, icon }) => {
                      const Icon = navigationIcons[icon];
                      return (
                        <SidebarMenuItem key={path}>
                          <SidebarMenuButton
                            isActive={isRouteActive(pathname, path)}
                            tooltip={label}
                            render={<Link to={path} activeOptions={{ exact: path === "/" }} />}
                          >
                            <Icon />
                            <span>{label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="管理员登录" render={<Link to="/login" />}>
                  <KeyRound />
                  <span>管理员登录</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-w-0 overflow-hidden border">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger aria-label="切换侧边栏" title="切换侧边栏" />
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <h1 data-slot="topbar-title" className="min-w-0 flex-1 truncate text-sm font-medium">{pageTitle}</h1>
            <ThemeSelect />
          </header>
          <div data-slot="workspace-content" className="min-h-0 flex-1 overflow-auto px-(--aigw-layout-page-gutter-compact) pt-(--aigw-layout-page-top-padding) pb-(--aigw-layout-page-bottom-padding) aigw-minimum:px-(--aigw-layout-page-gutter-medium) aigw-desktop:px-(--aigw-layout-page-gutter-desktop)">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function isRouteActive(pathname: string, path: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

function groupNavigation(pages: readonly NavigationPage[]) {
  const groups = new Map<string, NavigationPage[]>();
  for (const page of pages) {
    const group = groups.get(page.navGroup) ?? [];
    group.push(page);
    groups.set(page.navGroup, group);
  }
  return [...groups].map(([label, groupPages]) => ({ label, pages: groupPages }));
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
