import type { ReactElement, ReactNode } from "react";

import { useRef, useState } from "react";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

export interface DeletionDialogController {
  readonly pending: boolean;
  readonly finalFocus: () => HTMLElement | null;
  readonly confirm: (action: () => Promise<unknown>, onSuccess?: () => void) => Promise<void>;
}

export function DeletionDialog({
  children,
  finalFocus,
  trigger,
}: {
  readonly children: (controller: DeletionDialogController) => ReactElement | null;
  readonly finalFocus: () => HTMLElement | null;
  readonly trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const focusAfterDeleteRef = useRef(false);

  const confirm = async (action: () => Promise<unknown>, onSuccess?: () => void) => {
    if (pending)
      return;
    focusAfterDeleteRef.current = true;
    setPending(true);
    try {
      await action();
    } catch {
      focusAfterDeleteRef.current = false;
      setPending(false);
      return;
    }
    setOpen(false);
    setPending(false);
    onSuccess?.();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && pending) {
          eventDetails.cancel();
          return;
        }
        if (!nextOpen)
          focusAfterDeleteRef.current = false;
        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      {open && children({
        confirm,
        finalFocus: () => focusAfterDeleteRef.current ? finalFocus() : null,
        pending,
      })}
    </AlertDialog>
  );
}

export function DeletionDialogContent({
  canDelete,
  deleteError,
  deleteErrorFallback,
  deleteErrorTitle,
  description,
  finalFocus,
  icon,
  impact,
  onConfirm,
  pending,
  title,
}: {
  readonly canDelete: boolean;
  readonly deleteError: unknown;
  readonly deleteErrorFallback: string;
  readonly deleteErrorTitle: string;
  readonly description: ReactNode;
  readonly finalFocus: () => HTMLElement | null;
  readonly icon: ReactNode;
  readonly impact: ReactNode;
  readonly onConfirm: () => void;
  readonly pending: boolean;
  readonly title: ReactNode;
}) {
  return (
    <AlertDialogContent finalFocus={finalFocus}>
      <AlertDialogHeader>
        <AlertDialogMedia>{icon}</AlertDialogMedia>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>

      {impact}

      {deleteError !== null && deleteError !== undefined && (
        <Alert variant="destructive">
          <AlertTitle>{deleteErrorTitle}</AlertTitle>
          <AlertDescription>{describeApiError(deleteError, deleteErrorFallback)}</AlertDescription>
        </Alert>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={!canDelete || pending} onClick={onConfirm}>
          {pending && <Spinner data-icon="inline-start" aria-label="删除中" />}
          确认删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export function DeletionImpactState({
  children,
  error,
  loading,
  loadingClassName,
  onRetry,
}: {
  readonly children: ReactNode;
  readonly error: unknown;
  readonly loading: boolean;
  readonly loadingClassName: string;
  readonly onRetry: () => void;
}) {
  if (loading)
    return <Skeleton aria-label="正在加载删除影响" className={loadingClassName} />;

  if (error !== null && error !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>无法加载删除影响</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{describeApiError(error, "暂时无法确认删除是否安全。")}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>重新加载</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return children;
}

export function DeletionImpactCounts({ counts }: {
  readonly counts: readonly (readonly [string, number])[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
      {counts.map(([label, count]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
