import type { components } from "@/api/schema";

import { Info } from "lucide-react";
import { useRef } from "react";

import { StatusBadge } from "@/components/product/status-badge";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { connectionProtocolLabel } from "../shared/connection-protocol-options";
import { AddEndpointDialog } from "./add-endpoint-form";
import { DeleteEndpointDialog } from "./delete-endpoint-dialog";
import { EditEndpointDialog } from "./edit-endpoint-dialog";

type Connection = components["schemas"]["Connection"];

export function EndpointDirectory({ connection }: { readonly connection: Connection }) {
  const addEndpointTriggerRef = useRef<HTMLButtonElement>(null);
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
        <AddEndpointDialog
          connection={connection}
          disabled={!hasAvailableCredential}
          triggerRef={addEndpointTriggerRef}
        />
      </div>
      {connection.endpoints.length === 0
        ? (
            <Empty className="min-h-44 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Info /></EmptyMedia>
                <EmptyTitle>当前连接没有 Endpoint</EmptyTitle>
                <EmptyDescription>使用“添加 Endpoint”配置第一个协议入口。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>协议</TableHead>
                    <TableHead>上游地址</TableHead>
                    <TableHead>流式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EditEndpointDialog connection={connection} endpoint={endpoint} />
                          <DeleteEndpointDialog
                            connectionId={connection.id}
                            endpointId={endpoint.id}
                            endpointName={endpoint.name}
                            successFocusRef={addEndpointTriggerRef}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
    </section>
  );
}
