import type { CreateGatewayClientInput } from "./hooks";
import type { components } from "@/api/schema";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { DataErrorState } from "@/components/product/data-error-state";
import { Badge } from "@/components/ui/badge";
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

import { clientProtocolLabel } from "./client-view-model";
import { useCreateGatewayClient, useHarnessProfiles } from "./hooks";

const FormSchema = z.object({
  name: z.string().trim().min(1, "请输入客户端名称").max(100, "客户端名称不能超过 100 个字符"),
  profileSlug: z.string().min(1, "请选择 Harness Profile"),
});

type FormValue = z.infer<typeof FormSchema>;
type CreatedClient = components["schemas"]["GatewayClientWithSecret"];

export function CreateClientForm({ onCreated }: { readonly onCreated: (result: CreatedClient) => void }) {
  const profiles = useHarnessProfiles();
  const mutation = useCreateGatewayClient();
  const form = useForm<FormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", profileSlug: "" },
  });
  const selectedProfile = profiles.data?.find(profile => profile.slug === form.watch("profileSlug"));

  const submit = form.handleSubmit(async (value) => {
    const profile = profiles.data?.find(item => item.slug === value.profileSlug);
    if (profile === undefined) {
      form.setError("profileSlug", { message: "请选择有效的 Harness Profile" });
      return;
    }
    const result = await mutation.create({
      name: value.name,
      profileSlug: value.profileSlug,
      allowedProtocols: [...profile.allowedProtocols],
    } satisfies CreateGatewayClientInput);
    form.reset();
    onCreated(result);
  });

  if (profiles.data === undefined && profiles.isError) {
    return (
      <DataErrorState
        title="无法加载 Harness Profile"
        description={describeApiError(profiles.error, "客户端创建所需的 Profile 暂时不可用。")}
        onRetry={profiles.refetch}
      />
    );
  }

  if (profiles.isPending || profiles.data === undefined) {
    return <Spinner aria-label="加载中" />;
  }

  const profileItems = profiles.data.map(profile => ({ value: profile.slug, label: profile.name }));

  return (
    <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name !== undefined || undefined}>
          <FieldLabel htmlFor="client-name">客户端名称</FieldLabel>
          <Input
            id="client-name"
            aria-invalid={form.formState.errors.name !== undefined}
            placeholder="例如：Codex · 工作站"
            maxLength={100}
            {...form.register("name")}
          />
          <FieldDescription>每个 Harness 实例应使用独立客户端，便于撤销和归因。</FieldDescription>
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Controller
          control={form.control}
          name="profileSlug"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="client-profile">Harness Profile</FieldLabel>
              <Select
                items={profileItems}
                value={field.value}
                onValueChange={(value) => {
                  if (value !== null)
                    field.onChange(value);
                }}
              >
                <SelectTrigger id="client-profile" className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                  <SelectValue placeholder="选择 Harness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {profiles.data.map(profile => (
                      <SelectItem key={profile.id} value={profile.slug}>{profile.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        {selectedProfile !== undefined && (
          <Field>
            <FieldLabel>入口协议</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {selectedProfile.allowedProtocols.map(protocol => (
                <Badge key={protocol} variant="outline">{clientProtocolLabel(protocol)}</Badge>
              ))}
            </div>
            <FieldDescription>由 Harness Profile 决定；Gateway 不进行跨协议转换。</FieldDescription>
          </Field>
        )}
      </FieldGroup>
      {mutation.isError && <FieldError>{describeApiError(mutation.error, "无法创建客户端")}</FieldError>}
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || profiles.data.length === 0}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-label="创建中" />}
          创建客户端
        </Button>
      </div>
    </form>
  );
}
