import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  KeyRound,
  Plug,
  Radio,
  SendIcon,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { RequestStatus } from "@/components/product/request-status";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGatewayClients } from "@/features/clients/hooks";
import { useConnections } from "@/features/connections/hooks";
import { useRequests } from "@/features/requests/hooks";
import { averageInteger } from "@/lib/metrics";

export function OverviewPage() {
  const clients = useGatewayClients();
  const connections = useConnections();
  const requests = useRequests();
  const items = requests.data ?? [];
  const connectionList = connections.data ?? [];
  const succeeded = items.filter(item => item.outcome === "succeeded").length;
  const successRate = items.length === 0
    ? null
    : Math.round((succeeded / items.length) * 1000) / 10;
  const averageLatency = averageInteger(
    items
      .map(item => item.latencyMs)
      .filter((value): value is number => value !== null),
  );

  const isInitialSetup = connections.data !== undefined
    && clients.data !== undefined
    && (connectionList.length === 0 || clients.data.length === 0);

  return (
    <div className="flex flex-col gap-7">
      {isInitialSetup && <OnboardingGuide />}

      <section className="grid grid-cols-2 gap-7 border-y py-5 aigw-desktop:grid-cols-4">
        <Metric icon={Radio} label="请求" value={String(items.length)} detail="最近 50 条" />
        <Metric
          icon={Plug}
          label="连接"
          value={String(connectionList.length)}
          detail="已配置的 Endpoint"
        />
        <Metric
          icon={CircleDollarSign}
          label="成功率"
          value={successRate === null ? "—" : `${successRate}%`}
          detail="按逻辑请求统计"
        />
        <Metric
          icon={TriangleAlert}
          label="平均延迟"
          value={averageLatency === null ? "—" : `${averageLatency} ms`}
          detail="不含进行中请求"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>最近请求</CardTitle>
          <CardAction>
            <Link
              to="/requests"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              查看全部
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <RecentRequests loading={requests.isLoading} items={items} />
        </CardContent>
      </Card>
    </div>
  );
}

function OnboardingGuide() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <CardTitle className="text-base">快速起步向导</CardTitle>
        </div>
        <p className="text-sm text-foreground/70">按顺序完成以下设置。</p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Plug className="size-4 text-primary" />
            <span>1. 接入上游厂商</span>
          </div>
          <div className="mt-auto pt-2">
            <Link
              to="/connections"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              添加连接
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Boxes className="size-4 text-primary" />
            <span>2. 确认可用模型</span>
          </div>
          <div className="mt-auto pt-2">
            <Link
              to="/models"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              查看模型
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 font-medium text-sm">
            <KeyRound className="size-4 text-primary" />
            <span>3. 签发接入密钥</span>
          </div>
          <div className="mt-auto pt-2">
            <Link
              to="/clients"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              签发密钥
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRequests({
  loading,
  items,
}: {
  readonly loading: boolean;
  readonly items: NonNullable<ReturnType<typeof useRequests>["data"]>;
}) {
  if (loading) {
    return <Skeleton className="h-44" />;
  }
  if (items.length === 0) {
    return (
      <Empty className="min-h-44 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SendIcon /></EmptyMedia>
          <EmptyTitle>还没有请求记录</EmptyTitle>
          <EmptyDescription>
            配置客户端并发送请求后，这里会显示路由与延迟。
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/clients" className={buttonVariants({ variant: "outline", size: "sm" })}>配置客户端</Link>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>模型</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>延迟</TableHead>
          <TableHead>时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.slice(0, 6).map(item => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="font-medium">{item.requestedModel}</div>
              <div className="text-xs text-muted-foreground">{item.protocol}</div>
            </TableCell>
            <TableCell><RequestStatus outcome={item.outcome} /></TableCell>
            <TableCell className="tabular-nums">
              {item.latencyMs === null ? "—" : `${item.latencyMs} ms`}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatTime(item.startedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  readonly icon: typeof Radio;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
