import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { ConnectionEndpointFormValue, ConnectionFormValue } from "./create-connection-form-types";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { describeApiError } from "@/lib/api-runtime/client";

import { AccountFields } from "./create-connection-account-fields";
import { CredentialBindingError, EndpointFields } from "./create-connection-endpoint-fields";
import { PROVIDER_PRESETS } from "./presets";

const presetItems = [
  { value: "custom", label: "自定义 / 私有部署" },
  ...PROVIDER_PRESETS.map(preset => ({ value: preset.slug, label: preset.name })),
];

interface SharedFieldProps {
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly register: UseFormRegister<ConnectionFormValue>;
}

export function ConnectionProviderFields({
  accountFields,
  control,
  errors,
  onAccountAdded,
  onAccountRemoved,
  onCredentialAdded,
  onCredentialRemoved,
  onPresetSelect,
  register,
  selectedPresetSlug,
}: SharedFieldProps & {
  readonly accountFields: readonly FieldArrayWithId<ConnectionFormValue, "accounts", "id">[];
  readonly control: Control<ConnectionFormValue>;
  readonly onAccountAdded: () => void;
  readonly onAccountRemoved: (index: number) => void;
  readonly onCredentialAdded: () => string;
  readonly onCredentialRemoved: (ref: string) => void;
  readonly onPresetSelect: (slug: string) => void;
  readonly selectedPresetSlug: string;
}) {
  return (
    <FieldSet>
      <FieldLegend>Provider 与访问凭据</FieldLegend>
      <FieldGroup>
        <PresetField selectedSlug={selectedPresetSlug} onSelect={onPresetSelect} />

        <FieldGroup className="sm:grid sm:grid-cols-2">
          <Field data-invalid={errors.name !== undefined || undefined}>
            <FieldLabel htmlFor="connection-name">连接名称</FieldLabel>
            <Input
              id="connection-name"
              aria-invalid={errors.name !== undefined}
              placeholder="例如：DeepSeek"
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={errors.providerSlug !== undefined || undefined}>
            <FieldLabel htmlFor="connection-provider">Provider 标识</FieldLabel>
            <Input
              id="connection-provider"
              aria-invalid={errors.providerSlug !== undefined}
              placeholder="例如：deepseek"
              {...register("providerSlug")}
            />
            <FieldDescription>使用小写字母、数字和短横线。</FieldDescription>
            <FieldError errors={[errors.providerSlug]} />
          </Field>
        </FieldGroup>

        {accountFields.map((account, accountIndex) => (
          <AccountFields
            key={account.id}
            accountIndex={accountIndex}
            control={control}
            errors={errors}
            register={register}
            canRemove={accountFields.length > 1}
            onRemove={() => onAccountRemoved(accountIndex)}
            onCredentialAdded={onCredentialAdded}
            onCredentialRemoved={onCredentialRemoved}
          />
        ))}

        <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={onAccountAdded}>
          添加账号
        </Button>
      </FieldGroup>
    </FieldSet>
  );
}

export function ConnectionEndpointFields({
  control,
  credentialOptions,
  endpointFields,
  errors,
  mutationError,
  mutationIsError,
  onAddEndpoint,
  onEndpointRemoved,
  onProtocolChange,
  onRequestPathChange,
  register,
}: SharedFieldProps & {
  readonly control: Control<ConnectionFormValue>;
  readonly credentialOptions: readonly { readonly ref: string; readonly label: string }[];
  readonly endpointFields: readonly FieldArrayWithId<ConnectionFormValue, "endpoints", "id">[];
  readonly mutationError: unknown;
  readonly mutationIsError: boolean;
  readonly onAddEndpoint: () => void;
  readonly onEndpointRemoved: (index: number) => void;
  readonly onProtocolChange: (index: number, protocol: ConnectionEndpointFormValue["protocol"]) => void;
  readonly onRequestPathChange: (index: number) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend>协议 Endpoint 与绑定</FieldLegend>
      <FieldDescription>每个协议都是独立 Endpoint；为每个 Endpoint 选择至少一个可用 Key。</FieldDescription>
      <CredentialBindingError errors={errors} />
      <FieldGroup>
        {endpointFields.map((endpoint, endpointIndex) => (
          <EndpointFields
            key={endpoint.id}
            control={control}
            credentialOptions={credentialOptions}
            endpointIndex={endpointIndex}
            errors={errors}
            register={register}
            canRemove={endpointFields.length > 1}
            onRemove={() => onEndpointRemoved(endpointIndex)}
            onProtocolChange={protocol => onProtocolChange(endpointIndex, protocol)}
            onRequestPathChange={() => onRequestPathChange(endpointIndex)}
          />
        ))}
        <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={onAddEndpoint}>
          添加 Endpoint
        </Button>
      </FieldGroup>

      {mutationIsError && <FieldError>{describeApiError(mutationError, "无法创建连接")}</FieldError>}
    </FieldSet>
  );
}

function PresetField({
  onSelect,
  selectedSlug,
}: {
  readonly onSelect: (slug: string) => void;
  readonly selectedSlug: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="preset-select">Provider 模板（可选）</FieldLabel>
      <Select items={presetItems} value={selectedSlug} onValueChange={value => value !== null && onSelect(value)}>
        <SelectTrigger id="preset-select" className="w-full">
          <SelectValue placeholder="选择 Provider 模板" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="custom">自定义 / 私有部署</SelectItem>
            {PROVIDER_PRESETS.map(preset => (
              <SelectItem key={preset.slug} value={preset.slug}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
