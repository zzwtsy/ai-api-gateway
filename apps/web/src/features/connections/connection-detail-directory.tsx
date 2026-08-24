import type { components } from "@/api/schema";

import { Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Info, KeyRound, Plus, ShieldX } from "lucide-react";
import { useState } from "react";

import { DataErrorState } from "@/components/product/data-error-state";
import { ModelBindingTable } from "@/components/product/model-binding-table";
import { StatusBadge } from "@/components/product/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeApiError } from "@/lib/api-runtime/client";

import { AddEndpointForm } from "./add-endpoint-form";
import { connectionProtocolLabel } from "./connection-protocol-options";

type Connection = components["schemas"]["Connection"];
type Credential = components["schemas"]["ProviderCredential"];
type ModelBinding = components["schemas"]["ProviderModelBinding"];

export function ConnectionOverview({ connection }: { readonly connection: Connection }) {
  const credentialCount = connection.accounts.reduce(
    (count, account) => count + account.credentials.length,
    0,
  );

  return (
    <section aria-labelledby="connection-overview-title" className="flex flex-col gap-5">
      <h3 id="connection-overview-title" className="sr-only">连接概览</h3>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ConnectionFact label="配置状态">
          <StatusBadge tone={connection.status === "active" ? "success" : "neutral"}>
            {connection.status === "active" ? "启用" : "停用"}
          </StatusBadge>
        </ConnectionFact>
        <ConnectionFact label="Endpoint">{connection.endpoints.length}</ConnectionFact>
        <ConnectionFact label="账号">{connection.accounts.length}</ConnectionFact>
        <ConnectionFact label="Credential">{credentialCount}</ConnectionFact>
      </dl>
      <Alert>
        <Info />
        <AlertTitle>配置状态不等于兼容性结论</AlertTitle>
        <AlertDescription>
          当前只展示已保存对象与最小连通性结果；流式、Usage 和字段兼容性尚未经过完整测试。
        </AlertDescription>
      </Alert>
    </section>
  );
}

