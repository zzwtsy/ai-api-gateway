import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { useCreateConnection } from "../hooks";
import {
  ConnectionEndpointFields,
  ConnectionProviderFields,
} from "./create-connection-form-fields";
import { hasConnectionProviderErrors } from "./create-connection-form-types";
import { useCreateConnectionDraft } from "./use-create-connection-draft";

export function CreateConnectionForm({ onCancel, onCreated }: {
  readonly onCancel: () => void;
  readonly onCreated: (connectionId: string) => void;
}) {
  const mutation = useCreateConnection();
  const draft = useCreateConnectionDraft();
  const submit = draft.form.handleSubmit(async (value) => {
    try {
      const connection = await mutation.create({
        name: value.name,
        providerSlug: value.providerSlug,
        endpoints: value.endpoints,
        accounts: value.accounts,
      });
      draft.reset();
      onCreated(connection.id);
    } catch {
      // The mutation owns the visible error; keep the draft intact for correction and retry.
    }
  });

  const goToEndpoint = async () => {
    const valid = await draft.form.trigger(["name", "providerSlug", "accounts"]);
    const nameInvalid = draft.form.getFieldState("name").invalid;
    const providerSlugInvalid = draft.form.getFieldState("providerSlug").invalid;
    if (!valid && (nameInvalid || providerSlugInvalid || hasConnectionProviderErrors(draft.form.formState.errors))) {
      if (nameInvalid)
        draft.form.setFocus("name");
      else if (providerSlugInvalid)
        draft.form.setFocus("providerSlug");
      return;
    }
    draft.setStep("endpoint");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (draft.step === "provider") {
      event.preventDefault();
      void goToEndpoint();
      return;
    }
    void submit(event);
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <ConnectionStepIndicator step={draft.step} />

        {draft.step === "provider"
          ? (
              <ConnectionProviderFields
                accountFields={draft.accountFields.fields}
                control={draft.form.control}
                errors={draft.form.formState.errors}
                register={draft.form.register}
                selectedPresetSlug={draft.selectedPresetSlug}
                onPresetSelect={draft.handlePresetSelect}
                onAccountAdded={draft.addAccount}
                onAccountRemoved={draft.removeAccount}
                onCredentialAdded={draft.addCredential}
                onCredentialRemoved={draft.removeCredentialRefFromEndpoints}
              />
            )
          : (
              <ConnectionEndpointFields
                control={draft.form.control}
                credentialOptions={draft.credentialOptions}
                endpointFields={draft.endpointFields.fields}
                errors={draft.form.formState.errors}
                register={draft.form.register}
                mutationError={mutation.error}
                mutationIsError={mutation.isError}
                onAddEndpoint={draft.addEndpoint}
                onEndpointRemoved={draft.removeEndpoint}
                onProtocolChange={draft.onProtocolChange}
                onRequestPathChange={draft.onRequestPathChange}
              />
            )}
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        {draft.step === "provider"
          ? (
              <>
                <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
                <Button type="button" onClick={() => void goToEndpoint()}>下一步：Endpoint</Button>
              </>
            )
          : (
              <>
                <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => draft.setStep("provider")}>上一步</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Spinner data-icon="inline-start" aria-label="创建中" />}
                  创建连接
                </Button>
              </>
            )}
      </DialogFooter>
    </form>
  );
}

function ConnectionStepIndicator({ step }: { readonly step: "provider" | "endpoint" }) {
  return (
    <ol className="mb-6 grid grid-cols-2 gap-2" aria-label="创建连接步骤">
      <li
        aria-current={step === "provider" ? "step" : undefined}
        className={step === "provider" ? "rounded-lg border border-primary/30 bg-primary/5 p-3" : "rounded-lg border p-3 text-muted-foreground"}
      >
        <span className="block text-xs font-medium">步骤 1</span>
        <span className="text-sm font-medium text-foreground">Provider 与 Key</span>
      </li>
      <li
        aria-current={step === "endpoint" ? "step" : undefined}
        className={step === "endpoint" ? "rounded-lg border border-primary/30 bg-primary/5 p-3" : "rounded-lg border p-3 text-muted-foreground"}
      >
        <span className="block text-xs font-medium">步骤 2</span>
        <span className="text-sm font-medium text-foreground">协议 Endpoint</span>
      </li>
    </ol>
  );
}
