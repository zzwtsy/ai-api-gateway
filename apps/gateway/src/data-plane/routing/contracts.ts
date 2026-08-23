import type { ProtocolId } from "../../core/requests/contracts.js";

export interface RouteTarget {
  readonly connectionId: string;
  readonly credentialId: string;
  readonly protocol: ProtocolId;
  readonly origin: string;
  readonly path: string;
  readonly upstreamModel: string;
}

export interface RoutingDecision {
  readonly snapshotVersion: number;
  readonly ruleId: string;
  readonly requestedModel: string;
  readonly target: RouteTarget;
}

export interface RoutingResolutionInput {
  readonly protocol: ProtocolId;
  readonly requestedModel: string;
}

export interface RoutingSnapshotStore {
  resolve(input: RoutingResolutionInput): RoutingDecision | null;
}
