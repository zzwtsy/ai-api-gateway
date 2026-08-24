import type { ConnectionDetailTab } from "./connection-detail-tabs";
import type { components } from "@/api/schema";

import { useState } from "react";

import {
  useConnectionCompatibility,
  useStartCompatibilityProbe,
} from "./hooks";

type Connection = components["schemas"]["Connection"];

export function useCompatibilityProbeFlow(
  connection: Connection,
  onTabChange: (tab: ConnectionDetailTab) => void,
) {
  const query = useConnectionCompatibility(connection.id);
  const mutation = useStartCompatibilityProbe(connection.id);
  const [open, setOpen] = useState(false);
  const [endpointId, setEndpointId] = useState(() => findInitialEndpointId(connection));
  const [credentialId, setCredentialId] = useState(() => {
    const initialEndpointId = findInitialEndpointId(connection);
    return findAvailableCredentialId(connection, initialEndpointId);
  });
  const [model, setModel] = useState("");
  const [focusedRunId, setFocusedRunId] = useState<string | null>(null);
  const acceptedRun = mutation.data?.data;
  const activeRun = query.data?.runs.find(run => run.status === "queued" || run.status === "running");
  const focusedRun = focusedRunId === null
    ? null
    : query.data?.runs.find(run => run.id === focusedRunId)
      ?? (acceptedRun?.id === focusedRunId ? acceptedRun : null);

  const start = async () => {
    try {
      const run = await mutation.start(endpointId, {
        credentialId,
        model: model.trim(),
      });
      setFocusedRunId(run.id);
      onTabChange("compatibility");
    } catch {

    }
  };

  const openProbe = () => {
    setFocusedRunId(activeRun?.id ?? null);
    setOpen(true);
  };

  const changeEndpoint = (nextEndpointId: string) => {
    setEndpointId(nextEndpointId);
    setCredentialId(findAvailableCredentialId(connection, nextEndpointId));
    mutation.reset();
  };

  const reset = () => {
    setFocusedRunId(null);
    mutation.reset();
  };

  return {
    openProbe,
    query,
    sheet: {
      error: mutation.isError ? mutation.error : null,
      model,
      onCredentialChange: setCredentialId,
      onEndpointChange: changeEndpoint,
      onModelChange: setModel,
      onOpenChange: setOpen,
      onReset: reset,
      onSubmit: () => void start(),
      open,
      pending: mutation.isPending,
      run: focusedRun,
      selectedCredentialId: credentialId,
      selectedEndpointId: endpointId,
    },
  };
}

export type CompatibilityProbeFlow = ReturnType<typeof useCompatibilityProbeFlow>;

function findInitialEndpointId(connection: Connection): string {
  return connection.endpoints.find(endpoint => endpoint.status === "active")?.id ?? "";
}

function findAvailableCredentialId(connection: Connection, endpointId: string): string {
  return connection.accounts
    .flatMap(account => account.credentials)
    .find(credential => credential.status !== "disabled" && credential.endpointIds.includes(endpointId))
    ?.id ?? "";
}
