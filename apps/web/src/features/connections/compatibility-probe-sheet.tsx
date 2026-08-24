import type { components } from "@/api/schema";

import { CircleCheck, FlaskConical, TriangleAlert } from "lucide-react";

import { DataErrorState } from "@/components/product/data-error-state";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeApiError } from "@/lib/api-runtime/client";

type Connection = components["schemas"]["Connection"];
type ProbeRun = components["schemas"]["CompatibilityProbeRun"];

export function CompatibilityProbeSheet({
  connection,
  error,
  model,
  onEndpointChange,
  onCredentialChange,
  onModelChange,
  onOpenChange,
  onReset,
  onSubmit,
  open,
  pending,
  run,
  selectedCredentialId,
  selectedEndpointId,
}: {
  readonly connection: Connection;
  readonly error: unknown;
  readonly model: string;
  readonly onEndpointChange: (value: string) => void;
  readonly onCredentialChange: (value: string) => void;
  readonly onModelChange: (value: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onReset: () => void;
  readonly onSubmit: () => void;
  readonly open: boolean;
  readonly pending: boolean;
  readonly run: ProbeRun | null;
  readonly selectedCredentialId: string;
  readonly selectedEndpointId: string;
}) {
  const credentialOptions = connection.accounts.flatMap(account => account.credentials
    .filter(credential => credential.status !== "disabled" && credential.endpointIds.includes(selectedEndpointId))
    .map(credential => ({ credential, accountName: account.name })));
  const endpointOptions = connection.endpoints
    .filter(endpoint => endpoint.status === "active")
    .map(endpoint => ({ value: endpoint.id, label: endpoint.name }));
  const credentialItems = credentialOptions.map(({ credential, accountName }) => ({
    value: credential.id,
    label: `${accountName} · ${credential.name} · ${credential.maskedDisplay}`,
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>完整兼容性测试</DialogTitle>
          <DialogDescription>
            按 Endpoint、Harness 和模型保存实测事实；关闭此面板不会取消后台任务。
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          {run === null
            ? (
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                  }}
                >
                  <Alert>
                    <TriangleAlert />
                    <AlertTitle>会发送多次真实上游请求</AlertTitle>
                    <AlertDescription>
                      默认测试鉴权、基础请求、SSE、Usage、字段、工具、Reasoning、结构化输出、错误 Envelope 和 Harness 组合能力，可能产生 Provider 费用。
                    </AlertDescription>
                  </Alert>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="compatibility-endpoint">测试 Endpoint</FieldLabel>
                      <Select items={endpointOptions} value={selectedEndpointId} onValueChange={value => value !== null && onEndpointChange(value)}>
                        <SelectTrigger id="compatibility-endpoint" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {endpointOptions.map(endpoint => (
                              <SelectItem key={endpoint.value} value={endpoint.value}>{endpoint.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="compatibility-credential">Provider Credential</FieldLabel>
                      <Select items={credentialItems} value={selectedCredentialId} onValueChange={value => value !== null && onCredentialChange(value)}>
                        <SelectTrigger id="compatibility-credential" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {credentialOptions.map(({ credential, accountName }) => (
                              <SelectItem key={credential.id} value={credential.id}>
                                {accountName}
                                {" · "}
                                {credential.name}
                                {" · "}
                                {credential.maskedDisplay}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>完整 Secret 不会返回浏览器或写入测试结果。</FieldDescription>
                    </Field>
                    <Field data-invalid={error !== null || undefined}>
                      <FieldLabel htmlFor="compatibility-model">实测模型 ID</FieldLabel>
                      <Input
                        id="compatibility-model"
                        aria-invalid={error !== null}
                        value={model}
                        onChange={event => onModelChange(event.target.value)}
                        placeholder="输入该 Endpoint 接受的真实模型 ID"
                      />
                      <FieldDescription>事实按该模型保留；不同模型可能得到不同结论。</FieldDescription>
                      {error !== null && <FieldError>{describeApiError(error, "无法启动完整兼容性测试")}</FieldError>}
                    </Field>
                  </FieldGroup>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button
                      type="submit"
                      disabled={pending || selectedEndpointId.length === 0 || selectedCredentialId.length === 0 || model.trim().length === 0}
                    >
                      {pending && <Spinner data-icon="inline-start" aria-label="正在接受测试任务" />}
                      开始计费测试
                    </Button>
                  </div>
                </form>
              )
            : (
                <ProbeRunStatus run={run} onClose={() => onOpenChange(false)} onReset={onReset} />
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProbeRunStatus({ run, onClose, onReset }: {
  readonly run: ProbeRun;
  readonly onClose: () => void;
  readonly onReset: () => void;
}) {
  const active = run.status === "queued" || run.status === "running";
  if (run.status === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <DataErrorState title="完整兼容性测试未完成" description={run.errorMessage ?? "后台任务失败，请重试。"} onRetry={onReset} />
        <div className="flex justify-end"><Button type="button" variant="ghost" onClick={onClose}>关闭</Button></div>
      </div>
    );
  }
  if (run.status === "succeeded") {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <CircleCheck />
          <AlertTitle>兼容性测试已完成</AlertTitle>
          <AlertDescription>
            已完成
            {run.completedChecks}
            {" / "}
            {run.totalChecks}
            项检查。完整事实持续保存在连接的“兼容性”Tab。
          </AlertDescription>
        </Alert>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>关闭</Button>
          <Button type="button" variant="outline" onClick={onReset}>再次测试</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <Alert>
        <FlaskConical />
        <AlertTitle>{run.status === "queued" ? "测试等待执行" : "正在测试兼容性"}</AlertTitle>
        <AlertDescription>关闭弹窗后任务继续执行，可在兼容性 Tab 查看实时进度。</AlertDescription>
      </Alert>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span>{run.currentCheck === null ? "准备下一项" : probeCheckLabel(run.currentCheck)}</span>
          <span className="text-muted-foreground">
            {run.completedChecks}
            {" / "}
            {run.totalChecks}
          </span>
        </div>
        <progress
          aria-label="兼容性测试进度"
          className="h-2 w-full accent-primary"
          max={Math.max(run.totalChecks, 1)}
          value={run.completedChecks}
        />
        <p className="text-xs text-muted-foreground">
          模型：
          {run.model}
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={!active}>关闭并后台继续</Button>
      </div>
    </div>
  );
}

function probeCheckLabel(check: ProbeRun["currentCheck"]): string {
  if (check === null)
    return "准备下一项";
  return {
    basic: "鉴权与基础请求",
    stream: "SSE 流式响应",
    usage: "Usage",
    unknown_field: "关键字段兼容性",
    tools: "Tool Call",
    reasoning: "Reasoning",
    structured_output: "结构化输出",
    error_shape: "错误 Envelope",
    harness: "Harness 组合能力",
  }[check];
}