function ConnectionFact({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export function EndpointDirectory({ connection }: { readonly connection: Connection }) {
  const [addEndpointOpen, setAddEndpointOpen] = useState(false);
  const hasAvailableCredential = connection.accounts.some(account =>
    account.credentials.some(credential => credential.status !== "disabled"));

  return (
    <section aria-labelledby="connection-endpoints-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="connection-endpoints-title" className="text-sm font-medium">Endpoints</h3>
          {!hasAvailableCredential && (
            <p className="text-xs text-muted-foreground">需要至少一个未禁用的 Credential 才能添加 Endpoint。</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasAvailableCredential}
          onClick={() => setAddEndpointOpen(true)}
        >
          <Plus data-icon="inline-start" />
          添加 Endpoint
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>上游地址</TableHead>
              <TableHead>流式</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connection.endpoints.map(endpoint => (
              <TableRow key={endpoint.id}>
                <TableCell className="font-medium">{endpoint.name}</TableCell>
                <TableCell><Badge variant="outline">{connectionProtocolLabel(endpoint.protocol)}</Badge></TableCell>
                <TableCell className="max-w-96 truncate font-mono text-xs">
                  {endpoint.baseUrl}
                  {endpoint.requestPath}
                </TableCell>
                <TableCell>{endpoint.supportsStreaming ? "支持" : "不支持"}</TableCell>
                <TableCell>
                  <StatusBadge tone={endpoint.status === "active" ? "success" : "neutral"}>
                    {endpoint.status === "active" ? "启用" : "停用"}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Sheet open={addEndpointOpen} onOpenChange={setAddEndpointOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>添加 Endpoint</SheetTitle>
            <SheetDescription>
              为
              {" "}
              {connection.name}
              {" "}
              增加另一个协议入口，并显式选择可用于该 Endpoint 的 Credential。
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AddEndpointForm connection={connection} onCreated={() => setAddEndpointOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export function CredentialDirectory({
  connection,
  endpointNames,
  onDisable,
  onProbe,
  onRotate,
}: {
  readonly connection: Connection;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly onDisable: (credentialId: string) => void;
  readonly onProbe: (credential: Credential) => void;
  readonly onRotate: (credentialId: string) => void;
}) {
  return (
    <section aria-labelledby="connection-credentials-title" className="flex flex-col gap-3">
      <h3 id="connection-credentials-title" className="text-sm font-medium">账号与凭据</h3>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账号 / Credential</TableHead>
              <TableHead>安全显示</TableHead>
              <TableHead>绑定 Endpoint</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>最近验证</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connection.accounts.flatMap(account => account.credentials.map(credential => (
              <TableRow key={credential.id}>
                <TableCell>
                  <div className="font-medium">{credential.name}</div>
                  <div className="text-xs text-muted-foreground">{account.name}</div>
                </TableCell>
                <TableCell><code className="text-xs">{credential.maskedDisplay}</code></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {credential.endpointIds.map(endpointId => (
                      <Badge key={endpointId} variant="outline">{endpointNames.get(endpointId) ?? endpointId}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell><StatusBadge tone={credentialTone(credential.status)}>{credentialStatusLabel(credential.status)}</StatusBadge></TableCell>
                <TableCell>{credentialVerificationLabel(credential)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button type="button" size="xs" variant="outline" disabled={credential.status === "disabled" || credential.endpointIds.length === 0} onClick={() => onProbe(credential)}>
                      <FlaskConical data-icon="inline-start" />
                      测试
                    </Button>
                    <Button type="button" size="xs" variant="outline" disabled={credential.status === "disabled"} onClick={() => onRotate(credential.id)}>
                      <KeyRound data-icon="inline-start" />
                      轮换
                    </Button>
                    <Button type="button" size="xs" variant="ghost" disabled={credential.status === "disabled"} onClick={() => onDisable(credential.id)}>
                      <ShieldX data-icon="inline-start" />
                      禁用
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))) }
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function ConnectionModelDirectory({
  bindings,
  endpointNames,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly bindings: readonly ModelBinding[] | undefined;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  return (
    <section aria-labelledby="connection-models-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="connection-models-title" className="text-sm font-medium">模型绑定</h3>
          <p className="text-xs text-muted-foreground">只显示当前连接 Endpoint 上明确保存的模型。</p>
        </div>
        <Link to="/models" className={buttonVariants({ variant: "outline", size: "sm" })}>
          管理全部模型
          <ArrowRight data-icon="inline-end" />
        </Link>
      </div>
      <ConnectionModelDirectoryState
        bindings={bindings}
        endpointNames={endpointNames}
        error={error}
        loading={loading}
        onRetry={onRetry}
        stale={stale}
      />
    </section>
  );
}

function ConnectionModelDirectoryState({
  bindings,
  endpointNames,
  error,
  loading,
  onRetry,
  stale,
}: {
  readonly bindings: readonly ModelBinding[] | undefined;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}) {
  if (bindings === undefined && error !== null) {
    return (
      <DataErrorState
        title="无法加载模型绑定"
        description={describeApiError(error, "当前连接的模型目录暂时不可用。")}
        onRetry={onRetry}
      />
    );
  }
  if (loading || bindings === undefined)
    return <Skeleton className="h-44" />;
  if (bindings.length === 0) {
    return (
      <Empty className="min-h-44 border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Info /></EmptyMedia>
          <EmptyTitle>当前连接没有模型绑定</EmptyTitle>
          <EmptyDescription>可前往模型页，为此连接的 Endpoint 添加真实上游模型 ID。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {stale && (
        <DataErrorState
          tone="warning"
          title="模型绑定可能已过期"
          description={describeApiError(error, "后台刷新失败，当前仍显示上次成功加载的数据。")}
          onRetry={onRetry}
        />
      )}
      <div className="overflow-x-auto rounded-lg border">
        <ModelBindingTable
          bindings={bindings}
          endpointColumnLabel="Endpoint"
          endpointNames={endpointNames}
        />
      </div>
    </div>
  );
}

function credentialStatusLabel(status: Credential["status"]): string {
  return { unverified: "未验证", healthy: "正常", auth_failed: "鉴权失败", unavailable: "不可用", disabled: "已禁用" }[status];
}

function credentialTone(status: Credential["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "healthy")
    return "success";
  if (status === "auth_failed" || status === "unavailable")
    return "danger";
  if (status === "unverified")
    return "warning";
  return "neutral";
}

function credentialVerificationLabel(credential: Credential): string {
  if (credential.lastSuccessAt !== null)
    return `成功：${formatDateTime(credential.lastSuccessAt)}`;
  if (credential.lastFailureAt !== null)
    return `失败：${formatDateTime(credential.lastFailureAt)}`;
  return "尚未验证";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
