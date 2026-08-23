import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "登录失败");
      return;
    }
    await navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-7 pt-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">控制面登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            生产环境使用 Better Auth 会话；开发环境可使用受限的控制面令牌。
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>管理员账号</CardTitle>
          <CardDescription>首次部署后运行 `pnpm db:bootstrap` 创建账号。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
            <FieldGroup>
              <Field data-invalid={error !== null || undefined}>
                <FieldLabel htmlFor="login-email">邮箱</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={error !== null}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </Field>
              <Field data-invalid={error !== null || undefined}>
                <FieldLabel htmlFor="login-password">密码</FieldLabel>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={error !== null}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <FieldError>{error}</FieldError>
            <Button type="submit" disabled={pending || password.length === 0}>
              {pending && <Spinner data-icon="inline-start" aria-label="加载中" />}
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
