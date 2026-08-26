import type { EndpointOption } from "./models-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import * as SelectUI from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import { describeApiError } from "@/lib/api-runtime/client";
import { useCreateModelBinding, useDiscoverUpstreamModels } from "./hooks";

const FormSchema = z.object({
  endpointId: z.string().min(1, "请选择 Endpoint"),
  upstreamModelId: z.string().trim().min(1, "请输入上游模型 ID"),
  name: z.string().trim().min(1, "请输入显示名称"),
});

type FormValue = z.infer<typeof FormSchema>;

export function CreateModelBindingForm({
  endpoints,
  onCancel,
  onCreated,
}: {
  readonly endpoints: readonly EndpointOption[];
  readonly onCancel: () => void;
  readonly onCreated: () => void;
}) {
  const mutation = useCreateModelBinding();
  const endpointItems = endpoints.map(endpoint => ({ value: endpoint.id, label: endpoint.label }));
  const form = useForm<FormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: { endpointId: "", upstreamModelId: "", name: "" },
  });
  const selectedEndpoint = endpoints.find(endpoint => endpoint.id === form.watch("endpointId"));
  const upstreamModelId = form.watch("upstreamModelId");

  const submit = form.handleSubmit(async (value) => {
    await mutation.create(value);
    form.reset();
    onCreated();
  });

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => void submit(event)}>
      <div className="min-h-0 overflow-y-auto px-6 pb-6">
        <FieldSet>
          <FieldLegend>绑定目标与模型标识</FieldLegend>
          <FieldGroup>
            <Controller
              control={form.control}
              name="endpointId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="model-endpoint">目标 Endpoint</FieldLabel>
                  <SelectUI.Select
                    items={endpointItems}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value !== null)
                        field.onChange(value);
                    }}
                  >
                    <SelectUI.SelectTrigger id="model-endpoint" className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                      <SelectUI.SelectValue placeholder="选择接收该模型的 Endpoint" />
                    </SelectUI.SelectTrigger>
                    <SelectUI.SelectContent>
                      <SelectUI.SelectGroup>
                        {endpoints.map(endpoint => (
                          <SelectUI.SelectItem key={endpoint.id} value={endpoint.id}>{endpoint.label}</SelectUI.SelectItem>
                        ))}
                      </SelectUI.SelectGroup>
                    </SelectUI.SelectContent>
                  </SelectUI.Select>
                  <FieldDescription>绑定只对这个 Endpoint 生效，不跨协议或 Provider 复用。</FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {selectedEndpoint !== undefined && (
              <UpstreamModelDiscoveryField
                key={selectedEndpoint.id}
                endpoint={selectedEndpoint}
                upstreamModelId={upstreamModelId}
                onSelectModel={(value) => {
                  const currentName = form.getValues("name");
                  const currentModelId = form.getValues("upstreamModelId");
                  form.setValue("upstreamModelId", value, { shouldValidate: true });
                  if (currentName.trim() === "" || currentName === currentModelId)
                    form.setValue("name", value, { shouldValidate: true });
                }}
              />
            )}

            <FieldGroup className="sm:grid sm:grid-cols-2">
              <Field data-invalid={form.formState.errors.upstreamModelId !== undefined || undefined}>
                <FieldLabel htmlFor="upstream-model-id">上游模型 ID</FieldLabel>
                <Input
                  id="upstream-model-id"
                  aria-invalid={form.formState.errors.upstreamModelId !== undefined}
                  placeholder="例如：deepseek-chat"
                  {...form.register("upstreamModelId")}
                />
                <FieldDescription>Provider 接口实际接收的模型标识。</FieldDescription>
                <FieldError errors={[form.formState.errors.upstreamModelId]} />
              </Field>
              <Field data-invalid={form.formState.errors.name !== undefined || undefined}>
                <FieldLabel htmlFor="model-name">显示名称</FieldLabel>
                <Input
                  id="model-name"
                  aria-invalid={form.formState.errors.name !== undefined}
                  placeholder="例如：DeepSeek Chat"
                  {...form.register("name")}
                />
                <FieldDescription>仅用于控制面识别，不改写上游请求。</FieldDescription>
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
            </FieldGroup>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">创建后的状态</p>
              <p className="mt-1 text-sm text-muted-foreground">新绑定标记为“未验证”；能力与价格保持未知。</p>
            </div>
          </FieldGroup>
        </FieldSet>
        {mutation.isError && <FieldError className="mt-5">{describeApiError(mutation.error, "无法创建模型绑定")}</FieldError>}
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 px-6 py-4">
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={mutation.isPending || endpoints.length === 0}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-label="创建中" />}
          创建模型绑定
        </Button>
      </DialogFooter>
    </form>
  );
}

