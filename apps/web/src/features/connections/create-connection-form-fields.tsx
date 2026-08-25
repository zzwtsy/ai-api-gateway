import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { Controller } from "react-hook-form";

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

import { connectionProtocolItems } from "./connection-protocol-options";
import { PROVIDER_PRESETS } from "./presets";

export interface ConnectionFormValue {
  accountName: string;
  baseUrl: string;
  credentialName: string;
  name: string;
  protocol: "openai-chat" | "openai-responses" | "anthropic-messages";
  providerSlug: string;
  requestPath: string;
  secret: string;
}

const presetItems = [
  { value: "custom", label: "自定义 / 私有部署" },
  ...PROVIDER_PRESETS.map(preset => ({ value: preset.slug, label: preset.name })),
];

interface SharedFieldProps {
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly register: UseFormRegister<ConnectionFormValue>;
}

export function ConnectionProviderFields({
  errors,
  onPresetSelect,
  register,
  selectedPresetSlug,
}: SharedFieldProps & {
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

        <Field data-invalid={errors.secret !== undefined || undefined}>
          <FieldLabel htmlFor="connection-secret">Provider API Key</FieldLabel>
          <Input
            id="connection-secret"
            type="password"
            autoComplete="off"
            aria-invalid={errors.secret !== undefined}
            placeholder="sk-..."
            {...register("secret")}
          />
          <FieldDescription>Secret 仅提交给 Gateway，不会保存在浏览器中。</FieldDescription>
          <FieldError errors={[errors.secret]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

export function ConnectionEndpointFields({
  control,
  errors,
  mutationError,
  mutationIsError,
  onProtocolChange,
  onRequestPathChange,
  register,
}: SharedFieldProps & {
  readonly control: Control<ConnectionFormValue>;
  readonly mutationError: unknown;
  readonly mutationIsError: boolean;
  readonly onProtocolChange: (protocol: ConnectionFormValue["protocol"]) => void;
  readonly onRequestPathChange: () => void;
}) {
  return (
    <FieldSet>
      <FieldLegend>默认 Endpoint 与凭据名称</FieldLegend>
      <FieldGroup>
        <FieldGroup className="sm:grid sm:grid-cols-2">
          <ProtocolField control={control} onProtocolChange={onProtocolChange} />

          <Field data-invalid={errors.baseUrl !== undefined || undefined}>
            <FieldLabel htmlFor="connection-url">上游 Base URL</FieldLabel>
            <Input
              id="connection-url"
              aria-invalid={errors.baseUrl !== undefined}
              placeholder="https://api.deepseek.com"
              {...register("baseUrl")}
            />
            <FieldError errors={[errors.baseUrl]} />
          </Field>
        </FieldGroup>

        <Field data-invalid={errors.requestPath !== undefined || undefined}>
          <FieldLabel htmlFor="connection-path">请求路径</FieldLabel>
          <Input
            id="connection-path"
            aria-invalid={errors.requestPath !== undefined}
            {...register("requestPath", { onChange: onRequestPathChange })}
          />
          <FieldDescription>切换协议时更新推荐路径；手工修改后不再自动覆盖。</FieldDescription>
          <FieldError errors={[errors.requestPath]} />
        </Field>

        <FieldGroup className="sm:grid sm:grid-cols-2">
          <Field data-invalid={errors.accountName !== undefined || undefined}>
            <FieldLabel htmlFor="connection-account">账号名称</FieldLabel>
            <Input
              id="connection-account"
              aria-invalid={errors.accountName !== undefined}
              {...register("accountName")}
            />
            <FieldError errors={[errors.accountName]} />
          </Field>

          <Field data-invalid={errors.credentialName !== undefined || undefined}>
            <FieldLabel htmlFor="connection-credential">凭据名称</FieldLabel>
            <Input
              id="connection-credential"
              aria-invalid={errors.credentialName !== undefined}
              {...register("credentialName")}
            />
            <FieldError errors={[errors.credentialName]} />
          </Field>
        </FieldGroup>
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

function ProtocolField({ control, onProtocolChange }: {
  readonly control: Control<ConnectionFormValue>;
  readonly onProtocolChange: (protocol: ConnectionFormValue["protocol"]) => void;
}) {
  return (
    <Controller
      control={control}
      name="protocol"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor="connection-protocol">协议</FieldLabel>
          <Select
            items={connectionProtocolItems}
            value={field.value}
            onValueChange={(value) => {
              if (value !== null) {
                field.onChange(value);
                onProtocolChange(value);
              }
            }}
          >
            <SelectTrigger
              id="connection-protocol"
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
