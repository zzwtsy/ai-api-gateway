import type { ConnectionDetailTab } from "../connection-detail-tabs";
import type { ConnectionModelBindingsState } from "../types";
import type { components } from "@/api/schema";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CompatibilityProbeSheet } from "../compatibility/compatibility-probe-sheet";
import { useCompatibilityProbeFlow } from "../compatibility/use-compatibility-probe-flow";
import { ConnectionDetailCredentialSheets } from "../credentials/connection-detail-credential-sheets";
import { useCredentialActions } from "../credentials/use-credential-actions";
import { ConnectionDetailTabs } from "./connection-detail-tabs-content";
import { DeleteConnectionDialog } from "./delete-connection-dialog";

type Connection = components["schemas"]["Connection"];

export function ConnectionDetail({
  connection,
  getConnectionDeletionFocus,
  modelBindings,
  onConnectionDeleted,
  onTabChange,
  tab,
}: {
  readonly connection: Connection;
  readonly getConnectionDeletionFocus: () => HTMLElement | null;
  readonly modelBindings: ConnectionModelBindingsState;
  readonly onConnectionDeleted: (connectionId: string) => void;
  readonly onTabChange: (tab: ConnectionDetailTab) => void;
  readonly tab: ConnectionDetailTab;
}) {
  const endpointIds = new Set(connection.endpoints.map(endpoint => endpoint.id));
  const connectionModelBindings = modelBindings.data?.filter(binding => endpointIds.has(binding.endpointId));
  const credentialActions = useCredentialActions(connection);
  const compatibilityFlow = useCompatibilityProbeFlow(connection, onTabChange);

  return (
    <Card aria-labelledby="connection-detail-title">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle id="connection-detail-title" className="truncate">{connection.name}</CardTitle>
            <CardDescription>
              {connection.providerSlug}
              {" · "}
              {connection.endpoints.length}
              {" 个 Endpoint · "}
              {connection.accounts.length}
              {" 个账号"}
            </CardDescription>
          </div>
          <DeleteConnectionDialog
            connectionId={connection.id}
            connectionName={connection.name}
            finalFocus={getConnectionDeletionFocus}
            onDeleted={onConnectionDeleted}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ConnectionDetailTabs
          compatibilityFlow={compatibilityFlow}
          connection={connection}
          connectionModelBindings={connectionModelBindings}
          credentialActions={credentialActions}
          modelBindings={modelBindings}
          onTabChange={onTabChange}
          tab={tab}
        />
        <CompatibilityProbeSheet connection={connection} {...compatibilityFlow.sheet} />
        <ConnectionDetailCredentialSheets actions={credentialActions} />
      </CardContent>
    </Card>
  );
}
