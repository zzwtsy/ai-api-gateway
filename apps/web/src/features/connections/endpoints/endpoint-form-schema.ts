import { z } from "zod";

const endpointSchema = z.object({
  name: z.string().trim().min(1, "请输入 Endpoint 名称").max(100, "Endpoint 名称不能超过 100 个字符"),
  protocol: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  baseUrl: z.string().url("请输入合法的 URL"),
  requestPath: z.string().startsWith("/", "请求路径必须以 / 开头"),
  authScheme: z.enum(["bearer", "x-api-key"]),
  supportsStreaming: z.boolean(),
  credentialIds: z.array(z.string()).min(1, "至少绑定一个可用 Credential"),
});

export const addEndpointsFormSchema = z.object({
  endpoints: z.array(endpointSchema).min(1, "至少添加一个 Endpoint"),
});

export type AddEndpointsFormValue = z.infer<typeof addEndpointsFormSchema>;
