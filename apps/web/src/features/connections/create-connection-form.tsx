import type { FormEvent } from "react";
import type { ConnectionFormValue } from "./create-connection-form-fields";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

import { Spinner } from "@/components/ui/spinner";
import { connectionProtocolDefaultPaths } from "./connection-protocol-options";
import {
  ConnectionEndpointFields,
  ConnectionProviderFields,
} from "./create-connection-form-fields";
import { useCreateConnection } from "./hooks";
import { findPresetBySlug } from "./presets";

const FormSchema = z.object({
  name: z.string().trim().min(1, "请输入连接名称"),
  providerSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "请输入小写短横线标识"),
  protocol: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  baseUrl: z.string().url("请输入合法的 URL"),
  requestPath: z.string().startsWith("/", "请求路径必须以 / 开头"),
  accountName: z.string().trim().min(1, "请输入账号名称"),
  credentialName: z.string().trim().min(1, "请输入凭据名称"),
  secret: z.string().min(1, "请输入 API Key"),
});
const ProviderStepSchema = FormSchema.pick({ name: true, providerSlug: true, secret: true });

type FormStep = "provider" | "endpoint";
type ProviderStepField = keyof z.infer<typeof ProviderStepSchema>;

export function CreateConnectionForm({ onCancel, onCreated }: {
  readonly onCancel: () => void;
  readonly onCreated: (connectionId: string) => void;
}) {
  const mutation = useCreateConnection();
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>("custom");
  const [step, setStep] = useState<FormStep>("provider");
  const requestPathIsCustomRef = useRef(false);

  const form = useForm<ConnectionFormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      providerSlug: "",
      protocol: "openai-chat",
      baseUrl: "",
      requestPath: "/v1/chat/completions",
      accountName: "主账号",
      credentialName: "主 Key",
      secret: "",
    },
  });

  const handlePresetSelect = (slug: string) => {
    setSelectedPresetSlug(slug);
    if (slug === "custom")
      return;
    const preset = findPresetBySlug(slug);
    if (preset === undefined)
      return;
    form.setValue("name", preset.name, { shouldValidate: true });
    form.setValue("providerSlug", preset.slug, { shouldValidate: true });
    form.setValue("protocol", preset.protocol, { shouldValidate: true });
    form.setValue("baseUrl", preset.baseUrl, { shouldValidate: true });
    form.setValue("requestPath", preset.requestPath, { shouldValidate: true });
    requestPathIsCustomRef.current = false;
  };

  const submit = form.handleSubmit(async (value) => {
    const connection = await mutation.create({
      name: value.name,
      providerSlug: value.providerSlug,
      endpoint: {
        name: "默认 Endpoint",
        protocol: value.protocol,
        baseUrl: value.baseUrl,
        requestPath: value.requestPath,
        authScheme: "bearer",
        supportsStreaming: true,
      },
      account: { name: value.accountName, billingMode: "unknown" },
      credential: { name: value.credentialName, secret: value.secret },
    });
    form.reset();
    requestPathIsCustomRef.current = false;
    onCreated(connection.id);
  });

  const goToEndpoint = () => {
    const result = ProviderStepSchema.safeParse(form.getValues());
    form.clearErrors();
    if (result.success) {
      setStep("endpoint");
      return;
    }
    let firstInvalidField: ProviderStepField | undefined;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field !== "name" && field !== "providerSlug" && field !== "secret")
        continue;
      firstInvalidField ??= field;
      form.setError(field, { message: issue.message, type: "manual" });
    }
    if (firstInvalidField !== undefined)
      form.setFocus(firstInvalidField);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step === "provider") {
      event.preventDefault();
      goToEndpoint();
      return;
    }
    void submit(event);
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 overflow-y-auto px-6 pb-6">
        <ConnectionStepIndicator step={step} />

        {step === "provider"
          ? (
              <ConnectionProviderFields
                errors={form.formState.errors}
                register={form.register}
                selectedPresetSlug={selectedPresetSlug}
                onPresetSelect={handlePresetSelect}
              />
            )
          : (
              <ConnectionEndpointFields
                control={form.control}
                errors={form.formState.errors}
                register={form.register}
                mutationError={mutation.error}
                mutationIsError={mutation.isError}
                onProtocolChange={(protocol) => {
                  if (!requestPathIsCustomRef.current)
                    form.setValue("requestPath", connectionProtocolDefaultPaths[protocol], { shouldValidate: true });
                }}
                onRequestPathChange={() => {
                  requestPathIsCustomRef.current = true;
                }}
              />
            )}
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        {step === "provider"
          ? (
              <>
                <Button key="cancel" type="button" variant="outline" onClick={onCancel}>取消</Button>
                <Button key="next" type="button" onClick={goToEndpoint}>下一步：Endpoint</Button>
              </>
            )
          : (
              <>
                <Button key="previous" type="button" variant="outline" disabled={mutation.isPending} onClick={() => setStep("provider")}>上一步</Button>
                <Button key="create" type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Spinner data-icon="inline-start" aria-label="创建中" />}
                  创建连接
                </Button>
              </>
            )}
      </DialogFooter>
    </form>
  );
}

function ConnectionStepIndicator({ step }: { readonly step: FormStep }) {
  return (
    <ol className="mb-6 grid grid-cols-2 gap-2" aria-label="创建连接步骤">
      <li
        aria-current={step === "provider" ? "step" : undefined}
        className={step === "provider" ? "rounded-lg border border-primary/30 bg-primary/5 p-3" : "rounded-lg border p-3 text-muted-foreground"}
      >
        <span className="block text-xs font-medium">步骤 1</span>
        <span className="text-sm font-medium text-foreground">Provider</span>
      </li>
      <li
        aria-current={step === "endpoint" ? "step" : undefined}
        className={step === "endpoint" ? "rounded-lg border border-primary/30 bg-primary/5 p-3" : "rounded-lg border p-3 text-muted-foreground"}
      >
        <span className="block text-xs font-medium">步骤 2</span>
        <span className="text-sm font-medium text-foreground">Endpoint</span>
      </li>
    </ol>
  );
}
