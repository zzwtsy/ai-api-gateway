import type { CompatibilityProbeFlow } from "../compatibility/use-compatibility-probe-flow";
import type { ConnectionDetailTab } from "../connection-detail-tabs";
import type { CredentialActions } from "../credentials/use-credential-actions";
import type { ConnectionModelBindingsState } from "../types";
import type { components } from "@/api/schema";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CompatibilityPanel } from "../compatibility/compatibility-panel";
import { isConnectionDetailTab } from "../connection-detail-tabs";
import { CredentialProbeResult } from "../credentials/credential-action-panels";
import { CredentialDirectory } from "../credentials/credential-directory";
import { EndpointDirectory } from "../endpoints/endpoint-directory";
import { ConnectionModelDirectory } from "./connection-model-directory";
import { ConnectionOverview } from "./connection-overview";

type Connection = components["schemas"]["Connection"];
type ModelBinding = components["schemas"]["ProviderModelBinding"];

export function ConnectionDetailTabs({
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
