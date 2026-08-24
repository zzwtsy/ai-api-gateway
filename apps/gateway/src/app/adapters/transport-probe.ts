import type {
  CredentialProbeClassification,
  EndpointRecord,
} from "../../control-plane/features/connections/contracts.js";

export function resolveProbeTarget(endpoint: EndpointRecord): { origin: string; path: string } {
  const url = new URL(endpoint.baseUrl);
  const prefix = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return { origin: url.origin, path: `${prefix}${endpoint.requestPath}` };
}

export function classifyProbeStatus(statusCode: number): CredentialProbeClassification {
  if (statusCode >= 200 && statusCode < 300)
    return "healthy";
  if (statusCode === 401 || statusCode === 403)
    return "auth_failed";
  if (statusCode === 429)
    return "rate_limited";
  if (statusCode >= 500)
    return "unavailable";
  return "upstream_rejected";
}
