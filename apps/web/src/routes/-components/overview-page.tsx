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

import { PageHeader } from "@/components/product/page-header";
import { RequestStatus } from "@/components/product/request-status";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
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
      <PageHeader
        title="概览"
        description="确认 Gateway 是否健康，并快速进入需要处理的问题。"
      />

      {isInitialSetup && <OnboardingGuide />}

      <section className="grid grid-cols-4 gap-7 border-y py-5">
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

      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近请求</CardTitle>
            <CardDescription>
              逻辑请求与上游尝试分开记录，重试不会虚增请求数。
            </CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle>请求转发链路</CardTitle>
            <CardDescription>
              OpenAI Chat Completions 保持入口协议并透明转发流式响应。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/35 p-4 text-xs leading-6">
              <code className="break-all">POST /openai/v1/chat/completions</code>
              <div className="mt-2 text-muted-foreground">
                Gateway Key → 同协议路由 → 上游 Endpoint → 流式响应 → Request / Attempt
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              请求与上游尝试分别记录；响应开始后保持已选目标，便于解释实际路由结果。
            </p>
          </CardContent>
        </Card>
      </div>
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
        <CardDescription>
          完成以下 3 步，即可在本地 IDE 与 CLI 工具中接入网关。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Plug className="size-4 text-primary" />
            <span>1. 接入上游厂商</span>
          </div>
          <p className="text-xs text-muted-foreground">
            支持 DeepSeek、OpenAI、Anthropic 等预设，一键填入并保存 API Key。
          </p>
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
          <p className="text-xs text-muted-foreground">
            查看已配置 Endpoint 上可调用的模型绑定与能力状态。
          </p>
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
          <p className="text-xs text-muted-foreground">
            为 Cursor、Codex 等生成独立 Gateway Key 与一键接入配置代码。
          </p>
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
            发送第一条测试请求后，这里会出现路由与延迟信息。
          </EmptyDescription>
        </EmptyHeader>
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
