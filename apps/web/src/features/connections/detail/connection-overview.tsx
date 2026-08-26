import type { components } from "@/api/schema";

import { StatusBadge } from "@/components/product/status-badge";

type Connection = components["schemas"]["Connection"];

export function ConnectionOverview({ connection }: { readonly connection: Connection }) {
  const credentialCount = connection.accounts.reduce(
    (count, account) => count + account.credentials.length,
    0,
  );

  return (
    <section aria-labelledby="connection-overview-title" className="flex flex-col gap-5">
      <h3 id="connection-overview-title" className="sr-only">连接概览</h3>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ConnectionFact label="配置状态">
          <StatusBadge tone={connection.status === "active" ? "success" : "neutral"}>
            {connection.status === "active" ? "启用" : "停用"}
          </StatusBadge>
        </ConnectionFact>
        <ConnectionFact label="Endpoint">{connection.endpoints.length}</ConnectionFact>
        <ConnectionFact label="账号">{connection.accounts.length}</ConnectionFact>
        <ConnectionFact label="Credential">{credentialCount}</ConnectionFact>
      </dl>
    </section>
  );
}

function ConnectionFact({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium tabular-nums">{children}</dd>
    </div>
  );
}
