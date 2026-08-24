import type { Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

import { connectionProtocolDefaultPaths, connectionProtocolItems } from "./connection-protocol-options";
import { useCreateConnection } from "./hooks";
import { findPresetBySlug, PROVIDER_PRESETS } from "./presets";

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

type FormValue = z.infer<typeof FormSchema>;

const presetItems = [
  { value: "custom", label: "自定义 / 私有部署" },
  ...PROVIDER_PRESETS.map(preset => ({ value: preset.slug, label: preset.name })),
];

export function CreateConnectionForm({ onCreated }: { readonly onCreated: (connectionId: string) => void }) {
  const mutation = useCreateConnection();
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>("custom");
  const requestPathIsCustomRef = useRef(false);

  const form = useForm<FormValue>({
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

  return (
    <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
      <FieldGroup>
        <PresetField selectedSlug={selectedPresetSlug} onSelect={handlePresetSelect} />

        <Field data-invalid={form.formState.errors.name !== undefined || undefined}>
          <FieldLabel htmlFor="connection-name">名称</FieldLabel>
          <Input
            id="connection-name"
            aria-invalid={form.formState.errors.name !== undefined}
            placeholder="例如：DeepSeek"
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={form.formState.errors.providerSlug !== undefined || undefined}>
          <FieldLabel htmlFor="connection-provider">Provider 标识</FieldLabel>
          <Input
            id="connection-provider"
            aria-invalid={form.formState.errors.providerSlug !== undefined}
            placeholder="例如：deepseek"
            {...form.register("providerSlug")}
          />
          <FieldError errors={[form.formState.errors.providerSlug]} />
        </Field>

        <Field data-invalid={form.formState.errors.secret !== undefined || undefined}>
          <FieldLabel htmlFor="connection-secret">Provider API Key</FieldLabel>
          <Input
            id="connection-secret"
            type="password"
            autoComplete="off"
            aria-invalid={form.formState.errors.secret !== undefined}
            placeholder="sk-..."
            {...form.register("secret")}
          />
          <FieldDescription>API Key 将在服务端使用 AES-256-GCM 加密存储，不进入日志与前端持久化。</FieldDescription>
          <FieldError errors={[form.formState.errors.secret]} />
        </Field>

        <ProtocolField
          control={form.control}
          onProtocolChange={(protocol) => {
            if (!requestPathIsCustomRef.current)
              form.setValue("requestPath", connectionProtocolDefaultPaths[protocol], { shouldValidate: true });
          }}
        />

        <Field data-invalid={form.formState.errors.baseUrl !== undefined || undefined}>
          <FieldLabel htmlFor="connection-url">上游 Base URL</FieldLabel>
          <Input
            id="connection-url"
            aria-invalid={form.formState.errors.baseUrl !== undefined}
            placeholder="https://api.deepseek.com"
            {...form.register("baseUrl")}
          />
          <FieldError errors={[form.formState.errors.baseUrl]} />
        </Field>

        <Field data-invalid={form.formState.errors.requestPath !== undefined || undefined}>
          <FieldLabel htmlFor="connection-path">请求路径</FieldLabel>
          <Input
            id="connection-path"
            {...form.register("requestPath", {
              onChange: () => {
                requestPathIsCustomRef.current = true;
              },
            })}
          />
          <FieldDescription>切换协议时更新推荐路径；手工修改后不再自动覆盖。</FieldDescription>
          <FieldError errors={[form.formState.errors.requestPath]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="connection-account">账号名称</FieldLabel>
          <Input id="connection-account" {...form.register("accountName")} />
          <FieldError errors={[form.formState.errors.accountName]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="connection-credential">凭据名称</FieldLabel>
          <Input id="connection-credential" {...form.register("credentialName")} />
          <FieldError errors={[form.formState.errors.credentialName]} />
        </Field>
      </FieldGroup>

      {mutation.isError && (
        <FieldError>{describeApiError(mutation.error, "无法创建连接")}</FieldError>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && (
            <Spinner data-icon="inline-start" aria-label="加载中" />
          )}
          保存连接
        </Button>
      </div>
    </form>
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
      <FieldLabel htmlFor="preset-select">快速选择常用厂商模板（可选）</FieldLabel>
      <Select items={presetItems} value={selectedSlug} onValueChange={value => value !== null && onSelect(value)}>
        <SelectTrigger id="preset-select" className="w-full">
          <SelectValue placeholder="选择预设厂商以快速填入配置" />
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
      <FieldDescription>选择主流厂商将自动补全协议、Base URL 和请求路径。</FieldDescription>
    </Field>
  );
}

function ProtocolField({ control, onProtocolChange }: {
  readonly control: Control<FormValue>;
  readonly onProtocolChange: (protocol: FormValue["protocol"]) => void;
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
