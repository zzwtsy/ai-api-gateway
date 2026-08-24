import type { CreateGatewayClientInput } from "./hooks";
import type { components } from "@/api/schema";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { DataErrorState } from "@/components/product/data-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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

export function CreateClientForm({ onCancel, onCreated }: {
  readonly onCancel: () => void;
  readonly onCreated: (result: CreatedClient) => void;
}) {
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 overflow-y-auto px-6 pb-6">
          <DataErrorState
            title="无法加载 Harness Profile"
            description={describeApiError(profiles.error, "客户端创建所需的 Profile 暂时不可用。")}
            onRetry={profiles.refetch}
          />
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        </DialogFooter>
      </div>
    );
  }

  if (profiles.isPending || profiles.data === undefined) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-40 flex-1 items-center justify-center px-6 pb-6">
          <Spinner aria-label="正在加载 Harness Profile" />
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        </DialogFooter>
      </div>
    );
  }

  const profileItems = profiles.data.map(profile => ({ value: profile.slug, label: profile.name }));

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => void submit(event)}>
      <div className="min-h-0 overflow-y-auto px-6 pb-6">
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
            <FieldDescription>每个 Harness 实例使用独立客户端，便于单独撤销和归因。</FieldDescription>
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
                <FieldDescription>Profile 决定允许的入口协议，创建后无需重复配置。</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {selectedProfile !== undefined && (
            <div className="rounded-lg border bg-muted/30 p-4" aria-live="polite">
              <p className="text-sm font-medium">{selectedProfile.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">允许的入口协议</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedProfile.allowedProtocols.map(protocol => (
                  <Badge key={protocol} variant="outline">{clientProtocolLabel(protocol)}</Badge>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Gateway 保持入口协议，不进行跨协议转换。</p>
            </div>
          )}
        </FieldGroup>
        {mutation.isError && <FieldError className="mt-5">{describeApiError(mutation.error, "无法创建客户端")}</FieldError>}
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={mutation.isPending || profiles.data.length === 0}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-label="创建中" />}
          创建客户端
        </Button>
      </DialogFooter>
    </form>
  );
}
