import type { components } from "@/api/schema";

import { Check, Copy, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/product/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ClientConfigSnippets } from "./client-config-snippets";
import { ClientDetail } from "./client-detail";
import { ClientDirectory } from "./client-directory";
import { CreateClientForm } from "./create-client-form";
import { useGatewayClients } from "./hooks";

type ClientWithSecret = components["schemas"]["GatewayClientWithSecret"];

type ClientSheetState
  = | { readonly kind: "create" }
    | {
      readonly kind: "secret";
      readonly result: ClientWithSecret;
      readonly returnTo: { readonly kind: "list" } | { readonly clientId: string; readonly kind: "detail" };
    }
    | null;

export function ClientsPage({
  clientId,
  onClientIdChange,
}: {
  readonly clientId: string | undefined;
  readonly onClientIdChange: (clientId: string | undefined, options?: { readonly replace?: boolean }) => void;
}) {
  const [sheetState, setSheetState] = useState<ClientSheetState>(null);
  const query = useGatewayClients();
  const selectedClient = query.data?.find(client => client.id === clientId);

  useEffect(() => {
    if (clientId === undefined || query.data === undefined || selectedClient !== undefined)
      return;
    onClientIdChange(undefined, { replace: true });
  }, [clientId, onClientIdChange, query.data, selectedClient]);

  const closeSheet = () => {
    if (sheetState?.kind === "secret" && sheetState.returnTo.kind === "detail") {
      const returnClientId = sheetState.returnTo.clientId;
      setSheetState(null);
      if (clientId !== returnClientId)
        onClientIdChange(returnClientId, { replace: true });
      return;
    }
    setSheetState(null);
    if (clientId !== undefined)
      onClientIdChange(undefined, { replace: true });
  };

  const startCreate = () => {
    if (clientId !== undefined)
      onClientIdChange(undefined, { replace: true });
    setSheetState({ kind: "create" });
  };

  const selectClient = (nextClientId: string) => {
    setSheetState(null);
    onClientIdChange(nextClientId);
  };

  const sheetOpen = sheetState !== null || selectedClient !== undefined;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="客户端"
        description="为每个 Harness 实例签发独立 Gateway Client Key。"
        actions={(
          <Button onClick={startCreate}>
            <Plus data-icon="inline-start" />
            添加客户端
          </Button>
        )}
      />

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open)
            closeSheet();
        }}
      >
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          {sheetState?.kind === "create" && (
            <CreateClientSheet
              onCreated={result => setSheetState({ kind: "secret", result, returnTo: { kind: "list" } })}
            />
          )}
          {sheetState?.kind === "secret" && (
            <ClientSecretSheet result={sheetState.result} returnTo={sheetState.returnTo.kind} onClose={closeSheet} />
          )}
          {sheetState === null && selectedClient !== undefined && (
            <ClientDetailSheet
              key={selectedClient.id}
              client={selectedClient}
              onRotated={result => setSheetState({
                kind: "secret",
                result,
                returnTo: { clientId: selectedClient.id, kind: "detail" },
              })}
            />
          )}
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Gateway 客户端</CardTitle>
          <CardDescription>控制面登录与 Gateway Client Key 使用不同的身份边界。</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientDirectory
            clients={query.data}
            error={query.isError ? query.error : null}
            loading={query.isPending}
            onRetry={query.refetch}
            onSelect={selectClient}
            onStartCreate={startCreate}
            stale={query.isRefetchError && query.data !== undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function CreateClientSheet({ onCreated }: { readonly onCreated: (result: ClientWithSecret) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>添加 Gateway 客户端</SheetTitle>
        <SheetDescription>创建后只显示一次完整 Key，请在离开完成状态前保存。</SheetDescription>
      </SheetHeader>
      <div className="p-4 pt-0">
        <CreateClientForm onCreated={onCreated} />
      </div>
    </>
  );
}

function ClientSecretSheet({ result, returnTo, onClose }: {
  readonly result: ClientWithSecret;
  readonly returnTo: "detail" | "list";
  readonly onClose: () => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>
          保存
          {" "}
          {result.client.name}
          {" "}
          的 Gateway Key
        </SheetTitle>
        <SheetDescription>完整 Key 关闭后无法再次查看；日志、普通导出和客户端列表都不会保留它。</SheetDescription>
      </SheetHeader>
      <div className="p-4 pt-0">
        <ClientKeyRevealContent
          result={result}
          closeLabel={returnTo === "detail" ? "我已保存，返回详情" : "我已保存，关闭"}
          onClose={onClose}
        />
      </div>
    </>
  );
}

function ClientDetailSheet({ client, onRotated }: {
  readonly client: components["schemas"]["GatewayClient"];
  readonly onRotated: (result: ClientWithSecret) => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{client.name}</SheetTitle>
        <SheetDescription>
          {client.profile.name}
          {" "}
          客户端详情与 Gateway Key 生命周期。
        </SheetDescription>
      </SheetHeader>
      <ClientDetail client={client} onRotated={onRotated} />
    </>
  );
}

function ClientKeyRevealContent({ result, closeLabel, onClose }: {
  readonly result: ClientWithSecret;
  readonly closeLabel: string;
  readonly onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.key);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input aria-label="完整 Gateway Key" className="font-mono" readOnly value={result.key} />
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copyState === "copied" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copyState === "copied" ? "已复制" : "复制 Key"}
        </Button>
      </div>
      {copyState === "failed" && <p role="alert" className="text-sm text-destructive">浏览器拒绝访问剪贴板，请手动复制完整 Key。</p>}

      <ClientConfigSnippets apiKey={result.key} protocol={result.client.allowedProtocols[0]} />

      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>{closeLabel}</Button>
      </div>
    </div>
  );
}