function UpstreamModelDiscoveryField({
  endpoint,
  onSelectModel,
  upstreamModelId,
}: {
  readonly endpoint: EndpointOption;
  readonly onSelectModel: (modelId: string) => void;
  readonly upstreamModelId: string;
}) {
  const discovery = useDiscoverUpstreamModels();
  const [credentialId, setCredentialId] = useState(endpoint.credentials[0]?.id ?? "");
  const [modelsPath, setModelsPath] = useState("/v1/models");
  const [discoveredModelIds, setDiscoveredModelIds] = useState<readonly string[]>([]);
  const credentialItems = endpoint.credentials.map(credential => ({
    value: credential.id,
    label: credential.label,
  }));
  const modelItems = discoveredModelIds.map(id => ({ value: id, label: id }));

  const discover = async () => {
    if (credentialId === "")
      return;
    const result = await discovery.discover(endpoint.id, { credentialId, modelsPath });
    setDiscoveredModelIds(result.models.map(model => model.id));
  };

  return (
    <Field>
      <FieldLabel>上游模型发现（可选）</FieldLabel>
      <FieldDescription>使用当前 Endpoint 的 Credential 读取模型目录；失败时仍可手工输入。</FieldDescription>
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
        {credentialItems.length === 0
          ? <FieldDescription>当前 Endpoint 没有可用 Credential，可继续手工输入模型 ID。</FieldDescription>
          : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="model-discovery-credential">Credential</FieldLabel>
                    <SelectUI.Select items={credentialItems} value={credentialId} onValueChange={value => value !== null && setCredentialId(value)}>
                      <SelectUI.SelectTrigger id="model-discovery-credential" className="w-full"><SelectUI.SelectValue /></SelectUI.SelectTrigger>
                      <SelectUI.SelectContent>
                        <SelectUI.SelectGroup>
                          {credentialItems.map(item => <SelectUI.SelectItem key={item.value} value={item.value}>{item.label}</SelectUI.SelectItem>)}
                        </SelectUI.SelectGroup>
                      </SelectUI.SelectContent>
                    </SelectUI.Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="model-discovery-path">模型目录路径</FieldLabel>
                    <Input id="model-discovery-path" value={modelsPath} onChange={event => setModelsPath(event.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldDescription>仅解析 OpenAI-compatible `data[].id`。</FieldDescription>
                  <Button type="button" variant="outline" disabled={discovery.isPending || credentialId === "" || !/^\/(?!\/)/u.test(modelsPath)} onClick={() => void discover()}>
                    {discovery.isPending && <Spinner data-icon="inline-start" aria-label="获取中" />}
                    获取上游模型
                  </Button>
                </div>
                {discovery.isError && (
                  <FieldError>{describeApiError(discovery.error, "无法获取上游模型，可继续手工输入。")}</FieldError>
                )}
                {!discovery.isError && discovery.data !== undefined && discoveredModelIds.length === 0 && (
                  <FieldDescription>上游目录没有返回模型，可继续手工输入。</FieldDescription>
                )}
                {discoveredModelIds.length > 0 && (
                  <Field>
                    <FieldLabel htmlFor="discovered-model">选择上游模型</FieldLabel>
                    <SelectUI.Select
                      items={modelItems}
                      value={discoveredModelIds.includes(upstreamModelId) ? upstreamModelId : ""}
                      onValueChange={value => value !== null && onSelectModel(value)}
                    >
                      <SelectUI.SelectTrigger id="discovered-model" className="w-full"><SelectUI.SelectValue placeholder="选择模型以自动填充" /></SelectUI.SelectTrigger>
                      <SelectUI.SelectContent>
                        <SelectUI.SelectGroup>
                          {modelItems.map(item => <SelectUI.SelectItem key={item.value} value={item.value}>{item.label}</SelectUI.SelectItem>)}
                        </SelectUI.SelectGroup>
                      </SelectUI.SelectContent>
                    </SelectUI.Select>
                  </Field>
                )}
              </>
            )}
      </div>
    </Field>
  );
}
