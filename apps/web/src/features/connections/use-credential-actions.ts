import type { components } from "@/api/schema";

import { useState } from "react";

import {
  useDisableProviderCredential,
  useProbeProviderCredential,
  useRotateProviderCredential,
} from "./hooks";

type Connection = components["schemas"]["Connection"];
type Credential = components["schemas"]["ProviderCredential"];
type ProbeResult = components["schemas"]["ProviderCredentialProbeResult"];

export function useCredentialActions(connection: Connection) {
  const rotateMutation = useRotateProviderCredential();
  const disableMutation = useDisableProviderCredential();
  const probeMutation = useProbeProviderCredential();
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [confirmDisableId, setConfirmDisableId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [probeCredentialId, setProbeCredentialId] = useState<string | null>(null);
  const [probeEndpointId, setProbeEndpointId] = useState("");
  const [probeModel, setProbeModel] = useState("");
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const endpointNames = new Map(connection.endpoints.map(endpoint => [endpoint.id, endpoint.name]));
  const probeCredential = findCredential(connection, probeCredentialId);
  const disableCredentialTarget = findCredential(connection, confirmDisableId);

  const runProbe = async () => {
    if (probeCredentialId === null)
      return;
    try {
      const result = await probeMutation.probe(probeCredentialId, {
        endpointId: probeEndpointId,
        model: probeModel,
      });
      setProbeResult(result);
      setProbeCredentialId(null);
      setProbeEndpointId("");
      setProbeModel("");
    } catch {

    }
  };

  const rotateCredential = async () => {
    if (rotatingId === null)
      return;
    try {
      await rotateMutation.rotate(rotatingId, { secret });
      setSecret("");
      setRotatingId(null);
    } catch {

    }
  };

  const disableCredential = async () => {
    if (confirmDisableId === null)
      return;
    try {
      await disableMutation.disable(confirmDisableId);
      setConfirmDisableId(null);
    } catch {

    }
  };

  return {
    endpointNames,
    onDisable: (credentialId: string) => {
      setConfirmDisableId(credentialId);
      setRotatingId(null);
      setProbeCredentialId(null);
      setSecret("");
    },
    onProbe: (credential: Credential) => {
      setProbeCredentialId(credential.id);
      setProbeEndpointId(credential.endpointIds[0] ?? "");
      setProbeModel("");
      setProbeResult(null);
      setRotatingId(null);
      setConfirmDisableId(null);
    },
    onRotate: (credentialId: string) => {
      setRotatingId(credentialId);
      setConfirmDisableId(null);
      setProbeCredentialId(null);
      setSecret("");
    },
    probeResult,
    sheets: {
      disable: {
        credential: disableCredentialTarget,
        error: disableMutation.isError ? disableMutation.error : null,
        onCancel: () => setConfirmDisableId(null),
        onConfirm: () => void disableCredential(),
        open: confirmDisableId !== null,
        pending: disableMutation.isPending,
      },
      probe: {
        credential: probeCredential,
        endpointNames,
        error: probeMutation.isError ? probeMutation.error : null,
        model: probeModel,
        onCancel: () => setProbeCredentialId(null),
        onEndpointChange: setProbeEndpointId,
        onModelChange: setProbeModel,
        onSubmit: () => void runProbe(),
        pending: probeMutation.isPending,
        selectedEndpointId: probeEndpointId,
      },
      rotate: {
        error: rotateMutation.isError ? rotateMutation.error : null,
        onCancel: () => setRotatingId(null),
        onSecretChange: setSecret,
        onSubmit: () => void rotateCredential(),
        open: rotatingId !== null,
        pending: rotateMutation.isPending,
        secret,
      },
    },
  };
}

export type CredentialActions = ReturnType<typeof useCredentialActions>;

function findCredential(connection: Connection, credentialId: string | null): Credential | null {
  if (credentialId === null)
    return null;
  return connection.accounts
    .flatMap(account => account.credentials)
    .find(credential => credential.id === credentialId) ?? null;
}
