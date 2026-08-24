import type { components } from "@/api/schema";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

import { connectionProtocolDefaultPaths, connectionProtocolItems } from "./connection-protocol-options";
import { useAddConnectionEndpoint } from "./hooks";

type Connection = components["schemas"]["Connection"];

const FormSchema = z.object({
  name: z.string().trim().min(1, "请输入 Endpoint 名称").max(100, "Endpoint 名称不能超过 100 个字符"),
  protocol: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  baseUrl: z.string().url("请输入合法的 URL"),
  requestPath: z.string().startsWith("/", "请求路径必须以 / 开头"),
  credentialIds: z.array(z.string()).min(1, "至少绑定一个可用 Credential"),
});

type FormValue = z.infer<typeof FormSchema>;

export function AddEndpointForm({ connection, onCreated }: {
  readonly connection: Connection;
  readonly onCreated: () => void;
}) {
  const mutation = useAddConnectionEndpoint();
  const requestPathIsCustomRef = useRef(false);
  const credentials = connection.accounts.flatMap(account => account.credentials
    .filter(credential => credential.status !== "disabled")
    .map(credential => ({
      id: credential.id,
      label: `${account.name} · ${credential.name} · ${credential.maskedDisplay}`,
    })));
  const form = useForm<FormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      protocol: "openai-chat",
      baseUrl: connection.endpoints[0]?.baseUrl ?? "",
      requestPath: connectionProtocolDefaultPaths["openai-chat"],
      credentialIds: credentials.map(credential => credential.id),
    },
  });

  const submit = form.handleSubmit(async (value) => {
    await mutation.add(connection.id, {
      ...value,
      authScheme: connection.endpoints[0]?.authScheme ?? "bearer",
      supportsStreaming: true,
    });
    onCreated();
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name !== undefined || undefined}>
          <FieldLabel htmlFor="endpoint-name">Endpoint 名称</FieldLabel>
          <Input id="endpoint-name" maxLength={100} aria-invalid={form.formState.errors.name !== undefined} placeholder="例如：Responses Endpoint" {...form.register("name")} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Controller
          control={form.control}
          name="protocol"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="endpoint-protocol">协议</FieldLabel>
              <Select
                items={connectionProtocolItems}
                value={field.value}
                onValueChange={(value) => {
                  if (value !== null) {
                    field.onChange(value);
                    if (!requestPathIsCustomRef.current)
                      form.setValue("requestPath", connectionProtocolDefaultPaths[value], { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="endpoint-protocol" className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {connectionProtocolItems.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Field data-invalid={form.formState.errors.baseUrl !== undefined || undefined}>
          <FieldLabel htmlFor="endpoint-base-url">上游 Base URL</FieldLabel>
          <Input id="endpoint-base-url" aria-invalid={form.formState.errors.baseUrl !== undefined} {...form.register("baseUrl")} />
          <FieldDescription>默认继承当前 Provider 的首个 Endpoint，可按协议单独修改。</FieldDescription>
          <FieldError errors={[form.formState.errors.baseUrl]} />
        </Field>
        <Field data-invalid={form.formState.errors.requestPath !== undefined || undefined}>
          <FieldLabel htmlFor="endpoint-request-path">请求路径</FieldLabel>
          <Input
            id="endpoint-request-path"
            aria-invalid={form.formState.errors.requestPath !== undefined}
            {...form.register("requestPath", { onChange: () => { requestPathIsCustomRef.current = true; } })}
          />
          <FieldDescription>切换协议时更新推荐路径；手工修改后不再自动覆盖。</FieldDescription>
          <FieldError errors={[form.formState.errors.requestPath]} />
        </Field>
        <Controller
          control={form.control}
          name="credentialIds"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel>绑定 Credential</FieldLabel>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {credentials.map(credential => (
                  <label key={credential.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value.includes(credential.id)}
                      onCheckedChange={(checked) => {
                        field.onChange(checked
                          ? [...field.value, credential.id]
                          : field.value.filter(id => id !== credential.id));
                      }}
                    />
                    <span>{credential.label}</span>
                  </label>
                ))}
              </div>
              <FieldDescription>只列出当前 Provider 下未禁用的 Credential。</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      {mutation.isError && <FieldError>{describeApiError(mutation.error, "无法添加 Endpoint")}</FieldError>}
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || credentials.length === 0}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-label="添加中" />}
          添加 Endpoint
        </Button>
      </div>
    </form>
  );
}
