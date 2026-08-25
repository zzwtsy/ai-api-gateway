import type { components } from "@/api/schema";

import { Check, Copy, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
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
  const detailFocusRef = useRef<string | null>(null);
  const query = useGatewayClients();
  const selectedClient = query.data?.find(client => client.id === clientId);

  useEffect(() => {
    if (clientId === undefined || query.data === undefined || selectedClient !== undefined)
      return;
    onClientIdChange(undefined, { replace: true });
  }, [clientId, onClientIdChange, query.data, selectedClient]);

  useEffect(() => {
    if (clientId !== undefined)
      detailFocusRef.current = clientId;
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

  const closeDetailSheet = () => {
    if (clientId !== undefined)
      onClientIdChange(undefined, { replace: true });
  };

  const detailFinalFocus = () => {
    if (modalState !== null)
      return false;
    const closedClientId = detailFocusRef.current;
    detailFocusRef.current = null;
    return closedClientId === null
      ? null
      : document.getElementById(`client-detail-trigger-${closedClientId}`);
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

      <Sheet
        open={selectedClient !== undefined && modalState === null}
        onOpenChange={(open) => {
          if (!open)
            closeDetailSheet();
        }}
      >
        <SheetContent
          id="client-detail-sheet"
          showCloseButton={false}
          finalFocus={detailFinalFocus}
          className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          {selectedClient !== undefined && (
            <ClientDetailSheet
              key={selectedClient.id}
              client={selectedClient}
              onRotated={result => setModalState({
                kind: "secret",
                result,
                returnTo: { clientId: selectedClient.id, kind: "detail" },
              })}
            />
          )}
        </SheetContent>
      </Sheet>

      <ClientDirectoryCard
        clientId={clientId}
        query={query}
        onSelect={selectClient}
        onStartCreate={startCreate}
      />
    </div>
  );
}

function ClientDirectoryCard({ clientId, onSelect, onStartCreate, query }: {
  readonly clientId: string | undefined;
  readonly onSelect: (clientId: string) => void;
  readonly onStartCreate: () => void;
  readonly query: ReturnType<typeof useGatewayClients>;
}) {
  return (
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
          onSelect={onSelect}
          onStartCreate={onStartCreate}
          selectedClientId={clientId}
          stale={query.isRefetchError && query.data !== undefined}
        />
      </CardContent>
    </Card>
  );
}

function ClientDetailSheet({ client, onRotated }: {
  readonly client: components["schemas"]["GatewayClient"];
  readonly onRotated: (result: ClientWithSecret) => void;
}) {
  return (
    <>
      <SheetHeader className="shrink-0 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <SheetTitle className="truncate">{client.name}</SheetTitle>
            <SheetDescription>
              Harness Profile：
              {client.profile.name}
            </SheetDescription>
          </div>
          <SheetClose render={<Button type="button" size="icon-sm" variant="ghost" aria-label="关闭客户端详情" />}>
            <X />
          </SheetClose>
        </div>
      </SheetHeader>
      <div data-slot="detail-sheet-body" className="min-h-0 flex-1 overflow-y-auto pt-6">
        <ClientDetail key={client.id} client={client} onRotated={onRotated} />
      </div>
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
