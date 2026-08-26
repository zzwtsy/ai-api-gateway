import type { useConnections } from "../shared/hooks";

import { useEffect, useRef } from "react";

type ConnectionDeletionFocus
  = | { readonly kind: "add" }
    | { readonly kind: "connection"; readonly connectionId: string };
type ConnectionIdChange = (
  connectionId: string | undefined,
  options?: { readonly replace?: boolean },
) => void;

export function useConnectionDeletionLifecycle({
  connectionId,
  connections,
  onConnectionIdChange,
  selectedConnectionId,
}: {
  readonly connectionId: string | undefined;
  readonly connections: ReturnType<typeof useConnections>["data"];
  readonly onConnectionIdChange: ConnectionIdChange;
  readonly selectedConnectionId: string | undefined;
}) {
  const addConnectionTriggerRef = useRef<HTMLButtonElement>(null);
  const directoryButtonRef = useRef(new Map<string, HTMLButtonElement>());
  const deletionFocusRef = useRef<ConnectionDeletionFocus | null>(null);
  const pendingDeletedConnectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (connections === undefined)
      return;
    const pendingDeletedConnectionId = pendingDeletedConnectionIdRef.current;
    if (pendingDeletedConnectionId !== null && connections.some(connection => connection.id === pendingDeletedConnectionId))
      return;
    if (pendingDeletedConnectionId !== null)
      pendingDeletedConnectionIdRef.current = null;
    if (selectedConnectionId !== connectionId)
      onConnectionIdChange(selectedConnectionId, { replace: true });
  }, [connectionId, connections, onConnectionIdChange, selectedConnectionId]);

  useEffect(() => {
    const focusTarget = deletionFocusRef.current;
    if (focusTarget === null)
      return;
    const element = focusTarget.kind === "add"
      ? addConnectionTriggerRef.current
      : directoryButtonRef.current.get(focusTarget.connectionId) ?? null;
    if (element === null)
      return;
    deletionFocusRef.current = null;
    element.focus();
  }, [connections]);

  const registerDirectoryButton = (connectionId: string, element: HTMLButtonElement | null) => {
    if (element === null)
      directoryButtonRef.current.delete(connectionId);
    else
      directoryButtonRef.current.set(connectionId, element);
  };

  const getConnectionDeletionFocus = () => {
    const focusTarget = deletionFocusRef.current;
    if (focusTarget === null)
      return null;
    const element = focusTarget.kind === "add"
      ? addConnectionTriggerRef.current
      : directoryButtonRef.current.get(focusTarget.connectionId) ?? null;
    if (element !== null)
      deletionFocusRef.current = null;
    return element;
  };

  const handleConnectionDeleted = (deletedConnectionId: string) => {
    const currentConnections = connections ?? [];
    const remainingConnections = currentConnections.filter(connection => connection.id !== deletedConnectionId);
    const deletedIndex = currentConnections.findIndex(connection => connection.id === deletedConnectionId);
    const nextConnection = remainingConnections[deletedIndex < 0
      ? 0
      : Math.min(deletedIndex, remainingConnections.length - 1)];
    pendingDeletedConnectionIdRef.current = deletedConnectionId;
    deletionFocusRef.current = nextConnection === undefined
      ? { kind: "add" }
      : { kind: "connection", connectionId: nextConnection.id };
    onConnectionIdChange(nextConnection?.id, { replace: true });
  };

  return {
    addConnectionTriggerRef,
    getConnectionDeletionFocus,
    handleConnectionDeleted,
    registerDirectoryButton,
  };
}
