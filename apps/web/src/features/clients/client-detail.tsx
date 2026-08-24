import type { ReactNode } from "react";
import type { components } from "@/api/schema";

import { Info, RotateCw, ShieldX } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/product/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

import { ClientConfigSnippets } from "./client-config-snippets";
import {
  clientProtocolLabel,
  formatClientDateTime,
  formatClientLastUsedAt,
  gatewayClientKeyDisplayStatus,
  gatewayClientKeyStatusLabel,
  gatewayClientKeyTone,
  gatewayClientStatusLabel,
  gatewayClientStatusTone,
  isGatewayClientKeyUsable,
  maskGatewayClientKey,
} from "./client-view-model";
import { useRevokeGatewayClientKey, useRotateGatewayClientKey } from "./hooks";

type ClientWithSecret = components["schemas"]["GatewayClientWithSecret"];
type GatewayClient = components["schemas"]["GatewayClient"];
type GatewayClientKey = components["schemas"]["GatewayClientKey"];

export function ClientDetail({
  client,
  onRotated,
}: {
  readonly client: GatewayClient;
  readonly onRotated: (result: ClientWithSecret) => void;
}) {
  const rotate = useRotateGatewayClientKey();
  const revoke = useRevokeGatewayClientKey();
  const [confirmKeyId, setConfirmKeyId] = useState<string | null>(null);
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const confirmKey = client.keys.find(key => key.id === confirmKeyId) ?? null;
  const currentKeys = client.keys.filter(key => isGatewayClientKeyUsable(key));
  const historicalKeys = client.keys.filter(key => !isGatewayClientKeyUsable(key));

  const rotateAndReveal = async () => {
    try {
      const result = await rotate.rotate(client.id);
      setRotateConfirmOpen(false);
      onRotated(result);
    } catch {

    }
  };
  const revokeKey = (keyId: string) => {
    void revoke.revoke(keyId).then(() => setConfirmKeyId(null), () => undefined);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pt-0">
      <ClientOverview client={client} />
      <Separator />
      <section aria-labelledby="client-keys-heading" className="flex flex-col gap-3">
        <div>
          <h3 id="client-keys-heading" className="font-heading text-sm font-medium">Gateway Key</h3>
          <p className="mt-1 text-xs text-muted-foreground">列表只保留脱敏标识和生命周期状态。</p>
        </div>
        {currentKeys.length === 0 && <p className="rounded-lg border p-3 text-sm text-muted-foreground">当前没有可用 Gateway Key。</p>}
        {currentKeys.length > 0 && (
          <ul className="flex flex-col divide-y rounded-lg border">
            {currentKeys.map(key => (
              <ClientKeyItem
                key={key.id}
                item={key}
                pending={revoke.isPending}
                onRequestRevoke={() => setConfirmKeyId(key.id)}
              />
            ))}
          </ul>
        )}
        {historicalKeys.length > 0 && (
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              历史 Key（
              {historicalKeys.length}
              ）
            </summary>
            <ul className="flex flex-col divide-y border-t">
              {historicalKeys.map(key => (
                <ClientKeyItem
                  key={key.id}
                  item={key}
                  pending={revoke.isPending}
                  onRequestRevoke={() => setConfirmKeyId(key.id)}
                />
              ))}
            </ul>
          </details>
        )}
      </section>
      <Separator />
      <section aria-labelledby="client-config-heading" className="flex flex-col gap-4">
        <div>
          <h3 id="client-config-heading" className="font-heading text-sm font-medium">Harness 配置</h3>
          <p className="mt-1 text-xs text-muted-foreground">复制模板后替换占位符，或轮换 Key 生成一次性完整配置。</p>
        </div>
        <Alert>
          <Info />
          <AlertTitle>现有完整 Gateway Key 无法恢复</AlertTitle>
          <AlertDescription>
            Gateway 只保存不可逆摘要。下方模板不含 Secret；需要完整配置时必须轮换 Key。
          </AlertDescription>
        </Alert>
        <ClientConfigSnippets protocol={client.allowedProtocols[0]} />
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">轮换后旧 Key 默认保留 24 小时重叠窗口。</p>
          <Button type="button" disabled={rotate.isPending} onClick={() => setRotateConfirmOpen(true)}>
            {rotate.isPending ? <Spinner data-icon="inline-start" aria-label="轮换中" /> : <RotateCw data-icon="inline-start" />}
            轮换 Key 并生成完整配置
          </Button>
        </div>
      </section>
      <AlertDialog open={confirmKey !== null} onOpenChange={open => !open && setConfirmKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><ShieldX /></AlertDialogMedia>
            <AlertDialogTitle>
              撤销
              {confirmKey === null ? " Gateway Key" : ` ${maskGatewayClientKey(confirmKey)}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              撤销立即生效，仍使用此 Key 的 Harness 请求将被拒绝。此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revoke.isError && (
            <p role="alert" className="text-sm text-destructive">
              {describeApiError(revoke.error, "无法撤销 Gateway Key，请重试。")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending} onClick={() => setConfirmKeyId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revoke.isPending || confirmKey === null}
              onClick={() => confirmKey !== null && revokeKey(confirmKey.id)}
            >
              {revoke.isPending && <Spinner data-icon="inline-start" aria-label="撤销中" />}
              确认撤销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rotateConfirmOpen} onOpenChange={setRotateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><RotateCw /></AlertDialogMedia>
            <AlertDialogTitle>轮换 Gateway Key</AlertDialogTitle>
            <AlertDialogDescription>
              确认后才会创建并启用新 Key；当前 Key 进入 24 小时重叠窗口。新 Key 的完整值只显示一次。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rotate.isError && (
            <p role="alert" className="text-sm text-destructive">
              {describeApiError(rotate.error, "无法轮换 Gateway Key，请重试。")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotate.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={rotate.isPending} onClick={() => void rotateAndReveal()}>
              {rotate.isPending && <Spinner data-icon="inline-start" aria-label="轮换中" />}
              确认轮换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientOverview({ client }: { readonly client: GatewayClient }) {
  return (
    <section aria-labelledby="client-overview-heading" className="flex flex-col gap-3">
      <h3 id="client-overview-heading" className="font-heading text-sm font-medium">基本信息</h3>
      <dl className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <ClientFact label="状态">
          <StatusBadge tone={gatewayClientStatusTone(client.status)}>{gatewayClientStatusLabel(client.status)}</StatusBadge>
        </ClientFact>
        <ClientFact label="Harness Profile">{client.profile.name}</ClientFact>
        <ClientFact label="入口协议">
          <div className="flex flex-wrap gap-1">
            {client.allowedProtocols.map(protocol => <Badge key={protocol} variant="outline">{clientProtocolLabel(protocol)}</Badge>)}
          </div>
        </ClientFact>
        <ClientFact label="最后使用">{formatClientLastUsedAt(client.lastUsedAt)}</ClientFact>
        <ClientFact label="创建时间">{formatClientDateTime(client.createdAt)}</ClientFact>
        <ClientFact label="更新时间">{formatClientDateTime(client.updatedAt)}</ClientFact>
      </dl>
    </section>
  );
}

function ClientFact({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ClientKeyItem({ item, pending, onRequestRevoke }: {
  readonly item: GatewayClientKey;
  readonly pending: boolean;
  readonly onRequestRevoke: () => void;
}) {
  const displayStatus = gatewayClientKeyDisplayStatus(item);
  return (
    <li className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-xs">{maskGatewayClientKey(item)}</code>
          <StatusBadge tone={gatewayClientKeyTone(item)}>{gatewayClientKeyStatusLabel(item)}</StatusBadge>
        </div>
        {displayStatus !== "revoked" && displayStatus !== "expired" && (
          <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={onRequestRevoke}>
            <ShieldX data-icon="inline-start" />
            撤销
          </Button>
        )}
      </div>
      <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <ClientKeyFact label="创建">{formatClientDateTime(item.createdAt)}</ClientKeyFact>
        <ClientKeyFact label="最后使用">{formatClientLastUsedAt(item.lastUsedAt)}</ClientKeyFact>
        <ClientKeyFact label="到期">{item.expiresAt === null ? "无固定到期时间" : formatClientDateTime(item.expiresAt)}</ClientKeyFact>
      </dl>
    </li>
  );
}

function ClientKeyFact({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt>{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
