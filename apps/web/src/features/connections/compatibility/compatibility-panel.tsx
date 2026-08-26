import type { components } from "@/api/schema";

import { FlaskConical, TriangleAlert } from "lucide-react";

import { DataErrorState } from "@/components/product/data-error-state";
import { StatusBadge } from "@/components/product/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeApiError } from "@/lib/api-runtime/client";

type Connection = components["schemas"]["Connection"];
type Compatibility = components["schemas"]["ConnectionCompatibility"];
type ProbeRun = components["schemas"]["CompatibilityProbeRun"];
type Fact = components["schemas"]["CompatibilityFact"];

export function CompatibilityPanel({
  connection,
  data,
  error,
  loading,
  onOpenProbe,
  onRetry,
  stale,
}: {
  readonly connection: Connection;
  readonly data: Compatibility | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onOpenProbe: () => void;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  if (data === undefined && error !== null) {
    return <DataErrorState title="无法加载兼容性事实" description={describeApiError(error, "兼容性结果暂时不可用。")} onRetry={onRetry} />;
  }
  if (loading || data === undefined)
    return <Skeleton className="h-56 w-full" />;

  const activeRun = data.runs.find(run => run.status === "queued" || run.status === "running");
  const latestRun = data.runs[0];
  return (
    <div className="flex flex-col gap-4">
      {stale && (
        <DataErrorState
          tone="warning"
          title="兼容性事实可能已过期"
          description={describeApiError(error, "刷新失败，当前仍显示上次成功加载的数据。")}
          onRetry={onRetry}
        />
      )}
      {activeRun !== undefined && <DurableRunProgress run={activeRun} />}
      {activeRun === undefined && latestRun?.status === "failed" && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>最近一次兼容性测试未完成</AlertTitle>
          <AlertDescription>{latestRun.errorMessage ?? "后台任务失败，可重新测试。"}</AlertDescription>
        </Alert>
      )}
      {data.profiles.length === 0
        ? (
            <Empty className="min-h-56">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FlaskConical /></EmptyMedia>
                <EmptyTitle>尚无完整兼容性事实</EmptyTitle>
                <EmptyDescription>
                  运行一次完整测试，分别确认鉴权、SSE、Usage、工具、Reasoning、结构化输出和 Harness 能力。
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline" onClick={onOpenProbe}>开始完整测试</Button>
              </EmptyContent>
            </Empty>
          )
        : data.profiles.map((profile) => {
            const endpoint = connection.endpoints.find(item => item.id === profile.endpointId);
            const facts = data.facts.filter(fact => fact.profileId === profile.id);
            return (
              <section key={profile.id} className="overflow-hidden rounded-lg border" aria-labelledby={`compatibility-${profile.id}`}>
                <div className="flex flex-col gap-2 border-b bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 id={`compatibility-${profile.id}`} className="font-medium">{endpoint?.name ?? profile.endpointId}</h3>
                    <p className="text-sm text-muted-foreground">
                      {endpoint?.protocol ?? "未知协议"}
                      {" · "}
                      {harnessProfileLabel(profile.harnessProfileId)}
                    </p>
                    {profile.summary !== null && <p className="mt-1 text-sm text-muted-foreground">{profile.summary}</p>}
                  </div>
                  <StatusBadge tone={profileStatusTone(profile.status)}>{profileStatusLabel(profile.status)}</StatusBadge>
                </div>
                {facts.length === 0
                  ? <p className="p-4 text-sm text-muted-foreground">任务已创建，尚未写入能力事实。</p>
                  : <FactTable facts={facts} />}
              </section>
            );
          })}
      {data.profiles.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onOpenProbe}>重新测试</Button>
        </div>
      )}
    </div>
  );
}

