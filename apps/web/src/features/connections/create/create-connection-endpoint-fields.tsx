import type {
  Control,
  FieldErrors,
  FieldError as ReactHookFormFieldError,
  UseFormRegister,
} from "react-hook-form";
import type { ConnectionEndpointFormValue, ConnectionFormValue } from "./create-connection-form-types";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { connectionProtocolItems } from "../shared/connection-protocol-options";
import { endpointCredentialRefsPath, endpointProtocolPath, fieldPath } from "./create-connection-form-types";

interface CredentialErrors {
  readonly ref?: ReactHookFormFieldError;
}

interface AccountErrors {
  readonly credentials?: readonly (CredentialErrors | undefined)[];
}

export function EndpointFields({
  canRemove,
  control,
  credentialOptions,
  endpointIndex,
  errors,
  onProtocolChange,
  onRemove,
  onRequestPathChange,
  register,
}: {
  readonly canRemove: boolean;
  readonly control: Control<ConnectionFormValue>;
  readonly credentialOptions: readonly { readonly ref: string; readonly label: string }[];
  readonly endpointIndex: number;
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly onProtocolChange: (protocol: ConnectionEndpointFormValue["protocol"]) => void;
  readonly onRemove: () => void;
  readonly onRequestPathChange: () => void;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  return (
    <section className="rounded-lg border p-4" aria-labelledby={`connection-endpoint-title-${endpointIndex}`}>
      <EndpointHeader endpointIndex={endpointIndex} canRemove={canRemove} onRemove={onRemove} register={register} />
      <FieldGroup className="sm:grid sm:grid-cols-2">
        <ProtocolField control={control} endpointIndex={endpointIndex} onProtocolChange={onProtocolChange} />

        <Field data-invalid={errors.endpoints?.[endpointIndex]?.name !== undefined || undefined}>
          <FieldLabel htmlFor={`connection-endpoint-name-${endpointIndex}`}>Endpoint 名称</FieldLabel>
          <Input
            id={`connection-endpoint-name-${endpointIndex}`}
            aria-invalid={errors.endpoints?.[endpointIndex]?.name !== undefined}
            placeholder="例如：Chat"
            {...register(fieldPath(`endpoints.${endpointIndex}.name`))}
          />
          <FieldError errors={[errors.endpoints?.[endpointIndex]?.name]} />
        </Field>
        <EndpointUrlField endpointIndex={endpointIndex} errors={errors} register={register} />
      </FieldGroup>

      <EndpointPathField endpointIndex={endpointIndex} errors={errors} onRequestPathChange={onRequestPathChange} register={register} />
      <EndpointCredentialField control={control} credentialOptions={credentialOptions} endpointIndex={endpointIndex} />
    </section>
  );
}

export function CredentialBindingError({ errors }: { readonly errors: FieldErrors<ConnectionFormValue> }) {
  const accountErrors = Array.isArray(errors.accounts)
    ? errors.accounts as readonly (AccountErrors | undefined)[]
    : [];
  const bindingErrors = accountErrors.flatMap(account =>
    account?.credentials?.flatMap((credential) => {
      const error = credential?.ref;
      return error === undefined ? [] : [error];
    }) ?? [],
  ) ?? [];
  return <FieldError errors={bindingErrors} />;
}

function EndpointHeader({
  canRemove,
  endpointIndex,
  onRemove,
  register,
}: {
  readonly canRemove: boolean;
  readonly endpointIndex: number;
  readonly onRemove: () => void;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 id={`connection-endpoint-title-${endpointIndex}`} className="text-sm font-medium">
        {`Endpoint ${endpointIndex + 1}`}
      </h3>
      <input type="hidden" {...register(fieldPath(`endpoints.${endpointIndex}.ref`))} />
      <Button type="button" variant="ghost" size="sm" disabled={!canRemove} onClick={onRemove}>
        删除 Endpoint
      </Button>
    </div>
  );
}

function EndpointUrlField({
  endpointIndex,
  errors,
  register,
}: {
  readonly endpointIndex: number;
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  return (
    <Field data-invalid={errors.endpoints?.[endpointIndex]?.baseUrl !== undefined || undefined}>
      <FieldLabel htmlFor={`connection-url-${endpointIndex}`}>上游 Base URL</FieldLabel>
      <Input
        id={`connection-url-${endpointIndex}`}
        aria-invalid={errors.endpoints?.[endpointIndex]?.baseUrl !== undefined}
        placeholder="https://api.deepseek.com"
        {...register(fieldPath(`endpoints.${endpointIndex}.baseUrl`))}
      />
      <FieldError errors={[errors.endpoints?.[endpointIndex]?.baseUrl]} />
    </Field>
  );
}

function EndpointPathField({
  endpointIndex,
  errors,
  onRequestPathChange,
  register,
}: {
  readonly endpointIndex: number;
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly onRequestPathChange: () => void;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  return (
    <Field className="mt-4" data-invalid={errors.endpoints?.[endpointIndex]?.requestPath !== undefined || undefined}>
      <FieldLabel htmlFor={`connection-path-${endpointIndex}`}>请求路径</FieldLabel>
      <Input
        id={`connection-path-${endpointIndex}`}
        aria-invalid={errors.endpoints?.[endpointIndex]?.requestPath !== undefined}
        {...register(fieldPath(`endpoints.${endpointIndex}.requestPath`), { onChange: onRequestPathChange })}
      />
      <FieldDescription>切换协议时更新推荐路径；手工修改后不再自动覆盖。</FieldDescription>
      <FieldError errors={[errors.endpoints?.[endpointIndex]?.requestPath]} />
    </Field>
  );
}

function EndpointCredentialField({
  control,
  credentialOptions,
  endpointIndex,
}: {
  readonly control: Control<ConnectionFormValue>;
  readonly credentialOptions: readonly { readonly ref: string; readonly label: string }[];
  readonly endpointIndex: number;
}) {
  return (
    <Controller
      control={control}
      name={endpointCredentialRefsPath(endpointIndex)}
      render={({ field, fieldState }) => (
        <Field className="mt-4" data-invalid={fieldState.invalid || undefined}>
          <FieldLabel>绑定访问 Key</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={`Endpoint ${endpointIndex + 1} 绑定访问 Key`}>
            {credentialOptions.map(option => (
              <CredentialCheckbox
                key={option.ref}
                checked={(field.value ?? []).includes(option.ref)}
                label={option.label}
                onChange={value => field.onChange(value === true
                  ? [...(field.value ?? []), option.ref]
                  : (field.value ?? []).filter(ref => ref !== option.ref))}
              />
            ))}
          </div>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function CredentialCheckbox({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange: (value: boolean | "indeterminate") => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function ProtocolField({
  control,
  endpointIndex,
  onProtocolChange,
}: {
  readonly control: Control<ConnectionFormValue>;
  readonly endpointIndex: number;
  readonly onProtocolChange: (protocol: ConnectionEndpointFormValue["protocol"]) => void;
}) {
  return (
    <Controller
      control={control}
      name={endpointProtocolPath(endpointIndex)}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={`connection-protocol-${endpointIndex}`}>协议</FieldLabel>
          <Select
            items={connectionProtocolItems}
            value={field.value}
            onValueChange={(value) => {
              if (value !== null) {
                const protocol = value as ConnectionEndpointFormValue["protocol"];
                field.onChange(protocol);
                onProtocolChange(protocol);
              }
            }}
          >
            <SelectTrigger
              id={`connection-protocol-${endpointIndex}`}
              className="w-full"
              aria-invalid={fieldState.invalid}
              onBlur={field.onBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {connectionProtocolItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
