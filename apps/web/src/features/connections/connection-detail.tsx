import type { ConnectionDetailTab } from "./connection-detail-tabs";
import type { CompatibilityProbeFlow } from "./use-compatibility-probe-flow";
import type { CredentialActions } from "./use-credential-actions";
import type { components } from "@/api/schema";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CompatibilityPanel } from "./compatibility-panel";
import { CompatibilityProbeSheet } from "./compatibility-probe-sheet";
import { ConnectionDetailCredentialSheets } from "./connection-detail-credential-sheets";
import {
  ConnectionModelDirectory,
  ConnectionOverview,
  CredentialDirectory,
  EndpointDirectory,
} from "./connection-detail-directory";
import { isConnectionDetailTab } from "./connection-detail-tabs";
import { CredentialProbeResult } from "./credential-action-panels";
import { useCompatibilityProbeFlow } from "./use-compatibility-probe-flow";
import { useCredentialActions } from "./use-credential-actions";

type Connection = components["schemas"]["Connection"];
type ModelBinding = components["schemas"]["ProviderModelBinding"];

export interface ConnectionModelBindingsState {
  readonly data: readonly ModelBinding[] | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly onRetry: () => Promise<unknown>;
  readonly stale: boolean;
}

export function ConnectionDetail({
  connection,
  modelBindings,
  onTabChange,
  tab,
}: {
  readonly connection: Connection;
  readonly modelBindings: ConnectionModelBindingsState;
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
        <div>
          <CardTitle id="connection-detail-title">{connection.name}</CardTitle>
          <CardDescription>
            {connection.providerSlug}
            {" · "}
            {connection.endpoints.length}
            {" 个 Endpoint · "}
            {connection.accounts.length}
            {" 个账号"}
          </CardDescription>
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

function ConnectionDetailTabs({
  compatibilityFlow,
  connection,
  connectionModelBindings,
  credentialActions,
  modelBindings,
  onTabChange,
  tab,
}: {
  readonly compatibilityFlow: CompatibilityProbeFlow;
  readonly connection: Connection;
  readonly connectionModelBindings: readonly ModelBinding[] | undefined;
  readonly credentialActions: CredentialActions;
  readonly modelBindings: ConnectionModelBindingsState;
  readonly onTabChange: (tab: ConnectionDetailTab) => void;
  readonly tab: ConnectionDetailTab;
}) {
  const compatibility = compatibilityFlow.query;
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isConnectionDetailTab(value) && value !== tab)
          onTabChange(value);
      }}
    >
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" aria-label="连接详情视图">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="accounts">账号</TabsTrigger>
          <TabsTrigger value="models">模型</TabsTrigger>
          <TabsTrigger value="compatibility">兼容性</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview">
        <ConnectionOverview connection={connection} />
      </TabsContent>
      <TabsContent value="endpoints">
        <EndpointDirectory connection={connection} />
      </TabsContent>
      <TabsContent value="accounts">
        <div className="flex flex-col gap-4">
          {credentialActions.probeResult !== null && <CredentialProbeResult result={credentialActions.probeResult} />}
          <CredentialDirectory
            connection={connection}
            endpointNames={credentialActions.endpointNames}
            onDisable={credentialActions.onDisable}
            onProbe={credentialActions.onProbe}
            onRotate={credentialActions.onRotate}
          />
        </div>
      </TabsContent>
      <TabsContent value="models">
        <ConnectionModelDirectory
          bindings={connectionModelBindings}
          endpointNames={credentialActions.endpointNames}
          error={modelBindings.error}
          loading={modelBindings.loading}
          onRetry={modelBindings.onRetry}
          stale={modelBindings.stale}
        />
      </TabsContent>
      <TabsContent value="compatibility">
        <CompatibilityPanel
          connection={connection}
          data={compatibility.data}
          error={compatibility.isError ? compatibility.error : null}
          loading={compatibility.isPending}
          onOpenProbe={compatibilityFlow.openProbe}
          onRetry={compatibility.refetch}
          stale={compatibility.isRefetchError && compatibility.data !== undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
