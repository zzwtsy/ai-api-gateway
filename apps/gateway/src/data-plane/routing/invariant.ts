import type { RoutingDecision, RoutingResolutionInput } from "./contracts.js";

/**
 * Assert the relationships a routing implementation must preserve across the
 * Data Plane boundary. A malformed compiled snapshot fails before any upstream
 * request is sent or Request/Attempt state is published.
 */
export function assertRoutingDecisionInvariant(
  input: RoutingResolutionInput,
  decision: RoutingDecision,
): void {
  assertNonEmpty("ruleId", decision.ruleId);
  assertNonEmpty("requestedModel", decision.requestedModel);
  assertNonEmpty("connectionId", decision.target.connectionId);
  assertNonEmpty("credentialId", decision.target.credentialId);
  assertNonEmpty("upstreamModel", decision.target.upstreamModel);

  if (decision.requestedModel !== input.requestedModel) {
    throw new RoutingInvariantError("routing decision changed requestedModel ownership");
  }
  if (decision.target.protocol !== input.protocol) {
    throw new RoutingInvariantError(
      `cross-protocol routing is forbidden: ${input.protocol} -> ${decision.target.protocol}`,
    );
  }
  if (!Number.isSafeInteger(decision.snapshotVersion) || decision.snapshotVersion < 1) {
    throw new RoutingInvariantError("snapshotVersion must be a positive safe integer");
  }
  if (!decision.target.path.startsWith("/") || decision.target.path.startsWith("//")) {
    throw new RoutingInvariantError("upstream path must be an origin-relative absolute path");
  }

  let origin: URL;
  try {
    origin = new URL(decision.target.origin);
  } catch {
    throw new RoutingInvariantError("upstream origin must be a valid absolute URL");
  }
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== decision.target.origin) {
    throw new RoutingInvariantError("upstream origin must contain only an http(s) origin");
  }
}

export class RoutingInvariantError extends Error {
  public override readonly name = "RoutingInvariantError";
}

function assertNonEmpty(field: string, value: string): void {
  if (value.trim() === "") throw new RoutingInvariantError(`${field} must not be empty`);
}
