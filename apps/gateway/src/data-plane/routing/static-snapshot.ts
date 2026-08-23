import type { RouteTarget, RoutingDecision, RoutingResolutionInput, RoutingSnapshotStore } from "./contracts.js";

export interface StaticRoutingSnapshotOptions {
  readonly version: number;
  readonly target: Omit<RouteTarget, "upstreamModel">;
}

export class StaticRoutingSnapshotStore implements RoutingSnapshotStore {
  public constructor(private readonly options: StaticRoutingSnapshotOptions) {}

  public resolve(input: RoutingResolutionInput): RoutingDecision | null {
    if (input.protocol !== this.options.target.protocol) {
      return null;
    }
    return {
      snapshotVersion: this.options.version,
      ruleId: "bootstrap-default-route",
      requestedModel: input.requestedModel,
      target: {
        ...this.options.target,
        upstreamModel: input.requestedModel,
      },
    };
  }
}