function DurableRunProgress({ run }: { readonly run: ProbeRun }) {
  return (
    <Alert aria-live="polite">
      <FlaskConical />
      <AlertTitle>{run.status === "queued" ? "完整测试等待执行" : "完整测试正在运行"}</AlertTitle>
      <AlertDescription>
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <span>{run.currentCheck === null ? "准备下一项" : checkLabel(run.currentCheck)}</span>
            <span>
              {run.completedChecks}
              {" / "}
              {run.totalChecks}
            </span>
          </div>
          <progress
            aria-label="详情页兼容性测试进度"
            className="h-2 w-full accent-primary"
            max={Math.max(run.totalChecks, 1)}
            value={run.completedChecks}
          />
          <span>
            模型：
            {run.model}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function FactTable({ facts }: { readonly facts: readonly Fact[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>能力</TableHead>
          <TableHead>结论</TableHead>
          <TableHead>实测模型</TableHead>
          <TableHead>验证时间</TableHead>
          <TableHead>可观察事实</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {facts.map(fact => (
          <TableRow key={`${fact.featureKey}:${fact.verifiedModelId}`}>
            <TableCell className="font-medium">{featureLabel(fact.featureKey)}</TableCell>
            <TableCell><StatusBadge tone={supportLevelTone(fact.supportLevel)}>{supportLevelLabel(fact.supportLevel)}</StatusBadge></TableCell>
            <TableCell>{fact.verifiedModelId}</TableCell>
            <TableCell>{formatDateTime(fact.verifiedAt)}</TableCell>
            <TableCell className="max-w-80 whitespace-normal text-muted-foreground">{fact.notes}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function featureLabel(featureKey: string): string {
  return {
    "auth.valid": "鉴权",
    "request.basic": "基础请求",
    "stream.sse": "SSE",
    "usage.reported": "Usage",
    "fields.unknown": "未知字段",
    "tools.function_call": "Tool Call",
    "reasoning.output": "Reasoning",
    "output.structured": "结构化输出",
    "error.envelope": "错误 Envelope",
    "harness.openai_chat.stream_usage": "OpenAI Chat 流式 Usage",
    "harness.codex.apply_patch": "Codex apply_patch",
    "harness.claude_code.tool_use": "Claude Code Tool Use",
  }[featureKey] ?? featureKey;
}

function checkLabel(check: ProbeRun["currentCheck"]): string {
  if (check === null)
    return "准备下一项";
  return {
    basic: "鉴权与基础请求",
    stream: "SSE 流式响应",
    usage: "Usage",
    unknown_field: "关键字段兼容性",
    tools: "Tool Call",
    reasoning: "Reasoning",
    structured_output: "结构化输出",
    error_shape: "错误 Envelope",
    harness: "Harness 组合能力",
  }[check];
}

function harnessProfileLabel(profileId: string): string {
  return {
    "profile-generic-openai-chat": "通用 OpenAI Chat",
    "profile-codex": "Codex",
    "profile-claude-code": "Claude Code",
  }[profileId] ?? profileId;
}

function profileStatusLabel(status: Compatibility["profiles"][number]["status"]): string {
  return { verified: "已验证", documented: "文档声明", partial: "部分兼容", unverified: "未验证", blocked: "阻断" }[status];
}

function profileStatusTone(status: Compatibility["profiles"][number]["status"]) {
  if (status === "verified")
    return "success" as const;
  if (status === "partial" || status === "documented")
    return "warning" as const;
  if (status === "blocked")
    return "danger" as const;
  return "neutral" as const;
}

function supportLevelLabel(level: Fact["supportLevel"]): string {
  return { supported: "支持", partial: "部分支持", ignored: "已忽略", unsupported: "不支持", degraded: "退化", unknown: "未知" }[level];
}

function supportLevelTone(level: Fact["supportLevel"]) {
  if (level === "supported" || level === "ignored")
    return "success" as const;
  if (level === "partial" || level === "degraded")
    return "warning" as const;
  if (level === "unsupported")
    return "danger" as const;
  return "neutral" as const;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
