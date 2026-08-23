import { Link, Outlet } from "@tanstack/react-router";
import { Activity, Gauge, KeyRound, Plug, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "概览", icon: Gauge },
  { to: "/connections", label: "连接", icon: Plug },
  { to: "/requests", label: "请求", icon: ScrollText },
] as const;

export function AppShell() {
  return (
    <div className="flex min-h-screen gap-3 p-3">
      <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col rounded-xl border bg-sidebar shadow-xs">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">AI API Gateway</div>
            <div className="text-xs text-muted-foreground">个人控制面</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
          <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">工作区</div>
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-1"><Link to="/login" className="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><KeyRound className="size-3.5" />管理员登录</Link></div>
        <div className="m-3 mt-1 rounded-lg border bg-background px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="size-2 rounded-full bg-success" />
            Gateway 在线
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Node 模块化单体 · 路由快照 v1</p>
        </div>
      </aside>
      <main className={cn("min-w-0 flex-1 overflow-hidden rounded-xl border bg-background shadow-xs")}>
        <div className="min-h-full px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
