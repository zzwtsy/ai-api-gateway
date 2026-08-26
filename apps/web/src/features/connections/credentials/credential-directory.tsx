import type { components } from "@/api/schema";

import { FlaskConical, KeyRound, ShieldX } from "lucide-react";

import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Connection = components["schemas"]["Connection"];
type Credential = components["schemas"]["ProviderCredential"];

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
