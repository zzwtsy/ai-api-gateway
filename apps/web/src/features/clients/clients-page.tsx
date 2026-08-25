import type { components } from "@/api/schema";

import { Check, Copy, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { ClientConfigSnippets } from "./client-config-snippets";
import { ClientDetail } from "./client-detail";
import { ClientDirectory } from "./client-directory";
import { CreateClientForm } from "./create-client-form";
import { useGatewayClients } from "./hooks";

type ClientWithSecret = components["schemas"]["GatewayClientWithSecret"];

type ModalState
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
  const [modalState, setModalState] = useState<ModalState>(null);
  const focusAfterCloseRef = useRef<string | null>(null);
  const query = useGatewayClients();
  const selectedClient = query.data?.find(client => client.id === clientId);

  useEffect(() => {
    if (clientId === undefined || query.data === undefined || selectedClient !== undefined)
      return;
    onClientIdChange(undefined, { replace: true });
  }, [clientId, onClientIdChange, query.data, selectedClient]);

  useEffect(() => {
    if (clientId !== undefined || focusAfterCloseRef.current === null)
      return;
    const closedClientId = focusAfterCloseRef.current;
    focusAfterCloseRef.current = null;
    document.getElementById(`client-detail-trigger-${closedClientId}`)?.focus();
  }, [clientId]);

  const closeModal = () => {
    if (modalState?.kind === "secret" && modalState.returnTo.kind === "detail") {
      const returnClientId = modalState.returnTo.clientId;
      setModalState(null);
      if (clientId !== returnClientId)
        onClientIdChange(returnClientId, { replace: true });
      return;
    }
    setModalState(null);
  };

  const closeInspector = () => {
    if (clientId !== undefined) {
      focusAfterCloseRef.current = clientId;
      onClientIdChange(undefined, { replace: true });
    }
  };

  const startCreate = () => {
    if (clientId !== undefined)
      onClientIdChange(undefined, { replace: true });
    setModalState({ kind: "create" });
  };

  const selectClient = (nextClientId: string) => {
    setModalState(null);
    onClientIdChange(nextClientId);
  };

  return (
    <div className="flex min-h-0 flex-col gap-7">
      <div className="flex justify-end">
        <Dialog
          open={modalState?.kind === "create"}
          onOpenChange={(open) => {
            if (open)
              startCreate();
            else
              closeModal();
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus data-icon="inline-start" />
            添加客户端
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="px-6 pt-6 pb-5">
              <DialogTitle>添加 Gateway 客户端</DialogTitle>
              <DialogDescription>完整 Key 仅显示一次。</DialogDescription>
            </DialogHeader>
            {modalState?.kind === "create" && (
              <CreateClientForm
                onCancel={closeModal}
                onCreated={result => setModalState({ kind: "secret", result, returnTo: { kind: "list" } })}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={modalState?.kind === "secret"}
        onOpenChange={(open) => {
          if (!open)
            closeModal();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {modalState?.kind === "secret" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  保存
                  {" "}
                  {modalState.result.client.name}
                  {" "}
                  的 Gateway Key
                </DialogTitle>
                <DialogDescription>完整 Key 关闭后无法再次查看。</DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <ClientKeyRevealContent
                  result={modalState.result}
                  closeLabel={modalState.returnTo.kind === "detail" ? "我已保存，返回详情" : "我已保存，关闭"}
                  onClose={closeModal}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className={selectedClient === undefined
        ? "min-h-0"
        : "grid min-h-0 gap-6 aigw-desktop:grid-cols-[minmax(620px,1fr)_minmax(var(--aigw-layout-inspector-min),0.72fr)]"}
      >
        <Card data-slot="clients-master" className="min-w-0">
          <CardHeader>
            <CardTitle>Gateway 客户端</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientDirectory
              clients={query.data}
              error={query.isError ? query.error : null}
              loading={query.isPending}
              onRetry={query.refetch}
              onSelect={selectClient}
              onStartCreate={startCreate}
              selectedClientId={clientId}
              stale={query.isRefetchError && query.data !== undefined}
            />
          </CardContent>
        </Card>

        {selectedClient !== undefined && modalState?.kind !== "create" && (
          <ClientInspector
            client={selectedClient}
            onClose={closeInspector}
            onRotated={result => setModalState({
              kind: "secret",
              result,
              returnTo: { clientId: selectedClient.id, kind: "detail" },
            })}
          />
        )}
      </div>
    </div>
  );
}

function ClientInspector({ client, onClose, onRotated }: {
  readonly client: components["schemas"]["GatewayClient"];
  readonly onClose: () => void;
  readonly onRotated: (result: ClientWithSecret) => void;
}) {
  return (
    <Card
      id="client-inspector"
      role="region"
      aria-labelledby="client-inspector-title"
      className="max-h-(--aigw-layout-content-viewport-height) min-h-0 min-w-0 gap-0 overflow-hidden"
    >
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle id="client-inspector-title" className="truncate">{client.name}</CardTitle>
            <CardDescription>{client.profile.name}</CardDescription>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="关闭客户端详情" onClick={onClose}>
            <X />
          </Button>
        </div>
      </CardHeader>
      <div data-slot="inspector-body" className="min-h-0 overflow-y-auto pt-6">
        <ClientDetail key={client.id} client={client} onRotated={onRotated} />
      </div>
    </Card>
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
