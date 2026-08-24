import type { CredentialActions } from "./use-credential-actions";

import { ShieldX } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

import {
  CredentialProbePanel,
  CredentialRotatePanel,
} from "./credential-action-panels";

export function ConnectionDetailCredentialSheets({ actions }: { readonly actions: CredentialActions }) {
  const probe = actions.sheets.probe;
  const rotate = actions.sheets.rotate;
  const disable = actions.sheets.disable;
  return (
    <>
      <Dialog open={probe.credential !== null} onOpenChange={open => !open && probe.onCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>最小连通性测试</DialogTitle>
            <DialogDescription>
              发送一次真实的最小非流式请求；结果不代表完整兼容性。
            </DialogDescription>
          </DialogHeader>
          {probe.credential !== null && (
            <div className="pt-2">
              <CredentialProbePanel
                credential={probe.credential}
                endpointNames={probe.endpointNames}
                error={probe.error}
                model={probe.model}
                onCancel={probe.onCancel}
                onEndpointChange={probe.onEndpointChange}
                onModelChange={probe.onModelChange}
                onSubmit={probe.onSubmit}
                pending={probe.pending}
                selectedEndpointId={probe.selectedEndpointId}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rotate.open} onOpenChange={open => !open && rotate.onCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>轮换 Provider 凭据</DialogTitle>
            <DialogDescription>
              输入新的 API Key；旧凭据将被立即替换并安全加密存储。
            </DialogDescription>
          </DialogHeader>
          {rotate.open && (
            <div className="pt-2">
              <CredentialRotatePanel
                error={rotate.error}
                onCancel={rotate.onCancel}
                onSecretChange={rotate.onSecretChange}
                onSubmit={rotate.onSubmit}
                pending={rotate.pending}
                secret={rotate.secret}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={disable.credential !== null} onOpenChange={open => !open && disable.onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><ShieldX /></AlertDialogMedia>
            <AlertDialogTitle>
              禁用
              {disable.credential === null ? " Provider 凭据" : ` ${disable.credential.name}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              禁用后，该 Credential 立即停止参与后续上游请求；已有历史记录仍会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disable.error !== null && (
            <p role="alert" className="text-sm text-destructive">
              {describeApiError(disable.error, "无法禁用凭据，请检查引用状态后重试。")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disable.pending} onClick={disable.onCancel}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={disable.pending} onClick={disable.onConfirm}>
              {disable.pending && <Spinner data-icon="inline-start" aria-label="禁用中" />}
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
