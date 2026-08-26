import type { EndpointOption } from "@/features/models/models-types";

import { useConnections } from "@/features/connections/hooks";
import { ModelsPage } from "@/features/models/models-page";

export function ModelsRoutePage({ modelBindingId, onModelBindingIdChange }: {
  readonly modelBindingId: string | undefined;
  readonly onModelBindingIdChange: (modelBindingId: string | undefined, options?: { readonly replace?: boolean }) => void;
}) {
  const connections = useConnections();
  const endpoints: EndpointOption[] | undefined = connections.data?.flatMap(connection =>
    connection.endpoints.map(endpoint => ({
      id: endpoint.id,
      label: `${connection.name} / ${endpoint.name}`,
      protocol: endpoint.protocol,
      credentials: connection.accounts.flatMap(account => account.credentials
        .filter(credential => credential.status !== "disabled" && credential.endpointIds.includes(endpoint.id))
        .map(credential => ({
          id: credential.id,
          label: `${account.name} · ${credential.name} · ${credential.maskedDisplay}`,
        }))),
    })));

  return (
    <ModelsPage
      endpointError={connections.isError ? connections.error : null}
      endpoints={endpoints}
      endpointsLoading={connections.isPending}
      modelBindingId={modelBindingId}
      onModelBindingIdChange={onModelBindingIdChange}
      onRetryEndpoints={connections.refetch}
    />
  );
}
