import type { RefObject } from "react";
import type { components } from "@/api/schema";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

import { useAddConnectionEndpoint } from "../hooks";
import { EndpointFormFields } from "./endpoint-form-fields";
import { useAddEndpointDraft } from "./use-add-endpoint-draft";
import { usePendingDialog } from "./use-pending-dialog";

type Connection = components["schemas"]["Connection"];

export function AddEndpointDialog({ connection, disabled, triggerRef }: {
  readonly connection: Connection;
  readonly disabled: boolean;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = usePendingDialog();

  return (
    <Dialog
      open={dialog.open}
      onOpenChange={dialog.onOpenChange}
    >
      <DialogTrigger render={<Button ref={triggerRef} type="button" size="sm" variant="outline" disabled={disabled} />}>
        <Plus data-icon="inline-start" />
        添加 Endpoint
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="flex min-h-0 flex-col max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>添加 Endpoint</DialogTitle>
          <DialogDescription>
            为
            {" "}
            {connection.name}
            {" "}
            批量添加协议入口。
          </DialogDescription>
        </DialogHeader>
        <AddEndpointForm connection={connection} onCreated={() => dialog.setOpen(false)} onPendingChange={dialog.setPending} />
      </DialogContent>
    </Dialog>
  );
}

function AddEndpointForm({ connection, onCreated, onPendingChange }: {
  readonly connection: Connection;
  readonly onCreated: () => void;
  readonly onPendingChange: (pending: boolean) => void;
}) {
  const mutation = useAddConnectionEndpoint();
  const credentials = connection.accounts.flatMap(account => account.credentials
    .filter(credential => credential.status !== "disabled")
    .map(credential => ({
      disabled: false,
      id: credential.id,
      label: `${account.name} · ${credential.name} · ${credential.maskedDisplay}`,
    })));
  const draft = useAddEndpointDraft(connection, credentials.map(credential => credential.id));
  const submit = draft.form.handleSubmit(async (value) => {
    onPendingChange(true);
    try {
      await mutation.add(connection.id, value);
      onCreated();
    } catch {
    } finally {
      onPendingChange(false);
    }
  });

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => void submit(event)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <FieldGroup>
          {draft.endpointFields.fields.map((endpointField, endpointIndex) => (
            <EndpointFormFields
              key={endpointField.id}
              canRemove={draft.endpointFields.fields.length > 1}
              control={draft.form.control}
              credentials={credentials}
              endpointIndex={endpointIndex}
              errors={draft.form.formState.errors}
              idPrefix={`add-endpoint-${endpointIndex}`}
              pending={mutation.isPending}
              register={draft.form.register}
              title={`Endpoint ${endpointIndex + 1}`}
              onProtocolChange={protocol => draft.onProtocolChange(endpointIndex, endpointField.id, protocol)}
              onRemove={() => draft.removeEndpoint(endpointIndex, endpointField.id)}
              onRequestPathChange={() => draft.onRequestPathChange(endpointField.id)}
            />
          ))}
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={draft.addEndpoint}>
            再添加一个 Endpoint
          </Button>
          {mutation.isError && <FieldError>{describeApiError(mutation.error, "无法添加 Endpoint")}</FieldError>}
        </FieldGroup>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
          取消
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending || credentials.length === 0}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-label="添加中" />}
          添加 Endpoint
        </Button>
      </DialogFooter>
    </form>
  );
}
