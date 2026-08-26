import type { components } from "@/api/schema";

import { FlaskConical, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

type Credential = components["schemas"]["ProviderCredential"];
type ProbeResult = components["schemas"]["ProviderCredentialProbeResult"];

export function CredentialProbePanel({
  credential,
  endpointNames,
  error,
  model,
  onCancel,
  onEndpointChange,
  onModelChange,
  onSubmit,
  pending,
  selectedEndpointId,
}: {
  readonly credential: Credential;
  readonly endpointNames: ReadonlyMap<string, string>;
  readonly error: unknown;
  readonly model: string;
  readonly onCancel: () => void;
  readonly onEndpointChange: (value: string) => void;
  readonly onModelChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
  readonly selectedEndpointId: string;
}) {
  const endpointItems = credential.endpointIds.map(endpointId => ({
    value: endpointId,
    label: endpointNames.get(endpointId) ?? endpointId,
  }));
  return (
    <form
      className="flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Alert>
        <TriangleAlert />
        <AlertTitle>该测试可能产生 Provider 费用</AlertTitle>
        <AlertDescription>Gateway 会使用所选 Credential、Endpoint 和模型发送一次最小非流式请求。</AlertDescription>
      </Alert>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="probe-endpoint">测试 Endpoint</FieldLabel>
          <Select items={endpointItems} value={selectedEndpointId} onValueChange={value => value !== null && onEndpointChange(value)}>
            <SelectTrigger id="probe-endpoint" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {credential.endpointIds.map(endpointId => (
                  <SelectItem key={endpointId} value={endpointId}>{endpointNames.get(endpointId) ?? endpointId}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={error !== null || undefined}>
          <FieldLabel htmlFor="probe-model">请求模型</FieldLabel>
          <Input id="probe-model" aria-invalid={error !== null} value={model} onChange={event => onModelChange(event.target.value)} placeholder="输入该 Endpoint 接受的真实模型 ID" />
          {error !== null && <FieldError>{describeApiError(error, "无法执行 Credential 测试")}</FieldError>}
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={pending || selectedEndpointId.length === 0 || model.trim().length === 0}>
          {pending && <Spinner data-icon="inline-start" aria-label="测试中" />}
          发送计费测试请求
        </Button>
      </div>
    </form>
  );
}

export function CredentialProbeResult({ result }: { readonly result: ProbeResult }) {
  return (
    <Alert>
      <FlaskConical />
      <AlertTitle>{result.outcome === "succeeded" ? "最小连通性测试成功" : "最小连通性测试未通过"}</AlertTitle>
      <AlertDescription>
        分类：
        {probeClassificationLabel(result.classification)}
        ；HTTP 状态：
        {result.statusCode ?? "未收到响应"}
        ；模型：
        {result.model}
        。本次结果不代表流式输出、Usage 或字段兼容性。
      </AlertDescription>
    </Alert>
  );
}

export function CredentialRotatePanel({ error, onCancel, onSecretChange, onSubmit, pending, secret }: {
  readonly error: unknown;
  readonly onCancel: () => void;
  readonly onSecretChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
  readonly secret: string;
}) {
  return (
    <form
      className="rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FieldGroup>
        <Field data-invalid={error !== null || undefined}>
          <FieldLabel htmlFor="rotated-provider-secret">新的 Provider Secret</FieldLabel>
          <Input id="rotated-provider-secret" type="password" autoComplete="off" aria-invalid={error !== null} value={secret} onChange={event => onSecretChange(event.target.value)} />
          <FieldDescription>保存后旧 Secret 立即失效；完整值不会再次显示。</FieldDescription>
          {error !== null && <FieldError>{describeApiError(error, "无法轮换凭据")}</FieldError>}
        </Field>
      </FieldGroup>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={pending || secret.length === 0}>
          {pending && <Spinner data-icon="inline-start" aria-label="轮换中" />}
          保存新 Secret
        </Button>
      </div>
    </form>
  );
}

function probeClassificationLabel(classification: ProbeResult["classification"]): string {
  return { healthy: "鉴权与请求成功", auth_failed: "鉴权失败", rate_limited: "上游限流", upstream_rejected: "上游拒绝请求", unavailable: "上游不可用" }[classification];
}
