import type { AddEndpointsFormValue } from "./endpoint-form-schema";

import type { components } from "@/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

import { describeApiError } from "@/lib/api-runtime/client";
import { useUpdateEndpoint } from "../hooks";
import { connectionProtocolDefaultPaths } from "../shared/connection-protocol-options";
import { EndpointFormFields } from "./endpoint-form-fields";
import { addEndpointsFormSchema } from "./endpoint-form-schema";
import { usePendingDialog } from "./use-pending-dialog";

type Connection = components["schemas"]["Connection"];
type Endpoint = Connection["endpoints"][number];

export function EditEndpointDialog({ connection, endpoint }: {
  readonly connection: Connection;
  readonly endpoint: Endpoint;
}) {
  const dialog = usePendingDialog();

  return (
    <Dialog
      open={dialog.open}
      onOpenChange={dialog.onOpenChange}
    >
      <DialogTrigger render={<Button type="button" size="xs" variant="outline" />}>编辑</DialogTrigger>
      {dialog.open && <EditEndpointContent connection={connection} endpoint={endpoint} onClose={() => dialog.setOpen(false)} onPendingChange={dialog.setPending} />}
    </Dialog>
  );
}

function EditEndpointContent({ connection, endpoint, onClose, onPendingChange }: {
  readonly connection: Connection;
  readonly endpoint: Endpoint;
  readonly onClose: () => void;
  readonly onPendingChange: (pending: boolean) => void;
}) {
  const mutation = useUpdateEndpoint(connection.id);
  const requestPathIsCustomRef = useRef(endpoint.requestPath !== connectionProtocolDefaultPaths[endpoint.protocol]);
  const boundCredentialIds = connection.accounts.flatMap(account => account.credentials
    .filter(credential => credential.endpointIds.includes(endpoint.id))
    .map(credential => credential.id));
  const credentials = connection.accounts.flatMap(account => account.credentials
    .filter(credential => credential.status !== "disabled" || boundCredentialIds.includes(credential.id))
    .map(credential => ({
      disabled: credential.status === "disabled",
      id: credential.id,
      label: `${account.name} · ${credential.name} · ${credential.maskedDisplay}`,
    })));
  const createValue = (): AddEndpointsFormValue => ({ endpoints: [{
    name: endpoint.name,
    protocol: endpoint.protocol,
    baseUrl: endpoint.baseUrl,
    requestPath: endpoint.requestPath,
    authScheme: endpoint.authScheme,
    supportsStreaming: endpoint.supportsStreaming,
    credentialIds: boundCredentialIds,
  }] });
  const form = useForm<AddEndpointsFormValue>({ resolver: zodResolver(addEndpointsFormSchema), defaultValues: createValue() });
  const submit = form.handleSubmit(async ({ endpoints: [value] }) => {
    if (value === undefined)
      return;
    if (credentials.some(credential => credential.disabled && value.credentialIds.includes(credential.id))) {
      form.setError("endpoints.0.credentialIds", { message: "请先取消绑定已禁用的 Credential" });
      return;
    }
    onPendingChange(true);
    try {
      await mutation.update(endpoint.id, value);
      onClose();
    } catch {
    } finally {
      onPendingChange(false);
    }
  });

  return (
    <DialogContent showCloseButton={false} className="flex min-h-0 flex-col max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
        <DialogTitle>编辑 Endpoint</DialogTitle>
        <DialogDescription>
          更新
          {endpoint.name}
          {" "}
          的上游协议入口和 Credential 绑定。
        </DialogDescription>
      </DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => void submit(event)}>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <EndpointFormFields
            control={form.control}
            credentials={credentials}
            endpointIndex={0}
            errors={form.formState.errors}
            idPrefix={`edit-endpoint-${endpoint.id}`}
            pending={mutation.isPending}
            register={form.register}
            title="Endpoint 配置"
            onProtocolChange={(protocol) => {
              if (!requestPathIsCustomRef.current)
                form.setValue("endpoints.0.requestPath", connectionProtocolDefaultPaths[protocol], { shouldValidate: true });
            }}
            onRequestPathChange={() => { requestPathIsCustomRef.current = true; }}
          />
          {mutation.isError && <FieldError className="mt-4">{describeApiError(mutation.error, "无法更新 Endpoint")}</FieldError>}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
          <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>取消</DialogClose>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" aria-label="保存中" />}
            保存修改
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
