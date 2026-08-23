import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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

import { useCreateConnection } from "./hooks";

const FormSchema = z.object({
  name: z.string().trim().min(1, "请输入连接名称"),
  provider: z.string().trim().min(1, "请输入 Provider 标识"),
  protocol: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  baseUrl: z.string().url("请输入合法的 URL"),
});

type FormValue = z.infer<typeof FormSchema>;

const protocolItems = [
  { value: "openai-chat", label: "OpenAI Chat Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
] as const;

export function CreateConnectionForm({ onCreated }: { readonly onCreated: () => void }) {
  const mutation = useCreateConnection();
  const form = useForm<FormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "本地模拟上游",
      provider: "openai-compatible",
      protocol: "openai-chat",
      baseUrl: "http://127.0.0.1:4010",
    },
  });

  const submit = form.handleSubmit(async (value) => {
    await mutation.create({ ...value, enabled: true });
    form.reset();
    onCreated();
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name !== undefined || undefined}>
          <FieldLabel htmlFor="connection-name">名称</FieldLabel>
          <Input
            id="connection-name"
            aria-invalid={form.formState.errors.name !== undefined}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field data-invalid={form.formState.errors.provider !== undefined || undefined}>
          <FieldLabel htmlFor="connection-provider">Provider 标识</FieldLabel>
          <Input
            id="connection-provider"
            aria-invalid={form.formState.errors.provider !== undefined}
            {...form.register("provider")}
          />
          <FieldError errors={[form.formState.errors.provider]} />
        </Field>
        <Controller
          control={form.control}
          name="protocol"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="connection-protocol">协议</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value !== null) field.onChange(value);
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
                    {protocolItems.map((item) => (
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
        <Field data-invalid={form.formState.errors.baseUrl !== undefined || undefined}>
          <FieldLabel htmlFor="connection-url">上游 Base URL</FieldLabel>
          <Input
            id="connection-url"
            aria-invalid={form.formState.errors.baseUrl !== undefined}
            {...form.register("baseUrl")}
          />
          <FieldError errors={[form.formState.errors.baseUrl]} />
        </Field>
      </FieldGroup>
      {mutation.error !== null && (
        <FieldError>{describeApiError(mutation.error, "无法创建连接")}</FieldError>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          保存连接
        </Button>
      </div>
    </form>
  );
}
