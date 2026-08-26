import { z } from "zod";

const protocolSchema = z.enum(["openai-chat", "openai-responses", "anthropic-messages"]);

const accountSchema = z.object({
  ref: z.string().trim().min(1),
  name: z.string().trim().min(1, "请输入账号名称"),
  billingMode: z.enum(["metered", "subscription", "free", "custom", "unknown"]),
  credentials: z.array(z.object({
    ref: z.string().trim().min(1),
    name: z.string().trim().min(1, "请输入凭据名称"),
    secret: z.string().min(1, "请输入 API Key"),
  })).min(1, "至少添加一个访问 Key"),
});

const endpointSchema = z.object({
  ref: z.string().trim().min(1),
  name: z.string().trim().min(1, "请输入 Endpoint 名称"),
  protocol: protocolSchema,
  baseUrl: z.string().url("请输入合法的 URL"),
  requestPath: z.string().startsWith("/", "请求路径必须以 / 开头"),
  authScheme: z.enum(["bearer", "x-api-key"]),
  supportsStreaming: z.boolean(),
  credentialRefs: z.array(z.string().trim().min(1)).min(1, "请至少绑定一个访问 Key"),
});

export const connectionFormSchema = z.object({
  name: z.string().trim().min(1, "请输入连接名称"),
  providerSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "请输入小写短横线标识"),
  endpoints: z.array(endpointSchema).min(1, "至少添加一个 Endpoint"),
  accounts: z.array(accountSchema).min(1, "至少添加一个账号"),
}).superRefine((value, context) => {
  const boundCredentialRefs = new Set(value.endpoints.flatMap(endpoint => endpoint.credentialRefs));
  value.accounts.forEach((account, accountIndex) => {
    account.credentials.forEach((credential, credentialIndex) => {
      if (boundCredentialRefs.has(credential.ref))
        return;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accounts", accountIndex, "credentials", credentialIndex, "ref"],
        message: "此 Key 尚未绑定 Endpoint，请在步骤 2 的绑定区域勾选。",
      });
    });
  });
});
