import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type { AddEndpointsFormValue } from "./endpoint-form-schema";

import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { connectionProtocolItems } from "../shared/connection-protocol-options";

export interface EndpointCredentialOption {
  readonly disabled: boolean;
  readonly id: string;
  readonly label: string;
}

const authSchemeItems = [
  { label: "Bearer Token", value: "bearer" },
  { label: "X-API-Key", value: "x-api-key" },
] as const;

export function EndpointFormFields({
  canRemove,
  control,
  credentials,
  endpointIndex,
  errors,
  idPrefix,
  onProtocolChange,
  onRemove,
  onRequestPathChange,
  pending,
  register,
  title,
}: {
  readonly canRemove?: boolean;
  readonly control: Control<AddEndpointsFormValue>;
  readonly credentials: readonly EndpointCredentialOption[];
  readonly endpointIndex: number;
  readonly errors: FieldErrors<AddEndpointsFormValue>;
  readonly idPrefix: string;
  readonly onProtocolChange: (protocol: AddEndpointsFormValue["endpoints"][number]["protocol"]) => void;
  readonly onRemove?: () => void;
  readonly onRequestPathChange: () => void;
  readonly pending: boolean;
  readonly register: UseFormRegister<AddEndpointsFormValue>;
  readonly title: string;
}) {
  const endpointErrors = errors.endpoints?.[endpointIndex];
  const fieldName = <T extends keyof AddEndpointsFormValue["endpoints"][number]>(name: T) => `endpoints.${endpointIndex}.${name}` as const;

  return (
    <section className="rounded-lg border p-4" aria-labelledby={`${idPrefix}-title`}>
      <EndpointFieldsHeader canRemove={canRemove} idPrefix={idPrefix} onRemove={onRemove} pending={pending} title={title} />
      <FieldGroup className="sm:grid sm:grid-cols-2">
        <Field data-invalid={endpointErrors?.name !== undefined || undefined}>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Endpoint 名称</FieldLabel>
          <Input id={`${idPrefix}-name`} maxLength={100} disabled={pending} aria-invalid={endpointErrors?.name !== undefined} placeholder="例如：Responses Endpoint" {...register(fieldName("name"))} />
          <FieldError errors={[endpointErrors?.name]} />
        </Field>
        <Controller
          control={control}
          name={fieldName("protocol")}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={`${idPrefix}-protocol`}>协议</FieldLabel>
              <Select
                items={connectionProtocolItems}
                value={field.value}
                disabled={pending}
                onValueChange={(value) => {
                  if (value !== null) {
                    field.onChange(value);
                    onProtocolChange(value);
                  }
                }}
              >
                <SelectTrigger id={`${idPrefix}-protocol`} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{connectionProtocolItems.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Field data-invalid={endpointErrors?.baseUrl !== undefined || undefined}>
          <FieldLabel htmlFor={`${idPrefix}-base-url`}>上游 Base URL</FieldLabel>
          <Input id={`${idPrefix}-base-url`} disabled={pending} aria-invalid={endpointErrors?.baseUrl !== undefined} {...register(fieldName("baseUrl"))} />
          <FieldDescription>按协议填写上游服务的基础地址。</FieldDescription>
          <FieldError errors={[endpointErrors?.baseUrl]} />
        </Field>
        <Field data-invalid={endpointErrors?.requestPath !== undefined || undefined}>
          <FieldLabel htmlFor={`${idPrefix}-request-path`}>请求路径</FieldLabel>
          <Input id={`${idPrefix}-request-path`} disabled={pending} aria-invalid={endpointErrors?.requestPath !== undefined} {...register(fieldName("requestPath"), { onChange: onRequestPathChange })} />
          <FieldDescription>切换协议时更新推荐路径；手工修改后不再自动覆盖。</FieldDescription>
          <FieldError errors={[endpointErrors?.requestPath]} />
        </Field>
        <Controller
          control={control}
          name={fieldName("authScheme")}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={`${idPrefix}-auth-scheme`}>鉴权方式</FieldLabel>
              <Select items={authSchemeItems} value={field.value} disabled={pending} onValueChange={value => value !== null && field.onChange(value)}>
                <SelectTrigger id={`${idPrefix}-auth-scheme`} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{authSchemeItems.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name={fieldName("supportsStreaming")}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Checkbox checked={field.value} disabled={pending} aria-invalid={fieldState.invalid} onCheckedChange={field.onChange} />
                支持流式响应
              </FieldLabel>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <CredentialField control={control} credentials={credentials} fieldName={fieldName("credentialIds")} pending={pending} title={title} />
    </section>
  );
}

function EndpointFieldsHeader({ canRemove, idPrefix, onRemove, pending, title }: {
  readonly canRemove: boolean | undefined;
  readonly idPrefix: string;
  readonly onRemove: (() => void) | undefined;
  readonly pending: boolean;
  readonly title: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 id={`${idPrefix}-title`} className="text-sm font-medium">{title}</h3>
      {onRemove !== undefined && <Button type="button" size="sm" variant="ghost" disabled={canRemove !== true || pending} onClick={onRemove}>删除此行</Button>}
    </div>
  );
}

function CredentialField({ control, credentials, fieldName, pending, title }: {
  readonly control: Control<AddEndpointsFormValue>;
  readonly credentials: readonly EndpointCredentialOption[];
  readonly fieldName: `endpoints.${number}.credentialIds`;
  readonly pending: boolean;
  readonly title: string;
}) {
  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field, fieldState }) => (
        <Field className="mt-5" data-invalid={fieldState.invalid || undefined}>
          <FieldLabel>绑定 Credential</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={`${title} 绑定 Credential`}>
            {credentials.map((credential) => {
              const checked = (field.value ?? []).includes(credential.id);
              return (
                <label key={credential.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={pending || (credential.disabled && !checked)}
                    aria-invalid={fieldState.invalid}
                    onCheckedChange={(nextChecked) => {
                      field.onChange(nextChecked ? [...(field.value ?? []), credential.id] : (field.value ?? []).filter(id => id !== credential.id));
                    }}
                  />
                  <span>
                    {credential.label}
                    {credential.disabled ? "（已禁用，保存前需取消绑定）" : ""}
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
